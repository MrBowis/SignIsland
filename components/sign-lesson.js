/**
 * sign-lesson.js
 * Academia de Señas LSEC — Pizarrón 3D inmersivo.
 *
 * El componente 'academia' se adjunta al entity #pizarron.
 * El video se proyecta sobre la superficie del pizarrón usando
 * proyección 3D precisa (NDC → pantalla) con compensación de
 * devicePixelRatio, scroll y canvas offset.
 *
 * Controles:
 *   E      — Abrir lista / seleccionar lección / reproducir o pausar video
 *   ↑ ↓   — Navegar lista; durante video: lección anterior / siguiente
 *   Esc    — Cerrar video → volver a lista → volver a inicio
 */

// ─── Datos de lecciones ───────────────────────────────────────────────────────
const DEFAULT_LESSONS = [
  {
    id: 1, word: 'Hablar', emoji: '🗣️',
    description: 'Dedos indice y medio moviendose cerca de la boca',
    handshape: '☝️', movement: '🔁', location: '👄',
    youtubeId: 'S-cx-IiDUHg',
  },
  {
    id: 2, word: 'Como te sientes', emoji: '😊',
    description: 'Mano al pecho con movimiento circular suave en el corazon',
    handshape: '🤚', movement: '🔄', location: '🫁',
    youtubeId: 'L0Dp2xZB9-U',
  },
  {
    id: 3, word: 'Como esta', emoji: '👋',
    description: 'Mano abierta describiendo un gesto de saludo formal',
    handshape: '🤚', movement: '↔️', location: '🙂',
    youtubeId: 'aB4nMgDQyes',
  },
  {
    id: 4, word: 'Hace tiempo que no te veo', emoji: '⏳',
    description: 'Expresa que paso mucho tiempo desde el ultimo encuentro',
    handshape: '🤚', movement: '➡️', location: '🙂',
    youtubeId: 'NnXpTwGFhv0',
  },
  {
    id: 5, word: 'Que tal', emoji: '🤙',
    description: 'Gesto informal de saludo cotidiano en LSEC',
    handshape: '🤙', movement: '↔️', location: '🙂',
    youtubeId: 'gr4wOlOs4t4',
  },
  {
    id: 6, word: 'Buenas noches', emoji: '🌙',
    description: 'Cruza los brazos representando el atardecer o la noche',
    handshape: '🤚🤚', movement: '🔄', location: '🫁',
    youtubeId: 'RocuYZgMKlQ',
  },
  {
    id: 7, word: 'Hacer', emoji: '🛠️',
    description: 'Punos uno sobre otro imitando la accion de construir',
    handshape: '✊✊', movement: '⬇️', location: '🫁',
    youtubeId: 'Btj3-tWetf0',
  },
  {
    id: 8, word: 'Dar', emoji: '🤲',
    description: 'Ambas manos con palmas abiertas hacia adelante',
    handshape: '🤚🤚', movement: '➡️', location: '🫁',
    youtubeId: 'UIkQU2O5ktc',
  },
  {
    id: 9, word: 'Saber', emoji: '🧠',
    description: 'Toca el lateral de la frente con el dedo indice',
    handshape: '☝️', movement: '⬇️', location: '🙂',
    youtubeId: 'ffpkmgyQGfo',
  },
  {
    id: 10, word: 'Nadar', emoji: '🏊',
    description: 'Simula brazadas en el aire con ambos brazos alternados',
    handshape: '🤚🤚', movement: '🔁', location: '🫁',
    youtubeId: 'GpX-lgGir1A',
  },
  {
    id: 11, word: 'Feliz', emoji: '😄',
    description: 'Manos en el pecho con movimientos rapidos hacia arriba',
    handshape: '🤚🤚', movement: '⬆️', location: '🫁',
    youtubeId: 'cUs97izzUpk',
  },
  {
    id: 12, word: 'Facil', emoji: '👌',
    description: 'Pasa los dedos por la frente con movimiento agil y ligero',
    handshape: '🤚', movement: '➡️', location: '🙂',
    youtubeId: 'OAPj7nxv4iE',
  },
  {
    id: 13, word: 'Nada', emoji: '💨',
    description: 'Cruza manos abiertas frente a ti y separalas hacia afuera',
    handshape: '🤚🤚', movement: '↔️', location: '🫁',
    youtubeId: 'Nw6w7-8bSKs',
  },
  {
    id: 14, word: 'Donde', emoji: '📍',
    description: 'Manos abiertas con palmas hacia arriba moviendose de lado a lado',
    handshape: '🤚🤚', movement: '↔️', location: '🫁',
    youtubeId: 'VbSuBUJzyIw',
  },
  {
    id: 15, word: 'Cuando', emoji: '📅',
    description: 'Dedo indice sobre los otros simulando el conteo de tiempo',
    handshape: '☝️', movement: '🔁', location: '🫁',
    youtubeId: 'BVYQn8Z8mQk',
  },
  {
    id: 16, word: 'Que', emoji: '❓',
    description: 'Extiende el indice y haz un movimiento de rotacion leve',
    handshape: '☝️', movement: '🔄', location: '🫁',
    youtubeId: '_NV7UPduH3E',
  },
  {
    id: 17, word: 'Cual', emoji: '👉',
    description: 'Senala alternativamente simulando elegir entre dos opciones',
    handshape: '☝️☝️', movement: '↔️', location: '🫁',
    youtubeId: 'SSKlBHbEIJ8',
  },
];

// ─── Progreso ─────────────────────────────────────────────────────────────────
const LessonProgress = {
  _visited: [],
  load() {
    try { const s = localStorage.getItem('signisland_visited'); if (s) this._visited = JSON.parse(s); } catch (_) {}
  },
  save() {
    try { localStorage.setItem('signisland_visited', JSON.stringify(this._visited)); } catch (_) {}
  },
  markVisited(id) { if (!this._visited.includes(id)) { this._visited.push(id); this.save(); } },
  isVisited(id)  { return this._visited.includes(id); },
  totalVisited() { return this._visited.length; },
  reset()        { this._visited = []; this.save(); },
};
LessonProgress.load();

// ─── Victoria ─────────────────────────────────────────────────────────────────
function showVictoryOverlay(total) {
  if (document.getElementById('victory-overlay')) return;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes fadeInV  { from{opacity:0}            to{opacity:1} }
    @keyframes zoomInV  { from{transform:scale(.8);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes bounceV  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  `;
  document.head.appendChild(s);

  const ov = document.createElement('div');
  ov.id = 'victory-overlay';
  ov.style.cssText = `position:fixed;inset:0;background:rgba(10,22,40,.96);backdrop-filter:blur(12px);
    z-index:9999;display:flex;align-items:center;justify-content:center;
    font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;color:#fff;animation:fadeInV .4s ease;`;
  ov.innerHTML = `
    <div style="background:linear-gradient(135deg,#1b2845,#090e1a);border:1px solid rgba(126,232,162,.3);
      box-shadow:0 10px 40px rgba(0,0,0,.5);border-radius:28px;padding:40px 30px;
      max-width:420px;width:90%;text-align:center;animation:zoomInV .4s cubic-bezier(.34,1.56,.64,1)">
      <div style="font-size:5rem;margin-bottom:20px;animation:bounceV 2s infinite">🎓</div>
      <h1 style="color:#7ee8a2;font-size:1.7rem;font-weight:800;margin-bottom:12px">Has visto todas las senyas LSEC</h1>
      <p style="color:#ccc;font-size:.9rem;line-height:1.5;margin-bottom:24px">
        Has completado las <strong>${total}</strong> senyas de la
        <strong>Lengua de Senyas Ecuatoriana</strong> en SignIsland.
      </p>
      <button id="victory-close-btn" style="background:linear-gradient(90deg,#7ee8a2,#38bdf8);
        border:none;color:#0a1628;font-size:1rem;font-weight:800;padding:14px 36px;
        border-radius:50px;cursor:pointer;">Seguir Explorando 🏝️</button>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('victory-close-btn').addEventListener('click', () => ov.remove());
}

// ─── Helpers de proyección ────────────────────────────────────────────────────

/**
 * Proyecta un punto 3D (world space) a coordenadas de pantalla (px, py) en
 * píxeles CSS del viewport, compensando:
 *   - devicePixelRatio del canvas WebGL
 *   - posición y tamaño del canvas dentro del documento
 *
 * Retorna { x, y, behind } donde behind=true si el punto está detrás de la cámara.
 */
function worldToScreen(worldVec3, camera, canvas) {
  const ndc = worldVec3.clone().project(camera);

  // z > 1  →  el punto está detrás del near plane (detrás de la cámara)
  if (ndc.z > 1) return { x: 0, y: 0, behind: true };

  const rect = canvas.getBoundingClientRect();

  // El canvas WebGL puede tener un resolution distinta al tamaño CSS (HiDPI).
  // canvas.width / rect.width da el ratio de píxeles reales a píxeles CSS.
  // Pero NDC ya está en [-1,1] respecto al viewport lógico (no al buffer WebGL),
  // así que sólo necesitamos rect para pasar a coordenadas de pantalla.

  const px = rect.left + (ndc.x  *  0.5 + 0.5) * rect.width;
  const py = rect.top  + (-ndc.y *  0.5 + 0.5) * rect.height;

  return { x: px, y: py, behind: false };
}

/**
 * Calcula el bounding box en pantalla (CSS px) de un conjunto de puntos 3D.
 * Retorna null si algún punto está detrás de la cámara.
 */
function boundingBoxScreen(points3D, camera, canvas) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points3D) {
    const s = worldToScreen(p, camera, canvas);
    if (s.behind) return null;
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }

  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}

// ─── Componente A-Frame ───────────────────────────────────────────────────────
AFRAME.registerComponent('academia', {
  schema: { range: { type: 'number', default: 12 } },

  init() {
    this.state        = 'idle';
    this.listIndex    = 0;
    this.listOffset   = 0;
    this.lessonIndex  = 0;
    this.videoShown   = false;
    this.videoPlaying = false;
    this.playerEl     = document.querySelector('#player');
    this.isNearby     = false;
    this.lessons      = DEFAULT_LESSONS;
    this.boardTexts   = {};
    this._rafId       = null;       // requestAnimationFrame para sincronía con render
    this._boardCorners = null;      // cache de las esquinas del pizarrón en world space

    fetch('data/world.json')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.lessons) && d.lessons.length) this.lessons = d.lessons; })
      .catch(() => {});

    this._buildBoardText();
    this._buildVideoOverlay();

    const scene = document.querySelector('a-scene');
    const init  = () => { this._updateBoardCorners(); this._renderIdle(); };
    scene.hasLoaded ? init() : scene.addEventListener('loaded', init);

    this._onKey = this._onKey.bind(this);
    window.addEventListener('keydown', this._onKey, true);
  },

  // ── Esquinas del pizarrón en world space ─────────────────────────────────
  //
  // El entity #pizarron tiene en su espacio local una superficie de 5 × 3.4
  // centrada en (0, 2.5, 0.07).  Definimos las 4 esquinas de esa superficie
  // y las transformamos a world space cada vez que el objeto se mueva (una vez
  // en init y opcionalmente en tick si el pizarrón fuera dinámico).

  _updateBoardCorners() {
    // Superficie local: width=5, height=3.4, z=0.09 (ligeramente delante del tablero)
    const hw = 2.50;   // half-width
    const hh = 1.70;   // half-height   (3.4 / 2)
    const cy = 2.50;   // centro Y del pizarrón en espacio local
    const z  = 0.09;

    const local = [
      new THREE.Vector3(-hw, cy - hh, z),   // inferior izquierda
      new THREE.Vector3( hw, cy - hh, z),   // inferior derecha
      new THREE.Vector3( hw, cy + hh, z),   // superior derecha
      new THREE.Vector3(-hw, cy + hh, z),   // superior izquierda
    ];

    const mat = this.el.object3D.matrixWorld;
    this._boardCorners = local.map(lc => lc.clone().applyMatrix4(mat));
  },

  // ── Texto del pizarrón ────────────────────────────────────────────────────

  _buildBoardText() {
    const lines = [
      { id: 'b1', pos: '0 3.88 0.13', color: '#f0e070', width: '4.8', wc: 26 },
      { id: 'b2', pos: '0 3.28 0.13', color: '#e8f4c8', width: '4.6', wc: 34 },
      { id: 'b3', pos: '0 2.70 0.13', color: '#c0dcc0', width: '4.6', wc: 40 },
      { id: 'b4', pos: '0 2.15 0.13', color: '#90b890', width: '4.6', wc: 40 },
      { id: 'b5', pos: '0 1.58 0.13', color: '#a0c0d0', width: '4.6', wc: 36 },
    ];
    lines.forEach(cfg => {
      const el = document.createElement('a-text');
      el.setAttribute('position',   cfg.pos);
      el.setAttribute('align',      'center');
      el.setAttribute('color',      cfg.color);
      el.setAttribute('width',      cfg.width);
      el.setAttribute('wrap-count', cfg.wc);
      el.setAttribute('font',       'roboto');
      el.setAttribute('value',      '');
      this.el.appendChild(el);
      this.boardTexts[cfg.id] = el;
    });
  },

  // ── Overlay del video ─────────────────────────────────────────────────────
  //
  // El div usa position:fixed con pointer-events:auto.
  // Su posición y tamaño se recalculan CADA FRAME en _syncOverlay,
  // que se llama desde un rAF encadenado para estar sincronizado con
  // el render de Three.js y no desfasarse del canvas.

  _buildVideoOverlay() {
    // Contenedor negro que simula la pantalla de la TV
    const wrap = document.createElement('div');
    wrap.id = 'board-video-wrap';
    wrap.style.cssText = [
      'display:none',
      'position:fixed',
      // Se posiciona absolutamente; left/top/width/height se setean en _syncOverlay
      'left:0', 'top:0', 'width:1px', 'height:1px',
      'background:#000',
      // z-index bajo: queremos que quede DETRÁS de los HUDs de inventario
      // pero ENCIMA del canvas de A-Frame (que tiene z-index 0 por defecto)
      'z-index:50',
      'overflow:hidden',
      'border-radius:4px',
      // Sombra para dar sensación de profundidad TV
      'box-shadow:0 0 0 3px #111, 0 0 20px rgba(0,0,0,0.8)',
      // pointer-events:auto permite al usuario hacer click en el iframe
      'pointer-events:auto',
      // Transición suave para cuando el pizarrón se acerca/aleja
      'transition:opacity 0.15s ease',
    ].join(';');

    const iframe = document.createElement('iframe');
    iframe.id = 'board-video-iframe';
    iframe.style.cssText = [
      'position:absolute',
      'left:0', 'top:0',
      'width:100%', 'height:100%',
      'border:none',
      'display:block',
      // Fondo negro mientras carga
      'background:#000',
    ].join(';');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');

    wrap.appendChild(iframe);
    document.body.appendChild(wrap);

    this.videoOverlay = wrap;
    this.videoIframe  = iframe;
  },

  // ── Sincronizar posición del overlay con el pizarrón ─────────────────────
  //
  // Estrategia:
  //  1. Obtener la cámara Three.js y el canvas WebGL de la escena A-Frame.
  //  2. Proyectar las 4 esquinas del pizarrón (world space) a NDC.
  //  3. Convertir NDC a coordenadas CSS del viewport usando getBoundingClientRect()
  //     del canvas.  Esto maneja automáticamente:
  //       - canvas con padding/margin
  //       - ventana con scroll (aunque AFrame normalmente es fullscreen)
  //       - HiDPI (el rect ya está en píxeles CSS, no en píxeles físicos)
  //  4. Aplicar el bounding box al div del overlay.
  //
  // Este método se llama cada frame vía rAF mientras el video esté abierto.

  _syncOverlay() {
    if (!this.videoShown) return;

    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl?.camera || !sceneEl.canvas) return;

    // Actualizar corners si la matrixWorld pudo haber cambiado (por seguridad)
    // En este proyecto el pizarrón es estático, pero es barato hacerlo.
    this._updateBoardCorners();

    const bb = boundingBoxScreen(this._boardCorners, sceneEl.camera, sceneEl.canvas);

    if (!bb || bb.width < 5 || bb.height < 5) {
      // Pizarrón fuera de vista: ocultar el overlay
      this.videoOverlay.style.opacity = '0';
      this.videoOverlay.style.pointerEvents = 'none';
      return;
    }

    // Clip al viewport para que no sobresalga
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clampedLeft   = Math.max(0, bb.left);
    const clampedTop    = Math.max(0, bb.top);
    const clampedRight  = Math.min(vw, bb.left + bb.width);
    const clampedBottom = Math.min(vh, bb.top  + bb.height);
    const w = clampedRight  - clampedLeft;
    const h = clampedBottom - clampedTop;

    if (w < 5 || h < 5) {
      this.videoOverlay.style.opacity = '0';
      this.videoOverlay.style.pointerEvents = 'none';
      return;
    }

    // Aplicar posición y tamaño — SIN transition en left/top/width/height
    // para que siga al pizarrón sin lag visual
    this.videoOverlay.style.left   = clampedLeft + 'px';
    this.videoOverlay.style.top    = clampedTop  + 'px';
    this.videoOverlay.style.width  = w + 'px';
    this.videoOverlay.style.height = h + 'px';
    this.videoOverlay.style.opacity = '1';
    this.videoOverlay.style.pointerEvents = 'auto';
    this.videoOverlay.style.display = 'block';

    // Escalar el iframe para llenar el contenedor exactamente
    // (el iframe siempre tiene width:100% height:100%, basta con
    //  que el contenedor tenga el tamaño correcto)
  },

  // rAF loop que mantiene el overlay pegado al pizarrón mientras el video esté visible
  _startSyncLoop() {
    if (this._rafId !== null) return;
    const loop = () => {
      if (!this.videoShown) { this._rafId = null; return; }
      this._syncOverlay();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  },

  _stopSyncLoop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  },

  // ── Renderizado de estados ────────────────────────────────────────────────

  _renderIdle() {
    this.state = 'idle';
    window.academiaOpen = false;
    this._showBoardText(true);

    const visited = LessonProgress.totalVisited();
    const total   = this.lessons.length;
    const pct     = total ? Math.round((visited / total) * 100) : 0;
    const filled  = Math.round(pct / 10);
    const bar     = '##########'.slice(0, filled) + '..........'.slice(0, 10 - filled);

    this._setText('b1', 'Academia LSEC 🏛️',                       '#f0e070');
    this._setText('b2', `Senyas vistas: ${visited} de ${total}`,   '#9be89b');
    this._setText('b3', bar,                                         '#4a7a4a');
    this._setText('b4', '',                                          '#90b890');
    this._setText('b5',
      visited < total ? '[E] Entrar a la academia' : 'Completado! 🎓',
      visited < total ? '#a0d080' : '#f0e070');
  },

  _renderList() {
    this.state = 'list';
    window.academiaOpen = true;
    this._showBoardText(true);

    const VISIBLE = 4;
    const total   = this.lessons.length;
    const visited = LessonProgress.totalVisited();

    if (this.listIndex < this.listOffset) this.listOffset = this.listIndex;
    if (this.listIndex >= this.listOffset + VISIBLE) this.listOffset = this.listIndex - VISIBLE + 1;
    this.listOffset = Math.max(0, Math.min(this.listOffset, Math.max(0, total - VISIBLE)));

    this._setText('b1', `Lecciones  ${visited}/${total}`, '#f0e070');

    const lineIds = ['b2', 'b3', 'b4', 'b5'];
    for (let i = 0; i < VISIBLE; i++) {
      const idx = this.listOffset + i;
      if (idx >= total) { this._setText(lineIds[i], '', '#888'); continue; }
      const lesson = this.lessons[idx];
      const seen   = LessonProgress.isVisited(lesson.id);
      const sel    = idx === this.listIndex;
      const prefix = sel ? '>> ' : '   ';
      const suffix = seen ? ' OK' : '';
      const color  = sel ? '#f0e070' : seen ? '#9be89b' : '#e8f4c8';
      this._setText(lineIds[i], `${prefix}${lesson.emoji} ${lesson.word}${suffix}`, color);
    }
  },

  _renderLesson(idx) {
    this.state        = 'lesson';
    this.lessonIndex  = idx;
    this.videoShown   = false;
    this.videoPlaying = false;

    const lesson = this.lessons[idx];
    LessonProgress.markVisited(lesson.id);

    this.videoIframe.src = lesson.youtubeId
      ? `https://www.youtube-nocookie.com/embed/${lesson.youtubeId}?enablejsapi=1&rel=0&modestbranding=1&controls=1`
      : '';

    this._showBoardText(true);
    this._setBoardSurface('#1a3d1a');

    this._setText('b1', `${lesson.emoji}  ${lesson.word}`,  '#f0e070');
    this._setText('b2', lesson.description,                  '#c8e8c8');
    const meta = [];
    if (lesson.handshape) meta.push(`Forma: ${lesson.handshape}`);
    if (lesson.movement)  meta.push(`Mov: ${lesson.movement}`);
    if (lesson.location)  meta.push(`Lugar: ${lesson.location}`);
    this._setText('b3', meta.join('  '), '#90b890');
    this._setText('b4', '',              '#90b890');
    this._setText('b5', '[E] Reproducir  [^ v] Siguiente  [Esc] Lista', '#a0c0d0');

    if (LessonProgress.totalVisited() >= this.lessons.length) {
      setTimeout(() => showVictoryOverlay(this.lessons.length), 800);
    }
  },

  // ── Control de video ──────────────────────────────────────────────────────

  _openVideo() {
    this.videoShown   = true;
    this.videoPlaying = false;

    // Ocultar texto del pizarrón (el video lo reemplaza visualmente)
    this._setBoardSurface('#050505');
    this._showBoardText(false);

    // Mostrar overlay con opacidad 0 para que la primera posición
    // se calcule antes de que sea visible (evita flash en posición 0,0)
    this.videoOverlay.style.opacity  = '0';
    this.videoOverlay.style.display  = 'block';

    // Arrancar el loop de sincronización ANTES de liberar pointer lock
    // para que en el primer frame ya esté posicionado
    this._startSyncLoop();

    // Liberar pointer lock: el usuario necesita hacer click en el iframe
    document.exitPointerLock?.();

    // Reproducir automáticamente
    setTimeout(() => {
      this._ytCmd('playVideo');
      this.videoPlaying = true;
    }, 1200);
  },

  _closeVideo() {
    if (!this.videoShown) return;

    this._stopSyncLoop();
    this._ytCmd('pauseVideo');

    this.videoOverlay.style.display = 'none';
    this.videoOverlay.style.opacity = '0';
    this.videoShown   = false;
    this.videoPlaying = false;

    this._setBoardSurface('#1a3d1a');
    if (this.state === 'lesson') this._showBoardText(true);
  },

  _ytCmd(cmd) {
    try {
      this.videoIframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: cmd, args: '' }), '*'
      );
    } catch (_) {}
  },

  _setBoardSurface(color) {
    const surface = document.getElementById('pizarron-surface');
    if (surface) surface.setAttribute('material', `color: ${color}`);
  },

  _showBoardText(visible) {
    const v = visible ? 'true' : 'false';
    Object.values(this.boardTexts).forEach(el => el.setAttribute('visible', v));
  },

  // ── Teclado ───────────────────────────────────────────────────────────────

  _onKey(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!this.isNearby) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') return;
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      if (this.state === 'list')   this._navigateList(dir);
      else if (this.state === 'lesson') this._switchLesson(dir);
      return;
    }

    if (!this.isNearby) return;

    if (e.key === 'Escape') { this._handleEsc(); return; }
    if (e.key === 'e' || e.key === 'E') this._handleE(e);
  },

  _handleE(e) {
    switch (this.state) {
      case 'idle':
        this._openList();
        e?.stopImmediatePropagation();
        break;
      case 'list':
        this._renderLesson(this.listIndex);
        e?.stopImmediatePropagation();
        break;
      case 'lesson':
        if (this.videoShown) {
          if (this.videoPlaying) { this._ytCmd('pauseVideo'); this.videoPlaying = false; }
          else                   { this._ytCmd('playVideo');  this.videoPlaying = true;  }
        } else {
          this._openVideo();
        }
        e?.stopImmediatePropagation();
        break;
    }
  },

  _handleEsc() {
    if (this.videoShown)      { this._closeVideo(); return; }
    if (this.state === 'lesson') this._openList();
    else if (this.state === 'list') this._renderIdle();
  },

  _openList() {
    window.academiaOpen = true;
    this._closeVideo();
    this._showBoardText(true);
    this._setBoardSurface('#1a3d1a');
    if (this.state === 'lesson') {
      this.listIndex  = this.lessonIndex;
      this.listOffset = Math.max(0, this.listIndex - 1);
    }
    this._renderList();
    window.dispatchEvent(new CustomEvent('game-message', {
      detail: { text: '↑↓ navegar   E seleccionar   Esc salir', type: 'info' }
    }));
  },

  _navigateList(dir) {
    this.listIndex = Math.max(0, Math.min(this.listIndex + dir, this.lessons.length - 1));
    this._renderList();
  },

  _switchLesson(dir) {
    const next = this.lessonIndex + dir;
    if (next < 0 || next >= this.lessons.length) return;
    this._closeVideo();
    this._renderLesson(next);
  },

  // ── Helpers ───────────────────────────────────────────────────────────────

  _setText(id, value, color) {
    const el = this.boardTexts[id];
    if (!el) return;
    if (el.getAttribute('value') !== value) el.setAttribute('value', value);
    if (color) el.setAttribute('color', color);
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (!this.playerEl) return;

    const pPos = new THREE.Vector3();
    const ePos = new THREE.Vector3();
    this.playerEl.object3D.getWorldPosition(pPos);
    this.el.object3D.getWorldPosition(ePos);

    const dist      = pPos.distanceTo(ePos);
    const wasNearby = this.isNearby;
    this.isNearby   = dist < this.data.range;

    if (this.isNearby && !wasNearby) {
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: '🏛️ Presiona [E] para entrar a la Academia', type: 'info' }
      }));
    }

    if (!this.isNearby && wasNearby && this.state !== 'idle') {
      this._closeVideo();
      window.academiaOpen = false;
      this._renderIdle();
    }
  },

  remove() {
    this._stopSyncLoop();
    window.removeEventListener('keydown', this._onKey, true);
    this.videoOverlay?.remove();
  },
});