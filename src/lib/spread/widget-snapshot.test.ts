import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, type SpreadData } from "./model.ts";
import { buildWidgetSnapshot, syncWidget, WIDGET_TITLE_LENGTH, type WidgetEnv } from "./widget-snapshot.ts";

const NOW = new Date(2026, 9, 28, 14, 0); // Wed 2026-10-28
const TODAY = "2026-10-28";
const WEEK = "2026-10-26";

function planned(): SpreadData {
  const data = defaultData();
  const hatId = data.hats[0].id;
  data.weeks = {
    [WEEK]: {
      allocations: [
        { id: "a-today", hatId, day: TODAY, hours: 2.5, order: 0 },
        { id: "a-later", hatId: data.hats[1].id, day: "2026-10-29", hours: 4, order: 0 },
      ],
      boxes: [
        {
          hatId,
          hours: 5,
          tasks: [
            { id: "t1", text: "Write the proposal", done: true, allocationId: "a-today" },
            { id: "t2", text: "Call the   landlord about the lease", done: false, allocationId: "a-today" },
            { id: "t3", text: "Not today", done: false, allocationId: "a-later" },
            { id: "t4", text: "Unplaced", done: false },
          ],
        },
      ],
    },
  };
  data.currentWeek = WEEK;
  return data;
}

test("counts only tasks placed on today, with hours placed today", () => {
  const s = buildWidgetSnapshot(planned(), { showTaskNames: false }, NOW);
  assert.deepEqual(s, { version: 1, date: TODAY, done: 1, total: 2, hours: 2.5 });
});

test("no task text unless the owner opted in", () => {
  const s = buildWidgetSnapshot(planned(), { showTaskNames: false }, NOW);
  assert.equal("titles" in s, false);
  assert.equal(JSON.stringify(s).includes("landlord"), false);
});

test("opted in: open tasks only, whitespace collapsed", () => {
  const s = buildWidgetSnapshot(planned(), { showTaskNames: true }, NOW);
  assert.deepEqual(s.titles, ["Call the landlord about the lease"]);
});

test("long titles are clipped and the list is capped at three", () => {
  const data = planned();
  const box = data.weeks[WEEK].boxes[0];
  box.tasks = Array.from({ length: 6 }, (_, i) => ({ id: `x${i}`, text: "y".repeat(80), done: false, allocationId: "a-today" }));
  const s = buildWidgetSnapshot(data, { showTaskNames: true }, NOW);
  assert.equal(s.titles?.length, 3);
  assert.ok(s.titles?.every((t) => t.length <= WIDGET_TITLE_LENGTH));
});

test("a day with no plan, or no week at all, is an empty snapshot", () => {
  const empty = defaultData();
  empty.weeks = {};
  assert.deepEqual(buildWidgetSnapshot(empty, { showTaskNames: true }, NOW), { version: 1, date: TODAY, done: 0, total: 0, hours: 0, titles: [] });
});

function env(over: Partial<WidgetEnv> = {}) {
  const calls: string[] = [];
  const e: WidgetEnv = {
    native: () => true,
    write: async (json) => void calls.push(`write:${json}`),
    clear: async () => void calls.push("clear"),
    ...over,
  };
  return { e, calls };
}

test("switch off deletes the snapshot and writes nothing", async () => {
  const t = env();
  assert.equal(await syncWidget(planned(), { enabled: false, showTaskNames: true }, t.e, NOW), false);
  assert.deepEqual(t.calls, ["clear"]);
});

test("switch on writes one snapshot", async () => {
  const t = env();
  assert.equal(await syncWidget(planned(), { enabled: true, showTaskNames: false }, t.e, NOW), true);
  assert.equal(t.calls.length, 1);
  assert.ok(t.calls[0].startsWith("write:{"));
});

test("does nothing on the web", async () => {
  const t = env({ native: () => false });
  assert.equal(await syncWidget(planned(), { enabled: true, showTaskNames: false }, t.e, NOW), false);
  assert.deepEqual(t.calls, []);
});

test("a failing plugin is swallowed", async () => {
  const t = env({ write: async () => Promise.reject(new Error("no plugin")) });
  assert.equal(await syncWidget(planned(), { enabled: true, showTaskNames: false }, t.e, NOW), false);
});
