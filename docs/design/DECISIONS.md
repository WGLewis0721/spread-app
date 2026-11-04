# Open design decisions and decision log

> Part of the Spread design brain. Start at [README.md](README.md) for the map and the router.

Resolve an open decision here and in its source document together, then move the row to the log. Not needed for ordinary tasks; read it when a task touches one of these topics or when you record a decision.

## Open decisions

| Decision | Where it is described |
| --- | --- |
| Completion haptic: light impact (current) or notification success; make haptics optional in-app | [iPhone guide](platforms/SPREAD_IPHONE_BUILD_GUIDE.md), "5. Haptics" and "10. Open items" |
| Dynamic Type: honor system text size or not | iPhone guide, "6. Accessibility and appearance" and "10. Open items" |
| React dark base: `#121212` or black; remains open for existing React UI. Native SwiftUI approved deep navy target is separate. | iPhone guide, "6a. Dark palette rules"; [native board](planner/SPREAD_NATIVE_BRAND_BOARD.md) |
| Landing palette in dark mode: give sage, peach and paper dark variants or keep it light only | iPhone guide, "6a. Dark palette rules" |
| Health role color across app, site and film (blue in the app, `#5856D6` in the film; teal `#30B0C7` proposed for the icon set) | iPhone guide "8. App Store assets for iPhone"; [brand/ICON_HANDOFF.md](brand/ICON_HANDOFF.md) |
| Privacy manifest audit (affects review; touches design only through disclosures) | iPhone guide, "10. Open items" |
| React blur on cards/sheets remains open. Native SwiftUI has owner-approved bounded edge light and restrained system material. | [Apple principles](platforms/APPLE_DESIGN_PRINCIPLES.md); [native board](planner/SPREAD_NATIVE_BRAND_BOARD.md) |
| Whether `prefers-reduced-transparency` and `prefers-contrast` reach the WKWebView | APPLE_DESIGN_PRINCIPLES.md, "3. What a web layer can and cannot do" |
| Radius tokens `--radius-card`, `--radius-sheet`, `--radius-control` exist in `styles.css` but no component uses them; cards use `rounded-3xl`. Adopt the tokens or delete them | [tokens.json](tokens.json) `radiusTokensUsedByComponents` |
| iPad: physical device pass, multiple windows, menu bar and shortcuts, pixel-diff harness | [iPad guide](platforms/SPREAD_IPAD_BUILD_GUIDE.md), "9. Open items" |
| Duo: web chrome versus native vertical bars; fold handling for web sheets and the To place tray; fold-state plugin; physical Duo test; Duo screenshots | [Duo guide](platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md), "12. Open items" |
| Xcode 27.1 final or beta | iPhone guide, "10. Open items" |

## Decision log

| Date | Decision | Where |
| --- | --- | --- |
| 2026-09-28 | Landing direction frozen as `golden/2026-09-28-full-landing-modes` | landing/DESIGN.md |
| 2026-10-08 | HIG polish for the planner: Crown, capacity bar, edit mode, Week empty days, Month Today marker, global arrows | planner/SPREAD_DESIGN_SYSTEM.md |
| 2026-10-21 | Device build guides researched (iPhone, iPad, Duo) | platforms/ |
| 2026-10-27 | Narrow Studio design exception, flag-gated, on the Studio branch only | README.md, "Studio" |
| 2026-10-28 | All design documents consolidated under `docs/design/`; Apple design principles added | README.md |
| 2026-10-28 | Plan and spec protocol, spec template and AI tool entry points added; docs link check added to CI | PLAN_SPEC_PROTOCOL.md, AI_TOOL_SETUP.md |
| 2026-10-28 | Docs restructured in tiers so agents load less: rules card synced into the always-loaded files, task packs, generated `tokens.json`, size budgets | README.md, packs/, RULES_CARD.md |
| 2026-11-03 | SwiftUI must preserve working planner behavior, Chalkboard assets and five modes; original screenshots guide information architecture. | [root parity spec](../../SPREAD_SWIFTUI_PARITY_SPEC.md) |
| 2026-11-03 | Owner approved an **updated native-only** deep-navy/luminous-blue brand board. It supersedes the legacy quiet-palette restriction for PR #119 SwiftUI visuals only; React/landing/data/release remain unchanged. | [native board](planner/SPREAD_NATIVE_BRAND_BOARD.md), [Claude handoff](../../CLAUDE_NATIVE_UI_HANDOFF.md) |
