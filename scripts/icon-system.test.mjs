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

test("React badge tints the tile and adapts glyph contrast to stored role colour", () => {
  const badge = read("src/spread/components/category-badge.tsx");
  assert.match(badge, /const fill = .*test\(color\)/);
  assert.match(badge, /replace\(\/\(<rect/);
  assert.match(badge, /function categoryInk\(hex: string\)/);
  assert.match(badge, /luminance > 0\.30/);
  assert.match(badge, /data-spread-category-glyph/);
  assert.match(badge, /aria-hidden="true"/);
});

test("iOS badge maintains data-driven tint, glyph contrast, templates and category fallback", () => {
  const badge = read("ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadIcons.swift");
  assert.match(badge, /Color\(hex: color\)/);
  assert.match(badge, /category-glyph-\\\(category\)/);
  assert.match(badge, /renderingMode\(\.template\)/);
  assert.match(badge, /private var glyphInk: Color/);
  assert.match(badge, /luminance > 0\.30/);
  assert.match(badge, /ListMark\(\)/);
});

test("bright role colours use contrast-aware glyph ink in native and web", () => {
  const web = read("src/spread/components/category-badge.tsx");
  const native = read("ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadIcons.swift");
  assert.match(web, /function categoryInk\(/);
  assert.match(web, /luminance > 0\.30/);
  assert.match(web, /const ink = categoryInk\(fill\)/);
  assert.match(native, /private var glyphInk: Color/);
  assert.match(native, /luminance > 0\.30/);
  assert.match(native, /foregroundStyle\(glyphInk\)/);
});

const utilityIconMap = {
  add: "plus",
  backup: "hard-drive-upload",
  check: "check",
  drag: "grip-vertical",
  edit: "pencil",
  export: "file-down",
  notes: "notebook-pen",
  outline: "list-tree",
  palette: "palette",
  photo: "image",
  print: "printer",
  restore: "rotate-ccw",
  settings: "settings",
  share: "share-2",
  table: "table-2",
  trash: "trash",
};

for (const [name, lucideSource] of Object.entries(utilityIconMap)) {
  test(`utility ${name}: matched web/iOS Lucide ${lucideSource} geometry and asset intent`, () => {
    const path = `icon-${name}.svg`;
    const web = read(`public/icons/${path}`);
    const base = `ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Icons.xcassets/icon-${name}.imageset/`;
    const native = read(base + path);
    const meta = JSON.parse(read(base + "Contents.json"));
    assert.equal(native, web, "native and web must ship byte-identical SVGs");
    assert.match(web, /viewBox="0 0 24 24"/);
    assert.match(web, /stroke-width="2"/);
    assert.match(web, /stroke-linecap="round"/);
    assert.match(web, /stroke-linejoin="round"/);
    assert.match(web, /fill="none"/);
    assert.match(web, /<path|<circle|<rect|<line|<polyline/);
    assert.doesNotMatch(web, /<script|<image|<foreignObject|href=|currentColor/);
    assert.match(web, name === "trash" ? /stroke="#FF3B30"/ : /stroke="#007AFF"/);
    assert.equal(meta.images[0].filename, path);
    assert.equal(meta.properties["preserves-vector-representation"], true);
    assert.equal(meta.properties["template-rendering-intent"] === "template", name !== "trash");
  });
}
