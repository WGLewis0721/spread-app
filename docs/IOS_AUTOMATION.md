# Spread — iOS automation (no local Mac required)

**Codemagic is the single native iOS validation/build path.** GitHub Actions runs fast, automated Ubuntu/Linux source checks only. No native Codemagic workflow runs per commit.

| Purpose | Tool | Trigger and controls |
| --- | --- | --- |
| TypeScript/planner, web bridge, portable Swift, security preflight | GitHub Actions | Automatic PR/main checks; no automatic macOS jobs |
| Compile real iOS app, SwiftUI contracts and installed Life/Classic tests on iPhone, iPad and Duo | Codemagic `spread-ios-verify` | **Manual** on reviewed branch HEAD; unsigned, no Apple integration or publishing |
| Sign one final IPA and upload to App Store Connect | Codemagic `spread-ios-upload` | **Manual**, current `main` only; `SPREAD_APPROVED_UPLOAD_SHA` must equal the reviewed 40-character SHA |
| Inspect App Store Connect build versions (read only) | Codemagic `spread-store-status` | Manual, no writes |

## Run draft PR #160 verification

1. In [Codemagic](https://codemagic.io/apps), select Spread → **Start new build**, branch `feat/life-week-61-parity-20261107` → **Spread - unsigned native verification (manual)**.
2. Codemagic confirms the checked-out SHA matches that branch's remote tip, bundles the local-first app, runs native SwiftUI contracts and focused real-app XCTest journeys on iPhone, iPad and Duo.
3. Inspect `artifacts/native-verify/source-sha.txt`, `.xcresult` bundles and exported simulator screenshots. Any failure is a blocker; don't treat a passing GitHub source check as native acceptance.
4. Fix failures on the same branch and rerun the exact current SHA. Physical haptics still require TestFlight on an actual iPhone.

## Release authorization

Run the **same unsigned verifier on the final reviewed `main` SHA**, then separately authorize `spread-ios-upload` by entering the required **approved_sha** build input (automatically passed to the `SPREAD_APPROVED_UPLOAD_SHA` guard). Only that upload workflow uses Apple signing credentials; it verifies source SHA and the latest remote `main` before signing/uploading. No workflow automatically submits to App Review or publishes a store release.

The verifier never signs, uploads, changes planner state or enables iCloud. The two cloud flags stay off. The approved upload builds the IPA **once**, avoiding the previous duplicate signed release-candidate build. App Store submission, TestFlight tester assignment and production remain separately controlled.

## Fallback and rollback

`.github/workflows/ios.yml` remains **manual-only legacy diagnostics**, retaining its installed-app storage-loss and mirror-writer negative controls until proven under Codemagic. Older native GitHub visual workflows remain manual diagnostics, not routine acceptance gates. Do not start duplicate GitHub macOS matrices for each PR.

Rollback by reverting the pipeline commit/PR, leaving `main` and production untouched. Check GitHub branch rules for required retired check names before merging. Consult [iOS release history](IOS_RELEASE.md) and [App Store release plan](../APP_STORE_RELEASE_PLAN.md).
