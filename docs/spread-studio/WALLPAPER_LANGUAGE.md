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

## Reference pass: rotating gradient stack on black (2026-10-28)

Board is now dark-first (it follows the OS unless the planner theme is explicitly Light or Dark), on a near-black canvas.

- Role cards are saturated vertical gradients from `roleCardPaint` (`contrast.ts`). Ink is white when a modest darkening clears 4.5:1 across the whole gradient, including the white highlight, and near-black on the brighter colors. Every stop is tested in `contrast.test.ts`.
- The stack overlaps so only a rounded strip of each closed card shows. The front card is open.
- The stack turns on its own every 5 seconds: the front card lifts away, the others slide up, the wrapped card rises in at the back (FLIP, Web Animations API). It holds for hidden tabs, Reduce Motion, recent touch, a focused text field, an open sheet or task, editing, and the Pause button.
- Each card carries a small sparkline of that role's hours across the week.
- Not built yet: the fanned layout and sphere dial from Audio Sphere, category tabs, a day-at-a-glance timeline, and a restyled Customize editor.

## Spread tab views and Control Center Settings (2026-10-28)

Studio Board only. With the flag off nothing here renders.

- **Views** (Settings > View): Stack (default, the rotating overlap), Fan (a hand of cards pivoting below the stage, swipe or tap), Dial (arcs sized by hours around a dark sphere, drag, tap or arrow keys, one `slider`), Tabs (All shows the stack, a role tab shows that one spread), Day (a day picker and a vertical timeline of that day's planned hours). Editing always shows the full stack so every spread can be renamed or removed. The choice is a per-device preference in `src/lib/spread/studio/layout-pref.ts`, separate from the appearance contract: it is not synced, backed up or saved with a look.
- **Settings** is a grid of tiles (Profiles, Appearance, View, Share, Backup) like the iOS Control Center. A tile blows up from its own box with a clip-path and a color ease, then the grid folds away so the sheet fits the panel. Back reverses it. Reduce Motion swaps with no animation. Customize stays a single row under the grid.
- **Fixed in the same pass:** the scope's `> *` rule overrode Tailwind's `.fixed` and `.z-*` on the portaled sheet, scrim and dialogs, so on any page taller than the screen the sheet was laid out at the foot of the page, off screen. `.fixed` and the z-index utilities are restored for direct children of the scope.
- **Contrast:** secondary and tertiary ink inside sheets are mixed from the page ink so they clear 4.5:1 on the sheet and on each pastel group. The material audit now cycles every view and opens every Settings tile in both schemes.

## Polish pass: motion, spacing and behavior of the views (2026-10-28)

Studio Board only. The views keep their structure; this pass changes how they look, move and feel.

- **One motion language.** One curve, `cubic-bezier(.32,.72,0,1)` (the iOS emphasized decelerate), in three lengths: 180ms for a press, 380 to 440ms for a swap, 520 to 560ms for a move. Spacing is on an 8pt grid. Every entrance is a `from` only keyframe with `backwards` fill, so nothing stays in effect after it ends (no leftover transform, no new containing block for fixed children). Reduce Motion turns all of it off at the foot of `render.css`.
- **Chrome above the views is one compact card.** The headline and a round Pause icon share a row, the colored bar sits under it, and the done count shares the last row with Rollover and Review. The "swipe, scroll" hint under the title is still announced (visually hidden, as Week already did) but no longer takes a line. The views start about 60pt higher. Pause keeps its accessible names "Pause auto-advance" and "Resume auto-advance".
- **Views enter.** Switching view in Settings plays a short rise and fade on the new view.
- **Fan.** The hand follows the finger. Each card is placed by `--e`, its signed distance from the front in cards, which JavaScript sets to a fraction during a drag, so cards turn, scale and fade continuously. Release settles with the finger's speed (clamped, at most two cards) and rubber bands past two cards. The badge slides to the outer corner by interpolation, the front card's name and hours fade out as it leaves while its neighbours' hours fade in, a page control shows the position, and the hand is dealt in on first show. A click that ends a drag is swallowed so a swipe never also selects.
- **Dial.** 72 ticks around the ring brighten near the knob. The knob is a group that rotates with an unwrapped angle, so it always takes the short way round, and it grows while held. The hours count up to the new figure and use tabular numerals. The sphere glow takes the chosen spread's color through a registered `@property --glow`, so it eases instead of jumping.
- **Tabs.** The chosen tab scrolls to the middle of the row, pops, and the panel slides in from the side the tab lies on. A sliding capsule was tried on paper and dropped: a sibling behind the text cannot be proven by the contrast audit, which reads ancestors.
- **Day.** Each chip fills from the bottom by how busy its day is next to the busiest day of the week. The timeline has a rail with a node in each block's color and an end node. A new day's blocks rise in one after another from the side the day lies on. The head had no gap under the chips; it now has 12px.
- **Haptics.** `src/lib/spread/studio/tick.ts` sends a selection tick when the Dial lands on a spread, the Fan settles, a tab or day is chosen. Native only, silent on the web and under Reduce Motion, lazy plugin import, never an error. This is the one part not exercised in a browser.
- **Not changed:** structure, data, the appearance contract, any file under cloud, sync, backup or schema. Flag off renders exactly the baseline.


## Hand-drawn icons (2026-10-28)

Settings > View > Icons: Default (round badges) or Hand-drawn. Studio Board only, per device (`src/lib/spread/studio/icon-pref.ts`), not synced or part of a saved look. Full spec, method and scorecard: `ICON_SPEC.md`.

- **Glyph tile** (`src/lib/spread/studio/tile.ts`, pure and tested): the app's own category mark on a glossy rounded square whose radius, gradient, tinted shadow and glyph size were measured on the owner's icon board and fitted across five tiles at once.
- **Illustration**: the owner's crayon art for each category (ten plus Custom), cropped from the board at one shared 262 x 182 box, shown on a paper panel. The Fitness art had a Nike-style swoosh, which was inpainted out. A first pass drew the art as vector code; it could not reach the required similarity, so it was replaced.
- Shown on role cards (in place of the sparkline), the Fan's front card and Day blocks. All art is decorative (`alt=""`, `aria-hidden`).
- Revised to the owner's phone mockup: in Hand-drawn mode cards become dark glass with a glowing edge in the spread's color, and the art is the board illustrations converted to chalk on dark (no paper). See ICON_SPEC.md section 6.
- Verified per category against its board cell (paper version): illustrations 0.985 SSIM average (0.971 at in-app size), tiles 96.4% of the reference noise ceiling on average. Family (90.8%) and Business (94.2%) sit just below, and the spec explains why.
