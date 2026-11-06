# Life and Classic: one Spread design language

> Part of the [Spread design brain](../README.md). Owner direction, November 6, 2026.
>
> Summary: Keep Life's functional arrangement while restoring Classic's visual identity and interaction precision. Rename the picker to Life. Keep tray opening/closing controls at the same outer-edge dock position.

## Evidence and scope

Verified source baseline: main `8def6743e926204bc50398164f3963cf018fc854`.
Read the [native board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), shared SpreadTheme, Classic shell, Life root and existing More picker.

The owner reports that Classic has stronger polish, vibrancy, simplicity and precision; Life has useful functionality but weaker cues and separation. These are owner observations, not observations made from videos by this implementation.
**Neither requested video was attached to this conversation. Separate video analyses, timestamps, motion measurements and visual acceptance remain pending.**

This request supersedes Life's independent gray/black palette. Classic is the visual reference; Life retains its arrangement and capabilities. Do not repaint Classic or change planner/storage/release behavior.

## Classic video spec — awaiting recording

| Review dimension | Existing documentary/source authority | Video evidence still needed |
| --- | --- | --- |
| Design | Shared semantic navy/cream surfaces, original category art/glyphs, metallic Crown, bounded role accents | Actual installed colors, material, hierarchy, spacing and density |
| Motion | Existing SpreadMotion, interruptible transitions, deliberate detents, Reduce Motion | Timestamped entry/exit/focus/scroll/press sequences, easing and duration |
| UI | Stable chrome, clear action hierarchy, solid content versus functional controls | Control frames, hit areas, active/focus states, text clipping |
| UX | Responsibilities → Hours → Week → Tasks; real store and accessible alternatives | Tap counts, discoverability, feedback, recovery and interruptions |

Do not infer frame rate or haptic feel from a recording alone.

## Life video spec — awaiting recording

| Review dimension | Verified implementation / owner concern | Video evidence still needed |
| --- | --- | --- |
| Design | Separate Life palette was present; owner requests shared Classic identity | Screen-by-screen comparison of boundaries, contrast, saturation and card affordances |
| Motion | Life has its own navigation/focus/orbit transitions | Timestamped comparison with Classic, awkward settling, layout shifts and interruption behavior |
| UI | Tray opener was inside Add on the right; drawer Close was at the top | Both sides, rotation, drawer opening/closing alignment, content/chrome separation |
| UX | Functional Life/Hours/Week arrangement retained; owner reports weak cues | Where intent, selection, editing, placement or confirmation is unclear |

Record each finding as timestamp → observed behavior → impact → correction → acceptance result. Do not fabricate findings while the video is unavailable.

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

Implemented: picker says Life; accessible label/explanation match; palette shares Classic tokens; dock ordering mirrors by side; drawer edge mirrors; Close moved to measured bottom control row.

Pending: both video reviews, complete motion/visual tuning, matched before/after captures and native/device acceptance.
Do not claim that a Swift syntax pass proves appearance or interaction quality.

## Acceptance and rollback

Verify left/right at standard and accessibility sizes, portrait/landscape and compact/iPad widths. Open/close must not change week, selection or planner data. Compare opener/Close frames and ensure scrolling cannot dislodge Close. Verify picker still persists the existing flag and Classic is reachable.

Revert this focused branch for rollback; no schema or planner migration is introduced. Changes require a reviewed PR; no merge, distribution or production deployment is authorized by this request.
