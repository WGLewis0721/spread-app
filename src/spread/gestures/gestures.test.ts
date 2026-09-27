import assert from "node:assert/strict";
import test from "node:test";
import { acceptsPointer, mouseActivation, touchActivation } from "./activation.ts";
import { gestureAllowsSwipe, weekSwipeDirection, weekSwipeShift } from "./swipe.ts";
import { highlightedDay, resolveDrop } from "./resolve-drop.ts";

test("a sideways swipe changes week and a vertical one does not", () => {
  assert.equal(weekSwipeDirection({ x: 200, y: 100 }, { x: 100, y: 110 }, { width: 390 }), 1);
  assert.equal(weekSwipeDirection({ x: 80, y: 100 }, { x: 200, y: 90 }, { width: 390 }), -1);
  assert.equal(weekSwipeDirection({ x: 200, y: 100 }, { x: 210, y: 240 }, { width: 390 }), null);
  assert.equal(weekSwipeDirection({ x: 8, y: 100 }, { x: 120, y: 100 }, { width: 390 }), null);
});

test("the crown shift follows the finger until the gesture is mostly vertical", () => {
  assert.equal(weekSwipeShift({ x: 100, y: 40 }, { x: 40, y: 48 }), -60);
  assert.equal(weekSwipeShift({ x: 100, y: 40 }, { x: 104, y: 90 }), 0);
});

test("an active drag wins over a week swipe", () => {
  assert.equal(gestureAllowsSwipe(true), false);
  assert.equal(gestureAllowsSwipe(false), true);
});

test("touch holds before a drag and a mouse starts after a short move", () => {
  const touch = { isPrimary: true, button: 0, pointerType: "touch" };
  const mouse = { isPrimary: true, button: 0, pointerType: "mouse" };
  const pen = { isPrimary: true, button: 0, pointerType: "pen" };
  assert.equal(acceptsPointer(touch, true), true);
  assert.equal(acceptsPointer(mouse, true), false);
  assert.equal(acceptsPointer(mouse, false), true);
  assert.equal(acceptsPointer(pen, false), true);
  assert.equal(acceptsPointer(touch, false), false);
  assert.equal(touchActivation.delay > mouseActivation.distance, true);
});

test("a cancelled swipe does not keep a direction", () => {
  assert.equal(weekSwipeDirection({ x: 40, y: 40 }, { x: 40, y: 40 }, { width: 390 }), null);
});

test("drops call spread actions instead of talking to the pointer", () => {
  const allocations = [
    { id: "a", day: "2026-09-27" },
    { id: "b", day: "2026-09-27" },
    { id: "c", day: "2026-09-28" },
  ];
  assert.deepEqual(resolveDrop({ kind: "spread", hatId: "work" }, "day:2026-09-28", allocations), {
    action: "moveSpreadToDay",
    hatId: "work",
    day: "2026-09-28",
  });
  assert.deepEqual(resolveDrop({ kind: "allocation", allocationId: "a" }, "day:2026-09-28", allocations), {
    action: "moveAllocation",
    allocationId: "a",
    day: "2026-09-28",
  });
  assert.deepEqual(resolveDrop({ kind: "allocation", allocationId: "a" }, "alloc:b", allocations), {
    action: "reorderAllocation",
    allocationId: "a",
    beforeId: "b",
  });
  assert.equal(highlightedDay("alloc:c", allocations), "2026-09-28");
  assert.equal(resolveDrop({ kind: "spread", hatId: "work" }, "nope", allocations), null);
});
