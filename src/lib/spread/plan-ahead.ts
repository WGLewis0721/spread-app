import {
  ensureWeek, isoDate, parseKey, uid, weekKey,
  type Allocation, type SpreadData, type Task, type WeekData,
} from "./model.ts";

/** Explicit, previewable transfer between two calendar weeks. Nothing rolls over automatically. */
export type PlanAheadRequest = {
  roleId: string;
  toDay: string;
  hours: number;
  /** Omit to move unplaced weekly budget hours. Include to transfer reserved daily hours. */
  fromDay?: string;
  /** Required only when the target week has no known capacity. */
  targetCapacityHours?: number;
};

export type PlanAheadPreview = {
  sourceWeek: string;
  targetWeek: string;
  roleId: string;
  hours: number;
  kind: "weekly" | "daily";
  sourceBudgetBefore: number;
  sourceBudgetAfter: number;
  targetBudgetBefore: number;
  targetBudgetAfter: number;
  targetCapacityHours: number | null;
  movedTasks: number;
  eligible: boolean;
  reason?: string;
};
export type PlanAheadResult = { preview: PlanAheadPreview; data: SpreadData };

const validHalfHours = (n: number) =>
  Number.isFinite(n) && n >= 0 && n <= 168 && Number.isInteger(n * 2);
const validDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  isoDate(parseKey(value)) === value;

/** Pure preview: never mutates the user's original profile or changes its open week. */
export function planAheadTransfer(data: SpreadData, request: PlanAheadRequest): PlanAheadResult {
  const sourceWeek = data.currentWeek;
  const targetWeek = validDay(request.toDay) ? weekKey(parseKey(request.toDay)) : "";
  const initialSource = data.weeks[sourceWeek];
  const sourceBox = initialSource?.boxes.find((box) => box.hatId === request.roleId);
  const targetExisting = data.weeks[targetWeek];
  const targetBefore = targetExisting?.boxes.find((box) => box.hatId === request.roleId)?.hours
    ?? data.hats.find((hat) => hat.id === request.roleId)?.defaultHours ?? 0;
  const sourceBefore = sourceBox?.hours ?? 0;
  const initialPreview: PlanAheadPreview = {
    sourceWeek, targetWeek, roleId: request.roleId, hours: request.hours,
    kind: request.fromDay ? "daily" : "weekly",
    sourceBudgetBefore: sourceBefore, sourceBudgetAfter: sourceBefore - request.hours,
    targetBudgetBefore: targetBefore, targetBudgetAfter: targetBefore + request.hours,
    targetCapacityHours: targetExisting?.life?.capacityHours ?? request.targetCapacityHours ?? null,
    movedTasks: 0, eligible: false,
  };
  const reject = (reason: string): PlanAheadResult => ({
    data, preview: { ...initialPreview, reason },
  });
  if (!sourceBox || !data.hats.some((hat) => hat.id === request.roleId)) return reject("Life area not found in this week.");
  if (!validDay(request.toDay) || (request.fromDay && !validDay(request.fromDay))) return reject("Choose a valid calendar date.");
  if (targetWeek <= sourceWeek) return reject("Choose a future week.");
  if (!validHalfHours(request.hours) || request.hours <= 0) return reject("Choose at least half an hour.");
  if (request.fromDay && weekKey(parseKey(request.fromDay)) !== sourceWeek)
    return reject("The source day must belong to the open week.");
  if (sourceBox.hours < request.hours) return reject("The source has fewer hours than requested.");

  // Creating a future week uses the planner's normal week construction, never
  // invents a weekly capacity, and restores the user's open source week.
  const withDestination = ensureWeek({ ...data, currentWeek: targetWeek });
  const source = withDestination.weeks[sourceWeek];
  const target = withDestination.weeks[targetWeek];
  const targetBox = target.boxes.find((box) => box.hatId === request.roleId);
  if (!targetBox) return reject("Life area not found in the destination.");
  if (target.life && target.life.version !== 1)
    return reject("This future week uses a newer planning format.");
  const capacity = request.targetCapacityHours ?? target.life?.capacityHours;
  if (capacity === undefined) return reject("Set the destination week's planning hours first.");
  if (!validHalfHours(capacity)) return reject("Destination weekly hours must be valid half-hour steps.");
  if (target.life?.capacityHours !== undefined && request.targetCapacityHours !== undefined &&
      request.targetCapacityHours < target.life.capacityHours)
    return reject("Do not silently shrink the destination's weekly hours.");
  const targetAssigned = target.boxes.reduce((sum, box) => sum + box.hours, 0);
  if (targetAssigned + request.hours > capacity)
    return reject("Not enough free hours in the destination week.");

  let sourceAllocation: Allocation | undefined;
  let movingTasks: Task[] = [];
  let sourceAllocations = source.allocations;
  let targetAllocations = target.allocations;
  let sourceDayTaskOrder = source.dayTaskOrder;
  let targetDayTaskOrder = target.dayTaskOrder;
  const sourceReserved = source.allocations
    .filter((item) => item.hatId === request.roleId)
    .reduce((sum, item) => sum + item.hours, 0);
  if (request.fromDay) {
    sourceAllocation = source.allocations.find((item) =>
      item.hatId === request.roleId && item.day === request.fromDay);
    if (!sourceAllocation || sourceAllocation.hours < request.hours)
      return reject("The source day does not have that many hours.");
  }
  const reservedAfter = sourceReserved - (request.fromDay ? request.hours : 0);
  if (sourceBox.hours - request.hours < reservedAfter)
    return reject("Those hours are already scheduled on other days.");

  if (sourceAllocation) {
    const full = sourceAllocation.hours === request.hours;
    movingTasks = full ? sourceBox.tasks.filter((task) =>
      task.allocationId === sourceAllocation!.id) : [];
    sourceAllocations = full
      ? source.allocations.filter((item) => item.id !== sourceAllocation!.id)
      : source.allocations.map((item) =>
        item.id === sourceAllocation!.id ? { ...item, hours: item.hours - request.hours } : item);
    const existing = target.allocations.find((item) =>
      item.hatId === request.roleId && item.day === request.toDay);
    const destinationId = existing?.id ?? uid();
    targetAllocations = existing
      ? target.allocations.map((item) =>
        item.id === existing.id ? { ...item, hours: item.hours + request.hours } : item)
      : [...target.allocations, {
          id: destinationId, hatId: request.roleId, day: request.toDay, hours: request.hours,
          order: target.allocations.filter((item) => item.day === request.toDay).length,
        }];
    if (movingTasks.length) {
      const movedIds = new Set(movingTasks.map((task) => task.id));
      if (target.boxes.some((box) => box.tasks.some((task) => movedIds.has(task.id))))
        return reject("Destination already contains one of these tasks.");
      if (sourceDayTaskOrder) {
        sourceDayTaskOrder = Object.fromEntries(Object.entries(sourceDayTaskOrder)
          .map(([day, ids]) => [day, ids.filter((id) => !movedIds.has(id))]));
      }
      targetDayTaskOrder = {
        ...(targetDayTaskOrder ?? {}),
        [request.toDay]: [
          ...(targetDayTaskOrder?.[request.toDay] ?? []),
          ...movingTasks.map((task) => task.id),
        ],
      };
      movingTasks = movingTasks.map((task) => ({ ...task, allocationId: destinationId }));
    }
  }

  const sourceBoxes = source.boxes.map((box) => box.hatId === request.roleId ? {
    ...box, hours: box.hours - request.hours,
    tasks: box.tasks.filter((task) => !movingTasks.some((moved) => moved.id === task.id)),
  } : box);
  const targetBoxes = target.boxes.map((box) => box.hatId === request.roleId ? {
    ...box, hours: box.hours + request.hours, tasks: [...box.tasks, ...movingTasks],
  } : box);
  const nextSource: WeekData = {
    ...source, boxes: sourceBoxes, allocations: sourceAllocations,
    ...(sourceDayTaskOrder ? { dayTaskOrder: sourceDayTaskOrder } : {}),
  };
  const nextTarget: WeekData = {
    ...target, boxes: targetBoxes, allocations: targetAllocations,
    ...(targetDayTaskOrder ? { dayTaskOrder: targetDayTaskOrder } : {}),
    life: { ...target.life, version: 1, capacityHours: capacity },
  };
  return {
    data: {
      ...withDestination,
      currentWeek: sourceWeek,
      weeks: { ...withDestination.weeks, [sourceWeek]: nextSource, [targetWeek]: nextTarget },
    },
    preview: {
      ...initialPreview, targetCapacityHours: capacity, movedTasks: movingTasks.length,
      eligible: true,
    },
  };
}
