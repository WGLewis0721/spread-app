# Correction: Life routing, default state and a dead Week path

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. OD18 (Life is the default root) is applied on main in PR #211. OD19 (delete the dead Week Focus code) is open for wave 2. Decisions are in section 8 of the planning doc.

> Summary: Life's default root and dead Week path, plus new findings from the 2026-11-14 cross-surface review: two Undo rows after a Life change (X2), two Classic removal verbs with one unreachable confirmation (X3), and unused code (X7). OD18 is applied. OD19 and the owner decisions are open.

| Field | Value |
| --- | --- |
| Screens | N07 Life root, N08 Wallet Stack, N13 Life Week, N23 More, N37 unreachable Week focus |
| Severity | High: a shipped default that differs from the owner's stated direction |
| Decided | OD18: Life is the default root; the flag key `native.weekMonth.previewEnabled` stays, so a stored choice survives. OD19: delete the dead Week Focus code in wave 2 |

## Observed

1. `SpreadLiveRoot.swift:15` declares `@AppStorage("native.weekMonth.previewEnabled") private var weekFocusEnabled = false`. On main the default is now on (OD18). The key still says "preview", so a stored choice survives.
2. `SpreadLiveRoot.swift:66-83`: when the flag is on, `body` shows `LifeRoot`; otherwise it shows the Classic `presented` branch.
3. `SpreadLiveRoot.swift:332-333` builds `WeekFocusSurface` inside `content()`. `content()` is only reached from the Classic branch (line 163), where the flag is false. So the `weekFocusEnabled && destination == .week` branch cannot run. `WeekFocusSurface.swift` and `WeekFocusComponents.swift` are therefore dead code, and `LifeWeekView` is the only live Week for Life.
4. Life removes a responsibility with Details delete and Undo, with no confirmation. Classic uses a confirmation dialog (`ManageSheets.swift:257`) and a sheet (`RoleDeleteConfirm`, `SpreadLiveRoot.swift`). The brand board (Nov 11 amendment) records Life's undoable delete as the owner's decision.
5. The brand board names Life as the single Wallet direction, while the More sheet offers Classic as "(current)" and makes Life an option.

## Expected

One owner-chosen default, with the flag named for what it does. The owner should also decide whether the unreachable Week code is deleted or kept, and whether Classic removal should move to undoable deletion. Those are behavior and scope decisions, so this lane does not change them.

## Root cause

The Life feature was built behind a preview flag and merged. The old Classic week branches were not removed when Life took over the Week destination.

## Affected files (not changed by this lane)

- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift`
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift`
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Week/WeekFocusSurface.swift`, `WeekFocusComponents.swift` (lane C)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeRoot.swift` (lane B)

## Safe corrective plan

1. Owner chooses the default. Do not change the stored flag value in this program.
2. If Life becomes the default, rename the key in one migration-free change: read the old key for existing installs, so no user loses their choice. This touches Shell (lane A) and must be reviewed as a behavior change.
3. Remove `WeekFocusSurface` and `WeekFocusComponents` only after a usage check confirms no other references, in lane C.
4. Keep the Undo behavior in Life; decide Classic separately.

## Before and after evidence

Not yet available. Native changes need a physical iPhone run from a candidate SHA (see [../RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)).

## Regression scenarios

- Fresh install opens the chosen default.
- Existing install keeps its calendar design after the update.
- Widget deep links (`SpreadOpenToday`, `SpreadOpenFocus`, `SpreadOpenLifeCard`) still open the Life root and the correct card.
- Responsibility removal shows the decided behavior in both roots.

## Added by the cross-surface review (base `6f53a60`, 2026-11-14)

Source: [../CROSS_SURFACE_REVIEW.md](../CROSS_SURFACE_REVIEW.md), findings X2, X3 and X7. Device check: [../DEVICE_TEST_SCRIPT.md](../DEVICE_TEST_SCRIPT.md) step B4.

- **Two Undo surfaces in Life (X2, high).** After a change, Life can show the shell notice (`Shell/SpreadLiveRoot.swift:696-697`, "Undo last change" at `:800`) and the five-second Undo and Redo pair in `Life/LifeRoot.swift:208-230, 707-714` (ids `life-undo`, `life-redo`). The Nov 11 brand board asks for "a single context-appropriate Undo/Redo row, not two". Fix: one Undo row in Life. The owner decides whether Redo appears outside the notes editor.
- **Two Classic removal verbs (X3, medium).** "Delete responsibility" (`Spread/SpreadSurface.swift:955-975`) and "Remove responsibility" (`Sheets/ManageSheets.swift:234, 260`) both confirm the same act. Fix: one verb, "Remove responsibility". Life keeps its undoable Details delete (OD24).
- **Unreachable and unused code (X3, X7, low).** `RoleDeleteConfirm` (`Shell/SpreadLiveRoot.swift:936-937, 969`) is reached only through `LifeRoot.swift:30` `onDeleteRole`, which nothing calls. `CrownTravel.swift` and `DialGeometry.swift` are referenced only by each other. `LifeDeleteSheet` (`Life/LifeManagementSheets.swift:147`) is declared and never presented, and `LifeRoot.swift:27` `onOpenRole` is never called. Fix: delete these after a reference check (lanes A and B).
- **Life's Details delete has no prompt.** The Details button calls `deleteRole()` directly (`Life/LifeManagementSheets.swift:85-87`), which matches OD24. Device step B3 checks it.
- **RoleDeleteConfirm stays open with a note.** Its wording is being changed in W2-1 (coordinator, 2026-11-14). It is unreachable on main, so deleting it may be simpler. The owner decides.
- **Update to Observed item 4.** The Classic removal path is no longer a single confirmation: the dialogs above are the live ones, and `RoleDeleteConfirm` is dead.

Regression scenario added: after a Life change, exactly one Undo row shows, and it restores the change.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the single commit that changes the default or the key. The flag is read on launch, so a rollback needs no data change.
