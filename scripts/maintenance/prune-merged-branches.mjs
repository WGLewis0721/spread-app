#!/usr/bin/env node
// Conservatively prune old, already-merged PR branches; dry-run by default.
const repo = process.env.GITHUB_REPOSITORY || 'WGLewis0721/spread-app';
const token = process.env.GITHUB_TOKEN;
const executing = process.argv.includes('--execute');
const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
if (!token || !/^[^/]+\/[^/]+$/.test(repo)) throw new Error('GITHUB_TOKEN and owner/repo are required');
if (executing && process.env.BRANCH_CLEANUP_CONFIRM !== 'DELETE_MERGED_OVER_7_DAYS') throw new Error('Explicit confirmation phrase required');
const prefix = '/repos/' + repo;
const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
async function request(method, path) {
  const response = await fetch('https://api.github.com' + path, { method, headers });
  const body = await response.text();
  if (!response.ok) throw new Error(method + ' ' + path + ': HTTP ' + response.status + ' ' + body.slice(0, 180));
  return body ? JSON.parse(body) : null;
}
async function allPages(path) {
  const result = [];
  for (let page = 1; ; page++) {
    const items = await request('GET', path + (path.includes('?') ? '&' : '?') + 'per_page=100&page=' + page);
    if (!Array.isArray(items)) throw new Error('Unexpected GitHub pagination response');
    result.push(...items);
    if (items.length < 100) return result;
  }
}
const [metadata, branches, closed, open] = await Promise.all([
  request('GET', prefix),
  allPages(prefix + '/branches'),
  allPages(prefix + '/pulls?state=closed'),
  allPages(prefix + '/pulls?state=open'),
]);
const nameMap = new Map(branches.map(b => [b.name, b]));
const openNames = new Set(open.map(p => p.head.ref).filter(Boolean));
const reserved = /^(main$|golden\/|backup\/|release\/|parked\/)/;
const candidates = [];
for (const pr of closed) {
  const name = pr.head?.ref;
  const branch = nameMap.get(name);
  if (!pr.merged_at || Date.parse(pr.merged_at) > cutoff || !branch || branch.protected) continue;
  if (pr.base?.ref !== metadata.default_branch || pr.head?.repo?.full_name !== repo) continue;
  if (reserved.test(name) || name === metadata.default_branch || openNames.has(name)) continue;
  if (branch.commit.sha !== pr.head.sha) continue;
  if (!candidates.some(x => x.name === name)) candidates.push({ name, sha: branch.commit.sha, pr: pr.number, merged: pr.merged_at });
}
candidates.sort((a, b) => a.name.localeCompare(b.name));
console.log(JSON.stringify({ repo, mode: executing ? 'delete' : 'dry-run', cutoff: new Date(cutoff).toISOString(), checkedBranches: branches.length, candidates }, null, 2));
if (!executing) { console.log('DRY RUN: no refs changed'); process.exit(0); }
for (const candidate of candidates) {
  const escapedName = candidate.name.split('/').map(encodeURIComponent).join('/');
  const [currentBranch, currentPR] = await Promise.all([
    request('GET', prefix + '/branches/' + escapedName),
    request('GET', prefix + '/pulls/' + candidate.pr),
  ]);
  if (currentBranch.protected || currentBranch.commit.sha !== candidate.sha ||
      currentPR.state !== 'closed' || !currentPR.merged_at ||
      Date.parse(currentPR.merged_at) > cutoff || currentPR.head.sha !== candidate.sha ||
      currentPR.base.ref !== metadata.default_branch) {
    console.log('SKIP changed candidate: ' + candidate.name);
    continue;
  }
  await request('DELETE', prefix + '/git/refs/heads/' + escapedName);
  console.log('DELETED ' + candidate.name + ' PR #' + candidate.pr + ' ' + candidate.sha);
}
