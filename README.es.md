# Letras de LRCLIB

<img src="icon.png" width="96" alt="Icono de Letras de LRCLIB" align="right">

Un plugin de letras para el reproductor de música de Kino. Toca el botón **Letra** junto a los controles de reproducción y Kino muestra la letra de la canción sobre la carátula: sincronizada con la música cuando LRCLIB tiene los tiempos, en texto si no. Funciona con cualquier plugin de música.

Necesita Kino 0.9.81 o posterior (`apiVersion` 19, la capacidad `lyrics`).

## Qué sale de tu aparato

- Solo mientras la letra está abierta para una canción, Kino le envía a este plugin el **título, el artista, el álbum y la duración** de la canción. El plugin los reenvía a **lrclib.net** para buscar la letra. Nada más: ni el audio, ni una cuenta, ni datos del aparato.
- LRCLIB es una base de datos de letras abierta y gratuita, mantenida por su propia comunidad. Este plugin no es oficial ni tiene relación con LRCLIB.
- El plugin no guarda nada. Kino guarda la respuesta en tu aparato 7 días para que volver a abrir una canción no haga otra consulta.
- Las letras tienen derechos de autor de sus autores; vienen de la base de datos de LRCLIB y el plugin es solo la forma de buscarlas.

## Cómo busca una canción

1. La búsqueda exacta: título, artista, álbum y duración en segundos (`/api/get`).
2. Si no encuentra nada, una búsqueda por título y artista (`/api/search`): toma la misma canción cuya duración esté a menos de 3 segundos de la tuya, prefiriendo la que tenga líneas sincronizadas.
3. Responde las líneas sincronizadas, el texto, la duración de la entrada que encontró (para que Kino muestre las líneas como sincronizadas solo cuando encajan con tu canción) y `label: "LRCLIB"`.

## Estructura

```
src/index.js   la exportación `lyrics(query)`: las búsquedas y la respuesta
src/match.js   cuál entrada de LRCLIB es la canción que suena
src/lrc.js     texto LRC -> las líneas con tiempo de Kino
plugin.js      generado: `npm run build` empaqueta src/ en este único archivo, que es el que lee Kino (y el que se firma)
test/          el sandbox del kit con las respuestas de LRCLIB como fixtures (líneas inventadas, sin letras reales)
```

## Desarrollo

`npm install`, `npm run build`, `npm test`, `npm run validate`. Edita `src/`, nunca `plugin.js`. Pruébalo a mano con el kit:
`node sdk/run.mjs . lyrics "Canción" "Artista" "Álbum" 215000`.

Apache-2.0.
