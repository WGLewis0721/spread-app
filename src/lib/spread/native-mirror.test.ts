import assert from "node:assert/strict";
import test from "node:test";
import {
  collectEntries,
  createMirrorWriter,
  hasPlannerData,
  isMirrorKey,
  isPlannerKey,
  newestEnvelope,
  parseEnvelope,
  restoreIfEmpty,
  type KeyStore,
  type MirrorAdapter,
  type MirrorSlot,
} from "./native-mirror.ts";

class FakeStorage implements KeyStore {
  private map = new Map<string, string>();
  constructor(seed: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(seed)) this.map.set(key, value);
  }
  get length() {
    return this.map.size;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

class FakeFiles implements MirrorAdapter {
  files = new Map<MirrorSlot, string>();
  writes: MirrorSlot[] = [];
  failNext = 0;
  async read(slot: MirrorSlot) {
    return this.files.get(slot) ?? null;
  }
  async write(slot: MirrorSlot, text: string) {
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error("disk full");
    }
    this.writes.push(slot);
    this.files.set(slot, text);
  }
}

const week = JSON.stringify({ hats: [], weeks: {}, currentWeek: "2026-09-28" });
const planner = {
  "spread.profiles": JSON.stringify([{ id: "p1", name: "Me", store: "spread.v1.p1", theme: "system", accent: null }]),
  "spread.profile": "p1",
  "spread.v1.p1": week,
  "spread.theme": "dark",
  "spread-accent": "mint",
};

test("only planner keys are mirrored, and settings alone do not count as planner data", () => {
  assert.equal(isMirrorKey("spread.v1.abc"), true);
  assert.equal(isMirrorKey("spread-accent"), true);
  assert.equal(isMirrorKey("CapacitorStorage.x"), false);
  assert.equal(isMirrorKey("theme"), false);
  assert.equal(isPlannerKey("spread.v1"), true);
  assert.equal(isPlannerKey("spread.v1.abc"), true);
  assert.equal(isPlannerKey("spread.profiles"), true);
  assert.equal(isPlannerKey("spread.theme"), false);
  assert.equal(isPlannerKey("spread.recovery.spread.v1.abc"), false);
  assert.equal(hasPlannerData(new FakeStorage({ "spread.theme": "dark", "spread-accent": "blue" })), false);
  assert.equal(hasPlannerData(new FakeStorage(planner)), true);
});

test("collectEntries skips keys that belong to other code", () => {
  const storage = new FakeStorage({ ...planner, "CapacitorStorage.x": "1", other: "2" });
  assert.deepEqual(Object.keys(collectEntries(storage)).sort(), Object.keys(planner).sort());
});

test("a snapshot written by the writer restores into empty storage, byte for byte", async () => {
  const storage = new FakeStorage(planner);
  const files = new FakeFiles();
  const writer = createMirrorWriter(storage, files, { seq: 0, now: () => new Date("2026-10-01T12:00:00Z") });
  writer.schedule();
  await writer.flush();
  assert.equal(files.writes.length, 1);

  const wiped = new FakeStorage();
  const result = await restoreIfEmpty(wiped, files);
  assert.equal(result.restored, true);
  for (const [key, value] of Object.entries(planner)) assert.equal(wiped.getItem(key), value);
});

test("a snapshot never overwrites storage that still has planner data", async () => {
  const files = new FakeFiles();
  const writer = createMirrorWriter(new FakeStorage(planner), files, { seq: 0 });
  writer.schedule();
  await writer.flush();

  const live = new FakeStorage({ ...planner, "spread.v1.p1": JSON.stringify({ hats: [], weeks: {}, currentWeek: "2026-10-05" }) });
  const result = await restoreIfEmpty(live, files);
  assert.equal(result.restored, false);
  assert.equal(JSON.parse(live.getItem("spread.v1.p1") ?? "{}").currentWeek, "2026-10-05");
});

test("a late restore is dropped once the planner has given up waiting", async () => {
  const files = new FakeFiles();
  const writer = createMirrorWriter(new FakeStorage(planner), files, { seq: 0 });
  writer.schedule();
  await writer.flush();
  const wiped = new FakeStorage();
  const result = await restoreIfEmpty(wiped, files, () => true);
  assert.equal(result.restored, false);
  assert.equal(wiped.length, 0);
});

test("slots alternate, so the older good copy survives an interrupted write", async () => {
  const storage = new FakeStorage(planner);
  const files = new FakeFiles();
  const writer = createMirrorWriter(storage, files, { seq: 0 });
  for (let round = 0; round < 3; round += 1) {
    storage.setItem("spread.v1.p1", JSON.stringify({ hats: [], weeks: {}, currentWeek: `2026-10-0${round + 1}` }));
    writer.schedule();
    await writer.flush();
  }
  assert.deepEqual(files.writes, ["b", "a", "b"]);

  // Tear the newest slot (the app was killed mid-write).
  files.files.set("b", '{"kind":"spread-mirror","version":1,"seq":3,"sav');
  const wiped = new FakeStorage();
  const result = await restoreIfEmpty(wiped, files);
  assert.equal(result.restored, true);
  assert.equal(JSON.parse(wiped.getItem("spread.v1.p1") ?? "{}").currentWeek, "2026-10-02");
});

test("a burst of changes shares one write, and flush writes at once", async () => {
  const storage = new FakeStorage(planner);
  const files = new FakeFiles();
  const writer = createMirrorWriter(storage, files, { seq: 0, delayMs: 60_000 });
  writer.schedule();
  writer.schedule();
  writer.schedule();
  assert.equal(files.writes.length, 0);
  await writer.flush();
  assert.equal(files.writes.length, 1);
  await writer.flush();
  assert.equal(files.writes.length, 1, "nothing changed, nothing written");
});

test("an emptied store never replaces a good snapshot", async () => {
  const storage = new FakeStorage(planner);
  const files = new FakeFiles();
  const writer = createMirrorWriter(storage, files, { seq: 0 });
  writer.schedule();
  await writer.flush();
  storage.clear();
  writer.schedule();
  await writer.flush();
  assert.equal(files.writes.length, 1);
  const result = await restoreIfEmpty(new FakeStorage(), files);
  assert.equal(result.restored, true);
});

test("a failed write is retried on the next flush", async () => {
  const storage = new FakeStorage(planner);
  const files = new FakeFiles();
  files.failNext = 1;
  const writer = createMirrorWriter(storage, files, { seq: 0 });
  writer.schedule();
  await writer.flush();
  assert.equal(files.writes.length, 0);
  await writer.flush();
  assert.equal(files.writes.length, 1);
});

test("the sequence continues from the restored snapshot, so new writes beat old ones", async () => {
  const storage = new FakeStorage(planner);
  const files = new FakeFiles();
  const first = createMirrorWriter(storage, files, { seq: 0 });
  first.schedule();
  await first.flush();
  first.schedule();
  await first.flush();
  const { seq } = await restoreIfEmpty(new FakeStorage(planner), files);
  assert.equal(seq, 2);
  const next = createMirrorWriter(storage, files, { seq });
  storage.setItem("spread.v1.p1", JSON.stringify({ hats: [], weeks: {}, currentWeek: "2026-11-02" }));
  next.schedule();
  await next.flush();
  const newest = newestEnvelope([files.files.get("a") ?? null, files.files.get("b") ?? null]);
  assert.equal(newest?.seq, 3);
  assert.equal(JSON.parse(newest?.entries["spread.v1.p1"] ?? "{}").currentWeek, "2026-11-02");
});

test("damaged or foreign snapshots are rejected", () => {
  const good = { kind: "spread-mirror", version: 1, seq: 1, savedAt: "2026-10-01T00:00:00.000Z", entries: { "spread.v1": week } };
  assert.ok(parseEnvelope(JSON.stringify(good)));
  assert.equal(parseEnvelope(null), null);
  assert.equal(parseEnvelope("not json"), null);
  assert.equal(parseEnvelope(JSON.stringify({ ...good, kind: "other" })), null);
  assert.equal(parseEnvelope(JSON.stringify({ ...good, version: 2 })), null);
  assert.equal(parseEnvelope(JSON.stringify({ ...good, seq: "1" })), null);
  assert.equal(parseEnvelope(JSON.stringify({ ...good, entries: { "spread.v1": 5 } })), null);
  assert.equal(parseEnvelope(JSON.stringify({ ...good, entries: { "other.key": "x", "spread.v1": week } })), null);
  assert.equal(parseEnvelope(JSON.stringify({ ...good, entries: { "spread.theme": "dark" } })), null, "settings alone are not a planner");
});
