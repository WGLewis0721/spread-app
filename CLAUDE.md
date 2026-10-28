# Spread: instructions for Claude Code

All design guidance lives in one place: **[docs/design/README.md](docs/design/README.md)**. The block below is generated from `docs/design/RULES_CARD.md` (`npm run docs:sync`); do not edit it here. Project rules: [AGENTS.project.md](AGENTS.project.md). Setup for each AI tool: [docs/design/AI_TOOL_SETUP.md](docs/design/AI_TOOL_SETUP.md).

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
