# Spread editorial art resources

Place a clean, text-free illustration as `<category>.webp` (or `.png`) in this directory.
The packaged `LifeEditorialArtworkRegistry` resolves the file by category. Use known categories:
`work`, `family`, `fitness`, `school`, `home`, `health`, `business`,
`project`, `church`, `personal`, `custom`.

**Current bundle: `personal.webp` only, a TEMPORARY 539 × 267 px integration asset.**
It is the approved plum Personal composition, text-free, and it is not production-ready.
Before release, replace it with a high-resolution export that keeps the same composition.
Categories without a file (`work`, `family`, `fitness`, `school`, `home`, `health`,
`business`, `project`, `church`, `custom`) keep the original Chalkboard art as a fallback.
No network fetching.

Presentation is behind a reversible gate, `native.life.editorialArt.enabled`, which
defaults to off and keeps the original golden face. To test the editorial face, launch with
`-native.life.editorialArt.enabled YES` or run `defaults write` with the same key.
Rollback: set the gate back to off, or delete `personal.webp`. Neither touches planner data.

Never include printed names, Spread logo, hour totals, weekday labels, progress bars
or interaction controls in raster artwork; SwiftUI layers that live content on top.
Leave approximately the left 55-60% quiet for text, and the bottom 20-25% readable
for the seven-day strip. Export retina-quality wide art and verify cropping at
320-430pt phone widths, iPad and resizable scenes. See the design docs in PR #161.

There is no user data, local storage or migration in this resource folder.
