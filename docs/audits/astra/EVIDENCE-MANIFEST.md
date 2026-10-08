# Evidence manifest — A01–A15

The [original review](Astra-Spread-iCloud-Review-PR31-39.md) is authoritative for exact source references, severity, reproduction recipes, qualification and corrective work. Its fifteen `### Axx` headings are preserved unchanged. This manifest indexes existing evidence; it does not reconstruct findings or claim new tests.

Run the archived probes using [README instructions](README.md#reproduce-the-original-typescript-probes). The source under test must be `3c4a90c9edd45ba3a413ab196bf68b76f3dff356`. Script line anchors below refer to unchanged archived bytes. All referenced files are in this repository; no Windows-local files are needed.

| Finding | Original evidence and reproduction entry point | Verification boundary |
|---|---|---|
| A01 — customized profile treated as empty | [Store probe, lines 19–25](evidence/store-repro.mjs.txt#L19); [store output](evidence/store-repro.log); [pure predicate probe](evidence/audit-repro.mjs.txt#L61); [#34 diff](evidence/pr-34.diff) | Executed actual restore action and predicate; original report documents malformed-storage extension |
| A02 — nontransactional restore / false success | [Store probe, lines 5–18](evidence/store-repro.mjs.txt#L5); [store output](evidence/store-repro.log); [#33 diff](evidence/pr-33.diff); [#34 diff](evidence/pr-34.diff) | Executed quota failure at final roster write; additional interruption boundaries are specified in original A02 |
| A03 — stale payload with new CloudKit tag | [#35 native diff](evidence/pr-35.diff); [#36 native diff](evidence/pr-36.diff); original review A03 has pinned Swift references and T1/L/R/T2 fetch-before-send recipe | Source-confirmed; no native executable reproduction or real CloudKit result existed in the original archive |
| A04 — unsafe inbox acknowledgment | [Session probe](evidence/audit-repro.mjs.txt#L21); [name-only acknowledgment model](evidence/audit-repro.mjs.txt#L47); [output](evidence/audit-repro.log); [#39 storage diff/test](evidence/pr-39.diff) | Executed save failure in real session; second reproduction models Swift's name-only ack, not a native execution |
| A05 — failed resolution sends opposite choice | [Session probe](evidence/audit-repro.mjs.txt#L30); [output](evidence/audit-repro.log); [#33 diff](evidence/pr-33.diff); [#37 diff](evidence/pr-37.diff) | Executed conflict resolution with injected planner-write failure and subsequent pass |
| A06 — account/profile consent releases global queue | [#36 diff](evidence/pr-36.diff); [unchanged-state reseed probe](evidence/audit-repro.mjs.txt#L98); [output](evidence/audit-repro.log); original A06 gives two-profile/two-account and unlink recipes | Queue authorization mismatch is source-confirmed; no-reseed portion executed in real TS session; native account switching unexecuted |
| A07 — final send boundary / durable pause | [#36 diff](evidence/pr-36.diff); [#39 storage diff/tests](evidence/pr-39.diff); [native CI log](evidence/ios-39.log); original A07 provides restored-pending-state, pause-corruption and stale-callback recipes | Source-confirmed; native scheduling and disk-failure test execution remains outstanding |
| A08 — pending backup after opt-out | [Runner probe](evidence/audit-repro.mjs.txt#L74); [output](evidence/audit-repro.log); [#37 diff](evidence/pr-37.diff) | Executed real runner with manager-equivalent disable/flush sequence; not flag-on UI execution. Consent partial-write edge is source-confirmed |
| A09 — unverified sync safety copies | [Session snapshot probe](evidence/audit-repro.mjs.txt#L41); [output](evidence/audit-repro.log); [#37 diff](evidence/pr-37.diff); original A09 includes pin/cap-ten recovery recipes | Executed failure of asynchronous snapshot; retention/capacity limitations source-reviewed |
| A10 — semantically damaged payload accepted | [Backup shape probe](evidence/audit-repro.mjs.txt#L53); [vector/field predicate](evidence/audit-repro.mjs.txt#L61); [task blanking probe](evidence/audit-repro.mjs.txt#L93); [output](evidence/audit-repro.log); [#35 diff](evidence/pr-35.diff) | Executed checksum-valid missing/bad-shape backups and malformed incoming task |
| A11 — copied-week identity collision | [Actual store action](evidence/store-repro.mjs.txt#L26); [store output](evidence/store-repro.log); [pure round-trip](evidence/audit-repro.mjs.txt#L67) | Executed actual copyLastWeek and flatten/assemble; inherited defect distinguished in original review |
| A12 — device identity cloned in restored TS state | [#35 state-file diff](evidence/pr-35.diff); original A12's pinned `cloud-sync.ts` references and new-device backup/restore recipe | Source-confirmed provenance gap; no hardware device-restore result existed in original archive |
| A13 — local-only success suppresses cloud retry | [Runner probe](evidence/audit-repro.mjs.txt#L81); [output](evidence/audit-repro.log); [#38 diff](evidence/pr-38.diff) | Executed unchanged-signature retry suppression; native container recovery not executed |
| A14 — small-planner reset bypasses guard | [Capture probe](evidence/audit-repro.mjs.txt#L87); [output](evidence/audit-repro.log); [#31 diff](evidence/pr-31.diff) | Executed one-task reset versus default data |
| A15 — CI / test-discovery / native coverage gaps | [Explicit script failures](evidence/script-tests-explicit.log); [false-green npm invocation](evidence/npm-test.log); [Git Bash invocation](evidence/npm-test-bash.log); [CI log](evidence/ci-39.log); [iOS log](evidence/ios-39.log); [#39 diff](evidence/pr-39.diff) | Original results: explicit scripts 179/195 with 16 failures; Spread 187/187; Swift core 24; four bridge suite counts. Fake/native differences source-reviewed |

## Reproduce A15's explicit script enumeration

In the pinned reviewed checkout, PowerShell:

```powershell
$auditScriptTests = @(rg --files scripts -g '*.test.mjs')
if ($auditScriptTests.Count -eq 0) { throw 'No script tests discovered' }
node --test @auditScriptTests
```

On a Unix-like shell with `rg`:

```sh
rg --files scripts -g '*.test.mjs' > /tmp/spread-audit-script-tests.txt
test -s /tmp/spread-audit-script-tests.txt
node --test $(cat /tmp/spread-audit-script-tests.txt)
```

The original platform was Windows/Node 25.6.1; failures and counts may differ on another environment. Compare the exact archived failures rather than claiming identical native behavior. This intentionally avoids the quoted-glob zero-test issue. Use an isolated scratch checkout so test-generated files cannot affect remediation work.

## Other preserved results

- [187-test successful rerun](evidence/test-spread-unzip.log), [initial environment failure](evidence/test-spread.log), [typecheck](evidence/typecheck.log), [lint](evidence/lint.log), [dependency setup](evidence/npm-ci.log).
- Per-PR metadata and diffs for **all #31–#39** are `evidence/pr-<number>.json` and `evidence/pr-<number>.diff`.
- Failed historical iOS jobs: [#31](evidence/ios-31-failed.log), [#34](evidence/ios-34-failed.log), [#35](evidence/ios-35-failed.log), [#37](evidence/ios-37-failed.log). Original Actions URLs are also in the unaltered review and PR metadata.
- [audit-loader.mjs.txt](evidence/audit-loader.mjs.txt) is the unchanged helper required by the store probe.

Large logs may exceed GitHub's rendered-file preview limit. Their complete committed bytes are available with `git clone`, GitHub's Raw/Download button or the Git blobs API. The publication task verifies each blob through GitHub, not just its local presence.
