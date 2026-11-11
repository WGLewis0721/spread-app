# Life: full Wallet behavior (Stack, Focus, Stack)

> Part of the Spread design brain. Start at [../README.md](../README.md).

Written 2026-11-11. Status: owner-approved for implementation on branch `feat/life-wallet-focus`. Size M. Native SwiftUI only.

Sources: two 60 fps screen recordings from 2026-11-11 (Apple Wallet and Spread Life) compared frame by frame, and the repo at `main` commit `f871082`.

## 1. Problem

Wallet opens a card in one motion of 0.38 to 0.53 s. Spread took 1.08 s in two motions: the card settled, paused 320 ms, then the page scrolled, which pushed the "Life" title and the hours summary under the clock and Dynamic Island. At rest Spread showed two nearly full cards, so it read as a list, not a stack.

## 2. The standard

Life uses **Stack, Focus, Stack**. It does not use Expand, Scroll, Collapse.

- **Stack:** tightly overlapping cards. Each collapsed card shows its name strip. The front card shows its full face.
- **Focus:** one tap, one motion of about 0.4 s. The card lands in the same slot under the top bar every time. The other cards drop away blurred and dimmed. The title, summary and Add a Life area hide. Details sharpen into place under the card.
- **Stack again:** the X in the top bar, the card chevron, or a pull down on the card reverses the same motion and returns to that card in the stack.

## 3. Owner decisions (2026-11-11)

| # | Decision | Why |
| --- | --- | --- |
| 1 | Wallet focus is a spring: response 0.42, damping 0.82. Not scaled by the 1.75x travel factor. Tray and delete timings stay. | Matches Wallet's speed. Supersedes the 2026-11-06 timing for Wallet focus only. |
| 2 | The delayed second scroll is removed. | It caused the pause, the second motion and the content under the clock. |
| 3 | In focus, the "Life" title, the hours summary and "Add a Life area" hide. | The card reaches a fixed top slot without scrolling. |
| 4 | The top bar is opaque and sits above scrolled content. | Nothing can draw under the status bar. |
| 5 | In focus, the "Spread" mark becomes an X close button. The chevron stays. | Wallet has a clear way out. |
| 6 | Collapsed cards show the top 40% of the face. | The tightest strip that keeps the card's name whole. Supersedes the 2026-11-10 full-face stack spacing. |
| 7 | Other cards blur (radius 10) and dim to 35% as they drop. Blur is off under Reduce Transparency. | Wallet's depth cue. Owner-granted blur exception for this transition only. |
| 8 | Details fade in from blurred to sharp, in place, with no upward travel. Life only. Week keeps its current reveal. | Matches Wallet's detail reveal. |
| 9 | Pull down on the open card closes it. | Wallet behavior. |
| 10 | Closing scrolls only as far as needed to show the closed card's strip. | Return to that card in the stack. |
| 11 | The dock is opaque and covers the bottom safe area. | Card text no longer shows through or below it. |

Deliberate differences from Wallet: the strip is 40%, not roughly 24%, because Spread's name sits lower on the face than a bank logo. The open card does not grow 2%, because the motion contract requires the face to keep its width.

## 4. Priority and order of work

**Speed and visible change come first. Testing is light.**

1. **Commit 1, the visible change:** steps 1, 2 and 4 to 14 (Files A, C, D). Push as soon as it is done so a build can start.
2. **Commit 2, tests:** steps 3 and 15 only. One number and three taps. Do not write new tests. Do not add UI tests, snapshot tests or new test files.
3. **Commit 3, docs:** step 16.

Do not hold commit 1 for a test run. If Swift or Xcode is not available in the session, say so in the pull request and move on.

## 5. Steps

Rules for the whole job:
- Touch only the files named below. Do not rename anything. Do not reformat surrounding code.
- `Sources/` below means `ios/SpreadNativeV2/Sources/SpreadNativeV2/`.
- Every "Find" block is copied from the file at `f871082`. If one does not match exactly once, stop and report. Do not guess.

### File A. `Sources/Theme/SpreadTheme.swift`

**Step 1. Spring token.**

Find:
```swift
    public static let walletFocusDuration = 0.42 * showTravel
```
Replace with:
```swift
    /// Spring response for Wallet focus. Not scaled by showTravel (owner decision 2026-11-11).
    public static let walletFocusDuration = 0.42
```
Find:
```swift
    public static let walletFocus = Animation.timingCurve(0.18, 0.0, 0.2, 1, duration: walletFocusDuration)
```
Replace with:
```swift
    public static let walletFocus = Animation.spring(response: walletFocusDuration, dampingFraction: 0.82)
```

**Step 2. Wallet detail transition.**

Find:
```swift
    public static var detailReveal: AnyTransition {
        .asymmetric(insertion: .offset(y: detailDistance).combined(with: .opacity), removal: .opacity)
    }
```
Leave it unchanged. Directly after its closing brace add:
```swift
    /// Wallet-style details: sharpen in place under the focused card, with no travel.
    public static var walletDetailReveal: AnyTransition {
        AnyTransition.opacity.combined(with: AnyTransition.modifier(
            active: SpreadBlurEffect(radius: 8), identity: SpreadBlurEffect(radius: 0)))
    }
```
Then directly above the line `struct SpreadEntrance: ViewModifier {` add:
```swift
struct SpreadBlurEffect: ViewModifier {
    let radius: CGFloat
    func body(content: Content) -> some View { content.blur(radius: radius) }
}

```

### File B. `ios/SpreadNativeV2/Tests/SpreadNativeV2Tests/TactilePrecisionTests.swift`

**Step 3.** Find:
```swift
        XCTAssertEqual(SpreadTactile.walletFocusDuration, 0.735, accuracy: 0.00001)
```
Replace `0.735` with `0.42`. Leave the other three assertions alone.

### File C. `Sources/Life/LifeWalletStack.swift`

**Step 4. Stack overlap.**

Find:
```swift
    private var stackStep: CGFloat { max(0, closedHeight - 12) }
```
Replace with:
```swift
    private var stackStep: CGFloat { (closedHeight * 0.40).rounded() }
```
Find:
```swift
    // A readable full-week strip needs a complete face, not the old 72pt pitch.
    // Small overlap retains Wallet depth without hiding any title, hours or day.
```
Replace with:
```swift
    // Wallet-style stack: each collapsed card shows its name strip.
    // The front card shows the complete face with hours and the week strip.
```

**Step 5. Reduce Transparency setting.**

Find:
```swift
    @AccessibilityFocusState private var focusedRole: String?
```
Add directly above it:
```swift
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
```

**Step 6. Blur and dim the other cards.**

Find:
```swift
                            .accessibilityHidden(hidden)
```
Add directly after it:
```swift
                            .opacity(hidden ? 0.35 : 1)
                            .blur(radius: hidden && !reduceTransparency ? 10 : 0)
```

**Step 7. Slot markers for scroll return.**

Find:
```swift
                            .animation(reduceMotion ? nil : SpreadTactile.walletFocus,
                                       value: focusActive)
                    }
```
Directly after that closing brace (still inside the `ZStack`) add:
```swift
                    // Layout-only markers at each card's resting strip, so closing can
                    // scroll back to where that card sits in the stack.
                    ForEach(Array(ordered.enumerated()), id: \.element.id) { index, role in
                        Color.clear.frame(height: stackStep)
                            .alignmentGuide(VerticalAlignment.top) { _ in -CGFloat(index) * stackStep }
                            .id("life-slot-" + role.id)
                            .allowsHitTesting(false)
                            .accessibilityHidden(true)
                    }
```

**Step 8. Pull down to close.**

Find:
```swift
            .accessibilityFocused($focusedRole, equals: role.id)
```
Add directly after it:
```swift
            .simultaneousGesture(pullToClose(role.id))
```
Find:
```swift
    private func select(_ id: String) {
```
Add directly above it:
```swift
    /// Wallet-style exit: a deliberate downward pull on the focused card closes it.
    /// The scroll view supplies the visible pull. This only decides on release.
    private func pullToClose(_ id: String) -> some Gesture {
        DragGesture(minimumDistance: 20, coordinateSpace: .global)
            .onEnded { value in
                guard focusActive, selectedRole == id else { return }
                let down = value.translation.height
                guard down > abs(value.translation.width) * 1.5,
                      down > 110 || value.predictedEndTranslation.height > 260 else { return }
                select(id)
            }
    }
```

### File D. `Sources/Life/LifeRoot.swift`

**Step 9. Focus flag.** Directly above the line `    private var header: some View {` add:
```swift
    /// True while one Life card is in the Wallet-style focus state.
    private var lifeFocused: Bool { destination == .life && focusedRole != nil && !editing }
```

**Step 10. Close button and opaque top bar.** Inside `header`.

Find:
```swift
            Button { navigate(.life) } label: {
                HStack(spacing: 8) { SpreadBrandMark(size: 27); Text("Spread").font(.title3.bold()) }
                    .frame(minHeight: 44)
            }.buttonStyle(.plain).accessibilityLabel("Spread, Life").accessibilityIdentifier("life-home")
```
Replace with:
```swift
            if lifeFocused {
                Button {
                    withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) { focusedRole = nil }
                } label: {
                    Image(systemName: "xmark").frame(width: 44, height: 44)
                        .background(LifePalette.surface, in: Circle())
                }.accessibilityLabel("Close Life area").accessibilityIdentifier("life-close-focus")
                    .transition(.opacity)
            } else {
                Button { navigate(.life) } label: {
                    HStack(spacing: 8) { SpreadBrandMark(size: 27); Text("Spread").font(.title3.bold()) }
                        .frame(minHeight: 44)
                }.buttonStyle(.plain).accessibilityLabel("Spread, Life").accessibilityIdentifier("life-home")
                    .transition(.opacity)
            }
```
Then find the last line of `header` (it follows the More button):
```swift
        }.padding(.horizontal, 16).padding(.vertical, 4)
```
Replace with:
```swift
        }.padding(.horizontal, 16).padding(.vertical, 4)
            .background(LifePalette.canvas, ignoresSafeAreaEdges: .top)
            .zIndex(1)
```

**Step 11. Hide list-level content in focus.** Inside `life(_:viewportHeight:viewportWidth:)`.

Find:
```swift
            VStack(alignment: .leading, spacing: 6) {
                Text("Life").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                Text("Choose a Life area.").font(.subheadline).foregroundStyle(LifePalette.secondary)
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 4)
            Button { navigate(.hours) } label: { summary(snapshot) }.buttonStyle(.spreadPress)
                .accessibilityLabel("Adjust weekly planning hours")
```
Replace with:
```swift
            if !lifeFocused {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Life").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                    Text("Choose a Life area.").font(.subheadline).foregroundStyle(LifePalette.secondary)
                }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 4)
                    .transition(.opacity)
                Button { navigate(.hours) } label: { summary(snapshot) }.buttonStyle(.spreadPress)
                    .accessibilityLabel("Adjust weekly planning hours")
                    .transition(.opacity)
            }
```
Find:
```swift
            if !snapshot.roles.isEmpty { newLifeArea }
```
Replace with:
```swift
            if !snapshot.roles.isEmpty && !lifeFocused { newLifeArea }
```

**Step 12. Wallet detail transition.**

Find:
```swift
                    .transition(SpreadTactile.detailReveal)
```
Replace with:
```swift
                    .transition(SpreadTactile.walletDetailReveal)
```

**Step 13. One-motion scroll, and return on close.** On the `ScrollView` in `body`.

Find (six comment lines, then the task):
```swift
                            // Editorial expansion moves the details panel to the top of the
                            // scroll area. The scroll area ends above the dock, so the Days
                            // heading and the first weekday read without manual scrolling.
                            // Golden presentation keeps its existing scroll behaviour.
                            // The task is cancelled when the selection changes again, so a
                            // collapse or a quick switch never runs a stale scroll.
                            .task(id: editorialArt ? focusedRole : nil) {
                                guard editorialArt, focusedRole != nil else { return }
                                // Let the wallet's expansion lay out before scrolling.
                                do { try await Task.sleep(for: .milliseconds(reduceMotion ? 60 : 320)) }
                                catch { return }
                                withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) {
                                    proxy.scrollTo("life-details-top", anchor: .top)
                                }
                            }
```
Replace with:
```swift
                            // Stack, Focus, Stack in one motion. Opening returns the page to its
                            // top so the card lands in a fixed slot. Closing scrolls only as far
                            // as needed to show the closed card's strip in the stack.
                            .onChange(of: focusedRole) { old, new in
                                guard !editing else { return }
                                withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) {
                                    if new != nil {
                                        proxy.scrollTo("life-top", anchor: .top)
                                    } else if let old {
                                        proxy.scrollTo("life-slot-" + old)
                                    }
                                }
                            }
```
Then, in `details(_:snapshot:)`, find and delete the now unused scroll target:
```swift
        // Scroll target for editorial expansion: the top edge of the panel. Editorial only.
        // A 1pt clear overlay adds no layout and cannot receive taps.
        .overlay(alignment: .top) {
            if editorialArt {
                Color.clear.frame(height: 1).allowsHitTesting(false).id("life-details-top")
            }
        }
```
After this, searching `ios/` for `life-details-top` must return nothing.

**Step 14. Opaque dock.** At the end of `bottom(_:wide:)`.

Find:
```swift
        .background(reduceTransparency ? LifePalette.surface : LifePalette.surface.opacity(0.94))
```
Replace with:
```swift
        .background(LifePalette.surface, ignoresSafeAreaEdges: .bottom)
```
Then search `LifeRoot.swift` for `reduceTransparency`. If the only remaining match is this declaration, delete it:
```swift
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
```

### File E. `ios/App/SpreadNativeUITests/LifeUITests.swift`

**Step 15. Touch the exposed strip, not the covered center.**

Find:
```swift
        card.press(forDuration: 0.7)
```
Replace with:
```swift
        // Collapsed cards overlap. Touch the exposed top strip, not the covered center.
        let strip = card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25))
        strip.press(forDuration: 0.7)
```
Find:
```swift
        card.tap()
        XCTAssertFalse(manage.exists, "Normal tap focuses, not edits or deletes")
```
Replace with:
```swift
        strip.tap()
        XCTAssertFalse(manage.exists, "Normal tap focuses, not edits or deletes")
```
Find:
```swift
        scrollIntoView(card); card.tap()
```
Replace with:
```swift
        scrollIntoView(card); card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
```
Leave `card.swipeLeft()` and the rightward drag alone. By then the card is selected, and a selected card is drawn in front of its neighbors.

### Docs

**Step 16.** Three one-line edits.
- `docs/design/tactile-precision/MOTION_CONTRACT.md`, the "Motion calibration" bullet: change `Wallet focus **735ms**` to `Wallet focus is a spring (response 0.42, damping 0.82, not scaled by showTravel, owner decision 2026-11-11)`.
- `docs/design/tactile-precision/IMPLEMENTATION.md`, the "Motion" bullet: change `focus 735ms` to `focus spring (response 0.42, damping 0.82)`.
- `docs/design/DECISIONS.md`: add a new first row to the table that holds the 2026-11-10 row: `| 2026-11-11 | Life uses Stack, Focus, Stack with full Wallet behavior. Focus is a 0.42 spring in one motion with no delayed scroll. In focus the title, summary and Add a Life area hide and the top bar shows an X. Other cards blur and dim as they drop (owner-granted blur exception for this transition, off under Reduce Transparency). Details sharpen in place. Pull down on the open card closes it. Collapsed cards show the top 40% of the face. Top bar and dock are opaque. Supersedes the 2026-11-06 735 ms focus timing and the 2026-11-10 full-face stack spacing. | SPEC_LINK |`. Replace `SPEC_LINK` with a markdown link whose text is `spec` and whose target is `specs/2026-11-11-life-wallet-parity.md`.

## 6. What this does not touch

Planner data and store actions. Edit mode rules. Card artwork and face layout. The accessibility-size list layout. The Week Crown and dock controls. Classic, Week, Month, Hours. Cloud, sync, backup and `server/`. The three existing animation modifiers in `LifeWalletStack` stay, because they all read the same token and pick up the spring together.

## 7. Device checks (owner, after the build)

1. Tap a card. One motion, no pause, done in about half a second, with the other cards blurring as they fall.
2. Nothing shows behind the clock, the Dynamic Island or the dock, at rest or while scrolling.
3. The card lands in the same place whether tapped from the top or after scrolling down.
4. The X, the chevron and a pull down all return to the stack. A second tap mid-animation reverses smoothly.
5. Collapsed cards show the whole name. In Edit, a swipe on a strip acts on that card.
6. Frame rate holds during the blur. If it drops, lower the radius in step 6 before removing it.
7. With enough Life areas to scroll, close a card near the bottom and confirm the page brings its strip into view.

## 8. Risks and known limits

- These edits were written against the source and have not been compiled or run on a device.
- Three parts depend on behavior not yet seen on a device, most uncertain first: pull down to close (the scroll view may claim the drag, in which case nothing happens and the X and chevron still work), the scroll return on close, and the scroll reset on open when starting scrolled down.
- The Wallet recording does not clearly show pull down to close. It is included from how Wallet behaves.
- A Life area name long enough to wrap to two lines will have its second line covered in a collapsed strip.
