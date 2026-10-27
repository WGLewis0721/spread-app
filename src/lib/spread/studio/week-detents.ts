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

export const STUDIO_WEEK_BOARD = {
  width: 402, height: 874, header: 126,
  peek: 690, half: 410, full: 130,
} as const;
export function sheetTop(detent:StudioWeekDetent, viewportHeight:number):number {
  const basis=STUDIO_WEEK_BOARD[detent];
  return Math.round(Math.max(0,viewportHeight)*basis/STUDIO_WEEK_BOARD.height);
}
export function rubberBandSheetTop(top:number, viewportHeight:number):number {
  const min=sheetTop("full",viewportHeight), max=sheetTop("peek",viewportHeight);
  if(top<min)return min-Math.min(36,Math.sqrt(min-top)*3);
  if(top>max)return max+Math.min(36,Math.sqrt(top-max)*3);
  return top;
}
export function settleWeekSheet(top:number,velocity:number,height:number):StudioWeekDetent {
  const projected=top+Math.max(-1.4,Math.min(1.4,velocity))*240;
  return STUDIO_WEEK_DETENTS.reduce((best,item)=>
    Math.abs(sheetTop(item,height)-projected)<Math.abs(sheetTop(best,height)-projected)?item:best,"half" as StudioWeekDetent);
}
/** E1 raw HTML: Peek has an unshifted full image; Half and Full show the
 * same art with the bitmap at top:-222 inside a 402x804 source panel.
 * Interpolate during finger drag to preserve continuity and keep visible art.
 * CSS scales the asset with cover and never changes its aspect ratio. */
export function wallpaperShiftForSheet(top:number,height:number):number{
  if(!Number.isFinite(top)||!Number.isFinite(height)||height<=0)return 0;
  const peek=sheetTop("peek",height),half=sheetTop("half",height);
  const t=Math.min(1,Math.max(0,(peek-top)/Math.max(1,peek-half)));
  return -Math.round((222*height/874)*t);
}
