# Spread — Make the Hours Count — V3 (vertical)

Separate versioned revision. v7 (Hallie/Grady) sources, recordings, score, captions and MP4s are untouched;
`npm run check` (verify, docs, preservation, lint, build) passes with this folder present.

- Entry: `revisions/v3-vertical/index.ts`, composition `SpreadV3Vertical`, 1080x1920, 30 fps, 900 frames.
- Render: `npx remotion render revisions/v3-vertical/index.ts SpreadV3Vertical out/v3.mp4 --codec=h264 --crf=16 --pixel-format=yuv420p --image-format=png --color-space=bt709`
  then re-encode H.264 High @ 4.1 (+faststart) for broad player support. Native render, not an upscale.
- Export: `Spread-Make-the-Hours-Count-V3-vertical.mp4` sha256 `b9ab94e5f8c7d26f45bd49c77be869ddfcc4881994b7b558d46a3b2d0a812ad0`.
- Audio: approved Hallie narration + 116 BPM score, unchanged, timed to captions.json word times. Captions sidecar: `captions.vtt` (copy of v7 Hallie).

## Provenance (read before use)
- Product screens are **code-built motion graphics of documented Spread behaviour** (Life Wallet stack, Weekly Time strip, Week day cards, To place tray, Undo). They are **not native screen recordings** and carry **no native-testing claim**.
- Card artwork: the app's own text-free editorial images (public/assets/v3). All planner data is fictional.
- Touch dots are interface indicators, not hands or people.
- Ending CTA "Spread for iPhone · thespreadapp.com" was written because no public App Store listing was found for com.graymatter.spread. Add the official badge only after the listing is verified live.

## Review status
Technical: renders, decodes cleanly, package check passes. Creative approval, listening review (docs/templates/REVIEW.md), merge and publication are **not** recorded.
Known nit: two headline swaps crossfade ~0.15 s with both lines visible.

## Correction (2026-11-15, after reading the iOS source)
The provenance section above says the screens follow documented Spread behaviour. That overstates it. Checked against `ios/SpreadNativeV2` (source only, no device run), these V3 elements are **not** in the current Life build and were illustrative: dragging a task from the To place tray onto a day, per-role "hours left" chips in Week, typed "Purpose" text on a responsibility, Mon/Wed/Fri day cards with hour-bank squares, an Undo *toast* (native shows an Undo/Redo row), and four role rows with arrows shown at once (native selects one role, then adjusts in 0.5 h steps). V3 is a story-driven concept cut, not an accurate feature demo. See `../v4-social/BRIEF.md` for the full matrix.

Headline overlap (two lines visible for ~0.13 s at about six swaps) is fixed in source; the corrected export is `Spread-Make-the-Hours-Count-V3-vertical-r1.mp4` (the original export is untouched).
