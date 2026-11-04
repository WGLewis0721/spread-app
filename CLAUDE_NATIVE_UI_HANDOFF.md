# Claude — Fix Spread's UI in PR #119

**Your job:** Fix the existing SwiftUI app, **not build another app**. Stay on `claude/spread-swiftui-parity-87llx2` and [PR #119](https://github.com/WGLewis0721/spread-app/pull/119).

## Where we are vs. where we want to be

**NOW:** The TestFlight app has a giant serif title, generic “Responsibilities” heading, letter badges, too much empty space and basic cards. It lost Spread's identity. The owner likes the Chalkboard images and Dial.

**GOAL:** The **same working Spread planner**, presented like the approved premium iPhone designs: dark navy, restrained luminous blue, role-colored cards, polished metal Crown, original illustrations, clear tasks and smooth touch. Light mode must also work.

## References — what each one is FOR

| Reference | Why it exists / how to use it |
| --- | --- |
| **Current TestFlight screenshot** (owner's Nov 3 chat) | **Before:** find the bad layout and generic visuals to remove. |
| **Old light Spread screenshots** (same chat, historical repo) | **Product blueprint:** what screens, controls and workflows already exist. Fix the visible clipping bugs. |
| **Approved dark Spread designs** (same chat) | **Visual target:** colors, Crown, card depth, typography, visual hierarchy and task sheets. They are *concept images*, not extra features to invent. |
| **Stacked-card/calendar/menu examples** (same chat) | **Interaction inspiration:** physical Stack/Fan, readable dates, simple menus. Do not copy those apps. |
| [**Native brand board**](docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md) and [**SVG specimen**](docs/design/planner/SPREAD_NATIVE_VISUAL_SPECIMEN.svg) | **Exact guidance:** native styling rules, target geometry, screen requirements and checks. SVG is a specimen, not an installed screenshot. |
| [**Design map**](docs/design/README.md), `SWIFTUI_PARTIAL_TASKS.md`, actual SwiftUI/React planner code | **Rules and facts:** existing features, data flow, original artwork and unfinished P1–P13 tasks. Read before editing. |

The owner's image files are in the conversation, **not Git**. Say when you cannot view them; never fake a comparison.

## What Spread SHOULD look like and DO

- **Header:** small blue Spread icon, system-font name, metallic horizontal Crown, correct dates/arrows, simple navigation.
- **Spread:** actual hour summary; compact role-color cards with original category icons and Chalkboard drawings; hours, tasks and fast add/edit controls.
- **Modes:** Stack layers vertically; Fan angles cards around a focused card; preserve Dial; Tabs and Day remain distinct. All respond on first touch.
- **Week/Month:** real task placement, To place tray, Free time chips, easy-to-read days/month, move/Undo and accurate hour limits.
- **Sheets:** complete task details (Notes, Outline, Table, Photo), Move To, New Spread, More, Profiles, export and recovery.
- **Everywhere:** consistent dark/light appearance, readable content, stable layout, purposeful motion and accessible 44pt+ controls.

## What Spread SHOULD NOT look like or become

A generic to-do app, plain letter-icon list, oversized empty dashboard, copy of another calendar, or a mess of glowing gradients and floating buttons. Never sacrifice useful task information for decoration.

## What Claude MUST NOT do

Do not restart, replace the working planner engine, remove modes/features, invent Home/Activity tabs, change protected cloud/backup/schema files, add a second data store, or use fake buttons/screenshots. The premium style is approved for **native SwiftUI only**, not the React app or website. **No merge, deploy or TestFlight upload** without approval.

## Exact steps

1. **Compare** current TestFlight to the old working screens (behavior) and approved dark concepts (appearance). Identify specific differences.
2. **Fix shared UI first:** icon/title, Crown, navigation, dock, colors, spacing and typography.
3. **Finish screens:** role cards/five modes → Week/Month → tasks/sheets/settings. Preserve every working action.
4. **Fix gestures:** first swipe, Stack/Fan physics, interruptions, shifting controls and blocked taps.
5. **Test the real app:** native build, UI tests, planner regression, light/dark and accessibility. Capture real before/after screenshots. Finish P1–P13 or document exact blockers.
6. **Report results** in PR #119 with screenshots, tests, changed files and remaining issues. Keep it draft.

**Finish with:** `UI: PASS/PARTIAL/FAIL | FEATURES: PASS/PARTIAL/FAIL | TESTS: PASS/UNVERIFIED | RELEASE: NOT APPROVED`

**Simple rule: Keep Spread. Fix how it looks and feels. Don't break what it does.**
