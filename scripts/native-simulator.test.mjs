import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseSimulator } from './native-simulator.mjs';
const runtime = { identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-5', version: '18.5', isAvailable: true };
const modern = { identifier: 'real-6th-8GB', name: 'iPad Pro (12.9-inch) (6th generation)', minRuntimeVersion: 16 * 65536 };
const old = { identifier: 'old-1st', name: 'iPad Pro (12.9-inch) (1st generation)', maxRuntimeVersion: 16 * 65536 };
test('1024 selector rejects the incompatible oldest iPad even when it is listed last', () => {
  assert.equal(chooseSimulator([runtime], [modern, old], 1024).device.identifier, modern.identifier);
});
test('runtime supported device list takes precedence over a matching name', () => {
  assert.throws(() => chooseSimulator([{...runtime, supportedDeviceTypes: [{ identifier: 'another-device' }] }], [modern], 1024), /compatible device/);
});
test('selects the newest available compatible iOS runtime, excluding unavailable runtimes', () => {
  const future = {...runtime, version: '26.0', identifier: 'iOS-26-0', isAvailable: false};
  assert.equal(chooseSimulator([runtime, future], [modern], 1024).runtime.version, '18.5');
});
test('fails explicitly when the requested viewport has no supported device', () => {
  assert.throws(() => chooseSimulator([runtime], [modern], 820), /compatible device/);
});
test('rejects unknown widths and never selects an iOS 16 device to pass a gate', () => {
  assert.throws(() => chooseSimulator([runtime], [modern], 100), /Unsupported/);
  assert.throws(() => chooseSimulator([{...runtime, version:'16.0'}], [modern], 1024), /compatible device/);
});
