# 以色相替換產出另一陣營配色的小兵圖集：只動指定色相範圍內、飽和度夠高的像素（布料／盔甲主色），膚色與金屬不動。
# 用法：python recolor_soldier.py <來源名> <新名> <來源色相中心> <目標色相中心> [全換範圍=40] [漸出範圍=20] [最低飽和=0.18]
# 紅槍兵：soldier_spear_blue soldier_spear_red 215 2
# 藍弓兵：soldier_bow_red soldier_bow_blue 356 215 9 6 0.62（紅色貼近膚色與銅色，範圍要收窄）
import sys, os, shutil
import numpy as np
from PIL import Image

src, dst, h_from, h_to = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
full = float(sys.argv[5]) if len(sys.argv) > 5 else 40.0
fade = float(sys.argv[6]) if len(sys.argv) > 6 else 20.0
smin = float(sys.argv[7]) if len(sys.argv) > 7 else 0.18
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'resources', 'spine', 'soldiers')
sdir, ddir = os.path.join(root, src), os.path.join(root, dst)
os.makedirs(ddir, exist_ok=True)
img = Image.open(os.path.join(sdir, src + '.png')).convert('RGBA')
a = np.asarray(img).astype(np.float32) / 255.0
rgb, alpha = a[..., :3], a[..., 3:]
hsv = np.asarray(Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').convert('HSV')).astype(np.float32)
h = hsv[..., 0] / 255.0 * 360.0; s = hsv[..., 1] / 255.0
d = np.abs(((h - h_from + 180) % 360) - 180)
# 色相距離在全換範圍內整個換，之後線性漸出；低飽和（金屬、白）不換
w = np.clip((full + fade - d) / fade, 0, 1) * np.clip((s - smin) / 0.15, 0, 1)
nh = (h + (h_to - h_from)) % 360
hsv2 = hsv.copy(); hsv2[..., 0] = nh / 360.0 * 255.0
rgb2 = np.asarray(Image.fromarray(hsv2.astype(np.uint8), 'HSV').convert('RGB')).astype(np.float32) / 255.0
out = rgb * (1 - w[..., None]) + rgb2 * w[..., None]
res = np.concatenate([out, alpha], axis=-1)
Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(ddir, dst + '.png'))
with open(os.path.join(sdir, src + '.atlas'), encoding='utf8') as f: atlas = f.read()
with open(os.path.join(ddir, dst + '.atlas'), 'w', encoding='utf8', newline='\n') as f: f.write(atlas.replace(src + '.png', dst + '.png'))
shutil.copyfile(os.path.join(sdir, src + '.json'), os.path.join(ddir, dst + '.json'))
print('ok', dst, 'changed px', int((w > 0.5).sum()))
