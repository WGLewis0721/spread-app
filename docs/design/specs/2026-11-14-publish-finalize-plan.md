# Spec: Finalize Spread for publish (design consistency and polish)

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).

| | |
| --- | --- |
| Request | "The app still has some work before it's truly ready for publish… it's still lacking consistent design thought and polish. Plan how to finalize the app, then start sessions (Haiku only, medium to extra effort) using the Gray Matter app-design library as the source of truth." |
| Restated | Bring the native iPhone app and the marketing site to one coherent, evidenced, release-ready design, using Gray Matter's Design-to-Build Contract and corrective workflow as the process. |
| Surface | Native SwiftUI (iPhone) and the marketing site |
| Size | L (cross-surface polish program; each lane below is S or M) |
| Author | Claude Code, 2026-11-14 |
| Status | In review; lanes started as separate sessions |
| Governing docs read | Gray Matter `app-design/` (README, UPGRADE_AND_CORRECTIVE_WORKFLOW, DESIGN_TO_BUILD_CONTRACT, DESIGN_SYSTEM, IOS_PLAYBOOK, UX_REVIEW_AND_SPEC_PROTOCOL, TACTILE_MOTION_AND_DEVICE_QA, AI_WORKFLOW, templates/RELEASE_CHECKLIST, UPGRADE_AUDIT, CORRECTIVE_ACTION); Spread `CLAUDE.md`, design router, `APP_STORE_RELEASE_PLAN.md`, `.github/workflows/native-typecheck.yml` |

## 1. Problem

Spread's features are largely built, but surfaces were shipped one spec at a time (Life, Week/Month, Plan Ahead, Focus, widgets). Each looks right in isolation; together they disagree on type sizes, spacing, hardcoded colors, empty/error states, icon weight and copy voice. A reviewer moving Life → Week → a sheet → a widget feels several apps.

## 2. Evidence

- [Repo] 17.5k lines of native Swift across Life, Week, Spread, Sheets, Focus, Widget, Shell, Theme. Hardcoded values exist outside `Theme/SpreadTheme.swift` (e.g. `Color(hex6: 0x8190AC)`, `Color(red: 22/255…)`, `.font(.system(size: 10))` in `LifeEditorialCard.swift`, `WeekFocusSurface.swift`, `SpreadFocusTimerSheet.swift`).
- [Repo] Gray Matter's library was itself adapted from Spread; Spread's own rules win where they are more specific (`UX_REVIEW_AND_SPEC_PROTOCOL.md` "Documentation authority"; `DESIGN_TO_BUILD_CONTRACT.md` "Authority").
- [Repo] No Swift toolchain in cloud sessions. PRs touching Swift run `native-typecheck` on GitHub macOS; Codemagic builds `main` to TestFlight on demand. Device checks remain owed.

## 3. Goals, non-goals and budget

- **Goals:** one native token set used everywhere; every screen has designed default/empty/error/Undo states; consistent copy voice; every named screen in the inventory has a spec and evidence status; a release checklist with an honest GO/NO-GO list.
- **Non-goals:** new features, data migrations, store changes, cloud/sync/backup/restore, iCloud claims, Liquid Glass, doodles, Crown, new dependencies.
- **Appetite:** small, reviewable PRs per lane; each lane under roughly 400 changed lines of Swift.

## 4. Rules and exceptions

All `CLAUDE.md` rules apply unchanged. Gray Matter gates are mapped onto existing Spread documents instead of creating a parallel `design/` folder (one home per fact):

| Gray Matter gate | Spread home |
| --- | --- |
| Brief and screen inventory | `docs/design/finalize/SCREEN_MAP.md` + `screens.json` (new) |
| Brand board | `planner/SPREAD_NATIVE_BRAND_BOARD.md` (existing) |
| UI kit | `ui-kit/UI_KIT.md` native section + `Theme/SpreadTheme.swift` |
| Upgrade audit / references | `docs/design/finalize/UPGRADE_AUDIT.md`, `REFERENCES.md` (new) |
| Corrections register | `docs/design/finalize/corrections.json` + `corrections/<id>.md` (new) |
| Release checklist | `docs/design/finalize/RELEASE_CHECKLIST.md` (new), linking `docs/APP_STORE_REVIEW_CHECKLIST.md` |

**Exceptions needed:** None planned. Any lane that thinks it needs one stops and lists it in its PR for the owner.

### Owner goals (every lane is judged on these)

| Goal | What it means in review |
| --- | --- |
| Continuity | The same element (card, row, sheet header, toast, empty state, arrow control) looks and behaves the same on every surface and in widgets |
| Consistency | Values come from `SpreadTheme` tokens; one copy voice; one icon set (Lucide via `SpreadIcons`) |
| Thorough design choices | Every change names its reason: a Gray Matter fundamental or UX law, a brand-board rule, or an accessibility need |
| Familiar functionality | Apple-standard patterns first (Jakob's law): sheets with detents, swipe-back, context menus, standard Undo, system Dynamic Type and VoiceOver. Spread invents a control only when the native board already defines it |

### Skills and MCPs each lane uses

| Tool | Use |
| --- | --- |
| `design:design-critique` skill | Structured critique of the lane's surfaces before editing (hierarchy, consistency, usability) |
| `design:design-system` skill | Audit token naming and hardcoded values; document component variants and states |
| `design:accessibility-review` skill | WCAG 2.2 / HIG pass: contrast, 44 pt targets, VoiceOver order, Dynamic Type, reduced motion |
| `design:ux-copy` skill | Every label, empty state, error, confirmation and Undo message in one voice |
| 21st.dev MCP (`get_inspiration`, `search`) | Pattern reference only. React code is never ported into SwiftUI |
| Playwright MCP | Landing screenshots at 390/820/1024/1440, light and dark (lane G) and evidence (lane F) |
| GitHub MCP | Draft PRs, `native-typecheck` results, PR subscriptions |

Each PR body lists which skills and MCPs were used and what changed because of them.

## 5. Lanes (one Haiku session each, disjoint file ownership)

| Lane | Owns (only these paths) | Effort | Deliverable |
| --- | --- | --- | --- |
| A. Design system foundation | `Theme/`, `Shell/`, `Layouts/`, `Chalk/`, `docs/design/ui-kit/UI_KIT.md`, `docs/design/finalize/TOKEN_AUDIT.md` | xhigh | Complete semantic tokens in `SpreadTheme.swift`; Shell/Layout/Chalk use only tokens; native UI-kit section; `TOKEN_AUDIT.md` listing every remaining hardcoded value for wave 2 |
| B. Life surface | `Life/` (all files) | xhigh | Wallet Stack, card Details/Tasks, notes, Hours, Weekly Time, Plan Ahead, recurring form, management sheets: states, type, targets, VoiceOver, copy |
| C. Planner surfaces | `Week/`, `Spread/`, `HourStrip.swift`, `WeekSwipeRules.swift`, `LifeCalendarRules.swift`, `PlannerDates.swift`, `TactilePrecisionMath.swift` | xhigh | Week, Month, Spread, trays, Focus-in-Week; status never color alone; tap path and Undo for every drag |
| D. Sheets, Focus, widgets | `Sheets/` except `BackupRestoreSheet.swift`, `Focus/`, `Widget/`, `ios/App/SpreadWidget/`, `ReleaseNotes.swift` | xhigh | One sheet anatomy, empty/error states, timer polish, consistent widget families and Live Activity |
| E. Evidence and landing | `docs/design/finalize/` (except `TOKEN_AUDIT.md`), landing components | xhigh | Screen map + `screens.json`, upgrade audit, references, corrections register, release checklist; landing polish with real Playwright screenshots at 390/820/1024/1440 |

Five Haiku sessions run in parallel (owner cap: five).

**Wave 2 (after A merges):** a token-adoption sweep per lane using `TOKEN_AUDIT.md`, then a cross-surface consistency review against the release checklist. Lanes B to D use existing tokens now and record any missing token in their PR instead of adding one.

## 6. Acceptance

- Each Swift PR passes `native-typecheck`; web PRs pass `npm run typecheck`, `lint`, `test`, `build`, `docs:check`.
- Each PR body states Verified / Not run / Blocked / Assumed (Gray Matter AI_WORKFLOW operating rules).
- No screen is removed from the inventory without owner approval.
- Release verdict is GO only after a Codemagic TestFlight build and recorded physical-device checks; this plan cannot certify that.

## 7. Risks

- Haiku edits to Swift cannot be compiled locally; rely on `native-typecheck` and keep diffs small.
- Parallel lanes could collide; file ownership above is strict.
- Polish can drift into redesign; lanes polish within the native brand board, never replace it.
