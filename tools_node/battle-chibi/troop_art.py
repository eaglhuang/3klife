# 小兵兵種分件圖的程式化繪製工具（只供 make_troop_variants.py 使用）。
# 設計前提：戰場上小兵只有約 110～180 像素高（顯示縮放 0.18），所以這裡只畫「輪廓、主色、金屬光澤、一兩個辨識記號」，
# 不畫看不到的細節。全部用 numpy／OpenCV／Pillow 的幾何遮罩加高度圖打光完成，不呼叫任何生圖服務。
# 色相規則：陣營色固定在藍（色相約 215），之後由 recolor_soldier.py 換成紅；兵種記號色一律避開 175～255 度
# （橘 25、黃 40、綠 150、白、黑、木棕），這樣換陣營時只有陣營色會跟著變。
import cv2
import numpy as np
from PIL import Image, ImageDraw

LIGHT = np.array([-0.5, -0.62, 0.6], np.float32)
LIGHT /= np.linalg.norm(LIGHT)

# 色階：(位置 0..1, RGB)
STEEL = [(0, (44, 54, 74)), (0.35, (118, 130, 150)), (0.7, (206, 215, 228)), (1, (255, 255, 255))]
BRONZE = [(0, (66, 36, 14)), (0.45, (170, 104, 42)), (0.8, (232, 178, 86)), (1, (255, 238, 176))]
WOOD = [(0, (52, 28, 16)), (0.5, (128, 78, 42)), (1, (190, 130, 78))]
LEATHER = [(0, (40, 24, 16)), (0.5, (96, 58, 34)), (1, (156, 104, 66))]
BAMBOO = [(0, (116, 80, 28)), (0.5, (208, 160, 70)), (1, (250, 220, 136))]
CLOTH_WHITE = [(0, (138, 144, 160)), (0.55, (226, 228, 236)), (1, (255, 255, 255))]
SEA_GREEN = [(0, (8, 64, 40)), (0.5, (28, 138, 88)), (1, (120, 214, 160))]
ORANGE = [(0, (106, 36, 8)), (0.5, (222, 100, 26)), (1, (255, 196, 96))]
BLACK = [(0, (6, 6, 10)), (0.5, (34, 34, 46)), (1, (112, 114, 134))]
RED = [(0, (90, 10, 10)), (0.5, (200, 30, 30)), (1, (255, 120, 100))]


def ramp(colors, t):
    xs = [c[0] for c in colors]
    return np.stack([np.interp(t, xs, [c[1][i] for c in colors]) for i in range(3)], -1)


def mask(w, h, draw, k=4):
    """以 k 倍超取樣畫出 0..1 的抗鋸齒遮罩；draw(d, k) 內的座標請乘 k。"""
    im = Image.new('L', (w * k, h * k), 0)
    draw(ImageDraw.Draw(im), k)
    return np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255.0


def lit(m, colors, rad, spec=0.45, grain=0.0, grain_dir=None, seed=0, relief=1.0):
    """把遮罩打成有立體感的 RGBA：距離變換當圓角高度圖，左上主光，加高光；grain 給木紋／布紋。"""
    b = (m > 0.5).astype(np.uint8)
    d = cv2.distanceTransform(b, cv2.DIST_L2, 5)
    h = np.sin(np.clip(d / max(rad, 1.0), 0, 1) * np.pi / 2)
    if grain:
        rng = np.random.default_rng(seed)
        n = rng.random(m.shape).astype(np.float32)
        kx, ky = (1, 15) if grain_dir == 'v' else (15, 1) if grain_dir == 'h' else (3, 3)
        n = cv2.GaussianBlur(n, (0, 0), sigmaX=kx, sigmaY=ky)
        n = (n - n.mean()) / (n.std() + 1e-6)
        h = h + n * grain * 0.03
    h = cv2.GaussianBlur(h.astype(np.float32), (0, 0), 1.0)
    gx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3) / 8.0
    gy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3) / 8.0
    s = rad * relief
    nx, ny, nz = -gx * s, -gy * s, np.ones_like(h)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    diff = np.clip((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) * inv, 0, 1)
    t = np.clip(0.18 + 0.82 * diff, 0, 1)
    rgb = ramp(colors, t) + (diff ** 22 * spec * 255)[..., None]
    return rgba(rgb, m)


def rgba(rgb, a):
    out = np.zeros(a.shape + (4,), np.uint8)
    out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def stack(size, layers):
    """layers: [(RGBA, (x, y))]，依序疊到透明畫布上。"""
    c = Image.new('RGBA', size, (0, 0, 0, 0))
    for im, (x, y) in layers:
        c.alpha_composite(im, (int(x), int(y)))
    return c


def darken_lines(img, linemask, amount=0.45):
    """在 RGBA 上沿 linemask 壓暗（纏繩、刀溝、織紋用）。"""
    a = np.asarray(img).astype(np.float32)
    a[..., :3] *= (1 - amount * linemask[..., None])
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def pad(img, left=0, top=0, right=0, bottom=0):
    c = Image.new('RGBA', (img.width + left + right, img.height + top + bottom), (0, 0, 0, 0))
    c.alpha_composite(img, (left, top))
    return c


def hue_shift(img, h_from, h_to, full=40.0, fade=20.0, smin=0.18):
    """與 recolor_soldier.py 同一套色相替換，給單張分件圖用。"""
    a = np.asarray(img.convert('RGBA')).astype(np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3:]
    hsv = np.asarray(Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').convert('HSV')).astype(np.float32)
    h = hsv[..., 0] / 255.0 * 360.0
    s = hsv[..., 1] / 255.0
    dist = np.abs(((h - h_from + 180) % 360) - 180)
    w = np.clip((full + fade - dist) / fade, 0, 1) * np.clip((s - smin) / 0.15, 0, 1)
    hsv2 = hsv.copy()
    hsv2[..., 0] = ((h + (h_to - h_from)) % 360) / 360.0 * 255.0
    rgb2 = np.asarray(Image.fromarray(hsv2.astype(np.uint8), 'HSV').convert('RGB')).astype(np.float32) / 255.0
    out = rgb * (1 - w[..., None]) + rgb2 * w[..., None]
    return Image.fromarray((np.concatenate([out, alpha], -1) * 255 + 0.5).astype(np.uint8), 'RGBA')


# ───────────── 武器（直立、刀尖朝上、原點為握點；與長槍同一座標慣例） ─────────────

def _wrap_lines(h, w, y0, y1, step, slant=6):
    """握柄纏繩：斜向暗線遮罩。"""
    def draw(d, k):
        for y in range(y0, y1, step):
            d.line([(0, (y + slant) * k), (w * k, y * k)], fill=255, width=int(2.2 * k))
    return mask(w, h, draw)


def make_dao(blue_tassel_hue=None):
    """環首大刀：寬弧刃、金護手、纏繩握柄、橘紅刀穗。回傳 (圖, 握點)。"""
    W, H = 80, 372
    blade = mask(W, H, lambda d, k: d.polygon(
        [(10 * k, 18 * k), (34 * k, 2 * k), (58 * k, 30 * k), (60 * k, 150 * k), (58 * k, 236 * k), (14 * k, 236 * k), (14 * k, 60 * k)], fill=255))
    spine = mask(W, H, lambda d, k: d.line([(36 * k, 20 * k), (36 * k, 230 * k)], fill=255, width=int(3 * k)))
    b = lit(blade, STEEL, 14, spec=0.6)
    b = darken_lines(b, spine * blade, 0.28)
    guard = lit(mask(W, H, lambda d, k: d.ellipse([8 * k, 232 * k, 72 * k, 252 * k], fill=255)), BRONZE, 6, spec=0.5)
    grip_m = mask(W, H, lambda d, k: d.rounded_rectangle([26 * k, 250 * k, 54 * k, 336 * k], radius=6 * k, fill=255))
    grip = darken_lines(lit(grip_m, LEATHER, 12, grain=1.0, grain_dir='v', seed=3), _wrap_lines(H, W, 252, 336, 9) * grip_m, 0.5)
    ring = mask(W, H, lambda d, k: (d.ellipse([22 * k, 334 * k, 58 * k, 366 * k], fill=255), d.ellipse([30 * k, 342 * k, 50 * k, 358 * k], fill=0)))
    pommel = lit(ring, BRONZE, 5, spec=0.5)
    tassel = lit(mask(W, H, lambda d, k: d.polygon([(34 * k, 352 * k), (46 * k, 352 * k), (52 * k, 372 * k), (28 * k, 372 * k)], fill=255)), ORANGE, 8)
    return stack((W, H), [(b, (0, 0)), (guard, (0, 0)), (grip, (0, 0)), (pommel, (0, 0)), (tassel, (0, 0))]), (40.0, 292.0)


def make_jian():
    """直身短劍（盾兵用）：窄刃、小護手、短握柄；長度明顯短於長槍。"""
    W, H = 50, 290
    blade = mask(W, H, lambda d, k: d.polygon([(25 * k, 2 * k), (38 * k, 30 * k), (36 * k, 196 * k), (14 * k, 196 * k), (12 * k, 30 * k)], fill=255))
    left = mask(W, H, lambda d, k: d.polygon([(25 * k, 2 * k), (25 * k, 196 * k), (14 * k, 196 * k), (12 * k, 30 * k)], fill=255))
    b = lit(blade, STEEL, 9, spec=0.6)
    a = np.asarray(b).astype(np.float32)
    a[..., :3] *= (0.78 + 0.34 * left[..., None] * (blade[..., None] > 0))   # 劍脊兩側明暗
    b = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
    guard = lit(mask(W, H, lambda d, k: d.rounded_rectangle([4 * k, 192 * k, 46 * k, 206 * k], radius=6 * k, fill=255)), BRONZE, 5, spec=0.5)
    grip_m = mask(W, H, lambda d, k: d.rounded_rectangle([17 * k, 204 * k, 33 * k, 262 * k], radius=5 * k, fill=255))
    grip = darken_lines(lit(grip_m, LEATHER, 8, grain=1.0, grain_dir='v', seed=5), _wrap_lines(H, W, 206, 262, 8) * grip_m, 0.5)
    pommel = lit(mask(W, H, lambda d, k: d.ellipse([14 * k, 258 * k, 36 * k, 280 * k], fill=255)), BRONZE, 8, spec=0.5)
    return stack((W, H), [(b, (0, 0)), (guard, (0, 0)), (grip, (0, 0)), (pommel, (0, 0))]), (25.0, 234.0)


def make_maul():
    """工兵木槌：粗木柄、包鐵橫向槌頭（輪廓是一個大「T」，與長槍、刀都分得開）。"""
    W, H = 160, 430
    shaft_m = mask(W, H, lambda d, k: d.rounded_rectangle([67 * k, 90 * k, 93 * k, 424 * k], radius=8 * k, fill=255))
    shaft = lit(shaft_m, WOOD, 11, grain=1.6, grain_dir='v', seed=7)
    head_m = mask(W, H, lambda d, k: d.rounded_rectangle([6 * k, 10 * k, 154 * k, 104 * k], radius=14 * k, fill=255))
    head = lit(head_m, WOOD, 28, grain=1.4, grain_dir='h', seed=9)
    caps = []
    for x0, x1 in ((4, 30), (130, 156)):
        cap_m = mask(W, H, lambda d, k, x0=x0, x1=x1: d.rounded_rectangle([x0 * k, 8 * k, x1 * k, 106 * k], radius=10 * k, fill=255))
        caps.append((lit(cap_m, STEEL, 12, spec=0.6), (0, 0)))
    band_m = mask(W, H, lambda d, k: d.rectangle([66 * k, 98 * k, 94 * k, 118 * k], fill=255))
    band = lit(band_m, STEEL, 7, spec=0.5)
    pommel = lit(mask(W, H, lambda d, k: d.ellipse([62 * k, 410 * k, 98 * k, 430 * k], fill=255)), BRONZE, 7)
    return stack((W, H), [(shaft, (0, 0)), (head, (0, 0)), *caps, (band, (0, 0)), (pommel, (0, 0))]), (80.0, 332.0)


def make_staff():
    """醫護藥杖：細木杖、頂端掛金黃葫蘆與白布條；葫蘆是兵種辨識記號。"""
    W, H = 96, 410
    shaft_m = mask(W, H, lambda d, k: d.rounded_rectangle([40 * k, 70 * k, 56 * k, 404 * k], radius=6 * k, fill=255))
    shaft = lit(shaft_m, WOOD, 8, grain=1.4, grain_dir='v', seed=11)
    hook = mask(W, H, lambda d, k: d.arc([22 * k, 36 * k, 66 * k, 90 * k], 190, 360, fill=255, width=int(8 * k)))
    hook = lit(hook, WOOD, 4)
    g1 = lit(mask(W, H, lambda d, k: d.ellipse([22 * k, 84 * k, 66 * k, 124 * k], fill=255)), BAMBOO, 20, spec=0.6)
    g2 = lit(mask(W, H, lambda d, k: d.ellipse([14 * k, 118 * k, 82 * k, 188 * k], fill=255)), BAMBOO, 34, spec=0.7)
    cork = lit(mask(W, H, lambda d, k: d.ellipse([36 * k, 74 * k, 52 * k, 92 * k], fill=255)), WOOD, 6)
    cloth = lit(mask(W, H, lambda d, k: d.polygon([(48 * k, 124 * k), (84 * k, 150 * k), (90 * k, 204 * k), (72 * k, 188 * k), (60 * k, 210 * k), (50 * k, 150 * k)], fill=255)), CLOTH_WHITE, 10, grain=0.8, seed=13)
    return stack((W, H), [(shaft, (0, 0)), (hook, (0, 0)), (cork, (0, 0)), (g1, (0, 0)), (g2, (0, 0)), (cloth, (0, 0))]), (48.0, 300.0)


def make_oar():
    """水軍船槳：長木柄＋寬槳葉（海綠條紋）。槳葉寬扁，是水軍專屬輪廓。"""
    W, H = 108, 450
    shaft_m = mask(W, H, lambda d, k: d.rounded_rectangle([44 * k, 150 * k, 64 * k, 444 * k], radius=7 * k, fill=255))
    shaft = lit(shaft_m, WOOD, 9, grain=1.4, grain_dir='v', seed=15)
    blade_m = mask(W, H, lambda d, k: d.polygon([(54 * k, 4 * k), (88 * k, 20 * k), (100 * k, 80 * k), (82 * k, 168 * k), (66 * k, 182 * k), (42 * k, 182 * k), (26 * k, 168 * k), (8 * k, 80 * k), (20 * k, 20 * k)], fill=255))
    blade = lit(blade_m, WOOD, 26, grain=1.5, grain_dir='v', seed=17)
    stripe_m = mask(W, H, lambda d, k: d.polygon([(8 * k, 92 * k), (100 * k, 92 * k), (96 * k, 118 * k), (12 * k, 118 * k)], fill=255)) * blade_m
    stripe = lit(stripe_m, SEA_GREEN, 6, spec=0.3)
    return stack((W, H), [(shaft, (0, 0)), (blade, (0, 0)), (stripe, (0, 0))]), (54.0, 350.0)


def make_halberd(spear_img, shaft_pts, tip_y=100):
    """大戟士方天戟：在既有長槍圖上、槍頭下方兩側各加一彎月刃。shaft_pts 為槍桿中心線兩點 ((x0,y0),(x1,y1))。回傳 (圖, 左補寬)。"""
    (x0, y0), (x1, y1) = shaft_pts
    padl, padr = 56, 56
    base = pad(spear_img, padl, 0, padr, 0)
    W, H = base.size
    cx = lambda y: x0 + (y - y0) * (x1 - x0) / (y1 - y0) + padl
    cy = tip_y + 48

    def crescent(side):
        c = cx(cy)
        def draw(d, k):
            pts = []
            for t in np.linspace(-1, 1, 24):   # 外弧
                y = cy + t * 60
                x = c + side * (6 + 50 * (1 - t * t) ** 0.8)
                pts.append((x * k, y * k))
            for t in np.linspace(1, -1, 24):   # 內弧
                y = cy + t * 40
                x = c + side * (6 + 18 * (1 - t * t))
                pts.append((x * k, y * k))
            d.polygon(pts, fill=255)
        m = mask(W, H, draw)
        return lit(m, STEEL, 10, spec=0.65)
    return stack((W, H), [(base, (0, 0)), (crescent(-1), (0, 0)), (crescent(1), (0, 0))]), padl


# ───────────── 副手持物（盾、藥箱、木板） ─────────────

def make_tower_shield(round_shield, size=(190, 270)):
    """塔盾：把既有圓盾貼圖拉成圓角長方，再重畫一圈銅邊；遮住軀幹一半以上，是盾兵的主輪廓。"""
    w, h = size
    face = round_shield.resize((w, h), Image.LANCZOS)
    body = mask(w, h, lambda d, k: d.rounded_rectangle([2 * k, 2 * k, (w - 3) * k, (h - 3) * k], radius=34 * k, fill=255))
    inner = mask(w, h, lambda d, k: d.rounded_rectangle([14 * k, 14 * k, (w - 15) * k, (h - 15) * k], radius=24 * k, fill=255))
    rim = np.clip(body - inner, 0, 1)
    face_a = np.asarray(face).astype(np.float32)
    face_a[..., 3] = 255
    face_img = Image.fromarray(face_a.astype(np.uint8), 'RGBA')
    face_img.putalpha(Image.fromarray((inner * 255).astype(np.uint8)))
    rim_img = lit(rim, BRONZE, 8, spec=0.55)
    # 兩條橫向鐵箍
    straps = []
    for fy in (0.3, 0.72):
        sm = mask(w, h, lambda d, k, fy=fy: d.rectangle([8 * k, (h * fy - 6) * k, (w - 9) * k, (h * fy + 6) * k], fill=255)) * body
        straps.append((lit(sm, STEEL, 5, spec=0.5), (0, 0)))
    out = stack((w, h), [(face_img, (0, 0)), *straps, (rim_img, (0, 0))])
    return out


def make_buckler(round_shield, scale):
    """小圓盾：同一張圓盾貼圖縮小，步兵與水軍副手用。"""
    return round_shield.resize((int(round_shield.width * scale), int(round_shield.height * scale)), Image.LANCZOS)


def make_rattan_shield(size=118):
    """水軍藤盾：同心織紋的圓盾，海綠邊。"""
    s = size
    body = mask(s, s, lambda d, k: d.ellipse([2 * k, 2 * k, (s - 3) * k, (s - 3) * k], fill=255))
    inner = mask(s, s, lambda d, k: d.ellipse([11 * k, 11 * k, (s - 12) * k, (s - 12) * k], fill=255))
    face = lit(inner, BAMBOO, s * 0.45, spec=0.35, grain=1.0, seed=19)
    rings = mask(s, s, lambda d, k: [d.ellipse([(s / 2 - r) * k, (s / 2 - r) * k, (s / 2 + r) * k, (s / 2 + r) * k], outline=255, width=int(1.6 * k)) for r in range(8, int(s / 2) - 10, 9)])
    face = darken_lines(face, rings * inner, 0.5)
    rim = lit(np.clip(body - inner, 0, 1), SEA_GREEN, 6, spec=0.4)
    boss = lit(mask(s, s, lambda d, k: d.ellipse([(s / 2 - 13) * k, (s / 2 - 13) * k, (s / 2 + 13) * k, (s / 2 + 13) * k], fill=255)), BRONZE, 12, spec=0.6)
    return stack((s, s), [(face, (0, 0)), (rim, (0, 0)), (boss, (0, 0))])


def make_medic_box(w=128, h=104):
    """藥箱：木箱、鐵包角、白色貼紙上的紅十字。握在遠手前方。"""
    body = mask(w, h, lambda d, k: d.rounded_rectangle([2 * k, 8 * k, (w - 3) * k, (h - 3) * k], radius=10 * k, fill=255))
    box = lit(body, WOOD, 26, grain=1.3, grain_dir='h', seed=21)
    lid = darken_lines(box, mask(w, h, lambda d, k: d.line([(4 * k, 34 * k), ((w - 4) * k, 34 * k)], fill=255, width=int(2.5 * k))) * body, 0.55)
    corners = []
    for x0, x1 in ((0, 26), (w - 27, w)):
        cm = mask(w, h, lambda d, k, x0=x0, x1=x1: d.rounded_rectangle([x0 * k, 6 * k, x1 * k, (h - 1) * k], radius=9 * k, fill=255)) * (1 - mask(w, h, lambda d, k, x0=x0, x1=x1: d.rectangle([(x0 + 5) * k, 0, (x1 - 5) * k, h * k], fill=255)) * 0)
        corners.append((lit(cm, STEEL, 6, spec=0.5), (0, 0)))
    label = lit(mask(w, h, lambda d, k: d.rounded_rectangle([40 * k, 42 * k, 88 * k, 90 * k], radius=6 * k, fill=255)), CLOTH_WHITE, 10, spec=0.2)
    cross = lit(mask(w, h, lambda d, k: (d.rectangle([60 * k, 48 * k, 68 * k, 84 * k], fill=255), d.rectangle([46 * k, 61 * k, 82 * k, 69 * k], fill=255))), RED, 3, spec=0.2)
    handle = lit(mask(w, h, lambda d, k: d.arc([40 * k, -6 * k, 88 * k, 26 * k], 180, 360, fill=255, width=int(5 * k))), LEATHER, 3)
    return stack((w, h), [(lid, (0, 0)), *corners, (label, (0, 0)), (cross, (0, 0)), (handle, (0, 0))])


def make_plank_board(w=124, h=176):
    """工兵木幔板：橫拼木板加鐵箍的方板，當成簡易掩體舉在身前。"""
    body = mask(w, h, lambda d, k: d.rounded_rectangle([2 * k, 2 * k, (w - 3) * k, (h - 3) * k], radius=10 * k, fill=255))
    board = lit(body, WOOD, 30, grain=1.5, grain_dir='h', seed=23)
    seams = mask(w, h, lambda d, k: [d.line([(2 * k, y * k), ((w - 2) * k, y * k)], fill=255, width=int(2.2 * k)) for y in range(34, h - 10, 34)])
    board = darken_lines(board, seams * body, 0.6)
    straps = []
    for x0 in (12, w - 30):
        sm = mask(w, h, lambda d, k, x0=x0: d.rectangle([x0 * k, 0, (x0 + 18) * k, h * k], fill=255)) * body
        straps.append((lit(sm, STEEL, 6, spec=0.5), (0, 0)))
    return stack((w, h), [(board, (0, 0)), *straps])


# ───────────── 頭飾（疊在既有頭盔圖上；回傳新頭圖與「頭圖左上補寬」供調整握點） ─────────────

def head_with_crest(head, color=BLACK, length=70):
    """盾兵：盔頂短鬃（黑色），往腦後（圖左）披落。"""
    top = 46
    base = pad(head, 0, top, 0, 0)
    W, H = base.size
    cx = 112
    def draw(d, k):
        for i in range(60):
            r = np.random.default_rng(i)
            x0 = cx - 6 + r.random() * 16
            sway = -(18 + r.random() * length * 0.9)
            d.line([(x0 * k, (top + 14) * k), ((x0 + sway * 0.5) * k, (top - 24 + r.random() * 8) * k), ((x0 + sway) * k, (top + 12 + r.random() * 30) * k)], fill=255, width=int((3.2 + r.random() * 2) * k))
    crest = lit(mask(W, H, draw), color, 14, spec=0.35, grain=1.2, grain_dir='h', seed=31)
    return stack((W, H), [(crest, (0, 0)), (base, (0, 0))]), (0, top)


def head_with_tuft(head, colors=ORANGE):
    """步兵：盔頂橘紅短纓，往後飄。"""
    top = 40
    base = pad(head, 0, top, 0, 0)
    W, H = base.size
    cx = 108
    def draw(d, k):
        d.polygon([(cx * k, (top + 14) * k), ((cx - 52) * k, (top + 0) * k), ((cx - 76) * k, (top + 30) * k), ((cx - 30) * k, (top + 28) * k), ((cx + 6) * k, (top + 22) * k)], fill=255)
    tuft = lit(mask(W, H, draw), colors, 12, spec=0.35, grain=1.0, grain_dir='h', seed=33)
    return stack((W, H), [(tuft, (0, 0)), (base, (0, 0))]), (0, top)


def head_with_bamboo_hat(head):
    """工兵：斗笠。寬帽簷蓋過頭盔，輪廓與其他兵種差別最大。"""
    left, right, top = 62, 34, 38
    base = pad(head, left, top, right, 0)
    W, H = base.size
    cx = left + 112
    brim_y = top + 92
    cone = mask(W, H, lambda d, k: d.polygon([(cx * k, (brim_y - 74) * k), ((cx + 104) * k, (brim_y + 2) * k), ((cx - 104) * k, (brim_y + 2) * k)], fill=255))
    brim = mask(W, H, lambda d, k: d.ellipse([(cx - 124) * k, (brim_y - 20) * k, (cx + 124) * k, (brim_y + 22) * k], fill=255))
    hat = np.clip(np.maximum(cone, brim), 0, 1)
    hat_img = lit(hat, BAMBOO, 30, spec=0.4, grain=1.4, grain_dir='h', seed=35)
    weave = mask(W, H, lambda d, k: [d.line([(cx * k, (brim_y - 74) * k), ((cx - 104 + 26 * i) * k, (brim_y + 2) * k)], fill=255, width=int(1.4 * k)) for i in range(9)])
    hat_img = darken_lines(hat_img, weave * hat, 0.35)
    rim = lit(mask(W, H, lambda d, k: d.ellipse([(cx - 124) * k, (brim_y - 20) * k, (cx + 124) * k, (brim_y + 22) * k], outline=255, width=int(5 * k))), BRONZE, 3, spec=0.2)
    strap = lit(mask(W, H, lambda d, k: d.line([((cx - 58) * k, (brim_y + 8) * k), ((cx - 40) * k, (brim_y + 62) * k)], fill=255, width=int(5 * k))), LEATHER, 2)
    return stack((W, H), [(base, (0, 0)), (hat_img, (0, 0)), (rim, (0, 0)), (strap, (0, 0))]), (left, top)


def head_with_cloth(head, colors, cross=False, tail=True):
    """醫護白布罩（帶紅十字）／水軍海綠頭巾：包住盔頂，腦後打結垂尾。"""
    top = 16
    base = pad(head, 0, top, 0, 0)
    W, H = base.size
    cx = 110
    cover = mask(W, H, lambda d, k: d.ellipse([(cx - 100) * k, (top + 4) * k, (cx + 92) * k, (top + 112) * k], fill=255))
    lower_cut = mask(W, H, lambda d, k: d.rectangle([0, (top + 92) * k, W * k, H * k], fill=255))
    cover = np.clip(cover - lower_cut * 0.0, 0, 1)
    cover_img = lit(cover, colors, 40, spec=0.25, grain=0.9, seed=37)
    fold = mask(W, H, lambda d, k: [d.arc([(cx - 100 + 12 * i) * k, (top + 4) * k, (cx + 20 + 12 * i) * k, (top + 112) * k], 100, 260, fill=255, width=int(1.8 * k)) for i in range(0, 8)])
    cover_img = darken_lines(cover_img, fold * cover, 0.22)
    band = lit(mask(W, H, lambda d, k: d.rounded_rectangle([(cx - 102) * k, (top + 88) * k, (cx + 94) * k, (top + 112) * k], radius=10 * k, fill=255)), colors, 14, spec=0.25)
    layers = [(base, (0, 0)), (cover_img, (0, 0)), (band, (0, 0))]
    if tail:
        t = mask(W, H, lambda d, k: d.polygon([((cx - 92) * k, (top + 92) * k), ((cx - 112) * k, (top + 80) * k), ((cx - 112) * k, (top + 128) * k), ((cx - 94) * k, (top + 104) * k)], fill=255))
        layers.append((lit(t, colors, 8, spec=0.2), (0, 0)))
    if cross:
        c = lit(mask(W, H, lambda d, k: (d.rectangle([(cx + 8) * k, (top + 36) * k, (cx + 24) * k, (top + 84) * k], fill=255), d.rectangle([(cx - 8) * k, (top + 52) * k, (cx + 40) * k, (top + 68) * k], fill=255))), RED, 4, spec=0.2)
        layers.append((c, (0, 0)))
    return stack((W, H), layers), (0, top)
