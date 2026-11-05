import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { classifyAccessibilitySnapshot, verifySnapshotFile } from './verify-native-accessibility.mjs';

const snapshot = (nodes, success = true) => JSON.stringify({ success, data: { nodes } });
const tree = [{ kind: 'application', label: 'Spread' }, { kind: 'button', identifier: 'native-spread', label: 'Spread' }];

test('accepts a real structured app and UI tree without selector lookup', () => {
  assert.deepEqual(classifyAccessibilitySnapshot(snapshot(tree)), {
    status: 'PASS', nodeCount: 2, reason: 'Readable application and UI tree',
  });
});

test('blocks an empty, invalid, or failed transport snapshot', () => {
  for (const input of [snapshot([]), snapshot([{ kind: 'application' }]), snapshot(tree, false), '', '{oops']) {
    assert.equal(classifyAccessibilitySnapshot(input).status, 'BLOCKED');
  }
});

test('helper reports and never silently converts blocked to pass', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'spread-snapshot-'));
  const src = path.join(dir, 'tree.json');
  const reportPath = path.join(dir, 'preflight.json');
  await writeFile(src, snapshot(tree));
  assert.equal((await verifySnapshotFile(src, reportPath)).status, 'PASS');
  assert.equal(JSON.parse(await readFile(reportPath, 'utf8')).nodeCount, 2);
  await writeFile(src, snapshot([]));
  assert.equal((await verifySnapshotFile(src, reportPath)).status, 'BLOCKED');
  assert.equal(JSON.parse(await readFile(reportPath, 'utf8')).status, 'BLOCKED');
});
