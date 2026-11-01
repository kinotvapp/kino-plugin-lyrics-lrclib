// Lyrics from LRCLIB run with Kino's Node kit: the same `kino` API and sandbox as the app. Nothing reaches the network:
// LRCLIB's answers are fixtures (made-up lines, no real lyrics).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createKino } from "../sdk/kino-shim.mjs";
import { lyricsAnswer, lyricsShown, validateManifest } from "../sdk/contract.mjs";
import { loadPlugin } from "../sdk/sandbox.mjs";
import { validate } from "../sdk/validate.mjs";
import { parseLrc } from "../src/lrc.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = JSON.parse(readFileSync(join(DIR, "kino-plugin.json"), "utf8"));
const quiet = { log() {}, info() {}, warn() {}, error() {} };

const LRC = "[ar:Demo Artist]\n[00:01.50]First demo line\n[00:05.00][00:20.25]Chorus demo line\n[01:02.5]Last demo line\n\nnot a lyric line";
const entry = (over = {}) => ({
  id: 1, trackName: "Demo Song", artistName: "Demo Artist", albumName: "Demo Album", duration: 215, instrumental: false,
  plainLyrics: "First demo line\nChorus demo line\nLast demo line", syncedLyrics: LRC, ...over,
});

/** A kino whose fetch answers from [routes]: a function (url) => { status, body } | undefined; every url is recorded. */
function rig(routes) {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    const r = routes(String(url)) ?? { status: 404, body: { message: "not found" } };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } });
  };
  const kino = createKino(MANIFEST, { fetchImpl }).kino;
  return { kino, urls };
}
const load = async (r) => (await loadPlugin(join(DIR, "plugin.js"), r.kino, { console: quiet })).plugin;
const ask = async (r, q) => (await load(r)).lyrics(q);

test("the LRC text becomes ascending lines: every stamp of a line, fractions of 1 to 3 digits, tags and junk skipped", () => {
  assert.deepEqual(parseLrc(LRC), [
    { ms: 1500, text: "First demo line" },
    { ms: 5000, text: "Chorus demo line" },
    { ms: 20250, text: "Chorus demo line" },
    { ms: 62500, text: "Last demo line" },
  ]);
  assert.deepEqual(parseLrc("[00:03.123]a\n[00:01]b"), [{ ms: 1000, text: "b" }, { ms: 3123, text: "a" }]);
  assert.deepEqual(parseLrc("[offset:+500]\n[00:02.00]late"), [{ ms: 1500, text: "late" }]);
  assert.deepEqual(parseLrc(""), []);
  assert.deepEqual(parseLrc(null), []);
});

test("the exact lookup sends the song's signature and answers synced and plain with the matched length", async () => {
  const r = rig((url) => (url.includes("/api/get?") ? { status: 200, body: entry() } : undefined));
  const out = await ask(r, { title: "Demo Song", artist: "Demo Artist", album: "Demo Album", durationMs: 215_400 });
  const u = new URL(r.urls[0]);
  assert.equal(u.host, "lrclib.net");
  assert.equal(u.pathname, "/api/get");
  assert.deepEqual(Object.fromEntries(u.searchParams), { track_name: "Demo Song", artist_name: "Demo Artist", album_name: "Demo Album", duration: "215" });
  assert.equal(out.label, "LRCLIB");
  assert.equal(out.matchDurationMs, 215_000);
  assert.equal(out.synced.length, 4);
  assert.equal(out.plain, "First demo line\nChorus demo line\nLast demo line");
  // What Kino keeps of it, by the kit's twin of the app's rules: synchronized.
  const kept = lyricsAnswer(JSON.parse(JSON.stringify(out)));
  assert.equal(lyricsShown(kept, 215_400), "synced");
});

test("with no exact match it searches, and takes the entry whose length is within 3 s and that has synchronized lines", async () => {
  const far = entry({ id: 2, duration: 260, syncedLyrics: LRC });
  const plainOnly = entry({ id: 3, duration: 215, syncedLyrics: null });
  const best = entry({ id: 4, duration: 217, plainLyrics: "best plain", syncedLyrics: LRC });
  const other = entry({ id: 5, trackName: "Another Song", duration: 215 });
  const r = rig((url) => (url.includes("/api/search?") ? { status: 200, body: [far, plainOnly, other, best] } : undefined));
  const out = await ask(r, { title: "Demo Song", artist: "Demo Artist", durationMs: 215_000 });
  assert.ok(r.urls.some((u) => u.includes("/api/search?")));
  assert.equal(out.plain, "best plain");
  assert.equal(out.matchDurationMs, 217_000);
  assert.ok(out.synced.length > 0);
});

test("searches by title alone when the artist is unknown", async () => {
  const r = rig((url) => (url.includes("/api/search?") ? { status: 200, body: [entry()] } : undefined));
  const out = await ask(r, { title: "Demo Song", artist: "", durationMs: 215_000 });
  const u = new URL(r.urls.find((x) => x.includes("/api/search?")));
  assert.equal(u.searchParams.get("track_name"), "Demo Song");
  assert.equal(u.searchParams.has("artist_name"), false);
  assert.equal(out.label, "LRCLIB");
});

test("nothing found is null, an instrumental says so, a blank title asks nobody", async () => {
  assert.equal(await ask(rig(() => undefined), { title: "Demo Song", artist: "Demo Artist", durationMs: 215_000 }), null);
  const inst = rig((url) => (url.includes("/api/get?") ? { status: 200, body: entry({ instrumental: true, plainLyrics: null, syncedLyrics: null }) } : undefined));
  const out = await ask(inst, { title: "Demo Song", artist: "Demo Artist", durationMs: 215_000 });
  assert.equal(out.instrumental, true);
  assert.equal(out.synced, undefined);
  const blank = rig(() => assert.fail("must not ask"));
  assert.equal(await ask(blank, { title: "  ", artist: "x" }), null);
  assert.equal(blank.urls.length, 0);
});

test("a server error is an error Kino can retry, never 'nothing found'", async () => {
  const r = rig(() => ({ status: 503, body: { message: "down" } }));
  await assert.rejects(() => ask(r, { title: "Demo Song", artist: "Demo Artist", durationMs: 215_000 }), (e) => e.code === "unavailable");
});

test("one passing 5xx is tried again; the same error twice is an error", async () => {
  let calls = 0;
  const flaky = rig((url) => (url.includes("/api/get?") ? (++calls === 1 ? { status: 503, body: {} } : { status: 200, body: entry() }) : undefined));
  const out = await ask(flaky, { title: "Demo Song", artist: "Demo Artist", durationMs: 215_000 });
  assert.equal(calls, 2);
  assert.equal(out.label, "LRCLIB");
  const down = rig(() => ({ status: 503, body: {} }));
  await assert.rejects(() => ask(down, { title: "Demo Song", artist: "Demo Artist", durationMs: 215_000 }), (e) => e.code === "unavailable");
});

test("the manifest validates and the kit accepts the plugin as it ships", async () => {
  const text = readFileSync(join(DIR, "kino-plugin.json"), "utf8");
  assert.equal(validateManifest(text).ok, true);
  const report = await validate(DIR);
  assert.equal(report.ok, true, JSON.stringify(report.problems || report));
});
