/**
 * Draft state for Customize Spread.
 *
 * Preview edits change `draft` only. `committed` changes after a successful
 * Apply. Reset copies originalStudioAppearance() into the draft and does not
 * write. The planner string is copied through every action and never read.
 * Image bytes are not accepted.
 */

import {
  originalStudioAppearance,
  parseStudioAppearance,
  STUDIO_LIMITS,
  type ControlDensity,
  type ControlTreatmentId,
  type StudioElementPart,
  type StudioElementStyle,
  type TypographyPresetId,
  type MaterialTreatment,
  type StudioAppearanceV1,
  type StudioMode,
  type StudioPalette,
  type WallpaperFit,
} from "../../../lib/spread/studio/contract.ts";
import { STUDIO_UI_COPY } from "./studio-copy.ts";
import { appearanceFromStarter, type StudioStarterId } from "../../../lib/spread/studio/presets.ts";
import type { StudioWallpaperLanguage } from "../../../lib/spread/studio/wallpaper-language.ts";

export type StudioSession = {
  committed: StudioAppearanceV1;
  draft: StudioAppearanceV1;
  suggestion: StudioPalette | null;
  pendingAssetId: string | null;
  notice: string | null;
  imageMessage: string | null;
  planner: string;
};

export type StudioEffect =
  | { type: "none" }
  | { type: "commit"; appearance: StudioAppearanceV1; pendingAssetId: string | null }
  | { type: "drop-pending"; assetId: string };

export type StudioDraftAction =
  | { type: "use-starter"; id: StudioStarterId }
  | { type: "apply-wallpaper-language"; language: StudioWallpaperLanguage }
  | { type: "set-typeface"; presetId: TypographyPresetId }
  | { type: "set-control-treatment"; treatmentId: ControlTreatmentId }
  | { type: "set-element-style"; part: StudioElementPart; style: StudioElementStyle }
  | { type: "set-mode"; mode: StudioMode }
  | { type: "set-fit"; fit: WallpaperFit }
  | { type: "set-wallpaper-number"; key: "positionX" | "positionY" | "dim" | "blur"; value: number }
  | { type: "set-color"; key: keyof StudioPalette; value: string }
  | { type: "use-suggestion" }
  | { type: "imported"; assetId: string; suggestion: StudioPalette }
  | { type: "clear-wallpaper" }
  | { type: "set-material"; treatment: MaterialTreatment }
  | { type: "set-material-number"; key: "transparency" | "depth"; value: number }
  | { type: "set-scale"; value: number }
  | { type: "set-numeral"; value: number }
  | { type: "set-density"; density: ControlDensity }
  | { type: "set-effect"; key: "decorationIntensity" | "animationIntensity"; value: number }
  | { type: "reset" }
  | { type: "cancel" }
  | { type: "apply" }
  | { type: "commit-succeeded" }
  | { type: "commit-failed"; message: string }
  | { type: "note"; message: string | null };

const NONE: StudioEffect = { type: "none" };

const MODES: readonly StudioMode[] = ["system", "light", "dark"];
const FITS: readonly WallpaperFit[] = ["cover", "contain"];
const MATERIALS: readonly MaterialTreatment[] = ["flat", "glass", "matte", "metal"];
const DENSITIES: readonly ControlDensity[] = ["comfortable", "compact"];

export function openStudioSession(input: {
  render: StudioAppearanceV1;
  imageMessage: string | null;
  planner: string;
}): StudioSession {
  const render = cloneAppearance(input.render);
  return {
    committed: render,
    draft: cloneAppearance(render),
    suggestion: null,
    pendingAssetId: null,
    notice: null,
    imageMessage: input.imageMessage,
    planner: input.planner,
  };
}

export function draftIsDirty(session: StudioSession): boolean {
  return JSON.stringify(session.draft) !== JSON.stringify(session.committed);
}

export function draftIsOriginal(session: StudioSession): boolean {
  return JSON.stringify(session.draft) === JSON.stringify(originalStudioAppearance());
}

export function plannerUnchanged(session: StudioSession, planner: string): boolean {
  return session.planner === planner;
}

export function reduceStudioSession(
  session: StudioSession,
  action: StudioDraftAction,
): { state: StudioSession; effect: StudioEffect } {
  const result = reduce(session, action);
  if (result.state.planner !== session.planner) {
    return { state: session, effect: NONE };
  }
  return result;
}

function reduce(
  session: StudioSession,
  action: StudioDraftAction,
): { state: StudioSession; effect: StudioEffect } {
  switch (action.type) {
    case "apply-wallpaper-language": {
      const language=action.language;
      const applied=edit(session,(draft)=>({
        ...draft,
        id:"studio-wallpaper",name:"From Wallpaper",
        palette:{...language.palette},
        material:{treatment:language.treatment==="soft-glass"?"glass":"flat",transparency:language.treatment==="soft-glass"?0.14:0,depth:language.treatment==="soft-glass"?0.55:0.12},
        typography:{...draft.typography,presetId:language.typeface},
        controls:{density:draft.controls.density,treatmentId:language.treatment,parts:{...language.parts}},
      }));
      return { ...applied, state:{...applied.state,notice:"Local design created. "+language.explanation+". Review and tap Apply."} };
    }
    case "use-starter":
      return edit(session, (draft) => appearanceFromStarter(action.id, draft), { suggestion: null });
    case "set-typeface": {
      if (!["system", "editorial", "mono", "display"].includes(action.presetId)) return hold(session);
      return edit(session, (draft) => ({ ...draft, typography: { ...draft.typography, presetId: action.presetId } }));
    }
    case "set-control-treatment": {
      if (!["original", "desktop", "soft-glass", "illustrated"].includes(action.treatmentId)) return hold(session);
      return edit(session, (draft) => ({ ...draft, controls: { density: draft.controls.density, treatmentId: action.treatmentId } }));
    }
    case "set-element-style": {
      if (!["crown", "responsibilities", "week", "tasks", "dock"].includes(action.part)) return hold(session);
      if (!["inherit", "original", "outline", "comic", "glass"].includes(action.style)) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        controls: {
          ...draft.controls,
          parts: { ...draft.controls.parts, [action.part]: action.style },
        },
      }));
    }
    case "set-mode": {
      if (!MODES.includes(action.mode)) return hold(session);
      return edit(session, (draft) => ({ ...draft, mode: action.mode }));
    }
    case "set-fit": {
      if (!FITS.includes(action.fit)) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        wallpaper: { ...draft.wallpaper, fit: action.fit },
      }));
    }
    case "set-wallpaper-number": {
      const value = clampWallpaper(action.key, action.value);
      if (value === null) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        wallpaper: { ...draft.wallpaper, [action.key]: value },
      }));
    }
    case "set-color": {
      const color = normalizeColor(action.value);
      if (!color) return note(session, STUDIO_UI_COPY.colorHint);
      return edit(session, (draft) => ({
        ...draft,
        palette: { ...draft.palette, [action.key]: color },
      }));
    }
    case "use-suggestion": {
      if (!session.suggestion) return hold(session);
      const suggestion = session.suggestion;
      return edit(session, (draft) => ({ ...draft, palette: { ...suggestion, ...(draft.palette.highlight ? { highlight: draft.palette.highlight } : {}) } }));
    }
    case "imported": {
      const parsedId = parseStudioAppearance({
        ...originalStudioAppearance(),
        id: "custom",
        name: "Custom",
        wallpaperAssetId: action.assetId,
      });
      if (!parsedId.ok) return hold(session);
      const drop = droppablePending(session, action.assetId);
      const base = session.draft;
      const applySuggestion = samePalette(base.palette, originalStudioAppearance().palette);
      return edit(
        session,
        (draft) => ({
          ...draft,
          // Explicit photo import always makes the photo visible, including after
          // a wallpaper-free starter such as Retro Desk or Clear Glass.
          ...(draft.id === "studio-retro" || draft.id === "studio-glass"
            ? { id: "custom", name: "Custom" }
            : {}),
          wallpaperAssetId: action.assetId,
          palette: applySuggestion ? { ...action.suggestion } : draft.palette,
        }),
        {
          suggestion: action.suggestion,
          pendingAssetId: action.assetId,
          imageMessage: null,
        },
        drop ? { type: "drop-pending", assetId: drop } : NONE,
      );
    }
    case "clear-wallpaper": {
      if (!session.draft.wallpaperAssetId) return hold(session);
      return edit(session, withoutWallpaper, { imageMessage: null });
    }
    case "set-material": {
      if (!MATERIALS.includes(action.treatment)) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        material: { ...draft.material, treatment: action.treatment },
      }));
    }
    case "set-material-number": {
      const value = clampUnit(action.value);
      if (value === null) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        material: { ...draft.material, [action.key]: value },
      }));
    }
    case "set-scale": {
      const value = clampScale(action.value);
      if (value === null) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        typography: { ...draft.typography, scale: value },
      }));
    }
    case "set-numeral": {
      const value = clampUnit(action.value);
      if (value === null) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        typography: { ...draft.typography, numeralEmphasis: value },
      }));
    }
    case "set-density": {
      if (!DENSITIES.includes(action.density)) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        controls: { ...draft.controls, density: action.density },
      }));
    }
    case "set-effect": {
      const value = clampUnit(action.value);
      if (value === null) return hold(session);
      return edit(session, (draft) => ({
        ...draft,
        effects: { ...draft.effects, [action.key]: value },
      }));
    }
    case "reset":
      return {
        state: {
          ...session,
          draft: originalStudioAppearance(),
          notice: STUDIO_UI_COPY.resetNote,
        },
        effect: NONE,
      };
    case "cancel": {
      const drop = droppablePending(session, null);
      return {
        state: {
          ...session,
          draft: cloneAppearance(session.committed),
          pendingAssetId: drop ? null : session.pendingAssetId,
          notice: null,
        },
        effect: drop ? { type: "drop-pending", assetId: drop } : NONE,
      };
    }
    case "apply": {
      if (!draftIsDirty(session)) return hold(session);
      const parsed = parseStudioAppearance(session.draft);
      if (!parsed.ok) return note(session, STUDIO_UI_COPY.planChanged);
      return {
        state: session,
        effect: {
          type: "commit",
          appearance: parsed.value,
          pendingAssetId: session.pendingAssetId,
        },
      };
    }
    case "commit-succeeded": {
      const draft = cloneAppearance(session.draft);
      return {
        state: {
          ...session,
          committed: draft,
          draft: cloneAppearance(draft),
          pendingAssetId: null,
          notice: STUDIO_UI_COPY.saved,
        },
        effect: NONE,
      };
    }
    case "commit-failed": {
      const pending = session.pendingAssetId;
      const draft =
        pending && session.draft.wallpaperAssetId === pending
          ? withoutWallpaper(session.draft)
          : session.draft;
      const parsed = parseStudioAppearance(draft);
      return {
        state: {
          ...session,
          draft: parsed.ok ? parsed.value : session.draft,
          pendingAssetId: null,
          notice: action.message,
        },
        effect: NONE,
      };
    }
    case "note":
      return note(session, action.message);
    default:
      return hold(session);
  }
}

function hold(session: StudioSession): { state: StudioSession; effect: StudioEffect } {
  return { state: session, effect: NONE };
}

function note(
  session: StudioSession,
  message: string | null,
): { state: StudioSession; effect: StudioEffect } {
  return { state: { ...session, notice: message }, effect: NONE };
}

function edit(
  session: StudioSession,
  recipe: (draft: StudioAppearanceV1) => StudioAppearanceV1,
  extra?: Partial<Pick<StudioSession, "suggestion" | "pendingAssetId" | "imageMessage">>,
  effect: StudioEffect = NONE,
): { state: StudioSession; effect: StudioEffect } {
  const drafted = recipe(cloneAppearance(session.draft));
  const changed = JSON.stringify(drafted) !== JSON.stringify(session.draft);
  if (!changed && !extra && effect.type === "none") return hold(session);
  const parsed = parseStudioAppearance(changed ? diverge(drafted) : drafted);
  if (!parsed.ok) return hold(session);
  return {
    state: {
      ...session,
      draft: parsed.value,
      notice: null,
      ...extra,
    },
    effect,
  };
}

function diverge(appearance: StudioAppearanceV1): StudioAppearanceV1 {
  if (appearance.id !== "original") return appearance;
  return {
    ...appearance,
    id: "custom",
    name: appearance.name === "Original" ? "Custom" : appearance.name,
  };
}

function withoutWallpaper(appearance: StudioAppearanceV1): StudioAppearanceV1 {
  const next = cloneAppearance(appearance);
  delete next.wallpaperAssetId;
  return next;
}

function droppablePending(session: StudioSession, nextPending: string | null): string | null {
  const pending = session.pendingAssetId;
  if (!pending || pending === nextPending) return null;
  if (pending === session.committed.wallpaperAssetId) return null;
  return pending;
}

function samePalette(left: StudioPalette, right: StudioPalette): boolean {
  return (
    left.accent === right.accent &&
    left.surface === right.surface &&
    left.text === right.text &&
    left.secondaryText === right.secondaryText
  );
}

function cloneAppearance(value: StudioAppearanceV1): StudioAppearanceV1 {
  return {
    version: 1,
    id: value.id,
    name: value.name,
    mode: value.mode,
    ...(value.wallpaperAssetId ? { wallpaperAssetId: value.wallpaperAssetId } : {}),
    wallpaper: { ...value.wallpaper },
    palette: { ...value.palette },
    material: { ...value.material },
    typography: { ...value.typography },
    controls: { ...value.controls, ...(value.controls.parts ? { parts: { ...value.controls.parts } } : {}) },
    effects: { ...value.effects },
  };
}

function normalizeColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{6}$/.test(trimmed)) return `#${trimmed}`;
  return null;
}

function clampWallpaper(
  key: "positionX" | "positionY" | "dim" | "blur",
  value: number,
): number | null {
  if (key === "dim") return clampUnit(value);
  if (key === "blur") return clamp(value, 0, STUDIO_LIMITS.blurMax, 1);
  return clamp(value, 0, STUDIO_LIMITS.positionMax, 1);
}

function clampScale(value: number): number | null {
  return clamp(value, STUDIO_LIMITS.scaleMin, STUDIO_LIMITS.scaleMax, 0.01);
}

function clampUnit(value: number): number | null {
  return clamp(value, 0, STUDIO_LIMITS.unitMax, 0.01);
}

function clamp(value: number, min: number, max: number, places: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const clamped = Math.min(max, Math.max(min, value));
  const factor = Math.round(1 / places);
  return Math.round(clamped * factor) / factor;
}
