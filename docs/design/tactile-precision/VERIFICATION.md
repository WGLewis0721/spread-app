# Verification, ownership and release gates

> Part of the [Spread design brain](../README.md). [Folder map](README.md) | [Motion contract](MOTION_CONTRACT.md) | [Dated spec](../specs/2026-11-06-tactile-precision.md)
>
> Summary: Test the proposed tactile language without claiming completion from code presence, browser animation or simulator snapshots. The approved Life demo and Classic baseline are protected.

## 1. Ownership and evidence

| Workstream | Responsible role | Evidence required |
| --- | --- | --- |
| Motion primitives and SwiftUI implementation | Native engineer | Before/after recording, motion token inventory, interruption tests |
| Wallet/Hours/Week store integration | Planner engineer | Store command traces, rejection/undo/relaunch cases; no second writer |
| Accessibility and haptics | iOS accessibility QA | VoiceOver walkthrough, Reduce Motion, haptics-off and physical touch evidence |
| Adaptive layouts | Device QA | Named device/OS/build, same-content screenshots, Duo width/hinge matrix |
| Release and rollback | Release engineer | Exact candidate SHA, automated run links, explicit owner decision |

Treat all uncollected evidence as **not tested**. Reference-browser captures are visual targets, not proof of native parity. A simulator cannot verify Taptic Engine feel. Record device model, OS version, build, SHA, date and input modality with each test.

## 2. Functional acceptance (Given / When / Then)

1. **Wallet selection:** Given three stored responsibilities, when a card is tapped twice, then focus opens and closes without changing task or hour data; selected card width, title and icon do not jump.
2. **Separate details:** Given a focused card, when its task list grows or shrinks, then the neutral details field grows beneath it, scrolls naturally with the page, and never clips or scroll-traps task actions.
3. **Switch under motion:** Given a Wallet expansion in progress, when another card is selected, then the new selection takes effect immediately, the prior movement is interrupted cleanly, and the correct role's details appear.
4. **Swipe safety:** Given edit mode, when the user crosses a valid left/right reveal threshold, then only the corresponding action is exposed and deletion is still confirmed; cancel leaves a stable rest state.
5. **Sidebar:** Given compact and wide layouts, when navigation opens, changes destination or closes, then selected role/day and planner data remain intact; navigation has visible controls and an accessibility alternative.
6. **Crown:** Given a week view, when Crown movement crosses one week boundary, then week selection changes once with one bounded detent cue, and the existing Today/control path remains usable.
7. **Hours drafting:** Given a valid hour budget, when the user scrubs across half-hour detents, then the displayed draft reflects the gesture, bounded cues fire, and exactly one validated write occurs on successful release.
8. **Hours rejection:** Given insufficient capacity or an unavailable store, when the user tries an invalid adjustment, then no false success fires, the previous saved state remains authoritative, and a reason is shown.
9. **Week scroll:** Given a long task list, when the user scrolls vertically then swipes horizontally in the designated day/week zone, then both motions work independently without unintended task moves.
10. **Task complete:** Given an incomplete task, when completion succeeds or fails, then the UI and haptic confirmation correctly reflect the acknowledged store outcome; allocated hours do not change.
11. **Reordering:** Given tasks with supported ordering, when a task is dragged and dropped or reordered through its alternative action, then positions and persistence match. If the store lacks ordering support, leave it out rather than faking saved state.
12. **Persistence:** Given real planning data, when the app relaunches, changes profile, rotates, or folds, then role identity, scheduled tasks, allocations, and previously committed edits remain correct.

## 3. Motion and accessibility gates

- Compare the same screen and action against the **current approved native/Life baseline** and an isolated candidate. Record finger-down response, reversal during animation, threshold crossing, settle position, and any delayed tap.
- Target next-render visual response; measure end-to-end input latency and long-frame counts on real hardware. Aim for stable 60 fps on 60 Hz devices and 120 fps only where device support allows. These are measurement goals, not pass claims.
- Haptic event review: no duplicate events per detent, no event when setting is disabled, no success on a rejected command, no repeated boundary buzz. Capture event logs where possible; include qualitative physical-device feedback.
- Repeat every core journey with Reduce Motion and enlarged Dynamic Type. Also test VoiceOver, Increase Contrast, Reduce Transparency, landscape, external keyboard and a switch-accessible alternative where applicable.
- No invisible-only affordances. Controls remain >=44 pt and semantic labels communicate role, duration, action and result without color reliance.
- Keep the existing gesture semantics and reference thresholds where already approved. Any changed feel requires owner review and matched recordings.

## 4. Device matrix

| Layout | Required checks |
| --- | --- |
| Standard iPhone 390/393 pt | Wallet, separate details, overlay navigation, Crown, task/Hours actions, safe-area and keyboard |
| Expanded width about 820 pt | Compact/persistent rail experiment, focus retention, split/overlay behavior |
| iPad 1024/1366 pt | Multi-pane readable hierarchy, keyboard/pointer, large lists and no stretched cards |
| Duo supported postures | Folded, expanded, orientation, hinge/fold-safe zones, continuous task/state preservation |
| Physical supported iPhone | Haptic character, gesture velocity, thermal/fps, VoiceOver and interrupted motion |

Do not infer physical Duo parity from a normal iPhone simulator. For unavailable hardware, attach the exact matrix of missing evidence and retain NO-GO.

## 5. Automated and manual checks

1. Inventory existing SwiftUI tests and committed planner script test lists before adding coverage. Add focused deterministic tests for gesture thresholds, bounded detents, cancellation, scroll-priority and state/snapshot invariants where testable.
2. Run the repository's documented typecheck, lint, planner tests, script tests, native tests and build for the implementation candidate. Run docs:check for documentation edits.
3. Execute Life and Classic native UI journeys with identical representative data and compare frames/screenshots at matching widths.
4. Record actual VoiceOver output, touch alternatives, physical haptics and long-gesture behavior. Review failed actions and race conditions, not only happy paths.
5. Verify Life reference demo hashes remain identical and More/Settings content/controls do not change.

This documentation-only PR does not run the app or certify any of the above. CI/hardware results must be attached to the future implementation PR.

## 6. Rollout and rollback

- **Stage A, design only:** this folder and map links, with zero production-code changes.
- **Stage B, isolated prototype:** side-by-side measured current vs candidate motion on a disposable profile. No changes to frozen reference. Capture acceptance videos and owner feedback.
- **Stage C, gated implementation:** separate small PRs for shared motion, Wallet/details, Crown/Hours, and Week/tasks, each with source inspection, tests and rollback. Put new polish only in an existing opt-in Life preview unless the owner explicitly approves broader adoption.
- **Rollback:** revert an individual motion PR or disable preview and use untouched Classic. Never migrate/delete planner data as part of animation rollback.
- **Release authority:** no merge, Codemagic candidate, TestFlight upload or App Store release without explicit approval and the existing release-control checks.

## 7. Definition of done

Only claim complete after visual and behavioral parity, deterministic gesture tests, absence of duplicate haptics, store-persistence checks, accessible alternatives, and required physical-device evidence are present on the **same reviewed commit**. Unavailable evidence is a release blocker, not a pass.
