# Spread remaining repairs

Release gate: [#143](https://github.com/WGLewis0721/spread-app/issues/143).
Baseline: main `b074b881ff6b1134d745ce1697f841069d92cf4b`.
Preserve PR #144 and earlier repair branch history. Do not merge or deploy this branch.

- [ ] Reconcile PR #144's remaining Week/Month changes with current main without losing merged repairs.
- [ ] Run Duo UI acceptance on this branch; verify seven accessible days, Week scrolling/swiping, Wallet and Crown.
- [ ] Pass all nine supported Duo hinge/orientation configurations, including draft and Month continuity.
- [ ] Verify task editing, rich content, drafts, scheduling and ordering across navigation, backgrounding and relaunch.
- [ ] Fix remaining layout, touch target, Dynamic Type, VoiceOver, contrast and Reduce Motion failures; verify supported narrow widths.
- [ ] Pass the complete native suite and standard iPhone/iPad regressions on one final SHA; inspect screenshots and artifacts.
- [ ] Record exact-SHA results in #143. Keep failures, skips, cancellations and blocked runs distinct from passes.

## Current findings
PR #144 head `1cc7b3ad4c529f4816cc6508020d791fd2b3913c`:
- [Duo UI run 42049546756](https://github.com/WGLewis0721/spread-app/actions/runs/42049546756): two focused-Week tests found zero of seven day controls; four other Duo/gesture tests passed. Main already contains accessibility containment repairs. Fresh results are required.
- [Pose run 42049546700](https://github.com/WGLewis0721/spread-app/actions/runs/42049546700): startup/readiness timed out and fallback screenshot could not choose between two displays. Main already contains the newer unscoped nine-state harness and explicit display diagnostics.
- General CI passed on that old head; this is not final native acceptance.

## Work started here
- Make changes to the Duo pose harness and its tests trigger both Duo native workflows. Previously the path filters could silently omit native retesting for a harness-only PR.
- Extend the existing harness workflow contract test to check both triggers.
- Disable automatic Vercel deployment for this new repair branch before creating it.
- Local execution is unavailable in this session. New workflow results are pending; no new test pass is claimed.
