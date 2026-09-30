# Spread Roadmap

Spread's current release path is organized as concrete achievements. The frozen friends-test build is the rollback point; future work should not modify that golden branch.

## Achievement 0 — Friends-Test Golden ✅

- [x] Freeze the current app at commit `e4b68e6f124d249f0015cd7a5e5600ad0838bb84`.
- [x] Preserve `golden/2026-09-27-friends-test-final`.
- [x] Deploy that exact commit to Vercel for friend testing.
  - Note: the Vercel project deploys `main` automatically, so production now tracks `main`. Redeploy the golden commit if a friend round needs the frozen build.
- [x] Keep GitHub Pages available as a second web deployment.

## Achievement 1 — Friends Test Round

- [ ] Send the Vercel build to a small group of friends.
- [ ] Capture friction, bugs, confusing interactions, and repeated requests.
- [ ] Fix release-blocking defects without redesigning the product.
- [ ] Cut a post-test release candidate and preserve another golden checkpoint.

**Done when:** the test group can plan a week, allocate hours, add/edit tasks, move through weeks, export/backup, and return later without losing data or needing help.

## Achievement 2 — iPhone / TestFlight Build

- [ ] Package the existing proven Spread experience as an iOS app without redesigning it.
- [ ] Configure the permanent bundle ID, signing, app icon, safe areas, and launch experience.
- [ ] Verify the real app on iPhone.
- [ ] Upload the first signed build to App Store Connect.
- [ ] Install and smoke-test the App Store build through TestFlight.

**Done when:** the same Spread behavior friends tested on the web works from an installed iPhone build.

## Achievement 3 — App Store Release

- [ ] Finish name, subtitle, description, keywords, category, age rating, privacy answers, support/privacy URLs, screenshots, and pricing.
- [ ] Prepare App Preview creative if it materially improves the listing.
- [ ] Submit Spread 1.0 to App Review.
- [ ] Resolve any review issues and release the approved build.

**Done when:** Spread is publicly installable from the App Store.

## Achievement 4 — Automated Social Media Content Pipeline

Build a human-approved content factory rather than manually producing every launch post.

```text
Idea
  ↓
Creative brief
  ↓
Higgsfield stills + short videos
  ↓
Google Drive asset storage
  ↓
Review / Approve / Revise
  ↓
Make orchestration
  ↓
Social scheduler / platform publishing
  ↓
Apple-ready stills + preview assets
```

- [ ] Accept a simple content idea as the input.
- [ ] Generate reusable campaign copy, still-image concepts, and 5–8 second promo concepts.
- [ ] Generate stills and videos through Higgsfield.
- [ ] Store every campaign and revision predictably.
- [ ] Deliver one clean review package.
- [ ] Require explicit approval before anything publishes.
- [ ] Regenerate only assets marked for revision.
- [ ] Publish approved assets through an orchestrator to the selected social platforms.
- [ ] Produce Apple-specific versions from approved creative instead of blindly reusing social dimensions/durations.
- [ ] Keep a campaign ledger with generation, approval, publish, and Apple-upload status.

**MVP acceptance test:** one idea can produce at least five reviewable creative options, survive one revision cycle, publish an approved asset to the selected social channels, and produce the corresponding Apple-ready asset package without manually moving files between systems.

## Achievement 5 — Launch Distribution Loop

- [ ] Launch a small repeatable TikTok/Reels/Shorts creative cadence.
- [ ] Start narrowly targeted Apple Search Ads.
- [ ] Track creative → store visit → install → activation.
- [ ] Reuse winning hooks and stop spending on losing creative.
- [ ] Improve App Store screenshots and metadata from actual conversion data.

## Achievement 6 — Apple-Native Data Foundation

- [ ] Define the shared native Spread data model.
- [ ] Preserve the product hierarchy: Spread → Week → Day allocation → Task → optional content.
- [ ] Move from device-only persistence toward user's iCloud/CloudKit sync.
- [ ] Design conflict handling and offline-first behavior before enabling cross-device editing.

## Achievement 7 — Apple Device Family

- [ ] iPad adaptive layout.
- [ ] Foldable-friendly/adaptive iPhone layouts when relevant hardware/SDK support is available.
- [ ] macOS experience using the shared data model.
- [ ] Focused Apple Watch companion rather than duplicating the full planner.

## Achievement 8 — Branded Landing Page

The design direction is in [DESIGN.md](DESIGN.md). The full page is frozen as `golden/2026-09-28-full-landing-modes`.

- [x] Build the public Spread landing page around the product model: Responsibilities → Hours → Week → Tasks.
- [x] Show the actual product instead of generic productivity imagery: every section's focal object is built from real Spread parts.
- [x] Privacy and local-first story, and a concise product explanation.
- [x] Light and dark modes, shared with the planner's own appearance setting.
- [ ] Add the App Store CTA and device family once Achievement 3 ships.
- [ ] Replace the drawn notebook with final paper artwork (texture, handwriting) without changing the choreography.
- [ ] Use the same campaign assets and measurement loop as the social pipeline.

## Product guardrails

- Roles first. Hours second. Tasks last.
- Spread is not becoming a generic project manager, wiki, or giant to-do system.
- Planning must remain faster than recreating the original paper method.
- Preserve local-first behavior and the frozen golden checkpoints.
- Distribution work should reuse the product's real UI and real workflow rather than inventing a separate marketing product.

---

# Production + App Store commercialization gate — September 30, 2026

Spread has the shortest direct path to a paid App Store release because its core value is local-first and does not require a large hosted AI/backend service. The current roadmap's Achievements 1–3 remain the release sequence; the checks below define what “done” means commercially.

## P0 — release-candidate quality
- [ ] Finish the Friends Test Round and convert every repeated/release-blocking failure into a regression test.
- [ ] Verify backup/export/import and local persistence across browser/app restart, device storage pressure, app upgrade, and schema migration.
- [ ] Add a versioned data-migration strategy so future releases cannot silently corrupt existing weeks/spreads/tasks.
- [ ] Complete accessibility: Dynamic Type/text scaling where applicable, VoiceOver labels/order, contrast, Reduce Motion behavior, touch target sizes, keyboard/external-keyboard behavior on iPad, and non-color-only meaning.
- [ ] Complete privacy/support/terms pages and an in-app support/contact surface. If 1.0 truly collects no personal/analytics data, keep that promise technically true and make App Store privacy answers match the shipped binary.
- [ ] Add production crash/error telemetry only if it can be done consistently with the local-first privacy promise; otherwise define a user-controlled diagnostic export/support path.
- [ ] Physical-device matrix: supported iPhones, at least one iPad if included at launch, light/dark mode, portrait/landscape policy, safe areas, keyboard, interruption/resume, low storage, offline use, and date/time-zone/week-boundary behavior.

## P0 — iOS packaging and $0.99 commerce
- [ ] Choose the production iOS shell/native packaging approach and make the installed build self-contained for the core planner.
- [ ] Configure Apple Developer/App Store Connect, permanent bundle ID, signing, app icon, launch screen, capabilities, version/build numbering, and release CI/archive process.
- [ ] Decide the launch business model. For the previously discussed **$0.99 complete app**, use App Store paid-app pricing rather than adding an unnecessary in-app currency/ledger.
- [ ] If 1.0 later becomes free + premium digital features, use StoreKit IAP/subscriptions for those in-app digital unlocks and add Restore Purchases; do not bolt web checkout into the iOS app for the same digital unlock.
- [ ] Complete App Store listing metadata: name/subtitle/description/keywords/category, age rating, privacy answers, support/privacy URLs, screenshots for required device classes, pricing/availability, and review notes.
- [ ] TestFlight internal build → external friends beta → release candidate. Verify install/update behavior from TestFlight rather than only browser/Vercel behavior.
- [ ] Submit to App Review and resolve completeness/privacy/UI issues before launch.

## P1 — sync is not a 1.0 blocker unless promised in the listing
- [ ] Keep 1.0 local-first if that is the marketed contract.
- [ ] If iCloud/CloudKit is advertised at launch, move Achievement 6 ahead of submission and prove offline edits, conflict resolution, device replacement, and multi-device convergence before release.
- [ ] Do not advertise iPhone/iPad/macOS/Watch availability until each shipped target has its own accepted device QA and store build.

## Commercial operations
- [ ] Configure Paid Apps Agreement, banking, tax, territories, and pricing in App Store Connect before release.
- [ ] Define support/refund-response workflow, release rollback/hotfix procedure, and App Store review/release ownership.
- [ ] Instrument privacy-preserving activation/crash/store-conversion metrics sufficient to learn whether installs become completed weekly plans.
- [ ] Update the landing page App Store CTA only when the public listing is live.

**Paid-production exit:** a customer can buy Spread from the App Store, install/update it, complete the full Responsibilities → Hours → Week → Tasks loop offline, keep data across normal upgrades/restarts, export/backup it, and get support without the product depending on the Vercel site to function.

