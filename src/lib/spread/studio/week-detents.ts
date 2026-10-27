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
