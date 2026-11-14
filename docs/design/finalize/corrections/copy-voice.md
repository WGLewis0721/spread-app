# Correction: copy vocabulary, casing and empty-state voice

> Summary: Wave 3 lane D landed X8 (Open tasks says "Cancel") and X10 (the timer widget says "Cancel session", icon only). X11 needed no change: both title-only empties already had one sentence at base `6f53a60`, so that review finding was wrong. X3's sheet side was already correct. X3's Classic delete (lane C) and X5 stay open. The record stays open until a reviewer approves it.

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision: **resolved** (OD7, OD8, OD12, OD13, OD22 in the planning doc section 8 on `claude/happy-feynman-an60e6`). Application: **partly applied on main**.

| Field | Value |
| --- | --- |
| Screens | N02 Spread, N03 Week, N08 Wallet Stack, N17 quick add, N21 new responsibility, N26 Recently Deleted |
| Severity | Medium: the same action is still named differently in places |
| Decided | OD7 role words; OD8 Details title; OD12 overbooked copy; OD13 empty week; OD22 creation and empty-state voice |

## Applied on main

- **Classic creation.** The Classic entry, the empty state and the sidebar all say "Add responsibility" (OD22; `Spread/SpreadSurface.swift:306`, `Shell/SpreadLiveRoot.swift:408`; `Spread/ResponsibilitySidebar.swift` was removed by #219).
- **Life creation.** Life's button says "Add Life" (`Life/LifeRoot.swift:368`, `:1061`), as OD22 sets.
- **Details.** The Life card's sheet is titled "Details" (OD8). The UI tests that asserted "Manage Life area" now assert "Details".

## Still open

- **Create sheet title. Closed by PR #218.** `Sheets/ManageSheets.swift:64` now reads `lifeMode ? "Add Life" : "Add responsibility"`. Field labels follow the same rule (`ManageSheets.swift:27`).
- **Recently Deleted copy. Closed by PR #218.** `Sheets/RecentlyDeletedSheet.swift:23` reads "To place".
- **Casing. Closed by PR #218.** User-visible text uses "To place". The one old form was a code comment in `Week/WeekFocusComponents.swift`, which #219 removed with that file.
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

## Applied in wave 3 (lane D, W3-5)

- **X8, Open tasks dismissal: done.** The leading dismiss reads "Cancel" (`Sheets/ManageSheets.swift`, the Open tasks toolbar). "Move" is unchanged. `scripts/native-menu-polish.test.mjs` pins Cancel and checks that "Not now" is gone.
- **X10, timer widget: done.** The control reads "Cancel session" (`ios/App/SpreadWidget/SpreadTimerWidget.swift`). It stays icon only at every widget size, as it was, so the title is the VoiceOver label and no text needs to fit. The Focus sheet already says "Cancel session". `scripts/native-today-widget.test.mjs` pins the title and the icon-only control.
- **X11, empty lists: no change needed. The review finding was wrong.** At base `6f53a60` both empty states already had one plain sentence: "Future updates will appear here." (`Sheets/WhatsNewSheet.swift:41`) and "Tasks you delete will appear here for 30 days." (`Sheets/RecentlyDeletedSheet.swift:40`). Neither has an action, so none was added. The review's `CROSS_SURFACE_REVIEW.md` row is corrected to match.
- **X3, ManageSheets side: already correct on main.** Life says "Remove Life area" and Classic says "Remove responsibility" (`Sheets/ManageSheets.swift:241, 268`). `Spread/SpreadSurface.swift` still says "Delete responsibility". That is lane C's file, so X3 stays open.

Still open: X3's Classic delete (lane C), and X5 "overbooked" and "over budget" (lanes B and C). Reviewer approval is needed to close this record.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the lane's copy commit. No data or behavior changes.
