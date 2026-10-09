import { ensureWeek, shiftWeek, type SpreadData, type Task } from "./model.ts";

/**
 * Weekly review: the person picks which unfinished tasks move to next week. Unlike the whole-week
 * rollover (which copies everything under new ids and can replace next week), this MOVES the chosen
 * tasks, keeps their ids and notes, takes them off any day (days belong to the old week), and never
 * touches anything else in next week. Safe to run twice: a task already in next week is only
 * removed from this week, never duplicated.
 */
export type OpenTask = { hatId: string; task: Task };
export type CarryPick = { hatId: string; taskId: string };
export type CarryResult = { data: SpreadData; moved: number };

/** Open tasks of this week's roles, in role order. A box left behind by a removed role is not offered. */
export function openTasksOf(data: SpreadData): OpenTask[] {
  const week = data.weeks[data.currentWeek];
  if (!week) return [];
  const roles = new Set(data.hats.map((hat) => hat.id));
  return week.boxes
    .filter((box) => roles.has(box.hatId))
    .flatMap((box) => box.tasks.filter((task) => !task.done).map((task) => ({ hatId: box.hatId, task })));
}

export function carryOpenTasks(data: SpreadData, picks: CarryPick[]): CarryResult {
  const source = data.weeks[data.currentWeek];
  if (!source || picks.length === 0) return { data, moved: 0 };
  const nextKey = shiftWeek(data.currentWeek, 1);
  const nextWeek = ensureWeek({ ...data, currentWeek: nextKey }).weeks[nextKey];
  const chosen = new Set(picks.map((pick) => `${pick.hatId}:${pick.taskId}`));
  // A task leaves this week only once it is known to be in next week (added now, or already there
  // from an earlier run). Nothing can be removed here without landing there.
  const landed = new Set<string>();
  let moved = 0;

  const nextBoxes = nextWeek.boxes.map((box) => {
    const from = source.boxes.find((item) => item.hatId === box.hatId);
    if (!from) return box;
    const incoming: Task[] = [];
    for (const task of from.tasks) {
      const key = `${box.hatId}:${task.id}`;
      if (task.done || !chosen.has(key)) continue;
      landed.add(key);
      if (!box.tasks.some((existing) => existing.id === task.id)) incoming.push(offEveryDay(task));
    }
    if (incoming.length === 0) return box;
    moved += incoming.length;
    return { ...box, tasks: [...box.tasks, ...incoming] };
  });
  if (landed.size === 0) return { data, moved: 0 };

  const sourceBoxes = source.boxes.map((box) =>
    box.tasks.some((task) => landed.has(`${box.hatId}:${task.id}`))
      ? { ...box, tasks: box.tasks.filter((task) => !landed.has(`${box.hatId}:${task.id}`)) }
      : box,
  );
  return {
    moved,
    data: {
      ...data,
      weeks: {
        ...data.weeks,
        [data.currentWeek]: { ...source, boxes: sourceBoxes },
        [nextKey]: { ...nextWeek, boxes: nextBoxes },
      },
    },
  };
}

/** Days belong to the week they are in, so a task that changes week comes off its day. */
function offEveryDay(task: Task): Task {
  const { allocationId: _day, ...rest } = task;
  void _day;
  return rest;
}
