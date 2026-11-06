# Spread — iPhone Duo adaptive design review
> Part of the [Spread design map](../README.md).
**Status:** OWNER APPROVED IMPLEMENTATION · NATIVE VERIFICATION PENDING · RELEASE NO-GO  
**Scope:** Original PR #145 design packet; subsequent owner-approved SwiftUI changes are on the same draft PR. Planner data, main and production remain unchanged.  
**Baseline inspected:** `main` at `b074b881ff6b1134d745ce1697f841069d92cf4b`; pre-review PR #145 head `ff16913ca1d010317c8af038b50b60dcf5f619aa`.  
**Single product model:** Responsibilities → Hours → Week → Tasks. **Two adaptive presentations**, not a separate design for each Duo pose.

> **Evidence labels:** VERIFIED = observed in repository source/tests; APPLE = official published platform guidance; PROPOSED = review-stage design contract; UNVERIFIED = native behavior requiring Xcode evidence. The SVGs below are **conceptual review visuals, not screenshots or proof of a working native implementation**.

## 0. Design packet and owner-approved amendment

| View | Visual | Decision this visual makes |
| --- | --- | --- |
| Compact: closed Duo / standard iPhone | [01 · Compact Spread + Week](../review-visuals/duo-01-compact.svg) | Existing Spread/Week destinations stay distinct and navigable; same Crown, Wallet, tasks, scroll |
| Regular: unfolded Duo / spacious iPad | [02 · Expanded shared planner](../review-visuals/duo-02-expanded.svg) | Responsibilities + Hours at left; Week + Tasks at right, sharing one selected role and store |
| Partially folded like a book | [03 · Hinge-aware split](../review-visuals/duo-03-book-fold.svg) | Existing two panes avoid the active division region; no control or actionable card crosses hinge |
| Partially folded like a laptop / Split View | [04 · Resized and reflowed](../review-visuals/duo-04-resized.svg) | Reflow or collapse to compact when useful pane widths cannot fit; controls remain reachable |

**Approval record:** Owner approved implementation of the adaptive SwiftUI design in PR #145, then requested a **vertical Crown placed near the thumb on the outer edge** of the expanded layout and a **Settings toggle between left and right** (default right). Compact keeps its horizontal Crown. The new Crown is in `VerticalWeekCrownView.swift`, `SpreadLiveRoot.swift` and `ManageSheets.swift` on PR #145, awaiting native acceptance. The expanded SVG concepts predate this Crown-specific amendment. They are not simulator screenshots.

## 1. Apple guidance: directly applicable, not nine UI designs

[Apple — Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo), [Design for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111466/), [Strike a pose with adaptive layouts](https://developer.apple.com/videos/play/tech-talks/111463/), [Prepare your app for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111461/).

- **APPLE:** Design with compact and regular size classes, safe areas and actual available container space; don't branch by device ID, orientation, pose number or a fixed device-resolution table.
- **APPLE:** Regular width can reveal more hierarchy; existing content/navigation should remain recognizable when resizing. On Duo, outer portrait is compact width; inner is regular; Split View and rotations can change practical content capacity.
- **APPLE:** Standard system navigation/toolbar containers reposition controls appropriately, including vertically where required. Check actual toolbar behavior with Xcode 27.1 rather than simulating a custom side dock based on guessed device dimensions. Custom chrome is not automatically repositioned.
- **APPLE:** Active division reserved regions represent the hinge while partly folded. Keep coherent, actionable components within usable regions; move related controls as units. Do not displace long, continuously scrolling lists just to mimic pose geometry. Camera occlusion and asymmetric insets must also be respected.
- **APPLE:** `NavigationStack`, `NavigationSplitView`, `TabView`, `List` and `ScrollView` provide adaptive behavior. `ArrangementView` is optional and should not be nested indiscriminately in navigation or scrolling containers. Query `GeometryProxy.reservedRegions` with iOS 27.1 availability gating if the native layout actually needs hinge-specific displacement.
- **APPLE:** Xcode 27.1 Device Hub, iPhone Duo simulator, real resizing, rotation and fold/pose controls are the evidence source. Concepts and Linux/unit tests are not screenshots of the installed app.

**Explicit engineering constraint:** choose an available-space-fit layout, taking size classes into account, not a `UIScreen.main.bounds` predicate, `isDuo` flag, new nine-case state machine, or pixel-perfect dimensions borrowed from SVG artboards. Approximate numerical padding/target dimensions in this spec are spacing/tap targets, **not** device layout breakpoints.

## 2. Verified starting point and existing friction

| Current implementation (verified from main) | Design implication |
| --- | --- |
| `SpreadLiveRoot.swift` stores `destination`, week/date, selected role, edit state and sheet state; distinct `SpreadSurface` and `WeekSurface` branches. A feature-flagged `WeekFocusSurface` branch exists. | Retain single owner of navigation and planning state; regular two-pane composition **not present in the inspected primary root**. Avoid parallel state models or copying snapshots per pane. |
| `SpreadSurface.swift`: one owner-approved Wallet Stack with independent expansion, hour summary, task rows, edit mode, haptics and optional action reveal. | Keep the same actual Wallet component/Chalkboard art and interactions; don't replace it with a generic flat list, a new Fan/Dial selector, or invented Home destination. |
| `WeekSurface.swift`: free-time chips, To place tray, seven day cards; adaptive 1/2-column display through `PlannerLayout.dayColumns`. Horizontal week changes use a custom UIKit `UIPanGestureRecognizer` attached to the ancestor `UIScrollView`. | Existing day columns already resize; extra coordination is needed between horizontal navigation, vertical scrolling, chip scrolling and gestures. Don’t claim solved from code alone. |
| `WeekFocusSurface.swift`: day overview, daily detail, separate sidebar rail, and ad hoc horizontal drag recognizers. | Do not overlay a second competing navigation surface. Review candidate for reusing focused day detail; reconcile focus with regular two-pane layout only after owner approval. |
| `SpreadTheme.swift`: dynamic dark/navy and light/cream tokens, 44pt minimum target, `SpreadMotion` and reduced-motion adaptations. | Reuse exactly; no colors, font family, custom design system, or app logo changes. |
| `PlannerLayout.swift`: 1/2 day columns based on available width and accessibility text. | Keep content-fit responsive day placement; do not confuse day-column count with two primary navigation-size classes. |
| `ios/App/SpreadNativeUITests/PlannerUITests.swift` includes a native Wallet swipe assertion; recent current-head native run failed it. | Critical gesture behavior must be verified with a real XCUITest and screenshot; a diagram cannot certify it. |

**Current native test truth (pre-design, PR #145 at `ff16913c`):** CI and App Store source preflight passed. Duo hinge acceptance [run #42102328118](https://github.com/WGLewis0721/spread-app/actions/runs/42102328118) failed the simulator panel-table / reserved-region automation preconditions (53-node preflight passed; 9 PASS/4 FAIL/56 BLOCKED checks). iOS shell [run #42102328375](https://github.com/WGLewis0721/spread-app/actions/runs/42102328375) executed 15 native journeys with 10 failures, including the test assertion **“Left swipe did not reveal Manage”**; several further XCUITest launch/termination errors followed. These are unresolved, distinct findings. No new adaptive UI has been built or tested.

## 3. Compact specification — closed Duo, standard iPhone, narrow resized windows

**Hierarchy:** one destination at a time, using the established `Spread` / `Week` switch. `Month` stays inside Week. Compact is **not** a stripped-down version: responsibilities, hour adjustments, Week, tasks, profiles, settings and recovery remain accessible in familiar places.

**Navigation and chrome**
1. Preserve blue folded-card app mark, system sans typography, existing Spread/Week destinations and their accessible labels. The existing brief label-collapse behavior may remain when text size allows, but the destination must remain identifiable and the minimum 44pt hit area must survive.
2. Preserve metallic horizontal Crown with previous/next week buttons and exposed week date; it must not collide with a camera, side controls, text or other chrome. Existing keyboard/VoiceOver actions remain. Use a real container safe area, never an absolute top-left device offset.
3. Existing edit/settings/Week–Month controls remain discoverable. If required by native bar behavior, place existing actions in the system-supported navigation/toolbar locations, **without adding a new destination or interaction**. Never hide the only route to Edit, Settings, Week or Tasks in an unexplained icon.
4. On narrow resized and accessibility layouts, allow header/control groups to wrap or disclose *existing* secondary actions; keep primary destination and Crown navigation visible and directly actionable.

**Spread / Wallet / Hours**
5. Start with compact actionable hours summary (`remaining / scheduled / overbooked`), followed by the one Wallet Stack. Preserve persisted responsibility color, original Chalkboard drawings, selected responsibility and role-hour steppers. All summary status values come from the planner snapshot.
6. Closed Wallet cards may overlap visually, but chevron, role name, hour value and clear tap affordance remain accessible and outside other touch targets. Expansion grows the tapped card **naturally**; its task content scrolls with the page, not in a nested trap.
7. Tap/chevron expands or selects. Tap Edit or long-press enters existing edit mode; in Edit, swipe the **entire** card left to reveal Manage on the right or right to reveal Delete on the left. Do not change card width or text layout as the card slides. Delete remains confirmed. VoiceOver named actions and alternative control routes stay available.
8. Vertical scrolling always wins vertical input; horizontal Wallet drag only activates after clear directional intent. A multi-line title and large text must never clip hour controls or important task actions.

**Week / Tasks / scrolling**
9. Week retains its existing compact role/hour chips, free-time suggestions, grouped dashed To place tray, and seven day cards; preserve tasks and the direct tap equivalents for all drops. Retain existing eligibility rules for placing tasks under their responsibility's allocated hours.
10. Days scroll vertically to the end (including final day and controls), with normal system scroll momentum. Horizontal swipe on the **day region** changes weeks only when horizontal intent is unambiguous; it does not steal a vertical scroll, a task gesture, or the separately horizontal role-chip strip. Crown/arrow navigation remains a non-gesture fallback.
11. Day cards show role blocks, planned hours, folded task lists, completion and editing. Task editor is the established native sheet; Notes/Outline/Table/Photo stay intact. Week-to-Month or Task-to-Week navigation must not reset selected role, current week, unsaved draft or scroll identity unexpectedly.
12. Empty, offline, long-label, dense-task, dynamic-type and overbooked states are real layouts, not demonstration-only placeholders.

## 4. Regular specification — open Duo / spacious iPad / wider windows

**Two coordinated regions, one planner:** Responsibilities + Hours on the **leading pane**, Week + Tasks on the **trailing pane**. They are two views into the same `LivePlanner` snapshot and dispatch path; a task or hours change appears consistently in both with no second owner or copied data store. This is a layout reorganization of Spread and Week, **not a new dashboard**.

**Leading pane: Responsibilities / Hours**
1. Show the existing actionable hour summary, Wallet Stack, add responsibility and inline hour adjustment. Keep one vertical scrolling container for this pane; cards can expand independently without intruding on the other pane.
2. A tapped responsibility becomes the shared selection and highlights relevant hours/role chip/allocations in the Week pane; no automatic task movement or silent planning change. Existing Manage/Delete/Edit and confirmation behaviors are unchanged.
3. Allow the leading pane to receive natural space by content fit. It must not shrink below the required accessible Wallet card width; if both panes cannot fit, use the compact presentation rather than forcing a two-pane squeeze.

**Trailing pane: Week / Tasks**
4. Crown and Week navigation stay beside/above the weekly context, **not stretched across the hinge**. Show the current seven-day overview, readable selected day detail, existing role chips, To place tray and task interactions without duplicating every week card at excessive width.
5. Use existing day-card and task components where they fit; the selected day detail may occupy the trailing section below the week overview. Never display different week keys or selection in separate panes.
6. Independently scroll Week and Responsibilities vertically where sensible; one pane's scroll must not reset the other's selection, and vertical input should not trigger week navigation. Horizontal Crown/week navigation applies only to the shared week.
7. Keep the familiar Spread/Week navigation semantics. In regular view both sections are visible; activating the corresponding existing destination control **focuses the named pane** rather than hiding the other one. Do not introduce a third navigation level. When window collapses to compact, restore the last focused destination.

**Header, toolbars and accessibility**
8. Share an adapted header, not two redundant headers. Use SwiftUI standard navigation/toolbar placement if appropriate for vertical controls; keep existing icon titles and 44pt targets. Avoid two independent edit modes and two Crown controls.
9. The selected role, selected day, current week, active task sheet/draft and stored profile persist as the container reflows. VoiceOver reading order is leading region then trailing region, with clear region headings and independent accessible scroll actions.
10. The regular presentation is **not guaranteed merely by `horizontalSizeClass == .regular`**: consider actual usable window/region size and large text. If measured content cannot fit, use compact presentation even when the system size class is regular; no device-specific breakpoint is allowed.

## 5. Partly folded, rotation and Split View contract

- **Book-style partial fold:** when an active vertical division reserved region exists, constrain the leading and trailing panes to the two usable regions, with readable margins and no interactive content crossing the hinge. Pinned Crown, sheets and the action trays belong wholly to one side. Respect RTL layout direction. **Do not** displace the continuously scrolling Wallet list itself merely because the fold is active.
- **Flat/open Duo:** regular two-pane presentation only if actual pane widths satisfy content fit. Otherwise the same compact experience; the active selection/scroll focus does not reset. No “open-Duo” special feature.
- **Laptop/tent-like pose:** respond to available region geometry, safe areas, and interaction reach; content may reflow from side-by-side into compact/stacked, but navigation, task editing and safe controls stay reachable. Do not create a new laptop product mode or a video-first layout for Spread.
- **Closed outer display / outer landscape / resized Split View:** keep fully usable compact layout (or regular only when *truly* spacious) with proper asymmetric safe-area offsets; no cut-off dock, hidden Week controls or stretched fixed card art.
- **Camera, bar, and overlay geometry:** backgrounds can bleed; interactive foreground controls stay within the safe area and away from active occlusion regions. Presented sheets/confirmation dialogs should use native placement and not cover the hinge.
- **Architecture choice deferred to engineering:** use current root with adaptable child composition and `GeometryReader`/size classes. Prefer system containers over bespoke posture handlers. Introduce reserved-regions query **only** for an actual active division/occlusion problem and guard 27.1 APIs for prior iOS support. No hinge angle polling needed for planning content.

## 6. Component contracts — sizing, motion, touch, accessibility

| Component | Visual sizing & adaptive behavior | Touch/gesture contract | Accessibility + motion |
| --- | --- | --- | --- |
| Header, app mark, Spread/Week control | Use existing SF and native semantic tokens; layout margins + safe area, title may yield space to actions; regular pane-focus behavior, compact destination switching | 44pt minimum independent targets; no conflicting click zones; no gesture required | Announce active destination/pane; labels retained in large text; if labels collapse, permanent accessibility labels stay |
| Crown / week date | Existing machined metal, recessed navy centre and readable week date; fit available region; no cross-hinge span | Prev/next >=44pt; original detents/drag, keyboard and VoiceOver alternatives, acknowledged-only haptic | Spoken current week and direction; no clipping; Reduce Motion removes physical translation |
| Wallet Stack | Same full-available-pane width, 24pt-ish role-card radius from `Spread.radiusCard`, naturally growing height, original role colour/Chalkboard art, no per-device fixed card size | Tap expand/select; Edit or 0.55s long-press; **in Edit** left-swipe Manage, right-swipe Delete; confirmation on delete; vertical page drag unaffected | 44pt targets; named Manage/Delete actions; dynamic text wrapping; bounded role glow static under Reduce Motion |
| Hours summary / stepper | Compact disclosure summary; regular leading pane; hours reflect shared store and current week, never duplicated as alternate input model | Stepper +/- and summary taps >=44pt; preserve overbooking safeguards | Speak amount, role and change; color not only status cue; no haptic until accepted store change |
| Week overview / days | Compact: seven vertically scrolling day cards, existing `PlannerLayout` adapting card columns. Regular: seven-day overview plus selected detail, flexible trailing pane; day targets avoid active fold | Vertical ScrollView wins vertical gesture; horizontal day-area week swipe only; Crown arrows non-gesture fallback; role bubble strip scrolls independently | Read all seven days, today, amount and empty state; accessible Prev/Next; no missing last day or nested scrolling dead end |
| To place / Free time / tasks | Dashed To place, suggestion chips visually distinct, solid day cards; responsive chip wrap and full-width task rows | Every drag has tap/keyboard alternative; `Move to` obeys role/day eligibility; confirmation and Undo retained | Task actions >=44pt, semantic completion state, editable Notes/Outline/Table/Photo stay reachable; Dynamic Type no clipping |
| Task / role sheets, Settings | Native sheets/alerts and existing Settings contents; presenter stays anchored to active pane/usable region | Standard dismiss, cancel, save and destructive confirmation; no gesture-only requirement | Focus returns to invoking control; VoiceOver sheet order; keyboard safe area; state/drafts persist when resizing |
| Animations/haptics | Reuse `SpreadMotion` curves and existing haptic signals; no new looping flourish or duplicate animations | One feedback signal per acknowledged edit/selection/navigation; no haptic for canceled or failed writes | `accessibilityReduceMotion` disables offsets, pulsating and scale effects; Reduce Transparency/Increase Contrast supported |
| Safe areas / reserved regions | Respect each inset individually; use parent `GeometryReader` for usable width/regions; adaptive margins and rhythm (roughly 12–20pt), no screen-size branches | Every reachable control remains outside hinge/occlusion and exposed when toolbars vertical | Inaccessible/offscreen controls are release failures; test RTL, landscape, very large text |

**Visual source of truth:** `ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift`: dark canvas `#060B18`, elevated `#101C32`, inset `#0A1427`, ink `#F7FAFF`, action blue `#0A84FF`, light cream `#F4F1EA`; existing role colors remain data-driven. No new visual language. Original illustrated category assets are preserved; simplified shapes in SVG diagrams are **placeholders for the actual artwork**, not replacement-asset approval.

## 7. Screen-by-screen delta: current → adaptive

| Existing screen/surface | Unchanged | Moves / changes on compact | Moves / changes on regular / partially folded |
| --- | --- | --- | --- |
| Global shell | Folded-card Spread icon; Spread/Week destinations, Crown, Settings, edit actions, semantic tokens | Focused single screen, existing dock/nav; safe-area offsets update with window | One shared accessible header; existing nav chooses pane focus; actions placed by system-adaptive bars where beneficial, not duplicated |
| Spread / Wallet | One Wallet Stack, independent expansion, selected role, artwork, role colors, edit/swipes/delete confirm | Full-width naturally growing cards, hours above Stack | Stack + Hours in leading pane, same cards/actions; no flat-list replacement |
| Hours | Real budget, stepper, status, overbooking rules, no duplicate store | Compact summary opens breakdown | Status and stepper integrated with responsibilities in leading pane; reflects Week updates |
| Week / Crown | Current week, prev/next, day scheduling, role chips, free time, 7 days | Week destination; vertical day scroll + horizontal week gesture | Week + selected detail always visible in trailing pane; Crown constrained to trailing region; hinge-safe |
| Tasks / To place / Move | Task list, rich content, eligibility, tap alternatives, Undo, confirmation | Existing task sheet or inline row reachable from day and Wallet | Same editor/To place in trailing pane, selection shared; native sheets in usable region |
| Month | Month inside Week; current/selected dates and existing actions | Week/Month existing toggle remains | Same Month in trailing pane; no new permanent third navigation |
| Edit / Settings / Profiles | Existing menu entries, recovery, local-first profiles, color editing | Same entry points and confirmation | One shared edit state, no doubled controls; Settings presented adaptively |
| Folded/resized/rotated scene | Same data, tasks, week, selection | Compact at insufficient useful space, not a new pose UI | Pane widths/spacing respond to active reserved region; reflow or collapse; no hinge-overlapping controls |

## 8. SwiftUI reuse vs modification list

| File / existing component | Decision | Reason / boundary |
| --- | --- | --- |
| `SpreadTheme.swift` / `SpreadMotion`, role colors, Chalkboard assets | **REUSE unchanged** | Approved identity, semantic appearance, Reduce Motion and art |
| `LivePlanner` + snapshot / headless WebKit writer / storage and `PlannerSnapshot` | **REUSE unchanged** | Sole planning source of truth, no migration / duplicated data |
| `SpreadSurface`, `RoleRow`, `StackLayout`, `TaskRow`, `HourStripRow` | **REUSE content and interactions; adjust composition only if approved** | Wallet stays single stack; change to fit pane not a wholesale redesign |
| `WeekSurface`, `DayCard`, `AllocationRow`, `HourStepper`, `ToPlaceTray` | **REUSE content; REVIEW gesture and layout integration** | Seven days and task eligibility already modeled; custom UIScrollView recognizer must not intercept vertical scroll |
| `WeekFocusSurface`, `ResponsibilitySidebar` | **REUSE selectively; RECONCILE with root** | Existing focused-day implementation is under a feature flag; cannot make two unrelated sidebars compete |
| `SpreadLiveRoot.content` | **MODIFY after approval** | Needs one adaptive composition, shared pane selection/focus and stable navigation state |
| `WeekHorizontalSwipe.Coordinator`, Wallet swipe in `StackLayout` | **MODIFY only if native failures reproduced/diagnosed** | Existing UIKit custom gesture + last native Wallet failure require targeted evidence-driven correction |
| `PlannerLayout.dayColumns` | **REUSE / extend content-fit approach if needed** | Already based on available layout width and Dynamic Type |
| `SceneDelegate`, navigation/toolbar placement, native sheet presentation | **REVIEW and possibly MODIFY after approval** | Vertical system bars, asymmetric safe areas and fold regions need real native checks |
| `PlannerUITests.swift`, native acceptance workflows and evidence collection | **Extend only after design approval** | Need screenshots and assertions of both presentations / fold outcomes. Existing red tests are not evidence of approved layout |

No new third-party navigation libraries, account system, data schema, custom 9-pose compositor, or separate product feature is proposed.

## 9. Acceptance criteria and evidence contract

All criteria are required **after design approval and implementation**; none can be marked PASS because a mockup looks plausible.

| ID | Native acceptance test / expected result | Required evidence |
| --- | --- | --- |
| A01 | On standard iPhone and closed outer Duo: compact Spread, Week, Month, Tasks, Settings and editing reachable; no hidden primary action | Xcode 27.1 screenshots of actual app, hierarchical UI tree and navigation XCTest |
| A02 | On open inner Duo and suitable iPad: two-pane Responsibilities/Hours + Week/Tasks; same selected role/week/tasks in both | Two-pane screenshots and XCTest cross-pane state assertions |
| A03 | On partially folded book: no title, card hit region, Crown control, sheet or tray crosses active division reserved region; contrast/spacing legible | Device Hub fold readback, reserved-region frames, simulator screenshot, accessibility hit regions |
| A04 | On laptop/tent / resized Split View / rotation: content reflows or collapses based on useful space without disappearing, clipping or changing navigation semantics | Before/after screenshots, size-class/usable-frame log, reachable-controls test |
| A05 | Vertical Week scroll reaches all seven days and last action; horizontal week swipes move exactly one week; role-chip horizontal scroll does not change week | XCUITest direction and endpoint assertions + screenshot or screen recording |
| A06 | Wallet expands independently; Edit and long-press parity; left reveals Manage, right reveals Delete only in Edit; geometry stable, delete confirmed | XCUITest before/after frames, action selector hit tests, confirmation recording |
| A07 | All changing responsibilities/hours/task actions use same planner snapshot; eligibility rejects illegal moves; Undo, edits, notes/outlines/tables/photos work | Native end-to-end stored-state assertion and editor screenshots |
| A08 | Fold ↔ unfold, rotate ↔ rotate back, background ↔ foreground and relaunch preserve persisted week, hours, tasks, profile; transient selections/draft state survive layout transitions as applicable | Before/after snapshot hashes and visible UI verification; no silent double writes |
| A09 | VoiceOver, Switch Control/keyboard paths, Dynamic Type accessibility sizes, Increase Contrast, Reduce Motion and Reduce Transparency retain complete functionality | Xcode accessibility audit, target-size assertions, screenshots at large text and reduced motion |
| A10 | Standard iPhone portrait/landscape and iPad portrait/landscape retain baseline features; no regression of original Crown, Wallet, Week, Month, drag alternatives or local-first recovery | Same-dataset baseline versus candidate XCTest runs and matched screenshots |
| A11 | All supported Duo folds/orientations are visited in Device Hub **as test configurations**, not as nine layout implementations; no missing condition, hang or automation BLOCKED accepted | Exact-device mode/pose inventory + screenshot per supported scenario, traceable PASS per cell |
| A12 | Release gating: compile/test/a11y/artifacts complete on **one approved final commit**, all required workflows PASS, owner approves any merge/deploy separately | SHA-indexed GitHub Actions matrix, screenshots, XCUITest xcresult, rollback plan and explicit signoff |

**Minimum review fixtures:** empty and populated planner; 1/3/10 responsibilities; one very long role name; 0/10/100 tasks; planned/unplanned/overbooked and overdue work; long notes/tables; multiple profiles; light/dark; large text, RTL, Reduce Motion. Check no focus trap, text clipping, horizontal viewport overflow, unreachable last day or duplicated store updates. Simulators must report the actual runtime and SDK; do not claim Xcode 27.1 verification from an Xcode 26.6 job.

**Release gates, ordered:**
1. **Design approval granted** for the compact/regular design and later side-Crown amendment; release approval is separate.
2. Focused implementation on existing PR #145 only; baseline main untouched pending merge approval.
3. Deterministic unit and native tests; correct any failed assertion **only with identified cause and reproduction**; preserve artifacts.
4. Xcode 27.1 Device Hub compact/regular/part-folded plus standard iPhone/iPad matrix evidence.
5. Separate owner authorization to merge or deploy. PR stays draft and release stays **NO-GO** until then.

## 10. Review decision record

- [ ] Owner approved compact hierarchy/behavior.
- [ ] Owner approved expanded shared planner and pane-focus behavior.
- [ ] Owner approved book-fold/resize displacement and fallback.
- [ ] Owner approved unchanged Wallet/Crown/brand/gestures and native evidence acceptance.
- [ ] Owner separately authorized implementation in PR #145.

**Design specification is ready for review; approval is intentionally pending.**