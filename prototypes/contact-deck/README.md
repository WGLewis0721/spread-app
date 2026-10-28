# Contact Deck — independent, investor-facing interaction build

**Status:** Isolated, working web application with fictional sample data. Not part of Spread's planner, iOS binary, or production deployment. Native Contacts/FaceTime integration is **not** implemented.

Open `index.html` in Safari or Chrome. No build step, account, or backend is needed. The app title **People.** is temporary and requires name/trademark clearance. The static preview is served from a GitHub-hosted mirror; no private user data should be entered into this experimental build.

## Concept

A tactile, photography-forward contact browser combining the clarity of modern iOS with classic Cover Flow and index-card gestures.

- **Stack:** vertical Rolodex-style browsing. Swipe vertically or use arrow keys.
- **Fan:** a handheld spread of cards. Swipe horizontally.
- **Orbit:** rotating, depth-based Cover Flow. Swipe horizontally.
- **Orientation:** independently toggle face-forward vs. edge-forward. Tapping an edge-forward card reveals the face; tapping again opens details.
- **Appearance:** Current, iOS 18, iOS 7, iOS 6. These are **interpretations**, not exact reproductions or native API components. The selected mode, orientation, skin, idle preference, sort, filter, and sample favorites persist locally when storage is available.
- **Cinematic idle / Cover Flow:** after 8 seconds of inactivity, the current browsing view crossfades to pure black using a dedicated alpha-animated overlay (not an un-animatable gradient-to-solid CSS transition). The 3D photo carousel advances every ~3.1 seconds, wakes on first touch/key press, and restores the previously selected browsing mode. The **▶** button near the contact count previews the effect immediately; **Looks → Preview Cover Flow now** is an alternative. Auto-idle can be turned off, and animation is suppressed during search, dialogs, backgrounding and system Reduce Motion.
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
2. Switch to Fan and Orbit; continue swiping sideways. Use Looks to compare the current skin against classic eras, and toggle face/edge-forward.
3. Tap **▶** next to the contact count. The entire surrounding interface crossfades to black, portrait cards revolve every ~3 seconds, and reflections remain visible. Touch once to wake.
4. Search for Marcus, examine contact details, choose which fields to export, and share/save a PNG card. The phone numbers and addresses are **fictional** and calling is deliberately disabled.

**Known investor-demo risk:** remote sample photos may not load without network access. An inline illustrated fallback is intentional. Before any external pitch, verify on the actual iPhone and internet connection; physical Safari validation is still outstanding.

## Acceptance / QA

- Launch as a standalone static HTML page at iPhone 390 × 844 and desktop 1450 × 940; no page-level horizontal overflow.
- Stack switches to Fan and Orbit without losing the focused contact; three modes respond to swipe/keyboard.
- Edge-forward card rotates left; tap to face and tap again to expand.
- Search finds Marcus, filtering limits results, sorting by company doesn't redirect selection to a different contact.
- Favorites toggle updates filters and selected count.
- Appearance changes skins without losing view or focus; settings persist locally. Sort does not unexpectedly change the current contact.
- Cinematic mode must actually crossfade to an opaque black overlay, not simply toggle a class; a one-tap preview must work. Idle animation can be switched off and respects `prefers-reduced-motion`.
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
