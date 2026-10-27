# Spread App Store review acceptance checklist

**Authority:** [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (Before You Submit; 2.1 App Completeness; 2.3 Accurate Metadata; 4.2 Minimum Functionality; 5.1 Privacy) and [Apple's review-information instructions](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review/).

**Rule:** A release requires a green **technical preflight**, documented **real-device and manual review**, and **separate authorization from the owner** for the exact signed IPA. An inconclusive item is not a pass. Record evidence in the PR or private release ticket; do not commit passwords, customer data or Apple credentials. This checklist is not a guarantee of Apple approval.

## Candidate identification and status

- [ ] Record source branch, full commit SHA, IPA hash, version/build number, bundle ID `com.graymatter.spread`, and candidate review owner.
- [ ] Confirm whether candidate is standard Spread or Studio-enabled, based on the actual installed IPA. Branch name or feature flag alone is not proof.
- [ ] Read the App Store Connect status and any *exact* rejection/metadata message; distinguish Waiting for Review from Rejected before changing anything.
- [ ] Confirm paid-app pricing, agreement/tax/banking readiness, supported iPhone/iPad and iOS versions in App Store Connect.

## Automated technical checks — engineering

- [ ] `python3 -m unittest discover -s scripts -p test_app_store_preflight.py -v`
- [ ] `python3 scripts/app-store-preflight.py` (bundle ID, localStorage origin, native no-login path, privacy manifest, purpose string, app icon source).
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:spread`, `swift test --package-path ios/App/SpreadCloudCore`.
- [ ] `npm run ios:sync`, then `python3 scripts/app-store-preflight.py --bundle dist-ios`: all entry-page local assets exist and the web-only injector is excluded.
- [ ] Inspect the **actual signed release IPA** with `python3 scripts/app-store-preflight.py --ipa path/to/Spread.ipa`. Confirm resolved build number, App Store bundle ID, privacy manifest and export-compliance key. Independently verify distribution signing/capabilities.
- [ ] Confirm offline iOS packaging does not depend on Vercel, preserves the existing `App://localhost` storage origin, and does not enable unapproved iCloud features.

## App Review access and functionality — QA

- [ ] From a **fresh iPhone installation** open the planner without any web-beta approval, login, network connection or shared SysAdmin password. Check the actual IPA, not localhost screenshots.
- [ ] Complete **Responsibilities → Hours → Week → Tasks**. Create/edit/complete a task, force-quit, reopen, and confirm data persists.
- [ ] Repeat core workflow in airplane mode. Verify backup/share, Files restore, older-build upgrade and storage failure handling without data loss.
- [ ] On every supported iPhone/iPad layout, test safe areas, scrolling, keyboard, portrait/landscape where supported, VoiceOver, Dynamic Type and navigation.
- [ ] Check for blank/crashing launch, beta/placeholder screens, dead buttons, clipped text, missing imagery, invalid URLs and incomplete features.
- [ ] Demonstrate meaningful native/offline behavior, including local planning and native backup/share, for Apple's minimum-functionality review (Guideline 4.2).
- [ ] Confirm actual privacy practices, permission prompts, iCloud behavior, tracking, data collection and embedded SDKs match the privacy manifest and App Store privacy labels.
- [ ] If iCloud backup/sync is **enabled** in this IPA, verify signed-out and Production CloudKit behavior on physical devices; if flags are off, don't advertise it.

## App Store Connect and App Review notes — release owner

- [ ] Check screenshots, description, age rating, price, copyright, support URL, privacy policy URL and all linked resources. Screenshots must match shipped functionality.
- [ ] Review export-compliance responses, App Privacy nutrition labels and permissions against the real app; manually validate legal and Apple account agreements.
- [ ] Set accurate contact name, email and telephone in App Store Connect. Fill in [the candidate-specific reviewer notes](APP_REVIEW_NOTES.md), tested device models/OS versions, and non-obvious feature instructions.
- [ ] Set **Sign-in required = No** for the native build **only if** installed-app QA proves no login is needed. The web beta waitlist does not apply to the native app.
- [ ] If a future native build needs login, supply a working non-expiring demo account **privately in App Store Connect**, never in code or public documentation.

## Release authorization and rollback

- [ ] QA and security/privacy reviewers sign off with evidence and tracked remaining risks.
- [ ] Owner explicitly authorizes the **specific SHA/build**, and separately approves any upload, external TestFlight distribution or App Store submission. Passing CI does **not** authorize a release.
- [ ] Preserve golden commit and rollback build. Do not change production or merge without explicit owner authorization.

## Enforcing this in GitHub

[App Store preflight](../.github/workflows/app-store-preflight.yml) runs on all PRs and pushes to `main`. Source-level checks also run within the existing approved TestFlight and Codemagic flows; packaged bundle/IPA checks run at relevant build stages. **A workflow is not automatically required**: a repository administrator must add the status check `App Store preflight / source checks` to required branch protection/rulesets on `main` (and `spread-studio` when that release branch adopts the gate). Human manual sign-off cannot be automated. No automatic merge, deployment, or App Review submission is introduced.
