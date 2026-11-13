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
  assert.match(timer, /SpreadFocusControls\.apply/);
  assert.match(timer, /SpreadFocusLiveActivityController\.end/);
  assert.match(focusController, /static func refresh/);
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
const focusController = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusLiveActivityController.swift");
const focusControls = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusIntents.swift");
const focusSession = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusSession.swift");
const focusLocalAlerts = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadLocalAlerts.swift");
const timerWidgetSource = get("ios/App/SpreadWidget/SpreadTimerWidget.swift");
const focusSheet = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimerSheet.swift");
const dayPlan = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadDayPlan.swift");

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
    "SpreadWidgetShared.swift", "SpreadFocusActivityAttributes.swift", "SpreadFocusSession.swift",
    "SpreadFocusLiveActivityController.swift", "SpreadFocusIntents.swift", "SpreadLocalAlerts.swift",
    "SpreadFocusWidgetPublisher.swift", "SpreadDayPlan.swift"]) {
    assert.ok(compiled.includes(name), `${name} must be in the widget Sources phase`);
  }
  assert.match(source, /SpreadTimerWidget\(\)/);
  assert.match(source, /SpreadLifeCardsWidget\(\)/);
  assert.match(source, /SpreadFocusLiveActivityWidget\(\)/);
});

test("the Timer widget has small and large sizes and counts down by itself", () => {
  assert.match(timerSource, /supportedFamilies\(\[\.systemSmall, \.systemMedium, \.systemLarge\]\)/);
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
  assert.match(focusPublisher, /bool\(forKey: SpreadWidgetShared\.todayEnabledKey\)/);
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
  assert.match(focusTimer, /private func commit\(_ next: SpreadFocusSession\?, notify: Bool\) \{[\s\S]*SpreadFocusControls\.apply\(next, notify: notify\)[\s\S]*\}/);
  assert.match(focusControls, /SpreadFocusWidgetPublisher\.publish\(session\)/);
  assert.match(focusControls, /SpreadFocusLiveActivityController\.refresh\(session\)/);
  // The mirror is rebuilt from the saved session when the opt-in changes mid-session.
  assert.match(moreSheet, /SpreadFocusWidgetPublisher\.republishFromStore\(\)/);
  // The Dynamic Island, Lock Screen, Timer widget and Today panel all open the Focus Timer.
  assert.match(source, /context\.attributes\.day == nil \? "spread:\/\/focus" : "spread:\/\/today"/);
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

test("every widget follows the system's light or dark appearance", () => {
  // The Timer and Today widgets use semantic colors only, so the system recolors them itself.
  for (const text of [timerSource, source]) {
    assert.doesNotMatch(text, /Color\.(white|black)|\.foregroundStyle\(\.(white|black)\)|Color\(red:/);
    assert.match(text, /containerBackground\(\.background, for: \.widget\)/);
  }
  // The Life card reads the appearance and picks a palette. Dark keeps the app's look, light uses cream
  // and navy text. No text or fill is fixed to white.
  assert.match(lifeCardsSource, /@Environment\(\\\.colorScheme\) private var scheme/);
  assert.match(lifeCardsSource, /SpreadLifeCardPalette\.make\(scheme\)/);
  assert.match(lifeCardsSource, /SpreadLifeCardBackground\(colorHex: card\.colorHex, scheme: scheme\)/);
  assert.match(lifeCardsSource, /if scheme == \.dark/);
  assert.doesNotMatch(lifeCardsSource, /\.foregroundStyle\(Color\.white\)|\.tint\(\.white\)/);
});

test("the type-check job compiles the same widget files as the widget target", () => {
  const workflow = get(".github/workflows/native-typecheck.yml");
  const widgetStep = workflow.slice(workflow.indexOf("swiftc -typecheck -parse-as-library"),
    workflow.indexOf("Type-check the native Swift package"));
  const listed = [...widgetStep.matchAll(/ios\/[^\s]+\.swift/g)].map(([path]) => path.split("/").pop()).sort();
  const compiled = widgetSourceNames().map((path) => path.split("/").pop()).sort();
  assert.deepEqual(listed, compiled);
});

test("every surface uses the same focus intents, and the timer's sizes share one rule set", () => {
  for (const name of ["StartSpreadFocusIntent", "PauseSpreadFocusIntent", "ResumeSpreadFocusIntent",
    "ForwardSpreadFocusIntent", "StopSpreadFocusIntent", "CancelSpreadFocusIntent"]) {
    assert.match(focusControls, new RegExp(`struct ${name}: LiveActivityIntent`));
  }
  // The Timer widget picks its controls from the shared rules, so small, medium and large cannot drift apart.
  assert.match(timerWidgetSource, /SpreadFocusControlRules\.all\(/);
  assert.match(timerWidgetSource, /SpreadFocusControlRules\.shown\(/);
  // One shared button view draws every control, for the widget sizes and the island alike.
  assert.match(timerWidgetSource, /struct SpreadFocusControlButton: View/);
  assert.match(timerWidgetSource, /Button\(intent: PauseSpreadFocusIntent\(\)\)/);
  assert.match(timerWidgetSource, /Button\(intent: ResumeSpreadFocusIntent\(\)\)/);
  assert.match(timerWidgetSource, /Button\(intent: ForwardSpreadFocusIntent\(\)\)/);
  assert.match(timerWidgetSource, /Button\(intent: StopSpreadFocusIntent\(\)\)/);
  assert.match(timerWidgetSource, /Button\(intent: CancelSpreadFocusIntent\(\)\)/);
  assert.match(timerWidgetSource, /Button\(intent: StartSpreadFocusIntent\(\)\)/);
  // The island reuses that button view and the same rules, so its controls match the widgets.
  assert.match(source, /SpreadFocusIslandControls\(status:/);
  assert.match(source, /SpreadFocusControlRules\.all\(/);
  assert.match(source, /SpreadFocusControlButton\(control: kind/);
  // On the Lock Screen and the island the controls are icon only: a text label wrapped mid-word there.
  assert.match(source, /SpreadFocusControlButton\(control: kind, nextLabel: status\.state\.nextLabel, iconOnly: true\)/);
  assert.match(timerWidgetSource, /if iconOnly \{\s*controlButton\s*\.labelStyle\(\.iconOnly\)/);
  // With the switch off, the widget says so, and the app records the switch for it.
  assert.match(timerWidgetSource, /Turn on Show Today on widgets in More to see your timer here/);
  assert.match(focusPublisher, /shared\.set\(true, forKey: SpreadWidgetShared\.timerEnabledMirrorKey\)/);
  assert.match(focusPublisher, /shared\.set\(enabled, forKey: SpreadWidgetShared\.timerEnabledMirrorKey\)/);
  // The island no longer uses the old single-control button, so it cannot show a lone control again.
  assert.doesNotMatch(source, /SpreadFocusActionButton\(/);
});

test("a break or the next round never starts on its own", () => {
  // Only the person's taps start a stretch: the intents and the timer's continue action.
  const callers = [focusControls, focusTimer].map((text) => (text.match(/followUp\(|startPlan\(|\.stretch\(/g) || []).length);
  assert.ok(callers[0] >= 1 && callers[1] >= 1);
  const reconcileBody = focusTimer.slice(focusTimer.indexOf("func reconcile()"), focusTimer.indexOf("private func commit"));
  assert.doesNotMatch(reconcileBody, /followUp|startPlan|stretch/);
  // The island's ended stretch is shown as waiting from the stale date, without the app running.
  assert.match(timerWidgetSource, /isStale/);
  assert.match(focusController, /staleDate: session\.phase == \.running \? session\.endAt : nil/);
});

test("the focus timer's record lives in the shared App Group, not the app's private defaults", () => {
  assert.match(focusSession, /static let appGroup = "group\.com\.graymatter\.spread"/);
  assert.match(focusSession, /static func load\(_ defaults: UserDefaults = SpreadFocusStore\.shared\)/);
  assert.doesNotMatch(focusTimer, /UserDefaults\.standard\.(data|set|removeObject)\(forKey: key\)/);
  assert.match(focusSession, /static func migrate\(from legacy: UserDefaults = \.standard/);
});

test("Live Activity relevance puts a running stretch above one waiting for a tap", () => {
  assert.match(focusController, /case \.running, \.paused: return 1\.0/);
  assert.match(focusController, /case \.finished: return 0\.8/);
  assert.match(focusLocalAlerts, /Start your break when you're ready\./);
});

test("today's planned block is offered on the widget and started from the island and the app", () => {
  // The Timer widget and the sheet start the block through the same intent and the same timer method.
  assert.match(focusControls, /struct StartSpreadBlockIntent: LiveActivityIntent/);
  assert.match(timerWidgetSource, /Button\(intent: StartSpreadBlockIntent\(\)\)/);
  assert.match(focusTimer, /func startBlock\(_ offered: SpreadOfferedBlock, notify: Bool\) -> Bool/);
  assert.match(focusSheet, /timer\.startBlock\(offered, notify: notifyWhenDone\)/);
  assert.match(focusSheet, /accessibilityIdentifier\("focus-start-block"\)/);
  // A block reads the planner only. The publisher never writes the plan, and it is cleared with the switch.
  const publisher = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadDayPlanPublisher.swift");
  assert.doesNotMatch(publisher, /planner\.send|updateRole|SpreadData|store\./);
  assert.match(publisher, /guard UserDefaults\.standard\.bool\(forKey: SpreadWidgetShared\.todayEnabledKey\) else/);
  assert.match(publisher, /snapshot\.weekKey == PlannerDates\.currentWeekKey\(\)/);
  assert.match(liveRoot, /SpreadDayPlanPublisher\.clear\(\)/);
});

test("a finished block is recorded only on its final focus round", () => {
  assert.match(dayPlan, /static func recordCompletion\(of session: SpreadFocusSession/);
  assert.match(dayPlan, /session\.currentKind == \.focus, session\.roundNumber == session\.roundCount/);
  assert.match(focusControls, /if let session \{ SpreadDayPlanStore\.recordCompletion\(of: session\) \}/);
});

test("the island opens the planned day, and a hand-started session still opens the timer", () => {
  assert.match(source, /context\.attributes\.day == nil \? "spread:\/\/focus" : "spread:\/\/today"/);
  assert.match(focusController, /day: session\.blockDay/);
});

// The switches that go with the widgets, the island and the focus timer. Each one writes a key the code reads,
// its change handler does what the switch says, and the surface it controls shows the on or off state.
{
  const manage = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift");
  const liveRoot = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift");
  const focusSheet = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimerSheet.swift");
  const liveActivity = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusLiveActivityController.swift");
  const intents = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusIntents.swift");
  const alerts = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadLocalAlerts.swift");
  const dayPlanPublisher = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadDayPlanPublisher.swift");
  const focusPublisher = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadFocusWidgetPublisher.swift");
  const lifeCardsPublisher = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadLifeCardsPublisher.swift");
  const lifeCardsWidget = get("ios/App/SpreadWidget/SpreadLifeCardsWidget.swift");
  const todayWidget = get("ios/App/SpreadWidget/SpreadTodayWidget.swift");

  // The source from one marker onward, so each handler is checked on its own.
  const handler = (text, marker, length = 700) => {
    const at = text.indexOf(marker);
    return at < 0 ? "" : text.slice(at, at + length);
  };

  test("Show Today on widgets: on publishes today's planned block, off clears it", () => {
    assert.match(manage, /@AppStorage\(SpreadWidgetPublisher\.enabledKey\) private var todayWidgetsEnabled/);
    const onChange = handler(manage, "onChange(of: todayWidgetsEnabled)", 1000);
    assert.match(onChange, /SpreadDayPlanPublisher\.publish\(/);
    assert.match(onChange, /SpreadWidgetPublisher\.revoke\(\)/);
    assert.match(onChange, /SpreadDayPlanPublisher\.clear\(\)/);
    assert.match(todayWidget, /Open Spread to enable Today widget/);
  });

  test("Show Life cards on widgets: on publishes the cards, off revokes them and the widget says how to turn it on", () => {
    assert.match(manage, /@AppStorage\(SpreadLifeCardsPublisher\.enabledKey\) private var lifeCardsWidgetsEnabled/);
    const onChange = handler(manage, "onChange(of: lifeCardsWidgetsEnabled)", 400);
    assert.match(onChange, /SpreadLifeCardsPublisher\.publish\(/);
    assert.match(onChange, /SpreadLifeCardsPublisher\.revoke\(\)/);
    assert.match(lifeCardsPublisher, /guard UserDefaults\.standard\.bool\(forKey: enabledKey\) else \{\s*revoke\(\)/);
    assert.match(lifeCardsWidget, /Turn on Life cards on widgets in More, then open Spread\./);
  });

  test("the names switch rewrites block labels and the focus title as soon as it changes", () => {
    assert.match(liveRoot, /@AppStorage\("native\.focus\.showNameOutsideApp"\) private var showNamesOutsideApp/);
    const onChange = handler(liveRoot, "onChange(of: showNamesOutsideApp)", 500);
    assert.match(onChange, /SpreadDayPlanPublisher\.publish\(/);
    assert.match(onChange, /SpreadFocusWidgetPublisher\.republishFromStore\(\)/);
    for (const file of [focusSheet, liveActivity, focusPublisher, dayPlanPublisher]) {
      assert.match(file, /native\.focus\.showNameOutsideApp/);
    }
    assert.match(focusSheet, /Life area names appear on the Lock Screen, the Dynamic Island and the timer widget only while the name switch is on/);
  });

  test("the notification switch asks for permission on, and cancels its alerts off", () => {
    assert.match(focusSheet, /@AppStorage\("native\.focus\.notifyWhenDone"\)/);
    assert.match(intents, /UserDefaults\.standard\.bool\(forKey: "native\.focus\.notifyWhenDone"\)/);
    const onChange = handler(focusSheet, "onChange(of: notifyWhenDone)", 700);
    assert.match(onChange, /SpreadLocalAlerts\.authorized\(\)/);
    assert.match(onChange, /SpreadLocalAlerts\.cancelFocus\(\)/);
    assert.match(alerts, /case \.notDetermined:\s*return \(try\? await center\.requestAuthorization/);
  });

  test("the Live Activity switch starts, refreshes and ends the island, and nothing starts while it is off", () => {
    assert.match(focusSheet, /@AppStorage\("native\.focus\.liveActivityEnabled"\)/);
    assert.match(liveActivity, /static let enabledKey = "native\.focus\.liveActivityEnabled"/);
    assert.match(liveActivity, /static func start\(_ session: SpreadFocusSession\) \{\s*guard UserDefaults\.standard\.bool\(forKey: enabledKey\)/);
    const onChange = handler(focusSheet, "onChange(of: showLiveTimer)", 400);
    assert.match(onChange, /SpreadFocusLiveActivityController\.end\(\)/);
    assert.match(onChange, /SpreadFocusLiveActivityController\.refresh\(/);
  });

  test("every switch has an accessibility identifier, so the UI tests can flip it and read its state", () => {
    const controls = manage + focusSheet;
    for (const id of [
      "today-widget-enabled", "life-cards-widget-enabled", "focus-notification-toggle",
      "focus-live-activity-toggle", "focus-live-activity-name",
    ]) {
      assert.match(controls, new RegExp(`accessibilityIdentifier\\("${id}"\\)`));
    }
  });
}
