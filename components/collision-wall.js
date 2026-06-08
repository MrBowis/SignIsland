/**
 * collision-wall.js — Muro de colisión invisible reutilizable.
 *
 * Cubo que actúa como pared de colisión para el jugador:
 *   • Invisible cuando la rejilla (#grid) está desactivada.
 *   • Rojo translúcido cuando la rejilla está activa (tecla G), para
 *     poder ubicar y ajustar los muros visualmente.
 *
 * El jugador (player-avatar) lo añade automáticamente a su sistema de
 * colisión por raycast, así que basta con colocar la entidad en la escena.
 * El raycaster no consulta material.visible, por lo que el muro sigue
 * bloqueando aunque esté oculto.
 *
 * Uso — escala en los 3 ejes con width/height/depth, posición con position:
 *   <a-entity collision-wall="width: 4; height: 5; depth: 0.5"
 *             position="10 2.5 -8"></a-entity>
 *
 * O con la primitiva equivalente:
 *   <a-collision-wall width="4" height="5" depth="0.5"
 *                     position="10 2.5 -8"></a-collision-wall>
 *
 * Parámetros:
 *   width    tamaño en X (m)               (def. 1)
 *   height   tamaño en Y (m)               (def. 3)
 *   depth    tamaño en Z (m)               (def. 1)
 *   color    color al mostrar la rejilla   (def. #ff3333)
 *   opacity  opacidad al mostrarse         (def. 0.35)
 */
AFRAME.registerComponent('collision-wall', {
  schema: {
    width:   { type: 'number', default: 1 },
    height:  { type: 'number', default: 3 },
    depth:   { type: 'number', default: 1 },
    color:   { type: 'color',  default: '#ff3333' },
    opacity: { type: 'number', default: 0.35 },
  },

  init() {
    this._onGridToggled = this._onGridToggled.bind(this);
    window.addEventListener('grid-toggled', this._onGridToggled);
    this._build();
    this._registerCollider();
  },

  update(oldData) {
    // Reconstruir la geometría sólo si cambian las dimensiones.
    const dimChanged = oldData.width !== undefined &&
      (oldData.width  !== this.data.width  ||
       oldData.height !== this.data.height ||
       oldData.depth  !== this.data.depth);

    if (dimChanged) {
      this._build();
      this._registerCollider();
    } else if (this._mesh) {
      this._mesh.material.color.set(this.data.color);
      if (this._mesh.material.visible) {
        this._mesh.material.opacity = this.data.opacity;
      }
    }
  },

  _build() {
    if (this._mesh) this.el.removeObject3D('mesh');

    const d   = this.data;
    const geo = new THREE.BoxGeometry(d.width, d.height, d.depth);
    const mat = new THREE.MeshStandardMaterial({
      color:       new THREE.Color(d.color),
      transparent: true,
      opacity:     d.opacity,
      depthWrite:  false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this._mesh = mesh;
    this.el.setObject3D('mesh', mesh);

    // BVH opcional para acelerar el raycast de colisión.
    if (window.MeshBVHLib && geo.computeBoundsTree && !geo.boundsTree) {
      try { geo.computeBoundsTree(); } catch (_) {}
    }

    // Estado inicial de visibilidad según la rejilla.
    this._applyVisibility(this._gridVisible());
  },

  _gridVisible() {
    const grid = document.getElementById('grid');
    return !!(grid && grid.getAttribute('visible'));
  },

  _onGridToggled(e) {
    this._applyVisibility(!!(e.detail && e.detail.visible));
  },

  _applyVisibility(visible) {
    if (!this._mesh) return;
    // El mesh siempre permanece raycasteable; sólo cambia su apariencia.
    this._mesh.material.visible = visible;
    this._mesh.material.opacity = visible ? this.data.opacity : 0;
  },

  /* ─── Registro en el sistema de colisión del jugador ─────────────────── */
  _registerCollider() {
    const comp = this._playerAvatar();
    if (comp && typeof comp.addCollisionRoot === 'function') {
      comp.addCollisionRoot(this.el.object3D);
    } else {
      // El jugador aún no está listo: avisar para que nos recoja al iniciar.
      window.dispatchEvent(new CustomEvent('collision-wall-ready',
        { detail: { object3D: this.el.object3D } }));
    }
  },

  _playerAvatar() {
    const playerEl = document.getElementById('player');
    return playerEl && playerEl.components && playerEl.components['player-avatar'];
  },

  remove() {
    window.removeEventListener('grid-toggled', this._onGridToggled);
    if (this._mesh) this.el.removeObject3D('mesh');
    const comp = this._playerAvatar();
    if (comp && typeof comp.removeCollisionRoot === 'function') {
      comp.removeCollisionRoot(this.el.object3D);
    }
  },
});

/* ─── Primitiva de conveniencia: <a-collision-wall> ─────────────────────── */
AFRAME.registerPrimitive('a-collision-wall', {
  defaultComponents: { 'collision-wall': {} },
  mappings: {
    width:   'collision-wall.width',
    height:  'collision-wall.height',
    depth:   'collision-wall.depth',
    color:   'collision-wall.color',
    opacity: 'collision-wall.opacity',
  },
});
