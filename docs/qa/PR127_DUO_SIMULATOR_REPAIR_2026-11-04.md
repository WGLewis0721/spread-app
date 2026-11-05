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

## PR #129 continuing implementation (2026-11-04)

**Status: DRAFT / NOT READY FOR MERGE.** No deployment, merge, migration, or production configuration change. Every assertion and workflow remains enabled. Only completed simulator results on the final branch head can satisfy the release gates.

### Changes pushed to the existing branch

- `514be70`: Week interaction test swipes **inside an actual visible day card**, rather than 65 points from the ScrollView edge. The Week content is capped at 1120 points in a wide Duo scene and may not extend to that test coordinate. Now also checks reverse swipe back to the original week. The production gesture thresholds/vertical arbitration are unchanged and still require a passing simulator.
- `1a3a841`: Notes, expanded notes, outlines, and table row/column edits now read and modify the current rich-content block, avoiding stale captured editor values while typing.
- `e039e7a`, `ddc8908`, `a680777`, `42c3f83`: Week task text and responsibility labels gain multiline sizing; task title, outline/table fields, and profile fields gain vertical text growth; More sheet labels allow wrapping. Targeted to actual clipped accessibility nodes in iOS shell run [41860698779](https://github.com/WGLewis0721/spread-app/actions/runs/41860698779). **Not yet verified as clearing the accessibility audit.**
- `032f228`: F04 selects allocation choices by their accessible weekday labels and tests placement, movement, unscheduling, and Undo restoration to Monday. No production allocation/date key was changed.
- `bed5b61`: Native XCTest field-entry helper now scrolls the sheet before declaring an offscreen table cell absent. The previous F03 failed *before* entering the table cell; the screenshot/hierarchy artifacts from [41860698779](https://github.com/WGLewis0721/spread-app/actions/runs/41860698779) must still be reviewed to rule out a genuine insertion defect.

### Interpretation of earlier failures

- **F03:** A table-format button tap succeeded, then `content-cell-0-0` did not appear in the initial AX lookup while the keyboard was visible. That is consistent with an offscreen nested table, but is not proof that the table exists. The test must enter and reread the cell after relaunch to pass.
- **F04:** The previous test used ISO calendar days as `eligible-day-` identifiers although the production sheet uses allocation IDs. The revised test uses labeled weekdays and checks reversible placement.
- **F10_1:** At `500bd653`, line 468 was the **saved Notes value assertion**, not a storage-engine failure. F03 had aborted before its Done/flush; F10_4 save-retry and F10_2 profile isolation passed. Verify F03's complete persisted round-trip, then rerun F10_1 before changing local storage.
- **Week:** The old horizontal drag position may lie outside the 1120-point Week surface when the enclosing viewport is wider. The updated test still requires the Crown to advance and return and the vertical scroll to work.
- **Hinge/rotation:** [41860698620](https://github.com/WGLewis0721/spread-app/actions/runs/41860698620) reached `agent-device` readiness, which reported a still-changing surface; the job exited without finished pose assertions. Treat as **blocked**, not a verified hinge defect or a pass.

### Final acceptance gates (all must pass on the final branch head)

- [ ] iPhone Duo native acceptance: hit targets, vertical Week scrolling, horizontal forward/reverse swipes
- [ ] Native acceptance journeys: rich-content insert/edit/relaunch, allocation move/unplace/Undo, profile isolation, save retry
- [ ] iOS shell: F03, F04, F10_1, F11 sheet/Week/Month text-clipping audits
- [ ] Native layout acceptance at all tested widths and accessibility sizes
- [ ] Duo hinge/rotation acceptance: startup readiness plus actual folded, half-open, open and rotated pose captures
- [ ] Native visual tour: Wallet, Crown, Week/Month and approved illustrations
- [ ] Spread 2.0 SwiftUI slice verification
- [ ] CI and App Store preflight
- [ ] Owner review of simulator screenshots, reduced-motion behavior and VoiceOver traversal after the automated gates pass

### Rollback and non-regression boundaries

Revert only PR #129 commits if any follow-up change causes regression; do not remove the verified main baseline, the Wallet stack, Metal Crown, Chalkboard assets, or data already in local planner storage. These repairs introduce no schema migration. Preserve screenshots, AX trees, logs, and failing test names on the PR for any new failure; never mark a canceled, skipped, queued, or indeterminate job as passing.


## Correction (PR #134, 2026-11-04): the hinge failure was a harness error, not a readiness stall

The sections above classify the hinge/rotation workflow as "BLOCKED" because "agent-device readiness reported a still-changing surface". The uploaded artifacts do not support that.

- Artifact `13337464895` (run 41852591875) and artifact `13347556086` (run 41860698620) each contain `session.json`, `hinge-closed.json` and `orientation-closed-portrait.json`, and no startup-failure files. They show the app **opened** (`session.json`, startup 20.5 s), `agent-device fold closed` **succeeded** (hinge 0°, LCD native panel 466 × 678 pt), and then `agent-device orientation portrait` **failed**:
  `UNSUPPORTED_OPERATION: Spread duo pt cannot rotate in a scoped simulator set` (`reason: unsupported-device-scope`; hint: "Rotate it in the default device set").
- Cause: the workflow passed `--ios-simulator-device-set "$HOME/Library/Developer/CoreSimulator/Devices"`. The pinned `agent-device@0.21.36` treats any value of that flag as a scoped set, and its help text states a foldable iPhone simulator "refuses every rotation in a scoped simulator set". Fix: do not pass the flag (PR #134).
- The second run's pose step lasted 2 m 41 s, too short to have exhausted two 180 s readiness waits, which is consistent with this reading.
- Consequence: **no hinge pose or rotation assertion has ever completed.** The earlier runs say nothing, in either direction, about folded, half-open or unfolded behavior. The run on `7a9cbd7` never reached the pose step at all: its build failed on the Swift exclusivity error fixed by `c1d1cc4`.
- `ios/App/App/Cloud/**`, storage and schema were not involved.
