# Spec: token-efficient design docs

> Part of the Spread design brain. Start at [../README.md](../README.md). Follows [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).

| | |
| --- | --- |
| Request | "How do we efficiently structure the docs so an agent can use them without having to reread them every single time it has a task (wasting resources)" |
| Restated | Make the design brain cheap for agents to load: read a small fixed amount per task, not the whole folder. |
| Surface | Documentation and tooling only. No app code. |
| Size | M |
| Author | Claude, 2026-10-28 |
| Status | Approved by the owner ("Go"); implemented on `docs/design-tiers` |
| Governing docs read | `README.md`, `PLAN_SPEC_PROTOCOL.md`, `AI_TOOL_SETUP.md`, all design documents for headings |

## 1. Problem

An agent starting a UI task was told to read the map and then "the governing documents". The planner design system, landing direction, three device guides and the Unified UX record total about 100 KB. Most of it is irrelevant to any one task, yet every new session re-read what applied and some of what did not. The cost repeats per task, per tool.

## 2. Evidence and context

- `[Repo]` Sizes before this change: map 11.4 KB, device guides 9 to 18 KB each, landing 13.5 KB, Unified UX record large. Always-loaded agent files held a short reading list, not the rules.
- `[Repo]` Tokens existed only as CSS and prose, so agents read two long files to learn values.
- `[Industry]` Common agent-instruction practice is a short always-loaded file plus on-demand detail. `[Assumption]` Loading less is better if the small file is accurate.
- `[Rec]` Digests can drift from their sources, so they need a mechanical check.

## 3. Goals, non-goals and budget

- **Goals:** a routine task loads at most the rules card, the map, one pack and a few named sections. Digests cannot silently drift. Token values come from one generated file.
- **Non-goals:** rewriting the long documents, adding a vector index or MCP server, changing any design rule.
- **Appetite:** one session.

## 4. Rules that apply and exceptions needed

| Rule | How this touches it |
| --- | --- |
| One home per fact ([../README.md](../README.md) section 7) | Packs and the card are digests. Each is checked, and the long documents win on conflict |
| Do not put design rules in `AGENTS.project.md` outside a generated block | The card block there is generated and checked |

**Exceptions needed:** None.

## 5. Options and the chosen concept

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| A. Tiers with packs, a card, generated data, checks | Tier 0 card in agent files, tier 1 map, tier 2 packs, tier 3 sections, `tokens.json`, CI budgets | Fixed small load, drift is caught | Digests must be maintained |
| B. Shrink the long documents | Edit each to be shorter | No new layer | Loses research and history; shorter is not task-shaped |

**Chosen:** A. **Rejected:** B alone, because history and evidence are worth keeping and a short file still is not shaped to one task. The Foundation Models or retrieval ideas are out of scope.

### Breadboard
Agent file (card) → map router → pack → `path#Heading` pointer → one section. Data: `tokens.json`. Humans edit the card, `src/styles.css` or a long document; `npm run docs:sync` and `npm run docs:tokens` regenerate; `npm run docs:check` fails if anything is stale.

### States
Stale card copy, stale `tokens.json`, over-budget file, broken pack pointer, renamed heading, long document with no Summary: each fails the check with a message naming the file.

## 6. Platform behavior

Not applicable to the app. Works for any tool that reads `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` or `.github/copilot-instructions.md`, and for chat apps through the preamble in [../AI_TOOL_SETUP.md](../AI_TOOL_SETUP.md).

## 7. Technical approach

- Files: `docs/design/RULES_CARD.md`, `DECISIONS.md`, `packs/*`, `tokens.json`; `scripts/design-docs.mjs` (checks and `--sync`), `scripts/design-tokens.mjs`; npm scripts `docs:check`, `docs:sync`, `docs:tokens`.
- Budgets (bytes): card 3000, map 9000, pack 6500, tokens 4000. Documents over 6000 bytes need a `> Summary:` line.
- No app code, no dependency, nothing leaves the device.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Default | Who decides |
| --- | --- | --- | --- |
| Packs drift in meaning even when pointers resolve | The check cannot read meaning | Pack says the long document wins; review packs when a long document changes | Owner |
| Byte budgets are a proxy for tokens | Bytes and tokens differ | Keep bytes; revisit if a tool reports otherwise | Owner |
| Savings are not measured | Claim is a design goal, not a result | Measure tokens for a sample task before and after | Owner |

## 9. Verification

### Acceptance criteria
- Given a stale copy of the card in any agent file, when `npm run docs:check` runs, then it fails and names the file.
- Given a renamed heading a pack points at, then the check names the pack.
- Given `src/styles.css` tokens change without `npm run docs:tokens`, then the check fails.
- Given a pack over 6500 bytes, then the check fails.

### Checks
Typecheck, lint, `test:spread`, `test:scripts` and build. Not measured: actual tokens saved per task.

## 10. Rollout, rollback and release

Branch `docs/design-tiers`, merged to `main`. Revert the merge to roll back. No app behavior changes.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-10-28 | Adopt tiers, packs, generated card and tokens, CI budgets | Owner | README, RULES_CARD, DECISIONS, PLAN_SPEC_PROTOCOL, AI_TOOL_SETUP |
