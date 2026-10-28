import assert from "node:assert/strict";
import test from "node:test";
import { originalStudioAppearance, parseStudioAppearance } from "./contract.ts";
import { resolveStudioScope } from "./appearance.ts";
import { STUDIO_STARTERS, appearanceFromStarter, boardStudioAppearance } from "./presets.ts";
import { contrastRatioHex } from "./contrast.ts";

test("the starter looks use valid allowlisted appearance values", () => {
  assert.deepEqual(STUDIO_STARTERS.map((item) => item.id), ["board", "personal", "retro", "glass", "illustrated"]);
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

test("illustrated starter preserves local wallpaper, provides editable two-color surfaces", () => {
  const before = { ...originalStudioAppearance(), id: "custom", wallpaperAssetId: "personal-photo",
    wallpaper: { fit: "cover" as const, positionX: 50, positionY: 28, dim: 0.12, blur: 0 } };
  const after = appearanceFromStarter("illustrated", before);
  assert.equal(after.wallpaperAssetId, "personal-photo");
  assert.deepEqual(after.wallpaper, before.wallpaper);
  assert.equal(after.palette.highlight, "#ff8a24");
  const view = resolveStudioScope({ enabled: true, appearance: after,
    wallpaper: { assetId: "personal-photo", url: "blob:http://127.0.0.1:8080/photo" } });
  assert.equal(view.parts.crown, "comic");
  assert.equal(view.parts.week, "comic");
  assert.equal(view.style["--studio-highlight"], "#ff8a24");
  assert.ok(view.wallpaper?.includes("blob:"));
});
test("Board is a board look with no wallpaper, in both schemes, and the other starters are not", () => {
  for (const systemScheme of ["light", "dark"] as const) {
    const scope = resolveStudioScope({ enabled: true, appearance: boardStudioAppearance(), systemScheme });
    assert.equal(scope.applied, true);
    assert.equal(scope.board, true);
    assert.equal(scope.wallpaper, null);
    assert.equal(scope.scheme, systemScheme);
    assert.match(scope.style["--font-sans"], /ui-rounded/);
    // Ink must be real ink in dark, not a corrected mid gray.
    assert.ok((contrastRatioHex(scope.style["--ink"], scope.style["--elevated"]) ?? 0) >= 7, `ink on card in ${systemScheme}`);
    assert.ok((contrastRatioHex(scope.style["--secondary"], scope.style["--elevated"]) ?? 0) >= 4.5, `secondary on card in ${systemScheme}`);
    assert.ok((contrastRatioHex(scope.style["--ink"], scope.style["--canvas"]) ?? 0) >= 7, `ink on canvas in ${systemScheme}`);
  }
  for (const item of STUDIO_STARTERS.filter((entry) => entry.id !== "board")) {
    assert.equal(resolveStudioScope({ enabled: true, appearance: item.appearance }).board, false, item.id);
  }
});
