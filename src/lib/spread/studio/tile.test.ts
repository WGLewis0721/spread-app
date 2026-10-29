import assert from "node:assert/strict";
import test from "node:test";
import { GLYPH_BOX, TILE_SPEC, glyphFromMark, mix, shade, tileSvg } from "./tile.ts";

test("mix lightens and darkens toward white and black", () => {
  assert.equal(mix("#000000", [255, 255, 255], 0.5), "#808080");
  assert.equal(mix("#ffffff", [0, 0, 0], 0.5), "#808080");
});

test("glyphFromMark drops the badge circle and keeps the mark", () => {
  const mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#34C759"/><path fill="#fff" d="M1 1h2"/></svg>';
  assert.equal(glyphFromMark(mark), '<path fill="#fff" d="M1 1h2"/>');
});

test("tile follows the spec radius and sizes the glyph optically", () => {
  const svg = tileSvg({ color: "#34C759", glyph: "<path/>", size: 70, id: "x", box: [6, 6, 12, 12] });
  assert.match(svg, new RegExp(`rx="${24 * TILE_SPEC.radius}"`));
  assert.match(svg, /scale\(1\.0000\) translate\(-12\.000 -12\.000\)/);
  assert.match(svg, /width="70" height="70"/);
});

test("every category has a measured glyph box", () => {
  for (const c of ["work", "school", "home", "health", "family", "fitness", "business", "project", "church", "personal", "custom"]) {
    assert.ok(GLYPH_BOX[c], c);
  }
});

test("an invalid color falls back to grey", () => {
  const svg = tileSvg({ color: "red", glyph: "", size: 10, id: "y" });
  assert.ok(svg.includes(`stop-color="${shade("#8E8E93", 0.985, 0)}"`));
});

test("shade brightens in hue and mixes toward white", () => {
  assert.equal(shade("#204060", 2, 0), "#4080c0");
  assert.equal(shade("#000000", 1, 1), "#ffffff");
});
