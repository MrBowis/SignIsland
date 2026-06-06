/**
 * webcam.js — Comunicación por cámara (lengua de señas) entre jugadores.
 *
 *  - Panel 3D flotante encima de cada avatar (propio y remotos) con billboard.
 *  - Vista HUD (2D HTML) en la esquina superior derecha con la propia cámara.
 *  - WebRTC en malla con "negociación perfecta" (perfect negotiation).
 *  - Señalización sobre socket.io (misma conexión del chat, namespace separado).
 *
 * ⚠️  getUserMedia sólo funciona en contexto seguro: http://localhost o https://.
 *     En http://<IP-LAN> el navegador bloquea la cámara; necesitas HTTPS.
 *
 * Tecla C o botón 📷 activan/desactivan la cámara.
 */
(function () {
  const ROOM       = 'signisland-island';
  const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  /** peerId → { pc, polite, makingOffer, ignoreOffer } */
  const peers   = new Map();
  /** peerId → MediaStream remoto recibido por WebRTC */
  const streams = new Map();

  let socket      = null;
  let myId        = null;
  let localStream = null;
  let camOn       = false;

  /* ─── API pública usada por el componente cam-panel ─────────────────────── */
  window.WebcamManager = {
    getStream:      (peerId) => streams.get(peerId) ?? null,
    hasStream:      (peerId) => streams.has(peerId),
    getLocalStream: ()       => localStream,
    isCamOn:        ()       => camOn,
    toggle:         toggleCamera,
  };

  function notify(text) {
    window.dispatchEvent(new CustomEvent('game-message', { detail: { text, type: 'info' } }));
  }
  const emitStream     = (pid) => window.dispatchEvent(new CustomEvent('webcam-stream',      { detail: { peerId: pid } }));
  const emitStreamGone = (pid) => window.dispatchEvent(new CustomEvent('webcam-stream-gone', { detail: { peerId: pid } }));

  /* ─── UI HUD ─────────────────────────────────────────────────────────────── */
  let selfBox, selfVideo, camBtn;

  function buildUI() {
    selfBox   = document.getElementById('self-cam');
    selfVideo = document.getElementById('self-cam-video');
    camBtn    = document.getElementById('cam-toggle');
    camBtn?.addEventListener('click', toggleCamera);
    updateBtn();
  }

  function updateBtn() {
    if (camBtn)  camBtn.textContent      = camOn ? '📹' : '📷';
    if (selfBox) selfBox.style.display   = camOn ? 'block' : 'none';
  }

  /* ─── Encender / apagar cámara ───────────────────────────────────────────── */
  async function toggleCamera() {
    if (camOn) return stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      notify('⚠️ La cámara necesita HTTPS o localhost (contexto seguro).');
      return;
    }
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 24 } },
        audio: false,
      });
    } catch (err) {
      notify('⚠️ No se pudo acceder a la cámara: ' + (err?.message ?? err));
      return;
    }

    camOn = true;
    if (selfVideo) { selfVideo.srcObject = localStream; selfVideo.play().catch(() => {}); }
    updateBtn();
    notify('📹 Cámara activada — C para desactivar');

    // Notificar al panel 3D propio
    window.dispatchEvent(new CustomEvent('webcam-local-start', { detail: { stream: localStream } }));

    // Añadir tracks a conexiones ya establecidas (dispara renegociación)
    peers.forEach((p) => addLocalTracks(p));
    announceCam(true);
  }

  function stopCamera() {
    camOn = false;
    announceCam(false);

    // Quitar tracks de todas las conexiones → renegociación
    peers.forEach((p) => {
      p.pc.getSenders().forEach((s) => {
        if (s.track) { try { p.pc.removeTrack(s); } catch (_) {} }
      });
    });

    if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
    if (selfVideo)   selfVideo.srcObject = null;
    updateBtn();
    notify('📷 Cámara desactivada');
    window.dispatchEvent(new CustomEvent('webcam-local-stop'));
  }

  function addLocalTracks(p) {
    if (!localStream) return;
    const sent = new Set(p.pc.getSenders().map((s) => s.track).filter(Boolean));
    localStream.getTracks().forEach((track) => {
      if (!sent.has(track)) { try { p.pc.addTrack(track, localStream); } catch (_) {} }
    });
  }

  function announceCam(on) {
    socket?.emit('webrtc-cam', { room: ROOM, on: !!on });
  }

  /* ─── Señalización WebRTC ─────────────────────────────────────────────────── */
  function start(nafId) {
    if (socket) return;
    myId = nafId;
    if (typeof io !== 'function') return;   // sin servidor → sin video

    socket = io();
    socket.on('webrtc-peers',     ({ peers: list }) => (list ?? []).forEach(addPeer));
    socket.on('webrtc-new-peer',  ({ id })    => addPeer(id));
    socket.on('webrtc-peer-left', ({ id })    => removePeer(id));
    socket.on('webrtc-signal',    onSignal);
    socket.on('webrtc-cam', ({ id, on }) => {
      if (on && streams.has(id)) emitStream(id);
      if (!on)                   emitStreamGone(id);
    });

    // io() reutiliza la conexión ya abierta por chat.js, así que 'connect'
    // puede haber disparado antes de que registremos el handler.
    // Enviamos webrtc-join inmediatamente si ya estamos conectados.
    const sendJoin = () => socket.emit('webrtc-join', { room: ROOM, id: myId });
    if (socket.connected) sendJoin();
    else socket.on('connect', sendJoin);
  }

  function makePeer(peerId) {
    const polite = myId < peerId;   // el lado "polite" cede ante colisiones de oferta
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const p  = { pc, polite, makingOffer: false, ignoreOffer: false };

    pc.onicecandidate      = ({ candidate }) => candidate && signal(peerId, { candidate });
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { try { pc.restartIce(); } catch (_) {} } };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] ?? new MediaStream([ev.track]);
      streams.set(peerId, stream);
      emitStream(peerId);
    };

    pc.onnegotiationneeded = async () => {
      try {
        p.makingOffer = true;
        await pc.setLocalDescription();
        signal(peerId, { description: pc.localDescription });
      } catch (err) {
        console.warn('[webcam] onnegotiationneeded', err);
      } finally {
        p.makingOffer = false;
      }
    };

    return p;
  }

  function addPeer(peerId) {
    if (!peerId || peerId === myId || peers.has(peerId)) return;
    const p = makePeer(peerId);
    peers.set(peerId, p);
    if (camOn) addLocalTracks(p);
  }

  function removePeer(peerId) {
    const p = peers.get(peerId);
    if (p) { try { p.pc.close(); } catch (_) {} peers.delete(peerId); }
    if (streams.has(peerId)) { streams.delete(peerId); emitStreamGone(peerId); }
  }

  function signal(to, data) {
    socket?.emit('webrtc-signal', { to, from: myId, data });
  }

  async function onSignal({ from, data }) {
    if (!peers.has(from)) addPeer(from);
    const p = peers.get(from);
    if (!p || !data) return;
    const pc = p.pc;

    try {
      if (data.description) {
        const desc      = data.description;
        const collision = desc.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
        p.ignoreOffer   = !p.polite && collision;
        if (p.ignoreOffer) return;

        await pc.setRemoteDescription(desc);
        if (desc.type === 'offer') {
          if (camOn) addLocalTracks(p);
          await pc.setLocalDescription();
          signal(from, { description: pc.localDescription });
        }
      } else if (data.candidate) {
        try { await pc.addIceCandidate(data.candidate); }
        catch (err) { if (!p.ignoreOffer) console.warn('[webcam] ICE candidate', err); }
      }
    } catch (err) {
      console.warn('[webcam] onSignal', err);
    }
  }

  /* ─── Tecla C ──────────────────────────────────────────────────────────────── */
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyC') return;
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
    e.preventDefault();
    toggleCamera();
  });

  /* ─── Arranque (esperar a que NAF asigne el clientId) ────────────────────── */
  window.addEventListener('network-connected', (e) => {
    const id = e.detail?.clientId ?? window.NAF?.clientId;
    if (id) start(id);
  });
  window.addEventListener('DOMContentLoaded', buildUI);
})();


/* ═══════════════════════════════════════════════════════════════════════════
 * Componente A-Frame: cam-panel
 *
 * Muestra el stream de cámara (propio o remoto) como un panel 3D sobre el
 * avatar.  Se orienta siempre hacia la cámara del jugador local (billboard).
 *
 * Parámetros:
 *   self   true  → muestra la cámara propia (para #player)
 *          false → busca el dueño del avatar NAF y muestra su stream
 *   width / height → tamaño del panel en metros
 *
 * Uso:
 *   Local:  <a-entity cam-panel="self: true" position="0 3.05 0"></a-entity>
 *   Remoto: <a-entity cam-panel position="0 3.05 0"></a-entity>
 * ═══════════════════════════════════════════════════════════════════════════ */
AFRAME.registerComponent('cam-panel', {
  schema: {
    self:   { type: 'boolean', default: false },
    width:  { type: 'number',  default: 1.4 },
    height: { type: 'number',  default: 1.0 },
  },

  init() {
    this.owner    = null;   // NAF.clientId del dueño (null si self)
    this.video    = null;
    this.texture  = null;
    this._camPos  = new THREE.Vector3();

    this._buildPanel();

    if (this.data.self) {
      this._onLocalStart = (e) => this._attachStream(e.detail?.stream);
      this._onLocalStop  = ()  => this._detach();
      window.addEventListener('webcam-local-start', this._onLocalStart);
      window.addEventListener('webcam-local-stop',  this._onLocalStop);
      // Si la cámara ya estaba activa cuando el componente se inicializó
      if (window.WebcamManager?.getLocalStream()) {
        this._attachStream(window.WebcamManager.getLocalStream());
      }
    } else {
      this._onStream = (e) => {
        // Si aún no tenemos owner, intentar resolverlo; cuando lo encuentre
        // llamará _tryAttach que revisará si el stream ya está disponible.
        if (!this.owner) { this._resolveOwner(); return; }
        if (e.detail.peerId === this.owner) this._tryAttach();
      };
      this._onGone = (e) => {
        if (e.detail.peerId === this.owner) this._detach();
      };
      window.addEventListener('webcam-stream',      this._onStream);
      window.addEventListener('webcam-stream-gone', this._onGone);
      // Intentar resolver el owner inmediatamente (NAF puede no estar listo aún)
      this._resolveOwner();
    }
  },

  _buildPanel() {
    this.panel = document.createElement('a-entity');
    this.panel.setAttribute('visible', false);

    const BEZEL = 0.06;

    // Marco oscuro
    const frame = document.createElement('a-plane');
    frame.setAttribute('width',    this.data.width  + BEZEL * 2);
    frame.setAttribute('height',   this.data.height + BEZEL * 2);
    frame.setAttribute('position', '0 0 -0.01');
    frame.setAttribute('material',
      'color: #0d1e3a; shader: flat; side: double; transparent: true; opacity: 0.92');

    // Pantalla
    this.screen = document.createElement('a-plane');
    this.screen.setAttribute('width',  this.data.width);
    this.screen.setAttribute('height', this.data.height);
    this.screen.setAttribute('material', 'color: #111; shader: flat');

    this.panel.appendChild(frame);
    this.panel.appendChild(this.screen);
    this.el.appendChild(this.panel);
  },

  /* Sube el árbol de entidades hasta encontrar la que tiene el componente
   * networked (añadido dinámicamente por NAF) y obtiene su owner. */
  _resolveOwner() {
    let el = this.el;
    for (let i = 0; i < 8; i++) {
      if (!el) break;
      if (el.components?.networked) {
        try {
          const owner = NAF.utils.getNetworkOwner(el);
          if (owner) {
            this.owner = owner;
            this._tryAttach();   // el stream ya puede estar disponible
            return;
          }
        } catch (_) {}
      }
      el = el.parentEl;
    }
    // NAF aún no ha asignado el componente → reintentar
    clearTimeout(this._ownerTimer);
    this._ownerTimer = setTimeout(() => this._resolveOwner(), 400);
  },

  _tryAttach() {
    if (this.video || !this.owner || !window.WebcamManager) return;
    const stream = window.WebcamManager.getStream(this.owner);
    if (stream) this._attachStream(stream);
  },

  _attachStream(stream) {
    if (!stream || this.video) return;

    const v = document.createElement('video');
    v.autoplay    = true;
    v.playsInline = true;
    v.muted       = true;   // el audio va por NAF; aquí sólo imagen
    v.srcObject   = stream;
    v.style.display = 'none';
    document.body.appendChild(v);
    v.play().catch(() => {});
    this.video = v;

    const apply = () => {
      const tex = new THREE.VideoTexture(v);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      this.texture = tex;
      const mesh = this.screen.getObject3D('mesh');
      if (mesh) {
        mesh.material = new THREE.MeshBasicMaterial({ map: tex });
        mesh.material.needsUpdate = true;
      }
      this.panel.setAttribute('visible', true);
    };

    if (this.screen.getObject3D('mesh')) apply();
    else this.screen.addEventListener('loaded', apply, { once: true });
  },

  _detach() {
    this.panel.setAttribute('visible', false);
    if (this.video) {
      this.video.srcObject = null;
      this.video.parentNode?.removeChild(this.video);
      this.video = null;
    }
    if (this.texture) { this.texture.dispose(); this.texture = null; }
    const mesh = this.screen.getObject3D('mesh');
    if (mesh) { mesh.material = new THREE.MeshBasicMaterial({ color: '#111' }); }
  },

  /* Sigue la rotación Y del modelo, no la de la cámara.
   * - self: copia la rotation.y de #player-model cada frame.
   * - remoto: el padre ya tiene follow-rotation que rota el eje Y;
   *   la herencia del árbol de escena lo propaga al panel, no se toca nada. */
  tick() {
    if (!this.data.self || !this.panel.object3D.visible) return;
    const model = document.getElementById('player-model');
    if (model) this.el.object3D.rotation.y = model.object3D.rotation.y;
  },

  remove() {
    clearTimeout(this._ownerTimer);
    this._detach();
    if (this.data.self) {
      window.removeEventListener('webcam-local-start', this._onLocalStart);
      window.removeEventListener('webcam-local-stop',  this._onLocalStop);
    } else {
      window.removeEventListener('webcam-stream',      this._onStream);
      window.removeEventListener('webcam-stream-gone', this._onGone);
    }
  },
});
