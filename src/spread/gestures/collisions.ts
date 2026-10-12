import { pointerWithin, rectIntersection, type CollisionDetection } from "@dnd-kit/core";
import { TRAY_ID } from "@/spread/gestures/resolve-drop";

/**
 * Which drop place is under a held item. A point decides, not overlap, so a finger over a small
 * day cell wins over the wide card it drags: the pointer when there is one, and for the keyboard
 * the card's top-left corner, which the arrow keys put just inside the place they step to. The
 * To place sheet floats over the day, so it wins over anything it covers. Off every place, a mouse
 * or finger falls back to overlap so a near miss still lands.
 */
export const dropCollisions: CollisionDetection = (args) => {
  const point = args.pointerCoordinates ?? { x: args.collisionRect.left, y: args.collisionRect.top };
  const hits = pointerWithin({ ...args, pointerCoordinates: point });
  const tray = hits.find((hit) => hit.id === TRAY_ID);
  if (tray) return [tray];
  return hits.length > 0 ? hits : rectIntersection(args);
};
