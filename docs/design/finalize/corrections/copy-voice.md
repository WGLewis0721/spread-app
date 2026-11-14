# Correction: copy vocabulary, casing and empty-state voice

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision: **resolved** (OD7, OD8, OD12, OD13, OD22 in the planning doc section 8 on `claude/happy-feynman-an60e6`). Application: **partly applied on main**.

| Field | Value |
| --- | --- |
| Screens | N02 Spread, N03 Week, N08 Wallet Stack, N17 quick add, N21 new responsibility, N26 Recently Deleted |
| Severity | Medium: the same action is still named differently in places |
| Decided | OD7 role words; OD8 Details title; OD12 overbooked copy; OD13 empty week; OD22 creation and empty-state voice |

## Applied on main

- **Classic creation.** The Classic entry, the empty state and the sidebar all say "Add responsibility" (OD22; `Spread/SpreadSurface.swift:306`, `Shell/SpreadLiveRoot.swift:466`, `Spread/ResponsibilitySidebar.swift:76`).
- **Life creation.** Life's button says "Add Life" (`Life/LifeRoot.swift:368`, `:1061`), as OD22 sets.
- **Details.** The Life card's sheet is titled "Details" (OD8). The UI tests that asserted "Manage Life area" now assert "Details".

## Still open

- **Create sheet title.** `Sheets/ManageSheets.swift:58` titles the shared create sheet "Add Life", and Classic reaches the same sheet. The title has to follow the root that opened it: "Add Life" from Life, "Add responsibility" from Classic (lane D).
- **Recently Deleted copy.** `Sheets/RecentlyDeletedSheet.swift:21` says "return to To Place". It should read "To place" (lane D).
- **Casing.** "To place" is the board's form. Any other capitalization in user-visible text must follow it (lanes C and D).
- **Empty states.** OD22 asks for a short heading, one plain sentence, then the action. Life's "Nothing to do here yet." (`Life/LifeWalletStack.swift`) has no heading and no action (lane B).

## Expected

Life: "Add Life", "Life area", "Details". Classic: "Add responsibility", "responsibility". "To place" everywhere. Empty states follow OD22. The landing copy is unchanged by this record.

## Affected files

- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift`, `RecentlyDeletedSheet.swift` (lane D)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Week/` and `Spread/` (lane C)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift` (lane A)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/` (lane B)

## Safe corrective plan

1. Each lane fixes its own strings in one PR and lists them.
2. Keep the OD22 wording exactly.
3. Grep for stale strings in each PR: "New Spread", "Create responsibility", "Manage Life area", "To Place" in user-visible text.

## Before and after evidence

Not available for native copy: no device run. The landing copy is unchanged.

## Regression scenarios

- Creating a responsibility from Classic shows "Add responsibility"; from Life it shows "Add Life".
- The Details sheet title is "Details", and the UI tests pass with it.
- Restoring a deleted task says "return to To place".
- VoiceOver reads the same label as the visible text.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the lane's copy commit. No data or behavior changes.
