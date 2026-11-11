> Part of the [Spread design brain](../README.md).

> **November 11 Life weekly budget visual amendment:** The collapsed Life view replaces its icon-heavy hours summary with an iPhone Storage-inspired, **solid-surface** capacity bar. Header shows budgeted hours / total weekly capacity and separately shows available hours; responsibility-colored segments and neutral hatched remainder are proportional to the full weekly budget, with hours printed *inside* segments only when legible. No color legend, Liquid Glass, second editing control, or new planner state. The full summary is one accessible button to the existing Hours allocator. Preserve Life Wallet cards, artwork, Crown, Classic, Week, and native typography. With more responsibilities, narrow segments omit unreadable labels without changing their real proportions. No-capacity and over-budget states must remain truthful.

> **November 11 Life editing amendment ([Issue #169](https://github.com/WGLewis0721/spread-app/issues/169)):** Only a focused Life card shows **Details** (the existing name/hours/icon/color editor and undoable Delete) and **Tasks** (the existing responsibility notebook). Remove Life's global side-tray Edit, edit glow, and swipe-only Manage/Delete actions. Deletion remains undoable without additional confirmation. This **supersedes every November 4–6 Life Edit instruction below**; Wallet motion, Week, Classic, More and planner storage remain unchanged by this editing decision.

> **November 6 updated Life interaction authority:** The Life Edit control moves into the side tray/rail. Left swipe in Edit reveals Manage; right swipe carries the complete card off the device and deletes it without a prompt, using Undo for recovery. Focused Wallet siblings slide fully through the bottom of the viewport; the existing focused-card chevron restores all cards. `All Life areas` is removed. Motion travel is calibrated at 1.75× the normal baseline; never delay direct finger tracking. This amendment overrides older right-to-reveal-Delete and confirmation language below. Classic retains its own approved behavior.

# Spread — Native iOS Brand Board (owner-approved 2026-11-03)

> Summary: Single-Wallet/Life visual authority. The November 11 focused Details/Tasks amendment supersedes the older Life Edit/reveal/dismissal instructions below. Existing Wallet focus motion, Classic and planner data are preserved.

> Part of the [Spread design brain](../README.md).

> November 6 recording-review amendment: Life and Classic share one visual language, original artwork, semantic tokens and motion vocabulary while retaining their different arrangements. The [shared polish contract](../specs/2026-11-06-life-classic-polish.md) and separate Classic/Life video specifications document this newer owner direction. It supersedes Life's independent gray/black treatment; it does not authorize changes to Classic's layout or planner behavior.

> November 6 scoped Life direction: the owner approved the browser Life prototype for the existing Week + Month preview choice. The [Life iOS spec](../../life-ios/SPREAD_LIFE_IOS_SPEC.md) defines its native translation. The existing Classic experience and More/Settings remain governed by their current design and behavior; do not repaint or restructure them through shared tokens. This is an implementation plan, not native-build or release evidence.

> **November 4 owner amendment — current authority for Spread responsibilities:** Show **only one Wallet-style Stack**, not five layout choices. All responsibility cards fill the available width, overlap when closed and expand independently to fit their full task lists. The expand chevron is always visible. The original Chalkboard illustrations animate on closed and expanded cards, except when Reduce Motion is active. Only the explicit side-tray Edit button enables Life editing. Normal tap/long-press never enable edit; Life's Edit-mode left swipe reveals Manage and a deliberate right swipe removes the full card offscreen with Undo and no confirmation, per the November 6 amendment. Use a soft breathing glow in each role colour as the edit cue. Hour controls must not collide with titles. Keep Week, Month, Tasks, the metal Crown, local-first store, and all other core functionality. **This explicitly supersedes every five-mode requirement elsewhere in this historical brand board and older parity/handoff documents.** Other modes may remain dormant in source for rollback but cannot be selected in the shipped SwiftUI app. Implementation: [draft PR #127](https://github.com/WGLewis0721/spread-app/pull/127), based on the Duo-fix branch #126. Native test evidence remains required before release.


> Part of the [Spread design brain](../README.md). Governs **native SwiftUI presentation** on draft PR #127; does not replace the React planner tokens or the public landing brand.
>
> Summary: Owner-approved premium dark, luminous blue iPhone identity, metallic horizontal Crown, consistent Chalkboard illustrated cards, measured visual vocabulary, exact screen contracts and verification. Preserves Responsibilities → Hours → Week → Tasks, the **sole Wallet-style responsibility Stack**, existing data, accessibility and navigation. Scoped exception to the legacy React planner's quieter visual rules.

### November 4 interaction refinement: edit swipes, haptics and timed header

- **Edit mode:** Only tap the explicit Edit button. Card tap/long-press do not enter editing, and actions remain absent until an Edit-mode left/right swipe. All cards breathe with a subtle glow in their stored responsibility color. A single tactile impact confirms entering or leaving Edit, never on each animation frame. **Swipe the whole Life card left** to uncover **Manage** on the right; **swipe it right off the device edge** to remove it with immediate Undo, no Delete tray or confirmation. Actions are never permanently attached to card text. The card moves as a rigid whole; its width, icon/name/hour/chevron positions and text wrapping do not reflow. In Life, deletion has no confirmation because Undo restores the full responsibility. The obsolete full-width bottom Manage card is removed. Swipe actions have accessible alternatives; vertical scrolling remains functional.
- **Feedback:** Distinct one-shot haptics on entering/leaving Edit, snapping to a Manage/Delete reveal, expanding a card, and successful updates. Do not vibrate continuously, duplicate success feedback, or weaken Reduce Motion.
- **Top navigation:** On first display of the loaded planner, show the folded-card Spread mark with its wordmark plus Spread/Week icons and labels for about **2.5 seconds**. Then the three text labels slide **left into their associated icons**, scale/fade away, and leave the icons as fully operational >=44pt controls with permanent accessibility labels. The metallic Crown and current week stay visible. The animation runs once per app opening, not on every tab switch. Keep labels visible at accessibility Dynamic Type sizes; Reduce Motion removes the sliding animation.
- **Verification:** Compare screenshots and XCUITest geometry before/after Edit. Confirm the header's compact state, icon tap actions, accessible descriptions, and no unintended Crown movement or planner writes.

## 1. Reference authority and interpretation

1. **Owner's desired-state images (November 3 conversation):** five dark premium iPhone renderings (Spread, Week, Month, Task, Move to) plus the consistent visual-language storyboard. These define the *approved target appearance*, not a proven installed build, pixel-exact specification, or permission to create new functionality.
2. **Owner's actual older app screenshots:** light Spread/Fan/Week/Month/More/New Spread and their navigation/affordances define working product structure and behavior. Correct visible defects (clipped dates, colliding arrow controls and floating dock) rather than reproducing them.
3. **Code provenance:** pre-migration `main` at `35b66522f30836d1eb74ca9758c6d3f24c0de2e3`; Studio layouts/artwork at `5d2100548ce3a296134caaea497da5b9e9781ce5`; current native PR #119; the authoritative TypeScript planner store.
4. [Planner design system](SPREAD_DESIGN_SYSTEM.md), [Apple principles](../platforms/APPLE_DESIGN_PRINCIPLES.md), [original icon catalog](../brand/ICON_HANDOFF.md), [UX laws](../FOUNDATIONAL_UX_PRINCIPLES.md), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/). Their nonvisual safety/behavior rules still apply.
5. **External references are techniques only:** habit-app layered cards, compact calendar layouts, Uiverse tactile components, fffuel lighting/SVG effects, AppShot information hierarchy, Iconbuddy symbol consistency, WebGradients restraint, Velvetyne expressive type research. Do not import a new navigation system, icon library, or UI framework.

**Important evidence limit:** the user shared target images in the chat; the original image binaries are not checked into the repository. This document and [the vector specimen](SPREAD_NATIVE_VISUAL_SPECIMEN.svg) are portable guidance, not substitutes for those screenshots or proof that conceptual screens already work. Ask the implementing agent to view the owner's images from the chat; if unavailable, explicitly mark reference comparison unverified. Never call aspirational renders "production screenshots."

## 2. Identity to preserve

- Folded-card blue app icon with **Spread** in system sans, stable across every screen; no invented serif rebrand.
- Machined **horizontal metallic Crown** with fine ribs, recessed dark center, month/week label and date, left/right controls, precise detents and accessible alternative controls.
- All **11 original Chalkboard drawings** and real category glyphs in soft luminous color tiles; initials are not replacements. Art must not crowd task text. The previous Dial code is retained only as dormant rollback code, not an available responsibility view.
- Responsibility colors as persisted data, hour banks, allocation controls, task previews, rich Notes/Outline/Table/Photo, local-first profiles, export and protected recovery.
- One native responsibility presentation: **Wallet Stack** with full-width overlapping closed cards, independently expanded natural-height task lists, always-visible chevrons and animated Chalkboard art. No selectable Fan, Dial, Tabs or Day.
- Familiar **Spread/Week** relationship and Month *inside Week*. No generic Home dashboard, permanent five-button nav, or invented analytics destination just because one concept board illustrates one.

## 3. Native color, type, depth, shape

The following hex and geometry values are **initial calibration targets**, inferred from owner design direction. They are not claims of exact source-image pixel measurements. Centralize them in native semantic tokens and adjust only with measured screenshot/contrast evidence. **Do not rewrite `src/styles.css` or `docs/design/tokens.json` as part of the native paint pass.**

| Semantic role | Candidate value | Behavior |
| --- | --- | --- |
| Night canvas | `#060B18` | Calm nearly black/navy app ground, not neon cobalt |
| Elevated content | `#101C32` | Quiet card/day/task surfaces |
| Inset/recess | `#0A1427` | Crown center, task rows, recessed controls |
| Ink | `#F7FAFF` | Main text, high readability |
| Secondary ink | `#B0BCD1` | Dates, supporting labels |
| Action blue | `#0A84FF` | Current selection, Today, main actions |
| Hairline | white 10–16% alpha | Subtle separation instead of chunky outlines |
| Role color | existing per-role data; typically Work `#34C759`, Home `#FF9500`, Health `#0A84FF` | Luminous role accents only; never infer roles from a hardcoded color |

**Four layers:** calm dark canvas → solid readable content surface → *bounded* role-colored edge light → functional chrome (Crown, dock, actionable buttons). The dramatic blue background **outside the phone** in the renderings is marketing scenery, not an in-app animated wallpaper. Avoid wall-to-wall glassmorphism or glow around every control.

**Suggested optical targets, subject to real comparison:** card border <=1.5 pt; glow blur radius ~8–16 pt with ~12–25% role-color opacity; the active card is brighter, nonfocused cards quieter. No constant glow animation or low-contrast glowing text. Use system materials sparingly for *interactive chrome*; content remains legible and material-light.

**Crown:** high-precision ridged metal/highlight gradient, physical recess and end caps, no moiré. It must never collide with the date string or arrow hit regions. Finger-drag and keyboard/VoiceOver control must act on the same week state.

**Typography:** SF system family, Dynamic Type supported. Initial unscaled hierarchy: page headline ~28–32pt, section ~19–22pt, responsibility ~20–24pt, body ~15–17pt, secondary ~12–14pt. Preserve readability; no dramatic serif title or experimental font on functional screens.

**Geometry:** safe-area aware 16–20pt page insets, 12–20pt section rhythm, 14–18pt card padding, approx. 20–28pt card corners, 44pt minimum real hit targets. These are adaptive targets not fixed pixels. Keep titles, illustrations, hours and task previews from colliding on 390pt iPhones and large text.

**Appearance:** premium dark is the primary target. Light/system mode remains supported and uses **the same layout and UI identity**, with accessible cream/off-white canvas, dark ink, softer role edges. No forced-dark scheme. Respect Reduce Motion, Reduce Transparency and Increase Contrast.

## 4. Screen contracts: target vs forbidden drift

| Screen | Keep/implement in genuine SwiftUI | Avoid |
| --- | --- | --- |
| Global shell | Compact blue icon + sans Spread; actionable Crown; one clear Spread/Week switch; minimal dock | Giant decorative title, redundant navigation, multiple “main” buttons |
| Spread | True computed hour summary and proportional role bar; dense illustrated role cards with category tile, role hours, task preview, quick inline actions, Add a spread | Generic “Responsibilities” splash, letter tiles, empty oversized cards |
| Wallet Stack | Single full-width responsive view; focused Life cards travel out through the device bottom, details below, Edit in sidebar, left Manage/right full-width dismissal with Undo | Replacing cards with plain rows; hidden chevron or task entry; multi-mode switcher |
| Hours | Clear hour budget, allocation controls and current hours without confusing duplication | New source of truth, changes that silently overallocate |
| Week | Compact role/hour chips; grouped dashed “To place” tray; solid distinct days; inline task operations; “Free time” suggestions distinct | Same glowing rectangle for tray/day/suggestion; hiding essential placement |
| Month | Sunday-first grid, real role dots per date, current and selected day, concise role totals; drill into day/week | Invented data or detached calendar flow |
| Task | Native sheet with role/title/hours/date, completion, subtasks and Notes/Outline/Table/Photo, Save/Cancel | Thin generic form, discarded rich content, glow behind editor text |
| Move to | Native eligible-day sheet, unscheduled option, role-hour rules, cancel and Undo | Unrestricted arbitrary drops or silent refusal |
| New Spread / More / Settings | Original category choices with glyph + Chalkboard relationship; real profiles/appearance/export/backup/recovery, native hierarchy | Dead buttons, giant plain tiles, extra account sign-up |
| Empty/progress/iPad | Illustrated empties; only existing verified insights; adaptive wider layouts | Unapproved analytics product or filler tab |

A mockup's presence does not authorize a new feature. Any conceptual Activity/Progress/Home destination absent in existing product stays a future proposal pending owner approval.

## 5. Motion and interaction principles

**Wallet Stack** is a single vertical physical stack. Closed cards overlap with title, hours and visible chevron. Any card can expand, remaining cards slide down to reveal all tasks. Original Chalkboard motion is active on visible cards except Reduce Motion. Only the side navigation Edit button enters Life edit mode (name, colour and icon changes). Left swipe reveals Manage; rightward full-card dismissal deletes with Undo. Neither action appears beneath a resting translucent card. Single gesture authority prevents duplicate commits and touches blocked by decorative layers.

Crown uses deterministic detents with tactile feedback, visible state, and non-gesture equivalents. Week↔Month changes preserve date context. Spring motion is purposeful and short; reduced motion removes decorative movement. No ornamental motion that compromises frame rate or task availability.

Navigation and controls never shift by arbitrary 4–5pt changes when switching destinations. External UI references inform **navigation discipline**, not new sidebar/tab/FAB clutter. Frequent actions should generally finish within three taps while safe/undoable.

## 6. Acceptance and release gates

Before changing visuals capture installed PR #119 surfaces, then compare the same fixtures afterward on native **390/820/1024pt**, light/dark, empty/dense, long names, Dynamic Type, Reduce Motion and Increase Contrast. Inspect screens: Crown, Spread (closed/expanded/edit Wallet cards), Hours, Week/Month, Task, Move, New Spread, More. Produce actual screenshots/video and mark device-only tests unverified until measured.

Measure: no clipped header/text, overlap or obscured tap target; controls >=44pt; text 4.5:1 normal / 3:1 large/icons; distinct selected/focus states beyond color; role hour/task data correct; real first-swipe and drag alternatives; existing Crown 100 turns + 30 reversals and Wallet 100 expand/collapse actions when harness available; no data loss or secondary writes. Run actual TypeScript, Swift package, iOS build, UI and persistence tests. A compile pass is not a UI sign-off; render concepts cannot substitute for simulator captures.

### Explicit owner-approved native design exception

On draft PR #127 **only native SwiftUI presentation** may use these navy/blue luminous materials, role-edge glows and brushed metallic controls. This narrowly supersedes the old “no new colors or decoration / quiet palette only” React planner visual rules *for native SwiftUI styling*. All original data, planner semantics, privacy, golden versions, web React styles, landing branding, cloud/schema/backup boundaries, and production release gates remain unchanged.

Do **not** merge, deploy, distribute another TestFlight build, or submit for App Store review without a separate explicit release authorization. Keep PR #127 draft, preserve rollback, and report real tests and before/after screenshot evidence. **Reproduce Spread's personality; never replace the product.**
