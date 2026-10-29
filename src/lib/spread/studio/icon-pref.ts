import { useSyncExternalStore } from "react";

/**
 * How spread icons are drawn on this device: the default round badge, or a hand-drawn pair (a
 * glossy tile glyph plus a crayon illustration of the category). A per-device display choice like
 * the layout: not synced, backed up or part of a saved look.
 */
export type IconStyle = "default" | "drawn";

export const ICON_STYLES: { id: IconStyle; label: string; hint: string }[] = [
  { id: "default", label: "Default", hint: "Round color badges" },
  { id: "drawn", label: "Hand-drawn", hint: "An icon and a crayon drawing for each spread" },
];

export function iconStyleOrDefault(value: unknown): IconStyle {
  return value === "drawn" ? "drawn" : "default";
}

const KEY = "spread.studio.icons";
const EVENT = "spread-studio-icons";

function read(): IconStyle {
  try {
    return iconStyleOrDefault(window.localStorage.getItem(KEY));
  } catch {
    return "default";
  }
}

function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

export function setIconStyle(style: IconStyle) {
  try {
    window.localStorage.setItem(KEY, style);
  } catch {
    /* A blocked store keeps the default for this load. */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useIconStyle(): IconStyle {
  return useSyncExternalStore(subscribe, read, () => "default");
}
