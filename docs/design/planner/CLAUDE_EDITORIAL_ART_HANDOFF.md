# Claude handoff: Life editorial card artwork

> Part of the [Spread design brain](../README.md). The [visual design sheet](SPREAD_LIFE_CARD_ART_DIRECTION.md) owns art direction; the [implementation spec](../specs/2026-11-10-life-card-visual-implementation.md) owns UX, verification and release gates.
>
> Summary: One replaceable image per Life category, rendered under live SwiftUI labels and weekdays; no planner mutations, duplicated image-path logic or baked-in hours.

## Goal

Finish Spread's native illustrated Life cards so Work, Family, Fitness, School, Home and Personal feel like one premium editorial collection. **The owner chose the plum Personal still life (journal, headphones, coffee, camera and plant)** as its visual reference. Preserve the original Wallet motion contract, selected-card continuity and functional planner.

## Artwork folder and exact code owners

```text
ios/SpreadNativeV2/
  Package.swift                                  # includes .copy("Resources/Editorial")
  Sources/SpreadNativeV2/
    Resources/
      Editorial/                                # SINGLE home of clean card backgrounds
        README.md                               # image preparation instructions
        work.webp                               # add these after approval / export
        family.webp
        fitness.webp
        school.webp
        home.webp
        personal.webp
        ...                                     # health, project, business, church, custom
      Chalk/                                    # preserve original fallback files
    Life/
      LifeEditorialCard.swift                   # LifeEditorialArtworkRegistry, artwork overlay,
                                               # LifeEditorialFace and 7-day live rendering
      LifeWalletStack.swift                     # stack geometry, selection, Edit, gestures
      LifeRoot.swift                            # expanded days and optional tasks
  Tests/SpreadNativeV2Tests/
    LifeCardWeekDistributionTests.swift          # projection invariant checks
```

The filenames above are **illustrative targets** until the clean image assets actually exist. The app currently falls back to Chalkboard art when missing. Don't claim the images are in the repo unless verified.

## Fixed rules

1. **Replace images, not code.** `LifeEditorialArtworkRegistry` is the only asset lookup. Add/replace `Resources/Editorial/<category>.webp` (or PNG). No filename switch tables scattered through Life, Week or Hours.
2. **Never bake live UI into illustrations.** No responsibility title, Spread wordmark, weekly hours, progress values, weekday names, chips, icon hit targets or dates in the exported pixels. SwiftUI renders them using `PlannerSnapshot` for the selected week.
3. **Keep composition safe.** The left ~60% stays quiet for title/weekly value; reserve a legible full-width footer for seven-day values. Check crop and opacity in a genuine device screenshot, not only in image-generation previews.
4. **Keep each category differentiated but coherent.** Shared corner, paper/grain, soft light, editorial typography and object scale. Owner-approved Personal = restrained plum/bronze, journal, headphones, camera and coffee; no vanity products, gender stereotypes or payment-card graphics.
5. **No new business logic.** Artwork has no access to persistence, assignment/remaining-hour calculations, task mutation, edit mode, swipe-to-delete or haptics. Reuse the current live projection and one authoritative planner store.
6. **No new animation loop or fake Liquid Glass.** Preserve tactile Glide/Snap/Settle gestures; art is static by default and skips optional motion under Reduce Motion. Glass is for functional system chrome only.
7. **Responsive stack.** Larger adaptive cards must expose name, hours and entire seven-day strip on 320–430pt iPhones, iPad, Duo and large Dynamic Type. The next card must not conceal the first card's interactive content. Maintain normal vertical scrolling and selection return.
8. **No fake release claims.** Add complete-resolution owned/licensed images, verify build and tests in actual native CI, take screenshots in-device and compare to references. Source code alone is not approval.

## Numbered execution path

1. Read `CLAUDE.md`, `docs/design/README.md`, the visual sheet, the implementation spec, tactile motion contract and iOS platform audit. Verify latest `main`, do not trust historical PR numbers as state.
2. Confirm the current status of PR #162 and its `LifeEditorialCard.swift` implementation. If not on main, do not assume the component exists in shipping code.
3. Validate the Swift package image bundle lookup, missing-art fallback and view composition. Build on the native macOS runner, and fix compiler and resource errors before proceeding.
4. Export **clean backgrounds** from approved layered originals where possible. If only flattened mockups exist, re-create/repaint the artwork cleanly. Do not simply erase live text with destructive crops or ship blurred text ghosts.
5. Name each asset after its existing `ChalkArtwork` category identifier; prepare optimized retina source and verify no embedded hours/title/days. Keep `Chalk/` resources unchanged.
6. Install Personal first as the reference swap. Confirm that swapping `personal.webp` changes only the image; no edits in the store, Life selection code, Hours, Week or tasks.
7. Complete the remaining owner-approved category artwork individually, checking visual coherence, contrast and safe zones in the real native card layout.
8. Run focused unit tests, full relevant TypeScript and Swift tests, iOS shell build, simulator comparisons, VoiceOver, Reduce Motion, 10–20-card stack and supported-device layouts.
9. Record source SHA, device and exact evidence; open one focused PR with screenshots, acceptance criteria, regressions and an asset-only rollback. Do not merge or deploy future changes without explicit authorization.

## Copy/paste assignment

> Use the Spread native Life editorial art handoff at `docs/design/planner/CLAUDE_EDITORIAL_ART_HANDOFF.md` and the linked visual/spec documents. Implement and validate the replaceable artwork pipeline in the **existing** SwiftUI Life cards. Keep all live budget/week data and gestures native, use `Resources/Editorial/<category>.webp` for clean text-free art with original Chalkboard fallback, and preserve Classic, Hours, Week, storage, Crown and More. Start with the approved plum Personal artwork. Build/test in native CI and show device screenshots. Work on a focused branch; do not merge or release without authorization.
