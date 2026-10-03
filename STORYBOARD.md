# Spread waitlist product film

## Purpose

Create a 20-second, silent waitlist film for Spread. Its payoff is a completed week that feels physically manageable: roles have room, hours have a home, and tasks land last. The film must retain Spread’s paper-to-product warmth and local-first calm.

## Product truth to preserve

Spread is a weekly planner designed around **roles first, hours second, tasks last**. It starts from the familiar paper weekly plan and turns it into a polished digital flow. It is local-first and has no account requirement; do not invent collaboration, cloud sync, reminders, AI planning, or calendar integrations.

## Reference grammar

Use [Sunsama’s guided planning and reviews](https://www.sunsama.com/features/guided-planning-and-reviews) as a reference for a calm, guided weekly-planning progression. Keep Spread’s warm paper system, hierarchy, copy, and interaction language distinct.

## Deliverable and placement

- Master: 3840 × 2160, 16:9, 20.0 seconds, 30 fps, ProRes 422 HQ.
- Web: 1440 × 810 muted H.264 MP4 plus WebP poster; under 8 MB.
- Autoplay in view but do not loop; hold the final balanced-week frame and expose replay. The reduced-motion experience is the final poster.
- Use current Spread colors and actual planner UI. This is a planning film, not a productivity-dashboard reel.

## Film sentence

**When you place your roles before your tasks, your whole week has room to breathe.**

## Beat grid

| Time | Picture and motion | On-screen copy | Product proof |
| --- | --- | --- | --- |
| 0:00–0:02.5 | A beautiful but incomplete paper weekly spread sits on the warm canvas: `Work`, `Family`, `Health`, and an empty week grid. No chaotic “overwhelmed” trope. | `Start with what matters.` | The planner begins with roles. |
| 0:02.5–0:05.0 | The role cards lift gently from paper and become Spread’s digital cards. They retain paper fibers/ink edges as they settle. | `Choose your roles.` | Paper-to-product bridge. |
| 0:05.0–0:08.0 | An hour bank is allocated to those roles. Each role gains a proportionate, quiet block; remaining hours stay visibly available. | `Give them real time.` | Hours come before tasks. |
| 0:08.0–0:11.5 | The cards fan into a 2×2 weekly view. One role gets a smaller block, another expands—showing an intentional tradeoff rather than an auto-filled calendar. | `See the shape of your week.` | Weekly allocation stays legible. |
| 0:11.5–0:14.5 | Only now do two task slips enter a task tray and land inside the right role/day. The hour bank updates subtly. | `Then add the tasks.` | Tasks are last; no feature sprawl. |
| 0:14.5–0:17.5 | The camera pulls back to show balance: task tray, roles, hours, and weekly grid coexist on one surface. A small `on this device` note appears discreetly. | `Plan privately. Keep it yours.` | Local-first/no-account truth. |
| 0:17.5–0:20.0 | **Final reward.** The original paper sheet and polished Spread week align edge-to-edge; the digital week is full but breathable and holds in place. | `A little room for what matters.`<br>`Join the beta` | The full balanced-week outcome is the final reveal. |

## Art and motion direction

- Warm paper `#F6F1E7`, ink `#171717`, graphite `#68645D`, blue `#0A84FF`, sage `#DCE6D6`, and peach `#F1DFCF` should appear as functional planner materials, not a generic pastel SaaS gradient.
- Animate one object sequence: paper note → role card → hour block → week cell → task placement. Every move must explain hierarchy.
- Use gentle tactile sounds only in optional audio renders: paper lift, soft placement, a small tick on hour allocation. The web version is silent-first.
- Do not use floating clocks, spinning calendars, productivity mascots, frantic alerts, or endless checkmark bursts. Keep type crisp and the weekly grid readable.

## Required assets before animation

1. Captures of the current role chooser, hour allocation, weekly layout, task tray, and local-first/no-account state.
2. A hand-designed sample week using fictional labels with no personal dates or sensitive content.
3. Spread brand/logo, design tokens, typefaces, paper textures, and the card/2×2 layout components.
4. A final balanced-week composition designed as both end card and reduced-motion poster.

## Honest-demo rules and acceptance test

- Do not imply cloud backup, collaboration, AI suggestions, calendar sync, or notifications.
- The shown number of hours must reconcile visually; tasks may not exceed the allocated role/day time.
- A muted viewer should retain the sequence: roles → hours → week → tasks.
- At 0:19, the completed week must feel like a reward and still let the viewer identify the role, hour, and task layers in under three seconds.

## Implemented production treatment

The final render is a silent 20-second product walkthrough with seven workflow beats, a short Higgsfield materials transition, and a held final UI outcome. Exact UI and copy are deterministic, fixture-based reconstructions of the current components. Native 3840×2160 H.264 masters and 1440×810 web exports are produced by `scripts/film/render.py`; H.264 replaces the proposed ProRes archival format. See `scripts/film/README.md` for reproducible rendering and playback acceptance. The original waitlist form contract remains unchanged.
