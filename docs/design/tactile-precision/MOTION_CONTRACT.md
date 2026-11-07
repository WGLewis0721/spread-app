# Motion and interaction contract

> Part of the [Spread design brain](../README.md). [Folder map](README.md) | [Dated proposal](../specs/2026-11-06-tactile-precision.md) | [Verification](VERIFICATION.md)
>
> Summary: Proposed Glide / Snap / Settle primitives used across native Life, Hours, Week, Wallet, sidebar, Crown and tasks. Retain approved visual identity, existing planner data and the frozen Life reference. Numbers below are initial in-app calibration targets, not accepted shipping values.

## 1. Motion grammar

| Primitive | Input/output contract | Where used |
| --- | --- | --- |
| **Glide** | The manipulated surface tracks the active finger without a scripted delay. On release, use measured gesture velocity only when it improves predictability; bound travel to the next meaningful stop. | Week swipes, card reveals, navigation tray |
| **Snap** | A discrete value or destination changes at an explicit threshold, with one selection cue. No phantom ticks while idle, and no haptic on rejected changes. | Crown/week changes, half-hour increments, sidebar selection |
| **Settle** | A moved surface lands on a deterministic resting state with a damped, interruptible spring. Direction changes preserve continuity rather than jumping to an animation's first frame. | Wallet selection, separate detail field, task reorder |

Rule: touching a moving control immediately redirects it. No transition blocks later taps, and no decorative animation owns the planner's stored state. Every interaction has an explicit rest position, threshold and cancellation behavior. Move geometry; do not animate text width or reflow every frame.

### Calibration, not a replacement

[Repo] Current SpreadMotion in Theme/SpreadTheme.swift uses a 0.32/0.72/0/1 timing curve, including curve 420 ms, press 160 ms, weekSlide 340 ms, and sheetSettle 460 ms. Life currently uses these. Preserve them until comparison evidence demonstrates an improvement.

| Interaction | Candidate perceived settle time | Conditions |
| --- | --- | --- |
| Touch pressed state | Next render opportunity, with no artificial delay | Immediately reversible |
| Short selection Snap | 100–160 ms | Threshold committed; one cue |
| Sidebar Glide/Settle | 180–240 ms | May be longer for spatial clarity |
| Wallet card Settle | 220–300 ms | Same face identity/width throughout |
| Separate detail field reveal | 220–300 ms | Never hides first actionable item |
| Task confirmation | 120–180 ms | Only after the accepted mutation |
| Week gesture | Track finger continuously; 180–280 ms release settle | At most one intended adjacent unit per discrete gesture unless existing approved navigation says otherwise |

[Rec] Prefer tuned native spring behavior with velocity continuity. Do not replace every existing curve with a spring wholesale. Compare current and candidate settings on an actual device and keep the faster option only if precision, readability and interruption improve.

## 2. Wallet: identity and separation

- Responsibility cards are identity surfaces, with persisted color, icon, name and allocated hours. Closed cards overlap at full width, respecting the current native brand board and Chalkboard art.
- Tap selected card to collapse; tap another to change focus. A focused face keeps its geometry stable. Details occupy their own neutral field **below** the card: weekly hours, tasks, Quick Add, manage actions. The details field is not painted inside the card face.
- Transition order: touch press -> selected role changes in view state -> card moves/settles -> related details cross-fade/reveal. The details field tracks selection without becoming an independent data owner.
- Sibling behavior is **not approved for change**. The current LifeWalletStack hides other cards during focus; the previous conceptual proposal kept them peeking. Preserve the frozen approved Life demo; compare the full native implementation with that baseline and obtain explicit owner sign-off before changing sibling visibility.
- Swipe actions preserve the current directional contract and explicit reveal. Only the explicit Edit button activates editing; tapping or long-pressing a card cannot enter it. Never render Manage/Delete behind a resting card, even when the face is translucent. Reveal actions only during an edit-mode horizontal swipe; keep named accessibility actions available inside Edit mode as a non-gesture alternative. Drag during editing only; require confirmation for deletion and accessible actions as substitutes. A partially revealed card resolves to closed or exactly one action rest state; no in-between stuck state.
- Avoid nested scrolling in the details field. Let the main view scroll vertically, preserving selected role, scroll position and Dynamic Type legibility.

[Repo] LifeWalletStack.swift already owns the selectable stack; LifeRoot.swift currently draws the separate details field. This document is a polish contract, not a request for a second stack.

## 3. Compact sidebar and Crown

- Sidebar is **navigation between existing Life/Responsibilities, Hours and Week**, not another task inbox. Reuse the existing Life navigation overlay or ResponsibilitySidebar architecture as appropriate, rather than creating a competing fixed rail.
- Compact widths: trigger >=44 pt and overlay that dismisses on selection, backdrop tap or explicit Close. Wide widths: a persistent, collapsible rail may be considered if it improves content width. Base the choice on usable width and safe areas, not device marketing names.
- The selected destination remains identifiable without relying on color. Sidebar opening must not rewrite tasks, allocations, focused role or selected date.
- Crown remains the mechanism for moving week/month focus and Today, with its existing metallic identity and left/right positioning behavior. One discrete week change -> one visual detent and at most one haptic event. Do not map a continuous spin directly into dozens of unsolicited persisted writes.
- Crown, sidebar, day-strip and task drag must occupy distinct gesture hit zones. Provide chevrons, buttons, VoiceOver adjustable actions and keyboard alternatives.

## 4. Hours: mechanical detents, honest capacity

- Retain the Life Hours circle/orbit and its existing counterclockwise/clockwise semantics. One approved 15-degree dial step changes 0.5 hour; vertical capacity flick changes one hour. Do not reverse the gesture to imitate a physical gadget.
- While dragging, display a draft. Each valid half-hour crossing may produce a light, rate-limited selection cue. On release, validate against planner limits and commit once through the existing authoritative store. An accepted store acknowledgment gets one distinct confirmation; a rejection restores or explains the previous value.
- Do not provide haptics at every rendered frame. Preserve LifeHoursView.swift's existing cue throttle as the starting reference and test whether its 125 ms interval feels correct.
- Support direct numeric entry, plus/minus controls and VoiceOver adjustable actions. Tactile play is never required to do work. No invented default planning capacity for real users.
- Display weekly capacity, allocated hours and remaining flexibility from the same snapshot. Never infer unused capacity from task completion or double-count a fixed commitment.

## 5. Week, tasks and reorder

- Week/day: horizontal gestures track direction and release velocity, but vertical scrolling always wins where vertical intent is dominant. Week strips, day content, Crown and card-reveal zones must not fight for one gesture. Do not replace approved week/day/Month mappings.
- Task completion: pressed-state contact cue; pending state if the store is busy; single success haptic and quick visual settle only when the mutation succeeds. On failure, restore task presentation and announce error. Completion does not reduce allocated hours.
- Reorder: long-press lift with minimal displacement, surrounding tasks make room, item snaps into its new index after accepted operation. Do not silently invent task-order persistence that is not supported by the current model.
- Destructive actions: reveal -> label -> confirmation -> store action -> Undo where supported. No swipe-to-delete without a reviewable action. Keep To Place, Overdue and Recently Deleted semantics under the existing Week/Month specs.

## 6. Haptic vocabulary

| Cue | Native starting behavior | Event | Do not do |
| --- | --- | --- | --- |
| Contact | Light/soft selection | Focused card selection, meaningful nav choice | Buzz on incidental scroll or initial render |
| Detent | Short selection tick | Crown crosses one accepted step; valid Hours draft increment | Tick on every pixel or frame |
| Boundary | Single warning, rate-limited | Hours limit or rejected destination | Repeat warning continuously at the limit |
| Reveal | Light/medium impact | Manage/Delete action crosses reveal threshold | Pulse on both threshold directions repeatedly |
| Accepted | Light success confirmation | Store-acknowledged task/hour commit | Announce success on optimistic failure |
| Edit | Existing edit-mode cue | Enter/leave editable state | Compete with continuous animation |

[Repo] LifeFeedback, SpreadHaptics and LifeHoursView already contain haptic paths. Inventory these before consolidation to prevent duplicate pulses. Haptics must be optional, respect system capabilities, and pair with visible/accessibility feedback. No claims about exact vibration waveform without physical measurement.

## 7. Accessibility, physics and state safety

- Respect Reduce Motion: replace spatial travel with instant state changes and minimal opacity where useful; no looping pulse. Respect Reduce Transparency, Increase Contrast, Dynamic Type, VoiceOver reading order and 44-pt touch targets.
- Repeated and interrupted interactions resolve deterministically. Mid-gesture rotation, background/foreground, profile switch, long task lists, and opening a sheet must never leave stuck offsets or lost selections.
- Stop active gesture cues when the scene becomes inactive. Never attach planner mutations to animation completion, animation frames or transient drag translations.
- Do not change the planner schema, cloud features, profile storage, default hour semantics, task eligibility or scheduling rules for visual polish. Any new persisted ordering or capacity change requires a separate, approved data-engine spec.
- No new fonts, gradients, palette, assets, dependencies, remote telemetry or compulsive reward mechanics. The app should feel enjoyable to use, not incentivize aimless interaction.

### November 6 integrated Life repair calibration

- **Hour editing after creation:** Life card -> Change area hours preserves that role selection in Hours, opens its controls, and explains capacity restrictions. Manage also presents a bounded half-hour control and explicit saved confirmation.
- **Swipe reveal:** Action layer remains structurally stable during a gesture, but must be transparent and noninteractive at rest. The gesture attaches to the card container; an edit-mode horizontal swipe is the only visible Manage/Delete entry. No duplicate actions in the detail field.
- **Glow:** Historical Nov 6 calibration was +50% for Life and Classic. **Superseded for Life only:** increase the merged Life Edit halo's peak stroke width and glow radius by a further **75%** with a clearly differentiated dim/bright phase. Opacity already near 1.0 must be capped, not multiplied beyond 1; keep the pulse outside the card-face clip and stationary geometry. Reduce Motion uses a static bright outline; never pulse haptics.
- **Orbit:** With no area selected, rotate colored weekly capacity arcs at 22.5 degrees/sec (16-sec revolution) with bounded color glow. Selection/separation, Reduce Motion or inactive scene pauses movement.
- **Tray:** Open/close with shared Glide from its actual edge. Finger-following horizontal dismissal uses a bounded threshold with vertical scroll priority and an interruptible Settle back to open.

### November 6 owner calibration — 25% more perceptible tactile motion

**Current integrated candidate on PR #156.** Scale the shared *animation response/duration, visual displacement and emphasis* by **1.25× relative to the previously implemented settings**. These are calibration values for native device testing, not a reason to delay touch feedback. Do **not** multiply gesture thresholds, detent increments, confirmed planner values, haptic event counts or store writes.

| Mechanism | Previous | Current (1.25×) |
| --- | ---: | ---: |
| Contact animation duration | 100 ms | 125 ms; finger-down press state still immediate |
| Magnetic Snap spring response | 220 ms | **275 ms** |
| Wallet/task Settle response | 320 ms | **400 ms** |
| Sidebar/week Glide response | 280 ms | **350 ms** |
| Trigger-linked enter / exit | 220 / 180 ms | **275 / 225 ms** |
| Press compression | 3% | **3.75%** (scale 0.9625) |
| Press opacity reduction | 12% | **15%** (opacity 0.85) |
| Detail entrance vertical distance | 8 pt | **10 pt** |
| List entrance distance | 10 pt | **12.5 pt** |
| List stagger / delay ceiling | 30 / 210 ms | **37.5 / 262.5 ms** |
| Hours arc angular speed | 18°/s | **22.5°/s**, a full revolution in 16 seconds |
| Classic edit pulse duration | 1.30 s | **1.625 s** |
| Life edit pulse duration | 1.35 s | **1.6875 s** |

Shadow spread, existing orbit glows and Classic edit highlights gain up to 25% visual emphasis, capped at valid opacity values. Do not exceed alpha 1.0 or enlarge card geometry or tap targets. Existing spring damping fractions are unchanged to prevent additional bounce. Animations remain interruptible and Reduce Motion keeps nonspatial, legible state feedback. Device performance, haptic synchronization and complete native journeys **must be verified** before release.

### November 6 Life-only Edit pulse visibility repair — 75% above merged baseline

The earlier Life glow was drawn **inside** the card face, then covered by the stable Wallet card clip. Increasing an already near-opaque shadow did not make its external halo visible. The updated Life implementation attaches an outward-visible stroke and two bounded role-color shadows **after** the card's clip, and enlarges the Edit-mode stack clip just enough to admit the bloom while keeping non-Edit focus clipping unchanged.

| Visual token | Previous merged Life | Revised peak |
| --- | ---: | ---: |
| Edit outline width | 3.125 pt | **5.46875 pt (+75%)** |
| Outer halo radius | 22.5 pt | **39.375 pt (+75%)** |
| Outer halo alpha | 0.975 | **1.0 (saturated)** |
| Resting halo alpha | 0.30 | **0.525 (+75%)** |
| Breathing duration | 1.6875 s per half-cycle | **unchanged** |

The low phase has a narrow outline and compact shadow. The peak has a wider rim and larger halo; both are positioned with the swiping card rather than an empty slot. No new panel, overlay control, vibration loop, scale change, task mutation, or extra animation is introduced. The only trigger remains the **Edit** button. Leaving Edit removes the effect. Physical-device video is required to confirm that all role colors visibly breathe and that layered cards and long names remain legible.
