# Privacy manifest and usage-string audit (Spread 1.0)

> Part of the release folder. Index: [README.md](README.md). Spec: [../design/specs/2026-11-14-release-readiness-w6.md](../design/specs/2026-11-14-release-readiness-w6.md).

> Summary: compares `ios/App/App/PrivacyInfo.xcprivacy`, the Info.plist usage strings and the entitlements against the APIs and SDKs the shipped app code really calls. One declared gap was fixed (system boot time). Three items remain owner decisions and one manifest is missing from the widget target. Nothing here is verified by an Xcode build or an App Store Connect upload.

Scope: the app target (`ios/App/App`, `ios/SpreadNativeV2/Sources`, the Cloud folder compiled into the app target), the widget extension (`ios/App/SpreadWidget`), the Capacitor plugins in `node_modules/@capacitor/*` (Filesystem, Haptics, Share, StatusBar, core), and the web bridge in `src/lib/spread/native*.ts`. Method: targeted search of the Swift sources for each required-reason API category, plus a read of each SDK's own manifest and iOS sources.

## 1. Required-reason API categories

Paths in this table are relative to `ios/SpreadNativeV2/Sources/SpreadNativeV2/` unless they start with `ios/`.

| Category (Apple key) | Found in shipped code? | Where (file:line) | Declared before | Action |
| --- | --- | --- | --- | --- |
| UserDefaults (`CA92.1` same app; `1C8F.1` App Group) | Yes, standard and App Group suite | Standard: `Planner/PlannerOrder.swift:98,113,122,126`; `Sheets/TaskSheet.swift:88,285,292,354`; `Life/LifeWeekView.swift:306,315`; `Life/LifePalette.swift:25`; `Shell/SpreadLiveRoot.swift:114-116`; `ios/App/App/SceneDelegate.swift:21,24,31`. App Group: `Focus/SpreadFocusSession.swift:262` (`UserDefaults(suiteName:)`), `Widget/SpreadWidgetPublisher.swift:29`, `Widget/SpreadFocusWidgetPublisher.swift:17`, `Widget/SpreadLifeCardsPublisher.swift:19`. Widget: `ios/App/SpreadWidget/SpreadTimerWidget.swift:41`, `SpreadTodayWidget.swift:18`, `SpreadLifeCardsWidget.swift:39` | `CA92.1` only | **Added `1C8F.1`** to the app manifest. Widget target: see gap G1 |
| System boot time (`35F9.1` measure elapsed time) | Yes, `ProcessInfo.systemUptime` | `Theme/SpreadTheme.swift:380`; `Week/WeekSurface.swift:759`; `Life/LifeHoursView.swift:387` (used to rate-limit haptic ticks) | **Missing** | **Added `SystemBootTime` with `35F9.1`** |
| File timestamp (`C617.1` app container) | Indirect only (see section 2) | Capacitor Filesystem reads ctime and mtime: `node_modules/@capacitor/filesystem/ios/Sources/FilesystemPlugin/IONFileStructures+Converters.swift:45-46`. Used by `src/lib/spread/native-mirror.ts:254-360` and `src/lib/spread/native.ts:47-53` | `C617.1` | Kept. Covers the plugin's use |
| Disk space | Not found | Searched `volumeAvailableCapacity`, `NSFileSystemFreeSize` across `ios/`: no hits | none | None needed |
| Active keyboard | Not found | Searched `activeInputModes`: no hits (`keyboardType` only, which is not a required-reason API) | none | None needed |

## 2. SDK manifests and what they cover

| SDK | Ships its own manifest? | Required-reason calls found in its iOS sources | Effect on the app manifest |
| --- | --- | --- | --- |
| Capacitor core (`node_modules/@capacitor/ios/Capacitor/Capacitor/PrivacyInfo.xcprivacy`, `.../CapacitorCordova/...`) | Yes. Both declare no accessed API types | None found | None |
| `@capacitor/filesystem` 8.1.4 | No manifest in the package | Yes, file timestamps (above) | Covered by the app's `C617.1` |
| `@capacitor/haptics` 8.0.2 | No manifest in the package | None found | None |
| `@capacitor/share` 8.0.3 | No manifest in the package | None found | None |
| `@capacitor/status-bar` 8.0.4 | No manifest in the package | None found | None |
| `capacitor-swift-pm` 8.5.1 (SPM wrapper) | Not checked further | Not applicable; core manifests above are the ones in `node_modules` | None |

Versions are from each package's `package.json` after `npm ci --ignore-scripts`. The SPM wrapper repository was cloned shallowly and had no manifest of its own; the core manifests under `node_modules/@capacitor/ios` are the ones the app links.

## 3. Usage-related APIs that need no manifest entry

These are not required-reason APIs, so no manifest key is needed. They are listed so reviewers can see each one was checked.

| API | Where | Note |
| --- | --- | --- |
| `UNUserNotificationCenter` (local notifications) | `Focus/SpreadLocalAlerts.swift:12-17` | The system asks for permission at runtime. No Info.plist string is required |
| ActivityKit (Live Activity) | `Focus/SpreadFocusLiveActivityController.swift`, `ios/App/SpreadWidget/SpreadTodayWidget.swift` | `NSSupportsLiveActivities` is `true` (`ios/App/App/Info.plist:24`) |
| `PhotosPicker` (task photos) | `Sheets/TaskSheet.swift:675` | Out-of-process picker. Needs no photo-library permission string |
| CryptoKit `SHA256` | `Sheets/TaskSheet.swift:7,280`; `Life/LifeAttachmentStore.swift:3,22` | Hashing for draft keys and attachments. Relevant to the export answer, see `APP_STORE_PACKAGE.md` |
| `UIFeedbackGenerator` (haptics) | `Theme/SpreadTheme.swift` (`SpreadHaptics`) | Not required-reason. Gated by the in-app "Touch feedback" switch and the system setting |
| WidgetKit and AppIntents | `ios/App/SpreadWidget/*.swift` | Not required-reason |

## 4. Info.plist usage strings and keys

| Key | Value (short) | Status | Action |
| --- | --- | --- | --- |
| `NSCameraUsageDescription` (`ios/App/App/Info.plist:25`) | "Spread uses the camera only when you choose Take Photo ..." | **Describes a feature that does not exist.** No camera code path in the native sources (only `PhotosPicker`); no `type="file"` or `capture` input in `src/`. The preflight requires this key | **Not changed.** Owner decision D1 |
| `NSPhotoLibraryUsageDescription` | absent | Correct: `PhotosPicker` does not need it | None |
| Microphone, location, contacts, calendars, Bluetooth, Face ID | absent | Correct: no such API found | None |
| `ITSAppUsesNonExemptEncryption` (`Info.plist:22`) | `false` | Consistent with the source (standard OS crypto and SHA-256 only). Owner to confirm | Confirm in App Store Connect |
| `NSSupportsLiveActivities` (`Info.plist:24`) | `true` | Matches the Live Activity code | None |
| `UIBackgroundModes` = `remote-notification` (`Info.plist:59`) | present | No remote push is used in the 1.0 code path; the IOS_RELEASE runbook says it is for iCloud sync. Live Activity and widget updates are local | **Owner decision D2** |
| `NSUbiquitousContainers` for `iCloud.com.graymatter.spread` (`Info.plist:26-34`) | present | iCloud is off in 1.0. Declares an iCloud document container | **Owner decision D2** |
| `UIRequiredDeviceCapabilities` = `arm64`, `UISupportedInterfaceOrientations` = portrait and both landscapes (`Info.plist:52-58`) | iPhone | Matches OD20 and the release plan | Test landscape on device |

## 5. Entitlements (not edited)

| File | Key | Status |
| --- | --- | --- |
| `ios/App/App/App.entitlements` | `com.apple.security.application-groups` = `group.com.graymatter.spread` | Shared with the widget. Correct |
| `ios/App/App/App.entitlements` | `com.apple.developer.icloud-container-identifiers`, `icloud-services` (CloudKit, CloudDocuments), `ubiquity-container-identifiers` | Present while iCloud is off. **Owner decision D2.** Off-limits in this work |
| `ios/App/App/App.entitlements` | `aps-environment` = `development` | Codemagic sets `production` for the distributed build (`codemagic.yaml`). Confirm in the signed IPA |
| `ios/App/SpreadWidget/SpreadWidget.entitlements` | App Group only | Correct |

## 6. Gaps and what was changed

| ID | Gap | Result |
| --- | --- | --- |
| P1 | `SystemBootTime` (`35F9.1`) used but not declared | **Fixed** in `ios/App/App/PrivacyInfo.xcprivacy` |
| P2 | `UserDefaults` App Group suite used but only `CA92.1` declared | **Fixed**: `1C8F.1` added (also in the same file) |
| G1 | Widget extension has no `PrivacyInfo.xcprivacy`; it reads App Group defaults (`1C8F.1`) | **Open.** Needs a file in `ios/App/SpreadWidget/` and a resource reference in `ios/App/App.xcodeproj/project.pbxproj`, validated in Xcode. Not done here because it cannot be built or validated in this session |
| C1 | Camera string describes a missing feature | **Open. Owner decision D1** |
| C2 | iCloud keys and the background mode while iCloud is off | **Open. Owner decision D2** |
| C3 | Privacy policy page says iPad and describes a camera action | **Open.** Website content (`public/privacy.html`), outside this PR. See the release record |

## 7. Code confidence

- Confident: the category list for `systemUptime`, the Filesystem timestamp use, the absence of disk-space and keyboard APIs, the absence of camera code, the absence of any network code in the native path (earlier run in `docs/IOS_RELEASE.md`).
- Secondary sources only: the exact reason codes `35F9.1`, `1C8F.1` and `CA92.1`. Apple's own page returned only its title on fetch. Confirm through Xcode's upload validation.
- Not run: `xcodebuild`, `swift test`, the IPA preflight and any App Store Connect validation. Each is "not tested" in the release record.
