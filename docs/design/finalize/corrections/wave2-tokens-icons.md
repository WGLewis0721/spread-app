# Correction: wave-2 tokens and icon assets still to add

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision: **resolved** (OD11, OD16, OD17 in the planning doc section 8). Implementation: **wave 2, open**.

| Field | Value |
| --- | --- |
| Screens | N06 navigation rail and week navigator, N19 task sheet, N34 undo notice, N35 Focus sheet |
| Severity | Low: the decisions are made; the assets and tokens are not in code yet |
| Owner decision needed | None |

## Observed on main

- **Icons (OD11).** Lucide is used for custom controls. The icon handoff says SF Symbols are used for alerts, specialised controls and tiny calendar markers. Lucide assets not yet in `Resources/Icons.xcassets` are `plus`, `coffee`, `eye`, `copy`, `arrow-left-right`, `rotate-ccw`, `rotate-cw` and `circle-help`.
- **Disabled controls (OD17).** Disabled controls have no shared token. The planned token is `Spread.disabledOpacity` at 0.4.
- **Scrim (OD16).** The Week sidebar scrim stays at its current strength for now. Wave 2 names it as a token. No value changes.

## Decided by the planning doc (section 8)

- **OD11.** Icons follow `ICON_HANDOFF.md`. Revert the overdue ineligible marker to `exclamationmark.circle` and the calendar-strip day check to SF `checkmark` (lane C now). Add the eight Lucide assets in wave 2.
- **OD16.** Keep the scrim strength. Name it as a token in wave 2.
- **OD17.** Add `Spread.disabledOpacity` (0.4) in wave 2 and route disabled controls through it.

## Safe corrective plan

1. Lane C reverts the two SF Symbol markers under OD11 now, in its own PR.
2. Lane A adds `Spread.disabledOpacity` and the scrim token in wave 2, with no visual change except disabled controls.
3. Add the eight Lucide assets from the existing Lucide set and its license file in `Resources/`, with an `ICON_HANDOFF.md` line per asset. No new dependency.

## Before and after evidence

None yet. Native, so it needs a device run from a candidate SHA.

## Regression scenarios

- Disabled buttons on the task sheet, Focus sheet and rail dim to the same opacity.
- The scrim matches its previous strength pixel for pixel in both modes.
- The icon set contains each asset named in OD11 and no unused replacement.

## Added by the cross-surface review (base `6f53a60`, 2026-11-14)

Source: [../CROSS_SURFACE_REVIEW.md](../CROSS_SURFACE_REVIEW.md), finding X6 and covered findings C6 and C7.

- **Rail toggle has two glyphs (X6, low).** `Shell/PlannerNavigationRail.swift:57` uses SF `sidebar.left` and `sidebar.right`. `Shell/SpreadLiveRoot.swift:552` uses Lucide `lucide-panel-left` for what appears to be the same rail. Fix: one Lucide glyph in both places (lane A). Confirm on device that both toggle the same rail.
- **Undo notice uses an SF glyph (X6, low).** `Shell/SpreadLiveRoot.swift:799` uses SF `arrow.uturn.backward`. The ICON_HANDOFF Nov 13 section puts custom controls in Lucide. OD11 names `rotate-ccw` for undo, so lane W2-2 should map the notice to it.
- **Icons (OD11): assets in code, PR #217.** The eight Lucide assets are in `Resources/Icons.xcassets` (C7 closed). Their device check is still owed. The undo notice and the rail toggle still use SF glyphs (X6 open).
- **Still open, grep on 2026-11-14.** `Spread.disabledOpacity` is not in code (C6, lane W2-3). The scrim token (OD16) was not checked in this update.

## Haptics (OD31)

Source: [../CROSS_SURFACE_REVIEW.md](../CROSS_SURFACE_REVIEW.md), finding X4. Owner decision OD31, recorded in [the plan, section 8](../../specs/2026-11-14-publish-finalize-plan.md). Decided, not yet in code (wave 3).

- **The only success haptic is completion.** The light impact fires when a task is completed, and only after the store accepts it (`Planner/LivePlanner.swift:487`).
- **Kept (brand board "Feedback"):** discrete detent ticks on steppers and week steps; the Edit enter and leave cue; the reveal snap on Manage and Delete.
- **Kept, rate-limited:** one warning at a boundary or before a destructive confirm.
- **Dropped:** the success impact after removing a responsibility (`Spread/SpreadSurface.swift:969`). The visible change and Undo already confirm it.
- **Gates:** all haptics are iPhone only and skip when the system turns haptics off (`Theme/SpreadTheme.swift:332-335`).
- **Code owners (wave 3):** lane A (`SpreadHaptics`, `Theme/SpreadTheme.swift:330-374`), with the call sites in lanes C and D.
- **Device check:** [../DEVICE_TEST_SCRIPT.md](../DEVICE_TEST_SCRIPT.md) step I6 counts the taps and checks the completion-only rule.

## OD33 items on this register

- **X6 icons.** Lucide `panel-left` for the rail toggle (`Shell/PlannerNavigationRail.swift:57` and `Shell/SpreadLiveRoot.swift:552`), and `rotate-ccw` for the Undo notice (`Shell/SpreadLiveRoot.swift:799`). Wave 3, lane A.
- **Also decided by OD33** (recorded in their own records): X7 dead Crown code, X8 "Cancel", X10 "Cancel session" on the timer widget, X11 empty-list sentences, X12 widget colour tokens.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the wave-2 commit. The tokens and assets are additive.
