# SwiftUI working-build parity: implementation ledger (A01–F11)

**Scope:** [CLAUDE_SWIFTUI_HANDOFF.md](../../../CLAUDE_SWIFTUI_HANDOFF.md) strict checklist, executed in order on branch `claude/spread-swiftui-parity-87llx2` from the documentation-inclusive baseline `67f18fa` (PR #118 head).
> **Update, 2026-11-04.** Sections 1 to 6 are the original code-only record and keep their wording. The state of the
> app now, what was compiled and run, and what is still open is in **section 7**, which supersedes sections 5 and 6
> wherever they differ.

**Verification status of sections 1 to 6: UNVERIFIED** (they describe code written and read). See section 7 for what has since been compiled and run.

**Release verdict of the original code-only record: NO-GO** (nothing had been built or run). The owner authorised a merge and deploy on 2026-11-04; what that does and does not prove is in **section 7**. No App Store submission has been made.

## Status key

| Key | Meaning |
| --- | --- |
| `CODED (UNVERIFIED)` | Implemented in code and read back for the required behaviour. Never executed. |
| `PARTIAL (UNVERIFIED)` | Implemented in part. The gap is named in the row. |
| `BLOCKED` | An external dependency or an owner-only boundary stops the item. The independent code is done. |

## 1. Reference record (A01, A02)

| Item | Record |
| --- | --- |
| Pre-migration React source | `35b66522f30836d1eb74ca9758c6d3f24c0de2e3` (main before PR #109). Read: `src/spread/screens/spread-app.tsx`, `src/spread/components/{week-crown,weekly-view,month-view,task-sheet}.tsx`, `src/styles.css`, `src/spread/gestures/{swipe,activation}.ts`. |
| Studio layouts and motion | `origin/spread-studio` @ `5d2100548ce3a296134caaea497da5b9e9781ce5`. Read: `src/spread/components/studio/{layouts.tsx,doodle-motion.ts,render.css}`, `src/lib/spread/studio/layouts.ts`, `src/lib/spread/studio/tick.ts`. Chalk base art and 40 motion cutouts copied from `src/spread/assets/illustrations/`. |
| Frozen golden | `origin/golden/2026-09-28-app-store` @ `76ca350c` fetched and not edited. |
| Current native baseline | `main` @ `748b3ce` (`ios/SpreadNativeV2/**`), replaced in place by this branch. |
| **Installed owner reference binary** | **BLOCKED — reference build not captured.** No IPA, CFBundleVersion, Codemagic build ID, IPA checksum, or device recording is in the repository. Build 12 was **not** used as proof. Parity claims are therefore source-derived only. |
| Old-app feature inventory | Recorded from source below (A02). Tags: `React` = pre-migration 35b6652; `Studio` = spread-studio branch (owner-retained); `Golden` = frozen goldens (not read further). Absence versus unverified runtime behaviour is noted per row. |

### A02 feature inventory (source-derived)

| Old feature (source) | Tag | Native status |
| --- | --- | --- |
| Brand row, brand folds to mark after first touch / 3.5 s (`spread-app.tsx` WeekScreen) | React | CODED (UNVERIFIED) — `SpreadLiveRoot.brandButton`, fold state is per launch |
| Profile chip when >1 profile → More | React | CODED (UNVERIFIED) — `SpreadLiveRoot.header` |
| Metal Week Crown, 64 pt detents, caps, readout, hint until first use | React | CODED (UNVERIFIED) — `WeekCrownView` |
| Spread / Week segmented rail with icons | React | CODED (UNVERIFIED) — `SpreadLiveRoot.destinationRail` |
| Dock: Done (picked), Week/Month morph, Edit/Done, Settings gear | React | CODED (UNVERIFIED) — `SpreadLiveRoot.dock`, `SettingsGears`, `ViewMorphIcon` |
| Month grid (Sun-first), role dots, +N, pick day → week | React `month-view.tsx` | CODED (UNVERIFIED) — `MonthSurface` |
| Caption, role bubbles with remaining hours, selection | React `weekly-view.tsx` | CODED (UNVERIFIED) — `WeekSurface.bubbleStrip` |
| Free time suggestions (up to 3, lightest day, tap adds 1 h) | React `free-time.ts` | CODED (UNVERIFIED) — `FreeTimeMirror` (Swift mirror, see gaps) |
| To place tray: groups, ≤5 open, six then Show N more, Place/Move to, Take off | React | CODED (UNVERIFIED) — `ToPlaceTray`, `TaskLine` |
| Day cards Sun → Mon, Today, MM/dd, allocation rows, hour ±1, remove, fold tasks | React | CODED (UNVERIFIED) — `DayCard`, `AllocationRow`, `HourStepper` |
| Add-selected-spread button per day | React | CODED (UNVERIFIED) — `DayCard` |
| Week swipe 64 pt, 1.5× dominance, 24 pt edge guard, 72 pt shift | React `swipe.ts` | CODED (UNVERIFIED) — `WeekSwipeRules`, `WeekFollow` |
| Spread summary: total hours, colour bar jump, done count, caution > 45 h | React | CODED (UNVERIFIED) — `SpreadSurface.summary` |
| Rollover (confirm when next week has content) | React `RolloverDialog` | CODED (UNVERIFIED) — root `rollover()`, `RolloverConfirm` |
| Review open tasks → Open tasks sheet, Move N | React `CarryOverSheet` | CODED (UNVERIFIED) — `CarryOverSheet` |
| Role row: colour/category palette, inline rename, day marks, hours, expand tasks | React `RoleBlock` | CODED (UNVERIFIED) — `RoleRow`, `PalettePanel`, `DayMarks` |
| Edit mode: remove spread (danger) | React | CODED (UNVERIFIED) — `RoleRow.editing` |
| Task row: checkbox, text opens sheet, day label, Not today (undo) | React `TaskRow` | CODED (UNVERIFIED) — `TaskRow` |
| Add task row ("What matters most here?" / "Add a task") | React `AddTaskRow` | CODED (UNVERIFIED) — `AddTaskRow` |
| New Spread: multi-row, hours stepper, symbol, Save spreads | React `NewLifeSheet` | CODED (UNVERIFIED) — `NewSpreadSheet` |
| Remove dialog “Remove {name}?” | React `RemoveDialog` | CODED (UNVERIFIED) — `RoleDeleteConfirm` (copy matched) |
| Task sheet: title, Notes/Outline/Table/Photo, Expand, Remove block, Add menu, Delete | React `task-sheet.tsx` | CODED (UNVERIFIED) — `TaskSheet` |
| Profiles: switch, rename, remove, create, limit 10 | React `ProfilesSection` | CODED (UNVERIFIED) — `ProfilesSheet` |
| More: profiles, layout choice, Backup and restore, export | React `MoreSheet` | PARTIAL (UNVERIFIED) — `MoreSheet`; backup/restore is a boundary exception (section 4) |
| Print / PDF, Word, text export | React `WeekPaper`, `week-docx.ts` | CODED (UNVERIFIED) — `exportWeek` + `WeekExport` |
| Save failure banner, Retry saving, newer-version message | React toasts + native | CODED (UNVERIFIED) — root `notices` |
| Theme choice (light / dark / system) and accent picker | React `Segmented`, `ACCENTS` | **Not mirrored natively.** Appearance follows the device (B02). Gap G-4. |
| iCloud sheet, cloud sync, conflicts, safety copies | React | **Not surfaced natively.** Behind existing cloud flags; no sync claim made. Gap G-6. |
| Unlock / beta gate (`UnlockScreen`) | React | **Not reproduced natively.** Gap G-7. |
| Studio: five layouts (Stack, Fan, Dial, Tabs, Day) | Studio | CODED (UNVERIFIED) — `SpreadLayouts.swift`, `StackLayout` |
| Studio: 11 Chalkboard base art, 40 motion cutouts | Studio | CODED (UNVERIFIED) — `Resources/Chalk`, `Resources/Motion`, `ChalkMotionTable` |
| Studio: round badge vs drawn icon style (`icon-pref`) | Studio | **Not implemented.** Round category badge is the native default. Gap G-8. |

## 2. Checklist ledger (A01–F11)

Files are relative to `ios/SpreadNativeV2/Sources/SpreadNativeV2/` unless a path begins with `src/`, `ios/App/`, or `docs/`.

| ID | Checklist item | Status | Files / evidence | Notes and deviations |
| --- | --- | --- | --- | --- |
| A01 | Record old reference commit and build metadata; note missing data | `CODED (UNVERIFIED)` (record) / `BLOCKED` (binary) | section 1 of this file | Owner binary not in repo → G0 blocked. Source-derived translation continues per the handoff. |
| A02 | Record every old feature with tags and absence vs unverified | `CODED (UNVERIFIED)` | section 1, A02 table | Hidden sheet actions are included (Edit mode remove, Not today, Show more, Take off). |
| A03 | Current file ownership; map each old screen/sheet/control to a native component | `CODED (UNVERIFIED)` | section 3 below | Monolithic `LiveEditor` / `SpreadLiveRoot` split into focused views. |
| A04 | Preserve WebKit engine, guarded dispatcher, storage, backups, Swift/cloud wiring | `CODED (UNVERIFIED)` | `ios/App/App/SpreadBridgeViewController.swift` (host only), `src/lib/spread/native-v2-dispatch.ts` (additive) | No storage, backup, schema, or cloud file touched. `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**` untouched. |
| B01 | App-wide layout hierarchy, brand, safe areas, launch/return | `CODED (UNVERIFIED)` | `Shell/SpreadLiveRoot.swift` | Launch flow and `SpreadBridgeViewController` open/recovery logic unchanged. Splash/launch-storyboard parity not reviewed (G-9). |
| B02 | Semantic light AND dark tokens; remove forced dark | `CODED (UNVERIFIED)` | `Theme/SpreadTheme.swift`; `ios/App/App/SpreadBridgeViewController.swift` (`overrideUserInterfaceStyle` removed, status bar adaptive) | Tokens transcribed from `styles.css` `:root` light and dark. `Chalk` dark palette removed. |
| B03 | Typography scale, spacing, surfaces, glass, accent | `PARTIAL (UNVERIFIED)` | `Theme/SpreadTheme.swift` | Uses system fonts at the CSS sizes. Dynamic Type not audited. Glass uses `ultraThinMaterial` plus the token; not measured against the reference. |
| B04 | Logo, hand-crafted icons, gear | `CODED (UNVERIFIED)` | `Theme/SpreadIcons.swift`, `Resources/Icons.xcassets` (original SVG) | Generic lucide glyphs (plus, minus, chevrons, tray, clock, grip) use SF Symbols as Apple equivalents; unique art uses originals. |
| B05 | Floating glass dock; no extra tab bar | `CODED (UNVERIFIED)` | `Shell/SpreadLiveRoot.swift` (`dock`) | Dock is a capsule over the bottom edge, not a `TabView`. |
| B06 | Horizontal metal Crown, knurl, sheen, readout, caps, VoiceOver, haptic | `CODED (UNVERIFIED)` | `Shell/WeekCrownView.swift`; `Planner/PlannerOrder.swift` (hint key) | 64 pt detents via `CrownTravel`. Haptic: `.sensoryFeedback(.selection)` on the authoritative `weekKey` change. Not a circular dial. |
| B07 | Spread/Week segmented switch in actual position, stable selected states | `CODED (UNVERIFIED)` | `Shell/SpreadLiveRoot.swift` (`destinationRail`) | Two segments; Month is a mode inside Week. |
| C01 | Restore last view per profile without touching records | `CODED (UNVERIFIED)` | `Planner/PlannerOrder.swift` (`SpreadViewMemory`), `SpreadLiveRoot.onChange(profile)` | Keys `spread-view.<profile>`; `spread-crown-used`. Stored in UserDefaults (device convenience, never backed up by planner). Selected responsibility is not restored (React does not restore it either). |
| C02 | Week navigation: Crown, prev/next, Today, swipe, date pick, Month→Week | `CODED (UNVERIFIED)` | `WeekCrownView`, `WeekSurface.swipeGesture`, `MonthSurface`, `SpreadLiveRoot.pickDay` | Current profile and week are guarded by the existing dispatcher checks (`expectedProfileId`, `expectedWeek`). |
| C03 | Spread surface: total hours, colour strip, rows, cards | `CODED (UNVERIFIED)` | `Spread/SpreadSurface.swift` | Stack is the default Spread layout (role rows as one stacked card). |
| C04 | Week surface: bubbles, solid days, busy folding, empty days, tray, Free time | `CODED (UNVERIFIED)` | `Week/WeekSurface.swift`, `Week/ToPlaceTray.swift` | Busy-day folding: allocation tasks fold under the row; tray groups fold. |
| C05 | Month nested in Week, today marker, selected day | `CODED (UNVERIFIED)` | `Week/MonthSurface.swift` | Week→Month uses a shape morph on the dock icon and an opacity/offset layer change (see E03). |
| C06 | Stack layout: overlapping cards, focused responsibility, task accessibility | `PARTIAL (UNVERIFIED)` | `Spread/SpreadSurface.swift` (`StackLayout`) | Studio's auto-turning and pause control (`studio-stack-pause`) are **not** implemented (gap G-2). Focus and tasks are implemented. |
| C07 | Fan: physical fan, selected front card, direct gestures, depth order | `CODED (UNVERIFIED)` | `Layouts/SpreadLayouts.swift` (`FanLayout`) | Rotation 13°/card, pivot 185%, rubber band, step 96 pt, ±2 steps per gesture. Motion calibration not performed. |
| C08 | Dial: hours-weighted radial segments, not the Crown | `CODED (UNVERIFIED)` | `Layouts/SpreadLayouts.swift` (`DialLayout`), `DialGeometry.swift` | Same proportional segmentation as Studio `dialSegments`; drag or adjustable selects. |
| C09 | Tabs with All and per-role views, one active state | `CODED (UNVERIFIED)` | `Layouts/SpreadLayouts.swift` (`TabsLayout`) | Panel slides from the tab's side. |
| C10 | Day: day-by-day glimpse of allocated hours, not calendar events | `CODED (UNVERIFIED)` | `Layouts/SpreadLayouts.swift` (`DayLayout`) | Chips fill by load; timeline uses placed blocks only. |
| C11 | Five modes in Spread; switching never writes planner data | `CODED (UNVERIFIED)` | `Spread/SpreadSurface.swift` (`layoutPicker`), `Planner/PlannerOrder.swift` (`SpreadLayoutPreference`) | Mode is a device preference in UserDefaults; no `send` on change. |
| C12 | More/Settings, profile, New Spread, edit/delete discoverable | `CODED (UNVERIFIED)` | `Sheets/ManageSheets.swift` (`MoreSheet`, `NewSpreadSheet`, `RoleSheet`), `SpreadLiveRoot.dock` | Three-tap principle: Settings → More → action. |
| D01 | Reuse all 11 base images as-is | `CODED (UNVERIFIED)` | `Resources/Chalk/*.webp` (byte-identical to `spread-studio`, hash-checked); `Chalk/ChalkboardViews.swift` (`ChalkIllustration`) | Used on the Fan front card and the responsibility sheet header. |
| D02 | Category tile/glyph relationship, role dots, icon sizing, chosen state | `CODED (UNVERIFIED)` | `Theme/SpreadIcons.swift` (`RoleBadge`), `Resources/Icons.xcassets/category-glyph-*` | Glyphs derived from original category SVG by deleting only the tinted circle. Sizes: 36 pt role header, 40 pt Fan, 32 pt Day (ICON_SPEC). |
| D03 | Role create/edit, colour/category, expansion, hours, destructive as sheets/menus | `CODED (UNVERIFIED)` | `Sheets/ManageSheets.swift` (`RoleSheet`), `Spread/SpreadSurface.swift` (`PalettePanel`) | Colour and category are native writes (`setRoleColor`, `setRoleCategory`). |
| D04 | To place grouped by responsibility, folds, grip, Place/Move, Show more | `CODED (UNVERIFIED)` | `Week/ToPlaceTray.swift` | Thresholds: open-all ≤5 tasks; preview 6. Dashed border distinguishes it from day cards. |
| D05 | Rich task editor: Notes, Outline, Table, Photo, attachments, IDs | `CODED (UNVERIFIED)` | `Sheets/TaskSheet.swift`, `src/lib/spread/native-v2-dispatch.ts` (existing `readTaskContent`/`setTaskContent`) | Unknown block kinds are shown read-only and never re-sent. Photo is JPEG data URL, as before. |
| D06 | Sheet detents, grabbers, focus, keyboard, confirmation, quiet Undo | `PARTIAL (UNVERIFIED)` | `Sheets/*.swift`, `Shell/SpreadLiveRoot.swift` | Detents and dialogs done. Grabber is system-provided on most sheets. Keyboard avoidance uses `scrollDismissesKeyboard`. |
| D07 | New Spread, selected-day add, hour stepper, Free time chips, rollover, review | `CODED (UNVERIFIED)` | `Sheets/ManageSheets.swift`, `Week/WeekSurface.swift`, `Shell/SpreadLiveRoot.swift` | Rollover confirm copy matched to React. |
| E01 | Cascade, week-seq, descend-in, ascend-out as interruption-safe animations | `PARTIAL (UNVERIFIED)` | `Theme/SpreadTheme.swift` (`SpreadMotion`), `Week/WeekSurface.swift` (`weekTransition`), `Week/WeekSurface` (`DayCard` transition), `Spread/SpreadSurface.swift` | Week slide and descend/ascend implemented. Per-item cascade on profile switch is not replicated (opacity only). |
| E02 | Sheet stack, dock feedback, gear turn, pressed state | `PARTIAL (UNVERIFIED)` | `Theme/SpreadIcons.swift` (`SettingsGears`), `Shell/SpreadLiveRoot.swift` | Gear turns 45°/−60° over 480 ms. System sheet presentation replaces the staggered sheet stack (system sheets, owner review). |
| E03 | Week→Month morph preserving shared dates | `PARTIAL (UNVERIFIED)` | `Theme/SpreadIcons.swift` (`MorphBars`), `Shell/SpreadLiveRoot.swift` (`openMonth`/`closeMonth`) | Dock icon morphs 4 bars ↔ 4 boxes over 420 ms. Content transition is opacity-based, not geometry-matched; no shared-date geometry animation (gap G-3). |
| E04 | Native Stack/Fan/Dial/Tabs/Day physics, one gesture owner, no first-swipe delay | `PARTIAL (UNVERIFIED)` | `Layouts/SpreadLayouts.swift` | Fan and Dial have single gesture owners. Dial and Fan spring constants are approximations of the Studio CSS, not calibrated against film. |
| E05 | Nine cutout motion kinds from original layer boxes, pivots, amplitudes | `PARTIAL (UNVERIFIED)` | `Chalk/ChalkboardViews.swift` (`ChalkMotionTable`, `MotionCutout`) | All 40 layers, kinds, boxes, pivots, amplitudes, durations, delays are transcribed. Easing is sinusoidal; the Studio CSS keyframes were not available for exact curves. **FX overlays not ported** (steam, sparkle, shine, shimmer, speed, glow): gap G-5. Motion pauses under Reduce Motion. |
| E06 | Drag activation intent, role/day highlight, refused drop, non-drag alternatives | `CODED (UNVERIFIED)` | `Week/WeekSurface.swift`, `Week/ToPlaceTray.swift`, `Gestures/SpreadGestures.swift` | Native `draggable`/`dropDestination` (system long-press). Tap alternatives: Place/Move to, Add, Free time, steppers, Take off. Refused drop shows a message. |
| E07 | Week swipe arbitration: 64 pt, 1.5×, 24 pt edge, 72 pt shift; no vertical scroll steal | `CODED (UNVERIFIED)` | `Gestures/SpreadGestures.swift` (`WeekSwipeRules`), `Week/WeekSurface.swift` | Uses `simultaneousGesture` with minimum distance 10 and a horizontal-dominance check. Not verified against system back-gesture. |
| E08 | Light completion haptic after ACK only; six-second Undo; failure text | `CODED (UNVERIFIED)` | `Planner/LivePlanner.swift` (`send`), `Theme/SpreadTheme.swift` (`SpreadHaptics`), `Shell/SpreadLiveRoot.swift` (undo task) | Haptic only when `reply.ok`. iPhone only. Undo bar hidden after 6 s; the store's own undo rules still decide what can be undone. |
| E09 | Reduce Motion, Dynamic Type, dark/light, interruption; labels and actions | `PARTIAL (UNVERIFIED)` | throughout; `SpreadMotion.resolved` | Movement removed under Reduce Motion in shell, week, fan, dial, tabs. Dynamic Type not audited (fixed sizes in several places, gap G-10). |
| F01 | Responsibility/colour/hours route to existing store commands | `CODED (UNVERIFIED)` | `native-v2-dispatch.ts` (`setRoleColor`, `setRoleCategory`, `setHours`, `renameRole`, `removeRole`) | Store actions only; no Swift scheduler. |
| F02 | Bank semantics: 0.5 h changes, add/move/reorder/remove, zero bank, over-cap | `PARTIAL (UNVERIFIED)` | `Week/WeekSurface.swift` (`HourStepper` ±1 h), `Sheets/ManageSheets.swift` (`RoleSheet` place) | Store enforces bank rules; native shows remaining hours and disables over-bank placement. Half-hour step not exposed in the day stepper (React uses ±1 h too). |
| F03 | Task actions update native state only after committed reply | `CODED (UNVERIFIED)` | `Planner/LivePlanner.swift` | State, details, and undo id change only from the reply. |
| F04 | Eligible-day placement, move/unplace, Not today, denied drop, 6 s Undo | `CODED (UNVERIFIED)` | `Week/ToPlaceTray.swift`, `Spread/SpreadSurface.swift` (`TaskRow.notToday`), `native-v2-dispatch.ts` (`assignTask`) | Wrong-role drop refused with explanation. |
| F05 | Deterministic rollover and Review open tasks; collision confirmation | `CODED (UNVERIFIED)` | `Shell/SpreadLiveRoot.swift` (`rollover`), `Sheets/ManageSheets.swift` (`CarryOverSheet`), `native-v2-dispatch.ts` (`rollover` returns outcome) | Confirmation shown when the store reports `confirm`. |
| F06 | Profiles: select/create/rename/delete to 10; per-profile isolation | `CODED (UNVERIFIED)` | `Sheets/ManageSheets.swift` (`ProfilesSheet`), `native-v2-dispatch.ts` (`renameProfile`, `removeProfile`) | Selection and week reset on profile change. |
| F07 | Export, printable Week/PDF, Word, `.spread` backup and restore | `PARTIAL (UNVERIFIED)` | `Sheets/WeekExport.swift`, `src/lib/spread/native-v2-export.ts`, `native-v2-dispatch.ts` (`exportWeek`) | Print/PDF (system print), Word (share sheet, lazy-loaded `docx`), text: **implemented**. **`.spread` backup and restore: BLOCKED** by the repository boundary (section 4, E-1). The existing recovery route remains. |
| F08 | Save-failure, retry, newer data, offline, resume, restore-blocked, permissions | `CODED (UNVERIFIED)` | `Shell/SpreadLiveRoot.swift` (`notices`), `Planner/LivePlanner.swift` | Success never shown before an ACK. No network dependency added. Cloud features remain behind flags, unclaimed. |
| F09 | Native affordances, privacy manifest, metadata, account-free presentation | `PARTIAL (UNVERIFIED)` | accessibility labels across views; `PhotosPicker` (no extra permission string needed) | **BLOCKED (metadata):** App Store metadata, screenshots, and privacy-label text are owner-authored deliverables and were not created. The existing `PrivacyInfo.xcprivacy` was not changed. |
| F10 | Remove stale placeholder UI; keep Debug fixtures, legacy engine, goldens | `CODED (UNVERIFIED)` | removed `WeekPreviewView.swift`, `NativePreview.swift`, `ChalkboardViews.swift` (root), old `SpreadLayoutsView.swift`, `TaskContentEditor.swift` | `SpreadV2Fixture` retained for tests. React renderer, goldens, cloud, backup, and storage untouched. |
| F11 | Governing docs and final code-status ledger | `CODED (UNVERIFIED)` | this file; `ios/SpreadNativeV2/README.md` (status note) | Ledger is the only status record; no release-readiness claim. |

## 3. File ownership map (A03)

| Native file | Owns | Replaces |
| --- | --- | --- |
| `Theme/SpreadTheme.swift` | semantic tokens, motion curves, undo window, haptic | dark `Chalk` palette |
| `Theme/SpreadIcons.swift` | `SpreadIcon`, brand mark, role badge, gears, morph icon, destination enum | inline icon views |
| `Planner/LivePlanner.swift` | planner model, correlated send, export request, sheet enum | the view code of the old `LivePlanner.swift` |
| `Planner/PlannerOrder.swift` | Sunday-first order, free-time mirror, view memory, layout preference | — |
| `Shell/SpreadLiveRoot.swift` | root, header, rail, dock, notices, undo, sheet routing | old `SpreadLiveRoot` |
| `Shell/WeekCrownView.swift` | Crown | old Crown |
| `Week/WeekSurface.swift`, `Week/ToPlaceTray.swift`, `Week/MonthSurface.swift` | Week and Month bodies | old `week(_:)` and `month(_:)` |
| `Spread/SpreadSurface.swift` | Spread summary, picker, role rows, tasks, Stack | old Spread list |
| `Layouts/SpreadLayouts.swift` | Fan, Dial, Tabs, Day | old `SpreadLayoutsView` |
| `Chalk/ChalkboardViews.swift` | base art and motion | old chalk card |
| `Gestures/SpreadGestures.swift` | drag payload, hour rules, swipe rules | — |
| `Sheets/TaskSheet.swift` | rich task editor and content types | old `TaskContentEditor` |
| `Sheets/ManageSheets.swift` | New Spread, Role, Open tasks, Profiles, More | old `LiveEditor` |
| `Sheets/WeekExport.swift` | print, Word, text presenters | — |

## 4. Boundaries and owner exceptions (CLAUDE.md: list, never design around silently)

| ID | Item | Why it is an exception | Owner decision needed |
| --- | --- | --- | --- |
| E-1 | Native `.spread` backup and restore preview/confirmation (F07) | `CLAUDE.md` forbids touching backup and restore. Native UI cannot call the restore engine without changing that boundary. The protected recovery surface (`openRecovery`) stays available and is labelled **Backup and restore**. | Approve a native backup/restore route, or keep the recovery surface as the permanent route. |
| E-2 | Dispatcher additions (`exportWeek`, `renameProfile`, `removeProfile`, `rollover`, `moveSpreadToDay`, `moveAllocation`, `setRoleColor`, `setRoleCategory`) | Additive intents in `native-v2-dispatch.ts`. Each calls an existing store action. No schema, storage, or backup file changed. | Confirm these are acceptable in the native dispatcher. |
| E-3 | Free-time mirror in Swift (`FreeTimeMirror`) | Read-only suggestion logic duplicated from `free-time.ts`. No write is made by the mirror. | Prefer moving free-time into the projection, which needs fixture updates. |
| E-4 | Generic UI glyphs as SF Symbols | Apple equivalents for lucide glyphs (plus, minus, chevrons, tray, clock, grip). Original brand art stays original. | Confirm acceptable. |
| E-5 | Studio auto-turning Stack | Not implemented (gap G-2). Requires animation that steals hit testing unless carefully designed. | Decide whether to build it. |

## 5. Gaps, blockers, and deferred checks

### Gaps (named, not hidden)

| ID | Gap | Impact |
| --- | --- | --- |
| G-0 | Owner reference binary not captured (G0) | No visual or motion parity can be claimed. |
| G-2 | Stack auto-turn and pause control not implemented | Studio stack motion absent. |
| G-3 | Week↔Month shared-geometry morph not implemented | Transition is opacity and offset, not matched geometry. |
| G-4 | Theme choice (light/dark/system) and accent picker not mirrored | Appearance follows the device. |
| G-5 | Motion FX overlays not ported (steam, sparkles, shine, shimmer, speed, glow) | Motion less rich than Studio. |
| G-6 | iCloud/sync/conflict UI not surfaced | Behind existing cloud flags; no sync claim. |
| G-7 | Unlock/beta gate not reproduced natively | Native assumes the WebKit host already has its licence state. |
| G-8 | Studio "drawn" icon style not implemented | Round category badges only. |
| G-9 | Launch/splash parity not reviewed | Not checked against reference. |
| G-10 | Dynamic Type and Increase Contrast not audited; some fixed font sizes | Accessibility sizes unverified. |
| G-11 | Free-time parity vectors not written | `FreeTimeMirror` is unverified against `free-time.ts`. |

### Deferred checks (for the separately authorised QA pass; none were run)

- Swift package tests, `xcodebuild` simulator build, UI tests, device runs at 390/820/1024 pt, light and dark, Reduce Motion, Dynamic Type.
- Crown 100 actions + 30 reversals (0 phantom weeks); Stack/Fan 100 rapid gestures each.
- TypeScript typecheck, lint, unit tests for the dispatcher (including the new intents), and parity vectors (≥50 TS/Swift).
- Motion sampling against reference film; haptic and touch latency on hardware.
- Export validation (print/PDF output, Word file opens, text).
- Owner reference capture (G0) and side-by-side screenshot matrix.

### External blockers

| Blocker | Stops |
| --- | --- |
| Owner pre-migration installed build and artifacts not in repository | G0, every visual parity claim |
| App Store metadata, screenshots, privacy-label text (owner-authored) | F09 metadata |
| Owner decision on E-1 (backup/restore route) | F07 backup/restore |

## 6. Release status

**UNVERIFIED. NO-GO.**

- Implementation: code written for A01–F11 with the gaps and blockers listed above.
- Verification: none performed, by instruction. Every item is unverified.
- Release: not authorised. No merge, deployment, Codemagic/TestFlight upload, or App Store submission was made.

## 7. Native visual correction pass (PR #119, 2026-11-04)

**Scope.** Fix the existing SwiftUI app so it matches the owner-approved native direction
([brand board](../../design/planner/SPREAD_NATIVE_BRAND_BOARD.md), [specimen](../../design/planner/SPREAD_NATIVE_VISUAL_SPECIMEN.svg)),
keeping every feature and the headless planner engine. Native SwiftUI only: no React, schema, cloud, backup or server file changed.

**Reference limit (read first).** The owner's TestFlight screenshots, old light-mode screenshots and approved dark designs
live in a chat and are not in the repository. They could not be viewed in this session, so no claim here is a comparison against
them. The captures below are real simulator screenshots of this repository (after = this branch), compared with the SVG specimen and the written brand board only.

### What changed (visible)

| Area | Before | After |
| --- | --- | --- |
| Palette | system grays, forced to look like iOS defaults | calm navy canvas, quiet navy surfaces, recessed inset, near-white ink, one action blue; cream/white light mode on the same layout |
| Header | three stacked rows, brand folded away after 3.5 s | brand + Spread/Week switch on one row, metal Crown below; nothing resizes after launch |
| Crown | flat grays, arrows unmarked | cool-steel ribs, recessed centre, chevrons inside the recess in 94 pt buttons |
| Spread | plain list in one card | summary card with an hour-proportional bar; illustrated role cards (lit category tile, Chalkboard art, bounded role-colour edge), one open at a time |
| Fan / Tabs / Day | solid slabs, white-on-ink selection | same card language; lit-blue selection |
| Week / Month | flat cards | day cards with Today edge, tiles on allocations, open week marked in Month, two-column days on iPad |
| Sheets | stock grouped forms | one container (navy canvas and bar), Task header with role and Mark done, Move to as a real sheet, New Spread previews its card |
| Launch | gray flash | navy / cream launch colours |

### Evidence (what was actually run and seen)

Head `16382e5`. Screenshots: [`screenshots/2026-11-04/`](screenshots/2026-11-04/README.md).

| Check | Result | Notes |
| --- | --- | --- |
| Planner: `npm run test:spread` | **432 pass** | +10 dispatcher tests for the new intents; `--min` raised |
| TypeScript typecheck, lint, `test:scripts`, docs check | **pass** | lint 0 errors, 7 warnings; 4 existing skips in scripts |
| Swift package tests (Linux, portable layer) | **24 pass** | +6 (hour strip, Crown phantom-release invariant, month marks) |
| macOS: SwiftUI compiled for iOS simulator (`native-ios-compile`) | **pass** | plus portable-contracts, swift-core, CloudKit typecheck, bridge-sims, App Store source checks |
| Full app built and launched in the iOS Simulator | **pass** | iPhone (393 pt) and iPad Air (820 pt): the tour ran to the end on both |
| Real screenshots, **light** appearance | **seen** | Spread (Stack, Fan, Dial, Tabs, Day), Week, Month, More, Task sheet, large text, iPad |
| Real screenshots, **dark** appearance | **NOT captured** | the tour's dark flag is ignored on this iOS; every "dark" capture is light (measured). Dark is verified by token contrast arithmetic only. |
| BEFORE screenshots | **NOT captured** | the BEFORE job did not compile (workflow swaps old sources but kept a new host file); no old-vs-new pair exists |
| Owner reference images | **UNVERIFIED** | in the owner's chat, not in the repository; never viewed |
| Flow tests (create spread, add/complete task, place hours + Undo, Crown caps, Month to Week, Move to) | **result not recorded here** | job still running when this was written; see the run |
| Layout acceptance (390 / 820 / 1024) | **result not recorded here** | job still running when this was written |
| Inherited UI tests and journeys (`PlannerUITests`, `JourneyUITests`: Crown 100 drags, Stack/Fan 100 swipes, accessibility audits) | **NOT run on this UI** | cancelled by the author to free runners, and they target the previous UI's labels and identifiers (More, New responsibility, Save hours, `card-more-tasks`, `selected-day-`); they need adapting before they mean anything |
| Device (physical iPhone) | **NOT run** | haptics, Crown feel, motion, thermal |

### What the real captures show, and what they expose

Seen working (light): brand plus Spread/Week switch on one row; metal Crown with chevrons inside the recess; hour summary
with a proportional bar; illustrated role cards (lit category tile, Chalkboard art, role-colour edge, hours, tasks, menu);
five distinct modes with the Dial intact; Week with Free time chips, a dashed To place tray and solid day cards with a Today
edge; Sunday-first Month; Move-to and Task sheets in the same container; iPad two-column days.

Open defects seen in them (details in the screenshots README): layout switcher wraps mid-word at accessibility text size;
empty day cards keep a tall blank area; Week and Day list days newest first (parity with the original unverified); Crown ribs
read as hard stripes; floating dock covers the last rows until scrolled; the tour never reached the New Spread sheet.

### P1 to P13 (partial-task list), reconciled
| P | Item | Status after this pass | Evidence / what is still open |
| --- | --- | --- | --- |
| P1 | More: theme, accent, iCloud | **Partly done.** System / Light / Dark is a device-local choice in More (UserDefaults, no planner write). Accent picker **not built**: the brand board fixes one action blue. iCloud/sync not surfaced (cloud flags, no claim). | Owner decision: accent picker, iCloud surface. |
| P2 | Typography, spacing, glass | **Done in code.** Navy/cream tokens, text styles, shared card and chip surfaces. Dock uses a system material plus the token; the CSS `blur(28px) saturate(1.7)` is not reproduced. | Compare against the owner's dark designs (not viewable here). |
| P3 | Stack auto-turn | **Not built (owner decision E-5).** The Stack is now a vertical card stack that opens one card at a time; Studio's self-turning cards are not implemented. | Owner decision. |
| P4 | Sheet presentation | **Done.** One sheet container (canvas, bar, tint, drag indicator); More and Profiles open at medium; errors stay alerts (save problems offer Retry/Backup, refusals only OK). | Inline-vs-alert per error is a style call. |
| P5 | Cascade / week-seq motion | **Partly done.** Week slide now plays (it never did); cards open with the shared curve. Profile-switch stagger not built. | Interruption behaviour needs a device. |
| P6 | Sheet stack, press feedback | **Press feedback done** (scale 0.95 / opacity 0.72, scale dropped under Reduce Motion). System sheets kept (owner decision on the staggered stack). | Owner decision. |
| P7 | Week to Month morph | **Not done.** Week and Month still cross-fade; Month marks the open week. | Needs matched geometry design. |
| P8 | Fan, Dial, Tabs, Day physics | **Restyled, physics unchanged.** Tabs pop, Day fill animation and Dial count-up not built. | Calibration needs the reference recording. |
| P9 | Chalkboard motion | **Geometry fixed** (cutouts were laid out on a square instead of the 393x273 art). Curves remain sinusoidal; FX overlays not ported. | Keyframes live on the spread-studio branch. |
| P10 | Dynamic Type, contrast, transparency | **Done in code:** 100 fixed sizes became text styles, Increase Contrast and Reduce Transparency handled. Accessibility-size layout verified only where the large-text tour ran. | See evidence. |
| P11 | Bank refusal copy | **Partly done:** refusals have specific text for ineligible days; zero-bank / over-cap use the store's generic refusal. | Needs a store-side reason code (a TypeScript change). |
| P12 | Export and backup/restore | **Export done** (print/PDF, Word, text). Native `.spread` backup/restore **blocked (E-1)**; the recovery surface stays. | Owner decision. |
| P13 | Privacy manifest | **Verified by reading:** UserDefaults (CA92.1) and file timestamps are declared. App Store metadata is owner-authored. | Owner supplies metadata. |


### Owner decisions still open

Accent picker (the brand board fixes one blue); Stack auto-turn (E-5); staggered sheet stack; `.spread` backup/restore (E-1);
iCloud surface (cloud flags stay off, no claim); the G0 reference binary and the owner's chat images.

### Release state of this section

Merge and TestFlight were authorised by the owner on 2026-11-04 ("merge and deploy what you have done so far"). That is
permission, not verification: dark appearance, BEFORE comparison, the inherited UI tests and a physical device are all
unverified. The Codemagic workflow `spread-pr119-internal-testflight` builds only the branch
`claude/spread-swiftui-parity-87llx2` at its exact tip and is launched by hand in the owner's Codemagic account.
