# Correction: color and token drift across role colors and surfaces

> Summary: Wave 3 lane D landed X12. The Life cards widget reads one named set of ink, secondary and canvas values from `SpreadWidgetShared.swift`, which the widget target compiles, so it no longer repeats the hex literals. Lane D's sheet and focus files also use 100 exact-value spacing and touch-target tokens. Native colour literals in lanes A to C and the widget's opacity overlays remain. The record stays open until a reviewer approves it.

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision: **Health is resolved** (OD21, teal `#30B0C7`). The landing sample is updated, and the `model.ts` Health default was closed by PR #218 (2026-11-14). The native category colour already matched. OD23 settles the gradient. The native hardcoded values and the widget literals remain open.

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

## Added by the cross-surface review (base `6f53a60`, 2026-11-14)

Source: [../CROSS_SURFACE_REVIEW.md](../CROSS_SURFACE_REVIEW.md), finding X12 and covered findings C2 and C4.

- **Widget literals (X12, low, decided by OD33: widget colours read the shared tokens, wave 3).** `ios/App/SpreadWidget/SpreadLifeCardsWidget.swift:141-185` hard-codes `F7FAFF`, `B0BCD1`, `0E1A2E`, `4A5670` and `F4F1EA`. The first two duplicate the ink and secondary tokens. Fix: read tokens through a shared widget file or a widget colour set (lane D with lane A).
- **Health default (C4, closed).** `src/lib/spread/model.ts:117` is `#30B0C7` after PR #218 (2026-11-14). The native category colour (`Spread/SpreadSurface.swift:694`) already matched.
- **Native hardcoding, re-counted.** Outside `Theme/`, grep on 2026-11-14 finds 41 `Color(hex:)` or `Color(red:)` calls and 11 `.font(.system(size:))` calls. The earlier figures above came from an earlier pass. Lane W2-3 adopts tokens.

## Applied in wave 3 (lane D, W3-5)

- **X12, widget literals: done.** `Widget/SpreadWidgetShared.swift` now holds one named set, `SpreadWidgetTokens`, with the ink, secondary and canvas values for light and dark. It is in the file the widget target already compiles, and the widget target cannot compile `Theme/`, so the set mirrors `SpreadTheme`. `SpreadLifeCardsWidget.swift` reads it. The values are unchanged. `scripts/native-today-widget.test.mjs` checks that the widget set and `Theme/SpreadTheme.swift` hold the same values.
- **Native literals in lane D's files: spacing and touch targets.** 100 exact-value literals in `Sheets/` (except `BackupRestoreSheet.swift`) and `Focus/SpreadFocusTimerSheet.swift` now use `Spread` tokens. Each token has the same value, so nothing moves on screen. Snap and Decide rows are unchanged (`TOKEN_AUDIT.md`, section 7). No colour changed in these files; role colours stay as data.
- **Left in the widget.** The white and black opacity overlays and the `Color(red:)` panel tone in `SpreadLifeCardsWidget.swift` have no shared token yet. `TOKEN_AUDIT.md` lists them as blocked.

Still open: native colour literals in lanes A to C, the Decide and Snap rows, and the widget overlays above. Reviewer approval is needed to close this record.

## Reviewer approval

Empty. Not closed.

## Rollback

Each lane reverts its own commit. Landing data is illustrative only, so a rollback has no planner effect.
