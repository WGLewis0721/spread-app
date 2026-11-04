import assert from "node:assert/strict";
import test from "node:test";
import { normalizeData, type SpreadData } from "./model.ts";
import {
  DELETED_TASK_RETENTION_MS, activeDeletedTasks, bulkRescheduleOverdue, moveTaskToRecentlyDeleted,
  overdueTasks, permanentlyDeleteRecentlyDeleted, previewBulkOverdue, orderedTasksForDay,
  purgeExpiredDeletedTasks, reorderDayTask, restoreRecentlyDeletedTask,
} from "./week-month-operations.ts";

const now = Date.parse("2026-11-04T12:00:00Z");
const isoToday = "2026-11-04";
function fixture(): SpreadData {
  return {
    currentWeek: "2026-11-02",
    hats: [
      { id: "home", name: "Home", defaultHours: 3, color: "#FF9500" },
      { id: "work", name: "Work", defaultHours: 4, color: "#34C759" },
    ],
    weeks: {
      "2026-10-26": {
        boxes: [
          { hatId: "home", hours: 3, tasks: [
            { id: "old-h", text: "Clean garage", done: false, allocationId: "old-a", content: { blocks: [{ id: "n", type: "notes", text: "Paint first" }] } },
          ] },
          { hatId: "work", hours: 4, tasks: [
            { id: "old-w", text: "Submit review", done: false, allocationId: "old-b" },
          ] },
        ],
        allocations: [
          { id: "old-a", hatId: "home", day: "2026-10-27", hours: 2, order: 0 },
          { id: "old-b", hatId: "work", day: "2026-10-29", hours: 2, order: 1 },
        ],
      },
      "2026-11-02": {
        boxes: [
          { hatId: "home", hours: 3, tasks: [
            { id: "fresh", text: "Kitchen", done: false, allocationId: "a" },
            { id: "second", text: "Laundry", done: true, allocationId: "a" },
          ] },
          { hatId: "work", hours: 4, tasks: [] },
        ],
        allocations: [{ id: "a", hatId: "home", day: "2026-11-05", hours: 2, order: 0 }],
      },
    },
  };
}

test("move task to recently deleted preserves content and schedules, not remove sibling", () => {
  const source = fixture();
  const deleted = moveTaskToRecentlyDeleted(source, "home", "fresh", now);
  assert.equal(deleted.changed, true);
  assert.equal(source.weeks[source.currentWeek].boxes[0].tasks.length, 2, "pure function must not mutate source");
  assert.equal(deleted.data.weeks[source.currentWeek].boxes[0].tasks.length, 1);
  assert.equal(deleted.data.deletedTasks?.[0].task.allocationId, "a");
  const roundtrip = normalizeData(JSON.parse(JSON.stringify(deleted.data)));
  assert.equal(roundtrip.deletedTasks?.[0].task.text, "Kitchen");
});

test("restore into original week To Place with completed status, rich content and identical ID", () => {
  const source = { ...fixture(), currentWeek: "2026-10-26" };
  const deleted = moveTaskToRecentlyDeleted(source, "home", "old-h", now).data;
  const restore = restoreRecentlyDeletedTask({ ...deleted, currentWeek: "2026-11-02" }, "old-h", now + 1000);
  assert.equal(restore.changed, true);
  assert.equal(restore.data.currentWeek, "2026-11-02", "restoration does not navigate");
  assert.equal(restore.data.deletedTasks?.length, 0);
  const task = restore.data.weeks["2026-10-26"].boxes[0].tasks[0];
  assert.equal(task.id, "old-h");
  assert.equal(task.allocationId, undefined);
  assert.equal(task.content?.blocks[0].type, "notes");
  assert.equal(task.content?.blocks[0].type === "notes" ? task.content.blocks[0].text : "", "Paint first");
});

test("expired deleted entries cannot be restored at or after exactly 30 days", () => {
  const deleted = moveTaskToRecentlyDeleted(fixture(), "home", "fresh", now).data;
  assert.equal(activeDeletedTasks(deleted, now + DELETED_TASK_RETENTION_MS - 1).length, 1);
  assert.equal(activeDeletedTasks(deleted, now + DELETED_TASK_RETENTION_MS).length, 0);
  assert.equal(purgeExpiredDeletedTasks(deleted, now + DELETED_TASK_RETENTION_MS).deletedTasks?.length, 0);
  assert.equal(restoreRecentlyDeletedTask(deleted, "fresh", now + DELETED_TASK_RETENTION_MS).changed, false);
});

test("permanent delete is explicit, and restore refuses deleted role", () => {
  const deleted = moveTaskToRecentlyDeleted(fixture(), "home", "fresh", now).data;
  const missingRole = { ...deleted, hats: deleted.hats.filter((hat) => hat.id !== "home") };
  assert.match(restoreRecentlyDeletedTask(missingRole, "fresh", now).reason ?? "", /responsibility/i);
  assert.equal(permanentlyDeleteRecentlyDeleted(deleted, ["fresh"], now).deletedTasks?.length, 0);
});

test("overdue traverses prior weeks, ignores completed or future tasks", () => {
  const source = fixture();
  assert.deepEqual(overdueTasks(source, isoToday).map((t) => t.task.id), ["old-h", "old-w"]);
});

test("bulk preview shows eligible and invalid without mutating, commit moves only eligible", () => {
  const source = fixture();
  const preview = previewBulkOverdue(source, ["old-h", "old-w"], "2026-11-05", isoToday);
  assert.equal(preview[0].targetAllocationId, "a");
  assert.match(preview[1].error ?? "", /No hours/i);
  const move = bulkRescheduleOverdue(source, ["old-h", "old-w"], "2026-11-05", isoToday);
  assert.equal(move.moved, 1);
  assert.equal(move.data.weeks["2026-10-26"].boxes[0].tasks.length, 0);
  assert.equal(move.data.weeks["2026-10-26"].boxes[1].tasks[0].id, "old-w");
  const moved = move.data.weeks["2026-11-02"].boxes[0].tasks.find((t) => t.id === "old-h");
  assert.equal(moved?.allocationId, "a");
  assert.equal(source.weeks["2026-10-26"].boxes[0].tasks.length, 1);
});

test("date-scoped task reordering never changes Spread canonical order", () => {
  const original = fixture();
  const reordered = reorderDayTask(original, "home", "2026-11-05", "second", "fresh");
  assert.equal(reordered.changed, true);
  assert.deepEqual(reordered.data.weeks[original.currentWeek].boxes[0].tasks.map((t) => t.id), ["fresh", "second"]);
  assert.deepEqual(orderedTasksForDay(reordered.data.weeks[original.currentWeek], "home", "2026-11-05").map((t) => t.id), ["second", "fresh"]);
  const roundtrip = normalizeData(JSON.parse(JSON.stringify(reordered.data)));
  assert.deepEqual(roundtrip.weeks[roundtrip.currentWeek].dayTaskOrder?.["2026-11-05|home"], ["second", "fresh"]);
});

test("duplicate bulk picks never move the same task twice", () => {
  const source = fixture();
  const move = bulkRescheduleOverdue(source, ["old-h", "old-h"], "2026-11-05", isoToday);
  assert.equal(move.moved, 1);
  assert.match(move.outcomes[1].error ?? "", /Duplicate/);
  const targets = move.data.weeks["2026-11-02"].boxes[0].tasks.filter((task) => task.id === "old-h");
  assert.equal(targets.length, 1);
});


test("same-week overdue rescheduling changes only allocation, not Spread task order", () => {
  const original = fixture();
  const key = original.currentWeek;
  original.weeks[key].allocations.push({ id: "early", hatId: "home", day: "2026-11-03", hours: 1, order: 1 });
  original.weeks[key].boxes[0].tasks.splice(1, 0,
    { id: "early-task", text: "Call home", done: false, allocationId: "early" });
  const beforeOrder = original.weeks[key].boxes[0].tasks.map((task) => task.id);
  const result = bulkRescheduleOverdue(original, ["early-task"], "2026-11-05", isoToday);
  assert.equal(result.moved, 1);
  assert.deepEqual(result.data.weeks[key].boxes[0].tasks.map((task) => task.id), beforeOrder);
  assert.equal(result.data.weeks[key].boxes[0].tasks[1].allocationId, "a");
});

test("loading a planner keeps the current week's independent day order", () => {
  const raw = {
    hats: [{ id: "work", name: "Work", defaultHours: 4, color: "#000" }, { id: "home", name: "Home", defaultHours: 2, color: "#111" }],
    currentWeek: "2026-11-02",
    // The current week lacks a box for "home", so ensureWeek has to rebuild it.
    weeks: { "2026-11-02": { boxes: [{ hatId: "work", hours: 4, tasks: [{ id: "a", text: "A", done: false }, { id: "b", text: "B", done: false }] }],
      allocations: [], dayTaskOrder: { "2026-11-02|work": ["b", "a"] } } },
  };
  const data = normalizeData(raw);
  assert.deepEqual(data.weeks["2026-11-02"].dayTaskOrder, { "2026-11-02|work": ["b", "a"] });
  assert.equal(data.weeks["2026-11-02"].boxes.length, 2);
});
