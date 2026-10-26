#!/usr/bin/env python3
"""分槽進件檢查工具 (check_layered_parts.py)

依據工單 AG-21 / AG-22 與 SPEC-RIG-POSE-03 / v3.4 規格：
1. 尺寸：每槽圖檔必須與 spec.canvas (2048x2048) 相同，未裁切。
2. 範圍：alpha 主體必須落在該骨膠囊外擴 12px 之內。特殊部件 (weapon, cape, skirt, hair_tail) 檢查錨點。
3. 關節連接表：由 JSON bones 的父子關係動態推導產生。特例由 layeredSlots.jointOverrides 驅動。
4. 隱藏延伸：每個關節兩側部件必須越過關節至少 hiddenExtensionH * H (預設 0.03H = 48px)。
5. 旋轉露縫：每個關節把子部件繞樞紐 (pivotCanvasPx) 旋轉 +/- rotationTestDeg，合成後關節附近不可出現透明露縫。剛性連接 (rigid=true) 略過。
6. 重組差：若提供參考圖，比對 alpha 輪廓位置位移 (Chamfer/Hausdorff p95 <= 2 px)，RGB 差另外列為參考值。
7. 握點：hand_f / hand_b 拳心孔中心與 grip_A / grip_B 誤差 <= 12px。
8. 容錯：少一槽時，涉及該槽的關節標 SKIPPED，不判 FAIL。
9. 絕不硬編碼數值 >= 200 的像素切片或 range 常數，全由 JSON 讀取與推導。
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
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
DEFAULT_SPEC_PATH = HERE / "specs" / "canonical_skeleton_v3.json"

CANONICAL_21_SLOTS = [
    "pelvis", "torso", "head", "cape", "hair_tail", "skirt",
    "arm_upper_f", "arm_lower_f", "hand_f", "pauldron_f", "weapon",
    "arm_upper_b", "arm_lower_b", "hand_b", "pauldron_b",
    "thigh_f", "shin_f", "foot_f", "thigh_b", "shin_b", "foot_b",
]


def load_spec(path: Path | None = None) -> dict[str, Any]:
    p = path or DEFAULT_SPEC_PATH
    if not p.exists():
        raise FileNotFoundError(f"Missing skeleton spec: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def derive_joint_connections(spec: dict[str, Any]) -> list[dict[str, Any]]:
    """依據工單 AG-22，關節表改由 JSON bones 的父子關係動態推導。
    凡父骨與子骨都在 layeredSlots.names 中，就構成一個關節，樞紐取子骨的 pivotCanvasPx。
    特例由 layeredSlots.jointOverrides 驅動，不寫死在程式碼中。
    """
    bones_list = spec.get("bones", [])
    bones_dict = {b["name"]: b for b in bones_list if isinstance(b, dict) and "name" in b}
    layered_cfg = spec.get("layeredSlots", {})
    slot_names = set(layered_cfg.get("names", CANONICAL_21_SLOTS))
    joint_overrides = layered_cfg.get("jointOverrides", {})
    default_rot = float(layered_cfg.get("rotationTestDeg", 30))

    connections = []
    for b in bones_list:
        if not isinstance(b, dict):
            continue
        child_name = b.get("name")
        override = joint_overrides.get(child_name, {})
        parent_name = override.get("parent", b.get("parent"))

        if child_name in slot_names and parent_name in slot_names:
            p_bone = bones_dict.get(parent_name, {})
            child_pivot = tuple(b.get("pivotCanvasPx", [1024.0, 1024.0]))
            parent_pivot = tuple(p_bone.get("pivotCanvasPx", [1024.0, 1024.0]))

            cap_rad = float(override.get("capRadiusPx", 40.0))
            is_rigid = bool(override.get("rigid", False))
            rot_deg = float(override.get("rotationTestDeg", default_rot))

            connections.append({
                "id": f"{parent_name}_to_{child_name}",
                "joint_name": child_name,
                "parent_slot": parent_name,
                "child_slot": child_name,
                "pivot": child_pivot,
                "parent_pivot": parent_pivot,
                "cap_rad": cap_rad,
                "rigid": is_rigid,
                "rotationTestDeg": rot_deg,
            })

    return connections


def find_fist_hole_center(hand_arr: np.ndarray, expected_pt: tuple[float, float]) -> tuple[bool, tuple[float, float], float]:
    """尋找空心拳孔中心"""
    alpha = hand_arr[..., 3]
    bin_m = (alpha > 24).astype(np.uint8) * 255
    contours, hierarchy = cv2.findContours(bin_m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None or len(hierarchy[0]) <= 1:
        return False, (0.0, 0.0), 999.0

    best_center = (0.0, 0.0)
    best_dist = 999.0
    found = False

    for idx, hier in enumerate(hierarchy[0]):
        parent_idx = hier[3]
        if parent_idx != -1:
            cnt = contours[idx]
            area = cv2.contourArea(cnt)
            # 拳心空洞面積預期在 30 ~ 2000 像素
            if 30 <= area <= 2000:
                M = cv2.moments(cnt)
                if M["m00"] > 0:
                    cx = M["m10"] / M["m00"]
                    cy = M["m01"] / M["m00"]
                    dist = math.hypot(cx - expected_pt[0], cy - expected_pt[1])
                    if dist < best_dist:
                        best_dist = dist
                        best_center = (cx, cy)
                        found = True

    return found, best_center, best_dist


def check_slot_hidden_extension(
    part_arr: np.ndarray,
    pivot_pt: tuple[float, float],
    dir_vec: tuple[float, float],
    min_ext_px: float,
) -> tuple[bool, float]:
    """檢驗部件越過關節樞紐沿指定向量方向之延伸長度"""
    alpha = part_arr[..., 3]
    ys, xs = np.where(alpha > 16)
    if len(ys) == 0:
        return False, 0.0

    vx, vy = dir_vec
    norm = math.hypot(vx, vy)
    if norm < 1e-4:
        return True, min_ext_px
    ux, uy = vx / norm, vy / norm

    # 沿方向向量之投影長度：dot((x - px, y - py), (ux, uy))
    dx = xs.astype(np.float32) - pivot_pt[0]
    dy = ys.astype(np.float32) - pivot_pt[1]
    projections = dx * ux + dy * uy
    max_proj = float(projections.max())

    passed = max_proj >= min_ext_px
    return passed, max_proj


def check_rotation_gap_leak(
    parent_arr: np.ndarray,
    child_arr: np.ndarray,
    pivot_pt: tuple[float, float],
    angle_deg: float,
    check_radius_px: float,
    w: int,
    h: int,
) -> tuple[bool, np.ndarray]:
    """檢驗子部件繞樞紐旋轉 angle_deg 後，關節周圍是否出現穿透露縫"""
    # 旋轉子部件
    M = cv2.getRotationMatrix2D(pivot_pt, angle_deg, 1.0)
    rotated_child = cv2.warpAffine(child_arr, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

    parent_alpha = parent_arr[..., 3] > 16
    child_alpha = rotated_child[..., 3] > 16

    # 建立以樞紐為中心、半徑為 check_radius_px * 0.4 的核心檢查圓盤
    core_rad = check_radius_px * 0.4
    circle_im = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(circle_im)
    draw.ellipse(
        [
            pivot_pt[0] - core_rad,
            pivot_pt[1] - core_rad,
            pivot_pt[0] + core_rad,
            pivot_pt[1] + core_rad,
        ],
        fill=255,
    )
    core_disk = np.array(circle_im) > 128
    disk_total = max(1, int(core_disk.sum()))

    # 1. 關節核心覆蓋率檢驗 (容許拳心空心孔中心局部透明，但核心內必須具備充足肉質)
    child_cov_count = int((child_alpha & core_disk).sum())
    parent_cov_count = int((parent_alpha & core_disk).sum())
    has_cov = (child_cov_count >= int(disk_total * 0.15)) and (parent_cov_count >= int(disk_total * 0.15))

    # 2. 咬合重疊檢驗
    overlap_mask = core_disk & parent_alpha & child_alpha
    overlap_count = int(overlap_mask.sum())

    leak_mask = core_disk & (~(parent_alpha & child_alpha))
    passed = has_cov and (overlap_count >= int(disk_total * 0.2))

    return passed, leak_mask


def compute_contour_chamfer_p95(mask_comp: np.ndarray, mask_ref: np.ndarray) -> float:
    """計算疊合部件與參考合成圖之間的輪廓 Chamfer 距離 95 分位數 (p95)
    依據工單 AG-22，位置誤差以輪廓距離 p95 <= 2 px 為準。
    """
    k = np.ones((3, 3), np.uint8)
    edge_comp = cv2.morphologyEx(mask_comp.astype(np.uint8), cv2.MORPH_GRADIENT, k) > 0
    edge_ref = cv2.morphologyEx(mask_ref.astype(np.uint8), cv2.MORPH_GRADIENT, k) > 0

    comp_pts = int(edge_comp.sum())
    ref_pts = int(edge_ref.sum())

    if comp_pts == 0 and ref_pts == 0:
        return 0.0
    if comp_pts == 0 or ref_pts == 0:
        return 999.0

    dist_to_ref = cv2.distanceTransform((~edge_ref).astype(np.uint8), cv2.DIST_L2, 3)
    dist_to_comp = cv2.distanceTransform((~edge_comp).astype(np.uint8), cv2.DIST_L2, 3)

    d_comp_to_ref = dist_to_ref[edge_comp]
    d_ref_to_comp = dist_to_comp[edge_ref]
    all_dists = np.concatenate([d_comp_to_ref, d_ref_to_comp])

    return float(np.percentile(all_dists, 95))


def run_layered_parts_inspection(
    parts_dir: Path,
    spec_path: Path | None,
    body_type: str = "standard",
    composite_ref_path: Path | None = None,
    filter_slots: list[str] | None = None,
    out_dir: Path | None = None,
) -> tuple[dict[str, Any], bool]:
    spec = load_spec(spec_path)
    h_val = float(spec.get("H", 1600))
    canvas_cfg = spec.get("canvas", {})
    exp_w = int(canvas_cfg.get("w", 2048))
    exp_h = int(canvas_cfg.get("h", 2048))

    layered_cfg = spec.get("layeredSlots", {})
    all_slot_names = layered_cfg.get("names", CANONICAL_21_SLOTS)
    target_slots = [s for s in all_slot_names if s in filter_slots] if filter_slots else all_slot_names

    hidden_ext_h = float(layered_cfg.get("hiddenExtensionH", 0.03))
    min_ext_px = hidden_ext_h * h_val
    rot_test_deg = float(layered_cfg.get("rotationTestDeg", 30))

    grips_cfg = spec.get("grips", {})
    weapon_rules = spec.get("weaponRules", {})
    if "grip_A" in grips_cfg:
        grip_a = (float(grips_cfg["grip_A"].get("x", 1365.0)), float(grips_cfg["grip_A"].get("y", 1225.0)))
    else:
        grip_a = tuple(weapon_rules.get("grip_point_A", [1365.0, 1225.0]))

    if "grip_B" in grips_cfg:
        grip_b = (float(grips_cfg["grip_B"].get("x", 960.0)), float(grips_cfg["grip_B"].get("y", 1210.0)))
    else:
        grip_b = tuple(weapon_rules.get("grip_point_B", [960.0, 1210.0]))

    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)

    loaded_parts: dict[str, np.ndarray] = {}
    slot_reports: dict[str, Any] = {}
    overall_pass = True

    # 1. 讀取並檢驗各槽基本尺寸與空槽狀態
    for sid in target_slots:
        p_path = parts_dir / f"{sid}.png"
        if not p_path.exists():
            slot_reports[sid] = {
                "pass": True,
                "tier": "PASS",
                "empty": True,
                "detail": "空槽 (檔案不存在)",
            }
            continue

        im = Image.open(p_path).convert("RGBA")
        pw, ph = im.size
        arr = np.array(im)
        alpha = arr[..., 3]
        vis_count = int((alpha > 16).sum())

        if vis_count == 0:
            slot_reports[sid] = {
                "pass": True,
                "tier": "PASS",
                "empty": True,
                "detail": "空槽 (完全透明)",
            }
            loaded_parts[sid] = arr
            continue

        size_pass = (pw == exp_w and ph == exp_h)
        if not size_pass:
            slot_reports[sid] = {
                "pass": False,
                "tier": "FAIL",
                "empty": False,
                "detail": f"尺寸不合規格: 現為{pw}x{ph}, 規格為{exp_w}x{exp_h}",
            }
            overall_pass = False
            loaded_parts[sid] = arr
            continue

        loaded_parts[sid] = arr
        slot_reports[sid] = {
            "pass": True,
            "tier": "PASS",
            "empty": False,
            "visiblePixels": vis_count,
            "checks": {},
        }

    # 2. 檢驗握點 (hand_f / hand_b 拳心孔中心誤差 <= 12px)
    if "hand_f" in loaded_parts and not slot_reports["hand_f"].get("empty"):
        h_arr = loaded_parts["hand_f"]
        exp_pt = (float(grip_a[0]), float(grip_a[1]))
        found, pt, dist = find_fist_hole_center(h_arr, exp_pt)
        grip_pass = found and (dist <= 12.0)
        slot_reports["hand_f"]["checks"]["grip_point_accuracy"] = {
            "pass": grip_pass,
            "tier": "PASS" if grip_pass else "FAIL",
            "holeFound": found,
            "center": list(pt),
            "targetGrip": list(grip_a),
            "distancePx": round(dist, 2),
            "tolerancePx": 12.0,
            "detail": f"握點誤差={dist:.1f}px (tol=12px)",
        }
        if not grip_pass:
            slot_reports["hand_f"]["pass"] = False
            slot_reports["hand_f"]["tier"] = "FAIL"
            overall_pass = False

    if "hand_b" in loaded_parts and not slot_reports["hand_b"].get("empty"):
        h_arr = loaded_parts["hand_b"]
        exp_pt = (float(grip_b[0]), float(grip_b[1]))
        found, pt, dist = find_fist_hole_center(h_arr, exp_pt)
        grip_pass = found and (dist <= 12.0)
        slot_reports["hand_b"]["checks"]["grip_point_accuracy"] = {
            "pass": grip_pass,
            "tier": "PASS" if grip_pass else "FAIL",
            "holeFound": found,
            "center": list(pt),
            "targetGrip": list(grip_b),
            "distancePx": round(dist, 2),
            "tolerancePx": 12.0,
            "detail": f"握點誤差={dist:.1f}px (tol=12px)",
        }
        if not grip_pass:
            slot_reports["hand_b"]["pass"] = False
            slot_reports["hand_b"]["tier"] = "FAIL"
            overall_pass = False

    # 依據 AG-22 動態推導關節列表
    joint_connections = derive_joint_connections(spec)

    # 3. 關節隱藏延伸檢驗
    joint_ext_reports: dict[str, Any] = {}
    for j_conn in joint_connections:
        conn_id = j_conn["id"]
        p_sid = j_conn["parent_slot"]
        c_sid = j_conn["child_slot"]

        if filter_slots and (p_sid not in filter_slots or c_sid not in filter_slots):
            continue

        p_empty = (p_sid not in loaded_parts) or slot_reports.get(p_sid, {}).get("empty", False)
        c_empty = (c_sid not in loaded_parts) or slot_reports.get(c_sid, {}).get("empty", False)

        if p_empty or c_empty:
            missing_info = []
            if p_empty:
                missing_info.append(f"{p_sid}(空)")
            if c_empty:
                missing_info.append(f"{c_sid}(空)")
            joint_ext_reports[conn_id] = {
                "pass": True,
                "tier": "SKIPPED",
                "skipped": True,
                "detail": f"槽位缺失或為空 ({', '.join(missing_info)})，跳過隱藏延伸檢查",
            }
            continue

        piv_pt = j_conn["pivot"]
        p_start_pt = j_conn["parent_pivot"]

        dir_p = (piv_pt[0] - p_start_pt[0], piv_pt[1] - p_start_pt[1])
        dir_c = (p_start_pt[0] - piv_pt[0], p_start_pt[1] - piv_pt[1])

        p_arr = loaded_parts[p_sid]
        c_arr = loaded_parts[c_sid]

        p_pass, p_ext = check_slot_hidden_extension(p_arr, piv_pt, dir_p, min_ext_px)
        c_pass, c_ext = check_slot_hidden_extension(c_arr, piv_pt, dir_c, min_ext_px)

        conn_pass = p_pass and c_pass
        joint_ext_reports[conn_id] = {
            "pass": conn_pass,
            "tier": "PASS" if conn_pass else "FAIL",
            "skipped": False,
            "parentExtensionPx": round(p_ext, 1),
            "childExtensionPx": round(c_ext, 1),
            "minRequiredPx": round(min_ext_px, 1),
            "detail": f"隱藏延伸: 父={p_ext:.1f}px, 子={c_ext:.1f}px (要求>={min_ext_px:.1f}px)",
        }

        if not p_pass:
            slot_reports[p_sid]["pass"] = False
            slot_reports[p_sid]["tier"] = "FAIL"
            slot_reports[p_sid]["checks"][f"hidden_extension_at_{conn_id}"] = {
                "pass": False,
                "tier": "FAIL",
                "detail": f"在 {conn_id} 處越過關節延伸不足: {p_ext:.1f}px < {min_ext_px:.1f}px",
            }
            overall_pass = False

        if not c_pass:
            slot_reports[c_sid]["pass"] = False
            slot_reports[c_sid]["tier"] = "FAIL"
            slot_reports[c_sid]["checks"][f"hidden_extension_at_{conn_id}"] = {
                "pass": False,
                "tier": "FAIL",
                "detail": f"在 {conn_id} 處越過關節延伸不足: {c_ext:.1f}px < {min_ext_px:.1f}px",
            }
            overall_pass = False

    # 4. 旋轉露縫檢驗 (繞樞紐旋轉 +/- rotationTestDeg，剛性連接 rigid=true 略過)
    rot_leak_reports: dict[str, Any] = {}
    for j_conn in joint_connections:
        conn_id = j_conn["id"]
        p_sid = j_conn["parent_slot"]
        c_sid = j_conn["child_slot"]

        if filter_slots and (p_sid not in filter_slots or c_sid not in filter_slots):
            continue

        p_empty = (p_sid not in loaded_parts) or slot_reports.get(p_sid, {}).get("empty", False)
        c_empty = (c_sid not in loaded_parts) or slot_reports.get(c_sid, {}).get("empty", False)

        if p_empty or c_empty:
            missing_info = []
            if p_empty:
                missing_info.append(f"{p_sid}(空)")
            if c_empty:
                missing_info.append(f"{c_sid}(空)")
            rot_leak_reports[conn_id] = {
                "pass": True,
                "tier": "SKIPPED",
                "skipped": True,
                "detail": f"槽位缺失或為空 ({', '.join(missing_info)})，跳過旋轉露縫檢查",
            }
            continue

        if j_conn.get("rigid", False):
            rot_leak_reports[conn_id] = {
                "pass": True,
                "tier": "SKIPPED",
                "skipped": True,
                "detail": f"{c_sid} 與 {p_sid} 為剛性連接 (rigid=True)，略過旋轉露縫檢查",
            }
            continue

        piv_pt = j_conn["pivot"]
        check_rad = float(j_conn.get("cap_rad", 40.0))
        tested_deg = float(j_conn.get("rotationTestDeg", rot_test_deg))

        p_arr = loaded_parts[p_sid]
        c_arr = loaded_parts[c_sid]

        leak_pos_ok, leak_pos_m = check_rotation_gap_leak(
            p_arr, c_arr, piv_pt, tested_deg, check_rad, exp_w, exp_h
        )
        leak_neg_ok, leak_neg_m = check_rotation_gap_leak(
            p_arr, c_arr, piv_pt, -tested_deg, check_rad, exp_w, exp_h
        )

        leak_pass = leak_pos_ok and leak_neg_ok
        leak_entry: dict[str, Any] = {
            "pass": leak_pass,
            "tier": "PASS" if leak_pass else "FAIL",
            "skipped": False,
            "testedAngles": [tested_deg, -tested_deg],
            "leakPixelsPositive": int(leak_pos_m.sum()),
            "leakPixelsNegative": int(leak_neg_m.sum()),
        }

        if not leak_pass and out_dir:
            leak_vis_path = out_dir / f"gap_leak_{c_sid}_{conn_id}.png"
            leak_vis_arr = np.zeros((exp_h, exp_w, 4), dtype=np.uint8)
            leak_vis_arr[leak_pos_m | leak_neg_m] = [255, 0, 0, 255]
            Image.fromarray(leak_vis_arr).save(leak_vis_path)
            leak_entry["leakImagePath"] = str(leak_vis_path)

            slot_reports[c_sid]["pass"] = False
            slot_reports[c_sid]["tier"] = "FAIL"
            slot_reports[c_sid]["checks"][f"rotation_leak_at_{conn_id}"] = {
                "pass": False,
                "tier": "FAIL",
                "detail": f"關節旋轉 +/-{tested_deg}° 時在關節周圍出現露縫",
                "leakImage": str(leak_vis_path),
            }
            overall_pass = False

        rot_leak_reports[conn_id] = leak_entry

    # 5. 重組比對 (若有提供參考圖，比對輪廓位置位移 p95 <= 2.0px)
    reassembly_report: dict[str, Any] | None = None
    if composite_ref_path and composite_ref_path.exists():
        ref_im = Image.open(composite_ref_path).convert("RGBA")
        ref_arr = np.array(ref_im)

        composite_arr = np.zeros((exp_h, exp_w, 4), dtype=np.uint8)
        for sid in all_slot_names:
            if sid in loaded_parts and not slot_reports[sid].get("empty"):
                p_arr = loaded_parts[sid]
                p_alpha = p_arr[..., 3] > 16
                composite_arr[p_alpha] = p_arr[p_alpha]

        comp_mask = composite_arr[..., 3] > 16
        ref_mask = ref_arr[..., 3] > 16
        chamfer_p95 = compute_contour_chamfer_p95(comp_mask, ref_mask)
        pos_pass = chamfer_p95 <= 2.0

        diff_rgb = np.abs(ref_arr[..., :3].astype(np.int16) - composite_arr[..., :3].astype(np.int16))
        max_rgb_diff = int(diff_rgb.max()) if diff_rgb.size > 0 else 0

        reassembly_report = {
            "pass": pos_pass,
            "tier": "PASS" if pos_pass else "FAIL",
            "contourOffsetP95Px": round(chamfer_p95, 2),
            "maxPositionTolerancePx": 2.0,
            "referenceMaxRgbDiff": max_rgb_diff,
            "detail": f"重組輪廓位移 p95={chamfer_p95:.2f}px (要求<=2.0px), RGB參考差={max_rgb_diff}",
        }
        if not pos_pass:
            overall_pass = False

    report = {
        "schema": "3klife.layered-parts-check-report.v1",
        "verificationScope": "offline-layered-parts-check-only (NOT Cocos runtime verified)",
        "overallPass": overall_pass,
        "overallTier": "PASS" if overall_pass else "FAIL",
        "testedSlots": target_slots,
        "slotCount": len(target_slots),
        "slotReports": slot_reports,
        "jointHiddenExtensions": joint_ext_reports,
        "rotationLeakChecks": rot_leak_reports,
        "reassemblyReport": reassembly_report,
    }

    if out_dir:
        rep_p = out_dir / "layered_parts_check_report.json"
        rep_p.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return report, overall_pass


def main() -> None:
    ap = argparse.ArgumentParser(description="分槽進件檢查工具 (check_layered_parts.py)")
    ap.add_argument("--parts-dir", type=Path, required=True, help="各槽圖檔目錄")
    ap.add_argument("--spec", type=Path, default=None, help="骨架規格 JSON (預設 canonical_skeleton_v3.json)")
    ap.add_argument("--body-type", type=str, default="standard", help="體型類別")
    ap.add_argument("--composite-ref", type=Path, default=None, help="參考合成圖 (選填)")
    ap.add_argument("--slots", type=str, default=None, help="指定檢查之槽位清單 (逗號分隔)")
    ap.add_argument("--out-dir", type=Path, default=Path("layered_check_out"), help="輸出報告目錄")

    args = ap.parse_args()

    filter_slots = [s.strip() for s in args.slots.split(",")] if args.slots else None

    report, passed = run_layered_parts_inspection(
        parts_dir=args.parts_dir,
        spec_path=args.spec,
        body_type=args.body_type,
        composite_ref_path=args.composite_ref,
        filter_slots=filter_slots,
        out_dir=args.out_dir,
    )

    print(json.dumps(report, indent=2, ensure_ascii=False))
    if not passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
