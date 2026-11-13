# Spread iconography — coordinated category system

> Part of the [Spread design brain](../README.md).
> Summary: Lucide governs ten category glyphs and sixteen common utility actions across native and web. SF Symbols and Spread's original branded/motion icons remain separate. This is the single source for icon ownership, visual rules, and licensing. Category illustrations on Life cards belong to [the editorial art sheet](../planner/SPREAD_LIFE_CARD_ART_DIRECTION.md), not this icon file.

## Decision: one category glyph family across iOS and React

**Use Lucide SVG outlines for the 10 responsibility categories.** Each uses a 24×24 vector grid, 2-unit rounded stroke and consistent optical weight. Native `RoleBadge` and web `CategoryBadge` show the exact same glyph geometry on a rounded, persisted role-colour tile. Icons communicate category identity, **not** completion or time tracking. Custom/unknown categories retain the original list fallback.

| Category | Licensed Lucide source | Meaning |
| --- | --- | --- |
| Work | `briefcase-business` | Paid work and professional responsibility |
| School | `graduation-cap` | Learning and education |
| Home | `house` | Household responsibilities |
| Health | `heart-pulse` | Health and care |
| Family | `users-round` | Shared family responsibility |
| Fitness | `dumbbell` | Gender-neutral physical activity |
| Business | `building` | Operating a business (distinct from Work) |
| Project | `layers` | Personal or professional projects |
| Church | `church` | Optional faith/community responsibility |
| Personal | `user-round` | Individual interests, no gender coding |

**Accessibility:** The category tile keeps the user-selected role colour, while the glyph automatically switches between dark ink and white using relative luminance. Contrast is checked for bright yellow/orange/green as well as dark palette colours.

**Visual references evaluated:** [Apple SF Symbols HIG](https://developer.apple.com/design/human-interface-guidelines/sf-symbols), [Lucide](https://lucide.dev), [Iconoir](https://iconoir.com) and [Phosphor](https://phosphoricons.com). Lucide was selected for its readable 2-unit stroke at small sizes, consistent rounded geometry, downloadable SVG files, permissive ISC license, and ability to reuse one glyph on both iOS and web. Apple native **action controls** should continue using system SF Symbols where the existing UI does so. This category system **does not replace** the Apple launcher icon, Spread mark or image-rich Life card illustrations.

## File ownership — do not scatter or fork icons

- **Source web SVGs:** `public/icons/icon-category-<category>.svg`; runtime colour is injected in `src/spread/components/category-badge.tsx` only after validating a six-digit hex colour.
- **Native asset-catalog matches:** `ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Icons.xcassets/category-glyph-<category>.imageset/category-glyph-<category>.svg`; rendered as template images by `Theme/SpreadIcons.swift` `RoleBadge`.
- **License notices:** `public/icons/LUCIDE_LICENSE.txt` and `ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/LUCIDE_LICENSE.txt`. The latter is included as a bundled Swift package resource.
- **Audit:** `scripts/icon-system.test.mjs` compares the vector paths across platforms and checks runtime tint, native templates and license presence.

To update a category, change the web and native **SVG shapes together**, keeping size, strokes, container type and accessibility. No icon is allowed to directly modify planner hours or tasks. Avoid raster icons for toolbar actions. At small widths, show the readable category name; icon colour alone never encodes meaning. Prefer a 28–36pt visible badge within 44pt action targets. Reduced Motion applies to buttons, not an independently looping category icon.

## Unified utility actions (November 13, 2026)

Spread's category icons were already matched between iOS and React. A subsequent audit found utility SVGs with mismatched viewBoxes and stroke widths (1.79–2.40). Following the [Gray Matter app-design alignment](GRAY_MATTER_ADOPTION.md), **16 shared utility icons now use official Lucide 24×24 / 2pt round-stroke geometry**, shipped as identical native and web SVGs with no added package or runtime network dependency.

| Spread file suffix | Lucide source | Spread file suffix | Lucide source |
| --- | --- | --- | --- |
| `add` | `plus` | `backup` | `hard-drive-upload` |
| `check` | `check` | `drag` | `grip-vertical` |
| `edit` | `pencil` | `export` | `file-down` |
| `notes` | `notebook-pen` | `outline` | `list-tree` |
| `palette` | `palette` | `photo` | `image` |
| `print` | `printer` | `restore` | `rotate-ccw` |
| `settings` | `settings` | `share` | `share-2` |
| `table` | `table-2` | `trash` | `trash` |

**Semantics and compatibility:** destructive Trash stays red; other monochrome SVGs stay accent blue in source and inherit SwiftUI/CSS tint at runtime. The native asset-catalog template flags remain unchanged. No icon changes trigger planner actions themselves. iOS built-in control affordances continue using Apple's SF Symbols. Branding, animated Week/Month morph, Create Life mark, navigation, category glyphs, and editorial cards remain unchanged.

**Visual reference:** [16-icon light/dark gallery](ICON_GALLERY.svg) (asset sheet; not a device screenshot).

**License and source:** [Lucide SVG repository](https://github.com/lucide-icons/lucide/tree/main/icons), [ISC license](https://lucide.dev/license). The existing full notices remain at `public/icons/LUCIDE_LICENSE.txt` and `ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/LUCIDE_LICENSE.txt`. Automated `scripts/icon-system.test.mjs` checks each native/web pair and icon catalog metadata.

**Verification gate:** code parity and static asset checks are necessary but not evidence of visual correctness on an iPhone. Review 24pt legibility, light/dark, contrast, VoiceOver, and Codemagic/TestFlight screenshots prior to merge or release. Roll back the icon commit if any platform's appearance regresses.

## Existing UI actions and brand assets

Beyond the 16 standardized utility outlines above, preserve existing icon identities and production launcher branding. They are consolidated under `public/icons/`, and their native analogues are in `Resources/Icons.xcassets/`, `SpreadIcon` and SF Symbols as appropriate:

| Category | Existing examples | Rule |
| --- | --- | --- |
| Navigation | `icon-spread-list.svg`, `icon-week.svg`, `icon-month.svg` | Keep original Week/Month morph contract and Crown |
| Editing | `icon-add.svg`, `icon-edit.svg`, `icon-drag.svg`, `icon-check.svg`, `icon-trash.svg` | Use iOS-native patterns; destructive remains red |
| Content/tools | `icon-notes.svg`, `icon-photo.svg`, `icon-table.svg`, `icon-palette.svg` | 20–24pt consistent visual weight |
| More/Settings | `icon-backup.svg`, `icon-restore.svg`, `icon-share.svg`, `icon-print.svg`, `icon-settings.svg` | Actions retain labels and 44pt targets |
| Brand | `app-icon-spread-cards.svg`, iOS `AppIcon.appiconset` | Never confuse small UI category pictograms with the branded Home Screen app icon |

**Copyright:** Lucide's ISC license and full contributor/Feather notices are retained verbatim in both shipped resource locations. The category paths originate from `lucide-icons/lucide/icons/<source>.svg`. No network retrieval is required at runtime.

**Scope / rollback:** the historical category glyph parity remains authoritative; this change unifies only the 16 shared utility SVGs listed above. No task model, planner state, category identifiers, typography, animation or release pipeline changes. Reverting the utility-icon commit restores original SVGs.
