# Issue 113 engineering evidence and blockers

Status: **incomplete, NO-GO**. This change is a tested TypeScript command dispatcher foundation, not Spread 2.0 completion. Issue 113 must stay open. No native candidate was produced, merged, released, or deployed.

## Provenance

- Baseline: `c38e04da8e47cf1cbb2cb6334a264067c328a145` on main.
- PR 109 merged November 3, 2026; source head `c9783f0e19f41dbc7a91f0e7f679253ff7c3f9fb`.
- Execution host: Linux x86_64; no Swift, Xcode, Simulator, signing or physical devices available.
- Requirements: `docs/design/specs/2026-11-03-spread-2-native-completion.md` and `docs/SPREAD_2_NATIVE_ONE_PASS_ENGINEERING_PROMPT.md`.

## Persistence investigation

The older failure in the handoff is superseded by two successful **baseline** runs:

| Run | Commit | First launch | Relaunch | WebView loss restore |
| --- | --- | --- | --- | --- |
| [41657493360](https://github.com/WGLewis0721/spread-app/actions/runs/41657493360) | c9783f0 | seq 1 | seq 2, same profile | seq 3, renamed marker |
| [41657656198](https://github.com/WGLewis0721/spread-app/actions/runs/41657656198) | c38e04d | seq 1 | seq 2, same profile | seq 3, renamed marker |

Actual job logs were read. No storage fix is asserted in this change. No timeout was extended, no assertion removed, and no persistence or cloud behavior changed. These are baseline results, not native completion results. A disabled-writer installed-app negative control and twice-passing candidate smoke remain owed. Screenshot artifacts exist on these runs; download through the available CLI returned HTTP 403. No screenshots have been invented or relabeled as the native experience.

## Implemented behavior

`createNativeV2Dispatcher(sessionId)` is an explicitly constructed, disposable router. It imports the existing Zustand store and projects immutable view data. Nothing mounts it in the shipped app. It owns only session metadata, a serialized queue, and replay receipts, never writable planner records.

- Strict versioned intents with session, correlation, active profile, week and revision guards.
- Existing store actions for responsibility creation, hours, allocation, task add/text edit/complete/assignment, week navigation, selected rollover and Undo.
- Unknown fields/actions, non-half-hour values, invalid dates, missing tasks, wrong-role allocation targets and invalid carry picks refused before mutation.
- Revision invalidation observes store data identity/profile changes, including changes outside the dispatcher.
- Same request ID and intent return a receipt without repeating a mutation. Conflicting reuse fails. At 2048 requests a session fails closed; the eventual host must recreate the dispatcher and refresh state.
- Queue captures intent before execution; stale queued commands fail rather than silently applying to new state.
- Successful ACK only after synchronous store persistence (including flushing staged task text). Storage failure produces an explicit error; retry does not duplicate the failed in-memory edit. Further edits are refused while existing save facts report a failure.
- Errors include the current in-memory projection for recovery; this projection is **not a durability receipt**. The UI must show the save error and must not emit success haptics. Existing store behavior retains unsaved edits in memory. Host recovery must use existing React backup/storage recovery before recreating a session. No automatic rollback or new snapshot writer was added.
- Replay returns current profile state, not cached prior-profile content. Session disposal cancels queued work and unsubscribes.

## Automated checks

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Pass; dependency manifest/lock unchanged except test command |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npx --yes --package=node@22 -c 'npm run test:spread'` | 348 pass, 0 fail, 0 skipped |
| Dispatcher tests within planner suite | 20 pass; real Zustand actions with in-memory browser storage |
| `npx --yes --package=node@22 -c 'npm run test:scripts'` | 203 pass, 0 fail, 4 skipped; 207 total |
| `npm run build` | Bundle pass; migration script invoked, reports DATABASE_URL absent and skips; production database migration is unverified |
| Default Node 24 test wrappers | Failed count parsing: Node 24 default reporter uses a different format; rerun with CI Node 22 passed. No test-count guard weakened |
| Swift/native build, candidate simulator, device/accessibility tests | Blocked by absent toolchain/devices |

The 20 dispatcher tests are **not** 50 shared TypeScript/Swift parity vectors. The repeated-request test covers 20 concurrent retries and proves one mutation; it is **not** Crown or physical interaction evidence.

## Flow and gate matrix

| Flow | Native status |
| --- | --- |
| F1 onboarding | Not completed; dispatcher responsibility creation only |
| F2 budget | Not completed; guarded store hour/allocation intents only |
| F3 tasks | Not completed; add/text-edit intents preserve rich stored content; no native rich editor |
| F4 place/move | Not completed; eligibility rejection and assignment tested at TS store boundary |
| F5 complete/Undo | Not completed; store command/replay/Undo tested, no native feedback measurement |
| F6 Crown | Existing fixture preview retained; no new gesture/hardware verification |
| F7 five modes | Existing fixture preview/artwork unchanged; live selection parity unverified |
| F8 Month | Guarded Monday week intent only; native month UI absent |
| F9 rollover | Existing carry/Undo commands tested, including unique ID and notes preservation; native review absent |
| F10 restore | Existing baseline simulator evidence above; native profile/restore interface absent |

G0: normal entry and storage files untouched; dispatcher has no caller. G1: JS checks pass with CI runtime; Swift and shared vectors remain unverified. G2: baseline only. G3, G4, G5: not satisfied. No on-device p95, FPS, header-shift, tap counts, usability improvement, VoiceOver, Dynamic Type, screenshot matrix, 100 Crown actions/30 reversals, or 100 Fan/Stack gestures are claimed.

## Required continuation

1. Use a macOS/Xcode host with simulator and physical iPhone/iPad access. Re-run exact baseline and candidate smoke twice, including disabled-writer negative control.
2. Implement a gated WebKit read/command/ACK host using this router; do not expose a writable global on normal web or Release entry. Bind lifetime to WebView and keep the store running behind native presentation. Handle save recovery and session renewal explicitly.
3. Implement the real SwiftUI F1–F10 screens, preserving original art, layouts and native interaction contract. Native must await ACK before success feedback. Profile and restore actions must use existing workflows, not flattened projections.
4. Add 50+ shared cross-language vectors and actual before/action/after screenshots from the candidate. Run every accessibility, layout, interaction, device performance and comparative usability requirement in the canonical spec.
5. Diagnose the real production migration environment without skipping migrations; verify a Release candidate and obtain owner approval before merge or release.

## Rollback

React/Capacitor remains default. This router is not activated, performs no migration and writes no new storage keys. Revert this integration PR to remove router and test-list additions; leave all user data intact. If later activated, disable its opt-in entry before reverting. Production web rollback requires the last verified deployment; TestFlight requires a corrected build. No App Store downgrade is assumed. Owner approval is still required for merging or publishing.
