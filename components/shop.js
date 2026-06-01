/**
 * shop.js
 * Componente A-Frame para tiendas de SignIsland.
 *
 * Uso en HTML:
 *   <a-entity shop="type: comida; name: Tienda de Comida; accepts: pez,roca">
 *
 * Propiedades:
 *   - type    : identificador de la tienda
 *   - name    : nombre para mostrar en la UI
 *   - accepts : recursos que compra (separados por coma)
 *   - range   : distancia de activación (default 6)
 *
 * Al acercarse el jugador, abre un panel HTML encima del canvas
 * donde puede vender sus recursos. Tecla [T] también abre/cierra.
 */

const SHOP_CONFIGS = {
  comida:        { emoji: '🍎', desc: 'Compro todo lo que el mar y la tierra dan, y vendo víveres.', color: '#f39c12' },
  ropa:          { emoji: '👕', desc: 'Sastre local. Telas premium y ropa única para ti.',          color: '#9b59b6' },
  herramientas:  { emoji: '⚒️', desc: 'Herrero de la isla. Herramientas avanzadas que aceleran tu trabajo.', color: '#7f8c8d' },
  default:       { emoji: '🏪', desc: 'Buenos días, ¿qué buscas hoy?',                              color: '#3498db' },
};

const RESOURCE_META = {
  roca:   { icon: '🪨', label: 'Roca',   value: 5  },
  madera: { icon: '🪵', label: 'Madera', value: 4  },
  pez:    { icon: '🐟', label: 'Pez',    value: 6  },
};

const SHOP_ITEMS = {
  comida: [
    { id: 'manzana',   icon: '🍎', label: 'Manzana Jugosa',  price: 15, desc: 'Fruta dulce recién cosechada.', repeatable: true },
    { id: 'zanahoria', icon: '🥕', label: 'Zanahoria Fresca', price: 10, desc: 'Crujiente y llena de vitaminas.', repeatable: true },
    { id: 'pastel',    icon: '🍰', label: 'Pastel Especial',  price: 35, desc: 'Delicia horneada para celebrar.', repeatable: true }
  ],
  ropa: [
    { id: 'sombrero', icon: '👒', label: 'Sombrero Playero', price: 45, desc: 'Protégete del sol con estilo.', repeatable: false },
    { id: 'capa',     icon: '🧥', label: 'Abrigo Elegante',  price: 80, desc: 'Luce increíble en el metaverso.', repeatable: false },
    { id: 'corona',   icon: '👑', label: 'Corona de Oro',    price: 150, desc: 'El accesorio de los reyes.', repeatable: false }
  ],
  herramientas: [
    { id: 'hacha_hierro', icon: '🪓', label: 'Hacha Reforzada', price: 50, desc: 'Duplica madera y reduce cooldown 50%.', repeatable: false },
    { id: 'pico_hierro',  icon: '⛏️', label: 'Pico de Acero',    price: 60, desc: 'Duplica rocas y reduce cooldown 50%.', repeatable: false },
    { id: 'cana_hierro',  icon: '🎣', label: 'Caña Avanzada',   price: 70, desc: 'Duplica pesca y reduce cooldown 50%.', repeatable: false }
  ]
};

AFRAME.registerComponent('shop', {
  schema: {
    type:    { type: 'string', default: 'default' },
    name:    { type: 'string', default: 'Tienda'  },
    accepts: { type: 'string', default: 'roca,madera,pez' },
    range:   { type: 'number', default: 7 },
  },

  init() {
    this.isOpen    = false;
    this.isNearby  = false;
    this.activeTab = 'buy';
    this.playerEl  = document.querySelector('#player');
    this.cfg       = SHOP_CONFIGS[this.data.type] || SHOP_CONFIGS.default;
    this.resources = this.data.accepts.split(',').map(s => s.trim()).filter(Boolean);

    this._buildPanel();

    this._onKey = this._onKey.bind(this);
    window.addEventListener('keydown', this._onKey);

    // Escuchar cambios de inventario para refrescar la UI
    window.addEventListener('inventory-changed', () => {
      if (this.isOpen) this._refreshItems();
    });
  },

  _buildPanel() {
    if (document.getElementById('shop-panel')) return; // solo uno a la vez

    const panel = document.createElement('div');
    panel.id = 'shop-panel';
    panel.innerHTML = `
      <div class="shop-overlay" id="shop-overlay"></div>
      <div class="shop-modal" id="shop-modal">
        <div class="shop-header" id="shop-header">
          <span class="shop-emoji" id="shop-emoji">${this.cfg.emoji}</span>
          <div>
            <div class="shop-name" id="shop-name">${this.data.name}</div>
            <div class="shop-desc" id="shop-desc">${this.cfg.desc}</div>
          </div>
          <button class="shop-close" id="shop-close">✕</button>
        </div>

        <!-- Barra de navegación de la tienda -->
        <div class="shop-tabs" style="display: flex; background: rgba(0,0,0,0.25); border-bottom: 1px solid rgba(255,255,255,0.08);">
          <button class="shop-tab active" id="shop-tab-buy" style="flex: 1; background: transparent; border: none; padding: 12px; color: #7ee8a2; font-weight: 700; font-size: 0.9rem; cursor: pointer; border-bottom: 2px solid #7ee8a2; outline: none; transition: all 0.2s;">🛍️ Comprar</button>
          <button class="shop-tab" id="shop-tab-sell" style="flex: 1; background: transparent; border: none; padding: 12px; color: #aaa; font-weight: 600; font-size: 0.9rem; cursor: pointer; border-bottom: 2px solid transparent; outline: none; transition: all 0.2s;">💰 Vender</button>
        </div>

        <div class="shop-body">
          <div class="shop-section-title" id="shop-greeting-title">💬 El vendedor dice (en señas):</div>
          <div class="shop-dialog-emojis" id="shop-dialog-emojis">😊👋🤝</div>
          <div class="shop-section-title" id="shop-section-title">✨ Artículos a la venta</div>
          <div class="shop-items" id="shop-items"></div>
          <div class="shop-footer">
            <span>Tu saldo: <strong id="shop-coins">0</strong> 💰</span>
            <button class="shop-btn-all" id="shop-sell-all" style="display: none;">Vender todo</button>
          </div>
        </div>
      </div>
    `;

    this._injectShopStyles();
    document.body.appendChild(panel);
    this.panel = panel;

    // Eventos del panel
    document.getElementById('shop-close').addEventListener('click', () => this.close());
    document.getElementById('shop-overlay').addEventListener('click', () => this.close());
    document.getElementById('shop-sell-all').addEventListener('click', () => this._sellAll());
    document.getElementById('shop-tab-buy').addEventListener('click', () => this._switchTab('buy'));
    document.getElementById('shop-tab-sell').addEventListener('click', () => this._switchTab('sell'));
  },

  _injectShopStyles() {
    if (document.getElementById('shop-styles')) return;
    const style = document.createElement('style');
    style.id = 'shop-styles';
    style.textContent = `
      .shop-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        z-index: 500;
        animation: fadeIn 0.2s ease;
      }
      .shop-modal {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #101025;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 20px;
        width: 440px;
        max-width: 92vw;
        z-index: 501;
        overflow: hidden;
        animation: slideUp 0.25s ease;
        font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;
        color: #fff;
      }
      .shop-header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 20px 20px 16px;
      }
      .shop-emoji { font-size: 2.4rem; }
      .shop-name  { font-size: 1.1rem; font-weight: 700; }
      .shop-desc  { font-size: 0.78rem; color: #aaa; margin-top: 2px; }
      .shop-close {
        margin-left: auto;
        background: rgba(255,255,255,0.08);
        border: none; color: #fff;
        width: 32px; height: 32px;
        border-radius: 50%;
        cursor: pointer; font-size: 14px;
        transition: background 0.2s;
      }
      .shop-close:hover { background: rgba(255,255,255,0.2); }
      .shop-body  { padding: 16px 20px 20px; }
      .shop-section-title {
        font-size: 0.72rem;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 12px 0 8px;
      }
      .shop-dialog-emojis {
        font-size: 2rem;
        letter-spacing: 6px;
        padding: 10px 0;
        text-align: center;
        background: rgba(255,255,255,0.04);
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.05);
      }
      .shop-items  { display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; padding-right: 4px; }
      .shop-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: rgba(255,255,255,0.04);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .shop-item-icon  { font-size: 1.8rem; }
      .shop-item-info  { flex: 1; }
      .shop-item-name  { font-size: 0.9rem; font-weight: 600; }
      .shop-item-qty   { font-size: 0.75rem; color: #aaa; }
      .shop-item-price { font-size: 0.75rem; color: #f1c40f; }
      .shop-item-btn {
        background: #27ae60;
        border: none; color: #fff;
        padding: 7px 14px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        transition: background 0.2s, transform 0.1s;
      }
      .shop-item-btn:hover   { background: #2ecc71; transform: scale(1.04); }
      .shop-item-btn:active  { transform: scale(0.97); }
      .shop-item-btn:disabled{ background: #444; color: #888; cursor: default; transform: none; }
      .shop-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid rgba(255,255,255,0.07);
        font-size: 0.9rem;
        color: #ccc;
      }
      .shop-btn-all {
        background: #f39c12;
        border: none; color: #fff;
        padding: 8px 18px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 700;
        transition: background 0.2s;
      }
      .shop-btn-all:hover { background: #e67e22; }
      @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity:0; transform:translate(-50%,-44%); } to { opacity:1; transform:translate(-50%,-50%); } }
    `;
    document.head.appendChild(style);
  },

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.activeTab = 'buy'; // Siempre abre en comprar por defecto

    // Actualizar header con datos de esta tienda
    const header = document.getElementById('shop-header');
    if (header) {
      document.getElementById('shop-emoji').textContent = this.cfg.emoji;
      document.getElementById('shop-name').textContent  = this.data.name;
      document.getElementById('shop-desc').textContent  = this.cfg.desc;
      header.style.borderBottom = `1px solid ${this.cfg.color}40`;
    }

    this._switchTab('buy');
    this.panel.style.display = 'block';

    // Pausar movimiento del jugador
    const player = document.querySelector('#player');
    if (player) player.setAttribute('movement-controls', 'enabled', false);
    
    // Liberar pointer lock
    document.exitPointerLock?.();

    window.dispatchEvent(new CustomEvent('game-message', {
      detail: { text: `${this.cfg.emoji} ${this.data.name} abierta — [T] para cerrar`, type: 'info' }
    }));
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.panel) this.panel.style.display = 'none';

    // Reactivar movimiento
    const player = document.querySelector('#player');
    if (player) player.setAttribute('movement-controls', 'enabled', true);
  },

  _switchTab(tab) {
    this.activeTab = tab;
    const buyTab = document.getElementById('shop-tab-buy');
    const sellTab = document.getElementById('shop-tab-sell');
    const sellAllBtn = document.getElementById('shop-sell-all');
    const sectionTitle = document.getElementById('shop-section-title');

    if (!buyTab || !sellTab) return;

    if (tab === 'buy') {
      buyTab.style.color = '#7ee8a2';
      buyTab.style.borderBottom = '2px solid #7ee8a2';
      buyTab.style.fontWeight = '700';

      sellTab.style.color = '#aaa';
      sellTab.style.borderBottom = '2px solid transparent';
      sellTab.style.fontWeight = '600';

      if (sellAllBtn) sellAllBtn.style.display = 'none';
      if (sectionTitle) sectionTitle.textContent = '✨ Artículos de la tienda';
    } else {
      sellTab.style.color = '#7ee8a2';
      sellTab.style.borderBottom = '2px solid #7ee8a2';
      sellTab.style.fontWeight = '700';

      buyTab.style.color = '#aaa';
      buyTab.style.borderBottom = '2px solid transparent';
      buyTab.style.fontWeight = '600';

      if (sellAllBtn) sellAllBtn.style.display = 'block';
      if (sectionTitle) sectionTitle.textContent = '📦 Tus recursos para vender';
    }

    this._refreshItems();
  },

  _refreshItems() {
    const container = document.getElementById('shop-items');
    const coinsEl   = document.getElementById('shop-coins');
    if (!container || !window.Inventory) return;

    coinsEl.textContent = window.Inventory.get('monedas');
    container.innerHTML = '';

    if (this.activeTab === 'buy') {
      const items = SHOP_ITEMS[this.data.type] || [];
      if (items.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">No hay artículos a la venta en este puesto.</div>';
        return;
      }

      items.forEach(item => {
        const owned = window.Inventory.get(item.id);
        const canBuy = window.Inventory.get('monedas') >= item.price;
        const isUniqueAndOwned = !item.repeatable && owned >= 1;

        const itemEl = document.createElement('div');
        itemEl.className = 'shop-item';
        itemEl.innerHTML = `
          <span class="shop-item-icon">${item.icon}</span>
          <div class="shop-item-info">
            <div class="shop-item-name">${item.label} ${isUniqueAndOwned ? '✔️' : ''}</div>
            <div class="shop-item-qty" style="color:#aaa; font-size:0.75rem; margin-top:2px;">${item.desc}</div>
            <div class="shop-item-price" style="margin-top:4px;">${item.price} 💰 · ${item.repeatable && owned > 0 ? `Tienes: ${owned}` : isUniqueAndOwned ? 'Ya adquirido' : 'No tienes este ítem'}</div>
          </div>
          <button class="shop-item-btn" ${isUniqueAndOwned ? 'disabled' : !canBuy ? 'disabled' : ''} data-item="${item.id}">
            ${isUniqueAndOwned ? 'Adquirido' : 'Comprar'}
          </button>
        `;
        if (!isUniqueAndOwned && canBuy) {
          itemEl.querySelector('button').addEventListener('click', () => this._buyItem(item));
        }
        container.appendChild(itemEl);
      });
    } else {
      this.resources.forEach(res => {
        const meta = RESOURCE_META[res];
        if (!meta) return;
        const qty = window.Inventory.get(res);

        const item = document.createElement('div');
        item.className = 'shop-item';
        item.innerHTML = `
          <span class="shop-item-icon">${meta.icon}</span>
          <div class="shop-item-info">
            <div class="shop-item-name">${meta.label}</div>
            <div class="shop-item-qty">Tienes: ${qty}</div>
            <div class="shop-item-price">${meta.value} 💰 cada uno · Total: ${qty * meta.value} 💰</div>
          </div>
          <button class="shop-item-btn" ${qty === 0 ? 'disabled' : ''} data-res="${res}">
            Vender
          </button>
        `;
        item.querySelector('button').addEventListener('click', (e) => {
          const r = e.target.dataset.res;
          window.dispatchEvent(new CustomEvent('inventory-sell', { detail: { type: r } }));
        });
        container.appendChild(item);
      });
    }
  },

  _buyItem(item) {
    if (!window.Inventory) return;
    const success = window.Inventory.spend(item.price);
    if (success) {
      window.Inventory.add(item.id, 1);
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: `🛍️ Compraste ${item.icon} ${item.label} por ${item.price} 💰`, type: 'gold' }
      }));
      this._refreshItems();
    }
  },

  _sellAll() {
    let sold = false;
    this.resources.forEach(res => {
      const qty = window.Inventory?.get(res) || 0;
      if (qty > 0) {
        window.dispatchEvent(new CustomEvent('inventory-sell', { detail: { type: res } }));
        sold = true;
      }
    });
    if (!sold) {
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: '🎒 No tienes recursos para vender', type: 'warn' }
      }));
    }
  },

  _onKey(e) {
    if (e.key !== 't' && e.key !== 'T') return;
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

    if (!this.isNearby && wasNearby && this.isOpen) {
      this.close();
    }
  },

  remove() {
    window.removeEventListener('keydown', this._onKey);
    if (this.panel) this.panel.remove();
  },
});
