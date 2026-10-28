# Spec: Studio rebuild, wallpaper decides tint, dim, material and mode

> Part of the Spread design brain. Start at [../README.md](../README.md). Follows [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).

| | |
| --- | --- |
| Request | "Help you with the rebuild and spec sheet you had planned", plus the reference package (Pinterest board and Refero screens) |
| Restated | When someone imports a wallpaper into Studio on iPhone, the planner should look like a native Apple app tinted by that wallpaper, not like a skin drawn in the wallpaper's style. |
| Surface | Planner under the Studio flag (`VITE_SPREAD_STUDIO`, default off), on the `spread-studio` branch. iPhone first, then iPad widths. |
| Size | L (changes a flagged design exception, touches the shared contract, several surfaces) |
| Author | Claude, 2026-10-28 |
| Status | Draft. Four owner decisions open (section 4). Not approval to merge or release. |
| Governing docs read | `docs/design/RULES_CARD.md`, `README.md` (Studio section), `packs/apple-native-feel.md`, `packs/planner-change.md`, `platforms/APPLE_DESIGN_PRINCIPLES.md`, `DECISIONS.md`; on `spread-studio`: `docs/spread-studio/README.md`, `WALLPAPER_LANGUAGE.md`, `DESIGN_AMENDMENT_PROPOSAL.md`, `src/lib/spread/studio/contract.ts`; the reference package (notes, manifest, screenshots) |

## 1. Problem

A person imports a bright, illustrated wallpaper into Studio and taps Match wallpaper. Studio derives 3 px outlines, hard offset shadows, a scalloped sheet edge, a star check glyph and the Erica One display font from the image, and paints every card with them. The planner now looks like a decorated student project. Hierarchy is lost because everything is decorated, and the owner rejected the look on 2026-10-28. The same code also bundles a font that the Studio exception says it does not allow. The person wanted "my wallpaper, in my planner", not a redrawn planner.

## 2. Evidence and context

- `[Repo]` The skin is not only on an experiment branch. PR #99 ("derive material skin from wallpaper measurements") merged into `spread-studio` at `cd40178`. That branch is 137 commits ahead of `main` and 21 behind (checked 2026-10-28). There is no open pull request from `spread-studio` into `main`. The map previously said "draft PR #93"; #93 was a different PR, already merged into `spread-studio`. Fixed in this change.
- `[Repo]` Skin code is wide: about 120 matching lines across 9 files (`contract.ts`, `appearance.ts`, `wallpaper-language.ts`, their tests, `render.css`, `render.tsx`, `material-skin.audit.ts`, `draft.ts`). `render.css` is about 30 KB and also carries `outline` and `comic` element styles with asymmetric radii such as `14px 4px 14px 4px`.
- `[Repo]` `docs/spread-studio/WALLPAPER_LANGUAGE.md` records that `render.test.ts` was changed to allow exactly one local `@font-face` (Erica One). `DESIGN_AMENDMENT_PROPOSAL.md` says the Studio exception has no `@font-face`, no font download, and decoration that does not add illustration.
- `[Repo]` What is worth keeping already exists: wallpaper measurement and palette extraction, contrast enforcement, `focusY`, Peek, Half and Full Week sheet detents with finger-tracked drag, slider semantics and keyboard control, one `--studio-sheet-top` variable, flag-off baseline tests.
- `[Apple]` Apple's answer to personalization is a backdrop and a tint, not redrawn controls. See [../platforms/APPLE_DESIGN_PRINCIPLES.md](../platforms/APPLE_DESIGN_PRINCIPLES.md) section 2 and [../packs/apple-native-feel.md](../packs/apple-native-feel.md).
- `[Repo]` Reference package (kept outside the repo; its manifest says not to commit the screenshots). Of the five ranked ideas, four are planner layout (sheet anatomy, day strip, calm empty state, task row, month markers), which Studio must not change. Only the sheet anatomy informs Studio paint. Ideas the package marks "avoid" match the skin one for one: display fonts, decorated edges, opaque saturated fills, solid dock fills.
- `[Repo]` Code check of the package's open items on `main` (2026-10-28): a circular 44 px close already exists (`task-sheet.tsx`, `size-11 ... rounded-full`); Month already draws small role-colored dots under dates (`month-view.tsx`); the dock already uses the `glass` utility with pill actions (`spread-app.tsx`). The package's exceptions 6 and 7 therefore mostly dissolve.
- `[Assumption]` I did not run the app or view current Studio screenshots in this session. The look is known from the owner's rejection and the code, not from a fresh render.

## 3. Goals, non-goals and budget

- **Goals:**
  - The wallpaper decides five derived values: mode, tint, dim, material thickness and `focusY`. Nothing else varies with the image.
  - Four different wallpapers give identical layout geometry.
  - Sheet, header and dock read as material (the functional layer). Cards and task rows stay plain content-layer surfaces.
  - System type, one tint, hairlines, soft shadows. Role colors untouched.
  - Flag-off output is unchanged from the baseline.
- **Non-goals:**
  - No new layout. The day strip, calm empty state, two-line task row and Month markers from the references are planner polish. They get their own specs (section 5, queued).
  - No native SwiftUI or system Liquid Glass. No AI, Siri or widget work. No merge to `main`, no release.
- **Appetite:** one focused build session on the branch, plus the device pass. A disposable material prototype comes first.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| Card, "Look": no new colors, fonts or decorative styles | The rebuild removes the only added font and the decorative skin. Net: closer to the rule |
| Studio exception (README section 5; `DESIGN_AMENDMENT_PROPOSAL.md`) | Stays at scoped tokens, material paint and control geometry inside `[data-studio-appearance]`. Not widened |
| Apple principles, sections 2 and 5 | Material on controls only; no custom opaque fills on bars; no heavy outlines, hard shadows, display fonts or decorated edges |
| Card, "Boundaries": only `applyTheme` and the pre-paint script write `data-theme` | Unchanged. Studio uses `mode` and its own attribute |
| Card, "Behavior": motion uses existing classes; reduced motion removes movement | Detent drag keeps its physics; Reduce Motion snaps without animation |

**Exceptions needed (owner decides, defaults given, none assumed):**

1. **D1, non-derived options.** The contract still allows the `display` type preset, the `illustrated` and `desktop` control treatments, and the `outline` and `comic` element styles. Default: keep them as explicit user choices behind an Advanced disclosure; the derivation never selects them and no starting look uses them; the bundled Erica One file and `@font-face` are deleted, so `display` falls back to local stacks only. Alternative: remove the options entirely.
2. **D2, saved appearances that contain `skin`.** The parser rejects unknown fields, so removing `skin` makes any saved appearance with it fall back to the original look. Default: read tolerantly, drop a legacy `skin` key, and keep the rest, for one version, because a Studio TestFlight build may already exist `[Assumption]`. Alternative: accept the reset.
3. **D3, where `focusY` lives.** It describes the image, not a skin. Default: move it to `wallpaper.focusY` (a one-field addition to the allowlist, reviewed against the Gate 0 contract). Alternative: keep a minimal `skin: { focusY }`.
4. **D4, open draft #98.** "Studio Starry Ink: data-driven sheet skin" builds on the skin and is superseded by this work. Default: close it when this branch opens. Also decide whether the open Studio PRs #83, #86 and #95 should wait for this branch.

Not exceptions, resolved by code check: circular close and pill controls already exist; Month dots exist. Still defaults of "do not adopt" for the planner: role-tinted blocks and rails (role color stays data), Month collapsing into a timeline, a new peek panel above the dock. Blur on cards stays "no"; blur on the sheet, header and dock is inside the existing Studio exception and the open `DECISIONS.md` item stays open for the unflagged planner.

## 5. Options and the chosen concept

### Options considered

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| A. Forward removal on `spread-studio` | New branch `studio/apple-material` from the current tip. Delete the skin, replace the derivation and the sheet, card, header and dock paint. | Keeps the later work (contrast matrix, flag-off tests, CI screenshots, Codemagic gates, Crown fix). One lineage. Reviewable diff. | Touches about 120 lines and a 30 KB stylesheet. Several tests tied to skin values must be rewritten |
| B. Rebuild from the pre-skin base | Branch from `e3938c4` (PR #97 merge) and cherry-pick only the engine. | Cleanest history | Loses or redoes five later commits. Open Studio PRs target `spread-studio` and would conflict. Rewrites shared history |
| C. Native sheet and dock | Real system material through a native shell for the sheet and dock, web content inside. | The only route to true Liquid Glass and vibrancy | A separate architecture decision that `RESEARCH_DECISIONS.md` defers (React-first renderer). Weeks, not a session. Drag and keyboard parity at risk |

Also rejected: adding an "Apple" treatment next to the skin and leaving the skin in. It keeps the amateur code reachable and the test guard loosened.

**Chosen: A.** It is the only option that preserves verified work and keeps the open PRs viable. **Rejected: B** (conflicts, lost tests), **C** (separate decision; revisit if the web material ceiling is not good enough on device).

### Breadboard of the chosen concept

Places: Week with a wallpaper (sheet at Peek, Half, Full), Spread view header, Studio editor (preview, Apply, Match wallpaper, Reset), Appearance in settings. No new place.

Derivation (replaces the skin): `appearanceFromMeasurements` returns `mode`, one `tint` (text-safe, with light, dark and increased-contrast variants), `dim` (0 to 0.35, strongest for bright images), a material thickness (thin, regular or thick, carried by the existing `material.transparency` and `treatment: glass` or `flat`, no new field), and `focusY`. Everything else is constant across wallpapers.

| Surface | Paint |
| --- | --- |
| Type | System stack, existing scale tokens, tabular numerals for hours. No display face by derivation |
| Wallpaper layer | The image with the dim and a bottom scrim; follows the sheet through `--studio-sheet-top`. Blur belongs to the sheet's backdrop, not the image |
| Sheet | Material (blur and saturation, tinted alpha by thickness). Large top radius concentric with the device corner. Slightly inset at Peek and Half, flush and more opaque at Full. Hairline top highlight. Standard grabber, tap cycles detents. Anatomy follows the reference sheets: grabber, content in grouped rounded blocks, destructive action last |
| Cards and rows | Grouped-list: `rounded-3xl`, `--elevated`, hairline separators, no outlines, soft low-opacity shadow. No glass |
| Header and dock | Thin material with a scroll-edge fade. The only place that reads as glass. Crown unchanged |
| Tint | Today, links, primary actions, selected control, completion fill, drop highlight. Role colors and status colors untouched |
| Completion | Existing check glyph filled with the tint; existing single light haptic |

### States

- No wallpaper or flag off: the original planner, byte-identical to the baseline.
- Import failed or in progress: existing behavior, no derived look until it succeeds.
- Very bright image: 35% dim. Very dark image: no dim, mode dark. Busy image: thicker material.
- Tint fails contrast: corrected, the draft keeps a visible warning, the unreadable pair never ships.
- Reduce Transparency or Increase Contrast: opaque `--elevated` surfaces and stronger separators. Where the web view does not expose the query, a Studio setting provides the switch `[Rec]`.
- Reduce Motion: detents snap without animation.
- Draft versus applied: draft shows only in the editor preview; only Apply persists.
- Legacy appearance with `skin`: see D2.
- Offline, undo, drag, error: unchanged, Studio adds nothing.

## 6. Platform behavior

- **Widths:** 390, 820, 1024, both modes. Layout switches on width, never on the wallpaper. The sheet stays a bottom sheet; on wide windows check it does not stretch past a readable width.
- **iPhone Duo:** the web-drawn sheet gets no automatic fold avoidance. Anchor and test per [../packs/device-layout.md](../packs/device-layout.md). Out of the first pass; listed as owed.
- **Appearance:** `mode` is Studio's own field (system, light, dark). Studio never writes `data-theme`.
- **Accessibility:** 4.5:1 body and 3:1 large text and icons in light, dark and increased contrast; VoiceOver on the sheet slider (Arrow, Home, End already exist); 44 pt targets; text zoom to 200%.
- **Input:** touch drag, tap on the grabber, keyboard. Every drag keeps a tap and keyboard path.
- **Haptics and motion:** existing classes only; nothing new.

## 7. Technical approach

- **Where it lives (on `spread-studio`):** `src/lib/spread/studio/contract.ts` (remove `StudioSkin`, `SHEET_EDGES`, `CHECK_GLYPHS`; tolerate legacy `skin`; add `wallpaper.focusY` per D3), `wallpaper-language.ts` (new derivation), `appearance.ts` (resolver emits sheet material, grouped-card paint, separators), `render.css` and `render.tsx` (rewrite the sheet, card, header and dock blocks; delete scallop, star, hard shadow, outline weights above a hairline, `@font-face`), `src/spread/fonts/` (delete the font file and its README), `render.test.ts` (restore the `@font-face` rejection), `material-skin.audit.ts` (rename and adapt the contrast matrix), `docs/spread-studio/WALLPAPER_LANGUAGE.md` and `DESIGN_AMENDMENT_PROPOSAL.md` (update).
- **Data and state:** no new store, no migration. Convenience state keeps keys that do not start with `spread.`.
- **Flags and rollout:** `VITE_SPREAD_STUDIO` stays default off. Flag-off output is compared with `docs/spread-studio/BASELINE.md`.
- **Do not touch:** cloud, sync, backup, restore, schema, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/`, the landing page, any `golden/*` branch.
- **Dependencies:** none added. One font file removed.
- **Performance and privacy:** `backdrop-filter` only on the sheet, header and dock, not on every card (the current CSS blurs several parts). Wallpaper and derivation stay on device; nothing leaves it.

Queued as separate specs, each needing a code comparison first (they are planner layout, not Studio): S1 day strip in Place and Move to, with refusal reasons in words; S2 calm empty state for Week empty days and an empty To place tray; S3 two-line task row with shape-coded status; S4 Month markers (reuse the capacity encoding unless the owner approves a ring).

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| CSS blur approximates, not equals, system material | Owner may still feel it is "not Apple" | Judge on a real iPhone first; revisit option C only after that | Owner |
| `prefers-reduced-transparency` and `prefers-contrast` may not reach the WKWebView | Accessibility floor | Test on device; add a Studio switch if absent | Owner |
| Blur plus a moving sheet over a large image | Frame drops on older iPhones | Blur only the sheet, header and dock; measure; fall back to `flat` | Claude, then owner |
| Tests tied to skin values will fail | Rewrite scope | Rewrite to assert derived mode, tint, dim, thickness and identical geometry | Claude |
| Branch drift: `spread-studio` is 21 commits behind `main` | Later merge pain | Do not merge `main` in this change | Owner |
| Scope creep into layout ideas | Breaks the swap test | Section 7 queue; separate specs | Owner |
| Reference screenshots are third-party | Copyright | Keep out of the repo and store assets | Owner |

## 9. Verification and prototype plan

### Acceptance criteria

- Given four wallpapers (a starry illustration, a warm ember photo, open sky, a soft photo), when each is applied, then layout geometry in Week, Spread and Month is identical to the pixel; only tint, dim and material differ.
- Given a bright wallpaper, when the sheet is at Half, then text on the sheet is at least 4.5:1 and a dim of up to 0.35 sits behind readable UI.
- Given any wallpaper, when the screenshot is blurred, then the title, day cards and tasks still read in order.
- Given Reduce Transparency or Increase Contrast, then surfaces are opaque and separators stronger.
- Given the flag off or no wallpaper, then output matches the baseline.
- Given a saved appearance that contains `skin` (D2 default), then the rest of it loads and nothing throws.
- Given the repo after the change, then no `@font-face` and no font file remain under Studio, and the test guard rejects one.

### Checks

- Typecheck, lint, `test:spread`, `test:scripts`, build ([../RULES_CARD.md](../RULES_CARD.md), Verify). Studio CI jobs on the branch. The 54-frame contrast matrix, rewritten.
- Browser: 390, 820, 1024; light, dark, increased contrast; reduced motion; mouse and touch; no horizontal scroll.
- Owed on a physical iPhone: blur performance during a detent drag, safe areas, VoiceOver on the slider, gesture collisions, whether the reduced-transparency query reaches the web view, a blind side-by-side with iOS Reminders, Calendar and Maps at the same detents.
- Not checked in this spec: the live app, current Studio screenshots, any of the contrast or performance numbers.

### Prototype plan (feel is the open question)

- **What must be real:** a real photo behind a real `backdrop-filter` sheet with the three thicknesses, at the three detents, on an actual iPhone in the same WKWebView.
- **What can be faked:** task data, the editor, persistence.
- **Where it will be used:** the owner's iPhone, on the branch preview, with his own wallpapers.
- **Questions for the tester:** Do you know how to do this? Is it easy? How can we make it better? Plus: does this look like an Apple app?
- The prototype is disposable. The real version follows.

## 10. Rollout, rollback and release

Branch `studio/apple-material` from `spread-studio` (`cd40178`), draft PR into `spread-studio`. Flag default off. Roll back by reverting the PR or leaving the flag off. Release authority stays with the owner; this spec is not approval to merge, enable, deploy or submit.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-10-28 | Studio map status corrected: skin is already on `spread-studio` via #99; no PR into `main` | Claude | `../README.md` |
| open | D1 to D4 | Owner | This spec |
