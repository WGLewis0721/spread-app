# Spread — Make the Hours Count — V4 social cut

Vertical 1080x1920, 30 fps, 900 frames, 30.016 s, native Remotion render (not an upscale). H.264 High @ 4.1, AAC stereo 48 kHz.
Export: `Spread-Make-the-Hours-Count-V4-social.mp4` sha256 `4f7fe6c557815d80204b517311e67f55c1323c02c1ae9c506299730b659ef17d`.
Entry: `index.ts`, composition `SpreadV4Social`. v7 and V3 (and V3 r1) are untouched.

Approval: owner approved the brief ("Just go and make it", 2026-11-16) incl. new narration generation. Windows used: 4 / 10 / 17 / 25 s (not bar-snapped).

## What it shows (all verified against the iOS source, not run on a device)
Hook (paper) -> Life Wallet stack, tap Family, Details/Tasks buttons, task list -> Weekly Time: Adjust hours, select Family, hold the arrow 6h -> 8h in 0.5 h steps with bar, total and "available" responding -> Week: pick Friday, "Plan 1 hour of Family", "1 h reserved for Friday", quick-add "Plan dinner", check it off, Undo/Redo row -> brand end card.

## Provenance (read before use)
- Product screens are **code-built motion graphics, not native recordings**; no native-testing claim. A future App Store preview needs real app footage.
- Card artwork: the app's own text-free editorial images. Planner data is fictional. Touch dots are indicators, not hands.
- Narration: new short takes, v7 Hallie preset; ledger with job IDs in `../../source-audio/v4/LEDGER.md`. About 1.8 credits spent.
- Mix `public/assets/v4/mix-v4.wav`: v7 score ducked under speech, **-14.5 LUFS, -1.5 dBTP**.
- Ending CTA "Spread for iPhone · thespreadapp.com": no public App Store listing was found for com.graymatter.spread, so no badge. Swap in the official badge only after the listing is verified.

## Review status
Technical: renders, decodes cleanly, loudness measured, headline swaps and chip/headline layering checked frame by frame, `npm run check` run on V3 earlier.
**Not done: listening review.** No audio output or speech recogniser here, so pronunciation, expression, pacing and the pause trimming (interior pauses capped ~0.2–0.3 s) are unverified by ear. Creative approval, merge and publication are not recorded.
