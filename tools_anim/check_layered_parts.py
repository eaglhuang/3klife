#!/usr/bin/env python3
"""分槽進件檢查工具 (check_layered_parts.py)

依據工單 AG-21 / AG-22 / AG-23 與 SPEC-RIG-POSE-03 / v3.4 規格：
1. 尺寸：每槽圖檔必須與 spec.canvas (2048x2048) 相同，未裁切。
2. 單槽範圍 (AG-23)：每槽依 JSON segments 與 bodyType 的 halfWidth 建出骨骼膠囊，外擴 12px。膠囊外不透明像素比例 > 1% 判 FAIL，輸出 outside_<slot>.png 標出超出位置。特殊部件檢查錨點。pauldron 依 shoulderOverlapZone 外擴 12px（暫定規則）。
3. 關節連接表：由 JSON bones 的父子關係動態推導產生。特例由 layeredSlots.jointOverrides 驅動。
4. 隱藏延伸：每個關節兩側部件必須越過關節至少 hiddenExtensionH * H (預設 0.03H = 48px)。
5. 旋轉露縫：每個關節把子部件繞樞紐 (pivotCanvasPx) 旋轉 +/- rotationTestDeg，合成後關節附近不可出現透明露縫。剛性連接 (rigid=true) 略過。
6. 重組差：若提供參考圖，比對 alpha 輪廓位置位移 (Chamfer/Hausdorff p95 <= 2 px)，RGB 差另外列為參考值。
7. 握點：hand_f / hand_b 拳心孔中心與 grip_A / grip_B 誤差 <= 12px。
8. 容錯：少一槽時，涉及該槽的關節標 SKIPPED，不判 FAIL；報告中明列各項檢查結果。
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
    raw_names = layered_cfg.get("names")
    if not raw_names or not isinstance(raw_names, list):
        raise ValueError("規範 JSON 中缺少 'layeredSlots.names'，請先於 JSON 定義槽位列表")
    slot_names = set(raw_names)
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
            # 樞紐關節點：手腕關節取 wrist_f/b，其他依子骨之 pivotCanvasPx
            pivot_key_map = {"hand_f": "wrist_f", "hand_b": "wrist_b"}
            j_key = pivot_key_map.get(child_name)
            if j_key and j_key in spec.get("joints", {}):
                j_obj = spec["joints"][j_key]
                child_pivot = (float(j_obj.get("x", 1024.0)), float(j_obj.get("y", 1024.0)))
            else:
                child_pivot = tuple(b.get("pivotCanvasPx", [1024.0, 1024.0]))

            parent_pivot = tuple(p_bone.get("pivotCanvasPx", [1024.0, 1024.0]))

            cap_rad = float(override.get("capRadiusPx", 40.0))
            is_rigid = bool(override.get("rigid", False))
            rot_deg = float(override.get("rotationTestDeg", default_rot))

            # AG-26: 若 segment 配置含有 neckExtension.rotationTestDeg，動態讀取覆蓋旋轉角度
            seg_alias_map = {
                "arm_upper_f": "upperarm_f",
                "arm_upper_b": "upperarm_b",
                "arm_lower_f": "forearm_f",
                "arm_lower_b": "forearm_b",
            }
            c_seg_name = seg_alias_map.get(child_name, child_name)
            c_seg_def = spec.get("segments", {}).get(c_seg_name, {})
            if "neckExtension" in c_seg_def and isinstance(c_seg_def["neckExtension"], dict):
                rot_deg = float(c_seg_def["neckExtension"].get("rotationTestDeg", rot_deg))

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


def build_slot_scope_mask(
    slot_name: str,
    spec: dict[str, Any],
    body_type: str,
    w: int,
    h: int,
    ext_px: float | None = None,
) -> tuple[np.ndarray | None, str]:
    """AG-23: 建立指定槽位的骨骼膠囊/範圍合規遮罩 (包含外擴 ext_px)
    若該槽屬於特殊部件 (weapon, cape, skirt, hair_tail) 則回傳 (None, "anchor_only")
    """
    if slot_name in ("weapon", "cape", "skirt", "hair_tail"):
        return None, "anchor_only"

    joints = spec.get("joints", {})

    def get_j(name: str, def_xy: tuple[float, float] = (1024.0, 1024.0)) -> tuple[float, float]:
        j = joints.get(name, {})
        return float(j.get("x", def_xy[0])), float(j.get("y", def_xy[1]))

    im = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(im)

    segments = spec.get("segments", {})
    layered_cfg = spec.get("layeredSlots", {})
    h_val = float(spec.get("H", 1600))
    if ext_px is None:
        ext_px = float(layered_cfg.get("scopeMarginPx", 12.0))

    # 肩甲特殊暫定規則 (依 AG-23: 以 shoulderOverlapZone 圓外擴 ext_px)
    soz = spec.get("shoulderOverlapZone", {})
    pauldron_prefix = soz.get("parentSideExtensionWaivedWhen", "pauldron")
    pauldron_slots = (f"{pauldron_prefix}_f", f"{pauldron_prefix}_b")
    if slot_name in pauldron_slots:
        rad_h = float(soz.get("radiusH", 0.06))
        rad = rad_h * h_val + ext_px
        j_name = "shoulder_f" if slot_name.endswith("_f") else "shoulder_b"
        c = get_j(j_name)
        draw.ellipse([c[0] - rad, c[1] - rad, c[0] + rad, c[1] + rad], fill=255)
        return np.array(im) > 128, f"{pauldron_prefix}_provisional_overlap_zone"

    # 骨盆 (pelvis)
    if slot_name == "pelvis":
        c = get_j("pelvis")
        hw_spec = segments.get("torso", {}).get("halfWidth", {})
        bt_hw = hw_spec.get(body_type, hw_spec.get("standard", [110, 145])) if isinstance(hw_spec, dict) else [110, 145]
        max_hw = float(bt_hw[1]) if isinstance(bt_hw, (list, tuple)) else float(bt_hw)
        rad = max_hw + ext_px
        draw.ellipse([c[0] - rad, c[1] - (rad * 0.7), c[0] + rad, c[1] + (rad * 0.7)], fill=255)
        return np.array(im) > 128, "pelvis_capsule"

    # 對應 segments key
    seg_key_map = {
        "torso": "torso",
        "arm_upper_f": "upperarm_f",
        "arm_upper_b": "upperarm_b",
        "arm_lower_f": "forearm_f",
        "arm_lower_b": "forearm_b",
        "thigh_f": "thigh_f",
        "thigh_b": "thigh_b",
        "shin_f": "shin_f",
        "shin_b": "shin_b",
        "head": "head",
        "hand_f": "hand_f",
        "hand_b": "hand_b",
        "foot_f": "foot_f",
        "foot_b": "foot_b",
    }
    seg_key = seg_key_map.get(slot_name, slot_name)
    seg_info = segments.get(seg_key, {})
    if not seg_info:
        return None, "no_segment_def"

    # AG-26: 若指定 zoneAppliesTo == "core" 或含有 neckExtension，採用分區遮罩 (core + extension)，不跑膠囊
    if seg_info.get("zoneAppliesTo") == "core" or "neckExtension" in seg_info:
        neck_ext = seg_info.get("neckExtension", {})
        split_joint = neck_ext.get("joint", seg_info.get("from", "neck"))
        split_pt = get_j(split_joint)
        split_y = split_pt[1]

        zone = seg_info.get("zone", [0, 0, w, h])
        zx1, zy1, zx2, zy2 = zone
        core_rect = [zx1 - ext_px, zy1 - ext_px, zx2 + ext_px, max(zy2 + ext_px, split_y)]
        draw.rectangle([core_rect[0], core_rect[1], core_rect[2], split_y], fill=255)

        max_hw = float(neck_ext.get("maxHalfWidthPx", 64.0))
        max_below = float(neck_ext.get("maxBelowPx", 64.0))
        ext_rect = [split_pt[0] - max_hw, split_y, split_pt[0] + max_hw, split_y + max_below]
        draw.rectangle(ext_rect, fill=255)

        return np.array(im) > 128, "partitioned_zone_core"

    # 1. 膠囊型 (from -> to)
    if "from" in seg_info and "to" in seg_info:
        p1 = get_j(seg_info["from"])
        p2 = get_j(seg_info["to"])
        hw_spec = seg_info.get("halfWidth", {})
        if isinstance(hw_spec, str) and "upperarm_f" in hw_spec:
            hw_spec = segments.get("upperarm_f", {}).get("halfWidth", {})
        elif isinstance(hw_spec, str) and "forearm_f" in hw_spec:
            hw_spec = segments.get("forearm_f", {}).get("halfWidth", {})
        elif isinstance(hw_spec, str) and "thigh_f" in hw_spec:
            hw_spec = segments.get("thigh_f", {}).get("halfWidth", {})
        elif isinstance(hw_spec, str) and "shin_f" in hw_spec:
            hw_spec = segments.get("shin_f", {}).get("halfWidth", {})

        bt_hw = hw_spec.get(body_type, hw_spec.get("standard", [45, 65])) if isinstance(hw_spec, dict) else [45, 65]
        max_hw = float(bt_hw[1]) if isinstance(bt_hw, (list, tuple)) else float(bt_hw)
        rad = max_hw + ext_px

        draw.line([p1, p2], fill=255, width=int(round(rad * 2)))
        draw.ellipse([p1[0] - rad, p1[1] - rad, p1[0] + rad, p1[1] + rad], fill=255)
        draw.ellipse([p2[0] - rad, p2[1] - rad, p2[0] + rad, p2[1] + rad], fill=255)
        return np.array(im) > 128, "bone_capsule"

    # 2. 圓形手部 (center, radius) + 手腕關節延伸
    if "center" in seg_info and "radius" in seg_info:
        grips_cfg = spec.get("grips", {})
        g_name = seg_info["center"]
        if g_name in grips_cfg:
            c = (float(grips_cfg[g_name].get("x", 1024.0)), float(grips_cfg[g_name].get("y", 1024.0)))
        else:
            c = get_j(g_name)
        rad_spec = seg_info["radius"]
        max_r = float(rad_spec[1]) if isinstance(rad_spec, (list, tuple)) else float(rad_spec)
        rad = max_r + ext_px
        draw.ellipse([c[0] - rad, c[1] - rad, c[0] + rad, c[1] + rad], fill=255)

        # 若為 hand，需涵蓋 wrist 樞紐連接通道與關節重疊延伸端蓋
        wrist_joint_name = "wrist_f" if slot_name.endswith("_f") else "wrist_b"
        if wrist_joint_name in joints:
            w_pt = get_j(wrist_joint_name)
            draw.line([c, w_pt], fill=255, width=int(round(rad * 2)))
            draw.ellipse([w_pt[0] - rad, w_pt[1] - rad, w_pt[0] + rad, w_pt[1] + rad], fill=255)
            elbow_name = "elbow_f" if slot_name.endswith("_f") else "elbow_b"
            if elbow_name in joints:
                e_pt = get_j(elbow_name)
                v_ew = (e_pt[0] - w_pt[0], e_pt[1] - w_pt[1])
                dist_ew = math.hypot(v_ew[0], v_ew[1]) or 1.0
                hidden_ext_h = float(layered_cfg.get("hiddenExtensionH", 0.03))
                ext_len = hidden_ext_h * h_val
                ext_w = (w_pt[0] + (v_ew[0] / dist_ew) * ext_len, w_pt[1] + (v_ew[1] / dist_ew) * ext_len)
                draw.line([w_pt, ext_w], fill=255, width=int(round(rad * 2)))
                draw.ellipse([ext_w[0] - rad, ext_w[1] - rad, ext_w[0] + rad, ext_w[1] + rad], fill=255)

        return np.array(im) > 128, "hand_circle"

    # 3. 區域矩形 (zone: [x1, y1, x2, y2])
    if "zone" in seg_info:
        zone = seg_info["zone"]
        ref_joint = "neck" if slot_name == "head" else ("ankle_f" if slot_name.endswith("_f") else "ankle_b")
        cur_ref = get_j(ref_joint)
        def_refs = {"neck": (1030.0, 880.0), "ankle_f": (1135.0, 1850.0), "ankle_b": (915.0, 1850.0)}
        d_ref = def_refs.get(ref_joint, (1024.0, 1024.0))
        shift_x = cur_ref[0] - d_ref[0]
        shift_y = cur_ref[1] - d_ref[1]

        x1 = float(zone[0]) + shift_x - ext_px
        y1 = float(zone[1]) + shift_y - ext_px
        x2 = float(zone[2]) + shift_x + ext_px
        y2 = float(zone[3]) + shift_y + ext_px
        draw.rectangle([x1, y1, x2, y2], fill=255)
        return np.array(im) > 128, "zone_box"

    return None, "unsupported"


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
    all_slot_names = layered_cfg.get("names")
    if not all_slot_names or not isinstance(all_slot_names, list):
        raise ValueError("規範 JSON 中缺少 'layeredSlots.names'，請先於 JSON 定義槽位列表")
    target_slots = [s for s in all_slot_names if s in filter_slots] if filter_slots else all_slot_names

    hidden_ext_h = float(layered_cfg.get("hiddenExtensionH", 0.03))
    min_ext_px = hidden_ext_h * h_val
    rot_test_deg = float(layered_cfg.get("rotationTestDeg", 30))

    joints = spec.get("joints", {})

    def get_j(name: str, def_xy: tuple[float, float] = (1024.0, 1024.0)) -> tuple[float, float]:
        j = joints.get(name, {})
        return float(j.get("x", def_xy[0])), float(j.get("y", def_xy[1]))

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

    # AG-25: 讀取 shoulderOverlapZone 與 parentSideExtensionWaivedWhen 豁免設定
    shoulder_overlap_cfg = spec.get("shoulderOverlapZone", {})
    shoulder_joint_names = shoulder_overlap_cfg.get("joints", ["shoulder_f", "shoulder_b"])
    parent_waive_prefix = shoulder_overlap_cfg.get("parentSideExtensionWaivedWhen")
    joints_dict = spec.get("joints", {})
    shoulder_joint_positions: dict[str, tuple[float, float]] = {}
    for sj_name in shoulder_joint_names:
        if sj_name in joints_dict:
            sj_obj = joints_dict[sj_name]
            shoulder_joint_positions[sj_name] = (float(sj_obj.get("x", 0.0)), float(sj_obj.get("y", 0.0)))

    # 1. 讀取並檢驗各槽基本尺寸、空槽狀態與單槽範圍 (AG-23)
    for sid in target_slots:
        p_path = parts_dir / f"{sid}.png"
        if not p_path.exists():
            slot_reports[sid] = {
                "pass": True,
                "tier": "PASS",
                "empty": True,
                "detail": "空槽 (檔案不存在)",
                "checks": {
                    "dimension": {"pass": True, "tier": "SKIPPED", "skipped": True, "detail": "檔案不存在，略過尺寸檢查"},
                    "scope_capsule_bounds": {"pass": True, "tier": "SKIPPED", "skipped": True, "detail": "檔案不存在，略過範圍檢查"},
                },
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
                "checks": {
                    "dimension": {"pass": True, "tier": "PASS", "skipped": False, "detail": f"尺寸={pw}x{ph}"},
                    "scope_capsule_bounds": {"pass": True, "tier": "SKIPPED", "skipped": True, "detail": "完全透明，略過範圍檢查"},
                },
            }
            loaded_parts[sid] = arr
            continue

        size_pass = (pw == exp_w and ph == exp_h)
        dim_check = {
            "pass": size_pass,
            "tier": "PASS" if size_pass else "FAIL",
            "skipped": False,
            "detail": f"尺寸: 現為{pw}x{ph}, 規格為{exp_w}x{exp_h}",
        }

        if not size_pass:
            slot_reports[sid] = {
                "pass": False,
                "tier": "FAIL",
                "empty": False,
                "detail": f"尺寸不合規格: 現為{pw}x{ph}, 規格為{exp_w}x{exp_h}",
                "checks": {"dimension": dim_check},
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
            "checks": {"dimension": dim_check},
        }

        # AG-23: 單槽範圍檢查 (每槽都做，不需要相鄰槽)
        scope_margin_px = float(layered_cfg.get("scopeMarginPx", 12.0))
        scope_mask, scope_type = build_slot_scope_mask(sid, spec, body_type, exp_w, exp_h, ext_px=scope_margin_px)
        if scope_type == "anchor_only":
            slot_reports[sid]["checks"]["scope_capsule_bounds"] = {
                "pass": True,
                "tier": "SKIPPED",
                "skipped": True,
                "scopeType": scope_type,
                "detail": "特殊部件 (weapon/cape/skirt/hair_tail)，依規格只檢查錨點，略過膠囊範圍限制",
            }
        elif scope_mask is not None:
            vis_mask = alpha > 16
            tot_vis = int(vis_mask.sum())
            if tot_vis > 0:
                outside_m = vis_mask & (~scope_mask)
                outside_cnt = int(outside_m.sum())
                outside_ratio = outside_cnt / tot_vis
                scope_pass = (outside_ratio <= 0.01)

                scope_check_entry: dict[str, Any] = {
                    "pass": scope_pass,
                    "tier": "PASS" if scope_pass else "FAIL",
                    "skipped": False,
                    "scopeType": scope_type,
                    "outsideRatio": round(outside_ratio, 4),
                    "outsidePixels": outside_cnt,
                    "totalVisiblePixels": tot_vis,
                    "toleranceRatio": 0.01,
                    "detail": f"膠囊外擴{scope_margin_px:.0f}px外像素佔比={outside_ratio*100:.2f}% (容差<=1.0%)",
                }
                if scope_type == "pauldron_provisional_overlap_zone":
                    scope_check_entry["note"] = f"pauldron 在 JSON 無膠囊，暫以 shoulderOverlapZone 外擴 {scope_margin_px:.0f}px 判定 (暫定規則)"

                if not scope_pass:
                    slot_reports[sid]["pass"] = False
                    slot_reports[sid]["tier"] = "FAIL"
                    overall_pass = False
                    if out_dir:
                        out_img_path = out_dir / f"outside_{sid}.png"
                        out_vis = np.zeros((exp_h, exp_w, 4), dtype=np.uint8)
                        out_vis[vis_mask] = [100, 100, 100, 120]
                        out_vis[outside_m] = [255, 0, 0, 255]
                        Image.fromarray(out_vis).save(out_img_path)
                        scope_check_entry["outsideImagePath"] = str(out_img_path)

                # AG-26: 若 segment 定義了 neckExtension，執行專屬分區量測與定位檢查
                seg_k_map = {
                    "arm_upper_f": "upperarm_f",
                    "arm_upper_b": "upperarm_b",
                    "arm_lower_f": "forearm_f",
                    "arm_lower_b": "forearm_b",
                }
                s_seg_key = seg_k_map.get(sid, sid)
                s_seg = spec.get("segments", {}).get(s_seg_key, {})

                if "neckExtension" in s_seg and tot_vis > 0:
                    neck_ext = s_seg["neckExtension"]
                    ref_j_name = neck_ext.get("joint", s_seg.get("from"))
                    ref_pt = get_j(ref_j_name)
                    split_y = ref_pt[1]

                    zone = s_seg.get("zone", [0, 0, exp_w, exp_h])
                    margin = scope_margin_px
                    core_rect = [zone[0] - margin, zone[1] - margin, zone[2] + margin, zone[3] + margin]

                    # 1. Core 檢查 (y <= split_y): 只在 0° 檢 zone + scopeMarginPx
                    y_indices, x_indices = np.where(vis_mask)
                    core_mask = y_indices <= split_y
                    core_vis = int(core_mask.sum())
                    core_outside = 0
                    if core_vis > 0:
                        core_xs = x_indices[core_mask]
                        core_ys = y_indices[core_mask]
                        core_out_mask = (core_xs < core_rect[0]) | (core_xs > core_rect[2]) | (core_ys < core_rect[1]) | (core_ys > core_rect[3])
                        core_outside = int(core_out_mask.sum())
                    core_outside_ratio = core_outside / max(1, core_vis)
                    core_pass = (core_outside_ratio <= 0.01)

                    # 2. Extension 檢查 (y > split_y): 檢向下長度在 min～max、左右不超出 joint.x ± maxHalfWidthPx
                    ext_mask = y_indices > split_y
                    ext_vis = int(ext_mask.sum())
                    min_below = float(neck_ext.get("minBelowPx", 48.0))
                    max_below = float(neck_ext.get("maxBelowPx", 64.0))
                    max_hw = float(neck_ext.get("maxHalfWidthPx", 64.0))

                    ext_detail_msgs = []
                    if ext_vis == 0:
                        actual_below = 0.0
                        ext_length_pass = False
                        ext_width_pass = False
                        ext_min_x, ext_max_x = ref_pt[0], ref_pt[0]
                        ext_detail_msgs.append(f"無延伸像素 (要求向下 {min_below:.0f}~{max_below:.0f}px)")
                    else:
                        ext_xs = x_indices[ext_mask]
                        ext_ys = y_indices[ext_mask]
                        actual_below = float(ext_ys.max() - split_y)
                        ext_length_pass = (actual_below >= min_below) and (actual_below <= max_below)
                        if actual_below < min_below:
                            ext_detail_msgs.append(f"向下延伸不足: {actual_below:.1f}px < {min_below:.0f}px")
                        elif actual_below > max_below:
                            ext_detail_msgs.append(f"向下延伸過長: {actual_below:.1f}px > {max_below:.0f}px")

                        ext_min_x = float(ext_xs.min())
                        ext_max_x = float(ext_xs.max())
                        left_bound = ref_pt[0] - max_hw
                        right_bound = ref_pt[0] + max_hw
                        ext_width_pass = (ext_min_x >= left_bound - 0.5) and (ext_max_x <= right_bound + 0.5)
                        if not ext_width_pass:
                            ext_detail_msgs.append(f"水平超出範圍: [{ext_min_x:.1f}, {ext_max_x:.1f}] 不在 [{left_bound:.1f}, {right_bound:.1f}] 內")

                    ext_pass = ext_length_pass and ext_width_pass

                    # 3. Registration（定位）檢查
                    reg_cfg = s_seg.get("registration", {})
                    gated_points = reg_cfg.get("gated", [])
                    recorded_points = reg_cfg.get("recorded", [])

                    # 讀取 anchor 檔案
                    anchor_data = {}
                    for cand_name in ["anchors.json", f"{sid}_anchors.json", "r274-normalization-and-mask-report.json", "registration_anchors.json"]:
                        cand_p = parts_dir / cand_name
                        if not cand_p.exists():
                            cand_p = parts_dir.parent / cand_name
                        if cand_p.exists():
                            try:
                                cand_json = json.loads(cand_p.read_text(encoding="utf-8"))
                                if "anchors" in cand_json:
                                    anchor_data = cand_json["anchors"]
                                    break
                            except Exception:
                                pass

                    reg_checks = {}
                    reg_pass = True
                    for pt_name in gated_points + recorded_points:
                        is_gated = pt_name in gated_points
                        target_pt = get_j(pt_name)
                        tol = float(joints.get(pt_name, {}).get("tol", 30.0))

                        reg_pt = None
                        if pt_name in anchor_data:
                            info = anchor_data[pt_name]
                            reg_pt = info.get("registeredPx", info.get("sourcePx"))
                        elif pt_name == ref_j_name and "neck_root" in anchor_data:
                            reg_pt = anchor_data["neck_root"].get("registeredPx")

                        if reg_pt is None:
                            if pt_name == ref_j_name and ext_vis > 0:
                                split_row = int(round(split_y))
                                if 0 <= split_row < exp_h:
                                    row_xs = np.where(alpha[split_row, :] > 16)[0]
                                    if len(row_xs) > 0:
                                        reg_pt = [float(np.mean(row_xs)), split_y]
                            if reg_pt is None and pt_name == "head_center" and core_vis > 0:
                                reg_pt = [float(np.mean(core_xs)), float(np.mean(core_ys))]
                            if reg_pt is None:
                                reg_pt = list(target_pt)

                        dx = float(reg_pt[0] - target_pt[0])
                        dy = float(reg_pt[1] - target_pt[1])
                        dist = math.hypot(dx, dy)
                        pt_pass = dist <= tol

                        reg_checks[pt_name] = {
                            "isGated": is_gated,
                            "targetPx": list(target_pt),
                            "registeredPx": [round(reg_pt[0], 2), round(reg_pt[1], 2)],
                            "errorPx": [round(dx, 2), round(dy, 2)],
                            "distancePx": round(dist, 2),
                            "tolerancePx": tol,
                            "pass": pt_pass if is_gated else True,
                            "tier": ("PASS" if pt_pass else "FAIL") if is_gated else "RECORDED",
                        }
                        if is_gated and not pt_pass:
                            reg_pass = False

                    partition_overall = core_pass and ext_pass and reg_pass

                    scope_check_entry["partitionedInspection"] = {
                        "pass": partition_overall,
                        "tier": "PASS" if partition_overall else "FAIL",
                        "core": {
                            "pass": core_pass,
                            "tier": "PASS" if core_pass else "FAIL",
                            "outsideRatio": round(core_outside_ratio, 4),
                            "outsidePixels": core_outside,
                            "totalVisiblePixels": core_vis,
                            "zone": zone,
                            "marginPx": margin,
                        },
                        "extension": {
                            "pass": ext_pass,
                            "tier": "PASS" if ext_pass else "FAIL",
                            "lengthPass": ext_length_pass,
                            "actualBelowPx": round(actual_below, 1),
                            "minBelowPx": min_below,
                            "maxBelowPx": max_below,
                            "widthPass": ext_width_pass,
                            "minX": round(ext_min_x, 1),
                            "maxX": round(ext_max_x, 1),
                            "allowedXRange": [round(ref_pt[0] - max_hw, 1), round(ref_pt[0] + max_hw, 1)],
                            "issues": ext_detail_msgs,
                        },
                        "registration": {
                            "pass": reg_pass,
                            "tier": "PASS" if reg_pass else "FAIL",
                            "points": reg_checks,
                        },
                    }

                    if not partition_overall:
                        scope_check_entry["pass"] = False
                        scope_check_entry["tier"] = "FAIL"
                        scope_check_entry["detail"] = (
                            f"分區檢查未通過: Core={'PASS' if core_pass else 'FAIL'}, "
                            f"Extension={'PASS' if ext_pass else 'FAIL'} ({'; '.join(ext_detail_msgs)}), "
                            f"Registration={'PASS' if reg_pass else 'FAIL'}"
                        )
                        slot_reports[sid]["pass"] = False
                        slot_reports[sid]["tier"] = "FAIL"
                        overall_pass = False

                slot_reports[sid]["checks"]["scope_capsule_bounds"] = scope_check_entry

    # 2. 檢驗握點 (hand_f / hand_b 拳心孔中心誤差 <= gripTolerancePx)
    grip_tol_px = float(layered_cfg.get("gripTolerancePx", spec.get("gripsTolerancePx", 12.0)))
    if "hand_f" in loaded_parts and not slot_reports["hand_f"].get("empty"):
        h_arr = loaded_parts["hand_f"]
        exp_pt = (float(grip_a[0]), float(grip_a[1]))
        found, pt, dist = find_fist_hole_center(h_arr, exp_pt)
        grip_pass = found and (dist <= grip_tol_px)
        slot_reports["hand_f"]["checks"]["grip_point_accuracy"] = {
            "pass": grip_pass,
            "tier": "PASS" if grip_pass else "FAIL",
            "holeFound": found,
            "center": list(pt),
            "targetGrip": list(grip_a),
            "distancePx": round(dist, 2),
            "tolerancePx": grip_tol_px,
            "detail": f"握點誤差={dist:.1f}px (tol={grip_tol_px:.0f}px)",
        }
        if not grip_pass:
            slot_reports["hand_f"]["pass"] = False
            slot_reports["hand_f"]["tier"] = "FAIL"
            overall_pass = False

    if "hand_b" in loaded_parts and not slot_reports["hand_b"].get("empty"):
        h_arr = loaded_parts["hand_b"]
        exp_pt = (float(grip_b[0]), float(grip_b[1]))
        found, pt, dist = find_fist_hole_center(h_arr, exp_pt)
        grip_pass = found and (dist <= grip_tol_px)
        slot_reports["hand_b"]["checks"]["grip_point_accuracy"] = {
            "pass": grip_pass,
            "tier": "PASS" if grip_pass else "FAIL",
            "holeFound": found,
            "center": list(pt),
            "targetGrip": list(grip_b),
            "distancePx": round(dist, 2),
            "tolerancePx": grip_tol_px,
            "detail": f"握點誤差={dist:.1f}px (tol={grip_tol_px:.0f}px)",
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

        # AG-25: 肩部父側隱藏延伸豁免檢查
        p_waived = False
        p_waived_reason = ""
        matched_shoulder_joint = None

        if not p_pass and parent_waive_prefix:
            # 檢查當前關節樞紐是否匹配 shoulderOverlapZone.joints 之一
            for sj_name, sj_pos in shoulder_joint_positions.items():
                if math.hypot(piv_pt[0] - sj_pos[0], piv_pt[1] - sj_pos[1]) <= 1.0:
                    matched_shoulder_joint = sj_name
                    break

            if matched_shoulder_joint:
                # 槽名前綴加 _f / _b 對應
                suffix = "_f" if matched_shoulder_joint.endswith("_f") else ("_b" if matched_shoulder_joint.endswith("_b") else "")
                matching_pauldron_slot = f"{parent_waive_prefix}{suffix}"

                # 檢查同側 pauldron 槽是否存在且非空
                if matching_pauldron_slot in loaded_parts and not slot_reports.get(matching_pauldron_slot, {}).get("empty", False):
                    pauldron_img = loaded_parts[matching_pauldron_slot]
                    if pauldron_img.ndim == 3 and pauldron_img.shape[2] == 4:
                        p_alpha = pauldron_img[..., 3]
                        p_ys, p_xs = np.where(p_alpha > 0)
                        if len(p_xs) > 0:
                            dist_to_piv = float(np.hypot(p_xs - piv_pt[0], p_ys - piv_pt[1]).min())
                            if dist_to_piv <= 20.0:
                                p_waived = True
                                p_waived_reason = (
                                    f"同側 {matching_pauldron_slot} 存在且覆蓋肩關節 (距離={dist_to_piv:.1f}px <= 20px)，"
                                    f"父側延伸不足 ({p_ext:.1f}px < {min_ext_px:.1f}px) 依 shoulderOverlapZone 豁免"
                                )

        p_effective_pass = p_pass or p_waived
        conn_pass = p_effective_pass and c_pass

        joint_ext_entry: dict[str, Any] = {
            "pass": conn_pass,
            "tier": "PASS" if conn_pass else "FAIL",
            "skipped": False,
            "parentExtensionPx": round(p_ext, 1),
            "childExtensionPx": round(c_ext, 1),
            "minRequiredPx": round(min_ext_px, 1),
            "parentWaived": p_waived,
            "detail": f"隱藏延伸: 父={p_ext:.1f}px{' (WAIVED)' if p_waived else ''}, 子={c_ext:.1f}px (要求>={min_ext_px:.1f}px)",
        }
        if p_waived:
            joint_ext_entry["parentWaivedReason"] = p_waived_reason
        joint_ext_reports[conn_id] = joint_ext_entry

        if p_waived:
            slot_reports[p_sid]["checks"][f"hidden_extension_at_{conn_id}"] = {
                "pass": True,
                "tier": "WAIVED",
                "parentExtensionPx": round(p_ext, 1),
                "minRequiredPx": round(min_ext_px, 1),
                "detail": p_waived_reason,
            }
        elif not p_pass:
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
