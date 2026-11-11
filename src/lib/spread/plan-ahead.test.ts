import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, normalizeData, shiftWeek, type SpreadData } from "./model.ts";
import { planAheadTransfer } from "./plan-ahead.ts";

function seed() {
  const data = defaultData();
  const key = data.currentWeek;
  const roleId = data.hats[0].id;
  const week = data.weeks[key];
  week.life = { version: 1, capacityHours: 40 };
  week.boxes[0].hours = 8;
  week.allocations = [{ id: "a1", hatId: roleId, day: key, hours: 3, order: 0 }];
  week.boxes[0].tasks = [
    { id: "attached", text: "Follow the schedule", done: false, allocationId: "a1",
      important: true, content: { blocks: [{ id: "note", type: "notes", text: "Keep this" }] } },
    { id: "unplaced", text: "Keep at source", done: false },
  ];
  return { data, key, roleId, toDay: shiftWeek(key, 8) };
}

test("weekly Plan Ahead transfers budget to a far-future week without changing open week", () => {
  const { data, key, roleId, toDay } = seed();
  const before = structuredClone(data);
  const { preview, data: next } = planAheadTransfer(data, {
    roleId, toDay, hours: 2, targetCapacityHours: 40,
  });
  assert.equal(preview.eligible, true);
  assert.equal(preview.kind, "weekly");
  assert.equal(preview.sourceBudgetAfter, 6);
  assert.equal(preview.targetBudgetBefore, 8);
  assert.equal(preview.targetBudgetAfter, 10);
  assert.equal(next.currentWeek, key);
  assert.equal(next.weeks[key].allocations[0].hours, 3);
  assert.deepEqual(next.weeks[key].boxes[0].tasks, data.weeks[key].boxes[0].tasks);
  assert.equal(next.weeks[toDay].life?.capacityHours, 40);
  assert.deepEqual(data, before, "Preview must be pure and not touch the real plan");
});

test("moving all daily hours moves attached task and rich content into the destination week", () => {
  const { data, key, roleId, toDay } = seed();
  const { preview, data: next } = planAheadTransfer(data, {
    roleId, fromDay: key, toDay, hours: 3, targetCapacityHours: 40,
  });
  assert.equal(preview.eligible, true);
  assert.equal(preview.kind, "daily");
  assert.equal(preview.movedTasks, 1);
  assert.equal(next.weeks[key].allocations.length, 0);
  assert.equal(next.weeks[key].boxes[0].hours, 5);
  assert.deepEqual(next.weeks[key].boxes[0].tasks.map((t) => t.id), ["unplaced"]);
  const dest = next.weeks[toDay];
  assert.equal(dest.allocations[0].hours, 3);
  const moved = dest.boxes[0].tasks.find((task) => task.id === "attached");
  assert.equal(moved?.allocationId, dest.allocations[0].id);
  assert.equal(moved?.important, true);
  assert.equal(moved?.content?.blocks[0].type, "notes");
  assert.equal(dest.boxes[0].hours, 11);
  assert.deepEqual(data.weeks[key].boxes[0].tasks.map((t) => t.id), ["attached", "unplaced"]);
});

test("partial daily transfer keeps attached tasks with the remaining source allocation", () => {
  const { data, key, roleId, toDay } = seed();
  const { preview, data: next } = planAheadTransfer(data, {
    roleId, fromDay: key, toDay, hours: 1, targetCapacityHours: 40,
  });
  assert.equal(preview.eligible, true);
  assert.equal(preview.movedTasks, 0);
  assert.equal(next.weeks[key].allocations[0].hours, 2);
  assert.equal(next.weeks[key].boxes[0].tasks[0].allocationId, "a1");
  assert.equal(next.weeks[toDay].allocations[0].hours, 1);
});

test("ineligible transfers leave all weeks identical to input", () => {
  const { data, key, roleId, toDay } = seed();
  const inputs = [
    { roleId, toDay: key, hours: 1, targetCapacityHours: 40 }, // no same-week rollover
    { roleId, toDay, hours: 0.25, targetCapacityHours: 40 },
    { roleId, toDay, hours: 6, targetCapacityHours: 40 }, // 3h reserved
    { roleId, toDay, hours: 2 }, // destination capacity not defined
    { roleId, toDay, hours: 2, targetCapacityHours: 15 }, // no free capacity
    { roleId, toDay, hours: 4, fromDay: key, targetCapacityHours: 40 }, // only 3h on day
  ];
  for (const input of inputs) {
    const before = structuredClone(data);
    const result = planAheadTransfer(data, input);
    assert.equal(result.preview.eligible, false, JSON.stringify(input));
    assert.strictEqual(result.data, data);
    assert.deepEqual(data, before);
  }
});

test("existing destination commitments are never replaced by Plan Ahead", () => {
  const { data, roleId, toDay } = seed();
  data.weeks[toDay] = {
    boxes: data.hats.map((hat) => ({ hatId: hat.id, hours: hat.defaultHours, tasks: [] })),
    allocations: [{ id: "dst", hatId: roleId, day: toDay, hours: 2, order: 0 }],
    life: { version: 1, capacityHours: 40 },
  };
  const { preview, data: next } = planAheadTransfer(data, { roleId, toDay, hours: 1 });
  assert.equal(preview.eligible, true);
  assert.equal(next.weeks[toDay].allocations[0].id, "dst");
  assert.equal(next.weeks[toDay].allocations[0].hours, 2);
  assert.equal(next.weeks[toDay].boxes[0].hours, 9);
});

test("importance survives the current normalization and is optional in old task records", () => {
  const { data, key } = seed();
  const normalized: SpreadData = normalizeData(data);
  assert.equal(normalized.weeks[key].boxes[0].tasks[0].important, true);
  assert.equal(normalized.weeks[key].boxes[0].tasks[1].important, undefined);
});
