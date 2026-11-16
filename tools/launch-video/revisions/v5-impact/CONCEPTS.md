# V5 "impact" cut — research, three opening concepts, selection

Separate version. V4, V3 and every v7 asset are untouched. Not merged, not published.

## 1. What `ai-video-unified` actually is, and what was used
`WGLewis0721/ai-video-unified` is a **documentation index** (README + 4 docs, 240 KB, no skills or code). Its value is the repos it recommends. Cloned read-only (public) under `/home/user/refs/` and actually read:

| Repo | Used for |
|---|---|
| Vincentwei1021/video-shotcraft (150 shot recipes, aesthetic rules R/Q/S/C/P) | exploded-view + **drone-dive-landing** (perspective 2400, 82/18 dive-then-cushion curve, motion blur), **crash-zoom-punch**, **deck-deal-flyin** (hard-accelerating deal, physical metaphor), **speed-ramp-freeze** (freeze + shutter-flash signal), **outro-group-photo-launch** (crane, stage light, gold dust), **riser -> impact -> sparkle** sound sentence, R2 (acceleration), R4 (full-frame impacts <= 3), Q4 (one glint), Q7 (object close-up with orbit + depth), Q8 (launch "group photo" ending), beat grid `beatF(n)` method |
| lemomo-ai/lemo-opuscar (99 film styles + DIRECTOR.md) | director method (hook inside 3 s, one **native move** at the peak, sound/rhythm/camera before looks); `dark-keynote` (accumulation -> **freeze + silence** -> one action -> everything snaps to a grid -> light reveal; UI spawns on notes); `text-flash-cuts` (burst hook, 6-frame glyph slams, cuts on the beat grid); `glass-product` / `teardown` (exploded view, parallax) |
| yihui-dev/awesome-opus5-5-videos, joeseesun/opus-video-prompts | prompt-pack scan: confirmed code-rendered launch films and the "punchy" brief style; no code reused |
| Installed Remotion skills (`remotion-video`, `motion-effects`) | frame-driven motion rules, `Easing`/`interpolate`, `@remotion/motion-blur`; motion-effects lessons (one object changing shape, ghost of the start state, stagger by a beat) |

Where the library and this brief disagree: ShotCraft's judgments ("always slow down", hold >= 1 s) come from calmer product films. This brief wants speed, so I used its **grammar** (acceleration, physical metaphor, beat-lock, sound sentence, slam budget) and not its pacing defaults. R4 is kept: only three full-frame impacts (0.00, 2.03, 4.10).

## 2. Analysis of the V4 opening (0-10 s)
Seconds 0-4: type on paper and a bar; chips drop politely, nothing that stops a scroll. 4-5: a circular reveal. Spread is not recognisable until ~5 s. The first genuinely impressive frame is the camera push at ~7.9 s. Measured against the brief: too slow, no hook before 1-2 s, typography does the work the animation should do.

## 3. Three opening concepts
**A. Drone Dive** (ShotCraft drone-dive + exploded view). Top-down over a paper week; the sheet explodes along Z into layers, the camera dives into one layer, which becomes a Life card. + spectacular depth, Apple-teardown language. - the product only appears at ~4 s; "chaos" is quiet, so the problem reads late.

**B. Storm -> Freeze -> Snap-Grid** (Lemo dark-keynote + ShotCraft deck-deal, speed-ramp-freeze, crash-zoom). Frame 0: a 3D storm of paper commitments hurtles at the camera as giant type slams. The world **freezes on beat 3** (shutter flash, score drops out), the camera orbits the frozen chaos in bullet time while "Still no room for what matters" hangs in the space, then **one action**: everything fires into the four Life cards, hard-accelerating, and **Spread stamps on beat 7** with shockwave, light rays and the icon. A phone assembles around the stack. + hook at frame 0; the problem is felt, not explained; the order-out-of-chaos move IS the product; Spread is recognised at 4.1 s; the dive into real functionality follows at once. - densest to build (3D chips, motion blur, orbit).

**C. Flash-Card Tunnel** (Lemo text-flash-cuts + glass-product light sweep). A one-point tunnel burst, six-frame single-word slams cut on the beat grid, silence, then the phone smashes in under a light sweep. + very punchy typography. - almost no product until ~5 s; leans on text, which is exactly the V4 weakness.

**Selected: B.** Scored on excitement (A 3, B 5, C 4), immediate comprehension (A 3, B 5, C 3), memorability (A 4, B 5, C 3). B also lands the product logo by 4.1 s and puts the first real interaction inside 10 s.

## 4. Beat map (measured from `score-116bpm.wav`; kick(n) = 0.476 + n x 0.5172 s)
0.00 slam / storm | 2.03 (n=3) FREEZE | 3.55 un-freeze, snap flight | 4.10 (n=7) cards land + STAMP | 10.30 (n=19) Hours | 17.03 (n=32) flip to Week | 25.30 (n=48) wordmark impact.
