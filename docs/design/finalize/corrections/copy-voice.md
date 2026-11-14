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

- **Create sheet title. Closed by PR #218.** `Sheets/ManageSheets.swift:64` now reads `lifeMode ? "Add Life" : "Add responsibility"`. Field labels follow the same rule (`ManageSheets.swift:27`).
- **Recently Deleted copy. Closed by PR #218.** `Sheets/RecentlyDeletedSheet.swift:23` reads "To place".
- **Casing. Closed by PR #218.** User-visible text uses "To place". Only a code comment in `Week/WeekFocusComponents.swift:110` keeps the old form, and W2-1 removes that file.
- **Empty states.** Corrected 2026-11-14: Life's empty state now has a heading, one sentence and an action ("No Life areas yet", `Life/LifeRoot.swift:314-322`). "Nothing to do here yet." is no longer in Sources. The two title-only empties are listed below.

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

## Added by the cross-surface review (base `6f53a60`, 2026-11-14)

Source: [../CROSS_SURFACE_REVIEW.md](../CROSS_SURFACE_REVIEW.md), findings X3, X5 and X8 to X11. Line numbers in the "Applied on main" section have moved: Life's creation button is `Life/LifeRoot.swift:377` and `:1037`.

- **Over capacity has two words (X5, medium, decided by OD32, wave 3).** Classic says "overbooked" (`Spread/SpreadSurface.swift:137-138, 166-167`) and explains it with the OD12 sentence (`:251`). Life says "Over budget" (`Life/LifeWeeklyTimeBudget.swift:69, 126, 273`; `Life/LifeEditorialCard.swift:155, 205`) and does not show the sentence. **OD32:** the state reads "over budget" in both roots. Classic's "overbooked" changes. The OD12 sentence explains the state in both roots.
- **Two verbs for removing a responsibility (X3, medium, decided by OD30, wave 3).** "Delete responsibility" (`Spread/SpreadSurface.swift:955-975`) and "Remove responsibility" (`Sheets/ManageSheets.swift:234, 260`). **OD30:** "Remove responsibility" in Classic, "Remove Life area" in Life.
- **Open tasks dismissal (X8, low, decided by OD33, wave 3).** `Sheets/ManageSheets.swift:330-331` reads "Not now". Use "Cancel", as the other leading dismissals do.
- **Focus and widget wording (X10, low, decided by OD33, wave 3).** "Cancel session" (`Focus/SpreadFocusTimerSheet.swift:100, 168`) against "Cancel" in the Live Activity (`ios/App/SpreadWidget/SpreadTimerWidget.swift:226`). Use "Cancel session" in both.
- **Title-only empties (X11, low, decided by OD33, wave 3).** `Sheets/RecentlyDeletedSheet.swift:37` ("Nothing recently deleted") and `Sheets/WhatsNewSheet.swift:40` ("No release notes yet") have no sentence. Add one plain sentence each (OD22).
- **X9, closed by PR #218.** The Recently Deleted copy now reads "To place" (`Sheets/RecentlyDeletedSheet.swift:23`).

Regression scenarios added: each destructive act on a responsibility uses one verb in every place it appears, and the Over-capacity state reads the same word in both roots.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the lane's copy commit. No data or behavior changes.
