import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, weekDays, type SpreadData } from "./model.ts";
import { suggestFreeTime } from "./free-time.ts";

function plan(): SpreadData {
  const d = defaultData();
  const week = d.weeks[d.currentWeek];
  week.allocations = [];
  return d;
}
const firstDay = (d: SpreadData) => weekDays(d.currentWeek).map((x) => x.date).sort()[0];
const lastDay = (d: SpreadData) => weekDays(d.currentWeek).map((x) => x.date).sort().at(-1) as string;

test("unplaced role hours become at most three suggestions, biggest first", () => {
  const d = plan();
  const week = d.weeks[d.currentWeek];
  week.boxes.forEach((b, i) => (b.hours = 2 + i));
  const result = suggestFreeTime(d, firstDay(d));
  assert.equal(result.kind, "suggestions");
  if (result.kind !== "suggestions") return;
  assert.ok(result.items.length <= 3);
  const left = result.items.map((i) => week.boxes.find((b) => b.hatId === i.hatId)!.hours);
  assert.deepEqual(left, [...left].sort((a, b) => b - a));
});

test("same plan and date always give the same answer", () => {
  const d = plan();
  d.weeks[d.currentWeek].boxes.forEach((b) => (b.hours = 3));
  assert.deepEqual(suggestFreeTime(d, firstDay(d)), suggestFreeTime(structuredClone(d), firstDay(d)));
});

test("it never suggests a day that has passed and spreads across lighter days", () => {
  const d = plan();
  d.weeks[d.currentWeek].boxes.forEach((b) => (b.hours = 4));
  const today = lastDay(d);
  const result = suggestFreeTime(d, today);
  assert.equal(result.kind, "suggestions");
  if (result.kind === "suggestions") assert.ok(result.items.every((i) => i.day >= today));
});

test("it abstains when there is nothing to place, nothing ahead, or no roles", () => {
  const d = plan();
  d.weeks[d.currentWeek].boxes.forEach((b) => (b.hours = 0));
  assert.deepEqual(suggestFreeTime(d, firstDay(d)), { kind: "none", reason: "all-placed" });
  d.weeks[d.currentWeek].boxes.forEach((b) => (b.hours = 2));
  assert.deepEqual(suggestFreeTime(d, "2999-01-01"), { kind: "none", reason: "week-over" });
  d.weeks[d.currentWeek].boxes = [];
  assert.deepEqual(suggestFreeTime(d, firstDay(d)), { kind: "none", reason: "no-roles" });
});

test("it does not change the plan it reads", () => {
  const d = plan();
  d.weeks[d.currentWeek].boxes.forEach((b) => (b.hours = 3));
  const before = JSON.stringify(d);
  suggestFreeTime(d, firstDay(d));
  assert.equal(JSON.stringify(d), before);
});
