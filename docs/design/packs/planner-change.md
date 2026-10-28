# Pack: changing a planner screen

> Part of the Spread design brain. Start at [../README.md](../README.md). Tier 2 pack: a digest, not the source. The rules card and [../tokens.json](../tokens.json) apply on top.

**Use when:** you change Week, Spread, Month, a sheet, a toast, a task row, the Crown, or anything the planner shows. For the landing page use [landing-change.md](landing-change.md).

## Facts to work from

**Tokens** (values in tokens.json): `--canvas` page and rows on a card; `--elevated` cards and sheets; `--ink`, `--secondary`, `--tertiary` text, strongest to quietest (tertiary is also the no-role-color dot); `--line`, `--fill` hairlines and quiet buttons; `--accent` and `--on-accent` the one interactive color; `--danger`, `--caution`; `--scrim`, `--shadow`. Role colors are data, only the dot that names the role. Status always has words.

**Patterns to reuse**
- Card: `rounded-3xl bg-elevated`; content rows on it `rounded-2xl bg-canvas`. Touch targets at least 44 px.
- Sheet: Radix Dialog with the `sheet` class and a Grabber (used for More, new spread, Open tasks). Question needing yes or no: Radix AlertDialog.
- Toast and Undo: one themed toast. Anything done by drag, a tap on a day or "Not today" offers Undo through `showUndoToast` (`src/spread/ui/undo-toast.tsx`) for six seconds. Only the latest change shows Undo; it runs only if that week is exactly as the change left it.
- Task line: a 44 px grip to drag, the task text, one text button ("Place" or "Move to"), in a plain list with hairline dividers, never a pill per task. Its days open beneath as small chips ("Friday 1h").
- To place is grouped by role ("Health · 11 tasks" with a chevron). Up to five tasks the groups start open; more, they start folded; an open group shows six before "Show N more".
- Week has three looks: days are solid cards (`bg-elevated`), To place is a dashed tray (`border-dashed`, no fill, also the drop target to take a task off its day), Free time is a row of tinted chips (`bg-accent/10`, accent text, a plus). Nothing that is not a day may look like a day.
- A role row on a day shows "N tasks" with a chevron; tasks open only when tapped.
- Quiet links (Rollover, Review open tasks) are accent text links, not full-width buttons.
- "Not today" only on a task placed on today.
- Drop highlight: a 2 px `--accent` outline on the target. A refused drop explains itself in a toast.
- Status row: a title, one quiet line, `role="status"`; problems use `--danger` on the title.
- Today: the word "Today" in `--accent` beside the day name with `aria-current="date"`.
- Spread/Week segmented tabs: the selected tab is the Tab stop; Left/Right or Home/End move focus and change the view.

**Motion:** existing classes only (`descend-in`, `ascend-out`, `cascade`, `week-seq`). Reduced motion removes movement; nothing depends on it. Haptics: one light tap on completing a task, iPhone app only.

**Moving without dragging**
- Task: Place / Move to lists the days its role is on; Take off this day and Not today return it to To place.
- Role on a day: tap the role, then Add, or tap a Free time suggestion.
- Keyboard: focus a task's handle, Space to pick up, arrows to step to the next day or the tray, Space to drop, Escape to cancel; moves are announced. Only tasks move by keyboard.

**Rules a change must keep**
1. A task goes on its own role's day only. Dropped on another role's row it lands on its own role's row; a day with no hours for that role refuses it.
2. Nothing may claim iCloud is working; the save row speaks only about this device.
3. No data migration for UI work.
4. Convenience state uses a key that does not start with `spread.`.
5. Select plain values from the store, never objects built in a selector (it re-renders forever).

**Reference lock (2026-10-08):** keep the Crown, Spread/Week/Month semantics, responsibility colors, hour bank and quiet palette. Reject unrelated navigation, extra icon libraries and decorative animation.

## Checklist
- [ ] Only tokens and patterns above; no new color, font or decorative style (else list an exception).
- [ ] Every state written: empty, error, refused drop, undo, offline.
- [ ] Tap and keyboard path for any drag; announcements for moves.
- [ ] Walk Responsibilities, Hours, Week, Tasks end to end; check row reflow when toggling edit mode; Crown arrows, caps, wheel and touch.
- [ ] 390, 820, 1024 wide, light and dark, reduced motion. Automated checks do not replace device checks.

## Read deeper only if needed
- `planner/SPREAD_DESIGN_SYSTEM.md#Patterns`: full wording of any pattern above.
- `planner/SPREAD_DESIGN_SYSTEM.md#Human Interface Guidelines polish`: the 2026-10-08 changes to the Crown, capacity bar, edit mode, Week empty days, Month and global arrows.
- `planner/SPREAD_DESIGN_SYSTEM.md#Verification gates`: what must be verified before release.
- `planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md#4. Feature requirements and explicit pass/fail gates`: why undo, Not today, view memory, rollover and status behave as they do.
