import assert from "node:assert/strict";
import test from "node:test";
import { assemble, boxItem, flatten, taskItem, weekItem } from "./sync-model.ts";
import { defaultData, normalizeData, planDayIso, shiftWeek, type SpreadData } from "./model.ts";
import { canonical } from "./merge.ts";

function sample(): SpreadData {
  const data = defaultData();
  const week = data.currentWeek;
  const w = data.weeks[week];
  w.boxes[0].tasks.push(
    { id: "t1", text: "Ship", done: false },
    { id: "t2", text: "Review", done: true, allocationId: "a1", content: { blocks: [{ id: "b1", type: "notes", text: "hello" }, { id: "b2", type: "photo", src: "data:image/jpeg;base64,AAAA" }] } },
  );
  w.boxes[1].tasks.push({ id: "t3", text: "Laundry", done: false });
  w.allocations.push({ id: "a1", hatId: w.boxes[0].hatId, day: week, hours: 2, order: 0 });
  data.weeks["2026-09-28"] = { boxes: [{ hatId: "work", hours: 5, tasks: [{ id: "old", text: "Old", done: true }] }], allocations: [] };
  return normalizeData(data);
}

test("flatten then assemble returns the same planner, including order, content and photos", () => {
  const data = sample();
  const back = assemble(flatten(data, "Me"), data.currentWeek);
  assert.equal(canonical(back.data as never), canonical(normalizeData(data) as never));
  assert.equal(back.name, "Me");
});

test("every item has a stable id and the ids are unique", () => {
  const items = flatten(sample(), "Me");
  const ids = items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(taskItem("t2")) && ids.includes(weekItem("2026-09-28")) && ids.includes(boxItem("2026-09-28", "work")));
});

test("a task whose box item is missing is kept, not dropped", () => {
  const data = sample();
  const items = flatten(data, "Me").filter((i) => i.id !== boxItem(data.currentWeek, "work"));
  const back = assemble(items, data.currentWeek);
  const all = Object.values(back.data.weeks).flatMap((w) => w.boxes.flatMap((b) => b.tasks.map((t) => t.id)));
  assert.ok(all.includes("t1") && all.includes("t2"));
});

test("a task whose spread was deleted lands in a recovered spread instead of vanishing", () => {
  const data = sample();
  const items = flatten(data, "Me").filter((i) => i.id !== "hat:work");
  const back = assemble(items, data.currentWeek);
  assert.ok(back.data.hats.some((h) => h.id === "work"));
  const all = Object.values(back.data.weeks).flatMap((w) => w.boxes.flatMap((b) => b.tasks.map((t) => t.id)));
  assert.ok(all.includes("t1"));
});

test("a task missing from its box list is still shown, once", () => {
  const data = sample();
  const items = flatten(data, "Me").map((i) => (i.id === boxItem(data.currentWeek, "work") ? { ...i, fields: { ...i.fields, "tasks$ids": [] } } : i));
  const back = assemble(items, data.currentWeek);
  const ids = Object.values(back.data.weeks).flatMap((w) => w.boxes.flatMap((b) => b.tasks.map((t) => t.id)));
  assert.equal(ids.filter((id) => id === "t1").length, 1);
});

test("assembling from nothing gives an empty but valid planner", () => {
  const back = assemble([], "2026-10-05");
  assert.ok(Array.isArray(back.data.hats));
  assert.equal(back.name, null);
});


test("recoverable tasks and independent day order survive sync item roundtrip", () => {
  const data = sample();
  const key = data.currentWeek;
  data.deletedTasks = [{
    id: "deleted-example", weekKey: key, hatId: data.hats[0].id,
    deletedAt: Date.parse("2026-11-04T10:00:00Z"),
    task: { id: "deleted-example", text: "Find receipts", done: false,
      content: { blocks: [{ id: "note", type: "notes", text: "Receipts by drawer" }] } },
  }];
  data.weeks[key].dayTaskOrder = { [key + "|" + data.hats[0].id]: ["t2", "t1"] };
  const out = flatten(data, "Me");
  assert.ok(out.some((row) => row.id === "deleted-task:deleted-example"));
  assert.ok(out.some((row) => row.id.startsWith("day-order:")));
  const back = assemble(out, key);
  assert.deepEqual(back.data.deletedTasks, data.deletedTasks);
  assert.deepEqual(back.data.weeks[key].dayTaskOrder, data.weeks[key].dayTaskOrder);
  assert.equal(back.data.weeks[key].boxes[0].tasks[0].id, "t1",
    "canonical Spread task sequence remains independent of day order");
});

test("normalizing a week preserves daily task order while restoring missing responsibilities", () => {
  const data = sample();
  const key = data.currentWeek;
  const orderKey = key + "|" + data.hats[0].id;
  const taskOrder = { [orderKey]: ["t2", "t1"] };
  data.weeks[key].dayTaskOrder = taskOrder;
  const missingRole = data.hats.at(-1)!.id;
  data.weeks[key].boxes = data.weeks[key].boxes.filter((box) => box.hatId !== missingRole);

  const normalized = normalizeData(data);
  assert.deepEqual(normalized.weeks[key].dayTaskOrder, taskOrder);
  assert.ok(normalized.weeks[key].boxes.some((box) => box.hatId === missingRole));
});

test("recurring schedules and generated-week provenance survive item sync roundtrip", () => {
  const data = sample();
  const first = shiftWeek(data.currentWeek, 1);
  const id = data.hats[0].id;
  data.recurringPlans = [{ id: "a", roleId: id, startWeek: first,
    everyWeeks: 2, hours: 2, capacityHours: 40 }];
  data.weeks[first] = {
    boxes: data.hats.map((hat) => ({ hatId: hat.id, hours: hat.id === id ? 2 : 0, tasks: [] })),
    allocations: [], life: { version: 1, capacityHours: 40 },
    recurrenceSource: { [id]: { planId: "a", generatedHours: 2, manual: true } },
  };
  const actual = assemble(flatten(data, "My plan"), data.currentWeek).data;
  assert.deepEqual(actual.recurringPlans, data.recurringPlans);
  assert.deepEqual(actual.weeks[first].recurrenceSource, data.weeks[first].recurrenceSource);
  assert.equal(actual.weeks[first].boxes.find((b) => b.hatId === id)?.hours, 2);
});
test("set days and their generated placements survive item sync roundtrip", () => {
  const data = sample();
  const first = shiftWeek(data.currentWeek, 1);
  const id = data.hats[0].id;
  const monday = planDayIso(first, "mon"), wednesday = planDayIso(first, "wed");
  data.recurringPlans = [{ id: "gym", roleId: id, startWeek: first, everyWeeks: 1, hours: 2, capacityHours: 40,
    dayHours: [{ weekday: "mon", hours: 1 }, { weekday: "wed", hours: 1 }] }];
  data.weeks[first] = {
    boxes: data.hats.map((hat) => ({ hatId: hat.id, hours: hat.id === id ? 2 : 0, tasks: [] })),
    allocations: [
      { id: "a1", hatId: id, day: monday, hours: 1, order: 0 },
      { id: "a2", hatId: id, day: wednesday, hours: 1, order: 0 },
    ],
    life: { version: 1, capacityHours: 40 },
    recurrenceSource: { [id]: { planId: "gym", generatedHours: 2, generatedDays: [
      { id: "a1", day: monday, hours: 1 }, { id: "a2", day: wednesday, hours: 1 },
    ] } },
  };
  const actual = assemble(flatten(data, "My plan"), data.currentWeek).data;
  assert.deepEqual(actual.recurringPlans, data.recurringPlans);
  assert.deepEqual(actual.weeks[first].recurrenceSource, data.weeks[first].recurrenceSource);
  assert.deepEqual(actual.weeks[first].allocations.map((a) => [a.id, a.day, a.hours]),
    [["a1", monday, 1], ["a2", wednesday, 1]]);
});
