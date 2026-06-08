/**
 * player-avatar.js
 * Controlador del jugador local (#player):
 *  - Movimiento WASD relativo a la cámara (la dirección depende de hacia dónde mira).
 *  - Colisiones por raycast contra el escenario (scene.glb) y la academia,
 *    aceleradas con three-mesh-bvh si la librería está disponible.
 *  - Animaciones Idle / Walk / Run según el movimiento.
 *  - Cámara en 1ra / 3ra persona (Q). En 3ra persona la cámara orbita con
 *    look-controls (#cam-pivot) y el modelo gira para dar la espalda a la
 *    cámara mientras se mueve.
 *  - Emotes (B): selector de bailes con GangnamStyle, Moonwalk, SnakeDance, Thriller.
 */
AFRAME.registerComponent('player-avatar', {
  schema: {
    walkClip:  { type: 'string', default: 'Walk' },
    runClip:   { type: 'string', default: 'Run'  },
    idleClip:  { type: 'string', default: 'Idle' },
    walkSpeed: { type: 'number', default: 3.2 },   // m/s
    runSpeed:  { type: 'number', default: 6.5 },   // m/s
    radius:    { type: 'number', default: 0.4 },   // margen de colisión
  },

  init() {
    this.keysDown      = new Set();
    this.isMoving      = false;
    this.isRunning     = false;
    this.isThirdPerson = false;
    this.chatOpen      = false;
    this.isEmoting     = false;
    this.emoteOpen     = false;

    this._emotes = [
      { clip: 'GangnamStyle', label: 'Gangnam Style', icon: '🐎' },
      { clip: 'Moonwalk',     label: 'Moonwalk',      icon: '🌙' },
      { clip: 'SnakeDance',   label: 'Snake Dance',   icon: '🐍' },
      { clip: 'Thriller',     label: 'Thriller',      icon: '🧟' },
    ];

    this._buildEmoteUI();

    this.camPivot    = document.getElementById('cam-pivot');
    this.cameraEl    = document.getElementById('camera');
    this.playerModel = document.getElementById('player-model');

    // Objetos THREE reutilizables (evitar basura por frame)
    this._fwd    = new THREE.Vector3();
    this._origin = new THREE.Vector3();
    this._mdir   = new THREE.Vector3();
    this._ray    = new THREE.Raycaster();
    this._ray.firstHitOnly = true;            // optimización de three-mesh-bvh
    this.collisionRoots = [];

    this._setupBVH();
    this._collectColliders();

    // Muros de colisión (collision-wall): los ya presentes en el DOM y los
    // que se registren más tarde mediante el evento 'collision-wall-ready'.
    this._onWallReady = (e) => this.addCollisionRoot(e.detail && e.detail.object3D);
    window.addEventListener('collision-wall-ready', this._onWallReady);
    document.querySelectorAll('[collision-wall]').forEach((el) => {
      this.addCollisionRoot(el.object3D);
    });

    // Vectores reutilizables para la sincronización de bailes (tecla F).
    this._myPos   = new THREE.Vector3();
    this._peerPos = new THREE.Vector3();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    this._onChat    = this._onChat.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
    window.addEventListener('signisland-chat', this._onChat);
  },

  /* ─── Registro de colisionadores externos (muros, etc.) ──────────────── */
  addCollisionRoot(obj) {
    if (!obj) return;
    if (this.collisionRoots.indexOf(obj) === -1) {
      this.collisionRoots.push(obj);
    }
    if (window.MeshBVHLib) {
      obj.traverse((o) => {
        if (o.isMesh && o.geometry && o.geometry.attributes.position &&
            !o.geometry.boundsTree && o.geometry.computeBoundsTree) {
          try { o.geometry.computeBoundsTree(); } catch (_) {}
        }
      });
    }
  },

  removeCollisionRoot(obj) {
    const i = this.collisionRoots.indexOf(obj);
    if (i !== -1) this.collisionRoots.splice(i, 1);
  },

  /* ─── UI del selector de emotes ────────────────────────────────────────── */
  _buildEmoteUI() {
    const panel = document.createElement('div');
    panel.id = 'emote-picker';
    panel.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      display: none;
      gap: 12px;
      z-index: 300;
      pointer-events: auto;
    `;

    this._emotes.forEach((emote, i) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        background: rgba(0,0,0,0.72);
        backdrop-filter: blur(10px);
        border: 1.5px solid rgba(255,255,255,0.18);
        border-radius: 16px;
        color: #fff;
        padding: 14px 18px;
        cursor: pointer;
        font-family: "Segoe UI Emoji", sans-serif;
        font-size: 13px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
        min-width: 80px;
      `;

      const iconEl = document.createElement('span');
      iconEl.style.fontSize = '28px';
      iconEl.textContent = emote.icon;

      const keyEl = document.createElement('span');
      keyEl.style.cssText = 'font-size:10px; opacity:0.5; letter-spacing:1px;';
      keyEl.textContent = `[${i + 1}]`;

      const labelEl = document.createElement('span');
      labelEl.style.cssText = 'font-size:11px; opacity:0.85;';
      labelEl.textContent = emote.label;

      btn.append(iconEl, labelEl, keyEl);

      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(126,232,162,0.18)';
        btn.style.borderColor = 'rgba(126,232,162,0.6)';
        btn.style.transform = 'scale(1.06)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(0,0,0,0.72)';
        btn.style.borderColor = 'rgba(255,255,255,0.18)';
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('click', () => this._playEmote(emote.clip));

      panel.appendChild(btn);
    });

    // Hint de cierre
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255,255,255,0.4);
      font-size: 11px;
      white-space: nowrap;
      font-family: "Segoe UI", sans-serif;
      pointer-events: none;
    `;
    hint.textContent = 'B / Esc para cerrar · 1-4 para seleccionar';
    panel.appendChild(hint);

    document.body.appendChild(panel);
    this._emotePanel = panel;
  },

  /* ─── Aceleración de raycast (three-mesh-bvh, opcional) ───────────────── */
  _setupBVH() {
    const bvh = window.MeshBVHLib;
    if (bvh && !THREE.Mesh.prototype._bvhPatched) {
      try {
        THREE.BufferGeometry.prototype.computeBoundsTree = bvh.computeBoundsTree;
        THREE.BufferGeometry.prototype.disposeBoundsTree = bvh.disposeBoundsTree;
        THREE.Mesh.prototype.raycast = bvh.acceleratedRaycast;
        THREE.Mesh.prototype._bvhPatched = true;
      } catch (_) { /* sin aceleración: raycast normal */ }
    }
  },

  /* ─── Recolectar geometría con la que el jugador puede chocar ─────────── */
  _collectColliders() {
    ['world', 'academia-building'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const add = () => {
        if (this.collisionRoots.indexOf(el.object3D) === -1) {
          this.collisionRoots.push(el.object3D);
        }
        if (window.MeshBVHLib) {
          el.object3D.traverse((o) => {
            if (o.isMesh && o.geometry && o.geometry.attributes.position &&
                !o.geometry.boundsTree && o.geometry.computeBoundsTree) {
              try { o.geometry.computeBoundsTree(); } catch (_) {}
            }
          });
        }
      };

      // Modelos GLB: esperar a que carguen. Primitivas (academia): ya existen.
      el.addEventListener('model-loaded', add);
      if (el.getObject3D('mesh') || id === 'academia-building') add();
    });
  },

  /* ─── Emotes ────────────────────────────────────────────────────────── */
  _toggleEmotePicker() {
    this.emoteOpen = !this.emoteOpen;
    if (this._emotePanel) {
      this._emotePanel.style.display = this.emoteOpen ? 'flex' : 'none';
    }
    // Mientras el picker está abierto, bloquear el puntero libera el mouse
    if (this.emoteOpen) {
      document.exitPointerLock?.();
    } else if (!this.isEmoting) {
      document.querySelector('a-scene')?.canvas?.requestPointerLock?.();
    }
  },

  _playEmote(clip) {
    this.isEmoting = true;
    this.emoteOpen = false;
    if (this._emotePanel) this._emotePanel.style.display = 'none';

    if (this.playerModel) {
      // Forzar vista 3ra persona para ver el baile
      if (!this.isThirdPerson) this._togglePerspective();
      this.playerModel.setAttribute('animation-mixer',
        `clip: ${clip}; loop: repeat; crossFadeDuration: 0.4; timeScale: 1`);
    }

    const emote = this._emotes.find(e => e.clip === clip);
    window.dispatchEvent(new CustomEvent('game-message', {
      detail: { text: `${emote?.icon ?? '💃'} ${emote?.label ?? clip}`, type: 'info' }
    }));

    // Reclamar puntero
    document.querySelector('a-scene')?.canvas?.requestPointerLock?.();
  },

  _stopEmote() {
    if (!this.isEmoting) return;
    this.isEmoting = false;
    this._updateAnimation();
  },

  /* ─── Sincronizar baile con un jugador cercano (tecla F) ─────────────── */
  _syncNearbyDance() {
    if (this.chatOpen || this.emoteOpen) return;

    const RANGE = 8;                                  // metros
    const danceClips = this._emotes.map((e) => e.clip);
    this.el.object3D.getWorldPosition(this._myPos);

    let bestClip = null;
    let bestDist = RANGE;

    // Avatares remotos: todos los .avatar-anim excepto el modelo local.
    document.querySelectorAll('.avatar-anim').forEach((animEl) => {
      if (animEl === this.playerModel) return;
      const mix = animEl.getAttribute('animation-mixer');
      if (!mix || danceClips.indexOf(mix.clip) === -1) return;   // no está bailando

      animEl.object3D.getWorldPosition(this._peerPos);
      const dist = this._peerPos.distanceTo(this._myPos);
      if (dist < bestDist) {
        bestDist = dist;
        bestClip = mix.clip;
      }
    });

    if (bestClip) {
      // _playEmote actualiza el animation-mixer local, que NAF retransmite
      // al resto, de modo que todos terminan bailando lo mismo.
      this._playEmote(bestClip);
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: '🕺 ¡Te uniste al baile!', type: 'info' }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: '🔍 No hay nadie bailando cerca', type: 'info' }
      }));
    }
  },

  /* ─── Chat abierto: congelar el movimiento ───────────────────────────── */
  _onChat(e) {
    this.chatOpen = !!(e.detail && e.detail.open);
    if (this.chatOpen) {
      this.keysDown.clear();
      this._updateAnimation();
    }
  },

  _onKeyDown(e) {
    if (this.chatOpen) return;

    // F: unirse al baile de un jugador cercano que esté bailando.
    if (e.code === 'KeyF') {
      e.preventDefault();
      this._syncNearbyDance();
      return;
    }

    if (e.code === 'KeyB') {
      e.preventDefault();
      if (this.isEmoting) {
        this._stopEmote();
      } else {
        this._toggleEmotePicker();
      }
      return;
    }

    if (e.code === 'Escape' && (this.emoteOpen || this.isEmoting)) {
      e.preventDefault();
      if (this.emoteOpen) this._toggleEmotePicker();
      this._stopEmote();
      return;
    }

    // Teclas 1-4 para seleccionar emote directamente (picker abierto o no)
    const digitMap = { 'Digit1': 0, 'Digit2': 1, 'Digit3': 2, 'Digit4': 3 };
    if (e.code in digitMap && (this.emoteOpen || this.isEmoting)) {
      e.preventDefault();
      this._playEmote(this._emotes[digitMap[e.code]].clip);
      return;
    }

    this.keysDown.add(e.code);

    if (e.code === 'KeyQ') {
      e.preventDefault();
      this._togglePerspective();
      return;
    }

    // Cualquier movimiento cancela el emote
    if (this.isEmoting) this._stopEmote();

    this._updateAnimation();
  },

  _onKeyUp(e) {
    this.keysDown.delete(e.code);
    if (this.chatOpen) return;
    this._updateAnimation();
  },

  _updateAnimation() {
    const MOVE_KEYS = ['KeyW','KeyA','KeyS','KeyD',
                       'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
    const moving  = !this.chatOpen && MOVE_KEYS.some((k) => this.keysDown.has(k));
    const running = moving &&
      (this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight'));

    if (moving === this.isMoving && running === this.isRunning) return;
    this.isMoving  = moving;
    this.isRunning = running;

    const clip = !moving ? this.data.idleClip
               : running ? this.data.runClip
                         : this.data.walkClip;
    if (this.playerModel) {
      this.playerModel.setAttribute('animation-mixer',
        `clip: ${clip}; loop: repeat; crossFadeDuration: 0.3; timeScale: 1`);
    }
  },

  tick(time, dt) {
    if (this.chatOpen || !dt) return;
    if (this.emoteOpen) return;   // no mover mientras el picker está abierto
    const k = this.keysDown;

    let f = 0, s = 0;
    if (k.has('KeyW') || k.has('ArrowUp'))    f += 1;
    if (k.has('KeyS') || k.has('ArrowDown'))  f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (k.has('KeyA') || k.has('ArrowLeft'))  s -= 1;
    if (f === 0 && s === 0) return;

    // Dirección de la cámara: getWorldDirection devuelve el eje +Z (hacia
    // atrás de la cámara), así que el "adelante" es su opuesto.
    this.cameraEl.object3D.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    if (this._fwd.lengthSq() < 1e-6) return;
    this._fwd.normalize();
    const fX = -this._fwd.x, fZ = -this._fwd.z;   // adelante de la cámara
    const rX = -fZ,          rZ = fX;             // derecha de la cámara

    let dx = fX * f + rX * s;
    let dz = fZ * f + rZ * s;
    const len   = Math.hypot(dx, dz) || 1;
    const speed = (this.isRunning ? this.data.runSpeed : this.data.walkSpeed) * (dt / 1000);
    dx = (dx / len) * speed;
    dz = (dz / len) * speed;

    // Colisión por eje → permite deslizar a lo largo de las paredes.
    const p = this.el.getAttribute('position');
    if (this._blocked(p, dx, 0)) dx = 0;
    if (this._blocked(p, 0, dz)) dz = 0;
    if (dx !== 0 || dz !== 0) {
      this.el.setAttribute('position', { x: p.x + dx, y: p.y, z: p.z + dz });
    }

    // 3ra persona: el modelo da la espalda a la cámara mientras se mueve.
    if (this.isThirdPerson && this.playerModel) {
      const targetYaw = Math.atan2(fX, fZ);
      const obj = this.playerModel.object3D;
      obj.rotation.y = this._lerpAngle(obj.rotation.y, targetYaw, 0.18);
    }
  },

  _blocked(pos, dx, dz) {
    if (!this.collisionRoots.length) return false;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-6) return false;
    this._mdir.set(dx, 0, dz).normalize();
    const reach = dist + this.data.radius;
    // Dos alturas: obstáculos bajos y paredes altas.
    for (let i = 0; i < 2; i++) {
      this._origin.set(pos.x, pos.y + (i === 0 ? 0.4 : 1.3), pos.z);
      this._ray.set(this._origin, this._mdir);
      this._ray.far = reach;
      const hits = this._ray.intersectObjects(this.collisionRoots, true);
      if (hits.length && hits[0].distance <= reach) return true;
    }
    return false;
  },

  _lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  },

  _togglePerspective() {
    this.isThirdPerson = !this.isThirdPerson;
    if (this.isThirdPerson) {
      // Cámara desplazada arriba y atrás del pivote → orbita al avatar.
      this.cameraEl.setAttribute('position', '0 0.8 4');
      if (this.playerModel) this.playerModel.setAttribute('visible', 'true');
    } else {
      // Cámara en el pivote (altura de ojos) → 1ra persona.
      this.cameraEl.setAttribute('position', '0 0 0');
      if (this.playerModel) this.playerModel.setAttribute('visible', 'false');
    }

    window.dispatchEvent(new CustomEvent('game-message', {
      detail: {
        text: this.isThirdPerson ? '👁️ Vista en 3ra persona' : '👁️ Vista en 1ra persona',
        type: 'info'
      }
    }));
  },

  remove() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    window.removeEventListener('signisland-chat', this._onChat);
    window.removeEventListener('collision-wall-ready', this._onWallReady);
  },
});
