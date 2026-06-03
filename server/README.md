# SignIsland — Servidor Multijugador

## Instalación (solo la primera vez)
```
cd server
npm install
```

## Arrancar
```
node server.js
```

## Acceder
- Local:    http://localhost:3025
- Red LAN:  http://{tu-ip}:3025
- Internet: npx ngrok http 3025

## Notas
- El servidor solo hace señalización WebRTC. El audio es P2P directo entre navegadores.
- Sin servidor: el juego funciona en single-player sin errores.
- Recomendado: máximo 20 jugadores por sala.
