# PR #127 native simulator repair evidence (2026-11-04)

Baseline merged main: `9626ca0d79b4a70366bdc7e742203d02bb6c234f`. Source PR head: `0657e0c3d959ced72a0b9a4aa2c0ef757555f95c`.

## Verified outcomes
- [iPhone Duo native acceptance, run 41852591733](https://github.com/WGLewis0721/spread-app/actions/runs/41852591733): Xcode UI tests built and ran. **2 of 4 selected tests failed**:
  - `DuoUITests.testWalletStackInBothAppearances`, line 1138: visible controls under 44 × 44 pt: Work 41×20, Work hours 19×18, Home 47×20, Home hours 19×18. This is a confirmed accessibility hit-target defect.
  - `PlannerUITests.testWeekScrollsVerticallyAndStillSwipesHorizontally`, line 606: horizontal swipe did not advance week. Vertical scroll check completed before that assertion. This is a confirmed UI failure.
  - Artifact `iphone-duo-native-evidence` ID 13338548695 (XCTest attachments, 93 MB).
- [Duo hinge/rotation acceptance, run 41852591875](https://github.com/WGLewis0721/spread-app/actions/runs/41852591875): compiled and launched `com.graymatter.spread`, but the agent-device readiness wait for `native-spread` failed before any hinge/rotation assertions. Log says surface was still changing when its tree was read. **Blocked/indeterminate**, not evidence of a hinge layout defect. Artifact `duo-real-hinge-and-rotation` ID 13337464895 contains startup diagnostics.
- [CI on source PR](https://github.com/WGLewis0721/spread-app/actions/runs/41852592124) passed. [App Store preflight](https://github.com/WGLewis0721/spread-app/actions/runs/41852591688) passed. Other native workflows remained queued/pending at time of triage.

## Focused repairs
1. Expand the actual SwiftUI title and hours Button label hit areas to at least 44×44 pt without changing the Wallet stack layout or weakening the target-size assertion.
2. Give WeekHorizontalSwipe's UIViewRepresentable a real, geometry-sized UIKit anchor, so its recognizer can receive and direction-gate touches while preserving vertical ScrollView behavior.
3. Keep the original UI assertions, adding diagnostic context to the week swipe failure.

## Required verification before merge
- Re-run `DuoUITests.testWalletStackInBothAppearances` and `PlannerUITests.testWeekScrollsVerticallyAndStillSwipesHorizontally` on an iPhone Duo simulator; verify both pass with screenshots.
- Run full iPhone Duo, hinge/rotation, native layout, journeys, visual tour, iOS shell and SwiftUI slice workflows. Confirm native readiness and actual closed/half-open/open hinge captures.
- Verify keyboard/VoiceOver, long press, scroll, Crown, Week/Month, light/dark and Reduce Motion. Do not interpret queued or canceled runs as passes.

## Rollback
Do not merge until verified. To roll back after a future merge, revert only the commits introduced by this PR, leaving the planner store, WebKit bridge, persisted data and unrelated Chalkboard animation PR #128 intact. No migrations, remote calls or production configuration changes are included.
