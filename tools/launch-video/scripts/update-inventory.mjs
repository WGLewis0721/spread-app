import assert from 'node:assert/strict';
import console from 'node:console';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = data => createHash('sha256').update(data).digest('hex').toUpperCase();

export function assertBaseline(directory = root) {
  const reference = readFileSync(join(directory, 'docs/BASELINE.json'));
  assert.equal(digest(reference), '1E041CA5770249FB3514A48B2517BF42F4A17B75AA54F934544D2A8B45C3AFE8',
    'Frozen v7 reference changed; preserve the reference rather than refreshing it');
  const baseline = JSON.parse(reference.toString('utf8'));
  assert.equal(baseline.sourceCommit, '888e93ab514c25858e278ca69eef621a59908f2a');
  for (const file of baseline.files) {
    assert(!file.path.startsWith('/') && !file.path.includes('..') && !file.path.includes('\\'));
    const path = resolve(directory, file.path);
    assert(path.startsWith(resolve(directory) + sep));
    assert(existsSync(path), `Preserved v7 input missing: ${file.path}`);
    const data = readFileSync(path);
    assert.equal(data.length, file.bytes, `Preserved v7 input changed: ${file.path}`);
    assert.equal(digest(data), file.sha256, `Preserved v7 input changed: ${file.path}`);
  }
  assert.equal(baseline.files.find(f => f.path === 'deliverables/Spread-Make-the-Hours-Count-Hallie-Pivot-v7.mp4')?.sha256,
    'ABF16A41C6786A6187786D0B833FBD88A9329940918D9E6D22B9FB9BA83A94AB');
  return baseline.files.length;
}

export function updateInventory(directory = root) {
  // Check the independent frozen reference before writing any new hashes.
  const preserved = assertBaseline(directory);
  const paths = [];
  function collect(folder) {
    if (!existsSync(folder)) return;
    for (const entry of readdirSync(folder, {withFileTypes: true})) {
      assert(!entry.isSymbolicLink(), `Symlink is not a portable asset: ${entry.name}`);
      if (entry.name === '__pycache__' || entry.name === 'node_modules' || entry.name.endsWith('.log')) continue;
      assert(!entry.name.startsWith('.env'), 'Environment files do not belong in the asset inventory');
      const path = join(folder, entry.name);
      if (entry.isDirectory()) collect(path);
      else if (entry.isFile()) paths.push(path);
    }
  }
  for (const folder of ['public', 'source-audio', 'src', 'deliverables', 'evidence', 'scripts', 'docs']) collect(join(directory, folder));
  for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'remotion.config.ts', 'eslint.config.mjs', 'README.md', 'AGENTS.md', '.gitignore', '.gitattributes']) paths.push(join(directory, name));
  const files = paths.map(path => {
    const data = readFileSync(path);
    return {path: relative(directory, path).split(sep).join('/'), sha256: digest(data), bytes: data.length};
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const manifestPath = join(directory, 'ASSETS.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.files = files;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return {inventoriedFiles: files.length, preservedInputs: preserved};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(updateInventory(), null, 2));
}
