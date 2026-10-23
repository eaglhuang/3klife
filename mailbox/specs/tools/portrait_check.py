"""立繪自動驗收（WBS 3.8，規格見 立繪提示詞模板v1.md 末段）。

用法：python portrait_check.py <out_dir> <png> [<png> ...]
輸出：<out_dir>/portrait-check.json、<out_dir>/silhouette-sheet.png（64px 剪影＋灰階縮圖並排）
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SIZES = {(1024, 1536), (2048, 3072)}
CORNER = 16
FILL_MIN, FILL_MAX = 0.90, 0.96


def check(path):
    im = Image.open(path)
    res = {"file": str(path), "size": list(im.size), "errors": [], "warnings": []}
    if im.size not in SIZES:
        res["errors"].append(f"尺寸 {im.size[0]}x{im.size[1]} 不是 1024x1536 或 2048x3072")
    if im.mode != "RGBA":
        res["errors"].append(f"沒有 alpha 通道（mode={im.mode}）")
        return res, None
    a = im.getchannel("A")
    w, h = im.size
    corners = [(0, 0), (w - CORNER, 0), (0, h - CORNER), (w - CORNER, h - CORNER)]
    dirty = [c for c in corners if a.crop((c[0], c[1], c[0] + CORNER, c[1] + CORNER)).getextrema()[1] > 0]
    if dirty:
        # 規格允許武器斜向出框角，所以只警告，由人工確認是不是武器
        res["warnings"].append(f"四角 alpha 不為 0：{len(dirty)} 角（若是武器出框可接受）")
    bbox = a.point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        res["errors"].append("整張全透明")
        return res, None
    fill = (bbox[3] - bbox[1]) / h
    res["bbox"] = list(bbox)
    res["heightFill"] = round(fill, 3)
    if fill < FILL_MIN:
        res["errors"].append(f"角色高度佔比 {fill:.1%}，低於 90%")
    elif fill > FILL_MAX:
        # 外框含飄帶與武器，六人基準都在 98%～100%，超過只警告
        res["warnings"].append(f"角色高度佔比 {fill:.1%}，高於 96%（請確認頭頂與腳底沒有被切）")
    semi = sum(a.histogram()[9:247])
    res["semiAlphaRatio"] = round(semi / (w * h), 4)
    res["pass"] = not res["errors"]
    return res, im


def thumbs(im, target_h=64):
    a = im.getchannel("A")
    sil = Image.new("L", im.size, 255)
    sil.paste(0, mask=a.point(lambda v: 255 if v > 64 else 0))
    gray = Image.new("RGB", im.size, (128, 128, 128))
    gray.paste(im.convert("L").convert("RGB"), mask=a)
    scale = target_h / im.size[1]
    size = (max(1, round(im.size[0] * scale)), target_h)
    return sil.resize(size, Image.LANCZOS).convert("RGB"), gray.resize((size[0] * 2, target_h * 2), Image.LANCZOS)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    results, tiles = [], []
    for p in sys.argv[2:]:
        res, im = check(p)
        results.append(res)
        if im is not None:
            tiles.append((Path(p).stem, *thumbs(im)))
    (out / "portrait-check.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    if tiles:
        col = max(t[2].size[0] for t in tiles) + 16
        sheet = Image.new("RGB", (col * len(tiles), 64 + 128 + 40), (40, 40, 44))
        d = ImageDraw.Draw(sheet)
        for i, (name, sil, gray) in enumerate(tiles):
            x = i * col + 8
            sheet.paste(sil, (x, 4))
            sheet.paste(gray, (x, 72))
            d.text((x, 204), name[:18], fill=(255, 220, 120))
        sheet.save(out / "silhouette-sheet.png")
    for r in results:
        print(("PASS " if r.get("pass") else "FAIL ") + Path(r["file"]).name, "；".join(r["errors"] + r.get("warnings", [])))


if __name__ == "__main__":
    main()
