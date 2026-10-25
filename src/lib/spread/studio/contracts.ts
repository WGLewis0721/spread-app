/** Spread Studio's wire contract. Independent of React, storage, and native APIs. */
export const STUDIO_APPEARANCE_VERSION = 1 as const;

export type AppearanceV1 = {
  version: 1;
  id: string;
  name: string;
  mode: "system" | "light" | "dark";
  wallpaperAssetId?: string;
  wallpaper: { fit: "cover" | "contain"; positionX: number; positionY: number; dim: number; blur: number };
  palette: { accent: string; surface: string; text: string; secondaryText: string };
  material: { treatment: "flat" | "glass" | "matte" | "metal"; transparency: number; depth: number };
  typography: { presetId: "system" | "rounded" | "serif" | "mono"; scale: number; numeralEmphasis: number };
  controls: { density: "comfortable" | "compact"; treatmentId: "default" | "solid" | "outlined" | "soft" };
  effects: { decorationIntensity: number; animationIntensity: number };
};

export type StudioDraft = {
  baseAppearanceId?: string;
  proposed: AppearanceV1;
  explanation?: string;
  warnings: string[];
};

export type AIAvailability =
  | { status: "available" }
  | { status: "unsupported" | "not-ready" | "error"; reason?: string };

/** Foreground-only request; does not claim a setting was applied. */
export type StudioIntent = {
  requestId: string;
  targetProfileId: string;
  instruction?: string;
};

type Valid<T> = { ok: true; value: T };
type Invalid = { ok: false; errors: string[] };
export type Validation<T> = Valid<T> | Invalid;

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const has = (v: unknown, choices: readonly string[]): boolean => typeof v === "string" && choices.includes(v);
const num = (v: unknown, min: number, max: number): boolean =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

function shape(value: unknown, path: string, keys: readonly string[], errors: string[]): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    errors.push(\`\${path}: expected a plain object\`);
    return null;
  }
  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row)) {
    if (!keys.includes(key)) errors.push(\`\${path}.\${key}: unsupported field\`);
  }
  return row;
}

function check(condition: boolean, path: string, message: string, errors: string[]): void {
  if (!condition) errors.push(\`\${path}: \${message}\`);
}

function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

/** Strictly validates unknown local/AI data. Rejects unsupported or executable properties. */
export function validateAppearance(input: unknown): Validation<AppearanceV1> {
  const errors: string[] = [];
  const root = shape(input, "appearance", ["version", "id", "name", "mode", "wallpaperAssetId", "wallpaper", "palette", "material", "typography", "controls", "effects"], errors);
  if (!root) return { ok: false, errors };
  check(root.version === STUDIO_APPEARANCE_VERSION, "version", "unsupported version", errors);
  check(typeof root.id === "string" && ID.test(root.id), "id", "invalid identifier", errors);
  check(text(root.name, 64), "name", "must be 1–64 visible characters", errors);
  check(has(root.mode, ["system", "light", "dark"]), "mode", "unsupported appearance mode", errors);
  if (root.wallpaperAssetId !== undefined) {
    check(typeof root.wallpaperAssetId === "string" && ID.test(root.wallpaperAssetId), "wallpaperAssetId", "must be a local asset identifier", errors);
  }

  const wallpaper = shape(root.wallpaper, "wallpaper", ["fit", "positionX", "positionY", "dim", "blur"], errors);
  if (wallpaper) {
    check(has(wallpaper.fit, ["cover", "contain"]), "wallpaper.fit", "unsupported fit", errors);
    for (const k of ["positionX", "positionY", "dim"] as const) check(num(wallpaper[k], 0, 1), \`wallpaper.\${k}\`, "expected 0–1", errors);
    check(num(wallpaper.blur, 0, 24), "wallpaper.blur", "expected 0–24", errors);
  }
  const palette = shape(root.palette, "palette", ["accent", "surface", "text", "secondaryText"], errors);
  if (palette) {
    for (const k of ["accent", "surface", "text", "secondaryText"] as const) {
      check(typeof palette[k] === "string" && HEX.test(palette[k]), \`palette.\${k}\`, "expected #RRGGBB", errors);
    }
  }
  const material = shape(root.material, "material", ["treatment", "transparency", "depth"], errors);
  if (material) {
    check(has(material.treatment, ["flat", "glass", "matte", "metal"]), "material.treatment", "unsupported material", errors);
    for (const k of ["transparency", "depth"] as const) check(num(material[k], 0, 1), \`material.\${k}\`, "expected 0–1", errors);
  }
  const typography = shape(root.typography, "typography", ["presetId", "scale", "numeralEmphasis"], errors);
  if (typography) {
    check(has(typography.presetId, ["system", "rounded", "serif", "mono"]), "typography.presetId", "unsupported type preset", errors);
    check(num(typography.scale, 0.85, 1.5), "typography.scale", "expected 0.85–1.5", errors);
    check(num(typography.numeralEmphasis, 0, 1), "typography.numeralEmphasis", "expected 0–1", errors);
  }
  const controls = shape(root.controls, "controls", ["density", "treatmentId"], errors);
  if (controls) {
    check(has(controls.density, ["comfortable", "compact"]), "controls.density", "unsupported density", errors);
    check(has(controls.treatmentId, ["default", "solid", "outlined", "soft"]), "controls.treatmentId", "unsupported treatment", errors);
  }
  const effects = shape(root.effects, "effects", ["decorationIntensity", "animationIntensity"], errors);
  if (effects) {
    for (const k of ["decorationIntensity", "animationIntensity"] as const) check(num(effects[k], 0, 1), \`effects.\${k}\`, "expected 0–1", errors);
  }
  if (errors.length) return { ok: false, errors };
  // Rebuild an allowlisted JSON value; never pass an untrusted object through to the renderer.
  return { ok: true, value: {
    version: 1,
    id: root.id as string,
    name: (root.name as string).trim(),
    mode: root.mode as AppearanceV1["mode"],
    ...(root.wallpaperAssetId === undefined ? {} : { wallpaperAssetId: root.wallpaperAssetId as string }),
    wallpaper: { fit: wallpaper!.fit, positionX: wallpaper!.positionX, positionY: wallpaper!.positionY, dim: wallpaper!.dim, blur: wallpaper!.blur } as AppearanceV1["wallpaper"],
    palette: { accent: palette!.accent, surface: palette!.surface, text: palette!.text, secondaryText: palette!.secondaryText } as AppearanceV1["palette"],
    material: { treatment: material!.treatment, transparency: material!.transparency, depth: material!.depth } as AppearanceV1["material"],
    typography: { presetId: typography!.presetId, scale: typography!.scale, numeralEmphasis: typography!.numeralEmphasis } as AppearanceV1["typography"],
    controls: { density: controls!.density, treatmentId: controls!.treatmentId } as AppearanceV1["controls"],
    effects: { decorationIntensity: effects!.decorationIntensity, animationIntensity: effects!.animationIntensity } as AppearanceV1["effects"],
  } };
}

/** Drafts can be previewed but are not permission to write persisted settings. */
export function validateStudioDraft(input: unknown): Validation<StudioDraft> {
  const errors: string[] = [];
  const root = shape(input, "draft", ["baseAppearanceId", "proposed", "explanation", "warnings"], errors);
  if (!root) return { ok: false, errors };
  if (root.baseAppearanceId !== undefined) check(typeof root.baseAppearanceId === "string" && ID.test(root.baseAppearanceId), "draft.baseAppearanceId", "invalid identifier", errors);
  if (root.explanation !== undefined) check(typeof root.explanation === "string" && root.explanation.length <= 400 && !/[\u0000-\u001f\u007f]/.test(root.explanation), "draft.explanation", "too long or contains controls", errors);
  check(Array.isArray(root.warnings) && root.warnings.length <= 8 && root.warnings.every((x: unknown) => typeof x === "string" && x.length <= 180 && !/[\u0000-\u001f\u007f]/.test(x)), "draft.warnings", "invalid warning list", errors);
  const proposal = validateAppearance(root.proposed);
  if (!proposal.ok) errors.push(...proposal.errors.map(x => \`draft.proposed.\${x}\`));
  if (errors.length || !proposal.ok) return { ok: false, errors };
  return { ok: true, value: {
    ...(root.baseAppearanceId === undefined ? {} : { baseAppearanceId: root.baseAppearanceId as string }),
    proposed: proposal.value,
    ...(root.explanation === undefined ? {} : { explanation: root.explanation as string }),
    warnings: [...root.warnings as string[]],
  } };
}
