import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArchiveRestore, ArrowRight, Check, ChevronRight, Smartphone, UserRoundX, UsersRound } from "lucide-react";
import { WeekPreview } from "@/spread/components/landing-preview";

// Illustrative landing-page data. None of this reads or writes a visitor's planner.
type Role = { name: string; hours: number; color: string; days: Record<string, number>; task: string };

const DAYS = ["M", "Tu", "W", "Th", "F", "Sa", "Su"] as const;

const roles: Role[] = [
  { name: "Work", hours: 8, color: "#34c759", days: { M: 3, W: 3, F: 2 }, task: "Move the project forward" },
  { name: "Home", hours: 4, color: "#ff9500", days: { Tu: 1, Sa: 2, Su: 1 }, task: "Groceries and a fresh start" },
  { name: "Health", hours: 3, color: "#0a84ff", days: { Tu: 1, Th: 1, Sa: 1 }, task: "Go for a morning run" },
];

/** true once the element has been at least `threshold` visible */
function useSeen<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold });
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/* ---------------------------------------------------------------- How it works */

const steps = [
  { label: "01 / Responsibilities", title: "Start with your life.", body: "Work, school, family, health. Name the responsibilities that deserve a real place in your week." },
  { label: "02 / Hours", title: "Give it some time.", body: "A simple weekly hour bank makes the tradeoffs visible before your calendar fills itself." },
  { label: "03 / Week → Tasks", title: "Make room to do it.", body: "Put those hours on real days. Then add the specific things you want to do with them." },
];
const builderStatus = ["Three parts of your life.", "15 hours, with intention.", "All 15 hours have a place."];

export function HowItWorks({ heading }: { heading: ReactNode }) {
  const [step, setStep] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // the told step is the last one whose top has passed the reading line: the middle of the
    // screen, or lower on phones where the week sits above the steps. Reading positions rather
    // than waiting for crossings means a fast fling can never skip a step.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * (window.innerWidth < 901 ? 0.74 : 0.52);
      let next = 0;
      items.current.forEach((node, index) => {
        if (node && node.getBoundingClientRect().top < line) next = index;
      });
      setStep((current) => (current === next ? current : next));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section id="how" className="site-section site-how">
      {heading}
      <div className="how-body">
        <div className="how-object">
          <WeekBuilder step={step} />
        </div>
        <ol className="how-steps">
          {steps.map((item, index) => (
            <li
              key={item.label}
              ref={(node) => { items.current[index] = node; }}
              data-step={index}
              className={index === step ? "is-active" : index < step ? "is-done" : ""}
            >
              <button type="button" onClick={() => setStep(index)} aria-pressed={index === step}>
                <span>{item.label}</span>
                <h3>{item.title}</h3>
              </button>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WeekBuilder({ step }: { step: number }) {
  return (
    <div className="builder" data-step={step} role="img" aria-label={`A sample week in Spread. ${builderStatus[step]}`}>
      <header className="builder-top">
        <b>This week</b>
        <span>Sep 21 – Sep 27</span>
        <span className="builder-dots" aria-hidden="true">{steps.map((_, index) => <i key={index} className={index <= step ? "is-on" : ""} />)}</span>
      </header>
      <div className="builder-days" aria-hidden="true">
        {DAYS.map((day) => <b key={day}>{day}</b>)}
      </div>
      {roles.map((role, index) => (
        <div className="builder-row" key={role.name} style={{ "--role": role.color, "--r": index } as CSSProperties}>
          <div className="builder-head">
            <i />
            <b>{role.name}</b>
            <span className="builder-hours">{role.hours}<small>h</small></span>
          </div>
          <div className="builder-reveal is-bank">
            <div className="builder-bank">
              {Array.from({ length: 8 }, (_, hour) => <em key={hour} className={hour < role.hours ? "is-set" : ""} style={{ "--h": hour } as CSSProperties} />)}
            </div>
          </div>
          <div className="builder-reveal is-week">
            <div>
              <div className="builder-week">
                {DAYS.map((day, d) => (
                  <span key={day} className={role.days[day] ? "is-set" : ""} style={{ "--d": d } as CSSProperties}>
                    {role.days[day] ? `${role.days[day]}h` : ""}
                  </span>
                ))}
              </div>
              <p className="builder-task"><span aria-hidden="true" />{role.task}</p>
            </div>
          </div>
        </div>
      ))}
      <footer className="builder-status" aria-hidden="true">
        {step === 2 && <Check size={14} />}
        <span key={step}>{builderStatus[step]}</span>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- week band */

export function WeekMetric({ selected }: { selected: number }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.4);
  const total = roles.reduce((sum, role) => sum + role.hours, 0);
  return (
    <div ref={ref} className={`week-metric${seen ? " is-seen" : ""}`}>
      <span className="week-metric-label">Time is the starting point.</span>
      <p className="week-metric-figure"><strong>{total}</strong><span>of 168 hours</span></p>
      <div className="week-metric-bar" aria-hidden="true">
        {roles.map((role, index) => (
          <i
            key={role.name}
            className={index === selected ? "is-selected" : ""}
            style={{ "--role": role.color, "--share": role.hours, "--r": index } as CSSProperties}
          />
        ))}
      </div>
      <ul className="week-metric-legend">
        {roles.map((role, index) => (
          <li key={role.name} className={index === selected ? "is-selected" : ""} style={{ "--role": role.color } as CSSProperties}>
            <i />{role.name}<b>{role.hours}h</b>
          </li>
        ))}
      </ul>
      <p className="week-metric-note">Eight hours for work. Four for home. Three for you. A week you can see—and actually work with.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- philosophy */

const listItems = [
  { task: "Wrap up the weekly report", role: 0 },
  { task: "Groceries and a fresh start", role: 1 },
  { task: "Go for a morning run", role: 2 },
  { task: "Move the project forward", role: 0 },
  { task: "Plan meals for the week", role: 1 },
  { task: "An hour at the gym", role: 2 },
  { task: "Outline the next chapter", role: 0 },
];

export function ListVersusSpread() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.3);
  const [focus, setFocus] = useState<number | null>(null);
  const pick = (index: number | null) => setFocus(index);
  return (
    <div ref={ref} className={`versus${seen ? " is-seen" : ""}${focus !== null ? " has-focus" : ""}`}>
      <figure className="versus-list">
        <figcaption>A to-do list</figcaption>
        <ul>
          {listItems.map((item, index) => (
            <li
              key={item.task}
              className={focus === index ? "is-focus" : ""}
              style={{ "--n": index } as CSSProperties}
              onPointerEnter={(event) => { if (event.pointerType === "mouse") pick(index); }}
              onPointerLeave={(event) => { if (event.pointerType === "mouse") pick(null); }}
              onClick={() => pick(focus === index ? null : index)}
            >
              <span aria-hidden="true" />{item.task}
            </li>
          ))}
        </ul>
        <p>Everything looks equally important.</p>
      </figure>
      <span className="versus-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
      <figure className="versus-spread">
        <figcaption>A spread</figcaption>
        {roles.map((role, r) => (
          <div key={role.name} className="versus-role" style={{ "--role": role.color, "--r": r } as CSSProperties}>
            <header><i /><b>{role.name}</b><span>{role.hours}<small>h</small></span></header>
            <ul>
              {listItems.map((item, index) => item.role === r && (
                <li key={item.task} className={focus === index ? "is-focus" : ""}><span aria-hidden="true" />{item.task}</li>
              ))}
            </ul>
          </div>
        ))}
        <p>Time first. The rest can follow.</p>
      </figure>
    </div>
  );
}

/* ---------------------------------------------------------------- privacy */

const facts = [
  { icon: UserRoundX, title: "No account", body: "Nothing to sign up for." },
  { icon: Smartphone, title: "On this device", body: "Your planning stays here." },
  { icon: UsersRound, title: "Profiles", body: "Up to ten, each with its own weeks." },
  { icon: ArchiveRestore, title: "Backup and restore", body: "A .spread file you keep." },
];

export function PrivacyFacts() {
  return (
    <ul className="privacy-facts">
      {facts.map(({ icon: Icon, title, body }, index) => (
        <li key={title} style={{ "--n": index } as CSSProperties}>
          <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
          <b>{title}</b>
          <span>{body}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- 168 hours */

// where the sample week's fifteen hours sit, by day and hour of the day
const placed: Record<string, [number, number][]> = {
  M: [[0, 9], [0, 10], [0, 11]],
  Tu: [[2, 6], [1, 18]],
  W: [[0, 9], [0, 10], [0, 11]],
  Th: [[2, 18]],
  F: [[0, 9], [0, 10]],
  Sa: [[2, 8], [1, 10], [1, 11]],
  Su: [[1, 17]],
};

export function HourGrid() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.45);
  return (
    <div ref={ref} className={`hour-grid${seen ? " is-seen" : ""}`} role="img" aria-label="A week of 168 hours, with 15 of them set aside for work, home and health.">
      {DAYS.map((day, d) => (
        <div key={day} className="hour-grid-row" style={{ "--d": d } as CSSProperties}>
          <b>{day}</b>
          {Array.from({ length: 24 }, (_, hour) => {
            const hit = placed[day]?.find(([, h]) => h === hour);
            return <i key={hour} className={hit ? "is-set" : ""} style={hit ? ({ "--role": roles[hit[0]].color, "--k": d * 3 + (hour % 3) } as CSSProperties) : undefined} />;
          })}
        </div>
      ))}
      <p className="hour-grid-note"><span>15</span> of 168 hours, given on purpose.</p>
    </div>
  );
}

/** the product band: copy, the hours tile, and the interactive week, sharing one selection */
export function WeekBand() {
  const [selected, setSelected] = useState(0);
  return (
    <section className="site-product-band">
      <div className="band-copy">
        <p className="site-kicker">From intention to a real week</p>
        <h2>Good intentions.<br /><em>Meet real days.</em></h2>
        <p>Spread gives the important parts of your life time first. Tasks come after the time exists.</p>
        <a href="#start" className="site-text-link">Make space for your week <ChevronRight size={16} aria-hidden="true" /></a>
      </div>
      <WeekMetric selected={selected} />
      <div className="band-week"><WeekPreview selected={selected} onSelect={setSelected} /></div>
    </section>
  );
}
