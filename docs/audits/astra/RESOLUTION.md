# Astra review A01–A15: resolution

Reviewed commit: `3c4a90c`. All fixes are on `main` as of `6e8c687` (#47 merged last). Every finding is **implemented; awaiting Astra verification**. None is closed, the BLOCK stands, the iCloud flags stay off, and no release gate is complete.

| ID | Fix | Regression test |
|---|---|---|
| A01 customised profile treated as empty | `f7119c1` | `pristine.test.ts`, `store-restore.test.ts` |
| A02 restore not all-or-nothing | `f7119c1`, `c45eeb4` | `restore-tx.test.ts`, `store-restore.test.ts` |
| A03 stale payload sent with iCloud's newer tag | `bfdb3f4` (#47) | Swift `OutboxGateTests`, `OutboxIsolationTests` |
| A04 ack drops newer or unsaved changes | `519e454`, `c45eeb4` (+ #47 for engine-state failure) | `sync-durability.test.ts`, Swift `SyncStorageTests` |
| A05 failed resolution replays the opposite choice | `519e454`, `c45eeb4` | `sync-durability.test.ts` |
| A06 consent releases an unscoped queue; re-upload incomplete | `bfdb3f4` (#47) | Swift `OutboxGateTests`, `OutboxIsolationTests`; `sync-durability.test.ts` |
| A07 pause not enforced at the final send | `bfdb3f4`, `544d1bf` (#47) | Swift `OutboxGateTests`, `OutboxIsolationTests` |
| A08 disabling backup leaves uploads queued | `eb3bfc9` | `backup-consent.test.ts`, `consent.test.ts` |
| A09 safety copies unverified; no recovery at 10 profiles | `eb3bfc9` | `sync-durability.test.ts`, `store-restore.test.ts`, `pins.test.ts` |
| A10 damaged data accepted | `918106d`, `fbefbd5` | `sync-integrity.test.ts`, `backup-full.test.ts` |
| A11 copy-last-week reuses ids | `918106d` | `week-identity.test.ts` |
| A12 restored device identity | `918106d` | `sync-session.test.ts` |
| A13 local-only success suppresses retry | `eb3bfc9` | `backup-consent.test.ts` |
| A14 small-planner reset bypasses the guard | `918106d` | `sync-guard.test.ts` |
| A15 CI passes with failing or zero tests | `222c38e`, `b0ad38b` | `scripts/run-tests.mjs`, run by CI |

Tests are in `src/lib/spread/`. Swift tests are in `ios/App/SpreadCloudCore/Tests/`.

## Limits

- The `CKSyncEngine` integration (A03, A04, A06, A07) has no executable test. The Swift tests cover storage and the send decision only, and CI is their only run.
- A "kill" in the tests is modelled in code, not a real killed app.
- A04 is weakly evidenced: only 1 of its 4 web tests fails on the old code. The other 3 pass there and only guard the fix.
- A15: 4 script tests that read platform-owned documents are skipped with a stated reason, not passing.
- A10's fix briefly made an untouched planner look like data and backed it up empty. CI caught it on `main` and `fbefbd5` fixed it.
- `main` was merged with `bridge-sims` red; it is green again from `5b0bdb0`.

## Rollback

- The iCloud flags (`VITE_SPREAD_CLOUD_BACKUP`, `VITE_SPREAD_CLOUD_SYNC`) are build-time and off. The A01, A02, A10, A11 and A14 fixes also affect flags-off paths, so turning a flag off does not undo them.
- To revert: `git revert -m 1 5b0bdb0`, then `git revert -m 1 35761a9`. This returns the code to #30, which still has the original defects. Untried.
- Anything that replaces data first saves a safety copy (`spread-pinned-<time>-<label>.json`), restorable from "Restore from a safety copy" in the app. An interrupted restore is finished or undone at next launch.
- Procedures for the wider feature are in `docs/ICLOUD_PLAN.md` §12. No rollback has been rehearsed.

## Still required

Real iPhone and iPad runs, production CloudKit and a signed build, two real devices, a rollback rehearsal, and accessibility and iPad layout review. None is done.
