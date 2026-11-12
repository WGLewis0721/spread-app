# Spread: project instructions

These apply to any agent or tool working in this repository, alongside `AGENTS.md`.

## Before you change anything

- Read `README.md` for how the planner works and where it deploys.
- **Native SwiftUI PR #127:** start at `docs/design/README.md`, then `docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md` and `docs/design/platforms/IOS27_BEHAVIOR_AUDIT.md`. Owner's November 4 **single Wallet Stack** supersedes five-mode references in historical handoffs. Preserve Chalkboard motion, Week/Month, Crown, real tasks, existing planner store and release gates. Changes remain in a draft PR: no merge, deploy or TestFlight upload authorized.
- Read `APP_STORE_RELEASE_PLAN.md` before any iOS packaging, TestFlight, App Store, native storage/share, pricing, or CloudKit work. It fixes the 1.0 direction as Capacitor + the existing React app, local-first, no account required, paid-app commerce. For iCloud backup/sync, migrations, attachments, iPad and the related release gates read `docs/ICLOUD_PLAN.md` too, and never ship a cloud feature outside its `cloud.*` flag until its gate has passed.
- **Design work:** the block below is generated from `docs/design/RULES_CARD.md`. Do not edit it here; run `npm run docs:sync`. Landing page rules, planner rules and device notes are in the packs the router names.

<!-- design-rules-card:start -->
**Start here:** `docs/design/README.md` (router). Plans and specs: `docs/design/PLAN_SPEC_PROTOCOL.md`. Tokens as data: `docs/design/tokens.json`. Read the task pack the router names, then only the section it points to.

**Two products.** (1) The native iOS app in SwiftUI, iPhone only, no Android; Codemagic builds `main` to TestFlight on demand. (2) The marketing website: promo, one-page walkthrough, App Store link. The React web planner, beta sign-up, iCloud, multiplayer and waitlist are suspended (snapshot: branch `parked/web-cloud-2026-11-11`). Changes under 50 lines need no spec; implement and test.

**Look**
- In **React**, use existing CSS tokens. **Native SwiftUI** follows `docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md` for solid navy/cream, editorial Life art, accessible controls and calendar-week navigation. No doodles, Liquid Glass, or metal Crown.
- Role colors are data (`ROLE_COLORS` in `src/lib/spread/model.ts`). Status is never color alone.
- Cards are `rounded-3xl bg-elevated`. Touch targets are at least 44 pt.
- Week: day cards, expandable task inbox and Free time chips.
- Native has ONE Wallet-style Life Stack. A focused card offers Details (edit/delete with Undo) and Tasks. The inline weekly time strip edits capacity and role budgets through the existing store. Use the Spread logo for Life. Weekly Time is full-width; budget values and week navigation use compact arrow/value/arrow controls. Hold week arrows to accelerate. No global Life Edit, swipe-delete or redundant dock plus. Classic retains its own rules.
- The landing page is separate (`docs/design/landing/DESIGN.md`): one focal object per section, both modes.

**Behavior**
- A task goes on its own role's day only. High priority is an optional red ! plus spoken label, not a scheduling mutation. Every drag has a tap/keyboard path and Undo.
- Plan Ahead is explicitly opened, previewed, validated and confirmed before moving hours to a future week; never auto-roll over. Nothing may claim iCloud works.
- Motion uses existing classes; reduced motion removes movement. One light haptic on completing a task, iPhone only.

**Boundaries**
- Task changes go through `store.ts` actions. No second store. No data migration for UI work.
- Landing work never changes the planner. Never modify a `golden/*` branch.
- Do not touch cloud, sync, backup, restore, schema files, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/`.
- Only `applyTheme` and the pre-paint script write `data-theme`.

**Verify**
- Widths 390, 820, 1024 (1366 iPad, 1440 landing), light and dark, reduced motion, no horizontal scroll.
- Typecheck, lint, tests and build are necessary, not sufficient. Device checks are owed. Tests are found by name (`*.test.ts` in `src`, `*.test.mjs` in `scripts`); no lists or counts to maintain.

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
