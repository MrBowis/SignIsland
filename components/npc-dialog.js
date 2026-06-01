/**
 * npc-dialog.js
 * Componente A-Frame para globos de diálogo con emojis.
 *
 * Uso en HTML:
 *   <a-entity npc-dialog="name: Vendedor; emojis: 🍎😊,💰👍; label: Frutero; color: #f39c12">
 *
 * Propiedades:
 *   - name    : identificador del NPC
 *   - emojis  : secuencias separadas por coma (cada item = un "mensaje")
 *   - label   : texto descriptivo que aparece sobre el globo
 *   - color   : color de acento del globo
 *   - range   : distancia de activación en metros (default 5)
 *   - speed   : ms entre cada mensaje de la secuencia (default 2500)
 */

AFRAME.registerComponent('npc-dialog', {
  schema: {
    name:   { type: 'string',  default: 'NPC'     },
    emojis: { type: 'string',  default: '👋😊'    },
    label:  { type: 'string',  default: 'Habitante' },
    color:  { type: 'color',   default: '#ffffff'  },
    range:  { type: 'number',  default: 5          },
    speed:  { type: 'number',  default: 2500        },
  },

  init() {
    this.isNearby    = false;
    this.msgIndex    = 0;
    this.intervalId  = null;
    this.bubble      = null;
    this.labelEl     = null;
    this.emojiEl     = null;
    this.playerEl    = document.querySelector('#player');

    // Parsear secuencias de emojis
    this.messages = this.data.emojis
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    this._buildBubble();
    this._hideBubble();

    // Listener para tecla E
    this._onKeyDown = this._onKeyDown.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
  },

  /**
   * Construye el globo de diálogo como entidades A-Frame hijas.
   */
  _buildBubble() {
    const el = this.el;

    // Contenedor del globo (sube 2.5 unidades sobre el NPC)
    const bubble = document.createElement('a-entity');
    bubble.setAttribute('position', '0 2.5 0');
    bubble.setAttribute('billboard', '');   // siempre mira al jugador
    el.appendChild(bubble);
    this.bubble = bubble;

    // Fondo del globo
    const bg = document.createElement('a-rounded');
    // a-rounded no siempre está; usamos a-plane con bordes suaves via material
    const bgPlane = document.createElement('a-plane');
    bgPlane.setAttribute('width', '1.4');
    bgPlane.setAttribute('height', '0.9');
    bgPlane.setAttribute('color', '#ffffffee');
    bgPlane.setAttribute('opacity', '0.92');
    bgPlane.setAttribute('side', 'double');
    bgPlane.setAttribute('shader', 'flat');
    bubble.appendChild(bgPlane);
    this.bgPlane = bgPlane;

    // Borde de color del NPC
    const border = document.createElement('a-plane');
    border.setAttribute('width', '1.45');
    border.setAttribute('height', '0.95');
    border.setAttribute('color', this.data.color);
    border.setAttribute('position', '0 0 -0.01');
    border.setAttribute('opacity', '0.9');
    border.setAttribute('side', 'double');
    border.setAttribute('shader', 'flat');
    bubble.appendChild(border);

    // Cola del globo (triángulo decorativo)
    const tail = document.createElement('a-triangle');
    tail.setAttribute('vertex-a', '0 0 0');
    tail.setAttribute('vertex-b', '-0.15 0 0');
    tail.setAttribute('vertex-c', '0 -0.25 0');
    tail.setAttribute('color', '#ffffff');
    tail.setAttribute('position', '0 -0.47 0');
    tail.setAttribute('shader', 'flat');
    bubble.appendChild(tail);

    // Texto de emojis (centrado)
    const emojiText = document.createElement('a-text');
    emojiText.setAttribute('align', 'center');
    emojiText.setAttribute('color', '#111');
    emojiText.setAttribute('width', '2');
    emojiText.setAttribute('position', '0 0.05 0.02');
    emojiText.setAttribute('wrap-count', '10');
    emojiText.setAttribute('value', this.messages[0] || '👋');
    bubble.appendChild(emojiText);
    this.emojiEl = emojiText;

    // Etiqueta (nombre del NPC) — más pequeña, arriba del globo
    const labelText = document.createElement('a-text');
    labelText.setAttribute('align', 'center');
    labelText.setAttribute('color', this.data.color);
    labelText.setAttribute('width', '2.5');
    labelText.setAttribute('position', '0 0.65 0.02');
    labelText.setAttribute('value', this.data.label);
    labelText.setAttribute('wrap-count', '20');
    bubble.appendChild(labelText);
    this.labelEl = labelText;

    // Indicador "presiona E" — aparece solo cuando está cerca
    const hint = document.createElement('a-text');
    hint.setAttribute('align', 'center');
    hint.setAttribute('color', '#888');
    hint.setAttribute('width', '1.8');
    hint.setAttribute('position', '0 -0.6 0.02');
    hint.setAttribute('value', '[ E ] hablar');
    hint.setAttribute('wrap-count', '15');
    bubble.appendChild(hint);
    this.hintEl = hint;

    // Billboard manual: el globo rota para mirar al jugador cada frame
    this._lookAtCamera = this._lookAtCamera.bind(this);
  },

  /**
   * Esconde el globo.
   */
  _hideBubble() {
    if (this.bubble) this.bubble.setAttribute('visible', false);
  },

  /**
   * Muestra el globo y arranca la secuencia de mensajes.
   */
  _showBubble() {
    if (this.bubble) this.bubble.setAttribute('visible', true);
    this._startSequence();
  },

  /**
   * Cicla los mensajes del NPC.
   */
  _startSequence() {
    if (this.intervalId) return; // ya corriendo
    this.intervalId = setInterval(() => {
      this.msgIndex = (this.msgIndex + 1) % this.messages.length;
      const msg = this.messages[this.msgIndex];
      if (this.emojiEl) this.emojiEl.setAttribute('value', msg);
      // Pequeña animación de escala al cambiar mensaje
      if (this.bubble) {
        this.bubble.setAttribute('animation__pop', {
          property: 'scale',
          from: '0.85 0.85 0.85',
          to:   '1 1 1',
          dur:  300,
          easing: 'easeOutBack',
        });
      }
    }, this.data.speed);
  },

  /**
   * Detiene la secuencia.
   */
  _stopSequence() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },

  /**
   * Rota el globo para mirar siempre a la cámara.
   */
  _lookAtCamera() {
    if (!this.bubble || !this.playerEl) return;
    const camera = document.querySelector('#camera');
    if (!camera) return;
    const cameraPos = new THREE.Vector3();
    camera.object3D.getWorldPosition(cameraPos);
    this.bubble.object3D.lookAt(cameraPos);
  },

  /**
   * Tecla E: avanza manualmente en la secuencia cuando está cerca.
   */
  _onKeyDown(e) {
    if (e.key !== 'e' && e.key !== 'E') return;
    if (!this.isNearby) return;
    this.msgIndex = (this.msgIndex + 1) % this.messages.length;
    if (this.emojiEl) {
      this.emojiEl.setAttribute('value', this.messages[this.msgIndex]);
    }
    if (this.bubble) {
      this.bubble.setAttribute('animation__pop', {
        property: 'scale',
        from: '0.7 0.7 0.7',
        to:   '1 1 1',
        dur:  250,
        easing: 'easeOutBack',
      });
    }
    // Notificar al HUD global
    window.dispatchEvent(new CustomEvent('npc-interact', {
      detail: { name: this.data.name, emoji: this.messages[this.msgIndex] }
    }));
  },

  /**
   * Tick: detecta proximidad del jugador.
   */
  tick() {
    if (!this.playerEl) return;

    const playerPos = new THREE.Vector3();
    const npcPos    = new THREE.Vector3();
    this.playerEl.object3D.getWorldPosition(playerPos);
    this.el.object3D.getWorldPosition(npcPos);

    const dist = playerPos.distanceTo(npcPos);
    const wasNearby = this.isNearby;
    this.isNearby = dist < this.data.range;

    if (this.isNearby && !wasNearby) {
      // Entró en rango
      this._showBubble();
      const hint = document.getElementById('npc-hint');
      if (hint) hint.classList.add('visible');
    } else if (!this.isNearby && wasNearby) {
      // Salió del rango
      this._hideBubble();
      this._stopSequence();
      const hint = document.getElementById('npc-hint');
      if (hint) hint.classList.remove('visible');
    }

    if (this.isNearby) {
      this._lookAtCamera();
    }
  },

  remove() {
    this._stopSequence();
    window.removeEventListener('keydown', this._onKeyDown);
  },
});
