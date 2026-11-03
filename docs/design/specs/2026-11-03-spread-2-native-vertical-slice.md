# Spec: Spread 2.0 SwiftUI vertical slice (implementation)

> Part of the [Spread design brain](../README.md). Follow [PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). This is a prototype branch, not release approval.

| | |
|---|---|
| Request | Translate the approved Chalkboard native spec into SwiftUI and begin migration |
| Surface | iOS Week and Spread |
| Status | **In progress** — fixture-only, no live data adapter |
| Source | `main` at `35b66522f30836d1eb74ca9758c6d3f24c0de2e3`; artwork and modes selectively copied from `spread-studio` |
| Risk | Medium, isolated debug-only entry |
| Release | **Not authorized** |

## Contract
**Responsibilities → Hours → Week → Tasks**. Fixed Chalkboard art (11 original illustrations), five presentation modes (Stack/Fan/Dial/Tabs/Day), horizontal metal week Crown. No Studio, wallpapers, themes, backgrounds, look editors or new accounts. Preserve WebView localStorage and native mirror; no new data formats, cloud changes or second live store.

## Implemented in this PR
- `ios/SpreadNativeV2/Sources/SpreadNativeV2/`: `PlannerSnapshot`, `CrownTravel`, `DialGeometry`, `WeekCrownView`, `ChalkboardViews`, `SpreadLayoutsView`, `WeekPreviewView`, `NativePreview`.
- Exact chalk WebP resources copied by SHA from the Studio branch. No regeneration or outside assets.
- Debug-only Xcode launch argument `-SpreadNativeV2Preview`. Default/Release remains Capacitor.
- Unit tests for pure navigation and presentation models.

## Quantitative gates (targets, **not** verified)
| Area | Threshold | Evidence required |
|---|---|---|
| Crown | 64pt travel / week, ≤3 detents per drag, 0 spurious changes in 100 gestures + 30 reversals | Pure tests + physical recording |
| Modes | Five working views using identical roles/hours/tasks, no mutation on mode switch | UI tests across normal/empty/dense states |
| Art | 11/11 exact source assets, SSIM ≥0.95 for unchanged art where aligned reference exists | Asset hash + screenshots |
| Touch & motion | ≥44pt targets, p95 feedback ≤100ms, 60fps target, 0 visible jumps | SwiftUI previews, Instruments, hardware |
| UX | Core flows ≤3 taps where specified, and ≥20% median task speed improvement on 4/5 benchmark journeys | 10+ uncoached participants, baseline compare |
| Data | 0 loss/duplication, 0 role-day violations, exact Undo and rollover | 50 deterministic TS↔Swift fixtures |
| Scope | 0 Studio/background/editor routes | Navigation inventory |

## Added wire protocol boundary
- `src/lib/spread/native-v2-projection.ts` maps an active profile and selected week to a **read-only, versioned** `NativeV2Envelope`. It preserves stable role, task, and allocation IDs and each allocation's `order`.
- `ios/SpreadNativeV2/Tests/SpreadNativeV2Tests/Fixtures/projection-v1.json` is checked by TypeScript and decoded by Swift. Neither language may persist the flattened projection as the full planner because task notes/photos and historical weeks are deliberately omitted.
- Source-of-truth parity for the wire protocol is unit-tested; live JS↔Swift transport and persistence safety are still unimplemented.

## Blockers before a live-data branch
1. Map TypeScript week box/task/allocation JSON to the native immutable snapshot, retaining IDs and exact week key.
2. Implement typed adapter dispatch to current Zustand actions; no duplicated scheduling logic.
3. Add action and error surface for hour placing, task creation, task moving/Undo and rollover.
4. Re-run historical overbooking/rollover/data-loss reports on current `main` and run hardware tests.
5. Review exact iOS asset decoding and Xcode compile; Linux Swift tests are insufficient.

## Rollback
Delete the feature branch / disable the Debug launch argument. Approved `main` is unchanged. No user data is touched or migrated.
