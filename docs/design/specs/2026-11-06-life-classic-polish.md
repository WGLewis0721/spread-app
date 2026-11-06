# Life and Classic: one Spread design language

> Part of the [Spread design brain](../README.md). Owner direction, November 6, 2026.
>
> Summary: Keep Life's functional arrangement while restoring Classic's visual identity and interaction precision. Rename the picker to Life. Keep tray opening/closing controls at the same outer-edge dock position.

## Evidence and scope

Verified source baseline: main `8def6743e926204bc50398164f3963cf018fc854`.
Read the [native board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), shared SpreadTheme, Classic shell, Life root and existing More picker.

The owner reports that Classic has stronger polish, vibrancy, simplicity and precision; Life has useful functionality but weaker cues and separation. These are owner observations, not observations made from videos by this implementation.
**Both recordings have now been reviewed.** See the [Classic video specification](2026-11-06-classic-video-spec.md) and [Life video specification](2026-11-06-life-video-spec.md) for separate observations, timestamped findings and implementation requirements. Native candidate comparison remains pending.

This request supersedes Life's independent gray/black palette. Classic is the visual reference; Life retains its arrangement and capabilities. Do not repaint Classic or change planner/storage/release behavior.

## Reviewed recordings

- [Classic: design, motion and UI/UX](2026-11-06-classic-video-spec.md) — 47.93 s; complete timeline plus a denser expansion sequence.
- [Life: design, motion and UI/UX](2026-11-06-life-video-spec.md) — 15.00 s; complete timeline plus the noisy card-focus transition.

The recordings establish observed behavior in the recorded builds. Their build/OS identifiers are unavailable; they do not validate the new PR candidate.

## Shared component requirements

| Component | Requirement |
| --- | --- |
| Appearance | Life aliases Classic's canvas, elevated surface, ink, secondary ink, separator, recess and accent tokens. Shared tokens remain untouched. |
| Cards and details | Preserve Wallet selection and separate task fields; use the same card/depth vocabulary as Classic. Tune boundaries and spacing against actual native recordings/captures. |
| Icons and type | Original Spread assets and system semantic typography; same hierarchy and action meaning in both arrangements. |
| Motion | Reuse Classic's purposeful motion vocabulary. No ornamental motion, repeated haptics or arbitrary navigation shifts. Video calibration pending. |
| Cues | Selected, expanded, editable, saving, rejected and completed states must be identifiable without color alone. |
| Tray opening | With Crown right: opener, Add, Crown. With Crown left: Crown, Add, opener. Opener stays nearest its screen edge. |
| Drawer | Opens from the opener's edge. Navigation content scrolls independently; Close is pinned at the bottom. |
| Tray closing | Close matches the opener's horizontal dock column and vertical center. Measure actual dock controls rather than assume a fixed Crown height. |
| Accessibility | At least 44-point controls; Dynamic Type reflow, reduced motion/transparency, contrast and focus restoration. |

## Implemented slice and remaining work

Implemented: picker says Life; shared Classic tokens; mirrored tray controls and measured Close alignment; original card artwork, role gradient/edge/depth, stable full-width focus, clearer hours summary/history controls and shared motion tokens.

Completed: both video reviews and the recorded design/motion/UI/UX specifications. Pending: matched before/after candidate captures, remaining visual calibration and native/device acceptance.
Do not claim that a Swift syntax pass proves appearance or interaction quality.

## Acceptance and rollback

Verify left/right at standard and accessibility sizes, portrait/landscape and compact/iPad widths. Open/close must not change week, selection or planner data. Compare opener/Close frames and ensure scrolling cannot dislodge Close. Verify picker still persists the existing flag and Classic is reachable.

Revert this focused branch for rollback; no schema or planner migration is introduced. Changes require a reviewed PR; no merge, distribution or production deployment is authorized by this request.
