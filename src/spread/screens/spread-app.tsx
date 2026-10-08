import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal, flushSync } from "react-dom";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, Check, List, LockKeyhole, Minus, Moon, Plus, Sun, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/cn";
import { formatWeek, parseKey, remainingHours, ROLE_COLORS, SPREAD_CATEGORIES, THEME_KEY, weekDays, weekKey, type Hat, type SpreadCategory } from "@/lib/spread/model";
import { dominantMonth, formatMonth, shiftMonth, type MonthCursor } from "@/lib/spread/month";
import { ACCENTS, consumeArrival, onSaveFailure, saveBackup, useSpread, type ThemeChoice } from "@/lib/spread/store";
import { PROFILE_LIMIT } from "@/lib/spread/profiles";
import { parseAnyBackup, type ParsedBackup } from "@/lib/spread/backup";
import { buildWeekDocument, weekDocumentText, type WeekDocument } from "@/lib/spread/week-document";
import { saveFile, type SaveResult } from "@/lib/spread/save-file";
import { isNativeApp } from "@/lib/spread/native";
import { prepareNativeStorage } from "@/lib/spread/native-mirror";
import { backupAvailable, backupNow, currentBackupStatus, listBackups, readBackupText, refreshBackupStatus, setBackupEnabled, startCloudBackup, useCloudBackup } from "@/lib/spread/cloud-backup";
import type { RemoteBackup } from "@/lib/spread/cloud";
import { WeekPaper } from "@/spread/components/week-paper";
import { SpreadIcon } from "@/spread/components/spread-icon";
import { CategoryBadge } from "@/spread/components/category-badge";
import { TaskSheet } from "@/spread/components/task-sheet";
import { WeeklyView, SpreadBubbleStrip } from "@/spread/components/weekly-view";
import { MonthView } from "@/spread/components/month-view";
import { WeekCrown } from "@/spread/components/week-crown";
import { useBrowserFrame, useLockPageScroll } from "@/spread/components/use-browser-frame";
import { PaperToProduct } from "@/spread/components/landing-preview";
import { SpreadStack } from "@/spread/components/landing-stack";
import { LandingWaitlist } from "@/spread/components/landing-waitlist";
import { HourGrid, HowItWorks, ListVersusSpread, PrivacyFacts, WeekBand } from "@/spread/components/landing-sections";

type Sheet = "more" | "new" | "license" | "icloud" | null;

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
    if (!isNativeApp()) {
      boot();
      return;
    }
    // The installed app restores its storage snapshot (if the system cleared web storage)
    // before the first read. It never waits long and never throws.
    let live = true;
    void prepareNativeStorage().then(() => {
      if (!live) return;
      boot();
      void startCloudBackup();
    });
    return () => {
      live = false;
    };
  }, [boot]);

  useEffect(
    () =>
      onSaveFailure((failure) => {
        toast.error(
          failure === "full"
            ? "Spread couldn’t save. This device is out of storage. Free some space, then back up from More."
            : failure === "newer"
              ? "This planner was saved by a newer version of Spread. Update Spread to make changes."
              : "Spread couldn’t save to this device. Back up from More before closing.",
          { id: "save-failure", duration: 12000 },
        );
      }),
    [],
  );

  return (
    <>
      <Toaster
        position="top-center"
        // Under the status bar and Dynamic Island on the phone; the web keeps the default.
        offset={hydrated && isNativeApp() ? "calc(env(safe-area-inset-top, 0px) + 12px)" : undefined}
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

function useSystemDark() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(prefers-color-scheme: dark)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}

function UnlockScreen() {
  const beginTrialRaw = useSpread((s) => s.beginTrial);
  const unlockRaw = useSpread((s) => s.unlock);
  const theme = useSpread((s) => s.theme);
  const setTheme = useSpread((s) => s.setTheme);
  const systemDark = useSystemDark();
  const dark = theme === "dark" || (theme === "system" && systemDark);
  const profiles = useSpread((s) => s.profiles);
  const activeId = useSpread((s) => s.activeId);
  const switchProfile = useSpread((s) => s.switchProfile);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const known = profiles.length > 0;

  // The site and the planner share one appearance setting. A visitor without a profile keeps
  // their choice in the planner's own theme key; a new profile starts on "system", so carry the
  // choice into it when they begin.
  function chooseTheme(next: "light" | "dark") {
    if (next === (dark ? "dark" : "light")) return;
    const run = () => {
      setTheme(next);
      if (!known) {
        try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode: this visit only */ }
      }
    };
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => flushSync(run));
    else run();
  }
  function keepTheme() {
    if (!known && theme !== "system") setTheme(theme);
  }
  function beginTrial(nameForProfile?: string) {
    beginTrialRaw(nameForProfile);
    keepTheme();
  }
  function unlock(key: string, nameForProfile?: string) {
    const ok = unlockRaw(key, nameForProfile);
    if (ok) keepTheme();
    return ok;
  }
  const activeName = profiles.find((profile) => profile.id === activeId)?.name ?? profiles[0]?.name ?? "Me";

  function unlockWithKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unlock(code, known ? undefined : name)) setError("That key isn’t valid.");
  }

  return (
    <main className="spread-site min-h-dvh" data-site-theme={dark ? "dark" : "light"}>
      <nav className="site-nav" aria-label="Main navigation">
        <a className="site-brand" href="#top" aria-label="Spread home">
          <BrandMark size={36} />
          <span>Spread</span>
        </a>
        <div className="site-nav-links">
          <a href="#how">How it works</a>
          <a href="#story">Story</a>
          <div className="site-theme" role="group" aria-label="Appearance">
            <button type="button" aria-pressed={!dark} aria-label="Light mode" onClick={() => chooseTheme("light")}><Sun size={15} strokeWidth={1.8} aria-hidden="true" /></button>
            <button type="button" aria-pressed={dark} aria-label="Dark mode" onClick={() => chooseTheme("dark")}><Moon size={15} strokeWidth={1.8} aria-hidden="true" /></button>
          </div>
          <a href="#start" className="site-nav-cta">Open Spread</a>
        </div>
      </nav>

      <section id="top" className="site-hero">
        <div className="site-hero-copy">
          <p className="site-kicker">A weekly planner for real life</p>
          <h1><span className="site-line"><span>A little more room</span></span><span className="site-line"><span>for <em>what matters.</em></span></span></h1>
          <p className="site-lede">Work. Home. Yourself. Give every part of your life a place in your week—with a planner that starts with your time.</p>
          <div className="site-hero-actions">
            <a href="#start" className="site-button">Start this week <ChevronRight size={17} aria-hidden="true" /></a>
            <a href="#how" className="site-text-link">See how it works <span aria-hidden="true">↗</span></a>
          </div>
          <p className="site-hero-note">No account. On your device. At your pace.</p>
        </div>

        <SpreadStack />
        <div className="site-principle"><span className="site-principle-intro">A simple change in order.</span><p><span>Responsibilities</span><span aria-hidden="true">→</span><span>Hours</span><span aria-hidden="true">→</span><span>Week</span><span aria-hidden="true">→</span><span>Tasks</span></p></div>
      </section>

      <HowItWorks
        heading={
          <div className="site-section-heading">
            <p className="site-kicker">How Spread works</p>
            <h2>A full life.<br /><em>A considered week.</em></h2>
            <p>Start with what matters. Decide how much time it gets. Then decide what you will do with that time.</p>
          </div>
        }
      />

      <WeekBand />

      <section id="story" className="site-story">
        <div className="site-story-lead">
          <p className="site-kicker">An ordinary beginning</p>
          <h2>Before Spread was an app, it was a piece of paper.</h2>
          <p>Spread grew out of a season of life when there never seemed to be enough hours for everything that mattered. It’s the tool I wish I’d had back then.</p>
        </div>
        <div className="site-story-object"><PaperToProduct /></div>
        <div className="site-story-detail"><blockquote>“On Sundays, I would sit down, look at everything I was responsible for, and set aside an hour or two for each responsibility.”</blockquote><p className="site-story-attribution">The Sunday ritual that became Spread</p><details className="site-story-more">
          <summary>Read the full story</summary>
          <div>
            <p>While I was working toward my bachelor’s degree in computer science, I had a lot competing for my time. I was working, holding leadership positions in multiple organizations, founding an organization of my own, keeping up with school, and eventually supporting a family.</p>
            <p>And I wasn’t alone. A lot of my peers were wearing just as many hats. We were always saying we had “a lot going on” or that we were “spread too thin.”</p>
            <p>On Sundays, I would sit down, look at everything I was responsible for, and set aside an hour or two for each responsibility during the week. I’d draw boxes for those blocks of time, write down what I wanted to accomplish, and list the specific tasks that would get me there.</p>
            <p>Years later, while researching Spread, I realized that the system I had built for myself shared a lot with Stephen Covey’s approach to weekly planning and the idea of time boxing.</p>
          </div>
        </details></div>
      </section>

      <section className="site-philosophy">
        <p className="site-kicker">The idea behind Spread</p>
        <h2>Your time should follow what matters.</h2>
        <p>A to-do list can make everything look equally important. Spread starts one step earlier: what needs your attention this week, and how much time are you actually willing to give it?</p>
        <p>That is close to Stephen Covey’s role-based weekly planning: plan around the important parts of your life instead of only reacting to the next task. Spread combines that idea with time boxing—simply setting aside a specific amount of time for something.</p>
        <ListVersusSpread />
      </section>

      <section className="site-privacy">
        <div><span className="privacy-mark"><LockKeyhole size={25} strokeWidth={1.5} aria-hidden="true" /></span></div>
        <div><p className="site-kicker">Private by design</p><h2>Your life doesn’t need another account.</h2><p>No account is required. Your planning stays on this device. Profiles, backup and restore help you keep different parts of life separate without turning Spread into another cloud workspace.</p></div>
        <PrivacyFacts />
      </section>

      <section id="start" className="site-start">
        <div className="site-start-copy">
          <p className="site-kicker">Start where you are</p>
          <h2>You have 168 hours.<br /><em>Make them yours.</em></h2>
          <p>Try the planner right here. No account required.</p>
          <HourGrid />
        </div>
        <div className="site-start-card">
          {known ? (
            <>
              <p className="site-card-label">Continue as</p>
              {profiles.length > 1 ? (
                <div className="site-profile-list">
                  {profiles.map((profile) => <button key={profile.id} type="button" onClick={() => switchProfile(profile.id)} className={profile.id === activeId ? "is-active" : ""}>{profile.name}{profile.id === activeId && <Check size={16} />}</button>)}
                </div>
              ) : <p className="site-active-name">{activeName}</p>}
              <button type="button" onClick={() => beginTrial()} className="site-button site-button-full">Continue to this week</button>
            </>
          ) : (
            <>
              <label className="site-card-label" htmlFor="trial-name">What should we call you?</label>
              <input id="trial-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="site-input" />
              <button type="button" onClick={() => beginTrial(name)} className="site-button site-button-full">Begin this week</button>
            </>
          )}
          <div className="site-key-divider"><span>or use a friend test key</span></div>
          <form onSubmit={unlockWithKey} className="site-key-form">
            <input value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} placeholder="SPR-XXXX-XXXX" aria-label="License key" className="site-input" />
            <button type="submit">Unlock</button>
          </form>
          {error && <p className="site-error" role="alert">{error}</p>}
          <p className="site-demo-key">Friend test key: SPR-DEMO-2026</p>
        </div>
      </section>

      <LandingWaitlist />
      <footer className="site-footer"><a href="#top" className="site-brand"><BrandMark size={28} /><span>Spread</span></a><span>A little room for what matters.</span><span>Made by Gray Matter</span></footer>
    </main>
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

const MORPH_EASE = "420ms cubic-bezier(0.32, 0.72, 0, 1)";
const WEEK_LINES = [
  { x: 3, y: 3, w: 18, h: 2.4, rx: 1.2 },
  { x: 3, y: 8.2, w: 18, h: 2.4, rx: 1.2 },
  { x: 3, y: 13.4, w: 18, h: 2.4, rx: 1.2 },
  { x: 3, y: 18.6, w: 18, h: 2.4, rx: 1.2 },
];
const MONTH_BOXES = [
  { x: 3, y: 3, w: 7.2, h: 7.2, rx: 1.8 },
  { x: 13.8, y: 3, w: 7.2, h: 7.2, rx: 1.8 },
  { x: 3, y: 13.8, w: 7.2, h: 7.2, rx: 1.8 },
  { x: 13.8, y: 13.8, w: 7.2, h: 7.2, rx: 1.8 },
];

function ViewMorphIcon({ boxes }: { boxes: boolean }) {
  const shapes = boxes ? MONTH_BOXES : WEEK_LINES;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="text-accent">
      {shapes.map((shape, index) => (
        <rect
          key={index}
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
          style={{
            x: shape.x,
            y: shape.y,
            width: shape.w,
            height: shape.h,
            rx: shape.rx,
            fillOpacity: boxes ? 0 : 1,
            strokeWidth: boxes ? 2.4 : 0,
            transition: `x ${MORPH_EASE}, y ${MORPH_EASE}, width ${MORPH_EASE}, height ${MORPH_EASE}, rx ${MORPH_EASE}, fill-opacity ${MORPH_EASE}, stroke-width ${MORPH_EASE}`,
          }}
        />
      ))}
    </svg>
  );
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

function BrandMark({ size = 34 }: { size?: number }) {
  return <SpreadIcon name="app-icon-spread-cards.svg" size={size} />;
}

function WeekScreen() {
  const data = useSpread((s) => s.data);
  const moveWeek = useSpread((s) => s.moveWeek);
  const openWeek = useSpread((s) => s.openWeek);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editing, setEditing] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [view, setView] = useState<"spread" | "week">("spread");
  const [plane, setPlane] = useState<"week" | "month">("week");
  const [motion, setMotion] = useState<"to-month" | "to-week" | null>(null);
  const [monthCursor, setMonthCursor] = useState<MonthCursor>(() => dominantMonth(weekKey()));
  const [monthDir, setMonthDir] = useState<-1 | 1 | 0>(0);
  const [monthShift, setMonthShift] = useState(0);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerH, setHeaderH] = useState(0);
  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const measure = () => setHeaderH(Math.ceil(node.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
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
  const now = new Date();
  const onThisMonth = monthCursor.year === now.getFullYear() && monthCursor.month === now.getMonth();
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
  const motionTimer = useRef<number | null>(null);
  const goMonth = useCallback((direction: -1 | 1) => {
    setMonthDir(direction);
    setMonthCursor((cursor) => shiftMonth(cursor.year, cursor.month, direction));
  }, []);
  const monthChrome = view === "week" && ((plane === "month" && motion !== "to-week") || motion === "to-month");
  const showWeekLayer = plane === "week" || motion !== null;
  const showMonthLayer = plane === "month" || motion !== null;

  function runMotion(next: "to-month" | "to-week") {
    if (motionTimer.current) window.clearTimeout(motionTimer.current);
    setMotion(next);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    motionTimer.current = window.setTimeout(() => {
      setPlane(next === "to-month" ? "month" : "week");
      setMotion(null);
      motionTimer.current = null;
    }, reduced ? 0 : 420);
  }

  function openMonth() {
    if (motion) return;
    setPicked(null);
    setMonthCursor(dominantMonth(data.currentWeek));
    setMonthDir(0);
    setMonthShift(0);
    runMotion("to-month");
  }

  function closeMonth() {
    if (motion || plane !== "month") return;
    setMonthShift(0);
    runMotion("to-week");
  }

  function pickDay(date: string) {
    if (motion) return;
    openWeek(weekKey(parseKey(date)));
    setFocusDate(date);
    setMonthShift(0);
    runMotion("to-week");
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || sheet || motion) return;
      if (monthChrome) {
        if (event.key === "ArrowLeft") goMonth(-1);
        if (event.key === "ArrowRight") goMonth(1);
        return;
      }
      if (event.key === "ArrowLeft") goWeek(-1);
      if (event.key === "ArrowRight") goWeek(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goWeek, goMonth, monthChrome, motion, sheet]);

  const removing = data.hats.find((hat) => hat.id === removeId) ?? null;

  useEffect(() => {
    if (dir === 0) return;
    const id = window.setTimeout(() => setDir(0), 420);
    return () => window.clearTimeout(id);
  }, [dir, data.currentWeek]);

  useEffect(() => {
    if (monthDir === 0) return;
    const id = window.setTimeout(() => setMonthDir(0), 420);
    return () => window.clearTimeout(id);
  }, [monthDir, monthCursor.year, monthCursor.month]);

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
    if (motionTimer.current) window.clearTimeout(motionTimer.current);
    motionTimer.current = null;
    setPlane("week");
    setMotion(null);
    setProfilePlay(true);
    const id = window.setTimeout(() => setProfilePlay(false), 460);
    return () => window.clearTimeout(id);
  }, [activeId]);

  function goHome() {
    setEditing(false);
    setOpenTask(null);
    if (motionTimer.current) window.clearTimeout(motionTimer.current);
    motionTimer.current = null;
    setPlane("week");
    setMotion(null);
    setPicked(null);
    if (view === "spread") return;
    setViewPlay(true);
    setView("spread");
    window.setTimeout(() => setViewPlay(false), 380);
  }

  return (
    <div className="min-h-dvh">
      {printDoc && typeof document !== "undefined" && createPortal(<WeekPaper doc={printDoc} />, document.body)}
      <div className="mx-auto w-full max-w-xl" style={{ "--spread-header": `${headerH}px` } as CSSProperties}>
        <header ref={headerRef} className="bar-fade no-print sticky top-0 z-20 px-4 pt-safe pb-3">
          <div className="mb-3 flex items-center gap-3">
            <button type="button" className="brand" aria-label="Spread, home" onClick={goHome}>
              <BrandMark size={34} />
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
            title={monthChrome ? formatMonth(monthCursor.year, monthCursor.month) : isCurrent ? "This week" : range}
            detail={monthChrome ? (onThisMonth ? undefined : "Back to this month") : isCurrent ? range : "Back to this week"}
            onDetail={
              monthChrome
                ? onThisMonth
                  ? undefined
                  : () => {
                      const next = now.getFullYear() * 12 + now.getMonth();
                      const current = monthCursor.year * 12 + monthCursor.month;
                      setMonthDir(next >= current ? 1 : -1);
                      setMonthCursor({ year: now.getFullYear(), month: now.getMonth() });
                    }
                : isCurrent
                  ? undefined
                  : () => {
                      const today = weekKey();
                      setDir(today > data.currentWeek ? 1 : -1);
                      moveWeek("today");
                    }
            }
            turn={monthChrome ? 0 : gesture}
            unit={monthChrome ? "month" : "week"}
            onMove={monthChrome ? goMonth : goWeek}
            onShift={monthChrome ? setMonthShift : setShift}
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
                  if (key === "spread") {
                    if (motionTimer.current) window.clearTimeout(motionTimer.current);
                    motionTimer.current = null;
                    setPlane("week");
                    setMotion(null);
                    setPicked(null);
                  }
                  if (key === "week") setEditing(false);
                  setViewPlay(true);
                  setView(key);
                  window.setTimeout(() => setViewPlay(false), 380);
                }}
              >
                <span className={view === key ? "text-accent" : "text-secondary"}>
                  <SpreadIcon name={icon} size={24} className="text-inherit" />
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
            <div className="layer-stack">
              {showWeekLayer && (
                <div className={motion === "to-month" ? "layer-out" : motion === "to-week" ? "layer-in" : undefined}>
                  <div key={data.currentWeek} className={profilePlay ? "cascade" : dir !== 0 || viewPlay ? "week-seq" : undefined} style={profilePlay ? undefined : dir !== 0 ? weekFrom(dir) : viewPlay ? weekFrom(1) : shift !== 0 ? followStyle(shift) : undefined}>
                    <div className={profilePlay ? "cascade-item" : undefined}>
                      <WeeklyView
                        onTurn={setGesture}
                        onCommit={goWeek}
                        focusDate={focusDate}
                        onFocused={() => setFocusDate(null)}
                        selectedId={picked}
                        onSelected={setPicked}
                      />
                    </div>
                  </div>
                </div>
              )}
              {showMonthLayer && (
                <div className={motion === "to-month" ? "layer-in" : motion === "to-week" ? "layer-out" : undefined}>
                  <SpreadBubbleStrip
                    hats={data.hats}
                    hoursFor={(id) => {
                      const week = data.weeks[data.currentWeek];
                      const bank = week?.boxes.find((box) => box.hatId === id)?.hours ?? data.hats.find((hat) => hat.id === id)?.defaultHours ?? 0;
                      return remainingHours(bank, week?.allocations ?? [], id);
                    }}
                  />
                  <div
                    key={`${monthCursor.year}-${monthCursor.month}`}
                    className={monthDir !== 0 ? "week-seq" : undefined}
                    style={monthDir !== 0 ? weekFrom(monthDir) : followStyle(monthShift)}
                  >
                    <div className="week-seq-item">
                      <MonthView year={monthCursor.year} month={monthCursor.month} data={data} onPick={pickDay} />
                    </div>
                  </div>
                </div>
              )}
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
        <div className={cn("glass pointer-events-auto flex items-center rounded-full p-1.5", view === "week" ? "" : "gap-1")}>
          {view === "week" && !monthChrome && picked && (
            <button
              type="button"
              className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"
              onClick={() => setPicked(null)}
            >
              Done
            </button>
          )}
          {view === "week" && !monthChrome && picked && <span className="mx-1 h-6 w-px bg-[var(--glass-line)]" aria-hidden="true" />}
          {view === "week" && (
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full active:opacity-70"
              aria-label={monthChrome ? "Week" : "Month"}
              onClick={() => (monthChrome ? closeMonth() : openMonth())}
            >
              <ViewMorphIcon boxes={!monthChrome} />
            </button>
          )}
          {view === "week" && <span className="mx-1 h-6 w-px bg-[var(--glass-line)]" aria-hidden="true" />}
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
        <SpreadIcon name="icon-rollover.svg" size={24} />
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
            <SpreadIcon name="icon-palette.svg" size={24} />
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
          <SpreadIcon name="icon-add.svg" size={24} />
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
          {sheet === "icloud" && <ICloudSheet onBack={() => go("more")} />}
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

/** Apply a confirmed restore. Returns what to tell the person and whether the sheet can close. */
function applyRestore(backup: ParsedBackup): { ok: boolean; message: string } {
  const state = useSpread.getState();
  if (backup.kind === "full") {
    const result = state.restoreAsNew(backup.payload);
    if (!result.ok) {
      const missing = result.reason === "no-room" ? result.needed - result.free : 0;
      return {
        ok: false,
        message:
          result.reason === "no-room"
            ? `Not enough room. Remove ${missing} profile${missing === 1 ? "" : "s"} first, then try again.`
            : "Couldn’t add the profiles. Nothing was changed.",
      };
    }
    return { ok: true, message: result.added === 1 ? "Profile added." : `${result.added} profiles added.` };
  }
  state.replaceData(backup.data);
  return { ok: true, message: "Backup restored." };
}

function MoreSheet({ setSheet, onPrint }: { setSheet: (sheet: Sheet) => void; onPrint: () => void }) {
  const license = useSpread((s) => s.license);
  const theme = useSpread((s) => s.theme);
  const setTheme = useSpread((s) => s.setTheme);
  const accent = useSpread((s) => s.accent);
  const setAccent = useSpread((s) => s.setAccent);
  const copyLastWeek = useSpread((s) => s.copyLastWeek);
  const data = useSpread((s) => s.data);
  const fileRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<ParsedBackup | null>(null);
  const week = buildWeekDocument(data);

  const native = isNativeApp();
  // A file leaves the app through the share sheet on the phone and through a download on the web.
  const finished = (result: SaveResult, done: string) => {
    if (result === "saved") {
      toast(done);
      setSheet(null);
    } else if (result === "failed") {
      toast("Couldn’t export the file. Try again.");
    }
  };

  const allActions: { label: string; icon?: "icon-share.svg" | "icon-export.svg" | "icon-print.svg" | "icon-backup.svg" | "icon-restore.svg"; run: () => void }[] = [
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
          .then((blob) => saveFile(blob, `Spread-${name}.docx`))
          .then((result) => finished(result, native ? "Word document exported." : "Word document saved."))
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
        void saveBackup(data).then((result) => finished(result, native ? "Backup exported." : "Backup saved."));
      },
    },
    { label: "Restore Spread", icon: "icon-restore.svg", run: () => fileRef.current?.click() },
    ...(backupAvailable() ? [{ label: "iCloud Backup", run: () => setSheet("icloud") }] : []),
    { label: "License key", run: () => setSheet("license") },
  ];
  // WKWebView can't print, and the installed app has no license step.
  const actions = native ? allActions.filter((action) => action.label !== "Print / Save PDF" && action.label !== "License key") : allActions;

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
        {native ? (backupAvailable() ? "Saved on this device." : "Everything stays on this device.") : license?.plan === "personal" ? "Personal license on this device." : "Trial on this device."}
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
        accept={native ? undefined : ".spread,.json,application/json"}
        className="sr-only"
        aria-label="Choose a Spread backup"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void file
            .text()
            .then((text) => parseAnyBackup(text))
            .then((next) => {
              if (!next) {
                toast("That file isn’t a Spread backup, or it is damaged.");
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
            {action.icon ? <SpreadIcon name={action.icon} size={24} /> : null}
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
      {native ? null : (
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
      )}
      <RestoreDialog
        backup={backup}
        onClose={() => setBackup(null)}
        onConfirm={() => {
          if (!backup) return;
          const outcome = applyRestore(backup);
          setBackup(null);
          if (outcome.ok) setSheet(null);
          toast(outcome.message);
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
  backup: ParsedBackup | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (backup?.kind === "full") return <RestoreFullDialog backup={backup} onClose={onClose} onConfirm={onConfirm} />;
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ICloudSheet({ onBack }: { onBack: () => void }) {
  const state = useCloudBackup();
  const status = currentBackupStatus(state);
  const [backups, setBackups] = useState<RemoteBackup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<ParsedBackup | null>(null);

  useEffect(() => {
    void refreshBackupStatus();
  }, []);

  async function openList() {
    setBusy(true);
    try {
      setBackups(await listBackups());
    } catch {
      toast("Couldn’t reach iCloud. Try again.");
    }
    setBusy(false);
  }

  async function choose(item: RemoteBackup) {
    setBusy(true);
    try {
      const text = await readBackupText(item.deviceId, item.name);
      const parsed = await parseAnyBackup(text);
      if (!parsed) toast("That backup is damaged, so it was not opened.");
      else setPicked(parsed);
    } catch {
      toast("Couldn’t open that backup. If it is still downloading from iCloud, try again in a moment.");
    }
    setBusy(false);
  }

  const rows = backups ?? [];
  return (
    <>
      <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
        <button type="button" aria-label="Back" onClick={onBack} className="grid size-11 place-items-center rounded-full text-secondary">
          <ChevronRight className="size-5 rotate-180" strokeWidth={2.7} />
        </button>
        <div className="mx-auto h-1 w-9 rounded-full bg-fill" aria-hidden="true" />
        <span />
      </div>
      <Dialog.Title className="text-2xl font-bold tracking-tight">iCloud Backup</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-secondary">
        Spread keeps a copy of everything in your own iCloud. It is never sent anywhere else.
      </Dialog.Description>
      <div className="mt-4 rounded-3xl bg-canvas px-4 py-3" role="status" aria-live="polite">
        <p className={cn("text-base font-semibold", status.tone === "problem" && "text-danger")}>{status.title}</p>
        {status.detail ? <p className="mt-0.5 text-sm text-secondary">{status.detail}</p> : null}
      </div>
      <div className="stack-rows mt-4 overflow-hidden rounded-3xl bg-canvas">
        <button
          type="button"
          role="switch"
          aria-checked={state.enabled}
          className="flex h-12 w-full items-center justify-between border-b border-line px-4 text-left text-base active:bg-fill"
          onClick={() => setBackupEnabled(!state.enabled)}
        >
          Back up automatically
          <span className={cn("flex h-7 w-12 items-center rounded-full p-0.5 transition-colors", state.enabled ? "bg-accent" : "bg-fill")} aria-hidden="true">
            <span className="block size-6 rounded-full bg-white transition-transform" style={{ transform: state.enabled ? "translateX(20px)" : "none" }} />
          </span>
        </button>
        <button
          type="button"
          disabled={!state.enabled || state.runner.busy}
          className="flex h-12 w-full items-center border-b border-line px-4 text-left text-base active:bg-fill disabled:text-tertiary"
          onClick={() => void backupNow().then(() => refreshBackupStatus())}
        >
          Back up now
        </button>
        <button type="button" disabled={busy} className="flex h-12 w-full items-center px-4 text-left text-base active:bg-fill disabled:text-tertiary" onClick={() => void openList()}>
          Restore from iCloud
        </button>
      </div>
      {backups !== null && (
        <div className="mt-4 overflow-hidden rounded-3xl bg-canvas" role="list" aria-label="Backups in iCloud">
          {rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-secondary">No backups found yet.</p>
          ) : (
            rows.slice(0, 30).map((item) => (
              <button
                key={`${item.deviceId}/${item.name}`}
                type="button"
                role="listitem"
                disabled={busy}
                className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-left active:bg-fill last:border-b-0"
                onClick={() => void choose(item)}
              >
                <span>
                  <span className="block text-base">
                    {new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                  <span className="block text-xs text-secondary">
                    {item.own ? "This device" : "Another device"}
                    {item.pin ? ` · saved before ${item.pin.replace(/^pre-/, "").replace(/-/g, " ")}` : ""} · {formatBytes(item.bytes)}
                    {item.downloaded ? "" : " · in iCloud"}
                  </span>
                </span>
                <ChevronRight className="size-4 text-tertiary" strokeWidth={2.7} />
              </button>
            ))
          )}
        </div>
      )}
      <RestoreDialog
        backup={picked}
        onClose={() => setPicked(null)}
        onConfirm={() => {
          if (!picked) return;
          const outcome = applyRestore(picked);
          setPicked(null);
          toast(outcome.message);
          if (outcome.ok) onBack();
        }}
      />
    </>
  );
}

function RestoreFullDialog({
  backup,
  onClose,
  onConfirm,
}: {
  backup: Extract<ParsedBackup, { kind: "full" }>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const names = backup.summary.profiles.map((item) => item.name);
  const listed = names.length <= 3 ? names.join(", ") : `${names.slice(0, 2).join(", ")}, and ${names.length - 2} more`;
  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="scrim no-print fixed inset-0 z-[60] bg-scrim" />
        <AlertDialog.Content className="pop no-print fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-xs -translate-y-1/2 rounded-3xl bg-elevated p-5 outline-none">
          <AlertDialog.Title className="text-center text-base font-semibold">Add these profiles?</AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-center text-sm text-secondary">
            {listed}. {backup.summary.weeks} {backup.summary.weeks === 1 ? "week" : "weeks"}, {backup.summary.tasks}{" "}
            {backup.summary.tasks === 1 ? "task" : "tasks"}. Nothing on this device changes. Each profile is added with “restored” in its name.
          </AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="h-11 rounded-full bg-fill text-sm font-semibold">Cancel</AlertDialog.Cancel>
            <AlertDialog.Action className="h-11 rounded-full bg-accent text-sm font-semibold text-on-accent" onClick={onConfirm}>
              Add
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
              <SpreadIcon name="icon-rollover.svg" size={24} className="brightness-0 invert" />
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
            <SpreadIcon name="icon-trash.svg" size={24} />
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
