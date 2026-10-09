import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Minus, Plus } from "lucide-react";
import { clampHours, remainingHours, weekDays } from "@/lib/spread/model";
import { useSpread } from "@/lib/spread/store";
import { SpreadIcon } from "@/spread/components/spread-icon";
import { highlightedDay, resolveDrop } from "@/spread/gestures/resolve-drop";
import { FastPointerSensor, HoldPointerSensor, mouseActivation, touchActivation } from "@/spread/gestures/sensors";
import { useWeekSwipe } from "@/spread/gestures/use-week-swipe";

type ActiveDrag = { kind: "spread"; hatId: string } | { kind: "allocation"; allocationId: string; hatId: string };

export function WeeklyView({
  onTurn,
  onCommit,
  focusDate,
  onFocused,
  selectedId = null,
  onSelected,
}: {
  onTurn?: (dx: number) => void;
  onCommit?: (direction: -1 | 1) => void;
  focusDate?: string | null;
  onFocused?: () => void;
  selectedId?: string | null;
  onSelected?: (id: string | null) => void;
}) {
  const data = useSpread((s) => s.data);
  const moveSpreadToDay = useSpread((s) => s.moveSpreadToDay);
  const moveAllocation = useSpread((s) => s.moveAllocation);
  const reorderAllocation = useSpread((s) => s.reorderAllocation);
  const setAllocationHours = useSpread((s) => s.setAllocationHours);
  const removeAllocation = useSpread((s) => s.removeAllocation);
  const changeWeek = useSpread((s) => s.changeWeek);
  const days = weekDays(data.currentWeek);
  const week = data.weeks[data.currentWeek];
  const allocations = week?.allocations ?? [];
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const selected = onSelected ? selectedId : selectedLocal;
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragging = useRef(false);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(FastPointerSensor, { activationConstraint: mouseActivation }),
    useSensor(HoldPointerSensor, { activationConstraint: touchActivation }),
  );
  const swipe = useWeekSwipe({
    dragActive: () => dragging.current,
    onShift: onTurn,
    onCommit: (direction) => (onCommit ? onCommit(direction) : changeWeek(direction)),
  });
  const hotDay = highlightedDay(overId, allocations);
  const focused = useRef(onFocused);
  focused.current = onFocused;

  useEffect(() => {
    if (!focusDate) return;
    document.querySelector(`[data-day="${CSS.escape(focusDate)}"]`)?.scrollIntoView({ block: "start" });
    focused.current?.();
  }, [focusDate]);

  useEffect(() => {
    const ids = allocations.map((item) => item.id);
    const known = seen.current;
    seen.current = new Set(ids);
    if (!known) return;
    const added = ids.find((id) => !known.has(id));
    if (!added) return;
    setFresh(added);
    const timer = window.setTimeout(() => setFresh(null), 460);
    return () => window.clearTimeout(timer);
  }, [allocations]);

  function takeOff(id: string) {
    if (leaving) return;
    setLeaving(id);
    window.setTimeout(() => {
      removeAllocation(id);
      setLeaving(null);
    }, 340);
  }

  function onDragStart(event: DragStartEvent) {
    dragging.current = true;
    setActive(event.active.data.current as ActiveDrag);
  }

  function finish(event?: DragEndEvent) {
    dragging.current = false;
    setActive(null);
    setOverId(null);
    if (!event?.over || !event.active.data.current) return;
    const decision = resolveDrop(event.active.data.current as ActiveDrag, String(event.over.id), allocations);
    if (!decision) return;
    if (decision.action === "moveSpreadToDay") moveSpreadToDay(decision.hatId, decision.day);
    if (decision.action === "moveAllocation") moveAllocation(decision.allocationId, decision.day);
    if (decision.action === "reorderAllocation") reorderAllocation(decision.allocationId, decision.beforeId);
  }

  const hatsById = new Map(data.hats.map((hat) => [hat.id, hat]));
  const boxesByHat = new Map(week?.boxes.map((box) => [box.hatId, box]) ?? []);

  return (
    <DndContext
      sensors={sensors}
      autoScroll
      onDragStart={onDragStart}
      onDragOver={({ over }) => setOverId(over ? String(over.id) : null)}
      onDragEnd={finish}
      onDragCancel={() => finish()}
    >
      <div className="enter" style={{ touchAction: "pan-y" }} {...swipe}>
        <p className="px-1 pt-4 text-xs text-secondary">Drag a spread onto a day, or tap one, then add it.</p>
        <div className="spread-bubbles mt-3 flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain py-2">
          {data.hats.map((hat) => {
            const bank = boxesByHat.get(hat.id)?.hours ?? hat.defaultHours;
            const hours = remainingHours(bank, allocations, hat.id);
            return (
              <SpreadChip
                key={hat.id}
                id={hat.id}
                name={hat.name}
                color={hat.color}
                hours={hours}
                selected={selected === hat.id}
                onSelect={() => {
                  const next = selected === hat.id ? null : hat.id;
                  if (onSelected) onSelected(next);
                  else setSelectedLocal(next);
                }}
              />
            );
          })}
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {days.map((day, index) => {
            const items = allocations.filter((item) => item.day === day.date).sort((a, b) => a.order - b.order);
            return (
              <DayCard
                key={day.date}
                date={day.date}
                label={day.label}
                hot={hotDay === day.date}
                delay={`${index * 45}ms`}
                empty={items.length === 0}
                selectedName={selected ? hatsById.get(selected)?.name : undefined}
                onAdd={() => selected && moveSpreadToDay(selected, day.date, 1)}
              >
                {items.map((item) => {
                  const hat = hatsById.get(item.hatId);
                  if (!hat) return null;
                  return (
                    <AllocationRow
                      key={item.id}
                      id={item.id}
                      hatId={hat.id}
                      name={hat.name}
                      color={hat.color}
                      day={day.label}
                      hours={item.hours}
                      onHours={(hours) => setAllocationHours(item.id, hours)}
                      onRemove={() => takeOff(item.id)}
                      entering={item.id === fresh}
                      leaving={item.id === leaving}
                    />
                  );
                })}
              </DayCard>
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? <DragCard name={hatsById.get(active.hatId)?.name ?? ""} color={hatsById.get(active.hatId)?.color ?? "#8E8E93"} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DragCard({ name, color }: { name: string; color: string }) {
  return (
    <div className="pointer-events-none flex h-11 items-center gap-2 rounded-full bg-elevated px-3 text-sm font-semibold shadow-lg">
      <SpreadIcon name="icon-drag.svg" size={24} />
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </div>
  );
}

function SpreadChip({
  id,
  name,
  color,
  hours,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  color: string;
  hours: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `spread:${id}`, data: { kind: "spread", hatId: id } });
  return (
    <button
      ref={setNodeRef}
      type="button"
      data-drag="spread"
      className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-elevated px-3 text-sm font-semibold"
      style={{ outline: selected ? `2px solid ${color}` : undefined, touchAction: "pan-x" }}
      onClick={onSelect}
      {...listeners}
      {...attributes}
      aria-pressed={selected}
    >
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
      <span className="text-secondary tabular-nums">{hours}h</span>
    </button>
  );
}

export function SpreadBubbleStrip({
  hats,
  hoursFor,
}: {
  hats: { id: string; name: string; color: string }[];
  hoursFor: (id: string) => number;
}) {
  if (hats.length === 0) return null;
  return (
    <div className="spread-bubbles no-print flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain py-2">
      {hats.map((hat) => (
        <span key={hat.id} className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-elevated px-3 text-sm font-semibold">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: hat.color }} />
          {hat.name}
          <span className="text-secondary tabular-nums">{hoursFor(hat.id)}h</span>
        </span>
      ))}
    </div>
  );
}

function DayCard({
  date,
  label,
  hot,
  delay,
  empty,
  selectedName,
  onAdd,
  children,
}: {
  date: string;
  label: string;
  hot: boolean;
  delay: string;
  empty: boolean;
  selectedName?: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: `day:${date}` });
  const [shown, setShown] = useState(selectedName);
  const [phase, setPhase] = useState<"in" | "out" | "gone">(selectedName ? "in" : "gone");

  useEffect(() => {
    if (selectedName) {
      setShown(selectedName);
      setPhase("in");
      return;
    }
    setPhase((current) => (current === "gone" ? current : "out"));
    const timer = window.setTimeout(() => {
      setShown(undefined);
      setPhase("gone");
    }, 340);
    return () => window.clearTimeout(timer);
  }, [selectedName]);
  return (
    <section
      ref={setNodeRef}
      data-day={date}
      className={`week-seq-item rounded-3xl bg-elevated px-3 ${empty && !shown ? "py-2.5" : "py-3"}`}
      style={{ animationDelay: delay, outline: hot ? "2px solid var(--accent)" : undefined }}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-semibold">{label}</h2>
        <span className="text-xs text-secondary tabular-nums">{date.slice(5).replace("-", "/")}</span>
      </div>
      {empty && <span className="sr-only">No responsibilities scheduled for {label}.</span>}
      <ul className={`${empty ? "" : "mt-2 "}flex flex-col gap-2`}>{children}</ul>
      {shown && (
        <button
          type="button"
          className={`mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-canvas text-sm font-semibold text-accent${phase === "out" ? " ascend-out" : " descend-in"}`}
          onClick={onAdd}
        >
          <Plus className="size-4" strokeWidth={2.7} />
          Add {shown}
        </button>
      )}
    </section>
  );
}

function AllocationRow({
  id,
  hatId,
  name,
  color,
  day,
  hours,
  onHours,
  onRemove,
  entering,
  leaving,
}: {
  id: string;
  hatId: string;
  name: string;
  color: string;
  day: string;
  hours: number;
  onHours: (hours: number) => void;
  onRemove: () => void;
  entering?: boolean;
  leaving?: boolean;
}) {
  const drag = useDraggable({ id: `move:${id}`, data: { kind: "allocation", allocationId: id, hatId } });
  const drop = useDroppable({ id: `alloc:${id}` });
  return (
    <li ref={drop.setNodeRef} className={`flex items-center gap-1 rounded-2xl bg-canvas ps-2${entering ? " descend-in" : ""}${leaving ? " ascend-out" : ""}`}>
      <button
        ref={drag.setNodeRef}
        type="button"
        data-drag="allocation"
        aria-label={`Move ${name}`}
        className="grid size-11 shrink-0 touch-none place-items-center"
        {...drag.listeners}
        {...drag.attributes}
      >
        <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      <DayHours value={hours} label={`${name} on ${day}`} onChange={onHours} />
      <button type="button" aria-label={`Remove ${name} from ${day}`} className="grid size-11 place-items-center text-tertiary" onClick={onRemove}>
        <Minus className="size-4" />
      </button>
    </li>
  );
}

function DayHours({ value, label, onChange }: { value: number; label: string; onChange: (hours: number) => void }) {
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <div className="flex items-center" role="group" aria-label={label}>
      <button type="button" className="grid size-11 place-items-center" aria-label={`Decrease ${label}`} onClick={() => onChange(clampHours(value - 1))}>
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{shown}h</span>
      <button type="button" className="grid size-11 place-items-center" aria-label={`Increase ${label}`} onClick={() => onChange(clampHours(value + 1))}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
