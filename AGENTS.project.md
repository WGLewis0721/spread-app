# Spread: project instructions

These apply to any agent or tool working in this repository, alongside `AGENTS.md`.

## Before you change anything

- Read `README.md` for how the planner works and where it deploys.
- Read `DESIGN.md` before touching the landing page (`UnlockScreen` in `src/spread/screens/spread-app.tsx`, the `landing-*` components, and the "Landing page only" block of `src/styles.css`). It holds the brand board, type scale, section map, motion rules, modes and guardrails.
- Read `APP_STORE_RELEASE_PLAN.md` before any iOS packaging, TestFlight, App Store, native storage/share, pricing, or CloudKit work. It fixes the 1.0 direction as Capacitor + the existing React app, local-first, no account required, paid-app commerce. For iCloud backup/sync, migrations, attachments, iPad and the related release gates read `docs/ICLOUD_PLAN.md` too, and never ship a cloud feature outside its `cloud.*` flag until its gate has passed.

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
