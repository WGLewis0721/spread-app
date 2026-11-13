import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const get = (path) => readFileSync(path, "utf8");
const project = get("ios/App/App.xcodeproj/project.pbxproj");
const appEntitlements = get("ios/App/App/App.entitlements");
const widgetEntitlements = get("ios/App/SpreadWidget/SpreadWidget.entitlements");
const source = get("ios/App/SpreadWidget/SpreadTodayWidget.swift");
const writer = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadWidgetPublisher.swift");

test("widget target is embedded and both targets have the same App Group", () => {
  assert.match(project, /name = SpreadWidget; productName = SpreadWidget/);
  assert.match(project, /Embed App Extensions/);
  assert.match(project, /SpreadWidget\.appex/);
  assert.match(project, /SpreadWidget\/Info\.plist/);
  assert.match(project, /SpreadWidget\/SpreadWidget\.entitlements/);
  assert.match(project, /SpreadTodayWidget\.swift/);
  for (const entitlements of [appEntitlements, widgetEntitlements]) {
    assert.match(entitlements, /com\.apple\.security\.application-groups/);
    assert.match(entitlements, /group\.com\.graymatter\.spread/);
  }
});

test("widget read model contains only counters, hours and dates", () => {
  assert.match(writer, /let doneTasks: Int/);
  assert.match(writer, /let totalTasks: Int/);
  assert.match(writer, /let hoursPlaced: Double/);
  assert.doesNotMatch(writer, /let taskName:|let taskTitle:|let taskText:/);
  assert.match(writer, /snapshot\.weekKey == PlannerDates\.currentWeekKey/);
  assert.match(writer, /SpreadWidgetPublisher/);
  assert.match(source, /widgetURL\(URL\(string: "spread:\/\/today"\)\)/);
});


test("one bounded Live Activity supports Lock Screen and Dynamic Island presentations", () => {
  const attrs = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusActivityAttributes.swift");
  const controller = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusLiveActivityController.swift");
  const info = get("ios/App/App/Info.plist");
  const timer = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimer.swift");
  assert.match(attrs, /struct SpreadFocusActivityAttributes: ActivityAttributes/);
  assert.match(attrs, /deadline: Date\?/);
  assert.match(project, /SpreadFocusActivityAttributes.swift/);
  assert.match(source, /ActivityConfiguration\(for: SpreadFocusActivityAttributes\.self\)/);
  assert.match(source, /DynamicIslandExpandedRegion/);
  assert.match(source, /compactLeading:/);
  assert.match(source, /compactTrailing:/);
  assert.match(source, /minimal:/);
  assert.match(info, /NSSupportsLiveActivities/);
  assert.match(controller, /ActivityAuthorizationInfo/);
  assert.match(controller, /dismissalPolicy: \.immediate/);
  assert.match(timer, /SpreadFocusLiveActivityController\.start/);
  assert.match(timer, /SpreadFocusLiveActivityController\.update/);
  assert.match(timer, /SpreadFocusLiveActivityController\.end/);
});

test("widget text-style fonts use SwiftUI's design-before-weight argument order", () => {
  // Xcode 27.1 rejects .system(.title3, weight:, design:) as a CGFloat initializer.
  assert.doesNotMatch(source, /\.system\(\.(?:title|title2|title3|caption|caption2|body|headline|subheadline),\s*weight:/);
  assert.match(source, /\.system\(\.title3,\s*design:\s*\.rounded,\s*weight:\s*\.semibold\)/);
  assert.match(source, /\.system\(\.title2,\s*design:\s*\.rounded,\s*weight:\s*\.semibold\)/);
});
