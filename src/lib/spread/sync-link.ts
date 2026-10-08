/**
 * Turning iCloud Sync on for a profile. This is the moment two devices' independent data could be
 * mixed up, so it is the most careful code in the feature:
 *
 *  - Linking never merges this device's profile with an iCloud profile. Two planners that were
 *    built separately (even with the same spread names) stay separate.
 *  - The only way an existing local profile joins iCloud data is when it has nothing in it yet.
 *  - Every other path adds a new profile or uploads this one as a new iCloud profile.
 */
import type { SyncItem } from "./merge.ts";
import type { SpreadData } from "./model.ts";
import { PROFILE_LIMIT, type Profile } from "./profiles.ts";

export type CloudProfileSummary = {
  syncId: string;
  name: string;
  tasks: number;
  weeks: number;
  /** ISO time of the newest change in this iCloud profile, if known. */
  lastChangeAt: string | null;
};

/** What iCloud already holds, grouped by the profile each item belongs to. Tombstones are not counted. */
export function summarizeCloud(items: { syncId: string; itemId: string; deleted: boolean; at: string; fields: Record<string, unknown> }[]): CloudProfileSummary[] {
  const groups = new Map<string, CloudProfileSummary>();
  for (const item of items) {
    const group = groups.get(item.syncId) ?? { syncId: item.syncId, name: "", tasks: 0, weeks: 0, lastChangeAt: null };
    if (!item.deleted) {
      if (item.itemId === "profile" && typeof item.fields.name === "string") group.name = item.fields.name;
      if (item.itemId.startsWith("task:")) group.tasks += 1;
      if (item.itemId.startsWith("week:")) group.weeks += 1;
    }
    if (item.at && (!group.lastChangeAt || item.at > group.lastChangeAt)) group.lastChangeAt = item.at;
    groups.set(item.syncId, group);
  }
  return [...groups.values()].filter((g) => g.tasks > 0 || g.weeks > 0 || g.name).sort((a, b) => (a.name || a.syncId).localeCompare(b.name || b.syncId));
}

export { isPristine } from "./pristine.ts";
import { isPristine } from "./pristine.ts";

export type LinkChoice =
  /** Nothing in iCloud for this person yet: upload this profile as a new iCloud profile. */
  | { kind: "upload" }
  /** This profile is empty: let it become the iCloud profile, in place. */
  | { kind: "adopt"; cloud: CloudProfileSummary }
  /** Add the iCloud profile to this device as a new profile. Needs a free profile slot. */
  | { kind: "add-copy"; cloud: CloudProfileSummary; needsSlot: boolean }  // needsSlot: the device is at its profile limit
  /** Upload this profile as its own, separate iCloud profile. */
  | { kind: "upload-separate" };

/**
 * The choices to show. The list never contains "merge", and "adopt" appears only for an empty
 * profile, so picking any of them cannot overwrite or combine anything a person made.
 */
export function planLink(local: { data: SpreadData; profileCount: number }, cloud: CloudProfileSummary[]): LinkChoice[] {
  if (cloud.length === 0) return [{ kind: "upload" }];
  const choices: LinkChoice[] = [];
  const pristine = isPristine(local.data);
  const needsSlot = local.profileCount >= PROFILE_LIMIT;
  for (const summary of cloud) {
    if (pristine) choices.push({ kind: "adopt", cloud: summary });
    else choices.push({ kind: "add-copy", cloud: summary, needsSlot });
  }
  if (!pristine) choices.push({ kind: "upload-separate" });
  return choices;
}

export function rosterWithSyncId(profiles: Profile[], profileId: string, syncId: string): Profile[] {
  return profiles.map((profile) => (profile.id === profileId ? { ...profile, syncId } : profile));
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const str = (x: unknown) => typeof x === "string";
const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
const optStr = (x: unknown) => x === undefined || typeof x === "string";
const strList = (x: unknown) => Array.isArray(x) && x.every((item) => typeof item === "string");

/** Per kind: the fields it must have and their types. An item that fails is damaged, never "empty". */
const SHAPES: [prefix: string, check: (f: Record<string, unknown>) => boolean][] = [
  ["hat:", (f) => str(f.name) && num(f.defaultHours) && optStr(f.color) && optStr(f.category)],
  ["task:", (f) => str(f.text) && str(f.week) && str(f.hat) && (f.done === undefined || typeof f.done === "boolean") && optStr(f.allocationId) && (f.content === undefined || isObj(f.content))],
  ["alloc:", (f) => str(f.hatId) && str(f.day) && str(f.week) && (f.hours === undefined || num(f.hours)) && (f.order === undefined || num(f.order))],
  ["box:", (f) => num(f.hours) && (f["tasks$ids"] === undefined || strList(f["tasks$ids"]))],
  ["week:", (f) => strList(f["boxes$ids"]) && strList(f["allocations$ids"])],
];

function validVector(v: unknown): boolean {
  return isObj(v) && Object.values(v).every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0);
}

export function isDamagedRow(row: { itemId: string; fields: string; v: string; deleted: boolean }): boolean {
  try {
    if (!validVector(JSON.parse(row.v || "{}"))) return true;
    const fields = JSON.parse(row.fields || "{}") as unknown;
    if (!isObj(fields)) return true;
    if (row.deleted) return false;
    if (row.itemId === "profile") return !(str(fields.name) && (fields["hats$ids"] === undefined || strList(fields["hats$ids"])));
    const shape = SHAPES.find(([prefix]) => row.itemId.startsWith(prefix));
    // A kind this version does not know cannot be merged safely: hold it back.
    return shape ? !shape[1](fields) : true;
  } catch {
    return true;
  }
}

export function toItems(rows: { itemId: string; fields: string; v: string; deleted: boolean; at: string }[]): SyncItem[] {
  const out: SyncItem[] = [];
  for (const row of rows) {
    try {
      const fields = JSON.parse(row.fields || "{}") as SyncItem["fields"];
      const v = JSON.parse(row.v || "{}") as SyncItem["v"];
      if (!fields || typeof fields !== "object" || !v || typeof v !== "object") continue;
      out.push({ id: row.itemId, fields, v, ...(row.deleted ? { deleted: true } : {}), at: row.at });
    } catch {
      // A row that does not parse is skipped, not guessed at.
    }
  }
  return out;
}

/**
 * Joining iCloud data in place replaces the planner, so it is only allowed while the planner is
 * still the empty one the person was shown. Called again immediately before the replacement,
 * because the checks and downloads before it take seconds and the person may have typed meanwhile.
 */
export function stillSafeToAdopt(started: { profileId: string | null }, now: { profileId: string | null; data: SpreadData }): boolean {
  return started.profileId !== null && started.profileId === now.profileId && isPristine(now.data);
}
