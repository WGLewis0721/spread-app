# Spec: Plan Ahead suggested plans and "Make a new plan"

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Save as `docs/design/specs/YYYY-MM-DD-<slug>.md`.

| | |
| --- | --- |
| Request | "The table showing 8 weeks ahead is confusing to the viewer. It looks like the app is saying there's already weeks planned ahead. See if you can make those actual presets that the user can simply confirm or modify as well as have a 'make a new plan' button." |
| Restated | For a person who opens Plan Ahead on iPhone, replace the read-only "Next 8 weeks" table with suggested schedules built from this week, each one tap from review and confirm, and add a clear "Make a new plan" button. |
| Surface | Native iPhone, Plan Ahead sheet |
| Size | M: a new use of the existing recurring-schedule form. Two options plus one rejected variant |
| Author | Tool (Sonnet 5.5), 2026-11-13 |
| Status | Draft. Implemented on the session branch. Swift is not compiled in the app and no device check has run |
| Governing docs read | `CLAUDE.md` rules block (Behavior, Boundaries, Verify); `PLAN_SPEC_PROTOCOL.md`; `specs/TEMPLATE.md`; `specs/2026-11-12-plan-ahead-plans-list.md` (outlook and entry-screen parts) |

## 1. Problem

A person opens Plan Ahead and sees "Next 8 weeks" with rows such as "Week of Nov 23: Study for CCAF 3h, Days set: Study for CCAF Tue 1.5h". They read it as weeks they have already planned. It is a forecast of schedules they saved, plus default hours for everything else, and it has no action on it. The one control that starts a plan, "New schedule", is a small row below the table, so the screen offers no obvious next step.

## 2. Evidence and context

- [Repo] The table is `outlookSection` in `LifePlanAheadSheet.swift`, fed by `projectOutlook` in `native-v2-projection.ts`. It shows every one of the next eight weeks, including weeks with no schedule, using default hours.
- [Repo] The repeat form already starts a new schedule from the days a Life area has this week (`cardDays` in `LifeRecurringPlanForm.swift`, built on `LifeCardWeekDistribution`). A suggestion can use the same numbers.
- [Repo] RULES_CARD Behavior: Plan Ahead is explicitly opened, previewed, validated and confirmed. The form's Review then Confirm steps already do that.
- [Owner] 2026-11-12 asked for the read-only 8-week outlook (`2026-11-12-plan-ahead-plans-list.md`). This request reverses that for the sheet.
- [Assumption] "Presets" means suggested schedules built from this week, not a saved library of templates the person creates.
- Not checked: how the sheet looks on a device, and the brand board's rules for list rows.

## 3. Goals, non-goals and budget

- **Goals:** nothing on the screen reads as a plan that does not exist. Each suggestion shows exactly what would be saved. Confirming is the same previewed, validated step as today, and changing anything uses the existing form. "Make a new plan" is the first and most prominent control.
- **Non-goals / no-gos:** no saved or custom preset library. No automatic apply. No change to the engine, schema, sync or the one-time move. No new tokens, colors or motion. No monthly cadence. The outlook payload is not removed in this change.
- **Appetite:** one small SwiftUI change plus one pure helper with tests.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| RULES_CARD Behavior: Plan Ahead opened, previewed, validated, confirmed; never auto-roll over | A suggestion only opens the form and runs the existing preview. Saving is still the form's "Confirm schedule" tap. |
| RULES_CARD Look: touch targets at least 44 pt; status never color alone | Rows and the new button are at least 44 pt. No color carries meaning. |
| RULES_CARD Boundaries: task changes go through `store.ts` actions; no second store; no migration | Uses `previewRecurringPlan` and `saveRecurringPlan` unchanged. No store or data change. |
| RULES_CARD Boundaries: do-not-touch paths | None touched. |

**Exceptions needed (owner decides, do not assume):** None. One reversal is recorded in section 11: the 8-week table the owner asked for on 2026-11-12 is no longer shown.

## 5. Options and the chosen concept

### Options considered

| Option | Idea in 2 to 3 lines | Pros | Cons |
| --- | --- | --- | --- |
| A | Replace the table with "Suggested plans", one row per Life area built from this week. Tapping a row opens the repeat form pre-filled with the review already run. | One concept for confirm and modify. Reuses the form and its validation. Nothing reads as already planned. | The review sits below the fields, so the person may scroll to see it. |
| B | Keep the table, relabel it "What your plans will do", and add a suggestions row above it. | Keeps the forecast. | The table still looks like planned weeks, which is the complaint. |
| C | Each suggestion gets its own Confirm button that previews and saves inline. | Fewest taps. | Skips the form's chance to adjust days or an end date. More new UI, and it cannot be compiled or run here. |

**Chosen:** A. **Rejected:** B keeps the confusion. C adds a second save path and more untested UI. A person who wants fewer taps can still confirm from the pre-filled review in one tap.

### Breadboard of the chosen concept

1. **Plan Ahead, list.** Top: a full-width "Make a new plan" button. Then "Your plans" (saved schedules, unchanged). Then "Suggested plans" (below). Then "Move hours once" (unchanged).
2. **Suggested plans.** One row per Life area. The row shows the area name and a summary such as "Tue 1h · Thu 1h · Sat 1h, every week from Nov 16", with "Review" and a chevron. The footer reads "Based on this week. Tap one to review it. Nothing is saved until you confirm, and you can change anything first."
3. **Tap a suggestion.** The repeat form opens with the area, days (or weekly hours), "Every week" and the start date filled in, and a line "Pre-filled from this week. Change anything before you confirm." The review has already run, so "Confirm schedule" is the primary button. Changing any field clears the review, and the button becomes "Review schedule" again.
4. **Make a new plan.** Opens the same form with its usual defaults.

**What a suggestion contains:**
- One per Life area that has hours this week and no schedule covering the weeks ahead.
- Days are the days the Life card shows this week (half-hour steps, at least 0.5 h, at most 24 h). With days, the weekly total is their sum. With no days, the weekly total is the area's budget this week.
- Every week, no end date, starting next Monday.
- Ordered by weekly hours, then name. At most four. Any other area is reachable through "Make a new plan".

### States

- **No suggestions** (nothing to repeat, or every area already has a schedule): the section is hidden. The button remains.
- **No weekly total on the open week:** the review shows the existing reason in red, "Set this week's total hours on your Life card first, then plan ahead."
- **Over capacity or refused:** the review shows the engine's reason. Nothing is saved.
- **Checking or saving:** the primary button shows "Checking…" or "Saving…" as today.
- **Undo:** unchanged. Saving a schedule is undone the way it is today.

## 6. Platform behavior

- **Widths and orientation:** rows wrap at 390, 820 and 1024. Layout follows the Form list, as today.
- **Appearance:** existing tokens only (`Spread.ink`, `Spread.secondary`). Light and dark follow the system.
- **Accessibility:** each suggestion is one button read as area, summary, then "Review", with the hint "Opens the schedule to review. Nothing is saved until you confirm." Targets are at least 44 pt. Dynamic Type wraps the summary. The chevron is decorative.
- **Input:** tap. No drag is involved.
- **Haptics and motion:** none new. The existing accepted-feedback on save is unchanged.

## 7. Technical approach

- **Where it lives:** `Life/PlanAheadPresets.swift` (new, Foundation only, so macOS `swift test` compiles and tests it); `Life/LifePlanAheadSheet.swift` (button, suggestions section, outlook section removed); `Life/LifeRecurringPlanForm.swift` (optional suggestion, review on open, review kept while the request is unchanged, one shared source for the Life-card days); `Tests/SpreadNativeV2Tests/PlanAheadPresetTests.swift` (new).
- **Data and state:** reads `snapshot.roles`, `allocations`, `recurringPlans` and `life`. Sends the existing `previewRecurringPlan` and `saveRecurringPlan`. Convenience state is local `@State`. No store change. No data migration.
- **Flags and rollout:** no flag.
- **Do not touch:** none of the Boundaries paths are modified.
- **Dependencies:** none.
- **Performance and privacy:** one extra preview request when a suggestion opens. Nothing leaves the device.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| Swift is not compiled in the app | The SwiftUI changes are checked only by reading. A compile error stops the next Codemagic archive. | Keep this change in its own commit so it can be reverted without losing the engine fix. | Owner |
| A suggestion and the form must show the same numbers | If they differ the person loses trust. | Both use one function, `PlanAheadPreset.days`. | Tool |
| Review is kept while the request is unchanged | Changes how the form clears its review, to avoid a race when it opens already reviewed. | Clear only when the request changes. Failures still clear it. Device check. | Owner, on device |
| The form defaults to every 2 weeks; suggestions use every week | Repeating "this week" is naturally weekly. | Every week for suggestions, form default unchanged. | Owner |
| Four suggestions at most | Many Life areas would make a long list. | Four, then "Make a new plan". | Owner |
| The outlook payload is now unused by the sheet | Dead data on every native read. | Leave it, then remove `outlook` and `projectOutlook` in a follow-up. | Owner |

## 9. Verification and full-implementation plan

### Acceptance criteria

- Given a Life area with hours on Tuesday and Thursday this week and no schedule, when Plan Ahead opens, then "Suggested plans" lists it with those days, "every week" and next Monday's date.
- Given a Life area that already has a schedule covering next week, then it is not suggested.
- Given any state, then no row shows hours for a future week as if they were planned.
- Given a suggestion, when it is tapped, then the form opens pre-filled and the review shows, and nothing is saved until "Confirm schedule" is tapped.
- Given a suggestion is open, when any field is changed, then the review clears and "Review schedule" returns.
- Given the open week has no weekly total, when a suggestion opens, then the review explains how to set one.
- Given Plan Ahead opens, then "Make a new plan" is the first control and opens the form.

### Checks

- Typecheck, lint and tests for the TypeScript are unaffected. `swift test --package-path ios/SpreadNativeV2` runs the new helper tests in the Codemagic pipeline.
- Owed on a physical device: VoiceOver reading order, Dynamic Type, 390 and 820 widths, light and dark, that the review is visible without confusing scroll, that a suggestion matches the Life card.

### Full-feature implementation and refinement plan

- **Build location:** existing app, session branch. No second store.
- **Complete scope:** the button, the suggestions, the pre-filled form with review, removal of the table from the sheet, tests for the suggestion rules.
- **Verification:** compile and test the helper where a toolchain exists; record that the SwiftUI parts are unchecked until Codemagic and a device.
- **Questions for the tester:** Do you know how to do this? Is it easy? How can we make it better?

## 10. Rollout, rollback and release

Pull request on the session branch, in its own commit separate from the engine fix. No flag. To revert, revert that commit. Release authority stays with the owner. This spec is not approval to merge or ship.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-13 | Replace the "Next 8 weeks" table in the sheet with "Suggested plans" built from this week, each opening the pre-filled repeat form with the review run. Add a prominent "Make a new plan" button. Reverses the 2026-11-12 request for the visible outlook. | Owner (request), tool (design) | This spec; `2026-11-12-plan-ahead-plans-list.md` status; `DECISIONS.md` |
