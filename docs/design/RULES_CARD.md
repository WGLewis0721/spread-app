# Design rules card

> Part of the Spread design brain. Start at [README.md](README.md) for the map and the router.

This card is the single source for the always-loaded design rules. `npm run docs:sync` copies the block below into `AGENTS.project.md`, `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md`, and the docs check fails if a copy is stale. Edit only here. Keep the block under 3,000 bytes.

<!-- card:start -->
**Start here:** `docs/design/README.md` (router). Plans and specs: `docs/design/PLAN_SPEC_PROTOCOL.md`. Tokens as data: `docs/design/tokens.json`. Read the task pack the router names, then only the section it points to.

**Two products.** (1) The native iOS app in SwiftUI, iPhone only, no Android; Codemagic builds `main` to TestFlight on demand. (2) The marketing website: promo, one-page walkthrough, App Store link. The React web planner, beta sign-up, iCloud, multiplayer and waitlist are suspended (snapshot: branch `parked/web-cloud-2026-11-11`). A change under about 50 lines needs no spec: restate it in one sentence, make it, run the checks.

**Look**
- In unflagged **React**, use existing CSS tokens. **SwiftUI PR #127** follows `docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md` for navy, restrained glow, Chalkboard art and the metal Crown; React/landing keep their own rules.
- Role colors are data (`ROLE_COLORS` in `src/lib/spread/model.ts`). Status is never color alone.
- Cards are `rounded-3xl bg-elevated`. Touch targets are at least 44 pt.
- Week keeps three kinds of thing: solid day cards, a dashed To place tray, tinted Free time chips.
- Keep Crown, Spread/Week/Month, hour bank and original artwork. **Native Spread has ONE Wallet-style animated Stack**: full-width overlapping cards; a focused card offers Details (name, weekly hours, icon, color, undoable deletion) and Tasks (its notebook). Life has no global Edit, swipe-to-manage or swipe-to-delete; Delete is in Details with Undo (no confirmation). Classic retains its own swipe/confirmation rules. Five-mode directions are historical for native only.
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
- Typecheck, lint, tests and build are necessary, not sufficient. Device checks are owed. Tests are found by name (`*.test.ts` in `src`, `*.test.mjs` in `scripts`); no lists or counts to maintain.

**If a request seems to need something forbidden, list it as an exception for the owner to decide. Never design around a rule silently.**
<!-- card:end -->
