# Spread 2.0 native: handoff after PR #117 (November 3, 2026)

> **New visual-design direction:** Use the root [SwiftUI working-build parity spec](archive/SPREAD_SWIFTUI_PARITY_SPEC.md) and [outside-in execution instructions](archive/SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md) for all future native UI/UX changes. The old working app's observable design and behavior supersede this document's earlier assumptions about a native redesign. Preserve this document as implementation history.

Read this first, then the [remaining-work spec](design/specs/2026-11-03-spread-2-native-acceptance-remaining.md) and the [PR #117 evidence record](evidence/issue-113/pr-117-acceptance.md). Older context: [SPREAD_2_NATIVE_HANDOFF.md](SPREAD_2_NATIVE_HANDOFF.md) (its own continuation prompt is superseded by this one), [native completion spec](design/specs/2026-11-03-spread-2-native-completion.md), `CLAUDE.md`, `AGENTS.project.md`.

**Native 2.0 release: NO-GO.** Master issue: [#113](https://github.com/WGLewis0721/spread-app/issues/113). Repository: `WGLewis0721/spread-app`.

## Status in one paragraph

[PR #117](https://github.com/WGLewis0721/spread-app/pull/117) (head `e3a18a7` plus a docs commit; base `a19e841`) was merged into `main` on the owner's explicit chat instruction (verify with `git log origin/main`). It adds a real installed-app UI test suite, parallel CI for it, and fixes for defects the audit and first run found. **The new suite has had only one real run (head `11fe25e`, 390 pt)**; its results on the final head were still queued behind the macOS runner backlog when work stopped. Nothing has been uploaded to TestFlight, signed or published, and nothing may be without a fresh explicit owner instruction.

## Work done

**Verified against real runs on `ae7ffbb` (PR #115's three unverified fixes)**
- Stack swipe after the first Work swipe: **works.** 100 Stack + 100 Fan swipes passed at 390 pt, 516.2 s (run 41713277871, artifact 13268803882).
- 390-pt `Text clipped`: **was not fixed.** The old test stopped at its first issue, so different runs showed different texts ("Nov 2 – Nov 8", then "Spread", then "Your week"). Runs 41704798803, 41711054935, 41712176226.
- Persistence cycle 2: **not data loss.** The latest shell run (41711518116) failed in cycle 1: the simulator took 9 min 24 s to boot, the harness killed `simctl launch` after a fixed 15 s, the app never started, and `listapps` timed out so the old diagnostic printed a false `installed: NO`. The earlier cycle-2 miss on `6aa2355` has the same shape but was not reproduced (hypothesis).

**Found by the first run of the new suite and fixed**
- Product bug: native "New responsibility" defaulted its illustration to `custom`, which the TypeScript `addRole` schema rejected, so first-run creation failed. `custom` now means "no category" (React's default). Tests added; `test:spread` is 422 passing, `--min 422`.
- Day-mode weekday chips used a fixed frame (the only remaining required-audit failures at 390 pt). Unselected Week/Spread segment was hit-testable only over its text (frame 44 x 20 in the real hierarchy). Both fixed.
- Earlier in the PR: header uses `ViewThatFits` (title never truncates), Crown pill text wraps instead of truncating, Month dates are capped at `xxxLarge` instead of shrinking, Month marks the open week (bold, fill, selected trait), Fan uses a Dynamic-Type-scaled minimum height with three tasks plus a "N more · Manage" row instead of a fixed clipped 290 pt frame, text buttons have their 44 pt hit region inside the label (`tapTarget()`).

**Tests and CI added** (all in `ios/App/SpreadNativeUITests/PlannerUITests.swift` and `.github/workflows/`)
- Audits are separate per-width tests (`testAudit390/820/1024`, plus `testAuditExtended390/820` for contrast, Dynamic Type and traits). They record every issue and ignore none; `continueAfterFailure = true` inside the audit helper.
- `JourneyUITests` F01–F11 on one dataset, relaunching between steps: onboarding, hours/bank/two days, tasks and notes/outline/table, eligible place/move/Undo, complete/Undo, Crown, five layouts, Month (dates, open-week marking, year boundary), carry/Undo with ids, relaunch identity of tasks/allocations/content, profile isolation, backup interface and return, failed save then Retry, audits of journey screens.
- `PlannerUITests`: Crown 100 drags + 30 reversals, 100 rapid Stack and 100 rapid Fan swipes (selection asserted after every swipe), selected-role fallback, large content in Fan, 44x44 enumerator, Dynamic Type AX-XXXL, long names, iPad orientations, Reduce Motion.
- `native-journeys.yml` (journey, gestures, crown, accessibility, reduce-motion groups on fresh simulators), `native-layout-acceptance.yml` (layout + audit + extended + orientations per width), `native-ui-dispatch.yml` (accepts `Class/method`), `ios.yml` (journey class only, 75-minute job and 40-minute step timeouts, deterministic launch harness, unsigned Release archive uploaded as `spread-native-unsigned-release-<sha>`, Release-binary check that Debug-only hooks are absent).
- Debug-only hooks, all `#if DEBUG`: `-SpreadViewportWidth`, `-SpreadDisableMirror`, `-SpreadFailSaveMarker <text>` (first matching `localStorage` write throws `QuotaExceededError`), `-SpreadNativeV2Preview`, and a `reduce-motion`/`motion` probe value on `native-content`.

**Local verification** (Node 22): `typecheck` clean; `lint` 0 errors and the 7 existing warnings; `test:spread` 422/422; `build` ok; Swift package tests 18/18 on Linux. The UI test file type-checks only against API stubs; real compilation happened on macOS CI at head `11fe25e` (and `slice verification` on `697f1d3` passed). Checks on `e3a18a7` when work stopped: web CI success, App Store preflight success.

**Docs and evidence:** `docs/evidence/issue-113/pr-117-acceptance.md`, the PR #117 update in `SPREAD_2_NATIVE_HANDOFF.md`, seven real 390-pt screenshots in `docs/evidence/issue-113/screenshots/11fe25e-390/`, and the two helper tools in `docs/evidence/issue-113/tools/`.

## Work remaining (priority order; details and acceptance in the spec)

1. **Read the final-head native results** (`ios.yml`, `native-journeys`, `native-layout-acceptance`). After the merge, dispatch the two workflows on `main`. Download each artifact, summarise with `tools/xcresult-summary.py`, read the attached hierarchy and screenshot of every failure.
2. **Fix what they show.** Most likely test-side: Stepper/Picker/Toggle/DisclosureGroup/confirm-dialog locators and the React recovery view in `testF10_3`. Possible product-side: refused commands giving no visible feedback (the rejected `addRole` showed no alert), further audit findings.
3. **Two clean fresh-install persistence cycles** with the new harness; confirm in the log which launch signal fired. Re-run once on a slow simulator boot and record both.
4. **Re-run the 1024-pt layout** (its job failed creating the simulator, infrastructure) and triage the extended audits (contrast, Dynamic Type, traits) as defect or tool false positive, never filtering in code.
5. **Reduce Motion:** the simulator-default approach is untried. If the test skips because the probe reads `motion`, record it unverified.
6. **Evidence and PR:** final-head Release archive artifact, screenshots at 390/820/1024, the F1–F10 matrix with run and artifact IDs, update the docs to say only what was proven, one PR.
7. **Blocked, keep unverified and say why:** hardware p95 <= 100 ms and 60 FPS, VoiceOver, ten-person usability study, file-picker restore, offline, photo block, continuous finger tracking (a design change; ask the owner). No device or computer could be attached to the previous agent (`list_computer_folders` returned none).

## Hard-won operating notes

- **No Xcode locally.** Verify on GitHub macOS runners. Install the Swift 6.0.3 Linux toolchain to `swiftc -parse` and to type-check the UI tests against the stubs (see `tools/README.md`); SwiftUI cannot be checked on Linux. Use Node 22 for the npm test scripts and run `npm ci` after a container restart.
- **Runner capacity is the bottleneck.** Every push re-triggers all macOS workflows because the PR diff always touches `ios/**`. Cancel superseded runs, batch fixes, and prefer `native-ui-dispatch.yml` (width and test names) for single checks. A workflow can only be dispatched by name if its file exists on the default branch; it runs the version at the ref you choose.
- **GitHub access:** `gh` works for runs, logs and artifacts; GraphQL is blocked, so use REST (`gh api repos/...`) and the GitHub MCP tools for PRs. Job logs and check-run annotations are only readable after the job completes; `gh run download -n <artifact>` works. A foreground `sleep` is blocked; wait with a `Monitor` or an `until` loop.
- **Reading results on Linux:** an `.xcresult` is a SQLite database (`TestCases`, `TestCaseRuns`, `TestIssues`, `Attachments`); exported attachments sit beside it with a `manifest.json`. Audit issues carry an "Element Screenshot" showing exactly what was flagged.
- **XCUITest facts learned the hard way:** `testRun.hasSucceeded` is not final inside `tearDown`, so use `totalFailureCount`. `continueAfterFailure = false` makes an audit report only one issue per run. Items off-screen in a horizontal `ScrollView` are absent from the hierarchy until scrolled (`role-tabs`). A `Color.clear` background is not hit-testable, which shrinks a Button's real target to its text; use `contentShape`. A frame placed outside a `Button` does not enlarge its hit region. Tapping an already-open `DisclosureGroup` collapses it.
- **Persistence harness:** never kill `simctl launch` on a timer; the OS pid line (or process presence) is the signal. A negative control that did not actually launch proves nothing.
- **Standing constraints from the brief:** do not weaken or suppress audits; do not lower test minimums; do not touch cloud, sync, backup, restore, schema files, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**` or `server/`; the TypeScript planner and `store.ts` remain the only authority; report unmeasured things as unverified; never claim GO from compilation or a web deployment.

## Copy/paste continuation prompt

```text
Continue Spread 2.0 native acceptance in WGLewis0721/spread-app, issue #113.

Read docs/SPREAD_2_NATIVE_CONTINUATION_PROMPT.md first, then
docs/design/specs/2026-11-03-spread-2-native-acceptance-remaining.md,
docs/evidence/issue-113/pr-117-acceptance.md, CLAUDE.md and AGENTS.project.md.
PR #117 is merged into main (verify with git fetch; git log origin/main). It added the real
installed-app test suite, parallel CI and several fixes, but the suite has had only one real run
(head 11fe25e, 390 pt), so most of it is unproven. Native release is NO-GO. Do not upload to
TestFlight, sign or publish a binary, and do not merge anything, without a fresh explicit owner
instruction in chat.

Start by branching from current main and reading the real results: dispatch native-journeys.yml
and native-layout-acceptance.yml on main (and read the ios.yml run triggered by the merge),
download each artifact into its own empty directory, summarise with
docs/evidence/issue-113/tools/xcresult-summary.py, and read every failing test's attached
hierarchy and screenshot. Do not guess. Then work the packages in the spec in order: fix the
failures (test-side or product-side; a rejected command must give visible feedback), get two clean
fresh-install persistence cycles with the new harness, re-run the 1024-pt layout and triage the
extended audits, preserve the final-head unsigned Release archive, collect 390/820/1024
screenshots, and update the docs to say only what was proven. Open ONE implementation PR with
base/head SHAs, the F1-F10 outcome matrix, CI and artifact links, measurements, regression and
security findings, rollback steps and a factual GO/NO-GO.

Constraints: the TypeScript planner and store.ts actions are the only authoritative data source;
no Studio/theme editor; keep rich contents, profiles, history, recovery safety, the eleven
Chalkboard illustrations, five layouts and the horizontal metallic Crown. Never weaken or
suppress accessibility audits; never lower test minimum counts. Do not touch cloud, sync, backup,
restore, schema files, ios/App/App/Cloud/**, ios/App/SpreadCloudCore/**, server/. No Xcode locally:
verify on GitHub macOS runners; batch fixes because runner time is the bottleneck. Use Node 22
for npm test scripts. Hardware p95/FPS, VoiceOver, the ten-person usability study, file-picker
restore, offline and the photo block stay unverified unless actually run; record the exact blocker.
End with what is still unverified.
```
