# Annotated iPhone precision work

Status: awaiting the owner's complete photo annotations. No app changes yet.

Baseline: main `d4afd9732e2d8b9e68ab62e9f84b67bee07305b2`.

Scope will be defined by the annotated Life, Hours and Week screenshots supplied in the project conversation. Wait until the owner finishes annotating before implementing corrections. Do not infer approved fixes from the unannotated photos.

Preserve Classic, More/Settings, planner authority, stored data and the approved Life reference. Implement in the actual application on this branch. Record affected files, before/after behavior and relevant validation after implementation.

Release: draft only; no merge or deployment authorized for this work.

Rollback: revert the eventual focused implementation PR; no data migration is planned.

## Photo 1 — Life (owner annotations)

Pending implementation. These are owner-reported defects and requested corrections, not verified source diagnoses.

| ID | Position | Fix / acceptance |
| --- | --- | --- |
| L1 | 58%, 80% | Add-area row covers the cards. Keep it below the stack, with no overlap or obscured artwork/content. |
| L2 | 61%, 62% | Card faces are oversized relative to text, formatting and animated artwork. Calibrate card height and interior scale together; remove excessive empty space and preserve legibility. |
| L3 | 82%, 46% | Owner cannot find a way to change responsibility hours without deleting the card. Provide discoverable editing of existing hours, preserving the card and its tasks. |
| L4 | 50%, 37% | Long-press exposes plain square Manage/Edit and Delete boxes. Match their shape, materials and reveal treatment to the approved card design language. |
| L5 | 90%, 15% | Edit mode must show a clearly visible pulsing role-colored light on cards. Respect Reduce Motion with a static visible edit cue. |
| L6 | 68%, 8% | Remove the redundant top date/week readout; the bottom Crown already supplies week context. Preserve Crown navigation. |
| L7 | 77%, 91% | Bottom plus/add control is inconsistent with the established icon language. Align its icon and control styling with Spread's approved components. |

Intake remains open. Wait for the owner's remaining photo annotations before changing app code.
