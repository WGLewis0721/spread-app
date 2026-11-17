# Spec: Life weekly rituals and personal scoreboard

> Part of the [Spread design brain](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).

| | |
| --- | --- |
| Request | ChatGPT completes functional 75%; Codex owns final 25% visual and wow-factor pass |
| Restated | Week in Review is a cinematic story, Week Ahead a working guided planner, Your Journey a numerical multiweek scoreboard |
| Surface | Native SwiftUI for iPhone, iPad and Duo |
| Size | L |
| Author | ChatGPT, 2026-11-17 |
| Status | In review, implementation on a feature branch; not approved for merge or release |
| Governing docs read | [Rules](../RULES_CARD.md), [map](../README.md), [UX](../FOUNDATIONAL_UX_PRINCIPLES.md), [native board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), [UI kit](../ui-kit/UI_KIT.md), [protocol](../PLAN_SPEC_PROTOCOL.md) |

## 1. Problem

The PR #258 screens are utility sheets rather than the emotional payoff of a week lived and a guided way to make next week's commitments. Review is three metrics, Ahead merely marks cards reviewed, and Journey only describes one week.

## 2. Evidence and context

- [Repo] PR #258 introduced the three More destinations and basic screens in LifeEngagementSheets.swift.
- [Repo] The authoritative planner is src/lib/spread/store.ts. LivePlanner.send routes mutations through its guarded bridge.
- [Repo] [Owner iPhone references](../../../evidence/life-ios-reference/owner-captures-2026-11-17/README.md) and the native editorial art direction govern app identity.
- [Owner] Review feels like Spotify Wrapped or Apple Music Replay, Ahead like onboarding through all Life areas, Journey like a numerical scoreboard.
- [Repo] The app records budgets, day reservations and completed tasks. It does NOT measure actual time physically spent. Never label reserved time as time spent.

## 3. Goals, non-goals and budget

- **Goals:** five-chapter data-driven weekly story; actionable guided hours-days-tasks flow across every existing Life card; real multiweek scoreboard and a meaningful finish.
- **Non-goals:** new persistent fields, actual time tracking, accounts, gamified streaks, random prizes, new push schedule, cloud, production or marketing changes.
- **Appetite:** three integrated native screens, one opt-in read-only historical projection, tests, and a dedicated Codex finish. No duplicate planner.

## 4. Rules that apply and exceptions needed

| Rule | Application |
| --- | --- |
| [Rules, Look](../RULES_CARD.md) | Reuse navy/cream, native tokens, editorial Life artwork and role colors, not new palette or typography |
| [Rules, Behavior](../RULES_CARD.md) | Planner ACK controls success; no automatic rollover or unconfirmed future changes |
| [Rules, Boundaries](../RULES_CARD.md) | No cloud, storage schema, server, golden branch, backup or restore changes |
| [Foundational UX](../FOUNDATIONAL_UX_PRINCIPLES.md) | One primary action per step, 44-point touch targets, truthful feedback, accessible paths |

**Exceptions needed:** None.

## 5. Options and the chosen concept

| Option | Structure | Pros | Cons |
| --- | --- | --- | --- |
| A | Keep three metric sheets | Inexpensive | Little reward or guided planning |
| B | New single engagement dashboard | One surface | Adds navigation and unnecessary complexity |
| C | Three distinct experiences in existing More | Retrospective, action and scoreboard payoffs | Requires accurate history projection |

**Chosen:** C. Preserve the existing three entries and keep each interaction distinct.

### Breadboard of the chosen concept

- **Week in Review:** five story chapters showing week, hours reserved, role distribution, actual task completions and the top time allocation. Back/Continue. Final action opens Week Ahead through normal sheet dismissal.
- **Week Ahead:** user explicitly chooses the selected week or following week; sets capacity if missing; for each Life card adjusts budget, places hours on days, adds tasks. Supports Back, Skip, Next and Finish. Every write uses LivePlanner.send.
- **Your Journey:** 26 or fewer actual stored weeks through the selected week. Big totals for placed hours, completed tasks and weeks, per-role numeric rows and week history. No measure of actual time spent.

### States

Empty, no capacity, zero-hour role, no task, busy save, rejected save, missing old history, offline, profile switch, long names, dense list, end-of-ritual and safe dismissal must be handled without fictitious progress.

## 6. Platform behavior

Verify 390, 820, 1024 and 1366 points, iPhone, iPad and Duo safe areas, both appearances, large text, VoiceOver, pointer, keyboard, Reduced Motion, Reduced Transparency and increased contrast. Use existing Spread motion and haptic policy. Do not make a gesture the only route.

## 7. Technical approach

- LifeEngagementSheets.swift owns the three native screens.
- ManageSheets.swift keeps More navigation and supplies the live planner to Ahead.
- native-v2-projection.ts exposes optional stored-week summaries, only for requested native snapshots.
- native-v2-dispatch.ts requests history for the live native UI.
- PlannerSnapshot.swift decodes an optional read-only projection, NOT a persistence schema migration.
- Existing store actions guard all budgeting, allocation and task changes; no new store or dependency.
- No network transfer; native UI reads local profile data only.

## 8. Risks, rabbit holes and open questions

| Item | Reason | Proposed default | Who decides |
| --- | --- | --- | --- |
| Actual time spent | No tracking source | Report hours scheduled and tasks completed | Owner |
| Sunday target week | Users may already be on a custom future week | Explicit selected/following week choice | Owner |
| Existing recurrence | Must not overwrite customized future plans | Always edit the chosen actual week through existing actions | Engineer |
| Wrapped-inspired motion | Must retain Spread identity and accessibility | Refine established card typography, transitions and art | Codex |
| Verification | Source review cannot prove visual/physical feel | Native build plus screenshots and device run before merge | Owner |

## 9. Verification and full-implementation plan

### Acceptance criteria

1. Review has five factual, navigable chapters, real empty states and a functional Week Ahead handoff.
2. Ahead edits the chosen actual week, visits every Life area and saves budgets, day placements and tasks only through acknowledged planner commands.
3. Back, Skip, Next and Finish are operable. Failed saves preserve draft and show an error.
4. Journey shows at most 26 existing saved weeks, excludes removed areas and later weeks, and reveals no task text or rich notes in historical projection.
5. All numbers distinguish scheduled hours from time physically spent; no invented wins.
6. Existing Life, Week, Planner, More, widgets and stored data are unchanged except for scoped presentation/read-only projection.

### Checks

- Locally on Codex laptop: npm run typecheck, npm run lint, npm run test:spread, npm run test:scripts, npm run docs:check, native typecheck/build and UI tests.
- Physical device owed: dark/light captured screenshots, iPhone and iPad, scroll fit, relaunch persistence, offline, VoiceOver, Dynamic Type and Reduced Motion.
- No app tests or device checks have yet been run by ChatGPT for these new changes.

### Full-feature implementation and refinement plan

**ChatGPT, 75%:** functional SwiftUI flows, guarded state updates, read-only numeric history, tests, design contract and Codex handoff on one feature branch.

**Codex, 25%:** visual and motion polish, editorial storyboard quality, detailed screenshots, interaction and accessibility fixes, automated test runs and physical device evidence. Work in the same branch, not a separate prototype.

Tester questions: Is the next action obvious? Can you finish Sunday planning without returning to Week? Does the Saturday presentation make the real week memorable?

## 10. Rollout, rollback and release

Feature branch: feat/life-rituals-core-2026-11-17. Open a draft PR. No merge, deployment, TestFlight, release, or changes to production without explicit authorization. Close PR or revert commits to roll back; no profile migrations.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-17 | Three distinct native payoff experiences: editorial story, real guided week, numerical scoreboard | Owner | This spec |

## CODEX HANDOFF: FINAL 25% — STYLE, WOW, VERIFICATION

Work from this exact feature branch. Inspect its implementation and current Life theme. This is a real-app refinement, NOT a request for another prototype or new framework. Keep the existing data and bridge rules.

1. **Week in Review:** Transform its five existing factual chapters into a true Spread editorial story. Large expressive type, real artwork, lovely but restrained transitions, meaningful pacing and seamless gestures plus button alternatives. Spotify Wrapped or Apple Music Replay energy, not their copied UI or fake statistics.
2. **Week Ahead:** Turn the existing functional Life-by-Life weekly budget, seven-day allocation and task composer into an inviting one-question-at-a-time ritual. Maintain a thumb-reachable primary action, visible progress, Back, Skip, Finish, save-error feedback and the real store.
3. **Your Journey:** Treat this as an elegant numerical scoreboard. Strong hierarchy for hours placed, task completions and weeks represented; clear per-area contribution and meaningful history comparisons. Show labels that are truthful: planned, placed, finished. No made-up hours spent.
4. **Hard QA:** Run typecheck/lint/TS tests, native build/typecheck/UI tests and all layout checks. Fix failures. Test 390/820/1024/1366, iPad/Duo, VoiceOver, Reduce Motion, both themes, empty/large data, offline/relaunch. Export real code-rendered screenshots of all three destinations with build/commit provenance.
5. **Deliver:** Before/after images, exact file paths, tests, logs, follow-up issues, release gate. No production merge or deployment.

Retain the optional read-only snapshot.history contract. If the owner wants actual elapsed-time tracking, document it as a separate product decision rather than infer it from planned hours.
