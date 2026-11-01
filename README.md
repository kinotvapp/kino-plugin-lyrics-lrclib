# Lyrics from LRCLIB

<img src="icon.png" width="96" alt="Lyrics from LRCLIB icon" align="right">

A lyrics plugin for Kino's music player. Open the **Letra** button next to the playback controls and Kino shows the song's lyrics over the cover, synchronized with the music when LRCLIB has the timing, as plain text otherwise. It works with any music plugin.

Needs Kino 0.9.81 or later (`apiVersion` 19, the `lyrics` capability).

## What leaves your device

- Only while the lyrics are open for a song, Kino sends this plugin the song's **title, artist, album and length**. The plugin forwards those to **lrclib.net** to find the lyrics. Nothing else: no audio, no account, no device data.
- LRCLIB is an open, free lyrics database run by its own community. This plugin is unofficial and not affiliated with LRCLIB.
- The plugin keeps nothing. Kino keeps an answer on your device for 7 days so reopening a song costs no new request.
- Lyrics are copyrighted by their authors; they come from LRCLIB's database and the plugin is only the way to fetch them.

## How it looks up a song

1. The exact lookup: title, artist, album and length in seconds (`/api/get`).
2. If that finds nothing, a search by title and artist (`/api/search`): it takes the same song whose length is within 3 seconds of yours, preferring one with synchronized lines.
3. It answers the synchronized lines, the plain text, the length of the entry it matched (so Kino shows the lines as synchronized only when they fit your song) and `label: "LRCLIB"`.

## Structure

```
src/index.js   the `lyrics(query)` export: the lookups and the answer
src/match.js   which LRCLIB entry is the song that plays
src/lrc.js     LRC text -> Kino's time-stamped lines
plugin.js      generated: `npm run build` bundles src/ into this one file, which is what Kino reads (and what is signed)
test/          the kit's sandbox with LRCLIB's answers as fixtures (made-up lines, no real lyrics)
```

## Develop

`npm install`, `npm run build`, `npm test`, `npm run validate`. Edit `src/`, never `plugin.js`. Try it by hand with the kit:
`node sdk/run.mjs . lyrics "Song" "Artist" "Album" 215000`.

Apache-2.0.
