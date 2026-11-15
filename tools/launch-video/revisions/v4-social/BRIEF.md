# Spread — V4 social commercial: pre-render brief (for approval)

Status: **DRAFT for creative approval. Nothing is rendered. No narration has been generated. No credits spent.**
Preserved: all v7 assets and the V3 export (`revisions/v3-vertical/Spread-Make-the-Hours-Count-V3-vertical.mp4`, sha256 `b9ab94e5…ad0`). PR #251 is not merged.

Format: 1080x1920, 30 fps, 900 frames, native Remotion render. Vector UI, so close-ups stay sharp.
Provenance rule for V4: **only show interactions that exist in the current iOS source** (matrix below). Motion graphics are acceptable for this social cut; a future App Store preview needs real app footage.

## 1. Revised 30-second script (new, shorter narration — same Hallie preset, to be generated only after approval)

| Time | Beat | Narration (words) | On screen |
|---|---|---|---|
| 0–4 | Hook | "Busy all week. Still no room for what matters." (9) | Paper chips pile onto a bar; Work swallows the week. Giant "Family: 0h". |
| 4–10 | Life | "Spread starts with your life. Work. Family. Health. Tap a card to see what's inside." (15) | Paper blocks become the Life cards. Close-up on the stack. Tap Family: it lifts to focus; **Details** and **Tasks** buttons appear; tap Tasks to open the list. |
| 10–17 | Hours | "Give each one real hours. Tap Family, add a few, and watch your week make room." (16) | Tap **Adjust hours**; the strip expands. Extreme close-up on the numbers. Select Family, hold the arrow: 6h → 8h in half-hour steps; the bar segment grows; "available" falls. |
| 17–25 | Week | "Open your week. Set aside an hour for family on Friday, add dinner, and check it off." (17) | Tap Week; pick Friday; tap "+1h Family"; "1 h reserved for Family". Quick-add "Plan dinner"; it lists on Friday; tick it (completion haptic cue); Undo row. |
| 25–30 | Brand + CTA | "Spread. Make the hours count." (5) | Paper returns. Icon, "Spread.", "Make the Hours Count", CTA "Spread for iPhone · thespreadapp.com". |

About 62 words in 30 s, inside a natural pace. Voice: same preset and engine as v7 (ElevenLabs via Higgsfield, preset `10274bf1-…`). Candidate music bar-snaps at 116 BPM (one bar = 2.07 s): cuts at 4.14, 10.34, 16.55, 24.83 s. Cut 3 moves 0.45 s earlier than your 17 s window; your call.

## 2. Narration → interaction map (cause and effect)

| Spoken | Touch | Spread's response | Viewer takeaway |
|---|---|---|---|
| "Work. Family. Health." | none (cards name themselves in time) | Card labels settle one by one | These are your responsibilities |
| "Tap a card to see what's inside." | tap Family | Card lifts into focus; siblings slide away; Details and Tasks buttons appear | One card, its details and tasks |
| "Tap Family" | tap Adjust hours, then the Family segment | Strip expands in place; Family selected | Hours are editable right here |
| "add a few" | hold the right arrow | 6h → 6.5 → 7 → 7.5 → 8; segment widens; total and "available" update each step | Adding time visibly takes it from what's left |
| "Set aside an hour for family on Friday" | tap Week, tap Friday, tap "+1h" | "1 h reserved for Family" on Friday | Hours land on a specific day |
| "add dinner" | type in Task name, tap Add task | "Plan dinner" appears in Friday's list under Family | Tasks sit inside reserved time |
| "check it off" | tap the checkbox | Task completes; Undo/Redo row appears | Done, and reversible |

## 3. Implemented in the current iOS source vs simulated

Verified by reading `ios/SpreadNativeV2` at `HEAD` (merge-base with `main` = 6ddd8ff). **No simulator or device run was possible here**, so "implemented" means "present in source", not "tested on device".

| Interaction | Source evidence | V3 showed | V4 plan |
|---|---|---|---|
| Wallet stack; focus a card | `Life/LifeWalletStack.swift`, `LifeRoot.swift` | yes | yes |
| Details / Tasks buttons on the focused card | `LifeRoot.swift` ~325–345 (Details opens a management sheet; Tasks toggles the list) | partly: V3 showed an inline panel | show the two buttons and the tasks list; Details as a sheet |
| Weekly Time card: hours, "of Yh", bar, "Xh available", "Adjust hours" expands in place | `Life/LifeWeeklyTimeBudget.swift` | yes | yes |
| Per-role budget: select role, then arrow value control in 0.5 h steps; hold repeats | `LifeRoot.swift` ~540–556; `Shell/SpreadArrowControl.swift` | **partly**: V3 showed all four rows with arrows at once, in 1 h steps | one selected role, 0.5 h steps |
| Life/Week toggle; calendar-week navigator | brand board; `Shell/` | yes | yes |
| Week: calendar, selected-day role card "N h reserved for Role", day task list, quick add | `Life/LifeWeekView.swift` | **no**: V3 drew Mon/Wed/Fri day cards | recreate this layout |
| "+1 h of Role on this day" | `LifeWeekView.swift` ~350 | no | show |
| To-place inbox | `LifeWeekView.swift` ~244 (icon + count capsule; opens task rows) | **partly**: V3 drew a labelled tray | icon + count only |
| Drag a task from inbox onto a day | **not found in Life** (Life drags only reorder tasks inside a day; Classic's `WeekSurface` drops tasks onto allocations) | **simulated** | not shown |
| "Hours left" chips per role in Week | **not found** | **simulated** | removed |
| Typed "Purpose" field on a responsibility | **not found** | **simulated** | removed |
| Day "hour bank" squares in Life Week | **not found** (Classic-style) | **simulated** | removed |
| Undo as a floating toast | native shows an Undo/Redo **row** (`LifeRoot.swift` ~698) | simulated | show the row |
| Completing a task | `toggleTask` with completion haptic | yes | yes |
| Plan Ahead sheet | `Life/LifePlanAheadSheet.swift` | not shown | not shown |

## 4. Review of V3 (what was and was not done)

Done: frame-by-frame review of every headline swap (15 fps strips) and keyframe stills at each beat; ffprobe and EBU R128 measurements of the export and its source audio.
**Not done: listening.** There is no audio output and no speech recogniser in this environment. A human listening pass (docs/templates/REVIEW.md) is still outstanding; do not treat V3 as listening-approved.

Problems found:
1. **Headline overlap** at about six swaps (3–4 frames each, ~0.13 s). Fixed as a separate correction: `…V3-vertical-r1.mp4` (original untouched).
2. **Product accuracy overstated.** V3's README said the screens followed "documented behaviour". Section 3 shows several V3 elements (tray drag, hours-left chips, Purpose typing, day hour-bank squares, Undo toast, four simultaneous arrow rows) are not in the current Life build. A correction is appended to the V3 README.
3. **Mix is quiet:** −20.7 LUFS integrated, true peak −5.2 dBFS. Social usually wants about −14 LUFS. The score alone measures −34.6 LUFS, so narration carries almost everything.
4. **Too small to read:** phone width ~644 px of 1080; strip text is ~19 px. V4 needs close-ups.
5. Ending has no official badge (no listing found) — intentional; see section 6.

Export verification: V3 is **1080x1920, 30 fps, 900 frames**, H.264 High @ 4.1, AAC stereo 48 kHz, 30.016 s, sha256 matches the README. It is a native Remotion render, not an upscale. (The "v2" MP4 originally attached to this session was also 1080x1920, not 512x910; the 512x910 file in your notes is a different file.)

## 5. V4 production targets
- Camera as one transform layer on the vector UI: ~1.0× overview, 2–3.2× close-ups on the strip and the Friday card; moves eased, no cuts, no strips.
- Mix target: −14 LUFS integrated, ≤ −1 dBTP; narration ~−16 LUFS, score ducked under speech.
- 9:16 safe zones: keep CTA and key text out of the top ~10% and bottom ~20%.
- No black caption pills. Headlines only, with the overlap fix.

## 6. Decisions needed before any render or spend
1. Approve the script and the narration → interaction map (or edit the words).
2. Approve **new narration generation** and its budget: five short takes (one per beat), same voice preset, retry limit. Not started.
3. CTA wording. No public App Store listing exists for `com.graymatter.spread`, so "Spread for iPhone · thespreadapp.com" stays until the listing is live; then swap in the badge.
4. Bar-snapped cut times (4.14 / 10.34 / 16.55 / 24.83) or your exact 4 / 10 / 17 / 25.
