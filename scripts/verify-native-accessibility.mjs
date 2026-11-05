#!/usr/bin/env node
// Accept native UI automation only after a structured application and UI tree is readable.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function classifyAccessibilitySnapshot(raw) {
  try {
    const payload = JSON.parse(raw);
    const nodes = Array.isArray(payload?.data?.nodes) ? payload.data.nodes : [];
    const readable = nodes.filter((node) => node && typeof node.kind === 'string');
    const hasApplication = readable.some((node) => node.kind === 'application');
    const hasUI = readable.some((node) => ['button', 'text', 'text-field', 'scroll-area'].includes(node.kind));
    if (payload.success === true && hasApplication && hasUI) {
      return { status: 'PASS', nodeCount: readable.length, reason: 'Readable application and UI tree' };
    }
    return { status: 'BLOCKED', nodeCount: readable.length, reason: 'No readable application and UI tree' };
  } catch (error) {
    return { status: 'BLOCKED', nodeCount: 0, reason: 'Invalid accessibility snapshot: ' + error.message };
  }
}

export async function verifySnapshotFile(input, reportPath) {
  let report;
  try {
    report = classifyAccessibilitySnapshot(await readFile(input, 'utf8'));
  } catch (error) {
    report = { status: 'BLOCKED', nodeCount: 0, reason: 'Cannot read accessibility snapshot: ' + error.message };
  }
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [input, reportPath] = process.argv.slice(2);
  if (!input || !reportPath) {
    console.error('Usage: node verify-native-accessibility.mjs <snapshot.json> <report.json>');
    process.exitCode = 2;
  } else {
    const report = await verifySnapshotFile(input, reportPath);
    console.log(report.status + ': ' + report.reason + ' (' + report.nodeCount + ' nodes)');
    if (report.status !== 'PASS') process.exitCode = 1;
  }
}
