# Spread Studio — four 25% implementation milestones

**Status:** proposed work. Milestones are cumulative slices of the agreed **Studio appearance-customization scope**, not equal time estimates or independent promises of a full calendar/task assistant. Review the real code before each PR. Every slice must leave a usable app, a clean rollback and no change to production without explicit authorization.

| Milestone | User-visible capability | Primary owner | Exit gate |
| --- | --- | --- | --- |
| **25% — Personal Foundation** | Wallpaper import, local palette matching, basic color and appearance, preview/apply/reset | React/UI + persistence engineer | Real user photo produces safe, persistent custom look without AI |
| **50% — Appearance Engine** | Glass/matte/metal treatments, opacity/depth, type, bounded control presentation, animations, per-profile saved looks | Design system + React engineer | Distinct user-created visual results with same working Spread UI |
| **75% — On-device AI** | Describe/refine appearance; Apple Foundation Models proposes controls; fallback manual | iOS/Swift + React integration | Supported device produces reviewable proposal offline, never silent write |
| **100% — Siri, OS fit and hardening** | Siri/App Intent entry to Studio, optional approved OS personalization integrations, cross-device-grade QA | iOS + QA/release engineer | Cold-start and supported-device flows pass; accessibility and recovery complete |

## Before Phase 1

- Pin commit, compare with latest main, inventory tests, existing appearance handling and storage paths.
- Record baseline snapshots, selected test fixtures and known test failures; do not falsely attribute existing problems to Studio.
- Propose explicit narrowly scoped changes to `AGENTS.project.md` / `SPREAD_DESIGN_SYSTEM.md` to permit Studio personalization *without erasing current Golden styling or its invariants*. Owner reviews the change before visual code merges.
- Work on feature branches from the accepted baseline, with GitHub issues/PRs, feature flags (off by default), screenshots, risk notes, acceptance tests and rollback instructions. `spread-studio` is the planning/reference branch, not permission to merge.
- Preserve original Spread appearance as default; no theme marketplace or premade branded/occupational themes.

## Part 1 — 25%: Manual foundation

**Build:** Customize entry + studio sheet, user-selected Photos/Files wallpaper import, safe crop/fit/position/dim, deterministic image palette sampler, adjustable accent/surface/text colors, light/dark independent choice, real Spread/Week live preview, Apply/Cancel/Reset. Persist image bytes separately from planner localStorage and ensure references survive relaunch.

**Acceptance:**
- Import a user-owned football-themed image, auto-suggest matching colors, manually adjust, then save and relaunch; no AI, account or network required.
- Empty/no-permission/invalid/huge/corrupt photo, insufficient storage and import cancellation fail gracefully, with no corrupt appearance or lost planning data.
- Preview never changes committed data; Reset restores original UI; light/dark works across wallpaper states.
- Tests for palette determinism, contrast, asset lifecycle, invalid inputs and save failure; screenshot comparisons on actual planner components.

**Rollback:** disable Studio flag and keep legacy theme/accent/profile settings intact. Avoid deleting user assets without explicit reset/delete.

## Part 2 — 50%: Visual freedom

**Build:** standardized material resolver (glass, matte, metallic-like, flat), blur/transparency/depth, text and numeric emphasis presets, bounded card/control treatments and density, ornamental effect intensity, animation limits, named **user-created** appearance saves; per-profile assignment and explicit replacement/reset.

**Acceptance:**
- Using only adjustable controls and personal images, recreate recognizably different industrial, vintage-computing and football-inspired appearances, not by choosing theme packs.
- The same hours/tasks remain byte/semantically unchanged when altering appearance; switching profiles has no cross-contamination.
- Every shared component is usable against each material: day cards, crown, hour banks, To place, task rows, sheets, completion and undo.
- Contrast, enlarged text, VoiceOver, 44pt-equivalent targets, Reduced Motion, Reduce Transparency and performance/resource caps pass.
- Unknown/corrupted appearance ID → safe original appearance. Profile serializer, backup/restore and optional iCloud compatibility tests explicitly pass.

**Rollback:** disable advanced treatments; keep basic saved wallpaper/palette from Part 1 readable and preserve data.

## Part 3 — 75%: Apple local intelligence

**Build:** native Swift Foundation Models bridge (no mandatory server), availability probe, typed request/response, bounded prompt, structured `DraftAppearance`, deterministic validator, live proposal preview, iterative text refinements, Apply/Cancel, clear unavailable/error handling.

**Acceptance:**
- A compatible physical device with downloaded, enabled model and airplane mode can interpret: 'Match this wallpaper with graphite surfaces, red accents, metal-like buttons and larger hour numerals' into supported settings; user can edit before applying.
- No on-device model → full manual controls; no cloud fallback, surprise download or broken studio.
- Unsafe/unsupported prompts cause clarification or safe partial suggestion, never new executable code, arbitrary file paths, model-written app CSS or silent write.
- Tests: fixed prompt suite, schema fuzzing, contrast, refusal, cancellation, timeout, long input, version/language differences and privacy/no-network validation.
- Siri AI itself is not the Foundation Models framework; do not market them interchangeably.

**Rollback:** toggle AI feature off without losing existing custom appearances.

## Part 4 — 100%: Siri, iOS integration, polish

**Build:** Swift App Intents/App Shortcuts to open Studio or hand off a supported customization request for review; test app cold start and foreground lifecycle. Evaluate optional user-selectable bundled icons and Focus-driven presentation/filtering as **separate approved tasks**; native read-only widgets only if scoped and justified. Do not bundle third-party sports/film branded icon assets. Do not make full background task CRUD a Studio acceptance criterion.

**Acceptance:**
- Invoked via Shortcuts/Siri on supported devices, customization opens the correct active profile, proposed changes appear, and user explicitly confirms save.
- Unsupported OS/new Siri AI beta conditions leave ordinary manual functionality intact. Siri responses accurately distinguish pending/previewed/applied.
- Switch profile, restore, reset, remove photo, app termination and low-storage lifecycle do not leak another profile's wallpaper or damage planner data.
- Verify icon APIs, Focus behavior, Siri/App Intent device/language/region support and App Store declarations against current Apple documentation at implementation time.
- Real-device matrix covers iPhone/iPad supported shapes, unsupported-model device, light/dark, high contrast, VoiceOver, large text, Reduce Motion/Transparency, airplane mode, and offline relaunch.
- Record performance (import decode, UI jank, memory, battery), privacy impact, App Review rights and accessibility results.

**Rollback:** turn off native entry points/AI/OS adapters independently; leave all committed manual customization and the original Spread available.

## Universal verification gate at every 25%

1. `npm run test:spread` (repository minimum assertions), `npm run typecheck`, `npm run lint`, relevant build/export/Capacitor sync, and targeted new tests; compare with baseline failures.
2. Visual screenshots from real Spread screens at phone/tablet widths, light/dark, image/no-image, text scaling and all supported materials.
3. No changed behaviors in Responsibilities → Hours → Week → Tasks, crown, hours bank, task placement, undo and backup/restore.
4. Data safety: storage failure surfaced, no silent overwrite, valid migration/restore, independent profiles, images correctly retained/cleared.
5. Security: local photos never uploaded automatically; no raw AI prompt/image telemetry, remote code, or unapproved third-party asset redistribution.
6. Feature flag off = golden behavior. Rollback instructions demonstrated, tests and PR evidence attached.
7. No merge, release, App Store submission or production deploy without explicit user authorization.

## Implementation ownership / traceability

For each phase, open a focused GitHub issue and PR with: pinned source commit, files to touch, proposed interface/schema, acceptance tests, QA recordings/screenshots, baseline comparison, threat/backup analysis, and a documented rollback procedure. Review gates: design owner for visuals, iOS owner for native integration, data reviewer for persistence, QA for device verification, product owner for merge/release.

The original Spread 1.0 and currently feature-flagged iCloud plans remain independent release streams. Studio is not an App Store launch blocker.
