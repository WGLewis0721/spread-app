# Spread UI Kit

**Single source of truth for visual consistency across the app, website, marketing, and ads.**

This kit consolidates the existing design DNA so anyone (or any AI) can produce consistent work without losing quality.

**Start here.** Then follow the links for deeper rules.

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
- Canvas / Paper: `#F6F1E7`
- Elevated: elevated surface
- Ink: `#171717`
- Secondary: `#68645D`
- Accent: `#0A84FF`
- Sage: `#DCE6D6`
- Peach: `#F1DFCF`

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
- Minimum touch target: 44px
- Card radius: 20–28pt (`rounded-3xl`)
- Nested content: `rounded-2xl`
- Insets: 16–20pt
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
- Radix Dialog with grabber
- Used for More, new spread, open tasks

### Feedback
- Single toast system
- 6-second Undo (latest change only)
- Alert dialogs for destructive confirmations
- Status row: title + quiet detail (danger on problem titles)
- Drop highlight: 2px accent outline

### Navigation
- Segmented control (Spread / Week)
- Crown for week navigation
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

Use the same foundations and components everywhere.

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

**This file is the clear UI Kit.** Everything else is supporting detail.  
Use this first when creating any new screen, marketing asset, or AI prompt.
