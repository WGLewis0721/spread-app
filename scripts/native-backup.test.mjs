import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const get = (path) => readFileSync(path, "utf8");

const bridge = get("src/lib/spread/native-backup-bridge.ts");
const host = get("src/lib/spread/native-v2-host.ts");
const store = get("src/lib/spread/store.ts");
const restoreApply = get("src/lib/spread/restore-apply.ts");
const webScreen = get("src/spread/screens/spread-app.tsx");
const livePlanner = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Planner/LivePlanner.swift");
const backupTypes = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Planner/LivePlannerBackup.swift");
const sheet = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/BackupRestoreSheet.swift");
const liveRoot = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift");
const manage = get("ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift");

test("the file is built, read and restored by the existing functions, not by new backup code", () => {
  // The web save and the native bridge both call buildBackupText, which is the save's own logic moved out.
  assert.match(store, /export async function buildBackupText\(data: SpreadData\): Promise<string>/);
  assert.match(store, /export async function saveBackup[\s\S]*buildBackupText\(data\)/);
  // The web screen and the native bridge both run the same restore.
  assert.match(restoreApply, /export async function applyRestore\(/);
  assert.match(webScreen, /import \{ applyRestore \} from "@\/lib\/spread\/restore-apply"/);
  assert.doesNotMatch(webScreen, /async function applyRestore\(/);
  assert.match(bridge, /import type \{ ParsedBackup \} from "\.\/backup\.ts"/);
  assert.match(host, /parseAnyBackup/);
  assert.match(host, /applyRestore/);
});

test("the bridge takes exactly the three backup requests, and the native side sends the same three", () => {
  for (const type of ["backupFile", "restorePreview", "restoreApply"]) {
    assert.match(bridge, new RegExp(`"${type}"`));
    assert.match(backupTypes + livePlanner, new RegExp(`"type": "${type}"`));
  }
});

test("the host answers backup requests before the planner's dispatcher, so planner commands are unchanged", () => {
  const routed = host.indexOf("backupRequestOf(request)");
  const dispatched = host.indexOf("router.dispatch(request)");
  assert.ok(routed > 0, "the host checks for a backup request");
  assert.ok(dispatched > routed, "the backup check runs before the planner dispatch");
});

test("the native sheet has one place for backup and restore, reached from the existing entries", () => {
  assert.match(liveRoot, /case \.backup:\s*\n\s*BackupRestoreSheet\(planner: planner\)/);
  assert.match(liveRoot, /MoreSheet\(planner: planner, focusTimer: focusTimer, backup: \{ sheet = \.backup \}/);
  assert.match(manage, /Button \{\s*\n\s*backup\(\)\s*\n\s*\} label: \{\s*\n\s*Label\("Backup and restore"/);
  assert.match(liveRoot, /Button\("Backup and restore"\) \{ sheet = \.backup \}/);
  assert.match(liveRoot, /Text\("Back up"\)\.tapTarget\(\)\s*\}\s*\n\s*\.accessibilityIdentifier\("back-up"\)/);
  // The native app no longer sends people to the web planner for backup. "Open existing planner" is only for a planner that will not load.
  assert.doesNotMatch(liveRoot + manage, /Open web planner/);
});

test("the backup sheet has the two actions, a preview, and identifiers the UI tests can use", () => {
  for (const id of ["backup-make", "backup-choose", "backup-restore", "backup-message"]) {
    assert.match(sheet, new RegExp(`accessibilityIdentifier\\("${id}"\\)`));
  }
  assert.match(sheet, /Button \{ makeBackup\(\) \}/);
  assert.match(sheet, /\.fileImporter\(isPresented: \$importing/);
  assert.match(sheet, /WeekExport\.share\(items\)/);
  // Restore only adds profiles: the sheet never calls the replace-the-open-plan path.
  assert.doesNotMatch(sheet, /replaceData|rollback|Replace/);
});

test("the native planner exposes the three calls and a failure says why, in plain words", () => {
  assert.match(livePlanner, /func makeBackupFile\(\) async -> Result<BackupFile, BackupFailure>/);
  assert.match(livePlanner, /func previewBackup\(_ text: String\) async -> Result<BackupPreview, BackupFailure>/);
  assert.match(livePlanner, /func restoreBackup\(_ text: String, select: \[String\]\) async -> Result<String, BackupFailure>/);
  assert.match(livePlanner, /Your plan is unchanged\./);
});

const planFile = get("src/lib/spread/plan-file.ts");
const cloudFlags = get("src/lib/spread/cloud-flags.ts");

test("the plan file is built and read by one module, and the backup reply carries it", () => {
  assert.match(planFile, /export function buildPlanText\(/);
  assert.match(planFile, /export function parsePlanFile\(/);
  assert.match(host, /buildPlanText\(state\.data, name\)/);
  assert.match(host, /parsePlanFile\(text\)/);
  assert.match(bridge, /planName: plan\.name/);
  assert.match(backupTypes, /let planText: String\?/);
});

test("both files are written before the share sheet opens, and a large file is refused before it is read", () => {
  assert.match(sheet, /WeekExport\.share\(items\)/);
  assert.match(sheet, /fileSize, size > 5_000_000/);
});

test("the sheet says there are two files, that the backup cannot be edited, and what the plan leaves out", () => {
  assert.match(sheet, /makes two files/);
  assert.match(sheet, /can't be edited/);
  assert.match(sheet, /leaves out settings, attachments, rich notes, recurring plans and the recycle bin/);
});

test("the sheet adds no buttons: its three actions are the only Button blocks, plus the sheet's Done", () => {
  assert.equal((sheet.match(/\bButton \{/g) ?? []).length, 3);
  assert.equal((sheet.match(/Button\("Done"\)/g) ?? []).length, 1);
});

test("iCloud stays off in this build, and the backup sheet offers no iCloud action", () => {
  assert.match(cloudFlags, /backup: flag\(env\.VITE_SPREAD_CLOUD_BACKUP, false\)/);
  assert.match(cloudFlags, /sync: flag\(env\.VITE_SPREAD_CLOUD_SYNC, false\)/);
  assert.doesNotMatch(sheet, /iCloud|CloudKit|SpreadCloud/);
});
