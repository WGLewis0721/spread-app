import assert from "node:assert/strict";
import test from "node:test";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, STORE_KEY, type SpreadData } from "./model.ts";
import { PROFILES_KEY, profileStore, type Profile } from "./profiles.ts";
import { applyUndo, canUndo, makeEdit, pushEdit, UNDO_DEPTH } from "./week-edit.ts";

const storage = installBrowser();
const { useSpread } = await import("@/lib/spread/store");
const local: Profile = { id: "local", name: "Local", store: profileStore("local"), theme: "light", accent: null };

function seed() {
  const data: SpreadData = defaultData();
  const week = data.weeks[data.currentWeek];
  week.boxes[0].hours = 10;
  week.boxes[0].tasks.push({ id: "t1", text: "Plan", done: false });
  week.allocations = [
    { id: "a1", hatId: week.boxes[0].hatId, day: "2026-09-27", hours: 2, order: 0 },
    { id: "a2", hatId: week.boxes[0].hatId, day: "2026-09-28", hours: 1, order: 0 },
  ];
  storage.map.clear();
  storage.failWhen = null;
  storage.map.set(STORE_KEY, JSON.stringify(data));
  storage.map.set(PROFILES_KEY, JSON.stringify([local]));
  useSpread.setState({ profiles: [local], activeId: local.id, data });
  return week.boxes[0].hatId;
}
const allocs = () => {
  const d = useSpread.getState().data;
  return d.weeks[d.currentWeek].allocations;
};

test("a change that does nothing offers no undo", () => {
  seed();
  const id = useSpread.getState().undoable(() => useSpread.getState().moveAllocation("missing", "2026-09-29"));
  assert.equal(id, null);
});

test("undo puts a dragged allocation back exactly, and is saved", () => {
  seed();
  const before = JSON.stringify(allocs());
  const id = useSpread.getState().undoable(() => useSpread.getState().moveAllocation("a1", "2026-09-29"));
  assert.ok(id);
  assert.notEqual(JSON.stringify(allocs()), before);
  assert.equal(useSpread.getState().undoEdit(id as string), true);
  assert.equal(JSON.stringify(allocs()), before);
  const saved = JSON.parse(storage.map.get(STORE_KEY) as string) as SpreadData;
  assert.equal(JSON.stringify(saved.weeks[saved.currentWeek].allocations), before);
  assert.equal(useSpread.getState().undoEdit(id as string), false, "an edit is undone once");
});

test("undo undoes a fold of two allocations and the task it carried", () => {
  const hat = seed();
  useSpread.getState().assignTask(hat, "t1", "a2");
  const id = useSpread.getState().undoable(() => useSpread.getState().moveAllocation("a2", "2026-09-27"));
  assert.equal(allocs().length, 1);
  assert.equal(useSpread.getState().undoEdit(id as string), true);
  assert.equal(allocs().length, 2);
  const d = useSpread.getState().data;
  assert.equal(d.weeks[d.currentWeek].boxes[0].tasks[0].allocationId, "a2");
});

test("undo refuses when the week changed since, so newer work is kept", () => {
  seed();
  const id = useSpread.getState().undoable(() => useSpread.getState().moveAllocation("a1", "2026-09-29"));
  useSpread.getState().addTask(useSpread.getState().data.hats[0].id, "typed after");
  const kept = JSON.stringify(useSpread.getState().data);
  assert.equal(useSpread.getState().undoEdit(id as string), false);
  assert.equal(JSON.stringify(useSpread.getState().data), kept);
});

test("the pure helpers: guard, apply, bounded stack", () => {
  const a = defaultData();
  const b = structuredClone(a);
  b.weeks[b.currentWeek].allocations.push({ id: "x", hatId: "h", day: "2026-09-27", hours: 1, order: 0 });
  const edit = makeEdit("e", "local", a, b);
  assert.ok(edit);
  assert.equal(canUndo(edit!, "local", b), true);
  assert.equal(canUndo(edit!, "other", b), false);
  assert.deepEqual(applyUndo(edit!, b).weeks[b.currentWeek], a.weeks[a.currentWeek]);
  let stack: ReturnType<typeof pushEdit> = [];
  for (let i = 0; i < UNDO_DEPTH + 5; i++) stack = pushEdit(stack, { ...edit!, id: String(i) });
  assert.equal(stack.length, UNDO_DEPTH);
  assert.equal(stack[0].id, "5");
});
