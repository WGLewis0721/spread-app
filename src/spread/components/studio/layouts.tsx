import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { roleVars } from "@/lib/spread/studio/role-style";
import { CategoryBadge } from "@/spread/components/category-badge";
import type { Allocation, Hat } from "@/lib/spread/model";
import { SPREAD_LAYOUTS, dialSegments, segmentAt, type SpreadLayout } from "@/lib/spread/studio/layouts";
import { selectionTick } from "@/lib/spread/studio/tick";

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
   show a badge and their hours on the outer corner. Tap one, drag, or use the arrow keys.
   The hand follows the finger while it is down and settles with the finger's own speed, so a
   flick carries it further than a slow drag. Each card is placed by `--e`, its signed distance
   from the front in cards, which JavaScript sets to a fraction while dragging. */
const FAN_STEP = 96;

export function FanLayout({ rows, selectedId, onSelect, children }: { rows: LayoutRow[]; selectedId: string; onSelect: (id: string) => void; children?: ReactNode }) {
  const count = rows.length;
  const at = Math.max(0, rows.findIndex((row) => row.hat.id === selectedId));
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; id: number; lastX: number; lastT: number; v: number; moved: boolean } | null>(null);
  const suppress = useRef(false);
  const move = useCallback((steps: number) => {
    if (count < 2 || steps === 0) return;
    onSelect(rows[(at + steps + count * 4) % count].hat.id);
    void selectionTick();
  }, [at, count, onSelect, rows]);
  const paint = useCallback((shift: number) => {
    host.current?.querySelectorAll<HTMLElement>(".studio-fan-card").forEach((card) => {
      let e = Number(card.dataset.d) + shift;
      if (e > count / 2) e -= count;
      if (e < -count / 2) e += count;
      card.style.setProperty("--e", String(e));
      card.style.setProperty("--ea", String(Math.abs(e)));
    });
  }, [count]);
  // After React commits a new front card, drop any fractional drag offsets back to whole cards.
  useLayoutEffect(() => { paint(0); }, [at, count, paint]);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  };
  return (
    <div>
      <div
        ref={host}
        className="studio-fan"
        role="group"
        aria-label="Spreads"
        onKeyDown={onKey}
        onClickCapture={(event) => { if (suppress.current) { event.stopPropagation(); event.preventDefault(); suppress.current = false; } }}
        onPointerDown={(event: PointerEvent) => {
          suppress.current = false;
          drag.current = { x: event.clientX, id: event.pointerId, lastX: event.clientX, lastT: event.timeStamp, v: 0, moved: false };
        }}
        onPointerMove={(event: PointerEvent) => {
          const d = drag.current;
          if (!d || d.id !== event.pointerId || count < 2) return;
          const dx = event.clientX - d.x;
          if (!d.moved) {
            if (Math.abs(dx) < 6) return;
            d.moved = true;
            host.current?.setPointerCapture(event.pointerId);
            host.current!.dataset.drag = "true";
          }
          const dt = Math.max(1, event.timeStamp - d.lastT);
          d.v = Math.max(-2.5, Math.min(2.5, 0.8 * d.v + 0.2 * ((event.clientX - d.lastX) / dt)));
          d.lastX = event.clientX;
          d.lastT = event.timeStamp;
          // Rubber band past two cards so the hand never runs away from the finger.
          const pull = Math.abs(dx) > FAN_STEP * 2 ? Math.sign(dx) * (FAN_STEP * 2 + (Math.abs(dx) - FAN_STEP * 2) * 0.25) : dx;
          paint(pull / FAN_STEP);
        }}
        onPointerUp={(event: PointerEvent) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.id !== event.pointerId) return;
          delete host.current!.dataset.drag;
          if (!d.moved) return;
          suppress.current = true;
          window.setTimeout(() => { suppress.current = false; }, 0);
          const dx = event.clientX - d.x;
          const steps = Math.max(-2, Math.min(2, Math.round(-(dx + d.v * 140) / FAN_STEP)));
          if (steps === 0) paint(0);
          else move(steps);
        }}
        onPointerCancel={() => { drag.current = null; if (host.current) delete host.current.dataset.drag; paint(0); }}
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
              data-d={d}
              data-front={front ? "true" : "false"}
              data-far={Math.abs(d) > 2 ? "true" : "false"}
              aria-pressed={front}
              aria-label={`${row.hat.name}, ${spoken(row.hours)}`}
              tabIndex={Math.abs(d) > 2 ? -1 : 0}
              style={roleVars(row.hat.color, { "--e": d, "--ea": Math.abs(d), "--i": index } as CSSProperties)}
              onClick={() => onSelect(row.hat.id)}
            >
              <span className="studio-fan-badge" aria-hidden="true"><RoleBadge hat={row.hat} size={40} /></span>
              <span className="studio-fan-mini" aria-hidden="true">{hoursText(row.hours)}</span>
              <span className="studio-fan-label" aria-hidden="true">
                <span className="studio-fan-name">{row.hat.name}</span>
                <span className="studio-fan-hours">{hoursText(row.hours)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {count > 1 && (
        <div className="studio-fan-dots" aria-hidden="true">
          {rows.map((row, index) => <span key={row.hat.id} data-on={index === at ? "true" : "false"} />)}
        </div>
      )}
      {children}
    </div>
  );
}

/* Dial: a ring whose arcs are sized by each spread's hours, around a dark sphere that shows the
   chosen spread. Drag around the ring, tap an arc, or use the arrow keys. It is one slider.
   The knob orbits by turning a group, with the angle unwrapped so it always takes the short way
   round. Ticks near the knob brighten like a lens. The hours count up to the new figure. */
const DIAL = 260;
const MID = DIAL / 2;
const RADIUS = 104;
const TICKS = 72;

function polar(deg: number, radius: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [MID + radius * Math.cos(rad), MID + radius * Math.sin(rad)];
}

function arcPath(from: number, to: number) {
  const [x0, y0] = polar(from, RADIUS);
  const [x1, y1] = polar(to, RADIUS);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function calm() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** A number that eases to its new value instead of jumping. Whole until it lands on a fraction. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (calm()) { from.current = value; setShown(value); return; }
    const begin = from.current;
    if (begin === value) return;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / 420);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = begin + (value - begin) * eased;
      from.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(frame);
      else { from.current = value; setShown(value); }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const whole = Number.isInteger(value);
  return <>{hoursText(whole ? Math.round(shown) : Math.round(shown * 10) / 10)}</>;
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
    if (hit && hit.id !== selectedId) { onSelect(hit.id); void selectionTick(); }
  };
  const onKey = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step || rows.length < 2) return;
    event.preventDefault();
    onSelect(rows[(at + step + rows.length) % rows.length].hat.id);
    void selectionTick();
  };
  const mid = segments[at] ? (segments[at].from + segments[at].to) / 2 : 0;
  // Unwrap: choose the angle equal to `mid` mod 360 that is nearest the last one drawn.
  const last = useRef(mid);
  const turn = ((mid - last.current + 540) % 360) - 180;
  const knob = last.current + turn;
  last.current = knob;
  const nearest = (deg: number) => Math.abs((((deg - mid + 540) % 360) + 360) % 360 - 180);
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
        onPointerDown={(event) => { dragging.current = true; host.current!.dataset.drag = "true"; event.currentTarget.setPointerCapture(event.pointerId); pick(event as unknown as PointerEvent); }}
        onPointerMove={(event) => { if (dragging.current) pick(event as unknown as PointerEvent); }}
        onPointerUp={() => { dragging.current = false; delete host.current!.dataset.drag; }}
        onPointerCancel={() => { dragging.current = false; delete host.current!.dataset.drag; }}
      >
        <svg viewBox={`0 0 ${DIAL} ${DIAL}`} className="studio-dial-ring" aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => {
            const deg = (i * 360) / TICKS;
            const [x0, y0] = polar(deg, 124);
            const [x1, y1] = polar(deg, i % 6 === 0 ? 131 : 128);
            const near = Math.max(0, 1 - nearest(deg) / 36);
            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="currentColor" strokeLinecap="round" strokeWidth={i % 6 === 0 ? 1.6 : 1.1} style={{ opacity: 0.16 + near * 0.7, transition: "opacity 320ms" }} />;
          })}
          {rows.map((item, index) => (
            <path
              key={item.hat.id}
              d={arcPath(segments[index].from, segments[index].to)}
              fill="none"
              stroke={item.hat.color}
              strokeLinecap="round"
              strokeWidth={index === at ? 26 : 14}
              strokeOpacity={index === at ? 1 : 0.42}
              style={{ transition: "stroke-width 380ms cubic-bezier(.32,.72,0,1), stroke-opacity 320ms" }}
            />
          ))}
          <g className="studio-dial-orbit" style={{ transform: `rotate(${knob}deg)` }}>
            <circle className="studio-dial-knob" cx={MID} cy={MID - RADIUS} r={10} />
            <circle cx={MID} cy={MID - RADIUS} r={3.6} fill={row?.hat.color ?? "#000"} />
          </g>
        </svg>
        <div className="studio-dial-sphere">
          <span className="studio-dial-hours"><CountUp value={row?.hours ?? 0} /></span>
          <span key={row?.hat.id} className="studio-dial-name">{row?.hat.name ?? ""}</span>
          <span className="studio-dial-total">of {hoursText(total)}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

/* Tabs: All shows the turning stack, a spread's tab shows that one spread. The chosen tab is kept
   in view, and the panel slides in from the side the tab lies on. */
export function TabsLayout({ rows, tab, onTab, children }: { rows: LayoutRow[]; tab: string; onTab: (id: string) => void; children?: ReactNode }) {
  const ids = ["all", ...rows.map((row) => row.hat.id)];
  const bar = useRef<HTMLDivElement>(null);
  const before = useRef(ids.indexOf(tab));
  const now = ids.indexOf(tab);
  const dir = now >= before.current ? "next" : "prev";
  useEffect(() => { before.current = now; }, [now]);
  useEffect(() => {
    const el = document.getElementById(`studio-tab-${tab}`);
    const box = bar.current;
    if (!el || !box) return;
    box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.clientWidth) / 2, behavior: calm() ? "auto" : "smooth" });
  }, [tab]);
  const onKey = (event: KeyboardEvent) => {
    const at = ids.indexOf(tab);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = ids[(at + step + ids.length) % ids.length];
    onTab(next);
    document.getElementById(`studio-tab-${next}`)?.focus();
  };
  const choose = (id: string) => { if (id !== tab) { onTab(id); void selectionTick(); } };
  return (
    <div>
      <div ref={bar} className="studio-tabs" role="tablist" aria-label="Spreads" onKeyDown={onKey}>
        <button id="studio-tab-all" type="button" role="tab" aria-selected={tab === "all"} tabIndex={tab === "all" ? 0 : -1} className="studio-tab studio-tab-all" onClick={() => choose("all")}>
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
            onClick={() => choose(row.hat.id)}
          >
            <span className="studio-tab-dot" aria-hidden="true" />
            {row.hat.name}
          </button>
        ))}
      </div>
      <div key={tab} role="tabpanel" className="studio-tabpanel" data-dir={dir} aria-labelledby={`studio-tab-${tab}`}>{children}</div>
    </div>
  );
}

/* Day: pick a day, see its planned hours as a vertical timeline of blocks in each spread's color.
   Each chip fills from the bottom by how full its day is next to the busiest day of the week. A
   new day's blocks rise in one after another, from the side the day lies on. */
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
  const perDay = days.map((day) => allocations.filter((item) => item.day === day.date && item.hours > 0 && hats.has(item.hatId)).reduce((sum, item) => sum + item.hours, 0));
  const busiest = Math.max(1, ...perDay);
  const now = days.findIndex((day) => day.date === selectedDay);
  const before = useRef(now);
  const dir = now >= before.current ? "next" : "prev";
  useEffect(() => { before.current = now; }, [now]);
  let elapsed = 0;
  return (
    <div>
      <div className="studio-glance-chips" role="group" aria-label="Day">
        {days.map((day, index) => {
          const planned = perDay[index] > 0;
          return (
            <button
              key={day.date}
              type="button"
              className="studio-glance-chip"
              aria-pressed={day.date === selectedDay}
              aria-label={`${day.label}${day.date === today ? ", today" : ""}${planned ? `, ${spoken(perDay[index])} planned` : ", nothing planned"}`}
              data-today={day.date === today ? "true" : "false"}
              data-planned={planned ? "true" : "false"}
              style={{ "--fill": perDay[index] / busiest, "--i": index } as CSSProperties}
              onClick={() => { if (day.date !== selectedDay) { onDay(day.date); void selectionTick(); } }}
            >
              <span className="studio-glance-chip-name">{day.label.slice(0, 3)}</span>
              <span className="studio-glance-chip-date">{Number(day.date.slice(8, 10))}</span>
            </button>
          );
        })}
      </div>
      <div key={selectedDay} className="studio-day-body" data-dir={dir}>
        <div className="studio-day-head studio-readable-panel">
          <h2>{selectedDay === today ? "Your day at a glance" : `${label?.label ?? "Day"} at a glance`}</h2>
          <p>{total > 0 ? `${hoursText(total)} planned across ${blocks.length} ${blocks.length === 1 ? "block" : "blocks"}` : "Nothing planned yet. Place hours on the Week tab."}</p>
        </div>
        {blocks.length > 0 && (
          <ol className="studio-day-timeline" aria-label={`${label?.label ?? "Day"} timeline`}>
            {blocks.map((block, index) => {
              const hat = hats.get(block.hatId)!;
              const from = elapsed;
              elapsed += block.hours;
              return (
                <li key={block.id} className="studio-day-row" style={{ "--i": index } as CSSProperties}>
                  <span className="studio-day-time">{hoursText(from)}</span>
                  <span className="studio-day-node" aria-hidden="true" style={{ backgroundColor: hat.color }} />
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
            <li className="studio-day-row studio-day-end" style={{ "--i": blocks.length } as CSSProperties}>
              <span className="studio-day-time">{hoursText(total)}</span>
              <span className="studio-day-node" aria-hidden="true" data-end="true" />
              <span className="studio-day-end-label">End of plan</span>
            </li>
          </ol>
        )}
      </div>
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
