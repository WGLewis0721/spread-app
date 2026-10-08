// Astra A01: a profile is "empty" only if nothing a person did is in it.
import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, type SpreadData } from "./model.ts";
import { isPristine } from "./sync-link.ts";

function fresh(): SpreadData {
  return defaultData();
}
const box = (d: SpreadData) => d.weeks[d.currentWeek].boxes[0];

test("A01: the starting planner is pristine", () => {
  assert.equal(isPristine(fresh()), true);
});

test("A01: changed weekly hours are content", () => {
  const d = fresh();
  box(d).hours = 29;
  assert.equal(isPristine(d), false);
});

test("A01: a changed hat colour is content", () => {
  const d = fresh();
  d.hats[0].color = "#123456";
  assert.equal(isPristine(d), false);
});

test("A01: a changed hat category is content", () => {
  const d = fresh();
  d.hats[0].category = d.hats[0].category === "work" ? "home" : "work";
  assert.equal(isPristine(d), false);
});

test("A01: an extra hat or a removed hat is content", () => {
  const more = fresh();
  more.hats.push({ id: "x", name: "Extra", defaultHours: 4, color: "#000000" });
  assert.equal(isPristine(more), false);
  const fewer = fresh();
  fewer.hats.pop();
  assert.equal(isPristine(fewer), false);
});

test("A01: several untouched weeks are still pristine", () => {
  const d = fresh();
  d.weeks["2026-01-05"] = structuredClone(d.weeks[d.currentWeek]);
  d.weeks["2026-01-12"] = structuredClone(d.weeks[d.currentWeek]);
  assert.equal(isPristine(d), true);
});

test("A01: a week with a changed box in an old week is content", () => {
  const d = fresh();
  d.weeks["2026-01-05"] = structuredClone(d.weeks[d.currentWeek]);
  d.weeks["2026-01-05"].boxes[1].hours = 3;
  assert.equal(isPristine(d), false);
});

test("A01: tasks and allocations are content", () => {
  const withTask = fresh();
  box(withTask).tasks.push({ id: "t", text: "x", done: false });
  assert.equal(isPristine(withTask), false);
  const withAlloc = fresh();
  withAlloc.weeks[withAlloc.currentWeek].allocations.push({ id: "a", hatId: box(withAlloc).hatId, day: "Monday", hours: 1, order: 0 });
  assert.equal(isPristine(withAlloc), false);
});

import { classifyStored } from "./pristine.ts";

test("A01: saved text is classified strictly", () => {
  assert.equal(classifyStored(null).kind, "absent");
  assert.equal(classifyStored(JSON.stringify(fresh())).kind, "pristine");
  const custom = fresh();
  box(custom).hours = 29;
  assert.equal(classifyStored(JSON.stringify(custom)).kind, "content");
});

test("A01: valid JSON that is not a planner is damaged, never empty", () => {
  for (const raw of ["null", "[]", '"x"', "42", "{}", "not json", '{"hats":[],"weeks":{},"currentWeek":5}', '{"hats":"x","weeks":{},"currentWeek":"w"}']) {
    assert.equal(classifyStored(raw).kind, "damaged", raw);
  }
  const bad = fresh() as unknown as { weeks: Record<string, { boxes: unknown }> };
  bad.weeks[Object.keys(bad.weeks)[0]].boxes = "oops";
  assert.equal(classifyStored(JSON.stringify(bad)).kind, "damaged");
});

test("A01: a planner carrying unknown extra data is content, not empty", () => {
  const extra = { ...fresh(), notes: "keep me" };
  assert.equal(classifyStored(JSON.stringify(extra)).kind, "content");
});
