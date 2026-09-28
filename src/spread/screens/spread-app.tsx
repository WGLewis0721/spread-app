import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, Check, List, Minus, Plus, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/cn";
import { formatWeek, ROLE_COLORS, SPREAD_CATEGORIES, weekDays, weekKey, type Hat, type SpreadCategory } from "@/lib/spread/model";
import { ACCENTS, consumeArrival, saveBackup, useSpread, type ThemeChoice } from "@/lib/spread/store";
import { PROFILE_LIMIT } from "@/lib/spread/profiles";
import { parseBackup, type SpreadBackup } from "@/lib/spread/backup";
import { buildWeekDocument, weekDocumentText, type WeekDocument } from "@/lib/spread/week-document";
import { saveFile } from "@/lib/spread/save-file";
import { WeekPaper } from "@/spread/components/week-paper";
import { SpreadIcon } from "@/spread/components/spread-icon";
import { CategoryBadge } from "@/spread/components/category-badge";
import { TaskSheet } from "@/spread/components/task-sheet";
import { WeeklyView } from "@/spread/components/weekly-view";
import { WeekCrown } from "@/spread/components/week-crown";
import { useBrowserFrame, useLockPageScroll } from "@/spread/components/use-browser-frame";

type Sheet = "more" | "new" | "license" | null;

const useClientLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function SpreadApp() {
  const hydrated = useHydrated();
  const ready = useSpread((s) => s.ready);
  const license = useSpread((s) => s.license);
  const theme = useSpread((s) => s.theme);
  const boot = useSpread((s) => s.boot);
  useBrowserFrame();

  useClientLayout(() => {
    boot();
  }, [boot]);

  return (
    <>
      <Toaster
        position="top-center"
        theme={!hydrated || theme === "system" ? "system" : theme}
        toastOptions={{
          style: {
            background: "var(--elevated)",
            color: "var(--ink)",
            border: "0.5px solid var(--line)",
            fontFamily: "inherit",
          },
        }}
      />
      {hydrated && ready && (license ? <WeekScreen /> : <UnlockScreen />)}
    </>
  );
}

function UnlockScreen() {
  const beginTrial = useSpread((s) => s.beginTrial);
  const unlock = useSpread((s) => s.unlock);
  const profiles = useSpread((s) => s.profiles);
  const activeId = useSpread((s) => s.activeId);
  const switchProfile = useSpread((s) => s.switchProfile);
  const [showKey, setShowKey] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const known = profiles.length > 0;

  return (
    <main className="spread-gate mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <SpreadIcon name="app-icon-spread-cards.svg" size={64} />
        <h1 className="mt-7 text-4xl font-bold tracking-tight text-balance">Spread</h1>
        <p className="mt-3 max-w-xs text-base text-secondary text-pretty">
          Roles first. Hours second. Tasks last.
        </p>
        {known ? (
          profiles.length > 1 ? (
            <div className="mt-8 overflow-hidden rounded-3xl bg-elevated" role="listbox" aria-label="Profiles">
              {profiles.map((profile, index) => (
                <button
                  key={profile.id}
                  type="button"
                  role="option"
                  aria-selected={profile.id === activeId}
                  className={cn(
                    "flex h-12 w-full items-center px-4 text-left text-base",
                    index < profiles.length - 1 && "border-b border-line",
                    profile.id === activeId && "font-semibold",
                  )}
                  onClick={() => switchProfile(profile.id)}
                >
                  <span className="flex-1 truncate">{profile.name}</span>
                  {profile.id === activeId && <Check className="size-4 text-accent" />}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-sm text-secondary">Continuing as {profiles[0].name}.</p>
          )
        ) : (
          <input
            value={name}
            autoFocus
            autoCapitalize="words"
            autoCorrect="off"
            placeholder="Your name"
            aria-label="Your name"
            onChange={(event) => setName(event.target.value)}
            className="mt-8 h-12 w-full rounded-2xl bg-fill px-4 text-base outline-none placeholder:text-tertiary"
          />
        )}
        <button
          type="button"
          className="mt-3 h-12 w-full rounded-full bg-accent text-base font-semibold text-on-accent active:opacity-80"
          onClick={() => beginTrial(known ? undefined : name)}
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
              if (!unlock(code, known ? undefined : name)) setError("That key isn’t valid.");
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

function brandCollapsed() {
  try {
    return sessionStorage.getItem("spread-brand-collapsed") === "1";
  } catch {
    return false;
  }
}

function SettingsGears({ turn }: { turn: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("gears size-9 text-ink", turn && "gears-turn")} aria-hidden="true">
      <Gear className="gear gear-lg" cx={8.2} cy={8.2} r={4.15} teeth={8} />
      <Gear className="gear gear-sm" cx={16.1} cy={16.1} r={3.25} teeth={6} />
    </svg>
  );
}

function Gear({ className, cx, cy, r, teeth }: { className: string; cx: number; cy: number; r: number; teeth: number }) {
  const tooth = 1.75;
  return (
    <g className={className}>
      {Array.from({ length: teeth }, (_, index) => (
        <rect
          key={index}
          x={cx - tooth / 2}
          y={cy - r - tooth + 0.45}
          width={tooth}
          height={tooth}
          rx={0.35}
          transform={`rotate(${(index / teeth) * 360} ${cx} ${cy})`}
          fill="currentColor"
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="currentColor" />
      <circle cx={cx} cy={cy} r={r * 0.38} className="gear-hole" />
    </g>
  );
}

function BrandMark({ size = 26 }: { size?: number }) {
  return <SpreadIcon name="app-icon-spread-cards.svg" size={size} />;
}

function WeekScreen() {
  const data = useSpread((s) => s.data);
  const moveWeek = useSpread((s) => s.moveWeek);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editing, setEditing] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [view, setView] = useState<"spread" | "week">("spread");
  const [viewPlay, setViewPlay] = useState(false);
  const [profilePlay, setProfilePlay] = useState(false);
  const [gears, setGears] = useState(false);
  const [openTask, setOpenTask] = useState<{ hatId: string; taskId: string } | null>(null);
  const [rolloverAsk, setRolloverAsk] = useState(false);
  const [gesture, setGesture] = useState(0);
  const [shift, setShift] = useState(0);
  const [dir, setDir] = useState<-1 | 1 | 0>(0);
  const [arrive] = useState(consumeArrival);
  const [brand, setBrand] = useState<"full" | "folding" | "mark">(() => (brandCollapsed() ? "mark" : "full"));
  const brandOnce = useRef(brand === "mark");
  const [printDoc, setPrintDoc] = useState<WeekDocument | null>(null);
  const profiles = useSpread((s) => s.profiles);
  const activeId = useSpread((s) => s.activeId);
  const activeName = profiles.find((profile) => profile.id === activeId)?.name;
  const rollover = useSpread((s) => s.rollover);
  const range = formatWeek(data.currentWeek);
  const isCurrent = data.currentWeek === weekKey();
  const boxByHat = new Map(data.weeks[data.currentWeek]?.boxes.map((box) => [box.hatId, box]) ?? []);
  const rows = data.hats.map((hat) => {
    const box = boxByHat.get(hat.id) ?? {
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

  useEffect(() => {
    if (brandOnce.current) return;
    function fold() {
      if (brandOnce.current) return;
      brandOnce.current = true;
      try {
        sessionStorage.setItem("spread-brand-collapsed", "1");
      } catch {
        /* private mode */
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        setBrand("mark");
        return;
      }
      setBrand("folding");
      window.setTimeout(() => setBrand("mark"), 780);
    }
    const timer = window.setTimeout(fold, 3500);
    window.addEventListener("pointerdown", fold);
    window.addEventListener("keydown", fold);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", fold);
      window.removeEventListener("keydown", fold);
    };
  }, []);

  useEffect(() => {
    if (!printDoc) return;
    const id = window.setTimeout(() => window.print(), 50);
    function done() {
      setPrintDoc(null);
    }
    window.addEventListener("afterprint", done);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("afterprint", done);
    };
  }, [printDoc]);

  const profileSeen = useRef(activeId);
  useEffect(() => {
    if (profileSeen.current === activeId) return;
    profileSeen.current = activeId;
    setOpenTask(null);
    setEditing(false);
    setRemoveId(null);
    setPrintDoc(null);
    setProfilePlay(true);
    const id = window.setTimeout(() => setProfilePlay(false), 460);
    return () => window.clearTimeout(id);
  }, [activeId]);

  function goHome() {
    setEditing(false);
    setOpenTask(null);
    if (view === "spread") return;
    setViewPlay(true);
    setView("spread");
    window.setTimeout(() => setViewPlay(false), 380);
  }

  return (
    <div className="min-h-dvh">
      {printDoc && typeof document !== "undefined" && createPortal(<WeekPaper doc={printDoc} />, document.body)}
      <div className="mx-auto w-full max-w-xl">
        <header className="bar-fade no-print sticky top-0 z-20 px-4 pt-safe pb-3">
          <div className="mb-3 flex items-center gap-3">
            <button type="button" className="brand" aria-label="Spread, home" onClick={goHome}>
              <BrandMark size={26} />
              {brand !== "mark" && (
                <span className={cn("brand-clip", brand === "folding" && "is-folding")}>
                  <span className="brand-word">Spread</span>
                </span>
              )}
            </button>
            {profiles.length > 1 && activeName && (
              <button
                type="button"
                className={cn(
                  "ml-auto h-8 max-w-[46%] truncate rounded-full bg-fill px-3 text-sm font-medium",
                  profilePlay && "descend-in",
                )}
                aria-label={`${activeName}, profiles`}
                onClick={() => setSheet("more")}
              >
                {activeName}
              </button>
            )}
          </div>
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
          <div className="mx-auto mt-3 grid w-fit grid-cols-2 rounded-full bg-fill p-1" role="tablist" aria-label="View">
            {(
              [
                ["spread", "Spread", "icon-spread-list.svg"],
                ["week", "Week", "icon-week.svg"],
              ] as const
            ).map(([key, label, icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                className={cn(
                  "flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium",
                  view === key ? "bg-segment text-ink shadow-sm" : "text-secondary",
                )}
                onClick={() => {
                  if (view === key) return;
                  if (key === "week") setEditing(false);
                  setViewPlay(true);
                  setView(key);
                  window.setTimeout(() => setViewPlay(false), 380);
                }}
              >
                <span className={view === key ? "text-accent" : "text-secondary"}>
                  <SpreadIcon name={icon} size={key === "week" ? 24 : 23} className="text-inherit" />
                </span>
                {brand !== "mark" && (
                  <span className={cn("brand-clip", brand === "folding" && "is-folding")} style={{ "--lockup-gap": "6px" } as CSSProperties}>
                    <span className="tab-word">{label}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <main key={activeId ?? "solo"} className="px-4 pt-2 pb-dock">
          <h1 className="hidden print:block px-1 pt-4 text-2xl font-bold">Spread · {range}</h1>
          {view === "week" ? (
            <div key={data.currentWeek} className={profilePlay ? "cascade" : dir !== 0 || viewPlay ? "week-seq" : undefined} style={profilePlay ? undefined : dir !== 0 ? weekFrom(dir) : viewPlay ? weekFrom(1) : followStyle(shift)}>
              <div className={profilePlay ? "cascade-item" : undefined}>
                <WeeklyView onTurn={setGesture} onCommit={goWeek} />
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className={profilePlay ? "cascade" : undefined}>
              <p className={cn("px-1 pt-8 text-sm text-secondary", profilePlay && "cascade-item")}>Nothing on this week yet.</p>
              <div className={profilePlay ? "cascade-item" : undefined} style={profilePlay ? { animationDelay: "45ms" } : undefined}>
                <NewLifeBox onClick={() => setSheet("new")} />
              </div>
            </div>
          ) : (
            <div key={data.currentWeek} className={profilePlay ? "cascade" : dir !== 0 || viewPlay ? "week-seq" : arrive ? "enter" : undefined} style={profilePlay ? undefined : dir !== 0 ? weekFrom(dir) : viewPlay ? weekFrom(-1) : followStyle(shift)}>
              <div className={cn("week-seq-item", profilePlay && "cascade-item")}>
                <Summary rows={rows} onRollover={() => {
                  if (rollover(false) === "confirm") setRolloverAsk(true);
                }} />
              </div>
              <div className="mt-6 overflow-hidden rounded-[22px] bg-elevated">
                {rows.map(({ hat, box }, index) => (
                  <div key={hat.id} className={cn("week-seq-item", profilePlay && "cascade-item")} style={{ animationDelay: `${(index + 1) * 45}ms` }}>
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
              <div className={cn("week-seq-item", profilePlay && "cascade-item")} style={{ animationDelay: `${(rows.length + 1) * 45}ms` }}>
                <NewLifeBox onClick={() => setSheet("new")} />
              </div>
            </div>
          )}
        </main>
      </div>

      <div className="app-dock no-print pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 pb-safe">
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
          {view === "spread" && (editing ? (
            <button
              type="button"
              className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"
              onClick={() => setEditing(false)}
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-accent active:opacity-70"
              onClick={() => setEditing(true)}
            >
              <SpreadIcon name="icon-edit.svg" size={24} />
              Edit
            </button>
          ))}
          {!(view === "spread" && editing) && (
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full active:opacity-70"
              aria-label="Settings"
              onPointerDown={() => {
                setGears(false);
                window.requestAnimationFrame(() => setGears(true));
              }}
              onClick={() => setSheet("more")}
            >
              <SettingsGears turn={gears} />
            </button>
          )}
        </div>
      </div>

      <AppSheet sheet={sheet} setSheet={setSheet} onPrint={() => setPrintDoc(buildWeekDocument(useSpread.getState().data))} />
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
        <span className="block text-base font-semibold">New Spread</span>
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
      <button type="button" className="mt-3 flex items-center gap-2 text-sm font-semibold text-accent" onClick={onRollover}>
        <SpreadIcon name="icon-rollover.svg" size={26} />
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
  const setHatCategory = useSpread((s) => s.setHatCategory);
  const addTask = useSpread((s) => s.addTask);
  const [name, setName] = useState(hat.name);
  const [adjusting, setAdjusting] = useState(false);
  const [paletteOn, setPaletteOn] = useState(false);
  const [palettePhase, setPalettePhase] = useState<"in" | "out">("in");
  const [tasksOpen, setTasksOpen] = useState(true);
  const [taskMotion, setTaskMotion] = useState<"idle" | "in" | "out">("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setName(hat.name);
  }, [hat.name]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  function later(ms: number, run: () => void) {
    const id = window.setTimeout(run, ms);
    timers.current.push(id);
  }

  function togglePalette() {
    if (paletteOn && palettePhase !== "out") {
      setPalettePhase("out");
      later(260, () => setPaletteOn(false));
      return;
    }
    setPaletteOn(true);
    setPalettePhase("in");
  }

  function toggleTasks() {
    if (tasksOpen && taskMotion !== "out") {
      setTaskMotion("out");
      later(200 + Math.min(tasks.length + 1, 6) * 32, () => {
        setTasksOpen(false);
        setTaskMotion("idle");
      });
      return;
    }
    if (!tasksOpen) {
      setTasksOpen(true);
      setTaskMotion("in");
    }
  }

  return (
    <section className="print:break-inside-avoid">
      {!first && <div className="ms-16 border-t border-line" />}
      <div className="relative overflow-hidden">
        <button
          type="button"
          aria-label={`Remove ${hat.name}`}
          aria-hidden={!editing}
          tabIndex={editing ? 0 : -1}
          className={cn(
            "edit-minus absolute start-1 top-2 grid size-11 place-items-center",
            editing ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0",
          )}
          onClick={onRemove}
        >
          <span className="grid size-7 place-items-center rounded-full bg-danger text-on-danger">
            <Minus className="size-4" strokeWidth={3.6} />
          </span>
        </button>
        <div className={cn("edit-shift flex min-h-16 items-center gap-3 px-4 py-2", editing && "edit-shift-on")}>
        <button
          type="button"
          aria-label={`Color for ${hat.name}`}
          aria-expanded={paletteOn && palettePhase !== "out"}
          className="relative grid size-11 shrink-0 place-items-center"
          onClick={togglePalette}
        >
          {hat.category ? (
            <CategoryBadge category={hat.category} color={hat.color} size={36} />
          ) : (
            <span className="grid size-9 place-items-center rounded-full text-white" style={{ backgroundColor: hat.color }}>
              <List className="size-[18px]" strokeWidth={3} />
            </span>
          )}
          {editing && (
            <span className="absolute bottom-0 end-0 grid size-5 place-items-center rounded-full bg-elevated">
              <SpreadIcon name="icon-palette.svg" size={14} />
            </span>
          )}
        </button>
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
        <button
          type="button"
          aria-expanded={tasksOpen && taskMotion !== "out"}
          aria-label={tasksOpen && taskMotion !== "out" ? `Hide tasks for ${hat.name}` : `Show tasks for ${hat.name}`}
          className="grid size-8 shrink-0 place-items-center text-tertiary"
          onClick={toggleTasks}
        >
          <ChevronRight className={cn("size-5 transition-transform duration-300", tasksOpen && taskMotion !== "out" && "rotate-90")} />
        </button>
        </div>
      </div>
      {paletteOn && (
        <div className={cn("border-t border-line px-4 py-3", palettePhase === "out" ? "cascade cascade-out" : "cascade")}>
          <div className="flex items-center gap-2">
            <SpreadIcon name="icon-palette.svg" size={20} />
            <p className="text-sm font-medium">Color</p>
          </div>
          <div className="mt-2 flex flex-wrap">
            {[...ROLE_COLORS, ...SPREAD_CATEGORIES.map((item) => item.color)]
              .filter((color, index, all) => all.indexOf(color) === index)
              .map((color, index) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use ${color}`}
                  className="cascade-item grid size-11 place-items-center"
                  style={{ animationDelay: `${index * 24}ms` }}
                  onClick={() => setHatColor(hat.id, color)}
                >
                  <span
                    className="size-7 rounded-full"
                    style={{
                      backgroundColor: color,
                      outline: hat.color.toLowerCase() === color.toLowerCase() ? "2px solid var(--ink)" : undefined,
                      outlineOffset: 2,
                    }}
                  />
                </button>
              ))}
          </div>
          <p className="mt-2 text-xs text-secondary">
            Symbol{hat.category ? ` · ${SPREAD_CATEGORIES.find((item) => item.id === hat.category)?.label}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SPREAD_CATEGORIES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-pressed={hat.category === item.id}
                className="cascade-item grid size-11 place-items-center rounded-full"
                style={{
                  animationDelay: `${index * 24}ms`,
                  boxShadow: hat.category === item.id ? "0 0 0 2px var(--ink)" : undefined,
                }}
                onClick={() => setHatCategory(hat.id, item.id)}
              >
                <CategoryBadge
                  category={item.id}
                  color={hat.category === item.id ? hat.color : item.color}
                  size={32}
                />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={cn("task-fold", (tasksOpen || taskMotion === "out") && "task-fold-open")}>
      <ul className={taskMotion === "in" ? "cascade" : taskMotion === "out" ? "cascade cascade-out" : undefined}>
        {tasks.map((task, index) => (
          <TaskRow
            key={task.id}
            hatId={hat.id}
            task={task}
            delay={taskMotion === "idle" ? undefined : `${index * 32}ms`}
            onOpen={() => onOpenTask(task.id)}
          />
        ))}
        <li className={taskMotion === "idle" ? undefined : "cascade-item"} style={taskMotion === "idle" ? undefined : { animationDelay: `${tasks.length * 32}ms` }}>
          <AddTaskRow
            placeholder={tasks.length === 0 ? "What matters most here?" : "Add a task"}
            onAdd={(text) => addTask(hat.id, text)}
          />
        </li>
      </ul>
      </div>
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
        <Minus className="size-4" strokeWidth={2.7} />
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
        <Plus className="size-4" strokeWidth={2.7} />
      </button>
    </div>
  );
}

function TaskRow({
  hatId,
  task,
  delay,
  onOpen,
}: {
  hatId: string;
  task: { id: string; text: string; done: boolean };
  delay?: string;
  onOpen: () => void;
}) {
  const toggleTask = useSpread((s) => s.toggleTask);
  return (
    <li className={delay ? "cascade-item" : undefined} style={delay ? { animationDelay: delay } : undefined}>
      <div className="ms-[4.75rem] border-t border-line" />
      <div className="flex min-h-14 items-center ps-12">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? `Mark not done: ${task.text}` : `Mark done: ${task.text}`}
          onClick={() => toggleTask(hatId, task.id)}
          className="grid size-14 shrink-0 place-items-center"
        >
          {task.done ? (
            <SpreadIcon name="icon-check.svg" size={28} />
          ) : (
            <span className="size-7 rounded-full border-2" style={{ borderColor: "var(--tertiary)" }} />
          )}
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

function AddTaskRow({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
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
      <div className="ms-[4.75rem] border-t border-line" />
      <div className="flex min-h-14 items-center ps-12">
        <span className="grid size-14 shrink-0 place-items-center" aria-hidden="true">
          <SpreadIcon name="icon-add.svg" size={20} />
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

function AppSheet({ sheet, setSheet, onPrint }: { sheet: Sheet; setSheet: (sheet: Sheet) => void; onPrint: () => void }) {
  const [open, setOpen] = useState(false);
  const closing = useRef(false);
  if (sheet && !open && !closing.current) setOpen(true);

  function close() {
    if (closing.current || !sheet) return;
    closing.current = true;
    setOpen(false);
    const wait = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 420;
    window.setTimeout(() => {
      closing.current = false;
      setSheet(null);
    }, wait);
  }

  function go(next: Sheet) {
    if (next === null) close();
    else setSheet(next);
  }

  useLockPageScroll(Boolean(sheet));
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim no-print fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content className={cn("sheet no-print fixed inset-x-0 z-50 mx-auto w-full max-w-xl overflow-y-auto bg-elevated px-5 pt-3 pb-safe outline-none", sheet === "more" && "sheet-stack")}>
          {sheet === "more" && <MoreSheet setSheet={go} onPrint={onPrint} />}
          {sheet === "new" && <NewLifeSheet onClose={close} />}
          {sheet === "license" && <LicenseSheet onClose={close} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Grabber() {
  return <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-fill" aria-hidden="true" />;
}

function ProfilesSection({ onSwitched }: { onSwitched: (name: string) => void }) {
  const profiles = useSpread((s) => s.profiles);
  const activeId = useSpread((s) => s.activeId);
  const addProfile = useSpread((s) => s.addProfile);
  const renameProfile = useSpread((s) => s.renameProfile);
  const switchProfile = useSpread((s) => s.switchProfile);
  const removeProfile = useSpread((s) => s.removeProfile);
  const active = profiles.find((profile) => profile.id === activeId);
  const [draft, setDraft] = useState(active?.name ?? "");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const dropping = profiles.find((profile) => profile.id === dropId) ?? null;
  const shown = picked ?? activeId;

  useEffect(() => {
    setDraft(active?.name ?? "");
  }, [active?.id, active?.name]);

  function choose(profile: { id: string; name: string }) {
    if (profile.id === shown || picked) return;
    setPicked(profile.id);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      switchProfile(profile.id);
      onSwitched(profile.name);
    }, reduced ? 0 : 260);
  }

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold">Profiles</h2>
        <span className="text-xs text-tertiary">
          {profiles.length} of {PROFILE_LIMIT}
        </span>
      </div>
      <div className="overflow-hidden rounded-3xl bg-canvas" role="listbox" aria-label="Profiles">
        {profiles.map((profile, index) => {
          const edge = index < profiles.length - 1 || profiles.length < PROFILE_LIMIT;
          const selected = profile.id === shown;
          if (profile.id === activeId && !picked) {
            return (
              <form
                key={profile.id}
                className={cn("flex h-12 items-center", edge && "border-b border-line")}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!renameProfile(profile.id, draft)) setDraft(profile.name);
                }}
              >
                <input
                  value={draft}
                  aria-label="Profile name"
                  autoCapitalize="words"
                  autoCorrect="off"
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => {
                    if (!renameProfile(profile.id, draft)) setDraft(profile.name);
                  }}
                  className="h-full min-w-0 flex-1 bg-transparent px-4 text-base outline-none"
                />
                <Check className={cn("size-4 shrink-0 text-accent", profiles.length < 2 && "mr-4")} aria-hidden="true" />
                {profiles.length > 1 && (
                  <button
                    type="button"
                    className="h-full px-4 text-sm text-danger"
                    aria-label={`Remove ${profile.name}`}
                    onClick={() => setDropId(profile.id)}
                  >
                    Remove
                  </button>
                )}
              </form>
            );
          }
          return (
            <div key={profile.id} className={cn("flex h-12 items-center", selected && "bg-fill", edge && "border-b border-line")}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className={cn("flex h-full min-w-0 flex-1 items-center px-4 text-left text-base", selected && "font-semibold")}
                onClick={() => choose(profile)}
              >
                <span className="flex-1 truncate">{profile.name}</span>
                {selected && <Check className="size-4 text-accent" />}
              </button>
              {profiles.length > 1 && !picked && (
                <button
                  type="button"
                  className="h-full px-4 text-sm text-danger"
                  aria-label={`Remove ${profile.name}`}
                  onClick={() => setDropId(profile.id)}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
        {profiles.length < PROFILE_LIMIT &&
          (adding ? (
            <form
              className="flex h-12 items-center gap-2 px-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!addProfile(name)) return;
                const current = useSpread.getState();
                const who = current.profiles.find((profile) => profile.id === current.activeId)?.name ?? name.trim();
                setName("");
                setAdding(false);
                onSwitched(who);
              }}
            >
              <input
                autoFocus
                value={name}
                placeholder="Name"
                aria-label="New profile"
                autoCapitalize="words"
                autoCorrect="off"
                onChange={(event) => setName(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-tertiary"
              />
              <button type="submit" className="text-sm font-semibold text-accent">
                Add
              </button>
            </form>
          ) : (
            <button type="button" className="flex h-12 w-full items-center gap-3 px-4 text-left text-base text-accent" onClick={() => setAdding(true)}>
              <Plus className="size-5" strokeWidth={2.7} />
              Add profile
            </button>
          ))}
      </div>
      <p className="mt-2 px-1 text-xs text-tertiary">Each profile keeps its own spreads and weeks.</p>
      <AlertDialog.Root open={dropping !== null} onOpenChange={(open) => !open && setDropId(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="scrim no-print fixed inset-0 z-[60] bg-scrim" />
          <AlertDialog.Content className="pop no-print fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-xs -translate-y-1/2 rounded-3xl bg-elevated p-5 outline-none">
            <AlertDialog.Title className="text-center text-base font-semibold">Remove {dropping?.name}?</AlertDialog.Title>
            <AlertDialog.Description className="mt-1 text-center text-sm text-secondary">
              This profile’s spreads and weeks are deleted. The others stay.
            </AlertDialog.Description>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <AlertDialog.Cancel className="h-11 rounded-full bg-fill text-sm font-semibold">Cancel</AlertDialog.Cancel>
              <AlertDialog.Action
                className="h-11 rounded-full bg-danger text-sm font-semibold text-on-danger"
                onClick={() => {
                  if (!dropId || !dropping) return;
                  const wasOpen = dropId === activeId;
                  removeProfile(dropId);
                  setDropId(null);
                  if (!wasOpen) {
                    toast(`Removed ${dropping.name}.`);
                    return;
                  }
                  const current = useSpread.getState();
                  const who = current.profiles.find((profile) => profile.id === current.activeId)?.name;
                  if (who) onSwitched(who);
                }}
              >
                Remove
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

function MoreSheet({ setSheet, onPrint }: { setSheet: (sheet: Sheet) => void; onPrint: () => void }) {
  const license = useSpread((s) => s.license);
  const theme = useSpread((s) => s.theme);
  const setTheme = useSpread((s) => s.setTheme);
  const accent = useSpread((s) => s.accent);
  const setAccent = useSpread((s) => s.setAccent);
  const copyLastWeek = useSpread((s) => s.copyLastWeek);
  const replaceData = useSpread((s) => s.replaceData);
  const data = useSpread((s) => s.data);
  const fileRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<SpreadBackup | null>(null);
  const week = buildWeekDocument(data);

  const actions: { label: string; icon?: "icon-share.svg" | "icon-export.svg" | "icon-print.svg" | "icon-backup.svg" | "icon-restore.svg"; run: () => void }[] = [
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
      icon: "icon-export.svg",
      run: () => {
        const snapshot = week;
        const name = data.currentWeek;
        void import("@/lib/spread/week-docx")
          .then(({ weekDocxBlob }) => weekDocxBlob(snapshot))
          .then((blob) => {
            saveFile(blob, `Spread-${name}.docx`);
            toast("Word document saved.");
            setSheet(null);
          })
          .catch(() => toast("Couldn’t make the Word document."));
      },
    },
    {
      label: "Print / Save PDF",
      icon: "icon-print.svg",
      run: () => {
        onPrint();
        setSheet(null);
      },
    },
    {
      label: "Back Up Spread",
      icon: "icon-backup.svg",
      run: () => {
        saveBackup(data);
        toast("Backup saved.");
        setSheet(null);
      },
    },
    { label: "Restore Spread", icon: "icon-restore.svg", run: () => fileRef.current?.click() },
    { label: "License key", run: () => setSheet("license") },
  ];

  return (
    <>
      <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
        <span />
        <div className="mx-auto h-1 w-9 rounded-full bg-fill" aria-hidden="true" />
        <button
          type="button"
          aria-label="Close"
          onClick={() => setSheet(null)}
          className="grid size-11 place-items-center justify-self-end rounded-full text-secondary"
        >
          <X className="size-5" strokeWidth={2.7} />
        </button>
      </div>
      <Dialog.Title className="text-2xl font-bold tracking-tight">More</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-secondary">
        {license?.plan === "personal" ? "Personal license on this device." : "Trial on this device."}
      </Dialog.Description>
      <ProfilesSection
        onSwitched={(who) => {
          toast(`Switched to ${who}.`);
          setSheet(null);
        }}
      />
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
      <div className="stack-rows mt-4 overflow-hidden rounded-3xl bg-canvas">
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
      <div className="mt-5">
        <Segmented value={theme} onChange={setTheme} />
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto px-1 py-1" role="listbox" aria-label="Accent color">
        {ACCENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={(accent ?? "blue") === item.id}
            aria-label={item.label}
            className="size-8 shrink-0 rounded-full"
            style={{
              backgroundColor: item.color,
              boxShadow: (accent ?? "blue") === item.id ? "0 0 0 2px var(--elevated), 0 0 0 4px var(--ink)" : undefined,
            }}
            onClick={() => setAccent(item.id)}
          />
        ))}
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
        <AlertDialog.Overlay className="scrim no-print fixed inset-0 z-[60] bg-scrim" />
        <AlertDialog.Content className="pop no-print fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-xs -translate-y-1/2 rounded-3xl bg-elevated p-5 outline-none">
          <AlertDialog.Title className="text-center text-base font-semibold">Restore this backup?</AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-center text-sm text-secondary">
            {listed}. {backup?.summary.weeks ?? 0} {backup?.summary.weeks === 1 ? "week" : "weeks"}, {backup?.summary.tasks ?? 0}{" "}
            {backup?.summary.tasks === 1 ? "task" : "tasks"}. {backup?.summary.range}. This replaces this profile’s weeks.
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
  const [rows, setRows] = useState<{ key: number; name: string; hours: number; category: SpreadCategory | null }[]>([
    { key: 1, name: "", hours: 2, category: null },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const ready = rows.some((row) => row.name.trim());

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        for (const row of rows) {
          if (row.name.trim()) addHat(row.name, row.hours, row.category ? { category: row.category } : undefined);
        }
        onClose();
      }}
    >
      <Grabber />
      <Dialog.Title className="text-2xl font-bold tracking-tight">New Spread</Dialog.Title>
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
            <p className="mt-3 text-xs text-secondary">
              Symbol
              {row.category ? ` · ${SPREAD_CATEGORIES.find((item) => item.id === row.category)?.label}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPREAD_CATEGORIES.map((item) => {
                const selected = row.category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={selected}
                    className="grid size-11 place-items-center rounded-full"
                    style={selected ? { boxShadow: "0 0 0 2px var(--ink)" } : undefined}
                    onClick={() =>
                      setRows((current) =>
                        current.map((entry) => (entry.key === row.key ? { ...entry, category: item.id } : entry)),
                      )
                    }
                  >
                    <CategoryBadge category={item.id} color={item.color} size={32} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-4 h-11 text-sm font-semibold text-accent"
        onClick={() => {
          setRows((current) => [...current, { key: nextKey, name: "", hours: 2, category: null }]);
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
        <AlertDialog.Overlay className="scrim no-print fixed inset-0 z-50 bg-scrim" />
        <AlertDialog.Content className="pop no-print fixed inset-x-4 top-1/2 z-50 mx-auto max-w-xs -translate-y-1/2 rounded-3xl bg-elevated p-5 outline-none">
          <AlertDialog.Title className="text-center text-base font-semibold">Replace next week?</AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-center text-sm text-secondary">
            Next week already has tasks or days. Rollover will replace that week. This week stays as it is.
          </AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="h-11 rounded-full bg-fill text-sm font-semibold">Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-semibold text-on-accent"
              onClick={onConfirm}
            >
              <SpreadIcon name="icon-rollover.svg" size={20} className="brightness-0 invert" />
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
        <AlertDialog.Overlay className="scrim no-print fixed inset-0 z-50 bg-scrim" />
        <AlertDialog.Content className="pop no-print fixed inset-x-4 top-1/2 z-50 mx-auto max-w-xs -translate-y-1/2 rounded-3xl bg-elevated p-5 outline-none">
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
