# Spread GitHub Actions execution policy

**Effective only after this change is approved and merged.** This policy reduces continuous CI churn without dropping release acceptance.

## Automatic, on every relevant PR

- `CI`: TypeScript lint, typecheck, planner/scripts tests, bridge simulators and Swift/CloudKit contracts (maintains existing tests).
- `App Store preflight`: source-level release safety scanner.
- `iOS shell`: existing actual-app compile and planning journey for code paths in its `paths` filter (remains an expensive but important integration gate).
- `Spread 2.0 SwiftUI slice verification`: focused Swift package/unit and simulator compile on native-package paths.
- Production `main` push: existing CI, App Store preflight, iOS shell and Pages behavior unchanged.

## Manual, for reviewed candidate SHAs

Only manually dispatch the five full native simulator suites below from the selected **exact candidate commit/ref** after normal PR checks succeed:

| Workflow | Why it remains necessary |
| --- | --- |
| Native layout acceptance | 390/820/1024 layout, accessibility, iPad orientations |
| Native visual tour | Matched light/dark screenshots, 390/820/1024 and flows |
| Native acceptance journeys | Full tactile, persistence, gestures, 100-drag Crown and Week/Month regressions |
| iPhone Duo native acceptance | Real Duo simulator behavior and gestures |
| Duo hinge and rotation acceptance | Pose, rotation, hinge and native appearance evidence |

These suites do **not** execute automatically on every PR update. Run them from GitHub Actions > selected workflow > Run workflow; select the candidate source ref. Capture the run links, job results, screenshot artifacts and tested SHA in the release PR. If any required test fails or did not run, the candidate is **NO-GO**. Code merge, signed build, TestFlight and production require their separate approvals.

## Why

On November 7, a sample of 300 very recent workflow runs showed repeated native PR triggers, often cancellation or failure. One PR update started nine named workflows, and several native UI matrices created multiple macOS jobs. A canceled attempt still consumes runner resources before cancellation. None of the audited YAML files invokes Copilot, but a separate Copilot cloud-agent task or automation may consume GitHub AI Credits and Actions minutes.

## Important checks before adoption

- Repository branch-protection required checks were inaccessible to the connected GitHub integration (403). **Review required status contexts before merging**. A mandatory matrix check must not silently become an impossible-to-satisfy PR requirement.
- This change does not cancel running jobs or mute email notifications. On GitHub use Settings > Notifications > System > Actions to select Don't notify or Only notify for failed workflows.
- The source-level iOS shell currently performs a costly simulator journey on PRs; retain it until a smaller equivalent smoke test is proven. Optimize that separately.
- No security, App Store, signing, deployment or Codemagic workflow is altered here. No scheduled background automation is introduced.
