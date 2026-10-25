import assert from "node:assert/strict";
import test from "node:test";
import { originalStudioAppearance } from "./contract.ts";
import {
  ACCENT_CONTRAST,
  TEXT_CONTRAST,
  contrastRatio,
  hexToRgb,
  sampleStep,
  suggestPalette,
} from "./palette.ts";

function solid(
  width: number,
  height: number,
  pixel: [number, number, number, number],
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < rgba.length; index += 4) {
    rgba[index] = pixel[0];
    rgba[index + 1] = pixel[1];
    rgba[index + 2] = pixel[2];
    rgba[index + 3] = pixel[3];
  }
  return rgba;
}

function assertContrast(suggestion: ReturnType<typeof suggestPalette>) {
  assert.ok(suggestion.contrast.text >= TEXT_CONTRAST);
  assert.ok(suggestion.contrast.secondaryText >= TEXT_CONTRAST);
  assert.ok(suggestion.contrast.accent >= ACCENT_CONTRAST);
  assert.equal(
    contrastRatio(suggestion.palette.text, suggestion.palette.surface),
    suggestion.contrast.text,
  );
  assert.equal(
    contrastRatio(suggestion.palette.secondaryText, suggestion.palette.surface),
    suggestion.contrast.secondaryText,
  );
  assert.equal(
    contrastRatio(suggestion.palette.accent, suggestion.palette.surface),
    suggestion.contrast.accent,
  );
  for (const color of Object.values(suggestion.palette)) assert.match(color, /^#[0-9a-f]{6}$/);
}

test("palette: the same pixels always produce the same suggestion", () => {
  const rgba = solid(4, 4, [192, 0, 0, 255]);
  const first = suggestPalette(rgba, 4, 4);
  const copy = new Uint8ClampedArray(rgba);
  assert.deepEqual(suggestPalette(copy, 4, 4), first);
  assert.deepEqual(suggestPalette(rgba, 4, 4), first);
});

test("palette: a red field stays red and clears the contrast floors", () => {
  const suggestion = suggestPalette(solid(8, 4, [192, 0, 0, 255]), 8, 4);
  assert.deepEqual(suggestion.palette, {
    accent: "#fe0000",
    surface: "#4a1416",
    text: "#f5f5f7",
    secondaryText: "#b9a6a8",
  });
  const accent = hexToRgb(suggestion.palette.accent);
  assert.ok(accent && accent.r > accent.g && accent.r > accent.b);
  assertContrast(suggestion);
});

test("palette: a gray field borrows the original blue accent", () => {
  const suggestion = suggestPalette(solid(4, 4, [128, 128, 128, 255]), 4, 4);
  assert.deepEqual(suggestion.palette, {
    accent: "#008cff",
    surface: "#383839",
    text: "#f5f5f7",
    secondaryText: "#b3b3b5",
  });
  const accent = hexToRgb(suggestion.palette.accent);
  assert.ok(accent && accent.b > accent.r && accent.b > accent.g);
  assertContrast(suggestion);
});

test("palette: white and black wallpapers pick the readable ink", () => {
  const white = suggestPalette(solid(2, 2, [255, 255, 255, 255]), 2, 2);
  const black = suggestPalette(solid(2, 2, [0, 0, 0, 255]), 2, 2);
  assert.equal(white.palette.text, "#1d1d1f");
  assert.equal(white.palette.accent, "#007aff");
  assert.equal(black.palette.text, "#f5f5f7");
  assert.equal(black.palette.accent, "#007aff");
  assertContrast(white);
  assertContrast(black);
  assert.notEqual(white.palette.surface, black.palette.surface);
});

test("palette: a blue field stays blue", () => {
  const suggestion = suggestPalette(solid(3, 3, [0, 0, 220, 255]), 3, 3);
  const accent = hexToRgb(suggestion.palette.accent);
  assert.ok(accent && accent.b > accent.r && accent.b > accent.g);
  assertContrast(suggestion);
});

test("palette: transparent pixels are ignored", () => {
  const rgba = new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 220, 255]);
  const suggestion = suggestPalette(rgba, 2, 1);
  const accent = hexToRgb(suggestion.palette.accent);
  assert.ok(accent && accent.b > accent.r);
  assert.deepEqual(suggestPalette(new Uint8ClampedArray(rgba), 2, 1), suggestion);
});

test("palette: an empty or fully transparent image is the original Spread palette", () => {
  const original = originalStudioAppearance().palette;
  assert.deepEqual(suggestPalette(new Uint8ClampedArray(0), 0, 0).palette, original);
  assert.deepEqual(suggestPalette(solid(2, 2, [255, 0, 0, 0]), 2, 2).palette, original);
  assert.deepEqual(suggestPalette(solid(1, 1, [1, 2, 3, 255]), 2, 2).palette, original);
});

test("palette: the sample step is stable and does not invent pixels", () => {
  assert.equal(sampleStep(10, 10), 1);
  assert.equal(sampleStep(100, 100), 2);
  assert.equal(sampleStep(100, 100), sampleStep(100, 100));
});
