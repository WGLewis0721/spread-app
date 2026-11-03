# Spread 2.0 engineering handoff — November 3, 2026

## Current state and authority

Repository: `WGLewis0721/spread-app`. Master issue: [#113](https://github.com/WGLewis0721/spread-app/issues/113). Requirements: [native completion specification](design/specs/2026-11-03-spread-2-native-completion.md) and [engineering execution prompt](SPREAD_2_NATIVE_ONE_PASS_ENGINEERING_PROMPT.md).

[PR #114](https://github.com/WGLewis0721/spread-app/pull/114) was **merged** with explicit owner authorization at `2026-11-03T19:36:19Z`. Main is `6aa23557907d6262aa16b5767e4dee41374f0ab9`. Its final branch head was `b5a3eaf19283dab1c3127e654390fb5ec36309dc`; its implementation is in the squash merge. The previous baseline was `c38e04da8e47cf1cbb2cb6334a264067c328a145`.

Remaining work continues on `fix/spread-native-acceptance-followup`, branched from that merged main. This handoff updates documentation and evidence; it does not claim additional app fixes. The owner requested: **merge and deploy completed work, then open another PR when the remaining fixes are done**. Do not reopen or recreate #114. Do not merge unrelated open Studio, Contact Deck or widget PRs. Open one follow-up implementation PR when its fixes and evidence are reviewable; do not assume permission to merge that future PR or upload a native binary.

**Web production: deployed and smoke-verified. Native 2.0 release: NO-GO.** There has been no TestFlight/App Store upload. Passing web CI or an iPad layout audit does not prove all ten native journeys.

## Work completed in merged code

- A live `SpreadLiveRoot` SwiftUI app uses the bundled React planner through WebKit. The TypeScript planner, Zustand actions and existing persistence remain authoritative. Swift holds a render projection and editor drafts, with no second writable planner database.
- Versioned command validation, serialized transport, request correlation, session/profile/week/revision guards, eligibility checks and replay protection are implemented. SHA-256 replay receipts retain bounded metadata rather than rich contents or historical snapshots; stale rich reads are rejected.
- Accepted commands refresh authoritative state. Save failures stay visible, and Retry saving invokes the original store write path. Native notes/outline/table/photo editing uses existing task-content actions and Apple PhotosPicker. Rich-content drafts pin the session and revision.
- Native code provides responsibility create/rename/delete, hour budgets and allocations, task create/edit/delete/place/move/complete, Undo, unfinished-task review, profiles, Week/Month, and all five responsibility layouts. These are implemented capabilities; full installed-app acceptance remains open.
- All eleven original Chalkboard illustrations are preserved byte for byte. Stack, Fan, Dial, Tabs and Day share the same live state. No Studio, wallpaper or theme editor was added. The horizontal metallic Crown follows finger translation and issues real week commands, with feedback after acceptance.
- Native hosting now uses a container with the Capacitor engine and SwiftUI host as siblings. The earlier arrangement placed native UI beneath WKWebView, so hiding the WebView's interactions/accessibility also hid native controls. Explicit destination button identifiers replaced an unreliable test interaction with the earlier Picker.
- The three-second native Filesystem startup timeout no longer permanently prevents mirror-writer creation. A delayed read can start the writer without restoring stale data over edits made after boot.
- Before replacing a recovered earlier plan, the existing verified safety-copy mechanism protects it. If protection fails, mirror replacement stays paused, including across subsequent launches. Recovery notices lead to the established React backup/restore interface and Return to native Spread control.
- Calendar cells now have unique identities, UTC date arithmetic, leap/year-boundary tests and date-button hit areas inside their labels. Fan cards have an opaque base so rear-card text does not show through the front card. Visual acceptance is still incomplete.
- The actual Xcode UI-test target, screenshot export, compatible simulator selector and 390/820/1024-point layout workflow are in the repository. Full-shell CI retains positive persistence assertions and a disabled-writer negative control; its latest result is not green.

## Production incident resolved

The prior Vercel failure was in `db:migrate`, after bundle compilation, with Postgres `XX000` / tenant-user not found. The connected **Spread** Supabase project `ahdlgigwfrmeommgnlbi` was `INACTIVE`. Resuming that exact project restored `ACTIVE_HEALTHY`; a read-only SQL query succeeded. An unchanged baseline deployment then completed migrations, establishing recovery without changing credentials or disabling migrations.

Merged-main production deployment is **READY**: `dpl_9pxefbZSiyNnv6giDT2VswiLUU3H`, [Vercel inspector](https://vercel.com/gray-matter5/spread-app/9pxefbZSiyNnv6giDT2VswiLUU3H), [public site](https://thespreadapp.com/). Logs reported `[migrate] up to date.` Desktop 1440-point and mobile 390-point browser smoke returned HTTP 200, visible content and zero uncaught JavaScript errors. These are web results, not SwiftUI distribution evidence. [Production screenshots](evidence/issue-113/screenshots/6aa2355-production/README.md).

## Verified results and active failures

Snapshot checked November 3 at approximately 20:07 UTC. Main run is now complete; re-query the still-running final-head branch run before doing further work.

| Check | Exact evidence / outcome |
| --- | --- |
| Local planner suite, Node 22 | 420 passed; zero failed or skipped; 44 files |
| Local script suite | 208 passed, four existing skips, zero failed; 212 total |
| Local typecheck / lint / build before merge | Typecheck passes; lint zero errors/seven existing warnings; bundle builds. Local migration skips without DATABASE_URL and is not production DB evidence |
| Main CI | [41704823274](https://github.com/WGLewis0721/spread-app/actions/runs/41704823274): success on `6aa2355` |
| Main App Store source preflight / Pages | [41704823153](https://github.com/WGLewis0721/spread-app/actions/runs/41704823153) / [41704823119](https://github.com/WGLewis0721/spread-app/actions/runs/41704823119): success; neither is signed-device acceptance |
| Final PR head native package | [41704799007](https://github.com/WGLewis0721/spread-app/actions/runs/41704799007): success on `b5a3eaf`; 18 Swift tests, zero failures, plus SwiftUI iOS Simulator package compilation |
| Cross-language cases | 60 shared deterministic vectors exercised by TypeScript and Swift, including projection/bank/eligibility/profile/date behavior; not proof of every live workflow |
| Native layout matrix | [41704798803](https://github.com/WGLewis0721/spread-app/actions/runs/41704798803): overall failure. 820 and 1024 jobs pass; 390 fails `Text clipped` at `PlannerUITests.swift:123`, audit of initial Week, associated text `Nov 2 – Nov 8` |
| Main full shell | [41704823131](https://github.com/WGLewis0721/spread-app/actions/runs/41704823131), job `126157221406`: simulator build and unsigned Release archive **pass**. Both persistence cycles reach sequence 1→2→3, restored marker and disabled-writer negative check; cycle 2 fails the final re-enable/same-profile assertion. UI: one passed, three failed, two skipped out of six; see details below. Underlying persistence cause remains unproven |
| Earlier installed persistence evidence | Runs `41688443116` and `41692890825` reached genuine positive/relaunch/restore and disabled-writer checks on predecessor commits. They do not establish the merged candidate's required two clean cycles |
| Actual Crown UI interactions | Main run: `testCrownHundredDragsWithThirtyReversals` **passes**, 275.900 seconds total test duration; 100 actual drags, including 30 reversal pairs, with week-value assertions. Total test duration is not interaction latency or FPS |
| Physical hardware / user study | Unverified: no authorized attached iPhone/iPad or study participants available. No hardware latency, FPS, VoiceOver or usability success claimed |

Main UI failures: Stack test cannot find `Manage Home` after the first Work swipe (`PlannerUITests.swift:101`); 390-point layout clips text (line 123); the real planning journey stops at its initial clipped-text accessibility audit (line 22), so later actions were not executed. The two larger-width tests skip on the phone and are separately exercised by the iPad matrix. Artifacts: [native-journeys](https://github.com/WGLewis0721/spread-app/actions/runs/41704823131/artifacts/13267437528), [spread-ios-smoke](https://github.com/WGLewis0721/spread-app/actions/runs/41704823131/artifacts/13267782156). [Selected completed-run log evidence](evidence/issue-113/main-6aa2355-results.txt).

Actual current native screenshots for Week, five layouts and Month are preserved with their original Xcode manifest in [the 820-point evidence set](evidence/issue-113/screenshots/b5a3eaf/README.md). They come from the real installed app, not generated mockups. The test asserts a native viewport of 820 points. The screenshots show the default plan, not a completed ten-journey dataset. Fan and Month were visually inspected. Month shows uneven horizontal date spacing and needs visual review even though the automated iPad audit passed. Earlier failure captures remain explicitly labeled as historical diagnostics.

## Remaining work in dependency order

1. **Get the exact merged candidate's full-shell evidence.** Read the completed run `41704823131` and re-query final-head run `41704798713`; download `spread-ios-smoke`, `native-journeys` and xcresult artifacts. Diagnose the cycle-2 failure `Re-enabling the writer did not recover the same profile` from logs and files, without assuming the earlier timeout bug explains it. The combined assertion does not distinguish a missing snapshot from a changed profile; add useful diagnostics before inferring data loss. Both cycles passed positive launch/relaunch/restore and disabled-writer checks, but the final recovery failure keeps the overall gate red. Retain two fresh-install persistence cycles, same-profile sequence growth, real storage-loss restoration and disabled-writer negative controls. Preserve both old recovered data and new live edits.
2. **Fix the confirmed iPhone clipping defect.** Reproduce the 390-point initial-Week audit, inspect its failing element and screenshot, and fix the Crown/date/header sizing. Run the same audit without exclusions. Check Dynamic Type, long profile/responsibility names, orientations and Reduce Motion. Audit remaining text-button hit areas; a frame outside a Button label can leave a small actual target.
3. **Finish actual screen-by-screen flow acceptance.** Run F1–F10 against one real dataset: onboarding, responsibilities, budgets, weekly plan, task/content editing, eligible placement/movement, completion/Undo, Crown/layouts/Month, unfinished-work carry, profiles and preservation. The existing journey audits accessibility before creating its first responsibility; an audit failure can prevent later screenshots. Put accessibility in a separate failing test if needed so independent functional evidence can still run; never suppress the audit.
4. **Strengthen existing UI assertions.** `tap("Week")` currently selects the primary destination and does not prove the inner Month toggle returns to the day list. Give that toggle its own stable identifier. Assert Month dates and selection. After relaunch, assert the same task/allocation/content identifiers and values, not merely that More exists. Add actual profile isolation/switch-back and unfinished-task carry/Undo checks. Verify historical weeks and backup/restore using the existing recovery interface, including offline, interrupted save and failed-save/retry scenarios.
5. **Finish gesture and visual polish from measured behavior.** Inspect current Stack/Fan first interaction, selection and reversal behavior. Code currently commits the swipe on end; continuous tracking may need refinement. Test selected-role fallback and large content within Fan's fixed frame. Review Month column spacing in the latest screenshot. Retain the now-passing actual 100-drag Crown/30-reversal test and rerun after relevant changes. Fix the confirmed Stack failure after its first Work swipe, then complete 100 rapid interactions per Stack/Fan mode with correct selection. Do not infer Fan passed when Stack failed first. Reducer and command-count tests do not replace these runs.
6. **Complete native build/release evidence.** The unsigned Release archive step now passes on main; preserve its output as an artifact if absent and rerun on the final implementation head. Run full WebKit bridge, task/hour-bank and restoration regressions on the exact final head. Collect actual action/result screenshots for all flows at 390/820/1024. Verify VoiceOver traversal, Dynamic Type, Reduce Motion and all 44×44-point targets. Package compilation alone is insufficient.
7. **Keep hardware and usability gates explicit.** Measure p95 interaction feedback ≤100 ms and target 60 FPS on supported hardware, one-tap completion and ≤3-tap placement/movement where specified. The canonical spec also calls for ten-person usability testing and the comparison with approved 1.0. If hardware/participants/signing are unavailable, record the exact blocker and keep NO-GO unless the owner explicitly accepts the unmet gates. Never substitute simulator timing for hardware numbers.
8. **Open one follow-up PR when ready.** Include exact base/head SHAs, the F1–F10 outcome matrix, CI/log/artifact links, screenshots, measured results, regression/security findings, rollback and factual GO/NO-GO. Do not upload to TestFlight, release or merge that PR based only on the earlier checkpoint authorization.

## Source map and commands

| Concern | Existing source |
| --- | --- |
| Command validation / replay / store actions | `src/lib/spread/native-v2-dispatch.ts` |
| Native host readiness / exchange | `src/lib/spread/native-v2-host.ts`, `src/spread/screens/spread-app.tsx` |
| Read-only view state | `src/lib/spread/native-v2-projection.ts` |
| Authoritative planner / save retry | `src/lib/spread/store.ts` |
| Delayed mirror startup / recovery protection | `src/lib/spread/native-mirror.ts` |
| Swift command queue / screens / editors | `ios/SpreadNativeV2/Sources/SpreadNativeV2/LivePlanner.swift`, `TaskContentEditor.swift` |
| Layouts / cards / Crown / calendar | Same directory: `SpreadLayoutsView.swift`, `ChalkboardViews.swift`, `WeekCrownView.swift`, `CrownTravel.swift`, `PlannerDates.swift` |
| App container / WebKit transport | `ios/App/App/SpreadBridgeViewController.swift`, `SceneDelegate.swift` |
| Actual installed-app tests | `ios/App/SpreadNativeUITests/PlannerUITests.swift` |
| Shared parity vectors | `ios/SpreadNativeV2/Tests/SpreadNativeV2Tests/Fixtures/parity-v1.json` |
| CI | `.github/workflows/ios.yml`, `native-layout-acceptance.yml`, `spread-v2-native-verify.yml`; `scripts/native-simulator.mjs` |

Use Node 22 as CI does; Node 24's changed default test reporter can confuse the existing test-count parser. Do not lower the minimum counts to compensate.

```sh
git fetch origin
git switch fix/spread-native-acceptance-followup
git status --short --branch
gh run view 41704823131 --repo WGLewis0721/spread-app
gh run view 41704798803 --repo WGLewis0721/spread-app --log-failed
npm run typecheck
npm run lint
npx --yes --package=node@22 -c 'npm run test:spread'
npx --yes --package=node@22 -c 'npm run test:scripts'
npm run build
# macOS/Xcode only:
swift test --package-path ios/SpreadNativeV2
npm run ios:sync
xcodebuild test -project ios/App/App.xcodeproj -scheme SpreadNativeUITests \
  -destination 'platform=iOS Simulator,id=SIMULATOR_UDID' CODE_SIGNING_ALLOWED=NO
```

This Linux workspace lacks Xcode/Swift and attached Apple hardware. GitHub macOS runners are available and have built and exercised the actual app. The package and layout workflows support manual dispatch; `ios.yml` currently triggers on matching PR/main paths, not manual dispatch. Add a deliberate dispatch path if needed to verify fixes before opening the next PR. Do not treat Linux as a reason to abandon native verification.

Use `git push -u origin fix/spread-native-acceptance-followup` when publishing this branch; its initial upstream was `origin/main`. GitHub CLI may fail on deprecated Projects fields; explicit JSON or REST endpoints work. Artifact redirects may fail in the CLI; the connected GitHub artifact tool successfully retrieved current xcresults. In-progress logs may be unavailable until the job finishes. Do not expose signed artifact URLs or credentials in evidence.

## Rollback and release assessment

For a web regression, restore the last verified READY baseline deployment `dpl_GAFPJzEC3iMAn2wtiGXh8vKPXdFB` after confirming it remains available, then smoke-test the public alias. Do not disable migrations. For native presentation regression, remove the sibling native host and restore original React/Capacitor entry in a reviewed commit. Preserve the independent late-reader/mirror-protection fixes; a blind revert of #114 would remove them. No planner schema rollback or user-record deletion is required. A distributed native app needs a corrected signed binary; do not assume App Store downgrade capability.

**Assessment: web checkpoint deployed; native 2.0 NO-GO.** Confirmed iPhone clipping, failing latest persistence step, incomplete installed-flow/gesture evidence, incomplete preservation of Release archive output, and hardware/usability gates remain. The unsigned Release archive and actual 100-drag Crown test now pass. No decision is needed to continue implementation and diagnosis. Native distribution requires a verified candidate and explicit owner acceptance.

## Follow-up status (PR #115, November 3, 2026)

Merged on owner instruction while the macOS simulator jobs were still running; **none of the three fixes below has simulator confirmation yet**. Re-query the runs on the merge commit before building on them. Native release remains **NO-GO**.

| Item | What changed | Evidence / caveat |
| --- | --- | --- |
| 390-pt clipped date | `WeekCrownView.swift`: pill sizes from its text (no fixed 72-pt frames), chevrons `minHeight: 72`, pill text hidden from accessibility because the wheel element exposes the same value. Audit unchanged | Real audit issue from run 41704798803: "Text of this SwiftUI.AccessibilityNode may be clipped at larger Dynamic Type sizes" on `Nov 2 – Nov 8`, frame 74.3x13.3 |
| Stack swipe after first Work swipe | `ChalkboardViews.swift`: card header is a tap element with button trait and default action, not a `Button` | Failure hierarchy (run 41704823131, `testCardGesturesStayOnSelectedRole`) shows selection stayed on Work. Button-swallows-drag is a **hypothesis**; if the test still fails, suspect UIScrollView touch handling next |
| Persistence cycle 2 | `ios.yml`: re-enable check reports missing snapshot vs changed profile separately, retries one launch, saves screenshot/logs/file listing | Cycle 2 waited about 2m37s, which fits "no snapshot written". Root cause **unproven** |
| Dispatch | `ios.yml` gained `workflow_dispatch`; `native-ui-dispatch.yml` (width + test names) added | Dispatchable only once on `main`; use it now for fast single-test runs |

Month spacing was reviewed on the 820-pt screenshot: columns align with headers; no change made. Fan was not exercised because Stack failed first.

## Remaining work in dependency order

1. Read results of the post-merge runs (ios shell, layout 390/820/1024). Fix whatever still fails; do not weaken audits. Use `native-ui-dispatch.yml` for `testCardGesturesStayOnSelectedRole` and `testLayout390`.
2. Persistence: two clean fresh-install cycles on the final head. If the re-enable step still fails, the new failure text says whether it was a missing snapshot (launch/writer start) or a profile change.
3. F1-F10 against one real dataset. Split accessibility audits out of `testRealPlannerJourney` so functional evidence still runs. Add stable identifier for the Month/Week toggle; assert Month dates/selection; assert task, allocation and content identifiers after relaunch; profile isolation and switch-back; unfinished-work carry and Undo; backup/restore, offline and failed-save/retry through the existing recovery interface.
4. 100 rapid Stack and 100 rapid Fan gestures with correct selection; selected-role fallback; large content inside Fan's fixed frame. Rerun the passing 100-drag/30-reversal Crown test after any Crown change.
5. Dynamic Type, long names, orientations, Reduce Motion, 44x44 targets (text buttons whose frame is outside the label).
6. Final-head unsigned Release archive preserved as an artifact; screen-by-screen screenshots at 390/820/1024.
7. Hardware p95 <=100 ms, 60 FPS, VoiceOver and the ten-person usability study stay unverified unless run; record the blocker.
8. Open one further implementation PR with SHAs, F1-F10 matrix, artifacts, measurements and factual GO/NO-GO. No TestFlight/release without explicit owner acceptance.

## Copy/paste continuation prompt

```text
Continue Spread 2.0 engineering in WGLewis0721/spread-app, issue #113.
Read docs/SPREAD_2_NATIVE_HANDOFF.md (including "Follow-up status (PR #115)"),
CLAUDE.md, AGENTS.project.md, the native completion spec and engineering prompt.

PR #114 and PR #115 are merged to main. #115's three fixes (390-pt Crown clipping,
Stack swipe, persistence diagnostics) were merged BEFORE simulator results arrived and are
unverified. Start by reading the runs on the current main/merge commit: iOS shell, Native
layout acceptance 390/820/1024. Download native-journeys and xcresult artifacts and read
the real failure hierarchy/attachments; do not guess. Work on a new branch from main.
Preserve the merged architecture: the TypeScript planner is the only authoritative data
source; no Studio/theme editor; keep rich contents, profiles, history, recovery safety,
eleven artworks, five layouts and the horizontal metallic Crown. Never weaken accessibility
audits or lower test minimums.

Then: confirm or redo the Crown/Stack/persistence fixes; finish F1-F10 on one real dataset
(split audits from functional steps); strengthen relaunch, Month, profile, carry/Undo,
backup/restore, offline and save-failure assertions; run 100 rapid Stack and Fan gestures;
Dynamic Type/Reduce Motion/44pt checks; preserve the final-head unsigned Release archive and
screen-by-screen evidence. No Xcode locally: use macOS runners; .github/workflows/
native-ui-dispatch.yml runs chosen PlannerUITests methods at 390/820/1024.
Hardware p95/FPS, VoiceOver and usability study stay unverified unless actually run.
Native release is NO-GO. Open one implementation PR when reviewable; do not merge it or
upload a binary without explicit owner instruction.
```
