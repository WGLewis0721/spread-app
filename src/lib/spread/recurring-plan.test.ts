import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, ensureWeek, normalizeData, shiftWeek } from "./model.ts";
import { applyRecurringPlan, previewRecurringPlan, stopRecurringPlan } from "./recurring-plan.ts";

function make() {
  const data = defaultData();
  const gym = data.hats[0].id, service = data.hats[1].id;
  data.weeks[data.currentWeek].life = { version: 1, capacityHours: 140 };
  data.hats.forEach((h) => { h.defaultHours = 0; });
  data.weeks[data.currentWeek].boxes.forEach((b) => { b.hours = 0; });
  return { data, gym, service, first: shiftWeek(data.currentWeek, 1) };
}
test("two independent schedules alternate and never duplicate tasks", () => {
  const { data, gym, service, first } = make();
  const a = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 2, hours: 2 });
  assert.equal(a.preview.eligible, true);
  const b = applyRecurringPlan(a.data, { roleId: service, startWeek: shiftWeek(first, 1), everyWeeks: 2, hours: 2 });
  assert.equal(b.preview.eligible, true);
  let next = b.data;
  for (let n = 0; n < 8; n++) {
    const key = shiftWeek(first, n);
    next = ensureWeek({ ...next, currentWeek: key });
    const week = next.weeks[key];
    assert.equal(week.boxes.find((x) => x.hatId === gym)?.hours, n % 2 === 0 ? 2 : 0);
    assert.equal(week.boxes.find((x) => x.hatId === service)?.hours, n % 2 === 1 ? 2 : 0);
    assert.equal(week.boxes.flatMap((x) => x.tasks).length, 0);
    assert.equal(week.allocations.length, 0);
  }
  const restored = normalizeData(next);
  assert.equal(restored.recurringPlans?.length, 2);
  assert.deepEqual(restored.weeks[shiftWeek(first, 1)].recurrenceSource, next.weeks[shiftWeek(first, 1)].recurrenceSource);
});
test("ongoing rule is one record, not an infinite set of future weeks", () => {
  const { data, gym, first } = make();
  const { data: saved, preview } = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 2, hours: 2 });
  assert.equal(preview.nextOccurrences.length, 4);
  assert.equal(preview.occurrenceCount, undefined);
  assert.equal(Object.keys(saved.weeks).length, 1);
});
test("existing weeks are disclosed and never overwritten", () => {
  const { data, gym, first } = make();
  const existing = shiftWeek(first, 2);
  data.weeks[existing] = { boxes: data.hats.map((h) => ({ hatId: h.id, hours: 3, tasks: [] })), allocations: [] };
  const { data: next, preview } = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 2, hours: 2 });
  assert.deepEqual(preview.preservedWeeks, [existing]);
  assert.deepEqual(next.weeks[existing], data.weeks[existing]);
});
test("invalid intervals, overlap, dates and over-capacity never write", () => {
  const { data, gym, first } = make();
  const requests = [
    { roleId: gym, startWeek: first, everyWeeks: 0, hours: 2 },
    { roleId: gym, startWeek: first, everyWeeks: 2, hours: 2.25 },
    { roleId: gym, startWeek: "2026-11-17", everyWeeks: 2, hours: 2 },
    { roleId: gym, startWeek: first, everyWeeks: 2, hours: 150 },
    { roleId: gym, startWeek: first, everyWeeks: 2, hours: 2, capacityHours: 1 },
  ];
  for (const request of requests) {
    const result = applyRecurringPlan(data, request);
    assert.equal(result.preview.eligible, false);
    assert.strictEqual(result.data, data);
  }
  const accepted = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 2, hours: 2 });
  const overlap = previewRecurringPlan(accepted.data, { roleId: gym, startWeek: shiftWeek(first, 2), everyWeeks: 2, hours: 2 });
  assert.equal(overlap.eligible, false);
});
test("finite range stops on its end week and a stop leaves existing manual work intact", () => {
  const { data, gym, first } = make();
  const end = shiftWeek(first, 4);
  let next = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 2, hours: 2, endWeek: end }).data;
  next = ensureWeek({ ...next, currentWeek: first });
  const week = next.weeks[first];
  week.allocations.push({ id: "kept", hatId: gym, day: first, hours: 1, order: 0 });
  const stopped = stopRecurringPlan(next, next.recurringPlans![0].id, first);
  assert.ok(stopped);
  assert.equal(stopped!.recurringPlans?.length, 0);
  assert.equal(stopped!.weeks[first].allocations[0].id, "kept");
  const after = ensureWeek({ ...stopped!, currentWeek: shiftWeek(end, 1) });
  assert.equal(after.weeks[shiftWeek(end, 1)].boxes.find((b) => b.hatId === gym)?.hours, 0);
});
