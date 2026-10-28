import type { CSSProperties } from "react";
import { ROLE_GLOW_ALPHA, roleCardPaint } from "./contrast.ts";

/**
 * Inline custom properties for anything painted in a role color (stacked cards, chips, rows).
 * The color is deepened until white ink reads on it, drawn as a gradient with a soft highlight. Ink, secondary and tertiary text are computed for that paint and forced to 4.5:1, so
 * render.css never has to guess a gray. Harmless when Studio is off: nothing reads them.
 */
export function roleVars(color: string, extra: CSSProperties = {}): CSSProperties {
  const paint = roleCardPaint(color);
  return {
    ...extra,
    "--role": paint.top,
    "--role-2": paint.bottom,
    "--role-bg": `radial-gradient(120% 90% at 12% 0%, rgba(255,255,255,${ROLE_GLOW_ALPHA}), transparent 62%), linear-gradient(165deg, ${paint.top}, ${paint.bottom})`,
    "--role-ink": paint.ink,
    "--role-ink-2": paint.secondary,
    "--role-ink-3": paint.tertiary,
  } as CSSProperties;
}
