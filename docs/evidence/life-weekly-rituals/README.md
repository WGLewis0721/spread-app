# Life weekly rituals · PR #260 verification

Before baseline is `94f9500494e428246bbad44e48f4a96ad2ada201` on
`feat/life-rituals-core-2026-11-17`. The after build should use the commit
containing this report. Work remains local because the remote feature branch
has automatic Vercel previews. No merge, deployment, or distribution occurred.

## Design and source

The native Life art and navy/cream surfaces anchor all three flows. Spotify
Wrapped informed the single finding per scene and the ability to revisit it.
Apple Music Replay informed the highlight reel. Instagram Stories informed
pause-on-hold and edge taps. The Splice study and the Sara Samir recap concept
informed the full-bleed staging and oversized numbers. Imprint informed the
guided question, progress, and skip pattern.

- [Spotify Wrapped](https://newsroom.spotify.com/2025-12-03/2025-wrapped-user-experience/)
- [Apple Music Replay](https://support.apple.com/en-us/109356)
- [Instagram Stories controls](https://www.churchofengland.org/resources/parishes/communications/digital-support-guides/instagram-how-guide/how-make-most)
- [Splice](https://splice.com/)
- [Sara Samir recap concept](https://dribbble.com/shots/25654058-2024-Wrapped)
- [Imprint onboarding on Refero](https://refero.design/flows/5634)

The three experiences live in
[LifeEngagementSheets.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeEngagementSheets.swift).
The More entry and full-screen handoff live in
[ManageSheets.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/ManageSheets.swift).
The new native journeys are in
[LifeUITests.swift](../../../ios/App/SpreadNativeUITests/LifeUITests.swift).

## Acceptance matrix

| Check | Evidence and result |
| --- | --- |
| TypeScript typecheck, ESLint, design docs, web build | Passed |
| Planner and projection tests | 594 passed, 0 failed |
| Script tests | 347 passed, 0 failed, 4 skipped, 5 marked todo |
| Swift packages on Linux | SpreadNativeV2 150 passed. SpreadCloudCore 45 passed. |
| Swift iOS-target parser | Passed for changed Swift sources and UI test source on Swift 6.0.3 |
| iOS SDK typecheck and unsigned app/widget build | Pending Mac with Xcode |
| Playback, hold/resume, edge and visible navigation, final handoff | UI test added. Pending iPhone simulator execution and physical feel check |
| Week Ahead defaults, explicit saves, rejected drafts, skip, task destination and relaunch | UI test added for keep/back, task ACK, relaunch and skip. Pending simulator run and rejection/placement checks |
| Journey bounded history and totals | Projection suite passed. Native layout, values and empty state pending simulator |
| Widths 390, 820, 1024, 1366 and iPad/Duo safe areas | Pending Xcode layout review |
| Matched light/dark iPhone evidence | Pending simulator captures on the same runtime and fixture |
| Physical iPhone and iPad | Pending thumb reach, scroll fit, hold-to-pause and release, both appearances, VoiceOver, Dynamic Type, Reduce Motion, Reduce Transparency, increased contrast, and offline relaunch. Check keyboard and pointer on iPad. |

## Reproduce the matched iPhone captures

1. Build the baseline and after revision in separate worktrees on the Mac using `npm ci`, `npm run ios:sync`, and the unsigned simulator build in [native-verify.yml](../../../.github/workflows/native-verify.yml). Run the iOS SDK typecheck from [native-typecheck.yml](../../../.github/workflows/native-typecheck.yml) and the `SpreadNativeUITests` scheme on the after build.
2. Use a disposable profile with the same selected week, three Life cards (one with zero activity), a nonzero placement, a finished task, and at least two stored weeks on both builds. Restore or recreate the same profile before each build. Capture in both appearances with the same iPhone model, iOS runtime, text size, and status bar. Freeze the after story via Pause when needed.
3. Pair the opening and highlight, Ahead’s week choice, Hours, Days, Tasks, and finish, and Journey’s totals and history. Capture individual Life-card stories as after-only. Use the app's More entries for both builds. Take the comparison shots before any test adds or changes data. Keep the PNGs with the commit SHA, Xcode and simulator versions, fixture/week, appearance, and capture steps.
4. Export the UI test attachments from the after run for supplemental evidence. Run the full-screen hold check with VoiceOver and Reduce Motion off, then verify manual playback separately with either setting enabled. Record failures, fixes and retest results before changing the verdict.

**Acceptance verdict — pending native verification.** The Linux environment
has no iOS SDK, iPhone simulator, or physical Apple device. The screenshots
and device evidence remain outstanding.
