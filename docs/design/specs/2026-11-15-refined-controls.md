# Spec: Refined controls and the Life card cycle (2026-11-15)

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).

| Field | Value |
| --- | --- |
| Request | The owner chose the refined style over system glass. Apply it to the timer, the Dynamic Island and the widget controls. On the Life card widget, keep the arrows and add an automatic cycle. |
| Surface | Native iPhone: the in-app timer sheet, the Dynamic Island, the Timer and Today widgets, and the Life cards widget. |
| Size | M. Three files change styles, one widget file changes its timeline, and the contract tests change. |
| Status | Draft. Swift compile and device checks owed. |

## 1. Decision

- **Refined, not glass.** Raised circles and capsules with a hairline edge, a soft shadow and a pressed state. They use the app's existing tokens in the app, and system colors in the widgets. System glass is not used, because CLAUDE.md rules out Liquid Glass without an owner exception.
- **Life card widget: arrows and cycle.** The arrows stay. The widget also moves to the next card by itself, one card an hour, starting from the card on screen. Home Screen widgets cannot take swipes, so the arrows remain the only manual control.

## 2. What changed

- `Theme/SpreadRefinedControlStyle.swift` (new). The app's refined control for the timer sheet. `prominent` fills it with the accent gradient for the one action that matters now. `danger` tints it red for Cancel.
- `Focus/SpreadFocusTimerSheet.swift`. Pause, Stop, Forward and Cancel use the refined style. The wide Start and Save buttons are unchanged.
- `Shell/SpreadArrowControl.swift`: the navigator and budget chips. Shipped on PR #246.
- `ios/App/SpreadWidget/SpreadTimerWidget.swift`. `WidgetRefinedControlStyle` is defined here and shared by the widgets. Pause and Resume are prominent.
- `ios/App/SpreadWidget/SpreadTodayWidget.swift`. The Dynamic Island controls use the widget style.
- `ios/App/SpreadWidget/SpreadLifeCardsWidget.swift`.
  - The arrows use the widget style.
  - Each arrow carries the card on screen (`from`). Without that, a tap after an automatic step would jump back to the saved selection.
  - The timeline has one entry per card, one hour apart, from the card on screen. The policy ends at the earlier of the cycle's end and midnight.
- `scripts/native-today-widget.test.mjs`: updated the arrow assertion and added tests for the cycle, the arrow carrying its card, and the widget style.

## 3. Rules

- Touch targets stay at 44 pt. The widget circles are 44 by 44 pt.
- No fixed white or black in the widget. The widget style uses `systemBackground`, `systemGray` and the accent.
- The cycle keeps widgets private as before. No names appear unless the existing switch is on.
- Nothing starts on its own in the focus timer. The automatic step only changes which card the widget shows, and it never changes data.

## 4. Verification

- `npm run test:scripts`: 301 passed, 0 failed, 4 skipped.
- `npm run typecheck`: clean.
- The Swift compile is the `native-typecheck` check on this PR. Not run locally.

## 5. Owed on a device

- The timer controls, the Dynamic Island and the widgets in light and dark, and with Reduce Motion.
- The cycle: how often WidgetKit actually moves the card. The system may delay it. Confirm that a tap after an automatic step lands on the next card.
- Dynamic Type at accessibility sizes on the timer controls and the Life card widget.
- VoiceOver on each icon-only control.
