import assert from "node:assert/strict";
import test from "node:test";
import { canonical } from "./merge.ts";
import { defaultData, normalizeData, type SpreadData } from "./model.ts";
import { createSyncSession, type SessionDeps, type SyncRow, type SyncTransport } from "./sync-session.ts";
import type { SyncState } from "./sync-state.ts";

// A simulated iCloud plus the native engine in front of it, per device.
class Cloud {
  rows = new Map<string, { row: SyncRow; tag: number; seq: number }>();
  seq = 0;
}

class FakeNative implements SyncTransport {
  outboxRows = new Map<string, SyncRow>();
  // Names the engine will try to send. A rejected write leaves the outbox but is not retried.
  sending = new Set<string>();
  inboxRows = new Map<string, SyncRow>();
  tags = new Map<string, number>();
  cursor = 0;
  started = false;
  online = true;
  cloud: Cloud;
  constructor(cloud: Cloud) {
    this.cloud = cloud;
  }
  async start() {
    this.started = true;
  }
  async stop() {
    this.started = false;
  }
  async queue(rows: SyncRow[]) {
    for (const row of rows) {
      this.outboxRows.set(`${row.syncId}|${row.itemId}`, row);
      this.sending.add(`${row.syncId}|${row.itemId}`);
    }
    this.flush();
  }
  async inbox() {
    this.flush();
    return [...this.inboxRows.values()];
  }
  async ack(names: string[]) {
    for (const n of names) this.inboxRows.delete(n);
  }
  async outbox() {
    return [...this.outboxRows.keys()];
  }
  async drop(names: string[]) {
    for (const n of names) {
      this.outboxRows.delete(n);
      this.sending.delete(n);
    }
  }
  async syncNow() {
    this.flush();
  }
  // Like CKSyncEngine: send what is queued, refuse writes made on a stale version (and hand back the newer one), fetch what is new.
  flush() {
    if (!this.online || !this.started) return;
    for (const [name, row] of [...this.outboxRows]) {
      if (!this.sending.has(name)) continue;
      const server = this.cloud.rows.get(name);
      if (server && server.tag !== this.tags.get(name)) {
        this.inboxRows.set(name, server.row);
        this.tags.set(name, server.tag);
        this.sending.delete(name);
        continue;
      }
      this.cloud.seq += 1;
      const tag = (server?.tag ?? 0) + 1;
      this.cloud.rows.set(name, { row, tag, seq: this.cloud.seq });
      this.tags.set(name, tag);
      this.outboxRows.delete(name);
      this.sending.delete(name);
    }
    for (const [name, entry] of this.cloud.rows) {
      if (entry.seq > this.cursor && !this.outboxRows.has(name)) {
        if (this.tags.get(name) !== entry.tag) {
          this.inboxRows.set(name, entry.row);
          this.tags.set(name, entry.tag);
        }
      }
    }
    this.cursor = this.cloud.seq;
  }
}

let clock = 0;
function device(cloud: Cloud, name: string, data: SpreadData, syncId = "S1") {
  const native = new FakeNative(cloud);
  let saved: SyncState | null = null;
  const env = { data, name: "Me", snapshots: [] as string[] };
  const deps: SessionDeps = {
    syncId,
    deviceId: name,
    transport: native,
    loadState: () => saved,
    saveState: (s) => void (saved = s),
    current: () => ({ data: env.data, name: env.name }),
    apply: (next, nm) => {
      env.data = normalizeData({ ...next, currentWeek: env.data.currentWeek });
      if (nm) env.name = nm;
    },
    snapshot: (label) => void env.snapshots.push(label),
    newId: () => `n${clock++}`,
    now: () => `2026-10-08T12:${String(clock++ % 60).padStart(2, "0")}:00Z`,
  };
  const session = createSyncSession(deps);
  return { env, native, session, get state() { return saved; } };
}

const taskIds = (d: ReturnType<typeof device>) => Object.values(d.env.data.weeks).flatMap((w) => w.boxes.flatMap((b) => b.tasks.map((t) => t.id))).sort();
const addTask = (d: ReturnType<typeof device>, id: string, text: string) => d.env.data.weeks[d.env.data.currentWeek].boxes[0].tasks.push({ id, text, done: false });
const settle = async (...ds: ReturnType<typeof device>[]) => {
  for (let i = 0; i < 6; i += 1) for (const d of ds) await d.session.syncNow();
};

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
