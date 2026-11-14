import assert from "node:assert/strict";
import test from "node:test";
import { normalizeData, type SpreadData } from "./model.ts";
import { WEEK_COPY_BATCH_WEEKS, planWeekCopy } from "./week-copy.ts";

// 2026-11-16 is a Monday. The tests check that, so a wrong date fails here and not in a later assertion.
const SRC = "2026-11-16";
const TUE = "2026-11-17";
const WED = "2026-11-18";

test("the test dates are right: SRC is a Monday and the eight weeks after it end on 2027-01-11", () => {
  assert.equal(new Date(`${SRC}T00:00:00Z`).getUTCDay(), 1);
  assert.equal(new Date("2027-01-11T00:00:00Z").getUTCDay(), 1);
});

/** A week on screen with hours, a task on a day, day hours, and a capacity. */
function profile(extra: Partial<SpreadData> = {}): SpreadData {
  return normalizeData({
    hats: [
      { id: "work", name: "Work", defaultHours: 20, color: "#34C759", category: "work" },
      { id: "health", name: "Health", defaultHours: 3, color: "#30B0C7", category: "health" },
    ],
    weeks: {
      [SRC]: {
        boxes: [
          {
            hatId: "work", hours: 12, tasks: [
              { id: "t-report", text: "Quarterly report", done: true, allocationId: "a-work", estimateMinutes: 120, important: true,
                content: { blocks: [{ id: "b1", type: "notes", text: "Outline first" }] } },
            ],
          },
          { hatId: "health", hours: 3, tasks: [] },
        ],
        allocations: [
          { id: "a-work", hatId: "work", day: TUE, hours: 2, order: 0 },
          { id: "a-health", hatId: "health", day: WED, hours: 1, order: 0 },
        ],
        life: { version: 1, capacityHours: 30 },
      },
    },
    currentWeek: SRC,
    ...extra,
  } as unknown as SpreadData);
}

test("the week on screen is copied into the eight weeks after it, as real weeks", () => {
  const result = planWeekCopy(profile(), 1);
  assert.equal(result.preview.eligible, true);
  assert.equal(result.preview.fillCount, WEEK_COPY_BATCH_WEEKS);
  assert.equal(result.preview.skipCount, 0);
  assert.deepEqual(result.preview.targets.map((target) => target.key), [
    "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28", "2027-01-04", "2027-01-11",
  ]);
  assert.ok(result.data, "a copy has data");
  const copy = result.data?.weeks["2026-11-23"];
  assert.equal(copy?.boxes.find((box) => box.hatId === "work")?.hours, 12);
  assert.equal(copy?.boxes.find((box) => box.hatId === "health")?.hours, 3);
  assert.equal(copy?.life?.capacityHours, 30);
});

test("days move with their week, so the copy stays in its own week", () => {
  const data = planWeekCopy(profile(), 1).data;
  assert.ok(data);
  const first = data?.weeks["2026-11-23"];
  assert.equal(first?.allocations.find((a) => a.hatId === "work")?.day, "2026-11-24");
  const last = data?.weeks["2027-01-11"];
  assert.equal(last?.allocations.find((a) => a.hatId === "work")?.day, "2027-01-12");
  for (const key of ["2026-11-23", "2027-01-11"]) {
    const week = data?.weeks[key];
    for (const item of week?.allocations ?? []) {
      assert.ok(item.day >= key && item.day < new Date(new Date(`${key}T00:00:00Z`).getTime() + 7 * 86400000).toISOString().slice(0, 10),
        `${item.day} is inside the week of ${key}`);
    }
  }
});

test("tasks copy as not done, keep their notes and estimate, and link to the copied day hours", () => {
  const data = planWeekCopy(profile(), 1).data;
  const copy = data?.weeks["2026-11-23"];
  const task = copy?.boxes.find((box) => box.hatId === "work")?.tasks[0];
  assert.equal(task?.text, "Quarterly report");
  assert.equal(task?.done, false, "a copied task starts not done");
  assert.equal(task?.estimateMinutes, 120);
  assert.equal(task?.important, true);
  assert.equal(task?.content?.blocks[0].type, "notes", "rich notes are copied");
  const link = copy?.allocations.find((a) => a.id === task?.allocationId);
  assert.equal(link?.hatId, "work", "the copied task links to the copied day hours for its area");
  assert.equal(link?.day, "2026-11-24");
});

test("every id in the copies is new, so no week shares an id with another", () => {
  const data = planWeekCopy(profile(), 1).data;
  const ids: string[] = [];
  for (const week of Object.values(data?.weeks ?? {})) {
    ids.push(...week.allocations.map((a) => a.id));
    for (const box of week.boxes) ids.push(...box.tasks.map((t) => t.id));
  }
  assert.equal(new Set(ids).size, ids.length);
});

test("a week that already holds a plan is skipped, and nothing in it changes", () => {
  const base = profile();
  const existing = {
    boxes: [{ hatId: "work", hours: 5, tasks: [] }, { hatId: "health", hours: 0, tasks: [] }],
    allocations: [],
  };
  const data = profile({ weeks: { ...base.weeks, "2026-11-30": existing } });
  const result = planWeekCopy(data, 1);
  assert.equal(result.preview.eligible, true);
  assert.equal(result.preview.skipCount, 1);
  assert.equal(result.preview.fillCount, WEEK_COPY_BATCH_WEEKS - 1);
  assert.equal(result.preview.targets.find((target) => target.key === "2026-11-30")?.status, "filled");
  assert.deepEqual(result.data?.weeks["2026-11-30"], normalizeData({ ...data, weeks: { "2026-11-30": existing } }).weeks["2026-11-30"]);
});

test("the second batch copies the eight weeks after the first", () => {
  const result = planWeekCopy(profile(), 2);
  assert.equal(result.preview.eligible, true);
  assert.equal(result.preview.targets[0].key, "2027-01-18");
  assert.equal(result.preview.targets[WEEK_COPY_BATCH_WEEKS - 1].key, "2027-03-08");
});

test("the week on screen is never changed by a copy", () => {
  const data = profile();
  const result = planWeekCopy(data, 1);
  assert.deepEqual(result.data?.weeks[SRC], data.weeks[SRC]);
});

test("a week with nothing in it is refused, and no data is returned", () => {
  // Built directly, not normalised: normalising seeds the open week with each area's default hours.
  const hats = profile().hats;
  const empty: SpreadData = {
    hats,
    weeks: { [SRC]: { boxes: hats.map((hat) => ({ hatId: hat.id, hours: 0, tasks: [] })), allocations: [] } },
    currentWeek: SRC,
  };
  const result = planWeekCopy(empty, 1);
  assert.equal(result.preview.eligible, false);
  assert.match(result.preview.reason ?? "", /no hours or tasks to copy/);
  assert.equal(result.data, null);
});

test("a batch outside one to thirteen is refused", () => {
  for (const batch of [0, 14, 1.5]) {
    const result = planWeekCopy(profile(), batch);
    assert.equal(result.preview.eligible, false, `batch ${batch} is refused`);
    assert.equal(result.data, null);
  }
});

test("a batch where every week is already planned is refused, so nothing is overwritten", () => {
  const base = profile();
  const weeks: Record<string, unknown> = { ...base.weeks };
  for (let index = 1; index <= WEEK_COPY_BATCH_WEEKS; index += 1) {
    const key = new Date(Date.parse(`${SRC}T00:00:00Z`) + index * 7 * 86400000).toISOString().slice(0, 10);
    weeks[key] = { boxes: [{ hatId: "work", hours: 1, tasks: [] }], allocations: [] };
  }
  const result = planWeekCopy(profile({ weeks: weeks as SpreadData["weeks"] }), 1);
  assert.equal(result.preview.eligible, false);
  assert.match(result.preview.reason ?? "", /already has a plan/);
  assert.equal(result.data, null);
});

test("a copy carries no repeating-rule bookkeeping, so the copies are plain weeks", () => {
  const base = profile();
  const source = base.weeks[SRC];
  const data = profile({
    weeks: { [SRC]: { ...source, recurrenceSource: { work: { planId: "rule-1", generatedHours: 12 } } } },
  });
  const result = planWeekCopy(data, 1);
  assert.equal(result.data?.weeks["2026-11-23"].recurrenceSource, undefined);
});

test("a future week holding only a weekly total is kept, so the total the person set is not dropped", () => {
  const base = profile();
  const target = shiftKey(SRC, 1);
  const data = profile({
    weeks: {
      ...base.weeks,
      [target]: { boxes: [{ hatId: "work", hours: 0, tasks: [] }, { hatId: "health", hours: 0, tasks: [] }],
        allocations: [], life: { version: 1, capacityHours: 40 } },
    },
  });
  const result = planWeekCopy(data, 1);
  const row = result.preview.targets.find((target) => target.key === shiftKey(SRC, 1));
  assert.equal(row?.status, "filled");
  assert.equal(result.preview.fillCount, WEEK_COPY_BATCH_WEEKS - 1);
  assert.equal(result.data?.weeks[target].life?.capacityHours, 40);
  assert.equal(result.data?.weeks[target].boxes.find((box) => box.hatId === "work")?.hours, 0);
});

test("the source week with only a weekly total has nothing to copy", () => {
  const base = profile();
  const data = profile({
    weeks: { [SRC]: { boxes: [{ hatId: "work", hours: 0, tasks: [] }, { hatId: "health", hours: 0, tasks: [] }],
      allocations: [], life: { version: 1, capacityHours: 30 } } },
  });
  const result = planWeekCopy(data, 1);
  assert.equal(result.preview.eligible, false);
  assert.match(result.preview.reason ?? "", /no hours or tasks/);
  assert.equal(base.currentWeek, SRC);
});

function shiftKey(key: string, weeks: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + weeks * 7 * 86400000).toISOString().slice(0, 10);
}
