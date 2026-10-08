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
