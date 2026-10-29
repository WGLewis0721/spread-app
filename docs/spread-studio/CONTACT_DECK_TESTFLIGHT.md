# Contact Deck in Spread Studio: internal TestFlight preview

**Scope:** A native SwiftUI Contact Deck reachable from **More → Contact Deck** in the existing **Spread Studio iPhone app**. This is an evaluation entry point, not a new product bundle or release of Contact Deck. The approved independent Contact Deck draft PR #104 stays separate.

## Implemented

- Studio-only native entry in More; unavailable in the unflagged production app and ordinary web browser.
- The existing SwiftUI Stack, Fan and Flow deck appears full-screen with **Back to Spread** in its native navigation bar.
- First open seeds fictional sample contacts automatically. Add your own contacts only through the explicit native system contact picker. No bulk permission prompt is required for sample browsing.
- The embedded preview uses its own SwiftData database under Application Support / ContactDeckStudio; it never writes to Spread's task/profile storage, nor edits the system contacts list. Removing a deck card is soft-deletion within the preview only.
- All interactions are available without unlocking or purchasing. StoreKit transactions do not run in this preview. No iCloud sync or separate App Store listing.
- App identity, App Store Connect integration and signing remain `com.graymatter.spread` and the existing `spread-studio-testflight` workflow.

## Release and testing

On this feature branch, make a PR into `spread-studio`, not `main`. Require repository checks including the macOS `iOS shell` simulator build before merging. The standard release gate is unchanged: a protected GitHub `workflow_dispatch` from `main` needs the **exact approved spread-studio tip SHA**, `confirm_upload=true`, the protected `ios-studio-testflight` environment approval, and configured Codemagic credentials. Never bypass those checks, merge staging into main, or start the production workflow.

Once available on an internal TestFlight build: open Spread → More → Contact Deck, swipe in three modes, flip/search/group/sample-deletion, add **one selected personal contact** and check permissions, tap Back to Spread, verify planner information is unchanged, force quit/reopen and confirm both stores persist independently. Validate Reduce Motion, VoiceOver, app relaunch and failure to initialize SwiftData on a physical iPhone. After Apple processes the uploaded IPA, assign it to internal testers.

## Known boundaries

The embedded deck reuses the native PR #104 implementation, with standalone commerce intentionally suppressed. Native Phone call history remains inaccessible; the current native app does not implement an automatic call-log importer. The native SwiftUI project originally targets iOS 18+, while Spread supports iOS 17; the integrated simulator build and deployment compatibility must pass before release. Physical iPhone interaction feel and signed TestFlight distribution are unverified until completed. Staging rollback is a PR revert; an installed TestFlight release requires a higher build number for a corrective update.
