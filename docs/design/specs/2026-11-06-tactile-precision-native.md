# Spec: Native Life tactile precision

> Part of the [Spread design brain](../README.md). Follows [the spec protocol](../PLAN_SPEC_PROTOCOL.md), the [Life iOS handoff](../../../SPREAD_LIFE_IOS_HANDOFF.md) and [dedicated design folder](../tactile-precision/README.md).

| | |
| --- | --- |
| Request | Fully build fidget-inspired tactile motion, Wallet, Hours, Crown, Week and compact sidebar into the actual app |
| Restated | Make useful Life planning actions predictably physical without changing Classic, More or planner data |
| Surface | Opt-in native Life, iPhone/iPad/Duo |
| Size | L |
| Author | ChatGPT, November 6, 2026 |
| Status | Feature PR implementation; full device acceptance unverified |
| Governing docs read | `SPREAD_LIFE_IOS_SPEC.md`, `SPREAD_LIFE_IOS_HANDOFF.md`, `docs/design/README.md`, `planner/SPREAD_NATIVE_BRAND_BOARD.md`, `RULES_CARD.md` |

## 1. Problem
An adult balancing Life areas, hours and weeks cannot trust an interface where cards, swipes and confirmations respond with unrelated physics or delays. The planner should feel coherent and precise.

## 2. Evidence and context
[Repo] Main `86023907` already supplies native Wallet cards with external details, Hours orbit, Crown detents, editable task rows, local haptic setting and sidebar overlay. The approved Life reference is frozen. Physical-device evidence is still owed.

## 3. Goals, non-goals and budget
Goals: one Glide/Snap/Settle vocabulary, reliable card thresholds, meaningful hour ticks, day swipe axis control, adaptive compact rail, preserved accessible paths. Non-goals: physics engine, decorative play, a new dashboard, data migrations, React redesign or another prototype. Appetite: one focused feature PR with QA before release.

## 4. Rules that apply and exceptions needed
`RULES_CARD.md` forbids a second store and nonessential UI decoration; `SPREAD_LIFE_IOS_SPEC.md` requires preserving More/Settings and Classic, real data, approved demo appearance and offline behavior; the native brand board and iOS 27 audit govern tokens and device acceptance. **Exceptions needed: none** for Life-scoped work; changing Classic motion requires separate authorization.

## 5. Options and the chosen concept
A: independent springs for each control (cheap, inconsistent). B: shared native physics family applied to existing components (chosen, coherent). C: custom physics/rendering engine (rejected: complex, high risk). The breadboard remains Life Wallet → separate detail field; Hours → draft → guarded commit; Week → day/task; compact rail/overlay → destination; Crown → week. Empty, error, offline, rejected write and undo continue through existing flows.

## 6. Platform behavior
Layout uses available width, not device names. Test standard iPhone, iPad and Duo configurations, Dynamic Type, VoiceOver, Reduce Motion, Increase Contrast, keyboard and 44 pt targets. A swipe cannot steal a vertical scroll or task drag.

## 7. Technical approach
Shared `SpreadTactile` in native theme, `TactilePrecisionMath` pure logic and XCTest; targeted Life/Hours/Week/Crown updates; store remains authoritative. Classic easing is preserved via the optional Life-only Crown parameter. See [full contract](../tactile-precision/MOTION_SPEC.md).

## 8. Risks, rabbit holes and open questions
Risk: animation feel can only be confirmed on a device; default is no release until recorded. Risk: haptic floods; default is one semantic event and throttle. Risk: day/scroll gesture collisions; default is horizontal threshold and actual regression tests. Owner may authorize retuning after evidence, not unreviewed physics changes.

## 9. Verification and prototype plan
No isolated prototype. Test on the actual opt-in native Life mode with real disposable-plan data, compare the frozen visual reference, and capture hardware interaction evidence. Three testing questions: Does it respond immediately? Does it settle predictably? Is any interaction confusing or exhausting? Use [acceptance register](../tactile-precision/ACCEPTANCE.md).

## 10. Rollout, rollback and release
Work in `feature/life-tactile-precision-20261106`, PR against `main`. No merge/deploy/signing without owner authorization. Revert the UI feature commits if behavior regresses. Planner data and Classic are not migrated.

## 11. Decision record
2026-11-06, owner requested full in-app implementation, not an isolated prototype. Documentation and code integration are in this PR; device parity cannot be claimed without evidence.
