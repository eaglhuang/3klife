#!/usr/bin/env python
"""PROG-2-10134：把 Freesound CC0 原檔（人工下載）裁剪、轉單聲道、正規化後編成 OGG Vorbis，放進 audio bundle。
用法：python -I tools_node/gen-battle-audio-clips.py <原檔資料夾 raw/freesound> [輸出資料夾，預設 assets/bundles/audio/clips]
需要 numpy／scipy／soundfile（使用者已同意，PROG-2-9732）。每個輸出的來源與授權見 clips/LICENSES-cc0.md。
"""
import os, site, sys
sys.path.insert(0, site.getusersitepackages())
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

RAW = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'assets', 'bundles', 'audio', 'clips')
SR = 44100

def load(name):
    d, sr = sf.read(os.path.join(RAW, name), always_2d=True)
    m = d.mean(1)
    if sr != SR:
        g = np.gcd(sr, SR)
        m = resample_poly(m, SR // g, sr // g)
    return m.astype(np.float64)

def onsets(x, thr=0.35, refractory=0.45):
    env = np.abs(x); peak = env.max(); out = []; last = -10**9
    for i in np.flatnonzero(env > thr * peak):
        if i - last > refractory * SR:
            out.append(int(i))
        last = i if env[i] > thr * peak else last
    return out

def cut(x, start=0.0, dur=None, pre=0.004):
    """從 start 秒（回退 pre 秒）取 dur 秒"""
    a = max(0, int((start - pre) * SR)); b = len(x) if dur is None else min(len(x), a + int((dur + pre) * SR))
    return x[a:b].copy()

def finish(x, peak, fade_in=0.003, fade_out=0.05):
    x = x - x.mean()
    x = x / (np.abs(x).max() or 1) * peak
    fi = int(fade_in * SR); fo = min(len(x) // 2, int(fade_out * SR))
    if fi: x[:fi] *= np.linspace(0, 1, fi)
    if fo: x[-fo:] *= np.linspace(1, 0, fo)
    return x

def mix(*parts):
    n = max(len(p) for p, _ in parts)
    y = np.zeros(n)
    for p, g in parts:
        y[:len(p)] += p * g
    return y

def loopify(x, xf=0.08):
    """尾端與開頭等功率交疊，循環接縫不爆音"""
    n = int(xf * SR)
    t = np.linspace(0, np.pi / 2, n)
    head, tail = x[:n], x[-n:]
    body = x[n:-n].copy()
    joint = tail * np.cos(t) + head * np.sin(t)
    # 輸出 = joint 放在開頭，使尾端接回開頭時連續
    return np.concatenate([joint, body])

def save(name, x):
    path = os.path.join(OUT, name)
    sf.write(path, x.astype(np.float32), SR, format='OGG', subtype='VORBIS')
    back = sf.read(path)[0]
    if np.abs(back).max() > 0.95:  # Vorbis 編碼可能過衝，縮小後重編
        sf.write(path, (x * 0.9 / np.abs(back).max()).astype(np.float32), SR, format='OGG', subtype='VORBIS')
    meta = path + '.meta'
    if not os.path.exists(meta):  # 新檔的 meta 要固定 uuid 後提交；已存在不覆寫
        import json, uuid
        json.dump({'ver': '1.0.0', 'importer': 'audio-clip', 'imported': True, 'uuid': str(uuid.uuid4()), 'files': ['.json', '.ogg'],
                   'subMetas': {}, 'userData': {'downloadMode': 0}}, open(meta, 'w', encoding='utf-8', newline=chr(10)), indent=2)
    print('%-28s %6.2fs %7d bytes' % (name, len(x) / SR, os.path.getsize(path)))

F = {
 'slash': '441666__ethanchase7744__sword-slash.wav', 'stab': '464839__breviceps__anime-sound-effect-piercing-impact-stabbing.wav',
 'bow': '394178__saturdaysoundguy__longbow-release-1.wav', 'whoosh': '384908__ali_6868__arrow-whoosh-1.wav',
 'shield': '182112__pixelspherestudios__shield-sword-hits.wav', 'drum': '328009__terry93d__epic-drum.wav',
 'swordhit': '442769__qubodup__sword-hit.wav', 'arrowhit1': '205938__twisted_euphoria__arrow-impact.wav',
 'arrowhit2': '384914__ali_6868__arrow-impact-1.wav', 'clash': '334169__loudernoises__sword-clash.wav',
 'wood': '449955__breviceps__wooden-thud-mono.wav', 'punch': '503277__kinoton__face-punch-body-impact-4x.wav',
 'horn': '392180__kirmm__battle_horn_1.wav', 'wardrums': '209546__sclolex__warriordrums.wav',
 'drumloop': '274223__pearcewilsonking__war-drum-loop.wav', 'fanfare': '456966__funwithsound__success-fanfare-trumpets.mp3',
 'trombone': '175409__kirbydx__wah-wah-sad-trombone.wav', 'fail': '335906__littlerainyseasons__fail.mp3',
}

# ── 小兵攻擊音（出手）
x = load(F['slash']); on = onsets(x)[0] / SR
save('sfx_atk_blade.ogg', finish(cut(x, on, 0.42), 0.8))
x = load(F['stab']); on = onsets(x)[0] / SR
save('sfx_atk_thrust.ogg', finish(cut(x, on, 0.4), 0.8))
x = load(F['bow']); save('sfx_atk_bow.ogg', finish(cut(x, 0.05, 0.5), 0.8))
x = load(F['whoosh']); save('sfx_atk_arrow_whoosh.ogg', finish(cut(x, 0, 0.5), 0.6, fade_out=0.15))
x = load(F['shield']); on = onsets(x)[0] / SR
save('sfx_atk_shield.ogg', finish(cut(x, on, 0.4), 0.8))
d = finish(cut(load(F['drum']), 0, 0.55), 0.8, fade_out=0.2)
hoof = sf.read(os.path.join(OUT, 'cc0_hoof_single.ogg'), always_2d=True)[0].mean(1)
hoof = resample_poly(hoof, 2, 1)  # 22050 → 44100
save('sfx_atk_charge.ogg', finish(mix((d, 1.0), (hoof * 1.2, 0.8)), 0.85, fade_out=0.15))
# ── 小兵受擊音（依攻擊方式）
x = load(F['swordhit']); save('sfx_hit_blade.ogg', finish(cut(x, 0, 0.4), 0.8))
x = load(F['arrowhit1']); save('sfx_hit_pierce.ogg', finish(cut(x, 0.04, 0.35), 0.8))
x = load(F['arrowhit2']); save('sfx_hit_arrow.ogg', finish(cut(x, 0.06, 0.3), 0.8))
x = load(F['clash']); save('sfx_hit_clash.ogg', finish(cut(x, 0.02, 0.45), 0.8))
x = load(F['wood']); save('sfx_hit_wood.ogg', finish(cut(x, 0, 0.4), 0.8))
x = load(F['punch']); ons = onsets(x, thr=0.3, refractory=0.5)
for i, name in enumerate(['sfx_hit_body_a.ogg', 'sfx_hit_body_b.ogg']):
    save(name, finish(cut(x, ons[i] / SR, 0.45), 0.85, fade_out=0.15))

# ── 戰場 BGM（全部由上列 CC0 素材混成）
horn = finish(cut(load(F['horn']), 0.06, 4.6), 0.55, fade_in=0.05, fade_out=0.6)
wd = load(F['wardrums'])[: int(9.0 * SR)]
wd = finish(wd, 0.7, fade_in=0.01, fade_out=1.2)
start = mix((np.concatenate([np.zeros(int(0.5 * SR)), horn]), 1.0), (wd, 0.75))
save('bgm_battle_start.ogg', finish(start, 0.8, fade_out=1.0))
dl = load(F['drumloop'])
save('bgm_battle_tense.ogg', finish(loopify(dl, 0.08), 0.65, fade_in=0.0, fade_out=0.0))
save('bgm_battle_victory.ogg', finish(cut(load(F['fanfare']), 0.0, 4.4), 0.8, fade_out=0.8))
save('bgm_battle_defeat.ogg', finish(cut(load(F['trombone']), 0.2, 3.6), 0.7, fade_out=0.6))
