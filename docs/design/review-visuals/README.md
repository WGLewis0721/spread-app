# Spread iPhone Duo — design review visuals

**Owner review packet, not implementation evidence.** These are editable SVG *concept drawings*. They are not Xcode Device Hub screenshots and do not prove the layouts run. Sample Work/Home/Health responsibilities and tasks are illustrative only.

The authoritative specification, native-source audit, screen-by-screen delta, component contracts and acceptance criteria live in [the iPhone Duo adaptive design review](../specs/2026-11-05-iphone-duo-adaptive-design-review.md).

| Concept | SVG preview | Design intent |
| --- | --- | --- |
| 01 Compact | [Compact Spread + Week](duo-01-compact.svg) | Closed outer Duo / standard iPhone, one focused destination; same Wallet, Crown and task flow |
| 02 Expanded | [Responsibilities + Hours beside Week + Tasks](duo-02-expanded.svg) | Open inner Duo / large iPad, shared planning state and unchanged app identity |
| 03 Book fold | [Hinge-aware split](duo-03-book-fold.svg) | Partially folded open Duo; both existing panes avoid the active division reserved region |
| 04 Resized | [Laptop pose + Split View](duo-04-resized.svg) | Content reflow/collapse using usable geometry, not nine posture layouts |

## What to evaluate

- Same Spread brand: folded-card mark, premium navy, bright-blue selection, metallic Crown, existing responsibility colors, unchanged icon/typography semantics.
- Same workflow and navigation destinations. Compact switches between Spread and Week; regular shows their content simultaneously but uses the existing destination control to focus the corresponding pane.
- Wallet remains a single overlapped Stack (the SVG is intentionally simplified; spacing and illustration art must be calibrated against **actual** SwiftUI screenshots before implementation). No new selectable card layouts.
- Book fold: action buttons, Crown, cards, sheets and drag targets remain entirely in one usable region. A vertical division region is **not** simply a cosmetic divider.
- Resized/laptop: there is no new feature or navigation mode. The regular two-pane composition yields to compact when available space cannot fit both panes.
- In production, include actual Chalkboard assets, original task editor details, system adaptive bars and safe-area handling; they are not exhaustively illustrated here.

## Next gate

Owner approves or requests design amendments **before** any SwiftUI/layout/test implementation. After approval, Xcode 27.1 Device Hub screenshots and full native tests are required; conceptual SVGs can never satisfy those release gates.

Source authority: [Spread native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), [existing SwiftUI tokens](../../../ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift), [Apple's iPhone Duo HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo), [Apple's adaptive layout session](https://developer.apple.com/videos/play/tech-talks/111463/).
