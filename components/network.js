/**
 * network.js — Gestión de conexión NAF, avatares remotos y micrófono.
 */

/* ─── Componente: nombre del jugador (sincronizado por NAF) ─────────────── */
AFRAME.registerComponent('player-info', {
  schema: { name: { type: 'string', default: 'Jugador' } },
  update() {
    const tag = this.el.querySelector('.avatar-name');
    if (tag) tag.setAttribute('value', this.data.name || 'Jugador');
  },
});

/* ─── Componente: rotar el avatar remoto según su dirección de movimiento ── */
AFRAME.registerComponent('follow-rotation', {
  init() {
    this._prev   = new THREE.Vector3();
    this._target = 0;
    this._ready  = false;
  },
  tick(t, dt) {
    if (!dt) return;
    const pos = this.el.object3D.position;
    if (!this._ready) { this._prev.copy(pos); this._ready = true; return; }
    const dx = pos.x - this._prev.x;
    const dz = pos.z - this._prev.z;
    if (Math.hypot(dx, dz) > 0.002) {
      this._target = Math.atan2(dx, dz);
    }
    let curr = this.el.object3D.rotation.y;
    let diff = this._target - curr;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.el.object3D.rotation.y += diff * Math.min(1, 8 * dt / 1000);
    this._prev.copy(pos);
  },
});

/* ─── Contador de jugadores ─────────────────────────────────────────────── */
let playerCount = 1;

function updatePlayerCount(delta) {
  playerCount = Math.max(1, playerCount + delta);
  const el = document.getElementById('player-count');
  if (el) el.textContent = `👥 ${playerCount} jugador${playerCount !== 1 ? 'es' : ''}`;
}

/* ─── Inicialización NAF ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  if (!scene) return;

  // Schema NAF: registrar YA (DOMContentLoaded ocurre antes de que la escena
  // dispare 'loaded' y NAF conecte), si no los avatares no sincronizan
  // posición ni animación.
  if (window.NAF && NAF.schemas) {
    NAF.schemas.add({
      template: '#avatar-template',
      components: [
        'position',
        'player-info',
        { selector: '.avatar-anim', component: 'animation-mixer' },
      ],
    });
  }

  scene.addEventListener('connected', () => {
    const clientId = NAF.clientId;
    console.log('[SignIsland] Conectado como', clientId);

    // Propagar nombre del jugador al componente networked
    const player = document.getElementById('player');
    if (player && window.PLAYER_NAME) {
      player.setAttribute('player-info', 'name', window.PLAYER_NAME);
    }

    window.dispatchEvent(new CustomEvent('network-connected', { detail: { clientId } }));
  });

  scene.addEventListener('clientConnected', e => {
    updatePlayerCount(+1);
    window.dispatchEvent(new CustomEvent('network-player-joined',
      { detail: { clientId: e.detail.clientId } }));
  });

  scene.addEventListener('clientDisconnected', e => {
    updatePlayerCount(-1);
    window.dispatchEvent(new CustomEvent('network-player-left',
      { detail: { clientId: e.detail.clientId } }));
  });
});

/* ─── Toggle micrófono ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mic-toggle')?.addEventListener('click', () => {
    try {
      const stream = NAF?.connection?.adapter?.localStream;
      if (!stream) return;
      const track = stream.getAudioTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      document.getElementById('mic-toggle').textContent = track.enabled ? '🎤' : '🔇';
    } catch (_) {}
  });
});

/* ─── API pública ───────────────────────────────────────────────────────── */
window.NetworkManager = {
  isConnected:    () => { try { return NAF?.connection?.isConnected() ?? false; } catch { return false; } },
  getPlayerCount: () => playerCount,
  getClientId:    () => { try { return NAF?.clientId ?? null; } catch { return null; } },
};
