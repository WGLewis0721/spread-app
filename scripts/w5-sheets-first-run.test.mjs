import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const get = (path) => readFileSync(path, "utf8");

const root = "ios/SpreadNativeV2/Sources/SpreadNativeV2/";
const manage = get(`${root}Sheets/ManageSheets.swift`);
const whatsNew = get(`${root}Sheets/WhatsNewSheet.swift`);
const liveRoot = get(`${root}Shell/SpreadLiveRoot.swift`);

test("a failed create keeps the sheet and every unsaved entry, and a saved row never repeats", () => {
  assert.match(manage, /@State private var saveFailure: String\?/);
  assert.match(manage, /if ok \{\s*\n\s*\/\/ A saved row leaves the form[\s\S]*?drafts\.removeAll \{ \$0\.id == row\.id \}/);
  assert.match(manage, /saveFailure = planner\.error \?\? "Couldn't save\. Your entries are still here\."/);
  // The sheet closes only when every row saved. A failure must not dismiss it.
  assert.match(manage, /saving = false\s*\n\s*if saveFailure == nil \{ dismiss\(\) \}/);
  assert.doesNotMatch(manage, /saving = false\s*\n\s*dismiss\(\)/);
  assert.match(manage, /Text\(saveFailure\)[\s\S]*?accessibilityIdentifier\("add-life-error"\)/);
});

test("the disabled Save button dims through the one disabled token", () => {
  assert.match(manage, /\.opacity\(ready \? 1 : Spread\.disabledOpacity\)/);
  assert.doesNotMatch(manage, /\.opacity\(ready \? 1 : 0\.4\)/);
});

test("a failed move in Open tasks reports the store's reason and keeps the picks", () => {
  assert.match(manage, /status = planner\.error \?\? "Couldn't move these tasks\. Try again\."/);
  assert.doesNotMatch(manage, /Nothing to move\./);
  assert.match(manage, /Button\("Cancel"\) \{ dismiss\(\) \}/);
  assert.doesNotMatch(manage, /Not now/);
});

test("the More switch names the Focus timer it also gates, and its footnote says so", () => {
  assert.match(manage, /Toggle\("Show Today and Focus timer on widgets", isOn: \$todayWidgetsEnabled\)/);
  assert.match(manage, /Turns on the Today and Focus timer widgets\. Only task counts, hours placed today and a running focus timer are shared on this device\./);
  assert.match(manage, /sectionLabel\("Focus and reminders"\)/);
  assert.doesNotMatch(manage, /sectionLabel\("Notifications"\)/);
});

test("plain, US-spelled copy: no 'bank' jargon and one spelling of color", () => {
  // The identifier "bank-remaining" is an internal key, not copy. Only visible wording is checked.
  assert.doesNotMatch(manage, /week’s bank/);
  assert.doesNotMatch(manage, /Colour/);
  assert.match(manage, /left to place this week/);
  assert.match(manage, /Section\("Color and symbol"\)/);
});

test("What's New keeps its icon on the text scale instead of a fixed point size", () => {
  assert.doesNotMatch(whatsNew, /size: 28/);
  assert.match(whatsNew, /\.font\(\.system\(\.title, weight: \.medium\)\)/);
});

test("a brand-new plan does not open What's New; it marks the current notes as seen", () => {
  assert.match(liveRoot, /guard let snapshot = planner\.snapshot, sheet == nil, whatsNew == nil else \{ return \}/);
  assert.match(liveRoot, /if lastSeenReleaseID\.isEmpty, snapshot\.roles\.isEmpty \{\s*\n\s*lastSeenReleaseID = SpreadReleaseNotes\.newest\(for: SpreadReleaseNotes\.appVersion\)\?\.id \?\? ""/);
  // The launch assignment is unchanged, so the sheet still opens from one item that carries its notes.
  assert.match(liveRoot, /if !unseen\.isEmpty \{ whatsNew = WhatsNewPresentation\(notes: unseen\) \}/);
});

test("fixed frames do not clip icons or the item number at large text sizes", () => {
  assert.doesNotMatch(manage, /\.frame\(height: 26\)/);
  assert.doesNotMatch(manage, /\.frame\(width: 32\)/);
  assert.doesNotMatch(whatsNew, /\.frame\(width: 28/);
});
