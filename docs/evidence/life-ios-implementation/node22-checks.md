# Node 22 verification

Implementation source: `9557f85dcbf32c62dcf627b13ada4bf967687383`.
Execution started November 6, 2026 at 12:47:54 UTC (6:47:54 AM America/Chicago).
Runtime: official Node.js **v22.23.4**, npm **10.9.9**, Linux x86_64.

The downloaded `node-v22.23.4-linux-x64.tar.xz` matched the official nodejs.org SHASUMS256 entry:
`1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce`.
No package or lockfile was changed for this runtime check.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0; 0 errors, 7 existing warnings |
| `npm run test:spread` | 474 passed, 0 failed/skipped; minimum 474, 46 files |
| `npm run test:scripts` | 232 passed, 0 failed, 4 documented platform-documentation skips; total/minimum 236, 15 files |
| `npm run docs:check` | Exit 0 |
| `npm run ios:sync` | Exit 0 |
| `python3 scripts/app-store-preflight.py --bundle dist-ios` | 16 passed, 0 failed |

[Complete Node 22 logs](node22-logs.tar.gz) include environment, exit statuses, typecheck, lint, both test suites, documentation, sync and bundle preflight output.
Archive SHA-256: `5f2994e73a40a0c81d5468765abd3a528aafb98306fb8edeb05daeb683f391da` (33358 bytes).

## Native build status

GitHub run [42219513590](https://github.com/WGLewis0721/spread-app/actions/runs/42219513590), at the frozen source, completed portable contracts successfully. Its `native-ios-compile` job remained queued with no assigned runner (requested label `macos-15`) when checked.
Codemagic required interactive sign-in; there was no usable authenticated session/token. No native host compilation, signed IPA, upload or installation is claimed.
Pure Swift tests, syntax parsing and browser reference results remain separate evidence. Physical iPhone screenshots, haptics, accessibility, upgrade and media recovery are still owed.
