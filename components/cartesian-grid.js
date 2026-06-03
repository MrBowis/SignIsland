/**
 * cartesian-grid.js — Plano cartesiano de referencia.
 *
 * Dibuja una rejilla sobre el plano XZ (suelo, y = 0), los ejes X/Y/Z y
 * etiquetas rojas en bold con las coordenadas (X, Z) en cada intersección
 * marcada (cada `labelStep` unidades).
 *   • Eje X → rojo   • Eje Y → verde   • Eje Z → azul
 *
 * Uso:
 *   <a-entity id="grid" cartesian-grid visible="true"></a-entity>
 *
 * Alternar visibilidad desde el código:
 *   toggleGrid()        → invierte el estado
 *   toggleGrid(true)    → mostrar
 *   toggleGrid(false)   → ocultar
 * También con la tecla G.
 *
 * Parámetros del componente:
 *   size        lado de la rejilla en metros           (def. 100)
 *   divisions   nº de celdas                           (def. 100)
 *   colorCenter color de las líneas centrales          (def. #7ee8a2)
 *   colorGrid   color de las líneas secundarias        (def. #5b6b7a)
 *   axes        dibujar ejes X/Y/Z                     (def. true)
 *   axesLength  longitud de los ejes                   (def. 12)
 *   opacity     opacidad de la rejilla                 (def. 0.45)
 *   labelStep   unidades entre etiquetas de coordenada (def. 5)
 *   labelSize   tamaño del sprite de etiqueta en metros(def. 0.9)
 */
AFRAME.registerComponent('cartesian-grid', {
  schema: {
    size:        { type: 'number',  default: 250 },
    divisions:   { type: 'number',  default: 250 },
    colorCenter: { type: 'color',   default: '#7ee8a2' },
    colorGrid:   { type: 'color',   default: '#5b6b7a' },
    axes:        { type: 'boolean', default: true },
    axesLength:  { type: 'number',  default: 12 },
    opacity:     { type: 'number',  default: 0.45 },
    labelStep:   { type: 'number',  default: 5 },
    labelSize:   { type: 'number',  default: 0.9 },
  },

  init() {
    const d = this.data;

    // Rejilla
    const grid = new THREE.GridHelper(
      d.size, d.divisions,
      new THREE.Color(d.colorCenter), new THREE.Color(d.colorGrid));
    grid.material.transparent = true;
    grid.material.opacity = d.opacity;
    grid.position.y = 0.02;
    this.el.setObject3D('grid', grid);

    // Ejes
    if (d.axes) {
      this.el.setObject3D('axes', new THREE.AxesHelper(d.axesLength));
    }

    // Etiquetas de coordenadas
    const group = new THREE.Group();
    this._buildLabels(group);
    this.el.setObject3D('labels', group);
  },

  _buildLabels(group) {
    const d    = this.data;
    const half = d.size / 2;
    const step = d.labelStep > 0 ? d.labelStep : 5;

    for (let x = -half; x <= half; x += step) {
      for (let z = -half; z <= half; z += step) {
        const sprite = this._makeSprite(
          `(${x}, ${z})`, d.labelSize);
        // Y = 0.12 → justo sobre la rejilla para no solaparse con el suelo
        sprite.position.set(x, 0.12, z);
        group.add(sprite);
      }
    }
  },

  /**
   * Crea un THREE.Sprite con el texto dado dibujado en rojo bold.
   * spriteSize: tamaño del sprite en metros del mundo.
   */
  _makeSprite(text, spriteSize) {
    const CANVAS_W = 256;
    const CANVAS_H = 64;
    const canvas = document.createElement('canvas');
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');

    // Fondo semitransparente para legibilidad
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const pad = 6;
    ctx.beginPath();
    ctx.roundRect
      ? ctx.roundRect(pad, pad, CANVAS_W - pad * 2, CANVAS_H - pad * 2, 8)
      : ctx.rect(pad, pad, CANVAS_W - pad * 2, CANVAS_H - pad * 2);
    ctx.fill();

    // Texto: rojo, bold
    ctx.font      = `bold 24px Arial, sans-serif`;
    ctx.fillStyle = '#ff2222';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,    // siempre visible sobre la rejilla
    });
    const sprite = new THREE.Sprite(mat);
    // Mantener la proporción 4:1 del canvas
    sprite.scale.set(spriteSize * (CANVAS_W / CANVAS_H), spriteSize, 1);
    return sprite;
  },

  remove() {
    ['grid', 'axes', 'labels'].forEach((key) => {
      if (this.el.getObject3D(key)) this.el.removeObject3D(key);
    });
  },
});

/* ─── API pública ─────────────────────────────────────────────────────────── */
window.toggleGrid = function (force) {
  const el = document.getElementById('grid');
  if (!el) return;
  const visible = (typeof force === 'boolean') ? force : !el.getAttribute('visible');
  el.setAttribute('visible', visible);
  return visible;
};

/* Atajo: tecla G */
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyG') return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
  window.toggleGrid();
});
