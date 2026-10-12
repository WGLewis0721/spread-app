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
- **Week strip**: seven day cells in a row, Monday to Sunday (`bg-elevated`, the open day `bg-accent`). Each shows its initial, its date and a 4 px bar of its planned hours in role colours, scaled to the busiest day (at least 8 h). The strip is always on screen, so it is where everything is dropped. Below it, one day at a time: its roles in one card, then **Add to <day>**.
- **Role on a day**: the role's dot is its drag handle (move to another day), its name folds its tasks, a stepper sets its hours. Under its tasks: **Place a task (N)** when that role has tasks waiting, and **Remove from <day>** in `--danger`.
- **Add chips**: tinted pills (`bg-accent/10`, a plus, the role dot, "7h left"). Tap adds an hour to the open day; hold and drag drops it on any day. They suggest rather than hold, so they never look like a day.
- **To place sheet**: a bottom sheet opened from the dock button (inbox icon, accent count badge). It is not modal: the strip stays usable above it. While a task is held it drops to a 7 rem peek with one line ("Drop it here to take it off its day.") and becomes the drop target; it wins over anything it covers.
- **To place is grouped by role**: one row per role ("Health · 11 tasks" with a chevron), because a task only goes on its own role's days. Up to five tasks the groups start open; past that they start folded, and an open group shows six before "Show N more". Every task a person already has starts here, so it must stay short.
- **Task line**: a 44 px grip to drag, the task text, and one text button ("Place" or "Move", "Done" while open), in a plain list with hairline dividers (never a pill per task). Its days open beneath it as a row of small chips ("Fri 1h"), then "Add Health to Thu" when the role is not on the open day yet, then "Back to To place" for a placed task.
- **Drag card**: what follows the finger is a small card (grip, role dot, text) tilted 2°, sized to its text. While a task is held, the days its role is on get a faint accent ring, the others dim, and the day header says where it would land or why not ("Health isn't on Wednesday").
- **Quiet links**: secondary week actions (Rollover, Review open tasks) are accent text links side by side in the summary, not full-width buttons.
- **Not today**: only on a task placed on today. Other placed tasks show their day as a small tag; Move in Week takes them off.
- **Drop highlight**: the day under the pointer grows slightly with a 2 px `--accent` outline. Refused drops explain themselves in a toast instead of doing something else.
- **Status row**: a title, one quiet line of detail, `role="status"`. Problem state uses `--danger` on the title.
- **Today**: the word "Today" in `--accent` beside the day name, with `aria-current="date"`.
- **Spread/Week segmented tabs**: the selected tab is the Tab-stop; Left/Right or Home/End moves focus and changes the view. Each tab names the current panel. The global week-navigation keys yield when a control has focus.

## Motion

Existing classes only (`descend-in`, `ascend-out`, `cascade`, `week-seq`). Reduced motion removes movement; nothing depends on it. Haptics are one light tap on completing a task, on the iPhone app only.

## Moving things without dragging

Every drag has a tap equivalent and a keyboard equivalent:

- a task: **Place** / **Move** lists the days its role is on (and offers to add the role to the open day); **Back to To place** and **Not today** put it back
- a role on a day: tap a day in the strip, then tap an **Add** chip; the stepper changes its hours, **Remove from <day>** takes it off
- keyboard: left and right arrows walk the strip. Focus a task's grip, Space to pick up, arrow keys to step day by day through the strip and then to the To place sheet, Space to drop, Escape to cancel; the moves are announced. Only tasks are moved by keyboard: spreads and day cells keep Enter and Space for their own actions (select, add)

## Rules a change must keep

1. A task goes on a day for its **own role** only. Dropped anywhere on a day (even on another role's row) it lands on its role's row there; a day where that role has no hours refuses it, never invents one.
2. Nothing the planner shows may claim iCloud is working. The save row speaks only about this device. iCloud rows appear only when their feature flag is on.
3. Stored planner data is not migrated for UI work. New UI reads existing fields.
4. Convenience state (last view) lives under a key that does not start with `spread.`, so backups never treat it as planner data.
5. Select plain values from the store (strings, numbers, ids), never objects built in the selector: a new object on every read re-renders forever and takes the whole planner down.
6. One pointer sensor per drag surface. dnd-kit keeps one handler per event name, so a second sensor on pointer down silently replaces the first; mouse versus touch is decided inside the sensor from the pointer type (`SpreadPointerSensor`).

## Human Interface Guidelines polish — 2026-10-08

Applies to the **planner** only. The landing page remains governed by `DESIGN.md`, and no new palette, typeface, component framework, or storage mechanism is introduced.

| Surface | Refinement | Reason |
| --- | --- | --- |
| Crown | Existing metallic wheel remains; focused arrow-key navigation plus 44 px previous/next targets; interaction hint dismisses after first successful turn | Recognizable design with discoverable, non-gesture navigation and progressively quieter chrome |
| Spread summary | Segmented responsibility-hours bar is now a set of labeled controls that scroll/focus the corresponding responsibility | Color has a usable, named interaction rather than remaining a legend the user must interpret |
| Responsibility editing | Edit mode reveals a labeled Remove action below each responsibility while keeping the header (including its collapse chevron) in place | Stable geometry; destructive action remains explicitly labeled and requires the existing removal dialog |
| Week day cards | Since replaced by the week strip (see Patterns): only the open day shows below the strip, and an empty one says so once | Less visual repetition; every day cell keeps a spoken label with its planned hours |
| Month | Today marker uses the existing accent and on-accent tokens; spoken labels identify Today and task-free days | Selected/current date clearer in both appearances; no meaning conveyed only through a color dot |
| Global arrows | Header-wide week navigation yields to focused controls and the crown's own keyboard handling | Respects keyboard expectations and prevents double navigation |

### Reference decisions

**Primary authority:** current Spread screenshots, `src/styles.css`, the frozen golden version, and the [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) (interaction affordance, focus, layout, accessibility and progressive disclosure).

**Supplemental patterns only:**

- [Refero / Linear changelog](https://linear.app/changelog) — calm dark-surface hierarchy and restrained control contrast; **do not** import Linear's colors, typography, or brand treatment.
- [Refero / Cron calendar screen](https://refero.design/screens/13c5824c-344e-46c2-ade9-16931dfd69a4) — date-selection hierarchy; not a replacement calendar.
- [Refero / Exoplan drag workflow](https://refero.design/flows/7349) — direct manipulation and visible drop guidance; existing Spread drag and Undo are preserved.
- [Refero / Daylish rescheduling flow](https://refero.design/flows/8014) — clear change/confirmation feedback; avoid extra steps for simple moves.
- [21st.dev calendar components](https://21st.dev) — implementation patterns and state variants, not runtime dependencies; individual licensing must be reviewed before copying code.
- [Pinterest weekly planner search](https://www.pinterest.com/search/pins/?q=minimal%20weekly%20planner%20app%20ui) — spacing inspiration only, not licensed product assets.

**Reference lock:** Keep the crown, Spread/Week/Month semantics, responsibility colors, hour bank, round surfaces, and the quiet palette. Reject unrelated navigation, invented brand colors, extra icon libraries, and decorative animation.

### Verification gates

Before the refinements are accepted for release, verify the full Responsibilities → Hours → Week → Tasks path; watch for unexpected row reflow when changing edit mode; exercise crown arrows, caps, wheel and touch; confirm accessibility of capacity-bar actions and Today labels; inspect 390/820/1024 px in both modes with Reduce Motion.

Automated typecheck/lint/CI are necessary but **not substitutes for device and visual checks**. Existing PR #49 core-planner improvements are not redesigned here. iCloud and native release gates are unchanged.
