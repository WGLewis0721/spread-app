# Repository hygiene audit — November 7, 2026

Repository: `WGLewis0721/spread-app`. Baseline `main` SHA: `8e1ef05ba4ce0056407b7e08d1db3df713e8f8fc`. Cutoff: **October 31, 2026, 12:48 UTC** (seven days before the audit). These counts are a point-in-time snapshot; rerun the script for a live decision.

| Classification | Observed | Treatment |
| --- | ---: | --- |
| All remote branches, including `main` | 175 | Inventory only |
| Open PRs | 16 | Preserve all PR heads, regardless of age |
| Older merged PR branches with matching *current branch SHA* and recorded merged PR head SHA | 61 | Eligible for guarded deletion after live recheck |
| Older merged PRs where branch head differs from recorded PR head | 4 | Exclude; cannot assume no new work |
| Closed but unmerged PR branches identified | 16 | Exclude; review manually |
| `main`, `golden/*`, `backup/*`, `release/*`, `parked/*` | 15 | Always preserve; frozen checkpoints must be immutable |

## Eligible branch rule

The [guarded cleanup script](../../scripts/maintenance/prune-merged-branches.mjs) lists or removes only branches with a **merged PR into `main` older than seven days**, a branch SHA matching that merged PR's head, no open PR using that head, and no GitHub branch protection. Deleting these refs does not squash or rewrite any commits on `main`. Examples of eligible old names at audit time include `docs/widget-spec`, `chore/official-spread-domain-20261010`, `feat/sync-core`, `feature/codemagic-yaml`, and `studio/curated-appearance-v1`. The full list is generated from live GitHub metadata by dry-run.

## Excluded work

Open examples: PR #145 (Duo), #144 (Week/Month), #130 (Duo acceptance), #118 (working UI parity), #107/#104/#103 (Contact Deck), #101 (widget), #98 (Studio), #95/#86 (release controls). Several are older than the cutoff but contain unmerged work. Closed-unmerged Astra/security and F-series branches also require manual disposition; auto-deleting them would risk losing unfinished fixes. Unmapped branches and golden backups are not automatically obsolete.

## Execution and safeguards

1. Review this PR and run the manual workflow in **dry-run** mode after it is merged with explicit owner approval. No cron, push trigger, or automatic deletion.
2. Compare candidates with open PRs and known golden checkpoints. Use the `delete` workflow mode only after deliberately entering its confirmation phrase. Each ref and the merged PR are re-fetched before deletion.
3. If a branch is not eligible, leave it; create a separate issue/PR for any intentionally abandoned unmerged work. No force push, rebase, or historical squash of `main`.
4. Rollback for an erroneously deleted branch is to recreate its ref from the recorded PR head SHA; keep the GitHub PR/commit records.

**Status:** Audit and tooling prepared on a cleanup PR. **No remote branches have been deleted** by this audit. GitHub integration in this session exposes no delete-ref action.
