# Spread design brain

Start here for design rules and task references. Cross-product records: [documentation map](../README.md).

**Product:** Responsibilities → Hours → Week → Tasks. Local-first; one native Wallet Stack. React and landing are separate.

**UI Kit:** [ui-kit/UI_KIT.md](ui-kit/UI_KIT.md) consolidates visuals for app, web and marketing.

**Delivery:** Build and test integrated features on branches; no isolated prototypes or unauthorized merge/release.

---

## 1. Load only what you need

| Tier | What | Size budget | When |
| --- | --- | --- | --- |
| 0 | [Rules card](RULES_CARD.md) replicated into agent files | 3 KB | Always |
| 1 | This map | 9 KB | To pick a pack |
| 2 | Task pack in [packs/](packs/), with focused checklists and section pointers | 6.5 KB each | Almost every task |
| 3 | Long reference docs, read only the relevant sections | n/a | Only when the pack says the detail matters |
| Data | [tokens.json](tokens.json): every planner token for light and dark, generated from `src/styles.css` | 4 KB | Instead of reading CSS or prose for token values |

---

## 2. Task router

| If you are doing... | Read | Then, only if needed |
| --- | --- | --- |
| Consistent UI across app, website, marketing, or ads | [ui-kit/UI_KIT.md](ui-kit/UI_KIT.md) | [ui-kit/README.md](ui-kit/README.md), then existing planner/landing docs as needed |
| A UX law review, flow simplification or foundational interaction check | [FOUNDATIONAL_UX_PRINCIPLES.md](FOUNDATIONAL_UX_PRINCIPLES.md) | Then use the product's pack; not a visual override |
| A plan, spec sheet, redesign or UI review | [packs/spec-writing.md](packs/spec-writing.md) | [PLAN_SPEC_PROTOCOL.md](PLAN_SPEC_PROTOCOL.md), [specs/TEMPLATE.md](specs/TEMPLATE.md) |
| Native Life design and artwork | [Editorial card sheet](planner/SPREAD_LIFE_CARD_ART_DIRECTION.md), [native board](planner/SPREAD_NATIVE_BRAND_BOARD.md) | [Life spec](specs/2026-11-10-life-card-visual-implementation.md), [Claude art handoff](planner/CLAUDE_EDITORIAL_ART_HANDOFF.md) |
| SwiftUI / Wallet Stack | [Native board](planner/SPREAD_NATIVE_BRAND_BOARD.md) | [iOS audit](platforms/IOS27_BEHAVIOR_AUDIT.md), [tactile contract](tactile-precision/README.md) |
| A planner screen: Week, Spread, Month, sheets, toasts, task rows, the Crown | [packs/planner-change.md](packs/planner-change.md) | [planner/SPREAD_DESIGN_SYSTEM.md](planner/SPREAD_DESIGN_SYSTEM.md) sections named in the pack |
| The public landing page | [packs/landing-change.md](packs/landing-change.md) | [landing/DESIGN.md](landing/DESIGN.md) sections named in the pack |
| iPhone, iPad, Duo and resize / hinge support | [packs/device-layout.md](packs/device-layout.md) | [iOS 27 audit](platforms/IOS27_BEHAVIOR_AUDIT.md) and device guides |
| Apply iOS design language + UI/UX fundamentals | [packs/apple-native-feel.md](packs/apple-native-feel.md), [FOUNDATIONAL_UX_PRINCIPLES.md](FOUNDATIONAL_UX_PRINCIPLES.md) | [native board](planner/SPREAD_NATIVE_BRAND_BOARD.md), [iOS audit](platforms/IOS27_BEHAVIOR_AUDIT.md), [tactile motion](tactile-precision/README.md) |
| Classic/Life tactile motion and haptics | [Contract](tactile-precision/README.md) | [Implementation](tactile-precision/IMPLEMENTATION.md); Life spec wins |
| App icon, UI action icons, category badges | [brand/ICON_HANDOFF.md](brand/ICON_HANDOFF.md) | Files in `public/icons/` |
| Why a planner behavior exists, or what was verified and deferred | [planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md](planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md) (historical record) | `ROADMAP.md` |
| Wallpaper-driven personalization (Studio) | Section 5 below: it lives on a branch | |
| Recording a decision or checking what is undecided | [DECISIONS.md](DECISIONS.md) | |
| Pointing an AI tool at these docs | [AI_TOOL_SETUP.md](AI_TOOL_SETUP.md) | |

For cross-surface work, read both packs.

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
| [root parity spec](../archive/SPREAD_SWIFTUI_PARITY_SPEC.md) | Native behavior and reference provenance | Historical; five-mode direction superseded by Nov 4 owner choice |
| planner/SPREAD_DESIGN_SYSTEM.md | React planner visuals, native behavior invariants | Governs legacy UI and behavior |
| planner/SPREAD_NATIVE_BRAND_BOARD.md | Current SwiftUI: **single animated Wallet Stack**; [SVG](planner/SPREAD_NATIVE_VISUAL_SPECIMEN.svg) | Implemented on `main`; supersedes five-mode language |
| tactile-precision/: [map](tactile-precision/README.md), [motion](tactile-precision/MOTION_CONTRACT.md), [tuning](tactile-precision/ANIMATION_TUNING_GUIDE.md), [QA](tactile-precision/VERIFICATION.md) | Native tactile system | Devices owed |
| planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md | Unified UX history | Historical only |
| landing/DESIGN.md | Landing page | Highest for the landing page only, never for planner decisions. Frozen as `golden/2026-09-28-full-landing-modes` |
| platforms/APPLE_DESIGN_PRINCIPLES.md | Native controls, sheets and contrast | Platform principles; native board preserves identity |
| platforms/IOS27_BEHAVIOR_AUDIT.md | **iOS 27 adaptive layout, glass controls, UX audit and release gates** | Current 2026-11-04 checklist for native PR #127 |
| platforms/SPREAD_IPHONE_BUILD_GUIDE.md | iPhone baseline | October research; native owner board overrides older paint |
| platforms/SPREAD_IPAD_BUILD_GUIDE.md | iPad | Same as above |
| platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md | iPhone Duo | Same as above |
| brand/ICON_HANDOFF.md | Icon files and placement (SVGs stay in `public/icons/`) | Highest for icon files |

**Authority:** Shipped behavior wins. Native uses the [Wallet board](planner/SPREAD_NATIVE_BRAND_BOARD.md) and [iOS audit](platforms/IOS27_BEHAVIOR_AUDIT.md); five-mode notes are historical.

---

## 4. Where the design truth lives in code

- React planner tokens/styles: `src/styles.css`, generated [tokens.json](tokens.json). Native visual tokens: [brand board](planner/SPREAD_NATIVE_BRAND_BOARD.md); implement centrally in SwiftUI.
- Role colors: `ROLE_COLORS` and hat `color` in `src/lib/spread/model.ts`.
- Theme: `applyTheme` in `src/lib/spread/store.ts` and the pre-paint script in `src/routes/__root.tsx` are the only writers of `data-theme`. Do not reuse it for a custom look.
- Landing: `src/spread/screens/spread-app.tsx` (`UnlockScreen`) and `src/spread/components/landing-*.tsx`.
- Icons: `public/icons/`. Fonts: `public/fonts/inter-latin.woff2`.

---

## 5. Studio (wallpaper-driven personalization)

Studio's original rebuild proposal is [historical](specs/2026-10-28-studio-rebuild.md). Studio-related work has since merged into `main`; inspect source and actual flags before claiming a particular native appearance is enabled. Studio does not override the current Wallet/Life design authority.

---

## 6. Historical supporting material

Root native handoffs (`docs/archive/CLAUDE_NATIVE_UI_HANDOFF.md`, `docs/archive/SPREAD_NATIVE_UI_REMAINING_SPEC.md`, `docs/archive/SPREAD_SWIFTUI_PARITY_SPEC.md`) do not override the Wallet board. Evidence and release records stay separate; concept art is not native test evidence.

---

## 7. Keeping the brain healthy

- Put new guidance in its scoped document; add map/router links. Every design doc links back here. Date specs in `specs/`.
- One home per fact. Link, don't duplicate. Only generated rules-card blocks are copied.
- After editing `src/styles.css` tokens run `npm run docs:tokens`. After editing the rules card run `npm run docs:sync`. `npm run docs:check` (also in `test:scripts` and CI) fails when either is stale, when a link or pack pointer breaks, or when a tier passes its budget.
- A document over 6 KB opens with a `> Summary:` line under its breadcrumb. Keep section headings short and stable, because packs point at them; if you rename one, fix the pack the check names.
- Record a decision in the document it changes and in [DECISIONS.md](DECISIONS.md), and remove it from the open list. When a document is superseded, say so at its top and name its replacement. Do not delete history.

