import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const theme = readFileSync(fileURLToPath(new URL('../ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift', import.meta.url)), 'utf8');
const hexColor = (value) => [16, 8, 0].map((shift) => (value >>> shift) & 255);
const channel = (value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgb) => channel(rgb[0]) * 0.2126 + channel(rgb[1]) * 0.7152 + channel(rgb[2]) * 0.0722;
const contrast = (a, b) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const blended = (text, surface, alpha) => text.map((value, i) => value * alpha + surface[i] * (1 - alpha));
function sample(name, mode) {
  const pattern = new RegExp('(?:public |private )?static let ' + name + ' = dynamic\\(light: 0x([0-9A-F]+), dark: 0x([0-9A-F]+)\\)');
  const line = theme.match(pattern);
  assert.ok(line, 'missing theme surface ' + name);
  return hexColor(parseInt(line[mode === 'light' ? 1 : 2], 16));
}
function tertiary(mode) {
  const rgba = theme.match(/public static let tertiary = adaptive\(\s*light:\s*\(([\d.,\s]+)\),\s*dark:\s*\(([\d.,\s]+)\)/);
  assert.ok(rgba, 'missing tertiary theme token');
  return rgba[mode === 'light' ? 1 : 2].split(',').map(Number);
}
test('tertiary text meets 4.5:1 on the brightest dark Wallet card', () => {
  const surface = sample('cardTop', 'dark');
  const [r, g, b, alpha] = tertiary('dark');
  assert.ok(contrast(blended([r, g, b], surface, alpha), surface) >= 4.5,
    'tertiary labels fell below 4.5:1 on the lightest dark Wallet surface');
});
test('tertiary text meets 4.5:1 on native dark elevated surface', () => {
  const surface = sample('elevated', 'dark');
  const [r, g, b, alpha] = tertiary('dark');
  assert.ok(contrast(blended([r, g, b], surface, alpha), surface) >= 4.5);
});
test('tertiary text meets 4.5:1 on light Wallet card', () => {
  const surface = sample('cardTop', 'light');
  const [r, g, b, alpha] = tertiary('light');
  assert.ok(contrast(blended([r, g, b], surface, alpha), surface) >= 4.5);
});
