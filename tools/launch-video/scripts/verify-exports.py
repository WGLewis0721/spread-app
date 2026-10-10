"""Decode both tracked MP4s, inspect their streams, and save portable QA evidence."""
import array
import hashlib
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / "qa"
QA.mkdir(exist_ok=True)


def binary(name):
    suffix = ".exe" if sys.platform == "win32" else ""
    candidates = sorted((ROOT / "node_modules/@remotion").glob("compositor-*/" + name + suffix))
    if candidates:
        return str(candidates[0])
    found = shutil.which(name)
    if not found:
        raise RuntimeError("Install this workspace's dependencies or provide FFmpeg/ffprobe on PATH")
    return found


def run(name, *args):
    result = subprocess.run([binary(name), *map(str, args)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout


manifest = json.loads((ROOT / "ASSETS.json").read_text(encoding="utf-8"))
results = []
for cut in manifest["cuts"]:
    media = ROOT / cut["export"]
    probe = json.loads(run("ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", media))
    video = next(s for s in probe["streams"] if s["codec_type"] == "video")
    audio = next(s for s in probe["streams"] if s["codec_type"] == "audio")
    assert video["codec_name"] == "h264"
    assert (video["width"], video["height"], video["r_frame_rate"]) == (1920, 1080, "30/1")
    assert int(video["nb_read_frames"]) == 900
    assert video["pix_fmt"] == "yuv420p" and video["color_space"] == "bt709" and video["color_range"] == "tv"
    assert audio["codec_name"] == "aac" and audio["channels"] == 2 and int(audio["sample_rate"]) == 48000
    assert 30 <= float(probe["format"]["duration"]) < 30.1
    run("ffmpeg", "-v", "error", "-i", media, "-c:v", "rawvideo", "-c:a", "pcm_s16le", "-f", "null", "-")
    decoded = QA / (cut["voice"] + "-decoded.wav")
    run("ffmpeg", "-v", "error", "-y", "-i", media, "-vn", "-c:a", "pcm_s16le", decoded)
    with wave.open(str(decoded), "rb") as wav:
        samples = array.array("h", wav.readframes(wav.getnframes()))
    if sys.byteorder != "little":
        samples.byteswap()
    peak = max(abs(v) for v in samples) / 32768
    rms = (sum((v / 32768) ** 2 for v in samples) / len(samples)) ** .5
    assert peak < .95 and rms > .02
    seconds = [("opening", 4), ("paper", 15.5), ("product", 26.9), ("ending", 29.6)]
    for label, time in seconds:
        run("ffmpeg", "-v", "error", "-y", "-ss", time, "-i", media, "-frames:v", "1", QA / (cut["voice"] + "-" + label + ".png"))
    digest = hashlib.sha256(media.read_bytes()).hexdigest().upper()
    if cut["voice"] == "Hallie":
        assert digest == manifest["approvedFemaleExportSha256"]
    results.append({"composition": cut["id"], "path": cut["export"], "sha256": digest,
                    "bytes": media.stat().st_size, "durationSeconds": float(probe["format"]["duration"]),
                    "decodedFrames": 900, "allStreamsDecoded": True, "video": "H.264 1080p30 yuv420p BT.709 limited",
                    "audio": "AAC stereo 48kHz", "audioPeak": peak, "audioRms": rms, "passed": True})
(ROOT / "evidence/export-verification.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps(results, indent=2))
