# Native visual correction: real simulator captures (PR #119, 2026-11-04)

These are real iOS Simulator screenshots of the SwiftUI app built from head `16382e5` by the
[Native visual tour](../../../../../.github/workflows/native-visual-tour.yml) workflow (run 41751778640), taken by
`VisualTourUITests` in `ios/App/SpreadNativeUITests/PlannerUITests.swift`. They are contact sheets: each panel is one capture.

| File | Device | Appearance | Shows |
| --- | --- | --- | --- |
| `iphone-light-1-spread-stack-fan.jpg` | iPhone, 393 pt | **light** | Spread (Stack, open card with tasks, Fan) |
| `iphone-light-2-dial-tabs-day.jpg` | iPhone, 393 pt | **light** | Dial, Tabs, Day |
| `iphone-light-3-week-month.jpg` | iPhone, 393 pt | **light** | Week with Free time and To place, Week scrolled, Month |
| `iphone-4-more-task-largetext.jpg` | iPhone, 393 pt | **light** | More sheet, Task sheet, Spread at an accessibility text size |
| `ipad-820-light-spread-week-month.jpg` | iPad Air, 820 pt | **light** | Spread, Week (two-column days), Month |

## Read this before relying on them

1. **Every capture is in light appearance. There is no dark-mode screenshot.** The tour asked for dark with the launch
   argument `-AppleInterfaceStyle Dark`, which this iOS version ignores, so the captures named `tour-dark-*` are light too
   (measured: canvas luminance about 240 of 255 in all 28 images per device). Dark, the owner's primary target, has been
   verified only by contrast arithmetic on the tokens, never by looking at it. The panel titled "Large text" is the
   `dark-large-text` capture and is also light.
2. **No BEFORE captures exist.** The BEFORE job failed to compile: it swaps in the old `SpreadNativeV2` sources but kept the
   new host-app file that calls `Spread.canvasUIColor`. That is a workflow defect, not a product one.
3. **The owner's reference images are not in the repository** and could not be viewed. Nothing here is compared with them.
   The only references used were the brand board and the SVG specimen.
4. Seeded data: the tour adds the two Work tasks twice, so "Plan the week" and "Review the budget" appear twice. That is the
   tour, not the app.
5. iPhone width is 393 pt (the simulator model), not 390 pt.

## Defects visible in these captures (not fixed in this PR)

- At the accessibility text size the layout switcher wraps mid-word ("Stac|k", "Tab|s").
- Empty day cards in Week keep a tall blank area under the day name (the owner's earlier complaint about empty space).
- Week and Day list days newest to oldest (Sunday at the top, Monday last). Whether that matches the original app is not
  verified, because the original screenshots could not be viewed.
- The Crown's ribs read as hard barcode stripes at 3x; the brand board asks for no moire.
- The floating dock covers the last rows of a long list until you scroll.
- The tour could not reach the New Spread sheet (note `missing: new-spread`), so that sheet has no capture.
