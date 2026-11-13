import {
  plannedAllocations, recurrenceWeekOffset, recurringForRole, shiftWeek, validDayHours, validRecurringPlan,
  weekKey, parseKey, uid,
  type DayHours, type GeneratedDay, type RecurrenceSource, type RecurringPlan, type SpreadData, type WeekData,
} from "./model.ts";

/** Recurrence reserves weekly hours. A plan with fixed days also places those hours on their weekdays. Tasks never repeat. */
export type RecurringRequest = {
  roleId: string;
  startWeek: string;
  everyWeeks: number;
  hours: number;
  /** Optional fixed days. Their sum must equal `hours`. */
  dayHours?: DayHours[];
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
  /** Fixed days the schedule would place, Monday first. Absent when the schedule has no fixed days. */
  dayHours?: DayHours[];
};
type Marker = RecurrenceSource[string];
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
    // With fixed days, the weekly total is their sum, so the two can never disagree.
    hours: request.dayHours ? request.dayHours.reduce((sum, day) => sum + day.hours, 0) : request.hours,
    capacityHours: request.capacityHours ?? current?.capacityHours ??
      data.weeks[data.currentWeek]?.life?.capacityHours ?? NaN,
    ...(request.endWeek ? { endWeek: request.endWeek } : {}),
    ...(request.dayHours ? { dayHours: request.dayHours } : {}),
  };
}
export function previewRecurringPlan(data: Readonly<SpreadData>, request: RecurringRequest): RecurringPreview {
  if (request.dayHours && !validDayHours(request.dayHours, request.hours))
    return {
      eligible: false, roleId: request.roleId, hours: request.hours, startWeek: request.startWeek,
      everyWeeks: request.everyWeeks, nextOccurrences: [], preservedWeeks: [],
      reason: "Each set day needs one weekday and a positive half-hour amount, and the weekly total must equal their sum.",
    };
  const draft = candidate(data, request);
  const result: RecurringPreview = {
    eligible: false, roleId: request.roleId, hours: draft.hours,
    startWeek: draft.startWeek, endWeek: draft.endWeek,
    managedFromWeek: draft.managedFromWeek, everyWeeks: request.everyWeeks,
    nextOccurrences: [], preservedWeeks: [],
    ...(draft.dayHours ? { dayHours: draft.dayHours } : {}),
  };
  const reject = (reason: string) => ({ ...result, reason });
  if (!Number.isFinite(draft.capacityHours))
    return reject("Set this week's total hours on your Life card first, then plan ahead.");
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
    !untouchedWeek(data.weeks[week], data.hats) &&
    week !== data.currentWeek).sort();
  return {
    ...result, eligible: true, nextOccurrences, preservedWeeks,
    ...(draft.endWeek ? {
      occurrenceCount: Math.floor(recurrenceWeekOffset(draft.startWeek, draft.endWeek) / draft.everyWeeks) + 1,
    } : {}),
  };
}

/**
 * A week the person has not changed: default hours, no tasks, no placements, no life total,
 * and no rule has written to it. Opening a week stores it, so an untouched week must not
 * block a schedule created later.
 */
function untouchedWeek(week: WeekData, hats: SpreadData["hats"]): boolean {
  return Object.keys(week.recurrenceSource ?? {}).length === 0 && week.life === undefined &&
    week.allocations.length === 0 &&
    week.boxes.every((box) => box.tasks.length === 0 &&
      box.hours === (hats.find((hat) => hat.id === box.hatId)?.defaultHours ?? box.hours));
}

/** Drops untouched weeks from the plan's occurrence range so they are seeded from the plan again. */
function releaseUntouchedWeeks(data: SpreadData, plan: RecurringPlan): SpreadData["weeks"] {
  return Object.fromEntries(Object.entries(data.weeks).filter(([key, week]) =>
    !(key >= plan.startWeek && (!plan.endWeek || key <= plan.endWeek) && key !== data.currentWeek &&
      untouchedWeek(week, data.hats))));
}

/**
 * True while the only allocations on this responsibility are the placements the rule made
 * and no task is linked to them. Anything else means the person has edited that week.
 */
function generatedIntact(week: WeekData, hatId: string, marker: Marker): boolean {
  const generated = marker.generatedDays ?? [];
  const own = week.allocations.filter((item) => item.hatId === hatId);
  if (own.length !== generated.length) return false;
  const linked = new Set(week.boxes.find((box) => box.hatId === hatId)?.tasks
    .map((task) => task.allocationId).filter((id): id is string => !!id));
  return generated.every((entry) => {
    const item = own.find((candidateItem) => candidateItem.id === entry.id);
    return !!item && item.day === entry.day && item.hours === entry.hours && !linked.has(entry.id);
  });
}

/**
 * Reconcile only generated and still-unedited budgets. Days follow the plan only while untouched;
 * an edited week keeps its days and only its hours follow the existing rule.
 */
function reconcileGenerated(data: SpreadData, touched: Set<string>, fromWeek: string): SpreadData {
  let weeks = data.weeks;
  for (const [key, week] of Object.entries(data.weeks)) {
    if (key < fromWeek || !week.recurrenceSource) continue;
    let changed = false;
    let allocations = week.allocations;
    const recurrenceSource: RecurrenceSource = { ...week.recurrenceSource };
    const boxes = week.boxes.map((box) => {
      const marker = week.recurrenceSource?.[box.hatId];
      if (!marker || marker.manual || !touched.has(marker.planId)) return box;
      const next = recurringForRole(data, box.hatId, key);
      const hours = next?.hours ?? data.hats.find((h) => h.id === box.hatId)?.defaultHours ?? 0;
      let generatedDays: GeneratedDay[] | undefined = marker.generatedDays;
      if (generatedIntact(week, box.hatId, marker)) {
        const previous = new Set((marker.generatedDays ?? []).map((entry) => entry.id));
        const kept = allocations.filter((item) => !previous.has(item.id));
        const fresh = next && next.hours > 0 && next.plan.dayHours
          ? plannedAllocations(key, box.hatId, next.plan.dayHours, kept) : [];
        if (fresh.length || previous.size) changed = true;
        allocations = [...kept, ...fresh];
        generatedDays = fresh.length
          ? fresh.map(({ id, day, hours: amount }) => ({ id, day, hours: amount })) : undefined;
      }
      const nextMarker: Marker | undefined = next
        ? { planId: next.plan.id, generatedHours: next.hours, ...(generatedDays?.length ? { generatedDays } : {}) }
        : undefined;
      if (JSON.stringify(nextMarker) !== JSON.stringify(marker)) changed = true;
      if (nextMarker) recurrenceSource[box.hatId] = nextMarker;
      else delete recurrenceSource[box.hatId];
      const placed = allocations.filter((a) => a.hatId === box.hatId).reduce((v, a) => v + a.hours, 0);
      if (hours < placed) return box;
      if (box.hours !== hours) changed = true;
      return box.hours === hours ? box : { ...box, hours };
    });
    const sum = boxes.reduce((v, b) => v + b.hours, 0);
    const capacity = week.life?.capacityHours;
    if (!changed || (capacity !== undefined && sum > capacity)) continue;
    if (weeks === data.weeks) weeks = { ...weeks };
    weeks[key] = { ...week, boxes, allocations, recurrenceSource };
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
  const next = { ...data, recurringPlans: plans, weeks: releaseUntouchedWeeks(data, draft) };
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
