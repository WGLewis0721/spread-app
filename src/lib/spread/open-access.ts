/**
 * Opt-in local-only planner entry, for reviewed development and beta builds.
 *
 * The switch only affects client-side access to personal device storage.
 * Server accounts, sessions, database rows and admin endpoints remain protected.
 * The production web beta keeps its existing gate until separately released.
 */
export function isLocalFirstAccessEnabled(value: unknown): boolean {
  return value === "1";
}

export const LOCAL_FIRST_OPEN_ACCESS = isLocalFirstAccessEnabled(
  import.meta.env?.VITE_SPREAD_OPEN_ACCESS,
);
