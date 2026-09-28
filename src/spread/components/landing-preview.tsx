import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { SpreadIcon } from "@/spread/components/spread-icon";

// Illustrative landing-page data. This never reads or writes a visitor's planner.
const examples = [
  {
    name: "Work",
    hours: 8,
    color: "#34c759",
    note: "Make progress on the work that matters.",
    days: [
      { day: "Friday", date: "09/25", hours: 2, task: "Wrap up the weekly report" },
      { day: "Wednesday", date: "09/23", hours: 3, task: "Move the project forward" },
      { day: "Monday", date: "09/21", hours: 3, task: "Outline the next chapter" },
    ],
  },
  {
    name: "Home",
    hours: 4,
    color: "#ff9500",
    note: "A little time for the place you come back to.",
    days: [
      { day: "Sunday", date: "09/27", hours: 1, task: "Plan meals for the week" },
      { day: "Saturday", date: "09/26", hours: 2, task: "Groceries and a fresh start" },
      { day: "Tuesday", date: "09/22", hours: 1, task: "Tackle the kitchen drawer" },
    ],
  },
  {
    name: "Health",
    hours: 3,
    color: "#0a84ff",
    note: "Make room to take care of yourself, too.",
    days: [
      { day: "Saturday", date: "09/26", hours: 1, task: "Take the long way outside" },
      { day: "Thursday", date: "09/24", hours: 1, task: "An hour at the gym" },
      { day: "Tuesday", date: "09/22", hours: 1, task: "Go for a morning run" },
    ],
  },
];

export function PaperToProduct() {
  const root = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const travel = Math.max(1, window.innerHeight + rect.height);
      const next = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / travel));
      setProgress(next);
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

  const paperShift = Math.max(0, progress - .18) * -34;
  const productShift = Math.max(0, progress - .12) * -22;
  return (
    <div
      ref={root}
      className="paper-to-product"
      style={{ "--hero-progress": progress, "--paper-shift": `${paperShift}px`, "--product-shift": `${productShift}px` } as CSSProperties}
      aria-label="The handwritten Sunday plan, translated into Spread"
    >
      <div className="paper-plan">
        <p className="paper-note">A quiet Sunday. A fresh page.</p>
        <p className="paper-title">What matters<br /> this week?</p>
        {examples.map((item, index) => (
          <div className="paper-role" key={item.name} style={{ "--role-index": index } as CSSProperties}>
            <span>{item.name}</span><b>{item.hours} hrs</b>
          </div>
        ))}
        <div className="paper-days">{["M","Tu","W","Th","F","Sa","Su"].map((day) => <span key={day}>{day}</span>)}</div>
        <p className="paper-task">Time first. The rest can follow.</p>
      </div>
      <div className="hero-transfer-lines" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="product-plan">
        <div className="mini-brand"><SpreadIcon name="app-icon-spread-cards.svg" size={32} /><span>Spread</span><span className="preview-label">A sample week</span></div>
        <div className="mini-crown"><ChevronLeft size={14} /><span>Sep 21 – Sep 27</span><ChevronRight size={14} /></div>
        <div className="mini-toggle"><b>Spread</b><span>Week</span></div>
        <div className="mini-section-label"><span>Your responsibilities</span><span>Hours</span></div>
        {examples.map((item, index) => (
          <div className="mini-role" key={item.name} style={{ "--role-index": index } as CSSProperties}>
            <i style={{ background: item.color }} /><span>{item.name}</span><b>{item.hours}<small>h</small></b>
          </div>
        ))}
        <div className="mini-summary"><span>Three parts of your life.</span><strong>15 hours, with intention.</strong></div>
      </div>
      <div className="hero-object-caption"><span>Born on paper.</span><span>Made for real life.</span></div>
    </div>
  );
}

export function WeekPreview() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  return (
    <div className="week-preview">
      <div
        className="week-preview-controls"
        role="group"
        aria-label="Explore a sample responsibility"
      >
        {examples.map((item, index) => (
          <button
            type="button"
            key={item.name}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            <i style={{ background: item.color }} />
            {item.name}
            <span>{item.hours}h</span>
          </button>
        ))}
      </div>
      <p className="week-preview-hint">
        Choose a responsibility. See where its hours go.
        <ArrowDown size={14} aria-hidden="true" />
      </p>
      <div className="week-wireframe" aria-live="polite" aria-atomic="true">
        <div className="week-wire-heading">
          <span>Week</span>
          <span>Sample plan</span>
        </div>
        <div className="mini-crown">
          <ChevronLeft size={14} />
          <span>Sep 21 – Sep 27</span>
          <ChevronRight size={14} />
        </div>
        <div className="week-preview-days" key={example.name}>
          {example.days.map((day) => (
            <div className="week-wire-day" key={day.day}>
              <div className="week-day-heading">
                <b>{day.day}</b>
                <span>{day.date}</span>
              </div>
              <div className="week-allocation">
                <i style={{ background: example.color }} />
                <b>{example.name}</b>
                <span>{day.hours}h</span>
              </div>
              <p>
                <span className="preview-checkbox" aria-hidden="true" />
                {day.task}
              </p>
            </div>
          ))}
        </div>
        <div className="week-preview-total">
          <Check size={14} aria-hidden="true" />
          <span>All {example.hours} hours have a place.</span>
        </div>
      </div>
      <p className="week-preview-note">{example.note}</p>
    </div>
  );
}
