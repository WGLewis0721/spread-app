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
