# Correction: Life routing, default state and a dead Week path

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open** (decided; code not yet in place). Decision: **resolved** by OD18 and OD19 in the planning doc section 8.

| Field | Value |
| --- | --- |
| Screens | N07 Life root, N08 Wallet Stack, N13 Life Week, N23 More, N37 unreachable Week focus |
| Severity | High: a shipped default that differs from the owner's stated direction |
| Decided | OD18: Life is the default root; the flag key `native.weekMonth.previewEnabled` stays, so a stored choice survives. OD19: delete the dead Week Focus code in wave 2 |

## Observed

1. `SpreadLiveRoot.swift:15` declares `@AppStorage("native.weekMonth.previewEnabled") private var weekFocusEnabled = false`. Life is off by default, and the flag name still says "preview".
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

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the single commit that changes the default or the key. The flag is read on launch, so a rollback needs no data change.
