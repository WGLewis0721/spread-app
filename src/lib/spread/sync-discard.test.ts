import assert from "node:assert/strict";
import test from "node:test";
import { compareVectors } from "./clock.ts";
import type { Conflict, SyncItem } from "./merge.ts";
import { newSyncState, resolve, restoreDiscarded, type SyncState } from "./sync-state.ts";

const local: SyncItem = { id: "task:a", fields: { text: "from phone", done: false, week: "w", hat: "h" }, v: { phone: 2 }, at: "t1" };
const remote: SyncItem = { id: "task:a", fields: { text: "from iPad", done: false, week: "w", hat: "h" }, v: { pad: 2 }, at: "t2" };
const conflict: Conflict = { id: "task:a", kind: "edit-edit", local, remote, base: null, fields: ["text"] } as Conflict;

function withConflict(): SyncState {
  const state = newSyncState("s", "phone");
  state.items["task:a"] = { fields: local.fields, v: local.v, at: "t1" };
  state.conflicts = [conflict];
  return state;
}
const NOW = "2026-10-08T12:00:00.000Z";

test("keeping this device's version sets the iCloud version aside", () => {
  const next = resolve(withConflict(), "task:a", "local", () => "x", NOW);
  assert.equal(next.items["task:a"].fields.text, "from phone");
  assert.equal(next.discarded?.length, 1);
  assert.equal(next.discarded?.[0].side, "icloud");
  assert.equal(next.discarded?.[0].item.fields.text, "from iPad");
});

test("keeping the iCloud version sets this device's aside; keeping both discards nothing", () => {
  assert.equal(resolve(withConflict(), "task:a", "remote", () => "x", NOW).discarded?.[0].item.fields.text, "from phone");
  assert.equal(resolve(withConflict(), "task:a", "both", () => "x", NOW).discarded?.length ?? 0, 0);
});

test("a set-aside version can be put back, and wins over what is there", () => {
  const settled = resolve(withConflict(), "task:a", "local", () => "x", NOW);
  const back = restoreDiscarded(settled, 0, NOW);
  assert.equal(back.items["task:a"].fields.text, "from iPad");
  assert.equal(back.discarded?.length, 0);
  assert.ok(back.pending.includes("task:a"));
  assert.equal(compareVectors(back.items["task:a"].v, settled.items["task:a"].v), "after");
});

test("set-aside versions older than 30 days are dropped when the next conflict is settled", () => {
  const old = resolve(withConflict(), "task:a", "local", () => "x", "2026-08-01T00:00:00.000Z");
  const again = { ...withConflict(), discarded: old.discarded };
  const next = resolve(again, "task:a", "local", () => "x", NOW);
  assert.equal(next.discarded?.length, 1);
});

test("restoring an unknown entry changes nothing", () => {
  const state = withConflict();
  assert.equal(restoreDiscarded(state, 3, NOW), state);
});
