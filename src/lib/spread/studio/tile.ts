/**
 * The glossy glyph tile of a hand-drawn icon pair, as SVG markup. Pure and React-free so the
 * verification harness renders exactly what the app renders. Numbers come from ICON_SPEC.md
 * (measured on the owner's icon board): radius 28.5% of size, a vertical gradient from 16% lighter
 * fitted over eight board tiles, a tinted two-layer shadow that falls straight down, and a white
 * glyph optically sized (geometric mean half the tile).
 */
export const TILE_SPEC = {
  radius: 0.295,
  /** Gradient stops: [offset, brightness multiplier, white share]. Median fit over eight board tiles. */
  stops: [
    [0, 1.3, 0.4],
    [0.08, 1.17, 0.07],
    [0.2, 1.08, 0.03],
    [0.32, 1.02, 0.01],
    [0.6, 0.985, 0],
    [0.75, 0.975, 0],
    [0.9, 0.99, 0.01],
    [1, 1.01, 0.05],
  ] as const,
  rim: { top: 0, side: 0, bottom: 0.15 },
  /** Glyph optical size: sqrt(width x height) of the glyph is half the tile (board median 0.49 to 0.50). */
  glyphShare: 0.5,
  /** Shadow layers in px at a 70 px tile: a tight contact shadow and a long fall-off that drops
   *  straight down (blur taller than wide), so the sides stay clean as on the board. */
  shadow: [
    { dy: 2, sx: 1.5, sy: 2, alpha: 0.06 },
    { dy: 9, sx: 3.5, sy: 6, alpha: 0.12 },
  ],
  /** The shadow is the tile's own hue, darkened: the board's shadows are tinted, not grey. */
  shadowTone: 0.55,
} as const;

function hex(color: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  const n = m ? parseInt(m[1], 16) : 0x8e8e93;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Brighten or darken while keeping the hue saturated (a multiply), then mix toward white. */
export function shade(color: string, gain: number, white: number) {
  const c = hex(color).map((v) => Math.min(255, v * gain));
  const out = c.map((v) => Math.round(v + (255 - v) * white));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function mix(color: string, toward: [number, number, number], share: number) {
  const c = hex(color);
  const out = c.map((v, i) => Math.round(v + (toward[i] - v) * share));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}


/** Inner glyph markup (paths only) from a category mark drawn in a 24 box on a r=10 circle. */
export function glyphFromMark(mark: string) {
  return mark
    .replace(/<\?xml[^>]*>/, "")
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "")
    .replace(/<circle[^>]*r="10"[^>]*\/>/, "")
    .trim();
}

/** Measured ink boxes [x, y, w, h] of the app's category marks in their 24 unit box (getBBox). */
export const GLYPH_BOX: Record<string, readonly [number, number, number, number]> = {
  work: [5.3, 6.5, 13.41, 12],
  school: [5.4, 6.2, 13.2, 12.1],
  home: [5.4, 6.2, 13.2, 11.8],
  health: [6.4, 7.4, 11.2, 10.4],
  family: [5.8, 6.7, 11.4, 10.1],
  fitness: [4.8, 9.2, 14.4, 5.6],
  business: [5, 7.2, 14, 10.3],
  project: [5.8, 6.8, 12.4, 11],
  church: [7.6, 5.4, 8.8, 12.6],
  personal: [6.6, 6.6, 10.8, 10.8],
  custom: [3.9, 3.9, 16.2, 16.2],
};

/** The Custom tile's glyph, a thin plus like the board's "Make it your own" tile. */
export const CUSTOM_GLYPH = '<path d="M12 6.4v11.2M6.4 12h11.2" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>';

/**
 * SVG for a tile `size` px square. `glyph` is inner markup in a 24 unit box whose ink spans about
 * 13.4 units (the app's marks); it is rescaled to 57% of the tile.
 */
export type TileSpec = { radius: number; stops: readonly (readonly [number, number, number])[]; rim: { top: number; side: number; bottom: number }; glyphShare: number; shadow: readonly { dy: number; sx: number; sy: number; alpha: number }[]; shadowTone: number };

export function tileSvg({ color, glyph, size, id, box = [5.3, 6.5, 13.4, 12], spec = TILE_SPEC }: { color: string; glyph: string; size: number; id: string; box?: readonly [number, number, number, number]; spec?: TileSpec }) {
  const base = /^#[0-9a-f]{6}$/i.test(color) ? color : "#8E8E93";
  const r = 24 * spec.radius;
  const [bx, by, bw, bh] = box;
  const scale = (spec.glyphShare * 24) / Math.sqrt(bw * bh);
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const u = 24 / 70;
  const layers = spec.shadow
    .map((l, i) => `<feGaussianBlur in="SourceAlpha" stdDeviation="${(l.sx * u).toFixed(3)} ${(l.sy * u).toFixed(3)}" result="b${i}"/><feOffset in="b${i}" dy="${(l.dy * u).toFixed(3)}" result="o${i}"/><feFlood flood-color="${shade(base, spec.shadowTone, 0)}" flood-opacity="${l.alpha}" result="c${i}"/><feComposite in="c${i}" in2="o${i}" operator="in" result="s${i}"/>`)
    .join("");
  const merge = spec.shadow.map((_, i) => `<feMergeNode in="s${i}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" overflow="visible" aria-hidden="true" class="studio-drawn-tile">
<defs>
<linearGradient id="f${id}" x1="0" y1="0" x2="0" y2="1">
${spec.stops.map(([at, gain, white]) => `<stop offset="${at}" stop-color="${shade(base, gain, white)}"/>`).join("\n")}
</linearGradient>
<linearGradient id="r${id}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity="${spec.rim.top}"/>
<stop offset=".08" stop-color="#fff" stop-opacity="${spec.rim.side}"/>
<stop offset=".92" stop-color="#fff" stop-opacity="${spec.rim.side}"/>
<stop offset="1" stop-color="#fff" stop-opacity="${spec.rim.bottom}"/>
</linearGradient>
<filter id="s${id}" x="-30%" y="-30%" width="160%" height="190%">${layers}<feMerge>${merge}<feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="g${id}" x="-20%" y="-20%" width="140%" height="140%">
<feDropShadow dx="0" dy=".3" stdDeviation=".25" flood-color="#000" flood-opacity=".14"/>
</filter>
</defs>
<rect width="24" height="24" rx="${r}" fill="url(#f${id})" filter="url(#s${id})"/>
<rect x=".45" y=".45" width="23.1" height="23.1" rx="${r - 0.45}" fill="none" stroke="url(#r${id})" stroke-width=".9"/>
<g filter="url(#g${id})" transform="translate(12 12) scale(${scale.toFixed(4)}) translate(${(-cx).toFixed(3)} ${(-cy).toFixed(3)})">${glyph}</g>
</svg>`;
}
