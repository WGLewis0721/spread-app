# Spec: Life and Plan Ahead finalize audit (W2)

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).
>
> Summary: Audit of the native Life screens and the Plan Ahead flow before App Store finalization. Fixes three owner-reported defects (plural hours, the Life area picker, the copy and wording story), one planner data-loss defect in copy-forward, and VoiceOver and wording gaps. Swift is not compiled in this session; device checks are owed.

| | |
| --- | --- |
| Request | Finalize Life and Plan Ahead for App Store publication: fix the owner's phone-screenshot defects, audit every Life state, make the Plan Ahead flow read as one story. |
| Restated | For the iPhone owner using Life: the repeat schedule, Life area choice, copy-forward, and budget read correctly in every state, with no data loss. |
| Surface | iPhone (Life, Week, Hours and Plan Ahead). Widths 390, 820, 1024 and 1366 iPad are device checks owed. |
| Size | M. Two options for the picker and copy-forward. The audit table is the full state list. |
| Author | Claude Haiku 5.5 in a remote session, 2026-11-14. |
| Status | Draft, pending native compile (`native-typecheck`) and device checks. |
| Governing docs read | [RULES_CARD.md](../RULES_CARD.md); [planner/SPREAD_NATIVE_BRAND_BOARD.md](../planner/SPREAD_NATIVE_BRAND_BOARD.md) (November 11 and 12 Life and Plan Ahead amendments); [specs/2026-11-12-plan-ahead-recurrence.md](2026-11-12-plan-ahead-recurrence.md); [specs/2026-11-13-plan-ahead-suggested-plans.md](2026-11-13-plan-ahead-suggested-plans.md); [planner/SPREAD_LIFE_CARD_ART_DIRECTION.md](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md) (art and fallback); [specs/2026-11-10-life-card-visual-implementation.md](2026-11-10-life-card-visual-implementation.md). The Gray Matter library was read from `app-design/EDITORIAL_CARD_AND_ARTWORK.md` and `app-design/UX_REVIEW_AND_SPEC_PROTOCOL.md`; Spread decisions win where they differ. |

## 1. Problem

Maya plans next week's gym time on her iPhone. The repeat form reads "1 hours on Thursday", the Life area row shows a bare "1" where her area's name should be, and the Plan Ahead screens name the same ideas three ways ("Review", "Preview", "Already planned"). When she copies a week forward, a future week that she had set to 40 weekly hours loses that total, and the copy's preview promised existing budgets would be kept.

## 2. Evidence and context

- `[Repo]` `LifeRecurringPlanForm.swift`: `Text(SpreadHours.text(hours) + " hours per scheduled week")` and `… + " hours on " + day.name` always pluralise. The same pattern appears in `LifePlanAheadSheet.swift`, `LifeWeeklyTimeBudget.swift` (VoiceOver labels), `LifeRoot.swift` (role chip label) and `LifeHoursView.swift` (reservation message).
- `[Repo]` The Life area row is a `Picker` whose value label is the system's rendering of the selected tag. Source reading did not reproduce a "1". The owner's screenshot is the only evidence. The fix renders the name directly from the snapshot, so the system value label is no longer used. **Not reproduced on a device.**
- `[Repo]` `week-copy.ts`: `holdsPlan` ignored `life.capacityHours`. A future week holding only a weekly total counted as empty and `copyOf` replaced it, dropping the total. `ensureWeek` sets a capacity only when a repeating schedule is active, and those weeks also hold hours, so the change keeps ordinary weeks copyable.
- `[Repo]` `recurring-plan.ts` said "your Life card", a control that no longer exists.
- `[Repo]` `LifeWalletStack.swift` spoken card label omitted unassigned and over-budget status, which the editorial face already speaks. The default presentation is the Wallet face, so this affects the default VoiceOver path.
- `[Repo]` `LifeEditorialCard.swift`: a missing editorial image falls back to a colour gradient. No crash path found.

## 3. Goals, non-goals and budget

- **Goals:** every Life hour string reads correctly at 1; the Life area row names the area with its colour; the Plan Ahead flow uses one verb ("Preview") and one set of states; copy-forward never drops a set weekly total; VoiceOver speaks the same status the screen shows.
- **Non-goals:** no new styles, colours, fonts or components; no schema or sync change; no change to Classic, the planner's storage, or Week; no change to the Undo timing (owner decision below).
- **Appetite:** one branch, one draft PR, about a day.

## 4. Rules that apply and exceptions needed

- Life has one Wallet stack; no global Life Edit; no swipe-delete; no redundant dock plus. Preserved.
- Plan Ahead is previewed and confirmed; no automatic rollover. Preserved.
- Tasks change only through `store.ts` actions. The copy fix stays in the engine that the store already calls. No second store.
- Touch targets at least 44 pt. The new Life area row is 44 pt high and full width.
- Status is never colour alone. The Life area row shows the name as text; the colour dot is decoration.
- **Exception for the owner (documentation conflict).** `CLAUDE.md` says the editorial registry falls back to "original `Resources/Chalk/`". The code and the November 11 owner decision use a neutral gradient and no Chalk art. The code follows the owner decision. `CLAUDE.md` should be corrected by the owner or by a docs change. This session does not edit `CLAUDE.md`.
- **Exception for the owner (Undo window).** The Life Undo row is visible for about five seconds after a change (`LifeRoot.swift`, `historyVisible`). After a copy-forward or transfer, the person may miss it. Options: keep five seconds (current), or hold the row for Plan Ahead writes. Not changed here.

## 5. Options and the chosen concept

### Life area row

- **A. Keep the system `Picker`, change its label.** Rejected: the value label is the part that showed "1", and it cannot show a colour dot.
- **B. A Menu row that draws the chosen name and dot from the snapshot (chosen).** Same identity as the budget chips and the weekly-time bar. Works at accessibility sizes through `ViewThatFits`.

### Copy-forward target that holds only a weekly total

- **A. Overwrite the week and copy the source total.** Rejected: silently drops a total the person set.
- **B. Keep the week and report it as kept (chosen).** The preview already promises that existing budgets are preserved, and the status row now says "Kept, already planned or set".

### Breadboard of the chosen concept

Life → Week page → **Plan Ahead** (sheet) → plans list (Your plans) → repeat form (Life area row, repeat cadence, start, optional end, fixed days) → **Preview schedule** → **Confirm schedule**. Plan Ahead also offers Suggested plans, Copy this week forward (preview, then copy), and Move hours once (preview, then move). Each write posts through `planner.send` and is Life-undoable.

### States

| Surface | State | Result after this change |
| --- | --- | --- |
| Repeat form, Life area row | default, disabled (editing a saved plan) | Name and dot shown; disabled while editing |
| Repeat form, Life area row | no area chosen | "Choose a Life area" |
| Repeat form, Life area row | AX size, long name | Name wraps under the title (`ViewThatFits`) |
| Repeat form | no weekly total set | Section says to set weekly hours in Life first; review returns the same reason |
| Repeat form | day hours and weekly total | "1 hour on Thursday" and "2 hours per scheduled week" |
| Repeat form | review ok, review refused | Primary reads "Preview schedule", then "Confirm schedule"; refusal shown as danger text |
| Plan Ahead, copy preview | target filled / kept | "Will be filled" / "Kept, already planned or set" |
| Plan Ahead, copy preview | source empty or all kept | Refusal text unchanged |
| Plan Ahead, move | amount 1 hour | "1 hour" |
| Weekly time (compact and full) | no capacity, over budget, available | Unchanged text; VoiceOver label now uses singular/plural |
| Budget editor, role arrows | no weekly total | New caption: set the weekly total first |
| Wallet card | closed, focused, over budget | Spoken label now includes unassigned or over budget |
| Editorial face | missing image | Gradient fallback (unchanged) |
| Undo row | after copy or transfer | Visible about five seconds (owner decision open) |
| Dynamic Type, AX | long Life area names | Row and card titles wrap |
| Reduce Motion | Undo row and sheets | Existing reduce-motion branches unchanged |

## 6. Platform behavior

- Widths 390, 820, 1024 and 1366 iPad: owed on device. The Life area row is full width in a Form and has no fixed width.
- Dark mode: uses existing `Spread.ink`, `Spread.secondary`, `Spread.canvas`; owed on device.
- Reduce Motion: no new animation added.
- Haptics: none added. Life's haptic policy is unchanged.
- VoiceOver: the Life area row reads title, value (the area name or "Not chosen") and hint. Budget and Wallet labels use "1 hour" and "2 hours".

## 7. Technical approach

- `Life/LifeAreaMenuRow.swift` (new): shared row for the repeat form and the Plan Ahead sheet.
- `Life/LifeRecurringPlanForm.swift`, `Life/LifePlanAheadSheet.swift`: row and wording changes; a capacity hint section.
- `Life/LifeWeeklyTimeBudget.swift`, `Life/LifeRoot.swift`, `Life/LifeHoursView.swift`, `Life/LifeWalletStack.swift`: singular-aware spoken labels, a budget-editor caption, a reservation message, and the Wallet status words.
- `src/lib/spread/week-copy.ts`: `holdsPlan` for targets includes a set weekly total; `holdsHoursOrTasks` for the source.
- `src/lib/spread/recurring-plan.ts`: reason text names the Life screen.
- Tests: `src/lib/spread/week-copy.test.ts` (two new cases), `src/lib/spread/recurring-plan.test.ts` (updated assertion), `ios/.../Tests/.../LifeHoursWordingTests.swift` (new XCTest, not compiled here).
- No schema, sync, backup, Cloud, server or golden branch is touched.

## 8. Risks, rabbit holes and open questions

- **Not reproduced: the "1" in the Life area row.** The row no longer uses the picker's value label, so the symptom should be gone. Confirm on device. If it returns, the cause is elsewhere in the snapshot path.
- **Swift not compiled here.** The `native-typecheck` workflow compiles every file in `Sources/SpreadNativeV2`. Its result is the compile check. XCTest is not run in CI.
- **Shared controls outside Life.** `SpreadArrowValueControl` and `SpreadArrowButton` are in `Shell/`, outside this workstream. Their sizes were reviewed (44 pt wide, 52 pt high) and not changed. The Week navigator's `WeekCrownView` was not reviewed for metal styling because it is outside Life/.
- **Undo window.** Owner decision: five seconds, or longer for Plan Ahead writes.
- **Copy-forward kept weeks.** A week with only a weekly total is now kept rather than filled. Owner may prefer filling hours and keeping the week's total. Default: kept.

## 9. Verification and full-implementation plan

### Acceptance criteria

1. Choosing one hour in the repeat form, the day list and the Plan Ahead amount reads "1 hour", never "1 hours".
2. The Life area row shows the chosen area's name and colour dot, in the repeat form and in Plan Ahead.
3. Copying a week forward leaves a future week that holds only its own weekly total unchanged and lists it as kept.
4. The repeat form's no-total reason names the Life screen, and the form shows the same hint before review.
5. The primary action on the repeat form reads "Preview schedule" before a review, and "Confirm schedule" after one.
6. The Wallet card spoken label includes unassigned or over-budget status.

### Checks

- Run: `npm run typecheck`, `npm run lint`, `npm run test:spread`, `npm run test:scripts`, `npm run docs:check`. `node --test scripts/native-today-widget.test.mjs` is not needed because no widget file changed.
- Run on GitHub: `native-typecheck` (compiles all native Swift sources against the iOS Simulator SDK).
- **Owed, not run here:** XCTest run; iPhone 390 and iPad 820, 1024, 1366 layouts in light and dark; Dynamic Type at AX sizes with a long Life area name; VoiceOver pass over repeat form, Plan Ahead, weekly time and a Wallet card; Reduce Motion; Undo after copy-forward; 44 pt on device; the 1-hour strings on device.

### Full-feature implementation and refinement plan

The change is complete in the app on one branch. Device refinement is the remaining step. There is no prototype.

## 10. Rollout, rollback and release

Draft pull request only. Not merged, not released, not sent to TestFlight. Rollback is reverting the commits. No data migration.

## 11. Decision record

- Owner decision needed: keep the five-second Undo row, or hold it longer after Plan Ahead writes.
- Owner decision needed: correct the `CLAUDE.md` editorial fallback wording (gradient, not Chalk).
- Default taken: a copy-forward target with only a weekly total is kept.
