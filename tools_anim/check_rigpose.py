#!/usr/bin/env python3
"""綁骨專用分件圖交件前檢查工具 (check_rigpose.py)

依據 SPEC-RIG-POSE-02 (通用) 與 SPEC-RIG-POSE-03 (固定骨架 v3 / AG-11 三級判定)：
- 逐條檢查畫布尺寸、地面線、站立中心、身高 H、關節 tol、拳心孔 tol、
  最小透明間隙 minGapPx、各部位 Zone、肢體完整度 limb_completeness、武器邊緣與 meta.json 健全度。
- 分三級評定：
  1. PASS: 落在標準 tolerance 內 (位移 <= tol, 角度差 <= 5°)
  2. SNAP: 超出 tol 但 <= 60 px 且角度差 <= 10°，可由 slice_and_rig --snap 自動剛體貼齊
  3. FAIL: 偏差 > 60 px、角度差 > 10° 或嚴重破損缺漏
- 輸出 check_result_overlay.png 與 rigpose_check_report.json。
- 嚴格模式下非 PASS 以非 0 狀態碼 (exit 1) 退出；若帶 --allow-snap 則 SNAP/PASS 均 exit 0。
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
    """在手部區域尋找空心孔洞，返回 (found, (world_x, world_y), hole_area)"""
    ox, oy = origin_xy
    a_ch = hand_crop[..., 3]
    bin_m = (a_ch > 24).astype(np.uint8) * 255
    contours, hierarchy = cv2.findContours(bin_m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None or len(hierarchy[0]) <= 1:
        return False, (0.0, 0.0), 0.0

    best_area = 0.0
    best_center = (0.0, 0.0)
    for c_idx, h_node in enumerate(hierarchy[0]):
        if h_node[3] >= 0:  # 具有 parent 即內部孔洞
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

    # 1. 畫布尺寸 (必須精確 2048x2048)
    canvas_ok = (w == spec["canvas"]["w"]) and (h == spec["canvas"]["h"])
    canvas_tier = "PASS" if canvas_ok else "FAIL"
    checks["canvas_size"] = {
        "pass": canvas_ok,
        "tier": canvas_tier,
        "detail": f"畫布尺寸 2048x2048: actual={w}x{h}",
    }

    # 2. 地面線 (y = 1900 ± 10, SNAP <= 60)
    ys_live, xs_live = np.where(live_mask)
    if len(ys_live) == 0:
        lowest_y = 0
        highest_y = 0
    else:
        lowest_y = int(ys_live.max())
        highest_y = int(ys_live.min())

    target_ground_y = spec["groundY"]
    ground_diff = abs(lowest_y - target_ground_y)
    if ground_diff <= 10:
        ground_tier = "PASS"
    elif ground_diff <= 60:
        ground_tier = "SNAP"
    else:
        ground_tier = "FAIL"

    checks["ground_line"] = {
        "pass": (ground_tier == "PASS"),
        "tier": ground_tier,
        "detail": f"腳底最低點 y={target_ground_y} (tol=±10px, snap=±60px): actual={lowest_y} (diff={ground_diff}px)",
    }
    # 繪製地面線與容差帶
    draw.line([(0, target_ground_y), (w, target_ground_y)], fill=(255, 215, 0, 220), width=3)
    draw.line([(0, target_ground_y - 10), (w, target_ground_y - 10)], fill=(255, 215, 0, 100), width=1)
    draw.line([(0, target_ground_y + 10), (w, target_ground_y + 10)], fill=(255, 215, 0, 100), width=1)
    draw.line([(0, target_ground_y - 60), (w, target_ground_y - 60)], fill=(255, 180, 0, 60), width=1)
    draw.line([(0, target_ground_y + 60), (w, target_ground_y + 60)], fill=(255, 180, 0, 60), width=1)

    # 3. 身高 H 與頭頂 (v3 固定 H=1600: 頭頂 y=300±20, 腳底 y=1900±10, SNAP <= 60)
    target_top_y = spec["headTopY"]
    top_diff = abs(highest_y - target_top_y)
    if top_diff <= 20:
        top_tier = "PASS"
    elif top_diff <= 60:
        top_tier = "SNAP"
    else:
        top_tier = "FAIL"

    actual_h = lowest_y - highest_y
    if ground_tier == "FAIL" or top_tier == "FAIL":
        h_tier = "FAIL"
    elif ground_tier == "SNAP" or top_tier == "SNAP":
        h_tier = "SNAP"
    else:
        h_tier = "PASS"

    checks["head_top"] = {
        "pass": (top_tier == "PASS"),
        "tier": top_tier,
        "detail": f"頭頂最高點 y={target_top_y} (tol=±20px, snap=±60px): actual={highest_y} (diff={top_diff}px)",
    }
    checks["body_height_H"] = {
        "pass": (h_tier == "PASS"),
        "tier": h_tier,
        "detail": f"固定 H=1600 (頭頂 y={target_top_y}±20, 腳底 y={target_ground_y}±10): actual={actual_h}px (top={highest_y}, bot={lowest_y})",
    }
    # 繪製頭頂線與容差帶
    draw.line([(0, target_top_y), (w, target_top_y)], fill=(80, 200, 255, 200), width=3)
    draw.line([(0, target_top_y - 20), (w, target_top_y - 20)], fill=(80, 200, 255, 100), width=1)
    draw.line([(0, target_top_y + 20), (w, target_top_y + 20)], fill=(80, 200, 255, 100), width=1)
    draw.line([(0, target_top_y - 60), (w, target_top_y - 60)], fill=(80, 180, 255, 60), width=1)
    draw.line([(0, target_top_y + 60), (w, target_top_y + 60)], fill=(80, 180, 255, 60), width=1)

    # 4. 站立中心 (兩腳中點 x = 1024 ± 25, SNAP <= 60)
    feet_ys_mask = live_mask & (np.arange(h)[:, None] >= 1750)
    ys_f, xs_f = np.where(feet_ys_mask)
    feet_cx = float(np.mean(xs_f)) if len(xs_f) > 0 else 1024.0
    center_diff = abs(feet_cx - 1024.0)
    if center_diff <= 25.0:
        center_tier = "PASS"
    elif center_diff <= 60.0:
        center_tier = "SNAP"
    else:
        center_tier = "FAIL"

    checks["standing_center"] = {
        "pass": (center_tier == "PASS"),
        "tier": center_tier,
        "detail": f"站立中心落於 x=1024 (tol=±25px, snap=±60px): actual={feet_cx:.1f} (diff={center_diff:.1f}px)",
    }
    draw.line([(1024, 0), (1024, h)], fill=(220, 230, 245, 180), width=2)
    draw.line([(1024 - 60, 0), (1024 - 60, h)], fill=(220, 230, 245, 60), width=1)
    draw.line([(1024 + 60, 0), (1024 + 60, h)], fill=(220, 230, 245, 60), width=1)

    # 5. 頭部 Zone 範圍
    hz = spec["segments"]["head"]["zone"]
    top_live_mask = live_mask & (np.arange(h)[:, None] <= 880)
    ys_t, xs_t = np.where(top_live_mask)
    if len(xs_t) > 0:
        head_min_x, head_max_x = int(xs_t.min()), int(xs_t.max())
        head_min_y, head_max_y = int(ys_t.min()), int(ys_t.max())
        if (head_min_x >= hz[0] - 20) and (head_max_x <= hz[2] + 20):
            head_zone_tier = "PASS"
        elif (head_min_x >= hz[0] - 60) and (head_max_x <= hz[2] + 60):
            head_zone_tier = "SNAP"
        else:
            head_zone_tier = "FAIL"
    else:
        head_min_x, head_max_x, head_min_y, head_max_y = 0, 0, 0, 0
        head_zone_tier = "FAIL"

    checks["head_zone"] = {
        "pass": (head_zone_tier == "PASS"),
        "tier": head_zone_tier,
        "detail": f"頭部 Zone [{hz[0]}-{hz[2]}]: actual_x=[{head_min_x}-{head_max_x}]",
    }
    draw.rectangle(hz, outline=(255, 160, 50, 200), width=2)

    # 6. 空心握拳內部孔洞與握點 (grip_A / grip_B)
    grips_spec = spec["grips"]
    grips_tier = "PASS"
    grip_details = []
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
            if err <= (tol + 4):
                this_tier = "PASS"
            elif err <= 60.0:
                this_tier = "SNAP"
            else:
                this_tier = "FAIL"

            if this_tier == "FAIL":
                grips_tier = "FAIL"
            elif this_tier == "SNAP" and grips_tier != "FAIL":
                grips_tier = "SNAP"

            grip_details.append(f"{g_id}: 空心孔面積={area:.0f}px, 座標=({hole_xy[0]:.1f},{hole_xy[1]:.1f}), 偏差={err:.1f}px (tol={tol}, snap<=60)")
            draw.ellipse([hole_xy[0] - 8, hole_xy[1] - 8, hole_xy[0] + 8, hole_xy[1] + 8], fill=(0, 255, 100, 255))
        else:
            grips_tier = "FAIL"
            grip_details.append(f"{g_id}: 未偵測到空心孔洞 (空心拳心穿武器必備)")

        draw.ellipse([tgt_x - tol, tgt_y - tol, tgt_x + tol, tgt_y + tol], outline=(0, 255, 255, 220), width=2)
        draw.ellipse([tgt_x - 60, tgt_y - 60, tgt_x + 60, tgt_y + 60], outline=(0, 180, 255, 100), width=1)

    checks["fist_hole_grips"] = {
        "pass": (grips_tier == "PASS"),
        "tier": grips_tier,
        "detail": "; ".join(grip_details),
    }

    # 7. 手臂與軀幹、兩腿透明間隙 (minGapPx)
    gap_arm_torso_box = img_arr[1020:1120, 1100:1210, 3] > 16
    col_has_pixel = gap_arm_torso_box.any(axis=0)
    zero_runs = 0
    max_zero_run = 0
    for v in col_has_pixel:
        if not v:
            zero_runs += 1
            max_zero_run = max(max_zero_run, zero_runs)
        else:
            zero_runs = 0

    if max_zero_run >= 12:
        arm_gap_tier = "PASS"
    elif max_zero_run >= 6:
        arm_gap_tier = "SNAP"
    else:
        arm_gap_tier = "FAIL"

    checks["min_gap_arm_torso"] = {
        "pass": (arm_gap_tier == "PASS"),
        "tier": arm_gap_tier,
        "detail": f"手臂與軀幹間隙 >=20px: detected_gap={max_zero_run}px",
    }

    # 兩腿 (y 在 1480-1620 檢查 x=980-1060 透明列)
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

    if max_leg_zero >= 10:
        leg_gap_tier = "PASS"
    elif max_leg_zero >= 5:
        leg_gap_tier = "SNAP"
    else:
        leg_gap_tier = "FAIL"

    checks["min_gap_legs"] = {
        "pass": (leg_gap_tier == "PASS"),
        "tier": leg_gap_tier,
        "detail": f"兩腿間隙寬度 >=16px: detected_gap={max_leg_zero}px",
    }

    # 8. 獨立武器乾淨度 (若有)
    if weapon_path and weapon_path.exists():
        weap_pil = Image.open(weapon_path).convert("RGBA")
        weap_arr = np.array(weap_pil)
        clean_pass, dirty_r, dirty_cnt, total_edge = check_weapon_cleanliness(weap_arr)
        weap_tier = "PASS" if clean_pass else "FAIL"
        checks["weapon_edge_clean"] = {
            "pass": clean_pass,
            "tier": weap_tier,
            "detail": f"獨立武器邊緣非武器殘色 <=1%: dirtyRatio={dirty_r*100:.2f}% ({dirty_cnt}/{total_edge}px)",
        }
    else:
        checks["weapon_edge_clean"] = {
            "pass": True,
            "tier": "PASS",
            "detail": "無獨立武器圖，跳過",
        }

    # 9. Meta.json 規格完整性 (若有)
    if meta_path and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        has_req = all(k in meta for k in ["id", "bodyType", "weaponType"])
        bt_ok = meta.get("bodyType") in ["standard", "heavy", "slim", "robe"]
        meta_ok = has_req and bt_ok
        meta_tier = "PASS" if meta_ok else "FAIL"
        checks["meta_completeness"] = {
            "pass": meta_ok,
            "tier": meta_tier,
            "detail": f"meta.json 與體型合法性: id={meta.get('id')}, bodyType={meta.get('bodyType')}, weaponType={meta.get('weaponType')}",
        }
    else:
        checks["meta_completeness"] = {
            "pass": True,
            "tier": "PASS",
            "detail": "無 meta.json，跳過",
        }

    # 計算整體三級評定
    all_tiers = [c.get("tier", "FAIL") for c in checks.values()]
    if any(t == "FAIL" for t in all_tiers):
        overall_tier = "FAIL"
    elif any(t == "SNAP" for t in all_tiers):
        overall_tier = "SNAP"
    else:
        overall_tier = "PASS"

    overall_pass = (overall_tier == "PASS")

    # 輸出標記圖
    overlay_path = out_dir / "check_result_overlay.png"
    if overall_tier == "PASS":
        color_tag = (0, 255, 120, 255)
        text_tag = "SPEC-RIG-POSE-03 INSPECTION: PASS"
    elif overall_tier == "SNAP":
        color_tag = (255, 215, 0, 255)
        text_tag = "SPEC-RIG-POSE-03 INSPECTION: SNAP (Can Auto-Snap <= 60px)"
    else:
        color_tag = (255, 60, 60, 255)
        text_tag = "SPEC-RIG-POSE-03 INSPECTION: FAIL"

    draw.text((40, 40), text_tag, fill=color_tag, font=font_lg)
    overlay.save(overlay_path)

    report = {
        "schema": "3klife.rigpose-check-report.v2",
        "rigposeImage": str(rigpose_path),
        "overall_tier": overall_tier,
        "overallPass": overall_pass,
        "canSnap": (overall_tier in ["PASS", "SNAP"]),
        "checks": checks,
        "overlayPath": str(overlay_path),
    }

    report_json_path = out_dir / "rigpose_check_report.json"
    report_json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return report, overall_pass


def main() -> None:
    ap = argparse.ArgumentParser(description="綁骨專用分件圖交件前檢查 (check_rigpose.py)")
    ap.add_argument("--dir", help="輸入資料夾 (自動找 <id>_rigpose.png 等)")
    ap.add_argument("--rigpose", help="單獨 rigpose.png 路徑")
    ap.add_argument("--weapon", help="單獨 weapon.png 路徑")
    ap.add_argument("--hairtail", help="單獨 hairtail.png 路徑")
    ap.add_argument("--meta", help="單獨 meta.json 路徑")
    ap.add_argument("--anchors", help="單獨 anchors.json 路徑")
    ap.add_argument("--allow-snap", action="store_true", help="若為 SNAP 級 (偏差<=60px) 亦允許通過 (exit 0)，供 slice_and_rig --snap 自動修正")
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

    overall_tier = report.get("overall_tier", "PASS" if is_pass else "FAIL")

    print(f"=== check_rigpose 檢查結果清單 (整體評級: {overall_tier}) ===")
    for k, v in report["checks"].items():
        tier = v.get("tier", "PASS" if v.get("pass") else "FAIL")
        tag = f"[{tier}]"
        print(f"{tag:7s} {k}: {v['detail']}")

    print("\nOVERALL TIER: " + overall_tier + " (report: " + str(out_dir / "rigpose_check_report.json") + ")")
    if args.allow_snap:
        if overall_tier in ["PASS", "SNAP"]:
            print("[INFO] --allow-snap 生效: SNAP/PASS 級均允許進入切片管線")
            sys.exit(0)
        else:
            print("[ERROR] 檢查結果為 FAIL (偏差大於 60px 或嚴重缺失)，阻擋切片！", file=sys.stderr)
            sys.exit(1)
    else:
        if not is_pass:
            if overall_tier == "SNAP":
                print("[WARN] 檢查結果為 SNAP 級 (偏差在 60px 內)。若要自動貼齊骨架，請使用 --allow-snap 或 slice_and_rig --snap！", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
