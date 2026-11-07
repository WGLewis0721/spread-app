# Spread — iOS automation (no Mac required)

**Native verification and release authority: Codemagic.** Keep GitHub Actions on fast Linux/Ubuntu source checks. All native Codemagic workflows are manual; none runs on each commit. `main` stays untouched until the owner approves a merge.

| Job | Tool | Trigger / permissions |
| --- | --- | --- |
| Planner, browser bridge, TypeScript, portable Swift tests, source preflight | GitHub Actions | PR and `main` push; Ubuntu/Linux, no routine macOS |
| iOS SwiftUI contracts, Life + Classic installed-app tests and screenshots | `spread-ios-verify` in `codemagic.yaml` | Manual on any reviewed branch; unsigned, no Apple integration or publishing |
| Full signed iPhone/iPad/Duo release candidate | `spread-release-candidate` | Manual on `main` only; no publishing |
| App Store Connect upload | `spread-ios-upload` | Manual on `main` only; requires `SPREAD_APPROVED_UPLOAD_SHA` equal to the full approved commit SHA |
| Read-only store version/build check | `spread-store-status` | Manual |

## Verify draft PR #160

In [Codemagic](https://codemagic.io/apps), select the Spread app → **Start new build** → branch `feat/life-week-61-parity-20261107` → **Spread - unsigned native verification (manual)**.

The workflow checks the checked-out SHA against the current branch tip, with both cloud flags off. It compiles/runs the native SwiftUI contracts and a focused installed-app Life/Classic suite on an iPhone simulator. Inspect `artifacts/native-verify/source-sha.txt`, the two `.xcresult` files and exported screenshots. A GitHub green check does **not** prove native acceptance. A cancelled or queued native job is **not** a pass.

A broader candidate run on `main` uses the existing Duo suite plus an iPad Life/Classic smoke. Before any store upload, explicitly set `SPREAD_APPROVED_UPLOAD_SHA` to the exact reviewed `main` SHA in the Codemagic manual build variables. Uploading to App Store Connect is **not** authorization to submit to App Review or publish a store release.

**Physical device:** TestFlight on an actual iPhone is still needed for Taptic feedback and real-world gesture perception. Use a Mac only if remote debugging cannot reproduce a hardware-only issue.

## Preserved regression controls

`.github/workflows/ios.yml` is **manual-only legacy diagnostics** while its installed-app storage-loss and mirror-writer negative controls are migrated. Other older GitHub-native visual workflows remain manual diagnostics, not a second routine CI/release authority. Avoid running duplicate macOS matrices for each PR.

No new user accounts, schema changes, cloud flags, merging, TestFlight distribution, App Review submission or production deployment are part of this pipeline change.

**Rollback:** Revert the PR/commit, restoring the prior `codemagic.yaml` and GitHub workflows; separately fix any GitHub required-check settings that still reference retired native job names. See [iOS release record](IOS_RELEASE.md) and [App Store release plan](../APP_STORE_RELEASE_PLAN.md).
