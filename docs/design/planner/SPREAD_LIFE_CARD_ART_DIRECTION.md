# Spread Life cards: editorial art direction

> Part of the [Spread design brain](../README.md). [Implementation spec](../specs/2026-11-10-life-card-visual-implementation.md). Owner-selected reference direction on 2026-11-10. **This is a visual target for a future native PR, not a statement that the target ships on main.**
>
> Summary: One swappable editorial Life card art grammar based on three owner reference images, a Personal card brief and a strict separation between static art, live planning data and native interaction.

## 1. Reference hierarchy and observed design

**Owner-supplied images in the 2026-11-10 Spread conversation (not yet checked into GitHub):**

1. `Fitness Weekly Allocation Card-4.png`. **Primary card-face and day-strip reference.** One oversized green editorial card on a warm-paper background; cream italic serif display title; clear `6 h THIS WEEK`; a seven-day footer that explicitly shows zero hours and Tuesday / Thursday / Saturday at 2 h each; strength, running, hydration and mobility equipment; soft natural shadow, cinematic but restrained depth.
2. `Spread Responsibility_ Work, Family, Fitness, School, Home-5.png`. **Collection identity reference.** Five rounded illustrated surfaces with consistent type/shape, distinct navy, terracotta, sage, lilac and olive tones, high-quality environmental scenes. Some generated versions display a decorative payment chip; it is not a functional requirement.
3. `SPREAD Weekly Responsibility Cards-1.png`. **Collapsed information hierarchy reference.** The same family of cards with readable names and weekly values: Work 24 h, Family 10 h, Fitness 6 h, School 8 h, Home 4 h. These are sample values, not a common saved planner fixture.

**Observed shared visual language:** an illustrated, personal editorial card collection rather than a financial dashboard. Mostly matte color with fine texture, readable typography, soft directional lighting and understated depth. The scenes carry category meaning without needing extra interface icons. Cards can have very different art while sharing one layout grammar.

**Not established by images:** runtime accessibility, device motion, exact hex values, actual SF font family, valid task interactions or production-compatible aspect crop. Do not extract hard-coded production dimensions or hours from generated art.

## 2. Fixed card anatomy

Use ONE component anatomy for all category cards. Illustration is a background or adjacent masked art layer; live planner information is rendered separately by SwiftUI.

| Layer | Visual treatment | Contract |
| --- | --- | --- |
| Card shell | Rounded continuous corners; restrained shadow; matte/printed texture | Stable ratio and corner treatment within one collection; no Liquid Glass on content |
| Brand cue | Existing Spread mark, quiet and small | Preserve actual app mark; artwork must not forge or replace it |
| Responsibility name | Oversized editorial title, cream/ink with legible contrast; system font choices evaluated in SwiftUI | Dynamic Type and long names reflow; don't bake title into the artwork |
| Weekly time | Clear `6 h this week` or `6 h weekly budget` | Derived from the authoritative role; not a productivity score |
| Weekly allocation strip | Seven ordered weekdays; nonzero h emphasized, zero h legible; thin divisions, not tappable in collapsed stack | Derived from the selected week, no discrepancy between closed/focused/Week; sum of day values <= weekly budget |
| Category art | Hero scene weighted to the right / lower half, soft natural shadow and print grain | Different identity per category, safe space for left-side title and bottom strip |
| State / controls | Selection, chevron and accessible actions from the existing SwiftUI shell | Card art is never a control; no fake payment interactions |

At narrow width use a readable compact distribution summary before shrinking the primary labels. With large Dynamic Type expose more of each card, reduce overlap or vertically separate faces. Never hide name, weekly value or the next actionable control under another card.

The source images vary: some have a faux metal payment chip, subtitle or no hour strip. **Treat those as concept embellishments**, not a mandate to add fake NFC, numbers, bank logos or an in-card progress bar. The final content is a time-planning identity surface, not a payment simulator.

## 3. Surface and category art

- **Background canvas:** warm off-white as seen in references, subject to owner approval of a scoped native appearance exception versus the existing dark Life shell. Keep the metal Crown, the functional navigation language and Classic unaffected.
- **Colors:** cool ink blue Work, warm clay Family, muted forest/sage Fitness, dusky lilac School, green/olive Home. Business/Church/Health/Project and others each get a stable differentiated palette. These are *descriptive art directions*, not new hard-coded token hex values. A user's persisted role color remains authoritative.
- **Typography:** editorial display contrast in category art; readable system type for dynamic labels, dates, input and task text. Don't add new bundled fonts without explicit approval. Strong hierarchy comes from weight, scale and whitespace, not custom control chrome.
- **Photography/illustration:** tangible objects, human environments, softly layered landscapes and directional natural light, including engraved illustration where it makes sense. Avoid unrelated poster styles, excessive gradients, glowing borders and generic clip-art.
- **Image composition:** large artwork right and/or lower field; keep a clear negative-space zone for the title and hours, and another for weekday chips. The same content must survive a crop on narrow iPhones and iPad.
- **Category art inventory:** Work: worktable/laptop; Family: shared time/landscape; Fitness: running/strength/mobility/hydration equipment; School: study/books; Home: cared-for living space. Other categories follow this grammar but need not reuse a scene.
- **Appearance and contrast:** artwork can be rich but essential text remains high-contrast in light/dark, Increase Contrast and Reduce Transparency modes. Use an opaque/scrim text zone if the illustration conflicts with text.

## 4. Personal card: production art brief

**Purpose:** personal time, interests, self-directed growth, reflection, exploration. **Mood:** individual, sophisticated and gender-neutral without becoming sterile or corporate.

- **Palette:** muted slate, smoke-violet or charcoal with brushed bronze or warm paper accents. Keep any lilac influence restrained, not pastel pink; a stored user-selected role color can tint a small edge/accent.
- **Hero still life:** journal or notebook, headphones, compact camera, pencil and folded map or travel photo. A composition of personal pursuits, not gender stereotypes.
- **Avoid:** cosmetic vanity, makeup/mirrors, florals as main motif, obligatory male/female silhouette, pink beauty branding, gendered hobby clichés, chips/contactless icons, fake card numbers or finance-dashboard controls.
- **Typography / sample data for the conceptual image only:** `Personal`; `5 h this week`; Mon 0, Tue 0, Wed 0, Thu 0, Fri 1, Sat 2, Sun 2. Total = 5, unassigned = 0. Production values MUST come from planner state.
- **Composition:** one standalone card, not a five-card sheet. Match the first Fitness reference's strong left-side hierarchy, dark matte tactile finish, quietly detailed right-side illustration and full-width lower weekday strip.
- **Quality check:** name/hours readable in a thumbnail; bottom-day values accurate; no important content covered by art; consistent with Family/Work/Fitness rather than a stand-alone poster.

## 5. Replaceable art slot and motion boundary

Create a stable **LifeCardArtwork** interface or equivalent view boundary inside the existing native Life Wallet face. It resolves category (and optional override) to an art descriptor/resource, with a reliable fallback to existing category/Chalkboard presentation. It takes *only* presentation inputs such as category, effective role color, size and environment.

**Must not live inside the art slot:** weekly budget arithmetic, day assignment sums, task lists, storage writes, card selection, Manage/Delete gestures, haptics, navigation or planner state. Do not use a finished AI card screenshot as the actual full card UI. Asset rendering cannot be the source for text, numbers or weekdays.

Use a resource registry instead of scattering asset names/conditionals through LifeWalletStack. One resource swap changes only the artwork, while the shell, accessibility, hours, gestures and card geometry remain intact. Missing assets and unknown/custom categories must present gracefully.

**Motion:** graphic art defaults static. Selection and allocation changes use the existing [Glide / Snap / Settle contract](../tactile-precision/MOTION_CONTRACT.md); avoid new decorative loops. Preserve old animated Chalkboard assets as fallback until owner approves any replacement/removal. Suppress optional visual motion under Reduce Motion.

**Liquid Glass:** Apple system material is reserved for functional navigation/dock/sheet controls where supported, not the illustrated card or task rows; see [iOS 27 audit](../platforms/IOS27_BEHAVIOR_AUDIT.md) and [Apple principles](../platforms/APPLE_DESIGN_PRINCIPLES.md).

## 6. Acceptance of an artwork revision

1. Side-by-side cards share geometry, hierarchy, title placement, weekday strip and information correctness while each category scene remains distinct.
2. A user-selected role color and custom category do not break contrast or hide the name/hours.
3. Replacing a `Personal` art resource requires no edits to planner business logic, tasks, gestures or navigation.
4. No generated text/numbers are relied on by the native app; SwiftUI paints current snapshot values.
5. Closed/selected/expanded state, Reduce Motion, Dynamic Type, VoiceOver, dark mode and dense 10–20-card stack have explicit validation; hardware evidence is owed.
6. Asset ownership/licensing, final export resolution/crops and appearance variants are recorded before shipping.

**Decision boundary:** These owner-provided images set a new *proposed Life card-face visual direction* only. They do not independently authorize changes to the global app palette, Classic, store/schema, old Chalkboard animations, release controls or the existing Wallet gesture contract.
