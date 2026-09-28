# Spread: project instructions

These apply to any agent or tool working in this repository, alongside `AGENTS.md`.

## Before you change anything

- Read `README.md` for how the planner works and where it deploys.
- Read `DESIGN.md` before touching the landing page (`UnlockScreen` in `src/spread/screens/spread-app.tsx`, the `landing-*` components, and the "Landing page only" block of `src/styles.css`). It holds the brand board, type scale, section map, motion rules, modes and guardrails.

## Rules

- **Build on the direction, don't restart it.** Warm paper becoming a polished product; one focal object per section, built from real product parts. Refine what exists.
- **Stay on the brand board.** No new colors, fonts or decorative styles. No gradient meshes, glassmorphism, floating blobs, fake dashboards or stock imagery.
- **Both modes.** Light is the reference. Any new landing component needs its dark values in the `[data-site-theme="dark"]` block, where product cards turn to the app's light look and paper stays paper.
- **Keep the founder's copy** unless there is a clear reason to change it.
- **Landing work never changes the planner.** Do not change planner behavior, local-first storage, profiles, licensing or backups from landing work. Landing components use illustrative data only and never read or write a visitor's planner. The appearance switch uses the store's existing `setTheme`.
- **Never modify a `golden/*` branch.** Branch from it instead. The table of goldens is in `README.md`.
- **Work on a branch, open a pull request, merge to `main`.** `main` deploys to Vercel production and to GitHub Pages automatically.

## Checks before a pull request

```
npm run typecheck
node --experimental-strip-types --test src/spread/gestures/gestures.test.ts src/lib/spread/hours.test.ts src/lib/spread/share.test.ts src/lib/spread/profiles.test.ts
npm run build
```

Then look at the page yourself at 1440, 820 and 390 wide, in light and dark, and with reduced motion on. For the hero, confirm that no orbiting task ever draws over a card, and that tap → tray → drag works on a phone-sized touch screen.
