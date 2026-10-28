/**
 * Spread Studio appearance contract (Gate 0).
 *
 * Canonical name: StudioAppearanceV1. docs/spread-studio/ARCHITECTURE.md §3 shows an
 * illustrative `AppearanceV1`; that name is not a type in this repository.
 * Read at spread-studio 6b8ec1823e457329592ac5f272e23a7bae08e012.
 *
 * Allowlisted values only. Unknown fields fail the whole value. Invalid input falls
 * back to a safe default (the original appearance, no asset, or no AI proposal).
 * Nothing here writes storage, sets document attributes, or calls the network.
 * Image pixels are not accepted. `AssetRef.bytes` is a length, not a payload.
 * `data-theme` stays the planner's system | light | dark control. Studio scope,
 * when a later change applies it, is `data-studio-appearance`.
 *
 * The flag follows the parser in src/lib/spread/cloud-flags.ts (build-time
 * VITE_ string, default off) but is not an iCloud flag and does not edit that file.
 */

export const STUDIO_APPEARANCE_ATTRIBUTE = "data-studio-appearance";

export const STUDIO_FLAG_ENV = "VITE_SPREAD_STUDIO";

export const STUDIO_LIMITS = {
  idMax: 64,
  nameMax: 48,
  instructionMax: 240,
  explanationMax: 400,
  warningMax: 160,
  warningCount: 8,
  positionMax: 100,
  unitMax: 1,
  blurMax: 24,
  scaleMin: 0.85,
  scaleMax: 1.4,
  assetEdgeMax: 4096,
  assetPixelsMax: 8_000_000,
  assetBytesMax: 8 * 1024 * 1024,
} as const;

export const MATERIAL_TREATMENTS = ["flat", "glass", "matte", "metal"] as const;
export const TYPOGRAPHY_PRESET_IDS = ["system", "editorial", "mono", "display"] as const;
export const CONTROL_TREATMENT_IDS = ["original", "desktop", "soft-glass", "illustrated"] as const;
export const STUDIO_ELEMENT_PARTS = ["crown", "responsibilities", "week", "tasks", "dock"] as const;
export const STUDIO_ELEMENT_STYLES = ["inherit", "original", "outline", "comic", "glass"] as const;
export const CONTROL_DENSITIES = ["comfortable", "compact"] as const;
export const ASSET_FORMATS = ["jpeg", "png", "webp"] as const;
export const AI_AVAILABILITY = ["available", "unsupported", "not-ready", "error"] as const;
export const STUDIO_RECEIPTS = ["pending", "previewed", "applied"] as const;
export const STUDIO_MODES = ["system", "light", "dark"] as const;
export const WALLPAPER_FITS = ["cover", "contain"] as const;
export const SHEET_EDGES = ["round", "scallop"] as const;
export const CHECK_GLYPHS = ["check", "star"] as const;

export type MaterialTreatment = (typeof MATERIAL_TREATMENTS)[number];
export type TypographyPresetId = (typeof TYPOGRAPHY_PRESET_IDS)[number];
export type ControlTreatmentId = (typeof CONTROL_TREATMENT_IDS)[number];
export type ControlDensity = (typeof CONTROL_DENSITIES)[number];
export type StudioElementPart = (typeof STUDIO_ELEMENT_PARTS)[number];
export type StudioElementStyle = (typeof STUDIO_ELEMENT_STYLES)[number];
export type AssetFormat = (typeof ASSET_FORMATS)[number];
export type AIAvailability = (typeof AI_AVAILABILITY)[number];
export type StudioReceipt = (typeof STUDIO_RECEIPTS)[number];
export type StudioMode = (typeof STUDIO_MODES)[number];
export type WallpaperFit = (typeof WALLPAPER_FITS)[number];
export type SheetEdge = (typeof SHEET_EDGES)[number];
export type CheckGlyph = (typeof CHECK_GLYPHS)[number];
export type AssetOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type StudioWallpaper = {
  fit: WallpaperFit;
  positionX: number;
  positionY: number;
  dim: number;
  blur: number;
};

export type StudioPalette = {
  accent: string;
  surface: string;
  text: string;
  secondaryText: string;
  /** Optional second accent for artwork-inspired outlines; never communicates status alone. */
  highlight?: string;
  /** Optional tint for the pinned header and Week sheet, taken from the wallpaper. Defaults to surface. */
  sheet?: string;
};

/**
 * Optional material skin. Every field is derived from the user's own wallpaper
 * (see wallpaper-language.ts) and stays editable. Missing skin = the shipped shapes.
 */
export type StudioSkin = {
  sheetEdge: SheetEdge;
  /** Outline weight in px. 0 hides outlines on cards, chips and the sheet. */
  outline: number;
  /** Hard offset shadow in px. 0 keeps the soft shadow. */
  hardShadow: number;
  checkGlyph: CheckGlyph;
  /** Vertical center of interest in the wallpaper, 0 (top) to 1 (bottom). */
  focusY: number;
};

export type StudioMaterial = {
  treatment: MaterialTreatment;
  transparency: number;
  depth: number;
};

export type StudioTypography = {
  presetId: TypographyPresetId;
  scale: number;
  numeralEmphasis: number;
};

export type StudioControls = {
  density: ControlDensity;
  treatmentId: ControlTreatmentId;
  /** Optional V1 extension: missing parts inherit the whole-UI treatment. */
  parts?: Partial<Record<StudioElementPart, StudioElementStyle>>;
};

export type StudioEffects = {
  decorationIntensity: number;
  animationIntensity: number;
};

export type StudioAppearanceV1 = {
  version: 1;
  id: string;
  name: string;
  mode: StudioMode;
  wallpaperAssetId?: string;
  wallpaper: StudioWallpaper;
  palette: StudioPalette;
  material: StudioMaterial;
  typography: StudioTypography;
  controls: StudioControls;
  effects: StudioEffects;
  skin?: StudioSkin;
};

export type StudioDraft = {
  baseAppearanceId?: string;
  proposed: StudioAppearanceV1;
  explanation?: string;
  warnings: string[];
};

export type AssetRef = {
  id: string;
  format: AssetFormat;
  width: number;
  height: number;
  bytes: number;
  orientation: AssetOrientation;
};

export type ProposeAppearanceRequest = {
  instruction: string;
  current: StudioAppearanceV1;
};

export type ProposeAppearanceResponse = {
  availability: AIAvailability;
  draft?: StudioDraft;
};

export type StudioIntent = {
  instruction: string;
  targetProfileId: string;
  receipt: StudioReceipt;
};

export type StudioRead<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * Same acceptance rules as cloud-flags.ts `flag`, with the fallback fixed off.
 * Only the strings "1" and "true" enable Studio. Anything else, including a
 * missing variable, stays off.
 */
export function studioFlagFrom(value: unknown): boolean {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return false;
}

const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ??
  {}) as Record<string, string | undefined>;

/** Build-time gate. Default off. Callers must keep shipped behavior when this is false. */
export const STUDIO_FLAG = studioFlagFrom(env[STUDIO_FLAG_ENV]);

const APPEARANCE_FIELDS = [
  "version",
  "id",
  "name",
  "mode",
  "wallpaperAssetId",
  "wallpaper",
  "palette",
  "material",
  "typography",
  "controls",
  "effects",
  "skin",
] as const;

const WALLPAPER_FIELDS = ["fit", "positionX", "positionY", "dim", "blur"] as const;
const PALETTE_FIELDS = ["accent", "surface", "text", "secondaryText", "highlight", "sheet"] as const;
const SKIN_FIELDS = ["sheetEdge", "outline", "hardShadow", "checkGlyph", "focusY"] as const;
const MATERIAL_FIELDS = ["treatment", "transparency", "depth"] as const;
const TYPOGRAPHY_FIELDS = ["presetId", "scale", "numeralEmphasis"] as const;
const CONTROLS_FIELDS = ["density", "treatmentId", "parts"] as const;
const EFFECTS_FIELDS = ["decorationIntensity", "animationIntensity"] as const;
const DRAFT_FIELDS = ["baseAppearanceId", "proposed", "explanation", "warnings"] as const;
const ASSET_FIELDS = ["id", "format", "width", "height", "bytes", "orientation"] as const;
const REQUEST_FIELDS = ["instruction", "current"] as const;
const RESPONSE_FIELDS = ["availability", "draft"] as const;
const INTENT_FIELDS = ["instruction", "targetProfileId", "receipt"] as const;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/;
const ORIENTATIONS: readonly AssetOrientation[] = [1, 2, 3, 4, 5, 6, 7, 8];

function fail<T>(reason: string): StudioRead<T> {
  return { ok: false, reason };
}

function pass<T>(value: T): StudioRead<T> {
  return { ok: true, value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unexpected(value: Record<string, unknown>, allowed: readonly string[]): string | null {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) return key;
  }
  return null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function readId(value: unknown): string | null {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) return null;
  return value;
}

function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function readText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string" || value.length > max + 32) return null;
  if (hasControlChar(value)) return null;
  const cleaned = value.trim().replace(/[ \t\f\v]+/g, " ");
  if (cleaned.length < min || cleaned.length > max) return null;
  return cleaned;
}

function readNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function readInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function readColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const color = value.toLowerCase();
  if (!HEX_COLOR.test(color)) return null;
  return color;
}

function readWallpaper(value: unknown): StudioRead<StudioWallpaper> {
  if (!isRecord(value)) return fail("wallpaper");
  const extra = unexpected(value, WALLPAPER_FIELDS);
  if (extra) return fail(`unknown-field:wallpaper.${extra}`);
  if (!oneOf(value.fit, WALLPAPER_FITS)) return fail("wallpaper.fit");
  const positionX = readNumber(value.positionX, 0, STUDIO_LIMITS.positionMax);
  const positionY = readNumber(value.positionY, 0, STUDIO_LIMITS.positionMax);
  const dim = readNumber(value.dim, 0, STUDIO_LIMITS.unitMax);
  const blur = readNumber(value.blur, 0, STUDIO_LIMITS.blurMax);
  if (positionX === null) return fail("wallpaper.positionX");
  if (positionY === null) return fail("wallpaper.positionY");
  if (dim === null) return fail("wallpaper.dim");
  if (blur === null) return fail("wallpaper.blur");
  return pass({ fit: value.fit, positionX, positionY, dim, blur });
}

function readPalette(value: unknown): StudioRead<StudioPalette> {
  if (!isRecord(value)) return fail("palette");
  const extra = unexpected(value, PALETTE_FIELDS);
  if (extra) return fail(`unknown-field:palette.${extra}`);
  const accent = readColor(value.accent);
  const surface = readColor(value.surface);
  const text = readColor(value.text);
  const secondaryText = readColor(value.secondaryText);
  if (!accent) return fail("palette.accent");
  if (!surface) return fail("palette.surface");
  if (!text) return fail("palette.text");
  if (!secondaryText) return fail("palette.secondaryText");
  let highlight: string | undefined;
  if ("highlight" in value) {
    const parsed = readColor(value.highlight);
    if (!parsed) return fail("palette.highlight");
    highlight = parsed;
  }
  let sheet: string | undefined;
  if ("sheet" in value) {
    const parsed = readColor(value.sheet);
    if (!parsed) return fail("palette.sheet");
    sheet = parsed;
  }
  return pass({ accent, surface, text, secondaryText, ...(highlight ? { highlight } : {}), ...(sheet ? { sheet } : {}) });
}

function readSkin(value: unknown): StudioRead<StudioSkin> {
  if (!isRecord(value)) return fail("skin");
  const extra = unexpected(value, SKIN_FIELDS);
  if (extra) return fail(`unknown-field:skin.${extra}`);
  if (!oneOf(value.sheetEdge, SHEET_EDGES)) return fail("skin.sheetEdge");
  if (!oneOf(value.checkGlyph, CHECK_GLYPHS)) return fail("skin.checkGlyph");
  const outline = readNumber(value.outline, 0, 4);
  const hardShadow = readNumber(value.hardShadow, 0, 4);
  const focusY = readNumber(value.focusY, 0, STUDIO_LIMITS.unitMax);
  if (outline === null) return fail("skin.outline");
  if (hardShadow === null) return fail("skin.hardShadow");
  if (focusY === null) return fail("skin.focusY");
  return pass({ sheetEdge: value.sheetEdge, outline, hardShadow, checkGlyph: value.checkGlyph, focusY });
}

function readMaterial(value: unknown): StudioRead<StudioMaterial> {
  if (!isRecord(value)) return fail("material");
  const extra = unexpected(value, MATERIAL_FIELDS);
  if (extra) return fail(`unknown-field:material.${extra}`);
  if (!oneOf(value.treatment, MATERIAL_TREATMENTS)) return fail("material.treatment");
  const transparency = readNumber(value.transparency, 0, STUDIO_LIMITS.unitMax);
  const depth = readNumber(value.depth, 0, STUDIO_LIMITS.unitMax);
  if (transparency === null) return fail("material.transparency");
  if (depth === null) return fail("material.depth");
  return pass({ treatment: value.treatment, transparency, depth });
}

function readTypography(value: unknown): StudioRead<StudioTypography> {
  if (!isRecord(value)) return fail("typography");
  const extra = unexpected(value, TYPOGRAPHY_FIELDS);
  if (extra) return fail(`unknown-field:typography.${extra}`);
  if (!oneOf(value.presetId, TYPOGRAPHY_PRESET_IDS)) return fail("typography.presetId");
  const scale = readNumber(value.scale, STUDIO_LIMITS.scaleMin, STUDIO_LIMITS.scaleMax);
  const numeralEmphasis = readNumber(value.numeralEmphasis, 0, STUDIO_LIMITS.unitMax);
  if (scale === null) return fail("typography.scale");
  if (numeralEmphasis === null) return fail("typography.numeralEmphasis");
  return pass({ presetId: value.presetId, scale, numeralEmphasis });
}

function readControls(value: unknown): StudioRead<StudioControls> {
  if (!isRecord(value)) return fail("controls");
  const extra = unexpected(value, CONTROLS_FIELDS);
  if (extra) return fail(`unknown-field:controls.${extra}`);
  if (!oneOf(value.density, CONTROL_DENSITIES)) return fail("controls.density");
  if (!oneOf(value.treatmentId, CONTROL_TREATMENT_IDS)) return fail("controls.treatmentId");
  let parts: Partial<Record<StudioElementPart, StudioElementStyle>> | undefined;
  if ("parts" in value) {
    if (!isRecord(value.parts)) return fail("controls.parts");
    const badPart = unexpected(value.parts, STUDIO_ELEMENT_PARTS);
    if (badPart) return fail(`unknown-field:controls.parts.${badPart}`);
    parts = {};
    for (const part of STUDIO_ELEMENT_PARTS) {
      if (!(part in value.parts)) continue;
      if (!oneOf(value.parts[part], STUDIO_ELEMENT_STYLES)) return fail(`controls.parts.${part}`);
      parts[part] = value.parts[part];
    }
  }
  return pass({ density: value.density, treatmentId: value.treatmentId, ...(parts ? { parts } : {}) });
}

function readEffects(value: unknown): StudioRead<StudioEffects> {
  if (!isRecord(value)) return fail("effects");
  const extra = unexpected(value, EFFECTS_FIELDS);
  if (extra) return fail(`unknown-field:effects.${extra}`);
  const decorationIntensity = readNumber(value.decorationIntensity, 0, STUDIO_LIMITS.unitMax);
  const animationIntensity = readNumber(value.animationIntensity, 0, STUDIO_LIMITS.unitMax);
  if (decorationIntensity === null) return fail("effects.decorationIntensity");
  if (animationIntensity === null) return fail("effects.animationIntensity");
  return pass({ decorationIntensity, animationIntensity });
}

/**
 * Original Spread look. Palette hex values are the light tokens in src/styles.css
 * at the pinned baseline (`--accent`, `--elevated`, `--ink`, `--secondary`).
 * Surface is the card token `--elevated`, not a new color.
 */
export function originalStudioAppearance(): StudioAppearanceV1 {
  return {
    version: 1,
    id: "original",
    name: "Original",
    mode: "system",
    wallpaper: { fit: "cover", positionX: 50, positionY: 50, dim: 0, blur: 0 },
    palette: {
      accent: "#007aff",
      surface: "#ffffff",
      text: "#1d1d1f",
      secondaryText: "#6e6e73",
    },
    material: { treatment: "flat", transparency: 0, depth: 0 },
    typography: { presetId: "system", scale: 1, numeralEmphasis: 0 },
    controls: { density: "comfortable", treatmentId: "original" },
    effects: { decorationIntensity: 0, animationIntensity: 0 },
  };
}

export function originalStudioDraft(): StudioDraft {
  return {
    proposed: originalStudioAppearance(),
    warnings: ["Reverted to the original appearance."],
  };
}

export function parseStudioAppearance(value: unknown): StudioRead<StudioAppearanceV1> {
  if (!isRecord(value)) return fail("not-object");
  const extra = unexpected(value, APPEARANCE_FIELDS);
  if (extra) return fail(`unknown-field:${extra}`);
  if (value.version !== 1) return fail("version");
  const id = readId(value.id);
  if (!id) return fail("id");
  const name = readText(value.name, 1, STUDIO_LIMITS.nameMax);
  if (!name) return fail("name");
  if (!oneOf(value.mode, STUDIO_MODES)) return fail("mode");
  let wallpaperAssetId: string | undefined;
  if ("wallpaperAssetId" in value) {
    const assetId = readId(value.wallpaperAssetId);
    if (!assetId) return fail("wallpaperAssetId");
    wallpaperAssetId = assetId;
  }
  const wallpaper = readWallpaper(value.wallpaper);
  if (!wallpaper.ok) return wallpaper;
  const palette = readPalette(value.palette);
  if (!palette.ok) return palette;
  const material = readMaterial(value.material);
  if (!material.ok) return material;
  const typography = readTypography(value.typography);
  if (!typography.ok) return typography;
  const controls = readControls(value.controls);
  if (!controls.ok) return controls;
  const effects = readEffects(value.effects);
  if (!effects.ok) return effects;
  let skin: StudioSkin | undefined;
  if ("skin" in value) {
    const parsedSkin = readSkin(value.skin);
    if (!parsedSkin.ok) return parsedSkin;
    skin = parsedSkin.value;
  }
  return pass({
    version: 1,
    id,
    name,
    mode: value.mode,
    ...(wallpaperAssetId ? { wallpaperAssetId } : {}),
    wallpaper: wallpaper.value,
    palette: palette.value,
    material: material.value,
    typography: typography.value,
    controls: controls.value,
    effects: effects.value,
    ...(skin ? { skin } : {}),
  });
}

export function studioAppearanceOrDefault(value: unknown): StudioAppearanceV1 {
  const parsed = parseStudioAppearance(value);
  return parsed.ok ? parsed.value : originalStudioAppearance();
}

export function parseStudioDraft(value: unknown): StudioRead<StudioDraft> {
  if (!isRecord(value)) return fail("not-object");
  const extra = unexpected(value, DRAFT_FIELDS);
  if (extra) return fail(`unknown-field:${extra}`);
  if (!("proposed" in value) || !("warnings" in value)) return fail("missing-field");
  let baseAppearanceId: string | undefined;
  if ("baseAppearanceId" in value) {
    const id = readId(value.baseAppearanceId);
    if (!id) return fail("baseAppearanceId");
    baseAppearanceId = id;
  }
  const proposed = parseStudioAppearance(value.proposed);
  if (!proposed.ok) return fail(`proposed.${proposed.reason}`);
  let explanation: string | undefined;
  if ("explanation" in value) {
    const text = readText(value.explanation, 1, STUDIO_LIMITS.explanationMax);
    if (!text) return fail("explanation");
    explanation = text;
  }
  const warnings = readWarnings(value.warnings);
  if (!warnings) return fail("warnings");
  return pass({
    ...(baseAppearanceId ? { baseAppearanceId } : {}),
    proposed: proposed.value,
    ...(explanation ? { explanation } : {}),
    warnings,
  });
}

function readWarnings(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > STUDIO_LIMITS.warningCount) return null;
  const warnings: string[] = [];
  for (const item of value) {
    const text = readText(item, 1, STUDIO_LIMITS.warningMax);
    if (!text) return null;
    warnings.push(text);
  }
  return warnings;
}

export function studioDraftOrDefault(value: unknown): StudioDraft {
  const parsed = parseStudioDraft(value);
  return parsed.ok ? parsed.value : originalStudioDraft();
}

export function parseAssetRef(value: unknown): StudioRead<AssetRef> {
  if (!isRecord(value)) return fail("not-object");
  const extra = unexpected(value, ASSET_FIELDS);
  if (extra) return fail(`unknown-field:${extra}`);
  const id = readId(value.id);
  if (!id) return fail("id");
  if (!oneOf(value.format, ASSET_FORMATS)) return fail("format");
  const width = readInt(value.width, 1, STUDIO_LIMITS.assetEdgeMax);
  const height = readInt(value.height, 1, STUDIO_LIMITS.assetEdgeMax);
  const bytes = readInt(value.bytes, 1, STUDIO_LIMITS.assetBytesMax);
  if (width === null) return fail("width");
  if (height === null) return fail("height");
  if (bytes === null) return fail("bytes");
  if (width * height > STUDIO_LIMITS.assetPixelsMax) return fail("pixels");
  if (!ORIENTATIONS.includes(value.orientation as AssetOrientation)) return fail("orientation");
  return pass({
    id,
    format: value.format,
    width,
    height,
    bytes,
    orientation: value.orientation as AssetOrientation,
  });
}

/** No asset. A failed ref must not invent pixels or a stand-in file. */
export function assetRefOrNull(value: unknown): AssetRef | null {
  const parsed = parseAssetRef(value);
  return parsed.ok ? parsed.value : null;
}

export function parseAIAvailability(value: unknown): StudioRead<AIAvailability> {
  if (!oneOf(value, AI_AVAILABILITY)) return fail("availability");
  return pass(value);
}

/** An unreadable probe is treated as unsupported so manual controls stay the path. */
export function aiAvailabilityOrDefault(value: unknown): AIAvailability {
  const parsed = parseAIAvailability(value);
  return parsed.ok ? parsed.value : "unsupported";
}

export function parseProposeAppearanceRequest(
  value: unknown,
): StudioRead<ProposeAppearanceRequest> {
  if (!isRecord(value)) return fail("not-object");
  const extra = unexpected(value, REQUEST_FIELDS);
  if (extra) return fail(`unknown-field:${extra}`);
  const instruction = readText(value.instruction, 1, STUDIO_LIMITS.instructionMax);
  if (!instruction) return fail("instruction");
  const current = parseStudioAppearance(value.current);
  if (!current.ok) return fail(`current.${current.reason}`);
  return pass({ instruction, current: current.value });
}

/** Null means "do not ask the model". A bad request is not replaced with a prompt. */
export function proposeAppearanceRequestOrNull(value: unknown): ProposeAppearanceRequest | null {
  const parsed = parseProposeAppearanceRequest(value);
  return parsed.ok ? parsed.value : null;
}

export function parseProposeAppearanceResponse(
  value: unknown,
): StudioRead<ProposeAppearanceResponse> {
  if (!isRecord(value)) return fail("not-object");
  const extra = unexpected(value, RESPONSE_FIELDS);
  if (extra) return fail(`unknown-field:${extra}`);
  if (!oneOf(value.availability, AI_AVAILABILITY)) return fail("availability");
  const hasDraft = "draft" in value;
  if (value.availability !== "available") {
    if (hasDraft) return fail("draft");
    return pass({ availability: value.availability });
  }
  if (!hasDraft) return fail("draft");
  const draft = parseStudioDraft(value.draft);
  if (!draft.ok) return fail(`draft.${draft.reason}`);
  return pass({ availability: "available", draft: draft.value });
}

export function proposeAppearanceResponseOrDefault(value: unknown): ProposeAppearanceResponse {
  const parsed = parseProposeAppearanceResponse(value);
  return parsed.ok ? parsed.value : { availability: "unsupported" };
}

export function parseStudioIntent(value: unknown): StudioRead<StudioIntent> {
  if (!isRecord(value)) return fail("not-object");
  const extra = unexpected(value, INTENT_FIELDS);
  if (extra) return fail(`unknown-field:${extra}`);
  const instruction = readText(value.instruction, 1, STUDIO_LIMITS.instructionMax);
  if (!instruction) return fail("instruction");
  const targetProfileId = readId(value.targetProfileId);
  if (!targetProfileId) return fail("targetProfileId");
  if (!oneOf(value.receipt, STUDIO_RECEIPTS)) return fail("receipt");
  return pass({ instruction, targetProfileId, receipt: value.receipt });
}

/** Null means there is no intent. Failure never becomes receipt "applied". */
export function studioIntentOrNull(value: unknown): StudioIntent | null {
  const parsed = parseStudioIntent(value);
  return parsed.ok ? parsed.value : null;
}
