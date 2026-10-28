# Spread icon handoff

All production icons live in `public/icons/`. Prefer these SVGs. Do not invent filenames.

## App icon

| File | Use |
|---|---|
| `app-icon-spread-cards.svg` | Home screen / PWA / landing mark (concept D) |

Placement:
- Landing page mark above the word Spread.
- `public/favicon.svg` may stay the 3-bar mark, or switch to cards.
- Rasterize to `public/__grok/icon-180.png` plus manifest 192 and 512.

## Section 2 — UI action icons (outline, `#007AFF`)

Size: 20×20 next to the label. Stroke icons. Use `currentColor` if you restyle; default is `#007AFF`.

| File | Place it |
|---|---|
| `icon-spread-list.svg` | Spread / Week segmented control — Spread side |
| `icon-week.svg` | Spread / Week segmented control — Week side |
| `icon-add.svg` | “What matters most here?” add-task row; New Life can keep the badge plus |
| `icon-rollover.svg` | Existing `Rollover` text link — prefix the label |
| `icon-backup.svg` | More sheet — Back Up Spread (`.spread` file) |
| `icon-restore.svg` | More sheet — Restore Spread |
| `icon-export.svg` | More sheet — Copy week as text / Save Word |
| `icon-share.svg` | More sheet — share / copy (iOS square-and-arrow-up) |
| `icon-print.svg` | More sheet — Print / Save PDF |
| `icon-photo.svg` | Task sheet tool — Photo |
| `icon-table.svg` | Task sheet tool — Table |
| `icon-outline.svg` | Task sheet tool — Outline |
| `icon-palette.svg` | Tap-a-spread color picker |
| `icon-drag.svg` | Reorder handle while dragging a spread or allocation |
| `icon-check.svg` | Task complete / confirm |
| `icon-edit.svg` | Bottom dock `Edit` |
| `icon-settings.svg` | More sheet — Settings (appearance, log out) |
| `icon-trash.svg` | Delete confirm only. Keep `#FF3B30`. Do not recolor blue |

### UI that may need to be added

1. **More sheet rows with leading icons**
   Backup, Restore, Export, Share, Print, Settings. Same list style as iOS Settings: 20px icon, title, optional chevron.

2. **Task sheet tool strip**
   Notes is the default editor. Add a compact 4-item strip: Outline, Table, Photo, and keep Notes as text or a note glyph. Selecting one switches the task body.

3. **Color picker affordance**
   Tapping the spread color dot already works. Show `icon-palette.svg` in the picker header or as a tiny badge on the dot when editing.

4. **Drag handle**
   During the hold-to-drag delay, fade in `icon-drag.svg` on the leading edge of the row so the gesture is discoverable.

5. **Segmented control icons**
   Optional. Spread / Week can stay text-only. If icons are used, pair `icon-spread-list` + `icon-week` at 16px, hide on very narrow widths.

6. **Rollover confirmation**
   Keep the existing “next week has tasks” confirm. Put `icon-rollover.svg` on the confirm button, not only the text link.

## Section 3 — category badges (filled symbol in a circle)

Size: same as today’s Work / Home / Health dots, about 28–32px.

| File | Default color | Suggested default spread |
|---|---|---|
| `icon-category-work.svg` | `#34C759` | Work |
| `icon-category-school.svg` | `#007AFF` | School |
| `icon-category-home.svg` | `#FF9500` | Home |
| `icon-category-health.svg` | `#30B0C7` | Health (today Health is blue — switching to teal is optional) |
| `icon-category-family.svg` | `#AF52DE` | Family |
| `icon-category-fitness.svg` | `#FFCC00` | Fitness |
| `icon-category-business.svg` | `#5856D6` | Business |
| `icon-category-project.svg` | `#FF9F0A` | Project |
| `icon-category-church.svg` | `#BF5AF2` | Church |
| `icon-category-personal.svg` | `#FF2D55` | Personal |
| `icon-new-life.svg` | `#8E8E93` | New Life row only |

### UI that may need to be added

1. **Category field on a spread**
   Spreads today have name + color only. Add an optional `category` key (`work`, `home`, …). If set, the badge uses that category SVG. If unset, keep the generic 3-line glyph on the user-picked color.

2. **Category picker when creating / renaming**
   New Life flow: name, color, category. Show the 10 badges in a wrap grid. Tapping a badge sets both a suggested color and the symbol. User can still change color after.

3. **Do not bake color into runtime if the user recolors**
   The SVGs include a default circle fill. For a user-picked color, either wrap a white glyph-only version in a CSS circle of the spread color, or replace the SVG circle fill with the spread color at render time.

4. **Health color**
   Live app uses blue for Health. Either keep blue and only swap the glyph to the heart, or move Health to teal `#30B0C7` so Work green / Home orange / Health teal stay distinct from School blue.

## Do not

- Edit `dist-pages` by hand.
- Change gesture or week logic.
- Recolor `icon-trash.svg` to accent blue.
- Use the chat JPEG rasters in production (checkerboard is baked into those files).
