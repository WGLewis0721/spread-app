import assert from "node:assert/strict";
import test from "node:test";
import type { ParsedBackup } from "./backup.ts";
import { backupRequestOf, handleBackupRequest, type BackupDeps } from "./native-backup-bridge.ts";

const profile = (id: string, name: string, readable = true) => ({
  id, name, readable, spreads: ["Work"], weeks: 3, tasks: 14, range: "Jan 5 to Feb 1",
});

const fullBackup = {
  kind: "full",
  payload: {},
  summary: { profiles: [profile("a", "Home"), profile("b", "Work", false)], weeks: 3, tasks: 14 },
} as unknown as ParsedBackup;

const weekBackup = { kind: "week", data: {}, summary: {} } as unknown as ParsedBackup;

function deps(overrides: Partial<BackupDeps> = {}): BackupDeps & { applied: string[][] } {
  const applied: string[][] = [];
  return {
    applied,
    buildText: async () => "FILE-TEXT",
    fileName: () => "Spread-2026-11-09.spread",
    parse: async (text) => (text === "good" ? fullBackup : text === "week" ? weekBackup : null),
    apply: async (_backup, select) => {
      applied.push(select);
      return { ok: true, message: "2 profiles restored." };
    },
    ...overrides,
  };
}

test("backupFile returns the file name and the text the existing backup code builds", async () => {
  const reply = await handleBackupRequest({ type: "backupFile" }, deps());
  assert.deepEqual(reply, { ok: true, kind: "file", name: "Spread-2026-11-09.spread", text: "FILE-TEXT" });
});

test("restorePreview lists each profile with its counts and only what the sheet needs", async () => {
  const reply = await handleBackupRequest({ type: "restorePreview", text: "good" }, deps());
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

test("a file that is not a Spread backup is refused and nothing is restored", async () => {
  const d = deps();
  const reply = await handleBackupRequest({ type: "restorePreview", text: "nonsense" }, d);
  assert.equal(reply.ok, false);
  assert.equal(reply.ok === false && reply.error, "unreadable");
  await handleBackupRequest({ type: "restoreApply", text: "nonsense", select: ["a"] }, d);
  assert.deepEqual(d.applied, []);
});

test("a one-week file from the older version is refused with a plain reason", async () => {
  const reply = await handleBackupRequest({ type: "restorePreview", text: "week" }, deps());
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

test("only the three backup requests are taken by the bridge; planner commands pass through", () => {
  assert.deepEqual(backupRequestOf({ requestId: "1", action: { type: "backupFile" } }), { type: "backupFile" });
  assert.deepEqual(backupRequestOf({ action: { type: "restorePreview", text: "x" } }), { type: "restorePreview", text: "x" });
  assert.deepEqual(backupRequestOf({ action: { type: "restoreApply", text: "x", select: ["a"] } }),
    { type: "restoreApply", text: "x", select: ["a"] });
  assert.equal(backupRequestOf({ action: { type: "assignTask" } }), null);
  assert.equal(backupRequestOf({ action: { type: "restorePreview" } }), null);
  assert.equal(backupRequestOf(null), null);
  assert.equal(backupRequestOf("backupFile"), null);
});
