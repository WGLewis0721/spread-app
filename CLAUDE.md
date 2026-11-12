# Spread: instructions for Claude Code

For **native Life card visuals**, start with [the editorial artwork handoff](docs/design/planner/CLAUDE_EDITORIAL_ART_HANDOFF.md), the [art sheet](docs/design/planner/SPREAD_LIFE_CARD_ART_DIRECTION.md), and the [implementation spec](docs/design/specs/2026-11-10-life-card-visual-implementation.md). The single, authoritative **image folder** is `ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Editorial/`; `LifeEditorialArtworkRegistry` in `LifeEditorialCard.swift` loads `<category>.webp` or PNG, falling back to original `Resources/Chalk/`. Native SwiftUI paints names, live hours and the seven-day strip **over text-free artwork**; do not embed numbers, text or interface controls in image files. Keep category artwork, wallet gestures, haptics and planner data independent. Read the [design router](docs/design/README.md), [native board](docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md), [motion contract](docs/design/tactile-precision/MOTION_CONTRACT.md) and [iOS audit](docs/design/platforms/IOS27_BEHAVIOR_AUDIT.md). The generated rules block below comes from `docs/design/RULES_CARD.md`; do not edit it here. Project rules: [AGENTS.project.md](AGENTS.project.md). AI setup: [docs/design/AI_TOOL_SETUP.md](docs/design/AI_TOOL_SETUP.md).

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
