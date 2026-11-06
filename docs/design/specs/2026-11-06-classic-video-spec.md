# Classic recording: design, motion and UI/UX specification

> Part of the [Spread design brain](../README.md). Companion to the [Life recording spec](2026-11-06-life-video-spec.md) and [shared polish contract](2026-11-06-life-classic-polish.md).
>
> Summary: Classic is the visual and interaction reference. Preserve its colored illustrated cards, physical Crown, compact control hierarchy and readable content grouping while Life keeps its own arrangement.

## Evidence

Recording: `ScreenRecording_11-06-2026 09-15-30_1.mp4`, duration 47.93 seconds.
Reviewed the complete timeline at one-second intervals and a denser 120 ms sequence around 11.40–12.24 s.
Times below are approximate offsets in this recording. App build and iOS version are not shown. Recording cadence does not prove rendered frame rate, touch latency or haptic feel.

Source cross-check: Classic Wallet in `Spread/SpreadSurface.swift`, `SpreadTheme.swift`, original `ChalkMotionArt`, and `WeekCrownView`.
This recording and Life show different planning totals/weeks, so they are not matched-data before/after captures.

## Observed sequence

| Offset | Observed state | Design or interaction significance |
| --- | --- | --- |
| 00:00–00:04 | Control Center, then More and Calendar design selection | System surfaces and app settings must be distinguished from the planner. More appears dark while Light is selected; this also occurs in Life. |
| About 00:05–00:06 | Full month with blue selected date and Crown above content | Month belongs to the same navigation system; selected date is a strong focal cue. |
| About 00:07–00:19 | Cream planning canvas, compact hour summary, overlapping yellow/green/orange/pink cards | Color belongs to the whole card surface as well as its category badge. Original illustrations make the cards recognizable. |
| 00:11.40–00:12.24 | Dense expansion sequence | The stack remains recognizable while space changes vertically. Titles, hour labels and neighboring card identities remain legible. |
| About 00:20–00:27 | A card reveals placement content and task entry | Expanded content has a distinct purpose and a visible next action. The illustration supports the card instead of replacing the content. |
| About 00:28–00:37 | Hour summary opens supporting planning/rollover content, then settles | A compact summary acts as a real disclosure, with content grouped beneath it. |
| About 00:38–00:42 | Crown changes the active week | Navigation has a physical anchor. The date/readout stays associated with the week action. |
| About 00:43–00:47 | Week planning with role chips, free-time controls and separate day groups | Placement suggestions and day content use different shapes and grouping, rather than one uniform panel style. |

## Design specification

| Layer | Reference treatment | Requirement for Life |
| --- | --- | --- |
| Canvas | Warm light ground with dark readable ink | Use the existing shared light/dark semantic tokens. |
| Card | Role-tinted face, bounded edge, soft depth and consistent corners | Reuse Classic's role-driven gradient and border treatment, not a different gray card system. |
| Illustration | Original Chalkboard art at a restrained corner of the card | Reuse the same assets and motion; preserve clear title/hour regions. |
| Summary | Compact elevated hour chip with a visible disclosure cue | Make the Life hour summary look actionable and distinct from the page subtitle. |
| Controls | Metallic Crown, compact pill actions and saturated blue primary action | Keep the same materials, icon family, semantic color and >=44-point targets. |
| Typography | System sans; bold key values, quieter supporting labels | Retain hierarchy and Dynamic Type, without shrinking essential copy. |

Code-calibrated card values: 24-point continuous corners; role overlay alpha 0.48 → 0.16 → clear; role edge alpha 0.48 closed/0.85 active; role shadow alpha 0.09/0.18, radius 8/16, y 4.
These values come from the existing implementation, not pixel measurements of the recording. Contrast and actual native geometry still require verification.

## Motion specification

Classic's source defines a shared timing curve (0.32, 0.72, 0, 1). Reuse its existing tokens: main/focus 420 ms; cascade 320 ms; press 160 ms; week slide 340 ms; opacity fade 280 ms.
The denser recording sequence supports continuous vertical settling as the reference; it does not establish an exact measured animation duration.

Keep card motion rigid, artwork independent of layout, Crown finger tracking continuous and success feedback acknowledgement-driven.
Respect Reduce Motion; retain meaning and operability when movement is removed. Never infer haptic strength or 60 fps from this video.

## UI/UX principles to carry across

- Show clear containment: page, summary, responsibility, details and chrome.
- Give every disclosure a readable cue and every active state a non-color indicator.
- Keep frequently used navigation close to the thumb and stable across destinations.
- Preserve scheduling rules, task entry and recovery; visual refinement must not create a second planner.
- Classic remains the reference arrangement, not a screen to redesign during this work.

## Acceptance

Compare matched native fixtures in both appearances and at large text. Verify card boundaries, artwork visibility, title/hour alignment, focus changes, selected dates, task placement, interrupted transitions and control hit areas.
The dark More sheet under a selected Light option needs a separate appearance-path check; this recording does not identify its cause.
No new candidate's visual, haptic or device acceptance is established by the existing recording.
