# 由已核准的槍兵／弓兵分件圖，程式化產出各兵種的小兵素材（藍色版），再換色出紅色版，匯入遊戲私有素材資料夾。
# 全部沿用共用小兵骨架與動作（spine-trial 的 tools/soldier_rig.py）；只換分件圖，不動骨架、不為單一兵種寫補丁。
# 兵種設計見 docs/battle-chibi-troop-design.md；繪製細節見 troop_art.py。素材為私有，不進版控。
#
# 準備（一次）：
#   git -C ../spine-trial archive origin/battle-chibi-spec | tar -x -C <RIG_ROOT>
#   cd <RIG_ROOT> && git apply <本資料夾>/soldier_rig_attack_class.patch      # 新增 attack_class 與 attack_slash（共用動作，所有小兵可用）
#   cp -r ../spine-trial/render/node_modules <RIG_ROOT>/render/                 # 逐格驗證用的 spine-webgl／playwright
#   在 <RIG_ROOT> 起 `python -m http.server 8765 --bind 127.0.0.1`，並設 CHROME 指向 Chrome 執行檔
# 用法：
#   python tools_node/battle-chibi/make_troop_variants.py --rig-root <RIG_ROOT> [--only soldier_medic_blue,...] [--no-rig]
import argparse
import json
import os
import shutil
import subprocess
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import troop_art as A  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_SOLDIERS = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'resources', 'spine', 'soldiers'))

# 兵種 -> 所有變體共用的設定。紅色版名稱把 _blue 換成 _red。
# attack_class：duel_attack 用哪一組共用動作（spear 突刺／slash 下劈／shield 盾擊／bow 射擊）。
VARIANTS = {
    'soldier_shield_blue':        {'troop': 'shield',   'attack_class': 'shield'},
    'soldier_infantry_blue':      {'troop': 'infantry', 'attack_class': 'slash'},
    'soldier_engineer_blue':      {'troop': 'engineer', 'attack_class': 'slash'},
    'soldier_medic_blue':         {'troop': 'medic',    'attack_class': 'slash'},
    'soldier_navy_blue':          {'troop': 'navy',     'attack_class': 'slash'},
    'soldier_elite_infantry_blue': {'troop': 'elite_infantry', 'attack_class': 'slash'},   # 陷陣營
    'soldier_elite_shield_blue':  {'troop': 'elite_shield', 'attack_class': 'spear'},      # 大戟士
}


def load(root, char, part):
    return Image.open(os.path.join(root, 'characters', char, 'parts', part + '.png')).convert('RGBA')


def build_parts(root, name, spec):
    """回傳 (parts{名稱: RGBA}, char.json 內容)。身體（軀幹、雙臂、雙腿）全部沿用藍槍兵，單位比例與 pivots 不變。"""
    base = json.load(open(os.path.join(root, 'characters', 'soldier_spear_blue', 'char.json'), encoding='utf8'))
    piv, ends = dict(base['pivots']), dict(base['ends'])
    parts = {p: load(root, 'soldier_spear_blue', p) for p in ('torso', 'arm_n', 'arm_f', 'leg_n', 'leg_f')}
    round_shield = load(root, 'soldier_spear_blue', 'shield')
    head = load(root, 'soldier_spear_blue', 'head')
    troop = spec['troop']
    weapon_name, shield_name = 'weapon_sword', None

    def set_head(img, off):
        parts['head'] = img
        piv['head'] = [base['pivots']['head'][0] + off[0], base['pivots']['head'][1] + off[1]]

    def elite_head():
        # 精銳都戴長纓盔：取弓兵頭圖（紅纓）轉成藍陣營色，與一般兵的無纓盔一眼分得開
        h = load(root, 'soldier_bow_red', 'head')
        set_head(A.hue_shift(h, 356, 215, 9, 6, 0.62), (0, 0))
        piv['head'] = list(json.load(open(os.path.join(root, 'characters', 'soldier_bow_red', 'char.json'), encoding='utf8'))['pivots']['head'])

    if troop == 'shield':
        set_head(*A.head_with_crest(head))
        parts['weapon_sword'], piv['weapon_sword'] = A.make_jian()
        shield_name, parts['shield'] = 'shield', A.make_tower_shield(round_shield)
        piv['shield'] = [101.75 * 190 / 173, 102.3 * 270 / 197]
    elif troop == 'infantry':
        set_head(*A.head_with_tuft(head))
        parts['weapon_sword'], piv['weapon_sword'] = A.make_dao()
        shield_name, parts['shield'] = 'shield', A.make_buckler(round_shield, 0.62)
        piv['shield'] = [101.75 * 0.62, 102.3 * 0.62]
    elif troop == 'engineer':
        set_head(*A.head_with_bamboo_hat(head))
        parts['weapon_sword'], piv['weapon_sword'] = A.make_maul()
        shield_name, parts['shield'] = 'shield', A.make_plank_board()
        piv['shield'] = [62.0, 88.0]
    elif troop == 'medic':
        set_head(*A.head_with_cloth(head, A.CLOTH_WHITE, cross=True))
        parts['weapon_sword'], piv['weapon_sword'] = A.make_staff()
        shield_name, parts['shield'] = 'shield', A.make_medic_box()
        piv['shield'] = [64.0, 52.0]
    elif troop == 'navy':
        set_head(*A.head_with_cloth(head, A.SEA_GREEN, cross=False))
        parts['weapon_sword'], piv['weapon_sword'] = A.make_oar()
        shield_name, parts['shield'] = 'shield', A.make_rattan_shield()
        piv['shield'] = [59.0, 59.0]
    elif troop == 'elite_infantry':
        elite_head()
        parts['weapon_sword'], piv['weapon_sword'] = A.make_dao()
    elif troop == 'elite_shield':
        elite_head()
        spear = load(root, 'soldier_spear_blue', 'weapon_spear')
        # 槍桿中心線：槍頭下方 y=110 起到槍尾，取各列不透明像素 x 的平均擬合
        import numpy as np
        a = np.asarray(spear)[..., 3] > 128
        ys = np.arange(120, spear.height - 10, 10)
        xs = [np.where(a[y])[0].mean() for y in ys]
        fit = np.polyfit(ys, xs, 1)
        pts = ((float(np.polyval(fit, 120)), 120.0), (float(np.polyval(fit, spear.height - 20)), float(spear.height - 20)))
        parts['weapon_spear'], padl = A.make_halberd(spear, pts)
        piv['weapon_spear'] = [base['pivots']['weapon_spear'][0] + padl, base['pivots']['weapon_spear'][1]]
        weapon_name = 'weapon_spear'
        shield_name, parts['shield'] = 'shield', A.make_tower_shield(round_shield)
        piv['shield'] = [101.75 * 190 / 173, 102.3 * 270 / 197]
    else:
        raise SystemExit('未知兵種 ' + troop)

    keep = {p: piv[p] for p in parts}
    cfg = {'id': name, 'tier': 'soldier', 'name': name, 'root': f'characters/{name}',
           'weapon': weapon_name, 'shield': shield_name, 'attack_class': spec['attack_class'],
           'pivots': keep, 'ends': {k: v for k, v in ends.items() if k in ('torso', 'arm_n', 'arm_f', 'leg_n', 'leg_f')}}
    return parts, cfg


def write_char(root, name, parts, cfg):
    d = os.path.join(root, 'characters', name)
    if os.path.isdir(d):
        shutil.rmtree(d)
    os.makedirs(os.path.join(d, 'parts'))
    for k, im in parts.items():
        im.save(os.path.join(d, 'parts', k + '.png'))
    json.dump(cfg, open(os.path.join(d, 'char.json'), 'w', encoding='utf8'), indent=2)


def run_rig(root, name):
    env = dict(os.environ, CHAR=name, PYTHONIOENCODING='utf8')
    r = subprocess.run([sys.executable, 'tools/soldier_rig.py'], cwd=root, env=env, capture_output=True, text=True, encoding='utf8')
    out = r.stdout + r.stderr
    fails = [l for l in out.splitlines() if l.startswith('[FAIL]') or 'Traceback' in l]
    print(out.strip().splitlines()[-1] if out.strip() else '(無輸出)')
    if r.returncode or fails:
        print(out[-2500:])
        raise SystemExit(f'{name} 骨架建置失敗')
    return out


def install(root, name):
    """把建好的 json／atlas／png 放進遊戲私有素材資料夾（json 壓成單行，與既有小兵一致）。"""
    out = os.path.join(root, 'characters', name, 'out')
    dst = os.path.join(GAME_SOLDIERS, name)
    os.makedirs(dst, exist_ok=True)
    sk = json.load(open(os.path.join(out, name + '.json'), encoding='utf8'))
    with open(os.path.join(dst, name + '.json'), 'w', encoding='utf8', newline='\n') as f:
        json.dump(sk, f, separators=(',', ':'), ensure_ascii=False)
    shutil.copyfile(os.path.join(out, 'atlas', name + '.atlas'), os.path.join(dst, name + '.atlas'))
    shutil.copyfile(os.path.join(out, 'atlas', name + '.png'), os.path.join(dst, name + '.png'))
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rig-root', required=True)
    ap.add_argument('--only', default='')
    ap.add_argument('--no-rig', action='store_true', help='只產分件圖與 char.json，不建骨架')
    args = ap.parse_args()
    only = {s for s in args.only.split(',') if s}
    for name, spec in VARIANTS.items():
        if only and name not in only:
            continue
        print('==', name)
        parts, cfg = build_parts(args.rig_root, name, spec)
        write_char(args.rig_root, name, parts, cfg)
        if args.no_rig:
            continue
        run_rig(args.rig_root, name)
        install(args.rig_root, name)
        red = name.replace('_blue', '_red')
        subprocess.run([sys.executable, os.path.join(HERE, 'recolor_soldier.py'), name, red, '215', '2'], check=True)


if __name__ == '__main__':
    main()
