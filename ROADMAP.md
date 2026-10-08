# Spread Roadmap

The chosen iPhone/App Store implementation is documented in [APP_STORE_RELEASE_PLAN.md](APP_STORE_RELEASE_PLAN.md): Capacitor around the existing Vite/React planner, local-first 1.0, no required account/backend, and paid-app commerce.

Spread's current release path is organized as concrete achievements. The frozen friends-test build is the rollback point; future work should not modify that golden branch.
The current web planner on `main` is the shipped functional baseline.
Frozen `golden/*` branches remain the immutable rollback checkpoints. The iOS
shell is work in progress; an installed/TestFlight/App Store build is not yet
accepted. This roadmap owns milestone order and status; the App Store release
plan owns the detailed acceptance checklist.

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

- [ ] Package the existing proven Spread experience with Capacitor as an iOS app without redesigning it.
- [ ] Configure the permanent bundle ID, signing, app icon, safe areas, and launch experience.
- [ ] Verify the real app on iPhone.
- [ ] Upload the first signed build to App Store Connect.
- [ ] Install and smoke-test the App Store build through TestFlight.

**Done when:** the same Spread behavior friends tested on the web works from an installed iPhone build.

## Achievement 3 — App Store Release

- [ ] Finish name, subtitle, description, keywords, category, age rating, privacy answers, support/privacy URLs, screenshots, and pricing.
- [ ] Submit Spread 1.0 to App Review.
- [ ] Resolve any review issues and release the approved build.

**Done when:** Spread is publicly installable from the App Store.

## Achievement 4 — Still-first Launch Content Pipeline

Build a human-approved still-image and copy workflow for launch material.
The removed homepage videos are not a current creative baseline.

```text
Idea
  ↓
Creative brief
  ↓
Approved still-image concepts
  ↓
Google Drive asset storage
  ↓
Review / Approve / Revise
  ↓
Make orchestration
  ↓
Social scheduler / platform publishing
  ↓
Apple-ready screenshots + still assets
```

- [ ] Accept a simple content idea as the input.
- [ ] Generate reusable campaign copy and still-image concepts.
- [ ] Produce approved still assets in the required formats.
- [ ] Store every campaign and revision predictably.
- [ ] Deliver one clean review package.
- [ ] Require explicit approval before anything publishes.
- [ ] Regenerate only assets marked for revision.
- [ ] Publish approved assets through an orchestrator to the selected social platforms.
- [ ] Produce Apple-specific screenshots and still assets from approved creative instead of blindly reusing social dimensions.
- [ ] Keep a campaign ledger with generation, approval, publish, and Apple-upload status.

**MVP acceptance test:** one idea can produce at least five reviewable still/copy options, survive one revision cycle, publish an approved asset to the selected social channels, and produce the corresponding Apple-ready still package without manually moving files between systems.

## Achievement 5 — Launch Distribution Loop

- [ ] Launch a small repeatable still-image and copy campaign cadence on selected channels.
- [ ] Start narrowly targeted Apple Search Ads.
- [ ] Track creative → store visit → install → activation.
- [ ] Reuse winning hooks and stop spending on losing creative.
- [ ] Improve App Store screenshots and metadata from actual conversion data.

## Achievement 6 — Apple-Native Data Foundation

> **Pulled into 1.0 (2026-10-08):** iCloud Backup, optional iCloud Sync and iPad are part of the
> Spread 1.0 direction. See [docs/ICLOUD_PLAN.md](docs/ICLOUD_PLAN.md) for phases and gates. The
> checklists below remain the long-term view; macOS and Watch stay post-1.0.

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

# Release acceptance

Achievements 1–3 show the order. Use the single
[App Store release plan](APP_STORE_RELEASE_PLAN.md) for the full quality,
physical-device, privacy, commerce, TestFlight, and support gates. Do not mark
Achievement 2 complete on a web preview or an unverified iOS shell PR. Only
mark Achievement 3 complete when the paid public listing is live and the
installed planner meets the plan's offline/data-preservation exit condition.
