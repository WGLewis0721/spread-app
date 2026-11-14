# Correction: copy vocabulary, casing and empty-state voice

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision owner: **owner** (vocabulary).

| Field | Value |
| --- | --- |
| Screens | N02 Spread, N03 Week, N08 Wallet Stack, N17 quick add, N21 new responsibility |
| Severity | Medium: the same action is named differently on each surface |
| Owner decision needed | One name for creating a responsibility, and one noun for the entity |

## Observed

- **One sheet, three names.** `NewSpreadSheet` is titled "Add Life" (`Sheets/ManageSheets.swift:58`). The Classic entry button says "New Spread" (`Spread/SpreadSurface.swift:303`). The Classic empty state says "Create responsibility" (`Shell/SpreadLiveRoot.swift`, `emptyPlan`). Life's button says "Add Life" (`Life/LifeRoot.swift:368`, `:1061`).
- **Three nouns.** "responsibility" (the brand board's term), "spread" (the `RoleDeleteConfirm` fallback reads "this spread"), and "Life area" (the Focus sheet and the Life removal copy).
- **Casing.** "To place" appears four times and "To Place" once in user-visible strings. The brand board uses "To place".
- **Empty states.** "Make room for what matters" (Classic) and "Nothing to do here yet." (Life, `Life/LifeWalletStack.swift:294`) use different voices. "Nothing planned" in `WeekFocusSurface.swift` is unreachable and is not counted (see life-routing).
- **Accessibility label.** "Add responsibility" (`Spread/ResponsibilitySidebar.swift:76`) differs from both visible labels.

## Expected

One action name, one noun, one casing and one empty-state voice, applied across Classic, Life, Focus and the landing page. The founder's landing copy stays as written.

## Root cause

Surfaces were specified one at a time. Each spec named the action in its own words.

## Affected files (lanes B, C, D; the landing copy is lane E)

- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift`
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Spread/SpreadSurface.swift`, `ResponsibilitySidebar.swift`
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift`
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRoot.swift`, `LifeWalletStack.swift`
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Week/ToPlaceTray.swift` and the To Place string

## Safe corrective plan

1. Owner picks the action name (proposal: "Add responsibility") and the noun (proposal: "responsibility"). The Life brand board already uses "Responsibilities" in its flow.
2. Each lane updates its own strings in one PR and lists them.
3. "To place" everywhere, per the board.
4. Empty states keep their meaning and use the chosen voice. This is a copy change only.

Copy is reviewed for voice, not decided by this lane; `design:ux-copy` was not available in this session.

## Before and after evidence

Not available for native copy. The landing copy is unchanged in this pass.

## Regression scenarios

- Creating a responsibility from each entry point shows the same title.
- VoiceOver reads the same label as the visible text.
- No string differs only by casing across the app (grep check in the lane PR).

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the copy commit. No data or behavior changes.
