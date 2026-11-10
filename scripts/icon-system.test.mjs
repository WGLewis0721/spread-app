import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const iconMap = {
  "work": "briefcase-business",
  "school": "graduation-cap",
  "home": "house",
  "health": "heart-pulse",
  "family": "users-round",
  "fitness": "dumbbell",
  "business": "building",
  "project": "layers",
  "church": "church",
  "personal": "user-round"
};
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const normalize = (text) => text.replace(/\s+/g, " ").trim();

test("the shipped Lucide license accompanies both web and iOS icons", () => {
  const web = read("public/icons/LUCIDE_LICENSE.txt");
  assert.match(web, /ISC License/);
  assert.equal(read("ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/LUCIDE_LICENSE.txt"), web);
  assert.match(read("ios/SpreadNativeV2/Package.swift"), /copy\("Resources\/LUCIDE_LICENSE.txt"\)/);
});

for (const [category, upstream] of Object.entries(iconMap)) {
  test(`${category}: native and React ship identical Lucide ${upstream} paths`, () => {
    const web = read(`public/icons/icon-category-${category}.svg`);
    const native = read(`ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Icons.xcassets/category-glyph-${category}.imageset/category-glyph-${category}.svg`);
    const meta = JSON.parse(read(`ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Icons.xcassets/category-glyph-${category}.imageset/Contents.json`));
    assert.match(web, /viewBox="0 0 24 24"/);
    assert.match(native, /viewBox="0 0 24 24"/);
    assert.match(native, /stroke-width="2"/);
    assert.match(web, /stroke-width="2"/);
    assert.match(web, /rx="7"/);
    assert.match(web, /data-spread-category-glyph="true"/);
    assert.equal(meta.images[0].filename, `category-glyph-${category}.svg`);
    assert.equal(meta.properties["template-rendering-intent"], "template");
    const nativeShape = native.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)?.[1];
    const webShape = web.match(/<g data-spread-category-glyph="true"[^>]*>([\s\S]*?)<\/g>/)?.[1];
    assert.ok(nativeShape && webShape, "expected matching embedded SVG geometry");
    assert.equal(normalize(nativeShape), normalize(webShape));
  });
}

test("React badge tints the tile from stored role color rather than default SVG color", () => {
  const badge = read("src/spread/components/category-badge.tsx");
  assert.match(badge, /const fill = .*test\(color\)/);
  assert.match(badge, /replace\(\/\(<rect/);
  assert.match(badge, /aria-hidden="true"/);
});

test("iOS badge maintains data-driven tint, template rendering and category fallback", () => {
  const badge = read("ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadIcons.swift");
  assert.match(badge, /Color\(hex: color\)/);
  assert.match(badge, /category-glyph-\\\(category\)/);
  assert.match(badge, /renderingMode\(\.template\)/);
  assert.match(badge, /ListMark\(\)/);
});
