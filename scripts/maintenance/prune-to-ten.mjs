#!/usr/bin/env node
// One-time owner-authorized branch consolidation; archive each tip before removal.
const REPO = 'WGLewis0721/spread-app';
const BASE_MAIN = 'c03132493996d711c56c2e44b63cc8c4d728f1f8';
const TEMP_BRANCH = 'chore/prune-to-ten-20261107';
const ARCHIVE = 'archive/2026-11-07/';
const KEEP = new Set([
  'main',
  'fix/release-143-native-followup',
  'feat/week-month-61-completion',
  'spread-studio',
  'backup/golden-2026-10-26-offsite',
  'golden/2026-10-26-pre-studio-main-d6fb09c',
  'golden/2026-09-28-app-store',
  'golden/2026-09-27-friends-test-final',
  'golden/2026-09-28-full-landing-modes',
  'golden/2026-09-26-production',
]);
const MODE = 'dry-run';
const token = process.env.GITHUB_TOKEN;
if (!token || process.env.GITHUB_REPOSITORY !== REPO ||
    process.env.GITHUB_REF !== 'refs/heads/' + TEMP_BRANCH)
  throw new Error('Unauthorized repository or branch');
const HEADERS = {
  Authorization: 'Bearer ' + token,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json'
};
const root = '/repos/' + REPO;
async function req(method, path, body) {
  const response = await fetch('https://api.github.com' + path, {
    method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined
  });
  const txt = await response.text();
  if (!response.ok) throw new Error(method + ' ' + path +
    ': HTTP ' + response.status + ' ' + txt.slice(0, 250));
  return txt ? JSON.parse(txt) : null;
}
async function all(path) {
  const found = [];
  for (let page=1; page<=10; page++) {
    const part = await req('GET', path +
      (path.includes('?') ? '&' : '?') + 'per_page=100&page=' + page);
    if (!Array.isArray(part)) throw new Error('Unexpected API pagination');
    found.push(...part);
    if (part.length < 100) return found;
  }
  throw new Error('Excessive pagination: abort');
}
const [main, prs, branches] = await Promise.all([
  req('GET', root + '/commits/main'),
  all(root + '/pulls?state=open'),
  all(root + '/branches'),
]);
if (main.sha !== BASE_MAIN)
  throw new Error('main moved; refusing to prune: ' + main.sha);
if (prs.length !== 2 || [144,145].some(n => !prs.some(p => p.number === n)))
  throw new Error('Open PR inventory changed; only #144 and #145 allowed');
const prMap = new Map(prs.map(p => [p.number, p.head.ref]));
if (prMap.get(144) !== 'feat/week-month-61-completion' ||
    prMap.get(145) !== 'fix/release-143-native-followup')
  throw new Error('PR head changed');
if (KEEP.size !== 10 ||
    ![...KEEP].every(n => branches.some(b => b.name === n)))
  throw new Error('Keep branches missing');
if (branches.length !== 129)
  throw new Error('Branch count drift: ' + branches.length + ', expected 129');
if (branches.some(b => b.protected && !KEEP.has(b.name)))
  throw new Error('Protected branches outside keep set');
const removed = branches.filter(b => !KEEP.has(b.name))
  .sort((a,b) => a.name.localeCompare(b.name));
if (removed.length !== 119 ||
    removed.filter(b => b.name === TEMP_BRANCH).length !== 1)
  throw new Error('Unexpected deletion candidate set');
const snapshot = new Map(removed.map(b => [b.name, b.commit.sha]));
console.log(JSON.stringify({
  mode: MODE, repo: REPO, main: main.sha,
  keep: [...KEEP], countBefore: branches.length,
  plannedArchiveTags: removed.length,
  plannedBranchDeletions: removed.length,
  toDelete: removed.map(b => b.name)
},null,2));
if (MODE === 'dry-run') {
  console.log('DRY RUN: no tags or branches changed');
  process.exit(0);
}
if (MODE !== 'execute') throw new Error('Bad mode');
const segments = name => name.split('/').map(encodeURIComponent).join('/');
for (const branch of removed) {
  const ref = 'refs/tags/' + ARCHIVE + branch.name;
  try {
    const created = await req('POST', root + '/git/refs', {
      ref, sha: branch.commit.sha
    });
    if (created.object?.sha !== branch.commit.sha)
      throw new Error('Archive tag SHA mismatch: ' + branch.name);
  } catch (err) {
    if (!String(err).includes('HTTP 422')) throw err;
    const existing = await req('GET',
      root + '/git/ref/tags/' + segments(ARCHIVE + branch.name));
    if (existing.object?.sha !== branch.commit.sha)
      throw new Error('Archive tag conflict: ' + branch.name);
  }
  console.log('ARCHIVED ' + branch.name + ' ' + branch.commit.sha);
}
// NO deletions before every branch is archived and source/PRs are rechecked.
const [after, openAgain, latestMain] = await Promise.all([
  all(root + '/branches'),
  all(root + '/pulls?state=open'),
  req('GET',root + '/commits/main')
]);
if (after.length !== 129 || latestMain.sha !== BASE_MAIN ||
    openAgain.length !== 2 ||
    ![144,145].every(n => openAgain.some(p => p.number === n)))
  throw new Error('Repository changed during archival; no deletion');
for (const [name, sha] of snapshot) {
  if (after.find(b => b.name === name)?.commit.sha !== sha)
    throw new Error('Branch moved during archival: ' + name);
}
const ordered = removed.filter(b => b.name !== TEMP_BRANCH)
  .concat(removed.filter(b => b.name === TEMP_BRANCH));
for (const branch of ordered) {
  await req('DELETE', root + '/git/refs/heads/' + segments(branch.name));
  console.log('DELETED ' + branch.name + ' ' + branch.commit.sha);
}
console.log('COMPLETE: exactly 10 branches and 2 open PRs');
