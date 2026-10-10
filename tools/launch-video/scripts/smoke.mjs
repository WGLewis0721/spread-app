import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');
for (const id of ['SpreadHalliePivot', 'SpreadGrady']) {
  const result = spawnSync(process.execPath, [cli, 'render', 'src/index.ts', id, `out/smoke/${id}`, '--frames=60,480,780,885', '--image-format=png', '--concurrency=1', '--overwrite'], {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
