import { defaultData, type SpreadData } from "./model.ts";

/**
 * "Pristine" means nothing a person did is in the planner: it is exactly what a new install
 * starts with, apart from which empty weeks exist and which one is open. Anything else (a changed
 * hour, colour, category, name, a task, a note, an extra hat) is content and is never replaced.
 */
export function isPristine(data: SpreadData): boolean {
  const start = defaultData();
  if (data.hats.length !== start.hats.length) return false;
  for (let i = 0; i < start.hats.length; i += 1) {
    const a = data.hats[i];
    const b = start.hats[i];
    if (a.id !== b.id || a.name !== b.name || a.defaultHours !== b.defaultHours || a.color !== b.color || a.category !== b.category) return false;
    if (Object.keys(a).length !== Object.keys(b).length) return false;
  }
  const hours = new Map(start.hats.map((hat) => [hat.id, hat.defaultHours]));
  for (const week of Object.values(data.weeks)) {
    if (week.allocations.length > 0) return false;
    const seen = new Set<string>();
    for (const box of week.boxes) {
      if (box.tasks.length > 0 || !hours.has(box.hatId) || seen.has(box.hatId) || box.hours !== hours.get(box.hatId)) return false;
      seen.add(box.hatId);
    }
  }
  return true;
}

export type StoredProfile =
  /** Nothing is saved under the profile's key: there is nothing to lose. */
  | { kind: "absent" }
  /** Saved, well formed, and exactly a new install's planner. */
  | { kind: "pristine" }
  /** Saved, well formed, and holds something a person did. */
  | { kind: "content" }
  /** Saved, but not a usable planner. It holds bytes we do not understand, so it is never replaced. */
  | { kind: "damaged" };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Strict shape check on saved text. `null`, `[]`, a string, or a planner with the wrong types are damaged, not empty. */
export function classifyStored(raw: string | null): StoredProfile {
  if (raw === null) return { kind: "absent" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "damaged" };
  }
  if (!isObject(parsed) || !Array.isArray(parsed.hats) || !isObject(parsed.weeks) || typeof parsed.currentWeek !== "string") return { kind: "damaged" };
  for (const hat of parsed.hats) {
    if (!isObject(hat) || typeof hat.id !== "string" || typeof hat.name !== "string" || typeof hat.defaultHours !== "number" || typeof hat.color !== "string") return { kind: "damaged" };
    if (hat.category !== undefined && typeof hat.category !== "string") return { kind: "damaged" };
  }
  for (const week of Object.values(parsed.weeks)) {
    if (!isObject(week) || !Array.isArray(week.boxes) || !Array.isArray(week.allocations)) return { kind: "damaged" };
    for (const box of week.boxes) {
      if (!isObject(box) || typeof box.hatId !== "string" || typeof box.hours !== "number" || !Array.isArray(box.tasks)) return { kind: "damaged" };
    }
  }
  // Compare exactly what is saved: nothing is normalised away first.
  return isPristine(parsed as unknown as SpreadData) && Object.keys(parsed).length === 3 ? { kind: "pristine" } : { kind: "content" };
}
