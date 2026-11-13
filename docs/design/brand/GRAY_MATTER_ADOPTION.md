# Gray Matter app-design adoption — Spread (2026-11-13)

> Part of the [Spread design brain](../README.md). Scope: existing product icon consistency and a reusable corrective workflow, **not** a ground-up redesign.

**Source:** [Gray Matter reusable app-design library](https://github.com/WGLewis0721/Graymattertechllc-/tree/main/app-design), checked against Spread `main` on November 13, 2026. The Gray Matter library was partly derived from Spread. This adoption **links to it**, rather than cloning divergent copies of the same instructions.

## Authority and inventory

Spread's approved native [brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), [UI kit](../ui-kit/UI_KIT.md), [design router](../README.md), [rules card](../RULES_CARD.md), and verified source win over generic templates. The shipped app is SwiftUI; React planner is parked. Retain all current Life/Week/Classic screens and local-first behavior. No cloud, accounts, product schema, app launcher identity, wallpaper, marketing design or release changes are in scope.

| Gray Matter guidance | Spread adoption | Verification / gate |
| --- | --- | --- |
| [Design System](https://github.com/WGLewis0721/Graymattertechllc-/blob/main/app-design/DESIGN_SYSTEM.md) | Reuse native palette, SF typography, spacing and existing motion; no parallel token store | Light/dark, Dynamic Type, contrast |
| [Design-to-Build Contract](https://github.com/WGLewis0721/Graymattertechllc-/blob/main/app-design/DESIGN_TO_BUILD_CONTRACT.md) | Inventory existing screens before touching them; implement and test real assets, not empty mockups | Source diff, named-screen regression list |
| [Editorial Card and Artwork](https://github.com/WGLewis0721/Graymattertechllc-/blob/main/app-design/EDITORIAL_CARD_AND_ARTWORK.md) | Keep Life art separate from live hours/names; category pictograms are not flattened artwork | Card legibility, gesture/touch, data parity |
| [iOS Playbook](https://github.com/WGLewis0721/Graymattertechllc-/blob/main/app-design/IOS_PLAYBOOK.md) | Preserve SwiftUI native affordances and SF Symbols for system controls | iPhone, iPad layout where supported, VoiceOver |
| [Creative Asset Production](https://github.com/WGLewis0721/Graymattertechllc-/blob/main/app-design/CREATIVE_ASSET_PRODUCTION.md) | AI/Higgsfield is optional for category illustrations, **not** small interaction glyphs | Licensing, source files, crop/text-safe zone |
| [UI Automation and Evidence](https://github.com/WGLewis0721/Graymattertechllc-/blob/main/app-design/UI_AUTOMATION_AND_EVIDENCE.md) | Pair static icon parity tests with real visual/device review | Tests plus native build and screenshots |
| [Upgrade and Corrective Workflow](https://github.com/WGLewis0721/Graymattertechllc-/blob/main/app-design/UPGRADE_AND_CORRECTIVE_WORKFLOW.md) | Inspect baseline → focused branch → parity checks → compare screens → fix regressions or revert | PR review, no auto-merge |

## Decision and delivered scope

**Icon source:** [Lucide](https://lucide.dev) (ISC-licensed), already used for ten Life category icons and present as `lucide-react` for the React project. [Phosphor](https://phosphoricons.com) (MIT) was evaluated as an alternative but would create a second design family and unnecessary migration. Higgsfield is better reserved for art backgrounds with coherent illustration styles; generating microscopic button icons introduces blur, shape drift and weak accessibility.

**Preview:** [16 utility icons on light/dark surfaces](ICON_GALLERY.svg) (asset review only; not an application screenshot).

**Implementation:** Align 16 shared SVG utility controls to the same Lucide 24×24 grid and 2pt round-stroke rules as category glyphs. Ship identical React SVG and iOS asset-catalog paths; preserve all existing logical names, bindings, colors, labels, tap targets, semantics, SF Symbols, native UI behavior and brand art. [Icon mapping and license ownership](ICON_HANDOFF.md) is the single detailed source. No new dependencies.

**QA to complete before merge:** run `npm run test:scripts`, `npm run typecheck`, `npm run lint`, and `npm run build` when a checkout with dependencies is available; build native Swift package/app in Codemagic; compare existing Life, Week, Classic, More/Settings screenshots in both appearances, at small and large text sizes. Record visual regressions and correct them on the PR. Static vector parity is not App Store/device verification.

**Rollback:** revert the icon commit. Product data and the golden version remain untouched while the PR is unmerged.
