# Contact Deck native and gesture polish

> Part of the [Spread design brain](../README.md). Owner-requested separate app in draft PR #104; not a Spread rewrite. Build from `prototypes/contact-deck/three-action.html`; the unchanged `index.html` is the approved visual reference.

## Plan and ownership

Implementation owner: this PR. Keep original geometry/portrait hierarchy, Stack/Fan/Flow, virtualized neighbors and inert floor reflections. Replace release-only swipes with finger tracking, predicted release and a spring. Make selection deliberate and reversible; add notes and a small, optional reconnect collection. Generate a separate SwiftUI/SwiftData target and run its simulator CI. Ship a review preview, without merge, deployment, signing or store upload.

## Reference lock

Primary: approved Contact Deck `index.html`: one dominant portrait card, nearby cards at shallow perspective, contact actions over a readable lower gradient, restrained chrome and reflected Flow floor. The brief supersedes its design-era selector: system Light/Dark only, system typography and SF Symbols in the native app. Preserve three modes and physical browsing; do not add a dashboard, streaks, a setup tour, custom themes or a permanent action toolbar.

Secondary: Apple HIG [motion](https://developer.apple.com/design/human-interface-guidelines/motion), [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [gestures](https://developer.apple.com/design/human-interface-guidelines/gestures). The native-feel pack governs semantic surfaces, system controls, motion reduction, alternatives and material restraint. Refero Apple MacBook Neo (`04cc9d9d-a641-4552-b370-0dea414a15db`) contributes neutral canvas/type and accent discipline only; its marketing layout and finish gradients are not app tokens. Refero Paste (`1c0fbb80-f4ca-4c30-8f72-4a8f95a83005`) contributes quiet system utility hierarchy only. Portraits are existing reference media, never a basis for recoloring system chrome.

## Interaction contract

- Browse starts after 12px on the mode's main axis. Moving more than 10px cancels the 460ms hold. A successful hold enters selection; subsequent drag may group; it cannot also browse or flip.
- Flow uses shallow depth, continuous rotation toward center and precise snapping. Fan pivots at its bottom. Stack peels vertically and lifts the next card. Native spring damping 0.84; browser unit-mass stiffness 210, damping 24.35 (ratio 0.84), evaluated analytically from elapsed time so throttled frames do not slow settling. Motion interruption starts at the current position.
- No browse gesture deletes. Removal shows affected names and requires confirmation. Browser Undo lasts 12 seconds. Native soft removal and Recently removed survive restart. Device address-book records are never mutated.
- Card options, keyboard navigation and accessibility actions provide alternatives. Sheets trap browser focus and restore it. Reflections are inert/hidden to accessibility. Reduce Motion removes travel/rotation/mirrors, using short fades.
- Notes are local. Reconnect uses favorites, recency of explicitly marked reach-outs, and snooze. Calls/messages opening never counts as a completed conversation.
- First interaction: immediate deck in the browser, a single “Try the deck” action in native. Native UI test measures launch-to-useful-deck against 25 seconds.
- Unlimited contacts and portrait/initials card style use one nonconsumable purchase. No automatic paywall while browsing; dismissal and restore are always available. Sync is unavailable and excluded from purchase copy until verified.

## Acceptance and release gates

Automated tests establish interaction state, snapping, interruption, saved notes, safety, geometry and functional entry, not subjective parity with Life360, Telegram, Apple Music or Wallet. Capture all three modes before/after, iPhone compact/large, iPad, Light/Dark and motion reduction. Native compile, model reopen tests and simulator UI tests must pass. Physical 60fps pacing, haptic timing, VoiceOver, Dynamic Type, purchase/restore/revocation, and two-device sync remain explicit release gates. No app icon or store availability is implied by this review target.

Rollback: revert this PR's commits or close the draft. The approved prototype, Spread planner/native storage, main and golden branches remain intact. Branch-scoped Vercel deployment is disabled in `vercel.json`.
