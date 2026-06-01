# 🏝️ SignIsland — Metaverso de Lengua de Señas

Una isla virtual donde el único medio de comunicación es la lengua de señas en español.
Construido con A-Frame 1.7.1.

---

## 📁 Estructura del proyecto

```
signisland/
├── index.html                  # Escena principal A-Frame
├── components/
│   ├── npc-dialog.js           # Globos de diálogo emoji (Fase 2) ✅
│   ├── world-builder.js        # Primitivas reutilizables (farolas, NPCs) ✅
│   ├── scene-logic.js          # HUD, loading screen, minimap ✅
│   ├── farming.js              # Sistema de farmeo (Fase 3) 🔜
│   ├── inventory.js            # Inventario y economía (Fase 3) 🔜
│   ├── shop.js                 # Tiendas (Fase 3) 🔜
│   └── sign-lesson.js          # Academia de señas (Fase 4) 🔜
├── data/
│   └── world.json              # Datos hardcodeados: NPCs, lecciones, recursos ✅
└── assets/
    ├── audio/
    │   └── ocean.mp3           # Sonido ambiental (opcional)
    └── models/                 # Modelos .glb futuros
```

---

## 🚀 Cómo correr el proyecto

### Opción 1 — Servidor local con Python (recomendado)
```bash
cd signisland
python3 -m http.server 8080
# Abre: http://localhost:8080
```

### Opción 2 — Live Server (VS Code)
Instala la extensión **Live Server** y haz clic en "Go Live".

### Opción 3 — Node.js
```bash
npx serve .
```

> ⚠️ **No abras index.html directo** como archivo (`file://`).
> A-Frame necesita un servidor HTTP para cargar los scripts correctamente.

---

## 🎮 Controles

| Tecla | Acción |
|-------|--------|
| `WASD` | Moverse por la isla |
| `Mouse` | Mirar alrededor |
| `Clic` | Bloquear cursor |
| `E` | Avanzar diálogo con NPC cercano |
| `Esc` | Liberar cursor |

---

## 🗺️ Mapa de la isla

```
         [Mar]
    ┌─────────────────────────┐
    │  🌲 Bosque (madera)     │
    │        🏛️ ACADEMIA      │  ← Z: -20 (centro)
    │   🍎 Restaurante        │  ← X: -25, Z: -5
    │   👕 Tienda ropa        │  ← X:  25, Z: -5
    │   ⚒️  Herramientas      │  ← X: -25, Z: -25
    │  🪨 Rocas               │  ← X:  30, Z: -30
    │  🌲 Madera              │  ← X: -35, Z: -30
    │  🐟 Pesca (sur)         │  ← Z:  30
    └─────────────────────────┘
    [Jugador empieza en Z: 12]
```

---

## 📦 Dependencias CDN (no requieren instalación)

| Paquete | Versión | Uso |
|---------|---------|-----|
| `aframe` | 1.7.1 | Motor VR/3D base |
| `aframe-extras` | 7.5.0 | `movement-controls`, `animation-mixer` |
| `aframe-environment-component` | latest | Terreno, vegetación, cielo |

---

## 🔜 Próximas fases

- **Fase 3** — `farming.js` + `inventory.js` + `shop.js`
  - Clic en recursos para farmear (roca, madera, pez)
  - Inventario persistente en `localStorage`
  - Intercambio en tiendas

- **Fase 4** — `sign-lesson.js`
  - Academia con 8 lecciones hardcodeadas (en `data/world.json`)
  - Sistema de progresión y puntuación

- **Fase 5** — Pulido
  - Modelos `.glb` para NPCs y edificios
  - Sonidos ambientales
  - Efectos de partículas al farmear

---

## 📝 Datos hardcodeados

Todas las lecciones, diálogos de NPCs y recursos están en `data/world.json`.
No hay llamadas a APIs externas. El proyecto funciona completamente offline.
