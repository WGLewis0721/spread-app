# Spread — GitHub Actions + Fastlane internal TestFlight

**Status: prepared, not signed or uploaded.** Apple credentials, private signing storage, and an App Store Connect app record must be configured by the account owner. Only a verified run and real-device TestFlight install establish success.

**Scope:** Existing React/Capacitor target, bundle ID **com.graymatter.spread**, an approved main commit, internal TestFlight only. No redesign, external beta, App Review submission, OTA updates, production deploy, or changes to the existing simulator workflow.

## Why this approach

- The Spread repository is **public**. Standard GitHub-hosted runners (including standard macOS) are free on public repositories. Fastlane is open-source. No new CI subscription is required at present.
- Codemagic is the fallback: individuals get 500 free Mac M2 build minutes/month, with subsequent M2 minutes at $0.095/minute. It simplifies signing but introduces another vendor/account.
- Trade-off: Fastlane Match requires a private encrypted-signing repository and one-time Apple authorization. An AI cannot bypass the Apple account/legal/identity tasks.

Sources: https://docs.github.com/en/billing/concepts/product-billing/github-actions ; https://docs.fastlane.tools/best-practices/continuous-integration/github/ ; https://docs.fastlane.tools/actions/match/ ; https://codemagic.io/pricing/

## Ownership and prerequisites

**Account owner:** Confirm Apple seller identity; accept Paid Apps Agreement and complete banking/tax before paid release; register identifier **com.graymatter.spread** with iCloud CloudKit/Cloud Documents and Push Notifications; verify container **iCloud.com.graymatter.spread**; create the Spread App Store Connect iOS app record; generate an App Store Connect **TEAM API key** (not an Individual API key; the latter cannot provision certificates). Do not share its .p8 file in a chat or repo.

**AI / engineering:** Maintain the workflow, inspect CI failures, submit fixes by PR. Do not enable cloud flags, merge, deploy, or issue Apple credentials.

**Human release reviewer:** Approve/deny the GitHub environment job and verify existing native/security release gates before expanding TestFlight distribution.

## Setup — no personally owned Mac needed

1. Create a separate **PRIVATE** GitHub repository for encrypted Fastlane Match signing material, for example **WGLewis0721/spread-ios-signing**, with an initial README commit. Never store signing files in the public Spread repository.
2. In Spread → Settings → Environments, create **ios-internal-testflight**. Restrict to main and configure a required human reviewer. If you are the only reviewer, allow self-review or nominate a second reviewer. Environment protections must be configured in GitHub; declaring the name in the workflow alone does not enforce them.
3. Add these GitHub environment **variables**:
   - **APPLE_TEAM_ID** — your Apple Developer Team ID.
   - **MATCH_GIT_URL** — HTTPS URL of the private signing repo, e.g. https://github.com/WGLewis0721/spread-ios-signing.git
4. Add these GitHub environment **secrets**:
   - **ASC_KEY_ID** and **ASC_ISSUER_ID** — App Store Connect *Team* API key identifiers.
   - **ASC_KEY_P8_BASE64** — single-line Base64 encoding of the complete .p8 key file. Generate and store locally, never paste it into a chat or commit.
   - **MATCH_PASSWORD** — strong unique encryption passphrase; save it in a password manager.
   - **MATCH_GIT_BASIC_AUTHORIZATION** — Base64 of username:fine-grained-GitHub-PAT, for the *private signing repository only*. Allow **Contents read/write for initial bootstrap**; rotate to **Contents read-only** after bootstrap. Match reads this secret directly.
5. After this PR is reviewed and explicitly approved for merge, Actions → **iOS internal TestFlight (manual)** becomes available on main. Choose **bootstrap_signing**, paste the exact current main SHA as **approved_commit**, check **confirm_internal_only**, and approve the environment request. Bootstrap creates certificates and profiles in the private signing repository. It **does not upload** an app.
6. Confirm the generated provisioning profile matches Spread's bundle ID and actual iCloud/Push capabilities. Rotate the signing-repository PAT to **read-only** and replace the matching environment secret.
7. Choose **upload_internal_testflight**, again with the exact main SHA and explicit reviewer approval. The workflow runs focused checks, creates self-contained iOS assets with the iCloud feature flags off, syncs Capacitor, temporarily changes the APNs entitlement to production for distribution, signs with the stored Match profile, then uploads the IPA to **App Store Connect for internal TestFlight**. Once processing finishes, assign the build to internal testers and install it.

A failed bootstrap can be retried only deliberately. Never use **match nuke** to troubleshoot routine signing.

## Security and release boundaries

- Workflow requires main + matching full commit SHA + explicit manual authorization; the signing job uses protected environment secrets only after approval.
- The two flags **VITE_SPREAD_CLOUD_BACKUP=0** and **VITE_SPREAD_CLOUD_SYNC=0** are fixed in this workflow. Current unresolved security/audit and device testing block external TestFlight and store submission.
- CloudKit Production schema deployment is required before separately approved TestFlight QA builds that enable sync. Cloud features must not be enabled just by changing this CI input.
- Routine signing imports Match assets **read-only**. Initial bootstrap uses write privileges, followed by PAT rotation to read-only.
- The runner temporarily sets manual signing and production APNs entitlements. Committed project settings and golden branches remain unchanged.
- The IPA is **not uploaded as a public GitHub Actions artifact**. It is uploaded to Apple's TestFlight service.
- Build numbers derive from GitHub run number and attempt; they increase for later runs. Avoid rerunning old uploads after a newer build has been accepted.
- No automatic submission to App Review or external testers; no web production release; no OTA update.

## Acceptance criteria

1. Existing simulator CI stays unchanged, and the PR passes existing relevant tests.
2. A wrong main SHA / missing approval / non-main run fails before reaching credentials.
3. Bootstrap creates encrypted signing assets in the separate private Match repository; subsequent signing uses read-only access.
4. A signed, offline-complete Spread IPA with cloud feature flags off reaches **internal** TestFlight.
5. The processed build installs on a physical iPhone. The owner verifies reopen persistence, offline planner, share/restore and records evidence in **docs/IOS_RELEASE.md**.
6. Unresolved audit and physical-device gates continue to block **external** TestFlight and public submission.

## Rollback and recovery

Disable this manual workflow or revert this PR (after a separate review). The web app and existing CI remain unchanged. In a credential incident revoke the API key/PAT and rotate Match encryption as needed; do not revoke Apple Distribution certificates as routine rollback. For a faulty TestFlight build, stop its distribution in App Store Connect and prepare a higher-build-number fix. Installed beta copies do not automatically disappear.

## Sources of truth

- Product gate: **APP_STORE_RELEASE_PLAN.md**
- Cloud safety and flags: **docs/ICLOUD_PLAN.md**
- Native signing and physical QA log: **docs/IOS_RELEASE.md**
- Native bundle: **ios/App/App.xcodeproj** and **capacitor.config.json**
