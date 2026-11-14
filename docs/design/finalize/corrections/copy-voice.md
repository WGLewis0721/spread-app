# Correction: copy vocabulary, casing and empty-state voice

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision: **resolved** (OD7, OD8, OD12, OD13 in the planning doc section 8 on branch `claude/happy-feynman-an60e6`). Application: **open**.

| Field | Value |
| --- | --- |
| Screens | N02 Spread, N03 Week, N08 Wallet Stack, N17 quick add, N21 new responsibility |
| Severity | Medium: the same action is named differently on each surface |
| Decided | OD7 role words; OD8 Details sheet title; OD12 overbooked copy; OD13 empty week |
| Still open | "To place" casing (not covered by OD7; the board uses "To place"); applying all of it in code |

## Observed on main

- **One action, three names.** The create-responsibility sheet's navigation title is "Add Life" (`Sheets/ManageSheets.swift:58`). The Classic entry says "New Spread" (`Spread/SpreadSurface.swift:303`). The Classic empty state says "Create responsibility" (`Shell/SpreadLiveRoot.swift:465`). Life's button says "Add Life" (`Life/LifeRoot.swift:368`, `:1061`).
- **The Details sheet** is titled "Manage Life area" (`Life/LifeManagementSheets.swift:96`). Two UI tests assert that title (`LifeUITests.swift:146`, `LifeEditorialPersonalPreviewUITests.swift:306`).
- **Casing.** "To place" appears in the tray and its accessibility label. "To Place" appears in `Week/WeekFocusSurface.swift:421`, which is unreachable (see life-routing).
- **Empty states.** "Make room for what matters" (Classic) and "Nothing to do here yet." (Life, `Life/LifeWalletStack.swift:294`) use different voices. This is a copy question, not a missing state.

## Decided by the planning doc (section 8)

- **OD7.** Life uses "Life area". Classic uses "responsibility". The word "spread" never names a role, because Spread is the app's name. Shell confirmations (lane A), Classic (lane C) and the sheets (lane D) apply it.
- **OD8.** The focused card's Details button opens a sheet titled "Details". The two UI tests that assert "Manage Life area" change with it (lane B).
- **OD12.** Overbooked warning: "These hours don't fit in your week. Remove some or raise your weekly hours." (lane C)
- **OD13.** Empty week: when "Nothing planned this week" shows, the day cards do not repeat "Nothing planned" (lane C).

## Expected

One action name for each role type, using OD7 words. The Details title per OD8. "To place" everywhere, per the brand board. Empty states keep their meaning. The landing copy is unchanged by this record.

## Affected files (applied by lanes A to D; landing copy is lane E and unchanged)

- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift` (lane D)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Spread/SpreadSurface.swift`, `ResponsibilitySidebar.swift` (lane C)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift` (lane A)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRoot.swift`, `LifeManagementSheets.swift`, `LifeWalletStack.swift` (lane B)
- `ios/App/SpreadNativeUITests/LifeUITests.swift`, `LifeEditorialPersonalPreviewUITests.swift` (lane B, OD8)

## Safe corrective plan

1. Each lane applies its own strings in one PR and lists them.
2. Choose the exact label for "create" in each root (for example "New responsibility" in Classic and "Add Life area" in Life). OD7 fixes the nouns, not the verb, so the lane PR states the wording and the reason.
3. "To place" everywhere, per the board. This is a casing decision that needs a line in the lane PR.

## Before and after evidence

Not available for native copy: no device run. The landing copy is unchanged.

## Regression scenarios

- Creating a responsibility from each entry point shows the same title.
- The Details sheet title is "Details", and the two UI tests pass with it.
- VoiceOver reads the same label as the visible text.
- A grep for "New Spread", "Add Life" and "Manage Life area" finds no stale string.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the lane's copy commit. No data or behavior changes.
