# Spread: instructions for Gemini

All design guidance lives in one place: **[docs/design/README.md](docs/design/README.md)**. The block below is generated from `docs/design/RULES_CARD.md` (`npm run docs:sync`); do not edit it here. Project rules: [AGENTS.project.md](AGENTS.project.md). Setup for each AI tool: [docs/design/AI_TOOL_SETUP.md](docs/design/AI_TOOL_SETUP.md).

<!-- design-rules-card:start -->
**Start here:** `docs/design/README.md` (router). Plans and specs: `docs/design/PLAN_SPEC_PROTOCOL.md`. Tokens as data: `docs/design/tokens.json`. Read the task pack the router names, then only the section it points to.

**Two products.** (1) The native iOS app in SwiftUI, iPhone only, no Android; Codemagic builds `main` to TestFlight on demand. (2) The marketing website: promo, one-page walkthrough, App Store link. The React web planner, beta sign-up, iCloud, multiplayer and waitlist are suspended (snapshot: branch `parked/web-cloud-2026-11-11`). A change under about 50 lines needs no spec: restate it in one sentence, make it, run the checks.

**Look**
- In **React**, use existing CSS tokens. **Native SwiftUI** follows `docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md` for solid navy/cream, editorial Life art, accessible controls and calendar-week navigation. No doodles, Liquid Glass, or metal Crown.
- Role colors are data (`ROLE_COLORS` in `src/lib/spread/model.ts`). Status is never color alone.
- Cards are `rounded-3xl bg-elevated`. Touch targets are at least 44 pt.
- Week keeps three kinds of thing: solid day cards, a dashed To place tray, tinted Free time chips.
- Native has ONE Wallet-style Life Stack. A focused card offers Details (edit/delete with Undo) and Tasks. The inline weekly time strip edits capacity and role budgets through the existing store. The dock toggles Life/Week and shows a velocity-aware calendar-week navigator. No global Life Edit, swipe-delete or redundant dock plus. Classic retains its own rules.
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
