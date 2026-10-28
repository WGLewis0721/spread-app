/**
 * WCAG 2.x relative-luminance contrast. Pure numbers and hex strings.
 * No DOM, no storage, no network. Read against studio-contract
 * 432b7c245d9dae3e1eb9a18aac6ba6921f0158c6.
 */

export type Rgb = { r: number; g: number; b: number };

const HEX = /^#[0-9a-f]{6}$/;
const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

export function round4(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value * 10000) / 10000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const color = value.toLowerCase();
  return HEX.test(color) ? color : null;
}

export function hexToRgb(value: string): Rgb | null {
  const color = normalizeHex(value);
  if (!color) return null;
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  };
}

export function rgbToHex(rgb: Rgb): string {
  const channel = (part: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(part)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

function linearize(channel: number): number {
  const srgb = channel / 255;
  if (srgb <= 0.04045) return srgb / 12.92;
  return ((srgb + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance for an sRGB color. */
export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const left = relativeLuminance(foreground);
  const right = relativeLuminance(background);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastRatioHex(foreground: string, background: string): number | null {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return null;
  return contrastRatio(fg, bg);
}

/** Near-black or white, whichever reads better on a role color. Used by the stacked role cards. */
export function readableInkOn(background: string): string {
  const dark = "#0a0a0b";
  const light = "#ffffff";
  const onDark = contrastRatioHex(dark, background) ?? 0;
  const onLight = contrastRatioHex(light, background) ?? 0;
  return onDark >= onLight ? dark : light;
}

/**
 * Ink, secondary and tertiary text colors for a card painted in a role color. All three are
 * forced to 4.5:1 on that color, so the stacked role cards never rely on a fixed gray.
 */
export function roleCardInks(background: string): { ink: string; secondary: string; tertiary: string } {
  const ink = readableInkOn(background);
  const inkRgb = hexToRgb(ink);
  const bgRgb = hexToRgb(background);
  if (!inkRgb || !bgRgb) return { ink, secondary: ink, tertiary: ink };
  const soften = (amount: number) =>
    enforceContrast(rgbToHex(mixRgb(inkRgb, bgRgb, amount)), background, 4.5).color;
  return { ink, secondary: soften(0.14), tertiary: soften(0.26) };
}

/**
 * Paint for a role card in the board look: a gradient from the role color down to a deeper stop,
 * with a soft highlight (ROLE_GLOW_ALPHA of white) over the top corner. White ink is used when the
 * color needs at most 28% darkening to carry it at 4.5:1; otherwise the color stays vivid and the
 * ink is near-black, which is the honest choice for orange, green and yellow. Secondary and
 * tertiary are forced to 4.5:1 on the worst stop of the gradient, glow included.
 */
export const ROLE_GLOW_ALPHA = 0.12;
const ROLE_DARK_INK = "#0a0a0b";
export function roleCardPaint(color: string): { top: string; bottom: string; ink: string; secondary: string; tertiary: string } {
  const base = hexToRgb(color) ?? { r: 128, g: 128, b: 128 };
  const glowOf = (rgb: Rgb) => mixRgb(rgb, WHITE, ROLE_GLOW_ALPHA);
  for (let amount = 0; amount <= 0.28; amount += 0.02) {
    const top = mixRgb(base, BLACK, amount);
    if (contrastRatio(mixRgb(WHITE, top, 0.1), glowOf(top)) >= 4.65) {
      const topHex = rgbToHex(top);
      const bottom = rgbToHex(mixRgb(top, BLACK, 0.34));
      const soft = enforceContrast(rgbToHex(mixRgb(WHITE, top, 0.1)), rgbToHex(glowOf(top)), 4.5).color;
      return { top: topHex, bottom, ink: "#ffffff", secondary: soft, tertiary: soft };
    }
  }
  const top = rgbToHex(base);
  const inkRgb = hexToRgb(ROLE_DARK_INK) ?? BLACK;
  // Deepen the bottom only as far as the dark ink still reads on it with room for softening.
  let bottomRgb = base;
  for (let amount = 0.22; amount >= 0; amount -= 0.02) {
    bottomRgb = mixRgb(base, BLACK, amount);
    if (contrastRatio(mixRgb(inkRgb, base, 0.12), bottomRgb) >= 4.8) break;
  }
  const bottom = rgbToHex(bottomRgb);
  const soft = enforceContrast(rgbToHex(mixRgb(inkRgb, base, 0.12)), bottom, 4.5).color;
  return { top, bottom, ink: ROLE_DARK_INK, secondary: soft, tertiary: soft };
}

export function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  const t = Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0));
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  };
}

export function contrastingInk(background: string): "#000000" | "#ffffff" {
  const bg = hexToRgb(background) ?? WHITE;
  return contrastRatio(BLACK, bg) >= contrastRatio(WHITE, bg) ? "#000000" : "#ffffff";
}

/** sRGB from a hue in degrees. Used to keep role colors apart after a contrast fix. */
export function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const h = ((hue % 360) + 360) % 360 / 60;
  const s = Math.max(0, Math.min(1, saturation));
  const l = Math.max(0, Math.min(1, lightness));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 1) {
    r = c;
    g = x;
  } else if (h < 2) {
    r = x;
    g = c;
  } else if (h < 3) {
    g = c;
    b = x;
  } else if (h < 4) {
    g = x;
    b = c;
  } else if (h < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/**
 * If neither black nor white text can clear `minimum` on this background,
 * move the background toward white or black until one of them can.
 */
export function liftBackground(background: string, minimum: number): ContrastFix {
  const bg = hexToRgb(background) ?? WHITE;
  const canonical = rgbToHex(bg);
  const floor = Number.isFinite(minimum) && minimum > 1 ? minimum : 4.5;
  const blackRatio = contrastRatio(BLACK, bg);
  const whiteRatio = contrastRatio(WHITE, bg);
  const best = Math.max(blackRatio, whiteRatio);
  if (best + 1e-6 >= floor) return { color: canonical, ratio: best, adjusted: false };
  const target = blackRatio >= whiteRatio ? WHITE : BLACK;
  let lo = 0;
  let hi = 1;
  let chosen = target;
  for (let step = 0; step < 18; step += 1) {
    const mid = (lo + hi) / 2;
    const mixed = mixRgb(bg, target, mid);
    const ratio = Math.max(contrastRatio(BLACK, mixed), contrastRatio(WHITE, mixed));
    if (ratio >= floor) {
      chosen = mixed;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  let color = rgbToHex(chosen);
  let ratio = Math.max(
    contrastRatio(BLACK, hexToRgb(color) ?? chosen),
    contrastRatio(WHITE, hexToRgb(color) ?? chosen),
  );
  if (ratio + 1e-6 < floor) {
    color = rgbToHex(target);
    ratio = Math.max(contrastRatio(BLACK, target), contrastRatio(WHITE, target));
  }
  return { color, ratio, adjusted: color !== canonical };
}

export type ContrastFix = { color: string; ratio: number; adjusted: boolean };

/**
 * Move `foreground` toward black or white until it clears `minimum` against
 * `background`. The direction is the one with more room. Rounding that falls
 * short lands on that pure ink.
 */
export function enforceContrast(foreground: string, background: string, minimum: number): ContrastFix {
  const bg = hexToRgb(background) ?? WHITE;
  const parsed = hexToRgb(foreground);
  const fg = parsed ?? BLACK;
  const floor = Number.isFinite(minimum) && minimum > 1 ? minimum : 4.5;
  const canonical = rgbToHex(fg);
  if (parsed && contrastRatio(fg, bg) + 1e-6 >= floor) {
    const ratio = contrastRatio(hexToRgb(canonical) ?? fg, bg);
    return { color: canonical, ratio, adjusted: false };
  }
  const target = contrastRatio(BLACK, bg) >= contrastRatio(WHITE, bg) ? BLACK : WHITE;
  let best = target;
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 18; step += 1) {
    const mid = (lo + hi) / 2;
    const mixed = mixRgb(fg, target, mid);
    if (contrastRatio(mixed, bg) >= floor) {
      best = mixed;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  let color = rgbToHex(best);
  let ratio = contrastRatio(hexToRgb(color) ?? best, bg);
  if (ratio + 1e-6 < floor) {
    color = rgbToHex(target);
    ratio = contrastRatio(target, bg);
  }
  return { color, ratio, adjusted: color !== canonical };
}

/** Contrast of `text` on `surface` composited over pure black and pure white. */
export function worstCaseContrast(surface: string, text: string, transparency: number): number {
  const panel = hexToRgb(surface);
  const ink = hexToRgb(text);
  if (!panel || !ink) return 1;
  const showThrough = Math.max(0, Math.min(1, Number.isFinite(transparency) ? transparency : 1));
  const overBlack = contrastRatio(ink, mixRgb(panel, BLACK, showThrough));
  const overWhite = contrastRatio(ink, mixRgb(panel, WHITE, showThrough));
  return Math.min(overBlack, overWhite);
}

/**
 * Largest transparency in `0..requested` whose panel still clears `minimum`
 * over both a black and a white wallpaper. Never reads the image.
 */
export function clampTransparency(
  surface: string,
  text: string,
  transparency: number,
  minimum: number,
): number {
  const requested = Math.max(0, Math.min(1, Number.isFinite(transparency) ? transparency : 0));
  const floor = Number.isFinite(minimum) && minimum > 1 ? minimum : 4.5;
  if (worstCaseContrast(surface, text, requested) + 1e-6 >= floor) return round4(requested);
  let lo = 0;
  let hi = requested;
  let best = 0;
  for (let step = 0; step < 18; step += 1) {
    const mid = (lo + hi) / 2;
    if (worstCaseContrast(surface, text, mid) + 1e-6 >= floor) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  let value = round4(best);
  while (value > 0 && worstCaseContrast(surface, text, value) + 1e-6 < floor) {
    value = round4(Math.max(0, value - 0.0001));
  }
  return value;
}
