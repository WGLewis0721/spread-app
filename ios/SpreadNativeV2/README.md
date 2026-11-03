# Spread 2.0 — native SwiftUI vertical slice

**Implementation status:** Experimental / unshipped. Source branch `feature/spread-2-native-swiftui-slice`, base `main`. This is a **fixture-only, read-only** experience to verify native rendering, week Crown feel, and five view layouts. The approved Spread 1.0 and its persistent planner model remain untouched.

## What is built
- Isolated iOS 17 Swift package with Week and Spread SwiftUI destinations.
- Horizontal ridged **metallic** Week Crown with 64pt detents, 3-detent drag cap, reversals, arrow and VoiceOver adjustable action.
- **Five** responsibility layouts (Stack, Fan, Dial, Tabs, Day), all rendering one immutable `PlannerSnapshot`.
- **11 original Chalkboard WebP** illustrations, copied **byte-for-byte** from `spread-studio/src/spread/assets/illustrations` as package resources; decoded through ImageIO; decorative only.
- Fixed dark Chalkboard presentation; no Studio, theme choices, wallpaper, custom backgrounds, or personalization UI.
- Pure Swift tests for Crown detents/reversals, role/Dial geometry, exact task eligibility and snapshot round trip.

## Test the preview in Xcode
1. Check out the feature branch and open `ios/App/App.xcodeproj`.
2. Select **App** scheme, **Debug** configuration and an iOS 17+ simulator or device.
3. Edit Scheme > Run > Arguments Passed On Launch: add `-SpreadNativeV2Preview`.
4. Run. **Remove this argument** to launch the unchanged Capacitor planner. Release configuration ignores this argument.
5. Independently, `cd ios/SpreadNativeV2 && swift test` checks the portable contracts (on macOS and Linux). Actual SwiftUI compilation, WebP ImageIO decoding, touch/haptics and frame timing still need an Xcode/device run.

## Deliberate limitations and next gate
- **No live planner bridge yet.** Screens use a hard-coded, clearly labeled November 2026 fixture. Tapping tasks opens a read-only explanatory sheet. An hour bank is *shown*, not edited, and Week navigation for another week shows empty allocations. This prevents a second editable store or writes to localStorage.
- Add a **typed React planner adapter** behind a separate owner-reviewed change: `PlannerCommand` → existing `src/lib/spread/store.ts` actions → `PlannerSnapshot`. Enforce task-on-own-role-day, bank math, Undo, rollover, profile isolation and save error behavior in the existing store. Do not add SwiftData as a second live store.
- Restore **animated cutout layers** from `doodle-motion.ts` only after preserved artwork fidelity, Reduce Motion and energy budgets are validated. Original static art is already included.
- The current Week view is a native day-list scaffold. Month grid, task edit and move sheets, persistent role preference and all six full user journeys are NOT complete.
- Before a merge: Xcode simulator compile, physical iPhone QA, dynamic type, VoiceOver, 100 Crown gestures + 30 reversals, original art comparison, data parity fixtures and cross-device layout checks.

**Release gate:** No TestFlight upload, merge, production deployment or data-format change under this PR. Keep `main`/golden baseline immutable.
