import assert from "node:assert/strict";
import test from "node:test";
import type { SyncItem } from "./merge.ts";
import { canonical } from "./merge.ts";
import { defaultData, normalizeData, type SpreadData } from "./model.ts";
import { adoptRemote, applyRemote, captureLocal, itemsToPush, liveData, markPushed, newSyncState, resolve, type SyncState } from "./sync-state.ts";

// A small in-memory iCloud. Like CloudKit it refuses a write made on top of a version the writer
// has not seen (`serverRecordChanged`) and hands back the newer one.
class Cloud {
  items = new Map<string, { item: SyncItem; tag: number; seq: number }>();
  seq = 0;
  changesSince(cursor: number) {
    return [...this.items.values()].filter((e) => e.seq > cursor).sort((a, b) => a.seq - b.seq);
  }
  save(item: SyncItem, seenTag: number | undefined): { ok: true; tag: number } | { ok: false; server: SyncItem; tag: number } {
    const current = this.items.get(item.id);
    if (current && current.tag !== seenTag) return { ok: false, server: current.item, tag: current.tag };
    this.seq += 1;
    const tag = (current?.tag ?? 0) + 1;
    this.items.set(item.id, { item, tag, seq: this.seq });
    return { ok: true, tag };
  }
}

let counter = 0;
class Device {
  state: SyncState;
  data: SpreadData;
  cursor = 0;
  tags = new Map<string, number>();
  online = true;
  name: string;
  constructor(name: string, syncId: string, data: SpreadData) {
    this.name = name;
    this.state = newSyncState(syncId, name);
    this.data = data;
  }
  now = () => `2026-10-08T12:${String(counter++ % 60).padStart(2, "0")}:00Z`;
  capture() {
    this.state = captureLocal(this.state, this.data, "Me", this.now()).state;
  }
  adopt() {
    this.data = liveData(this.state, this.data.currentWeek).data;
  }
  sync(cloud: Cloud) {
    if (!this.online) return;
    this.capture();
    for (let round = 0; round < 12; round += 1) {
      const incoming = cloud.changesSince(this.cursor);
      if (incoming.length) {
        for (const e of incoming) {
          this.tags.set(e.item.id, e.tag);
          this.cursor = Math.max(this.cursor, e.seq);
        }
        const result = applyRemote(this.state, incoming.map((e) => e.item), this.now());
        this.state = result.state;
        if (result.dataChanged) this.adopt();
      }
      const out = itemsToPush(this.state);
      if (out.length === 0) return;
      let sent = 0;
      for (const item of out) {
        const reply = cloud.save(item, this.tags.get(item.id));
        if (reply.ok) {
          this.tags.set(item.id, reply.tag);
          this.cursor = Math.max(this.cursor, cloud.seq);
          this.state = markPushed(this.state, [item], this.now());
          sent += 1;
        } else {
          const r = applyRemote(this.state, [reply.server], this.now());
          this.tags.set(item.id, reply.tag);
          this.state = r.state;
          if (r.dataChanged) this.adopt();
        }
      }
      if (sent === 0 && itemsToPush(this.state).length === out.length && round > 6) return;
    }
  }
  tasks(): Map<string, { text: string; done: boolean }> {
    const out = new Map<string, { text: string; done: boolean }>();
    for (const w of Object.values(this.data.weeks)) for (const b of w.boxes) for (const t of b.tasks) out.set(t.id, { text: t.text, done: t.done });
    return out;
  }
  // Edits as the person makes them: straight on the planner data.
  box(hat = "work") {
    return this.data.weeks[this.data.currentWeek].boxes.find((b) => b.hatId === hat)!;
  }
  add(id: string, text: string, hat = "work") {
    this.box(hat).tasks.push({ id, text, done: false });
  }
  edit(id: string, text: string) {
    for (const b of this.data.weeks[this.data.currentWeek].boxes) for (const t of b.tasks) if (t.id === id) t.text = text;
  }
  remove(id: string) {
    for (const b of this.data.weeks[this.data.currentWeek].boxes) b.tasks = b.tasks.filter((t) => t.id !== id);
  }
}

function pair() {
  const cloud = new Cloud();
  const seed = defaultData();
  const a = new Device("phone", "sync-1", normalizeData(structuredClone(seed)));
  a.add("t1", "Ship");
  a.add("t2", "Review");
  a.sync(cloud);
  const b = new Device("pad", "sync-1", normalizeData(structuredClone(seed)));
  // Joining a profile that already exists in iCloud: B starts with nothing of its own and takes the cloud's items.
  b.state = applyRemote(b.state, cloud.changesSince(0).map((e) => e.item), b.now()).state;
  for (const e of cloud.changesSince(0)) b.tags.set(e.item.id, e.tag);
  b.cursor = cloud.seq;
  b.adopt();
  return { cloud, a, b };
}

const same = (x: Device, y: Device) => canonical(x.data as never) === canonical(y.data as never);

test("a second device that joins sees what the first uploaded", () => {
  const { a, b } = pair();
  assert.deepEqual([...b.tasks().keys()].sort(), ["t1", "t2"]);
  assert.ok(same(a, b));
});

test("edits to different tasks while apart both survive and both devices agree", () => {
  const { cloud, a, b } = pair();
  a.edit("t1", "Ship it");
  b.edit("t2", "Review twice");
  a.sync(cloud);
  b.sync(cloud);
  a.sync(cloud);
  assert.equal(a.tasks().get("t1")?.text, "Ship it");
  assert.equal(a.tasks().get("t2")?.text, "Review twice");
  assert.ok(same(a, b));
  assert.equal(a.state.conflicts.length + b.state.conflicts.length, 0);
});

test("adding tasks to the same box on both devices keeps every task, in the same order on both", () => {
  const { cloud, a, b } = pair();
  a.add("pa", "From phone");
  b.add("pb", "From pad");
  a.sync(cloud);
  b.sync(cloud);
  a.sync(cloud);
  assert.deepEqual([...a.tasks().keys()].sort(), ["pa", "pb", "t1", "t2"]);
  assert.ok(same(a, b));
  assert.deepEqual(a.box().tasks.map((t) => t.id), b.box().tasks.map((t) => t.id));
});

test("the same task edited two ways is a conflict on both devices, and nothing is overwritten meanwhile", () => {
  const { cloud, a, b } = pair();
  a.edit("t1", "Phone wording");
  b.edit("t1", "Pad wording");
  a.sync(cloud);
  b.sync(cloud);
  assert.equal(b.state.conflicts.length, 1);
  assert.equal(b.tasks().get("t1")?.text, "Pad wording");
  a.sync(cloud);
  assert.equal(a.tasks().get("t1")?.text, "Phone wording");
  assert.equal(cloud.items.get("task:t1")!.item.fields.text, "Phone wording");
});

test("resolving a conflict settles it on both devices", () => {
  const { cloud, a, b } = pair();
  a.edit("t1", "Phone wording");
  b.edit("t1", "Pad wording");
  a.sync(cloud);
  b.sync(cloud);
  b.state = resolve(b.state, "task:t1", "remote", () => "x", b.now());
  b.adopt();
  b.sync(cloud);
  a.sync(cloud);
  b.sync(cloud);
  assert.equal(a.state.conflicts.length + b.state.conflicts.length, 0);
  assert.equal(a.tasks().get("t1")?.text, "Phone wording");
  assert.ok(same(a, b));
});

test("keep both turns a conflict into two tasks", () => {
  const { cloud, a, b } = pair();
  a.edit("t1", "Phone wording");
  b.edit("t1", "Pad wording");
  a.sync(cloud);
  b.sync(cloud);
  b.state = resolve(b.state, "task:t1", "both", () => "copy", b.now());
  b.adopt();
  b.sync(cloud);
  a.sync(cloud);
  const texts = [...a.tasks().values()].map((t) => t.text);
  assert.ok(texts.includes("Phone wording") && texts.includes("Pad wording"), texts.join("|"));
  assert.ok(same(a, b));
});

test("deleting on one device while the other edits is a conflict, not a silent delete", () => {
  const { cloud, a, b } = pair();
  a.remove("t2");
  b.edit("t2", "Still needed");
  a.sync(cloud);
  b.sync(cloud);
  assert.equal(b.state.conflicts.length, 1);
  assert.equal(b.tasks().get("t2")?.text, "Still needed");
  b.state = resolve(b.state, "task:t2", "both", () => "x", b.now());
  b.adopt();
  b.sync(cloud);
  a.sync(cloud);
  assert.equal(a.tasks().get("t2")?.text, "Still needed");
});

test("a delete that the other device had already seen just deletes", () => {
  const { cloud, a, b } = pair();
  a.remove("t2");
  a.sync(cloud);
  b.sync(cloud);
  assert.ok(!b.tasks().has("t2"));
  assert.equal(b.state.conflicts.length, 0);
});

test("a device that was offline catches up without losing its own work", () => {
  const { cloud, a, b } = pair();
  b.online = false;
  b.add("off1", "Offline one");
  b.edit("t1", "Offline edit");
  a.add("on1", "Online one");
  a.sync(cloud);
  b.capture();
  b.online = true;
  b.sync(cloud);
  a.sync(cloud);
  assert.ok(same(a, b));
  assert.ok(a.tasks().has("off1") && a.tasks().has("on1"));
  assert.equal(a.tasks().get("t1")?.text, "Offline edit");
});

test("syncing again with nothing new changes nothing and sends nothing", () => {
  const { cloud, a, b } = pair();
  a.sync(cloud);
  b.sync(cloud);
  const before = cloud.seq;
  a.sync(cloud);
  b.sync(cloud);
  assert.equal(cloud.seq, before);
  assert.equal(itemsToPush(a.state).length, 0);
});

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test("property: random edits on three devices in a random order always converge and lose nothing", () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const next = rng(seed);
    const cloud = new Cloud();
    const base = defaultData();
    const dev = ["phone", "pad", "mac"].map((n) => new Device(n, "s", normalizeData(structuredClone(base))));
    dev[0].add("seed", "Seed");
    dev[0].sync(cloud);
    for (const d of dev.slice(1)) {
      d.state = applyRemote(d.state, cloud.changesSince(0).map((e) => e.item), d.now()).state;
      for (const e of cloud.changesSince(0)) d.tags.set(e.item.id, e.tag);
      d.cursor = cloud.seq;
      d.adopt();
    }
    const added = new Set<string>(["seed"]);
    const removed = new Set<string>();
    let n = 0;
    for (let step = 0; step < 14; step += 1) {
      const d = dev[Math.floor(next() * dev.length)];
      const roll = next();
      const ids = [...d.tasks().keys()];
      if (roll < 0.35) {
        const id = `${d.name}-${n++}`;
        d.add(id, `new ${id}`, next() < 0.5 ? "work" : "home");
        added.add(id);
      } else if (roll < 0.65 && ids.length) d.edit(ids[Math.floor(next() * ids.length)], `edit ${seed}-${step}`);
      else if (roll < 0.8 && ids.length) {
        const victim = ids[Math.floor(next() * ids.length)];
        d.remove(victim);
        removed.add(victim);
      }
      if (next() < 0.5) d.sync(cloud);
    }
    for (let pass = 0; pass < 4; pass += 1) for (const d of dev) d.sync(cloud);
    // The first device keeps its version of every conflict and the others take the other side.
    // People can settle one conflict differently on two devices, which makes a fresh conflict, so
    // repeat until nothing is left.
    for (let round = 0; round < 8 && dev.some((d) => d.state.conflicts.length > 0); round += 1) {
      for (const d of dev) {
        d.capture();
        for (const c of [...d.state.conflicts]) d.state = resolve(d.state, c.id, d === dev[0] ? "local" : "remote", () => `r${round}`, d.now());
        d.adopt();
      }
      for (let pass = 0; pass < 3; pass += 1) for (const d of dev) d.sync(cloud);
    }
    for (const d of dev.slice(1)) {
      if (!same(dev[0], d)) {
        const diff: string[] = [];
        const keys = new Set([...Object.keys(dev[0].state.items), ...Object.keys(d.state.items)]);
        for (const k of keys) {
          const x = dev[0].state.items[k];
          const y = d.state.items[k];
          if (canonical((x?.fields ?? null) as never) !== canonical((y?.fields ?? null) as never) || !!x?.deleted !== !!y?.deleted) diff.push(`${k}\n   ${dev[0].name}: ${JSON.stringify(x)}\n   ${d.name}: ${JSON.stringify(y)}`);
        }
        assert.fail(`seed ${seed}: ${dev[0].name} and ${d.name} disagree\n${diff.join("\n")}\ncloud: ${JSON.stringify(diff.map((line) => line.split("\n")[0]).map((k) => cloud.items.get(k)?.item))}`);
      }
    }
    const finalIds = new Set(dev[0].tasks().keys());
    for (const d of dev) assert.equal(d.state.conflicts.length, 0, `seed ${seed}: conflict left on ${d.name}`);
    // Nothing that was ever added can vanish except by someone deleting it.
    for (const id of added) {
      const everDeleted = removed.has(id);
      if (!everDeleted && !finalIds.has(id)) {
        const rows = dev.map((d) => `${d.name}: item=${JSON.stringify(d.state.items[`task:${id}`])} boxes=${JSON.stringify(Object.entries(d.state.items).filter(([k]) => k.startsWith('box:')).map(([k, v]) => [k, v.fields['tasks$ids']]))}`);
        assert.fail(`seed ${seed}: ${id} was lost\n${rows.join('\n')}`);
      }
    }
  }
});

test("adopting iCloud's items gives a state with nothing pending, nothing in conflict, and the same planner", () => {
  const { cloud, a } = pair();
  const items = cloud.changesSince(0).map((e) => e.item);
  const state = adoptRemote("sync-1", "pad", items, "2026-10-08T12:00:00Z");
  assert.deepEqual(state.pending, []);
  assert.deepEqual(state.conflicts, []);
  const data = liveData(state, a.data.currentWeek).data;
  assert.equal(canonical(data as never), canonical(a.data as never));
  const again = captureLocal(state, data, "Me", "2026-10-08T12:01:00Z");
  assert.deepEqual(again.changed, [], "capturing the adopted planner finds no edits");
});
