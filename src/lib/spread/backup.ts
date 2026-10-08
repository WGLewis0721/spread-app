import { formatWeek, LICENSE_KEY, normalizeData, type SpreadData } from "./model.ts";
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
  /** Other `spread.*` settings worth keeping (not the license, schema marker or recovery copies). */
  settings: Record<string, string>;
};

export type FullBackupProfileSummary = { name: string; spreads: string[]; weeks: number; tasks: number; range: string };

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
    if (typeof text === "string") stores[profile.id] = text;
  }
  const settings: Record<string, string> = {};
  for (const [key, value] of Object.entries(collectEntries(storage))) {
    if (owned.has(key) || SKIPPED_SETTINGS.has(key) || isPlannerKey(key) || key.startsWith("spread.recovery.")) continue;
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
  };
  return { payload, summary: summarizeFull(payload) };
}

export function summarizeFull(payload: FullBackupPayload): FullBackup["summary"] {
  const profiles = payload.roster.map((profile) => {
    let one: BackupSummary = { spreads: [], weeks: 0, tasks: 0, range: "No weeks" };
    try {
      const stored = payload.stores[profile.id];
      if (stored) one = summarize(normalizeData(JSON.parse(stored)));
    } catch {
      /* an unreadable profile is listed as empty and skipped on restore */
    }
    return { name: profile.name, ...one };
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
  | { ok: true; profiles: Profile[]; writes: { key: string; value: string }[]; skipped: number }
  | { ok: false; reason: "no-room"; needed: number; free: number };

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
 * Add every profile in a full backup as a new profile. Nothing that is already on the device is
 * changed or removed: new ids, new storage keys, and names that say they were restored.
 */
export function planRestoreAsNew(payload: FullBackupPayload, existing: Profile[], newId: () => string): RestorePlan {
  const free = PROFILE_LIMIT - existing.length;
  const usable = payload.roster.filter((profile) => {
    try {
      const text = payload.stores[profile.id];
      if (text === undefined) return true;
      normalizeData(JSON.parse(text));
      return true;
    } catch {
      return false;
    }
  });
  if (usable.length > free) return { ok: false, reason: "no-room", needed: usable.length, free: Math.max(free, 0) };
  const taken = new Set(existing.map((profile) => profile.name.toLowerCase()));
  const used = new Set(existing.map((profile) => profile.id));
  const profiles: Profile[] = [...existing];
  const writes: { key: string; value: string }[] = [];
  for (const source of usable) {
    let id = newId();
    while (!id || used.has(id)) id = newId();
    used.add(id);
    const store = profileStore(id);
    const text = payload.stores[source.id];
    const data = text === undefined ? normalizeData(null) : normalizeData(JSON.parse(text));
    writes.push({ key: store, value: JSON.stringify(data) });
    profiles.push({
      id,
      name: restoredName(source.name, taken),
      store,
      theme: source.theme,
      accent: source.accent,
    });
  }
  return { ok: true, profiles, writes, skipped: payload.roster.length - usable.length };
}
