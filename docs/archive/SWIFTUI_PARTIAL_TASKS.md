# SwiftUI parity: partially completed tasks

> Historical inventory. PR #119/#120 are merged. Current continuation and verification: [release candidate](../evidence/swiftui-parity/release-candidate.md). The old no-test instruction below is superseded by the owner’s current release-build assignment.

**Source:** [docs/evidence/swiftui-parity/implementation-ledger.md](../evidence/swiftui-parity/implementation-ledger.md) (rows marked `PARTIAL (UNVERIFIED)`, plus the related gap and blocker register).
**Branch:** `claude/spread-swiftui-parity-87llx2` · **PR:** [#119](https://github.com/WGLewis0721/spread-app/pull/119) (draft).
**Status of everything below: UNVERIFIED. Nothing was built, tested, or run on a device.**

Each task lists what is already in code, what is still missing, and what is needed to finish it. Dependencies are marked:

- **[code]** can be finished by writing code now
- **[owner]** needs an owner decision first
- **[reference]** needs the owner's pre-migration binary (gap G0), so it cannot be measured or matched
- **[qa]** needs the separately authorised QA pass

---

## P1 · A02 · More sheet is partly complete

- **Done:** profile list and switch, layout choice (five modes), print or PDF, Word, and plain-text export, New Spread, Review open tasks, Rollover, and a Backup and restore link to the protected recovery surface.
- **Missing:** the light, dark, and system theme choice and the accent picker (gap G-4). iCloud and sync status are not surfaced (G-6, behind existing cloud flags).
- **Needed:** [owner] decide whether theme and accent belong in native. If yes, [code] add dispatcher intents that call the existing `setTheme` and `setAccent` store actions, then add the two controls.
- **Files:** `Sheets/ManageSheets.swift` (`MoreSheet`), `src/lib/spread/native-v2-dispatch.ts`.

## P2 · B03 · Typography, spacing, glass, and accent

- **Done:** semantic tokens transcribed from `src/styles.css`, system fonts at the CSS sizes, and the accent token.
- **Missing:**
  - The dock uses `ultraThinMaterial` plus the glass token. The CSS uses `blur(28px) saturate(1.7)`, which is not reproduced.
  - Spacing and radii are not measured against the reference.
  - Dynamic Type is not handled (see P10).
- **Needed:** [code] tune the glass treatment against the CSS values. [reference] measure spacing and card proportions once the binary is pinned.
- **Files:** `Theme/SpreadTheme.swift`, `Shell/SpreadLiveRoot.swift` (`dock`).

## P3 · C06 · Stack layout is missing its auto-turn

- **Done:** role rows stack as overlapping cards with shadow, the focused role opens, the others stay tucked, and all tasks remain reachable.
- **Missing:** Studio's auto-turning cards and the `studio-stack-pause` control (gap G-2). This is the rule in `src/lib/spread/studio/layouts.ts`: "Overlapping cards that turn on their own."
- **Needed:** [owner] confirm auto-turn is required, since it can steal hit testing. If yes, [code] add a timed turn that pauses on any touch, stops under Reduce Motion, and has a visible pause button of at least 44 pt.
- **Files:** `Spread/SpreadSurface.swift` (`StackLayout`).

## P4 · D06 · Sheet presentation details

- **Done:** detents, dialogs, and the rollover and remove copy matched to the React text.
- **Missing:**
  - The drag indicator is set only on `TaskSheet`. Other sheets use the system default.
  - Keyboard avoidance relies on the SwiftUI default plus `scrollDismissesKeyboard`.
  - Some sheet errors use alerts, while the React sheets used inline text. Inline text was not matched.
- **Needed:** [code] set `.presentationDragIndicator(.visible)` on every sheet, and decide alert versus inline for each error.
- **Files:** `Sheets/TaskSheet.swift`, `Sheets/ManageSheets.swift`, `Shell/SpreadLiveRoot.swift`.

## P5 · E01 · Cascade and week-seq motion

- **Done:** week slide (36 pt offset plus opacity) on week change, descend-in on allocation rows, and ascend-out on removal.
- **Missing:**
  - The staggered cascade used on profile switch (14 pt rise, 45 ms steps) is not replicated. Profile switch is opacity only.
  - Expanding a role does not cascade its tasks in.
  - Interruption behaviour has not been checked.
- **Needed:** [code] add a stagger modifier and apply it on profile switch and role expansion. [qa] check interruption.
- **Files:** `Theme/SpreadTheme.swift` (`SpreadMotion`), `Week/WeekSurface.swift`, `Spread/SpreadSurface.swift`.

## P6 · E02 · Sheet stack and dock press feedback

- **Done:** the gear turns 45° and −60° over 480 ms on press. Dock Done and Edit are in place.
- **Missing:**
  - The staggered sheet stack (rows at 20–220 ms, parting on close) is replaced by system sheet presentation.
  - Dock buttons have no pressed state. The CSS `button:active` rule scales to 0.95 and drops opacity to 0.72. SwiftUI `.plain` buttons do not do this.
- **Needed:** [owner] accept system sheets or request the stack. [code] add a `ButtonStyle` that reproduces the press scale and opacity, and apply it to dock and tab controls.
- **Files:** `Shell/SpreadLiveRoot.swift` (`dock`, `destinationRail`), `Theme/SpreadIcons.swift`.

## P7 · E03 · Week to Month morph

- **Done:** the dock icon morphs four bars into four boxes over 420 ms, and the month layer appears with an opacity change.
- **Missing:** shared-date geometry. The React transition carries the week layer out and the month layer in with transforms (gap G-3). The native version is opacity-based, so the dates do not stay visually linked.
- **Needed:** [code] use `matchedGeometryEffect` between week day cards and month cells, or design a transition. [reference] confirm the choice against the film.
- **Files:** `Theme/SpreadIcons.swift` (`MorphBars`), `Shell/SpreadLiveRoot.swift` (`openMonth`, `closeMonth`), `Week/MonthSurface.swift`.

## P8 · E04 · Layout physics for Fan, Dial, Tabs, and Day

- **Done:** one gesture owner each for Fan and Dial, Fan rubber band and 96 pt step, Dial hour-weighted angles and drag, Tabs slide direction, and Day chip load fill.
- **Missing:**
  - Spring constants are approximations of the Studio CSS. They are not calibrated.
  - Not implemented: the Tabs pop (`studio-tab-pop`), the Day chip fill animation (`studio-fill`, 640 ms), and the Dial count-up (`CountUp`, 420 ms).
- **Needed:** [code] add the three missing animations. [reference] calibrate all springs against recorded motion.
- **Files:** `Layouts/SpreadLayouts.swift`.

## P9 · E05 · Chalkboard motion cutouts

- **Done:** all 40 layers are transcribed with source, kind, box, pivot, amplitude, duration, and delay. Each layer runs on its own `TimelineView`, decoding is cached, the front Fan card is the only animated instance, and Reduce Motion pauses everything.
- **Missing:**
  - All kinds use a sinusoidal approximation. The exact keyframe curves were not transcribed, and `spin` is linear.
  - The FX overlays are not ported: steam, sparkle, shine, shimmer, speed, and glow (gap G-5).
  - The pivot mapping (origin relative to box) was derived by reading the spec, not checked against a rendered reference.
- **Needed:** [code] pull the keyframes from the Studio `render.css` and the doodle source on `spread-studio`, then port the FX. [reference] check pivots and amplitudes against the film.
- **Files:** `Chalk/ChalkboardViews.swift` (`ChalkMotionTable`, `MotionCutout`), `Resources/Motion/`.

## P10 · E09 · Dynamic Type, contrast, and reduced transparency

- **Done:** Reduce Motion gating in the shell, week, Fan, Dial, and Tabs, plus accessibility labels and actions across the surfaces.
- **Missing:**
  - Dynamic Type is not audited. Many views use fixed `Font.system(size:)` values, which do not scale.
  - Increase Contrast and Reduce Transparency are not handled.
  - Clipping at accessibility sizes is unknown.
- **Needed:** [code] convert fixed sizes to text styles or `@ScaledMetric`, and respect Reduce Transparency on the glass dock. [qa] test at accessibility sizes on 390 pt.
- **Files:** most `Sources/SpreadNativeV2/**` views. Start with `Shell/SpreadLiveRoot.swift`, `Week/WeekSurface.swift`, `Spread/SpreadSurface.swift`.

## P11 · F02 · Bank semantics in native steppers and refusals

- **Done:** the store enforces the bank. Native shows remaining hours and disables the role-sheet placement button when the bank is short.
- **Missing:**
  - The day-card Add path does not check the bank. The store decides, and the generic alert is shown.
  - Over-cap and zero-bank refusal copy is not confirmed against the store's messages.
  - Native steppers use ±1 h, matching React. The 0.5 h path is handled only by clamping to half hours.
- **Needed:** [code] surface the store's specific refusal reason instead of the generic alert. [qa] confirm over-cap and zero-bank behaviour matches the store.
- **Files:** `Week/WeekSurface.swift` (`DayCard`, `HourStepper`), `Sheets/ManageSheets.swift` (`RoleSheet`), `Planner/LivePlanner.swift` (`receive`).

## P12 · F07 · Export is implemented, backup and restore are blocked

- **Done:** print or PDF (system print from HTML), Word (lazy-loaded `docx`, shared as a file), and plain text (share). The export is read-only, not replay-protected, and never changes planner state.
- **Missing:**
  - The `.spread` backup and restore preview and confirmation are not built natively. CLAUDE.md forbids touching the backup and restore engine (exception **E-1**). The protected recovery surface remains.
  - The print layout is not matched to the React `WeekPaper` formatting.
  - Output has not been checked (PDF, Word file opens, text).
- **Needed:** [owner] decide E-1. [code] match print layout to `WeekPaper` if desired. [qa] check each export on device.
- **Files:** `Sheets/WeekExport.swift`, `src/lib/spread/native-v2-export.ts`, `src/lib/spread/native-v2-dispatch.ts` (`exportWeek`).

## P13 · F09 · App Store preparation and privacy manifest

- **Done:** accessibility labels, haptics on acknowledged completion only, `PhotosPicker` (no extra usage string needed), and keyboard-safe scrolling.
- **Missing:**
  - **[owner, blocked]** App Store metadata, screenshots, and privacy-label answers are owner-authored and were not created.
  - `PrivacyInfo.xcprivacy` was not changed. The native code now calls `UserDefaults` (view memory, crown hint, layout preference). Check that the manifest declares the required-reason API for that use.
- **Needed:** [owner] supply metadata. [code] review and update `PrivacyInfo.xcprivacy` for `UserDefaults`.
- **Files:** `ios/App/App/PrivacyInfo.xcprivacy`, `Planner/PlannerOrder.swift`.

---

## Related gaps and blockers (not partial rows, but they limit parity)

| ID | Item | Type | Needed |
| --- | --- | --- | --- |
| G0 · A01 | Owner's pre-migration installed binary not captured | [reference] | Capture binary, version, build ID, and device recordings. |
| G-4 | Theme and accent pickers not mirrored | [owner] | See P1. |
| G-6 | iCloud, sync, and conflict UI not surfaced | [owner] | Decide scope. Cloud stays behind existing flags. No sync claim. |
| G-7 | Unlock and beta gate not reproduced natively | [owner] | Confirm the WebKit host carries licence state. |
| G-8 | Studio "drawn" icon style not implemented | [owner] | Keep round badges as the default, or port the drawn style. |
| G-9 | Launch and splash parity not reviewed | [reference] | Compare against the reference launch. |
| G-11 · E-3 | Free-time mirror in Swift, no parity vectors | [code] [qa] | Add vectors against `free-time.ts`, or move free time into the projection (needs fixture updates). |
| E-4 | SF Symbols used for generic glyphs | [owner] | Confirm acceptable. |
| E-5 | Stack auto-turn | [owner] | See P3. |

---

## Suggested order

1. Compile review of all new Swift and TypeScript (see the watchlist in `docs/archive/SWIFTUI_HANDOFF_PROMPT.md`), because nothing has been built.
2. Code-only items that need no owner input: P4, P5, P6 press style, P8 missing animations, P9 keyframes and FX, P10 Dynamic Type, P11 refusal copy, P13 privacy manifest, G-11 vectors.
3. Owner decisions: P1 theme and accent, P3 auto-turn, P6 sheet stack, P12 E-1, G-6 through G-8, E-4.
4. Reference-dependent work once G0 is captured: P2, P7, P8 calibration, P9 pivot check, G-9.
5. QA pass, only when separately authorised.
