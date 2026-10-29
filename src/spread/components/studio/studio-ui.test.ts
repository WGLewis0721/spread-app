import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { STUDIO_UI_COPY, copyClaimsBackupExclusion, studioEntryRendered } from "./studio-copy.ts";

const here = dirname(fileURLToPath(import.meta.url));

function ownSources(): string {
  return readdirSync(here)
    .filter((name) => !name.startsWith("render") && !name.endsWith(".test.ts") && !name.endsWith(".screenshots.ts"))
    .map((name) => readFileSync(join(here, name), "utf8"))
    .join("\n");
}

test("flag off renders nothing", () => {
  assert.equal(studioEntryRendered(false), "nothing");
  assert.equal(studioEntryRendered(true), "entry");
});

test("studio copy does not claim images are excluded from backup", () => {
  const sources = ownSources();
  assert.equal(copyClaimsBackupExclusion(sources), false);
  for (const value of Object.values(STUDIO_UI_COPY)) {
    assert.equal(copyClaimsBackupExclusion(value), false);
  }
  assert.match(sources, /on this device/);
  assert.equal(sources.includes("data-theme"), false);
  assert.equal(sources.includes("setTheme"), false);
  assert.equal(sources.includes("setAccent"), false);
  assert.equal(sources.includes("localStorage.setItem"), false);
});
