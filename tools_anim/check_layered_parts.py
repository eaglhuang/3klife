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
    joint_geo = layered_cfg.get("jointGeometry", {})
    rot_piv_rule = joint_geo.get("rotationPivot")

    connections = []
    for b in bones_list:
        if not isinstance(b, dict):
            continue
        child_name = b.get("name")
        override = joint_overrides.get(child_name, {})
        parent_name = override.get("parent", b.get("parent"))

        if child_name in slot_names and parent_name in slot_names:
            p_bone = bones_dict.get(parent_name, {})

            # AG-31b: 若 jointGeometry.rotationPivot == "childBonePivot"，一律取骨點 bones[].pivotCanvasPx
            pivot_source = "bonePivot"
            if rot_piv_rule == "childBonePivot":
                child_pivot = tuple(b.get("pivotCanvasPx", [1024.0, 1024.0]))
                pivot_source = "bonePivot"
            elif child_name.startswith("hand_"):
                # 缺鍵時維持舊行為：手部取父段 to 關節 (腕部)
                seg_alias_map = {
                    "arm_upper_f": "upperarm_f",
                    "arm_upper_b": "upperarm_b",
                    "arm_lower_f": "forearm_f",
                    "arm_lower_b": "forearm_b",
                }
                p_seg_name = seg_alias_map.get(parent_name, parent_name)
                p_seg_to = spec.get("segments", {}).get(p_seg_name, {}).get("to")
                if p_seg_to and p_seg_to in spec.get("joints", {}):
                    j_obj = spec["joints"][p_seg_to]
                    child_pivot = (float(j_obj.get("x", 1024.0)), float(j_obj.get("y", 1024.0)))
                    pivot_source = "joint"
                else:
                    child_pivot = tuple(b.get("pivotCanvasPx", [1024.0, 1024.0]))
                    pivot_source = "bonePivot"
            else:
                child_pivot = tuple(b.get("pivotCanvasPx", [1024.0, 1024.0]))
                pivot_source = "bonePivot"

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

            rot_occluders = list(override.get("rotationOccluders", []))
            parent_side_occluders = list(override.get("parentSideOccluders", []))
            detached_child = bool(override.get("detachedChild", False))

            connections.append({
                "id": f"{parent_name}_to_{child_name}",
                "joint_name": child_name,
                "parent_slot": parent_name,
                "child_slot": child_name,
                "pivot": child_pivot,
                "parent_pivot": parent_pivot,
                "pivotSource": pivot_source,
                "cap_rad": cap_rad,
                "rigid": is_rigid,
                "rotationTestDeg": rot_deg,
                "rotationOccluders": rot_occluders,
                "parentSideOccluders": parent_side_occluders,
                "detachedChild": detached_child,
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
        cand_j = [j for j in soz.get("joints", []) if (j.endswith("_f") if slot_name.endswith("_f") else j.endswith("_b"))]
        c = get_j(cand_j[0]) if cand_j else (1024.0, 1024.0)
        draw.ellipse([c[0] - rad, c[1] - rad, c[0] + rad, c[1] + rad], fill=255)
        return np.array(im) > 128, f"{pauldron_prefix}_provisional_overlap_zone"

    # 骨盆：由 torso segment 的 from 關節推導
    torso_from_joint = segments.get("torso", {}).get("from")
    if torso_from_joint and slot_name == torso_from_joint:
        c = get_j(torso_from_joint)
        hw_spec = segments.get("torso", {}).get("halfWidth", {})
        bt_hw = hw_spec.get(body_type, hw_spec.get("standard", [110, 145])) if isinstance(hw_spec, dict) else [110, 145]
        max_hw = float(bt_hw[1]) if isinstance(bt_hw, (list, tuple)) else float(bt_hw)
        rad = max_hw + ext_px
        draw.ellipse([c[0] - rad, c[1] - (rad * 0.7), c[0] + rad, c[1] + (rad * 0.7)], fill=255)
        return np.array(im) > 128, f"{torso_from_joint}_capsule"

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
        split_joint = neck_ext.get("joint") or seg_info.get("from")
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
        joint_geo = layered_cfg.get("jointGeometry", {})
        capsule_axis_mode = joint_geo.get("scopeCapsuleAxis")
        p1 = None
        p2 = None
        if capsule_axis_mode == "boneToChildBonePivot":
            # 肢段膠囊軸 = 自身骨點 -> 子骨點
            bones_list = spec.get("bones", [])
            bones_dict = {b["name"]: b for b in bones_list if isinstance(b, dict) and "name" in b}
            self_bone = bones_dict.get(slot_name)
            child_bone = next((b for b in bones_list if isinstance(b, dict) and b.get("parent") == slot_name), None)
            if self_bone and "pivotCanvasPx" in self_bone:
                p1 = tuple(self_bone["pivotCanvasPx"])
            if child_bone and "pivotCanvasPx" in child_bone:
                p2 = tuple(child_bone["pivotCanvasPx"])

        if p1 is None or p2 is None:
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

        # 若為 hand，需涵蓋父段骨骼連接通道與關節重疊延伸端蓋
        seg_alias_map = {
            "arm_upper_f": "upperarm_f",
            "arm_upper_b": "upperarm_b",
            "arm_lower_f": "forearm_f",
            "arm_lower_b": "forearm_b",
        }
        parent_bone_name = next((b.get("parent") for b in spec.get("bones", []) if b.get("name") == slot_name), None)
        p_seg_name = seg_alias_map.get(parent_bone_name, parent_bone_name)
        parent_seg = segments.get(p_seg_name, {})
        wrist_joint_name = parent_seg.get("to")
        elbow_name = parent_seg.get("from")
        if wrist_joint_name and wrist_joint_name in joints:
            w_pt = get_j(wrist_joint_name)
            draw.line([c, w_pt], fill=255, width=int(round(rad * 2)))
            draw.ellipse([w_pt[0] - rad, w_pt[1] - rad, w_pt[0] + rad, w_pt[1] + rad], fill=255)
            if elbow_name and elbow_name in joints:
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
        x1 = float(zone[0]) - ext_px
        y1 = float(zone[1]) - ext_px
        x2 = float(zone[2]) + ext_px
        y2 = float(zone[3]) + ext_px
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
    occluder_arrs: dict[str, np.ndarray] | None = None,
    grip_points: list[tuple[float, float]] | None = None,
    parent_side_occluder_arrs: dict[str, np.ndarray] | None = None,
    max_crack_width_px: int = 12,
) -> tuple[bool, np.ndarray, dict[str, Any]]:
    """檢驗子部件繞樞紐旋轉 angle_deg 後，關節周圍是否出現穿透露縫
    依據工單 AG-28、AG-29 與 AG-31 規範：
    1. 支援 rotationOccluders 遮蔽聯集 (跟隨 child 剛性旋轉)
    2. 支援 parentSideOccluders (0° 不隨 child 旋轉，算入 parent 覆蓋與 U)
    3. AG-31 A: 新增「關節裂縫量法 (jointCrackPx)」：在 check_radius 圓盤內，對旋轉後 U
       做 maxWidthPx 閉運算補上之透光像素，扣除 0° 天然凹口與握點拳孔。
    4. 舊全半徑縫改名為 vacatedInclusiveSeamPx，另列 childVacatedPx (子件轉走留下之位移空位)。
    5. AG-29 B: 覆蓋率不可借遮蔽槽，child 核心覆蓋率嚴格僅以 child_cov_raw 計算 (>=15%)。
    6. 咬合重疊率門檻 20%、容許非重疊上限 (leakTolerancePx = 80%)，分開統計各項指標。
    """
    # 0° 實體二值圖 (用於計算 0° 肢體外輪廓與 0° 天然凹口)
    parent_alpha_0 = parent_arr[..., 3] > 16
    child_alpha_0 = child_arr[..., 3] > 16

    parent_side_union = np.zeros((h, w), dtype=bool)
    if parent_side_occluder_arrs:
        for ps_arr in parent_side_occluder_arrs.values():
            parent_side_union |= (ps_arr[..., 3] > 16)

    occ_union_0 = np.zeros((h, w), dtype=bool)
    if occluder_arrs:
        for occ_arr in occluder_arrs.values():
            occ_union_0 |= (occ_arr[..., 3] > 16)

    union_0 = parent_alpha_0 | parent_side_union | child_alpha_0 | occ_union_0
    U_0 = union_0

    # 計算 0° 填實外輪廓 (若有 grip 握點，保留拳心孔中空不可填實)
    contours, hierarchy = cv2.findContours(union_0.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    body_contour_0 = np.zeros((h, w), dtype=bool)
    if hierarchy is not None and len(contours) > 0:
        fill_img = np.zeros((h, w), dtype=np.uint8)
        for idx, (c, h_info) in enumerate(zip(contours, hierarchy[0])):
            if h_info[3] == -1:  # 外輪廓填實
                cv2.drawContours(fill_img, [c], -1, 1, thickness=-1)
        if grip_points:
            for idx, (c, h_info) in enumerate(zip(contours, hierarchy[0])):
                if h_info[3] != -1:  # 內孔：若屬於握點拳孔則挖空保留
                    is_grip_hole = any(cv2.pointPolygonTest(c, gpt, measureDist=True) >= -15.0 for gpt in grip_points)
                    if is_grip_hole:
                        cv2.drawContours(fill_img, [c], -1, 0, thickness=-1)
        body_contour_0 = (fill_img > 0)
    else:
        body_contour_0 = union_0

    # 旋轉子部件
    M = cv2.getRotationMatrix2D(pivot_pt, angle_deg, 1.0)
    rotated_child = cv2.warpAffine(child_arr, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

    # parent 側不隨 child 旋轉 (包含 parentSideOccluders)
    parent_alpha = parent_alpha_0 | parent_side_union
    child_alpha = rotated_child[..., 3] > 16

    # 旋轉各 rotationOccluders 槽位 (與 child 剛性連接，以同一樞紐同一角度旋轉)
    rotated_occluders: dict[str, np.ndarray] = {}
    occ_union = np.zeros((h, w), dtype=bool)
    if occluder_arrs:
        for occ_name, occ_arr in occluder_arrs.items():
            rot_occ = cv2.warpAffine(occ_arr, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
            occ_a = rot_occ[..., 3] > 16
            rotated_occluders[occ_name] = occ_a
            occ_union |= occ_a

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

    # AG-33: 握孔判定 (包含封閉孔 enclosedHole 與退回 radiusFallback)
    # 規則 1: 握孔 = 手部 alpha 經填孔後新增、且包含子骨點的那一塊封閉區。找不到封閉孔時，退回現行 15 px 圓盤。
    # 只有當 pivot 附近有 grip 握點 (如 <= 30 px) 時才視為手部握孔判定；一般肢段 (膝、肘) 不受影響。
    has_grip = False
    if grip_points:
        has_grip = any(np.hypot(pivot_pt[0] - gx, pivot_pt[1] - gy) <= 30.0 for gx, gy in grip_points)

    grip_hole_mask_0 = np.zeros((h, w), dtype=bool)
    grip_hole_source: str = "none"
    grip_hole_area: int = 0

    if has_grip:
        # 在 child_alpha_0 (手部) 上尋找包含子骨點 pivot_pt 的封閉孔
        child_u8 = (child_alpha_0.astype(np.uint8) * 255).copy()
        mask_flood = np.zeros((h + 2, w + 2), dtype=np.uint8)
        for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
            if child_u8[seed[1], seed[0]] == 0:
                cv2.floodFill(child_u8, mask_flood, seed, 255)
        holes_0 = (child_u8 == 0)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(holes_0.astype(np.uint8))

        piv_ix, piv_iy = int(round(pivot_pt[0])), int(round(pivot_pt[1]))
        found_hole_label = None
        for lbl in range(1, num_labels):
            if 0 <= piv_iy < h and 0 <= piv_ix < w:
                sub = labels[max(0, piv_iy - 2):min(h, piv_iy + 3), max(0, piv_ix - 2):min(w, piv_ix + 3)]
                if np.any(sub == lbl):
                    found_hole_label = lbl
                    break

        if found_hole_label is not None:
            grip_hole_mask_0 = (labels == found_hole_label)
            grip_hole_source = "enclosedHole"
            grip_hole_area = int(stats[found_hole_label, cv2.CC_STAT_AREA])
        else:
            # 開口拳或無封閉孔，退回 15px 圓盤
            y_grid, x_grid = np.ogrid[:h, :w]
            grip_hole_mask_0 = ((x_grid - pivot_pt[0]) ** 2 + (y_grid - pivot_pt[1]) ** 2) <= (15.0 ** 2)
            grip_hole_source = "radiusFallback"
            grip_hole_area = int(grip_hole_mask_0.sum())

    # 旋轉後的握孔 (繞 pivot_pt 旋轉 angle_deg)
    grip_hole_mask_rot = np.zeros((h, w), dtype=bool)
    if has_grip and grip_hole_mask_0.any():
        grip_hole_mask_rot = cv2.warpAffine(
            grip_hole_mask_0.astype(np.uint8), M, (w, h), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT
        ) > 0

    # AG-33: 核心扣除握孔分母計算
    child_core_disk = core_disk & (~grip_hole_mask_rot) if has_grip else core_disk
    child_core_total = int(child_core_disk.sum())
    child_cov_na = (child_core_total < 30) if has_grip else False
    child_min_cov_req = 0 if child_cov_na else int(child_core_total * 0.15)

    parent_core_disk = core_disk & (~grip_hole_mask_0) if has_grip else core_disk
    parent_core_total = int(parent_core_disk.sum())
    parent_cov_na = (parent_core_total < 30) if has_grip else False
    parent_min_cov_req = 0 if parent_cov_na else int(parent_core_total * 0.15)

    # AG-30 B / AG-31 A: 建立半徑為 check_radius_px 的全半徑檢查圓盤
    full_rad = float(check_radius_px)
    circle_full_im = Image.new("L", (w, h), 0)
    draw_full = ImageDraw.Draw(circle_full_im)
    draw_full.ellipse(
        [
            pivot_pt[0] - full_rad,
            pivot_pt[1] - full_rad,
            pivot_pt[0] + full_rad,
            pivot_pt[1] + full_rad,
        ],
        fill=255,
    )
    full_disk = np.array(circle_full_im) > 128

    # 旋轉後聯集 U_theta
    child_effective_alpha = child_alpha | occ_union
    U_theta = parent_alpha | child_effective_alpha

    # --- (A) 未加遮蔽時之指標 ---
    child_cov_raw = int((child_alpha & core_disk).sum())
    parent_cov = int((parent_alpha & core_disk).sum())
    overlap_raw = core_disk & parent_alpha & child_alpha
    overlap_raw_count = int(overlap_raw.sum())
    leak_raw_non_overlap = core_disk & (~(parent_alpha & child_alpha))
    leak_raw_count = int(leak_raw_non_overlap.sum())
    uncovered_raw = core_disk & (~(parent_alpha | child_alpha))
    uncovered_raw_count = int(uncovered_raw.sum())

    # --- (B) 加了遮蔽後之指標 ---
    child_cov_eff = int((child_effective_alpha & core_disk).sum())
    overlap_eff = core_disk & parent_alpha & child_effective_alpha
    overlap_eff_count = int(overlap_eff.sum())
    leak_eff_non_overlap = core_disk & (~(parent_alpha & child_effective_alpha))
    leak_eff_count = int(leak_eff_non_overlap.sum())
    uncovered_eff = core_disk & (~(parent_alpha | child_effective_alpha))
    uncovered_eff_count = int(uncovered_eff.sum())

    # 各遮蔽槽在核心圓盤內覆蓋 raw leak 之像素數
    occluded_by_slot: dict[str, int] = {}
    for occ_name, occ_a in rotated_occluders.items():
        occ_in_leak = int((leak_raw_non_overlap & occ_a).sum())
        occluded_by_slot[occ_name] = occ_in_leak

    # AG-29 A: 核心輪廓內透光縫
    seam_inside_contour_mask = core_disk & body_contour_0 & (~U_theta)
    seam_inside_contour_px = int(seam_inside_contour_mask.sum())

    # AG-31 A: 全半徑含位移空位縫 (vacatedInclusiveSeamPx，相容 seamInsideContourFullRadiusPx)
    vacated_inclusive_seam_mask = full_disk & body_contour_0 & (~U_theta)
    vacated_inclusive_seam_px = int(vacated_inclusive_seam_mask.sum())

    # AG-31 A: 子件轉走留下之位移空位 (childVacatedPx)
    child_vacated_mask = full_disk & child_alpha_0 & (~U_theta)
    child_vacated_px = int(child_vacated_mask.sum())

    # AG-31 A: 關節閉運算裂縫 (jointCrackPx)
    k_size = max(1, int(max_crack_width_px))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))

    closed_theta = cv2.morphologyEx(U_theta.astype(np.uint8), cv2.MORPH_CLOSE, kernel) > 0
    crack_theta_raw = closed_theta & (~U_theta) & full_disk

    closed_0 = cv2.morphologyEx(U_0.astype(np.uint8), cv2.MORPH_CLOSE, kernel) > 0
    crack_0_raw = closed_0 & (~U_0) & full_disk

    # 扣除 0° 天然凹口
    crack_net = crack_theta_raw & (~crack_0_raw)

    # 扣除握點拳孔 (AG-33: 優先扣除封閉孔，找不到時退回 15px 圓盤)
    if has_grip:
        crack_net &= (~grip_hole_mask_rot)
        crack_net &= (~grip_hole_mask_0)
    elif grip_points:
        y_grid, x_grid = np.ogrid[:h, :w]
        for gx, gy in grip_points:
            grip_mask = ((x_grid - gx) ** 2 + (y_grid - gy) ** 2) <= (15.0 ** 2)
            crack_net &= (~grip_mask)

    joint_crack_px = int(crack_net.sum())

    # --- (C) 判定邏輯 (不改門檻數值；AG-29 B: child 覆蓋率嚴格不借用遮蔽槽) ---
    min_overlap_required = int(disk_total * 0.2)
    leak_tolerance_px = disk_total - min_overlap_required
    has_cov = (child_cov_raw >= int(disk_total * 0.15)) and (parent_cov >= int(disk_total * 0.15))
    passed = has_cov and (overlap_eff_count >= min_overlap_required)

    leak_mask = leak_eff_non_overlap

    metrics: dict[str, Any] = {
        "coreRadiusPx": round(core_rad, 2),
        "fullRadiusPx": round(full_rad, 2),
        "coreTotalPixels": disk_total,
        "gripHoleSource": grip_hole_source if has_grip else "none",
        "gripHoleAreaPx": grip_hole_area if has_grip else 0,
        "childCoreTotalPixels": child_core_total,
        "parentCoreTotalPixels": parent_core_total,
        "childCoreCoverageNA": child_cov_na,
        "parentCoreCoverageNA": parent_cov_na,
        "childMinCoverageReq": child_min_cov_req,
        "parentMinCoverageReq": parent_min_cov_req,
        "minRequiredOverlapPixels": min_overlap_required,
        "minRequiredOverlapRatio": 0.2,
        "leakTolerancePx": leak_tolerance_px,
        "parentCoverageInCore": parent_cov,
        "childCoverageWithoutOccluders": child_cov_raw,
        "childCoverageWithOccluders": child_cov_eff,
        "overlapPixelsWithoutOccluders": overlap_raw_count,
        "overlapPixelsWithOccluders": overlap_eff_count,
        "nonOverlapPixelsWithoutOccluders": leak_raw_count,
        "nonOverlapPixelsWithOccluders": leak_eff_count,
        "trueSeamLeakPixelsWithoutOccluders": uncovered_raw_count,
        "trueSeamLeakPixelsWithOccluders": uncovered_eff_count,
        "seamInsideContourPx": seam_inside_contour_px,
        "seamInsideContourFullRadiusPx": vacated_inclusive_seam_px,
        "vacatedInclusiveSeamPx": vacated_inclusive_seam_px,
        "childVacatedPx": child_vacated_px,
        "jointCrackPx": joint_crack_px,
        "maxCrackWidthPx": k_size,
        "occludedBySlotPx": occluded_by_slot,
        "passed": passed,
    }

    return passed, leak_mask, metrics


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
    anchors_path: Path | None = None,
    allow_estimated_anchors: bool = False,
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
    shoulder_joint_names = shoulder_overlap_cfg.get("joints", [])
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

        # AG-23 / AG-34: 單槽範圍檢查與小島分三級 (scopeGate)
        scope_margin_px = float(layered_cfg.get("scopeMarginPx", 12.0))
        scope_gate_cfg = layered_cfg.get("scopeGate", {})
        scope_mode = scope_gate_cfg.get("mode", "strict")
        loose_min_area = int(scope_gate_cfg.get("looseIslandMinAreaPx", 16))
        designed_min_area = int(scope_gate_cfg.get("designedPieceMinAreaPx", 400))

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

                # AG-34 + v3.15: 8 連通小島分三級
                num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(vis_mask.astype(np.uint8), connectivity=8)
                main_label = None
                main_area = 0
                tiny_islands: list[dict[str, Any]] = []
                loose_outside_islands: list[dict[str, Any]] = []
                designed_pieces: list[dict[str, Any]] = []
                inside_loose_islands: list[dict[str, Any]] = []

                if num_labels > 1:
                    areas = [stats[lbl, cv2.CC_STAT_AREA] for lbl in range(1, num_labels)]
                    max_idx = int(np.argmax(areas))
                    main_label = 1 + max_idx
                    main_area = int(stats[main_label, cv2.CC_STAT_AREA])

                    for lbl in range(1, num_labels):
                        if lbl == main_label:
                            continue
                        a_px = int(stats[lbl, cv2.CC_STAT_AREA])
                        bx = int(stats[lbl, cv2.CC_STAT_LEFT])
                        by = int(stats[lbl, cv2.CC_STAT_TOP])
                        bw = int(stats[lbl, cv2.CC_STAT_WIDTH])
                        bh = int(stats[lbl, cv2.CC_STAT_HEIGHT])
                        isl_m = (labels == lbl)
                        has_out = bool(np.any(isl_m & (~scope_mask)))
                        isl_item = {
                            "label": lbl,
                            "areaPx": a_px,
                            "bbox": [bx, by, bw, bh],
                            "hasPixelsOutsideScope": has_out,
                        }
                        if a_px < loose_min_area:
                            tiny_islands.append(isl_item)
                        elif a_px >= designed_min_area:
                            designed_pieces.append(isl_item)
                        else:
                            if has_out:
                                loose_outside_islands.append(isl_item)
                            else:
                                inside_loose_islands.append(isl_item)

                if scope_mode == "advisory":
                    # advisory 模式：膠囊越界僅作報告不擋，改由游離雜片判定 pass/fail
                    scope_pass = (len(loose_outside_islands) == 0)
                    if not scope_pass:
                        detail_msg = (
                            f"膠囊範圍諮詢模式: 越界佔比={outside_ratio*100:.2f}% (advisory不擋)，"
                            f"但檢出 {len(loose_outside_islands)} 個游離雜片在 scope 外 (面積 {loose_min_area}<=area<{designed_min_area} px): "
                            + ", ".join(f"{it['areaPx']}px@bbox{it['bbox']}" for it in loose_outside_islands)
                        )
                    else:
                        detail_msg = (
                            f"膠囊範圍諮詢模式: 越界佔比={outside_ratio*100:.2f}% (advisory不擋)，"
                            f"無游離雜片 (微小雜點<{loose_min_area}px: {len(tiny_islands)}個, "
                            f"設計分塊>={designed_min_area}px: {len(designed_pieces)}個)"
                        )
                else:
                    scope_pass = (outside_ratio <= 0.01)
                    detail_msg = f"膠囊外擴{scope_margin_px:.0f}px外像素佔比={outside_ratio*100:.2f}% (容差<=1.0%)"

                scope_check_entry: dict[str, Any] = {
                    "pass": scope_pass,
                    "tier": "PASS" if scope_pass else "FAIL",
                    "skipped": False,
                    "scopeType": scope_type,
                    "scopeMode": scope_mode,
                    "outsideRatio": round(outside_ratio, 4),
                    "outsidePixels": outside_cnt,
                    "totalVisiblePixels": tot_vis,
                    "mainBodyAreaPx": main_area if main_label is not None else tot_vis,
                    "tinyIslandsCount": len(tiny_islands),
                    "tinyIslands": tiny_islands,
                    "looseOutsideIslandsCount": len(loose_outside_islands),
                    "looseOutsideIslands": loose_outside_islands,
                    "designedPiecesCount": len(designed_pieces),
                    "designedPieces": designed_pieces,
                    "toleranceRatio": 0.01 if scope_mode != "advisory" else "advisory",
                    "detail": detail_msg,
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

                    # 讀取 anchor 檔案 (支援 --anchors 指定檔，或約定 <slot>.anchors.json / anchors.json)
                    anchor_data = {}
                    cand_paths = []
                    if anchors_path:
                        cand_paths.append(anchors_path)
                    cand_paths.extend([
                        parts_dir / f"{sid}.anchors.json",
                        parts_dir / "anchors.json",
                        parts_dir.parent / f"{sid}.anchors.json",
                        parts_dir.parent / "anchors.json",
                    ])
                    for cand_p in cand_paths:
                        if cand_p and cand_p.exists():
                            try:
                                cand_json = json.loads(cand_p.read_text(encoding="utf-8"))
                                if isinstance(cand_json, dict):
                                    if "anchors" in cand_json and isinstance(cand_json["anchors"], dict):
                                        anchor_data = cand_json["anchors"]
                                    else:
                                        anchor_data = cand_json
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
                        is_estimated = False
                        estimate_method = None

                        if pt_name in anchor_data:
                            info = anchor_data[pt_name]
                            if isinstance(info, dict):
                                pt_val = info.get("registeredPx", info.get("sourcePx", info.get("px")))
                                if pt_val is not None:
                                    reg_pt = [float(pt_val[0]), float(pt_val[1])]
                            elif isinstance(info, (list, tuple)) and len(info) >= 2:
                                reg_pt = [float(info[0]), float(info[1])]

                        # 若無錨點且參數明確允許估算（alpha 重心不可冒充 head_center，且 gated 點不能因估算通過）
                        if reg_pt is None and allow_estimated_anchors:
                            if pt_name == ref_j_name and ext_vis > 0:
                                split_row = int(round(split_y))
                                if 0 <= split_row < exp_h:
                                    row_xs = np.where(alpha[split_row, :] > 16)[0]
                                    if len(row_xs) > 0:
                                        reg_pt = [float(np.mean(row_xs)), split_y]
                                        is_estimated = True
                                        estimate_method = "alphaCentroid"
                            elif core_vis > 0:
                                reg_pt = [float(np.mean(core_xs)), float(np.mean(core_ys))]
                                is_estimated = True
                                estimate_method = "alphaCentroid"

                        if reg_pt is None:
                            # 缺錨點：gated 點判 FAIL (tier ANCHOR_MISSING)；recorded 點記 NOT_MEASURED，不寫數字
                            if is_gated:
                                reg_checks[pt_name] = {
                                    "isGated": True,
                                    "targetPx": list(target_pt),
                                    "registeredPx": None,
                                    "errorPx": None,
                                    "distancePx": None,
                                    "tolerancePx": tol,
                                    "pass": False,
                                    "tier": "ANCHOR_MISSING",
                                    "detail": "缺少錨點數據 (ANCHOR_MISSING)",
                                }
                                reg_pass = False
                                overall_pass = False
                            else:
                                reg_checks[pt_name] = {
                                    "isGated": False,
                                    "targetPx": list(target_pt),
                                    "registeredPx": None,
                                    "errorPx": None,
                                    "distancePx": None,
                                    "tolerancePx": tol,
                                    "pass": True,
                                    "tier": "NOT_MEASURED",
                                    "detail": "未量測 (NOT_MEASURED)",
                                }
                        else:
                            dx = float(reg_pt[0] - target_pt[0])
                            dy = float(reg_pt[1] - target_pt[1])
                            dist = math.hypot(dx, dy)
                            pt_pass = dist <= tol

                            # 若使用估算，gated 點不可因估算通過
                            if is_estimated and is_gated:
                                pt_pass = False

                            check_item = {
                                "isGated": is_gated,
                                "targetPx": list(target_pt),
                                "registeredPx": [round(reg_pt[0], 2), round(reg_pt[1], 2)],
                                "errorPx": [round(dx, 2), round(dy, 2)],
                                "distancePx": round(dist, 2),
                                "tolerancePx": tol,
                                "pass": pt_pass if is_gated else True,
                                "tier": ("PASS" if pt_pass else "FAIL") if is_gated else "RECORDED",
                            }
                            if is_estimated:
                                check_item["estimated"] = estimate_method
                                if is_gated:
                                    check_item["tier"] = "FAIL"
                                    check_item["detail"] = f"估算值不可用於 gated 驗收 ({estimate_method})"

                            reg_checks[pt_name] = check_item
                            if is_gated and not pt_pass:
                                reg_pass = False
                                overall_pass = False

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

    # 提取規格中所有握點座標 (供輪廓檢驗時排除拳孔填實)
    grip_pts = [
        (float(g["x"]), float(g["y"]))
        for g in spec.get("grips", {}).values()
        if isinstance(g, dict) and "x" in g and "y" in g
    ]

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
        is_detached_child = bool(j_conn.get("detachedChild", False))

        p_arr = loaded_parts[p_sid]
        c_arr = loaded_parts[c_sid]

        rot_occluder_names = j_conn.get("rotationOccluders", [])
        occluder_arrs: dict[str, np.ndarray] = {}
        for occ_sid in rot_occluder_names:
            if occ_sid in loaded_parts and not slot_reports.get(occ_sid, {}).get("empty", False):
                occluder_arrs[occ_sid] = loaded_parts[occ_sid]

        # AG-31 C: parentSideOccluders (0° 不轉，算入 parent 覆蓋與 U)
        parent_side_occluder_names = j_conn.get("parentSideOccluders", [])
        parent_side_occluder_arrs: dict[str, np.ndarray] = {}
        for ps_sid in parent_side_occluder_names:
            if ps_sid in loaded_parts and not slot_reports.get(ps_sid, {}).get("empty", False):
                parent_side_occluder_arrs[ps_sid] = loaded_parts[ps_sid]

        rot_crack_cfg = spec.get("layeredSlots", {}).get("rotationCrack", {})
        max_crack_w = int(rot_crack_cfg.get("maxWidthPx", 12))

        leak_pos_ok, leak_pos_m, metrics_pos = check_rotation_gap_leak(
            p_arr, c_arr, piv_pt, tested_deg, check_rad, exp_w, exp_h,
            occluder_arrs, grip_pts, parent_side_occluder_arrs, max_crack_w
        )
        leak_neg_ok, leak_neg_m, metrics_neg = check_rotation_gap_leak(
            p_arr, c_arr, piv_pt, -tested_deg, check_rad, exp_w, exp_h,
            occluder_arrs, grip_pts, parent_side_occluder_arrs, max_crack_w
        )

        leak_pass = leak_pos_ok and leak_neg_ok

        # AG-32 / AG-31: 擬議閘門 (只並列、不取代現行 tier)
        # 條件：parent 核心覆蓋率 >= 15%；child (不含遮蔽槽) 核心覆蓋率 >= 15% (detachedChild 免除)；
        # 且關節裂縫 jointCrackPx 正負角度各 <= 動態計算門檻 (依戰場顯示高換算)
        gate_cfg = rot_crack_cfg.get("gate", {})
        ref_disp_h = float(gate_cfg.get("referenceDisplayHeightPx", 360))
        max_crack_disp = float(gate_cfg.get("maxCrackAreaDisplayPx2", 4))
        derived_max_crack = gate_cfg.get("derivedMaxCrackCanvasPx")
        spec_H = float(spec.get("H", 1600))

        # 門檻 = maxCrackAreaDisplayPx2 * (H / referenceDisplayHeightPx)^2
        calc_crack_threshold = max_crack_disp * ((spec_H / ref_disp_h) ** 2)

        derived_diff_warn: str | None = None
        if derived_max_crack is not None:
            if abs(float(derived_max_crack) - calc_crack_threshold) > 1.0:
                derived_diff_warn = (
                    f"derivedMaxCrackCanvasPx ({derived_max_crack}) differs from "
                    f"calculated threshold ({calc_crack_threshold:.2f}) by > 1px"
                )

        core_tot = metrics_pos["coreTotalPixels"]
        min_cov_req = int(core_tot * 0.15)
        p_cov_pos = metrics_pos["parentCoverageInCore"]
        p_cov_neg = metrics_neg["parentCoverageInCore"]
        c_cov_pos_raw = metrics_pos["childCoverageWithoutOccluders"]
        c_cov_neg_raw = metrics_neg["childCoverageWithoutOccluders"]
        crack_pos = metrics_pos["jointCrackPx"]
        crack_neg = metrics_neg["jointCrackPx"]
        full_seam_pos = metrics_pos["vacatedInclusiveSeamPx"]
        full_seam_neg = metrics_neg["vacatedInclusiveSeamPx"]
        child_vac_pos = metrics_pos["childVacatedPx"]
        child_vac_neg = metrics_neg["childVacatedPx"]

        # AG-33 / AG-34: coverageRule 實作
        cov_rule = layered_cfg.get("coverageRule", {})
        grip_joint_cov_mode = cov_rule.get("gripJointCoverage", "standard")
        child_alone_pct_req = float(cov_rule.get("childAloneSufficientPct", 90.0))

        # 握孔扣除後核心覆蓋 notApplicable 與最小門檻
        child_cov_na = bool(metrics_pos.get("childCoreCoverageNA", False) or metrics_neg.get("childCoreCoverageNA", False))
        parent_cov_na = bool(metrics_pos.get("parentCoreCoverageNA", False) or metrics_neg.get("parentCoreCoverageNA", False))

        # AG-34 規則 2: gripJointCoverage == "notApplicable" -> 有握孔關節 (gripHoleSource != "none") 覆蓋條件一律 notApplicable
        is_grip_joint = (metrics_pos.get("gripHoleSource", "none") != "none")
        if grip_joint_cov_mode == "notApplicable" and is_grip_joint:
            child_cov_na = True
            parent_cov_na = True

        # AG-34 規則 3: childAloneSufficientPct
        # 若 child 側 (含 rotationOccluders) 在 ±deg 各自覆蓋核心 >= childAloneSufficientPct%，且裂縫達標時，
        # parent 覆蓋不足不擋，標記 childAloneSufficient (pelvis_to_torso 用)
        c_eff_pos = metrics_pos["childCoverageWithOccluders"]
        c_eff_neg = metrics_neg["childCoverageWithOccluders"]
        child_core_tot_pos = max(1, metrics_pos.get("childCoreTotalPixels", core_tot))
        child_core_tot_neg = max(1, metrics_neg.get("childCoreTotalPixels", core_tot))
        c_pct_pos = (c_eff_pos / child_core_tot_pos) * 100.0
        c_pct_neg = (c_eff_neg / child_core_tot_neg) * 100.0
        min_c_cov_pct = min(c_pct_pos, c_pct_neg)

        crack_ok = (crack_pos <= calc_crack_threshold) and (crack_neg <= calc_crack_threshold)
        child_alone_sufficient = (min_c_cov_pct >= child_alone_pct_req) and crack_ok

        c_min_req_pos = metrics_pos.get("childMinCoverageReq", min_cov_req)
        c_min_req_neg = metrics_neg.get("childMinCoverageReq", min_cov_req)
        p_min_req_pos = metrics_pos.get("parentMinCoverageReq", min_cov_req)
        p_min_req_neg = metrics_neg.get("parentMinCoverageReq", min_cov_req)

        proposed_fail_reasons: list[str] = []
        parent_lacks_coverage = (p_cov_pos < p_min_req_pos or p_cov_neg < p_min_req_neg)
        if not parent_cov_na:
            if parent_lacks_coverage:
                if child_alone_sufficient:
                    # 豁免 parent 不足，標記 childAloneSufficient
                    pass
                else:
                    if p_cov_pos < p_min_req_pos:
                        proposed_fail_reasons.append(
                            f"parentCoverageInCore(+deg)={p_cov_pos} < 15% ({p_min_req_pos}px)"
                        )
                    if p_cov_neg < p_min_req_neg:
                        proposed_fail_reasons.append(
                            f"parentCoverageInCore(-deg)={p_cov_neg} < 15% ({p_min_req_neg}px)"
                        )

        if not is_detached_child and not child_cov_na:
            if c_cov_pos_raw < c_min_req_pos:
                proposed_fail_reasons.append(
                    f"childCoverageWithoutOccluders(+deg)={c_cov_pos_raw} < 15% ({c_min_req_pos}px)"
                )
            if c_cov_neg_raw < c_min_req_neg:
                proposed_fail_reasons.append(
                    f"childCoverageWithoutOccluders(-deg)={c_cov_neg_raw} < 15% ({c_min_req_neg}px)"
                )

        if crack_pos > calc_crack_threshold:
            proposed_fail_reasons.append(
                f"jointCrackPx(+deg)={crack_pos} > {calc_crack_threshold:.2f}px"
            )
        if crack_neg > calc_crack_threshold:
            proposed_fail_reasons.append(
                f"jointCrackPx(-deg)={crack_neg} > {calc_crack_threshold:.2f}px"
            )

        proposed_pass = len(proposed_fail_reasons) == 0
        proposed_tier = "PASS" if proposed_pass else "FAIL"

        if parent_cov_na:
            p_cov_cond_val = "notApplicable"
        elif child_alone_sufficient and parent_lacks_coverage:
            p_cov_cond_val = "childAloneSufficient"
        else:
            p_cov_cond_val = 0.15

        if is_detached_child:
            c_cov_cond_val = "WAIVED (detachedChild)"
        elif child_cov_na:
            c_cov_cond_val = "notApplicable"
        else:
            c_cov_cond_val = 0.15

        is_gate_promoted = bool(gate_cfg.get("promoted", False))
        effective_leak_pass = proposed_pass if is_gate_promoted else leak_pass
        effective_tier = proposed_tier if is_gate_promoted else ("PASS" if leak_pass else "FAIL")

        leak_entry: dict[str, Any] = {
            "pass": effective_leak_pass,
            "tier": effective_tier,
            "promoted": is_gate_promoted,
            "oldFullRadiusLeakPass": leak_pass,
            "proposedTier": proposed_tier,
            "proposedGate": {
                "pass": proposed_pass,
                "proposedTier": proposed_tier,
                "conditions": {
                    "parentCoreCoverageMinRatio": p_cov_cond_val,
                    "childCoreCoverageWithoutOccludersMinRatio": c_cov_cond_val,
                    "childCoreCoveragePct": round(min_c_cov_pct, 2),
                    "childAloneSufficient": child_alone_sufficient,
                    "maxJointCrackPx": round(calc_crack_threshold, 2),
                    "crackGateSource": {
                        "H": spec_H,
                        "referenceDisplayHeightPx": ref_disp_h,
                        "maxCrackAreaDisplayPx2": max_crack_disp,
                        "calculatedThresholdPx": round(calc_crack_threshold, 2),
                        "derivedMaxCrackCanvasPx": derived_max_crack,
                        "derivedDiffWarning": derived_diff_warn,
                    },
                },
                "reasons": proposed_fail_reasons,
            },
            "maxJointCrackThresholdPx": round(calc_crack_threshold, 2),
            "gripHoleSource": metrics_pos.get("gripHoleSource", "none"),
            "gripHoleAreaPx": metrics_pos.get("gripHoleAreaPx", 0),
            "skipped": False,
            "pivot": list(piv_pt),
            "pivotSource": j_conn.get("pivotSource", "bonePivot"),
            "testedAngles": [tested_deg, -tested_deg],
            "detachedChild": is_detached_child,
            "rotationOccluders": rot_occluder_names,
            "parentSideOccluders": parent_side_occluder_names,
            "coreTotalPixels": metrics_pos["coreTotalPixels"],
            "minRequiredOverlapPixels": metrics_pos["minRequiredOverlapPixels"],
            "leakTolerancePx": metrics_pos["leakTolerancePx"],
            "leakPixelsPositive": metrics_pos["nonOverlapPixelsWithOccluders"],
            "leakPixelsNegative": metrics_neg["nonOverlapPixelsWithOccluders"],
            "seamInsideContourPositivePx": metrics_pos["seamInsideContourPx"],
            "seamInsideContourNegativePx": metrics_neg["seamInsideContourPx"],
            "seamInsideContourFullRadiusPositivePx": full_seam_pos,
            "seamInsideContourFullRadiusNegativePx": full_seam_neg,
            "vacatedInclusiveSeamPositivePx": full_seam_pos,
            "vacatedInclusiveSeamNegativePx": full_seam_neg,
            "childVacatedPositivePx": child_vac_pos,
            "childVacatedNegativePx": child_vac_neg,
            "jointCrackPositivePx": crack_pos,
            "jointCrackNegativePx": crack_neg,
            "positiveAngleMetrics": {
                "angleDeg": tested_deg,
                "parentCoveragePx": p_cov_pos,
                "childCoverageWithoutOccludersPx": c_cov_pos_raw,
                "childCoverageWithOccludersPx": metrics_pos["childCoverageWithOccluders"],
                "leakWithoutOccludersPx": metrics_pos["nonOverlapPixelsWithoutOccluders"],
                "leakWithOccludersPx": metrics_pos["nonOverlapPixelsWithOccluders"],
                "trueSeamLeakPx": metrics_pos["trueSeamLeakPixelsWithOccluders"],
                "seamInsideContourPx": metrics_pos["seamInsideContourPx"],
                "seamInsideContourFullRadiusPx": full_seam_pos,
                "vacatedInclusiveSeamPx": full_seam_pos,
                "childVacatedPx": child_vac_pos,
                "jointCrackPx": crack_pos,
                "overlapPixels": metrics_pos["overlapPixelsWithOccluders"],
                "minRequiredOverlapPx": metrics_pos["minRequiredOverlapPixels"],
                "leakTolerancePx": metrics_pos["leakTolerancePx"],
                "occludedBySlotPx": metrics_pos["occludedBySlotPx"],
                "result": "PASS" if leak_pos_ok else "FAIL",
            },
            "negativeAngleMetrics": {
                "angleDeg": -tested_deg,
                "parentCoveragePx": p_cov_neg,
                "childCoverageWithoutOccludersPx": c_cov_neg_raw,
                "childCoverageWithOccludersPx": metrics_neg["childCoverageWithOccluders"],
                "leakWithoutOccludersPx": metrics_neg["nonOverlapPixelsWithoutOccluders"],
                "leakWithOccludersPx": metrics_neg["nonOverlapPixelsWithOccluders"],
                "trueSeamLeakPx": metrics_neg["trueSeamLeakPixelsWithOccluders"],
                "seamInsideContourPx": metrics_neg["seamInsideContourPx"],
                "seamInsideContourFullRadiusPx": full_seam_neg,
                "vacatedInclusiveSeamPx": full_seam_neg,
                "childVacatedPx": child_vac_neg,
                "jointCrackPx": crack_neg,
                "overlapPixels": metrics_neg["overlapPixelsWithOccluders"],
                "minRequiredOverlapPx": metrics_neg["minRequiredOverlapPixels"],
                "leakTolerancePx": metrics_neg["leakTolerancePx"],
                "occludedBySlotPx": metrics_neg["occludedBySlotPx"],
                "result": "PASS" if leak_neg_ok else "FAIL",
            },
        }

        if not effective_leak_pass:
            if out_dir:
                leak_vis_path = out_dir / f"gap_leak_{c_sid}_{conn_id}.png"
                leak_vis_arr = np.zeros((exp_h, exp_w, 4), dtype=np.uint8)
                leak_vis_arr[leak_pos_m | leak_neg_m] = [255, 0, 0, 255]
                Image.fromarray(leak_vis_arr).save(leak_vis_path)
                leak_entry["leakImagePath"] = str(leak_vis_path)

            slot_reports[c_sid]["pass"] = False
            slot_reports[c_sid]["tier"] = "FAIL"
            fail_detail = (
                f"關節 +/-{tested_deg}° 旋轉擬議閘門未通過: {'; '.join(proposed_fail_reasons)}"
                if is_gate_promoted
                else f"關節 +/-{tested_deg}° 旋轉在關節周圍出現露縫"
            )
            slot_reports[c_sid]["checks"][f"rotation_leak_at_{conn_id}"] = {
                "pass": False,
                "tier": "FAIL",
                "detail": fail_detail,
                "reasons": proposed_fail_reasons,
            }
            if out_dir:
                slot_reports[c_sid]["checks"][f"rotation_leak_at_{conn_id}"]["leakImage"] = str(leak_vis_path)
            overall_pass = False
        else:
            detail_msg = f"關節 +/-{tested_deg}° 旋轉閘門通過" + (" (promoted)" if is_gate_promoted else "")
            if not leak_pass:
                detail_msg += f" [舊全半徑露縫(+{full_seam_pos}px/-{full_seam_neg}px)已轉為只報告]"
            slot_reports[c_sid]["checks"][f"rotation_leak_at_{conn_id}"] = {
                "pass": True,
                "tier": "PASS",
                "detail": detail_msg,
            }

        rot_leak_reports[conn_id] = leak_entry

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

        # AG-27: 檢查 child segment 是否定義 neckExtension.replacesGenericHiddenExtension
        seg_alias_map = {
            "arm_upper_f": "upperarm_f",
            "arm_upper_b": "upperarm_b",
            "arm_lower_f": "forearm_f",
            "arm_lower_b": "forearm_b",
        }
        c_seg_name = seg_alias_map.get(c_sid, c_sid)
        c_seg_def = spec.get("segments", {}).get(c_seg_name, {})
        c_neck_ext = c_seg_def.get("neckExtension", {})
        replaces_generic_ext = bool(c_neck_ext.get("replacesGenericHiddenExtension", False))

        # AG-25: 肩部父側隱藏延伸豁免檢查
        p_waived = False
        p_waived_reason = ""
        matched_shoulder_joint = None

        c_waived = False
        c_waived_reason = ""

        if replaces_generic_ext:
            p_waived = True
            p_waived_reason = "子段 neckExtension.replacesGenericHiddenExtension 為 true，父側不設通用延伸長度門檻，由旋轉露縫驗收"
            c_waived = True
            c_waived_reason = "子段依 neckExtension 規則驗收，取代通用延伸檢查，由旋轉露縫驗收"
        elif not p_pass and parent_waive_prefix:
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

                # AG-35: coverageRule.hiddenExtensionWaivers 豁免檢查
        cov_rule = layered_cfg.get("coverageRule", {})
        hidden_ext_waivers = cov_rule.get("hiddenExtensionWaivers", {})
        child_alone_waiver = hidden_ext_waivers.get("childAloneSufficient")
        grip_ext_waiver = hidden_ext_waivers.get("gripJoint")

        if not p_pass and not p_waived:
            conn_rot = rot_leak_reports.get(conn_id, {})
            conn_prop = conn_rot.get("proposedGate", {})
            conn_conds = conn_prop.get("conditions", {})
            conn_is_marked_child_alone = (conn_conds.get("parentCoreCoverageMinRatio") == "childAloneSufficient")
            conn_crack_ok = (
                conn_rot.get("jointCrackPositivePx", 999.0) <= conn_rot.get("maxJointCrackThresholdPx", 0.0) and
                conn_rot.get("jointCrackNegativePx", 999.0) <= conn_rot.get("maxJointCrackThresholdPx", 0.0)
            )
            conn_is_grip = bool(conn_rot.get("gripHoleSource", "none") != "none")

            # 1. childAloneSufficient: 父骨隱藏延伸不要求 (pelvis_to_torso)
            if child_alone_waiver == "parentExtensionNotRequired" and conn_is_marked_child_alone:
                p_waived = True
                p_waived_reason = (
                    f"關節符合 childAloneSufficient，依 coverageRule.hiddenExtensionWaivers.childAloneSufficient "
                    f"豁免父骨側隱藏延伸 ({p_ext:.1f}px < {min_ext_px:.1f}px)"
                )
            # 2. gripJoint: 握孔關節在裂縫達標時，父骨延伸改為 advisory 只報告
            elif grip_ext_waiver == "advisoryWhenCrackPasses" and conn_is_grip and conn_crack_ok:
                p_waived = True
                p_waived_reason = (
                    f"握孔關節裂縫達標，依 coverageRule.hiddenExtensionWaivers.gripJoint "
                    f"父骨側隱藏延伸改為 advisory 只報告 ({p_ext:.1f}px < {min_ext_px:.1f}px)"
                )

        p_effective_pass = p_pass or p_waived
        c_effective_pass = c_pass or c_waived
        conn_pass = p_effective_pass and c_effective_pass

        joint_ext_entry: dict[str, Any] = {
            "pass": conn_pass,
            "tier": "WAIVED" if (p_waived or c_waived) else ("PASS" if conn_pass else "FAIL"),
            "skipped": False,
            "pivot": list(piv_pt),
            "pivotSource": j_conn.get("pivotSource", "bonePivot"),
            "parentExtensionPx": round(p_ext, 1),
            "childExtensionPx": round(c_ext, 1),
            "minRequiredPx": round(min_ext_px, 1),
            "parentWaived": p_waived,
            "childWaived": c_waived,
            "replacesGenericHiddenExtension": replaces_generic_ext,
            "detail": f"隱藏延伸: 父={p_ext:.1f}px{' (WAIVED)' if p_waived else ''}, 子={c_ext:.1f}px{' (WAIVED)' if c_waived else ''} (要求>={min_ext_px:.1f}px)",
        }
        if p_waived:
            joint_ext_entry["parentWaivedReason"] = p_waived_reason
        if c_waived:
            joint_ext_entry["childWaivedReason"] = c_waived_reason
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

        if c_waived:
            slot_reports[c_sid]["checks"][f"hidden_extension_at_{conn_id}"] = {
                "pass": True,
                "tier": "WAIVED",
                "childExtensionPx": round(c_ext, 1),
                "minRequiredPx": round(min_ext_px, 1),
                "detail": c_waived_reason,
            }
        elif not c_pass:
            slot_reports[c_sid]["pass"] = False
            slot_reports[c_sid]["tier"] = "FAIL"
            slot_reports[c_sid]["checks"][f"hidden_extension_at_{conn_id}"] = {
                "pass": False,
                "tier": "FAIL",
                "detail": f"在 {conn_id} 處越過關節延伸不足: {c_ext:.1f}px < {min_ext_px:.1f}px",
            }
            overall_pass = False

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
    ap.add_argument("--anchors", type=Path, default=None, help="錨點 JSON 檔案路徑 (選填)")
    ap.add_argument("--allow-estimated-anchors", action="store_true", help="允許估算未提供之錨點 (僅供記錄，gated 點仍不可因估算通過)")
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
        anchors_path=args.anchors,
        allow_estimated_anchors=args.allow_estimated_anchors,
    )

    print(json.dumps(report, indent=2, ensure_ascii=False))
    if not passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
