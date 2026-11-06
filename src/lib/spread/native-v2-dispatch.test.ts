import assert from "node:assert/strict";
import test from "node:test";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, shiftWeek, STORE_KEY, weekDays } from "./model.ts";
import { noteSaved } from "./local-status.ts";
const storage = installBrowser();
const { useSpread } = await import("./store.ts");
const { createNativeV2Dispatcher } = await import("./native-v2-dispatch.ts");

function setup() {
  storage.map.clear();
  storage.failWhen = null;
  noteSaved();
  const data = defaultData();
  const roleId = data.hats[0].id;
  const week = data.weeks[data.currentWeek];
  week.boxes[0].hours = 8;
  week.boxes[0].tasks = [
    {
      id: "task",
      text: "Original",
      done: false,
      content: { blocks: [{ id: "n", type: "notes", text: "Keep this" }] },
    },
  ];
  week.allocations = [
    { id: "eligible", hatId: roleId, day: data.currentWeek, hours: 2, order: 0 },
    { id: "wrong", hatId: data.hats[1].id, day: data.currentWeek, hours: 1, order: 1 },
  ];
  storage.map.set(STORE_KEY, JSON.stringify(data));
  useSpread.setState({ ready: true, activeId: "p1", data });
  const router = createNativeV2Dispatcher("session");
  let count = 0;
  function request(action: unknown) {
    const view = router.read()!;
    return {
      protocolVersion: 1,
      sessionId: "session",
      requestId: `r${++count}`,
      expectedProfileId: view.envelope.profileId,
      expectedWeek: view.envelope.snapshot.weekKey,
      expectedRevision: view.revision,
      action,
    };
  }
  return { router, request, roleId };
}

for (const value of [-1, -0.5, 0.1, 0.25, 1.1, 168.5, 200, NaN, Infinity, -Infinity]) {
  test(`invalid hours ${value} never write`, async () => {
    const { router, request, roleId } = setup();
    try {
      const before = JSON.stringify(useSpread.getState().data);
      const result = await router.dispatch(request({ type: "setHours", roleId, hours: value }));
      assert.equal(result.error, "invalid-command");
      assert.equal(JSON.stringify(useSpread.getState().data), before);
    } finally {
      router.dispose();
    }
  });
}
for (const [field, value, error] of [
  ["expectedProfileId", "other", "stale-profile"],
  ["expectedWeek", "2026-01-05", "stale-week"],
  ["expectedRevision", 999, "stale-revision"],
  ["sessionId", "old-session", "stale-session"],
  ["protocolVersion", 2, "invalid-command"],
] as const) {
  test(`reject ${field} mismatch`, async () => {
    const { router, request, roleId } = setup();
    try {
      const before = storage.map.get(STORE_KEY);
      const result = await router.dispatch({
        ...request({ type: "toggleTask", roleId, taskId: "task" }),
        [field]: value,
      });
      assert.equal(result.error, error);
      assert.equal(storage.map.get(STORE_KEY), before);
    } finally {
      router.dispose();
    }
  });
}
test("Life capacity and budgets are week-only, guarded, projected and undoable", async () => {
  const { router, request, roleId } = setup();
  try {
    const initial = router.read()!;
    assert.equal(initial.envelope.snapshot.life, undefined);
    assert.equal((await router.dispatch(request({ type: "setLifeBudget", roleId, hours: 3 }))).error, "capacity-not-set");
    const setupCapacity = await router.dispatch(request({ type: "setLifeCapacity", hours: 168 }));
    assert.equal(setupCapacity.ok, true);
    const before = useSpread.getState().data;
    const oldDefault = before.hats.find((hat) => hat.id === roleId)!.defaultHours;
    const changed = await router.dispatch(request({ type: "setLifeBudget", roleId, hours: 5.5 }));
    assert.equal(changed.ok, true);
    assert.equal(router.read()!.envelope.snapshot.roles.find((r) => r.id === roleId)?.hours, 5.5);
    assert.equal(useSpread.getState().data.hats.find((hat) => hat.id === roleId)?.defaultHours, oldDefault);
    assert.equal((await router.dispatch(request({ type: "setLifeBudget", roleId, hours: 1 }))).error, "budget-below-reserved");
    assert.equal((await router.dispatch(request({ type: "setLifeCapacity", hours: 1 }))).error, "capacity-below-assigned");
    assert.equal((await router.dispatch(request({ type: "undo", editId: changed.undoId }))).ok, true);
    assert.equal(router.read()!.envelope.snapshot.roles.find((r) => r.id === roleId)?.hours, 8);
    assert.equal((await router.dispatch(request({ type: "redo", editId: changed.undoId }))).ok, true);
    assert.equal(router.read()!.envelope.snapshot.roles.find((r) => r.id === roleId)?.hours, 5.5);
    assert.equal(useSpread.getState().data.weeks[before.currentWeek].life?.capacityHours, 168);
  } finally { router.dispose(); }
});
test("Life estimate is optional and never reserves hours", async () => {
  const { router, request, roleId } = setup();
  try {
    assert.equal(router.read()!.envelope.snapshot.tasks[0].estimateMinutes, undefined);
    assert.equal((await router.dispatch(request({ type: "setTaskEstimate", roleId, taskId: "task", minutes: 45 }))).ok, true);
    assert.equal(router.read()!.envelope.snapshot.tasks[0].estimateMinutes, 45);
    assert.equal(router.read()!.envelope.snapshot.allocations[0].hours, 2);
    assert.equal((await router.dispatch(request({ type: "setTaskEstimate", roleId, taskId: "task", minutes: 20 }))).error, "invalid-command");
  } finally { router.dispose(); }
});
test("serialized concurrent retries toggle once, conflicting identity is refused", async () => {
  const { router, request, roleId } = setup();
  try {
    const command = request({ type: "toggleTask", roleId, taskId: "task" });
    const replies = await Promise.all(Array.from({ length: 20 }, () => router.dispatch(command)));
    assert.ok(replies.every((r) => r.ok));
    assert.equal(router.read()!.envelope.snapshot.tasks[0].done, true);
    assert.equal(router.read()!.revision, 1);
    assert.equal(
      (
        await router.dispatch({
          ...command,
          action: { type: "addTask", roleId, text: "Duplicate" },
        })
      ).error,
      "request-id-reused",
    );
    assert.equal(
      (await router.dispatch(request({ type: "undo", editId: replies[0].undoId }))).ok,
      true,
    );
    assert.equal(router.read()!.envelope.snapshot.tasks[0].done, false);
  } finally {
    router.dispose();
  }
});
test("queued second intent cannot use an obsolete revision", async () => {
  const { router, request, roleId } = setup();
  try {
    const [first, second] = await Promise.all([
      router.dispatch(request({ type: "setHours", roleId, hours: 4 })),
      router.dispatch(request({ type: "addTask", roleId, text: "Stale" })),
    ]);
    assert.equal(first.ok, true);
    assert.equal(second.error, "stale-revision");
  } finally {
    router.dispose();
  }
});
test("wrong-role allocation is rejected and task content survives edits and carry", async () => {
  const { router, request, roleId } = setup();
  try {
    assert.equal(
      (
        await router.dispatch(
          request({ type: "assignTask", roleId, taskId: "task", allocationId: "wrong" }),
        )
      ).error,
      "ineligible-day",
    );
    assert.equal(
      (await router.dispatch(request({ type: "editTask", roleId, taskId: "task", text: "Edited" })))
        .ok,
      true,
    );
    assert.equal(
      (
        await router.dispatch(
          request({ type: "assignTask", roleId, taskId: "task", allocationId: "eligible" }),
        )
      ).ok,
      true,
    );
    const carried = await router.dispatch(
      request({ type: "carryOver", picks: [{ roleId, taskId: "task" }] }),
    );
    assert.equal(carried.ok, true);
    const tasks = Object.values(useSpread.getState().data.weeks).flatMap((w) =>
      w.boxes.flatMap((b) => b.tasks),
    );
    assert.equal(tasks.filter((t) => t.id === "task").length, 1);
    assert.equal(tasks.find((t) => t.id === "task")!.content!.blocks[0].type, "notes");
    assert.equal(tasks.find((t) => t.id === "task")!.allocationId, undefined);
    assert.equal(
      (await router.dispatch(request({ type: "undo", editId: carried.undoId }))).ok,
      true,
    );
    assert.equal(router.read()!.envelope.snapshot.tasks[0].text, "Edited");
  } finally {
    router.dispose();
  }
});
test("storage failure cannot produce a successful ACK or retry the mutation", async () => {
  const { router, request, roleId } = setup();
  try {
    const saved = storage.map.get(STORE_KEY);
    storage.failWhen = () => true;
    const command = request({ type: "addTask", roleId, text: "Unsaved" });
    assert.equal((await router.dispatch(command)).error, "save-failed");
    storage.failWhen = null;
    assert.equal((await router.dispatch(command)).error, "save-failed");
    assert.equal(storage.map.get(STORE_KEY), saved);
    assert.equal(
      router.read()!.envelope.snapshot.tasks.filter((t) => t.text === "Unsaved").length,
      1,
    );
    assert.equal(
      (await router.dispatch(request({ type: "toggleTask", roleId, taskId: "task" }))).error,
      "save-unavailable",
    );
  } finally {
    router.dispose();
  }
});
test("profile switches invalidate commands and replay never leaks prior profile", async () => {
  const { router, request, roleId } = setup();
  try {
    const command = request({ type: "toggleTask", roleId, taskId: "task" });
    await router.dispatch(command);
    useSpread.setState({ activeId: "p2", data: defaultData() });
    const replay = await router.dispatch(command);
    assert.equal(replay.state!.envelope.profileId, "p2");
    assert.equal(
      (await router.dispatch({ ...command, requestId: "fresh" })).error,
      "stale-profile",
    );
    router.dispose();
    assert.equal((await router.dispatch(command)).error, "closed-session");
  } finally {
    router.dispose();
  }
});

test("100 accepted commands persist exactly once and storage recovery retries the same in-memory plan", async () => {
  const { router, request, roleId } = setup();
  try {
    for (let i = 0; i < 100; i++) {
      const intent = request({ type: "addTask", roleId, text: `Task ${i}` });
      assert.equal((await router.dispatch(intent)).ok, true);
      assert.equal((await router.dispatch(intent)).ok, true);
    }
    assert.equal(router.read()!.envelope.snapshot.tasks.length, 101);
    storage.failWhen = () => true;
    assert.equal(
      (
        await router.dispatch(
          request({ type: "editTask", roleId, taskId: "task", text: "Unsaved edit" }),
        )
      ).error,
      "save-failed",
    );
    storage.failWhen = null;
    assert.equal((await router.dispatch(request({ type: "retrySave" }))).ok, true);
    assert.ok(storage.map.get(STORE_KEY)?.includes("Unsaved edit"));
    assert.equal(router.read()!.envelope.snapshot.tasks.length, 101);
  } finally {
    router.dispose();
  }
});

test("native rich content reads and edits preserve notes, outline, table and photo without snapshot writeback", async () => {
  const { router, request, roleId } = setup();
  try {
    const before = storage.map.get(STORE_KEY);
    const read = await router.dispatch(
      request({ type: "readTaskContent", roleId, taskId: "task" }),
    );
    assert.equal(read.ok, true);
    assert.equal(read.taskDetail!.content.blocks[0].type, "notes");
    assert.equal(storage.map.get(STORE_KEY), before);
    const content = {
      blocks: [
        { id: "n", type: "notes", text: "New note" },
        { id: "o", type: "outline", items: [{ id: "i", text: "Outline", level: 2 }] },
        { id: "b", type: "table", cells: [["A", "B"]] },
        { id: "p", type: "photo", src: "data:image/jpeg;base64,aGVsbG8=" },
      ],
    };
    const changed = await router.dispatch(
      request({ type: "setTaskContent", roleId, taskId: "task", content }),
    );
    assert.equal(changed.ok, true);
    const after = await router.dispatch(
      request({ type: "readTaskContent", roleId, taskId: "task" }),
    );
    assert.deepEqual(after.taskDetail!.content, content);
    assert.equal(
      (await router.dispatch(request({ type: "undo", editId: changed.undoId }))).ok,
      true,
    );
    const restored = await router.dispatch(
      request({ type: "readTaskContent", roleId, taskId: "task" }),
    );
    assert.deepEqual(restored.taskDetail!.content, read.taskDetail!.content);
  } finally {
    router.dispose();
  }
});

test("replaying a rich read after a profile switch cannot expose the prior profile content", async () => {
  const { router, request, roleId } = setup();
  try {
    const command = request({ type: "readTaskContent", roleId, taskId: "task" });
    const first = await router.dispatch(command);
    assert.equal(first.taskDetail!.content.blocks[0].type, "notes");
    useSpread.setState({ activeId: "other-profile", data: defaultData() });
    const replay = await router.dispatch(command);
    assert.equal(replay.ok, false);
    assert.equal(replay.error, "stale-context");
    assert.equal(replay.taskDetail, undefined);
    assert.equal(replay.state!.envelope.profileId, "other-profile");
  } finally {
    router.dispose();
  }
});

test("rich-content commands reject values that the existing normalizer would discard or clamp", async () => {
  const { router, request, roleId } = setup();
  try {
    const original = storage.map.get(STORE_KEY);
    for (const block of [
      { id: "outline", type: "outline", items: [{ id: "item", text: "Too deep", level: 5 }] },
      { id: "photo", type: "photo", src: "https://example.invalid/untrusted.jpg" },
    ]) {
      assert.equal(
        (
          await router.dispatch(
            request({
              type: "setTaskContent",
              roleId,
              taskId: "task",
              content: { blocks: [block] },
            }),
          )
        ).error,
        "invalid-command",
      );
      assert.equal(storage.map.get(STORE_KEY), original);
    }
  } finally {
    router.dispose();
  }
});

test("legacy fractional outline levels accepted by the canonical model survive native edits", async () => {
  const { router, request, roleId } = setup();
  try {
    const content = {
      blocks: [
        { id: "o", type: "outline", items: [{ id: "i", text: "Legacy indent", level: 2.5 }] },
      ],
    };
    assert.equal(
      (await router.dispatch(request({ type: "setTaskContent", roleId, taskId: "task", content })))
        .ok,
      true,
    );
    const read = await router.dispatch(
      request({ type: "readTaskContent", roleId, taskId: "task" }),
    );
    assert.deepEqual(read.taskDetail!.content, content);
  } finally {
    router.dispose();
  }
});

test("rich read replay cannot bind stale content to a newer revision in the same week", async () => {
  const { router, request, roleId } = setup();
  try {
    const original = request({ type: "readTaskContent", roleId, taskId: "task" });
    assert.equal((await router.dispatch(original)).ok, true);
    const content = { blocks: [{ id: "n", type: "notes", text: "New authoritative notes" }] };
    assert.equal(
      (await router.dispatch(request({ type: "setTaskContent", roleId, taskId: "task", content })))
        .ok,
      true,
    );
    const replay = await router.dispatch(original);
    assert.equal(replay.error, "stale-context");
    assert.equal(replay.taskDetail, undefined);
    const fresh = await router.dispatch(
      request({ type: "readTaskContent", roleId, taskId: "task" }),
    );
    assert.deepEqual(fresh.taskDetail!.content, content);
  } finally {
    router.dispose();
  }
});

test("addRole with the native default illustration 'custom' creates a responsibility without a category", async () => {
  const { router, request } = setup();
  const before = router.read()!.envelope.snapshot.roles.length;
  const reply = await router.dispatch(request({ type: "addRole", name: "No illustration", hours: 1, category: "custom" }));
  assert.equal(reply.ok, true);
  const roles = router.read()!.envelope.snapshot.roles;
  assert.equal(roles.length, before + 1);
  const added = roles[roles.length - 1];
  assert.equal(added.name, "No illustration");
  assert.equal(added.category, "custom");
  const stored = useSpread.getState().data.hats.find((hat) => hat.name === "No illustration");
  assert.ok(stored, "the responsibility is stored");
  assert.equal("category" in stored, false, "custom stores no category, like the React default");
});

test("addRole with a real category stores it and an unknown category is refused without a write", async () => {
  const { router, request } = setup();
  const good = await router.dispatch(request({ type: "addRole", name: "Fitness block", hours: 2, category: "fitness" }));
  assert.equal(good.ok, true);
  assert.equal(useSpread.getState().data.hats.find((hat) => hat.name === "Fitness block")?.category, "fitness");
  const count = useSpread.getState().data.hats.length;
  const bad = await router.dispatch(request({ type: "addRole", name: "Bogus", hours: 2, category: "bogus" }));
  assert.equal(bad.ok, false);
  assert.equal(useSpread.getState().data.hats.length, count, "a refused command writes nothing");
});

// ---------------------------------------------------------------------------------------------------------------
// SwiftUI UX audit: the native intents added for the rebuilt shell had no coverage. These pin the data-safety
// properties the audit requires: the right role/day/week, no write on a refusal, Undo for drags, reads that
// change nothing.
// ---------------------------------------------------------------------------------------------------------------

const openWeekDays = () => weekDays(useSpread.getState().data.currentWeek).map((d) => d.date);
const dataJSON = () => JSON.stringify(useSpread.getState().data);

test("moveSpreadToDay adds hours for that role on a day of the open week and Undo takes them back", async () => {
  const { router, request, roleId } = setup();
  try {
    const target = openWeekDays()[2];
    const before = dataJSON();
    const moved = await router.dispatch(request({ type: "moveSpreadToDay", roleId, day: target, hours: 1 }));
    assert.equal(moved.ok, true);
    assert.equal(typeof moved.undoId, "string", "a drag offers Undo");
    const placed = router.read()!.envelope.snapshot.allocations.filter((a) => a.day === target);
    assert.deepEqual(placed.map((a) => [a.roleId, a.hours]), [[roleId, 1]]);
    const undone = await router.dispatch(request({ type: "undo", editId: moved.undoId }));
    assert.equal(undone.ok, true);
    assert.equal(dataJSON(), before, "Undo restores the exact prior plan");
  } finally {
    router.dispose();
  }
});

test("moveSpreadToDay refuses a day outside the open week, an unknown role and a non-positive amount without any write", async () => {
  const { router, request, roleId } = setup();
  try {
    const before = dataJSON();
    const nextWeek = shiftWeek(useSpread.getState().data.currentWeek, 1);
    const outside = await router.dispatch(request({ type: "moveSpreadToDay", roleId, day: nextWeek, hours: 1 }));
    assert.deepEqual([outside.ok, outside.error], [false, "invalid-day"]);
    const unknown = await router.dispatch(request({ type: "moveSpreadToDay", roleId: "nobody", day: openWeekDays()[1], hours: 1 }));
    assert.deepEqual([unknown.ok, unknown.error], [false, "no-role"]);
    const zero = await router.dispatch(request({ type: "moveSpreadToDay", roleId, day: openWeekDays()[1], hours: 0 }));
    assert.deepEqual([zero.ok, zero.error], [false, "invalid-command"]);
    assert.equal(dataJSON(), before);
  } finally {
    router.dispose();
  }
});

test("moveAllocation keeps the role and hours, merges into the same role's allocation on the target day, and ignores other weeks", async () => {
  const { router, request, roleId } = setup();
  try {
    const target = openWeekDays()[3];
    const moved = await router.dispatch(request({ type: "moveAllocation", allocationId: "eligible", day: target }));
    assert.equal(moved.ok, true);
    assert.equal(typeof moved.undoId, "string");
    let allocations = router.read()!.envelope.snapshot.allocations;
    const mine = allocations.find((a) => a.id === "eligible")!;
    assert.deepEqual([mine.roleId, mine.day, mine.hours], [roleId, target, 2]);
    assert.equal(allocations.find((a) => a.id === "wrong")!.roleId, useSpread.getState().data.hats[1].id, "another role's hours do not move");
    // Moving a second allocation of the same role onto that day folds the hours together.
    const other = await router.dispatch(request({ type: "moveSpreadToDay", roleId, day: openWeekDays()[1], hours: 1 }));
    assert.equal(other.ok, true);
    const extra = router.read()!.envelope.snapshot.allocations.find((a) => a.day === openWeekDays()[1])!;
    const merged = await router.dispatch(request({ type: "moveAllocation", allocationId: extra.id, day: target }));
    assert.equal(merged.ok, true);
    allocations = router.read()!.envelope.snapshot.allocations.filter((a) => a.roleId === roleId && a.day === target);
    assert.deepEqual(allocations.map((a) => a.hours), [3], "one allocation, hours added");
    const before = dataJSON();
    const missing = await router.dispatch(request({ type: "moveAllocation", allocationId: "not-here", day: target }));
    assert.deepEqual([missing.ok, missing.error], [false, "no-allocation"]);
    assert.equal(dataJSON(), before);
  } finally {
    router.dispose();
  }
});

test("setRoleColor and setRoleCategory change only that role, and malformed values never write", async () => {
  const { router, request, roleId } = setup();
  try {
    const roles = () => router.read()!.envelope.snapshot.roles;
    const sibling = roles()[1];
    // Choosing a symbol also takes that symbol's preset colour (store behaviour, unchanged), so colour comes second.
    assert.equal((await router.dispatch(request({ type: "setRoleCategory", roleId, category: "fitness" }))).ok, true);
    assert.equal((await router.dispatch(request({ type: "setRoleColor", roleId, color: "#112233" }))).ok, true);
    assert.deepEqual([roles()[0].color, roles()[0].category], ["#112233", "fitness"]);
    assert.deepEqual(roles()[1], sibling, "the sibling responsibility is untouched");
    const before = dataJSON();
    for (const action of [
      { type: "setRoleColor", roleId, color: "red" },
      { type: "setRoleColor", roleId, color: "#12345" },
      { type: "setRoleCategory", roleId, category: "bogus" },
      { type: "setRoleColor", roleId: "nobody", color: "#112233" },
    ]) {
      const reply = await router.dispatch(request(action));
      assert.equal(reply.ok, false);
    }
    assert.equal(dataJSON(), before);
  } finally {
    router.dispose();
  }
});

test("rollover copies into next week once, asks before replacing it, and replaces only when forced", async () => {
  const { router, request } = setup();
  try {
    const start = useSpread.getState().data.currentWeek;
    const first = await router.dispatch(request({ type: "rollover", force: false }));
    assert.deepEqual([first.ok, first.rollover], [true, "done"]);
    assert.equal(useSpread.getState().data.currentWeek, shiftWeek(start, 1), "the new week opens");
    // Back on the first week: next week now has content, so a plain rollover only asks.
    useSpread.getState().openWeek(start);
    const before = dataJSON();
    const asked = await router.dispatch(request({ type: "rollover", force: false }));
    assert.deepEqual([asked.ok, asked.rollover], [true, "confirm"]);
    assert.equal(dataJSON(), before, "asking changes nothing");
    const forced = await router.dispatch(request({ type: "rollover", force: true }));
    assert.deepEqual([forced.ok, forced.rollover], [true, "done"]);
    assert.equal(useSpread.getState().data.currentWeek, shiftWeek(start, 1));
  } finally {
    router.dispose();
  }
});

test("removeProfile refuses the last profile and writes nothing", async () => {
  const { router, request } = setup();
  try {
    useSpread.setState({ profiles: [{ id: "p1", name: "Me", store: STORE_KEY, theme: "system", accent: null }] as never });
    const before = dataJSON();
    const refused = await router.dispatch(request({ type: "removeProfile", profileId: "p1" }));
    assert.deepEqual([refused.ok, refused.error], [false, "action-refused"]);
    assert.equal(dataJSON(), before);
    assert.equal(useSpread.getState().profiles.length, 1);
  } finally {
    router.dispose();
  }
});

test("exportWeek is a read: it returns the week, changes nothing, offers no Undo and may be repeated", async () => {
  const { router, request } = setup();
  try {
    const before = dataJSON();
    const revision = router.read()!.revision;
    const asked = request({ type: "exportWeek", format: "text" });
    const first = await router.dispatch(asked);
    const second = await router.dispatch(asked);
    for (const reply of [first, second]) {
      assert.equal(reply.ok, true);
      assert.equal(reply.exported?.format, "text");
      assert.ok((reply.exported?.content ?? "").includes(useSpread.getState().data.hats[0].name));
      assert.equal(reply.undoId, undefined);
    }
    assert.equal(dataJSON(), before);
    assert.equal(router.read()!.revision, revision, "a read does not advance the revision");
  } finally {
    router.dispose();
  }
});

test("exportWeek HTML escapes user text and a stale week is refused", async () => {
  const { router, request } = setup();
  try {
    const data = useSpread.getState().data;
    const box = data.weeks[data.currentWeek].boxes[0];
    box.tasks[0].text = "<script>alert(1)</script> & done";
    const html = await router.dispatch(request({ type: "exportWeek", format: "html" }));
    assert.equal(html.ok, true);
    const content = html.exported?.content ?? "";
    assert.ok(!content.includes("<script>alert(1)"), "no raw markup from a task title");
    assert.ok(content.includes("&lt;script&gt;"));
    const stale = await router.dispatch({ ...request({ type: "exportWeek", format: "text" }), expectedWeek: "2026-01-05" });
    assert.deepEqual([stale.ok, stale.error], [false, "stale-week"]);
  } finally {
    router.dispose();
  }
});

test("exportWeek Word output is a real zip (docx) package", async () => {
  const { router, request } = setup();
  try {
    const reply = await router.dispatch(request({ type: "exportWeek", format: "docx" }));
    assert.equal(reply.ok, true);
    const bytes = Buffer.from(reply.exported?.content ?? "", "base64");
    assert.equal(bytes.subarray(0, 2).toString("latin1"), "PK", "a docx file is a zip archive");
  } finally {
    router.dispose();
  }
});

test("monthMarks reports role dots for any week of the month, reads only, and refuses another profile", async () => {
  const { router, request, roleId } = setup();
  try {
    const data = useSpread.getState().data;
    const start = data.currentWeek;
    const [year, month] = [Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1];
    // Plan something in the following week, then come back: the open week is not the week being asked about.
    const state = useSpread.getState();
    state.openWeek(shiftWeek(start, 1));
    const later = weekDays(useSpread.getState().data.currentWeek)[3].date;
    state.addAllocation(roleId, later, 2);
    state.openWeek(start);
    const before = dataJSON();
    const revision = router.read()!.revision;
    const reply = await router.dispatch(request({ type: "monthMarks", year, month }));
    assert.equal(reply.ok, true);
    const marks = reply.monthMarks!;
    assert.ok(Object.keys(marks).length >= 28 && Object.keys(marks).length % 7 === 0, "a full month grid");
    const hat = (id: string) => useSpread.getState().data.hats.find((h) => h.id === id)!.color;
    assert.deepEqual(marks[start], { colors: [hat(roleId), hat(useSpread.getState().data.hats[1].id)], extra: 0 });
    // The day in the other week still shows its dot, though only `start`'s week is open.
    if (later.slice(0, 7) === start.slice(0, 7) || marks[later]) {
      assert.deepEqual(marks[later]?.colors, [hat(roleId)]);
    }
    assert.equal(dataJSON(), before, "reading marks changes nothing");
    assert.equal(router.read()!.revision, revision);
    const wrongProfile = await router.dispatch({ ...request({ type: "monthMarks", year, month }), expectedProfileId: "someone-else" });
    assert.deepEqual([wrongProfile.ok, wrongProfile.error], [false, "stale-profile"]);
    const badMonth = await router.dispatch(request({ type: "monthMarks", year, month: 12 }));
    assert.deepEqual([badMonth.ok, badMonth.error], [false, "invalid-command"]);
  } finally {
    router.dispose();
  }
});

// Refusals are checked inside the serialized dispatcher: no partial write and no stale native-bank race.
for (const type of ["allocate", "moveSpreadToDay", "allocationHours"] as const) {
  test(`${type}: empty and insufficient banks explain refusal without a write`, async () => {
    const { router, request, roleId } = setup();
    try {
      const make = (hours: number) => type === "allocationHours"
        ? { type, allocationId: "eligible", hours: hours + 2 }
        : { type, roleId, day: openWeekDays()[2], hours };
      const before = dataJSON();
      const tooMuch = await router.dispatch(request(make(6.5)));
      assert.equal(tooMuch.error, "bank-exceeded");
      assert.equal(dataJSON(), before);
      const exact = await router.dispatch(request(make(6)));
      assert.equal(exact.ok, true);
      const empty = dataJSON();
      assert.equal((await router.dispatch(request(make(0.5)))).error,
        type === "allocationHours" ? undefined : "bank-empty");
      // Reducing an allocation returns hours to the bank, even when that bank was empty.
      if (type !== "allocationHours") assert.equal(dataJSON(), empty);
    } finally { router.dispose(); }
  });
}

test("queued native placement cannot overspend a bank or replay a refused command into a later plan", async () => {
  const { router, request, roleId } = setup();
  try {
    const command = request({ type: "moveSpreadToDay", roleId, day: openWeekDays()[2], hours: 6.5 });
    assert.equal((await router.dispatch(command)).error, "bank-exceeded");
    await router.dispatch(request({ type: "setHours", roleId, hours: 9 }));
    assert.equal((await router.dispatch(command)).error, "bank-exceeded");
    assert.equal((await router.dispatch(request({ type: "moveSpreadToDay", roleId, day: openWeekDays()[2], hours: 6.5 }))).ok, true);
    assert.equal(router.read()!.envelope.snapshot.allocations.filter((a) => a.roleId === roleId).reduce((n, a) => n + a.hours, 0), 8.5);
  } finally { router.dispose(); }
});
