import assert from "node:assert/strict";
import test from "node:test";
import { assemble, boxItem, flatten, taskItem, weekItem } from "./sync-model.ts";
import { defaultData, normalizeData, type SpreadData } from "./model.ts";
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
