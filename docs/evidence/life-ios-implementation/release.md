# Life release candidate controls

Status: prepared, **not executed**. No Codemagic build, signing, App Store Connect upload, tester distribution, merge, or production deployment was authorized or performed in this implementation session.

## Verification workflow

Run `spread-life-verify` manually only after the owner authorizes a testing build, from the current `docs/life-ios-handoff-2026-11-06` head. It rejects PR execution, stale remote head and cloud-enabled settings. It runs planner/script/docs checks, both pure Swift packages, simulator Life UI journeys, offline bundle preflight, then signs an internal-testing-only IPA. It has no publishing block.

The downloadable artifacts include source SHA, tooling inventory, simulator screenshots/result bundle, build-version record, IPA SHA256 and `reviewed-artifact.json` plus its SHA256. Review these together with physical-device acceptance evidence before authorizing any upload. A passing workflow alone does not establish full visual, gesture or haptic parity.

## Separate upload approval

`spread-life-internal-upload` has no build or signing steps. It transfers the exact verification IPA after explicit owner approval. Set these manual-run inputs from reviewed verification artifacts:

| Input | Required reviewed value |
| --- | --- |
| SPREAD_LIFE_APPROVED_SHA | exact 40-character source commit |
| SPREAD_LIFE_APPROVED_IPA_SHA256 | exact signed IPA SHA256 |
| SPREAD_LIFE_APPROVED_MANIFEST_SHA256 | exact reviewed-artifact.json SHA256 |
| SPREAD_LIFE_IPA_URL | HTTPS download URL for that verification IPA |
| SPREAD_LIFE_MANIFEST_URL | HTTPS download URL for that verification manifest |

Keep temporary download URLs private. The workflow downloads only over HTTPS, validates both approved hashes and the manifest source, reconstructs the original build record, runs signed-IPA technical preflight, and queries Apple's current build counter before upload. A collision requires a new verification build and new artifact approval; the upload workflow must never rebuild or change the build number. Remote branch head must still equal approved source immediately before publishing.

Publishing only uploads to App Store Connect; `submit_to_testflight` and `submit_to_app_store` remain false. Internal tester assignment must be verified separately. No workflow has an automatic `triggering` block. The four preexisting workflows are preserved byte-for-byte; these controls apply to the two Life workflows.

## Unavailable evidence and release blockers

This Linux environment has no Xcode/iOS SDK, Apple signing identity, provisioned iPhone, or authorized Codemagic execution. Configuration names are not proof that credentials work. No signed Life IPA or real build number exists from this session. The owner must review exact source and authorize the verification build first. Native simulator/typecheck/screenshots and physical iPhone behavior, haptics, accessibility and restart/offline evidence remain required before parity or release readiness can be claimed.

## Rollback

Do not merge while acceptance remains incomplete. Return to Classic through the preserved mode control for product fallback. Revert the focused Life commits on this PR if necessary; do not alter the frozen reference or baseline release workflows.
