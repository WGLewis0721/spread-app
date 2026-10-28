# Spread: project instructions

These apply to any agent or tool working in this repository, alongside `AGENTS.md`.

## Before you change anything

- Read `README.md` for how the planner works and where it deploys.
- Read `APP_STORE_RELEASE_PLAN.md` before any iOS packaging, TestFlight, App Store, native storage/share, pricing, or CloudKit work. It fixes the 1.0 direction as Capacitor + the existing React app, local-first, no account required, paid-app commerce. For iCloud backup/sync, migrations, attachments, iPad and the related release gates read `docs/ICLOUD_PLAN.md` too, and never ship a cloud feature outside its `cloud.*` flag until its gate has passed.
- **Design work:** the block below is generated from `docs/design/RULES_CARD.md`. Do not edit it here; run `npm run docs:sync`. Landing page rules, planner rules and device notes are in the packs the router names.

<!-- design-rules-card:start -->
**Start here:** `docs/design/README.md` (router). Plans and specs: `docs/design/PLAN_SPEC_PROTOCOL.md`. Tokens as data: `docs/design/tokens.json`. Read the task pack the router names, then only the section it points to.

**Look**
- No new colors, fonts or decorative styles in the unflagged planner. Use a token (`--canvas`, `--elevated`, `--ink`, `--secondary`, `--tertiary`, `--line`, `--fill`, `--accent`, `--on-accent`, `--danger`, `--caution`, `--scrim`, `--shadow`, `--glass*`) or reuse a pattern.
- Role colors are data (`ROLE_COLORS` in `src/lib/spread/model.ts`). Status is never color alone.
- Cards are `rounded-3xl bg-elevated`. Touch targets are at least 44 pt.
- Week keeps three kinds of thing: solid day cards, a dashed To place tray, tinted Free time chips.
- Keep the Crown, Spread/Week/Month semantics, the hour bank and the quiet palette.
- The landing page is separate (`docs/design/landing/DESIGN.md`): one focal object per section, both modes.

**Behavior**
- A task goes on its own role's day only. Every drag has a tap and a keyboard path. Drags and "Not today" offer Undo.
- Nothing may claim iCloud works. Cloud behavior stays behind its `cloud.*` flag.
- Motion uses existing classes; reduced motion removes movement. One light haptic on completing a task, iPhone only.

**Boundaries**
- Task changes go through `store.ts` actions. No second store. No data migration for UI work.
- Landing work never changes the planner. Never modify a `golden/*` branch.
- Do not touch cloud, sync, backup, restore, schema files, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/`.
- Only `applyTheme` and the pre-paint script write `data-theme`.

**Verify**
- Widths 390, 820, 1024 (1366 iPad, 1440 landing), light and dark, reduced motion, no horizontal scroll.
- Typecheck, lint, tests and build are necessary, not sufficient. Device checks are owed. New test files go in the explicit lists with `--min` raised.

**If a request seems to need something forbidden, list it as an exception for the owner to decide. Never design around a rule silently.**
<!-- design-rules-card:end -->

## Rules

- **Build on the direction, don't restart it.** Warm paper becoming a polished product; one focal object per section, built from real product parts. Refine what exists.
- **Stay on the brand board.** No new colors, fonts or decorative styles. No gradient meshes, glassmorphism, floating blobs, fake dashboards or stock imagery.
- **Both modes.** Light is the reference. Any new landing component needs its dark values in the `[data-site-theme="dark"]` block, where product cards turn to the app's light look and paper stays paper.
- **Keep the founder's copy** unless there is a clear reason to change it.
- **Landing work never changes the planner.** Do not change planner behavior, local-first storage, profiles, licensing or backups from landing work. Landing components use illustrative data only and never read or write a visitor's planner. The appearance switch uses the store's existing `setTheme`.
- **Never modify a `golden/*` branch.** Branch from it instead. The table of goldens is in `README.md`.
- **Work on a branch, open a pull request, merge to `main`.** `main` deploys to Vercel production and to GitHub Pages automatically.

## Checks before a pull request

Run the typecheck, focused tests, and build commands in
[`README.md` → Checks](README.md#checks).

Then look at the page yourself at 1440, 820 and 390 wide, in light and dark, and with reduced motion on. For the hero, confirm that no orbiting task ever draws over a card, and that tap → tray → drag works on a phone-sized touch screen.
