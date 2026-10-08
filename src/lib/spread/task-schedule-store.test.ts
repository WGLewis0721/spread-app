// Putting a task on a day goes through the store and survives a reload.
import assert from "node:assert/strict";
import test from "node:test";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, STORE_KEY, type SpreadData } from "./model.ts";
import { PROFILES_KEY, profileStore, type Profile } from "./profiles.ts";

const storage = installBrowser();
const { useSpread } = await import("@/lib/spread/store");

const local: Profile = { id: "local", name: "Local", store: profileStore("local"), theme: "light", accent: null };

function seed() {
  const data: SpreadData = defaultData();
  const week = data.weeks[data.currentWeek];
  week.boxes[0].hours = 10;
  week.boxes[0].tasks.push({ id: "t1", text: "Plan", done: false }, { id: "t2", text: "Ship", done: false });
  week.allocations = [
    { id: "a1", hatId: week.boxes[0].hatId, day: "2026-09-27", hours: 2, order: 0 },
    { id: "a2", hatId: week.boxes[0].hatId, day: "2026-09-28", hours: 1, order: 0 },
  ];
  storage.map.clear();
  storage.failWhen = null;
  storage.map.set(STORE_KEY, JSON.stringify(data));
  storage.map.set(PROFILES_KEY, JSON.stringify([local]));
  useSpread.setState({ profiles: [local], activeId: local.id, data });
  return { hatId: week.boxes[0].hatId };
}

const tasksOf = () => {
  const d = useSpread.getState().data;
  return d.weeks[d.currentWeek].boxes[0].tasks;
};

test("a task put on a day is saved, and taking it off removes the link", () => {
  const { hatId } = seed();
  const result = useSpread.getState().assignTask(hatId, "t1", "a1");
  assert.deepEqual(result, { ok: true, changed: true });
  const saved = JSON.parse(storage.map.get(STORE_KEY) as string) as SpreadData;
  assert.equal(saved.weeks[saved.currentWeek].boxes[0].tasks[0].allocationId, "a1");
  assert.equal(tasksOf()[1].allocationId, undefined, "other tasks are untouched");
  assert.deepEqual(useSpread.getState().assignTask(hatId, "t1", "a1"), { ok: true, changed: false });
  useSpread.getState().assignTask(hatId, "t1", null);
  assert.equal(tasksOf()[0].allocationId, undefined);
});

test("a refused assignment writes nothing", () => {
  const { hatId } = seed();
  const before = storage.map.get(STORE_KEY);
  assert.deepEqual(useSpread.getState().assignTask(hatId, "t1", "missing"), { ok: false, reason: "no-allocation" });
  assert.deepEqual(useSpread.getState().assignTask(hatId, "nope", "a1"), { ok: false, reason: "no-task" });
  assert.equal(storage.map.get(STORE_KEY), before);
});

test("folding two allocations together keeps the tasks on the day", () => {
  const { hatId } = seed();
  useSpread.getState().assignTask(hatId, "t1", "a2");
  useSpread.getState().moveAllocation("a2", "2026-09-27");
  const d = useSpread.getState().data;
  const week = d.weeks[d.currentWeek];
  assert.equal(week.allocations.length, 1);
  assert.equal(tasksOf()[0].allocationId, "a1", "the task follows the surviving allocation");
  assert.ok(week.allocations.some((a) => a.id === tasksOf()[0].allocationId));
});

test("removing an allocation sends its tasks back to To place", () => {
  const { hatId } = seed();
  useSpread.getState().assignTask(hatId, "t1", "a1");
  useSpread.getState().removeAllocation("a1");
  assert.equal(tasksOf()[0].allocationId, undefined);
});
