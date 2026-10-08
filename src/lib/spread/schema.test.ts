import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_SCHEMA, SCHEMA_KEY, readSchemaVersion, runMigrations, type MigrationStep } from "./schema.ts";
import { STORE_KEY } from "./model.ts";
import { PROFILES_KEY } from "./profiles.ts";

class Memory {
  map = new Map<string, string>();
  failSet = false;
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
    if (this.failSet) throw new Error("full");
    this.map.set(key, value);
  }
}

function planner() {
  const store = new Memory();
  store.setItem(PROFILES_KEY, JSON.stringify([{ id: "p1", name: "Me", store: STORE_KEY, theme: "system", accent: null }]));
  store.setItem(STORE_KEY, JSON.stringify({ hats: [], weeks: {}, currentWeek: "2026-09-28" }));
  return store;
}

test("an empty device starts at the current version with no snapshot", () => {
  const store = new Memory();
  let snapshots = 0;
  const outcome = runMigrations(store, { snapshot: () => void (snapshots += 1) });
  assert.deepEqual(outcome, { status: "current", version: CURRENT_SCHEMA });
  assert.equal(readSchemaVersion(store), CURRENT_SCHEMA);
  assert.equal(snapshots, 0);
});

test("existing planner data with no marker is version 1, is snapshotted, then migrated without changing data", () => {
  const store = planner();
  const before = [...store.map.entries()];
  const snaps: { label: string; entries: Record<string, string> }[] = [];
  const outcome = runMigrations(store, { snapshot: (label, entries) => snaps.push({ label, entries }) });
  assert.deepEqual(outcome, { status: "migrated", from: 1, to: CURRENT_SCHEMA });
  assert.equal(snaps.length, 1);
  assert.equal(snaps[0].label, "pre-migration-v1");
  assert.deepEqual(snaps[0].entries, Object.fromEntries(before));
  for (const [key, value] of before) assert.equal(store.getItem(key), value);
  assert.equal(readSchemaVersion(store), CURRENT_SCHEMA);
});

test("running again is a no-op", () => {
  const store = planner();
  runMigrations(store);
  let snapshots = 0;
  assert.deepEqual(runMigrations(store, { snapshot: () => void (snapshots += 1) }), { status: "current", version: CURRENT_SCHEMA });
  assert.equal(snapshots, 0);
});

test("a marker from a newer build is reported and nothing is written", () => {
  const store = planner();
  store.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA + 1));
  const before = JSON.stringify([...store.map.entries()]);
  assert.deepEqual(runMigrations(store), { status: "newer", version: CURRENT_SCHEMA + 1 });
  assert.equal(JSON.stringify([...store.map.entries()]), before);
});

test("an unreadable marker is treated as version 1", () => {
  for (const raw of ["", "abc", "1.5", "-3", "0"]) {
    const store = planner();
    store.setItem(SCHEMA_KEY, raw);
    assert.equal(readSchemaVersion(store), null);
    assert.equal(runMigrations(store).status, "migrated");
  }
});

test("an interrupted step leaves the marker behind and the next launch finishes it", () => {
  const store = planner();
  let calls = 0;
  const steps: MigrationStep[] = [
    { from: 1, run: () => void (calls += 1) },
    {
      from: 2,
      run: () => {
        calls += 1;
        if (calls === 2) throw new Error("killed");
      },
    },
  ];
  const first = runMigrations(store, { steps, current: 3 });
  assert.equal(first.status, "failed");
  assert.equal(readSchemaVersion(store), 2);
  const second = runMigrations(store, { steps, current: 3 });
  assert.deepEqual(second, { status: "migrated", from: 2, to: 3 });
  assert.equal(readSchemaVersion(store), 3);
});

test("a snapshot that throws does not block migration", () => {
  const store = planner();
  const outcome = runMigrations(store, {
    snapshot: () => {
      throw new Error("disk");
    },
  });
  assert.equal(outcome.status, "migrated");
});

test("a full store fails safely and leaves data readable", () => {
  const store = planner();
  store.failSet = true;
  assert.equal(runMigrations(store).status, "failed");
  assert.ok(store.getItem(STORE_KEY));
});
