// Astra A01/A02: ordinary full-backup restore, with both iCloud flags off.
import assert from "node:assert/strict";
import test from "node:test";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, type SpreadData } from "./model.ts";
import { PROFILES_KEY, profileStore, type Profile } from "./profiles.ts";
import type { FullBackupPayload } from "./backup.ts";

const storage = installBrowser();
const { useSpread } = await import("@/lib/spread/store");

const local: Profile = { id: "local", name: "Local", store: profileStore("local"), theme: "light", accent: null };

function seed(data: SpreadData | string, roster: Profile[] = [local]) {
  storage.map.clear();
  storage.failWhen = null;
  storage.map.set(local.store, typeof data === "string" ? data : JSON.stringify(data));
  storage.map.set(PROFILES_KEY, JSON.stringify(roster));
  useSpread.setState({ profiles: roster, activeId: roster[0].id, data: typeof data === "string" ? defaultData() : data });
}

function backupOf(body: SpreadData): FullBackupPayload {
  const source: Profile = { id: "remote", name: "Imported", store: profileStore("remote"), theme: "light", accent: null };
  return { schemaVersion: 2, createdAt: new Date().toISOString(), deviceId: null, activeProfileId: "remote", roster: [source], stores: { remote: JSON.stringify(body) }, settings: {} };
}

const imported = (() => {
  const d = defaultData();
  d.hats[0].name = "Imported hat";
  return d;
})();

test("A01: a profile customised only by hours and colour is not replaced", () => {
  const custom = defaultData();
  custom.weeks[custom.currentWeek].boxes[0].hours = 29;
  custom.hats[0].color = "#123456";
  seed(custom);
  const before = storage.map.get(local.store);
  const result = useSpread.getState().restoreAsNew(backupOf(imported));
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.replacedEmpty, false);
  assert.equal(storage.map.get(local.store), before, "the customised profile's bytes are untouched");
  assert.equal(JSON.parse(storage.map.get(PROFILES_KEY) as string).length, 2, "the backup was added beside it");
});

test("A01: a profile holding valid JSON that is not a planner is never overwritten", () => {
  for (const damaged of ["null", "[]", '"x"', "{}", "{ truncated"]) {
    seed(damaged);
    const result = useSpread.getState().restoreAsNew(backupOf(imported));
    assert.equal(result.ok && result.replacedEmpty, false, damaged);
    assert.equal(storage.map.get(local.store), damaged, `bytes preserved: ${damaged}`);
  }
});

test("A01: a truly new, untouched profile is still filled (a fresh install can take a full set)", () => {
  seed(defaultData());
  const result = useSpread.getState().restoreAsNew(backupOf(imported));
  assert.equal(result.ok && result.replacedEmpty, true);
  assert.equal(JSON.parse(storage.map.get(local.store) as string).hats[0].name, "Imported hat");
});

test("A02: a failed roster write is a failure, not a success, and changes nothing", () => {
  const keep = defaultData();
  keep.weeks[keep.currentWeek].boxes[0].tasks.push({ id: "keep", text: "keep local", done: false });
  seed(keep);
  const snapshot = new Map(storage.map);
  storage.failWhen = (key) => key === PROFILES_KEY;
  const result = useSpread.getState().restoreAsNew(backupOf(imported));
  assert.equal(result.ok, false);
  assert.equal(useSpread.getState().profiles.length, 1, "memory matches storage");
  assert.deepEqual([...storage.map], [...snapshot], "storage is exactly as it was, no orphan bodies");
});

test("A02: a failure while writing profile bodies leaves every earlier write undone", () => {
  const keep = defaultData();
  keep.weeks[keep.currentWeek].boxes[0].tasks.push({ id: "keep", text: "keep local", done: false });
  seed(keep);
  const snapshot = new Map(storage.map);
  let bodyWrites = 0;
  storage.failWhen = (key) => key.startsWith("spread.v1.") && key !== local.store && ++bodyWrites === 2;
  const two: FullBackupPayload = backupOf(imported);
  two.roster.push({ id: "r2", name: "Second", store: profileStore("r2"), theme: "light", accent: null });
  two.stores.r2 = JSON.stringify(imported);
  const result = useSpread.getState().restoreAsNew(two);
  assert.equal(result.ok, false);
  assert.deepEqual([...storage.map], [...snapshot]);
});

test("A02: a failed replacement of an untouched profile puts the original bytes back", () => {
  seed(defaultData());
  const before = storage.map.get(local.store);
  storage.failWhen = (key) => key === PROFILES_KEY;
  const result = useSpread.getState().restoreAsNew(backupOf(imported));
  assert.equal(result.ok, false);
  assert.equal(storage.map.get(local.store), before);
});

// Astra A09: rollback must work when every profile slot is in use.
function tenProfiles(prefix: string) {
  const roster: Profile[] = Array.from({ length: 10 }, (_, i) => ({ id: `${prefix}${i}`, name: `${prefix}${i}`, store: profileStore(`${prefix}${i}`), theme: "light", accent: null }));
  const entries: Record<string, string> = { [PROFILES_KEY]: JSON.stringify(roster), "spread.profile": roster[0].id };
  roster.forEach((profile, i) => {
    const d = defaultData();
    d.weeks[d.currentWeek].boxes[0].tasks.push({ id: `${prefix}${i}`, text: `${prefix} task ${i}`, done: false });
    entries[profile.store] = JSON.stringify(d);
  });
  return { roster, entries };
}

test("A09: with ten profiles in use, a safety copy can be rolled back in place", () => {
  const now = tenProfiles("now");
  const was = tenProfiles("was");
  storage.map.clear();
  storage.failWhen = null;
  for (const [k, v] of Object.entries(now.entries)) storage.map.set(k, v);
  useSpread.setState({ profiles: now.roster, activeId: now.roster[0].id, data: JSON.parse(now.entries[now.roster[0].store]) });
  const result = useSpread.getState().rollbackToCopy(was.entries);
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(storage.map.get(PROFILES_KEY) as string).map((p: Profile) => p.id), was.roster.map((p) => p.id));
  assert.equal(storage.map.get(was.roster[3].store), was.entries[was.roster[3].store]);
  assert.equal(storage.map.has(now.roster[3].store), false, "the replaced profiles' leftovers are removed");
  assert.equal(useSpread.getState().profiles.length, 10);
});

test("A09: a rollback that fails part-way leaves the current planner exactly as it was", () => {
  const now = tenProfiles("now");
  const was = tenProfiles("was");
  storage.map.clear();
  for (const [k, v] of Object.entries(now.entries)) storage.map.set(k, v);
  useSpread.setState({ profiles: now.roster, activeId: now.roster[0].id, data: JSON.parse(now.entries[now.roster[0].store]) });
  const before = new Map(storage.map);
  let n = 0;
  storage.failWhen = (key) => key.startsWith("spread.v1.was") && ++n === 4;
  const result = useSpread.getState().rollbackToCopy(was.entries);
  storage.failWhen = null;
  assert.equal(result.ok, false);
  assert.deepEqual([...storage.map], [...before]);
  assert.equal(useSpread.getState().profiles[0].id, "now0");
});

test("A09: a copy holding an unreadable profile is refused, not partly restored", () => {
  const now = tenProfiles("now");
  const was = tenProfiles("was");
  was.entries[was.roster[2].store] = "null";
  storage.map.clear();
  for (const [k, v] of Object.entries(now.entries)) storage.map.set(k, v);
  useSpread.setState({ profiles: now.roster, activeId: now.roster[0].id, data: JSON.parse(now.entries[now.roster[0].store]) });
  const before = new Map(storage.map);
  const result = useSpread.getState().rollbackToCopy(was.entries);
  assert.deepEqual(result, { ok: false, reason: "damaged" });
  assert.deepEqual([...storage.map], [...before]);
});
