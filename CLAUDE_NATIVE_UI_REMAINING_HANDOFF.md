# Claude: finish Spread's native UI (what PR #119 left)

**Your job:** finish and **prove** the native SwiftUI redesign that PR #119 merged. Do not rebuild it, do not restart it, do not add screens. PR #119 is merged to `main` as `c66116c`. Keep Spread. Fix how it looks and feels. Do not break what it does.

**Read these, in this order, before touching anything:**
1. [SPREAD_NATIVE_UI_REMAINING_SPEC.md](SPREAD_NATIVE_UI_REMAINING_SPEC.md): the full register of what is done and what is left, with a fix and a "done when" for each item. This is your task list.
2. [docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md](docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md) and the [SVG specimen](docs/design/planner/SPREAD_NATIVE_VISUAL_SPECIMEN.svg): the approved look and the acceptance gates.
3. [docs/evidence/swiftui-parity/implementation-ledger.md](docs/evidence/swiftui-parity/implementation-ledger.md), section 7, and the [real captures](docs/evidence/swiftui-parity/screenshots/2026-11-04/README.md).
4. [SWIFTUI_PARTIAL_TASKS.md](SWIFTUI_PARTIAL_TASKS.md) (P1 to P13), [docs/design/FOUNDATIONAL_UX_PRINCIPLES.md](docs/design/FOUNDATIONAL_UX_PRINCIPLES.md), [docs/design/platforms/APPLE_DESIGN_PRINCIPLES.md](docs/design/platforms/APPLE_DESIGN_PRINCIPLES.md), and [CLAUDE.md](CLAUDE.md).

## Where things stand (the short version)

- **Seen working, in LIGHT appearance only:** brand and Spread/Week switch, metal Crown with chevrons, hour summary, illustrated role cards, all five modes (Dial kept), Week with Free time and To place, Month, the Task and More sheets, iPad two-column days.
- **Never seen:** dark appearance (the owner's main target; the tour's dark flag is ignored, so all "dark" captures are light), a BEFORE capture, the owner's reference images, a physical device.
- **No result:** the five functional flow tests (cancelled twice by pushes).
- **Failing, not triaged:** the legacy layout audits (390 pt asserts 390 and the simulator is 393; 1024 pt has a missing `view-mode-button` and a hit area under 44 pt).
- **Visible defects:** layout switcher breaks words at large text; empty day cards keep dead space; Crown ribs too harsh; the dock covers the last rows.

## Do this, in this order

1. **Get evidence before changing the app.** Fix the tour harness (dark via `XCUIDevice.shared.appearance = .dark` or `xcrun simctl ui <udid> appearance dark`; BEFORE variant also checks out the old `SpreadBridgeViewController.swift` from `b1ae53a`). Push **once** and let the run finish. Then look at the dark captures and measure them. Spec items V1 to V4.
2. **Triage** the failures that evidence shows, and `main`'s own CI (V8). Separate what this work broke from what was already red.
3. **Fix the defects** D1, D4, D2, D5, D6, D3, each with the smallest change that satisfies its "done when". Batch the edits, then rerun.
4. **Adapt the inherited journeys and UI tests** to the new identifiers and labels (V5) and get Crown 100 drags, Stack and Fan 100 swipes and the audits green. Never delete or silence a test to get green.
5. **Do not build** accent picker, Stack auto-turn, a staggered sheet stack, `.spread` backup and restore, or any iCloud surface until the owner answers spec section 3D. List them as exceptions.
6. **Report** with real screenshots, the tests that ran, what did not run, and the changed files.

## Working rules you will trip over

- **Work on a new branch** and open a **draft** PR to `main`. Do **not** push to `claude/spread-swiftui-parity-87llx2`: the owner's Codemagic workflow only builds that branch at its exact tip and refuses a moved tip.
- **A push cancels the visual tour** that is running, and a docs-only push re-triggers it (path filters match the whole PR diff). Push once, then wait for the run. Heavy macOS workflows start on every push; cancel the ones you do not need and say so.
- Verification on this project is **CI on macOS runners**: build, run the UI tests, export the screenshots from the `.xcresult`, download the artifacts. Typecheck, lint, tests and build are necessary, not sufficient.
- Look at every screenshot yourself, and **measure** it (for dark: canvas luminance under 80). If you cannot view the owner's images, say "reference comparison UNVERIFIED". Never fake a comparison.
- Evidence under any folder named `screenshots` needs `git add -f` (`.gitignore` excludes it).
- Force-push is blocked here. Do not work around it.
- Native SwiftUI may use the owner-approved navy, bounded role glow and metal Crown. React, the website and the landing page keep their quiet palette. Role colours are data. Status is never colour alone. Cards stay content, glass stays on functional chrome. Targets are at least 44 pt. Every drag has a tap and a keyboard path. Drags and "Not today" offer Undo. Reduce Motion removes movement. One light haptic on completing a task, iPhone only.

## Never

Do not touch cloud, sync, backup, restore, schema files, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/`, or any `golden/*` branch. Do not add a second store, a Home or Activity tab, extra navigation, or fake buttons or screenshots. Do not replace illustrations with letters. Do not rewrite the planner engine: task changes go through `store.ts` actions. Do not claim iCloud works. Do not mark unfinished or untested work complete.

**No merge, deploy or TestFlight upload without the owner's explicit permission.** Launching the TestFlight build is a manual step in the owner's Codemagic account (workflow `spread-pr119-internal-testflight`); you cannot and should not start it.

## Finish with

`UI: PASS/PARTIAL/FAIL | FEATURES: PASS/PARTIAL/FAIL | TESTS: PASS/UNVERIFIED | RELEASE: NOT APPROVED`

**Simple rule: prove it in dark, on a device, against the owner's images. Until then it is a light-mode candidate.**
