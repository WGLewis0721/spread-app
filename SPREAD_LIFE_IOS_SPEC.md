# Spec: Life on iPhone

> Part of the Spread design brain. Start at [docs/design/README.md](docs/design/README.md). Follows [docs/design/PLAN_SPEC_PROTOCOL.md](docs/design/PLAN_SPEC_PROTOCOL.md).
>
> Summary: Bring the approved browser design into the existing native preview mode. Keep Classic and More unchanged. Use the real planner, teach gestures with concise instructions and haptics, and deliver a signed internal-testing build through Codemagic after device checks.

| Item | Detail |
| --- | --- |
| Request | Adapt the approved prototype to the current iOS app, add teaching haptics and clearer type/copy, replace the Week + Month preview experience, and preserve More/Settings. |
| Restated | Let the owner plan a real week with Life on an iPhone 15 using the existing Spread app and Codemagic delivery path. |
| Surface | Native iPhone planner. Preserve iPad/Duo compatibility. |
| Size | L: several screens and additional persistent features. |
| Author | Codex, November 6, 2026. |
| Status | Implementation plan. Browser appearance approved by owner; native implementation and signed build not produced by this document. |
| Baseline | GitHub main rechecked at `b074b881ff6b1134d745ce1697f841069d92cf4b`. |
| Next document | [Step-by-step implementation checklist](SPREAD_LIFE_IOS_CHECKLIST.md). |

## 1. Problem

The owner can plan comfortably in the approved browser prototype, but uses the installed iOS app to test real weeks. Its current preview has different navigation and interaction patterns. The owner needs the approved Life experience on the phone, with readable instructions and tactile cues that explain what changed when a gesture succeeds.

## 2. Evidence and context

[Repo] The current app displays SwiftUI through `SpreadLiveRoot`, hosted by `ios/App/App/SpreadBridgeViewController.swift`. A bundled React planner runs behind it through Capacitor/WebKit. `LivePlanner.send` sends guarded commands to the existing TypeScript store. Swift holds screen state and drafts, not a second planner database.

[Repo] More already offers `Classic (current)` and `Week + Month (preview)` in the Calendar design picker. The stored choice is `native.weekMonth.previewEnabled`, false by default. The relevant code is in `Shell/SpreadLiveRoot.swift` and `Sheets/ManageSheets.swift` under `ios/SpreadNativeV2/Sources/SpreadNativeV2/`.

[Repo] Current task content supports notes, outlines, tables and inline photos. It does not store the prototype's Tiptap document, general files, audio or video, and the task model has no time-estimate field. The inspected production week model has no weekly planning-capacity or weekly-priority field. Native transport exposes Undo; it does not expose a matching general Redo command.

[Repo] Production responsibility deletion removes that responsibility across weeks. Its hour setter also changes the default hours used by other weeks. The browser prototype's management changes were week-scoped experiments. These are different contracts and need deliberate handling; copying the prototype model would lose existing behavior.

[Repo] The signed workflow uses project `ios/App/App.xcodeproj`, scheme `App`, bundle `com.graymatter.spread`, integration `Spread`, Node 22 and Xcode 27.1. The release-candidate branch guard currently accepts only `main` or `fix/swiftui-finish`. A new Life branch would be rejected without a focused workflow addition.

[3P] Codemagic currently lists Xcode 27.1. Its documented simulator inventory does not include an iPhone 15. Record the actual machine inventory and test on the owner's physical iPhone 15; another simulator is not evidence for that device. [Codemagic machine specification](https://docs.codemagic.io/specs-macos/xcode-27-1/).

[Assumption] The installed iPhone's iOS version and TestFlight build number have not been supplied. Record both before implementation/device comparison. Retain the existing iOS 17 deployment minimum and check newer APIs for availability.

The approved browser is included at `tools/life-reference`; follow its README to run `http://127.0.0.1:4183/iphone`. These portable reference captures define the visual target, not installed-iOS evidence:

[Life stack](docs/evidence/life-ios-reference/final-life-stack.png) · [focused card](docs/evidence/life-ios-reference/final-life-focus.png) · [Hours](docs/evidence/life-ios-reference/final-hours-orbit.png) · [separated arcs](docs/evidence/life-ios-reference/final-hours-separated.png) · [calendar](docs/evidence/life-ios-reference/final-calendar.png) · [Week cards](docs/evidence/life-ios-reference/final-week-wallet.png) · [notes](docs/evidence/life-ios-reference/final-task-notes.png).

## 3. Goals, non-goals and budget

Match the approved layout, spacing, card focus, orbit, calendar morph and bottom Crown. Use real responsibilities and tasks, preserve local/offline planning, and make every gesture available through buttons and accessibility actions. Keep the existing More sheet, its text, layout, actions and mode-picker labels unchanged.

Do not rebuild the planner, load localhost into the app, copy sample data, add an account, change cloud flags, redesign Classic, or replace the approved design with generic system screens. Do not add analytics or a new font package.

[Rec] Use three complete development slices: native presentation, connected planning, then full task content and device polish. Each slice gets a focused draft PR and evidence. The final owner-testing build includes all requested features; incomplete slices must be labeled as such. Set effort estimates after the data/content slice is scoped, rather than treating this as a CSS port.

## 4. Rules that apply and exceptions needed

| Rule and source | Application |
| --- | --- |
| Owner's November 6 approval and More clarification | The approved browser is the Life visual target. More remains unchanged. |
| [Native board, reference authority and identity](docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md) | Keep system type, original icons/art resources, stored role colors and metallic Crown. Scope the new treatment to Life mode. |
| [Rules card, Behavior and Boundaries](docs/design/RULES_CARD.md) | Keep the real store, eligible-day rules, guarded writes and Undo. Preserve golden branches, landing, server and cloud paths. |
| [App Store plan, chosen architecture and data strategy](APP_STORE_RELEASE_PLAN.md) | Keep the current Capacitor/native host, offline bundle, no mandatory account and upgrade/relaunch safety. |
| [iCloud plan, migration strategy](docs/ICLOUD_PLAN.md) | Treat new content/storage as data work. Preserve older content, version new formats and protect recovery. Cloud backup/sync remain off. |
| [iOS behavior audit](docs/design/platforms/IOS27_BEHAVIOR_AUDIT.md) and [native-feel pack](docs/design/packs/apple-native-feel.md) | Honor safe areas, Dynamic Type, VoiceOver, motion/transparency/contrast preferences, and 44-point controls. |

Exceptions and scope: the latest owner request authorizes the browser's presentation within the existing preview mode, including separate Life/Hours/Week navigation. It supersedes earlier preview visuals there. Classic and More retain their existing design authority. Additional capacity/priority/content fields and native local-file handling require separate data-focused changes with compatibility tests; they are not UI-only edits. Do not alter shared theme tokens to achieve Life's appearance if that would repaint More or Classic.

## 5. Options and the chosen concept

### Options considered

| Option | Effect | Decision |
| --- | --- | --- |
| Extend the existing native preview | Use the current switch and planner bridge; replace only the true branch with Life. | Chosen. Preserves the app, its data and Classic rollback. |
| Package the browser prototype directly | Put its React UI/model/editor into a visible WebView. | Rejected. Its sample model and storage do not match the real planner or native feedback. |
| Replace Classic with Life | Make all screens use the new shell immediately. | Rejected. Removes the requested comparison/rollback path and widens regression risk. |

### Breadboard of the chosen concept

The existing More picker stays unchanged. Selecting `Week + Month (preview)` opens Life. Selecting `Classic (current)` restores the current shell. Do not add a third choice, change the persisted key, or require a restart. Returning to More from either mode opens the same current sheet. Preserve any open real task's save/cancel protection while changing modes.

Life mode contains Life, Hours and Week. A compact overlay supplies these destinations. The bottom Crown retains previous/next week and left/right placement. Store that placement as a native presentation preference. Do not add its preference to More; use a Life-local Crown action menu with explicit `Move Crown left` / `Move Crown right` actions.

Life shows the real responsibility stack. Tapping a card leaves that card in focus while the rest drop away. Put tasks and their details below the card, outside its face. Tapping it again or `All Life areas` restores the stack. Keep focus and selection understandable to VoiceOver when cards disappear.

Only the explicit pencil/Edit button enters editing. Normal card tap opens/closes details; long press must never enter editing or show destructive actions. Keep the restrained role-colored glow and rigid card geometry. While editing, swipe left to reveal Manage and right to reveal Delete. At rest or outside Edit, neither action is rendered. Offer the same actions as named buttons. Show Undo/Redo after edits, disable unavailable actions, and group one gesture or accepted edit into one history step. Retain current production-wide name, symbol, color and deletion scope unless the owner separately chooses week-only management. A delete confirmation must explicitly say `from all weeks`; never send the global delete command for an action labeled `this week`.

Hours uses the approved central orbit. The center is the week's planning capacity. Arcs show assigned Life budgets; the remaining gap shows unassigned time. Tap the number to pause at its current angle and separate arcs. Tap again to regroup. Flick up/down changes the capacity draft by one hour. Hold and drag farther away to change it faster. Select a Life area, then circle counterclockwise to add and clockwise to subtract, in half-hour steps. Preserve the prototype's 15-degree detent and accelerated-drag curve as the initial native calibration. Keep explicit add/return buttons and an editable capacity field.

Preview gesture changes immediately on the phone; commit once on release through the real store. Capacity cannot be below assigned budgets; a role budget cannot be below its reserved hours. Life cannot assign beyond capacity. The filled circle means there is no unassigned time. If Classic later creates an over-capacity plan, retain its data, display the shortfall, and allow corrective reductions or increased capacity. Do not silently shrink budgets or rewrite Classic's rules.

Week initially shows seven dates. Month expands the same date surface into the full calendar while preserving the selected date. Month arrows and Today work across year/leap boundaries. Show that day's Life areas as the same Wallet stack, with that day's reserved hours. Put the selected area's tasks below. Keep unscheduled tasks, eligible-day placement, day/week navigation and Undo.

Every Life task entry point opens the same native task editor. Preserve the demo's editable task estimates. Store estimates as optional minutes, leave older unestimated tasks unset, and default newly created tasks to 30 minutes. Use the demo's 15/30/45/60/90/120/180/240/480-minute choices. An estimate alone does not reserve hours. Support headings, body text, bold, italic, underline, links, lists, nested outlines, checklists and text Undo/Redo. Recognize `1. `, `I. ` and `A. ` at the start of a paragraph; Enter continues; Tab/Shift+Tab change outline level. Preserve normal prose and pasted content. Keep existing tables and photos readable and editable. Provide native selection, autocorrection, dictation, copy/paste, hardware-keyboard support, and an accessible formatting toolbar.

Add photos through the system photo picker and files/media through the system file picker. Preview supported images/audio/video and open other files through a native preview/share path. Copy selected files into app-managed local storage before saving the task. Do not depend on a temporary picker URL or transmit file bytes through every planner command. Retain the prototype's 25 MB per-file and 100 MB per-task limits until device evidence supports a change. A failed import leaves the task and original file intact.

### States

| State | Visible behavior |
| --- | --- |
| First use | Open the existing real profile. Explain a new gesture beside its control; never populate sample responsibilities. Ask the user to set planning capacity when no value exists. |
| Empty | Offer `Add a Life area`, `Set weekly hours`, or `Add a task` for the empty surface. Keep the same navigation. |
| Loading/saving | Keep acknowledged content visible. Show a concise saving state and prevent duplicate commits. |
| Failed save | Keep the draft and offer the established retry/recovery route. Do not show a success pulse. |
| Refused change | Keep the last valid value and state the reason beside it. Warn once per gesture at a limit. |
| Overflow/large text | Grow and scroll vertically; wrap names/instructions; never hide essential controls below a fixed card. |
| Offline | Continue planning and accessing imported local files. State when a picker item still needs to download from its provider. |
| Undo/Redo | Separate text history from planner history. Clear stale planner redo after new edits or profile/week changes. |

## 6. Platform behavior

### Typography and language

[Apple] Use the system font through semantic text styles and support Dynamic Type. Let layouts grow instead of shrinking labels. [Apple fonts](https://developer.apple.com/documentation/technologyoverviews/fonts) and [Dynamic Type](https://developer.apple.com/videos/play/wwdc2024/10074/).

[3P] Use [Humanizer 3.1.0](https://github.com/blader/humanizer/blob/0ef9fe5bc3572734fd3ae6c448fe00a30cd5dcf0/SKILL.md) to review wording. Keep meaning and supported facts, remove filler and sales language, and state actions directly. It is an editorial guide, not a typography engine. No Humanizer runtime dependency is needed.

[Rec] Use large-title styling for page names, headline for card/task titles, body for editing and instructions, and subheadline for supporting facts. Make the center number scalable with monospaced digits. Essential instructions must remain at least the standard subheadline size, not the browser prototype's smallest helper text. Match spacing and balance at standard text size; accessibility text may reflow. Do not change More's typography.

| Place | Use this wording |
| --- | --- |
| Life subtitle | `Choose a Life area.` |
| Center caption | `Weekly planning hours` |
| Meaning of the number | `Time you want to plan this week.` |
| Totals | `27 h assigned` and `9 h unassigned` |
| Closed orbit instruction | `Tap the number to adjust your hours.` |
| Capacity gesture help | `Flick up or down by 1 hour. Hold and drag to change faster.` |
| Separated orbit instruction | `Choose an area. Turn left to add time. Turn right to return it.` |
| Budget versus reservation | `Assigned to Family` versus `Reserved on your days` |
| Full circle | `All hours are assigned. Add weekly hours to assign more.` |
| Reserved-hours limit | `4 h are already reserved. Return time from a day first.` |
| Priority | `Prioritize this week` / `Weekly time goal` / `Find time` |
| Priority shortage | `You need 2 more unassigned hours to reach this goal.` |
| Files | `Add files` / `Saved on this iPhone` |
| Import failure | `This file could not be added. Try again or choose another file.` |
| Notes help | `Start with 1., I., or A. for an outline.` |

Keep these definitions consistent: weekly planning hours is total capacity; assigned hours belong to a Life area; reserved hours have a day; unassigned hours belong to no area yet. Use localized numbers, correct singular/plural and natural VoiceOver readings such as `6 hours`.

### Haptics that teach

[Apple] Pair short feedback with a visible event, use patterns consistently, avoid repetition, and offer an off choice. [Apple haptic guidance](https://developer.apple.com/design/human-interface-guidelines/playing-haptics). [Rec] Apply the following map only to Life mode; retain Classic's current feedback.

| Event | Feedback and visible instruction |
| --- | --- |
| Card takes focus; date/area changes | One selection tick when the selection actually changes. |
| Edit begins/ends | Existing rigid/soft edit cue, once per transition. Show swipe instructions. |
| Swipe reaches Manage/Delete reveal | One light/medium snap cue at the threshold; none while holding it there. |
| Capacity/arc crosses a valid draft detent | One quiet selection tick. Rate-limit accelerated changes to at most 8 ticks/second. The changing value labels this as a draft. |
| Finger reaches a limit | One warning for that continuous contact, plus the specific limit message. No repeated buzzing. |
| Gesture commits | One light confirmation after the store accepts the final value. A failed write keeps the draft and error visible. |
| Priority reservation or task completion succeeds | Existing success/completion feedback after acknowledgement. Suppress duplicate pulses from nested views. |
| Crown changes week | Keep its existing accepted-week tick; do not add a second one in Life. |
| Orbit, glow, launch, restored state or keyboard typing | No custom repeated feedback. Leave keyboard feedback to iOS. |

Place brief teaching text at the control being used. Dismiss it after a successful demonstration, not after a timer. Make the Hours instruction/help control open a Life-local `Gesture help` sheet with a `Touch feedback` toggle and `Show tips again`. This adds nothing to More. All controls must remain understandable with feedback off. Use existing `SpreadHaptics`/SwiftUI feedback APIs with a single event owner; do not add a custom vibration engine. [SwiftUI feedback](https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:condition:)).

### Layout, motion and accessibility

Use the available safe-area width, not a device-name check. Calibrate against the approved 390-point browser captures, then verify real iPhone 15 portrait/landscape, compact widths, and 820/1024/1366-point regression layouts. Keep controls above the home indicator and keyboard, support interactive keyboard dismissal and native sheets, and preserve the metallic Crown.

Animate focus, separation and calendar expansion with interruptible native transitions. Start with the prototype's short transition timings and slow orbit. Stop idle animation offscreen, in the background, during interaction and with Reduce Motion. Respect Reduce Transparency, Increase Contrast, Bold Text and dark appearance. Scale the radius and control placement for large text instead of clipping the number or instructions. Keep original artwork resources; do not add competing motion to the orbit.

Provide 44-point targets, named VoiceOver actions for Manage/Delete, adjustable accessibility values for capacity and budgets, focus restoration when returning to the stack, and labels for attachments. Offer buttons, keyboard arrows and accessible increment/decrement actions for every gesture. Do not hijack system back gestures or vertical scrolling. Haptics never carry information by themselves.

## 7. Technical approach

| Area | Existing integration point and required work |
| --- | --- |
| Preview routing | In `Shell/SpreadLiveRoot.swift`, reuse `weekFocusEnabled` to present a Life root with Life/Hours/Week. Leave the false branch and `MoreSheet` intact. |
| Native screens | Add focused Life components under `ios/SpreadNativeV2/Sources/SpreadNativeV2/`. Reuse `WeekCrownView`, existing task/day commands and original resources. Keep new colors/type scoped to the approved Life surfaces. |
| Real planner | Extend `src/lib/spread/model.ts`, `store.ts`, native projection/dispatcher and Swift snapshot together where new persistent fields are needed. Keep all planner writes inside guarded store actions. |
| Capacity/priority | Add optional, versioned week metadata. Require an explicit initial capacity; never invent 36 hours for an existing plan. Fund priority from that area's unused budget and unassigned capacity, preview eligible days, then reserve atomically. Do not borrow another area's hours or silently move tasks. |
| Budget gestures | Add a week-only Life budget intent so circling does not unintentionally change global default hours. Validate capacity, reservations, profile/week/revision, and one Undo step in the store. |
| Editing history | Extend guarded planner history for Redo. Revalidate the current revision; do not send Swift copies of old snapshots back as replacements. |
| Notes | Extend the existing task-content format and native editor without dropping tables, photos, unknown future blocks or old plain notes. Prototype document JSON is a reference, not a compatible production format. |
| Files | Use a local native attachment service with stable IDs, checksums and task references. Keep bytes out of planner JSON and bridge messages. Extend local backup/import validation to preserve attachment bytes; do not change the More backup UI. |
| Gesture performance | Keep live drag/rotation values in a transient Swift draft. Send one final intent per completed gesture. Avoid a command per pointer frame, session replay exhaustion, or saving after the active profile/week changes. |
| Feedback | Centralize Life feedback and its `native.life.*` preferences. Success follows acknowledged changes; selection ticks may describe an explicitly displayed draft. |

Normalizers currently rebuild week/content records and discard unknown shapes. Adding a field to a type alone will not preserve it. Cover normalization, copy-week, deletion, profile switching, local mirror, export/import and restart. Keep original content until its replacement is verified. Provide read-only handling for a newer unsupported format. Do not automatically migrate every inline photo or alter CloudKit/server paths.

Existing capacity-free plans remain valid. If assigned hours exceed the proposed capacity, show the mismatch and retain the plan. If a legacy total exceeds 168 hours, require review before enabling the new capacity constraint; never truncate data. Opening Life or changing presentation alone must make no planner-data edits.

[Rec] Prefer SwiftUI/UIKit, PhotosPicker, the system file picker and native preview APIs. Evaluate an editor adapter only if standard text APIs cannot retain the agreed structure. Any new package needs a recorded license and compatibility review. Do not install browser Tiptap into the hidden planner as a substitute for the native editor.

Files and notes stay on this device unless the user explicitly exports through an existing action. No mandatory account or network call is added. Protect drafts during interruption; clean canceled imports; retain files referenced by Undo/recovery; prune only proven unreferenced files after the relevant retention period.

## 8. Risks, rabbit holes and open questions

| Item | Default and next action | Owner |
| --- | --- | --- |
| Existing More labels still say Week + Month | Keep them exactly as requested; document that this option opens Life. | Product owner, settled for this scope. |
| Production deletion affects all weeks | Retain that contract and state it in confirmation. Week-only removal is a separate decision and intent. | Product owner before changing scope. |
| Capacity absent; Classic can exceed it later | Ask for an initial value, preserve legacy plans, explain mismatches, and enforce limits on new Life intents. | Planner engineer and QA. |
| Rich content/attachments need persistence changes | Separate data PRs; verify normalization and full local backup round trips before marking parity complete. | Planner/native engineers. |
| Haptics depend on hardware and preferences | Keep optional; tune on the owner's actual phone. | Native engineer and owner. |
| Simulator/phone versions differ | Record OS/build and actual Codemagic inventory. Keep minimum deployment unchanged. | Release engineer. |
| Earlier handoffs contain old failure reports | Rerun relevant acceptance on the exact new commit. Do not promote historical success/failure to current fact. | QA/release engineer. |
| Pixel matching versus readable large text | Match standard-size reference first; allow documented accessibility reflow. | Designer and owner. |

## 9. Verification and prototype plan

### Acceptance criteria

1. Given an existing profile, selecting the existing Week + Month preview opens Life without modifying planner data. Switching back restores Classic. More has the same text, sections, controls and behavior in both modes.
2. Given a closed stack, tapping an area leaves only that card focused with its tasks below. Returning restores all cards and accessible focus.
3. Given 36 planning hours and 27 assigned, Hours shows the correct proportions and 9 unassigned. A center flick changes the draft by one hour; a circular detent changes only the chosen area's budget by half an hour. Release commits once; Undo restores the previous value.
4. Given reserved hours or a full capacity, a prohibited change leaves stored values intact, displays the reason and produces at most one boundary warning per gesture. Zero hours, canceled gestures and direction reversal remain valid.
5. Given an acknowledged change, the correct haptic occurs once. Rejected saves, screen restoration and idle animation produce no success feedback. Turning off Touch feedback silences Life's custom feedback.
6. Given a selected date, Week/Month morph preserves it across months, years and leap days. Day cards show daily reservations and tasks from the real store.
7. Given a weekly priority, Find time previews only eligible allocations, explains a shortage and never takes another area's hours. Applying it is atomic and undoable.
8. Given any task entry point, typing an outline prefix creates an editable outline. Formatting, nesting, checklists, links, old tables/photos and text history survive close/reopen and relaunch without content loss.
9. Given an imported file, its actual bytes survive relaunch and an app update, and export/import restores it. Cancel, low storage, unavailable provider and unsupported playback leave a clear recovery path. Profile files never appear in another profile accidentally.
10. Given pencil editing, left/right reveals keep card geometry stable. Accepted edits have contextual Undo/Redo. Deletion confirmation states its actual scope, and history restores the correct tasks/hours.
11. Given large type, VoiceOver or reduced-motion settings, every control remains readable and operable without requiring a drag, animation or haptic. Crown placement persists on either side.
12. Given the exact signed candidate, offline planning, force-quit/relaunch and in-place upgrade preserve the existing profile and new content. Internal TestFlight installation on iPhone 15 is verified separately from upload success.

### Checks

Run repository typecheck, lint, explicit planner/script suites, design-doc checks, native Swift tests, native UI journeys, persistence/recovery controls, offline export preflight and signed-IPA preflight. Add new tests to explicit test lists and update minimum counts. Keep Classic and More regression captures in the evidence set.

Physical iPhone 15 checks are owed: haptic feel, thumb reach, circular/held gestures, home-indicator conflicts, keyboard/dictation, VoiceOver, file-provider cancellation, offline media, background/interrupt behavior and frame pacing. Record real measurements; do not promise a frame rate from simulator success.

### Prototype plan (when feel is the open question)

The approved browser already answers the visual direction. Use a native development slice to calibrate gesture thresholds, springs and haptics on the phone. Live data, saves, Undo and file bytes must be real. Demo data and simulated persistence cannot establish acceptance. Test with a disposable profile first, then an in-place upgrade of a backed-up real profile. Ask: Can you tell what to do? Is changing time easy? What needs to be clearer? Preserve the browser as reference and implement against production contracts.

## 10. Rollout, rollback and release

Implement on focused branches from the verified baseline, through draft PRs. Keep the existing preview flag false by default. Do not change More or Classic as part of a shared refactor. The [checklist](SPREAD_LIFE_IOS_CHECKLIST.md) owns the exact Codemagic and iPhone steps.

Add a manual-only Life candidate workflow rather than weakening current main/old-candidate guards. Use the existing signing identity, offline flags, project, scheme, build-number protections and preflights. Build/test first; upload only the reviewed commit. Uploading to App Store Connect is separate from processing, assignment to an internal TestFlight group and installation. Keep external beta review and App Store submission disabled. [Codemagic publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/) and [Apple internal testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/).

Immediate UI rollback is the unchanged Classic choice. That does not undo new stored data or make an older binary safe. Binary rollback requires a verified compatible build and protected backup; never delete/reinstall the app to fix a test failure. No merge, build trigger, upload or deployment is performed by this documentation task.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-06 | Use the approved browser design as the Life target inside the existing preview choice. Keep More/Settings as is. | Product owner in this chat. | This spec, design decision log and native-board scope note. |
| 2026-11-06 | Retain the native host and authoritative planner; separate persistent feature work from presentation work. | Engineering recommendation based on inspected source. | This spec and implementation checklist. |

Documentation verification only: the native changes, Codemagic job, signed build and physical-device acceptance remain to be implemented and run. The prior browser's test results do not establish native acceptance.
