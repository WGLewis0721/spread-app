#!/usr/bin/env node
// Drives the real Spread app on an actual iPhone Duo simulator through every hinge pose and
// rotation, and writes a machine-readable pose matrix.
//
// Rules this harness keeps (see docs/design/platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md):
//   * A cell is PASS only when its command succeeded AND its assertion held.
//   * A cell is BLOCKED when a precondition could not be established. BLOCKED is not a pass.
//   * It never stops at the first failure: every pose and orientation is attempted so one run
//     yields all the evidence, and the exit code is non-zero unless every gating cell passed.
//   * It never scopes the simulator set. agent-device refuses every rotation of a foldable
//     simulator once `--ios-simulator-device-set` is passed (unsupported-device-scope), even when
//     the path is the default set. Runs 41852591875 and 41860698620 failed exactly there.
import { execFile } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const POSES = ['closed', 'half-open', 'open'];
export const ORIENTATIONS = ['portrait', 'landscape-left', 'landscape-right'];
export const DRAFT = 'Fold keeps this draft';
export const SESSION = 'spread-duo-poses';

const WALLET_TREE = /Expand .{1,60} and show tasks|Collapse /i;
const WEEK_TREE = /week-crown/;
const MONTH_TREE = /month-day-\d{4}-\d{2}-\d{2}/;
const MIN_SCREENSHOT_BYTES = 2048;

/** Run a process and always resolve, so a failed command is evidence rather than an exception. */
export function execute(bin, args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

/** Build the agent-device caller. The simulator device set is deliberately never passed. */
export function makeAd({ bin, udid, session = SESSION, exec = execute }) {
  return async function ad(args, { json = false, timeoutMs } = {}) {
    const argv = [...args, '--platform', 'ios', '--udid', udid, '--session', session, ...(json ? ['--json'] : [])];
    const result = await exec(bin, argv, { timeoutMs });
    let parsed;
    if (json) { try { parsed = JSON.parse(result.stdout); } catch { parsed = undefined; } }
    const ok = result.code === 0 && (!json || parsed?.success !== false);
    return { ...result, argv, parsed, ok };
  };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fileSize(file) {
  try { return (await stat(file)).size; } catch { return 0; }
}

/** Diagnostic only: foldable simulators have two displays. A plain simctl screenshot
 * can fail with 'Cannot choose between 2 displays', so always name the screen.
 * Capture both, because the inactive one may be black in a given pose. Neither
 * a successful screenshot nor its byte count proves the app is ready.
 */
export async function captureDualDisplayDiagnostics({ udid, outDir, exec = execute, size = fileSize }) {
  const captures = [];
  for (const display of ['primary', 'primary-1']) {
    const file = path.join(outDir, `startup-failure-${display}.png`);
    const result = await exec('xcrun', ['simctl', 'io', udid, 'screenshot', `--display=${display}`, file]);
    captures.push({ display, file: path.basename(file), code: result.code, bytes: await size(file),
      error: result.code === 0 ? null : (result.stderr || result.stdout || 'capture failed').slice(0, 300) });
  }
  await writeFile(path.join(outDir, 'startup-dual-display-diagnostics.json'), JSON.stringify(captures, null, 2));
  return captures;
}

function errorText(result) {
  const error = result.parsed?.error;
  if (error) return `${error.code}: ${error.message}${error.hint ? ` (${error.hint})` : ''}`;
  return (result.stderr || result.stdout || `exit ${result.code}`).trim().slice(0, 400);
}

export async function runPoseMatrix({ ad, outDir, bundle = 'com.graymatter.spread', sleep = delay, write = writeFile, size = fileSize, clock = () => new Date(), diagnosticScreens = null }) {
  await mkdir(outDir, { recursive: true });
  const cells = [];
  const record = (pose, orientation, check, status, detail, evidence = [], gating = true) => {
    const cell = { pose, orientation, check, status, detail, evidence, gating };
    cells.push(cell);
    return cell;
  };
  const save = async (name, text) => { await write(path.join(outDir, name), text); return name; };
  const snap = async (name) => {
    const r = await ad(['snapshot', '-i'], { json: true, timeoutMs: 120000 });
    await save(`tree-${name}.json`, r.stdout || r.stderr);
    return { text: r.stdout, ok: r.ok, file: `tree-${name}.json` };
  };
  const shot = async (name) => {
    const file = path.join(outDir, name);
    // --scale 1 keeps the simulator's native pixels. agent-device does not
    // accept the older --pixel-density option; the fallback remains diagnostic.
    let r = await ad(['screenshot', file, '--scale', '1']);
    let method = 'native';
    if (!r.ok) { r = await ad(['screenshot', file]); method = '1x'; }
    const bytes = await size(file);
    return { ok: r.ok && bytes >= MIN_SCREENSHOT_BYTES, detail: r.ok ? `${bytes} bytes (${method})` : errorText(r), file: name };
  };
  // Month is recognised by either of two independent signals: its day cells in the accessibility tree, or the
  // Week/Month toggle reading value "Month" (it reads "Week" on the Week plane).
  const onMonth = async (treeText) => {
    if (MONTH_TREE.test(treeText)) return { ok: true, detail: 'Month day cells in tree' };
    const attrs = await ad(['get', 'attrs', 'id="week-month-toggle"'], { timeoutMs: 60000 });
    if (attrs.ok && /"value"\s*:\s*"Month"/.test(attrs.stdout)) return { ok: true, detail: 'toggle value reads Month' };
    return { ok: false, detail: 'neither Month day cells nor a Month toggle value were found' };
  };
  const press = async (selector) => ad(['click', selector], { timeoutMs: 60000 });
  const visible = async (selector, timeoutMs = 60000) => ad(['wait', selector, String(timeoutMs)], { timeoutMs: timeoutMs + 30000 });

  // ---- Startup: a failure here makes every later cell BLOCKED, never a pass.
  const opened = await ad(['open', bundle], { json: true, timeoutMs: 180000 });
  await save('session.json', opened.stdout || opened.stderr);
  let ready = opened.ok;
  let startupDetail = opened.ok ? 'app opened' : errorText(opened);
  if (ready) {
    ready = false;
    for (let attempt = 1; attempt <= 2 && !ready; attempt += 1) {
      const waited = await visible('id="native-spread"', 180000);
      ready = waited.ok;
      startupDetail = ready ? `native-spread present (attempt ${attempt})` : `native-spread absent on attempt ${attempt}: ${errorText(waited)}`;
    }
  }
  record('-', '-', 'startup', ready ? 'PASS' : 'BLOCKED', startupDetail, ['session.json']);
  if (!ready) {
    const tree = await snap('startup-failure');
    const failShot = await shot('startup-failure.png');
    cells[cells.length - 1].evidence.push(tree.file, failShot.file);
    if (diagnosticScreens) {
      const extra = await diagnosticScreens();
      if (Array.isArray(extra)) cells[cells.length - 1].evidence.push(...extra.map((item) => item.file), 'startup-dual-display-diagnostics.json');
    }
    return finish();
  }

  // ---- Every pose x orientation.
  for (const pose of POSES) {
    const folded = await ad(['fold', pose], { json: true, timeoutMs: 180000 });
    await save(`hinge-${pose}.json`, folded.stdout || folded.stderr);
    const verified = folded.ok && folded.parsed?.data?.pose === pose;
    const hinge = folded.parsed?.data;
    record(pose, '-', 'fold-verified', verified ? 'PASS' : 'FAIL',
      verified ? `hinge ${hinge.hingeAngleDegrees}°, panel ${hinge.screen?.widthPt}x${hinge.screen?.heightPt}pt` : `requested ${pose}: ${folded.ok ? `reported ${hinge?.pose}` : errorText(folded)}`,
      [`hinge-${pose}.json`]);
    for (const orientation of ORIENTATIONS) {
      const tag = `${pose}-${orientation}`;
      if (!verified) {
        for (const check of ['orientation-set', 'spread-button', 'wallet', 'wallet-edit', 'week', 'month']) {
          record(pose, orientation, check, 'BLOCKED', `pose ${pose} was not established`);
        }
        continue;
      }
      await sleep(1200);
      const rotated = await ad(['orientation', orientation], { json: true, timeoutMs: 120000 });
      await save(`orientation-${tag}.json`, rotated.stdout || rotated.stderr);
      record(pose, orientation, 'orientation-set', rotated.ok ? 'PASS' : 'FAIL', rotated.ok ? 'rotated' : errorText(rotated), [`orientation-${tag}.json`]);
      await sleep(1500);

      const present = await visible('id="native-spread"', 60000);
      record(pose, orientation, 'spread-button', present.ok ? 'PASS' : 'FAIL', present.ok ? 'native-spread visible' : errorText(present));

      // Wallet (the single animated responsibility stack), then its Edit mode.
      await press('id="native-spread"');
      await sleep(1000);
      const wallet = await snap(`${tag}-wallet`);
      const walletShot = await shot(`duo-${tag}-wallet.png`);
      record(pose, orientation, 'wallet', WALLET_TREE.test(wallet.text) && walletShot.ok ? 'PASS' : 'FAIL',
        `${WALLET_TREE.test(wallet.text) ? 'Wallet cards in tree' : 'no Wallet card in accessibility tree'}; screenshot ${walletShot.detail}`, [wallet.file, walletShot.file]);
      const edit = await press('id="edit-spreads"');
      const editReady = edit.ok ? await visible('id="dock-done"', 30000) : edit;
      const editShot = await shot(`duo-${tag}-wallet-edit.png`);
      record(pose, orientation, 'wallet-edit', editReady.ok && editShot.ok ? 'PASS' : 'FAIL',
        editReady.ok ? `Edit mode open; screenshot ${editShot.detail}` : errorText(editReady), [editShot.file]);
      if (editReady.ok) await press('id="dock-done"');

      // Week, then Month, then back.
      await press('id="native-week"');
      await sleep(1000);
      const week = await snap(`${tag}-week`);
      const crown = await ad(['is', 'visible', 'id="week-crown"'], { timeoutMs: 60000 });
      const weekSeen = crown.ok || WEEK_TREE.test(week.text);
      const weekShot = await shot(`duo-${tag}-week.png`);
      record(pose, orientation, 'week', weekSeen && weekShot.ok ? 'PASS' : 'FAIL',
        `${weekSeen ? 'Crown visible' : 'week-crown neither visible nor in the accessibility tree'}; screenshot ${weekShot.detail}`, [week.file, weekShot.file]);
      await press('id="week-month-toggle"');
      await sleep(1000);
      const month = await snap(`${tag}-month`);
      const monthSeen = await onMonth(month.text);
      const monthShot = await shot(`duo-${tag}-month.png`);
      record(pose, orientation, 'month', monthSeen.ok && monthShot.ok ? 'PASS' : 'FAIL',
        `${monthSeen.detail}; screenshot ${monthShot.detail}`, [month.file, monthShot.file]);
      await press('id="week-month-toggle"');
      await sleep(600);
    }
  }

  // ---- Continuity: opening and closing the device must keep the view, the selection and unsaved work.
  const base = await ad(['fold', 'open'], { json: true, timeoutMs: 180000 });
  const baseRotated = await ad(['orientation', 'portrait'], { json: true, timeoutMs: 120000 });
  await press('id="native-spread"');
  await sleep(800);
  let tree = await snap('continuity-start');
  if (!/Collapse /i.test(tree.text)) {
    await press('label="Expand Work and show tasks"');
    await sleep(1000);
  }
  await ad(['fill', 'id="new-task-field"', DRAFT], { timeoutMs: 60000 });
  await sleep(600);
  tree = await snap('continuity-draft-entered');
  const entered = base.ok && baseRotated.ok && tree.text.includes(DRAFT) && /Collapse /i.test(tree.text);
  record('open', 'portrait', 'continuity-precondition', entered ? 'PASS' : 'BLOCKED',
    entered ? 'a Wallet card is expanded and holds an unsaved draft' : 'could not expand a card and enter an unsaved draft; continuity cannot be judged', [tree.file]);
  if (entered) {
    const steps = POSES.flatMap((pose) => ORIENTATIONS.map((orientation) => [pose, orientation]));
    for (const [pose, orientation] of steps) {
      const f = await ad(['fold', pose], { json: true, timeoutMs: 180000 });
      const o = await ad(['orientation', orientation], { json: true, timeoutMs: 120000 });
      await sleep(1500);
      const t = await snap(`continuity-${pose}-${orientation}`);
      const s = await shot(`duo-continuity-${pose}-${orientation}.png`);
      const kept = t.text.includes(DRAFT);
      const open = /Collapse /i.test(t.text);
      const established = f.ok && o.ok;
      record(pose, orientation, 'continuity-draft-and-selection',
        !established ? 'BLOCKED' : (kept && open ? 'PASS' : 'FAIL'),
        !established ? `pose change failed: ${errorText(f.ok ? o : f)}` : `draft ${kept ? 'kept' : 'LOST'}; expanded card ${open ? 'kept' : 'COLLAPSED'}`, [t.file, s.file]);
    }
  }
  // Month stays Month across a fold.
  await press('id="native-week"');
  await sleep(800);
  await press('id="week-month-toggle"');
  await sleep(1000);
  for (const pose of POSES) for (const orientation of ORIENTATIONS) {
    const f = await ad(['fold', pose], { json: true, timeoutMs: 180000 });
    const o = await ad(['orientation', orientation], { json: true, timeoutMs: 120000 });
    await sleep(1500);
    const t = await snap(`continuity-month-${pose}-${orientation}`);
    const established = f.ok && o.ok;
    const stillMonth = established ? await onMonth(t.text) : { ok: false };
    record(pose, orientation, 'continuity-month-kept', established ? (stillMonth.ok ? 'PASS' : 'FAIL') : 'BLOCKED',
      established ? (stillMonth.ok ? 'still on Month after fold and rotation' : 'left Month during fold or rotation') : errorText(f.ok ? o : f), [t.file]);
  }
  // Exploratory (not gating): a timed hinge sweep must leave the app responsive.
  const sweep = JSON.stringify([{ atMs: 0, angle: 180 }, { atMs: 1500, angle: 100 }, { atMs: 3000, angle: 0 }, { atMs: 4500, angle: 180 }]);
  const swept = await ad(['fold', 'open', '--keyframes', sweep], { json: true, timeoutMs: 180000 });
  await save('hinge-sweep.json', swept.stdout || swept.stderr);
  const alive = swept.ok ? await visible('id="native-week"', 60000) : swept;
  record('open', '-', 'hinge-sweep-responsive', swept.ok && alive.ok ? 'PASS' : 'FAIL',
    swept.ok ? (alive.ok ? 'timed hinge sweep completed and the app still responds' : errorText(alive)) : errorText(swept), ['hinge-sweep.json'], false);
  return finish();

  async function finish() {
    const gating = cells.filter((c) => c.gating);
    const failed = gating.filter((c) => c.status !== 'PASS');
    const summary = {
      generatedAt: clock().toISOString(),
      commit: process.env.GITHUB_SHA ?? null,
      udid: process.env.NATIVE_UDID ?? null,
      counts: Object.fromEntries(['PASS', 'FAIL', 'BLOCKED'].map((s) => [s, cells.filter((c) => c.status === s).length])),
      gatingTotal: gating.length,
      gatingNotPassing: failed.length,
      ok: failed.length === 0 && gating.length > 0,
    };
    await save('pose-matrix.json', JSON.stringify({ summary, cells }, null, 2));
    await save('pose-matrix.md', renderMarkdown(summary, cells));
    return { summary, cells, ok: summary.ok };
  }
}

export function renderMarkdown(summary, cells) {
  const lines = [
    '# Duo hinge and rotation matrix', '',
    `Commit \`${summary.commit ?? 'unknown'}\` on simulator \`${summary.udid ?? 'unknown'}\`. PASS ${summary.counts.PASS}, FAIL ${summary.counts.FAIL}, BLOCKED ${summary.counts.BLOCKED}. ` +
      `${summary.ok ? 'Every gating check passed.' : `${summary.gatingNotPassing} of ${summary.gatingTotal} gating checks did not pass.`}`, '',
    '| Pose | Orientation | Check | Status | Detail |', '| --- | --- | --- | --- | --- |',
  ];
  for (const c of cells) {
    lines.push(`| ${c.pose} | ${c.orientation} | ${c.check}${c.gating ? '' : ' (advisory)'} | ${c.status} | ${String(c.detail).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
  }
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const bin = arg('ad'); const udid = arg('udid') ?? process.env.NATIVE_UDID; const outDir = arg('out') ?? 'artifacts';
  if (!bin || !udid) { console.error('usage: native-duo-poses.mjs --ad <agent-device> --udid <udid> [--out dir]'); process.exit(2); }
  const result = await runPoseMatrix({
    ad: makeAd({ bin, udid }), outDir,
    diagnosticScreens: () => captureDualDisplayDiagnostics({ udid, outDir }),
  });
  console.log(`pose matrix: ${JSON.stringify(result.summary.counts)}; gating not passing: ${result.summary.gatingNotPassing}/${result.summary.gatingTotal}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, renderMarkdown(result.summary, result.cells));
  }
  process.exit(result.ok ? 0 : 1);
}
