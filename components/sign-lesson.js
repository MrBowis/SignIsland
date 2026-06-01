/**
 * sign-lesson.js
 * Sistema de lecciones de Lengua de Señas Española (LSE) para la Academia.
 *
 * - Todas las lecciones están hardcodeadas en data/world.json
 * - El progreso se guarda en localStorage
 * - Tecla [L] abre/cierra la academia cuando el jugador está cerca
 * - Componente A-Frame: <a-entity academia="range: 8">
 */

// ─── Datos de lecciones (cargados desde world.json o inline) ─────
// Se pueden sobrescribir si world.json está disponible
const DEFAULT_LESSONS = [
  {
    id: 1, word: 'Hablar', emoji: '🗣️',
    description: 'Mueve los dedos índice y medio simulando hablar cerca de la boca.',
    handshape: '☝️', movement: '🔁', location: '👄',
    youtubeId: 'S-cx-IiDUHg',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=hablar',
    options: ['Hablar', 'Escuchar', 'Mirar', 'Gritar'], correct: 0,
  },
  {
    id: 2, word: '¿Cómo te sientes?', emoji: '😊',
    description: 'Lleva la mano al pecho haciendo un movimiento circular suave en la zona del corazón.',
    handshape: '🤚', movement: '🔄', location: '🫁',
    youtubeId: 'L0Dp2xZB9-U',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=como-te-sientes',
    options: ['¿Dónde vives?', '¿Qué hora es?', '¿Cómo te sientes?', '¿Quién eres?'], correct: 2,
  },
  {
    id: 3, word: '¿Cómo está?', emoji: '👋',
    description: 'Mueve la mano de forma abierta y describe el gesto de saludo formal.',
    handshape: '🤚', movement: '↔️', location: '🙂',
    youtubeId: 'aB4nMgDQyes',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=como-esta',
    options: ['¿Cómo está?', 'Hasta luego', 'Buenos días', 'Por favor'], correct: 0,
  },
  {
    id: 4, word: 'Hace tiempo que no te veo', emoji: '⏳',
    description: 'Seña que expresa que ha pasado mucho tiempo desde el último encuentro.',
    handshape: '🤚', movement: '➡️', location: '🙂',
    youtubeId: 'NnXpTwGFhv0',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=hace-tiempo-que-no-te-veo',
    options: ['Nos vemos mañana', 'Hace tiempo que no te veo', 'Adiós', 'Mucho gusto'], correct: 1,
  },
  {
    id: 5, word: '¿Qué tal?', emoji: '🤙',
    description: 'Gesto informal de saludo cotidiano en LSEC.',
    handshape: '🤙', movement: '↔️', location: '🙂',
    youtubeId: 'gr4wOlOs4t4',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=que-tal',
    options: ['Hola', 'Hasta mañana', 'Por favor', '¿Qué tal?'], correct: 3,
  },
  {
    id: 6, word: 'Buenas noches', emoji: '🌙',
    description: 'Cruza los brazos de forma que represente el atardecer o la noche.',
    handshape: '🤚🤚', movement: '🔄', location: '🫁',
    youtubeId: 'RocuYZgMKlQ',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=buenas-noches',
    options: ['Buenos días', 'Buenas noches', 'Buenas tardes', 'Hola'], correct: 1,
  },
  {
    id: 7, word: 'Hacer', emoji: '🛠️',
    description: 'Mueve los puños uno sobre otro imitando la acción de construir o modelar.',
    handshape: '✊✊', movement: '⬇️', location: '🫁',
    youtubeId: 'Btj3-tWetf0',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=hacer',
    options: ['Hacer', 'Romper', 'Destruir', 'Pensar'], correct: 0,
  },
  {
    id: 8, word: 'Dar', emoji: '🤲',
    description: 'Extiende ambas manos con las palmas abiertas hacia adelante en señal de entrega.',
    handshape: '🤚🤚', movement: '➡️', location: '🫁',
    youtubeId: 'UIkQU2O5ktc',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=dar',
    options: ['Quitar', 'Recibir', 'Dar', 'Robar'], correct: 2,
  },
  {
    id: 9, word: 'Saber', emoji: '🧠',
    description: 'Toca el lateral de la frente con el dedo índice expresando conocimiento.',
    handshape: '☝️', movement: '⬇️', location: '🙂',
    youtubeId: 'ffpkmgyQGfo',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=saber',
    options: ['Olvidar', 'Saber', 'Ignorar', 'Dudar'], correct: 1,
  },
  {
    id: 10, word: 'Nadar', emoji: '🏊',
    description: 'Simula brazadas de natación en el aire con ambos brazos de forma alternada.',
    handshape: '🤚🤚', movement: '🔁', location: '🫁',
    youtubeId: 'GpX-lgGir1A',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=nadar',
    options: ['Correr', 'Nadar', 'Volar', 'Saltar'], correct: 1,
  },
  {
    id: 11, word: 'Feliz', emoji: '😄',
    description: 'Coloca ambas manos en el pecho haciendo movimientos rápidos hacia arriba con una sonrisa.',
    handshape: '🤚🤚', movement: '⬆️', location: '🫁',
    youtubeId: 'cUs97izzUpk',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=feliz',
    options: ['Triste', 'Enojado', 'Feliz', 'Asustado'], correct: 2,
  },
  {
    id: 12, word: 'Fácil', emoji: '👌',
    description: 'Pasa los dedos de la mano por la frente con un movimiento ágil y ligero.',
    handshape: '🤚', movement: '➡️', location: '🙂',
    youtubeId: 'OAPj7nxv4iE',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=facil',
    options: ['Difícil', 'Fácil', 'Imposible', 'Largo'], correct: 1,
  },
  {
    id: 13, word: 'Nada', emoji: '💨',
    description: 'Cruza las manos abiertas frente a ti y sepáralas hacia afuera expresando ausencia.',
    handshape: '🤚🤚', movement: '↔️', location: '🫁',
    youtubeId: 'Nw6w7-8bSKs',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=nada',
    options: ['Todo', 'Algo', 'Nada', 'Mucho'], correct: 2,
  },
  {
    id: 14, word: '¿Dónde?', emoji: '📍',
    description: 'Coloca ambas manos abiertas con palmas hacia arriba y muévelas levemente de lado a lado.',
    handshape: '🤚🤚', movement: '↔️', location: '🫁',
    youtubeId: 'VbSuBUJzyIw',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=donde',
    options: ['¿Cuándo?', '¿Dónde?', '¿Cómo?', '¿Qué?'], correct: 1,
  },
  {
    id: 15, word: '¿Cuándo?', emoji: '📅',
    description: 'Mueve el dedo índice sobre los otros simulando el conteo de tiempo.',
    handshape: '☝️', movement: '🔁', location: '🫁',
    youtubeId: 'BVYQn8Z8mQk',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=cuando',
    options: ['¿Cuándo?', '¿Por qué?', '¿Quién?', '¿Cuánto?'], correct: 0,
  },
  {
    id: 16, word: '¿Qué?', emoji: '❓',
    description: 'Extiende el índice y haz un movimiento rápido de rotación o vibración leve.',
    handshape: '☝️', movement: '🔄', location: '🫁',
    youtubeId: '_NV7UPduH3E',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=que',
    options: ['¿Dónde?', '¿Cómo?', '¿Qué?', '¿Quién?'], correct: 2,
  },
  {
    id: 17, word: '¿Cuál?', emoji: '👉',
    description: 'Señala alternativamente simulando elegir entre dos opciones en LSEC.',
    handshape: '☝️☝️', movement: '↔️', location: '🫁',
    youtubeId: 'SSKlBHbEIJ8',
    source: 'Diccionario Gabriel Román — CONADIS Ecuador',
    sourceUrl: 'http://www.plataformaconadis.gob.ec/~platafor/diccionario/?st_kb=cual',
    options: ['¿Cómo?', '¿Cuál?', '¿Cuándo?', '¿Por qué?'], correct: 1,
  }
];

// ─── Progreso del jugador ─────────────────────────
const LessonProgress = {
  _data: { completed: [], stars: {}, currentLesson: 0 },

  load() {
    try {
      const saved = localStorage.getItem('signisland_lessons');
      if (saved) this._data = { ...this._data, ...JSON.parse(saved) };
    } catch (_) { }
  },

  save() {
    try {
      localStorage.setItem('signisland_lessons', JSON.stringify(this._data));
    } catch (_) { }
  },

  complete(lessonId, correct, totalCount) {
    if (!this._data.completed.includes(lessonId)) {
      this._data.completed.push(lessonId);
    }
    this._data.stars[lessonId] = correct ? 3 : 1;
    if (this._data.currentLesson < lessonId) {
      this._data.currentLesson = lessonId;
    }
    this.save();
    window.dispatchEvent(new CustomEvent('lessons-changed', {
      detail: { completed: this.totalCompleted(), total: totalCount }
    }));
  },

  reset(totalCount) {
    this._data = { completed: [], stars: {}, currentLesson: 0 };
    this.save();
    window.dispatchEvent(new CustomEvent('lessons-changed', {
      detail: { completed: 0, total: totalCount }
    }));
  },

  isCompleted(id) { return this._data.completed.includes(id); },
  getStars(id) { return this._data.stars[id] || 0; },
  totalCompleted() { return this._data.completed.length; },
};

LessonProgress.load();

// ─── PANTALLA DE VICTORIA (CSS puro) ───────────────
function showVictoryOverlay() {
  if (document.getElementById('victory-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'victory-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(10, 22, 40, 0.96);
    backdrop-filter: blur(12px);
    z-index: 9999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;
    color: #fff;
    text-align: center;
    padding: 20px;
    animation: fadeIn 0.4s ease;
  `;
  
  const totalMonedas = window.Inventory ? window.Inventory._data.monedas : 0;
  
  overlay.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1b2845, #090e1a);
      border: 1px solid rgba(126, 232, 162, 0.3);
      box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(126, 232, 162, 0.15);
      border-radius: 28px;
      padding: 40px 30px;
      max-width: 450px; width: 90%;
      animation: zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    ">
      <div style="font-size: 5.5rem; margin-bottom: 20px; animation: bounce 2s infinite;">🎓</div>
      <h1 style="color: #7ee8a2; font-size: 1.8rem; font-weight: 800; margin-bottom: 12px; letter-spacing: 0.5px;">
        ¡Completaste el curso de LSEC!
      </h1>
      <p style="color: #ccc; font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;">
        Has aprendido las señas y el abecedario de la <strong>Lengua de Señas Ecuatoriana</strong> en SignIsland. ¡Felicitaciones!
      </p>
      
      <div style="
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 30px;
        display: flex; justify-content: space-around;
      ">
        <div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #38bdf8;">${LessonProgress.totalCompleted()}</div>
          <div style="font-size: 0.72rem; color: #888; text-transform: uppercase; margin-top: 4px;">Lecciones</div>
        </div>
        <div style="border-left: 1px solid rgba(255,255,255,0.1); height: 40px;"></div>
        <div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #f1c40f;">💰 ${totalMonedas}</div>
          <div style="font-size: 0.72rem; color: #888; text-transform: uppercase; margin-top: 4px;">Fortuna</div>
        </div>
      </div>
      
      <button id="victory-close-btn" style="
        background: linear-gradient(90deg, #7ee8a2, #38bdf8);
        border: none;
        color: #0a1628;
        font-size: 1rem; font-weight: 800;
        padding: 14px 36px;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);
      " onmouseover="this.style.opacity=0.9; this.style.transform='scale(1.03)';" onmouseout="this.style.opacity=1; this.style.transform='scale(1)';">
        ¡Seguir Explorando! 🏝️
      </button>
    </div>
  `;
  
  if (!document.getElementById('victory-animations')) {
    const animStyle = document.createElement('style');
    animStyle.id = 'victory-animations';
    animStyle.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes zoomIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(animStyle);
  }
  
  document.body.appendChild(overlay);
  
  document.getElementById('victory-close-btn').addEventListener('click', () => {
    overlay.remove();
  });
}

// ─── Componente A-Frame Academia ─────────────────
AFRAME.registerComponent('academia', {
  schema: {
    range: { type: 'number', default: 8 },
  },

  init() {
    this.isOpen = false;
    this.isNearby = false;
    this.playerEl = document.querySelector('#player');
    this.lessons = DEFAULT_LESSONS;

    // Intentar cargar lecciones desde world.json
    fetch('data/world.json')
      .then(r => r.json())
      .then(d => { if (d.lessons?.length) this.lessons = d.lessons; })
      .catch(() => { });

    this._buildPanel();

    this._onKey = this._onKey.bind(this);
    window.addEventListener('keydown', this._onKey);
  },

  _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'academia-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="acad-overlay" id="acad-overlay"></div>
      <div class="acad-modal" id="acad-modal">
        <!-- PANTALLA: LISTA DE LECCIONES -->
        <div id="acad-screen-list">
          <div class="acad-header" style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#7ee8a2; font-weight:800; font-size:1.1rem; letter-spacing:0.5px;">📚 Academia de Señas (LSEC)</span>
            <button class="acad-close" id="acad-close-btn">✕</button>
          </div>
          <div class="acad-progress-bar-wrap">
            <div class="acad-progress-bar" id="acad-progress-bar"></div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 18px 4px;">
            <div class="acad-progress-label" id="acad-progress-label" style="padding:0; text-align:left;"></div>
            <button id="acad-reset-btn" style="background:transparent; border:none; color:#e74c3c; font-size:0.75rem; cursor:pointer; font-weight:600; padding:2px 8px; border-radius:12px; border:1px solid rgba(231,76,60,0.2); transition:all 0.2s;">🔄 Reiniciar</button>
          </div>
          <div class="acad-lesson-grid" id="acad-lesson-grid"></div>
        </div>

        <!-- PANTALLA: LECCIÓN ACTIVA -->
        <div id="acad-screen-lesson" style="display:none">
          <div class="acad-header">
            <button class="acad-back" id="acad-back-btn">← Volver</button>
            <span id="acad-lesson-title">Lección 1</span>
            <span id="acad-lesson-num"></span>
          </div>
          <div class="acad-lesson-body">
            <div class="acad-sign-display" id="acad-sign-display"></div>
            <div class="acad-sign-word"    id="acad-sign-word"></div>
            <div class="acad-sign-desc"    id="acad-sign-desc"></div>
            <div class="acad-sign-meta"    id="acad-sign-meta"></div>
            <div class="acad-question">¿Cuál es esta seña?</div>
            <div class="acad-options"      id="acad-options"></div>
            <div class="acad-feedback"     id="acad-feedback"></div>
            <button class="acad-next-btn"  id="acad-next-btn" style="display:none">Siguiente lección →</button>
          </div>
        </div>
      </div>
    `;

    this._injectStyles();
    document.body.appendChild(panel);
    this.panel = panel;

    document.getElementById('acad-close-btn').addEventListener('click', () => this.close());
    document.getElementById('acad-overlay').addEventListener('click', () => this.close());
    document.getElementById('acad-back-btn').addEventListener('click', () => this._showList());
    document.getElementById('acad-next-btn').addEventListener('click', () => this._nextLesson());

    // Botón de reset
    document.getElementById('acad-reset-btn').addEventListener('click', () => {
      if (confirm('¿Seguro que deseas reiniciar todo tu progreso en SignIsland?')) {
        LessonProgress.reset(this.lessons.length);
        this._showList();
        window.dispatchEvent(new CustomEvent('game-message', {
          detail: { text: '🔄 Progreso reiniciado', type: 'warn' }
        }));
      }
    });
  },

  _injectStyles() {
    if (document.getElementById('acad-styles')) return;
    const s = document.createElement('style');
    s.id = 'acad-styles';
    s.textContent = `
      .acad-overlay {
        position:fixed; inset:0;
        background:rgba(0,0,0,0.6);
        backdrop-filter:blur(5px);
        z-index:600;
        animation:fadeIn 0.2s ease;
      }
      .acad-modal {
        position:fixed; top:50%; left:50%;
        transform:translate(-50%,-50%);
        background:#0f0f23;
        border:1px solid rgba(255,255,255,0.12);
        border-radius:24px;
        width:500px; max-width:94vw;
        max-height:88vh; overflow-y:auto;
        z-index:601;
        animation:slideUp 0.25s ease;
        font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;
        color:#fff;
      }
      .acad-header {
        display:flex; align-items:center; justify-content:space-between;
        padding:18px 20px 14px;
        border-bottom:1px solid rgba(255,255,255,0.08);
        font-size:1.05rem; font-weight:700;
        background:linear-gradient(135deg,#1a1a3e,#0f0f23);
        border-radius:24px 24px 0 0;
      }
      .acad-close, .acad-back {
        background:rgba(255,255,255,0.08); border:none; color:#fff;
        padding:5px 12px; border-radius:20px; cursor:pointer; font-size:0.85rem;
        transition:background 0.2s;
      }
      .acad-close:hover, .acad-back:hover { background:rgba(255,255,255,0.18); }
      .acad-progress-bar-wrap {
        height:4px; background:rgba(255,255,255,0.08); margin:0;
      }
      .acad-progress-bar {
        height:100%; background:linear-gradient(90deg,#7ee8a2,#38bdf8);
        transition:width 0.4s ease; border-radius:0 2px 2px 0;
      }
      .acad-progress-label {
        text-align:center; font-size:0.72rem; color:#888;
        padding:8px 0 4px; letter-spacing:0.5px;
      }
      .acad-lesson-grid {
        display:grid; grid-template-columns:repeat(2,1fr); gap:10px;
        padding:14px 18px 20px;
      }
      .acad-lesson-card {
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.07);
        border-radius:14px; padding:14px 16px;
        cursor:pointer; transition:all 0.2s;
        display:flex; align-items:center; gap:12px;
      }
      .acad-lesson-card:hover       { background:rgba(255,255,255,0.1); transform:translateY(-2px); }
      .acad-lesson-card.completed   { border-color:#27ae6060; background:rgba(39,174,96,0.08); }
      .acad-lesson-card.locked      { opacity:0.4; cursor:not-allowed; pointer-events:none; }
      .acad-card-emoji  { font-size:2rem; }
      .acad-card-info   { flex:1; }
      .acad-card-word   { font-weight:700; font-size:0.95rem; }
      .acad-card-stars  { font-size:0.75rem; color:#f1c40f; margin-top:2px; }
      .acad-card-badge  { font-size:0.65rem; color:#27ae60; }

      /* Pantalla de lección */
      .acad-lesson-body { padding:20px 22px 24px; }
      .acad-sign-display {
        font-size:5rem; text-align:center;
        background:rgba(255,255,255,0.04);
        border-radius:16px;
        margin-bottom:12px;
        border:1px solid rgba(255,255,255,0.06);
        animation:pulse 2.5s ease-in-out infinite;
        height:220px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      }
      @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      .acad-sign-word {
        text-align:center; font-size:1.5rem; font-weight:800;
        color:#7ee8a2; margin-bottom:6px;
      }
      .acad-sign-desc {
        text-align:center; font-size:0.85rem; color:#bbb;
        line-height:1.5; margin-bottom:10px;
      }
      .acad-sign-meta {
        text-align:center; font-size:0.78rem; color:#888;
        margin-bottom:18px; letter-spacing:0.5px;
      }
      .acad-question {
        font-size:0.8rem; color:#aaa; text-transform:uppercase;
        letter-spacing:1px; margin-bottom:10px;
      }
      .acad-options { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .acad-option {
        background:rgba(255,255,255,0.06);
        border:2px solid rgba(255,255,255,0.1);
        color:#fff; border-radius:12px; padding:12px;
        cursor:pointer; font-size:0.95rem; font-weight:600;
        transition:all 0.18s; text-align:center;
      }
      .acad-option:hover   { background:rgba(255,255,255,0.12); border-color:rgba(255,255,255,0.25); }
      .acad-option.correct { background:rgba(39,174,96,0.3); border-color:#27ae60; color:#7ee8a2; }
      .acad-option.wrong   { background:rgba(192,57,43,0.3);  border-color:#c0392b; color:#e74c3c; }
      .acad-option:disabled{ pointer-events:none; }
      .acad-feedback {
        margin-top:16px; text-align:center; font-size:1rem;
        font-weight:700; min-height:28px;
      }
      .acad-feedback.ok  { color:#7ee8a2; }
      .acad-feedback.err { color:#e74c3c; }
      .acad-next-btn {
        display:block; margin:18px auto 0;
        background:linear-gradient(135deg,#7ee8a2,#38bdf8);
        color:#0f0f23; border:none; border-radius:12px;
        padding:12px 28px; font-size:0.95rem; font-weight:800;
        cursor:pointer; transition:opacity 0.2s, transform 0.1s;
      }
      .acad-next-btn:hover { opacity:0.9; transform:scale(1.03); }
    `;
    document.head.appendChild(s);
  },

  // ── Abrir/cerrar ──────────────────────────────
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.panel.style.display = 'block';
    this._showList();

    const player = document.querySelector('#player');
    if (player) player.setAttribute('movement-controls', 'enabled', false);
    document.exitPointerLock?.();
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panel.style.display = 'none';
    const player = document.querySelector('#player');
    if (player) player.setAttribute('movement-controls', 'enabled', true);
  },

  // ── Pantalla: lista de lecciones ─────────────
  _showList() {
    document.getElementById('acad-screen-list').style.display = 'block';
    document.getElementById('acad-screen-lesson').style.display = 'none';

    const total = this.lessons.length;
    const completed = LessonProgress.totalCompleted();
    const pct = total ? Math.round((completed / total) * 100) : 0;

    document.getElementById('acad-progress-bar').style.width = `${pct}%`;
    document.getElementById('acad-progress-label').textContent =
      `${completed} / ${total} lecciones completadas`;

    const grid = document.getElementById('acad-lesson-grid');
    grid.innerHTML = '';

    this.lessons.forEach((lesson, idx) => {
      const done = LessonProgress.isCompleted(lesson.id);
      const stars = LessonProgress.getStars(lesson.id);
      const locked = idx > 0 && !LessonProgress.isCompleted(this.lessons[idx - 1].id);

      const card = document.createElement('div');
      card.className = `acad-lesson-card ${done ? 'completed' : ''} ${locked ? 'locked' : ''}`;
      card.innerHTML = `
        <span class="acad-card-emoji">${lesson.emoji}</span>
        <div class="acad-card-info">
          <div class="acad-card-word">${lesson.word}</div>
          <div class="acad-card-stars">${done ? '⭐'.repeat(stars) : locked ? '🔒 Bloqueada' : '▶ Jugar'}</div>
        </div>
      `;
      if (!locked) {
        card.addEventListener('click', () => this._startLesson(lesson));
      }
      grid.appendChild(card);
    });
  },

  // ── Pantalla: lección activa ──────────────────
  _startLesson(lesson) {
    this.currentLesson = lesson;
    this.answered = false;

    document.getElementById('acad-screen-list').style.display = 'none';
    document.getElementById('acad-screen-lesson').style.display = 'block';

    document.getElementById('acad-lesson-title').textContent =
      `Lección ${lesson.id} — ${lesson.word}`;

    const display = document.getElementById('acad-sign-display');
    if (lesson.youtubeId) {
      display.innerHTML = `
        <iframe
          src="https://www.youtube-nocookie.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1&controls=1"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          style="width: 100%; height: 100%; border: 0; display: block;"
        ></iframe>
      `;
      display.style.background = '#000';
      display.style.border = '1px solid rgba(255,255,255,0.1)';
      display.style.animation = 'none';
    } else {
      display.innerHTML = lesson.emoji;
      display.style.fontSize = '5rem';
      display.style.background = 'rgba(255,255,255,0.04)';
      display.style.border = '1px solid rgba(255,255,255,0.06)';
      display.style.animation = 'pulse 2.5s ease-in-out infinite';
    }

    const existingCredit = document.getElementById('acad-sign-credit');
    if (existingCredit) existingCredit.remove();

    if (lesson.source) {
      const credit = document.createElement('div');
      credit.id = 'acad-sign-credit';
      credit.style.cssText = 'text-align:center; font-size:0.65rem; color:#888; margin-top:6px;';
      credit.innerHTML = `Fuente: <a href="${lesson.sourceUrl}" target="_blank" style="color:#555; text-decoration: underline;">${lesson.source}</a>`;
      display.after(credit);
    }

    document.getElementById('acad-sign-word').textContent = lesson.word;
    document.getElementById('acad-sign-desc').textContent = lesson.description;

    // Meta info si existe
    const meta = [];
    if (lesson.handshape) meta.push(`Forma: ${lesson.handshape}`);
    if (lesson.movement) meta.push(`Movimiento: ${lesson.movement}`);
    if (lesson.location) meta.push(`Lugar: ${lesson.location}`);
    document.getElementById('acad-sign-meta').textContent = meta.join('  ·  ');

    document.getElementById('acad-feedback').textContent = '';
    document.getElementById('acad-feedback').className = 'acad-feedback';
    document.getElementById('acad-next-btn').style.display = 'none';

    // Renderizar opciones en orden aleatorio
    const optionsEl = document.getElementById('acad-options');
    optionsEl.innerHTML = '';
    const shuffled = lesson.options
      .map((opt, i) => ({ opt, isCorrect: i === lesson.correct }))
      .sort(() => Math.random() - 0.5);

    shuffled.forEach(({ opt, isCorrect }) => {
      const btn = document.createElement('button');
      btn.className = 'acad-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => this._answer(btn, isCorrect, lesson));
      optionsEl.appendChild(btn);
    });
  },

  _answer(btn, isCorrect, lesson) {
    if (this.answered) return;
    this.answered = true;

    // Deshabilitar todos los botones
    document.querySelectorAll('.acad-option').forEach(b => b.setAttribute('disabled', true));

    const feedback = document.getElementById('acad-feedback');
    const nextBtn = document.getElementById('acad-next-btn');

    if (isCorrect) {
      btn.classList.add('correct');
      feedback.textContent = '⭐ ¡Correcto! Bien hecho 🤝';
      feedback.className = 'acad-feedback ok';

      LessonProgress.complete(lesson.id, true, this.lessons.length);

      // Recompensa: monedas por completar lección
      if (window.Inventory) {
        window.Inventory._data.monedas += 10;
        window.Inventory.save();
        window.Inventory._notify();
        window.dispatchEvent(new CustomEvent('game-message', {
          detail: { text: '+10 💰 ¡Lección completada!', type: 'gold' }
        }));
      }
    } else {
      btn.classList.add('wrong');
      // Mostrar la correcta
      document.querySelectorAll('.acad-option').forEach(b => {
        const idx = lesson.options.indexOf(b.textContent);
        if (idx === lesson.correct) b.classList.add('correct');
      });
      feedback.textContent = `❌ Era "${lesson.options[lesson.correct]}" — ¡Inténtalo de nuevo!`;
      feedback.className = 'acad-feedback err';
      LessonProgress.complete(lesson.id, false, this.lessons.length);
    }

    nextBtn.style.display = 'block';

    // Verificar si se completaron todas las lecciones
    if (LessonProgress.totalCompleted() >= this.lessons.length) {
      setTimeout(() => {
        this.close();
        showVictoryOverlay();
      }, 1500);
    }
  },

  // (Secciones de abecedario de señas y pestañas eliminadas)

  // ── Tecla L ───────────────────────────────────
  _onKey(e) {
    if (e.key !== 'l' && e.key !== 'L') return;
    if (this.isNearby) {
      this.isOpen ? this.close() : this.open();
    }
  },

  tick() {
    if (!this.playerEl) return;
    const pPos = new THREE.Vector3();
    const ePos = new THREE.Vector3();
    this.playerEl.object3D.getWorldPosition(pPos);
    this.el.object3D.getWorldPosition(ePos);

    const dist = pPos.distanceTo(ePos);
    const wasNearby = this.isNearby;
    this.isNearby = dist < this.data.range;

    if (this.isNearby && !wasNearby) {
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: '🏛️ Presiona [L] para entrar a la Academia', type: 'info' }
      }));
    }
    if (!this.isNearby && wasNearby && this.isOpen) {
      this.close();
    }
  },

  remove() {
    window.removeEventListener('keydown', this._onKey);
    if (this.panel) this.panel.remove();
  },
});
