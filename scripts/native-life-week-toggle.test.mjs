import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  "ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRoot.swift",
  "utf8",
);

function section(from, to) {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start + from.length);
  assert.ok(start >= 0 && end > start, "expected toggle section boundaries");
  return source.slice(start, end);
}

test("Life/Week toggle keeps a small ForEach builder for Swift release compilation", () => {
  const toggle = section(
    "private var lifeWeekToggle: some View",
    "private func lifeWeekToggleButton(",
  );
  assert.match(toggle, /ForEach\(\[LifeDestination\.life, LifeDestination\.week\]\)/);
  assert.match(toggle, /lifeWeekToggleButton\(item\)/);
  assert.doesNotMatch(toggle, /Button\s*\{/);
  assert.doesNotMatch(toggle, /Text\s*\(/);
  assert.match(toggle, /accessibilityIdentifier\("life-week-toggle"\)/);
});

test("Life/Week button retains navigation and accessible selection semantics", () => {
  const button = section(
    "private func lifeWeekToggleButton(",
    "private func lifeWeekToggleLabel(",
  );
  assert.match(button, /navigate\(item\)/);
  assert.match(button, /lifeWeekToggleLabel\(item, selected: selected\)/);
  assert.match(button, /\.buttonStyle\(\.spreadPress\)/);
  assert.match(button, /\.accessibilityLabel\(item\.rawValue\)/);
  assert.match(button, /Show Life areas/);
  assert.match(button, /Show the calendar week/);
  assert.match(button, /\.accessibilityAddTraits\(selected \? \.isSelected : \[\]\)/);
  assert.match(button, /"life-nav-" \+ item\.rawValue\.lowercased\(\)/);
});

test("Life/Week artwork, label and sizing are unchanged", () => {
  const label = section(
    "private func lifeWeekToggleLabel(",
    "private func crown(",
  );
  assert.match(label, /SpreadBrandMark\(size: 23\)/);
  assert.match(label, /SpreadIcon\(name: "lucide-calendar-days", size: 18\)/);
  assert.match(label, /Text\(item\.rawValue\)/);
  assert.match(label, /\.font\(\.caption2\.weight\(\.semibold\)\)/);
  assert.match(label, /\.frame\(width: 51\)\.frame\(minHeight: 52\)/);
  assert.match(label, /selected \? Spread\.onAccent : Spread\.ink/);
  assert.match(label, /selected \? Spread\.accent : Color\.clear/);
});
