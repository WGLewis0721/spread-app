import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/**
 * Settings as a grid of tiles, like the iOS Control Center. A tile shows what it holds in one
 * line. Tapping it blows it up from where it sits to fill the sheet, and the back button folds it
 * into the tile again.
 *
 * The move is a clip-path from the tile's box to the panel's box, with the panel's color easing from
 * the tile's color, so the content is laid out once and never reflows during the move. When the
 * blow-up lands the tile grid folds to nothing, so the sheet shrinks to fit the panel instead of
 * leaving a blank page. Closing reverses both. Reduce Motion swaps everything with no animation.
 */
export type ControlTile = {
  id: string;
  title: string;
  detail: string;
  icon: ReactNode;
  tone: "sky" | "peach" | "sage" | "butter" | "lilac";
  wide?: boolean;
  body: ReactNode;
};

const OPEN_MS = 460;
const SETTLE_MS = 300;
const CLOSE_MS = 340;
const EASE = "cubic-bezier(.32,.72,0,1)";

type Spot = { top: number; left: number; right: number; bottom: number };

function calm() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ControlCenter({ tiles }: { tiles: ControlTile[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const spot = useRef<Spot | null>(null);
  const gridHeight = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const tint = useRef("transparent");
  const busy = useRef(false);
  const open = tiles.find((tile) => tile.id === openId) ?? null;

  /** The tile's box as an inset of a panel that is `height` tall. */
  const clipFor = (height: number) => {
    const t = spot.current;
    const w = wrap.current;
    if (!t || !w) return "inset(0px 0px 0px 0px round 24px)";
    const tileBottom = gridHeight.current - t.bottom;
    return `inset(${t.top}px ${t.right}px ${Math.max(0, height - tileBottom)}px ${t.left}px round 28px)`;
  };

  useLayoutEffect(() => {
    const node = panel.current;
    const g = grid.current;
    if (!openId || !node || !g) return;
    g.toggleAttribute("inert", true);
    node.querySelector<HTMLElement>("[data-cc-back]")?.focus({ preventScroll: true });
    if (calm() || typeof node.animate !== "function") {
      g.dataset.settled = "true";
      return;
    }
    busy.current = true;
    const rest = getComputedStyle(node).backgroundColor;
    const grow = node.animate(
      [
        { clipPath: clipFor(node.getBoundingClientRect().height), backgroundColor: tint.current },
        { clipPath: "inset(0px 0px 0px 0px round 24px)", backgroundColor: rest },
      ],
      { duration: OPEN_MS, easing: EASE },
    );
    Array.from(node.children).forEach((child) => {
      child.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 150, easing: "ease-out", fill: "backwards" });
    });
    grow.onfinish = () => {
      g.style.overflow = "hidden";
      const fold = g.animate([{ height: `${gridHeight.current}px` }, { height: "0px" }], { duration: SETTLE_MS, easing: EASE, fill: "forwards" });
      fold.onfinish = () => {
        g.dataset.settled = "true";
        fold.cancel();
        g.style.overflow = "";
        busy.current = false;
      };
    };
  }, [openId]);

  function show(tile: ControlTile, el: HTMLElement) {
    const w = wrap.current;
    const g = grid.current;
    if (busy.current || !w || !g) return;
    const box = w.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    gridHeight.current = g.getBoundingClientRect().height;
    spot.current = { top: t.top - box.top, left: t.left - box.left, right: box.right - t.right, bottom: box.bottom - t.bottom };
    tint.current = getComputedStyle(el).backgroundColor;
    opener.current = el;
    setOpenId(tile.id);
  }

  function hide() {
    const node = panel.current;
    const g = grid.current;
    if (!node || !g || busy.current) return;
    const done = () => {
      busy.current = false;
      setOpenId(null);
      window.requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
    };
    g.toggleAttribute("inert", false);
    if (calm() || typeof node.animate !== "function") {
      delete g.dataset.settled;
      done();
      return;
    }
    busy.current = true;
    const rest = getComputedStyle(node).backgroundColor;
    delete g.dataset.settled;
    g.style.overflow = "hidden";
    g.animate([{ height: "0px" }, { height: `${gridHeight.current}px` }], { duration: SETTLE_MS, easing: EASE }).onfinish = () => {
      g.style.overflow = "";
    };
    Array.from(node.children).forEach((child) => {
      child.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-in", fill: "forwards" });
    });
    const height = Math.max(node.getBoundingClientRect().height, gridHeight.current);
    node.animate(
      [
        { clipPath: "inset(0px 0px 0px 0px round 24px)", backgroundColor: rest },
        { clipPath: clipFor(height), backgroundColor: tint.current },
      ],
      { duration: CLOSE_MS, easing: EASE, fill: "forwards" },
    ).onfinish = done;
  }

  return (
    <div ref={wrap} className="studio-cc">
      <div ref={grid} className="studio-cc-grid">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="studio-cc-tile"
            data-tone={tile.tone}
            data-wide={tile.wide ? "true" : "false"}
            aria-haspopup="dialog"
            aria-expanded={openId === tile.id}
            onClick={(event) => show(tile, event.currentTarget)}
          >
            <span className="studio-cc-icon" aria-hidden="true">{tile.icon}</span>
            <span className="studio-cc-title">{tile.title}</span>
            <span className="studio-cc-detail">{tile.detail}</span>
          </button>
        ))}
      </div>
      {open && (
        <div ref={panel} className="studio-cc-panel" data-tone={open.tone} role="group" aria-label={open.title}>
          <div className="studio-cc-panel-head">
            <button type="button" data-cc-back className="studio-cc-back" aria-label="Back to Settings" onClick={hide}>
              <ChevronLeft className="size-5" strokeWidth={2.7} aria-hidden="true" />
            </button>
            <h2>{open.title}</h2>
          </div>
          {open.body}
        </div>
      )}
    </div>
  );
}
