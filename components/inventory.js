/**
 * inventory.js — Sistema de mensajes flotantes de SignIsland.
 * (Los sistemas de inventario, recursos y monedas han sido eliminados)
 */

// ─── Estilos de mensajes flotantes ────────────────────────────────────────────
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
    .game-msg.success { background: rgba(39,174,96,0.85);  color: #fff; }
    .game-msg.gold    { background: rgba(241,196,15,0.9);  color: #2c1810; }
    .game-msg.warn    { background: rgba(230,126,34,0.85); color: #fff; }
    .game-msg.error   { background: rgba(192,57,43,0.85);  color: #fff; }
    .game-msg.info    { background: rgba(52,152,219,0.85); color: #fff; }
    @keyframes msgIn  { from { opacity:0; transform:translateY(-8px) scale(.9); } to { opacity:1; transform:translateY(0) scale(1); } }
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

// ─── Inicialización ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectMessageStyles();
  if (!document.getElementById('game-messages')) {
    const msgs = document.createElement('div');
    msgs.id = 'game-messages';
    document.body.appendChild(msgs);
  }
});

// ─── Listener global ──────────────────────────────────────────────────────────
window.addEventListener('game-message', (e) => {
  showGameMessage(e.detail);
});
