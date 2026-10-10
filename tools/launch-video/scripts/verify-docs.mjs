import assert from 'node:assert/strict';
import console from 'node:console';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const documents = [join(root, 'README.md'), join(root, 'AGENTS.md')];
function collect(folder) {
  for (const entry of readdirSync(folder, {withFileTypes: true})) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.name.endsWith('.md')) documents.push(path);
  }
}
collect(join(root, 'docs'));
let links = 0;
for (const path of documents) {
  for (const match of readFileSync(path, 'utf8').matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    const destination = resolve(dirname(path), decodeURIComponent(target));
    assert(destination.startsWith(root + sep), `Documentation link leaves package: ${path}`);
    assert(existsSync(destination), `Broken documentation link ${target} in ${path}`);
    links++;
  }
}
const recipes = JSON.parse(readFileSync(join(root, 'docs/voice-recipes.json'), 'utf8'));
for (const recipe of recipes.recipes) {
  assert(existsSync(join(root, recipe.source)), `Missing voice source: ${recipe.source}`);
  assert(recipe.params.voice_id && recipe.params.voice_type === 'preset');
  assert(recipe.params.count === 1);
  assert(!recipe.params.folder_id && !recipe.params.medias, 'Historical recipe must not carry a private destination/reference');
}
console.log(JSON.stringify({passed: true, documents: documents.length, localLinks: links, voiceRecipes: recipes.recipes.length}, null, 2));
