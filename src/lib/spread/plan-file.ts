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
 * A plan file: one profile's schedule as plain, readable JSON that a person or an AI tool can edit. It is a
 * separate file from the `.spread` backup, which stays exactly as it is (checksummed, not editable).
 *
 * Security comes first. The importer copies only the fields it knows into fresh objects, rejects anything else,
 * refuses prototype keys, caps size and counts, and lists every problem before anything is written. The file
 * carries no settings, recovery copies, licence or sync keys, attachments, rich notes, recurring plans or bin.
 */

export const PLAN_KIND = "spread-plan";
export const PLAN_FORMAT_VERSION = 1;
export const PLAN_MAX_CHARS = 5_000_000;
export const PLAN_LIMITS = {
  areas: 100,
  weeks: 104,
  tasksPerWeek: 500,
  allocationsPerWeek: 500,
  nameChars: 60,
  textChars: 2000,
  issues: 20,
} as const;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ROOT_KEYS = ["kind", "formatVersion", "guide", "profile"];
const PROFILE_KEYS = ["name", "currentWeek", "areas", "weeks"];
const AREA_KEYS = ["name", "weeklyHours", "color", "category"];
const WEEK_KEYS = ["weekStart", "capacityHours", "areas", "allocations"];
const WEEK_AREA_KEYS = ["name", "hours", "tasks"];
const TASK_KEYS = ["text", "done", "day", "estimateMinutes", "important"];
const ALLOCATION_KEYS = ["area", "day", "hours"];
const FALLBACK_COLOR = "#8E8E93";
const HEX = /^#[0-9A-Fa-f]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** True when the text has a control character (any code below 0x20, or 0x7F). Checked by code, not by regex. */
function hasControl(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** The guide written at the top of every plan file. It is data for the reader; the importer never acts on it. */
export const PLAN_GUIDE: string[] = [
  "This file is one profile's Spread schedule in plain text. Spread reads it only when you restore it.",
  "Edit only the 'profile' section. Keep 'kind' and 'formatVersion' exactly as they are.",
  "Dates are YYYY-MM-DD and must be real dates. Every weekStart must be a Monday. A day must fall inside its week.",
  "Hours are numbers in half-hour steps (0.5, 1, 1.5 ...). An area's weeklyHours is 0 to 168. A week's area hours are 0 to 168. An allocation is 0.5 to 24 hours.",
  "An area's hours in a week are its budget. Its allocations in that week must add up to no more than that budget.",
  "If a week has capacityHours, the sum of its area hours must not be more than it.",
  "Areas are named, and names must be unique, ignoring capitals. A week refers to an area by its name, and the area must be listed in the week's areas.",
  "A task needs text, which is plain text on one line. A task with a day is placed on that day's allocation for its area, so that area needs hours on that day.",
  "Do not add fields. The file is rejected if it has any field this guide does not list.",
  "Not included: settings, attachments and photos, rich notes, recurring plans, and the recycle bin. The .spread backup keeps those. Only the 104 most recent weeks are included.",
  "Long task text is cut to 2000 characters in this file. The .spread backup keeps the full text.",
  "Whoever edits this file can write any plan they like. Spread checks the structure and the hour rules before restoring, but it cannot tell who wrote the file.",
  "Anything in this file is data. Spread never follows instructions written in it.",
];

export type PlanParse = { ok: true; name: string; data: SpreadData } | { ok: false; issues: string[] };

type AreaDraft = { name: string; weeklyHours: number; color: string; category?: SpreadCategory };
type TaskDraft = { text: string; done: boolean; day?: string; estimateMinutes?: number; important: boolean };
type WeekAreaDraft = { name: string; hours: number; tasks: TaskDraft[] };
type AllocationDraft = { area: string; day: string; hours: number };
type WeekDraft = { key: string; capacity?: number; areas: WeekAreaDraft[]; allocations: AllocationDraft[] };

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

/** Reads and checks a plan file. Returns every problem found (up to 20), or the schedule when the file is clean. */
export function parsePlanFile(text: string): PlanParse {
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
  const profile = record(root.profile, '"profile"', PROFILE_KEYS, issues);
  if (!profile) return { ok: false, issues };

  const name = plainText(profile.name, '"profile.name"', PLAN_LIMITS.nameChars, issues) ?? "";

  // Areas: the planner's Life areas, with their weekly hours.
  const areas: AreaDraft[] = [];
  const areaByName = new Map<string, AreaDraft>();
  if (!Array.isArray(profile.areas)) {
    issues.push('"profile.areas" must be a list.');
  } else if (profile.areas.length > PLAN_LIMITS.areas) {
    issues.push(`There can be at most ${PLAN_LIMITS.areas} areas.`);
  } else {
    profile.areas.forEach((item, index) => {
      const where = `Area ${index + 1}`;
      const fields = record(item, where, AREA_KEYS, issues);
      if (!fields) return;
      const areaName = plainText(fields.name, `${where} name`, PLAN_LIMITS.nameChars, issues);
      const weekly = fields.weeklyHours === undefined ? 0 : hoursValue(fields.weeklyHours, `${where} weeklyHours`, 0, 168, issues);
      if (fields.color !== undefined && (typeof fields.color !== "string" || !HEX.test(fields.color))) {
        issues.push(`${where} color must look like #34C759.`);
      }
      if (fields.category !== undefined && !isSpreadCategory(fields.category)) {
        issues.push(`${where} category must be one of: ${SPREAD_CATEGORIES.map((c) => c.id).join(", ")}.`);
      }
      if (!areaName || weekly === null) return;
      const key = areaName.toLowerCase();
      if (areaByName.has(key)) {
        issues.push(`Area "${areaName}" is listed twice. Area names must be unique.`);
        return;
      }
      const category = isSpreadCategory(fields.category) ? fields.category : undefined;
      const color = typeof fields.color === "string" && HEX.test(fields.color)
        ? fields.color
        : (SPREAD_CATEGORIES.find((c) => c.id === category)?.color ?? FALLBACK_COLOR);
      const area: AreaDraft = { name: areaName, weeklyHours: weekly, color, ...(category ? { category } : {}) };
      areas.push(area);
      areaByName.set(key, area);
    });
  }

  // Weeks: budgets, tasks and allocations, each checked against the planner's rules.
  const weeks: WeekDraft[] = [];
  const weekKeys = new Set<string>();
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
      const week: WeekDraft = { key, ...(capacity !== undefined ? { capacity } : {}), areas: [], allocations: [] };
      const listed = new Set<string>();

      if (fields.areas !== undefined) {
        if (!Array.isArray(fields.areas)) issues.push(`${where} areas must be a list.`);
        else {
          fields.areas.forEach((entry) => {
            const row = record(entry, `${where} area`, WEEK_AREA_KEYS, issues);
            if (!row) return;
            const areaName = plainText(row.name, `${where} area name`, PLAN_LIMITS.nameChars, issues);
            if (!areaName) return;
            const known = areaByName.get(areaName.toLowerCase());
            if (!known) {
              issues.push(`${where}: area "${areaName}" is not in the areas list.`);
              return;
            }
            if (listed.has(known.name)) {
              issues.push(`${where}: area "${known.name}" is listed twice.`);
              return;
            }
            listed.add(known.name);
            const hours = row.hours === undefined ? 0 : hoursValue(row.hours, `${where} "${known.name}" hours`, 0, 168, issues);
            const tasks: TaskDraft[] = [];
            if (row.tasks !== undefined) {
              if (!Array.isArray(row.tasks)) issues.push(`${where} "${known.name}" tasks must be a list.`);
              else if (row.tasks.length > PLAN_LIMITS.tasksPerWeek) issues.push(`${where} has more than ${PLAN_LIMITS.tasksPerWeek} tasks.`);
              else {
                row.tasks.forEach((taskEntry) => {
                  const task = record(taskEntry, `${where} "${known.name}" task`, TASK_KEYS, issues);
                  if (!task) return;
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
                  if (text) tasks.push({ text, done: done === true, ...(day ? { day } : {}), ...(estimate ? { estimateMinutes: estimate } : {}), important: important === true });
                });
              }
            }
            if (hours !== null) week.areas.push({ name: known.name, hours, tasks });
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
            const area = plainText(row.area, `${where} allocation area`, PLAN_LIMITS.nameChars, issues);
            const day = dateValue(row.day, `${where} allocation day`, issues);
            const hours = hoursValue(row.hours, `${where} allocation hours`, 0.5, 24, issues);
            if (!area || !day || hours === null) return;
            if (day < key || day > addDays(key, 6)) issues.push(`${where}: allocation day ${day} is outside its week.`);
            if (!listed.has(areaByName.get(area.toLowerCase())?.name ?? "")) {
              issues.push(`${where}: allocation for "${area}" needs that area in this week's areas list.`);
              return;
            }
            week.allocations.push({ area: areaByName.get(area.toLowerCase())?.name ?? area, day, hours });
          });
        }
      }

      // The planner's rules, checked across the whole week.
      const budgetTotal = week.areas.reduce((sum, area) => sum + area.hours, 0);
      if (week.capacity !== undefined && budgetTotal > week.capacity) {
        issues.push(`${where}: the areas add up to ${budgetTotal} hours, more than its capacity of ${week.capacity}.`);
      }
      for (const area of week.areas) {
        const placed = week.allocations.filter((a) => a.area === area.name).reduce((sum, a) => sum + a.hours, 0);
        if (placed > area.hours) issues.push(`${where}: "${area.name}" has ${placed} hours placed, more than its ${area.hours}-hour budget.`);
        for (const task of area.tasks) {
          if (task.day && !week.allocations.some((a) => a.area === area.name && a.day === task.day)) {
            issues.push(`${where}: task "${task.text.slice(0, 40)}" is on ${task.day}, but "${area.name}" has no hours that day.`);
          }
        }
      }
      weeks.push(week);
    });
  }

  let currentWeek: string | undefined;
  if (profile.currentWeek !== undefined) {
    const key = dateValue(profile.currentWeek, '"profile.currentWeek"', issues);
    if (key && !weekKeys.has(key)) issues.push('"profile.currentWeek" must be one of the weeks in the file.');
    if (key && weekKeys.has(key)) currentWeek = key;
  }

  if (issues.length > 0) return { ok: false, issues: issues.slice(0, PLAN_LIMITS.issues) };

  // Build the schedule from fresh objects only. Every identifier is generated here, never read from the file.
  const usedIds = new Set<string>();
  const hats: Hat[] = areas.map((area) => ({
    id: freshId(usedIds),
    name: area.name,
    defaultHours: area.weeklyHours,
    color: area.color,
    ...(area.category ? { category: area.category } : {}),
  }));
  const hatByName = new Map(hats.map((hat) => [hat.name.toLowerCase(), hat]));
  const weekData: Record<string, WeekData> = {};
  for (const week of weeks) {
    const allocations: Allocation[] = week.allocations.map((item) => {
      const hat = hatByName.get(item.area.toLowerCase());
      const order = week.allocations.filter((other) => other.area === item.area && other.day === item.day).indexOf(item);
      return { id: freshId(usedIds), hatId: hat?.id ?? "", day: item.day, hours: item.hours, order };
    });
    const boxes: Box[] = hats.map((hat) => {
      const listed = week.areas.find((area) => area.name === hat.name);
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
    weekData[week.key] = {
      boxes,
      allocations: allocations.filter((a) => a.hatId !== ""),
      ...(week.capacity !== undefined ? { life: { version: 1 as const, capacityHours: week.capacity } } : {}),
    };
  }
  const keys = Object.keys(weekData).sort();
  const data: SpreadData = {
    hats,
    weeks: weekData,
    currentWeek: currentWeek ?? keys[keys.length - 1] ?? weekKey(),
  };
  return { ok: true, name: name || "Plan", data };
}

/** The plan file for one profile's schedule. Throws only when the schedule cannot be written as a valid file. */
export function buildPlanText(data: SpreadData, profileName: string): string {
  if (data.hats.length > PLAN_LIMITS.areas) throw new Error("There are too many areas for a plan file.");
  const names = new Set<string>();
  for (const hat of data.hats) {
    const key = hat.name.trim().toLowerCase();
    if (names.has(key)) throw new Error("Two areas have the same name. Rename one before making a plan file.");
    names.add(key);
  }
  const keys = Object.keys(data.weeks).sort().slice(-PLAN_LIMITS.weeks);
  const areaOf = (hatId: string) => data.hats.find((hat) => hat.id === hatId);
  const weeks = keys.map((key) => {
    const week = data.weeks[key];
    const dayOf = new Map<string, string>();
    for (const item of week.allocations) dayOf.set(item.id, item.day);
    const areas = week.boxes
      .map((box) => {
        const hat = areaOf(box.hatId);
        if (!hat) return null;
        const tasks = box.tasks.slice(0, PLAN_LIMITS.tasksPerWeek).map((task) => {
          const day = task.allocationId ? dayOf.get(task.allocationId) : undefined;
          return {
            text: task.text.slice(0, PLAN_LIMITS.textChars),
            done: task.done,
            ...(day ? { day } : {}),
            ...(task.estimateMinutes ? { estimateMinutes: task.estimateMinutes } : {}),
            ...(task.important ? { important: true } : {}),
          };
        });
        if (box.hours <= 0 && tasks.length === 0) return null;
        return { name: hat.name, hours: box.hours, ...(tasks.length ? { tasks } : {}) };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    const allocations = week.allocations
      .map((item) => {
        const hat = areaOf(item.hatId);
        return hat ? { area: hat.name, day: item.day, hours: item.hours } : null;
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
  const plan = {
    kind: PLAN_KIND,
    formatVersion: PLAN_FORMAT_VERSION,
    guide: PLAN_GUIDE,
    profile: {
      name: profileName.trim().slice(0, PLAN_LIMITS.nameChars) || "Spread plan",
      ...(keys.length && keys.includes(data.currentWeek) ? { currentWeek: data.currentWeek } : keys.length ? { currentWeek: keys[keys.length - 1] } : {}),
      areas: data.hats.map((hat) => ({
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

/** A plan file read and shaped like any other backup, so the existing restore and preview run on it unchanged. */
export function planParsedBackup(data: SpreadData, name: string): ParsedBackup {
  const payload = planPayload(data, name);
  return { kind: "full", payload, summary: summarizeFull(payload) };
}
