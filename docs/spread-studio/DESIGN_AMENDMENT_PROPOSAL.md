# PROPOSAL - requires owner approval

This is a proposal. It does not change `docs/design/SPREAD_DESIGN_SYSTEM.md` or `AGENTS.project.md`. Those files still say: do not add colors, fonts, or decorative styles. Visual Studio work stays behind the `studio` flag until the owner accepts a narrower rule than this draft, or rejects it.

Status: **awaiting owner**. Gate 50% can be recorded as met only pending that approval. Merging this pull request does not approve the amendment.

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
4. The user applied that appearance. A draft, including an AI proposal, does not count.

`data-theme` is unchanged. Appearance `mode` (`system` | `light` | `dark`) is a separate field. Studio must not write `data-theme` and must not treat `data-theme` as the custom look.

There is no theme pack, occupation, team, film, or franchise class name. "Original" is the reset to today's Spread, not a catalog entry.

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

Typography `presetId` is allowlisted to `system`, which means the shipped `--font-sans` stack already in `src/styles.css`. No new `@font-face`, no downloaded font, no landed serif as a planner default. `scale` and `numeralEmphasis` stay inside `STUDIO_LIMITS`. Control `treatmentId` is allowlisted to `original` until a later contract change names another structural treatment. That name must not be a theme pack.

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

## What owner approval would still need to edit

Acceptance would be a separate change, by the owner, to `docs/design/SPREAD_DESIGN_SYSTEM.md` and the matching paragraph in `AGENTS.project.md`. This file would stay as the proposal those edits cite. Until that happens, agents may implement a flagged resolver only as proposed behavior, and review treats the design gate as **pending owner**.

Rejection leaves the design system as written. Rollback of any later visual experiment is: `studio` flag off, plus revert of the resolver. Flag off must match the baseline in `docs/spread-studio/BASELINE.md`.
