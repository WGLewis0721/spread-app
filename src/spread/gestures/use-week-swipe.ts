import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { gestureAllowsSwipe, weekSwipeDirection, weekSwipeShift, type Point } from "@/spread/gestures/swipe";

export function useWeekSwipe({
  dragActive,
  onShift,
  onCommit,
}: {
  dragActive: () => boolean;
  onShift?: (dx: number) => void;
  onCommit?: (direction: -1 | 1) => void;
}) {
  const start = useRef<Point | null>(null);

  function blocked(target: EventTarget | null) {
    return target instanceof Element && !!target.closest("[data-drag], input, button, textarea, a");
  }

  return {
    onPointerDown(event: ReactPointerEvent) {
      if (!gestureAllowsSwipe(dragActive())) return;
      if (event.clientX < 24 || event.clientX > window.innerWidth - 24) return;
      if (blocked(event.target)) return;
      start.current = { x: event.clientX, y: event.clientY };
    },
    onPointerMove(event: ReactPointerEvent) {
      if (!start.current || !gestureAllowsSwipe(dragActive())) return;
      onShift?.(weekSwipeShift(start.current, { x: event.clientX, y: event.clientY }));
    },
    onPointerUp(event: ReactPointerEvent) {
      const origin = start.current;
      start.current = null;
      if (!origin || !gestureAllowsSwipe(dragActive())) {
        onShift?.(0);
        return;
      }
      onShift?.(weekSwipeShift(origin, { x: event.clientX, y: event.clientY }));
      requestAnimationFrame(() => onShift?.(0));
      const direction = weekSwipeDirection(origin, { x: event.clientX, y: event.clientY }, { width: window.innerWidth });
      if (direction) onCommit?.(direction);
    },
    onPointerCancel() {
      start.current = null;
      onShift?.(0);
    },
  };
}
