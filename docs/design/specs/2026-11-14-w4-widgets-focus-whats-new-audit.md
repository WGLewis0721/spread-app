# Spec: Focus timer, widgets, Live Activity and What's New, audit and fit (W4)

> Part of the [design brain](../README.md). Size M. Read with [PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Builds on [section 22 to 24 of the widget continuity spec](2026-11-13-widgets-timer-life-cards-continuity.md), [focus Live Activity](2026-11-12-focus-live-activity.md), [Today widget](2026-11-12-today-widget.md) and [What's New](2026-11-12-whats-new-every-update.md).

**Status:** Implemented on branch `claude/w4-focus-widgets-whats-new`, as a draft pull request. Not compiled here (no Swift toolchain). Device checks in section 9 are owed.

## 1. Problem

On the Home Screen the Timer, Today and Life card widgets were laid out for their sizes, but several were not checked against fit, Dynamic Type, text size and rendering mode. The Life cards labels were fixed 9 to 14 pt and ignored Dynamic Type. Spread's What's New copy described the Timer widget's old controls, which no longer match the code. The goal is to fix what is broken, make the surfaces consistent, and record what only a device can confirm.

## 2. Evidence and context

**Audit method.** Each surface was read in its source and checked against the Apple widget sizes on a 390 by 844 pt screen (small 158 by 158, medium 338 by 158, large 338 by 354), the 16 pt standard margin, text of 11 pt or more, and the Dynamic Type range [Apple, widgets page]. Heights are estimates from the default type sizes. They are not measured on a device.

| Surface and state | Finding | Change | Status |
| --- | --- | --- | --- |
| Timer medium, running and paused | Face plus a 44 pt row is about 135 pt in a 134 pt area. Spec 24 recorded a clipped top line on device. | `ViewThatFits`: the progress bar goes first, then the round line. | Fixed. Device owed. |
| Timer large, all states | Labelled controls wrapped (fixed earlier). Icons in fixed 44 pt circles overflow at accessibility sizes. | Icon row capped at `xxxLarge`. The face keeps the full range. | Fixed. Device owed. |
| Timer small | Three 44 pt controls need 132 pt, so the system 16 pt margin (126 pt usable) cannot hold them. | Kept: margins disabled, 2 pt side padding (PR #206). See exception E1. | Audited, exception. |
| Timer idle, switch off | Says "Timer is off" and the way to turn it on. | None. | Audited. |
| Timer compact and minimal island glyphs | Symbols had no spoken name. | Spoken name: Focus, Break, Paused, Stopped, Done. | Fixed. |
| Timer and sheet Forward | Spoken as "Forward to Start break" in the sheet, and "Start break" alone on the widget. | Widget: "Forward: Start break". Sheet: "Forward: ..." when a step follows, or "Forward unavailable, no next step". | Fixed. |
| Today small | Counters and the hours line are about 127 pt in 126 pt at default. | Column rhythm 8 to 6 pt. | Fixed. |
| Today medium, timer panel | About 90 pt in 126 pt. The panel's status, round, digits, bar and title fit. | None. | Audited. |
| Today accessory circular and rectangular | Labelled. The rectangular line truncates at one line. | None. | Audited. |
| Life medium, default text | Header 44 pt plus name, budget and strip is about 133 pt in 126 pt. | Two tiers: the budget line drops first. Pill padding 2 pt. Name at `.headline`. | Fixed. Device owed. |
| Life large | Fits (about 220 pt in 322 pt). | Sizes moved to text styles: `.largeTitle` name, `.title` budget. | Fixed. |
| Life all sizes | Fixed 9 to 14 pt labels; the brand and "THIS WEEK" at 10 pt, below the 11 pt minimum. | Every label is a text style (caption2 is 11 pt at default). | Fixed. |
| Life arrows | 44 pt targets, icon fixed at 14 pt. | Icon is `.subheadline`. Target stays 44 pt. | Fixed. |
| Life, tinted, accented and clear | Artwork and a fixed hex palette ignore the rendering mode. | Full colour keeps the art and palette. Other modes use the system colours and `.fill.tertiary`, with no artwork. See E4. | Fixed. Device owed. |
| Life, light and dark | Dark card palette on artwork; light palette on cream. | None. | Audited. |
| Live Activity lock screen and expanded | Controls are 44 pt icons with their names as labels. | None. | Audited. |
| Live Activity compact and minimal | Compact trailing has no text at the paused, waiting and done states. | Spoken status added (see Timer row above). | Fixed. |
| In-app focus sheet | Stop, Forward, Cancel and Pause each 44 pt with a label and hint. Forward disabled with a reason. Cancel has no confirmation or Undo (see E6). | Forward wording only. | Fixed, E6 open. |
| Notifications | Plain text. No Life names, task text or clock times. | None. | Audited. |
| What's New sheet | Number column fixed at 28 pt, which clips at larger text. Release copy said the Timer widget shows one control at small and two at medium. | Column is a minimum width. Copy corrected to the three controls at each active size, plus Stop at large. | Fixed. |
| Reduce Motion | Widgets, the island and the sheet do not animate. The countdown is system timer text. | None. | Audited. |
| Haptics | No haptic on focus surfaces. Haptics are a task-completion rule only. | None. | Audited. |

**Library reading.** [Gray Matter TACTILE_MOTION_AND_DEVICE_QA.md](https://github.com/WGLewis0721/Graymattertechllc-) (read-only clone, `app-design/`) asks for semantic haptics, Reduce Motion and Dynamic Type checks, and says simulator recordings cannot verify haptic quality. Its SECURITY_AND_RELEASE checklist asks that motion and haptics stay interruptible. No new motion was added here.

## 3. Goals, non-goals and budget

**Goals.** Nothing clipped at the default size or at larger Dynamic Type sizes. Text never below 11 pt. Every icon control has a spoken name. Widgets draw correctly in full colour, tinted, accented and clear. The What's New copy matches the code.

**Non-goals.** No change to the focus rules (`SpreadFocusControlRules`), the timer, the store, the planner, the intents or the data. No new colour, font or token. No new file, so the widget target's file list is unchanged. No change to the Timer's control set, which PR #206 and PR #229 settled.

**Budget.** About 150 lines across five Swift files, one copy file and the tests. No migration.

## 4. Rules that apply and exceptions needed

- Spread rules card: status is never colour alone (the widgets show words with the symbols); targets are at least 44 pt (kept on every control); no new colour or font (none added); no cloud, sync, backup or restore file touched; nothing claims iCloud works.
- Life names appear only when the person has turned on their switch (Life cards widgets, or the name switch for the focus timer). Not changed.
- Exceptions are listed in section 8 for the owner.

## 5. Options and the chosen concept

**Medium fit.** Options: (a) side column of three stacked controls, which needs about 140 pt, more than the medium area; (b) two controls at medium, which contradicts PR #206 and PR #229; (c) keep the bottom row and let `ViewThatFits` drop the progress bar and round line. **Chosen: (c).** It keeps every control, and it keeps the layout the tests check.

**Life medium fit.** Options: (a) smaller type throughout; (b) drop the header; (c) `ViewThatFits` with the budget line first to go. **Chosen: (c)**, with text styles, so the name keeps its hierarchy at default size.

**Rendering modes.** Options: (a) keep the art in every mode; (b) semantic colours and no artwork outside full colour. **Chosen: (b)**, because tinted and clear modes recolour the widget and a photograph-like card reads as noise there.

**Breadboard.** The Timer widget: face, then the control row (Pause or Resume, Forward, Cancel), then at large Stop, Ends at and Today. The Life widget: header with the brand and arrows, name, budget line and strip, with the budget line first to drop.

**States.** Running, paused, waiting for a tap, finished, stopped early, idle, switch off, no Life cards, Life cards from an earlier week, a single Life card (no arrows), and Dynamic Type at AX sizes. Each is covered by the existing rule set or by the tiers above.

## 6. Platform behavior

- **Widths and heights.** Widget sizes from Apple, with the default type sizes estimated in section 2. The Timer medium and Life medium are the tight ones.
- **Dynamic Type.** Text uses text styles. The Timer icon row stops at `xxxLarge` (E5). Labels that can overflow use `lineLimit` and `minimumScaleFactor`.
- **Dark and light.** Timer and Today use system colours. Life full colour uses its existing palette in both appearances.
- **Tinted, accented, clear.** Life uses system colours and `.fill.tertiary`. Timer and Today already use system colours.
- **Reduce Motion.** Nothing animates in these surfaces.
- **VoiceOver.** Icon-only controls read their names. Forward reads what it starts. Glyphs on the island read their status.

## 7. Technical approach

- `ios/App/SpreadWidget/SpreadTimerWidget.swift`: `SpreadFocusPanel` gains `showsBar`. `face(_:showsRound:showsBar:)`. Medium uses `ViewThatFits` over three `mediumStack` tiers. The control row has `.dynamicTypeSize(...DynamicTypeSize.xxxLarge)`. Forward label reads "Forward: ...". Compact and minimal glyphs carry spoken names.
- `ios/App/SpreadWidget/SpreadLifeCardsWidget.swift`: every fixed size becomes a text style. `header` is shared. Medium uses `ViewThatFits`. The view reads `widgetRenderingMode`; non-full-colour uses `SpreadLifeCardPalette.semantic` and `.fill.tertiary`.
- `ios/App/SpreadWidget/SpreadTodayWidget.swift`: the counter column is 6 pt. The island's compact leading glyph is labelled.
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimerSheet.swift`: Forward's spoken label.
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/WhatsNewSheet.swift`: the number column is a minimum width.
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/ReleaseNotes.json`: one change corrected to the three controls at each active size, plus Stop at large.
- `scripts/native-today-widget.test.mjs`: the medium assertion follows the new structure. Eight tests added (font sizes, Life fit, icon cap, rendering modes, labels, the Today rhythm, copy length and accuracy, and the number column).

Nothing new is added to the widget target's source list, so the typecheck workflow's file list does not change.

## 8. Risks, rabbit holes and open questions

- **Swift has not been compiled here.** The `native-typecheck` workflow is the check. Two calls are new to this code: `ViewThatFits(in: .vertical)` in a widget, and `.fill.tertiary` as a container background. Both are standard SwiftUI on iOS 17 and later, but the workflow must confirm them.
- **Estimated heights.** The fit numbers are estimates. The tiers are the safety net, and a device check decides whether the first tier is ever dropped at default size.

**Exceptions for the owner (decide, do not design around):**

- **E1. Small Timer margins.** The small widget disables the system content margins and uses 2 pt side padding so three 44 pt controls fit in 158 pt (126 pt usable with the standard 16 pt margin). Apple recommends the margin. Options: keep three controls at small (current), or go back to two controls at small with margins restored.
- **E2. Medium Timer layout.** Spec 24 described controls stacked on the right. The code and the tests use a bottom row (PR #206), which this change keeps. A right-hand column of three 44 pt controls needs about 140 pt, which the medium area does not have. Owner: keep the bottom row, or cut the medium to two controls. Spec 24 is corrected to match the code.
- **E3. Three controls at every active size.** Spec 23 said one control at small and two at medium. PR #229 made Play or Pause, Forward and Cancel the set at every size, with Stop at large. This spec follows the code. Owner: confirm.
- **E4. Full-colour Life card.** The card keeps fixed white and black over its artwork in full colour, as the art direction in [SPREAD_LIFE_CARD_ART_DIRECTION.md](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md) asks. Tinted, accented and clear modes use semantic colours only. Owner: confirm full colour keeps the art palette.
- **E5. Icon row cap.** The control row stops at `xxxLarge` text, because the icons sit in fixed 44 pt circles. Owner: confirm, or accept overlap at the largest sizes.
- **E6. Cancel without confirmation or Undo.** Cancel ends the whole focus session at once and records nothing as done (spec 23). Spread's rule asks for Undo or confirmation on destructive edits in the library, and Spread's own rule covers drags. Owner: keep Cancel as it is, or add a confirmation. Not changed here.

## 9. Verification and full-implementation plan

### Acceptance criteria

- Timer medium, running and paused, at the default size: no line clipped. At AX sizes the progress bar and then the round line go, and no control is cut off.
- Timer large at accessibility sizes: the icons stay in their circles.
- Life medium at the default size: the strip is fully visible. The budget line appears at the default size, and is dropped first at larger sizes.
- Life card text is never below 11 pt at the default size. At larger sizes, labels may shrink through `minimumScaleFactor` to keep the strip visible; a device check confirms how far.
- Tinted and clear rendering: the Life card shows only system colours, with no artwork and no fixed white or black.
- Forward reads "Forward: Start break" on the widget. In the sheet, Forward is disabled with the reason spoken when no step follows.
- What's New: the Timer line matches the three controls at each active size, and every change is at most 200 characters.

### Checks

- `node --test scripts/native-today-widget.test.mjs`: 42 of 42 pass after this change.
- `npm run typecheck`, `npm run lint`, `npm run test:spread`, `npm run test:scripts`, `npm run docs:check`: see the pull request's Verification section.
- `native-typecheck` GitHub workflow: the Swift compile check for the widget files and the package. Pending on the pull request.
- Not run: Swift tests (`swift test`), a simulator, a device, VoiceOver, Dynamic Type at AX sizes, tinted and clear rendering. None of these were verified here.

### Device checks owed (not verifiable here)

1. Timer widget: small, medium and large, in running, paused, waiting for a tap, finished, idle and switch-off states. Light, dark, tinted and clear. Default and AX Dynamic Type. VoiceOver names for every icon.
2. Life cards widget: medium and large, light, dark, tinted and clear, default and AX text, one card and many cards, arrows and the week's first and last card.
3. Today widget: small, medium with the timer panel, accessory circular and rectangular.
4. Live Activity: lock screen, expanded island, compact and minimal, with the glyph names read by VoiceOver.
5. In-app focus sheet at 390 and 820 points: Stop, Forward and Cancel, with Dynamic Type.
6. What's New at 390 points: the combined card, the number column at AX sizes, light and dark.

### Three questions for testers

1. Can you tell at a glance whether a focus stretch is running, paused, or waiting for you?
2. Does the medium widget show the controls you expect, without anything cut off?
3. Does Forward tell you what it starts before you tap it?

## 10. Rollout, rollback and release

Ships with the next signed build, after the Swift check and the device checks. Rollback: revert the commit. The widget keeps its data; no migration.

## 11. Decision record

- 2026-11-14: medium Timer keeps the bottom row of controls, with a tiered fit (E2).
- 2026-11-14: Life cards use semantic colours outside full colour rendering (E4).
- 2026-11-14: the Timer icon row stops at `xxxLarge` (E5), pending owner confirmation.
- 2026-11-14: What's New copy corrected to the code, not the older spec wording.
