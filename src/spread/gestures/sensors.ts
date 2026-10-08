import {
  KeyboardSensor,
  PointerSensor,
  type DraggableNode,
  type KeyboardCoordinateGetter,
  type KeyboardSensorOptions,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import type { KeyboardEvent, PointerEvent } from "react";
import { acceptsPointer, mouseActivation, touchActivation } from "@/spread/gestures/activation";
import { arrowDirection, stepZone, type Zone } from "@/spread/gestures/keyboard-zones";
import { TRAY_ID } from "@/spread/gestures/resolve-drop";

export class FastPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (event: PointerEvent, _options: PointerSensorOptions) => acceptsPointer(event.nativeEvent, false),
    },
  ];
}

export class HoldPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (event: PointerEvent, _options: PointerSensorOptions) => acceptsPointer(event.nativeEvent, true),
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

/** Arrow keys step a held task from one drop place to the next (the tray, then each day). */
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
  const target = stepZone(zones, currentCoordinates.y, direction);
  return target ? { x: target.left + 12, y: target.top + 12 } : undefined;
};

export { mouseActivation, touchActivation };
