# Apple design principles for Spread

> Part of the Spread design brain. Start at [../README.md](../README.md) for the map, the rules and what to read for which task.

Written 2026-10-28. This file turns Apple's current guidance on materials, color and sheets into decisions for Spread, and records the first principles behind them. The device guides in this folder cover layout, safe areas, submission and testing per device. This file covers how Spread should *look and feel* on any Apple device.

Evidence tags, same as the device guides: **[Apple]** read on a developer.apple.com page this session. **[3P]** third party, including mirrors of Apple pages. **[Repo]** from Spread docs or code. **[Rec]** a recommendation, not a fact.

Pages read: [Materials](https://developer.apple.com/design/human-interface-guidelines/materials.md), [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass.md), and a [mirror of the Sheets HIG page](https://unpkg.com/apple-hig-mcp@1.1.3/content/sheets.md) [3P]. Re-read the Apple originals for Sheets, Color and Typography before relying on this file for those.

---

## 1. First principles

1. **The job.** Spread is a weekly planner. A person decides which tasks go on which day against an hour budget per role: Responsibilities, Hours, Week, Tasks [Repo]. The content is days, tasks and hours. The interface exists to make that scannable and calm.
2. **Personalization serves the job.** Making Spread feel like the person's own must never cost legibility or scan speed. In Apple's vocabulary, personalization is a backdrop and a tint (wallpaper, light, dark, clear, tinted). It does not redraw controls [Apple: Adopting Liquid Glass, app icon appearances].
3. **Two layers.** Apple separates a content layer from a functional layer (controls and navigation). Backdrops defer to content. Material is how the layers separate [Apple: Materials].
4. **One input, one layout.** When a user-supplied image drives the look, different images must give the same layout with a different tint, dim and material. The image is an input, never a layout.
5. **Restraint is the signature.** One accent. System type. Hairlines. Generous spacing. Hierarchy from size, weight and spacing, not from borders and fills. Role colors stay data [Repo].
6. **The repo already decided most of this.** Tokens, `rounded-3xl bg-elevated` cards, 44 pt targets, the sheet with a Grabber, three distinct kinds of thing in Week, the reference lock on the Crown and quiet palette [Repo: [planner/SPREAD_DESIGN_SYSTEM.md](../planner/SPREAD_DESIGN_SYSTEM.md)].

---

## 2. What Apple says, and what it means for Spread

| Topic | Apple guidance | Consequence for Spread |
| --- | --- | --- |
| Layers | Liquid Glass forms a functional layer for controls and navigation that floats above content. "Don't use Liquid Glass in the content layer." Use standard materials (ultra-thin, thin, regular, thick) for the content layer, such as app backgrounds [Apple: Materials] | Cards and task rows are content: no glass on them. Only the header, dock and similar controls may read as glass [Rec] |
| Restraint | Apply Liquid Glass to custom controls sparingly. Overuse "distracts from content" [Apple: Materials, Adopting Liquid Glass] | At most a couple of functional elements get a glass look |
| Vibrancy | Use vibrant colors on top of materials. Thicker materials give text more contrast; thinner ones keep context. Avoid quaternary labels on thin and ultra-thin [Apple: Materials] | Text on any material uses the primary or secondary token, never the quietest |
| Dimming | Over bright content, clear glass benefits from a dark dimming layer of about 35% [Apple: Materials] | A bright user wallpaper gets a scrim of up to about 0.35 behind readable UI |
| Custom backgrounds | "Reduce your use of custom backgrounds in controls and navigation elements." Let the system decide the background [Apple: Adopting Liquid Glass] | Do not give bars and the dock opaque custom fills or borders |
| Color in controls | "Be judicious with your use of color in controls and navigation." Use system colors, or a custom color with light, dark and increased contrast variants [Apple: Adopting Liquid Glass] | One accent token used sparingly, with all three variants. See the contrast checks in [iPhone guide section 6a](SPREAD_IPHONE_BUILD_GUIDE.md) |
| Sheets | Increased corner radius. Half sheets are inset from the display edge so content peeks through. When a half sheet expands to full height it becomes more opaque. Remove custom sheet backgrounds [Apple: Adopting Liquid Glass] | A Week sheet that rests at several heights should inset at the lower detents and be flush and more opaque at full |
| Detents and grabber | Sheets rest at detents. Include a grabber on any resizable sheet; tap it to cycle detents; it works with VoiceOver. Nonmodal sheets let people keep acting on the parent view [3P mirror of Apple HIG: Sheets] | Keep the Grabber, tap-to-cycle, and a slider role with keyboard control. A permanent Week sheet is a nonmodal sheet |
| Corners | Use rounded shapes concentric to their container so nested elements share a sense of curvature [Apple: Adopting Liquid Glass] | Nested radius = container radius minus padding. Do not mix unrelated radii |
| Accessibility | Test with Reduce Transparency, Increase Contrast and Reduce Motion. These remove or modify material and motion [Apple: Adopting Liquid Glass] | Reduce Transparency means opaque surfaces. Increase Contrast means stronger separators and ink. Reduce Motion means no movement |
| Scroll edges | Content scrolling under controls needs a scroll edge treatment so controls stay legible [Apple: Adopting Liquid Glass] | Fade or blur content under the dock and header |

---

## 3. What a web layer can and cannot do

Spread draws all of its UI in a WKWebView, so native bars and sheets do not behave natively on their own [Repo: [iPhone guide section 3](SPREAD_IPHONE_BUILD_GUIDE.md), [Duo guide section 3](SPREAD_IPHONE_DUO_BUILD_GUIDE.md)]. The chosen 1.0 architecture is Capacitor around the existing React planner [Repo: APP_STORE_RELEASE_PLAN.md].

- CSS `backdrop-filter` with a tinted, semi-opaque surface approximates a standard material. It is not Liquid Glass and does not get system vibrancy or the system's response to user glass settings [Rec].
- Whether `prefers-reduced-transparency` and `prefers-contrast` reach the WKWebView on the supported iOS versions is **unverified**. Test on a device and provide an in-app switch if they do not [Rec].
- True system glass, native sheets and native bars would need native views. That is a separate architecture decision, not a styling task [Rec].

The honest ceiling for the web layer is "feels native to the platform", not "is the system material".

---

## 4. How this fits Spread's existing rules

- **Unchanged:** no new colors, fonts or decorative styles in the unflagged planner [Repo: [planner/SPREAD_DESIGN_SYSTEM.md](../planner/SPREAD_DESIGN_SYSTEM.md)]. Apple's guidance is a way to use existing tokens well: hierarchy from type and spacing, one accent, hairlines.
- **Tension to resolve before using material in the planner:** `AGENTS.project.md` lists "No gradient meshes, glassmorphism, floating blobs" under its rules. That sentence sits with the landing page work, but it is written as a general rule. Blur and translucency in the planner need an explicit owner decision. The only existing exception is the flagged Studio exception for material paint (see [../README.md](../README.md), section "Studio").
- **Dark mode:** the iPhone guide's elevation ladder (lighter means higher), dimmed white text and softened accent are the same idea as Apple's materials in dark mode. Adopt them together, as tokens, not as ad hoc values [Repo: [iPhone guide section 6a](SPREAD_IPHONE_BUILD_GUIDE.md)].
- **Dynamic Type** is still an open decision in the iPhone guide. If Spread adopts system text sizes, define the type scale once (rem based) and test at 200%.

---

## 5. What makes an Apple app read as amateur

Observed in a Studio experiment on 2026-10-28 that reskinned the planner to imitate a wallpaper. It was rejected as looking like a student project. Avoid:

- Heavy outlines (about 3 px) and hard offset shadows. Apple uses hairlines and soft, low-opacity depth.
- A display typeface and custom glyphs where the system font and standard symbols belong.
- Opaque, saturated fills where material and a single tint belong.
- Decorating every element, so nothing has hierarchy.
- Decorative edges (scallops, stamps) on standard components such as sheets.
- Fonts or `@font-face` that the design rules forbid.

---

## 6. Checklist for any planner UI change

- [ ] Swap test: change the backdrop or tint and confirm layout geometry is identical.
- [ ] Squint test: blur the screenshot; the hierarchy (title, days, tasks) must still read.
- [ ] Reference test: compare against iOS Reminders, Calendar and Maps at the same state.
- [ ] Contrast: 4.5:1 body text, 3:1 large text and icons, in light, dark and increased contrast.
- [ ] Reduce Motion, Reduce Transparency, Increase Contrast, and Dynamic Type or text zoom at 200%.
- [ ] VoiceOver on any slider, sheet or drag alternative.
- [ ] Widths 390, 820, 1024 and 1366, both modes; no horizontal scroll [Repo: device guides].
- [ ] No new color, font or decorative style outside an approved, flagged exception.
- [ ] A real iPhone pass for anything that moves or blurs.
