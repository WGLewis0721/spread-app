import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

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

const LANDING_MS = 3800;
const ORBIT_SECONDS = 42;
const SETTLE_MS = 820;


type Box = { left: number; top: number; right: number; bottom: number };
// front: how far down the orbit a task must be before it passes in front of the cards
type Orbit = { cx: number; cy: number; rx: number; ry: number; front: number };

const useClientLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

function overlaps(a: Box, b: Box) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function SpreadStack() {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const slots = useRef<(HTMLSpanElement | null)[]>([]);

  const [spread, setSpread] = useState(false);
  const [hover, setHover] = useState(false);
  // each card starts with its first task; tasks land one at a time
  const [shown, setShown] = useState<number[]>(() => cards.map(() => 1));
  const [receiving, setReceiving] = useState<number | null>(null);
  const [placed, setPlaced] = useState<boolean[]>(() => cards.map(() => false));
  const [target, setTarget] = useState<{ index: number; ok: boolean } | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const open = spread || hover;
  const openRef = useRef(open);
  openRef.current = open;
  const placedRef = useRef(placed);
  placedRef.current = placed;

  const orbit = useRef<Orbit | null>(null);
  const clock = useRef(0);
  const orbiting = useRef(false);
  const dragging = useRef<number | null>(null);
  const landing = useRef<number | null>(null);
  const reduced = useRef(false);
  const mounted = useRef(false);

  const relative = useCallback((rect: DOMRect): Box => {
    const base = wrap.current!.getBoundingClientRect();
    return { left: rect.left - base.left, top: rect.top - base.top, right: rect.right - base.left, bottom: rect.bottom - base.top };
  }, []);

  // Measure the fan and fit an ellipse around it. The far half of the orbit runs behind the
  // cards; the near half is sized so a passing task never crosses a card.
  const measure = useCallback(() => {
    const root = wrap.current;
    const stack = stage.current;
    if (!root || !stack || openRef.current) return;
    const cardBoxes = [...stack.querySelectorAll<HTMLElement>(".stack-card")].map((card) => relative(card.getBoundingClientRect()));
    if (!cardBoxes.length) return;
    const all = cardBoxes.reduce((acc, box) => ({ left: Math.min(acc.left, box.left), top: Math.min(acc.top, box.top), right: Math.max(acc.right, box.right), bottom: Math.max(acc.bottom, box.bottom) }));
    const chip = chips.current.find(Boolean);
    const cw = Math.min(chip?.offsetWidth ?? 180, 220);
    const ch = chip?.offsetHeight ?? 34;
    const cx = (all.left + all.right) / 2;
    const cy = (all.top + all.bottom) / 2;
    const hw = (all.right - all.left) / 2;
    const narrow = window.innerWidth < 640;
    // on a phone the orbit is wider than the screen, so tasks slip off the edge and come back
    // beside the copy on wider screens, the orbit stays within the stack's own column
    const rx = narrow ? Math.max(hw + cw / 2 + 20, window.innerWidth * 0.72) : Math.min(hw + cw / 2 + 18, cx - cw / 2 + 36);
    const pad = 10;
    // start just clear of the fan at the bottom and open up until the front stretch is generous
    let ry = all.bottom - cy + ch / 2 + pad;
    const clearAt = (a: number) => {
      const x = cx + rx * Math.cos(a);
      const y = cy + ry * Math.sin(a);
      const box = { left: x - cw / 2 - pad, right: x + cw / 2 + pad, top: y - ch / 2 - pad, bottom: y + ch / 2 + pad };
      return !cardBoxes.some((card) => overlaps(box, card));
    };
    // widen the front stretch from the bottom of the orbit until a task would touch a card;
    // beyond that it passes behind the fan, so it never cuts through a card in front
    const spanFor = () => {
      let span = 0;
      while (span < 88 && clearAt(((90 - span - 2) * Math.PI) / 180) && clearAt(((90 + span + 2) * Math.PI) / 180)) span += 2;
      return span;
    };
    let span = spanFor();
    for (let grow = 0; span < 34 && grow < 20; grow += 1) {
      ry += 6;
      span = spanFor();
    }
    orbit.current = { cx, cy, rx, ry, front: Math.cos((span * Math.PI) / 180) - 0.001 };
  }, [relative]);

  const orbitPosition = useCallback((index: number, t: number) => {
    const o = orbit.current;
    const chip = chips.current[index];
    if (!o || !chip) return null;
    const a = (t / ORBIT_SECONDS) * Math.PI * 2 + index * (Math.PI / 2) + 0.4;
    const depth = Math.sin(a); // 1 = nearest the viewer, -1 = behind the stack
    const x = o.cx + o.rx * Math.cos(a) - chip.offsetWidth / 2;
    const y = o.cy + o.ry * depth - chip.offsetHeight / 2;
    const scale = 0.9 + 0.1 * ((depth + 1) / 2);
    return { x, y, depth, front: depth > o.front, scale, opacity: 0.72 + 0.28 * ((depth + 1) / 2) };
  }, []);

  const place = useCallback((index: number, x: number, y: number, scale = 1, extra: Partial<CSSStyleDeclaration> = {}) => {
    const chip = chips.current[index];
    if (!chip) return;
    chip.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    Object.assign(chip.style, extra);
  }, []);

  // the orbit itself
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (orbiting.current) {
        clock.current += dt;
        chips.current.forEach((chip, index) => {
          if (!chip || index === landing.current) return;
          const p = orbitPosition(index, clock.current);
          if (!p) return;
          place(index, p.x, p.y, p.scale, { zIndex: p.front ? "7" : "0", opacity: String(p.opacity) });
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [orbitPosition, place]);

  // measure once the deal-in has settled, and again on resize
  useEffect(() => {
    const first = window.setTimeout(() => {
      measure();
      if (!openRef.current && !reduced.current) orbiting.current = true;
    }, 1500);
    let pending = 0;
    const onResize = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(measure, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(pending);
      window.removeEventListener("resize", onResize);
    };
  }, [measure]);

  // spreading the week pulls every task out of orbit into the tray; stacking sends them back
  useClientLayout(() => {
    if (!wrap.current) return;
    const ease = "transform .8s cubic-bezier(.22,1.2,.36,1), opacity .4s ease";
    if (open) {
      orbiting.current = false;
      chips.current.forEach((chip, index) => {
        const slot = slots.current[index];
        if (!chip || !slot) return;
        const s = relative(slot.getBoundingClientRect());
        chip.style.transition = reduced.current ? "none" : ease;
        chip.style.transitionDelay = `${index * 60}ms`;
        place(index, s.left, s.top, 1, { zIndex: "9", opacity: placedRef.current[index] ? "0" : "1" });
      });
      return;
    }
    setPlaced(cards.map(() => false));
    setNote("");
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (reduced.current) {
      chips.current.forEach((chip) => { if (chip) chip.style.opacity = "0"; });
      return;
    }
    // wait for the cards to fan back, then fly each task to where its orbit is now
    const back = window.setTimeout(() => {
      measure();
      chips.current.forEach((chip, index) => {
        const p = orbitPosition(index, clock.current);
        if (!chip || !p) return;
        chip.style.transition = ease;
        chip.style.transitionDelay = `${index * 50}ms`;
        place(index, p.x, p.y, p.scale, { zIndex: p.front ? "7" : "0", opacity: String(p.opacity) });
      });
      window.setTimeout(() => {
        chips.current.forEach((chip) => { if (chip) { chip.style.transition = "none"; chip.style.transitionDelay = "0ms"; } });
        if (!openRef.current) orbiting.current = true;
      }, SETTLE_MS + 200);
    }, 450);
    return () => window.clearTimeout(back);
  }, [open, measure, orbitPosition, place, relative]);

  // fly one task into the second row of its card, then add it there
  const flyHome = useCallback((index: number, done?: () => void) => {
    const chip = chips.current[index];
    const slot = stage.current?.querySelector<HTMLElement>(`[data-card="${index}"] li:nth-child(2)`);
    if (!chip || !slot) return;
    const from = relative(chip.getBoundingClientRect());
    const to = relative(slot.getBoundingClientRect());
    chip.style.transition = "transform .55s cubic-bezier(.3,.7,.2,1), opacity .25s ease .4s";
    chip.style.transitionDelay = "0ms";
    const scale = Math.min(1, to.bottom - to.top > 0 ? 0.92 : 1);
    place(index, to.left + 4, to.top + (to.bottom - to.top - (from.bottom - from.top)) / 2, scale, { zIndex: "10", opacity: "0" });
    window.setTimeout(() => {
      setShown((prev) => prev.map((count, i) => (i === index ? count + 1 : count)));
      done?.();
    }, 520);
  }, [place, relative]);

  // on the stack, a task in the near half of its orbit lands every few seconds
  const land = useCallback(() => {
    if (openRef.current || !orbiting.current || landing.current !== null) return;
    const candidates = cards.map((_, index) => index).filter((index) => {
      const p = orbitPosition(index, clock.current);
      return p && p.front;
    });
    if (!candidates.length) return;
    const index = candidates[0];
    landing.current = index;
    setReceiving(index);
    window.setTimeout(() => {
      if (openRef.current) {
        landing.current = null;
        setReceiving(null);
        return;
      }
      flyHome(index, () => {
        // come back into orbit as the next task for this spread
        const chip = chips.current[index];
        const p = orbitPosition(index, clock.current + 1.2);
        if (chip && p) {
          chip.style.transition = "opacity .6s ease .3s";
          place(index, p.x, p.y, p.scale, { opacity: String(p.opacity), zIndex: p.front ? "7" : "0" });
        }
        window.setTimeout(() => {
          if (chip) chip.style.transition = "none";
          landing.current = null;
        }, 900);
        window.setTimeout(() => setReceiving(null), 500);
      });
    }, 360);
  }, [flyHome, orbitPosition, place]);

  useEffect(() => {
    const root = wrap.current;
    if (!root || reduced.current) return;
    let timer = 0;
    let visible = false;
    const schedule = () => {
      window.clearInterval(timer);
      if (visible && !document.hidden) timer = window.setInterval(land, LANDING_MS);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }, { threshold: 0.3 });
    io.observe(root);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      window.clearInterval(timer);
    };
  }, [land]);

  // placing a task the visitor chose
  const accept = useCallback((index: number) => {
    setTarget(null);
    flyHome(index, () => {
      const next = placedRef.current.map((value, i) => (i === index ? true : value));
      setPlaced(next);
      if (next.every(Boolean)) {
        setNote("Every hour has a place.");
        // hand them the next four
        window.setTimeout(() => {
          if (!openRef.current) return;
          setPlaced(cards.map(() => false));
          setNote("");
          chips.current.forEach((chip, i) => {
            const slot = slots.current[i];
            if (!chip || !slot) return;
            const s = relative(slot.getBoundingClientRect());
            chip.style.transition = "opacity .5s ease, transform 0s";
            chip.style.transitionDelay = `${i * 80}ms`;
            place(i, s.left, s.top, 1, { opacity: "1", zIndex: "9" });
          });
        }, 1600);
      }
    });
  }, [flyHome, place, relative]);

  const returnToTray = useCallback((index: number) => {
    const slot = slots.current[index];
    if (!slot) return;
    const s = relative(slot.getBoundingClientRect());
    const chip = chips.current[index];
    if (chip) chip.style.transition = "transform .5s cubic-bezier(.22,1.2,.36,1)";
    place(index, s.left, s.top, 1, { zIndex: "9" });
  }, [place, relative]);

  const cardUnder = useCallback((clientX: number, clientY: number) => {
    const found = [...(stage.current?.querySelectorAll<HTMLElement>(".stack-card") ?? [])].find((card) => {
      const r = card.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    });
    return found ? Number(found.dataset.card) : null;
  }, []);

  function onChipDown(index: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!openRef.current || placedRef.current[index]) return;
    const chip = chips.current[index];
    const slot = slots.current[index];
    if (!chip || !slot) return;
    event.preventDefault();
    chip.setPointerCapture(event.pointerId);
    dragging.current = index;
    const start = { x: event.clientX, y: event.clientY };
    const s = relative(slot.getBoundingClientRect());
    chip.style.transition = "none";
    chip.classList.add("is-dragging");
    const move = (e: PointerEvent) => {
      place(index, s.left + e.clientX - start.x, s.top + e.clientY - start.y, 1.04, { zIndex: "11" });
      const over = cardUnder(e.clientX, e.clientY);
      setTarget(over === null ? null : { index: over, ok: over === index });
    };
    const up = (e: PointerEvent) => {
      chip.removeEventListener("pointermove", move);
      chip.removeEventListener("pointerup", up);
      chip.removeEventListener("pointercancel", up);
      chip.classList.remove("is-dragging");
      dragging.current = null;
      const over = cardUnder(e.clientX, e.clientY);
      setTarget(null);
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6;
      if (over === index || (!moved && e.type === "pointerup")) {
        // a plain tap places the task too, so the tray works without dragging
        accept(index);
      } else if (over !== null) {
        setWrong(over);
        setNote(`That one belongs with ${cards[index].name}.`);
        window.setTimeout(() => setWrong(null), 500);
        returnToTray(index);
      } else {
        returnToTray(index);
      }
      // a mouse that let go outside the hero closes the hover spread
      const r = wrap.current?.getBoundingClientRect();
      if (e.pointerType === "mouse" && r && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) setHover(false);
    };
    chip.addEventListener("pointermove", move);
    chip.addEventListener("pointerup", up);
    chip.addEventListener("pointercancel", up);
  }

  function onChipKey(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    if ((event.key === "Enter" || event.key === " ") && openRef.current && !placedRef.current[index]) {
      event.preventDefault();
      accept(index);
    }
  }

  const remaining = placed.filter((value) => !value).length;
  const guide = note || (remaining === cards.length ? "Drag each task onto its spread." : `${remaining} left. Drag each onto its spread.`);

  return (
    <div
      ref={wrap}
      className={`spread-stack-wrap${open ? " is-open" : ""}`}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHover(true); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse" && dragging.current === null) setHover(false); }}
    >
      <div className="orbit" aria-hidden={!open}>
        {cards.map((card, index) => (
          <button
            type="button"
            key={card.name}
            ref={(node) => { chips.current[index] = node; }}
            className={`orbit-task${placed[index] ? " is-placed" : ""}`}
            style={{ "--role": card.color } as CSSProperties}
            tabIndex={open && !placed[index] ? 0 : -1}
            aria-label={`Place “${card.tasks[shown[index] % card.tasks.length]}” on ${card.name}`}
            onPointerDown={(event) => onChipDown(index, event)}
            onKeyDown={(event) => onChipKey(index, event)}
          >
            <i />
            <span>{card.tasks[shown[index] % card.tasks.length]}</span>
          </button>
        ))}
      </div>

      <div ref={stage} className={`spread-stack${open ? " is-spread" : ""}`}>
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
          const aimed = target?.index === index;
          return (
            <article
              key={card.name}
              data-card={index}
              className={[
                "stack-card",
                receiving === index && !open ? "is-receiving" : "",
                aimed && target?.ok ? "is-target" : "",
                aimed && !target?.ok ? "is-near" : "",
                wrong === index ? "is-wrong" : "",
              ].filter(Boolean).join(" ")}
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

      {/* where tasks wait when the week is spread; the slots size themselves to the tasks */}
      <div className="stack-tray" aria-hidden="true">
        {cards.map((card, index) => (
          <span key={card.name} ref={(node) => { slots.current[index] = node; }} className="tray-slot">
            <i />
            <span>{card.tasks[shown[index] % card.tasks.length]}</span>
          </span>
        ))}
      </div>

      <p className="stack-hint" aria-live="polite">
        {open ? (
          <span className="stack-hint-guide">{guide}</span>
        ) : (
          <>
            <span className="stack-hint-hover">Hover to spread your week</span>
            <span className="stack-hint-touch">Tap to spread your week</span>
          </>
        )}
      </p>
    </div>
  );
}
