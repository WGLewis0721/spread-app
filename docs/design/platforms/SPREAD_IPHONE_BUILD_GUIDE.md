# Spread on iPhone: build guide

Researched 2026-10-21 from developer.apple.com, the Spread repo docs, and GitHub. This file covers single-screen iPhone and holds the **shared baseline** that applies to every device. iPad is in `SPREAD_IPAD_BUILD_GUIDE.md`. iPhone Duo is in `SPREAD_IPHONE_DUO_BUILD_GUIDE.md`.

Evidence tags used below:

- **[Apple]** read on a developer.apple.com page.
- **[Repo]** taken from the Spread docs (`DESIGN.md`, the unified UX plan and result, the promo docs).
- **[3P]** third-party source, not verified by Apple. Treat as a lead.
- **[Rec]** a recommendation, not a fact.

Spread is a Capacitor app: the planner runs in one WKWebView and `ios/App/CapApp-SPM` is the native shell [Repo].

---

## 1. Shared baseline (applies to iPhone, iPad, and iPhone Duo)

### Toolchain and submission

- [ ] Build with **Xcode 26 or later using the iOS 26 or iPadOS 26 SDK**. This has been required for App Store Connect uploads since April 28, 2026 [Apple].
- [ ] Deployment target: Apple requires iOS 13 or later for uploads since September 9, 2026 [Apple]. Spread targets iOS 17 (merged in #23) [Repo], which is fine.
- [ ] For iPhone Duo support use **Xcode 27.1** (iOS 27.1 SDK). Apple's October 5 post tells developers to recompile with it. I could not confirm whether 27.1 is final or beta, so check developer.apple.com/xcode before pinning CI [Apple].
- [ ] **Privacy manifest**: apps that use required-reason APIs without declaring approved reasons are rejected by App Store Connect. This covers third-party SDKs too, so check Capacitor core and every plugin [Apple]. Spread's current manifest has not been audited.
- [ ] Answer the updated **age rating** questions in App Store Connect (new system effective January 31, 2026) [Apple].
- [ ] If you distribute in the EU, provide **DSA trader status** [Apple].
- [ ] Complete **App Privacy** in App Store Connect. Spread's story is "No account. On your device. At your pace." [Repo]. Declare only what is true.

### Capacitor

- [ ] Official Capacitor plugins are on **Capacitor 8** [GitHub: ionic-team/capacitor-plugins]. Haptics, Keyboard, Filesystem, Camera, Geolocation and Local Notifications now live in separate repos. Match the plugin major to your installed Capacitor major.
- [ ] After adding a native dependency run `npm run ios:sync`. This updates `ios/App/CapApp-SPM/Package.swift` [Repo]. CI's iOS simulator job proves it compiles.
- [ ] Capacitor treats native projects as source artifacts [GitHub: README]. Generated-project tools (Tuist, XcodeGen) would likely fight `cap sync` [Rec]. Skip them.

### Repo rules that always hold [Repo]

- No new colors, fonts, or decorative styles. Use existing tokens in `src/styles.css`.
- Do not touch: `src/lib/spread/` cloud, sync, backup, merge, restore, pins, consent, safety, rollback, native-mirror, schema files; `ios/App/App/Cloud/**`; `ios/App/SpreadCloudCore/**`; `server/`; the landing page (`UnlockScreen`, `landing-*.tsx`, the "Landing page only" block of `styles.css`); any `golden/*` branch.
- All task changes go through `store.ts` actions and `commit`. No second store.
- Cloud behavior stays flagged off. Never show iCloud success without a native acknowledgment.
- Add every new test file to the explicit `test:spread` list and raise `--min`.
- `DESIGN.md` is the landing page only. Do not use it for planner decisions.

---

## 2. What iPhone is, per Apple

**[Apple: Designing for iOS]**

- Medium, high-resolution display. Held in one or both hands. Viewing distance usually a foot or two. People switch between portrait and landscape.
- Inputs: Multi-Touch gestures, virtual keyboard, voice.
- Sessions can be a minute or two or an hour. People keep several apps open.
- Best practices to apply:
  - Limit onscreen controls. Make secondary actions discoverable with minimal interaction.
  - Adapt to orientation, Dark Mode, and Dynamic Type.
  - Reachability: middle and bottom controls are easiest. Support swipe to go back and swipe actions on list rows.

**Size classes on iPhone** [Apple: Prepare your app for iPhone Duo talk]: iPhones are regular vertical and compact horizontal in portrait, and compact in both in landscape.

---

## 3. Layout instructions

Spread draws all of its UI in the web layer, so Apple's native bar and sheet behaviors do not apply automatically [Apple: developer overview; Rec].

- [ ] Viewport meta includes `viewport-fit=cover`. Without it `env(safe-area-inset-*)` resolves to zero [3P: iphoneduosupport.com].
- [ ] Apply insets **per side**: `padding-left: env(safe-area-inset-left)` and `padding-right: env(safe-area-inset-right)`. Never reuse one side's inset for both [Apple: asymmetric insets guidance; 3P for the CSS form].
- [ ] Keep interactive controls inside the safe area. Let background art extend past it [Apple].
- [ ] Decide layout from available **width and aspect ratio**, not device sniffing [Apple: Layout HIG says use size classes, not device type or orientation].
- [ ] Do not hardcode screen sizes or `bounds.height == 844` style checks [Apple].
- [ ] Spread view stays a list. Week view is the sequence of days. Keep the same functionality at every width; vary only how much is visible [Apple: Layout; Repo].
- [ ] No horizontal page scroll at any width [Repo].
- [ ] Verify at **390 wide** (phone) in light and dark, with reduced motion on [Repo].

---

## 4. Interaction instructions

### Task drag and drop (plan item 4.9) [Repo]

- Tasks can only be placed on an allocation of **their own role** in the **current week**. Wrong role, other week, missing allocation, or a done task is refused with a clear message.
- Touch drag uses `HoldPointerSensor` (touch hold). Handles are `touch-none` with 44pt targets.
- Primary accessible path: **Move to...** sheet listing eligible days plus **Not scheduled**. Drag is the shortcut.
- Add dnd-kit `KeyboardSensor` and `accessibility.announcements`.
- **Not today** clears `allocationId`. The task stays in its role and shows in **To place**.
- Undo covers task drags and allocation drags (in-memory stack of 10, stale-undo guard).

### What Apple adds [Apple: Drag and drop HIG]

- [ ] Offer an alternative to drag. Spread's Move to sheet satisfies this.
- [ ] Prefer undo. Spread's 4.1 satisfies this.
- [ ] Show whether a destination can accept the drop, and only while the item is over it. Valid targets highlight, invalid ones do not.
- [ ] On an invalid or failed drop, give visual feedback: return the item to its source or fade it out. **Spread's plan only shows a toast. Add the snap-back** [Rec].
- [ ] The drag image should appear after about three points of movement. Check the dnd-kit activation distance.

---

## 5. Haptics (plan item 4.4)

**What Spread does** [Repo]: native-only lazy import of `@capacitor/haptics`, light impact on completion only, skipped under reduced motion, single-flight guard, errors swallowed, completion never awaits it.

**What Apple says** [Apple: Playing haptics HIG; UIKit docs]:

- Use system patterns according to their documented meaning. Impact means a collision between UI objects. **Notification success means a task or action completed.** Completing a task fits success better than light impact [Rec: consider switching or test both on device].
- Use haptics consistently and avoid overuse.
- **Make haptics optional.** Spread currently only skips under reduced motion. Add an in-app toggle [Rec].
- UIKit feedback generators do not play when the system Haptics setting is off [Apple].
- Haptics are not for drag. Plan keeps drag silent. Keep it that way.

Feel on a device is unverified until tested on hardware [Repo].

---

## 6. Accessibility and appearance

- [ ] **Dark Mode**: Spread supports system and manual themes using tokens [Repo]. Test both. Palette rules are in section 6a. They apply to iPad and iPhone Duo as well.
- [ ] **Dynamic Type**: the HIG says apps that ignore it can be unusable for some people [Apple]. A Capacitor `text-zoom` plugin exists [GitHub]. Decide whether Spread should honor system text size [Rec].
- [ ] **VoiceOver**: provide the Move to sheet and drag announcements as the accessible path [Repo; Apple].
- [ ] Reduced motion: no orbit, no scroll effects on landing; planner animations respect the setting [Repo].
- [ ] Touch targets 44pt [Repo].

### 6a. Dark palette rules (shared by iPhone, iPad and Duo)

Source: an Instagram carousel by @appbrainy ("Dark mode is not #000000"), a 3P design post, adapted here. Its numbers follow Material Design (dp elevations, `#121212`, `#BB86FC`), not Apple's. I recomputed every contrast ratio below with the WCAG formula and they match the post. The principles transfer. The exact hex values are a starting point to test against Spread's tokens, not a spec [3P; Rec].

**1. Base surface.** The post says start at `#121212`, not pure `#000000`. Pure black next to white text vibrates, and cards on pure black need borders to read as surfaces.
- Apple's own dark mode uses true black as the base on iPhone and lifts elevated surfaces above it [Apple knowledge, not re-verified this session]. So do not copy `#121212` blindly. Try both in the iPhone WKWebView on a real OLED screen and pick one [Rec].
- Whichever base you pick, define it once as a token and derive cards and sheets from it.

**2. Elevation: lighter means higher.** In dark mode shadows barely show, so a surface gets lighter as it rises. The post's ladder, with overlay steps from the Material scale:

| Level | Hex | Use |
| --- | --- | --- |
| 0dp | `#121212` | base |
| 1dp | `#1E1E1E` | cards |
| 4dp | `#272727` | app bar |
| 8dp | `#2E2E2E` | menus |
| 24dp | `#383838` | dialogs |

Spread mapping [Rec]: day cards = 1dp, header and tab area = 4dp, Move to sheet and menus = 8dp, modal dialogs = 24dp. The To place tray and Move to sheet should read clearly above the Week grid. Define these as 4 or 5 surface tokens, not ad hoc grays.

**3. Text: dim your white.** Pure white on dark glares and causes halation.

| Role | Hex | Opacity | Contrast on `#121212` |
| --- | --- | --- | --- |
| Headlines and body | `#E0E0E0` | 87% | 14.2:1 |
| Secondary | `#A0A0A0` | 60% | 7.2:1 |
| Disabled only | `#6C6C6C` | 38% | 3.6:1 |

- Disabled text at 3.6:1 is below the 4.5:1 AA threshold for body text. Use it only for genuinely disabled controls, never for hints, timestamps or status lines the person needs to read [Rec].
- Spread's status rows (saved on device, backup, sync, plan item 4.8) must use secondary or better, not disabled.

**4. Accent: soften it.** A saturated accent that works on light vibrates on dark. The post's example: `#6200EE` on `#121212` is 2.5:1 (fails). `#BB86FC` is 7.1:1 (passes).
- Spread's blue `#0A84FF` is already Apple's dark-mode system blue. I measured it at **5.1:1 on `#121212`** and 5.8:1 on `#000000`, so it passes AA for text on both bases [Rec: computed].
- Spread's light-mode blue and the landing page's other accents (sage `#DCE6D6`, peach `#F1DFCF` from the marketing palette) need their own dark variants. Check each role color the same way, since the promo film notes the Health role color already mismatches between app (blue) and film (purple `#5856D6`) [Repo]. `#5856D6` on `#121212` needs checking before it is used as text or an icon in dark mode.
- On filled buttons the post uses dark text on the soft accent. Check which pairing Spread's primary button needs.

**5. Error.** The post's cheat sheet uses a desaturated red `#CF6679` instead of a bright red. Apply the same rule to Spread's error and destructive colors [3P].

**Cheat sheet from the post** (all 3P, Material-based):

| Token | Hex |
| --- | --- |
| base | `#121212` |
| cards 1dp | `#1E1E1E` |
| app bar 4dp | `#272727` |
| menus 8dp | `#2E2E2E` |
| dialogs 24dp | `#383838` |
| text 87% | `#E0E0E0` |
| secondary 60% | `#A0A0A0` |
| disabled 38% | `#6C6C6C` |
| primary | `#BB86FC` (Spread would use its blue instead) |
| error | `#CF6679` |

**Dark palette checklist**
- [ ] Decide base: `#121212` or true black. Test on a physical OLED iPhone.
- [ ] Define surface tokens for base, card, header, menu and sheet, and dialog.
- [ ] Replace any pure white text with an 87% white token. Replace secondary text with a 60% token.
- [ ] Limit the disabled token to disabled controls.
- [ ] Measure every role color (Responsibilities, Hours, Week, Tasks, Health) against the chosen base. Target 4.5:1 for text, 3:1 for large text and icons.
- [ ] Give the landing-page palette (sage, peach, paper) dark variants or keep the marketing page light-only. Decide in the design pass.
- [ ] Verify the Move to sheet and To place tray read as raised surfaces in dark mode.
- [ ] Re-check at 390, 820, 1024 and 1366 wide in light and dark, then on devices.

---

## 7. Status honesty (plan item 4.8) [Repo]

Show three separate states: saved on this device, backup, sync. With cloud flags off, no cloud row appears. Record `lastSavedAt` only on a confirmed write.

---

## 8. App Store assets for iPhone

**Screenshot sizes** [Apple: Screenshot specifications]:

| Display | Size (portrait / landscape swapped) | Required |
| --- | --- | --- |
| iPhone with Dynamic Island, medium (iPhone 17, 17 Pro, 18 Pro and similar) | 1179 x 2556 or 1206 x 2622 | At least one |
| iPhone with Dynamic Island, large (Air, Pro Max, Plus) | 1260 x 2736, 1290 x 2796 or 1320 x 2868 | Optional; scaled from Face ID large if absent |

PNG or JPEG, no alpha, 1 to 10 per size. If your UI is the same across sizes you only need the largest resolution; App Store Connect scales down.

**Marketing**:

- The promo film (storyboard v2, status doc) is for the site and social. My understanding is that Apple's app previews must be screen captures from the app itself; I did not read the app preview specification, so check it before planning a store video [Repo; Rec].
- Product bezels for iPhone 18, 17, and 16 are in Apple Design Resources [Apple]. Review the marketing guidelines before using them.
- **Open decision from the promo status doc**: the shipping app shows the Health role in blue; the film token is purple (`#5856D6`). Store screenshots must show what ships, so resolve this before capturing [Repo].

---

## 9. Test matrix and gates

Run before any PR [Repo]:

- [ ] `npm run typecheck`
- [ ] `npm run lint` (no new errors)
- [ ] `npm run test:spread`
- [ ] `npm run test:scripts`
- [ ] `npm run build`
- [ ] `sh scripts/ios-bridge-sim/run-all.sh` if Chromium is available

Browser checks (Chromium, Playwright): 390 wide, light and dark, reduced motion, mouse and touch hold, no overflow.

**Owed on a physical iPhone** [Repo]: touch-hold drag, completion haptic feel, Airplane Mode offline pass, VoiceOver pass. Headless mouse drag could not run in the last pass, and the existing allocation drag fails the same way, so real-device drag is the proof.

---

## 10. Open items

- Haptic pattern: light impact (current) or notification success (HIG-aligned). Decision D3 also covers adding `@capacitor/haptics` 8.x [Repo].
- Privacy manifest audit not done.
- Dynamic Type support not decided.
- Health role color across app, site, and film.
- Xcode 27.1 final or beta status.

---

## 11. Apple HIG pages to read for iPhone

Base URL: `https://developer.apple.com/design/human-interface-guidelines/<slug>` (append `.md` for plain text).

- Platform: `designing-for-ios`
- Foundations: `layout`, `accessibility`, `dark-mode`, `color`, `typography`, `motion`, `app-icons`, `privacy`, `writing`
- Patterns: `drag-and-drop`, `undo-and-redo`, `feedback`, `playing-haptics`, `modality`, `onboarding`, `launching`, `loading`, `settings`
- Components: `sheets`, `action-sheets`, `alerts`, `buttons`, `steppers`, `lists-and-tables`, `web-views`, `toolbars`, `tab-bars`
- Inputs: `gestures`, `virtual-keyboards`
- Not yet read in full: `web-views`, `sheets`, `modality`, `accessibility`

Downloads in Apple Design Resources (iOS 27 and iPadOS 27 UI Kit in Figma and Sketch, App Icon Template, SF Symbols 27, Icon Composer): https://developer.apple.com/design/resources/

---

## Sources

- https://developer.apple.com/news/upcoming-requirements/
- https://developer.apple.com/design/human-interface-guidelines/designing-for-ios.md
- https://developer.apple.com/design/human-interface-guidelines/layout.md
- https://developer.apple.com/design/human-interface-guidelines/drag-and-drop.md
- https://developer.apple.com/design/human-interface-guidelines/playing-haptics.md
- https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/impactoccurred().md
- https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/news/?id=kkphp5qo
- https://developer.apple.com/videos/play/tech-talks/111461/
- https://developer.apple.com/design/resources/
- https://github.com/ionic-team/capacitor-plugins
- https://github.com/ionic-team/capacitor
- https://iphoneduosupport.com/frameworks/capacitor/ (third party)
