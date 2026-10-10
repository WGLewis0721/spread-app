import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertBaseline, updateInventory } from './update-inventory.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('documentation refresh preserves v7; a changed film input cannot be blessed by refreshing hashes', () => {
  const temporaryRoot = realpathSync(tmpdir());
  const fixture = mkdtempSync(join(temporaryRoot, 'spread-film-preservation-'));
  try {
    const manifest = JSON.parse(readFileSync(join(root, 'ASSETS.json'), 'utf8'));
    for (const path of ['ASSETS.json', 'docs/BASELINE.json', ...manifest.files.map(f => f.path)]) {
      const destination = join(fixture, path);
      mkdirSync(dirname(destination), {recursive: true});
      copyFileSync(join(root, path), destination);
    }
    const preserved = assertBaseline(fixture);
    writeFileSync(join(fixture, 'README.md'), 'Intentional documentation revision\n');
    const result = updateInventory(fixture);
    assert.equal(result.preservedInputs, preserved);
    const refreshed = readFileSync(join(fixture, 'ASSETS.json'));
    const filmSource = join(fixture, 'src/HalliePivotFilm.tsx');
    writeFileSync(filmSource, Buffer.concat([readFileSync(filmSource), Buffer.from('// accidental golden edit\n')]));
    assert.throws(() => updateInventory(fixture), /Preserved v7 input changed/);
    assert.deepEqual(readFileSync(join(fixture, 'ASSETS.json')), refreshed, 'A failed preservation gate must not rewrite the inventory');
    const reference = join(fixture, 'docs/BASELINE.json');
    writeFileSync(reference, Buffer.concat([readFileSync(reference), Buffer.from(' ')]));
    assert.throws(() => updateInventory(fixture), /Frozen v7 reference changed/);
    assert.deepEqual(readFileSync(join(fixture, 'ASSETS.json')), refreshed);
  } finally {
    assert.equal(dirname(realpathSync(fixture)), temporaryRoot, 'Only remove the verified isolated test directory');
    assert(basename(fixture).startsWith('spread-film-preservation-'));
    rmSync(fixture, {recursive: true, force: true});
  }
});
