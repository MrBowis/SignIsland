/**
 * network.js — Gestión de conexión NAF, avatares remotos y micrófono.
 * Graceful degradation: si el servidor no está disponible, el juego
 * funciona en single-player sin errores en consola.
 */

let playerCount = 1;

function updatePlayerCount(delta) {
  playerCount = Math.max(1, playerCount + delta);
  const el = document.getElementById('player-count');
  if (el) el.textContent = `👥 ${playerCount} jugador${playerCount !== 1 ? 'es' : ''}`;
}

// Esperar a que NAF esté disponible
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  if (!scene) return;

  scene.addEventListener('connected', () => {
    const clientId = NAF.clientId;
    window.dispatchEvent(new CustomEvent('network-connected', { detail: { clientId } }));
    console.log('[SignIsland] Conectado como', clientId);
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

// Toggle micrófono
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

// API pública
window.NetworkManager = {
  isConnected:    () => { try { return NAF?.connection?.isConnected() ?? false; } catch { return false; } },
  getPlayerCount: () => playerCount,
  getClientId:    () => { try { return NAF?.clientId ?? null; } catch { return null; } },
};
