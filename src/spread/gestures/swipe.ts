export type Point = { x: number; y: number };

export function weekSwipeDirection(
  start: Point,
  end: Point,
  options?: { threshold?: number; edge?: number; width?: number },
): -1 | 1 | null {
  const edge = options?.edge ?? 24;
  if (options?.width && (start.x < edge || start.x > options.width - edge)) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const threshold = options?.threshold ?? 64;
  if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) return dx < 0 ? 1 : -1;
  return null;
}

export function weekSwipeShift(start: Point, current: Point, max = 72): number {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return 0;
  return Math.max(-max, Math.min(max, dx));
}

export function gestureAllowsSwipe(dragActive: boolean): boolean {
  return !dragActive;
}
