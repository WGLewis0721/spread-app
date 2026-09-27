# Spread icon handoff

Drop these files into the repo and wire them as specified. Do not invent new names.

Source folder in repo: `public/icons/`

| File | Kind | Use |
|---|---|---|
| `app-icon-spread-cards.svg` | App icon (concept D, glyph +20%) | PWA / home screen / landing mark |
| `icon-settings.svg` | Action, outline, `#007AFF` | Settings row in More / Edit sheet |
| `icon-edit.svg` | Action, outline, `#007AFF` | Existing `Edit` control |
| `icon-share.svg` | Action, outline, `#007AFF` | Copy week / export / share |
| `icon-trash.svg` | Action, outline, `#FF3B30` | Delete spread or task |
| `icon-new-life.svg` | Badge, gray circle + plus | `New Life` row |

Also generated as 1024 PNG (transparent) next to the SVGs if present: same basename, `.png`.

## Where to put them

1. App icon
   - Replace `public/favicon.svg` with `app-icon-spread-cards.svg` (or keep favicon as the 3-bar mark and use the cards mark only for apple-touch / PWA).
   - Copy / rasterize to `public/__grok/icon-180.png` (180×180) and any manifest icons (`192`, `512`).
   - Landing page mark above the word **Spread** currently uses a 3-line list in a gray squircle. Swap that mark for `app-icon-spread-cards.svg` so the marketing icon matches the home-screen icon.

2. Edit button
   - Bottom dock `Edit` control. Prefix the label with `icon-edit.svg` at 20×20, `currentColor` `#007AFF`.

3. Settings
   - Add to the `…` / More sheet (same sheet as Rollover, backup, restore, export, print).
   - `icon-settings.svg` 20×20 next to the word Settings.

4. Share
   - More sheet actions that copy / export / share the week.
   - `icon-share.svg` 20×20. This is the iOS square-and-arrow-up.

5. Trash
   - Edit mode already shows red minus circles. Use `icon-trash.svg` for destructive confirm (delete a spread, delete a task).
   - Keep color `#FF3B30` (`--danger`). Do not recolor to accent blue.

6. New Life
   - Replace the gray `+` circle on the **New Life** row with `icon-new-life.svg`.
   - Same size as Work / Home / Health badges (~28–32px).

## Style rules

- Actions: outline, 2px rounded stroke, no fill, transparent background.
- App icon and New Life: filled.
- Accent `#007AFF`. Danger `#FF3B30`. New Life badge `#8E8E93`.
- At 20px, prefer the SVG. Do not scale a screenshot of the checkerboard JPEG.

## Do not

- Do not put icons in `dist-pages`.
- Do not replace Work / Home / Health glyphs in this pass unless asked.
- Do not change gesture or week logic.
