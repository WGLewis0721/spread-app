# Spec: Tactile Precision for Spread

> Part of the [Spread design brain](../README.md). Follow the [spec protocol](../PLAN_SPEC_PROTOCOL.md) and [template](TEMPLATE.md).
>
> Summary: Capture the owner's fidget-inspired motion direction as a measurable native UI design proposal. Reuse the approved Wallet/Life components, preserve the Life browser reference and Classic, and validate fluidity on physical devices before any implementation merge.

| | |
| --- | --- |
| Request | Make Spread feel as satisfyingly precise and repeatable as a machined fidget toy, with tactile Wallet cards, Crown, Hours, Week, tasks and sidebar; add a dedicated repo folder and a root map. |
| Restated | Give people using Spread on iPhone, Duo and iPad a unified, immediate, predictable physical interaction language without slowing weekly planning or changing its data. |
| Surface | Native SwiftUI: Life, Wallet, Hours, Week, Crown, sidebar and tasks |
| Size | L: cross-surface interaction system |
| Author | Design specification, 2026-11-06 |
| Status | **Draft motion contract.** Owner requested documentation; implementation, speed calibration and release are not approved. |
| Governing docs read | [Root Life spec](../../../SPREAD_LIFE_IOS_SPEC.md), [native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), [61 Week/Month decisions](2026-11-04-week-month-owner-decisions.md), [rules card](../RULES_CARD.md), [Apple-native pack](../packs/apple-native-feel.md), [iOS 27 audit](../platforms/IOS27_BEHAVIOR_AUDIT.md) |

## 1. Problem

Someone planning a busy week moves between their life-area cards, time allocations and daily tasks. Even if every action is functionally correct, delayed touch feedback, inconsistent timing, jumping text or competing gestures make the UI feel mechanical in the bad sense: hesitant and fragmented. They want precision and delight without spending extra time in the app.

## 2. Evidence and context

- [Repo: source inspected, main 86023907cbb88e1252b731b2d5073bc3133c20a3] LifeWalletStack.swift has selection, editing swipe-reveal and accessibility actions; LifeRoot.swift renders role details as a separate field and a compact navigation overlay. These are **existing source structures**, not features newly proposed here.
- [Repo] LifeHoursView.swift has angle/drag handling, half-hour stepping and rate-limited haptic cues; WeekCrownView.swift has adjustable Crown actions; SpreadTheme.swift centralizes SpreadMotion and SpreadHaptics; ResponsibilitySidebar.swift provides a sidebar component. Native implementation exists in source; actual tactile quality and device parity are **not verified** by this documentation task.
- [Repo] Current native motion includes a 420 ms primary curve, 340 ms Week slide and 160 ms press effect; do not declare a proposed faster curve superior without measured comparison.
- [Repo] The approved Life browser reference and the root Life specification take precedence over proposed changes to visuals, gesture directions, navigation placement or copy. More/Settings and Classic remain unchanged.
- [Rec] Atoms contributes the principle of meaningful, repeatable touch transitions. TimeKeep is a reference for legible time visualization; no exact TimeKeep animation implementation was verified. Fidget toys contribute the physical metaphors of inertia, resistance, detents, and snap-to-rest.
- **Not checked:** Xcode compilation, runtime behavior, native tests, device captures, physical haptics and recent CI evidence.

## 3. Goals, non-goals and budget

**Goals:** (1) Finger-down feedback is immediate. (2) Every interactive object has one predictable rest state and can be interrupted. (3) The same gesture produces the same motion/haptic signature. (4) Tactile polish makes planning faster or clearer. (5) No extra planner writer, data loss, or loss of accessibility.

**Non-goals:** A game-like fidget mode, compulsive reward loops, extra navigation destination, new visual palette or fonts, sweeping React redesign, a new scheduler, changes to approved Life reference, new data schema, or release authorization.

**Appetite:** One isolated prototype and several focused implementation PRs, only after owner review. Do not accept broad platform rewrite or new dependencies as the cost of polish.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | Effect on proposal |
| --- | --- |
| [Rules card](../RULES_CARD.md), Look/Behavior | Keep one native Wallet stack, original art, metal Crown, existing role data, tap and keyboard alternatives, reduced motion and store-driven mutations. |
| [Native board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), Identity | Retain full-width overlapping Wallet and the approved native look. |
| [Life spec](../../../SPREAD_LIFE_IOS_SPEC.md), Goals and approved reference | No change to More, Classic, demo hashes, current gesture directions or approved layout without owner decision. |
| [61 Week decisions](2026-11-04-week-month-owner-decisions.md), Interaction contract | Preserve independent day/week gesture zones, sidebar semantics and scheduling invariants. |
| [Apple-native pack](../packs/apple-native-feel.md), checklist | Reduce Motion, VoiceOver, Dynamic Type, haptics and device QA are required. |
| [Rules card](../RULES_CARD.md), Boundaries | Native polish cannot mutate cloud, backup, schemas or planner data architecture. |

**Exceptions needed:** If a prototype proposes always-visible sibling cards while Life is focused, or changes the approved curve/gesture behavior, record a before/after comparison and obtain owner approval first. No new visual or data exception is granted here.

## 5. Options and the chosen concept

### Options considered

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| A: Decorative fidget mode | Add playful bouncing and spin effects to tasks. | Easy to notice | Distracts from Life-First purpose; creates gratuitous interaction |
| B: New physics-first shell | Replace navigation, card layout and Hours controls with a custom gesture system. | Strong design signature | Duplicates approved Life, high regression and accessibility risk |
| **C: Tactile refinement** | Reuse Life, Wallet, Crown, Hours, Week and sidebar with shared Glide / Snap / Settle behavior. | Coherent, testable, preserves golden baseline | Requires physical tuning and careful gesture QA |

**Chosen:** C. **Rejected:** A and B. Precision comes from coherent behavior, not a second UI system.

### Breadboard of the chosen concept

- **Life / Wallet:** Tap the responsibility card to focus. The selected face stays recognizable; a distinct details field below hosts the actual tasks and hour controls. Card selection settles; alternate card changes focus; existing delete/edit reveals remain explicit.
- **Hours:** A dial drag gives visible draft half-hour changes and bounded detents. Valid release commits once to the authoritative planner; invalid states explain why. Direct entry and accessible controls remain.
- **Week:** Horizontal day/week swipes are velocity-aware but bounded, with vertical scroll and task drag segregated. A tap path always exists.
- **Sidebar:** Compact, predictable navigation across existing Life/Hours/Week. On small widths it overlays; larger layouts may use the existing rail pattern. No new destination.
- **Crown:** Discrete navigation feedback and deterministic stops; retain approved bottom/side placement per current Life mode instead of inventing a new position.
- **Tasks:** Quick confirmation only after successful store writes; reorder movement is provisional until a supported store action confirms persistence.

Read the one detailed source of truth for each: [Motion contract](../tactile-precision/MOTION_CONTRACT.md) and [verification gates](../tactile-precision/VERIFICATION.md).

### States

**Empty:** one useful action, no decorative pulse. **First run:** brief gesture hint plus visible alternative. **Loading/busy:** block duplicate writes but keep safe navigation. **Error:** restore saved state with explanation. **Overflow:** content scrolls, controls remain accessible. **Offline:** same local planner works. **Undo:** use existing supported capability only. **Rejected action:** one warning, no false success. **Interrupted animation:** settle to the latest valid target.

## 6. Platform behavior

- **Widths/orientation:** Standard iPhone 390/393 pt, width 820, iPad 1024/1366 pt, and all supported Duo postures. Adapt by usable width and safe-area/fold constraints, not device name.
- **Appearance:** Existing native palette and role data only; test light/dark, Increase Contrast and Reduce Transparency.
- **Accessibility:** >=44 pt targets, VoiceOver labels and order, adjustable actions, Dynamic Type, Reduce Motion instantly changes state without spatial movement, keyboard and tap alternatives for drags.
- **Input and feel:** Touch, pointer and keyboard must reach the same end state. Haptics are optional and may be absent on simulator. No repeated ticks for scrolling or invalid writes.

## 7. Technical approach

- **Entry points:** existing LifeWalletStack.swift, LifeRoot.swift, LifeHoursView.swift, LifeWeekView.swift, WeekCrownView.swift, ResponsibilitySidebar.swift and SpreadTheme.swift.
- **Data/state:** view-local animation state only. Existing LivePlanner and TypeScript planner store remain the sole committed data route. No new schema, cloud flag, mandatory account or separate task store.
- **Tuning:** centralize reusable motion behavior in existing native motion helpers, first inventory existing haptic paths to avoid duplicate cues. Record current-versus-proposed visual timing, threshold and interruption results.
- **Flag:** keep changes in existing opt-in Life preview until the owner expressly permits Classic or general adoption. Preserve current default selection.
- **Dependencies/privacy:** none proposed; no telemetry, no network requirement and no extra sensitive-data collection.
- **Do not touch:** cloud/sync/backup/schema/server paths and frozen tools/life-reference assets.

## 8. Risks, rabbit holes and open questions

| Item | Impact | Proposed default | Decision owner |
| --- | --- | --- | --- |
| Current Life focus hides sibling cards | Proposed visible peeks may contradict approved reference | Preserve current focus until a comparative prototype is approved | Product owner |
| Shorter springs versus current 420 ms curve | Can reduce clarity or feel twitchy | Measure and retain current behavior if candidate is not better | Product/design + QA |
| Swipe conflict in dense Week | Accidental navigation or destructive reveal | Distinct gesture zones with explicit tap alternatives | Native engineer + owner |
| Reorder persistence | May require unsupported schema action | Prototype only; separate data change if necessary | Planner engineer + owner |
| Duplicate haptic emitters | Annoying or deceptive feedback | Centralize cue policy and verify exact event counts | iOS engineer |
| Duo hardware unavailable | Cannot claim physical parity | Mark NO-GO, record missing evidence | Release owner |

## 9. Verification and prototype plan

### Acceptance criteria

The 12 executable Given/When/Then cases are in [verification](../tactile-precision/VERIFICATION.md#2-functional-acceptance-given--when--then). Include Wallet, details, interruption, sidebar, Crown, Hours acceptance/rejection, gesture precedence, task success, reordering and relaunch persistence.

### Checks

Run documented typecheck, lint, planner/script/native tests, build and docs:check in the future code PR. Validate 390/393, 820, 1024 and 1366 pt, light/dark and Reduce Motion. Physical device needed for drag timing, haptic character, thermal/long-frame behavior and accessibility. This documents proposed work; it does not mark those checks as passing.

### Prototype plan

- **Real:** finger tracking, threshold logic, animation interruption, semantic controls, and (in native prototype) actual haptics.
- **May be faked:** sample responsibility/task content and nonpersistent demo planning, explicitly labeled.
- **Where:** isolated prototype first; side-by-side with current frozen browser demo, then real iPhone with a disposable planner profile.
- **Questions:** Can you tell what will happen before you lift your finger? Can you stop or reverse an action immediately? Does any animation make planning slower?

## 10. Rollout, rollback and release

Documentation-only branch and review PR first. Later split implementation into shared motion; Wallet/details; Hours/Crown; Week/task gestures. Each requires code inspection, automated and device evidence, owner acceptance and a rollback path. Keep Classic unchanged and Life opt-in. Rollback by reverting the narrow PR or selecting Classic; do not migrate data for motion polish. No merge, deployment, Codemagic upload, TestFlight or App Store release is authorized here.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-06 | Document unified tactile feedback, fluid movement and predictable repeatability as a proposed design language; preserve all higher-authority approved baselines pending prototype review. | Owner request; specification | [Tactile Precision folder](../tactile-precision/README.md), [design decisions](../DECISIONS.md), [design map](../README.md) |
