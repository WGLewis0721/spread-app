# Tactile Precision implementation

> Part of the [Spread design brain](../README.md). [Contract](MOTION_CONTRACT.md) · [Verification](VERIFICATION.md)
>
> Summary: Integrated Classic and Life candidate based on main `d4afd9732e2d8b9e68ab62e9f84b67bee07305b2`, continuing PR #150. Code completion is separate from native/device acceptance. No release is authorized.

## Scope and reference lock

The owner's current request extends tactile behavior to **both Classic and Life**. Keep their original arrangements and scheduling semantics: Classic permits independent expansion; Life retains sole-card focus and hides siblings. The original Life reference files remain byte-for-byte unchanged. More/Settings content, the existing mode picker, planner store, cloud and schema are preserved.

| Decision | Authority | Implementation |
| --- | --- | --- |
| Stable full-width identity faces, neutral details below | Owner's tactile request; native brand board | Existing Classic Stack and Life Wallet, no new card mode |
| One motion grammar | MOTION_CONTRACT.md | Immediate contact; direct finger tracking; bounded Snap and interruptible Glide/Settle |
| Compact navigation adapted to usable width | Owner request; Fitts/Jakob/Hick checks | Shared collapsible rail at >=820pt; compact overlays; Classic Hours opens its existing hour summary |
| Existing art, type, semantic colors | Native brand board; approved Life reference | No new assets, fonts or palette; Life aliases existing native tokens |
| Accepted state owns confirmation | Doherty/Tesler checks; motion contract | Single completion owner; no snapshot-observer ticks; failed durable saves return false |

The Apple product-page research supported restrained hierarchy and surfaces. Concrete Wallet/detail behavior comes from the owner's repository references; unrelated marketing layouts and Refero card-grid results were not imported.

## Integrated behavior

- Classic faces remain stable when their separate details grow. Multiple cards can expand. Existing artwork, edit palette, management, confirmed deletion and task entry remain available.
- Both Wallets use velocity-aware deterministic closed/Manage/Delete rests. Dragging is unanimated; reversal, cancellation, inactive scenes and layout changes clear transient travel. No timer blocks subsequent touches.
- Classic hour values accept numeric entry, buttons, VoiceOver adjustment and horizontal detent scrubbing. Scrubs draft locally and send one revision-guarded command on release. Life retains its existing half-hour orbit and one-hour capacity controls, with bounded tick/boundary ownership.
- Crown retains its tested 64-point reducer, three-detent bound, chevrons, keyboard and adjustable actions. Both modes use the same release snap and accepted-week feedback owner.
- Week flick velocity can select only the adjacent unit, with direction/edge/axis checks. Vertical scrolling, task drag and Crown hit regions remain distinct. Life's date/header zones retain their existing day mapping.
- Completion gives immediate contact/pending feedback and one confirmed cue. Day-task reordering uses existing `reorderDayTask` commands and Move up/down alternatives in both modes. Allocation and weekly-hour semantics are unchanged.
- All custom feedback uses the existing Touch feedback preference and is suppressed outside active iPhone scenes. No idle/loop haptics. Reduce Motion removes spatial animation; existing opaque/high-contrast tokens remain in use.

## Acceptance record

Results are maintained in [evidence](../../evidence/tactile-precision/README.md). Unavailable native or physical observations are owed, never inferred from code, browser imagery or pure tests.

## Rollback

Before merge: close the draft PR; main has not changed. After a separately authorized merge: revert the PR's merge/squash commit in a new rollback PR, run the same automated and native checks, then request release authorization. No data migration or restore is required because this change only uses existing commands and preferences. Switching to Classic disables Life presentation but **does not disable Classic tactile behavior**; do not present it as a complete tactile rollback. Keep the preceding signed binary for a separately verified binary rollback. Never delete/reinstall or overwrite planner data to undo motion.

## November 6 follow-up — Life interaction repair (review candidate)

Source: the owner's iPhone screenshot and two 12–13-second screen recordings of Life editing and the navigation drawer. These are **observations of a prior installed binary**, not verification of this branch.

| Symptom | Code repair | Verify on device |
| --- | --- | --- |
| Existing Life hours cannot be adjusted from a card | Life card preserves the selected role when opening Hours; Hours separates the selected arc and displays direct half-hour controls. Manage sheet also exposes an independently saved weekly allocation stepper, bounded by current capacity and hours reserved on days. | Open Meal prep -> Change area hours; reduce and restore 0.5h; relaunch; verify persisted values and explanatory message at a full 40h capacity |
| Manage/Delete swipes fail | Life action layer stays in the view tree but is fully transparent/noninteractive at rest; attach the gesture to the stable card container, not an ephemeral subtree. Gesture thresholds remain directional/velocity-aware. Only Edit allows actions; no underlying colored buttons show at rest. | Edit -> left/Manage -> sheet -> Save Hours -> dismiss; right/Delete -> confirmation -> cancel; Done -> neither action remains |
| Edit glow too faint | Edit pulse uses 50% stronger color-shadow opacity, on Life and Classic. Life pulse cycles in ~1.35s; Reduce Motion keeps a static highlight. | Verify active/idle edit appearance, readable text, no pulsing or repeated haptics under Reduce Motion |
| Colored Hours arcs appear stationary | 18°/s orbital phase (one revolution/20s), colored edge shadows. The current contract's separated/held state pauses orbital travel. | Record 20s of default Hours on a physical iPhone, confirm full orbit and no frame drops; select a role and verify pause and half-hour detents |
| Sidebar feels like an overlay, not a sliding tray | Existing edge-mounted navigation uses interruptible Glide on enter and exit; finger follows horizontal dismissal, settling or closing via bounded gesture thresholds. Vertical scrolling stays separate. | Pull tray toward both possible edges, reverse before threshold, dismiss by flick, use VoiceOver/Reduce Motion |

**Safety:** No planner data-model or haptic-frequency change; no account/network requirement; no Classic layout or More/Settings redesign. No isolated prototype. Add UI and pure threshold regression tests and verify actual device screenshots before release.

**Release gate:** This source candidate is not proof of native build or real-device quality. Do not merge to main, upload an IPA, or release without explicit approval and the normal iOS acceptance matrix.
