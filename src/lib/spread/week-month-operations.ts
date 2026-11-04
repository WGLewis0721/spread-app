import {
  ensureWeek, weekKey, type DeletedTask, type SpreadData, type Task, type WeekData,
} from "./model.ts";

/**
 * Pure planner transformations for the owner-approved Week/Month experience.
 * The Zustand store is still the only writer. No network or Swift-only shadow database.
 */
export const DELETED_TASK_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function activeDeletedTasks(data: Readonly<SpreadData>, now = Date.now()): DeletedTask[] {
  return (data.deletedTasks ?? [])
    .filter((item) => Number.isFinite(item.deletedAt) && item.deletedAt <= now
      && now - item.deletedAt < DELETED_TASK_RETENTION_MS)
    .slice().sort((a, b) => b.deletedAt - a.deletedAt);
}

export function purgeExpiredDeletedTasks(data: SpreadData, now = Date.now()): SpreadData {
  if (!data.deletedTasks?.length) return data;
  const keep = activeDeletedTasks(data, now);
  return keep.length === data.deletedTasks.length ? data : { ...data, deletedTasks: keep };
}

export function moveTaskToRecentlyDeleted(
  data: SpreadData, hatId: string, taskId: string, now = Date.now(),
): { data: SpreadData; changed: boolean } {
  const source = data.weeks[data.currentWeek];
  const task = source?.boxes.find((box) => box.hatId === hatId)?.tasks.find((item) => item.id === taskId);
  if (!source || !task || !data.hats.some((hat) => hat.id === hatId)) return { data, changed: false };
  const deletion: DeletedTask = {
    id: task.id, weekKey: data.currentWeek, hatId, deletedAt: now, task: structuredClone(task),
  };
  const clean = purgeExpiredDeletedTasks(data, now);
  const existing = (clean.deletedTasks ?? []).filter((item) => item.id !== task.id);
  const boxes = source.boxes.map((box) => box.hatId === hatId
    ? { ...box, tasks: box.tasks.filter((item) => item.id !== taskId) }
    : box);
  return {
    changed: true,
    data: {
      ...clean,
      deletedTasks: [...existing, deletion],
      weeks: { ...clean.weeks, [data.currentWeek]: { ...source, boxes } },
    },
  };
}

/**
 * Restoring never schedules a task. It returns to the *original week* and original role's
 * To Place, preserving content and completion state without changing the viewed week.
 */
/**
 * After an Undo brings a deleted task back into the plan, its Recently Deleted entry is stale: it can never be
 * restored (that would duplicate the task) and would only mislead. Drop entries whose task is in the plan again.
 */
export function dropRevivedDeletedTasks(data: SpreadData): SpreadData {
  if (!data.deletedTasks?.length) return data;
  const live = new Set(Object.values(data.weeks).flatMap((week) =>
    week.boxes.flatMap((box) => box.tasks.map((task) => task.id))));
  const kept = data.deletedTasks.filter((item) => !live.has(item.task.id));
  return kept.length === data.deletedTasks.length ? data : { ...data, deletedTasks: kept };
}

export function restoreRecentlyDeletedTask(
  data: SpreadData, taskId: string, now = Date.now(),
): { data: SpreadData; changed: boolean; reason?: string } {
  const clean = purgeExpiredDeletedTasks(data, now);
  const deleted = clean.deletedTasks?.find((item) => item.id === taskId);
  if (!deleted) return { data: clean, changed: false, reason: "Task not found or recovery expired." };
  if (!clean.hats.some((hat) => hat.id === deleted.hatId)) {
    return { data: clean, changed: false, reason: "The original responsibility no longer exists." };
  }
  if (Object.values(clean.weeks).some((week) =>
    week.boxes.some((box) => box.tasks.some((task) => task.id === deleted.task.id)))) {
    return { data: clean, changed: false, reason: "Task already exists in the plan." };
  }
  const seeded = ensureWeek({ ...clean, currentWeek: deleted.weekKey });
  const source = seeded.weeks[deleted.weekKey];
  const { allocationId: _previousDay, ...unplaced } = structuredClone(deleted.task);
  void _previousDay;
  const boxes = source.boxes.map((box) => box.hatId === deleted.hatId
    ? { ...box, tasks: [...box.tasks, unplaced] } : box);
  return {
    changed: true,
    data: {
      ...clean,
      currentWeek: data.currentWeek,
      deletedTasks: (clean.deletedTasks ?? []).filter((item) => item.id !== taskId),
      weeks: { ...seeded.weeks, [deleted.weekKey]: { ...source, boxes } },
    },
  };
}

export function permanentlyDeleteRecentlyDeleted(
  data: SpreadData, taskIds: readonly string[], now = Date.now(),
): SpreadData {
  const clean = purgeExpiredDeletedTasks(data, now);
  const remove = new Set(taskIds);
  return {
    ...clean,
    deletedTasks: (clean.deletedTasks ?? []).filter((item) => !remove.has(item.id)),
  };
}

export type OverdueTask = {
  weekKey: string; hatId: string; day: string; task: Task;
};

export function overdueTasks(data: Readonly<SpreadData>, todayISO: string): OverdueTask[] {
  const roleIds = new Set(data.hats.map((hat) => hat.id));
  const result: OverdueTask[] = [];
  for (const [sourceWeek, week] of Object.entries(data.weeks)) {
    const byId = new Map(week.allocations.map((alloc) => [alloc.id, alloc]));
    for (const box of week.boxes) {
      if (!roleIds.has(box.hatId)) continue;
      for (const task of box.tasks) {
        if (!task.allocationId || task.done) continue;
        const alloc = byId.get(task.allocationId);
        if (!alloc || alloc.hatId !== box.hatId || alloc.day >= todayISO) continue;
        result.push({ weekKey: sourceWeek, hatId: box.hatId, day: alloc.day, task });
      }
    }
  }
  return result.sort((a,b) => a.day.localeCompare(b.day) || a.hatId.localeCompare(b.hatId));
}

export type BulkOverdueOutcome = { taskId: string; weekKey: string; hatId: string; targetAllocationId?: string; error?: string };
export function previewBulkOverdue(
  data: SpreadData, taskIds: readonly string[], targetDayISO: string, todayISO: string,
): BulkOverdueOutcome[] {
  const targetWeekKey = weekKey(new Date(targetDayISO + "T12:00:00"));
  const targetWeek = data.weeks[targetWeekKey];
  const candidates = new Map(overdueTasks(data, todayISO).map((item) => [item.task.id, item]));
  const seen = new Set<string>();
  return taskIds.map((taskId) => {
    if (seen.has(taskId)) return { taskId, weekKey: "", hatId: "", error: "Duplicate selection." };
    seen.add(taskId);
    const task = candidates.get(taskId);
    if (!task) return { taskId, weekKey: "", hatId: "", error: "No longer overdue." };
    const allocation = targetWeek?.allocations.find((a) =>
      a.hatId === task.hatId && a.day === targetDayISO && a.hours > 0);
    if (!allocation) return { taskId, weekKey: task.weekKey, hatId: task.hatId,
      error: "No hours for this responsibility on the selected day." };
    if (targetWeek?.boxes.some((box) => box.tasks.some((t) => t.id === taskId)) && task.weekKey !== targetWeekKey)
      return { taskId, weekKey: task.weekKey, hatId: task.hatId, error: "Task already exists there." };
    return { taskId, weekKey: task.weekKey, hatId: task.hatId, targetAllocationId: allocation.id };
  });
}

export function bulkRescheduleOverdue(
  data: SpreadData, taskIds: readonly string[], targetDayISO: string, todayISO: string,
): { data: SpreadData; moved: number; outcomes: BulkOverdueOutcome[] } {
  const outcomes = previewBulkOverdue(data, taskIds, targetDayISO, todayISO);
  const valid = outcomes.filter((row) => row.targetAllocationId);
  if (!valid.length) return { data, moved: 0, outcomes };
  const targetWeekKey = weekKey(new Date(targetDayISO + "T12:00:00"));
  const weeks: Record<string, WeekData> = { ...data.weeks };
  for (const row of valid) {
    if (row.weekKey === targetWeekKey) {
      const sameWeek = weeks[targetWeekKey];
      weeks[targetWeekKey] = {
        ...sameWeek,
        boxes: sameWeek.boxes.map((box) => box.hatId === row.hatId
          ? { ...box, tasks: box.tasks.map((task) => task.id === row.taskId
              ? { ...task, allocationId: row.targetAllocationId } : task) }
          : box),
      };
      continue; // Keep canonical Spread task ordering on within-week moves.
    }
    const source = weeks[row.weekKey];
    const task = source?.boxes.find((box) => box.hatId === row.hatId)?.tasks.find((t) => t.id === row.taskId);
    if (!source || !task) continue; // impossible after preflight; guard corrupt data.
    weeks[row.weekKey] = {
      ...source,
      boxes: source.boxes.map((box) => box.hatId !== row.hatId ? box
        : { ...box, tasks: box.tasks.filter((t) => t.id !== row.taskId) }),
    };
    const target = weeks[targetWeekKey];
    weeks[targetWeekKey] = {
      ...target,
      boxes: target.boxes.map((box) => box.hatId !== row.hatId ? box
        : { ...box, tasks: [...box.tasks, { ...task, allocationId: row.targetAllocationId! }] }),
    };
  }
  return { data: { ...data, weeks }, moved: valid.length, outcomes };
}

/** Per-day presentation order is independent of the canonical Spread task sequence. */
export function orderedTasksForDay(week: WeekData, hatId: string, dayISO: string): Task[] {
  const ids = new Set(week.allocations.filter((a) => a.day === dayISO && a.hatId === hatId).map((a) => a.id));
  const tasks = week.boxes.find((box) => box.hatId === hatId)?.tasks.filter((t) => t.allocationId && ids.has(t.allocationId)) ?? [];
  const positions = new Map((week.dayTaskOrder?.[dayISO + "|" + hatId] ?? []).map((id,i) => [id,i]));
  return tasks.slice().sort((a,b) =>
    (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

export function reorderDayTask(
  data: SpreadData, hatId: string, dayISO: string, taskId: string, beforeId: string | null,
): { data: SpreadData; changed: boolean } {
  const current = data.weeks[data.currentWeek];
  if (!current) return { data, changed: false };
  const tasks = orderedTasksForDay(current, hatId, dayISO);
  if (!tasks.some((t) => t.id === taskId)) return { data, changed: false };
  if (beforeId !== null && !tasks.some((t) => t.id === beforeId)) return { data, changed: false };
  const ids = tasks.map((t) => t.id).filter((id) => id !== taskId);
  const at = beforeId === null ? ids.length : ids.indexOf(beforeId);
  ids.splice(at, 0, taskId);
  if (ids.every((id,i) => id === tasks[i].id)) return { data, changed: false };
  const dayTaskOrder = { ...current.dayTaskOrder, [dayISO + "|" + hatId]: ids };
  return { changed: true,
    data: { ...data, weeks: { ...data.weeks, [data.currentWeek]: { ...current, dayTaskOrder } } } };
}
