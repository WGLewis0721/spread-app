# Life native acceptance — PR #146

Reviewed source: `9557f85dcbf32c62dcf627b13ada4bf967687383`.
Baseline main: `b074b881ff6b1134d745ce1697f841069d92cf4b` (rechecked November 6, 2026).
Status: **NO-GO for release; native/device acceptance remains owed.** Implementation is committed; code presence does not pass a behavioral criterion.

| Spec §9 criterion | Automated/source evidence | Acceptance |
| --- | --- | --- |
| 1. Preview, unchanged More/Classic, no mode data writes | Existing false-default flag; same More sheet. Protected source fingerprints below; planner guards and Classic task defaults covered. | OWED: installed mode-switch/data comparison and every More action. |
| 2. Sole focused card, separate tasks, focus restoration | LifeWalletStack and separate details; native focus state and rigid geometry implemented. | OWED: matched native captures and VoiceOver interaction. |
| 3. Capacity/budgets, drafts and single undoable release | Planner and Swift orbit arithmetic tests; revision/session-guarded release; one authoritative store. | OWED: real native gestures, draft animation and accepted/rejected acknowledgements. |
| 4. Reservations, full/zero capacity and cancellation | Model/dispatch tests and orbit boundary/seam/reversal tests; legacy totals preserved. | OWED: native cancellation/interruption and boundary-feedback observations. |
| 5. One acknowledged haptic, preference off | Life-local event ownership and optional feedback; completion follows accepted writes. | OWED: physical haptic strength/cadence and duplicate-pulse checks. |
| 6. Week/month selection and real daily data | Five calendar/order tests, read-only month projections, same selected surface and shared task editor. | OWED: native morph/date focus, gesture and layout verification. |
| 7. Priority, preview/shortage and atomic Apply/Undo | Dispatcher tests: own bank before unassigned, no other-area borrowing, stale-history/failed-save refusal. | OWED: native priority sheet journey and visible preview verification. |
| 8. Native notes, lists, files and content compatibility | Six editor/content/outline unit tests; rich v1 payload, unknown-field preservation, scoped drafts. | OWED: UIKit SDK build; formatting/selection/dictation/keyboard/relaunch journeys. |
| 9. Actual imported bytes, limits and recovery | [File recovery](file-recovery.md): checksum/profile/task/transaction tests with explicit byte archives. | OWED: physical provider cancellation, storage pressure, restart, upgrade, media and full local recovery. |
| 10. Rigid swipes, actual delete scope, contextual Undo/Redo | Grouped authoritative history; explicit all-weeks confirmation; draft-revision guard. | OWED: native edit/delete/cancel/history journeys and geometry comparison. |
| 11. Dynamic Type, VoiceOver, motion and Crown placement | Semantic/scaled type, reflow, alternate controls and Life-local preferences; active-iOS syntax parse. | OWED: actual native accessibility, contrast, both Crown sides and iPhone/iPad layouts. |
| 12. Exact signed candidate, offline/relaunch/upgrade, internal installation | Manual verify and separately approved exact-artifact upload controls prepared. | OWED: signed IPA, Apple processing/group assignment, physical in-place TestFlight installation. |

No criterion above is claimed passed end-to-end. No skipped feature is represented as native acceptance.

## Checks and preserved baseline

[Final checks](checks.md) and [execution record](execution-record.txt) contain commands, environment, counts, hashes and outcomes.
Planner 474/474; scripts 232 passed/4 documented skips; Python 20; pure Swift 50 native-package/45 cloud-package.
Reference 16 model + 8 desktop + 50 phone cases passed; those are reference-only evidence.
iOS-active syntax parsing is not SDK compilation or typechecking.

Byte-identical against main: `Sheets/ManageSheets.swift`, shared `SpreadTheme.swift`, Classic `WeekSurface.swift` and `SpreadSurface.swift`, `WeekCrownView.swift`, and the Classic `SpreadLiveRoot.content` implementation.
The shared task editor's added controls are guarded by `lifeMode` (false by default). Recovery internals intentionally extend byte archives without changing More's interface.

[Visual comparison](visual-comparison.md) · [Device record](device.md) · [Release controls](release.md).

Schema 4 prevents an older binary from silently rewriting new fields. Classic inside this binary remains the immediate presentation fallback; a binary downgrade needs a compatible build and protected backup.
