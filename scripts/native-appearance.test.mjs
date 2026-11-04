import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyNativeAppearance } from './verify-native-appearance.mjs';

test('accepts the rendered native root inside the tool response envelope', () => {
  assert.equal(verifyNativeAppearance({ ok: true, data: { nodes: [
    { identifier: 'native-content', value: 'reduce-motion;dark' },
  ] } }, 'dark').rootCount, 1);
});
test('rejects an opposite rendered appearance even when unrelated text names the expected one', () => {
  assert.throws(() => verifyNativeAppearance({ nodes: [
    { identifier: 'appearance-dark', value: 'motion;dark' },
    { identifier: 'native-content', value: 'motion;light' },
  ] }, 'dark'), /Expected rendered dark/);
});
test('rejects a missing native root rather than accepting an app or system settings label', () => {
  assert.throws(() => verifyNativeAppearance({ nodes: [{ label: 'Dark', value: 'dark' }] }, 'dark'), /no native-content/);
});
test('requires every reported native root to agree on a multi-panel device', () => {
  assert.throws(() => verifyNativeAppearance({ nodes: [
    { identifier: 'native-content', value: 'motion;dark' },
    { identifier: 'native-content', value: 'motion;light' },
  ] }, 'dark'), /Expected rendered dark/);
});
