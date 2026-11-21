# Spread — Make the Hours Count — V6 "launch" cut (readability pass on V5)

Vertical 1080x1920, 30 fps, 900 frames, 30.016 s, native Remotion render; H.264 High @ 4.1, AAC 48 kHz, -15.4 LUFS, -1.5 dBTP.
Export: `Spread-Make-the-Hours-Count-V6-launch.mp4` sha256 `256a7418fc9fc6d32f7ea7b41c02f3d8d48a1ee7bf04fdf45177328b5d629967`.
Also: `preview-first-10s.mp4` (the opening alone). Entry `index.ts`, composition `SpreadV6Launch`.
Separate version: V5, V4, V3 and every v7 asset are untouched. No new dependencies. `npm run check` passes. Not merged, not published.
Creative basis (research, three concepts, the Storm -> Freeze -> Snap-Grid selection, beat map): `../v5-impact/CONCEPTS.md`.

## What changed from V5 (all found by reviewing V5 frames at real phone width, 390 px)
| V5 problem | V6 fix |
|---|---|
| "BUSY" was chopped up by chips flying in front of it in the first 1.5 s | hook type and the Family counter are screen-space, in front of the storm, with a paper halo |
| zoomed UI text was soft (3D layer rasterised, then scaled: ShotCraft rule Q2) | phone renders at native resolution through CSS `zoom`; 1:1 crops are sharp |
| key values (FRI 1h, task names, role chips) were ~6-10 px on a phone | tighter close-ups: Life 1.5-1.6x, Hours 1.8x, Friday strip 2.0x, task panel 1.85x |
| Hours relied on small UI digits | giant kinetic "Family this week" readout, bound to the exact value the app control shows (verified frame by frame: 6.5 / 7 / 7.5 / 8h match bar, total and "available") |
| fewer, larger chip labels | 48 chips, 66 px labels |

## Verified
Phone-size review of every beat; 1:1 crispness crops; clean decode; loudness; audio impact peaks land 15-37 ms (about one frame) after the visual hits on beats 0, 3, 7, 11, 19, 32, 48.
**Not done: listening.** No audio output or speech recogniser here. Creative approval, merge and publication are not recorded.

## Provenance
Same as V5: code-built motion graphics of interactions present in the iOS source, not native recordings; Week layout follows owner-supplied screenshots (not committed); fictional data; the app's own editorial art; V4 Hallie narration; procedural beat-locked SFX (`../v5-impact/audio/build-mix.py`, mix `public/assets/v5/mix-v5.wav`). CTA "Spread for iPhone - thespreadapp.com": no App Store badge until a live listing is verified.
