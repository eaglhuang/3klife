# -*- coding: utf-8 -*-
"""產生虎符卡佔位框圖（PROG-2-10131）：白色底圖（內窗透明、卡圖墊在下面），執行期乘上品階色即成四階框。
交件正式框圖（tally_frame_r_bronze 等）後，改 ui-spec/tiger-tally-card-theme.json 的路徑即可，本圖留作缺檔備援。
輸出：assets/resources/ui/tiger-tally/theme/tally_frame_placeholder.png（287x142，九宮格 左56 上40 右40 下40）
"""
from PIL import Image, ImageChops, ImageDraw
import os

W, H, S = 287, 142, 4
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'resources', 'ui', 'tiger-tally', 'theme', 'tally_frame_placeholder.png')


def rrect_mask(w, h, radii, inset=0):
    """radii = (左上, 右上, 右下, 左下)；回傳超取樣遮罩"""
    m = Image.new('L', (w * S, h * S), 0)
    d = ImageDraw.Draw(m)
    x0, y0, x1, y1 = inset * S, inset * S, (w - inset) * S - 1, (h - inset) * S - 1
    tl, tr, br, bl = [max(1, (r - inset)) * S for r in radii]
    # 以四角圓＋中間矩形拼出不等半徑圓角矩形
    d.rectangle([x0 + max(tl, bl), y0, x1 - max(tr, br), y1], fill=255)
    d.rectangle([x0, y0 + tl, x0 + max(tl, bl), y1 - bl], fill=255)
    d.rectangle([x1 - max(tr, br), y0 + tr, x1, y1 - br], fill=255)
    d.pieslice([x0, y0, x0 + 2 * tl, y0 + 2 * tl], 180, 270, fill=255)
    d.pieslice([x1 - 2 * tr, y0, x1, y0 + 2 * tr], 270, 360, fill=255)
    d.pieslice([x1 - 2 * br, y1 - 2 * br, x1, y1], 0, 90, fill=255)
    d.pieslice([x0, y1 - 2 * bl, x0 + 2 * bl, y1], 90, 180, fill=255)
    d.rectangle([x0 + tl, y0, x1 - tr, y0 + max(tl, tr)], fill=255)
    d.rectangle([x0 + bl, y1 - max(bl, br), x1 - br, y1], fill=255)
    return m


outer = rrect_mask(W, H, (14, 14, 14, 40))
inner = rrect_mask(W, H, (6, 6, 6, 30), inset=10)

img = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
ring = Image.new('RGBA', (W * S, H * S), (214, 214, 214, 255))
img.paste(ring, (0, 0), outer)
# 斜面：外緣左上亮、右下暗（內縮 3px 的亮暗邊）
hi_edge = lo_edge = outer
shift = 3 * S
hi = Image.new('RGBA', img.size, (255, 255, 255, 255))
lo = Image.new('RGBA', img.size, (118, 118, 118, 255))
shifted_hi = Image.new('L', img.size, 0)
shifted_hi.paste(hi_edge, (shift, shift))
# 亮邊 = 外形 - 往右下平移的外形；暗邊 = 外形 - 往左上平移的外形
hi_band = ImageChops.subtract(outer, shifted_hi)
shifted_lo = Image.new('L', img.size, 0)
shifted_lo.paste(lo_edge, (-shift, -shift))
lo_band = ImageChops.subtract(outer, shifted_lo)
img.paste(hi, (0, 0), hi_band)
img.paste(lo, (0, 0), lo_band)
# 內窗留空透明（卡圖墊在框圖下面），內緣壓一圈半透明暗邊做凹槽感
img.paste(Image.new('RGBA', img.size, (0, 0, 0, 0)), (0, 0), inner)
inner_shift = Image.new('L', img.size, 0)
inner_shift.paste(inner, (shift // 2, shift // 2))
groove_band = ImageChops.subtract(inner, inner_shift)
img.paste(Image.new('RGBA', img.size, (20, 14, 8, 200)), (0, 0), groove_band)
img = img.resize((W, H), Image.LANCZOS)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT)
print('saved', os.path.abspath(OUT), img.size)
