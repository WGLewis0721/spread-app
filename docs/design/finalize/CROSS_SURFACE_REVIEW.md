# Spread | Cross-surface review (publish finalize, wave 2)

> Part of the Spread design brain. Start at [../README.md](../README.md). Folder index: [README.md](README.md).

> Summary: a source-level review of `main` at `6f53a60`, brought up to date with `main` at `07c7864` (PRs #217, #218 and #220). The owner's decisions OD28 to OD33 (plan section 8) now decide every finding. One finding from the first draft is withdrawn: X2 said Life can show two Undo rows, but the Classic notice never renders on Life. Life's single Undo/Redo row stays, and device step C4 checks it. Decided is not done: the code changes are wave 3. Nothing here is verified on a device. The proof still owed is [DEVICE_TEST_SCRIPT.md](DEVICE_TEST_SCRIPT.md).

## 0. Status after main moved

This review was written at base `6f53a60`. This branch also contains `main` at `07c7864`, which includes three merged lane PRs.

- **Closed on main:**
  - X9: Recently Deleted reads "To place" (`Sheets/RecentlyDeletedSheet.swift:23`, #218).
  - C1: Life shows the shared `TaskPriorityMark` (`Life/LifeWalletStack.swift:334`, #220). The flag stays as the priority control, as OD1 specifies.
  - C3: the create sheet title and field labels follow the root (`Sheets/ManageSheets.swift:64, 27`, #218).
  - C4: Health default `#30B0C7` in `model.ts:89, 117` (#218).
  - C7: the eight Lucide assets are in the catalog (#217). The device check is still owed.
- **Partly closed:**
  - C6: `Spread.disabledOpacity` exists (`Theme/SpreadTheme.swift:143`, 0.4) and Life uses it. Classic and Focus still hardcode their own opacities. The scrim token `sidebarScrim` also arrived with #220 (`SpreadTheme.swift:54`), and OD33 removes it.
- **Recounted:** `Color(hex:)` and `Color(red:)` outside `Theme/`: 40 (was 41). `.font(.system(size:))` outside `Theme/`: 11.
- **Still open:** the Week Focus dead code is still present (W2-1 not merged).
- **Withdrawn:** X2 (see section 4).
- **Extended:** X7 now also covers `LifeDeleteSheet`, never presented, and `LifeRoot.onOpenRole`, never called.

## 1. Scope and method

- **Base:** `main` at `6f53a60`, merged with `07c7864`. This branch changes docs only.
- **Surfaces:** Life root, Wallet Stack, card Details and Tasks, Hours, Weekly Time, Plan Ahead, Life Week; Classic Spread, Week, Month, To place, Move-to, navigation rail and header; shared sheets; Focus timer; Today, Focus and Life-cards widgets; the Focus Live Activity.
- **Method:** source reading and search. Each claim cites `file:line`. Counts come from `grep` on 2026-11-14. No Swift toolchain, simulator or device was used. A claim about how something looks, feels or sounds is marked **device** and belongs in the device script.
- **Skills and MCPs:** the `design:design-critique`, `design:design-system`, `design:accessibility-review` and `design:ux-copy` skills are not available in this session (a skill search returned nothing). The review follows the Gray Matter gates instead (`TACTILE_MOTION_AND_DEVICE_QA.md`, `UI_AUTOMATION_AND_EVIDENCE.md`, `templates/DESIGN_QA.md`). Nothing was run through the design skills.
- **Authority order:** [RULES_CARD](../RULES_CARD.md), the native brand board and its Nov 11 and Nov 12 amendments, the OD decisions in [the plan, section 8](../specs/2026-11-14-publish-finalize-plan.md), the native Lucide section of [ICON_HANDOFF](../brand/ICON_HANDOFF.md) (Nov 13), and the device matrix in [VERIFICATION.md](../tactile-precision/VERIFICATION.md). Where Spread's card is more specific than Gray Matter, Spread wins.

## 2. Verdict (source level)

**Not ready to publish from source alone.** Every finding now has an owner decision (section 5), so no finding waits on the owner. The remaining work is wave-3 code: the device family (X1), the removal verb and dead code (X3, X7), the haptic policy (X4), the over-budget word (X5) and the icon, copy and token items (X6, X8 to X12). The release blocker is X1: the app targets are still universal (`TARGETED_DEVICE_FAMILY = "1,2"`), and OD28 says iPhone only. The device script is the proof still owed for every surface.

## 3. Already consistent on main (checked in source)

| Owner decision or rule | Evidence on `main` | Note |
| --- | --- | --- |
| **OD18** Life is the default root | `Shell/SpreadLiveRoot.swift:16` default `true`; More reads "Calendar design: Life" / "Calendar design: Classic" with no "(current)" (`Sheets/ManageSheets.swift:597-611`) | Stored choice key kept. |
| **OD2** completion haptic only on completing | `Planner/LivePlanner.swift:487` fires only after the store accepts. Toggles pass `completionHaptic: !task.done` (`Life/LifeWalletStack.swift:315`, `Sheets/TaskSheet.swift:231`). Hours, rename, colour, category and move pass `false` (`Spread/SpreadSurface.swift:577, 579, 654, 708, 726`; `Week/WeekSurface.swift:554`; `Week/ToPlaceTray.swift:228`) | Other haptics are X4. |
| **OD1** red ! on task rows | `Theme/SpreadPriorityMark.swift:7` (`TaskPriorityMark`): Classic and Week (`Week/ToPlaceTray.swift:162`, `Spread/SpreadSurface.swift:788`) and Life (`Life/LifeWalletStack.swift:334`, #220) | The flag is the control. |
| **OD3** 0.6 black well for zero hours | `Life/LifeEditorialCard.swift:239-241` | |
| **OD6** Done trailing, Cancel leading on drafts | Draft sheets: `Sheets/ManageSheets.swift:62-66`, `Life/LifePlanAheadSheet.swift:182-184`, `Week/OverdueSelectionTray.swift:166`, `Week/MonthQuickAddSheet.swift:67`. Done trailing: `Focus/SpreadFocusTimerSheet.swift:311-312, 398-399`, `Sheets/WhatsNewSheet.swift:68-69`, `Sheets/RecentlyDeletedSheet.swift:100-101`, `Life/LifeRoot.swift:1099`, and the OD6 exception `Sheets/BackupRestoreSheet.swift:75-76` | The one leading dismiss that is not "Cancel" is X8. |
| **OD7, OD22** creation words | "Add Life" / "Add responsibility" by root (`Sheets/ManageSheets.swift:64`, #218); entries at `Life/LifeRoot.swift:377` and `Shell/SpreadLiveRoot.swift:466` | Closed. |
| **OD22** empty states: heading, one sentence, action | Classic: `Shell/SpreadLiveRoot.swift:460-466`. Life: `Life/LifeRoot.swift:314-322` | Two title-only empties are X11. |
| **OD13** empty week does not repeat | `Week/WeekSurface.swift:396-418`: a day says "Nothing planned" only when the week has hours | Dead copy remains in `WeekFocusSurface.swift:489` (C5). |
| **OD12** overbooked sentence (Classic) | `Spread/SpreadSurface.swift:251`: "These hours don't fit in your week. Remove some or raise your weekly hours." | Life wording is X5. |
| **OD11** SF exceptions | `Week/OverdueSelectionTray.swift:139` `exclamationmark.circle`; `Shell/PlannerNavigationRail.swift:31` `checkmark` | The eight Lucide assets are in code (C7). |
| **OD10** Focus transport grows with type | `Focus/SpreadFocusTimerSheet.swift:96, 132, 140, 155, 164` use `minWidth/minHeight: 44`; no fixed width frames in `Focus/` | |
| **OD14** dormant five-mode layouts deleted | No `Layouts/` folder in `Sources/` | |
| **OD25** no App Store link | No `apps.apple.com` in `src/` | |
| One week control, hold to repeat | `Shell/WeekCrownView.swift:15-27` wraps `SpreadArrowValueControl` with `repeatsOnHold: true`. Used by Classic (`Shell/SpreadLiveRoot.swift:530`) and Life (`Life/LifeRoot.swift:813`). The metal Crown is not drawn | Dead names are X7. |
| One undo control per root | Life: one Undo/Redo row (`Life/LifeRoot.swift:707-714`, ids `life-undo`, `life-redo`). Classic: the "Undo last change" notice (`Shell/SpreadLiveRoot.swift:696-697, 800`), inside the Classic-only `dock` (`:156-168, 694`). Hours sheet: "Undo last change" (`Life/LifeManagementSheets.swift:207`) | Life never renders the Classic notice. See X2. |
| Reduce Motion | `accessibilityReduceMotion` read in 15 native files | **Device** check owed. |
| Haptics iPhone only in code | `Theme/SpreadTheme.swift:332-335` gate on `userInterfaceIdiom == .phone` | The build still targets iPad (X1). |
| Health teal | Landing sample, `model.ts` default and native category colour all `#30B0C7` | Closed (#218). |

## 4. Findings (decided by the owner)

Severity: **High** blocks release or breaks an explicit owner rule. **Medium** is a continuity or rule drift a reviewer will notice. **Low** is copy polish, naming or dead code. "Decision" names the owner decision (plan section 8, 2026-11-14). Decided findings stay open until the wave-3 change lands and the correction record closes.

| ID | Surface | Where (file:line) | Rule or decision | Severity | Decision | Wave and owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **X1** | Release build | `ios/App/App.xcodeproj/project.pbxproj`: six `TARGETED_DEVICE_FAMILY = "1,2"`. `docs/APP_STORE_REVIEW_CHECKLIST.md:12, 28` still say iPhone/iPad | OD20; CLAUDE.md "iPhone only" | **High** | **OD28:** 1.0 ships iPhone only. Every target's family becomes `1`. The checklist and the preflight script drop the iPad requirements in the same change. Preflight tests stay green. | Wave 3, native config and checklist | Decided, open. Release blocker until wave 3. |
| **X2** | Life, Undo | Life: one Undo/Redo row, `Life/LifeRoot.swift:707-714`, shown for five seconds after a change (`:208-230`). The "Undo last change" notice is Classic-only (`Shell/SpreadLiveRoot.swift:156-168, 694-697`), which the Life branch does not render | Brand board 11 Nov: one context-appropriate Undo/Redo row | Withdrawn as a defect | **OD29:** Life keeps its single Undo/Redo row. Redo stays. Device step C4 decides whether a second row ever appears. If it does, wave 3 removes the duplicate. | Device C4, then wave 3 if needed | Decided. Not a code defect as written. |
| **X3** | Classic, remove a responsibility | Delete: `Spread/SpreadSurface.swift:955-975` ("Delete responsibility"). Remove: `Sheets/ManageSheets.swift:234, 260` ("Remove responsibility"). Unreachable: `RoleDeleteConfirm` (`Shell/SpreadLiveRoot.swift:936-937, 969`); its trigger `LifeRoot.swift:30` `onDeleteRole` is never called | OD7, OD24 | **Medium** | **OD30:** one verb for one act. Classic says "Remove responsibility" everywhere; `SpreadSurface`'s "Delete responsibility" changes. Life says "Remove Life area" (#218). `RoleDeleteConfirm` and Life's unused `onDeleteRole` are deleted. | Wave 3, lanes A, C, D | Decided, open. |
| **X4** | Haptics beyond completion | Success: `Spread/SpreadSurface.swift:969`. Destructive prompt: `SpreadSurface.swift:1011, 1065`; `Week/WeekSurface.swift:745, 760`. Revealed impact: `SpreadSurface.swift:1147`. Edit-mode impact: `Shell/SpreadLiveRoot.swift:222`. Selection ticks: `PlannerNavigationRail.swift:54`, `SpreadLiveRoot.swift:236, 240, 253`, `WeekSurface.swift:759`, `Life/LifeHoursView.swift:388`. Helper: `Theme/SpreadTheme.swift:330-374` | Rules card: one light haptic on completing a task; OD2; brand board "Feedback" | **Medium** | **OD31:** the only success haptic is the light impact on completing a task. Keep the brand board's detent ticks on steppers and week steps, Edit enter and leave, and the reveal snap. One rate-limited warning stays at a boundary or before a destructive confirm. Drop the success impact after removing a responsibility. All haptics are iPhone only and skip when the system turns haptics off. Recorded in [corrections/wave2-tokens-icons.md](corrections/wave2-tokens-icons.md), section "Haptics (OD31)". | Wave 3, lanes A (`SpreadHaptics`), C, D | Decided, open. |
| **X5** | Over capacity | Classic: "overbooked" at `Spread/SpreadSurface.swift:137-138, 166-167`. Life: "over budget" at `Life/LifeWeeklyTimeBudget.swift:69, 126, 273` and `Life/LifeEditorialCard.swift:155, 205` | OD12; one copy voice | **Medium** | **OD32:** the state reads "over budget" in both roots. Classic's "overbooked" changes. The OD12 sentence explains the state in both roots. | Wave 3, lanes B and C | Decided, open. |
| **X6** | Icons | Rail toggle: `Shell/PlannerNavigationRail.swift:57` SF `sidebar.left/right`, against Lucide `lucide-panel-left` at `Shell/SpreadLiveRoot.swift:552`. Undo notice: `Shell/SpreadLiveRoot.swift:799` SF `arrow.uturn.backward` | ICON_HANDOFF Nov 13 | Low | **OD33:** Lucide `panel-left` for the rail toggle; `rotate-ccw` for the Undo notice. | Wave 3, lane A | Decided, open. |
| **X7** | Dead code and names | `CrownTravel.swift` and `DialGeometry.swift` are referenced only by each other. `Shell/WeekCrownView.swift:4-6` keeps a "Crown" name for an arrow control. `Theme/SpreadTheme.swift:101` "Crown metal" tokens. `Life/LifeManagementSheets.swift:147` `LifeDeleteSheet` is never presented. `Life/LifeRoot.swift:27` `onOpenRole` is never called | Rules card: no metal Crown | Low | **OD33:** delete the dead Crown files and the unused Crown tokens. The same reference check covers `LifeDeleteSheet` and `onOpenRole`. | Wave 3, lane A (B for the Life items) | Decided, open. |
| **X8** | Open tasks sheet | `Sheets/ManageSheets.swift:330-331` "Not now" (leading) | OD6; every other leading dismiss says "Cancel" | Low | **OD33:** "Cancel". The "Move" action stays. | Wave 3, lane D | Decided, open. |
| **X9** | Recently Deleted | `Sheets/RecentlyDeletedSheet.swift:23` | Copy voice | Low | "To place". | - | **Closed** (#218). |
| **X10** | Focus and Live Activity | `Focus/SpreadFocusTimerSheet.swift:100, 168` "Cancel session"; `ios/App/SpreadWidget/SpreadTimerWidget.swift:226` "Cancel" | One copy voice | Low | **OD33:** "Cancel session" on the timer widget too. | Wave 3, lane D | Decided, open. |
| **X11** | Empty lists | `Sheets/RecentlyDeletedSheet.swift:37` "Nothing recently deleted"; `Sheets/WhatsNewSheet.swift:40` "No release notes yet". Title only | OD22 | Low | **OD33:** one plain sentence added to each title-only empty list. | Wave 3, lane D | Decided, open. |
| **X12** | Widget colour | `ios/App/SpreadWidget/SpreadLifeCardsWidget.swift:141-185`: literals `F7FAFF`, `B0BCD1`, `0E1A2E`, `4A5670`, `F4F1EA` duplicate ink and secondary tokens | Rules card: tokens, no literals outside Theme | Low | **OD33:** widget colours read the shared tokens. | Wave 3, lane D with lane A | Decided, open. |

### Covered by other lanes (status on main)

| ID | Finding | Where | Status |
| --- | --- | --- | --- |
| C1 | Life priority marker | `Life/LifeWalletStack.swift:334` | Closed (#220). |
| C2 | Hardcoded values outside `Theme/`: 40 `Color(hex:)` or `Color(red:)`, 11 `.font(.system(size:))` | counted 2026-11-14 | Open. Token adoption continues in wave 3. |
| C3 | Shared create-sheet title and field labels | `Sheets/ManageSheets.swift:64, 27` | Closed (#218). |
| C4 | Health default | `src/lib/spread/model.ts:89, 117` | Closed (#218). |
| C5 | Week Focus dead code, including "Nothing planned" and a success haptic | `Week/WeekFocusSurface.swift`, `Week/WeekFocusComponents.swift:105, 489` | Open. W2-1 has not merged. |
| C6 | Disabled-control and scrim tokens | `Theme/SpreadTheme.swift:143, 54` | Partly closed (#220). Classic and Focus still hardcode opacity. |
| C7 | Lucide assets | `Resources/Icons.xcassets` | Closed (#217). Device check owed. |

### Observations, no change proposed

- **O1 Sheet detents.** Life sheets use `[.medium, .large]` (`Life/LifeRoot.swift:1100`, `Life/LifeManagementSheets.swift:174`), Hours uses `[.medium]` (`Life/LifeHoursView.swift:144`), and most Classic sheets use `[.large]`. There is no shared rule. Check heights on device.
- **O2 Chalk art.** The Classic empty state draws the Chalk notebook (`Shell/SpreadLiveRoot.swift:460`). That is allowed, since Classic keeps its own rules. The Life empty state has no art, which matches the Nov 11 Life rule.
- **O3 Focus transport glyphs.** Play, pause, forward and stop are SF Symbols. ICON_HANDOFF lists specialised controls as an exception.

## 5. Owner decisions (answered)

The owner answered the questions in the first draft of this section as OD28 to OD33 in [the plan, section 8](../specs/2026-11-14-publish-finalize-plan.md). The decisions are recorded there, and they are not implemented in this docs branch.

| Question | Decision | Wave |
| --- | --- | --- |
| X1, release scope | OD28: iPhone only. The device family becomes `1`, and the checklist and preflight change together. | 3 |
| X2, Life Undo | OD29: Life keeps its single Undo/Redo row. Device step C4 decides; the claim of two rows is withdrawn (section 4). | Device, then 3 if needed |
| X3, removal verb | OD30: "Remove responsibility" in Classic, "Remove Life area" in Life. Delete `RoleDeleteConfirm` and `onDeleteRole`. | 3 |
| X4, haptic policy | OD31: completion is the only success haptic. Detent ticks, Edit enter and leave, and reveal snap stay. One rate-limited warning stays. The success impact after removal goes. | 3 |
| X5, over-capacity word | OD32: "over budget" in both roots. | 3 |
| X6 to X12 | OD33: accepted as proposed. | 3 |

Router: the owner said not to raise the router budget. X4 is recorded in `corrections/wave2-tokens-icons.md` as a "Haptics (OD31)" section.

## 6. Not verifiable here (device)

Layout at 390, 820 and 1024 pt. The Undo row's position above the home indicator, and whether a second Undo row ever appears on Life (OD29, step C4). Haptic feel and count. VoiceOver order and labels. Dynamic Type at the largest size. Reduce Motion behaviour. Widget and Live Activity rendering. Each is a step in [DEVICE_TEST_SCRIPT.md](DEVICE_TEST_SCRIPT.md). iPad is out of scope under OD28, but the build still targets it until wave 3 (X1).

## 7. What this PR does not change

No Swift, TypeScript or tests. Decisions OD28 to OD33 are recorded, and the code changes they require belong to wave 3. This review and the register record them but do not implement them.
