# V4 narration ledger (2026-11-16)

Voice: v7 Hallie preset (ElevenLabs via Higgsfield `text2speech_v2`, preset voice `10274bf1-fb93-554f-b59f-d620a920fd36`). New short script; v7 recordings untouched.
Authorization: owner said "Just go and make it" after the V4 brief. Cost: 0.3 credits per take; 6 generations (1 rate-limit failure created no job, 1 deliberate retry of the Life beat) = about 1.8 credits.
Edit: leading/trailing silence trimmed and interior pauses capped at ~0.2–0.3 s with ffmpeg `silenceremove`. No speed or pitch change. ASR is unavailable here: **listening approval is still owed.**

| Beat | Prompt (tags as sent) | Job ID | Raw / trimmed | Placed at |
|---|---|---|---|---|
| 1 hook | [confident] Busy all week. / [short pause] Still no room for what matters. | cb086bfe-09c6-450f-8b9b-f76530d1d6f1 | 4.08 / 3.84 s | 0.10 s |
| 2 life (first try, unused) | …Work. Family. Health. … | 7b4eb8ce-6dbf-4f35-94d6-480e9ee4b448 | 9.52 / 7.18 s | rejected: too long |
| 2b life (used) | [confident] Spread starts with your life. / [short pause] Work, family, health. / [short pause] Tap a card to see what's inside. | a78ebaab-573d-4d8e-b790-daebbc554394 | 8.24 / 6.07 s | 4.10 s |
| 3 hours | [confident] Give each one real hours. / [short pause] Tap Family, add a few, and watch your week make room. | 2f2744ff-3602-413a-8f0b-09d0467f4bd3 | 7.68 / 6.57 s | 10.55 s |
| 4 week | [confident] Open your week. / [short pause] Set aside an hour for family on Friday, add dinner, and check it off. | ec2eb93e-ad87-4d32-bfdb-ea9b2d411332 | 7.20 / 6.15 s | 17.40 s |
| 5 brand | [confident] Spread. / [short pause] Make the hours COUNT! | a4349f17-bae0-420f-afbf-b4fb596ebbf2 | 3.28 / 2.47 s | 25.20 s |

Mix (`public/assets/v4/mix-v4.wav`): narration normalised to about -17 LUFS, v7 `score-116bpm.wav` +9 dB and side-chain ducked under speech, mastered to -14.5 LUFS integrated, -1.5 dBTP.
