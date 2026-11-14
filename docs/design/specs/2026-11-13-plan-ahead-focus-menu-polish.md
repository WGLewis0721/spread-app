# Plan Ahead and Focus Timer menu polish — 2026-11-13

> Part of the [Spread design brain](../README.md). Scope: native SwiftUI menus only. Implementation is on a review branch, **not merged or device verified**.

## Goal and evidence

Make the two existing sheets feel coherent, purposeful and readable without changing any planning or timer semantics. Inspected native baseline `9248935cd867a6e5eb10e7ee079b376848ab3177`.

- **Plan Ahead**: two equally prominent entry actions, long review forms with off-screen confirmation, fourteen potential weekday toggle/stepper rows and rows that may collide when text grows. [Source](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifePlanAheadSheet.swift); [recurrence](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRecurringPlanForm.swift).
- **Focus Timer**: Play/Forward vs Stop/Cancel share equal emphasis, finished round has two actions with the same effect, settings exposed alongside the main countdown. [Source](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimerSheet.swift).

## Gray Matter exact references

| Source (pinned Gray Matter commit `8871c859`) | Applied rule |
| --- | --- |
| [UX_REVIEW_AND_SPEC_PROTOCOL.md lines 7–17](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/UX_REVIEW_AND_SPEC_PROTOCOL.md#L7-L17) | One primary action, visible hierarchy, adequate scale and repeated UI grammar |
| [UX_REVIEW_AND_SPEC_PROTOCOL.md lines 19–32](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/UX_REVIEW_AND_SPEC_PROTOCOL.md#L19-L32) | Reduce simultaneous choices; group controls; distinguish progress and outcomes |
| [DESIGN_SYSTEM.md lines 27–32, 45–59](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/DESIGN_SYSTEM.md#L25-L59) | 4/8pt modular rhythm, safe areas, selected/loading/disabled/VoiceOver/Dynamic Type states |
| [IOS_PLAYBOOK.md lines 11–27](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/IOS_PLAYBOOK.md#L11-L27) | Native sections and controls, one authoritative store, actual hardware evidence |
| [TACTILE_MOTION_AND_DEVICE_QA.md lines 15–19](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/TACTILE_MOTION_AND_DEVICE_QA.md#L15-L19) | Immediate response and real accepted state, not purely decorative motion |

Local authority: [RULES_CARD.md lines 12–33](../RULES_CARD.md), [UI_KIT.md lines 53–87 and 123–138](../ui-kit/UI_KIT.md), native [brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md). Apple native patterns: [SwiftUI Form](https://developer.apple.com/documentation/swiftui/form), [DisclosureGroup](https://developer.apple.com/documentation/swiftui/disclosuregroup), [ViewThatFits](https://developer.apple.com/documentation/swiftui/viewthatfits) and [accessibility](https://developer.apple.com/documentation/accessibility).

## Implemented layout

**Plan Ahead**: Make a new plan stays first and the sole prominent entry; existing and suggested plans follow, then Copy Week and Move Hours share a low-emphasis “Other ways to plan” section. Weekly day selection uses a scalable compact chip grid, actual selected-hours summary and optional disclosure of per-day steppers. Repeating, copying and moving use a persistent bottom **Review → Confirm** button, gated by the same authoritative preview states. Long dates/status values stack rather than overlap; unloaded reviews explain the next step. No new recurrence rules, copied data or shortcuts around preview/confirm.

**Focus Timer**: Live countdown is the focal point. Pause/Play and Forward are grouped and Stop/Cancel are separated, with Cancel in danger tint, every action retaining a 44pt minimum content target. When a round is finished, only **one Start Next** action plus Cancel is displayed—no duplicate Forward with identical behavior. If today's planned block is available, it gets the primary surface; custom focus is one disclosure away. When no block is available, custom setup is visible. Display/notification/privacy switches sit in their own collapsed disclosure. The timer remains independent of scheduled hours and task status.

**No changes** to `SpreadFocusMachine`, App Group persistence, timer intents, recurrence engine, planner store, capacity calculations, widget controls, Live Activity rules, privacy defaults, app branding, or production release pipeline.

## Acceptance and release gates

1. On Plan Ahead entry, **exactly one** prominent action is visible; Copy and Move are accessible, not emphasized equally. Existing plans and suggestions remain reachable.
2. Day chip taps toggle only the expected weekday; selected values and the weekly sum are correct. Day-hour steppers are reachable via an explicit disclosure. Dynamic Type scales chip widths and previews stack.
3. Repeating, copying and one-time moving still **preview, validate, confirm**, preserve existing customized weeks and support Undo according to existing rules. Action stays accessible near the safe area; failed preview does not become a save.
4. Active timer: Pause/Resume and Forward remain distinct, with separate Stop and Cancel semantics. Finished round: one next-step action; no automatic break and no duplicate button.
5. Planned block and custom focus both remain available. Collapsed outside-app settings still allow toggles and respect running-session name restrictions and iOS notification permission.
6. Run native type-check, scripting regression checks, Swift tests, App Store preflight; review iPhone 320/390/430 width, Dynamic Type, light/dark, VoiceOver, keyboard, break/round/last-round and failure states. Physical device and TestFlight layout are **unverified until screenshots/evidence exist**.

Rollback: revert the one menu-polish PR. This is UI-only, no user-data migration. **Do not merge or deploy without owner authorization.**
