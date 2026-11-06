# Animation tuning guide: sources, decisions and implementation

> Part of the [Spread design brain](../README.md). Start at the [Tactile Precision map](README.md); read [motion contract](MOTION_CONTRACT.md) and [verification](VERIFICATION.md).
>
> Summary: Audited the 20 animation suggestions in the owner's November 6 screenshot against Apple SwiftUI guidance, public animation libraries and Spread's current native code. These are **heuristics**, not mandatory effects. The complete native app is the implementation and refinement environment. No isolated prototypes.

## Source quality and transfer

- **Primary iOS guidance:** [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) explains purposeful animation, reduced motion, and allowing users to interrupt. [Apple SwiftUI Animations](https://developer.apple.com/documentation/swiftui/animations) and [spring(response:dampingFraction:blendDuration:)](https://developer.apple.com/documentation/swiftui/animation/spring%28response%3Adampingfraction%3Ablendduration%3A%29) describe state-driven, velocity-preserving springs and transitions.
- **Cross-platform design references:** [animation-principles/universal-patterns](https://github.com/dylantarre/animation-principles/blob/main/docs/05-by-animation-type/universal-patterns.md) and [micro-interactions](https://github.com/dylantarre/animation-principles/blob/main/docs/01-by-domain/micro-interactions.md) give example easing, durations and staging, not Apple requirements. [Motion React layout animations](https://motion.dev/docs/react-layout-animations) demonstrates shared-element identity and crossfades; [AnimatePresence](https://motion.dev/docs/react-animate-presence) documents distinct entrances/exits.
- **SwiftUI equivalent:** Keep identity with stable `ForEach` IDs; use SwiftUI `withAnimation`, `AnyTransition`, `matchedGeometryEffect` where justified, and native feedback. Do **not** import Motion/Framer Motion into the SwiftUI planner.
- **Social screenshot:** The creator's 20-item list is a user-supplied inspiration reference. Its numerical suggestions are not a verified universal performance standard.

## Twenty ideas mapped to Spread

| # | Technique from screenshot | Decision in Spread |
| ---: | --- | --- |
| 1 | Ease-out for entrances | **Adopted:** `SpreadTactile.enter` uses 220 ms ease-out, only for appropriate entering UI. |
| 2 | Dropdowns at 150–250 ms | **Adopted for Life navigation:** 220 ms entry, 180 ms exit; native system menus retain platform defaults. |
| 3 | Stagger list rows by 30 ms | **Adopted:** `SpreadEntrance` uses a capped 30 ms stagger, at most 210 ms delay. |
| 4 | Scale to 0.97 on press | **Adopted:** shared `SpreadPressStyle` compresses to 0.97 immediately, settles on release. |
| 5 | Stretch moving knobs by 12% | **Conditional:** only if a specific draggable Hours control benefits, and without false hour/detent changes. Not globally applied. |
| 6 | Stagger as details settle | **Limited:** field and card use shared settle motion; avoid delayed task hit targets or hidden controls. |
| 7 | Arcs for object movement | **Existing by context:** Hours orbit uses real circular geometry. Do not curve ordinary list or sidebar movement. |
| 8 | Pulse to confirm success | **Rejected as blanket behavior:** existing post-acknowledgment task feedback and accessible status are clearer. No looping reward pulse. |
| 9 | Ease-in-out for moves | **Existing:** `SpreadMotion` curves for longer layout travel; tactile springs apply to interruptible gestures. |
| 10 | Start popovers at 0.95 | **Conditional:** native sheets/menus should use system behavior; no forced scaling without reference parity. |
| 11 | Enter from the trigger | **Adopted:** Life navigation enters from its anchored side with a gentle fade, rather than appearing in place. |
| 12 | Exit to the trigger | **Adopted for sidebar:** matching side exit and fade; other modals retain native conventions. |
| 13 | No bounce on everyday UI | **Policy:** routine entry/exit is critically damped/eased, not an exaggerated elastic animation. |
| 14 | Do not tween while held | **Existing and reinforced:** direct finger tracking is unanimated; snap only on release. |
| 15 | Make exits 20% shorter | **Adopted where controlled:** 180 ms exit versus 220 ms entry; preserve a11y and interrupted action. |
| 16 | Overlap old and new states | **Adopted carefully:** role details get stable identity and asymmetric reveal so focus changes retain context. |
| 17 | Masks for reveals and color | **Conditional:** clip where it protects card geometry; avoid expensive full-screen masking and contrast regressions. |
| 18 | Crossfade icons and blur | **Selective:** crossfade details and icon state as needed. Avoid large-area live blur on older iPhones. |
| 19 | Rubber-band past bounds | **Conditional:** never permit invalid Hours or destructive actions; limit overscroll and announce boundaries. |
| 20 | Reuse same layoutId | **Existing SwiftUI concept:** stable role IDs, shared Wallet face and Week/Month matched geometry, rather than importing React `layoutId`. |

## Native change map for this tuning pass

| File | Change | Protected behavior |
| --- | --- | --- |
| `ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift` | Add 220 ms enter / 180 ms exit semantic animations; press scale 0.97; 30 ms bounded entrance staggering | Other `SpreadMotion` tokens and stored state unchanged |
| `ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRoot.swift` | Selected Life detail field uses stable role identity and asymmetric fade/offset; navigation enters/exits from its rail side | Classic/More, planner authority and gestures unchanged |
| `ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeWeekView.swift` | Week role-detail field similarly transitions between real role identities | Scheduling and Hours unchanged |

## Gates and constraints

- **No isolated prototype.** Implement full scoped behavior in the actual app, run automated/device checks, then tune in the implementation branch.
- **Baseline:** Do not replace the approved Life reference or retime its fixed interactions without equivalent captured evidence. Capture paired before/after on identical tasks/profile.
- **Accessibility:** Reduce Motion removes spatial movement, support Dynamic Type/VoiceOver, never make text unreadable mid-transition. Keep visual status even without haptic hardware.
- **Responsiveness:** Touch response should begin on the next frame. Animate `transform`/opacity when practical; avoid repeating wide-area blurs, unnecessary stagger or large scale deltas.
- **State safety:** No write from animation callbacks. A task success cue must follow accepted planner state. No animated gesture changes reserved hours without validation.
- **Verification:** Run typecheck, app tests, docs check, native build and device journeys. For unrun tests, report that plainly; merge/release remains an explicit owner decision.
