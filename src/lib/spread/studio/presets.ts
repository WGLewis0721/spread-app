/**
 * Studio starter looks are bundled configurations, not a theme marketplace.
 * All artwork is user-selected and stored only through the existing local asset store.
 * The planner data model never enters this module.
 */
import { originalStudioAppearance, parseStudioAppearance, type StudioAppearanceV1 } from "./contract.ts";

export type StudioStarterId = "personal" | "retro" | "glass";
export type StudioStarter = {
  id: StudioStarterId;
  label: string;
  description: string;
  appearance: StudioAppearanceV1;
};

const original = originalStudioAppearance();

export const STUDIO_STARTERS: readonly StudioStarter[] = [
  {
    id: "personal",
    label: "Personal Canvas",
    description: "Your photo, warm paper and editorial type.",
    appearance: {
      ...original,
      id: "studio-personal",
      name: "Personal Canvas",
      mode: "light",
      wallpaper: { ...original.wallpaper, dim: 0.14 },
      palette: { accent: "#80592f", surface: "#fff9f0", text: "#261d17", secondaryText: "#625347" },
      material: { treatment: "matte", transparency: 0.08, depth: 0.22 },
      typography: { presetId: "editorial", scale: 1.03, numeralEmphasis: 0.4 },
      controls: { density: "comfortable", treatmentId: "original" },
      effects: { decorationIntensity: 0.12, animationIntensity: 0.18 },
    },
  },
  {
    id: "retro",
    label: "Retro Desk",
    description: "Vintage desktop geometry and crisp monospace.",
    appearance: {
      ...original,
      id: "studio-retro",
      name: "Retro Desk",
      mode: "light",
      palette: { accent: "#285a52", surface: "#f6efdb", text: "#242823", secondaryText: "#4a5047" },
      material: { treatment: "flat", transparency: 0, depth: 0 },
      typography: { presetId: "mono", scale: 1, numeralEmphasis: 0.65 },
      controls: { density: "comfortable", treatmentId: "desktop" },
      effects: { decorationIntensity: 0, animationIntensity: 0.12 },
    },
  },
  {
    id: "glass",
    label: "Clear Glass",
    description: "Luminous layers with bold, readable numbers.",
    appearance: {
      ...original,
      id: "studio-glass",
      name: "Clear Glass",
      mode: "dark",
      palette: { accent: "#a0d7ff", surface: "#1b293b", text: "#f9fbff", secondaryText: "#d4e0f0" },
      material: { treatment: "glass", transparency: 0.18, depth: 0.65 },
      typography: { presetId: "system", scale: 1.04, numeralEmphasis: 0.8 },
      controls: { density: "comfortable", treatmentId: "soft-glass" },
      effects: { decorationIntensity: 0.24, animationIntensity: 0.2 },
    },
  },
];

/** A starter never clears a personal wallpaper or invents one. */
export function appearanceFromStarter(
  id: StudioStarterId,
  current: StudioAppearanceV1,
): StudioAppearanceV1 {
  const starter = STUDIO_STARTERS.find((entry) => entry.id === id);
  if (!starter) return current;
  const next = {
    ...starter.appearance,
    ...(current.wallpaperAssetId ? {
      wallpaperAssetId: current.wallpaperAssetId,
      wallpaper: { ...current.wallpaper },
    } : {}),
  };
  const read = parseStudioAppearance(next);
  return read.ok ? read.value : current;
}
