# Spread 1.0: App Store screenshot shot list (iPhone)

> Part of the release folder. Index: [README.md](README.md). Package: [APP_STORE_PACKAGE.md](APP_STORE_PACKAGE.md).

> Summary: eight real captures to take from the TestFlight build on an iPhone, each tied to a screen, a state and fictional seeded data. Nothing has been captured yet. No mockups, device-frame composites or simulator art may be presented as screenshots.

**Status: 0 of 8 captured.** Each slot waits for a physical capture that has passed its device-test step.

## 1. Sizes

Sizes come from [../design/platforms/SPREAD_IPHONE_BUILD_GUIDE.md](../design/platforms/SPREAD_IPHONE_BUILD_GUIDE.md) section 8 (researched 2026-10-21). **Re-check them in App Store Connect when you upload**, because Apple updates the list.

| Set | Pixels (portrait) | Requirement (per the guide) |
| --- | --- | --- |
| iPhone, Dynamic Island, medium | 1179 × 2556 or 1206 × 2622 | At least one set is required |
| iPhone, Dynamic Island, large | 1260 × 2736, 1290 × 2796 or 1320 × 2868 | Optional. Scaled from the medium set if absent |

PNG or JPEG, no transparency, 1 to 10 per set. The guide says that if the UI is the same across sizes, the largest set is enough. Capture at the largest size that the test iPhone produces (1290 × 2796 or 1320 × 2868 on a Pro Max-class phone); use a medium-size phone if the owner has only that.

## 2. Capture rules

1. **Build:** the TestFlight build from the candidate commit, a Release build. The planner's preview fixture is compiled only in DEBUG builds (`ios/SpreadNativeV2/Sources/SpreadNativeV2/Planner/LivePlanner.swift:155-156`), so it cannot appear in a Release capture.
2. **Data:** type the seeded data by hand, using the names below. Fictional names only: no real names, places, photos of people or health details.
3. **Appearance:** Light for the first set. Dark is optional and must come from the same build.
4. **Text size:** default. Do not capture at the largest Dynamic Type size for store use.
5. **Status bar and notifications:** clear every notification before capture. Do not show personal items.
6. **No overlays:** no device frames, captions or text added in an editor. If the owner adds marketing text, it is a separate, labelled design file and is not an app screenshot.
7. **Naming:** `1.0-<set>-<nn>-<screen>.png`, for example `1.0-large-01-life.png`. Keep the originals.
8. **Provenance:** record the device, iOS version, build number and the date beside each file in the release record.

## 3. Seeded data (fictional)

| Life area | Weekly hours | Tasks |
| --- | --- | --- |
| Work | 20 | "Client call" (Tue, high priority), "Write summary" (Wed) |
| Family | 6 | "Dinner plan" (Thu) |
| Health | 5 | "Morning walk" (Mon, Wed, Fri) |

Leave one task in **To place**: "Renew passport" (no day).

## 4. The eight captures

| # | Screen and state | Seeded state | Device step that must pass first | Notes |
| --- | --- | --- | --- | --- |
| 01 | **Life** root: three Life area cards and the weekly time strip, with the weekly total visible | Data above; week partly planned | S2.1 to S2.3 | Shows the core promise |
| 02 | **Life** with one card focused, showing **Details** and **Tasks** | "Work" focused | S5.1 to S5.3 | Keep the other cards visible |
| 03 | **Week** view: seven day cards, the **To place** tray with one task, and a red **!** on "Client call" | Data above | S3.1, S3.5, S3.7 | The red ! is shown with its label in the app; the image shows the mark only |
| 04 | **Week** then **Month**: month calendar with dots on days that have hours | Data above, plus one copied week (S4.3) | S4.5 | Dots only; no text overlay |
| 05 | **Plan Ahead** sheet with **Suggested plans** or the **Review before copying** screen | Data above | S4.2, S4.3 | Do not confirm any plan for the capture |
| 06 | **Focus** timer sheet during a session, with **Pause**, **Next step**, **Stop this stretch** and **Cancel session** visible | "Work" block running | S6.1 to S6.5 | Run the timer briefly before capture |
| 07 | Home Screen page with the **Spread Today** widget (medium) and the **Focus** widget (large) | Switches on (S9.2, S9.3) | S8.2, S8.4 | Use a clean Home Screen page; hide other apps' badges |
| 08 | **More** > **Backup and restore** sheet with **Back up Spread** and **Restore and merge** | Data above | S10.1, S10.2 | Do not show a real file name |

Optional, only after S7.1 passes: a Lock Screen capture with the focus Live Activity. Use a clean Lock Screen with no personal notifications.

## 5. What to check before any slot is used

- The capture matches the label on the screen and the step ID. If the app shows different words, recapture after fixing the label, or change the claim in [APP_STORE_PACKAGE.md](APP_STORE_PACKAGE.md) section 4.
- The screen shows only features that passed their device step (see the claim table in the package).
- No text shows iCloud, sync, backup to iCloud, iPad, web planner or waitlist.
- The Health role uses the teal colour from OD21 (`#30B0C7`), not blue. Check that the capture is from the 1.0 build.
- The app icon matches the icon handoff; a person has not yet inspected the final icon (see the release record).

## 6. Status

| # | Captured | Build | Device and iOS | Passes step | File |
| --- | --- | --- | --- | --- | --- |
| 01 | No | | | | |
| 02 | No | | | | |
| 03 | No | | | | |
| 04 | No | | | | |
| 05 | No | | | | |
| 06 | No | | | | |
| 07 | No | | | | |
| 08 | No | | | | |
