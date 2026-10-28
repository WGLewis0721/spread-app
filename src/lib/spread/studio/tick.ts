import { isNativeApp } from "@/lib/spread/native";

/**
 * A selection tick for the Studio views: one detent when the Dial lands on a new spread, when the
 * Fan settles on a card, or a day chip is chosen. Native only. On the web, and for anyone who
 * asked their device to reduce motion, it does nothing, and a missing plugin is never an error.
 * The plugin is imported lazily so the Vercel site never loads it.
 */
export type TickEnv = {
  native: () => boolean;
  reducedMotion: () => boolean;
  tick: () => Promise<void>;
};

const liveEnv: TickEnv = {
  native: isNativeApp,
  reducedMotion: () => {
    try {
      return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  },
  tick: async () => {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  },
};

/** Resolves true when a tick was sent. */
export async function selectionTick(env: TickEnv = liveEnv): Promise<boolean> {
  if (!env.native() || env.reducedMotion()) return false;
  try {
    await env.tick();
    return true;
  } catch {
    return false;
  }
}
