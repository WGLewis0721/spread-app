# Spread native SwiftUI

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
