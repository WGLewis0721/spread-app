"""Rebuild both narrations with Python's standard library; no remote voice generation."""
import array
import hashlib
import io
import json
import math
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RATE = 24000
frame = lambda seconds: round(seconds * RATE)


def read(path):
    with wave.open(str(path), "rb") as wav:
        assert (wav.getframerate(), wav.getnchannels(), wav.getsampwidth()) == (RATE, 1, 2)
        samples = array.array("h", wav.readframes(wav.getnframes()))
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def scale(samples, gain, denominator=1):
    return array.array("h", [round(value / denominator * gain) for value in samples])


def save(path, samples, expected=None):
    raw = array.array("h", samples)
    if sys.byteorder != "little":
        raw.byteswap()
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(raw.tobytes())
    data = output.getvalue()
    digest = hashlib.sha256(data).hexdigest().upper()
    if expected:
        assert digest == expected, "Approved narration reconstruction changed"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return digest


def build_female():
    report = json.loads((ROOT / "evidence/female-v6-edit.json").read_text())
    sources = {}
    for cue in report["cues"]:
        name = cue["source"]
        if name not in sources:
            raw = read(ROOT / "source-audio/female" / name)
            normalized = scale(raw, cue["gain"] * 32767, 32768)
            keep = [True] * len(raw)
            for cut in report["removedSilence"]:
                if cut["source"] == name:
                    begin, end = frame(cut["start"]), frame(cut["end"])
                    keep[begin:end] = [False] * (end - begin)
            sources[name] = (normalized, keep)
    track = array.array("h")
    for cue in report["cues"]:
        normalized, keep = sources[cue["source"]]
        start, end = frame(cue["sourceStart"]), frame(cue["sourceEnd"])
        track.extend(v for v, retained in zip(normalized[start:end], keep[start:end]) if retained)
    assert len(track) == RATE * 30
    v7 = json.loads((ROOT / "evidence/female-v7-edit.json").read_text())
    pivot = read(ROOT / "source-audio/female/pivot.wav")
    lead = scale(pivot[:frame(.90)] + pivot[frame(1.89):frame(2.83)], v7["newSourceGain"])
    old_pivot = track[frame(9.59):frame(13.07)]
    revised = lead + old_pivot[frame(1.40):frame(3.04)]
    assert len(revised) == frame(13.07 - 9.59)
    track[frame(9.59):frame(13.07)] = revised
    manifest = json.loads((ROOT / "ASSETS.json").read_text())
    expected = next(a["sha256"] for a in manifest["files"] if a["path"] == "public/assets/hallie-pivot/narration-hallie.wav")
    digest = save(ROOT / "public/assets/hallie-pivot/narration-hallie.wav", track, expected)
    return {"voice": "Hallie", "sha256": digest, "approvedAudioByteIdentical": True}


def active_gain(samples):
    active = []
    for start in range(0, len(samples), 240):
        block = samples[start:start + 240]
        rms = math.sqrt(sum((v / 32768) ** 2 for v in block) / len(block))
        if rms > .02:
            active.extend(block)
    rms = math.sqrt(sum((v / 32768) ** 2 for v in active) / len(active))
    return min(.13443427409124253 / rms, .90 / (max(abs(v) for v in samples) / 32768))


def build_male():
    source = ROOT / "source-audio/male"
    original, pivot_raw, tagline_raw = [read(source / (n + ".wav")) for n in ["grady-original", "pivot", "tagline"]]
    quiet = pivot_raw[frame(.85):frame(1.365)]
    assert math.sqrt(sum((v / 32768) ** 2 for v in quiet) / len(quiet)) < .0005
    assert max(abs(v) for v in quiet) / 32768 < .002
    gains = {"original": active_gain(original), "pivot": active_gain(pivot_raw), "tagline": active_gain(tagline_raw)}
    old, pivot, tagline = [scale(s, gains[n]) for s, n in [(original, "original"), (pivot_raw, "pivot"), (tagline_raw, "tagline")]]
    track = array.array("h", [0]) * (RATE * 30)
    track[:frame(8.7)] = old[:frame(8.7)]
    lead = pivot[frame(.36):frame(.85)] + pivot[frame(1.365):frame(2.45)]
    revised = lead + array.array("h", [0]) * frame(.35) + old[frame(10.29):frame(11.60)]
    assert len(revised) <= frame(3.3)
    track[frame(8.7):frame(8.7) + len(revised)] = revised
    track[frame(12):frame(27.35)] = old[frame(12):frame(27.35)]
    ending = tagline[frame(.60):frame(2.10)]
    track[frame(27.90):frame(27.90) + len(ending)] = ending
    assert len(track) == RATE * 30
    digest = save(ROOT / "public/assets/grady-v7/narration-grady.wav", track)
    report = {"voice": "Grady", "sha256": digest, "durationSeconds": 30,
              "gains": gains, "speechSpeedAndPitchUnchanged": True,
              "pivotRanges": [[.36, .85], [1.365, 2.45]], "removedPivotQuiet": [.85, 1.365],
              "continuationRange": [10.29, 11.60], "pauseBeforeContinuationSeconds": .35,
              "pivotTargetStart": 8.7, "taglineSourceRange": [.60, 2.10], "taglineTargetStart": 27.90,
              "originalContinuousRanges": [[0, 8.7], [12, 27.35]], "peak": max(abs(v) for v in track) / 32768}
    (ROOT / "evidence/male-edit.json").write_text(json.dumps(report, indent=2), encoding="utf-8", newline="\n")
    return report


if __name__ == "__main__":
    requested = sys.argv[1] if len(sys.argv) > 1 else "both"
    assert requested in ("female", "male", "both")
    results = []
    if requested in ("female", "both"):
        results.append(build_female())
    if requested in ("male", "both"):
        results.append(build_male())
    print(json.dumps(results, indent=2))
