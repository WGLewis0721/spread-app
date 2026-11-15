import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const sheet = readFileSync("ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifePlanAheadSheet.swift", "utf8");

test("the Plan Ahead primary actions use the refined accent pill, not the system bordered style", () => {
  // The system prominent style colored its icon the same blue as its fill, so the plus disappeared.
  assert.doesNotMatch(sheet, /\.buttonStyle\(\.borderedProminent\)/);
  assert.equal(sheet.match(/\.buttonStyle\(SpreadRefinedControlStyle\(prominent: true\)\)/g)?.length, 3);
});

test("primary button titles are centered on their own, with the icon pinned to the leading edge", () => {
  assert.match(sheet, /struct SpreadCenteredLabel<Icon: View>: View/);
  assert.match(sheet, /Text\(title\)\s*\.font\(\.system\(\.body, weight: \.semibold\)\)\s*\.frame\(maxWidth: \.infinity, alignment: \.center\)/);
  assert.match(sheet, /\.overlay\(alignment: \.leading\)/);
  assert.match(sheet, /SpreadCenteredLabel\(title: "Make a new plan"/);
  assert.match(sheet, /SpreadCenteredLabel\(title: "Preview copy"/);
  assert.match(sheet, /SpreadCenteredLabel\(title: "Preview transfer"/);
  assert.doesNotMatch(sheet, /Label \{ Text\("(Make a new plan|Preview copy|Preview transfer)"\) \}/);
});

test("the new-plan button uses an icon that exists in the asset catalog", () => {
  assert.match(sheet, /SpreadIcon\(name: "lucide-plus", size: 18\)/);
  assert.ok(existsSync("ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Icons.xcassets/lucide-plus.imageset/Contents.json"));
});

test("primary actions share the app's action font and the refined pill, and the timer rules stay clean", () => {
  // The Save buttons use body semibold; the primary actions here match it.
  assert.equal(sheet.match(/\.font\(\.system\(\.body, weight: \.semibold\)\)/g)?.length >= 3, true);
  const timer = readFileSync("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimerSheet.swift", "utf8");
  assert.match(timer, /\.buttonStyle\(SpreadRefinedControlStyle\(prominent: true\)\)\s*\.disabled\(roleId\.isEmpty \|\| !plan\.isValid\)/);
  assert.doesNotMatch(timer, /\.buttonStyle\(\.borderedProminent\)/);
  // The digits and the Start row draw no separator of their own.
  assert.equal(timer.match(/\.listRowSeparator\(\.hidden\)/g)?.length >= 2, true);
});
