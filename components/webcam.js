/**
 * webcam.js — Comunicación por cámara (lengua de señas) entre jugadores.
 *
 * Señalización WebRTC via NAF data channels (no socket.io separado).
 * Usa los mismos clientId que NAF, sin problemas de timing ni de reuso
 * de socket.  Cada jugador ve la cámara de todos los demás.
 *
 * Tecla C o botón 📷 activan/desactivan la cámara.
 * ⚠️  getUserMedia requiere HTTPS o http://localhost.
 */
(function () {
  const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const peers   = new Map();   // peerId → { pc, polite, makingOffer, ignoreOffer }
  const streams = new Map();   // peerId → MediaStream remoto

  let myId        = null;
  let localStream = null;
  let camOn       = false;
  let started     = false;

  /* ─── API pública ─────────────────────────────────────────────────────────── */
  window.WebcamManager = {
    getStream:      (id) => streams.get(id) ?? null,
    hasStream:      (id) => streams.has(id),
    getLocalStream: ()   => localStream,
    isCamOn:        ()   => camOn,
    toggle:         toggleCamera,
  };

  function notify(text) {
    window.dispatchEvent(new CustomEvent('game-message', { detail: { text, type: 'info' } }));
  }
  const emitStream     = (id) => window.dispatchEvent(new CustomEvent('webcam-stream',      { detail: { peerId: id } }));
  const emitStreamGone = (id) => window.dispatchEvent(new CustomEvent('webcam-stream-gone', { detail: { peerId: id } }));

  /* ─── UI ──────────────────────────────────────────────────────────────────── */
  let selfBox, selfVideo, camBtn;

  function buildUI() {
    selfBox   = document.getElementById('self-cam');
    selfVideo = document.getElementById('self-cam-video');
    camBtn    = document.getElementById('cam-toggle');
    camBtn?.addEventListener('click', toggleCamera);
    updateBtn();
  }

  function updateBtn() {
    if (camBtn)  camBtn.textContent    = camOn ? '📹' : '📷';
    if (selfBox) selfBox.style.display = camOn ? 'block' : 'none';
  }

  /* ─── Cámara on/off ───────────────────────────────────────────────────────── */
  async function toggleCamera() {
    if (camOn) return stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      notify('⚠️ La cámara requiere HTTPS o localhost.');
      return;
    }
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 24 } },
        audio: false,
      });
    } catch (err) {
      notify('⚠️ No se pudo acceder a la cámara: ' + (err?.message ?? String(err)));
      return;
    }

    camOn = true;
    if (selfVideo) { selfVideo.srcObject = localStream; selfVideo.play().catch(() => {}); }
    updateBtn();
    notify('📹 Cámara activada — C para desactivar');
    window.dispatchEvent(new CustomEvent('webcam-local-start', { detail: { stream: localStream } }));

    peers.forEach((p) => addLocalTracks(p));
    announceCam(true);
  }

  function stopCamera() {
    camOn = false;
    announceCam(false);
    peers.forEach((p) => {
      p.pc.getSenders().forEach((s) => { if (s.track) { try { p.pc.removeTrack(s); } catch (_) {} } });
    });
    if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
    if (selfVideo) selfVideo.srcObject = null;
    updateBtn();
    notify('📷 Cámara desactivada');
    window.dispatchEvent(new CustomEvent('webcam-local-stop'));
  }

  function addLocalTracks(p) {
    if (!localStream) return;
    const sent = new Set(p.pc.getSenders().map((s) => s.track).filter(Boolean));
    localStream.getTracks().forEach((t) => {
      if (!sent.has(t)) { try { p.pc.addTrack(t, localStream); } catch (_) {} }
    });
  }

  /* ─── Señalización vía NAF data channels ─────────────────────────────────── */
  function nafSend(to, data) {
    try { NAF.connection.sendDataGuaranteed(to, 'webcam-sig', data); } catch (_) {}
  }

  function announceCam(on) {
    try { NAF.connection.broadcastDataGuaranteed('webcam-cam', { on: !!on }); } catch (_) {}
  }

  function start(nafId) {
    if (started) return;
    started = true;
    myId    = nafId;

    // Señales WebRTC (oferta / respuesta / ICE)
    NAF.connection.subscribeToDataChannel('webcam-sig', (senderId, _type, data) => {
      onSignal(senderId, data);
    });

    // Aviso de cámara encendida/apagada
    NAF.connection.subscribeToDataChannel('webcam-cam', (senderId, _type, data) => {
      if (data.on && streams.has(senderId)) emitStream(senderId);
      if (!data.on)                         emitStreamGone(senderId);
    });

    // Conectar con peers ya presentes al momento de arranque.
    // adapter.occupants es { clientId: joinTime } y excluye al propio.
    try {
      const occ = NAF.connection.adapter.occupants || {};
      Object.keys(occ).forEach((id) => { if (id !== myId) addPeer(id); });
    } catch (_) {}
  }

  /* ─── Peers: alta / baja ──────────────────────────────────────────────────── */
  function addPeer(peerId) {
    if (!peerId || peerId === myId || peers.has(peerId)) return;
    const polite = myId < peerId;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const p  = { pc, polite, makingOffer: false, ignoreOffer: false };
    peers.set(peerId, p);

    pc.onicecandidate = ({ candidate }) => { if (candidate) nafSend(peerId, { candidate }); };
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
        nafSend(peerId, { description: pc.localDescription });
      } catch (e) { console.warn('[webcam] negotiation', e); }
      finally { p.makingOffer = false; }
    };

    if (camOn) addLocalTracks(p);
  }

  function removePeer(peerId) {
    const p = peers.get(peerId);
    if (p) { try { p.pc.close(); } catch (_) {} peers.delete(peerId); }
    if (streams.has(peerId)) { streams.delete(peerId); emitStreamGone(peerId); }
  }

  async function onSignal(from, data) {
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
          nafSend(from, { description: pc.localDescription });
        }
      } else if (data.candidate) {
        try { await pc.addIceCandidate(data.candidate); }
        catch (e) { if (!p.ignoreOffer) console.warn('[webcam] ICE', e); }
      }
    } catch (e) { console.warn('[webcam] onSignal', e); }
  }

  /* ─── Eventos de red (NAF) ────────────────────────────────────────────────── */
  window.addEventListener('network-player-joined', (e) => {
    const id = e.detail?.clientId;
    if (id && started) addPeer(id);
  });
  window.addEventListener('network-player-left', (e) => {
    const id = e.detail?.clientId;
    if (id) removePeer(id);
  });

  /* ─── Tecla C ─────────────────────────────────────────────────────────────── */
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyC') return;
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
    e.preventDefault();
    toggleCamera();
  });

  /* ─── Arranque ────────────────────────────────────────────────────────────── */
  window.addEventListener('network-connected', (e) => {
    const id = e.detail?.clientId ?? window.NAF?.clientId;
    if (id) start(id);
  });
  window.addEventListener('DOMContentLoaded', buildUI);
})();


/* ═══════════════════════════════════════════════════════════════════════════
 * Componente A-Frame: cam-panel
 *
 * self=true  → muestra la cámara propia (añadir a #player)
 * self=false → busca el NAF owner del avatar y muestra su stream WebRTC
 *
 * La rotación Y sigue al modelo del jugador (no a la cámara).
 * ═══════════════════════════════════════════════════════════════════════════ */
AFRAME.registerComponent('cam-panel', {
  schema: {
    self:   { type: 'boolean', default: false },
    width:  { type: 'number',  default: 1.4 },
    height: { type: 'number',  default: 1.0 },
  },

  init() {
    this.owner   = null;
    this.video   = null;
    this.texture = null;

    this._buildPanel();

    if (this.data.self) {
      this._onLocalStart = (e) => this._attachStream(e.detail?.stream);
      this._onLocalStop  = ()  => this._detach();
      window.addEventListener('webcam-local-start', this._onLocalStart);
      window.addEventListener('webcam-local-stop',  this._onLocalStop);
      if (window.WebcamManager?.getLocalStream()) {
        this._attachStream(window.WebcamManager.getLocalStream());
      }
    } else {
      this._onStream = (e) => {
        if (!this.owner) { this._resolveOwner(); return; }
        if (e.detail.peerId === this.owner) this._tryAttach();
      };
      this._onGone = (e) => {
        if (e.detail.peerId === this.owner) this._detach();
      };
      window.addEventListener('webcam-stream',      this._onStream);
      window.addEventListener('webcam-stream-gone', this._onGone);

      // Sondeo de seguridad: reintenta cada 2 s en caso de race condition
      this._pollInterval = setInterval(() => {
        if (!this.owner) { this._resolveOwner(); return; }
        if (!this.video && window.WebcamManager?.hasStream(this.owner)) {
          this._tryAttach();
        }
        if (this.video) clearInterval(this._pollInterval);
      }, 2000);

      this._resolveOwner();
    }
  },

  _buildPanel() {
    this.panel = document.createElement('a-entity');
    this.panel.setAttribute('visible', false);

    const B = 0.06;
    const frame = document.createElement('a-plane');
    frame.setAttribute('width',    this.data.width  + B * 2);
    frame.setAttribute('height',   this.data.height + B * 2);
    frame.setAttribute('position', '0 0 -0.01');
    frame.setAttribute('material', 'color: #0d1e3a; shader: flat; side: double; transparent: true; opacity: 0.92');

    this.screen = document.createElement('a-plane');
    this.screen.setAttribute('width',  this.data.width);
    this.screen.setAttribute('height', this.data.height);
    this.screen.setAttribute('material', 'color: #111; shader: flat');

    this.panel.appendChild(frame);
    this.panel.appendChild(this.screen);
    this.el.appendChild(this.panel);
  },

  /* Sube el árbol hasta encontrar el componente networked que NAF añade
   * dinámicamente a la entidad raíz del avatar remoto. */
  _resolveOwner() {
    let el = this.el;
    for (let i = 0; i < 10; i++) {
      if (!el) break;
      const nc = el.components?.networked;
      if (nc) {
        try {
          const owner = NAF.utils.getNetworkOwner(el);
          if (owner) { this.owner = owner; this._tryAttach(); return; }
        } catch (_) {}
      }
      el = el.parentEl;
    }
    clearTimeout(this._ownerTimer);
    this._ownerTimer = setTimeout(() => this._resolveOwner(), 400);
  },

  _tryAttach() {
    if (this.video || !this.owner) return;
    const stream = window.WebcamManager?.getStream(this.owner);
    if (stream) this._attachStream(stream);
  },

  _attachStream(stream) {
    if (!stream || this.video) return;

    const v = document.createElement('video');
    v.autoplay = v.playsInline = v.muted = true;
    v.srcObject = stream;
    v.style.display = 'none';
    document.body.appendChild(v);
    v.play().catch(() => {});
    this.video = v;

    const apply = () => {
      const tex = new THREE.VideoTexture(v);
      tex.minFilter = tex.magFilter = THREE.LinearFilter;
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      this.texture = tex;
      const mesh = this.screen.getObject3D('mesh');
      if (mesh) { mesh.material = new THREE.MeshBasicMaterial({ map: tex }); mesh.material.needsUpdate = true; }
      this.panel.setAttribute('visible', true);
    };

    if (this.screen.getObject3D('mesh')) apply();
    else this.screen.addEventListener('loaded', apply, { once: true });
  },

  _detach() {
    this.panel.setAttribute('visible', false);
    if (this.video) { this.video.srcObject = null; this.video.parentNode?.removeChild(this.video); this.video = null; }
    if (this.texture) { this.texture.dispose(); this.texture = null; }
    const mesh = this.screen.getObject3D('mesh');
    if (mesh) { mesh.material = new THREE.MeshBasicMaterial({ color: '#111' }); }
  },

  /* Rotación Y: sigue al modelo del jugador local (self) o al padre
   * que tiene follow-rotation (remoto — la herencia del árbol lo maneja). */
  tick() {
    if (!this.data.self || !this.panel.object3D.visible) return;
    const model = document.getElementById('player-model');
    if (model) this.el.object3D.rotation.y = model.object3D.rotation.y;
  },

  remove() {
    clearTimeout(this._ownerTimer);
    clearInterval(this._pollInterval);
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
