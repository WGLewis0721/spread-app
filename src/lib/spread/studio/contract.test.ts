import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  STUDIO_APPEARANCE_ATTRIBUTE,
  STUDIO_FLAG,
  STUDIO_FLAG_ENV,
  STUDIO_LIMITS,
  aiAvailabilityOrDefault,
  assetRefOrNull,
  originalStudioAppearance,
  originalStudioDraft,
  parseAIAvailability,
  parseAssetRef,
  parseProposeAppearanceRequest,
  parseProposeAppearanceResponse,
  parseStudioAppearance,
  parseStudioDraft,
  parseStudioIntent,
  proposeAppearanceRequestOrNull,
  proposeAppearanceResponseOrDefault,
  studioAppearanceOrDefault,
  studioDraftOrDefault,
  studioFlagFrom,
  studioIntentOrNull,
  type AssetRef,
  type StudioAppearanceV1,
  type StudioDraft,
  type StudioRead,
} from "./contract.ts";

function unwrap<T>(result: StudioRead<T>): T {
  if (!result.ok) assert.fail(result.reason);
  return result.value;
}

function appearance(patch: Partial<StudioAppearanceV1> = {}): StudioAppearanceV1 {
  return { ...originalStudioAppearance(), ...patch };
}

function asset(patch: Partial<AssetRef> = {}): AssetRef {
  return {
    id: "photo-1",
    format: "jpeg",
    width: 800,
    height: 600,
    bytes: 1200,
    orientation: 1,
    ...patch,
  };
}

test("studio contract: the original appearance is the shipped light look", () => {
  const original = originalStudioAppearance();
  assert.deepEqual(unwrap(parseStudioAppearance(original)), original);
  assert.equal(original.version, 1);
  assert.equal(original.id, "original");
  assert.equal(original.name, "Original");
  assert.equal(original.mode, "system");
  assert.equal("wallpaperAssetId" in original, false);
  assert.equal(original.material.treatment, "flat");
  assert.equal(original.typography.presetId, "system");
  assert.equal(original.controls.treatmentId, "original");
  assert.deepEqual(original.palette, {
    accent: "#007aff",
    surface: "#ffffff",
    text: "#1d1d1f",
    secondaryText: "#6e6e73",
  });
  assert.equal(JSON.stringify(original).includes("base64"), false);
  const again = originalStudioAppearance();
  again.name = "Changed";
  assert.equal(originalStudioAppearance().name, "Original");
});

test("studio contract: the flag is off unless the build string enables it", () => {
  assert.equal(STUDIO_FLAG_ENV, "VITE_SPREAD_STUDIO");
  assert.equal(STUDIO_FLAG, false);
  assert.equal(studioFlagFrom(undefined), false);
  assert.equal(studioFlagFrom("0"), false);
  assert.equal(studioFlagFrom("false"), false);
  assert.equal(studioFlagFrom("yes"), false);
  assert.equal(studioFlagFrom(1), false);
  assert.equal(studioFlagFrom(true), false);
  assert.equal(studioFlagFrom("1"), true);
  assert.equal(studioFlagFrom("true"), true);
  assert.equal(STUDIO_APPEARANCE_ATTRIBUTE, "data-studio-appearance");
});

test("studio contract: a custom appearance round-trips, including its asset id", () => {
  const custom = appearance({
    id: "look-1",
    name: "My look",
    mode: "dark",
    wallpaperAssetId: "asset-1",
    wallpaper: { fit: "contain", positionX: 0, positionY: 100, dim: 1, blur: 24 },
    material: { treatment: "metal", transparency: 0.25, depth: 1 },
    typography: { presetId: "system", scale: 1.4, numeralEmphasis: 0.5 },
    controls: { density: "compact", treatmentId: "original" },
    effects: { decorationIntensity: 0, animationIntensity: 1 },
  });
  assert.deepEqual(unwrap(parseStudioAppearance(custom)), custom);
  assert.deepEqual(studioAppearanceOrDefault(JSON.parse(JSON.stringify(custom))), custom);
});

test("studio contract: colors are #rrggbb and canonicalize case", () => {
  const custom = appearance({
    palette: {
      accent: "#007AFF",
      surface: "#FFFFFF",
      text: "#1D1D1F",
      secondaryText: "#6E6E73",
    },
  });
  const parsed = unwrap(parseStudioAppearance(custom));
  assert.equal(parsed.palette.accent, "#007aff");
  assert.equal(unwrap(parseStudioAppearance(appearance())).palette.accent, "#007aff");
  for (const bad of ["#fff", "red", "rgb(0,0,0)", "url(#a)", "#007affff", "javascript:0"]) {
    const next = appearance();
    next.palette = { ...next.palette, accent: bad };
    assert.equal(parseStudioAppearance(next).ok, false, bad);
    assert.deepEqual(studioAppearanceOrDefault(next), originalStudioAppearance());
  }
});

test("studio contract: an unknown field rejects the whole appearance", () => {
  const bad = { ...appearance({ name: "Stolen" }), css: "body{color:red}" };
  const parsed = parseStudioAppearance(bad);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.reason, "unknown-field:css");
  assert.deepEqual(studioAppearanceOrDefault(bad), originalStudioAppearance());
  const nested = appearance();
  nested.wallpaper = { ...nested.wallpaper, filter: "blur(2px)" } as typeof nested.wallpaper;
  const nestedRead = parseStudioAppearance(nested);
  assert.equal(nestedRead.ok, false);
  if (!nestedRead.ok) assert.equal(nestedRead.reason, "unknown-field:wallpaper.filter");
});

test("studio contract: version, mode, and required groups are strict", () => {
  assert.equal(parseStudioAppearance({ ...appearance(), version: 2 }).ok, false);
  assert.equal(parseStudioAppearance({ ...appearance(), version: "1" }).ok, false);
  assert.equal(parseStudioAppearance({ ...appearance(), mode: "neon" }).ok, false);
  const missing = { ...appearance() } as Record<string, unknown>;
  delete missing.palette;
  assert.equal(parseStudioAppearance(missing).ok, false);
  assert.deepEqual(studioAppearanceOrDefault(null), originalStudioAppearance());
  assert.deepEqual(studioAppearanceOrDefault([]), originalStudioAppearance());
  assert.deepEqual(studioAppearanceOrDefault("original"), originalStudioAppearance());
});

test("studio contract: wallpaper numbers stay inside the rendering bounds", () => {
  const atCap = appearance();
  atCap.wallpaper = {
    fit: "cover",
    positionX: 0,
    positionY: 100,
    dim: 0,
    blur: STUDIO_LIMITS.blurMax,
  };
  assert.equal(parseStudioAppearance(atCap).ok, true);
  for (const wallpaper of [
    { ...atCap.wallpaper, dim: 1.01 },
    { ...atCap.wallpaper, dim: -0.01 },
    { ...atCap.wallpaper, blur: 24.01 },
    { ...atCap.wallpaper, positionX: 100.01 },
    { ...atCap.wallpaper, positionY: Number.NaN },
    { ...atCap.wallpaper, blur: Number.POSITIVE_INFINITY },
    { ...atCap.wallpaper, fit: "stretch" },
  ]) {
    const next = appearance();
    next.wallpaper = wallpaper as typeof next.wallpaper;
    assert.equal(parseStudioAppearance(next).ok, false);
  }
});

test("studio contract: material, type, controls, and effects are allowlisted", () => {
  for (const treatment of ["flat", "glass", "matte", "metal"] as const) {
    const next = appearance();
    next.material = { treatment, transparency: 0, depth: 0 };
    assert.equal(unwrap(parseStudioAppearance(next)).material.treatment, treatment);
  }
  const theme = appearance();
  theme.material = { treatment: "falcons" as "flat", transparency: 0, depth: 0 };
  assert.equal(parseStudioAppearance(theme).ok, false);
  const font = appearance();
  font.typography = {
    presetId: "https://example.com/font.css" as "system",
    scale: 1,
    numeralEmphasis: 0,
  };
  assert.equal(parseStudioAppearance(font).ok, false);
  const scale = appearance();
  scale.typography = { presetId: "system", scale: 0.85, numeralEmphasis: 1 };
  assert.equal(parseStudioAppearance(scale).ok, true);
  scale.typography = { presetId: "system", scale: 0.84, numeralEmphasis: 0 };
  assert.equal(parseStudioAppearance(scale).ok, false);
  const pack = appearance();
  pack.controls = { density: "comfortable", treatmentId: "industrial" as "original" };
  assert.equal(parseStudioAppearance(pack).ok, false);
  const dense = appearance();
  dense.controls = { density: "cozy" as "compact", treatmentId: "original" };
  assert.equal(parseStudioAppearance(dense).ok, false);
  const effects = appearance();
  effects.effects = { decorationIntensity: 1.1, animationIntensity: 0 };
  assert.equal(parseStudioAppearance(effects).ok, false);
});

test("studio contract: ids reject paths and urls, and names stay short plain text", () => {
  for (const id of ["../secret", "/tmp/a", "https://x", "a/b", "a\\b", "a.b", "", "x".repeat(65)]) {
    assert.equal(parseStudioAppearance(appearance({ id })).ok, false, id);
    assert.equal(parseStudioAppearance(appearance({ wallpaperAssetId: id })).ok, false, id);
  }
  assert.equal(parseStudioAppearance(appearance({ id: "a".repeat(64) })).ok, true);
  assert.equal(parseStudioAppearance(appearance({ wallpaperAssetId: "" })).ok, false);
  const named = unwrap(parseStudioAppearance(appearance({ name: "  My   look  " })));
  assert.equal(named.name, "My look");
  assert.equal(parseStudioAppearance(appearance({ name: "x".repeat(49) })).ok, false);
  assert.equal(parseStudioAppearance(appearance({ name: "line\nbreak" })).ok, false);
  assert.equal(parseStudioAppearance(appearance({ name: "   " })).ok, false);
});

test("studio contract: an asset ref is a bounded raster description, not pixels", () => {
  const parsed = unwrap(parseAssetRef(asset({ orientation: 6, format: "webp" })));
  assert.equal(parsed.format, "webp");
  assert.equal(parsed.orientation, 6);
  assert.equal(JSON.stringify(parsed).includes("base64"), false);
  const edge = asset({
    width: 4000,
    height: 2000,
    bytes: STUDIO_LIMITS.assetBytesMax,
    orientation: 8,
  });
  assert.equal(parseAssetRef(edge).ok, true);
  assert.equal(parseAssetRef(asset({ width: 4000, height: 2001 })).ok, false);
  assert.equal(parseAssetRef(asset({ width: 4096, height: 4096 })).ok, false);
  assert.equal(parseAssetRef(asset({ bytes: 0 })).ok, false);
  assert.equal(parseAssetRef(asset({ bytes: STUDIO_LIMITS.assetBytesMax + 1 })).ok, false);
  assert.equal(parseAssetRef(asset({ width: 1.5 })).ok, false);
  assert.equal(parseAssetRef({ ...asset(), orientation: 0 }).ok, false);
  assert.equal(parseAssetRef({ ...asset(), orientation: 9 }).ok, false);
  for (const format of ["svg", "jpg", "gif", "heic", "image/jpeg"] as const) {
    assert.equal(parseAssetRef(asset({ format: format as "jpeg" })).ok, false, format);
  }
  const extra = { ...asset(), pixels: "data:image/png;base64,AAAA" };
  assert.equal(parseAssetRef(extra).ok, false);
  assert.equal(assetRefOrNull(extra), null);
  assert.equal(assetRefOrNull(asset())?.id, "photo-1");
});

test("studio contract: a draft can explain a proposal and cannot carry unknown fields", () => {
  const draft: StudioDraft = {
    baseAppearanceId: "original",
    proposed: appearance({ id: "look-2", name: "Draft" }),
    explanation: "Dimmer metal panels.",
    warnings: ["Check contrast."],
  };
  assert.deepEqual(unwrap(parseStudioDraft(draft)), draft);
  const bare: StudioDraft = { proposed: originalStudioAppearance(), warnings: [] };
  assert.deepEqual(unwrap(parseStudioDraft(bare)), bare);
  const extra = { ...draft, save: true };
  assert.equal(parseStudioDraft(extra).ok, false);
  assert.deepEqual(studioDraftOrDefault(extra), originalStudioDraft());
  const broken = { ...draft, proposed: { ...draft.proposed, version: 9 } };
  assert.equal(parseStudioDraft(broken).ok, false);
  assert.equal(parseStudioDraft({ ...draft, explanation: "" }).ok, false);
  assert.equal(parseStudioDraft({ ...draft, explanation: "x".repeat(401) }).ok, false);
  assert.equal(
    parseStudioDraft({ ...draft, warnings: Array.from({ length: 9 }, () => "Careful.") }).ok,
    false,
  );
});

test("studio contract: AI availability and proposals never invent a save", () => {
  assert.deepEqual(
    ["available", "unsupported", "not-ready", "error"].map((value) =>
      unwrap(parseAIAvailability(value)),
    ),
    ["available", "unsupported", "not-ready", "error"],
  );
  assert.equal(parseAIAvailability("ready").ok, false);
  assert.equal(aiAvailabilityOrDefault({}), "unsupported");
  const request = {
    instruction: "Match this wallpaper with dimmer panels.",
    current: originalStudioAppearance(),
  };
  assert.deepEqual(unwrap(parseProposeAppearanceRequest(request)).instruction, request.instruction);
  assert.equal(
    parseProposeAppearanceRequest({ ...request, image: "data:image/jpeg;base64,AAAA" }).ok,
    false,
  );
  assert.equal(proposeAppearanceRequestOrNull({ ...request, instruction: "" }), null);
  assert.equal(
    parseProposeAppearanceRequest({ ...request, instruction: "a".repeat(241) }).ok,
    false,
  );
  assert.equal(
    unwrap(parseProposeAppearanceRequest({ ...request, instruction: "a".repeat(240) })).instruction
      .length,
    240,
  );
  const draft = originalStudioDraft();
  const ready = unwrap(parseProposeAppearanceResponse({ availability: "available", draft }));
  assert.equal(ready.availability, "available");
  assert.ok(ready.draft);
  for (const availability of ["unsupported", "not-ready", "error"] as const) {
    const quiet = unwrap(parseProposeAppearanceResponse({ availability }));
    assert.equal(quiet.availability, availability);
    assert.equal("draft" in quiet, false);
    assert.equal(parseProposeAppearanceResponse({ availability, draft }).ok, false);
  }
  assert.equal(parseProposeAppearanceResponse({ availability: "available" }).ok, false);
  const leaked = proposeAppearanceResponseOrDefault({
    availability: "available",
    draft,
    autoSave: true,
  });
  assert.deepEqual(leaked, { availability: "unsupported" });
  assert.equal("draft" in leaked, false);
});

test("studio contract: an intent is bounded and a bad one is not applied", () => {
  const intent = unwrap(
    parseStudioIntent({
      instruction: "Customize Spread",
      targetProfileId: "profile-1",
      receipt: "pending",
    }),
  );
  assert.equal(intent.receipt, "pending");
  assert.equal(
    unwrap(
      parseStudioIntent({
        instruction: "Show the preview",
        targetProfileId: "abc123",
        receipt: "previewed",
      }),
    ).receipt,
    "previewed",
  );
  assert.equal(
    unwrap(
      parseStudioIntent({
        instruction: "Use it",
        targetProfileId: "abc123",
        receipt: "applied",
      }),
    ).receipt,
    "applied",
  );
  assert.equal(
    studioIntentOrNull({
      instruction: "Use it",
      targetProfileId: "../other",
      receipt: "applied",
    }),
    null,
  );
  assert.equal(
    studioIntentOrNull({
      instruction: "Use it",
      targetProfileId: "abc123",
      receipt: "applied",
      saved: true,
    }),
    null,
  );
  assert.equal(studioIntentOrNull(null), null);
  assert.equal(
    parseStudioIntent({ instruction: "x", targetProfileId: "p1", receipt: "done" }).ok,
    false,
  );
});

test("studio contract: this module does not touch storage, fetch, or data-theme", () => {
  const source = readFileSync(new URL("./contract.ts", import.meta.url), "utf8");
  assert.equal(source.includes("localStorage.getItem"), false);
  assert.equal(source.includes("localStorage.setItem"), false);
  assert.equal(source.includes("indexedDB"), false);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("setAttribute"), false);
  assert.equal(source.includes('setAttribute("data-theme"'), false);
  const poisoned = JSON.parse(
    '{"version":1,"id":"original","__proto__":{"admin":true},"name":"Original"}',
  );
  const poisonedRead = parseStudioAppearance(poisoned);
  assert.equal(poisonedRead.ok, false);
  if (!poisonedRead.ok) assert.equal(poisonedRead.reason, "unknown-field:__proto__");
  assert.equal(poisoned.admin, undefined);
});
