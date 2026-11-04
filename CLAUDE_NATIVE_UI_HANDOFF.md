# Claude: Fix Spread's UI in PR #119

**Your job:** Make the existing Spread app look and feel like the owner's approved design. **This is not a new app.**

**Repository:** `WGLewis0721/spread-app`  
**Branch:** `claude/spread-swiftui-parity-87llx2`  
**PR:** [#119](https://github.com/WGLewis0721/spread-app/pull/119) (stay on this branch).

## 1. What we have today

The owner installed the current native SwiftUI TestFlight build. It works far enough to open and show responsibilities, but its UI is wrong: a giant serif “Spread” title, generic “Responsibilities” section, letter icons (W/H/T), oversized blank spacing and ordinary stacked panels. It looks like a different planner. **The Chalkboard illustrations and Dial are the parts the owner likes.** Keep the working code, but do not use this UI as your design target.

## 2. What we want

**The real Spread app, in premium native SwiftUI:** deep navy/dark surfaces, luminous blue selected controls, restrained role-color edge lighting, an actual ridged metallic Crown, original colorful Chalkboard art, compact cards with real tasks, and smooth physical interactions. Clear and useful first; beautiful second. Light mode must still work with the same layout.

## 3. References: what they are and how to use them

| Reference | Where | What to use it for |
| --- | --- | --- |
| **Current TestFlight screenshot** | Owner's Nov 3 chat | **Before picture:** find what looks wrong. Don't copy it. |
| **Old working app screenshots** (light Spread, Fan, Week, Month, More, New Spread) | Owner's Nov 3 chat; historical code | **Behavior/map:** where controls go, what users can do, and how screens connect. Fix the old clipping/overlap bugs, don't reproduce them. |
| **Approved dark Spread concept images** (Spread, Week, Month, Task, Move To) | Owner's Nov 3 chat | **After picture:** target colors, card hierarchy, Crown, spacing and visual personality. They are concept art, not proof that extra features exist. |
| **Card-stack, calendar and menu inspiration** | Owner's chat | **Interaction ideas only:** how Stack/Fan feel, calendars stay readable, and menus stay simple. Never copy an entire app's navigation. |
| **Native brand board** | [`docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md`](docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md) | **Official visual rules:** colors, spacing, glow limits, per-screen targets and test criteria. The [SVG specimen](docs/design/planner/SPREAD_NATIVE_VISUAL_SPECIMEN.svg) shows the materials but does **not** replace the owner's screenshots. |
| **Existing code + design docs** | [`docs/design/README.md`](docs/design/README.md), `SWIFTUI_PARTIAL_TASKS.md`, parity spec, planner store/tests | **How it really works:** use existing functions, assets, behavior rules and P1–P13 tasks. Don't invent new data or features. |

**The user's reference photos are in the conversation, not checked into Git.** Open them if accessible; otherwise say visual comparison is limited. Don't fake a pixel-perfect match.

## 4. How it SHOULD look and work

- **Top:** small folded-card app icon + **Spread** in system font; real horizontal metallic Crown with usable arrows and dates; no clipping.
- **Spread:** accurate hours summary and colored hour bar; illustrated responsibility cards with real category symbols, hours, task counts, task previews, quick task entry and hour controls. No letter avatars.
- **Five views:** **Stack** = vertical overlapping cards; **Fan** = angled cards with one focused card; **Dial** = preserve the working Dial; **Tabs/Day** = their own useful layouts. Gestures work on the first touch.
- **Week/Month:** responsibility-hour chips, **To place** tasks, clearly separate day cards, Free time suggestions, usable month grid, easy task moving and Undo.
- **Task sheets:** real details, complete/edit/move, Notes/Outline/Table/Photo; original New Spread, More, Profiles, appearance, exports and recovery remain accessible.
- **Every screen:** consistent navy/light appearance, readable text, clear tap targets, restrained glow, meaningful springs and no shifting or overlapping controls.

## 5. What Spread SHOULD NOT be

- Not a generic to-do list, habit tracker, calendar clone or dashboard.
- Not a completely redesigned navigation structure or a new Home/Activity/Analytics product.
- Not a sea of glows, glass, gradients, big decorative headings or empty space.
- Not a flat list with category initials, missing Chalkboard art or fake controls.
- Not visually impressive at the cost of task visibility, accessibility, battery or speed.

## 6. What YOU should NOT do

**Do not** restart the app, replace its planner engine, remove modes/features, create a second data store, change protected cloud/backup/schema code, invent new tabs, or build a separate demo. Do not confuse concept mockups with working features. Do not call a screen “done” because it compiled. Do not merge, deploy or send a new TestFlight build without owner approval.

The native brand board is an **approved visual exception** to the old quiet React palette rule **for SwiftUI only**. Leave React, the website, data, and production alone.

## 7. Work in this order

1. **Look:** Inspect PR #119 and current screenshots; compare each existing screen with the old app (behavior) and new dark references (appearance). List specific mismatches.
2. **Fix the shell:** App title/icon → Crown → Spread/Week navigation → dock → typography/colors/spacing. Use shared native components.
3. **Fix the main screens:** Responsibility cards and all five modes → Week/Month → Task/Move To → New Spread/More/Settings. Keep the current working behavior.
4. **Fix the motion:** First swipe works; no card jumps, double-actions, shifted headers, awkward animation or blocked taps.
5. **Prove it:** Build and run real iOS UI tests; test data, gestures, light/dark, accessibility. Capture real before/after native screenshots on the same device sizes. Finish the actionable P1–P13 items and record blockers honestly.
6. **Report:** What changed, what still fails, screenshots, test results and source SHA. Keep **PR #119 in draft** for owner review.

**Finish with:** `UI: PASS/PARTIAL/FAIL | FEATURES: PASS/PARTIAL/FAIL | TESTS: PASS/UNVERIFIED | RELEASE: NOT APPROVED`

**Simple rule: Keep Spread. Fix how it looks and feels. Don't break what it does.**
