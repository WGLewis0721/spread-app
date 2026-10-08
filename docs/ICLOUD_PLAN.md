# Spread 1.0: Universal Paid App, iCloud Backup, Optional iCloud Sync

Status: **APPROVED 2026-10-08.** Decisions in section 10 are accepted. Implementation proceeds phase by phase; the status table in section 14 is the source of truth for what has actually shipped.
Reviewed: `main` @ `8c026e5`, `APP_STORE_RELEASE_PLAN.md`, `docs/IOS_RELEASE.md`, `ROADMAP.md`,
`AGENTS.project.md`, `capacitor.config.json`, `ios/`, `src/lib/spread/*`, `.github/workflows/ios.yml`.
Golden baseline: `golden/2026-09-28-app-store` (76ca350), frozen. We branch from it, never modify it.

---

## 1. What exists today (verified in the repo)

| Area | Fact | Consequence |
|---|---|---|
| Shell | Capacitor 8.5.1, bundle `com.graymatter.spread`, **`TARGETED_DEVICE_FAMILY = 1`**, portrait only, iOS 15 min, no entitlements file, no iCloud/Push capability, plugins: Filesystem, Share, StatusBar only | iPad and iCloud are both net-new native work |
| Live store | WebView `localStorage`. Roster `spread.profiles`; per-profile blob `spread.v1.<profileId>` (legacy `spread.v1`); settings in `spread.theme`, `spread-accent`, etc. | The whole profile is one JSON string |
| Existing safety net | `native-mirror.ts`: two alternating files in `Library/` (`spread-mirror-a/b.json`, `seq`), restores **only when WebView storage is empty** | This is a same-device snapshot. It is not an iCloud backup, but it is the right seam to build on |
| Backup file | `backup.ts` `spread-backup` v1, **only hats/weeks/currentWeek of the active profile** | Not a full-fidelity backup: no roster, no other profiles, no settings |
| Versioning | **No schema version number.** `normalizeData()` tolerates old shapes; `MIRROR_VERSION`/backup `version` are envelope-only | Must add before any cross-device format ships |
| Entity metadata | Tasks, allocations, profiles have random 8-char ids (`Math.random`). **No `updatedAt`, no tombstones, no device id.** Default spreads use **fixed ids** (`work`, `home`, `health`, ...) | Fresh installs on iPhone and iPad produce *colliding* hat ids with unrelated data. Naive id-keyed merge would silently combine them |
| Attachments | Photos are **base64 `data:image/jpeg` URLs inline in the planner JSON** (JPEG q0.72, resized in `task-sheet.tsx`) | Hits `localStorage` quota first. CloudKit records are capped at 1 MB, so photos must become separate assets |
| Roadmap/docs | Release plan says sync is post-1.0 unless promised, and IOS_RELEASE says "no sync", "iPhone only" | These docs must be updated by the first PR (they currently contradict the approved direction) |
| Tests | `test:spread` (unit, node `--test`), `ios.yml` simulator smoke, Chromium bridge simulator (`scripts/ios-bridge-sim`) | Good base. No iCloud, no multi-device, no iPad coverage |
| Hygiene | `npm test` has known failures on `main` (16 script tests need uncommitted `.grok/skills/og/*`; one eslint `no-regex-spaces`) | Phase 0 clears these so the release gate means something |

---

## 2. Product contract (what we promise, and what we will not)

1. **$2.99 one-time paid app, universal.** One App Store record, one bundle ID, one binary supporting iPhone and iPad. A single purchase under one Apple ID installs on both. No IAP, no subscription, no StoreKit code. (Price and Family Sharing are App Store Connect settings, not code.)
2. **Local-first, offline-complete, no Spread account.** iCloud is the OS account. Spread never asks for sign-in. Everything works with iCloud signed out, disabled, or full.
3. **Automatic iCloud Backup**: default **on when iCloud is available**, with one-time non-blocking disclosure and an off switch. Write-only, immutable, versioned, **per-device**.
4. **iCloud Sync**: **off by default**, enabled only by an explicit action, per profile.
5. **Never silently combine, overwrite, or delete independent device data.** Every destructive or merging action is user-chosen, previewed, and preceded by an automatic safety snapshot.
6. **Honest status.** The UI states last-backup time, current state, and failure reasons. It never shows a green tick that it didn't verify.
7. **Design preserved.** No new colors, fonts, or decorative styles (project rule). New UI reuses the existing sheet/row/toast components and sits in the existing settings area.

---

## 3. Architecture

```
React planner (unchanged UX)           Swift (new local Capacitor plugin: SpreadCloud)
  localStorage = live store   <--bridge-->  DeviceIdentity   (Keychain, ThisDeviceOnly)
  StorageDriver (new seam)                  BackupEngine     (iCloud Documents container)
  MigrationRunner (new)                     SyncEngine       (CloudKit private DB, CKSyncEngine)
  MergeEngine + ConflictStore (TS, pure)    AccountMonitor   (CKAccountStatus / token identity)
  SyncStatus store -> UI                    staged inbound changes (applied when WebView is live)
```

Key decisions (the ones that need your sign-off are in §10):

- **Backup and sync are separate systems** with separate storage, so a sync bug can never corrupt backups.
  - **Backup → iCloud Documents (ubiquity container) `iCloud.com.graymatter.spread`.** File-based, so photos are not limited by the 1 MB record cap; no CloudKit schema to promote; recoverable even if sync is off; visible in Files/iCloud Drive for support. Layout: `Backups/<deviceId>/<ISO-timestamp>-<seq>.spreadbackup` + `manifest.json`.
  - **Sync → CloudKit private database**, **one zone (`Spread`), one record per item** (named `<syncId>|<itemId>`). Each item's fields are a `CKAsset` file (never exceed the record limit) with a content hash; `syncId`, `itemId`, version vector and timestamp are plain record fields. Uses **`CKSyncEngine`**, which requires **iOS 17**.
- **Merge brain stays in TypeScript** (pure, deterministic, unit-testable under `node --test`, shares `normalizeData`). Swift moves bytes and tokens; it never edits planner semantics. When the WebView is not alive, inbound changes are fetched and **staged** natively, then applied on next foreground.
- **Live store stays `localStorage` + existing mirror for 1.0.** Moving the source of truth to a native DB is a larger, riskier change with no user-visible benefit; `StorageDriver` keeps the door open. The existing mirror is extended, not replaced.
- **Sync granularity: one record per (profile, week)** plus one per profile "meta" (name, hats, theme, accent, order) and content-addressed **attachment assets** (`sha256`). This keeps edits to different weeks conflict-free and keeps payloads small.
- **Versioning for conflicts:** per-record **version vector** (`deviceId -> counter`) plus `updatedAt` for display only. Wall clocks are never used to pick a winner. Concurrent vectors = conflict.
- **Deletion = tombstone** (retained 90 days). A delete concurrent with an edit is a **conflict**, never a silent delete.

### 3.1 Device isolation

- `deviceId` = random UUID in **Keychain, `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`**, so a device-to-device restore or iCloud Keychain cannot clone it. Regenerate if absent. The Keychain item normally survives deleting and reinstalling the app, so a reinstall usually keeps the same `deviceId`; if it is absent a new one is made, and old backups stay attributed to the old id and remain restorable.
- Sync state (change tokens, pending queue) is stored in `Application Support` with **`isExcludedFromBackup = true`**; restoring a phone from an iPhone backup must not inherit another device's tokens.
- Backups live under `Backups/<deviceId>/`. A device only ever writes its own folder and only deletes its own (pruning). Other devices' folders are read-only candidates for "Restore from another device".

### 3.2 Backup behavior

- **Contents:** full-fidelity `spread-backup` **v2** = `{ schemaVersion, appVersion, deviceId, createdAt, roster, activeProfileId, profiles[{meta, store json}], settings, attachments[] , checksum }`. v1 files remain importable.
- **Triggers (honest about iOS limits):** debounced after changes (>=2 min and >=N changes), on `background`/`resignActive` using a background task, at launch if the last good backup is older than 24 h, opportunistic `BGProcessingTask` (best effort, never promised). Do not advertise "every hour".
- **Verification:** write temp file → `NSFileCoordinator` move → read back and checksum → only then record "last verified backup". Upload to iCloud is asynchronous and OS-managed; status distinguishes **Saved on this device** from **Uploaded to iCloud** via ubiquity item upload metadata.
- **Retention (versioned):** keep last 7 daily + 4 weekly + 3 monthly per device, plus **pinned** `pre-migration`, `pre-restore`, `pre-sync-link` snapshots (30 days, never auto-pruned earlier). Cap total size per device; if over, prune oldest unpinned first, never the newest verified.
- **Restore:** always a preview (counts per profile, date range, device name/date), always takes a `pre-restore` snapshot, and offers **"Restore as new profile"** (default when local data exists) vs "Replace current data". Replace requires explicit confirmation. Never automatic when local data exists. On a fresh install with no local data and backups found, show a prompt, not a silent restore.
- **Failure states surfaced:** iCloud signed out, iCloud Drive off for Spread, restricted by MDM/Screen Time, iCloud storage full, container unavailable, last write failed.

### 3.3 Sync behavior

- **Enable flow (explicit, per profile).** Settings → iCloud Sync → "Turn on". The sheet explains it in two sentences and runs a **link preview**:
  - iCloud has nothing for this profile → upload; takes `pre-sync-link` snapshot.
  - iCloud already holds data from another device → show both summaries (counts, date range, device names) and require a choice: **Keep both as separate profiles** (default; may exceed the 10-profile cap, see §6 R7) · **Use iCloud data on this device** (this device's data is snapshotted first) · **Use this device's data** (iCloud copy is retained as a pinned snapshot). No auto-merge of two independent histories.
- **Steady state:** local writes enqueue changes with incremented vector; remote changes are fetched, three-way merged against the last-synced base, applied through the store's normal actions (so persistence, mirror, and UI follow existing paths).
- **Auto-merge rule (conservative):** only when the two sides changed **disjoint task/allocation ids** or **different fields** of the same entity. Anything else is a conflict. Every auto-merge is logged ("Merged 3 changes from Will's iPad") and preceded by a local snapshot.
- **Conflict resolution UI:** a conflict banner opens a sheet per conflicted item: **This device** · **Other device** · **Keep both** (duplicates the task / copies the week into a labeled "Conflict copy"). Unresolved conflicts never block editing, never expire, and never auto-resolve. The losing side is preserved in the snapshot history.
- **Offline reconciliation:** edits queue durably; reconnect resumes via change tokens. `changeTokenExpired` → full refetch + three-way merge against retained base (not overwrite). `zoneNotFound`/`userDeletedZone` (user reset iCloud data) → **stop, keep local, ask**: never re-upload as if nothing happened, never wipe local.
- **Account safety:** sync state is keyed to the iCloud user record id. Account change/sign-out → sync **pauses**, local data untouched, user is asked before anything is linked to the new account.
- **Turning sync off:** local data stays; iCloud copy is left in place (user can delete it from a "Delete iCloud copy" action with confirmation). Backups continue independently.

### 3.4 iPad

Same binary, same React app. The web layout already is responsive (project checks at 1440/820/390), so iPad uses the existing layout centred in wider windows rather than a redesign.
Required: all four orientations, resizable/multitasking windows (Split View/Slide Over/iPadOS windowing), keyboard + pointer, `TARGETED_DEVICE_FAMILY = 1,2`, iPad screenshots. Gate: pixel-diff against the golden at 820/1024/1366 widths in light and dark.

---

## 4. Required native integrations

| Item | Detail |
|---|---|
| Capabilities / entitlements | New `App.entitlements`: iCloud (CloudKit + iCloud Documents), container `iCloud.com.graymatter.spread`; Push Notifications (`aps-environment`, needed for CloudKit change notifications); Background Modes: Remote notifications (+ Background processing if BGTask used) |
| Info.plist | `NSUbiquitousContainers` (visible name "Spread", `NSUbiquitousContainerIsDocumentScopePublic`), `UIBackgroundModes`, `BGTaskSchedulerPermittedIdentifiers`, iPad orientations, `UISupportedInterfaceOrientations~ipad` |
| Plugin | Local Capacitor Swift package `SpreadCloud` (SPM, alongside `CapApp-SPM`), methods: `status`, `enableBackup/disable`, `backupNow`, `listBackups`, `readBackup`, `restore*`, `enableSync/disable`, `syncNow`, `pullStaged`, `ackApplied`; events: `statusChanged`, `inboundReady` |
| Min iOS | Raise **15 → 17** (CKSyncEngine). Needs your approval (§10) |
| Privacy manifest | Add required-reason entries actually used (e.g. disk space if checked, file timestamps already present). iCloud data is not collected by us, so "Data Not Collected" remains true; **verify against the final binary** |
| CloudKit schema | Define in Development, **deploy to Production before any TestFlight/App Store build**, otherwise sync works in debug and fails in release |
| Swift tests | XCTest target using a `CloudTransport` protocol with an in-memory fake; real CloudKit only in the device matrix |

---

## 5. Migration strategy

1. **Schema version first, no behavior change.** Add `schemaVersion` (start `2`; current implicit shape = `1`) to the roster and each profile blob, written by a `MigrationRunner` that is **idempotent and monotonic**: migrations only add fields, never remove or rewrite existing ones, and never run if the stored version is newer than the app (open read-only with a "update Spread" notice instead of downgrading/corrupting).
2. **Take a pinned `pre-migration` snapshot** (mirror + iCloud backup if enabled) before every migration step.
3. **Entity metadata**: lazily add `deviceId`/vector fields on first edit, not by rewriting all data at launch.
4. **Attachments**: new photo blocks written as `{ type:"photo", attachmentId, sha256 }` with the file in `Library/Attachments`; **dual-read** (`src` data URL still understood) for the whole 1.x line, and the data URL is kept in the blob until a verified attachment file exists. Conversion is lazy and resumable. This keeps the previous build able to read data after a rollback.
5. **Default-hat id collision:** profiles being linked get a stable `syncId`; hats are matched by `(profileSyncId, hat id)` only inside a profile the user explicitly linked, never across independent profiles, so two fresh devices never merge by accident.
6. **Fixtures:** keep today's legacy shapes (`upgrade.test.ts`) and add real exports from `golden/2026-09-28-app-store` as read-only fixtures. Every migration must round-trip them.

## 6. Architectural risks and mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **No schema version / entity metadata**, so merges would guess | High | Phase 1 before anything syncs |
| R2 | **Fixed default hat ids collide** across devices; id-keyed merge silently combines unrelated data | High | Link flow never merges independent histories; `syncId` scoping (§5.5); explicit test |
| R3 | **Photos inline in JSON** exceed `localStorage` quota and CloudKit's 1 MB record limit | High | Content-addressed attachments, `CKAsset`, dual-read migration |
| R4 | **Device id cloned** via device-to-device restore/iCloud Keychain | High | Keychain `ThisDeviceOnly`; token files excluded from backup |
| R5 | **Account switch** uploads account A's data to account B | High | Key sync state to iCloud user id; pause + ask on change |
| R6 | **WebView storage eviction** during sync | High | Existing mirror retained; sync base stored natively too; apply-then-ack protocol |
| R7 | Keep-both exceeds the 10-profile cap | Medium | Allow temporary overflow only for conflict copies, with a clear "merge or remove" prompt; cap enforcement remains for user-created profiles |
| R8 | Sync cannot run in background JS | Medium | Native fetches and stages; TS applies on foreground; UI shows "N changes waiting" |
| R9 | CloudKit **Production schema not deployed** | High (release) | Hard release gate + checklist item with screenshot of Dashboard |
| R10 | iCloud features can't be tested in hosted CI | Medium | Transport protocol + fakes for logic; manual two-device matrix for integration; gate evidence recorded in `docs/IOS_RELEASE.md` |
| R11 | iPad/windowing breaks portrait-only assumptions (safe areas, keyboard, gestures, drag) | Medium | Golden pixel-diff at tablet widths, drag/touch/pointer tests, no layout redesign |
| R12 | iOS gives no guaranteed background cadence | Medium | Copy says "automatically when you use Spread", never a fixed interval |
| R13 | Quota/space: backups + attachments fill iCloud | Medium | Size caps, pruning, clear "iCloud is full" state, never fail the local save |
| R14 | Schema downgrade after rollback to older build | Medium | Additive-only migrations, forward-compat read-only mode, dual-read attachments |
| R15 | Scope: this is 1.0 launch-critical and touches the data layer | High | Phased PRs, feature flags, sync can slip to 1.1 without blocking 1.0 (see §10 Q3) |

## 7. App Store compliance

- **Pricing/commerce:** paid app, price point $2.99 (US; other territories are Apple's equivalents), Paid Apps Agreement + banking + tax before submission. No IAP, no StoreKit. Universal purchase is automatic when iPhone and iPad are in the same app record. Decide Family Sharing in App Store Connect (verify current availability for paid apps).
- **Guideline 2.1 (completeness):** reviewers may have no iCloud account; every iCloud screen must degrade to a clear "iCloud is unavailable" state without crashing or blocking the planner.
- **App Review notes:** local-first, no account, iCloud backup automatic and sync opt-in, how to see backup status, how to test without iCloud.
- **Privacy:** "Data Not Collected" stays valid because user data lives in the user's own iCloud and is not accessible to us; verify at upload. Update privacy policy and support pages to describe iCloud backup/sync, retention, and how to delete the iCloud copy. No tracking, no third-party SDKs.
- **Account deletion (5.1.1(v))** does not apply (no Spread account); still provide in-app "Delete iCloud copy".
- **Accuracy:** only advertise iPad and iCloud after accepted device QA (existing plan rule). Use Apple trademarks correctly ("iCloud", "iPad"). Make **no** encryption claim beyond what Apple documents and we have verified. Do not say "end-to-end encrypted" for Spread's iCloud data; at most, say data is stored in the person's own iCloud account.
- **iPad requirements:** 13-inch iPad screenshots, all orientations (or documented full-screen policy), launch screen, multitasking behavior verified. Latest-Xcode/SDK requirement checked at submission time.
- **Export compliance:** unchanged (`ITSAppUsesNonExemptEncryption = NO`) because we add no custom crypto; re-confirm if we add any.
- **Landing page:** per project rules the App Store CTA/claims go live only after the listing is public; landing work never touches planner code.

---

## 8. Phased plan and PR boundaries

Each PR: branched from `main`, one concern, mergeable and revertable on its own, CI green, no golden branch touched. Feature flags: `cloud.backup`, `cloud.sync`, default off until the phase gate is met.

### Phase 0: Alignment and hygiene (no behavior change)
- **PR-0a docs:** update `APP_STORE_RELEASE_PLAN.md`, `IOS_RELEASE.md`, `ROADMAP.md`, `README.md`, `AGENTS.project.md` to the approved direction (universal $2.99, iCloud backup default-on, sync opt-in, min iOS 17). Add this plan as `docs/ICLOUD_PLAN.md`. *Accept:* docs consistent; no stale "iPhone only/no sync" statements.
- **PR-0b test hygiene:** fix or properly gate the known failing `npm test` scripts and the lint error; add `test:cloud` script and CI job skeleton. *Accept:* `npm test`, `lint`, `typecheck` green on `main`.
- **PR-0c golden harness:** pixel-diff script that renders key planner screens at 390/820/1024/1366, light/dark, reduced motion, against `golden/2026-09-28-app-store` baselines (stored as CI artifacts, not committed binaries if large). *Accept:* diff passes on current `main`.

### Phase 1: Data foundation (no iCloud yet)
- **PR-1a schema versioning + MigrationRunner:** `schemaVersion`, idempotent additive migrations, newer-version read-only mode, pinned pre-migration snapshot into the existing mirror. *Accept:* every legacy fixture and golden export migrates with zero data diff; downgrade-open is safe; migration interrupted at any point resumes.
- **PR-1b device identity + entity metadata:** Keychain `deviceId` (native), lazy per-entity version vectors, tombstones, profile `syncId`. *Accept:* ids stable across relaunch; not cloned by simulated device-restore; legacy data unchanged until edited.
- **PR-1c attachments store:** content-addressed files, dual-read, lazy resumable conversion, quota relief. *Accept:* photos round-trip bit-exact; old builds still render; backup export includes them.
- **PR-1d full-fidelity backup v2:** export/import of all profiles, roster, settings, attachments; v1 import preserved; restore-as-new-profile and safety snapshot. *Accept:* export → wipe → import equals original (property test); v1 files still import.
- **Gate 1:** all tests green; golden diff passes; TestFlight internal build stays functionally identical.

### Phase 2: iPad (parallel with Phase 3)
- **PR-2a:** `TARGETED_DEVICE_FAMILY=1,2`, iPad orientations, plist, launch screen; iPad simulator job in `ios.yml`. 
- **PR-2b:** layout/interaction fixes found at 820/1024/1366 only where the golden diff or interaction tests fail (drag, keyboard, pointer, Split View). *Accept:* no visual diff on iPhone widths; iPad matrix passes; no orientation lock regressions.
- **Gate 2:** physical iPad checklist passed.

### Phase 3: Automatic iCloud Backup
- **PR-3a:** entitlements, capability, container, `SpreadCloud` plugin skeleton, `AccountMonitor`, status API + `SyncStatus` store (no UI). *Accept:* status correct for signed-in / signed-out / restricted / full (fake + device).
- **PR-3b:** `BackupEngine` (write, verify, upload state, retention, pinning, per-device folders, triggers). *Accept:* kill-during-write never corrupts latest good backup; retention math tested; two devices write only to own folders.
- **PR-3c:** restore UX (list own + other devices' backups, preview, restore-as-new / replace, fresh-install prompt). *Accept:* never silent when local data exists; pre-restore snapshot always exists; one-tap rollback of a restore.
- **PR-3d:** Settings status UI (reusing existing components/tokens): "Backed up today 9:41 AM", "Waiting for iCloud", "iCloud is full", "Turn off". *Accept:* VoiceOver labels, Dynamic Type, non-color-only meaning, reduce-motion safe; zero golden diff elsewhere.
- **Gate 3:** two-device backup isolation proven on hardware; reinstall-restore proven; privacy manifest verified.

### Phase 4: Optional iCloud Sync
- **PR-4a MergeEngine (TS, pure):** vector compare, three-way merge, conflict model, tombstones; property tests (commutativity, idempotence, no-loss: every input item appears in output or in a recorded conflict). *No native code.*
- **PR-4b CloudKit transport:** `CKSyncEngine` wrapper behind `CloudTransport`; zones, records, assets, encrypted fields, error taxonomy (`serverRecordChanged`, `quotaExceeded`, `zoneNotFound`, `userDeletedZone`, `changeTokenExpired`, account change). XCTest with fake transport.
- **PR-4c link flow + enable/disable:** link preview, keep-both/replace choices, pre-link snapshots, disable/delete-iCloud-copy. *Accept:* two independent devices linked → no item lost, no silent merge; every branch of the choice screen tested.
- **PR-4d conflict UI + offline reconciliation:** banner, per-item resolution sheet, staged inbound apply, durable queue. *Accept:* scripted offline-edit-on-both scenarios from §9 pass.
- **PR-4e sync status UI:** extends 3d: "Synced · iPad · 2 min ago", "N changes waiting", "N conflicts need you", paused-account state.
- **Gate 4:** full two-device matrix (§9) on hardware; CloudKit Production schema deployed; soak run.

### Phase 5: Release hardening
- **PR-5a:** docs/IOS_RELEASE.md verification record, App Review notes, privacy/support page updates, release checklist updated to the gates in §11.
- Then TestFlight internal → external → submission, per the existing sequence.

Ordering: 0 → 1 → (2 ∥ 3) → 4 → 5. Phases 3 and 4 can each ship independently, so sync can slip to 1.1 without delaying a safe, backed-up 1.0 (see §10 Q3).

---

## 9. Automated and manual tests

**Automated (CI, no Apple account):**
- Migration: legacy fixtures + golden exports; interruption at every step; newer-version read-only; idempotence.
- Backup: envelope v1/v2 parse, checksum failure rejection, retention/pinning math, truncated/corrupt latest → fallback to previous, per-device path isolation, restore-as-new never touches existing profiles (property test: pre-existing data is a subset of post-restore data).
- Merge (property-based): commutative, associative on disjoint edits, idempotent, **no data loss invariant**, tombstone-vs-edit always conflicts, default-hat-id collision between unlinked profiles never merges.
- Sync scenarios against `FakeCloud` (two simulated devices, scripted network): edit-offline-both-sides, delete-vs-edit, duplicate-add, week rollover, account switch, zone deleted, token expired, quota exceeded, partial upload crash, replay.
- UI via Chromium bridge simulator: status states, link sheet branches, conflict sheet, backup list, restore confirmation, no network when iCloud off (existing "no network requests" check extended).
- Swift: XCTest on CI macOS for Keychain id, retention, transport error mapping, staged-change apply/ack.
- iOS simulator smoke (existing) extended to iPad; golden pixel-diff gate.
- Static: privacy manifest lint, entitlement/plist assertions (container id, background modes, device family), bundle completeness check.

**Manual device matrix (recorded in `docs/IOS_RELEASE.md`):** iPhone + iPad on same Apple ID; airplane mode edits on both then reconnect; iCloud signed out/in/different account; iCloud Drive off; iCloud full; reinstall + restore; replace-phone restore from device backup (deviceId must regenerate); low storage; background/resume; Reduce Motion, VoiceOver, Dynamic Type; time-zone/week boundary.

## 10. Approved decisions and Apple research

All seven recommendations were approved. Research against Apple's published requirements (October 2026):

| Decision | Result | Evidence / correction |
|---|---|---|
| Minimum iOS 15 to 17 | **Confirmed** | `CKSyncEngine` is iOS 17.0+ (Apple docs). Capacitor 8 itself needs iOS 15 and Xcode 26, so 17 is compatible |
| Backup default on when iCloud is available | **Approved**, shipped behind `cloud.backup`, which stays **off in the binary until Gate 3 is met on hardware** | Unverifiable native code must not write to users' iCloud unproven |
| Sync can slip to 1.1 | **Approved**, `cloud.sync` flag, off until Gate 4 | |
| Auto-merge disjoint edits with log + snapshot | **Approved** | |
| Keep-both may exceed the 10-profile cap | **Approved**, overflow only for conflict copies | |
| Family Sharing | **Left off.** Forum reports say the paid-app toggle is no longer shown; verify in App Store Connect before relying on it | Not confirmed by Apple docs |
| Photos become attachment files | **Approved**, dual-read for all of 1.x | CloudKit records are capped at 1 MB |

Additional findings that change the plan:

- **Universal purchase:** one app record, one bundle ID, both device families in one binary gives one purchase for iPhone and iPad (Apple glossary). Nothing to build; verify in App Store Connect. Existing separate records cannot be merged, which does not apply to a new app.
- **Build SDK:** since 2026-04-28 uploads must be built with Xcode 26 / iOS 26 SDK. The existing CI runner (`macos-26`) is compatible. Runtime minimum stays independent (iOS 17).
- **iPad orientation:** `UIRequiresFullScreen` is deprecated in iPadOS 26 and will be ignored (Apple TN3192), with console warnings that all orientations will be required. So iPad ships with **all orientations and resizable windows**, not a portrait lock. No published review rule found; treat as required anyway.
- **iPad screenshots:** the 13-inch slot is required if the app runs on iPad: 2064x2752 portrait or 2752x2064 landscape (2048x2732 also accepted). Smaller sizes are scaled from it.
- **CloudKit schema:** TestFlight and App Store builds use the **Production** environment. The schema must be deployed from Development to Production first, and production changes are additive-only. Hard release gate.
- **Privacy label:** developers cannot read a user's CloudKit private database, and common practice is "Data Not Collected". Apple's own definition of "collect" was not retrieved, so **confirm in App Store Connect's App Privacy questionnaire** and keep the privacy policy explicit about iCloud.
- **Capacitor SPM:** community reports the generated `CapApp-SPM/Package.swift` can carry a stale platform version after changing the deployment target. After raising to iOS 17 verify `ios:sync` output and the resolved `Package.swift` platform.

## 11. Updated release gates (additions to `APP_STORE_RELEASE_PLAN.md`)

A build may go to external TestFlight / App Review only when **all** are true:

1. `typecheck`, `lint`, `npm test`, `test:cloud`, Swift XCTest all green; no known-failing suites on `main`.
2. Golden pixel-diff clean on iPhone widths; iPad matrix passes at 820/1024/1366 light/dark/reduced-motion.
3. Migration suite passes on every legacy and golden fixture, including interruption and newer-version cases.
4. Backup: kill-during-write, corrupt-latest, retention, and per-device isolation proven; reinstall and new-device restore proven **on hardware**.
5. Sync (if shipping): no-data-loss property tests green; two-device offline matrix passed on **real iPhone + real iPad**; account-switch and zone-deleted handled; CloudKit **Production** schema deployed and verified with a TestFlight (not Debug) build.
6. Airplane-mode full planner loop works with iCloud signed out, disabled, and full.
7. No network requests when iCloud is off (existing check retained).
8. Privacy manifest, App Privacy answers, privacy policy, support page, and review notes match the shipped binary; iCloud and iPad claims appear only in metadata that passed their own device QA.
9. Paid Apps Agreement/banking/tax complete; price $2.99 set; universal purchase verified (one record, both device families).
10. Rollback rehearsed (§12) on a TestFlight build.

## 12. Rollback procedures

| Layer | Procedure |
|---|---|
| Feature flags | `cloud.sync` and `cloud.backup` are remotely-inert local flags shipped in the binary; a hotfix build flips them off. Disabling never deletes local data or iCloud copies |
| Bad build | Stop phased release / remove from sale if needed; expedite a hotfix that restores the last good behavior. Keep the previous build's data readable (additive migrations, dual-read attachments) so users who update then roll forward lose nothing |
| Bad migration | Pinned `pre-migration` snapshot (mirror + iCloud backup) restores pre-migration state; migration runner refuses to run twice or to downgrade |
| Bad merge/sync | Every link/merge/restore takes a pinned snapshot; "Undo last sync change" restores it; kill switch pauses sync and keeps the local store authoritative |
| Bad backup writer | Backups are immutable and per-device; stop writer, keep existing versions; local mirror remains |
| Code | Each PR is independently revertable; `main` stays deployable; goldens untouched; `golden/2026-09-28-app-store` remains the visual/functional reference |
| CloudKit schema | Production schema is additive-only (record types and fields cannot be removed once promoted), so design fields conservatively and version payloads in-band |

## 13. Out of scope
macOS, Watch, accounts, backend/SaaS, IAP/subscriptions, collaboration or sharing between different Apple IDs, planner redesign.

## 14. Status

Updated 2026-10-08. "Merged" means on `main` with CI green. Nothing below has run against real iCloud or on a physical device: every iCloud behavior is behind `cloud.backup` / `cloud.sync`, both **off** in the shipped binary until the matching gate in section 11 is met on hardware.

| Phase | What | State |
|---|---|---|
| 0a | Docs aligned to the 1.0 direction | Merged (#22) |
| 0b | CI workflow, lint errors fixed | Merged (#22). The `iOS shell` simulator job is occasionally flaky on hosted runners (first run on #22 failed to launch the simulator app, the re-run passed) |
| 0c | Golden pixel-diff harness | **Not built.** Replaced by running the existing simulator suites with the flags off (installed app 27/27, website all pass) on every change. A real visual diff against `golden/2026-09-28-app-store` is still open |
| 1a | Schema marker + migration runner | Merged (#25) |
| 1b | Version vectors, profile `syncId` (device id is native, below) | Merged (#25) |
| 1c | Attachments as separate files | **Deferred to 1.1.** Photos stay inline in the planner JSON. Sync sends item fields as a file (`CKAsset`) so the record limit does not apply, but the `localStorage` quota and large backups remain a known risk (R3) |
| 1d | Full backup v2 + restore as new profiles | Merged (#25) |
| 2 | iPad family, all orientations, iOS 17 | Merged (#23). Layout on a physical iPad not yet verified |
| 3a/3b | Native backup foundation: plugin, device id, backup store, retention | Merged (#24) |
| 3c/3d | Backup runner, status, restore from iCloud (UI) | Merged (#26) |
| 4a/4c-core | Merge, planner split, sync state machine, link planning, session | Merged (#27) |
| 4b | Native `CKSyncEngine` transport | Merged (#28) |
| 4c-ui | Link flow, conflict screens, status | Merged (#30) |
| Audit | Independent audit found 2 critical, 7 high and 10 medium issues; fixes follow in stacked PRs, none merged yet | F1 #31 mass-delete guard, F2 #32 profile binding, F3 #33 adopt/replace, F6 #34 restore, F4 #35 payload integrity, F5 #36 durable pause, F7 #37 consent and safety copies, F8 hardening and docs |
| Still owed | F0: CI running the Chromium simulators and Swift logic tests for the engine and storage (needs the logic moved into `SpreadCloudCore`); a fresh re-audit; the device gates below | Open |

### Where the build differs from the plan above

- **Restore from a full backup always adds new profiles.** There is no "replace" for a v2 file. Replacing needs the person to remove a profile first. (v1 week files keep their original replace behavior, with a pinned copy first.)
- **Linking never merges.** The only in-place join is an empty profile adopting an iCloud profile. Everything else adds a new profile or uploads separately.
- **Only the open profile syncs.** Switching profiles stops one session and starts the next.
- **No "delete the iCloud copy" action and no tombstone pruning.** Deleting the CloudKit zone would delete every profile's synced data, including other devices'. Turning sync off leaves the iCloud copy in place; removing it is done in Settings, iCloud, Manage Storage. Tombstones are kept (they are small).
- **No background cadence.** Backups happen after changes, when the app is backgrounded, and at launch when the last one is over a day old. There is no background task, and the copy says so.
- **No end-to-end encryption claim.** Item fields are plain CloudKit assets in the person's private database; `encryptedValues` is not used. Do not describe the data as end-to-end encrypted in the app, the listing or the privacy text. Evaluating `encryptedValues` for the payload is a 1.1 item, to be decided after reading Apple's current documentation.
- **Backup is off until the person answers a first-run notice**, and an unreadable preference means off. Nothing is uploaded before then.
- **Sync never re-uploads on its own after a pause.** An iCloud sign-out, account switch or deleted iCloud copy pauses sync durably; only an explicit, confirmed "Upload this profile to this iCloud again" lifts it.
- **Conflict choices are reversible for 30 days:** the version not chosen is kept under "Set aside" with a "Put back" action.
- **Safety copies:** restores and sync linking refuse to run if a verified local copy cannot be written first. Copies are timestamped, the 15 newest are kept, and "Restore from a safety copy" is in More.
- **Backup retention** does not thin older iCloud copies until the newest has reached iCloud.
- **Family Sharing is off.** Not confirmed available for paid apps.
- **Retention** is 7 daily, about 5 weekly and about 4 monthly buckets, pinned copies for 30 days, a 200 MB per-device ceiling, and the newest regular backup is never removed.

### Release gate evidence still owed

Gate 3 (backup on hardware), Gate 4 (two real devices), CloudKit Production schema deployment, iPad layout and screenshots, VoiceOver and Dynamic Type for the new sheets, privacy answers and policy text, and the rollback rehearsal. See `docs/IOS_RELEASE.md` for the checklists.
