# Spread design brain

Start here for Spread's design rules and task-specific references.

**Audience:** developers and coding agents. Keep design guidance in this folder.

**Product model:** Responsibilities → Hours → Week → Tasks, local-first. **Native owner decision (Nov 4): only an animated full-width Wallet Stack on Spread**, with Week/Month and all planner actions preserved. React and landing retain separate rules.

---

## 1. Load only what you need

Stop at the first sufficient tier.

| Tier | What | Size budget | When |
| --- | --- | --- | --- |
| 0 | The rules card, already copied into `AGENTS.project.md`, `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md` ([source](RULES_CARD.md)) | 3 KB | Always loaded. Small tweaks stop here |
| 1 | This map | 9 KB | To pick a pack |
| 2 | Task pack in [packs/](packs/), with focused checklists and section pointers | 6.5 KB each | Almost every task |
| 3 | Long reference docs, read only the relevant sections | n/a | Only when the pack says the detail matters |
| Data | [tokens.json](tokens.json): every planner token for light and dark, generated from `src/styles.css` | 4 KB | Instead of reading CSS or prose for token values |

---

## 2. Task router

| If you are doing... | Read | Then, only if needed |
| --- | --- | --- |
| A UX law review, flow simplification or foundational interaction check | [FOUNDATIONAL_UX_PRINCIPLES.md](FOUNDATIONAL_UX_PRINCIPLES.md) | Then use the product's pack; not a visual override |
| A plan, spec sheet, redesign or UI review | [packs/spec-writing.md](packs/spec-writing.md) | [PLAN_SPEC_PROTOCOL.md](PLAN_SPEC_PROTOCOL.md), [specs/TEMPLATE.md](specs/TEMPLATE.md) |
| Implementing the approved Life iOS demo | Root [handoff](../../SPREAD_LIFE_IOS_HANDOFF.md), [spec](../../SPREAD_LIFE_IOS_SPEC.md) and [checklist](../../SPREAD_LIFE_IOS_CHECKLIST.md) | [Runnable reference](../../tools/life-reference/README.md); root placement requested by owner |
| Native SwiftUI / Wallet Stack (PR #127) | [current native brand board](planner/SPREAD_NATIVE_BRAND_BOARD.md) | [iOS 27 behavior audit](platforms/IOS27_BEHAVIOR_AUDIT.md); owner's screenshots; historical [handoff](../../CLAUDE_NATIVE_UI_HANDOFF.md) |
| A planner screen: Week, Spread, Month, sheets, toasts, task rows, the Crown | [packs/planner-change.md](packs/planner-change.md) | [planner/SPREAD_DESIGN_SYSTEM.md](planner/SPREAD_DESIGN_SYSTEM.md) sections named in the pack |
| The public landing page | [packs/landing-change.md](packs/landing-change.md) | [landing/DESIGN.md](landing/DESIGN.md) sections named in the pack |
| iPhone, iPad, Duo and resize / hinge support | [packs/device-layout.md](packs/device-layout.md) | [iOS 27 audit](platforms/IOS27_BEHAVIOR_AUDIT.md) and device guides |
| Native controls, material, motion and accessibility | [packs/apple-native-feel.md](packs/apple-native-feel.md) | [Apple principles](platforms/APPLE_DESIGN_PRINCIPLES.md), [iOS 27 audit](platforms/IOS27_BEHAVIOR_AUDIT.md) |
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
| FOUNDATIONAL_UX_PRINCIPLES.md | Cross-product UX laws and checks | Baseline; surface authority wins |
| RULES_CARD.md | The hard rules, in brief | Source of the generated card in agent files. Summarizes the rows below; they win if they differ |
| DECISIONS.md | Open decisions and the decision log | Current |
| PLAN_SPEC_PROTOCOL.md, specs/TEMPLATE.md | How every plan and spec is made and shaped | New 2026-10-28. Process authority; never overrides a design rule |
| AI_TOOL_SETUP.md | How AI tools reach these documents | Advisory. Vendor file conventions not re-verified |
| specs/ (README.md is the index) | One spec per request | Plans, not approval |
| packs/ | One digest per kind of task | Derived. The long documents win if they differ |
| tokens.json | Planner tokens, light and dark | Generated from `src/styles.css` |
| [root parity spec](../../SPREAD_SWIFTUI_PARITY_SPEC.md) | Native behavior and reference provenance | Historical; five-mode direction superseded by Nov 4 owner choice |
| planner/SPREAD_DESIGN_SYSTEM.md | React planner visuals, native behavior invariants | Governs legacy UI and behavior |
| planner/SPREAD_NATIVE_BRAND_BOARD.md | Current SwiftUI: **single animated Wallet Stack**; [SVG](planner/SPREAD_NATIVE_VISUAL_SPECIMEN.svg) | Native-only PR #127; supersedes five-mode language |
| planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md | Unified UX history | Historical only |
| landing/DESIGN.md | Landing page | Highest for the landing page only, never for planner decisions. Frozen as `golden/2026-09-28-full-landing-modes` |
| platforms/APPLE_DESIGN_PRINCIPLES.md | Native controls, sheets and contrast | Platform principles; native board preserves identity |
| platforms/IOS27_BEHAVIOR_AUDIT.md | **iOS 27 adaptive layout, glass controls, UX audit and release gates** | Current 2026-11-04 checklist for native PR #127 |
| platforms/SPREAD_IPHONE_BUILD_GUIDE.md | iPhone baseline | October research; native owner board overrides older paint |
| platforms/SPREAD_IPAD_BUILD_GUIDE.md | iPad | Same as above |
| platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md | iPhone Duo | Same as above |
| brand/ICON_HANDOFF.md | Icon files and placement (SVGs stay in `public/icons/`) | Highest for icon files |

**Authority:** Verified planner behavior/data wins. Owner's Nov 4 single-Stack decision on the [native board](planner/SPREAD_NATIVE_BRAND_BOARD.md) controls SwiftUI presentation; [iOS 27 audit](platforms/IOS27_BEHAVIOR_AUDIT.md) controls platform acceptance. Five-mode references are history. React and landing retain their rules.

---

## 4. Where the design truth lives in code

- React planner tokens/styles: `src/styles.css`, generated [tokens.json](tokens.json). Native visual tokens: [brand board](planner/SPREAD_NATIVE_BRAND_BOARD.md); implement centrally in SwiftUI.
- Role colors: `ROLE_COLORS` and hat `color` in `src/lib/spread/model.ts`.
- Theme: `applyTheme` in `src/lib/spread/store.ts` and the pre-paint script in `src/routes/__root.tsx` are the only writers of `data-theme`. Do not reuse it for a custom look.
- Landing: `src/spread/screens/spread-app.tsx` (`UnlockScreen`) and `src/spread/components/landing-*.tsx`.
- Icons: `public/icons/`. Fonts: `public/fonts/inter-latin.woff2`.

---

## 5. Studio (wallpaper-driven personalization)

Studio lives on the `spread-studio` branch and is off by default. [Historical rebuild spec](specs/2026-10-28-studio-rebuild.md). Do not import Studio's appearance changes into current SwiftUI.

---

## 6. Design-adjacent material that stays where it is

- Historical root handoffs: `SPREAD_NATIVE_UI_REMAINING_SPEC.md`, `CLAUDE_NATIVE_UI_HANDOFF.md`, `SPREAD_SWIFTUI_PARITY_SPEC.md`; defer to current native board.
- `user-testing/`, `tools/launch-video/`, release/roadmap/audit docs are separate. Agent instruction files mirror [RULES_CARD.md](RULES_CARD.md).
- Owner's concept images are in chat, not git; do not call them installed-build evidence.

---

## 7. Keeping the brain healthy

- New design information goes in the document whose scope it matches. If none fits, add one in the right subfolder and a row to the router and the table. Each document links back to this file near the top. Specs go in `specs/`.
- One home per fact: link instead of copying. The only deliberate copies are the generated card blocks. No design rules in `AGENTS.project.md`, `README.md` or `ROADMAP.md` outside that block.
- After editing `src/styles.css` tokens run `npm run docs:tokens`. After editing the rules card run `npm run docs:sync`. `npm run docs:check` (also in `test:scripts` and CI) fails when either is stale, when a link or pack pointer breaks, or when a tier passes its budget.
- A document over 6 KB opens with a `> Summary:` line under its breadcrumb. Keep section headings short and stable, because packs point at them; if you rename one, fix the pack the check names.
- Record a decision in the document it changes and in [DECISIONS.md](DECISIONS.md), and remove it from the open list. When a document is superseded, say so at its top and name its replacement. Do not delete history.
