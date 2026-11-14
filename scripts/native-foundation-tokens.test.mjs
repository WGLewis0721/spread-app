// Native design foundations (W1). Reads the Swift Theme as text, as native-color-contrast.test.mjs does.
// Passing contrast pairs are hard assertions. Pairs that fail today are `todo` tests: they are reported, not
// hidden, and the owner decision that would fix each one is recorded in docs/design/specs/2026-11-14-w1-design-foundations.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../ios/SpreadNativeV2/Sources/SpreadNativeV2/', import.meta.url));
const themePath = join(sourceRoot, 'Theme/SpreadTheme.swift');
const theme = readFileSync(themePath, 'utf8');

const swiftFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? swiftFiles(full) : name.endsWith('.swift') ? [full] : [];
});

const hexToRgb = (value) => [16, 8, 0].map((shift) => (value >>> shift) & 255);
const channel = (value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgb) => channel(rgb[0]) * 0.2126 + channel(rgb[1]) * 0.7152 + channel(rgb[2]) * 0.0722;
const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const blend = (fg, bg, alpha) => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha));

// `static let name = dynamic(light: 0x…, dark: 0x…)`, private or public.
function pair(name) {
  const m = theme.match(new RegExp(`static let ${name} = dynamic\\(light: 0x([0-9A-F]{6}), dark: 0x([0-9A-F]{6})\\)`));
  assert.ok(m, `Theme token ${name} is not a light/dark hex pair`);
  return { light: hexToRgb(parseInt(m[1], 16)), dark: hexToRgb(parseInt(m[2], 16)) };
}
// `static let name = adaptive(light: (r, g, b, a), dark: (r, g, b, a))`, the first tuple of each mode.
function alphaPair(name) {
  const m = theme.match(new RegExp(`static let ${name} = adaptive\\(\\s*light:\\s*\\(([\\d.,\\s]+)\\),\\s*dark:\\s*\\(([\\d.,\\s]+)\\)`));
  assert.ok(m, `Theme token ${name} is not an adaptive RGBA pair`);
  const read = (s) => s.split(',').map(Number);
  const [lr, lg, lb, la] = read(m[1]);
  const [dr, dg, db, da] = read(m[2]);
  return { light: { rgb: [lr, lg, lb], alpha: la }, dark: { rgb: [dr, dg, db], alpha: da } };
}
// Resolve a text token (solid or alpha) over a surface for one mode.
function ink(name, mode, surface) {
  const token = theme.includes(`static let ${name} = adaptive(`) ? alphaPair(name) : null;
  if (!token) return pair(name)[mode];
  const { rgb, alpha } = token[mode];
  return blend(rgb, surface, alpha);
}
const surface = (name, mode) => pair(name)[mode];
const MODES = ['light', 'dark'];
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

test('W1 tokens exist with the values the audit adopted', () => {
  assert.match(theme, /static let radiusSmall: CGFloat = 12\b/);
  assert.match(theme, /static let radiusInset: CGFloat = 18\b/);
  assert.match(theme, /static let iconSmall: CGFloat = 16\b/);
  assert.match(theme, /static let iconMedium: CGFloat = 20\b/);
  assert.match(theme, /static let iconLarge: CGFloat = 24\b/);
  assert.match(theme, /static let roleFallbackHex = "#8E8E93"/);
  assert.match(theme, /static let roleFallback = Color\(hex6: 0x8E8E93\)/, 'the string and the Color must name the same grey');
});

const deferredFiles = new Set([
  'Life/LifeRecurringPlanForm.swift',
  'Life/LifeRoot.swift',
  'Life/LifeWalletStack.swift',
  'Life/LifeWeekView.swift',
  'Sheets/ManageSheets.swift',
  'Sheets/BackupRestoreSheet.swift',
]);

test('native code outside Theme uses the grey and corner tokens, not their literals', () => {
  const offenders = [];
  for (const file of swiftFiles(sourceRoot)) {
    if (file === themePath) continue;
    // Deferred to the lanes that own these files (W2, W5, W8). Their 11 substitutions are listed in
    // docs/design/finalize/TOKEN_AUDIT.md under "Apply after W5, W2 and W8 merge". Remove an entry when its file is fixed.
    if (deferredFiles.has(relative(sourceRoot, file))) continue;
    const text = readFileSync(file, 'utf8');
    if (text.includes('"#8E8E93"')) offenders.push(`${relative(sourceRoot, file)}: literal grey`);
    if (/cornerRadius: (12|14|16|18|24)[),]/.test(text)) offenders.push(`${relative(sourceRoot, file)}: literal corner radius that has a token`);
  }
  assert.deepEqual(offenders, []);
});

for (const mode of MODES) {
  test(`${mode}: primary ink and secondary text meet 4.5:1 on canvas, card and inset`, () => {
    for (const sn of ['canvas', 'elevated', 'inset']) {
      const bg = surface(sn, mode);
      assert.ok(contrast(ink('ink', mode, bg), bg) >= AA_TEXT, `ink on ${sn}`);
      assert.ok(contrast(ink('secondary', mode, bg), bg) >= AA_TEXT, `secondary on ${sn}`);
    }
  });

  test(`${mode}: accent, caution and success text meet 4.5:1 on canvas and elevated`, () => {
    for (const sn of ['canvas', 'elevated']) {
      const bg = surface(sn, mode);
      for (const name of ['accent', 'caution', 'success']) {
        assert.ok(contrast(pair(name)[mode], bg) >= AA_TEXT, `${name} on ${sn}`);
      }
    }
  });

  test(`${mode}: danger text meets 4.5:1 on canvas and elevated`, () => {
    for (const sn of ['canvas', 'elevated']) {
      assert.ok(contrast(pair('danger')[mode], surface(sn, mode)) >= AA_TEXT, `danger on ${sn}`);
    }
  });

  test(`${mode}: accent icons meet 3:1 on canvas`, () => {
    assert.ok(contrast(pair('accent')[mode], surface('canvas', mode)) >= AA_NON_TEXT);
  });

  test(`${mode}: white label on the lit accent gradient meets 4.5:1 at both ends`, () => {
    const start = hexToRgb(0x0A6FE8);
    const end = hexToRgb(0x0559C7);
    assert.ok(contrast([255, 255, 255], start) >= AA_TEXT, 'gradient start');
    assert.ok(contrast([255, 255, 255], end) >= AA_TEXT, 'gradient end');
  });

  test(`${mode}: tertiary text meets 4.5:1 on canvas and elevated`, () => {
    for (const sn of ['canvas', 'elevated']) {
      const bg = surface(sn, mode);
      assert.ok(contrast(ink('tertiary', mode, bg), bg) >= AA_TEXT, `tertiary on ${sn}`);
    }
  });
}

// Known failures. Each records the measured ratio and the fix that needs the owner's decision (spec section 4, E1 to E5).
test('light tertiary text on the inset recess meets 4.5:1 (measured 4.33:1; fix: darken tertiary light to #56627D, 4.95:1)',
  { todo: 'owner decision E1: brand colour change' }, () => {
    const bg = surface('inset', 'light');
    assert.ok(contrast(ink('tertiary', 'light', bg), bg) >= AA_TEXT);
  });

test('dark accent text on the lit Wallet card meets 4.5:1 (measured 4.05:1; fix: #4DA3FF, 5.63:1)',
  { todo: 'owner decision E2: brand colour change for text use' }, () => {
    assert.ok(contrast(pair('accent').dark, surface('cardTop', 'dark')) >= AA_TEXT);
  });

test('dark danger text on the lit Wallet card meets 4.5:1 (measured 4.34:1; fix: #FF6A61, 5.27:1)',
  { todo: 'owner decision E3: brand colour change for text use' }, () => {
    assert.ok(contrast(pair('danger').dark, surface('cardTop', 'dark')) >= AA_TEXT);
  });

test('white label on the dark solid danger fill meets 4.5:1 (measured 3.41:1; fix: a deeper fill such as #D2352B, 4.90:1)',
  { todo: 'owner decision E4: add a filled-danger token' }, () => {
    assert.ok(contrast([255, 255, 255], pair('danger').dark) >= AA_TEXT);
  });

test('white label on the dark solid accent meets 4.5:1 (measured 3.65:1; rule: filled controls use accentGradient)',
  { todo: 'rule for filled controls: use the gradient, or name the solid-fill exception' }, () => {
    assert.ok(contrast([255, 255, 255], pair('accent').dark) >= AA_TEXT);
  });
