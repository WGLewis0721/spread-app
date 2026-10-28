import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  clampTransparency,
  contrastRatioHex,
  enforceContrast,
  hexToRgb,
  relativeLuminance,
  worstCaseContrast,
} from "./contrast.ts";

test("contrast: black on white is the WCAG 21:1 pair", () => {
  const ratio = contrastRatioHex("#000000", "#ffffff");
  assert.ok(ratio !== null);
  assert.ok(Math.abs(ratio - 21) < 0.01);
  const white = hexToRgb("#ffffff");
  const black = hexToRgb("#000000");
  assert.ok(white && black);
  assert.ok(relativeLuminance(white) > 0.99);
  assert.ok(relativeLuminance(black) < 0.01);
});

test("contrast: identical extremes fail, and the fix clears 4.5:1", () => {
  assert.ok((contrastRatioHex("#ffffff", "#ffffff") ?? 0) < 1.01);
  assert.ok((contrastRatioHex("#000000", "#000000") ?? 0) < 1.01);
  const light = enforceContrast("#ffffff", "#ffffff", 4.5);
  assert.equal(light.adjusted, true);
  assert.notEqual(light.color, "#ffffff");
  assert.ok(light.ratio >= 4.5);
  const dark = enforceContrast("#000000", "#000000", 4.5);
  assert.equal(dark.adjusted, true);
  assert.notEqual(dark.color, "#000000");
  assert.ok(dark.ratio >= 4.5);
});

test("contrast: a passing pair is kept, and near-miss hues are moved", () => {
  const kept = enforceContrast("#000000", "#ffffff", 4.5);
  assert.equal(kept.adjusted, false);
  assert.equal(kept.color, "#000000");
  const yellow = enforceContrast("#ffff00", "#ffffff", 4.5);
  assert.equal(yellow.adjusted, true);
  assert.ok(yellow.ratio >= 4.5);
  const clash = enforceContrast("#ff0000", "#00ff00", 4.5);
  assert.ok(clash.ratio >= 4.5);
  const again = enforceContrast("#ffff00", "#ffffff", 4.5);
  assert.equal(again.color, yellow.color);
});

test("contrast: transparency is capped without looking at an image", () => {
  const open = clampTransparency("#111111", "#ffffff", 0, 4.5);
  assert.equal(open, 0);
  const washed = clampTransparency("#ffffff", "#ffffff", 1, 4.5);
  assert.equal(washed, 0);
  assert.ok(worstCaseContrast("#ffffff", "#111111", 0) >= 4.5);
  const limited = clampTransparency("#ffffff", "#111111", 1, 4.5);
  assert.ok(limited < 1);
  assert.ok(limited >= 0);
  assert.ok(worstCaseContrast("#ffffff", "#111111", limited) >= 4.5);
  const source = readFileSync(new URL("./contrast.ts", import.meta.url), "utf8");
  assert.equal(source.includes("localStorage"), false);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("enum "), false);
  assert.equal(source.includes("@/"), false);
});

test("role card inks clear 4.5:1 on every shipped role color", async () => {
  const { roleCardInks } = await import("./contrast.ts");
  const { ROLE_COLORS } = await import("../model.ts");
  for (const color of ROLE_COLORS) {
    const inks = roleCardInks(color);
    for (const [name, value] of Object.entries(inks)) {
      assert.ok((contrastRatioHex(value, color) ?? 0) >= 4.5, `${name} ${value} on ${color}`);
    }
  }
});
