import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'ASSETS.json'), 'utf8'));
assert.equal(manifest.version, 7);
assert.deepEqual(manifest.cuts.map(cut => cut.id), ['SpreadHalliePivot', 'SpreadGrady']);
const paths = new Set();
for (const file of manifest.files) {
  assert(!paths.has(file.path), `Duplicate inventory entry: ${file.path}`);
  paths.add(file.path);
  assert(!file.path.startsWith('/') && !file.path.includes('..'));
  const data = readFileSync(resolve(root, file.path));
  assert.equal(data.length, file.bytes, `Size mismatch: ${file.path}`);
  assert.equal(createHash('sha256').update(data).digest('hex').toUpperCase(), file.sha256, `Hash mismatch: ${file.path}`);
}

function wav(relative) {
  const data = readFileSync(resolve(root, relative));
  assert.equal(data.toString('ascii', 0, 4), 'RIFF');
  assert.equal(data.toString('ascii', 8, 12), 'WAVE');
  let format, body;
  for (let offset = 12; offset + 8 <= data.length;) {
    const label = data.toString('ascii', offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    const chunk = data.subarray(offset + 8, offset + 8 + size);
    if (label === 'fmt ') format = chunk;
    if (label === 'data') body = chunk;
    offset += 8 + size + (size % 2);
  }
  assert(format && body);
  assert.equal(format.readUInt16LE(0), 1, 'PCM required');
  const channels = format.readUInt16LE(2);
  const rate = format.readUInt32LE(4);
  const bits = format.readUInt16LE(14);
  assert.equal(bits, 16);
  const duration = body.length / (rate * channels * 2);
  let peak = 0, energy = 0;
  for (let i = 0; i < body.length; i += 2) {
    const value = body.readInt16LE(i) / 32768;
    peak = Math.max(peak, Math.abs(value));
    energy += value * value;
  }
  return { channels, rate, duration, peak, rms: Math.sqrt(energy / (body.length / 2)) };
}

const words = (text) => text.toLowerCase().match(/[a-z]+/g);
const script = 'You wear a lot of hats. And somehow, one thing takes the whole week. Leaving too little for family. For yourself. So you pause. Write down what matters. Give each responsibility an hour or two. Draw a box. Give it a purpose. Add the tasks. That little plan becomes Spread. Responsibilities, hours, your week, your tasks. Make the hours count.';
const results = [];
for (const cut of manifest.cuts) {
  assert(paths.has(cut.export), `Delivered film missing from inventory: ${cut.export}`);
  const audio = wav(cut.narration);
  assert.equal(audio.duration, 30);
  assert.equal(audio.rate, 24000);
  assert.equal(audio.channels, 1);
  assert(audio.peak < .95 && audio.rms > .02);
  const caps = JSON.parse(readFileSync(resolve(root, cut.captionsJson), 'utf8'));
  assert.deepEqual(words(caps.map(c => c.text).join(' ')), words(script), `${cut.voice} caption wording changed`);
  for (const c of caps) assert(0 <= c.startMs && c.startMs < c.endMs && c.endMs <= 30000);
  results.push({voice: cut.voice, ...audio});
}
const score = wav(manifest.music);
assert.equal(score.duration, 30);
for (const cut of results) assert(cut.peak * .60 + score.peak < .95, 'Mix headroom exceeded');
const registration = readFileSync(resolve(root, 'src/Composition.tsx'), 'utf8');
assert.deepEqual([...registration.matchAll(/id="([^"]+)"/g)].map(m => m[1]), ['SpreadHalliePivot', 'SpreadGrady']);
assert.equal((registration.match(/durationInFrames=\{900\}/g) || []).length, 2);
assert.equal((registration.match(/fps=\{30\}/g) || []).length, 2);
assert.equal(manifest.approvedFemaleExportSha256, 'ABF16A41C6786A6187786D0B833FBD88A9329940918D9E6D22B9FB9BA83A94AB');
const approved = readFileSync(resolve(root, 'deliverables/Spread-Make-the-Hours-Count-Hallie-Pivot-v7.mp4'));
assert.equal(createHash('sha256').update(approved).digest('hex').toUpperCase(), manifest.approvedFemaleExportSha256);
console.log(JSON.stringify({passed: true, inventoriedFiles: paths.size, compositions: 2, narration: results, scorePeak: score.peak}, null, 2));
