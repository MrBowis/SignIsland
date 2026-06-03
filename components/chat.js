/**
 * chat.js — Chat de texto del mundo SignIsland.
 *
 *  - Se abre con la tecla T (enfoca el campo de texto y suelta el puntero).
 *  - Enter envía el mensaje a los demás jugadores (vía socket.io) y Esc cierra.
 *  - El panel se muestra al 80 % de opacidad al enviar o recibir mensajes y
 *    baja al 20 % tras 3 s sin actividad.
 *
 * Mientras el chat está abierto se emite el evento "signisland-chat" para que
 * player-avatar congele el movimiento del jugador.
 */
(function () {
  const ROOM = 'signisland-island';
  const NAME = 'Isleño-' + Math.floor(1000 + Math.random() * 9000);
  const FADE_MS = 3000;

  let chatEl, logEl, inputEl;
  let open = false;
  let fadeTimer = null;
  let socket = null;

  /* ─── Opacidad: 0.8 con actividad, 0.2 tras 3 s sin mensajes ─────────── */
  function bump() {
    if (!chatEl) return;
    chatEl.style.opacity = '0.8';
    if (fadeTimer) clearTimeout(fadeTimer);
    if (!open) {
      fadeTimer = setTimeout(() => { if (!open) chatEl.style.opacity = '0.2'; }, FADE_MS);
    }
  }

  function addMessage(name, text, mine) {
    if (!logEl) return;
    const line = document.createElement('div');
    line.className = 'chat-line';
    const who = document.createElement('span');
    who.className = 'chat-name' + (mine ? ' me' : '');
    who.textContent = name + ': ';
    const msg = document.createElement('span');
    msg.textContent = text;
    line.appendChild(who);
    line.appendChild(msg);
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    bump();
  }

  function openChat() {
    if (open || !chatEl) return;
    open = true;
    if (fadeTimer) clearTimeout(fadeTimer);
    chatEl.style.opacity = '0.8';
    inputEl.style.display = 'block';
    if (document.exitPointerLock) document.exitPointerLock();
    setTimeout(() => inputEl.focus(), 0);
    window.dispatchEvent(new CustomEvent('signisland-chat', { detail: { open: true } }));
  }

  function closeChat() {
    if (!open) return;
    open = false;
    inputEl.value = '';
    inputEl.blur();
    inputEl.style.display = 'none';
    bump();   // inicia el desvanecido a 0.2
    window.dispatchEvent(new CustomEvent('signisland-chat', { detail: { open: false } }));
  }

  function send() {
    const text = inputEl.value.trim();
    if (text) {
      addMessage(NAME, text, true);
      try { if (socket) socket.emit('chat', { name: NAME, text }); } catch (_) {}
    }
    closeChat();
  }

  /* ─── Socket dedicado al chat (independiente de NAF) ─────────────────── */
  function initSocket() {
    if (typeof io !== 'function') return;   // sin servidor → chat solo local
    try {
      socket = io();
      socket.on('connect', () => socket.emit('joinChat', { room: ROOM }));
      socket.on('chat', (d) => addMessage((d && d.name) || 'Anónimo', (d && d.text) || '', false));
    } catch (_) { socket = null; }
  }

  /* ─── Teclado ────────────────────────────────────────────────────────── */
  window.addEventListener('keydown', (e) => {
    if (!open) {
      const t = e.target;
      if (e.code === 'KeyT' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'))) {
        e.preventDefault();
        openChat();
      }
      return;
    }
    // Chat abierto
    if (e.code === 'Enter')       { e.preventDefault(); send(); }
    else if (e.code === 'Escape') { e.preventDefault(); closeChat(); }
  });

  window.addEventListener('DOMContentLoaded', () => {
    chatEl  = document.getElementById('chat');
    logEl   = document.getElementById('chat-log');
    inputEl = document.getElementById('chat-input');
    if (chatEl) chatEl.style.opacity = '0.2';
    initSocket();
  });
})();
