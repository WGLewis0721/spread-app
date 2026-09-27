import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronRight, Ellipsis, List, Minus, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/cn";
import { formatWeek, ROLE_COLORS, weekDays, weekKey, type Hat } from "@/lib/spread/model";
import { saveBackup, useSpread, type ThemeChoice } from "@/lib/spread/store";
import { parseBackup, type SpreadBackup } from "@/lib/spread/backup";
import { buildWeekDocument, weekDocumentText } from "@/lib/spread/week-document";
import { weekDocxBlob } from "@/lib/spread/week-docx";
import { saveFile } from "@/lib/spread/save-file";
import { WeekPaper } from "@/spread/components/week-paper";
import { SpreadIcon } from "@/spread/components/spread-icon";
import { TaskSheet } from "@/spread/components/task-sheet";
import { WeeklyView } from "@/spread/components/weekly-view";
import { WeekCrown } from "@/spread/components/week-crown";
import { useBrowserFrame, useLockPageScroll } from "@/spread/components/use-browser-frame";

type Sheet = "more" | "new" | "license" | null;

export function SpreadApp() {
  const ready = useSpread((s) => s.ready);
  const license = useSpread((s) => s.license);
  const theme = useSpread((s) => s.theme);
  const boot = useSpread((s) => s.boot);
  useBrowserFrame();

  useEffect(() => {
    boot();
  }, [boot]);

  return (
    <>
      <Toaster
        position="top-center"
        theme={theme === "system" ? "system" : theme}
        toastOptions={{
          style: {
            background: "var(--elevated)",
            color: "var(--ink)",
            border: "0.5px solid var(--line)",
            fontFamily: "inherit",
          },
        }}
      />
      {!ready || !license ? <UnlockScreen /> : <WeekScreen />}
    </>
  );
}

function UnlockScreen() {
  const beginTrial = useSpread((s) => s.beginTrial);
  const unlock = useSpread((s) => s.unlock);
  const [showKey, setShowKey] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <SpreadIcon name="app-icon-spread-cards.svg" size={64} />
        <h1 className="mt-7 text-4xl font-bold tracking-tight text-balance">Spread</h1>
        <p className="mt-3 max-w-xs text-base text-secondary text-pretty">
          Roles first. Hours second. Tasks last.
        </p>
        <button
          type="button"
          className="mt-8 h-12 w-full rounded-full bg-accent text-base font-semibold text-on-accent active:opacity-80"
          onClick={beginTrial}
        >
          Begin this week
        </button>
        <button
          type="button"
          className="mt-3 h-11 w-full text-sm font-medium text-accent"
          onClick={() => {
            setShowKey((open) => !open);
            setError("");
          }}
        >
          {showKey ? "Hide key" : "I have a key"}
        </button>
        {showKey && (
          <form
            className="enter mt-1"
            onSubmit={(event) => {
              event.preventDefault();
              if (!unlock(code)) setError("That key isn’t valid.");
            }}
          >
            <label className="sr-only" htmlFor="license-key">
              License key
            </label>
            <input
              id="license-key"
              value={code}
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="SPR-XXXX-XXXX"
              onChange={(event) => {
                setCode(event.target.value);
                setError("");
              }}
              className="h-12 w-full rounded-2xl bg-fill px-4 text-center text-base outline-none placeholder:text-tertiary"
            />
            {error && (
              <p className="mt-2 text-center text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="mt-3 h-12 w-full rounded-full bg-fill text-base font-semibold active:opacity-80"
            >
              Unlock
            </button>
            <p className="mt-3 text-center text-xs text-tertiary">Trial key SPR-DEMO-2026</p>
          </form>
        )}
        <div className="mt-10 overflow-hidden rounded-3xl bg-elevated" aria-hidden="true">
          <PreviewRow name="Work" hours="8h" color="#34C759" />
          <PreviewRow name="Home" hours="4h" color="#FF9500" />
          <PreviewRow name="Health" hours="3h" color="#007AFF" last />
        </div>
        <p className="mt-4 text-center text-xs text-tertiary">Gray Matter · stays on this device</p>
      </div>
    </main>
  );
}

function PreviewRow({
  name,
  hours,
  color,
  last,
}: {
  name: string;
  hours: string;
  color: string;
  last?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", !last && "border-b border-line")}>
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 text-base font-medium">{name}</span>
      <span className="text-sm text-secondary tabular-nums">{hours}</span>
    </div>
  );
}

function followStyle(shift: number): CSSProperties {
  const x = Math.max(-40, Math.min(40, shift * 0.62));
  return {
    transform: `translate3d(${x}px, 0, 0)`,
    opacity: 1 - Math.min(0.55, Math.abs(shift) / 110),
  };
}

function weekFrom(dir: -1 | 1): CSSProperties {
  return { "--week-from": `${dir * 36}px` } as CSSProperties;
}

function WeekScreen() {
  const data = useSpread((s) => s.data);
  const moveWeek = useSpread((s) => s.moveWeek);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editing, setEditing] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [view, setView] = useState<"spread" | "week">("spread");
  const [openTask, setOpenTask] = useState<{ hatId: string; taskId: string } | null>(null);
  const [rolloverAsk, setRolloverAsk] = useState(false);
  const [gesture, setGesture] = useState(0);
  const [shift, setShift] = useState(0);
  const [dir, setDir] = useState<-1 | 1 | 0>(0);
  const rollover = useSpread((s) => s.rollover);
  const range = formatWeek(data.currentWeek);
  const isCurrent = data.currentWeek === weekKey();
  const rows = data.hats.map((hat) => {
    const box = data.weeks[data.currentWeek]?.boxes.find((item) => item.hatId === hat.id) ?? {
      hatId: hat.id,
      hours: hat.defaultHours,
      tasks: [],
    };
    return {
      hat,
      box,
    };
  });

  const goWeek = useCallback(
    (direction: -1 | 1) => {
      setDir(direction);
      moveWeek(direction);
    },
    [moveWeek],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || sheet) return;
      if (event.key === "ArrowLeft") goWeek(-1);
      if (event.key === "ArrowRight") goWeek(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goWeek, sheet]);

  const removing = data.hats.find((hat) => hat.id === removeId) ?? null;

  useEffect(() => {
    if (dir === 0) return;
    const id = window.setTimeout(() => setDir(0), 420);
    return () => window.clearTimeout(id);
  }, [dir, data.currentWeek]);

  return (
    <div className="min-h-dvh">
      {typeof document !== "undefined" && createPortal(<WeekPaper doc={buildWeekDocument(data)} />, document.body)}
      <div className="mx-auto w-full max-w-xl">
        <header className="bar-fade no-print sticky top-0 z-20 px-4 pt-safe pb-3">
          <WeekCrown
            title={isCurrent ? "This week" : range}
            detail={isCurrent ? range : "Back to this week"}
            onDetail={isCurrent ? undefined : () => {
              const today = weekKey();
              setDir(today > data.currentWeek ? 1 : -1);
              moveWeek("today");
            }}
            turn={gesture}
            onMove={goWeek}
            onShift={setShift}
          />
          <div className="mx-auto mt-3 grid w-44 grid-cols-2 rounded-full bg-fill p-1" role="tablist" aria-label="View">
            {(
              [
                ["spread", "Spread"],
                ["week", "Week"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                className={cn(
                  "h-8 rounded-full text-sm font-medium",
                  view === key ? "bg-segment text-ink shadow-sm" : "text-secondary",
                )}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 pt-2 pb-dock">
          <h1 className="hidden print:block px-1 pt-4 text-2xl font-bold">Spread · {range}</h1>
          {view === "week" ? (
            <div key={data.currentWeek} className={dir === 0 ? undefined : "week-seq"} style={dir === 0 ? followStyle(shift) : weekFrom(dir)}>
              <WeeklyView onTurn={setGesture} onCommit={goWeek} />
            </div>
          ) : rows.length === 0 ? (
            <div>
              <p className="px-1 pt-8 text-sm text-secondary">Nothing on this week yet.</p>
              <NewLifeBox onClick={() => setSheet("new")} />
            </div>
          ) : (
            <div key={data.currentWeek} className={dir === 0 ? "enter" : "week-seq"} style={dir === 0 ? followStyle(shift) : weekFrom(dir)}>
              <div className="week-seq-item">
                <Summary rows={rows} onRollover={() => {
                  if (rollover(false) === "confirm") setRolloverAsk(true);
                }} />
              </div>
              <div className="mt-6 overflow-hidden rounded-[22px] bg-elevated">
                {rows.map(({ hat, box }, index) => (
                  <div key={hat.id} className="week-seq-item" style={{ animationDelay: `${(index + 1) * 45}ms` }}>
                    <RoleBlock
                      hat={hat}
                      hours={box.hours}
                      tasks={box.tasks}
                      editing={editing}
                      first={index === 0}
                      onRemove={() => setRemoveId(hat.id)}
                      onOpenTask={(taskId) => setOpenTask({ hatId: hat.id, taskId })}
                    />
                  </div>
                ))}
              </div>
              <div className="week-seq-item" style={{ animationDelay: `${(rows.length + 1) * 45}ms` }}>
                <NewLifeBox onClick={() => setSheet("new")} />
              </div>
            </div>
          )}
        </main>
      </div>

      <div className="app-dock no-print pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 pb-safe">
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
          {editing ? (
            <button
              type="button"
              className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"
              onClick={() => setEditing(false)}
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-accent active:opacity-70"
                onClick={() => setEditing(true)}
              >
                <SpreadIcon name="icon-edit.svg" size={20} />
                Edit
              </button>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full active:opacity-70"
                aria-label="More"
                onClick={() => setSheet("more")}
              >
                <Ellipsis className="size-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <AppSheet sheet={sheet} setSheet={setSheet} />
      <RemoveDialog hat={removing} onClose={() => setRemoveId(null)} />
      <RolloverDialog
        open={rolloverAsk}
        onClose={() => setRolloverAsk(false)}
        onConfirm={() => {
          rollover(true);
          setRolloverAsk(false);
        }}
      />
      {openTask && (
        <TaskSheet hatId={openTask.hatId} taskId={openTask.taskId} onClose={() => setOpenTask(null)} />
      )}
    </div>
  );
}

function NewLifeBox({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 flex min-h-16 w-full items-center gap-3 rounded-3xl bg-elevated px-4 py-3 text-left active:opacity-80"
    >
      <span className="grid size-8 shrink-0 place-items-center">
        <SpreadIcon name="icon-new-life.svg" size={32} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold">New Life</span>
        <span className="block text-xs text-secondary">Make your own spreads.</span>
      </span>
    </button>
  );
}

type Row = {
  hat: Hat;
  box: { hours: number; tasks: { done: boolean }[] };
};

function Summary({ rows, onRollover }: { rows: Row[]; onRollover: () => void }) {
  const totalHours = rows.reduce((sum, row) => sum + Number(row.box.hours || 0), 0);
  const taskCount = rows.reduce((sum, row) => sum + row.box.tasks.length, 0);
  const done = rows.reduce((sum, row) => sum + row.box.tasks.filter((task) => task.done).length, 0);
  const active = rows.filter((row) => row.box.hours > 0);
  return (
    <section className="px-1 pt-5">
      <p className="text-base">
        <span className="font-semibold tabular-nums">{formatHourLabel(totalHours)}</span>
        <span className="text-secondary">
          {" "}
          across {rows.length} {rows.length === 1 ? "spread" : "spreads"}
        </span>
      </p>
      {totalHours > 0 && (
        <div
          className="mt-3 flex h-2 gap-0.5"
          role="img"
          aria-label={`${formatHourLabel(totalHours)} boxed this week`}
        >
          {active.map((row) => (
            <div
              key={row.hat.id}
              className="h-full min-w-1 rounded-full"
              style={{ flexGrow: row.box.hours, flexBasis: 0, backgroundColor: row.hat.color }}
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-secondary tabular-nums">
        {taskCount === 0 ? "List the work that fits." : `${done} of ${taskCount} done`}
      </p>
      {totalHours > 45 && (
        <p className="mt-1 text-xs text-caution">If the hours don’t fit, something is lying.</p>
      )}
      <button type="button" className="mt-3 text-sm font-semibold text-accent" onClick={onRollover}>
        Rollover
      </button>
    </section>
  );
}

function formatHourLabel(hours: number) {
  const shown = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${shown} ${hours === 1 ? "hour" : "hours"}`;
}

const DAY_MARKS = ["M", "Tu", "W", "Th", "F", "Sa", "Su"] as const;

function DayMarks({ hatId, name, color }: { hatId: string; name: string; color: string }) {
  const data = useSpread((s) => s.data);
  const placed = data.weeks[data.currentWeek]?.allocations.filter((item) => item.hatId === hatId && item.hours > 0) ?? [];
  if (placed.length === 0) return null;
  const days = weekDays(data.currentWeek).slice().reverse();
  const used = new Set(placed.map((item) => item.day));
  const spoken = days.filter((day) => used.has(day.date)).map((day) => day.label);
  return (
    <p className="flex gap-2 pt-0.5" aria-label={`${name} on ${spoken.join(", ")}`}>
      {days.map((day, index) => {
        const on = used.has(day.date);
        return (
          <span
            key={day.date}
            className={on ? "text-xs font-semibold leading-none" : "text-xs font-medium leading-none text-tertiary"}
            style={on ? { color } : undefined}
          >
            {DAY_MARKS[index]}
          </span>
        );
      })}
    </p>
  );
}

function hourChip(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function RoleBlock({
  hat,
  hours,
  tasks,
  editing,
  first,
  onRemove,
  onOpenTask,
}: {
  hat: Hat;
  hours: number;
  tasks: { id: string; text: string; done: boolean }[];
  editing: boolean;
  first: boolean;
  onRemove: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const setHours = useSpread((s) => s.setHours);
  const renameHat = useSpread((s) => s.renameHat);
  const setHatColor = useSpread((s) => s.setHatColor);
  const addTask = useSpread((s) => s.addTask);
  const [name, setName] = useState(hat.name);
  const [adjusting, setAdjusting] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    setName(hat.name);
  }, [hat.name]);

  return (
    <section className="print:break-inside-avoid">
      {!first && <div className="ms-16 border-t border-line" />}
      <div className="relative flex min-h-16 items-center gap-3 px-4 py-2">
        {editing && (
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center"
            aria-label={`Remove ${hat.name}`}
            onClick={onRemove}
          >
            <span className="grid size-7 place-items-center rounded-full bg-danger text-on-danger">
              <Minus className="size-4" strokeWidth={3} />
            </span>
          </button>
        )}
        <button
          type="button"
          aria-label={`Color for ${hat.name}`}
          aria-expanded={palette}
          className="grid size-11 shrink-0 place-items-center"
          onClick={() => setPalette((open) => !open)}
        >
          <span className="grid size-9 place-items-center rounded-full text-white" style={{ backgroundColor: hat.color }}>
            <List className="size-[18px]" strokeWidth={2.5} />
          </span>
        </button>
        {palette && (
          <div className="absolute start-3 top-14 z-10 flex max-w-[calc(100vw-2rem)] overflow-x-auto rounded-full bg-elevated p-1 shadow-lg">
            {ROLE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                className="grid size-11 place-items-center"
                onClick={() => {
                  setHatColor(hat.id, color);
                  setPalette(false);
                }}
              >
                <span
                  className="size-7 rounded-full"
                  style={{
                    backgroundColor: color,
                    outline: hat.color === color ? "2px solid var(--ink)" : undefined,
                    outlineOffset: 2,
                  }}
                />
              </button>
            ))}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <input
            value={name}
            aria-label={`${hat.name} name`}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              if (!name.trim()) setName(hat.name);
              else renameHat(hat.id, name);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-full min-w-0 truncate bg-transparent text-[17px] font-normal tracking-[-0.02em] outline-none"
          />
          <DayMarks hatId={hat.id} name={hat.name} color={hat.color} />
        </div>
        {adjusting ? (
          <Stepper
            value={hours}
            label={`${hat.name} hours`}
            onChange={(value) => setHours(hat.id, value)}
            onClose={() => setAdjusting(false)}
          />
        ) : (
          <button
            type="button"
            className="grid h-11 min-w-8 shrink-0 place-items-center text-[17px] font-normal text-secondary tabular-nums"
            aria-label={`${hat.name}, ${hourChip(hours)} hours. Adjust`}
            onClick={() => setAdjusting(true)}
          >
            {hourChip(hours)}h
          </button>
        )}
      </div>
      <ul>
        {tasks.map((task) => (
          <TaskRow key={task.id} hatId={hat.id} color={hat.color} task={task} onOpen={() => onOpenTask(task.id)} />
        ))}
        <li>
          <AddTaskRow
            color={hat.color}
            placeholder={tasks.length === 0 ? "What matters most here?" : "Add a task"}
            onAdd={(text) => addTask(hat.id, text)}
          />
        </li>
      </ul>
    </section>
  );
}

function Stepper({
  value,
  onChange,
  label,
  onClose,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  onClose?: () => void;
}) {
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <div className="flex shrink-0 items-center rounded-full bg-fill" role="group" aria-label={label}>
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full active:opacity-60 disabled:opacity-30"
        aria-label={`Decrease ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-4" strokeWidth={2.25} />
      </button>
      {onClose ? (
        <button
          type="button"
          className="w-9 text-center text-sm font-semibold tabular-nums"
          aria-label="Done adjusting hours"
          onClick={onClose}
        >
          {shown}h
        </button>
      ) : (
        <span className="w-9 text-center text-sm font-semibold tabular-nums">{shown}h</span>
      )}
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full active:opacity-60 disabled:opacity-30"
        aria-label={`Increase ${label}`}
        disabled={value >= 40}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}

function TaskRow({
  hatId,
  color,
  task,
  onOpen,
}: {
  hatId: string;
  color: string;
  task: { id: string; text: string; done: boolean };
  onOpen: () => void;
}) {
  const toggleTask = useSpread((s) => s.toggleTask);
  return (
    <li>
      <div className="ms-16 border-t border-line" />
      <div className="flex min-h-14 items-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? `Mark not done: ${task.text}` : `Mark done: ${task.text}`}
          onClick={() => toggleTask(hatId, task.id)}
          className="grid size-14 shrink-0 place-items-center"
        >
          <span
            className="grid size-7 place-items-center rounded-full border-2"
            style={
              task.done
                ? { backgroundColor: color, borderColor: color, color: "#fff" }
                : { borderColor: "var(--tertiary)" }
            }
          >
            {task.done && <Check className="size-4" strokeWidth={3} />}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "flex min-h-14 min-w-0 flex-1 items-center pe-4 text-left text-[17px] leading-snug",
            task.done && "text-secondary line-through",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{task.text}</span>
          <ChevronRight className="size-5 shrink-0 text-tertiary" />
        </button>
      </div>
    </li>
  );
}

function AddTaskRow({ color, placeholder, onAdd }: { color: string; placeholder: string; onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const text = value.trim();
        if (!text) return;
        onAdd(text);
        setValue("");
      }}
    >
      <div className="ms-16 border-t border-line" />
      <div className="flex min-h-14 items-center">
        <span className="grid size-14 shrink-0 place-items-center" aria-hidden="true" style={{ color }}>
          <Plus className="size-6" strokeWidth={2.25} />
        </span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="done"
          className="h-14 min-w-0 flex-1 bg-transparent pe-4 text-[17px] outline-none placeholder:text-tertiary"
        />
      </div>
    </form>
  );
}

function AppSheet({ sheet, setSheet }: { sheet: Sheet; setSheet: (sheet: Sheet) => void }) {
  useLockPageScroll(sheet !== null);
  return (
    <Dialog.Root open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="no-print fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content className="sheet no-print fixed inset-x-0 z-50 mx-auto w-full max-w-xl overflow-y-auto bg-elevated px-5 pt-3 pb-safe outline-none enter">
          {sheet === "more" && <MoreSheet setSheet={setSheet} />}
          {sheet === "new" && <NewLifeSheet onClose={() => setSheet(null)} />}
          {sheet === "license" && <LicenseSheet onClose={() => setSheet(null)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Grabber() {
  return <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-fill" aria-hidden="true" />;
}

function MoreSheet({ setSheet }: { setSheet: (sheet: Sheet) => void }) {
  const license = useSpread((s) => s.license);
  const theme = useSpread((s) => s.theme);
  const setTheme = useSpread((s) => s.setTheme);
  const copyLastWeek = useSpread((s) => s.copyLastWeek);
  const replaceData = useSpread((s) => s.replaceData);
  const data = useSpread((s) => s.data);
  const fileRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<SpreadBackup | null>(null);
  const week = buildWeekDocument(data);

  const actions: { label: string; icon?: "icon-share.svg"; run: () => void }[] = [
    {
      label: "Copy last week",
      run: () => {
        const ok = copyLastWeek();
        toast(ok ? "Last week copied. Tasks are open again." : "No previous week yet.");
        setSheet(null);
      },
    },
    {
      label: "Copy week",
      icon: "icon-share.svg",
      run: () => {
        void copyText(weekDocumentText(week)).then((ok) => {
          toast(ok ? "Week copied." : "Couldn’t copy the week.");
          if (ok) setSheet(null);
        });
      },
    },
    {
      label: "Word document",
      icon: "icon-share.svg",
      run: () => {
        void weekDocxBlob(week)
          .then((blob) => {
            saveFile(blob, `Spread-${data.currentWeek}.docx`);
            toast("Word document saved.");
            setSheet(null);
          })
          .catch(() => toast("Couldn’t make the Word document."));
      },
    },
    {
      label: "Print / Save PDF",
      icon: "icon-share.svg",
      run: () => {
        setSheet(null);
        window.setTimeout(() => window.print(), 250);
      },
    },
    {
      label: "Back Up Spread",
      run: () => {
        saveBackup(data);
        toast("Backup saved.");
        setSheet(null);
      },
    },
    { label: "Restore Spread", run: () => fileRef.current?.click() },
    { label: "License key", run: () => setSheet("license") },
  ];

  return (
    <>
      <Grabber />
      <Dialog.Title className="text-2xl font-bold tracking-tight">More</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-secondary">
        {license?.plan === "personal" ? "Personal license on this device." : "Trial on this device."}
      </Dialog.Description>
      <input
        ref={fileRef}
        type="file"
        accept=".spread,.json,application/json"
        className="sr-only"
        aria-label="Choose a Spread backup"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void file.text().then((text) => {
            const next = parseBackup(text);
            if (!next) {
              toast("That file isn’t a Spread backup.");
              return;
            }
            setBackup(next);
          });
        }}
      />
      <div className="mt-4 overflow-hidden rounded-3xl bg-canvas">
        {actions.map((action, index) => (
          <button
            key={action.label}
            type="button"
            className={cn(
              "flex h-12 w-full items-center gap-3 px-4 text-left text-base active:bg-fill",
              index < actions.length - 1 && "border-b border-line",
            )}
            onClick={action.run}
          >
            {action.icon ? <SpreadIcon name={action.icon} size={20} /> : null}
            {action.label}
          </button>
        ))}
      </div>
      <div className="mt-5 flex h-12 items-center gap-3 px-4">
        <SpreadIcon name="icon-settings.svg" size={20} />
        <p className="text-base">Settings</p>
      </div>
      <div className="mt-1">
        <Segmented value={theme} onChange={setTheme} />
      </div>
      <button
        type="button"
        className="mt-4 h-12 w-full rounded-full text-base font-semibold text-danger"
        onClick={() => {
          useSpread.getState().logout();
          setSheet(null);
        }}
      >
        Log out
      </button>
      <RestoreDialog
        backup={backup}
        onClose={() => setBackup(null)}
        onConfirm={() => {
          if (!backup) return;
          replaceData(backup.data);
          setBackup(null);
          setSheet(null);
          toast("Backup restored.");
        }}
      />
      <p className="mt-5 text-xs text-tertiary">Spread · Gray Matter. Data stays on this device.</p>
    </>
  );
}

function RestoreDialog({
  backup,
  onClose,
  onConfirm,
}: {
  backup: SpreadBackup | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const names = backup?.summary.spreads ?? [];
  const listed = names.length === 0 ? "No spreads" : names.length <= 4 ? names.join(", ") : `${names.slice(0, 3).join(", ")}, and ${names.length - 3} more`;
  return (
    <AlertDialog.Root open={backup !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="no-print fixed inset-0 z-[60] bg-scrim" />
        <AlertDialog.Content className="no-print fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-xs -translate-y-1/2 rounded-3xl bg-elevated p-5 outline-none">
          <AlertDialog.Title className="text-center text-base font-semibold">Restore this backup?</AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-center text-sm text-secondary">
            {listed}. {backup?.summary.weeks ?? 0} {backup?.summary.weeks === 1 ? "week" : "weeks"}, {backup?.summary.tasks ?? 0}{" "}
            {backup?.summary.tasks === 1 ? "task" : "tasks"}. {backup?.summary.range}. This replaces everything on this device.
          </AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="h-11 rounded-full bg-fill text-sm font-semibold">Cancel</AlertDialog.Cancel>
            <AlertDialog.Action className="h-11 rounded-full bg-accent text-sm font-semibold text-on-accent" onClick={onConfirm}>
              Restore
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => copyTextFallback(text),
    );
  }
  return Promise.resolve(copyTextFallback(text));
}

function copyTextFallback(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok;
}

function Segmented({ value, onChange }: { value: ThemeChoice; onChange: (theme: ThemeChoice) => void }) {
  const options: { value: ThemeChoice; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];
  return (
    <div className="grid grid-cols-3 rounded-full bg-fill p-1" role="radiogroup" aria-label="Appearance">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-full text-sm font-medium",
              active ? "bg-segment text-ink shadow-sm" : "text-secondary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function NewLifeSheet({ onClose }: { onClose: () => void }) {
  const addHat = useSpread((s) => s.addHat);
  const [rows, setRows] = useState([{ key: 1, name: "", hours: 2 }]);
  const [nextKey, setNextKey] = useState(2);
  const ready = rows.some((row) => row.name.trim());

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        for (const row of rows) {
          if (row.name.trim()) addHat(row.name, row.hours);
        }
        onClose();
      }}
    >
      <Grabber />
      <Dialog.Title className="text-2xl font-bold tracking-tight">New Life</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-secondary">
        Name the spreads you actually live. Add as many as you need.
      </Dialog.Description>
      <div className="mt-5 flex flex-col gap-3">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-3xl bg-canvas p-3">
            <label className="block text-xs text-secondary" htmlFor={`spread-name-${row.key}`}>
              Spread {index + 1}
            </label>
            <input
              id={`spread-name-${row.key}`}
              autoFocus={index === 0}
              value={row.name}
              placeholder="Parent, shop, study"
              onChange={(event) =>
                setRows((current) =>
                  current.map((item) => (item.key === row.key ? { ...item, name: event.target.value } : item)),
                )
              }
              className="mt-2 h-12 w-full rounded-2xl bg-fill px-4 text-base outline-none placeholder:text-tertiary"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-secondary">Hours each week</p>
              <Stepper
                value={row.hours}
                label={`Hours for spread ${index + 1}`}
                onChange={(hours) =>
                  setRows((current) => current.map((item) => (item.key === row.key ? { ...item, hours } : item)))
                }
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-4 h-11 text-sm font-semibold text-accent"
        onClick={() => {
          setRows((current) => [...current, { key: nextKey, name: "", hours: 2 }]);
          setNextKey((key) => key + 1);
        }}
      >
        Add another spread
      </button>
      <button
        type="submit"
        disabled={!ready}
        className="mt-2 h-12 w-full rounded-full bg-accent text-base font-semibold text-on-accent disabled:opacity-40"
      >
        Save spreads
      </button>
    </form>
  );
}

function LicenseSheet({ onClose }: { onClose: () => void }) {
  const unlock = useSpread((s) => s.unlock);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!unlock(code)) {
          setError("That key isn’t valid.");
          return;
        }
        toast(code.trim().toUpperCase() === "SPR-DEMO-2026" ? "Trial is on." : "License saved.");
        onClose();
      }}
    >
      <Grabber />
      <Dialog.Title className="text-2xl font-bold tracking-tight">License key</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-secondary">
        One key for this device. Nothing is sent away.
      </Dialog.Description>
      <input
        autoFocus
        value={code}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        placeholder="SPR-XXXX-XXXX"
        aria-label="License key"
        onChange={(event) => {
          setCode(event.target.value);
          setError("");
        }}
        className="mt-5 h-12 w-full rounded-2xl bg-fill px-4 text-center text-base outline-none placeholder:text-tertiary"
      />
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="mt-4 h-12 w-full rounded-full bg-accent text-base font-semibold text-on-accent"
      >
        Save key
      </button>
    </form>
  );
}

function RolloverDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="no-print fixed inset-0 z-50 bg-scrim" />
        <AlertDialog.Content className="no-print fixed inset-x-4 top-1/2 z-50 mx-auto max-w-xs -translate-y-1/2 rounded-3xl bg-elevated p-5 outline-none">
          <AlertDialog.Title className="text-center text-base font-semibold">Replace next week?</AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-center text-sm text-secondary">
            Next week already has tasks or days. Rollover will replace that week. This week stays as it is.
          </AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="h-11 rounded-full bg-fill text-sm font-semibold">Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              className="h-11 rounded-full bg-accent text-sm font-semibold text-on-accent"
              onClick={onConfirm}
            >
              Replace
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function RemoveDialog({ hat, onClose }: { hat: Hat | null; onClose: () => void }) {
  const removeHat = useSpread((s) => s.removeHat);
  return (
    <AlertDialog.Root open={hat !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="no-print fixed inset-0 z-50 bg-scrim" />
        <AlertDialog.Content className="no-print fixed inset-x-4 top-1/2 z-50 mx-auto max-w-xs -translate-y-1/2 rounded-3xl bg-elevated p-5 outline-none">
          <div className="mx-auto mb-3 grid size-11 place-items-center">
            <SpreadIcon name="icon-trash.svg" size={20} />
          </div>
          <AlertDialog.Title className="text-center text-base font-semibold">
            Remove {hat?.name}?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-center text-sm text-secondary">
            The hours and tasks for this spread leave every week.
          </AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="h-11 rounded-full bg-fill text-sm font-semibold">
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className="h-11 rounded-full bg-danger text-sm font-semibold text-on-danger"
              onClick={() => {
                if (hat) removeHat(hat.id);
              }}
            >
              Remove
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
