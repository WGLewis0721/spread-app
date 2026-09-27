[Live site](https://wglewis0721.github.io/spread-app/)

# Spread

The weekly role spread. Roles first. Hours second. Tasks last.

The editable source lives in this repository. GitHub Pages builds `dist-pages` from it on every push to `main`. Do not edit the compiled files by hand.

```
src/spread/screens        the week screen
src/spread/components     crown, task sheet, week view
src/spread/gestures       swipe, pointer sensors, drop resolution
src/spread/state          store entry
src/lib/spread            week data and actions
src/styles.css
```

Gestures call actions. They do not write week data themselves.

- `changeWeek()`
- `moveSpreadToDay()`
- `moveAllocation()`
- `reorderAllocation()`

A touch holds briefly before a drag. A mouse or pen starts after a short move. A week swipe stays separate and waits while a drag is active.

- Rollover copies this week into next week. The week you leave stays as history. If next week already has tasks or days, Spread asks before replacing it.
- Open a task and add only what you need: Notes, Outline, Table, or Photo. In Notes, a line that starts with I. or A. continues like a Word outline.
- Tap a spread’s color dot to pick another color.
- Week shows Sunday at the top through Monday at the bottom. Turn the crown, or swipe the week, to move.
- The hours on a spread are a bank. The week bubble shows what is left. Adding hours to a day takes from that bank. Taking them off a day puts them back.
- Log out is in More, under appearance. It locks the device. The weeks stay on the device.

Trial key: `SPR-DEMO-2026`

The frozen look before this cleanup is `golden/2026-09-26-watch-crown-build` at `682e49fa4b390d03aafe8b630915c13566836d02`.
