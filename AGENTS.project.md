# Spread: project instructions

These apply to any agent or tool working in this repository, alongside `AGENTS.md`.

## Before you change anything

- Read `README.md` for how the planner works and where it deploys.
- Read `DESIGN.md` before touching the landing page (`UnlockScreen` in `src/spread/screens/spread-app.tsx`, the `landing-*` components, and the "Landing page only" block of `src/styles.css`). It holds the brand board, type scale, section map, motion rules, modes and guardrails.
- Read `APP_STORE_RELEASE_PLAN.md` before any iOS packaging, TestFlight, App Store, native storage/share, pricing, or CloudKit work. It fixes the 1.0 direction as Capacitor + the existing React app, local-first, no account required, paid-app commerce. For iCloud backup/sync, migrations, attachments, iPad and the related release gates read `docs/ICLOUD_PLAN.md` too, and never ship a cloud feature outside its `cloud.*` flag until its gate has passed.

- Read `docs/platforms/SPREAD_IPHONE_BUILD_GUIDE.md` (shared baseline), `SPREAD_IPAD_BUILD_GUIDE.md` or `SPREAD_IPHONE_DUO_BUILD_GUIDE.md` before device-specific layout, safe-area, multitasking, fold or App Store screenshot work. They are research notes with evidence tags; section 6a of the iPhone guide proposes dark palette values that are not yet adopted, so the "no new colours" rule below still applies until they are.
- Read `docs/design/SPREAD_DESIGN_SYSTEM.md` before changing planner screens (Week, Spread, sheets, toasts). It lists the tokens and patterns to reuse; do not add new colours or styles.

## Rules

- **Build on the direction, don't restart it.** Warm paper becoming a polished product; one focal object per section, built from real product parts. Refine what exists.
- **Stay on the brand board for the baseline.** No new colors, fonts or decorative styles outside the explicitly approved, feature-flagged per-profile Studio scope. No gradient meshes, floating blobs, fake dashboards or stock imagery. Studio paints approved local materials only; it does not change planner data or global theme tokens.
- **Both modes.** Light is the reference. Any new landing component needs its dark values in the `[data-site-theme="dark"]` block, where product cards turn to the app's light look and paper stays paper.
- **Keep the founder's copy** unless there is a clear reason to change it.
- **Landing work never changes the planner.** Do not change planner behavior, local-first storage, profiles, licensing or backups from landing work. Landing components use illustrative data only and never read or write a visitor's planner. The appearance switch uses the store's existing `setTheme`.
- **Never modify a `golden/*` branch.** Branch from it instead. The table of goldens is in `README.md`.
- **Work on a branch, open a pull request, merge to `main`.** `main` deploys to Vercel production and to GitHub Pages automatically.

## Checks before a pull request

Run the typecheck, focused tests, and build commands in
[`README.md` → Checks](README.md#checks).

Then look at the page yourself at 1440, 820 and 390 wide, in light and dark, and with reduced motion on. For the hero, confirm that no orbiting task ever draws over a card, and that tap → tray → drag works on a phone-sized touch screen.


## Spread Studio (experimental, feature-flagged personalization)

For any Spread Studio appearance, user-wallpaper, Apple Foundation Models, Siri, or App Intents task, first read `docs/spread-studio/README.md` and `docs/spread-studio/RETRIEVAL_PROTOCOL.md`, then retrieve the relevant current repository source and Apple/Capacitor primary documentation indexed in `docs/spread-studio/source-index.json`. Clearly distinguish checked code, accepted product intent, and proposed/unverified implementation. The user wants **user-created appearances** with a few editable original starter looks, not demographic, occupational, franchise, or sports theme packs. On 2026-10-27 the owner authorized changing Studio against its golden baseline; approval covers the scoped experimental source implementation only, not a merge, production feature flag, deployment or Apple submission. Preserve the baseline via default-off flag; keep the reviewed contract allowlists, local image storage, preview-before-Apply, and separate release gates. Future new font families, external assets, or new planner structures require review.
