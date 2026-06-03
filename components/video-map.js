/**
 * video-map.js — Mapeador de pantallas de video.
 *
 * Edita el objeto VIDEO_SCREENS para mover, escalar o añadir TVs SIN tocar el
 * resto del código. Cada entrada genera una <a-video-tv> en el mundo.
 *
 * Campos por pantalla:
 *   src        ruta local del video (cámbiala por la tuya)
 *   position   { x, y, z }   posición en los 3 ejes
 *   rotation   { x, y, z }   rotación en grados
 *   scale      número        escala uniforme (igual en X, Y, Z)
 *   flipX/flipY voltear la imagen
 *   width/height/range  (opcionales) tamaño de pantalla y distancia de E
 *
 * Usa la rejilla (tecla G o toggleGrid()) para leer las coordenadas.
 */
window.VIDEO_SCREENS = {
  avion: {
    src:      'assets/videos/avion.mp4',
    position: { x: -15, y: 1.2, z: -235 },
    rotation: { x: 0, y: 0, z: 0 },
    scale:    0.8,
    flipX:    false,
    flipY:    false,
  },
  carro: {
    src:      'assets/videos/carro.mp4',
    position: { x: 15, y: 1.2, z: -6.5 },
    rotation: { x: 0, y: 200, z: 0 },
    scale:    0.8,
    flipX:    false,
    flipY:    false,
  },
  edificio: {
    src:      'assets/videos/edificio.mp4',
    position: { x: -15, y: 1.2, z: -40 },
    rotation: { x: 0, y: 90, z: 0 },
    scale:    0.8,
    flipX:    false,
    flipY:    false,
  },
  arbol: {
    src:      'assets/videos/arbol.mp4',
    position: { x: -40, y: 1.2, z: -35 },
    rotation: { x: 0, y: 0, z: 0 },
    scale:    0.8,
    flipX:    false,
    flipY:    false,
  },
  puente: {
    src:      'assets/videos/puente.mp4',
    position: { x: -70, y: 1.2, z: -35 },
    rotation: { x: 0, y: 45, z: 0 },
    scale:    0.8,
    flipX:    false,
    flipY:    false,
  },
  bosque: {
    src:      'assets/videos/bosque.mp4',
    position: { x: -200, y: 1.2, z: -57 },
    rotation: { x: 0, y: 45, z: 0 },
    scale:    0.8,
    flipX:    false,
    flipY:    false,
  },
  cultivar: {
    src:      'assets/videos/cultivar.mp4',
    position: { x: -205, y: 1.2, z: -20 },
    rotation: { x: 0, y: 180, z: 0 },
    scale:    0.8,
    flipX:    false,
    flipY:    false,
  },
  gasolinera: {
    src:      'assets/videos/gasolinera.mp4',
    position: { x: -47.8, y: 3, z: -50.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale:    1,
    flipX:    false,
    flipY:    false,
  },
  poste: {
    src:      'assets/videos/postes electricos.mp4',
    position: { x: -47.7, y: 2, z: -14.35 },
    rotation: { x: 0, y: 270, z: 0 },
    scale:    0.5,
    flipX:    false,
    flipY:    false,
  }
};

(function () {
  function spawn() {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    Object.keys(window.VIDEO_SCREENS).forEach((name) => {
      if (document.getElementById('screen-' + name)) return;   // evitar duplicados
      const c = window.VIDEO_SCREENS[name];

      const vs = {
        src:   c.src,
        flipX: !!c.flipX,
        flipY: !!c.flipY,
        scale: c.scale != null ? c.scale : 1,
      };
      if (c.width  != null) vs.width  = c.width;
      if (c.height != null) vs.height = c.height;
      if (c.range  != null) vs.range  = c.range;

      const el = document.createElement('a-entity');
      el.setAttribute('id', 'screen-' + name);
      el.setAttribute('video-screen', vs);
      if (c.position) el.setAttribute('position', c.position);
      if (c.rotation) el.setAttribute('rotation', c.rotation);
      scene.appendChild(el);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    if (!scene) return;
    if (scene.hasLoaded) spawn();
    else scene.addEventListener('loaded', spawn);
  });
})();
