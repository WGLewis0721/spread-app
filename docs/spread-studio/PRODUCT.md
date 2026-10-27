# Spread Studio — product specification

**Status:** Proposed experience; no features below should be represented as shipped until tested against current `main`.

## Vision

'Your Spread, your appearance.' Bring the customization freedom people associate with iOS Home Screen personalization, Android launchers, and historical jailbroken-iPhone tweaks **inside the Spread app**, without jailbreaking, replacing the system launcher, or changing Spread's planning mechanics.

The user can begin with one of four original, bundled starting looks (Personal Canvas, Retro Desk, Clear Glass, Dynamic Ink), import a personal picture, or manually adjust supported controls. Presets are editable starting values, not locked themes, personas or licensed franchises. Appearance and planning responsibilities are independent.

### Provenance of illustrative concepts (not build assets)

Explorations included: rugged industrial/workwear; polished civic office; executive parent; vintage Macintosh; anime convention; LEGO/space adventure; Toy Story; Avengers; and Atlanta Falcons. They demonstrate potential visual outcomes, **not** themes that Spread ships or labels assigned to people. Protected characters, brands, fonts, logos, sports crests, movie art, and screenshots are not included in the product simply because they were discussed.

## Experience design

A **Customize Spread** studio provides a live preview of real Spread surfaces and six groups of controls:

| Group | User control | Behavior |
| --- | --- | --- |
| Wallpaper | Import from Photos/Files; crop, position, fit, remove; optional blur/dim | Private, on-device. Show safe defaults and easy reset. |
| Colors | Palette sampled from selected wallpaper; manual accent/background/text choices | Semantic colors remain distinguishable; contrast validated and corrected. |
| Appearance | System/Light/Dark and transparency preference | Independent of artwork; respect OS accessibility settings. |
| Materials | Glass/blur intensity, matte/metal-like texture, panel opacity, shadow/depth | Effects simulated by bundled UI code, not generated executable styling. |
| Type and controls | Approved type stacks, legibility/scale, constrained component treatments and density | Preserve target sizes, information hierarchy, gestures, and focus order. |
| Motion/decorations | Bounded ornamental effects, backgrounds, subtle animations | Reduced Motion and Reduce Transparency override effects. |

**No marketplace or franchise theme store.** Four curated, original starting looks are allowed. Default Spread remains an immediate reset. Saving applies the edited look for the current profile; a multi-look personal library is still future scope.

### Example: personal Falcons wallpaper

1. User selects their own Falcons photo from Photos. Spread stores a safe local derivative and never uploads it automatically.
2. Spread samples the palette locally and suggests red, black, white and appropriate contrast.
3. User selects metallic panels, stronger type, background dimming and a glass intensity.
4. User previews actual Spread and Week screens, then taps **Apply**.
5. Changing wallpapers, restoring Original Appearance, or switching profiles never changes hours or tasks.
6. On an eligible device, user can instead say **inside Spread**: 'Match this wallpaper; give the panels a brushed-metal look and larger hour counters.' Apple local AI *proposes* control values; Spread renders a preview and user approves.

That user-supplied photo may feature a third-party mark; enabling the user to privately select it is different from bundling or advertising officially licensed NFL art. There is no automatic right to redistribute or export copyrighted assets as if owned by Spread. Require further legal/App Review review for theme sharing, public galleries, marketing, or inclusion in product bundles.

### Example: other source materials

A personal Toy Story or Avengers wallpaper can inspire colors and presentation if the user imports it. The text model can interpret requests and choose existing settings; it does **not** magically synthesize official licensed artwork or a fully working new UI. Original procedural effects and the imported image remain possible without a cloud AI artwork service.

## Separate customization from task planning

- Appearance: background, materials, fonts, colors, approved structure, profile binding.
- Responsibilities: the existing named hats, weekly hours, allocations, and tasks.
- Siri/App Intents: optional entry points into supported customization actions, not silent state changes.
- Foundation Models: optional natural-language interface over the same manual controls.
- iOS Home Screen and Focus: separate Apple-controlled system surfaces; Spread can expose optional controls/alternate bundled app icons later, but cannot restyle the entire phone.

**Do not add** a marketplace, demographic themes, AI-generated CSS/JS/components, mandatory registration, cloud model fallback, or a calendar/recurrence engine merely to implement appearance. A small local preset array is permitted. Studio can edit each element group independently: crown, responsibilities, week cards, tasks, and navigation dock. Safe treatments are Original, Outline, Ink and Glass, without replacing controls, gestures, or planner data.

## Essential workflow

Open Customize Spread → choose a starter or import wallpaper → edit supported settings → preview Spread and Week → Apply/Cancel → Reset to original. An appearance applies only to the current profile; multi-look management is not yet supported.

Manual editing is always available. On compatible devices, a visible **Describe your look** field optionally generates a *draft*, with edit/refine/apply/cancel; on unsupported devices do not show a broken AI control. Siri runs only user-invoked, capability-checked actions. The app never pretends that the Siri language model is embedded in React.

## UX invariants and accessibility

- Existing crown, day cards, task tray, free-time row, task grouping, gestures, tap alternatives, keyboard behavior and undo retain their semantics.
- Preserve readable content against arbitrary photos via dimming, scrims, opaque fallback and automatic contrast guardrails.
- Control hit targets >=44 pt-equivalent, clear focus states, VoiceOver labels, Dynamic Type/text scaling, and no status represented by color alone.
- Honor Reduce Motion, Increase Contrast, and Reduce Transparency. Fonts must be bundled/licensed; decorative background layers non-interactive.
- No surprise theme changes when switching Focus, profiles, wallpapers or between app/web; restore/cancel are visible and predictable.
- Exact iOS-style home-screen customization controls are a design inspiration, not an OS API magically made available to a React WKWebView.

## User acceptance stories

- A user without Apple Intelligence creates and saves a distinctive custom appearance solely through manual controls.
- A user imports a recognizable personal wallpaper and gets appropriate colors **without distributing branded wallpaper through the app**.
- A user can independently customize two profiles and switch without cross-profile leakage.
- With AI enabled, a user describes an appearance, previews accurate available settings, changes them and approves; AI does not hallucinate unsupported effects or silently save.
- A user can always return to unmodified Spread appearance without deleting planner data.
