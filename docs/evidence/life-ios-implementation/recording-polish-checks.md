# Recording-led polish verification

Runtime/presentation source: `7546beb2b479edc3f6bdd20ca685e1cafe632e7b` (subsequent native-board amendment is documentation only).

- Reviewed the 15.00-second Life recording and 47.93-second Classic recording across their full timelines, plus denser 120 ms frame sequences for the cited focus/expansion transitions.
- Separate source-grounded specs: [Classic](../../../docs/design/specs/2026-11-06-classic-video-spec.md), [Life](../../../docs/design/specs/2026-11-06-life-video-spec.md).
- Active iOS-target syntax parse passed for LifeRoot, LifeWalletStack, LifePalette, ManageSheets and LifeUITests using Swift 6.4.2. This is not an SDK typecheck.
- `swift test --package-path ios/SpreadNativeV2 --scratch-path /tmp/life-polish-swift-tests -j 2`: 50 tests, 0 failures, Linux, November 6 at 15:47:58 UTC.
- Node 22 documentation checks and branch whitespace checks passed.
- Native geometry acceptance case added for both tray sides; NOT EXECUTED.
- No planner, schema, storage, Classic layout or frozen-demo runtime changes in this polish scope.
- No new native build, measured contrast/layout, matched candidate captures, frame-rate claim, physical haptic claim, upload, merge or deployment.

Before sign-off: record the new native candidate replaying the reviewed sequences; verify intermediate card frames, artwork/title separation, both tray sides/Close alignment, large text, reduced motion and task/scheduling/history functionality.
