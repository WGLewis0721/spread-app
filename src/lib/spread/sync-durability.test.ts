// Astra A04 and A05: nothing is acknowledged before it is safe, and a failed choice is never replayed backwards.
import assert from "node:assert/strict";
import test from "node:test";
import { addTask, Cloud, device, settle, type Harness } from "../../test-support/sync-harness.ts";
import { defaultData, normalizeData } from "./model.ts";

const seedData = () => normalizeData(structuredClone(defaultData()));
const textOf = (d: Harness, id: string) => d.env.data.weeks[d.env.data.currentWeek].boxes[0].tasks.find((t) => t.id === id)?.text;
const setText = (d: Harness, id: string, text: string) => {
  const task = d.env.data.weeks[d.env.data.currentWeek].boxes[0].tasks.find((t) => t.id === id);
  if (task) task.text = text;
};

/** Two devices that edited the same task while apart. `b` is online and has not yet read `a`'s change. */
async function clash() {
  const cloud = new Cloud();
  const a = device(cloud, "phone", seedData());
  const b = device(cloud, "pad", seedData());
  await a.session.start();
  addTask(a, "shared", "Original");
  await a.session.localChanged();
  await settle(a);
  await b.session.start();
  await settle(a, b);
  a.native.online = false;
  b.native.online = false;
  setText(a, "shared", "Phone wording");
  setText(b, "shared", "Pad wording");
  await a.session.localChanged();
  await b.session.localChanged();
  a.native.online = true;
  await a.session.syncNow();
  return { cloud, a, b };
}

test("A04: iCloud's change is not acknowledged while the state that records it cannot be saved", async () => {
  const { b } = await clash();
  b.h.failSave = true;
  b.native.online = true;
  await b.session.syncNow();
  assert.ok(b.native.inboxRows.size > 0, "the inbox still holds iCloud's version");
  assert.ok(b.session.view().lastError, "the failure is reported");
});

test("A04: after a kill, the conflict is rebuilt from the inbox that was never acknowledged", async () => {
  const { b } = await clash();
  b.h.failSave = true;
  b.native.online = true;
  await b.session.syncNow();
  // The app dies here. Only what reached durable storage survives.
  b.h.failSave = false;
  const reopened = b.restart();
  await reopened.start();
  assert.equal(reopened.view().conflicts.some((c) => c.id === "task:shared"), true, "no durable conflict was lost");
});

test("A04: a newer version staged after the read survives the acknowledgment of the older one", async () => {
  const { b } = await clash();
  b.native.online = true;
  const name = "S1|task:shared";
  const read = b.native.inbox.bind(b.native);
  let newer: unknown = null;
  b.native.inbox = async () => {
    const rows = await read();
    const current = rows.find((r) => `${r.syncId}|${r.itemId}` === name);
    assert.ok(current, "the clash is in the inbox");
    newer = { ...current, v: JSON.stringify({ phone: 99 }), fields: JSON.stringify({ ...JSON.parse(current.fields), text: "Version 3" }) };
    b.native.inboxRows.set(name, newer as never);
    return rows;
  };
  await b.session.syncNow();
  assert.deepEqual(b.native.inboxRows.get(name), newer, "version 3 is still waiting to be merged");
});

test("A05: a choice that cannot be applied leaves the conflict and the planner alone, and keeps the choice", async () => {
  const { a, b } = await clash();
  b.native.online = true;
  await b.session.syncNow();
  await a.session.syncNow();
  assert.ok(b.session.view().conflicts.find((c) => c.id === "task:shared"), "b has the clash to settle");
  b.h.failApply = 1;
  await b.session.resolveConflict("task:shared", "remote");
  const view = b.session.view();
  assert.equal(view.conflicts.some((c) => c.id === "task:shared"), true, "the conflict is still there");
  assert.deepEqual(view.failedChoices, [{ id: "task:shared", choice: "remote" }], "the person's choice is kept");
  assert.equal(textOf(b, "shared"), "Pad wording", "the planner did not change");
  assert.equal(b.native.outboxRows.get("S1|task:shared")?.fields.includes("Phone wording") ?? false, false, "nothing was queued for the choice");
});

test("A05: the kept choice is applied on the next pass, in the direction the person chose", async () => {
  const { a, b } = await clash();
  b.native.online = true;
  await b.session.syncNow();
  await a.session.syncNow();
  b.h.failApply = 1;
  await b.session.resolveConflict("task:shared", "remote");
  await settle(a, b);
  assert.equal(textOf(b, "shared"), "Phone wording");
  assert.equal(textOf(a, "shared"), "Phone wording");
  assert.equal(b.session.view().failedChoices.length, 0);
});

test("A05: after the planner recovers, the same choice goes through and both devices agree", async () => {
  const { a, b } = await clash();
  b.native.online = true;
  await b.session.syncNow();
  await a.session.syncNow();
  b.h.failApply = 1;
  await b.session.resolveConflict("task:shared", "remote").catch(() => undefined);
  await b.session.resolveConflict("task:shared", "remote");
  await settle(a, b);
  assert.equal(textOf(b, "shared"), "Phone wording");
  assert.equal(textOf(a, "shared"), "Phone wording");
  assert.equal(b.session.view().conflicts.length + a.session.view().conflicts.length, 0);
});

async function readyToChoose() {
  const { a, b } = await clash();
  b.native.online = true;
  await b.session.syncNow();
  await a.session.syncNow();
  assert.ok(b.session.view().conflicts.find((c) => c.id === "task:shared"), "b has the clash to settle");
  return { a, b };
}

test("A05: a refused safety copy stops the choice before anything changes, and the choice is retried", async () => {
  const { a, b } = await readyToChoose();
  b.h.failSnapshot = 1;
  await b.session.resolveConflict("task:shared", "remote");
  assert.equal(b.session.view().conflicts.some((c) => c.id === "task:shared"), true);
  assert.equal(textOf(b, "shared"), "Pad wording");
  assert.equal(b.session.view().failedChoices.length, 1);
  await settle(a, b);
  assert.equal(textOf(b, "shared"), "Phone wording");
  assert.equal(textOf(a, "shared"), "Phone wording");
});

test("A05: after a refused planner write, a restart still shows the conflict and the retried choice goes the person's way", async () => {
  const { a, b } = await readyToChoose();
  b.h.failApply = 1;
  await b.session.resolveConflict("task:shared", "remote");
  const reopened = b.restart();
  await reopened.start();
  assert.equal(reopened.view().conflicts.some((c) => c.id === "task:shared"), true, "durable state still holds the conflict");
  assert.equal(textOf(b, "shared"), "Pad wording", "planner untouched");
  await reopened.resolveConflict("task:shared", "remote");
  await a.session.syncNow();
  await reopened.syncNow();
  assert.equal(textOf(b, "shared"), "Phone wording");
  assert.equal(textOf(a, "shared"), "Phone wording");
});

test("A05: the state cannot be saved after the planner took the choice: the choice is not reversed, now or after a restart", async () => {
  const { a, b } = await readyToChoose();
  b.h.failSave = true;
  await b.session.resolveConflict("task:shared", "remote");
  assert.equal(textOf(b, "shared"), "Phone wording", "the planner took the choice");
  assert.equal(b.session.view().lastError, "state-not-saved");
  // The app is killed before any save succeeds. Only the old durable state (with the conflict) survives.
  b.h.failSave = false;
  const reopened = b.restart();
  await reopened.start();
  await settle(a, b);
  assert.equal(textOf(b, "shared"), "Phone wording", "the person's choice survived the restart");
  assert.equal(textOf(a, "shared"), "Phone wording", "and did not flip on the other device");
});

test("A04: state is saved after the planner took iCloud's change but before the acknowledgment; a failed save leaves the inbox for a retry", async () => {
  const cloud = new Cloud();
  const x = device(cloud, "phone", seedData());
  const y = device(cloud, "pad", seedData());
  await x.session.start();
  addTask(x, "t1", "From phone");
  await x.session.localChanged();
  await settle(x);
  y.h.failSave = true;
  await y.session.start();
  assert.deepEqual(
    y.env.data.weeks[y.env.data.currentWeek].boxes[0].tasks.map((t) => t.id),
    ["t1"],
    "the planner took the change",
  );
  assert.ok(y.native.inboxRows.size > 0, "but the inbox row waits until the state is safe");
  y.h.failSave = false;
  await y.session.syncNow();
  assert.equal(y.native.inboxRows.size, 0, "and is acknowledged on the next pass");
});

// Astra A09: a safety copy must exist and be verified before the planner is changed.
test("A09: iCloud's change is not applied when the safety copy was not written", async () => {
  const cloud = new Cloud();
  const x = device(cloud, "phone", seedData());
  const y = device(cloud, "pad", seedData());
  await x.session.start();
  addTask(x, "t1", "From phone");
  await x.session.localChanged();
  await settle(x);
  y.h.snapshotResult = false;
  await y.session.start();
  assert.deepEqual(y.env.data.weeks[y.env.data.currentWeek].boxes[0].tasks.map((t) => t.id), [], "the planner did not change");
  assert.ok(y.native.inboxRows.size > 0, "and the change waits in the inbox");
  assert.ok(y.session.view().lastError);
  y.h.snapshotResult = true;
  await y.session.syncNow();
  assert.deepEqual(y.env.data.weeks[y.env.data.currentWeek].boxes[0].tasks.map((t) => t.id), ["t1"], "once a copy can be written, it applies");
  assert.equal(y.env.snapshots.includes("pre-sync"), true);
});

test("A09: an edit typed while the safety copy was being written is not overwritten", async () => {
  const cloud = new Cloud();
  const x = device(cloud, "phone", seedData());
  const y = device(cloud, "pad", seedData());
  await x.session.start();
  addTask(x, "t1", "From phone");
  await x.session.localChanged();
  await settle(x);
  y.h.snapshotResult = true;
  y.h.duringSnapshot = () => addTask(y, "typed", "Typed meanwhile");
  await y.session.start();
  y.h.duringSnapshot = null;
  assert.ok(y.env.data.weeks[y.env.data.currentWeek].boxes[0].tasks.some((t) => t.id === "typed"), "the edit is still there");
  await settle(x, y);
  const ids = y.env.data.weeks[y.env.data.currentWeek].boxes[0].tasks.map((t) => t.id).sort();
  assert.deepEqual(ids, ["t1", "typed"], "both arrive once the pass runs again");
});

test("A09: a conflict choice is not applied without a verified safety copy", async () => {
  const { a, b } = await readyToChoose();
  b.h.snapshotResult = false;
  await b.session.resolveConflict("task:shared", "remote");
  assert.equal(textOf(b, "shared"), "Pad wording");
  assert.equal(b.session.view().conflicts.some((c) => c.id === "task:shared"), true);
  b.h.snapshotResult = true;
  await settle(a, b);
  assert.equal(textOf(b, "shared"), "Phone wording");
});

// Astra A06: confirming "upload this profile again" must send the profile's COMPLETE contents.
import { itemsToPush, reseedAll } from "./sync-state.ts";

test("A06: an unchanged, fully agreed profile has nothing to send, so re-upload needs a reseed", async () => {
  const cloud = new Cloud();
  const x = device(cloud, "phone", seedData());
  await x.session.start();
  addTask(x, "t1", "kept");
  await x.session.localChanged();
  await settle(x);
  const agreed = x.h.durable;
  assert.ok(agreed);
  assert.equal(itemsToPush(agreed).length, 0, "this is the defect: after a deleted zone or an account change, nothing is queued");
  const reseeded = reseedAll(agreed);
  const ids = itemsToPush(reseeded).map((item) => item.id).sort();
  const everything = Object.keys(agreed.items).sort();
  assert.deepEqual(ids, everything, "every item, tombstones included, goes up again");
  assert.deepEqual(reseeded.items, agreed.items, "versions are untouched; only the send queue changes");
  assert.deepEqual(reseeded.queued, {});
});

test("A06: reseeding a profile keeps its conflicts and other bookkeeping", async () => {
  const { b } = await clash();
  b.native.online = true;
  await b.session.syncNow();
  const state = b.h.durable;
  assert.ok(state && state.conflicts.length > 0);
  const reseeded = reseedAll(state);
  assert.deepEqual(reseeded.conflicts, state.conflicts);
  assert.deepEqual(reseeded.base, state.base);
});
