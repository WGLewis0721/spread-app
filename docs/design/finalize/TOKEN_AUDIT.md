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

W1 update (2026-11-14, [spec](../specs/2026-11-14-w1-design-foundations.md)): new names `Spread.radiusSmall`, `radiusInset`, `iconSmall`, `iconMedium`, `iconLarge` and `roleFallbackHex`; 28 exact-duplicate swaps outside `Theme/` (radius 12, 14, 16, 18 and 24 pt, and the grey string). The per-line table in section 4 still shows the pre-W1 status; the rows that map to these names are replaced in code by this PR and should be marked Done in the next audit pass. The Decide rows for 7, 10, 13, 15 and 23 pt radii, the 0.12 s motion, the `LifePalette` namespace, the font literals and the SF Symbol controls remain open, with decisions E6, E9 and E10 in the spec.

Wave 2 note: these totals are the 2026-11-14 record from before wave 2. The six Life files in section 4 were re-audited in wave 2; section 6 summarises them.

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

10. **Owner decisions applied in this PR** (plan section 8, the OD items in lane A): OD4 keeps `success` as it is. OD5 removes the Gray Matter alias tokens; the UI kit maps the names in one line. OD7 changes the role-deletion confirmation to say responsibility. OD14 deletes the dormant layouts. OD15 makes `chalkInk` share the light secondary ink, including its Increase Contrast variant. OD18 makes Life the default root, with the key unchanged, and the UI test launch helper pins Classic for its own journeys. OD22 changes the empty-plan action to "Add responsibility".
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

### Life/LifeEditorialCard.swift (21 rows: Done 10, Snap 7, Decide 3, Allowed 1)

Re-audited in wave 2 (W2-3) from origin/main `6f53a60`; line numbers are that commit's. **Done** rows were converted to a token in this PR (exact values only). **Snap** rows would change a value, so they stay. See section 6.

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 64 | Colour | `Color(red: 0.10, green: 0.13, blue: 0.15)` | Spread.artGround | Done |
| 64 | Opacity | `.opacity(0.85)` | role colour alpha (role colour is data) | Allowed |
| 79 | Colour | `Color.black.opacity(0.66)` | Spread.artScrimStrong | Done |
| 80 | Colour | `Color.black.opacity(0.40)` | Spread.artScrimMid | Done |
| 81 | Colour | `Color.black.opacity(0.12)` | Spread.artScrimSoft | Done |
| 87 | Colour | `Color.black.opacity(0.40)` | Spread.artScrimMid | Done |
| 130 | Spacing | `spacing: 5` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 139 | Colour | `Color.white` | Spread.tileGlyph | Done |
| 140 | Spacing | `.padding(.horizontal, 17)` | Spread.space4 (+1 pt) or keep off-grid | Snap |
| 141 | Spacing | `.padding(.top, 13)` | Spread.space3 (+1 pt) or keep off-grid | Snap |
| 142 | Spacing | `.padding(.bottom, 28)` | Spread.space8 (-4 pt) or keep off-grid | Snap |
| 162 | Spacing | `spacing: 7` | Spread.space2 (-1 pt) or keep off-grid | Snap |
| 183 | Spacing | `spacing: 10` | Spread.space3 (-2 pt) or keep off-grid | Snap |
| 222 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 225 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 237 | Spacing | `.padding(.vertical, 6)` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 241 | Colour | `Color.black.opacity(0.6)` | Spread.artWell | Done |
| 241 | Colour | `Color.white.opacity(0.91)` | by-use ink or contrast chooser; no exact token | Decide |
| 242 | Radius | `cornerRadius: 7` | no radius token for 7 | Decide |
| 244 | Colour | `Color.black.opacity(0.9)` | no token: black at this strength; the scrim tokens differ | Decide |
| 244 | Colour | `Color.white` | Spread.tileGlyph | Done |
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

### Life/LifeManagementSheets.swift (28 rows: Done 11, Decide 3, Allowed 1, System 13)

Re-audited in wave 2 (W2-3) from origin/main `6f53a60`; line numbers are that commit's. **Done** rows were converted to a token in this PR (exact values only). **Snap** rows would change a value, so they stay. See section 6.

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 41 | Disabled / structure | `.disabled(saving \|\| savingHours)` | Stepper: system disabled look | System |
| 49 | Disabled / structure | `.disabled(saving \|\| savingHours \|\| planner.busy \|\| budgetHours == role.hours)` | Form row button: system | System |
| 60 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 66 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 67 | Radius | `cornerRadius: 10` | no radius token for 10 | Decide |
| 74 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 77 | Colour | `Color(hex: hex)` | role or artwork data (stored colour) | Allowed |
| 77 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 88 | Disabled / structure | `.disabled(saving \|\| savingHours \|\| planner.busy)` | Form section button: system | System |
| 98 | Disabled / structure | `.disabled(saving \|\| savingHours)` | toolbar item: system | System |
| 101 | Colour | `.white` | by-use ink or contrast chooser; no exact token | Decide |
| 101 | Disabled / structure | `.disabled(saving \|\| savingHours \|\| name ... isEmpty)` | toolbar item: system | System |
| 140 | Colour | `.white` | by-use ink or contrast chooser; no exact token | Decide |
| 154 | Spacing | `spacing: 16` | Spread.space4 | Done |
| 169 | Disabled / structure | `.disabled(saving)` | default-style text button: system disabled tint; device check owed | System |
| 169 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 170 | Disabled / structure | `.disabled(saving)` | default-style text button: system disabled tint; device check owed | System |
| 170 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 171 | Spacing | `.padding(24)` | Spread.space6 | Done |
| 186 | Spacing | `spacing: 16` | Spread.space4 | Done |
| 209 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 212 | Spacing | `.padding(20)` | Spread.space5 | Done |
| 227 | Disabled / structure | `container .disabled(planner.busy)` | container: would also dim its labels, so not converted | System |
| 256 | Disabled / structure | `.disabled(working \|\| day.isEmpty)` | Form section button: system | System |
| 257 | Disabled / structure | `.disabled(working \|\| day.isEmpty)` | Form section button: system | System |
| 272 | Disabled / structure | `.disabled(working \|\| planner.state?.revision != previewRevision)` | Form section button: system | System |
| 287 | Disabled / structure | `.disabled(working)` | Form section button: system | System |
| 293 | Disabled / structure | `.disabled(working)` | toolbar item: system | System |
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

### Life/LifeRoot.swift (86 rows: Done 54, Snap 18, Decide 8, Allowed 1, System 3, Left 2)

Re-audited in wave 2 (W2-3) from origin/main `6f53a60`; line numbers are that commit's. **Done** rows were converted to a token in this PR (exact values only). **Snap** rows would change a value, so they stay. See section 6.

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 74 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 83 | Spacing | `spacing: 20` | Spread.space5 | Done |
| 87 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 92 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 104 | Spacing | `.padding(.bottom, 28)` | Spread.space8 (-4 pt) or keep off-grid | Snap |
| 104 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Done |
| 104 | Spacing | `.padding(.top, 8)` | Spread.space2 | Done |
| 218 | Motion | `duration: 0.12` | no named duration for this value | Decide |
| 223 | Motion | `duration: 0.12` | no named duration for this value | Decide |
| 227 | Motion | `duration: 0.12` | no named duration for this value | Decide |
| 251 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 256 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Done |
| 262 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 263 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 269 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Done |
| 272 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Done |
| 272 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Done |
| 282 | Spacing | `spacing: 12` | Spread.space3 | Done |
| 283 | Spacing | `spacing: 12` | Spread.space3 | Done |
| 284 | Spacing | `spacing: 3` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 295 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 309 | Spacing | `spacing: 16` | Spread.space4 | Done |
| 316 | Spacing | `spacing: 6` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 330 | Spacing | `spacing: 12` | Spread.space3 | Done |
| 335 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 349 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 359 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Done |
| 366 | Spacing | `.padding(.top, 12)` | Spread.space3 | Done |
| 373 | Spacing | `spacing: 10` | Spread.space3 (-2 pt) or keep off-grid | Snap |
| 382 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Done |
| 396 | Spacing | `spacing: 12` | Spread.space3 | Done |
| 451 | Spacing | `spacing: 14` | Spread.space4 (-2 pt) or keep off-grid | Snap |
| 486 | Spacing | `spacing: 10` | Spread.space3 (-2 pt) or keep off-grid | Snap |
| 491 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 492 | Radius | `cornerRadius: 12` | no radius token for 12 | Decide |
| 503 | Disabled / structure | `.disabled(planner.busy)` | borderedProminent: the system dims disabled buttons; not dimmed twice | System |
| 504 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 512 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 527 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 552 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 577 | Spacing | `.padding(16)` | Spread.space4 | Done |
| 625 | Spacing | `spacing: 12` | Spread.space3 | Done |
| 631 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Done |
| 631 | Spacing | `.padding(.vertical, 6)` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 633 | Radius | `cornerRadius: 18` | no radius token for 18 | Decide |
| 637 | Spacing | `spacing: 12` | Spread.space3 | Done |
| 638 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 647 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 648 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (-2 pt) or keep off-grid | Snap |
| 660 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)` | Spread.minimumTarget (44 pt) | Done |
| 670 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)` | Spread.minimumTarget (44 pt) | Done |
| 677 | Spacing | `spacing: 6` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 698 | Spacing | `.padding(16)` | Spread.space4 | Done |
| 710 | Disabled / structure | `.disabled(planner.undoId == nil \|\| planner.busy)` | bordered: the system dims disabled buttons | System |
| 714 | Disabled / structure | `.disabled(planner.redoId == nil \|\| planner.busy)` | bordered: the system dims disabled buttons | System |
| 718 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (-2 pt) or keep off-grid | Snap |
| 718 | Spacing | `.padding(.vertical, 4)` | Spread.space1 | Done |
| 728 | Spacing | `spacing: 6` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 736 | Spacing | `spacing: 8` | lane W2-2 owns this block (adjacent to line 737); not edited here | Left (W2-2) |
| 737 | Disabled / structure | `SpreadIcon(name: session.currentKind == .rest ? "lucide-clock" ...)` | lane W2-2 owns this line (not edited here) | Left (W2-2) |
| 748 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (-2 pt) or keep off-grid | Snap |
| 749 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 760 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 764 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 770 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Done |
| 771 | Spacing | `.padding(.vertical, 8)` | Spread.space2 | Done |
| 777 | Spacing | `spacing: 2` | Spread.space1 (-2 pt) or keep off-grid | Snap |
| 782 | Spacing | `spacing: 2` | Spread.space1 (-2 pt) or keep off-grid | Snap |
| 795 | Radius | `cornerRadius: 12` | no radius token for 12 | Decide |
| 805 | Spacing | `.padding(3)` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 821 | Colour | `Color.black` | no token: black at this strength; the scrim tokens differ | Decide |
| 826 | Spacing | `spacing: 18` | Spread.space5 (-2 pt) or keep off-grid | Snap |
| 841 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Done |
| 847 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 848 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 849 | Spacing | `.padding(20)` | Spread.space5 | Done |
| 856 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Done |
| 865 | Spacing | `.padding(.horizontal, 16)` | Spread.space4 | Done |
| 865 | Spacing | `.padding(.vertical, 8)` | Spread.space2 | Done |
| 869 | Colour | `.black` | no token: black at this strength; the scrim tokens differ | Decide |
| 883 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 1028 | Spacing | `spacing: 16` | Spread.space4 | Done |
| 1037 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 1067 | Spacing | `spacing: 5` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 1074 | Spacing | `.padding(.horizontal, 10)` | Spread.space3 (-2 pt) or keep off-grid | Snap |
| 1075 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
### Life/LifeWalletStack.swift (33 rows: Done 21, Snap 4, Decide 6, Allowed 2)

Re-audited in wave 2 (W2-3) from origin/main `6f53a60`; line numbers are that commit's. **Done** rows were converted to a token in this PR (exact values only). **Snap** rows would change a value, so they stay. See section 6.

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 62 | Spacing | `spacing: 6` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 65 | Colour | `Color.white` | Spread.tileGlyph | Done |
| 65 | Colour | `Color.white.opacity(0.35)` | Spread.tileGlyph.opacity(0.35) | Done |
| 70 | Spacing | `.padding(6)` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 71 | Colour | `Color.black.opacity(0.25)` | no token: black at this strength; the scrim tokens differ | Decide |
| 72 | Spacing | `.padding(.trailing, 5)` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 80 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 98 | Opacity | `.opacity(hidden ? 0.35 : 1)` | hidden-card dim (not disabled); no opacity token | Decide |
| 250 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 258 | Radius | `cornerRadius: 24` | Spread.radiusCard | Done |
| 259 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 259 | Radius | `cornerRadius: 23` | no radius token for 23 | Decide |
| 274 | Radius | `cornerRadius: 24` | Spread.radiusCard | Done |
| 295 | Spacing | `spacing: 6` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 304 | Spacing | `.padding(.vertical, 16)` | Spread.space4 | Done |
| 320 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Done |
| 322 | Disabled / structure | `.disabled(planner.busy \|\| pendingTasks.contains(task.id))` | OD17: the same condition now dims at Spread.disabledOpacity | Done |
| 323 | Disabled / structure | `.opacity(pendingTasks.contains(task.id) ? 0.6 : 1)` | Spread.disabledOpacity (was 0.6); condition now includes planner.busy | Done |
| 328 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 331 | Disabled / structure | `Label { Text("High priority") } icon: { lucide-flag }` | OD1: TaskPriorityMark(), visible words hidden from VoiceOver | Done |
| 368 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Done |
| 371 | Disabled / structure | `.disabled(planner.busy \|\| pendingTasks.contains(task.id))` | OD17: priority flag dims at Spread.disabledOpacity | Done |
| 381 | Touch target | `.frame(width: 44, height: 44)` | Spread.minimumTarget (44 pt) | Done |
| 387 | Radius | `cornerRadius: 12` | no radius token for 12 | Decide |
| 404 | Spacing | `.padding(.horizontal, 12)` | Spread.space3 | Done |
| 438 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 441 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 445 | Colour | `.white` | by-use ink or contrast chooser; no exact token | Decide |
| 445 | Disabled / structure | `.disabled(saving \|\| title ... isEmpty)` | OD17: Add task dims at Spread.disabledOpacity | Done |
| 450 | Disabled / structure | `}.disabled(saving)` | OD17: Cancel dims at Spread.disabledOpacity | Done |
| 451 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 458 | Touch target | `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)` | Spread.minimumTarget (44 pt) | Done |
| 466 | Colour | `.white` | by-use ink or contrast chooser; no exact token | Decide |
### Life/LifeWeekView.swift (34 rows: Done 16, Snap 10, Decide 2, Allowed 6)

Re-audited in wave 2 (W2-3) from origin/main `6f53a60`; line numbers are that commit's. **Done** rows were converted to a token in this PR (exact values only). **Snap** rows would change a value, so they stay. See section 6.

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 33 | Spacing | `spacing: 12` | Spread.space3 | Done |
| 36 | Spacing | `spacing: 3` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 55 | Spacing | `spacing: 14` | Spread.space4 (-2 pt) or keep off-grid | Snap |
| 64 | Spacing | `.padding(.horizontal, 4)` | Spread.space1 | Done |
| 65 | Radius | `cornerRadius: 18` | no radius token for 18 | Decide |
| 66 | Spacing | `.padding(18)` | Spread.space5 (-2 pt) or keep off-grid | Snap |
| 134 | Spacing | `spacing: 10` | Spread.space3 (-2 pt) or keep off-grid | Snap |
| 136 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 141 | Spacing | `spacing: 2` | Spread.space1 (-2 pt) or keep off-grid | Snap |
| 172 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 174 | Spacing | `.padding(12)` | Spread.space3 | Done |
| 188 | Spacing | `spacing: 2` | Spread.space1 (-2 pt) or keep off-grid | Snap |
| 191 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 202 | Spacing | `spacing: 6` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 209 | Spacing | `spacing: 2` | Spread.space1 (-2 pt) or keep off-grid | Snap |
| 211 | Colour | `Color(hex: color)` | role or artwork data (stored colour) | Allowed |
| 216 | Opacity | `.opacity(... ? 1 : 0.4)` | out-of-month day dim, not a disabled state: no token (its value equals disabledOpacity, but the meaning differs) | Decide |
| 218 | Disabled / structure | `.disabled(planner.busy)` | OD17: day button dims at Spread.disabledOpacity | Done |
| 227 | Spacing | `spacing: 10` | Spread.space3 (-2 pt) or keep off-grid | Snap |
| 233 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 243 | Spacing | `.padding(.horizontal, 14)` | Spread.space4 (-2 pt) or keep off-grid | Snap |
| 244 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 256 | Spacing | `.padding(12)` | Spread.space3 | Done |
| 266 | Spacing | `spacing: 12` | Spread.space3 | Done |
| 275 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 277 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 277 | Opacity | `.opacity(0.16)` | role colour alpha (role colour is data) | Allowed |
| 278 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 279 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 279 | Opacity | `.opacity(0.5)` | role colour alpha (role colour is data) | Allowed |
| 285 | Disabled / structure | `.disabled(planner.busy \|\| snapshot.remainingHours(for:) < 1)` | OD17: plan-one-hour dims at Spread.disabledOpacity | Done |
| 288 | Spacing | `.padding(.vertical, 8)` | Spread.space2 | Done |
| 294 | Touch target | `.frame(minWidth: 44, minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 295 | Disabled / structure | `.disabled(planner.busy)` | OD17: week arrow (default style, icon) dims at Spread.disabledOpacity | Done |
### Life/LifeWeeklyTimeBudget.swift (25 rows: Done 9, Snap 9, Decide 6, Allowed 1)

Re-audited in wave 2 (W2-3) from origin/main `6f53a60`; line numbers are that commit's. **Done** rows were converted to a token in this PR (exact values only). **Snap** rows would change a value, so they stay. See section 6.

| Line | Kind | Found | Token | Status |
|---:|---|---|---|---|
| 37 | Spacing | `.padding(.horizontal, compact ? 12 : 16)` | Spread.space3 | Done |
| 38 | Spacing | `.padding(.vertical, 12)` | Spread.space3 | Done |
| 48 | Spacing | `spacing: 6` | Spread.space2 (-2 pt) or keep off-grid | Snap |
| 53 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 67 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 78 | Spacing | `spacing: 3` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 87 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 99 | Spacing | `spacing: 8` | Spread.space2 | Done |
| 100 | Spacing | `spacing: 10` | Spread.space3 (-2 pt) or keep off-grid | Snap |
| 101 | Spacing | `spacing: 3` | Spread.space1 (-1 pt) or keep off-grid | Snap |
| 108 | Spacing | `spacing: 5` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 123 | Spacing | `spacing: 2` | Spread.space1 (-2 pt) or keep off-grid | Snap |
| 134 | Spacing | `spacing: 5` | Spread.space1 (+1 pt) or keep off-grid | Snap |
| 139 | Spacing | `spacing: 4` | Spread.space1 | Done |
| 145 | Touch target | `.frame(minHeight: 44)` | Spread.minimumTarget (44 pt) | Done |
| 165 | Colour | `Color(hex: role.color)` | role or artwork data (stored colour) | Allowed |
| 166 | Colour | `.white.opacity(0.16)` | Spread.highlight.opacity(0.16) | Done |
| 175 | Spacing | `.padding(.horizontal, 2)` | Spread.space1 (-2 pt) or keep off-grid | Snap |
| 187 | Opacity | `.opacity(0.14)` | no opacity token | Decide |
| 195 | Spacing | `.padding(.horizontal, 2)` | Spread.space1 (-2 pt) or keep off-grid | Snap |
| 212 | Opacity | `.opacity(0.14)` | no opacity token | Decide |
| 286 | Colour | `.white` | by-use ink or contrast chooser; no exact token | Decide |
| 288 | Colour | `.white` | by-use ink or contrast chooser; no exact token | Decide |
| 296 | Colour | `.black` | no token: black at this strength; the scrim tokens differ | Decide |
| 296 | Colour | `.white` | by-use ink or contrast chooser; no exact token | Decide |
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


## 6. Wave 2 adoption (lane W2-3): changed, left and pending

Recorded 2026-11-14 on branch `claude/finalize-w2-tokens-life`, from origin/main `6f53a60`. Nothing here is verified on a device. No Swift compiler ran in this lane, so `native-typecheck` in CI is the compile check, and device checks are owed.

**Tokens added to `Theme/SpreadTheme.swift`.** `disabledOpacity` (OD17). `artGround`, `artScrimStrong`, `artScrimMid`, `artScrimSoft` and `artWell` name the Life artwork values, with their exact current values. `sidebarScrim` (OD16) is named but not adopted yet (see Pending).

**Converted in this PR.** 121 rows marked **Done** in the six Life sections above. They are exact-value literals (spacing, the 44 pt target, card radius, art and white ink), plus the OD1 and OD17 changes below. 28 **Decide** rows, 12 **Allowed** rows and 16 **System** rows are left as they are.

**Visible changes that need a device check (owed).**
- **OD1.** The high-priority marker on Life task rows is the shared `TaskPriorityMark()` (a red "!" in a ring), beside the words "High priority". The flag stays the toggle. The words are hidden from VoiceOver, so the phrase is spoken once.
- **OD17.** Disabled controls dim through `Spread.disabledOpacity` (0.4). The pending task toggle changes from 0.6 to 0.4 and now also dims while the planner is busy. New dims: the priority flag, Add task, Cancel, the week day buttons, plan-one-hour (when no hours remain) and the week arrow. System-styled disabled controls keep the system look (the System rows); they are not dimmed twice.

**Snap rows left (48), because they would change a value.** Move them in a visual pass with device checks:
- `LifeEditorialCard.swift`: 130 `spacing: 5`; 140 `.padding(.horizontal, 17)`; 141 `.padding(.top, 13)`; 142 `.padding(.bottom, 28)`; 162 `spacing: 7`; 183 `spacing: 10`; 237 `.padding(.vertical, 6)`
- `LifeRoot.swift`: 104 `.padding(.bottom, 28)`; 284 `spacing: 3`; 316 `spacing: 6`; 373 `spacing: 10`; 451 `spacing: 14`; 486 `spacing: 10`; 631 `.padding(.vertical, 6)`; 648 `.padding(.horizontal, 14)`; 677 `spacing: 6`; 718 `.padding(.horizontal, 10)`; 728 `spacing: 6`; 748 `.padding(.horizontal, 14)`; 777 `spacing: 2`; 782 `spacing: 2`; 805 `.padding(3)`; 826 `spacing: 18`; 1067 `spacing: 5`; 1074 `.padding(.horizontal, 10)`
- `LifeWalletStack.swift`: 62 `spacing: 6`; 70 `.padding(6)`; 72 `.padding(.trailing, 5)`; 295 `spacing: 6`
- `LifeWeekView.swift`: 36 `spacing: 3`; 55 `spacing: 14`; 66 `.padding(18)`; 134 `spacing: 10`; 141 `spacing: 2`; 188 `spacing: 2`; 202 `spacing: 6`; 209 `spacing: 2`; 227 `spacing: 10`; 243 `.padding(.horizontal, 14)`
- `LifeWeeklyTimeBudget.swift`: 48 `spacing: 6`; 78 `spacing: 3`; 100 `spacing: 10`; 101 `spacing: 3`; 108 `spacing: 5`; 123 `spacing: 2`; 134 `spacing: 5`; 175 `.padding(.horizontal, 2)`; 195 `.padding(.horizontal, 2)`

**Decide rows left (no token yet).** Radius 7, 12, 18, 23; black and white literals with no exact token; the luminance contrast chooser in `LifeWeeklyTimeBudget` (`ink(for:)`, an algorithm, kept on purpose); durations; the out-of-month day dim at 0.4 in `LifeWeekView` (its value equals `disabledOpacity`, but it is not a disabled state, so it keeps its literal).

**Removed in wave 3 (lane W3-2, OD33).** `sidebarScrim` (`Color.black.opacity(0.12)`) is deleted from `Theme/SpreadTheme.swift`. Its only consumer, the Week sidebar overlay, went with the Week Focus surface (OD19, #219), so the token was never adopted. The Crown-metal tokens (`crownLight`, `crownDark`, `crownRecess`, `crownRecessStroke` and the eight `tooth*` values) are deleted too; no file outside `SpreadTheme.swift` read them.

**Outside this lane.** The Focus mini-bar in `LifeRoot.swift`: the rest-icon line 737 and its neighbour 736 belong to lane W2-2 and are not edited here. `Life/LifeHoursView.swift` and `Life/LifePlanAheadSheet.swift` are not in this lane.
