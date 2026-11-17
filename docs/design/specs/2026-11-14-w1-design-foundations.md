# Spec: W1 design foundations and native tokens

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Save as `docs/design/specs/YYYY-MM-DD-<slug>.md`.

| | |
| --- | --- |
| Request | Finalize Spread for App Store publication. Workstream W1: one coherent native design language, so every screen feels like the same product. Consolidate hard-coded colour, type, space, shape and motion into semantic tokens in `Theme/`, document them with a component state matrix, and check contrast. |
| Restated | For the iPhone owner and reviewers: every native SwiftUI screen should draw its look from one set of named tokens, and the shared components should have a written state matrix. |
| Surface | Native SwiftUI, iPhone (the 1.0 release is iPhone only). Widths 390, 820 and 1024 (1366 iPad) are checked by layout rules, not by a device run. |
| Size | L. It touches every native screen. The changes outside `Theme/` are limited to exact duplicates, so no screen changes its look. |
| Author | Claude Code session, 2026-11-14 |
| Status | In review. Draft pull request. Not compiled in Xcode here, not run on a device, and not approved for merge or release. |
| Governing docs read | Spread: [../README.md](../README.md) (router); [../RULES_CARD.md](../RULES_CARD.md); [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md); [../planner/SPREAD_NATIVE_BRAND_BOARD.md](../planner/SPREAD_NATIVE_BRAND_BOARD.md) section 3; [../brand/ICON_HANDOFF.md](../brand/ICON_HANDOFF.md); [../ui-kit/UI_KIT.md](../ui-kit/UI_KIT.md) sections 1 and 2; [../finalize/TOKEN_AUDIT.md](../finalize/TOKEN_AUDIT.md) sections 1 to 3. Gray Matter (`app-design/`, read-only clone, which yields to Spread): `DESIGN_SYSTEM.md` section 3 (semantic token roles), `DESIGN_TO_BUILD_CONTRACT.md` (UI kit must show default, focus, disabled, loading and error states), `IOS_PLAYBOOK.md` (interaction standard), `TACTILE_MOTION_AND_DEVICE_QA.md` (haptics table), and `OBJECT_FIRST_NATIVE_PATTERNS.md` (skimmed for states). **Not read in this session:** Gray Matter `README.md`, `UX_REVIEW_AND_SPEC_PROTOCOL.md` and `SECURITY_AND_RELEASE.md`. They govern review and release, which this value-neutral change does not reach; the owner should confirm. |

## 1. Problem

A Life or Week screen and a sheet should look like one product. Today, the native files carry about 730 rows of hard-coded values in the 2026-11-14 register (colour, font size, spacing, touch targets, corner radii, motion), and some of them name the same thing in different ways. The owner needs a set of names that every screen uses, a written state matrix for the shared controls, and a check that the palette is readable in light and dark, before the App Store build.

## 2. Evidence and context

**What the audit found** `[Repo]`. Counts are from `rg` on `ios/SpreadNativeV2/Sources/SpreadNativeV2/` after this change, except where noted.

| Category | Finding | Action in this PR |
| --- | --- | --- |
| Parallel colour namespace | `Life/LifePalette.swift` defines seven names that all alias `Spread.*`. Values agree. 42 call sites in 5 files. | Kept. Listed as exception E6. |
| Duplicate grey | `"#8E8E93"` appeared as a string at 3 sites, the same value as `Spread.roleFallback`. | Added `Spread.roleFallbackHex` and replaced all 3 sites. |
| Corner radius 12, 18 | Literal values with no name, at 13 sites. | Added `Spread.radiusSmall` (12) and `Spread.radiusInset` (18), and replaced all 13 sites. |
| Corner radius 14, 16, 24 | Exact duplicates of `radiusControl`, `radiusRow` and `radiusCard`, at 12 sites. | Replaced all 12 sites. No value changed. |
| Corner radius 7, 10, 13, 15, 23 | No token. 8 sites. | Not changed. Decision D2 in section 8. |
| Icon frames | 90 `SpreadIcon(size:)` calls. 38 use 18 pt, which has no token. | Added `Spread.iconSmall` (16), `iconMedium` (20) and `iconLarge` (24). Not migrated, because 18, 19 and 22 pt would snap by 1 to 2 pt, which needs a device check. Decision D3. |
| Font literals | 10 `.font(.system(size:))` calls in artwork and in Focus timer and Hours number displays. These do not scale with Dynamic Type. | Not changed. Exception E9. |
| Motion literals | 11 lines use a literal duration. 0 uses `.spring(`. | Not changed. Decision D4. |
| SF Symbols | 40 call sites. Most are OS states (alerts, system integrations). Some are custom controls that the icon handoff puts in Lucide: checkmark and circle state markers, the Focus transport buttons, and the indent and chevron controls. | Not changed. Exception E10. |
| Literal white and black | 7 sites, for artwork and glints. The roles are different (`onAccent`, `tileGlyph`, `highlight`, scrims). | Not changed. Decision in [../finalize/TOKEN_AUDIT.md](../finalize/TOKEN_AUDIT.md) section 3, item 9. |
| Full per-line register | Every remaining literal, file and line, with its token and status. | Already in [../finalize/TOKEN_AUDIT.md](../finalize/TOKEN_AUDIT.md) section 4. This spec does not duplicate it. |

**Contrast check, light and dark, WCAG 2.x** `[Repo]`. Values are read from `SpreadTheme.swift`. Text needs 4.5:1. Icons and non-text boundaries need 3:1. Computed by a script in this session and asserted by `scripts/native-foundation-tokens.test.mjs`.

| Pair | Light | Dark | Result |
| --- | ---: | ---: | --- |
| Ink on canvas, card, inset | 14.1 to 17.4 | 14.1 to 18.8 | Pass |
| Secondary on canvas, card, inset | 5.9 to 7.4 | 7.7 to 10.3 | Pass |
| Tertiary on canvas, card | 4.7 to 5.4 | 5.5 to 6.8 | Pass |
| **Tertiary on inset** | **4.33** | 6.5 | **Fail in light (E1)** |
| Accent text on canvas, elevated | 5.3 to 6.0 | 4.7 to 5.4 | Pass |
| **Accent text on lit Wallet card top** | n/a | **4.05** | **Fail (E2)** |
| Danger text on canvas, elevated | 4.9 to 5.6 | 5.0 to 5.8 | Pass |
| **Danger text on lit Wallet card top** | n/a | **4.34** | **Fail (E3)** |
| Caution and success text on canvas, elevated, card | 5.2 to 7.3 | 7.2 to 9.7 | Pass |
| White label on the accent gradient (both ends) | 4.72 to 6.44 | 4.72 to 6.44 | Pass |
| **White label on solid dark accent 0A84FF** | n/a | **3.65** | **Fail if used as a fill (E5)** |
| **White label on solid dark danger FF453A** | n/a | **3.41** | **Fail (E4)** |
| Accent icons on canvas | 5.3 | 5.4 | Pass (3:1) |
| Role tile glyph | `tileGlyph` on tiles up to luminance 0.30 (3:1 or better); `tileGlyphOnBright` above it (6.4 to 10.8) | same | Pass (the switch point is the 3:1 point) |
| Hairline `line` | 1.27 | 1.34 | Decorative only. Not a boundary that identifies a control (see E7) |

**Known weak spots that are not palette values.** The dashed drop zone in `Week/ToPlaceTray.swift` strokes `Spread.secondary` at 55% opacity, which is 2.45:1 in light mode (E7).

## 3. Goals, non-goals and budget

- **Goals.** (1) One name for each semantic role, in `Theme/`. (2) Exact duplicates of existing values reference the token, so the value lives in one place. (3) A state matrix for the shared controls in [../ui-kit/UI_KIT.md](../ui-kit/UI_KIT.md) section 2. (4) A recorded contrast check, with a regression test. (5) A decision list for each value that would change how the app looks.
- **Non-goals.** No screen changes its appearance in this PR. No value in the palette changes. No new colour, font or decorative style. No change to planner data, the store, cloud, sync, backup, the schema, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/` or any `golden/*` branch. No Icons8 asset.
- **Appetite.** One session. Mechanical changes outside `Theme/`, limited to exact duplicates. The rest is recorded for the owner or a later visual pass.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| [../RULES_CARD.md](../RULES_CARD.md) Look: native follows the brand board; no doodles, no Liquid Glass | Tokens keep the navy and cream values unchanged. |
| [../planner/SPREAD_NATIVE_BRAND_BOARD.md](../planner/SPREAD_NATIVE_BRAND_BOARD.md) section 3: "Centralize them in native semantic tokens" | This is that centralization. Values are unchanged. |
| [../brand/ICON_HANDOFF.md](../brand/ICON_HANDOFF.md): Lucide for category and utility glyphs; SF Symbols for OS states | The Lucide icon names are not changed. The SF Symbol exceptions are listed as E10. |
| [../RULES_CARD.md](../RULES_CARD.md) Behavior: status is never colour alone | Contrast is checked for each status colour. Status text is not changed. |
| [../RULES_CARD.md](../RULES_CARD.md) Boundaries: "Only `applyTheme` and the pre-paint script write `data-theme`" | Not touched. Native appearance is handled by `Spread.appearance` and `SpreadAppearancePreference`. |
| [../RULES_CARD.md](../RULES_CARD.md) Boundaries: do not touch `ios/App/App/Cloud/**` or `ios/App/SpreadCloudCore/**` | Not touched. |
| [../tokens.json](../tokens.json): generated from `src/styles.css` and checked by a test | Not hand-edited. Native tokens are documented in UI_KIT instead. See E8. |

**Exceptions needed (owner decides; nothing here was applied):**

- **E1. Light tertiary on the inset recess is 4.33:1.** Proposed: darken light `tertiary` to `#56627D` (4.95:1 on inset). This changes a brand value. Affects 9 call sites. A regression test is `todo` until the owner decides.
- **E2. Dark accent text on the lit Wallet card top is 4.05:1.** Proposed: use `#4DA3FF` for accent text on cards (5.63:1), or keep accent for icons and fills on cards and use `ink` for text. Changes a brand value.
- **E3. Dark danger text on the lit Wallet card top is 4.34:1.** Proposed: `#FF6A61` for danger text on cards (5.27:1).
- **E4. White label on the dark solid danger fill is 3.41:1.** Proposed: add a filled-danger token for button fills only, such as `#D2352B` (4.90:1 with white). Keep `danger` for text and icons. The only `onDanger` use is the destructive style in `Spread/SpreadSurface.swift`.
- **E5. Solid accent fill with white text is 3.65:1 in dark mode.** Rule, not value: filled controls use `Spread.accentGradient` (4.72:1 at its light end). The 12 `onAccent` sites were not checked one by one for their background, so a per-site check is owed.
- **E6. `LifePalette` is a second name for the same tokens.** It aliases `Spread` with the same values, in 42 call sites. Proposed: rename the call sites to `Spread.*` in a mechanical pass, after the Life owner has merged.
- **E7. Hairline and dashed boundaries.** `line` is 1.3:1 and decorative, which is allowed. The dashed drop zone strokes `secondary` at 55% (2.45:1 in light mode). Proposed: stroke it at full `Spread.secondary` (6.52:1 on canvas), or use `accent` while targeted.
- **E8. `docs/design/tokens.json` is not hand-edited.** The W1 brief named it as owned, but the file is generated by `scripts/design-tokens.mjs` from `src/styles.css`, and `docs:check` fails if they differ. Native tokens are documented in [../ui-kit/UI_KIT.md](../ui-kit/UI_KIT.md) section 1 instead. Owner to confirm.
- **E9. Font literals that do not scale.** Ten `.font(.system(size:))` calls remain: artwork labels in `Life/LifeEditorialCard.swift`, the Hours number in `Life/LifeHoursView.swift`, the Focus countdown and plan label in `Focus/SpreadFocusTimerSheet.swift`, and an icon in `Sheets/WhatsNewSheet.swift`. The Hours and Focus numbers are functional text and should scale with Dynamic Type before release. Proposed: switch them to a `Font.system(.style)` token, or give them a bounded `relativeTo:` size. Owner decides, with a device check at the largest accessibility size.
- **E10. SF Symbols on custom controls.** The icon handoff puts state markers in Lucide. Checkmark and circle state markers (`Sheets/ManageSheets.swift`, `Sheets/RecentlyDeletedSheet.swift`, `Week/OverdueSelectionTray.swift`, `Focus/` and `Shell/PlannerNavigationRail.swift`) could use the existing `lucide-circle-check` and `lucide-circle` assets. The Focus transport symbols (play, pause, forward, stop) and the indent controls have no Lucide asset yet. Owner decides which to move.

## 5. Options and the chosen concept

### Options considered

| Option | Idea in 2 to 3 lines | Pros | Cons |
| --- | --- | --- | --- |
| A | Replace every literal in every native file in one pass. | Complete. One rename. | Touches every file that the other six lanes are editing, so merge conflicts are near certain. Snaps (off-grid spacing, icon 18 pt) change layout and need a device check that has not been done. |
| B | Add the missing tokens to `Theme/`, swap only exact duplicates outside it, and record everything else. | Zero visual change. Small diff. Each decision is visible. | Leaves about 700 literals in place for later passes. |
| C | Also move the native tokens into `tokens.json`. | One data file. | `tokens.json` is generated from the planner CSS, and its check fails if edited by hand. Would mix planner and native values. |

**Chosen:** B. **Rejected:** A, because it cannot be reviewed on a device before merge and conflicts with the other lanes. C, because it breaks the generator and the owner's rule that native paint does not rewrite the planner's tokens.

### Breadboard of the chosen concept

Foundations have no screens. Places and where they are used are in [../ui-kit/UI_KIT.md](../ui-kit/UI_KIT.md) section 1 (names and use) and section 2 (the component state matrix).

### States

Covered per shared component in [../ui-kit/UI_KIT.md](../ui-kit/UI_KIT.md) section 2: default, pressed, focus, selected, disabled, loading, error, and where it applies, empty and undo. Offline is not a state of the native app: it is local-first and has no network state.

## 6. Platform behavior

- **Widths and orientation.** No layout changes. Icon and radius tokens are fixed points, so a 390 pt phone and a 1024 pt iPad show the same proportions as before.
- **Safe areas and fold.** No change.
- **Appearance.** Every token that changes between light and dark resolves through `UIColor(dynamicProvider:)`, as before. No token forces a scheme.
- **Accessibility.** The `Spread.*` type ramp uses `Font.system(.style)` and so scales with Dynamic Type. Font literals (E9) do not. Increase Contrast variants are unchanged. Reduce Motion behaviour is unchanged. VoiceOver labels are unchanged.
- **Input.** No change to gestures or tap targets.
- **Haptics and motion.** No change. The motion tokens are unchanged, and the unnamed 0.12 s durations are recorded (D4).

## 7. Technical approach

- **Where it lives.** `ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift` (new `Spread.roleFallbackHex`, `radiusSmall`, `radiusInset`, `iconSmall`, `iconMedium`, `iconLarge`). Outside `Theme/`: 28 replacements in 12 files (13 for 12 and 18 pt, 12 for 14, 16 and 24 pt, and 3 grey strings). Each is one token name with the same value. The full list is in the diff.
- **Data and state.** None. No store action, no persisted key, no migration.
- **Flags and rollout.** None. The change is value-neutral.
- **Do not touch.** Confirmed: no path under Cloud, SpreadCloudCore, `server/`, schema files, or `golden/*`.
- **Dependencies.** None added.
- **Performance and privacy.** No new animation or blur. Nothing leaves the device.
- **Tests.** New `scripts/native-foundation-tokens.test.mjs`. It checks the new tokens, bans the literal grey and the corner radii that now have tokens outside `Theme/`, asserts the passing contrast pairs, and records E1 to E5 as `todo`. It reads the Swift source as text, as `native-color-contrast.test.mjs` does.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| D1. Native colour values E1 to E5 | Changes how text reads on the cards and on filled controls. | Do not change now. Decide after a screenshot review in light and dark. | Owner |
| D2. Radii 7, 10, 13, 15, 23 (8 sites) | No token. Snapping moves edges by 2 to 3 pt. | Leave as is until a visual pass. | Owner, with device check |
| D3. Icon sizes 17, 18, 19, 22 (57 sites) | No token. Snapping is a 1 to 2 pt visual change. | Leave as is. Use the new icon tokens for new code. | Owner, with device check |
| D4. Motion: 0.12 s literal (3 sites), and 11 literal durations in total | No named duration matches 0.12 s. `fastSeconds` is 0.16 s. | Leave as is. Snap only with a motion review. | Owner, with device check |
| E9. Font literals (10 sites) | Functional numbers in Focus and Hours do not scale with Dynamic Type. | Make the Focus and Hours number displays scale before release. | Owner |
| E10. SF Symbols on custom controls | The handoff puts state markers in Lucide. | Move the checkmark and circle state markers to the existing `lucide-circle-check` and `lucide-circle` assets. Keep the Focus transport symbols until a Lucide set exists. | Owner |
| Hand-written palette rule | Without a rule, new code will keep adding literals. | Add the rule to UI_KIT section 5 (below). | Owner |

## 9. Verification and full-implementation plan

### Acceptance criteria

- Given the native source tree, when `scripts/native-foundation-tokens.test.mjs` runs, then the new tokens exist with the values listed in section 7, and no native file outside `Theme/` writes `"#8E8E93"` or a corner radius of 12, 14, 16, 18 or 24.
- Given light and dark appearance, when a reviewer reads the passing contrast pairs in section 2, then each one meets its threshold. Failing pairs are recorded as E1 to E5, not hidden.
- Given UI_KIT section 2, when a designer or engineer builds a shared control, then the state matrix names every state the control must have.
- Given a device build, when the owner compares it with the previous build, then no screen differs in colour, size or spacing (this is value-neutral; owed on device).

### Checks

- `npm run typecheck`, `npm run lint`, `npm run test:spread`, `npm run test:scripts`, `npm run docs:check`: run in this session (see the pull request).
- `node --test scripts/native-foundation-tokens.test.mjs`: run in this session.
- `native-typecheck` GitHub workflow: the Swift compile check. Its result is in the pull request. If it did not run, the pull request says so.
- Browser checks: not applicable. There is no React change.

### Owed on a physical device

- Light and dark side by side on a 390 pt iPhone, for every screen: confirm no visible change.
- Dynamic Type at the largest accessibility size on the Focus timer and the Hours sheet (E9).
- VoiceOver on the Life stack and the Week grid: unchanged, but confirm.
- Reduce Motion and Increase Contrast: unchanged, confirm.

### Full-feature implementation and refinement plan

- **Build location.** This branch, `claude/w1-design-foundations`, on the existing app.
- **Complete scope.** Theme additions, exact-duplicate swaps, the state matrix, the contrast test and the decision list. Nothing else.
- **Verification.** Automated checks above. Device checks owed.
- **Refinement loop.** Owner reviews E1 to E5 on screenshots, then a follow-up PR applies the decided values.
- **Questions for the tester.** Do the cards and filled buttons read easily in light and dark? Is any text harder to read than the tests show?

## 10. Rollout, rollback and release

Draft pull request into `main`. The change is value-neutral, so reverting it restores the same look: the new names are removed and each swapped line returns to its literal. No data migration. Release authority stays with the owner. This spec is not approval to merge or to build for TestFlight.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-14 | Option B: add the missing tokens, swap exact duplicates, record the rest (section 5). | Claude Code session, for the owner's review | This spec, [../ui-kit/UI_KIT.md](../ui-kit/UI_KIT.md), [../finalize/TOKEN_AUDIT.md](../finalize/TOKEN_AUDIT.md) (summary note), [../specs/README.md](README.md) |
| Pending | E1 to E5: colour values and fill rules | Owner | Pending |
