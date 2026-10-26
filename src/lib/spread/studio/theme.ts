/**
 * Shipped Spread tokens the renderer is allowed to start from.
 * Copied from src/styles.css and src/lib/spread/model.ts ROLE_COLORS at
 * studio-contract 432b7c245d9dae3e1eb9a18aac6ba6921f0158c6.
 * These are the original look. No font URLs and no named look catalog.
 */

import { ROLE_COLORS } from "../model.ts";

/** The only type stack Studio may emit. Matches `--font-sans` in src/styles.css. */
export const SHIPPED_FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

/** Light values from the base token block in src/styles.css. */
export const SHIPPED_LIGHT = {
  canvas: "#f2f2f7",
  elevated: "#ffffff",
  ink: "#1d1d1f",
  secondary: "#6e6e73",
  tertiary: "#8e8e93",
  accent: "#007aff",
  onAccent: "#ffffff",
  danger: "#ff3b30",
  onDanger: "#ffffff",
  caution: "#9a3412",
} as const;

/** Dark values from the explicit dark token block in src/styles.css. Opaque seeds only. */
export const SHIPPED_DARK = {
  canvas: "#000000",
  elevated: "#1c1c1e",
  ink: "#f5f5f7",
  accent: "#0a84ff",
  onAccent: "#ffffff",
  danger: "#ff453a",
  onDanger: "#ffffff",
  caution: "#ff9f0a",
} as const;

/** Existing `.week-seq` duration in src/styles.css. Studio never exceeds it. */
export const MOTION_MAX_MS = 340;

/** Planner hit target. Density does not reduce this. */
export const STUDIO_MIN_TARGET_PX = 44;

export function shippedRoleColors(): readonly string[] {
  return ROLE_COLORS;
}
