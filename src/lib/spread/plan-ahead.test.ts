import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, normalizeData, shiftWeek, type SpreadData } from "./model.ts";
import { planAheadTransfer } from "./plan-ahead.ts";
import { applyRecurringPlan } from "./recurring-plan.ts";
import { planWeekCopy } from "./week-copy.ts";

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

test("the preview shows the hours and Life total a recurring plan gives a future week that has not been opened yet", () => {
  // Future weeks are created when first opened. Until then the destination is what its recurring plans say it
  // will be, so the preview must show those hours, not the role's default, or the person confirms a wrong total.
  const { data, key, roleId, toDay } = seed();
  const planned = applyRecurringPlan(data, { roleId, startWeek: shiftWeek(key, 1), everyWeeks: 1, hours: 2, capacityHours: 40 });
  assert.equal(planned.preview.eligible, true, planned.preview.reason);
  const result = planAheadTransfer(planned.data, { roleId, toDay, hours: 1 });
  assert.equal(result.preview.eligible, true, result.preview.reason);
  assert.equal(result.preview.targetBudgetBefore, 2, "the plan's 2 hours, not the default of 8");
  assert.equal(result.preview.targetBudgetAfter, 3);
  assert.equal(result.preview.targetCapacityHours, 40, "the plan's weekly total is known before the transfer");
  assert.equal(result.data.weeks[toDay].boxes.find((box) => box.hatId === roleId)?.hours, result.preview.targetBudgetAfter);
});

test("a transfer out of a week with no Life total survives reload and a week copy", () => {
  // A week planned before Life totals existed has no capacity. Moving its unplaced hours leaves the budget equal to
  // the hours already placed on days, which normalization reads as a legacy bank and restores to the role default.
  const { data, key, roleId, toDay } = seed();
  delete data.weeks[key].life;
  const moved = planAheadTransfer(data, { roleId, toDay, hours: 5, targetCapacityHours: 40 });
  assert.equal(moved.preview.eligible, true, moved.preview.reason);
  assert.equal(moved.data.weeks[key].boxes[0].hours, 3, "in the open session the budget is 8 - 5");
  const reloaded = normalizeData(JSON.parse(JSON.stringify(moved.data)));
  assert.equal(reloaded.weeks[key].boxes[0].hours, 3, "after reload the budget is still 3, not the default");
  const copied = planWeekCopy(moved.data, 1);
  assert.equal(copied.preview.eligible, true, copied.preview.reason);
  assert.equal(copied.data?.weeks[key].boxes[0].hours, 3, "copying the week does not revert the transfer");
});

test("importance survives the current normalization and is optional in old task records", () => {
  const { data, key } = seed();
  const normalized: SpreadData = normalizeData(data);
  assert.equal(normalized.weeks[key].boxes[0].tasks[0].important, true);
  assert.equal(normalized.weeks[key].boxes[0].tasks[1].important, undefined);
});

test("Plan Ahead never changes a weekly total the destination week already has", () => {
  // The entered total is for a week that has none. Raising an existing total to make room would grow that
  // week's capacity without the person deciding it there; lowering it is refused for the same reason.
  const { data, roleId, toDay } = seed();
  const first = planAheadTransfer(data, { roleId, toDay, hours: 1, targetCapacityHours: 40 });
  assert.equal(first.preview.eligible, true, first.preview.reason);
  for (const entered of [60, 39.5]) {
    const result = planAheadTransfer(first.data, { roleId, toDay, hours: 1, targetCapacityHours: entered });
    assert.equal(result.preview.eligible, false);
    assert.match(result.preview.reason ?? "", /already has a weekly total/);
    assert.equal(result.data, first.data, "a refused request returns the same data");
    assert.equal(result.data.weeks[toDay].life?.capacityHours, 40);
  }
  // The same total, or none entered, still moves hours inside the existing total.
  for (const entered of [40, undefined]) {
    const result = planAheadTransfer(first.data, { roleId, toDay, hours: 1, targetCapacityHours: entered });
    assert.equal(result.preview.eligible, true, result.preview.reason);
    assert.equal(result.data.weeks[toDay].life?.capacityHours, 40);
  }
});
