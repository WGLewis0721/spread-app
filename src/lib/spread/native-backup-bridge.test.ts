import assert from "node:assert/strict";
import test from "node:test";
import type { ParsedBackup } from "./backup.ts";
import { backupRequestOf, handleBackupRequest, type BackupDeps, type Inspected } from "./native-backup-bridge.ts";
import { NO_REMOVALS, emptyCounts, type MergeOptions, type MergePreview } from "./plan-merge.ts";

const profile = (id: string, name: string, readable = true) => ({
  id, name, readable, spreads: ["Work"], weeks: 3, tasks: 14, range: "Jan 5 to Feb 1",
});

const fullBackup = {
  kind: "full",
  payload: {},
  summary: { profiles: [profile("a", "Home"), profile("b", "Work", false)], weeks: 3, tasks: 14 },
} as unknown as ParsedBackup;

const weekBackup = { kind: "week", data: {}, summary: {} } as unknown as ParsedBackup;

const merge: MergePreview = {
  profileName: "Work",
  revision: "rev-now",
  basedOn: "rev-then",
  stale: true,
  counts: { ...emptyCounts(), areasAdded: 1, hoursChanged: 2 },
  areas: [{ name: "Learning", change: "added", after: "2 h a week" }],
  areasOmitted: 0,
  issues: [],
};

const BLOCKED: MergePreview = { ...merge, counts: emptyCounts(), areas: [], issues: ["Week 2026-11-09: \"Work\" would have 2 hours of day hours, more than its 1-hour budget."] };

function deps(overrides: Partial<BackupDeps> = {}): BackupDeps & { applied: string[][]; merged: string[]; seen: MergeOptions[] } {
  const applied: string[][] = [];
  const merged: string[] = [];
  const seen: MergeOptions[] = [];
  const inspected: Record<string, Inspected> = {
    good: { kind: "backup", parsed: fullBackup },
    week: { kind: "backup", parsed: weekBackup },
    bad: { kind: "failed", message: "That file isn’t a Spread backup or plan, or it is damaged." },
    plan: { kind: "failed", message: "This plan file has problems, so nothing was changed.", issues: ["Week 2026-11-16: hours must be half hours."] },
    merge: { kind: "merge", merge },
    blocked: { kind: "merge", merge: BLOCKED },
  };
  return {
    applied,
    merged,
    seen,
    buildText: async () => "FILE-TEXT",
    buildPlan: async () => ({ name: "Spread-plan-2026-11-09.json", text: "PLAN-TEXT" }),
    fileName: () => "Spread-2026-11-09.spread",
    inspect: async (text, options) => {
      seen.push(options);
      return inspected[text] ?? { kind: "failed", message: "unknown" };
    },
    apply: async (_backup, select) => {
      applied.push(select);
      return { ok: true, message: "2 profiles restored." };
    },
    mergeApply: async (text, options, revision) => {
      merged.push(`${text}|${options.removeAreas}|${options.removeItems}|${revision}`);
      return { ok: true, message: "Plan merged into Work. 1 week changed. A safety copy was saved first." };
    },
    ...overrides,
  };
}

test("backupFile returns the backup file and the plan file, each with its name and text", async () => {
  const reply = await handleBackupRequest({ type: "backupFile" }, deps());
  assert.deepEqual(reply, {
    ok: true,
    kind: "file",
    name: "Spread-2026-11-09.spread",
    text: "FILE-TEXT",
    planName: "Spread-plan-2026-11-09.json",
    planText: "PLAN-TEXT",
  });
});

test("if the plan file cannot be made, the backup says so and nothing is offered to save", async () => {
  const reply = await handleBackupRequest({ type: "backupFile" }, deps({
    buildPlan: async () => { throw new Error("There are too many areas for a plan file."); },
  }));
  assert.equal(reply.ok, false);
  assert.equal(reply.ok === false && reply.error, "failed");
  assert.equal(reply.ok === false && reply.message.includes("Nothing was saved"), true);
});

test("restorePreview lists each profile with its counts and only what the sheet needs", async () => {
  const reply = await handleBackupRequest({ type: "restorePreview", text: "good", options: NO_REMOVALS }, deps());
  assert.deepEqual(reply, {
    ok: true,
    kind: "preview",
    profiles: [
      { id: "a", name: "Home", readable: true, weeks: 3, tasks: 14, range: "Jan 5 to Feb 1" },
      { id: "b", name: "Work", readable: false, weeks: 3, tasks: 14, range: "Jan 5 to Feb 1" },
    ],
    weeks: 3,
    tasks: 14,
  });
});

test("a file that cannot be read is refused with the reason, and nothing is restored", async () => {
  const d = deps();
  const reply = await handleBackupRequest({ type: "restorePreview", text: "bad", options: NO_REMOVALS }, d);
  assert.equal(reply.ok === false && reply.error, "unreadable");
  assert.equal(reply.ok === false && reply.message.includes("isn’t a Spread backup"), true);
  await handleBackupRequest({ type: "restoreApply", text: "bad", select: ["a"] }, d);
  assert.deepEqual(d.applied, []);
});

test("a plan file with problems returns its message and every problem to the sheet", async () => {
  const reply = await handleBackupRequest({ type: "restorePreview", text: "plan", options: NO_REMOVALS }, deps());
  assert.equal(reply.ok === false && reply.error, "unreadable");
  assert.equal(reply.ok === false && reply.message, "This plan file has problems, so nothing was changed.");
  assert.deepEqual(reply.ok === false && reply.issues, ["Week 2026-11-16: hours must be half hours."]);
});

test("a one-week file from the older version is refused with a plain reason", async () => {
  const reply = await handleBackupRequest({ type: "restorePreview", text: "week", options: NO_REMOVALS }, deps());
  assert.equal(reply.ok === false && reply.error, "week-file");
  assert.equal(reply.ok === false && reply.message.includes("full backups"), true);
});

test("restoreApply with no profiles chosen is refused before anything is written", async () => {
  const d = deps();
  const reply = await handleBackupRequest({ type: "restoreApply", text: "good", select: [] }, d);
  assert.equal(reply.ok === false && reply.error, "no-selection");
  assert.deepEqual(d.applied, []);
});

test("restoreApply passes the chosen profiles to the existing restore and reports its message", async () => {
  const d = deps();
  const reply = await handleBackupRequest({ type: "restoreApply", text: "good", select: ["a"] }, d);
  assert.deepEqual(d.applied, [["a"]]);
  assert.deepEqual(reply, { ok: true, kind: "restored", message: "2 profiles restored." });
});

test("a failed restore reports the failure and its message", async () => {
  const d = deps({
    apply: async () => ({ ok: false, message: "There is room for 1 more. Choose fewer profiles to restore." }),
  });
  const reply = await handleBackupRequest({ type: "restoreApply", text: "good", select: ["a", "b"] }, d);
  assert.deepEqual(reply, {
    ok: false,
    error: "failed",
    message: "There is room for 1 more. Choose fewer profiles to restore.",
  });
});

test("a plan that merges is previewed as a merge, with the removal choices it was read with", async () => {
  const d = deps();
  const options: MergeOptions = { removeAreas: true, removeItems: false };
  const reply = await handleBackupRequest({ type: "restorePreview", text: "merge", options }, d);
  assert.deepEqual(reply, { ok: true, kind: "merge", merge });
  assert.deepEqual(d.seen, [options]);
});

test("a merge that is blocked still returns its reasons, so the sheet can show them", async () => {
  const reply = await handleBackupRequest({ type: "restorePreview", text: "blocked", options: NO_REMOVALS }, deps());
  assert.equal(reply.ok === true && reply.kind, "merge");
  assert.deepEqual(reply.ok === true && reply.kind === "merge" ? reply.merge.issues : [], BLOCKED.issues);
});

test("a merge plan cannot be restored as a new profile: the reply points to Merge", async () => {
  const d = deps();
  const reply = await handleBackupRequest({ type: "restoreApply", text: "merge", select: ["a"] }, d);
  assert.equal(reply.ok === false && reply.error, "failed");
  assert.match(reply.ok === false ? reply.message : "", /Use Merge/);
  assert.deepEqual(d.applied, []);
});

test("mergeApply passes the removal choices and the previewed version to the merge", async () => {
  const d = deps();
  const reply = await handleBackupRequest({
    type: "mergeApply", text: "merge", options: { removeAreas: false, removeItems: true }, revision: "rev-now",
  }, d);
  assert.deepEqual(d.merged, ["merge|false|true|rev-now"]);
  assert.deepEqual(reply, {
    ok: true,
    kind: "restored",
    message: "Plan merged into Work. 1 week changed. A safety copy was saved first.",
  });
});

test("a merge that is refused says why, with its reasons, and nothing is changed", async () => {
  const d = deps({
    mergeApply: async () => ({
      ok: false,
      message: "The profile changed after this preview, so nothing was changed. Preview the plan again.",
    }),
  });
  const reply = await handleBackupRequest({ type: "mergeApply", text: "merge", options: NO_REMOVALS, revision: "old" }, d);
  assert.equal(reply.ok === false && reply.error, "merge-refused");
  assert.match(reply.ok === false ? reply.message : "", /Preview the plan again/);
});

test("only the four backup requests are taken by the bridge; planner commands pass through", () => {
  assert.deepEqual(backupRequestOf({ requestId: "1", action: { type: "backupFile" } }), { type: "backupFile" });
  assert.deepEqual(backupRequestOf({ action: { type: "restorePreview", text: "x" } }),
    { type: "restorePreview", text: "x", options: NO_REMOVALS });
  assert.deepEqual(backupRequestOf({ action: { type: "restorePreview", text: "x", removeAreas: true, removeItems: true } }),
    { type: "restorePreview", text: "x", options: { removeAreas: true, removeItems: true } });
  assert.deepEqual(backupRequestOf({ action: { type: "restoreApply", text: "x", select: ["a"] } }),
    { type: "restoreApply", text: "x", select: ["a"] });
  assert.deepEqual(backupRequestOf({ action: { type: "mergeApply", text: "x", removeItems: true, revision: "r1" } }),
    { type: "mergeApply", text: "x", options: { removeAreas: false, removeItems: true }, revision: "r1" });
  assert.deepEqual(backupRequestOf({ action: { type: "mergeApply", text: "x" } }),
    { type: "mergeApply", text: "x", options: NO_REMOVALS, revision: "" }, "a missing revision never matches, so the merge refuses");
  assert.equal(backupRequestOf({ action: { type: "assignTask" } }), null);
  assert.equal(backupRequestOf({ action: { type: "restorePreview" } }), null);
  assert.equal(backupRequestOf(null), null);
  assert.equal(backupRequestOf("backupFile"), null);
});
