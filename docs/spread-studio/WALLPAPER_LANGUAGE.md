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

## Apple material rebuild (2026-10-28)

Supersedes the 2026-10-27 "material skin" (outline, hard shadow, scalloped edge, star glyph,
Erica One). A wallpaper now decides four things and nothing else. Layout, type, shapes and
controls never vary with the image.

| Output | Derived from |
| --- | --- |
| `palette` (tint, quiet `sheet`, ink, accent) | Lab k-means swatches; ink forced to 7:1 on cards and 4.5:1 on the sheet |
| `wallpaper.dim` (0 to 0.35) | mean luminance; none for dark art, the full 35% for bright art |
| `material` thickness (thin, regular, thick) | strong-edge density; busier art gets thicker (more opaque) material |
| `wallpaper.focusY` | center of the busiest seven-band window (texture heuristic, not subject detection) |

Layers, as in iOS: wallpaper, then the functional layer (header, Week sheet, dock) as
translucent material with a hairline, then content (cards, rows) as plain opaque surfaces with
no blur. The sheet floats inset with a 1.75rem corner at Peek and Half and goes flush and more
opaque at Full (`--studio-sheet-panel`, `--studio-sheet-panel-full`). Reduce Transparency makes
the sheet and header opaque. Increase Contrast strengthens the hairline.

`clampTransparency` guarantees ink stays at or above the contrast floor against the worst-case
backdrop, so a thin material over bright art is clamped rather than trusted.

Legacy drafts: a stored `skin` block is tolerated. Only its `focusY` survives, moved to
`wallpaper.focusY`; the rest is dropped. Any other unknown field is still rejected.

Week sheet: one `--studio-sheet-top` variable drives the sheet and the wallpaper layer, so the
art re-centers in the strip above the sheet at Peek, Half and while dragging. Detent tops follow
the end-state proportions (79%, 47%, header bottom + 6 px). The grabber is a vertical slider
(Arrow, Home, End) and the sheet follows the finger with rubber banding and velocity settle.

Typography is system type only. `render.test.ts` rejects any `@font-face` or remote font URL.

Known limits: CSS `backdrop-filter` approximates system material. Whether
`prefers-reduced-transparency` reaches the WKWebView is unverified. Blur performance, VoiceOver
and haptics are owed on a real iPhone.

## Stacked cards (2026-10-28, design board)

Studio's wallpaper look now uses the stacked-card pattern from the owner's design board (the
My Habits and Analytics stacks), which also echoes the Spread logo, a fan of cards.

- Spread tab: each responsibility is a card in its own role color, overlapping the previous one
  so only a rounded title edge shows. One card is open at a time (the app's grid-row fold, with a
  spring curve), and the open card advances every 7 seconds like a slow vertical carousel.
- Auto-advance stops for Reduce Motion, a hidden tab, an open sheet, editing, focus inside the
  stack, any touch in the last 15 seconds, and a visible Pause button (WCAG 2.2.2).
- Week sheet: role chips, free-time suggestions and scheduled role rows use the same role colors.
  Day cards stay neutral and today gets an accent hairline and a leading bar (a tint lowered ink contrast on dark palettes), as in the board's Schedule layout.
- Color safety: `roleCardInks` (contrast.ts) computes ink, secondary and tertiary text for each
  role color and forces 4.5:1. Cards re-point the app's own `--ink`, `--secondary`, `--tertiary`,
  `--line`, `--fill` and `--accent`, so children need no per-element overrides.
- Motion: cards are dealt in from below with a stagger and press down to 98.5%. Reduce Motion
  removes the deal, the press and the fold transition.
- Guards in `material.audit.ts`: Spread tab text contrast, exactly one open card, advance and
  Pause behavior.


## Month and day rail (2026-10-28, design board)

Same rules as the stacked cards: only in a wallpaper look, only through computed ink, never in flag-off output.

- **Month view.** A day with scheduled roles is a card in its first role's color (`roleVars`, ink from `roleCardInks`), empty days are plain opaque cards with a hairline, no blur. Today keeps the accent disc. The grid wrapper is transparent so the day cards are not a box inside a box. Cards are dealt in with a 14 ms stagger (320 ms each). Reduce Motion removes the deal and the press.
- **Day rail (Week sheet).** A row of seven tall day pills (Mon to Sun) above the day cards. Today is the accent, each pill shows a dot per scheduled role, and a tap scrolls to that day card (smooth, or instant under Reduce Motion). It is a plain navigation group labelled "Jump to a day".
- **Gating.** `MonthView` gets `studio` and `WeeklyView` gets `dayRail` from the `stackOn` state that `StudioStackProbe` reports, so with the flag off or no wallpaper the DOM is unchanged.
- **Not done.** The More sheet is a portal outside the Studio scope, so Settings still uses the system look. Theming it needs a scope on the portal, which is its own change.

## Board is the Studio default (2026-10-28)

The Studio build no longer shows the shipped look until a wallpaper is applied. With `VITE_SPREAD_STUDIO` on and nothing saved, the planner renders **Board**: warm paper canvas, rounded type (`ui-rounded`), ink dock, role-colored stacked cards, colored Month, day rail, pastel sheet groups. Flag off is unchanged and is the revert path.

- **Appearance.** `boardStudioAppearance()` in `presets.ts` (id `studio-board`, also the first starter). `resolveStudioScope` returns `board: true` for it and for any wallpaper look. The scope sets `data-studio-board="on"`; every board rule in `render.css` is gated on that attribute (it replaced `data-studio-wallpaper="on"`, which is still set when an image is present).
- **Dark.** Board is authored in light. `withBoardScheme` swaps in a warm-charcoal palette for dark because contrast correction alone turned the dark ink into a mid gray, and the canvas goes darker than the cards.
- **Header.** The metal Crown is a large title with two round arrow buttons. The wheel still takes drag, scroll and arrow keys. Over a wallpaper the title gets its own thin material.
- **Dock.** An ink pill with paper icons. Labelled controls (Edit, Done) are paper pills with ink text.
- **Sheets.** More and Task portal into the scope element (`useStudioPortal`) so they receive the same variables. Groups are pastel by kind (status sage, lists butter, actions peach, other sky); dark uses deep mixes of the same colors.
- **Revert.** Saving "Original" in the editor also shows Board, because the shipped look is what a build without the flag renders.
