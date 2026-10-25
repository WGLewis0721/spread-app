# Spread Studio — personalization knowledge hub

**Status: PROPOSAL ONLY.** This directory records the approved product direction and proposed engineering work; it does not mean Studio, on-device AI, Siri actions, widgets, or appearance controls have shipped. The verified baseline is the repository's `main` branch. Do not alter or merge into `main` without explicit approval.

**Assembled:** 2026-10-25. **Source baseline at research:** `main` commit `d6fb09cbd609e3f9a5a8aea8f0faf60a1ec63012`. Recheck `main` immediately before any implementation; branch documents may become stale.

## Product decision

Spread Studio gives people iOS-like/Android-launcher-level creative control **inside Spread**: their own wallpapers, matching palettes, transparency, surfaces, typography, and approved presentation variations. The original planner remains fully usable with no customization or AI. **Do not build premade occupational, fandom, team, or movie theme packs.** The user's visual inspiration drives the appearance.

An optional on-device Apple Foundation Models assistant translates a request into editable appearance settings; Siri/App Intents can invoke supported actions where available. **The on-device language model cannot create arbitrary app UI or official intellectual-property artwork on demand.** Spread's deterministic appearance renderer does the work. AI never writes planning data or executes generated code.

## Canonical shared contract decision

**2026-10-25:** [Draft PR #81](https://github.com/WGLewis0721/spread-app/pull/81) is the **single Gate 0 contract candidate** (`src/lib/spread/studio/contract.ts`, `StudioAppearanceV1`). [PR #80](https://github.com/WGLewis0721/spread-app/pull/80) was closed as a redundant alternative and **must not be imported or merged**. PR #81 has not merged; agent branches must coordinate use of that proposal before coding against it. Claude reviews #81 independently. No merge/deployment approval.

## Active implementation sprint (2026-10-25)

- [Launch the five Grok agents and Claude reviewer](AGENT_LAUNCH.md) — ready-to-paste messages, branch names and links.
- [Parallel work ownership and integration gates](SPRINT_2026-10-25.md).
- [GitHub integration tracker](https://github.com/WGLewis0721/spread-app/issues/78) — live checkboxes for phases 25/50/75/100.

**Current status:** GitHub branches and issues staged. External Grok/Claude execution, code merges, tests and native-device validation have **not** been performed by this documentation work.

## Read in this order

1. [Product specification](PRODUCT.md) — intent, user journey, acceptance boundaries, customization behavior.
2. [Technical architecture](ARCHITECTURE.md) — data model, rendering, image storage, AI/Siri integration, safety.
3. [Four 25% implementation milestones](DELIVERY_PLAN.md) — ownership, scope, tests, rollback and release gates.
4. [Research reconciliation](RESEARCH_DECISIONS.md) — Grok/Perplexity proposals, corrections, open decisions.
5. [Retrieval-first agent protocol + authoritative sources](RETRIEVAL_PROTOCOL.md) — how LLMs ground responses and implementation decisions in actual source and current Apple documentation.

## Non-negotiable boundaries

- Protect the core **Responsibilities → Hours → Week → Tasks**, crown/hour banks, gesture and tap/keyboard equivalents, task ownership, undo, and local-first behavior.
- Wallpaper and appearance are independent of responsibilities; a football wallpaper does not imply an occupation, fandom identity, or planning template.
- Manual controls work on devices with no Apple Intelligence; AI is an optional convenience, never required for setup.
- The user explicitly previews, applies, resets, or removes their appearance. No AI automatic save.
- Imported personal images stay on-device by default; no uploads or external inference are a requirement.
- Private imported sports, film, and fandom images are user-provided content. Spread must not bundle or market third-party protected art/logos as its own without suitable rights; personal use is not a categorical copyright exemption.
- No new server, user account, model subscription, production deployment, or native data migration is authorized by this documentation.
- Treat existing `docs/design/SPREAD_DESIGN_SYSTEM.md` as authoritative for current shipped UI. Before adding new aesthetics, propose an explicit revision; do not silently ignore its 'no new colors/fonts/decorative styles' rule.

## Definition of complete

Studio is '100%' only after manual customization, flexible appearance rendering, optional local AI, opt-in Siri/native integrations, persistence, accessibility, data recovery, and physical-device QA have all passed the stage gates. The four percentages measure **feature-scope milestones, not equal effort**.

For AI-assisted research and coding, follow [RETRIEVAL_PROTOCOL.md](RETRIEVAL_PROTOCOL.md) before answering or changing code.
