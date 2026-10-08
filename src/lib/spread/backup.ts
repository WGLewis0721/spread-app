import { defaultData, formatWeek, LICENSE_KEY, normalizeData, type SpreadData } from "./model.ts";
import { classifyStored } from "./pristine.ts";
import { collectEntries, isPlannerKey, type KeyStore } from "./native-mirror.ts";
import { ACTIVE_PROFILE_KEY, cleanName, parseProfiles, PROFILE_LIMIT, PROFILES_KEY, profileStore, type Profile } from "./profiles.ts";
import { CURRENT_SCHEMA, SCHEMA_KEY } from "./schema.ts";
import { formatDocDay } from "./week-document.ts";

export type BackupSummary = {
  spreads: string[];
  weeks: number;
  tasks: number;
  range: string;
};

export type SpreadBackup = { data: SpreadData; summary: BackupSummary };

export function backupFile(data: SpreadData) {
  return {
    kind: "spread-backup",
    version: 1,
    savedAt: new Date().toISOString(),
    data: { hats: data.hats, weeks: data.weeks, currentWeek: data.currentWeek },
  };
}

export function parseBackup(text: string): SpreadBackup | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const payload = envelopeData(raw) ?? raw;
  if (!isPayload(payload)) return null;
  const data = normalizeData(payload);
  return { data, summary: summarize(data) };
}

export function summarize(data: SpreadData): BackupSummary {
  const keys = Object.keys(data.weeks).sort();
  const tasks = Object.values(data.weeks).reduce(
    (sum, week) => sum + week.boxes.reduce((count, box) => count + box.tasks.length, 0),
    0,
  );
  const range = keys.length === 0 ? "No weeks" : keys.length === 1 ? formatWeek(keys[0]) : `${formatDocDay(keys[0])} – ${formatDocDay(keys[keys.length - 1])}`;
  return { spreads: data.hats.map((hat) => hat.name), weeks: keys.length, tasks, range };
}

function envelopeData(value: unknown): unknown {
  if (!value || typeof value !== "object") return null;
  const file = value as { kind?: unknown; version?: unknown; data?: unknown };
  if (file.kind !== "spread-backup" || file.version !== 1) return null;
  return file.data ?? null;
}

function isPayload(value: unknown): value is SpreadData {
  if (!value || typeof value !== "object") return false;
  const record = value as { hats?: unknown; weeks?: unknown };
  if (!Array.isArray(record.hats) || !record.weeks || typeof record.weeks !== "object" || Array.isArray(record.weeks)) {
    return false;
  }
  return record.hats.every((hat) => {
    if (!hat || typeof hat !== "object") return false;
    const item = hat as { id?: unknown; name?: unknown; defaultHours?: unknown };
    return typeof item.id === "string" && typeof item.name === "string" && typeof item.defaultHours === "number";
  });
}

// --- Full backup (version 2) -------------------------------------------------------------------
//
// Version 1 holds one profile's weeks. Version 2 holds the whole planner: the roster, every
// profile's data exactly as stored, and the settings. The payload travels as a string inside the
// envelope and the checksum covers that exact string, so a damaged or hand-edited file is
// rejected rather than half-restored.

export const FULL_BACKUP_VERSION = 2;

export type FullBackupPayload = {
  schemaVersion: number;
  createdAt: string;
  deviceId: string | null;
  activeProfileId: string | null;
  roster: Profile[];
  /** Raw stored text per profile, keyed by the profile's id. */
  stores: Record<string, string>;
  /**
   * Other `spread.*` settings kept for completeness (not the license or the schema marker).
   * Restoring a backup adds profiles; it does not apply these.
   */
  settings: Record<string, string>;
  /**
   * Copies of data that could not be read (`spread.recovery.*`), kept in the file for support.
   * Optional so older files and older readers are unaffected. Not applied on restore.
   */
  recovery?: Record<string, string>;
};

export type FullBackupProfileSummary = { id: string; readable: boolean; name: string; spreads: string[]; weeks: number; tasks: number; range: string };

export type FullBackup = { payload: FullBackupPayload; summary: { profiles: FullBackupProfileSummary[]; weeks: number; tasks: number } };

export type ParsedBackup = ({ kind: "week" } & SpreadBackup) | ({ kind: "full" } & FullBackup);

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const SKIPPED_SETTINGS = new Set([LICENSE_KEY, SCHEMA_KEY, PROFILES_KEY, ACTIVE_PROFILE_KEY]);

export function collectFullPayload(storage: KeyStore, now: Date, deviceId: string | null): FullBackupPayload {
  const roster = parseProfiles(storage.getItem(PROFILES_KEY));
  const stores: Record<string, string> = {};
  const owned = new Set<string>();
  for (const profile of roster) {
    owned.add(profile.store);
    const text = storage.getItem(profile.store);
    // A profile that was never written is an untouched new planner. Say so explicitly, so a body
    // that is missing from a file can always be told apart from one that was never started.
    stores[profile.id] = typeof text === "string" ? text : JSON.stringify(defaultData());
  }
  const settings: Record<string, string> = {};
  const recovery: Record<string, string> = {};
  for (const [key, value] of Object.entries(collectEntries(storage))) {
    if (key.startsWith("spread.recovery.")) {
      recovery[key] = value;
      continue;
    }
    // Device-local state never goes into a file that can be shared or restored elsewhere: the
    // backup preference and the iCloud account each synced profile was linked under.
    if (owned.has(key) || SKIPPED_SETTINGS.has(key) || isPlannerKey(key) || key.startsWith("spread.cloud.") || key.startsWith("spread.sync.")) continue;
    settings[key] = value;
  }
  const active = storage.getItem(ACTIVE_PROFILE_KEY);
  return {
    schemaVersion: CURRENT_SCHEMA,
    createdAt: now.toISOString(),
    deviceId,
    activeProfileId: active && roster.some((profile) => profile.id === active) ? active : (roster[0]?.id ?? null),
    roster,
    stores,
    settings,
    ...(Object.keys(recovery).length > 0 ? { recovery } : {}),
  };
}

export async function fullBackupText(payload: FullBackupPayload): Promise<string> {
  const payloadText = JSON.stringify(payload);
  return JSON.stringify({
    kind: "spread-backup",
    version: FULL_BACKUP_VERSION,
    checksum: await sha256Hex(payloadText),
    payloadText,
  });
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every((item) => typeof item === "string")
  );
}

/** Reads a version 2 file. Returns null for anything that is not a complete, undamaged backup. */
export async function parseFullBackup(text: string): Promise<FullBackup | null> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const file = raw as { kind?: unknown; version?: unknown; checksum?: unknown; payloadText?: unknown };
  if (file.kind !== "spread-backup" || file.version !== FULL_BACKUP_VERSION) return null;
  if (typeof file.payloadText !== "string" || typeof file.checksum !== "string") return null;
  if ((await sha256Hex(file.payloadText)) !== file.checksum) return null;
  let body: unknown;
  try {
    body = JSON.parse(file.payloadText);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  const item = body as Record<string, unknown>;
  if (typeof item.schemaVersion !== "number" || item.schemaVersion > CURRENT_SCHEMA) return null;
  if (typeof item.createdAt !== "string" || !Array.isArray(item.roster)) return null;
  if (!isRecordOfStrings(item.stores) || !isRecordOfStrings(item.settings)) return null;
  const roster = parseProfiles(JSON.stringify(item.roster));
  if (roster.length === 0) return null;
  const payload: FullBackupPayload = {
    schemaVersion: item.schemaVersion,
    createdAt: item.createdAt,
    deviceId: typeof item.deviceId === "string" ? item.deviceId : null,
    activeProfileId: typeof item.activeProfileId === "string" ? item.activeProfileId : null,
    roster,
    stores: item.stores,
    settings: item.settings,
    ...(isRecordOfStrings(item.recovery) && Object.keys(item.recovery).length > 0 ? { recovery: item.recovery } : {}),
  };
  return { payload, summary: summarizeFull(payload) };
}

export function summarizeFull(payload: FullBackupPayload): FullBackup["summary"] {
  const profiles = payload.roster.map((profile) => {
    let one: BackupSummary = { spreads: [], weeks: 0, tasks: 0, range: "No weeks" };
    const stored = payload.stores[profile.id];
    const kind = classifyStored(stored ?? null).kind;
    const readable = kind === "pristine" || kind === "content"; // otherwise listed, but it cannot be restored
    if (readable && stored) one = summarize(normalizeData(JSON.parse(stored)));
    return { id: profile.id, readable, name: profile.name, ...one };
  });
  return {
    profiles,
    weeks: profiles.reduce((sum, item) => sum + item.weeks, 0),
    tasks: profiles.reduce((sum, item) => sum + item.tasks, 0),
  };
}

/** Accepts either file version. */
export async function parseAnyBackup(text: string): Promise<ParsedBackup | null> {
  const full = await parseFullBackup(text);
  if (full) return { kind: "full", ...full };
  const week = parseBackup(text);
  return week ? { kind: "week", ...week } : null;
}

export type RestorePlan =
  | {
      ok: true;
      profiles: Profile[];
      writes: { key: string; value: string }[];
      /** Names of profiles in the backup that could not be read and were not restored. */
      skipped: string[];
      /** An empty profile that took the place of the first restored one, if any. */
      replacedId: string | null;
    }
  | { ok: false; reason: "no-room"; needed: number; free: number };

export type RestoreOptions = {
  /** Ids (from the backup's roster) to restore. Default: every readable profile. */
  select?: string[];
  /** An existing empty profile (never one with content) that may be filled by the first restored profile. */
  replaceEmpty?: string | null;
};

/** How many profiles a restore can add: free slots, plus one if an empty profile can be filled. */
export function restoreCapacity(existingCount: number, hasEmptyProfile: boolean): number {
  return Math.max(0, PROFILE_LIMIT - existingCount) + (hasEmptyProfile ? 1 : 0);
}

function restoredName(name: string, taken: Set<string>): string {
  const suffix = " (restored)";
  const base = cleanName(name) || "Me";
  let candidate = cleanName(`${base.slice(0, 24 - suffix.length)}${suffix}`);
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) {
    const tail = ` (restored ${n})`;
    candidate = cleanName(`${base.slice(0, 24 - tail.length)}${tail}`);
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

/**
 * A profile can be restored only if its saved text is a real planner. A missing body, `null`, a
 * string, or a planner with the wrong types is damaged: restoring it would quietly produce an empty
 * profile, so it is skipped and reported by name instead.
 */
function readable(payload: FullBackupPayload, source: Profile): boolean {
  const kind = classifyStored(payload.stores[source.id] ?? null).kind;
  return kind === "pristine" || kind === "content";
}

/**
 * Add profiles from a full backup. Nothing on the device that has content is changed or removed:
 * restored profiles get new ids, new storage keys, and names that say they were restored. The one
 * exception is an *empty* profile (`replaceEmpty`), which the first restored profile may fill, so a
 * brand-new install (which always has one empty profile) can take a full set of ten.
 */
export function planRestoreAsNew(payload: FullBackupPayload, existing: Profile[], newId: () => string, options: RestoreOptions = {}): RestorePlan {
  const usable = payload.roster.filter((profile) => readable(payload, profile));
  const skipped = payload.roster.filter((profile) => !readable(payload, profile)).map((profile) => profile.name);
  const wanted = options.select ? new Set(options.select) : null;
  const chosen = wanted ? usable.filter((profile) => wanted.has(profile.id)) : usable;
  const replaceTarget = options.replaceEmpty ? (existing.find((profile) => profile.id === options.replaceEmpty) ?? null) : null;
  const capacity = restoreCapacity(existing.length, replaceTarget !== null);
  if (chosen.length > capacity) return { ok: false, reason: "no-room", needed: chosen.length, free: capacity };

  const taken = new Set(existing.filter((profile) => profile.id !== replaceTarget?.id).map((profile) => profile.name.toLowerCase()));
  const used = new Set(existing.map((profile) => profile.id));
  let profiles: Profile[] = [...existing];
  const writes: { key: string; value: string }[] = [];
  let replacedId: string | null = null;
  chosen.forEach((source, index) => {
    const text = payload.stores[source.id];
    const data = JSON.stringify(normalizeData(JSON.parse(text)));
    if (index === 0 && replaceTarget) {
      const plainName = cleanName(source.name) || "Me";
      const name = taken.has(plainName.toLowerCase()) ? restoredName(source.name, taken) : plainName;
      taken.add(name.toLowerCase());
      writes.push({ key: replaceTarget.store, value: data });
      profiles = profiles.map((profile) => (profile.id === replaceTarget.id ? { id: profile.id, name, store: profile.store, theme: source.theme, accent: source.accent } : profile));
      replacedId = replaceTarget.id;
      return;
    }
    let id = newId();
    while (!id || used.has(id)) id = newId();
    used.add(id);
    const store = profileStore(id);
    writes.push({ key: store, value: data });
    profiles.push({ id, name: restoredName(source.name, taken), store, theme: source.theme, accent: source.accent });
  });
  return { ok: true, profiles, writes, skipped, replacedId };
}
