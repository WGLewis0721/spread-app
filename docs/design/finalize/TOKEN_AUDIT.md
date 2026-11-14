# Native token audit (input for wave 2)

> Summary: Every hardcoded colour, font size, spacing value, touch-target size, corner radius and animation duration in the native SwiftUI files outside lane A, with file, line and the `Spread` token that should replace it. Wave 2 works from this list. Theme, Shell and Chalk already use tokens. `Layouts/` was deleted in this PR (OD14).

> Part of the [Spread design brain](../README.md). Scope: `ios/SpreadNativeV2/Sources/SpreadNativeV2/` (except `Theme/`, `Shell/`, `Chalk/`), `ios/App/SpreadWidget/` and `ios/App/App/*.swift`. Excluded: `Tests/`, `Resources/`, and `ios/App/App/Cloud` and `ios/App/SpreadCloudCore`, which are outside the design rules.

Recorded 2026-11-14 on branch `claude/finalize-a-design-system`. Line numbers will drift as other lanes merge. Before editing a file, rerun the search in section 1 for that file.

## 1. How to read this list

- **Tokens:** names are in `ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift` (`enum Spread`, `SpreadMotion`, `SpreadTactile`). This page gives names only. Values live in that file.
- **Replace:** a token exists with the same value. Mechanical change, no visual difference.
- **Snap:** the value is off the 4-point grid or off the named durations. The nearest token changes it by the amount shown. Snaps are visual decisions and need a device check.
- **Keep:** layout geometry (for example a 62 pt top offset), not spacing.
- **Allowed:** role colour from data (`Color(hex: role.color)`) or stored artwork colour. These stay.
- **Decide:** no token exists yet, or the source cannot use tokens (see section 3).
- **Touch target:** a 44 pt frame. It uses `Spread.minimumTarget`, not a spacing token.

Find the remaining literals in a file:

```
rg -n 'Color\(hex6:|Color\(red:|Color\(hex: "|\.white|\.black|\.system\(size:|\.padding\(|spacing: *[0-9]|duration:|cornerRadius: *[0-9]' <file>
```

## 2. Totals

| Category | Replace | Snap | Keep | Decide | Allowed | Total |
|---|---:|---:|---:|---:|---:|---:|
| Colour | 39 | 0 | 0 | 1 | 39 | 79 |
| Font size | 1 | 0 | 0 | 10 | 0 | 11 |
| Spacing | 264 | 181 | 3 | 0 | 0 | 448 |
| Touch target | 144 | 0 | 0 | 0 | 0 | 144 |
| Motion | 0 | 3 | 0 | 1 | 0 | 4 |
| Radius | 17 | 0 | 0 | 27 | 0 | 44 |
| **All** | **465** | **184** | **3** | **39** | **39** | **730** |

Files scanned: 70 (sources outside lane A, the widget target and the app host). With at least one literal: 26. With none: 44 (listed in section 5).

## 3. Blockers and decisions for wave 2

1. **The widget cannot use `Spread` tokens yet.** `ios/App/SpreadWidget/*.swift` compiles only `Widget/SpreadWidgetShared.swift` from the app sources. `Theme/SpreadTheme.swift` is not in the SpreadWidget target, so every `(widget)` row is blocked. Options: add the theme file to the target (a project change, outside lane A; needs owner or lane E approval), or move a token subset into `SpreadWidgetShared.swift`.
2. **Dormant layouts deleted (OD14).** `Layouts/SpreadLayouts.swift` had no call sites and is removed in this PR. `DialGeometry.swift` stays, because the native contract tests use it.
3. **Springs have no token.** Any `.spring(response:dampingFraction:)` left in the rows is a Decide row. Decide: use `SpreadTactile.settle`, or add a named spring.
4. **Corner radius 20 and 22 have no token.** The scale is 14 (`radiusControl`), 16 (`radiusRow`), 24 (`radiusCard`) and 28 (`radiusSheet`). Decide whether to add a tile radius of 20 or snap these.
5. **Off-grid spacing** (2, 3, 5, 6, 10, 14, 18, 28 and similar) is listed with its nearest step. Snapping moves layout by 1 to 4 pt, so do it in a visual pass with device checks, not in a token-only pass.
6. **Artwork stays.** The Chalk effect colours in `Chalk/ChalkEffects.swift` and the per-effect glow colours in its table are authored illustration data. `ChalkTiming.phase(duration:)` loop lengths are authored artwork timing. Neither is listed here.
7. **Font sizes.** Only 11 literal `.system(size:)` calls remain outside lane A. Dynamic Type makes them scale with the user's setting, so check each at accessibility sizes. Mapping: 9 to 11 pt to `caption2` (no token), 12 to `Spread.caption`, 13 to `Spread.footnote`, 14 to 15 to `Spread.callout`, 16 to `Spread.headline`, 17 to `Spread.body`, 18 to 21 and 23 to 28 to SwiftUI `title3` or `title` (no token), 22 to `Spread.sheetTitle`, 29 to 34 to `Spread.title`.
8. **Colour fallbacks.** `Color(hex: x ?? "#8E8E93")` should become `Spread.roleFallback`. `Color(hex:)` already returns that grey for a bad string, so the two are equivalent.
9. **Glints, shadows and tile glyphs.** `.white` and `.black` are not tokens. Use `Spread.highlight` for glints, `Spread.onAccent` for text on filled controls, `Spread.tileGlyph` and `Spread.tileGlyphOnBright` for glyphs on role tiles, and `Spread.shadow` or `Spread.scrim` for dark overlays. Choose by use, because these are different roles.

10. **Owner decisions applied in this PR** (plan section 8, the OD items in lane A): OD4 keeps `success` as it is. OD5 removes the Gray Matter alias tokens; the UI kit maps the names in one line. OD7 changes the role-deletion confirmation to say responsibility. OD14 deletes the dormant layouts. OD15 makes `chalkInk` share the light secondary ink, including its Increase Contrast variant.
## 4. Per-file list

Rows are in file order. The code excerpt is trimmed to about 110 characters.

### Focus/SpreadFocusTimerSheet.swift (13 rows: Replace 12, Snap 1)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 43 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 64 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Replace |
| 84 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 89 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 103 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 111 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 121 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 130 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 140 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Replace |
| 163 | Spacing | `.padding(.vertical, 16)` | Spread.space4 | Replace |
| 213 | Spacing | `.padding(.vertical, 12)` | Spread.space3 | Replace |
| 256 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 343 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |

### Life/LifeEditorialCard.swift (24 rows: Decide 5, Replace 12, Snap 7)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 63 | Colour | `Color(red: 0.10, green: 0.13, blue: 0.15)` | Spread.tileGlyphOnBright (RGB distance 6) | Replace |
| 78 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 79 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 80 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 86 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 123 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 132 | Colour | `Color.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |
| 133 | Spacing | `.padding(.horizontal, 17)` | Spread.space4 (-1 pt) or keep off-grid | Snap |
| 134 | Spacing | `.padding(.top, 13)` | Spread.space3 (-1 pt) or keep off-grid | Snap |
| 135 | Spacing | `.padding(.bottom, 28)` | Spread.space8 (+4 pt) or keep off-grid | Snap |
| 155 | Spacing | `spacing: 7` | Spread.space2 (+1 pt) or keep off-grid | Snap |
| 158 | Font size | `.system(size: 11` | caption2 (Dynamic Type) | Decide |
| 178 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 184 | Font size | `.system(size: 10` | caption2 (Dynamic Type) | Decide |
| 216 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 219 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 221 | Font size | `.system(size: 9` | caption2 (Dynamic Type) | Decide |
| 225 | Font size | `.system(size: 10` | caption2 (Dynamic Type) | Decide |
| 231 | Spacing | `.padding(.vertical, 6)` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 233 | Colour | `Color.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |
| 233 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 234 | Radius | `cornerRadius: 7` | no radius token for 7 (snap to 16 or 24, or add one) | Decide |
| 236 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 236 | Colour | `Color.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |

### Life/LifeHoursView.swift (27 rows: Allowed 6, Replace 19, Snap 2)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 94 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 96 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 104 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 120 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 129 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 138 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 142 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 143 | Spacing | `.padding(20)` | Spread.space5 | Replace |
| 180 | Colour | `Color(hex: segment.color)` | role or artwork data (stored colour) | Allowed |
| 185 | Colour | `Color(hex: segment.color)` | role or artwork data (stored colour) | Allowed |
| 187 | Colour | `Color(hex: segment.color)` | role or artwork data (stored colour) | Allowed |
| 212 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 286 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 294 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 296 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 297 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 298 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 309 | Spacing | `.padding(.vertical, 8)` | Spread.space2 | Replace |
| 314 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 320 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 324 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 329 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 342 | Spacing | `.padding(16)` | Spread.space4 | Replace |
| 348 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 354 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 368 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 380 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |

### Life/LifeManagementSheets.swift (13 rows: Decide 2, Replace 11)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 60 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 66 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 67 | Radius | `cornerRadius: 10` | no radius token for 10 (snap to 16 or 24, or add one) | Decide |
| 74 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 77 | Colour | `Color(hex: hex)` | check: non-literal colour source | Decide |
| 77 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 156 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 171 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 172 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 173 | Spacing | `.padding(24)` | Spread.space6 | Replace |
| 188 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 211 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 214 | Spacing | `.padding(20)` | Spread.space5 | Replace |

### Life/LifePlanAheadSheet.swift (11 rows: Replace 9, Snap 2)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 72 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 130 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 137 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 252 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 266 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 312 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 323 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 338 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 385 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 408 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 433 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |

### Life/LifeRoot.swift (86 rows: Allowed 1, Decide 3, Replace 61, Snap 21)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 73 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 82 | Spacing | `spacing: 20` | Spread.space5 | Replace |
| 86 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 91 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 103 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 103 | Spacing | `.padding(.top, 8)` | Spread.space2 | Replace |
| 103 | Spacing | `.padding(.bottom, 28)` | Spread.space8 (+4 pt) or keep off-grid | Snap |
| 217 | Motion | `duration: 0.12` | SpreadMotion.fastSeconds (+0.04 s) or keep | Snap |
| 222 | Motion | `duration: 0.12` | SpreadMotion.fastSeconds (+0.04 s) or keep | Snap |
| 226 | Motion | `duration: 0.12` | SpreadMotion.fastSeconds (+0.04 s) or keep | Snap |
| 250 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 255 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 261 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 262 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 268 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 271 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 271 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Replace |
| 281 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 282 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 283 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 294 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 308 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 323 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 328 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 341 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 350 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 357 | Spacing | `.padding(.top, 12)` | Spread.space3 | Replace |
| 364 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 373 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 387 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 442 | Spacing | `spacing: 14` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 477 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 482 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 483 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 495 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 503 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 518 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 543 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 568 | Spacing | `.padding(16)` | Spread.space4 | Replace |
| 620 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 626 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 626 | Spacing | `.padding(.vertical, 6)` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 628 | Radius | `cornerRadius: 18` | no radius token for 18 (snap to 16 or 24, or add one) | Decide |
| 632 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 633 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 642 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 643 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 655 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 665 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 672 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 693 | Spacing | `.padding(16)` | Spread.space4 | Replace |
| 713 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 713 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Replace |
| 723 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 731 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 743 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 744 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 755 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 759 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 765 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 766 | Spacing | `.padding(.vertical, 8)` | Spread.space2 | Replace |
| 772 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 777 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 790 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 799 | Spacing | `.padding(3)` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 812 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 815 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 828 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 829 | Radius | `cornerRadius: 14` | Spread.radiusControl | Replace |
| 841 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 846 | Spacing | `spacing: 18` | Spread.space5 (+2 pt) or keep off-grid | Snap |
| 860 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 870 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 871 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 872 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 873 | Spacing | `.padding(20)` | Spread.space5 | Replace |
| 880 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 889 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 889 | Spacing | `.padding(.vertical, 8)` | Spread.space2 | Replace |
| 893 | Colour | `.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 907 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 1052 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 1061 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 1091 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 1098 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 1099 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |

### Life/LifeWalletStack.swift (22 rows: Allowed 2, Decide 2, Replace 15, Snap 3)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 62 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 65 | Colour | `Color.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |
| 70 | Spacing | `.padding(6)` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 71 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 72 | Spacing | `.padding(.trailing, 5)` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 80 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 250 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 258 | Radius | `cornerRadius: 24` | Spread.radiusCard | Replace |
| 259 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 259 | Radius | `cornerRadius: 23` | no radius token for 23 (snap to 16 or 24, or add one) | Decide |
| 274 | Radius | `cornerRadius: 24` | Spread.radiusCard | Replace |
| 294 | Spacing | `.padding(.vertical, 16)` | Spread.space4 | Replace |
| 308 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 316 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 356 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 366 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 372 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 389 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 423 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 426 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 435 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 442 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |

### Life/LifeWeekView.swift (28 rows: Allowed 4, Decide 1, Replace 13, Snap 10)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 33 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 36 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 55 | Spacing | `spacing: 14` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 64 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 65 | Radius | `cornerRadius: 18` | no radius token for 18 (snap to 16 or 24, or add one) | Decide |
| 66 | Spacing | `.padding(18)` | Spread.space5 (+2 pt) or keep off-grid | Snap |
| 134 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 136 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 141 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 172 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 174 | Spacing | `.padding(12)` | Spread.space3 | Replace |
| 188 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 191 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 202 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 209 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 211 | Colour | `Color(hex: color)` | role or artwork data (stored colour) | Allowed |
| 227 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 233 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 243 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 244 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 256 | Spacing | `.padding(12)` | Spread.space3 | Replace |
| 266 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 276 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 278 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 279 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 280 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 289 | Spacing | `.padding(.vertical, 8)` | Spread.space2 | Replace |
| 295 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |

### Life/LifeWeeklyTimeBudget.swift (23 rows: Allowed 1, Replace 13, Snap 9)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 36 | Spacing | `.padding(.horizontal, compact ? 12 : 16)` | Spread.space3 | Replace |
| 36 | Spacing | `.padding(.horizontal, compact ? 12 : 16)` | Spread.space4 | Replace |
| 37 | Spacing | `.padding(.vertical, 12)` | Spread.space3 | Replace |
| 47 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 52 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 66 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 77 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 86 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 96 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 97 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 98 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 105 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 120 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 131 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 136 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 142 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 160 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 161 | Colour | `.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |
| 170 | Spacing | `.padding(.horizontal, 2)` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 190 | Spacing | `.padding(.horizontal, 2)` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 283 | Colour | `.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |
| 291 | Colour | `.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 291 | Colour | `.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |

### Sheets/BackupRestoreSheet.swift (20 rows: Replace 7, Snap 13)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 23 | Spacing | `spacing: 22` | Spread.space6 (+2 pt) or keep off-grid | Snap |
| 67 | Spacing | `.padding(20)` | Spread.space5 | Replace |
| 88 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 100 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 110 | Spacing | `.padding(14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 112 | Radius | `cornerRadius: 16` | Spread.radiusRow | Replace |
| 136 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 179 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 198 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 222 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 227 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 229 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 237 | Spacing | `.padding(14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 238 | Radius | `cornerRadius: 16` | Spread.radiusRow | Replace |
| 247 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 249 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 252 | Spacing | `.padding(.horizontal, 8)` | Spread.space2 | Replace |
| 253 | Spacing | `.padding(.vertical, 3)` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 255 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 303 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |

### Sheets/ManageSheets.swift (60 rows: Allowed 1, Decide 2, Replace 37, Snap 20)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 26 | Spacing | `spacing: 14` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 36 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 41 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 56 | Spacing | `.padding(20)` | Spread.space5 | Replace |
| 75 | Colour | `Color(hex: colorHex)` | role or artwork data (stored colour) | Allowed |
| 76 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 77 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 79 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 83 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 83 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 84 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 85 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 99 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 99 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 104 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 105 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 105 | Radius | `cornerRadius: 14` | Spread.radiusControl | Replace |
| 114 | Spacing | `.padding(14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 299 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 308 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 330 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 369 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 378 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 387 | Spacing | `.padding(.vertical, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 389 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 411 | Spacing | `.padding(.vertical, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 413 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 418 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 525 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 539 | Spacing | `.padding(.horizontal, 5)` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 558 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 567 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 570 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 571 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 579 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 590 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 604 | Spacing | `.padding(6)` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 610 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 616 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 625 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 632 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 636 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 645 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 653 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 655 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 667 | Touch target | `.frame(minWidth: 64, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 674 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 679 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 681 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 696 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 698 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 707 | Spacing | `.padding(.horizontal, 8)` | Spread.space2 | Replace |
| 718 | Spacing | `.padding(.horizontal, 8)` | Spread.space2 | Replace |
| 725 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 730 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 736 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 757 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 770 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 771 | Spacing | `.padding(.top, 8)` | Spread.space2 | Replace |
| 772 | Spacing | `.padding(.bottom, 16)` | Spread.space4 | Replace |

### Sheets/RecentlyDeletedSheet.swift (13 rows: Replace 9, Snap 4)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 20 | Spacing | `spacing: 14` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 27 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 32 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 49 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 55 | Spacing | `.padding(.leading, 12)` | Spread.space3 | Replace |
| 64 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 66 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 91 | Spacing | `.padding(16)` | Spread.space4 | Replace |
| 122 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 129 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 134 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 146 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 150 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |

### Sheets/TaskSheet.swift (36 rows: Allowed 1, Decide 1, Replace 23, Snap 11)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 64 | Spacing | `spacing: 20` | Spread.space5 | Replace |
| 68 | Spacing | `.padding(.vertical, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 77 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 106 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 113 | Spacing | `.padding(.top, 8)` | Spread.space2 | Replace |
| 116 | Spacing | `.padding(20)` | Spread.space5 | Replace |
| 178 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 185 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 192 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 193 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 194 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 215 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 217 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 225 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 231 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 231 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 238 | Spacing | `.padding(14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 240 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 420 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 423 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 448 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 502 | Spacing | `.padding(8)` | Spread.space2 | Replace |
| 510 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 535 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 538 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 554 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 587 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 590 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 608 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 649 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 674 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 678 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 693 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 695 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 702 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 702 | Spacing | `.padding(.vertical, 12)` | Spread.space3 | Replace |

### Sheets/WhatsNewSheet.swift (10 rows: Decide 1, Replace 6, Snap 3)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 21 | Spacing | `spacing: 20` | Spread.space5 | Replace |
| 22 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 24 | Font size | `.system(size: 28` | SwiftUI .title (Dynamic Type) | Decide |
| 27 | Radius | `cornerRadius: 16` | Spread.radiusRow | Replace |
| 37 | Spacing | `.padding(.bottom, 4)` | Spread.space1 | Replace |
| 53 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 60 | Spacing | `.padding(20)` | Spread.space5 | Replace |
| 81 | Spacing | `spacing: 14` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 96 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 110 | Spacing | `.padding(18)` | Spread.space5 (+2 pt) or keep off-grid | Snap |

### Spread/ResponsibilitySidebar.swift (11 rows: Allowed 3, Decide 2, Replace 4, Snap 2)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 22 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 23 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 33 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 36 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 39 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 57 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 58 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 72 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 82 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 90 | Spacing | `.padding(4)` | Spread.space1 | Replace |
| 91 | Radius | `cornerRadius: 18` | no radius token for 18 (snap to 16 or 24, or add one) | Decide |

### Spread/SpreadSurface.swift (96 rows: Allowed 9, Decide 5, Keep 3, Replace 52, Snap 27)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 29 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 34 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 35 | Spacing | `.padding(.top, 8)` | Spread.space2 | Replace |
| 88 | Spacing | `.padding(.vertical, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 93 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 94 | Spacing | `.padding(.vertical, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 104 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 106 | Radius | `cornerRadius: 13` | no radius token for 13 (snap to 16 or 24, or add one) | Decide |
| 111 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 123 | Spacing | `spacing: 9` | Spread.space2 (-1 pt) or keep off-grid | Snap |
| 125 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 133 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 148 | Touch target | `.frame(width: 20, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 155 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 157 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 178 | Touch target | `.frame(width: 20, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 194 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 205 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 217 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 224 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 226 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 227 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 241 | Touch target | `.frame(height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 256 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 258 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 263 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 263 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 274 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 274 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 300 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 302 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 308 | Spacing | `.padding(16)` | Spread.space4 | Replace |
| 390 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 407 | Spacing | `.padding(.trailing, 16)` | Spread.space4 | Replace |
| 446 | Spacing | `spacing: 7` | Spread.space2 (+1 pt) or keep off-grid | Snap |
| 458 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 466 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 472 | Touch target | `.frame(minWidth: 0, maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 489 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 518 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 531 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 540 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 541 | Spacing | `.padding(.vertical, 12)` | Spread.space3 | Replace |
| 561 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 584 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 587 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 588 | Spacing | `.padding(.bottom, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 597 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 598 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 612 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 613 | Spacing | `.padding(.bottom, 8)` | Spread.space2 | Replace |
| 634 | Radius | `cornerRadius: 18` | no radius token for 18 (snap to 16 or 24, or add one) | Decide |
| 635 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 636 | Spacing | `.padding(.bottom, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 665 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 675 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 700 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 702 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 707 | Colour | `Color(hex: color)` | role or artwork data (stored colour) | Allowed |
| 708 | Spacing | `.padding(-4)` | Spread.space1 | Replace |
| 709 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 719 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 719 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 726 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 736 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 737 | Spacing | `.padding(.vertical, 12)` | Spread.space3 | Replace |
| 784 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 810 | Spacing | `.padding(.leading, 4)` | Spread.space1 | Replace |
| 810 | Spacing | `.padding(.trailing, 12)` | Spread.space3 | Replace |
| 818 | Spacing | `.padding(.leading, 12)` | Spread.space3 | Replace |
| 820 | Spacing | `.padding(.leading, 56)` | keep: layout geometry, not spacing | Keep |
| 844 | Spacing | `.padding(.leading, 56)` | keep: layout geometry, not spacing | Keep |
| 844 | Spacing | `.padding(.top, 12)` | Spread.space3 | Replace |
| 862 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 862 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 871 | Spacing | `.padding(.leading, 12)` | Spread.space3 | Replace |
| 872 | Spacing | `.padding(.leading, 56)` | keep: layout geometry, not spacing | Keep |
| 935 | Spacing | `.padding(.bottom, 36)` | Spread.space10 (+4 pt) or keep off-grid | Snap |
| 985 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 1015 | Spacing | `.padding(.top, 12)` | Spread.space3 | Replace |
| 1016 | Radius | `cornerRadius: 24` | Spread.radiusCard | Replace |
| 1031 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 1032 | Radius | `cornerRadius: 24` | Spread.radiusCard | Replace |
| 1035 | Radius | `cornerRadius: 24` | Spread.radiusCard | Replace |
| 1042 | Radius | `cornerRadius: 24` | Spread.radiusCard | Replace |
| 1044 | Radius | `cornerRadius: 24` | Spread.radiusCard | Replace |
| 1045 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 1049 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 1050 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 1073 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 1085 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 1092 | Spacing | `.padding(.horizontal, 6)` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 1095 | Radius | `cornerRadius: 15` | no radius token for 15 (snap to 16 or 24, or add one) | Decide |
| 1098 | Radius | `cornerRadius: 15` | no radius token for 15 (snap to 16 or 24, or add one) | Decide |
| 1197 | Radius | `cornerRadius: 24` | Spread.radiusCard | Replace |
| 1215 | Motion | `duration: 1.3 * SpreadTactile.emphasis` | loop cycle or scaled duration: no token (decide) | Decide |

### Week/MonthQuickAddSheet.swift (5 rows: Decide 1, Replace 3, Snap 1)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 22 | Spacing | `spacing: 14` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 23 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 37 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 39 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 59 | Spacing | `.padding(16)` | Spread.space4 | Replace |

### Week/MonthSurface.swift (12 rows: Allowed 1, Replace 8, Snap 3)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 62 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 63 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 72 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 78 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 79 | Spacing | `.padding(.top, 16)` | Spread.space4 | Replace |
| 145 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 153 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 155 | Colour | `Color(hex: color)` | role or artwork data (stored colour) | Allowed |
| 171 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Replace |
| 172 | Radius | `cornerRadius: 16` | Spread.radiusRow | Replace |
| 175 | Radius | `cornerRadius: 16` | Spread.radiusRow | Replace |
| 178 | Radius | `cornerRadius: 16` | Spread.radiusRow | Replace |

### Week/OverdueSelectionTray.swift (20 rows: Decide 3, Replace 11, Snap 6)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 26 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 34 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 38 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 39 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 52 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 55 | Touch target | `.frame(width: 40, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 56 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 70 | Spacing | `.padding(8)` | Spread.space2 | Replace |
| 71 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 76 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 81 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 86 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 88 | Radius | `cornerRadius: 10` | no radius token for 10 (snap to 16 or 24, or add one) | Decide |
| 109 | Spacing | `.padding(12)` | Spread.space3 | Replace |
| 123 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 131 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 134 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 142 | Spacing | `.padding(10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 143 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 153 | Spacing | `.padding(16)` | Spread.space4 | Replace |

### Week/ToPlaceTray.swift (30 rows: Allowed 2, Decide 1, Replace 24, Snap 3)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 29 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 30 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 40 | Spacing | `.padding(.horizontal, 8)` | Spread.space2 | Replace |
| 45 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 57 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 58 | Spacing | `.padding(.vertical, tasks.isEmpty ? 8 : 12)` | Spread.space2 | Replace |
| 58 | Spacing | `.padding(.vertical, tasks.isEmpty ? 8 : 12)` | Spread.space3 | Replace |
| 88 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 89 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 98 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 117 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 123 | Spacing | `.padding(.leading, 16)` | Spread.space4 | Replace |
| 155 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 168 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 178 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 178 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 185 | Spacing | `.padding(.leading, 44)` | Spread.space12 (+4 pt) or keep off-grid | Snap |
| 190 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 266 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 268 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 269 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 271 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 277 | Spacing | `.padding(.bottom, 4)` | Spread.space1 | Replace |
| 282 | Spacing | `.padding(16)` | Spread.space4 | Replace |
| 290 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 291 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 300 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 313 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 320 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 329 | Spacing | `.padding(16)` | Spread.space4 | Replace |

### Week/WeekFocusComponents.swift (26 rows: Allowed 1, Decide 2, Replace 18, Snap 5)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 22 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 29 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 38 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 52 | Touch target | `.frame(width: 38, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 57 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 58 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 121 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 130 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 140 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 141 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 142 | Radius | `cornerRadius: 10` | no radius token for 10 (snap to 16 or 24, or add one) | Decide |
| 144 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 147 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 150 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 152 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 257 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 259 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 285 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 300 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 304 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 319 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 332 | Spacing | `.padding(.top, 3)` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 333 | Spacing | `.padding(.bottom, 8)` | Spread.space2 | Replace |
| 336 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 337 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Replace |
| 340 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |

### Week/WeekFocusSurface.swift (33 rows: Allowed 2, Decide 3, Replace 18, Snap 10)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 124 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 125 | Spacing | `.padding(.top, 4)` | Spread.space1 | Replace |
| 126 | Spacing | `.padding(.bottom, 6)` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 132 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 133 | Spacing | `.padding(.bottom, 8)` | Spread.space2 | Replace |
| 135 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 188 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 192 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 237 | Font size | `.system(size: 64` | largeTitle (fixed artwork size: decide) (Dynamic Type) | Decide |
| 239 | Spacing | `.padding(24)` | Spread.space6 | Replace |
| 263 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 271 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 289 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 296 | Spacing | `spacing: 1` | Spread.space1 (+3 pt) or keep off-grid | Snap |
| 302 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 307 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 310 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 316 | Font size | `.system(size: 7` | caption2 (Dynamic Type) | Decide |
| 324 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 356 | Spacing | `.padding(10)` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 384 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 385 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 394 | Spacing | `.padding(.vertical, 8)` | Spread.space2 | Replace |
| 404 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 415 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 423 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 424 | Spacing | `.padding(.horizontal, 8)` | Spread.space2 | Replace |
| 437 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 438 | Spacing | `.padding(.horizontal, 8)` | Spread.space2 | Replace |
| 453 | Radius | `cornerRadius: 14` | Spread.radiusControl | Replace |
| 473 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 485 | Spacing | `.padding(16)` | Spread.space4 | Replace |
| 506 | Spacing | `.padding(.vertical, 6)` | Spread.space2 (+2 pt) or keep off-grid | Snap |

### Week/WeekSurface.swift (49 rows: Allowed 3, Decide 1, Replace 40, Snap 5)

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 45 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 52 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 55 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 59 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 60 | Spacing | `.padding(.top, 8)` | Spread.space2 | Replace |
| 63 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 68 | Spacing | `spacing: 16` | Spread.space4 | Replace |
| 76 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 80 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 86 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Replace |
| 120 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 127 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 133 | Spacing | `.padding(.leading, 9)` | Spread.space2 (-1 pt) or keep off-grid | Snap |
| 133 | Spacing | `.padding(.trailing, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 134 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 135 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 136 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 145 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Replace |
| 155 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 162 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 164 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 165 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 171 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 173 | Colour | `Color(hex: … "#8E8E93")` | Spread.roleFallback | Replace |
| 180 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 181 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 190 | Spacing | `.padding(.top, 4)` | Spread.space1 | Replace |
| 375 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 387 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Replace |
| 393 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 405 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 410 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 418 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Replace |
| 419 | Spacing | `.padding(.vertical, allocations.isEmpty && selectedRole == nil ? 8 : 12)` | Spread.space2 | Replace |
| 419 | Spacing | `.padding(.vertical, allocations.isEmpty && selectedRole == nil ? 8 : 12)` | Spread.space3 | Replace |
| 473 | Spacing | `.padding(12)` | Spread.space3 | Replace |
| 475 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 478 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 495 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 502 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leadi` | Spread.minimumTarget (44 pt) | Replace |
| 532 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 538 | Spacing | `.padding(.leading, 8)` | Spread.space2 | Replace |
| 546 | Radius | `cornerRadius: 12` | no radius token for 12 (snap to 16 or 24, or add one) | Decide |
| 547 | Spacing | `.padding(.horizontal, 8)` | Spread.space2 | Replace |
| 547 | Spacing | `.padding(.bottom, 8)` | Spread.space2 | Replace |
| 551 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 599 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 609 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 619 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |

### Widget: SpreadLifeCardsWidget.swift (40 rows: Allowed 2, Decide 4, Replace 26, Snap 8)

Blocked until the widget target can see the theme (section 3, item 1).

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 141 | Colour | `Color(hex: "F7FAFF")` | Spread.ink (RGB distance 0) | Replace |
| 141 | Colour | `Color(hex: "B0BCD1")` | Spread.secondary (RGB distance 0) | Replace |
| 142 | Colour | `Color.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |
| 142 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 143 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 143 | Colour | `Color.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |
| 144 | Colour | `Color.white` | Spread.highlight, Spread.onAccent or Spread.tileGlyph (by use) | Replace |
| 147 | Colour | `Color(hex: "0E1A2E")` | Spread.ink (RGB distance 0) | Replace |
| 149 | Colour | `Color(hex: "4A5670")` | Spread.secondary (RGB distance 0) | Replace |
| 150 | Colour | `Color(hex: "F4F1EA")` | Spread.canvas (RGB distance 0) | Replace |
| 171 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 172 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 173 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 185 | Colour | `Color(red: 0.10, green: 0.13, blue: 0.15)` | Spread.tileGlyphOnBright (RGB distance 6) | Replace |
| 185 | Colour | `Color(hex: colorHex)` | role or artwork data (stored colour) | Allowed |
| 190 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 191 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 192 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 196 | Colour | `Color.black` | Spread.shadow or Spread.scrim (by use) | Replace |
| 201 | Colour | `Color(hex: "F4F1EA")` | Spread.canvas (RGB distance 0) | Replace |
| 204 | Colour | `Color(hex: colorHex)` | role or artwork data (stored colour) | Allowed |
| 244 | Font size | `.system(size: 14` | Spread.callout (Dynamic Type) | Replace |
| 245 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 258 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 273 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |
| 279 | Font size | `.system(size: 10` | caption2 (Dynamic Type) | Decide |
| 294 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 299 | Font size | `.system(size: 9` | caption2 (Dynamic Type) | Decide |
| 318 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 320 | Font size | `.system(size: 9` | caption2 (Dynamic Type) | Decide |
| 328 | Spacing | `.padding(.vertical, large ? 7 : 4)` | Spread.space2 (+1 pt) or keep off-grid | Snap |
| 328 | Spacing | `.padding(.vertical, large ? 7 : 4)` | Spread.space1 | Replace |
| 330 | Radius | `cornerRadius: 7` | no radius token for 7 (snap to 16 or 24, or add one) | Decide |
| 335 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 345 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 356 | Spacing | `spacing: 3` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 362 | Touch target | `.frame(height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 370 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 376 | Touch target | `.frame(height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 401 | Spacing | `spacing: 6` | Spread.space2 (+2 pt) or keep off-grid | Snap |

### Widget: SpreadTimerWidget.swift (13 rows: Replace 7, Snap 6)

Blocked until the widget target can see the theme (section 3, item 1).

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 336 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 437 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 530 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 547 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 557 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 579 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 584 | Spacing | `.padding(.horizontal, 2)` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 585 | Spacing | `.padding(.vertical, 7)` | Spread.space2 (+1 pt) or keep off-grid | Snap |
| 591 | Spacing | `spacing: 5` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 596 | Spacing | `.padding(12)` | Spread.space3 | Replace |
| 602 | Spacing | `spacing: 10` | Spread.space3 (+2 pt) or keep off-grid | Snap |
| 612 | Spacing | `.padding(16)` | Spread.space4 | Replace |
| 626 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Replace |

### Widget: SpreadTodayWidget.swift (9 rows: Replace 7, Snap 2)

Blocked until the widget target can see the theme (section 3, item 1).

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 91 | Spacing | `spacing: 2` | Spread.space1 (+2 pt) or keep off-grid | Snap |
| 116 | Spacing | `spacing: 14` | Spread.space4 (+2 pt) or keep off-grid | Snap |
| 130 | Spacing | `spacing: 8` | Spread.space2 | Replace |
| 186 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 189 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Replace |
| 207 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 208 | Spacing | `spacing: 12` | Spread.space3 | Replace |
| 210 | Spacing | `spacing: 4` | Spread.space1 | Replace |
| 249 | Spacing | `spacing: 8` | Spread.space2 | Replace |

## 5. Files with no hardcoded values

`ChalkTiming.swift`, `CrownTravel.swift`, `DialGeometry.swift`, `Focus/SpreadDayPlan.swift`, `Focus/SpreadDayPlanBuilder.swift`, `Focus/SpreadFocusActivityAttributes.swift`, `Focus/SpreadFocusIntents.swift`, `Focus/SpreadFocusLiveActivityController.swift`, `Focus/SpreadFocusSession.swift`, `Focus/SpreadFocusTimer.swift`, `Focus/SpreadLocalAlerts.swift`, `Gestures/SpreadGestures.swift`, `HourStrip.swift`, `Life/LifeAttachmentStore.swift`, `Life/LifeEditorialPresentation.swift`, `Life/LifeNotesEditor.swift`, `Life/LifeOutlineRules.swift`, `Life/LifePalette.swift`, `Life/LifeRecurringPlanForm.swift`, `Life/LifeTaskContent.swift`, `Life/PlanAheadPresets.swift`, `LifeCalendarRules.swift`, `Planner/LivePlanner.swift`, `Planner/LivePlannerBackup.swift`, `Planner/PersonalPreviewFixture.swift`, `Planner/PlannerOrder.swift`, `Planner/WeeklyHourStatus.swift`, `PlannerDates.swift`, `PlannerLayout.swift`, `PlannerSnapshot.swift`, `ReleaseNotes.swift`, `Sheets/WeekExport.swift`, `TactilePrecisionMath.swift`, `TaskDraftMemory.swift`, `WeekSwipeRules.swift`, `Widget/SpreadDayPlanPublisher.swift`, `Widget/SpreadFocusWidgetPublisher.swift`, `Widget/SpreadLifeCardsPublisher.swift`, `Widget/SpreadLifeCardsWidgetBuilder.swift`, `Widget/SpreadWidgetPublisher.swift`, `Widget/SpreadWidgetShared.swift`, `(app host) AppDelegate.swift`, `(app host) SceneDelegate.swift`, `(app host) SpreadBridgeViewController.swift`

