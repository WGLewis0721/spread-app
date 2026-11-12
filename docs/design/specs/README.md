# Specs

> Part of the Spread design brain. Start at [../README.md](../README.md).

Plans and spec sheets for Spread requests live here, one file per request, named `YYYY-MM-DD-<short-slug>.md`. Write each from [TEMPLATE.md](TEMPLATE.md) by following [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).

A spec is a plan, not approval. When its decisions land, update the governing documents and the decision log in [../DECISIONS.md](../DECISIONS.md), and mark the spec Approved or Superseded.

## Index

| Date | Spec | Status |
| --- | --- | --- |
| 2026-11-12 | [Plan Ahead opens to your plans](2026-11-12-plan-ahead-plans-list.md) | In review. Branch `feature/plan-ahead-plans-list`; native compile and device checks pending. Preferred day, monthly cadence and 8-week outlook are open exceptions. |
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
| 2026-11-03 | [Working-build SwiftUI parity spec (root)](../../archive/SPREAD_SWIFTUI_PARITY_SPEC.md) and [implementation instructions](../../archive/SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md) | Historical five-mode parity direction, superseded by current single Wallet/Life design. Retained for provenance. |

- [Life and Classic: shared polish and tray controls](2026-11-06-life-classic-polish.md) — shared polish contract, with both recording reviews completed.

- [Classic recording specification](2026-11-06-classic-video-spec.md) — timestamped design, motion and UI/UX reference.
- [Life recording specification](2026-11-06-life-video-spec.md) — timestamped findings, corrections and candidate acceptance.

- [Annotated iPhone precision](2026-11-06-annotated-iphone-precision.md): owner corrections for Life, Hours and Week; implementation and native evidence pending.
