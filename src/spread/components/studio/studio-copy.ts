/**
 * Studio sheet copy. Photos are described as staying on this device.
 * This file does not describe a backup policy.
 */

export const STUDIO_UI_COPY = {
  entry: "Customize",
  entryLabel: "Customize Spread",
  title: "Customize Spread",
  description: "Match your photo with real card, crown, task and navigation styles. Photos stay on this device.",
  close: "Close",
  choosePhoto: "Choose a photo",
  readingPhoto: "Reading that photo.",
  removePhoto: "Remove photo",
  noPhoto: "No photo yet. The original look is showing.",
  smallerPhoto: "Try a smaller photo.",
  wallpaper: "Wallpaper",
  fill: "Fill",
  fit: "Fit",
  fillLabel: "Wallpaper fills the preview",
  fitLabel: "Wallpaper fits inside the preview",
  positionAcross: "Position across",
  positionDown: "Position down",
  dim: "Dim",
  blur: "Soften",
  colors: "Colors",
  suggested: "Suggested colors",
  useSuggested: "Use suggested colors",
  noSuggestion: "Choose a photo to see suggested colors.",
  accent: "Accent",
  surface: "Surface",
  text: "Text",
  secondaryText: "Secondary text",
  appearance: "Light and dark",
  appearanceHint: "System follows Spread Settings (or your device if Settings is System). Light and Dark override the look only; Settings still controls the rest of Spread.",
  system: "System",
  light: "Light",
  dark: "Dark",
  more: "More controls",
  surfaceStyle: "Surface style",
  flat: "Flat",
  glass: "Glass",
  matte: "Matte",
  metal: "Metal",
  transparency: "Transparency",
  depth: "Depth",
  textSize: "Text size",
  numerals: "Hour numeral emphasis",
  density: "Density",
  comfortable: "Comfortable",
  compact: "Compact",
  decoration: "Decoration",
  motion: "Motion",
  systemType: "Typography uses approved local device fonts.",
  originalControls: "Controls keep their existing behaviors.",
  reduceMotion: "Reduce Motion is on, so motion in the preview stays off.",
  reduceTransparency: "Reduce Transparency is on, so glass, matte, and metal draw flat.",
  previewSpread: "Preview of Spread",
  previewWeek: "Preview of Week",
  previewNote: "The preview shows your real responsibilities, hours, week and tasks without changing your plan.",
  saved: "Saved on this device.",
  discarded: "Changes discarded.",
  reset: "Reset",
  resetLabel: "Reset to the original look",
  resetNote: "This draft is the original look. Apply saves it.",
  cancel: "Cancel",
  apply: "Apply",
  applying: "Saving.",
  planChanged: "Your plan changed, so this look was not saved.",
  colorHint: "Enter a color like #1d1d1f.",
  photosUnavailable: "Photos can't be stored in this browser.",
  loading: "Loading this profile's look.",
} as const;

const BACKUP_EXCLUSION = new RegExp(["excluded", "from", "backup"].join(" "), "i");

/** True when text uses the forbidden backup-exclusion phrase. The sheet must not. */
export function copyClaimsBackupExclusion(text: string): boolean {
  return BACKUP_EXCLUSION.test(text);
}

/**
 * G2 already says a photo could not be read. Add a calm next step for the
 * decode failure that shows up on large photos.
 */
export function importFailureCopy(reason: string, message: string): string {
  if (reason === "corrupt") return `${message} ${STUDIO_UI_COPY.smallerPhoto}`;
  return message;
}

export function studioEntryRendered(flag: boolean): "entry" | "nothing" {
  return flag ? "entry" : "nothing";
}
