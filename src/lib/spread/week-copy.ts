import { normalizeData, shiftWeek, uid, type Allocation, type Box, type Hat, type SpreadData, type Task, type WeekData } from "./model.ts";

/**
 * Copy the week on screen forward, as real weeks. The copy is written into the eight weeks after it, in batches of
 * eight. Each copied week holds the same hours for each Life area, the same day hours, and the same tasks, with
 * the tasks not done. A week that already holds any hours, tasks or day hours is never overwritten: it is listed as
 * skipped, so nothing the person planned is replaced.
 *
 * Nothing here repeats by rule. The calendar and the plan are the same weeks, so they cannot disagree.
 */

export const WEEK_COPY_BATCH_WEEKS = 8;
/** 13 batches of eight weeks is 104 weeks, the same range the plan file covers. */
export const WEEK_COPY_MAX_BATCHES = 13;

export type WeekCopyTarget = { key: string; status: "fill" | "filled" };

export type WeekCopyPreview = {
  eligible: boolean;
  reason?: string;
  sourceKey: string;
  batch: number;
  targets: WeekCopyTarget[];
  fillCount: number;
  skipCount: number;
  /** Hours in the source week, which each filled week receives. */
  hours: number;
  /** Tasks in the source week, which each filled week receives, not done. */
  tasks: number;
};

/** `data` is null when the copy is refused. Nothing is written in that case. */
export type WeekCopyResult = { data: SpreadData | null; preview: WeekCopyPreview };

/** A week holds something the person planned: hours, a task, or day hours. */
function holdsPlan(week: WeekData | undefined): boolean {
  if (!week) return false;
  return week.boxes.some((box) => box.hours > 0 || box.tasks.length > 0) || week.allocations.length > 0;
}

function batchTargets(sourceKey: string, batch: number, data: SpreadData): WeekCopyTarget[] {
  const first = (batch - 1) * WEEK_COPY_BATCH_WEEKS;
  return Array.from({ length: WEEK_COPY_BATCH_WEEKS }, (_, index) => {
    const key = shiftWeek(sourceKey, first + index + 1);
    return { key, status: holdsPlan(data.weeks[key]) ? "filled" : "fill" };
  });
}

function refused(sourceKey: string, batch: number, reason: string, targets: WeekCopyTarget[] = []): WeekCopyResult {
  const fillCount = targets.filter((target) => target.status === "fill").length;
  return {
    data: null,
    preview: {
      eligible: false, reason, sourceKey, batch, targets, fillCount,
      skipCount: targets.length - fillCount, hours: 0, tasks: 0,
    },
  };
}

/**
 * The copy of `source` for one target week. Ids are new, so nothing is shared between weeks. Every day moves by the
 * same number of weeks as the target does, so the copy stays in its own week.
 */
function copyOf(source: WeekData, hats: Hat[], sourceKey: string, targetKey: string, fresh: () => string): WeekData {
  const offset = Math.round((Date.parse(`${targetKey}T00:00:00Z`) - Date.parse(`${sourceKey}T00:00:00Z`)) / (7 * 86400000));
  const moveDay = (day: string) => shiftWeek(day, offset);
  const allocationIds = new Map<string, string>();
  const allocations: Allocation[] = source.allocations.map((item) => {
    const id = fresh();
    allocationIds.set(item.id, id);
    return { id, hatId: item.hatId, day: moveDay(item.day), hours: item.hours, order: item.order };
  });
  const boxes: Box[] = hats.map((hat) => {
    const box = source.boxes.find((item) => item.hatId === hat.id);
    const tasks: Task[] = (box?.tasks ?? []).map((task) => {
      const next: Task = { ...task, id: fresh(), done: false };
      delete next.allocationId;
      const link = task.allocationId ? allocationIds.get(task.allocationId) : undefined;
      if (link) next.allocationId = link;
      return next;
    });
    return { hatId: hat.id, hours: box?.hours ?? 0, tasks };
  });
  const capacity = source.life?.capacityHours;
  return {
    boxes,
    allocations,
    ...(capacity !== undefined ? { life: { version: 1 as const, capacityHours: capacity } } : {}),
  };
}

/**
 * Plans a copy of the week on screen into one batch of eight weeks. Pure: the caller decides whether to write it.
 * The preview lists every target, so the person sees what is filled and what is kept.
 */
export function planWeekCopy(data: SpreadData, batch: number): WeekCopyResult {
  const sourceKey = data.currentWeek;
  if (!Number.isInteger(batch) || batch < 1 || batch > WEEK_COPY_MAX_BATCHES) {
    return refused(sourceKey, batch, `Choose a batch from 1 to ${WEEK_COPY_MAX_BATCHES}.`);
  }
  const targets = batchTargets(sourceKey, batch, data);
  const source = data.weeks[sourceKey];
  if (!holdsPlan(source)) {
    return refused(sourceKey, batch, "This week has no hours or tasks to copy.", targets);
  }
  const toFill = targets.filter((target) => target.status === "fill");
  if (toFill.length === 0) {
    return refused(sourceKey, batch, "Every week in this batch already has a plan, so nothing was copied.", targets);
  }
  const used = new Set<string>(data.hats.map((hat) => hat.id));
  for (const week of Object.values(data.weeks)) {
    week.allocations.forEach((item) => used.add(item.id));
    week.boxes.forEach((box) => box.tasks.forEach((task) => used.add(task.id)));
  }
  const fresh = (): string => {
    let id = uid();
    while (!id || used.has(id)) id = uid();
    used.add(id);
    return id;
  };
  const weeks: Record<string, WeekData> = { ...data.weeks };
  for (const target of toFill) {
    weeks[target.key] = copyOf(source, data.hats, sourceKey, target.key, fresh);
  }
  const hours = source.boxes.reduce((sum, box) => sum + box.hours, 0);
  const tasks = source.boxes.reduce((sum, box) => sum + box.tasks.length, 0);
  return {
    data: normalizeData({ ...data, weeks }),
    preview: {
      eligible: true, sourceKey, batch, targets,
      fillCount: toFill.length, skipCount: targets.length - toFill.length, hours, tasks,
    },
  };
}
