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

test("wallpaper-free starters keep asset ownership but deliberately do not paint the image", () => {
  const current = { ...originalStudioAppearance(), id: "custom", wallpaperAssetId: "photo-7" };
  for (const id of ["retro", "glass"] as const) {
    const look = appearanceFromStarter(id, current);
    const view = resolveStudioScope({ enabled: true, appearance: look,
      wallpaper: { assetId: "photo-7", url: "blob:http://127.0.0.1:8080/photo-7" } });
    assert.equal(view.wallpaper, null);
    assert.equal(view.style["--studio-wallpaper-image"], "none");
    assert.equal(look.wallpaperAssetId, "photo-7");
  }
  const personal = appearanceFromStarter("personal", current);
  const view = resolveStudioScope({ enabled: true, appearance: personal,
    wallpaper: { assetId: "photo-7", url: "blob:http://127.0.0.1:8080/photo-7" } });
  assert.ok(view.wallpaper?.includes("blob:"));
});
