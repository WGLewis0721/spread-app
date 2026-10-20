# Spread persona simulation report

Run on 2026-10-19 against the installed-app web bundle (`npm run export:ios`) with the repo's fake native bridge, a fixed clock (Wed 4 Mar 2026), an empty device per run and no network. Each of the 12 personas ran on **desktop Chromium (1280x800)** and **iPhone 14 WebKit emulation (390x664 CSS px, touch)**: 24 runs, all 24 finished.

**What this is.** Scripted walkthroughs of what a person with that life would plausibly do, driven by Playwright. They are not people. They find friction, broken math and missing features; they cannot tell you whether the app feels good. A few steps failed because of my scripts rather than the app (wrong tab, short timeouts under load). Those are not reported as app bugs. Where a finding comes from a manual probe rather than the persona run, it says so.

**What this is not.** Not real iOS. No WKWebView, keyboard, safe areas, share sheet or haptics. See "Untested".

The one-line "quotes" below are **simulated and invented for this report**. They are not customer feedback and must not be used as testimonials.

Scripts: `e2e/personas/personas.ts` (scenarios) and `e2e/personas/engine.ts` (audit). Raw notes and screenshots: `user-testing/personas/<persona>/` (regenerate with `npx playwright test personas`).

## How the app was tested

- The web build is gated by a server-side beta sign-in. The installed-app build runs the same planner with no sign-in, so the suite uses that bundle.
- Every run also audits: sideways scroll, tap targets under 44pt, "hours planned = hours on days + hours left" per spread, any overbooking message, console errors.
- The hours math audit **passed for every persona on every spread** where all steps completed. No arithmetic defect was found.

## Personas

### 1. Dana Whitfield, physics teacher
**Did:** Renamed Home to Family and Health to "Self (cello)", added Robotics Club, set 10/6/4/3 hours (23 total), added 6 tasks and checked 2 done, put grading on Monday and lab setup on Wednesday, tried to cap grading, then moved 4 open tasks to next week with Review open tasks.
**Worked:** Hour totals correct at every step. Review open tasks listed exactly the 4 unfinished tasks and left the 2 done ones behind. Undo appears after placements.
**Bugs:** *Major (design gap).* No per-day cap. Pressing + on Monday's Work went from 2h to 9h (all remaining hours) with no warning. Grading cannot be capped at 2h.
**Confusing/missing:** Cap per day. "Self" is a rename of Health, not a starter spread.
**Simulated quote:** "I planned the whole week in about five minutes and could see where the hours went."

### 2. Marcus Bell, play director
**Did:** Created Production, removed Work, raised Production to 32h (total 39), dropped Self to 0h, put 8h on Mon-Thu.
**Worked:** Hours and chips update instantly. Desktop run placed all 32h and the Production chip read 0h.
**Bugs:** *Major (design gap).* Self can go to 0h with no prompt, and nothing marks a week where one spread has swallowed everything. Week chips show "Self 0h" in the same style as any other chip.
**Confusing/missing:** No share-of-week view in Week. *(iPhone run: the Wednesday step did not finish, see mobile findings.)*
**Simulated quote:** "Tech week ate everything and Spread let me watch it happen."

### 3. Priya Nair, executive assistant
**Did:** Work 20h across Mon-Wed, a Saturday run, then tried to move Tuesday's Work to Thursday.
**Worked:** Remove and re-add by tapping works; Undo toast appeared on desktop.
**Bugs:** *Major, unconfirmed.* Dragging a spread row from Tuesday to a visible neighbouring day with a synthetic mouse did not move it (row dimmed, no move). I could not tell whether this is the app or the automation, because dnd-kit needs real pointer movement. **Needs a real-device check.**
**Confusing/missing:** The row's "Move" handle is drag-only. There is no tap way to move a day's hours to another day, so a mid-week change costs remove + add + re-set hours.
**Simulated quote:** "When plans change I'd rather tap than drag."

### 4. Coach Tyrone Reeves, football coach
**Did:** Renamed spreads, created Practice (10h), laid out a normal week, used Rollover to start the bye week, edited it, flipped back.
**Worked:** Editing next week did not touch this week. Rollover moves to the next week and is not destructive.
**Bugs:** *Major (design gap).* Rollover copied tasks and hours but **left every day empty**. A normal week's layout must be rebuilt by hand each week (manual probe also confirmed). A second Rollover from next week went on to the week after (Mar 16-22); I could not trigger a replace prompt.
**Confusing/missing:** Copy a week's layout. A "bye week" is just an empty week.
**Simulated quote:** "I just want last week's shape back with one change."

### 5. Elena Voss, grad student
**Did:** Five spreads, 12 small tasks, lab days Tue/Thu, thesis Mon/Wed/Fri, then a lab emergency.
**Worked:** Five spreads and 12 tasks stayed usable and the math held.
**Bugs:** *Minor.* In Week the chip row clips at the right edge with five spreads (Thesis Writing is cut off, Housework hidden); it scrolls sideways but nothing says so. When Lab Runs had 0h left, "Add Lab Runs" is still shown in the normal blue style but did not respond; nothing explains that the hours must be raised first.
**Confusing/missing:** Protecting thesis hours. Nothing shows that the emergency must come out of other time.
**Simulated quote:** "Great until something had to give, then I was on my own."

### 6. Grace Okafor, 2nd grade teacher
**Did:** Added Bakery, Work 14h, 12 conference tasks, tried to place short tasks.
**Worked:** Fast task entry; clear message when a task can't be placed.
**Bugs (manual probe, not the persona run):** *Polish.* Tapping Place before the task's spread is on a day only says "This role isn't on a day yet. Add it to a day first." The days-then-tasks order is not obvious on first use. With 12 tasks the "To place" group starts collapsed, so Place is hidden until the group is opened: about 3 taps per short task.
**Confusing/missing:** Quick "put these 3 tasks on Tuesday".
**Simulated quote:** "Twelve tiny tasks is a lot of tapping."

### 7. Hannah Lindqvist, homesteader
**Did:** 16 chores and lessons across four spreads, marked two done, Rollover.
**Worked:** 16 tasks entered without problems. Rollover carried all 16 tasks to next week, including the two finished ones.
**Bugs:** none found.
**Confusing/missing:** *Missing: repeating tasks.* No repeat option exists. Rollover works as a stand-in, but "Milk goats" would carry over already ticked off if done state is kept; I only verified names.
**Simulated quote:** "I just need milking the goats to come back every week."

### 8. Ravi Menon, hackathon coach
**Did:** Planned this week, next week and the week after with Hack Team at 2h, 5h and 9h.
**Worked:** Weeks are independent: totals read 17, 20 and 24 hours. Month view opens.
**Bugs:** none found.
**Confusing/missing:** Comparing weeks means stepping through them one by one. Month view shows which spreads are on each day but not hours.
**Simulated quote:** "I can see the ramp, but only one week at a time."

### 9. Jaylen Carter, fraternity president
**Did:** Classes 24h, Chapter 14h, Social 16h, Self 3h, then piled everything on Wednesday.
**Worked:** All three chips read 0h left once fully placed, which does signal "fully booked".
**Bugs:** *Major (design gap).* Wednesday held **54 planned hours** and the app showed no warning of any kind. The day card shows no daily total, so a 24h+ day is not visible. Self time (hoops) stayed unplaced at 3h and nothing flagged it.
**Confusing/missing:** Per-day total and an over-24h flag.
**Simulated quote:** "It let me plan 54 hours into one day without a word."

### 10. Renata Alvarez, small claims lawyer
**Did:** Kids week with Family 20h, next week with Family 2h and Work 40h, jumped between them, put a filing on Friday.
**Worked:** Both weeks kept their own hours after repeated jumps. Placing the filing offered Undo.
**Bugs:** none found.
**Confusing/missing:** *Missing:* alternating-week templates; the split must be rebuilt by hand.
**Simulated quote:** "Each week keeps its own numbers, which is what I need."

### 11. Dr. Naomi Feld, couples therapist
**Did:** Clients 24h, Admin right after sessions Mon-Thu, Self (pottery) 8h on Friday/Sunday, then grew Clients to 40h.
**Worked:** Raising Clients did not change Self.
**Bugs:** none found.
**Confusing/missing:** *Missing: locking Self time.* No lock on a day or block, so protection is only her discipline.
**Simulated quote:** "Nothing eats my pottery time, but nothing defends it either."

### 12. Walt Henderson, plumbing business owner
**Did:** Went ten weeks ahead adding trip tasks, opened Month view, returned to this week.
**Worked:** Ten week steps took 140-630ms on desktop and about 0.7-3.1s on the iPhone emulation. Nothing left the device (the fixture fails the test on any outbound request).
**Bugs:** none found. Persistence after reload was **not verified** in this run (my script got stuck in Month view).
**Confusing/missing:** Far-future planning needs one tap per week; there is no jump to a date.
**Simulated quote:** "Planning ten weeks out is a lot of taps, but it stays on my phone."

## Cross-persona findings

### Top 10 issues (ranked)

1. **No overbooking signal anywhere; a day can hold 54 hours.** Jaylen, Dana, Marcus, Naomi. Major.
2. **No way to cap, lock or protect a day or a spread's hours (Self time).** Dana, Marcus, Elena, Naomi. Major.
3. **Rollover copies tasks and hours but not the day layout.** Tyrone (probe confirmed). Major.
4. **Self can be set to 0h with no warning, and a swallowed week looks like any other.** Marcus. Major.
5. **Moving a spread between days is drag-only; automated drag was inconclusive.** Priya. Needs a device check.
6. **Mobile layout: pinned header uses about a third of the iPhone screen in Spread view (more in Week) and the floating dock overlaps the lowest rows and the "New Spread" card.** Every iPhone run; screenshots below.
7. **Small tap targets on iPhone:** the app icon button is 34x34, spread name fields are 26pt tall and the hours buttons 32pt wide, in 7-11 places per run.
8. **Week chips clip at the right edge with 4+ spreads** with no visible hint that they scroll. Elena, Jaylen, Marcus.
9. **Place needs the spread on a day first, and a long To place group starts collapsed.** Grace.
10. **A disabled-looking-normal Add button when a spread has 0h left** (it does not respond and explains nothing). Elena.

Also noted: a 404 for `/__grok/manifest.webmanifest` in the iPhone bundle (WebKit logs it as a console error; `scripts/export-ios.mjs` leaves that manifest link in `dist-ios`), and WebKit logging that it ignores the `interactive-widget` viewport key. Both polish.

### 5 most requested missing features

1. Daily or per-spread hour caps and a warning when a day or the week is overbooked.
2. Protected Self time (lock a block or day).
3. Copy a week's layout forward (not only tasks and hours).
4. Repeating tasks.
5. Move hours between days by tapping, and a side-by-side view of several weeks.

### What the app does best (flier copy)

Spread starts with who you are, not a to-do list. Name your responsibilities, give each some hours, put those hours on real days, and only then add tasks. Your hours add up every time: what you planned, what's on a day and what's left. Each week has its own plan, rollover and Review open tasks pick up what you didn't finish, Undo is one tap away, and it all stays on your phone, with no account and no connection needed.

(Every claim above is behavior the runs observed, apart from "no connection needed", which comes from the app's own status line and the bundle making no outside requests.)

### Screenshots

108 PNGs under `user-testing/personas/<NN-name>/`, named `<desktop-chromium|mobile-webkit>-<n>-<moment>.png`. Per persona: setup, a planned or full week, the scenario moment (overbook, uncapped Monday, next week after rollover, month view and so on), and `stuck-*` captures where a step failed. Full-page week captures show the pinned header floating mid-page; that is a capture artifact, not a defect.

## Untested: native iOS risks

Keyboard covering the add-task field, safe areas and the Dynamic Island, the real share sheet, Files picker and backup/restore, haptics, WKWebView storage eviction, iCloud backup and sync, and real touch drag between days. The existing bridge simulations in `scripts/ios-bridge-sim/` cover the app's own logic for backup, restore and sync, and `docs/IOS_RELEASE.md` has the device checklist.

## Rollback

Nothing here changes app code. To remove it all: delete the `e2e/`, `scripts/e2e/`, `.claude/agents/playwright-test-*.md`, `.mcp.json`, `playwright.config.ts` and `user-testing/` files, and revert the `@playwright/test` line in `package.json` and `package-lock.json`.
