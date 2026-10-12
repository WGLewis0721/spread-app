import assert from "node:assert/strict";
import test from "node:test";
import { acceptsPointer, activationFor, mouseActivation, touchActivation } from "./activation.ts";
import { gestureAllowsSwipe, weekSwipeDirection, weekSwipeShift } from "./swipe.ts";
import { highlightedDay, resolveDrop } from "./resolve-drop.ts";
import { arrowDirection, stepZone } from "./keyboard-zones.ts";
import { dropCollisions } from "./collisions.ts";

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
  assert.equal(activationFor("touch"), touchActivation);
  assert.equal(activationFor("mouse"), mouseActivation);
  assert.equal(activationFor("pen"), mouseActivation);
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

test("a task drop lands on its own role's row that day, refuses a day without it, and the tray takes it off", () => {
  const slots = [
    { id: "w1", day: "2026-09-27", hatId: "work", hours: 2 },
    { id: "h1", day: "2026-09-27", hatId: "health", hours: 1 },
    { id: "w2", day: "2026-09-28", hatId: "work", hours: 0 },
  ];
  const task = { kind: "task" as const, hatId: "work", taskId: "t1" };
  assert.deepEqual(resolveDrop(task, "alloc:w1", slots), { action: "assignTask", hatId: "work", taskId: "t1", allocationId: "w1" });
  assert.deepEqual(resolveDrop(task, "day:2026-09-27", slots), { action: "assignTask", hatId: "work", taskId: "t1", allocationId: "w1" });
  // dropped on another role's row, it still lands on its own role's row that day
  assert.deepEqual(resolveDrop(task, "alloc:h1", slots), { action: "assignTask", hatId: "work", taskId: "t1", allocationId: "w1" });
  const home = { kind: "task" as const, hatId: "home", taskId: "t2" };
  assert.deepEqual(resolveDrop(home, "alloc:w1", slots), { action: "refuseTask", hatId: "home", taskId: "t2", reason: "no-allocation", day: "2026-09-27" });
  assert.deepEqual(resolveDrop(task, "day:2026-09-29", slots), { action: "refuseTask", hatId: "work", taskId: "t1", reason: "no-allocation", day: "2026-09-29" });
  // an allocation with no hours is not a place to put a task, whether the day or the row is the target
  assert.equal(resolveDrop(task, "day:2026-09-28", slots)?.action, "refuseTask");
  assert.equal(resolveDrop(task, "alloc:w2", slots)?.action, "refuseTask");
  assert.deepEqual(resolveDrop(task, "tray", slots), { action: "assignTask", hatId: "work", taskId: "t1", allocationId: null });
  assert.equal(resolveDrop(task, "nope", slots), null);
  assert.equal(resolveDrop(task, "alloc:missing", slots), null);
});

test("arrow keys step a held task through the strip day by day, then down, and stop at the ends", () => {
  const strip = ["mon", "tue", "wed"].map((id, index) => ({ id: `day:${id}`, top: 200, left: 16 + index * 52 }));
  const zones = [...strip, { id: "tray", top: 520, left: 0 }];
  // from the task's own place below the strip, back (up/left) reaches the tray first, then the days
  assert.equal(stepZone(zones, { top: 600, left: 40 }, -1)?.id, "tray");
  assert.equal(stepZone(zones, { top: 520, left: 0 }, -1)?.id, "day:wed");
  assert.equal(stepZone(zones, { top: 200, left: 120 }, -1)?.id, "day:tue");
  assert.equal(stepZone(zones, { top: 200, left: 16 }, -1), null);
  assert.equal(stepZone(zones, { top: 200, left: 16 }, 1)?.id, "day:tue");
  assert.equal(stepZone(zones, { top: 200, left: 120 }, 1)?.id, "tray");
  assert.equal(stepZone(zones, { top: 520, left: 0 }, 1), null);
  assert.equal(arrowDirection("ArrowDown"), 1);
  assert.equal(arrowDirection("ArrowLeft"), -1);
  assert.equal(arrowDirection("Space"), 0);
});

test("a point picks the drop place, the sheet wins over what it covers, and a near miss still lands", () => {
  const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
  const rects = new Map<string, ReturnType<typeof rect>>([
    ["day:sat", rect(280, 100, 46, 72)],
    ["day:sun", rect(332, 100, 46, 72)],
    ["alloc:a1", rect(16, 600, 358, 56)],
    ["tray", rect(0, 620, 390, 112)],
  ]);
  const hit = (collisionRect: ReturnType<typeof rect>, pointerCoordinates: { x: number; y: number } | null) =>
    dropCollisions({
      active: { id: "task:t1" },
      collisionRect,
      droppableRects: rects,
      droppableContainers: [...rects.keys()].map((id) => ({ id })),
      pointerCoordinates,
    } as unknown as Parameters<typeof dropCollisions>[0])[0]?.id;
  // the keyboard puts the card's corner just inside Saturday; the wide card overlaps Sunday more
  assert.equal(hit(rect(292, 112, 150, 48), null), "day:sat");
  // a finger over the sheet puts the task back even with a day's row underneath
  assert.equal(hit(rect(40, 610, 150, 48), { x: 60, y: 630 }), "tray");
  // a finger just off the strip still lands on the day the card covers
  assert.equal(hit(rect(330, 120, 40, 40), { x: 300, y: 95 }), "day:sun");
});
