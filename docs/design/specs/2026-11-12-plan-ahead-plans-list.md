# Spec: Plan Ahead opens to your plans

> Part of the [design brain](../README.md). Follows [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md) and [TEMPLATE.md](TEMPLATE.md). Builds on [2026-11-12-plan-ahead-recurrence.md](2026-11-12-plan-ahead-recurrence.md). Plan, not approval: no merge or release authority.

| | |
| --- | --- |
| Request | Plan Ahead should start with the list of plans (Gym, Studying, Budgeting, New plan), as in the approved continuity wireframe |
| Restated | For a person who already has repeating weekly budgets, Plan Ahead opens to their list so they can see and change each one, not into an empty form |
| Surface | Native iPhone, Plan Ahead sheet opened from the Life home and Week entries |
| Size | L: a new first screen, a changed entry flow and a read-only outlook. Three options considered |
| Author | Tool (Haiku 5.5), 2026-11-12 |
| Status | Implemented on `feature/plan-ahead-plans-list`: plans list, form pre-fill, 1 to 12 week intervals, read-only 8-week outlook. Native compile and device checks owed. Life-card day prefill and monthly cadence are open owner decisions |
| Governing docs read | `RULES_CARD.md` (Behavior, Boundaries, Verify); `packs/planner-change.md` (rules 1–5, Moving without dragging); `planner/SPREAD_NATIVE_BRAND_BOARD.md` (native controls); `specs/2026-11-12-plan-ahead-recurrence.md` (sections 3, 5, 7, 8); `FOUNDATIONAL_UX_PRINCIPLES.md` (Hick, Progressive Disclosure) |

## 1. Problem

A person with two repeating schedules opens Plan Ahead and sees a blank repeat form with the list of schedules buried at the bottom. They cannot tell at a glance what is already planned ahead, so they start a new schedule when they only meant to change one. Plan Ahead also leads with a segmented control (Repeat schedule / Move once) that asks a choice before the person knows what they have.

## 2. Evidence and context

- [Repo] At the start of this work, `LifePlanAheadSheet.swift` opened on a segmented control with "Repeat schedule" selected. The repeat form (`LifeRecurringPlanForm.swift`) held the list of saved schedules as its last section, below the fields.
- [Repo] `LifeRecurringPlanForm.swift` already loads a saved schedule into the form when it is tapped, and already has Edit series, Stop repeating and Review schedule.
- [Repo] `ios/App/SpreadNativeUITests/LifeUITests.swift` opens Plan Ahead and expects `plan-ahead-preview`, which exists only in the Move once mode. The test now follows the new entry path.
- [Repo] The native snapshot carried only the current week and `recurringPlans`. Future-week budgets were not in the payload. The outlook adds them through `projectOutlook` in `native-v2-projection.ts`, requested only by the native read (`native-v2-dispatch.ts`, `outlookWeeks: 8`). The default projection and the Swift fixture `projection-v1.json` are unchanged.
- [Repo] The repeat picker offered every 1 to 4 weeks. The engine (`validRecurringPlan` in `model.ts`) and the dispatch schema already accept 1 to 12.
- [Owner] Approved continuity wireframe (2026-11-12): plans list first, then the form, review and affected week.
- [Owner] 2026-11-12, this round: accept 12-week intervals; add the 8-week outlook; prefill the repeat form with the days chosen on the Life card, so the person can still change them. The prefill is not built (section 4).

## 3. Goals, non-goals and budget

- **Goals:** Plan Ahead opens to a plans list; each saved schedule is one row showing life area, hours and cadence; "New schedule" and "Move hours once" are one tap away; editing a row opens the existing form pre-filled; repeat intervals run from every week to every 12 weeks; a read-only "Next 8 weeks" section shows the weeks ahead.
- **Non-goals:** no preferred day saved with a schedule, no monthly cadence, no store writes from the outlook, no change to recurrence math, no schema, sync or backup change.
- **Appetite:** one sprint of SwiftUI work, the UI test update and one additive read-only projection. If a schema or sync change is needed, stop and split it out.

## 4. Rules that apply and exceptions

| Rule (document and section) | How this request touches it |
| --- | --- |
| RULES_CARD Behavior: Plan Ahead opened, previewed, confirmed | Unchanged. Opening the list or the outlook previews nothing and moves nothing. |
| RULES_CARD Boundaries: no second store, no schema or sync changes | Unchanged. The list reads `snapshot.recurringPlans`. The outlook reads the same store; `projectOutlook` is pure and never writes. |
| packs/planner-change Rule 1, 4, 5 | Not affected. No task or day is placed. Days in the outlook are the stored allocations. |
| Native board: accessible controls, 44 pt | Rows are full-width buttons at least 44 pt tall. |
| Spec 2026-11-12-plan-ahead-recurrence, sections 3 and 7 | Plans and outlook show weekly hours. Intervals of 1 to 12 weeks match the engine's limit. No rule chooses a day. |

**Open exceptions (owner decides, not built):**

1. **Life-card day prefill and saved days.** Requested: the repeat form opens with the days chosen on the Life card, and the person can change them. Not built. Saving those days with a schedule means an additive optional field on the recurring plan (`model.ts`), a schema v5 normaliser (`schema.ts`), sync item mapping (`sync-model.ts`) and day placement in generated weeks. That changes the rule from spec 2026-11-12-plan-ahead-recurrence, section 7, where a rule sets weekly budget only, and it touches the schema and sync boundaries. Options: (a) save the days with the schedule, with a spec amendment and owner approval of the schema change; (b) prefill the form only, not saved, so the outlook does not show them; (c) hold.
2. **Monthly cadence (Budgeting, 1 h monthly).** The engine accepts 1 to 12 weeks. A monthly rule needs an engine decision and a spec amendment. Not built.

**Resolved this round (owner asked for them):**

3. **12-week intervals.** Accepted. The repeat picker offers every week through every 12 weeks.
4. **8-week outlook.** Built as read-only and opt-in. It adds an optional `outlook` field to the native payload only. No schema or sync file changes.

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
- **Next 8 weeks** (below Your plans, shown when the native read includes the outlook): one text block per week, "Week of Nov 16". "Kept as set" appears where a stored week would not be regenerated by a schedule. Hours are listed by life area; "Days set" lists the stored day allocations. Footer: "Read-only. Change a week in Week. A schedule does not change kept weeks."
- **Repeat form** (from New schedule or a row): the existing fields, review and confirm. The interval offers "Every week" through "Every 12 weeks". For an existing schedule the form is pre-filled. A "Back to your plans" row at the top returns to Plans. The saved list section is removed from the form.
- **Move once**: the existing transfer sheet, unchanged, with "Back to your plans" at the top.
- **Connections:** Plans → form (new or edit); Plans → Move once; form or Move → Back to Plans. Close dismisses from any place.

### States

- **Empty:** no schedules → one line plus "New schedule" (the approved wireframe's empty case).
- **Outlook absent or empty:** the "Next 8 weeks" section is hidden.
- **First run:** no life areas → the form's existing "Life area" picker is empty; Plans shows "Add a Life area first" and no New schedule action (existing behavior, no new flow).
- **Loading / busy:** existing Review and Confirm states, unchanged.
- **Error / refused:** existing preview refusal text in the form, unchanged.
- **Overflow:** plan names, summaries and outlook lines wrap; Dynamic Type grows the rows.
- **Offline:** unchanged. Everything is on device.
- **Undo:** unchanged. Confirm and Stop already preserve the existing Undo path.
- **Refused action:** Stop repeating asks for confirmation (existing dialog).

## 6. Platform behavior

- **Widths and orientation:** iPhone only. Sheet uses `.presentationDetents([.large])` as today.
- **Safe areas:** unchanged. The sheet is a standard `Form` on `spreadListSurface()`.
- **Appearance:** existing `Spread` colors (`ink`, `secondary`, `danger`). No new colors.
- **Accessibility:** each plan row is one button with a label of the form "Gym, 2 hours every week, from November 16". Each outlook week is one combined element, so VoiceOver reads the whole week in one pass. Targets at least 44 pt. Chevron is decorative. Dynamic Type wraps the summary.
- **Input:** tap only; no drag.
- **Haptics and motion:** none added.

## 7. Technical approach

- **Where it lives:** `LifePlanAheadSheet.swift` (entry screen, mode state, outlook section); `LifeRecurringPlanForm.swift` (optional initial plan, saved-list section removed, interval picker 1 to 12); `PlannerSnapshot.swift` (optional `outlook` field and three read-only structs); `native-v2-projection.ts` (`projectOutlook`, and an opt-in `outlookWeeks` option on `projectNativeV2`); `native-v2-dispatch.ts` (the read asks for eight weeks); `native-v2-projection.test.ts` (three new tests). UI test `ios/App/SpreadNativeUITests/LifeUITests.swift` taps "Move hours once" before the preview check.
- **Data and state:** plans read `snapshot.recurringPlans`. The outlook reads `snapshot.outlook`, built by `projectOutlook`, which reads data and never writes it. For each of the eight weeks after the current one, a stored week shows its own budgets and day allocations; an unstored week shows what `ensureWeek` would seed (a rule's hours, else the role's default). A week is `kept` when a stored week would not be regenerated by a schedule: it was edited by hand or made before the schedule. No store actions are added. Existing `planner.send` and `previewRecurringPlan` calls are unchanged. Convenience state is local `@State`.
- **Native payload:** additive and opt-in. The default projection and `projection-v1.json` are unchanged. The dispatch command contract is unchanged.
- **Flags and rollout:** none. Behind the existing Plan Ahead entry.
- **Do not touch:** `store.ts`, `schema.ts`, `sync-model.ts`, cloud, backup, restore, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/`. Confirmed: the branch changes six files, none of them in this list.
- **Dependencies:** none added.
- **Performance and privacy:** the outlook is eight small projections per native read. Nothing animated, blurred or stored. Nothing leaves the device.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| Swift not compiled here | No Swift toolchain in this workspace. A syntax or type error would break the iOS build. | Codemagic compile of the branch before any merge. | Owner, when the branch is pushed |
| Extra screen for first use | A new person sees an empty list first. | Empty state shows "New schedule" as the first action. | Owner, on device |
| Outlook matches Week | The outlook is computed in TypeScript and shown in Swift. Three projection tests cover opt-in, eight weeks without mutation, and a kept week with a 12-week interval. Nothing yet compares it with Week after opening a future week. | Device check: open a future week in Week and compare it with the outlook line. | Owner, on device |
| `outlook` decoding untested in Swift | The new field is decoded only by Codable, and no Swift toolchain runs here. | Add a decode case to `NativeContractsTests` on Codemagic. | Tool next session, or owner |
| Life-card day prefill and monthly cadence | Requested or in the wireframe, but outside the current rules and data. | Not built. Section 4. | Owner |
| Stale form state after Back | Returning to Plans must clear the preview so nothing confirms against an old revision. | Back clears `preview` and `previewRevision`. | Tool, implemented |

## 9. Verification and full-implementation plan

### Acceptance criteria

- Given two saved schedules, when Plan Ahead opens, then both are listed by life area with hours and cadence, and no form is shown.
- Given no saved schedules, when Plan Ahead opens, then the empty line and "New schedule" are shown.
- Given a listed schedule, when it is tapped, then the form opens with its life area, hours, cadence, start and end filled in, and "Edit series" is in effect.
- Given the form, when "Back to your plans" is tapped, then the list returns and no preview is kept.
- Given the form, when the interval is chosen, then every week through every 12 weeks is offered.
- Given "Move hours once", when tapped, then the existing transfer sheet opens and its preview and confirm behave as before.
- Given the native read, when Plan Ahead opens, then "Next 8 weeks" lists the eight weeks after the current one, marks kept weeks, and writes nothing.
- Given any path, when Close is tapped, then the sheet dismisses without a change.
- No list row or outlook line sends a command by itself.

### Checks

- On this branch: `npm run typecheck`, `npm run test:spread` (including the three outlook projection tests), `npm run test:scripts`, `npm run lint` and `npm run docs:check`.
- Swift: compile on Codemagic from the branch (owed). Not run here.
- UI test `LifeUITests` updated; run on a simulator (owed).
- Device: 390 wide iPhone, light and dark, Reduce Motion, Dynamic Type at a large size, VoiceOver reading each row and outlook week (owed).

### Full-feature implementation and refinement plan

- **Build location:** existing app, feature branch `feature/plan-ahead-plans-list`.
- **Complete scope:** plans list, form pre-fill, Back, Move once entry, empty state, 1 to 12 week intervals, read-only 8-week outlook, UI test update.
- **Verification:** see Checks. Record what is not run.
- **Refinement loop:** after the owner tests on device, adjust copy and row layout in place.
- **Questions for the tester:** Do you know how to start a new schedule? Is it easy to change one? Does the eight-week outlook match what Week shows? How can we make the list clearer?

## 10. Rollout, rollback and release

Branch `feature/plan-ahead-plans-list`, one pull request. No flag. Revert the commits to restore the segmented entry and remove the outlook. No data changes, so rollback is safe. Release authority stays with the owner; this spec is not approval to merge, upload to TestFlight or ship.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-12 | Option A chosen: Plan Ahead opens to a plans list | Owner (wireframe approval), tool (option choice) | This spec |
| 2026-11-12 | Owner accepted 1 to 12 week repeat intervals; built in the picker | Owner | This spec, DECISIONS.md |
| 2026-11-12 | Owner asked for an 8-week outlook; built read-only and opt-in in the native read | Owner (request), tool (build) | This spec, DECISIONS.md |
| 2026-11-12 | Life-card day prefill requested; saving days with a schedule not built, pending owner decision | Owner (request), tool (held per RULES_CARD and recurrence spec) | This spec, section 4 |
| 2026-11-12 | Monthly cadence excluded, pending owner decision | Tool, per recurrence spec | This spec, section 4 |
