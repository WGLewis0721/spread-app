import type { CSSProperties } from "react";

// Match the photographed 25h of planning capacity. The 168-hour callout
// elsewhere on the page still describes a full week.
export const SAMPLE_CAPACITY = 25;
const base = `${import.meta.env.BASE_URL || "/"}landing-life/`;

export function lifeStyle(area: { name: string; color: string }): CSSProperties {
  const category = area.name.toLowerCase();
  return {
    "--role": area.color,
    "--life-photo": category === "health" ? "none" : `url(${base}${category}.webp)`,
    "--life-glyph": `url(${base}${category}.svg)`,
    "--life-glyph-ink": category === "family" ? "#fff" : "#171717",
  } as CSSProperties;
}
