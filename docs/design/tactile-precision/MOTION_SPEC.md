# Tactile Precision motion and haptics

> Part of the [Spread design brain](../README.md). [Local index](README.md) | [Acceptance](ACCEPTANCE.md)
>
> Summary: Spread should feel like a machined physical instrument: immediate finger tracking, meaningful detents, controlled release, and consistent, interruptible settling. Motion only serves an actual planning action.

## Unified vocabulary

| Motion | Purpose | Native token | Initial target |
| --- | --- | --- | --- |
| **Glide** | Day/destination changes; directional transition | `SpreadTactile.glide` | Spring response 0.28, damping 0.96 |
| **Snap** | Threshold stop or release | `SpreadTactile.snap` | Spring response 0.22, damping 0.91 |
| **Settle** | Selected card, details or expanded surface | `SpreadTactile.settle` | Spring response 0.32, damping 0.88 |
| Contact | Press acknowledgment | `SpreadTactile.contact`; existing `.spreadPress` | About 0.10 second |

These are tunable defaults, not measured device results. A finger-controlled translation must **not** animate while dragging; only its release or state transition animates. A new touch can interrupt the transition. Reduce Motion disables translation and spring movement without withholding content.

## Wallet and details

[Repo] `LifeWalletStack` contains full-width, role-colored cards and `LifeRoot.details` renders the neutral field **outside and below the selected card**. Keep their roles distinct. Never move tasks into the colored card or write selection into the planner store.

- Tap: immediate pressed state, one soft selection haptic, card Settle, independent detail reveal. Tap again closes it. Switching cards must be reversible before settling completes.
- Swipe while editing: finger follows actual horizontal movement. A meaningful threshold reveals Manage to the left or Delete to the right. `TactilePrecisionMath.revealTarget` selects 0, -92 or +92 pt using position plus projected velocity. The action remains a revealed button; it does not execute automatically. Delete still confirms.
- Cancel or reverse: exact snap to a valid stop, no persistent stray offset. Give feedback once on the visible reveal crossing, never on every pixel or frame.
- Long press: retain edit access; provide equivalent accessible Manage/Delete buttons. Dynamic Type keeps the cards readable rather than hiding labels.

## Hours: calibrated mechanical detents

[Repo] `LifeHoursView` rotates a responsibility arc 15 degrees per 0.5 hour. Capacity uses upward/downward flicks of one hour, sustained drag and numeric entry. This PR shares the tactile settling curve and selects rate-limited ticks at changed draft values.

- Distinguish a draft tick from a confirmed saved value. A successful guarded planner command emits a single accepted impact. A failed command must not get success feedback.
- Reject over-capacity and under-reserved hours before committing. Show one boundary warning per gesture. Preserve the draft and retry/discard path on write failure.
- Retain visible buttons, keyboard and VoiceOver alternatives. No user should have to spin a dial dozens of times to enter a precise number.

## Crown and Week: precision navigation

[Repo] `CrownTravel` maps each 64 pt detent to exactly one week and preserves reversal. Its caps, keyboard and accessibility adjuster remain active. The optional `WeekCrownView.tactile` parameter applies new residual Snap only to Life, preserving Classic's original release easing.

- Life Crown changes pass through `LivePlanner.send`. A selection haptic is associated with an acknowledged week change, not every repeated animation frame or a speculative write.
- In Life Week, predominantly horizontal drags of at least 65 pt change the day (left = next). A diagonal/vertical scroll is not a day change. When Month is expanded the day-swipe handler yields to its explicit calendar navigation.
- Day/date taps, arrows and swipes share the same selection method, persistence and meaningful feedback. Do not bind data to animation completion.
- Completed tasks produce one confirmation after the existing `toggleTask` acknowledgment; existing Undo/task ordering flows remain authoritative.

## Compact adaptive navigation

At effective width >= 820 pt, show a persistent compact left rail for **Life, Hours and Week**. On narrow widths, retain the bottom navigation opener and slide-over sidebar. Use Glide for transitions; no duplicate top-level Tasks view. Current Crown left/right placement remains a Life-local preference. Navigation is accessible with touch and VoiceOver; the selected destination is shown independently of color.

## Feedback vocabulary

| Semantic event | Feedback | Rule |
| --- | --- | --- |
| Card or sidebar selection | Selection tick | Once per changed selection |
| Enter/exit edit | Existing edit cue | No extra pulse |
| Reveal Manage/Delete | Light/medium reveal | Once per threshold crossing |
| Hours detent | Bounded selection tick | At most once per changed draft, throttled |
| Invalid bounds | Warning | Once per gesture |
| Accepted hours/task write | Brief accepted impact | After the planner acknowledges success |
| Crown week navigation | Selection | After successful state change |

Honor existing `native.life.touchFeedback` and iPhone hardware checks. Unsupported hardware uses visual feedback. No audio, continuous buzzing, decorative spinning, reward loops or artificial repetition.

## Performance, safety and code map

Acceptance aims for smooth frame pacing at 60 Hz, and 120 Hz where supported. Real-device Instruments and cancellation tests are needed before claiming either. Test large text, VoiceOver, Reduce Motion, Increase Contrast, compact/wide and Duo hinge/rotation, 30+ tasks, rapid interruptions, and offline/relaunch preservation. Every gesture must have a tap/keyboard accessible path.

| Contract | Source |
| --- | --- |
| Animation families, original motion preserved | `ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift` |
| Pure math and tests | `ios/SpreadNativeV2/Sources/SpreadNativeV2/TactilePrecisionMath.swift`; `Tests/SpreadNativeV2Tests/TactilePrecisionTests.swift` |
| Card physics and external details | `Life/LifeWalletStack.swift`, `Life/LifeRoot.swift` |
| Hour detents and haptic guard | `Life/LifeHoursView.swift`, `Life/LifePalette.swift` |
| Day selection and Week gesture | `Life/LifeWeekView.swift` |
| Crown, reversal and optional Life easing | `Shell/WeekCrownView.swift`, `CrownTravel.swift` |

Scope is SwiftUI presentation only. No new permissions, dependencies, accounts, cloud requests, model migration, React store, or production changes. Owner approval is required before merging or distributing.
