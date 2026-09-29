"""Soundtrack for the Notekeeper product film: an original 120 BPM arrangement plus UI sounds.

    py audio.py        -> ../out/demo/film.wav (48 kHz stereo, 84 s)

Reads ../out/demo/sfx.json, written by record.mjs from the interactions it actually
performed. Every UI sound is placed so its measured peak lands on its cue time.

Arrangement (1 bar = 2 s):
  0-6    intro: pad and sparse keys under the three problem lines; riser into the reveal
  6-12   the window appears: half-time kick, bass, light hats
  12-50  full groove through navigation, the card and the notebook
  50-62  breakdown for the canvas: no kick, arpeggiated keys, pad up; riser back in
  62-76  full groove with a bell line: connections, search
  76-84  drums out for the theme change, hero chord on 79 s, ring out
"""
import json
import wave
from pathlib import Path

import numpy as np
from scipy.signal import lfilter

SR = 48_000
OUT = Path(__file__).resolve().parent.parent / "out" / "demo"
cfg = json.loads((OUT / "sfx.json").read_text())
DUR, BEAT = cfg["duration"], cfg["beat"]
BAR = 4 * BEAT
N = int(round(DUR * SR))
rng = np.random.default_rng(7)


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def env(sec, attack=0.002, decay=0.2):
    t = t_(sec)
    return np.clip(t / attack, 0, 1) * np.exp(-t / decay)


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    for _ in range(2):
        x = lfilter([1 - a], [1, -a], x)
    return x


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---------------------------------------------------------------- instruments
def kick():
    t = t_(0.35)
    f = 44 + 90 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.35, 0.001, 0.11) * 0.95


def clap():
    n = rng.standard_normal(int(0.25 * SR))
    burst = sum(np.roll(env(0.25, 0.001, 0.012), int(k * 0.011 * SR)) for k in range(3))
    return highpass(lowpass(n, 2600), 700) * (0.6 * burst + env(0.25, 0.001, 0.07)) * 0.5


def hat(open_=False):
    n = rng.standard_normal(int((0.2 if open_ else 0.06) * SR))
    return highpass(n, 7000) * env(len(n) / SR, 0.0005, 0.05 if open_ else 0.014) * 0.22


def bass(midi, length):
    t = t_(length)
    f = note(midi)
    x = 0.8 * np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return lowpass(x, 600) * env(length, 0.004, length * 0.9) * 0.5


def keys(midis, length, decay=0.55):
    t = t_(length)
    x = np.zeros_like(t)
    for m in midis:
        f = note(m)
        x += np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.25)
    return x / len(midis) * env(length, 0.006, decay) * 0.34


def pad(midis, length):
    t = t_(length)
    x = np.zeros_like(t)
    for m in midis:
        for det in (-0.08, 0.08):
            x += np.sin(2 * np.pi * note(m + det) * t)
    x = lowpass(x / (2 * len(midis)), 1200)
    fade = np.clip(np.minimum(t / 0.35, (length - t) / 0.35), 0, 1)
    return x * fade * 0.11


def bell(midi, length=1.6):
    t = t_(length)
    f = note(midi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.15)
    return x * env(length, 0.002, 0.6) * 0.16


def riser(length):
    t = t_(length)
    n = rng.standard_normal(len(t))
    x = np.zeros_like(t)
    # Sweep the band up by filtering in chunks.
    chunks = 24
    for k in range(chunks):
        i, j = k * len(t) // chunks, (k + 1) * len(t) // chunks
        cut = 500 + 5500 * (k / chunks) ** 2
        x[i:j] = lowpass(n[i:j], cut)
    return x * (t / length) ** 2.2 * 0.12


def boom():
    t = t_(1.6)
    f = 38 + 30 * np.exp(-t / 0.08)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(1.6, 0.002, 0.45) * 0.7


# ---------------------------------------------------------------- arrangement
CHORDS = [  # Am7 - Fmaj7 - Cmaj7 - G6
    (45, [57, 60, 64, 67]),
    (41, [53, 57, 60, 64]),
    (48, [55, 60, 64, 71]),
    (43, [55, 59, 62, 64]),
]
BELLS = [(76, 72), (69, 72), (79, 76), (74, 71)]  # two bell notes per bar, per chord
L = N + 3 * SR
music = np.zeros((2, L))


def add(buf, x, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    j = min(buf.shape[1], i + len(x))
    if i >= buf.shape[1] or j <= i:
        return
    left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:j] += x[: j - i] * gain * left * 1.414
    buf[1, i:j] += x[: j - i] * gain * right * 1.414


K, CL, HT, HO = kick(), clap(), hat(), hat(True)
BARS = int(round(DUR / BAR))
for bar in range(BARS):
    root, tones = CHORDS[bar % 4]
    t0 = bar * BAR
    sec = t0
    intro = sec < 6
    lift = 6 <= sec < 12
    groove = 12 <= sec < 50 or 62 <= sec < 76
    breakdown = 50 <= sec < 62
    outro = sec >= 76

    pad_gain = 1.6 if (intro or breakdown or outro) else 1.0
    if not (outro and sec >= 80):
        add(music, pad(tones, BAR + 0.2), t0, pad_gain)

    if intro:
        add(music, keys(tones, BAR, 0.9), t0, 0.8, -0.1)
        continue
    if outro:
        if sec < 78:
            add(music, keys(tones, BAR, 0.9), t0, 0.7, -0.1)
        continue

    for beat in range(4):
        tb = t0 + beat * BEAT
        if groove or (lift and beat in (0, 2)):
            add(music, K, tb, 0.9)
        if groove and beat in (1, 3):
            add(music, CL, tb, 0.55, 0.1)
        if groove or lift:
            add(music, HT, tb + BEAT / 2, 0.8 if groove else 0.5, 0.35)
        if groove:
            add(music, HT, tb + BEAT * 0.75, 0.35, -0.3)
        if breakdown:
            add(music, HT, tb + BEAT / 2, 0.3, 0.35)
        if not breakdown:
            add(music, bass(root, BEAT * 0.45), tb, 1.0)
            if groove:
                add(music, bass(root + 12, BEAT * 0.3), tb + BEAT / 2, 0.55)
    if groove:
        add(music, HO, t0 + BEAT * 3.5, 0.5, 0.4)
    if breakdown:
        # 8th-note arpeggio, rising through the chord.
        for k in range(8):
            add(music, keys([tones[k % 4] + (12 if k >= 4 else 0)], BEAT * 0.6, 0.3), t0 + k * BEAT / 2, 0.55, 0.25 * (-1) ** k)
        add(music, bass(root, BAR * 0.9), t0, 0.8)
    else:
        add(music, keys(tones, BEAT * 1.4), t0, 1.0, -0.15)
        add(music, keys(tones, BEAT * 1.2), t0 + BEAT * 1.5, 0.75, 0.15)
        add(music, keys(tones[1:], BEAT * 0.9), t0 + BEAT * 2.5, 0.55, -0.1)
    if 62 <= sec < 76:
        a, b = BELLS[bar % 4]
        add(music, bell(a), t0, 1.0, 0.3)
        add(music, bell(b), t0 + BEAT * 2, 0.8, -0.3)

# Transitions
add(music, riser(1.0), 5.0, 1.0)
add(music, boom(), 6.0, 0.8)
add(music, riser(2.0), 60.0, 1.0)
add(music, boom(), 62.0, 0.6)
HERO_T = 79.0
add(music, boom(), HERO_T, 0.7)
add(music, pad([48, 55, 59, 62, 64], 5.0), HERO_T, 2.2)           # Cmaj9, ringing
add(music, keys([48, 55, 59, 64], 5.0, 1.8), HERO_T, 1.1)
for k, m in enumerate((76, 79, 83, 86)):
    add(music, bell(m, 3.0), HERO_T + k * 0.12, 0.9 - k * 0.12, 0.2 * (-1) ** k)

music = music[:, :N]

# ---------------------------------------------------------------- beat check
mono = music[:, 12 * SR : 48 * SR].mean(axis=0)
hop = 480
low = lowpass(mono, 150)
energy = np.array([np.sum(low[i * hop : (i + 1) * hop] ** 2) for i in range(len(low) // hop)])
onset = np.maximum(0, np.diff(energy, prepend=energy[0]))
ac = np.correlate(onset, onset, mode="full")[len(onset) - 1 :]
lo, hi = int(0.3 * SR / hop), int(1.0 * SR / hop)
lag = lo + int(np.argmax(ac[lo:hi]))
print(f"beat grid (groove section): {60 / (lag * hop / SR):.1f} BPM")


# ---------------------------------------------------------------- UI sounds
def click():
    x = np.sin(2 * np.pi * 1850 * t_(0.05)) * env(0.05, 0.0005, 0.006)
    return x + highpass(rng.standard_normal(len(x)), 3000) * env(0.05, 0.0003, 0.002) * 0.6


def tick():
    return np.sin(2 * np.pi * 2600 * t_(0.03)) * env(0.03, 0.0005, 0.004) * 0.6


def keytap():
    # Soft keyboard tap: short filtered noise with a low body.
    n = lowpass(highpass(rng.standard_normal(int(0.04 * SR)), 1200), 5000) * env(0.04, 0.0004, 0.005)
    body = np.sin(2 * np.pi * 420 * t_(0.04)) * env(0.04, 0.0005, 0.008) * 0.4
    return (n + body) * 0.7


def whoosh(length=0.3):
    n = rng.standard_normal(int(length * SR))
    shape = np.sin(np.pi * np.clip(t_(length) / length, 0, 1)) ** 2
    return lowpass(highpass(n, 400), 3500) * shape * 0.12


def pop():
    t = t_(0.12)
    f = 300 + 500 * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.12, 0.001, 0.04) * 0.55


def grab():
    return lowpass(rng.standard_normal(int(0.06 * SR)), 900) * env(0.06, 0.001, 0.015) * 0.5


def toggle():
    return np.concatenate([click(), np.zeros(int(0.035 * SR)), tick()])


SOUNDS = {
    "click": (click(), 0.55), "type": (keytap(), 0.32), "enter": (click(), 0.6), "tick": (tick(), 0.5),
    "grab": (grab(), 0.7), "drop": (grab(), 0.7), "pop": (pop(), 0.7), "toggle": (toggle(), 0.8),
    "whoosh": (whoosh(0.5), 1.0),
}
PEAK = {k: int(np.argmax(np.abs(x))) for k, (x, _) in SOUNDS.items()}

cues = list(cfg["cues"])
cues.append({"t": 6.0, "kind": "whoosh"})
# The theme click gets the two-part toggle sound instead of a plain click.
theme = min((c for c in cues if c["kind"] == "click" and 76.0 <= c["t"] <= 76.8), key=lambda c: c["t"], default=None)
if theme:
    theme["kind"] = "toggle"

ui = np.zeros((2, N))
for c in cues:
    x, gain = SOUNDS[c["kind"]]
    start = int(round(c["t"] * SR)) - PEAK[c["kind"]]
    lo_, hi_ = max(0, start), min(N, start + len(x))
    if hi_ <= lo_:
        continue
    seg = x[lo_ - start : hi_ - start] * gain
    pan = 0.12 * np.sin(c["t"] * 3.1)  # a little movement so repeated sounds don't sit dead-center
    ui[0, lo_:hi_] += seg * (1 - pan)
    ui[1, lo_:hi_] += seg * (1 + pan)

# ---------------------------------------------------------------- mix + master
mix = music * 0.55 + ui * 0.5
fade_in = np.clip(t_(DUR)[:N] / 0.25, 0, 1)
fade_out = np.clip((DUR - t_(DUR)[:N]) / 2.5, 0, 1) ** 1.5
mix *= fade_in * fade_out
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.89 / np.max(np.abs(mix))
pcm = (mix.T * 32767).astype("<i2")
with wave.open(str(OUT / "film.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"{len(cues)} UI sounds placed on their peaks -> out/demo/film.wav ({DUR:.1f}s)")
