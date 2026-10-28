# Pack: changing the landing page

> Part of the Spread design brain. Start at [../README.md](../README.md). Tier 2 pack: a digest, not the source. The rules card applies on top.

**Use when:** you touch `UnlockScreen` in `src/spread/screens/spread-app.tsx`, the `landing-*` components, or the "Landing page only" block of `src/styles.css`. For planner screens use [planner-change.md](planner-change.md). Never use landing rules for planner decisions.

## Facts to work from

**Direction:** warm paper becoming a polished digital product. Paper carries the human origin (the handwritten Sunday plan); the dark product card carries the app. Frozen reference: `golden/2026-09-28-full-landing-modes` (hero alone: `golden/2026-09-28-stack-hero-landing`). Never modify a `golden/*` branch; branch from it.

**Composition:** every section has one focal object built from real product parts (a spread card, a week, a task, an hour bank, a sheet of paper). Copy sits beside or above it and never competes. Order: Hero (fanned stack of four spread cards, tasks orbit it), Principle line (Responsibilities → Hours → Week → Tasks), How it works (one week that builds itself), Week band (sage bento with an interactive preview), Story (handwritten page beside the Spread card), Philosophy (to-do list beside the same tasks grouped), Privacy (four fact tiles), Start (168-cell week beside the start card). The page reads in one direction and does not repeat itself.

**Brand board (fixed, add nothing):** Paper `#F6F1E7` page; Ink `#171717` text; Graphite `#68645D` secondary; Spread blue `#0A84FF` brand and focus; blue-ink `#0869D4` behind white text (AA); Sage `#DCE6D6` the one tinted band; Peach `#F1DFCF` sparing accent; Sheet `#FFFCF6`; Device `#0B0B0C` and `#1C1C1E`. Role colors (Work green `#34C759`, Home orange `#FF9500`, Health blue `#0A84FF`, Family purple `#AF52DE`) always mean the same role. No gradients except the product's metal date crown and a soft radial glow behind a focal object.

**Type:** Spread Sans (Inter variable, self-hosted `public/fonts/inter-latin.woff2`), headlines weight 560 with tight tracking. Serif italic (Iowan Old Style, Charter, Georgia) for the human voice only: the second clause of a headline, handwriting, quiet captions. One scale set as tokens at the top of the landing block. Nothing under 11 px. Tabular figures for hours. No mono face.

**Layout:** one container (`--wrap`, 1160 px max), one gutter, one section rhythm (`--section`). At 900 px and below, one calm column (640 px max); phones get their own sizes. No horizontal page scroll (the hero orbit may pass the edge because the page clips it).

**Components:** paper sheet (sheet color, faint blue rules every 32 px, red margin rule, 2 to 3 px radius, slight tilt); product card (device color, 1 px `#3A3A3D` border, inset top highlight, long soft shadow, real app patterns); role row; hour bank (eight segments); task chip (the object that moves); tile (one fact or figure); pill buttons in blue-ink with white text, secondary action a text link with a chevron. Buttons, cards, chips and tiles share one radius and border language.

**Motion explains paper becoming product, and nothing else.** Easings `--ease-out` and `--ease-spring`. Hero deals out of a fan; the orbit is script-driven and a task never crosses a card; How it works reads the step from scroll position; Story is about 7 seconds, slow on purpose, starts at 60% in view; sections rise in only where `animation-timeline: view()` is supported. Reduced motion: no orbit, no scroll effects, finished states shown, the hero tray still works.

**Modes:** the nav switch is the planner's own appearance setting. Light is the reference. Dark: page `#141311`, tiles `#1E1D1A`, text `#F2EDE3`, product cards flip to the app's light look (`#F2F2F7`), paper stays paper. All dark values live in one block at the end of `src/styles.css` (`[data-site-theme="dark"]`); any new component needs its dark values added there.

## Guardrails
- No new colors, fonts or decorative styles. No gradient meshes, glassmorphism, floating blobs, fake dashboards or stock imagery.
- Do not flatten sections into a generic card grid.
- Show the real product; sample data is clearly illustrative; landing components never read or write a visitor's planner.
- Do not change planner behavior, local-first storage, profiles, licensing or backups from landing work.
- Keep copy in the founder's voice unless there is a clear reason.

## Checklist
- [ ] One focal object per section, made of product parts.
- [ ] Only brand-board colors and the type scale; dark values added.
- [ ] 1440, 820 and 390 wide, light and dark, reduced motion; a real phone for anything that moves.
- [ ] For the hero: no orbiting task draws over a card; tap, tray, drag works on a phone-sized touch screen.

## Read deeper only if needed
- `landing/DESIGN.md#Composition`: what each section teaches.
- `landing/DESIGN.md#Motion`: exact timings and the orbit rules.
- `landing/DESIGN.md#Modes`: dark mode details.
- `landing/DESIGN.md#Files`: which file holds what.
