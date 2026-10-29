# Contact Deck: Three-Action Preview

This is an **isolated working interaction experiment**, not a production iOS app or replacement for the approved `index.html`. Open `three-action.html` to try it. It builds on the exact Contact Deck Stack, Fan, Flow, card geometry, and reflection behavior from `experiment/contact-deck-prototype` without modifying the original.

## Working features in this preview

- **Flip:** tap the focused card to turn it over; tap Flip back to return. The backside exposes contact details and vCard sharing.
- **Search:** tap search, type a name, phone number or company, tap a result; only the nearby card window is rendered.
- **Sort or shuffle:** tap Sort, choose name/company or Shuffle; Shuffle shows a working Undo control.
- **Create a deck:** hold and drag a card onto another to name a new visual deck. Accessible fallback: hold a card, tap Move, choose Create new deck.
- **Move to a deck:** hold a card, tap Move, select a deck. The collection name above the stage opens a list of decks.
- **Bulk cleanup:** hold to select, tap additional visible cards, choose Delete, review and confirm. The removal is fictional/demo-only and shows Undo.
- **Find duplicate contacts:** Sort > Review duplicates shows intentionally duplicated sample records. Exact nonconflicting samples can merge with Undo. Conflicting fields must not be auto-merged.
- **History:** the History tab provides explicitly labeled, searchable fictional call records. It cannot import iOS Phone's historical calls.
- **Appearance:** system Light and Dark Mode only. The old era skins are not selectable.
- **Performance:** card rendering is limited to the focused contact and its three nearest neighbors on either side. The searchable list includes every sample record.

## Safety and boundaries

All records, including the duplicate fixtures and call log, are **fictional**. Contact preferences, deletions, and visual decks are saved locally only if browser storage is permitted. No device contact is loaded or modified. The preview cannot make real calls or read the native Phone call log. vCard export is a real locally generated file; real system sharing is available only if the browser supports it. The approved `prototypes/contact-deck/index.html` remains unchanged.

## Interaction constraints

A tap, swipe, hold, drag, or text-entry session counts as an action. Three actions is a target for the common case, not an unsafe guarantee for multi-select, complex conflict resolution, system permission dialogs, or external sharing flows. Browsing gestures never delete cards: selection is entered by an intentional hold. All removal requires review. Undo is available after destructive changes to the fictional collection. A custom accessibility alternative is needed in the native app, including VoiceOver, native pointer/haptics, and keyboard controls.

## Checks

Run from the repository root after `npm ci` and Playwright Chromium installation:

```sh
npx playwright test --config=prototypes/contact-deck/playwright.config.ts three-action.spec.ts --project=mobile-chromium
```

The new tests cover Search, Sort, Shuffle/Undo, Flip, contextual selection, review/delete/Undo, groups, duplicate merge/Undo, vCard download, History, and system appearance. The legacy prototype tests still run against unchanged `index.html`. Physical iPhone touch, native Contacts permission/write APIs, safe deletion against synced accounts, real haptics, App Store compliance, and Duo fold testing are **not verified or implemented** here.

## Production implementation gates

1. Split this no-dependency interaction demo into a Contact Deck-owned app/repository. Keep Contact Deck independent of Spread's production routes and bundle identifier.
2. Use `CNContactStore` and appropriate permissions for real contact reads, groups and mutations; persist deck metadata by stable identifiers with migration and recovery.
3. Confirm deletion backup/recovery and provider semantics before enabling native writes; ensure real multiple-field duplicate conflicts are shown and resolved without data loss.
4. Source real call history only from authorized, supported data; iOS Phone history should remain explicitly unavailable otherwise.
5. Tune animations and haptics on device while preserving Stack, Fan, Flow, reflected idle cards, Reduced Motion and consistent system Light/Dark modes.
6. Run small UX sessions: no accidental deletions, understandable gestures, and fast completion of common tasks without teaching.

**Not approved:** merge, deployment, TestFlight upload, Contacts permission prompts, or production data changes.
