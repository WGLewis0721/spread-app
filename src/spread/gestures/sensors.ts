import { PointerSensor, type PointerSensorOptions } from "@dnd-kit/core";
import type { PointerEvent } from "react";
import { acceptsPointer, mouseActivation, touchActivation } from "@/spread/gestures/activation";

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

export { mouseActivation, touchActivation };
