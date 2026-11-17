import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The website describes the Life design only. These checks read the landing sources, so a
// Classic term or an unshipped claim cannot return to the page without failing a test.
const get = (path) => readFileSync(path, "utf8");

// spread-app.tsx also holds the planner, so only the landing's own slice of it (UnlockScreen,
// the page shown before the planner opens) is read.
const unlock = get("src/spread/screens/spread-app.tsx");
const start = unlock.indexOf("function UnlockScreen()");
const end = unlock.indexOf("function followStyle(");
assert.ok(start > 0 && end > start, "UnlockScreen is found in spread-app.tsx");
const source = [
  get("src/routes/index.tsx"),
  get("src/routes/__root.tsx"),
  unlock.slice(start, end),
  get("src/spread/components/landing-sections.tsx"),
  get("src/spread/components/landing-preview.tsx"),
  get("src/spread/components/landing-stack.tsx"),
].join("\n");
const css = get("src/styles.css");

test("the landing page names Life areas, not responsibilities or spreads", () => {
  assert.match(source, /Life areas/);
  assert.match(source, /Weekly Time/);
  assert.doesNotMatch(source, /Your responsibilities|Name the responsibilities|Responsibilities<\/span>|01 \/ Responsibilities/);
  assert.doesNotMatch(source, /<figcaption>A spread</);
  assert.doesNotMatch(source, /sample spreads|onto its spread\./);
});

test("the week navigator in the mock is plain, with no metal Crown", () => {
  assert.doesNotMatch(source, /mini-crown/);
  assert.doesNotMatch(css, /\.mini-crown\b/);
  assert.match(source, /mini-week-nav/);
  const rule = css.match(/\.mini-week-nav \{[^}]*\}/);
  assert.ok(rule, "the .mini-week-nav rule exists");
  assert.doesNotMatch(rule[0], /linear-gradient/);
});

test("the Spread/Week mock toggle shows the Life view", () => {
  assert.match(source, /<b>Life<\/b><span>Week<\/span>/);
  assert.doesNotMatch(source, /<b>Spread<\/b><span>Week<\/span>/);
});

test("no landing copy claims iCloud, Android, Apple Watch, collaboration or AI", () => {
  assert.doesNotMatch(source, /iCloud/i);
  assert.doesNotMatch(source, /android|apple watch|watchos|collaborat|multiplayer|\bAI\b|artificial intelligence/i);
});

test("the iPhone copy also names iPad, because the binary is universal", () => {
  assert.match(source, /iPhone and iPad/);
  assert.doesNotMatch(source, /The iPhone app needs no account/);
});

test("Plan Ahead is described as preview-then-confirm, never automatic", () => {
  assert.match(source, /Plan Ahead moves hours to a later week only after you preview and confirm\./);
  assert.doesNotMatch(source, /automatic(ally)? rollover|rolls? over automatically/i);
});
