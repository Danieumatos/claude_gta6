"""Trilha synthwave gerada por código: sem samples nem direitos de terceiros, igual a cada execução.

Uso: python3 scripts/musica.py <saida.wav> <segundos> [bpm]

Camadas: bumbo, caixa com reverb, chimbal, baixo em semicolcheias com sidechain do bumbo,
pad de acordes desafinados, arpejo com eco pontuado. Progressão Lá menor – Fá – Dó – Sol.
"""
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 48000
out_path, seconds = sys.argv[1], float(sys.argv[2])
BPM = float(sys.argv[3]) if len(sys.argv) > 3 else 104.0
beat = 60.0 / BPM
n_total = int(seconds * SR)
rng = np.random.default_rng(6)


def lp(x, hz, order=2):
    b, a = butter(order, hz / (SR / 2), 'low')
    return lfilter(b, a, x)


def hp(x, hz, order=2):
    b, a = butter(order, hz / (SR / 2), 'high')
    return lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return lfilter(b, a, x)


def env(n, attack=0.005, decay=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    ph = (t * freq * (1 + detune)) % 1.0
    return 2 * ph - 1


def note(name_midi):
    return 440.0 * 2 ** ((name_midi - 69) / 12)


def place(track, sig, start_s, gain=1.0):
    i = int(start_s * SR)
    if i >= len(track):
        return
    j = min(len(track), i + len(sig))
    track[i:j] += sig[: j - i] * gain


# acordes (MIDI): Am, F, C, G — um por compasso
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [45, 41, 48, 43]
bars = int(np.ceil(seconds / (4 * beat))) + 1

kick = np.zeros(n_total)
snare = np.zeros(n_total)
hats = np.zeros(n_total)
bass = np.zeros(n_total)
pad = np.zeros(n_total)
arp = np.zeros(n_total)
side = np.ones(n_total)  # envelope de sidechain (abaixa baixo e pad a cada bumbo)

# --- sons de bateria
kn = int(0.45 * SR)
tk = np.arange(kn) / SR
k_freq = 48 + 110 * np.exp(-tk * 28)
k_sig = np.sin(2 * np.pi * np.cumsum(k_freq) / SR) * np.exp(-tk * 7) + 0.25 * np.exp(-tk * 90) * rng.standard_normal(kn) * 0.3
sn = int(0.35 * SR)
ts = np.arange(sn) / SR
s_sig = bp(rng.standard_normal(sn), 1200, 7000) * np.exp(-ts * 14) * 0.9 + np.sin(2 * np.pi * 190 * ts) * np.exp(-ts * 22) * 0.5
hn = int(0.06 * SR)
h_sig = hp(rng.standard_normal(hn), 8000) * env(hn, 0.001, 0.018)
duck_n = int(beat * SR)
duck = 1 - 0.65 * np.exp(-np.arange(duck_n) / SR / 0.11)

for bar in range(bars):
    t0 = bar * 4 * beat
    chord, root = CHORDS[bar % 4], ROOTS[bar % 4]
    for b in range(4):
        tb = t0 + b * beat
        place(kick, k_sig, tb)
        i = int(tb * SR)
        if i < n_total:
            j = min(n_total, i + duck_n)
            side[i:j] = np.minimum(side[i:j], duck[: j - i])
        if b in (1, 3):
            place(snare, s_sig, tb)
        for e in range(2):
            place(hats, h_sig, tb + e * beat / 2, 0.55 if e else 0.35)
    # baixo: semicolcheias alternando oitava
    step = beat / 4
    for s in range(16):
        f = note(root + (12 if s % 2 else 0))
        n = int(step * SR * 0.92)
        sig = lp(saw(f, n) + saw(f, n, 0.004), 900) * env(n, 0.003, 0.09)
        place(bass, sig, t0 + s * step, 0.8)
    # pad: acorde do compasso inteiro, ataque lento
    n = int(4 * beat * SR)
    t = np.arange(n) / SR
    chord_sig = sum(saw(note(m + 12), n, d) for m in chord for d in (-0.006, 0.0, 0.006))
    shape = np.minimum(1, t / 0.6) * np.minimum(1, (4 * beat - t) / 0.3)
    place(pad, lp(chord_sig, 2200) * shape / 9, t0)
    # arpejo: notas do acorde subindo, uma oitava acima
    seq = [chord[0], chord[1], chord[2], chord[1] + 12, chord[2], chord[1]] * 3
    for s in range(16):
        f = note(seq[s] + 24)
        n = int(step * SR)
        tt = np.arange(n) / SR
        sq = np.sign(np.sin(2 * np.pi * f * tt)) * 0.5 + saw(f, n, 0.003) * 0.5
        place(arp, lp(sq, 3500) * env(n, 0.002, 0.07), t0 + s * step, 0.35)


def echo(x, delay_s, fb, mix):
    d = int(delay_s * SR)
    y = x.copy()
    for k in range(1, 5):
        y[d * k:] += x[: len(x) - d * k] * (fb ** k)
    return x * (1 - mix) + y * mix


def reverb(x, mix=0.25):
    y = np.zeros_like(x)
    for d, g in ((0.0297, 0.77), (0.0371, 0.74), (0.0411, 0.72), (0.0437, 0.7)):
        n = int(d * SR)
        buf = x.copy()
        for k in range(1, 12):
            buf[n * k:] += x[: len(x) - n * k] * (g ** k)
        y += buf
    return x * (1 - mix) + lp(y / 4, 6000) * mix


arp = echo(arp, beat * 0.75, 0.45, 0.4)
snare = reverb(snare, 0.35)
pad = reverb(pad, 0.3)

mix_l = kick * 0.9 + snare * 0.55 + hats * 0.35 + bass * side * 0.55 + pad * side * 0.5 + arp * 0.5
# estéreo: arpejo e chimbal levemente abertos
pan = arp * 0.5 * 0.25 + hats * 0.35 * 0.2
left, right = mix_l + pan, mix_l - pan

# entrada curta e saída suave
fade_in = np.minimum(1, np.arange(n_total) / (0.04 * SR))
fade_out = np.minimum(1, (n_total - np.arange(n_total)) / (1.5 * SR))
stereo = np.stack([left, right], axis=1) * (fade_in * fade_out)[:, None]
stereo = np.tanh(stereo / (np.abs(stereo).max() + 1e-9) * 1.6) * 0.89
wavfile.write(out_path, SR, (stereo * 32767).astype(np.int16))
print(f'trilha: {out_path} · {seconds:.1f}s · {BPM:.0f} bpm')
