# Classic → Life component handoff

> Part of the [Spread design brain](../README.md). Canonical correction to the first Life polish pass. Owner direction: November 6, 2026.

## Where we are

- Main baseline: `4f3505a9c2698d7ea1e85d6bd3ad6def9909509b` (PR #151). Owner reports that the native build now succeeds; candidate build/device identifiers are not recorded here.
- Life exists: Wallet areas, separate task details, Hours orbit, Week/month calendar, placement, priority, rich notes/attachments, undo/redo and local preferences.
- First polish pass transferred palette, card gradients, original artwork and Crown. It did **not** complete Classic's component language. A successful build does not establish parity.
- Branch `fix/life-classic-component-parity` contains a source correction prepared for review. Nothing from this branch is merged. Native rendering and interaction acceptance remain open.

## Target

One app, one component language, two arrangements. Classic supplies materials, iconography, typography, depth, spacing, cues and motion. Life keeps its Wallet → separate details, Hours orbit and Week/month arrangement.

Authority: [Classic recording spec](2026-11-06-classic-video-spec.md), [Life recording spec](2026-11-06-life-video-spec.md), [native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), and actual Classic source. Recordings use different plans; do not present them as matched before/after evidence.

## Component map

“Prepared” means changed in this branch's source, **not** verified on iPhone.

| Component | Gap in shipped Life | Take from Classic → apply to Life | Branch status |
| --- | --- | --- | --- |
| Weekly summary | Flat value hierarchy; missing calendar tile | Calendar tile, bold hour value, quiet count, role segments, strong disclosure cue; keep Life capacity semantics and Hours destination | Prepared |
| Wallet identity | Smaller badge; weaker hours/chevron; truncated names | 42pt category tile, semibold name, bold hours and rotating chevron; allow two-line names | Prepared |
| Card depth | Normal-state outer shadow missing | Existing role gradient/edge plus closed/active shadow; keep face width stable | Prepared |
| Stack geometry | 52pt pitch cannot clear larger identity row | Increase pitch and both face heights together; prevent title/artwork overlap | Prepared; native calibration owed |
| Placement cues | Scheduled-day marks absent from details | Reuse actual `DayMarks`, including underline and spoken scheduled days | Prepared |
| Task field | Rows and entry blend into outer surface | Recessed 18pt field inside elevated details card; retain Life estimates, notes and attachments | Prepared |
| Add area | Plain text action | Original `icon-new-life`, title/subtitle and raised full-width row in empty/populated states | Prepared |
| Calendar | Separate black selected-date language | Shared blue selection/onAccent; Today outline and selected accessibility trait | Prepared |
| Hours/Week grouping | Uniform plain panels | Shared gradient, hairline, shadow and semantic grouping; keep orbit/calendar mechanics | Prepared |
| Life sheets | Separate default navigation/form materials | Reuse `SpreadSheetStack`, canvas, accent and list surfaces for manage/place/priority/add/help | Prepared |
| Action hierarchy | Bare placement/priority controls | Shared primary/secondary chips and press response; retain existing intents | Prepared |
| Header/navigation | First pass is not a complete Classic shell audit | Compare actual brand mark, date/readout, icon family, compactness and selection cues; preserve Life destinations and outer-edge tray geometry | Audit/finish owed |
| Focus/edit/completion | No matched proof of full interaction consistency | Same rigid card settling, press response, edit/reveal cues and acknowledged completion feedback; retain separate task details | Source partly reused; finish/verify owed |
| Accessibility/appearance | Source aliases exist; rendered parity unknown | Same light/dark hierarchy, large-text reflow, contrast, Reduce Motion/Transparency and focus behavior | Device verification owed |

Card reference: 24pt continuous corners; role overlay 0.48 → 0.16 → clear; edge 0.48 closed / 0.85 active; shadow alpha 0.09 / 0.18, radius 8 / 16, y 4. Use existing shared motion tokens; do not create another timing system.

## Implementation order

1. Inspect current main, this branch, Classic source and the component map. Preserve other in-flight work.
2. Finish all missing components, existing-feature access, fixes and additions above. Reuse actual shared components where possible; keep SwiftUI builders small and explicitly resolve dynamic accessibility strings.
3. Audit every Life destination and sheet as one system. Resolve remaining header/navigation and focus/edit/completion gaps. Do not stop after repainting the home screen.
4. Run targeted compile checks during implementation. After the complete source pass, perform the full validation/simulator/test pass; fix discrepancies and repeat affected checks.
5. Record exact source/build/OS/device and evidence; prepare a reviewable PR and the documented Codemagic candidate. Stop at release authorization.

## Verification and release gates

- Matched Classic/Life fixtures: same profile/week/data, light/dark, 375/390/430pt phone widths, iPad and accessibility text.
- Capture summary, closed/focused/editing Wallet, two-line names, day marks, tasks/entry, calendar selection/Today, Hours and every Life sheet.
- Exercise both Crown sides, opener/Close alignment, interruption/reversal, vertical/horizontal gesture arbitration, haptics, VoiceOver, reduced motion/transparency and persistence across relaunch.
- Build against the Apple SDK; run relevant native journeys and planner regressions. Record physical iPhone evidence separately from simulator results.
- Current correction: 50 portable Swift tests passed; final active-iOS syntax parse, whitespace and design-doc checks passed. These checks do not prove SwiftUI SDK compilation or visual parity.
- Missing credentials/hardware/evidence are explicit blockers. No full-parity claim until evidence supports it. No merge, upload or release-control bypass without authorization.

## Boundaries and rollback

Preserve Classic and More/Settings exactly. Existing planner remains the sole writer. No schema, backup format, persistence semantics, reference-demo or release-control changes. This is component completion, not a new product design or an unrelated feature backlog. Revert the focused PR to roll back presentation changes.

## Handoff prompt

Continue `fix/life-classic-component-parity` in `WGLewis0721/spread-app`; read this spec, both recording specs and the native brand board, then inspect current main and the actual Classic/Life source. Complete every missing component, existing-feature access gap, fix and addition in the component map across Life, Hours, Week and their sheets before beginning the full validation/simulator/testing pass. Reuse Classic's real components and tokens while retaining Life's arrangement; preserve Classic, More/Settings, planner authority, persistence and the reference demo. Keep SwiftUI builders small, compile incrementally, and then verify matched fixtures, gestures, accessibility, haptics and relaunch persistence, correcting every discrepancy found. Record exact source/build/device evidence, distinguish simulator results from physical iPhone results, and state unavailable credentials or hardware plainly. Finish with a reviewable PR and the documented Codemagic candidate; do not merge, distribute, bypass release controls or claim full parity without authorization and supporting evidence.
