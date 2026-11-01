# Spread | Foundational UX and Web Design Principles

> Part of the Spread design brain. Start at [README.md](README.md) to select the correct design pack.

**Status:** cross-surface design-review standard. Applies to the weekly planner, landing page, Studio experiments, and Contact Deck when those features are in scope. This document **does not authorize** a redesign, feature launch, theme, data migration, or merge of a feature branch.

**Provenance:** adapted from [Studigo's foundational UX policy](https://github.com/WGLewis0721/Studigo-ai/blob/main/docs/ux/FOUNDATIONAL_UX_PRINCIPLES.md), using [Jon Yablonski's Laws of UX](https://lawsofux.com/) and [the seven fundamentals](https://www.concretecms.com/about/blog/web-design/7-fundamentals-of-web-design) as references.

## Principle: structure before styling

UX principles govern legibility, decisions, predictability and feedback. Spread's shipped product, [planner design system](planner/SPREAD_DESIGN_SYSTEM.md), [landing design](landing/DESIGN.md), [Apple design principles](platforms/APPLE_DESIGN_PRINCIPLES.md), [design rules](RULES_CARD.md) and feature-specific approved specifications remain authorities for product semantics, implementation and visual identity. Principles are heuristics, not scientifically guaranteed scores. Accessibility and data correctness are hard constraints.

## Seven design fundamentals

| Fundamental | Spread operating standard | Review |
| --- | --- | --- |
| **Unity** | One identifiable planner across Week, Spread, Month, task entry, sheets and device sizes; Studio's optional look must preserve semantics | Compare labels, controls, navigation and states across surfaces |
| **Balance** | The week and its responsibilities remain the focus, not decorative chrome or supporting metadata | Primary task is identifiable within five seconds |
| **Hierarchy** | Responsibility → hours → week → tasks; every screen indicates the immediate next action | One dominant action per current state, clear heading/focus order |
| **Contrast** | Time, status, error, focus and role identity stay legible in light and dark without color as the only signal | Accessibility audit including focus, contrast, zoom |
| **Emphasis** | Today's action and meaningful task state stand out; no collection of equally loud buttons | Audit primary CTA competition |
| **Scale** | Readable time labels, safe areas, reachable touch targets and larger text do not obscure tasks | Touch areas at least 44 pt on iOS and responsive text checks |
| **Repetition** | Reuse the established cards, trays, task rows, sheets, Crown and controls | No one-off pattern without a documented reason |

## Laws of UX applied to Spread

| Law | Product behavior | Acceptance evidence |
| --- | --- | --- |
| **Hick's Law / selective attention** | Show the next 1–2 meaningful decisions; group supporting actions by context. No redundant tab bars or multiple competing primary CTAs | Count options on first use and at each task transition |
| **Jakob's Law** | Calendar, back navigation, tabs, editing and Undo follow familiar platform expectations | First-time user can navigate without a tutorial |
| **Fitts's Law** | Finger targets are reachable and stable, with a 44 pt iOS target expectation; decorative glyph size does not shrink the hit box | Measure touch boxes and overlap in device layouts |
| **Gestalt: proximity, similarity, common region** | Responsibility, hours, placed tasks and related actions form coherent visible groups; free-time suggestions look different from days | Visual groups and accessibility reading order agree |
| **Miller / chunking / working memory** | Progressive disclosure for busy weeks; preserve enough context to place or reschedule without memorizing other screens | Complete core tasks without repeated backtracking |
| **Tesler's Law / Occam's Razor** | Simplify presentation, not real scheduling constraints, permissions, history or irreversible actions | Same valid planner behaviors and data after UI polish |
| **Doherty Threshold** | Respond immediately to taps, drag, save and Undo; show honest pending/error states where needed | Test perceived latency on device without fake completion |
| **Aesthetic–Usability Effect** | Polish and motion reinforce clarity, never disguise an inaccessible or nonworking flow | Core functions work with Reduce Motion and minimal decoration |
| **Von Restorff / serial position** | The one next action is distinct; placement, overdue and destructive outcomes are unmistakable | CTA priority check at entry and completion |
| **Goal-Gradient / Zeigarnik / Peak–End** | Show truthful progress and a clear way back to unfinished planning; make completion satisfying without coercion | Progress corresponds to stored tasks; resuming works after reload |

## Product-specific nonnegotiables

1. Preserve the local-first data model, existing roles and hour-bank semantics. Never imply unshipped iCloud or sync capabilities are active.
2. Every drag must also be possible by tap and keyboard. Preserve Undo and meaningful refusal feedback.
3. Keep planner, landing, Studio and Contact Deck authorities separate; this shared baseline does not import a new palette, visual component library or permission model.
4. Do not add extra interface steps merely to perform a UX-law ritual. For frequent tasks measure the actual successful path from entry to done.
5. Validate 390, 820, 1024 and 1440 px where applicable; test light/dark, zoom or larger text, keyboard, screen reader, Reduce Motion, empty/dense/offline/error states. Add iPhone/iPad/Duo device checks appropriate to the feature.
6. For changes that trade space against readability or interaction, document the user task, tradeoff and accessibility check in the normal [spec protocol](PLAN_SPEC_PROTOCOL.md). The seven fundamentals and laws do not override safety, accuracy or app-specific rules.

## Review sequence

**Understand the task → structure the content → identify applicable laws → use the approved Spread patterns → implement → measure real task completion and accessibility.** Cite applicable laws and checks in design PRs. Avoid numerical claims about cognitive performance without evidence.
