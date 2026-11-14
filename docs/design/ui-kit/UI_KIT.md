# Spread UI Kit

> Part of the [Spread design brain](../README.md).
>
> Summary: Visual entry point for native and marketing design. Surface-specific specifications and shipped tokens take precedence.

**Consolidated visual reference across the app, website, marketing, and ads.**

This kit consolidates Spread's existing visual language. It does not override the native SwiftUI brand board, the planner's behavior rules, or the landing-page authority.

**Start here.** Then follow the links for deeper rules. For vetted optional GitHub resources and AI-agent adoption gates, use [reference libraries](REFERENCE_LIBRARIES.md); no third-party kit is an approved dependency.

---

## Map

| Section | What it covers | Source of truth |
|---------|----------------|-----------------|
| Foundations | Colors, type, spacing, motion | `tokens.json`, `SPREAD_DESIGN_SYSTEM.md`, Native Brand Board |
| Components | Buttons, cards, tasks, sheets, feedback | `SPREAD_DESIGN_SYSTEM.md` + this kit |
| Patterns | Roles → Hours → Tasks, week view, progressive disclosure | `SPREAD_DESIGN_SYSTEM.md`, UX Principles |
| Surfaces | App, website, marketing, ads | This kit + `landing/DESIGN.md` |
| Rules | Hard constraints | `RULES_CARD.md`, `FOUNDATIONAL_UX_PRINCIPLES.md` |

---

## 1. Foundations

### Colors

**Light**
- Native canvas: `#F4F1EA` (use `Spread.canvas`; web uses `tokens.json`)
- Elevated: elevated surface
- Native ink: `#0E1A2E` (use `Spread.ink`)
- Native secondary: use `Spread.secondary` (web uses `tokens.json`)
- Native accent: `#0860C8` (use `Spread.accent`; web uses `tokens.json`)
- Sage and peach: supporting editorial/marketing references, not new native action colors

**Dark**
- Night canvas: `#060B18`
- Elevated: `#101C32`
- Ink: `#F7FAFF`
- Secondary: `#B0BCD1`
- Accent: `#0A84FF`
- Hairline: white 10–16%

**Semantic**
- Danger, caution, success
- Role colors are data only (Work `#34C759`, Home `#FF9500`, Health `#0A84FF`, etc.)

**Rule:** Never use color alone for status or meaning. Always pair with text.

### Typography

- System SF (iOS) / system-ui (web)
- Page headline: 28–32pt
- Section: 19–22pt
- Responsibility: 20–24pt
- Body: 15–17pt
- Secondary / caption: 12–14pt
- Dynamic Type / responsive scaling supported

### Spacing & Geometry

- 4px / 8px grid
- Minimum touch target: 44pt on iOS; 44px on web
- Card radius: 20–28pt (`rounded-3xl`)
- Nested content: `rounded-2xl`
- Insets: 16–20pt, using 4/8pt increments
- Hairline dividers

### Motion

- Subtle, spring-based
- Reduce Motion: all motion disabled
- Haptics: light tap only when native and meaningful

### Native tokens

SwiftUI tokens live in `ios/SpreadNativeV2/Sources/SpreadNativeV2/Theme/SpreadTheme.swift`, which is the only place their values are written. Use the names below and do not copy values into this page.

- **Colour** (`Spread.*`, one set for light and dark, with Increase Contrast inside each token). Gray Matter role names map to Spread's: canvas → `canvas`, surface → `inset`, elevated → `elevated`, primary → `accent`, text → `ink`, secondaryText → `secondary`, outline → `line`, destructive → `danger`, warning → `caution`, success → `success`. Spread's names are the only names in code.
- **Type ramp** (Dynamic Type): `title`, `sheetTitle`, `body`, `headline`, `callout`, `footnote`, `caption`, and `numeric` for figures that must align.
- **Spacing** (4-point grid): `space1` to `space12`. Touch targets use `minimumTarget` (44 pt), not a spacing step.
- **Shape**: `radiusControl`, `radiusRow`, `radiusCard`, `radiusSheet`.
- **Motion** (`SpreadMotion`): `fastSeconds`, `normalSeconds`, `deliberateSeconds`, `timing(_:)`, and `seconds(_:reduceMotion:)`, which returns zero under Reduce Motion. Gestures use `SpreadTactile`.
- **Role colours** are data (`Responsibility.color`), never tokens. Illustration colours are authored artwork.
- Remaining hardcoded native values, with the token that should replace each: `docs/design/finalize/TOKEN_AUDIT.md`.

---

## 2. Components

### Buttons
- **Primary**: accent fill, 44px min height
- **Secondary**: quiet text or outline
- **Destructive**: danger color
- States: default, pressed, disabled, loading
- Secondary actions prefer quiet accent text links over full-width buttons

### Cards & Surfaces
- Elevated cards only for days and primary containers
- Nested rows use canvas background
- Dashed trays for “To place” and non-day containers
- Native Wallet Stack: overlapping full-width cards with chevrons

### Native Life Weekly Time

> **November 11 owner supersession:** The storage-style time bar sits beside Life on regular iPhones (stacks on narrow/accessibility sizes), opens inline with the Life Wallet focus motion, and edits total weekly capacity and each Life-area budget through the authoritative planner. Tap an actual colored segment to select its responsibility; the blue action expands/collapses the editor with a down/up chevron. No standalone Hours page is needed for normal Life use. Retain readable proportions, role colors, available hours, capacity limits, Undo and VoiceOver.

- The read-only storage-style `LifeWeeklyTimeBudget` shows **allocated / total / available** hours using real planner data.
- The bar proportions use the total weekly capacity. Role-colored segments show hour labels only when readable; the neutral hatched remainder is available time. Without capacity, show a neutral empty bar, not fictitious 100% usage.
- One accessible touch target opens the existing Hours allocator; no legends, Liquid Glass, new allocation interactions, or second state store.
- Keep the solid native card surface, existing Life Wallet artwork and Crown. [Native budget authority](../planner/SPREAD_NATIVE_BRAND_BOARD.md).
- **Current Life control:** Remove the redundant Life heading/subtitle; Weekly Time spans the content width on iPhone, with proportional budgeted/total/available segments. The expandable editor uses the same compact **left / current value / right** control as calendar navigation for overall capacity and individual Life areas. Tapping the weekly value still permits direct numeric entry. Preserve half-hour allocations, planner limits, Undo and Dynamic Type; do not stretch segment ratios.

### Task Line

- Task importance is a familiar red **!** with text and VoiceOver label; a single toggle adds/removes importance without changing date, effort or completion.
- Week's **To place** control is a single task-inbox icon with count; it reveals the task list on tap. Empty days do not reserve a large fixed-height tray.

- 44px grip + task text + single action (“Place” / “Move to”)
- Hairline dividers between tasks
- Day chips for scheduled time

### Role Row
- Colored dot + label + chevron + count
- Collapsible

### Free Time Chip
- Accent tint background
- Not a card
- Suggests availability

### Sheets
- Native: use existing SwiftUI `SpreadSheetStack` and presentation detents
- Web: follow the existing React dialog implementation; do not transplant a component library

### Feedback
- Single toast system
- Reuse the existing planner's Undo behavior and native feedback; do not invent new timeouts
- Destructive confirmation follows the surface contract: native Life deletion uses Undo without an extra prompt; Classic retains its own rules
- Status row: title + quiet detail (danger on problem titles)
- Drop highlight: 2px accent outline

### Navigation

> **Nov 12 Plan Ahead:** Available directly from Life as well as Week. The same sheet offers **Repeat schedule** (weekly budget recurrence) and **Move once** (original one-time transfer). Both show a read-only review, real affected weeks and one primary confirmation. Scheduled day allocations and tasks are never inferred from a repeating weekly budget. Preserve previously planned weeks and distinguish a single-week edit from an entire-series change.

> **Current native navigation:** Two labeled destinations, **Life** and **Week**, in one compact dock toggle. The old metallic Crown is retired; use a solid-surface calendar-week control with explicit previous/next buttons: tap advances one week; pressing and holding repeats with bounded acceleration until release. Horizontal swipe velocity no longer controls week navigation. Weekly navigation changes the viewed week, never transfers time. The unrelated Plan Ahead sheet is explicitly opened, previews the source/destination impact and requires confirmation. Do not resurrect dock plus, Crown-position, or Rollover controls.

- Native: a compact Life/Week toggle using the original Spread mark for Life, plus a solid calendar week controller. No metallic Crown or independent Hours destination in ordinary Life use.
- Web: preserve its current navigation; do not add mockup tabs
- “Today” marker in accent

---

## 3. Patterns

**Core flow (never reverse)**  
Roles → Hours → Week → Tasks

**Placement rules**
- Tasks only place on their own role’s days
- Every drag has a tap and keyboard equivalent
- Invalid drops show a toast; no silent fallback

**Progressive disclosure**
- Busy weeks stay scannable
- Collapsible role groups
- Empty days show label + “Add” (no filler text)

**Local-first**
- Never imply iCloud or cloud sync unless the feature flag is on
- Save status refers only to the local device

---

## 4. Surfaces (App, Website, Marketing, Ads)

Share visual principles and role identity across surfaces, not identical controls. Native SwiftUI and marketing/web retain their own component implementations.

**Do**
- Use the exact color tokens and type scale
- Use the card language (elevated, rounded, paper-to-digital)
- Use Spread blue only for interactive elements
- Show the real planning flow (roles → hours → tasks)
- Prefer accurate product screenshots or component mockups
- Maintain light/dark parity

**Do not**
- Introduce new accent colors or button styles
- Use color-only meaning
- Add cloud/sync language
- Create one-off styles for marketing
- Reverse the Roles → Hours → Tasks order

---

## 5. Hard Rules

- Minimum 44px touch targets
- Status always has text
- One primary action visible; secondary actions are quiet
- Preserve local-first data model
- Every interactive pattern works with keyboard and screen reader
- Reduce Motion must disable all motion
- No undocumented one-off components

---

## Sources

- `docs/design/tokens.json`
- `docs/design/planner/SPREAD_DESIGN_SYSTEM.md`
- `docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md`
- `docs/design/FOUNDATIONAL_UX_PRINCIPLES.md`
- `docs/design/RULES_CARD.md`
- `docs/design/landing/DESIGN.md`

**This file is the visual entry point.** Native, planner, and landing source documents linked above remain authoritative for their own surfaces. Use the kit to avoid inconsistencies, not to replace working UI.
