// Lyrics from LRCLIB (https://lrclib.net), an open lyrics database with a free API and no key. Kino calls `lyrics(query)`
// while the person has the lyrics open over the music player; the answer is the entry's synchronized lines and plain text.
import { parseLrc } from "./lrc.js";
import { pickBest } from "./match.js";

const BASE = "https://lrclib.net/api";

/** GET [path] with [params]; the parsed body, null for 404, and an `unavailable` error (Kino may retry) for anything else. */
async function api(path, params) {
  const qs = Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const res = await kino.fetch(`${BASE}/${path}?${qs}`, { timeoutMs: 8000 });
  if (res.status === 404) return null;
  if (!res.ok) throw kino.error("unavailable", `LRCLIB answered ${res.status}`);
  return res.json();
}

/** Kino's answer from an LRCLIB entry, or null when it holds nothing. */
function answerOf(entry) {
  const synced = parseLrc(entry.syncedLyrics);
  const plain = typeof entry.plainLyrics === "string" && entry.plainLyrics.trim() ? entry.plainLyrics : undefined;
  const out = { label: "LRCLIB" };
  if (synced.length) out.synced = synced;
  if (plain) out.plain = plain;
  if (Number.isFinite(entry.duration) && entry.duration > 0) out.matchDurationMs = Math.round(entry.duration * 1000);
  if (!out.synced && !out.plain) {
    if (!entry.instrumental) return null;
    out.instrumental = true;
  }
  return out;
}

export async function lyrics(query) {
  const title = String(query.title || "").trim();
  if (!title) return null;
  const artist = String(query.artist || "").trim();
  const hasLength = Number.isFinite(query.durationMs) && query.durationMs > 0;
  let failure = null;
  // The exact signature first (title, artist, album, whole seconds): one entry, the right recording.
  if (artist && hasLength) {
    try {
      const exact = await api("get", {
        track_name: title, artist_name: artist, album_name: query.album || undefined, duration: Math.round(query.durationMs / 1000),
      });
      const answer = exact && answerOf(exact);
      if (answer) return answer;
    } catch (e) { failure = e; }
  }
  // Then a search, by title and (when known) artist.
  try {
    const found = await api("search", { track_name: title, artist_name: artist || undefined });
    const best = pickBest(found, { title, artist, durationMs: query.durationMs });
    return best ? answerOf(best) : null;
  } catch (e) {
    throw failure || e;
  }
}
