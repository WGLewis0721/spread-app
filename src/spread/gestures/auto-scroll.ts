export function edgeScrollDelta(pointerY: number, viewportHeight: number, edge = 72): number {
  if (pointerY < edge) return -Math.ceil((edge - pointerY) / 4);
  if (pointerY > viewportHeight - edge) return Math.ceil((pointerY - (viewportHeight - edge)) / 4);
  return 0;
}
