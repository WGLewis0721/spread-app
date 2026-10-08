import assert from "node:assert/strict";
import test from "node:test";
import type { Conflict } from "./merge.ts";
import { describeConflict, describeSync, type SyncDescribeInput } from "./sync-labels.ts";

const conflict = (over: Partial<Conflict>): Conflict => ({
  id: "task:abc",
  kind: "edit-edit",
  local: { id: "task:abc", fields: { text: "Phone wording", done: false }, v: { a: 1 } },
  remote: { id: "task:abc", fields: { text: "Pad wording", done: true }, v: { b: 1 } },
  base: null,
  fields: ["text", "done"],
  ...over,
});

test("a task conflict names the task and shows each side in plain words", () => {
  const card = describeConflict(conflict({}));
  assert.equal(card.title, "Task “Phone wording”");
  assert.deepEqual(card.lines, [
    { label: "Text", local: "Phone wording", remote: "Pad wording" },
    { label: "Done", local: "No", remote: "Yes" },
  ]);
  assert.equal(card.canKeepBoth, true);
});

test("a delete against an edit says which side did which, and offers no keep-both for a non-task", () => {
  const c = conflict({
    kind: "delete-edit",
    fields: [],
    local: { id: "task:abc", fields: {}, v: { a: 2 }, deleted: true },
  });
  const card = describeConflict(c);
  assert.equal(card.lines[0].local, "Deleted on this device");
  assert.equal(card.lines[0].remote, "Changed on your other device");
  assert.equal(card.title, "Task “Pad wording”");
});

test("raw ids and JSON never leak into what is shown", () => {
  const card = describeConflict(
    conflict({
      id: "box:2026-10-05:work",
      fields: ["tasks$ids", "hours"],
      local: { id: "box:2026-10-05:work", fields: { hours: 8, "tasks$ids": ["a", "b"] }, v: { a: 1 } },
      remote: { id: "box:2026-10-05:work", fields: { hours: 6, "tasks$ids": ["b", "a"] }, v: { b: 1 } },
    }),
  );
  const text = JSON.stringify(card);
  assert.ok(!/box:|\$ids|\[|\{/.test(card.title + card.lines.map((l) => l.label + l.local + l.remote).join("")), text);
  assert.deepEqual(card.lines.map((l) => l.label), ["Order of tasks", "Hours"]);
  assert.equal(card.canKeepBoth, false);
});

test("spread names are looked up when available", () => {
  const card = describeConflict(
    conflict({ fields: ["hat"], local: { id: "task:abc", fields: { text: "x", hat: "work" }, v: { a: 1 } }, remote: { id: "task:abc", fields: { text: "x", hat: "home" }, v: { b: 1 } } }),
    (id) => ({ work: "Work", home: "Home" })[id] ?? null,
  );
  assert.deepEqual(card.lines, [{ label: "Spread", local: "Work", remote: "Home" }]);
});

test("long text is shortened", () => {
  const long = "x".repeat(400);
  const card = describeConflict(conflict({ local: { id: "task:abc", fields: { text: long }, v: { a: 1 } }, fields: ["text"] }));
  assert.ok(card.lines[0].local.length <= 140);
});

const base: SyncDescribeInput = { linked: true, paused: null, started: true, busy: false, waitingToSend: 0, conflicts: 0, lastSyncAt: "2026-10-08T14:58:00", lastError: null, quotaExceeded: false, now: new Date("2026-10-08T15:00:00") };
const say = (over: Partial<SyncDescribeInput> = {}) => describeSync({ ...base, ...over });

test("sync is described honestly in every state", () => {
  assert.equal(say({ linked: false }).title, "iCloud Sync is off");
  assert.match(say({ linked: false }).detail, /Nothing is shared or combined/);
  assert.equal(say().title, "Synced with iCloud");
  assert.equal(say().tone, "ok");
  assert.equal(say({ started: false }).title, "Starting sync…");
  assert.equal(say({ waitingToSend: 3 }).detail, "3 changes waiting to send.");
  assert.equal(say({ waitingToSend: 1 }).detail, "1 change waiting to send.");
  assert.equal(say({ busy: true }).title, "Syncing…");
});

test("only a settled, error-free, nothing-waiting state says synced", () => {
  for (const over of [{ waitingToSend: 1 }, { busy: true }, { lastError: "x" }, { quotaExceeded: true }, { conflicts: 2 }, { started: false }, { paused: "signOut" as const }, { linked: false }]) {
    assert.notEqual(say(over).title, "Synced with iCloud", JSON.stringify(over));
  }
});

test("conflicts are counted in plain words", () => {
  assert.match(say({ conflicts: 1 }).detail, /1 change needs your choice/);
  assert.match(say({ conflicts: 3, waitingToSend: 2 }).detail, /3 changes need your choice/);
});

test("a paused sync says nothing was changed or uploaded", () => {
  assert.match(say({ paused: "switchAccounts" }).detail, /Nothing was uploaded to the new account and nothing here was changed/);
  assert.match(say({ paused: "signOut" }).detail, /untouched/);
  assert.match(say({ paused: "zoneDeleted" }).detail, /not uploaded again/);
  assert.equal(say({ paused: "zoneDeleted" }).tone, "problem");
});

test("errors reassure that changes are safe on this device", () => {
  assert.match(say({ lastError: "x" }).detail, /safe on this device/);
  assert.match(say({ quotaExceeded: true }).detail, /safe on this device/);
});

test("a planner that looks emptied says nothing was deleted and asks for a choice", () => {
  const said = say({ blocked: true });
  assert.equal(said.title, "Sync is paused: this profile looks empty");
  assert.match(said.detail, /Nothing has been deleted/);
  assert.equal(said.tone, "problem");
  assert.notEqual(say({ blocked: true, waitingToSend: 0 }).title, "Synced with iCloud");
});

test("damaged records are reported plainly and nothing is claimed erased", () => {
  const said = describeSync({ ...base, damaged: 2 });
  assert.equal(said.title, "Some iCloud data couldn’t be read");
  assert.equal(said.tone, "problem");
  assert.match(said.detail, /2 items were left out/);
});
