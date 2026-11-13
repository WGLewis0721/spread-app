import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const get = (path) => readFileSync(path, "utf8");

const dispatch = get("src/lib/spread/native-v2-dispatch.ts");
const store = get("src/lib/spread/store.ts");
const weekCopy = get("src/lib/spread/week-copy.ts");
const sheet = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifePlanAheadSheet.swift");
const planner = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Planner/LivePlanner.swift");

test("the copy is one planner module, and the store writes only what that module plans", () => {
  assert.match(weekCopy, /export function planWeekCopy\(data: SpreadData, batch: number\): WeekCopyResult/);
  assert.match(store, /copyWeekForward: \(batch\) => \{[\s\S]*planWeekCopy\(get\(\)\.data, batch\)[\s\S]*if \(!result\.preview\.eligible \|\| !result\.data\) return false;[\s\S]*commit\(set, result\.data\)/);
  // A copy never repeats by rule: the module writes plain weeks.
  assert.doesNotMatch(weekCopy, /recurringPlans|applyRecurringPlan/);
});

test("the planner reads the preview and writes the copy as two separate actions", () => {
  assert.match(dispatch, /z\.literal\("previewWeekCopy"\)/);
  assert.match(dispatch, /z\.literal\("copyWeekForward"\)/);
  assert.match(dispatch, /"previewWeekCopy"\]\.includes\(command\.action\.type\)|"previewWeekCopy"\]\.includes/);
  assert.match(dispatch, /if \(a\.type === "previewWeekCopy"\)/);
  assert.match(dispatch, /case "copyWeekForward":[\s\S]*state\.copyWeekForward\(a\.batch\)/);
  // The copy is one Life-undoable change, so Undo returns the weeks it wrote.
  assert.match(dispatch, /"saveRecurringPlan", "stopRecurringPlan", "copyWeekForward"\]\.includes\(a\.type\)/);
});

test("the sheet previews the copy first, and confirms only a preview that is eligible", () => {
  assert.match(sheet, /planMode = "copy"/);
  assert.match(sheet, /accessibilityIdentifier\("plan-ahead-copy-week"\)/);
  assert.match(sheet, /await planner\.previewWeekCopy\(batch: copyBatch\)/);
  assert.match(sheet, /\.disabled\(copySaving \|\| planner\.busy \|\| copyPreview\?\.eligible != true\)/);
  assert.match(sheet, /planner\.send\(\["type": "copyWeekForward", "batch": copyBatch\]\)/);
  // Each week is listed with its status in words, not only by colour.
  assert.match(sheet, /"Will be filled" : "Already planned, kept"/);
});

test("the planner reads the copy preview without changing the week, and checks the week did not move", () => {
  assert.match(planner, /func previewWeekCopy\(batch: Int\) async -> NativeWeekCopyPreview\?/);
  assert.match(planner, /"type": "previewWeekCopy", "batch": batch/);
  assert.match(planner, /state\?\.envelope\.snapshot\.weekKey == origin\?\.envelope\.snapshot\.weekKey/);
});
