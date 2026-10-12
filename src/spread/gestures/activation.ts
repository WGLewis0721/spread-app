export const mouseActivation = { distance: 4 } as const;
export const touchActivation = { delay: 180, tolerance: 8 } as const;

/** A finger holds before a drag, so a swipe still scrolls; a mouse or pen starts after a short move. */
export function activationFor(pointerType: string) {
  return pointerType === "touch" ? touchActivation : mouseActivation;
}

export function acceptsPointer(
  event: { isPrimary: boolean; button: number; pointerType: string },
  touch: boolean,
): boolean {
  if (!event.isPrimary || event.button !== 0) return false;
  return touch ? event.pointerType === "touch" : event.pointerType !== "touch";
}
