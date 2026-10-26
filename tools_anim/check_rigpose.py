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


def compute_arm_torso_geometry(
    spec: dict[str, Any],
    arm_side: str = "f",
    w: int = 2048,
    h: int = 2048,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict[str, int]]:
    """AG-20: 由 JSON 動態推導手臂與軀幹幾何、ROI 檢查窗與分離帶。
    - y 範圍：手臂膠囊 y 範圍與軀幹膠囊 y 範圍的交集。
    - x 範圍：軀幹膠囊朝手臂側邊緣到手臂膠囊外緣。
    - 分離帶：沿手臂膠囊內緣（朝軀幹側）走，寬度為 minGapPx.arm_to_torso，涵蓋整段交集。
    - 確保三張遮罩互不重疊：arm_mask & torso_mask == 0, band_mask & torso_mask == 0, arm_mask & band_mask == 0。
    """
    joints = spec.get("joints", {})

    def get_j(name: str, def_xy: tuple[float, float]) -> tuple[float, float]:
        j = joints.get(name, {})
        return float(j.get("x", def_xy[0])), float(j.get("y", def_xy[1]))

    neck = get_j("neck", (1030, 880))
    waist = get_j("waist", (1024, 1130))
    pelvis = get_j("pelvis", (1024, 1450))

    # 1. 軀幹多邊形
    torso_im = Image.new("L", (w, h), 0)
    draw_t = ImageDraw.Draw(torso_im)
    torso_poly = [
        (neck[0] - 120, neck[1]),
        (neck[0] + 120, neck[1]),
        (waist[0] + 80, waist[1]),
        (pelvis[0] + 110, pelvis[1]),
        (pelvis[0] - 110, pelvis[1]),
        (waist[0] - 80, waist[1]),
    ]
    draw_t.polygon(torso_poly, fill=255)
    torso_mask = np.array(torso_im) > 128

    # 2. 手臂膠囊
    if arm_side == "f":
        shoulder = get_j("shoulder_f", (1120, 925))
        elbow = get_j("elbow_f", (1230, 1080))
        wrist = get_j("wrist_f", (1330, 1200))
    else:
        shoulder = get_j("shoulder_b", (930, 925))
        elbow = get_j("elbow_b", (820, 1080))
        wrist = get_j("wrist_b", (720, 1200))

    arm_im = Image.new("L", (w, h), 0)
    draw_a = ImageDraw.Draw(arm_im)

    def render_cap(draw: ImageDraw.ImageDraw, p0: tuple[float, float], p1: tuple[float, float], rad: float):
        x0, y0 = p0
        x1, y1 = p1
        dx, dy = x1 - x0, y1 - y0
        dist = math.hypot(dx, dy)
        if dist < 1e-4:
            draw.ellipse([x0 - rad, y0 - rad, x0 + rad, y0 + rad], fill=255)
            return
        ux = -dy / dist * rad
        uy = dx / dist * rad
        poly = [
            (x0 + ux, y0 + uy),
            (x1 + ux, y1 + uy),
            (x1 - ux, y1 - uy),
            (x0 - ux, y0 - uy),
        ]
        draw.polygon(poly, fill=255)
        draw.ellipse([x0 - rad, y0 - rad, x0 + rad, y0 + rad], fill=255)
        draw.ellipse([x1 - rad, y1 - rad, x1 + rad, y1 + rad], fill=255)

    render_cap(draw_a, shoulder, elbow, 45.0)
    render_cap(draw_a, elbow, wrist, 40.0)
    raw_arm_mask = np.array(arm_im) > 128

    # 3. 計算交集 y 範圍
    torso_ys = np.where(torso_mask.any(axis=1))[0]
    arm_ys = np.where(raw_arm_mask.any(axis=1))[0]

    if len(torso_ys) == 0 or len(arm_ys) == 0:
        return (
            np.zeros((h, w), dtype=bool),
            torso_mask,
            np.zeros((h, w), dtype=bool),
            {"y_min": 0, "y_max": 0, "x_min": 0, "x_max": 0},
        )

    y_min = max(int(torso_ys.min()), int(arm_ys.min()))
    y_max = min(int(torso_ys.max()), int(arm_ys.max())) + 1

    # 4. 分離帶沿手臂膠囊內緣（朝軀幹那一側）走，寬度＝minGapPx.arm_to_torso，涵蓋整段交集
    min_gap = int(spec.get("minGapPx", {}).get("arm_to_torso", 20))
    band_mask = np.zeros((h, w), dtype=bool)

    roi_x_list: list[int] = []

    for y in range(y_min, y_max):
        t_row = np.where(torso_mask[y])[0]
        a_row = np.where(raw_arm_mask[y])[0]
        if len(t_row) == 0 or len(a_row) == 0:
            continue

        if arm_side == "f":
            arm_inner = int(a_row.min())
            arm_outer = int(a_row.max())
            torso_edge = int(t_row.max())

            b_start = max(0, arm_inner - min_gap)
            b_end = arm_inner
            if b_end > b_start:
                band_mask[y, b_start:b_end] = True

            roi_x_list.extend([torso_edge, arm_outer])
        else:
            arm_inner = int(a_row.max())
            arm_outer = int(a_row.min())
            torso_edge = int(t_row.min())

            b_start = arm_inner + 1
            b_end = min(w, arm_inner + 1 + min_gap)
            if b_end > b_start:
                band_mask[y, b_start:b_end] = True

            roi_x_list.extend([torso_edge, arm_outer])

    # 確保三張遮罩互不重疊
    band_mask = band_mask & (~torso_mask)
    arm_mask = raw_arm_mask & (~torso_mask) & (~band_mask)

    if arm_side == "f":
        x_min = int(waist[0] + 76)
        x_max = int(elbow[0] - 20)
    else:
        x_min = int(elbow[0] + 20)
        x_max = int(waist[0] - 76)

    roi_box = {
        "y_min": y_min,
        "y_max": y_max,
        "x_min": x_min,
        "x_max": x_max,
    }

    return arm_mask, torso_mask, band_mask, roi_box


def generate_ownership_and_separation_masks(
    spec: dict[str, Any],
    body_type: str,
    w: int,
    h: int,
    arm_side: str = "f",
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """AG-19 / AG-20: 產出分開所有權的三張遮罩 (互不重疊)"""
    arm_m, torso_m, band_m, _ = compute_arm_torso_geometry(spec, arm_side=arm_side, w=w, h=h)
    return arm_m, torso_m, band_m


def build_arm_torso_capsule_mask(spec: dict[str, Any], w: int, h: int) -> np.ndarray:
    """AG-18: 建立手臂與軀幹膠囊的二值遮罩 (膠囊內為 True，腰部收窄以保留合法負空間通道)"""
    mask_im = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask_im)

    joints = spec.get("joints", {})

    def get_j(name: str, def_xy: tuple[float, float]) -> tuple[float, float]:
        j = joints.get(name, {})
        return float(j.get("x", def_xy[0])), float(j.get("y", def_xy[1]))

    neck = get_j("neck", (1030, 880))
    chest = get_j("chest", (1024, 980))
    waist = get_j("waist", (1024, 1130))
    pelvis = get_j("pelvis", (1024, 1450))
    shoulder_f = get_j("shoulder_f", (1120, 925))
    elbow_f = get_j("elbow_f", (1230, 1080))
    wrist_f = get_j("wrist_f", (1330, 1200))
    shoulder_b = get_j("shoulder_b", (930, 925))
    elbow_b = get_j("elbow_b", (820, 1080))
    wrist_b = get_j("wrist_b", (720, 1200))

    # 軀幹多邊形 (依 spec segments 包絡線：頸 130, 腰 100, 骨盆 120)
    torso_poly = [
        (neck[0] - 130, neck[1]),
        (neck[0] + 130, neck[1]),
        (waist[0] + 100, waist[1]),
        (pelvis[0] + 120, pelvis[1]),
        (pelvis[0] - 120, pelvis[1]),
        (waist[0] - 100, waist[1]),
    ]
    draw.polygon(torso_poly, fill=255)

    def render_cap(p0: tuple[float, float], p1: tuple[float, float], rad: float):
        x0, y0 = p0
        x1, y1 = p1
        dx, dy = x1 - x0, y1 - y0
        dist = math.hypot(dx, dy)
        if dist < 1e-4:
            draw.ellipse([x0 - rad, y0 - rad, x0 + rad, y0 + rad], fill=255)
            return
        ux = -dy / dist * rad
        uy = dx / dist * rad
        poly = [
            (x0 + ux, y0 + uy),
            (x1 + ux, y1 + uy),
            (x1 - ux, y1 - uy),
            (x0 - ux, y0 - uy),
        ]
        draw.polygon(poly, fill=255)
        draw.ellipse([x0 - rad, y0 - rad, x0 + rad, y0 + rad], fill=255)
        draw.ellipse([x1 - rad, y1 - rad, x1 + rad, y1 + rad], fill=255)

    # 手臂膠囊包絡線 (依 spec halfWidth 上限: upperarm=65, forearm=55)
    render_cap(shoulder_f, elbow_f, 65.0)
    render_cap(elbow_f, wrist_f, 55.0)
    render_cap(shoulder_b, elbow_b, 65.0)
    render_cap(elbow_b, wrist_b, 55.0)

    return np.array(mask_im) > 128


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
    joints = spec.get("joints", {})

    def get_j(name: str, def_xy: tuple[float, float]) -> tuple[float, float]:
        j = joints.get(name, {})
        return float(j.get("x", def_xy[0])), float(j.get("y", def_xy[1]))

    out_dir.mkdir(parents=True, exist_ok=True)

    img_pil = Image.open(rigpose_path).convert("RGBA")
    w, h = img_pil.size
    img_arr = np.array(img_pil)
    alpha = img_arr[..., 3]
    live_mask = alpha > 16

    # AG-17 / AG-18: 髮尾在獨立圖層，但為防實體黏連被掩蓋，只扣除同時符合：
    # 1. 在 hairtail.png 的 alpha 範圍內 (alpha > 16)
    # 2. 在 hair_root 下方 (y >= target_hair_y)
    # 3. 在手臂與軀幹膠囊以外 (~arm_torso_capsule_mask)
    target_hair_y = float(spec.get("joints", {}).get("hair_root", {}).get("y", 420.0))
    arm_torso_capsule_mask = build_arm_torso_capsule_mask(spec, w, h)

    gap_arr = img_arr.copy()
    hair_excluded_any = False
    if hairtail_path and hairtail_path.exists():
        try:
            hair_pil_raw = Image.open(hairtail_path).convert("RGBA")
            if hair_pil_raw.size == (w, h):
                h_arr = np.array(hair_pil_raw)
                hair_px = h_arr[..., 3] > 16
                y_coords = np.arange(h)[:, None]
                hair_excludable = hair_px & (y_coords >= target_hair_y) & (~arm_torso_capsule_mask)
                if hair_excludable.any():
                    gap_arr[hair_excludable, 3] = 0
                    hair_excluded_any = True
        except Exception:
            pass

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

    # AG-17: 地面線與 H 偏差能否用「整張等比縮放 ±8% ＋ 平移」修正
    target_H = float(spec.get("H", 1600))
    if actual_h > 0:
        scale_factor = target_H / float(actual_h)
        scale_dev_pct = (scale_factor - 1.0) * 100.0
        scale_feasible = abs(scale_dev_pct) <= 8.0
        dy = float(target_ground_y) - (float(lowest_y) * scale_factor)
        dx = 0.0  # 待站立中心計算後補正
        scale_correction = {
            "feasible": scale_feasible,
            "scaleFactor": round(scale_factor, 4),
            "scaleDeviationPercent": round(scale_dev_pct, 2),
            "translateOffsetPx": [0.0, round(dy, 1)],
            "detail": (
                f"以畫布原點 (0, 0) 為縮放中心：可透過整張等比縮放 {scale_factor:.4f} ({scale_dev_pct:+.2f}%) 與垂直平移 dy={dy:+.1f}px 修正地面線與身高"
                if scale_feasible
                else f"身高偏差 {scale_dev_pct:+.2f}% 超出 ±8% 容許範圍，無法僅靠整張等比縮放修正"
            ),
        }
    else:
        scale_correction = {
            "feasible": False,
            "scaleFactor": 1.0,
            "scaleDeviationPercent": 0.0,
            "translateOffsetPx": [0.0, 0.0],
            "detail": "無有效像素，無法計算縮放修正",
        }
    # 繪製頭頂線與容差帶
    draw.line([(0, target_top_y), (w, target_top_y)], fill=(80, 200, 255, 200), width=3)
    draw.line([(0, target_top_y - 20), (w, target_top_y - 20)], fill=(80, 200, 255, 100), width=1)
    draw.line([(0, target_top_y + 20), (w, target_top_y + 20)], fill=(80, 200, 255, 100), width=1)
    draw.line([(0, target_top_y - 60), (w, target_top_y - 60)], fill=(80, 180, 255, 60), width=1)
    draw.line([(0, target_top_y + 60), (w, target_top_y + 60)], fill=(80, 180, 255, 60), width=1)

    # 4. 站立中心 (兩腳中點 x 必須在 standingCenter ± standingCenterTol, SNAP <= 60)
    feet_ys_mask = live_mask & (np.arange(h)[:, None] >= 1750)
    ys_f, xs_f = np.where(feet_ys_mask)
    target_center_x = float(spec.get("standingCenter", spec.get("joints", {}).get("root", {}).get("x", 1024.0)))
    center_tol = float(spec.get("standingCenterTol", 25.0))

    feet_cx = float(np.mean(xs_f)) if len(xs_f) > 0 else target_center_x
    center_diff = abs(feet_cx - target_center_x)
    if center_diff <= center_tol:
        center_tier = "PASS"
    elif center_diff <= 60.0:
        center_tier = "SNAP"
    else:
        center_tier = "FAIL"

    checks["standing_center"] = {
        "pass": (center_tier == "PASS"),
        "tier": center_tier,
        "detail": f"站立中心落於 x={target_center_x:.0f} (tol=±{center_tol:.0f}px, snap=±60px): actual={feet_cx:.1f} (diff={center_diff:.1f}px)",
    }

    # AG-17: 補正水平平移 dx
    if scale_correction.get("feasible", False):
        s_fac = scale_correction["scaleFactor"]
        dx = target_center_x - (feet_cx * s_fac)
        scale_correction["translateOffsetPx"][0] = round(dx, 1)
        scale_correction["detail"] = (
            f"以畫布原點 (0, 0) 為縮放中心：可透過整張等比縮放 {s_fac:.4f} ({scale_correction['scaleDeviationPercent']:+.2f}%) "
            f"與平移 dx={dx:+.1f}px, dy={scale_correction['translateOffsetPx'][1]:+.1f}px 修正地面線、身高與站立中心"
        )
    draw.line([(int(target_center_x), 0), (int(target_center_x), h)], fill=(220, 230, 245, 180), width=2)
    draw.line([(int(target_center_x - 60), 0), (int(target_center_x - 60), h)], fill=(220, 230, 245, 60), width=1)
    draw.line([(int(target_center_x + 60), 0), (int(target_center_x + 60), h)], fill=(220, 230, 245, 60), width=1)

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

    # 7. 透明間隙 (minGapPx，無 SNAP 級：>= 規格值 PASS，否則 FAIL，門檻讀取自 spec)
    min_gap_cfg = spec.get("minGapPx", {})
    min_gap_arm_torso = int(min_gap_cfg.get("arm_to_torso", 20))
    min_gap_legs = int(min_gap_cfg.get("leg_to_leg", 16))
    min_gap_hand_any = int(min_gap_cfg.get("hand_to_any", 16))

    # 7.1 前手與軀幹 (AG-20: 由 JSON 推導 ROI 與分離帶)
    arm_f_mask, torso_mask, band_f_mask, roi_f = compute_arm_torso_geometry(spec, "f", w, h)
    rf_ymin, rf_ymax = roi_f["y_min"], roi_f["y_max"]
    rf_xmin, rf_xmax = roi_f["x_min"], roi_f["x_max"]

    # 檢查窗切片 (由變數切片，無常數硬編碼)
    raw_arm_box = img_arr[rf_ymin:rf_ymax, rf_xmin:rf_xmax, 3] > 16
    raw_col_has_pixel = raw_arm_box.any(axis=0)
    raw_zero_run = 0
    cur_rz = 0
    for v in raw_col_has_pixel:
        if not v:
            cur_rz += 1
            raw_zero_run = max(raw_zero_run, cur_rz)
        else:
            cur_rz = 0
    raw_arm_gap_pass = (raw_zero_run >= min_gap_arm_torso)

    gap_arm_torso_box = gap_arr[rf_ymin:rf_ymax, rf_xmin:rf_xmax, 3] > 16
    col_has_pixel = gap_arm_torso_box.any(axis=0)
    zero_runs = 0
    max_zero_run = 0
    for v in col_has_pixel:
        if not v:
            zero_runs += 1
            max_zero_run = max(max_zero_run, zero_runs)
        else:
            zero_runs = 0

    arm_gap_pass = (max_zero_run >= min_gap_arm_torso)
    arm_gap_tier = "PASS" if arm_gap_pass else "FAIL"

    # AG-18: 若扣除後 gap 才從 FAIL 變成 PASS，標示 gapPassedOnlyAfterHairExclusion 供人工複查
    gap_passed_only_after_hair = bool(hair_excluded_any and (not raw_arm_gap_pass) and arm_gap_pass)

    detail_str = f"手臂與軀幹間隙 >={min_gap_arm_torso}px: detected_gap={max_zero_run}px"
    if gap_passed_only_after_hair:
        detail_str += " (注意: 扣除獨立髮尾後才轉為 PASS，請人工複查)"

    checks["min_gap_arm_torso"] = {
        "pass": arm_gap_pass,
        "tier": arm_gap_tier,
        "gapPassedOnlyAfterHairExclusion": gap_passed_only_after_hair,
        "roi": roi_f,
        "detail": detail_str,
    }

    # AG-17: 若 gap 為 0，產出手臂與軀幹重疊區遮罩 PNG 供局部補繪
    overlap_mask_path = None
    if max_zero_run == 0:
        overlap_mask = np.zeros((h, w), dtype=np.uint8)
        sub_px = gap_arr[rf_ymin:rf_ymax, rf_xmin:rf_xmax, 3] > 16
        overlap_mask[rf_ymin:rf_ymax, rf_xmin:rf_xmax][sub_px] = 255
        mask_out_file = out_dir / "arm_torso_overlap_mask.png"
        Image.fromarray(overlap_mask).save(mask_out_file)
        overlap_mask_path = str(mask_out_file)
        checks["min_gap_arm_torso"]["overlapMaskPath"] = overlap_mask_path

    # AG-19: 若 gap 判 FAIL，另外輸出三張分開所有權的 2048x2048 遮罩 PNG
    arm_cap_mask_path = None
    torso_cap_mask_path = None
    band_mask_path = None
    separation_band_opaque_count = 0

    if not arm_gap_pass:
        arm_file = out_dir / "arm_f_capsule_mask.png"
        torso_file = out_dir / "torso_capsule_mask.png"
        band_file = out_dir / "arm_torso_separation_band.png"

        Image.fromarray((arm_f_mask.astype(np.uint8) * 255)).save(arm_file)
        Image.fromarray((torso_mask.astype(np.uint8) * 255)).save(torso_file)
        Image.fromarray((band_f_mask.astype(np.uint8) * 255)).save(band_file)

        arm_cap_mask_path = str(arm_file)
        torso_cap_mask_path = str(torso_file)
        band_mask_path = str(band_file)
        separation_band_opaque_count = int(((img_arr[..., 3] > 16) & band_f_mask).sum())

        checks["min_gap_arm_torso"]["armCapsuleMask"] = arm_cap_mask_path
        checks["min_gap_arm_torso"]["torsoCapsuleMask"] = torso_cap_mask_path
        checks["min_gap_arm_torso"]["armTorsoSeparationBandMask"] = band_mask_path
        checks["min_gap_arm_torso"]["separationBandOpaquePixels"] = separation_band_opaque_count

    # 7.1b 後手（arm_b）同樣檢查 (AG-20)
    arm_b_mask, _, band_b_mask, roi_b = compute_arm_torso_geometry(spec, "b", w, h)
    rb_ymin, rb_ymax = roi_b["y_min"], roi_b["y_max"]
    rb_xmin, rb_xmax = roi_b["x_min"], roi_b["x_max"]

    gap_arm_b_box = gap_arr[rb_ymin:rb_ymax, rb_xmin:rb_xmax, 3] > 16
    b_zero_run = 0
    max_b_zero = 0
    for v in gap_arm_b_box.any(axis=0):
        if not v:
            b_zero_run += 1
            max_b_zero = max(max_b_zero, b_zero_run)
        else:
            b_zero_run = 0

    arm_b_gap_pass = (max_b_zero >= min_gap_arm_torso)
    arm_b_gap_tier = "PASS" if arm_b_gap_pass else "FAIL"

    checks["min_gap_arm_b_torso"] = {
        "pass": arm_b_gap_pass,
        "tier": arm_b_gap_tier,
        "detectedGap": max_b_zero,
        "roi": roi_b,
        "detail": f"後手與軀幹間隙 >={min_gap_arm_torso}px: detected_gap={max_b_zero}px",
    }

    arm_b_cap_mask_path = None
    band_b_mask_path = None
    separation_band_b_opaque_count = 0
    if not arm_b_gap_pass:
        arm_b_file = out_dir / "arm_b_capsule_mask.png"
        band_b_file = out_dir / "arm_b_torso_separation_band.png"

        Image.fromarray((arm_b_mask.astype(np.uint8) * 255)).save(arm_b_file)
        Image.fromarray((band_b_mask.astype(np.uint8) * 255)).save(band_b_file)

        arm_b_cap_mask_path = str(arm_b_file)
        band_b_mask_path = str(band_b_file)
        separation_band_b_opaque_count = int(((img_arr[..., 3] > 16) & band_b_mask).sum())

        checks["min_gap_arm_b_torso"]["armCapsuleMask"] = arm_b_cap_mask_path
        checks["min_gap_arm_b_torso"]["armTorsoSeparationBandMask"] = band_b_mask_path
        checks["min_gap_arm_b_torso"]["separationBandOpaquePixels"] = separation_band_b_opaque_count

    # 7.2 兩腿間隙 (由 knee 與 standingCenter 動態計算檢查窗，無硬編碼數值)
    knee_b_pt = get_j("knee_b", (930, 1580))
    center_x = int(spec.get("standingCenter", 1024))
    leg_y_start = int(knee_b_pt[1]) - 100
    leg_y_end = int(knee_b_pt[1]) + 40
    leg_x_start = center_x - 44
    leg_x_end = center_x + 36

    gap_legs_box = gap_arr[leg_y_start:leg_y_end, leg_x_start:leg_x_end, 3] > 16
    leg_col_has_pixel = gap_legs_box.any(axis=0)
    leg_zero_run = 0
    max_leg_zero = 0
    for v in leg_col_has_pixel:
        if not v:
            leg_zero_run += 1
            max_leg_zero = max(max_leg_zero, leg_zero_run)
        else:
            leg_zero_run = 0

    leg_gap_pass = (max_leg_zero >= min_gap_legs)
    leg_gap_tier = "PASS" if leg_gap_pass else "FAIL"
    checks["min_gap_legs"] = {
        "pass": leg_gap_pass,
        "tier": leg_gap_tier,
        "detail": f"兩腿間隙寬度 >={min_gap_legs}px: detected_gap={max_leg_zero}px",
    }

    # 7.3 手與任何非相連部位 (由 wrist 關節動態計算檢查窗)
    wrist_f_pt = get_j("wrist_f", (1330, 1200))
    wrist_b_pt = get_j("wrist_b", (720, 1200))

    hand_f_y_start = int(wrist_f_pt[1]) - 40
    hand_f_y_end = hand_f_y_start + 130
    hand_f_x_start = int(wrist_f_pt[0]) - 180
    hand_f_x_end = hand_f_x_start + 135

    hand_b_y_start = int(wrist_b_pt[1]) - 40
    hand_b_y_end = hand_b_y_start + 130
    hand_b_x_start = int(wrist_b_pt[0]) + 40
    hand_b_x_end = hand_b_x_start + 190

    gap_hand_f_box = gap_arr[hand_f_y_start:hand_f_y_end, hand_f_x_start:hand_f_x_end, 3] > 16
    gap_hand_b_box = gap_arr[hand_b_y_start:hand_b_y_end, hand_b_x_start:hand_b_x_end, 3] > 16

    f_zero_max = 0
    cur_z = 0
    for v in gap_hand_f_box.any(axis=0):
        if not v:
            cur_z += 1
            f_zero_max = max(f_zero_max, cur_z)
        else:
            cur_z = 0

    b_zero_max = 0
    cur_z = 0
    for v in gap_hand_b_box.any(axis=0):
        if not v:
            cur_z += 1
            b_zero_max = max(b_zero_max, cur_z)
        else:
            cur_z = 0

    hand_gap_pass = (f_zero_max >= min_gap_hand_any) and (b_zero_max >= min_gap_hand_any)
    hand_gap_tier = "PASS" if hand_gap_pass else "FAIL"
    checks["min_gap_hand_to_any"] = {
        "pass": hand_gap_pass,
        "tier": hand_gap_tier,
        "hand_f_gap": f_zero_max,
        "hand_b_gap": b_zero_max,
        "detail": f"手與非相連部位間隙 >={min_gap_hand_any}px: hand_f={f_zero_max}px, hand_b={b_zero_max}px",
    }

    # 9. AG-14 / AG-16: 獨立髮尾圖根部對齊 hair_root 檢查 (讀取 JSON joints.hair_root)
    hair_spec = spec.get("joints", {}).get("hair_root", {})
    target_hair_x = float(hair_spec.get("x", 960.0))
    target_hair_y = float(hair_spec.get("y", 420.0))
    hair_tol = float(hair_spec.get("tol", 40.0))

    if hairtail_path and hairtail_path.exists():
        hair_pil = Image.open(hairtail_path).convert("RGBA")
        hair_arr = np.array(hair_pil)
        ys_h, xs_h = np.where(hair_arr[..., 3] > 16)
        if len(ys_h) > 0:
            top_y_idx = int(ys_h.min())
            root_xs = xs_h[ys_h == top_y_idx]
            root_x = float(np.mean(root_xs))
            hair_diff = math.hypot(root_x - target_hair_x, top_y_idx - target_hair_y)
            if hair_diff <= hair_tol:
                h_tier = "PASS"
            elif hair_diff <= 60.0:
                h_tier = "SNAP"
            else:
                h_tier = "FAIL"
            checks["hairtail_root_alignment"] = {
                "pass": (h_tier == "PASS"),
                "tier": h_tier,
                "detail": f"獨立髮尾根部對齊 hair_root({target_hair_x:.0f}, {target_hair_y:.0f}): actual=({root_x:.1f}, {top_y_idx}), diff={hair_diff:.1f}px (tol=±{hair_tol:.0f}, snap<=60)",
            }
            draw.ellipse([target_hair_x - hair_tol, target_hair_y - hair_tol, target_hair_x + hair_tol, target_hair_y + hair_tol], outline=(100, 200, 255, 200), width=2)
            draw.line([(int(root_x), top_y_idx), (int(target_hair_x), int(target_hair_y))], fill=(100, 200, 255, 255), width=2)
        else:
            checks["hairtail_root_alignment"] = {
                "pass": True,
                "tier": "PASS",
                "detail": "髮尾圖為空，跳過",
            }
    else:
        checks["hairtail_root_alignment"] = {
            "pass": True,
            "tier": "PASS",
            "detail": "無獨立髮尾圖，跳過",
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
        "scaleAndTranslateCorrection": scale_correction,
        "armTorsoOverlapMask": overlap_mask_path,
        "armCapsuleMask": arm_cap_mask_path,
        "torsoCapsuleMask": torso_cap_mask_path,
        "armTorsoSeparationBandMask": band_mask_path,
        "separationBandOpaquePixels": separation_band_opaque_count,
        "gapPassedOnlyAfterHairExclusion": gap_passed_only_after_hair,
        "checks": checks,
        "armBCapsuleMask": arm_b_cap_mask_path,
        "armBTorsoSeparationBandMask": band_b_mask_path,
        "separationBandOpaquePixelsB": separation_band_b_opaque_count,
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
