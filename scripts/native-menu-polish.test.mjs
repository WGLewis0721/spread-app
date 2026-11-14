import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const get = (path) => readFileSync(path, "utf8");
const root = "ios/SpreadNativeV2/Sources/SpreadNativeV2/";
const plan = get(root + "Life/LifePlanAheadSheet.swift");
const recurrence = get(root + "Life/LifeRecurringPlanForm.swift");
const focus = get(root + "Focus/SpreadFocusTimerSheet.swift");

test("Plan Ahead has one primary entry and groups secondary paths", () => {
  const list = plan.slice(plan.indexOf("private var plansSections"), plan.indexOf("private var copyFirstWeek"));
  assert.match(list, /Make a new plan/);
  assert.match(list, /copyEntrySection/);
  assert.ok(list.indexOf("Make a new plan") < list.indexOf("copyEntrySection"));
  assert.match(list, /Text\("Other ways to plan"\)/);
  assert.match(list, /plan-ahead-copy-week/);
  assert.match(list, /plan-ahead-move-once/);
  assert.equal((list.match(/\.buttonStyle\(\.borderedProminent\)/g) ?? []).length, 1);
});

test("the three Plan Ahead review and commit actions remain persistent and guarded", () => {
  assert.match(plan, /safeAreaInset\(edge: \.bottom, spacing: 0\)/);
  assert.match(plan, /if copyPreview\?\.eligible == true \{ await confirmCopy\(\) \}/);
  assert.match(plan, /else \{ await requestCopyPreview\(\) \}/);
  assert.match(plan, /if preview\?\.eligible == true \{ await confirmTransfer\(\) \}/);
  assert.match(plan, /else \{ await requestPreview\(\) \}/);
  assert.match(plan, /plan-ahead-copy-confirm/);
  assert.match(plan, /plan-ahead-confirm/);
  assert.match(recurrence, /safeAreaInset\(edge: \.bottom, spacing: 0\)/);
  assert.match(recurrence, /if preview\?\.eligible == true \{ await confirm\(\) \}/);
  assert.match(recurrence, /else \{ await review\(\) \}/);
  assert.match(recurrence, /plan-ahead-repeat-primary/);
  assert.match(recurrence, /onBackToPlans/);
  assert.match(recurrence, /previewRevision/);
  assert.match(recurrence, /expectedRevision: revision/);
});

test("weekday chips respect size and expose actual selected day values", () => {
  assert.match(recurrence, /@ScaledMetric\(relativeTo: \.body\) private var dayChipWidth/);
  assert.match(recurrence, /LazyVGrid\(columns: \[GridItem\(\.adaptive\(minimum: dayChipWidth\)/);
  assert.match(recurrence, /frame\(maxWidth: \.infinity, minHeight: 44\)/);
  assert.match(recurrence, /accessibilityValue\(selected \? "Selected" : "Not selected"\)/);
  assert.match(recurrence, /accessibilityIdentifier\("plan-ahead-day-" \+ day\.code\)/);
  assert.match(recurrence, /DisclosureGroup\("Adjust day hours", isExpanded: \$dayHoursExpanded\)/);
  assert.match(recurrence, /Stepper\(value: dayAmount\(day\.code\), in: 0\.5\.\.\.24, step: 0\.5\)/);
  assert.match(recurrence, /onChange\(of: dayHours\)/);
});

test("previews adapt text instead of truncating affected dates", () => {
  assert.match(plan, /struct PlanAheadDetailRow: View/);
  assert.match(plan, /ViewThatFits\(in: \.horizontal\)/);
  assert.match(plan, /fixedSize\(horizontal: false, vertical: true\)/);
  assert.match(plan, /Preview the affected hours before moving them/);
  assert.match(plan, /Preview the affected weeks before copying/);
  assert.match(recurrence, /PlanAheadDetailRow\(/);
});

test("the Focus sheet separates active controls, completed rounds and optional settings", () => {
  assert.match(focus, /if session\.phase == \.finished \{/);
  const waiting = focus.slice(focus.indexOf("private func transportRow"), focus.indexOf("private func mediaActions"));
  assert.match(waiting, /focus-play-next/);
  assert.doesNotMatch(waiting, /focus-forward/);
  assert.match(focus, /private func mediaActions/);
  assert.match(focus, /private func endingActions/);
  assert.match(focus, /ViewThatFits\(in: \.horizontal\)/);
  // At least 44 pt, and free to grow with Dynamic Type (finalize plan OD10).
  assert.match(focus, /frame\((?:width: (?:44|Spread\.minimumTarget), height: (?:44|Spread\.minimumTarget)|minWidth: (?:44|Spread\.minimumTarget), minHeight: (?:44|Spread\.minimumTarget))\)/);
  assert.match(focus, /focus-pause/);
  assert.match(focus, /focus-resume/);
  assert.match(focus, /focus-forward/);
  assert.match(focus, /focus-stop/);
  assert.match(focus, /focus-cancel/);
  assert.match(focus, /Section\("Today's block"\)/);
  assert.match(focus, /Section\("Custom focus"\)/);
  assert.match(focus, /DisclosureGroup\("Set your own focus session"/);
  assert.match(focus, /DisclosureGroup\("Display & reminders"/);
  assert.match(focus, /focus-notification-toggle/);
  assert.match(focus, /focus-live-activity-toggle/);
  assert.match(focus, /focus-live-activity-name/);
  assert.match(focus, /accessibilityIdentifier\("focus-start"\)/);
  assert.match(focus, /accessibilityIdentifier\("focus-start-block"\)/);
});

test("Open tasks dismisses with Cancel, the leading word every draft sheet uses, and keeps Move (OD33, X8)", () => {
  const manage = get(root + "Sheets/ManageSheets.swift");
  assert.doesNotMatch(manage, /Not now/);
  assert.match(manage, /ToolbarItem\(placement: \.cancellationAction\) \{\s*Button\("Cancel"\) \{ dismiss\(\) \}/);
  assert.match(manage, /\? "Move" : "Move /);
});
