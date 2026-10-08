import assert from "node:assert/strict";
import test from "node:test";
import { canonical } from "./merge.ts";
import { defaultData, normalizeData } from "./model.ts";
import { addTask, Cloud, device, settle, taskIds } from "../../test-support/sync-harness.ts";
import { createSyncSession, type SyncRow } from "./sync-session.ts";
import type { SyncState } from "./sync-state.ts";

test("a change on one device reaches the other and the sender's queue empties", async () => {
  const cloud = new Cloud();
  const seed = normalizeData(structuredClone(defaultData()));
  const a = device(cloud, "phone", normalizeData(structuredClone(seed)));
  const b = device(cloud, "pad", normalizeData(structuredClone(seed)));
  await a.session.start();
  addTask(a, "t1", "From phone");
  await a.session.localChanged();
  await settle(a);
  assert.equal(a.native.outboxRows.size, 0, "iCloud confirmed everything");
  assert.equal(a.session.view().waitingToSend, 0);
  await b.session.start();
  await settle(a, b);
  assert.deepEqual(taskIds(b), ["t1"]);
});

test("the planner is snapshotted before a merge changes it", async () => {
  const cloud = new Cloud();
  const seed = normalizeData(structuredClone(defaultData()));
  const a = device(cloud, "phone", normalizeData(structuredClone(seed)));
  const b = device(cloud, "pad", normalizeData(structuredClone(seed)));
  await a.session.start();
  addTask(a, "t1", "x");
  await a.session.localChanged();
  await settle(a);
  await b.session.start();
  await settle(a, b);
  assert.ok(b.env.snapshots.includes("pre-sync"));
});

test("offline edits on both devices are reconciled when they come back, with conflicts held for the person", async () => {
  const cloud = new Cloud();
  const seed = normalizeData(structuredClone(defaultData()));
  const a = device(cloud, "phone", normalizeData(structuredClone(seed)));
  const b = device(cloud, "pad", normalizeData(structuredClone(seed)));
  await a.session.start();
  addTask(a, "shared", "Original");
  await a.session.localChanged();
  await settle(a);
  await b.session.start();
  await settle(a, b);
  a.native.online = false;
  b.native.online = false;
  a.env.data.weeks[a.env.data.currentWeek].boxes[0].tasks[0].text = "Phone wording";
  addTask(a, "pa", "Phone only");
  b.env.data.weeks[b.env.data.currentWeek].boxes[0].tasks[0].text = "Pad wording";
  addTask(b, "pb", "Pad only");
  await a.session.localChanged();
  await b.session.localChanged();
  assert.ok(a.session.view().waitingToSend > 0 && b.session.view().waitingToSend > 0);
  a.native.online = true;
  b.native.online = true;
  await settle(a, b);
  assert.deepEqual(taskIds(a), ["pa", "pb", "shared"]);
  assert.deepEqual(taskIds(b), ["pa", "pb", "shared"]);
  const conflicts = [...a.session.view().conflicts, ...b.session.view().conflicts];
  
  assert.ok(conflicts.some((c) => c.id === "task:shared"), "the clash is held, not decided");
  assert.equal(a.session.view().conflicts.length > 0 ? a.session.view().waitingToSend : b.session.view().waitingToSend, 0, "a held clash is not counted as waiting to send");
  const texts = [a, b].map((d) => d.env.data.weeks[d.env.data.currentWeek].boxes[0].tasks.find((t) => t.id === "shared")!.text);
  assert.deepEqual(texts.sort(), ["Pad wording", "Phone wording"].sort(), "each device still shows its own wording until someone chooses");
});

test("choosing a side settles the conflict on both devices", async () => {
  const cloud = new Cloud();
  const seed = normalizeData(structuredClone(defaultData()));
  const a = device(cloud, "phone", normalizeData(structuredClone(seed)));
  const b = device(cloud, "pad", normalizeData(structuredClone(seed)));
  await a.session.start();
  addTask(a, "shared", "Original");
  await a.session.localChanged();
  await settle(a);
  await b.session.start();
  await settle(a, b);
  a.native.online = false;
  b.native.online = false;
  a.env.data.weeks[a.env.data.currentWeek].boxes[0].tasks[0].text = "Phone wording";
  b.env.data.weeks[b.env.data.currentWeek].boxes[0].tasks[0].text = "Pad wording";
  await a.session.localChanged();
  await b.session.localChanged();
  a.native.online = true;
  b.native.online = true;
  await settle(a, b);
  await b.session.resolveConflict("task:shared", "remote");
  await settle(a, b);
  await a.session.resolveConflict("task:shared", "local");
  await settle(a, b, a, b);
  assert.equal(a.session.view().conflicts.length + b.session.view().conflicts.length, 0);
  assert.equal(canonical(a.env.data as never), canonical(b.env.data as never));
});

test("another profile's items in the same iCloud zone are left alone", async () => {
  const cloud = new Cloud();
  const seed = normalizeData(structuredClone(defaultData()));
  const mine = device(cloud, "phone", normalizeData(structuredClone(seed)), "MINE");
  const other = device(cloud, "pad", normalizeData(structuredClone(seed)), "OTHER");
  await mine.session.start();
  await other.session.start();
  addTask(other, "o1", "Not for the phone's profile");
  await other.session.localChanged();
  await settle(other, mine);
  assert.deepEqual(taskIds(mine), []);
  assert.ok([...mine.native.inboxRows.keys()].some((name) => name.startsWith("OTHER|")), "kept for the link screen, not applied or discarded");
});

test("stopping sync keeps everything the person has", async () => {
  const cloud = new Cloud();
  const a = device(cloud, "phone", normalizeData(structuredClone(defaultData())));
  await a.session.start();
  addTask(a, "t1", "x");
  await a.session.localChanged();
  await a.session.stop();
  assert.deepEqual(taskIds(a), ["t1"]);
  assert.equal(a.session.view().running, false);
});

test("a transport failure is reported and does not lose the pending change", async () => {
  const cloud = new Cloud();
  const a = device(cloud, "phone", normalizeData(structuredClone(defaultData())));
  await a.session.start();
  const real = a.native.queue.bind(a.native);
  a.native.queue = async () => {
    throw new Error("disk full");
  };
  addTask(a, "t1", "x");
  await a.session.localChanged();
  assert.equal(a.session.view().lastError, "disk full");
  assert.ok(a.session.view().waitingToSend > 0);
  a.native.queue = real;
  await a.session.localChanged();
  assert.equal(a.session.view().lastError, null);
  await settle(a);
  assert.equal(a.session.view().waitingToSend, 0);
});

test("an edit typed while iCloud's side is being read is not overwritten by what arrives", async () => {
  const cloud = new Cloud();
  const seed = normalizeData(structuredClone(defaultData()));
  const a = device(cloud, "phone", normalizeData(structuredClone(seed)));
  const b = device(cloud, "pad", normalizeData(structuredClone(seed)));
  await a.session.start();
  await b.session.start();
  addTask(a, "from-phone", "Phone");
  await a.session.localChanged();
  await settle(a);
  // While the pad reads its inbox (which now holds the phone's task), the person types a new task.
  const realInbox = b.native.inbox.bind(b.native);
  b.native.inbox = async () => {
    const rows = await realInbox();
    addTask(b, "typed-meanwhile", "Typed during the read");
    return rows;
  };
  await b.session.localChanged();
  b.native.inbox = realInbox;
  assert.deepEqual(taskIds(b), ["from-phone", "typed-meanwhile"]);
  await settle(a, b);
  assert.deepEqual(taskIds(a), ["from-phone", "typed-meanwhile"]);
});

test("a queued change that iCloud's newer version replaced is dropped from the native outbox", async () => {
  const cloud = new Cloud();
  const seed = normalizeData(structuredClone(defaultData()));
  const a = device(cloud, "phone", normalizeData(structuredClone(seed)));
  const b = device(cloud, "pad", normalizeData(structuredClone(seed)));
  await a.session.start();
  addTask(a, "t", "Original");
  await a.session.localChanged();
  await settle(a);
  await b.session.start();
  await settle(a, b);
  // The pad goes offline and queues a change to the task; meanwhile the phone changes it and
  // syncs. The pad had changed nothing else, so when it reconnects it could not just be dropped:
  // here it has really edited, and the merge keeps its edit as a conflict. Then the pad undoes
  // its own edit back to the original, which makes iCloud's version the only one that matters.
  b.native.online = false;
  b.env.data.weeks[b.env.data.currentWeek].boxes[0].tasks[0].text = "Pad edit";
  await b.session.localChanged();
  a.env.data.weeks[a.env.data.currentWeek].boxes[0].tasks[0].text = "Phone edit";
  await a.session.localChanged();
  await settle(a);
  b.native.online = true;
  await b.session.syncNow();
  assert.ok(b.session.view().conflicts.length > 0);
  await b.session.resolveConflict("task:t", "remote");
  await settle(a, b, a, b);
  assert.equal(b.native.outboxRows.size, 0, "nothing stale is left in the native outbox");
  assert.equal(b.session.view().conflicts.length + a.session.view().conflicts.length, 0);
});

// --- Profile binding (audit C1) ---------------------------------------------------------------

function boundHarness() {
  const own = defaultData();
  own.weeks[own.currentWeek].boxes[0].tasks.push({ id: "a1", text: "This profile", done: false });
  const other = defaultData();
  other.weeks[other.currentWeek].boxes[0].tasks.push({ id: "b1", text: "A different profile", done: false });
  const env = { open: "mine" as "mine" | "other", applied: 0, queued: [] as SyncRow[], released: false };
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let saved: SyncState | null = null;
  const session = createSyncSession({
    syncId: "S",
    deviceId: "phone",
    transport: {
      async start() {},
      async stop() {},
      async queue(rows) {
        env.queued.push(...rows);
      },
      async inbox() {
        if (!env.released) await gate;
        return [];
      },
      async ack() {},
      async outbox() {
        return [];
      },
      async drop() {},
      async syncNow() {},
    },
    loadState: () => saved,
    saveState: (s) => void (saved = s),
    isActive: () => env.open === "mine",
    current: () => ({ data: env.open === "mine" ? own : other, name: "Me" }),
    apply: () => void (env.applied += 1),
    snapshot: () => {},
    newId: () => "x",
    now: () => "t",
  });
  return { env, session, release: () => ((env.released = true), release()) };
}

test("switching profiles while a pass waits on iCloud sends nothing from the other profile", async () => {
  const h = boundHarness();
  const starting = h.session.start();
  await new Promise((r) => setTimeout(r, 20));
  h.env.open = "other";
  h.release();
  await starting;
  assert.deepEqual(h.env.queued, [], "the other profile's tasks were not queued into this profile's iCloud copy");
  assert.equal(h.env.applied, 0);
});

test("stopping a session while a pass is waiting stops that pass from touching the planner", async () => {
  const h = boundHarness();
  const starting = h.session.start();
  await new Promise((r) => setTimeout(r, 20));
  await h.session.stop();
  h.release();
  await starting;
  assert.deepEqual(h.env.queued, []);
  assert.equal(h.env.applied, 0);
});

test("resolving a conflict or a pause is ignored when the session's profile is not open", async () => {
  const h = boundHarness();
  h.release();
  await h.session.start();
  h.env.open = "other";
  await h.session.resolveConflict("task:a1", "local");
  await h.session.resolveBlocked("restore");
  assert.equal(h.env.applied, 0);
});

test("the same session still syncs normally while its profile stays open", async () => {
  const h = boundHarness();
  h.release();
  await h.session.start();
  assert.ok(h.env.queued.some((row) => row.itemId === "task:a1"));
});

test("if iCloud's changes cannot be saved to the planner, sync state does not run ahead of it", async () => {
  const cloud = new Cloud();
  const seed = normalizeData(structuredClone(defaultData()));
  const a = device(cloud, "phone", normalizeData(structuredClone(seed)));
  const b = device(cloud, "pad", normalizeData(structuredClone(seed)));
  await a.session.start();
  addTask(a, "t1", "From phone");
  await a.session.localChanged();
  await settle(a);
  // The pad's storage refuses the write until told otherwise.
  const realApply = b.deps.apply;
  let refuse = true;
  b.deps.apply = (next, nm) => {
    if (refuse) throw new Error("storage full");
    realApply(next, nm);
  };
  await b.session.start();
  await b.session.syncNow();
  assert.ok(b.session.view().lastError);
  assert.deepEqual(taskIds(b), [], "the planner is unchanged");
  refuse = false;
  await settle(a, b);
  assert.deepEqual(taskIds(b), ["t1"], "the change arrives once storage works");
  assert.deepEqual(taskIds(a), ["t1"], "and was never undone on the other device");
  assert.equal(b.session.view().conflicts.length + a.session.view().conflicts.length, 0);
});
