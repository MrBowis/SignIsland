const express    = require('express');
const http       = require('http');
const path        = require('path');
const os         = require('os');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const PORT   = process.env.PORT || 3025;

app.use(express.static(path.join(__dirname, '..')));

/**
 * Señalización NAF (adaptador "socketio" de networked-aframe).
 * Protocolo real del adaptador:
 *   Cliente → Servidor:
 *     joinRoom  { room }
 *     send      { from, to, type, data }   (mensaje dirigido a un cliente)
 *     broadcast { from, type, data }       (mensaje a toda la sala)
 *   Servidor → Cliente:
 *     connectSuccess   { joinedTime }
 *     occupantsChanged { occupants }       ({ socketId: joinTime, … })
 *     send / broadcast { from, type, data }
 *
 * El cliente usa su propio socket.id como clientId (lo toma del evento
 * 'connect' nativo), por eso aquí también identificamos a cada jugador por
 * socket.id.
 */

// Mapa de ocupantes por sala: room → { socketId: joinTime }
const nafRooms = Object.create(null);

// Señalización WebRTC de cámara (lengua de señas): room → { peerId: socketId }.
// peerId es el NAF.clientId, así el cliente asocia cada stream a su avatar.
const webrtcRooms = Object.create(null);

function emitOccupants(room) {
  const occupants = nafRooms[room] || {};
  io.to(room).emit('occupantsChanged', { occupants });
}

io.on('connection', socket => {
  const ts = () => new Date().toLocaleTimeString();
  let joinedRoom = null;
  let chatRoom   = null;
  let webrtcRoom = null;
  let myPeerId   = null;

  console.log(`[${ts()}] + conectado    ${socket.id}`);

  // ─── NAF: unirse a la sala ──────────────────────────────────────────────
  socket.on('joinRoom', ({ room }) => {
    joinedRoom = room;
    socket.join(room);

    if (!nafRooms[room]) nafRooms[room] = Object.create(null);
    nafRooms[room][socket.id] = Date.now();

    // Confirmar al recién llegado y avisar a toda la sala (cada cliente se
    // elimina a sí mismo del mapa de ocupantes).
    socket.emit('connectSuccess', { joinedTime: nafRooms[room][socket.id] });
    emitOccupants(room);

    const n = Object.keys(nafRooms[room]).length;
    console.log(`[${ts()}]   entró sala "${room}" (${n} jugador${n !== 1 ? 'es' : ''})`);
  });

  // ─── NAF: mensaje dirigido a un cliente concreto ────────────────────────
  socket.on('send', (packet) => {
    if (!packet || !packet.to) return;
    io.to(packet.to).emit('send', packet);
  });

  // ─── NAF: mensaje a todos los demás de la sala ──────────────────────────
  socket.on('broadcast', (packet) => {
    if (!joinedRoom || !packet) return;
    socket.to(joinedRoom).emit('broadcast', packet);
  });

  // ─── Chat de texto (independiente de NAF) ───────────────────────────────
  socket.on('joinChat', ({ room }) => {
    chatRoom = room;
    socket.join(room);
  });

  socket.on('chat', ({ name, text }) => {
    if (!chatRoom || typeof text !== 'string' || !text.trim()) return;
    socket.to(chatRoom).emit('chat', {
      name: String(name || 'Anónimo').slice(0, 24),
      text: text.slice(0, 200),
    });
  });

  // ─── WebRTC: cámara / lengua de señas (señalización en malla) ───────────
  socket.on('webrtc-join', ({ room, id }) => {
    if (!room || !id) return;
    webrtcRoom = room;
    myPeerId   = id;
    if (!webrtcRooms[room]) webrtcRooms[room] = Object.create(null);

    // Pares ya presentes (antes de añadirme), para iniciar conexiones.
    const existing = Object.keys(webrtcRooms[room]).filter((pid) => pid !== id);
    webrtcRooms[room][id] = socket.id;
    socket.join('webrtc:' + room);

    socket.emit('webrtc-peers', { peers: existing });
    socket.to('webrtc:' + room).emit('webrtc-new-peer', { id });
  });

  // Mensaje de señalización (oferta/respuesta/ICE) dirigido a un par concreto.
  socket.on('webrtc-signal', ({ to, from, data }) => {
    if (!webrtcRoom || !to) return;
    const target = webrtcRooms[webrtcRoom] && webrtcRooms[webrtcRoom][to];
    if (target) io.to(target).emit('webrtc-signal', { from, data });
  });

  // Aviso de cámara encendida/apagada a toda la sala.
  socket.on('webrtc-cam', ({ on }) => {
    if (!webrtcRoom || !myPeerId) return;
    socket.to('webrtc:' + webrtcRoom).emit('webrtc-cam', { id: myPeerId, on: !!on });
  });

  socket.on('disconnect', () => {
    if (joinedRoom && nafRooms[joinedRoom]) {
      delete nafRooms[joinedRoom][socket.id];
      if (Object.keys(nafRooms[joinedRoom]).length === 0) {
        delete nafRooms[joinedRoom];
      } else {
        emitOccupants(joinedRoom);   // los demás retiran el avatar saliente
      }
    }
    if (webrtcRoom && myPeerId && webrtcRooms[webrtcRoom]) {
      delete webrtcRooms[webrtcRoom][myPeerId];
      socket.to('webrtc:' + webrtcRoom).emit('webrtc-peer-left', { id: myPeerId });
      if (Object.keys(webrtcRooms[webrtcRoom]).length === 0) delete webrtcRooms[webrtcRoom];
    }
    console.log(`[${ts()}] - desconectado ${socket.id}`);
  });
});

// Direcciones IPv4 de la red local (para abrir desde otros dispositivos).
function lanAddresses() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

// '0.0.0.0' escucha en todas las interfaces → accesible en la misma red.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SignIsland] Servidor iniciado en el puerto ${PORT}`);
  console.log(`  • Este equipo:  http://localhost:${PORT}`);
  lanAddresses().forEach(ip =>
    console.log(`  • Misma red:    http://${ip}:${PORT}`));
  console.log('  Abre la URL "Misma red" en cualquier dispositivo conectado al mismo Wi-Fi.');
});
