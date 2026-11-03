import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SpreadData } from "./model.ts";
import { remainingHours, shiftWeek } from "./model.ts";
import { projectNativeV2 } from "./native-v2-projection.ts";

function source(): SpreadData {
  return {
    hats: [
      { id: "work", name: "Work", category: "work", color: "#34C759", defaultHours: 8 },
      { id: "home", name: "Home", category: "home", color: "#FF9500", defaultHours: 4 },
    ],
    currentWeek: "2026-11-02",
    weeks: {
      "2026-11-02": {
        boxes: [
          {
            hatId: "work",
            hours: 7.5,
            tasks: [
              {
                id: "task-placed",
                text: "Review roadmap",
                done: false,
                allocationId: "alloc-work",
                content: {
                  blocks: [
                    { id: "note-1", type: "notes", text: "Private notes must stay stored." },
                  ],
                },
              },
              { id: "task-stale", text: "Move later", done: false, allocationId: "deleted-link" },
              { id: "task-done", text: "Done", done: true },
            ],
          },
          { hatId: "home", hours: 4, tasks: [] },
        ],
        allocations: [
          { id: "alloc-work", hatId: "work", day: "2026-11-04", hours: 2.5, order: 1 },
          { id: "alloc-home", hatId: "home", day: "2026-11-03", hours: 1, order: 0 },
        ],
      },
      "2026-10-26": {
        boxes: [
          { hatId: "work", hours: 6, tasks: [{ id: "history", text: "Older work", done: false }] },
        ],
        allocations: [],
      },
    },
  };
}

test("native v2 JSON matches the fixture independently decoded by Swift", () => {
  const expected = JSON.parse(
    readFileSync(
      new URL(
        "../../../ios/SpreadNativeV2/Tests/SpreadNativeV2Tests/Fixtures/projection-v1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.deepEqual(projectNativeV2(source(), "profile-1"), expected);
});

test("native v2 projections never mutate stored planner data or rich task content", () => {
  const data = source();
  const original = structuredClone(data);
  const rendered = projectNativeV2(data, "profile-1");
  rendered.snapshot.tasks[0].text = "UI-only changed text";
  rendered.snapshot.roles[0].hours = 999;
  assert.deepEqual(data, original);
  assert.equal(data.weeks[data.currentWeek].boxes[0].tasks[0].content?.blocks[0].type, "notes");
});

test("native v2 preserves profile identity and rejects missing profile context", () => {
  const data = source();
  assert.equal(projectNativeV2(data, "p-first").profileId, "p-first");
  assert.equal(projectNativeV2(data, "p-second").profileId, "p-second");
  assert.throws(() => projectNativeV2(data, " "), /active profile ID/);
});

test("native v2 projects only the selected week without changing historical data", () => {
  const data = source();
  const now = projectNativeV2(data, "p1");
  assert.equal(now.snapshot.weekKey, "2026-11-02");
  assert.deepEqual(
    now.snapshot.tasks.map((t) => t.id),
    ["task-placed", "task-stale", "task-done"],
  );
  data.currentWeek = shiftWeek("2026-11-02", -1);
  const before = structuredClone(data);
  const prior = projectNativeV2(data, "p1");
  assert.equal(prior.snapshot.weekKey, "2026-10-26");
  assert.deepEqual(
    prior.snapshot.tasks.map((t) => t.id),
    ["history"],
  );
  assert.deepEqual(data, before);
});

test("native v2 uses weekly bank hours and never substitutes category defaults", () => {
  const data = source();
  data.hats[0].defaultHours = 40;
  assert.equal(projectNativeV2(data, "p1").snapshot.roles[0].hours, 7.5);
  assert.equal(remainingHours(7.5, data.weeks[data.currentWeek].allocations, "work"), 5);
});

test("native v2 preserves real half-hour allocations and their ordering", () => {
  const allocations = projectNativeV2(source(), "p1").snapshot.allocations;
  assert.deepEqual(
    allocations.map(({ id, day, hours, order }) => ({ id, day, hours, order })),
    [
      { id: "alloc-work", day: "2026-11-04", hours: 2.5, order: 1 },
      { id: "alloc-home", day: "2026-11-03", hours: 1, order: 0 },
    ],
  );
});

test("native v2 turns missing links into To place without altering stored IDs", () => {
  const data = source();
  const snapshot = projectNativeV2(data, "p1").snapshot;
  assert.equal(snapshot.tasks[1].allocationId, null);
  assert.equal(data.weeks[data.currentWeek].boxes[0].tasks[1].allocationId, "deleted-link");
  assert.equal(snapshot.tasks[0].allocationId, "alloc-work");
});

test("native v2 tolerates an uncreated week without writing it into storage", () => {
  const data = source();
  data.currentWeek = "2026-11-09";
  const before = structuredClone(data);
  const snapshot = projectNativeV2(data, "p1").snapshot;
  assert.equal(snapshot.roles[0].hours, 8);
  assert.deepEqual(snapshot.allocations, []);
  assert.deepEqual(snapshot.tasks, []);
  assert.deepEqual(data, before);
});

test("native v2 excludes orphan allocations, matches five categories, and falls back to custom art", () => {
  const data = source();
  data.hats.push({ id: "other", name: "Other", color: "#2277AA", defaultHours: 0 });
  data.weeks[data.currentWeek].allocations.push({
    id: "orphan",
    hatId: "removed-role",
    day: "2026-11-05",
    hours: 1,
    order: 2,
  });
  const snapshot = projectNativeV2(data, "p1").snapshot;
  assert.equal(snapshot.roles[2].category, "custom");
  assert.ok(!snapshot.allocations.some((a) => a.id === "orphan"));
});

test("native v2 is deterministic and does not change serialization across repeated reads", () => {
  const data = source();
  assert.equal(
    JSON.stringify(projectNativeV2(data, "p1")),
    JSON.stringify(projectNativeV2(data, "p1")),
  );
});

test("legacy wrong-role links render in To place without rewriting the original record", () => {
  const data = source();
  data.weeks[data.currentWeek].boxes[0].tasks[0].allocationId = "alloc-home";
  const original = JSON.stringify(data);
  const rendered = projectNativeV2(data, "profile-1");
  assert.equal(rendered.snapshot.tasks[0].allocationId, null);
  assert.equal(JSON.stringify(data), original);
});
