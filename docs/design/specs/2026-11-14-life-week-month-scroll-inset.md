# Spec: Life Week month rows and dock inset

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Save as `docs/design/specs/YYYY-MM-DD-<slug>.md`.

| | |
| --- | --- |
| Request | Owner's phone: the Life Week page shows a month card with an empty band above its footer, and the selected day header sits under the bottom dock. |
| Restated | Native iPhone Life > Week: the month card draws only the rows its month needs, and the scroll area clears the dock. |
| Surface | iPhone, with the layout checked at 390, 820, 1024 and 1366 widths |
| Size | S (two surgical fixes in one file each, plus a contract test) |
| Author | Claude Code, 2026-11-14 |
| Status | Draft, In review |
| Governing docs read | CLAUDE.md; design README (router); RULES_CARD; PLAN_SPEC_PROTOCOL; native brand board (Week, dock, Dynamic Type and 44 pt sections, by search); iOS 27 audit (safe area, scroll and dock rows, by search); packs/apple-native-feel.md (scroll edge line) |

## 1. Problem

On an iPhone, Life opens on Week. The month card expands to show the whole month, but a five-week month shows a sixth empty row, so a blank band sits between the date grid and its footer. Scrolling the Week page moves the selected day header under the bottom dock, where the dock hides it.

## 2. Evidence and context

- `[Repo]` `LifeWeekView.swift`: expanded mode shows all six rows (`ForEach(0..<6)`, `shown = expanded || row == selectedRow`), so a month that needs four or five rows keeps 56 pt of empty grid.
- `[Repo]` `LifeRoot.swift`: the scroll area is a sibling above the dock, and `.scrollClipDisabled()` lets the Wallet cards draw past the scroll frame. The dock is laid out after the scroll view, so the scroll area never reaches under it.
- `[Assumption]` The dock overlap is read from code, not from a device. Not run on a simulator or device.

## 3. Goals, non-goals and budget

- **Goals:** a month card shows exactly the rows its month needs, in every month. The scroll content rests above the dock at its end. The Wallet pass-through stays.
- **Non-goals:** no new store, no data change, no new colour, no glass, no fade gradient, no change to the Hours or Classic screens, no Plan Ahead change.
- **Appetite:** one small change in each of two files, one test file, this spec.

## 4. Rules that apply and exceptions needed

- Touch targets 44 pt: month arrows, the month toggle and Today keep at least `Spread.minimumTarget`.
- Status is never colour alone: today is a ring, the selected day is a filled circle, and the accessibility labels say "Today" and "selected".
- Dynamic Type: the footer stacks at accessibility sizes, and day numbers shrink instead of clipping.
- Reduce Motion removes the expand and selection animation, as before.

**Exceptions needed (for the owner to decide, not designed around):**
1. **Edge fade under the dock.** `packs/apple-native-feel.md` says content under the dock needs a fade or blur edge. The native app has no existing fade or blur token, and the rules card forbids Liquid Glass. Content scrolls under the solid dock with a hard edge. A gradient would need a new token, so it is not added.
2. **Liquid Glass on the dock.** `platforms/IOS27_BEHAVIOR_AUDIT.md` line 21 suggests system glass for dock controls. The rules card says no Liquid Glass in native. The rules card wins. Not added.
3. **Month grid starts Monday.** `planner/SPREAD_NATIVE_BRAND_BOARD.md` describes a Sunday-first Month. Life's grid is Monday-first and that is unchanged here.

## 5. Options and choice

- **Rows:** derive the row count from the month's length, `ceil((leading blank days + days in month) / 7)`, using the same Monday-first offset as `LifeCalendarRules.selection`. Chosen. Rejected: a fixed six, which is the bug, and hiding the sixth row after layout, which would jump.
- **Dock:** (a) make the dock a `safeAreaInset` on the scroll view, so the scroll area runs under it and the inset tracks the dock's real height. Chosen. (b) keep the sibling layout and add a bottom content margin. Rejected: the frame already ends at the dock, so a margin adds empty scroll space and fixes nothing.
- **Clip:** keep `.scrollClipDisabled()`. The inset alone fixes the rest position, and the Wallet cards keep their pass-through.

## 6. Experience and states

- **Month card, collapsed:** one week row, as before.
- **Month card, expanded:** 4, 5 or 6 rows, from the month. Switching months animates in the same glide used for date changes, and not under Reduce Motion.
- **Selected day in the last row:** that row stays shown.
- **Footer:** the caption and Today share one line at normal sizes and stack at accessibility sizes.
- **Today and selected:** a selected today shows a fill with an onAccent ring, so today stays visible.
- **Dock:** the Life/Week toggle, the focus timer, undo history and the Crown row remain. Their height is measured, not fixed.

## 7. Platform behavior

- Widths: 390, 820, 1024 and 1366 (checked by reading only; not measured).
- Dark mode: the new ring colour is `Spread.onAccent`, which already adapts.
- Dynamic Type: AX sizes use the stacked footer and `minimumScaleFactor(0.6)` on day numbers.
- VoiceOver: each day keeps its full-date label, the selected trait and the "Today," prefix. Hidden collapsed rows stay hidden from VoiceOver.

## 8. Technical approach

- `LifeWeekView.swift`: a `monthRowCount` helper, a `ForEach(0..<monthRowCount)`, a stacked footer for accessibility sizes, `footerText` and `todayButton` helpers, a day-number `minimumScaleFactor`, and an `onAccent` ring when today is selected.
- `LifeRoot.swift`: the scroll area's bottom dock moves into `.safeAreaInset(edge: .bottom)`, and the sibling call is removed. Nothing else in `LifeRoot.swift` changes.
- No store action, no migration, no schema, no cloud or sync file touched.
- Contract test: `scripts/native-life-week-month-scroll.test.mjs` reads both Swift files and asserts the row count, the single inset and the kept clip.

## 9. Verification

Automated (run here): `npm run test:scripts` runs the new contract test. Typecheck, lint, `test:spread` and `docs:check` run in CI. The `native-typecheck` workflow compiles the Swift.

Device checks owed (not tested here):
- A five-week month and a four-week month in expanded mode, with no empty band.
- Collapse and expand, Reduce Motion on and off, and month switching with no jump.
- The day header scrolls above the dock at rest, at 390, 820, 1024 and 1366.
- AX5 Dynamic Type: the footer wraps, day numbers do not clip, and Today stays 44 pt.
- VoiceOver on the month grid and the day header.
- Light and dark mode.

## 10. Risks and open questions

- **Scroll under the dock** is a hard edge (exception 1). Default: keep the solid dock; owner decides on a fade.
- **Wallet pass-through:** the inset is a layout change near the Wallet stack. Default: keep the clip setting; a device check confirms cards still pass through.
- **Gray Matter library:** the app-design library was not read, because it sits outside this session's repository scope. Spread's rules apply in any case.
- **Audit document:** `2026-11-14-w3-week-month-spread-audit.md` is not on `main`. This spec uses the findings copied into the request.
