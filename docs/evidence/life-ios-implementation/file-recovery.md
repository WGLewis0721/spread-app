# Native managed files and local recovery

Implementation checkpoint: `70aa784165a9b9e44bb6fcdca7a1830d1751ba88` (PR #146 branch).

## Implemented contract

- Native copies live in Application Support under versioned SHA-256 profile/task directories. UUID references, byte counts and SHA-256 checksums survive serialization. Display names never determine paths.
- Explicit full local backup reads every referenced managed file through the bundled Capacitor plugin. Bytes are carried only in the checked full archive, never ordinary planner bridge messages.
- Export fails when bytes are missing, corrupt or unavailable. Import verifies archive checksum, exact reference coverage, profile/task scope, UUID, MIME format, byte count, SHA-256, 25 MiB/file and 100 MiB/task limits.
- Restore maps source profiles to newly allocated profile identities while preserving task and file identities. Validated bytes become durable before the planner roster commit. Existing copies are never overwritten. Rejected planner commits remove newly created copies. Interrupted recovery can leave unreferenced copies, but cannot publish planner references before the bytes exist.
- Recovery waits for native completion through the existing UI. More controls/text/layout remain unchanged. Concurrent planner changes while native copies are pending reject the stale restore.
- Unknown task content, rich notes, estimates, capacity and priority metadata remain in the authoritative planner.

## Checks actually run

Linux Vercel sandbox, Node 22; source checkpoint above.

`node --experimental-strip-types --import ./src/test-support/register.mjs --test src/lib/spread/backup-full.test.ts src/lib/spread/store-restore.test.ts`: **37 passed**, zero failed/skipped. Covers real archive bytes/checksum roundtrip, new profile mapping, rich notes/estimates/priority, absent/corrupt bytes, scope mismatch, duplicate entries, mocked native install/commit/rollback ordering, native copy failure and existing storage rollback cases.

`npm run typecheck`: passed.

`npm run lint`: zero errors, seven existing warnings.

Verification agent reports iOS-active syntax parsing passed for the native bridge and managed-file service. This does not establish compilation against the iOS SDK.

## Owed evidence

Physical iPhone file/provider import, media decoding/Quick Look, offline reopen, force-quit/relaunch, in-place signed upgrade and full backup/import byte-for-byte comparison are **owed**. Native SDK compilation and signed installed testing must pass before claiming acceptance. No device evidence or successful installed recovery is claimed here.
