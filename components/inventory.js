/**
 * inventory.js
 * Sistema de inventario y economía de SignIsland.
 *
 * - Persiste en localStorage
 * - Emite eventos: inventory-add, inventory-spend, inventory-changed
 * - Renderiza el HUD de inventario en #inventory-hud
 * - Se inicializa automáticamente al cargar el script
 */

const RESOURCE_META = {
  roca: { icon: '🪨', label: 'Rocas', value: 5 },
  madera: { icon: '🪵', label: 'Madera', value: 4 },
  pez: { icon: '🐟', label: 'Peces', value: 6 },
};

// ─── Estado del inventario ────────────────────────
const Inventory = {
  _data: { roca: 0, madera: 0, pez: 0, monedas: 0 },

  load() {
    try {
      const saved = localStorage.getItem('signisland_inventory');
      if (saved) this._data = { ...this._data, ...JSON.parse(saved) };
    } catch (_) { /* primera vez */ }
    this._notify();
  },

  save() {
    try {
      localStorage.setItem('signisland_inventory', JSON.stringify(this._data));
    } catch (_) { }
  },

  get(key) {
    return this._data[key] || 0;
  },

  add(type, amount = 1) {
    if (!(type in this._data)) return;
    this._data[type] += amount;
    this.save();
    this._notify();
    // Mensaje flotante
    const meta = RESOURCE_META[type];
    if (meta) {
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: `+${amount} ${meta.icon} ${meta.label}`, type: 'success' }
      }));
    }
  },

  /** Vende todos los recursos del tipo dado, gana monedas */
  sell(type, amount) {
    const meta = RESOURCE_META[type];
    if (!meta) return false;
    const have = this._data[type];
    const qty = amount === undefined ? have : Math.min(amount, have);
    if (qty <= 0) return false;
    const earned = qty * meta.value;
    this._data[type] -= qty;
    this._data.monedas += earned;
    this.save();
    this._notify();
    window.dispatchEvent(new CustomEvent('game-message', {
      detail: { text: `+${earned} 💰 vendiste ${qty} ${meta.icon}`, type: 'gold' }
    }));
    return true;
  },

  /** Gasta monedas. Retorna true si pudo. */
  spend(amount) {
    if (this._data.monedas < amount) {
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: `❌ No tienes suficientes monedas`, type: 'error' }
      }));
      return false;
    }
    this._data.monedas -= amount;
    this.save();
    this._notify();
    return true;
  },

  _notify() {
    window.dispatchEvent(new CustomEvent('inventory-changed', { detail: { ...this._data } }));
    renderInventoryHUD(this._data);
  },
};

// ─── Render del HUD ──────────────────────────────
function renderInventoryHUD(data) {
  const hud = document.getElementById('inventory-hud');
  if (!hud) return;

  hud.innerHTML = `
    <div class="inv-row">
      <span class="inv-item monedas">💰 ${data.monedas}</span>
      <span class="inv-item">🪨 ${data.roca}</span>
      <span class="inv-item">🪵 ${data.madera}</span>
      <span class="inv-item">🐟 ${data.pez}</span>
    </div>
  `;
}

// ─── Inyectar estilos del HUD ────────────────────
function injectInventoryStyles() {
  if (document.getElementById('inventory-styles')) return;
  const style = document.createElement('style');
  style.id = 'inventory-styles';
  style.textContent = `
    #inventory-hud {
      position: fixed;
      bottom: 62px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      pointer-events: none;
      font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;
    }
    .inv-row {
      display: flex;
      gap: 10px;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(8px);
      padding: 7px 18px;
      border-radius: 30px;
      border: 1px solid rgba(255,255,255,0.12);
    }
    .inv-item {
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.3px;
    }
    .inv-item.monedas {
      color: #f1c40f;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);
}

// ─── Sistema de mensajes flotantes ───────────────
function injectMessageStyles() {
  if (document.getElementById('msg-styles')) return;
  const style = document.createElement('style');
  style.id = 'msg-styles';
  style.textContent = `
    #game-messages {
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 300;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      pointer-events: none;
      font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;
    }
    .game-msg {
      padding: 7px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      backdrop-filter: blur(8px);
      animation: msgIn 0.25s ease, msgOut 0.35s ease 1.8s forwards;
      white-space: nowrap;
    }
    .game-msg.success { background: rgba(39,174,96,0.85); color: #fff; }
    .game-msg.gold    { background: rgba(241,196,15,0.9);  color: #2c1810; }
    .game-msg.warn    { background: rgba(230,126,34,0.85); color: #fff; }
    .game-msg.error   { background: rgba(192,57,43,0.85);  color: #fff; }
    .game-msg.info    { background: rgba(52,152,219,0.85); color: #fff; }
    @keyframes msgIn  { from { opacity:0; transform:translateY(-8px) scale(0.9); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes msgOut { from { opacity:1; } to { opacity:0; transform:translateY(-6px); } }
  `;
  document.head.appendChild(style);
}

function showGameMessage({ text, type = 'info' }) {
  let container = document.getElementById('game-messages');
  if (!container) {
    container = document.createElement('div');
    container.id = 'game-messages';
    document.body.appendChild(container);
  }
  const msg = document.createElement('div');
  msg.className = `game-msg ${type}`;
  msg.textContent = text;
  container.appendChild(msg);
  setTimeout(() => msg.remove(), 2300);
}

// ─── Inicialización ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectInventoryStyles();
  injectMessageStyles();

  // Crear el div del inventario si no existe
  if (!document.getElementById('inventory-hud')) {
    const hud = document.createElement('div');
    hud.id = 'inventory-hud';
    document.getElementById('hud')?.appendChild(hud) || document.body.appendChild(hud);
  }
  if (!document.getElementById('game-messages')) {
    const msgs = document.createElement('div');
    msgs.id = 'game-messages';
    document.body.appendChild(msgs);
  }

  Inventory.load();
});

// ─── Listeners de eventos globales ───────────────
window.addEventListener('inventory-add', (e) => {
  Inventory.add(e.detail.type, e.detail.amount ?? 1);
});

window.addEventListener('inventory-sell', (e) => {
  Inventory.sell(e.detail.type, e.detail.amount);
});

window.addEventListener('inventory-spend', (e) => {
  Inventory.spend(e.detail.amount);
});

window.addEventListener('game-message', (e) => {
  showGameMessage(e.detail);
});

// Exponer globalmente para que otros módulos lo usen
window.Inventory = Inventory;
