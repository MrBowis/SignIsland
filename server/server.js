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

// NAF socket.io signaling protocol
io.on('connection', socket => {
  const ts = () => new Date().toLocaleTimeString();
  let joinedRoom = null;
  let chatRoom   = null;

  console.log(`[${ts()}] + conectado    ${socket.id}`);

  socket.on('joinRoom', ({ room }) => {
    joinedRoom = room;
    socket.join(room);

    // Occupants already in the room (excluding self)
    const occupants = {};
    const roomSockets = io.sockets.adapter.rooms.get(room);
    if (roomSockets) {
      roomSockets.forEach(id => {
        if (id !== socket.id) occupants[id] = true;
      });
    }

    socket.emit('connectSuccess', { clientId: socket.id });
    socket.emit('roomOccupants', { occupants });
    socket.to(room).emit('clientConnected', { clientId: socket.id });

    console.log(`[${ts()}]   entró sala "${room}" (${roomSockets?.size ?? 1} jugadores)`);
  });

  socket.on('sendData', ({ clientId, dataType, data }) => {
    if (!joinedRoom) return;
    io.to(clientId).emit('receiveData', { clientId: socket.id, dataType, data });
  });

  socket.on('sendDataGuaranteed', ({ clientId, dataType, data }) => {
    if (!joinedRoom) return;
    io.to(clientId).emit('receiveDataGuaranteed', { clientId: socket.id, dataType, data });
  });

  socket.on('broadcast', ({ dataType, data }) => {
    if (!joinedRoom) return;
    socket.to(joinedRoom).emit('receiveData', { clientId: socket.id, dataType, data });
  });

  socket.on('broadcastDataGuaranteed', ({ dataType, data }) => {
    if (!joinedRoom) return;
    socket.to(joinedRoom).emit('receiveDataGuaranteed', { clientId: socket.id, dataType, data });
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

  socket.on('disconnect', () => {
    if (joinedRoom) {
      socket.to(joinedRoom).emit('clientDisconnected', { clientId: socket.id });
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
