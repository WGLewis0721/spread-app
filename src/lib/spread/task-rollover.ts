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

export function openTasksOf(data: SpreadData): OpenTask[] {
  const week = data.weeks[data.currentWeek];
  if (!week) return [];
  return week.boxes.flatMap((box) => box.tasks.filter((task) => !task.done).map((task) => ({ hatId: box.hatId, task })));
}

export function carryOpenTasks(data: SpreadData, picks: CarryPick[]): CarryResult {
  const source = data.weeks[data.currentWeek];
  if (!source || picks.length === 0) return { data, moved: 0 };
  const nextKey = shiftWeek(data.currentWeek, 1);
  const withNext = ensureWeek({ ...data, currentWeek: nextKey });
  const nextWeek = withNext.weeks[nextKey];
  const chosen = new Set(picks.map((pick) => `${pick.hatId}:${pick.taskId}`));
  let moved = 0;

  const sourceBoxes = source.boxes.map((box) => {
    const leaving = box.tasks.filter((task) => !task.done && chosen.has(`${box.hatId}:${task.id}`));
    if (leaving.length === 0) return box;
    return { ...box, tasks: box.tasks.filter((task) => !leaving.includes(task)) };
  });

  const nextBoxes = nextWeek.boxes.map((box) => {
    const from = source.boxes.find((item) => item.hatId === box.hatId);
    if (!from) return box;
    const incoming = from.tasks
      .filter((task) => !task.done && chosen.has(`${box.hatId}:${task.id}`))
      .filter((task) => !box.tasks.some((existing) => existing.id === task.id));
    if (incoming.length === 0) return box;
    moved += incoming.length;
    const clean = incoming.map((task) => {
      const { allocationId: _link, ...rest } = task;
      void _link;
      return rest as Task;
    });
    return { ...box, tasks: [...box.tasks, ...clean] };
  });

  const changedSource = sourceBoxes.some((box, index) => box !== source.boxes[index]);
  if (!changedSource && moved === 0) return { data, moved: 0 };
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
