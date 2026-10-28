# Spread on iPad: build guide

> Part of the Spread design brain. Start at [../README.md](../README.md) for the map, the rules and what to read for which task.


Researched 2026-10-21 from developer.apple.com, the Spread repo docs, and GitHub. This file covers iPad only. The shared baseline (toolchain, submission rules, privacy manifest, Capacitor, repo rules, haptics, drag-and-drop mechanics, testing commands) is in `SPREAD_IPHONE_BUILD_GUIDE.md` section 1 and still applies. iPhone Duo is in `SPREAD_IPHONE_DUO_BUILD_GUIDE.md`.

Evidence tags: **[Apple]** read on a developer.apple.com page. **[Repo]** from the Spread docs. **[3P]** third party, unverified. **[Rec]** my recommendation.

---

## 1. Current state in Spread [Repo]

- iPad device family is supported, all orientations, iOS 17 minimum (merged in #23).
- The planner screen is shared with iPhone; there is no separate iPad app target.
- **The physical iPad layout has never been verified.** The golden pixel-diff harness was never built.
- Chromium checks at 820, 1024 and 1366 wide, light and dark, passed with no overflow in the last pass. Touch and mouse drag on iPad still needs a device pass.
- Headless mouse drag could not run, and the existing allocation drag fails the same way. Real-device drag is the proof.

---

## 2. What iPad is, per Apple

**[Apple: Designing for iPadOS]**

- Large, high-resolution display. Held, set on a surface, or on a stand. Viewing distance typically within about three feet.
- Inputs: Multi-Touch, virtual keyboard, attached keyboard, pointing device, Apple Pencil, voice. People often combine them.
- People keep several apps open and use inter-app features such as drag and drop.
- Best practices to apply:
  - Use the large display to elevate content. Minimize modal interfaces and full-screen transitions.
  - Use viewing distance and input mode to set size and density.
  - Support touch, keyboard, trackpad, and Apple Pencil where it makes sense.
  - Adapt to orientation, multitasking modes, Dark Mode, and Dynamic Type.

An iPad layout should be purpose-built. Stretching the iPhone layout across a 13-inch display wastes space [3P: a summary of the HIG on a skills site, not Apple's own wording].

---

## 3. Layout and multitasking instructions

**Size classes**: apps can appear in every combination of compact and regular, in both portrait and landscape, depending on window configuration and multitasking state [Apple: Layout HIG].

- [ ] Decide layout from available width and height, not from device type or orientation [Apple].
- [ ] Keep functionality the same as the window grows or shrinks. Change only how much is visible. Apple's example: swap a tab bar for a sidebar at larger sizes [Apple: Layout HIG].
- [ ] **Resizing must be non-destructive.** Resizing an app should not permanently alter its layout [Apple: WWDC25 208].
- [ ] Support multitasking. When it is enabled the system shows a window handle in the bottom-right corner, and windows can be resized freely [Apple: WWDC25 208].
- [ ] Do not place critical controls where window controls appear [Apple: Duo HIG compares reserved regions to iPadOS window controls].
- [ ] Test the extremes first: smallest and largest windows [Apple: Layout HIG, Device Hub advice].

**Web implementation** [Rec]:

- [ ] Use container and media queries on width and aspect ratio, not user-agent or `maxTouchPoints` checks.
- [ ] Avoid locking orientation with a plugin. Orientation is not a reliable guide to window shape [Apple].
- [ ] Per-side safe-area insets and `viewport-fit=cover` as on iPhone.
- [ ] Revisit the Week view at 820, 1024, and 1366. Wide windows should show more of the week, not stretch cards.
- [ ] Spread view stays a list; do not turn it into a grid just because there is room [Repo: plan keeps Spread view a list].

**Scenes**: apps that support multiple windows on iPad get them on iPhone Duo too [Apple]. Spread is single window today. Multiple windows are optional and out of scope for the current plan [Repo].

---

## 4. Interaction instructions

### Drag and drop (plan item 4.9) [Repo]

- Mouse and pen: `FastPointerSensor`. Touch: `HoldPointerSensor` (hold to drag). Handles are `touch-none`, 44pt.
- Keyboard: add `KeyboardSensor` and dnd-kit `accessibility.announcements`.
- Move to... sheet is the accessible path.
- Drop highlight reuses the existing accent outline. Valid targets highlight, invalid ones do not.

**Apple adds** [Apple: Drag and drop HIG, iOS and iPadOS section]:

- [ ] Support drag and drop wherever people expect it.
- [ ] Offer alternatives (Move to sheet, menu commands).
- [ ] Prefer undo.
- [ ] Show whether a destination accepts the drop. Give feedback on invalid drops (return to source or fade out). Add this snap-back [Rec].
- [ ] Within one container a drop is a move, not a copy. Task placement is a move [Apple principle applied].
- [ ] iPadOS lets people add items to a drag in progress. Multi-item drag is not planned; do not promise it.
- [ ] Spring loading (dragging over a control to activate it) is optional. Not planned.

### Pointer and keyboard [Apple: Designing for iPadOS; Rec]

- [ ] Hover feedback on interactive rows and handles when a pointer is attached.
- [ ] Keyboard path through the week and the Move to sheet.
- [ ] Shortcuts are optional. If added, put them in the iPad menu bar [Apple: the-menu-bar page says it applies to Mac and iPad; not read in full].
- Apple Pencil: not needed for Spread today.

### Haptics

Haptics are an iPhone feature in practice. iPads generally do not have a Taptic Engine. Do not depend on haptics for feedback on iPad; make sure visual feedback stands alone. This is my inference, not something I found stated in the pages I read [Rec].

---

## 5. Appearance and accessibility

Same as iPhone: Dark Mode both system and manual, Dynamic Type decision, VoiceOver through the Move to sheet and announcements, reduced motion, 44pt targets. See `SPREAD_IPHONE_BUILD_GUIDE.md` section 6. Dark palette rules (surface elevation, dimmed text, softened accent, contrast targets) are in section 6a there. On a 13-inch iPad the elevation steps matter more, because sidebars, cards and popovers can all be on screen at once: each must read as a distinct raised surface.

---

## 6. App Store assets for iPad

**Screenshot sizes** [Apple: Screenshot specifications]:

| Display | Size (portrait; landscape swapped) | Required |
| --- | --- | --- |
| 13-inch (iPad Pro M5 and M4, iPad Air M4 and M3 and M2) | 2064 x 2752 or 2048 x 2732 | **At least one, required if the app runs on iPad** |
| 11-inch | 1488 x 2266, 1668 x 2420, 1668 x 2388, or 1640 x 2360 | Optional; scaled from 13-inch if absent |

PNG or JPEG, no alpha, 1 to 10 per size.

**Marketing**: Apple Design Resources has bezels for iPad (A16), iPad Air (M4), iPad mini (A17 Pro), and iPad Pro (M5). Review Apple's marketing guidelines before using them [Apple].

---

## 7. Test matrix and gates

Commands are the same as iPhone (`SPREAD_IPHONE_BUILD_GUIDE.md` section 9).

Browser checks: 820, 1024, 1366 wide, light and dark, reduced motion, mouse and touch hold, no horizontal overflow.

**Owed on a physical iPad** [Repo]:

- [ ] Touch-hold drag and mouse or trackpad drag.
- [ ] Rotation in every orientation.
- [ ] Split View and Slide Over widths, Stage Manager resize, window handle behavior.
- [ ] External keyboard and pointer.
- [ ] VoiceOver pass.
- [ ] Airplane Mode offline pass.

You can also test the iOS resizable simulator in Device Hub and iPhone Mirroring on macOS 27 at extreme sizes [Apple: Prepare page].

---

## 8. Why iPad matters for Duo

Apple says the iPhone Duo inner display should feel like a natural extension of an app's iPad layout, and that it has regular width and regular height [Apple: Prepare page]. So a good iPad layout is the base for Duo's inner display. See `SPREAD_IPHONE_DUO_BUILD_GUIDE.md`.

---

## 9. Open items

- Physical iPad pass (layout, drag, rotation, multitasking).
- Whether to support multiple windows.
- Menu bar and keyboard shortcuts: not decided.
- Golden pixel-diff harness for iPad: never built.

---

## 10. Apple HIG pages to read for iPad

Base URL: `https://developer.apple.com/design/human-interface-guidelines/<slug>`.

- Platform: `designing-for-ipados`
- Patterns: `multitasking`, `drag-and-drop`, `going-full-screen`, `undo-and-redo`
- Components: `windows`, `split-views`, `sidebars`, `tab-bars`, `sheets`, `popovers`, `the-menu-bar`, `toolbars`
- Inputs: `keyboards`, `pointing-devices`, `apple-pencil-and-scribble`, `gestures`
- Foundations: `layout`, `accessibility`, `dark-mode`
- Read in full so far: `designing-for-ipados`, `layout`, `drag-and-drop`. The others are not read yet.

Videos: WWDC25 sessions 208 (Elevate the design of your iPad app), 219, 356.

---

## Sources

- https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados.md
- https://developer.apple.com/design/human-interface-guidelines/layout.md
- https://developer.apple.com/design/human-interface-guidelines/drag-and-drop.md
- https://developer.apple.com/design/human-interface-guidelines/multitasking.md
- https://developer.apple.com/videos/play/wwdc2025/208
- https://developer.apple.com/iphone-duo/prepare/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/design/resources/
