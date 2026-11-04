# Claude handoff — restore Spread's identity in native SwiftUI

**Repository:** `WGLewis0721/spread-app`  
**Work branch:** `claude/spread-swiftui-parity-87llx2`  
**Existing draft implementation PR:** [#119](https://github.com/WGLewis0721/spread-app/pull/119), based on PR #118's docs branch.  
**Owner decision (2026-11-03):** PR #119 TestFlight's generic dark “Responsibilities” interface is **rejected**. Owner approved a new, premium dark/native visual direction. This is a visual course correction and functional completion of existing work, **not a new planner design or new information architecture**.

## Pasteable directive

> Continue **PR #119**, not a new implementation or a new PR. Read `docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md` and its `SPREAD_NATIVE_VISUAL_SPECIMEN.svg`, then review the owner's November 3 desired-state images, actual prior app screenshots and existing design docs. Restore Spread's identity with a deep-navy, luminous but restrained SwiftUI visual system, the metallic Crown, original iconography and all 11 Chalkboard illustrations; preserve the working Dial and five distinct modes. Fix the current generic title/letter-badge cards, spacing, collisions, shallow task access and inconsistent Week/Month/More sheets, while preserving every task, hours, placement, export and recovery capability. Implement and verify real screens, gestures, accessibility and screenshots instead of writing another plan or recreating the app. Commit to PR #119, record before/after evidence and actual test results, and **do not merge or deploy** without further authorization.

## What to read in order

1. **[Owner native brand board](docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md)** and [visual specimen](docs/design/planner/SPREAD_NATIVE_VISUAL_SPECIMEN.svg) (visual authority for SwiftUI only).
2. `docs/design/README.md`, `docs/design/RULES_CARD.md`, `docs/design/planner/SPREAD_DESIGN_SYSTEM.md`, `docs/design/platforms/APPLE_DESIGN_PRINCIPLES.md`, `docs/design/FOUNDATIONAL_UX_PRINCIPLES.md`, `docs/design/brand/ICON_HANDOFF.md` and applicable iPhone/iPad guides.
3. `SWIFTUI_PARTIAL_TASKS.md`, `docs/evidence/swiftui-parity/implementation-ledger.md`, `SPREAD_SWIFTUI_PARITY_SPEC.md`, `SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md`, `CLAUDE_SWIFTUI_HANDOFF.md`.
4. Actual current SwiftUI files, React single-writer planner store/dispatcher and test harness.
5. Owner-supplied actual previous build screenshots and the aspirational dark premium visual references in the **November 3 chat**. The source binaries are not presently checked into git. If you cannot see those images, report that limitation, work from this documented direction, and mark pixel/visual reference parity unverified. Do not fake screenshots.

### Resolve prior conflicting instructions explicitly

- The **owner's later visual direction** supersedes the old “quiet palette only / no decorative colors” rule **only for native SwiftUI paint**. That is documented in the new brand board, planner system and decision log. React, the marketing site and Studio remain governed by their existing rules.
- The earlier `SWIFTUI_HANDOFF_PROMPT.md` described a **code-only, no-QA** session. That instruction is superseded for the current owner-authorized UI audit: run actual verification; do not claim code completion equals native UI acceptance.
- The earlier instruction “no new design language” is superseded only as to native visual paint. It **still prohibits** new feature architecture, navigation rewrites and lost functionality.
- Preserve the existing PR #119 branch and commits; do not rewrite the data engine or restart from a template. Do not use mockup-only buttons, generated screenshots passed off as real, or added network/cloud dependencies.

## Implement in this order

**Pass A — Baseline and blocking defects.** Capture PR #119 screen geometry and reproducible fixtures, and fix current build/CI failures before visual refactoring. Inspect physical TestFlight observations against actual source. Record the source SHA.

**Pass B — Global shell and design tokens.** Centralize native palette, SF type scale, spacing, corner radii, bounded glow materials and selected states. Align app icon/Spread mark, metal Crown, week/month selection, safe areas, compact action rail and dock. No oversized header or overlapping date arrows; no generically renamed planner.

**Pass C — Primary planner.** Replace initials with original category glyph tiles; preserve full Chalkboard illustrations. Rework Spread/Stack/Fan/Tabs/Day to the measured native card system, while retaining Dial. Give role hours, task counts, quick +/- and inline entry clear hierarchy. Preserve the 15h/3-spread style summary as actual computed data, not hardcoded copy.

**Pass D — Functional screens.** Apply the same visual system to Hours, Week, Month, To place tray, Free time suggestions, Task detail (Notes/Outline/Table/Photo), Move to, New Spread, More/Settings/Profiles. Keep existing navigation and eligibility/Undo rules. Do not invent Home, Activity or Insights tabs merely because design exploration depicts them.

**Pass E — Motion.** Stack compresses/expands, Fan focuses physically, Dial remains stable. Remove first-touch readiness gating, double commits, jumpy reversing gestures, unintentional 4–5 pt header shifts and decorative animation that steals scroll.

**Pass F — Real verification.** Complete all independently actionable P1–P13 gaps (updating the ledger, not a parallel backlog). Run TS checks/actual iOS compilation/native UI journeys/gesture regression and persistence checks. Capture real before/after screenshots at 390/820/1024 pt in light/dark and key accessibility states. Test against the original actual app for function and the new concept art for aesthetic direction. Explicitly distinguish verified, blocked and owner-decision tasks. Fix issues revealed by screenshots and rerun checks.

## Acceptance criteria

- User sees **Spread**, not a generic app: original folded-card icon, role glyphs and all 11 Chalkboard assets, a real metal Crown, blue functional accent, dark navy and restrained category edge glow.
- The same underlying tasks, hours, roles, profiles, Week/Month operations, rich task content, exports and recovery remain usable. No data loss, silent task relocation or new second store.
- Five modes are recognizably different; Stack/Fan respond to first valid swipe and interruptions; working Dial survives.
- All important controls are tappable (>=44 pt), readable, nonoverlapping and available through gesture plus accessible alternative.
- Actual native screenshots and test links prove the candidate state; visually changed shared components are checked across every affected screen.
- PR #119 stays **draft**. **No main merge, production deploy, Codemagic/TestFlight upload or App Store submission** under this instruction.

## Report format

Provide one concise report with: base/head SHA, files and screens changed, P1–P13 status, before/after screenshot artifacts, actual automated/UI/accessibility results, preserved functions, remaining blockers, user-visible decisions and rollback path.

End with:

`IMPLEMENTATION: COMPLETE/INCOMPLETE | VISUAL AUDIT: PASS/PARTIAL/FAIL | TESTS: PASS/BLOCKED/UNVERIFIED | RELEASE: NO-GO PENDING OWNER APPROVAL`

**Directive:** Finish Spread, don't redesign its information architecture. Better cards and real interactions, not a prettier shell hiding fewer features.
