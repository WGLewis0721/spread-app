import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { showUndoToast } from "@/spread/ui/undo-toast";
import { clampHours, isoDate, remainingHours, weekDays, type Allocation, type Task } from "@/lib/spread/model";
import { useSpread } from "@/lib/spread/store";
import { assignFailureText, eligibleAllocations, tasksOnAllocation, unscheduledTasks } from "@/lib/spread/task-schedule";
import { SpreadIcon } from "@/spread/components/spread-icon";
import { highlightedDay, resolveDrop, TRAY_ID } from "@/spread/gestures/resolve-drop";
import { FastPointerSensor, HoldPointerSensor, mouseActivation, touchActivation } from "@/spread/gestures/sensors";
import { useWeekSwipe } from "@/spread/gestures/use-week-swipe";

type ActiveDrag =
  | { kind: "spread"; hatId: string }
  | { kind: "allocation"; allocationId: string; hatId: string }
  | { kind: "task"; hatId: string; taskId: string; text: string };

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
  const assignTask = useSpread((s) => s.assignTask);
  const undoable = useSpread((s) => s.undoable);
  const undoEdit = useSpread((s) => s.undoEdit);
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
    useSensor(KeyboardSensor),
  );
  const [moving, setMoving] = useState<string | null>(null);
  const today = isoDate(new Date());
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
      withUndo("Took it off the day.", () => removeAllocation(id));
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
    if (decision.action === "assignTask") placeTask(decision.hatId, decision.taskId, decision.allocationId);
    if (decision.action === "refuseTask") {
      const roleName = hatsById.get(decision.hatId)?.name;
      const dayLabel = days.find((day) => day.date === decision.day)?.label;
      toast(assignFailureText(decision.reason === "no-allocation" ? "no-allocation" : "wrong-role", roleName, dayLabel));
    }
    if (decision.action === "moveSpreadToDay") withUndo("Added to the day.", () => moveSpreadToDay(decision.hatId, decision.day));
    if (decision.action === "moveAllocation") withUndo("Moved.", () => moveAllocation(decision.allocationId, decision.day));
    if (decision.action === "reorderAllocation") withUndo("Reordered.", () => reorderAllocation(decision.allocationId, decision.beforeId));
  }

  const hatsById = new Map(data.hats.map((hat) => [hat.id, hat]));
  function withUndo(message: string, run: () => void) {
    const id = undoable(run);
    if (id) showUndoToast(message, () => undoEdit(id));
  }
  function placeTask(hatId: string, taskId: string, allocationId: string | null) {
    let failure: string | null = null;
    withUndo(allocationId === null ? "Taken off the day." : "Task placed.", () => {
      const result = assignTask(hatId, taskId, allocationId);
      if (!result.ok) failure = assignFailureText(result.reason);
    });
    if (failure) toast(failure);
    setMoving(null);
  }
  const toPlace = unscheduledTasks(week);
  const anyTasks = (week?.boxes ?? []).some((box) => box.tasks.length > 0);
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${labelOf(active.data.current as ActiveDrag | undefined, hatsById)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${labelOf(active.data.current as ActiveDrag | undefined, hatsById)} is over ${overLabel(String(over.id), days, allocations, hatsById)}.` : "Not over a place to drop.",
    onDragEnd: ({ active, over }) =>
      over ? `Dropped ${labelOf(active.data.current as ActiveDrag | undefined, hatsById)} on ${overLabel(String(over.id), days, allocations, hatsById)}.` : "Dropped nowhere. Nothing changed.",
    onDragCancel: () => "Cancelled. Nothing changed.",
  };
  const boxesByHat = new Map(week?.boxes.map((box) => [box.hatId, box]) ?? []);

  return (
    <DndContext
      sensors={sensors}
      autoScroll
      onDragStart={onDragStart}
      onDragOver={({ over }) => setOverId(over ? String(over.id) : null)}
      onDragEnd={finish}
      onDragCancel={() => finish()}
      accessibility={{ announcements }}
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
        {anyTasks && (
          <ToPlaceTray
            tasks={toPlace}
            hatsById={hatsById}
            hot={overId === TRAY_ID}
            open={moving}
            onOpen={setMoving}
            choices={(hatId) => eligibleAllocations(week, hatId)}
            days={days}
            onPlace={placeTask}
          />
        )}
        <div className="mt-4 flex flex-col gap-3">
          {days.map((day, index) => {
            const items = allocations.filter((item) => item.day === day.date).sort((a, b) => a.order - b.order);
            return (
              <DayCard
                key={day.date}
                date={day.date}
                label={day.label}
                hot={hotDay === day.date}
                today={day.date === today}
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
                      tasks={tasksOnAllocation(week, item.id)}
                      open={moving}
                      onOpen={setMoving}
                      choices={eligibleAllocations(week, hat.id)}
                      days={days}
                      onPlace={placeTask}
                    />
                  );
                })}
              </DayCard>
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <DragCard
            name={active.kind === "task" ? active.text : (hatsById.get(active.hatId)?.name ?? "")}
            color={hatsById.get(active.hatId)?.color ?? "#8E8E93"}
          />
        ) : null}
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
  today,
  delay,
  empty,
  selectedName,
  onAdd,
  children,
}: {
  date: string;
  label: string;
  hot: boolean;
  today: boolean;
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
      className="week-seq-item rounded-3xl bg-elevated px-3 py-3"
      style={{ animationDelay: delay, outline: hot ? "2px solid var(--accent)" : undefined }}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-semibold" aria-current={today ? "date" : undefined}>
          {label}
          {today && <span className="ms-2 align-middle text-xs font-semibold text-accent">Today</span>}
        </h2>
        <span className="text-xs text-secondary tabular-nums">{date.slice(5).replace("-", "/")}</span>
      </div>
      {empty && <p className="px-1 pt-2 text-sm text-tertiary">Nothing this day.</p>}
      <ul className="mt-2 flex flex-col gap-2">{children}</ul>
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
  tasks,
  open,
  onOpen,
  choices,
  days,
  onPlace,
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
  tasks: Task[];
  open: string | null;
  onOpen: (id: string | null) => void;
  choices: Allocation[];
  days: Day[];
  onPlace: (hatId: string, taskId: string, allocationId: string | null) => void;
}) {
  const drag = useDraggable({ id: `move:${id}`, data: { kind: "allocation", allocationId: id, hatId } });
  const drop = useDroppable({ id: `alloc:${id}` });
  return (
    <li ref={drop.setNodeRef} className={`rounded-2xl bg-canvas${entering ? " descend-in" : ""}${leaving ? " ascend-out" : ""}`}>
      <div className="flex items-center gap-1 ps-2">
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
      </div>
      {tasks.length > 0 && (
        <ul className="flex flex-col gap-1 px-2 pb-2" aria-label={`${name} tasks on ${day}`}>
          {tasks.map((task) => (
            <TaskChip key={task.id} task={task} hatId={hatId} color={color} open={open} onOpen={onOpen} choices={choices} days={days} onPlace={onPlace} current={id} />
          ))}
        </ul>
      )}
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

type Day = { label: string; date: string };

function labelOf(active: ActiveDrag | undefined, hats: Map<string, { name: string }>): string {
  if (!active) return "item";
  if (active.kind === "task") return `task ${active.text}`;
  return hats.get(active.hatId)?.name ?? "spread";
}

function overLabel(id: string, days: Day[], allocations: Allocation[], hats: Map<string, { name: string }>): string {
  if (id === TRAY_ID) return "To place";
  if (id.startsWith("day:")) return days.find((day) => day.date === id.slice(4))?.label ?? "a day";
  if (id.startsWith("alloc:")) {
    const found = allocations.find((item) => item.id === id.slice(6));
    if (!found) return "a spread";
    return `${hats.get(found.hatId)?.name ?? "a spread"} on ${days.find((day) => day.date === found.day)?.label ?? "a day"}`;
  }
  return "a place";
}

function ToPlaceTray({
  tasks,
  hatsById,
  hot,
  open,
  onOpen,
  choices,
  days,
  onPlace,
}: {
  tasks: { hatId: string; task: Task }[];
  hatsById: Map<string, { name: string; color: string }>;
  hot: boolean;
  open: string | null;
  onOpen: (id: string | null) => void;
  choices: (hatId: string) => Allocation[];
  days: Day[];
  onPlace: (hatId: string, taskId: string, allocationId: string | null) => void;
}) {
  const { setNodeRef } = useDroppable({ id: TRAY_ID });
  return (
    <section
      ref={setNodeRef}
      aria-label="To place"
      className="mt-3 rounded-3xl bg-elevated px-3 py-3"
      style={{ outline: hot ? "2px solid var(--accent)" : undefined }}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-semibold">To place</h2>
        <span className="text-xs text-secondary tabular-nums">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="px-1 pt-2 text-sm text-tertiary">Every open task has a day.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {tasks.map(({ hatId, task }) => (
            <TaskChip
              key={task.id}
              task={task}
              hatId={hatId}
              color={hatsById.get(hatId)?.color ?? "#8E8E93"}
              open={open}
              onOpen={onOpen}
              choices={choices(hatId)}
              days={days}
              onPlace={onPlace}
              current={null}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskChip({
  task,
  hatId,
  color,
  open,
  onOpen,
  choices,
  days,
  onPlace,
  current,
}: {
  task: Task;
  hatId: string;
  color: string;
  open: string | null;
  onOpen: (id: string | null) => void;
  choices: Allocation[];
  days: Day[];
  onPlace: (hatId: string, taskId: string, allocationId: string | null) => void;
  current: string | null;
}) {
  const drag = useDraggable({ id: `task:${task.id}`, data: { kind: "task", hatId, taskId: task.id, text: task.text } });
  const expanded = open === task.id;
  return (
    <li className="rounded-xl bg-elevated">
      <div className="flex items-center gap-1 ps-1">
        <button
          ref={drag.setNodeRef}
          type="button"
          data-drag="task"
          aria-label={`Move task ${task.text}`}
          className="grid size-11 shrink-0 touch-none place-items-center"
          {...drag.listeners}
          {...drag.attributes}
        >
          <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
        </button>
        <span className={`min-w-0 flex-1 truncate text-sm${task.done ? " text-tertiary line-through" : ""}`}>{task.text || "Untitled task"}</span>
        {!task.done && (
          <button
            type="button"
            className="h-11 shrink-0 px-3 text-sm font-semibold text-accent"
            aria-expanded={expanded}
            onClick={() => onOpen(expanded ? null : task.id)}
          >
            {current ? "Move to" : "Place"}
          </button>
        )}
      </div>
      {expanded && (
        <ul className="flex flex-col gap-1 px-2 pb-2" aria-label={`Days for ${task.text}`}>
          {choices.length === 0 && <li className="px-2 py-2 text-sm text-tertiary">This role isn’t on a day yet. Add it to a day first.</li>}
          {choices.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={item.id === current}
                className="flex h-11 w-full items-center justify-between rounded-xl bg-canvas px-3 text-sm font-medium disabled:text-tertiary"
                onClick={() => onPlace(hatId, task.id, item.id)}
              >
                <span>{days.find((day) => day.date === item.day)?.label ?? item.day}</span>
                <span className="tabular-nums text-secondary">{item.hours}h</span>
              </button>
            </li>
          ))}
          {current && (
            <li>
              <button type="button" className="h-11 w-full rounded-xl bg-canvas px-3 text-start text-sm font-medium text-danger" onClick={() => onPlace(hatId, task.id, null)}>
                Take off this day
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
