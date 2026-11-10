# Spec: Editorial Life card identity and replaceable art

> Part of the [Spread design brain](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). The companion [art direction sheet](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md) owns the visual grammar; this file owns the implementation sequence and gates.
>
> Summary: Native Life card presentation spec, replaceable artwork placeholders, motion and Liquid Glass boundaries, 12 numbered Claude implementation steps, regression tests and rollback gates.

| | |
| --- | --- |
| Request | Document the three owner-supplied illustrated Life card references, lock the visual direction, and give Claude a numbered native implementation plan with swappable artwork placeholders. |
| Restated | Make the native iPhone Life cards read as one premium, illustrated personal editorial collection while allowing new category artwork to be replaced without disturbing the planner or gestures. |
| Surface | Native SwiftUI Life/Wallet face and selected-card detail field; adaptive iPhone, iPad and Duo |
| Size | L: native card shell, asset architecture, accessible adaptive presentation |
| Author | ChatGPT design specification, 2026-11-10 |
| Status | **Owner-approved native presentation merge; no App Store deployment authorization.** See PR #162 for implementation evidence and native verification status. |
| Governing docs read | [rules through design map](../README.md); [foundational UX](../FOUNDATIONAL_UX_PRINCIPLES.md); [native board](../planner/SPREAD_NATIVE_BRAND_BOARD.md); [tactile motion](../tactile-precision/MOTION_CONTRACT.md); [tactile QA](../tactile-precision/VERIFICATION.md); [iOS audit](../platforms/IOS27_BEHAVIOR_AUDIT.md); [Apple principles](../platforms/APPLE_DESIGN_PRINCIPLES.md); [icon handoff](../brand/ICON_HANDOFF.md); [spec pack](../packs/spec-writing.md) |

## Current engineering contract (2026-11-10)

The owner approved merging the isolated native presentation infrastructure; **this is not approval to release an App Store build**. The implementation is tracked in [PR #162](https://github.com/WGLewis0721/spread-app/pull/162). Its authoritative native components are:

- `ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Editorial/` — **single category-artwork directory**. The main baseline from PR #162 established its loader and README; **draft PR #163** installs six 3000 × 1800 WebPs for Work, Family, Fitness, School, Home and Personal. These images are not on `main` until an authorized merge. Missing categories retain the Chalkboard fallback.
- `Life/LifeEditorialCard.swift` — `LifeEditorialArtworkRegistry`, `LifeEditorialArtwork` and `LifeEditorialFace`; all category image lookups are centralized here.
- `Life/LifeWalletStack.swift` — responsive physical card geometry, selection, native swipe/edit gestures; art can be replaced without editing these handlers.
- `Life/LifeRoot.swift` — opened Life card's actual planning details, nonzero day rows and optional tasks.
- `PlannerSnapshot.swift` — one authoritative native view projection of the existing planner's role, week, day allocations and tasks.
- `Package.swift` — registers `.copy("Resources/Editorial")`; missing art uses existing `Resources/Chalk` fallback.

**Source-images are not drop-in production backgrounds.** The chosen Personal reference is **plum/bronze with coffee, journal, headphones, camera and plant**; its full mockup contains baked letters and hours. Export/re-create a **clean, text-free art-only asset** with a quiet left text area (~60%) and a legible full-width day-footer zone (~25%). SwiftUI renders the brand mark, category name, current budget, assigned/unassigned hours and all seven real weekdays in front of it. Do not cut out the mockup's typography and leave ghosts. Review-resolution exports are not Retina-quality masters.

**No duplicated asset lookup.** Adding `personal.webp` to `Resources/Editorial` must only change Personal's appearance. Nothing in planner, hours, tasks, navigation or Wallet gestures may need edits. For unknown/custom category and missing art use a safe original Chalkboard fallback. The [Claude handoff](../planner/CLAUDE_EDITORIAL_ART_HANDOFF.md) is the direct execution entrypoint. Native build, XCUITest, accessibility, physical device and screenshot parity remain release gates; source-only checks never count as native QA.

## 1. Problem

A person with several weekly responsibilities should recognize a Life card immediately, understand its weekly time commitment and open it to work without losing their position. The native Wallet stack remains the functional baseline; the centralized, replaceable editorial art layer is implemented on `main` (PR #162), with a reversible golden/editorial gate and six illustrative assets staged only in draft PR #163. Baking generated art and runtime text into one image would make future artwork changes destructive and reduce accessibility.

## 2. Evidence and context

- **[Owner supplied]** Three image references in the 2026-11-10 conversation: `Fitness Weekly Allocation Card-4.png`, `Spread Responsibility_ Work, Family, Fitness, School, Home-5.png`, `SPREAD Weekly Responsibility Cards-1.png`. The source-image binaries are **not in the repository**. Read the [art sheet](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md), section 1, for observed facts and limits.
- **[Repo]** Baseline verified by source reading on `main` commit `c03132493996d711c56c2e44b63cc8c4d728f1f8`. `LifeWalletStack.swift` owns the native stack/face and edit swipes. `LifeRoot.swift` hosts separate focused details. `LifeHoursView.swift` handles weekly capacity/budgets. `LifeWeekView.swift` handles date focus/tasks. The TypeScript store is authoritative.
- **[Repo]** `planner/SPREAD_NATIVE_BRAND_BOARD.md` and `tactile-precision/MOTION_CONTRACT.md` establish one Wallet stack, selected-card continuity, Edit-only swipe gestures and Glide/Snap/Settle. That is still the functional baseline.
- **[Repo]** `platforms/IOS27_BEHAVIOR_AUDIT.md` and `platforms/APPLE_DESIGN_PRINCIPLES.md`: functional chrome may use Liquid Glass; content cards do not.
- **[Rec]** The source images show multiple *art treatments* but a coherent shared anatomy: printed/matte illustrated cards, large titles, clear weekly hours, and optional detailed day indicators.
- **Not checked:** Running iOS simulator, actual physical card motion, screenshots for the current build, asset licenses, Xcode 27 compilation, device QA, latest CI and whether a specific mocked chip should be retained. No source claim is a native PASS.

## 3. Goals, non-goals and budget

**Goals:** One coherent card-face geometry; per-category identity; correct live hours/days rendered in native text; a swappable artwork placeholder/registry; preservation of existing Wallet/Hours/Week behavior; accessible graceful fallbacks; design docs usable by Claude.

**Non-goals:** Task scheduling model changes (including zero-hour placement semantics), new planner calculations, new tab bar, finance/payment functionality, new tracking, accounts/sync, aggressive motion rework, copying marketing mockups pixel-for-pixel, changing Classic or More/Settings, changing React or the public landing site.

**Appetite:** One focused implementation PR after documentation approval; cohesive component extraction is allowed but no broad rewrite. Separate pure presentation from planner mutation and prove rollback.

## 4. Rules that apply and exceptions needed

| Rule | Effect |
| --- | --- |
| [Native board](../planner/SPREAD_NATIVE_BRAND_BOARD.md), §§1–4 and Nov 6 amendments | Preserve one Wallet stack, selected card continuity, existing Edit-only left Manage / right offscreen delete with Undo, metal Crown and app mark. |
| [Tactile motion](../tactile-precision/MOTION_CONTRACT.md), §§1–6 | Reuse Glide / Snap / Settle and existing calibration; no decorative animation affecting persisted state. |
| [Foundational UX](../FOUNDATIONAL_UX_PRINCIPLES.md), fundamentals and nonnegotiables | 44pt interactive targets, information hierarchy, contrasts, no color-only statuses, drag alternatives. |
| [iOS behavior audit](../platforms/IOS27_BEHAVIOR_AUDIT.md), authority/material/adaptivity | Glass only in functional chrome; resize from available scene width; large text disables unsafe overlap. |
| [Apple principles](../platforms/APPLE_DESIGN_PRINCIPLES.md), §§1–2, 6 | Keep card content opaque/legible; system materials and adaptations only where functional. |
| [Icon handoff](../brand/ICON_HANDOFF.md), category badges | Reuse known category identifiers and original glyphs; do not invent unsupported categories. |

**Exceptions needing explicit owner review before code merge:**

1. The warm off-white background in the references differs from the older approved dark-native Life shell. Treat as a *Life-only proposed appearance variant* in the new visual direction; do not repaint every tab, Classic, More or Week without explicit authorization.
2. The proposed largely static category art differs from the required original looping Chalkboard artwork. Retain the original art as a fallback and do not remove it or change its animation policy without review.
3. Editorial title treatment must still honor the existing production font policy. Use semantic/system fonts until owner approves any new font license; the raster font is a reference only.

## 5. Options and the chosen concept

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| A | Use full generated card image as a button face, including baked text and hours | Fast screenshot resemblance | Wrong at runtime; bad Dynamic Type, stale values, hard to translate and edit |
| B | Inline bespoke SwiftUI artwork in each card type, tangled with logic | Total art control | Repeated code and destructive future edits |
| **C** | One native Wallet identity/content shell with an isolated category-art registry/placeholder | Safe swaps, live data, testability and category flexibility | Requires clear rendering interface and asset QA |

**Chosen:** C. Rejected A/B. The [art sheet](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md) is the single source for visual decisions.

### Breadboard

**Life collapsed:** Wallet-style stack. Each exposed identity face shows name, weekly budget, and passive distribution preview. Artwork and background colors identify the responsibility. No mini-editor buttons inside the decorative weekday marks.

**Life focused:** Selected card retains title/art and weekly value; separate neutral field beneath contains a compact nonzero-day summary, an Adjust Days action, and secondary optional tasks. Preserve the selected role and collection position when closing.

**Hours and Week:** Existing screens and planner intents remain authoritative. Visual changes to Life must not change how totals, tasks, hour capacities, navigation or Undo work.

**Native hour editing:** Reuse existing direct entry and allocation controls. Any new in-card shortcut must lead into current commands, not create a second data owner.

**Artist's delivery:** Asset at a stable category slot (e.g., `personal`, `fitness`), no baked brand, title, time, days or real interactive controls. Render those by SwiftUI; compare to original reference as an overlay at review time.

### States

- **Empty/unknown category:** plain persisted-color card plus original category glyph/chalk art, readable title and budget.
- **First run:** no mandatory tour; obvious tap/chevron path.
- **Loading/busy:** keep last committed snapshot, communicate pending updates, prevent duplicate mutation.
- **Error/rejected edit:** preserve authoritative values and explain; no false confirmation.
- **Overflow/10–20 cards:** vertical scroll; keep essential text exposed, not covered by overlap.
- **Offline:** existing local-first planner behavior unchanged.
- **Undo:** original task/role Undo remains intact.
- **Reduced Motion:** reveal details without spatial animation; no decorative art movement.
- **Missing art:** built-in fallback, no crashes or empty opaque slab.
- **Small screens/long names:** larger exposed face/stack pitch or normal vertical list; never truncate essential hours silently.

## 6. Platform behavior

- **Widths:** Verify 320, 375, 390, 430pt iPhones; ~820; iPad 1024/1366; supported Duo narrow/wide/hinge, rotation and resizable scenes. Choose from measured available width, not device brand.
- **Safe areas / scroll:** don't obscure the Crown, tray controls or task rows; stack and focused detail use one outer vertical scroll, never nested content scroll traps.
- **Appearance:** light/dark, Increase Contrast, Reduce Transparency with opaque readable fallbacks. The card's source art palette is not a replacement for the stored role color.
- **Accessibility:** VoiceOver reads responsibility name, weekly budget, assigned/unassigned hours, selected state and actionable chevron; day preview communicates weekday/hours in accessible text. 44pt controls, Dynamic Type and VoiceOver adjustable actions. No interactions depend solely on art or color.
- **Input:** touch, pointer, keyboard and VoiceOver; drag has a tap path. Artwork is not hit-tested separately.
- **Motion:** Use `SpreadTactile`, `SpreadMotion`, and existing `LifeFeedback` paths. No new recurring decorative pulses. Existing edit-only cues remain per owner contract; no double haptic on selection.
- **Liquid Glass:** only native controls/dock/sheets where supported, system fallback under reduced transparency. Never glass the artwork/card/content.
- **Performance:** use pre-rendered optimized art at appropriate screen scale, no full-resolution source in every offscreen card, no unnecessary per-frame blur or repeated image decode.

## 7. Technical approach

**Code ownership:** `LifeWalletStack.swift` owns interaction/stack; the face's rendering may be extracted to a separate `LifeCardFace` or equivalent. Introduce an isolated `LifeCardArtwork` boundary and a category-to-resource `LifeCardArtRegistry` (names illustrative; inspect existing code before adding types). Continue to consume the current `Responsibility`, `PlannerSnapshot` and stored role colors. Draw live text and day previews in SwiftUI. Keep app's existing content and accessibility architecture.

**Data:** zero new persisted fields required for a presentation-only change. The art registry reads category and available illustration resources, with optional simple user-color tint. No parallel role, task or calendar store. No migration.

**Motion and structure:** selected card and art travel as one object. The art layer must not own drags, edit state, haptics, save or navigation. Its replacement must not require editing planner commands or recomputing hours. Category fallback must support custom/unknown identifiers.

**Rollout:** put the redesigned face behind existing Life opt-in/appearance choice or a narrowly scoped reversible native presentation gate, default to the current golden Life face until approved. Do not create a new product-level navigation mode merely to preview artwork.

**Do not touch:** Classic layout, More/Settings, landing/React styling, iCloud/sync, profile persistence, backup formats, store semantics, actual date math, existing demo assets and release controls. No new third-party dependency is required.

**Privacy and licensing:** no runtime external image fetching or analytics. Source artwork may be generated but must be licensed and shipped locally at release.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| New warm canvas versus dark native shell | Contrast and current aesthetic conflict | Treat as scoped preview-only Life variant, no global palette rewrite | Owner |
| Fake payment chip/number in mockups | Unclear financial affordance | Omit from native functional UI; artwork may still echo premium card material | Owner |
| Art font and literal sample hours | Raster may look accurate but won't be dynamic | Native text only; use approved system typography and snapshots | Owner/engineer |
| Existing Chalk animations | Previous approval expects animation | Keep as fallback and don't delete | Owner |
| Aspect and crop | Artwork might cover hours on narrow width | Dedicated safe-zone crop, tested across layout widths | Designer/engineer |
| Zero-hour tasks | Current planner links task day to allocation | Out of scope, track as separate proposed model PR | Owner |
| High-res images / memory | 20-card stack with expensive texture decode | Pre-render optimized image variants, measure on device | Engineer |

## 9. Verification and full-implementation plan

### Acceptance criteria

1. Given Work, Family, Fitness, School, Home and Personal, when shown collapsed, then the same consistent geometry, readable name, weekly budget and weekday summary appear and each category remains distinct.
2. Given Fitness 6 h with Tue 2, Thu 2, Sat 2, when viewed collapsed/focused/Week, then all visible day allocations agree and no image contains fixed real data.
3. Given Personal category artwork is swapped in the registry, when the app rebuilds, then every role/task/Hours/Week behavior and card interaction remains unchanged.
4. Given missing or custom artwork, when cards render, then a correct accessible fallback is used.
5. Given 10–20 cards or XXL text, when scrolling or selecting, then every essential label remains visible and there is no horizontal scroll/gesture trap.
6. Given an animation underway, when tapping another card or reversing focus, then the current motion stops/redirects immediately and the correct details settle.
7. Given VoiceOver or Reduce Motion, when navigating, then all actions work and the presentation remains readable without relying on animation or color.
8. Given a saved planner, when backgrounding/terminating/relaunching, then state is unchanged by the cosmetic skin; no allocation or task write occurs from card art.

### Checks

- Run `npm run docs:check` for the documentation PR, plus any documented schema/links checks.
- In implementation PR, execute applicable TypeScript planner suites, Swift unit tests/XCUITest, SwiftUI compile in the actual Xcode/Codemagic environment, accessibility testing and visual comparison to supplied references.
- Record same-data screenshots for collapsed, focused, editing, busy, error, no art, large-text and light/dark; 390/820/1024/1366 and supported Duo layouts.
- Physical iPhone: haptics, scroll and swipe conflicts, 60/120 Hz responsiveness where available, thermals, VoiceOver, reduced-motion/transparency and interrupted selections.
- Log exact SHA, iOS SDK, OS, device, tester and unavailable evidence. No device PASS from screenshots alone.

### Numbered implementation plan for Claude (plain English)

1. **Read the repository baseline.** Checkout latest `main`; read `DESIGN.md`, `docs/design/README.md`, this spec, the [art sheet](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md), native brand board, tactile motion/verification, iOS audit and original design decisions. Inspect actual code/tests before claims.
2. **Inventory what already exists.** Trace responsibility data, category glyphs, Chalkboard art, `LifeWalletStack`, focused details, Hours/Week and motion tokens. Identify duplicate rendering and unnecessary complexity. Keep a brief gap list.
3. **Create a reversible native implementation branch.** Protect Classic, More/Settings, current production assets and working golden Life. No merge, upload or deploy.
4. **Extract the card's visual shell only.** Refactor freely within the presentation layer to separate state/gesture ownership from card drawing. Avoid moving the store or changing planner semantics.
5. **Add replaceable art placeholders.** Create a category registry and an isolated artwork slot with a default fallback for Work, Family, Fitness, School, Home, Health, Business, Project, Church, Personal and custom. It must be possible to swap `Personal` art without touching the shell or app behavior.
6. **Render real information over the art.** Draw responsibility name, weekly budget, assigned/unassigned values and passive seven-day preview from the authoritative snapshot, not from baked image pixels. Use one canonical fixture in tests.
7. **Match the approved identity.** Apply the art sheet's editorial shape, texture, title hierarchy and category scenes. Use stored role colors; respect safe text/art zones. Treat warm canvas and any new font as owner-gated appearance exceptions.
8. **Refine closed/focused layout.** Keep every card's name/hours readable while stacked, preserve selection position, and place editable day distribution/task rows below the intact selected card. No nested miniature cards or disappearing essential labels.
9. **Reuse motion and native materials.** Apply existing Glide/Snap/Settle and haptic policies; only functional chrome may use Liquid Glass. Use low-cost static card art by default; retain original Chalkboard motion as fallback pending owner approval.
10. **Wire and verify all states.** Empty, missing resource, custom role, busy, error, cancellation, Undo, long names, dense stack, different week, and Week return. Never write planner data from the art renderer.
11. **Test and correct in the actual native app.** Run docs/test/build suites, capture device-size comparisons, prove gesture arbitration, VoiceOver/Reduce Motion/Transparency, reopen persistence and honest motion performance. Fix failures on the same branch.
12. **Prepare a reviewable PR only.** Provide before/after pictures, file-level change summary, test logs, a demonstration of replacing one asset without touching planner files, exact device evidence and rollback. Stop for explicit owner review before merge, Codemagic distribution, TestFlight or production.

**Test with a real user:** Do you know how to select/edit this card? Is it easy? How could it be simpler?

## 10. Rollout, rollback and release

**Documentation stage:** this branch adds only design text/index, not an app change. **Implementation stage:** separate PR on fresh main, behind reversible native presentation selection, preserving current golden appearance as fallback. **Rollback:** disable new art renderer or revert visual PR without migrating/deleting data. **Release gate:** owner authorizes merge and release separately after native QA.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-10 | Owner selected the illustrated, tactile editorial Life card collection from three provided image references; prioritize static identity artwork and replaceable card art, while preserving existing functional motion and planner boundaries. Actual native implementation and warm-canvas exception remain review-gated. | Owner, design review | [art sheet](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md), this spec, [decision log](../DECISIONS.md) |
