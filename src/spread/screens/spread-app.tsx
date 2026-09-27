import { useCallback, useEffect, useState, type CSSProperties } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronRight, Ellipsis, Minus, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/cn";
import { formatWeek, allocationHours, ROLE_COLORS, weekKey, type Hat } from "@/lib/spread/model";
import { exportSpread, useSpread, type ThemeChoice } from "@/lib/spread/store";
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

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="8" y="14" width="34" height="8" rx="4" fill="currentColor" opacity="0.4" />
      <rect x="8" y="28" width="48" height="8" rx="4" fill="currentColor" />
      <rect x="8" y="42" width="22" height="8" rx="4" fill="currentColor" opacity="0.7" />
    </svg>
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
        <div className="mb-7 grid size-16 place-items-center rounded-3xl bg-fill text-accent">
          <Mark className="size-9" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-balance">Spread</h1>
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
  const allocations = data.weeks[data.currentWeek]?.allocations ?? [];
  const rows = data.hats.map((hat) => {
    const box = data.weeks[data.currentWeek]?.boxes.find((item) => item.hatId === hat.id) ?? {
      hatId: hat.id,
      hours: hat.defaultHours,
      tasks: [],
    };
    return {
      hat,
      box: { ...box, hours: allocationHours(allocations, hat.id, box.hours) },
      distributed: allocations.some((item) => item.hatId === hat.id),
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
            <p className="px-1 pt-8 text-sm text-secondary">Nothing on this week yet.</p>
          ) : (
            <div key={data.currentWeek} className={dir === 0 ? "enter" : "week-seq"} style={dir === 0 ? followStyle(shift) : weekFrom(dir)}>
              <div className="week-seq-item">
                <Summary rows={rows} onRollover={() => {
                  if (rollover(false) === "confirm") setRolloverAsk(true);
                }} />
              </div>
              <div className="mt-6 flex flex-col gap-5">
                {rows.map(({ hat, box, distributed }, index) => (
                  <div key={hat.id} className="week-seq-item" style={{ animationDelay: `${(index + 1) * 45}ms` }}>
                    <RoleBlock
                      hat={hat}
                      hours={box.hours}
                      tasks={box.tasks}
                      editing={editing}
                      distributed={distributed}
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
                className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold active:opacity-70"
                onClick={() => setEditing(true)}
              >
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
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fill text-accent">
        <Plus className="size-4" strokeWidth={2.25} />
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

function hourChip(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function RoleBlock({
  hat,
  hours,
  tasks,
  editing,
  distributed,
  onRemove,
  onOpenTask,
}: {
  hat: Hat;
  hours: number;
  tasks: { id: string; text: string; done: boolean }[];
  editing: boolean;
  distributed: boolean;
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
      <div className="relative mb-2 flex items-center gap-1 ps-1">
        {editing && (
          <button
            type="button"
            className="grid size-11 place-items-center"
            aria-label={`Remove ${hat.name}`}
            onClick={onRemove}
          >
            <span className="grid size-6 place-items-center rounded-full bg-danger text-on-danger">
              <Minus className="size-3.5" strokeWidth={3} />
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
          <span className="size-2.5 rounded-full" style={{ backgroundColor: hat.color }} />
        </button>
        {palette && (
          <div className="absolute start-0 top-11 z-10 flex max-w-[calc(100vw-2rem)] overflow-x-auto rounded-full bg-elevated p-1 shadow-lg">
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
                  className="size-5 rounded-full"
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
          className="min-w-0 flex-1 truncate rounded-lg bg-transparent px-2 text-base font-semibold outline-none focus:bg-fill"
        />
        {adjusting && !distributed ? (
          <Stepper
            value={hours}
            label={`${hat.name} hours`}
            onChange={(value) => setHours(hat.id, value)}
            onClose={() => setAdjusting(false)}
          />
        ) : (
          <button
            type="button"
            className="grid h-11 shrink-0 place-items-center px-1"
            aria-label={
              distributed
                ? `${hat.name}, ${hourChip(hours)} ${hours === 1 ? "hour" : "hours"} across the week`
                : `${hat.name}, ${hours} hours. Adjust`
            }
            onClick={() => {
              if (!distributed) setAdjusting(true);
            }}
          >
            <span className="rounded-full bg-fill px-3 py-1 text-sm font-semibold tabular-nums">
              {hourChip(hours)}h
            </span>
          </button>
        )}
      </div>
      <ul className="overflow-hidden rounded-3xl bg-elevated">
        {tasks.map((task) => (
          <TaskRow key={task.id} hatId={hat.id} task={task} onOpen={() => onOpenTask(task.id)} />
        ))}
        <li>
          <AddTaskRow
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
  task,
  onOpen,
}: {
  hatId: string;
  task: { id: string; text: string; done: boolean };
  onOpen: () => void;
}) {
  const toggleTask = useSpread((s) => s.toggleTask);
  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex items-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? `Mark not done: ${task.text}` : `Mark done: ${task.text}`}
          onClick={() => toggleTask(hatId, task.id)}
          className="grid size-11 shrink-0 place-items-center"
        >
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full border-2",
              task.done ? "border-accent bg-accent text-on-accent" : "border-tertiary",
            )}
          >
            {task.done && <Check className="size-3.5" strokeWidth={3} />}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "flex h-11 min-w-0 flex-1 items-center pe-2 text-left text-base",
            task.done && "text-secondary line-through",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{task.text}</span>
          <ChevronRight className="size-4 shrink-0 text-tertiary" />
        </button>
      </div>
    </li>
  );
}

function AddTaskRow({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex items-center"
      onSubmit={(event) => {
        event.preventDefault();
        const text = value.trim();
        if (!text) return;
        onAdd(text);
        setValue("");
      }}
    >
      <span className="grid size-11 shrink-0 place-items-center text-accent" aria-hidden="true">
        <Plus className="size-5" strokeWidth={2.25} />
      </span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="done"
        className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-tertiary"
      />
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
  const data = useSpread((s) => s.data);

  const actions: { label: string; run: () => void }[] = [
    {
      label: "Copy last week",
      run: () => {
        const ok = copyLastWeek();
        toast(ok ? "Last week copied. Tasks are open again." : "No previous week yet.");
        setSheet(null);
      },
    },
    {
      label: "Export JSON",
      run: () => {
        exportSpread(data);
        setSheet(null);
      },
    },
    {
      label: "Print week",
      run: () => {
        setSheet(null);
        window.setTimeout(() => window.print(), 250);
      },
    },
    { label: "License key", run: () => setSheet("license") },
  ];

  return (
    <>
      <Grabber />
      <Dialog.Title className="text-2xl font-bold tracking-tight">More</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-secondary">
        {license?.plan === "personal" ? "Personal license on this device." : "Trial on this device."}
      </Dialog.Description>
      <div className="mt-4 overflow-hidden rounded-3xl bg-canvas">
        {actions.map((action, index) => (
          <button
            key={action.label}
            type="button"
            className={cn(
              "flex h-12 w-full items-center px-4 text-left text-base active:bg-fill",
              index < actions.length - 1 && "border-b border-line",
            )}
            onClick={action.run}
          >
            {action.label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs font-medium text-secondary">Appearance</p>
      <div className="mt-2">
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
      <p className="mt-5 text-xs text-tertiary">Spread · Gray Matter. Data stays on this device.</p>
    </>
  );
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
