import assert from "node:assert/strict";
import test from "node:test";
import { backupFile, collectFullPayload, fullBackupText, parseAnyBackup, parseFullBackup, planRestoreAsNew } from "./backup.ts";
import { defaultData, STORE_KEY, normalizeData } from "./model.ts";
import { ACTIVE_PROFILE_KEY, PROFILE_LIMIT, PROFILES_KEY, profileStore, type Profile } from "./profiles.ts";
import { SCHEMA_KEY } from "./schema.ts";

class Memory {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

function profile(id: string, name: string): Profile {
  return { id, name, store: profileStore(id), theme: "dark", accent: "green" };
}

function twoProfilePlanner() {
  const s = new Memory();
  const roster = [profile("p1", "Will"), profile("p2", "Work")];
  s.setItem(PROFILES_KEY, JSON.stringify(roster));
  s.setItem(ACTIVE_PROFILE_KEY, "p2");
  const a = defaultData();
  a.hats[0].name = "Alpha";
  const b = defaultData();
  b.hats[0].name = "Beta";
  s.setItem(profileStore("p1"), JSON.stringify(a));
  s.setItem(profileStore("p2"), JSON.stringify(b));
  s.setItem("spread-accent", "green");
  s.setItem("spread.license", JSON.stringify({ ok: true, plan: "personal" }));
  s.setItem(SCHEMA_KEY, "2");
  s.setItem("spread.recovery.spread.v1", "junk");
  return s;
}

test("a full backup holds every profile and the settings, and leaves out license, schema and recovery copies", () => {
  const payload = collectFullPayload(twoProfilePlanner(), new Date("2026-10-08T12:00:00Z"), "dev-1");
  assert.deepEqual(payload.roster.map((p) => p.id), ["p1", "p2"]);
  assert.equal(payload.activeProfileId, "p2");
  assert.equal(payload.deviceId, "dev-1");
  assert.deepEqual(Object.keys(payload.stores).sort(), ["p1", "p2"]);
  assert.deepEqual(Object.keys(payload.settings), ["spread-accent"]);
});

test("write then read gives the same planner back", async () => {
  const payload = collectFullPayload(twoProfilePlanner(), new Date(), null);
  const read = await parseFullBackup(await fullBackupText(payload));
  assert.ok(read);
  assert.deepEqual(read.payload, payload);
  assert.equal(read.summary.profiles.length, 2);
  assert.deepEqual(read.summary.profiles[0].spreads.includes("Alpha"), true);
});

test("a damaged or edited file is rejected, never half-read", async () => {
  const text = await fullBackupText(collectFullPayload(twoProfilePlanner(), new Date(), null));
  const file = JSON.parse(text);
  assert.equal(await parseFullBackup(JSON.stringify({ ...file, payloadText: file.payloadText.replace("Alpha", "Evil!") })), null);
  assert.equal(await parseFullBackup(text.slice(0, text.length - 10)), null);
  assert.equal(await parseFullBackup(JSON.stringify({ ...file, checksum: "0".repeat(64) })), null);
  assert.equal(await parseFullBackup(JSON.stringify({ ...file, version: 3 })), null);
});

test("a backup from a newer schema is refused", async () => {
  const payload = { ...collectFullPayload(twoProfilePlanner(), new Date(), null), schemaVersion: 99 };
  assert.equal(await parseFullBackup(await fullBackupText(payload)), null);
});

test("version 1 week files still open through the same entry point", async () => {
  const text = JSON.stringify(backupFile(normalizeData(defaultData())));
  const parsed = await parseAnyBackup(text);
  assert.equal(parsed?.kind, "week");
  assert.equal((await parseAnyBackup("not json")) , null);
});

test("restore as new adds profiles beside existing ones and changes nothing that is there", async () => {
  const payload = collectFullPayload(twoProfilePlanner(), new Date(), null);
  const existing = [profile("keep", "Mine")];
  let n = 0;
  const plan = planRestoreAsNew(payload, existing, () => `new${(n += 1)}`);
  assert.ok(plan.ok);
  assert.deepEqual(plan.profiles.slice(0, 1), existing);
  assert.equal(plan.profiles.length, 3);
  assert.deepEqual(plan.profiles.slice(1).map((p) => p.name), ["Will (restored)", "Work (restored)"]);
  assert.ok(plan.writes.every((w) => w.key.startsWith(`${STORE_KEY}.new`)));
  assert.ok(!plan.writes.some((w) => w.key === profileStore("keep")));
  assert.equal(JSON.parse(plan.writes[0].value).hats[0].name, "Alpha");
});

test("restored names stay unique and within the name limit when restored twice", () => {
  const payload = collectFullPayload(twoProfilePlanner(), new Date(), null);
  let n = 0;
  const first = planRestoreAsNew(payload, [], () => `a${(n += 1)}`);
  assert.ok(first.ok);
  const second = planRestoreAsNew(payload, first.profiles, () => `b${(n += 1)}`);
  assert.ok(second.ok);
  const names = second.profiles.map((p) => p.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  assert.ok(second.profiles.every((p) => p.name.length <= 24));
});

test("when there is no room it refuses and writes nothing", () => {
  const payload = collectFullPayload(twoProfilePlanner(), new Date(), null);
  const full = Array.from({ length: PROFILE_LIMIT - 1 }, (_, i) => profile(`x${i}`, `P${i}`));
  const plan = planRestoreAsNew(payload, full, () => "z");
  assert.deepEqual(plan, { ok: false, reason: "no-room", needed: 2, free: 1 });
});

test("a profile whose stored data is unreadable is skipped and counted", async () => {
  const s = twoProfilePlanner();
  s.setItem(profileStore("p1"), "{not json");
  const payload = collectFullPayload(s, new Date(), null);
  let n = 0;
  const plan = planRestoreAsNew(payload, [], () => `q${(n += 1)}`);
  assert.ok(plan.ok);
  assert.equal(plan.profiles.length, 1);
  assert.equal(plan.skipped, 1);
});
