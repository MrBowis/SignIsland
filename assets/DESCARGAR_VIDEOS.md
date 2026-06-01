# Cómo descargar los videos del Diccionario Gabriel Román

Los videos deben guardarse en `assets/videos/` con el nombre `{youtubeId}.mp4`.

## Herramienta recomendada: yt-dlp

```bash
# Instalar yt-dlp
pip install yt-dlp

# O en Mac con Homebrew
brew install yt-dlp
```

## Descargar todos los videos de las lecciones de una vez

```bash
cd signisland/assets/videos

yt-dlp -o "%(id)s.mp4" -f "mp4[height<=720]/best[ext=mp4]" \
  "https://www.youtube.com/watch?v=S-cx-IiDUHg" \
  "https://www.youtube.com/watch?v=L0Dp2xZB9-U" \
  "https://www.youtube.com/watch?v=aB4nMgDQyes" \
  "https://www.youtube.com/watch?v=NnXpTwGFhv0" \
  "https://www.youtube.com/watch?v=gr4wOlOs4t4" \
  "https://www.youtube.com/watch?v=RocuYZgMKlQ" \
  "https://www.youtube.com/watch?v=Btj3-tWetf0" \
  "https://www.youtube.com/watch?v=UIkQU2O5ktc" \
  "https://www.youtube.com/watch?v=ffpkmgyQGfo" \
  "https://www.youtube.com/watch?v=GpX-lgGir1A" \
  "https://www.youtube.com/watch?v=cUs97izzUpk" \
  "https://www.youtube.com/watch?v=OAPj7nxv4iE" \
  "https://www.youtube.com/watch?v=Nw6w7-8bSKs" \
  "https://www.youtube.com/watch?v=VbSuBUJzyIw" \
  "https://www.youtube.com/watch?v=BVYQn8Z8mQk" \
  "https://www.youtube.com/watch?v=_NV7UPduH3E" \
  "https://www.youtube.com/watch?v=SSKlBHbEIJ8"
```

## Resultado esperado en assets/videos/

```
assets/videos/
├── S-cx-IiDUHg.mp4    ← Hablar
├── L0Dp2xZB9-U.mp4    ← Como te sientes
├── aB4nMgDQyes.mp4    ← Como esta
├── NnXpTwGFhv0.mp4    ← Hace tiempo que no te veo
├── gr4wOlOs4t4.mp4    ← Que tal
├── RocuYZgMKlQ.mp4    ← Buenas noches
├── Btj3-tWetf0.mp4    ← Hacer
├── UIkQU2O5ktc.mp4    ← Dar
├── ffpkmgyQGfo.mp4    ← Saber
├── GpX-lgGir1A.mp4    ← Nadar
├── cUs97izzUpk.mp4    ← Feliz
├── OAPj7nxv4iE.mp4    ← Facil
├── Nw6w7-8bSKs.mp4    ← Nada
├── VbSuBUJzyIw.mp4    ← Donde
├── BVYQn8Z8mQk.mp4    ← Cuando
├── _NV7UPduH3E.mp4    ← Que
└── SSKlBHbEIJ8.mp4    ← Cual
```

## Notas

- El archivo DEBE llamarse exactamente `{youtubeId}.mp4` (case-sensitive).
- 720p es suficiente para una textura 3D en A-Frame. No hace falta 1080p.
- Los videos son cortos (menos de 1 minuto cada uno), el peso total es ~50–100 MB.
- Si el video tiene codec VP9 (webm) en vez de H.264, yt-dlp lo convierte
  automáticamente con el flag `-f mp4`.
