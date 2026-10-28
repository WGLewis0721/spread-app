# Spread design brain

The one place to start for how Spread looks, feels or adapts to a device. This map tells you what to read for your task, and what not to.

**Audience:** developers and GenAI agents. Do not look for design guidance anywhere else, and do not create design documents outside this folder.

**Product model:** Responsibilities, then Hours, then Week, then Tasks. Spread is a local-first weekly planner (Capacitor around a React app). The planner and the public landing page have separate design rules.

---

## 1. Load only what you need

Stop at the first tier that answers your question.

| Tier | What | Size budget | When |
| --- | --- | --- | --- |
| 0 | The rules card, already copied into `AGENTS.project.md`, `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md` ([source](RULES_CARD.md)) | 3 KB | Always loaded. Small tweaks stop here |
| 1 | This map | 9 KB | To pick a pack |
| 2 | A task pack in [packs/](packs/): a digest of the rules, facts and checklist for one kind of task, with pointers to exact sections | 6.5 KB each | Almost every task |
| 3 | The long reference documents, read **by section** using the pointers in the pack | n/a | Only when the pack says the detail matters |
| Data | [tokens.json](tokens.json): every planner token for light and dark, generated from `src/styles.css` | 4 KB | Instead of reading CSS or prose for token values |

Rarely needed: [DECISIONS.md](DECISIONS.md) (open decisions and the decision log), and the historical Unified UX record.

---

## 2. Task router

| If you are doing... | Read | Then, only if needed |
| --- | --- | --- |
| A plan, spec sheet, redesign or UI review | [packs/spec-writing.md](packs/spec-writing.md) | [PLAN_SPEC_PROTOCOL.md](PLAN_SPEC_PROTOCOL.md), [specs/TEMPLATE.md](specs/TEMPLATE.md) |
| A planner screen: Week, Spread, Month, sheets, toasts, task rows, the Crown | [packs/planner-change.md](packs/planner-change.md) | [planner/SPREAD_DESIGN_SYSTEM.md](planner/SPREAD_DESIGN_SYSTEM.md) sections named in the pack |
| The public landing page | [packs/landing-change.md](packs/landing-change.md) | [landing/DESIGN.md](landing/DESIGN.md) sections named in the pack |
| Layout for iPhone, iPad or iPhone Duo; safe areas; dark palette; App Store screenshots | [packs/device-layout.md](packs/device-layout.md) | The device guide sections named in the pack |
| Making the UI feel native: materials, color, sheets, motion | [packs/apple-native-feel.md](packs/apple-native-feel.md) | [platforms/APPLE_DESIGN_PRINCIPLES.md](platforms/APPLE_DESIGN_PRINCIPLES.md) |
| App icon, UI action icons, category badges | [brand/ICON_HANDOFF.md](brand/ICON_HANDOFF.md) | Files in `public/icons/` |
| Why a planner behavior exists, or what was verified and deferred | [planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md](planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md) (historical record) | `ROADMAP.md` |
| Wallpaper-driven personalization (Studio) | Section 5 below: it lives on a branch | |
| Recording a decision or checking what is undecided | [DECISIONS.md](DECISIONS.md) | |
| Pointing an AI tool at these docs | [AI_TOOL_SETUP.md](AI_TOOL_SETUP.md) | |

A change touching both planner and landing page needs both packs, kept separate. If no row fits, add one.

---

## 3. Folder map and authority

All paths are under `docs/design/`.

| Path | Governs | Status and authority |
| --- | --- | --- |
| RULES_CARD.md | The hard rules, in brief | Source of the generated card in agent files. Summarizes the rows below; they win if they differ |
| DECISIONS.md | Open decisions and the decision log | Current |
| PLAN_SPEC_PROTOCOL.md, specs/TEMPLATE.md | How every plan and spec is made and shaped | New 2026-10-28. Process authority; never overrides a design rule |
| AI_TOOL_SETUP.md | How AI tools reach these documents | Advisory. Vendor file conventions not re-verified |
| specs/ (README.md is the index) | One spec per request | Plans, not approval |
| packs/ | One digest per kind of task | Derived. The long documents win if they differ |
| tokens.json | Planner tokens, light and dark | Generated from `src/styles.css` |
| planner/SPREAD_DESIGN_SYSTEM.md | Planner visuals and patterns | Highest for planner UI. Includes the 2026-10-08 HIG polish and the reference lock |
| planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md | The Unified UX pass and its result matrix | Historical record, not a design authority. Its Duo section is superseded by the Duo guide |
| landing/DESIGN.md | Landing page | Highest for the landing page only, never for planner decisions. Frozen as `golden/2026-09-28-full-landing-modes` |
| platforms/APPLE_DESIGN_PRINCIPLES.md | Native feel: materials, color, sheets | New 2026-10-28. Advisory, below the planner design system |
| platforms/SPREAD_IPHONE_BUILD_GUIDE.md | iPhone plus the shared baseline (toolchain, Capacitor, repo rules, dark palette, tests) | Research notes from 2026-10-21 with evidence tags. The dark palette in section 6a is a recommendation, not adopted |
| platforms/SPREAD_IPAD_BUILD_GUIDE.md | iPad | Same as above |
| platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md | iPhone Duo | Same as above |
| brand/ICON_HANDOFF.md | Icon files and placement (SVGs stay in `public/icons/`) | Highest for icon files |

**When documents disagree, higher wins and the lower one is fixed in the same change:** (1) what ships: `src/styles.css`, `ROLE_COLORS` and hat colors in `src/lib/spread/model.ts`, the running app; (2) the governing document for the surface; (3) `[Repo]` rules in the device guides; (4) `[Apple]` facts; (5) `[3P]` and `[Rec]` leads; (6) historical records.

---

## 4. Where the design truth lives in code

- Tokens and planner styles: `src/styles.css` (`:root`, `[data-theme="dark"]`, the `glass` utility, the "Landing page only" block). Read them as data in [tokens.json](tokens.json).
- Role colors: `ROLE_COLORS` and hat `color` in `src/lib/spread/model.ts`.
- Theme: `applyTheme` in `src/lib/spread/store.ts` and the pre-paint script in `src/routes/__root.tsx` are the only writers of `data-theme`. Do not reuse it for a custom look.
- Landing: `src/spread/screens/spread-app.tsx` (`UnlockScreen`) and `src/spread/components/landing-*.tsx`.
- Icons: `public/icons/`. Fonts: `public/fonts/inter-latin.woff2`.

---

## 5. Studio (wallpaper-driven personalization)

Not on `main`. It is on the branch `spread-studio` (draft PR #93) behind `VITE_SPREAD_STUDIO`, default off, with its documents in `docs/spread-studio/` there. When it merges, move that folder to `docs/design/studio/` in the same pull request and add it to the router and the table above.

Its one rule exception is narrow: with the flag on, a validated per-profile appearance may override scoped colors, system font stacks, material paint and control geometry inside `[data-studio-appearance]`. Flag-off output stays identical to the golden baseline. It does not authorize merging or releasing. Studio follows [platforms/APPLE_DESIGN_PRINCIPLES.md](platforms/APPLE_DESIGN_PRINCIPLES.md): the image decides a tint, a dim, a material thickness and a mode; layout never changes with the image.

---

## 6. Design-adjacent material that stays where it is

- `user-testing/` (read by `scripts/e2e/coverage.mjs`) and `tools/launch-video/` (its own workspace).
- Process, not design: `APP_STORE_RELEASE_PLAN.md`, `ROADMAP.md`, `docs/IOS_*.md`, `docs/APP_*.md`, `docs/ICLOUD_PLAN.md`, `docs/BETA_ACCESS.md`, `docs/WAITLIST_API.md`, `docs/audits/`.
- Agent instruction files (`AGENTS.project.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`) carry the generated card and point here. Keep them thin.
- Promo status, storyboard, production plan, end-state spec and Studio review live in the Claude Project "Spread-app-design", not in git.

---

## 7. Keeping the brain healthy

- New design information goes in the document whose scope it matches. If none fits, add one in the right subfolder and a row to the router and the table. Each document links back to this file near the top. Specs go in `specs/`.
- One home per fact: link instead of copying. The only deliberate copies are the generated card blocks. No design rules in `AGENTS.project.md`, `README.md` or `ROADMAP.md` outside that block.
- After editing `src/styles.css` tokens run `npm run docs:tokens`. After editing the rules card run `npm run docs:sync`. `npm run docs:check` (also in `test:scripts` and CI) fails when either is stale, when a link or pack pointer breaks, or when a tier passes its budget.
- A document over 6 KB opens with a `> Summary:` line under its breadcrumb. Keep section headings short and stable, because packs point at them; if you rename one, fix the pack the check names.
- Record a decision in the document it changes and in [DECISIONS.md](DECISIONS.md), and remove it from the open list. When a document is superseded, say so at its top and name its replacement. Do not delete history.
