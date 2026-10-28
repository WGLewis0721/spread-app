/**
 * StudioAppearanceV1 -> bounded CSS variables for one wrapper element.
 * Pure module: relative imports, no JSX, no DOM, no storage, no network.
 * Does not write the planner theme attribute. Image pixels are not accepted.
 * Read against studio-contract 432b7c245d9dae3e1eb9a18aac6ba6921f0158c6.
 */

import {
  MATERIAL_TREATMENTS,
  STUDIO_LIMITS,
  CONTROL_DENSITIES,
  CONTROL_TREATMENT_IDS,
  STUDIO_ELEMENT_PARTS,
  STUDIO_ELEMENT_STYLES,
  TYPOGRAPHY_PRESET_IDS,
  WALLPAPER_FITS,
  originalStudioAppearance,
  parseStudioAppearance,
  studioAppearanceOrDefault,
  type ControlDensity,
  type ControlTreatmentId,
  type StudioElementPart,
  type StudioElementStyle,
  type MaterialTreatment,
  type TypographyPresetId,
  type StudioAppearanceV1,
  type StudioMode,
  type WallpaperFit,
} from "./contract.ts";
import {
  clampTransparency,
  contrastingInk,
  contrastRatioHex,
  enforceContrast,
  hexToRgb,
  hslToRgb,
  liftBackground,
  mixRgb,
  normalizeHex,
  relativeLuminance,
  rgbToHex,
  round4,
  type Rgb,
} from "./contrast.ts";
import {
  MOTION_MAX_MS,
  SHIPPED_DARK,
  SHIPPED_FONT_SANS,
  SHIPPED_LIGHT,
  STUDIO_MIN_TARGET_PX,
  shippedRoleColors,
} from "./theme.ts";

export type StudioScheme = "light" | "dark";

export type StudioWallpaperHandle = {
  assetId: string;
  url: string;
};

export type StudioMaterialGates = {
  glass: boolean;
  matte: boolean;
  metal: boolean;
};

export type StudioResolveInput = {
  enabled: boolean;
  appearance?: unknown;
  /** When set, the catalog is the only source. An unknown id is the original look. */
  lookupId?: string;
  catalog?: readonly StudioAppearanceV1[];
  wallpaper?: StudioWallpaperHandle | null;
  systemScheme?: StudioScheme;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  moreContrast?: boolean;
  /** Each advanced treatment can be turned off on its own. Omitted means allowed. */
  gates?: Partial<StudioMaterialGates>;
};

export type StudioScope = {
  applied: boolean;
  attribute: string | null;
  material: MaterialTreatment;
  requestedMaterial: MaterialTreatment;
  scheme: StudioScheme;
  density: ControlDensity;
  controls: ControlTreatmentId;
  parts: Record<StudioElementPart, Exclude<StudioElementStyle, "inherit">>;
  style: Record<string, string>;
  warnings: string[];
  wallpaper: string | null;
};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
const BLOB_URL = /^blob:[A-Za-z0-9][A-Za-z0-9:/._~%-]{0,2000}$/;
const LOCAL_ASSET = /^\/studio-assets\/[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

const ROLE_KEYS = shippedRoleColors().map((_, index) => `--studio-role-${index + 1}`);

export const STUDIO_STYLE_KEYS = [
  "--canvas",
  "--elevated",
  "--ink",
  "--secondary",
  "--tertiary",
  "--line",
  "--fill",
  "--segment",
  "--accent",
  "--on-accent",
  "--danger",
  "--on-danger",
  "--caution",
  "--glass",
  "--glass-stroke",
  "--glass-line",
  "--scrim",
  "--shadow",
  "--font-sans",
  "--studio-type-scale",
  "--studio-numeral-weight",
  "--studio-numeral-tracking",
  "--studio-density-space",
  "--studio-target-min",
  "--studio-transparency",
  "--studio-panel",
  "--studio-depth",
  "--studio-decoration",
  "--studio-motion-ms",
  "--studio-blur",
  "--studio-wallpaper-image",
  "--studio-wallpaper-size",
  "--studio-wallpaper-position",
  "--studio-wallpaper-blur",
  "--studio-scrim",
  "--studio-metal-hi",
  "--studio-metal-lo",
  "--studio-matte-line",
  "--studio-highlight",
  "--studio-sheet",
  "--studio-sheet-panel",
  "--studio-sheet-panel-full",
  "--studio-focus",
  "--studio-heading-font",
  "--studio-card-shadow",
  "--studio-on-highlight",
  ...ROLE_KEYS,
  "--studio-status-done",
  "--studio-status-danger",
  "--studio-status-caution",
  "--studio-status-accent",
] as const;

export function formatCssNumber(value: number): string {
  return String(round4(value));
}

export function isSafeWallpaperUrl(url: string): boolean {
  if (typeof url !== "string" || url.length < 1 || url.length > 2048) return false;
  return BLOB_URL.test(url) || LOCAL_ASSET.test(url);
}

export function appearanceForId(id: string, catalog: readonly StudioAppearanceV1[]): StudioAppearanceV1 {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return originalStudioAppearance();
  const found = catalog.find((item) => item && item.id === id);
  if (!found) return originalStudioAppearance();
  const parsed = parseStudioAppearance(found);
  return parsed.ok ? parsed.value : originalStudioAppearance();
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Clamp a value that skipped the contract parser. Valid appearances are unchanged. */
export function boundAppearance(appearance: StudioAppearanceV1): StudioAppearanceV1 {
  const fallback = originalStudioAppearance();
  const color = (value: string, backup: string) => normalizeHex(value) ?? backup;
  return {
    version: 1,
    id: ID_PATTERN.test(appearance.id) ? appearance.id : fallback.id,
    name: appearance.name || fallback.name,
    mode: oneOf(appearance.mode, ["system", "light", "dark"] as const, fallback.mode),
    ...(appearance.wallpaperAssetId && ID_PATTERN.test(appearance.wallpaperAssetId)
      ? { wallpaperAssetId: appearance.wallpaperAssetId }
      : {}),
    wallpaper: {
      fit: oneOf<WallpaperFit>(appearance.wallpaper?.fit, WALLPAPER_FITS, "cover"),
      positionX: clampNumber(appearance.wallpaper?.positionX, 0, STUDIO_LIMITS.positionMax, 50),
      positionY: clampNumber(appearance.wallpaper?.positionY, 0, STUDIO_LIMITS.positionMax, 50),
      dim: clampNumber(appearance.wallpaper?.dim, 0, STUDIO_LIMITS.unitMax, 0),
      blur: clampNumber(appearance.wallpaper?.blur, 0, STUDIO_LIMITS.blurMax, 0),
      ...(typeof appearance.wallpaper?.focusY === "number"
        ? { focusY: clampNumber(appearance.wallpaper.focusY, 0, STUDIO_LIMITS.unitMax, 0.5) }
        : {}),
    },
    palette: {
      accent: color(appearance.palette?.accent, fallback.palette.accent),
      surface: color(appearance.palette?.surface, fallback.palette.surface),
      text: color(appearance.palette?.text, fallback.palette.text),
      secondaryText: color(appearance.palette?.secondaryText, fallback.palette.secondaryText),
      ...(appearance.palette?.highlight ? { highlight: color(appearance.palette.highlight, "#ff8a24") } : {}),
      ...(appearance.palette?.sheet ? { sheet: color(appearance.palette.sheet, fallback.palette.surface) } : {}),
    },
    material: {
      treatment: oneOf<MaterialTreatment>(appearance.material?.treatment, MATERIAL_TREATMENTS, "flat"),
      transparency: clampNumber(appearance.material?.transparency, 0, STUDIO_LIMITS.unitMax, 0),
      depth: clampNumber(appearance.material?.depth, 0, STUDIO_LIMITS.unitMax, 0),
    },
    typography: {
      presetId: oneOf<TypographyPresetId>(appearance.typography?.presetId, TYPOGRAPHY_PRESET_IDS, "system"),
      scale: clampNumber(
        appearance.typography?.scale,
        STUDIO_LIMITS.scaleMin,
        STUDIO_LIMITS.scaleMax,
        1,
      ),
      numeralEmphasis: clampNumber(appearance.typography?.numeralEmphasis, 0, STUDIO_LIMITS.unitMax, 0),
    },
    controls: {
      density: oneOf<ControlDensity>(appearance.controls?.density, CONTROL_DENSITIES, "comfortable"),
      treatmentId: oneOf<ControlTreatmentId>(appearance.controls?.treatmentId, CONTROL_TREATMENT_IDS, "original"),
      ...(appearance.controls?.parts ? {
        parts: Object.fromEntries(STUDIO_ELEMENT_PARTS.map((part) => [part,
          oneOf<StudioElementStyle>(appearance.controls.parts?.[part] ?? "inherit", STUDIO_ELEMENT_STYLES, "inherit"),
        ])) as Record<StudioElementPart, StudioElementStyle>,
      } : {}),
    },
    effects: {
      decorationIntensity: clampNumber(appearance.effects?.decorationIntensity, 0, STUDIO_LIMITS.unitMax, 0),
      animationIntensity: clampNumber(appearance.effects?.animationIntensity, 0, STUDIO_LIMITS.unitMax, 0),
    },
  };
}


/** Part selection is allowlisted and falls back to the whole-UI treatment. */
export function effectiveStudioParts(
  appearance: StudioAppearanceV1,
): Record<StudioElementPart, Exclude<StudioElementStyle, "inherit">> {
  const defaultStyle: Exclude<StudioElementStyle, "inherit"> =
    appearance.controls.treatmentId === "desktop" ? "outline" :
    appearance.controls.treatmentId === "soft-glass" ? "glass" :
    appearance.controls.treatmentId === "illustrated" ? "comic" : "original";
  const result = {} as Record<StudioElementPart, Exclude<StudioElementStyle, "inherit">>;
  for (const part of STUDIO_ELEMENT_PARTS) {
    const requested = appearance.controls.parts?.[part];
    result[part] = requested && requested !== "inherit" && STUDIO_ELEMENT_STYLES.includes(requested)
      ? requested : defaultStyle;
  }
  return result;
}

export function effectiveMaterial(
  treatment: MaterialTreatment,
  reducedTransparency: boolean,
  gates: StudioMaterialGates,
): MaterialTreatment {
  if (treatment === "flat") return "flat";
  if (reducedTransparency) return "flat";
  if (treatment === "glass" && !gates.glass) return "flat";
  if (treatment === "matte" && !gates.matte) return "flat";
  if (treatment === "metal" && !gates.metal) return "flat";
  return treatment;
}

export function resolveScheme(mode: StudioMode, systemScheme: StudioScheme): StudioScheme {
  if (mode === "light" || mode === "dark") return mode;
  return systemScheme === "dark" ? "dark" : "light";
}

function inactiveScope(scheme: StudioScheme): StudioScope {
  return {
    applied: false,
    attribute: null,
    material: "flat",
    requestedMaterial: "flat",
    scheme,
    density: "comfortable",
    controls: "original",
    parts: { crown: "original", responsibilities: "original", week: "original", tasks: "original", dock: "original" },
    style: {},
    warnings: [],
    wallpaper: null,
  };
}

function selectAppearance(input: StudioResolveInput): StudioAppearanceV1 {
  if (typeof input.lookupId === "string") return appearanceForId(input.lookupId, input.catalog ?? []);
  if (input.appearance === undefined) return originalStudioAppearance();
  return studioAppearanceOrDefault(input.appearance);
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${formatCssNumber(alpha)})`;
}

function mixHex(from: string, to: string, amount: number): string {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  if (!start || !end) return from;
  return rgbToHex(mixRgb(start, end, amount));
}

function fitAccent(
  accent: string,
  surface: string,
  minimum: number,
): { accent: string; onAccent: string; adjusted: boolean } {
  const first = enforceContrast(accent, surface, minimum);
  const ink = contrastingInk(first.color);
  const inkRatio = contrastRatioHex(ink, first.color) ?? 1;
  if (inkRatio + 1e-6 >= minimum) {
    return { accent: first.color, onAccent: ink, adjusted: first.adjusted };
  }
  const start = hexToRgb(first.color) ?? { r: 0, g: 0, b: 0 };
  const goalHex = ink === "#ffffff" ? "#000000" : "#ffffff";
  const goal = hexToRgb(goalHex) as Rgb;
  let found: Rgb | null = null;
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 18; step += 1) {
    const mid = (lo + hi) / 2;
    const mixed = mixRgb(start, goal, mid);
    const color = rgbToHex(mixed);
    const on = contrastingInk(color);
    const onRatio = contrastRatioHex(on, color) ?? 1;
    const surfaceRatio = contrastRatioHex(color, surface) ?? 1;
    if (onRatio >= minimum && surfaceRatio >= minimum) {
      found = mixed;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  if (!found) {
    const onSurface = contrastingInk(surface);
    const solid = onSurface === "#000000" ? "#000000" : "#ffffff";
    return { accent: solid, onAccent: contrastingInk(solid), adjusted: true };
  }
  const color = rgbToHex(found);
  const on = contrastingInk(color);
  if ((contrastRatioHex(on, color) ?? 1) + 1e-6 < minimum || (contrastRatioHex(color, surface) ?? 1) + 1e-6 < minimum) {
    const onSurface = contrastingInk(surface);
    const solid = onSurface === "#000000" ? "#000000" : "#ffffff";
    return { accent: solid, onAccent: contrastingInk(solid), adjusted: true };
  }
  return { accent: color, onAccent: on, adjusted: true };
}

function distinctRoles(colors: readonly string[], surface: string, minimum: number): string[] {
  const used: string[] = [];
  return colors.map((color, index) => {
    let next = enforceContrast(normalizeHex(color) ?? SHIPPED_LIGHT.ink, surface, minimum).color;
    let guard = 0;
    while (used.includes(next) && guard < 12) {
      const hue = (index * 51 + guard * 27) % 360;
      const seed = rgbToHex(hslToRgb(hue, 0.82, 0.38));
      next = enforceContrast(seed, surface, minimum).color;
      guard += 1;
    }
    used.push(next);
    return next;
  });
}

function cssUrl(url: string | null): string {
  if (!url) return "none";
  return `url("${url}")`;
}

function cssValueIsSafe(value: string): boolean {
  if (/javascript:|expression\(|@import|<|data:/i.test(value)) return false;
  if (/url\(\s*"https?:/i.test(value)) return false;
  if (/url\(\s*"http:/i.test(value)) return false;
  if (value.includes("NaN") || value.includes("Infinity")) return false;
  return true;
}

function resolveWallpaper(
  appearance: StudioAppearanceV1,
  handle: StudioWallpaperHandle | null | undefined,
  warnings: string[],
): string | null {
  if (!appearance.wallpaperAssetId) return null;
  if (!handle) return null;
  if (handle.assetId !== appearance.wallpaperAssetId || !isSafeWallpaperUrl(handle.url)) {
    warnings.push("Wallpaper handle was ignored.");
    return null;
  }
  return handle.url;
}

/**
 * Keep the canvas shift only while the ink that is actually drawn still clears
 * `floor` on it. The check is that rendered ink against the canvas, not a
 * provisional ink against the surface.
 */
function canvasForRenderedInk(shifted: string, surface: string, inks: readonly string[], floor: number): string {
  const allClear = (plate: string) =>
    inks.every((ink) => (contrastRatioHex(ink, plate) ?? 1) + 1e-6 >= floor);
  if (allClear(shifted)) return shifted;
  const from = hexToRgb(surface);
  const to = hexToRgb(shifted);
  if (!from || !to) return surface;
  let lo = 0;
  let hi = 1;
  let best = surface;
  for (let step = 0; step < 18; step += 1) {
    const mid = (lo + hi) / 2;
    const color = rgbToHex(mixRgb(from, to, mid));
    if (allClear(color)) {
      best = color;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (!allClear(best)) return surface;
  return best;
}

/**
 * The saved palette is the user's LIGHT-side color source. StudioAppearanceV1
 * has one palette, not parallel light/dark swatches. Derive a hue-preserving
 * dark surface rather than showing white cards under a dark inherited scheme.
 * Already-dark custom surfaces are kept unchanged.
 */
function surfaceForScheme(surface: string, scheme: StudioScheme): string {
  if (scheme === "light") return surface;
  const rgb = hexToRgb(surface);
  if (!rgb || relativeLuminance(rgb) <= 0.12) return surface;
  return mixHex(surface, "#000000", 0.85);
}

function materialLabel(treatment: MaterialTreatment): string {
  if (treatment === "glass") return "Glass";
  if (treatment === "matte") return "Matte";
  if (treatment === "metal") return "Metal";
  return "Flat";
}

/**
 * Map one appearance onto a closed set of CSS variables.
 * Flag off, the original id, and an unknown catalog id produce an empty style
 * so the shipped stylesheet stays in charge. Variables are scoped by the caller.
 */
export function resolveStudioScope(input: StudioResolveInput): StudioScope {
  const systemScheme: StudioScheme = input.systemScheme === "dark" ? "dark" : "light";
  if (input.enabled !== true) return inactiveScope(systemScheme);

  const selected = selectAppearance(input);
  const scheme = resolveScheme(selected.mode, systemScheme);
  if (selected.id === "original") {
    const quiet = inactiveScope(scheme);
    quiet.density = selected.controls.density;
    return quiet;
  }

  const appearance = boundAppearance(selected);
  if (appearance.id === "original") return inactiveScope(scheme);

  const warnings: string[] = [];
  const reducedMotion = input.reducedMotion === true;
  const reducedTransparency = input.reducedTransparency === true;
  const moreContrast = input.moreContrast === true;
  const gates: StudioMaterialGates = {
    glass: input.gates?.glass !== false,
    matte: input.gates?.matte !== false,
    metal: input.gates?.metal !== false,
  };
  const requestedMaterial = appearance.material.treatment;
  const material = effectiveMaterial(requestedMaterial, reducedTransparency, gates);
  const floors = moreContrast ? { text: 7, ui: 4.5 } : { text: 4.5, ui: 3 };
  const lifted = liftBackground(surfaceForScheme(appearance.palette.surface, scheme), floors.text);
  const surface = lifted.color;
  const textFix = enforceContrast(appearance.palette.text, surface, floors.text);
  const secondaryFix = enforceContrast(appearance.palette.secondaryText, surface, floors.text);
  const accentFit = fitAccent(appearance.palette.accent, surface, floors.text);
  const text = textFix.color;
  const secondary = secondaryFix.color;
  const lum = relativeLuminance(hexToRgb(surface) ?? { r: 255, g: 255, b: 255 });
  const shiftedCanvas = mixHex(surface, lum > 0.45 ? "#000000" : "#ffffff", 0.08);
  const canvas = canvasForRenderedInk(shiftedCanvas, surface, [text, secondary], floors.text);
  const tertiary = enforceContrast(mixHex(secondary, surface, 0.35), surface, floors.ui).color;
  const dangerSeed = scheme === "dark" ? SHIPPED_DARK.danger : SHIPPED_LIGHT.danger;
  const cautionSeed = scheme === "dark" ? SHIPPED_DARK.caution : SHIPPED_LIGHT.caution;
  const done = enforceContrast("#34c759", surface, floors.ui).color;
  const danger = enforceContrast(dangerSeed, surface, floors.text).color;
  const caution = enforceContrast(cautionSeed, surface, floors.text).color;
  const onDanger = contrastingInk(danger);
  const roles = distinctRoles(shippedRoleColors(), surface, floors.ui);
  // Retro Desk and Clear Glass are deliberately wallpaper-free compositions. Keep
  // any locally stored image reference intact so choosing Personal Canvas later
  // restores the photo without uploading, reimporting or deleting personal data.
  const wallpaper = appearance.id === "studio-retro" || appearance.id === "studio-glass"
    ? null
    : resolveWallpaper(appearance, input.wallpaper, warnings);
  const requestedTransparency = appearance.material.transparency;
  let transparency = 0;
  if (material !== "flat") {
    const textLimit = clampTransparency(surface, text, requestedTransparency, floors.text);
    const secondaryLimit = clampTransparency(surface, secondary, requestedTransparency, floors.text);
    transparency = Math.min(textLimit, secondaryLimit);
  }
  const panel = round4(1 - transparency);
  const depth = material === "flat" ? 0 : appearance.material.depth;
  const decoration = reducedTransparency ? 0 : appearance.effects.decorationIntensity;
  const motionMs = reducedMotion ? 0 : Math.round(appearance.effects.animationIntensity * MOTION_MAX_MS);
  const blur = material === "glass" ? Math.min(STUDIO_LIMITS.blurMax, round4(6 + depth * 18)) : 0;
  const wallpaperBlur = wallpaper && !reducedTransparency ? appearance.wallpaper.blur : 0;
  const userDim = wallpaper ? appearance.wallpaper.dim : 0;
  // Photo visibility is controlled by the user. Contrast belongs on local text/card plates,
  // never on an auto-inflated full-screen mask that makes their wallpaper disappear.
  const scrimColor = "#000000";
  const scrimAlpha = userDim;
  const metalAmount = depth * 0.35;
  const metalHi = mixHex(surface, "#ffffff", metalAmount);
  const metalLo = mixHex(surface, "#000000", metalAmount);
  const shadowY = round4(8 + depth * 6);
  const shadowBlur = Math.min(24, round4(12 + depth * 12));
  const shadowAlpha = Math.min(0.5, round4((scheme === "dark" ? 0.28 : 0.1) + depth * 0.12));
  const glassAlpha = material === "glass" ? Math.min(0.92, Math.max(0.55, panel)) : 1;
  const numeral = appearance.typography.numeralEmphasis;
  // Sheet tint comes from the wallpaper. It is used only if the drawn ink clears the
  // contrast floor on it; otherwise the card surface is used.
  const sheetSeed = surfaceForScheme(appearance.palette.sheet ?? appearance.palette.surface, scheme);
  const sheetLift = liftBackground(sheetSeed, floors.text);
  const sheet = [text, secondary].every((ink) => (contrastRatioHex(ink, sheetLift.color) ?? 1) + 1e-6 >= floors.text)
    ? sheetLift.color
    : surface;
  // The sheet is the functional layer: translucent by thickness, but never thinner than the ink
  // can bear against the worst backdrop. Full height is more opaque, as Apple's sheets are.
  const sheetTransparency = material === "flat"
    ? 0
    : Math.min(
        clampTransparency(sheet, text, requestedTransparency, floors.text),
        clampTransparency(sheet, secondary, requestedTransparency, floors.text),
      );
  const sheetPanel = round4(1 - sheetTransparency);
  const sheetPanelFull = round4(Math.min(1, sheetPanel + 0.12));
  const onHighlight = contrastingInk(appearance.palette.highlight ?? "#ff8a24");
  const fonts: Record<TypographyPresetId, string> = {
    system: SHIPPED_FONT_SANS,
    editorial: '"Iowan Old Style", "Baskerville", Georgia, serif',
    mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
    display: '"Arial Black", Impact, system-ui, sans-serif',
  };

  if (material !== requestedMaterial) warnings.push(`${materialLabel(requestedMaterial)} was drawn flat.`);
  else if (transparency + 0.0001 < requestedTransparency) warnings.push("Transparency was reduced for contrast.");
  if (lifted.adjusted) warnings.push("Surface color was adjusted for contrast.");
  if (textFix.adjusted || text !== appearance.palette.text) warnings.push("Text color was adjusted for contrast.");
  if (secondaryFix.adjusted) warnings.push("Secondary text color was adjusted for contrast.");
  if (accentFit.adjusted) warnings.push("Accent color was adjusted for contrast.");

  const style: Record<string, string> = {
    "--canvas": canvas,
    "--elevated": surface,
    "--ink": text,
    "--secondary": secondary,
    "--tertiary": tertiary,
    "--line": rgba(text, scheme === "dark" ? 0.35 : 0.16),
    "--fill": rgba(text, scheme === "dark" ? 0.12 : 0.1),
    "--segment": surface,
    "--accent": accentFit.accent,
    "--on-accent": accentFit.onAccent,
    "--danger": danger,
    "--on-danger": enforceContrast(onDanger, danger, floors.text).color,
    "--caution": caution,
    "--glass": rgba(surface, glassAlpha),
    "--glass-stroke": rgba(text, 0.12),
    "--glass-line": rgba("#ffffff", scheme === "dark" ? 0.16 : 0.9),
    "--scrim": rgba("#000000", scheme === "dark" ? 0.5 : 0.32),
    "--shadow": `0 ${formatCssNumber(shadowY)}px ${formatCssNumber(shadowBlur)}px rgba(0, 0, 0, ${formatCssNumber(shadowAlpha)})`,
    "--font-sans": fonts[appearance.typography.presetId],
    "--studio-type-scale": formatCssNumber(appearance.typography.scale),
    "--studio-numeral-weight": numeral <= 0 ? "inherit" : numeral < 0.5 ? "700" : "800",
    "--studio-numeral-tracking": numeral <= 0 ? "normal" : `${formatCssNumber(-0.02 * numeral)}em`,
    "--studio-density-space": appearance.controls.density === "compact" ? "0.82" : "1",
    "--studio-target-min": `${STUDIO_MIN_TARGET_PX}px`,
    "--studio-transparency": formatCssNumber(transparency),
    "--studio-panel": formatCssNumber(panel),
    "--studio-depth": formatCssNumber(depth),
    "--studio-decoration": formatCssNumber(decoration),
    "--studio-motion-ms": `${motionMs}ms`,
    "--studio-blur": `${formatCssNumber(blur)}px`,
    "--studio-wallpaper-image": cssUrl(wallpaper),
    "--studio-wallpaper-size": appearance.wallpaper.fit,
    "--studio-wallpaper-position": `${formatCssNumber(appearance.wallpaper.positionX)}% ${formatCssNumber(appearance.wallpaper.positionY)}%`,
    "--studio-wallpaper-blur": `${formatCssNumber(wallpaperBlur)}px`,
    "--studio-scrim": rgba(scrimColor, scrimAlpha),
    "--studio-metal-hi": metalHi,
    "--studio-metal-lo": metalLo,
    "--studio-matte-line": rgba(text, depth * 0.08),
    "--studio-highlight": appearance.palette.highlight ?? "#ff8a24",
    "--studio-sheet": sheet,
    "--studio-sheet-panel": formatCssNumber(sheetPanel),
    "--studio-sheet-panel-full": formatCssNumber(sheetPanelFull),
    "--studio-focus": formatCssNumber(appearance.wallpaper.focusY ?? 0.5),
    "--studio-card-shadow": `0 ${formatCssNumber(shadowY)}px ${formatCssNumber(shadowBlur)}px rgba(0, 0, 0, ${formatCssNumber(shadowAlpha)})`,
    "--studio-on-highlight": onHighlight,
    "--studio-heading-font": appearance.typography.presetId === "display" ? fonts.display : "var(--font-sans)",
  };
  roles.forEach((color, index) => {
    style[`--studio-role-${index + 1}`] = color;
  });
  style["--studio-status-done"] = done;
  style["--studio-status-danger"] = danger;
  style["--studio-status-caution"] = caution;
  style["--studio-status-accent"] = accentFit.accent;

  for (const key of STUDIO_STYLE_KEYS) {
    if (typeof style[key] !== "string" || !cssValueIsSafe(style[key])) {
      const refused = inactiveScope(scheme);
      refused.warnings = ["Appearance could not be drawn safely."];
      return refused;
    }
  }
  const ordered: Record<string, string> = {};
  for (const key of STUDIO_STYLE_KEYS) ordered[key] = style[key];

  return {
    applied: true,
    attribute: appearance.id,
    material,
    requestedMaterial,
    scheme,
    density: appearance.controls.density,
    controls: appearance.controls.treatmentId,
    parts: effectiveStudioParts(appearance),
    style: ordered,
    warnings,
    wallpaper,
  };
}
