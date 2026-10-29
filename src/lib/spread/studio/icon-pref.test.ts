import assert from "node:assert/strict";
import test from "node:test";
import { ICON_STYLES, iconStyleOrDefault } from "./icon-pref.ts";

test("default icons come first", () => {
  assert.equal(ICON_STYLES[0].id, "default");
  assert.deepEqual(ICON_STYLES.map((s) => s.id), ["default", "drawn"]);
});

test("anything unknown is the default", () => {
  assert.equal(iconStyleOrDefault("drawn"), "drawn");
  assert.equal(iconStyleOrDefault("default"), "default");
  assert.equal(iconStyleOrDefault(null), "default");
  assert.equal(iconStyleOrDefault("crayon"), "default");
});
