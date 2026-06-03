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

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    this._onChat    = this._onChat.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
    window.addEventListener('signisland-chat', this._onChat);
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
    this.keysDown.add(e.code);
    if (e.code === 'KeyQ') {
      e.preventDefault();
      this._togglePerspective();
      return;
    }
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
  },
});
