import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function slice(css: string, start: string, end: string): string {
  const from = css.indexOf(start);
  const to = css.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, start);
  return css.slice(from, to);
}

test("render: the scope is opt-in, scoped, and free of storage or data-theme", () => {
  const source = readFileSync(new URL("./render.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("./render.css", import.meta.url), "utf8");
  assert.match(source, /import "\.\/render\.css";/);
  assert.match(source, /if \(!STUDIO_FLAG\) return children;/);
  assert.match(source, /STUDIO_APPEARANCE_ATTRIBUTE/);
  assert.equal(source.includes("data-theme"), false);
  assert.equal(source.includes("localStorage"), false);
  assert.equal(source.includes("indexedDB"), false);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("@font-face"), false);
  assert.equal(css.includes(":root"), false);
  assert.match(css, /\[data-studio-appearance\]/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /prefers-reduced-transparency:\s*reduce/);
  assert.match(css, /prefers-contrast:\s*more/);
  const flat = slice(css, "/* treatment flat */", "/* treatment glass */");
  const glass = slice(css, "/* treatment glass */", "/* treatment matte */");
  const matte = slice(css, "/* treatment matte */", "/* treatment metal */");
  const metal = slice(css, "/* treatment metal */", "/* treatment end */");
  assert.equal(flat.includes("backdrop-filter: blur"), false);
  assert.equal(flat.includes(".crown-wheel"), false);
  assert.match(glass, /backdrop-filter:\s*blur/);
  assert.match(glass, /\.crown-wheel/);
  assert.equal(matte.includes("backdrop-filter: blur"), false);
  assert.match(matte, /\.crown-wheel/);
  assert.equal(metal.includes("backdrop-filter: blur"), false);
  assert.match(metal, /\.crown-wheel/);
  assert.match(css, /font-family:\s*var\(--font-sans\)/);
  assert.equal(css.includes("@font-face"), false);
  assert.equal(css.includes("fonts.googleapis"), false);
  assert.equal(/falcons|avengers|toy story/i.test(css + source), false);
});
