import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronDown, GripVertical, Inbox, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { showUndoToast } from "@/spread/ui/undo-toast";
import { clampHours, isoDate, remainingHours, weekDays, type Allocation, type Hat, type Task } from "@/lib/spread/model";
import { useSpread } from "@/lib/spread/store";
import { suggestFreeTime } from "@/lib/spread/free-time";
import { assignFailureText, eligibleAllocations, tasksOnAllocation, unscheduledTasks } from "@/lib/spread/task-schedule";
import { dropCollisions } from "@/spread/gestures/collisions";
import { highlightedDay, resolveDrop, TRAY_ID } from "@/spread/gestures/resolve-drop";
import {
  SpreadPointerSensor,
  TaskKeyboardSensor,
  zoneKeyboardCoordinates,
} from "@/spread/gestures/sensors";
import { useWeekSwipe } from "@/spread/gestures/use-week-swipe";

type ActiveDrag =
  | { kind: "spread"; hatId: string }
  | { kind: "allocation"; allocationId: string; hatId: string }
  | { kind: "task"; hatId: string; taskId: string; text: string };

type Day = { label: string; date: string };

/** Up to this many unplaced tasks, the sheet's role groups start open. */
const TRAY_OPEN_ALL = 5;
/** Tasks an open group shows before "Show N more". */
const GROUP_PREVIEW = 6;

const NO_ALLOCATIONS: Allocation[] = [];

/**
 * Week: a strip of the seven days at the top, then one day at a time below it. The strip is
 * always on screen, so it is where things are dropped: a role (from the Add chips), a role's
 * block (from the day), or a task (from the day or the To place sheet). While a task is held,
 * only the days its role is on stay lit.
 */
export function WeeklyView({
  onTurn,
  onCommit,
  focusDate,
  onFocused,
  trayOpen = false,
  onTrayOpen,
}: {
  onTurn?: (dx: number) => void;
  onCommit?: (direction: -1 | 1) => void;
  focusDate?: string | null;
  onFocused?: () => void;
  /** The To place sheet, opened from the dock. */
  trayOpen?: boolean;
  onTrayOpen?: (open: boolean) => void;
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
  const days = weekDays(data.currentWeek).slice().reverse();
  const week = data.weeks[data.currentWeek];
  const allocations = week?.allocations ?? NO_ALLOCATIONS;
  const today = isoDate(new Date());
  const [chosen, setChosen] = useState<string | null>(null);
  // The day stays inside the open week: after a week turn it falls back to today, or Monday.
  const selectedDay = chosen && days.some((day) => day.date === chosen) ? chosen : days.some((day) => day.date === today) ? today : days[0].date;
  const selectedLabel = days.find((day) => day.date === selectedDay)?.label ?? "";
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragging = useRef(false);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [focusRole, setFocusRole] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(SpreadPointerSensor),
    useSensor(TaskKeyboardSensor, { coordinateGetter: zoneKeyboardCoordinates }),
  );
  const swipe = useWeekSwipe({
    dragActive: () => dragging.current,
    onShift: onTurn,
    onCommit: (direction) => (onCommit ? onCommit(direction) : changeWeek(direction)),
  });
  const focused = useRef(onFocused);
  focused.current = onFocused;

  useEffect(() => {
    if (!focusDate) return;
    setChosen(focusDate);
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

  const hatsById = new Map<string, Hat>(data.hats.map((hat) => [hat.id, hat]));
  const boxesByHat = new Map(week?.boxes.map((box) => [box.hatId, box]) ?? []);
  const hoursLeft = (hatId: string) =>
    remainingHours(boxesByHat.get(hatId)?.hours ?? hatsById.get(hatId)?.defaultHours ?? 0, allocations, hatId);
  const toPlace = unscheduledTasks(week);
  const dayItems = allocations.filter((item) => item.day === selectedDay).sort((a, b) => a.order - b.order);
  const dayTotal = dayItems.reduce((sum, item) => sum + item.hours, 0);
  const loads = days.map((day) => {
    const parts = allocations
      .filter((item) => item.day === day.date && item.hours > 0)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({ id: item.id, hours: item.hours, color: hatsById.get(item.hatId)?.color ?? "var(--tertiary)" }));
    return { date: day.date, parts, total: parts.reduce((sum, part) => sum + part.hours, 0) };
  });
  const scale = Math.max(8, ...loads.map((load) => load.total));
  const addable = data.hats.map((hat) => ({ hat, left: hoursLeft(hat.id) })).filter((item) => item.left > 0);
  const freeTime = suggestFreeTime(data, today);
  const lightest = freeTime.kind === "suggestions" ? freeTime.items[0] : null;

  // While something is held: which days can take it, and what the header says about where it is.
  const heldTask = active?.kind === "task" ? active : null;
  const heldWaiting = heldTask !== null && toPlace.some((entry) => entry.task.id === heldTask.taskId);
  const heldRole = active ? hatsById.get(active.hatId) : undefined;
  const taskDays = heldTask ? new Set(allocations.filter((item) => item.hatId === heldTask.hatId && item.hours > 0).map((item) => item.day)) : null;
  const hotDay = highlightedDay(overId, allocations);
  const shortOf = (date: string) => days.find((day) => day.date === date)?.label.slice(0, 3) ?? "";
  const labelOf = (date: string) => days.find((day) => day.date === date)?.label ?? "";
  let hint: string | null = null;
  if (active) {
    if (overId === TRAY_ID) hint = heldWaiting ? "Leave it unplaced" : "Back to To place";
    else if (hotDay && taskDays && !taskDays.has(hotDay)) hint = `${heldRole?.name ?? "This role"} isn’t on ${labelOf(hotDay)}`;
    else if (hotDay) hint = `Drop on ${labelOf(hotDay)}`;
    else if (taskDays) hint = taskDays.size === 0 ? `${heldRole?.name ?? "This role"} isn’t on a day yet` : `${heldRole?.name ?? ""}: ${[...taskDays].sort().map(shortOf).join(", ")}`;
    else hint = "Drop it on a day";
  }

  function withUndo(message: string, run: () => void) {
    const id = undoable(run);
    if (id) showUndoToast(message, () => undoEdit(id));
    return id;
  }
  function placeTask(hatId: string, taskId: string, allocationId: string | null) {
    let failure: string | null = null;
    const target = allocationId ? allocations.find((item) => item.id === allocationId) : null;
    withUndo(allocationId === null ? "Back in To place." : `Placed on ${target ? labelOf(target.day) : "the day"}.`, () => {
      const result = assignTask(hatId, taskId, allocationId);
      if (!result.ok) failure = assignFailureText(result.reason);
    });
    if (failure) toast(failure);
    setMoving(null);
  }
  /** Give a role an hour on the selected day and put the task there: one change, one Undo. */
  function placeOnSelectedDay(hatId: string, taskId: string) {
    let failure: string | null = null;
    withUndo(`Placed on ${selectedLabel}.`, () => {
      moveSpreadToDay(hatId, selectedDay, 1);
      const latest = useSpread.getState().data;
      const block = latest.weeks[latest.currentWeek]?.allocations.find((item) => item.hatId === hatId && item.day === selectedDay && item.hours > 0);
      if (!block) {
        failure = "This role has no hours left this week.";
        return;
      }
      const result = assignTask(hatId, taskId, block.id);
      if (!result.ok) failure = assignFailureText(result.reason);
    });
    if (failure) toast(failure);
    setMoving(null);
  }
  function takeOff(id: string) {
    if (leaving) return;
    setLeaving(id);
    window.setTimeout(() => {
      withUndo(`Removed from ${selectedLabel}.`, () => removeAllocation(id));
      setLeaving(null);
    }, 340);
  }

  function onDragStart(event: DragStartEvent) {
    dragging.current = true;
    setMoving(null);
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
    if (decision.action === "refuseTask") toast(assignFailureText(decision.reason, hatsById.get(decision.hatId)?.name, labelOf(decision.day)));
    if (decision.action === "moveSpreadToDay") withUndo(`Added to ${labelOf(decision.day)}.`, () => moveSpreadToDay(decision.hatId, decision.day));
    if (decision.action === "moveAllocation") withUndo(`Moved to ${labelOf(decision.day)}.`, () => moveAllocation(decision.allocationId, decision.day));
    if (decision.action === "reorderAllocation") withUndo("Reordered.", () => reorderAllocation(decision.allocationId, decision.beforeId));
  }

  const announcements: Announcements = {
    onDragStart: ({ active: held }) => `Picked up ${describe(held.data.current as ActiveDrag | undefined, hatsById)}.`,
    onDragOver: ({ active: held, over }) =>
      over ? `${describe(held.data.current as ActiveDrag | undefined, hatsById)} is over ${overLabel(String(over.id), days, allocations, hatsById)}.` : "Not over a place to drop.",
    onDragEnd: ({ active: held, over }) =>
      over ? `Dropped ${describe(held.data.current as ActiveDrag | undefined, hatsById)} on ${overLabel(String(over.id), days, allocations, hatsById)}.` : "Dropped nowhere. Nothing changed.",
    onDragCancel: () => "Cancelled. Nothing changed.",
  };

  const sheetShown = trayOpen || heldTask !== null;
  const choicesFor = (hatId: string) => eligibleAllocations(week, hatId);
  const canAddToSelected = (hatId: string) => !dayItems.some((item) => item.hatId === hatId) && hoursLeft(hatId) > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dropCollisions}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      autoScroll={false}
      onDragStart={onDragStart}
      onDragOver={({ over }) => setOverId(over ? String(over.id) : null)}
      onDragEnd={finish}
      onDragCancel={() => finish()}
      accessibility={{ announcements }}
    >
      <div className="enter pb-28" style={{ touchAction: "pan-y" }} {...swipe}>
        <div
          className="mt-4 grid grid-cols-7 gap-1.5"
          role="group"
          aria-label="Days this week"
          onKeyDown={(event) => {
            // Left and right walk the days. Arrow keys on a focused control never turn the week.
            if (active || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
            const index = days.findIndex((day) => day.date === selectedDay) + (event.key === "ArrowRight" ? 1 : -1);
            if (index < 0 || index >= days.length) return;
            event.preventDefault();
            setChosen(days[index].date);
            (event.currentTarget.querySelector(`[data-day="${days[index].date}"]`) as HTMLElement | null)?.focus();
          }}
        >
          {days.map((day, index) => {
            const load = loads[index];
            const state = !active ? "idle" : hotDay === day.date ? (taskDays && !taskDays.has(day.date) ? "refuse" : "hot") : taskDays && !taskDays.has(day.date) ? "off" : "open";
            return (
              <DayCell
                key={day.date}
                day={day}
                total={load.total}
                parts={load.parts}
                scale={scale}
                selected={day.date === selectedDay}
                today={day.date === today}
                state={state}
                onSelect={() => setChosen(day.date)}
              />
            );
          })}
        </div>

        <section aria-labelledby="week-day-title" className="mt-6">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 id="week-day-title" className="text-2xl font-bold tracking-tight">
              {selectedLabel}
              {selectedDay === today && <span className="ms-2 align-middle text-[13px] font-semibold text-accent">Today</span>}
            </h2>
            <span className={cn("shrink-0 text-end text-[13px] tabular-nums", hint ? "font-semibold text-accent" : "text-secondary")}>
              {hint ?? (dayTotal > 0 ? `${hoursText(dayTotal)} planned` : "")}
            </span>
          </div>
          {dayItems.length === 0 ? (
            <div className="mt-3 rounded-[20px] bg-elevated px-5 py-6">
              <p className="text-base font-semibold">Nothing on {selectedLabel} yet.</p>
              <p className="mt-1 text-sm text-secondary">Add a role below, or hold one and drag it onto any day.</p>
            </div>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-[20px] bg-elevated" aria-label={`${selectedLabel} plan`}>
              {dayItems.map((item, index) => {
                const hat = hatsById.get(item.hatId);
                if (!hat) return null;
                const waiting = toPlace.filter((entry) => entry.hatId === hat.id).length;
                return (
                  <RoleOnDay
                    key={item.id}
                    allocation={item}
                    hat={hat}
                    dayLabel={selectedLabel}
                    first={index === 0}
                    tasks={tasksOnAllocation(week, item.id)}
                    waiting={waiting}
                    entering={item.id === fresh}
                    leaving={item.id === leaving}
                    onHours={(hours) => setAllocationHours(item.id, hours)}
                    onRemove={() => takeOff(item.id)}
                    onPlaceTasks={() => {
                      setFocusRole(hat.id);
                      onTrayOpen?.(true);
                    }}
                    open={moving}
                    onOpen={setMoving}
                    choices={choicesFor(hat.id)}
                    days={days}
                    onPlace={placeTask}
                  />
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="week-add-title" className="mt-7">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h3 id="week-add-title" className="text-[13px] font-semibold text-secondary">
              Add to {selectedLabel}
            </h3>
            {lightest && lightest.day !== selectedDay && (
              <button type="button" className="min-h-11 text-[13px] font-semibold text-accent" onClick={() => setChosen(lightest.day)}>
                Lightest day ahead: {lightest.dayLabel}
              </button>
            )}
          </div>
          {addable.length === 0 ? (
            <p className="mt-2 px-1 text-sm text-secondary">Every hour this week has a day.</p>
          ) : (
            <>
              <ul className="mt-2 flex flex-wrap gap-2">
                {addable.map(({ hat, left }) => (
                  <AddChip key={hat.id} hat={hat} left={left} onAdd={() => withUndo(`Added to ${selectedLabel}.`, () => moveSpreadToDay(hat.id, selectedDay, 1))} />
                ))}
              </ul>
              <p className="mt-2 px-1 text-xs text-secondary">Tap to add an hour here, or hold one and drag it onto any day.</p>
            </>
          )}
        </section>
      </div>

      {sheetShown && (
        <ToPlaceSheet
          key={focusRole ?? "all"}
          tasks={toPlace}
          hatsById={hatsById}
          peek={heldTask === null ? null : heldWaiting ? "waiting" : "placed"}
          hot={overId === TRAY_ID}
          focusRole={focusRole}
          onClose={() => {
            setFocusRole(null);
            onTrayOpen?.(false);
          }}
          open={moving}
          onOpen={setMoving}
          choicesFor={choicesFor}
          days={days}
          onPlace={placeTask}
          addTo={(hatId) => (canAddToSelected(hatId) ? { label: `Add ${hatsById.get(hatId)?.name ?? ""} to ${selectedLabel.slice(0, 3)}`, run: (taskId) => placeOnSelectedDay(hatId, taskId) } : null)}
        />
      )}

      <DragOverlay dropAnimation={null}>
        {active ? (
          <DragCard
            name={active.kind === "task" ? active.text || "Untitled task" : (hatsById.get(active.hatId)?.name ?? "")}
            color={hatsById.get(active.hatId)?.color ?? "var(--tertiary)"}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function hoursText(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function DayCell({
  day,
  total,
  parts,
  scale,
  selected,
  today,
  state,
  onSelect,
}: {
  day: Day;
  total: number;
  parts: { id: string; hours: number; color: string }[];
  scale: number;
  selected: boolean;
  today: boolean;
  /** idle: nothing held. open: can take what is held. off: cannot. hot/refuse: held over it. */
  state: "idle" | "open" | "off" | "hot" | "refuse";
  onSelect: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: `day:${day.date}` });
  const number = Number(day.date.slice(8));
  return (
    <button
      ref={setNodeRef}
      type="button"
      data-day={day.date}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      aria-label={`${day.label} ${number}${today ? ", today" : ""}, ${total > 0 ? `${hoursText(total)} planned` : "nothing planned"}`}
      onClick={onSelect}
      className={cn(
        "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl transition-[transform,opacity,box-shadow,background-color] duration-150 ease-out motion-reduce:transition-none",
        selected ? "bg-accent text-on-accent" : "bg-elevated",
        state === "off" && "opacity-35",
        state === "refuse" && "opacity-50",
        state === "hot" && "scale-105 motion-reduce:scale-100",
      )}
      style={{
        boxShadow:
          state === "hot"
            ? "inset 0 0 0 2px var(--accent), 0 8px 24px rgb(0 0 0 / 0.25)"
            : state === "open"
              ? "inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 45%, transparent)"
              : undefined,
        backgroundColor: state === "hot" && !selected ? "color-mix(in srgb, var(--accent) 20%, var(--elevated))" : undefined,
      }}
    >
      <span aria-hidden="true" className={cn("text-[11px] font-semibold", selected ? "opacity-90" : today ? "text-accent" : "text-secondary")}>
        {day.label.slice(0, 1)}
      </span>
      <span aria-hidden="true" className={cn("text-lg leading-none font-semibold tabular-nums", !selected && today && "text-accent")}>
        {number}
      </span>
      <span
        aria-hidden="true"
        className="flex h-1 w-8 gap-px overflow-hidden rounded-full"
        style={{ backgroundColor: selected ? "rgb(255 255 255 / 0.3)" : "var(--fill)" }}
      >
        {parts.map((part) => (
          <span key={part.id} style={{ width: `${(part.hours / scale) * 100}%`, backgroundColor: selected ? "#fff" : part.color }} />
        ))}
      </span>
    </button>
  );
}

function RoleOnDay({
  allocation,
  hat,
  dayLabel,
  first,
  tasks,
  waiting,
  entering,
  leaving,
  onHours,
  onRemove,
  onPlaceTasks,
  open,
  onOpen,
  choices,
  days,
  onPlace,
}: {
  allocation: Allocation;
  hat: Hat;
  dayLabel: string;
  first: boolean;
  tasks: Task[];
  /** This role's tasks still waiting in To place. */
  waiting: number;
  entering: boolean;
  leaving: boolean;
  onHours: (hours: number) => void;
  onRemove: () => void;
  onPlaceTasks: () => void;
  open: string | null;
  onOpen: (id: string | null) => void;
  choices: Allocation[];
  days: Day[];
  onPlace: (hatId: string, taskId: string, allocationId: string | null) => void;
}) {
  const drag = useDraggable({ id: `move:${allocation.id}`, data: { kind: "allocation", allocationId: allocation.id, hatId: hat.id } });
  const drop = useDroppable({ id: `alloc:${allocation.id}` });
  const [expanded, setExpanded] = useState(true);
  const listId = `role-${allocation.id}`;
  return (
    <li ref={drop.setNodeRef} className={cn(!first && "border-t border-line", entering && "descend-in", leaving && "ascend-out")}>
      <div className="flex min-h-14 items-center ps-1">
        <button
          ref={drag.setNodeRef}
          type="button"
          data-drag="allocation"
          aria-label={`Move ${hat.name} to another day`}
          className="grid size-11 shrink-0 touch-none place-items-center"
          {...drag.listeners}
          {...drag.attributes}
        >
          <span className="size-2.5 rounded-full" style={{ backgroundColor: hat.color }} />
        </button>
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center text-start"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="w-full truncate text-base font-semibold">{hat.name}</span>
          <span className="flex items-center gap-0.5 text-xs text-secondary">
            {tasks.length === 0 ? "No tasks yet" : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
            <ChevronDown className={cn("size-3.5 transition-transform motion-reduce:transition-none", expanded && "rotate-180")} strokeWidth={2.6} aria-hidden="true" />
          </span>
        </button>
        <DayHours value={allocation.hours} label={`${hat.name} on ${dayLabel}`} onChange={onHours} />
      </div>
      {expanded && (
        <div id={listId}>
          {tasks.length > 0 && (
            <ul className="ms-11 border-t border-line" aria-label={`${hat.name} tasks on ${dayLabel}`}>
              {tasks.map((task) => (
                <TaskLine key={task.id} task={task} hatId={hat.id} open={open} onOpen={onOpen} choices={choices} days={days} onPlace={onPlace} current={allocation.id} />
              ))}
            </ul>
          )}
          <div className="ms-11 flex flex-wrap items-center gap-x-5 border-t border-line pe-4">
            {waiting > 0 && (
              <button type="button" className="h-11 text-sm font-semibold text-accent" onClick={onPlaceTasks}>
                Place a task ({waiting})
              </button>
            )}
            <button type="button" className="h-11 text-sm font-semibold text-danger" onClick={onRemove}>
              Remove from {dayLabel}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function DayHours({ value, label, onChange }: { value: number; label: string; onChange: (hours: number) => void }) {
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <div className="flex shrink-0 items-center pe-1" role="group" aria-label={label}>
      <button type="button" className="grid size-11 place-items-center" aria-label={`Fewer hours: ${label}`} onClick={() => onChange(clampHours(value - 1))}>
        <Minus className="size-4" strokeWidth={2.6} />
      </button>
      <span className="w-8 text-center text-[15px] font-semibold tabular-nums">{shown}h</span>
      <button type="button" className="grid size-11 place-items-center" aria-label={`More hours: ${label}`} onClick={() => onChange(clampHours(value + 1))}>
        <Plus className="size-4" strokeWidth={2.6} />
      </button>
    </div>
  );
}

/** A role with hours left: tap to add an hour to the selected day, or hold and drag onto any day. */
function AddChip({ hat, left, onAdd }: { hat: Hat; left: number; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `spread:${hat.id}`, data: { kind: "spread", hatId: hat.id } });
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        data-drag="spread"
        className="flex h-11 items-center gap-2 rounded-full bg-accent/10 ps-3 pe-4 text-[15px] font-semibold text-accent"
        style={{ touchAction: "pan-y" }}
        onClick={onAdd}
        {...listeners}
        {...attributes}
        aria-label={`Add an hour of ${hat.name}, ${hoursText(left)} left`}
      >
        <Plus className="size-4" strokeWidth={2.8} aria-hidden="true" />
        <span className="size-2 rounded-full" style={{ backgroundColor: hat.color }} aria-hidden="true" />
        <span className="text-ink">{hat.name}</span>
        <span className="font-medium tabular-nums">{hoursText(left)} left</span>
      </button>
    </li>
  );
}

function ToPlaceSheet({
  tasks,
  hatsById,
  peek,
  hot,
  focusRole,
  onClose,
  open,
  onOpen,
  choicesFor,
  days,
  onPlace,
  addTo,
}: {
  tasks: { hatId: string; task: Task }[];
  hatsById: Map<string, Hat>;
  /** A task is being dragged (from a day, or still waiting here): only the header shows, as the place to drop it back. */
  peek: "placed" | "waiting" | null;
  hot: boolean;
  focusRole: string | null;
  onClose: () => void;
  open: string | null;
  onOpen: (id: string | null) => void;
  choicesFor: (hatId: string) => Allocation[];
  days: Day[];
  onPlace: (hatId: string, taskId: string, allocationId: string | null) => void;
  addTo: (hatId: string) => { label: string; run: (taskId: string) => void } | null;
}) {
  const { setNodeRef } = useDroppable({ id: TRAY_ID });
  const heading = useRef<HTMLHeadingElement>(null);
  const closing = useRef(onClose);
  closing.current = onClose;
  const peeking = useRef(peek !== null);
  peeking.current = peek !== null;
  // A task is placed by role, so the list is grouped by role; past a handful the groups start
  // folded. Opened from a role on a day, that role's group is the one that is open.
  const groups: { hatId: string; tasks: Task[] }[] = [];
  for (const { hatId, task } of tasks) {
    const group = groups.find((item) => item.hatId === hatId);
    if (group) group.tasks.push(task);
    else groups.push({ hatId, tasks: [task] });
  }
  const [toggled, setToggled] = useState<Record<string, boolean>>(() => (focusRole ? { [focusRole]: true } : {}));
  const [full, setFull] = useState<Record<string, boolean>>({});
  const isOpen = (hatId: string) => toggled[hatId] ?? (focusRole ? false : tasks.length <= TRAY_OPEN_ALL);

  useEffect(() => {
    if (!peeking.current) heading.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !peeking.current) closing.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section
      ref={setNodeRef}
      aria-labelledby="to-place-title"
      className={cn(
        "no-print fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-xl flex-col rounded-t-[28px] bg-elevated shadow-[0_-12px_40px_rgb(0_0_0/0.3)] transition-transform duration-300 ease-out motion-reduce:transition-none",
        hot && "ring-2 ring-accent",
      )}
      style={{ maxHeight: "min(64vh, 36rem)", transform: peek !== null ? "translateY(calc(100% - 7rem))" : undefined }}
    >
      <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-fill" aria-hidden="true" />
      <div className="flex items-center gap-3 ps-5 pe-2 pt-2">
        <Inbox className="size-5 text-secondary" strokeWidth={2.2} aria-hidden="true" />
        <h2 ref={heading} id="to-place-title" tabIndex={-1} className="flex-1 text-xl font-bold outline-none">
          To place
        </h2>
        {peek === null && tasks.length > 0 && (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-fill px-2 text-[13px] font-semibold tabular-nums" aria-label={`${tasks.length} to place`}>
            {tasks.length}
          </span>
        )}
        <button type="button" aria-label="Close To place" className="grid size-11 place-items-center rounded-full text-secondary" onClick={onClose}>
          <X className="size-5" strokeWidth={2.4} />
        </button>
      </div>
      <p className="px-5 text-[13px] text-secondary">
        {peek === "placed" ? "Drop it here to take it off its day." : peek ? "Drop it here to leave it unplaced." : tasks.length > 0 ? "Tap Place, or hold a task and drag it onto a day above." : "Every open task has a day."}
      </p>
      {groups.length > 0 && (
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-safe">
          <ul className="mb-6 overflow-hidden rounded-2xl bg-canvas">
            {groups.map((group, index) => {
              const hat = hatsById.get(group.hatId);
              const name = hat?.name ?? "";
              const opened = isOpen(group.hatId);
              const listId = `to-place-${group.hatId}`;
              const count = group.tasks.length;
              const showAll = full[group.hatId] || count <= GROUP_PREVIEW;
              const shown = showAll ? group.tasks : group.tasks.slice(0, GROUP_PREVIEW);
              const add = addTo(group.hatId);
              return (
                <li key={group.hatId} className={index > 0 ? "border-t border-line" : undefined}>
                  <button
                    type="button"
                    className="flex h-12 w-full items-center gap-3 px-4 text-start"
                    aria-expanded={opened}
                    aria-controls={listId}
                    onClick={() => setToggled((current) => ({ ...current, [group.hatId]: !opened }))}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: hat?.color ?? "var(--tertiary)" }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">{name}</span>
                    <span className="text-sm text-secondary tabular-nums">
                      {count} {count === 1 ? "task" : "tasks"}
                    </span>
                    <ChevronDown className={cn("size-4 text-secondary transition-transform motion-reduce:transition-none", opened && "rotate-180")} strokeWidth={2.6} aria-hidden="true" />
                  </button>
                  {opened && (
                    <ul id={listId} className="border-t border-line" aria-label={`${name} tasks to place`}>
                      {shown.map((task) => (
                        <TaskLine
                          key={task.id}
                          task={task}
                          hatId={group.hatId}
                          open={open}
                          onOpen={onOpen}
                          choices={choicesFor(group.hatId)}
                          days={days}
                          onPlace={onPlace}
                          current={null}
                          extra={add ? { label: add.label, run: () => add.run(task.id) } : null}
                        />
                      ))}
                      {!showAll && (
                        <li className="border-t border-line">
                          <button type="button" className="h-11 w-full ps-12 text-start text-sm font-semibold text-accent" onClick={() => setFull((current) => ({ ...current, [group.hatId]: true }))}>
                            Show {count - GROUP_PREVIEW} more
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * One task in a list: a grip to drag it, its text, and Place (or Move). The days it can go on
 * open beneath it as a row of small chips.
 */
function TaskLine({
  task,
  hatId,
  open,
  onOpen,
  choices,
  days,
  onPlace,
  current,
  extra = null,
}: {
  task: Task;
  hatId: string;
  open: string | null;
  onOpen: (id: string | null) => void;
  choices: Allocation[];
  days: Day[];
  onPlace: (hatId: string, taskId: string, allocationId: string | null) => void;
  current: string | null;
  /** One more choice after the days, such as giving the role an hour on the selected day. */
  extra?: { label: string; run: () => void } | null;
}) {
  const drag = useDraggable({ id: `task:${task.id}`, data: { kind: "task", hatId, taskId: task.id, text: task.text } });
  const expanded = open === task.id;
  const text = task.text || "Untitled task";
  return (
    <li className="border-t border-line first:border-t-0">
      <div className="flex items-center">
        <button
          ref={drag.setNodeRef}
          type="button"
          data-drag="task"
          aria-label={`Move task ${text}`}
          className="grid size-11 shrink-0 touch-none place-items-center text-tertiary"
          {...drag.listeners}
          {...drag.attributes}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <span className={cn("min-w-0 flex-1 truncate text-[15px]", task.done && "text-tertiary line-through")}>{text}</span>
        {!task.done && (
          <button
            type="button"
            className={cn("h-11 shrink-0 px-4 text-sm font-semibold", expanded ? "text-ink" : "text-accent")}
            aria-expanded={expanded}
            onClick={() => onOpen(expanded ? null : task.id)}
          >
            {expanded ? "Done" : current ? "Move" : "Place"}
          </button>
        )}
      </div>
      {expanded && (
        <ul className="flex flex-wrap gap-2 pe-4 pb-3 ps-11" aria-label={`Days for ${text}`}>
          {choices.length === 0 && !extra && <li className="py-2 text-sm text-secondary">This role isn’t on a day yet. Add it to a day first.</li>}
          {choices.map((item) => {
            const label = days.find((day) => day.date === item.day)?.label ?? item.day;
            const here = item.id === current;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={here}
                  aria-label={here ? `${label}, where it is now` : `${label}, ${hoursText(item.hours)}`}
                  className="flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent disabled:bg-fill disabled:text-secondary"
                  onClick={() => onPlace(hatId, task.id, item.id)}
                >
                  {label.slice(0, 3)}
                  <span className="font-medium opacity-80 tabular-nums">{hoursText(item.hours)}</span>
                </button>
              </li>
            );
          })}
          {extra && (
            <li>
              <button type="button" className="flex h-10 items-center gap-1 rounded-full bg-fill px-4 text-sm font-semibold text-accent" onClick={extra.run}>
                <Plus className="size-3.5" strokeWidth={2.8} aria-hidden="true" />
                {extra.label}
              </button>
            </li>
          )}
          {current && (
            <li>
              <button type="button" className="h-10 rounded-full bg-fill px-4 text-sm font-semibold text-danger" onClick={() => onPlace(hatId, task.id, null)}>
                Back to To place
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function DragCard({ name, color }: { name: string; color: string }) {
  return (
    <div className="pointer-events-none flex h-12 w-max max-w-[16rem] -rotate-2 items-center gap-2.5 rounded-2xl bg-elevated ps-2 pe-4 text-[15px] font-semibold shadow-[0_18px_40px_rgb(0_0_0/0.4)] ring-1 ring-line">
      <GripVertical className="size-4 shrink-0 text-tertiary" aria-hidden="true" />
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </div>
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

function describe(active: ActiveDrag | undefined, hats: Map<string, { name: string }>): string {
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
