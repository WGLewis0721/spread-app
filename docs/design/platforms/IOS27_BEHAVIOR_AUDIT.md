# Spread iOS 27 UI/UX audit and acceptance
> Part of the [Spread design brain](../README.md). This is the current iOS platform checklist; the [native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md) defines the look and owner-approved behavior.
> Summary: iOS 27 adaptation for Spread's one Wallet-style responsibility stack, Week, Month and sheets; verified source facts, observed gaps, implementation choices and release gates. No design reset, new tabs, data migration or shipping authority.

**Scope:** SwiftUI in draft [PR #127](https://github.com/WGLewis0721/spread-app/pull/127) on top of Duo fix [#126](https://github.com/WGLewis0721/spread-app/pull/126). React and landing design remain unchanged. Apple developer references: [iOS 27 platform](https://developer.apple.com/ios/whats-new), [adopt Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass), [custom glass](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views), [adaptive layout](https://developer.apple.com/documentation/swiftui/viewthatfits), [SwiftUI accessibility](https://developer.apple.com/documentation/swiftui/accessibility-fundamentals), [iOS 27 resizable scenes](https://developer.apple.com/videos/play/wwdc2026/278/).

## Authority and boundaries

1. **Current owner decision:** only full-width **Wallet-style Stack** on Spread; closed cards overlap, any card opens independently and grows with tasks, permanent chevrons, animated original Chalkboard art, Edit/long-press parity, a role-colour pulse, confirmed leading-edge quick delete. Historical five-mode references are superseded **for native responsibility presentation only**.
2. Preserve the fold-card Spread logo, ridged metal Crown, navy/blue identity, role-coded imagery, and the Responsibilities → Hours → Week → Tasks workflow.
3. **iOS 27 is behavior, not a new theme.** Adopt native control materials and environment-driven sizing only when they improve clarity. Do not put Liquid Glass on task or role card content. Do not add sidebars, search, floating action buttons, accounts or AI.
4. Planner store, hour eligibility, Week/Month date semantics, Undo, recovery, privacy and local-first persistence remain authoritative.

## Audit ledger (2026-11-04)

| Fundamental / Apple expectation | Verified in source / risk | Decision and test |
| --- | --- | --- |
| **Unity, hierarchy, Hick and Jakob** | Main Spread currently has hour summary + Wallet Stack; docs still contained five-mode rules. | One visible Stack and one route to Week. Update design map/rules card; keep More for appearance, profiles and recovery; no duplicated layout picker. |
| **Fitts, progressive disclosure** | RoleRow has 44-pt chevron, independent open state, text and hour controls; earlier implementation crowded names with steppers. | Keep hour editor on its own row. Verify 44-pt targets, expansion, two simultaneously open cards, and task growth at 390/820/1024 and Duo sizes. |
| **Doherty and feedback** | Gestures send authorized intents through LivePlanner. Edit/long-press and quick delete are present in PR #127. | No speculative saves or fake completion; error banner and confirmation stay visible. Test edit, cancel delete and recovery. |
| **Material hierarchy, iOS 27** | Dock on PR #127 layers ultra-thin material and custom glass fill. | Use system Liquid Glass for **dock controls only** where available; opaque elevated Capsule for Reduce Transparency, legacy material fallback. Never glass the Chalkboard cards. |
| **Adaptivity, iOS 27** | Stack uses LazyVStack and maximum available width; Week has scrolling gestures. | Rely on container space and Dynamic Type, not device-name, orientation or main-screen width. Verify actual resizable scene, rotations and hinge poses; don't invent Duo-specific fixed offsets. |
| **Motion and personality** | Original ChalkMotionArt layers exist, run at 30 fps when app active and motion allowed; collapsed cards now instantiate them. | Animate art only when visible/active; don't stop on unrelated navigation changes. Reduce Motion disables decorative movement while edits and chevrons still work. Check low-power/thermal performance on device. |
| **Legibility and accessibility** | Role name wraps and hour editor is separated; audits previously flagged clipped text/contrast. | Semantic text, named icon alternatives, VoiceOver expand/collapse/edit and delete, Dynamic Type, Increase Contrast, Reduce Transparency; no color-only statuses. |
| **Data safety** | Native code uses serialized planner intents; no new store. | Confirm data after reopen, task creation, hours change, profile switch, Undo and backup/recovery entry; verify failing saves are not silently accepted. |

**Evidence categories:** Source-inspected means only code appears present, **not** that the behavior passed a simulator. Current PR #127 automated Xcode/Duo and screenshots are required before marking any visual row PASS. Sources in this document are technical guidance, not pixel-diff proof.

## Applied audit against the seven design fundamentals

*Source-inspected on native PR #127; automated/device status is reported separately.*

| Fundamental | Finding | Implemented or required |
| --- | --- | --- |
| **Unity** | Existing Spread mark, metallic Crown, role colors and Chalkboard art are intact; historical documentation still conflicted. | One Wallet Stack; current board, map and agent rules synchronized. Keep system glass **only** on the dock. |
| **Balance** | Spread cards were artificially limited to a 720pt column on iPad and wider Duo scenes. | **Fixed:** Spread cards use all scene width while Week retains its readable 1120pt timeline cap. |
| **Hierarchy** | Card titles could collide with +/- controls; collapsed tasks require an obvious entry. | **Fixed in PR:** hours editor is on its own row, each card has a permanent 44pt expand chevron, actual tasks determine expanded height. |
| **Contrast** | Role edges are attractive but cannot substitute for legible status or active-state words. | Semantic ink and labels remain; contrast and Increase Contrast XCUITest are **not yet passing** on this tip. |
| **Emphasis** | Multiple equal-glow surfaces would weaken the next action; editing needs an unmistakable cue. | Edit-only color pulse and leading delete; no new FAB/sidebars; reduce motion cancels decorative pulse. |
| **Scale** | Dense hour strips could shrink touch targets below 44pt. Wallet overlap could obscure large text. | **Fixed:** horizontally scrollable bar reserves 44pt per segment; XXL accessibility text disables closed-card overlap; scene-size test covers 390/820/1024. |
| **Repetition** | Sheets and day cards must use consistent affordances and recoverable planner actions. | Native sheets, task rows, role colors and Undo remain unchanged; regression and persistence acceptance **pending**. |

### iOS 27 platform compatibility findings

- **Scene lifecycle:** `ios/App/App/Info.plist` has `UIApplicationSceneManifest` and `SceneDelegate` creates a `UIWindow(windowScene:)`. **Source pass**; Xcode 27 launch still needs verification.
- **Resizable UI:** `SpreadLiveRoot` uses container width rather than `UIScreen.main` or device-orientation branching. Removed 720pt Spread cap and added viewport tests. **Code applied, device validation pending**.
- **System materials:** the existing `glassEffect(.regular, in: Capsule())` is a SwiftUI system control material and benefits from iOS 27 rendering changes automatically; the task and Wallet content stay opaque. Reduce Transparency uses solid elevated color. Do **not** build an unnecessary custom liquid-glass shader.
- **Illustration performance:** Chalkboard animations pause when their views disappear, the scene is inactive or Reduce Motion is on. They remain animated for visible users. Frame timing and battery checks need hardware.
- **New iOS 27-only APIs:** don't introduce `swipeActionsContainer`, 27 toolbar placements, or new document storage merely for novelty. The current build uses Xcode 26-compatible SwiftUI. Test iOS 27 behavior with **Xcode 27, resizable scene/simulator and physical-device review** before claiming native iOS 27 compliance. No underlying planner migration is authorized.

**Files changed in this pass:** `SpreadLiveRoot.swift` (responsive Spread), `SpreadSurface.swift` (dense bar and large type), `ChalkboardViews.swift` (pause invisible animation), `PlannerUITests.swift` (full scene width/44pt), `NativeContractsTests.swift` (ten-role touch target width). These are source facts, not visual PASS claims.

### Edit affordance and compact top navigation (November 4)

**Observed iPhone recording and later owner decision:** inserting Delete into the responsibility header shifts icon/name/hours. The replacement is **Edit mode plus directional swipe**: swipe the rigid card left to reveal Manage on its right, or right to reveal Delete on its left. Remove the obsolete bottom Manage card. Only haptic discrete interactions, never the pulse animation. Keep a visible edit glow, confirmation for destructive actions, and native accessibility alternatives. After opening, header labels fold into icons after 2.5 seconds; the Crown stays fixed.

**Design fundamentals:** Fitts (>=44pt reachable targets), Gestalt continuity (position-stable cards), progressive disclosure (Edit-only delete), system feedback (real confirmation), reduced motion (no forced movement), Jakob (recognizable icon controls with VoiceOver labels). Maintain the original source-of-truth store.

**Evidence gates:** New XCUITests compare card width and icon/hour/chevron horizontal coordinates before and during Edit, verify the Manage/Delete controls are revealed only after their directional swipes and remain tappable, and ensure labels disappear while navigation still works after the timed fold. Real 390pt iPhone, large Dynamic Type, iPad, Duo and light/dark simulator evidence is required before a visual PASS.

### More sheet — single-screen usability (owner recording, Nov 4)

**Observed defect:** The native More sheet was a tall five-section List. Even on a standard iPhone, Share and Backup/Restore were below the first viewport and required scrolling.

**Current treatment (PR #131):** Open More at the large detent as a compact dashboard. Keep **all existing actions** immediately visible at ordinary text sizes on 390pt iPhone: New Spread, Review tasks, Rollover; System/Light/Dark appearance; current profile + Manage; PDF/print, Word, Text exports; Backup and restore. Use three equal-width action tiles per row, quiet semantic navy/cream surfaces and 44pt+ touch regions. The selected profile is a summary, not a repeated list of noninteractive profiles. Do **not** hide the three sharing formats in another menu. Keep a scroll fallback for very small/resized windows and accessibility Dynamic Type rather than clipping controls.

**Acceptance:** The new More-overview native UI test must pass on a 390pt iPhone *without a swipe*; check light/dark, larger type, iPad and Duo for readable labels, all real actions and no unintended planner writes. New Spread, Review, Profiles, export and Recovery still open the original destinations. This source change is **not a simulator PASS** until XCTest runs and the More screenshot has been reviewed.

## Engineering checklist

1. Resolve doc contradictions: map current owner choice to the native board; mark older five-mode specs **historical**. Sync the single [rules card](../RULES_CARD.md) to agent files, then run `npm run docs:check`.
2. Keep the existing UI; apply platform material only to the floating dock, use an opaque alternative for Reduce Transparency, retain body content surfaces without glass.
3. Test all role actions: tap chevron → content; add six multiline tasks → natural card height; long-press → Edit; edit name, category and colour; leading delete slides in → requires confirmation; Done stops glow.
4. Test iOS behaviors on 390-pt phone, 820/1024-pt iPad and real Duo simulator pose and rotation: scroll, safe areas, resizable geometry, keyboard and pointer, no clipping, no accidental week navigation.
5. Run real build and UI test jobs: role gestures, Week and Month, 44-pt audit, Dynamic Type, Reduce Motion, contrast/VoiceOver and persistence. Capture **real** before/after light/dark screenshots and record SHA.
6. Record PASS/PARTIAL/FAIL per check. Never merge, deploy or send TestFlight merely because the source compiles.

**Current sign-off:** Code changes in progress on PR #127. Native visual, iPhone Duo and accessibility gates **UNVERIFIED** until green CI and screenshot review. Owner must separately authorize release.
