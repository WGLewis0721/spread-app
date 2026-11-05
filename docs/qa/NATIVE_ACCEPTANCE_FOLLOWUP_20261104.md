# Native acceptance follow-up after PR #137

## Baseline
PR #137 was explicitly authorized to merge at `ac3c1b592afaa2410620b3322c2a88f62c7dc7f2`. Its iOS simulator compilation, Swift package checks, unsigned Release archive, and binary safety checks passed. Native UI acceptance was not green, and a signed Codemagic IPA has **not** been verified.

This document records unresolved failures; it does not claim they have been fixed.

## Required fixes and verification
1. **More tray tap targets:** An action measured 18 pt against the 44 pt minimum. Identify the actual hit-test frame, make the full row tappable at least 44×44 pt, and test every More action on a standard iPhone and compact Duo scene.
2. **Rollover action:** Existing UI test cannot find Rollover. Determine whether the compact weekly summary disclosure must open first; preserve Rollover functionality and verify the test matches the intended user flow.
3. **Wallet card geometry:** Compare current card frames with intentional layout across standard iPhone, iPad and Duo. Fix genuine overlaps/clipping; update obsolete pixel expectations only with visual evidence and review.
4. **Onboarding labels:** Resolve accessibility identifier/label mismatch without removing accessibility semantics; verify first-run and returning-user paths.
5. **Duo Week days:** The seven-day test found zero matching day elements. Verify navigation into Week and the accessibility hierarchy, then restore seven accessible day targets and vertical/horizontal gesture behavior.
6. **Hinge and rotation:** Simulator runner twice timed out looking for `native-spread`. Separate runner boot/launch failures from app bugs; validate fold/unfold and rotation with repeatable device tests.
7. **Screenshots and stability:** Investigate simulator screenshot timeouts and ensure visual tour reliably captures expected scenes.

## Acceptance gates
- Reproduce and fix each defect on this branch, with targeted automated regression coverage.
- Run native iOS simulator build, Swift tests, unsigned Release archive, iPhone and Duo UI journeys, hinge/rotation, light/dark, accessibility and App Store preflight.
- No feature removal, no weakened checks, no planner data changes without justification.
- Signed IPA and TestFlight/App Store publication remain separate, unverified release steps.
- Do not merge or deploy this follow-up PR until verified and explicitly approved.

## Rollback
Revert individual focused commits or the follow-up PR if any layout, gesture, or planner regression is detected.

## 2026-11-05 focused repair — rollover confirmation
- Commit `3943563d6d88327ea39efa0bad396400225e5715` on this draft branch fixes a control-flow defect in `MoreSheet.rollover()`: it previously required `send()` to report a successful mutation **and** `rolloverOutcome == "confirm"`. A conflict that requests confirmation is non-mutating, so the extra success requirement could suppress the confirmation dialog. The native shell's separate rollover path already checks the outcome without that requirement.
- **Verification:** source-level comparison only. Native simulator UI test for More → Rollover with next-week data, Cancel preserves both weeks, Replace updates only the intended week, and empty-next-week path is still required. No simulator PASS is claimed.
- **Rollback:** revert commit `3943563d6d88327ea39efa0bad396400225e5715` if the confirmation state regresses. No planner schema, storage, cloud, or privacy changes.
- Unified release gate: #143. All other outstanding items above remain open.
