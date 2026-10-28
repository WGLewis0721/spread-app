import { useCallback, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { roleVars } from "@/lib/spread/studio/role-style";
import { CategoryBadge } from "@/spread/components/category-badge";
import type { Allocation, Hat } from "@/lib/spread/model";
import { SPREAD_LAYOUTS, dialSegments, segmentAt, type SpreadLayout } from "@/lib/spread/studio/layouts";

import { cn } from "@/lib/cn";

/**
 * Ways to lay out the Spread tab when the Studio Board is on. Stack is the default and is the
 * look the app shipped with in Studio. The others are options in Settings > View. The choice is a
 * per-device preference, kept apart from the appearance contract on purpose: it changes how the
 * same roles are arranged, never how any of them is painted.
 */
export type LayoutRow = { hat: Hat; hours: number };

function hoursText(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function spoken(hours: number) {
  const shown = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${shown} ${hours === 1 ? "hour" : "hours"}`;
}

function RoleBadge({ hat, size = 36 }: { hat: Hat; size?: number }) {
  return hat.category ? (
    <CategoryBadge category={hat.category} color={hat.color} size={size} />
  ) : (
    <span className="block rounded-full" style={{ width: size, height: size, backgroundColor: hat.color }} aria-hidden="true" />
  );
}

/* Fan: a hand of cards pivoting on a point below the stage, like the Audio Sphere reference.
   The chosen card sits upright in front with its name and hours. The others lean out behind it and
   show only a badge on their outer corner. Tap one, swipe, or use the arrow keys to turn the hand. */
export function FanLayout({ rows, selectedId, onSelect, children }: { rows: LayoutRow[]; selectedId: string; onSelect: (id: string) => void; children?: ReactNode }) {
  const count = rows.length;
  const at = Math.max(0, rows.findIndex((row) => row.hat.id === selectedId));
  const start = useRef<{ x: number; id: number } | null>(null);
  const move = useCallback((steps: number) => {
    if (count < 2) return;
    onSelect(rows[(at + steps + count * 4) % count].hat.id);
  }, [at, count, onSelect, rows]);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  };
  return (
    <div>
      <div
        className="studio-fan"
        role="group"
        aria-label="Spreads"
        onKeyDown={onKey}
        onPointerDown={(event: PointerEvent) => { start.current = { x: event.clientX, id: event.pointerId }; }}
        onPointerUp={(event: PointerEvent) => {
          const origin = start.current;
          start.current = null;
          if (!origin || origin.id !== event.pointerId) return;
          const dx = event.clientX - origin.x;
          if (Math.abs(dx) > 42) move(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => { start.current = null; }}
      >
        {rows.map((row, index) => {
          let d = index - at;
          if (d > count / 2) d -= count;
          if (d < -count / 2) d += count;
          const front = d === 0;
          return (
            <button
              key={row.hat.id}
              type="button"
              className="studio-fan-card"
              data-front={front ? "true" : "false"}
              data-side={d < 0 ? "left" : "right"}
              data-far={Math.abs(d) > 2 ? "true" : "false"}
              aria-pressed={front}
              aria-label={`${row.hat.name}, ${spoken(row.hours)}`}
              tabIndex={Math.abs(d) > 2 ? -1 : 0}
              style={roleVars(row.hat.color, { "--d": d, "--abs": Math.abs(d) } as CSSProperties)}
              onClick={() => onSelect(row.hat.id)}
            >
              <span className="studio-fan-badge" aria-hidden="true"><RoleBadge hat={row.hat} size={front ? 40 : 34} /></span>
              {front && (
                <span className="studio-fan-label">
                  <span className="studio-fan-name">{row.hat.name}</span>
                  <span className="studio-fan-hours">{hoursText(row.hours)}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

/* Dial: a ring whose arcs are sized by each spread's hours, around a dark sphere that shows the
   chosen spread. Drag around the ring, tap an arc, or use the arrow keys. It is one slider. */
const DIAL = 260;
const MID = DIAL / 2;
const RADIUS = 104;

function polar(deg: number, radius: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [MID + radius * Math.cos(rad), MID + radius * Math.sin(rad)];
}

function arcPath(from: number, to: number) {
  const [x0, y0] = polar(from, RADIUS);
  const [x1, y1] = polar(to, RADIUS);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function DialLayout({ rows, selectedId, onSelect, children }: { rows: LayoutRow[]; selectedId: string; onSelect: (id: string) => void; children?: ReactNode }) {
  const segments = dialSegments(rows.map((item) => ({ id: item.hat.id, hours: item.hours })));
  const at = Math.max(0, rows.findIndex((row) => row.hat.id === selectedId));
  const row = rows[at];
  const total = rows.reduce((sum, item) => sum + item.hours, 0);
  const host = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pick = (event: PointerEvent) => {
    const box = host.current?.getBoundingClientRect();
    if (!box) return;
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const hit = segmentAt(segments, angle);
    if (hit && hit.id !== selectedId) onSelect(hit.id);
  };
  const onKey = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step || rows.length < 2) return;
    event.preventDefault();
    onSelect(rows[(at + step + rows.length) % rows.length].hat.id);
  };
  const mid = segments[at] ? (segments[at].from + segments[at].to) / 2 : 0;
  const [kx, ky] = polar(mid, RADIUS);
  return (
    <div>
      <div
        ref={host}
        className="studio-dial"
        role="slider"
        tabIndex={0}
        aria-label="Spread dial"
        aria-valuemin={1}
        aria-valuemax={Math.max(1, rows.length)}
        aria-valuenow={at + 1}
        aria-valuetext={row ? `${row.hat.name}, ${spoken(row.hours)}` : ""}
        style={row ? roleVars(row.hat.color) : undefined}
        onKeyDown={onKey}
        onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); pick(event as unknown as PointerEvent); }}
        onPointerMove={(event) => { if (dragging.current) pick(event as unknown as PointerEvent); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <svg viewBox={`0 0 ${DIAL} ${DIAL}`} className="studio-dial-ring" aria-hidden="true">
          {rows.map((item, index) => (
            <path
              key={item.hat.id}
              d={arcPath(segments[index].from, segments[index].to)}
              fill="none"
              stroke={item.hat.color}
              strokeLinecap="round"
              strokeWidth={index === at ? 26 : 16}
              strokeOpacity={index === at ? 1 : 0.5}
              style={{ transition: "stroke-width 320ms cubic-bezier(.32,.72,0,1), stroke-opacity 320ms" }}
            />
          ))}
          <circle cx={kx} cy={ky} r={9} fill="#fff" style={{ transition: "cx 380ms cubic-bezier(.32,.72,0,1), cy 380ms cubic-bezier(.32,.72,0,1)" }} />
        </svg>
        <div className="studio-dial-sphere">
          <span className="studio-dial-hours">{row ? hoursText(row.hours) : "0h"}</span>
          <span className="studio-dial-name">{row?.hat.name ?? ""}</span>
          <span className="studio-dial-total">of {hoursText(total)}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

/* Tabs: All shows the turning stack, a spread's tab shows that one spread. */
export function TabsLayout({ rows, tab, onTab, children }: { rows: LayoutRow[]; tab: string; onTab: (id: string) => void; children?: ReactNode }) {
  const ids = ["all", ...rows.map((row) => row.hat.id)];
  const onKey = (event: KeyboardEvent) => {
    const at = ids.indexOf(tab);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = ids[(at + step + ids.length) % ids.length];
    onTab(next);
    document.getElementById(`studio-tab-${next}`)?.focus();
  };
  return (
    <div>
      <div className="studio-tabs" role="tablist" aria-label="Spreads" onKeyDown={onKey}>
        <button id="studio-tab-all" type="button" role="tab" aria-selected={tab === "all"} tabIndex={tab === "all" ? 0 : -1} className="studio-tab studio-tab-all" onClick={() => onTab("all")}>
          All
        </button>
        {rows.map((row) => (
          <button
            key={row.hat.id}
            id={`studio-tab-${row.hat.id}`}
            type="button"
            role="tab"
            aria-selected={tab === row.hat.id}
            tabIndex={tab === row.hat.id ? 0 : -1}
            className="studio-tab"
            style={roleVars(row.hat.color)}
            onClick={() => onTab(row.hat.id)}
          >
            <span className="studio-tab-dot" aria-hidden="true" />
            {row.hat.name}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-labelledby={`studio-tab-${tab}`}>{children}</div>
    </div>
  );
}

/* Day: pick a day, see its planned hours as a vertical timeline of blocks in each spread's color. */
export function DayLayout({
  rows,
  days,
  allocations,
  today,
  selectedDay,
  onDay,
  selectedId,
  onPickRole,
  children,
}: {
  rows: LayoutRow[];
  days: { label: string; date: string }[];
  allocations: Allocation[];
  today: string;
  selectedDay: string;
  onDay: (date: string) => void;
  selectedId: string;
  onPickRole: (id: string) => void;
  children?: ReactNode;
}) {
  const hats = new Map(rows.map((row) => [row.hat.id, row.hat]));
  const blocks = allocations
    .filter((item) => item.day === selectedDay && item.hours > 0 && hats.has(item.hatId))
    .sort((a, b) => a.order - b.order);
  const total = blocks.reduce((sum, item) => sum + item.hours, 0);
  const label = days.find((day) => day.date === selectedDay);
  let elapsed = 0;
  return (
    <div>
      <div className="studio-glance-chips" role="group" aria-label="Day">
        {days.map((day) => {
          const planned = allocations.some((item) => item.day === day.date && item.hours > 0);
          return (
            <button
              key={day.date}
              type="button"
              className="studio-glance-chip"
              aria-pressed={day.date === selectedDay}
              aria-label={`${day.label}${day.date === today ? ", today" : ""}${planned ? "" : ", nothing planned"}`}
              data-today={day.date === today ? "true" : "false"}
              data-planned={planned ? "true" : "false"}
              onClick={() => onDay(day.date)}
            >
              <span className="studio-glance-chip-name">{day.label.slice(0, 3)}</span>
              <span className="studio-glance-chip-date">{Number(day.date.slice(8, 10))}</span>
            </button>
          );
        })}
      </div>
      <div className="studio-day-head studio-readable-panel">
        <h2>{selectedDay === today ? "Your day at a glance" : `${label?.label ?? "Day"} at a glance`}</h2>
        <p>{total > 0 ? `${hoursText(total)} planned across ${blocks.length} ${blocks.length === 1 ? "block" : "blocks"}` : "Nothing planned yet. Place hours on the Week tab."}</p>
      </div>
      {blocks.length > 0 && (
        <ol className="studio-day-timeline" aria-label={`${label?.label ?? "Day"} timeline`}>
          {blocks.map((block) => {
            const hat = hats.get(block.hatId)!;
            const from = elapsed;
            elapsed += block.hours;
            return (
              <li key={block.id} className="studio-day-row">
                <span className="studio-day-time">{hoursText(from)}</span>
                <button
                  type="button"
                  className="studio-day-block"
                  aria-pressed={selectedId === hat.id}
                  aria-label={`${hat.name}, ${spoken(block.hours)}`}
                  style={roleVars(hat.color, { "--h": Math.min(block.hours, 6) } as CSSProperties)}
                  onClick={() => onPickRole(hat.id)}
                >
                  <span aria-hidden="true"><RoleBadge hat={hat} size={32} /></span>
                  <span className="studio-day-block-name">{hat.name}</span>
                  <span className="studio-day-block-hours">{hoursText(block.hours)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {children}
    </div>
  );
}

/** A small preview glyph for each layout, drawn in the current ink. Decorative. */
export function LayoutGlyph({ layout }: { layout: SpreadLayout }) {
  const common = { width: 34, height: 34, viewBox: "0 0 34 34", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (layout) {
    case "stack":
      return <svg {...common}><rect x="5" y="6" width="24" height="8" rx="4" /><rect x="5" y="13" width="24" height="8" rx="4" /><rect x="5" y="20" width="24" height="8" rx="4" /></svg>;
    case "fan":
      return <svg {...common}><rect x="9" y="8" width="16" height="20" rx="4" transform="rotate(-16 17 28)" /><rect x="9" y="8" width="16" height="20" rx="4" transform="rotate(16 17 28)" /><rect x="9" y="7" width="16" height="21" rx="4" /></svg>;
    case "dial":
      return <svg {...common}><circle cx="17" cy="17" r="11" strokeDasharray="14 4" /><circle cx="17" cy="17" r="5" /></svg>;
    case "tabs":
      return <svg {...common}><rect x="3" y="6" width="9" height="6" rx="3" /><rect x="14" y="6" width="9" height="6" rx="3" /><rect x="25" y="6" width="6" height="6" rx="3" /><rect x="5" y="16" width="24" height="12" rx="4" /></svg>;
    default:
      return <svg {...common}><path d="M8 5v24" /><circle cx="8" cy="10" r="1.6" /><circle cx="8" cy="22" r="1.6" /><rect x="14" y="6" width="14" height="8" rx="3" /><rect x="14" y="18" width="14" height="9" rx="3" /></svg>;
  }
}

export function LayoutPicker({ layout, onPick }: { layout: SpreadLayout; onPick: (layout: SpreadLayout) => void }) {
  return (
    <div className="studio-layout-picker" role="radiogroup" aria-label="Spread tab view">
      {SPREAD_LAYOUTS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={layout === item.id}
          className={cn("studio-layout-option")}
          onClick={() => onPick(item.id)}
        >
          <LayoutGlyph layout={item.id} />
          <span className="studio-layout-text">
            <span className="studio-layout-name">{item.label}{item.id === "stack" ? <em>Default</em> : null}</span>
            <span className="studio-layout-hint">{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
