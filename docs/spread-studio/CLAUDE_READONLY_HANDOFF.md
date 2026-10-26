# Claude read-only handoff — Spread Studio 50% gate

**Assembled:** 2026-10-25 from authenticated GitHub connector. **Purpose:** Allow the existing Claude project file-sync integration to read the #77 review brief and actual GitHub Actions failure evidence **without GitHub API access**. This is a static source snapshot; recheck live status before approving or merging.

**Access limitation:** Anthropic's standard GitHub **project sync** reads repository files, not issue comments, PR metadata, Actions logs, or permissions. Connecting that service does not provision `gh` CLI credentials or issue-comment write access for a separate Claude Code session. This file is a bridge, not an auth repair. No secrets/tokens included.

## Requested independent review (exact text from GitHub issue #77 comment 6405242270)

**Original comment:** https://github.com/WGLewis0721/spread-app/issues/77#issuecomment-6405242270

## CLAUDE REVIEW HANDOFF — START HERE (50% integration gate, 2026-10-25)
**Scope and authority:** You are independent senior integrator/security/QA reviewer. Review actual GitHub diffs and test evidence for draft PRs [#81](https://github.com/WGLewis0721/spread-app/pull/81), [#82](https://github.com/WGLewis0721/spread-app/pull/82), [#83](https://github.com/WGLewis0721/spread-app/pull/83), and [#84](https://github.com/WGLewis0721/spread-app/pull/84), targeted to the non-production `spread-studio` branch. Preserve `main`; do not merge or deploy. Follow `AGENTS.project.md`, `docs/spread-studio/RETRIEVAL_PROTOCOL.md`, `ARCHITECTURE.md`, `PRODUCT.md`, and `DELIVERY_PLAN.md`.

### Immediate review priorities
1. **Review #84 now:** Green is reviewing it as well. Verify editor draft/apply/cancel/reset (no silent writes); profile switching; local image lifecycle; real preview versus a faux rendering; and whether `commitDraft()` can leave a stale/orphan image after failed save or racing profile edits. Flag blocking issues with reproducible test.
2. **Integration ancestry:** #84 already **contains #81/#82 and an earlier #83** in its branch history, so it is NOT an independent 35-file patch to merge naively on top of each PR. #84's own PR body identifies incorporated #83 head `ca38f3368c7101ae2b8fc6cccd53fc85a3b9e70f`, while **current #83 is `9b845ceddfbad051023b3cc1e7dec50c2e9ce75c`**. The additional #83 commit modifies `appearance.ts`, `appearance.test.ts`, and `render.screenshots.ts`. Confirm the integration branch brings this latest fix in exactly once; avoid duplicate merge/replay conflicts. Compare actual merge bases/SHAs before integration.
3. **Wallpaper visibility blocker:** In current #83 `appearance.ts`, `minimumScrimAlpha()` protects text over BOTH worst-case black/white pixels and the `::before` wallpaper wrapper applies that alpha to the **entire image**. Product decision: imported wallpaper must stay clearly recognizable. Use protected text/card surfaces/local gradients instead of an almost opaque global scrim; preserve 4.5:1 readable text and stronger accessibility contrast. Check 390/820/1440 actual Spread/Week visual fixtures under light/dark with busy photo. See comments on #83 and issue #78.
4. **Unmounted functionality:** #83 renderer and #84 editor are not mounted in actual `spread-app.tsx` yet. Review Red's proposed shared-file integration edits (Studio entry, appearance wrapper, Radix portal host, per-profile committed appearance and asset handle, backup/restore `idMap`, profile cleanup). Without live mount, the '50% done' label is **not verified**.
5. **iOS shell baseline failure:** Green reports the simulator smoke check fails on `main`, other branches, and pre-Studio code (none of last 40 runs passed), though build succeeds. Independently verify exact job/step, failing log, baseline commit and run IDs. Document as baseline-only if proven; do not suppress the full iOS build gate or mislabel new native regressions. Physical WebKit/photo rotation, Foundation Models and Siri still unverified.
6. **Security/persistence:** Verify strict single schema in #81 `src/lib/spread/studio/contract.ts` (PR #80 closed), safe URL/blob/file handling, EXIF/orientation, per-profile asset deletion, data backup and iCloud boundaries, new `spread-studio.*` keys excluded from unrelated planner mirror, error states, local-only guarantee, and no unexpected changes to hours/tasks.

### Deliverable
Post a concise independent **GO / REQUEST CHANGES / BLOCKED** review for #84 and the 50% integration gate; cite exact file/lines, severity, recommended fix, specific tests, and ownership. Include iOS baseline comparison evidence and integration order; mark phase 75%/100% hardware as blocked without an eligible physical device. If you have GitHub permissions, place review comments on the relevant PR; otherwise post here (#77). **No merges, deployments, or changes to `main` without owner authorization.**

## Actions evidence retrieved independently

**Studio PR #84:** [iOS shell run 40246549304](https://github.com/WGLewis0721/spread-app/actions/runs/40246549304), `build-ios-shell` job `121329220974`, triggered from commit `5a502437afaa5c08d9011497bba57592736082c0`. Run result **failure**, failing step **Install and launch Spread in iPhone Simulator** (step 10). Relevant excerpt (verbatim error message):

```text
The installed app never wrote a planner snapshot, so it did not reach the planner.
launch command exit code: 0
installed: yes
...
WebContent process ... took 1.213419 seconds to launch
...
Failed to request storage access quirks from WebPrivacy.
...
Process completed with exit code 1.
```

**Unmodified pre-Studio `main`:** [iOS shell run 39403354195](https://github.com/WGLewis0721/spread-app/actions/runs/39403354195), `build-ios-shell` job `118563235840`, triggered **2026-10-20** at `main` commit `7d0cdc47b036c3ba345b9ce70342d29808fcbf69`. Run result **failure**, failing step **Install and launch Spread in iPhone Simulator**. Relevant excerpt:

```text
timed out after 60s: xcrun simctl listapps ...
The installed app never wrote a planner snapshot, so it did not reach the planner.
launch command exit code: -15
installed: NO
...
Process completed with exit code 1.
```

**Interpretation:** The simulator smoke gate definitely failed before Studio. However, the detailed failure modes differ: the selected `main` run timed out in `simctl listapps` and said `installed: NO`, while the selected #84 run said `installed: yes` but never produced the expected planner snapshot. **Do not assert identical root causes without more diagnostics**; distinguish a known baseline failing *job* from possible new Studio changes. The native build/launch may succeed even while the smoke assertion fails. Green's broader run-count assertion is not independently established by only these two runs.

**Main CI:** The build pipeline remains independently gated. No physical iPhone run, real WebKit image rotation proof, Foundation Models device proof, or Siri proof has been performed in this handoff.

## Authoritative PR and code references

- [PR #81 — shared studio contract](https://github.com/WGLewis0721/spread-app/pull/81) — `studio-contract`; sole `StudioAppearanceV1` source `src/lib/spread/studio/contract.ts`; #80 is closed.
- [PR #82 — local assets/palette/persistence](https://github.com/WGLewis0721/spread-app/pull/82) — `studio-g2-asset-storage`, includes #81.
- [PR #83 — appearance renderer](https://github.com/WGLewis0721/spread-app/pull/83) — `studio-g3-renderer`, current known head `9b845ceddfbad051023b3cc1e7dec50c2e9ce75c`.
- [PR #84 — Customize editor](https://github.com/WGLewis0721/spread-app/pull/84) — `studio-g1-studio-ui`, current known head `5a502437afaa5c08d9011497bba57592736082c0`. This branch includes #81, #82 and an **older** #83 commit `ca38f3368c7101ae2b8fc6cccd53fc85a3b9e70f`; reconcile the newer #83 contrast fix before integration.
- [Tracker #78](https://github.com/WGLewis0721/spread-app/issues/78), [review issue #77](https://github.com/WGLewis0721/spread-app/issues/77).

## Report handoff without write permission

Claude may continue a read-only review from the repository contents and this snapshot. It should produce its report under its existing local path `claude/SPREAD_STUDIO_REVIEW.md` and present the report text in its conversation. For GitHub posting without Claude write access, an authorized integrator can copy that report into issue #77 once the report is shared. **Do not supply GitHub credentials or ask for push permissions solely to conduct a review.** This bridge cannot automatically sync Claude's local project files to GitHub.

**No merges or production deployments are authorized.**
