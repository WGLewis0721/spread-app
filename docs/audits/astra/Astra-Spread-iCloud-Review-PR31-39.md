# Astra — Spread iCloud remediation review, PRs #31–#39

**Recommendation: BLOCK the integrated merge into `main`. iCloud release readiness: BLOCK.**

Reviewed 8 October 2026. Integrated target: PR #39, commit `3c4a90c9edd45ba3a413ab196bf68b76f3dff356`; base branch `fix/f8-hardening` at `4a2d30dba57d908ddcab1241a977968feb6519b6`. Comparison baseline: fetched `main`, `7afcd204d52f17f7ca994175d9448c13dc1429d9`. All code references below are pinned to the reviewed commit. GitHub's “mergeable/clean” is not a safety approval.

The stack improves several important paths, but does not close the safety audit. Two restore defects operate with both iCloud flags **off**: a customized profile is classified as empty and overwritten, and failed roster persistence is reported as a successful restore. These prevent recommending the combined change for `main`. Additional sync and consent defects prevent enabling iCloud even after those local regressions are fixed.

Read-only review: no repository source edits, commits, PR comments/reviews, merges, deployments, flag changes, or release-gate changes. Tests and injected-failure reproductions ran in a disposable detached checkout; reproduction scripts and reports are outside the repository. Final tracked/untracked repository status was clean. No real user planner or iCloud account was used.

## Evidence and scope

Started with `docs/ICLOUD_PLAN.md`, then inspected the TypeScript store, backup/parser/restore, mirror/safety, merge/model/state/session/manager, Swift plugin/engine/storage/backup/identity, relevant tests, all nine PR diffs, workflows and actual Actions logs. The plan is an acceptance contract, not proof that its promises hold.

**Reproduced** means the checked-out production TypeScript functions were executed with in-memory data and injected failures. **Transport model** means those functions ran against a small fake matching the relevant native operation; it does not claim a CloudKit hardware reproduction. **Source-confirmed** means the implementation establishes the defect, with a native reproduction recipe still requiring execution. Native findings are explicitly labeled below.

## Severity-ranked corrective findings

### A01 — HIGH / P1: customized profiles are overwritten as “empty” (flags-off merge blocker)

References: [src/lib/spread/sync-link.ts:40](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-link.ts#L40); [src/lib/spread/store.ts:279](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/store.ts#L279); [src/lib/spread/backup.ts:299](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/backup.ts#L299). Primarily #34; the same predicate also weakens #33 adoption.

`isPristine` checks hat IDs/names/default hours and absence of tasks/allocations. It ignores custom weekly box hours and hat color/category. `emptyProfileId` uses it to authorize replacing an existing profile during ordinary full-backup restore. This contradicts the restore confirmation's promise that nothing with content changes.

**Reproduced:** keep the default hats, set a box to 29 hours and a hat color to `#123456`, with no tasks or allocations. Restore one full profile. Actual `restoreAsNew` returns `replacedEmpty: true`; the original customization is overwritten. No iCloud feature needs to be enabled. Related risk: JSON such as `null` normalizes to default data and can also be mistaken for a genuinely empty saved profile.

**Corrective work:** use an explicit pristine/provenance marker or a complete canonical comparison of all user-editable content, and validate saved shape before treating anything as empty. An ambiguous or damaged profile must occupy its slot. Add flags-off store/UI tests for changed hours, colors, categories, multiple empty weeks and damaged-but-parseable storage. Test adoption with the same cases.

### A02 — HIGH / P1: restore commits are not transactional; final roster failure still reports success (flags-off merge blocker)

References: [src/lib/spread/store.ts:296](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/store.ts#L296); [src/lib/spread/store.ts:849](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/store.ts#L849); [src/spread/screens/spread-app.tsx:1534](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/spread/screens/spread-app.tsx#L1534). Related unchecked writes: [src/lib/spread/store.ts:824](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/store.ts#L824) and [src/lib/spread/store.ts:834](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/store.ts#L834). #34 and #33.

`writeProfiles` discards `put`'s failure. `restoreAsNew` writes profile bodies, calls that unchecked roster write, changes the in-memory roster and returns success. A failure halfway through the body loop also leaves earlier writes in place, including a replaced empty profile, although the UI says “Nothing was changed.”

**Reproduced:** seed one nonempty profile; let body writes succeed but throw on `localStorage.setItem("spread.profiles", ...)`. Actual restore returns success and the UI store has two profiles, while the durable roster still has one. Reload loses access to the newly restored profile. Bytes may remain orphaned; this is not a claim that the original backup file is destroyed.

**Corrective work:** propagate every persistence result; stage immutable profile bodies under fresh keys, then durably commit the roster and only then publish success. Journal/recover interruptions and handle replacement without altering a live profile before commit. Apply the same rule to `setSyncId`, `addSyncedProfile`, and synced renaming. Add fault injection at every write, final roster quota failure, interrupted replacement and restart recovery tests.

### A03 — HIGH / P1: incoming CloudKit tags can authorize an unmerged stale payload to overwrite the server

References: [ios/App/App/Cloud/SpreadSyncEngine.swift:238](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L238); [ios/App/App/Cloud/SpreadSyncEngine.swift:274](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L274); [ios/App/App/Cloud/SpreadSyncEngine.swift:299](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L299); [ios/App/App/Cloud/SpreadSyncEngine.swift:314](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L314). Inherited transport defect, still present through #35/#36/#39.

**Source-confirmed race; not executed on CloudKit.** Fetched records immediately replace saved system fields/change tags, even if an older local payload for the same record remains in the outbox. `record(for:)` later combines that outbox payload with the newly fetched tag. CloudKit can then accept stale content as a current update, bypassing the expected `serverRecordChanged` safeguard. The merge occurs later in JavaScript and may be suspended or terminated. The conflict-error handler similarly advances the tag while keeping the old queued payload; resuming re-adds that queue.

**Reproduction to automate:** start at tag T1; queue local edit L; another device writes conflicting edit R at T2. Deliver the fetch of R while JavaScript is paused, then request a send batch before merging. Inspect whether L is emitted with T2. Also restart after `serverRecordChanged` but before user resolution. Do not accept a test fake that suppresses incoming changes for names in its outbox; the existing browser fake does that, unlike Swift.

**Corrective work:** bind each queued payload to its acknowledged base tag; quarantine sending for a record with unmerged inbound data/conflicts. Advance tags and release the queue only as part of a committed merge. Add transport-level tests and a real two-device offline conflict test. Apple documents that applications must handle `serverRecordChanged`; CKSyncEngine does not merge application content for them: [CKSyncEngine](https://developer.apple.com/documentation/cloudkit/cksyncengine-5sie5).

### A04 — HIGH / P1: inbox acknowledgment can lose unresolved or newer changes

References: [src/lib/spread/sync-session.ts:131](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-session.ts#L131); [src/lib/spread/sync-session.ts:185](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-session.ts#L185); [src/lib/spread/sync-session.ts:219](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-session.ts#L219); [ios/App/SpreadCloudCore/Sources/SpreadCloudCore/SyncStorage.swift:184](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/SpreadCloudCore/Sources/SpreadCloudCore/SyncStorage.swift#L184). #35/#39.

There are two independent holes. First, the session acknowledges inbound data before its state is durably saved; `save()` does not await the state-file write and merely reports failures. A conflict's remote side may exist only in that unsaved state. Second, Swift acknowledges by record name, so a newer version staged after the JavaScript read is removed by an acknowledgment of the older version.

**Reproduced:** local and remote conflicting edits plus `saveState: () => false` result in one visible conflict, zero durable conflicts and an empty inbox. Restart loses the conflict. **Transport-model reproduction:** replace inbox version 2 with version 3 immediately before name-only acknowledgment; the planner contains version 2 and the inbox is empty. Swift's `ackInbox` performs that same unconditional removal. Its test only covers deletion by name, not replacement between read and ack.

**Corrective work:** durable apply/conflict-state commit before acknowledgment; acknowledge a specific DTO/vector/hash or inbox generation using compare-and-remove. Do not advance fetched tokens past an inbox write failure. Add process-kill boundaries, failing state/inbox writes, and concurrent re-staging tests. `saveEngineState` also swallows errors and needs coordinated durability with the inbox.

### A05 — HIGH / P1: a failed conflict resolution can later sync the opposite choice

References: [src/lib/spread/sync-session.ts:269](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-session.ts#L269); [src/lib/spread/sync-session.ts:288](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-session.ts#L288). #33/#37.

Unlike the ordinary inbound merge path, `resolveConflict` commits the resolved state in memory before snapshot/apply succeeds. `restoreDiscarded` does likewise. If `apply` throws, the conflict has already disappeared and its dominating vector remains.

**Reproduced:** create local text “local” versus remote “remote”; choose remote and make planner persistence throw. The operation rejects, but the conflict count becomes zero. On the next pass, the unchanged local text is captured as a new edit and queued with a vector newer than the resolution. The person's choice is reversed and can propagate to other devices.

**Corrective work:** compute a candidate state without replacing the live state; commit only after verified snapshot and successful durable planner update. On failure retain the conflict/discarded entry and retry safely. Test both choices, keep-both, set-aside restoration, and failure at snapshot, body and roster writes.

### A06 — HIGH / P1: per-profile re-upload consent releases a global, account-unscoped queue

References: [src/lib/spread/cloud-sync.ts:355](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-sync.ts#L355); [ios/App/App/Cloud/SpreadSyncEngine.swift:112](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L112); [ios/App/App/Cloud/SpreadSyncEngine.swift:128](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L128); [ios/App/SpreadCloudCore/Sources/SpreadCloudCore/SyncStorage.swift:204](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/SpreadCloudCore/Sources/SpreadCloudCore/SyncStorage.swift#L204); [src/spread/screens/spread-app.tsx:2080](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/spread/screens/spread-app.tsx#L2080). #36.

**Source-confirmed authorization mismatch; native execution outstanding.** The confirmation names one profile. `clearPause` clears a global account binding but retains all pending rows; `resume` requeues every outbox name, without filtering by account or selected profile. The same global replay can send a formerly linked profile's residual work after unlinking it and starting another profile. Inbox state also survives the account reset.

**Reproduction:** under account A, queue edits for profiles P and Q while offline; switch to account B; confirm “Upload P … again.” Verify the batch: current code selects P and Q. Also test unlink P with pending writes, then start Q.

A second defect makes that confirmation incomplete: unchanged, already-confirmed items are not requeued after a deleted zone/account reset. `uploadAgain` retains the TypeScript agreed state; only pending edits are sent. A pure-session reproduction with an unchanged agreed state and empty cloud sends zero rows. Thus the action can both leak unrelated pending work and fail to upload the selected profile completely.

**Corrective work:** isolate state/outbox/inbox/bindings by account and sync profile. Re-upload must snapshot, enumerate exactly the confirmed profile, create a fresh agreed-state boundary and enqueue its complete graph. Quarantine old-account work and remove an unlinked profile from send eligibility. Test two profiles, two accounts, empty outbox, partial outbox, zone deletion, relaunch and unlink.

### A07 — HIGH / P1: “fetch-only” and durable pause are not enforced at the final native send boundary

References: [ios/App/App/Cloud/SpreadSyncEngine.swift:71](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L71); [ios/App/App/Cloud/SpreadSyncEngine.swift:112](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L112); [ios/App/App/Cloud/SpreadSyncEngine.swift:156](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L156); [ios/App/App/Cloud/SpreadSyncEngine.swift:299](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/SpreadSyncEngine.swift#L299); [ios/App/SpreadCloudCore/Sources/SpreadCloudCore/SyncStorage.swift:74](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/SpreadCloudCore/Sources/SpreadCloudCore/SyncStorage.swift#L74); [ios/App/SpreadCloudCore/Sources/SpreadCloudCore/SyncStorage.swift:109](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/SpreadCloudCore/Sources/SpreadCloudCore/SyncStorage.swift#L109). #36/#39.

**Source-confirmed missing safeguards; native scheduling reproduction outstanding.** `start` restores serialized pending changes with `automaticallySync = true`. Neither the batch delegate nor record provider checks `resumed`, pause, account identity or an engine generation. Restored pending operations can therefore escape the claimed fetch-only mode. Apple states pending operations are scheduled automatically: [pending record-zone changes](https://developer.apple.com/documentation/cloudkit/cksyncengine-5sie5/state-swift.class/pendingrecordzonechanges).

`stop()` drops the engine reference without explicitly canceling operations; callbacks have no stale-engine guard. Corrupt `pause.json` becomes an unpaused default, and callers ignore `updatePause` failure. `needsRepair` is displayed but does not inhibit sending. The account check also proceeds when `userKey()` returns nil, and `resume` does not revalidate an existing binding against the current account.

**Reproduction:** restart with persisted pending changes, call browse without resume and drive a send callback; assert no data/zone writes. Corrupt the pause file while retaining an outbox, or make pause persistence fail, then relaunch. Deliver a stale callback after stop/account change. Assert fail-closed behavior in every case.

**Corrective work:** serialize engine lifecycle (actor or equivalent), cancel and invalidate old engines, check authorization in every batch/record/database-send path, and fail closed on unresolved identity or damaged pause state. Persist a verified binding before permitting sends. Add Swift engine behavioral tests; storage unit tests alone cannot establish this.

### A08 — HIGH / P1: disabling backup leaves queued uploads and retries active

References: [src/lib/spread/cloud-backup.ts:136](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-backup.ts#L136); [src/lib/spread/cloud-backup.ts:145](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-backup.ts#L145); [src/lib/spread/cloud-backup.ts:159](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-backup.ts#L159); [src/lib/spread/backup-runner.ts:88](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/backup-runner.ts#L88). #37.

The initial no-consent gate is useful. However, turning backup off only removes the storage listener. It does not dispose/cancel the runner, clear pending work, or gate its transport. A scheduled debounce, retry, launch backup or unconditional background flush still calls `backupWrite`. New content can be collected after the person opted out.

**Reproduced at runner boundary:** mark dirty, simulate the manager's disable behavior (detach changes, no dispose), then flush as `pagehide` does. One cloud write occurs after disabled state. The exact wiring is visible in the manager; no build flags were enabled for the reproduction.

There is also a persistence edge: the first-run “Not now” writes acknowledgment first, then writes `off`. If that second write fails, the next launch sees acknowledgment plus no opt-out and enables backup. This path is source-confirmed, not end-to-end reproduced.

**Corrective work:** check live consent immediately before every native handoff, cancel pending/retry work on disable and make opt-out persistence fail closed. Store consent as one versioned value or persist off before acknowledgment. Test disable during debounce/build/retry, background flush, first-run partial writes and relaunch. Distinguish already-handed-off OS uploads from new writes initiated after opt-out.

### A09 — HIGH / P1: sync safety copies are fire-and-forget; recovery is not guaranteed

References: [src/lib/spread/cloud-sync.ts:171](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-sync.ts#L171); [src/lib/spread/sync-session.ts:178](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-session.ts#L178); [src/lib/spread/native-mirror.ts:245](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/native-mirror.ts#L245); [src/lib/spread/safety.ts:11](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/safety.ts#L11); [src/spread/screens/spread-app.tsx:1726](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/spread/screens/spread-app.tsx#L1726). #37.

Restores/link-upload/adoption await `ensureSafetyCopy`, but ordinary sync merge/resolution still call a void snapshot dependency. The actual callback launches `pinSnapshot` without awaiting or checking its verified result. `linkAddCopy` also bypasses `takeSafetyCopies` despite the blanket UI claim.

**Reproduced:** make the snapshot return a promise resolving false; the incoming change is applied anyway. Sync tests currently assert that a snapshot callback was invoked, not that storage verification finished successfully. Snapshot collection reads localStorage, so a failed flush can also preserve an older stored version rather than the live edit.

Local pins retain only the latest 15 entries, not the plan's minimum age for protected snapshots. Sixteen later copies can evict a recent pre-restore/pre-link copy. The “Restore from a safety copy” UI converts it into a full backup and adds profiles; at ten nonempty profiles it has zero capacity and cannot perform the promised rollback without removing a profile first. It does not restore the whole original roster/settings in place.

**Corrective work:** make verified snapshot success a prerequisite to mutation; after awaiting it, recheck profile identity and local revision or recapture/retry so concurrent edits remain safe. Preserve unsaved live data, protect required pin ages, and design an explicit transactional rollback at the profile cap. Test disk-full/mismatch, concurrent edits, 16+ pins, cap-ten rollback and all linking branches.

### A10 — HIGH / P1: “damaged” validation accepts valid JSON that erases content

References: [src/lib/spread/sync-link.ts:93](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-link.ts#L93); [src/lib/spread/cloud-sync.ts:315](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-sync.ts#L315); [src/lib/spread/cloud-sync.ts:341](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-sync.ts#L341); [src/lib/spread/backup.ts:203](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/backup.ts#L203); [src/lib/spread/backup.ts:266](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/backup.ts#L266). #35/#34.

Sync validation checks presence of keys, not their types or valid relations; version-vector arrays and nonnumeric counters are not rejected. Adoption/add-copy call `toItems` directly without even applying `isDamagedRow`. A checksum only confirms bytes, not a valid planner.

**Reproduced:** a newer row with `{text:null, week:null, hat:null}` passes `isDamagedRow`, blanks an existing task's text and is acknowledged. `v: "[]"` also passes the validator. Separately, a checksum-valid full backup with a missing store and a parseable store whose `boxes` is a string lists both profiles as readable and restores two blank profiles with zero skipped warnings.

**Corrective work:** strict, versioned semantic validation shared by discovery, adoption, steady-state sync and restore; validate identity/record-name consistency, vectors, required field types, content blocks and references before normalization. Distinguish a genuinely uninitialized profile from a missing body; reject/quarantine damaged profiles and preserve their original bytes. Add valid-JSON corruption, wrong types, missing stores, malformed vectors and adoption tests. Do not silently normalize damage into an empty success.

### A11 — HIGH / P1: “Copy last week” aliases task/allocation identities across weeks

References: [src/lib/spread/store.ts:779](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/store.ts#L779); [src/lib/spread/sync-model.ts:29](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-model.ts#L29); [src/lib/spread/sync-model.ts:51](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-model.ts#L51); [src/lib/spread/sync-model.ts:90](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-model.ts#L90). Inherited prerequisite defect, not introduced by these nine diffs; blocks the combined iCloud release claim.

`copyLastWeek` uses `structuredClone` and retains IDs, while sync record keys are only `task:<id>` / `alloc:<id>`, without a week. Flattening produces duplicate keys; reconstruction maps them to a single entity.

**Reproduced using the actual store action:** copy a week containing one task into the next week, then `assemble(flatten(data))`. Two task occurrences become one. A later inbound merge reconstructing the planner can expose this loss even if unrelated content triggered it.

**Corrective work:** mint fresh task/allocation IDs with correctly remapped allocation references when copying, and migrate or safely split existing duplicates before sync is linked. Test multiweek round-trip/no-loss invariants, repeated copying, historical duplicate IDs, allocation references and two-device reconciliation. Rollover uses `cloneWeek` and already differs from this action.

### A12 — HIGH / P1: restored native state can clone the old device's vector identity

References: [src/lib/spread/cloud-sync.ts:48](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-sync.ts#L48); [src/lib/spread/cloud-sync.ts:68](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-sync.ts#L68); [src/lib/spread/cloud-sync.ts:147](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-sync.ts#L147). Inherited state-design issue, still exposed by #35/#39.

**Source-confirmed.** TypeScript sync state is written to `Directory.Library` with no explicit backup exclusion. It includes `deviceId`; when that file is loaded, `startSessionFor` reuses `state.deviceId` and does not compare it with the native Keychain identity. Excluding Swift's `Application Support/SpreadSync` folder does not exclude these separate files.

**Reproduction required:** restore a phone backup to a new device, verify native ID changed, then inspect outgoing version vectors. Current code uses the old state ID if its Library file was restored. Two physical devices can then claim one vector actor, invalidating causal ordering; the equal-vector conflict guard does not make all unequal-counter cases safe.

**Corrective work:** explicitly exclude device-local TS sync state from backups, always obtain current native identity, validate the loaded state's account/device provenance and safely rebase/quarantine mismatches. Never silently start a new empty state after a damaged state file. Add new-device restore and corrupted-state fixtures; prove exclusion and identity behavior on hardware.

### A13 — MEDIUM / P2: local-only backup success suppresses retrying its iCloud handoff

References: [ios/App/App/Cloud/BackupStore.swift:98](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/App/Cloud/BackupStore.swift#L98); [src/lib/spread/backup-runner.ts:99](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/backup-runner.ts#L99); [src/lib/spread/cloud-backup.ts:151](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/cloud-backup.ts#L151). #38 / inherited backup path.

When the container is unavailable or the copy fails, Swift returns `verified: true, inICloudContainer: false`. The runner treats this as complete, records the signature and does not retry unchanged content; account/visibility refresh only refreshes status. “Saved here, waiting for iCloud” implies eventual OS upload, but the OS cannot upload a file never placed in its container.

**Reproduced:** return local-only success, then request another backup of unchanged data. Only one write occurs and no error is recorded. A later edit or sufficiently stale relaunch may create another backup, but that is not durable delivery of this one.

**Corrective work:** separate local verification from durable handoff/upload state and retry unsent files independently of content deduplication. Add Drive off→on, container-copy failure, unchanged “Back up now,” account recovery and restart tests. #38's upload-aware pruning is a useful improvement, but does not solve handoff retry or verify remote file contents.

### A14 — MEDIUM / P2: the mass-delete heuristic does not cover small-planner storage resets

References: [src/lib/spread/sync-state.ts:51](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-state.ts#L51); [src/lib/spread/sync-state.ts:59](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/sync-state.ts#L59). #31.

The all-tasks guard starts at three tasks; other thresholds count metadata/boxes/hats as well as tasks. A failed read returning defaults can erase the entire user-authored content of a small planner while retaining enough boilerplate to avoid all thresholds.

**Reproduced:** synced default planner with one important task; feed `defaultData()` to capture. The sole task becomes a tombstone without a block. This is an acknowledged limitation of a heuristic, not evidence that ordinary intentional single-task deletion should always prompt.

**Corrective work:** propagate read/normalization health and explicit delete intent, instead of inferring all intent from item counts. Add one/two-task reset, large metadata/small content, storage eviction and intentional single-delete controls. Retain the larger-deletion guard as defense in depth.

### A15 — MEDIUM / P2: CI does not run the full declared tests or native engine behavior

References: [.github/workflows/ci.yml:24](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/.github/workflows/ci.yml#L24); [.github/workflows/ci.yml:61](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/.github/workflows/ci.yml#L61); [scripts/ios-bridge-sim/native-init.js:41](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/scripts/ios-bridge-sim/native-init.js#L41); [ios/App/SpreadCloudCore/Tests/SpreadCloudCoreTests/SyncStorageTests.swift:72](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/ios/App/SpreadCloudCore/Tests/SpreadCloudCoreTests/SyncStorageTests.swift#L72); [package.json:19](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/package.json#L19). #39.

CI runs `test:spread`, not `npm test`. Explicit enumeration of the repository script tests yielded **179 passed / 16 failed / 195 total** locally. Failures include absent `.grok/skills/og` files and expectations inconsistent with app-env/title/share-card behavior; they are not all missing-file failures. They are outside the iCloud unit suite but contradict the plan's full-green gate.

The browser fake does not enforce the native resume gate: `syncResume` records a counter, while `flush` sends whenever `started` is true. It also filters fetched rows for names in the outbox, unlike Swift. Thus green fake tests do not verify native consent/conflict ordering. Swift's 24 tests exercise core helpers/storage, not `SpreadSyncEngine`, `BackupStore`, account transitions, CKAsset failures or Keychain identity. The engine remains directly coupled to CloudKit rather than the planned fakeable transport.

**Corrective work:** make test-file discovery explicit and fail if a required suite executes zero tests; resolve or explicitly scope the 16 existing failures without hiding them. Extract/test the engine's state transitions behind a transport interface, including A03–A07. Add failure injection to native storage and byte-copy paths. Preserve the valuable simulator and core jobs, but do not describe them as full iCloud safety proof.

## Verified tests and CI

Local environment: Windows PowerShell, Node `v25.6.1` (CI uses Node 22). Clean dependency install with lifecycle scripts disabled. No native Swift/Xcode runtime was available locally; native compilation/test evidence below comes from inspected GitHub logs, not a claimed local build.

| Check | Verified result | Scope / qualification |
|---|---|---|
| `npm run typecheck` | Pass | Checked-out PR #39 source |
| `npm run lint` | Pass, 0 errors / 3 warnings | Existing hook/unused warnings; no auto-fixes |
| `npm run test:spread` | **187/187 pass** | First run: 186/187 because `unzip` was not on PATH. Rerun using already-installed Git utility: 187/187 |
| `npm test` as supplied | Exit 0, but incomplete | 122 first-group + 55 last-group tests passed; quoted script glob executed **zero** script tests in this Windows environment, including when launched through Git Bash |
| Explicit script-file enumeration | **179/195 pass; 16 fail** | Saved complete failure log; do not call the full suite green |
| Audit production-function probes | 13 confirmed observations in pure/session probe; 3 actual-store observations | Some overlap. Assertions intentionally establish defects, not a passing safety bar. Transport-model limitations labeled above |
| PR #39 Actions `checks` | **187/187**, typecheck/lint pass | [CI run 37810890510](https://github.com/WGLewis0721/spread-app/actions/runs/37810890510) |
| PR #39 bridge simulations | **27/27 installed**, **14/14 restore**, **28/28 backup**, **24/24 sync** | Log-verified existing CI execution. Did not rerun flag-on build harness because review restrictions prohibit enabling flags |
| PR #39 Swift core | **24 tests, 0 failures** | Linux Swift 6 container; helper/storage tests |
| PR #39 CloudKit typecheck | Pass | iOS 17 simulator target, **Swift 5 language mode** |
| PR #39 full iOS shell | **BUILD SUCCEEDED** | [iOS run 37810890403](https://github.com/WGLewis0721/spread-app/actions/runs/37810890403); Debug simulator, code signing disabled |
| PR #39 iPhone simulator smoke | Pass | Planner launch; persistence after termination; marker restored after WebView storage wipe |
| Hardware / production CloudKit / signed TestFlight | **Not verified** | Remains mandatory |

The full iOS log includes mutable `Sendable` state and non-Sendable capture warnings, including a warning that mutable `SpreadSyncEngine.resumed` is an error in Swift 6 mode. Current Swift 5 build success is genuine; strict-concurrency safety is not established. No claim of a current Swift compiler failure is made.

PR #39 CI run metadata names reviewed head `3c4a90c...`; Actions uses a PR merge checkout. The repository metadata reported merge commit `8b700d6847fa2fb9aa7d93796e90b92871351cfa`. The integrated review itself is pinned to the head above, not a future moving branch.

## Recommendation for each PR

Verdicts evaluate each remediation's correctness at the integrated target; **APPROVE for one delta does not authorize merging its unsafe dependencies**. No GitHub review was posted. “Shell failed” below is a verified run result, not a proven app root cause.

| PR | Head (short) | Observed CI | Recommendation | Corrective assignment |
|---|---|---|---|---|
| [#31](https://github.com/WGLewis0721/spread-app/pull/31) F1 | `7d16824` | Core/checks/typecheck green; iOS shell failed | **REQUEST CHANGES** | A14; distinguish failed reads from intentional deletion; revalidate its own CI |
| [#32](https://github.com/WGLewis0721/spread-app/pull/32) F2 | `6a79119` | Green | **APPROVE, scoped delta only** | Active-profile check after inbox wait and serial alignment are valid improvements; do not interpret as account/global-queue safety approval |
| [#33](https://github.com/WGLewis0721/spread-app/pull/33) F3 | `9d946c8` | Green | **REQUEST CHANGES** | A02/A05; failed-write rollback must cover resolution and roster/link changes; A01 adoption classifier |
| [#34](https://github.com/WGLewis0721/spread-app/pull/34) F6 | `062bce2` | Core/checks/typecheck green; iOS shell failed | **BLOCK** | A01/A02 flags-off restore correctness, A10 damaged backup semantics |
| [#35](https://github.com/WGLewis0721/spread-app/pull/35) F4 | `d383821` | Core/checks/typecheck green; iOS shell failed | **REQUEST CHANGES** | A03/A04/A10; byte hashes are useful but insufficient; durable merge/ack and strict validation |
| [#36](https://github.com/WGLewis0721/spread-app/pull/36) F5 | `2323686` | Green | **BLOCK** | A06/A07 account isolation, exact consent scope, send-time gating and complete reseed |
| [#37](https://github.com/WGLewis0721/spread-app/pull/37) F7 | `fea09c2` | Core/checks/typecheck green; iOS shell failed | **BLOCK** | A08/A09 consent revocation and verified snapshots; A05 transactional set-aside recovery |
| [#38](https://github.com/WGLewis0721/spread-app/pull/38) F8 | `4a2d30d` | Green | **REQUEST CHANGES** | A13 durable backup handoff; correct absolute safety/rollback assertions after fixes |
| [#39](https://github.com/WGLewis0721/spread-app/pull/39) F0 integrated | `3c4a90c` | All listed checks green | **REQUEST CHANGES** | A15 CI/fake/native-engine coverage; integrate preceding corrections and rerun the stack |
| **Combined #31–#39** | `3c4a90c` | Integrated CI green | **BLOCK** | **Not safe to merge into main as submitted** |

The failed iOS runs for #31, #34, #35 and #37 all report that the installed app never wrote a planner snapshot and did not satisfy planner startup detection. Inspected runs: [#31](https://github.com/WGLewis0721/spread-app/actions/runs/37804391903), [#34](https://github.com/WGLewis0721/spread-app/actions/runs/37806588269), [#35](https://github.com/WGLewis0721/spread-app/actions/runs/37807723868), [#37](https://github.com/WGLewis0721/spread-app/actions/runs/37810883991). Their logs do not establish that these were merely infrastructure flakes. Later green integrated execution does not rewrite those historical results.

## What is improved, and remaining non-blocking observations

- Ten-profile restore into a truly pristine fresh install works in the existing tests/CI; restored profiles drop source sync links. The problem is the definition of pristine and transactional failure behavior, not the happy-path capacity calculation.
- Ordinary incoming merge now applies before assigning merged state, and the session checks active profile after slow inbox reads. Serialization reduces overlapping alignment. These are substantive improvements.
- Initial backup disclosure gates the normal launch path; unreadable consent reads default off. Byte-level backup checksum checking and cloud payload hashing catch accidental byte corruption. Payload hashing is explicitly noncryptographic, not authentication or an encryption claim.
- Native queue writes return failure, sent-item confirmation compares the queued DTO, corrupt queue files are quarantined, and backup retention waits for upload metadata before pruning older cloud copies. These do not replace transaction/repair handling above.
- UI uses existing sheet/dialog primitives and tokens, and restore selection has checkbox semantics. No independent pixel comparison, VoiceOver, Dynamic Type, keyboard, iPad or reduced-motion visual acceptance was performed here. There is no iPad simulator job in the inspected iOS workflow, and the golden pixel-diff gate remains absent.
- The More sheet still says “Data stays on this device” at [src/spread/screens/spread-app.tsx:1789](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/spread/screens/spread-app.tsx#L1789) even in a cloud-enabled build. Revise before release. Several failure messages claim “Nothing was changed” after non-atomic work. Async restore/conflict controls also need busy/error behavior and repeated-activation tests; static markup inspection is not accessibility acceptance.

## Missing regression coverage and unresolved risks

Make A01–A15's acceptance tests corrective-work tickets. Particularly important integration cases: CloudKit fetch-before-send with local pending work; failure to save inbox before token advancement; same-record replacement between inbox read and ack; state-file corruption; partial native writes; account switch during suspended bridge requests; stop/unlink during a pass; cancellation callbacks from an older engine; full and partial zone reseed; quota and unknown-item errors; two profiles in one native queue; copied-week identity; ten-profile low-storage restore/rollback; consent revocation during backup build/retry.

Additional boundaries remain unproven: damaged latest backup fallback, interrupted container copy, future-schema restore refusal versus forward read-only behavior, OS backup exclusion of every device-local file, interrupted migration/snapshot durability, and Keychain failure/new-device identity. Migration currently changes only a marker, which limits immediate exposure, but [src/lib/spread/schema.ts:89](https://github.com/WGLewis0721/spread-app/blob/3c4a90c9edd45ba3a413ab196bf68b76f3dff356/src/lib/spread/schema.ts#L89) allows migration after a snapshot exception and boot does not await native snapshot verification. Future data-transforming migrations must not inherit that contract unexamined.

Inline photos still consume localStorage and backup space. Native outbound sync payloads now have a 1,000,000-byte limit in `PayloadCheck`; test realistic multi-photo tasks at the limit, explicit error/recovery, and temporary CKAsset file lifetimes. Do not describe CKAssets as removing every practical size limit. Backup account switching and consent scope across Apple IDs require a product decision and device tests independently of sync.

No rollback rehearsal was demonstrated. Safety-file names use millisecond timestamps without a unique suffix and pruning is count-based; concurrent same-label copies and a failed verification followed by cleanup deserve tests. These are additional risks, not separately proven exploits in this review.

## Merge readiness versus release readiness

**Merge into main now: unsafe.** Correct A01/A02 and their flags-off regressions first. Keep cloud flags off. Then resolve the cloud safety findings or explicitly isolate incomplete paths so they cannot be treated as completed remediation; rerun required suites against the final integrated commit and re-audit the changed failure boundaries. Do not merge the stack merely because GitHub allows it.

**Actual iCloud release: blocked independently.** After code/test corrections, real iPhone **and** iPad validation remains mandatory: independent offline edits/deletes, concurrent conflicts, account sign-out/switch, Drive disabled/full, low device storage, interrupted writes, ten-profile restore, reinstall and new-device restore, background/resume, VoiceOver/Dynamic Type, iPad windowing, and rollback. CloudKit Production schema and signed TestFlight behavior must be verified. Privacy manifest/App Privacy/support copy must match the final binary. No release gate is completed by this review.

Recommended order for Claude: (1) transactional restore and strict pristine detection; (2) durable merge/ack plus transactional resolution; (3) native send authorization/account/profile isolation and immutable base tags; (4) consent cancellation and verified recoverable snapshots; (5) semantic validation, copied IDs and device-state provenance; (6) delivery retries and CI/transport tests; (7) independent re-review, then hardware gates. Preserve all original data and add reproduction-based regressions before considering the work fixed.

## Review execution record

Read the two requested local prompt files and reviewed the local skills directory; its AWS/Terraform/network skills were unrelated to this audit and not applied. Applied the engineering code-review skill. Attached existing PR #39 in this chat, fetched the repository read-only and all PR metadata/diffs, installed dependencies in the disposable copy, inspected Actions logs, ran local checks and isolated fault-injection probes, and prepared this report/evidence bundle.

**Fixes applied:** none to product code. Only review harness corrections and test-environment PATH adjustment for an existing `unzip` executable. **Problems encountered:** missing executable on initial test run; Windows quoted glob skipped script tests; explicit enumeration uncovered real test failures; no local Swift/Xcode/hardware; repository CI uses permissive fake transport and flags-on suites which were inspected but not rerun under this review's restrictions. **Recommended steps:** corrective sequence above, final-commit CI, independent review and mandatory physical-device validation.
