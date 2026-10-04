import assert from "node:assert/strict";
import test from "node:test";
import { backupFile, parseBackup } from "./backup.ts";
import { migrateRoster, profileStore } from "./profiles.ts";
import { normalizeData, weekKey } from "./model.ts";

// Shapes written by earlier releases. An upgrade must read them without loss.
const legacyWeek = {
  hats: [
    { id: "work", name: "Work", defaultHours: 20, color: "#007AFF" },
    { id: "home", name: "Home", defaultHours: 6, color: "#34C759" },
  ],
  weeks: {
    "2026-09-28": {
      boxes: [
        { hatId: "work", hours: 20, tasks: [{ id: "t1", text: "Ship the build", done: false }] },
        { hatId: "home", hours: 6, tasks: [] },
      ],
    },
  },
  currentWeek: "2026-09-28",
};

test("a week saved before allocations existed still opens", () => {
  const data = normalizeData(legacyWeek);
  assert.equal(data.hats.length, 2);
  assert.deepEqual(data.weeks["2026-09-28"].allocations, []);
  assert.equal(data.weeks["2026-09-28"].boxes[0].tasks[0].text, "Ship the build");
  assert.equal(data.currentWeek, "2026-09-28");
});

test("an unreadable or empty value falls back to an empty planner instead of throwing", () => {
  for (const raw of [null, undefined, 7, "x", [], {}]) {
    const data = normalizeData(raw);
    assert.ok(Array.isArray(data.hats));
    assert.equal(typeof data.currentWeek, "string");
  }
  assert.equal(normalizeData({ hats: "no", weeks: 3, currentWeek: 9 }).currentWeek, weekKey());
});

test("a backup file round-trips with tasks, hours and photos intact", () => {
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD";
  const source = normalizeData({
    ...legacyWeek,
    weeks: {
      "2026-09-28": {
        boxes: [
          { hatId: "work", hours: 20, tasks: [{ id: "t1", text: "Ship", done: true, content: { blocks: [{ id: "b1", type: "photo", src: photo }] } }] },
          { hatId: "home", hours: 6, tasks: [] },
        ],
        allocations: [{ id: "a1", hatId: "work", day: "mon", hours: 4, order: 0 }],
      },
    },
  });
  const text = JSON.stringify(backupFile(source));
  const restored = parseBackup(text);
  assert.ok(restored);
  assert.deepEqual(restored.data.hats, source.hats);
  assert.deepEqual(restored.data.weeks, source.weeks);
  assert.equal(restored.data.currentWeek, source.currentWeek);
  assert.equal(restored.summary.weeks, 1);
  assert.equal(restored.summary.tasks, 1);
  assert.deepEqual(restored.summary.spreads, ["Work", "Home"]);
});

test("a bare payload from the first release restores too", () => {
  const restored = parseBackup(JSON.stringify(legacyWeek));
  assert.ok(restored);
  assert.equal(restored.summary.tasks, 1);
});

test("files that are not Spread backups are refused", () => {
  assert.equal(parseBackup(""), null);
  assert.equal(parseBackup("{"), null);
  assert.equal(parseBackup(JSON.stringify([1, 2])), null);
  assert.equal(parseBackup(JSON.stringify({ hats: "x", weeks: {} })), null);
  assert.equal(parseBackup(JSON.stringify({ kind: "spread-backup", version: 1 })), null);
});

test("the roster written by the people-era release moves to profiles and keeps its stores", () => {
  const values = new Map<string, string>([
    ["spread.people", JSON.stringify([{ id: "me", name: "Me", store: "spread.v1", theme: "dark", accent: "mint" }, { id: "kid", name: "Kid", store: profileStore("kid") }])],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
  const roster = migrateRoster(storage);
  assert.deepEqual(roster.map((profile) => profile.store), ["spread.v1", profileStore("kid")]);
  assert.equal(values.has("spread.people"), false);
  assert.ok(values.get("spread.profiles"));
  assert.equal(migrateRoster(storage).length, 2, "running it again changes nothing");
});
