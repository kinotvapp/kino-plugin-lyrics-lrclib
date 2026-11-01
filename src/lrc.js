// LRC text -> Kino's synchronized lines. A line may carry several time stamps ("[00:05.00][00:20.25]text"), the
// fraction has 1 to 3 digits, `[offset:+500]` shifts every line earlier by that many ms, and tags ("[ar:...]") and
// lines without a stamp are skipped. The result is ascending, as Kino asks.

const STAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const OFFSET = /^\[offset:\s*([+-]?\d+)\s*\]$/i;

/** @returns {{ ms: number, text: string }[]} */
export function parseLrc(text) {
  if (typeof text !== "string" || !text) return [];
  let offset = 0;
  const lines = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const tag = OFFSET.exec(line);
    if (tag) { offset = Number(tag[1]); continue; }
    const stamps = [...line.matchAll(STAMP)];
    if (!stamps.length || stamps[0].index !== 0) continue;
    const words = line.replace(STAMP, "").trim();
    if (!words) continue;
    for (const s of stamps) {
      // "5" after the dot is half a second, "50" too, "500" too: the digits are the decimals of a second.
      const frac = s[3] ? Number(s[3].padEnd(3, "0")) : 0;
      const ms = Number(s[1]) * 60_000 + Number(s[2]) * 1000 + frac - offset;
      lines.push({ ms: Math.max(0, ms), text: words });
    }
  }
  return lines.sort((a, b) => a.ms - b.ms);
}
