/**
 * Storage schema version and migration runner.
 *
 * Planner data has always been tolerant of older shapes (`normalizeData`), but nothing recorded
 * which shape a device was on. iCloud backup and sync need that, so one marker key holds an integer
 * version. The rules are deliberate and small:
 *
 * - Migrations only ever add. They never remove or rewrite what an earlier build wrote, so a build
 *   that is rolled back can still read everything.
 * - Each step is idempotent and the marker moves forward only after the step finished, so an
 *   interrupted launch simply repeats the step.
 * - A marker newer than this build means "saved by a newer Spread". The caller must not write.
 * - A copy of the pre-migration planner is handed to `snapshot` before any step runs.
 */
import { collectEntries, hasPlannerData, type KeyStore } from "./native-mirror.ts";

export const SCHEMA_KEY = "spread.schema";

/**
 * 1: the shape every build up to and including the first TestFlight candidate wrote (no marker).
 * 2: entity metadata (device id, version vectors, tombstones, profile `syncId`) may be present.
 *    Written lazily on edit, never by a bulk rewrite.
 */
export const CURRENT_SCHEMA = 2;

export type SchemaStorage = KeyStore & { removeItem?(key: string): void };

export type MigrationStep = {
  /** Runs when moving from `from` to `from + 1`. Must be idempotent and additive. */
  from: number;
  run(storage: SchemaStorage): void;
};

export const STEPS: MigrationStep[] = [
  // 1 -> 2 changes no stored data. It exists so the marker, snapshot and newer-version rules are
  // exercised on real devices before a step that does change data ships.
  { from: 1, run: () => undefined },
];

export type SchemaOutcome =
  | { status: "current"; version: number }
  | { status: "migrated"; from: number; to: number }
  /** Stored by a newer build. Do not write anything. */
  | { status: "newer"; version: number }
  | { status: "failed"; version: number; error: string };

export function readSchemaVersion(storage: KeyStore): number | null {
  let raw: string | null;
  try {
    raw = storage.getItem(SCHEMA_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

export type RunOptions = {
  steps?: MigrationStep[];
  current?: number;
  /** Receives the pre-migration planner before the first step. Must copy synchronously. */
  snapshot?: (label: string, entries: Record<string, string>) => void;
};

export function runMigrations(storage: SchemaStorage, options: RunOptions = {}): SchemaOutcome {
  const steps = options.steps ?? STEPS;
  const current = options.current ?? CURRENT_SCHEMA;
  const stored = readSchemaVersion(storage);

  if (stored !== null && stored > current) return { status: "newer", version: stored };

  // An empty device has nothing to migrate: start at the current version.
  if (stored === null && !hasPlannerData(storage)) {
    return writeMarker(storage, current) ? { status: "current", version: current } : { status: "failed", version: current, error: "marker" };
  }

  const start = stored ?? 1;
  if (start === current) return { status: "current", version: current };

  try {
    options.snapshot?.(`pre-migration-v${start}`, collectEntries(storage));
  } catch {
    // A snapshot that cannot be taken must not trap the person on an old version.
  }

  let version = start;
  while (version < current) {
    const step = steps.find((item) => item.from === version);
    try {
      step?.run(storage);
    } catch (error) {
      return { status: "failed", version, error: error instanceof Error ? error.message : String(error) };
    }
    if (!writeMarker(storage, version + 1)) return { status: "failed", version, error: "marker" };
    version += 1;
  }
  return { status: "migrated", from: start, to: current };
}

function writeMarker(storage: SchemaStorage, version: number): boolean {
  try {
    storage.setItem(SCHEMA_KEY, String(version));
    return true;
  } catch {
    return false;
  }
}
