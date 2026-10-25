# Spread Studio — research reconciliation and decision log

**Research date:** 2026-10-25. This captures product decisions after two rounds of Grok and Perplexity assessments, plus direct repo checks. External LLM research is *input*, not an authoritative source; Apple documentation and checked repository code take precedence. See [RETRIEVAL_PROTOCOL.md](RETRIEVAL_PROTOCOL.md) for the verification process.

## How the decision evolved

1. Concept mockups depicted different lifestyles (tradesperson, civic office, executive family, vintage computer creator, convention attendee). These are **visual inspirations**, not implemented screens or identity classes.
2. Initial recommendation: static templates plus curated, premade theme packs. User **rejected this as the target**.
3. Confirmed direction: bring iOS-style personalization and Android-launcher/jailbreak-era visual freedom *inside Spread*. People import **their own wallpapers**, match colors, choose materials/typography/components, and save their own looks. No premade franchise, occupation or team themes.
4. AI direction: Apple on-device Foundation Models may help translate verbal/written requests into settings on eligible devices. Users still have complete manual control; model suggestions preview first. No hosted AI is required for the local appearance feature.
5. Siri direction: a separate optional App Intents/Shortcuts surface for user-invoked actions, beginning with foreground Studio handoff. New Siri AI has distinct, potentially narrower availability; never promise it as an embedded chat assistant or guarantee complete offline Siri processing.
6. Delivery: four cumulative 25% slices: basic user-controlled appearance → expressive engine → local AI suggestion/refinement → Siri/native integration and hardening.

## Cross-model architectural comparison

| Approach | Grok | Perplexity | Decision |
| --- | --- | --- | --- |
| React tokens and shared UI | Favored a strict manifest-based approach | Favored flexible token/component composition | Adopt a shared bounded renderer; no separate per-theme screen forks |
| Prebuilt visual theme packs | Originally proposed; later revised | Proposed curated packs and variants | **Rejected by user**: users customize their own looks; finite rendering primitives are still bundled |
| Responsibility templates | Initially high priority | Useful onboarding independent of theme | Not within this Studio appearance scope; may be a separate planner feature later |
| Local AI | Typed Swift bridge, suggestion-only | Swift Foundation Models with availability, evaluation and deterministic validation | Adopt for Phase 3; no automatic commit |
| Siri | Thin native command inbox proposed | Foreground bridge first; shared native task database only for background CRUD | Foreground Studio intents first; native inbox is optional spike |
| Full SwiftUI rewrite | Not recommended | Not recommended | Reject |
| Native transactional data core | Not essential for basic Studio | Recommended only if reliable background task edits become necessary | Defer; requires separate authorization and migration study |
| Widgets/Focus/alternate icons | Secondary | Selective optional integrations | Consider in Phase 4 only where they directly improve Studio |

## Important corrections to prior conversation/research

- A user-selectable Falcons/Toy Story/Avengers wallpaper is not the same as Spread bundling or marketing official NFL/Disney/Marvel art. User-supplied private wallpaper support is normally a different legal and product scenario, but **private use is not a blanket copyright exception**, and public sharing/redistribution requires review.
- The Foundation Models framework in 2026 includes on-device and optional cloud/other-provider capabilities. For Spread's **offline** promise, explicitly choose and verify the *on-device* model; image generation through the updated Image Playground is a separate service and not part of local Studio.
- A local language model **can interpret and propose a design spec**, not independently implement arbitrary new safe React screens or produce official character artwork. Local deterministic sampling can supply wallpaper colors without any AI inference.
- `data-theme` is currently reserved for light/dark/system and **must not be reused for a custom personality identifier**.
- A native recovery mirror of WebView localStorage is **not** a shared live database for Siri or widgets. Background task CRUD would need more architecture than a simple Capacitor call.
- Perplexity reported failure to access the repository. Our direct GitHub inspection succeeded on `main@d6fb09c`; refer to source paths, not Perplexity's unverified assumptions.
- One earlier response over-promised styling 'any movie/team automatically'. Reality: successful output is bounded by the controls and assets Spread actually implements; brand-new images and exact copyrighted branding are not automatically supplied.
- The shipped design rules ban extra styles/colors; Studio requires **owner-approved exception/extension**, not stealth changes.
- The model lacks calendar start/end times and recurrence. Appearance work must not add calendar features under a stylistic label.

## Architecture decision record

- **Chosen now:** React-first user-created appearance system; local image asset storage; controlled design-token and material/asset renderer; optional Swift Foundation Models proposal bridge and foreground App Intents.
- **Authority:** Current code/data behavior wins over older conversation screenshots, mockups and strategy documents. User-approved Studio product scope wins over preliminary LLM recommendations for premade themes.
- **Not chosen:** SwiftUI replacement; mandatory AI; external prompt-to-app generation; automatic cloud image creation; native data migration; occupational themes; social theme marketplace; background planner writes.
- **Deferred evaluation:** Focus, widgets, alternate bundled app icons, Siri command inbox, native database.
- **Release rule:** implementation on feature branches, proof-based acceptance, no merge/deploy without explicit user authorization.

## Open questions requiring owner or implementation-team decision

1. Allowed manual adjustment ranges and the exact 'glass/metal' renderer presets versus performance limits.
2. Persistence of named custom appearances across iCloud: local-only first or explicitly opt-in asset sync? Do not silently sync images.
3. Backup/export behavior for media: separate image package, omit with warning, or embed constrained copies.
4. Whether custom appearance follows Spread profile or can be selected across profiles without duplicating photo bytes.
5. Whether Part 4 should include any of widgets, Focus, alternate icons beyond core Siri foreground integration; do not inflate scope automatically.
6. What user research demonstrates actual usability/retention benefit and acceptable customization effort.
7. Native Swift/Xcode deployment matrix at implementation, including iOS 26/27 differences and Siri AI beta constraints.
8. Legal/commercial review if Spread later distributes third-party imagery or encourages public wallpaper sharing.
