/**
 * Every interactive element of the installed-app build of Spread, written from the source
 * (src/spread/screens/spread-app.tsx and src/spread/components/*). A persona "covers" an element when the
 * recorder (e2e/hit-recorder.js) saw it used during that persona's run. Hits look like
 *   kind|tag[role]|accessible name|ctx=<dialog title or labelled group>
 * Surfaces that do not exist in this build are listed in OUT_OF_SCOPE.
 */
export const BEHAVIORS = {
  create: "Creating a plan",
  allocate: "Allocating time",
  rearrange: "Rearranging a week",
  unfinished: "Handling unfinished tasks",
  recover: "Recovering saved data",
};

const entries = [];
const e = (id, area, element, behavior, match) => entries.push({ id, area, element, behavior, match });

// Header, week crown and navigation
e("nav-home", "Header", "App icon (Spread, home)", "create", /^click\|button\|Spread, home\|/);
e("nav-prev-week", "Week crown", "Previous week", "rearrange", /^click\|button\|Previous week\|/);
e("nav-next-week", "Week crown", "Next week", "rearrange", /^click\|button\|Next week\|/);
e("nav-back-week", "Week crown", "Back to this week", "rearrange", /^click\|button\|Back to this week\|/);
e("nav-arrow-keys", "Week crown", "Left/Right arrow keys change week", "rearrange", /^key\|Arrow(Left|Right)\|(?!button\[tab\])/);
e("nav-swipe-wheel", "Week crown", "Swipe or scroll to change week", "rearrange", /^(swipe|wheel)\|/);
e("tab-spread", "View switcher", "Spread tab", "create", /^click\|button\[tab\]\|Spread\|/);
e("tab-week", "View switcher", "Week tab", "allocate", /^click\|button\[tab\]\|Week\|/);
e("tab-keys", "View switcher", "Arrow keys between Spread and Week tabs", "create", /^key\|Arrow(Left|Right)\|button\[tab\]/);
e("month-open", "Month view", "Month button", "rearrange", /^click\|button\|Month\|/);
e("month-day", "Month view", "A day in the month grid", "rearrange", /^click\|button\|(Today, )?\w+day, [A-Z][a-z]+ \d+\./);
e("month-prev", "Month view", "Previous month", "rearrange", /^click\|button\|Previous month\|/);
e("month-next", "Month view", "Next month", "rearrange", /^click\|button\|Next month\|/);
e("month-back", "Month view", "Back to this month", "rearrange", /^click\|button\|Back to this month\|/);
e("month-to-week", "Month view", "Week button (leave Month)", "rearrange", /^click\|button\|Week\|ctx=$/);
e("dock-edit", "Dock", "Edit", "create", /^click\|button\|Edit\|/);
e("dock-done", "Dock", "Done (leave Edit)", "create", /^click\|button\|Done\|ctx=$/);
e("dock-settings", "Dock", "Settings", "recover", /^click\|button\|Settings\|/);

// Spread view
e("spread-jump", "Hours bar", "Jump to a spread chip", "allocate", /^click\|button\|Jump to .*, \d+ hours?\|/);
e("spread-rollover", "Spread view", "Rollover", "unfinished", /^click\|button\|Rollover\|ctx=$/);
e("spread-review-open", "Spread view", "Review open tasks", "unfinished", /^click\|button\|Review open tasks\|/);
e("review-toggle", "Open tasks sheet", "Tick or untick a task to move", "unfinished", /^click\|[^|]*\[checkbox\]\|(?!Mark )[^|]+\|ctx=Open tasks/);
e("review-not-now", "Open tasks sheet", "Not now", "unfinished", /^click\|button\|Not now\|/);
e("review-move", "Open tasks sheet", "Move N", "unfinished", /^click\|button\|Move \d+\|/);
e("rollover-replace", "Replace next week dialog", "Replace", "unfinished", /^click\|button\|Replace\|/);
e("rollover-cancel", "Replace next week dialog", "Cancel", "unfinished", /^click\|button\|Cancel\|ctx=Replace next week/);
e("spread-color-open", "Spread row", "Color dot", "create", /^click\|button\|Color for .*\|/);
e("spread-color-pick", "Spread row", "Choose a color", "create", /^click\|button\|Use .*\|/);
e("spread-rename", "Spread row", "Rename a spread", "create", /^(input|change)\|input\|.* name\|/);
e("spread-hours-open", "Spread row", "Hours button (Adjust)", "allocate", /^click\|button\|.*, \d+ hours?\. Adjust\|/);
e("spread-hours-dec", "Spread row", "Decrease hours", "allocate", /^click\|button\|Decrease [^|]* hours\|ctx=[^|]* hours$/);
e("spread-hours-inc", "Spread row", "Increase hours", "allocate", /^click\|button\|Increase [^|]* hours\|ctx=[^|]* hours$/);
e("spread-hours-done", "Spread row", "Done adjusting hours", "allocate", /^click\|button\|Done adjusting hours\|/);
e("spread-hide-tasks", "Spread row", "Hide tasks", "create", /^click\|button\|Hide tasks for /);
e("spread-show-tasks", "Spread row", "Show tasks", "create", /^click\|button\|Show tasks for /);
e("task-add-first", "Spread row", "Add a task (empty spread)", "create", /^(input|change)\|input\|What matters most here\?\|/);
e("task-add-next", "Spread row", "Add another task", "create", /^(input|change)\|input\|Add a task\|/);
e("task-add-enter", "Spread row", "Enter adds the task", "create", /^key\|Enter\|input\|(What matters most here\?|Add a task)\|/);
e("task-done", "Task row", "Mark done", "unfinished", /^click\|[^|]*\|Mark done: /);
e("task-undone", "Task row", "Mark not done", "unfinished", /^click\|[^|]*\|Mark not done: /);
e("task-open", "Task row", "Open a task (sheet)", "create", /^[a-z]+\|[^|]*\|[^|]*\|ctx=Task$|^click\|button\|Close\|ctx=Task/);
e("task-not-today", "Task row", "Not today", "rearrange", /^click\|button\|Not today: /);
e("spread-remove", "Edit mode", "Remove a spread", "create", /^click\|button\|Remove (?![^|]* from \w+day)[^|]*\|ctx=$/);
e("spread-remove-confirm", "Edit mode", "Confirm removing a spread", "create", /^click\|button\|Remove\|ctx=Remove /);
e("spread-new-open", "Spread view", "New Spread", "create", /^click\|button\|New Spread/);

// New Spread dialog
e("new-name", "New Spread dialog", "Spread name", "create", /^(input|change)\|input\|(Spread \d+|Parent, shop, study)\|ctx=New Spread/);
e("new-hours-inc", "New Spread dialog", "Increase hours", "create", /^click\|button\|Increase Hours for spread \d+\|/);
e("new-hours-dec", "New Spread dialog", "Decrease hours", "create", /^click\|button\|Decrease Hours for spread \d+\|/);
for (const s of ["Work", "School", "Home", "Health", "Family", "Fitness", "Business", "Project", "Church", "Personal"]) {
  e(`new-symbol-${s.toLowerCase()}`, "New Spread dialog", `Symbol: ${s}`, "create", new RegExp(`^click\\|button\\|${s}\\|ctx=New Spread`));
}
e("new-add-another", "New Spread dialog", "Add another spread", "create", /^click\|button\|Add another spread\|/);
e("new-save", "New Spread dialog", "Save spreads", "create", /^click\|button\|Save spreads\|/);

// Task sheet
e("sheet-close", "Task sheet", "Close", "create", /^click\|button\|Close\|ctx=Task/);
e("sheet-title", "Task sheet", "Rename the task", "create", /^(input|change)\|input\|Task title\|ctx=Task/);
e("sheet-add", "Task sheet", "Add a block", "create", /^click\|button\|Add\|ctx=Task/);
e("sheet-notes", "Task sheet", "Notes block", "create", /^click\|button\|Notes Write\./);
e("sheet-outline", "Task sheet", "Outline block", "create", /^click\|button\|Outline Numbered/);
e("sheet-table", "Task sheet", "Table block", "create", /^click\|button\|Table Rows and columns/);
e("sheet-photo", "Task sheet", "Photo block", "create", /^click\|button\|Photo A picture/);
e("sheet-notes-type", "Task sheet", "Type notes", "create", /^(input|change)\|textarea\|Notes( line \d+)?\|/);
e("sheet-notes-expand", "Task sheet", "Expand notes", "create", /^click\|button\|Expand\|ctx=Task/);
e("sheet-notes-done", "Task sheet", "Done (collapse notes)", "create", /^click\|button\|Done\|ctx=Task/);
e("sheet-block-remove", "Task sheet", "Remove a block", "create", /^click\|button\|Remove\|ctx=Task/);
e("sheet-outline-type", "Task sheet", "Type an outline point", "create", /^(input|change)\|(input|textarea)\|Outline [^|]*\|/);
e("sheet-outline-add", "Task sheet", "Add a point", "create", /^click\|button\|Add a point\|/);
e("sheet-outline-tab", "Task sheet", "Tab indents a point", "create", /^key\|Tab\|textarea\|Outline /);
e("sheet-indent", "Task sheet", "Indent", "create", /^click\|button\|Indent\|/);
e("sheet-outdent", "Task sheet", "Outdent", "create", /^click\|button\|Outdent\|/);
e("sheet-table-cell", "Task sheet", "Type in a table cell", "create", /^(input|change)\|(input|textarea)\|Row \d+, column \d+\|/);
e("sheet-table-row", "Task sheet", "Add row", "create", /^click\|button\|Add row\|/);
e("sheet-table-col", "Task sheet", "Add column", "create", /^click\|button\|Add column\|/);
e("sheet-table-delcol", "Task sheet", "Remove column", "create", /^click\|button\|Remove column\|/);
e("sheet-table-delrow", "Task sheet", "Remove row", "create", /^click\|button\|Remove row \d+\|/);
e("sheet-photo-choose", "Task sheet", "Choose a photo", "create", /^click\|button\|Choose a photo\|/);
e("sheet-photo-file", "Task sheet", "Photo file picked", "create", /^(change|input)\|input\|\|ctx=Task/);
e("sheet-photo-replace", "Task sheet", "Replace photo", "create", /^click\|button\|Replace photo\|/);
e("sheet-delete", "Task sheet", "Delete task", "unfinished", /^click\|button\|Delete task\|/);

// Week view
e("week-chip", "Week view", "Pick a spread chip", "allocate", /^click\|button(\[button\])?\|[^|]+ \d+h\|ctx=$/);
e("week-add-day", "Week view", "Add a spread to a day", "allocate", /^click\|button\|Add (?!\d)[^|]*\|/);
e("week-day-inc", "Week view", "Increase hours on a day", "allocate", /^click\|button\|Increase [^|]* on \w+day\|/);
e("week-day-dec", "Week view", "Decrease hours on a day", "allocate", /^click\|button\|Decrease [^|]* on \w+day\|/);
e("week-day-remove", "Week view", "Remove a spread from a day", "rearrange", /^click\|button\|Remove [^|]* from \w+day\|/);
e("week-drag-spread", "Week view", "Drag a spread to another day", "rearrange", /^drag\|button(\[button\])?\|Move (?!task)/);
e("week-free-time", "Week view", "Free time suggestion", "allocate", /^click\|button\|Add \d+ hours? of /);
e("week-toplace-open", "Week view", "Open a To place group", "rearrange", /^click\|button\|[^|]+ \d+ tasks?\|/);
e("week-place", "Week view", "Place a task", "rearrange", /^click\|button\|Place\|/);
e("week-place-day", "Week view", "Choose a day for a task", "rearrange", /^click\|button\|(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d+h\|/);
e("week-drag-task", "Week view", "Drag a task onto a day", "rearrange", /^drag\|button(\[button\])?\|Move task /);
e("toast-undo", "Toast", "Undo", "rearrange", /^click\|button\|Undo\|/);

// Settings sheet (More)
e("set-profile-add-open", "Settings", "Add profile", "recover", /^click\|button\|Add profile\|/);
e("set-profile-new", "Settings", "Name a new profile", "recover", /^(input|change|key)\|(Enter\|)?input\|New profile\|/);
e("set-profile-add-confirm", "Settings", "Add (confirm a new profile)", "recover", /^click\|button\|Add\|ctx=More/);
e("set-profile-remove-cancel", "Settings", "Cancel removing a profile", "recover", /^click\|button\|Cancel\|ctx=Remove /);
e("key-escape", "Keyboard", "Escape closes a dialog or sheet", "create", /^key\|Escape\|/);
e("set-profile-rename", "Settings", "Rename the open profile", "recover", /^(input|change)\|input\|Profile name\|/);
e("set-profile-switch", "Settings", "Switch profile", "recover", /^click\|button\[option\]\|[^|]+\|ctx=More/);
e("set-profile-remove", "Settings", "Remove a profile", "recover", /^click\|button\|Remove [^|]*\|ctx=More/);
e("set-profile-remove-confirm", "Settings", "Confirm removing a profile", "recover", /^click\|button\|Remove\|ctx=Remove /);
e("set-copy-last", "Settings", "Copy last week", "unfinished", /^click\|button\|Copy last week\|/);
e("set-copy-week", "Settings", "Copy week (text)", "recover", /^click\|button\|Copy week\|/);
e("set-word", "Settings", "Word document", "recover", /^click\|button\|Word document\|/);
e("set-backup", "Settings", "Back Up Spread", "recover", /^click\|button\|Back Up Spread\|/);
e("set-restore", "Settings", "Restore Spread", "recover", /^click\|button\|Restore Spread\|/);
e("set-restore-file", "Settings", "Pick a backup file", "recover", /^(change|input)\|input\|Choose a Spread backup\|/);
e("set-restore-confirm", "Restore dialog", "Restore", "recover", /^click\|button\|(Restore|Add)( \d+)?\|ctx=(Add these profiles\?|Restore this backup\?)/);
e("set-restore-cancel", "Restore dialog", "Cancel", "recover", /^click\|button\|Cancel\|ctx=(Add these profiles\?|Restore this backup\?)/);
e("set-safety-confirm", "Safety copy dialog", "Put everything back / Add as profiles", "recover", /^click\|button\|(Put everything back|Add as profiles)\|ctx=Use this safety copy/);
e("set-safety-open", "Settings", "Restore from a safety copy", "recover", /^click\|button\|Restore from a safety copy\|/);
e("set-safety-pick", "Settings", "Choose a safety copy", "recover", /^click\|button\[listitem\]\|[^|]*\|ctx=More/);
e("set-appear-system", "Settings", "Appearance: System", "create", /^click\|button\[radio\]\|System\|ctx=More/);
e("set-appear-light", "Settings", "Appearance: Light", "create", /^click\|button\[radio\]\|Light\|ctx=More/);
e("set-appear-dark", "Settings", "Appearance: Dark", "create", /^click\|button\[radio\]\|Dark\|ctx=More/);
for (const c of ["Blue", "Indigo", "Purple", "Pink", "Red", "Orange", "Yellow", "Green", "Mint", "Teal", "Cyan", "Brown"]) {
  e(`set-accent-${c.toLowerCase()}`, "Settings", `Accent color: ${c}`, "create", new RegExp(`^click\\|button\\[option\\]\\|${c}\\|ctx=More`));
}
e("set-close", "Settings", "Close", "recover", /^click\|button\|Close\|ctx=More/);

export const INVENTORY = entries;

export const OUT_OF_SCOPE = [
  "Landing page, hero, waitlist form and Light/Dark site switch: web-only, shown before the beta sign-in, not part of the installed-app bundle.",
  "Beta sign-in, password reset and Log out: web only; needs the server-side beta sheet.",
  "iCloud Backup and Sync sheets, first-run backup notice: built behind flags that are off in the shipped configuration (covered by scripts/ios-bridge-sim).",
  "Print / Save PDF: offered only on the web; the installed app does not list it in Settings.",
  "The native share sheet and Files picker themselves: Playwright can observe the call, not the OS UI.",
];
