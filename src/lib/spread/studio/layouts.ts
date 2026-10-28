/**
 * The Spread tab layouts the Studio Board offers, and the pure geometry the dial uses. Kept free of
 * React and assets so it can be tested on its own.
 */
export type SpreadLayout = "stack" | "fan" | "dial" | "tabs" | "day";

export const DEFAULT_LAYOUT: SpreadLayout = "stack";

export const SPREAD_LAYOUTS: { id: SpreadLayout; label: string; hint: string }[] = [
  { id: "stack", label: "Stack", hint: "Overlapping cards that turn on their own" },
  { id: "fan", label: "Fan", hint: "A hand of cards. Swipe or tap to bring one forward" },
  { id: "dial", label: "Dial", hint: "A ring sized by hours. Drag it to pick a spread" },
  { id: "tabs", label: "Tabs", hint: "A row of tabs: All, or one spread at a time" },
  { id: "day", label: "Day", hint: "One day at a glance, hour by hour" },
];

export function isLayout(value: unknown): value is SpreadLayout {
  return SPREAD_LAYOUTS.some((layout) => layout.id === value);
}

/** Anything that is not a known layout is the default. */
export function layoutOrDefault(value: unknown): SpreadLayout {
  return isLayout(value) ? value : DEFAULT_LAYOUT;
}

export const DIAL_GAP = 3;

export type DialSegment = { id: string; from: number; to: number; span: number };

/**
 * Arcs around a ring, sized by hours (a spread with none still gets a sliver), clockwise from the
 * top, with a small gap between them. Angles are degrees in [0, 360).
 */
export function dialSegments(rows: { id: string; hours: number }[]): DialSegment[] {
  const many = rows.length > 1;
  const weights = rows.map((row) => Math.max(row.hours, 0.5));
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  const room = 360 - (many ? rows.length * DIAL_GAP : 0);
  let cursor = many ? DIAL_GAP / 2 : 0;
  return rows.map((row, index) => {
    const span = Math.min(359.9, (weights[index] / total) * room);
    const segment = { id: row.id, from: cursor, to: cursor + span, span };
    cursor += span + (many ? DIAL_GAP : 0);
    return segment;
  });
}

/** The segment under an angle (0 at the top, clockwise), counting the gaps as part of the arc before. */
export function segmentAt(segments: DialSegment[], angle: number): DialSegment | undefined {
  const norm = ((angle % 360) + 360) % 360;
  return segments.find((segment) => norm >= segment.from - DIAL_GAP / 2 && norm < segment.to + DIAL_GAP / 2) ?? segments[0];
}
