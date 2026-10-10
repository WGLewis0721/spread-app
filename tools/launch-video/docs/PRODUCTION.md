# Spread video production playbook

Use this for a developer or an AI tool with access to the repository and production tools. Start by watching the preserved film and reading [creative direction](CREATIVE.md), [the reference gallery](REFERENCE.md) and [lessons learned](LESSONS_LEARNED.md). Access to a model is not evidence of creative quality; listening and picture review remain part of the process.

## Choose the job

| Job | Shortest reliable path |
| --- | --- |
| Reproduce v7 | Use the committed recordings and assets. Follow the [README commands](../README.md#reconstruct-and-verify). No new generation or casting. |
| Revise the Spread film | Complete a [revision brief](templates/REVISION.md). Copy the affected implementation into a separate version; preserve v7. |
| Make another product film at this standard | Reuse this process and quality gates. Establish that product's evidence, story, palette and voice; do not imply its UI or claims are Spread's. |

For a Spread revision, put draft source, brief and review records under `revisions/<version>/`, with a separate Remotion entry point. Give its media unique versioned paths. Keep `src/Composition.tsx` and the frozen v7 inputs intact. Validate the draft's own source and actual export separately; the canonical commands continue to check v7. After approval, promotion is a deliberate PR and version decision, not an inventory refresh.

## Six steps, with an exit condition for each

### 1. Lock the brief and evidence

Record audience, placement, duration, aspect ratio, emotional turn, exact requested changes, approved elements, deliverable and generation budget. Verify the checkout and product implementation. Distinguish real product captures from illustrative motion graphics. Use fictional planner data. The existing films are website/YouTube launch films; an App Store preview needs a separate brief and review of the platform's current requirements.

**Exit:** a completed brief, reference cut, acceptance criteria and permitted changes. Ask only for missing decisions that materially affect the work; continue independent preparation.

### 2. Write the story and six-frame storyboard

Start with useful advice that stands alone. Move through overload → pause → allocation → boxes/purpose/tasks → paper becoming the product → a readable ending. One thought and one focal object per beat. The product should resolve an experience the viewer already recognizes.

Use the [v7 script](CREATIVE.md#locked-v7-script) when reproducing Spread. For a new film, draft concise spoken sentences before animating. A 30-second target is a planning constraint, not permission to rush speech. Match role names, colors, hours, purpose and tasks across the paper and UI states. Establish those values once, then reuse them.

**Exit:** six representative frames and a script the reviewer can understand with and without sound. Confirm real UI accuracy before buying generated assets.

### 3. Audition briefly, then lock the voice

If casting is already selected, keep its exact preset and engine. If new casting is needed, compare a small set on the **same passage** with matched perceived level, natural speed and no music. Use the archived [voice recipes](voice-recipes.json) as the historical starting point. They are not a promise of identical regenerated audio.

Listen for a clear final consonant in “box,” useful sentence breaks, an inviting pivot and personality without whispering or shouting. Separate identity, performance and mix: a new female identity did not by itself fix the earlier flat delivery. Present samples the reviewer can actually play. Lock the accepted recording, voice pair, engine, prompt and job ID.

**Exit:** an accepted playable audition. Keep successful takes; generate only missing or rejected phrases. No full-film rendering to choose a voice.

### 4. Assemble natural narration and time the pictures

Record short semantic sections rather than one forced run-on sentence. Keep breaths, sentence endings and final consonants. Inspect the waveform and listen before shortening quiet regions. Do not use ASR boundaries as sample-exact cuts. Do not speed or pitch-shift the approved voice to make it fit.

For v7, [rebuild-audio.py](../scripts/rebuild-audio.py) and the edit evidence are authoritative. Hallie's measured beat after “So” is 0.455 seconds; the user's ceiling was 0.5 seconds. The intent is an assured “let me show you,” not extra spoken copy. Listen to the pivot in its surrounding sentences, not only in isolation.

Time the paper writing and UI labels to the **actual accepted audio**. Use deterministic Remotion frame timing. Keep separate timing wrappers for different voices. Use SVG/CSS/code for exact text, boxes, icons and the paper-to-product morph. Generate only a confirmed visual gap, such as a texture; generation is unsuitable for precise UI text and controls.

**Exit:** a coherent animatic with complete words, natural sentence cadence, preserved visual continuity and no unsupported product claims.

### 5. Review the complete preview, then export when requested

Listen dry, then with music. Review on headphones and ordinary laptop speakers at a normal level. Energy comes from articulation, rhythm and emphasis; loudness alone does not establish it. Match segment gain without hiding weak performance under compression or music. Preserve the original 116 BPM score for exact v7 reproduction.

Watch once with sound, once muted, and once at a small phone-sized viewing width. Check every phrase-to-picture join, the box consonant, the reveal, readable end-card hold and absence of clipped/overlapping text. Record findings in the [review sheet](templates/REVIEW.md). Correct only the failing interval or layer and compare it with the accepted reference.

**Exit:** no critical creative or technical failures in preview. Render the requested export into a new versioned filename; never overwrite preserved deliverables. [README](../README.md#render) defines v7 encoding settings.

### 6. Verify and hand off

For the preserved package, run:

```sh
npm run inventory:update
npm run check
npm run smoke
python scripts/verify-exports.py
```

The inventory updater refuses drift in the frozen v7 inputs. It updates the current package inventory, not creative approval. Export verification above inspects the **committed v7 films**. For a new revision, apply the same stream/decode/headroom checks to that revision's actual MP4 and save a separate record; passing v7 checks does not verify a draft.

Deliver the actual MP4, caption sidecar, accepted audio sources, exact edits, asset provenance/rights, dependencies, preview instructions, review record and hashes. Open a focused PR. Report technical verification, creative approval and public release status separately. Merge and publication require the user's authorization; the repository's existing deployment automation matters when a merge is authorized.

**Exit:** another person can open the correct cut, reproduce its artifacts and understand every unresolved review item. Use the [AI handoff prompt](AI_HANDOFF.md) when switching tools.

## Keep iteration lean

Make one controlled change per audition or revision. Reuse approved material. Set a bounded retry budget in the brief; after repeated misses, change the direction or script rather than repeating an identical request. Keep a job ledger so a timeout cannot lead to duplicate generation. Measure what can be measured; leave taste and creative approval with the reviewer. Full renders belong after preview decisions or an explicit export request.
