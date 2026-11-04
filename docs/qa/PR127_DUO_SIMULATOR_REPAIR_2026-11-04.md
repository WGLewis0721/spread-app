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


## Follow-up simulator outcomes on PR #129 head 500bd653 (2026-11-04)

Source: [Duo run 41860698724](https://github.com/WGLewis0721/spread-app/actions/runs/41860698724), [hinge run 41860698620](https://github.com/WGLewis0721/spread-app/actions/runs/41860698620), [iOS shell run 41860698779](https://github.com/WGLewis0721/spread-app/actions/runs/41860698779). CI 41860698905 and preflight 41860698813 **passed**. Native layout, journeys, visual tour and SwiftUI slice were still queued at inspection.

- **Verified improvement:** `DuoUITests.testWalletStackInBothAppearances` PASSED, along with appearance round-trip and Wallet card expansion/edit. The 44-point repair is supported by the Duo acceptance test; broader device poses remain unverified.
- **Confirmed failure:** `PlannerUITests.testWeekScrollsVerticallyAndStillSwipesHorizontally` failed at `PlannerUITests.swift:606`: horizontal swipe did not change week. The prior geometry-anchor change is insufficient. Inspect the actual UIKit gesture recognizer, SwiftUI scroll gesture arbitration, test drag origin, and Crown/week model state. Do not alter the assertion to accept a no-op.
- **Confirmed iOS shell failures:** `testF03_TasksAndRichContent` missing `content-cell-0-0` (line 371); `testF04_PlaceAndMove` missing `eligible-day-2026-11-02` (line 387); `testF10_1_RelaunchKeepsEverything` failed at line 468 (rich-content persistence assertion); `testF11_AuditSheets` and `testF11_AuditWeekAndMonth` report repeated text-clipping accessibility audit issues. Inspect exported failure screenshots/hierarchies before modifying UI. F05, F06, F07, F08, F09, F10_2, F10_3 and F10_4 passed.
- **Hinge/rotation:** workflow failed, but the logs did not establish a completed pose assertion. Classify as BLOCKED until the startup evidence and pose log are inspected. Do not claim a hinge defect or success.

### Required focused implementation follow-up

1. Reproduce the Week swipe failure in the Duo simulator and instrument recognizer state and displayed week before/after. Fix hit-testing/gesture arbitration at the production surface, then retain the vertical-scroll and horizontal-swipe assertions.
2. Inspect the F03 editor hierarchy after adding a table block; distinguish an absent table cell from an offscreen or keyboard-obscured cell. Repair production editor insertion/focus or the harness's legitimate scrolling path, never skip the table round-trip.
3. Inspect F04 eligible-day menu and task allocation state. Verify the exact current-week Monday/Wednesday allocation keys before changing date-only logic or picker behavior.
4. Trace F10_1's exact assertion and compare stored rich-content snapshot after relaunch; preserve the local-first store and existing persistence tests.
5. Use the exported accessibility issue details to identify each clipped label, fix text layout for Dynamic Type and narrow widths, and rerun unmodified accessibility audits.
6. Inspect the hinge startup artifact; fix runner readiness only if the evidence proves setup failure, then rerun real pose/rotation tests.

**No implementation claim:** This update records newly completed CI evidence and the remaining repair plan; these additional failures are NOT yet fixed. Do not merge #129 until the native verification gates pass.
