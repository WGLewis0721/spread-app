# Spread: project instructions

These apply to any agent or tool working in this repository, alongside `AGENTS.md`.

## Before you change anything

- Read `README.md` for how the planner works and where it deploys.
- Read `APP_STORE_RELEASE_PLAN.md` before any iOS packaging, TestFlight, App Store, native storage/share, pricing, or CloudKit work. It fixes the 1.0 direction as Capacitor + the existing React app, local-first, no account required, paid-app commerce. For iCloud backup/sync, migrations, attachments, iPad and the related release gates read `docs/ICLOUD_PLAN.md` too, and never ship a cloud feature outside its `cloud.*` flag until its gate has passed.
- **All design work starts at [`docs/design/README.md`](docs/design/README.md)**, the design brain. It maps every design doc, says which one governs which task, and lists the rules and open decisions in one place. Do not look for design guidance anywhere else.
  - Landing page (`UnlockScreen` in `src/spread/screens/spread-app.tsx`, the `landing-*` components, the "Landing page only" block of `src/styles.css`): `docs/design/landing/DESIGN.md`.
  - Planner screens (Week, Spread, sheets, toasts): `docs/design/planner/SPREAD_DESIGN_SYSTEM.md`. It lists the tokens and patterns to reuse; do not add new colours or styles.
  - Device-specific layout, safe-area, multitasking, fold or App Store screenshot work: `docs/design/platforms/` (`SPREAD_IPHONE_BUILD_GUIDE.md` is the shared baseline). They are research notes with evidence tags; section 6a of the iPhone guide proposes dark palette values that are not yet adopted, so the "no new colours" rule below still applies until they are.
  - Icons: `docs/design/brand/ICON_HANDOFF.md`.
  - **Asked for a plan, spec sheet, redesign or UI review:** follow `docs/design/PLAN_SPEC_PROTOCOL.md` and write the spec with `docs/design/specs/TEMPLATE.md`. Save it in `docs/design/specs/`. List anything that seems to need a new color, font or decorative style as an exception for the owner to decide; do not design around a rule silently.

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
