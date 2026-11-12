# Spec: Plan Ahead recurring weekly budgets

> Part of the [design brain](../README.md). Implementation on draft PR #181; no merge or release authorization.

| | |
| --- | --- |
| Request | Make recurring time planning intuitive, including Gym one week and Community Service the next |
| Surface | Native iPhone, Life home and Plan Ahead sheet |
| Status | Interaction approved; implementation in review |
| Size | L: planner behavior, persistence and UI |
| Governing rules | `RULES_CARD.md` Behavior/Boundaries; `FOUNDATIONAL_UX_PRINCIPLES.md` Hierarchy, Hick, Jakob, Fitts, Progressive Disclosure; `ui-kit/UI_KIT.md` Navigation; `planner/SPREAD_NATIVE_BRAND_BOARD.md` Nov 11 supersessions |

## 1. Problem

A person can plan a week, but cannot say "Community Service, two hours, every other week" without manually rebuilding future weeks. The one-time hour transfer in Plan Ahead solves a different job.

## 2. Evidence and context

[Repo] `src/lib/spread/plan-ahead.ts` moves hours once and can move linked tasks, with preview and Undo. [Repo] `model.ts` seeds new weeks from responsibility defaults. [Repo] `store.ts` is authoritative and profile-local. [Owner] Use a plain native sheet, familiar calendar repeat controls and a clearly previewed confirmation, not decorative artwork.

## 3. Goals and limits

- Plan future *weekly hours* in the current local profile in two to four decisions when defaults apply.
- One rule persists for an ongoing schedule; only viewed weeks materialize.
- Show first occurrences, start, interval, end, capacity refusals and existing weeks that stay unchanged.
- Support per-week exceptions through Life's budget editor and editing/stopping saved series through Plan Ahead.
- Never copy tasks, select dates within a week, move existing commitments, invent capacity, or overwrite other weeks.
- Keep **Move once** for existing transfer semantics. No account, background scheduler, notification, sync UX or new visual framework.

## 4. Rule boundary and exception

The design rules forbid changes to schema and sync/backup paths during *UI-only* changes. Recurrence is not UI-only. Owner authorized the architecture work on Nov 12. To avoid older builds dropping records, use schema v5, new optional `recurringPlans` in the existing profile data, normalizer support, and additive item mapping in `sync-model.ts`. Do not change network or iCloud configuration. Full backups already serialize the profile. This is a narrow data-protection exception, not permission to expand cloud features.

## 5. Options and choice

| Option | Strength | Risk |
| --- | --- | --- |
| Store every future week in advance | Simple per-week reads | Unbounded copies, large write, hard series edits |
| Native-only recurrence manager | Simple Swift view | Second store and drift |
| **Chosen: store compact rule and materialize only viewed weeks** | Single source of truth, bounded data, predictable exceptions | Requires provenance and compatibility |

### Breadboard

Life: **Plan Ahead** opens native sheet. Segmented control: **Repeat schedule** (default) / **Move once**. Repeat form: Life area, hours, Repeat, Starts, Ends. Primary button: **Review schedule**. Review includes schedule summary, next occurrences and preserved-week warnings. Primary changes to **Confirm schedule**. Existing schedules have Edit series, This and following weeks, Stop repeating. Life budgets changed in a generated week become **that week only**.

### States

Empty: ask person to create a Life area. No capacity: explain requirement to set weekly total. Invalid/overbooked: show why and block Confirm. Busy: disable action and show progress. Offline: all recurrence rules stay on device. Existing week: protect its contents and identify it in review. Undo: restore the full local plan when still unchanged. Large text: sections wrap vertically.

## 6. Interaction and accessibility

System SF typography, existing native background/accent/role data colors; one primary action in each state. Sheets and tap controls at least 44 pt. VoiceOver announces field, hour amount, repeat frequency, start/end and confirmation status. No glow or animation is needed for comprehension. Verify dark/light, Dynamic Type, Reduce Motion and spoken confirmations on a physical iPhone. Date pickers must use the same UTC Gregorian calendar as Monday week keys to avoid a Sunday/Monday display mismatch in local time zones.

## 7. Technical contract

- `model.ts`: `RecurringPlan`, optional `WeekData.recurrenceSource` and `SpreadData.recurringPlans`. Existing weeks without origin remain untouched.
- `recurring-plan.ts`: pure preview, apply, split and stop. A rule affects role budget per week, not task/day allocations. The rule controls future unplanned weeks from the next week onward (0h before its first occurrence); existing materialized weeks remain protected. Every interval is 1–12 weeks; dates use Monday week keys and UTC whole-week differences for DST safety. Validation tests representative cycle phases and configured capacity.
- `store.ts`: one atomic commit/Undo; Life budget edits mark manual week overrides. No second store.
- `native-v2-dispatch.ts`: validated preview and create/edit/stop commands, stale revision and profile protections.
- `LifeRecurringPlanForm.swift`: native editors and review. Original transfer sheet remains accessible.
- `schema.ts` and `sync-model.ts`: additive compatibility handling, tested older-version lockout and roundtrip.

## 8. Risks and safeguards

Future roles/default hours may change after a rule was confirmed and cause a capacity conflict in a yet-unopened week. Refuse silent budget inflation and mark the generated week's issue for review. A previously opened week may be manually configured, with no provenance: preserve it and disclose this in the preview. Editing a rule may only rewrite *generated, still-unmodified* budgets; if task allocation or capacity would conflict, keep the week and surface the need to resolve it.

## 9. Acceptance tests and evidence

- Gym 2h every two weeks starting Week A and Community Service 2h starting Week B alternate correctly.
- Repeated weekly hours do not manufacture or duplicate tasks or appointments.
- Existing and customized weeks remain untouched; one-week edit leaves following occurrences unchanged.
- Finite end, Never, split series, stop, undo, invalid date/interval/amount, over-capacity, and conflicting rules.
- Reload/normalization, schema-5 downgrade lock, full backup, item sync mapping, native preview read-only and stale request protection.
- Run TS typecheck, lint, all planner tests, scripts tests, and App Store preflight. Native Swift package and Codemagic iOS archive with actual iPhone screenshots/VoiceOver are still release gates.

## 10. Rollback

Leave `main` intact until owner approval. Revert PR if validation fails before merge. After schema v5 is released, older builds must fail closed for writes; do not downgrade users by discarding recurrence rules. Preserve a verified full backup before release and retain the old one-time transfer path.
