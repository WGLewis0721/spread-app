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
- The read-only storage-style `LifeWeeklyTimeBudget` shows **allocated / total / available** hours using real planner data.
- The bar proportions use the total weekly capacity. Role-colored segments show hour labels only when readable; the neutral hatched remainder is available time. Without capacity, show a neutral empty bar, not fictitious 100% usage.
- One accessible touch target opens the existing Hours allocator; no legends, Liquid Glass, new allocation interactions, or second state store.
- Keep the solid native card surface, existing Life Wallet artwork and Crown. [Native budget authority](../planner/SPREAD_NATIVE_BRAND_BOARD.md).

### Task Line
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
- Native: adaptive Life/Hours/Week navigation and existing metallic Crown for week changes
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
