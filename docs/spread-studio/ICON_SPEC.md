# Hand-drawn icon pairs: spec sheet

Source: the owner's boards "Spread | Category icons & illustrations" (primary, all ten app categories plus Custom in one consistent set), "App icons & illustrations", the dark card board (School, Family, Fitness) and the phone mockups. Measurements below are taken from the primary board at its native 1536x1024, where one card cell is about 290x300 px.

An icon pair is two parts that always appear together: a **glyph tile** for recognition and an **illustration** for personality ("Icons for quick recognition. Illustrations for personality.").

## 1. Glyph tile

| Property | Measured on the board | Spec |
|---|---|---|
| Size | 70 px tile in a 290 px card (24%) | Size given by context: 38 px card header, 40 px fan, 32 px day block |
| Shape | corner first touches the top row 15 px in, the 4 px row 7 px in, the 8 px row 3 px in: a circular corner of radius 20 px | Rounded square, radius 29.5% of size (fitted) |
| Fill | median over eight tiles, as brightness x base and share of white: a narrow gloss in the top 8%, about 8% brighter at 20%, flat through the middle, 2.5% darker at 75%, a slight lift at the foot. Left and right columns are equal: the light is vertical, never diagonal | Stops `[offset, gain, white]`: `[0, 1.3, .4] [.08, 1.17, .07] [.2, 1.08, .03] [.32, 1.02, .01] [.6, .985, 0] [.75, .975, 0] [.9, .99, .01] [1, 1.01, .05]`; bottom inner rim white 15% |
| Shadow | straight down, barely any at the sides (2 to 5 levels), tinted with the tile's own hue (the least darkened channel is always the tile's dominant one) | Two layers, blur taller than wide: contact `dy 2, blur 1.5 x 2, 6%` and fall-off `dy 9, blur 3.5 x 6, 12%`, colored the base at 55% brightness |
| Glyph | solid white (252,254,253); its geometric size sqrt(w x h) is about half the tile on every tile, wide or tall | The app's existing category mark in white, centered on its measured ink box and scaled so sqrt(w x h) = 50% of the tile; Custom is a thin plus |
| Color | One flat hue per category | The spread's own color (the person picks it), so the tile always matches the card |

Decision: the boards disagree on glyphs (Work is a laptop on one board, a briefcase on the other). The app's existing marks are kept, so the icon a person already knows stays the same; only the tile treatment changes.

## 2. Illustration

| Property | Observation | Spec |
|---|---|---|
| Medium | Wax crayon and colored pencil on warm paper. Visible strokes, hatching inside fills, white paper showing through, loose dark outlines that overshoot corners | Use the owner's supplied illustrations as the art. Vector code cannot reproduce painted crayon texture to the required similarity; this was tested in the previous pass and scored well short |
| Paper | Warm cream (about 250,244,230) with faint grain, rounded panel, radius about 14 px at 262 px wide (5.3%) | Panel radius 5.5% of width, cropped inside the paper edge so no card background shows |
| Composition | One hero object or scene, a secondary object, foliage framing at the sides, a scribbled ground line, sparkle dashes in yellow | Kept exactly as drawn |
| Palette | Saturated primaries (red, yellow, blue, green), teal and pink accents; hero object often in the category hue | Kept exactly as drawn |
| Aspect | 262 x 182 crop (1.44 : 1) | Every asset is 262 x 182, the same crop box per cell, so they line up as a set |

Changes made to the supplied art, on purpose:
- **Fitness:** the shoes carry a Nike-style swoosh. It is removed (inpainted with the shoe's own color). A third-party trademark does not belong in Spread.
- Nothing else is retouched.

## 3. Pair placement in the app

The dark card board shows the pair on a dark UI: tile in the header, illustration as a paper panel inside the card. Spread's Board cards are saturated gradients, and the paper panel reads on them exactly as it does on the dark glass.

| Where | Tile | Illustration |
|---|---|---|
| Role card (closed strip) | 38 px tile replaces the round badge | Small paper panel at the right of the header, in place of the sparkline |
| Role card (open, front) | same | same panel as the closed strip, so the stack keeps one rhythm |
| Fan, front card | 40 px | Large paper panel at the top right, fading with the card's distance |
| Day block | 32 px | Small paper panel before the hours |
| Settings > View > Icons | preview of both | preview of both |

## 4. Verification method (and how the numbers were made honest)

Each category is checked against its own reference cell before moving to the next:
- **Illustration:** the asset as the browser renders it (screenshot at 2x, scaled back to 262 x 182) against the reference crop, structural similarity (SSIM) on luminance and mean color difference. Target SSIM >= 0.95.
- **Tile:** rendered at 70 px with the reference hue against the reference tile: corner mask overlap (IoU), gradient color profile along a column clear of the glyph (mean color difference), shadow profile, and glyph coverage. Combined score target >= 95%.

Notes on the method, because several first readings were wrong:
- The tile is compared with the reference's own glyph laid onto it ("language" test), so a different glyph drawing is not counted as a tile difference. Score is canonical SSIM (Gaussian window, sigma 1.5) over the tile plus a 6 px band, with a +/-1 px registration search.
- The board images carry generator noise of 6 to 9 levels. A reference scored against a de-noised copy of itself reaches only about 0.97, so a clean vector cannot exceed that. Tile scores are reported raw and as a percentage of that ceiling.
- The tile spec was fitted by coordinate descent over five categories at once (Work, Home, Family, Business, Health), never tuned to one tile.
- Harness bugs found and fixed on the way: glyph images not loading in a blank-origin page, and SVG gradient ids colliding when several tiles shared one page. Both made early scores look worse than they were.

## 5. Scorecard (final code)

| Category | Illustration SSIM | In-app size SSIM | Tile, % of ceiling | Tile color dE | Glyph size me / board |
|---|---|---|---|---|---|
| Work | 0.988 | 0.974 | 98.8 | 2.73 | 0.48 / 0.51 |
| Home | 0.984 | 0.971 | 98.3 | 2.50 | 0.48 / 0.52 |
| Personal | 0.987 | 0.976 | 96.8 | 2.54 | 0.49 / 0.47 |
| Health | 0.986 | 0.972 | 95.0 | 2.44 | 0.49 / 0.50 |
| Fitness | 0.973 | 0.959 | 97.5 | 2.75 | 0.50 / 0.47 |
| Family | 0.985 | 0.968 | 90.8 | 3.07 | 0.48 / 0.52 |
| School | 0.989 | 0.974 | 98.2 | 2.50 | 0.48 / 0.53 |
| Project | 0.985 | 0.971 | 99.2 | 2.51 | 0.48 / 0.54 |
| Church | 0.984 | 0.974 | 95.8 | 2.81 | 0.48 / 0.50 |
| Business | 0.988 | 0.973 | 94.2 | 2.69 | 0.52 / 0.49 |
| Custom | 0.982 | 0.973 | 96.1 | 1.92 | 0.40 / 0.38 |

Glyph sizes: every mark is within 0.05 of its board tile except Project (-0.057); the set averages 0.48 against the board's 0.49. The board draws some glyphs differently from the app (a laptop or a heart where the app has a briefcase or a person), so per-glyph size is a guide; equal visual weight across the set is the rule.

Below target, with the reason:
- **Family tile, 90.8%.** A spec optimized for Family alone reaches only 92.6%; the board's Family tile has rounder corners and a stronger glow than its siblings. The shared spec reaches 98% of what is attainable for it.
- **Business tile, 94.2%.** Optimized alone it reaches 94.5%; the shared spec is at 99.7% of that.
- Everything else is at or above 95%. Illustrations average 0.985 SSIM at reference size and 0.971 at the size they are shown in the app.

## 6. Revision: chalk on dark glass (owner's phone mockup)

The owner asked for the look of the phone mockup and the single Work card instead of paper panels.

- **Cards in Hand-drawn mode** become dark glass (`#131b2c` to `#090d17`) tinted from two corners in the spread's color, with a glowing 1.5 px edge and outer glow in that color. Type is white; the hour count is the role color mixed with white. The open card puts its tasks on a glass inset at the left (`#161d2e`) and the art large at the right, so no text sits on a drawing. Fan and Day cards use the same glass.
- **Illustrations** are the same board art converted to chalk on dark: paper keyed to transparent, dark outlines relit as light chalk through a tone curve, crayon color kept and lifted 18% in chroma, edges feathered so the drawing floats on the card, with a soft glow of the role color behind it. Exported at 1.5x (393 x 273) as RGBA WebP, 411 KB for all eleven.
- Contrast: every card keeps an opaque dark `background-color`, so the audit reads the plate, not the glow. A probe with Hand-drawn on, over all five views in both schemes, finds no violations on any card (only the same six header items it also reports with Default icons when no wallpaper is set, which the real audit sets).
