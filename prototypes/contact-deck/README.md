# Contact Deck — iOS interaction prototype

**Status:** Isolated, fictional-data prototype. Not part of Spread's planner or iOS binary. Not production-ready.

Open `index.html` in a browser. No build step, accounts, backend, or dependencies. The app title **People.** is temporary and requires name/trademark clearance.

## Concept

A tactile, photography-forward contact browser combining the clarity of modern iOS with classic Cover Flow and index-card gestures.

- **Stack:** vertical Rolodex-style browsing. Swipe vertically or use arrow keys.
- **Fan:** a handheld spread of cards. Swipe horizontally.
- **Orbit:** rotating, depth-based Cover Flow. Swipe horizontally.
- **Orientation:** independently toggle face-forward vs. edge-forward. Tapping an edge-forward card reveals the face; tapping again opens details.
- **Appearance:** Current, iOS 18, iOS 7, iOS 6. These are **interpretations**, not exact reproductions or native API components.
- **Idle motion:** advances every few seconds after inactivity; disabled during dialogs, search and system Reduce Motion.
- **Find and organize:** search by name, company, role or email; sort by first name, surname or company; filter favorites, friends, work or family.
- **Contacts and communication:** eight **fictional** entries. Call, Message and FaceTime actions are intentionally disabled.
- **Export:** client-side PNG (1080 × 1350) using Canvas with opt-in phone and email. No upload is performed. Export uses initials rather than a photo, since third-party sample images may not be CORS safe.

## Privacy and technical boundaries

No real contacts are read, no `Contacts` permission requested, and no contacts are persisted. The sample photo source is `i.pravatar.cc`; a bundled SVG illustration is displayed when the image is unavailable. Preview photos therefore require a network connection and should be replaced with consented/local assets in a product.

This demo is an intentionally dependency-free HTML/CSS/JavaScript exploration, **not** a shipped iOS app and not a native Liquid Glass implementation.

Do not fold it into `src/`, `public/`, a Spread route, or Capacitor without an approved separate product/repository decision. Keep Spread's golden baseline, bundle ID and release workflow untouched.

## Reference lock

1. **Apple Cover Flow:** motion grounded in 3D perspective, focal card legibility, inertial browsing; no cloning of system visuals.
2. **Apple Liquid Glass guidance:** navigation/control layer separate from contact content. https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass
3. **Refero:** Telegram full-bleed contact hero and quick actions https://refero.design/screens/d3d2bc87-c608-46fd-9030-6a205729e626 ; iOS-style detail hierarchy https://refero.design/screens/b483ceab-814e-406d-990a-91f2a916946c
4. **21st.dev:** Card Fan Carousel, Coverflow Carousel, CardStack patterns https://21st.dev/community/components/explore/3d-carousel ; restrained glass controls https://21st.dev/community/components/explore/liquid-glass-components

These are UX references; **no third-party components or copyrighted design code were copied**. App shell and gestures are original demo code.

## Acceptance / QA

- Launch as a standalone static HTML page at iPhone 390 × 844 and desktop 1450 × 940; no page-level horizontal overflow.
- Stack switches to Fan and Orbit without losing the focused contact; three modes respond to swipe/keyboard.
- Edge-forward card rotates left; tap to face and tap again to expand.
- Search finds Marcus, filtering limits results, sorting by company doesn't redirect selection to a different contact.
- Favorites toggle updates filters and selected count.
- Appearance changes skins without losing view or focus; idle animation can be switched off and respects `prefers-reduced-motion`.
- Detail sheet shows the correct selected fictional person. Nonfunctional calling actions are labeled as demo-only.
- PNG export downloads and only includes phone/email when their checkboxes are selected.
- No production route, package, configuration, tests, native code or deployment workflow changed.

## Next engineering step (approval required)

If validated, move Contact Deck into **its own repository**. Implement native iOS ContactsUI/Contacts read permissions with limited-access flows, actual permitted photos, SwiftUI/UIKit controls, appropriate accessibility/haptics, and production-grade GPU-efficient physics. Separate Apple-era cosmetic skins from native control behavior. Do not request permissions at launch before explaining their purpose.
