> **Parity implementation status (branch `claude/spread-swiftui-parity-87llx2`):** the native SwiftUI shell, Week, Month, Spread and five layouts, Chalkboard artwork, sheets, and export were rewritten from the pre-migration source (35b6652) and the Studio branch. **Everything is UNVERIFIED and NO-GO.** Nothing was built, tested, or run on a device. See [implementation ledger](../../docs/evidence/swiftui-parity/implementation-ledger.md) for each checklist item, its files, gaps, and the external blockers (including the missing owner reference binary).

# Spread native SwiftUI

**November 3 checkpoint:** [PR #114](https://github.com/WGLewis0721/spread-app/pull/114) is merged at `6aa2355`; follow-up branch `fix/spread-native-acceptance-followup`. Final-head Swift package verification passed (18 tests and iOS Simulator compilation). The 820/1024-point layout jobs passed, while 390 points failed a clipped-text accessibility audit. Main's full-shell persistence step failed its cycle-2 writer recovery check and needs diagnosis. The actual 100-drag Crown/30-reversal test and unsigned Release archive passed; Stack selection and initial iPhone clipped-text audits failed. **Native release: NO-GO.** See the [current handoff and continuation prompt](../../docs/SPREAD_2_NATIVE_HANDOFF.md) for exact evidence and remaining gates.

The live app is `SpreadLiveRoot`, hosted by `ios/App/App/SpreadBridgeViewController.swift`. It uses the bundled React planner as its only engine. `LivePlanner` sends correlated, serialized requests through WebKit to `SpreadNativeHost`, which invokes the guarded TypeScript dispatcher and existing Zustand actions. Swift stores only a transient view projection and local editor drafts.

The application includes Week, Month, the original horizontal metallic Crown, five responsibility layouts, responsibility/hour/allocation management, task and rich-content editing, eligible-day placement, completion, Undo, unfinished work and profile switching. Backup/restore uses the established React recovery surface against the same profile data. There is no Studio or appearance editor. All eleven original category illustrations remain package resources.

`SpreadNativeV2Preview` and `SpreadV2Fixture` are separate fixture-only Debug tools. Normal app startup uses the live WebKit host when its endpoint is ready. Release acceptance is tracked in the [issue 113 evidence ledger](../../docs/evidence/issue-113/README.md); compilation alone is not release approval.

Verification:

```sh
swift test --package-path ios/SpreadNativeV2
xcodebuild -scheme SpreadNativeV2 -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
# From the repository root after npm run ios:sync:
xcodebuild test -project ios/App/App.xcodeproj -scheme SpreadNativeUITests -destination 'platform=iOS Simulator,id=SIMULATOR_UDID' CODE_SIGNING_ALLOWED=NO
```

Shared fixtures cover 60 TS/Swift projections, bank arithmetic and eligible allocations. Swift reducer tests cover 100 Crown gestures and 30 reversals. The actual UI target captures screens from the installed app and includes a real 100-drag Crown test; results must be inspected separately from reducer tests. GitHub's iOS shell workflow retains positive mirror/relaunch/restore assertions and a disabled-writer negative control, then runs the UI target and exports screenshots.

Rollback removes native hosting and restores the original React entry. No planner schema or user-data migration is needed. Retain the independent late-filesystem mirror-writer fix. Do not publish a native candidate until the documented release gates pass.
