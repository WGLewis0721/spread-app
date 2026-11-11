# Spread native UI: what is done, what is left, and how to finish it

> **Owner update (2026-11-04):** The five-mode responsibility view described in this historical completion ledger has been superseded. See [the current native brand board amendment](../design/planner/SPREAD_NATIVE_BRAND_BOARD.md) and [draft PR #127](https://github.com/WGLewis0721/spread-app/pull/127). The target is a single Wallet-style animated Stack with independent expansion, native task growth, persistent chevron and a common Edit/long-press mode. Legacy mode-specific test cases must be replaced with strict Stack tests, not silently skipped. All underlying planner and release constraints still apply.


**Written:** 2026-11-04, after PR #119 was merged to `main` as `c66116c` (branch tip `57acfbc`, identical tree).
**For:** the next engineer or Claude session. Pair it with [CLAUDE_NATIVE_UI_REMAINING_HANDOFF.md](CLAUDE_NATIVE_UI_REMAINING_HANDOFF.md).
**Status of the app:** the redesigned SwiftUI app builds, launches and renders on iPhone and iPad simulators **in light appearance**. Dark appearance, the old-vs-new comparison, the owner's reference images, most functional flows and every physical-device check are **unproven**. Merge was authorised by the owner; that is permission, not verification.

Tags: **[code]** can be done by writing code · **[owner]** needs an owner decision · **[reference]** needs the owner's reference images or binary · **[device]** needs a physical iPhone · **[ci]** needs a macOS CI run.
Priority: **P0** blocks trusting the build · **P1** visible defect or hard-rule breach · **P2** unfinished feature · **P3** polish.

---

## 1. Evidence, exactly as it stands

| Check | Result | Where |
| --- | --- | --- |
| Planner tests (`npm run test:spread`) | 432 pass | CI and local |
| Swift package tests (portable layer, Linux) | 24 pass | local |
| SwiftUI compiled for the iOS simulator | pass | `native-ios-compile` on head `16382e5` |
| Full app built, launched, toured on iPhone (393 pt) and iPad Air (820 pt) | pass, **light only** | run 41751778640; captures in `docs/evidence/swiftui-parity/screenshots/2026-11-04/` |
| Web deploy of `main` (Pages) and App Store preflight | pass | runs on `c66116c` |
| Dark appearance rendered | **never** (the tour's flag is ignored; every "dark" capture is light, measured) | see V1 |
| BEFORE capture | **never** (the job did not compile: workflow defect) | see V2 |
| Flow tests (create spread, add and complete a task, place hours and Undo, Crown caps, Month to Week, Move to) | **no result** (cancelled twice by pushes) | see V3 |
| Layout acceptance audits | **ran and failed, not triaged**: 390 pt asserts a 390 pt screen but the simulator is 393 pt; 1024 pt has a missing `view-mode-button` and a hit area under 44 pt | run 41751778627; see V4 |
| Inherited journeys, Crown 100 drags, Stack/Fan 100 swipes | **not run on this UI** | see V5 |
| Owner's reference images compared | **never viewed** (they are in a chat, not the repo) | see V6 |
| Physical iPhone | **never** | see V7 |
| `main` CI and iOS shell for `c66116c` | queued when this was written; the previous `main` commit's CI and iOS shell had already failed | see V8 |

## 2. What is done (plain English)

| Area | State in `main` | How well proven |
| --- | --- | --- |
| Look and feel system (navy and cream colours, text styles, shared card, chip and press surfaces, one sheet container) | In code | Compiled. Light seen. **Dark never seen.** Colour contrast checked by arithmetic only. |
| Header: Spread icon and name, one Spread/Week switch, metal Crown with chevrons in a recess | In code | Seen in light. The ribs look harsh (D3). |
| Spread screen: hour summary bar, illustrated role cards (lit category tile, Chalkboard art, role-colour edge, hours, task count, menu) | In code | Seen in light. |
| Five modes (Stack, Fan, Dial, Tabs, Day), Dial and artwork kept | In code | Seen in light. Gestures not stress-tested. |
| Week: Free time chips, dashed To place tray, solid day cards, Today edge; Month with Sunday-first grid; iPad two-column days | In code | Seen in light. Placing, moving and Undo not exercised. |
| Sheets: Task (Notes, Outline, Table, Photo), More, Move to, New Spread, Profiles, role editor | In code | Task and More seen. The rest not captured. |
| Appearance choice (System, Light, Dark) in More | In code | Compiled only. |
| Launch screen colours (no grey flash) | In code | Compiled. Not seen. |
| Planner engine | Unchanged except additive read-only and existing-action intents | 432 tests. |
| Boundaries | No cloud, sync, backup, schema, server, React or landing file changed | Checked against `main`. |

## 3. What is left

### A. Prove it (verification gaps)

**V1 Dark appearance has never been rendered. [P0] [ci]**
- *Now:* the tour launches with `-AppleInterfaceStyle Dark`; this iOS ignores it, so every `tour-dark-*` image is light (canvas luminance about 240 of 255).
- *Why:* dark navy is the owner's primary target; light working proves nothing about it. Apple: support Dark Mode with semantic colours and test it, and test Increase Contrast and Reduce Transparency too. Repo: [APPLE_DESIGN_PRINCIPLES section 6](../design/platforms/APPLE_DESIGN_PRINCIPLES.md).
- *Fix:* in each dark test set `XCUIDevice.shared.appearance = .dark` (iOS 17+), or run `xcrun simctl ui <udid> appearance dark` in a separate workflow step before the dark run. Also launch once with `-spread.native.appearance dark` (the app's own preference key) to test the in-app override, and once with System while the device is dark. Then grep the views for literals that assumed a light surface: `grep -rnE "Color\.(white|black)|\.white\b|\.black\b|Color\(hex" ios/SpreadNativeV2/Sources`.
- *Done when:* dark captures of Spread (all five modes), Week, Month, More, Task, Move to, New Spread and a large-text pass exist, canvas luminance is under 80, the `.contrast` accessibility audit is clean, and the screens read like the SVG specimen (canvas `#060B18`, surface `#101C32`, ink `#F7FAFF`).

**V2 No BEFORE capture. [P1] [ci]**
- *Now:* the BEFORE job swaps in the old `SpreadNativeV2` sources (commit `b1ae53a`) but keeps the new host file `ios/App/App/SpreadBridgeViewController.swift`, which calls `Spread.canvasUIColor`; it does not exist in the old sources, so the build fails.
- *Fix:* in `.github/workflows/native-visual-tour.yml`, the BEFORE step also runs `git checkout b1ae53a -- ios/App/App/SpreadBridgeViewController.swift`. Run it alone if possible.
- *Done when:* BEFORE and AFTER pairs exist for the same fixtures and widths. The tour names each capture `tour-<style>-NN-<screen>`, so pair them by that name.

**V3 The five functional flows have no result. [P0] [ci]**
- *Now:* `SpreadFlowUITests` F1 to F5 were cancelled twice. Pushing to the branch cancels the run (see section 6).
- *Fix:* run them to completion without pushing. Read the failures; fix real bugs, not the tests.
- *Done when:* F1 create a spread, add and complete a task, relaunch and persistence; F2 place hours and Undo; F3 Crown caps round trip and Back to this week; F4 Month to Week; F5 Move to — all green, or each failure is a filed defect.

**V4 The legacy layout audits fail. [P0] [ci]**
- *Now, 390 pt:* `PlannerUITests.swift:776` asserts the screen is 390 pt wide. The `iPhone-15` simulator is 393 pt, so every 390 test stops at its first line and the audits never run.
- *Now, 1024 pt:* (a) `view-mode-button` is missing on iPad (`PlannerUITests.swift:98`); the identifier must sit on a container above the `ViewThatFits` in `SpreadSurface.swift` so every alternative has it; (b) the hit-region audit reports "Hit area is too small" on Week top and in the iPad orientation test (`PlannerUITests.swift:151`); the element is named in the attachment `audit-issues-1024-week-top` in run 41751778627.
- *Why:* 44 pt targets are a hard rule (CLAUDE.md; Apple HIG Layout and Accessibility; Fitts's Law in [FOUNDATIONAL_UX_PRINCIPLES](../design/FOUNDATIONAL_UX_PRINCIPLES.md)).
- *Fix:* use a 390 pt device type (iPhone 14, 13 or 12) or assert the real width class; give the picker container the identifier on iPad; enlarge the offending control to at least 44 by 44 pt with `.frame(minWidth: 44, minHeight: 44)` and `.contentShape(Rectangle())`, never by shrinking its glyph.
- *Done when:* `testAudit390`, `testAuditExtended390`, `testLayout390`, `testAudit820`, `testAudit1024` and `testIPadOrientations` pass with no ignored issue.

**V5 Inherited journeys and UI tests target the previous UI. [P1] [code] [ci]**
- *Now:* they look for labels and identifiers the redesign changed: "More", "New responsibility", "Save hours", `card-more-tasks`, `card-task-`, `selected-day-<iso>`. Only about 7 identifiers and 8 labels differ.
- *Fix:* adapt the helpers in `PlannerUITests.swift` and `JourneyUITests.swift` to the current identifiers (list them from the source, do not guess). Do not delete a test to get green.
- *Done when:* Crown 100 drags with 30 reversals, Stack and Fan 100 rapid swipes, the accessibility audits, Dynamic Type, long names, orientations, Reduce Motion and the F1 to F10 journeys pass on the final head. New test files go in the explicit lists with `--min` raised (CLAUDE.md).

**V6 The owner's reference images were never viewed. [P0 for any claim of "matches"] [owner] [reference]**
- *Now:* the TestFlight screenshots, the old light screenshots and the approved dark designs are in a chat. Nothing is compared against them.
- *Fix:* the owner commits them (for example under `docs/design/planner/reference/`) or opens a session that can view them. Then compare side by side, screen by screen, and record each difference.
- *Until then:* every "matches the design" statement must say "against the brand board and SVG specimen only".

**V7 No physical iPhone pass. [P1] [device]**
- *Check:* the single light haptic on completing a task (iPhone only), Crown detents and feel, first-swipe latency (Doherty threshold: respond immediately), thermal behaviour while Chalkboard art animates, VoiceOver on the Crown, the Move to sheet and the role card menu, Dynamic Type at the largest sizes, Increase Contrast, Reduce Transparency, Reduce Motion.

**V8 CI health on `main`. [P1] [ci]**
- *Now:* the CI and iOS shell runs for the previous `main` commit (`748b3ce`) had already failed before this work; the runs for `c66116c` were queued. The iOS shell run is the only one that proves the launch storyboard and asset catalog in a full app build.
- *Fix:* read those results first. Separate failures this work caused from older ones, and fix or document each.

### B. Defects visible in the real captures

**D1 The layout switcher breaks words at large text. [P1] [code]**
- *Now:* at an accessibility text size the five buttons wrap mid-word ("Stac|k", "Tab|s"). `layoutPicker` in `Spread/SpreadSurface.swift` uses `ViewThatFits(in: .horizontal)`, and wrapping text still counts as "fits".
- *Why:* Apple's controls that live in a bar (tab bar, segmented control) do not grow with Dynamic Type; they offer the Large Content Viewer instead. Words must never break mid-word. Repo: Scale in [FOUNDATIONAL_UX_PRINCIPLES](../design/FOUNDATIONAL_UX_PRINCIPLES.md).
- *Fix:* `.lineLimit(1)` with `.minimumScaleFactor(0.8)` on each label; when `dynamicTypeSize.isAccessibilitySize`, show icons only and add `.accessibilityShowsLargeContentViewer { Label(...) }` to each button, or switch to a `Menu` or a two-row grid. Keep the 44 pt target and the `view-mode-button` container.
- *Done when:* the large-text tour shows five whole labels or five icons, nothing clipped, at 393 pt.

**D2 Empty day cards keep dead space. [P1] [code]**
- *Now:* an empty day in Week shows the day name and date at the top and a blank band below. In `Week/WeekSurface.swift` (`DayCard.body`) an empty day adds a 1 by 1 `Color.clear` placeholder, which costs an 8 pt stack gap, plus 10 pt padding top and bottom. The owner's original complaint was "too much empty space".
- *Fix:* remove the placeholder and put the "No responsibilities scheduled" text on the card with `.accessibilityElement(children: .combine)`; make an empty day a single compact row about 44 to 48 pt tall.
- *Done when:* an empty day is one tidy row; a day with hours still shows its allocation rows and the Add control.

**D3 Crown ribs read as hard barcode stripes. [P3] [code]**
- *Now:* `Shell/WeekCrownView.swift` draws high-contrast blue-white ribs with `Canvas`; at 3x they look like a barcode. The brand board asks for "no moire".
- *Fix:* lower rib contrast (highlight about 30 to 40 percent, shadow about 25 percent), lay a vertical metal gradient over the ribs so they read as brushed, keep the pitch near the specimen's 22 pt, and align ribs to whole device pixels.
- *Done when:* at 2x and 3x, and on iPad, the ribs look like machined metal with no shimmer when the Crown moves; the date and chevrons stay clear of the ribs.

**D4 The floating dock covers the last rows. [P1] [code]**
- *Now:* on a long list the last task rows sit under the dock until scrolled.
- *Fix:* reserve space with `.safeAreaInset(edge: .bottom)` on the scroll content (or `.contentMargins(.bottom, dockHeight, for: .scrollContent)`), and fade or blur content under the dock (the scroll edge treatment in [APPLE_DESIGN_PRINCIPLES section 2](../design/platforms/APPLE_DESIGN_PRINCIPLES.md)). Respect Reduce Transparency (opaque dock).
- *Done when:* the last row can scroll fully clear of the dock at every width and at large text.

**D5 The New Spread sheet has no capture. [P2] [code] [ci]**
- *Now:* the tour noted `missing: new-spread`. Either the tour taps the wrong control or the control is not reachable under that label or identifier.
- *Fix:* find out which. If the product control is hard to reach, that is a real defect (Hick's Law: frequent actions within three taps).

**D6 The Task sheet may be thinner than the brand board. [P2] [qa]**
- *Now:* the capture shows Done, a role header with Mark done, the title, four content types and Delete task. The brand board section 4 asks for role, title, hours and date, completion, subtasks, Notes/Outline/Table/Photo and Save/Cancel.
- *Check:* confirm hours and date are visible, subtasks are reachable, and whether Done versus Save/Cancel is intended. Do not invent a field the store does not have.

**D7 Day order is Sunday first. [decision, not a bug] [owner]**
- *Fact:* `weekDays()` in `src/lib/spread/model.ts` (pre-migration `35b6652`) lists Sunday to Monday; the native Week copies that on purpose (`PlannerOrder.displayOffsets`). Jakob's Law would favour Monday first for calendar users. Recommendation: keep it for parity, and decide after the reference images are seen.

### C. Unfinished features (from [SWIFTUI_PARTIAL_TASKS.md](SWIFTUI_PARTIAL_TASKS.md) P1 to P13)

| ID | Item | Status now | What finishing means |
| --- | --- | --- | --- |
| F1 · P1 | Theme and accent in More | System/Light/Dark done; accent picker **not built**; iCloud not surfaced | See O1 and O6 |
| F2 · P2 | Dock glass | System material plus token; the CSS `blur(28px) saturate(1.7)` is not reproduced | Tune against the CSS. Glass belongs on functional chrome only (header, dock, Crown), never on cards (Apple Materials; repo section 2) |
| F3 · P3 | Stack auto-turn | Not built | See O2 |
| F4 · P4 | Sheet details | Done: one container, drag indicators, medium detents; some errors are alerts, not inline | Decide alert versus inline per error |
| F5 · P5 | Cascade and week-sequence motion | Week slide now plays; **profile-switch stagger and task cascade on expand not built** | Add a stagger modifier (14 pt rise, 45 ms steps); check interruption on device |
| F6 · P6 | Sheet stack and press feedback | Press feedback done; staggered sheet stack replaced by system sheets | See O3 |
| F7 · P7 | Week to Month morph | Not done; still a cross-fade; Month marks the open week | `matchedGeometryEffect` with a shared namespace between day cards and month cells, Reduce Motion falls back to a cross-fade |
| F8 · P8 | Fan, Dial, Tabs, Day physics | Restyled; Day fill and Dial count-up and Tabs lift added; **springs not calibrated** | Calibrate against the reference recording |
| F9 · P9 | Chalkboard motion | Geometry fixed; curves are sinusoidal; **keyframes and FX overlays not ported** | Pull keyframes from `spread-studio` `render.css`; use `KeyframeAnimator` (iOS 17); port steam, sparkle, shine, shimmer, speed, glow |
| F10 · P11 | Refusal copy | Specific text for ineligible days and empty bank; **zero-bank and over-cap use the store's generic refusal** | A store-side reason code (a TypeScript change; keep it additive and tested) |
| F11 · P12 | Export and backup | Export done (print, Word, text); `.spread` backup and restore **blocked** | See O5; match print layout to `WeekPaper`; check each export on device |
| F12 · P13 | App Store | Privacy manifest reviewed by reading; metadata is owner-authored | Owner supplies metadata and screenshots |
| F13 · G-11 | Free time in Swift has no parity vectors | Open | Add vectors against `src/lib/spread/free-time.ts` |
| F14 · G-9 | Launch and splash parity | Colours set; not compared to the reference | Compare after V6 |

### D. Decisions only the owner can make

| ID | Decision | Recommendation and why |
| --- | --- | --- |
| O1 | Build an accent picker? | **No.** The brand board fixes one action blue; Apple says to be judicious with colour in controls; one accent keeps hierarchy. Keep System/Light/Dark. |
| O2 | Stack auto-turn (E-5)? | **No.** Self-moving cards steal touches, fight Reduce Motion and add a second thing to watch (Hick's Law, Doherty). If yes: pause on any touch, stop under Reduce Motion, visible pause button of at least 44 pt. |
| O3 | Staggered sheet stack or system sheets? | **System sheets.** Apple's sheets give detents, a grabber and VoiceOver behaviour for free. |
| O4 | Week day order | Keep Sunday first for parity unless the reference images say otherwise (D7). |
| O5 | Native `.spread` backup and restore (E-1) | CLAUDE.md forbids touching that engine. Keep the protected recovery surface until the owner lifts the rule. |
| O6 | iCloud and sync UI (G-6) | Keep hidden behind the `cloud.*` flags. Nothing may claim iCloud works. |
| O7 | Drawn icon style (G-8) and SF Symbols for generic glyphs (E-4) | Keep the round category tiles with real glyphs; the owner asked for real category icons, not letters. |
| O8 | What counts as release-ready? | Internal TestFlight only until V1, V3 to V5 and V7 pass. |
| O9 | The reference images and binary (G0) | Commit them to the repo or run a session that can view them (V6). |

## 4. How the fixes follow the rules

| Source | Rule | Applied in |
| --- | --- | --- |
| Native brand board, section 3 | Calm navy canvas, solid content surface, bounded role glow, functional chrome; 44 pt targets; no glow on every control | V1, D3, D4 |
| Native brand board, section 4 | Spread, Week, Month, Task, Move to contracts; no generic list, no letter tiles | D2, D6 |
| Native brand board, section 6 | Measure no clipped text, controls at least 44 pt, text 4.5:1 and 3:1; real screenshots; compile is not sign-off | V1 to V5 |
| CLAUDE.md | Every drag has a tap and a keyboard path; Undo; status never colour alone; Reduce Motion removes movement; one light haptic on completing a task | V5, V7, F7 |
| Foundational UX principles | Hierarchy, Contrast, Scale, Repetition; Fitts, Hick, Jakob, Doherty, Gestalt, Von Restorff | D1, D2, D5, V4 |
| Apple design principles (repo digest of Apple's Materials and Liquid Glass pages) | Glass on functional chrome only; content layer solid; test Reduce Transparency, Increase Contrast, Reduce Motion; sheets with detents and grabber; scroll edge treatment | F2, F6, D4 |
| Apple HIG: Dark Mode, Color, Typography and Dynamic Type, Accessibility (Large Content Viewer), Motion, Layout | Semantic colours with dark and increased-contrast variants; text styles that scale; controls in bars use the Large Content Viewer; purposeful motion; safe areas | V1, D1, D4, F7 |
| SwiftUI | `ViewThatFits`, `dynamicTypeSize`, `@ScaledMetric`, `accessibilityShowsLargeContentViewer`, `safeAreaInset`, `matchedGeometryEffect`, `KeyframeAnimator`, `sensoryFeedback`, `accessibilityReduceMotion`, `accessibilityReduceTransparency`, `colorSchemeContrast` | D1, D4, F7, F9 |

**Source honesty.** The repo's own Apple file says it read Apple's Materials and Liquid Glass pages and only a third-party mirror of the Sheets page. The Dark Mode, Dynamic Type, Large Content Viewer, Motion and SwiftUI API points above come from general knowledge of Apple's documentation and were **not re-read in this session**. Re-read the Apple originals before quoting them.

## 5. What counts as evidence

- A screenshot counts only if it came from a simulator or device run you can link, and you measured what it shows (for dark: canvas luminance).
- "Compiles" is not "looks right". A pass on one appearance is not a pass on the other.
- Every claim of "matches the design" must name what it was compared with. Against the owner's chat images: UNVERIFIED until V6.
- A failing audit is fixed in the product, never silenced in the test.
- Report what did not run as plainly as what did.

## 6. Operating traps learned the hard way

1. **A push cancels the running visual tour** (`cancel-in-progress` per ref). A docs-only push also re-triggered the tour, because for `pull_request` events GitHub appears to match path filters against the whole PR diff, not just the new commit. Push once, then wait.
2. **Do not push to `claude/spread-swiftui-parity-87llx2`** while the owner builds in Codemagic: the workflow `spread-pr119-internal-testflight` refuses any other branch and any moved tip. Work on a new branch.
3. Each push also starts heavy macOS workflows (journeys, layout acceptance, iOS shell) that can starve the tour. Cancel the ones you do not need, and say so.
4. `workflow_dispatch` only works for workflow files already on the default branch; a new workflow needs a `pull_request` trigger to run from a PR.
5. `.gitignore` excludes any folder named `screenshots`; add evidence with `git add -f`, as `docs/evidence/issue-113/screenshots/` does.
6. Force-push is blocked in this environment. Do not work around it.
7. `simctl list` can time out on a loaded runner; the tour retries it three times.
8. The simulator widths are 393 pt (iPhone 15 and 16) and 820 pt (iPad Air); a 390 pt target needs an iPhone 12, 13 or 14.

## 7. Order of work

1. **Evidence first, no app code:** fix the harness (V1, V2), let the run finish, read V3 and V4's real failures, and capture dark. One push, then wait.
2. **Triage** the legacy audits (V4) and `main` CI (V8).
3. **Fix** D1, D4, D2, then D5, D6, D3 with the smallest change each. Rerun after each batch, not each edit.
4. **Adapt** the journeys (V5) and get the 100-gesture tests green.
5. **Finish features** only after the owner answers O1 to O9.
6. **Device pass** (V7) before any claim beyond "internal TestFlight candidate".

## 8. Stop conditions and reporting

Stop and ask the owner if a fix seems to need a forbidden file (cloud, sync, backup, restore, schema, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/`, a `golden/*` branch) or a new screen, tab or button. List it as an exception; never design around the rule.

Finish every report with:
`UI: PASS/PARTIAL/FAIL | FEATURES: PASS/PARTIAL/FAIL | TESTS: PASS/UNVERIFIED | RELEASE: NOT APPROVED`
