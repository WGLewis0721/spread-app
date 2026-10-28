import { useSyncExternalStore } from "react";
import { DEFAULT_LAYOUT, layoutOrDefault, type SpreadLayout } from "./layouts.ts";

/**
 * Which Spread tab layout this device shows. A per-device display choice, kept apart from the
 * appearance contract: it changes how the same spreads are arranged, never how any is painted, so
 * it is not synced, backed up or part of a saved look. Stack is the default.
 */
const LAYOUT_KEY = "spread.studio.layout";
const LAYOUT_EVENT = "spread-studio-layout";

function readLayout(): SpreadLayout {
  try {
    return layoutOrDefault(window.localStorage.getItem(LAYOUT_KEY));
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function subscribeLayout(notify: () => void) {
  window.addEventListener(LAYOUT_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(LAYOUT_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

export function setSpreadLayout(layout: SpreadLayout) {
  try {
    window.localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    /* A blocked store keeps the default for this load. */
  }
  window.dispatchEvent(new Event(LAYOUT_EVENT));
}

export function useSpreadLayout(): SpreadLayout {
  return useSyncExternalStore(subscribeLayout, readLayout, () => DEFAULT_LAYOUT);
}
