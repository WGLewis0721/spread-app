# External UI reference repositories

> Part of the [Spread design brain](../README.md). Read the [Spread UI Kit](UI_KIT.md) first.
>
> Summary: Vetted, **optional** GitHub references for SwiftUI, React, AI-assisted design and planning. They are research inputs, not approved dependencies or replacements for Spread's design system.

**Checked:** November 11, 2026 (public GitHub repository metadata and project documentation). Recheck APIs, maintenance, licenses and accessibility before copying code. Availability, terms and package versions can change.

## Authority and adoption boundary

1. **Spread wins:** [Native Brand Board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), existing `Spread` SwiftUI tokens, [UI Kit](UI_KIT.md), and current working planner code govern the iOS app. The marketing site has separate [landing rules](../landing/DESIGN.md).
2. **Native-first:** Spread's shipped product is native SwiftUI; the older React planner is parked. React libraries are **reference/future-web only** unless a separately approved task applies to the current website.
3. **Reference, don't migrate:** Prefer a proven interaction or component pattern, reimplement with existing Spread primitives when reasonable, and avoid extra packages, font systems, UI frameworks, screen navigation or competing token stores. No dependency installation is authorized by this research.
4. **Commercial use:** Review the exact repo license and all transitive dependencies, assets, attribution, maintenance and security before importing. A GitHub example is not permission to copy another app's branding.

## Native SwiftUI — consult first

| Repository | Study for | Adoption / maintenance caution |
| --- | --- | --- |
| [SwiftfulUI](https://github.com/SwiftfulThinking/SwiftfulUI) | Native press/gesture modifiers, scrolling and reusable control composition | MIT; pattern and source reference first. Compare against existing `SpreadTactile`, haptics and Wallet gestures before adding any package. |
| [SwiftUI Catalog](https://github.com/barbaramartina/swiftuicatalog) | Native controls, containers, Dynamic Type and accessibility examples | MIT; educational catalog, not a drop-in Spread theme. |
| [ThemeKit](https://github.com/isamercan/ThemeKit) | Token-bound SwiftUI components, theming, validation and AI-agent conventions | MIT, pre-1.0; project documents **Swift tools 6.2** while Spread declares **5.9** in `ios/SpreadNativeV2/Package.swift`. Architectural reference only until a separately verified compatibility/upgrade plan exists. |
| [swiftcn-ui](https://github.com/Mobilecn-UI/swiftcn-ui) | Source-owned UI control patterns (buttons, inputs, cards, sliders) | MIT; README solicits a maintainer and the code's latest push was in 2024. Inspiration, **not a new core dependency**. |
| [Apple Food Truck](https://github.com/apple/sample-food-truck) | Official SwiftUI/iPhone/iPad layout and navigation patterns | MIT; WWDC22 sample illustrates platform techniques, not Spread's storage model, app architecture or visual identity. |

**Native review order:** Apple HIG and native app behavior → SwiftUI Catalog / Apple sample → SwiftfulUI for a missing interaction → ThemeKit for token architecture research. Use a SwiftUI implementation only after checking VoiceOver, Dynamic Type, Reduce Motion, focus, iPhone/iPad layouts and Codemagic compilation.

## React / web — references, not a native retrofit

| Repository | Study for | Fit / caution |
| --- | --- | --- |
| [Astryx](https://github.com/meta/astryx) | Meta's agent-ready design-system structure and shared component conventions | MIT; React/StyleX ecosystem, **not SwiftUI**. Inspiration for documenting components, not a replacement for native Spread. |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Editable component source, variants and design-system composition | MIT; optional React architecture reference. Do not transplant components into SwiftUI or restart the parked planner. |
| [React Aria / React Spectrum](https://github.com/adobe/react-spectrum) | Accessible control behaviors and interaction testing | Apache-2.0; web-only reference, especially keyboard/screen-reader patterns. |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) | Motion affordances and transition storytelling | MIT, beta; React + Motion + Tailwind. Recreate intent with existing native motion, not its web runtime. |
| [shadcn/lint](https://github.com/shadcn-ui/lint) | Agent-readable, enforceable style rules and component contracts | MIT; designed for **Tailwind v4** (which exists in the repo), not SwiftUI linting. Evaluate narrowly against live web styles before enabling. |

## AI discovery and weekly planning references

- [21st MCP (formerly Magic MCP)](https://github.com/21st-dev/magic-mcp): The repository is now a **compatibility proxy**. New setup and current tool information live at [21st.dev/mcp](https://21st.dev/mcp). Requires an account/API key; catalog search and AI generation have different access/plan requirements. Use it to **find** React examples, never to automatically install or overwrite Spread UI. No key or connector is configured by this document.
- [ThisWeek](https://github.com/jeot/thisweek-web): MIT-licensed, offline-first web weekly planner. Study information density and week-first task flow only. Its storage/architecture is not evidence of Spread parity.
- **SevenFlow:** Previously suggested as a planning reference, but its repository could not be re-verified with the GitHub repository API on November 11, 2026 (404). Treat its availability and provenance as **unverified**, not an approved code source.

## Review workflow for an AI coding agent

1. Read the [rules card](../RULES_CARD.md), [design map](../README.md), [UI Kit](UI_KIT.md), relevant native/web spec, and current source **before** external examples.
2. Define one concrete UX gap and compare **at most 2–3** patterns. Record why the current Spread component is insufficient; do not import a whole kit to fix one detail.
3. Map the chosen pattern to existing `Spread` tokens, spacing, typography, existing artwork, accessibility states, and authoritative planner actions. Reference external licenses if code or assets are copied.
4. Build on a focused branch and verify interaction direction, constraints, persistence, VoiceOver, Dynamic Type, Reduce Motion, screenshots, relevant tests and rollback. Native code requires Codemagic/device evidence, not GitHub CI alone.
5. Document the chosen pattern in the owning component spec. **No design authority or dependency changes without owner approval.**

**Selection rule:** Use external repositories to raise quality, not to grow Spread's dependency surface or create a second design system.
