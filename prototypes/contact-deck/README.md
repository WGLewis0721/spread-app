# Contact Deck — independent, investor-facing interaction build

**Status:** Isolated, working web application with fictional sample data. Not part of Spread's planner, iOS binary, or production deployment. Native Contacts/FaceTime integration is **not** implemented.

Open `index.html` in Safari or Chrome. No build step, account, or backend is needed. The app title **People.** is temporary and requires name/trademark clearance. The static preview is served from a GitHub-hosted mirror; no private user data should be entered into this experimental build.

## Concept

A tactile, photography-forward contact browser combining the clarity of modern iOS with classic Cover Flow and index-card gestures.

- **Stack:** nearly full-width cards, vertical Rolodex-style browsing. Swipe vertically or use arrow keys.
- **Fan:** a handheld spread of cards. Swipe horizontally or drag the bottom orb for accelerated scrubbing.
- **Flow:** rotating, depth-based classic Cover Flow. Swipe horizontally.
- **Appearance:** Liquid (Liquid Glass), Modern (iOS 18-era), Flat (iOS 7-era), Skeuo (iOS 6-era). These are **interpretations**, not exact reproductions or native API components. The selected mode, skin, idle preference, sort, filter, and sample favorites persist locally when storage is available.
- **Cinematic idle / Cover Flow:** after 8 seconds of inactivity, the current browsing view crossfades to pure black using a dedicated alpha-animated overlay (not an un-animatable gradient-to-solid CSS transition). Stack cycles vertically, Fan cycles horizontally with a spread, and Flow preserves the classic 3D Cover Flow rotation. Each advances every ~3.1 seconds, wakes on first touch/key press, and restores the previously selected browsing mode. **Looks → Preview Cover Flow now** previews the effect immediately; the removed top-toolbar shortcut stays removed. Auto-idle can be turned off, and animation is suppressed during search, dialogs, backgrounding and system Reduce Motion.
- **Find and organize:** search by name, company, role or email; sort by first name, surname or company; filter favorites, friends, work or family.
- **Contacts and communication:** eight **fictional** entries. Call, Message and FaceTime actions are intentionally disabled.
- **Export:** client-side PNG (1080 × 1350) using Canvas with opt-in phone and email. No upload is performed. Export uses initials rather than a photo, since third-party sample images may not be CORS safe.

## Privacy and technical boundaries

No real contacts are read, no `Contacts` permission requested, and no contacts are persisted. The sample photo source is `i.pravatar.cc`; a bundled SVG illustration is displayed when the image is unavailable. Preview photos therefore require a network connection and should be replaced with consented/local assets in a product.

This is a deliberately zero-dependency static web build suitable for product walkthroughs, **not** a shipped iOS app or a native Liquid Glass implementation. The HTML/JS are not yet componentized; before implementing production contacts access, move the app into an independently buildable and tested codebase (recommended React/TypeScript web app with a future Capacitor/Swift bridge).

Do not fold it into `src/`, `public/`, a Spread route, or Capacitor without an approved separate product/repository decision. Keep Spread's golden baseline, bundle ID and release workflow untouched.

## Reference lock

1. **Apple Cover Flow:** motion grounded in 3D perspective, focal card legibility, inertial browsing; no cloning of system visuals.
2. **Apple Liquid Glass guidance:** navigation/control layer separate from contact content. https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass
3. **Refero:** Telegram full-bleed contact hero and quick actions https://refero.design/screens/d3d2bc87-c608-46fd-9030-6a205729e626 ; iOS-style detail hierarchy https://refero.design/screens/b483ceab-814e-406d-990a-91f2a916946c
4. **21st.dev:** Card Fan Carousel, Coverflow Carousel, CardStack patterns https://21st.dev/community/components/explore/3d-carousel ; restrained glass controls https://21st.dev/community/components/explore/liquid-glass-components

These are UX references; **no third-party components or copyrighted design code were copied**. App shell and gestures are original demo code.

## Investor walkthrough

1. Start in Stack and swipe vertically to another contact.
2. Switch to Fan and Flow; continue swiping sideways. Drag Fan's bottom orb to scrub rapidly. Use Looks to compare the current skin against classic eras.
3. Open **Looks → Preview Cover Flow now**. The entire surrounding interface crossfades to black, portrait cards revolve every ~3 seconds, and reflections remain visible. Touch once to wake.
4. Search for Marcus, examine contact details, choose which fields to export, and share/save a PNG card. The phone numbers and addresses are **fictional** and calling is deliberately disabled.

**Known investor-demo risk:** remote sample photos may not load without network access. An inline illustrated fallback is intentional. Before any external pitch, verify on the actual iPhone and internet connection; physical Safari validation is still outstanding.

## Acceptance / QA

- Launch as a standalone static HTML page at iPhone 390 × 844 and desktop 1450 × 940; no page-level horizontal overflow.
- Stack switches to Fan and Flow from Looks without losing the focused contact; three modes respond to swipe/keyboard.
- Tap the focused card to open its details; tap a side card or use arrows to browse.
- Search finds Marcus, filtering limits results, sorting by company doesn't redirect selection to a different contact.
- Favorites toggle updates filters and selected count.
- Appearance changes skins without losing view or focus; settings persist locally. Sort does not unexpectedly change the current contact.
- Cinematic mode must actually crossfade to an opaque black overlay, not simply toggle a class; the preview in Looks must work. Idle animation can be switched off and respects `prefers-reduced-motion`.
- Detail sheet shows the correct selected fictional person. Nonfunctional calling actions are labeled as demo-only.
- PNG export downloads and only includes phone/email when their checkboxes are selected.
- No production route, package, configuration, tests, native code or deployment workflow changed.

### Automated browser checks

The standalone suite is in `tests/quality.spec.ts` and uses the repository's existing Playwright dependency; it never touches Spread's production data. After installing dependencies and Playwright Chromium, run:

```sh
npx playwright test --config=prototypes/contact-deck/playwright.config.ts
```

The current revision was additionally exercised with a local Python/Chromium interaction suite at 390, 402, 820, and 1450 px. The tests verified opacity progression, mode switching, sample sorting, local appearance persistence, canvas PNG download, and Reduce Motion. These checks are **not** a substitute for physical Safari/iPhone validation.

## Next engineering step (approval required)

If validated, move Contact Deck into **its own repository**. Implement native iOS ContactsUI/Contacts read permissions with limited-access flows, actual permitted photos, SwiftUI/UIKit controls, appropriate accessibility/haptics, and production-grade GPU-efficient physics. Separate Apple-era cosmetic skins from native control behavior. Do not request permissions at launch before explaining their purpose.

## UI references and design decisions (October 2026)

- User-provided: AI OS Analytics vertical full-width overlapping cards; Audio Sphere fan with a bottom orb; classic iPod Cover Flow's centered face, side perspective and black reflected floor.
- Refero: [Location by amo card stack](https://refero.design/screens/eeb7279b-3596-44fe-b675-22cf5449c366), [Suno carousel](https://refero.design/screens/51bab5f3-25fc-400c-873f-202ec2a886b3), and earlier Telegram contact portrait reference.
- 21st.dev: [3D carousel exploration](https://21st.dev/community/components/explore/3d-carousel), [Liquid Glass components](https://21st.dev/community/components/explore/liquid-glass-components). No source components copied.
- GitHub implementation references to evaluate before extraction: [react-spring](https://github.com/pmndrs/react-spring) for physics, [Embla Carousel](https://github.com/davidjerleke/embla-carousel) for inertial scrubbing, and [Motion](https://github.com/motiondivision/motion) for layout transitions. These are references, not dependencies in this standalone HTML build.
- Appearance names are era-inspired, not claims of pixel-perfect reproduction. Liquid=Liquid Glass; Modern=iOS 18-style; Flat=iOS 7-style; Skeuo=iOS 6-style.

**Verification gate:** Automated Chromium coverage is documented below. Physical iPhone Safari validation remains outstanding; do not describe browser tests as native or hardware acceptance.


## Layout regression diagnosis and verification

Baseline: PR #103 head `e9c8848d2567b0952894133347addc40fe21cadb`.
Target: the existing Contact Deck interaction and era styling, with the owner's
centering, visibility, approximately 15%-smaller-card and dock-clearance requirements.
No palette, typography, navigation or product integration redesign.

### Measured cause

- The more-specific `.screen .arena:has(.track[data-mode$="-fan"]) .contact-card`
  and equivalent Orbit selector won the cascade with `translate: -50% 0`.
  The final generic card rule supplied `top:50%` but its `translate:-50% -50%`
  lost. Fan/Flow therefore started at the stage midpoint, placing their lower
  halves below the stage and dock. This was not a JavaScript transform offset.
- The normal stage used `top:198px; bottom:120px`, while cinematic mode used
  `62px` for both. This moved the center and changed percentage-based card
  height during idle entry. Negative margins, full-screen sizing and several
  later patches obscured which geometry actually won.
- `overflow:hidden` let the screen become a programmatically scrollable
  container during focus/Looks interactions. A captured case had the arena
  displaced horizontally by 141px while the screen itself stayed at x=0.
- A generic `.screen button { position:relative }` rule also overrode the
  absolutely positioned wake layer. The feedback animations don't need that rule.

### Correction

Remove superseded sizing/offset rules rather than append an override. One shared
stage and one two-axis card anchor now apply to every view and cinematic state.
The stage starts at 152px (142px on shorter screens) and ends 99px plus the bottom
safe-area inset above the screen edge. Card dimensions are 85% of the available
unscaled bounds. Fan reserves 76px of height before scaling to clear its scrubber;
this reservation remains in cinematic mode so entering idle cannot change geometry.
Screen, stage and track clip visual overflow without becoming scroll containers.
Era border/radius/material rules and the existing transform/gesture/idle logic stay
in place. Removed main-screen controls stay removed; mode selection and preview
remain in Looks. The dock stays fixed at the bottom.

### Measurements (CSS pixels, portrait, safe-area inset 0 in Chromium)

All four skins passed the same bounds in each row. Flow uses the internal key `orbit`.
Center error is the distance between the focused card center and the usable stage center.

| Viewport | View | Before vertical center error | After card size | After top–bottom | Dock top |
| --- | --- | ---: | --- | --- | ---: |
| 402×874 | Stack | 0 | 317.9×529.5 | 198.7–728.3 | 791 |
| 402×874 | Fan | 236.3 | 294.1×464.9 | 231.0–696.0 | 791 |
| 402×874 | Flow | 236.3 | 294.1×529.5 | 198.7–728.3 | 791 |
| 393×852 | Stack | 0 | 310.2×510.8 | 197.1–707.9 | 769 |
| 393×852 | Fan | 226.9 | 286.4×446.2 | 229.4–675.6 | 769 |
| 393×852 | Flow | 226.9 | 286.4×510.8 | 197.1–707.9 | 769 |

After: center error below 1px on both axes (acceptance allows 5%); focused cards
and their action rows stay inside the stage. Fan orb clearance is at least 11px.
Idle entry is sampled during the crossfade: stage/card x, y, width and height vary
by less than 1px, and the card DOM node is preserved. Auto-advance and first-touch
wake are checked separately in all three views.

### Repeatable evidence

The Playwright suite now uses the actual Looks/search/export controls. It covers
24 viewport/view/skin combinations, console/page errors, containment, dock/orb
clearance, 85% sizing, idle-entry stability, automatic advancement, depth fading,
wake, search/sort/favorites/export and Reduced Motion. Each geometry case writes
`normal.png`, `idle.png` and `geometry.json` in its Playwright output directory.
`CONTACT_DECK_SHOTS` may select an artifact directory; `PW_CHROME` may select an
installed Chromium binary. Both are optional. Before-edit screenshots and computed
style/bounds were captured for the full 24-case matrix.

To demonstrate the regression, `CONTACT_DECK_SOURCE` can point to the old standalone
HTML from the baseline commit. The 402×874 Fan case fails with measured center
error 236.3px versus the allowed 27.8px; the corrected source passes.

Final validation: **27/27 Playwright tests passed**; inline JavaScript syntax,
focused ESLint, repository typecheck and production build passed. Only this
prototype folder changed. No merge or deployment was performed.

Physical Safari, nonzero hardware safe-area insets, landscape and device Contacts
access are not validated by this suite. Remote portraits are deliberately replaced
with failed image decoding during tests to exercise the existing illustrated
fallback without network dependency; no sample-image service availability is claimed.
