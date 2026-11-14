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

## 8. Owner decisions (2026-11-14)

The owner delegated these decisions to Claude Code on 2026-11-14 ("you are the owner; make decisions that advance continuity, consistency, thorough design choices and familiar functionality, consistent with the repo design docs"). Each decision cites the document it follows. The [wave 1 after-action report](https://claude.ai/artifact/XMhfBTZMDtNgNz967SZzMr) has the findings behind them.

| # | Decision | Follows | Applied by |
| --- | --- | --- | --- |
| OD1 | High priority: the flag is the control that turns priority on and off. On task rows, one marker everywhere: the red **!** (`TaskPriorityMark`) with its spoken label, in Life as well as Week. The mark moves to `Theme/SpreadPriorityMark.swift` so every surface shares one component. | Rules card (red ! plus spoken label); icon handoff (flag is the task control) | C moves it; B adopts it in wave 2 |
| OD2 | Completion haptic: only completing a task fires it. Hours, rename, colour, category and move commands pass `completionHaptic: false`. Keep the current light impact. Resolves the open "completion haptic" decision. | Rules card; planner pack ("one light tap on completing a task") | C (Spread, Week), B (Life) |
| OD3 | Text on Life art: the zero-hour day well becomes 0.6 black (5.7:1 for white labels over bright art). | Apple-native pack (dim bright art behind text); WCAG 1.4.3 | B |
| OD4 | `Spread.success` keeps its value (`#17743A` light, `#30D158` dark). The UI kit already names success as a semantic colour. | `ui-kit/UI_KIT.md` | A (no change) |
| OD5 | Token names: Spread's names (`ink`, `accent`, `danger`, `caution`, `line`, `inset`, `secondary`) are the only names in code. Remove the Gray Matter aliases from `SpreadTheme.swift`; the UI kit keeps a one-line mapping to Gray Matter's role names. | Gray Matter adoption note (link, don't build a parallel token store) | A |
| OD6 | Sheet dismissal, everywhere: Done is trailing (`.confirmationAction`); Cancel is leading only where it discards a draft. This includes Life sheets and, as a toolbar-placement-only exception, `BackupRestoreSheet.swift` (no other line in that file changes). | Foundational UX (Jakob's law); Apple sheet convention | D (Sheets, Backup placement), B (Life) |
| OD7 | Words for a role: Life uses "Life area"; Classic uses "responsibility". The word "spread" never names a role, because Spread is the app's name. | Rules card ("Classic retains its own rules"); brand board | A (Shell confirm dialog), C, D |
| OD8 | The focused card's Details button opens a sheet titled "Details"; the two UI tests that assert "Manage Life area" change with it. | Rules card ("A focused card offers Details") | B |
| OD9 | Widgets keep the system background (the existing test contract and Apple widget convention). Continuity comes from Spread's type, accent and glyphs, not a painted canvas. | Today widget spec; Apple widget convention | D (no change) |
| OD10 | Focus transport buttons grow with Dynamic Type: the test changes to `minWidth/minHeight: 44` and the fixed frames go. Resolves the open "Dynamic Type" decision: native honours the system text size. | Rules card (44 pt); UI kit | D |
| OD11 | Icons follow `ICON_HANDOFF.md`: Lucide for custom controls; SF Symbols for alerts, specialised controls and tiny calendar markers. Revert the overdue ineligible marker to `exclamationmark.circle` and the calendar-strip day check to SF `checkmark`. Add Lucide `plus`, `coffee`, `eye`, `copy`, `arrow-left-right`, `rotate-ccw`, `rotate-cw` and `circle-help` in wave 2. | `brand/ICON_HANDOFF.md` section on native Lucide adoption | C now; wave 2 for assets |
| OD12 | Overbooked warning copy: "These hours don't fit in your week. Remove some or raise your weekly hours." | Gray Matter UX copy rules; plain language | C |
| OD13 | Empty week: when the "Nothing planned this week" card shows, the day cards don't repeat "Nothing planned". | Hick's law; one message per state | C |
| OD14 | Delete the dormant five-mode layouts in `Layouts/SpreadLayouts.swift` (superseded 2026-11-04). | `DECISIONS.md` 2026-11-04 | A |
| OD15 | `chalkInk` uses `secondary` in light mode so it keeps the Increase Contrast variant. | Apple-native pack (Increase Contrast) | A |
| OD16 | The Week sidebar scrim stays at its current strength for now; wave 2 names it as a token instead of changing it. | Polish, not redesign | Wave 2 |
| OD17 | Disabled controls dim through one token, `Spread.disabledOpacity` (0.4), added in wave 2. | Gray Matter design system (every state is a token) | Wave 2 |
| OD18 | Life is the default root for new installs. The flag `native.weekMonth.previewEnabled` keeps its key, so a stored choice survives, but defaults to on. Classic stays one tap away in More and loses its "(current)" label. Spread is unreleased, so only TestFlight installs that never chose see the switch. | Rules card ("Native has ONE Wallet-style Life Stack"); brand board 11 Nov | A |
| OD19 | Delete the unreachable Week Focus code: `WeekFocusSurface`, `WeekFocusComponents`, the `weekFocusEnabled` branches inside Classic's `content()`, and anything only they use. That code is reachable only inside Classic when the Life flag is on, which never happens. Wave 2 does this in one session, after a reference check, so the Shell and Week deletions land together. | Gray Matter README (one source of truth) | Wave 2 |
| OD20 | Spread 1.0 is iPhone only. This supersedes the 8 October "universal" line in `APP_STORE_RELEASE_PLAN.md`. Store copy and the landing page claim iPhone only. | Rules card ("iPhone only") | Owner docs (this PR); E |
| OD21 | Health's colour is teal `#30B0C7` everywhere: category, the default Health role, landing sample, icon set and film. This also ends School and Health sharing `#007AFF`. Existing saved roles keep their colour (role colours are data; no migration). Resolves the open Health colour decision. | Rules card (role colours are data); icon handoff (teal proposed) | E (landing now); wave 2 (`model.ts` default) |
| OD22 | Creation and copy voice: Life's creation action is "Add Life" (brand board); Classic's is "Add responsibility" (replacing "New Spread" and "Create responsibility"). Always "To place". Empty states are a short heading, one plain sentence, then the action. | Brand board 11 Nov; planner pack | A (Shell empty plan), C (Spread, sidebar) |
| OD23 | `Spread.accentGradient` stays for the one lit primary action on a surface (Done, Add, the selected segment). Content surfaces stay solid. No change. | Brand board (solid content; one lit control in the dock) | None |
| OD24 | Removing a role: Life keeps Details delete with Undo (owner decision, 11 Nov). Classic keeps its confirmation. No change. | Rules card ("Classic retains its own rules") | None |
| OD25 | No App Store link until the listing exists. The landing page keeps the TestFlight invitation and claims only what has passed QA. | `APP_STORE_RELEASE_PLAN.md` release sequence | E (no change) |
| OD26 | OD19, refined: delete only the dead composition (`WeekFocusSurface`, `WeekFocusComponents`, `ResponsibilitySidebar`, and the two dead branches in Classic's `content()`). `OverdueSelectionTray` (bulk overdue reschedule) and `MonthQuickAddSheet` (month quick add) are reachable only through that dead code. Delete each one only if Life already offers the same capability; otherwise keep it and record a parity gap for wave 3, so a feature people expect is never silently lost. | Foundational UX (familiar functionality); Gray Matter contract (no silent removal) | W2-1 |
| OD27 | The heavy-week line, shown when the week exceeds 45 hours but is not over budget, reads: "That's a full week. Check that the hours still fit." | Plain, true copy | Done in #212 |
| OD28 | X1: 1.0 ships iPhone only (OD20). Every target's `TARGETED_DEVICE_FAMILY` becomes `1`, and `docs/APP_STORE_REVIEW_CHECKLIST.md` and the preflight script drop the iPad requirements in the same change. The preflight tests must stay green; if one pins iPad, it changes with the build setting. | Rules card ("iPhone only"); OD20 | Wave 3 |
| OD29 | X2: Life keeps its single context-appropriate Undo/Redo row (brand board, 11 Nov). Classic's "Undo last change" notice is only shown in Classic's own body, so Life should never show two rows. If the device script finds two in any Life state, wave 3 removes the duplicate. Redo stays. | Brand board 11 Nov correction | Device script C4, then wave 3 if needed |
| OD30 | X3: one verb for one act. Classic says "Remove responsibility" everywhere (`SpreadSurface` "Delete responsibility" changes); Life says "Remove Life area" (#218). The unreachable `RoleDeleteConfirm` and Life's unused `onDeleteRole` are deleted. | OD7; OD24 | Wave 3 |
| OD31 | X4: haptic policy. The only success haptic is the light impact on completing a task (OD2). The brand board's Wallet feedback stays: discrete detent ticks on steppers and week steps, entering and leaving Edit, and snapping to the Manage/Delete reveal. One rate-limited warning stays at a boundary or before a destructive confirm. Drop the success impact after removing a responsibility, because the visible change and Undo already confirm it. All haptics are iPhone only and skipped when the system turns haptics off. | Rules card; brand board "Feedback"; Gray Matter tactile table | Wave 3 |
| OD32 | X5: the state is "over budget" in both roots. Weekly Time is Life's owner-chosen budget metaphor (11 Nov), and Life is the default root. Classic's "overbooked" changes to "over budget". The OD12 sentence explains the state in both roots. | One copy voice; brand board Weekly Time | Wave 3 |
| OD33 | X6 to X12: accepted as proposed in `finalize/CROSS_SURFACE_REVIEW.md`. Lucide `panel-left` for the rail toggle; `rotate-ccw` for the Undo notice; delete the dead Crown files and unused Crown tokens; "Cancel" on the Open tasks sheet; "Cancel session" on the timer widget; one sentence added to the title-only empty lists; widget colours read shared tokens. The unused `sidebarScrim` token from #220 is removed now that its only consumer is gone. | ICON_HANDOFF; OD6; OD22; rules card (tokens) | Wave 3 |

## 9. Wave 2 (started 2026-11-14)

Wave 1 merged as #209, #211, #212, #213, #214 and #215; CI on `main` is green. Wave 2 runs five Haiku sessions at xhigh effort, each owning separate files.

| Lane | Owns | Closes |
| --- | --- | --- |
| W2-1 Dead code | `Week/`, `Spread/ResponsibilitySidebar.swift`, the dead branches of `content()`, `PlannerUITests.swift` | OD19/OD26; the stale calendar-design UI test |
| W2-2 Icons | New Lucide imagesets, `ICON_HANDOFF.md`, `icon-system.test.mjs`, Life Plan Ahead, Hours, recurring form, and the Life rest icon line | OD11 |
| W2-3 Tokens and Life | `SpreadTheme.swift`, the UI kit tokens section, `TOKEN_AUDIT.md`, the other Life files | OD1 in Life, OD16, OD17, art tokens, exact token adoption |
| W2-4 Health and copy | `model.ts` defaults, `Sheets/`, string-pinning UI tests (not `PlannerUITests`) | OD21 default, OD22 create-sheet title, "To place" |
| W2-5 Review and device script | `finalize/` docs only | Cross-surface review, iPhone device test script, release checklist |
