# Release gate #143 — validation-only integration candidate

No merge to main, no production deployment, and no release claim is authorized by this branch.

## Source SHAs
- PR #134: `8f3d7f57077a04442aa8cd8b70b799a625046e45` — Classic Week arbitration, Duo pose harness, title and rich-content dismissal persistence.
- PR #141: `6bde10c3ecc31d3c683d619f9f691ba9183c1e22` — Week/Month verification, seven-day accessibility, measured shortage and Adjust hours.
- PR #142: `dfb7a68f1590680fe872322a6c81f50d8ba328a7` — More and Rollover actions, Wallet geometry, onboarding labels, keyboard dismissal.

Starting tree: PR #134; applied PR #141's distinct files and test hunks; applied PR #142's More/Wallet/TaskSheet patches and visible-header swipe test helper. Repeated accessibility containment and the already-correct selected-role label were included only once. Original PR branches are unchanged.

## Release gate
This branch exists to trigger all native workflows against **one combined code tree**. Any failure belongs to its source PR; fix there and rebuild the candidate. A queued/skipped/cancelled/blocked check is not PASS. Native screen comparisons, system VoiceOver, fold/rotation and two-device iCloud tests are still unverified unless actual artifacts establish them.

Do not merge or deploy this validation-only candidate.

## Validation status (2026-11-05)
- Combined candidate was assembled by reconciling code on existing PR branches. The source SHA labels above identify the latest owning commits incorporated; the tree includes earlier base commits with subsequent targeted patches.
- No native workflow has executed on this QA-only branch. An integration SHA must not inherit PASS from a source PR. The full release gates remain open.
- Current PR #134 uses the supported `agent-device screenshot --scale 1` option and includes a unit assertion guarding against `--pixel-density`; copied to the integration branch.
- PR #142 clears stale rollover outcomes before checking the current store acknowledgement. Copied to the integration branch.
- Week directional day animation and visual comparison against approved shots remain outstanding. Dark Wallet tertiary text contrast needs native validation; a palette change is not present here.
- Native CI cannot be triggered for this branch through existing PR-only workflows without opening a PR or granting a workflow dispatch path; no release action was taken.

## Regression addition
- PR #141 `627ca39a6443739cc2217ceff43253dbad001ae8` adds `WeekMonthUITests.testInsufficientHoursOffersMeasuredAdjustment` to the required Week/Month iPhone and iPad journeys. It checks half-hour budget preservation and the measured Adjust hours route. This code-level addition is unverified until the native workflows pass on the integrated SHA.
