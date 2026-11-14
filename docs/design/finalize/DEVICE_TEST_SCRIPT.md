# Spread | iPhone device test script (publish finalize, wave 2)

> Part of the Spread design brain. Start at [../README.md](../README.md). Folder index: [README.md](README.md).

> Summary: a physical iPhone script for a Codemagic TestFlight build of `main`. It takes about 40 minutes, uses Given/When/Then steps with pass and fail boxes, and records the build, device, iOS version and date. It is the device proof that [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) requires before any GO. A step that expects a fix still pending is marked **expected fail** and links to its finding in [CROSS_SURFACE_REVIEW.md](CROSS_SURFACE_REVIEW.md). Nothing here is run yet.

## 0. Record the run (before step A1)

A run without this record is not evidence.

| Field | Entry |
| --- | --- |
| Codemagic run (link) and `main` commit SHA | |
| TestFlight version and build (from the TestFlight app) | |
| iPhone model | |
| iOS version (Settings, General, About) | |
| Date and start time | |
| Tester | |
| Starting appearance (Light, Dark or System) | |
| Text size at start (Settings, Display and Text Size) | |
| Install type: fresh (A1) or upgrade (J5) | |

**Test data.** Use names that are obviously test data, such as "Test Work" and "Test Health". Do not use real names, places or health details in screenshots.

**Result marks.** Tick **Pass** only if the step ran and matched. Tick **Fail** if it did not, and write what you saw. **N/A** needs a reason in the notes. Never tick a step you did not run.

**Stop rule.** A crash, lost data or a wrong saved value stops the run. Record the step and the build. The verdict is NO-GO for that build.

**Screenshots.** Name each one `<build>-<step>.png`, for example `1.0-38-(1)-C2.png`. Attach them to the run record.

## 1. Time budget

| Section | Minutes |
| --- | --- |
| 0 Record | 2 |
| A First launch and Life root | 4 |
| B Life cards, focus, Details and Undo | 7 |
| C Tasks and the ! priority | 5 |
| D Weekly Time and Plan Ahead | 7 |
| E Classic through More | 4 |
| F Classic Week, Month and To place | 6 |
| G Sheets | 3 |
| H Focus timer, Live Activity and widgets | 5 |
| I Light, dark, text size, motion and VoiceOver | 6 |
| J Offline and persistence | 3 |
| **Total** | **about 42** |

## A. First launch and the Life root (4 min)

**A1. Life opens first.** [Pass ☐] [Fail ☐]
- **Given** a fresh install from the TestFlight build.
- **When** you open Spread for the first time.
- **Then** the Life root opens. Classic does not open first. Look for the Life area cards or the "Add Life" action (OD18).
- Notes:

**A2. Empty Life.** [Pass ☐] [Fail ☐]
- **Given** no Life areas yet.
- **When** the Life root is empty.
- **Then** one heading ("No Life areas yet"), one plain sentence, and one "Add Life" action appear. Nothing else competes (OD22).
- Notes:

**A3. Draft sheet and Cancel.** [Pass ☐] [Fail ☐]
- **Given** the "Add Life" sheet is open with a name typed.
- **When** you tap Cancel in the top leading corner, then open "Add Life" again.
- **Then** the sheet closes, nothing is saved, and the typed name is gone. Done is not the leading control (OD6).
- Now create "Test Work" with some hours and tap Save in the top trailing corner. **Then** it appears in the Life root.
- Notes:

## B. Life cards, focus, Details and Undo (7 min)

**B1. Focus a card.** [Pass ☐] [Fail ☐]
- **Given** two Life cards.
- **When** you tap "Test Work".
- **Then** the card takes focus. Its Details and Tasks entries appear, and the other cards move aside. The chevron brings all cards back.
- Notes:

**B2. Details sheet.** [Pass ☐] [Fail ☐]
- **Given** "Test Work" is focused.
- **When** you open Details.
- **Then** the sheet title reads "Details" (OD8). Cancel is leading and Save is trailing. Rename it to "Test Work 2", tap Save, and the card shows the new name.
- Notes:

**B3. Delete with Undo, no prompt.** [Pass ☐] [Fail ☐]
- **Given** "Test Work 2" has at least one task.
- **When** you delete it from Details.
- **Then** no confirmation appears (OD24). The area is removed, and the "Undo last change" control appears. Tap it, and the area returns with its tasks.
- Notes:

**B4. One Undo row.** Expected fail until fix X2. [Pass ☐] [Fail ☐]
- **Given** a change has just been made in Life (for example, a rename).
- **When** the change is visible.
- **Then** exactly one Undo row shows. The brand board requires "a single context-appropriate Undo/Redo row, not two" (X2, `corrections/life-routing.md`).
- Count the Undo controls on screen and note their labels: ______
- Notes:

**B5. Undo notice.** [Pass ☐] [Fail ☐]
- **Given** the notice is visible after a change.
- **When** you wait about six seconds without tapping it.
- **Then** it goes away. It sits above the home indicator and does not cover a control.
- Notes:

## C. Tasks and the ! priority (5 min)

**C1. Add a task with hours.** [Pass ☐] [Fail ☐]
- **Given** "Test Work" is focused.
- **When** you open Tasks and add "Pay rent" with hours on a day.
- **Then** the task appears under the responsibility on that day only.
- Notes:

**C2. High priority is a red !.** Expected fail until fix C1 (W2-3). Today Life shows a red flag. [Pass ☐] [Fail ☐]
- **Given** the task "Pay rent".
- **When** you mark it high priority from its priority control.
- **Then** a red **!** appears beside the task text, and VoiceOver speaks "High priority" (OD1). Turning it off removes both.
- Notes:

**C3. Priority does not move the task.** [Pass ☐] [Fail ☐]
- **Given** "Pay rent" is on Tuesday.
- **When** you mark it high priority.
- **Then** it stays on Tuesday. Priority is a flag, not a scheduling change (rules card).
- Notes:

**C4. Completion is the only buzz.** [Pass ☐] [Fail ☐]
- **Given** "Pay rent" is incomplete.
- **When** you complete it.
- **Then** one light tap is felt, and the task shows as complete. Then rename it or change its priority: **no** completion tap is felt (OD2).
- Notes:

**C5. Same mark in Classic Week.** [Pass ☐] [Fail ☐]
- **Given** "Pay rent" is high priority.
- **When** you switch to Classic (E1) and open Week.
- **Then** the same red ! appears on its row.
- Notes:

## D. Weekly Time and Plan Ahead (7 min)

**D1. Weekly total arrows.** [Pass ☐] [Fail ☐]
- **Given** the Weekly Time strip is open in Life.
- **When** you tap the increase arrow once, then hold it for three seconds, then let go.
- **Then** one tap adds one hour. Holding accelerates. The number on screen after release equals the saved total.
- Notes:

**D2. Over capacity wording.** Pending decision X5. [Pass ☐] [Fail ☐]
- **Given** the weekly total is lower than the hours assigned.
- **When** the strip shows.
- **Then** the state is truthful and readable. Record the exact word shown: ______ (X5 asks for one word across roots).
- Notes:

**D3. Nothing moves until confirmed.** [Pass ☐] [Fail ☐]
- **Given** Plan Ahead is open from Life.
- **When** you choose "Move hours once" and pick a future week, but do not tap Preview.
- **Then** nothing has moved in either week.
- Notes:

**D4. Preview first.** [Pass ☐] [Fail ☐]
- **Given** the transfer is filled in.
- **When** you tap the preview button.
- **Then** the sheet shows "Review before moving", the affected hours, the number of linked tasks, and "No automatic rollover. Changes can be undone from Life." The confirm button appears only after this.
- Notes:

**D5. Refused transfer.** [Pass ☐] [Fail ☐]
- **Given** a transfer that does not fit the target week.
- **When** you preview it.
- **Then** a plain reason appears, and no confirm button is offered.
- Notes:

**D6. Confirm and Undo.** [Pass ☐] [Fail ☐]
- **Given** a valid preview.
- **When** you confirm.
- **Then** the hours move. One Undo is offered, and tapping it restores both weeks.
- Notes:

**D7. Never auto-roll.** [Pass ☐] [Fail ☐]
- **Given** the current week has unplaced hours.
- **When** you move to the next week with the arrows.
- **Then** nothing moves on its own. Hours change only through Plan Ahead.
- Notes:

## E. Classic through More (4 min)

**E1. Switch to Classic.** [Pass ☐] [Fail ☐]
- **Given** Life is the current design.
- **When** you open More, find "Calendar design", and choose Classic.
- **Then** the label reads "Calendar design: Classic" with no "(current)". Classic opens on Spread, the responsibilities list (OD18).
- Notes:

**E2. Classic empty state.** [Pass ☐] [Fail ☐]
- **Given** a profile with no responsibilities (use a new test profile or skip with N/A and a reason).
- **When** Spread opens in Classic.
- **Then** one heading ("Make room for what matters"), one sentence, and one "Add responsibility" action appear (OD22).
- Notes:

**E3. Create a responsibility.** Expected fail until fix C3 (W2-4). [Pass ☐] [Fail ☐]
- **Given** Classic is open.
- **When** you tap "Add responsibility".
- **Then** the sheet title reads "Add responsibility". Today it reads "Add Life" (C3). Cancel is leading.
- Notes:

**E4. Choice persists.** [Pass ☐] [Fail ☐]
- **Given** Classic is chosen.
- **When** you force-quit and reopen Spread.
- **Then** Classic opens again. Switch back to Life in More before continuing.
- Notes:

## F. Classic Week, Month and To place (6 min)

**F1. Week layout.** [Pass ☐] [Fail ☐]
- **Given** Classic is open.
- **When** you open Week from the rail (Spread, Hours, Week).
- **Then** seven day cards start on Sunday, and the dashed "To place" tray sits above them.
- Notes:

**F2. Month and quick add.** [Pass ☐] [Fail ☐]
- **Given** Week is open.
- **When** you switch to Month, tap a date, and open quick add.
- **Then** role dots show on dates with hours. Quick add has Cancel in the leading corner.
- Notes:

**F3. Tap path to move hours.** [Pass ☐] [Fail ☐]
- **Given** a task sits in "To place".
- **When** you use the row's move control (no drag), choose a day in the Move-to sheet, and confirm.
- **Then** the task moves to that day. One Undo is offered.
- Notes:

**F4. Drag path.** [Pass ☐] [Fail ☐]
- **Given** a task sits in "To place".
- **When** you drag it onto a day.
- **Then** it lands on that day, with the same result as F3. Undo is offered.
- Notes:

**F5. Overbooked explanation.** [Pass ☐] [Fail ☐]
- **Given** the hours on the week exceed the weekly capacity.
- **When** the Spread header shows.
- **Then** the header reads "overbooked", and the explanation reads "These hours don't fit in your week. Remove some or raise your weekly hours." (OD12).
- Notes:

**F6. Empty week.** [Pass ☐] [Fail ☐]
- **Given** a week with no hours.
- **When** Week opens.
- **Then** one "Nothing planned this week" card shows. The seven day cards do not each say "Nothing planned" (OD13).
- Notes:

## G. Sheets (3 min)

**G1. One verb for removing a responsibility.** Expected fail until fix X3. [Pass ☐] [Fail ☐]
- **Given** a Classic responsibility.
- **When** you remove it from its sheet and, separately, from the edit-mode row delete.
- **Then** the same words are used in both places. Today the sheet says "Remove responsibility" and the row says "Delete responsibility". Record both: ______
- Notes:

**G2. Dismiss an open-tasks sheet.** Expected fail until fix X8. [Pass ☐] [Fail ☐]
- **Given** the open-tasks sheet is open from a carry-over.
- **When** you look at the leading control.
- **Then** it reads "Cancel". Today it reads "Not now".
- Notes:

**G3. Restore a deleted task.** Expected fail until fix X9. [Pass ☐] [Fail ☐]
- **Given** a task in Recently Deleted.
- **When** you read the explanation and restore it.
- **Then** the copy says "To place" with that casing, and the task returns to To place in its original responsibility and week.
- Notes:

**G4. Done on read-only sheets.** [Pass ☐] [Fail ☐]
- **Given** What's New or the Focus timer sheet is open.
- **When** you finish.
- **Then** Done is in the top trailing corner, and the sheet closes.
- Notes:

## H. Focus timer, Live Activity and widgets (5 min)

**H1. Start a focus block.** [Pass ☐] [Fail ☐]
- **Given** Life is open.
- **When** you open the Focus timer and start the block, or use "Start today's block" if offered.
- **Then** the timer runs with the current round shown.
- Notes:

**H2. Controls.** [Pass ☐] [Fail ☐]
- **Given** the timer is running.
- **When** you tap Pause, Resume, Forward (if offered), "Stop this stretch", and "Cancel session".
- **Then** each does what its label says. Each target is at least 44 pt (OD10).
- Notes:

**H3. Lock Screen Live Activity.** [Pass ☐] [Fail ☐]
- **Given** a focus session is running.
- **When** you lock the phone.
- **Then** a Live Activity shows the time and pause/stop controls. Using a control updates the app when you return.
- Notes:

**H4. Widgets match the app.** [Pass ☐] [Fail ☐]
- **Given** the Today and Life cards widgets are on the Home Screen. Turn on their switches in More first ("Show Today on widgets" and "Show Life cards on widgets"). Add the Focus widget from the widget gallery.
- **When** you compare them with the app.
- **Then** tasks done, hours placed and the Life area names match. Each widget keeps the system background (OD9).
- Notes:

**H5. Life card deep link.** [Pass ☐] [Fail ☐]
- **Given** the Life cards widget is on the Home Screen.
- **When** you tap one card in it.
- **Then** Spread opens on Life with that card focused.
- Notes:

**H6. Live Activity label.** Expected fail until fix X10. [Pass ☐] [Fail ☐]
- **Given** the Live Activity shows its cancel control.
- **When** you read its label with VoiceOver.
- **Then** it matches the Focus sheet: "Cancel session". Today the widget says "Cancel".
- Notes:

## I. Light, dark, text size, motion and VoiceOver (6 min)

**I1. Light and dark.** [Pass ☐] [Fail ☐]
- **Given** Life, Classic Week, a sheet and the Focus sheet.
- **When** you view each in Light, then Dark.
- **Then** text is readable. A high-priority task shows its red ! and its words, not colour alone.
- Notes:

**I2. Largest text size.** [Pass ☐] [Fail ☐]
- **Given** Settings, Display and Text Size, Larger Text at its largest.
- **When** you open Life, Weekly Time, the week navigator, a sheet toolbar and the Focus controls.
- **Then** no text is clipped or overlapping, and every control can be tapped.
- Notes:

**I3. Reduce Motion.** [Pass ☐] [Fail ☐]
- **Given** Settings, Accessibility, Motion, Reduce Motion is on.
- **When** you focus a card and change a week.
- **Then** nothing slides. The content still changes.
- Notes:

**I4. VoiceOver on key controls.** [Pass ☐] [Fail ☐]
- **Given** VoiceOver is on.
- **When** you move through the week arrows, the priority control, "Add Life", "Undo last change", the Focus buttons and Plan Ahead preview and confirm.
- **Then** each has a label and, where relevant, a value. The priority control speaks "Mark high priority: <task>" or "High priority". The arrows speak "Previous week" and "Next week". The focus order follows the screen.
- Notes:

**I5. Touch targets.** [Pass ☐] [Fail ☐]
- **Given** the priority control, the week arrows and a Done button.
- **When** you tap near each edge of its visible area.
- **Then** each responds. Each target is at least 44 pt.
- Notes:

**I6. Haptic count while stepping.** Decision X4. [Pass ☐] [Fail ☐]
- **Given** the Weekly Time arrows and the week arrows.
- **When** you step several times.
- **Then** record how many taps you feel, and whether they feel right: ______ The owner decides on the policy (X4). This step records evidence, not a verdict.
- Notes:

## J. Offline and persistence (3 min)

**J1. Airplane mode.** [Pass ☐] [Fail ☐]
- **Given** Airplane Mode is on.
- **When** you add a task, complete it and change an hour in Life.
- **Then** each works and nothing crashes.
- Notes:

**J2. Force-quit and reopen.** [Pass ☐] [Fail ☐]
- **Given** the changes from J1.
- **When** you force-quit Spread and reopen it.
- **Then** all changes are still there.
- Notes:

**J3. Background and return.** [Pass ☐] [Fail ☐]
- **Given** a focus session is running.
- **When** you leave the app for a minute and return.
- **Then** the session still shows the right time, and no sheet opens twice.
- Notes:

**J4. Upgrade over an earlier build.** [Pass ☐] [Fail ☐] or N/A
- **Given** an earlier TestFlight build with data is installed (if one exists).
- **When** you install this build over it.
- **Then** the data is kept (`docs/IOS_RELEASE.md`, physical checklist item 9). N/A if no earlier build exists; give the reason.
- Notes:

## 2. Expected fails on the current `main`

These are real findings. Each step fails until its fix lands, and the verdict stays NO-GO until the owner decides or the fix is merged.

| Step | Finding | Fixed by |
| --- | --- | --- |
| B4 one Undo row | X2 | Owner decision, then Life lane |
| C2 red ! in Life | C1 (OD1) | W2-3 |
| D2 over-capacity word | X5 | Owner decision |
| E3 sheet title | C3 | W2-4 |
| G1 one removal verb | X3 | Owner decision, then Classic lane |
| G2 "Cancel" | X8 | Lane D |
| G3 "To place" casing | X9 | Lane D |
| H6 "Cancel session" | X10 | Lane D |
| I6 haptic policy | X4 | Owner decision |
| (all) build family | X1 | Owner decision, then native config |

## 3. Not covered by this script

- **iPad.** Out of scope for 1.0 under OD20. The build still targets iPad, so record the result in the release checklist (X1).
- **Backup and restore.** Excluded from polish. Use the physical checklist in `docs/IOS_RELEASE.md` (items 4 and 5) before any upload.
- **iCloud, sync and Studio.** Excluded by the Spread boundaries.
- **Landing page.** Covered by the lane E captures and reduced-motion checks (`evidence/landing/`).

## 4. Verdict

- **PASS for this build** only when every step is Pass or N/A with a reason, and every expected fail has been fixed or accepted in writing by the owner against its finding ID.
- **FAIL** otherwise. Record the step IDs and attach the screenshots.
- A PASS here does not make a release GO. The release checklist still needs the owner's written authorization of this commit and build, and the App Store gate (`docs/APP_STORE_REVIEW_CHECKLIST.md`).

Run by: ______________________  Date: ______________  Build: ______________  Verdict: PASS ☐  FAIL ☐
