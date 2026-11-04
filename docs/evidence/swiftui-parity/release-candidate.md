# Native release candidate continuation

Current branch: `fix/swiftui-finish`, based on main `3852a9f` (PR #119 and #120 merged).
Owner objective (November 3, America/Chicago): a paid-app candidate tonight, with iPhone, iPad and iPhone Duo as major targets.

## Implementation

- Reserve the dock through a real safe-area inset; no hardcoded bottom spacer.
- Keep whole layout names in a scrolling control, and its accessibility container in every size.
- Compact empty days; choose one or two day columns from available space, with one column at accessibility text sizes.
- Allow phone landscape; use the iOS 27.1 SDK in the shipping and new manual candidate workflows.
- Restore Stack swipes and keyboard/VoiceOver selection; bound Fan to one selection per swipe; reset deleted selections.
- Softer, pixel-aligned Crown ribs; stable wheel height and a 44pt return-to-week control; expose acknowledged Crown state.
- Add the profile/task entrance cascade, without delaying interaction or moving under Reduce Motion.
- Explain empty/insufficient banks inside the serialized dispatcher; test no writes, replay behavior and exact bank use.
- Share sixty deterministic Free time vectors between TypeScript and Swift; no planner schema/store changes.
- Flush rich content on Done before dismissing; show the allocation date and responsibility hours on the task sheet.
- Keep appearance consistent through the native container and status bar; test actual device appearance instead of an ignored launch flag.
- Preserve rollover confirmation from More, and wrap the full color palette at narrow widths.
- Adapt the existing F1–F10 journeys to the current controls. Repair 390pt simulator selection and before-tour source compatibility.
- Restore Studio cutout-local pivots, layer-relative translation, CSS easing/keyframes and seven decorative FX, sharing one paused/reduced-motion-aware clock.
- Confirm destructive responsibility removal; keep appearance controls and day-mark hit regions at least 44pt.

## Verification

Planner tests: 437 pass locally. Script suite: 210 pass / 4 existing skips. TypeScript typecheck passed.
Initial candidate `de56e46`: native iOS compile, portable Swift contracts and the main CI checks passed.
The 1024pt iPad tour and orientation test passed. Its hit-region audit found ten reports, all the same 14.5pt day-mark region; this revision enlarges it within the existing illustration band.
The 820pt dark-large-text tour timed out in the accessibility query; its other tours completed. Initial captures labeled dark actually rendered light. This revision checks the rendered appearance and tests the real preference controls and live system changes.
The 390pt layout job failed before launch because the simulator service timed out; discovery now retries that transient error.
This revision passed 28 portable Swift tests. Initial iPhone flow checks passed placement/Undo, Crown, Month/day selection and Move to. Full journeys exposed inherited SwiftUI accessibility identifiers and lazy-list navigation failures; this revision gives named surfaces their own accessibility containers and scrolls lazy rows before requiring them. Native UI reruns, actual Duo results and a signed artifact remain pending.
No claim of physical-device, fold-pose, reference-image or App Store acceptance for this new binary.

## Build route

`spread-release-candidate` in `codemagic.yaml` is manual, selects only this exact branch tip, uses Xcode 27.1,
runs actual Duo modes/appearance/rotation tests, then builds an App Store-eligible signed IPA and uploads to App Store Connect.
It never submits for App Review or releases the app. The existing PR119 internal-only workflow is untouched.
Codemagic is connected. Existing main build 16 completed signing/upload; that is not this candidate.
Candidate run `6aeaa7bfa87b4d255fde5ec8` passed its checks/bundle step, then was deliberately stopped before signing/upload to correct navigation failures found in the parallel UI suite.

## Scope retained

No accent picker, Stack auto-turn, custom sheet stack, cloud surface or native backup rewrite was added.
The original engine remains the only writer; protected recovery and all golden branches are unchanged.
Physical haptics, fold/occlusion poses, exact-reference spring/FX calibration and comparison to the owner's original binary remain explicit gates.
