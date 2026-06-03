/**
 * sign-lesson.js  — SignIsland Academia LSEC
 *
 * El video se carga desde  assets/videos/{videoId}.mp4  (archivo local).
 * Se aplica como THREE.VideoTexture directamente al mesh del plano-pantalla,
 * sin iframes, sin a-assets, sin crossorigin.
 *
 * Controles (solo cuando el jugador está a menos de `range` metros):
 *   E      — idle→lista  |  lista→ver lección  |  lección→siguiente
 *   ↑ / ↓  — navegar lista  |  lección anterior/siguiente
 *   Esc    — lección→lista  |  lista→idle
 */

// ─── Lecciones ────────────────────────────────────────────────────────────────
const DEFAULT_LESSONS = [
  { id:  1, word: 'Hablar',                   emoji: '🗣️', videoId: 'S-cx-IiDUHg',
    description: 'Dedos indice y medio moviendose cerca de la boca' },
  { id:  2, word: 'Como te sientes',           emoji: '😊', videoId: 'L0Dp2xZB9-U',
    description: 'Mano al pecho con movimiento circular suave' },
  { id:  3, word: 'Como esta',                 emoji: '👋', videoId: 'aB4nMgDQyes',
    description: 'Mano abierta describiendo un gesto de saludo formal' },
  { id:  4, word: 'Hace tiempo que no te veo', emoji: '⏳', videoId: 'NnXpTwGFhv0',
    description: 'Expresa que paso mucho tiempo desde el ultimo encuentro' },
  { id:  5, word: 'Que tal',                   emoji: '🤙', videoId: 'gr4wOlOs4t4',
    description: 'Gesto informal de saludo cotidiano en LSEC' },
  { id:  6, word: 'Buenas noches',             emoji: '🌙', videoId: 'RocuYZgMKlQ',
    description: 'Cruza los brazos representando el atardecer o la noche' },
  { id:  7, word: 'Hacer',                     emoji: '🛠️', videoId: 'Btj3-tWetf0',
    description: 'Punos uno sobre otro imitando la accion de construir' },
  { id:  8, word: 'Dar',                       emoji: '🤲', videoId: 'UIkQU2O5ktc',
    description: 'Ambas manos con palmas abiertas hacia adelante' },
  { id:  9, word: 'Saber',                     emoji: '🧠', videoId: 'ffpkmgyQGfo',
    description: 'Toca el lateral de la frente con el dedo indice' },
  { id: 10, word: 'Nadar',                     emoji: '🏊', videoId: 'GpX-lgGir1A',
    description: 'Simula brazadas en el aire con ambos brazos alternados' },
  { id: 11, word: 'Feliz',                     emoji: '😄', videoId: 'cUs97izzUpk',
    description: 'Manos en el pecho con movimientos rapidos hacia arriba' },
  { id: 12, word: 'Facil',                     emoji: '👌', videoId: 'OAPj7nxv4iE',
    description: 'Pasa los dedos por la frente con movimiento agil' },
  { id: 13, word: 'Nada',                      emoji: '💨', videoId: 'Nw6w7-8bSKs',
    description: 'Cruza manos abiertas frente a ti y separalas hacia afuera' },
  { id: 14, word: 'Donde',                     emoji: '📍', videoId: 'VbSuBUJzyIw',
    description: 'Manos abiertas con palmas hacia arriba de lado a lado' },
  { id: 15, word: 'Cuando',                    emoji: '📅', videoId: 'BVYQn8Z8mQk',
    description: 'Dedo indice sobre los otros simulando conteo de tiempo' },
  { id: 16, word: 'Que',                       emoji: '❓', videoId: '_NV7UPduH3E',
    description: 'Extiende el indice y haz un movimiento de rotacion leve' },
  { id: 17, word: 'Cual',                      emoji: '👉', videoId: 'SSKlBHbEIJ8',
    description: 'Senala alternativamente simulando elegir entre dos opciones' },
];

// ─── Progreso ─────────────────────────────────────────────────────────────────
const LessonProgress = {
  _visited: [],
  load()  { try { const s = localStorage.getItem('signisland_visited'); if (s) this._visited = JSON.parse(s); } catch (_) {} },
  save()  { try { localStorage.setItem('signisland_visited', JSON.stringify(this._visited)); } catch (_) {} },
  markVisited(id) { if (!this._visited.includes(id)) { this._visited.push(id); this.save(); } },
  isVisited(id)   { return this._visited.includes(id); },
  totalVisited()  { return this._visited.length; },
};
LessonProgress.load();

// ─── Victoria ─────────────────────────────────────────────────────────────────
function showVictoryOverlay(total) {
  if (document.getElementById('victory-overlay')) return;
  const ov = document.createElement('div');
  ov.id = 'victory-overlay';
  ov.style.cssText = `position:fixed;inset:0;background:rgba(10,22,40,.95);
    backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;
    justify-content:center;font-family:'Segoe UI Emoji',sans-serif;color:#fff;`;
  ov.innerHTML = `
    <div style="background:linear-gradient(135deg,#1b2845,#090e1a);
      border:1px solid rgba(126,232,162,.3);border-radius:28px;
      padding:40px 30px;max-width:420px;width:90%;text-align:center;">
      <div style="font-size:5rem;margin-bottom:20px;">🎓</div>
      <h1 style="color:#7ee8a2;font-size:1.7rem;font-weight:800;margin-bottom:12px;">
        Has visto todas las Senias LSEC</h1>
      <p style="color:#ccc;font-size:.9rem;line-height:1.5;margin-bottom:24px;">
        Completaste las <strong>${total}</strong> Senias de la
        <strong>Lengua de Senias Ecuatoriana</strong> en SignIsland.</p>
      <button id="victory-close-btn"
        style="background:linear-gradient(90deg,#7ee8a2,#38bdf8);border:none;
          color:#0a1628;font-size:1rem;font-weight:800;padding:14px 36px;
          border-radius:50px;cursor:pointer;">Seguir Explorando 🏝️</button>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('victory-close-btn').addEventListener('click', () => ov.remove());
}

// ─── Componente A-Frame ───────────────────────────────────────────────────────
AFRAME.registerComponent('academia', {
  schema: { range: { type: 'number', default: 12 } },

  init() {
    this.state        = 'idle';
    this.listIndex    = 0;
    this.listOffset   = 0;
    this.lessonIndex  = 0;
    this.playerEl     = document.querySelector('#player');
    this.isNearby     = false;
    this.lessons      = DEFAULT_LESSONS;
    this.boardTexts   = {};
    this.screenEl     = null;   // a-plane hijo — pantalla TV
    this._vid         = null;   // HTMLVideoElement — fuente de textura
    this._tex         = null;   // THREE.VideoTexture activa

    fetch('data/world.json')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.lessons) && d.lessons.length) this.lessons = d.lessons; })
      .catch(() => {});

    this._buildVideoElement();
    this._buildScreen();
    this._buildBoardText();

    const scene = document.querySelector('a-scene');
    const onLoad = () => this._renderIdle();
    scene.hasLoaded ? onLoad() : scene.addEventListener('loaded', onLoad);

    this._onKey = this._onKey.bind(this);
    window.addEventListener('keydown', this._onKey, true);
  },

  // ── <video> DOM ──────────────────────────────────────────────────────────
  // - NO va en <a-assets>: A-Frame procesa assets una sola vez al inicio,
  //   cualquier elemento dinámico añadido después es ignorado por el sistema
  //   de texturas de A-Frame.
  // - NO tiene crossorigin: ese atributo hace que el navegador aplique
  //   CORS al archivo local, y un servidor simple (python http.server)
  //   no envía Access-Control-Allow-Origin para archivos de video, lo que
  //   bloquea la lectura de píxeles por WebGL.
  // - La textura se aplica manualmente con THREE.VideoTexture.

  _buildVideoElement() {
    const vid = document.createElement('video');
    vid.id       = 'board-video-el';
    vid.loop     = true;
    vid.muted    = true;
    vid.preload  = 'auto';
    // playsinline evita que iOS abra el video en pantalla completa
    vid.setAttribute('playsinline', '');
    // Ocultar visualmente pero mantener en el DOM para que el navegador
    // pueda decodificar el video en segundo plano
    vid.style.cssText = 'position:fixed;width:1px;height:1px;top:-10px;left:-10px;opacity:0.01;pointer-events:none;';
    document.body.appendChild(vid);
    this._vid = vid;
  },

  // ── Plano-pantalla hijo del pizarrón ─────────────────────────────────────
  // Al ser hijo hereda la transformación exacta del entity pizarrón.
  // Dimensiones coinciden con <a-plane id="pizarron-surface"> del index.html.

  _buildScreen() {
    const screen = document.createElement('a-plane');
    screen.id = 'pizarron-screen';
    screen.setAttribute('width',    '5');
    screen.setAttribute('height',   '3.4');
    // z=0.08 → justo delante de pizarron-surface (z=0.07) para no z-fight
    screen.setAttribute('position', '0 2.5 0.08');
    screen.setAttribute('material', 'shader:flat; color:#000000; side:front');
    screen.setAttribute('visible',  'false');
    this.el.appendChild(screen);
    this.screenEl = screen;
  },

  // ── Cargar video local y aplicar como textura ─────────────────────────────
  // Flujo:
  //  1. Resetear el <video> anterior
  //  2. Asignar src = ruta local (assets/videos/ID.mp4)
  //  3. Esperar evento 'loadeddata' (hay un frame decodificado)
  //  4. Crear THREE.VideoTexture y asignarla al material del mesh
  //  5. Llamar vid.play()

  _loadVideo(videoId) {
    const vid = this._vid;

    // 1. Limpiar estado anterior
    this._clearTexture();
    vid.pause();
    vid.removeAttribute('src');
    vid.load();                       // resetea el decoder

    // Mostrar pantalla negra mientras carga
    this.screenEl.setAttribute('visible', 'true');
    this._setMeshBlack();

    // 2. Ruta local — NO es una URL de YouTube
    vid.src = `assets/videos/${videoId}.mp4`;

    // 3. loadeddata: el primer fotograma está disponible para WebGL
    const onReady = () => {
      // 4. Crear textura y asignarla al mesh
      this._applyTexture();

      // 5. Reproducir
      vid.play().catch(() => {
        // Autoplay bloqueado (raro: el usuario ya interactuó con el juego,
        // pero por si acaso lo manejamos con la siguiente tecla)
        window.dispatchEvent(new CustomEvent('game-message', {
          detail: { text: 'Presiona cualquier tecla para reproducir', type: 'info' }
        }));
        window.addEventListener('keydown', () => vid.play().catch(() => {}),
          { once: true, capture: true });
      });
    };

    vid.addEventListener('loadeddata', onReady, { once: true });

    // Iniciar la carga
    vid.load();
  },

  // ── Crear y asignar THREE.VideoTexture al mesh del plano ─────────────────
  // Accedemos directamente al material Three.js del a-plane en lugar de
  // pasar por el sistema de assets/src de A-Frame.

  _applyTexture() {
    const mesh = this.screenEl.getObject3D('mesh');
    if (!mesh) {
      // El mesh aún no existe (raro pero posible): reintentar en el próximo frame
      requestAnimationFrame(() => this._applyTexture());
      return;
    }

    // Limpiar textura anterior
    if (this._tex) { this._tex.dispose(); this._tex = null; }

    const tex = new THREE.VideoTexture(this._vid);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.format    = THREE.RGBAFormat;  // compatibilidad máxima
    // flipY=false porque el canvas WebGL ya tiene Y invertido respecto al video
    tex.flipY     = true;

    this._tex = tex;

    // Asignar al material del plano
    const mat = mesh.material;
    mat.map          = tex;
    mat.color.set(0xffffff);  // sin tinte de color; el video se ve tal cual
    mat.needsUpdate  = true;

    // THREE.VideoTexture necesita que se llame needsUpdate cada frame
    // mientras el video esté activo. Lo hacemos en tick().
    this._textureActive = true;
  },

  _setMeshBlack() {
    const mesh = this.screenEl.getObject3D('mesh');
    if (!mesh) return;
    mesh.material.map = null;
    mesh.material.color.set(0x000000);
    mesh.material.needsUpdate = true;
  },

  _clearTexture() {
    this._textureActive = false;
    if (this._tex) {
      this._tex.dispose();
      this._tex = null;
    }
  },

  _stopVideo() {
    this._clearTexture();
    const vid = this._vid;
    if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
    if (this.screenEl) {
      this.screenEl.setAttribute('visible', 'false');
      this._setMeshBlack();
    }
  },

  // ── Textos del pizarrón ───────────────────────────────────────────────────

  _buildBoardText() {
    const lines = [
      { id: 'b1', pos: '0 3.88 0.14', color: '#f0e070', width: '4.8', wc: 26 },
      { id: 'b2', pos: '0 3.28 0.14', color: '#e8f4c8', width: '4.6', wc: 34 },
      { id: 'b3', pos: '0 2.70 0.14', color: '#c0dcc0', width: '4.6', wc: 40 },
      { id: 'b4', pos: '0 2.15 0.14', color: '#90b890', width: '4.6', wc: 40 },
      { id: 'b5', pos: '0 1.58 0.14', color: '#a0c0d0', width: '4.6', wc: 36 },
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

  // ── Estados ───────────────────────────────────────────────────────────────

  _renderIdle() {
    this.state = 'idle';
    window.academiaOpen = false;
    this._stopVideo();
    this._showBoardText(true);

    const visited = LessonProgress.totalVisited();
    const total   = this.lessons.length;
    const filled  = total ? Math.round((visited / total) * 10) : 0;
    const bar     = '##########'.slice(0, filled) + '..........'.slice(0, 10 - filled);

    this._setText('b1', 'Academia LSEC',                        '#f0e070');
    this._setText('b2', `Senias vistas: ${visited} / ${total}`, '#9be89b');
    this._setText('b3', bar,                                     '#4a7a4a');
    this._setText('b4', '',                                      '#90b890');
    this._setText('b5',
      visited < total ? '[E] Entrar a la academia' : 'Completado! 🎓',
      visited < total ? '#a0d080' : '#f0e070');
  },

  _renderList() {
    this.state = 'list';
    window.academiaOpen = true;
    this._stopVideo();
    this._showBoardText(true);

    const VISIBLE = 4;
    const total   = this.lessons.length;
    const visited = LessonProgress.totalVisited();

    if (this.listIndex < this.listOffset)                this.listOffset = this.listIndex;
    if (this.listIndex >= this.listOffset + VISIBLE)     this.listOffset = this.listIndex - VISIBLE + 1;
    this.listOffset = Math.max(0, Math.min(this.listOffset, Math.max(0, total - VISIBLE)));

    this._setText('b1', `Lecciones  ${visited}/${total}`, '#f0e070');

    const ids = ['b2', 'b3', 'b4', 'b5'];
    for (let i = 0; i < VISIBLE; i++) {
      const idx = this.listOffset + i;
      if (idx >= total) { this._setText(ids[i], '', '#555'); continue; }
      const lesson = this.lessons[idx];
      const seen   = LessonProgress.isVisited(lesson.id);
      const sel    = idx === this.listIndex;
      this._setText(
        ids[i],
        `${sel ? '>>' : '  '} ${lesson.emoji} ${lesson.word}${seen ? ' OK' : ''}`,
        sel ? '#f0e070' : seen ? '#9be89b' : '#e8f4c8'
      );
    }
  },

  _renderLesson(idx) {
    this.state       = 'lesson';
    this.lessonIndex = idx;
    const lesson     = this.lessons[idx];
    LessonProgress.markVisited(lesson.id);

    // Ocultar textos — el video ocupa toda la pantalla
    this._showBoardText(false);

    if (lesson.videoId) {
      this._loadVideo(lesson.videoId);
    } else {
      // Sin video: mostrar texto de fallback
      this._stopVideo();
      this._showBoardText(true);
      this._setText('b1', `${lesson.emoji}  ${lesson.word}`, '#f0e070');
      this._setText('b2', lesson.description,                 '#c8e8c8');
      this._setText('b5', '[E/↓] Siguiente  [Esc] Lista',    '#a0c0d0');
    }

    if (LessonProgress.totalVisited() >= this.lessons.length) {
      setTimeout(() => showVictoryOverlay(this.lessons.length), 800);
    }
  },

  // ── Helpers ───────────────────────────────────────────────────────────────

  _showBoardText(visible) {
    const v = visible ? 'true' : 'false';
    Object.values(this.boardTexts).forEach(el => el.setAttribute('visible', v));
  },

  _setText(id, value, color) {
    const el = this.boardTexts[id];
    if (!el) return;
    if (el.getAttribute('value') !== value) el.setAttribute('value', value);
    if (color) el.setAttribute('color', color);
  },

  // ── Teclado ───────────────────────────────────────────────────────────────

  _onKey(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!this.isNearby) return;
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      if (this.state === 'list')   this._navigateList(dir);
      if (this.state === 'lesson') this._switchLesson(dir);
      return;
    }
    // Bloquear izq/der solo si el menú está abierto (no interrumpir movimiento normal)
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        this.isNearby && this.state !== 'idle') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    if (!this.isNearby) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this._handleEsc();
      return;
    }
    if (e.key === 'e' || e.key === 'E') {
      e.stopImmediatePropagation();
      this._handleE();
    }
  },

  _handleE() {
    switch (this.state) {
      case 'idle':   this._openList();                    break;
      case 'list':   this._renderLesson(this.listIndex);  break;
      case 'lesson': this._switchLesson(1);               break;
    }
  },

  _handleEsc() {
    if (this.state === 'lesson') { this._openList();   return; }
    if (this.state === 'list')   { this._renderIdle(); return; }
  },

  _openList() {
    window.academiaOpen = true;
    if (this.state === 'lesson') {
      this.listIndex  = this.lessonIndex;
      this.listOffset = Math.max(0, this.listIndex - 1);
    }
    this._renderList();
    window.dispatchEvent(new CustomEvent('game-message', {
      detail: { text: '↑↓ navegar   E ver lección   Esc salir', type: 'info' }
    }));
  },

  _navigateList(dir) {
    this.listIndex = Math.max(0, Math.min(this.listIndex + dir, this.lessons.length - 1));
    this._renderList();
  },

  _switchLesson(dir) {
    const next = this.lessonIndex + dir;
    if (next < 0 || next >= this.lessons.length) return;
    this._renderLesson(next);
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    // Marcar la textura de video como "necesita actualizar" cada frame
    // para que Three.js copie el fotograma actual del <video> a la GPU.
    // Sin esto el video se congela en el primer frame.
    if (this._textureActive && this._tex) {
      this._tex.needsUpdate = true;
    }

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
      window.academiaOpen = false;
      this._renderIdle();
    }
  },

  // ── Limpieza ──────────────────────────────────────────────────────────────

  remove() {
    this._stopVideo();
    window.removeEventListener('keydown', this._onKey, true);
    this._vid?.remove();
  },
});