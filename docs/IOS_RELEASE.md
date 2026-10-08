# Spread for iPhone: release candidate runbook

Spread 1.0 is the existing planner packaged with Capacitor for iPhone and iPad. It is local-first, has
no Spread account, no subscription and no backend, and does not depend on Vercel once installed.
iCloud Backup (automatic) and iCloud Sync (opt-in) are being added; see
[ICLOUD_PLAN.md](ICLOUD_PLAN.md). **Until the phases in its status table are merged and verified on
devices, the shipped build described below has no iCloud features and is iPhone-only.**
This file says what the release candidate does, how to build and upload it, what has been checked,
and what still needs an Apple account or a physical iPhone.

Status: **a tested simulator build, not yet a TestFlight build.** Nothing here has run on a
physical iPhone or been signed. Do not describe it as release-ready until the device checklist
below is done.

## Identity

| Item | Value |
|---|---|
| Bundle ID | `com.graymatter.spread` |
| Display name | Spread |
| Version / build | 1.0 / 1 (raise the build number for every upload) |
| Devices | iPhone only, portrait only today. Target for 1.0: iPhone + iPad, all orientations (see ICLOUD_PLAN.md) |
| Minimum iOS | 15.0 today. Target for 1.0: 17.0 (`CKSyncEngine`) |
| Signing | Automatic, no team set in the repo (you choose it in Xcode) |
| Encryption | `ITSAppUsesNonExemptEncryption = NO` (HTTPS and OS crypto only) |
| App icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`, from `public/icons/app-icon-spread-cards-square.svg` |
| Privacy manifest | `ios/App/App/PrivacyInfo.xcprivacy` (no tracking, no collected data) |

## What the installed app does differently from the website

Everything below is gated on `isNativeApp()` (`src/lib/spread/native.ts`). The website is unchanged.

- **No marketing page and no license gate.** The app opens straight into the planner. A built-in
  license is used in memory only and is never written to storage.
- **Export goes through the share sheet.** `<a download>` and `window.print()` do nothing in
  WKWebView. Back Up Spread and Word document write a file to the app cache and hand it to the
  iOS share sheet (Save to Files, AirDrop, Mail). Print / Save PDF, License key and Log out are
  hidden. Cancelling the share sheet is silent.
- **Restore** uses the system file picker with no type filter, because `.spread` is not a
  registered file type and iOS would grey those files out.
- **Storage snapshot.** The planner still lives in the WebView's `localStorage`. The app also
  keeps a copy of every `spread.*` key in two alternating files in the app's Library folder
  (`spread-mirror-a.json`, `spread-mirror-b.json`). At launch, if the WebView has no planner data
  and a valid snapshot exists, the snapshot is put back. It never overwrites data that is there.
  See `src/lib/spread/native-mirror.ts`.
- **Save failures are visible.** Every planner write goes through one helper. If storage is full
  or blocked, the screen keeps the change, the person sees one message, and the next successful
  write clears the alarm. This also applies on the web.
- **Unreadable saved data is kept**, under `spread.recovery.<store key>`, instead of being
  overwritten by an empty planner.
- **Status bar** follows the planner's own Light/Dark/System choice, not only the phone's.
- **Toasts** sit below the notch.
- **Launch screen** follows the system appearance (grouped background and label colors).
- **Origin is pinned** (`app://localhost`, `server.hostname = localhost`). `localStorage` is keyed
  by origin, so changing the scheme or hostname in a later build would orphan every installed
  planner. Do not change `ios.scheme` or `server.hostname` after the first TestFlight upload.

## Build and upload (on a Mac)

You need a Mac with a current Xcode (the one Apple currently requires for App Store uploads), Node
22, and an Apple Developer Program membership.

```sh
git checkout main && git pull
npm ci
npm run typecheck
npm run test:spread
npm run ios:sync       # builds the web app, snapshots it into dist-ios, runs `cap sync ios`
npm run ios:open       # same, then opens ios/App/App.xcodeproj in Xcode
```

`ios:sync` fails if the page references a file that is not in the bundle, and refuses to run if
something is already listening on port 8096. Always run it before archiving; the web assets in
`ios/App/App/public` are generated, not committed.

In Xcode:

1. Select the **App** target, then **Signing & Capabilities**. Choose your **Team**. The bundle ID
   `com.graymatter.spread` must belong to that team (automatic signing registers it).
2. Check **General**: Version `1.0`, Build `1`. Increase Build for each upload.
3. Choose the destination **Any iOS Device (arm64)**, then **Product > Archive**.
4. In the Organizer, **Distribute App > App Store Connect > Upload**.

Command line equivalent:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/Spread.xcarchive \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=<TEAMID> archive

xcodebuild -exportArchive -archivePath build/Spread.xcarchive -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates
```

`ExportOptions.plist` needs `method` = `app-store-connect`, `teamID`, and `destination` = `upload`.

In App Store Connect: create the app record with the same bundle ID, wait for the build to finish
processing, add internal testers, and install from TestFlight. No export-compliance prompt should
appear because the plist answers it.

## Verification record

### Completed

| Check | Where it ran | Result |
|---|---|---|
| TypeScript typecheck | Local and CI (`ios.yml`) | Pass |
| Unit tests for the planner (`npm run test:spread`, 42 tests) including the storage snapshot, upgrade and backup shapes, and native detection | Local and CI | Pass |
| Web production build and `export:ios`, including the check that every file the page loads is in the bundle | Local and CI | Pass |
| `cap sync ios` finds Filesystem, Share and StatusBar and writes `Package.swift` | Local and CI | Pass |
| Native build: `xcodebuild` Debug for the iPhone simulator (privacy manifest, storyboard, icon, plugins) | CI on macOS | Pass |
| Installed app in the iOS Simulator (real WKWebView) opens straight into the planner and writes a snapshot through the Filesystem plugin, so bundled assets load with no dev server | CI on macOS | Pass |
| Same app: the same profile is present after the app is terminated and relaunched | CI on macOS | Pass |
| Same app: after the WebView's `LocalStorage` folders are deleted, a relaunch restores the planner from the snapshot (a renamed profile in the snapshot comes back, so the restore path ran) | CI on macOS | Pass |
| Installed-app behavior in Chromium with a fake bridge (22 checks): gate skipped, no license stored, share sheet backup and cancel, restore picker, relaunch, restore after storage loss, unreadable data kept, full store announced, **no network requests at all** | Local (`scripts/ios-bridge-sim`) | Pass |
| Website unchanged: gate shown, license flow, Log out, License key, Print, normal download | Local (`scripts/ios-bridge-sim/web_regress.py`) | Pass |
| Vercel preview of this branch builds | Vercel | Pass |

### Could not be executed

| Check | Why |
|---|---|
| Release (archive) build, signing, upload, App Store privacy validation | Needs an Apple Developer team. The privacy manifest is checked by Apple at upload. |
| Anything on a physical iPhone | No device. See the checklist below. |
| Real airplane-mode run | The simulator job has network access. Offline is shown by the bundle check, the simulator reaching the planner from the app bundle, and the Chromium run that blocked every non-local request. |
| Upgrade over an earlier installed build | No earlier TestFlight build exists. Older data shapes are covered by unit tests, and the origin is pinned so storage carries over. |
| Looking at the simulator screenshot | CI artifacts could not be downloaded from the sandbox. The simulator checks above read the app's own files instead. |
| Time zone and week-boundary behavior, Reduce Motion, VoiceOver | Not exercised in this pass. |

### Known issues outside this work

- `npm test` runs `scripts/**/*.test.mjs`, and 16 of those fail on `main` too (they need
  `.grok/skills/og/*`, which is not committed). `npm run test:spread` is the planner suite.
- `eslint` reports one `no-regex-spaces` error in `src/lib/spread/share.test.ts`, also on `main`.
- `AGENTS.md` says never strip the Grok branding injector. `scripts/export-ios.mjs` removes it from
  the iOS bundle only, on purpose (the installed app must not load a remote script). The website
  build is untouched.

## Physical iPhone checklist (not done)

Do these on a real device from a TestFlight build, in this order:

1. Install, open, add a spread and a task, force-quit, reopen: data is there.
2. Keyboard: add a task, rename a spread and open a task sheet with the keyboard up. The field
   stays visible, the sheet does not jump, and closing the keyboard restores the layout.
3. Safe areas: header under the Dynamic Island or notch, dock and sheets above the home indicator,
   toasts below the status bar. Check Light, Dark and System, with the phone and the planner set
   to different appearances (the status bar clock must stay readable).
4. Back Up Spread: the share sheet opens, "Save to Files" works, the file is named
   `Spread-<week>.spread`. Word document: opens in Pages or Word.
5. Restore Spread: the Files picker lets you choose that `.spread` file (not greyed out), the
   confirmation shows the right counts, and the data comes back.
6. Task photo: Photo Library and Take Photo both work, and the camera prompt shows the usage text.
7. Background and resume: leave the app for a minute and return; leave it overnight and return.
8. Low storage: with the phone nearly full, edit a task. Expect the single "couldn't save" message
   and no crash.
9. Upgrade: install build N, add data, install build N+1 over it. Data is kept.
10. Delete and reinstall: expected to start empty (nothing leaves the phone). Confirm a backup
    restores into it.

## Remaining Apple account steps

1. Enroll in the Apple Developer Program and, for a paid app, accept the Paid Apps Agreement and
   complete banking and tax.
2. Register the `com.graymatter.spread` identifier (or let automatic signing do it) and create the
   App Store Connect app record.
3. Select the Team in Xcode, archive and upload build 1.
4. App Store Connect metadata: name, subtitle, description, keywords, category, age rating,
   pricing, territories, support and privacy URLs, screenshots, and privacy answers ("Data Not
   Collected" matches the binary), plus App Review notes saying the app is local-first with no
   account.
5. Internal TestFlight testing, then external beta, then submit.
