# Actual native simulator screens — final PR #114 head

Source commit: `b5a3eaf19283dab1c3127e654390fb5ec36309dc`, merged in main `6aa2355`. [Run 41704798803](https://github.com/WGLewis0721/spread-app/actions/runs/41704798803), passing job `126157136330`, artifact `13264729125` (`native-layout-820`). Test: `PlannerUITests/testLayout820()`. The test asserts the native content frame is 820 points wide.

These are unmodified XCUITest screenshots of the actual installed SwiftUI app and live engine's default plan. The original [attachment manifest](manifest.json) preserves capture timestamps and source filenames. Readable names below correspond to the manifest's `viewport-820-*` attachments.

| Screen | Screenshot |
| --- | --- |
| Week / metallic Crown | [Week](820-week.png) |
| Stack | [Stack](820-stack.png) |
| Fan | [Fan](820-fan.png) |
| Dial | [Dial](820-dial.png) |
| Tabs | [Tabs](820-tabs.png) |
| Day | [Day](820-day.png) |
| Month inside Week | [Month](820-month.png) |

The automated 820- and 1024-point jobs passed. The same run's **390-point job failed** the initial Week clipped-text audit. This is not a complete layout-matrix pass or evidence of all ten user journeys. Fan and Month were visually inspected: Fan's front card is opaque; Month includes dates 1–30, but horizontal date spacing appears uneven and needs investigation. A passing accessibility audit does not establish visual polish. No physical-device timing or accessibility measurements are implied.
