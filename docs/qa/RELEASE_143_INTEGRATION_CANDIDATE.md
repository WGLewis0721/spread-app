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

## Nine-cell Duo matrix and final source updates
- PR #134 `5d78d0547d61d0b9899bd28c192c43f14821339d`: 3 confirmed hinge preset poses × 3 CLI-supported orientations. No foldable upside-down orientation. `landscape-right` is now an explicit acceptance requirement, not untested.
- PR #141 `4f2c95cb6c2f9ebb39be384c3a8b8145d4573d4a`: implemented day direction, Reduce Motion fallback, exact allocation shortages, and Adjust hours; the three former partial decisions remain subject to native verification.
- Source test suites cover Week gestures, rich-content dismiss persistence, precise scheduling failure, 100 Crown gestures/reversals, Wallet, screen sizes, light/dark and dynamic type.
- Device Hub tent/laptop arrangements, Split View, true hinge obstruction geometry and physical-device tests are **not** demonstrated by `agent-device`'s three preset poses. These need separate actual-device evidence. Do not equate nine CLI states with every physical arrangement.
- QA-only push trigger includes the iOS shell workflow when its own workflow definition changes. No packaging or deployment action was added.
- This is a validation-only branch; its final SHA must independently pass every release gate.
