# Contact Deck review preview

`three-action.html` is the working, standalone browser preview for draft PR #104. The original `index.html` remains the approved visual reference and is unchanged. A separate [SwiftUI project](../../native/ContactDeck/README.md) now implements the native app; this browser preview is not the installed app.

## Try it

Swipe in Stack, Fan or Flow: the cards follow your finger and settle with a 0.84-damped spring. Tap the focused card to flip it; its actions call up an optional note or share a vCard. Hold without moving to select; drag only after the hold to group. A swipe cancels the hold. Selection also has a tap path in Sort → Select focused card and each card's options menu. Browse gestures never remove records.

Search names, phone numbers and companies; sort or shuffle with Undo; create decks; review removal; merge only exact nonconflicting duplicates with Undo. Choose “A little hello” in the deck menu for up to three favorite suggestions. Marking a reach-out or snoozing is explicit. Opening a calling app never claims that a conversation happened. Notes, favorites, decks, reach-outs and preferences persist only on this browser/device when storage is available.

Views contains Stack/Fan/Flow and optional cinematic idle; idle is off by default. Appearance follows system Light/Dark only. No era/theme selector. Reduce Motion removes spatial travel and reflections. Dialogs contain keyboard focus and return it on dismissal; inert mirror copies cannot receive input or accessibility focus. Rendering stays at the focused contact plus at most three neighbors on each side.

All browser contacts, duplicate fixtures and call history are fictional. It cannot read device contacts, make calls, charge money or import iOS Phone history. The Complete sheet only explains the native unlock. Native uses the system picker, SwiftData, native action handoffs, StoreKit verified nonconsumable entitlements, and persistent soft removal. Optional sync is unavailable and excluded from purchase copy.

## Verification

From the repo root: `npx playwright test --config=prototypes/contact-deck/playwright.config.ts three-action.spec.ts motion.spec.ts floor.spec.ts --project=mobile-chromium`. `PW_CHROME` can select an existing Chromium executable; CI installs Playwright's supported browser. Floor tests require painted reflections, a continuous idle anchor, matching mirror geometry and no reflection under the dock at five phone/tablet sizes. Motion tests exercise real pointer movement, cancellation and holds, keyboard alternatives, persistence, reconnection, and Light/Dark geometry at 390×664, 393×852, 820×1180 and 1024×768. Screenshot attachments are uploaded with the workflow result. Before/after comparison uses PR takeover SHA `e1f8869`.

Automated browser checks do not establish physical Safari, native 60fps, haptics, VoiceOver, purchase/revocation/restore or subjective parity with Apple Music/Wallet, Life360 or Telegram. The native README records those release gates. The native onboarding timing test measures the visible welcome-to-useful-deck journey; XCTest/debugger attachment and physical cold-launch latency are separate. No merge, deployment, TestFlight upload or production contact mutation is authorized. Branch-specific Vercel automatic deployment is disabled.
