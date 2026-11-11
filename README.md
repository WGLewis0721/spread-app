[Live site](https://thespreadapp.com/) · [Documentation](docs/README.md) · [Design system](docs/design/README.md) · [Release plan](APP_STORE_RELEASE_PLAN.md)

# Spread

Spread is a local-first weekly planner: **Responsibilities → Hours → Week → Tasks**. The existing planner store remains authoritative across the React web UI and native iOS presentation.

**Current source baseline (November 7, 2026):** `main` includes the native SwiftUI/WebKit foundation (#114), Wallet-style card work (#127), Life implementation (#146), tactile precision (#150), and subsequent Life polish through #158. These are merged *source changes*, not proof that a particular signed iOS binary or physical-device acceptance has passed. Verify candidate-specific evidence before any release claim.

**Start here:** [documentation map](docs/README.md) · [current design](docs/design/README.md) · [native acceptance evidence](docs/evidence/life-ios-implementation/acceptance.md) · [iOS runbook](docs/IOS_RELEASE.md). The older [Life handoff](docs/life-ios/SPREAD_LIFE_IOS_HANDOFF.md), [spec](docs/life-ios/SPREAD_LIFE_IOS_SPEC.md), and [checklist](docs/life-ios/SPREAD_LIFE_IOS_CHECKLIST.md) are implementation provenance, **not instructions to re-run an already merged PR**.

The weekly role spread. Roles first. Hours second. Tasks last.

Spread is a local-first weekly planner. You name the responsibilities in your life, give each one some hours, put those hours on real days, and only then add the tasks. No account; your planning stays on your device.

## Where it runs

- **Vercel** builds every push to `main` and serves production at [thespreadapp.com](https://thespreadapp.com/). The previous `spread-app-teal.vercel.app` address remains an alternate production hostname. Branches get preview deployments.
- **GitHub Pages** builds `dist-pages` from `main` with `scripts/export-pages.mjs` and serves [wglewis0721.github.io/spread-app](https://wglewis0721.github.io/spread-app/). Do not edit the compiled files by hand.
- **iPhone/iPad:** Capacitor with native SwiftUI/Classic/Life work committed to `main`. Build, signing, App Store status, supported-device claims, and hardware acceptance must be checked against the exact candidate; consult the [release plan](APP_STORE_RELEASE_PLAN.md) and [runbook](docs/IOS_RELEASE.md).

Work goes on a branch, through a pull request, into `main`.

## Native implementation and verification

Earlier November 3 native acceptance notes describe an **older candidate**, not today's repository head. PRs [#114](https://github.com/WGLewis0721/spread-app/pull/114), [#127](https://github.com/WGLewis0721/spread-app/pull/127), [#146](https://github.com/WGLewis0721/spread-app/pull/146), [#150](https://github.com/WGLewis0721/spread-app/pull/150) and [#158](https://github.com/WGLewis0721/spread-app/pull/158) are merged. The [Life evidence ledger](docs/evidence/life-ios-implementation/acceptance.md) and [tactile evidence](docs/evidence/tactile-precision/README.md) record what was demonstrated **on their recorded SHAs**, including unverified physical-device gates. Do not carry historical NO-GO or success statements forward as a current App Store Connect status.

Classic, More/Settings, the existing planner data model, and saved profiles must remain intact. Treat the frozen `golden/*` branches as rollback checkpoints.

## Launch videos

The [standalone launch-video workspace](tools/launch-video/README.md) preserves the approved version 7 Hallie film and a Grady male companion. It includes two editable Remotion compositions, source recordings, local assets, verified MP4s and reproducible build commands. Its dependencies and output are separate from the planner.

## The site

The first screen is the public landing page and the way into the planner. Its design direction is written down in **[docs/design/landing/DESIGN.md](docs/design/landing/DESIGN.md)**: warm paper becoming a polished digital product, one focal object per section built from real product parts, the brand board, the type scale, motion rules and guardrails. Read it before changing the landing page.

The short version:

- Palette: paper `#F6F1E7`, ink `#171717`, graphite `#68645D`, Spread blue `#0A84FF`, sage `#DCE6D6`, peach `#F1DFCF`, and the app's own dark surfaces.
- Hero: the app icon's stack of spread cards with tasks orbiting it. Hover or tap deals it into a 2×2 week, and the tasks wait in a tray to be dragged onto their spreads.
- Below it: a week that builds itself step by step, a bento for the week preview, the paper-to-app story, a to-do list beside a spread, privacy facts, and a 168-hour week at the start card.
- Light and dark: the switch in the nav is the planner's own appearance setting. In dark mode the page goes warm near-black and the product cards turn to the app's light look, so they always stand out.

## Beta waitlist

`POST /api/waitlist` stores beta signups in a Google Sheet. It is server-only and separate from the local-first planner. See [docs/WAITLIST_API.md](docs/WAITLIST_API.md).

## The planner

```
src/spread/screens        the landing page (UnlockScreen) and the week screen
src/spread/components     crown, task sheet, week view, landing components
src/spread/gestures       swipe, pointer sensors, drop resolution
src/spread/state          store entry
src/lib/spread            week data and actions
src/styles.css            app styles, then the landing block ("Landing page only")
```

All design guidance (planner rules, landing page, iPhone/iPad/Duo, icons) is mapped in [docs/design/README.md](docs/design/README.md). Planner UI rules: [docs/design/planner/SPREAD_DESIGN_SYSTEM.md](docs/design/planner/SPREAD_DESIGN_SYSTEM.md).

Gestures call actions. They do not write week data themselves.

- `changeWeek()`
- `moveSpreadToDay()`
- `moveAllocation()`
- `reorderAllocation()`
- `assignTask()` (put a task on a day of its own role, or take it off)
- `undoable()` and `undoEdit()` (one reversible change to the open week)
- `carryOver()` (move chosen open tasks to next week)

A touch holds briefly before a drag. A mouse or pen starts after a short move. A week swipe stays separate and waits while a drag is active.

- Tasks can be placed on a day. In Week, **To place** lists open tasks with no day, grouped by role; drag one onto its role on a day, or tap **Place** and pick the day. A task on today shows **Not today** in Spread, which puts it back. Drags, placements and Not today offer **Undo** for six seconds (the latest change only).
- **Free time** in Week suggests up to three roles that still have hours not on a day, each on the lightest day ahead. Nothing is added until you tap one.
- **Review open tasks** moves the tasks you pick to next week, keeping them as they are. It does not touch next week's own tasks and is safe to repeat.
- Spread reopens on the view (Spread or Week, week or month) you left, per profile.
- Rollover copies this week into next week. The week you leave stays as history. If next week already has tasks or days, Spread asks before replacing it.
- Open a task and add only what you need: Notes, Outline, Table, or Photo. In Notes, a line that starts with I. or A. continues like a Word outline.
- Tap a spread’s color dot to pick another color.
- Week shows Sunday at the top through Monday at the bottom. Turn the crown, or swipe the week, to move.
- The hours on a spread are a bank. The week bubble shows what is left. Adding hours to a day takes from that bank. Taking them off a day puts them back.
- More → Profiles holds up to ten profiles. Each profile has its own spreads and weeks. The open one is marked. Choosing another closes the menu, says which profile opened, and brings that profile’s spreads in.
- More can copy this week as text, save a Word document, or print a plain page you can keep as a PDF. Back Up Spread saves a `.spread` file. Restore Spread shows what is in the file and asks before it replaces the open profile.

The web planner is a private beta: only emails approved in the beta Sheet can create an account or sign in. See [docs/BETA_ACCESS.md](docs/BETA_ACCESS.md). The installed iPhone app has no sign-in.

## iOS release direction

The selected architecture is Capacitor around the existing React data model, with native presentation where implemented, local-first behavior, and no mandatory account. The original [release plan](APP_STORE_RELEASE_PLAN.md) and [iCloud plan](docs/ICLOUD_PLAN.md) describe approved goals and safety gates; they do **not** establish which features are in a currently distributed IPA. Verify cloud flags, signed build, device support, App Store Connect state, and hardware QA against the exact candidate using [the iOS runbook](docs/IOS_RELEASE.md) and [App Review checklist](docs/APP_STORE_REVIEW_CHECKLIST.md).

## Checks

```
npm run typecheck
npm run lint
npm run test:spread
node --experimental-strip-types --test src/spread/gestures/gestures.test.ts src/lib/spread/hours.test.ts src/lib/spread/share.test.ts src/lib/spread/profiles.test.ts
npm run build
```

`npm run test:spread` is the whole planner suite, including the iOS storage snapshot, backup, merge and sync simulation tests. Swift: `swift test --package-path ios/App/SpreadCloudCore`. The iCloud features are off unless built with `VITE_SPREAD_CLOUD_BACKUP=1` / `VITE_SPREAD_CLOUD_SYNC=1`; see `docs/IOS_RELEASE.md`. The four test files above are what the Pages workflow runs. `npm test` also runs the app-builder scaffolding tests, which expect a `.grok/` folder this repo does not have.

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
