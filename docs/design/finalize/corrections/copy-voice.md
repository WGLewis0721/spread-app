# Correction: copy vocabulary, casing and empty-state voice

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision: **resolved** (OD7, OD8, OD12, OD13, OD22 in the planning doc section 8 on branch `claude/happy-feynman-an60e6`). Application: **open** in lanes A, C and D.

| Field | Value |
| --- | --- |
| Screens | N02 Spread, N03 Week, N08 Wallet Stack, N17 quick add, N21 new responsibility |
| Severity | Medium: the same action is named differently on each surface |
| Decided | OD7 role words; OD8 Details title; OD12 overbooked copy; OD13 empty week; OD22 creation and empty-state voice |
| Still open | Applying every string in code. The code on main still has the old wording. |

## Observed on main

- **One action, three names.** The create-responsibility sheet's navigation title is "Add Life" (`Sheets/ManageSheets.swift:58`). The Classic entry says "New Spread" (`Spread/SpreadSurface.swift:303`). The Classic empty state says "Create responsibility" (`Shell/SpreadLiveRoot.swift:465`). Life's button says "Add Life" (`Life/LifeRoot.swift:368`, `:1061`).
- **The Details sheet** is titled "Manage Life area" (`Life/LifeManagementSheets.swift:96`). Two UI tests assert that title (`LifeUITests.swift:146`, `LifeEditorialPersonalPreviewUITests.swift:306`).
- **Casing.** "To place" appears in the tray and its accessibility label. "To Place" appears in `Week/WeekFocusSurface.swift:421`, which is unreachable and goes in wave 2 with OD19.
- **Empty states.** Classic: "Make room for what matters" with an action. Life: "Nothing to do here yet." (`Life/LifeWalletStack.swift:294`), with no heading and no action.

## Decided by the planning doc (section 8)

- **OD7.** Life uses "Life area". Classic uses "responsibility". "Spread" never names a role.
- **OD8.** The focused card's Details button opens a sheet titled "Details". The two UI tests that assert "Manage Life area" change with it (lane B).
- **OD12.** Overbooked warning: "These hours don't fit in your week. Remove some or raise your weekly hours." (lane C)
- **OD13.** Empty week: when "Nothing planned this week" shows, the day cards do not repeat "Nothing planned" (lane C).
- **OD22.** Life's creation action is "Add Life". Classic's is "Add responsibility", replacing "New Spread" and "Create responsibility". Always "To place". Empty states are a short heading, one plain sentence, then the action. Shell empty plan (lane A); Spread and sidebar (lane C); sheet title (lane D).

## Expected

Life: "Add Life", "Life area", "Details". Classic: "Add responsibility", "responsibility". "To place" everywhere. Empty states follow OD22. The landing copy is unchanged by this record.

## Affected files (applied by lanes A, C, D, B)

- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift` (lane D: sheet title)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Spread/SpreadSurface.swift`, `ResponsibilitySidebar.swift` (lane C)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift` (lane A: empty plan)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRoot.swift`, `LifeManagementSheets.swift`, `LifeWalletStack.swift` (lane B)
- `ios/App/SpreadNativeUITests/LifeUITests.swift`, `LifeEditorialPersonalPreviewUITests.swift` (lane B, OD8)

## Safe corrective plan

1. Each lane applies its own strings in one PR and lists them.
2. Use the OD22 wording exactly: "Add Life" in Life, "Add responsibility" in Classic.
3. Empty states follow the OD22 shape. Life's "Nothing to do here yet." becomes a heading, one sentence and the action.
4. Grep for stale strings in the lane PR: "New Spread", "Create responsibility", "Manage Life area", "To Place".

## Before and after evidence

Not available for native copy: no device run. The landing copy is unchanged.

## Regression scenarios

- Creating a responsibility from each entry point shows the same title for that root.
- The Details sheet title is "Details", and the two UI tests pass with it.
- VoiceOver reads the same label as the visible text.
- The grep in step 4 finds no stale string.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the lane's copy commit. No data or behavior changes.
