[Live site](https://spread-app-teal.vercel.app/) · [GitHub Pages mirror](https://wglewis0721.github.io/spread-app/) · [Design direction](DESIGN.md) · [App Store release plan](APP_STORE_RELEASE_PLAN.md)

# Spread

The weekly role spread. Roles first. Hours second. Tasks last.

Spread is a local-first weekly planner. You name the responsibilities in your life, give each one some hours, put those hours on real days, and only then add the tasks. No account; your planning stays on your device.

## Where it runs

- **Vercel** builds every push to `main` and serves production at [spread-app-teal.vercel.app](https://spread-app-teal.vercel.app/). Branches get preview deployments.
- **GitHub Pages** builds `dist-pages` from `main` with `scripts/export-pages.mjs` and serves [wglewis0721.github.io/spread-app](https://wglewis0721.github.io/spread-app/). Do not edit the compiled files by hand.
- **iPhone/App Store (planned):** package the same proven Vite/React planner with Capacitor. Spread 1.0 stays local-first, requires no account, and is sold as a complete paid App Store app. See [APP_STORE_RELEASE_PLAN.md](APP_STORE_RELEASE_PLAN.md).

Work goes on a branch, through a pull request, into `main`.

## The site

The first screen is the public landing page and the way into the planner. Its design direction is written down in **[DESIGN.md](DESIGN.md)**: warm paper becoming a polished digital product, one focal object per section built from real product parts, the brand board, the type scale, motion rules and guardrails. Read it before changing the landing page.

The short version:

- Palette: paper `#F6F1E7`, ink `#171717`, graphite `#68645D`, Spread blue `#0A84FF`, sage `#DCE6D6`, peach `#F1DFCF`, and the app's own dark surfaces.
- Hero: the app icon's stack of spread cards with tasks orbiting it. Hover or tap deals it into a 2×2 week, and the tasks wait in a tray to be dragged onto their spreads.
- Below it: a week that builds itself step by step, a bento for the week preview, the paper-to-app story, a to-do list beside a spread, privacy facts, and a 168-hour week at the start card.
- Light and dark: the switch in the nav is the planner's own appearance setting. In dark mode the page goes warm near-black and the product cards turn to the app's light look, so they always stand out.

## The planner

```
src/spread/screens        the landing page (UnlockScreen) and the week screen
src/spread/components     crown, task sheet, week view, landing components
src/spread/gestures       swipe, pointer sensors, drop resolution
src/spread/state          store entry
src/lib/spread            week data and actions
src/styles.css            app styles, then the landing block ("Landing page only")
```

Gestures call actions. They do not write week data themselves.

- `changeWeek()`
- `moveSpreadToDay()`
- `moveAllocation()`
- `reorderAllocation()`

A touch holds briefly before a drag. A mouse or pen starts after a short move. A week swipe stays separate and waits while a drag is active.

- Rollover copies this week into next week. The week you leave stays as history. If next week already has tasks or days, Spread asks before replacing it.
- Open a task and add only what you need: Notes, Outline, Table, or Photo. In Notes, a line that starts with I. or A. continues like a Word outline.
- Tap a spread’s color dot to pick another color.
- Week shows Sunday at the top through Monday at the bottom. Turn the crown, or swipe the week, to move.
- The hours on a spread are a bank. The week bubble shows what is left. Adding hours to a day takes from that bank. Taking them off a day puts them back.
- More → Profiles holds up to ten profiles. Each profile has its own spreads and weeks. The open one is marked. Choosing another closes the menu, says which profile opened, and brings that profile’s spreads in.
- More can copy this week as text, save a Word document, or print a plain page you can keep as a PDF. Back Up Spread saves a `.spread` file. Restore Spread shows what is in the file and asks before it replaces the open profile.

Trial key: `SPR-DEMO-2026`

## iOS release direction

The App Store work is a packaging/reliability pass, not a redesign. The selected 1.0 path is **Capacitor + the existing React app**, with device-local data and no required account or SaaS backend. iCloud/CloudKit remains a later sync milestone unless it is deliberately moved into the 1.0 promise.

## Checks

```
npm run typecheck
node --experimental-strip-types --test src/spread/gestures/gestures.test.ts src/lib/spread/hours.test.ts src/lib/spread/share.test.ts src/lib/spread/profiles.test.ts
npm run build
```

The four test files above are what the Pages workflow runs. `npm test` also runs the app-builder scaffolding tests, which expect a `.grok/` folder this repo does not have.

## Golden checkpoints

Goldens are frozen `golden/*` branches. Never change one; branch from it instead.

| Branch | What it holds |
| --- | --- |
| `golden/2026-09-26-production` | production at “Show the days a spread is on” (also tagged `golden-2026-09-26-production`) |
| `golden/2026-09-26-current-spread` | the designed app as first published on the live site |
| `golden/2026-09-26-watch-crown-build` | the watch-crown week, with days that cascade when the week changes |
| `golden/2026-09-27-icon-interaction-build` | the dock gears that turn on press |
| `golden/2026-09-27-friends-test-final` | the friends-test build |
| `golden/2026-09-28-stack-hero-landing` | the landing page with the stack hero, orbit and drag-onto-spread tray |
| `golden/2026-09-28-full-landing-modes` | the full landing page: every section reworked, light/dark modes, DESIGN.md |
| `golden/2026-09-28-app-store` | the App Store gold. Month over the week, bubbles pinned on both, Done while adding, the Spread/Week switcher stays on month, and the four week lines morph into the month boxes. Also tagged `golden-2026-09-28-app-store` |
