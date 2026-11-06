# Tactile Precision evidence

> Part of the [design brain](../../design/README.md). [Implementation and rollback](../../design/tactile-precision/IMPLEMENTATION.md)

Candidate baseline: main `d4afd9732e2d8b9e68ab62e9f84b67bee07305b2`. Scope: Classic and Life in the real native application, PR #150. No merge, Codemagic upload or deployment authorized.

| Gate | Evidence / status |
| --- | --- |
| Current main source | Reconstructed isolated checkout from committed local baseline plus GitHub compare/file contents; protected original dirty checkout left unchanged |
| Pure gesture contracts | New portable XCTest cases for detents, reversal, finite input, velocity/axis/edge arbitration and bounded cue cadence; CI results pending |
| Store acknowledgement | iOS package XCTest rejects an ok reply containing a durable save failure; CI results pending |
| Planner regression | Local Windows Node 25 run: 349 passed, 11 module-load failures; missing `@capacitor/core` dependencies prevented complete suite execution. This is not a green run. Node 22 CI required |
| Documentation links/budgets | `node scripts/design-docs.mjs` passed before final documentation; rerun on candidate required |
| Native compilation | No Xcode/Swift toolchain on local Windows host. macOS CI compile and iOS package XCTest required |
| Native screenshots | Added real-app ClassicLifeClassic persistence, separate-details geometry, sidebar/Crown and existing Life journeys at 390/820/1024pt in native-journeys. Artifacts pending; no synthetic UI screenshots supplied |
| More / reference integrity | More implementation and frozen `tools/life-reference/` excluded from change set; final source diff/hash review required |
| Physical iPhone | Unavailable: haptic feel, contact latency, 60/120Hz frame pacing, VoiceOver, interruption/reversal with real touch |
| Physical Duo | Unavailable: actual supported postures, hinge-safe layout, continuity and frame pacing. An iPad width is not Duo evidence |
| Physical iPad | Unavailable: touch/pointer/keyboard, rotation and window-resize acceptance |

## Native evidence collection

Record model, OS, appearance, text size, motion/transparency/contrast settings, source SHA and input modality with each capture. Compare Classic/Life Wallet closed/focused/edit, separate details, hours, Week/Month, Crown, task pending/accepted/rejected, and unchanged More. Use identical real planner data before/after. Repeat at 390, 820, 1024 and 1366pt, light/dark and largest accessibility text. The existing native-layout and Duo pose suites supplement the new tactile journeys.

On a physical iPhone, check at least 100 card toggles and 100 Crown drags with 30 reversals; scrub each hour control through a detent, reverse and cancel; retry rejected saves; turn feedback off; interrupt with a sheet/background/rotation; confirm no stuck translation, duplicate tick or success on failure. Measure contact-to-frame latency and long-frame counts with Instruments. Release remains **NO-GO** until the required observations exist on the reviewed SHA.

## Release boundary

The PR's Vercel branch is explicitly disabled. Existing release workflows, signing, build numbers, publishing and production main remain unchanged. [Rollback instructions](../../design/tactile-precision/IMPLEMENTATION.md#rollback).
