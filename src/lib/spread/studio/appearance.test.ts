import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  MATERIAL_TREATMENTS,
  STUDIO_LIMITS,
  originalStudioAppearance,
  type StudioAppearanceV1,
} from "./contract.ts";
import { contrastRatio, contrastRatioHex, hexToRgb, mixRgb } from "./contrast.ts";
import {
  STUDIO_STYLE_KEYS,
  appearanceForId,
  boundAppearance,
  effectiveMaterial,
  isSafeWallpaperUrl,
  resolveStudioScope,
  type StudioScope,
} from "./appearance.ts";
import { SAMPLE_SCHEMES, sampleAppearance } from "./appearance-fixtures.ts";
import { SHIPPED_FONT_SANS, STUDIO_MIN_TARGET_PX, shippedRoleColors } from "./theme.ts";

const BLOB_A = "blob:http://127.0.0.1:8080/profile-a";
const BLOB_B = "blob:http://127.0.0.1:8080/profile-b";

function custom(patch: Partial<StudioAppearanceV1> = {}): StudioAppearanceV1 {
  return {
    ...originalStudioAppearance(),
    id: "look-1",
    name: "My look",
    palette: {
      accent: "#0b3a82",
      surface: "#f7f4ee",
      text: "#1a1a1a",
      secondaryText: "#4e4a43",
    },
    ...patch,
  };
}

function applied(scope: StudioScope): Record<string, string> {
  assert.equal(scope.applied, true);
  assert.ok(scope.attribute);
  return scope.style;
}

test("appearance: numbers that skip the parser stay inside the contract bounds", () => {
  const wild = originalStudioAppearance();
  wild.wallpaper = { ...wild.wallpaper, blur: 500, dim: 4, positionX: -10, positionY: 140 };
  wild.typography = { ...wild.typography, scale: 9, numeralEmphasis: -1 };
  wild.material = { ...wild.material, transparency: 8, depth: Number.NaN, treatment: "neon" as "flat" };
  wild.effects = { decorationIntensity: 12, animationIntensity: Number.POSITIVE_INFINITY };
  const bounded = boundAppearance(wild);
  assert.equal(bounded.wallpaper.blur, STUDIO_LIMITS.blurMax);
  assert.equal(bounded.wallpaper.dim, 1);
  assert.equal(bounded.wallpaper.positionX, 0);
  assert.equal(bounded.wallpaper.positionY, 100);
  assert.equal(bounded.typography.scale, STUDIO_LIMITS.scaleMax);
  assert.equal(bounded.typography.numeralEmphasis, 0);
  assert.equal(bounded.material.transparency, 1);
  assert.equal(bounded.material.depth, 0);
  assert.equal(bounded.material.treatment, "flat");
  assert.equal(bounded.effects.decorationIntensity, 1);
  assert.equal(bounded.effects.animationIntensity, 0);
  const refused = resolveStudioScope({ enabled: true, appearance: wild });
  assert.equal(refused.attribute, null);
  assert.deepEqual(refused.style, {});
  assert.equal(JSON.stringify(refused).includes("500"), false);
});

test("appearance: a valid edge still emits finite values inside the caps", () => {
  const edge = custom({
    id: "edge-1",
    name: "Edge",
    material: { treatment: "glass", transparency: 1, depth: 1 },
    typography: { presetId: "system", scale: 1.4, numeralEmphasis: 1 },
    wallpaper: { fit: "contain", positionX: 0, positionY: 100, dim: 1, blur: 24 },
    effects: { decorationIntensity: 1, animationIntensity: 1 },
  });
  const style = applied(resolveStudioScope({ enabled: true, appearance: edge }));
  const scale = Number(style["--studio-type-scale"]);
  const blur = Number(style["--studio-blur"].replace("px", ""));
  const wallpaperBlur = Number(style["--studio-wallpaper-blur"].replace("px", ""));
  const transparency = Number(style["--studio-transparency"]);
  const motion = Number(style["--studio-motion-ms"].replace("ms", ""));
  assert.ok(scale >= STUDIO_LIMITS.scaleMin && scale <= STUDIO_LIMITS.scaleMax);
  assert.equal(scale, 1.4);
  assert.ok(blur >= 0 && blur <= STUDIO_LIMITS.blurMax);
  assert.ok(wallpaperBlur >= 0 && wallpaperBlur <= STUDIO_LIMITS.blurMax);
  assert.ok(transparency >= 0 && transparency <= 1);
  assert.ok(motion >= 0 && motion <= 340);
  assert.equal(style["--studio-numeral-weight"], "800");
  assert.equal(style["--studio-target-min"], `${STUDIO_MIN_TARGET_PX}px`);
  for (const value of Object.values(style)) {
    assert.equal(value.includes("NaN"), false);
    assert.equal(value.includes("Infinity"), false);
  }
});

test("appearance: user colors including extremes clear the contrast floor", () => {
  const cases = [
    { text: "#ffffff", secondaryText: "#ffffff", accent: "#ffffff", surface: "#ffffff" },
    { text: "#000000", secondaryText: "#000000", accent: "#000000", surface: "#000000" },
    { text: "#ffff00", secondaryText: "#ffff00", accent: "#ffff00", surface: "#ffffff" },
    { text: "#ff0000", secondaryText: "#00ff00", accent: "#0000ff", surface: "#00ff00" },
    { text: "#777777", secondaryText: "#888888", accent: "#999999", surface: "#7a7a7a" },
  ];
  for (const palette of cases) {
    const scope = resolveStudioScope({
      enabled: true,
      appearance: custom({ id: "contrast-1", name: "Contrast", palette }),
    });
    const style = applied(scope);
    const text = contrastRatioHex(style["--ink"], style["--elevated"]);
    const secondary = contrastRatioHex(style["--secondary"], style["--elevated"]);
    const accent = contrastRatioHex(style["--accent"], style["--elevated"]);
    assert.ok(text !== null && text >= 4.5, palette.text);
    assert.ok(secondary !== null && secondary >= 4.5, palette.secondaryText);
    assert.ok(accent !== null && accent >= 4.5, palette.accent);
    const strong = applied(
      resolveStudioScope({
        enabled: true,
        moreContrast: true,
        appearance: custom({ id: "contrast-1", name: "Contrast", palette }),
      }),
    );
    const strongText = contrastRatioHex(strong["--ink"], strong["--elevated"]);
    assert.ok(strongText !== null && strongText >= 7);
  }
});

test("appearance: role and status colors ignore the wallpaper handle", () => {
  const appearance = custom({
    id: "roles-1",
    name: "Roles",
    wallpaperAssetId: "wall-1",
    material: { treatment: "glass", transparency: 0.4, depth: 0.5 },
  });
  const first = applied(
    resolveStudioScope({
      enabled: true,
      appearance,
      wallpaper: { assetId: "wall-1", url: BLOB_A },
    }),
  );
  const second = applied(
    resolveStudioScope({
      enabled: true,
      appearance,
      wallpaper: { assetId: "wall-1", url: BLOB_B },
    }),
  );
  const roleKeys = STUDIO_STYLE_KEYS.filter((key) => key.startsWith("--studio-role-"));
  assert.equal(roleKeys.length, shippedRoleColors().length);
  const statusKeys = ["--studio-status-done", "--studio-status-danger", "--studio-status-caution", "--studio-status-accent"];
  for (const key of [...roleKeys, ...statusKeys, "--scrim", "--danger", "--caution"]) {
    assert.equal(first[key], second[key], key);
    assert.equal(first[key].includes(BLOB_A), false, key);
    assert.equal(first[key].includes("url("), false, key);
  }
  const seen = new Set<string>();
  for (const key of roleKeys) {
    const ratio = contrastRatioHex(first[key], first["--elevated"]);
    assert.ok(ratio !== null && ratio >= 3, key);
    assert.equal(seen.has(first[key]), false, key);
    seen.add(first[key]);
  }
  assert.notEqual(first["--studio-wallpaper-image"], second["--studio-wallpaper-image"]);
  assert.equal(first["--studio-wallpaper-image"], `url("${BLOB_A}")`);
});

test("appearance: reduced motion zeroes animation and leaves the material", () => {
  const appearance = custom({
    material: { treatment: "metal", transparency: 0.2, depth: 0.9 },
    effects: { decorationIntensity: 0.8, animationIntensity: 1 },
  });
  const moving = resolveStudioScope({ enabled: true, appearance });
  const still = resolveStudioScope({ enabled: true, appearance, reducedMotion: true });
  assert.equal(moving.material, "metal");
  assert.equal(still.material, "metal");
  assert.equal(applied(moving)["--studio-motion-ms"], "340ms");
  assert.equal(applied(still)["--studio-motion-ms"], "0ms");
  assert.equal(applied(still)["--studio-decoration"], applied(moving)["--studio-decoration"]);
});

test("appearance: reduced transparency and each gate degrade to flat on their own", () => {
  const glass = custom({ material: { treatment: "glass", transparency: 0.5, depth: 0.6 } });
  const matte = custom({ id: "look-2", name: "Matte", material: { treatment: "matte", transparency: 0.4, depth: 0.7 } });
  const metal = custom({ id: "look-3", name: "Metal", material: { treatment: "metal", transparency: 0.3, depth: 1 } });
  const reduced = resolveStudioScope({ enabled: true, appearance: glass, reducedTransparency: true });
  assert.equal(reduced.requestedMaterial, "glass");
  assert.equal(reduced.material, "flat");
  assert.equal(applied(reduced)["--studio-transparency"], "0");
  assert.equal(applied(reduced)["--studio-blur"], "0px");
  assert.equal(applied(reduced)["--studio-decoration"], "0");
  assert.equal(
    resolveStudioScope({ enabled: true, appearance: glass, gates: { glass: false } }).material,
    "flat",
  );
  assert.equal(
    resolveStudioScope({ enabled: true, appearance: matte, gates: { matte: false, glass: true, metal: true } }).material,
    "flat",
  );
  assert.equal(
    resolveStudioScope({ enabled: true, appearance: metal, gates: { metal: false, glass: true, matte: true } }).material,
    "flat",
  );
  assert.equal(
    resolveStudioScope({ enabled: true, appearance: metal, gates: { glass: false, matte: false } }).material,
    "metal",
  );
  assert.equal(effectiveMaterial("glass", false, { glass: true, matte: false, metal: false }), "glass");
  assert.equal(effectiveMaterial("flat", true, { glass: true, matte: true, metal: true }), "flat");
});

test("appearance: an unknown id and the original id both keep the shipped look", () => {
  const saved = custom({ wallpaperAssetId: "wall-1" });
  const missing = resolveStudioScope({
    enabled: true,
    lookupId: "not-saved",
    catalog: [saved],
    wallpaper: { assetId: "wall-1", url: BLOB_A },
    systemScheme: "dark",
  });
  const original = resolveStudioScope({
    enabled: true,
    appearance: originalStudioAppearance(),
    systemScheme: "dark",
  });
  const forged = custom({ id: "original", name: "Original", palette: { ...custom().palette, accent: "#ff0000" } });
  const forgedScope = resolveStudioScope({ enabled: true, appearance: forged, systemScheme: "light" });
  assert.equal(appearanceForId("not-saved", [saved]).id, "original");
  assert.equal(appearanceForId(saved.id, [saved]).id, saved.id);
  assert.equal(missing.attribute, null);
  assert.deepEqual(missing.style, original.style);
  assert.deepEqual(missing.style, {});
  assert.equal(forgedScope.attribute, null);
  assert.equal(JSON.stringify(missing).includes(BLOB_A), false);
  assert.equal(JSON.stringify(forgedScope).includes("#ff0000"), false);
});

test("appearance: profile switches cannot leave the previous wallpaper or accent", () => {
  const profileA = custom({
    id: "profile-a",
    name: "Profile A",
    wallpaperAssetId: "wall-a",
    palette: { accent: "#0b3a82", surface: "#f7f4ee", text: "#1a1a1a", secondaryText: "#4e4a43" },
  });
  const profileB = custom({
    id: "profile-b",
    name: "Profile B",
    wallpaperAssetId: "wall-b",
    palette: { accent: "#6b2d5b", surface: "#f3eef6", text: "#1c1218", secondaryText: "#5a4654" },
  });
  const first = resolveStudioScope({
    enabled: true,
    lookupId: "profile-a",
    catalog: [profileA, profileB],
    wallpaper: { assetId: "wall-a", url: BLOB_A },
  });
  const second = resolveStudioScope({
    enabled: true,
    lookupId: "profile-b",
    catalog: [profileA, profileB],
    wallpaper: { assetId: "wall-b", url: BLOB_B },
  });
  const backToOriginal = resolveStudioScope({
    enabled: true,
    lookupId: "original",
    catalog: [profileA, profileB],
    wallpaper: { assetId: "wall-a", url: BLOB_A },
  });
  assert.deepEqual(Object.keys(first.style), Object.keys(second.style));
  assert.deepEqual(Object.keys(first.style), [...STUDIO_STYLE_KEYS]);
  const leaked = Object.keys(first.style).filter((key) => !(key in second.style));
  assert.deepEqual(leaked, []);
  assert.equal(JSON.stringify(second.style).includes(BLOB_A), false);
  assert.equal(JSON.stringify(second.style).includes(profileA.palette.accent), false);
  assert.equal(second.wallpaper, BLOB_B);
  assert.equal(backToOriginal.attribute, null);
  assert.deepEqual(backToOriginal.style, {});
  const cleared = Object.keys(first.style).filter((key) => !(key in backToOriginal.style));
  assert.deepEqual(cleared, [...STUDIO_STYLE_KEYS]);
});

test("appearance: the flag off produces no attribute and drops the wallpaper", () => {
  const scope = resolveStudioScope({
    enabled: false,
    appearance: custom({ wallpaperAssetId: "wall-1", material: { treatment: "metal", transparency: 1, depth: 1 } }),
    wallpaper: { assetId: "wall-1", url: BLOB_A },
    lookupId: "look-1",
    catalog: [custom()],
  });
  assert.equal(scope.applied, false);
  assert.equal(scope.attribute, null);
  assert.deepEqual(scope.style, {});
  assert.equal(scope.material, "flat");
  assert.equal(scope.wallpaper, null);
  assert.equal(JSON.stringify(scope).includes("blob:"), false);
  assert.equal(JSON.stringify(scope).includes("data-theme"), false);
});

test("appearance: the same input resolves twice to the same style", () => {
  const input = {
    enabled: true,
    appearance: sampleAppearance("glass", "dark"),
    systemScheme: "light" as const,
    wallpaper: { assetId: "wall-1", url: BLOB_A },
    reducedMotion: false,
    reducedTransparency: false,
    moreContrast: false,
  };
  const first = resolveStudioScope(input);
  const second = resolveStudioScope(input);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
  first.style["--accent"] = "#000000";
  assert.notEqual(resolveStudioScope(input).style["--accent"], "#000000");
  assert.equal(first.scheme, "dark");
  for (const treatment of MATERIAL_TREATMENTS) {
    for (const scheme of SAMPLE_SCHEMES) {
      const sample = sampleAppearance(treatment, scheme);
      const scope = resolveStudioScope({ enabled: true, appearance: sample, systemScheme: scheme });
      assert.equal(scope.material, treatment, `${treatment} ${scheme}`);
      assert.equal(scope.attribute, `${treatment}-sample`);
      assert.equal(scope.style["--font-sans"], SHIPPED_FONT_SANS);
      assert.equal(scope.style["--studio-density-space"], "1");
    }
  }
});

test("appearance: wallpaper urls are opaque handles, never remote or inline bytes", () => {
  const appearance = custom({ wallpaperAssetId: "wall-1" });
  for (const url of [
    "https://example.com/a.png",
    "http://example.com/a.png",
    "data:image/png;base64,AAAA",
    "javascript:alert(1)",
    "blob:javascript:alert(1)",
    "/studio-assets/../secret",
    "file:///tmp/a.png",
  ]) {
    assert.equal(isSafeWallpaperUrl(url), false, url);
    const scope = resolveStudioScope({
      enabled: true,
      appearance,
      wallpaper: { assetId: "wall-1", url },
    });
    assert.equal(scope.wallpaper, null, url);
    assert.equal(applied(scope)["--studio-wallpaper-image"], "none");
    assert.ok(scope.warnings.includes("Wallpaper handle was ignored."));
  }
  assert.equal(isSafeWallpaperUrl("/studio-assets/wall-1"), true);
  const local = resolveStudioScope({
    enabled: true,
    appearance,
    wallpaper: { assetId: "other", url: "/studio-assets/wall-1" },
  });
  assert.equal(local.wallpaper, null);
  const bare = resolveStudioScope({ enabled: true, appearance });
  assert.equal(bare.wallpaper, null);
  assert.equal(bare.warnings.includes("Wallpaper handle was ignored."), false);
});

test("appearance: density and type stay on the system stack and the 44px target", () => {
  const compact = custom({
    controls: { density: "compact", treatmentId: "original" },
    typography: { presetId: "system", scale: 0.85, numeralEmphasis: 0 },
  });
  const style = applied(resolveStudioScope({ enabled: true, appearance: compact }));
  assert.equal(style["--studio-density-space"], "0.82");
  assert.equal(style["--studio-type-scale"], "0.85");
  assert.equal(style["--studio-numeral-weight"], "inherit");
  assert.equal(style["--studio-numeral-tracking"], "normal");
  assert.equal(style["--studio-target-min"], "44px");
  assert.equal(style["--font-sans"], SHIPPED_FONT_SANS);
  assert.equal(style["--font-sans"].includes("url"), false);
  const css = readFileSync(new URL("../../../styles.css", import.meta.url), "utf8");
  assert.equal(css.includes(SHIPPED_FONT_SANS), true);
  assert.match(css, /--accent:\s*#007aff;/);
  assert.match(css, /--elevated:\s*#ffffff;/);
  assert.match(css, /--ink:\s*#1d1d1f;/);
  assert.match(css, /--secondary:\s*#6e6e73;/);
  assert.match(css, /--elevated:\s*#1c1c1e;/);
  assert.match(css, /--accent:\s*#0a84ff;/);
});

function parseScrim(value: string): { r: number; g: number; b: number; a: number } {
  const match = /^rgba\((\d+), (\d+), (\d+), ([0-9.]+)\)$/.exec(value);
  assert.ok(match, value);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: Number(match[4]) };
}

/** Contrast of `text` on the scrim composited over pure black and pure white. */
function worstWallpaperContrast(text: string, scrim: string): number {
  const veil = parseScrim(scrim);
  const ink = hexToRgb(text);
  assert.ok(ink);
  const plate = { r: veil.r, g: veil.g, b: veil.b };
  const overBlack = contrastRatio(ink, mixRgb({ r: 0, g: 0, b: 0 }, plate, veil.a));
  const overWhite = contrastRatio(ink, mixRgb({ r: 255, g: 255, b: 255 }, plate, veil.a));
  return Math.min(overBlack, overWhite);
}

test("appearance: a wallpaper scrim keeps loose text at 4.5:1 even when dim is 0", () => {
  const fixtures = SAMPLE_SCHEMES.map((scheme) => {
    const appearance = sampleAppearance("glass", scheme);
    appearance.wallpaper = { ...appearance.wallpaper, dim: 0 };
    return { label: `glass ${scheme}`, appearance, scheme };
  });
  const harsh = custom({
    id: "scrim-harsh",
    name: "Harsh",
    mode: "dark",
    palette: { accent: "#000000", surface: "#555555", text: "#000000", secondaryText: "#777777" },
    wallpaperAssetId: "wall-1",
    wallpaper: { fit: "cover", positionX: 50, positionY: 50, dim: 0, blur: 0 },
    material: { treatment: "glass", transparency: 0.42, depth: 0.55 },
  });
  fixtures.push({ label: "harsh", appearance: harsh, scheme: "dark" });
  for (const fixture of fixtures) {
    const scope = resolveStudioScope({
      enabled: true,
      appearance: fixture.appearance,
      systemScheme: fixture.scheme,
      wallpaper: { assetId: "wall-1", url: BLOB_A },
    });
    const style = applied(scope);
    const scrim = parseScrim(style["--studio-scrim"]);
    assert.ok(scrim.a > 0, `${fixture.label} alpha ${scrim.a}`);
    for (const key of ["--ink", "--secondary", "--accent"] as const) {
      const ratio = worstWallpaperContrast(style[key], style["--studio-scrim"]);
      assert.ok(ratio + 1e-6 >= 4.5, `${fixture.label} ${key} ${ratio}`);
    }
    assert.ok(scope.warnings.includes("Wallpaper dim was raised so text on it stays readable."), fixture.label);
  }
  const light = sampleAppearance("glass", "light");
  light.wallpaper = { ...light.wallpaper, dim: 0 };
  const dim0 = parseScrim(
    applied(
      resolveStudioScope({
        enabled: true,
        appearance: light,
        wallpaper: { assetId: "wall-1", url: BLOB_A },
      }),
    )["--studio-scrim"],
  ).a;
  const full = sampleAppearance("glass", "light");
  full.wallpaper = { ...full.wallpaper, dim: 1 };
  const dim1 = parseScrim(
    applied(
      resolveStudioScope({
        enabled: true,
        appearance: full,
        wallpaper: { assetId: "wall-1", url: BLOB_A },
      }),
    )["--studio-scrim"],
  ).a;
  assert.ok(dim1 + 1e-6 >= dim0);
  assert.equal(dim1, 1);
  const uncovered = sampleAppearance("glass", "light");
  uncovered.wallpaper = { ...uncovered.wallpaper, dim: 0 };
  const bare = applied(resolveStudioScope({ enabled: true, appearance: uncovered }));
  assert.equal(bare["--studio-scrim"], "rgba(0, 0, 0, 0)");
});

test("appearance: more contrast keeps the rendered ink at 7:1 on the canvas", () => {
  const surfaces = ["#555555", "#636363", "#777777", "#2a2a2a", "#d0d0d0", "#ffffff", "#000000"];
  for (const surface of surfaces) {
    for (const text of ["#000000", "#ffffff", "#777777"]) {
      const dark = surface === "#000000" || surface === "#2a2a2a";
      const style = applied(
        resolveStudioScope({
          enabled: true,
          moreContrast: true,
          appearance: custom({
            id: "canvas-ink",
            name: "Canvas ink",
            mode: dark ? "dark" : "light",
            palette: { accent: text, surface, text, secondaryText: text },
          }),
        }),
      );
      const onCanvas = contrastRatioHex(style["--ink"], style["--canvas"]);
      const onSurface = contrastRatioHex(style["--ink"], style["--elevated"]);
      assert.ok(onCanvas !== null && onCanvas + 1e-6 >= 7, `${surface} on ${text} canvas ${onCanvas}`);
      assert.ok(onSurface !== null && onSurface + 1e-6 >= 7, `${surface} on ${text} surface ${onSurface}`);
    }
  }
});

test("appearance: this module does not touch storage, network, fonts, or data-theme", () => {
  for (const name of ["./appearance.ts", "./theme.ts", "./appearance-fixtures.ts"]) {
    const source = readFileSync(new URL(name, import.meta.url), "utf8");
    assert.equal(source.includes("localStorage"), false, name);
    assert.equal(source.includes("indexedDB"), false, name);
    assert.equal(source.includes("fetch("), false, name);
    assert.equal(source.includes("data-theme"), false, name);
    assert.equal(source.includes(":root"), false, name);
    assert.equal(source.includes("@font-face"), false, name);
    assert.equal(source.includes("fonts.googleapis"), false, name);
    assert.equal(source.includes("@/"), false, name);
    assert.equal(source.includes("enum "), false, name);
    assert.equal(/falcons|avengers|toy story|theme pack/i.test(source), false, name);
  }
});
