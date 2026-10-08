/**
 * Feature flags for the iCloud features. Both ship off. QA and TestFlight builds turn them on at
 * build time (`VITE_SPREAD_CLOUD_BACKUP=1 npm run ios:sync`); the defaults below change only
 * when the matching release gate in docs/ICLOUD_PLAN.md has passed on hardware.
 */
function flag(value: unknown, fallback: boolean): boolean {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return fallback;
}

const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}) as Record<string, string | undefined>;

export const CLOUD_FLAGS = {
  /** Automatic iCloud backup. Gate 3. */
  backup: flag(env.VITE_SPREAD_CLOUD_BACKUP, false),
  /** Optional iCloud sync. Gate 4. */
  sync: flag(env.VITE_SPREAD_CLOUD_SYNC, false),
} as const;
