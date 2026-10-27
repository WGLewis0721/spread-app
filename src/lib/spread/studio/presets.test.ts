import assert from "node:assert/strict";
import test from "node:test";
import { originalStudioAppearance, parseStudioAppearance } from "./contract.ts";
import { resolveStudioScope } from "./appearance.ts";
import { STUDIO_STARTERS, appearanceFromStarter } from "./presets.ts";

test("three original starter looks use valid allowlisted appearance values", () => {
  assert.deepEqual(STUDIO_STARTERS.map((item) => item.id), ["personal", "retro", "glass"]);
  for (const item of STUDIO_STARTERS) {
    assert.equal(parseStudioAppearance(item.appearance).ok, true);
    assert.equal(item.appearance.wallpaperAssetId, undefined);
    assert.ok(item.appearance.id !== "original");
    const scope = resolveStudioScope({ enabled: true, appearance: item.appearance });
    assert.equal(scope.applied, true);
    assert.equal(scope.controls, item.appearance.controls.treatmentId);
    assert.ok(scope.style["--font-sans"]);
    assert.ok(!scope.style["--font-sans"].includes("url("));
  }
});

test("starter selection preserves an existing personal photo without changing source appearance", () => {
  const before = { ...originalStudioAppearance(), id: "custom", wallpaperAssetId: "image-1",
    wallpaper: { fit: "contain" as const, positionX: 24, positionY: 70, dim: 0.2, blur: 1 } };
  const copy = JSON.stringify(before);
  const after = appearanceFromStarter("retro", before);
  assert.equal(after.wallpaperAssetId, "image-1");
  assert.deepEqual(after.wallpaper, before.wallpaper);
  assert.equal(after.typography.presetId, "mono");
  assert.equal(after.controls.treatmentId, "desktop");
  assert.equal(JSON.stringify(before), copy);
});
