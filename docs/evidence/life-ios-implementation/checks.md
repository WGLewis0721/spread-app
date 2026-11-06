# Verification record — 2026-11-06

Status: implementation checks run in Linux; **native parity and release readiness are not established**. Final checks were rerun against frozen source commit `9557f85dcbf32c62dcf627b13ada4bf967687383`, tree `466d84792857323e7312dee711d5632747051816`, starting 2026-11-06T12:41:30Z. Every tracked non-evidence file matched that commit before and after checks, including after ios:sync. See [execution-record.txt](execution-record.txt) for observed output excerpts and full-log SHA256 values. This is not a signed-candidate result.

## Environment

Ubuntu 26.04.1 x86_64, Node 24.22.1 / npm 11.19.1 from sandbox (prepared Codemagic workflow uses Node 22 and has not run). Official Swift 6.4.2 Ubuntu26.04 archive: GPG good signature, Swift 6.x Release Signing Key fingerprint `52BB7E3DE28A71BE22EC05FFEF80A866B47A981F`. Swift target is Linux. Active iOS conditional branches were syntax parsed with `swiftc -frontend -parse -target arm64-apple-ios17.0`; this does **not** typecheck SwiftUI/UIKit or compile against Apple's SDK.

## Completed final checks at frozen source

| Check | Observed result |
| --- | --- |
| root npm ci --ignore-scripts | succeeded, 456 packages installed |
| root typecheck, lint | passed |
| test:spread | 474 passed, no failures/skips; minimum 474 |
| test:scripts | 232 passed, 4 skipped, no failures; total/minimum 236 |
| Python unittest discovery | 20 passed; Codemagic launch messages were mocked test output, no real build triggered |
| docs:check | passed |
| source App Store technical preflight | 14 passed |
| npm run ios:sync | passed, offline web bundle created |
| bundled technical preflight | 16 passed |
| native pure Swift package, integrated calendar/orbit/editor helpers | 50 passed |
| cloud pure Swift package | 45 passed |
| active iOS-target syntax parse (including UI tests) | passed; no SDK typecheck |
| simulator selectors | 8 passed, exact375/390/430 mappings |
| artifact approval test | valid roundtrip; changed IPA, manifest and source rejected |
| Life Codemagic YAML and embedded bash syntax | valid; no automatic trigger blocks |
| reference npm ci --ignore-scripts | passed, no audit vulnerabilities |
| reference pure model/math/planning tests | 16 passed |
| reference production build | passed |
| reference iPhone browser suite | 50 passed, official Chrome/WebKit, one worker |
| reference desktop browser suite | 8 passed, official Chrome, one worker |

Frozen reference started unmodified on port4183 using Vite's additional-host environment variable. Browser acceptance runs used official Google Chrome and Playwright WebKit with one worker: iPhone50/50 passed (3.4m), desktop8/8 passed (32.4s). All frozen-reference tracked files remain unchanged. The matrix exercises375/390/430 in both appearances; persisted matrix screenshots are390 only, under tools/life-reference/screenshots/iphone. These are **reference demo** tests, not native app evidence.

## Dependency audit inherited from baseline

Root install/audit reported 14 vulnerabilities: 2 low, 8 moderate, 3 high, 1 critical. No dependency upgrade was made as part of Life. Direct high/critical packages: `better-auth` (critical, OAuth Proxy/state account-takeover advisories; auth server uses genericOAuth), `vite` (high, development server/editor exposure), `zod` (high, oversized constrained collection memory exhaustion; used by native dispatch/preview bridge). `source-map-js` is high/transitive (indexed source-map denial of service). Presence and audit classification are verified; exploitable product paths are not established by this audit. These require a separate focused review before launch.

## Missing checks

No Xcode/iOS SDK compile, simulator native execution, native matched screenshots, VoiceOver session, physical iPhone haptic/gesture checks, signed IPA, App Store Connect build-number query or upload was performed. Signing credentials were not validated. All remain acceptance/release blockers. Do not interpret browser behavior or Linux tests as physical iPhone evidence.


## Pinned Node 22 follow-up

The required Node 22 rerun completed successfully on the same frozen implementation source. See [Node 22 results and complete archived logs](node22-checks.md). The earlier Node 24 execution record remains historical evidence; the runtime gap is resolved for the portable checks. Native SDK compilation and device checks remain owed.
