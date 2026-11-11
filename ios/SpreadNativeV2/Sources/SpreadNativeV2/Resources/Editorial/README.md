# Spread editorial art — bundled Life card backgrounds

The six approved category artworks are committed directly in this directory:

| Asset | Dimensions | Role |
|---|---|---|
| `work.webp` | 3000 × 1800 | Work |
| `family.webp` | 3000 × 1800 | Family |
| `fitness.webp` | 3000 × 1800 | Fitness |
| `school.webp` | 3000 × 1800 | School |
| `home.webp` | 3000 × 1800 | Home |
| `personal.webp` | 3000 × 1800 | Personal |

These are approved display-size WebP assets and **were enlarged from 1619 × 971 generated source images**. Their pixel dimensions are correct, but they are not native 3K image-generation masters. Do not describe them as having new optical detail or infer native display acceptance from the dimensions alone.

## Ownership and fallback

- `LifeEditorialArtworkRegistry` in `Life/LifeEditorialCard.swift` is the **only** image loader. SwiftPM copies `Resources/Editorial/` into the app bundle.
- Other known categories (`health`, `business`, `project`, `church`, `custom`) still use the original Chalkboard resources. Retain the fallback for any missing or unsupported image, including future custom categories.
- All six images are text-free. Responsibility names, weekly budgets, assigned hours and the seven-day strip **remain live SwiftUI and planner snapshot values**.
- Do not insert decorative artwork into the native interaction/hit-test region or load it over the network.
- The presentation flag `native.life.editorialArt.enabled` remains **off by default**. Off means the original golden Life design. Reverting the flag does not mutate any data or remove the Chalk assets.

## Native screenshot acceptance — without Codemagic

The repository's existing `Native UI tests (targeted)` GitHub Actions workflow runs the **actual iOS app in Xcode Simulator**. Dispatch it on the PR branch with:

- `tests = LifeEditorialPersonalPreviewUITests`
- `width = 390` (iPhone); then `width = 1024` (iPad, where Life content is capped at approximately 700 pt)

The DEBUG-only `-SpreadPersonalPreviewFixture` argument loads six sample responsibilities in memory without writing planner data. Its optional `-SpreadEditorialPreviewCategory work|family|fitness|school|home|personal` restricts the viewport to one card for clear collapsed/selected captures. The test suite records PNG attachments for all six cards, a full-stack viewport, and the gate-off golden comparison.

**Acceptance criteria:** open every native screenshot; confirm text safe zones, artwork cropping and footer visibility, Dynamic Type/VoiceOver behavior, tap-to-focus and Days details, golden rollback and preserved Chalk fallback. A screenshot file being exported does not by itself prove these quality checks. Log each test failure and judge regressions against verified main; do not merge from simulator compilation alone.

## Physical hardware

A debug build launched from Xcode can use `-native.life.editorialArt.enabled YES` in Scheme > Run > Arguments. This setting is a debug/testing option, not a public preference or TestFlight switch. Haptics, real VoiceOver focus, high-refresh-rate gesture feel, and physical iPad/phone scaling remain separate device acceptance requirements.

No app storage, cloud, bridge schema, planner writes or server are introduced by this artwork folder.
