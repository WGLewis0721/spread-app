# Spec: Spread 2.0 native acceptance — remaining work after PR #117

> Part of the [Spread design brain](../README.md). Follow [PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). This sheet narrows [the native completion spec](2026-11-03-spread-2-native-completion.md) to what is still open after [PR #117](https://github.com/WGLewis0721/spread-app/pull/117). Product decisions in that spec are unchanged and are not reopened here.

| Field | Value |
| --- | --- |
| Request | Finish native 2.0 acceptance (issue [#113](https://github.com/WGLewis0721/spread-app/issues/113)): prove F1–F10, gestures, accessibility and persistence on the final head with real simulator evidence, and record exactly which gates need hardware or people |
| Surface | Native iPhone first, iPad adaptive. React web unchanged |
| Size / owner | L, in work packages. Engineering: next agent. Release acceptance: product owner |
| Status | **Native release NO-GO.** PR #117 added the test suite, CI and fixes; the suite has had one real run (head `11fe25e`, 390 pt only). Final-head results are not yet recorded |
| Source of truth | `main` after PR #117 (verify with `git log`). Evidence: [pr-117-acceptance.md](../../evidence/issue-113/pr-117-acceptance.md). Handoff: [SPREAD_2_NATIVE_CONTINUATION_PROMPT.md](../../SPREAD_2_NATIVE_CONTINUATION_PROMPT.md) |
| Release permission | The owner authorised merging PR #117 in chat. Nothing authorises a TestFlight upload, a signed build or publishing a binary; each needs a fresh explicit instruction |

## 1. Problem

The native SwiftUI planner is merged and runs on top of the existing React planner, but nobody can yet say it works end to end: the installed-app test suite was written on a machine without Xcode and has run once. The first run immediately found a first-run bug (a new responsibility could not be created with the default illustration), so more are likely. The persistence smoke test failed on a slow simulator for reasons the harness caused. The hardware and usability gates have not been attempted. The owner needs a factual, evidence-backed answer to "can we ship this native build", and a list of what only a device or people can settle.

## 2. Evidence at the time of writing

- [CI] `ae7ffbb` (merged #115), measured: Stack-swipe test passed (100 Stack + 100 Fan swipes, run 41713277871); 390-pt audit failed (Crown pill title flagged); the 1024-pt layout job failed creating its simulator; the shell run's persistence step failed in cycle 1 because the simulator took 9 min 24 s to boot and the harness killed `simctl launch` after 15 s (app never started); the journey step hit its 20-minute limit; the unsigned Release archive succeeded.
- [CI] Head `11fe25e`, 390 pt only (run 41716001566): `testLayout390` passed in 61 s; `testAudit390` failed only on the seven Day-mode weekday chips; F01/F02 failed on a product bug (`addRole` with the default illustration `custom` was rejected by the dispatcher).
- [Repo] Since then (heads `697f1d3` and `e3a18a7`, not yet exercised by the native suite): the `addRole` fix, Day chips, the unselected Week/Spread segment hit region, the persistence harness rewrite, longer timeouts, Release-binary hook check, archive artifact. Web CI and App Store preflight passed on `e3a18a7`; local `typecheck`, `lint` (0 errors, the 7 existing warnings), `test:spread` (422/422, `--min 422`), `build` and the Linux Swift package tests (18) passed.
- [Gap] No Xcode here. The UI test file type-checks only against API stubs ([tools](../../evidence/issue-113/tools/README.md)). The Swift app code is verified by macOS CI compilation only.
- [Gap] No physical device or attachable computer for this agent (`list_computer_folders` returned none). No study participants.

## 3. Goals, non-goals, budget

**Goal:** a final-head evidence set the owner can accept or reject: F1–F10 outcome matrix with run IDs, accessibility audits at 390/820/1024 with zero ignored issues, two clean fresh-install persistence cycles, 100 rapid Stack and Fan swipes with correct selection, the unsigned Release archive preserved, and an explicit blocker list for everything hardware or human.

**Fixed (do not reopen):** the TypeScript planner and `store.ts` actions are the only data authority; no Studio or theme editor; eleven Chalkboard illustrations, five layouts and the horizontal metallic Crown stay; no second store; no cloud, sync, backup, restore, schema, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**` or `server/` changes; audits are never weakened or suppressed; test minimum counts are never lowered; Node 22 for npm test scripts.

**Non-goals:** new features; redesign; hardware numbers invented from simulator timing; claiming GO from compilation, a web deployment or a green subset.

**Budget:** one integrated follow-up PR (the owner prefers one PR). Small commits. Each macOS CI round trip costs 20–60 minutes when runners are busy, so batch fixes: read every failure from a run before pushing, and use the targeted dispatch workflow for single-test checks.

## 4. Rules that apply

From the rules card and the native spec: touch targets at least 44 pt; status never colour alone; every drag has a tap and a keyboard/accessibility path; Dynamic Type, VoiceOver, Reduce Motion and no horizontal scroll at 390/820/1024; one light haptic on completing a task, iPhone only; task changes only through `store.ts` actions; cloud behaviour stays behind `cloud.*`. If a request seems to need something forbidden, list it as an exception for the owner; never design around a rule silently.

## 5. Work packages

Order matters: WP1 gates everything. Each package lists what a person can observe when it is done.

### WP1. Read the final-head native results (blocks all others)

- Trigger or read: `ios.yml` (runs on push to `main` and on PRs), `native-layout-acceptance.yml` (PRs and dispatch), `native-journeys.yml` (PRs and dispatch), the targeted `native-ui-dispatch.yml`. After PR #117 merges, dispatch `native-journeys.yml` and `native-layout-acceptance.yml` on `main`.
- Download each artifact into its own new directory, run `docs/evidence/issue-113/tools/xcresult-summary.py`, read the failure hierarchy and screenshot attachments (every failing test attaches `hierarchy-at-failure` and `screen-at-failure`).
- **Done when:** every job has a recorded result with run ID and artifact ID, and a failure list exists with the root cause of each (test fault, product defect or infrastructure).

### WP2. Fix what WP1 finds

Likely test-side faults (assumptions never exercised on a real simulator): Stepper `Increment` buttons and labels; the day Picker menu items; DisclosureGroup tray button label `"<role> · N tasks"`; Toggle tapped at its trailing edge; the confirm-delete dialog identifier; `placed-*` Stepper rows; the React recovery view's `Settings` and `Back Up Spread` buttons and share-sheet detection; alert handling in the failed-save test; horizontally scrolling Tabs row (`role-tabs`). Likely product faults: any screen where a refused command gives no visible feedback (the F01 failure showed no alert after the rejected `addRole`; check why), and any further audit findings.

- **Done when:** F01–F10 pass in one `native-journeys` run (or each remaining failure is a documented product exception for the owner), with screenshots for each step.

### WP3. Accessibility acceptance

- `testAudit390/820/1024` (required audits: hit region, text clipped, sufficient description) pass with nothing ignored, top and scrolled, on Week, five layouts and Month.
- Extended audits (`testAuditExtended390/820`: contrast, Dynamic Type, traits) are reported separately; triage each finding as a real defect (fix) or a tool false positive (document the evidence, never filter it in code).
- `testTargets44Everywhere`, `testDynamicTypeLargestAccessibilitySize`, `testLongProfileAndResponsibilityNames`, `testIPadOrientations` (iPad widths; the phone build is portrait-only by Info.plist) pass.
- `testReduceMotionKeepsFunction`: the workflow sets the simulator default `com.apple.Accessibility ReduceMotionEnabled` and restarts the simulator; the test reads the Debug-only probe on `native-content` (`reduce-motion` vs `motion`) and **skips if the setting did not reach the app**. If it skips, record Reduce Motion as unverified and stop; do not force it.
- **Done when:** per-width results with run IDs, and the list of any skipped or unverified item with the reason.

### WP3b. Gestures

- `testStackHundredRapidSwipesKeepSelection` and `testFanHundredRapidSwipesKeepSelection`: 100 swipes each, selection asserted after every one, both ends and reversals exercised. `testSelectedRoleFallsBackAfterDeletion`, `testFanKeepsLargeContentInsideItsFrame`. Re-run `testCrownHundredDragsWithThirtyReversals` after any Crown change.
- Optional, owner decision: Stack/Fan currently commit selection when the swipe ends. Continuous finger tracking would feel more physical but is a design change; propose before building.
- **Done when:** the four tests pass with run IDs, or each failure is root-caused.

### WP4. Persistence: two clean fresh-install cycles

- The rewritten harness in `ios.yml` confirms launches from the OS (pid line or process list) and fails the negative control if its writer-disabled instance never launched. Both cycles must pass first launch, relaunch (newer snapshot, same profile), storage-loss restore (marker name returns), disabled-writer negative control, and writer re-enable.
- If the `launchctl list` format assumption in `app_running()` is wrong the harness still relies on the `simctl launch` pid line; confirm in the log which signal fired (`::notice::launch [...]: launched=True`).
- A slow simulator boot is an infrastructure event, not a failure of the product: re-run once, and record both runs.
- **Done when:** one run shows both cycles green on the final head.

### WP5. Evidence, docs, PR

- Final-head unsigned Release archive preserved (`spread-native-unsigned-release-<sha>` artifact, plus the Release-binary hook check passing). Screen-by-screen screenshots at 390/820/1024 from the layout and journey artifacts copied into `docs/evidence/issue-113/screenshots/<sha>-<width>/` with provenance.
- Update `docs/SPREAD_2_NATIVE_HANDOFF.md`, `docs/evidence/issue-113/README.md` and `pr-117-acceptance.md` (or a new dated file) to say only what was proven. Include exact SHAs, run IDs and artifact IDs.
- One implementation PR: base/head SHAs, F1–F10 outcome matrix, CI and artifact links, screenshots, measurements, regression/security findings, rollback steps, factual GO/NO-GO.

### WP6. Hardware and people (blocked until they exist)

| Gate | What is needed | Exact blocker now |
| --- | --- | --- |
| p95 touch feedback <= 100 ms, 60 FPS | A supported iPhone, a Debug or Release build installed on it, Instruments (Time Profiler, Animation Hitches) or OSSignpost capture, reported measured values | No device or computer can be attached to the agent session |
| VoiceOver traversal, reading order | A person with a device, or recorded sessions, checking every flow | Not run; `performAccessibilityAudit` is not VoiceOver |
| Ten-person usability study, >= 8/10 per frequent journey, >= 20% faster than approved 1.0 on 4 of 5 journeys | Ten uncoached participants, approved 1.0 build, timing protocol | No participants |
| Restore from a `.spread` file through the file picker | Either a seeded file in the simulator's Files provider and a test that drives the picker, or a human check | Picker is out of process; not driven |
| Offline | A device in airplane mode, or a hosted-runner network cut that does not kill the runner | Not controllable from the runner |
| Photo block | A photo in the simulator library and a test that drives the system picker, or a human check | Not driven |
| Signing and distribution | Owner's signing assets and explicit instruction | Out of scope without a fresh instruction |

Keep the verdict **NO-GO** unless the owner explicitly accepts the unmet gates in writing.

## 6. Quantified contract (carried over, with current status)

| Element | Target | Status |
| --- | --- | --- |
| Hit target | >= 44 x 44 pt for every control | Text buttons and the unselected Week/Spread segment fixed in code; enumerator test written; not yet run on the final head |
| Clipped text | 0 at 390/820/1024, default and largest Dynamic Type | One layout run per width exists on older heads; final head not yet run |
| Crown | 64 pt per detent, <= 3 commits per swipe, 100 drags + 30 reversals | Passed on `main@6aa2355` (275.9 s); re-run needed on the final head |
| Stack/Fan | First swipe always works; selection never drifts | Two-role 100+100 passed on `ae7ffbb`; role-count-agnostic 100+100 written, not run |
| Persistence | Two clean cycles, positive and negative controls | Not yet achieved on any head |
| Feedback latency / FPS | p95 <= 100 ms, 60 FPS | Unmeasured |

## 7. Technical approach and boundaries

- Test code lives in `ios/App/SpreadNativeUITests/PlannerUITests.swift` (one file, listed explicitly in `project.pbxproj`; adding a file means editing the project). Classes: `NativeUITestCase` (harness), `JourneyUITests` (numbered F01–F11 sharing the static `Dataset`), `PlannerUITests` (Crown, gestures, layouts, audits, accessibility).
- App identifiers the tests rely on are listed in the PR #117 description and visible in `LivePlanner.swift`, `SpreadLayoutsView.swift`, `ChalkboardViews.swift`, `TaskContentEditor.swift`. Do not rename them without updating the tests.
- Debug-only hooks exist and must stay `#if DEBUG`: `-SpreadViewportWidth`, `-SpreadDisableMirror`, `-SpreadFailSaveMarker <text>`, `-SpreadNativeV2Preview`, and the `reduce-motion` probe value on `native-content`. The `ios.yml` Release step greps the archived binary for the launch-hook strings and fails if any is present.
- The dispatcher accepts `custom` as "no category" for `addRole` (`native-v2-dispatch.ts`); keep its tests.

## 8. Risks

| Risk | Mitigation | Owner |
| --- | --- | --- |
| macOS runner queue and slow simulator boot dominate iteration time | Batch fixes; cancel superseded runs; dispatch single tests; split groups across jobs | Next agent |
| Test locators wrong in ways only a real run reveals | Failing tests attach hierarchy and screenshot; read all failures before pushing | Next agent |
| One failing step hides later evidence | Journeys are numbered tests that relaunch, audits are separate tests with `continueAfterFailure = true` | Next agent |
| Extended audits produce tool false positives | Report separately, document evidence, never filter in code | Next agent, owner decides |
| Merging while native acceptance is red | PR and docs state it; verdict stays NO-GO | Owner |
| `main` moves under the branch | Fetch and rebase before pushing; force-push only your own branch with lease | Next agent |

## 9. Verification gates (all on the final head)

**G-a data protection:** no cloud, sync, backup, restore, schema, `Cloud/**`, `SpreadCloudCore/**` or `server/` change in the diff (`git diff --stat`).
**G-b unit/model:** `npm run typecheck`, `npm run lint`, `npx --yes --package=node@22 -c 'npm run test:spread'`, `npx --yes --package=node@22 -c 'npm run test:scripts'`, `npm run build`, `swift test --package-path ios/SpreadNativeV2`.
**G-c installed app:** `ios.yml` with two clean persistence cycles, journey class, Release archive and hook check.
**G-d flows and accessibility:** `native-journeys` (journey, gestures, crown, accessibility, reduce-motion) and `native-layout-acceptance` (390/820/1024) green, or each failure documented.
**G-e hardware and people:** run or recorded as blocked (WP6).
**G-f release:** only with the owner's explicit instruction.

## 10. Delivery, rollback

One follow-up PR as in WP5, branched from current `main`. Rollback: revert the PR; no data migration or deletion is involved. Workflow-only rollback: revert the workflow files. Web rollback, if a deployment regresses, restores the last verified READY deployment and smoke-tests the public alias; do not disable migrations. A distributed native app needs a corrected signed binary; no App Store downgrade is assumed.

## 11. Definition of complete

The owner can read one PR and one evidence file and see, for every flow F1–F10 and every accessibility and gesture gate, a run ID and artifact showing pass, or a documented defect or exception; two clean persistence cycles; the unsigned Release archive for the exact head; and a plain list of what remains unmeasured and why. **Not complete:** green compilation, a subset of green jobs, a web deployment, a skipped test reported as passed, or an audit with issues filtered out.

## 12. Open questions (proposed default, decider)

1. Is continuous finger tracking for Stack/Fan wanted before release? Default: no, keep commit-on-end and measure on hardware first. Owner.
2. Is a Files-provider-based restore test worth building, or is a human restore check enough? Default: human check. Owner.
3. Accept the native build without the usability study? Default: no. Owner.
