import assert from "node:assert/strict";
import test from "node:test";
import { ICON_STYLES, iconStyleOrDefault } from "./icon-pref.ts";

test("hand-drawn comes first and is the default", () => {
  assert.equal(ICON_STYLES[0].id, "drawn");
  assert.deepEqual(ICON_STYLES.map((s) => s.id), ["drawn", "default"]);
});

test("anything unknown is hand-drawn; only an explicit choice keeps round badges", () => {
  assert.equal(iconStyleOrDefault("drawn"), "drawn");
  assert.equal(iconStyleOrDefault("default"), "default");
  assert.equal(iconStyleOrDefault(null), "drawn");
  assert.equal(iconStyleOrDefault("crayon"), "drawn");
});
