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
