import { useEffect, useRef, useState } from "react";

const DETENT = 64;

export function WeekCrown({
  title,
  detail,
  onDetail,
  turn,
  onMove,
  onShift,
  unit = "week",
}: {
  title: string;
  detail?: string;
  onDetail?: () => void;
  turn: number;
  onMove: (direction: -1 | 1) => void;
  onShift?: (pixels: number) => void;
  unit?: string;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; pointer: number; origin: number } | null>(null);
  const carry = useRef(0);
  const [local, setLocal] = useState(0);
  const [live, setLive] = useState(false);
  const shown = turn !== 0 ? turn : local;

  useEffect(() => {
    onShift?.(shown);
  }, [shown, onShift]);

  useEffect(() => {
    const node = wheelRef.current;
    if (!node) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (raw === 0) return;
      carry.current += raw;
      let steps = 0;
      while (carry.current >= DETENT) {
        carry.current -= DETENT;
        steps += 1;
      }
      while (carry.current <= -DETENT) {
        carry.current += DETENT;
        steps -= 1;
      }
      setLocal(carry.current);
      if (steps < 0) for (let i = 0; i > steps; i -= 1) onMove(-1);
      if (steps > 0) for (let i = 0; i < steps; i += 1) onMove(1);
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [onMove]);

  function release() {
    drag.current = null;
    setLive(false);
    requestAnimationFrame(() => {
      carry.current = 0;
      setLocal(0);
    });
  }

  return (
    <div className="crown">
      <div
        ref={wheelRef}
        className="crown-wheel"
        style={{ touchAction: "none" }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          drag.current = { x: event.clientX, pointer: event.pointerId, origin: carry.current };
          setLive(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.pointer !== event.pointerId) return;
          const next = start.origin + event.clientX - start.x;
          let steps = 0;
          let rest = next;
          while (rest >= DETENT) {
            rest -= DETENT;
            steps -= 1;
          }
          while (rest <= -DETENT) {
            rest += DETENT;
            steps += 1;
          }
          if (steps !== 0) {
            start.x = event.clientX;
            start.origin = rest;
          }
          if (steps < 0) for (let i = 0; i > steps; i -= 1) onMove(-1);
          if (steps > 0) for (let i = 0; i < steps; i += 1) onMove(1);
          carry.current = rest;
          setLocal(rest);
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <svg
          className={live ? "crown-ridges" : "crown-ridges crown-ridges-rest"}
          style={{ transform: `translateX(${shown}px)` }}
          viewBox="0 0 980 64"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="crown-tooth" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--tooth-dark)" />
              <stop offset="38%" stopColor="var(--tooth-mid)" />
              <stop offset="50%" stopColor="var(--tooth-light)" />
              <stop offset="64%" stopColor="var(--tooth-mid)" />
              <stop offset="100%" stopColor="var(--tooth-dark)" />
            </linearGradient>
            <pattern id="crown-knurl" width="16" height="64" patternUnits="userSpaceOnUse">
              <rect width="16" height="64" fill="var(--tooth-gap)" />
              <rect x="1.25" width="12.5" height="64" rx="2.2" fill="url(#crown-tooth)" />
            </pattern>
          </defs>
          <rect width="980" height="64" fill="url(#crown-knurl)" />
        </svg>
        <div className="crown-sheen" />
        <div className="crown-readout">
          <p className="truncate text-base font-semibold">{title}</p>
          {detail && onDetail ? (
            <button type="button" className="text-xs font-medium text-accent" onClick={onDetail}>
              {detail}
            </button>
          ) : (
            detail && <p className="truncate text-xs text-secondary tabular-nums">{detail}</p>
          )}
        </div>
        <button type="button" className="crown-cap crown-cap-left" aria-label={`Previous ${unit}`} onClick={() => onMove(-1)} />
        <button type="button" className="crown-cap crown-cap-right" aria-label={`Next ${unit}`} onClick={() => onMove(1)} />
      </div>
      <p className="mt-2 text-center text-xs text-secondary">Scroll left or right to change {unit}s.</p>
    </div>
  );
}
