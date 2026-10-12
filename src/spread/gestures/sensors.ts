import {
  KeyboardSensor,
  PointerSensor,
  type DraggableNode,
  type KeyboardCoordinateGetter,
  type KeyboardSensorOptions,
  type PointerSensorOptions,
  type PointerSensorProps,
} from "@dnd-kit/core";
import type { KeyboardEvent, PointerEvent } from "react";
import { acceptsPointer, activationFor } from "@/spread/gestures/activation";
import { arrowDirection, stepZone, type Zone } from "@/spread/gestures/keyboard-zones";
import { TRAY_ID } from "@/spread/gestures/resolve-drop";

/**
 * One pointer sensor for mouse, pen and touch. dnd-kit keeps a single handler per event name, so
 * two sensors that both listen to pointer down cannot split the work: the later one silently wins.
 * The pointer type picks the activation instead.
 */
export class SpreadPointerSensor extends PointerSensor {
  constructor(props: PointerSensorProps) {
    const { pointerType } = props.event as globalThis.PointerEvent;
    super({ ...props, options: { ...props.options, activationConstraint: activationFor(pointerType) } });
  }

  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: PointerEvent, _options: PointerSensorOptions) => acceptsPointer(nativeEvent, nativeEvent.pointerType === "touch"),
    },
  ];
}

/**
 * Keyboard moving is for tasks only. A spread bubble and a day row already answer Enter and Space
 * with their own action (select, add), and a keyboard drag starting there would swallow the key.
 */
export class TaskKeyboardSensor extends KeyboardSensor {
  static activators = [
    {
      eventName: "onKeyDown" as const,
      handler: (event: KeyboardEvent, options: KeyboardSensorOptions, context: { active: DraggableNode }) =>
        context.active.data.current?.kind === "task" && KeyboardSensor.activators[0].handler(event, options, context),
    },
  ];
}

/** Arrow keys step a held task from one drop place to the next: each day in the strip, then the sheet. */
export const zoneKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  const direction = arrowDirection(event.code);
  if (direction === 0) return undefined;
  event.preventDefault();
  const zones: Zone[] = [];
  for (const container of context.droppableContainers.getEnabled()) {
    const id = String(container.id);
    if (id !== TRAY_ID && !id.startsWith("day:")) continue;
    const rect = context.droppableRects.get(container.id);
    if (rect) zones.push({ id, top: rect.top, left: rect.left });
  }
  // The held item sits 12 px inside the zone it was last stepped to.
  const target = stepZone(zones, { top: currentCoordinates.y - 12, left: currentCoordinates.x - 12 }, direction);
  return target ? { x: target.left + 12, y: target.top + 12 } : undefined;
};

