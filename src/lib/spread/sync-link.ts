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
import { defaultData, type SpreadData } from "./model.ts";
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

/** True when a profile holds nothing a person typed: no tasks, no notes, and only the starting spreads. */
export function isPristine(data: SpreadData): boolean {
  const start = defaultData();
  const sameHats =
    data.hats.length === start.hats.length &&
    data.hats.every((hat, i) => hat.id === start.hats[i].id && hat.name === start.hats[i].name && hat.defaultHours === start.hats[i].defaultHours);
  if (!sameHats) return false;
  for (const week of Object.values(data.weeks)) {
    if (week.allocations.length > 0) return false;
    for (const box of week.boxes) if (box.tasks.length > 0) return false;
  }
  return true;
}

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
