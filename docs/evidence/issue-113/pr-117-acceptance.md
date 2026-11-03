# PR #117: native acceptance record (November 3, 2026)

Everything below was read from real GitHub Actions runs and their downloaded `.xcresult` bundles, or from files in this repository. Anything not listed here was not measured. Native 2.0 release remains **NO-GO** (hardware gates unmet; F1–F10 not yet recorded green on the final head).

- PR: [#117](https://github.com/WGLewis0721/spread-app/pull/117). Base `a19e8410b4d0cfb814ea8cc04aab63b639b3e9ed` (main), originally branched from `ae7ffbb3cb1617b932a4366380ac7d46ff10cabc`.
- Owner instruction in chat: open the PR, rebase onto main, then merge. That instruction is the merge permission the brief required. It is not permission to upload to TestFlight or publish a binary.

## 1. PR #115's three fixes, checked against real runs on `ae7ffbb`

| Fix | Result | Run / artifact |
| --- | --- | --- |
| Stack swipe after the first Work swipe (card header became a tap element) | **Confirmed.** `testCardGesturesStayOnSelectedRole` passed at 390 pt: 100 Stack + 100 Fan swipes alternating Work and Home, selection asserted after each, 516.2 s total test duration, no issues. Note that this old test only walks two responsibilities | [41713277871](https://github.com/WGLewis0721/spread-app/actions/runs/41713277871) (dispatch on `main@ae7ffbb`), artifact `13268803882` |
| 390-pt Week `Text clipped` (Crown pill sized from its text) | **Not fixed.** 390 failed again; 820 passed; 1024 did not run (simulator creation timed out in `simctl bootstatus`, infrastructure). The flagged element on `ae7ffbb` was the Crown pill title "Your week". The old test used `continueAfterFailure = false`, so each run surfaced one of several clipped texts: "Nov 2 – Nov 8" (run 41704798803), "Spread" (run [41711054935](https://github.com/WGLewis0721/spread-app/actions/runs/41711054935) on `0d40ce1`), "Your week" (below) | [41712176226](https://github.com/WGLewis0721/spread-app/actions/runs/41712176226) (dispatch on `main@ae7ffbb`) |
| Persistence "re-enable writer" diagnostics | **Diagnosed as harness/infrastructure, not data loss.** The `ae7ffbb` shell run failed in cycle 1: the simulator reported "Waiting on System App" for 9 min 24 s, the harness killed its `simctl launch` client after a fixed 15 s, the app container held only `.metadata.plist` (the app never started), and `simctl listapps` timed out so the old diagnostic printed a false `installed: NO`. The earlier cycle-2 miss on `6aa2355` has the same shape (fixed 5 s timer before the client is killed) and is consistent with it, but was **not** reproduced, so it is a hypothesis | [41711518116](https://github.com/WGLewis0721/spread-app/actions/runs/41711518116) (job 126180500864) |

The same `ae7ffbb` shell run also showed: the old UI step hit its 20-minute limit; the unsigned Release archive step ended `** ARCHIVE SUCCEEDED **`; the job was then cancelled by its 45-minute timeout. The timeout is now 75 minutes and the journey step 40 minutes.

## 2. What the first real run of the new suite found (head `11fe25e`, 390 pt)

Run [41716001566](https://github.com/WGLewis0721/spread-app/actions/runs/41716001566), artifact `native-ui-390-41716001566`.

| Test | Result | Finding |
| --- | --- | --- |
| `testLayout390` | **Passed**, 61.1 s | Week, five layouts and Month captured at 390 pt (see `screenshots/11fe25e-390/`) |
| `testAudit390` | Failed | With the header, Crown pill and Month fixes in, the only remaining required-audit failures were the seven Day-mode weekday labels (Mon to Sun): chips used a fixed `45 x 54` frame. Week, Stack, Fan, Dial, Tabs and Month reported nothing. Fixed in `697f1d3` |
| `testF01_Onboarding`, `testF02_BudgetAndDays` | Failed | **Product bug.** The native New responsibility sheet defaults its illustration to `custom`, but the TypeScript `addRole` schema accepted only the ten real categories, so creating a responsibility with the default selection was refused. React's own default is no category, which the projection already shows as the custom artwork. Fixed in `697f1d3`: `custom` is accepted as "no category" and stored without one; two dispatcher tests pin it (default, valid and unknown categories) and `test:spread` is 422 passing with `--min 422` |

## 3. Month spacing at 390 pt

Even: date columns are about 117 px apart in the 1178-px capture (`screenshots/11fe25e-390/390-month.png`), headers align with the columns, and the open week is marked (bold, fill and selected trait). The 820-pt capture from `b5a3eaf` was also even (about 174 px). The "Week" word at top right in both captures is the Month/Week toggle caught mid-crossfade, not a clipped label.

## 4. Not measured (kept unverified)

| Item | Why |
| --- | --- |
| Hardware p95 <= 100 ms, 60 FPS | No physical device or attachable computer in this session (`list_computer_folders` returned no folders). Simulator timing is not substituted |
| VoiceOver traversal | Needs a device or a human; `performAccessibilityAudit` is not VoiceOver |
| Ten-person usability study and comparison with 1.0 | No participants |
| Restore from a `.spread` file through the system file picker | Not driven by the suite (the picker is out of process); the backup export action and the return to native are |
| Offline | The simulator cannot be taken offline from the runner; the native planner has no network path (`cloud.*` off), and no offline run was made |
| Photo block in rich content | The photo picker is out of process and the simulator library is empty; notes, outline and table are driven |
| Continuous finger tracking of Stack/Fan cards | Selection still commits when the swipe ends; the 100-swipe runs measure correctness, not feel |
| Final-head F1–F10 matrix, two clean persistence cycles, final-head 390/820/1024 audits, final-head unsigned Release archive | Run on the PR's checks; results are in the PR, not recorded in this file |

## 5. Screenshots in this folder

`screenshots/11fe25e-390/` holds the seven captures from `testLayout390` in run 41716001566 (head `11fe25e`): `390-week`, `390-stack`, `390-fan`, `390-dial`, `390-tabs`, `390-day`, `390-month`, with the original Xcode attachment manifest. They are real simulator screenshots (iPhone 15 simulator selected by `scripts/native-simulator.mjs`), not mock-ups. They predate the `697f1d3` fixes (Day chips).
