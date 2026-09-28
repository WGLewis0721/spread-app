import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

// Illustrative landing-page data. This never reads or writes a visitor's planner.
type StackCard = { name: string; hours: number; color: string; tasks: string[] };

const cards: StackCard[] = [
  { name: "Work", hours: 8, color: "#34c759", tasks: ["Outline the next chapter", "Move the project forward", "Wrap up the weekly report"] },
  { name: "Home", hours: 4, color: "#ff9500", tasks: ["Tackle the kitchen drawer", "Groceries and a fresh start", "Plan meals for the week"] },
  { name: "Health", hours: 3, color: "#0a84ff", tasks: ["Go for a morning run", "An hour at the gym", "Take the long way outside"] },
  { name: "Family", hours: 3, color: "#af52de", tasks: ["Sunday dinner together", "Call home", "Movie night in"] },
];

// Back-to-front fan, echoing the app icon; then a 2 x 2 week when spread.
const fan = [
  { x: "22%", y: "-30%", r: "13deg" },
  { x: "8%", y: "-10%", r: "4deg" },
  { x: "-6%", y: "10%", r: "-5deg" },
  { x: "-18%", y: "32%", r: "-12deg" },
];
const grid = [
  { x: "calc(-50% - 8px)", y: "calc(-50% - 8px)" },
  { x: "calc(50% + 8px)", y: "calc(-50% - 8px)" },
  { x: "calc(-50% - 8px)", y: "calc(50% + 8px)" },
  { x: "calc(50% + 8px)", y: "calc(50% + 8px)" },
];

const LANDING_MS = 3600;

export function SpreadStack() {
  const stage = useRef<HTMLDivElement>(null);
  const [spread, setSpread] = useState(false);
  const [hover, setHover] = useState(false);
  // each card starts with its first task; orbiting tasks land one at a time
  const [shown, setShown] = useState<number[]>(() => cards.map(() => 1));
  const [flying, setFlying] = useState<number | null>(null);
  const [receiving, setReceiving] = useState<number | null>(null);
  const turn = useRef(0);

  const open = spread || hover;
  const openRef = useRef(open);
  openRef.current = open;

  const land = useCallback(() => {
    const root = stage.current;
    // tasks land on the stack; a spread-out week is left still to be read
    if (!root || openRef.current) return;
    const cardIndex = turn.current % cards.length;
    turn.current += 1;
    // the card lifts out of the stack to receive its task, like pulling an index card from a pile
    setReceiving(cardIndex);
    window.setTimeout(() => {
      const chip = root.querySelector<HTMLElement>(`[data-orbit="${cardIndex}"]`);
      // a landing task always settles into the second row of its card
      const slot = root.querySelector<HTMLElement>(`[data-card="${cardIndex}"] li:nth-child(2)`);
      if (!chip || !slot || openRef.current) {
        setReceiving(null);
        return;
      }
      const from = chip.getBoundingClientRect();
      const to = slot.getBoundingClientRect();
      const base = root.getBoundingClientRect();
      setFlying(cardIndex);
      const ghost = chip.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("data-orbit");
      ghost.className = "orbit-ghost";
      ghost.style.left = `${from.left - base.left}px`;
      ghost.style.top = `${from.top - base.top}px`;
      root.appendChild(ghost);
      const dx = to.left + 6 - from.left;
      const dy = to.top + (to.height - from.height) / 2 - from.top;
      const flight = ghost.animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 30}px) scale(.97)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${dx}px, ${dy}px) scale(.92)`, opacity: 1, offset: 0.9 },
          { transform: `translate(${dx}px, ${dy}px) scale(.9)`, opacity: 0 },
        ],
        { duration: 950, easing: "cubic-bezier(.3,.7,.2,1)" },
      );
      flight.onfinish = () => {
        ghost.remove();
        setShown((prev) => prev.map((count, index) => (index === cardIndex ? count + 1 : count)));
        window.setTimeout(() => setReceiving(null), 700);
        window.setTimeout(() => setFlying(null), 500);
      };
    }, 380);
  }, []);

  useEffect(() => {
    const root = stage.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    let visible = false;
    const schedule = () => {
      window.clearInterval(timer);
      if (visible && !document.hidden) timer = window.setInterval(land, LANDING_MS);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }, { threshold: 0.35 });
    io.observe(root);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      window.clearInterval(timer);
    };
  }, [land]);

  return (
    <div className="spread-stack-wrap">
      <div
        ref={stage}
        className={`spread-stack${open ? " is-spread" : ""}`}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHover(true); }}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") setHover(false); }}
      >
        <div className="orbit" aria-hidden="true">
          {cards.map((card, index) => (
            <span
              key={card.name}
              data-orbit={index}
              className={`orbit-task${flying === index ? " is-away" : ""}`}
              style={{ "--orbit-index": index, "--role": card.color } as CSSProperties}
            >
              <i />
              {card.tasks[shown[index] % card.tasks.length]}
            </span>
          ))}
        </div>

        <button
          type="button"
          className="stack-toggle"
          aria-pressed={open}
          aria-label={open ? "Stack the sample spreads" : "Spread out the sample spreads"}
          onClick={() => { setSpread((value) => !value); setHover(false); }}
        />

        {cards.map((card, index) => {
          const n = shown[index];
          const size = card.tasks.length;
          const tasks = n < 2 ? [card.tasks[0]] : [card.tasks[(n - 2) % size], card.tasks[(n - 1) % size]];
          return (
            <article
              key={card.name}
              data-card={index}
              className={`stack-card${receiving === index && !open ? " is-receiving" : ""}`}
              aria-label={`${card.name}, ${card.hours} hours`}
              style={{
                "--i": index,
                "--fan-x": fan[index].x,
                "--fan-y": fan[index].y,
                "--fan-r": fan[index].r,
                "--grid-x": grid[index].x,
                "--grid-y": grid[index].y,
                "--role": card.color,
              } as CSSProperties}
            >
              <header>
                <i />
                <b>{card.name}</b>
                <span>{card.hours}<small>h</small></span>
              </header>
              <div className="stack-bank" aria-hidden="true">
                {Array.from({ length: 8 }, (_, hour) => <em key={hour} className={hour < card.hours ? "is-set" : ""} />)}
              </div>
              <ul>
                {tasks.map((task) => <li key={task} className="stack-task"><span aria-hidden="true" /><em>{task}</em></li>)}
                {tasks.length < 2 && <li className="stack-task is-empty" aria-hidden="true"><span />&nbsp;</li>}
              </ul>
            </article>
          );
        })}
      </div>
      <p className="stack-hint" aria-hidden="true">
        <span className="stack-hint-hover">Hover to spread your week</span>
        <span className="stack-hint-touch">Tap to spread your week</span>
      </p>
    </div>
  );
}
