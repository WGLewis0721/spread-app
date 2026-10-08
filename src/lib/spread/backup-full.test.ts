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
  assert.equal(plan.skipped.length, 1);
});

// --- Restore room (audit H3, M2, M3) ------------------------------------------------------------

import { restoreCapacity } from "./backup.ts";

function tenProfiles() {
  const s = new Memory();
  const roster = Array.from({ length: PROFILE_LIMIT }, (_, i) => profile(`p${i}`, `Profile ${i}`));
  s.setItem(PROFILES_KEY, JSON.stringify(roster));
  for (const p of roster) {
    const d = defaultData();
    d.hats[0].name = `Hat of ${p.id}`;
    s.setItem(p.store, JSON.stringify(d));
  }
  return collectFullPayload(s, new Date(), null);
}

test("a full set of ten profiles restores onto a new install by filling its one empty profile", () => {
  const payload = tenProfiles();
  const empty = profile("fresh", "Me");
  let n = 0;
  const plan = planRestoreAsNew(payload, [empty], () => `n${(n += 1)}`, { replaceEmpty: "fresh" });
  assert.ok(plan.ok);
  assert.equal(plan.profiles.length, PROFILE_LIMIT);
  assert.equal(plan.replacedId, "fresh");
  assert.equal(plan.writes.length, PROFILE_LIMIT);
  assert.equal(plan.profiles[0].id, "fresh", "the empty profile kept its place and its storage key");
  assert.equal(plan.profiles[0].name, "Profile 0");
  assert.equal(JSON.parse(plan.writes[0].value).hats[0].name, "Hat of p0");
});

test("without an empty profile to fill, ten onto one is still refused, but with the number that fits", () => {
  const plan = planRestoreAsNew(tenProfiles(), [profile("mine", "Mine")], () => "x");
  assert.deepEqual(plan, { ok: false, reason: "no-room", needed: 10, free: 9 });
  assert.equal(restoreCapacity(1, false), 9);
  assert.equal(restoreCapacity(1, true), 10);
  assert.equal(restoreCapacity(10, false), 0);
});

test("choosing which profiles to restore fits any room", () => {
  const payload = tenProfiles();
  let n = 0;
  const plan = planRestoreAsNew(payload, [profile("mine", "Mine")], () => `n${(n += 1)}`, { select: ["p0", "p3", "p7"] });
  assert.ok(plan.ok);
  assert.equal(plan.profiles.length, 4);
  assert.deepEqual(plan.profiles.slice(1).map((p) => p.name), ["Profile 0 (restored)", "Profile 3 (restored)", "Profile 7 (restored)"]);
  assert.equal(plan.replacedId, null);
});

test("an existing profile with content is never replaced, even if asked", () => {
  const payload = tenProfiles();
  const plan = planRestoreAsNew(payload, [profile("mine", "Mine")], () => "x", { select: ["p0"], replaceEmpty: null });
  assert.ok(plan.ok);
  assert.equal(plan.profiles[0].id, "mine");
  assert.equal(plan.writes.every((w) => w.key !== profileStore("mine")), true);
});

test("unreadable profiles are named, not silently dropped", () => {
  const s = twoProfilePlanner();
  s.setItem(profileStore("p1"), "{not json");
  const payload = collectFullPayload(s, new Date(), null);
  let n = 0;
  const plan = planRestoreAsNew(payload, [], () => `q${(n += 1)}`);
  assert.ok(plan.ok);
  assert.deepEqual(plan.skipped, ["Will"]);
});

test("the summary marks which profiles can be restored", async () => {
  const s = twoProfilePlanner();
  s.setItem(profileStore("p1"), "{not json");
  const read = await parseFullBackup(await fullBackupText(collectFullPayload(s, new Date(), null)));
  assert.ok(read);
  assert.deepEqual(read.summary.profiles.map((p) => [p.id, p.readable]), [["p1", false], ["p2", true]]);
});

test("recovery copies are kept in the file, and files without them still read", async () => {
  const s = twoProfilePlanner();
  const payload = collectFullPayload(s, new Date(), null);
  assert.deepEqual(payload.recovery, { "spread.recovery.spread.v1": "junk" });
  const read = await parseFullBackup(await fullBackupText(payload));
  assert.deepEqual(read?.payload.recovery, payload.recovery);
  const old = { ...payload };
  delete old.recovery;
  const readOld = await parseFullBackup(await fullBackupText(old));
  assert.ok(readOld);
  assert.equal(readOld.payload.recovery, undefined);
});

test("device-local sync and backup state never goes into a backup file", () => {
  const s = twoProfilePlanner();
  s.setItem("spread.cloud.backup", "off");
  s.setItem("spread.sync.account.S1", "_accountRecordName");
  const payload = collectFullPayload(s, new Date(), null);
  assert.deepEqual(Object.keys(payload.settings), ["spread-accent"]);
  assert.ok(!JSON.stringify(payload).includes("_accountRecordName"));
});

test("a restored profile never keeps the iCloud sync link of the one it came from", () => {
  const s = twoProfilePlanner();
  const roster = [{ ...profile("p1", "Will"), syncId: "sync-1" }, profile("p2", "Work")];
  s.setItem(PROFILES_KEY, JSON.stringify(roster));
  const payload = collectFullPayload(s, new Date(), null);
  let n = 0;
  const plan = planRestoreAsNew(payload, [], () => `new${(n += 1)}`);
  assert.ok(plan.ok);
  assert.ok(plan.profiles.every((p) => p.syncId === undefined));
});
