# Tactile Precision acceptance register

> [Index](README.md) | [Motion contract](MOTION_SPEC.md)

**Release status: NO-GO until proven.** At authorship, no Xcode/macOS runner, simulator, physical iPhone, Codemagic signed build or Instruments trace had been executed by this session. Do not mark any of the following as passed by inference.

## Required automated gates

- [ ] Same exact candidate SHA passes package tests (including `TactilePrecisionTests`) and iOS SwiftCompile/archive using the documented Xcode 27.1 pipeline.
- [ ] Existing TypeScript planner tests, scripts, typecheck, lint, build and native journey tests show no regression.
- [ ] No edits to More/Settings, Classic shell, frozen reference, React planner store/schema, cloud paths or release gates.
- [ ] App remains local-first and offline, with native selection state not causing planner writes.
- [ ] Confirm reduced-motion, static accessibility labels, Dynamic Type and at least 44 pt targets by automated view checks where available.

## Device journeys: Given / When / Then

- [ ] Given several Life cards, when tapped in rapid alternation, only the selected card focuses; its neutral detail field is separate, correct and interruptible.
- [ ] Given an edit-mode card swipe or cancellation, when released, the card snaps to exactly center/Manage/Delete; no hidden destructive action occurs.
- [ ] Given an hours arc, when it crosses a valid 15 degree detent, the draft changes exactly 0.5 h; tapping entry achieves the same value.
- [ ] Given a capacity boundary or rejected save, when the user continues, the warning is bounded and the original planner data remains safe.
- [ ] Given a Crown drag, when crossing and reversing 64-point detents, the week changes exactly once per accepted intent and never double-buzzes.
- [ ] Given a Week view, when swiped horizontally, the selected day changes. Vertical scrolling, date taps, expanded Month and task controls do not interfere.
- [ ] Given a 390/393 pt viewport, a bottom sidebar opener is reachable; given >=820 pt, a persistent rail replaces it with the same three destinations.
- [ ] Given a successful task completion, haptic confirms once, and the stored task/Undo remains correct.
- [ ] Given a profile/week change, app relaunch or rejected task edit, planner persistence and correct UI identity survive.
- [ ] Given reduced motion/haptics disabled, all controls remain fully usable without animated travel or hardware feedback.

## Captures and evidence needed

| Environment | Evidence |
| --- | --- |
| Standard iPhone portrait/landscape | Matched Wallet closed/focused/details, Hours, Week, sidebar screen recordings |
| iPad wide/split | Persistent rail, pointer/keyboard, margins, long labels |
| Every supported Duo posture/orientation | Safe areas, gesture ownership, no planner resets |
| Physical iPhone | Slow/fast/canceled gestures, haptics on/off, Instruments frame pacing |
| Accessibility | VoiceOver labels and order, Dynamic Type, high contrast, Reduce Motion |

Document hardware model/iOS build, exact PR SHA, test run IDs, before/after shots and any discrepancies. Fix discrepancies before completion. Preserve rollback via feature PR, do not merge or upload publicly without release authorization.
