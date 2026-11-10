# Spread editorial art resources

Place a clean, text-free illustration as `<category>.webp` (or `.png`) in this directory.
The packaged `LifeEditorialArtworkRegistry` resolves the file by category. Use known categories:
`work`, `family`, `fitness`, `school`, `home`, `health`, `business`,
`project`, `church`, `personal`, `custom`.

**No category artwork is bundled yet in this implementation branch.**
Until high-resolution, visually approved clean images are staged, the app uses its
existing native Chalkboard art as a fallback. No network fetching.

Never include printed names, Spread logo, hour totals, weekday labels, progress bars
or interaction controls in raster artwork; SwiftUI layers that live content on top.
Leave approximately the left 55-60% quiet for text, and the bottom 20-25% readable
for the seven-day strip. Export retina-quality wide art and verify cropping at
320-430pt phone widths, iPad and resizable scenes. See the design docs in PR #161.

There is no user data, local storage or migration in this resource folder.
