export type OutlineItem = { id: string; text: string; level: number };
export type ContentBlock =
  | { id: string; type: "notes"; text: string; richText?: { version: 1; rtf: string } }
  | { id: string; type: "outline"; items: OutlineItem[] }
  | { id: string; type: "table"; cells: string[][] }
  | { id: string; type: "photo"; src: string }
  | { id: string; type: "file"; file: { id: string; name: string; mimeType: string; byteCount: number; checksum: string } };
export type TaskContent = { blocks: ContentBlock[] };
export type Task = {
  id: string;
  text: string;
  done: boolean;
  allocationId?: string;
  content?: TaskContent;
  /** Optional and informational: estimating does not reserve hours. */
  estimateMinutes?: number;
  /** Familiar red !; does not alter deadlines, effort or day allocations. */
  important?: boolean;
};
export type Hat = {
  id: string;
  name: string;
  defaultHours: number;
  color: string;
  category?: SpreadCategory;
};
/** A task removed from the active plan but recoverable for 30 days. */
export type DeletedTask = { id: string; hatId: string; weekKey: string; task: Task; deletedAt: number };
export type Box = { hatId: string; hours: number; tasks: Task[] };
export type Allocation = { id: string; hatId: string; day: string; hours: number; order: number };
/** Life is optional and week-local. Old profiles must not acquire an invented capacity. */
export type LifeWeekMetadata = { version: 1; capacityHours?: number; priorityRoleId?: string; priorityGoalHours?: number; priorityDay?: string };
/** dayTaskOrder affects only Week presentation, never the responsibility's canonical task order. */
/** A recurring commitment is a weekly hours budget, not a generated appointment or task. */
export type RecurringPlan = {
  id: string;
  roleId: string;
  startWeek: string;
  /** The first future week this rule controls. Non-occurrence weeks are zero, even before startWeek. */
  managedFromWeek?: string;
  everyWeeks: number;
  hours: number;
  capacityHours: number;
  endWeek?: string;
  /** Stop from this week (inclusive) without resurrecting the role's old default hours. */
  terminatedWeek?: string;
  /** Optional fixed days. When present, `hours` is their sum and each day is placed in generated weeks. */
  dayHours?: DayHours[];
};
/** Weekdays a plan can be set on, Monday first. Keys, so a plan means the same weekday in every week. */
export const PLAN_WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type PlanWeekday = (typeof PLAN_WEEKDAYS)[number];
/** Hours a responsibility is planned on one set day of an occurrence week. */
export type DayHours = { weekday: PlanWeekday; hours: number };
/** A day placement a rule created, kept so a later change can tell an untouched placement from an edited one. */
export type GeneratedDay = { id: string; day: string; hours: number };
/** Provenance lets a person override one week without changing future occurrences. */
export type RecurrenceSource = Record<string, {
  planId: string; generatedHours: number; manual?: boolean; generatedDays?: GeneratedDay[];
}>;
export type WeekData = {
  boxes: Box[];
  allocations: Allocation[];
  dayTaskOrder?: Record<string, string[]>;
  life?: LifeWeekMetadata;
  recurrenceSource?: RecurrenceSource;
  recurrenceIssue?: string;
};
export const TASK_ESTIMATE_CHOICES = [15, 30, 45, 60, 90, 120, 180, 240, 480] as const;
export type SpreadData = {
  hats: Hat[];
  weeks: Record<string, WeekData>;
  currentWeek: string;
  /** Saved in the same profile as weeks and roles, never a separate native store. */
  recurringPlans?: RecurringPlan[];
  /** Optional for backward compatibility with older backups, snapshots and synced profiles. */
  deletedTasks?: DeletedTask[];
};
export type License = { ok: true; plan: "demo" | "personal" };

export const STORE_KEY = "spread.v1";
export const LICENSE_KEY = "spread.license";
export const THEME_KEY = "spread.theme";

export const SPREAD_CATEGORIES = [
  { id: "work", label: "Work", color: "#34C759" },
  { id: "school", label: "School", color: "#007AFF" },
  { id: "home", label: "Home", color: "#FF9500" },
  { id: "health", label: "Health", color: "#30B0C7" },
  { id: "family", label: "Family", color: "#AF52DE" },
  { id: "fitness", label: "Fitness", color: "#FFCC00" },
  { id: "business", label: "Business", color: "#5856D6" },
  { id: "project", label: "Project", color: "#FF9F0A" },
  { id: "church", label: "Church", color: "#BF5AF2" },
  { id: "personal", label: "Personal", color: "#FF2D55" },
] as const;

export type SpreadCategory = (typeof SPREAD_CATEGORIES)[number]["id"];

export function isSpreadCategory(value: unknown): value is SpreadCategory {
  return SPREAD_CATEGORIES.some((item) => item.id === value);
}

export const ROLE_COLORS = [
  "#34C759",
  "#FF9500",
  "#007AFF",
  "#FF2D55",
  "#AF52DE",
  "#64D2FF",
  "#5856D6",
] as const;

const DEFAULT_SPREADS: { id: SpreadCategory; name: string; hours: number; color: string }[] = [
  { id: "work", name: "Work", hours: 8, color: "#34C759" },
  { id: "home", name: "Home", hours: 4, color: "#FF9500" },
  { id: "health", name: "Health", hours: 3, color: "#30B0C7" },
];

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function weekKey(d = new Date()) {
  return isoDate(weekStart(d));
}

export function shiftWeek(key: string, weeks: number) {
  const d = parseKey(key);
  d.setDate(d.getDate() + weeks * 7);
  return isoDate(d);
}

export function formatWeek(key: string) {
  const start = parseKey(key);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameYear = start.getFullYear() === end.getFullYear();
  const showYear = !sameYear || start.getFullYear() !== new Date().getFullYear();
  const left = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const right = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: showYear ? "numeric" : undefined,
  });
  return `${left} – ${right}`;
}

export function weekDays(key: string) {
  const monday = parseKey(key);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const labels = ["Sunday", "Saturday", "Friday", "Thursday", "Wednesday", "Tuesday", "Monday"] as const;
  return labels.map((label, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() - index);
    return { label, date: isoDate(date) };
  });
}

export function emptyContent(): TaskContent {
  return { blocks: [] };
}

export function spentHours(allocations: { hatId: string; hours: number }[], hatId: string) {
  return allocations.filter((item) => item.hatId === hatId).reduce((sum, item) => sum + item.hours, 0);
}

export function remainingHours(bank: number, allocations: { hatId: string; hours: number }[], hatId: string) {
  return Math.round((bank - spentHours(allocations, hatId)) * 2) / 2;
}

export function bankedHours(current: number, bank: number, spentByOthers: number, requested: number) {
  const next = clampHours(requested);
  if (next <= current) return next;
  return Math.min(next, Math.max(current, bank - spentByOthers));
}

export function depositHours(bank: number, spent: number, requested: number) {
  const room = bank - spent;
  if (room <= 0) return 0;
  return Math.min(clampHours(requested), room);
}

export function allocationHours(allocations: Allocation[], hatId: string, fallback: number) {
  const mine = allocations.filter((item) => item.hatId === hatId);
  if (mine.length === 0) return fallback;
  return mine.reduce((sum, item) => sum + item.hours, 0);
}

export function weekIsPopulated(week: WeekData | undefined) {
  if (!week) return false;
  if (week.allocations.length > 0) return true;
  return week.boxes.some((box) => box.tasks.length > 0);
}

export function cloneWeek(week: WeekData): WeekData {
  const allocationIds = new Map<string, string>();
  const allocations = week.allocations.map((allocation) => {
    const id = uid();
    allocationIds.set(allocation.id, id);
    return { ...allocation, id };
  });
  return {
    allocations,
    ...(week.life ? { life: { ...week.life } } : {}),
    // Fresh copies contain new task IDs and deliberately do not inherit old day display order.
    boxes: week.boxes.map((box) => ({
      hatId: box.hatId,
      hours: box.hours,
      tasks: box.tasks.map((task) => ({
        ...structuredClone(task),
        id: uid(),
        done: false,
        allocationId: task.allocationId ? allocationIds.get(task.allocationId) : undefined,
      })),
    })),
  };
}

export function syncAllocationHours(week: WeekData): WeekData {
  return week;
}

export function clampHours(n: number) {
  if (!Number.isFinite(n)) return 0;
  const stepped = Math.round(n * 2) / 2;
  return Math.min(40, Math.max(0, stepped));
}

export function defaultData(): SpreadData {
  const currentWeek = weekKey();
  const hats: Hat[] = DEFAULT_SPREADS.map((spread) => ({
    id: spread.id,
    name: spread.name,
    defaultHours: spread.hours,
    color: spread.color,
    category: spread.id,
  }));
  return {
    hats,
    currentWeek,
    weeks: {
      [currentWeek]: {
        boxes: hats.map((hat) => ({ hatId: hat.id, hours: hat.defaultHours, tasks: [] })),
        allocations: [],
      },
    },
  };
}

/** Whole-week UTC arithmetic avoids DST changing a biweekly cycle's parity. */
export function recurrenceWeekOffset(start: string, target: string): number {
  const day = (iso: string) => Date.parse(iso + "T12:00:00Z");
  return Math.round((day(target) - day(start)) / (7 * 86400000));
}

export function recurringForRole(data: Readonly<SpreadData>, roleId: string, key: string):
  { plan: RecurringPlan; hours: number } | null {
  // The latest series controls this role after its start, including weeks following
  // a finite end or an explicit stop. Those weeks have zero recurring hours.
  const plan = (data.recurringPlans ?? [])
    .filter((p) => p.roleId === roleId && key >= (p.managedFromWeek ?? p.startWeek))
    .sort((a, b) => b.startWeek.localeCompare(a.startWeek))[0];
  if (!plan) return null;
  if (key < plan.startWeek ||
      (plan.endWeek !== undefined && key > plan.endWeek) ||
      (plan.terminatedWeek !== undefined && key >= plan.terminatedWeek))
    return { plan, hours: 0 };
  const offset = recurrenceWeekOffset(plan.startWeek, key);
  return { plan, hours: offset >= 0 && offset % plan.everyWeeks === 0 ? plan.hours : 0 };
}

export function validRecurringPlan(value: unknown): value is RecurringPlan {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<RecurringPlan>;
  const validWeek = (key: unknown) => typeof key === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    Number.isFinite(Date.parse(key + "T12:00:00Z")) && weekKey(parseKey(key)) === key;
  return typeof p.id === "string" && p.id.length > 0 &&
    typeof p.roleId === "string" && p.roleId.length > 0 &&
    validWeek(p.startWeek) &&
    (p.managedFromWeek === undefined || (validWeek(p.managedFromWeek) && p.managedFromWeek <= p.startWeek!)) &&
    (p.endWeek === undefined || (validWeek(p.endWeek) && p.endWeek >= p.startWeek!)) &&
    (p.terminatedWeek === undefined || (validWeek(p.terminatedWeek) && p.terminatedWeek >= p.startWeek!)) &&
    Number.isInteger(p.everyWeeks) && p.everyWeeks! >= 1 && p.everyWeeks! <= 12 &&
    Number.isFinite(p.hours) && p.hours! > 0 && p.hours! <= 168 && Number.isInteger(p.hours! * 2) &&
    Number.isFinite(p.capacityHours) && p.capacityHours! >= 0 &&
    p.capacityHours! <= 168 && Number.isInteger(p.capacityHours! * 2) &&
    (p.dayHours === undefined || validDayHours(p.dayHours, p.hours!));
}

/** Each set day once, a positive half-hour amount, and a weekly total equal to their sum. */
export function validDayHours(value: unknown, total: number): value is DayHours[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 7) return false;
  const seen = new Set<string>();
  let sum = 0;
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return false;
    const { weekday, hours } = entry as Partial<DayHours>;
    if (typeof weekday !== "string" || !(PLAN_WEEKDAYS as readonly string[]).includes(weekday) || seen.has(weekday)) return false;
    if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0 || hours > 24 || !Number.isInteger(hours * 2)) return false;
    seen.add(weekday);
    sum += hours;
  }
  return sum === total;
}

/** A plan whose set days no longer fit keeps its weekly hours and loses only the days. */
export function withValidDays(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const plan = value as Partial<RecurringPlan>;
  if (plan.dayHours === undefined || validDayHours(plan.dayHours, plan.hours as number)) return value;
  const { dayHours: _dropped, ...rest } = plan;
  void _dropped;
  return rest;
}

export function isGeneratedDay(value: unknown): value is GeneratedDay {
  const entry = value as Partial<GeneratedDay> | null;
  return !!entry && typeof entry === "object" && typeof entry.id === "string" &&
    typeof entry.day === "string" && typeof entry.hours === "number" && Number.isFinite(entry.hours);
}

/** ISO date of a set weekday inside the week that starts on `key` (a Monday). */
export function planDayIso(key: string, weekday: PlanWeekday): string {
  const monday = parseKey(key);
  const date = new Date(monday);
  date.setDate(monday.getDate() + PLAN_WEEKDAYS.indexOf(weekday));
  return isoDate(date);
}

/** Day placements for one occurrence week, Monday first. Pure. */
export function planPlacements(key: string, dayHours: DayHours[]): { day: string; hours: number }[] {
  return [...dayHours]
    .sort((a, b) => PLAN_WEEKDAYS.indexOf(a.weekday) - PLAN_WEEKDAYS.indexOf(b.weekday))
    .map((entry) => ({ day: planDayIso(key, entry.weekday), hours: entry.hours }));
}

/** Allocations a rule places for one responsibility, appended after whatever already sits on each day. */
export function plannedAllocations(key: string, hatId: string, dayHours: DayHours[], existing: Allocation[]): Allocation[] {
  const nextOrder = new Map<string, number>();
  for (const item of existing) nextOrder.set(item.day, Math.max(nextOrder.get(item.day) ?? -1, item.order));
  return planPlacements(key, dayHours).map(({ day, hours }) => {
    const order = (nextOrder.get(day) ?? -1) + 1;
    nextOrder.set(day, order);
    return { id: uid(), hatId, day, hours, order };
  });
}

/**
 * A week the person has not changed: default hours, no tasks, no placements, no life total,
 * and no rule has written to it. Opening a week stores it, so an untouched week must not
 * block a schedule that is created or edited later.
 */
export function untouchedWeek(week: WeekData, hats: SpreadData["hats"]): boolean {
  return Object.keys(week.recurrenceSource ?? {}).length === 0 && week.life === undefined &&
    week.allocations.length === 0 &&
    week.boxes.every((box) => box.tasks.length === 0 &&
      box.hours === (hats.find((hat) => hat.id === box.hatId)?.defaultHours ?? box.hours));
}

/**
 * An opened-but-empty week that a schedule now covers with hours. It holds nothing of the person's,
 * so it is seeded exactly as if it had never been stored. This repairs a week an earlier build left
 * empty, including the week that is open while the person edits the schedule.
 */
function emptyWeekUnderPlan(data: SpreadData, week: WeekData, key: string): boolean {
  return untouchedWeek(week, data.hats) &&
    data.hats.some((hat) => (recurringForRole(data, hat.id, key)?.hours ?? 0) > 0);
}

export function ensureWeek(data: SpreadData): SpreadData {
  const key = data.currentWeek || weekKey();
  const existing = data.weeks[key];
  if (!existing || emptyWeekUnderPlan(data, existing, key)) {
    const matched = data.hats.map((hat) => ({ hat, match: recurringForRole(data, hat.id, key) }));
    const active = matched.filter((entry) => entry.match !== null);
    const capacity = active[0]?.match?.plan.capacityHours;
    const consistent = active.every((entry) => entry.match?.plan.capacityHours === capacity);
    const plannedTotal = matched.reduce((sum, entry) => sum + (entry.match?.hours ?? entry.hat.defaultHours), 0);
    const valid = active.length === 0 || (consistent && capacity !== undefined && plannedTotal <= capacity);
    // Fail visibly rather than silently expanding a person's weekly capacity.
    const usePlan = active.length > 0 && valid;
    // Fixed days are placed only in an occurrence week, and each placement is recorded for reconciliation.
    const allocations: Allocation[] = [];
    const recurrenceSource: RecurrenceSource = {};
    if (usePlan) {
      for (const { hat, match } of active) {
        const placed = match!.hours > 0 ? plannedAllocations(key, hat.id, match!.plan.dayHours ?? [], allocations) : [];
        allocations.push(...placed);
        recurrenceSource[hat.id] = { planId: match!.plan.id, generatedHours: match!.hours,
          ...(placed.length ? { generatedDays: placed.map(({ id, day, hours }) => ({ id, day, hours })) } : {}) };
      }
    }
    const week: WeekData = {
      boxes: matched.map(({ hat, match }) => ({
        hatId: hat.id, hours: usePlan ? (match?.hours ?? hat.defaultHours) : hat.defaultHours, tasks: [],
      })),
      allocations,
      ...(usePlan ? {
        life: { version: 1 as const, capacityHours: capacity },
        recurrenceSource,
      } : {}),
      ...(!valid ? { recurrenceIssue: "Recurring hours do not fit this week's total. Review Plan Ahead." } : {}),
    };
    return { ...data, currentWeek: key, weeks: { ...data.weeks, [key]: week } };
  }
  const boxes = existing.boxes.slice();
  for (const hat of data.hats) {
    if (!boxes.some((box) => box.hatId === hat.id)) {
      boxes.push({ hatId: hat.id, hours: hat.defaultHours, tasks: [] });
    }
  }
  return {
    ...data,
    currentWeek: key,
    // Keep every other week field (dayTaskOrder): rebuilding only boxes and allocations
    // silently dropped the person's Week day order on every load and sync.
    weeks: { ...data.weeks, [key]: { ...existing, boxes, allocations: existing.allocations ?? [] } },
  };
}

export function normalizeData(raw: unknown): SpreadData {
  if (!raw || typeof raw !== "object") return defaultData();
  const value = raw as Partial<SpreadData>;
  const hats = Array.isArray(value.hats) ? value.hats.filter(isHat).map(normalizeHat) : [];
  const weeks: Record<string, WeekData> = {};
  if (value.weeks && typeof value.weeks === "object") {
    for (const [key, week] of Object.entries(value.weeks)) {
      if (!week || !Array.isArray(week.boxes)) continue;
      const allocations = (Array.isArray(week.allocations) ? week.allocations.filter(isAllocation) : []).map(
        (item, index) => ({ ...item, order: typeof item.order === "number" ? item.order : index }),
      );
      weeks[key] = {
        boxes: week.boxes.filter(isBox).map((box) => (week.life ? normalizeBox(box) : restoreBank(normalizeBox(box), allocations, hats))),
        allocations,
        ...(week.dayTaskOrder && typeof week.dayTaskOrder === "object"
          ? { dayTaskOrder: normalizeDayTaskOrder(week.dayTaskOrder) } : {}),
        ...(normalizeLifeWeek(week.life) ? { life: normalizeLifeWeek(week.life) } : {}),
        ...(week.recurrenceSource && typeof week.recurrenceSource === "object" ? {
          recurrenceSource: Object.fromEntries(
            Object.entries(week.recurrenceSource).filter(([, entry]) =>
              !!entry && typeof entry.planId === "string" &&
              typeof entry.generatedHours === "number" && Number.isFinite(entry.generatedHours))
              .map(([roleId, entry]) => [roleId, {
                planId: entry.planId, generatedHours: entry.generatedHours,
                ...(entry.manual ? { manual: true } : {}),
                ...(Array.isArray(entry.generatedDays)
                  ? { generatedDays: (entry.generatedDays as unknown[]).filter(isGeneratedDay) } : {}),
              }]),
          ),
        } : {}),
        ...(typeof week.recurrenceIssue === "string" ? { recurrenceIssue: week.recurrenceIssue } : {}),
      };
    }
  }
  const currentWeek = typeof value.currentWeek === "string" ? value.currentWeek : weekKey();
  const recurringPlans = Array.isArray(value.recurringPlans)
    ? value.recurringPlans.map(withValidDays).filter(validRecurringPlan).filter((p) => hats.some((h) => h.id === p.roleId))
    : [];
  const result = ensureWeek({
    hats, weeks: repairDuplicateIds(weeks), currentWeek,
    ...(recurringPlans.length ? { recurringPlans } : {}),
  });
  const deletedTasks = Array.isArray(value.deletedTasks)
    ? value.deletedTasks.filter(isDeletedTask).map((entry) => ({
        id: entry.id,
        hatId: entry.hatId,
        weekKey: entry.weekKey,
        deletedAt: entry.deletedAt,
        task: normalizeTask(entry.task),
      }))
    : undefined;
  return deletedTasks === undefined ? result : { ...result, deletedTasks };
}

/**
 * A task or allocation id must name exactly one thing: sync addresses them by id alone. Older
 * versions of "copy last week" reused ids across weeks. The first occurrence (oldest week first)
 * keeps its id; later ones get `<id>~<week>`, and a task keeps pointing at the allocation in its
 * own week. Deterministic, so two devices repair the same planner to the same ids, and a planner
 * with unique ids is returned untouched.
 */
export function repairDuplicateIds(weeks: Record<string, WeekData>): Record<string, WeekData> {
  const seenTasks = new Set<string>();
  const seenAllocs = new Set<string>();
  const taken = new Set<string>();
  for (const week of Object.values(weeks)) {
    for (const a of week.allocations) taken.add(a.id);
    for (const box of week.boxes) for (const t of box.tasks) taken.add(t.id);
  }
  const fresh = (id: string, key: string) => {
    let candidate = `${id}~${key}`;
    for (let n = 2; taken.has(candidate); n += 1) candidate = `${id}~${key}~${n}`;
    taken.add(candidate);
    return candidate;
  };
  let changed = false;
  const out: Record<string, WeekData> = {};
  for (const key of Object.keys(weeks).sort()) {
    const week = weeks[key];
    const renamed = new Map<string, string>();
    const allocations = week.allocations.map((a) => {
      if (!seenAllocs.has(a.id)) {
        seenAllocs.add(a.id);
        return a;
      }
      const id = fresh(a.id, key);
      renamed.set(a.id, id);
      changed = true;
      return { ...a, id };
    });
    const boxes = week.boxes.map((box) => ({
      ...box,
      tasks: box.tasks.map((t) => {
        const allocationId = t.allocationId !== undefined && renamed.has(t.allocationId) ? renamed.get(t.allocationId) : t.allocationId;
        if (!seenTasks.has(t.id)) {
          seenTasks.add(t.id);
          return allocationId === t.allocationId ? t : { ...t, allocationId };
        }
        changed = true;
        return { ...t, id: fresh(t.id, key), allocationId };
      }),
    }));
    out[key] = { ...week, allocations, boxes };
  }
  return changed ? out : weeks;
}

function normalizeHat(hat: Hat): Hat {
  const next: Hat = {
    id: hat.id,
    name: hat.name,
    defaultHours: hat.defaultHours,
    color: typeof hat.color === "string" ? hat.color : ROLE_COLORS[0],
  };
  const category = isSpreadCategory(hat.category) ? hat.category : isSpreadCategory(hat.id) ? hat.id : undefined;
  if (category) next.category = category;
  return next;
}

function isHat(value: unknown): value is Hat {
  if (!value || typeof value !== "object") return false;
  const hat = value as Hat;
  return typeof hat.id === "string" && typeof hat.name === "string" && typeof hat.defaultHours === "number";
}

function isBox(value: unknown): value is Box {
  if (!value || typeof value !== "object") return false;
  const box = value as Box;
  return typeof box.hatId === "string" && typeof box.hours === "number" && Array.isArray(box.tasks);
}

function normalizeBox(box: Box): Box {
  return {
    hatId: box.hatId,
    hours: box.hours,
    tasks: box.tasks.filter(isTask).map(normalizeTask),
  };
}

function restoreBank(box: Box, allocations: { hatId: string; hours: number }[], hats: Hat[]) {
  const spent = spentHours(allocations, box.hatId);
  const hat = hats.find((item) => item.id === box.hatId);
  if (hat && spent > 0 && box.hours === spent && hat.defaultHours > box.hours) {
    return { ...box, hours: hat.defaultHours };
  }
  return box;
}

/** Invalid/unknown versions are ignored, without rewriting the source profile on view. */
function normalizeLifeWeek(raw: unknown): LifeWeekMetadata | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const life = raw as Partial<LifeWeekMetadata>;
  if (life.version !== 1) return structuredClone(raw) as LifeWeekMetadata;
  const capacity = life.capacityHours;
  return {
    ...structuredClone(life),
    version: 1,
    ...(typeof capacity === "number" && Number.isFinite(capacity) && capacity >= 0 &&
        capacity <= 168 && Number.isInteger(capacity * 2) ? { capacityHours: capacity } : {}),
    ...(typeof life.priorityRoleId === "string" && life.priorityRoleId.length <= 200
      ? { priorityRoleId: life.priorityRoleId } : {}),
  };
}

function normalizeDayTaskOrder(value: Record<string, unknown>): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  for (const [key, ids] of Object.entries(value)) {
    if (key.length > 140 || !Array.isArray(ids)) continue;
    order[key] = [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length <= 200))].slice(0, 10000);
  }
  return order;
}

function isDeletedTask(value: unknown): value is DeletedTask {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DeletedTask>;
  return typeof item.id === "string" && typeof item.hatId === "string"
    && typeof item.weekKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.weekKey)
    && typeof item.deletedAt === "number" && Number.isFinite(item.deletedAt)
    && isTask(item.task);
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Task;
  return typeof task.id === "string" && typeof task.text === "string";
}

function normalizeTask(task: Task): Task {
  const next: Task = { ...structuredClone(task), id: task.id, text: task.text, done: Boolean(task.done) };
  if (typeof task.allocationId === "string") next.allocationId = task.allocationId;
  if (task.content) next.content = normalizeContent(task.content);
  if (typeof task.important === "boolean") next.important = task.important;
  else delete next.important;
  if (TASK_ESTIMATE_CHOICES.some((v) => v === task.estimateMinutes)) next.estimateMinutes = task.estimateMinutes;
  else delete next.estimateMinutes;
  return next;
}

function normalizeContent(value: unknown): TaskContent {
  if (!value || typeof value !== "object") return emptyContent();
  const raw = value as {
    blocks?: unknown;
    bullets?: { id?: string; text?: string }[];
    outline?: { id?: string; text?: string; children?: unknown[] }[];
    table?: { cells?: unknown[] };
    photo?: string;
  };
  if (Array.isArray(raw.blocks)) {
    return { ...structuredClone(raw), blocks: raw.blocks.map(normalizeBlock).filter((block) => block !== null) };
  }
  const blocks: ContentBlock[] = [];
  if (Array.isArray(raw.bullets)) {
    const text = raw.bullets
      .map((item) => (item && typeof item.text === "string" ? item.text : ""))
      .filter(Boolean)
      .join("\n");
    if (text) blocks.push({ id: uid(), type: "notes", text });
  }
  if (Array.isArray(raw.outline) && raw.outline.length > 0) {
    const items: OutlineItem[] = [];
    walkOutline(raw.outline, 0, items);
    if (items.length > 0) blocks.push({ id: uid(), type: "outline", items });
  }
  const cells = rectangular(raw.table?.cells);
  if (cells) blocks.push({ id: uid(), type: "table", cells });
  if (typeof raw.photo === "string" && raw.photo.startsWith("data:image/")) {
    blocks.push({ id: uid(), type: "photo", src: raw.photo });
  }
  return { blocks };
}

function normalizeBlock(value: unknown): ContentBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as ContentBlock;
  if (typeof block.id !== "string") return null;
  if (block.type === "notes" && typeof block.text === "string") return { ...structuredClone(block), id: block.id, type: "notes", text: block.text };
  if (block.type === "outline" && Array.isArray(block.items)) {
    const items = block.items
      .filter((item) => item && typeof item.id === "string" && typeof item.text === "string")
      .map((item) => ({ id: item.id, text: item.text, level: Math.min(4, Math.max(0, Number(item.level) || 0)) }));
    return { ...structuredClone(block), id: block.id, type: "outline", items };
  }
  if (block.type === "table") {
    const cells = rectangular(block.cells);
    if (!cells) return null;
    return { ...structuredClone(block), id: block.id, type: "table", cells };
  }
  if (block.type === "photo" && typeof block.src === "string" && (block.src === "" || block.src.startsWith("data:image/"))) {
    return { ...structuredClone(block), id: block.id, type: "photo", src: block.src };
  }
  // Future block types stay intact and are rendered read-only by older editors.
  return structuredClone(value) as ContentBlock;
}

function walkOutline(nodes: { id?: string; text?: string; children?: unknown[] }[], level: number, items: OutlineItem[]) {
  for (const node of nodes) {
    if (!node || typeof node.text !== "string") continue;
    items.push({ id: typeof node.id === "string" ? node.id : uid(), text: node.text, level: Math.min(4, level) });
    if (Array.isArray(node.children)) walkOutline(node.children as { id?: string; text?: string; children?: unknown[] }[], level + 1, items);
  }
}

function rectangular(value: unknown): string[][] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const rows = value.filter((row) => Array.isArray(row)).map((row) => row.map((cell) => String(cell ?? "")));
  const width = rows[0]?.length ?? 0;
  if (width === 0 || rows.some((row) => row.length !== width)) return null;
  return rows;
}

function isAllocation(value: unknown): value is Allocation {
  if (!value || typeof value !== "object") return false;
  const item = value as Allocation;
  return (
    typeof item.id === "string" &&
    typeof item.hatId === "string" &&
    typeof item.day === "string" &&
    typeof item.hours === "number"
  );
}
