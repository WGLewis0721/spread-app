// Bridge-level checks for the Week/Month redesign actions (PR #136): every native
// intent must reach the one store, persist, and survive a reload of the saved data.
import assert from "node:assert/strict";
import test from "node:test";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, normalizeData, shiftWeek, STORE_KEY, type SpreadData } from "./model.ts";
import { noteSaved } from "./local-status.ts";
const storage = installBrowser();
const { useSpread } = await import("./store.ts");
const { createNativeV2Dispatcher } = await import("./native-v2-dispatch.ts");

const rich = { blocks: [
  { id: "n", type: "notes", text: "Keep this note" },
  { id: "o", type: "outline", items: [{ id: "o1", text: "Step", level: 0, done: true }] },
] };

function setup() {
  storage.map.clear();
  storage.failWhen = null;
  noteSaved();
  const data = defaultData();
  const roleId = data.hats[0].id;
  const otherRole = data.hats[1].id;
  const week = data.weeks[data.currentWeek];
  week.boxes[0].hours = 8;
  week.boxes[0].tasks = [
    { id: "a", text: "Alpha", done: false, allocationId: "alloc", content: rich as never },
    { id: "b", text: "Beta", done: true, allocationId: "alloc" },
    { id: "c", text: "Gamma", done: false, allocationId: "alloc" },
  ];
  week.allocations = [{ id: "alloc", hatId: roleId, day: data.currentWeek, hours: 2, order: 0 }];
  storage.map.set(STORE_KEY, JSON.stringify(data));
  useSpread.setState({ ready: true, activeId: "p1", data });
  const router = createNativeV2Dispatcher("session");
  let count = 0;
  const request = (action: unknown) => {
    const view = router.read()!;
    return { protocolVersion: 1, sessionId: "session", requestId: `r${++count}`,
      expectedProfileId: view.envelope.profileId, expectedWeek: view.envelope.snapshot.weekKey,
      expectedRevision: view.revision, action };
  };
  const saved = (): SpreadData => normalizeData(JSON.parse(storage.map.get(STORE_KEY)!));
  return { router, request, roleId, otherRole, saved, week: data.currentWeek };
}

test("delete is recoverable: Recently Deleted lists it, restore returns it to To Place with content and status, and both persist", async () => {
  const { router, request, roleId, saved, week } = setup();
  try {
    assert.equal((await router.dispatch(request({ type: "deleteTask", roleId, taskId: "a" }))).ok, true);
    assert.ok(!saved().weeks[week].boxes[0].tasks.some((t) => t.id === "a"));
    assert.equal(saved().deletedTasks?.[0]?.id, "a", "the deletion itself is saved, not only held in memory");

    const listed = await router.dispatch(request({ type: "readDeletedTasks" }));
    assert.deepEqual(listed.deletedTasks?.map((d) => d.id), ["a"]);

    // Delete a completed task too: restore must keep done = true.
    assert.equal((await router.dispatch(request({ type: "deleteTask", roleId, taskId: "b" }))).ok, true);
    assert.equal((await router.dispatch(request({ type: "restoreDeletedTask", taskId: "a" }))).ok, true);
    assert.equal((await router.dispatch(request({ type: "restoreDeletedTask", taskId: "b" }))).ok, true);

    const box = saved().weeks[week].boxes.find((b) => b.hatId === roleId)!;
    const a = box.tasks.find((t) => t.id === "a")!;
    const b = box.tasks.find((t) => t.id === "b")!;
    assert.equal(a.allocationId, undefined, "restored to To Place, not to its old day");
    assert.deepEqual(a.content, normalizeData({ ...saved(), weeks: { [week]: { boxes: [{ hatId: roleId, hours: 8, tasks: [{ id: "x", text: "x", done: false, content: rich }] }], allocations: [] } } }).weeks[week].boxes[0].tasks[0].content);
    assert.equal(b.done, true, "completion status survives delete and restore");
    assert.equal(saved().deletedTasks?.length ?? 0, 0);
    assert.equal(box.tasks.filter((t) => t.id === "a").length, 1, "no duplicate after restore");
  } finally {
    router.dispose();
  }
});

test("restoring twice, or an unknown id, is refused and changes nothing", async () => {
  const { router, request, roleId, saved } = setup();
  try {
    await router.dispatch(request({ type: "deleteTask", roleId, taskId: "a" }));
    assert.equal((await router.dispatch(request({ type: "restoreDeletedTask", taskId: "a" }))).ok, true);
    const before = storage.map.get(STORE_KEY);
    assert.equal((await router.dispatch(request({ type: "restoreDeletedTask", taskId: "a" }))).ok, false);
    assert.equal((await router.dispatch(request({ type: "restoreDeletedTask", taskId: "nope" }))).ok, false);
    assert.equal(storage.map.get(STORE_KEY), before);
    assert.equal(saved().weeks[saved().currentWeek].boxes[0].tasks.filter((t) => t.id === "a").length, 1);
  } finally {
    router.dispose();
  }
});

test("permanent deletion removes only the chosen tombstones and persists", async () => {
  const { router, request, roleId, saved } = setup();
  try {
    await router.dispatch(request({ type: "deleteTask", roleId, taskId: "a" }));
    await router.dispatch(request({ type: "deleteTask", roleId, taskId: "c" }));
    assert.equal((await router.dispatch(request({ type: "permanentlyDeleteTasks", taskIds: ["a"] }))).ok, true);
    assert.deepEqual(saved().deletedTasks?.map((d) => d.id), ["c"]);
    const listed = await router.dispatch(request({ type: "readDeletedTasks" }));
    assert.deepEqual(listed.deletedTasks?.map((d) => d.id), ["c"]);
  } finally {
    router.dispose();
  }
});

test("reorderDayTask persists Week order for that day and never changes the Spread order", async () => {
  const { router, request, roleId, saved, week } = setup();
  try {
    const result = await router.dispatch(request({ type: "reorderDayTask", roleId, day: week, taskId: "c", beforeId: "a" }));
    assert.equal(result.ok, true);
    const data = saved();
    assert.deepEqual(data.weeks[week].boxes[0].tasks.map((t) => t.id), ["a", "b", "c"]);
    const order = data.weeks[week].dayTaskOrder?.[week + "|" + roleId] ?? [];
    assert.ok(order.indexOf("c") < order.indexOf("a"), `day order ${order.join(",")}`);
    assert.deepEqual(router.read()!.envelope.snapshot.dayTaskOrder?.[week + "|" + roleId], order,
      "the native snapshot carries the saved order");
  } finally {
    router.dispose();
  }
});

test("Month quick add on another week's date saves there, keeps the open week, and is placed when that day has hours", async () => {
  const { router, request, roleId, saved, week } = setup();
  try {
    const nextMonday = shiftWeek(week, 1);
    assert.equal((await router.dispatch(request({ type: "addTaskForDay", roleId, day: nextMonday, text: "Later" }))).ok, true);
    const data = saved();
    assert.equal(data.currentWeek, week, "the viewed week does not change");
    const later = data.weeks[nextMonday].boxes.find((b) => b.hatId === roleId)!.tasks.find((t) => t.text === "Later");
    assert.ok(later, "task saved in that week");
    assert.equal(later!.allocationId, undefined, "no hours that day, so it waits in that week's To Place");

    assert.equal((await router.dispatch(request({ type: "addTaskForDay", roleId, day: week, text: "Today" }))).ok, true);
    const today = saved().weeks[week].boxes[0].tasks.find((t) => t.text === "Today");
    assert.equal(today?.allocationId, "alloc", "placed on the day's existing allocation");
  } finally {
    router.dispose();
  }
});

test("overdue bulk move: preview reads only, commit moves only eligible tasks once, and persists", async () => {
  const { router, request, roleId, otherRole, saved, week } = setup();
  try {
    // Seed last week with two overdue tasks for two roles; only roleId has hours on the target day.
    const prev = shiftWeek(week, -1);
    const data = useSpread.getState().data;
    const seeded: SpreadData = { ...data, weeks: { ...data.weeks, [prev]: {
      boxes: [
        { hatId: roleId, hours: 2, tasks: [{ id: "old1", text: "Old one", done: false, allocationId: "p1" }] },
        { hatId: otherRole, hours: 2, tasks: [{ id: "old2", text: "Old two", done: false, allocationId: "p2" }] },
      ],
      allocations: [
        { id: "p1", hatId: roleId, day: prev, hours: 1, order: 0 },
        { id: "p2", hatId: otherRole, day: prev, hours: 1, order: 1 },
      ] } } };
    useSpread.setState({ data: seeded });
    storage.map.set(STORE_KEY, JSON.stringify(seeded));
    // "Today" is Tuesday of the open week: last week's tasks and this Monday's open tasks are overdue,
    // completed task "b" is not.
    const overdue = await router.dispatch(request({ type: "readOverdueTasks", today: addDays(week, 1) }));
    const ids = overdue.overdueTasks?.map((o) => o.task.id).sort();
    assert.deepEqual(ids, ["a", "c", "old1", "old2"]);

    const before = storage.map.get(STORE_KEY);
    const preview = await router.dispatch(request({ type: "previewBulkOverdue", taskIds: ["old1", "old2"], targetDay: week, today: addDays(week, 1) }));
    assert.equal(storage.map.get(STORE_KEY), before, "preview writes nothing");
    const eligible = preview.bulkPreview?.filter((p) => p.targetAllocationId && !p.error).map((p) => p.taskId);
    assert.deepEqual(eligible, ["old1"]);
    assert.ok(preview.bulkPreview?.find((p) => p.taskId === "old2")?.error, "the blocked task says why");

    const moved = await router.dispatch(request({ type: "bulkMoveOverdue", taskIds: ["old1", "old2", "old1"], targetDay: week, today: addDays(week, 1) }));
    assert.equal(moved.ok, true);
    assert.equal(moved.bulkMoved, 1);
    const after = saved();
    const all = Object.values(after.weeks).flatMap((w) => w.boxes.flatMap((b) => b.tasks.map((t) => t.id)));
    assert.equal(all.filter((id) => id === "old1").length, 1, "no duplicate");
    assert.equal(all.filter((id) => id === "old2").length, 1, "no loss");
    const old2 = after.weeks[prev].boxes.find((b) => b.hatId === otherRole)!.tasks[0];
    assert.equal(old2.allocationId, "p2", "the ineligible task keeps its original day");
  } finally {
    router.dispose();
  }
});

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

test("Undo of a delete takes the task back out of Recently Deleted, so a later restore cannot duplicate it", async () => {
  const { router, request, roleId, saved, week } = setup();
  try {
    const deleted = await router.dispatch(request({ type: "deleteTask", roleId, taskId: "a" }));
    assert.ok(deleted.undoId, "delete offers Undo");
    assert.equal((await router.dispatch(request({ type: "undo", editId: deleted.undoId }))).ok, true);
    const all = () => Object.values(saved().weeks).flatMap((w) => w.boxes.flatMap((b) => b.tasks.map((t) => t.id)));
    assert.equal(all().filter((id) => id === "a").length, 1, "undo brought the task back");
    const listed = await router.dispatch(request({ type: "readDeletedTasks" }));
    assert.deepEqual(listed.deletedTasks?.map((d) => d.id) ?? [], [], "the undone delete is no longer listed");
    await router.dispatch(request({ type: "restoreDeletedTask", taskId: "a" }));
    assert.equal(all().filter((id) => id === "a").length, 1, "never two copies of one task");
    void week;
  } finally {
    router.dispose();
  }
});

test("a drag reorder within a day offers Undo, and Undo puts the previous day order back", async () => {
  const { router, request, roleId, saved, week } = setup();
  try {
    const key = week + "|" + roleId;
    const first = await router.dispatch(request({ type: "reorderDayTask", roleId, day: week, taskId: "c", beforeId: "a" }));
    assert.ok(first.undoId, "reorder offers Undo");
    const reordered = saved().weeks[week].dayTaskOrder?.[key];
    assert.equal((await router.dispatch(request({ type: "undo", editId: first.undoId }))).ok, true);
    assert.notDeepEqual(saved().weeks[week].dayTaskOrder?.[key], reordered);
    assert.deepEqual(saved().weeks[week].boxes[0].tasks.map((t) => t.id), ["a", "b", "c"]);
  } finally {
    router.dispose();
  }
});

test("completing and uncompleting a task never changes planned hours or the task's day (decision 52)", async () => {
  const { router, request, roleId, saved, week } = setup();
  try {
    const before = JSON.stringify(saved().weeks[week].allocations);
    const hours = saved().weeks[week].boxes[0].hours;
    assert.equal((await router.dispatch(request({ type: "toggleTask", roleId, taskId: "a" }))).ok, true);
    assert.equal(JSON.stringify(saved().weeks[week].allocations), before);
    assert.equal(saved().weeks[week].boxes[0].hours, hours);
    assert.equal(saved().weeks[week].boxes[0].tasks.find((t) => t.id === "a")?.allocationId, "alloc");
    assert.equal((await router.dispatch(request({ type: "toggleTask", roleId, taskId: "a" }))).ok, true);
    assert.equal(JSON.stringify(saved().weeks[week].allocations), before);
  } finally {
    router.dispose();
  }
});
