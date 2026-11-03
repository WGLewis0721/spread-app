# Spread — SwiftUI UI/UX Audit and Completion Assignment

**Status:** Owner-directed implementation assignment for PR #118; not a redesign or release approval.  
**Repository:** `WGLewis0721/spread-app`  
**Reference PR:** https://github.com/WGLewis0721/spread-app/pull/118  
**Product loop:** Responsibilities → Hours → Week → Tasks.

## 1. Mission and success standard

Take engineering and UI/UX ownership of the existing native SwiftUI work. **Audit, correct, and complete Spread; do not reinvent it.** The application must remain recognizably Spread: its horizontal metallic Week Crown, original floating dock, weekly planner structure, recognizable colors, illustrations, physical motion, five approved presentation modes, and local-first behavior.

Deliver a clean, streamlined, consistent, deeply functional product, not another plan, demo, generic iOS dashboard, or feature-reduced simplification. The owner should recognize the application immediately, encounter fewer distracting controls, see the actual planning information clearly, and complete common tasks quickly. Follow Apple's Human Interface Guidelines while respecting Spread's own identity.

**Simplify the interface, never its valid behaviors or stored data.**

## 2. Source of truth and required reading

Inspect the current PR and branch head before editing. Read, in this order:

1. `SWIFTUI_PARTIAL_TASKS.md` (P1–P13) and `SWIFTUI_HANDOFF_PROMPT.md`, **if found**. These two filenames were not present at the root of PR #118 when this assignment was authored. Search relevant implementation branches, PRs and evidence. Do not invent them or their completion statuses; note any missing artifact.
2. `CLAUDE_SWIFTUI_HANDOFF.md`, `SPREAD_SWIFTUI_PARITY_SPEC.md`, `SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md`, `docs/SPREAD_2_NATIVE_CONTINUATION_PROMPT.md`, and the related native acceptance/evidence docs.
3. `AGENTS.project.md`, `docs/design/README.md`, `docs/design/RULES_CARD.md`, `docs/design/FOUNDATIONAL_UX_PRINCIPLES.md`, `docs/design/planner/SPREAD_DESIGN_SYSTEM.md`, `docs/design/packs/planner-change.md`, `docs/design/packs/apple-native-feel.md`, `docs/design/platforms/APPLE_DESIGN_PRINCIPLES.md`, `docs/design/platforms/SPREAD_IPHONE_BUILD_GUIDE.md`, `docs/design/DECISIONS.md`, and `docs/design/tokens.json`.
4. Apple HIG: https://developer.apple.com/design/human-interface-guidelines/ ; consult its current layout, navigation, materials, motion, accessibility, and interaction guidance.
5. Existing native and authoritative planner code, historical golden sources, source artwork, current TestFlight/native screenshots, and the owner's reference screenshots attached in the originating chat.

**Reference hierarchy:** (1) owner-approved previously working *installed* app and observed interactions, once exact build/binary is identified; (2) matched source SHA; (3) immutable pre-migration golden sources (including `35b66522f30836d1eb74ca9758c6d3f24c0de2e3`); (4) separately approved Chalkboard assets and five Studio layout references; (5) governing design docs and Apple HIG; (6) current SwiftUI code as an implementation candidate, not a design authority.

Do not conflate the pre-migration installed app with the separate `spread-studio` branch. If the installed reference binary cannot be accessed, use source evidence to complete independent tasks but mark visual parity unverified. Preserve all original evidence and golden branches.

### What the owner-supplied screenshots teach

- Current illustrated Spread: preserve its personal visual identity, colorful responsibilities, hand-drawn artwork, hour summaries, and floating controls.
- Earlier dark Spread: learn from its quiet task-entry affordance, concise hierarchy, useful density, and reduced visual competition.
- External card-stack/calendar/habit references: study layered depth, rhythm, legible labels, selection physics, and direct manipulation; **do not copy their visual language, palette, navigation, or information architecture**.

Audit the visible regressions first: oversized date heading obscured by week arrows; artwork and hour counts colliding; crowded card rows competing with the summary; excessive blank space; inconsistent dark/light component geometry; overlapping floating controls; reduced task visibility. These are screenshot observations, **not claims that the current branch still renders each defect**—inspect the candidate to confirm.

## 3. Audit, triage, and task ledger

Inventory the actual user-visible app: onboarding; Spread/Week/Month; Crown; all five modes (Stack/Fan/Dial/Tabs/Day); role creation/editing; role-hour allocation; day/task management; task rich editor; placement/Undo/rollover; dock/More/Settings; profiles; export/backup/restore; offline, save failure and recovery; light/dark; Dynamic Type and VoiceOver alternatives.

For every issue record:

`screen/state | observed problem | installed/source reference | severity | target correction | source files | affected flows | acceptance test | before/after evidence | status`

- **P0:** data risk, broken/inert action, clipping of critical information, failed interaction, inaccessible primary control.
- **P1:** inconsistent hierarchy, obscured affordance, confusing navigation, overlapping elements, notable visual regressions.
- **P2:** subtle alignment, density, shadows, spring tuning, micro-interaction, cosmetic polish.

Reconcile each verified P1–P13 partial task with the existing A01–F11 checklist. Keep statuses truthful: `TODO`, `CODED (UNVERIFIED)`, `VERIFIED`, `BLOCKED` (with exact external dependency), or `OWNER DECISION`. Update one existing ledger if possible; no competing specification systems.

Do not turn an audit into a new research-only or design-plan phase. Implement small, complete fixes in priority order and verify their neighboring surfaces.

## 4. UI/UX correction requirements

### Header, Crown, navigation
- Fix oversized/truncated dates, overlapping prev/next controls, unstable safe-area offsets and shifting headers.
- Preserve the actual horizontal ridged Crown, continuous finger tracking, week detents, accessible end controls, and return-to-current-week behavior.
- Keep Spread ↔ Week primary switching; Month stays inside Week, not an unrelated tab. Preserve last-view/profile context.
- Preserve the floating dock, understandable edit/new/More controls and consistent action positioning; no extra permanent navigation layer.

### Responsibility cards and summary
- Preserve all **11 original Chalkboard illustrations** with recognizable linework/crop and the 5 approved layout modes; no generic emoji or letters replacing artwork.
- Correct artwork/title/hour/chevron collision; make hierarchy and hit areas obvious. Stop cards consuming screen space purely for decoration.
- Card overlap is acceptable only when selected/focused state, task access, scrolling, and VoiceOver remain clear. Share role identity and selection across modes without planner writes.
- Summary: total allocated hours, selectable responsibility-hour segments, quiet Rollover/Review actions; don't add a second competing control row.

### Week, Month, tasks
- Preserve solid day cards, distinct dashed To place tray grouped by responsibility, and tinted Free time suggestion chips. They represent different concepts and must look different.
- Preserve original role-specific placement restrictions, accurate hour banks, task fold thresholds, responsive day contents, Month current-week marking and week-to-month relationship.
- Keep task entry, completion, notes, Outline, Table and Photo easy to access; do not flatten rich content or hide frequent actions deep in menus.
- Keep tap and keyboard/VoiceOver alternatives for every drag; refuse invalid drops with a reason, not silent failure; preserve six-second Undo behavior where documented.

### Typography, light/dark, material
- Use existing semantic color and typography tokens. Responsibility colors are data, not arbitrary UI decoration. No new themes, display fonts, wallpaper engine, or new palette.
- Establish one coherent scale for page headers, role names, hours, task labels and secondary information across all screens.
- Align baselines, margins, card heights, padding, corner radii, shadows and dividers using shared primitives. Use tonal grouping, quiet separation and suitable content density, not heavy outlines.
- The light and dark interfaces are the **same product**, not separate styles. Dynamic Type, contrast, safe areas and keyboard must not break the geometry.
- Apple glass/material is restrained and belongs primarily to functional chrome, not every content card. Decorative effects must not obscure tasks.

### Lessons learned from Arooma
- A swipe responds on **first valid touch**; no image/shadow readiness dependency.
- One authoritative gesture state controls selected card and translation; rapid swipes, reversal, cancel, scroll competition and interrupted transitions cannot double-commit or jump.
- Headers/icons/nav never shift between destinations without intentional transition.
- Springs, depth, haptics and selection feedback should communicate action; no perpetual performance-heavy decoration or animation blocking hit testing.
- No duplicated prominent buttons for the same command; contextual actions remain discoverable and frequent journeys should generally need **three taps or fewer** without losing safety confirmation.
- When editing a reused component, inspect **every screen using it**. No isolated cosmetic fix that breaks siblings.
- Reduce Motion, Reduce Transparency and Increase Contrast must remain functional.

## 5. Finish actual native behavior

Follow the task ledger and A01–F11 requirements, implementing all independently actionable gaps rather than creating placeholders.

Keep `src/lib/spread/store.ts`/the existing TypeScript planner as the **single writable source of truth**. Keep the guarded bridge headless while SwiftUI owns all user-visible surfaces. SwiftUI waits for authoritative persistence acknowledgment before declaring success; native snapshots are render-only. Preserve old planner, recovery and golden sources intact.

Must preserve and make operational: create/edit/delete roles; category/color/hour allocation; half-hour and over-cap rules; week/day selection; task create/edit/move/complete/Undo; correct role/day eligibility; rollover/history/review; five layouts; rich editor blocks and IDs; ten-profile isolation; existing export, printable/PDF, Word and `.spread` backup/restore user flows; offline/relaunch/save failure feedback and existing optional feature flags.

No destructive schema change, cloud/sync alteration, new database, arbitrary refactor, visible WebView shortcut for unfinished main UI, or silent feature removal. Protected cloud/backup/schema/server files remain out of scope. If a feature cannot be finished within the existing boundaries, identify the exact blocker and keep the existing safe behavior.

## 6. Implementation sequence

1. **Protect baseline and confirm evidence:** current heads, working code, screenshot/reference provenance, data and rollback path; record unknowns.
2. **P0 functional/layout defects:** clipped text, blocked control, competing gesture, missing operation and unsafe state handling.
3. **P1 shared consistency:** header/Crown/dock, information hierarchy, cards, typography, spacing, role illustrations, light/dark, all destinations.
4. **P2 motion refinement:** Stack/Fan physics, interrupted gestures, Crown feel, month morph, purposeful haptics, low-power and Reduce Motion support.
5. **Finish all P1–P13/A01–F11 implementable work:** no task left as a generic TODO when the required source and tools are available.
6. **Evidence, regression QA and handoff:** revise governing docs/ledger without duplicating rules, include actual comparisons and failures.

Preserve the current PR #118 as the document/scope authority. Because it is currently documentation-only, create one linked **implementation branch and draft PR** targeting #118's branch while it remains open. If branch/PR state changed, verify current refs and choose the least disruptive non-production PR path. Do not merge or deploy.

## 7. Verification and acceptance

This assignment **supersedes the prior code-only instruction to skip tests**: this is an audit and completion pass and therefore must include applicable verification, but no release is authorized.

Run on the candidate SHA: npm typecheck, lint, planner and script tests, build; Swift package tests; actual macOS Xcode compilation; native journey F1–F10/F11, layout/accessibility and persistence checks on available runners. Never suppress tests, lower assertions or claim a test passed unless it ran.

Capture actual *installed native UI* before/after screenshots for every substantively edited screen: 390/820/1024pt widths, iPhone/iPad where applicable, light/dark, empty/dense, large text, Reduce Motion, contrasting states and affected sheets. Record source SHA, fixture and device dimensions. Compare matched viewports and interactions to approved reference; unavailable reference must be marked `UNVERIFIED`, not PASS.

Specific gates:
- No clipped or overlapped primary content, unresponsive buttons, unsafe visual jumps, broken navigation or inaccessible primary actions.
- Touch targets ≥44pt; readable body text and non-color-only state; no broken VoiceOver alternative.
- Zero incorrect data writes, duplicates, wrong role/profile/week placement, or lost rich content.
- Repeat the repo's existing 100 Crown actions/30 reversals, 100 Stack and 100 Fan gesture checks when available; inspect result artifacts.
- No first-swipe readiness glitch, scroll hijacking or double action on reversal.
- Two clean fresh-install/relaunch/persistence cycles using the real harness.
- Hardware FPS/touch latency, true VoiceOver, device-only restore/offline paths and usability studies require *actual* device/participant evidence. Report these as blocked/unverified if unavailable; CI is not a substitute.

A native screenshot, passed lint, and working browser preview are **not interchangeable evidence**. Record real run and artifact links. If any applicable check fails, diagnose and correct when possible; do not hide it.

## 8. Scope boundaries and owner approval

Not authorized: generic Apple re-theme, feature removal, new navigation, arbitrary palettes or fonts, Studio personalization, deleting source artwork, replacing Crown with arrows alone, rewriting the data model, editing production settings, automatic merge, Vercel deployment, Codemagic/TestFlight upload, or App Store submission.

Any material deviation from the approved visible interface, unavailable reference conflict, or protected-system change requires a listed **owner decision**, not a hidden workaround. Keep the stable product and data as rollback. No new permissions/account requirement.

## 9. Deliverables and completion contract

One linked implementation PR containing:
- Current base/head SHAs and focused commits
- P1–P13 and A01–F11 task status with changed-file evidence
- Complete issue register with severity and fixes
- Side-by-side real before/after native screenshots for material changes; motion clips where relevant
- Verified flow and automated check results with run/artifact links; clear unverified blockers
- Regression/data/accessibility/security findings and safe rollback plan
- Updated *existing* design/task documentation without duplicate or contradictory specs
- Factual implementation/audit/release verdict

Complete only when every independently actionable task has implementation and verification evidence, or a precise blocker; the original planner operations still work; the UI has no severe hierarchy, clipping, overlap or responsiveness regression; and release remains protected.

Finish the final report with this exact status format:

`IMPLEMENTATION: COMPLETE/INCOMPLETE | UI/UX AUDIT: PASS/FAIL/PARTIAL | VERIFICATION: PASS/BLOCKED/UNVERIFIED | RELEASE: NO-GO PENDING OWNER APPROVAL`

**Final directive: Do not reinvent Spread. Finish Spread. Less interface noise; more useful functionality; no lost features; no fake polish.**
