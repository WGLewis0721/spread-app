import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const liveRoot = readFileSync("ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift", "utf8");

test("the launch What's New sheet is presented from one item that carries its notes", () => {
  assert.match(liveRoot, /@State private var whatsNew: WhatsNewPresentation\?/);
  assert.match(liveRoot, /\.sheet\(item: \$whatsNew, onDismiss:/);
  assert.match(liveRoot, /WhatsNewSheet\(current: presentation\.notes\)/);
  assert.match(liveRoot, /whatsNew = WhatsNewPresentation\(notes: unseen\)/);
});

test("the old two-value presentation, which could open the sheet with an empty list, is gone", () => {
  assert.doesNotMatch(liveRoot, /showWhatsNew/);
  assert.doesNotMatch(liveRoot, /presentedNotes/);
});

test("the launch splash still marks the newest notes as seen when it is dismissed", () => {
  assert.match(liveRoot, /onDismiss: \{[\s\S]*lastSeenReleaseID = latest\.id/);
});
