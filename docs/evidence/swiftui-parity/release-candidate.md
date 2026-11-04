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

## Verification

Planner tests: 437 pass locally. Script suite: 210 pass / 4 existing skips. TypeScript typecheck passed.
Native compile, actual UI runs, screenshots and signed artifact are pending CI/build-service evidence at this checkpoint.
No claim of physical-device, fold-pose, reference-image or App Store acceptance for this new binary.

## Build route

`spread-release-candidate` in `codemagic.yaml` is manual, selects only this exact branch tip, uses Xcode 27.1,
runs actual Duo modes/appearance/rotation tests, then builds an App Store-eligible signed IPA and uploads to App Store Connect.
It never submits for App Review or releases the app. The existing PR119 internal-only workflow is untouched.
Codemagic is signed out in this session, so this route has not been started.

## Scope retained

No accent picker, Stack auto-turn, custom sheet stack, cloud surface or native backup rewrite was added.
The original engine remains the only writer; protected recovery and all golden branches are unchanged.
Physical haptics, fold/occlusion poses, exact-reference spring/FX calibration and comparison to the owner's original binary remain explicit gates.
