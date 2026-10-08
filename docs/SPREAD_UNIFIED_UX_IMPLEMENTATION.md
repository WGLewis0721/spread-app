# Spread — Unified UX, Reliability & Apple Integration Plan

**Status:** Implementation specification; repository verification required  
**Repository:** https://github.com/WGLewis0721/spread-app  
**Production:** https://spread-app-teal.vercel.app  
**Delivery:** One feature branch, one integrated pull request  
**Release authority:** Human approval required

## 1. Mission and principles

Implement a cohesive improvement to Spread's everyday planning experience, reliability, visual consistency, and supported Apple platform capabilities. Preserve **Responsibilities → Hours → Week → Tasks**.

**Everything belongs. Nothing competes.** The UI should feel nearly invisible in routine use, while retaining a distinctive, personal Spread identity. Prefer predictable interactions, progressive disclosure, accessibility, subtle motion, and consistent reusable components over visual novelty or added complexity.

Preserve the golden main branch. Do not introduce mandatory accounts, a second task store, unnecessary backends, paid AI dependencies, or unrelated rewrites.

## 2. Baseline audit — mandatory before edits

1. Fetch current `main`, record its full SHA, and create `feature/spread-unified-ux` from that SHA.
2. Read the existing README, roadmap, release plan, agent instructions, architecture notes, and relevant tests. Locate their actual paths; do not assume filenames.
3. Inspect the React component tree, styling/tokens, persistence, task identity, capacity calculations, drag behavior, weekly rollover, Capacitor/native configuration, and current sync/backup implementation.
4. Classify each requested capability as **already implemented**, **partially implemented**, **missing**, **blocked**, or **unsupported** with file references.
5. Check open PRs and security findings, especially iCloud work. Do not override unresolved security gates.
6. Capture a concise baseline of relevant test/build results and visual behavior.

Verified code is authoritative. Do not duplicate existing functionality.

## 3. Design system foundation

Consolidate existing tokens and primitives rather than replacing working components. Establish a single source of truth for typography, spacing, color, responsibility accents, corner radii, shadows/elevation, icons, motion, focus/pressed/selected/disabled/loading/error states, and responsive layout. Respect light/dark appearance where already supported, touch targets, keyboard access, screen readers, contrast, and reduced motion.

Canonical component families (adapt names to the repository): `TaskCard`, `ResponsibilityChip`, `CapacityIndicator`, `WeekNavigation`, `QuickCapture`, `ActionSheet`, `UndoToast`, `EmptyState`, `SyncStatus`. Avoid parallel implementations of equivalent controls. Migrate the affected flows to canonical components; do not perform a full-app visual rewrite without need.

### Inspiration and provenance

Research and record exact reference URLs, relevant behavior, Spread adaptation, license/dependency implications, and anti-patterns:

- [21st.dev](https://21st.dev): React components and interaction patterns.
- [Refero](https://refero.design): real app flows and progressive disclosure.
- [Pinterest](https://www.pinterest.com/search/pins/?q=minimal%20weekly%20planner%20app%20ui): visual composition inspiration, not licensed assets.
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/): platform interaction, accessibility, layout, and motion.
- [Apple Developer Documentation](https://developer.apple.com/documentation/): verified native APIs.

Do not require paid subscriptions or Figma AI credits. If a catalog is inaccessible, note the limitation and use available references. Figma may be used for optional review, but source code/tokens in the repository are canonical.

## 4. Feature requirements and explicit pass/fail gates

### 4.1 Undo after task drag

Implement a bounded reversible move transaction preserving previous day, ordering, responsibility, and scheduling metadata. Show an accessible temporary Undo action after successful movement. Protect against stale undo reversing unrelated later changes.

- **PASS:** Undo restores the exact prior persisted state and ordering.
- **FAIL:** Duplicates tasks, restores only visible placement, overwrites unrelated changes, or loses metadata.

### 4.2 One-tap “Not today”

Add a quiet contextual defer action. Reuse an existing unscheduled/backlog/deferred model where possible; do not add a new lifecycle unnecessarily.

- **PASS:** The task leaves today's active plan, retains identity/content/responsibility, and remains discoverable.
- **FAIL:** Task disappears, is completed/deleted, or is assigned an arbitrary date.

### 4.3 Remember where I was

Persist lightweight view context per local profile: valid week/day, selected responsibility/filter, and practical scroll position. Restore safely after startup, with fallbacks for stale or deleted references. Do not persist ephemeral menus or private information beyond necessity.

- **PASS:** Reopen returns to a meaningful prior context for the correct profile.
- **FAIL:** Wrong profile, blank screen, trapped navigation, or stale invalid selection.

### 4.4 Gentle completion haptics

Provide one restrained completion haptic through an existing Capacitor/native adapter if supported, with a safe web fallback and reduced-motion/accessibility consideration.

- **PASS:** Completion succeeds everywhere; supported iOS receives a single subtle acknowledgment.
- **FAIL:** Duplicate haptics, unsupported-platform errors, or task completion coupled to the native bridge.

### 4.5 Deterministic “You have 45 minutes free” suggestion

Use verified responsibility/hour capacity and actual planned commitments. Suggest only incomplete, eligible tasks with known duration that fit available capacity. Avoid double-counting, hidden scheduling assumptions, and automatic task placement. Offer few suggestions, clear rationale, explicit user action, and a graceful no-suggestion/unknown-capacity state.

- **PASS:** Candidate duration fits verified remaining capacity; user controls placement.
- **FAIL:** Invented free time, overbooking, double-counting, unsupported assumptions, or automatic placement.

### 4.6 Suggested weekly rollover

At the user's actual week boundary, offer review of unfinished tasks. Reuse existing rollover functionality. User explicitly selects which tasks move. Preserve identity/content/metadata and ensure repeated submission is idempotent.

- **PASS:** Selected tasks move once; declined tasks remain unchanged.
- **FAIL:** Duplication, disappearance, metadata loss, or forced rollover.

### 4.7 Offline-first reliability

Audit all core writes and storage boundaries. Task creation/edit/move/complete/defer/rollover must work offline and persist after restart. Preserve current local-first source of truth and handle failure/recovery visibly.

- **PASS:** Representative offline workflow survives restart with intact data.
- **FAIL:** Network required for core actions, lost edits, or silent overwrite.

### 4.8 Accurate backup and synchronization status

Inspect existing iCloud implementation and security findings. Distinguish **saved locally**, **backed up**, and **synchronized to another device**. Report timestamps only from confirmed events. Handle pending, offline, failed, and successful states accurately. Do not introduce a new cloud service.

- **PASS:** Status reflects real acknowledgments and never conflates local save, backup, and cross-device sync.
- **FAIL:** Fabricated cloud success, silent failures, or unsafe data overwrite.
- **BLOCKER:** If secure cloud primitives are unavailable or under security remediation, implement truthful local status only and mark cloud status **DEFERRED/BLOCKED**, never fake it.

## 5. Apple platform scope

**Required where supported by current code:** adaptive compact/expanded iPhone/iPad layouts, iPad resizable-window behavior, safe areas, native haptics, accessible controls, and stable task identifiers suitable for future cross-device references.

**Conditional enhancements:** App Intents/Siri for creating a task, opening a week, and retrieving today's work; optional Foundation Models structured task capture with explicit confirmation; read-only widgets/StandBy presentation; cross-device App Intent entity resolution only after secure sync is established.

Verify public SDK documentation, target OS, signing/build tools, plugin availability, and test devices before implementing. **Do not assume iOS 27, “iPhone Duo,” foldable hinge, or reserved-region APIs are available.** Build robust responsive layouts first. Unsupported or untestable native capabilities must be explicitly deferred rather than simulated.

## 6. Architecture constraints

- Keep task mutations and persistence in existing authoritative abstractions.
- Isolate pure capacity matching from UI, reversible task operations from drag visuals, view-context storage from domain data, and native adapters from web behavior.
- Preserve stable IDs and backward compatibility with existing local data.
- Any schema migration must be idempotent, safe on representative existing data, and reversible where feasible.
- Do not create competing task stores, cloud write paths, account systems, or excessive dependencies.
- Avoid unauthorized modification of iCloud security-sensitive paths.

## 7. One-branch execution sequence

Implement sequentially on `feature/spread-unified-ux` with meaningful commits, then deliver **one integrated PR**:

1. Audit and baseline evidence.
2. Design tokens and reusable components.
3. Undo, defer, view-context restoration, and completion feedback.
4. Deterministic capacity suggestion and rollover.
5. Offline persistence and truthful backup/sync state.
6. Responsive/native enhancements where supported.
7. Targeted tests, visual/accessibility review, documentation, and final integrated regression pass.

Do not merge, deploy, or change production.

## 8. Targeted verification — no test-count theater

Use existing test infrastructure and write tests only for directly affected behavior. Required evidence:

- Undo restores exact state/order and avoids stale reversal.
- Deferred tasks retain content/identity and remain findable.
- Per-profile view context restores safely.
- Capacity boundary cases, missing duration, and abstention.
- Rollover selection and repeated-submit idempotency.
- Offline mutation/restart integrity.
- Backup/sync transitions never overclaim success.
- Native adapter fallback; haptic non-blocking behavior.
- Critical Responsibilities → Hours → Week → Tasks regression.
- Relevant phone/tablet layouts, keyboard/screen reader, and reduced motion.
- Typecheck/lint/build and relevant existing tests, as available.

Do not manufacture dozens of unrelated tests. Disclose tests that could not run, especially device-specific checks.

## 9. Documentation updates upon verified completion

Reuse existing documentation structure; avoid contradictory parallel ledgers. Update only relevant existing files, creating a new document only when needed:

- **This implementation spec**: final feature-by-feature **PASS / FAIL / DEFERRED / BLOCKED** matrix, code references, and baseline/final SHA.
- **Existing design-system documentation** (or `docs/design/SPREAD_DESIGN_SYSTEM.md` if absent): canonical tokens/components, states, accessibility, motion, responsive rules, reference provenance.
- **`ROADMAP.md`**, if present: verified delivered features and deferred native/cloud scope.
- **Existing engineering/architecture documentation**: storage/undo/capacity/native adapter/sync decisions and migrations.
- **`APP_STORE_RELEASE_PLAN.md`**, if present: supported native integrations, privacy implications, outstanding device/release gates.
- **`README.md`**, if material user-visible capabilities change.
- **Existing QA/test documentation**: focused verification evidence and unresolved gaps.

Never mark a capability done solely because code exists or a unit test passes; verify user-visible behavior and data integrity.

## 10. Release gates, rollback, and final report

A PR is ready for independent review only if core planning works, no data is lost/duplicated, implemented features meet PASS criteria, design is coherent, offline reliability is intact, status claims are truthful, targeted checks pass, and documentation matches code. Security/data-integrity failures block the PR.

Document rollback: revert PR before merge; if any persisted data shape changes, provide compatibility/migration reversal or safe-forward recovery instructions. No destructive rollback of user data.

Final report must include baseline main SHA, final branch SHA, PR URL, existing/added/modified/deferred matrix, implementation summary, files and architecture changes, reference links, tests/results, device/accessibility limitations, security risks, documentation changes, rollback plan, and explicit **READY FOR REVIEW** or **BLOCKED** recommendation.

**Never merge or deploy without explicit human authorization.**

---

## Result matrix (filled in on `feature/spread-unified-ux`)

Baseline: `5b0bdb05e4bfaf8dc86d7a8e081c6badf123e705` (main at the start of the work; main was merged in again at `a0defbb` before review, with no conflicts). Final SHA: the tip of this branch when the PR was opened (shown on the PR). Production, deploys and stored data were not touched.

| # | Feature | Result | Where | Evidence and honest limits |
| --- | --- | --- | --- | --- |
| 3 | Design system | PASS | `docs/design/SPREAD_DESIGN_SYSTEM.md`, `src/spread/ui/undo-toast.tsx` | Tokens and patterns written down from the code that exists. No new colours, fonts or decorative styles; the three hard-coded grey fallbacks in the new week code were changed to `var(--tertiary)`. |
| 4.9 | Drag and drop for tasks (added request) | PASS with a hardware pass owed | `task-schedule.ts`, `resolve-drop.ts`, `weekly-view.tsx`, store `assignTask` | Resolution and store logic unit tested. Tap path ("Place" / "Move to") and keyboard drag (Space, arrows step day by day, Space, announced) driven in Chromium and persisted; the tap path also runs in CI (`native_e2e.py`). A synthetic mouse drag did not start in headless Chromium, **and neither did the existing allocation drag used as a control**, so mouse and touch-hold drags are unverified here and need the iPhone/iPad pass. A task only goes on its own role's day: a drop on another role's row lands on its own row that day, and a day without its role is refused with a message. |
| 4.1 | Undo after drag | PASS | `week-edit.ts`, store `undoable`/`undoEdit` | Restores the exact week, is saved, undoes once, refuses (and changes nothing) if the week changed since, still works after turning to another week. Only the latest change shows Undo. Also covers placement, take-off, Free time and Not today. |
| 4.2 | One-tap "Not today" | PASS | `spread-app.tsx` `TaskRow` | "Not today" appears only on tasks placed on today; other placed tasks show a day tag. Task keeps id, text and notes; it returns to To place; Undo offered. CI: `native_e2e.py` places a task, takes it off with Not today and undoes it. |
| 4.3 | Remember where I was | PASS | `view-context.ts` | Spread or Week and week or month, per profile, under `spread-view.<profileId>` so backups never sweep it up. Verified across a browser reload. Does not restore scroll position or open task. |
| 4.4 | Completion haptics | PASS in code; DEFERRED on hardware | `haptics.ts`, `@capacitor/haptics@8.0.2`, `ios/App/CapApp-SPM/Package.swift` | One light tap on completing, iPhone app only, none on web or with Reduce Motion, failures swallowed. Unit tested with a fake device. Not felt on a real phone. |
| 4.5 | Free-time suggestion | PASS (adapted) | `free-time.ts`, Free time card in Week | Spread has hours per role, not task durations or clock times, so the "45 minutes" wording is **DEFERRED**. What ships is deterministic, at most three suggestions of roles with unplaced hours on the lightest day ahead, applied only on tap, with abstain states. |
| 4.6 | Weekly rollover review | PASS | `task-rollover.ts`, "Review open tasks" sheet | Chosen open tasks move once with ids and notes kept, are taken off days, never duplicate on repeat, never touch next week's own tasks, and never leave this week unless they landed in next week. Offered as a quiet link beside Rollover. The existing whole-week Rollover and Copy last week are unchanged. |
| 4.7 | Offline-first | PASS in simulation; DEFERRED on device | `offline.test.ts` | With fetch, XHR, WebSocket, EventSource and sendBeacon all throwing, the whole new flow makes zero network attempts and what is on screen equals what is saved. Airplane Mode on a device is part of the hardware pass. |
| 4.8 | Truthful status | PASS for this device; cloud DEFERRED/BLOCKED | `local-status.ts`, "Saved on this device" row in More | Reports the real result of the last write (full, blocked, paused by a newer version) and the time. Never mentions iCloud. iCloud status code is unchanged and still behind its flags; its re-audit and hardware gates are still owed. |
| 5 | Apple-native (App Intents, widgets, on-device models) | DEFERRED | none | Not verifiable here and the data model has no durations to feed them. Only `@capacitor/haptics` was added. |
| Fix | Folding two allocations of one role on one day dropped the tasks linked to the removed one | FIXED | store `moveAllocation` | Regression test in `task-schedule-store.test.ts`. |
| Doc | `docs/ICLOUD_PLAN.md` audit row said fixes were unmerged | FIXED | docs | Now says merged (35761a9), re-audit not done. |

### Second review pass (fixes found after the PR was opened)

| Finding | Severity | Fix | Evidence |
| --- | --- | --- | --- |
| Once any task was placed on a day, the planner showed "Something went wrong" (Maximum update depth exceeded): the Spread task row selected a new object from the store on every read | Blocker | Select a plain date string (`placedDay`) | Reproduced in Chromium. New `native_e2e.py` checks fail on the old selector and pass now. |
| A keyboard sensor on every draggable made Enter and Space on a spread bubble start a drag instead of selecting it; a second Enter dropped it and added the spread to a day | High (accessibility, unintended writes) | Keyboard dragging is for tasks only (`TaskKeyboardSensor`); arrows step to the next day or the tray (`zoneKeyboardCoordinates`) instead of 25 px nudges | Browser check fails on the old sensor, passes now; `stepZone` unit test |
| Review open tasks could remove a task from this week that had no box to land in next week (a removed role's leftover box) | Medium (data loss, unlikely path) | A task leaves only once it is in next week; leftover boxes are not offered | `task-rollover.test.ts`, red on the old code |
| Undo refused after turning to another week and back, and older Undo toasts stayed up although they could only fail | Low | Undo checks only that week; a new Undo replaces the old one | `week-edit.test.ts`, red on the old code; CI check "only the latest change offers Undo" |
| Switching profile wrote the old profile's view under the new profile's key for one render | Low | The view is written only once it belongs to the open profile | Code review |
| "Take off Fri" on every placed task, a full-width Review button and an unbounded To place list crowded the screens | Design | Not today on today's tasks only; Review is a quiet link beside Rollover; To place is grouped by role and folds (one row per role, a plain task list inside, day choices as chips); tasks on a day fold under their role; Free time is a row of chips and To place a dashed tray, so neither looks like a day; a drop on another role's row lands on its own row | Screenshots at 390 and 1024, light and dark |
| The Spread / Week tabs had no accessible name once the header compacted (pre-existing on main) | Accessibility | `aria-label` on each tab | Browser check |

### Checks run (all on the final tree)

- `npm run typecheck`: 0 errors. `npm run lint`: 0 errors, 3 warnings (all pre-existing). `npm run test:spread`: 318 of 318. `npm run test:scripts`: 191 passed, 4 skipped. `npm run build`: succeeds.
- iOS bridge simulators in Chromium: installed app 32/32 (5 new checks for placing, Not today and Undo), restore 14/14; backup and sync simulators run in CI.
- Chromium at 390, 820, 1024 and 1366 wide, light and dark, reduced motion on in dark: no horizontal overflow, no page errors.

### Not touched

`cloud*`, `sync-*`, `backup*`, `merge.ts`, `restore-tx.ts`, `pins.ts`, `consent.ts`, `safety.ts`, `rollback.ts`, `native-mirror.ts`, `schema.ts`, `ios/App/App/Cloud`, `ios/App/SpreadCloudCore`, the landing page, `public/__grok`, `server/`, and every `golden/*` branch. Stored planner data format is unchanged (no migration); `Task.allocationId` already existed.

### Rollback

Revert the PR. Nothing is stored in a new format: a task's day link is the existing optional `allocationId`, and the remembered view is a separate `spread-view.*` key that older builds ignore. The one native change is `@capacitor/haptics` in `Package.swift`; reverting removes it.

### Recommendation

**READY FOR REVIEW**, with these owed before TestFlight: touch-hold and mouse drag of a task on an iPhone and iPad, the haptic, Airplane Mode planning, and the existing iCloud re-audit and Gates 3 and 4.
