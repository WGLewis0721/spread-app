import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DRAFT, ORIENTATIONS, POSES, makeAd, renderMarkdown, runPoseMatrix, captureDualDisplayDiagnostics } from './native-duo-poses.mjs';

/** A fake agent-device that models just enough of the app to exercise the harness. */
function fakeDevice(options = {}) {
  const state = { pose: 'open', orientation: 'portrait', screen: 'wallet', month: false, expanded: false, draft: '' };
  const calls = [];
  const ok = (data) => ({ code: 0, stdout: JSON.stringify({ success: true, data }), stderr: '' });
  const exec = async (_bin, argv) => {
    calls.push(argv);
    const [command, first, second] = argv;
    switch (command) {
      case 'open': return options.openFails ? { code: 1, stdout: '', stderr: 'no simulator' } : ok({ session: 'spread-duo-poses' });
      case 'wait':
        return options.neverReady && first === 'id="native-spread"' ? { code: 1, stdout: '', stderr: 'timeout' } : { code: 0, stdout: '', stderr: '' };
      case 'fold': {
        if (argv.includes('--keyframes')) return options.sweepFails ? { code: 1, stdout: '', stderr: 'bad keyframes' } : ok({ pose: 'open' });
        state.pose = first;
        if (options.loseDraftOn === first) { state.draft = ''; state.expanded = false; }
        const reported = options.foldReports?.[first] ?? first;
        return ok({ action: 'fold', pose: reported, hingeAngleDegrees: first === 'closed' ? 0 : first === 'open' ? 180 : 130, screen: { widthPt: 466, heightPt: 678 } });
      }
      case 'orientation':
        if (options.refuseRotation) {
          return { code: 1, stderr: '', stdout: JSON.stringify({ success: false, error: { code: 'UNSUPPORTED_OPERATION', message: 'Spread duo pt cannot rotate in a scoped simulator set', hint: 'Rotate it in the default device set.' } }) };
        }
        state.orientation = first; return ok({ orientation: first });
      case 'click':
        if (first === 'id="native-spread"') state.screen = 'wallet';
        else if (first === 'id="native-week"') state.screen = 'week';
        else if (first === 'id="week-month-toggle"') state.month = !state.month;
        else if (first.startsWith('label="Expand')) state.expanded = true;
        return { code: 0, stdout: '', stderr: '' };
      case 'fill': state.draft = state.expanded ? second : state.draft; return { code: 0, stdout: '', stderr: '' };
      case 'snapshot': {
        const text = state.screen === 'wallet'
          ? [state.expanded ? 'Collapse Work' : 'Expand Work and show tasks', state.draft].join(' ')
          : options.treeHidesIdentifiers ? 'unlabelled content' : state.month ? 'month-day-2026-11-04' : 'week-crown';
        return ok({ nodes: [{ label: text }] });
      }
      case 'is': return options.crownHidden ? { code: 1, stdout: '', stderr: 'not visible' } : { code: 0, stdout: '', stderr: '' };
      case 'get': return ok({ attrs: { id: 'week-month-toggle', label: state.month ? 'Week' : 'Month', value: state.month && !options.toggleStuckOnWeek ? 'Month' : 'Week' } });
      case 'screenshot': await writeFile(first, Buffer.alloc(4096, 1)); return { code: 0, stdout: '', stderr: '' };
      default: return { code: 0, stdout: '', stderr: '' };
    }
  };
  return { exec, calls, state };
}

async function run(options) {
  const device = fakeDevice(options);
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'duo-poses-'));
  const ad = makeAd({ bin: 'agent-device', udid: 'UDID-1', exec: device.exec });
  const result = await runPoseMatrix({ ad, outDir, sleep: async () => {} });
  return { ...result, device, outDir };
}
const cell = (result, pose, orientation, check) => result.cells.find((c) => c.pose === pose && c.orientation === orientation && c.check === check);

test('a healthy Duo passes every gating cell and writes full evidence', async () => {
  const result = await run();
  assert.equal(result.ok, true, JSON.stringify(result.cells.filter((c) => c.status !== 'PASS')));
  assert.equal(POSES.length * ORIENTATIONS.length, 9, 'all three real hinge poses and all supported Duo rotations must be gated');
  assert.equal(result.summary.counts.FAIL, 0);
  assert.equal(result.summary.counts.BLOCKED, 0);
  for (const pose of POSES) for (const orientation of ORIENTATIONS) {
    for (const check of ['orientation-set', 'spread-button', 'wallet', 'wallet-edit', 'week', 'month', 'continuity-draft-and-selection', 'continuity-month-kept']) {
      assert.equal(cell(result, pose, orientation, check)?.status, 'PASS', `${pose}/${orientation}/${check}`);
    }
  }
  const files = await readdir(result.outDir);
  for (const required of ['pose-matrix.json', 'pose-matrix.md', 'hinge-half-open.json', 'orientation-closed-landscape-left.json',
    'duo-open-portrait-wallet.png', 'duo-half-open-landscape-left-month.png', 'duo-closed-portrait-week.png', 'duo-open-landscape-right-week.png', 'duo-half-open-landscape-right-wallet-edit.png']) {
    assert.ok(files.includes(required), `missing evidence ${required}`);
  }
  assert.ok((await stat(path.join(result.outDir, 'duo-closed-portrait-wallet.png'))).size >= 2048);
  assert.equal(JSON.parse(await readFile(path.join(result.outDir, 'pose-matrix.json'), 'utf8')).summary.ok, true);
});

test('the harness never scopes the simulator set, which makes agent-device refuse rotation', async () => {
  const result = await run();
  assert.ok(result.device.calls.length > 50);
  for (const argv of result.device.calls) {
    assert.ok(!argv.includes('--ios-simulator-device-set'), `scoped simulator set passed to: ${argv.join(' ')}`);
    assert.deepEqual(argv.slice(argv.indexOf('--platform'), argv.indexOf('--platform') + 6), ['--platform', 'ios', '--udid', 'UDID-1', '--session', 'spread-duo-poses']);
  }
});

test('Duo screenshots use the supported full-resolution scale option', async () => {
  const result = await run();
  const shots = result.device.calls.filter((argv) => argv[0] === 'screenshot');
  assert.ok(shots.length >= 20, 'each pose and view must be captured');
  assert.ok(shots.every((argv) => !argv.includes('--pixel-density')), 'invalid option can silently cause retries');
  assert.ok(shots.every((argv) => argv.includes('--scale') && argv[argv.indexOf('--scale') + 1] === '1'),
    'retain native resolution for visual acceptance');
});

test('blocked Duo startup retains separate outer and inner display diagnostics without passing', async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'duo-screens-'));
  const calls = [];
  const captures = await captureDualDisplayDiagnostics({
    udid: 'DUO-UDID', outDir,
    exec: async (bin, args) => {
      calls.push([bin, ...args]);
      await writeFile(args.at(-1), Buffer.alloc(4096, 1));
      return { code: 0, stdout: '', stderr: '' };
    },
  });
  assert.deepEqual(captures.map((x) => x.display), ['primary', 'primary-1']);
  assert.ok(calls.every((argv) => argv[0] === 'xcrun' && argv.includes('DUO-UDID')));
  assert.deepEqual(calls.map((argv) => argv.find((x) => x.startsWith('--display='))),
    ['--display=primary', '--display=primary-1']);
  const metadata = JSON.parse(await readFile(path.join(outDir, 'startup-dual-display-diagnostics.json'), 'utf8'));
  assert.equal(metadata.length, 2);
  assert.ok(metadata.every((x) => x.bytes >= 2048));
  const result = await run({ neverReady: true });
  assert.equal(cell(result, '-', '-', 'startup').status, 'BLOCKED', 'diagnostics cannot bypass readiness');
});

test('the workflow runs this harness and never passes a scoped simulator set', () => {
  const workflow = readFileSync(new URL('../.github/workflows/native-duo-poses.yml', import.meta.url), 'utf8');
  assert.match(workflow, /scripts\/native-duo-poses\.mjs/);
  assert.doesNotMatch(workflow, /--ios-simulator-device-set/);
  for (const filename of ['native-duo-poses.yml', 'native-duo-acceptance.yml']) {
    const nativeWorkflow = readFileSync(new URL('../.github/workflows/' + filename, import.meta.url), 'utf8');
    assert.ok(nativeWorkflow.includes('- "scripts/native-duo-poses*"'),
      filename + ' must rerun native acceptance for pose harness and regression test changes');
  }
});

test('Duo workflow separates simulator, app, runner health and accessibility preflight', () => {
  const workflow = readFileSync(new URL('../.github/workflows/native-duo-poses.yml', import.meta.url), 'utf8');
  const phases = [
    'Select and verify Xcode',
    'Boot actual Duo and compile the actual app',
    'Verify Duo simulator boot independently',
    'Build and install Spread',
    'Verify Spread installation independently',
    'Verify Spread launches independently of automation',
    'Install pinned simulator test tooling',
    'Prepare and health-check Apple automation runner',
    'Verify accessibility transport before querying any controls',
    'Verify real hinge poses, rotations and surfaces',
    'Preserve automation and simulator diagnostics',
  ];
  let last = -1;
  for (const phase of phases) {
    const at = workflow.indexOf('name: ' + phase);
    assert.ok(at > last, 'missing or out-of-order precondition: ' + phase);
    last = at;
  }
  assert.match(workflow, /agent-device@0\.21\.36/, 'runner version must be pinned');
  assert.match(workflow, /prepare ios-runner --help/, 'read installed CLI flags before invoking prepare');
  assert.match(workflow, /prepare ios-runner --platform ios --udid/, 'preparation must target the actual Duo');
  assert.match(workflow, /v\.kind/, 'preflight must validate readable accessibility nodes');
  assert.match(workflow, /"BLOCKED"/, 'unreadable snapshots are blocked, not app FAILs');
  for (const evidence of ['runner.log', 'events.ndjson', 'requests', 'simulator.log', 'final-primary.png', 'final-primary-1.png']) {
    assert.ok(workflow.includes(evidence), 'missing failure diagnostics ' + evidence);
  }
  assert.match(workflow, /if: always\(\)/, 'diagnostics must survive test failure');
});

test('a refused rotation (the failure seen in runs 41852591875 and 41860698620) fails loudly but does not stop the matrix', async () => {
  const result = await run({ refuseRotation: true });
  assert.equal(result.ok, false);
  const refused = cell(result, 'closed', 'portrait', 'orientation-set');
  assert.equal(refused.status, 'FAIL');
  assert.match(refused.detail, /scoped simulator set/);
  // Every pose was still attempted and its hinge evidence saved.
  for (const pose of POSES) assert.equal(cell(result, pose, '-', 'fold-verified').status, 'PASS');
  assert.ok((await readdir(result.outDir)).includes('duo-open-landscape-left-month.png'));
});

test('a Spread surface that never appears is BLOCKED, attempts no hinge change and is never a pass', async () => {
  const result = await run({ neverReady: true });
  assert.equal(result.ok, false);
  assert.equal(cell(result, '-', '-', 'startup').status, 'BLOCKED');
  assert.ok(!result.device.calls.some((argv) => argv[0] === 'fold'));
  assert.ok((await readdir(result.outDir)).includes('startup-failure.png'));
});

test('a pose the simulator did not actually reach is a FAIL and blocks that pose only', async () => {
  const result = await run({ foldReports: { 'half-open': 'open' } });
  assert.equal(cell(result, 'half-open', '-', 'fold-verified').status, 'FAIL');
  assert.equal(cell(result, 'half-open', 'portrait', 'wallet').status, 'BLOCKED');
  assert.equal(cell(result, 'closed', 'portrait', 'wallet').status, 'PASS');
  assert.equal(result.ok, false);
});

test('losing the unsaved draft or the expanded card on a fold is reported as a product failure', async () => {
  const result = await run({ loseDraftOn: 'closed' });
  const lost = cell(result, 'closed', 'portrait', 'continuity-draft-and-selection');
  assert.equal(lost.status, 'FAIL');
  assert.match(lost.detail, /LOST/);
  assert.equal(result.ok, false);
});

test('the pose matrix marks advisory checks and escapes table separators', () => {
  const markdown = renderMarkdown(
    { commit: 'abc', udid: 'U', counts: { PASS: 1, FAIL: 1, BLOCKED: 0 }, ok: false, gatingNotPassing: 1, gatingTotal: 1 },
    [{ pose: 'open', orientation: '-', check: 'hinge-sweep-responsive', status: 'FAIL', detail: 'a | b', gating: false }],
  );
  assert.match(markdown, /hinge-sweep-responsive \(advisory\)/);
  assert.match(markdown, /a \\\| b/);
  assert.ok(DRAFT.length > 0);
});

test('Week and Month are recognised from the Crown selector and the toggle value even when the tree omits identifiers', async () => {
  const result = await run({ treeHidesIdentifiers: true });
  assert.equal(result.ok, true, JSON.stringify(result.cells.filter((c) => c.status !== 'PASS')));
  assert.match(cell(result, 'open', 'portrait', 'month').detail, /toggle value reads Month/);
});

test('Month fails when neither the day cells nor the toggle value show it', async () => {
  const result = await run({ treeHidesIdentifiers: true, toggleStuckOnWeek: true });
  assert.equal(cell(result, 'open', 'portrait', 'month').status, 'FAIL');
  assert.equal(cell(result, 'open', 'portrait', 'week').status, 'PASS');
  assert.equal(result.ok, false);
});

test('Week fails when the Crown is neither visible nor in the tree', async () => {
  const result = await run({ treeHidesIdentifiers: true, crownHidden: true });
  assert.equal(cell(result, 'closed', 'landscape-left', 'week').status, 'FAIL');
  assert.equal(result.ok, false);
});
