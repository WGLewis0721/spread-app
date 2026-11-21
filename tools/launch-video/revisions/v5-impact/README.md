# Spread — Make the Hours Count — V5 "impact" cut

Vertical 1080x1920, 30 fps, 900 frames, 30.016 s, native Remotion render (not an upscale); H.264 High @ 4.1, AAC stereo 48 kHz, -15.4 LUFS, -1.5 dBTP.
Export: `Spread-Make-the-Hours-Count-V5-impact.mp4` sha256 `712da506f051103934206845338467266dba80ec14e418caed7c84e33ae682cf`.
Separate version: V4, V3/r1 and every v7 asset are untouched; no new dependencies. Not merged, not published.
Research, three opening concepts and the selection: `CONCEPTS.md`. `npm run check` (verify, docs, preservation, lint, build) passes with this folder present.

## Structure (beat grid measured from the v7 score: kick(n) = 0.476 + n x 0.5172 s)
| Time | Beat |
|---|---|
| 0.00 | STORM: frame 0 is already a 3D storm of paper commitments with giant slammed type (impact 1 of 3) |
| 2.03 (n=3) | FREEZE: shutter flash, score drops out, bullet-time orbit; "Still no room for what matters" (impact 2) |
| 3.55-4.10 | SNAP: every chip fires into the four Life cards, hard-accelerating |
| 4.10 (n=7) | STAMP: cards land, shockwave + rays, Spread icon stamps (impact 3); phone assembles around the stack |
| 6.17 (n=11) | crash-zoom into the stack; Family focus, Details/Tasks |
| 10.30 (n=19) | Hours: hold the arrow 6h -> 8h in 0.5 h steps, bar / total / "available" respond, +0.5h pops |
| 17.03 (n=32) | 3D flip Life -> Week; month grid -> Friday -> +1h Family -> task -> check off -> Undo/Redo row |
| 25.30 (n=48) | launch-event group photo (crane, stage light, gold dust), letter-by-letter wordmark stamp, CTA |

## Provenance (read before use)
- Product screens are **code-built motion graphics, not native recordings**; no native-testing claim. Interactions are limited to what the iOS source contains; the Week screen layout (month grid, day view with +1h circles, Mon-Sun strip on the card) follows owner-supplied native screenshots, which are **not** committed (personal data). Embellishments that are not app functions: touch dots, "+0.5h" pops, glows.
- Card artwork: the app's own text-free editorial images. Planner data is fictional.
- Narration: the V4 Hallie takes (ledger in `../../source-audio/v4/LEDGER.md`). SFX are procedural (`audio/build-mix.py`), pinned to the measured beat grid; mix `public/assets/v5/mix-v5.wav`.
- CTA "Spread for iPhone - thespreadapp.com": no public App Store listing was found for com.graymatter.spread, so no badge. Add the official badge only after the listing is verified live.
- Render note: intermediates are JPEG at concurrency 2; PNG at higher concurrency stalled on the grain layer. Real motion blur was too slow in software rendering and was replaced by trailing ghosts.

## Review status
Measured: 1080x1920/30 fps/900 frames, clean decode, loudness, audio impact peaks vs picture events (within 7 ms of beats 0, 3, 7, 11), frame-by-frame review of the opening and every beat.
**Not done: listening review.** No audio output or speech recogniser here, so mix balance, SFX taste and narration/impact clashes are unverified by ear. Creative approval, merge and publication are not recorded.
Known limits: no real motion blur; motion graphics, not app footage (a future App Store preview needs real capture).
