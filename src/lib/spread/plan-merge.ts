import {
  normalizeData,
  uid,
  type Allocation,
  type Box,
  type Hat,
  type LifeWeekMetadata,
  type SpreadData,
  type Task,
  type WeekData,
} from "./model.ts";
import { PLAN_LIMITS, type PlanDoc, type PlanTask, type PlanWeek } from "./plan-file.ts";

/**
 * Merging a plan file into the open profile, the way a Terraform plan is applied to state. The file is the desired
 * state for the areas and weeks it mentions. Everything it does not mention is kept, unless the person chooses to
 * remove it when previewing. Both removals default to off, so a merge never removes what the file leaves out.
 *
 * Recurring plans, rich notes, the recycle bin and settings are not in the file, so they are kept as they are.
 * The result is normalised the same way the planner loads a profile, and the summary is taken from that result,
 * so the preview shows what the apply will do.
 */

/** Removals chosen at merge time. Both are off unless the person turns them on. */
export type MergeOptions = { removeAreas: boolean; removeItems: boolean };
export const NO_REMOVALS: MergeOptions = { removeAreas: false, removeItems: false };

export type MergeCounts = {
  areasAdded: number;
  areasChanged: number;
  areasRemoved: number;
  areasKept: number;
  weeks: number;
  weeksChanged: number;
  tasksAdded: number;
  tasksChanged: number;
  tasksMoved: number;
  tasksRemoved: number;
  tasksKept: number;
  hoursChanged: number;
  daysChanged: number;
  capacityChanged: number;
  plansStopped: number;
};

export type MergeAreaChange = { name: string; change: "added" | "changed" | "removed" | "kept"; before?: string; after?: string };

export type MergeSummary = { counts: MergeCounts; areas: MergeAreaChange[]; areasOmitted: number };

export type MergeResult = { ok: true; data: SpreadData; summary: MergeSummary } | { ok: false; issues: string[] };

/** What the preview shows before anything changes. `revision` is the profile version the preview was made against. */
export type MergePreview = {
  profileName: string;
  revision: string;
  basedOn: string | null;
  stale: boolean;
  counts: MergeCounts;
  areas: MergeAreaChange[];
  areasOmitted: number;
  issues: string[];
};

const AREA_ROWS = 40;

export function emptyCounts(): MergeCounts {
  return {
    areasAdded: 0, areasChanged: 0, areasRemoved: 0, areasKept: 0,
    weeks: 0, weeksChanged: 0,
    tasksAdded: 0, tasksChanged: 0, tasksMoved: 0, tasksRemoved: 0, tasksKept: 0,
    hoursChanged: 0, daysChanged: 0, capacityChanged: 0, plansStopped: 0,
  };
}

/** Reasons a file cannot merge into this profile. Empty when it can. Checked before any merge is computed. */
export function planTargetIssues(doc: PlanDoc, activeProfileId: string | null, syncing: boolean): string[] {
  if (doc.action !== "merge") return [];
  const issues: string[] = [];
  if (doc.profileId !== activeProfileId) {
    issues.push('This plan is for a different profile. Open that profile to merge it, or set action to "create" to make a new profile.');
  }
  if (syncing) issues.push("This profile syncs with iCloud, so a merge would change your other devices too. Turn sync off for it first.");
  return issues;
}

/** Stable text for comparing two values: the same content gives the same text whatever order its keys were written in. */
function canon(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  }) ?? "null";
}

const hoursLabel = (hours: number) => `${hours} h a week`;
const hatLabel = (hat: Hat) => `${hat.name} · ${hoursLabel(hat.defaultHours)}`;
const hatFields = (hat: Hat) => ({ name: hat.name, defaultHours: hat.defaultHours, color: hat.color, category: hat.category ?? null });

/** A task without the fields the file defines. Keeps its rich notes, which the file never carries. */
function keptFields(task: Task): Partial<Task> {
  const rest: Partial<Task> = { ...task };
  delete rest.id;
  delete rest.text;
  delete rest.done;
  delete rest.allocationId;
  delete rest.estimateMinutes;
  delete rest.important;
  return rest;
}

function withoutLink(task: Task): Task {
  const next: Task = { ...task };
  delete next.allocationId;
  return next;
}

function nextLife(prior: LifeWeekMetadata | undefined, capacity: number | undefined, hatIds: Set<string>): LifeWeekMetadata | undefined {
  const next: LifeWeekMetadata = { version: 1 };
  if (prior?.priorityRoleId !== undefined && hatIds.has(prior.priorityRoleId)) next.priorityRoleId = prior.priorityRoleId;
  if (prior?.priorityGoalHours !== undefined) next.priorityGoalHours = prior.priorityGoalHours;
  if (prior?.priorityDay !== undefined) next.priorityDay = prior.priorityDay;
  if (capacity !== undefined) next.capacityHours = capacity;
  const hasOther = next.priorityRoleId !== undefined || next.priorityGoalHours !== undefined || next.priorityDay !== undefined;
  return capacity !== undefined || hasOther ? next : undefined;
}

/** Drops references to allocations, tasks, areas that no longer exist in a week, so the result has no dangling links. */
function tidy(week: WeekData, hatIds: Set<string>): WeekData {
  const allocIds = new Set(week.allocations.map((a) => a.id));
  const taskIds = new Set(week.boxes.flatMap((box) => box.tasks.map((task) => task.id)));
  const boxes = week.boxes.map((box) => ({
    ...box,
    tasks: box.tasks.map((task) => (task.allocationId && !allocIds.has(task.allocationId) ? withoutLink(task) : task)),
  }));
  const next: WeekData = { ...week, boxes };
  if (week.dayTaskOrder) {
    const order = Object.fromEntries(
      Object.entries(week.dayTaskOrder)
        .map(([day, ids]) => [day, ids.filter((id) => taskIds.has(id))] as const)
        .filter(([, ids]) => ids.length > 0),
    );
    if (Object.keys(order).length) next.dayTaskOrder = order;
    else delete next.dayTaskOrder;
  }
  if (week.recurrenceSource) {
    const source = Object.fromEntries(Object.entries(week.recurrenceSource).filter(([roleId]) => hatIds.has(roleId)));
    if (Object.keys(source).length) next.recurrenceSource = source;
    else delete next.recurrenceSource;
  }
  return next;
}

/** Each task in a week, with its area and the fields the summary compares: text, done, estimate, important, day. */
function taskRows(week: WeekData | undefined) {
  const rows = new Map<string, { hatId: string; fields: string }>();
  if (!week) return rows;
  for (const box of week.boxes) {
    for (const task of box.tasks) {
      const day = task.allocationId ? (week.allocations.find((a) => a.id === task.allocationId)?.day ?? null) : null;
      rows.set(task.id, {
        hatId: box.hatId,
        fields: canon({ text: task.text, done: task.done, estimateMinutes: task.estimateMinutes ?? null, important: task.important ?? false, day }),
      });
    }
  }
  return rows;
}

/** The parts of a week a person sees: areas with hours or tasks, day hours and capacity. An empty area is not a change. */
function weekView(week: WeekData | undefined) {
  if (!week) return null;
  return {
    boxes: week.boxes.filter((box) => box.hours > 0 || box.tasks.length > 0),
    allocations: week.allocations,
    capacity: week.life?.capacityHours ?? null,
  };
}

function hoursByHat(week: WeekData | undefined) {
  const map = new Map<string, number>();
  for (const box of week?.boxes ?? []) map.set(box.hatId, box.hours);
  return map;
}

function hoursByDay(week: WeekData | undefined) {
  const map = new Map<string, number>();
  for (const a of week?.allocations ?? []) {
    const key = `${a.hatId}|${a.day}`;
    map.set(key, (map.get(key) ?? 0) + a.hours);
  }
  return map;
}

/**
 * The merged schedule, or every reason it cannot be merged. Pure: it reads the current profile and the checked file,
 * and returns a new schedule. Nothing is written here.
 */
export function mergeSchedule(current: SpreadData, doc: PlanDoc, options: MergeOptions): MergeResult {
  const issues: string[] = [];
  const used = new Set<string>(current.hats.map((hat) => hat.id));
  for (const week of Object.values(current.weeks)) {
    for (const a of week.allocations) used.add(a.id);
    for (const box of week.boxes) for (const task of box.tasks) used.add(task.id);
  }
  const fresh = (): string => {
    let id = uid();
    while (!id || used.has(id)) id = uid();
    used.add(id);
    return id;
  };

  // 1. Areas. Each file area matches a current area by id, then by name. A current area can be matched once.
  const hatById = new Map(current.hats.map((hat) => [hat.id, hat]));
  const hatByName = new Map(current.hats.map((hat) => [hat.name.trim().toLowerCase(), hat]));
  const claimed = new Set<string>();
  const fileHatIds: string[] = doc.areas.map((area) => {
    const byId = area.id ? hatById.get(area.id) : undefined;
    const hat = byId && !claimed.has(byId.id) ? byId : hatByName.get(area.name.toLowerCase());
    if (hat && !claimed.has(hat.id)) {
      claimed.add(hat.id);
      return hat.id;
    }
    return fresh();
  });
  const fileHatSet = new Set(fileHatIds);
  const counts = emptyCounts();
  const areaRows: MergeAreaChange[] = [];

  const fileHats: Hat[] = doc.areas.map((area, index) => {
    const id = fileHatIds[index];
    const next: Hat = {
      id,
      name: area.name,
      defaultHours: area.weeklyHours,
      color: area.color,
      ...(area.category ? { category: area.category } : {}),
    };
    const before = hatById.get(id);
    if (!before) {
      counts.areasAdded += 1;
      areaRows.push({ name: next.name, change: "added", after: hoursLabel(next.defaultHours) });
    } else if (canon(hatFields(before)) !== canon(hatFields(next))) {
      counts.areasChanged += 1;
      areaRows.push({ name: next.name, change: "changed", before: hatLabel(before), after: hatLabel(next) });
    }
    return next;
  });

  // Areas the file does not mention. They stay unless removal is chosen.
  const notInFile = current.hats.filter((hat) => !fileHatSet.has(hat.id));
  const removed = new Set<string>();
  for (const hat of notInFile) {
    if (options.removeAreas) {
      removed.add(hat.id);
      counts.areasRemoved += 1;
      areaRows.push({ name: hat.name, change: "removed", before: hatLabel(hat) });
    } else {
      counts.areasKept += 1;
      areaRows.push({ name: hat.name, change: "kept", before: hatLabel(hat) });
    }
  }
  const kept = new Set(notInFile.filter((hat) => !removed.has(hat.id)).map((hat) => hat.id));
  const hats = [...fileHats, ...notInFile.filter((hat) => kept.has(hat.id))];
  const hatIds = new Set(hats.map((hat) => hat.id));
  counts.plansStopped = (current.recurringPlans ?? []).filter((plan) => removed.has(plan.roleId)).length;
  const hatName = (id: string) => hats.find((hat) => hat.id === id)?.name ?? "An area";

  // 2. Weeks. A week the file lists takes the file's areas, hours, tasks, day hours and capacity. Other weeks only
  // lose areas that are removed.
  const listed = new Map(doc.weeks.map((week) => [week.key, week]));
  const docTaskIds = new Set(
    doc.weeks.flatMap((week) => week.areas.flatMap((row) => row.tasks.flatMap((task) => (task.id ? [task.id] : [])))),
  );

  const mergeWeek = (key: string, before: WeekData | undefined, file: PlanWeek): WeekData => {
    const prior: WeekData = before ?? { boxes: [], allocations: [] };
    const priorAllocs = new Map(prior.allocations.map((a) => [a.id, a]));
    const priorTasks = new Map<string, { task: Task; hatId: string }>();
    for (const box of prior.boxes) for (const task of box.tasks) priorTasks.set(task.id, { task, hatId: box.hatId });
    const reusedAllocs = new Set<string>();
    const reusedTasks = new Set<string>();

    // Day hours from the file. An id is reused only for a day hour of an area the file lists.
    const allocs: Allocation[] = file.allocations.map((item) => {
      const hatId = fileHatIds[item.areaIndex];
      const prev = item.id ? priorAllocs.get(item.id) : undefined;
      const id = prev && fileHatSet.has(prev.hatId) && !reusedAllocs.has(prev.id) ? prev.id : fresh();
      reusedAllocs.add(id);
      return { id, hatId, day: item.day, hours: item.hours, order: 0 };
    });
    // Day hours the file does not mention are kept for areas that stay, unless removal is chosen.
    for (const a of prior.allocations) {
      if (reusedAllocs.has(a.id) || removed.has(a.hatId)) continue;
      if (kept.has(a.hatId) || !options.removeItems) allocs.push({ ...a });
    }
    const seen = new Map<string, number>();
    const ordered: Allocation[] = allocs.map((a) => {
      const slot = `${a.hatId}|${a.day}`;
      const order = seen.get(slot) ?? 0;
      seen.set(slot, order + 1);
      return { ...a, order };
    });

    // Task ids are settled before any box is built, so a task moved between areas is not kept in its old area too.
    const taskIdOf = new Map<PlanTask, string>();
    for (const row of file.areas) {
      for (const item of row.tasks) {
        const prev = item.id ? priorTasks.get(item.id) : undefined;
        const id = prev && fileHatSet.has(prev.hatId) && !reusedTasks.has(prev.task.id) ? prev.task.id : fresh();
        reusedTasks.add(id);
        taskIdOf.set(item, id);
      }
    }

    const boxes: Box[] = [];
    for (const hat of hats) {
      const fileIndex = fileHatIds.indexOf(hat.id);
      if (fileIndex < 0) {
        // An area the file does not mention is not touched in any week.
        const box = prior.boxes.find((item) => item.hatId === hat.id);
        if (box) boxes.push(box);
        continue;
      }
      const row = file.areas.find((item) => item.areaIndex === fileIndex);
      const tasks: Task[] = (row?.tasks ?? []).map((item) => {
        const id = taskIdOf.get(item) ?? fresh();
        const prev = item.id ? priorTasks.get(item.id) : undefined;
        const base = prev && prev.task.id === id ? keptFields(prev.task) : {};
        const link = item.day ? ordered.find((a) => a.hatId === hat.id && a.day === item.day) : undefined;
        return {
          ...base,
          id,
          text: item.text,
          done: item.done,
          ...(link ? { allocationId: link.id } : {}),
          ...(item.estimateMinutes ? { estimateMinutes: item.estimateMinutes } : {}),
          ...(item.important ? { important: true } : {}),
        };
      });
      if (!options.removeItems) {
        // Tasks the file does not mention stay in their area, unless removal is chosen.
        const priorBox = prior.boxes.find((item) => item.hatId === hat.id);
        for (const task of priorBox?.tasks ?? []) {
          if (reusedTasks.has(task.id)) continue;
          const alive = task.allocationId !== undefined && ordered.some((a) => a.id === task.allocationId);
          tasks.push(alive ? task : withoutLink(task));
        }
      }
      boxes.push({ hatId: hat.id, hours: row?.hours ?? 0, tasks });
    }

    for (const box of boxes) {
      if (!fileHatSet.has(box.hatId)) continue;
      const placed = ordered.filter((a) => a.hatId === box.hatId).reduce((sum, a) => sum + a.hours, 0);
      if (placed > box.hours) {
        const tail = options.removeItems ? "" : " Turn on removing items the file does not mention, or add the hours to the file.";
        issues.push(`Week ${key}: "${hatName(box.hatId)}" would have ${placed} hours of day hours, more than its ${box.hours}-hour budget.${tail}`);
      }
    }

    const life = nextLife(prior.life, file.capacity, hatIds);
    const week: WeekData = { boxes, allocations: ordered, ...(life ? { life } : {}) };
    if (prior.dayTaskOrder) week.dayTaskOrder = prior.dayTaskOrder;
    if (prior.recurrenceSource) week.recurrenceSource = prior.recurrenceSource;
    if (prior.recurrenceIssue !== undefined) week.recurrenceIssue = prior.recurrenceIssue;
    return week;
  };

  const weeks: Record<string, WeekData> = {};
  for (const key of new Set([...Object.keys(current.weeks), ...listed.keys()])) {
    const before = current.weeks[key];
    const file = listed.get(key);
    if (file) {
      weeks[key] = mergeWeek(key, before, file);
    } else if (before) {
      weeks[key] = {
        ...before,
        boxes: before.boxes.filter((box) => !removed.has(box.hatId)),
        allocations: before.allocations.filter((a) => !removed.has(a.hatId)),
      };
    }
  }
  const tidied: Record<string, WeekData> = {};
  for (const [key, week] of Object.entries(weeks)) tidied[key] = tidy(week, hatIds);

  if (issues.length > 0) return { ok: false, issues: issues.slice(0, PLAN_LIMITS.issues) };

  // 3. The result is normalised as the planner loads a profile, so the summary describes what will be saved.
  const merged = normalizeData({
    hats,
    weeks: tidied,
    currentWeek: doc.currentWeek ?? current.currentWeek,
    ...(current.recurringPlans ? { recurringPlans: current.recurringPlans } : {}),
    ...(current.deletedTasks ? { deletedTasks: current.deletedTasks } : {}),
  });

  // 4. Counts. Week-level tasks and hours are counted for the weeks the file lists.
  counts.weeks = listed.size;
  for (const key of new Set([...Object.keys(current.weeks), ...Object.keys(merged.weeks)])) {
    const was = current.weeks[key];
    const now = merged.weeks[key];
    if (canon(weekView(was)) !== canon(weekView(now))) counts.weeksChanged += 1;
    if (!listed.has(key)) continue;

    const beforeRows = taskRows(was);
    const afterRows = taskRows(now);
    for (const [id, row] of afterRows) {
      const prev = beforeRows.get(id);
      if (!prev) {
        counts.tasksAdded += 1;
        continue;
      }
      if (prev.hatId !== row.hatId) counts.tasksMoved += 1;
      if (prev.fields !== row.fields) counts.tasksChanged += 1;
    }
    for (const [id, row] of beforeRows) {
      if (!afterRows.has(id)) counts.tasksRemoved += 1;
      else if (fileHatSet.has(row.hatId) && !docTaskIds.has(id)) counts.tasksKept += 1;
    }

    const beforeHours = hoursByHat(was);
    const afterHours = hoursByHat(now);
    for (const hatId of new Set([...beforeHours.keys(), ...afterHours.keys()])) {
      if (!hatIds.has(hatId)) continue;
      if ((beforeHours.get(hatId) ?? 0) !== (afterHours.get(hatId) ?? 0)) counts.hoursChanged += 1;
    }
    const beforeDays = hoursByDay(was);
    const afterDays = hoursByDay(now);
    for (const slot of new Set([...beforeDays.keys(), ...afterDays.keys()])) {
      if (!hatIds.has(slot.split("|")[0])) continue;
      if ((beforeDays.get(slot) ?? 0) !== (afterDays.get(slot) ?? 0)) counts.daysChanged += 1;
    }
    if (was?.life?.capacityHours !== now?.life?.capacityHours) counts.capacityChanged += 1;
  }

  return {
    ok: true,
    data: merged,
    summary: {
      counts,
      areas: areaRows.slice(0, AREA_ROWS),
      areasOmitted: Math.max(0, areaRows.length - AREA_ROWS),
    },
  };
}
