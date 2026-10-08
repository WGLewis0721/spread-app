// Astra A11: a task or allocation id belongs to exactly one place, so sync can tell occurrences apart.
import assert from "node:assert/strict";
import test from "node:test";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, normalizeData, type SpreadData } from "./model.ts";
import { assemble, flatten } from "./sync-model.ts";

installBrowser();
const { useSpread } = await import("@/lib/spread/store");

const tasksOf = (d: SpreadData) => Object.values(d.weeks).flatMap((w) => w.boxes.flatMap((b) => b.tasks));
const allocsOf = (d: SpreadData) => Object.values(d.weeks).flatMap((w) => w.allocations);

function nextWeekKey(key: string) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

test("A11: copying last week gives the copies their own ids, and sync keeps both", () => {
  const data = defaultData();
  const oldKey = data.currentWeek;
  data.weeks[oldKey].boxes[0].tasks.push({ id: "weekly", text: "weekly task", done: true, allocationId: "slot" });
  data.weeks[oldKey].allocations.push({ id: "slot", hatId: data.weeks[oldKey].boxes[0].hatId, day: "Monday", hours: 1, order: 0 });
  data.currentWeek = nextWeekKey(oldKey);
  useSpread.setState({ data, profiles: [], activeId: null });
  assert.equal(useSpread.getState().copyLastWeek(), true);
  const copied = useSpread.getState().data;
  const ids = tasksOf(copied).map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, "no task id appears twice");
  const allocIds = allocsOf(copied).map((a) => a.id);
  assert.equal(new Set(allocIds).size, allocIds.length, "no allocation id appears twice");
  const newTask = copied.weeks[copied.currentWeek].boxes[0].tasks[0];
  const newAlloc = copied.weeks[copied.currentWeek].allocations[0];
  assert.equal(newTask.allocationId, newAlloc.id, "the copy points at its own allocation");
  assert.equal(newTask.done, false);
  const rebuilt = assemble(flatten(copied, "Me"), copied.currentWeek).data;
  assert.equal(tasksOf(rebuilt).length, 2, "both occurrences survive a sync round trip");
  assert.equal(allocsOf(rebuilt).length, 2);
});

test("A11: planners that already hold duplicate ids are repaired on load, deterministically", () => {
  const data = defaultData();
  const a = data.currentWeek;
  const b = nextWeekKey(a);
  data.weeks[a].boxes[0].tasks.push({ id: "dup", text: "one", done: false, allocationId: "al" });
  data.weeks[a].allocations.push({ id: "al", hatId: data.weeks[a].boxes[0].hatId, day: "Monday", hours: 1, order: 0 });
  data.weeks[b] = structuredClone(data.weeks[a]);
  const repaired = normalizeData(JSON.parse(JSON.stringify(data)));
  const ids = tasksOf(repaired).map((t) => t.id);
  assert.equal(new Set(ids).size, 2);
  assert.equal(new Set(allocsOf(repaired).map((x) => x.id)).size, 2);
  for (const week of Object.values(repaired.weeks)) {
    const box = week.boxes[0];
    for (const task of box.tasks) assert.ok(week.allocations.some((x) => x.id === task.allocationId), "each task points at an allocation in its own week");
  }
  assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(repaired))), repaired, "repairing twice changes nothing");
  assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))), repaired, "two devices repair to the same ids");
  assert.equal(tasksOf(assemble(flatten(repaired, "Me"), repaired.currentWeek).data).length, 2);
});

test("A11: unique ids are left exactly as they are", () => {
  const data = defaultData();
  data.weeks[data.currentWeek].boxes[0].tasks.push({ id: "only", text: "x", done: false });
  assert.deepEqual(tasksOf(normalizeData(JSON.parse(JSON.stringify(data)))).map((t) => t.id), ["only"]);
});
