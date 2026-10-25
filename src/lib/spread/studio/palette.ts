/**
 * Deterministic palette sampler.
 *
 * Pure function of RGBA pixels. No randomness, no network, no theme packs.
 * Suggestions are contrast-checked against WCAG relative luminance.
 * Read against contract 432b7c245d9dae3e1eb9a18aac6ba6921f0158c6.
 */
import { originalStudioAppearance, type StudioPalette } from "./contract.ts";

export const TEXT_CONTRAST = 4.5;
export const ACCENT_CONTRAST = 3;

export type PaletteSuggestion = {
  palette: StudioPalette;
  contrast: { text: number; secondaryText: number; accent: number };
};

type RGB = { r: number; g: number; b: number };

const INK: RGB = { r: 0x1d, g: 0x1d, b: 0x1f };
const PAPER: RGB = { r: 0xf5, g: 0xf5, b: 0xf7 };
const DARK_SURFACE: RGB = { r: 0x1c, g: 0x1c, b: 0x1e };
const LIGHT_SURFACE: RGB = { r: 0xf5, g: 0xf5, b: 0xf7 };
const ORIGINAL_ACCENT: RGB = { r: 0x00, g: 0x7a, b: 0xff };

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexChannel(value: number): string {
  return clampChannel(value).toString(16).padStart(2, "0");
}

export function rgbToHex(rgb: RGB): string {
  return `#${hexChannel(rgb.r)}${hexChannel(rgb.g)}${hexChannel(rgb.b)}`;
}

export function hexToRgb(hex: string): RGB | null {
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return relativeLuminanceRgb(rgb);
}

function relativeLuminanceRgb(rgb: RGB): number {
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

/** WCAG contrast ratio. Order does not matter. Invalid hex yields 1. */
export function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastRgb(first: RGB, second: RGB): number {
  return contrastRatio(rgbToHex(first), rgbToHex(second));
}

function mix(first: RGB, second: RGB, amount: number): RGB {
  return {
    r: first.r + (second.r - first.r) * amount,
    g: first.g + (second.g - first.g) * amount,
    b: first.b + (second.b - first.b) * amount,
  };
}

function scale(rgb: RGB, factor: number): RGB {
  return { r: rgb.r * factor, g: rgb.g * factor, b: rgb.b * factor };
}

function saturation(rgb: RGB): number {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  if (max === 0) return 0;
  return (max - min) / max;
}

export function sampleStep(width: number, height: number): number {
  const pixels = width * height;
  if (pixels <= 4096) return 1;
  return Math.max(1, Math.ceil(Math.sqrt(pixels / 4096)));
}

type Bucket = { key: number; count: number; mean: RGB };

function quantize(rgba: Uint8ClampedArray, width: number, height: number): Bucket[] {
  const step = sampleStep(width, height);
  const totals = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      if (rgba[index + 3] < 128) continue;
      const key =
        ((rgba[index] >> 4) << 8) | ((rgba[index + 1] >> 4) << 4) | (rgba[index + 2] >> 4);
      const current = totals.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      current.count += 1;
      current.r += rgba[index];
      current.g += rgba[index + 1];
      current.b += rgba[index + 2];
      totals.set(key, current);
    }
  }
  const buckets: Bucket[] = [];
  for (const [key, total] of totals) {
    buckets.push({
      key,
      count: total.count,
      mean: { r: total.r / total.count, g: total.g / total.count, b: total.b / total.count },
    });
  }
  buckets.sort((left, right) => right.count - left.count || left.key - right.key);
  return buckets;
}

function nudge(color: RGB, surface: RGB, minimum: number): RGB {
  let current = color;
  for (let step = 0; step < 24; step += 1) {
    if (contrastRgb(current, surface) >= minimum) return current;
    const lighter = scale(current, 1.15);
    const darker = scale(current, 0.85);
    const next = contrastRgb(lighter, surface) >= contrastRgb(darker, surface) ? lighter : darker;
    if (contrastRgb(next, surface) <= contrastRgb(current, surface) + 0.001) break;
    current = next;
  }
  let towardWhite = current;
  let towardBlack = current;
  for (let step = 0; step < 16; step += 1) {
    if (contrastRgb(towardWhite, surface) >= minimum) return towardWhite;
    if (contrastRgb(towardBlack, surface) >= minimum) return towardBlack;
    towardWhite = mix(towardWhite, { r: 255, g: 255, b: 255 }, 0.18);
    towardBlack = mix(towardBlack, { r: 0, g: 0, b: 0 }, 0.18);
  }
  return contrastRgb(towardWhite, surface) >= contrastRgb(towardBlack, surface)
    ? towardWhite
    : towardBlack;
}

function safeSurface(dominant: RGB): { surface: RGB; text: RGB } {
  const toward = relativeLuminanceRgb(dominant) >= 0.45 ? LIGHT_SURFACE : DARK_SURFACE;
  let surface = mix(dominant, toward, 0.72);
  for (let step = 0; step < 24; step += 1) {
    const onDark = contrastRgb(INK, surface);
    const onLight = contrastRgb(PAPER, surface);
    const text = onDark >= onLight ? INK : PAPER;
    if (Math.max(onDark, onLight) >= TEXT_CONTRAST) return { surface, text };
    surface = mix(surface, text === INK ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }, 0.2);
  }
  return { surface: { r: 255, g: 255, b: 255 }, text: INK };
}

function secondaryFor(text: RGB, surface: RGB): RGB {
  let current = mix(text, surface, 0.35);
  for (let step = 0; step < 20; step += 1) {
    if (contrastRgb(current, surface) >= TEXT_CONTRAST) return current;
    current = mix(current, text, 0.3);
  }
  return text;
}

function suggestion(palette: StudioPalette): PaletteSuggestion {
  return {
    palette,
    contrast: {
      text: contrastRatio(palette.text, palette.surface),
      secondaryText: contrastRatio(palette.secondaryText, palette.surface),
      accent: contrastRatio(palette.accent, palette.surface),
    },
  };
}

function originalSuggestion(): PaletteSuggestion {
  return suggestion(originalStudioAppearance().palette);
}

/**
 * Sample a wallpaper and suggest accent, surface, and text colors.
 * The same pixels always produce the same suggestion. Transparent pixels are ignored.
 * An empty image returns the original Spread palette.
 */
export function suggestPalette(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): PaletteSuggestion {
  if (width < 1 || height < 1 || rgba.length < width * height * 4) return originalSuggestion();
  const buckets = quantize(rgba, width, height);
  const dominant = buckets[0];
  if (!dominant) return originalSuggestion();
  const { surface, text } = safeSurface(dominant.mean);
  const chromatic = buckets.filter((bucket) => saturation(bucket.mean) >= 0.2);
  chromatic.sort(
    (left, right) =>
      saturation(right.mean) - saturation(left.mean) ||
      right.count - left.count ||
      left.key - right.key,
  );
  const accentSource = chromatic[0]?.mean ?? ORIGINAL_ACCENT;
  let accent = nudge(accentSource, surface, ACCENT_CONTRAST);
  if (contrastRgb(accent, surface) < ACCENT_CONTRAST)
    accent = nudge(ORIGINAL_ACCENT, surface, ACCENT_CONTRAST);
  if (contrastRgb(accent, surface) < ACCENT_CONTRAST) {
    accent = contrastRgb(INK, surface) >= ACCENT_CONTRAST ? INK : PAPER;
  }
  const secondary = secondaryFor(text, surface);
  const palette: StudioPalette = {
    accent: rgbToHex(accent),
    surface: rgbToHex(surface),
    text: rgbToHex(text),
    secondaryText: rgbToHex(secondary),
  };
  return suggestion(palette);
}
