/**
 * Which local safety copies to delete. Copies taken before something destructive (a restore, a
 * link, a put-back) sit in their own, larger pool so a run of routine pre-sync copies can never
 * push them out. Names are `spread-pinned-<17 digit time>-<label>.json`.
 */
export const PINNED_PREFIX = "spread-pinned-";
export const ROUTINE_KEEP = 15;
export const PROTECTED_KEEP = 30;
const PROTECTED_LABELS = new Set(["pre-restore", "pre-sync-link", "pre-restore-discarded", "pre-restore-guard", "pre-rollback"]);

export function pinLabel(name: string): string {
  const match = /^spread-pinned-\d+-(.*)\.json$/.exec(name);
  return match ? match[1] : "";
}

export function pinsToDelete(names: string[]): string[] {
  const all = names.filter((name) => name.startsWith(PINNED_PREFIX) && name.endsWith(".json")).sort();
  const protectedPool = all.filter((name) => PROTECTED_LABELS.has(pinLabel(name)));
  const routine = all.filter((name) => !PROTECTED_LABELS.has(pinLabel(name)));
  return [...routine.slice(0, Math.max(0, routine.length - ROUTINE_KEEP)), ...protectedPool.slice(0, Math.max(0, protectedPool.length - PROTECTED_KEEP))];
}
