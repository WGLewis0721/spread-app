/** Studio-only three-position sheet motion. Pure and deterministic. */
export const STUDIO_WEEK_DETENTS=["peek","half","full"] as const;
export type StudioWeekDetent=typeof STUDIO_WEEK_DETENTS[number];
export function cycleDetent(current:StudioWeekDetent):StudioWeekDetent {
 return current==="peek"?"half":current==="half"?"full":"peek";
}
/** Negative dy pulls sheet upward; positive pulls it down. Velocity can snap a short flick. */
export function snapDetent(current:StudioWeekDetent,dy:number,elapsedMs:number):StudioWeekDetent {
 if(!Number.isFinite(dy)||!Number.isFinite(elapsedMs))return current;
 const velocity=Math.abs(dy)/Math.max(1,elapsedMs);
 if(Math.abs(dy)<36 && velocity<0.42)return current;
 const i=STUDIO_WEEK_DETENTS.indexOf(current);
 return STUDIO_WEEK_DETENTS[Math.min(2,Math.max(0,i+(dy<0?1:-1)))];
}

/** Sheet top edge in px for each detent. Fractions follow the end-state board (79%, 47%) and Full sits under the pinned header. */
export type DetentTops = Record<StudioWeekDetent, number>;
export function detentTops(viewportHeight: number, headerBottom: number): DetentTops {
 const vh = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 800;
 const head = Number.isFinite(headerBottom) && headerBottom > 0 ? headerBottom : 126;
 const full = Math.min(Math.round(head + 6), Math.round(vh * 0.4));
 return { peek: Math.max(full + 120, Math.round(vh * 0.79)), half: Math.max(full + 60, Math.round(vh * 0.47)), full };
}

/** Rubber band past either end so the sheet resists instead of stopping dead. */
export function followTop(startTop: number, dy: number, tops: DetentTops): number {
 const raw = startTop + dy;
 if (raw < tops.full) return tops.full - (tops.full - raw) * 0.3;
 if (raw > tops.peek) return tops.peek + (raw - tops.peek) * 0.3;
 return raw;
}

/** Where the sheet settles: project the release by velocity (px/ms, positive = down), then take the nearest detent. */
export function nearestDetent(top: number, velocity: number, tops: DetentTops): StudioWeekDetent {
 if (!Number.isFinite(top)) return "half";
 const v = Number.isFinite(velocity) ? velocity : 0;
 const projected = top + Math.max(-1.6, Math.min(1.6, v)) * 180;
 let best: StudioWeekDetent = "half";
 let gap = Infinity;
 for (const detent of STUDIO_WEEK_DETENTS) {
  const d = Math.abs(tops[detent] - projected);
  if (d < gap) { gap = d; best = detent; }
 }
 return best;
}
