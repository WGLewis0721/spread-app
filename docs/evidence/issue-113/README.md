# Spread 2.0 native implementation and verification

PR: [114](https://github.com/WGLewis0721/spread-app/pull/114). Baseline: `c38e04da8e47cf1cbb2cb6334a264067c328a145`. Implementation continues on `feature/spread-2-native-completion-113`.

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

The installed-app workflow retains all existing first-launch, newer-snapshot relaunch, profile identity and restore-marker assertions. It additionally disables the actual writer in a Debug launch, removes only synthetic test mirror files, asserts no new mirror, re-enables the writer, and requires the same profile to produce a genuine snapshot again. It does not increase the storage wait or suppress a failed check. Candidate results remain required before this bug is considered simulator-verified.

## Production deployment diagnosis

Vercel production deployment `dpl_6nGHtXhVkoVTQW7XgPqzZtmuWfLJ` built the bundle, then failed during unchanged `db:migrate` with Postgres `XX000`, tenant/user not found. The connected Supabase project named Spread (`ahdlgigwfrmeommgnlbi`) was `INACTIVE`. Resuming that exact project through the management API succeeded; it subsequently reported `ACTIVE_HEALTHY`, and a read-only SQL query succeeded at 2026-11-03 17:53 UTC.

The existing **main** deployment was rebuilt as `dpl_GAFPJzEC3iMAn2wtiGXh8vKPXdFB` to verify migration recovery. This is the unchanged baseline main commit, not this PR's native application. No credentials were rotated or printed; no migrations were removed. The rebuild is READY; build logs report `[migrate] up to date.` The public site returned HTTP 200 after recovery.

## Verification ledger

| Check | Observed result |
| --- | --- |
| Local planner suite with CI Node 22 | 412 pass, zero failures/skips; includes 60 shared vectors, live-host round trip, 100 commands exactly once, save recovery and delayed mirror startup |
| TypeScript typecheck | Pass |
| ESLint | Zero errors; seven existing warnings |
| Production bundle build | Pass locally; no local DATABASE_URL, so local migration invocation skips and does not verify production |
| Shared TypeScript/Swift vectors | 60 cases; TS passes; Swift passes in native verification runs 41687412654 and 41687832913 |
| SwiftUI simulator package compilation | Passed on macOS in runs 41687104360, 41687412654, 41687832913 and 41688443095 |
| Latest full installed app build and persistence | Awaiting candidate run 41688443116 |
| XCUITest real planner journey | Added to actual Xcode project; candidate execution pending |
| Actual screenshots | XCUITest keeps attachments; workflow exports them from `NativeJourneys.xcresult` to `native-journeys` artifact. No screenshot pass is claimed before capture and inspection |
| Hardware p95/FPS, VoiceOver traversal, 10-user usability comparison | Unverified: no physical hardware or study participants attached |

The native package's Crown unit test exercises 100 gestures and 30 reversals. This is reducer evidence, not 100 actual UI drags or a physical-device performance measurement. The 100-command regression is similarly not a card-gesture benchmark.

## Flow acceptance

| Flow | Code delivered | Acceptance evidence still required |
| --- | --- | --- |
| F1 first use | Native creation, hours, Week, task path | Installed-app journey/screenshot and timed usability |
| F2 budget | Native bank, day placement, allocation edits/removal | Installed UI and tap-count checks |
| F3 task | Native create/text edit/delete and notes/outline/table/photo editing; original content preserved | UI and rich-content restart evidence |
| F4 place/move | Eligible-day sheet; take off day; Undo | UI and negative eligibility evidence |
| F5 finish | Single checkbox button; ACK then feedback; Undo | UI and physical response measurement |
| F6 Crown | Existing horizontal metal, serialized real week navigation, accessible arrows/actions | 100 actual gestures/30 reversals, on-device metrics |
| F7 layouts | All five use same live snapshot and shared selected role | Actual screenshots/100 rapid gestures/layout matrix |
| F8 Month | Native date grid, Monday week mapping, return to Week | UI/year-boundary/selected-day acceptance |
| F9 review | Native selected-task review calls existing carry/Undo | UI and restart integrity checks |
| F10 preservation | Existing store/mirror/profiles; recovery stays on existing React workflows | Twice-passing candidate persistence, restore/device matrix |

## Release and rollback

No merge or native release has occurred. Passing compilation does not satisfy the specification's full G0–G5 gates. A GO requires actual installed-app journey/screenshots, twice-passing persistence/negative control, accessibility/layout/gesture acceptance and the required hardware/usability evidence or an explicit owner decision about those unmet gates.

Rollback: revert the single PR to restore default React/Capacitor presentation, or remove native hosting in `SpreadBridgeViewController` while keeping the existing engine. No user data is migrated or deleted. The delayed-startup mirror fix is independent and should be retained if reverting presentation. Web rollback uses the last verified production deployment. TestFlight requires a corrected binary; no automatic App Store downgrade is assumed.
