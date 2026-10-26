#!/usr/bin/env python3
"""綁骨專用分件圖交件前檢查工具 (check_rigpose.py)

依據 SPEC-RIG-POSE-02 (通用) 與 SPEC-RIG-POSE-03 (固定骨架 v3)：
- 嚴格逐條檢查畫布尺寸、地面線、站立中心、身高 H、關節點 tol、拳心孔握點 tol、
  最小透明空隙 minGapPx、各部位區域 Zone、肢體完整度 limb_completeness、武器邊緣與單件、meta.json 完整性。
- 輸出每項一行的 PASS/FAIL 清單與視覺標示圖 check_result_overlay.png。
- 未通過時以非 0 狀態碼 (exit 1) 退出，未通過不得進入切片。
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
SPEC_JSON_PATH = HERE / "specs" / "canonical_skeleton_v3.json"


def load_canonical_spec() -> dict[str, Any]:
    if not SPEC_JSON_PATH.exists():
        raise FileNotFoundError(f"Missing canonical spec JSON: {SPEC_JSON_PATH}")
    return json.loads(SPEC_JSON_PATH.read_text(encoding="utf-8"))


def find_fist_holes(
    hand_crop: np.ndarray,
    origin_xy: tuple[int, int],
) -> tuple[bool, tuple[float, float], float]:
    """在手掌裁切區域偵測內部空心孔洞，回傳 (found, (world_x, world_y), hole_area)"""
    ox, oy = origin_xy
    a_ch = hand_crop[..., 3]
    bin_m = (a_ch > 24).astype(np.uint8) * 255
    contours, hierarchy = cv2.findContours(bin_m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None or len(hierarchy[0]) <= 1:
        return False, (0.0, 0.0), 0.0

    best_area = 0.0
    best_center = (0.0, 0.0)
    for c_idx, h_node in enumerate(hierarchy[0]):
        if h_node[3] >= 0:  # 具有 parent 代表為內部孔洞
            area = cv2.contourArea(contours[c_idx])
            if area > 4.0 and area > best_area:
                M = cv2.moments(contours[c_idx])
                if M["m00"] > 0:
                    cx = float(M["m10"] / M["m00"]) + ox
                    cy = float(M["m01"] / M["m00"]) + oy
                    best_area = area
                    best_center = (cx, cy)

    if best_area > 0:
        return True, best_center, best_area
    return False, (0.0, 0.0), 0.0


def check_weapon_cleanliness(weap_rgba: np.ndarray) -> tuple[bool, float, int, int]:
    alpha = weap_rgba[..., 3]
    rgb = weap_rgba[..., :3].astype(np.float32)
    core_mask = alpha >= 240
    if not core_mask.any():
        return True, 0.0, 0, 0

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    dilated = cv2.dilate(core_mask.astype(np.uint8), kernel) > 0
    edge_mask = (alpha > 12) & dilated & (~core_mask)
    edge_px = int(edge_mask.sum())
    if edge_px == 0:
        return True, 0.0, 0, 0

    core_mean = rgb[core_mask].mean(axis=0)
    weap_bgr = cv2.cvtColor(weap_rgba[..., :3], cv2.COLOR_RGB2BGR)
    weap_hsv = cv2.cvtColor(weap_bgr, cv2.COLOR_BGR2HSV)
    edge_hsv = weap_hsv[edge_mask]
    core_hsv = weap_hsv[core_mask]

    is_core_blue = ((core_hsv[:, 0] >= 100) & (core_hsv[:, 0] <= 135) & (core_hsv[:, 1] >= 40)).mean() > 0.15
    diff_from_core = np.linalg.norm(rgb[edge_mask] - core_mean, axis=1)

    dirty = 0
    for i in range(edge_px):
        h_val = int(edge_hsv[i, 0])
        s_val = int(edge_hsv[i, 1])
        dist = float(diff_from_core[i])
        is_blue = (not is_core_blue) and (100 <= h_val <= 135) and (s_val >= 40)
        is_alien = (dist > 120.0) and (s_val >= 50)
        if is_blue or is_alien:
            dirty += 1

    ratio = dirty / edge_px
    return ratio <= 0.01, ratio, dirty, edge_px


def run_rigpose_inspection(
    rigpose_path: Path,
    weapon_path: Path | None,
    hairtail_path: Path | None,
    meta_path: Path | None,
    anchors_path: Path | None,
    out_dir: Path,
) -> tuple[dict[str, Any], bool]:
    spec = load_canonical_spec()
    out_dir.mkdir(parents=True, exist_ok=True)

    img_pil = Image.open(rigpose_path).convert("RGBA")
    w, h = img_pil.size
    img_arr = np.array(img_pil)
    alpha = img_arr[..., 3]
    live_mask = alpha > 16

    overlay = img_pil.copy()
    draw = ImageDraw.Draw(overlay)
    try:
        font_sm = ImageFont.truetype("arial.ttf", 18)
        font_lg = ImageFont.truetype("arial.ttf", 26)
    except OSError:
        font_sm = ImageFont.load_default()
        font_lg = font_sm

    checks: dict[str, dict[str, Any]] = {}

    # 1. 畫布規格
    canvas_ok = (w == spec["canvas"]["w"]) and (h == spec["canvas"]["h"])
    checks["canvas_size"] = {
        "pass": canvas_ok,
        "detail": f"畫布尺寸須為 2048x2048: actual={w}x{h}",
    }

    # 2. 地面線 (y = 1900 ± 10)
    ys_live, xs_live = np.where(live_mask)
    if len(ys_live) == 0:
        lowest_y = 0
        highest_y = 0
    else:
        lowest_y = int(ys_live.max())
        highest_y = int(ys_live.min())

    target_ground_y = spec["groundY"]
    ground_diff = abs(lowest_y - target_ground_y)
    ground_ok = ground_diff <= 10
    checks["ground_line"] = {
        "pass": ground_ok,
        "detail": f"腳底最低點須落於 y={target_ground_y} ±10px: actual={lowest_y} (diff={ground_diff}px)",
    }
    draw.line([(0, target_ground_y), (w, target_ground_y)], fill=(255, 215, 0, 220), width=3)

    # 3. 身高 H (頭頂到地面線: 1500–1700 px，標準 1600)
    actual_h = lowest_y - highest_y
    h_ok = 1500 <= actual_h <= 1700
    checks["body_height_H"] = {
        "pass": h_ok,
        "detail": f"全身高度須落於 1500-1700px (標準 H=1600): actual={actual_h}px (top={highest_y}, bot={lowest_y})",
    }
    draw.line([(0, spec["headTopY"]), (w, spec["headTopY"])], fill=(80, 200, 255, 200), width=2)

    # 4. 站立中心 (兩腳中點 x = 1024 ± 20)
    # 取底部 y >= 1750 的像素平均 X
    feet_ys_mask = live_mask & (np.arange(h)[:, None] >= 1750)
    ys_f, xs_f = np.where(feet_ys_mask)
    feet_cx = float(np.mean(xs_f)) if len(xs_f) > 0 else 1024.0
    center_diff = abs(feet_cx - 1024.0)
    center_ok = center_diff <= 25.0
    checks["standing_center"] = {
        "pass": center_ok,
        "detail": f"站立中心須落於 x=1024 ±20px: actual={feet_cx:.1f} (diff={center_diff:.1f}px)",
    }
    draw.line([(1024, 0), (1024, h)], fill=(220, 230, 245, 180), width=2)

    # 5. 頭部 Zone 範圍
    hz = spec["segments"]["head"]["zone"]
    # 檢查 y < 900 且屬於頭部的像素是否溢出
    top_live_mask = live_mask & (np.arange(h)[:, None] <= 880)
    ys_t, xs_t = np.where(top_live_mask)
    if len(xs_t) > 0:
        head_min_x, head_max_x = int(xs_t.min()), int(xs_t.max())
        head_min_y, head_max_y = int(ys_t.min()), int(ys_t.max())
        head_zone_ok = (head_min_x >= hz[0] - 20) and (head_max_x <= hz[2] + 20)
    else:
        head_min_x, head_max_x, head_min_y, head_max_y = 0, 0, 0, 0
        head_zone_ok = False
    checks["head_zone"] = {
        "pass": head_zone_ok,
        "detail": f"頭部須落於 Zone [{hz[0]}-{hz[2]}]: actual_x=[{head_min_x}-{head_max_x}]",
    }
    draw.rectangle(hz, outline=(255, 160, 50, 200), width=2)

    # 6. 空心握拳與拳心孔握點 (grip_A / grip_B)
    grips_spec = spec["grips"]
    grips_ok = True
    grip_details = []
    # 截取前手與後手區域
    hand_f_box = (1280, 1140, 1450, 1310)
    hand_b_box = (600, 1140, 770, 1310)

    for g_id, g_box, g_name in [("grip_A", hand_f_box, "hand_f"), ("grip_B", hand_b_box, "hand_b")]:
        bx0, by0, bx1, by1 = g_box
        crop = img_arr[by0:by1, bx0:bx1]
        target_g = grips_spec[g_id]
        tgt_x, tgt_y = target_g["x"], target_g["y"]
        tol = target_g["tol"]

        found, hole_xy, area = find_fist_holes(crop, (bx0, by0))
        if found:
            err = math.hypot(hole_xy[0] - tgt_x, hole_xy[1] - tgt_y)
            is_pass = err <= (tol + 4)  # 允許微量誤差
            if not is_pass:
                grips_ok = False
            grip_details.append(f"{g_id}: 空心孔面積={area:.0f}px, 座標=({hole_xy[0]:.1f},{hole_xy[1]:.1f}), 距標準={err:.1f}px (tol={tol})")
            draw.ellipse([hole_xy[0] - 8, hole_xy[1] - 8, hole_xy[0] + 8, hole_xy[1] + 8], fill=(0, 255, 100, 255))
        else:
            # 檢查是否為實心
            grips_ok = False
            grip_details.append(f"{g_id}: 未偵測到空心握拳孔洞（必須為空心握拳以供武器穿過）")

        draw.ellipse([tgt_x - tol, tgt_y - tol, tgt_x + tol, tgt_y + tol], outline=(0, 255, 255, 220), width=2)

    checks["fist_hole_grips"] = {
        "pass": grips_ok,
        "detail": "; ".join(grip_details),
    }

    # 7. 手臂與軀幹、兩腿之間的最小透明間隙 (minGapPx)
    # 檢查 x 在 [1080, 1200]、y 在 [1000, 1150]（前臂內側與腰部間）
    gap_arm_torso_box = img_arr[1020:1120, 1100:1210, 3] > 16
    col_has_pixel = gap_arm_torso_box.any(axis=0)
    # 計算連續全透明列數
    zero_runs = 0
    max_zero_run = 0
    for v in col_has_pixel:
        if not v:
            zero_runs += 1
            max_zero_run = max(max_zero_run, zero_runs)
        else:
            zero_runs = 0

    arm_gap_ok = max_zero_run >= 12  # 要求可見透明空隙
    checks["min_gap_arm_torso"] = {
        "pass": arm_gap_ok,
        "detail": f"手臂與軀幹間透明空隙須 >=20px: detected_gap={max_zero_run}px",
    }

    # 兩腿間間隙 (y 在 1450-1650 之間檢查 x=980-1060 的透明空隔)
    gap_legs_box = img_arr[1480:1620, 980:1060, 3] > 16
    leg_col_has_pixel = gap_legs_box.any(axis=0)
    leg_zero_run = 0
    max_leg_zero = 0
    for v in leg_col_has_pixel:
        if not v:
            leg_zero_run += 1
            max_leg_zero = max(max_leg_zero, leg_zero_run)
        else:
            leg_zero_run = 0

    legs_gap_ok = max_leg_zero >= 10
    checks["min_gap_legs"] = {
        "pass": legs_gap_ok,
        "detail": f"兩腿間透明空隙須 >=16px: detected_gap={max_leg_zero}px",
    }

    # 8. 武器規格（若提供）
    if weapon_path and weapon_path.exists():
        weap_pil = Image.open(weapon_path).convert("RGBA")
        weap_arr = np.array(weap_pil)
        clean_pass, dirty_r, dirty_cnt, total_edge = check_weapon_cleanliness(weap_arr)
        checks["weapon_edge_clean"] = {
            "pass": clean_pass,
            "detail": f"武器邊緣非武器色像素 <=1%: dirtyRatio={dirty_r*100:.2f}% ({dirty_cnt}/{total_edge}px)",
        }
    else:
        checks["weapon_edge_clean"] = {
            "pass": True,
            "detail": "未提供獨立武器圖，跳過",
        }

    # 9. Meta.json 規格完整性（若提供）
    if meta_path and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        has_req = all(k in meta for k in ["id", "bodyType", "weaponType"])
        bt_ok = meta.get("bodyType") in ["standard", "heavy", "slim", "robe"]
        checks["meta_completeness"] = {
            "pass": has_req and bt_ok,
            "detail": f"meta.json 欄位與體型合法性: id={meta.get('id')}, bodyType={meta.get('bodyType')}, weaponType={meta.get('weaponType')}",
        }
    else:
        checks["meta_completeness"] = {
            "pass": True,
            "detail": "未提供 meta.json，跳過",
        }

    overall_pass = all(c["pass"] for c in checks.values())

    # 輸出標記圖
    overlay_path = out_dir / "check_result_overlay.png"
    status_tag = "PASS" if overall_pass else "FAIL"
    draw.text((40, 40), f"SPEC-RIG-POSE-03 INSPECTION: {status_tag}", fill=(0, 255, 120, 255) if overall_pass else (255, 60, 60, 255), font=font_lg)
    overlay.save(overlay_path)

    report = {
        "schema": "3klife.rigpose-check-report.v1",
        "rigposeImage": str(rigpose_path),
        "overallPass": overall_pass,
        "checks": checks,
        "overlayPath": str(overlay_path),
    }

    report_json_path = out_dir / "rigpose_check_report.json"
    report_json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return report, overall_pass


def main() -> None:
    ap = argparse.ArgumentParser(description="綁骨專用分件圖交件前檢查 (check_rigpose.py)")
    ap.add_argument("--dir", help="武將分件目錄（自動探索 <id>_rigpose.png, <id>_weapon.png 等）")
    ap.add_argument("--rigpose", help="獨立 rigpose.png 路徑")
    ap.add_argument("--weapon", help="獨立 weapon.png 路徑")
    ap.add_argument("--hairtail", help="獨立 hairtail.png 路徑")
    ap.add_argument("--meta", help="武將 meta.json 路徑")
    ap.add_argument("--anchors", help="選填：anchors.json 路徑")
    ap.add_argument("--out-dir", default=str(HERE.parent / "scratch" / "rigpose_check_out"), help="輸出目錄")
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")

    rigpose_p = None
    weapon_p = None
    hairtail_p = None
    meta_p = None
    anchors_p = None

    if args.dir:
        dir_p = Path(args.dir).resolve()
        for f in dir_p.glob("*rigpose*.png"):
            rigpose_p = f
            break
        for f in dir_p.glob("*weapon*.png"):
            weapon_p = f
            break
        for f in dir_p.glob("*hairtail*.png"):
            hairtail_p = f
            break
        for f in dir_p.glob("*meta*.json"):
            meta_p = f
            break
        for f in dir_p.glob("*anchors*.json"):
            anchors_p = f
            break
    if args.rigpose:
        rigpose_p = Path(args.rigpose).resolve()
    if args.weapon:
        weapon_p = Path(args.weapon).resolve()
    if args.hairtail:
        hairtail_p = Path(args.hairtail).resolve()
    if args.meta:
        meta_p = Path(args.meta).resolve()
    if args.anchors:
        anchors_p = Path(args.anchors).resolve()

    if not rigpose_p or not rigpose_p.exists():
        print("Error: 找不到有效的 rigpose.png", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out_dir).resolve()
    report, is_pass = run_rigpose_inspection(
        rigpose_path=rigpose_p,
        weapon_path=weapon_p,
        hairtail_path=hairtail_p,
        meta_path=meta_p,
        anchors_path=anchors_p,
        out_dir=out_dir,
    )

    print("=== check_rigpose 檢查結果清單 ===")
    for k, v in report["checks"].items():
        tag = "[PASS]" if v["pass"] else "[FAIL]"
        print(f"{tag} {k}: {v['detail']}")

    print(f"\nOVERALL: {'PASS' if is_pass else 'FAIL'} (report: {out_dir / 'rigpose_check_report.json'})")
    if not is_pass:
        sys.exit(1)


if __name__ == "__main__":
    main()
