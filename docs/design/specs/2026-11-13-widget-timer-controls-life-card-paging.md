# Spec: Responsive Focus controls and editorial Life-card widgets

> Part of the Spread design brain. [Design map](../README.md) | [Spec protocol](../PLAN_SPEC_PROTOCOL.md). This is a **researched implementation plan**, not an implemented or device-tested change. No merge, deployment, TestFlight upload, or production release is authorized by this spec.

| | |
| --- | --- |
| Request | Repair delayed timer controls; Play must become Pause and vice versa; show Play/Pause, Forward and Cancel on every Timer widget size; use media-icon controls in the app; add the actual Spread logo and Life artwork to Life-card widgets; navigate vertically with position dots |
| Restated | On a supported iPhone, a person can identify, operate and verify the same focus session across widget, app and Live Activity and browse recognizable Life cards without encountering hidden controls or falsely suggested gestures |
| Surface | Native iPhone: Home Screen Timer small/medium/large, Today medium, Life cards medium/large, in-app Focus sheet and Life Wallet, expanded Live Activity |
| Size | L: cross-process state/latency, widgets, asset distribution and native gestures |
| Author / baseline | ChatGPT design audit, 2026-11-13 local; Spread main commit a25a0852bddc82774813c32b4c5b9bca70350a28; Gray Matter main 8871c85930317025a309c08a5261d81cb06acee2 |
| Status | **Implemented on PR #208 feature branch; native build, measured latency and physical-device QA unverified.** Owner directed implementation and merge without waiting for test/simulator completion. |
| Governing docs | [RULES_CARD](../RULES_CARD.md), [spec protocol](../PLAN_SPEC_PROTOCOL.md), [native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), [Life artwork](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md), [existing widget continuity spec](2026-11-13-widgets-timer-life-cards-continuity.md), [Gray Matter library](https://github.com/WGLewis0721/Graymattertechllc-/tree/8871c85930317025a309c08a5261d81cb06acee2/app-design) |

## 1. Problem

A user starts a focus round, then presses a widget control. The widget appears slow to respond; Play/Pause is not perceptibly immediate. On small or medium widgets the required Forward and Cancel controls disappear. In the app, the Focus sheet uses word-only buttons. Life-card widgets discard Spread's recognizable logo and installed card art and provide navigation that does not match the requested vertical browse experience. The result looks and feels inconsistent even though the screens draw from the same local timer and planner.

## 2. Evidence and context

**[Repo: verified source, not runtime measurements]**

- [Timer widget lines 469-533](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/App/SpreadWidget/SpreadTimerWidget.swift#L469-L533) uses one shared list of applicable actions and 44 pt buttons; [lines 567-627](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/App/SpreadWidget/SpreadTimerWidget.swift#L567-L627) lay out small/medium/large. [Control rules lines 128-160](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadWidgetShared.swift#L128-L160) explicitly truncate small to one control and medium to two.
- [App Focus sheet lines 82-144](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimerSheet.swift#L82-L144) uses text-only Pause/Resume/Forward/Stop/Cancel buttons. The widget itself already has media-shaped SF Symbols in [SpreadTimerWidget.swift lines 184-231](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/App/SpreadWidget/SpreadTimerWidget.swift#L184-L231).
- [Focus intent path lines 10-35](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusIntents.swift#L10-L35) saves the shared session, refreshes ActivityKit, publishes widget mirrors, and updates local notifications. [Widget publisher lines 13-64](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadFocusWidgetPublisher.swift#L13-L64) reloads both Timer and Today timelines. **[Assumption, needs measurement]** intent launch + main-actor work + timeline rendering contribute to perceived latency; this audit has not measured which stage dominates.
- [Life-card widget lines 205-225 and 285-325](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/App/SpreadWidget/SpreadLifeCardsWidget.swift#L205-L325) already has previous/next buttons, a numeric counter, and dots **only in the large layout**; [lines 130-171 and 308-326](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/App/SpreadWidget/SpreadLifeCardsWidget.swift#L130-L171) use gradients and a text-only “SPREAD” wordmark. [Native artwork registry lines 29-51](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeEditorialCard.swift#L29-L51) loads local category artwork, with six existing resources: Family, Fitness, Home, Personal, School and Work. Other categories require a deliberate fallback.
- [Life-card selection lines 46-132](https://github.com/WGLewis0721/spread-app/blob/a25a0852bddc82774813c32b4c5b9bca70350a28/ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeWalletStack.swift#L46-L132) implement the existing Wallet stack and downward pull-to-close. A new in-app swipe must not break this interaction.
- [Old widget spec section 4 and section 24](2026-11-13-widgets-timer-life-cards-continuity.md) forbids card artwork and limits controls by size. The owner's new request supersedes **only those two presentation decisions**, not the underlying timer semantics, local-first privacy switches or existing WidgetKit store boundaries.

**Gray Matter Design Library: precise source traceability**

| Exact library reference (pinned revision) | Rule applied to Spread |
| --- | --- |
| [DESIGN_SYSTEM.md L27-L32](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/DESIGN_SYSTEM.md#L27-L32) and [L45-L55](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/DESIGN_SYSTEM.md#L45-L55) | Reuse semantic colors/type/spacing; specify all widget control states and contact-to-confirmation motion |
| [IOS_PLAYBOOK.md L11-L19](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/IOS_PLAYBOOK.md#L11-L19) and [L23-L27](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/IOS_PLAYBOOK.md#L23-L27) | Prefer native controls and one authority; art independent of live labels/state; test gesture and timing on hardware |
| [EDITORIAL_CARD_AND_ARTWORK.md L7-L32](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/EDITORIAL_CARD_AND_ARTWORK.md#L7-L32) | Preserve card anatomy and title/hours; artwork is background only, with replaceable category registry, text-safe zone and missing-art fallback |
| [OBJECT_FIRST_NATIVE_PATTERNS.md L7-L26](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/OBJECT_FIRST_NATIVE_PATTERNS.md#L7-L26) | One selected Life-card ID; explicit next/previous alternative; visual browsing never writes planner data |
| [TACTILE_MOTION_AND_DEVICE_QA.md L15-L19](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/TACTILE_MOTION_AND_DEVICE_QA.md#L15-L19) and [L66-L70](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/TACTILE_MOTION_AND_DEVICE_QA.md#L66-L70) | Immediate local feedback, authoritative confirmation, measured device latency and explicit unverified evidence |
| [UI_AUTOMATION_AND_EVIDENCE.md L16-L24](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/UI_AUTOMATION_AND_EVIDENCE.md#L16-L24) and [L30-L57](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/UI_AUTOMATION_AND_EVIDENCE.md#L30-L57) | Assertions measure true outcomes; distinguish OS delay, app bug and test timing; release evidence by commit |
| [CREATIVE_ASSET_PRODUCTION.md L68-L83](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/CREATIVE_ASSET_PRODUCTION.md#L68-L83) | Use licensed original masters, optimized derived assets, repeatable masks and documented rollback |
| [UX_REVIEW_AND_SPEC_PROTOCOL.md L46-L68](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/UX_REVIEW_AND_SPEC_PROTOCOL.md#L46-L68) | Large cross-surface change: three structural alternatives, state model, implementation/test and rollback |
| [NATIVE_UI_REFERENCES.md L9-L15](https://github.com/WGLewis0721/Graymattertechllc-/blob/8871c85930317025a309c08a5261d81cb06acee2/app-design/NATIVE_UI_REFERENCES.md#L9-L15) | Apple's documented controls and existing source take precedence over installing another package |

**[Apple: exact platform/process rules not specified by the Gray Matter library]**

1. [Adding interactivity to widgets](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities): widgets handle Button and Toggle via App Intents; after perform returns, WidgetKit reloads the timeline. Toggles render **optimistically**; buttons do not remain in a pressed state. App-process LiveActivityIntent launch can introduce latency. Measure instead of claiming a fixed OS response time.
2. [Creating a widget extension](https://developer.apple.com/documentation/widgetkit/creating-a-widget-extension): widgets are **not normal scrollable/gesture-recognizing app screens**. Do not promise a functioning swipe-up pager inside a Home Screen widget.
3. [Widgets HIG](https://developer.apple.com/design/human-interface-guidelines/widgets), [Buttons HIG](https://developer.apple.com/design/human-interface-guidelines/buttons) and [contentMarginsDisabled](https://developer.apple.com/documentation/swiftui/widgetconfiguration/contentmarginsdisabled%28%29): glanceable size-specific content, normally 16pt margins (11pt may be used for denser controls), recommended 44pt tap targets and deliberate custom margins.
4. [SwiftUI verticalPage](https://developer.apple.com/documentation/swiftui/tabviewstyle/page%28indexdisplaymode%3A%29) and [Page controls HIG](https://developer.apple.com/design/human-interface-guidelines/page-controls): real vertical paged gestures and page indicators are appropriate **inside the foreground app**, not a swipe promise in WidgetKit.
5. [SwiftUI invalidatableContent](https://developer.apple.com/documentation/swiftui/view/invalidatablecontent%28_%3A%29) and [WWDC23 Bring widgets to life](https://developer.apple.com/videos/play/wwdc2023/10028/): show honest pending feedback; evaluate an optimistic Play/Pause Toggle; do not imply state is committed until the store confirms it.
6. [WidgetKit SwiftUI views](https://developer.apple.com/documentation/widgetkit/swiftui-views): check widget-supported SwiftUI content before selecting a control; UIKit gesture bridges are not a viable WidgetKit workaround.

## 3. Goals, non-goals and budget

- **Goals:** Play/Pause changes icon with state; Forward and Cancel are visible as controls in **every active Timer widget size**. In-app timer uses recognizable media icon buttons. All surfaces reflect one session with no double-start, loss of pause time, or unintended automatic break. Life card widgets use actual Spread brand mark plus existing category art, text/days from planner, clear position dots/counter and visible Up/Down page navigation. Foreground Life browsing supports a real swipe-up equivalent without corrupting the current Wallet stack.
- **Non-goals / no-gos:** no fabricated widget swipe support; no replacement of Apple's launcher icon; no cloud/backend, new persistent planner store, schema, user account or automatic completion of tasks; no animated WebP or a second editorial art collection; no removal of **Stop** semantics; no changes to Claude's timer widget sizing or recurring-plan month-dot business logic beyond the specifically requested redesign.
- **Appetite:** two focused implementation PRs after owner approval: (A) timer state, controls, performance and related tests; (B) Life-card presentation/navigation and art, with one plan/spec/decision source.

## 4. Rules that apply and exceptions needed

| Rule | Implementation constraint |
| --- | --- |
| [Spread RULES_CARD](../RULES_CARD.md), native Look / Boundaries | Respect existing navy/cream, system fonts and 44pt touch target default; no changes to planner store, cloud, backup, security or launchers |
| Gray Matter DESIGN_SYSTEM L45-L55 | Press/selected/disabled/pending/failure states and reduced motion are designed, not inferred |
| Gray Matter EDITORIAL_CARD_AND_ARTWORK L13-L32 | Keep approved art independent of real role names/hours and interactions |
| Gray Matter IOS_PLAYBOOK L11-L27 | App Group data is a projection, timer record is authoritative; no separate owner |
| Apple's WidgetKit interactivity | Widget button navigation, not fake drag/TabView gestures in the extension |

**Exceptions to acknowledge:** Older spec explicitly prohibits widget card art and limits small/medium controls. Owner request supersedes both. Small devices can make three 44pt controls and a legible clock geometrically difficult. A 141pt square widget cannot fit three 44pt targets in one row with normal edge padding: 3 × 44 = 132pt *before gaps*. Use a measured compact 2-row layout at that width; if full timer readability and 44pt targets still cannot coexist, stop and present the smallest-device tradeoff for owner approval. Do not silently shrink tap targets. Standard **SF Symbols media glyphs** (play.fill, pause.fill, forward.fill, xmark) remain an intentional native platform-control exception to the Lucide UI category icon set, for maximum recognition.

## 5. Options and the chosen concept

### Options considered

| Option | Structure | Decision |
| --- | --- | --- |
| **A. One consistent 3-action media strip, all sizes** | Clock on top/left, Pause-or-Play / Forward / Cancel on each live timer. Native Toggle for optimistic transport state if safe. Life card Up/Down intents + dots; app-only native vertical gesture | **Choose.** Meets all supported-widget interactions without another data layer |
| B. Only one button on small, more on larger | Keep current rules; expose overflow/open-app on small | Reject: does not meet explicit requirement |
| C. Embed draggable/swipeable carousel directly in widget | Attempt tab/scroll/DragGesture or UIKit wrapper inside WidgetKit | Reject: WidgetKit does not provide ordinary interactive scrolling or UIKit gesture bridges |

**Chosen:** A; replace the controls by *semantic state*, not just substitute icon images. Maintain Stop as an optional fourth action where space permits (large; consider medium). The three required controls remain visible on small even if Forward is disabled at the final phase.

### Breadboard of the chosen concept

**Timer widget, active session, small** (example 158×158pt): a short state label and largest fitting countdown; one horizontal row of **three individually tappable icon controls**, 44×44pt each: **Pause/Play | Forward | Cancel**. Use a specifically reviewed 11pt inner margin where feasible. If current device widget is narrower, try a 2×2 control arrangement with a minimal clock and retain all three controls. No logo/art on the tiny Timer widget if it compromises the clock.

**Timer medium:** compact clock, title/status and 3 controls in one horizontal group. Stop may be fourth if layout permits. Never stack two 44pt buttons and silently discard Cancel.

**Timer large:** quiet Spread mark, title/round/timer, primary three-icon media row, secondary **Stop** and today's contextual summary. Emphasize actual time remaining over decoration. Maintain local text states and an explicit link into Focus.

**Today medium:** retain the existing counts and compact timer panel; share the same media-control component where sufficient width exists. If the requested three-icon row cannot fit alongside the counts at 44pt each, link the panel to the Timer widget/app instead of pretending it is a full controller. **Exception requiring owner decision** if the owner intended the 3-control requirement to apply to Today medium as well as the dedicated Timer widget.

**In-app Focus sheet:** replace the five word-only action rows in active/waiting states with one aligned media-control row, SF Symbols and 44+pt targets. First icon **Pause** while running / **Play** while paused. **Forward** skips the current stretch and begins its next stage **only by explicit tap**. **Cancel** clearly ends the entire session; **Stop** remains a separate secondary action with its existing, different meaning. Keep spoken names, visible state text, accessibility identifiers and the existing timer setup labels.

**Life cards medium and large:** small authentic Spread mark at header; real installed category artwork in a low-overhead background layer, using the approved crop and scrim. Genuine serif editable Life name, weekly budget and weekday values remain on top, never baked into images. Show **Up/Down 44pt intent buttons** with explicit VoiceOver labels; a non-tappable page-index dot rail and **“2 of 8”** counter. If more than 7 cards, show a small moving dot window plus exact counter; never imply 7 is the total. Medium needs both current-position feedback and art, but may condense the seven-day strip instead of hiding text. Unknown/custom categories use the existing quiet gradient fallback.

**In-app Life navigation:** a deliberate vertical gesture on the *focused* Life card changes the selected card, with a right-side page-position indicator. Preserve the existing down-to-close and list-scroll contract. Make Next/Previous accessible via VoiceOver/keyboard or visible tap affordances. Use native SwiftUI vertical paging only if it can be integrated without breaking the existing Wallet stack; do not create a second planner store or force a new unrelated screen.

**Timing and state contract:** Play and Pause are one conceptual toggle. On widget tap, provide the earliest OS-supported visual feedback; test the optimistic custom Toggle's representation of current state against the App Group session. Use idempotent **desired-state commands** plus current session/profile ID checks to prevent double-tap races. For Forward, Cancel and Stop, show pending/invalidated presentation until the intent records the authoritative result; don't pretend cancellation happened merely because the icon changed. Optimize work only after tracing intent start, store write, ActivityKit update, published mirror, widget timeline, and displayed frame. Do not mask latency with fake success or force per-second WidgetKit refreshes.

### States

| State | Media strip | Feedback |
| --- | --- | --- |
| Running | Pause / Forward / Cancel | Pause icon visible; live countdown. Disable Forward when there is genuinely no next stage |
| Paused | Play / Forward / Cancel | Play icon visible, remaining time frozen |
| Waiting after a stage | Play/Continue / Forward disabled / Cancel | User explicitly starts next stage; no automatic break; Next text announced via VoiceOver |
| Last round with no next stage | Pause/Play / Forward disabled / Cancel | No invented future stage; Stop remains distinct if offered |
| Idle, last plan available | Play enabled / Forward disabled / Cancel disabled | Correct start-from-last-plan action, not an inert icon |
| Widget disabled or privacy switch off | Explanatory off state, no false active session | Open-app/enable instructions; no leaked Life name |
| Intent pending | Optimistic Toggle **only when validated**, other controls show genuine pending | No repeated destructive action or lost update |
| Failed/stale/profile-switched action | Restore authoritative icon/time/selected card, readable failure or neutral refresh | No writes to another profile |
| Zero, one, many Life cards | Off hint / one card and no dots / accurate dots + index | Works for custom categories, long names, over-budget, 20+ cards |
| Artwork absent | Existing brand color/gradient | No missing-image block or placeholder words |

## 6. Platform behavior

- Check widget rectangles from [Apple's widgets HIG](https://developer.apple.com/design/human-interface-guidelines/widgets), not screen-width assumptions. At minimum: small **141/148/155/158/170pt** square; medium **292/321/338/364pt** wide; large variants. Also check 390, 820, 1024 and 1366-point host layouts as applicable; no landscape/fold-specific unsupported promise.
- Use existing Spread native colors, editorial type and vector brand mark. Respect tinted/accented widgets, light/dark, Increase Contrast, Reduce Transparency and selected wallpapers.
- Maintain at least 44pt targets on normal supported sizes; retain VoiceOver action names, rotor order, state/value, and controls for motor-accessible tap navigation. Avoid communicating “running” by glyph/color alone.
- Inside the app: system-native vertical page movement with bounded settle and Reduce Motion fallback. In Home Screen widgets: only genuine Button/Toggle intents; arrows/dots are **not** labelled “Swipe up” or used to suggest that a swipe works.
- No haptics from a WidgetKit visual projection. Real in-app haptics only for accepted, meaningful actions using existing feedback policies.

## 7. Technical approach

**Implementation ownership and sequence**

1. **Senior iOS engineer: instrument first.** Record tap/video timestamp and signposts at intent begin, pre/post App Group save, ActivityKit scheduling, widget publisher and completed provider render; compare app foreground, background, cold launch, paused, locked/after unlock. Inspect [SpreadFocusIntents.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusIntents.swift), [SpreadFocusSession.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusSession.swift), [SpreadFocusWidgetPublisher.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadFocusWidgetPublisher.swift). **Diagnosis remains unverified until timing data exists.**
2. **iOS engineer: unify controls and state.** Modify [SpreadTimerWidget.swift](../../../ios/App/SpreadWidget/SpreadTimerWidget.swift), [SpreadWidgetShared.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadWidgetShared.swift) and [SpreadFocusTimerSheet.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimerSheet.swift); share media symbol semantics with [SpreadTodayWidget.swift](../../../ios/App/SpreadWidget/SpreadTodayWidget.swift) for island/Today. Evaluate a single optimistic Play/Pause Toggle backed by an idempotent session-scoped App Intent; if it does not reliably work for LiveActivityIntent/AppIntent process boundaries, use the existing explicit intents plus an honest invalidated/pending state and document measured tradeoff. Keep [SpreadFocusTimer.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Focus/SpreadFocusTimer.swift) as the app's only timer object and the App Group session as the shared authority.
3. **UI designer + native engineer: rebuild Life-card widget surface.** Modify [SpreadLifeCardsWidget.swift](../../../ios/App/SpreadWidget/SpreadLifeCardsWidget.swift) with up/down intents, index/dots, actual mark and images; selectively bundle *optimized* derivatives of existing [Resources/Editorial](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Editorial/) and [brand mark](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Icons.xcassets/) in the **widget extension target** (validate target membership, caching and memory). Shared [SpreadLifeCardsWidgetBuilder.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadLifeCardsWidgetBuilder.swift) and [SpreadLifeCardsPublisher.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Widget/SpreadLifeCardsPublisher.swift) keep real title/hours and existing off-by-default privacy flag. Preserve link-to-specific-card and local week/profiles. Do not pass flattened artwork through UserDefaults.
4. **UX engineer: app gesture bridge.** Reuse [LifeWalletStack.swift](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Life/LifeWalletStack.swift) selected-card state, add only the minimal next/previous gesture/indicator or a documented equivalent that coexists with down-to-close. Preserve original Life gestures, undo, active profile and focus.
5. **QA owner: focused automated and actual device validation.** Expand [SpreadFocusControlRulesTests.swift](../../../ios/SpreadNativeV2/Tests/SpreadNativeV2Tests/SpreadFocusControlRulesTests.swift), [SpreadWidgetSharedTests.swift](../../../ios/SpreadNativeV2/Tests/SpreadNativeV2Tests/SpreadWidgetSharedTests.swift) and [native-today-widget.test.mjs](../../../scripts/native-today-widget.test.mjs). Add screenshot and visual evidence on physical TestFlight iPhone for timer sizes, art, both appearances, index, accessibility and repeated actions. Do not conflate static tests with widget performance.

**Rollout:** design-plan PR only now. After sign-off, use two focused implementation PRs, no new third-party runtime packages or API keys; preserve the working widgets on main until the entire cross-surface behavior passes.

## 8. Risks, rabbit holes and open questions

| Risk | Impact | Safe default / decision owner |
| --- | --- | --- |
| OS-owned WidgetKit/AppIntent delay | No guaranteed sub-second widget redraw | First measure tap-to-commit and tap-to-visible separately; use optimistic Toggle only if accurate. Engineering decides after device logs |
| 3 × 44pt controls in 141pt small widget | Cannot fit in a normal-margin single row | Adaptive compact 2-row layout and legible clock; **owner approves any unresolved accessibility/geometry exception** |
| Play/Pause intent races | Pause may revert, skip or resume wrong session | Idempotent desired-state commands guarded by session/profile and verified persisted state |
| Forward has no next stage | An icon could imply action without effect | Keep visible disabled, announce “No next round”; never invent an automatic finish |
| Stop vs Cancel | Data/session side effects differ | Preserve separate semantics; Stop is optional additional control, Cancel never behaves like Stop |
| Swipe-up inside Home Screen widget | WidgetKit does not support app-style gesture navigation | Up/Down intent buttons + dots; real vertical navigation only inside foreground app |
| Widget art increases bundle/memory | Blank or slow widgets; bloated IPA | Reuse licensed six local assets, optimized copies only for extension and fallback for remaining categories; no generation required |
| Large/dense text and >12 cards | Truncated labels/dots | Text-safe art zone, adaptive layout, rolling dot window and accurate counter |
| Privacy | Home Screen may expose responsibilities | Preserve the off-by-default Life-card switch and existing name disclosure; clear snapshot on disable/profile switch |

## 9. Verification and full-implementation plan

### Acceptance criteria

1. **Given** an active Timer widget of *each* supported family, **when** the user looks at it, **then** Pause-or-Play, Forward, Cancel are visible, spaced, independently accessible. Forward is explicitly disabled if no next stage exists. Test small 141–170pt family variants for legibility and 44pt targets; mark any unresolved conflict as blocked.
2. **Given** a running timer, **when** Pause is activated, **then** the authoritative time freezes and Play appears; **when** Play is activated again, **then** the clock resumes from the frozen value. The app, expanded island, Today panel and Timer widget converge on the same session.
3. **Given** paused/running/waiting/last round, **when** Forward, Stop and Cancel are tapped, **then** each preserves its distinct current semantics; Cancel removes the entire session and no break begins without a deliberate tap.
4. **Given** 10 repeated rapid Play/Pause and Forward interactions across surfaces, **then** no double-start, wrong-profile update, negative elapsed seconds or stale visible fake success is observed. Instrument tap→intent, intent→state, state→visible durations; record median/p95 and OS/device conditions rather than promise impossible platform timings.
5. **Given** the in-app timer is running, **when** the Focus sheet opens, **then** its main actions are the agreed recognizable media glyph buttons with 44pt targets, high-contrast glyphs and full spoken names, not separate text rows.
6. **Given** the Life-card widget has enabled privacy and a category with approved art, **when** it renders, **then** the actual Spread mark and editorial illustration appear with correct live name/hours/days; **given** a missing-art or custom category, **then** an intentional readable gradient appears.
7. **Given** multiple cards, **when** the Up/Down widget buttons are tapped, **then** they step exactly one card at a time and update the position dots and exact “N of M”; **when** the card surface is tapped, **then** the correct card opens inside Spread. A swipe inside the widget must **not** be advertised as working.
8. **Given** the selected Life card inside the app, **when** the person performs the approved vertical page gesture, **then** the next valid card becomes selected and the indicator settles; the existing downward close, normal scroll, tap/VoiceOver alternative and data persist correctly.
9. **Given** Life-card widgets are disabled or the active profile changes, **then** private names/art/snapshots do not persist as falsely current content outside the app.
10. **Given** light/dark/tinted Home Screen, Dynamic Type, VoiceOver, Reduce Motion, little memory and app-killed states, **then** no clipped controls, incorrect page count, missing fallback art, false success or blank widget is accepted.

### Checks

- Existing GitHub: TypeScript typecheck, ESLint, full Spread tests, scripts, native Swift type-check and App Store preflight on each implementation PR. Verify native **widget extension compile**, not only Swift source syntax.
- Use Codemagic to produce a signed *test candidate only when explicitly authorized*; exercise Home Screen widgets, Lock Screen/Live Activity and real Focus sheet. Capture repeatable physical-iPhone video plus signpost logs and screenshots for small, medium and large widgets, light/dark, 141–170pt small variants where devices exist. The **actual screen/display quality and latency are unverified** today.
- Test app/widget/process closed, phone locked, app reopened, profile switch, disabled privacy switch, rapid taps, weak power/background conditions, custom and missing-art roles, 1 / 2 / 10 / 20 Life cards, large text, accented Home Screen, Reduce Motion and VoiceOver.

### Full-feature implementation and refinement plan

Do the full timer scope in the existing application in PR A and the full editorial navigation scope in PR B; neither is a throwaway demo. For each, document measured baseline, implement, run tests, capture matched before/after device evidence, correct regressions, and repeat. Ask testers: **“Do you know how to do this?” “Is it easy?” “How could it be better?”** Record evidence against the reviewed SHA. Mark blocked hardware/OS cases, don't label them passing.

## 10. Rollout, rollback and release

- This document: design-only draft PR. Does not authorize a merge or production change.
- **PR A (timer):** focused SwiftUI, shared control/intents and tests. Rollback: revert PR A. No planner data migration; preserve #206 widget sizing/recurring-plan month correctness.
- **PR B (Life cards):** existing art resources, mark, navigation/paging indicators, widget asset membership, selected-state and test evidence. Rollback: revert PR B; retain existing App Group snapshot compatibility and privacy switches.
- Release gate: owner reviews screenshots and recorded timing, approves any small-widget geometry exception, and separately authorizes merge, TestFlight and App Store deployment. CI green is not native interaction proof.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-13 | Proposed: make three media controls visible across dedicated Timer widget sizes; optimistic Play/Pause only after correctness/device evaluation; preserve Stop vs Cancel and current local-first store | ChatGPT recommendation for owner review | This spec; no prior spec overwritten |
| 2026-11-13 | Proposed: use authentic Spread mark and six installed editorial category images in widget, with fallback; show Up/Down intent navigation and dots because WidgetKit cannot support real vertical swipe | ChatGPT recommendation for owner review | This spec; no existing Wallet gestures changed |
| 2026-11-13 | Blocked until measured: 141pt small-widget geometry with three 44pt targets and meaningful countdown | iOS engineer to measure, owner to approve any exception | This spec |

## 12. Implementation record (owner direction 2026-11-13)

The owner instructed direct implementation on **PR #208**, followed by merge without waiting for pending tests/simulators. This supersedes the two-implementation-PR rollout proposed in section 10. No Apple or Vercel deployment was requested.

**Implemented on the same PR:**

- Three 44pt actions in all **running and paused** dedicated Timer widget sizes. Forward stays visible but is disabled when no next stage exists. The small family disables default margins and uses a compact 2pt-spaced row. The waiting phase continues to show Forward and Cancel, rather than a fake Pause.
- Apple `SetValueIntent + LiveActivityIntent` Play/Pause Toggle, session-ID guarded and idempotent, with a native SwiftUI ToggleStyle that draws Play/Pause from the optimistic state. This addresses *visual* feedback, not an unproven claim of zero timer execution latency. Publish the widget mirror before ActivityKit refresh. Existing island controls keep their intent actions.
- Foreground Focus sheet uses native 44pt Play/Pause, Forward, Stop and Cancel icons with accessible spoken names. Stop remains distinct from Cancel; no planner tasks or budgets are changed.
- The widget target bundles the original Spread SVG brand mark in its own asset catalog and all six installed category WebP images via a resource folder, without transferring images through the App Group. Its Life cards use approved image plus readability mask, category gradient fallback, up/down AppIntent buttons, rolling position dots and exact index/counter.
- In the native foreground Life Wallet, swipe up advances to the next focused responsibility while the existing downward pull still closes it; index dots and VoiceOver adjustable navigation follow the selected role.
- Updated shared control-rule unit assertions and widget source/resource regression checks. No timer session schema migration, second data store or external service.

**Verification still owed at time of merge:** a real Codemagic native archive, TestFlight widget screenshots on small/medium/large families, measured Play/Pause tap-to-commit and tap-to-visible latency (p50/p95), accessibility, visual contrast, tinted Home Screen and repeated rapid control interactions. An automated test passing or a source commit cannot stand in for these device checks. If any build check fails after merge, revert the PR merge or prepare a corrective PR before distribution.

**Key Apple reference used for the working transport control:** [WWDC24: Extend your app's controls](https://developer.apple.com/videos/play/wwdc2024/10157/?time=281) demonstrates a `SetValueIntent, LiveActivityIntent` timer toggle; [WidgetKit interactivity](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities) specifies optimistic Toggle rendering and post-intent widget refresh.

## 13. Timer control continuity correction (PR #229, November 13, 2026)

**Observed in the current source:** Home Screen Play/Pause and the Lock Screen/Dynamic Island controls use `LiveActivityIntent`; [Apple documents](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities) that these intents execute in the **containing app process**, sometimes after a background launch. Widget redraw is asynchronous, so zero-latency rendering is not promised. `SpreadFocusControls.apply` committed the shared timer session, then returned while independent `Task` operations were still updating or replacing the Live Activity. Rapid transitions could race with one another. The other transport buttons also lacked the visible session's ID, so a delayed action could affect a newer stretch. App-private opt-ins were not consistently mirrored to the shared store for extension paths; that is a resilience gap, not proof of the user's observed latency.

**Targeted engineering:** Reuse the existing App Group to mirror the opt-ins chosen in the native app; guard each transport intent against an outdated session ID; serialize ActivityKit operations and await completion before the intent returns; notify the already-running app of a committed change immediately, with its existing one-second reload retained as fallback. Preserve the optimistic Play/Pause toggle, absolute timer deadline, explicit starts for every next round, notifications opt-in and local-only storage. No planner schema or visual redesign.

**Acceptance gate:** Pass GitHub CI, App Store source preflight, native type-check and a signed Codemagic archive. On a physical iPhone with **Home Screen widget and Live Activity**, repeatedly tap Pause→Resume, Forward, Stop and Cancel with Spread foreground, background and terminated. Check the same remaining time in the app and on both surfaces; stale taps after starting a new round must do nothing. Measure tap-to-commit and tap-to-visible latency (p50/p95). Confirm widgets disabled remain private/off, enabled widgets stay visible, and Live Activities don't disappear after a valid tap. Native checks and source inspection alone do **not** establish runtime responsiveness.

**Rollback:** Revert PR #229. Release/upload remains manual; no changed planner tasks, weekly hours or account requirements.

## 14. Apple-standard timer lifecycle (2026-11-14)

**Owner direction:** Stop building more state managers. Use the timer implementation Apple documents and the existing Spread timer engine.

**Reference:** [Apple, Adding interactivity to widgets and Live Activities](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities); [WWDC24 productivity timer example](https://developer.apple.com/videos/play/wwdc2024/10157/); [dynamic countdown labels](https://developer.apple.com/documentation/widgetkit/displaying-dynamic-dates).

**Straightforward steps (no new service):**
1. **Save one timer record** in the existing App Group: session ID, phase (running/paused/finished), remaining seconds and an absolute deadline. Spread's `SpreadFocusSession`, `SpreadFocusStore` and `SpreadFocusMachine` already do this. Preserve those tested rules.
2. **Expose a widget control.** Apple uses `Toggle(isOn:intent:)` and `SetValueIntent` for optimistic Play/Pause feedback. The intent updates the shared record synchronously and **returns**; WidgetKit reloads the widget automatically when `perform()` completes. Keep other controls as `Button(intent:)`.
   The widget reads the same saved session and active profile as the actions; no separate serialized widget session is maintained. Privacy-aware labels derive from the shared opt-in. The prior duplicate `spread.widget.focus.v1` snapshot is cleared on refresh.
3. **Render the clock with dates.** Use `Text(timerInterval:countsDown:)` and `ProgressView(timerInterval:countsDown:)`; do not poll or request a widget timeline every second. For a paused session, show the persisted frozen seconds.
4. **Project to the Live Activity independently.** ActivityKit updates are not prerequisites for saving timer state or completing a Home Screen widget interaction. Preserve session-matching guards and system-controlled activity presentation. A user action never automatically starts the next round.
5. **Verify the real experience.** GitHub source checks catch API/compiler regressions, but only a signed iPhone build can demonstrate interaction reliability and WidgetKit's actual redraw timing. Check active/background/terminated app, rapid taps, stale session actions and opted-in Lock Screen/Dynamic Island. Record tap-to-store and tap-to-widget response separately.

**Correction to the PR #229 implementation:** Awaiting `SpreadFocusLiveActivityController.awaitSettled()` inside every intent makes WidgetKit wait for ActivityKit before it can redraw. PR #230 removes that wait while keeping the already-correct single authoritative timer and display mirroring. No user accounts, networking, new state machine, platform target changes or planner mutations. The simple Apple flow is the design contract.
