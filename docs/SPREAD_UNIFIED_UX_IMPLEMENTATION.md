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
