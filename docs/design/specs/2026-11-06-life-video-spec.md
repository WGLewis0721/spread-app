# Life recording: design, motion and UI/UX specification

> Part of the [Spread design brain](../README.md). Companion to the [Classic recording spec](2026-11-06-classic-video-spec.md) and [shared polish contract](2026-11-06-life-classic-polish.md).
>
> Summary: Keep Life's focused card/detail arrangement and planner capabilities. Restore Classic's material, color, illustration and motion vocabulary; make disclosures and controls easier to recognize.

## Evidence

Recording: `ScreenRecording_11-06-2026 09-15-06_1(1).mp4`, duration 15.00 seconds, encoded 512 × 1108 at 30 fps.
Reviewed the complete timeline at one-second intervals and the focus change at 7.80–8.64 s in 120 ms steps. Encoded pixels are not logical iOS points, and encoded fps is not a measured application frame rate.
App build/iOS version are not visible. This recording does not demonstrate Hours, the task editor, attachments or an open navigation drawer.

## Observed sequence and corrections

| Offset | Observed behavior | Impact | Required correction |
| --- | --- | --- | --- |
| 00:00–00:01 | Life heading, thin hours strip, compact plain card stack and bottom Crown | Structure is compact, but summary/disclosure and card identities are weaker than Classic | Shared palette; elevated actionable hour summary; original role-tinted illustrated faces |
| About 00:02–00:03 | One area is focused; task details are in a separate white field | The separation is useful, but the pale face and sparse content provide little hierarchy | Keep separate details; strengthen role surface/border, restore illustration and preserve full card width |
| About 00:04–00:07 | Returns to the stack and focuses other areas | Core focus/back behavior is present | Preserve behavior and focus restoration; use the same timing vocabulary as Classic |
| 00:08.16–00:08.52 | Several translucent old card labels/tinted layers overlap while another area takes focus | The selected object is harder to follow; intermediate state reads as visual noise | Keep stable card identities and explicit vertical translation; fade nonselected siblings promptly without width interpolation |
| About 00:09–00:12 | Focused card returns to the closed stack | Compactness is retained | Keep title, icon, hours and chevron geometry stable throughout the return |
| About 00:13–00:14 | More appears dark while Light is selected | Appearance continuity needs investigation | Record as shared existing behavior; do not guess its cause or silently redesign More |

Visible Undo/Redo is a bare text row, unlike Classic's clearly contained Undo control. Group history into a quiet, readable control surface with distinct enabled/disabled actions.
The small bottom navigation and Add affordances need stable, deliberate spacing and a consistent press response.

## Design specification

| Component | Life contract |
| --- | --- |
| Identity | Same semantic canvas, ink, secondary ink, accent, separators and recessed surfaces as Classic. No independent gray/black palette. |
| Wallet | Same role-driven Classic gradient, bounded edge light, continuous corners and original artwork. Actual role color/category remain authoritative. |
| Focus | One selected Life card with tasks in their own field. Preserve this arrangement instead of turning it into Classic's expanding task-inside-card layout. |
| Summary | Readable assigned/unassigned values, proportional role strip, elevated surface and disclosure cue. Do not duplicate it as a second budget source. |
| Details | Separate elevated content field; distinct heading, placement action, task rows, empty state and Add entry. Text never shares artwork space. |
| History | One contextual group; available Undo/Redo are obvious; unavailable actions are disabled. No repeated permanent action rows. |
| Navigation | Same original icons and Crown. Tray opener stays at the outer edge; Close occupies the matching bottom dock column and vertical center. |
| Empty/large text | Natural growth and readable instructions. Artwork yields space to content at accessibility sizes. |

## Motion specification

Use the existing shared `SpreadMotion` tokens from Classic: focus/navigation 420 ms; cascade/reveal settle 320 ms; press 160 ms. The recording identifies the noisy transition; these target values are source-defined calibration values, not durations measured from the video.

For standard text sizes, retain role views in one full-width stack and animate vertical offsets. Nonselected cards fade quickly; their text must never interpolate into a narrow column. Keep rigid horizontal swipes independent of vertical scrolling.
Reuse original Chalkboard motion; honor the component's Reduce Motion/background behavior. Do not introduce a new illustration animation engine.

At accessibility sizes use natural-height, nonoverlapping cards and the same actions. Reduced motion removes translation and decorative animation without removing information.

## Tray rule from the owner

This rule comes from the request, not from an observed open-drawer video:

| Crown side | Dock order, left to right | Drawer side |
| --- | --- | --- |
| Right | Tray opener, Add, Crown | Left |
| Left | Crown, Add, tray opener | Right |

Close is pinned below the scrollable drawer content. Its center aligns with the opener's measured center, including the alternate dock layout at large text. Opening/closing does not change week, selection or planner data.

## Implementation in PR #147

Implemented source changes: Life picker label and accessible copy; shared tokens; mirrored outer-edge tray; measured bottom Close; shared navigation timing; Classic card gradient/edge/depth and artwork; stable full-width focus geometry; elevated summary and grouped history.
The planner, scheduling, storage, Classic layout, More layout and frozen demo remain unchanged by this polish slice.

Validation: active-iOS Swift syntax parsing and documentation checks. Native SDK build, XCTest execution, matched before/after video and device/layout acceptance remain owed.

## Acceptance and unresolved evidence

Replay the recorded focus/back sequence on a matched disposable profile. Check every intermediate frame for rigid width, legible header, coherent z-order and absence of lingering duplicate labels.
Capture both appearances; long names; largest text; reduced motion/transparency; left/right Crown; portrait/landscape; compact/iPad widths.
Verify card taps, Edit/long press, both swipe reveals, task editor entry, placement and Undo/Redo remain functional. Haptic timing and physical thumb reach require a device.

Hours/orbit and rich editor/file behavior were not shown here and require separate recordings/tests. No full-app or candidate parity claim follows from this review.
