# App Store screenshots from the native Life experience

Manual, reusable capture of 20 states from the real installed app on a Codemagic macOS simulator. Nothing is uploaded, signed, or submitted.

## Run it

1. In Codemagic, run **Spread - iOS App Store screenshots (manual, no upload)** on the branch you want to capture.
2. Download `spread-app-store-screenshots-<build>.zip` from the build artifacts. It contains:
   - `screenshots/<device>/NN-slug.png`: native-resolution PNGs, one per state
   - `manifest.json`: ordered list with category, title, pixel size, SHA-256, and the UI test that produced each image
   - `summary.txt`: captured count, missing states, errors, and warnings
   - `failures/<device>/`: the failure screenshots, when a state did not finish
3. `capture.xcresult.zip` and `xcodebuild.log` are kept for debugging.

A run is green only when all 20 states exist at the expected pixel size and no two states are identical.

## How it works

- **Capture:** `ios/App/SpreadNativeUITests/ScreenshotCaptureUITests.swift` runs 20 independent UI tests. Each one launches the app with the DEBUG-only, read-only `PersonalPreviewFixture`, navigates, and captures as its last step. The fixture is never written to, so the capture does not touch planner data.
- **Export and validation:** `scripts/export_screenshots.py` (standard library only) reads `xcresulttool export attachments` output, checks each PNG header and size, rejects duplicates, and writes the manifest and ZIP. Its tests are `scripts/test_export_screenshots.py`, and they check that the Swift capture names match the Python state table.
- **Workflow:** `spread-ios-screenshots` in `codemagic.yaml`. The release workflows (`spread-ios-upload`, `spread-store-status`) are unchanged.

## Change the device or the state list

- Another simulator: change `SCREENSHOT_DEVICE` and `SCREENSHOT_SIZE` in `codemagic.yaml`. The size must be that screen's native pixel size. The export fails on any other size.
- More devices: add another `--input "LABEL=DIR:WIDTHxHEIGHT"` line to the export step, one per simulator.
- Adding or removing a state: change `STATES` in `scripts/export_screenshots.py` and the matching `test` methods and `capture(...)` names in the Swift file. The parity tests fail if they drift apart.

## Limits to check on the first run

- The simulator screen size in `SCREENSHOT_SIZE` is set from the device specification. Confirm it on the first run; a mismatch fails the export and names the size it found.
- The fixture has one task and six roles. Task-heavy screens show a single task.
- Automated capture proves the app rendered these states; it does not replace a review of the images on a real device before they go into the App Store listing.
