# Spread | Upgrade Audit (publish finalize)

> Part of the Spread design brain. Start at [../README.md](../README.md). Folder index: [README.md](README.md).

> Summary: a design diagnosis of every Spread surface before the publish polish. The biggest continuity problems are not visual. They are which Life/Classic root ships by default, one action with three names, and one role color with three values. The landing page has a few measurable issues that this pass fixes. Native findings come from source and the brand board, not from a device, so every native change still needs device evidence.

**Mode:** upgrade (existing product, not a new build) | **Status:** diagnosis complete; landing fixes applied in this pass; native changes owned by lanes A to D and blocked on owner decisions | **Baseline:** `main` at 9248935 (the commit this branch was cut from)

## Screenshot baseline

- **Native.** No native screenshot is in the repo that this lane could read. `docs/evidence/` was not accessible in this session. Native baselines therefore do not exist here, and native "before" evidence must come from the candidate's device run.
- **Landing.** `evidence/landing/before/`: viewport captures at four section stops (hero, how it works, story, start) for 390×844, 820×1180, 1024×1366 and 1440×900, in light and dark, at device scale 2, saved as WebP. `report-before.json` records overflow, page height, theme and console errors. Captured 2026-11-14 with the preinstalled Chromium through Playwright, against the dev server on this branch's base.
- **What the baseline cannot show.** The landing's motion (orbit, view-timeline reveals, scroll-read steps) is captured only at the stops. Reduced-motion runs record overflow and errors, not frames. No touch behavior was tested on a phone.

## Existing functionality to preserve

- **Native (from `screens.json`, 48 entries).** Classic Spread, Week and Month; Life root with Wallet Stack, Hours, Week, Plan Ahead, recurring form, Focus; shared sheets for tasks, responsibilities, More, profiles, backup, Recently Deleted, What's New, reminders, export; three widgets and a Focus Live Activity. Nothing in this audit removes a screen.
- **Data and rules.** All task and hour changes go through planner intents (`LivePlanner`). Undo is offered for drags and destructive changes. Rollover never runs automatically. Priority is a flag, not a scheduling change.
- **Landing.** Nav section links and theme switch, the How it works step buttons, the week preview selection shared with the hours tile, the story disclosure, the TestFlight invitation, and the privacy policy link.
- **Out of scope.** Backup and restore, cloud flags, sync, server, `golden/*` branches, planner storage and schema.

## Design diagnosis per surface

| Surface | Diagnosis | Severity | Evidence |
| --- | --- | --- | --- |
| Shell and root choice | Life is opt-in and its flag reads as a preview. Classic is the default, although the board names Life as the single direction. The rail, header and recovery states are shared and consistent. | High | `SpreadLiveRoot.swift:15,66-83`; [corrections/life-routing.md](corrections/life-routing.md) |
| Classic Spread, Week, Month | Consistent Classic anatomy (day cards, To place tray, Month plane). One dead Week focus branch sits beside it, and the empty-state CTA uses a gradient fill while the board describes solid surfaces. | Medium | `SpreadLiveRoot.swift:332-348,468`; [corrections/life-routing.md](corrections/life-routing.md), [corrections/color-drift.md](corrections/color-drift.md) |
| Life Wallet Stack and cards | Editorial art and native type sit over text-free artwork, as the rules require. Empty copy ("Nothing to do here yet.") differs from Classic's voice. Undoable delete replaces confirmation, which is a different behavior from Classic. | Medium | `Life/LifeWalletStack.swift:294`; [corrections/copy-voice.md](corrections/copy-voice.md) |
| Life Hours, Weekly Time, Plan Ahead | Previews and confirms before moving hours, which matches the rule. Color comes from role data. Sizes are partly hardcoded (7 `.system(size:)` calls in `Life/`). | Medium | `Life/LifeHoursView.swift`, `LifeWeeklyTimeBudget.swift`, `LifePlanAheadSheet.swift` |
| Sheets (tasks, responsibilities, More, profiles, Recently Deleted, What's New) | One sheet anatomy in practice. Two different names for creating a responsibility ("Add Life" in the sheet title, "New Spread" at the entry, "Create responsibility" in the empty state). Two capitalizations of "To place". | Medium | `Sheets/ManageSheets.swift:58`, `Spread/SpreadSurface.swift:303`; [corrections/copy-voice.md](corrections/copy-voice.md) |
| Focus timer and Live Activity | Timer sheet has clear states (idle, running, done for today) and optional notifications copy. Not device-verified. | Low | `Focus/SpreadFocusTimerSheet.swift` |
| Widgets | Three families, sized in PR #206. Editorial copies are byte-identical today, but the copy step is a sync risk. | Low | `ios/App/SpreadWidget/` |
| Native tokens | 57 `Color(` calls outside `Theme/`, of which 55 are `Color(hex:)` or `Color(red:)`. Some read role data, so not all are violations. 12 `.system(size:)` calls outside `Theme/`. Per-line detail belongs to `TOKEN_AUDIT.md` (lane A). | Medium | counts from this pass; [corrections/color-drift.md](corrections/color-drift.md) |
| Landing: type floor | Two selectors set text to 10px on phones, below the page's own 11px floor: the How it works day labels and the hero caption. | Medium | `src/styles.css` landing block |
| Landing: sticky sections | The How it works object and steps depend on scroll position. Full-page stitching repeats them, so the evidence uses viewport stops. Not a page defect; a capture-method note. | Note | `evidence/landing/before/` |
| Landing: copy and CTA | "Private beta on TestFlight" and the TestFlight button are accurate. There is no App Store link, which is correct until the listing exists. The nav CTA "Join the beta" points to the same invitation. | Note (store step) | [corrections/release-scope.md](corrections/release-scope.md) |
| Landing: colors | Sample Health role is `#0a84ff`; the planner's default Health role is `#007AFF` and its category is `#30B0C7`. A few off-board neutral tints remain in the landing block. | Medium | [corrections/color-drift.md](corrections/color-drift.md) |

## Ranked improvements and definition of done

1. **Life root default and the dead Week path.** Owner decides the default. *Done when:* one default is set and the flag name says what it does; existing installs keep their choice; `WeekFocusSurface` and `WeekFocusComponents` are either removed after a usage check or kept with a reason; widget deep links still open the Life root. (Lanes A and C, owner decision.)
2. **One name for each action and one noun.** *Done when:* a grep finds one title for creating a responsibility, one noun across Life, Classic and Focus, and one "To place" casing; VoiceOver labels match visible text. (Lanes B, C, D; landing copy in lane E.)
3. **Role color identity.** Owner picks the canonical Health blue. *Done when:* each role color is one value across Week, Life, the widgets and the landing sample; no two roles share a blue; role text and dots pass contrast in both modes. (Owner decision, then lanes.)
4. **Native tokens.** Lane A moves hardcoded values to `SpreadTheme` tokens. *Done when:* `Color(hex:)` outside `Theme/` is limited to role data, and each remaining `.system(size:)` is a token. (Lane A, with `TOKEN_AUDIT.md`.)
5. **Gradient fill.** Owner decides whether primary button fills are solid. *Done when:* the decision is recorded in the brand board and the affected capsules match it. A visible change, so it needs device evidence.
6. **Landing type floor.** *Done when:* no landing text is under 11px at any width. **Applied in this pass** (two selectors raised to 11px).
7. **Landing motion and reduced motion.** *Done when:* reduced-motion captures show finished states and no orbit (partly verified: the stack checks the preference in JavaScript; CSS reduced-motion blocks exist). Frames for the story and the week preview under reduced motion are still owed.
8. **Accessibility.** *Done when:* VoiceOver order, Dynamic Type at accessibility sizes, 44-point targets and contrast are checked on device and in the browser. Not done in this pass: there is no native device, and no contrast tool was added (no new dependencies).
9. **Store and device scope.** *Done when:* the owner resolves iPhone-only against universal, and the landing copy names only what passed QA. (Owner decision.)
10. **Empty and error states.** *Done when:* every surface in `screens.json` shows its designed empty and error state on device. Currently reviewed in source only.

## Upgrade approach

- **Files expected to change.** Landing (lane E): `src/styles.css` landing block, `src/spread/components/landing-sections.tsx`, `src/spread/components/landing-preview.tsx`, the landing UnlockScreen parts of `src/spread/screens/spread-app.tsx`. Native: lanes A to D, one PR each, each under about 400 changed lines.
- **Wireframes and mockups.** Not produced. The landing has real evidence; native uses the existing brand board and iOS audit. No new visual mockups were made in this pass.
- **Branch, tests and rollback.** Each change is a separate commit so it can be reverted alone. Web checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run docs:check`. Native checks run only on GitHub (`native-typecheck`); no Swift toolchain runs here.
- **After screenshots.** Captured after the landing change with the same script and sizes, into `evidence/landing/after/`.
- **Approval to begin native work.** Pending the owner's answers to corrections 1, 2, 3 and 5 and 9 (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)).
