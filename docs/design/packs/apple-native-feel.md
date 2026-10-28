# Pack: making the UI feel native on Apple platforms

> Part of the Spread design brain. Start at [../README.md](../README.md). Tier 2 pack: a digest, not the source. The rules card applies on top.

**Use when:** you touch materials, translucency, color in controls, sheets, corners, motion or accessibility settings, or review a screen for "does this look like an Apple app". For per-device layout use [device-layout.md](device-layout.md). For token values use [../tokens.json](../tokens.json).

## Facts to work from

**Principles.** The job is scanning days, tasks and hours calmly. Personalization is a tint and a backdrop, never a layout. Hierarchy comes from size, weight and spacing, not borders and fills. One accent, system type, hairlines, generous space. Role colors are data. `[Repo][Apple]`

**Two layers.** Controls and navigation float above content. Glass belongs to the controls layer only; the content layer (cards, task rows) uses standard materials or plain surfaces. Use glass sparingly on custom controls. `[Apple]`

**What ships today.** The planner already has a `glass` utility (blur 28px, saturate 1.7) on the dock, and `--glass`, `--glass-stroke`, `--glass-line` tokens. Cards are `rounded-3xl bg-elevated`. The `--radius-card`, `--radius-sheet`, `--radius-control` tokens exist but no component uses them. Blur on cards and sheets is an open owner decision, listed in [../DECISIONS.md](../DECISIONS.md). The "no glassmorphism" line in `AGENTS.project.md` sits with the landing page. `[Repo]`

**Apple rules to apply:**
- Text on any material uses primary or secondary ink, never the quietest level.
- A bright backdrop gets a dim layer of about 35% behind readable UI.
- Do not give bars and the dock opaque custom fills or borders.
- Be judicious with color in controls: one accent with light, dark and increased-contrast variants.
- Sheets: inset at lower detents, flush and more opaque at full height, a Grabber that cycles detents, a slider role with keyboard control. A permanent Week sheet is nonmodal.
- Concentric corners: nested radius is container radius minus padding. Do not mix unrelated radii.
- Content scrolling under the dock or header needs a fade or blur edge so controls stay legible.
- Accessibility: Reduce Transparency means opaque surfaces; Increase Contrast means stronger separators and ink; Reduce Motion means no movement. `[Apple]`

**Web ceiling.** `backdrop-filter` with a tinted, semi-opaque surface approximates a material. It is not system Liquid Glass. Whether `prefers-reduced-transparency` and `prefers-contrast` reach the WKWebView is unverified; test on a device and offer an in-app switch if they do not. True system glass or native sheets need native views, a separate architecture decision. `[Rec]`

**What reads as amateur:** heavy outlines (about 3 px) and hard offset shadows; a display typeface or custom glyphs where system type and symbols belong; opaque saturated fills where a material and one tint belong; decorating every element; decorative edges on sheets; forbidden fonts. A wallpaper-driven skin that did this was rejected on 2026-10-28.

**Studio.** The image decides a tint, a dim, a material thickness and a mode. Layout never changes with the image. Studio lives on the `spread-studio` branch behind `VITE_SPREAD_STUDIO` (default off).

## Checklist
- [ ] Swap test: change the backdrop or tint and layout geometry is identical.
- [ ] Squint test: blur the screenshot; title, days and tasks still read.
- [ ] Reference test: compare with iOS Reminders, Calendar and Maps in the same state.
- [ ] Contrast 4.5:1 body, 3:1 large text and icons; light, dark, increased contrast.
- [ ] Reduce Motion, Reduce Transparency, Increase Contrast, text zoom at 200%.
- [ ] VoiceOver on sliders, sheets and drag alternatives.
- [ ] No new color, font or decorative style outside an approved, flagged exception.
- [ ] A real iPhone pass for anything that moves or blurs.

## Read deeper only if needed
- `platforms/APPLE_DESIGN_PRINCIPLES.md#2. What Apple says, and what it means for Spread`: the full table with sources.
- `platforms/APPLE_DESIGN_PRINCIPLES.md#3. What a web layer can and cannot do`: web limits.
- `platforms/APPLE_DESIGN_PRINCIPLES.md#5. What makes an Apple app read as amateur`: the failure list.
- `planner/SPREAD_DESIGN_SYSTEM.md#Human Interface Guidelines polish`: what the planner already adopted.
