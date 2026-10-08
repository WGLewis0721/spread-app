import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, shiftWeek, type SpreadData } from "./model.ts";
import { carryOpenTasks, openTasksOf } from "./task-rollover.ts";

function plan() {
  const d: SpreadData = defaultData();
  const week = d.weeks[d.currentWeek];
  week.boxes[0].tasks.push(
    { id: "t1", text: "open", done: false, allocationId: "a1", content: { blocks: [] } },
    { id: "t2", text: "done", done: true },
    { id: "t3", text: "also open", done: false },
  );
  week.allocations = [{ id: "a1", hatId: week.boxes[0].hatId, day: "2026-09-27", hours: 1, order: 0 }];
  return { d, hat: week.boxes[0].hatId, next: shiftWeek(d.currentWeek, 1) };
}

test("only open tasks are offered", () => {
  const { d } = plan();
  assert.deepEqual(openTasksOf(d).map((o) => o.task.id), ["t1", "t3"]);
});

test("chosen tasks move with their id and notes, off any day, and leave this week", () => {
  const { d, hat, next } = plan();
  const { data, moved } = carryOpenTasks(d, [{ hatId: hat, taskId: "t1" }]);
  assert.equal(moved, 1);
  const here = data.weeks[data.currentWeek].boxes[0].tasks.map((t) => t.id);
  assert.deepEqual(here, ["t2", "t3"]);
  const there = data.weeks[next].boxes.find((b) => b.hatId === hat)!.tasks;
  assert.equal(there[0].id, "t1");
  assert.equal("allocationId" in there[0], false);
  assert.deepEqual(there[0].content, { blocks: [] });
  assert.equal(data.currentWeek, d.currentWeek, "the open week does not change");
});

test("running it twice does not duplicate", () => {
  const { d, hat, next } = plan();
  const once = carryOpenTasks(d, [{ hatId: hat, taskId: "t1" }]).data;
  const twice = carryOpenTasks(once, [{ hatId: hat, taskId: "t1" }]);
  assert.equal(twice.moved, 0);
  assert.equal(twice.data.weeks[next].boxes.find((b) => b.hatId === hat)!.tasks.filter((t) => t.id === "t1").length, 1);
});

test("a task already in next week is only taken off this one", () => {
  const { d, hat, next } = plan();
  d.weeks[next] = { boxes: [{ hatId: hat, hours: 2, tasks: [{ id: "t1", text: "open", done: false }] }], allocations: [] };
  const r = carryOpenTasks(d, [{ hatId: hat, taskId: "t1" }]);
  assert.equal(r.moved, 0);
  assert.equal(r.data.weeks[next].boxes.find((b) => b.hatId === hat)!.tasks.length, 1);
  assert.equal(r.data.weeks[d.currentWeek].boxes[0].tasks.some((t) => t.id === "t1"), false);
});

test("next week's own tasks and days are untouched, done tasks never move, nothing picked is a no-op", () => {
  const { d, hat, next } = plan();
  d.weeks[next] = { boxes: [{ hatId: hat, hours: 5, tasks: [{ id: "mine", text: "mine", done: false }] }], allocations: [{ id: "n1", hatId: hat, day: "2026-10-05", hours: 2, order: 0 }] };
  const r = carryOpenTasks(d, [{ hatId: hat, taskId: "t2" }, { hatId: hat, taskId: "t3" }]);
  const box = r.data.weeks[next].boxes.find((b) => b.hatId === hat)!;
  assert.deepEqual(box.tasks.map((t) => t.id), ["mine", "t3"]);
  assert.equal(box.hours, 5);
  assert.equal(r.data.weeks[next].allocations.length, 1);
  assert.equal(r.data.weeks[d.currentWeek].boxes[0].tasks.some((t) => t.id === "t2"), true);
  const none = carryOpenTasks(d, []);
  assert.equal(none.data, d);
});

test("the input plan is not mutated", () => {
  const { d, hat } = plan();
  const before = JSON.stringify(d);
  carryOpenTasks(d, [{ hatId: hat, taskId: "t1" }]);
  assert.equal(JSON.stringify(d), before);
});
