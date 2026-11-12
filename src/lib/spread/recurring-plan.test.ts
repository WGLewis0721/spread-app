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
  assert.equal(stopped!.recurringPlans?.[0].terminatedWeek, first);
  assert.equal(stopped!.weeks[first].allocations[0].id, "kept");
  const after = ensureWeek({ ...stopped!, currentWeek: shiftWeek(end, 1) });
  assert.equal(after.weeks[shiftWeek(end, 1)].boxes.find((b) => b.hatId === gym)?.hours, 0);
});

test("an ended schedule never restarts old default hours in later weeks", () => {
  const { data, gym, first } = make();
  const end = shiftWeek(first, 2);
  data.hats.find((h) => h.id === gym)!.defaultHours = 6;
  const saved = applyRecurringPlan(data, {
    roleId: gym, startWeek: first, everyWeeks: 2, hours: 2,
    endWeek: end, capacityHours: 140,
  });
  assert.equal(saved.preview.eligible, true);
  const later = shiftWeek(end, 1);
  const next = ensureWeek({ ...saved.data, currentWeek: later });
  assert.equal(next.weeks[later].boxes.find((b) => b.hatId === gym)?.hours, 0);
  assert.equal(next.weeks[later].life?.capacityHours, 140);
});
test("stop from the first week persists as a tombstone and can be followed by a new series", () => {
  const { data, gym, first } = make();
  data.hats.find((h) => h.id === gym)!.defaultHours = 6;
  const saved = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 2,
    hours: 2, capacityHours: 140 });
  const planId = saved.data.recurringPlans![0].id;
  const stopped = stopRecurringPlan(saved.data, planId, first)!;
  assert.equal(stopped.recurringPlans![0].terminatedWeek, first);
  assert.equal(normalizeData(stopped).recurringPlans![0].terminatedWeek, first);
  const later = ensureWeek({ ...stopped, currentWeek: shiftWeek(first, 3) });
  assert.equal(later.weeks[later.currentWeek].boxes.find((b) => b.hatId === gym)?.hours, 0);
  const restarted = applyRecurringPlan(stopped, {
    roleId: gym, startWeek: shiftWeek(first, 4), everyWeeks: 1, hours: 1, capacityHours: 140,
  });
  assert.equal(restarted.preview.eligible, true);
  const newWeek = ensureWeek({ ...restarted.data, currentWeek: shiftWeek(first, 4) });
  assert.equal(newWeek.weeks[newWeek.currentWeek].boxes.find((b) => b.hatId === gym)?.hours, 1);
});

test("a later first occurrence clears the inherited default in the intervening week", () => {
  const { data, service, first } = make();
  data.hats.find((h) => h.id === service)!.defaultHours = 4;
  const serviceFirst = shiftWeek(first, 1);
  const result = applyRecurringPlan(data, {
    roleId: service, startWeek: serviceFirst, everyWeeks: 2, hours: 2, capacityHours: 140,
  });
  assert.equal(result.preview.eligible, true);
  assert.equal(result.preview.managedFromWeek, first);
  const weekA = ensureWeek({ ...result.data, currentWeek: first });
  assert.equal(weekA.weeks[first].boxes.find((b) => b.hatId === service)?.hours, 0);
  const weekB = ensureWeek({ ...weekA, currentWeek: serviceFirst });
  assert.equal(weekB.weeks[serviceFirst].boxes.find((b) => b.hatId === service)?.hours, 2);
});

test("editing a series updates only untouched generated weeks and keeps manual exceptions", () => {
  const { data, gym, first } = make();
  const created = applyRecurringPlan(data, { roleId: gym, startWeek: first,
    everyWeeks: 2, hours: 2, capacityHours: 140 });
  const ruleId = created.data.recurringPlans![0].id;
  let next = ensureWeek({ ...created.data, currentWeek: first });
  const later = shiftWeek(first, 2);
  next = ensureWeek({ ...next, currentWeek: later });
  next.weeks[later].boxes.find((b) => b.hatId === gym)!.hours = 4;
  next.weeks[later].recurrenceSource![gym].manual = true;
  const modified = applyRecurringPlan(next, { roleId: gym, planId: ruleId,
    startWeek: first, everyWeeks: 2, hours: 3, capacityHours: 140 });
  assert.equal(modified.preview.eligible, true);
  assert.equal(modified.data.weeks[first].boxes.find((b) => b.hatId === gym)?.hours, 3);
  assert.equal(modified.data.weeks[later].boxes.find((b) => b.hatId === gym)?.hours, 4);
  assert.equal(modified.data.weeks[later].recurrenceSource?.[gym]?.manual, true);
});
test("splitting a schedule reassigns provenance even if generated hours are unchanged", () => {
  const { data, gym, first } = make();
  let next = applyRecurringPlan(data, { roleId: gym, startWeek: first,
    everyWeeks: 2, hours: 2, capacityHours: 140 }).data;
  const oldId = next.recurringPlans![0].id;
  const split = shiftWeek(first, 2);
  next = ensureWeek({ ...next, currentWeek: split });
  const modified = applyRecurringPlan(next, {
    roleId: gym, planId: oldId, startWeek: first, editFromWeek: split,
    everyWeeks: 2, hours: 2, capacityHours: 140,
  });
  assert.equal(modified.preview.eligible, true);
  assert.equal(modified.data.recurringPlans?.length, 2);
  assert.notEqual(modified.data.weeks[split].recurrenceSource?.[gym]?.planId, oldId);
  assert.equal(modified.data.weeks[split].boxes.find((b) => b.hatId === gym)?.hours, 2);
});
