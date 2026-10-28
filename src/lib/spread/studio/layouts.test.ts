import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LAYOUT, DIAL_GAP, SPREAD_LAYOUTS, dialSegments, isLayout, layoutOrDefault, segmentAt } from "./layouts.ts";

test("stack is the default and comes first", () => {
  assert.equal(DEFAULT_LAYOUT, "stack");
  assert.equal(SPREAD_LAYOUTS[0].id, "stack");
});

test("unknown stored values fall back to the default", () => {
  assert.equal(layoutOrDefault(null), "stack");
  assert.equal(layoutOrDefault("carousel"), "stack");
  assert.equal(layoutOrDefault("fan"), "fan");
  assert.equal(isLayout("day"), true);
  assert.equal(isLayout("Day"), false);
});

test("dial arcs are sized by hours and fill the ring", () => {
  const segments = dialSegments([{ id: "a", hours: 8 }, { id: "b", hours: 4 }, { id: "c", hours: 3 }]);
  assert.equal(segments.length, 3);
  assert.ok(segments[0].span > segments[1].span && segments[1].span > segments[2].span);
  const spans = segments.reduce((sum, segment) => sum + segment.span, 0);
  assert.ok(Math.abs(spans + 3 * DIAL_GAP - 360) < 1e-9);
  assert.ok(segments[0].from >= 0 && segments[2].to <= 360);
  for (let i = 1; i < segments.length; i += 1) assert.ok(segments[i].from > segments[i - 1].to);
});

test("a spread with no hours still gets an arc you can hit", () => {
  const segments = dialSegments([{ id: "a", hours: 0 }, { id: "b", hours: 0 }]);
  assert.ok(segments.every((segment) => segment.span > 100));
});

test("one spread is a whole ring and none is empty", () => {
  const one = dialSegments([{ id: "a", hours: 5 }]);
  assert.ok(one[0].span > 359 && one[0].span < 360);
  assert.deepEqual(dialSegments([]), []);
});

test("an angle finds its arc, wrapping past the top", () => {
  const segments = dialSegments([{ id: "a", hours: 6 }, { id: "b", hours: 6 }]);
  assert.equal(segmentAt(segments, 10)?.id, "a");
  assert.equal(segmentAt(segments, 200)?.id, "b");
  assert.equal(segmentAt(segments, 370)?.id, "a");
  assert.equal(segmentAt(segments, -10)?.id, "b");
  assert.equal(segmentAt([], 90), undefined);
});
