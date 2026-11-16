import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const week = readFileSync(
  "ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeWeekView.swift",
  "utf8",
);
const root = readFileSync(
  "ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRoot.swift",
  "utf8",
);

test("month grid row count comes from the month's real length, never a fixed six", () => {
  assert.match(week, /private var monthRowCount: Int \{/);
  assert.match(week, /calendar\.range\(of: \.day, in: \.month, for: first\)/);
  assert.match(week, /\(calendar\.component\(\.weekday, from: first\) \+ 5\) % 7/);
  assert.match(week, /\(leading \+ days \+ 6\) \/ 7/);
  assert.match(week, /ForEach\(0\.\.<monthRowCount, id: \\\.self\)/);
  assert.doesNotMatch(week, /ForEach\(0\.\.<6,/);
});

test("Week scroll area reserves the dock as a bottom inset and keeps the Wallet pass-through", () => {
  const start = root.indexOf("ScrollViewReader { proxy in");
  const end = root.indexOf("ProgressView(\"Opening your plan", start);
  assert.ok(start >= 0 && end > start, "expected the Life scroll section boundaries");
  const scroll = root.slice(start, end);
  assert.match(
    scroll,
    /\.safeAreaInset\(edge: \.bottom, spacing: 0\) \{\s*bottom\(snapshot, wide: geometry\.size\.width >= 820\)\s*\}/,
  );
  // The dock is drawn exactly once, as the inset. It is not a sibling below the scroll view.
  assert.equal(scroll.split("bottom(snapshot,").length - 1, 1);
  assert.doesNotMatch(root, /\}\s*\n\s*bottom\(snapshot,/);
  assert.match(scroll, /\.scrollClipDisabled\(\)/);
});

test("month footer stacks at accessibility sizes and day numbers shrink instead of clipping", () => {
  assert.match(week, /if typeSize\.isAccessibilitySize \{[\s\S]*?footerText[\s\S]*?todayButton/);
  assert.match(week, /\.frame\(minWidth: Spread\.minimumTarget, minHeight: Spread\.minimumTarget\)/);
  assert.match(week, /\.lineLimit\(1\)\.minimumScaleFactor\(0\.6\)/);
});

test("today ring stays visible inside a selected fill and month controls keep 44 pt targets", () => {
  assert.match(week, /today \? \(selected \? Spread\.onAccent : Spread\.accent\) : \.clear/);
  assert.match(week, /minWidth: Spread\.minimumTarget, minHeight: Spread\.minimumTarget/);
  assert.match(week, /\.frame\(minWidth: Spread\.minimumTarget, minHeight: Spread\.minimumTarget\)/);
});
