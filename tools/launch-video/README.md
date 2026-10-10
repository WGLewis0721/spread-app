# Spread launch film — version 7

Two 30-second landscape motion-graphics films, 1920×1080 at 30fps. Productivity advice leads into handwritten planning and the real Spread interface, ending with **Make the Hours Count** and the official App Store badge. No people or avatars are rendered.

| Cut | Composition | Status | Download |
| --- | --- | --- | --- |
| Female — Hallie | `SpreadHalliePivot` | User-approved version 7; exact source, narration, music, timing and MP4 preserved | [Hallie MP4](deliverables/Spread-Make-the-Hours-Count-Hallie-Pivot-v7.mp4) |
| Male — Grady | `SpreadGrady` | Original selected male voice, with new pivot and matching tagline; timing follows his natural delivery | [Grady MP4](deliverables/Spread-Make-the-Hours-Count-Grady-v7.mp4) |

Hallie's inviting “So” has the approved measured 0.455-second beat. Grady uses the same story and visual art, with a short beat after “So.” The male scene clocks follow his read; both finish at 900 frames. Earlier experiments remain in the original local workspace and are not registered here.

## Fresh checkout

Install Node 22, then run these commands from this directory:

```sh
npm ci
npm run check
npm run dev
```

Studio exposes exactly the two compositions above. The CLI prints the preview URL. All render assets are local: no Higgsfield login, generation credits, original machine paths or external font downloads are needed. This package has its own dependencies; installing it does not change the planner's dependencies.

## Render

```sh
npm run render:female
npm run render:male
```

New MP4s go into ignored `out/`. The tracked files in `deliverables/` remain preserved. Defaults use PNG frames, H.264 CRF18, yuv420p BT.709 limited-range video and AAC192k audio. Existing output files are protected against accidental overwrite. Container duration may be slightly over 30 seconds because of AAC padding.

Caption sidecars are in `public/assets/hallie-pivot/` and `public/assets/grady-v7/`. Captions are optional sidecars, not burned into the film.

## Reconstruct and verify

```sh
python scripts/rebuild-audio.py
npm run verify
npm run smoke
python scripts/verify-exports.py
```

Python reconstruction uses its standard library and the committed original PCM recordings. Hallie's output must match the approved audio hash before it can be written. No voice is regenerated. Smoke rendering covers the opening, paper, product and ending for both cuts; CI runs reconstruction, inventory checks, lint/typecheck, bundle and these renders on Linux. Export verification uses FFmpeg/ffprobe from the installed Remotion compositor package, or from PATH. It decodes both delivered films and checks their streams and audio headroom.

`ASSETS.json` inventories runtime source, fonts, images, audio, source recordings and delivered MP4s with SHA256. It records casting, generation job IDs and asset rights. `evidence/` holds exact edit instructions and media verification. The user-approved Hallie MP4 SHA256 is `ABF16A41C6786A6187786D0B833FBD88A9329940918D9E6D22B9FB9BA83A94AB`.

## Ownership and release

The creative baseline belongs to the user. Engineering owns reproducibility and checks. Preserve the approved female cut; put future creative changes in separate versioned assets and exports. Voice personality remains a listening judgment. The Grady companion has technical verification; do not describe it as separately approved by the user until they review it.

This workspace is separate from the application build and is not linked into the live landing page. Merging repository artifacts does not publish the film on the website or YouTube. Public launch distribution requires release authorization and verified App Store availability. The repository's existing main-branch deployment automation continues to apply.

Rollback: revert the launch-video PR, or retain the committed Hallie cut as the creative baseline. No planner code or storage changes are involved.
