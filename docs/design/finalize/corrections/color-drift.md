# Correction: color and token drift across role colors and surfaces

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision: **Health is resolved** (OD21, teal `#30B0C7`); the landing sample is updated in this PR. OD23 settles the gradient. On main the `model.ts` Health default is still `#007AFF` (wave 2), and the native hardcoded values remain. Both are open.

| Field | Value |
| --- | --- |
| Screens | P03 How it works, N02 Spread, N11 Hours |
| Severity | Medium: role color means a different thing in different places |
| Decided | OD21: Health teal `#30B0C7` everywhere, which also ends the School and Health blue collision. OD23: keep the accent gradient on the one lit action per surface |

## Observed

- **Health role color.** The default role is `#007AFF` (`src/lib/spread/model.ts:117`). The Health category is `#30B0C7` (`model.ts:89`). The landing page's Health sample is `#0a84ff` (`landing-sections.tsx`). The brand board's `role-health` is `#0A84FF` (`docs/design/landing/DESIGN.md`).
- **Shared blue.** The School category is also `#007AFF` (`model.ts:87`), the same value as the default Health role (`model.ts:117`). Within one profile this makes two different roles look alike.
- **Native hardcoding.** Outside `Theme/`, native source has 57 `Color(` calls, of which 55 are `Color(hex:)` or `Color(red:)`. Some `Color(hex:)` calls read role data, so not all are violations. It also has 12 `.font(.system(size:))` calls outside `Theme/`. Counts were taken in this pass; per-line detail belongs to `TOKEN_AUDIT.md` (lane A, not in this branch).
- **Gradient fill.** `Spread.accentGradient` fills the Classic empty-state button (`SpreadLiveRoot.swift:468`), a selected segment (`:634`), another capsule (`:784`), `ManageSheets.swift:49`, and two places in `SpreadLayouts.swift` (`:395`, `:466`). The brand board describes solid surfaces for content, and the Crown gradient is retired. The board does not say whether primary buttons may use a gradient.

## Expected

One value per role color, used everywhere the role appears. Native values come from `SpreadTheme` tokens. The owner decides whether primary button fills are solid.

## Root cause

Role colors were defined in several files as the feature grew. The landing sample copied the brand board value, and the planner kept its own.

## Affected files

- `src/lib/spread/model.ts` (not changed here)
- `src/spread/components/landing-sections.tsx` (lane E, landing only)
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift` and the files listed above (lanes A to D)

## Safe corrective plan

1. Owner picks the canonical Health blue. Until then the landing sample stays on the brand board value, which is the only documented source. This lane does not edit `model.ts`.
2. Landing: replace hardcoded role hex values in its sample data with one local constant that is documented as matching the brand board. Do not import planner data into landing (landing rule).
3. Native: lanes A to D move hardcoded values to tokens and report each one in their PR.
4. Gradient: owner decides; a solid fill is a visible change and needs device evidence.

## Before and after evidence

Landing before and after captures are in `evidence/landing/`. Native evidence is not available (no device run).

## Regression scenarios

- Each role color appears the same on Week, Life, the widget and the landing sample.
- Light and dark values are checked for contrast (role text and dots, not color alone).
- Reduce Transparency and Dynamic Type do not change role identity.

## Reviewer approval

Empty. Not closed.

## Rollback

Each lane reverts its own commit. Landing data is illustrative only, so a rollback has no planner effect.
