# Spread Studio: Wallpaper -> Design Language (2026-10-27)

Reference: user-provided `1Spread-Demo-Bundle.zip`, notably `END_STATE.md`,
`CHATGPT_BRIEF.md`, and board `E1-Week.png`. This file records the implemented
product behavior without claiming that the reference art or placeholder Swift
Foundation Models code is in the shipped application.

## Working Studio implementation (feature-flagged)

1. Import the wallpaper with the existing on-device image store (max source
   bytes/pixels and bounded derivative remain unchanged).
2. On the device, analyze a bounded canvas raster: deterministic eight-cluster
   CIELAB palette, Sobel edge density, and the least-busy seven of twenty
   horizontal bands. The band heuristic **does not identify people/characters**.
3. Select a bounded, editable layout/material/type recipe and derive a
   contrast-guarded palette using the existing Studio WCAG resolver.
4. Show measured swatches and the approximate quiet vertical interval. The
   interface changes in draft preview and only persists after **Apply**.
   **Match wallpaper** recomputes a proposal from the local asset.
5. When a stored wallpaper is visible on Week, retain one fixed wallpaper
   behind a solid compact crown/toggle header and the three-position Week sheet.
   Tap or drag its grabber between **Peek**, **Half** and **Full**. The existing
   weekly planner, role colors, day ordering, task buttons and DnD handlers are
   unmodified. Full uses native CSS scrolling and keeps dock clearance.
6. The original no-wallpaper planner and `VITE_SPREAD_STUDIO=0` remain the
   rollback baseline. No auth, upload, cloud or new API is added.

## Deliberately not claimed or shipped

- Recognition of an image's subject/face, semantic saliency, precise camera
  focal-point tracking, model-driven proposals or downloaded typography.
- Native Apple Foundation Models, widget/Live Activity/icon variants, and
  `.spreadtheme` export from the reference demo.
- A velocity-following live drag animation between detents: gesture release
  snaps to the nearest direction; a tap also cycles positions.
- TestFlight/App Store release or physical device certification.

## Gates

- `npm run test:spread`, typecheck, lint, Playwright visual/contrast tests,
  Swift core and iOS simulator checks.
- Browser assert real Half/Full/Peek positions, last day above dock, and
  explicit `prefers-reduced-motion` behavior.
- Follow up separately with physical iPhone safe-area, VoiceOver, scrolling
  and gesture collision assessment before shipping to the App Store.

Keep the rules in `docs/design/SPREAD_DESIGN_SYSTEM.md`; this document
explains the Studio-only exception, not a replacement design system.

## Material skin derived from the wallpaper (2026-10-27)

`StudioAppearanceV1` gained an optional `skin` and `palette.sheet`. Nothing in it names a
wallpaper or a bundled look. `languageFromPixels` derives every value from the image:

| Field | Derived from |
| --- | --- |
| `palette.sheet` | a quiet, light swatch (luminance near 0.58, low saturation); none for dark art |
| `palette.text` | the darkest swatch, forced to 7:1 on cards and 4.5:1 on the sheet |
| `palette.highlight` | the brightest saturated swatch (fills such as the Crown readout and chips) |
| `skin.outline` / `hardShadow` | strong-edge density (`lineDensity`): 0, 1, 2 or 3 px; soft photos get 0 |
| `skin.sheetEdge` | scallop only at outline 3, otherwise round |
| `skin.checkGlyph` | star only for colorful, outlined art |
| `skin.focusY` | center of the busiest seven-band window (texture heuristic, not subject detection) |

Week sheet: one `--studio-sheet-top` variable drives the sheet and the wallpaper layer, so the
art re-centers in the strip above the sheet at Peek, Half and while dragging. Detent tops follow
the end-state proportions (79%, 47%, header bottom + 6 px). The grabber is a vertical slider
(Arrow, Home, End) and the sheet follows the finger with rubber banding and velocity settle.

Display type: Erica One is bundled locally (`src/spread/fonts`, SIL OFL) and used for the
`Today` heading only when the derived look selects the display typeface. `render.test.ts` allows
exactly that one local face and still rejects any other `@font-face` or remote font URL.
