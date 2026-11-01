// Which LRCLIB entry is the song that plays. Candidates come from the search; the exact lookup needs no choice.

/** Slack between the entry's length and the song's: what Kino accepts as the same recording. */
export const SLACK_MS = 3000;

const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** The entry is this song: its title is the title Kino sent (or holds it), and with an artist, hers too. */
function sameSong(entry, query) {
  const title = norm(query.title);
  const t = norm(entry.trackName);
  if (!t || !(t === title || t.startsWith(title + " ") || title.startsWith(t + " "))) return false;
  const artist = norm(query.artist);
  return !artist || norm(entry.artistName).includes(artist) || artist.includes(norm(entry.artistName));
}

/**
 * The best candidate, or null. Songs only; then those whose length is within [SLACK_MS] (when Kino sent one), the ones
 * with synchronized lines, then the closest in length.
 */
export function pickBest(entries, query) {
  if (!Array.isArray(entries)) return null;
  const known = Number.isFinite(query.durationMs) && query.durationMs > 0;
  const diff = (e) => (known && Number.isFinite(e.duration) ? Math.abs(e.duration * 1000 - query.durationMs) : Infinity);
  const scored = entries.filter((e) => e && typeof e === "object" && sameSong(e, query)).map((e) => ({
    e,
    near: known ? diff(e) <= SLACK_MS : true,
    synced: typeof e.syncedLyrics === "string" && e.syncedLyrics.trim() !== "",
    gap: known ? diff(e) : 0,
  }));
  scored.sort((a, b) => Number(b.near) - Number(a.near) || Number(b.synced) - Number(a.synced) || a.gap - b.gap);
  const top = scored[0];
  // Far from the song's length, only an entry that is the same song at all; Kino itself decides whether synced lines fit.
  return top ? top.e : null;
}
