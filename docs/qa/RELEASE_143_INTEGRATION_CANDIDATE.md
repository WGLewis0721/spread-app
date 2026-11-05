# Release gate #143 — validation-only integration candidate

No merge to main, no production deployment, and no release claim is authorized by this branch.

## Source SHAs
- PR #134: `79ddbb194371cecaba44e3cac9b249c9c07a55d0` — Classic Week arbitration, Duo pose harness, title and rich-content dismissal persistence.
- PR #141: `6bde10c3ecc31d3c683d619f9f691ba9183c1e22` — Week/Month verification, seven-day accessibility, measured shortage and Adjust hours.
- PR #142: `a79aab755651611783c898f457f4a92f6f87476d` — More and Rollover actions, Wallet geometry, onboarding labels, keyboard dismissal.

Starting tree: PR #134; applied PR #141's distinct files and test hunks; applied PR #142's More/Wallet/TaskSheet patches and visible-header swipe test helper. Repeated accessibility containment and the already-correct selected-role label were included only once. Original PR branches are unchanged.

## Release gate
This branch exists to trigger all native workflows against **one combined code tree**. Any failure belongs to its source PR; fix there and rebuild the candidate. A queued/skipped/cancelled/blocked check is not PASS. Native screen comparisons, system VoiceOver, fold/rotation and two-device iCloud tests are still unverified unless actual artifacts establish them.

Do not merge or deploy this validation-only candidate.
