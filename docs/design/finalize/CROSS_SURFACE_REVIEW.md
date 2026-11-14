# Spread | Cross-surface review (publish finalize, wave 2)

> Part of the Spread design brain. Start at [../README.md](../README.md). Folder index: [README.md](README.md).

> Summary: a source-level review of `main` at `6f53a60` across Life, Classic (Week, Month, Spread), sheets, the Focus timer, widgets and the Live Activity. It checks continuity against owner decisions OD1 to OD25 and the native rules. Most decisions are already in code. Two findings need owner decisions before code (Life's Undo row and the haptic policy), one is a release blocker in the Xcode build settings that no lane covers, and the rest belong to wave-2 lanes or to the owning lane. Nothing here is verified on a device. The proof still owed is [DEVICE_TEST_SCRIPT.md](DEVICE_TEST_SCRIPT.md).

## 1. Scope and method

- **Base:** `main` at `6f53a60`. This branch changes docs only.
- **Surfaces:** Life root, Wallet Stack, card Details and Tasks, Hours, Weekly Time, Plan Ahead, Life Week; Classic Spread, Week, Month, To place, Move-to, navigation rail and header; shared sheets; Focus timer; Today, Focus and Life-cards widgets; the Focus Live Activity.
- **Method:** source reading and search. Each claim cites `file:line` on `6f53a60`. Counts come from `grep` on 2026-11-14. No Swift toolchain, simulator or device was used. A claim about how something looks, feels or sounds is marked **device** and belongs in the device script.
- **Skills and MCPs:** the `design:design-critique`, `design:design-system`, `design:accessibility-review` and `design:ux-copy` skills are not available in this session (a skill search returned nothing). The review follows the Gray Matter gates instead (`TACTILE_MOTION_AND_DEVICE_QA.md`, `UI_AUTOMATION_AND_EVIDENCE.md`, `templates/DESIGN_QA.md`). Nothing was run through the design skills.
- **Authority order:** [RULES_CARD](../RULES_CARD.md), the native brand board and its Nov 11 and Nov 12 amendments, the OD decisions in [the plan, section 8](../specs/2026-11-14-publish-finalize-plan.md), the native Lucide section of [ICON_HANDOFF](../brand/ICON_HANDOFF.md) (Nov 13), and the device matrix in [VERIFICATION.md](../tactile-precision/VERIFICATION.md). Where Spread's card is more specific than Gray Matter, Spread wins. The Gray Matter haptics table allows more cues than Spread's card, so the card is applied.

## 2. Verdict (source level)

**Not ready to publish from source alone.** The core decisions are in code (section 3). Nine findings need action (section 4). X1 is a release blocker that no lane owns: the app targets are still universal (`TARGETED_DEVICE_FAMILY = "1,2"`), and OD20 says iPhone only. X2 (two Undo rows in Life) and X4 (haptics beyond completion) need an owner decision before code. The device script (`DEVICE_TEST_SCRIPT.md`) is the proof still owed for every surface.

## 3. Already consistent on main (checked in source)

| Owner decision or rule | Evidence on `main` | Note |
| --- | --- | --- |
| **OD18** Life is the default root | `Shell/SpreadLiveRoot.swift:16` default `true`; More reads "Calendar design: Life" / "Calendar design: Classic" with no "(current)" (`Sheets/ManageSheets.swift:597-611`) | Stored choice key kept. |
| **OD2** completion haptic only on completing | `Planner/LivePlanner.swift:487` fires only after the store accepts. Toggles pass `completionHaptic: !task.done` (`Life/LifeWalletStack.swift:315`, `Sheets/TaskSheet.swift:231`). Hours, rename, colour, category and move pass `false` (`Spread/SpreadSurface.swift:577, 579, 654, 708, 726`; `Week/WeekSurface.swift:554`; `Week/ToPlaceTray.swift:228`) | Other haptics are X4. |
| **OD1** red ! on Classic and Week task rows | `Theme/SpreadPriorityMark.swift:7` (`TaskPriorityMark`); used by `TaskLine` (`Week/ToPlaceTray.swift:162`, which Week day rows also use) and `Spread/SpreadSurface.swift:788` | Life still shows a flag (C1). |
| **OD3** 0.6 black well for zero hours | `Life/LifeEditorialCard.swift:239-241` | |
| **OD6** Done trailing, Cancel leading on drafts | Draft sheets: `Sheets/ManageSheets.swift:62-66`, `Life/LifePlanAheadSheet.swift:182-184`, `Week/OverdueSelectionTray.swift:166`, `Week/MonthQuickAddSheet.swift:67`. Done trailing: `Focus/SpreadFocusTimerSheet.swift:311-312, 398-399`, `Sheets/WhatsNewSheet.swift:68-69`, `Sheets/RecentlyDeletedSheet.swift:100-101`, `Life/LifeRoot.swift:1099`, and the OD6 exception `Sheets/BackupRestoreSheet.swift:75-76` | The one leading dismiss that is not "Cancel" is X8. |
| **OD7, OD22** creation words | "Add Life" at `Life/LifeRoot.swift:377`; "Add responsibility" at `Shell/SpreadLiveRoot.swift:466`, `Spread/SpreadSurface.swift:306`, `Spread/ResponsibilitySidebar.swift:76`. No user-visible "New Spread" or "Create responsibility" in Sources | The shared create sheet title is C3. |
| **OD22** empty states: heading, one sentence, action | Classic: `Shell/SpreadLiveRoot.swift:460-466`. Life: `Life/LifeRoot.swift:314-322` | Two title-only empties are X11. |
| **OD13** empty week does not repeat | `Week/WeekSurface.swift:396-418`: a day says "Nothing planned" only when the week has hours | Dead copy remains in `WeekFocusSurface.swift:489` (C5). |
| **OD12** overbooked sentence (Classic) | `Spread/SpreadSurface.swift:251`: "These hours don't fit in your week. Remove some or raise your weekly hours." | Life wording differs (X5). |
| **OD11** SF exceptions | `Week/OverdueSelectionTray.swift:139` `exclamationmark.circle`; `Shell/PlannerNavigationRail.swift:31` `checkmark` | The eight Lucide assets are C7. |
| **OD10** Focus transport grows with type | `Focus/SpreadFocusTimerSheet.swift:96, 132, 140, 155, 164` use `minWidth/minHeight: 44`; no fixed width frames in `Focus/` | |
| **OD14** dormant five-mode layouts deleted | No `Layouts/` folder in `Sources/` | |
| **OD25** no App Store link | No `apps.apple.com` in `src/` | |
| One week control, hold to repeat | `Shell/WeekCrownView.swift:15-27` wraps `SpreadArrowValueControl` with `repeatsOnHold: true`. Used by Classic (`Shell/SpreadLiveRoot.swift:530`) and Life (`Life/LifeRoot.swift:813`). The metal Crown is not drawn | Dead names are X7. |
| One undo wording | "Undo last change" at `Shell/SpreadLiveRoot.swift:800` and `Life/LifeManagementSheets.swift:207` | Two Undo surfaces on Life are X2. |
| Reduce Motion | `accessibilityReduceMotion` read in 15 native files | **Device** check owed. |
| Haptics iPhone only in code | `Theme/SpreadTheme.swift:332-335` gate on `userInterfaceIdiom == .phone` | The build still targets iPad (X1). |
| Health teal (landing) | Landing sample updated in this PR set (lane E) | Native default still `#007AFF` at `src/lib/spread/model.ts:117` (C4). |

## 4. Findings

Severity: **High** blocks release or breaks an explicit owner rule. **Medium** is a continuity or rule drift a reviewer will notice. **Low** is copy polish, naming or dead code. "Covered by" names the wave-2 lane that changes it, so no lane duplicates work.

| ID | Surface | Where (file:line) | Rule or decision | Severity | Proposed fix | Owning area | Covered by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **X1** | Release build | `ios/App/App.xcodeproj/project.pbxproj`: six `TARGETED_DEVICE_FAMILY = "1,2"`. `docs/APP_STORE_REVIEW_CHECKLIST.md:12, 28` still say iPhone/iPad | OD20; CLAUDE.md "iPhone only" | **High** | Owner confirms 1.0 is iPhone only. Then set the family to `1` in every target, and align the checklist and release plan in one change. Native config is outside the docs lane and was **not** changed here. | Owner, then native config | Not covered. Correction `release-scope` (extended). |
| **X2** | Life, Undo | Shell notice: `Shell/SpreadLiveRoot.swift:696-697, 796-800` (5 to 6 s). Life pair: `Life/LifeRoot.swift:208-230` (shows for 5 s after each change), `:707-714` (buttons "Undo" and "Redo", ids `life-undo`, `life-redo`) | Brand board Nov 11 correction: "a single context-appropriate Undo/Redo row, not two" | **High** | One Undo row in Life, with the "Undo last change" wording. Owner decides whether Redo appears outside the notes editor. Confirm on device (device script C4). | B (Life) with A (notice) | Not covered. Correction `life-routing` (extended). |
| **X3** | Classic, remove a responsibility | Delete: `Spread/SpreadSurface.swift:955-975` ("Delete responsibility", dialog). Remove: `Sheets/ManageSheets.swift:234, 260` ("Remove responsibility", dialog). Unreachable: `RoleDeleteConfirm` (`Shell/SpreadLiveRoot.swift:936-937, 969`). Its only trigger, `LifeRoot.swift:30` `onDeleteRole`, is declared and never called | OD24 (Classic keeps its confirmation, Life keeps undoable Details delete); OD7 (one word per action) | **Medium** | One verb for one act. Use "Remove responsibility", which the sheet already uses. Delete `RoleDeleteConfirm` after a reference check. Life stays as decided. | A (Shell), C (Spread), D (ManageSheets) | Not covered. Correction `life-routing` (extended). |
| **X4** | Haptics beyond completion | Success: `SpreadSurface.swift:969` (responsibility delete). Destructive prompt: `SpreadSurface.swift:1011, 1065`; `WeekSurface.swift:745, 760`. Revealed impact: `SpreadSurface.swift:1147`. Edit-mode impact: `SpreadLiveRoot.swift:222`. Selection ticks: `PlannerNavigationRail.swift:54`, `SpreadLiveRoot.swift:236, 240, 253`, `WeekSurface.swift:759`, `Life/LifeHoursView.swift:388`. Helper: `Theme/SpreadTheme.swift:330-374` | Rules card: "One light haptic on completing a task"; OD2 | **Medium** | **Owner decision.** (a) Strict: completion is the only haptic. (b) Recommended: keep discrete selection ticks on steppers and week steps (Gray Matter's detent rule); keep one rate-limited warning at a boundary; drop success, revealed and edit-mode impacts on delete and reveal, because the visible change and Undo already confirm them. The completion path stays (`LivePlanner.swift:487`, after acceptance). | A (`SpreadHaptics`), C, D | Not covered. Recorded here only; see section 5. |
| **X5** | Life and Classic, over capacity | Classic: "overbooked" at `Spread/SpreadSurface.swift:137-138, 166-167`. Life: "Over budget" at `Life/LifeWeeklyTimeBudget.swift:69, 126, 273` and `Life/LifeEditorialCard.swift:155, 205`. Life does not show the OD12 sentence | OD12 (overbooked copy); one copy voice | **Medium** | **Owner decision.** Recommended: "overbooked" for the week state in both roots, which matches OD12 and Classic. Keep "budget" as the Weekly Time section name only. Show the OD12 sentence in Life's explanation. | B (Life), C (Classic) | Not covered. Correction `copy-voice` (extended). |
| **X6** | Icons | Rail toggle: `Shell/PlannerNavigationRail.swift:57` SF `sidebar.left/right`, against Lucide `lucide-panel-left` at `Shell/SpreadLiveRoot.swift:552` (confirm on device that both toggle the same rail). Undo notice: `Shell/SpreadLiveRoot.swift:799` SF `arrow.uturn.backward` | ICON_HANDOFF Nov 13: custom controls use Lucide; SF only for alerts, specialised controls and tiny markers. OD11 names `rotate-ccw` for undo | **Low** | Rail toggle: Lucide `panel-left` in both places. Undo notice: Lucide `rotate-ccw` once it is added. | A; W2-2 | Partly W2-2 (`rotate-ccw`). Rail toggle not covered. Correction `wave2-tokens-icons` (extended). |
| **X7** | Dead code and names | `CrownTravel.swift` and `DialGeometry.swift` are referenced only by each other (grep, 2026-11-14). `Shell/WeekCrownView.swift:4-6` keeps the "Crown" name for an arrow control. `Theme/SpreadTheme.swift:101` "Crown metal" tokens | Rules card: no metal Crown (the visual is retired; this is code debt) | **Low** | Delete `CrownTravel.swift` and `DialGeometry.swift` after a reference check. Rename `WeekCrownView` when a call-site sweep is safe. Remove the Crown-metal tokens in the token pass if unused. | A | Not covered (W2-1 removes Week Focus only). Correction `life-routing` (extended). |
| **X8** | Open tasks sheet | `Sheets/ManageSheets.swift:330-331` "Not now" (leading) | OD6; every other leading dismiss says "Cancel" (`ManageSheets.swift:62-66`, `LifePlanAheadSheet.swift:184`) | **Low** | "Cancel". The "Move" action stays. | D | Not covered. Correction `copy-voice` (extended). |
| **X9** | Recently Deleted | `Sheets/RecentlyDeletedSheet.swift:21` "return to To Place" | Copy-voice record: "To place" casing | **Low** | "To place". | D | Open in `copy-voice` (already listed). Not in W2-1 to W2-4. |
| **X10** | Focus and Live Activity | `Focus/SpreadFocusTimerSheet.swift:100, 168` "Cancel session"; `ios/App/SpreadWidget/SpreadTimerWidget.swift:226` "Cancel" | One copy voice | **Low** | Use "Cancel session" in the widget too. | D | Not covered. Correction `copy-voice` (extended). |
| **X11** | Empty lists | `Sheets/RecentlyDeletedSheet.swift:37` "Nothing recently deleted"; `Sheets/WhatsNewSheet.swift:40` "No release notes yet". Title only | OD22: heading, one sentence, action | **Low** | Add one plain sentence. Add an action only where one exists. | D | Not covered. Correction `copy-voice` (extended). |
| **X12** | Widget colour | `ios/App/SpreadWidget/SpreadLifeCardsWidget.swift:141-185`: literals `F7FAFF`, `B0BCD1`, `0E1A2E`, `4A5670`, `F4F1EA` duplicate the ink and secondary tokens | Rules card: tokens, no literals outside Theme | **Low** | Read the tokens through a shared widget file or a widget colour set. | D with A | Not covered. Correction `color-drift` (extended). |

### Covered by other wave-2 lanes (no new record)

| ID | Finding | Where | Lane |
| --- | --- | --- | --- |
| C1 | Life priority is a flag icon and "High priority" text, not the shared ! mark (OD1) | `Life/LifeWalletStack.swift:330-333, 367-376` | W2-3 |
| C2 | 41 `Color(hex:)`/`Color(red:)` and 11 `.font(.system(size:))` outside `Theme/` | counted 2026-11-14 | W2-3 (tokens); `color-drift` |
| C3 | The shared create sheet is titled "Add Life" for Classic too | `Sheets/ManageSheets.swift:58` | W2-4 |
| C4 | Health default is still `#007AFF` | `src/lib/spread/model.ts:117` | W2-4 |
| C5 | Week Focus dead code, including "Nothing planned" and a success haptic | `Week/WeekFocusSurface.swift`, `Week/WeekFocusComponents.swift:105, 489` | W2-1 |
| C6 | `Spread.disabledOpacity` and the scrim token are not in code | grep 2026-11-14 | W2-3 |
| C7 | Lucide assets `plus`, `coffee`, `eye`, `copy`, `arrow-left-right`, `rotate-ccw`, `rotate-cw`, `circle-help` | `Resources/Icons.xcassets` | W2-2 |

### Observations, no change proposed

- **O1 Sheet detents.** Life sheets use `[.medium, .large]` (`Life/LifeRoot.swift:1100`, `Life/LifeManagementSheets.swift:174`), Hours uses `[.medium]` (`Life/LifeHoursView.swift:144`), and most Classic sheets use `[.large]`. There is no shared rule. Keep unless the owner wants one; check heights on device.
- **O2 Chalk art.** The Classic empty state draws the Chalk notebook (`Shell/SpreadLiveRoot.swift:460`). That is allowed, since Classic keeps its own rules. The Life empty state has no art, which matches the Nov 11 Life rule.
- **O3 Focus transport glyphs.** Play, pause, forward and stop are SF Symbols. ICON_HANDOFF lists specialised controls as an exception.

## 5. Owner decisions requested (no code until answered)

1. **X1, release scope.** Confirm iPhone only for 1.0. Then one native config change plus the checklist and plan update.
2. **X2, Life Undo.** One row or two. If one, which one, and is Redo kept?
3. **X3, removal verb.** "Remove responsibility" is the recommendation.
4. **X4, haptic policy.** Option (a) strict or (b) recommended, from section 4.
5. **X5, over-capacity word.** "overbooked" is the recommendation.

**Router note.** X4 needs a correction record, but `docs/design/README.md` has no room for one more file under the 9,000-byte map budget (`scripts/design-docs.mjs`). The finding is recorded here and in the release checklist until the owner decides whether to raise the budget or merge a record.

## 6. Not verifiable here (device)

Layout at 390, 820 and 1024 pt. The Undo row's position above the home indicator. Haptic feel and count. VoiceOver order and labels. Dynamic Type at the largest size. Reduce Motion behaviour. Widget and Live Activity rendering. Each is a step in [DEVICE_TEST_SCRIPT.md](DEVICE_TEST_SCRIPT.md). iPad is out of scope under OD20, but the build still targets it (X1).

## 7. What this PR does not change

No Swift, TypeScript or tests. The native findings belong to their lanes or to the owner. X1 needs an owner decision and a native config change. X2 to X5 need owner decisions before code.
