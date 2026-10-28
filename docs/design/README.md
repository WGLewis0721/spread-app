# Spread design brain

The one place to start for anything about how Spread looks, feels or adapts to a device. This file is the map: it tells you what to read for your task, and just as important, what not to read.

**Audience:** developers and GenAI agents. Do not look for design guidance anywhere else, and do not create design documents outside this folder.

**Product model:** Responsibilities, then Hours, then Week, then Tasks. Spread is a local-first weekly planner (Capacitor around a React app). The planner and the public landing page have separate design rules.

Last reorganized: 2026-10-28.

---

## 1. Load only what you need

The folder is built in tiers so a task reads as little as it can. Stop at the first tier that answers your question.

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

A change touching both planner and landing page needs both packs, kept separate. If a task fits no row, add one as part of the change.

---

## 3. Folder map

```
docs/design/
  README.md                     this map
  RULES_CARD.md                 tier 0: the always-loaded rules (single source)
  DECISIONS.md                  open decisions and the decision log
  PLAN_SPEC_PROTOCOL.md         how to plan and spec a request
  AI_TOOL_SETUP.md              pointing Claude, ChatGPT, Gemini, Grok, Codex, Copilot at this folder
  tokens.json                   generated from src/styles.css
  packs/                        tier 2: one digest per kind of task
  specs/                        one spec per request; TEMPLATE.md; README.md index
  planner/                      rules for the app itself
    SPREAD_DESIGN_SYSTEM.md       tokens, patterns, motion, moving things without dragging, rules a change must keep
    SPREAD_UNIFIED_UX_IMPLEMENTATION.md   the Unified UX plan and its result matrix
  landing/
    DESIGN.md                     brand board, type scale, sections, motion, modes, guardrails
  platforms/
    APPLE_DESIGN_PRINCIPLES.md    first principles, materials, color, sheets, what reads as amateur
    SPREAD_IPHONE_BUILD_GUIDE.md  iPhone plus the shared baseline (toolchain, Capacitor, repo rules, dark palette, tests)
    SPREAD_IPAD_BUILD_GUIDE.md    iPad
    SPREAD_IPHONE_DUO_BUILD_GUIDE.md   iPhone Duo
  brand/
    ICON_HANDOFF.md               which icon file is used where (the SVGs stay in public/icons/)
```

| Document | Governs | Status | Authority |
| --- | --- | --- | --- |
| RULES_CARD.md | The hard rules, in brief | Current. Copies are generated | Summary of the documents below; they win if they differ |
| PLAN_SPEC_PROTOCOL.md and specs/TEMPLATE.md | How every plan and spec is produced and shaped | New 2026-10-28. From Apple's prototyping session and Design Pathway, Shape Up's pitch format and common design-doc templates | Process authority; never overrides a design rule |
| AI_TOOL_SETUP.md | How AI tools reach these documents | New 2026-10-28. Vendor file conventions not re-verified | Advisory |
| planner/SPREAD_DESIGN_SYSTEM.md | Planner visuals and patterns | Current. Includes the 2026-10-08 HIG polish and the reference lock | Highest for planner UI |
| landing/DESIGN.md | Landing page | Current. Direction `spread-landing-2026-09-28`, frozen as `golden/2026-09-28-full-landing-modes` | Highest for the landing page only. Never use it for planner decisions |
| planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md | The Unified UX pass: undo, Not today, view memory, haptics, free-time suggestion, rollover, offline, status honesty | Historical spec and result record. Its Duo section is superseded by the Duo guide | Evidence of what was verified, not a design authority |
| platforms/SPREAD_*_BUILD_GUIDE.md | Device behavior and submission | Research notes from 2026-10-21 with evidence tags. Several items are recommendations not yet adopted (the dark palette in iPhone guide section 6a) | Advisory. `[Repo]` items bind, `[Apple]` items are facts, `[3P]` and `[Rec]` are leads |
| platforms/APPLE_DESIGN_PRINCIPLES.md | Native feel on Apple platforms | New 2026-10-28. From the Materials and Adopting Liquid Glass pages; Sheets read through a mirror | Advisory, subordinate to the planner design system |
| brand/ICON_HANDOFF.md | Icon files and placement | Current | Highest for icon files |

### When documents disagree

1. What ships: `src/styles.css` tokens, `ROLE_COLORS` and hat colors in `src/lib/spread/model.ts`, and the running app.
2. The governing document for the surface (planner or landing page).
3. Repo rules in the device guides (`[Repo]`).
4. Apple documentation (`[Apple]`).
5. Third-party and recommendation items (`[3P]`, `[Rec]`).
6. Historical plans and result records.

A lower item never overrides a higher one. Fix the lower document in the same change.

---

## 4. Where the design truth lives in code

- Tokens and planner styles: `src/styles.css` (`:root`, `[data-theme="dark"]`, the `glass` utility, and the "Landing page only" block). Read them as data in [tokens.json](tokens.json).
- Role colors: `ROLE_COLORS` and hat `color` in `src/lib/spread/model.ts`.
- Theme: `applyTheme` in `src/lib/spread/store.ts` writes `data-theme`; the pre-paint script in `src/routes/__root.tsx` sets the same attribute before first render. Nothing else may write it, and it must not be reused for a custom look.
- Landing: `src/spread/screens/spread-app.tsx` (`UnlockScreen`) and `src/spread/components/landing-*.tsx`.
- Icons: `public/icons/`. Fonts: `public/fonts/inter-latin.woff2` (Spread Sans).

---

## 5. Studio (wallpaper-driven personalization)

Studio is not on `main`. It is developed on the branch `spread-studio` (draft PR #93) behind the build flag `VITE_SPREAD_STUDIO`, which defaults to off. Its documents are in `docs/spread-studio/` on that branch.

- When Studio is merged, move `docs/spread-studio/` to `docs/design/studio/` in the same pull request and add it to the router and folder map.
- As documented on that branch, the only design-rule exception is narrow: with the flag on, a validated per-profile appearance may override scoped semantic colors, local system font stacks, material paint and control geometry, all inside `[data-studio-appearance]`. Flag-off output must stay identical to the golden baseline. The exception does not authorize merging, enabling or releasing.
- Studio follows [platforms/APPLE_DESIGN_PRINCIPLES.md](platforms/APPLE_DESIGN_PRINCIPLES.md): the image decides a tint, a dim, a material thickness and a mode; the layout never changes with the image.

---

## 6. Design-adjacent material that stays where it is

| What | Where | Why it stays |
| --- | --- | --- |
| User-testing report, coverage matrix and per-persona screenshots | `user-testing/` | `scripts/e2e/coverage.mjs` reads and writes these paths |
| Launch film workspace | `tools/launch-video/` | Separate workspace with its own tooling and docs |
| Release and App Store process | `APP_STORE_RELEASE_PLAN.md`, `ROADMAP.md`, `docs/IOS_RELEASE.md`, `docs/IOS_AUTOMATION.md`, `docs/APP_STORE_REVIEW_CHECKLIST.md`, `docs/APP_REVIEW_NOTES.md` | Process, not design |
| iCloud, beta access, waitlist API, audits | `docs/ICLOUD_PLAN.md`, `docs/BETA_ACCESS.md`, `docs/WAITLIST_API.md`, `docs/audits/` | Data and ops |
| Project instructions for agents | `AGENTS.project.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md` | They carry the rules card and point here. Keep them thin |
| Promo status, storyboard, production plan, end-state spec, Studio review | The Claude Project "Spread-app-design" (not in git) | Working documents outside the repo |

---

## 7. Keeping the brain healthy

- New design information goes in the document whose scope it matches. If none fits, add one in the right subfolder and a row to the router and folder map.
- One home per fact. Link instead of copying. The only deliberate copies are the rules card blocks, which are generated.
- Do not put design rules in `AGENTS.project.md`, `README.md` or `ROADMAP.md` outside the generated card block.
- After editing `src/styles.css` tokens run `npm run docs:tokens`; after editing the rules card run `npm run docs:sync`. The docs check fails when either is stale.
- A long document (over 6 KB) starts with a one-line `> Summary:` under its breadcrumb. Give sections short, stable headings, because packs point at them. If you rename a heading, fix the pack that points to it; the check names the pack.
- Keep each tier within its budget. The check fails when a card, map or pack grows past it.
- Mark claims with the evidence tags `[Apple]`, `[Repo]`, `[3P]`, `[Rec]`.
- Record a decision in the document it changes, add it to [DECISIONS.md](DECISIONS.md), and remove it from the open list.
- When a document is superseded, say so at its top and name its replacement. Do not delete history.
- Each document links back to this file near the top. Specs go in `specs/`.
- The root `DESIGN.md` is only a pointer to [landing/DESIGN.md](landing/DESIGN.md).
