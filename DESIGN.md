---
version: "spread-landing-2026-09-28"
name: "Spread"
description: "The Spread landing page and brand system. Warm paper becoming a polished digital product. The product model is Responsibilities → Hours → Week → Tasks, and every section shows it with the real product parts rather than marketing UI."
colors:
  paper: "#F6F1E7"
  ink: "#171717"
  graphite: "#68645D"
  blue: "#0A84FF"
  blue-ink: "#0869D4"
  sage: "#DCE6D6"
  peach: "#F1DFCF"
  sheet: "#FFFCF6"
  device: "#0B0B0C"
  device-card: "#1C1C1E"
  role-work: "#34C759"
  role-home: "#FF9500"
  role-health: "#0A84FF"
  role-family: "#AF52DE"
  dark-page: "#141311"
  dark-sheet: "#1E1D1A"
  dark-ink: "#F2EDE3"
  dark-graphite: "#AAA498"
  dark-sage: "#1A211A"
  dark-device: "#F2F2F7 (the app's light appearance)"
typography:
  display:
    fontFamily: "Spread Sans (Inter variable, self-hosted)"
    fontSize: "clamp(2.6rem, 1.2rem + 3.4vw, 4rem)"
    fontWeight: 560
    lineHeight: "1.01"
    letterSpacing: "-0.055em"
  h2:
    fontFamily: "Spread Sans"
    fontSize: "clamp(2.2rem, 1.35rem + 2.9vw, 3.5rem)"
    fontWeight: 560
    lineHeight: "1.04"
    letterSpacing: "-0.045em"
  emphasis:
    fontFamily: "Iowan Old Style, Charter, Georgia (italic)"
    use: "the second clause of a headline, handwriting on paper, quiet captions"
  lede:
    fontFamily: "Spread Sans"
    fontSize: "clamp(1.05rem, 1rem + 0.22vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: "1.6"
  kicker:
    fontFamily: "Spread Sans"
    fontSize: "0.72rem"
    fontWeight: 600
    letterSpacing: "0.14em"
    textTransform: "uppercase"
spacing:
  gutter: "clamp(20px, 5vw, 40px)"
  wrap: "min(1160px, 100% - 2 × gutter)"
  section: "clamp(88px, 7vw + 40px, 150px); 80px on phones"
  nav: "72px (64px ≤ 900px)"
rounded:
  device: "30px (26px on phones)"
  stack-card: "22px (16px on phones)"
  tile: "24px / 20px"
  row: "15–18px"
  control: "12px"
  paper: "2–3px"
  pill: "9999px"
components:
  paper-sheet: "sheet color, ruled lines, a red margin rule, a slight tilt, serif italic handwriting"
  product-card: "device color, 1px #3A3A3D border, inset top highlight, long soft shadow, nested device-card rows"
  role: "a colored dot plus the role name and its hours; the color always means the same role"
  hour-bank: "eight small segments; filled segments take the role color"
  task-chip: "sheet-colored pill with the role dot; the thing that moves"
  tile: "sheet color on paper or sage, 1px line border, soft shadow; holds one fact or one figure"
---

# Spread

This is the design direction for Spread's public site, the one-page landing and entry screen in `src/spread/screens/spread-app.tsx` (`UnlockScreen`). Read it before changing anything on that page. It is written the same way as the DESIGN.md references that shaped it, so any design tool can pick it up as prompt context.

The frozen reference for this direction is `golden/2026-09-28-stack-hero-landing` (hero), extended by the sections pass that followed it.

## Overview

Spread is a weekly planner that starts with time. People name the responsibilities in their life, give each one some hours, put those hours on real days, and only then add tasks. The idea began as a handwritten Sunday plan on paper.

The site tells that story in one direction: **warm paper → polished digital product.** Paper carries the human origin. The dark product card carries the app. Everything else is quiet paper-colored space between them.

The feel is polished but unpretentious, sophisticated but approachable, detailed but intentional: Apple-level restraint and product storytelling, with the clarity of Notion or Evernote, and distinctly Spread.

## Composition

Every section has **one focal object**, and it is always built from real product parts: a spread card, a week, a task, an hour bank, a sheet of paper. Copy sits beside or above it and never competes with it.

| Section | Focal object | What it teaches |
| --- | --- | --- |
| Hero | The app icon's fanned stack of four spread cards, with tasks orbiting it. Hover (or tap) deals the cards into a 2×2 week and pulls the tasks into a tray to drag onto their spreads. | Responsibilities hold tasks. |
| Principle (foot of hero) | The line Responsibilities → Hours → Week → Tasks. | The order. |
| How it works | One week that builds itself as the three steps scroll past: names, then hour banks fill, then hours land on days with a task. | Each step, on the same object. |
| Week band (sage) | A bento: copy, an hours tile (15 of 168, split by role), and the interactive Week preview. Choosing a role in the preview highlights it in the hours tile. | Hours become real days. |
| Story | The handwritten Sunday page and the Spread card side by side. Each handwritten responsibility carries across to its row, one at a time. | Where Spread came from. |
| Philosophy | A to-do list on paper beside the same tasks grouped as a spread. Hovering or tapping a task finds it on the other side. | Why time comes first. |
| Privacy | Four plain facts as small tiles. | No account; it stays on the device. |
| Start | A 168-cell week with the sample's 15 hours placed, beside the real start card. | You have 168 hours. |

The page reads in one direction and does not repeat itself. Copy is the founder's voice and stays as written unless there is a clear reason to change it.

## Colors

The brand board is fixed. Do not add colors to it.

- **Paper `#F6F1E7`**: the page. **Ink `#171717`**: text. **Graphite `#68645D`**: secondary text.
- **Spread blue `#0A84FF`**: brand, focus, the active step. White text on blue uses **`#0869D4`**, one step deeper, so it passes WCAG AA.
- **Sage `#DCE6D6`**: the one tinted band (the week). **Peach `#F1DFCF`**: a warm accent, used sparingly (a highlighter mark, a pill).
- **Device `#0B0B0C` / `#1C1C1E`**: the real app's dark surfaces. This is where the technology lives.
- **Role colors** come from the app's category icons and always mean the same thing: Work green, Home orange, Health blue, Family purple.

There are no gradients except the product's own metal date crown and a soft radial glow behind a focal object.

## Modes

The site has a light/dark switch in the nav, and it **is** the planner's own appearance setting (`theme` in the store, `spread.theme` for visitors without a profile). Pick dark on the site and the planner opens dark. A first visit follows the system setting.

- **Light is the reference.** Everything above describes light mode, and it is what the golden hero looks like.
- **Dark contrasts the product with the page.** The page goes warm near-black (`#141311`), tiles go `#1E1D1A`, text goes `#F2EDE3`. The product cards flip to the app's **light** appearance (`#F2F2F7` card, white rows), so the product always stands apart from the page, the same way the dark cards stand apart from paper in light mode.
- **Paper stays paper** in both modes (`#F1EADC` in dark, fading less as you scroll so it never turns grey).
- Role colors, Spread blue and the button blue do not change.
- Dark mode lives in one override block at the end of `src/styles.css` (`[data-site-theme="dark"]`). New components need their dark values added there.
- Switching modes is a short crossfade where the browser supports view transitions.

## Typography

- **Spread Sans** (Inter variable, self-hosted in `public/fonts`) for everything structural. Headlines use weight 560 with tight tracking.
- **Serif italic** (Iowan Old Style, Charter, Georgia) for the human voice: the second clause of a headline (*what matters.*, *Meet real days.*), handwriting on paper, quiet captions and guide lines.
- One scale, set as tokens at the top of the landing block in `src/styles.css`: display, h2, h2-quiet, h3, lede, body, small, caption, kicker. **Nothing smaller than 11px.**
- Numbers that count hours use tabular figures.
- No mono face. The references suggest one for labels; the brand board does not have one, and the kicker style does that job.

## Layout

- One container (`--wrap`, 1160px max), one gutter, one section rhythm (`--section`).
- Desktop pairs copy with an object. At 900px and below the page becomes one calm column (640px max) and objects keep their full character. Phones get their own sizes, not a squeezed desktop.
- Sticky objects (How it works, Story) are how a section tells a sequence. On phones the How it works week sticks under the nav and the steps scroll beneath it.
- No horizontal page scroll at any width. The hero orbit is allowed past the phone's edge because it is clipped by the page.

## Components

- **Paper sheet**: sheet color, faint blue rules every 32px, a red margin rule, 2–3px radius, a slight tilt, serif italic.
- **Product card**: device color, 1px `#3A3A3D` border, an inset top highlight, a long soft shadow, device-card rows at 15–18px radius. It uses the real app's patterns: date crown, Spread/Week toggle, hour banks, day rows, round checkboxes.
- **Role row**: dot, name, hours (`8h`, with a small `h`).
- **Hour bank**: eight segments; filled ones take the role color.
- **Task chip**: a sheet-colored pill with the role dot. It is the object that moves (orbits, lands, gets dragged).
- **Tile**: sheet color on paper or sage, 1px border, soft shadow, 20–24px radius. One fact or one figure per tile.
- **Buttons**: pill, blue `#0869D4` with white text; the secondary action is a text link with a chevron that nudges on hover.

Buttons, cards, chips and tiles share one radius and border language.

## Motion

Motion explains paper becoming product, and nothing else.

- Easing: `--ease-out` `cubic-bezier(.2,.7,.2,1)` for arrivals; `--ease-spring` `cubic-bezier(.22,1.2,.36,1)` for cards settling.
- **Hero load**: the headline rises line by line, then the stack deals itself out of a fan.
- **Hero orbit**: script-driven. The ellipse is measured from the fanned cards and re-fitted every 2s (eased, never snapped). Tasks pass behind the stack on the far arc and in front only where they clear every card, so a task never crosses a card. On phones the orbit is wider than the screen. Every ~4s a task on the near arc lands on its card, which lifts out of the pile to catch it.
- **How it works**: the active step is the last one past the reading line (middle of the screen; lower on phones). It is read from scroll position, so a fast fling cannot skip a step.
- **Story**: about 7 seconds, and slow on purpose. The page is written, Spread opens beside it, then each handwritten responsibility gets a blue mark as its row slides into Spread, about 1.1s apart. It starts once the object is 60% in view.
- **Sections**: rise in on scroll where `animation-timeline: view()` is supported; otherwise they are simply present.
- **Hover**: a small lift on tiles, a nudge on link chevrons, and the hero spread.
- **Reduced motion**: no orbit, no scroll effects. The fan, paper, week and grids show in their finished state, and the hero tray still works.

## Guardrails

- Do not deviate from the brand board. No new colors, fonts or decorative styles.
- No generic SaaS decoration: no gradient meshes, glassmorphism, floating blobs, fake dashboards or stock imagery.
- Do not flatten sections into a generic card grid. One focal object per section, made of product parts.
- Show the real product, and keep sample data clearly illustrative. Landing components never read or write a visitor's planner.
- Do not change planner behavior, local-first storage, profiles, licensing or any `golden/*` branch from landing work.
- Keep copy in the founder's voice.
- Test every change at 1440, 820 and 390 wide, in both modes, with reduced motion on, and on a real phone for anything that moves.

## Files

```
src/spread/screens/spread-app.tsx          UnlockScreen: the landing page and start card
src/spread/components/landing-stack.tsx    hero stack, orbit, drag-to-place tray
src/spread/components/landing-sections.tsx How it works builder, week band, versus, privacy facts, 168-hour grid
src/spread/components/landing-preview.tsx  paper → product (Story) and the interactive Week preview
src/styles.css                             landing tokens and styles, after "Landing page only"
public/fonts/inter-latin.woff2             Spread Sans
```

## Process

This direction was built in passes: a foundation pass, a refinement pass, a hero pass and a sections pass. Each was checked against three reference design systems used for **process, not look**: [Connect Your Ecosystem](https://www.aura.build/design-systems/connect-your-ecosystem), [Aura: Fluid Drag Interactions](https://www.aura.build/design-systems/aura-fluid-drag-interactions) and [OmniStack: Global Infrastructure](https://www.aura.build/design-systems/omnistack-global-infrastructure). What was taken from them:

- the first viewport has one focal object (the stack that deals into a grid comes from OmniStack's hero)
- objects you can move and arrange (Aura's drag interactions, as tasks placed onto spreads)
- bento tiles with one figure each and nested surfaces
- masked reveals, staggered entrance, hover lift and scroll-triggered transitions, kept restrained
- one radius and border language across buttons, cards and badges

Their palettes, fonts and content were not used.
