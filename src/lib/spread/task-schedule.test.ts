import assert from "node:assert/strict";
import test from "node:test";
import type { SpreadData } from "./model.ts";
import {
  allocationOfTask,
  assignFailureText,
  assignTaskTo,
  eligibleAllocations,
  isScheduled,
  repointTasks,
  tasksOnAllocation,
  unscheduledTasks,
} from "./task-schedule.ts";

const WEEK = "2026-09-28";

function sample(): SpreadData {
  return {
    hats: [
      { id: "work", name: "Work", defaultHours: 8, color: "#34C759" },
      { id: "home", name: "Home", defaultHours: 4, color: "#FF9500" },
    ],
    currentWeek: WEEK,
    weeks: {
      [WEEK]: {
        allocations: [
          { id: "aw-mon", hatId: "work", day: "2026-09-28", hours: 3, order: 0 },
          { id: "aw-tue", hatId: "work", day: "2026-09-29", hours: 2, order: 0 },
          { id: "ah-mon", hatId: "home", day: "2026-09-28", hours: 1, order: 1 },
          { id: "aw-zero", hatId: "work", day: "2026-09-30", hours: 0, order: 0 },
        ],
        boxes: [
          {
            hatId: "work",
            hours: 8,
            tasks: [
              { id: "t1", text: "Write report", done: false },
              { id: "t2", text: "Send invoice", done: false, allocationId: "aw-mon", content: { blocks: [{ id: "b1", type: "notes", text: "net 30" }] } },
              { id: "t3", text: "Old thing", done: true },
              { id: "t4", text: "Dangling", done: false, allocationId: "gone" },
            ],
          },
          { hatId: "home", hours: 4, tasks: [{ id: "h1", text: "Laundry", done: false }] },
        ],
      },
    },
  };
}

const week = (data: SpreadData) => data.weeks[WEEK];

test("a task is on a day only when its link names a real allocation", () => {
  const data = sample();
  const tasks = week(data).boxes[0].tasks;
  assert.equal(allocationOfTask(week(data), tasks[1])?.id, "aw-mon");
  assert.equal(isScheduled(week(data), tasks[0]), false);
  // a link that points at nothing reads as "not on a day" and nothing is rewritten
  assert.equal(isScheduled(week(data), tasks[3]), false);
  assert.equal(allocationOfTask(undefined, tasks[1]), null);
});

test("the To place list holds open tasks on no day, and follows one role when asked", () => {
  const data = sample();
  assert.deepEqual(unscheduledTasks(week(data)).map((item) => item.task.id), ["t1", "t4", "h1"]);
  assert.deepEqual(unscheduledTasks(week(data), "home").map((item) => item.task.id), ["h1"]);
  assert.deepEqual(unscheduledTasks(undefined), []);
});

test("tasks on an allocation come only from that allocation's own role", () => {
  const data = sample();
  assert.deepEqual(tasksOnAllocation(week(data), "aw-mon").map((task) => task.id), ["t2"]);
  assert.deepEqual(tasksOnAllocation(week(data), "ah-mon"), []);
  assert.deepEqual(tasksOnAllocation(week(data), "nope"), []);
});

test("a task can only be offered days where its role has hours", () => {
  const data = sample();
  assert.deepEqual(eligibleAllocations(week(data), "work").map((item) => item.id), ["aw-mon", "aw-tue"]);
  assert.deepEqual(eligibleAllocations(week(data), "home").map((item) => item.id), ["ah-mon"]);
  assert.deepEqual(eligibleAllocations(week(data), "nobody"), []);
});

test("placing a task changes only that task's link and keeps everything else", () => {
  const data = sample();
  const result = assignTaskTo(data, "work", "t1", "aw-tue");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.changed, true);
  const after = week(result.data).boxes[0].tasks;
  assert.equal(after[0].allocationId, "aw-tue");
  assert.deepEqual({ ...after[0], allocationId: undefined }, { ...week(data).boxes[0].tasks[0], allocationId: undefined });
  assert.deepEqual(after.slice(1), week(data).boxes[0].tasks.slice(1));
  assert.deepEqual(week(result.data).allocations, week(data).allocations);
  assert.deepEqual(week(result.data).boxes[1], week(data).boxes[1]);
  // the input was not mutated
  assert.equal(week(data).boxes[0].tasks[0].allocationId, undefined);
});

test("moving a task to another day keeps its id, text and content", () => {
  const data = sample();
  const result = assignTaskTo(data, "work", "t2", "aw-tue");
  assert.equal(result.ok && result.changed, true);
  if (!result.ok) return;
  const moved = week(result.data).boxes[0].tasks[1];
  assert.equal(moved.id, "t2");
  assert.equal(moved.text, "Send invoice");
  assert.deepEqual(moved.content, week(data).boxes[0].tasks[1].content);
  assert.equal(moved.allocationId, "aw-tue");
});

test("placing a task where it already is changes nothing and returns the same data", () => {
  const data = sample();
  const result = assignTaskTo(data, "work", "t2", "aw-mon");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.changed, false);
  assert.equal(result.data, data);
});

test("a task is refused a day of another role, a missing day, an empty day or a finished task", () => {
  const data = sample();
  assert.deepEqual(assignTaskTo(data, "work", "t1", "ah-mon"), { ok: false, reason: "wrong-role" });
  assert.deepEqual(assignTaskTo(data, "work", "t1", "missing"), { ok: false, reason: "no-allocation" });
  assert.deepEqual(assignTaskTo(data, "work", "t1", "aw-zero"), { ok: false, reason: "no-hours" });
  assert.deepEqual(assignTaskTo(data, "work", "t3", "aw-mon"), { ok: false, reason: "task-done" });
  assert.deepEqual(assignTaskTo(data, "work", "nope", "aw-mon"), { ok: false, reason: "no-task" });
  assert.deepEqual(assignTaskTo(data, "nobody", "t1", "aw-mon"), { ok: false, reason: "no-task" });
  // a task of one role cannot be reached through another role's box
  assert.deepEqual(assignTaskTo(data, "home", "t1", "ah-mon"), { ok: false, reason: "no-task" });
});

test("taking a task off its day keeps it in its role and can clear a stale link", () => {
  const data = sample();
  const off = assignTaskTo(data, "work", "t2", null);
  assert.equal(off.ok && off.changed, true);
  if (!off.ok) return;
  const task = week(off.data).boxes[0].tasks[1];
  assert.equal("allocationId" in task, false);
  assert.equal(task.text, "Send invoice");
  assert.deepEqual(unscheduledTasks(week(off.data)).map((item) => item.task.id), ["t1", "t2", "t4", "h1"]);

  const stale = assignTaskTo(data, "work", "t4", null);
  assert.equal(stale.ok && stale.changed, true);
  const already = assignTaskTo(data, "work", "t1", null);
  assert.equal(already.ok && already.changed, false);
  // a finished task may always be taken off a day
  const doneOnDay = sample();
  week(doneOnDay).boxes[0].tasks[2].allocationId = "aw-mon";
  const undone = assignTaskTo(doneOnDay, "work", "t3", null);
  assert.equal(undone.ok && undone.changed, true);
});

test("when an allocation is folded into another, its tasks follow it", () => {
  const data = sample();
  const merged = repointTasks(week(data), "aw-mon", "aw-tue");
  assert.equal(merged.boxes[0].tasks[1].allocationId, "aw-tue");
  assert.equal(merged.boxes[0].tasks[0].allocationId, undefined);
  // nothing to move: the same week object comes back
  assert.equal(repointTasks(week(data), "ah-mon", "aw-tue"), week(data));
  assert.equal(repointTasks(week(data), "aw-mon", "aw-mon"), week(data));
});

test("failure wording names the role and day when it can", () => {
  assert.equal(assignFailureText("no-allocation", "Health", "Thursday"), "Health isn’t on Thursday yet. Add it first.");
  assert.equal(assignFailureText("wrong-role"), "A task goes on a day for its own role.");
});
