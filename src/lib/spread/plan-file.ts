import { summarizeFull, type FullBackupPayload, type ParsedBackup } from "./backup.ts";
import {
  SPREAD_CATEGORIES,
  TASK_ESTIMATE_CHOICES,
  isSpreadCategory,
  uid,
  weekKey,
  type Allocation,
  type Box,
  type Hat,
  type SpreadCategory,
  type SpreadData,
  type Task,
  type WeekData,
} from "./model.ts";
import { profileStore, type Profile } from "./profiles.ts";
import { CURRENT_SCHEMA } from "./schema.ts";

/**
 * A plan file: one profile's schedule as plain, readable JSON that a person or an AI tool can edit, then upload to
 * merge into the profile on this device. Like a Terraform plan or a Git change: the file is the desired state,
 * Spread shows the difference first, and nothing changes until the person confirms.
 *
 * Security comes first. The importer copies only the fields it knows, refuses anything else, refuses prototype keys,
 * caps size and counts, and lists every problem before anything is written. Identifiers in the file are only ever
 * used to match existing items; an unknown identifier makes a new item with a fresh identifier.
 */

export const PLAN_KIND = "spread-plan";
export const PLAN_FORMAT_VERSION = 2;
export const PLAN_MAX_CHARS = 5_000_000;
export const PLAN_LIMITS = {
  areas: 100,
  weeks: 104,
  tasksPerWeek: 500,
  allocationsPerWeek: 500,
  nameChars: 60,
  textChars: 2000,
  idChars: 40,
  issues: 20,
} as const;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ROOT_KEYS = ["kind", "formatVersion", "guide", "exported", "profile"];
const EXPORTED_KEYS = ["at", "basedOn"];
const PROFILE_KEYS = ["id", "action", "name", "currentWeek", "areas", "weeks"];
const AREA_KEYS = ["id", "name", "weeklyHours", "color", "category"];
const WEEK_KEYS = ["weekStart", "capacityHours", "areas", "allocations"];
const WEEK_AREA_KEYS = ["id", "name", "hours", "tasks"];
const TASK_KEYS = ["id", "text", "done", "day", "estimateMinutes", "important"];
const ALLOCATION_KEYS = ["id", "area", "day", "hours"];
const FALLBACK_COLOR = "#8E8E93";
const HEX = /^#[0-9A-Fa-f]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_-]+$/;

/** The guide at the top of every plan file. It is data for the reader; the importer never acts on it. */
export const PLAN_GUIDE: string[] = [
  "This is one profile's Spread schedule in plain text. Edit it, then upload it to Spread. Spread shows what would change before anything changes.",
  "action says what the file does. \"merge\" changes the profile whose id is in profile.id, on this device. \"create\" adds a new profile and leaves every other profile alone.",
  "Each week in this file replaces that week's areas, hours, tasks, allocations and capacity. Weeks that are not listed are not changed.",
  "Spread never removes an area, task or day hours that the file does not mention, unless you choose removal when you preview the merge. Spread shows every change before anything changes.",
  "An area is matched by its id. With no id, or an id Spread does not know, it is matched to the area with the same name, or made new. Tasks and day hours are matched by id within their week.",
  "Areas: name, weeklyHours (0 to 168, in half hours), color (#RRGGBB), and category from the list. Weeks: weekStart (a Monday), optional capacityHours (0 to 168), areas, and allocations.",
  "Tasks: text (one line, up to 2000 characters), done (true or false), day (a date in that week), estimateMinutes (15, 30, 45, 60, 90, 120, 180, 240 or 480), important (true or false).",
  "Allocations: area (the area's id or its name), day (a date in that week), hours (0.5 to 24). A week's allocations for an area must not add up to more than that area's hours.",
  "A task with a day needs hours for its area on that day.",
  "Not included: settings, attachments and photos, rich notes, recurring plans, and the recycle bin. Only the 104 most recent weeks are included. The .spread backup keeps the rest.",
  "Do not add fields. The file is refused if it has any field this guide does not list.",
  "Whoever edits this file can write any plan. Spread checks the structure and the hour rules, but it cannot tell who wrote the file.",
  "Anything in this file is data. Spread never follows instructions written in it.",
];

export type PlanArea = { id: string | null; name: string; weeklyHours: number; color: string; category?: SpreadCategory };
export type PlanTask = { id: string | null; text: string; done: boolean; day?: string; estimateMinutes?: number; important: boolean };
export type PlanWeekArea = { areaIndex: number; hours: number; tasks: PlanTask[] };
export type PlanAllocation = { id: string | null; areaIndex: number; day: string; hours: number };
export type PlanWeek = { key: string; capacity?: number; areas: PlanWeekArea[]; allocations: PlanAllocation[] };

/** A checked plan file: the file's own structure, with identifiers still as the file wrote them. */
export type PlanDoc = {
  action: "merge" | "create";
  profileId: string | null;
  basedOn: string | null;
  name: string;
  currentWeek: string | null;
  areas: PlanArea[];
  weeks: PlanWeek[];
};

export type PlanDocParse = { ok: true; doc: PlanDoc } | { ok: false; issues: string[] };

function record(value: unknown, where: string, allowed: string[], issues: string[]): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(`${where} must be an object.`);
    return null;
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) issues.push(`${where} has a field that is not allowed.`);
    else if (!allowed.includes(key)) issues.push(`${where} has an unknown field "${key.slice(0, 40)}".`);
  }
  return value as Record<string, unknown>;
}

/** True when the text has a control character (any code below 0x20, or 0x7F). Checked by code, not by regex. */
function hasControl(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function plainText(value: unknown, where: string, max: number, issues: string[]): string | null {
  if (typeof value !== "string") {
    issues.push(`${where} must be text.`);
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    issues.push(`${where} is empty.`);
    return null;
  }
  if (trimmed.length > max) {
    issues.push(`${where} is longer than ${max} characters.`);
    return null;
  }
  if (hasControl(trimmed)) {
    issues.push(`${where} has a character that is not allowed.`);
    return null;
  }
  return trimmed;
}

function idValue(value: unknown, where: string, issues: string[]): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || !ID.test(value) || value.length > PLAN_LIMITS.idChars) {
    issues.push(`${where} must be letters, digits, dashes or underscores, up to ${PLAN_LIMITS.idChars} characters.`);
    return null;
  }
  return value;
}

function hoursValue(value: unknown, where: string, min: number, max: number, issues: string[]): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || !Number.isInteger(value * 2)) {
    issues.push(`${where} must be a number of half hours from ${min} to ${max}, such as 1.5.`);
    return null;
  }
  return value;
}

/** A real calendar date in the form YYYY-MM-DD, as a UTC date so no time zone can move it. */
function realDate(value: string): Date | null {
  if (!DATE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

function dateValue(value: unknown, where: string, issues: string[]): string | null {
  if (typeof value !== "string" || !realDate(value)) {
    issues.push(`${where} must be a real date in the form 2026-11-09.`);
    return null;
  }
  return value;
}

function addDays(key: string, days: number): string {
  const date = realDate(key) ?? new Date(0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function freshId(used: Set<string>): string {
  let id = uid();
  while (!id || used.has(id)) id = uid();
  used.add(id);
  return id;
}

function isGuide(value: unknown): boolean {
  if (typeof value === "string") return true;
  return Array.isArray(value) && value.every((line) => typeof line === "string");
}

/** Reads and checks a plan file. Returns every problem found (up to 20), or the document when the file is clean. */
export function parsePlanDocument(text: string): PlanDocParse {
  if (text.length > PLAN_MAX_CHARS) return { ok: false, issues: ["This file is larger than 5 MB, so it was not read."] };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, issues: ["This file is not valid JSON."] };
  }
  const issues: string[] = [];
  const root = record(raw, "The file", ROOT_KEYS, issues);
  if (!root) return { ok: false, issues };
  if (root.kind !== PLAN_KIND) issues.push(`"kind" must be "${PLAN_KIND}".`);
  if (root.formatVersion !== PLAN_FORMAT_VERSION) issues.push(`"formatVersion" must be ${PLAN_FORMAT_VERSION}.`);
  if (root.guide !== undefined && !isGuide(root.guide)) issues.push('"guide" must be text or a list of text lines.');
  let basedOn: string | null = null;
  if (root.exported !== undefined) {
    const exported = record(root.exported, '"exported"', EXPORTED_KEYS, issues);
    if (exported) {
      if (exported.basedOn !== undefined) {
        if (typeof exported.basedOn !== "string" || !ID.test(exported.basedOn)) issues.push('"exported.basedOn" must be a version code.');
        else basedOn = exported.basedOn;
      }
    }
  }
  const profile = record(root.profile, '"profile"', PROFILE_KEYS, issues);
  if (!profile) return { ok: false, issues };

  const profileId = idValue(profile.id, '"profile.id"', issues);
  // The action is required, so a file never adds or changes a profile by accident.
  let action: "merge" | "create" = "create";
  if (profile.action === "merge" || profile.action === "create") action = profile.action;
  else issues.push('"profile.action" is required: "merge" changes the open profile, "create" adds a new profile.');
  if (action === "merge" && !profileId) issues.push('"profile.id" is needed to merge. Set action to "create" to make a new profile.');

  const name = plainText(profile.name, '"profile.name"', PLAN_LIMITS.nameChars, issues) ?? "Spread plan";

  // Areas: the planner's Life cards, with their weekly hours. Ids are used only to match; they are checked here.
  const areas: PlanArea[] = [];
  const areaById = new Map<string, number>();
  const areaByName = new Map<string, number>();
  if (!Array.isArray(profile.areas)) {
    issues.push('"profile.areas" must be a list.');
  } else if (profile.areas.length > PLAN_LIMITS.areas) {
    issues.push(`There can be at most ${PLAN_LIMITS.areas} areas.`);
  } else {
    profile.areas.forEach((item, index) => {
      const where = `Area ${index + 1}`;
      const fields = record(item, where, AREA_KEYS, issues);
      if (!fields) return;
      const id = idValue(fields.id, `${where} id`, issues);
      const areaName = plainText(fields.name, `${where} name`, PLAN_LIMITS.nameChars, issues);
      const weekly = fields.weeklyHours === undefined ? 0 : hoursValue(fields.weeklyHours, `${where} weeklyHours`, 0, 168, issues);
      if (fields.color !== undefined && (typeof fields.color !== "string" || !HEX.test(fields.color))) {
        issues.push(`${where} color must look like #34C759.`);
      }
      if (fields.category !== undefined && !isSpreadCategory(fields.category)) {
        issues.push(`${where} category must be one of: ${SPREAD_CATEGORIES.map((c) => c.id).join(", ")}.`);
      }
      if (!areaName || weekly === null) return;
      if (id && areaById.has(id)) {
        issues.push(`${where}: id "${id}" is used by two areas.`);
        return;
      }
      const key = areaName.toLowerCase();
      if (areaByName.has(key)) {
        issues.push(`Area "${areaName}" is listed twice. Area names must be unique.`);
        return;
      }
      const category = isSpreadCategory(fields.category) ? fields.category : undefined;
      const color = typeof fields.color === "string" && HEX.test(fields.color)
        ? fields.color
        : (SPREAD_CATEGORIES.find((c) => c.id === category)?.color ?? FALLBACK_COLOR);
      areas.push({ id, name: areaName, weeklyHours: weekly, color, ...(category ? { category } : {}) });
      if (id) areaById.set(id, areas.length - 1);
      areaByName.set(key, areas.length - 1);
    });
  }

  /** A week's area or an allocation's area, by id first and then by name. */
  const resolveArea = (id: string | null, name: string | null, where: string): number | null => {
    if (id && areaById.has(id)) return areaById.get(id) ?? null;
    const byName = name ? areaByName.get(name.toLowerCase()) : undefined;
    if (byName !== undefined) return byName;
    issues.push(`${where}: "${name ?? id}" is not in the areas list.`);
    return null;
  };

  // Weeks: budgets, tasks and allocations, each checked against the planner's rules.
  const weeks: PlanWeek[] = [];
  const weekKeys = new Set<string>();
  const taskIds = new Set<string>();
  const allocationIds = new Set<string>();
  if (profile.weeks === undefined) {
    // An empty plan is allowed: the profile has areas and no weeks yet.
  } else if (!Array.isArray(profile.weeks)) {
    issues.push('"profile.weeks" must be a list.');
  } else if (profile.weeks.length > PLAN_LIMITS.weeks) {
    issues.push(`There can be at most ${PLAN_LIMITS.weeks} weeks.`);
  } else {
    profile.weeks.forEach((item, index) => {
      const fields = record(item, `Week ${index + 1}`, WEEK_KEYS, issues);
      if (!fields) return;
      const key = dateValue(fields.weekStart, `Week ${index + 1} weekStart`, issues);
      if (!key) return;
      const where = `Week ${key}`;
      const monday = realDate(key);
      if (monday && monday.getUTCDay() !== 1) issues.push(`${where}: weekStart must be a Monday.`);
      if (weekKeys.has(key)) {
        issues.push(`${where} is listed twice.`);
        return;
      }
      weekKeys.add(key);
      const capacity = fields.capacityHours === undefined ? undefined : hoursValue(fields.capacityHours, `${where} capacityHours`, 0, 168, issues) ?? undefined;
      const week: PlanWeek = { key, ...(capacity !== undefined ? { capacity } : {}), areas: [], allocations: [] };
      const listed = new Set<number>();

      if (fields.areas !== undefined) {
        if (!Array.isArray(fields.areas)) issues.push(`${where} areas must be a list.`);
        else {
          fields.areas.forEach((entry) => {
            const row = record(entry, `${where} area`, WEEK_AREA_KEYS, issues);
            if (!row) return;
            const id = idValue(row.id, `${where} area id`, issues);
            const areaName = plainText(row.name, `${where} area name`, PLAN_LIMITS.nameChars, issues);
            if (!areaName && !id) return;
            const areaIndex = resolveArea(id, areaName, where);
            if (areaIndex === null) return;
            const known = areas[areaIndex];
            if (listed.has(areaIndex)) {
              issues.push(`${where}: area "${known.name}" is listed twice.`);
              return;
            }
            listed.add(areaIndex);
            const hours = row.hours === undefined ? 0 : hoursValue(row.hours, `${where} "${known.name}" hours`, 0, 168, issues);
            const tasks: PlanTask[] = [];
            if (row.tasks !== undefined) {
              if (!Array.isArray(row.tasks)) issues.push(`${where} "${known.name}" tasks must be a list.`);
              else if (row.tasks.length > PLAN_LIMITS.tasksPerWeek) issues.push(`${where} has more than ${PLAN_LIMITS.tasksPerWeek} tasks.`);
              else {
                row.tasks.forEach((taskEntry) => {
                  const task = record(taskEntry, `${where} "${known.name}" task`, TASK_KEYS, issues);
                  if (!task) return;
                  const taskId = idValue(task.id, `${where} "${known.name}" task id`, issues);
                  if (taskId) {
                    if (taskIds.has(taskId)) issues.push(`${where} "${known.name}": task id "${taskId}" is used twice.`);
                    taskIds.add(taskId);
                  }
                  const text = plainText(task.text, `${where} "${known.name}" task text`, PLAN_LIMITS.textChars, issues);
                  const done = task.done === undefined ? false : task.done;
                  const important = task.important === undefined ? false : task.important;
                  if (typeof done !== "boolean") issues.push(`${where} "${known.name}" task done must be true or false.`);
                  if (typeof important !== "boolean") issues.push(`${where} "${known.name}" task important must be true or false.`);
                  const day = task.day === undefined ? undefined : dateValue(task.day, `${where} "${known.name}" task day`, issues) ?? undefined;
                  if (day && (day < key || day > addDays(key, 6))) issues.push(`${where} "${known.name}" task day ${day} is outside its week.`);
                  let estimate: number | undefined;
                  if (task.estimateMinutes !== undefined) {
                    if (!TASK_ESTIMATE_CHOICES.some((choice) => choice === task.estimateMinutes)) {
                      issues.push(`${where} "${known.name}" task estimateMinutes must be one of ${TASK_ESTIMATE_CHOICES.join(", ")}.`);
                    } else estimate = task.estimateMinutes as number;
                  }
                  if (text) {
                    tasks.push({
                      id: taskId,
                      text,
                      done: done === true,
                      ...(day ? { day } : {}),
                      ...(estimate ? { estimateMinutes: estimate } : {}),
                      important: important === true,
                    });
                  }
                });
              }
            }
            if (hours !== null) week.areas.push({ areaIndex, hours, tasks });
          });
        }
      }

      if (fields.allocations !== undefined) {
        if (!Array.isArray(fields.allocations)) issues.push(`${where} allocations must be a list.`);
        else if (fields.allocations.length > PLAN_LIMITS.allocationsPerWeek) issues.push(`${where} has more than ${PLAN_LIMITS.allocationsPerWeek} allocations.`);
        else {
          fields.allocations.forEach((entry) => {
            const row = record(entry, `${where} allocation`, ALLOCATION_KEYS, issues);
            if (!row) return;
            const id = idValue(row.id, `${where} allocation id`, issues);
            if (id) {
              if (allocationIds.has(id)) issues.push(`${where}: allocation id "${id}" is used twice.`);
              allocationIds.add(id);
            }
            const ref = typeof row.area === "string" ? row.area.trim() : null;
            if (!ref) issues.push(`${where} allocation area must be the area's id or name.`);
            const day = dateValue(row.day, `${where} allocation day`, issues);
            const hours = hoursValue(row.hours, `${where} allocation hours`, 0.5, 24, issues);
            if (!ref || !day || hours === null) return;
            if (day < key || day > addDays(key, 6)) issues.push(`${where}: allocation day ${day} is outside its week.`);
            const areaIndex = resolveArea(ref && areaById.has(ref) ? ref : null, ref, where);
            if (areaIndex === null) return;
            if (!listed.has(areaIndex)) {
              issues.push(`${where}: allocation for "${areas[areaIndex].name}" needs that area in this week's areas list.`);
              return;
            }
            week.allocations.push({ id, areaIndex, day, hours });
          });
        }
      }

      // The planner's rules, checked across the whole week.
      const budgetTotal = week.areas.reduce((sum, area) => sum + area.hours, 0);
      if (week.capacity !== undefined && budgetTotal > week.capacity) {
        issues.push(`${where}: the areas add up to ${budgetTotal} hours, more than its capacity of ${week.capacity}.`);
      }
      for (const area of week.areas) {
        const name = areas[area.areaIndex].name;
        const placed = week.allocations.filter((a) => a.areaIndex === area.areaIndex).reduce((sum, a) => sum + a.hours, 0);
        if (placed > area.hours) issues.push(`${where}: "${name}" has ${placed} hours placed, more than its ${area.hours}-hour budget.`);
        for (const task of area.tasks) {
          if (task.day && !week.allocations.some((a) => a.areaIndex === area.areaIndex && a.day === task.day)) {
            issues.push(`${where}: task "${task.text.slice(0, 40)}" is on ${task.day}, but "${name}" has no hours that day.`);
          }
        }
      }
      weeks.push(week);
    });
  }

  let currentWeek: string | null = null;
  if (profile.currentWeek !== undefined) {
    const key = dateValue(profile.currentWeek, '"profile.currentWeek"', issues);
    if (key && !weekKeys.has(key)) issues.push('"profile.currentWeek" must be one of the weeks in the file.');
    if (key && weekKeys.has(key)) currentWeek = key;
  }

  if (issues.length > 0) return { ok: false, issues: issues.slice(0, PLAN_LIMITS.issues) };
  return {
    ok: true,
    doc: { action, profileId, basedOn, name, currentWeek, areas, weeks },
  };
}

/** The create path: a new profile from a checked document. Every identifier is made here, never taken from the file. */
export function buildSchedule(doc: PlanDoc): SpreadData {
  const usedIds = new Set<string>();
  const hats: Hat[] = doc.areas.map((area) => ({
    id: freshId(usedIds),
    name: area.name,
    defaultHours: area.weeklyHours,
    color: area.color,
    ...(area.category ? { category: area.category } : {}),
  }));
  const weeks: Record<string, WeekData> = {};
  for (const week of doc.weeks) {
    const allocations: Allocation[] = week.allocations.map((item, index) => ({
      id: freshId(usedIds),
      hatId: hats[item.areaIndex].id,
      day: item.day,
      hours: item.hours,
      order: week.allocations.slice(0, index).filter((other) => other.areaIndex === item.areaIndex && other.day === item.day).length,
    }));
    const boxes: Box[] = hats.map((hat, areaIndex) => {
      const listed = week.areas.find((row) => row.areaIndex === areaIndex);
      const tasks: Task[] = (listed?.tasks ?? []).map((task) => {
        const link = task.day ? allocations.find((a) => a.hatId === hat.id && a.day === task.day) : undefined;
        return {
          id: freshId(usedIds),
          text: task.text,
          done: task.done,
          ...(link ? { allocationId: link.id } : {}),
          ...(task.estimateMinutes ? { estimateMinutes: task.estimateMinutes } : {}),
          ...(task.important ? { important: true } : {}),
        };
      });
      return { hatId: hat.id, hours: listed?.hours ?? 0, tasks };
    });
    weeks[week.key] = {
      boxes,
      allocations,
      ...(week.capacity !== undefined ? { life: { version: 1 as const, capacityHours: week.capacity } } : {}),
    };
  }
  const keys = Object.keys(weeks).sort();
  return {
    hats,
    weeks,
    currentWeek: doc.currentWeek ?? keys[keys.length - 1] ?? weekKey(),
  };
}

/** A checked file read as a new profile. Kept for the create path and for tests that read a file in one step. */
export function parsePlanFile(text: string): { ok: true; name: string; data: SpreadData } | { ok: false; issues: string[] } {
  const parsed = parsePlanDocument(text);
  if (!parsed.ok) return parsed;
  return { ok: true, name: parsed.doc.name, data: buildSchedule(parsed.doc) };
}

/** A short version code for a profile's schedule: a SHA-256 of its stored form, first 16 hex characters. */
export async function revisionOf(data: SpreadData): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export type PlanMeta = { profileId: string; basedOn: string; exportedAt: string };

/**
 * The plan file for one profile's schedule. Identifiers are written so a later merge can match what is unchanged.
 * Throws only when the schedule cannot be written as a valid file.
 */
export function buildPlanText(data: SpreadData, profileName: string, meta?: PlanMeta): string {
  if (data.hats.length > PLAN_LIMITS.areas) throw new Error("There are too many areas for a plan file.");
  const names = new Set<string>();
  for (const hat of data.hats) {
    const key = hat.name.trim().toLowerCase();
    if (names.has(key)) throw new Error("Two areas have the same name. Rename one before making a plan file.");
    names.add(key);
  }
  const keys = Object.keys(data.weeks).sort().slice(-PLAN_LIMITS.weeks);
  const hatById = new Map(data.hats.map((hat) => [hat.id, hat]));
  const weeks = keys.map((key) => {
    const week = data.weeks[key];
    const dayOf = new Map<string, string>();
    for (const item of week.allocations) dayOf.set(item.id, item.day);
    const areas = week.boxes
      .map((box) => {
        const hat = hatById.get(box.hatId);
        if (!hat) return null;
        const tasks = box.tasks.slice(0, PLAN_LIMITS.tasksPerWeek).map((task) => {
          const day = task.allocationId ? dayOf.get(task.allocationId) : undefined;
          return {
            id: task.id,
            text: task.text.slice(0, PLAN_LIMITS.textChars),
            done: task.done,
            ...(day ? { day } : {}),
            ...(task.estimateMinutes ? { estimateMinutes: task.estimateMinutes } : {}),
            ...(task.important ? { important: true } : {}),
          };
        });
        if (box.hours <= 0 && tasks.length === 0) return null;
        return { id: hat.id, name: hat.name, hours: box.hours, ...(tasks.length ? { tasks } : {}) };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    const allocations = week.allocations
      .map((item) => {
        const hat = hatById.get(item.hatId);
        return hat ? { id: item.id, area: hat.id, day: item.day, hours: item.hours } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    const capacity = week.life?.capacityHours;
    return {
      weekStart: key,
      ...(capacity !== undefined ? { capacityHours: capacity } : {}),
      areas,
      allocations,
    };
  });
  const currentWeek = keys.includes(data.currentWeek) ? data.currentWeek : keys[keys.length - 1];
  const plan = {
    kind: PLAN_KIND,
    formatVersion: PLAN_FORMAT_VERSION,
    guide: PLAN_GUIDE,
    ...(meta ? { exported: { at: meta.exportedAt, basedOn: meta.basedOn } } : {}),
    profile: {
      ...(meta ? { id: meta.profileId, action: "merge" } : { action: "create" }),
      name: profileName.trim().slice(0, PLAN_LIMITS.nameChars) || "Spread plan",
      ...(currentWeek ? { currentWeek } : {}),
      areas: data.hats.map((hat) => ({
        id: hat.id,
        name: hat.name,
        weeklyHours: hat.defaultHours,
        color: hat.color,
        ...(hat.category ? { category: hat.category } : {}),
      })),
      weeks,
    },
  };
  return JSON.stringify(plan, null, 2);
}

/** The payload the existing restore uses: one new profile holding this schedule. Settings and recovery are empty. */
export function planPayload(data: SpreadData, name: string, now = new Date()): FullBackupPayload {
  const profile: Profile = { id: "plan", name, store: profileStore("plan"), theme: "system", accent: null };
  return {
    schemaVersion: CURRENT_SCHEMA,
    createdAt: now.toISOString(),
    deviceId: null,
    activeProfileId: null,
    roster: [profile],
    stores: { plan: JSON.stringify(data) },
    settings: {},
  };
}

/** A plan file that creates a profile, shaped like any backup, so the existing preview and restore run on it unchanged. */
export function planParsedBackup(data: SpreadData, name: string): ParsedBackup {
  const payload = planPayload(data, name);
  return { kind: "full", payload, summary: summarizeFull(payload) };
}
