import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, normalizeData, type SpreadData } from "./model.ts";
import { createSyncSession, type SyncRow, type SyncTransport } from "./sync-session.ts";
import { assessDeletion, captureLocal, newSyncState } from "./sync-state.ts";

function planner(tasks: number): SpreadData {
  const data = defaultData();
  const box = data.weeks[data.currentWeek].boxes[0];
  for (let i = 0; i < tasks; i += 1) box.tasks.push({ id: `t${i}`, text: `Task ${i}`, done: false });
  return normalizeData(data);
}

const populated = (tasks: number) => captureLocal(newSyncState("S", "phone"), planner(tasks), "Me", "t0").state;

test("a planner that reads as completely empty is blocked and nothing is recorded", () => {
  const state = populated(4);
  const result = captureLocal(state, { hats: [], weeks: {}, currentWeek: "2026-10-05" }, "Me", "t1");
  assert.ok(result.blocked, "blocked");
  assert.equal(result.changed.length, 0);
  assert.deepEqual(result.state, state, "state is returned untouched");
  assert.equal(result.state.pending.length, state.pending.length);
});

test("every task vanishing at once is blocked even when the spreads are still there", () => {
  const state = populated(4);
  const result = captureLocal(state, planner(0), "Me", "t1");
  assert.equal(result.blocked?.reason, "all-tasks");
  assert.deepEqual(result.state, state);
});

test("deleting one task, or a few, is an ordinary edit", () => {
  const state = populated(6);
  const one = captureLocal(state, planner(5), "Me", "t1");
  assert.equal(one.blocked, undefined);
  assert.deepEqual(one.changed.filter((id) => id.startsWith("task:")), ["task:t5"]);
  const some = captureLocal(state, planner(3), "Me", "t1");
  assert.equal(some.blocked, undefined, "half of the tasks is a decision, not an accident");
});

test("losing more than half of a sizeable planner is blocked", () => {
  const state = populated(12);
  const vanished = Object.keys(state.items).filter((id) => id.startsWith("task:"))
    .slice(0, 11);
  assert.equal(assessDeletion(state, vanished)?.reason, "most");
  assert.equal(assessDeletion(state, vanished.slice(0, 4)), null);
});

test("the person confirming lets the deletion through as real tombstones", () => {
  const state = populated(4);
  const result = captureLocal(state, planner(0), "Me", "t1", { allowMassDelete: true });
  assert.equal(result.blocked, undefined);
  assert.equal(result.changed.filter((id) => id.startsWith("task:")).length, 4);
  assert.ok(Object.values(result.state.items).some((item) => item.deleted));
});

test("an empty state never blocks (first sync, nothing to protect)", () => {
  const result = captureLocal(newSyncState("S", "phone"), planner(0), "Me", "t1");
  assert.equal(result.blocked, undefined);
});

// --- Through the session ---------------------------------------------------------------------

function harness(initial: SpreadData) {
  const env = { data: initial, applied: 0, snapshots: [] as string[], queued: [] as SyncRow[] };
  let saved = null as ReturnType<typeof newSyncState> | null;
  const transport: SyncTransport = {
    async start() {},
    async stop() {},
    async queue(rows) {
      env.queued.push(...rows);
    },
    async inbox() {
      return [];
    },
    async ack() {},
    async outbox() {
      return [];
    },
    async drop() {},
    async syncNow() {},
  };
  const session = createSyncSession({
    syncId: "S",
    deviceId: "phone",
    transport,
    loadState: () => saved,
    saveState: (s) => void (saved = s),
    isActive: () => true,
    current: () => ({ data: env.data, name: "Me" }),
    apply: (data) => {
      env.data = normalizeData({ ...data, currentWeek: env.data.currentWeek });
      env.applied += 1;
    },
    snapshot: (label) => void env.snapshots.push(label),
    newId: () => "x",
    now: () => "t",
  });
  return { env, session };
}

const taskCount = (data: SpreadData) => Object.values(data.weeks).reduce((n, w) => n + w.boxes.reduce((m, b) => m + b.tasks.length, 0), 0);

test("session: an emptied planner pauses sync, sends nothing, and says so", async () => {
  const h = harness(planner(4));
  await h.session.start();
  const sentBefore = h.env.queued.length;
  h.env.data = planner(0);
  await h.session.localChanged();
  assert.ok(h.session.view().blocked);
  assert.equal(h.env.queued.length, sentBefore, "no tombstones were queued");
  assert.equal(h.env.applied, 0, "nothing was applied over the planner");
});

test("session: choosing restore puts the last synced planner back, with a snapshot", async () => {
  const h = harness(planner(4));
  await h.session.start();
  h.env.data = planner(0);
  await h.session.localChanged();
  await h.session.resolveBlocked("restore");
  assert.equal(taskCount(h.env.data), 4);
  assert.ok(h.env.snapshots.includes("pre-restore-guard"));
  assert.equal(h.session.view().blocked, null);
});

test("session: choosing keep-deletion sends the deletions", async () => {
  const h = harness(planner(4));
  await h.session.start();
  h.env.data = planner(0);
  await h.session.localChanged();
  await h.session.resolveBlocked("keep-deletion");
  assert.equal(h.session.view().blocked, null);
  assert.equal(h.env.queued.filter((r) => r.deleted && r.itemId.startsWith("task:")).length, 4);
});

test("session: the pause lifts by itself if the planner comes back", async () => {
  const h = harness(planner(4));
  await h.session.start();
  const original = h.env.data;
  h.env.data = planner(0);
  await h.session.localChanged();
  assert.ok(h.session.view().blocked);
  h.env.data = original;
  await h.session.localChanged();
  assert.equal(h.session.view().blocked, null);
});

test("session: a conflict is not settled on top of an emptied planner", async () => {
  const h = harness(planner(4));
  await h.session.start();
  h.env.data = planner(0);
  await h.session.resolveConflict("task:t0", "local");
  assert.ok(h.session.view().blocked);
  assert.equal(h.env.applied, 0);
});

// Astra A14: whether the planner was READ properly is passed in; it is not guessed from item counts.
test("A14: a failed read that came back as defaults cannot erase a one-task planner", () => {
  const state = populated(1);
  const result = captureLocal(state, planner(0), "Me", "t1", { healthy: false });
  assert.equal(result.blocked?.reason, "unreadable");
  assert.deepEqual(result.state, state);
  assert.equal(result.changed.length, 0);
});

test("A14: two tasks and a small reset are covered the same way", () => {
  for (const n of [1, 2]) {
    const result = captureLocal(populated(n), planner(0), "Me", "t1", { healthy: false });
    assert.equal(result.blocked?.reason, "unreadable", `${n} tasks`);
  }
});

test("A14: an ordinary single-task delete on a healthy read still goes through", () => {
  const state = populated(1);
  const result = captureLocal(state, planner(0), "Me", "t1", { healthy: true });
  assert.equal(result.blocked, undefined);
  assert.equal(result.changed.length > 0, true);
});

test("A14: an unhealthy read with nothing missing records nothing and blocks nothing", () => {
  const state = populated(2);
  const result = captureLocal(state, planner(2), "Me", "t1", { healthy: false });
  assert.equal(result.blocked, undefined);
});

test("A14: after the person confirms, an unhealthy read may delete", () => {
  const result = captureLocal(populated(1), planner(0), "Me", "t1", { healthy: false, allowMassDelete: true });
  assert.equal(result.blocked, undefined);
});
