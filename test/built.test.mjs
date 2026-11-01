// The shipped plugin.js is generated from src/ (`npm run build`): it must be exactly what src/ builds to.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BANNER, buildText } from "../scripts/build.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

test("plugin.js is exactly what src/ builds to, with its generated-file header", async () => {
  const committed = readFileSync(join(DIR, "plugin.js"), "utf8");
  assert.ok(committed.startsWith(BANNER + "\n"));
  assert.ok((await buildText(DIR)) === committed, "run `npm run build`, never edit plugin.js by hand");
});
