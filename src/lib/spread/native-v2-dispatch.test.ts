import assert from "node:assert/strict";
import test from "node:test";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, STORE_KEY } from "./model.ts";
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
