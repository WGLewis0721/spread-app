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

// --- Timer widget, Life cards widget and continuity ---------------------------------------------

const timerSource = get("ios/App/SpreadWidget/SpreadTimerWidget.swift");
const lifeCardsSource = get("ios/App/SpreadWidget/SpreadLifeCardsWidget.swift");
const shared = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadWidgetShared.swift");
const focusPublisher = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadFocusWidgetPublisher.swift");
const lifeCardsPublisher = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadLifeCardsPublisher.swift");
const focusTimer = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimer.swift");
const liveRoot = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift");
const lifeRoot = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRoot.swift");
const moreSheet = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift");
const sceneDelegate = get("ios/App/App/SceneDelegate.swift");

/** The widget extension's Sources build phase, as the list of file names it compiles. */
function widgetSourceNames() {
  const phase = project.match(/FACA00000000000000000007 \/\* Widget sources \*\/ = \{[^}]*files = \(([^)]*)\)/)[1];
  const names = [];
  for (const [, buildId] of phase.matchAll(/([0-9A-F]{24})/g)) {
    const file = project.match(new RegExp(`${buildId} /\\*[^*]*\\*/ = \\{ isa = PBXBuildFile; fileRef = ([0-9A-F]{24});`))[1];
    names.push(project.match(new RegExp(`${file} /\\*[^*]*\\*/ = \\{[^}]*path = ([^;]+);`))[1].replace(/"/g, ""));
  }
  return names;
}

test("the new widget files are compiled by the extension and listed in the bundle", () => {
  const compiled = widgetSourceNames().map((path) => path.split("/").pop());
  for (const name of ["SpreadTodayWidget.swift", "SpreadTimerWidget.swift", "SpreadLifeCardsWidget.swift",
    "SpreadWidgetShared.swift", "SpreadFocusActivityAttributes.swift"]) {
    assert.ok(compiled.includes(name), `${name} must be in the widget Sources phase`);
  }
  assert.match(source, /SpreadTimerWidget\(\)/);
  assert.match(source, /SpreadLifeCardsWidget\(\)/);
  assert.match(source, /SpreadFocusLiveActivityWidget\(\)/);
});

test("the Timer widget has small and large sizes and counts down by itself", () => {
  assert.match(timerSource, /supportedFamilies\(\[\.systemSmall, \.systemLarge\]\)/);
  // A running session carries an absolute deadline, so the digits tick with no refresh.
  assert.match(timerSource, /Text\(timerInterval:/);
  // And the timeline has an entry at the deadline, so the face flips to Finished by itself.
  assert.match(timerSource, /timelineDates\(from: now\)/);
  assert.match(timerSource, /widgetURL\(SpreadWidgetLink\.focus\.url\)/);
  assert.match(timerSource, /state\.isFinished\(at: date\)/);
});

test("the Today widget shows the timer on the medium size only", () => {
  assert.match(source, /family == \.systemMedium, let focus = entry\.focus/);
  assert.match(source, /Link\(destination: SpreadWidgetLink\.focus\.url\)/);
  assert.match(source, /\.supportedFamilies\(\[\.systemSmall, \.systemMedium, \.accessoryRectangular, \.accessoryCircular\]\)/);
});

test("the Life cards widget flips through cards and opens the tapped card", () => {
  assert.match(lifeCardsSource, /supportedFamilies\(\[\.systemMedium, \.systemLarge\]\)/);
  assert.match(lifeCardsSource, /struct SpreadLifeCardStepIntent: AppIntent/);
  assert.match(lifeCardsSource, /Button\(intent: SpreadLifeCardStepIntent\(step: step\)\)/);
  assert.match(lifeCardsSource, /widgetURL\(SpreadWidgetLink\.lifeCard\(card\.id\)\.url\)/);
  assert.match(lifeCardsSource, /Previous Life card/);
  assert.match(lifeCardsSource, /Next Life card/);
  // The intent stores a selection and redraws. It never touches the planner.
  assert.match(lifeCardsSource, /reloadTimelines\(ofKind: SpreadWidgetShared\.lifeCardsKind\)/);
  assert.doesNotMatch(lifeCardsSource, /native\.|planner|SpreadWidgetPublisher/);
  // The widget stops claiming to be live once the week turns.
  assert.match(lifeCardsSource, /value\.isCurrent\(at: Date\(\)\)/);
});

test("the shared widget file is plain Foundation and carries no task text", () => {
  assert.match(shared, /^import Foundation$/m);
  assert.doesNotMatch(shared, /import (SwiftUI|UIKit|WidgetKit|ActivityKit|AppIntents)/);
  assert.doesNotMatch(shared, /let (taskName|taskTitle|taskText|taskNotes|notes|text):/);
});

test("widget privacy: names appear only on opt-in, Life cards have their own switch", () => {
  assert.match(focusPublisher, /bool\(forKey: SpreadWidgetPublisher\.enabledKey\)/);
  assert.match(focusPublisher, /bool\(forKey: showNameKey\) \? session\.roleName : "Focus session"/);
  assert.match(lifeCardsPublisher, /static let enabledKey = "native\.widget\.lifeCardsEnabled"/);
  assert.match(lifeCardsPublisher, /guard UserDefaults\.standard\.bool\(forKey: enabledKey\) else/);
  assert.match(lifeCardsPublisher, /snapshot\.weekKey == PlannerDates\.currentWeekKey\(\)/);
  assert.match(moreSheet, /@AppStorage\(SpreadLifeCardsPublisher\.enabledKey\) private var lifeCardsWidgetsEnabled = false/);
  assert.match(moreSheet, /life-cards-widget-enabled/);
  // Never show a previous profile's Life cards after a profile switch.
  assert.match(liveRoot, /SpreadLifeCardsPublisher\.revoke\(\)/);
  assert.match(moreSheet, /SpreadLifeCardsPublisher\.revoke\(\)/);
  assert.match(moreSheet, /SpreadFocusWidgetPublisher\.revoke\(\)/);
});

test("continuity: one timer, one write path, every surface opens the right place", () => {
  // Every start, pause, resume, finish and expiry passes through persist(), which feeds the widgets.
  assert.match(focusTimer, /private func persist\(\) \{[\s\S]*SpreadFocusWidgetPublisher\.publish\(session\)[\s\S]*\}/);
  assert.match(focusTimer, /SpreadFocusLiveActivityController\.update/);
  // The mirror is rebuilt from the saved session when the opt-in changes mid-session.
  assert.match(moreSheet, /SpreadFocusWidgetPublisher\.republishFromStore\(\)/);
  // The Dynamic Island, Lock Screen, Timer widget and Today panel all open the Focus Timer.
  assert.match(source, /widgetURL\(URL\(string: "spread:\/\/focus"\)\)/);
  assert.match(timerSource, /SpreadWidgetLink\.focus\.url/);
  // A Life card link goes to today's week first, then to that card, and ignores an unknown card.
  assert.match(sceneDelegate, /url\.host == "life"/);
  assert.match(sceneDelegate, /native\.widget\.openLifeCard/);
  assert.match(lifeRoot, /func openLifeCardFromWidgetIfNeeded\(\)/);
  assert.match(lifeRoot, /func applyPendingWidgetCard\(\)/);
  assert.match(lifeRoot, /snapshot\.roles\.contains\(where: \{ \$0\.id == id \}\)/);
});

test("new widget files keep the font argument order Xcode 27.1 accepts", () => {
  for (const text of [timerSource, lifeCardsSource, source]) {
    assert.doesNotMatch(text, /\.system\(\.(?:largeTitle|title|title2|title3|caption|caption2|body|headline|subheadline),\s*weight:/);
  }
});
