import { isNativeApp } from "@/lib/spread/native";

/**
 * One light tap when a task is finished. Native only: on the web (and for anyone who asked their
 * device to reduce motion) it does nothing, and a missing or failing plugin is never an error.
 * The plugin is imported lazily so the Vercel site never loads it.
 */
export type HapticsEnv = {
  native: () => boolean;
  reducedMotion: () => boolean;
  tap: () => Promise<void>;
};

const liveEnv: HapticsEnv = {
  native: isNativeApp,
  reducedMotion: () => {
    try {
      return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  },
  tap: async () => {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  },
};

/** Resolves true when a tap was sent. */
export async function completionHaptic(env: HapticsEnv = liveEnv): Promise<boolean> {
  if (!env.native() || env.reducedMotion()) return false;
  try {
    await env.tap();
    return true;
  } catch {
    return false;
  }
}
