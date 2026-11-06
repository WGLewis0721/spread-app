# Build Life for the existing iOS app

Implement the approved Life demo in this PR. Work through the steps below without asking the owner to choose layouts, wording, libraries or gesture behavior. The decisions are fixed here and in the linked spec. Keep the PR in draft until the implementation and required evidence are complete. Do not merge it.

## Start here

1. Read `AGENTS.md` and `AGENTS.project.md`, then [the spec](SPREAD_LIFE_IOS_SPEC.md) and [the checklist](SPREAD_LIFE_IOS_CHECKLIST.md).
2. Stay on the branch for the PR containing this file. Fetch main and compare it with the inspected baseline `b074b881ff6b1134d745ce1697f841069d92cf4b`. Preserve unrelated changes if main has moved. Continue implementation in this PR; do not create a competing redesign.
3. Run the included reference from the repository root:

```sh
npm --prefix tools/life-reference ci --ignore-scripts
npm --prefix tools/life-reference run dev -- --port 4183
```

4. Open `http://127.0.0.1:4183/iphone`. Tap through Life, Hours, Week, card editing and task notes/files. Try every gesture. Read [the reference README](tools/life-reference/README.md) for its independent checks and frozen test date.
5. Inspect the [seven approved captures](docs/evidence/life-ios-reference/). Treat the running reference as the behavioral authority and the captures as the standard-size visual authority. Keep this reference unchanged while implementing native code.

Use Node 22.12 or newer for the reference. The app uses the existing Node 22 / Xcode 27.1 Codemagic configuration. Verify the actual build-machine inventory before choosing a simulator. The reference is development material, not part of the app bundle.

## Keep these decisions fixed

| Question | Required answer |
| --- | --- |
| Which app? | The existing SwiftUI screen layer inside the existing Capacitor app. Keep the bundled React planner as the sole writer. |
| Where does Life open? | Behind the existing `native.weekMonth.previewEnabled` choice. Keep its current false default. |
| What happens to More/Settings? | Preserve its appearance, text, sections, controls and actions. Keep `Classic (current)` and `Week + Month (preview)` exactly as they are. The latter opens Life. |
| What happens to Classic? | Preserve its existing shell and workflows. It remains the immediate presentation fallback. |
| Which screens? | Life, Hours and Week, with the approved compact navigation and bottom metallic Crown. |
| Which visual style? | The approved demo in standard text sizes. Use native system typography and the spec's explicit readability/accessibility adaptations. Scope Life colors/materials so they do not repaint More or Classic. |
| Which data? | Actual responsibilities, tasks, allocations and profiles from the current planner. No sample store, second Swift database or localhost dependency. |
| What is the center number? | Total weekly planning hours. Ask the app user to set it when absent. Never silently assign the prototype's 36-hour sample value to a real profile. |
| Which dial direction? | Counterclockwise adds; clockwise returns. One 15-degree step changes half an hour. |
| Which capacity gesture? | Upward flick adds one hour; downward flick returns one hour. A sustained vertical drag changes faster as distance grows. Start from the included demo's thresholds and rate curve. |
| Which management scope? | Keep current global name/color/symbol/deletion semantics and state all-weeks deletion clearly. Life budget gestures affect the selected week and do not rewrite global default hours. |
| Where do new controls go? | Put gesture help/optional touch feedback in Life, and left/right Crown placement in its Life-local action menu. Add nothing to More. |
| Which editor? | Extend the native task editor. Preserve old notes, outlines, tables and photos; add the spec's formatting, estimates and file/media behavior. Do not ship browser Tiptap as the native solution. |
| Which feedback? | Use the spec's haptic event table. Draft detents describe visible draft values; success confirms accepted writes. No repeated buzzing or doubled Crown pulses. |
| Which release path? | Manual Codemagic verification, then the reviewed signed internal-test candidate through the established Apple integration. Keep public App Store/external-beta submission disabled. |

These defaults resolve implementation choices. Existing profile data, credentials and hardware facts must be discovered through available authorized tools, not guessed. Normal planning input inside the finished app, such as the user's weekly hours, remains part of the product.

## Build in this order

### 1. Protect the current app

Capture Classic and every More section before changing runtime code. Record source/build identifiers and export a protected test profile with the current recovery flow. Add regression checks that changing preview mode makes no planner-data writes and opens the same More sheet from either mode.

### 2. Connect the new native root

Read `ios/SpreadNativeV2/Sources/SpreadNativeV2/Shell/SpreadLiveRoot.swift`. Reuse its existing flag to route to a new Life root. Leave its Classic branch intact. Build the Life/Hours/Week navigation, safe-area layout and Crown placement. Reuse the existing native resources and `WeekCrownView`.

### 3. Match the cards

Build the closed Wallet stack, selected-card focus and separate detail panel. Restore the full stack and accessibility focus when leaving a card. Connect real tasks, pencil editing, rigid left/right swipe reveals, confirmation and contextual Undo/Redo. Follow spec acceptance criteria 1, 2 and 10 before moving on.

### 4. Add the missing real-planner capabilities

Inspect `src/lib/spread/model.ts`, `store.ts`, native projection/dispatch and the Swift snapshot together. Add compatible optional capacity, weekly-priority and task-estimate data, and guarded history support. Preserve old/unknown task content and all week/profile rebuild paths. Extend local attachment storage and full recovery without changing More's interface.

Do not send arbitrary old snapshots from Swift to implement Undo. Do not put file bytes into every bridge message. Do not change cloud flags. Do not declare this step complete until normalization, mirror/relaunch, upgrade and export/import tests preserve the new information.

### 5. Match the time orbit

Port geometry and gesture arithmetic from `tools/life-reference/src/iphone/HoursOrbit.jsx` and `interaction-math.js` into native presentation code. Keep production business rules in the existing planner. Pause the orbit in place, separate arcs, select an area and support both circular directions. Keep live motion in a local draft; commit one final guarded change on release and make the gesture one Undo step.

Add buttons, an editable capacity field, keyboard and VoiceOver alternatives. Test zero/full circles, limits, interrupted drags, angle wraparound and direction reversals. Keep existing data if Classic has placed it over the new capacity; explain the mismatch and allow corrective edits.

### 6. Match Week and Month

Reuse current native date/calculation components where possible. Morph the week into the month while retaining the selected date. Display daily Life areas as Wallet stacks with separate task details. Preserve unscheduled work, eligible-day rules, Crown/date navigation and Undo. Cover empty weeks, leap days and year boundaries.

### 7. Finish the native task editor

Connect the same editor from all three Life pages. Add the estimate selector, clear labels, native formatting, conventional-outline recognition, nested lists/checklists, links and text Undo/Redo. Keep native text selection, paste, autocorrection, dictation and hardware keyboard working.

Use system photo/file pickers, managed local copies, stable references, native previews and the documented limits. Prove actual file bytes survive restart, in-place upgrade and local recovery. Preserve existing tables, photos and notes. Show a usable fallback when a file provider or media decoder cannot supply a preview.

### 8. Add teaching feedback and accessibility

Implement the spec's exact copy and haptic map. Honor Dynamic Type, VoiceOver, Bold Text, reduced motion/transparency and contrast. Test optional touch feedback, no duplicate pulses, one limit warning per gesture and no success cue after a failed save. Tune timing and feel on a real iPhone 15; a simulator cannot establish haptic feel.

### 9. Compare the native build with the reference

Use a disposable reference profile. Reproduce the sample week beginning November 2, 2026: Work 12 h, Family 6 h, Home 4 h, Health 5 h, and capacity 36 h. Use the complete seed fixture in `tools/life-reference/src/model.js` for its exact allocations and tasks. Keep this fixture out of the owner's real profile. Any launch-time fixture/clock hooks must be Debug-only and covered by the existing Release preflight.

For each of the seven captures, match the selected date/card, appearance, content width, scroll position and standard text setting. Compare the native content area after accounting for actual status/navigation safe areas. Check card position/size, spacing, colors, type hierarchy, arc proportions, controls and task placement. Check the transitions and gestures against the running reference, not just still images.

Commit before/after images and a discrepancy table. Correct every unexplained difference. The allowed native adaptations are system font rendering, real safe areas/system pickers, requested clearer copy, haptics and documented accessibility reflow. Do not hide missing features or layout errors behind image masks, a permissive threshold or a claim of pixel perfection. Require all listed behavior cases to pass, with no skipped feature work. Screenshot resemblance alone does not pass.

### 10. Run the checks

Follow checklist step 12 exactly. Add new files to the explicit test lists. Run typecheck, lint, planner/script checks, documentation checks, native package tests, the native UI suite, persistence/recovery controls and offline/signed-IPA preflights. Record every command, commit, result and artifact.

The reference browser tests are a separate baseline. They do not establish native correctness. Keep Classic/More regression evidence and the full native acceptance matrix in the PR. Run long WebKit reference checks with one worker.

### 11. Prepare the owner-testing build

Follow checklist steps 13 to 16. Add a separate manual Life verification workflow and a separate guarded internal-upload workflow. Keep current release workflows, signing identities and build-number protections intact. Build/archive and inspect the exact candidate before any upload action. Use existing authorized credentials; never request secrets in chat or put them in Git.

Do not merge, deploy production, submit externally or bypass a release guard. Execute an internal upload only when the session/PR explicitly authorizes it. Otherwise leave the signed artifact and exact manual job ready for the final release decision. Distinguish successful compilation, upload, Apple processing, internal group assignment and actual installation.

## Use these acceptance artifacts

Keep the implementation record in `docs/evidence/life-ios-implementation/`:

| File | Required contents |
| --- | --- |
| `acceptance.md` | Every spec acceptance criterion marked pass/fail/owed, exact commit, evidence link and reproduction steps. |
| `visual-comparison.md` | The seven matched views, reference/native image pairs and every remaining difference. |
| `checks.md` | Actual commands, environment, counts/results, known baseline warnings and failure artifacts. |
| `device.md` | iPhone model, actual iOS/app build, haptic observations, accessibility, offline/relaunch/upgrade and file recovery outcomes. |
| `release.md` | Workflow/run links, commit, version/build, signed artifact/checksum, processing/install result and rollback compatibility. |

Do not mark a criterion pass because its code exists or a similar browser case passed. Do not modify tests to accept an unexplained regression.

## Finish without design questions

Resolve routine engineering choices from the running demo, spec, checklist and current source. Use the defaults above and record the decision. Fix failures and continue through the next step; do not stop at a plan or a visual-only slice.

Access failures and absent hardware are external prerequisites, not design choices. Complete all independent implementation, automated checks and artifact preparation before reporting such a blocker. State the exact missing access/device and which specific criteria remain owed. Do not invent an installed build, successful upload, physical haptics or a measurement to satisfy a completion claim.

Finish with the implementation committed to this PR, all achievable acceptance checks passing, the exact candidate/build record, Classic and More comparison evidence, and an honest list of any external checks still owed. Keep the PR draft if acceptance remains incomplete. Do not claim 100% demo/native parity until the recorded visual, behavior, persistence and required physical-device checks support it.
