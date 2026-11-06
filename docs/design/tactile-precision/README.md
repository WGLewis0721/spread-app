# Tactile Precision: native Spread Life

> Part of the [Spread design brain](../README.md). See the [approved Life iOS spec](../../../SPREAD_LIFE_IOS_SPEC.md).

This folder defines a single physical interaction language for the existing opt-in native Life mode. It does not create another app, prototype, planner store, navigation destination or visual theme.

| Document | Authority |
| --- | --- |
| [MOTION_SPEC.md](MOTION_SPEC.md) | The Glide / Snap / Settle interaction and feedback contract |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Verification, physical-device evidence and release gates |
| [Implementation brief](../specs/2026-11-06-tactile-precision-native.md) | Scope, alternatives, risk, ownership and rollback |

**Priority:** Actual planner data and [Life handoff](../../../SPREAD_LIFE_IOS_HANDOFF.md) prevail. [Native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md) controls appearance; [iOS 27 audit](../platforms/IOS27_BEHAVIOR_AUDIT.md) controls platform checks. Preserve More/Settings, Classic, source demo, existing task semantics, and the approved Life layout. No merge, TestFlight or production release is authorized.

**Source inspection:** Main at `86023907cbb88e1252b731b2d5073bc3133c20a3`, November 6, 2026. Wallet with an independent detail field, Hours gestures, Crown and compact overlay were already present. This feature PR refines those behaviors and adds an adaptive wide rail. Passing physical-device acceptance is still unverified.
