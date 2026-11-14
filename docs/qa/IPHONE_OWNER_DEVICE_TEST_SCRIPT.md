# Spread 1.0 | Owner device-test script (real iPhone)

> Part of the Spread quality records. Release record: [../release/RC_EVIDENCE_RECORD.md](../release/RC_EVIDENCE_RECORD.md). Design-level device script (wave 2, longer and more technical): [../design/finalize/DEVICE_TEST_SCRIPT.md](../design/finalize/DEVICE_TEST_SCRIPT.md).

> Summary: a step-by-step test for one real iPhone running a TestFlight build of Spread 1.0. You need no programming knowledge. For each step, do what it says, compare with "You should see", and tick Pass or Fail. About 75 minutes. Nothing in this script has been run yet.

## Before you start

**You need**

- An iPhone running iOS 17 or later, with enough free storage to install the app.
- The TestFlight build of Spread 1.0 (from the owner's App Store Connect account). Note its build number.
- Test data only. Use names such as "Test Work", "Test Family" and "Test Health". Do not enter real names, places, health details or photos of people.
- A timer for the timed steps. This script needs only the one iPhone.
- A notepad or the Notes app for the record below.

**Record the run (fill in before step S1)**

| Field | Entry |
| --- | --- |
| Build number (TestFlight, Spread > About) | |
| Source commit (from the release record) | |
| iPhone model (Settings > General > About) | |
| iOS version (same screen) | |
| Date and start time | |
| Tester | |
| Install type: fresh install, or over an earlier build | |

**Marks.** Tick **Pass** only when the step ran and matched. Tick **Fail** when it did not and write what you saw. Tick **N/A** only with a reason in Notes. Never tick a step you did not run.

**Stop rule.** If the app crashes, loses data, or saves a wrong value, stop. Record the step and build, and mark the run **FAIL**.

**Screenshots.** Take one at each step marked [photo], and name it `<build>-<step>.png`, for example `1.0-(3)-S3.3.png`.

**Labels.** Button and screen names below are the ones shown in the app. If a label differs, record the words you see; that is a finding, not a failed step, unless the step says otherwise.

---

## S0. Set the phone up (2 minutes)

1. Settings > Display & Brightness: set to **Light**. (You will switch to Dark in step S15.)
2. Settings > Accessibility > Motion: **Reduce Motion off**. (Turned on in S16.)
3. Settings > Display & Brightness > Text Size: default size.
4. Turn Wi-Fi and mobile data **on** for now.

You should see: the phone in Light mode, default text, motion on. Pass / Fail / N/A

---

## S1. First launch and an empty planner (4 minutes)

**S1.1 Install and open.** Install the TestFlight build from the TestFlight app and open Spread.

You should see: Spread opens straight to the planner. No sign-in screen, no waiting list, no beta code, no web page. A brief launch screen is fine. [photo] Pass / Fail / N/A

**S1.2 Empty Life.** Look at the Life screen with nothing added.

You should see: the heading "No Life areas yet", one sentence under it, and one button "Add Life". Nothing else competes. Pass / Fail / N/A

**S1.3 Cancel leaves nothing behind.** Tap **Add Life**. Type "Test Work". Tap **Cancel** at the top left.

You should see: the sheet closes. "Test Work" is not in the list. Pass / Fail / N/A

Notes:

---

## S2. Life areas and weekly hours (5 minutes)

**S2.1 Create a Life area.** Tap **Add Life**. Type "Test Work", set about 20 hours a week, and tap **Done** at the top right.

You should see: "Test Work" is listed as a card, with its hours. [photo] Pass / Fail / N/A

**S2.2 Add two more.** Repeat for "Test Family" (6 hours) and "Test Health" (4 hours).

You should see: three cards. The weekly total on the time strip is about 30 hours. Pass / Fail / N/A

**S2.3 Weekly total arrows.** On the weekly time strip, tap the increase arrow once. Then press and hold it for about three seconds, and let go.

You should see: one tap adds one hour. Holding speeds the count up. The number on screen after you let go is the number that is saved (check it again after you restart in S11). Record the total: ______ Pass / Fail / N/A

**S2.4 Adjust one area.** Tap the time strip's **Adjust hours** control for "Test Health", and change it to 5. Go back.

You should see: "Test Health" shows 5 hours. Pass / Fail / N/A

Notes:

---

## S3. Week, tasks, priority, completion and To place (9 minutes)

**S3.1 Week view.** Switch from **Life** to **Week** at the top.

You should see: one card for each day of the week, with the planned hours for each area. [photo] Pass / Fail / N/A

**S3.2 Add a task.** Go back to Life. Tap "Test Work" to focus it. Tap **Add task**. Type "Pay rent", choose a day, and save.

You should see: "Pay rent" appears under "Test Work" on that day, and on no other day. Pass / Fail / N/A

**S3.3 Move a task with a tap.** Open the "To place" tray (or a task's **Move to** action). Choose **Move to** and pick a different day, then confirm.

You should see: the task moves to that day. An **Undo** notice appears. Tap it and the task goes back. [photo] Pass / Fail / N/A

**S3.4 Move a task by dragging.** Press and hold "Pay rent", then drag it onto another day that has "Test Work" hours.

You should see: it lands on that day, with the same result as S3.3. Drag is quiet: no buzz while you drag. Pass / Fail / N/A

**S3.5 High priority.** Find the priority control on "Pay rent" (its label reads "Mark high priority: Pay rent"). Turn it on.

You should see: a **red !** beside the task name. VoiceOver, if you use it, says "High priority". The task stays on the same day. Turn it off: the ! goes away and the task still stays. Pass / Fail / N/A

**S3.6 Complete a task.** Tap **Complete** on "Pay rent".

You should see: the task shows as complete. You feel **one light tap** (not a double tap). Then rename the task or change its priority: you should feel **no** tap. Record what you felt: ______ Pass / Fail / N/A

**S3.7 To place.** Add a second task, "Buy stamps", without choosing a day.

You should see: it appears in the **To place** tray with the count, for example "Tasks to place, 1". It is not on any day. Pass / Fail / N/A

Notes:

---

## S4. Plan Ahead (10 minutes)

**S4.1 Open Plan Ahead.** Open Plan Ahead from the Life screen (the menu, then **Plan Ahead**).

You should see: the Plan Ahead sheet with a heading "Plan Ahead" and its choices. [photo] Pass / Fail / N/A

**S4.2 Suggested plans.** Look for the section "Suggested plans".

You should see: one suggestion for each Life area that has hours and no schedule, for example "Test Work". Tapping one opens the repeat form already filled in, so you can review it before you confirm. Do not confirm yet. Pass / Fail / N/A

**S4.3 Copy this week forward.** Tap **Copy this week forward** (or the copy choice in the sheet). Read the batch it offers. Tap **Preview copy**.

You should see: a review screen with the title "Review before copying", the weeks affected, and a note that existing weeks are kept. Nothing has changed yet. Tap **Cancel**: nothing changes. Run it again and tap **Copy to these weeks**. Check next week in Week view: the hours now match this week. Pass / Fail / N/A

**S4.4 Repeat weekly hours.** Open a suggestion from S4.2 or **Make a new plan**. Check the choices: **Repeat**, **Every week** or **Every N weeks**, **Starts**, and **Ends** (you may set an end date). Read the preview before you confirm.

You should see: a preview of the weeks that will change. Confirm only after you have read it. Afterwards, the repeating plan appears in the Plan Ahead list. Pass / Fail / N/A

**S4.5 Month calendar dots.** Go to Life, switch to **Week**, and then **Month**. Look at the month.

You should see: small dots on the days that have planned hours, including days in the weeks you copied or repeated in S4.3 and S4.4, even if you have not opened those weeks yet. [photo] Pass / Fail / N/A

**S4.6 Move hours once.** In Plan Ahead, choose **Move hours once**, pick a future week and hours, and tap **Preview transfer**.

You should see: a review with the heading "Review before moving". Nothing has moved yet. Tap **Cancel**: nothing changes. Preview again, confirm, then tap **Undo**. Both weeks return to how they were. Pass / Fail / N/A

Notes:

---

## S5. Life cards: focus, Details, Tasks and delete (5 minutes)

**S5.1 Focus a card.** In Life, tap "Test Family".

You should see: the card takes focus and the other cards move aside. Its **Details** and **Tasks** controls appear. Pass / Fail / N/A

**S5.2 Details.** Tap **Details**.

You should see: a sheet titled "Details". **Cancel** is at the top left and **Done** at the top right. Change the name to "Test Family 2", tap **Done**. The card shows the new name. Pass / Fail / N/A

**S5.3 Tasks.** On "Test Family 2", tap **Tasks**.

You should see: the tasks for this Life area. Add one, "Dinner plan", then return. Pass / Fail / N/A

**S5.4 Delete with Undo.** Open Details and remove "Test Family 2". Do not expect a confirmation.

You should see: the area is removed, and the **Undo last change** notice appears. Tap it: the area returns with its task. Count the Undo controls on screen: ______ (expected one row). Pass / Fail / N/A

Notes:

---

## S6. Focus timer, inside the app (7 minutes)

**S6.1 Start today's block.** Open the Focus timer from Life. Tap **Start today's block**, if it is offered. If it is not offered, tap the start control and choose a Life area with planned hours.

You should see: the timer starts and shows the current round. [photo] Pass / Fail / N/A

**S6.2 Pause and Resume.** Tap **Pause**. Wait ten seconds. Tap **Resume**.

You should see: the timer stops while paused and continues from the same time after Resume. Pass / Fail / N/A

**S6.3 Next step.** Tap **Next step**.

You should see: the timer moves to the next step (the next round or break). Nothing starts on its own: the next round waits for a tap. Pass / Fail / N/A

**S6.4 Stop this stretch.** Tap **Stop this stretch**.

You should see: the current stretch ends. The next step waits for you to tap. Pass / Fail / N/A

**S6.5 Cancel session.** Start again. Tap **Cancel session**.

You should see: the session ends. The timer is gone from the app. Confirm nothing is still running on the Lock Screen (S7). Pass / Fail / N/A

Notes:

---

## S7. Lock Screen and Dynamic Island (6 minutes)

**S7.1 Live Activity on the Lock Screen.** Start a focus session (S6.1). Press the side button to lock the iPhone.

You should see: a Live Activity on the Lock Screen with the time left and its controls. [photo] Pass / Fail / N/A

**S7.2 Dynamic Island.** On an iPhone with a Dynamic Island, look at the island while the session runs. (On an iPhone without one, mark N/A and write "no island".)

You should see: a compact display of the timer. Press and hold the island to open its controls. Pass / Fail / N/A

**S7.3 Controls from the Lock Screen.** Tap **Pause** on the Lock Screen. Then tap **Resume**. Then tap the cancel control (it may read "Cancel").

You should see: each control does its job. Unlock and open Spread: the app shows the same state. Record the label of the cancel control exactly as you saw it: ______ (The app's button reads "Cancel session". A label that reads only "Cancel" is a finding for the owner, not a failed step if the session still ends.) Pass / Fail / N/A

**S7.4 Forward control.** If a forward control is shown, record its label: ______ (The app's button reads "Next step".) Tap it and check the timer moves to the next step. Pass / Fail / N/A

Notes:

---

## S8. Widgets: each size (8 minutes)

Before you start: long-press an empty part of the Home Screen, tap **+** at the top, and search for **Spread**. Add each widget below. In Spread, first turn on the switches in S9.2 and S9.3.

**S8.1 Today widget, small (Home Screen).** Add the small **Spread Today** widget.

You should see: the number of tasks done and planned for today. It matches the app. Pass / Fail / N/A

**S8.2 Today widget, medium.** Add the medium **Spread Today** widget.

You should see: today's tasks and hours, matching the Week screen in the app. [photo] Pass / Fail / N/A

**S8.3 Today widget on the Lock Screen.** Long-press the Lock Screen, tap **Customize**, and add a Spread Today widget in the rectangular or circular slot.

You should see: a readable count or progress line. Pass / Fail / N/A

**S8.4 Focus widget, small, medium and large.** Add the **Focus** widget at each of its three sizes.

You should see: at small, the timer and one control; at medium, two controls; at large, every control. Labels are not cut off. Each control is easy to tap. [photo at large] Pass / Fail / N/A

**S8.5 Life cards widget, medium and large.** Add the **Life cards** widget at medium and at large.

You should see: your Life areas with their hours. Tap one card: Spread opens on Life with that card focused. Pass / Fail / N/A

Notes:

---

## S9. Switches in More and the Focus sheet (5 minutes)

**S9.1 Calendar design.** Open **More** (the top right, or the menu) and find **Calendar design**. Choose **Classic**, then switch back to **Life**.

You should see: both choices work. The row reads "Calendar design" with the choice you made. Pass / Fail / N/A

**S9.2 Show Today on widgets.** In **More**, find **Show Today on widgets** and turn it **on**. Then turn it **off**, and check that the Today widget shows a short message about the switch instead of tasks. Turn it back **on**.

You should see: the widget follows the switch. Pass / Fail / N/A

**S9.3 Show Life cards on widgets.** Repeat S9.2 with **Show Life cards on widgets**.

You should see: the Life cards widget follows the switch. Pass / Fail / N/A

**S9.4 Touch feedback.** In Life, open the menu and tap **Gesture help**. Find the **Feedback** section and the **Touch feedback** switch. Turn it **off**. Complete a task (S3.6), then turn it **on** again.

You should see: with the switch off, completing a task gives no tap. With it on, one light tap. Record: ______ Pass / Fail / N/A

**S9.5 Focus sheet switches.** Open the Focus timer sheet and check each switch: **Notify when a stretch ends**, **Show active timer on Lock Screen and Dynamic Island**, **Show Life area name outside Spread**, and **Remind me to plan each day**. Turn each on and off once.

You should see: each switch works. Its value is kept when you leave and come back. With **Show Life area name outside Spread** off, a widget or Lock Screen view shows no Life area names. Pass / Fail / N/A

Notes:

---

## S10. Backup and restore (10 minutes)

**S10.1 Back up Spread.** Open **More**, then **Backup and restore**. Tap **Back up Spread**.

You should see: the iOS share sheet opens with two files: a `.spread` backup and a plan file (`.json`). Tap **Save to Files**, choose **On My iPhone**, and save. (This is the file share, not Spread's iCloud feature, which is off in 1.0.) [photo] Pass / Fail / N/A

**S10.2 Restore and merge: choose a file.** Back in **Backup and restore**, tap **Restore and merge** and choose the `.spread` file from S10.1.

You should see: the file opens in the picker (it is not greyed out). A preview lists the profile in the backup. Nothing has changed yet. Pass / Fail / N/A

**S10.3 Restore adds, never replaces.** Confirm the restore. Then check your profiles.

You should see: the backup comes back as a **new** profile. Your existing profile is unchanged. Record the profile names: ______ Pass / Fail / N/A

**S10.4 Plan file merge.** Choose the plan file (`.json`) from S10.1 and check the preview. Read the line about "Merge into" and the changes listed. Tap **Cancel**.

You should see: nothing changes until you choose **Merge into <profile name>**. Removals are off by default. Pass / Fail / N/A

**S10.5 Word document.** Open **More**, find **Share this week**, and choose **Word document**.

You should see: the share sheet opens with a Word file. Save or cancel. Pass / Fail / N/A

Notes:

---

## S11. Force-quit and reopen (3 minutes)

1. Make three changes: rename "Test Work", add a task "Check email", and move one task.
2. Swipe up from the bottom and pause to open the app switcher. Swipe the Spread card **up** to force-quit it.
3. Wait ten seconds. Open Spread.

You should see: all three changes are still there. Pass / Fail / N/A

Notes:

---

## S12. Airplane mode (5 minutes)

1. Turn **Airplane Mode on** (Control Centre).
2. Turn Wi-Fi off too if it is still on.
3. In Spread, add a task, complete it, and change an hour in Life.
4. Force-quit Spread (as in S11) and reopen it.

You should see: each action works with no connection. Nothing crashes. The changes are still there after the reopen. Turn Airplane Mode off. Pass / Fail / N/A

Notes:

---

## S13. Largest text size (5 minutes)

1. Settings > Accessibility > Display & Text Size > Larger Text. Turn on **Larger Text** and drag the slider to the **largest** size.
2. Open Spread. Check Life, Weekly Time, the week navigator, one sheet and the Focus controls.

You should see: text is not cut off or overlapping. Every button can still be tapped. Record any clipped text: ______ (This check is required for the accessibility claim. A failure is a finding and blocks the accessibility wording in the store copy.) Pass / Fail / N/A

Reset the text size to default afterwards.

Notes:

---

## S14. VoiceOver spot check (5 minutes)

1. Settings > Accessibility > VoiceOver: turn it **on**. Swipe right to move from one item to the next.
2. Open Spread. Move through the week arrows, the priority control on a task, **Add Life**, **Undo last change**, the Focus buttons and the Plan Ahead **Preview** button.

You should see: each control is read aloud with a name. The arrows say "Previous week" and "Next week". The priority control says "High priority" or "Mark high priority". Focus order follows the screen. Record what you heard for any control that was unnamed: ______ Turn VoiceOver off afterwards.

This is a spot check, not a full VoiceOver pass. Pass / Fail / N/A

Notes:

---

## S15. Dark mode (3 minutes)

1. Settings > Display & Brightness > **Dark**.
2. In Spread, check Life, Classic Week (S9.1), one sheet and the Focus sheet.
3. Check a high-priority task.

You should see: text is readable on every screen. The high-priority task shows its red ! and its words, not only colour. Switch back to **Light**. Pass / Fail / N/A

Notes:

---

## S16. Reduce Motion (3 minutes)

1. Settings > Accessibility > Motion > **Reduce Motion: on**.
2. In Spread, focus a Life card (S5.1). Change a week with the arrows.

You should see: nothing slides or bounces. The content still changes correctly. Turn Reduce Motion off afterwards. Pass / Fail / N/A

Notes:

---

## S17. Landscape (3 minutes)

Spread 1.0 declares portrait and both landscape orientations. Turn the phone sideways.

1. Open Life, then Week, then a sheet, in each landscape direction.

You should see: each screen fits, nothing is cut off at the notch or Dynamic Island, and the controls still work. Pass / Fail / N/A

Notes:

---

## S18. What's New (2 minutes)

1. Open **More** and then **What's New**.

You should see: the list of recent updates in plain English. Read one item and check that it is true on the phone. Record any item you could not confirm: ______ Tap **Done** at the top right. Pass / Fail / N/A

Notes:

---

## S19. Verdict and sign-off

| Result | Count |
| --- | --- |
| Pass | |
| Fail (list the step IDs) | |
| N/A (with reasons) | |

**Verdict:** PASS only when every step is Pass or N/A with a reason. Any Fail, crash or lost data makes the verdict **FAIL** for that build.

**A PASS does not release the app.** A release needs the owner's written authorization of the specific build, separate from this script.

Run by: ______________________ Date: ______________ Build: ______________ Verdict: PASS ☐ FAIL ☐

---

## Not covered by this script

- Upgrade over an earlier build (the owner checks it separately with [../IOS_RELEASE.md](../IOS_RELEASE.md) item 9, if an earlier build exists).
- iPad (out of scope for 1.0, OD20).
- iCloud, sync and any cloud feature (off for 1.0).
- Store screenshots (see [../release/SCREENSHOT_SHOT_LIST.md](../release/SCREENSHOT_SHOT_LIST.md)).
- Haptic feel and the full VoiceOver pass beyond the spot check.
