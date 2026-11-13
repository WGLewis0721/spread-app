import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, ensureWeek, normalizeData, planDayIso, shiftWeek, type DayHours, type WeekData } from "./model.ts";
import { applyRecurringPlan, previewRecurringPlan, stopRecurringPlan, type RecurringRequest } from "./recurring-plan.ts";

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
test("set days place each weekday in occurrence weeks, and the budget equals their sum", () => {
  const { data, gym, first } = make();
  const { data: saved, preview } = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 2, hours: 3,
    dayHours: [{ weekday: "wed", hours: 1 }, { weekday: "mon", hours: 2 }] });
  assert.equal(preview.eligible, true);
  const week = ensureWeek({ ...saved, currentWeek: first }).weeks[first];
  assert.equal(week.boxes.find((b) => b.hatId === gym)?.hours, 3);
  assert.deepEqual(week.allocations.map((a) => [a.day, a.hours]),
    [[planDayIso(first, "mon"), 2], [planDayIso(first, "wed"), 1]]);
  assert.deepEqual(week.recurrenceSource?.[gym]?.generatedDays?.map((g) => g.day),
    [planDayIso(first, "mon"), planDayIso(first, "wed")]);
});
test("set days are placed only in occurrence weeks", () => {
  const { data, gym, first } = make();
  const { data: saved } = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 2, hours: 1,
    dayHours: [{ weekday: "tue", hours: 1 }] });
  const off = shiftWeek(first, 1);
  const week = ensureWeek({ ...saved, currentWeek: off }).weeks[off];
  assert.equal(week.boxes.find((b) => b.hatId === gym)?.hours, 0);
  assert.equal(week.allocations.length, 0);
});
test("changing set days reconciles an untouched generated week", () => {
  const { data, gym, first } = make();
  const created = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 2,
    dayHours: [{ weekday: "mon", hours: 1 }, { weekday: "wed", hours: 1 }] }).data;
  const planId = created.recurringPlans![0].id;
  const ready = ensureWeek({ ...created, currentWeek: first });
  const edited = applyRecurringPlan(ready, { roleId: gym, planId, startWeek: first, everyWeeks: 1, hours: 2,
    dayHours: [{ weekday: "fri", hours: 2 }] });
  assert.equal(edited.preview.eligible, true);
  const after = edited.data.weeks[first];
  assert.equal(after.boxes.find((b) => b.hatId === gym)?.hours, 2);
  assert.deepEqual(after.allocations.map((a) => [a.day, a.hours]), [[planDayIso(first, "fri"), 2]]);
  assert.deepEqual(after.recurrenceSource?.[gym]?.generatedDays?.map((g) => g.day), [planDayIso(first, "fri")]);
});
test("an edited generated week keeps its placed days when the set days change", () => {
  const { data, gym, first } = make();
  const created = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 2,
    dayHours: [{ weekday: "mon", hours: 1 }, { weekday: "wed", hours: 1 }] }).data;
  const planId = created.recurringPlans![0].id;
  const ready = ensureWeek({ ...created, currentWeek: first });
  const week = ready.weeks[first];
  const moved = { ...week, allocations: week.allocations.map((a, i) => (i === 0 ? { ...a, hours: 0.5 } : a)) };
  const edited = applyRecurringPlan({ ...ready, weeks: { ...ready.weeks, [first]: moved } }, {
    roleId: gym, planId, startWeek: first, everyWeeks: 1, hours: 2, dayHours: [{ weekday: "fri", hours: 2 }],
  });
  assert.equal(edited.preview.eligible, true);
  assert.deepEqual(edited.data.weeks[first].allocations, moved.allocations);
});
test("a task linked to a generated day keeps that placement", () => {
  const { data, gym, first } = make();
  const created = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 2,
    dayHours: [{ weekday: "mon", hours: 1 }, { weekday: "wed", hours: 1 }] }).data;
  const planId = created.recurringPlans![0].id;
  const week = ensureWeek({ ...created, currentWeek: first }).weeks[first];
  const linked = { ...week, boxes: week.boxes.map((b) => b.hatId === gym
    ? { ...b, tasks: [{ id: "t1", text: "Session", done: false, allocationId: week.allocations[0].id }] } : b) };
  const edited = applyRecurringPlan({ ...created, currentWeek: first, weeks: { ...created.weeks, [first]: linked } }, {
    roleId: gym, planId, startWeek: first, everyWeeks: 1, hours: 2, dayHours: [{ weekday: "fri", hours: 2 }],
  });
  assert.equal(edited.data.weeks[first].allocations.length, 2);
  assert.deepEqual(edited.data.weeks[first].allocations, linked.allocations);
});
test("removing set days clears untouched placements and keeps the weekly hours", () => {
  const { data, gym, first } = make();
  const created = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 2,
    dayHours: [{ weekday: "mon", hours: 1 }, { weekday: "wed", hours: 1 }] }).data;
  const planId = created.recurringPlans![0].id;
  const ready = ensureWeek({ ...created, currentWeek: first });
  const weekly = applyRecurringPlan(ready, { roleId: gym, planId, startWeek: first, everyWeeks: 1, hours: 2 });
  assert.equal(weekly.data.recurringPlans![0].dayHours, undefined);
  assert.equal(weekly.data.weeks[first].allocations.length, 0);
  assert.equal(weekly.data.weeks[first].boxes.find((b) => b.hatId === gym)?.hours, 2);
});
test("stopping a schedule clears untouched placements from the stop week", () => {
  const { data, gym, first } = make();
  const created = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 2,
    dayHours: [{ weekday: "mon", hours: 1 }, { weekday: "wed", hours: 1 }] }).data;
  const planId = created.recurringPlans![0].id;
  const stopped = stopRecurringPlan(ensureWeek({ ...created, currentWeek: first }), planId, first);
  assert.ok(stopped);
  assert.equal(stopped.weeks[first].allocations.length, 0);
  assert.equal(stopped.weeks[first].boxes.find((b) => b.hatId === gym)?.hours, 0);
});
test("invalid set days are refused and write nothing", () => {
  const { data, gym, first } = make();
  const bad: RecurringRequest[] = [
    { roleId: gym, startWeek: first, everyWeeks: 1, hours: 2, dayHours: [{ weekday: "mon", hours: 1 }, { weekday: "mon", hours: 1 }] },
    { roleId: gym, startWeek: first, everyWeeks: 1, hours: 3, dayHours: [{ weekday: "mon", hours: 1 }] },
    { roleId: gym, startWeek: first, everyWeeks: 1, hours: 1.25, dayHours: [{ weekday: "mon", hours: 1.25 }] },
    { roleId: gym, startWeek: first, everyWeeks: 1, hours: 0, dayHours: [] },
  ];
  for (const request of bad) {
    const result = applyRecurringPlan(data, request);
    assert.equal(result.preview.eligible, false);
    assert.equal(result.data, data);
  }
});
test("saved set days survive a reload, and invalid days keep the weekly hours", () => {
  const { data, gym, first } = make();
  const created = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 2,
    dayHours: [{ weekday: "tue", hours: 1 }, { weekday: "thu", hours: 1 }] }).data;
  const ready = ensureWeek({ ...created, currentWeek: first });
  const restored = normalizeData(JSON.parse(JSON.stringify(ready)));
  assert.deepEqual(restored.recurringPlans?.[0].dayHours, created.recurringPlans![0].dayHours);
  assert.deepEqual(restored.weeks[first].recurrenceSource?.[gym]?.generatedDays,
    ready.weeks[first].recurrenceSource?.[gym]?.generatedDays);
  const broken = JSON.parse(JSON.stringify(created));
  broken.recurringPlans[0].dayHours = [{ weekday: "mon", hours: 1 }];
  const kept = normalizeData(broken);
  assert.equal(kept.recurringPlans?.length, 1);
  assert.equal(kept.recurringPlans?.[0].dayHours, undefined);
  assert.equal(kept.recurringPlans?.[0].hours, 2);
});
test("a week opened before the schedule was created still takes its fixed days", () => {
  const { data, gym, first } = make();
  // Opening the week stores it, then the person returns to the current week to create the schedule.
  const opened = { ...ensureWeek({ ...data, currentWeek: first }), currentWeek: data.currentWeek };
  assert.equal(opened.weeks[first].allocations.length, 0);
  const { data: saved, preview } = applyRecurringPlan(opened, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 3,
    dayHours: [{ weekday: "tue", hours: 1 }, { weekday: "thu", hours: 1 }, { weekday: "sat", hours: 1 }] });
  assert.equal(preview.eligible, true);
  assert.equal(preview.preservedWeeks.includes(first), false);
  const seen = ensureWeek({ ...saved, currentWeek: first });
  assert.deepEqual(seen.weeks[first].allocations.map((a) => [a.day, a.hours]),
    [[planDayIso(first, "tue"), 1], [planDayIso(first, "thu"), 1], [planDayIso(first, "sat"), 1]]);
  assert.equal(seen.weeks[first].boxes.find((b) => b.hatId === gym)?.hours, 3);
});
test("a week the person changed keeps its contents when a schedule is created", () => {
  const { data, gym, first } = make();
  const edited = { ...ensureWeek({ ...data, currentWeek: first }), currentWeek: data.currentWeek };
  edited.weeks[first] = { ...edited.weeks[first],
    boxes: edited.weeks[first].boxes.map((b) => (b.hatId === gym ? { ...b, hours: 5 } : b)) };
  const { data: saved, preview } = applyRecurringPlan(edited, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 2 });
  assert.equal(preview.eligible, true);
  assert.equal(preview.preservedWeeks.includes(first), true);
  assert.equal(saved.weeks[first].boxes.find((b) => b.hatId === gym)?.hours, 5);
});
test("a schedule without a weekly life total says where to set one", () => {
  const data = defaultData();
  const gym = data.hats[0].id;
  delete data.weeks[data.currentWeek].life;
  const preview = previewRecurringPlan(data, { roleId: gym, startWeek: shiftWeek(data.currentWeek, 1), everyWeeks: 1, hours: 2 });
  assert.equal(preview.eligible, false);
  assert.match(preview.reason ?? "", /Life card/);
});

// A week opened before its schedule existed is stored empty. An earlier build left such weeks behind.
const emptyStoredWeek = (data: ReturnType<typeof defaultData>): WeekData =>
  ({ boxes: data.hats.map((hat) => ({ hatId: hat.id, hours: hat.defaultHours, tasks: [] })), allocations: [] });
const tueThu = (hours: number): DayHours[] => [{ weekday: "tue", hours }, { weekday: "thu", hours }];

test("a week stored empty before its schedule existed is filled when it is opened", () => {
  const { data, gym, first } = make();
  const saved = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 3, dayHours: tueThu(1.5) }).data;
  saved.weeks[first] = emptyStoredWeek(saved);
  const week = ensureWeek({ ...saved, currentWeek: first }).weeks[first];
  assert.equal(week.boxes.find((box) => box.hatId === gym)?.hours, 3);
  assert.deepEqual(week.allocations.map((item) => item.day).sort(), [planDayIso(first, "tue"), planDayIso(first, "thu")]);
});

test("saving a schedule from its own first week fills that week at once", () => {
  const { data, gym, first } = make();
  let saved = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 3, dayHours: tueThu(1.5) }).data;
  const planId = saved.recurringPlans![0].id;
  // The person stands on the schedule's first week, which an earlier build left empty, and saves a change.
  saved = { ...saved, currentWeek: first, weeks: { ...saved.weeks, [first]: emptyStoredWeek(saved) } };
  const edited = applyRecurringPlan(saved, { planId, roleId: gym, startWeek: first, everyWeeks: 1, hours: 4, dayHours: tueThu(2) });
  assert.equal(edited.preview.eligible, true);
  const week = edited.data.weeks[first];
  assert.equal(week.boxes.find((box) => box.hatId === gym)?.hours, 4);
  assert.deepEqual(week.allocations.map((item) => `${item.day}:${item.hours}`).sort(),
    [`${planDayIso(first, "tue")}:2`, `${planDayIso(first, "thu")}:2`]);
});

test("a week the person changed is not refilled when it is opened", () => {
  const { data, gym, first } = make();
  const saved = applyRecurringPlan(data, { roleId: gym, startWeek: first, everyWeeks: 1, hours: 3, dayHours: tueThu(1.5) }).data;
  saved.weeks[first] = { boxes: saved.hats.map((hat) => ({ hatId: hat.id, hours: 5, tasks: [] })), allocations: [] };
  const week = ensureWeek({ ...saved, currentWeek: first }).weeks[first];
  assert.deepEqual(week, saved.weeks[first]);
});
