import assert from "node:assert/strict";
import test from "node:test";
import { validateAppearance, validateStudioDraft, type AppearanceV1 } from "./contracts.ts";

const base = (): AppearanceV1 => ({
  version: 1, id: "my_falcons_look", name: "My wallpaper look", mode: "system",
  wallpaperAssetId: "local_wallpaper_1",
  wallpaper: { fit: "cover", positionX: 0.5, positionY: 0.25, dim: 0.35, blur: 6 },
  palette: { accent: "#FF0000", surface: "#111111", text: "#FFFFFF", secondaryText: "#DDDDDD" },
  material: { treatment: "metal", transparency: 0.3, depth: 0.7 },
  typography: { presetId: "system", scale: 1.2, numeralEmphasis: 0.8 },
  controls: { density: "comfortable", treatmentId: "outlined" },
  effects: { decorationIntensity: 0.5, animationIntensity: 0.2 },
});

const bad = (value: unknown, expected: string) => {
  const result = validateAppearance(value);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((e) => e.includes(expected)), `Expected ${expected}, got ${result.errors}`);
};

test("accepts a manually created look with local asset reference", () => {
  const appearance = base();
  const result = validateAppearance(appearance);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, appearance);
});

test("does not mutate incoming data; rebuilds an owned output object", () => {
  const input = base();
  const result = validateAppearance(input);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.notEqual(result.value, input);
    assert.notEqual(result.value.palette, input.palette);
    result.value.palette.accent = "#ABCDEF";
    assert.equal(input.palette.accent, "#FF0000");
  }
});

test("allows a blank wallpaper but leaves manual settings usable", () => {
  const a = base(); delete a.wallpaperAssetId;
  assert.equal(validateAppearance(a).ok, true);
});

test("rejects local image URLs and filesystem paths instead of asset IDs", () => {
  for (const value of ["https://example.com/x.png", "file:///private/image.png", "../../etc/passwd", "x/y", "data:image/png;base64,AA"]) {
    bad({ ...base(), wallpaperAssetId: value }, "wallpaperAssetId");
  }
});

test("rejects extra renderer fields, injected code, and unsafe palette strings", () => {
  bad({ ...base(), injectedCSS: ":root{color:red}" }, "injectedCSS");
  bad({ ...base(), material: { ...base().material, code: "alert(1)" } }, "material.code");
  bad({ ...base(), palette: { ...base().palette, accent: "var(--evil)" } }, "palette.accent");
});

test("rejects invalid ranges, Infinity, NaN and incorrect versions", () => {
  bad({ ...base(), version: 2 }, "version");
  bad({ ...base(), wallpaper: { ...base().wallpaper, positionX: -0.01 } }, "wallpaper.positionX");
  bad({ ...base(), wallpaper: { ...base().wallpaper, blur: 25 } }, "wallpaper.blur");
  bad({ ...base(), material: { ...base().material, depth: Infinity } }, "material.depth");
  bad({ ...base(), typography: { ...base().typography, scale: NaN } }, "typography.scale");
});

test("rejects unknown kinds rather than inventing new theme categories", () => {
  bad({ ...base(), material: { ...base().material, treatment: "official-star-wars" } }, "material.treatment");
  bad({ ...base(), typography: { ...base().typography, presetId: "remote-font-url" } }, "typography.presetId");
  bad({ ...base(), controls: { ...base().controls, treatmentId: "script" } }, "controls.treatmentId");
});

test("invalid data never becomes a silently accepted default", () => {
  bad(null, "plain object");
  bad([], "plain object");
  bad({ ...base(), wallpaper: null }, "wallpaper");
  bad({ ...base(), effects: {} }, "effects.decorationIntensity");
});

test("accepts reviewable AI draft while preserving proposed settings", () => {
  const draft = { proposed: base(), warnings: ["Contrast will be adjusted for legibility"], explanation: "Matches your wallpaper" };
  const res = validateStudioDraft(draft);
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.value, draft);
});

test("rejects draft injection and unbounded explanation and warnings", () => {
  assert.equal(validateStudioDraft({ proposed: base(), warnings: [], javascript: "alert(1)" }).ok, false);
  assert.equal(validateStudioDraft({ proposed: base(), warnings: ["x".repeat(181)] }).ok, false);
  assert.equal(validateStudioDraft({ proposed: base(), warnings: [], explanation: "a".repeat(401) }).ok, false);
  assert.equal(validateStudioDraft({ proposed: { ...base(), effects: { ...base().effects, animationIntensity: 7 } }, warnings: [] }).ok, false);
});
