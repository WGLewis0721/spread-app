/**
 * Where an arrow key takes a task that is being moved with the keyboard: to the next place it can
 * be dropped (a day in the week strip, or the To place sheet), in reading order: along a row, then
 * down. Pure, so it can be tested without a browser.
 */
export type Zone = { id: string; top: number; left: number };

/** Zones on the same row when their tops are this close. */
const ROW = 8;

function before(a: { top: number; left: number }, b: { top: number; left: number }) {
  if (Math.abs(a.top - b.top) <= ROW) return a.left < b.left - 1;
  return a.top < b.top;
}

export function stepZone(zones: Zone[], at: { top: number; left: number }, direction: 1 | -1): Zone | null {
  const ordered = zones.slice().sort((a, b) => (Math.abs(a.top - b.top) <= ROW ? a.left - b.left : a.top - b.top));
  if (direction === 1) return ordered.find((zone) => before(at, zone)) ?? null;
  return ordered.reverse().find((zone) => before(zone, at)) ?? null;
}

export function arrowDirection(code: string): 1 | -1 | 0 {
  if (code === "ArrowDown" || code === "ArrowRight") return 1;
  if (code === "ArrowUp" || code === "ArrowLeft") return -1;
  return 0;
}
