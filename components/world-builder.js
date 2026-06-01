/**
 * world-builder.js
 * Primitivas y componentes reutilizables del mundo SignIsland.
 *
 * Registra:
 *  - Primitiva <a-farola>     : farola decorativa
 *  - Primitiva <a-npc-body>   : cuerpo simple de NPC (cápsula)
 *  - Componente "farola"      : atajo para usar en <a-entity farola>
 */

/* ══════════════════════════════════════════════
   PRIMITIVA: <a-farola>
   Una farola urbana sencilla con luz dinámica.
══════════════════════════════════════════════ */
AFRAME.registerPrimitive('a-farola', {
  defaultComponents: {
    farola: {},
  },
  mappings: {
    color:    'farola.color',
    height:   'farola.height',
  },
});

AFRAME.registerComponent('farola', {
  schema: {
    color:  { type: 'color',  default: '#ffe066' },
    height: { type: 'number', default: 4.5       },
  },
  init() {
    const el = this.el;
    const h  = this.data.height;
    const c  = this.data.color;

    // Poste
    const pole = document.createElement('a-cylinder');
    pole.setAttribute('radius', 0.07);
    pole.setAttribute('height', h);
    pole.setAttribute('color', '#555');
    pole.setAttribute('position', `0 ${h / 2} 0`);
    pole.setAttribute('shadow', 'cast: true');
    el.appendChild(pole);

    // Brazo horizontal
    const arm = document.createElement('a-box');
    arm.setAttribute('width', 0.8);
    arm.setAttribute('height', 0.07);
    arm.setAttribute('depth', 0.07);
    arm.setAttribute('color', '#555');
    arm.setAttribute('position', `0.4 ${h} 0`);
    el.appendChild(arm);

    // Lámpara (esfera luminosa)
    const lamp = document.createElement('a-sphere');
    lamp.setAttribute('radius', 0.2);
    lamp.setAttribute('color', c);
    lamp.setAttribute('emissive', c);
    lamp.setAttribute('emissiveIntensity', '1');
    lamp.setAttribute('position', `0.8 ${h} 0`);
    el.appendChild(lamp);

    // Luz puntual suave
    const light = document.createElement('a-light');
    light.setAttribute('type', 'point');
    light.setAttribute('color', c);
    light.setAttribute('intensity', '0.6');
    light.setAttribute('distance', '8');
    light.setAttribute('position', `0.8 ${h} 0`);
    el.appendChild(light);
  },
});


/* ══════════════════════════════════════════════
   PRIMITIVA: <a-npc-body>
   Cuerpo simple de NPC con cabeza y cuerpo.
   Coloca encima de la posición deseada.
══════════════════════════════════════════════ */
AFRAME.registerPrimitive('a-npc-body', {
  defaultComponents: { 'npc-body': {} },
  mappings: {
    color:       'npc-body.color',
    'hat-color': 'npc-body.hatColor',
  },
});

AFRAME.registerComponent('npc-body', {
  schema: {
    color:    { type: 'color', default: '#f5cba7' },
    hatColor: { type: 'color', default: '#2c3e50' },
  },
  init() {
    const el = this.el;
    const c  = this.data.color;
    const hc = this.data.hatColor;

    // Cuerpo
    const body = document.createElement('a-box');
    body.setAttribute('width', '0.5');
    body.setAttribute('height', '0.8');
    body.setAttribute('depth', '0.3');
    body.setAttribute('color', c);
    body.setAttribute('position', '0 0.4 0');
    body.setAttribute('shadow', 'cast: true');
    el.appendChild(body);

    // Cabeza
    const head = document.createElement('a-sphere');
    head.setAttribute('radius', '0.22');
    head.setAttribute('color', c);
    head.setAttribute('position', '0 1.1 0');
    head.setAttribute('shadow', 'cast: true');
    el.appendChild(head);

    // Sombrero
    const hat = document.createElement('a-cylinder');
    hat.setAttribute('radius', '0.24');
    hat.setAttribute('height', '0.25');
    hat.setAttribute('color', hc);
    hat.setAttribute('position', '0 1.44 0');
    el.appendChild(hat);

    // Animación de idle (leve balanceo)
    el.setAttribute('animation', {
      property: 'rotation',
      from: '0 -10 0',
      to:   '0 10 0',
      dur:  3000,
      easing: 'easeInOutSine',
      loop: true,
      dir: 'alternate',
    });
  },
});


/* ══════════════════════════════════════════════
   COMPONENTE: billboard
   Hace que una entidad siempre mire a la cámara.
   (Usado por los globos de diálogo internamente)
══════════════════════════════════════════════ */
AFRAME.registerComponent('billboard', {
  tick() {
    const camera = document.querySelector('[camera]');
    if (!camera) return;
    const cameraPos = new THREE.Vector3();
    camera.object3D.getWorldPosition(cameraPos);
    this.el.object3D.lookAt(cameraPos);
  },
});
