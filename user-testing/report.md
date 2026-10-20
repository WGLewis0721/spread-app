# Spread user-testing report: 25 personas, five behaviors

Run on 2026-10-20 against the installed-app build of the planner (`npm run export:ios`) on the repo's fake native bridge, with a fixed clock (Wednesday 4 March 2026), an empty device per run and no network. Every persona ran twice: **desktop Chromium (1280x800)** and **iPhone 14 WebKit emulation (touch)**. That is 50 persona runs, plus 101 deterministic checks.

**What this is.** Scripted walkthroughs of plausible people, driven by Playwright, grouped by what they were trying to do. They find broken math, friction and missing features. They cannot tell you how the app feels, and they are not real users. When a step failed because of my script (wrong screen, short timeout under load) it is not reported as an app problem; where I could not tell, it is marked unverified.

**What this is not.** Not real iOS: no WKWebView, keyboard, safe areas, share sheet, Files picker or haptics. See "Untested".

The one-line quotes are **simulated and invented**. They are not customer feedback and must not be used as testimonials.

Everything lives in this folder: this report, [coverage-matrix.md](coverage-matrix.md) (which persona touched which element) and `personas/<persona>/` (screenshots, raw notes and the interaction log for each run).

## The five behaviors

| Behavior | Variations | Deterministic checks | Personas |
| --- | --- | --- | --- |
| Creating a plan | future weeks (Walt) | `journeys/create-plan.*.spec.ts` | Hannah, Walt, Maya, Greg, Sofia |
| Allocating time | overcommitment (Marcus, Elena, Jaylen), future weeks (Ravi) | `journeys/allocate-time.hours.spec.ts` | Marcus, Elena, Ravi, Jaylen, Naomi |
| Rearranging a week | future weeks (Renata, Tomás) | `journeys/rearrange-week.spec.ts` | Priya, Grace, Renata, Tomás, Aisha |
| Handling unfinished tasks | overcommitment (Dana), future weeks (Tyrone, Pete, Ben) | `journeys/unfinished-tasks.spec.ts` | Dana, Tyrone, Pete, Lucia, Ben |
| Recovering saved data | offline (Kenji) | `journeys/recover-data.spec.ts` | Nadia, Owen, Imani, Kenji, Dorothy |

Overcommitment and future-week navigation are treated as variations of those journeys, not as separate ones.

## Coverage

132 of 133 listed interactive elements were used by at least one persona; the full matrix is in [coverage-matrix.md](coverage-matrix.md). It is built from what the pages actually received (clicks, edits, keys, drags, swipes), not from what the scripts intended.

- **Not covered:** moving an existing spread to another day by dragging. A drag registered in a standalone probe but nothing moved; I could not tell whether that is the app or the synthetic pointer. Dragging a task from To place did register.
- **Not in the installed-app build (so not covered):** the landing page and waitlist, the beta sign-in and Log out, the iCloud sheets (flag-off), and Print / Save PDF, which the installed app does not list in Settings.

## Findings, ranked

1. **Rollover and Copy last week strand hours.** With Work at 20h and 10h placed on Saturday, both actions give next week a Work bank of 20h planned, **10h left** and **nothing on any day**: 10 hours are counted as placed but appear nowhere. Reproduced twice in a probe and in an expected-fail check per action. Personas: Tyrone, Lucia, Dana, Ben. Major.
2. **Nothing warns about overbooking.** Wednesday held 54 planned hours with no warning and no daily total on the day card. Jaylen, Dana, Marcus, Elena. Major.
3. **No way to cap or protect time.** Dana cannot cap grading at 2h; Naomi, Marcus and Elena cannot lock Self time or a day. Self can be set to 0h silently. Major (design gap).
4. **Rollover and Copy last week do not carry the day layout.** The whole week must be placed again. Done marks are also reset: carried tasks come back open. Tyrone, Lucia, Ben. Major.
5. **A deleted task can come back.** Reload within about 300ms of deleting and the task reappears; after 1.5s it stays gone. Adding a task is safe. Found with a probe in the installed-app build only. Minor, but it is data.
6. **Restoring never replaces.** A full backup restored onto a device with content is added as a new profile ("Me (restored)"); only an empty profile is filled. The confirmation wording changes between flows ("Add these profiles?", "Use this safety copy?" with Put everything back or Add as profiles). Works, but surprising. Nadia, Owen, Dorothy.
7. **Rejected backup files all get the same message**, including a backup from a newer version that should say "update Spread". Dorothy. Polish.
8. **Moving hours between days looks drag-only**, and drop targets can sit under the pinned header. Automated drags did not move anything (unverified). Priya, Tomás, Aisha.
9. **iPhone layout.** The pinned header takes about a third of the screen in Spread and Week, the floating dock overlaps the lowest rows, and controls are small: the app icon is 34x34, spread names 26pt tall, hours buttons 32pt wide, Undo 46x24 and Back to this week 94x16. Every iPhone run.
10. **A button that looks live but does nothing.** At 0h left the + on a day and Add for a spread look normal and are not marked disabled, but do nothing and say nothing. Elena, Marcus.

Smaller notes: placing tasks needs the spread on a day first and a long To place group starts collapsed (Grace); one swipe plus one mouse-wheel scroll on the week crown ended six weeks on, at Apr 13 – Apr 19 (Tomás); WebKit logs a 404 for `/__grok/manifest.webmanifest`, which `scripts/export-ios.mjs` leaves linked in the bundle; WebKit also logs the unsupported `interactive-widget` viewport key.

## What worked well

- The hours math: planned = on days + left held for every persona and spread, apart from finding 1.
- Review open tasks: lists only open tasks, all ticked; unticking lowers the count; Not now changes nothing; the Replace-next-week prompt appears and Cancel keeps the week.
- Data safety: reload keeps the plan, planning offline works and is there after reconnecting, a failed save shows a message, a restore makes a safety copy that can be listed and used, and every damaged or foreign file was refused with the plan untouched.
- Profiles are isolated, can be renamed, removed (with a cancel) and persist.
- The keyboard works: arrow keys switch tabs and change weeks, Escape closes dialogs and Settings, Enter adds tasks.

## Creating a plan

### Hannah Lindqvist, homesteader (variation: none)
Sixteen chores and lessons across four spreads, two ticked, Rollover.
**Worked:** sixteen tasks entered without trouble; Rollover carried them all. **Missing:** repeating tasks. Rollover reopens finished chores, a poor man's repeat.
*Simulated quote:* "I just need milking the goats to come back every week."

### Walt Henderson, plumber planning an anniversary trip (variation: future weeks)
Ten weeks forward adding trip tasks, Month view, a reload.
**Worked:** weeks moved in 150-630ms on desktop (about 0.7-3.1s on the iPhone emulation); a task added in week +2 was still there after a reload; nothing left the device. **Notes:** Spread reopens on the Month view if you left it there; getting to a date weeks out is one tap per week.
*Simulated quote:* "Ten weeks out is a lot of taps, but it stays on my phone."

### Maya Okonkwo, first-time user (new)
Poked at everything: app icon, color dot and picker (11 colors), hide and show tasks, the jump chips, all ten symbols in New Spread, adding and removing spreads in Edit, dark, light and system appearance, all twelve accent colors.
**Worked:** everything responded, including all ten symbols and all twelve accent options. iPhone: the accent loop timed out once under load (unverified).
*Simulated quote:* "I tapped everything and nothing broke."

### Greg Paulsen, keyboard-only (new)
Arrowed between tabs, typed tasks with Enter, changed weeks with the arrow keys, closed New Spread and Settings with Escape, tabbed through the first screen, set hours from the keyboard.
**Worked:** all of it. The first Tab stop is the week crown, then Previous and Next week, then the tabs. **Note:** twelve Tab presses only get as far as the Work name field, so reaching a task field takes more.
*Simulated quote:* "I never reached for the mouse."

### Sofia Marin, product manager (new)
Renamed a task; added Notes (typed an outline line, expanded and collapsed), an Outline (add a point, indent, outdent, Tab), a Table (cells, add and remove rows and columns) and a Photo (choose, replace); removed a block; reopened it; deleted a task.
**Worked:** four blocks survived closing and reopening; delete worked.
*Simulated quote:* "Notes, outline, table and photo on one task is exactly what I wanted."

## Allocating time

### Marcus Bell, director in tech week (overcommitment)
Production to 32h (total 39), Self to 0h, 8h a day Monday to Thursday.
**Issues:** Self goes to 0h silently and the swallowed week looks like any other. See findings 3 and 10.
*Simulated quote:* "Tech week ate everything and Spread let me watch it happen."

### Elena Voss, grad student (overcommitment)
Five spreads, twelve small tasks, fixed lab days, protected thesis hours, then a lab emergency.
**Issues:** with five spreads the Week chip row clips at the right edge with no hint that it scrolls; at 0h left, Add Lab Runs did nothing. No way to protect thesis hours.
*Simulated quote:* "Great until something had to give, then I was on my own."

### Ravi Menon, hackathon coach (future weeks)
Three weeks with Hack Team at 2h, 5h and 9h.
**Worked:** each week keeps its own hours (17, 20, 24 totals). **Missing:** comparing weeks needs stepping through them; Month shows which spreads are on each day, not hours.
*Simulated quote:* "I can see the ramp, but only one week at a time."

### Jaylen Carter, fraternity president (overcommitment)
Classes 24h, Chapter 14h, Social 16h, everything piled on Wednesday.
**Issues:** 54 planned hours in one day with no warning. The chips all reading 0h left is the only signal. See finding 2.
*Simulated quote:* "It let me plan 54 hours into one day without a word."

### Dr. Naomi Feld, couples therapist (none)
Clients 24h, Admin after sessions, Self 8h, took a Free time suggestion (one tap), then Clients to 40h.
**Worked:** growing Clients never touched Self; Free time suggested an hour on the lightest day. **Missing:** locking Self time.
*Simulated quote:* "Nothing eats my pottery time, but nothing defends it either."

## Rearranging a week

### Priya Nair, executive assistant
Work across Mon-Wed, then tried to move Tuesday's hours to Thursday.
**Issue:** the drag did not move anything (unverified, see finding 8); remove and re-add works and Undo appears.
*Simulated quote:* "When plans change I'd rather tap than drag."

### Grace Okafor, 2nd grade teacher
Twelve small tasks and trying to place short ones.
**Issues (probe-confirmed):** Place only works once the spread is on a day ("Add it to a day first"); the group starts collapsed with twelve tasks, so about three taps per short task.
*Simulated quote:* "Twelve tiny tasks is a lot of tapping."

### Renata Alvarez, small claims lawyer (future weeks)
A kids week (Family 20h) and a no-kids week (Family 2h), jumping between them, a filing deadline on Friday.
**Worked:** both weeks kept their own numbers; placing the filing offered Undo. **Missing:** alternating-week templates.
*Simulated quote:* "Each week keeps its own numbers, which is what I need."

### Tomás Reyes, restaurant manager (future weeks, new)
Shifts of 6h, trimmed Thursday, tried dragging Monday to Wednesday, removed Tuesday then undid, swiped and scrolled the crown, opened Month, jumped a month ahead and picked April 11, went back.
**Worked:** Month picks open the right week (Apr 6 – Apr 12); Undo restored the removed shift; the crown's swipe, scroll and arrow keys all change weeks. **Issues:** the drag did not move the shift (unverified); a swipe plus one wheel scroll on the crown ended at Apr 13 – Apr 19, six weeks on; on iPhone WebKit mouse-wheel is unsupported (script guarded).
*Simulated quote:* "Month view got me to the catering date in two taps."

### Aisha Rahman, ER nurse (new)
Shifts 36h, twelve hours on Wednesday and Thursday, placed a task from To place on Wednesday, used Not today, placed and undid a second, tried dragging a task, swapped a shift Wednesday to Friday.
**Worked:** Place with a day list; Not today puts the task back. **Notes:** no Undo is offered after Not today; the task drag registered but its result was not verified.
*Simulated quote:* "Tasks float until I know my day, and that fits."

## Handling unfinished tasks

### Dana Whitfield, physics teacher (overcommitment)
Planned the week, tried to cap grading, moved four open tasks with Review open tasks.
**Issues:** no per-day cap (Monday went from 2h to 9h); see findings 3 and 4.
*Simulated quote:* "I planned my whole week in five minutes and could see where the hours went."

### Coach Tyrone Reeves, football coach (future weeks)
Built a normal week, Rollover into the bye week, edited it, flipped back, rolled over again.
**Worked:** editing next week never touched this week; rolling over onto the edited bye week asked "Replace next week?". **Issues:** findings 1 and 4.
*Simulated quote:* "I just want last week's shape back with one change."

### Pete Janssen, contractor (future weeks, new)
Eight tasks, three done, one ticked then unticked. Review open tasks: looked then Not now; unticked two so the button read Move 3; moved them; compared both weeks; Rollover onto an edited week: Cancel, then Replace; three weeks ahead and back.
**Worked:** every step behaved as a person would expect, and the Replace prompt protected the edited week.
*Simulated quote:* "I picked what moved and what stayed, and the rest stayed put."

### Lucia Ferrante, wedding photographer (new)
Twenty hours, Saturday 10h, then Copy last week into next week, Copy week as text, Word document.
**Worked:** Copy last week reopens the tasks; Word document exported a `.docx`; Copy week works. **Issues:** the day layout is not copied and **10 hours are stranded** (finding 1); Print / Save PDF is not offered in the installed app.
*Simulated quote:* "Every week looks like last week, except it doesn't copy the days."

### Ben Ashworth, freelance writer (future weeks, new)
Five tasks, ticked and unticked, deleted a dead task, hid and showed the list, then four Rollovers in a row and ticked one in the far week.
**Worked:** the chain of four weeks held four tasks each; deleting a task works. **Issues:** carried tasks reopen (0 ticked each week); finding 5 for quick reloads after a delete.
*Simulated quote:* "Rolling forward is easy; the ticks starting over is not."

## Recovering saved data

### Nadia Haddad, ICU pharmacist (new phone)
Built a plan, backed it up, wiped the device and reloaded, restored.
**Worked:** the empty device filled with the plan: tasks, hours and Tuesday's 8h all came back. The dialog says "Add these profiles?" and Cancel changed nothing.
*Simulated quote:* "My new phone had my week on it in two taps."

### Owen Gallagher, accountant
Reloaded after each step, read the save status, backed up, changed things, restored, found the safety copy.
**Worked:** the task and its tick survived a reload; Settings says "Saved on this device. Works with no connection."; the restore did not replace anything and added "Me (restored)"; a safety copy was listed and offered "Put everything back" or "Add as profiles". **Notes:** the persona's storage-full step did not finish (unverified there); the deterministic check shows the failed-save message.
*Simulated quote:* "I checked after every step, and it was all still there."

### Imani Brooks, nurse practitioner (shared phone)
Renamed her profile, added Jordan, planned in each, switched back and forth, removed Jordan (cancel, then confirm), reloaded.
**Worked:** Jordan's profile started clean, nothing leaked either way, removal asked first and persisted.
*Simulated quote:* "Jordan's week and mine never touched."

### Kenji Watanabe, travelling consultant (offline)
Went offline, planned a week and a task in the next, read Settings, backed up, reconnected and reloaded.
**Worked:** everything worked offline and was there after; Settings says it works with no connection; the backup produced a file on desktop (the iPhone run did not finish that step). **Note:** my web simulation fetches the export code lazily, so a backup needed one earlier online backup to work offline; the installed app has that code on disk.
*Simulated quote:* "No signal, no problem."

### Dorothy Kessler, retired librarian
Picked five bad files (random text, empty, JSON that is not a backup, a newer-version backup, a hand-edited backup) and then a good one.
**Worked:** all five were refused and her plan never changed; the good file offered "Add these profiles?". **Issue:** all five get the same message (finding 7).
*Simulated quote:* "It told me no, and nothing was lost."

## Deterministic checks

Per-behavior specs live in `e2e/journeys/`. Latest runs: 99 passed on both viewports in one sweep. Three checks document known defects: two (hours stranded after Rollover and after Copy last week) are expected to fail until fixed, and one (immediate reload after a delete) is marked fixme because it depends on timing. A few iPhone checks flake when four browsers run at once; they pass alone.

## Untested: native iOS risks

Keyboard covering the add-task field, safe areas and the Dynamic Island, the real share sheet, Files picker and backup/restore, haptics, WKWebView storage eviction, iCloud backup and sync, and real touch drag between days. `scripts/ios-bridge-sim/` covers the app's own logic for backup, restore and sync, and `docs/IOS_RELEASE.md` has the device checklist.

## Rerunning

```bash
npm run export:ios                      # build the bundle (needs a shell where `npx` spawns; works in CI and on macOS/Linux)
npx playwright test e2e/journeys        # everything
node scripts/e2e/coverage.mjs           # rebuild coverage-matrix.md
```

## Rollback

Nothing here changes app code. Delete `e2e/`, `scripts/e2e/`, `user-testing/`, `playwright.config.ts`, `.claude/agents/playwright-test-*.md` and `.mcp.json`, and remove `@playwright/test` from `package.json` and `package-lock.json`.
