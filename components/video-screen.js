/**
 * video-screen.js — Pantalla de video reutilizable con marco tipo TV.
 *
 * Coloca un video local en el mapa dentro de un marco. El jugador reproduce o
 * pausa el video pulsando E cuando está cerca (dentro de `range` metros).
 *
 * Uso como componente:
 *   <a-entity video-screen="src: assets/videos/clip.mp4; flipX: true"
 *             position="3 2 -5" rotation="0 45 0"></a-entity>
 *
 * Uso como primitiva (atributos en minúscula):
 *   <a-video-tv src="assets/videos/clip.mp4" position="3 2 -5"
 *               rotation="0 45 0" flipx="true" flipy="false"></a-video-tv>
 *
 * Parámetros:
 *   src         ruta local del video (.mp4)
 *   width/height tamaño de la pantalla en metros (def. 4 × 2.25, 16:9)
 *   range       distancia de interacción con E (def. 6 m)
 *   flipX       voltear horizontalmente
 *   flipY       voltear verticalmente
 *   loop        reproducir en bucle (def. true)
 *   volume      volumen 0–1 (def. 1)
 *   frameColor  color del marco (def. #1a1a1a)
 *   scale       escala uniforme (mismo valor en X, Y y Z) (def. 1)
 *
 * La posición y la rotación se establecen con los atributos nativos
 * `position` y `rotation` de la entidad (3 ejes cada uno). La escala se
 * controla con el parámetro `scale` del componente (siempre uniforme).
 */
AFRAME.registerComponent('video-screen', {
  schema: {
    src:        { type: 'string'  },
    width:      { type: 'number',  default: 4 },
    height:     { type: 'number',  default: 2.25 },
    range:      { type: 'number',  default: 6 },
    flipX:      { type: 'boolean', default: false },
    flipY:      { type: 'boolean', default: false },
    loop:       { type: 'boolean', default: true },
    volume:     { type: 'number',  default: 1 },
    frameColor: { type: 'color',   default: '#1a1a1a' },
    scale:      { type: 'number',  default: 1 },
  },

  init() {
    this.playerEl = document.getElementById('player');
    this._near    = false;
    this._accum   = 0;
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();

    this._onKeyDown = this._onKeyDown.bind(this);
    window.addEventListener('keydown', this._onKeyDown);

    this._build();
  },

  // Escala uniforme en los 3 ejes. Se reaplica si `scale` cambia.
  update() {
    const s = this.data.scale || 1;
    this.el.setAttribute('scale', { x: s, y: s, z: s });
  },

  _build() {
    const d = this.data;
    const W = d.width, H = d.height;
    const bezel = Math.min(W, H) * 0.06;

    // Marco tipo TV
    const frame = document.createElement('a-box');
    frame.setAttribute('width',  W + bezel * 2);
    frame.setAttribute('height', H + bezel * 2);
    frame.setAttribute('depth',  0.18);
    frame.setAttribute('position', '0 0 -0.02');
    frame.setAttribute('material', `color: ${d.frameColor}; metalness: 0.3; roughness: 0.6`);
    frame.setAttribute('shadow', 'cast: true');
    this.el.appendChild(frame);

    // Pantalla: plano que recibirá la textura de video
    const screen = document.createElement('a-plane');
    screen.setAttribute('width',  W);
    screen.setAttribute('height', H);
    screen.setAttribute('position', '0 0 0.085');
    screen.setAttribute('material', 'color: #000; shader: flat');
    this.screenEl = screen;
    this.el.appendChild(screen);

    // Etiqueta de interacción (se muestra al acercarse)
    const hint = document.createElement('a-entity');
    hint.setAttribute('text',
      `value: ▶  Pulsa E para reproducir; align: center; color: #7ee8a2; width: ${W * 1.4}`);
    hint.setAttribute('position', `0 ${H / 2 + bezel + 0.35} 0.1`);
    hint.setAttribute('visible', 'false');
    this.hintEl = hint;
    this.el.appendChild(hint);

    if (!d.src) return;
    const setup = () => this._setupVideo();
    if (screen.getObject3D('mesh')) setup();
    else screen.addEventListener('loaded', setup);
  },

  _setupVideo() {
    const d = this.data;

    const video = document.createElement('video');
    video.setAttribute('src', d.src);
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.crossOrigin = 'anonymous';
    video.loop   = d.loop;
    video.volume = d.volume;
    video.style.display = 'none';
    document.body.appendChild(video);   // máxima compatibilidad de reproducción
    video.load();
    this.video = video;

    const tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;

    // Volteo mediante repeat/offset (robusto en cualquier versión de three)
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(d.flipX ? -1 : 1, d.flipY ? -1 : 1);
    tex.offset.set(d.flipX ?  1 : 0, d.flipY ?  1 : 0);
    this.texture = tex;

    const mesh = this.screenEl.getObject3D('mesh');
    if (mesh) {
      mesh.material = new THREE.MeshBasicMaterial({ map: tex });
      mesh.material.needsUpdate = true;
    }
  },

  _onKeyDown(e) {
    if (e.code !== 'KeyE') return;
    // No reaccionar mientras se escribe (chat u otros campos de texto)
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    if (!this._near || !this.video) return;
    this._toggle();
  },

  _toggle() {
    const v = this.video;
    if (v.paused) v.play().catch(() => {});
    else          v.pause();
    if (this.hintEl) this.hintEl.setAttribute('visible', false);
  },

  tick(time, dt) {
    this._accum += dt || 16;
    if (this._accum < 250) return;        // comprobar proximidad ~4 veces/s
    this._accum = 0;
    if (!this.playerEl) return;

    this.playerEl.object3D.getWorldPosition(this._a);
    this.el.object3D.getWorldPosition(this._b);
    this._near = this._a.distanceTo(this._b) <= this.data.range;

    if (this.hintEl) {
      this.hintEl.setAttribute('visible',
        !!(this._near && this.video && this.video.paused));
    }
  },

  remove() {
    window.removeEventListener('keydown', this._onKeyDown);
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      if (this.video.parentNode) this.video.parentNode.removeChild(this.video);
    }
  },
});

/* Primitiva de conveniencia: <a-video-tv> */
AFRAME.registerPrimitive('a-video-tv', {
  defaultComponents: { 'video-screen': {} },
  mappings: {
    src:          'video-screen.src',
    width:        'video-screen.width',
    height:       'video-screen.height',
    range:        'video-screen.range',
    flipx:        'video-screen.flipX',
    flipy:        'video-screen.flipY',
    loop:         'video-screen.loop',
    volume:       'video-screen.volume',
    'frame-color':'video-screen.frameColor',
    size:         'video-screen.scale',  // escala uniforme (evita chocar con el atributo nativo "scale")
  },
});
