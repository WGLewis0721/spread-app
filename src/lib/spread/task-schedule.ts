import type { Allocation, SpreadData, Task, WeekData } from "./model.ts";

/**
 * Putting a task on a day. A task is on a day when its `allocationId` names an allocation of its
 * own role in the same week. Nothing here is stored separately: the link already lives on the
 * task, and a link that names an allocation that is not there is read as "not on a day". That
 * keeps stored data untouched (no migration) and makes a stale link harmless.
 *
 * Pure: no React, no storage. The store applies the result through its normal write path.
 */

export type PlacedTask = { hatId: string; task: Task };

/** The allocation a task is on, or null when it is on no day (or its link points at nothing). */
export function allocationOfTask(week: WeekData | undefined, task: Task): Allocation | null {
  if (!week || !task.allocationId) return null;
  return week.allocations.find((item) => item.id === task.allocationId) ?? null;
}

/** The date a task is placed on, or null. A plain string, so it is safe to select from the store. */
export function placedDay(week: WeekData | undefined, task: Pick<Task, "allocationId">): string | null {
  if (!week || !task.allocationId) return null;
  return week.allocations.find((item) => item.id === task.allocationId)?.day ?? null;
}

export function isScheduled(week: WeekData | undefined, task: Task): boolean {
  return allocationOfTask(week, task) !== null;
}

/** Tasks on one allocation, in the order they sit in their role. Only the allocation's own role is searched. */
export function tasksOnAllocation(week: WeekData | undefined, allocationId: string): Task[] {
  if (!week) return [];
  const allocation = week.allocations.find((item) => item.id === allocationId);
  if (!allocation) return [];
  const box = week.boxes.find((item) => item.hatId === allocation.hatId);
  return (box?.tasks ?? []).filter((task) => task.allocationId === allocationId);
}

/** Open (not done) tasks that are on no day, optionally for one role. This is the "To place" list. */
export function unscheduledTasks(week: WeekData | undefined, hatId?: string | null): PlacedTask[] {
  if (!week) return [];
  const out: PlacedTask[] = [];
  for (const box of week.boxes) {
    if (hatId && box.hatId !== hatId) continue;
    for (const task of box.tasks) {
      if (!task.done && !isScheduled(week, task)) out.push({ hatId: box.hatId, task });
    }
  }
  return out;
}

/** Allocations a task of this role may be placed on: its own role, with hours, in day order. */
export function eligibleAllocations(week: WeekData | undefined, hatId: string): Allocation[] {
  if (!week) return [];
  return week.allocations
    .filter((item) => item.hatId === hatId && item.hours > 0)
    .slice()
    .sort((a, b) => (a.day === b.day ? a.order - b.order : a.day < b.day ? -1 : 1));
}

export type AssignFailure = "no-task" | "task-done" | "no-allocation" | "wrong-role" | "no-hours";

export type AssignResult =
  | { ok: true; changed: boolean; data: SpreadData }
  | { ok: false; reason: AssignFailure };

/**
 * Put a task on an allocation, or take it off every day (`allocationId` null). Only the open week
 * is touched. The allocation must exist in that week, belong to the task's own role and have
 * hours; a finished task cannot be put on a day. Taking a task off a day always works.
 * When nothing changes the same `data` object comes back, so the caller can skip the write.
 */
export function assignTaskTo(data: SpreadData, hatId: string, taskId: string, allocationId: string | null): AssignResult {
  const week = data.weeks[data.currentWeek];
  const box = week?.boxes.find((item) => item.hatId === hatId);
  const task = box?.tasks.find((item) => item.id === taskId);
  if (!week || !box || !task) return { ok: false, reason: "no-task" };

  if (allocationId === null) {
    if (task.allocationId === undefined) return { ok: true, changed: false, data };
    return { ok: true, changed: true, data: withTask(data, week, hatId, taskId, undefined) };
  }

  if (task.done) return { ok: false, reason: "task-done" };
  const allocation = week.allocations.find((item) => item.id === allocationId);
  if (!allocation) return { ok: false, reason: "no-allocation" };
  if (allocation.hatId !== hatId) return { ok: false, reason: "wrong-role" };
  if (allocation.hours <= 0) return { ok: false, reason: "no-hours" };
  if (task.allocationId === allocationId) return { ok: true, changed: false, data };
  return { ok: true, changed: true, data: withTask(data, week, hatId, taskId, allocationId) };
}

function withTask(data: SpreadData, week: WeekData, hatId: string, taskId: string, allocationId: string | undefined): SpreadData {
  const boxes = week.boxes.map((box) =>
    box.hatId !== hatId
      ? box
      : {
          ...box,
          tasks: box.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const { allocationId: _old, ...rest } = task;
            void _old;
            return allocationId === undefined ? rest : { ...rest, allocationId };
          }),
        },
  );
  return { ...data, weeks: { ...data.weeks, [data.currentWeek]: { ...week, boxes } } };
}

/**
 * When an allocation is folded into another one (same role, same day), its tasks must follow, or
 * they would point at an allocation that no longer exists and silently drop off the day.
 */
export function repointTasks(week: WeekData, fromId: string, toId: string): WeekData {
  if (fromId === toId) return week;
  let touched = false;
  const boxes = week.boxes.map((box) => {
    if (!box.tasks.some((task) => task.allocationId === fromId)) return box;
    touched = true;
    return { ...box, tasks: box.tasks.map((task) => (task.allocationId === fromId ? { ...task, allocationId: toId } : task)) };
  });
  return touched ? { ...week, boxes } : week;
}

const FAILURE_TEXT: Record<AssignFailure, string> = {
  "no-task": "That task isn’t in this week.",
  "task-done": "Finished tasks stay where they are.",
  "no-allocation": "That day isn’t in the plan.",
  "wrong-role": "A task goes on a day for its own role.",
  "no-hours": "That day has no hours for this role yet.",
};

export function assignFailureText(reason: AssignFailure, roleName?: string, dayLabel?: string): string {
  if (reason === "no-allocation" && roleName && dayLabel) return `${roleName} isn’t on ${dayLabel} yet. Add it first.`;
  return FAILURE_TEXT[reason];
}
