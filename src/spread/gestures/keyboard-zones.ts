/**
 * Where an arrow key takes a task that is being moved with the keyboard: to the next place it can
 * be dropped (the To place tray or a whole day) below or above it, instead of nudging it a few
 * pixels at a time. Pure, so it can be tested without a browser.
 */
export type Zone = { id: string; top: number; left: number };

export function stepZone(zones: Zone[], top: number, direction: 1 | -1): Zone | null {
  const ordered = zones.slice().sort((a, b) => a.top - b.top);
  if (direction === 1) return ordered.find((zone) => zone.top > top + 1) ?? null;
  return ordered.reverse().find((zone) => zone.top < top - 1) ?? null;
}

export function arrowDirection(code: string): 1 | -1 | 0 {
  if (code === "ArrowDown" || code === "ArrowRight") return 1;
  if (code === "ArrowUp" || code === "ArrowLeft") return -1;
  return 0;
}
