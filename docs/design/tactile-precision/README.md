# Spread Tactile Precision

> Part of the [Spread design brain](../README.md). **Status: Classic and Life implementation candidate; native/device acceptance and release approval remain required.**
>
> Summary: A single tactile language for Life, Hours, Week, the Wallet stack, Crown, compact navigation and task actions. Inspired by fidget mechanisms, not designed for compulsive use.

## Start here

[Integrated implementation and rollback](IMPLEMENTATION.md) · [Current evidence](../../evidence/tactile-precision/README.md)

| Need | Read | Authority |
| --- | --- | --- |
| Why, options, approval and scope | [Dated spec](../specs/2026-11-06-tactile-precision.md) | Proposal and decision record |
| Gesture physics, state transitions, motion/haptics | [Motion contract](MOTION_CONTRACT.md) | Proposed implementation targets, not an override |
| Measurable checks, ownership, rollback and evidence | [Verification and release gates](VERIFICATION.md) | Acceptance plan |
| Approved Life behavior and unchanged demo | [Life iOS spec](../../../SPREAD_LIFE_IOS_SPEC.md), [handoff](../../../SPREAD_LIFE_IOS_HANDOFF.md), [reference](../../../tools/life-reference/README.md) | Higher authority for current Life acceptance |
| Current native identity | [Native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md) | Higher authority for visual language |
| iOS device guidance | [iOS 27 audit](../platforms/IOS27_BEHAVIOR_AUDIT.md) | Higher authority for platform and release |
| Existing Week/Month decision set | [61 owner decisions](../specs/2026-11-04-week-month-owner-decisions.md) | Higher authority for navigation/behavior |

## Scope and non-goals

The proposal refines the feel of existing interactions, with a magnetic Wallet-style selection, separate details field, adaptive compact navigation, precise Crown, mechanical Hours, fluid Week gestures, task completion and reordering. Reuse the current planner state and native SwiftUI components. Do not create another card mode, separate scheduler, game loop, artificial streak, notification pressure, or new top-level Tasks destination.

**Implementation workflow:** Build the complete feature set directly in the existing native app on a development branch, then test and refine the integrated experience. **Do not create isolated prototypes, throwaway demo applications or substitute stores.** Focused commits and internal QA checkpoints are welcome; they are not separate products.

**No silent override:** Current Life reference, More/Settings, Classic, stored data, the native brand board and the release gates stay authoritative. Any conflict between an experimental motion target here and existing approved reference behavior needs an owner-approved amendment before implementation. Nothing in this folder authorizes a PR merge, build upload, or production release.

## Provenance and evidence

[Repo, source inspection only, main 86023907cbb88e1252b731b2d5073bc3133c20a3] LifeWalletStack.swift already has card selection and gestures; LifeRoot.swift renders a separate details surface and compact navigation; LifeHoursView.swift has dial/capacity drags; WeekCrownView.swift and SpreadTheme.swift define Crown behavior and motion tokens; ResponsibilitySidebar.swift exists for Week/Spread. Presence in source does **not** prove simulator behavior, haptic quality, frame rate, or physical-device parity.

[Rec] Atoms: focus, expressive but purposeful motion, and repeatable interactions. TimeKeep: readable chronological time structures. Physical fidget toys: controlled inertia, resistance, detents and magnetic settling. These are inspiration categories, not verified implementation details copied from those products.
