# Spec: Plan Ahead opens to your plans

> Part of the [design brain](../README.md). Follows [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md) and [TEMPLATE.md](TEMPLATE.md). Builds on [2026-11-12-plan-ahead-recurrence.md](2026-11-12-plan-ahead-recurrence.md). Plan, not approval: no merge or release authority.

| | |
| --- | --- |
| Request | Plan Ahead should start with the list of plans (Gym, Studying, Budgeting, New plan), as in the approved continuity wireframe |
| Restated | For a person who already has repeating weekly budgets, Plan Ahead opens to their list so they can see and change each one, not into an empty form |
| Surface | Native iPhone, Plan Ahead sheet opened from the Life home and Week entries |
| Size | L: a new first screen and a changed entry flow. Three options considered |
| Author | Tool (Haiku 5.5), 2026-11-12 |
| Status | In review. Implemented on branch `feature/plan-ahead-plans-list`; compile and device checks owed |
| Governing docs read | `RULES_CARD.md` (Behavior, Boundaries, Verify); `packs/planner-change.md` (rules 1–5, Moving without dragging); `planner/SPREAD_NATIVE_BRAND_BOARD.md` (native controls); `specs/2026-11-12-plan-ahead-recurrence.md` (sections 3, 5, 7, 8); `FOUNDATIONAL_UX_PRINCIPLES.md` (Hick, Progressive Disclosure) |

## 1. Problem

A person with two repeating schedules opens Plan Ahead and sees a blank repeat form with the list of schedules buried at the bottom. They cannot tell at a glance what is already planned ahead, so they start a new schedule when they only meant to change one. Plan Ahead also leads with a segmented control (Repeat schedule / Move once) that asks a choice before the person knows what they have.

## 2. Evidence and context

- [Repo] `LifePlanAheadSheet.swift` opens on a segmented control with "Repeat schedule" selected. The repeat form (`LifeRecurringPlanForm.swift`) holds the list of saved schedules as its last section, below the fields.
- [Repo] `LifeRecurringPlanForm.swift` already loads a saved schedule into the form when it is tapped, and already has Edit series, Stop repeating and Review schedule.
- [Repo] `ios/App/SpreadNativeUITests/LifeUITests.swift` opens Plan Ahead and expects `plan-ahead-preview`, which exists only in the Move once mode. The test must follow the new entry path.
- [Repo] The native snapshot carries only the current week and the `recurringPlans` list (`native-v2-projection.ts`). Future-week budgets are not in the native payload, so an 8-week outlook is not possible without a data-contract change. It is excluded here.
- [Owner] Approved continuity wireframe (2026-11-12): plans list first, then the form, review and affected week.

## 3. Goals, non-goals and budget

- **Goals:** Plan Ahead opens to a plans list; each saved schedule is one row showing life area, hours and cadence; "New schedule" and "Move hours once" are one tap away; editing a row opens the existing form pre-filled.
- **Non-goals:** no preferred day, no monthly cadence, no 8-week outlook, no new store, no change to recurrence math or the native dispatch contract, no change to schema, sync or backup.
- **Appetite:** one sprint of SwiftUI work plus the UI test update. If the change needs a data contract change, stop and split it out.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| RULES_CARD Behavior: Plan Ahead opened, previewed, confirmed | Unchanged. Opening the list previews nothing and moves nothing. |
| RULES_CARD Boundaries: no second store, no schema or sync changes | Unchanged. The list reads `snapshot.recurringPlans` from the existing store. |
| packs/planner-change Rule 1, 4, 5 | Not affected; no task or day placement is added. |
| Native board: accessible controls, 44 pt | Rows are full-width buttons at least 44 pt tall. |
| Spec 2026-11-12-plan-ahead-recurrence, section 3 | Plans list shows weekly hours only; no tasks, appointments or day copies. |

**Exceptions needed (owner decides, not built here):**

1. **Preferred day.** The continuity wireframe marked a preferred day on the repeat form and review, filling empty future weeks. That conflicts with the recurrence spec (sections 3 and 7: a rule affects weekly budget, not day allocations; "does not choose a day"). Not built. Needs a spec amendment.
2. **Monthly cadence (Budgeting, 1 h monthly).** The repeat options are every 1 to 4 weeks, and the engine accepts intervals of 1–12 weeks (spec section 7). A monthly budget is not in the model. Not built. Needs a spec amendment and an engine decision.
3. **8-week outlook.** Needs future-week budgets in the native payload. That is a change to `native-v2-projection.ts` and its tests, which sits close to the boundary on sync/schema. Not built. Owner to approve the data contract change.

## 5. Options and the chosen concept

### Options considered

| Option | Idea in 2 to 3 lines | Pros | Cons |
| --- | --- | --- | --- |
| A | Plan Ahead opens to a "Your plans" list. Rows open the form; "New schedule" and "Move hours once" sit below. | Shows what is planned before any input; one tap to edit; matches the approved wireframe. | One more screen before the form for a first-time user (mitigated by the empty state going straight to New schedule). |
| B | Keep the current segmented control and form. Move the saved list from the bottom of the form to a section above the fields. | Smallest change. | Still opens on a blank form; the list competes with the fields; does not match the wireframe. |
| C | Put each repeating schedule on the Life card (inline in the Life Stack) and open the form from the card. | No extra screen; schedules sit next to the budget they change. | Bypasses the explicit Plan Ahead entry the rules require; more Life card surface than the Wallet board allows. |

**Chosen: A.** It keeps Plan Ahead as the one explicit planning entry, and it shows state before asking for input. **Rejected: C** (the Life card must not gain another control; plan entry is explicit). **Rejected: B** (it keeps the blank-form-first problem).

### Breadboard of the chosen concept

- **Plans** (default): title "Plan Ahead"; section "Your plans": one button row per active schedule ("Gym", "2h every week, from Nov 16", chevron). Section "New": "New schedule". Section "Move": "Move hours once" (opens Move once). Empty state: one line, "No repeating schedules yet." followed by "New schedule".
- **Repeat form** (from New schedule or a row): the existing fields, review and confirm. For an existing schedule the form is pre-filled. A "Back to your plans" row at the top returns to Plans. The saved list section is removed from the form.
- **Move once**: the existing transfer sheet, unchanged, with "Back to your plans" at the top.
- **Connections:** Plans → form (new or edit); Plans → Move once; form or Move → Back to Plans. Close dismisses from any place.

### States

- **Empty:** no schedules → one line plus "New schedule" (the approved wireframe's empty case).
- **First run:** no life areas → the form's existing "Life area" picker is empty; Plans shows "Add a Life area first" and no New schedule action (existing behavior, no new flow).
- **Loading / busy:** existing Review and Confirm states, unchanged.
- **Error / refused:** existing preview refusal text in the form, unchanged.
- **Overflow:** plan names and summaries wrap; Dynamic Type grows the rows.
- **Offline:** unchanged. Everything is on device.
- **Undo:** unchanged. Confirm and Stop already preserve the existing Undo path.
- **Refused action:** Stop repeating asks for confirmation (existing dialog).

## 6. Platform behavior

- **Widths and orientation:** iPhone only. Sheet uses `.presentationDetents([.large])` as today.
- **Safe areas:** unchanged. The sheet is a standard `Form` on `spreadListSurface()`.
- **Appearance:** existing `Spread` colors (`ink`, `secondary`, `danger`). No new colors.
- **Accessibility:** each plan row is one button with a label of the form "Gym, 2 hours every week, from November 16". Targets at least 44 pt. Chevron is decorative. Dynamic Type wraps the summary.
- **Input:** tap only; no drag.
- **Haptics and motion:** none added.

## 7. Technical approach

- **Where it lives:** `ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifePlanAheadSheet.swift` (new entry screen, mode state) and `LifeRecurringPlanForm.swift` (accepts an optional initial plan, loses its saved-list section). UI test `ios/App/SpreadNativeUITests/LifeUITests.swift` updated to tap "Move hours once" before the preview check.
- **Data and state:** reads `snapshot.recurringPlans` only. No new store actions. Existing `planner.send` and `previewRecurringPlan` calls are unchanged. Convenience state is local `@State`.
- **Flags and rollout:** none. Behind the existing Plan Ahead entry.
- **Do not touch:** `store.ts`, `schema.ts`, `sync-model.ts`, `native-v2-projection.ts`, `native-v2-dispatch.ts`, cloud, backup, restore, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/`. Confirmed: none modified.
- **Dependencies:** none added.
- **Performance and privacy:** nothing animated, blurred or stored. Nothing leaves the device.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| Swift not compiled here | No Swift toolchain in this workspace. A syntax error would break the iOS build. | Codemagic compile of the branch before any merge. | Owner, when the branch is pushed |
| Extra screen for first use | A new person sees an empty list first. | Empty state shows "New schedule" as the first action. | Owner, on device |
| Preferred day, monthly cadence, outlook | Each is in the approved wireframe but outside the current rules or data. | Not built. Listed in section 4. | Owner |
| Stale form state after Back | Returning to Plans must clear the preview so nothing confirms against an old revision. | Back clears `preview` and `previewRevision`. | Tool, implemented |

## 9. Verification and full-implementation plan

### Acceptance criteria

- Given two saved schedules, when Plan Ahead opens, then both are listed by life area with hours and cadence, and no form is shown.
- Given no saved schedules, when Plan Ahead opens, then the empty line and "New schedule" are shown.
- Given a listed schedule, when it is tapped, then the form opens with its life area, hours, cadence, start and end filled in, and "Edit series" is in effect.
- Given the form, when "Back to your plans" is tapped, then the list returns and no preview is kept.
- Given "Move hours once", when tapped, then the existing transfer sheet opens and its preview and confirm behave as before.
- Given any path, when Close is tapped, then the sheet dismisses without a change.
- No list row sends a command by itself.

### Checks

- `npm run typecheck`, `npm run docs:check`, `npm run lint` (run after the change; TypeScript is unchanged, so these confirm the docs and the rest of the repo still pass).
- Swift: compile on Codemagic from the branch (owed). Not run here.
- UI test `LifeUITests` updated; run on a simulator (owed).
- Device: 390 wide iPhone, light and dark, Reduce Motion, Dynamic Type at a large size, VoiceOver reading each row (owed).

### Full-feature implementation and refinement plan

- **Build location:** existing app, feature branch `feature/plan-ahead-plans-list`.
- **Complete scope:** plans list, form pre-fill, Back, Move once entry, empty state, UI test update.
- **Verification:** see Checks. Record what is not run.
- **Refinement loop:** after the owner tests on device, adjust copy and row layout in place.
- **Questions for the tester:** Do you know how to start a new schedule? Is it easy to change one? How can we make the list clearer?

## 10. Rollout, rollback and release

Branch `feature/plan-ahead-plans-list`, one pull request. No flag. Revert the commit to restore the segmented entry. No data changes, so rollback is safe. Release authority stays with the owner; this spec is not approval to merge, upload to TestFlight or ship.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-12 | Option A chosen: Plan Ahead opens to a plans list | Owner (wireframe approval), tool (option choice) | This spec |
| 2026-11-12 | Preferred day, monthly cadence and 8-week outlook excluded pending owner decision | Tool, per RULES_CARD and recurrence spec | This spec, section 4 |
