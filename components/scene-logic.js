/**
 * scene-logic.js
 * Lógica de UI de la escena principal: loading screen, minimap, HUD.
 */

/* ─── Loading screen ───────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.remove();
        // Intentar reproducir audio ambiental respetando políticas de autoplay
        const audio = document.getElementById('ambient-ocean');
        if (audio) {
          audio.play().catch((err) => {
            console.log("[SignIsland] Autoplay bloqueado por el navegador:", err);
          });
        }
      }, 900);
    }
  }, 2200);
});

/* ─── Minimap ──────────────────────────────────── */
const MINIMAP_SCALE = 1.2;   // px por unidad del mundo
const MINIMAP_SIZE = 100;   // px del canvas

// Puntos de interés del mundo (coordenadas del mundo → minimap)
const POI = [
  { x: 0, z: -17, icon: '🏛', color: '#e8d5b0', label: 'Academia' },
];

function worldToMinimap(wx, wz) {
  // Centro del minimap = origen del mundo
  const cx = MINIMAP_SIZE / 2;
  const cz = MINIMAP_SIZE / 2;
  return {
    x: cx + wx * MINIMAP_SCALE,
    y: cz + wz * MINIMAP_SCALE,
  };
}

function drawMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return;
  canvas.width = MINIMAP_SIZE;
  canvas.height = MINIMAP_SIZE;
  const ctx = canvas.getContext('2d');

  // Fondo isla
  ctx.fillStyle = '#5a8a3c';
  ctx.beginPath();
  ctx.arc(MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, 44, 0, Math.PI * 2);
  ctx.fill();

  // Playa
  ctx.strokeStyle = '#e8c87a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, 44, 0, Math.PI * 2);
  ctx.stroke();

  // Caminos
  ctx.strokeStyle = '#c8b89a';
  ctx.lineWidth = 2;
  // Norte-Sur
  ctx.beginPath();
  ctx.moveTo(MINIMAP_SIZE / 2, 0);
  ctx.lineTo(MINIMAP_SIZE / 2, MINIMAP_SIZE);
  ctx.stroke();
  // Este-Oeste
  const roadZ = worldToMinimap(0, -10).y;
  ctx.beginPath();
  ctx.moveTo(0, roadZ);
  ctx.lineTo(MINIMAP_SIZE, roadZ);
  ctx.stroke();

  // POIs
  POI.forEach(poi => {
    const { x, y } = worldToMinimap(poi.x, poi.z);
    ctx.fillStyle = poi.color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Jugador (se actualiza en tick)
  drawPlayer(ctx);
}

function drawPlayer(ctx) {
  const player = document.querySelector('#player');
  if (!player) return;
  const pos = player.getAttribute('position');
  if (!pos) return;
  const { x, y } = worldToMinimap(pos.x, pos.z);

  // Punto del jugador
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Redibujar minimap cada 500ms (no necesita ser cada frame)
setInterval(drawMinimap, 500);
// Primer dibujo
setTimeout(drawMinimap, 500);


/* ─── HUD: interacción con NPC ─────────────────── */
window.addEventListener('npc-interact', (e) => {
  const { name, emoji } = e.detail;
  console.log(`[SignIsland] NPC "${name}" dice: ${emoji}`);
  
  // Mostrar el mensaje en el HUD de mensajes flotantes
  window.dispatchEvent(new CustomEvent('game-message', {
    detail: { text: `🗣️ [${name}]: ${emoji}`, type: 'info' }
  }));
});

/* ─── Detección Contextual de Zonas ─────────────── */
let currentZone = null;

function checkPlayerZone() {
  const player = document.querySelector('#player');
  if (!player) return;
  const pos = player.getAttribute('position');
  if (!pos) return;

  let nearbyPOI = null;
  let minDist = 7; // Rango de detección en metros (se alinea con raycaster)

  POI.forEach(poi => {
    const dx = pos.x - poi.x;
    const dz = pos.z - poi.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) {
      nearbyPOI = poi;
      minDist = dist;
    }
  });

  if (nearbyPOI) {
    if (currentZone !== nearbyPOI.label) {
      currentZone = nearbyPOI.label;
      window.dispatchEvent(new CustomEvent('game-message', {
        detail: { text: `📍 Entrando a: ${nearbyPOI.icon} ${nearbyPOI.label}`, type: 'info' }
      }));
    }
  } else {
    currentZone = null;
  }
}

// Validar proximidad cada 250ms
setInterval(checkPlayerZone, 250);


/* ─── Bloqueo de puntero (click en la escena) ──── */
document.querySelector('a-scene')?.addEventListener('click', () => {
  document.querySelector('a-scene')?.canvas?.requestPointerLock?.();
});
