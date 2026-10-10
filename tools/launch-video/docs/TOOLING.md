# Tooling and access

## Reproduce the preserved films

Use a shell, local file access and a browser. Install Node 22 and run `npm ci` in this package; the lockfile pins Remotion 4.0.534 and React 19.2.3. Python 3.13 was used for the local standard-library audio rebuild. The Linux workflow also verifies reconstruction. FFmpeg/ffprobe come from the installed Remotion compositor package; the verification script can fall back to PATH.

The first Remotion render may download its supported Chrome Headless Shell. Allow the normal official runtime download. Reproduction uses local media and requires no Higgsfield account or generation credits. Follow [README](../README.md) for commands and output paths. Keep the package's dependencies separate from the application.

The approved source uses system serif fallback for paper lettering; see [creative direction](CREATIVE.md#picture-and-motion) for the cross-platform limitation. Do not upgrade dependencies or replace fonts as part of exact reproduction.

## Equip another AI tool

Give it this checkout, a shell that can run Node/Python, an actual browser/Studio control surface and the [handoff prompt](AI_HANDOFF.md). Tell it to read the scoped [AGENTS.md](../AGENTS.md). Verify capabilities with a read or local check before claiming access; a skill document does not install a runtime or connect an account.

Use the installed Remotion skills where available, or the official [Remotion Agent Skills](https://www.remotion.dev/docs/ai/skills). The documented install command is `npx skills add remotion-dev/skills`; use the installer’s noninteractive option when required by your environment. Prefer the skills matching the pinned project version. Relevant skills cover markup, Studio, rendering and captions; a docs-only task needs no new generation.

## Generate new narration or fill a visual gap

Connect the user's authorized Higgsfield workspace through the supported connector for the chosen AI client, or use its normal UI. Discover the live tool schemas; exported tool names and parameters may change. The reviewed connector exposed these capabilities on 2026-10-10:

| Capability | Purpose |
| --- | --- |
| `list_voices` | Select a preset when casting is missing; preserve an already selected `voice_id` + `voice_type` pair. |
| `models_search` / `models_get` | Confirm engine availability, supported input and parameters. |
| `generate_audio` | One user-facing take; supports a cost preflight without generation. |
| `generate_audio_batch` | Small indexed sets of independent takes, up to six per submission on the reviewed surface. |
| `jobs_wait` | Retrieve status and actual result URLs from returned job IDs; reviewed maximum wait was 15 seconds. |
| `show_generation_by_ids` | One review display for a completed batch, when that workflow requires it. |

The saved [voice recipes](voice-recipes.json) record actual casting, models and prompts used here. Check availability rather than silently substituting an engine or voice. A regenerated take is a new audition. Follow the current workflow's materialization/download instructions and retain accepted local PCM sources; do not guess provider URLs. Single-generation widgets and completed batch displays have different contracts: avoid duplicate displays or resubmissions after a timeout.

Use only an authorized destination returned by the current connector. Do not copy a previous chat's folder/account identifiers into a new chat. Record budget and payment-choice authorization in the brief, and honor provider choice/approval prompts. Tool access alone is not authorization for unlimited generation, new access grants, merge or public release.

Higgsfield supplied a texture and voice takes in this film. The score was synthesized locally; the reviewed speech tool does not generate music. Exact UI, type, boxes, icons and morphs remain deterministic Remotion work. New generated assets need provenance and applicable rights recorded in the handoff.

## Troubleshoot the layer that failed

| Symptom | First action |
| --- | --- |
| Inventory mismatch | Inspect the changed file. Run `npm run inventory:update` for intended documentation/curated additions; never bless a changed v7 input. |
| Incorrect or missing voice preset | Confirm the selected pair and current engine schema. Keep accepted audio while resolving access. |
| Submission timeout | Save returned job IDs and resolve the original outcome before any retry. |
| Stale Studio composition | Check the exact project/cut, reload deliberately and inspect current errors. A second server needs a distinct port. |
| Chrome target closed | Reduce render concurrency and avoid overlapping heavy renders; inspect the log and rerun only the affected verification. |
| Word clipped despite correct ASR | Listen dry and in the mix, inspect sample boundaries, preserve consonants and replace only the failed join. |
