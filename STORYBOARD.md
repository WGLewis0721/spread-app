# Spread — Waitlist Promo Video Storyboard

Replaces the current 4s silent Higgsfield loop in the landing page waitlist section (`src/spread/components/landing-waitlist.tsx`). Target: the paper-to-app story that `DESIGN.md` already describes in words — this video is that document, animated.

## The one thing this video proves

**Spread turns the mess of "everything I'm responsible for" into a calm, physical-feeling week you build by hand — roles first, hours second, tasks last.** The emotional arc: scattered responsibility → deliberate ordering → a complete, satisfying week laid out like dealt cards. The reward is the fully-built week board, lit like a finished tabletop layout — tactile, calm, *done*.

Tone: warm paper becoming a polished digital product (this is DESIGN.md's own language — follow it literally). Tactile, physical, unhurried. This is the one app in the set where slow, satisfying object-motion (not speed) is the entire brand.

## Production note (read first)

Generative video cannot render legible app UI, task text, or the week grid accurately. **Split the work:**

- **Real screen capture** for every shot of the actual spread-card stack, the 2×2 week deal, drag-onto-spread gestures, and the finished week board — Spread's own DESIGN.md hero sequence (cards dealing into a week, tasks dragged from a tray) already exists as real product motion; capture it directly rather than recreating it.
- **Higgsfield-generated b-roll** only for the physical paper material in the opening beat (real or generated paper/card textures, warm light) and the paper-to-pixel dissolve transition.
- Palette is already exact and documented — do not deviate: paper `#F6F1E7`, ink `#171717`, graphite `#68645D`, Spread blue `#0A84FF`, sage `#DCE6D6`, peach `#F1DFCF`.

## Reference videos

1. **Things 3 App Store trailer** — the most-cited tactile-UI motion video in consumer software; cards and checkmarks move with real physical weight and satisfying snap. Borrow directly: the "object settles into place with a tiny overshoot" timing for every spread-card.
2. **Notion Calendar launch films** — calm, confident weekly-planning visuals, soft color blocking, time laid out as physical space. Borrow: the way a week is shown as a literal grid you can see "fill up."
3. **Sunsama product videos** — the ritual of "planning your day/week" shown as a deliberate, almost meditative act rather than a productivity-hack speed-run. Borrow: the unhurried pacing — Spread is the opposite of a "hustle" planner video.
4. **Apple Reminders/Calendar WWDC-style spots** — clean, physical-feeling drag-and-drop motion with soft shadows and real depth. Borrow: the drag-and-drop shadow/depth treatment for the task-onto-spread gesture.
5. **Moleskine / paper-goods brand films** (the genre of ad that sells a physical notebook as a feeling) — warm desk light, paper grain, the tactile pleasure of a physical planning object. Borrow: this is the exact emotional register for Spread's opening beat, since the product's whole pitch is paper-becoming-app.

## Spec sheet

- Length: 18–22s hero cut; seamless 4–6s loop cutdown for the homepage slot.
- Resolution: 1920×1080 min, H.264 mp4 + webp poster matching `public/waitlist/spread-*` naming.
- No voiceover; captions/on-screen text only.
- Light mode treatment for this cut (paper `#F6F1E7` background) since the warm paper story is the hook — a dark-mode variant can be a later cutdown.
- Loop seam: end on the same warm-paper-with-scattered-cards composition the video opens on.

## Storyboard

| # | Time | Visual | Motion / camera | On-screen text | Why |
|---|---|---|---|---|---|
| 1 | 0:00–0:03 | Warm desk-top shot: loose paper cards scattered on a `#F6F1E7` paper surface, soft natural light, a pen nearby | Slow, close dolly, shallow depth of field | — | Establishes the literal paper origin the whole product narrative is built on |
| 2 | 0:03–0:06 | Higgsfield b-roll transition: the paper cards dissolve/morph into the app's own stack-of-spread-cards icon (the real hero object from DESIGN.md) | Smooth dissolve, warm-to-digital color grade shift | — | This single transition *is* the product's tagline, visualized |
| 3 | 0:06–0:10 | Real screen capture: the app icon's card stack deals itself into a 2×2 week (DESIGN.md's existing hero interaction) | Camera holds; motion is the real captured deal animation, unsped | — | Use the product's own signature motion — it's already designed for exactly this |
| 4 | 0:10–0:13 | Real screen capture: a task waits in the tray, gets dragged onto a spread with real drop-shadow/depth, snaps into place | Drag gesture captured at real speed, snap-to-rest with slight overshoot (Things 3 timing) | — | The core interaction — tasks follow roles and hours, never the other way around |
| 5 | 0:13–0:16 | Real screen capture: quick cuts — the week bubble showing hours-remaining ticks down as hours are allocated, a color-dot spread gets recolored | Snappy but still unhurried cuts, each held just long enough to read | — | Shows the "hours are a bank" mechanic without over-explaining it |
| 6 | 0:16–0:19 (**the reward**) | Real screen capture: pull back to reveal the *entire* week fully built — every day populated, colors set, tasks placed — lit warmly like a finished tabletop spread of cards | Slow pull-back/crane-up revealing the whole board at once, soft warm light bloom | **"Roles first. Hours second. Tasks last."** | The reward is simply *seeing the whole week complete* — calm, satisfying, nothing left undone. No confetti; the satisfaction is visual completeness itself |
| 7 | 0:19–0:22 | Settle on the Spread wordmark over the paper palette, the scattered cards from Scene 1 now visible as tiny, calm, resolved shapes in the background | Static hold | **"Your week, dealt out by hand. Join the beta."** | Matches the live CTA; echoes Scene 1's paper texture for the loop seam |

## Reward design note

Spread's reward is unique among these five apps: it's not a number going up or a connection being made — it's simply *order achieved*. The camera pulling back to reveal the finished week (Scene 6) is the entire emotional payoff. Hold that shot a beat longer than feels necessary; the stillness is the point, consistent with Sunsama's unhurried pacing rather than a dopamine spike.

## Higgsfield production guidance

- Use **generate_video** for Scene 2's paper-card-to-app-icon morph only — prompt for "loose paper cards on warm cream paper dissolving into a clean stacked card icon, soft natural desk light transitioning to crisp digital light, palette: warm cream, soft blue accent, no text, no logos, calm slow dissolve."
- Do not attempt to generate the week grid, task text, or color-dot UI — capture these directly from the real app, since DESIGN.md confirms this exact hero motion already exists in product.
- If real card/paper footage is available instead of generated b-roll for Scene 1, prefer it — tactile authenticity matters more for Spread than for any other app in this set.
