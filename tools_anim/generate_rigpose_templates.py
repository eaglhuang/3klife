#!/usr/bin/env python3
"""綁骨標準骨架 v3 模板圖產生器 (generate_rigpose_templates.py)

依據 SPEC-RIG-POSE-03 (mailbox/specs/綁骨專用分件圖規格v3_固定骨架.md) 與 canonical_skeleton_v3.json，
自動繪製 4 款 2048x2048 模板圖：
- rigpose_template_standard.png
- rigpose_template_heavy.png
- rigpose_template_slim.png
- rigpose_template_robe.png
存放於 tools_anim/templates/。
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
SPEC_JSON_PATH = HERE / "specs" / "canonical_skeleton_v3.json"
TEMPLATES_DIR = HERE / "templates"


def draw_capsule(
    draw: ImageDraw.ImageDraw,
    p0: tuple[float, float],
    p1: tuple[float, float],
    radius: float,
    fill_color: tuple[int, int, int, int],
    outline_color: tuple[int, int, int, int],
    width: int = 2,
) -> None:
    """繪製連接 p0 與 p1、半徑為 radius 的肢體膠囊"""
    x0, y0 = p0
    x1, y1 = p1
    dx = x1 - x0
    dy = y1 - y0
    dist = math.hypot(dx, dy)
    if dist < 1e-4:
        draw.ellipse([x0 - radius, y0 - radius, x0 + radius, y0 + radius], fill=fill_color, outline=outline_color, width=width)
        return

    ux = -dy / dist * radius
    uy = dx / dist * radius

    poly = [
        (x0 + ux, y0 + uy),
        (x1 + ux, y1 + uy),
        (x1 - ux, y1 - uy),
        (x0 - ux, y0 - uy),
    ]
    draw.polygon(poly, fill=fill_color)
    draw.line([(x0 + ux, y0 + uy), (x1 + ux, y1 + uy)], fill=outline_color, width=width)
    draw.line([(x1 - ux, y1 - uy), (x0 - ux, y0 - uy)], fill=outline_color, width=width)

    # 端點半圓
    draw.ellipse([x0 - radius, y0 - radius, x0 + radius, y0 + radius], fill=fill_color, outline=outline_color, width=width)
    draw.ellipse([x1 - radius, y1 - radius, x1 + radius, y1 + radius], fill=fill_color, outline=outline_color, width=width)


def generate_template_for_body_type(spec: dict, body_type: str, out_path: Path) -> None:
    w = spec["canvas"]["w"]
    h = spec["canvas"]["h"]
    ground_y = spec["groundY"]
    head_top_y = spec["headTopY"]
    joints = spec["joints"]
    grips = spec["grips"]
    segs = spec["segments"]

    # 建立 2048x2048 RGBA 畫布，微帶深黑灰棋盤格或微暗底方便直接疊圖
    img = Image.new("RGBA", (w, h), (18, 22, 28, 255))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_ov = ImageDraw.Draw(overlay)

    try:
        font_sm = ImageFont.truetype("arial.ttf", 16)
        font_md = ImageFont.truetype("arial.ttf", 22)
        font_lg = ImageFont.truetype("arial.ttf", 32)
    except OSError:
        font_sm = ImageFont.load_default()
        font_md = font_sm
        font_lg = font_sm

    # 1. 畫背景輔助網格（每 128 px 細線，每 512 px 粗線）
    for x in range(0, w, 128):
        c = (40, 48, 60, 180) if x % 512 != 0 else (65, 75, 95, 230)
        draw_ov.line([(x, 0), (x, h)], fill=c, width=1 if x % 512 != 0 else 2)
    for y in range(0, h, 128):
        c = (40, 48, 60, 180) if y % 512 != 0 else (65, 75, 95, 230)
        draw_ov.line([(0, y), (w, y)], fill=c, width=1 if y % 512 != 0 else 2)

    # 2. 基準標記線：地面線 (y=1900)、站立中心 (x=1024)、頭頂線 (y=300)
    draw_ov.line([(0, ground_y), (w, ground_y)], fill=(255, 215, 0, 255), width=4)
    draw_ov.text((40, ground_y - 36), f"Ground Line (y = {ground_y} px)", fill=(255, 215, 0, 255), font=font_lg)

    draw_ov.line([(1024, 0), (1024, h)], fill=(220, 230, 245, 180), width=2)
    draw_ov.text((1034, 40), "Center (x = 1024 px)", fill=(220, 230, 245, 220), font=font_md)

    draw_ov.line([(0, head_top_y), (w, head_top_y)], fill=(80, 200, 255, 220), width=3)
    draw_ov.text((40, head_top_y - 36), f"Head Top (y = {head_top_y} px, H = {spec['H']} px)", fill=(80, 200, 255, 255), font=font_lg)

    # 3. 頭部允許區域 Zone
    head_z = segs["head"]["zone"]
    draw_ov.rectangle(head_z, fill=(255, 160, 50, 35), outline=(255, 160, 50, 200), width=2)
    draw_ov.text((head_z[0] + 12, head_z[1] + 12), f"Head Zone [{head_z[0]}-{head_z[2]}, {head_z[1]}-{head_z[3]}]", fill=(255, 180, 80, 220), font=font_sm)

    # 4. 腳部允許區域 Zone
    foot_f_z = segs["foot_f"]["zone"]
    foot_b_z = segs["foot_b"]["zone"]
    draw_ov.rectangle(foot_f_z, fill=(0, 220, 200, 40), outline=(0, 220, 200, 220), width=2)
    draw_ov.text((foot_f_z[0] + 8, foot_f_z[1] + 8), "Foot Front Zone", fill=(0, 240, 220, 220), font=font_sm)
    draw_ov.rectangle(foot_b_z, fill=(0, 180, 220, 40), outline=(0, 180, 220, 220), width=2)
    draw_ov.text((foot_b_z[0] + 8, foot_b_z[1] + 8), "Foot Back Zone", fill=(0, 200, 240, 220), font=font_sm)

    # 5. 四肢膠囊繪製（依體型決定半寬）
    def get_half_width(seg_info: dict) -> float:
        hw = seg_info.get("halfWidth")
        if isinstance(hw, str) and hw.startswith("同 "):
            ref_name = hw.replace("同 ", "").strip()
            hw = segs.get(ref_name, {}).get("halfWidth")
        if isinstance(hw, dict):
            b_key = "standard" if body_type not in hw else body_type
            hw_range = hw.get(b_key, [45, 65])
            return float(hw_range[1])  # 繪製最大膠囊包絡線
        return 50.0

    limb_defs = [
        ("upperarm_f", "shoulder_f", "elbow_f"),
        ("forearm_f", "elbow_f", "wrist_f"),
        ("upperarm_b", "shoulder_b", "elbow_b"),
        ("forearm_b", "elbow_b", "wrist_b"),
        ("thigh_f", "hip_f", "knee_f"),
        ("shin_f", "knee_f", "ankle_f"),
        ("thigh_b", "hip_b", "knee_b"),
        ("shin_b", "knee_b", "ankle_b"),
        ("torso", "pelvis", "neck"),
    ]

    for seg_key, j0_name, j1_name in limb_defs:
        p0 = (joints[j0_name]["x"], joints[j0_name]["y"])
        p1 = (joints[j1_name]["x"], joints[j1_name]["y"])
        rad = get_half_width(segs[seg_key])
        color_fill = (60, 140, 255, 30) if "b" not in seg_key else (120, 80, 240, 25)
        color_line = (80, 180, 255, 180) if "b" not in seg_key else (160, 110, 255, 180)
        if seg_key == "torso":
            color_fill = (255, 200, 60, 25)
            color_line = (255, 210, 80, 160)
        draw_capsule(draw_ov, p0, p1, rad, color_fill, color_line, width=2)

    # 若為 robe 體型，畫出裙擺獨立提示框
    if body_type == "robe":
        robe_box = [850, 1300, 1260, 1880]
        draw_ov.rectangle(robe_box, fill=(180, 80, 240, 30), outline=(220, 120, 255, 220), width=3)
        draw_ov.text((robe_box[0] + 16, robe_box[1] + 16), "Robe / Skirt Slot Region (legs underneath)", fill=(230, 150, 255, 240), font=font_md)

    # 6. 手部與拳心孔（握點）
    for g_name, g_info in grips.items():
        gx, gy = g_info["x"], g_info["y"]
        gtol = g_info["tol"]
        # 拳心孔容許公差綠圈 (tol=12)
        draw_ov.ellipse([gx - gtol, gy - gtol, gx + gtol, gy + gtol], fill=(50, 255, 100, 180), outline=(0, 255, 80, 255), width=2)
        # 拳頭最大半徑圓 (r=80)
        draw_ov.ellipse([gx - 80, gy - 80, gx + 80, gy + 80], fill=(50, 255, 100, 20), outline=(50, 255, 100, 120), width=1)
        draw_ov.text((gx + 16, gy - 12), f"{g_name} ({g_info['note']})", fill=(100, 255, 140, 240), font=font_sm)

    # 7. 各關節容差紅框 (tol)
    for j_name, j_info in joints.items():
        jx, jy = j_info["x"], j_info["y"]
        jtol = j_info["tol"]
        box = [jx - jtol, jy - jtol, jx + jtol, jy + jtol]
        draw_ov.rectangle(box, fill=(255, 60, 60, 50), outline=(255, 80, 80, 240), width=2)
        draw_ov.ellipse([jx - 3, jy - 3, jx + 3, jy + 3], fill=(255, 255, 255, 255))
        draw_ov.text((jx + jtol + 4, jy - 10), j_name, fill=(255, 150, 150, 220), font=font_sm)

    # 8. 最小空隙 minGap 標註線
    # 手臂與軀幹 gap >= 20px
    draw_ov.line([(1090, 1080), (1200, 1080)], fill=(255, 120, 220, 240), width=2)
    draw_ov.text((1095, 1055), "minGap >= 20px", fill=(255, 140, 230, 240), font=font_sm)
    # 兩腿間 gap >= 16px
    draw_ov.line([(990, 1580), (1060, 1580)], fill=(255, 120, 220, 240), width=2)
    draw_ov.text((995, 1555), "gap >= 16px", fill=(255, 140, 230, 240), font=font_sm)

    # 9. 標題與體型說明
    title = f"SPEC-RIG-POSE-03 Canonical Rig Template [{body_type.upper()}] (2048x2048)"
    draw_ov.text((40, 50), title, fill=(255, 255, 255, 255), font=font_lg)
    subtitle = "Shared Canonical Skeleton (Fixed Coordinates) | Hard Rules: 4 Limbs >=95% Visible, Arm Separation, Hollow Fist"
    draw_ov.text((40, 95), subtitle, fill=(180, 195, 215, 240), font=font_md)

    # 合成並存檔
    final_img = Image.alpha_composite(img, overlay)
    final_img.save(out_path)
    print(f"Generated template: {out_path} ({body_type})")


def main() -> None:
    if not SPEC_JSON_PATH.exists():
        print(f"Error: {SPEC_JSON_PATH} does not exist", file=sys.stderr)
        sys.exit(1)

    spec = json.loads(SPEC_JSON_PATH.read_text(encoding="utf-8"))
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

    body_types = ["standard", "heavy", "slim", "robe"]
    for bt in body_types:
        out_p = TEMPLATES_DIR / f"rigpose_template_{bt}.png"
        generate_template_for_body_type(spec, bt, out_p)


if __name__ == "__main__":
    main()
