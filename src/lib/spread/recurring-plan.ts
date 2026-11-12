import {
  recurrenceWeekOffset, recurringForRole, shiftWeek, validRecurringPlan, weekKey, parseKey, uid,
  type RecurringPlan, type SpreadData, type WeekData,
} from "./model.ts";

/** All recurrence is explicit; it only reserves week-level hours. Tasks and days never repeat. */
export type RecurringRequest = {
  roleId: string;
  startWeek: string;
  everyWeeks: number;
  hours: number;
  endWeek?: string;
  capacityHours?: number;
  /** Edit entire series. If editFromWeek is set, split at that week instead. */
  planId?: string;
  editFromWeek?: string;
};
export type RecurringPreview = {
  eligible: boolean;
  reason?: string;
  roleId: string;
  hours: number;
  startWeek: string;
  everyWeeks: number;
  endWeek?: string;
  managedFromWeek?: string;
  nextOccurrences: string[];
  preservedWeeks: string[];
  /** A finite count; ongoing schedules are never generated indefinitely. */
  occurrenceCount?: number;
};
const validWeek = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) &&
  Number.isFinite(Date.parse(key + "T12:00:00Z")) && weekKey(parseKey(key)) === key;
const effectiveEnd = (p: RecurringPlan) =>
  p.terminatedWeek
    ? [p.endWeek ?? "9999-12-31", shiftWeek(p.terminatedWeek, -1)].sort()[0]
    : p.endWeek ?? "9999-12-31";
const rangeOverlaps = (a: RecurringPlan, b: RecurringPlan) =>
  a.roleId === b.roleId && a.startWeek <= effectiveEnd(b) &&
  b.startWeek <= effectiveEnd(a);
function candidate(data: Readonly<SpreadData>, request: RecurringRequest): RecurringPlan {
  const current = data.recurringPlans?.find((p) => p.id === request.planId);
  const firstWeek = request.editFromWeek ?? request.startWeek;
  const hasEarlierSeries = (data.recurringPlans ?? []).some((p) =>
    p.roleId === request.roleId && p.id !== request.planId && p.startWeek < firstWeek);
  return {
    id: request.editFromWeek ? "proposed-split" : request.planId ?? "proposed",
    roleId: request.roleId,
    startWeek: firstWeek,
    managedFromWeek: request.editFromWeek ?? current?.managedFromWeek ??
      (hasEarlierSeries ? firstWeek : shiftWeek(data.currentWeek, 1)),
    everyWeeks: request.everyWeeks,
    hours: request.hours,
    capacityHours: request.capacityHours ?? current?.capacityHours ??
      data.weeks[data.currentWeek]?.life?.capacityHours ?? NaN,
    ...(request.endWeek ? { endWeek: request.endWeek } : {}),
  };
}
export function previewRecurringPlan(data: Readonly<SpreadData>, request: RecurringRequest): RecurringPreview {
  const draft = candidate(data, request);
  const result: RecurringPreview = {
    eligible: false, roleId: request.roleId, hours: request.hours,
    startWeek: draft.startWeek, endWeek: draft.endWeek,
    managedFromWeek: draft.managedFromWeek, everyWeeks: request.everyWeeks,
    nextOccurrences: [], preservedWeeks: [],
  };
  const reject = (reason: string) => ({ ...result, reason });
  if (!validRecurringPlan(draft) || !data.hats.some((h) => h.id === draft.roleId))
    return reject("Choose a Life area, positive half-hour amount, valid Monday and weekly total.");
  const original = data.recurringPlans?.find((p) => p.id === request.planId);
  if (request.planId && !original) return reject("This repeating plan no longer exists.");
  if (original && original.roleId !== request.roleId) return reject("The Life area cannot change.");
  if (original?.terminatedWeek) return reject("This schedule has already been stopped.");
  if (request.editFromWeek && (!original || !validWeek(request.editFromWeek) ||
      request.editFromWeek <= original.startWeek ||
      (original.endWeek !== undefined && request.editFromWeek > original.endWeek)))
    return reject("Choose a later week within the current schedule.");
  if (!original && draft.startWeek <= data.currentWeek)
    return reject("Start in a future week. Existing current-week plans stay unchanged.");
  const others = (data.recurringPlans ?? []).filter((p) => p.id !== request.planId);
  if (others.some((p) => rangeOverlaps(p, draft))) return reject("This Life area already has a schedule over these dates.");
  // A split is non-overlapping because the old part ends the week before the new part.
  const plans = [...others, draft, ...(original && request.editFromWeek
    ? [{ ...original, endWeek: shiftWeek(request.editFromWeek, -1) }] : [])];
  if (!request.editFromWeek && original) {
    // The old plan was deliberately replaced in the candidate set.
  }
  // Validate every calendar phase over 104 weeks, not just the visible preview rows.
  for (let n = 0; n < 104; n += 1) {
    const week = shiftWeek(draft.startWeek, n);
    if (draft.endWeek && week > draft.endWeek) break;
    const hypothetical: SpreadData = { ...data, recurringPlans: plans };
    const effective = data.hats.map((hat) => recurringForRole(hypothetical, hat.id, week));
    const active = effective.filter((p) => p !== null);
    if (!active.length) continue;
    const caps = new Set(active.map((p) => p!.plan.capacityHours));
    if (caps.size !== 1) return reject("Repeating schedules use different weekly totals. Align the totals first.");
    const total = data.hats.reduce((sum, hat, i) => sum + (effective[i]?.hours ?? hat.defaultHours), 0);
    if (total > active[0]!.plan.capacityHours)
      return reject("The schedule exceeds weekly available time. Reduce hours or increase the weekly total.");
  }
  // For edits to long-running series, review the NEXT scheduled weeks, not old dates.
  const elapsed = Math.max(0, recurrenceWeekOffset(draft.startWeek, data.currentWeek));
  const firstIndex = Math.ceil(elapsed / draft.everyWeeks);
  const nextOccurrences: string[] = [];
  for (let n = firstIndex; n < firstIndex + 4; n += 1) {
    const week = shiftWeek(draft.startWeek, n * draft.everyWeeks);
    if (draft.endWeek && week > draft.endWeek) break;
    nextOccurrences.push(week);
  }
  const preservedWeeks = Object.keys(data.weeks).filter((week) =>
    week >= (draft.managedFromWeek ?? draft.startWeek) && (!draft.endWeek || week <= draft.endWeek) &&
    !data.weeks[week].recurrenceSource?.[draft.roleId] &&
    week !== data.currentWeek).sort();
  return {
    ...result, eligible: true, nextOccurrences, preservedWeeks,
    ...(draft.endWeek ? {
      occurrenceCount: Math.floor(recurrenceWeekOffset(draft.startWeek, draft.endWeek) / draft.everyWeeks) + 1,
    } : {}),
  };
}

/** Reconcile only generated and still-unedited budgets. Never alter linked tasks or allocations. */
function reconcileGenerated(data: SpreadData, touched: Set<string>, fromWeek: string): SpreadData {
  let weeks = data.weeks;
  for (const [key, week] of Object.entries(data.weeks)) {
    if (key < fromWeek || !week.recurrenceSource) continue;
    let changed = false;
    const boxes = week.boxes.map((box) => {
      const marker = week.recurrenceSource?.[box.hatId];
      if (!marker || marker.manual || !touched.has(marker.planId)) return box;
      const next = recurringForRole(data, box.hatId, key);
      const hours = next?.hours ?? data.hats.find((h) => h.id === box.hatId)?.defaultHours ?? 0;
      const placed = week.allocations.filter((a) => a.hatId === box.hatId).reduce((v, a) => v + a.hours, 0);
      if (hours < placed) return box;
      changed = changed || box.hours !== hours ||
        (next !== null && (marker.planId !== next.plan.id || marker.generatedHours !== next.hours));
      return { ...box, hours };
    });
    const sum = boxes.reduce((v, b) => v + b.hours, 0);
    const capacity = week.life?.capacityHours;
    if (!changed || (capacity !== undefined && sum > capacity)) continue;
    const recurrenceSource = { ...week.recurrenceSource };
    for (const box of boxes) {
      const mark = recurrenceSource[box.hatId];
      if (!mark || mark.manual || !touched.has(mark.planId)) continue;
      const next = recurringForRole(data, box.hatId, key);
      if (next) recurrenceSource[box.hatId] = { planId: next.plan.id, generatedHours: next.hours };
      else delete recurrenceSource[box.hatId];
    }
    if (weeks === data.weeks) weeks = { ...weeks };
    weeks[key] = { ...week, boxes, recurrenceSource };
  }
  return weeks === data.weeks ? data : { ...data, weeks };
}

/** Pure calculation. Store owns the atomic write and the Undo receipt. */
export function applyRecurringPlan(data: SpreadData, request: RecurringRequest):
  { data: SpreadData; preview: RecurringPreview } {
  const preview = previewRecurringPlan(data, request);
  if (!preview.eligible) return { data, preview };
  const original = data.recurringPlans?.find((p) => p.id === request.planId);
  const draft = candidate(data, request);
  draft.id = request.editFromWeek ? uid() : request.planId ?? uid();
  let plans = (data.recurringPlans ?? []).filter((p) => p.id !== request.planId);
  if (original && request.editFromWeek)
    plans = [...plans, { ...original, endWeek: shiftWeek(request.editFromWeek, -1) }];
  plans = [...plans, draft];
  const next = { ...data, recurringPlans: plans };
  return {
    data: original ? reconcileGenerated(next, new Set([original.id]), request.editFromWeek ?? draft.startWeek) : next,
    preview,
  };
}
export function stopRecurringPlan(data: SpreadData, planId: string, fromWeek: string): SpreadData | null {
  const plan = data.recurringPlans?.find((p) => p.id === planId);
  if (!plan || !validWeek(fromWeek) || fromWeek < plan.startWeek ||
      (plan.endWeek !== undefined && fromWeek > plan.endWeek) || plan.terminatedWeek) return null;
  const recurringPlans = data.recurringPlans!.map((p) =>
    p.id === planId ? { ...p, terminatedWeek: fromWeek } : p);
  const next: SpreadData = { ...data, recurringPlans };
  return reconcileGenerated(next, new Set([planId]), fromWeek);
}
