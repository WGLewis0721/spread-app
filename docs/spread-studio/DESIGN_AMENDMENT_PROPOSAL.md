# STUDIO DESIGN EXCEPTION - flagged implementation only

The owner authorized changes to Studio on 2026-10-27 while preserving the golden baseline. This narrow permission now appears in `docs/design/SPREAD_DESIGN_SYSTEM.md` and `AGENTS.project.md`. The exception applies only under the default-off Studio flag and does **not** authorize merging, enabling production, deploying, TestFlight or App Store submission.

Status: **approved for isolated implementation and verification only**. Merge and release gates remain independently pending.

Read at `spread-studio` `6b8ec1823e457329592ac5f272e23a7bae08e012`:

- `docs/design/SPREAD_DESIGN_SYSTEM.md` line 5: "Do not add colors, fonts or decorative styles. Use a token, or reuse a pattern." The reference lock (line 88) keeps the crown, responsibility colors, hour bank, round surfaces, and the quiet palette.
- `AGENTS.project.md`: "Stay on the brand board. No new colors, fonts or decorative styles." Studio notes in that file say no Studio doc overrides the design system, and new colors, fonts, or materials need explicit approval.
- Shipped tokens live in `src/styles.css` `:root` (light) and `[data-theme="dark"]` / `prefers-color-scheme`. `data-theme` is set only by `applyTheme` in `src/lib/spread/store.ts` to `light` or `dark`, or removed for `system`.
- Role colors are `ROLE_COLORS` / hat `color` in `src/lib/spread/model.ts`. They are data, not chrome.

## What would change, and only there

Allow a Studio-only override of a closed set of **existing semantic tokens**, and only when all of the following are true:

1. `STUDIO_FLAG` from `src/lib/spread/studio/contract.ts` is on (`VITE_SPREAD_STUDIO` is `"1"` or `"true"`). Default remains off. Flag off means the rules in `SPREAD_DESIGN_SYSTEM.md` apply with no exception, and no Studio attribute is set.
2. The override is scoped to an element that has `data-studio-appearance` (`STUDIO_APPEARANCE_ATTRIBUTE`). It must not rewrite `:root` tokens in a way that survives a profile switch or a flag-off render.
3. Values come from a validated `StudioAppearanceV1` through one resolver. The resolver does not accept CSS text, selectors, font URLs, or script.
4. The user applied that appearance in the real planner. Inside the inert, non-writing editor preview, a temporary scope may show a draft. A draft never persists before Apply.

`data-theme` is unchanged. Appearance `mode` (`system` | `light` | `dark`) is a separate field. Studio must not write `data-theme` and must not treat `data-theme` as the custom look.

There is no marketplace, occupation, team, film, or franchise theme class. Four original, editable starting looks (Personal Canvas, Retro Desk, Clear Glass, Dynamic Ink) are available. Each UI group can be independently drawn with the closed treatments; this must not change semantics, gestures or hit target size. "Original" is the reset to today's Spread, not a marketed theme pack.

## Tokens a resolver may set inside the Studio scope

Only these, and only from the appearance's allowlisted fields:

| Token         | Source                  | Bound                                                                                                                                                                            |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--elevated`  | `palette.surface`       | `#rrggbb` from the contract. This is the card surface.                                                                                                                           |
| `--ink`       | `palette.text`          | `#rrggbb`                                                                                                                                                                        |
| `--secondary` | `palette.secondaryText` | `#rrggbb`                                                                                                                                                                        |
| `--accent`    | `palette.accent`        | `#rrggbb`                                                                                                                                                                        |
| `--on-accent` | derived                 | Not a free field. The resolver picks a readable on-accent. It does not copy the photo.                                                                                           |
| `--canvas`    | derived                 | Page color may be a scrim over the user's wallpaper (`wallpaper.dim` / `wallpaper.blur` within contract bounds) or the existing canvas token. It is not a fifth user-picked hue. |

Wallpaper is an image referenced by opaque `wallpaperAssetId`, painted behind content. It is not a CSS `url()` from the model and not a remote address.

Material (`flat` | `glass` | `matte` | `metal`), transparency, and depth may change **how those same tokens are painted** (opacity, blur, shadow) inside the scope. They may not introduce a new palette. `flat` remains available, and it is the treatment when Reduce Transparency is on, or when the advanced path is disabled.

Typography `presetId` is allowlisted to `system`, `editorial`, `mono`, or `display`, using only device-local fallback stacks. There is no `@font-face`, font download, or new unflagged planner default. `scale` and `numeralEmphasis` remain bounded. Control `treatmentId` is allowlisted to `original`, `desktop`, `soft-glass`, or `illustrated`. These treatments alter border radius, borders and shadows, never control semantics or hit-targets.

`decorationIntensity` and `animationIntensity` only modulate existing motion and ornament. They do not add new illustration, blobs, or a second component library.

## Tokens and data this proposal does not open

- `--danger`, `--on-danger`, `--caution`, and any status color. Status stays words plus the existing danger/caution tokens.
- `--tertiary` as the "no role colour" dot. It stays the shipped token.
- `ROLE_COLORS` and hat colors stored on planner data. A wallpaper must not recolor a responsibility.
- Landing-page tokens, `data-site-theme`, and `DESIGN.md`.
- Hairline meaning: `--line` and `--fill` may be mixed from `text` at a fixed alpha inside the scope. They may not become a new hue family.
- Planner keys under `spread.*`, the accent key `spread-accent`, and image bytes in `localStorage`.

Role, focus, undo, drag, and hour meaning do not change with the paint.

## Accessibility floor the resolver would have to enforce

These are conditions on future visual code, not behavior this proposal turns on:

- Text on surface and accent on its pair meet a contrast floor even when the photo is bright. If the user's colors fail, correct them and keep a warning on the draft. Do not ship the unreadable pair.
- `prefers-reduced-motion`: decoration and animation intensity resolve to 0.
- `prefers-reduced-transparency` and increased contrast: glass/blur/transparency resolve toward `flat` and opaque surfaces.
- Hit targets stay at least 44px. The crown, day cards, hour banks, To place, task rows, sheets, completion, and undo stay the same components.
- Unknown or invalid appearance id: render `originalStudioAppearance()` and do not keep a partial override.

## Rollback and remaining release approval

The scoped exception is documented in `docs/design/SPREAD_DESIGN_SYSTEM.md` and `AGENTS.project.md` as part of draft PR #93. The change is **not shipped** until independently reviewed and explicitly merged/activated by the owner.

Rollback is immediate: keep `VITE_SPREAD_STUDIO=0`. Rejecting the experiment means closing PR #93 or reverting its isolated changes. Flag-off output must match `docs/spread-studio/BASELINE.md`.
