# Spread on iPhone Duo: build guide

Researched 2026-10-21 from developer.apple.com, the Spread repo docs, and GitHub. This file covers iPhone Duo only. The shared baseline (toolchain, submission rules, privacy manifest, Capacitor, repo rules, haptics, drag-and-drop mechanics, test commands) is in `SPREAD_IPHONE_BUILD_GUIDE.md` section 1 and still applies. The iPad layout work in `SPREAD_IPAD_BUILD_GUIDE.md` is the base for the Duo inner display.

Evidence tags: **[Apple]** read on a developer.apple.com page. **[Repo]** from the Spread docs. **[3P]** third party, unverified. **[Rec]** my recommendation.

**Correction to the unified UX plan.** The plan (section 5) told the implementer not to assume iPhone Duo, hinge, or reserved-region APIs. Apple now documents them. Duo is available October 23, 2026, runs iOS 27.1, and app submissions are open [Apple: Hello Developer October 2026; Prepare and submit post, October 5]. The plan's "do not assume" instruction is out of date. Its physical-device caveat still stands.

---

## 1. What iPhone Duo is

**[Apple: Designing for iPhone Duo HIG, new September 9, 2026]**

- A folding iPhone with two displays, each with a front camera. A center hinge lets it open, close, fold partially, and stand in many poses.
- **Outer display**: wider and shorter than other iPhones. Used when closed.
- **Inner display**: large. The inner camera is behind the display and hidden until active.
- Poses include closed, open wide, open tall, folded like a tent, folded like a book (partially open), and folded like a laptop.
- Duo is still an iPhone. Designing for iOS patterns still apply.

**Size classes** [Apple: Prepare talk]:

| Display | Portrait | Landscape |
| --- | --- | --- |
| Outer | regular vertical, compact horizontal | compact and compact |
| Inner | regular and regular | regular and regular |

An iPhone app can now have **any combination** of size classes (Duo and resizable iPhone Mirroring on macOS 27).

---

## 2. Which SDK you build with changes what you get

**[Apple: iphone-duo/prepare]** All apps run on Duo, but:

| Build SDK | Inner display, open | Outer display, closed |
| --- | --- | --- |
| iOS 26 or earlier | App sits centered at a familiar size with empty space around it | App shows to the left of the status bar and camera |
| iOS 27 | App fills most of the inner display, still avoiding the status bar on the right edge | Same as iOS 26 behavior |
| **iOS 27.1 or later** | App extends edge to edge; toolbars and tab bars lay out vertically below the status bar | Same |

Apple warns that hardcoded sizes, fixed orientations, and device assumptions can cause stretched, clipped, or misplaced content.

- [ ] Build with Xcode 27.1 to get the full-screen experience. Before shipping a 27.1 build, make sure content adapts to bars becoming vertical [Apple].
- [ ] If your deployment target is below iOS 27.1, guard any Duo-only native API with an availability check [Rec].
- [ ] Apple's guidance is to rely on adaptive layout, not device checks. Do not branch on a "Duo" model [Apple: Prepare page and forum answer].

---

## 3. The most important fact for Spread

Spread draws all of its chrome (ring-binder header, bottom navigation, sheets) in the **web layer** [Repo]. Apple's automatic Duo behaviors apply to **native** bars and sheets:

- Native toolbars, tab bars, and navigation bars move to the side. Apple says if the system does not present your bars vertically, check that you are using navigation containers' bar support instead of custom bars [Apple: developer overview].
- Native alerts, context menus, and sheets move away from the fold automatically [Apple: HIG].
- Web-drawn sheets and bars get none of this.

What a WKWebView gets [3P, verify in the simulator]:

- Resizes with the window.
- `env(safe-area-inset-*)` reflects the safe area. One third-party package observed an 84 pt inset on the bar edge in the simulator (right 84, bottom 34) [3P: iphone_duo_ui_pro].
- CSS media and container queries reflow on unfold and in Split View with no JavaScript [3P: iphoneduosupport.com].
- The hinge, reserved regions, and scene accessories have **no web API**. They need a native plugin [3P].

**Decision to make** [Rec]: Spread's custom chrome versus Apple's "do not override the default bar placement." That guidance is about system bars. For v1, keep Spread's web chrome, honor the safe area, and treat vertical native bars as a later, separate decision. The Capgo native-navigation plugin (42 stars, MPL-2.0, Capacitor 8) claims Duo support, but it expects native bars to replace web headers and footers and its README still has placeholder media. Watch it; do not adopt for v1.

---

## 4. Layout instructions

### 4.1 Safe areas and insets

- [ ] Viewport meta has `viewport-fit=cover` [3P].
- [ ] **Per-side insets.** Safe areas and layout margins are asymmetric on Duo. Vertical controls can appear on the left in landscape and Split View. Never assume opposite insets are equal [Apple].
- [ ] Do not write `padding: 0 env(safe-area-inset-left)`. Use `padding-left` and `padding-right` separately [3P].
- [ ] Foreground interactive content stays inside the safe area. Backgrounds may extend past it [Apple].

### 4.2 Resize logic

- [ ] Size from the window or container, never from the main screen. Apple says `UIScreen.main` is ambiguous on two-display devices and will be deprecated [Apple]. Web equivalent: use viewport and container size, not `screen.width`.
- [ ] Re-read size whenever it changes. A fold can resize the app mid-session [Apple: Prepare page].
- [ ] Do not use orientation for layout decisions. **The inner display ignores your supported interface orientations** [Apple]. Use width and aspect ratio queries.
- [ ] Do not use `userInterfaceIdiom`, "regular width equals iPad", or user-agent sniffing [Apple]. The inner display is regular width on an iPhone.
- [ ] Do not lock orientation with a plugin. Support landscape on the outer display; people set Duo down like a tent [Apple].
- [ ] Full-bleed media: do not rely on `object-fit: cover` or aspect-fill for important content on wider displays [Apple].
- [ ] `UIRequiresFullScreen` is still honored, but the app still resizes on open and close [Apple].

### 4.3 Adapt to the fold

**Apple's guidance** [Apple: Strike a pose talk; HIG]:

- When the device is partially folded like a book, the fold divides the inner display into regions. Content and controls that span it become hard to see.
- **Displacement**: adjust the frame of existing elements so important content stays visible, reachable, and unobstructed. Move an element alone if it adapts independently. Move related elements together. Avoid excessive movement.
- **Continuous scrolling content (lists, feeds, documents) does not displace.** It already adapts by scrolling.
- Where an element goes depends on use. Partially folded like a book: alerts go to the trailing side. Propped on a table: the top region suits content viewed at a distance, the bottom suits interactive controls.
- In grids, prefer an **even number of columns** so content divides cleanly at the fold.
- Move only what is necessary. Controls that disappear or shift dramatically are hard to find.

**For Spread** [Rec]:

- [ ] Week view: when the fold is active, keep each day row entirely within one region. Prefer an even number of day columns if the Week view is a grid at that width.
- [ ] The Spread view is a scrolling list. Do not displace it.
- [ ] **Sheets (Move to, rollover review, undo toast area)**: do not center them blindly. Anchor to an edge or the trailing region so they never straddle the fold. Test partially folded.
- [ ] The tasks "To place" tray and drag handles must stay clear of the fold. A drag target split across the fold is hard to use.
- [ ] If CSS-only is not enough, evaluate the Capacitor DisplayFeatures work (PR #8597: size class, pose, reserved-region frames, and a CSS device-posture polyfill) [3P; merge status not verified].

### 4.4 Reserved regions (native only)

If you add a plugin or native code [Apple: Strike a pose talk]:

- Reserved regions are areas content avoids or components adapt around. They come in two kinds: **division** (the fold; splits an area) and **occlusion** (a camera; blocks an area).
- Query in SwiftUI with `GeometryProxy.reservedRegions(kind:options:layoutDirectionBehavior:)` and in UIKit with `UIView.reservedRegions(kind:options:)` (the Tech Talk names the UIKit type `UIViewReservedRegion`). Read each region's `frame`.
- A region is **active** or **inactive**. The fold is active only when partially folded; flat, it has zero width. Pass `.includeInactive` to see inactive ones.
- The outer camera is always present. The inner camera region is active only when the camera is active.
- Available in iOS 27.1.

### 4.5 Hinge data (optional, probably not for Spread)

SwiftUI `onHingeChange` and UIKit `UIHingeInteraction` give status (closed, partially open, fully open) and angle. Apple says hinge data is for interactions and effects. For layout use the region and arrangement APIs [Apple: Leverage multiple displays talk]. Spread does not need this.

### 4.6 Arrangement views (native only, probably not for Spread)

`ArrangementView` (SwiftUI) and `UIArrangementViewController` (UIKit) lay out a primary and secondary view with `split` or `overlay` styles. Apple says to use them when a layout already resembles HStack/VStack (split) or ZStack (overlay), and not inside navigation split views, lists, or scroll views [Apple]. Spread's WebView does not use them. A web analogue is to build Week plus a detail pane as a two-column layout that respects the fold [Rec].

---

## 5. Bars and navigation

**[Apple: HIG Vertical controls; developer overview]**

- Toolbars, tab bars, and navigation controls move to the **side** on the outer display and on the inner display in landscape. The inner display in **portrait** keeps horizontal bars.
- In Split View, each app places controls along its **outer edge**.
- Use `toolbarVerticalEdge` (SwiftUI) or the `verticalBarEdge` trait (UIKit) to learn whether bars are vertical. Extend hero or background images under vertical bars with `backgroundExtensionEffect()` or `UIBackgroundExtensionView`.
- Toolbar item rules: provide an icon and a title. Text-only items and custom-view items are not shown vertically. Reserve the top of the vertical axis for Back, Close, and Done.
- Do not override the default bar placement. Keep controls consistent across poses.

Spread's web chrome does not do any of this by itself. See section 3.

---

## 6. Multitasking and scenes

- All apps take part in **Split View**, two apps side by side. An app that already resizes on iPad or iPhone Mirroring is in good shape [Apple].
- Duo also has a layout stacking video and apps together. Handle it with the same resize logic [Apple].
- Duo is the first iPhone with **multiple instances** of an app's UI. If you support multiple scenes on iPad you get it here too [Apple].
- **New windows cannot be created on the outer display.** Handle failures when requesting a scene. Use `UIWindowSceneActivationAction`, which hides itself when unavailable [Apple].
- Scene accessories and `CameraCaptureAccessory` are for camera apps and games. Spread has no camera; ignore them.

---

## 7. Interaction on Duo

- Drag and drop mechanics are unchanged (see iPhone and iPad guides). Narrow Split View widths and the fold make drag targets smaller or split; test them.
- Keep haptic and visual feedback the same as iPhone.
- Reachability: Duo can be held, set down, or propped. Keep primary actions in stable positions as poses change [Apple: keep controls consistent].

---

## 8. Corners

Use concentric corners so UI fits the display shape. SwiftUI `ConcentricRectangle`, UIKit `UICornerConfiguration` (iOS 26 APIs updated for Duo) [Apple]. In the WebView, keep a visible margin from the screen corners rather than assuming square screens [Rec].

**Dark mode on two displays.** The outer and inner displays can show Spread in the same theme, so the dark palette rules in `SPREAD_IPHONE_BUILD_GUIDE.md` section 6a apply to both. When the inner display shows two panes (for example Week plus the To place tray), each pane should be a distinct elevation step so the split reads without a hard divider near the fold [Rec]. Test dark mode on both displays in Device Hub.

---

## 9. App Store assets for Duo

**[Apple: Screenshot specifications; Prepare and submit post]**

| Display | Size (portrait / landscape) |
| --- | --- |
| Outer | 1398 x 2034 / 2034 x 1398 |
| Inner | 2007 x 2853 / 2853 x 2007 |

- **Starting April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later.**
- Submitting Duo screenshots earns an **"optimized for iPhone Duo" badge** on the product page.
- App Store Connect has a new preview tool for how assets look on Duo, and a featuring nomination option that lets you say you support all device poses.
- Apple provides an iPhone Duo bezel (Photoshop and PNG) in Design Resources. Review the marketing guidelines before use.
- No separate iPhone Duo UI kit was listed. The iOS 27 and iPadOS 27 UI Kit is the nearest.

For the promo film, a Duo cut is not planned. If you add one, capture real UI from the Duo simulator for the store, not a rendered film [Repo; Rec].

---

## 10. Testing on Duo

**[Apple: Prepare page and talk; forum]**

- [ ] Install Xcode 27.1 and run the **iPhone Duo simulator** in **Device Hub**. Use its controls to open, close, rotate, and fold. Apple says the simulator is the best way to test the full native experience.
- [ ] If the posture controls are missing, launch the Device Hub bundled with Xcode 27.1 (Xcode menu, Open Developer Tool, Device Hub), not an older one Spotlight may open [Apple forum].
- [ ] Use the **iOS resizable simulator** in Device Hub and **iPhone Mirroring** on macOS 27 at extreme sizes in both directions.
- [ ] Test Split View on the inner display: drag the app to either side and check safe areas on both edges.
- [ ] Poses to check: closed, open wide, open tall, partially folded, tent, laptop. Rotate in each.
- [ ] In Xcode, ask the assistant to **"get my app ready for iPhone Duo"** (the App Resizability skill). For other agents run `xcrun agent skills export`. It scans native code for `UIScreen.main`, orientation checks, and idiom checks. Run it over `ios/App/App` and local plugins. Cloud folders stay out of scope [Repo].
- [ ] Remote debugging: set the WKWebView inspectable in debug builds so Safari Web Inspector can attach. `isInspectable` exists on WKWebView [Apple].

Also run the standard commands and browser widths from `SPREAD_IPHONE_BUILD_GUIDE.md` section 9, plus a width sweep that simulates the Duo sizes in Chromium. Browser emulation does not show the fold. Only the simulator does.

---

## 11. Do and do not summary

**Do**

- Build with Xcode 27.1.
- Use per-side safe-area insets and `viewport-fit=cover`.
- Decide layout from width and aspect ratio.
- Keep sheets and drag targets clear of the fold.
- Test in the Duo simulator.
- Submit Duo screenshots.

**Do not**

- Do not branch on device model, idiom, orientation, or `screen.width`.
- Do not center sheets or lock orientation.
- Do not claim Duo support before it has been run in the simulator.
- Do not touch the landing page or cloud files for this work.

---

## 12. Open items

- Whether Xcode 27.1 is final or still beta (forum posts called it beta about a month ago; Apple's October 5 post tells developers to use it).
- Spread's web chrome versus native vertical bars: decision needed.
- Fold handling for web sheets and the To place tray: design needed, then simulator test.
- Whether to evaluate the Capacitor DisplayFeatures plugin (PR #8597) or write a small native plugin for fold state.
- Physical Duo test: none done.
- Duo screenshot set and badge: not prepared.
- HIG pages for Duo not yet read: the "Raise the bar" Tech Talk (111462) on vertical bars, WWDC26 session 278 "Modernize your UIKit app", TN3210 on iPhone Mirroring.

---

## 13. Apple HIG pages and docs for iPhone Duo

- HIG: `designing-for-iphone-duo`, `layout`, `split-views`, `toolbars`, `tab-bars`, `sidebars`, `sheets`, `multitasking`
- Documentation: Preparing your app for iPhone Duo (`documentation/technologyoverviews/preparing-your-app-for-iphone-duo`)
- Tech Talks: 111461 (Prepare your app), 111462 (Raise the bar), 111463 (Strike a pose with adaptive layouts), 111464 (Leverage multiple displays and scenes), 111465 (camera)
- Landing: https://developer.apple.com/iphone-duo/

---

## Sources

- https://developer.apple.com/iphone-duo/prepare/
- https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo.md
- https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo.md
- https://developer.apple.com/videos/play/tech-talks/111461/
- https://developer.apple.com/videos/play/tech-talks/111463/
- https://developer.apple.com/videos/play/tech-talks/111464
- https://developer.apple.com/news/?id=kkphp5qo
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/forums/thread/847556
- https://developer.apple.com/documentation/webkit/wkwebview.md
- https://iphoneduosupport.com/frameworks/capacitor/ (third party)
- https://pub.dev/documentation/iphone_duo_ui_pro/0.2.1/ (third party)
- https://github.com/ionic-team/capacitor/pull/8597 (third party)
- https://github.com/Cap-go/capacitor-native-navigation (third party)
