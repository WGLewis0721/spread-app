/**
 * User-authored sample settings for tests and screenshot evidence.
 * Names describe the material controls. They are user-authored samples.
 */

import {
  originalStudioAppearance,
  type MaterialTreatment,
  type StudioAppearanceV1,
  type StudioMode,
} from "./contract.ts";

export const SAMPLE_WIDTHS = [390, 820, 1440] as const;
export const SAMPLE_SCHEMES = ["light", "dark"] as const;
export const SAMPLE_WALLPAPER_ID = "wall-1";

type SchemeName = (typeof SAMPLE_SCHEMES)[number];

const PALETTES: Record<MaterialTreatment, Record<SchemeName, StudioAppearanceV1["palette"]>> = {
  flat: {
    light: { accent: "#0b3a82", surface: "#f4f1ea", text: "#1a1a1a", secondaryText: "#4a463f" },
    dark: { accent: "#9ec1ff", surface: "#161616", text: "#f3f3f3", secondaryText: "#c8c8c8" },
  },
  glass: {
    light: { accent: "#0e6e6a", surface: "#f7fbfb", text: "#10211f", secondaryText: "#3d5552" },
    dark: { accent: "#8ef0e6", surface: "#1a2428", text: "#f4fbfa", secondaryText: "#c5d5d2" },
  },
  matte: {
    light: { accent: "#6b4f2a", surface: "#e6e1d6", text: "#241c14", secondaryText: "#5c5146" },
    dark: { accent: "#e2c39a", surface: "#2a261f", text: "#f7f3ea", secondaryText: "#d5cdc0" },
  },
  metal: {
    light: { accent: "#8a3e12", surface: "#d5d8dd", text: "#14181d", secondaryText: "#3e4650" },
    dark: { accent: "#ffb088", surface: "#2a2e33", text: "#f6f7f8", secondaryText: "#d5dbe3" },
  },
};

export function sampleAppearance(
  treatment: MaterialTreatment,
  scheme: SchemeName,
): StudioAppearanceV1 {
  const base = originalStudioAppearance();
  const mode: StudioMode = scheme;
  return {
    ...base,
    id: `${treatment}-sample`,
    name: `${treatment} sample`,
    mode,
    wallpaperAssetId: SAMPLE_WALLPAPER_ID,
    wallpaper: {
      fit: "cover",
      positionX: 50,
      positionY: 40,
      dim: treatment === "flat" ? 0.2 : 0.45,
      blur: treatment === "glass" ? 8 : 0,
    },
    palette: PALETTES[treatment][scheme],
    material: {
      treatment,
      transparency: treatment === "glass" ? 0.42 : treatment === "metal" ? 0.12 : treatment === "matte" ? 0.08 : 0,
      depth: treatment === "flat" ? 0 : treatment === "glass" ? 0.55 : treatment === "matte" ? 0.8 : 1,
    },
    typography: { presetId: "system", scale: 1, numeralEmphasis: treatment === "flat" ? 0 : 0.65 },
    controls: { density: "comfortable", treatmentId: "original" },
    effects: { decorationIntensity: treatment === "flat" ? 0 : 0.35, animationIntensity: 0 },
  };
}
