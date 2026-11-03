# Spread 2.0 native implementation and verification

PR: [114](https://github.com/WGLewis0721/spread-app/pull/114), **merged November 3 at 19:36:19 UTC**. Current main: `6aa23557907d6262aa16b5767e4dee41374f0ab9`; final PR head: `b5a3eaf19283dab1c3127e654390fb5ec36309dc`. Previous baseline: `c38e04da8e47cf1cbb2cb6334a264067c328a145`. Remaining fixes continue on `fix/spread-native-acceptance-followup`; no new implementation PR is open yet.

**Web: deployed and verified. Native release: NO-GO.** This ledger was refreshed at approximately 20:07 UTC on November 3. See [the full engineering handoff and continuation prompt](../../SPREAD_2_NATIVE_HANDOFF.md) for exact next actions. In-progress results below must be re-queried.

> **Update, November 3 (PR #117):** the newest, run-ID-level record is [pr-117-acceptance.md](pr-117-acceptance.md). It supersedes the "unproven" and "in progress" statements below where they differ: Stack-swipe fix confirmed, 390-pt clipping not yet fixed on `ae7ffbb` and now audited screen by screen, persistence misses traced to the harness's fixed launch timers, and a first-run `addRole` bug found and fixed.

## Actual application changes

`SpreadBridgeViewController` keeps the bundled Capacitor/WebKit planner alive, waits for its restored store endpoint, then embeds `SpreadLiveRoot`. This is live SwiftUI, not the fixture preview. Normal app startup now presents the live UI when the engine is ready. `-SpreadNativeV2Preview` remains an explicitly separate Debug fixture route. The WebView remains the only planner and storage owner; there is no SwiftData/UserDefaults planner, new database, migration, or full-projection writeback.

The native UI provides Week/Spread navigation, the original metallic Crown, responsibilities in Stack/Fan/Dial/Tabs/Day, responsibility creation/rename/deletion, half-hour budgets and allocation editing/removal, task creation/text editing/deletion/placement/movement/completion, Undo, selected unfinished-task review, Month-to-week selection, and profile creation/switching. Backup and restore opens the existing React recovery interface, with a Return to native Spread control. Existing rich task contents remain stored and untouched by task-text editing. A native notes/outline/table/photo editor reads one task on demand and saves the complete original content through the existing `setTaskContent` action. Photos use Apple’s system photo picker.

All 11 original Chalkboard image files remain byte-for-byte unchanged. Studio, wallpaper, background and theme editing are absent from native navigation. Native mode selection owns no planning state. Crown rendering follows finger translation; actual haptic feedback occurs after the store ACK. Calendar presentation uses UTC date-only arithmetic to avoid locale time-zone shifts.

## Live transport and failure semantics

`SpreadApp` installs `SpreadNativeHost` only in the bundled native runtime after boot/restoration. The host delegates to the existing dispatcher; WKWebView `callAsyncJavaScript` receives structured arguments, never interpolated command source. Swift checks correlation IDs, protocol support and active state. Native commands are serialized; TypeScript also serializes and rejects stale session/profile/week/revision and invalid targets. Retries reuse a correlation ID, so a lost ACK cannot repeat a mutation on the retry. Replay receipts are session-local and bounded at 2048 requests with fail-closed capacity handling.

Native state is an immutable render projection. Successful changes refresh from the authoritative store. Store save failures return errors and retain the existing in-memory unsaved state; Retry saving invokes the store's own `put` path. It never writes a flattened projection back. Profile/week guards reject stale mutations rather than silently applying to a new context. No new cloud, backup, schema or restore contracts were introduced.

## Persistence diagnosis and fix

Earlier baseline runs 41657493360 and 41657656198 passed snapshot sequences 1/2/3 and restore-marker checks. PR 114's original head failed in run 41667110233: simulator app enumeration timed out, the launch command remained open and no mirror appeared. A timed-out enumeration is not proof the app was absent, and that run alone does not prove record loss.

A reproducible application bug was found in `prepareNativeStorage`: if the initial Filesystem read exceeded the three-second launch budget, launch continued but the writer was never created. The fix separates the launch wait from the writer lifetime. A late read starts the writer using the recovered sequence; cancellation still forbids late restore over the already-open planner. A deterministic delayed-read regression proves sequence 41 becomes 42 while edits made after timeout survive and the old snapshot is not restored over them.

The installed-app workflow retains all existing first-launch, newer-snapshot relaunch, profile identity and restore-marker assertions. It additionally disables the actual writer in a Debug launch, removes only synthetic test mirror files, asserts no new mirror, re-enables the writer, and requires the same profile to produce a genuine snapshot again. It does not increase the storage wait or suppress a failed check. The merged workflow runs two fresh-install cycles. Predecessor runs `41688443116` and `41692890825` reached positive/relaunch/restore and negative-control checks; the latest merged-main run `41704823131` fails its install/launch step. Completed logs show both cycles pass launch/relaunch/restore (seq 1→2→3) and disabled-writer negative checks. Cycle 1 re-enable passes; cycle 2 fails `Re-enabling the writer did not recover the same profile`. That combined assertion does not identify whether a snapshot was missing or a profile differed; root cause remains unproven. Earlier passes do not satisfy final-candidate acceptance.

## Production deployment diagnosis

Vercel production deployment `dpl_6nGHtXhVkoVTQW7XgPqzZtmuWfLJ` built the bundle, then failed during unchanged `db:migrate` with Postgres `XX000`, tenant/user not found. The connected Supabase project named Spread (`ahdlgigwfrmeommgnlbi`) was `INACTIVE`. Resuming that exact project through the management API succeeded; it subsequently reported `ACTIVE_HEALTHY`, and a read-only SQL query succeeded at 2026-11-03 17:53 UTC.

The existing **main** deployment was rebuilt as `dpl_GAFPJzEC3iMAn2wtiGXh8vKPXdFB` to verify migration recovery. This is the unchanged baseline main commit, not this PR's native application. No credentials were rotated or printed; no migrations were removed. The rebuild is READY; build logs report `[migrate] up to date.` The public site returned HTTP 200 after recovery.

After the authorized merge, main `6aa2355` deployed as `dpl_9pxefbZSiyNnv6giDT2VswiLUU3H`, **READY**, with migrations up to date. [Production](https://thespreadapp.com/) was browser-smoke-verified at desktop 1440 and mobile 390: HTTP 200, visible content, zero uncaught JavaScript errors. [Actual production screenshots](screenshots/6aa2355-production/README.md). This deployment distributes web assets, not a SwiftUI binary.

## Verification ledger

| Check | Observed result |
| --- | --- |
| Local planner suite with CI Node 22 | 420 pass, zero failures/skips; includes 60 shared vectors, live-host round trip, 100 commands exactly once, save recovery and delayed mirror startup |
| TypeScript typecheck | Pass |
| ESLint | Zero errors; seven existing warnings |
| Production bundle build | Pass locally; no local DATABASE_URL, so local migration invocation skips and does not verify production |
| Script tests | 208 pass, four existing skips, zero failures; 212 total |
| Main CI / source preflight / Pages | [CI 41704823274](https://github.com/WGLewis0721/spread-app/actions/runs/41704823274), [preflight 41704823153](https://github.com/WGLewis0721/spread-app/actions/runs/41704823153), [Pages 41704823119](https://github.com/WGLewis0721/spread-app/actions/runs/41704823119): success on merged main `6aa2355` |
| Shared TypeScript/Swift vectors | 60 cases pass in both languages; latest final-head Swift verification is [41704799007](https://github.com/WGLewis0721/spread-app/actions/runs/41704799007) |
| Swift tests / SwiftUI simulator package compilation | Final PR head `b5a3eaf`: 18 Swift tests, zero failures; macOS iOS Simulator compilation passes in run 41704799007 |
| Native layout acceptance | [41704798803](https://github.com/WGLewis0721/spread-app/actions/runs/41704798803): **overall failure**. 820 and 1024 pass; 390 fails initial-Week `Text clipped` audit at `PlannerUITests.swift:123`, associated date label `Nov 2 – Nov 8` |
| Latest full installed app build and persistence | [Main 41704823131](https://github.com/WGLewis0721/spread-app/actions/runs/41704823131), job `126157221406`: simulator build passes; persistence cycle 2 fails final writer re-enable/same-profile check after both cycles pass launch/relaunch/restore and disabled-writer checks; exact cause unproven |
| XCUITest real planner journey / Release archive | Main run completed: **unsigned Release archive passes**. Actual Crown 100-drag/30-reversal test passes (275.900s total test duration). UI suite: one pass, three failures (Stack selection and two clipped-text audits), two phone-width skips. Real journey stops before creation; no ten-flow pass claimed |
| Actual current native screenshots | [Seven 820-point screens and original manifest](screenshots/b5a3eaf/README.md) from final-head passing iPad test: Week, five layouts, Month. Fan/Month visually inspected; Month date-column spacing remains a visual concern. Not ten completed-flow evidence |
| Hardware p95/FPS, VoiceOver traversal, 10-user usability comparison | Unverified: no physical hardware or study participants attached |

The native package's Crown unit test exercises 100 gestures and 30 reversals. This is reducer evidence, not 100 actual UI drags or a physical-device performance measurement. The 100-command regression is similarly not a card-gesture benchmark.

[Selected main run output](main-6aa2355-results.txt). Current main artifacts: `native-journeys` **13267437528**, `spread-ios-smoke` **13267782156**. Their screenshots/results remain available from the linked run. The archive build succeeds but the workflow does not yet upload the archive itself.

## Flow acceptance

| Flow | Code delivered | Acceptance evidence still required |
| --- | --- | --- |
| F1 first use | Native creation, hours, Week, task path | Installed-app journey/screenshot and timed usability |
| F2 budget | Native bank, day placement, allocation edits/removal | Installed UI and tap-count checks |
| F3 task | Native create/text edit/delete and notes/outline/table/photo editing; original content preserved | UI and rich-content restart evidence |
| F4 place/move | Eligible-day sheet; take off day; Undo | UI and negative eligibility evidence |
| F5 finish | Single checkbox button; ACK then feedback; Undo | UI and physical response measurement |
| F6 Crown | Existing horizontal metal, serialized real week navigation, accessible arrows/actions | 100-drag/30-reversal XCUITest now passes on main; hardware metrics remain unverified |
| F7 layouts | All five use same live snapshot and shared selected role | Actual screenshots/100 rapid gestures/layout matrix |
| F8 Month | Native date grid, Monday week mapping, return to Week | UI/year-boundary/selected-day acceptance |
| F9 review | Native selected-task review calls existing carry/Undo | UI and restart integrity checks |
| F10 preservation | Existing store/mirror/profiles; recovery stays on existing React workflows | Twice-passing candidate persistence, restore/device matrix |

## Release and rollback

The owner explicitly requested merging completed work and deploying main on November 3, 2026, with remaining fixes continuing in a follow-up PR. This is a web deployment authorization; native acceptance and device gates remain open. Passing compilation does not satisfy the specification's full G0–G5 gates. A GO requires actual installed-app journey/screenshots, twice-passing persistence/negative control, accessibility/layout/gesture acceptance and the required hardware/usability evidence or an explicit owner decision about those unmet gates.

Rollback: revert the single PR to restore default React/Capacitor presentation, or remove native hosting in `SpreadBridgeViewController` while keeping the existing engine. No user data is migrated or deleted. The delayed-startup mirror fix is independent and should be retained if reverting presentation. Web rollback uses the last verified production deployment. TestFlight requires a corrected binary; no automatic App Store downgrade is assumed.

## Partial-merge checkpoint authorized by owner

This checkpoint includes live native code, the tested data-protection fixes, and calendar target/identity corrections. Local premerge validation: 420 planner tests pass, TypeScript passes, ESLint has zero errors/seven existing warnings, and the production bundle builds. Script tests: 208 pass/four skips. Native end-to-end and layout runs have exposed defects and are not represented as green. The unsigned Release archive now builds on main; the follow-up must preserve the archive output and finish final-candidate acceptance/screenshots before a native release GO. No TestFlight upload is triggered by merging main; that workflow remains manual.

Additional data protection: delayed mirror reads preserve a recovered earlier plan as a verified existing safety copy before starting a writer. Failure to protect the earlier plan pauses mirror replacement, including on subsequent launches. Native recovery notices expose the decision to the user. Rich read retries are bound to profile, week and revision, and replay receipts retain hashes/metadata rather than historical snapshots or photo payloads.

## Remaining acceptance and immediate next action

Retrieve the completed main iOS logs/artifacts, diagnose the actual install/launch failure, and fix the 390-point clipped date text without weakening the audit. Then complete the real F1–F10 dataset with task/content/profile/history/relaunch and recovery assertions; retain the passing actual Crown test, fix the first Stack swipe failure, complete Stack/Fan gesture counts, accessibility, Reduce Motion and final-head Release archive evidence. Physical hardware p95/FPS, VoiceOver and the required usability comparison remain unverified. Passing iPad audits do not waive iPhone layout or visual review. Exact continuation instructions, source paths, commands and rollback are in [the handoff](../../SPREAD_2_NATIVE_HANDOFF.md).
