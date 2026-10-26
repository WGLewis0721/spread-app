# Spread Studio — approval-controlled internal TestFlight

**Scope:** Codemagic API + existing Apple signing integration. Builds only the reviewed `spread-studio` tip. **No change to production web, `main` app source, or the golden backup.** No automatic push builds and no App Store submission.

## Current state and ownership

The original TestFlight build used Codemagic's configured integration **Spread**. The old `spread-ios-upload` workflow is unchanged and still rejects non-`main` sources.

The staging workflow `spread-studio-testflight` lives in `codemagic.yaml` on `spread-studio` after its implementation PR is approved and merged.

The **dispatcher** is a separate `.github/workflows/studio-codemagic-testflight.yml` workflow plus `scripts/studio_codemagic.py` and its tests. GitHub only exposes manual `workflow_dispatch` workflows when their definitions are on the **default branch**. Therefore, activate it in a *separate, dispatcher-only PR to `main`*; do not copy Studio app code or `codemagic.yaml` to `main`. **The dispatcher PR must not be merged until explicitly approved.**

## One-time account setup (owner)

1. In Codemagic → Spread app, find the Codemagic **App ID** in the app URL. Create an API token in Codemagic **Account settings → API token**. Do not paste the token in any chat, file, or GitHub issue.
2. In GitHub → repository **Settings → Environments**, configure **`ios-studio-testflight`** with **required human reviewers** and preferably deployment branch restrictions allowing only `main` to call the trusted dispatcher. GitHub does *not* enable protection just because the workflow declares an environment; confirm the reviewer rule actually appears. Add environment secret `CODEMAGIC_API_TOKEN` and environment variable `CODEMAGIC_APP_ID`. Do not use a repo-wide unprotected release token.
3. In Codemagic Spread app → Environment variables, set **`APP_STORE_APPLE_ID`** to the numeric Apple app ID visible in App Store Connect → General → App Information. This lets the build query the latest **TestFlight** build number instead of using the new workflow's counter (which may start from 1). The existing `Spread` Developer Portal integration, App Store certificate, and `Spread-AppStore-iCloud` provisioning profile must remain configured.
4. Merge the Studio Codemagic configuration PR to **`spread-studio` only** after review. Separately review and approve the dispatcher-only PR to `main`. If default-branch activation is not approved, the Codemagic Studio workflow can still be started manually from Codemagic, but the **GitHub release button will not be available**.
5. Verify no automatic Codemagic webhook triggers are enabled for the new workflow. API-triggered builds **ignore Codemagic's configured branch/trigger filters**, which is why the build scripts fail closed on branch, exact SHA, source, flags and repo.

## Run one internal TestFlight upload (explicit owner approval required)

1. Back up planner data *inside the currently installed iPhone Spread app* with **Back Up Spread** to Files. The pre-Studio golden **source archive** is not a backup of local phone data.
2. Inspect `spread-studio` head commit and its CI. Obtain the exact full **40-character lowercase SHA**; do not copy the `main` or golden commit.
3. In GitHub → Actions → **Spread Studio - approved Codemagic TestFlight** → **Run workflow**, select default branch `main`, paste `approved_sha`, tick `confirm_upload`. The dispatcher verifies that the specified SHA is *exactly the current staging head*. Human approver must approve the protected `ios-studio-testflight` environment.
4. GitHub calls Codemagic `POST https://api.codemagic.io/builds` for `workflowId=spread-studio-testflight`, `branch=spread-studio` and two non-secret release metadata fields. Only the Codemagic API token is sent as an authentication header. No arbitrary build flags are accepted from the requester.
5. Codemagic independently rejects an unexpected branch, repo, PR checkout, disabled Studio flag, enabled iCloud features, unapproved SHA, or missing Apple app ID. It runs typecheck/lint/planner/Swift tests, bakes `VITE_SPREAD_STUDIO=1` into `npm run ios:sync`, checks the compiled Studio marker, queries Apple's last TestFlight build number, and signs using the existing integration.
6. Codemagic uploads the IPA to **App Store Connect**, **without requesting external beta review or App Store review**. GitHub polls Codemagic `data.status` through publishing and reports the build URL. `finished` means Codemagic succeeded, **not** that Apple has processed the build or assigned it to testers.
7. Once Apple processing completes, assign the build to internal testers in App Store Connect and update from TestFlight. Run the separate physical-iPhone QA (Photos imports, large/rotated images, kill during import, profile deletion, backup/restore, Reduce Transparency, Dynamic Type, offline use). Never delete the installed app before making a device-local backup.

## Release gates and rollback

- No merge/deploy/upload is triggered by this configuration change itself; `workflow_dispatch` is manual, and the environment approval is mandatory *after it has been configured*.
- The new Studio workflow is separate from the existing production Codemagic workflow. The existing workflow's `main` restriction is unchanged. Staging is never merged into `main` to make TestFlight testing possible.
- API/CI race: the staging branch could move between GitHub's preflight and Codemagic's checkout. This is **detected and aborts** before signing/uploading. The requested SHA is not an unverified claim of an immutable clone.
- Signing secrets remain in Codemagic, not GitHub. GitHub holds only the scoped Codemagic API token as a protected environment secret. The GitHub script executes only from trusted `main`, not from the staging checkout.
- `CODEMAGIC_APP_ID` / `CODEMAGIC_API_TOKEN` missing: GitHub job fails **without** contacting Codemagic. `APP_STORE_APPLE_ID` missing, unable to query Apple, or duplicate build number: Codemagic fails **without** publishing an IPA.
- GitHub concurrency serializes **this** release dispatcher; other Codemagic workflows may concurrently upload. Coordinate releases to avoid version collisions.
- Cancellation in GitHub does not automatically stop an already-running Codemagic build; if needed, cancel it from Codemagic using the recorded build URL.
- If the TestFlight build is faulty, stop its distribution in App Store Connect and make a higher-numbered corrective build. Existing installed beta apps are not automatically removed. Restore old source from the pinned golden commit and offsite Drive archives. Data restoration uses an independent user-created Spread backup.
- No public IPA artifact, API key, signing certificate, provisioning profile, or private user data is committed to the repository.

## Verification (before first live API call)

- `python3 -m unittest discover -s scripts -p test_studio_codemagic.py -v` verifies request scope, response interpretation, rejection behavior, and failure paths.
- `npm run typecheck`, `npm run lint`, `npm run test:spread`, Swift tests on staging must pass.
- Confirm Codemagic YAML parsing on the staging branch and that `spread-studio-testflight` exists in Codemagic after that branch is merged. Verify `APP_STORE_APPLE_ID` and the Apple signing integration are valid in the owner account.
- **Unverified until a real approved run:** Codemagic API token access, Apple build-number CLI auth, signing/upload, App Store Connect processing, TestFlight installation, and on-device data compatibility.

Official references: [Codemagic Builds API](https://docs.codemagic.io/rest-api/builds/), [Jenkins integration with v3 status](https://docs.codemagic.io/integrations/jenkins-integration/), [Automatic build versioning](https://docs.codemagic.io/knowledge-codemagic/build-versioning/).
