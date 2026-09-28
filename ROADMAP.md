# Spread Roadmap

Spread's current release path is organized as concrete achievements. The frozen friends-test build is the rollback point; future work should not modify that golden branch.

## Achievement 0 — Friends-Test Golden ✅

- [x] Freeze the current app at commit `e4b68e6f124d249f0015cd7a5e5600ad0838bb84`.
- [x] Preserve `golden/2026-09-27-friends-test-final`.
- [x] Deploy that exact commit to Vercel for friend testing.
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

- [ ] Build the public Spread landing page around the core promise: **Give every part of your life some of your week.**
- [ ] Show the actual product instead of generic productivity imagery.
- [ ] Add App Store CTA, privacy/local-first story, device family, and concise product explanation.
- [ ] Use the same campaign assets and measurement loop as the social pipeline.

## Product guardrails

- Roles first. Hours second. Tasks last.
- Spread is not becoming a generic project manager, wiki, or giant to-do system.
- Planning must remain faster than recreating the original paper method.
- Preserve local-first behavior and the frozen golden checkpoints.
- Distribution work should reuse the product's real UI and real workflow rather than inventing a separate marketing product.
