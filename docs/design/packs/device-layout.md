# Pack: device layout (iPhone, iPad, iPhone Duo)

> Part of the Spread design brain. Start at [../README.md](../README.md). Tier 2 pack: a digest, not the source. The rules card applies on top.

**Use when:** you change layout, safe areas, widths, sheets that move, the dark palette, or App Store screenshots. For look and feel use [apple-native-feel.md](apple-native-feel.md).

Evidence tags: `[Repo]` binds, `[Apple]` is fact, `[3P]` and `[Rec]` are leads.

## Facts to work from

**One layout rule for every device.** Decide layout from available width and aspect ratio, never device model or `maxTouchPoints`. Same functionality at every width; only how much is visible changes. Spread view stays a list. No horizontal page scroll. `[Apple][Repo]`

**Safe areas.**
- Viewport meta needs `viewport-fit=cover`, or `env(safe-area-inset-*)` is zero.
- Apply insets per side. Never reuse one side's inset for both.
- Controls stay inside the safe area; background art may extend past it.
- No hardcoded screen sizes.

**Widths to test:** 390 phone, 820 and 1024 iPad, 1366 large iPad, 1440 landing. Both modes, reduced motion.

**iPad.** Size classes vary with window and multitasking. Resizing must be non-destructive. Do not put critical controls where window controls appear. Wide windows show more of the week, not stretched cards. Test the smallest and largest windows first. Spread is single window today; multiple windows are out of scope. `[Apple][Repo]`

**iPhone Duo.**
- Spread draws its chrome (header, bottom nav, sheets) in the web layer, so Apple's automatic Duo behaviors for native bars and sheets do not apply. Keep web chrome for v1, honor the safe area, treat vertical native bars as a later decision. `[Rec]`
- A WKWebView resizes with the window, reflows CSS and container queries on unfold, and reports safe-area insets. The hinge, reserved regions and scene accessories have no web API. `[3P: verify in simulator]`
- Fold: keep each day row inside one region. Scrolling lists do not displace. Anchor sheets to an edge or the trailing region so they never straddle the fold. Keep the To place tray and drag handles clear of the fold. In grids prefer an even column count. `[Apple][Rec]`
- Duo needs Xcode 27.1; the status of 27.1 was unconfirmed when written.

**Toolchain.** Xcode 26 or later with the iOS 26 SDK for uploads. Spread targets iOS 17. After a native dependency change run `npm run ios:sync`. `[Apple][Repo]`

**Dark palette (a recommendation, not adopted).** Lighter means higher. Start from a base token and derive cards and sheets from it. Spread's dark canvas is `#000000` today. Try `#121212` against pure black on a real OLED before changing. White text at 87% and 60%. Soften the accent in dark; `#0A84FF` is 5.1:1 on `#121212`. Define the ladder as tokens, never as ad hoc values. `[3P][Rec]`

**App Store screenshots** (PNG or JPEG, no alpha, 1 to 10 per size):
- iPhone: 1179x2556 or 1206x2622 (medium); larger sizes optional.
- iPad: 2064x2752.
- Duo outer 1398x2034, inner 2007x2853. Duo screenshots become required in April 2027 for apps on the 27.1 SDK.
- Open: the shipping Health role is blue; the film token is purple. Store screenshots must show what ships.

## Checklist
- [ ] Layout switches on width and aspect ratio only.
- [ ] Per-side insets; `viewport-fit=cover` present.
- [ ] 390, 820, 1024, 1366 checked, light and dark, reduced motion.
- [ ] Sheets and drag targets clear of any fold; no horizontal scroll.
- [ ] Typecheck, lint, `test:spread`, `test:scripts`, build.
- [ ] Owed on a physical device: touch-hold drag, haptic feel, offline pass, VoiceOver, blur performance.

## Read deeper only if needed
- `platforms/SPREAD_IPHONE_BUILD_GUIDE.md#3. Layout instructions`: iPhone layout checklist.
- `platforms/SPREAD_IPHONE_BUILD_GUIDE.md#6. Accessibility and appearance`: dark palette ladder and contrast checks.
- `platforms/SPREAD_IPHONE_BUILD_GUIDE.md#9. Test matrix and gates`: the commands and what is owed on device.
- `platforms/SPREAD_IPAD_BUILD_GUIDE.md#3. Layout and multitasking instructions`: size classes and multitasking.
- `platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md#4. Layout instructions`: safe areas, resize logic, fold.
- `platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md#11. Do and do not summary`: quick reference for Duo.
