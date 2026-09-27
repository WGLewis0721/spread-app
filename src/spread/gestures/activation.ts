export const mouseActivation = { distance: 4 } as const;
export const touchActivation = { delay: 180, tolerance: 8 } as const;

export function acceptsPointer(
  event: { isPrimary: boolean; button: number; pointerType: string },
  touch: boolean,
): boolean {
  if (!event.isPrimary || event.button !== 0) return false;
  return touch ? event.pointerType === "touch" : event.pointerType !== "touch";
}
