# Spread design system (planner)

This is the one place the planner's visual rules live. `DESIGN.md` covers the landing page only.
The planner has no brand board of its own: it uses the tokens in `src/styles.css` and the patterns below.
**Do not add colors, fonts or decorative styles.** Use a token, or reuse a pattern.

## Tokens

Defined once in `src/styles.css`, with light, dark and (where needed) reduced-motion values.

| Token | Use |
| --- | --- |
| `--canvas` | the page, and rows that sit on a card |
| `--elevated` | cards and sheets |
| `--ink`, `--secondary`, `--tertiary` | text, from strongest to quietest. Tertiary is also the "no role colour" fallback dot |
| `--line`, `--fill` | hairlines and quiet buttons |
| `--accent`, `--on-accent` | the one interactive colour: links, primary buttons, the Today marker, drop highlight |
| `--danger`, `--on-danger` | destructive actions and save failures |
| `--caution` | warnings that are not failures |
| `--scrim`, `--shadow` | behind sheets, under floating things |
| role colours (`ROLE_COLORS`) | only the dot that says which role something belongs to |

Status is never colour alone: every state also has words.

## Patterns

- **Card**: `rounded-3xl bg-elevated`, content rows `rounded-2xl bg-canvas`. Touch targets are at least 44 px.
- **Sheet**: Radix Dialog with the `sheet` class and a Grabber. Used for "More", new spread and Open tasks.
- **Dialog**: Radix AlertDialog for questions that need a yes or no.
- **Toast and Undo**: one themed toast. Anything the person did with a drag, a tap on a day or "Not today" offers Undo through `showUndoToast` (`src/spread/ui/undo-toast.tsx`) for six seconds. Only the latest change shows Undo. It runs if that week is exactly as the change left it, even after turning to another week; otherwise it says so and changes nothing.
- **Compact task chip**: a 44 px handle (role dot), the task text, and one text button ("Place" or "Move to"). Used in To place (on `--canvas`, like the Free time rows) and inside a day's role row (on `--elevated`). To place shows three tasks and folds the rest behind "Show N more": every task a person already has starts there.
- **Three kinds of thing in Week, three looks**: days are solid cards (`bg-elevated`); **To place** is a dashed tray (`border-dashed`, no fill: it holds what has no day yet and is the drop target to take a task off its day; one line when empty); **Free time** is a row of tinted suggestion chips (`bg-accent/10`, accent text, a plus), not a card, because it suggests rather than holds. Nothing that is not a day may look like a day.
- **Tasks on a day fold**: a role row on a day shows "N tasks" with a chevron under its name; its tasks open below it only when tapped, so a busy week stays scannable.
- **Quiet links**: secondary week actions (Rollover, Review open tasks) are accent text links side by side in the summary, not full-width buttons.
- **Not today**: only on a task placed on today. Other placed tasks show their day as a small tag; Move to in Week takes them off.
- **Drop highlight**: a 2 px `--accent` outline on the target. Refused drops explain themselves in a toast instead of doing something else.
- **Status row**: a title, one quiet line of detail, `role="status"`. Problem state uses `--danger` on the title.
- **Today**: the word "Today" in `--accent` beside the day name, with `aria-current="date"`.

## Motion

Existing classes only (`descend-in`, `ascend-out`, `cascade`, `week-seq`). Reduced motion removes movement; nothing depends on it. Haptics are one light tap on completing a task, on the iPhone app only.

## Moving things without dragging

Every drag has a tap equivalent and a keyboard equivalent:

- a task: **Place** / **Move to** lists the days its role is on; **Take off this day** and **Not today** put it back in To place
- a role on a day: tap the role, then **Add**; or tap a Free time suggestion
- keyboard: focus a task's handle, Space to pick up, arrow keys to step to the next day or the tray, Space to drop, Escape to cancel; the moves are announced. Only tasks are moved by keyboard: spreads and day rows keep Enter and Space for their own actions (select, add)

## Rules a change must keep

1. A task goes on a day for its **own role** only. Dropped anywhere on a day (even on another role's row) it lands on its role's row there; a day where that role has no hours refuses it, never invents one.
2. Nothing the planner shows may claim iCloud is working. The save row speaks only about this device. iCloud rows appear only when their feature flag is on.
3. Stored planner data is not migrated for UI work. New UI reads existing fields.
4. Convenience state (last view) lives under a key that does not start with `spread.`, so backups never treat it as planner data.
5. Select plain values from the store (strings, numbers, ids), never objects built in the selector: a new object on every read re-renders forever and takes the whole planner down.
