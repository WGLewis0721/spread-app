# Astra audit handoff: Spread PRs #31–#39

This directory publishes the **original completed review and its original evidence**, not a new audit or a remediation. The original verdict is **BLOCK** for the integrated stack and separately for iCloud release.

- [Complete original review](Astra-Spread-iCloud-Review-PR31-39.md), unchanged byte-for-byte.
- [A01–A15 evidence manifest](EVIDENCE-MANIFEST.md), including which findings were executed and which require native validation.
- [Evidence inventory](EVIDENCE-INVENTORY.json): every archive member, original and published SHA-256 hashes, relocation and sanitation details.
- [Sanitation and exclusions](EXCLUSIONS.md).
- [Original archive README](evidence/README.txt).

**Reviewed code:** `3c4a90c9edd45ba3a413ab196bf68b76f3dff356` (PR #39). **Publication branch base:** current `main` when fetched, `7afcd204d52f17f7ca994175d9448c13dc1429d9`. These are different commits: do not run the probes against this publication branch's application code and call that a reproduction of the original review.

## Reproduce the original TypeScript probes

Use a scratch directory. The archived scripts are byte-identical to the originals, with a `.txt` suffix to keep documentary evidence outside application lint/test discovery. Copy them back to their original `.mjs` names. No application flags are enabled by these probes.

On a Unix-like shell, from the root of a checkout of `audit/astra-pr31-39`:

```sh
AUDIT_ROOT="$PWD/docs/audits/astra"
AUDIT_SCRATCH="$(mktemp -d)"
cp "$AUDIT_ROOT/evidence/audit-repro.mjs.txt" "$AUDIT_SCRATCH/audit-repro.mjs"
cp "$AUDIT_ROOT/evidence/audit-loader.mjs.txt" "$AUDIT_SCRATCH/audit-loader.mjs"
cp "$AUDIT_ROOT/evidence/store-repro.mjs.txt" "$AUDIT_SCRATCH/store-repro.mjs"
cd "$AUDIT_SCRATCH"
git clone --no-checkout https://github.com/WGLewis0721/spread-app.git spread-review
git -C spread-review fetch origin pull/39/head
git -C spread-review checkout --detach 3c4a90c9edd45ba3a413ab196bf68b76f3dff356
(cd spread-review && npm ci --ignore-scripts)
node --experimental-strip-types audit-repro.mjs
node --experimental-strip-types --loader ./audit-loader.mjs store-repro.mjs
```

On Windows, create the same scratch layout with PowerShell's `New-Item`/`Copy-Item`, then use the same Git/npm/Node commands. The loader resolves the application's TypeScript aliases without changing source. The original run used Node 25.6.1; CI used Node 22. Expected output: 13 `CONFIRMED` lines from the first probe and 3 from the store probe, corresponding to the archived logs. Some observations overlap; this is not a count of independently executed findings. A probe exits successfully when it **confirms the bug**, not when the application is safe.

For the original declared tests, use `npm run test:spread`, `npm run typecheck`, and `npm run lint` inside the reviewed checkout. The archive records a Windows PATH issue for `unzip`, a subsequent successful 187-test rerun, and an `npm test` script-glob false green. Explicit script enumeration, rather than trusting a zero-test glob, is documented in the manifest. No new CI/hardware pass is implied by publishing these files.

## Claude's remediation assignment

Read the entire original review first. Address A01–A15 using the manifest; preserve their IDs in corrective PRs and regression tests. Start with flags-off transactional restore and pristine detection, then durable sync/ack/resolution, native account/profile send authorization, consent/snapshots, and remaining validation/identity/retry/CI gaps. Report the corrective commit, reproduction/regression result and remaining limitations for each finding.

Do not treat source-confirmed native risks as already reproduced on CloudKit. Their original reproduction recipes and pinned source references are in the review. Real iPhone/iPad validation, production CloudKit verification, and rollback rehearsal remain mandatory. This publication changes no application code, application tests, workflows, flags, existing PRs or release gates. The documentation PR is not to be merged by this task.
