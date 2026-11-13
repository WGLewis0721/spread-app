# Spec: What's New shows everything the last build changed

Status: built on `chore/release-notes-every-merge` (PR #188). Written after the code so the owner can review both together. Swift is not compiled in this environment; Codemagic's `swift test` is the first compile.

## 1. Problem

Opening the app shows only the newest note entry. Each merge batch creates its own entry, so a build that brings several batches shows one batch, and the lines from skipped batches appear only under "See past updates". A pending entry also dropped its oldest line once it held eight.

Owner request: "open the app and see everything the last build changed."

## 3. Goals, non-goals and budget

Goals:
- Opening the app after a build shows every change that build brought in, as one list.
- No line is dropped.
- Entry dates use the owner's calendar day.

Non-goals:
- Reading build numbers. The bundled notes are the build's notes, so the set of unseen entries is enough.
- Changing the More history, which still lists every entry.
- Any change to planner data, schema or sync.

Budget: one change set, with no migration.

## 4. Rules that apply and exceptions needed

- `docs/IOS_RELEASE.md` still applies: only verified features, no internal detail. The reviewer rewrites each drafted line before the pending PR merges.
- Entry shape is unchanged: `formatVersion` 1, one `MARKETING_VERSION`, 1 to 8 changes per entry. Overflow starts a new entry instead of dropping a line.
- No exceptions.

## 5. Options and the chosen concept

Options considered:
- A. Keep the newest-only popup and rely on history. Rejected: a skipped batch stays invisible at the next open.
- B. Store every seen ID. Rejected: more state than needed, because the stored last-seen ID already orders the list.
- C. Show every entry newer than the last-seen ID as one card. Chosen.

Chosen concept: the popup opens with everything newer than the last-seen entry. On first launch, with nothing seen, it shows the newest day's entries.

Breadboard: planner ready, then unseen entries computed, then non-empty means one combined card. Done stores the newest ID. More, then What's New, still lists history.

States: none new. The sheet has the same loading and empty states as before.

## 6. Platform behavior

iPhone only. The combined card uses the existing release card, so Dynamic Type, VoiceOver, light and dark, and Reduce Motion behave as before. The card's accessibility identifier uses the first entry's ID.

## 7. Technical approach

- `ReleaseNotes.swift`: `unseen(for:lastSeenID:in:)` and `combined(_:)`. `shouldPresent` is now "unseen is not empty".
- `WhatsNewSheet.swift`: new `current` parameter for the popup. The history path is unchanged.
- `SpreadLiveRoot.swift`: presents the unseen entries. Dismiss still stores the newest ID.
- `scripts/release_notes_draft.py`: a full pending entry (eight lines) is followed by a new entry with the merge's own ID. The entry date is the owner's local day (America/Chicago), not UTC.

## 8. Risks, rabbit holes and open questions

- Swift has not been compiled here. A compile error would fail the Codemagic build. The code follows the existing `newest` pattern, and Codemagic runs `swift test` before upload.
- A user who skipped several builds sees a longer list once. Accepted.
- Closing the pending PR without merging discards its lines on the next merge, because the branch is force-pushed from main. Open.
- Re-running the workflow for the same commit would duplicate its line. The preflight does not catch that. Open.
- The timezone is set in the script. If the owner's timezone changes, update `NOTES_TIMEZONE`.

## 9. Verification and full-implementation plan

### Acceptance criteria

- After a build with three merges, opening the app shows one card with all three merges' lines, in order.
- Opening again shows nothing.
- A fresh install shows only the newest day's entries.
- A pending entry at eight lines starts a new entry, and no line is lost.
- Entry dates use the Chicago calendar day.

### Checks

- Python: 20 unit tests in `scripts/test_release_notes_draft.py`, passing.
- Five merge scenarios in a throwaway clone with stubbed GitHub calls: first merge, append, release-notes skip, direct push, and overflow. Passing.
- Swift: three new `ReleaseNotesTests` cases through `swift test`. Not yet run.
- Device, still owed: first launch after an update, dismiss, relaunch (no popup), More, What's New history, VoiceOver, Dynamic Type, light and dark, Reduce Motion, 390 pt width.

### Full-feature implementation and refinement plan

Built in this change. Refine the combined card's heading after the device checks.

## 10. Rollout, rollback and release

- Merging PR #188 turns on the draft workflow for every merge to `main`. Owner decision.
- The popup change reaches users in the next signed build after the pending PR merges.
- Rollback: revert the Swift change. Entries already in the bundle stay valid.

## 11. Decision record

- 2026-11-12: the popup shows every entry newer than the last-seen one, as one card.
- 2026-11-12: a full entry starts a new entry at eight lines instead of dropping a line.
- 2026-11-12: entry dates use the owner's local calendar day.
