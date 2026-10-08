import type { SpreadData, WeekData } from "./model.ts";

/**
 * One reversible change to one week. Undo restores the week exactly as it was, but only when the
 * week is still exactly as the change left it. If anything else touched it since (a typed task, a
 * synced change, another drag), undo refuses rather than overwrite that newer work.
 */
export type WeekEdit = {
  id: string;
  profileId: string;
  weekKey: string;
  before: WeekData;
  after: WeekData;
};

export const UNDO_DEPTH = 10;

export function sameWeek(a: WeekData | undefined, b: WeekData | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Null when the change did nothing, so no Undo is offered for a no-op. */
export function makeEdit(id: string, profileId: string, before: SpreadData, after: SpreadData): WeekEdit | null {
  const weekKey = after.currentWeek;
  if (before.currentWeek !== weekKey) return null;
  const was = before.weeks[weekKey];
  const now = after.weeks[weekKey];
  if (!was || !now || sameWeek(was, now)) return null;
  return { id, profileId, weekKey, before: was, after: now };
}

/**
 * Undo is safe while that week is exactly as the change left it, in the same profile. Which week is
 * on screen does not matter: turning to next week and back must not cost the person their Undo.
 */
export function canUndo(edit: WeekEdit, profileId: string, data: SpreadData): boolean {
  return edit.profileId === profileId && sameWeek(data.weeks[edit.weekKey], edit.after);
}

export function applyUndo(edit: WeekEdit, data: SpreadData): SpreadData {
  return { ...data, weeks: { ...data.weeks, [edit.weekKey]: edit.before } };
}

export function pushEdit(stack: WeekEdit[], edit: WeekEdit): WeekEdit[] {
  return [...stack, edit].slice(-UNDO_DEPTH);
}
