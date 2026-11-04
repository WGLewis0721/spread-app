# Native release candidate

Branch: `fix/swiftui-finish`. Authoritative main: `3852a9f` (PRs #119 and #120).
Implementation and release evidence are tracked in PR #121. Main, the web deployment and golden branches are unchanged.

## Scope

The candidate preserves the local-first planner and its serialized writer. It finishes the native Week, Month and five Spread layouts, Crown navigation, task/role/profile editing, rich-content save, appearance, measured dock layout and adaptive type. It adds no accounts, schema migration, cloud surface, accent picker or native backup rewrite.

The latest fixes give Stack one accessibility identity, keep large-text headers scrollable, allow Crown and responsibility text to wrap, improve field prompt contrast and label Month weekday headings. Test navigation explicitly opens Week, searches restored list offsets and scrolls above the keyboard. iPad rotation requires matching window axes and captures the whole display. Duo automation queries the simulator guest panel table through an explicit device-set path because headless CoreDevice did not report displays.

## Verified baseline: `317b195`

- Native iOS compilation, 28 portable Swift contracts, planner/script checks, bridge simulations and App Store preflight passed.
- Crown: 100 real drags including 30 reversal pairs passed. Fan: 100 swipes passed. The separate Stack stress check failed after selecting an offscreen child with an inherited container identifier; this revision fixes that identity and asserts uniqueness.
- Actual Duo: all five layouts, Week, Month and More passed rendered Light and Dark checks. The preference relaunch check failed querying an offscreen System row; this revision scrolls it into view. Live OS System changes and hinge poses have not passed yet.
- 1024pt iPad viewport and required accessibility audit passed. 390pt, 820pt and 1024pt visual tours passed, including rendered dark checks. Existing rotated app-rectangle exports are not valid landscape screenshots; fresh full-screen captures are required.
- Create-flow checks failed with Save covered by the keyboard. Placement/Undo, Crown caps/Today, Month/day selection and Move to passed in the 390pt flow run. This revision corrects scrolling and includes all five core flows in the Codemagic signing gate.
- Largest-text and extended accessibility checks remain unresolved. Fresh audits must validate the wrapping, scroll layout, prompt and weekday fixes. No contrast reports are waived.

Local follow-up: script suite 214 pass / 4 existing skips; TypeScript typecheck and docs check passed; lint has no errors and 7 existing warnings. Revision `5320b87` passed native SwiftUI compilation, 28 portable Swift tests, CI checks and App Store preflight. Its UI-test build failed because the sheet-close helper used a query-only API on a single element; the focused follow-up uses a label-matching query. Fresh UI results remain required.

## Release gates

`spread-release-candidate` uses Xcode 27.1, requires the exact branch tip and cloud flags off, runs portable/source/bundle checks, actual Duo appearance checks, Crown stress and all five core flows, then verifies live System appearance through OS readback and the rendered accessibility root. Only passing gates permit build-number allocation, App Store signing, IPA validation and upload. Keep the branch fixed while a candidate is running.

Codemagic candidate #5 (`6aeabc3ba87b4d255fde62fd`, source `317b195`) failed before signing: the Crown flow inherited Month mode from a prior test. No replacement candidate has been signed or uploaded. Candidate #6 (`6aeb01b9d6634fc362f177fa`, source `5320b87`) also stopped before signing/upload on that UI-test compile error. Earlier candidate runs stopped at UI gates. Existing main build 16 is not this candidate.

The actual Duo pose workflow built and installed the app, but fold state failed because the simulator display table was unavailable through CoreDevice. The explicit guest query fix requires a fresh run. Physical haptics, occlusion poses, exact-reference animation calibration and comparison with the owner's reference binary remain unverified.

## Apple state

Read-only Codemagic audit `6aeab859a87b4d255fde6222` reported version 1.0 `PENDING_DEVELOPER_RELEASE` and uploaded builds 7–16 `VALID`. It did not identify the approved build. The existing approval has not been removed and no app has been released.

A changed binary needs its own App Review. Candidate publishing uploads only: it does not submit for review or release. Do not describe a compile, old approval or successful upload as acceptance of this candidate.
