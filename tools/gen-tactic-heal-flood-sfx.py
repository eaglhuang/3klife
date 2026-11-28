#!/usr/bin/env python3
"""
PROG-2-10215：戰法「回復」「水淹」音效重混（只用既有 CC0 素材混音，不引入新授權）。
輸入：舊版 tactic_heal.ogg（BigSoundBank Chimes dream #5）、tactic_water.ogg（Small waterfall #2）、tactic_wind.ogg（Strong wind #2）。
輸出：tactic_heal.ogg、tactic_heal_sparkle.ogg、tactic_water.ogg、tactic_splash_a.ogg、tactic_splash_b.ogg（單聲道 44100Hz Vorbis）。
用法：python tools/gen-tactic-heal-flood-sfx.py <舊版素材資料夾> <輸出資料夾> [--mp3-dir <試聽 mp3 資料夾>]
舊版素材資料夾要放 master 版的 tactic_heal.ogg／tactic_water.ogg／tactic_wind.ogg（git show origin/master:...）。
"""
import sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 44100
rng = np.random.default_rng(10213)


def load(path):
    x, sr = sf.read(path, dtype='float32')
    if x.ndim > 1:
        x = x.mean(axis=1)
    assert sr == SR
    return x


def hp(x, f):
    return sosfilt(butter(3, f / (SR / 2), 'high', output='sos'), x)


def lp(x, f):
    return sosfilt(butter(3, f / (SR / 2), 'low', output='sos'), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)


def pitch(x, ratio):
    # 重取樣變調（同時變短），ratio>1 變高
    from fractions import Fraction
    fr = Fraction(ratio).limit_denominator(100)
    return resample_poly(x, fr.denominator, fr.numerator).astype(np.float32)


def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    n = min(len(x), len(buf) - i)
    if n > 0:
        buf[i:i + n] += x[:n] * gain


def fade(x, fin, fout):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def reverb(x, taps):
    out = x.copy()
    for d, g in taps:
        k = int(d * SR)
        out[k:] += x[:-k] * g
    return out


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)))


def norm(x, target_rms, peak=0.9):
    x = x * (target_rms / max(rms(x), 1e-9))
    x = np.tanh(x / 0.7) * 0.7  # 軟削峰，讓尖峰不拖低整體響度
    x = x * (target_rms / max(rms(x), 1e-9))
    p = float(np.max(np.abs(x)))
    if p > peak:
        x *= peak / p
    return x


def noise(n):
    return rng.standard_normal(n).astype(np.float32)


def save(out, name, x):
    sf.write(f'{out}/{name}.ogg', x, SR, format='OGG', subtype='VORBIS')


def heal(old_heal, old_wind):
    """回復：柔和上行琶音（風鈴變調 4 音）＋氣流＋光暈尾音，約 1.6 秒。"""
    total = int(1.7 * SR)
    buf = np.zeros(total, np.float32)
    for at, ratio, g in [(0.00, 1.0, 1.0), (0.13, 1.25, 0.95), (0.26, 1.5, 0.9), (0.40, 2.0, 0.85)]:
        c = pitch(old_heal[:int(1.1 * SR)], ratio)
        place(buf, hp(c, 300), at, g)
    buf = reverb(buf, [(0.09, 0.35), (0.17, 0.25), (0.29, 0.15)])
    # 氣流：風聲帶通後做 0→峰值→淡出的鼓脹
    air = bp(old_wind[:int(1.6 * SR)], 500, 2800)
    env = np.sin(np.linspace(0, np.pi, len(air))) ** 1.5
    place(buf, norm(air * env, 0.05), 0.0, 1.0)
    # 光暈尾音：三個泛音正弦緩慢衰減＋輕微顫音
    t = np.arange(int(1.2 * SR)) / SR
    halo = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1318.5, 1.0), (1975.5, 0.6), (2637.0, 0.35)])
    halo *= np.exp(-t * 2.6) * (1 + 0.25 * np.sin(2 * np.pi * 7 * t)) * np.clip(t / 0.15, 0, 1)
    place(buf, norm(halo.astype(np.float32), 0.035), 0.45, 1.0)
    return norm(fade(buf, 0.01, 0.45), 0.15)


def heal_sparkle(old_heal):
    """回復閃光：高八度小風鈴，短（0.5 秒），執行期隨機疊 2～3 次。"""
    c = pitch(old_heal[:int(1.0 * SR)], 2.0)
    return norm(fade(hp(reverb(c, [(0.07, 0.3)]), 600), 0.003, 0.2), 0.10)


def water(old_water, old_wind):
    """水淹：水湧 whoosh＋兩層急流（錯位、變調）＋水流尾巴，約 2.4 秒。"""
    total = int(2.4 * SR)
    buf = np.zeros(total, np.float32)
    # 水湧：噪音低通掃頻（頻寬由窄漸寬）＋鼓脹
    n = noise(int(1.0 * SR))
    sw = np.zeros_like(n)
    for lo, hi, a in [(200, 700, 1.0), (500, 1800, 0.8), (1200, 4500, 0.6)]:
        sw += bp(n, lo, hi) * a
    sw *= np.linspace(0, 1, len(sw)) ** 1.2 * np.linspace(1, 0.4, len(sw))
    place(buf, norm(sw, 0.10), 0.0, 1.0)
    # 急流兩層
    w1 = hp(old_water, 200)
    w2 = hp(pitch(old_water, 0.88), 250)
    place(buf, fade(w1, 0.15, 0.5), 0.20, 0.9)
    place(buf, fade(w2, 0.2, 0.6), 0.50, 0.75)
    # 尾巴：高頻水流持續 loop 感（原檔尾段重複淡出）
    tail = hp(old_water[int(0.6 * SR):int(1.8 * SR)], 400)
    place(buf, fade(tail, 0.3, 0.7), 1.30, 0.55)
    return norm(fade(buf, 0.02, 0.5), 0.15)


def splash(variant):
    """水花：噪音高頻爆音＋快速衰減＋稀疏水珠劈啪，0.5 秒。"""
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    body = bp(noise(n), 1500 if variant == 'a' else 1100, 7000 if variant == 'a' else 5500)
    env = np.exp(-t * (11 if variant == 'a' else 8)) * np.clip(t / 0.004, 0, 1)
    sig = body * env
    # 水珠：稀疏脈衝經高通，落在 0.04～0.35 秒
    drops = np.zeros(n, np.float32)
    for _ in range(9 if variant == 'a' else 7):
        i = int(rng.uniform(0.04, 0.35) * SR)
        drops[i:i + 60] += noise(60) * rng.uniform(0.3, 0.9) * np.exp(-np.arange(60) / 14)
    sig += hp(drops, 2500) * 1.4
    return norm(fade(sig.astype(np.float32), 0.002, 0.12), 0.14)


def main():
    src, out = sys.argv[1], sys.argv[2]
    old_heal = load(f'{src}/tactic_heal.ogg')
    old_water = load(f'{src}/tactic_water.ogg')
    old_wind = load(f'{src}/tactic_wind.ogg')
    outs = {
        'tactic_heal': heal(old_heal, old_wind),
        'tactic_heal_sparkle': heal_sparkle(old_heal),
        'tactic_water': water(old_water, old_wind),
        'tactic_splash_a': splash('a'),
        'tactic_splash_b': splash('b'),
    }
    for k, v in outs.items():
        save(out, k, v)
        print(k, f'{len(v) / SR:.2f}s rms={rms(v):.3f} peak={np.max(np.abs(v)):.2f}')


if __name__ == '__main__':
    main()
