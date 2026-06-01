/**
 * farming.js
 * Componente A-Frame para farmear recursos (roca, madera, pez).
 *
 * Uso en HTML:
 *   <a-entity farmeable="type: roca; amount: 1; cooldown: 4000">
 *
 * Propiedades:
 *   - type     : 'roca' | 'madera' | 'pez'
 *   - amount   : cuánto se recolecta por clic (default 1)
 *   - cooldown : ms de espera entre recolecciones (default 4000)
 *   - range    : distancia máxima al jugador para poder farmear (default 5)
 */

// Datos de cada tipo de recurso
const RESOURCE_DATA = {
  roca: { icon: '🪨', color: '#95a5a6', label: 'Roca', particleColor: '#bdc3c7' },
  madera: { icon: '🪵', color: '#8B4513', label: 'Madera', particleColor: '#a0522d' },
  pez: { icon: '🐟', color: '#2980b9', label: 'Pez', particleColor: '#5dade2' },
};

AFRAME.registerComponent('farmeable', {
  schema: {
    type: { type: 'string', default: 'roca' },
    amount: { type: 'number', default: 1 },
    cooldown: { type: 'number', default: 4000 },
    range: { type: 'number', default: 5 },
  },

  init() {
    this.ready = true;   // si está disponible para farmear
    this.playerEl = document.querySelector('#player');
    this.data_res = RESOURCE_DATA[this.data.type] || RESOURCE_DATA.roca;

    // Hacer el elemento clickeable
    this.el.setAttribute('class', 'farmeable-obj');
    this.el.setAttribute('cursor-listener', '');

    // Tooltip flotante
    this._buildTooltip();

    // Click handler
    this._onClick = this._onClick.bind(this);
    this.el.addEventListener('click', this._onClick);

    // Hover visual
    this.el.addEventListener('mouseenter', () => this._onHover(true));
    this.el.addEventListener('mouseleave', () => this._onHover(false));
  },

  _buildTooltip() {
    const tip = document.createElement('a-entity');
    tip.setAttribute('position', '0 2.2 0');
    tip.setAttribute('visible', false);

    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '1.2');
    bg.setAttribute('height', '0.45');
    bg.setAttribute('color', '#111');
    bg.setAttribute('opacity', '0.75');
    bg.setAttribute('shader', 'flat');
    tip.appendChild(bg);

    const txt = document.createElement('a-text');
    txt.setAttribute('value', `${this.data_res.icon} [F] Recolectar`);
    txt.setAttribute('align', 'center');
    txt.setAttribute('color', '#fff');
    txt.setAttribute('width', '2.2');
    txt.setAttribute('position', '0 0 0.01');
    tip.appendChild(txt);

    this.el.appendChild(tip);
    this.tooltip = tip;
    this.tooltipText = txt;
  },

  _onHover(entering) {
    if (!this.tooltip) return;
    if (!this.ready) return;
    // Solo mostrar tooltip si el jugador está cerca
    if (entering && this._isPlayerNear()) {
      this.tooltip.setAttribute('visible', true);
    } else {
      this.tooltip.setAttribute('visible', false);
    }
  },

  _isPlayerNear() {
    if (!this.playerEl) return false;
    const pPos = new THREE.Vector3();
    const ePos = new THREE.Vector3();
    this.playerEl.object3D.getWorldPosition(pPos);
    this.el.object3D.getWorldPosition(ePos);
    return pPos.distanceTo(ePos) <= this.data.range;
  },

  _onClick() {
    if (!this.ready) {
      this._showCooldownFeedback();
      return;
    }
    if (!this._isPlayerNear()) {
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: `Acércate más para recolectar ${this.data_res.icon}`, type: 'warn' }
      }));
      return;
    }
    this._collect();
  },

  _collect() {
    this.ready = false;
    this.tooltip.setAttribute('visible', false);

    // Emitir partículas visuales
    this._spawnParticles();

    // Añadir recurso al inventario
    window.dispatchEvent(new CustomEvent('inventory-add', {
      detail: { type: this.data.type, amount: this.data.amount }
    }));

    // Feedback visual: encogerse y oscurecerse
    this.el.setAttribute('animation__collect', {
      property: 'scale',
      from: '1 1 1',
      to: '0.85 0.85 0.85',
      dur: 200,
      easing: 'easeOutQuad',
    });

    // Iniciar cooldown visual con barra
    this._startCooldownBar();

    // Restaurar después del cooldown
    setTimeout(() => {
      this.ready = true;
      this.el.setAttribute('animation__restore', {
        property: 'scale',
        from: '0.85 0.85 0.85',
        to: '1 1 1',
        dur: 300,
        easing: 'easeOutBack',
      });
    }, this.data.cooldown);
  },

  _spawnParticles() {
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('a-sphere');
      p.setAttribute('radius', 0.08 + Math.random() * 0.08);
      p.setAttribute('color', this.data_res.particleColor);
      p.setAttribute('shader', 'flat');

      // Posición inicial en el objeto
      const worldPos = new THREE.Vector3();
      this.el.object3D.getWorldPosition(worldPos);
      p.setAttribute('position', `${worldPos.x} ${worldPos.y + 1} ${worldPos.z}`);

      const dx = (Math.random() - 0.5) * 3;
      const dy = 1.5 + Math.random() * 2;
      const dz = (Math.random() - 0.5) * 3;

      document.querySelector('a-scene').appendChild(p);

      p.setAttribute('animation__fly', {
        property: 'position',
        to: `${worldPos.x + dx} ${worldPos.y + dy} ${worldPos.z + dz}`,
        dur: 600 + Math.random() * 300,
        easing: 'easeOutQuad',
      });
      p.setAttribute('animation__fade', {
        property: 'material.opacity',
        from: 1, to: 0,
        dur: 700,
        easing: 'easeInQuad',
      });
      setTimeout(() => p.parentNode && p.parentNode.removeChild(p), 1000);
    }
  },

  _startCooldownBar() {
    // Barra de cooldown flotante sobre el recurso
    const bar = document.createElement('a-entity');
    bar.setAttribute('position', '0 2.6 0');

    const track = document.createElement('a-plane');
    track.setAttribute('width', '1.2');
    track.setAttribute('height', '0.1');
    track.setAttribute('color', '#333');
    track.setAttribute('shader', 'flat');
    bar.appendChild(track);

    const fill = document.createElement('a-plane');
    fill.setAttribute('width', '1.18');
    fill.setAttribute('height', '0.08');
    fill.setAttribute('color', this.data_res.color);
    fill.setAttribute('shader', 'flat');
    fill.setAttribute('position', '0 0 0.01');
    fill.setAttribute('animation', {
      property: 'scale',
      from: '1 1 1',
      to: '0 1 1',
      dur: this.data.cooldown,
      easing: 'linear',
    });
    bar.appendChild(fill);

    this.el.appendChild(bar);
    setTimeout(() => this.el.removeChild(bar), this.data.cooldown + 100);
  },

  _showCooldownFeedback() {
    window.dispatchEvent(new CustomEvent('game-message', {
      detail: { text: `⏳ Espera antes de recolectar de nuevo`, type: 'warn' }
    }));
  },

  remove() {
    this.el.removeEventListener('click', this._onClick);
  },
});


/* ══════════════════════════════════════════════
   Listener global de tecla F para farmear
   el objeto más cercano al jugador
══════════════════════════════════════════════ */
window.addEventListener('keydown', (e) => {
  if (e.key !== 'f' && e.key !== 'F') return;
  const player = document.querySelector('#player');
  if (!player) return;

  const pPos = new THREE.Vector3();
  player.object3D.getWorldPosition(pPos);

  let closest = null;
  let closestDist = Infinity;

  document.querySelectorAll('[farmeable]').forEach(el => {
    const ePos = new THREE.Vector3();
    el.object3D.getWorldPosition(ePos);
    const d = pPos.distanceTo(ePos);
    if (d < closestDist) {
      closestDist = d;
      closest = el;
    }
  });

  if (closest && closestDist <= 6) {
    closest.components.farmeable._onClick();
  }
});
