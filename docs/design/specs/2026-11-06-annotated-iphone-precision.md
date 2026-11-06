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

## Photo 2 — Hours (owner annotations)

Pending implementation. Owner identifies the current interface as incoherent and unusable; usability correction is a launch-critical priority. Await remaining annotations before implementation.

| ID | Position | Fix / acceptance |
| --- | --- | --- |
| H1 | 52%, 60% | Make the screen's purpose and interaction clear. The user must understand what hours represent and how to adjust them without hunting among disconnected controls. |
| H2 | 35%, 67% | Replace the Life-area horizontal bars/rows with color-coordinated glowing radial controls, each showing its hour count in the center. Preserve role identity and stored hours. |
| H3 | 41%, 49% | Move the instructional question/explanation above the centerpiece radial so the user knows what to do before interacting. |
| H4 | 49%, 34% | Move the centerpiece radial upward and tighten the vertical layout. |
| H5 | 87%, 59% | Consolidate weekly-hours entry, adjustment and setting into the centerpiece radial instead of the separate minus / text field / plus / Set row. Exact interaction details remain subject to the owner's upcoming fixes. |

Intake remains open. No app code changes until the owner completes the annotations.

## Photo 3 — Hours radial and allocation (owner annotations)

Pending implementation; these refine H1–H5. They describe owner-observed behavior, not verified source causes.

| ID | Position | Fix / acceptance |
| --- | --- | --- |
| H6 | 53%, 45% | Tap the central hour value to type and set weekly planning hours directly. Applies to both the unset state and an existing value. |
| H7 | 63%, 74% | Simplify the assigned/unassigned summary. Clearly communicate the deposit/withdrawal relationship between available weekly hours and each Life area's hours, with immediately understandable labels and feedback. |
| H8 | 75%, 43% | Make the colored arcs orbit. Tapping an arc selects its Life area; dialing left/right modifies that area's weekly allocated hours. Keep selected identity, value and direction discoverable. |
| H9 | 15%, 56% | Correct the unexplained flick between user-set hours and 168 hours. Do not silently switch the user's planning capacity to the full calendar week; make any necessary distinction explicit. Verify the source cause before choosing the correction. |
| H10 | 41%, 35% | Remove the visible background circle/track behind the orbiting arcs. |
| H11 | 71%, 54% | Use true circular-arc geometry as allocated hours grow or shrink. Preserve circular curvature and radius; adjust angular sweep rather than deforming or stretching arcs. |

Intake remains open. Continue waiting for the owner's remaining updates before implementation.

## Photo 4 — Center value and contextual history (owner annotations)

Pending implementation; intake remains open.

| ID | Position | Fix / acceptance |
| --- | --- | --- |
| H12 | 49%, 48% | The central 168 value has no clear meaning to the user. Make the center value's meaning and unit immediately understandable, consistently distinguishing user-set weekly planning hours, selected Life-area hours and the 168-hour calendar-week limit. Do not rely on technical knowledge to interpret the display. Refines H1, H6 and H9. |
| U1 | 47%, 83% | Undo/Redo must appear contextually after relevant edits and disappear after inactivity rather than permanently occupying the dock area. Preserve undo/redo history when controls hide. Exact inactivity timing will be calibrated during implementation; no duration has been specified by the owner. |

No app code changes until the owner completes the annotations.

## Photo 5 — Week (owner annotations)

Pending implementation; intake remains open.

| ID | Position | Fix / acceptance |
| --- | --- | --- |
| W1 | 67%, 7% | Remove the redundant top week/date readout on Week, consistent with L6; preserve necessary calendar/day context and the bottom Crown. |
| W2 | 13%, 78% | Replace the indicated To place presentation with a horizontal row of glowing bubbles, one per Life card, positioned in line with the focused weekday heading. Preserve Life-area identity and relevant placement access; do not interpret this as removing unscheduled tasks. |
| W3 | 49%, 64% | Rewrite the empty-day panel as one coherent instruction with a clear next action, instead of three disjointed statements (“A day with room”, “Start by giving a Life area some time”, “Place some hours”). Final copy must match the actual interaction. |

No app code changes until the owner completes the annotations.
