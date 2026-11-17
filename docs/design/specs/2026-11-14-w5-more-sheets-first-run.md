# Spec: More, sheets, first run, empty and error states, copy (W5)

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Save as `docs/design/specs/YYYY-MM-DD-<slug>.md`.

> Summary: audit of the More sheet, the sheets, the first-run and launch flow, empty and error states and copy on a fresh install. Fixes the broken and inconsistent items in those surfaces, records the open items, and lists what another lane or the owner must decide.

| | |
| --- | --- |
| Request | Finalize W5 for App Store publication: More, sheets, first run, empty and error states, copy. Audit as a brand-new user, fix in priority order, record exceptions. |
| Restated | Who: a new iPhone user on a fresh install. Surface: the native SwiftUI app (iPhone only). Make the first run, More, the sheets and every empty, error and undo message plain, specific and honest. |
| Surface | iPhone (1.0 is iPhone only, OD20). iPad and Duo are not in scope for 1.0. |
| Size | M (sheet copy and behavior fixes across five files, plus the audit). |
| Author | Claude Code, 2026-11-14, on branch `claude/w5-more-sheets-first-run`. |
| Status | Draft, In review. Not approved, not merged, not released. |
| Governing docs read | [CLAUDE.md](../../../CLAUDE.md) (via the card); [README.md](../README.md) router; [RULES_CARD.md](../RULES_CARD.md); [PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md); [packs/apple-native-feel.md](../packs/apple-native-feel.md); [DECISIONS.md](../DECISIONS.md) (2026-11-14 OD1 to OD33); [finalize plan](2026-11-14-publish-finalize-plan.md) sections 8 and the copy-voice correction; [native board](../planner/SPREAD_NATIVE_BRAND_BOARD.md) (current owner paragraphs); [ICON_HANDOFF.md](../brand/ICON_HANDOFF.md) sections on app icon and intentional exceptions; [FOUNDATIONAL_UX_PRINCIPLES.md](../FOUNDATIONAL_UX_PRINCIPLES.md); [APPLE_DESIGN_PRINCIPLES.md](../platforms/APPLE_DESIGN_PRINCIPLES.md) (sheets, contrast). Gray Matter library read from `WGLewis0721/Graymattertechllc-` (app-design/README, DESIGN_TO_BUILD_CONTRACT, IOS_PLAYBOOK, UX_REVIEW_AND_SPEC_PROTOCOL, SECURITY_AND_RELEASE, TACTILE_MOTION_AND_DEVICE_QA) for process; Spread's rules win on conflict. |

## 1. Problem

A person installs Spread from TestFlight or the App Store. Nothing explains the app, the first screen is an empty plan, and the first release notes open over that empty plan. They add a responsibility and make a mistake: a save fails, and the sheet closes and takes their typed entries with it. Or they open More and see a section called "Notifications" that holds the Focus timer, and a switch that says "Show Today on widgets" but also quietly turns the Focus timer widget on or off. Words disagree across the app ("Not now", "Colour", "bank", "Nothing to move." after a failure that was not about moving nothing).

## 2. Evidence and context

Code paths read on `main` at 46404e2 (`[Repo]`):

- `Sheets/ManageSheets.swift`: `NewSpreadSheet.save()` dismissed the sheet whether or not `planner.send` succeeded, and `break` on failure left the drafts that had already saved in the form, so a retry added them twice. `CarryOverSheet.move()` set "Nothing to move." for every failure. The Open tasks cancel button read "Not now" (OD33 asks for "Cancel"). `MoreSheet` put Focus timer and the daily reminder under a section called "Notifications". The widget switch read "Show Today on widgets" and its footnote did not name the Focus timer, though `SpreadWidgetShared.swift` says the switch gates the timer mirror (spec section 22). `RoleSheet` said "h left in this week’s bank". The create sheet dimmed Save with a literal `0.4` rather than `Spread.disabledOpacity`.
- `Shell/SpreadLiveRoot.swift`: the launch What's New check ran on every first launch, including a brand-new plan with no responsibilities, because the last-seen key is empty on a fresh install. `emptyPlan` (Classic only; new installs open Life) draws `ChalkMotionArt`.
- `Sheets/WhatsNewSheet.swift`: the release icon used `.font(.system(size: 28))` and a fixed 54 pt frame, and the item numbers used a fixed 28 pt column. These do not follow Dynamic Type.
- `Sheets/ManageSheets.swift` tile icon `.frame(height: 26)` and the What's New row icon `.frame(width: 32)`: fixed sizes that clip at accessibility sizes.
- Notification permission: `Focus/SpreadLocalAlerts.swift` `authorized()` requests permission only when a focus timer with "Notify when done" (default off, `SpreadFocusTimerSheet.swift:14`) is scheduled, or when "Remind me to plan each day" is turned on (`SpreadReminderSettingsSheet`, `SpreadFocusTimerSheet.swift`). Both are in context. Denied paths say "Notifications were not enabled. Check iOS Settings." and "Notifications are disabled in iOS Settings." `[Repo]`
- Live Activity: no switch in More. `SpreadFocusLiveActivityController.swift:102` returns silently when `ActivityAuthorizationInfo().areActivitiesEnabled` is false. `[Repo]`
- Haptics: one light impact on completing a task (`SpreadTheme.swift` light generator; `SpreadHaptics` in `Theme/SpreadTheme.swift`). No in-app switch exists.
- Icon: `Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` is 1024 px RGB with no alpha, and matches `public/icons/app-icon-spread-cards.svg` (#007AFF field, three white cards). Launch colors `LaunchCanvas` and `LaunchInk` have dark variants. `[Repo]`
- Links: no external link exists in native sources. The privacy page is at `public/privacy.html` and its text describes the waitlist and signup, which are suspended. No support address or URL is in the app. `[Repo]`
- Recovery: "Open existing planner" (`SpreadLiveRoot.swift` opening state) calls `openRecovery()` in `ios/App/App/SpreadBridgeViewController.swift`, which shows the suspended web planner. `[Repo]`

Gray Matter's process (`app-design/UX_REVIEW_AND_SPEC_PROTOCOL.md`, `DESIGN_TO_BUILD_CONTRACT.md`): audit before editing, list every state, and fix broken, then inconsistent, then polish. Spread's rules win where they differ. The Gray Matter library names "every state is a token" as a goal; Spread's `Spread.disabledOpacity` already is one.

## 3. Goals, non-goals and budget

- **Goals:** a failed create or move keeps the person's work and says why; no retry creates a duplicate; the More switch and its footnote name what they turn on; the sheets use one voice for verbs and role words; no fixed point size on text in these sheets; What's New does not open over a brand-new plan; the haptic and Dynamic Type decisions are recorded.
- **Non-goals:** no change to what Backup and Restore does; no new feature; no Live Activity switch; no iCloud, sync, cloud or schema changes; no store change; no data migration; no new color, font, material or doodle; no privacy or support link with an invented URL; no release, merge or TestFlight build.
- **Appetite:** one session, one PR, a few files.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| [RULES_CARD.md](../RULES_CARD.md) Look: 44 pt targets | Checked every sheet control. The fixed frames that could clip are now minimums. |
| RULES_CARD Behavior: status never by color alone; every drag has a tap path and Undo | No drag added. The failure messages are text, not color. |
| RULES_CARD Boundaries: task changes through `store.ts` actions; no second store | Sheets still call `planner.send`. Only UI state added (`saveFailure`). |
| RULES_CARD Boundaries: nothing may claim iCloud works | Checked strings in `ios/` and `ReleaseNotes.json`. None found. |
| RULES_CARD Boundaries: do not touch cloud, sync, backup, restore logic, schema, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/` | Not touched. Backup and Restore sheet not edited at all. |
| [brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md) "not Chalk/doodles" for Life; Classic keeps its own rules | Classic empty plan still draws Chalk art. Listed as an owner decision (section 8). |
| [FOUNDATIONAL_UX_PRINCIPLES.md](../FOUNDATIONAL_UX_PRINCIPLES.md): one message per state; a failure must not look like success | Failure messages now stay in the sheet that caused them. |
| DECISIONS OD6 (Done trailing; Cancel leading where it discards a draft), OD22 (copy voice), OD30 (one verb), OD32 (over budget), OD33 (Cancel, Cancel session, title-only empties) | Applied where the file is in this workstream. Other lanes' occurrences are listed in section 5. |
| DECISIONS OD10 (honour system text size) and the completion haptic (OD2, OD31) | Recorded and checked in section 9. |

**Exceptions needed (owner decides, do not assume):** none that add a color, font, material or doodle. Owner items are in section 8.

## 5. Options and the chosen concept

### Options considered

The workstream is a set of targeted corrections, so the options are about where a fix lives.

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| A | Fix copy and states only inside the files this workstream owns; list other lanes' strings as handoffs. | Stays inside the owned files; no merge conflicts with lanes B, C, D. | Some inconsistent words remain until the other lanes land. |
| B | Fix every copy string in the app, including Life, Spread and Focus. | One pass, consistent everywhere. | Touches files owned by other sessions, risks conflicts, and goes beyond the workstream. |

**Chosen:** A. Each lane fixes its own strings in one PR, as the copy-voice correction says. **Rejected:** B, because it crosses other owners' files and the copy-voice correction assigns each lane its own strings.

### Breadboard of the chosen concept

- **Launch:** fresh install, planner opens, a brand-new plan (no responsibilities) marks the current What's New as seen and shows the empty plan. An existing install with unseen notes shows What's New once.
- **Life (default root) and Classic empty plan:** Life shows "No Life areas yet", one sentence, "Add Life" (lane B file, unchanged). Classic shows "Make room for what matters", one sentence, "Add responsibility" (Shell, unchanged).
- **Create sheet (Add Life / Add responsibility):** named drafts, hours and symbol. Save is dimmed by `Spread.disabledOpacity` until a name exists. A failed save keeps the sheet open, keeps every unsaved draft, removes each draft that saved, and shows the store's reason (or "Couldn't save. Your entries are still here.") above Save.
- **More:** sections Appearance, Focus and reminders, Widgets, Profiles, Share this week, Data, About Spread. The Today switch reads "Show Today and Focus timer on widgets" and its footnote says it turns on both widgets.
- **Open tasks:** Cancel (leading), Move N (trailing). A failed move keeps the picks and shows the store's reason in the list.
- **Responsibility sheet:** "h left to place this week" under Hours each week; section "Color and symbol".
- **What's New:** the sparkle icon and item numbers follow the text scale.

### States

Each state is listed in the audit table (section 6). Summary: default, empty, loading, error, offline, first run, Undo, and refused action are described for every surface in the table.

## 6. Platform behavior and the audit

The audit lists every surface reviewed, the state checked, the finding and its status. "Code" means read in source, not run on a device.

| Surface | States checked (code) | Finding | Status |
| --- | --- | --- | --- |
| Launch, opening | Opening, Try again, Open existing planner | "Open existing planner" opens the suspended web planner's recovery path. | Owner decision (section 8) |
| Launch, What's New | First run, updates, dismiss | Opened over a brand-new empty plan. | **Fixed** (guard in `SpreadLiveRoot.swift`) |
| Life empty plan (default) | First run, empty | Heading, one sentence, one action. Copy meets OD22. Lane B file. | OK, no change |
| Classic empty plan | First run, empty | Heading, sentence, "Add responsibility"; Chalk drawing. | Chalk: owner decision |
| Create sheet | Default, empty (Save dimmed), typing, saving, success, failure | Failure dismissed the sheet and lost typed entries; retry duplicated saved rows; Save dimmed with a literal `0.4`. | **Fixed** (failure stays open; saved rows leave; `Spread.disabledOpacity`) |
| Responsibility sheet | Default, placed hours empty, missing role, remove confirm | "bank" jargon; "Colour" spelling. Remove confirm has Cancel. | **Fixed** (copy); confirm OK |
| Open tasks | Empty, selected, failure | "Not now" instead of Cancel; failure said "Nothing to move." | **Fixed** (Cancel; failure reports the store's reason) |
| Profiles | Limit reached footer, remove confirm, rename | Rename failure reverts silently (no success claimed). Remove confirm present. | Known gap, low; recorded |
| More: sections | Grouping | "Notifications" heading held Focus timer and a reminder. | **Fixed** ("Focus and reminders") |
| More: Today switch | On, off, footnote | Label and footnote did not name the Focus timer it also gates. | **Fixed** (label and footnote) |
| More: Life cards switch | On, off, footnote | Footnote accurate; names stay off by default. | OK |
| More: About | Version, What's New | Version row reads from the bundle. No privacy or support row. | Owner decision (section 8) |
| Notifications: reminder | Prompt, denied | Prompt appears on toggle-on, in context. Denied message says where to fix it. | OK, no pre-prompt added |
| Notifications: focus | Prompt, denied | Prompt appears only with "Notify when done" on (default off). Denied message present. | OK |
| Live Activity | Enabled, disabled at the system level | No in-app switch. If iOS has Live Activities off, the session starts with no island and no message. | Handoff, lane D (`Focus/`) |
| Recently Deleted | Loading, error with Try again, empty with sentence, populated, delete-forever confirm | All states present; copy plain; confirm names what cannot be undone. | OK |
| What's New | Empty, populated, history | Empty sentence present. Icon was fixed-size. | **Fixed** (icon and numbers follow text scale) |
| Backup and Restore | Read for copy and layout only | Plain, specific errors ("Nothing was changed"). Opening paragraph is a dense owner-approved disclosure. | Not changed (out of scope); owner review (section 8) |
| Save-failure banner (Shell) | Failure, retry, back up | "Changes are not saved on this device" with Retry saving and Back up. | OK |
| Undo notice (Shell) | Shown for six seconds, tap | "Undo last change", one row. | OK |
| Replace next week? (Shell) | Confirm | Plain; Cancel present; Replace in danger color with text. | OK |
| App icon | Asset | 1024 px RGB, no alpha, matches brand SVG. | OK |
| Launch screen | Light and dark | `LaunchCanvas` and `LaunchInk` have dark variants; "Spread" in system face. | OK |
| Release notes (`Resources/ReleaseNotes.json`) | First run, What's New list | Eight "Recent updates" entries dated 11 to 13 November, for builds never released, would appear under version 1.0. | Owner decision (section 8) |
| Haptics | Completion, edit mode, selection | One light impact on completing a task, as OD2 and OD31 say. | Recorded (section 9) |

**Platform behavior (checked in code only):**

- **Widths:** layouts use `frame(maxWidth:)` caps (More at 620 pt) and stacks at accessibility sizes. Not checked at 390, 820 or 1024 on a device.
- **Dynamic Type:** text uses `Font` text styles. The fixed-size sparkle and the clipping frames are fixed. Accessibility sizes stack the appearance chips and the destination rail (existing code). **Not run at AX sizes.**
- **VoiceOver:** icon-only controls carry labels ("Close navigation", "Remove profile", "Manage profiles", "Remove hours from ..."). Decorative icons are hidden. **Not run with VoiceOver.**
- **Reduce Motion:** no animation was added in this change. Existing sheet presentations are unchanged.
- **Light and dark:** Spread tokens are dynamic. **Not run in either mode.**

## 7. Technical approach

- **Where it lives:** `Sheets/ManageSheets.swift` (create, Open tasks, More, Responsibility), `Sheets/WhatsNewSheet.swift`, `Shell/SpreadLiveRoot.swift` (launch guard only), and a new test `scripts/w5-sheets-first-run.test.mjs`.
- **Data and state:** still `planner.send` actions. New UI state only: `saveFailure` and the existing `status`. No store change, no schema, no migration.
- **Flags and rollout:** no flag. The changes are copy, layout and one launch guard.
- **Launch guard:** on a brand-new plan with an empty last-seen key, the current release is marked seen and the sheet does not open. The `whatsNew = WhatsNewPresentation(notes:)` assignment is unchanged, so `whats-new-launch.test.mjs` still passes.
- **Do not touch:** confirmed none of the Boundaries paths changed. Backup and Restore sheet untouched.
- **Dependencies:** none added.
- **Performance and privacy:** no blur, no animation, no new storage. Nothing leaves the device.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| Privacy policy URL and support contact | App Store requires a privacy policy URL in App Store Connect. The website's `public/privacy.html` describes the waitlist and signup, which are suspended. No support address is in the app. I did not invent URLs or add rows. | Add two About rows only with real URLs; have the landing lane review `privacy.html` for suspended text. | Owner |
| `ReleaseNotes.json` for 1.0 | Eight "Recent updates" entries from builds never released would show as the 1.0 What's New list, including a retired Crown setting. | One 1.0 note in plain words. Lane D owns the file. | Owner, then lane D |
| "Open existing planner" (opening state) | It opens the suspended web planner's recovery. A new user is unlikely to see it, but its name is jargon. | Keep for a planner that will not load; rename to a plain phrase in a later pass. | Owner |
| Classic empty plan Chalk drawing | The brand board retires Chalk for Life. Classic keeps its own rules, so the drawing stays. | Keep in Classic; revisit with the Classic retirement spec. | Owner |
| Live Activity off at the system level | A focus session starts with no island and no message. | Show one line in the focus sheet: "Live Activities are off in iOS Settings." | Lane D (`Focus/`) |
| Widget empty-state copy | `ios/App/SpreadWidget/SpreadTimerWidget.swift:439` says "Turn on Show Today on widgets in More". The More switch now says "Show Today and Focus timer on widgets". `scripts/native-today-widget.test.mjs:231` pins the widget text. | Lane D changes the widget text and that test in one change. | Lane D |
| Other lanes' copy | `Spread/SpreadSurface.swift:704` says "Colour" (also `:465` and `:467`, accessibility label and identifier); the copy-voice correction lists "overbooked" (OD32) and "Delete responsibility" (OD30) in the same file. Those were not re-checked in this session. | Lane C applies OD30, OD32 and the spelling. | Lane C |
| Profile rename failure | Reverts silently rather than saying it did not save. | Low; a one-line message in the next pass. | Lane W5 follow-up |
| Backup disclosure density | The opening paragraph of Backup and Restore is five sentences. It is the owner-approved security disclosure ([widgets, timer and Life cards spec](2026-11-13-widgets-timer-life-cards-continuity.md), section 19). | Leave; owner may shorten. | Owner |
| Unit and UI tests | `NativeContractsTests` and the UI test target were not run here. No test pins the strings changed. | Run on the native checks. | Native checks |

## 9. Verification and full-implementation plan

### Acceptance criteria

- Given a brand-new install with no responsibilities, when the planner opens, then What's New does not open, and the empty plan shows.
- Given a create with two named drafts where the second save fails, when Save runs, then the first draft is gone, the second draft and the sheet remain, and the store's reason shows above Save; tapping Save again adds only the second draft.
- Given Open tasks with picks, when the move fails, then the sheet stays open with the picks and shows the store's reason; Cancel closes it.
- Given More, when the Today switch is shown, then its label names "Focus timer" and its footnote says it turns on both widgets.
- Given a create sheet with no name, then Save is dimmed with `Spread.disabledOpacity`.
- Given What's New at a large text size, then the sparkle and item numbers grow with the text and do not clip.

### Checks

- `node --test scripts/w5-sheets-first-run.test.mjs scripts/whats-new-launch.test.mjs scripts/native-backup.test.mjs scripts/icon-system.test.mjs scripts/native-today-widget.test.mjs` (run here).
- `npm run typecheck`, `npm run lint`, `npm run test:spread`, `npm run test:scripts`, `npm run docs:check` (run here; see the pull request).
- Swift compile: the `native-typecheck` GitHub workflow after the push (owed; the Swift changes were not compiled in this session).

### Full-feature implementation and refinement plan

- **Build location:** the existing app on this branch. No prototype.
- **Complete scope:** the create, Open tasks, More, Responsibility and What's New changes above, plus the spec and decision records.
- **Verification:** the checks above, then the device checks below.
- **Refinement loop:** fix any compile or layout issue found by the native check or on device, in place.
- **Device checks owed:** fresh install at 390 pt (launch, empty plan, first responsibility, first week, first task, first Life card, reminder prompt, focus prompt); create with a forced failure (airplane-mode-style test is not available, so use a planner error path if one exists); More at AX3 text size; VoiceOver on the More switch, Open tasks and the create sheet; Reduce Motion; light and dark; widths 820 and 1024 on iPad (not in 1.0 scope).
- **Questions for the tester:** Do you know what to do first? Does the failure message tell you your entries are still there? Does the Today switch say what it turns on?

## 10. Rollout, rollback and release

Branch `claude/w5-more-sheets-first-run`, one draft pull request into `main`. No flag. Rollback: revert the pull request's commits; no data changes. Release authority stays with the owner. This spec is not approval to merge, release or upload a build.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-14 | No in-app completion-haptic switch. The one light impact follows the system's haptics setting, so a switch would add a control iOS already provides. Reversible by the owner. | Claude Code (W5), for owner review | [DECISIONS.md](../DECISIONS.md) |
| 2026-11-14 | Dynamic Type: native honours the system text size (OD10 confirmed). Fixed point sizes in these sheets removed. Not verified at AX sizes on a device. | Claude Code (W5) | DECISIONS.md (existing row kept) |
| 2026-11-14 | The More switch names the Focus timer it gates. A brand-new plan does not open What's New. A failed create or carry-over keeps its sheet and shows the store's reason. | Claude Code (W5) | [DECISIONS.md](../DECISIONS.md) |
