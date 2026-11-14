# Specs

> Part of the Spread design brain. Start at [../README.md](../README.md).

Plans and spec sheets for Spread requests live here, one file per request, named `YYYY-MM-DD-<short-slug>.md`. Write each from [TEMPLATE.md](TEMPLATE.md) by following [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).

A spec is a plan, not approval. When its decisions land, update the governing documents and the decision log in [../DECISIONS.md](../DECISIONS.md), and mark the spec Approved or Superseded.

## Index

| Date | Spec | Status |
| --- | --- | --- |
| 2026-11-13 | [Plan Ahead and Focus Timer menu polish](2026-11-13-plan-ahead-focus-menu-polish.md) | **Implemented on review branch; not merged or device verified.** One primary Plan Ahead action, adaptive day selection, persistent confirmation, distinctive media controls, correct next-state action and collapsed optional settings. |
| 2026-11-13 | [Widget timer controls, latency and Life card navigation redesign](2026-11-13-widget-timer-controls-life-card-paging.md) | **Implemented in PR #208; awaiting build/device evidence.** Three action controls, optimistic Play/Pause, native media sheet, branded art widgets, Up/Down widget navigation and in-app swipe-up; tests and release verification remain separate. |
| 2026-11-13 | [Timer widgets, Life cards widget and continuity](2026-11-13-widgets-timer-life-cards-continuity.md) | Draft, implemented on the session branch. Focus timer widget (small, large), a timer panel on the Today widget, a Life cards widget that flips and opens the tapped card, one shared timer record, focus and break rounds that start only on a tap, Dynamic Island concepts 1, 2 and 7 (section 12), and today's planned block sized to the planned hours (section 13). The shared logic is tested; the WidgetKit and SwiftUI code is not compiled and device checks are owed. |
| 2026-11-13 | [Plan Ahead suggested plans](2026-11-13-plan-ahead-suggested-plans.md) | Draft, implemented on the session branch. Replaces the 8-week table with suggestions and adds Make a new plan. The helper is tested; the SwiftUI parts are not compiled in the app and device checks are pending. |
| 2026-11-12 | [Focus Live Activity and Dynamic Island](2026-11-12-focus-live-activity.md) | Implemented in stacked PR #189; native compilation and device evidence pending. |
| 2026-11-12 | [Read-only Today widget](2026-11-12-today-widget.md) | Implemented in stacked PR #187; App Group signing and device verification pending. |
| 2026-11-12 | [Focus Timer and local notifications](2026-11-12-focus-timer-local-notifications.md) | Implemented in stacked PR #186; native and device verification pending. |
| 2026-11-14 | [Life overdue reschedule and quick add](2026-11-14-life-overdue-and-quick-add.md) | Draft, lane W3-4 (OD26). Overdue becomes a Life count capsule that opens the existing tray, with preview, confirm and Undo. Quick add is covered by the existing Life day panel, so the unused month sheet is removed. Build checks and device checks are owed. |
| 2026-11-14 | [Finalize Spread for publish](2026-11-14-publish-finalize-plan.md) | In review. Seven parallel polish lanes (tokens, Life, planner, sheets, Focus/widgets, evidence docs, landing) using the Gray Matter app-design workflow. |
| 2026-11-12 | [Plan Ahead opens to your plans](2026-11-12-plan-ahead-plans-list.md) | Built and in review. Branch `feature/plan-ahead-plans-list`: 1 to 12 week intervals, a read-only 8-week outlook (replaced by suggested plans on 2026-11-13), set days saved with each schedule, and the Life-card day prefill. Owner decisions are in section 4. Monthly cadence is not built. Native compile (Codemagic) and device checks pending. |
| 2026-11-12 | [Plan Ahead recurring weekly budgets](2026-11-12-plan-ahead-recurrence.md) | Owner-approved interaction; implementation proposed in draft PR #181; native build and real-device QA pending. |
| 2026-11-11 | [Life: full Wallet behavior (Stack, Focus, Stack)](2026-11-11-life-wallet-parity.md) | Owner-approved for implementation on `feat/life-wallet-focus`. Not compiled or device-verified yet. |
| 2026-11-10 | [Editorial Life card implementation](2026-11-10-life-card-visual-implementation.md), [illustrated art direction](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md) | Owner-selected visual references. Implementation proposal on review branch; no native code change or merge approval. |
| 2026-11-06 | [Life on iPhone](../../life-ios/SPREAD_LIFE_IOS_SPEC.md), [implementation checklist](../../life-ios/SPREAD_LIFE_IOS_CHECKLIST.md) and [engineer handoff](../../life-ios/SPREAD_LIFE_IOS_HANDOFF.md) | Implementation merged in #146 and refinements through #158; recorded device/release acceptance still separate. Historical handoff, not a new implementation request. |
| 2026-11-06 | [Tactile Precision proposal](2026-11-06-tactile-precision.md), [motion/QA map](../tactile-precision/README.md) | Motion implementation merged in #150; device calibration and release acceptance remain unverified in the recorded evidence. |
| 2026-10-28 | [Token-efficient design docs](2026-10-28-token-efficient-docs.md) | Approved, implemented |
| 2026-10-28 | [Studio rebuild](2026-10-28-studio-rebuild.md) | Draft, four owner decisions open |
| 2026-10-28 | [Lock Screen and Home Screen widget, Live Activity later](2026-10-28-widget-live-activity.md) | Draft |
| 2026-11-03 | [Spread 2.0 native SwiftUI vertical slice](2026-11-03-spread-2-native-vertical-slice.md) | Historical exploratory slice; superseded as active implementation direction by the merged Life work. |
| 2026-11-03 | [Spread 2.0 native completion, integrated backlog](2026-11-03-spread-2-native-completion.md) | Historical implementation backlog; re-verify remaining work against current main. Release gated. |
| 2026-11-03 | [Spread 2.0 native acceptance, remaining work after PR #117](2026-11-03-spread-2-native-acceptance-remaining.md) | Historical candidate's acceptance record; do not apply its verdict to newer builds. |
| 2026-11-04 | [Week/Month: 61 owner decisions](2026-11-04-week-month-owner-decisions.md) | Owner-approved direction; opt-in UI preview, release gated |
| 2026-11-04 | [Week/Month component specification](2026-11-04-week-month-components-implementation.md) | Component source of truth for the 61 decisions; release gated |
| 2026-11-04 | [Week/Month 61-decision verification status](2026-11-04-week-month-verification.md) | Historical #139 verification snapshot; merged code does not imply final-device acceptance. |
| 2026-11-14 | [Life Week month rows and dock inset](2026-11-14-life-week-month-scroll-inset.md) | Draft; device checks owed. Fixes an empty month row and the dock overlap on Life Week. |
| 2026-11-03 | [Working-build SwiftUI parity spec (root)](../../archive/SPREAD_SWIFTUI_PARITY_SPEC.md) and [implementation instructions](../../archive/SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md) | Historical five-mode parity direction, superseded by current single Wallet/Life design. Retained for provenance. |

- [Life and Classic: shared polish and tray controls](2026-11-06-life-classic-polish.md) — shared polish contract, with both recording reviews completed.

- [Classic recording specification](2026-11-06-classic-video-spec.md) — timestamped design, motion and UI/UX reference.
- [Life recording specification](2026-11-06-life-video-spec.md) — timestamped findings, corrections and candidate acceptance.

- [Annotated iPhone precision](2026-11-06-annotated-iphone-precision.md): owner corrections for Life, Hours and Week; implementation and native evidence pending.

- [What's New shows everything the last build changed](2026-11-12-whats-new-every-update.md): every unseen note opens as one list; Swift compile and device checks owed.
