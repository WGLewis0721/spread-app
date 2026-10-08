import { remainingHours, weekDays, type SpreadData } from "./model.ts";

/**
 * "Where could this fit?" for the open week. Spread keeps hours per role, not durations per task,
 * so the honest, explainable answer is: roles that still have hours not yet placed on a day, paired
 * with the lightest day still ahead. It is fully deterministic (same plan and date, same answer),
 * suggests at most three things, and never changes anything on its own: each suggestion is applied
 * only when the person taps it.
 */
export type Suggestion = { hatId: string; day: string; dayLabel: string; hours: number };

export type FreeTime =
  | { kind: "suggestions"; items: Suggestion[] }
  | { kind: "none"; reason: "no-roles" | "all-placed" | "week-over" };

export const MAX_SUGGESTIONS = 3;

export function suggestFreeTime(data: SpreadData, today: string): FreeTime {
  const week = data.weeks[data.currentWeek];
  if (!week || week.boxes.length === 0) return { kind: "none", reason: "no-roles" };

  const ahead = weekDays(data.currentWeek)
    .filter((day) => day.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (ahead.length === 0) return { kind: "none", reason: "week-over" };

  const load = new Map(ahead.map((day) => [day.date, week.allocations.filter((item) => item.day === day.date).reduce((sum, item) => sum + item.hours, 0)]));

  const open = week.boxes
    .map((box, index) => ({ hatId: box.hatId, index, left: remainingHours(box.hours, week.allocations, box.hatId) }))
    .filter((item) => item.left > 0 && data.hats.some((hat) => hat.id === item.hatId))
    .sort((a, b) => b.left - a.left || a.index - b.index);
  if (open.length === 0) return { kind: "none", reason: "all-placed" };

  const items: Suggestion[] = [];
  for (const role of open.slice(0, MAX_SUGGESTIONS)) {
    let best = ahead[0];
    for (const day of ahead) {
      if ((load.get(day.date) ?? 0) < (load.get(best.date) ?? 0)) best = day;
    }
    const hours = Math.min(1, role.left);
    items.push({ hatId: role.hatId, day: best.date, dayLabel: best.label, hours });
    load.set(best.date, (load.get(best.date) ?? 0) + hours);
  }
  return { kind: "suggestions", items };
}
