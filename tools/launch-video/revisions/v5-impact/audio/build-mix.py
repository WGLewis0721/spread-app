#!/usr/bin/env python3
"""V5 mix: v4 narration + v7 score (ducked) + procedural SFX pinned to the score's real beat grid.
Beat grid: kick(n) = 0.476 + n * 60/116 s (measured from score-116bpm.wav). Deterministic (seeded)."""
import numpy as np, subprocess, sys, os
SR = 48000
ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..")
rng = np.random.default_rng(7)
BEAT = 60 / 116
K = lambda n: 0.476 + n * BEAT
N = int(SR * 30)

def load(path, ch=2):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).reshape(-1, ch)
    out = np.zeros((N, ch), dtype=np.float32); out[: min(N, len(a))] = a[:N]; return out

def place(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(s), 0] += s * l; buf[i:i + len(s), 1] += s * r

def env_exp(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def bandnoise(n, lo, hi):
    w = rng.standard_normal(n); F = np.fft.rfft(w); f = np.fft.rfftfreq(n, 1 / SR)
    F[(f < lo) | (f > hi)] = 0; x = np.fft.irfft(F, n); return x / (np.abs(x).max() + 1e-9)

def boom(dur=1.4, f0=120, f1=34):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 7); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_exp(n, 0.35)
    click = bandnoise(n, 800, 6000) * env_exp(n, 0.02) * 0.6
    air = bandnoise(n, 120, 1500) * env_exp(n, 0.28) * 0.35
    return (body + click + air) * 0.9

def whoosh(dur=0.7, up=True, lo=300, hi=7000):
    n = int(dur * SR); x = bandnoise(n, lo, hi); t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t) ** (1.4 if up else 2.2)
    if not up: env = env[::-1] * np.sin(np.pi * t) ** 0.8
    return x * env * 0.8

def riser(dur):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = np.zeros(n); seg = 12
    for i in range(seg):
        a, b = int(i * n / seg), int((i + 1) * n / seg)
        lo = 200 + 5000 * (i / seg) ** 2; hi = lo * 2.2
        x[a:b] = bandnoise(b - a, lo, min(hi, 20000))
    sw = np.sin(2 * np.pi * np.cumsum(180 + 2400 * t ** 3) / SR) * 0.25
    return (x * 0.7 + sw) * (t ** 2.2) * 0.9

def tick(f=1500, dur=0.09):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * env_exp(n, 0.018) + bandnoise(n, 2000, 9000) * env_exp(n, 0.004) * 0.5) * 0.55

def bell(freqs, dur=0.9, vol=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k, f in enumerate(freqs):
        x += np.sin(2 * np.pi * f * t + k) * env_exp(n, 0.35 / (1 + k * 0.25)) / (1 + k * 0.2)
    return x / len(freqs) * vol * 2

def sparkle(dur=1.1):
    n = int(dur * SR); x = np.zeros(n)
    for k, f in enumerate([2093, 2637, 3136, 3951, 5274]):
        s = int(k * 0.055 * SR); m = n - s
        t = np.arange(m) / SR
        x[s:] += np.sin(2 * np.pi * f * t) * env_exp(m, 0.22) * 0.4
    return x

sfx = np.zeros((N, 2), dtype=np.float32)
ev = []  # (t, name)
# ---- opening: storm -> freeze -> snap-grid -> Spread stamp ----
place(sfx, boom(1.6, 140, 36), 0.00, 0.95); ev.append((0.00, "slam-open"))
place(sfx, riser(2.03), 0.0, 0.55, -0.2); ev.append((0.0, "riser A (storm)"))
for i, t0 in enumerate([0.30, 0.62, 0.95, 1.22, 1.50, 1.74, 1.92]):
    place(sfx, whoosh(0.45 - i * 0.02, True), t0, 0.35 + i * 0.04, [-0.6, 0.5, -0.3, 0.6, -0.5, 0.2, 0][i])
place(sfx, boom(1.8, 100, 30), K(3), 1.0); ev.append((K(3), "FREEZE hit n=3"))
place(sfx, tick(900, 0.2), K(3) + 0.02, 0.5)
place(sfx, riser(K(7) - 3.0), 3.0, 0.8); ev.append((3.0, "riser B (snap prep)"))
for i in range(8):
    t0 = 3.62 + i * 0.06 - i * i * 0.0035
    place(sfx, tick(1100 + i * 140, 0.07), t0, 0.35, (i % 3 - 1) * 0.5)
place(sfx, whoosh(0.55, True, 400, 9000), 3.55, 0.7)
place(sfx, boom(2.0, 130, 32), K(7), 1.0); ev.append((K(7), "SPREAD STAMP n=7"))
place(sfx, sparkle(1.4), K(7) + 0.03, 0.8)
place(sfx, bell([784, 988, 1175], 1.2, 0.4), K(7) + 0.06, 0.6)
# ---- phone assembly / dive ----
place(sfx, whoosh(0.9, True, 300, 6000), K(8) + 0.05, 0.5)
place(sfx, boom(0.9, 90, 40), K(11), 0.5); place(sfx, whoosh(0.5, True, 500, 8000), K(11) - 0.25, 0.5)
# ---- touches ----
taps = {8.47: 1500, 9.62: 1700, 11.58: 1600, 12.47: 1650, 17.15: 1500, 18.92: 1700, 19.7: 1600, 20.5: 1750, 21.6: 1550, 22.57: 1800}
for t0, f in taps.items(): place(sfx, tick(f), t0, 0.7)
for i, t0 in enumerate([13.55, 13.95, 14.30, 14.60]):  # hold-arrow steps, rising pitch
    place(sfx, tick(1300 + i * 220, 0.1), t0, 0.8); place(sfx, bell([880 * 2 ** (i / 12 * 2)], 0.5, 0.3), t0 + 0.01, 0.5)
place(sfx, whoosh(0.7, True, 300, 6000), K(19) - 0.3, 0.55)
place(sfx, boom(0.8, 100, 38), K(19), 0.6); ev.append((K(19), "HOURS punch n=19"))
place(sfx, bell([1047, 1319, 1568], 1.4, 0.5), 23.3, 0.9); ev.append((23.3, "check-off chime"))
place(sfx, whoosh(0.9, True, 300, 7000), K(32) - 0.5, 0.6); place(sfx, boom(0.8, 100, 38), K(32), 0.6); ev.append((K(32), "WEEK punch n=32"))
# ---- finale: riser -> impact -> sparkle (ShotCraft sound sentence) ----
place(sfx, riser(K(48) - 23.6), 23.6, 0.9); ev.append((23.6, "riser C (finale)"))
place(sfx, boom(2.4, 120, 30), K(48), 1.0); ev.append((K(48), "WORDMARK impact n=48"))
place(sfx, sparkle(1.6), 26.28, 0.8); ev.append((26.28, "tagline sparkle"))
place(sfx, bell([784, 988, 1175, 1568], 1.8, 0.45), 27.1, 0.7)

# ---- narration + score ----
nar = load(os.path.join(ROOT, "source-audio/v4/narration-v4.wav"), 2)
score = load(os.path.join(ROOT, "public/assets/hallie-pivot/score-116bpm.wav"), 2) * (10 ** (9 / 20))
t = np.arange(N) / SR
duck = np.ones(N)
# freeze-and-silence: score nearly drops out at the freeze, returns at the snap
def dip(a, b, depth, rel=0.25):
    m = (t >= a) & (t < b); duck[m] = np.minimum(duck[m], depth)
    r = (t >= b) & (t < b + rel); duck[r] = np.minimum(duck[r], depth + (1 - depth) * (t[r] - b) / rel)
dip(K(3), 3.55, 0.08)
dip(K(48) - 0.12, K(48) - 0.01, 0.1, 0.05)
# speech ducking (side-chain-like) from the narration envelope
e = np.abs(nar).mean(axis=1); k = int(0.12 * SR)
env = np.convolve(e, np.ones(k) / k, mode="same"); env = env / (env.max() + 1e-9)
speech = np.clip(env * 6, 0, 1); k2 = int(0.25 * SR); speech = np.convolve(speech, np.ones(k2) / k2, mode="same")
duck *= 1 - 0.62 * np.clip(speech, 0, 1)
score *= duck[:, None]
sfx_duck = 1 - 0.35 * np.clip(speech, 0, 1)
mix = score + nar * 1.0 + sfx * sfx_duck[:, None] * 0.9
peak = np.abs(mix).max()
out = (mix / max(peak, 1e-9) * 0.9).astype(np.float32)
tmp = os.path.join(os.path.dirname(__file__), "_raw.f32")
out.tofile(tmp)
dst = os.path.join(ROOT, "public/assets/v5/mix-v5.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp,
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", "48000", dst], check=True)
os.remove(tmp)
print("wrote", dst)
for tt, nm in sorted(ev): print(f"  {tt:6.3f}s  {nm}")
