import type { CSSProperties } from "react";
import { roleCardInks } from "./contrast.ts";

/**
 * Inline custom properties for anything painted in a role color (stacked cards, chips, rows).
 * Ink, secondary and tertiary text are computed for that exact color and forced to 4.5:1, so
 * render.css never has to guess a gray. Harmless when Studio is off: nothing reads them.
 */
export function roleVars(color: string, extra: CSSProperties = {}): CSSProperties {
  const inks = roleCardInks(color);
  return {
    ...extra,
    "--role": color,
    "--role-ink": inks.ink,
    "--role-ink-2": inks.secondary,
    "--role-ink-3": inks.tertiary,
  } as CSSProperties;
}
