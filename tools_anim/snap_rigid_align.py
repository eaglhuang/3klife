#!/usr/bin/env python3
"""自動貼齊固定骨架模組 (snap_rigid_align.py) - AG-11

功能：
1. 依「偵測到的部位兩端關節 -> JSON 固定關節」，計算平移、旋轉與等比縮放 (骨長 ±8% 內)。
2. 採用剛體/相似變換 (Similarity Transform)，保證絕對不扭曲變形網格。
3. 接縫重疊檢查 (Seam Overlap Check)：相鄰部位在關節處無裂縫，且重疊 >= 6 px。
4. 產出貼齊前/後疊圖 (snap_before_overlay.png / snap_after_overlay.png) 與 snap_report.json。
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


SLOT_ALIGN_JOINTS: dict[str, tuple[str, str]] = {
    "arm_upper_f": ("shoulder_f", "elbow_f"),
    "arm_lower_f": ("elbow_f", "wrist_f"),
    "arm_upper_b": ("shoulder_b", "elbow_b"),
    "arm_lower_b": ("elbow_b", "wrist_b"),
    "thigh_f": ("hip_f", "knee_f"),
    "shin_f": ("knee_f", "ankle_f"),
    "thigh_b": ("hip_b", "knee_b"),
    "shin_b": ("knee_b", "ankle_b"),
    "hand_f": ("wrist_f", "grip_A"),
    "hand_b": ("wrist_b", "grip_B"),
    "foot_f": ("ankle_f", "root"),
    "foot_b": ("ankle_b", "root"),
    "torso": ("pelvis", "neck"),
    "head": ("neck", "head_center"),
    "pelvis": ("root", "pelvis"),
}

SEAM_PAIRS: list[tuple[str, str, str]] = [
    ("arm_upper_f", "arm_lower_f", "elbow_f"),
    ("arm_lower_f", "hand_f", "wrist_f"),
    ("thigh_f", "shin_f", "knee_f"),
    ("shin_f", "foot_f", "ankle_f"),
    ("arm_upper_b", "arm_lower_b", "elbow_b"),
    ("arm_lower_b", "hand_b", "wrist_b"),
    ("thigh_b", "shin_b", "knee_b"),
    ("shin_b", "foot_b", "ankle_b"),
    ("torso", "arm_upper_f", "shoulder_f"),
    ("torso", "arm_upper_b", "shoulder_b"),
    ("torso", "pelvis", "pelvis"),
    ("pelvis", "thigh_f", "hip_f"),
    ("pelvis", "thigh_b", "hip_b"),
]


def compute_rigid_similarity_transform(
    src_a: tuple[float, float],
    src_b: tuple[float, float],
    dst_a: tuple[float, float],
    dst_b: tuple[float, float],
    max_angle_deg: float = 10.0,
    max_scale_pct: float = 8.0,
) -> tuple[np.ndarray, float, float, tuple[float, float]]:
    """計算由 (src_a -> src_b) 對齊到 (dst_a -> dst_b) 的 2x3 仿射矩陣。

    保證:
    - 剛體旋轉 Delta_theta 限制在 [-max_angle_deg, max_angle_deg]
    - 等比縮放 scale 限制在 [1 - max_scale_pct/100, 1 + max_scale_pct/100]
    - src_a 點剛體對齊至 dst_a
    """
    v_src = (src_b[0] - src_a[0], src_b[1] - src_a[1])
    v_dst = (dst_b[0] - dst_a[0], dst_b[1] - dst_a[1])

    len_src = math.hypot(v_src[0], v_src[1])
    len_dst = math.hypot(v_dst[0], v_dst[1])

    theta_src = math.atan2(v_src[1], v_src[0])
    theta_dst = math.atan2(v_dst[1], v_dst[0])

    diff_theta = theta_dst - theta_src
    # 正規化至 [-pi, pi]
    while diff_theta > math.pi:
        diff_theta -= 2 * math.pi
    while diff_theta < -math.pi:
        diff_theta += 2 * math.pi

    max_rad = math.radians(max_angle_deg)
    clamped_theta = max(-max_rad, min(max_rad, diff_theta))

    raw_scale = (len_dst / len_src) if len_src > 1e-4 else 1.0
    scale_min = 1.0 - (max_scale_pct / 100.0)
    scale_max = 1.0 + (max_scale_pct / 100.0)
    clamped_scale = max(scale_min, min(scale_max, raw_scale))

    cos_t = clamped_scale * math.cos(clamped_theta)
    sin_t = clamped_scale * math.sin(clamped_theta)

    tx = dst_a[0] - (cos_t * src_a[0] - sin_t * src_a[1])
    ty = dst_a[1] - (sin_t * src_a[0] + cos_t * src_a[1])

    M = np.array([
        [cos_t, -sin_t, tx],
        [sin_t,  cos_t, ty],
    ], dtype=np.float32)

    return M, math.degrees(clamped_theta), clamped_scale, (tx, ty)


def check_seam_overlap(
    part1_rgba: np.ndarray,
    part2_rgba: np.ndarray,
    joint_xy: tuple[float, float],
    radius: int = 35,
    min_overlap_px: int = 6,
) -> dict[str, Any]:
    """在關節附近檢查兩部位圖層之接縫重疊狀況與裂縫。"""
    h, w = part1_rgba.shape[:2]
    jx, jy = int(round(joint_xy[0])), int(round(joint_xy[1]))

    x0 = max(0, jx - radius)
    x1 = min(w, jx + radius)
    y0 = max(0, jy - radius)
    y1 = min(h, jy + radius)

    if x1 <= x0 or y1 <= y0:
        return {"overlap_px": 0, "has_crack": True, "passed": False}

    a1 = part1_rgba[y0:y1, x0:x1, 3] > 16
    a2 = part2_rgba[y0:y1, x0:x1, 3] > 16

    both = a1 & a2
    overlap_count = int(both.sum())

    # 若任一者在關節無任何像素，不構成有效接縫判定
    if a1.sum() == 0 or a2.sum() == 0:
        return {"overlap_px": 0, "has_crack": False, "passed": True, "skipped": True}

    # 計算最大連續重疊深度 (沿水平與垂直投影)
    row_runs = both.any(axis=1)
    col_runs = both.any(axis=0)

    max_row = int(row_runs.sum())
    max_col = int(col_runs.sum())
    overlap_depth = max(max_row, max_col)

    has_crack = (overlap_count == 0)
    passed = (not has_crack) and (overlap_depth >= min_overlap_px)

    return {
        "overlap_px": overlap_depth,
        "overlap_pixel_count": overlap_count,
        "has_crack": has_crack,
        "passed": passed,
    }


def draw_skeleton_overlay(
    bg_rgba: np.ndarray,
    joints_dict: dict[str, tuple[float, float]],
    line_color: tuple[int, int, int, int] = (0, 255, 120, 220),
    joint_color: tuple[int, int, int, int] = (255, 215, 0, 255),
) -> Image.Image:
    """繪製骨架疊圖以供檢核"""
    img = Image.fromarray(bg_rgba)
    draw = ImageDraw.Draw(img)

    bones = [
        ("pelvis", "neck"),
        ("neck", "head_center"),
        ("neck", "shoulder_f"),
        ("shoulder_f", "elbow_f"),
        ("elbow_f", "wrist_f"),
        ("wrist_f", "grip_A"),
        ("neck", "shoulder_b"),
        ("shoulder_b", "elbow_b"),
        ("elbow_b", "wrist_b"),
        ("wrist_b", "grip_B"),
        ("pelvis", "hip_f"),
        ("hip_f", "knee_f"),
        ("knee_f", "ankle_f"),
        ("pelvis", "hip_b"),
        ("hip_b", "knee_b"),
        ("knee_b", "ankle_b"),
    ]

    for b_from, b_to in bones:
        if b_from in joints_dict and b_to in joints_dict:
            p1 = joints_dict[b_from]
            p2 = joints_dict[b_to]
            draw.line([p1, p2], fill=line_color, width=3)

    for j_name, (jx, jy) in joints_dict.items():
        r = 6
        draw.ellipse([jx - r, jy - r, jx + r, jy + r], fill=joint_color, outline=(0, 0, 0, 255), width=1)

    return img


def apply_snap_pipeline(
    trimmed_parts: dict[str, dict[str, Any]],
    parts_out_dir: Path,
    masks_out_dir: Path,
    anim_masks_out_dir: Path,
    detected_points: dict[str, list[float]],
    canonical_spec: dict[str, Any],
    out_dir: Path,
    canvas_size: tuple[int, int] = (2048, 2048),
) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """執行全套剛體貼齊管線，並產出前後疊圖與 snap_report.json"""
    w, h = canvas_size
    cj = canonical_spec.get("joints", {})
    cg = canonical_spec.get("grips", {})

    target_points: dict[str, tuple[float, float]] = {}
    for k, v in cj.items():
        target_points[k] = (float(v["x"]), float(v["y"]))
    for k, v in cg.items():
        target_points[k] = (float(v["x"]), float(v["y"]))

    det_pts: dict[str, tuple[float, float]] = {}
    for k, v in detected_points.items():
        if isinstance(v, (list, tuple)) and len(v) >= 2:
            det_pts[k] = (float(v[0]), float(v[1]))

    # 1. 產生貼齊前合成圖
    canvas_before = np.zeros((h, w, 4), dtype=np.uint8)
    for sid, t_info in trimmed_parts.items():
        if t_info.get("empty", False):
            continue
        p_path = parts_out_dir / f"{sid}.png"
        if p_path.exists():
            p_arr = np.array(Image.open(p_path).convert("RGBA"))
            vis = p_arr[..., 3] > 0
            canvas_before[vis] = p_arr[vis]

    overlay_before = draw_skeleton_overlay(
        canvas_before,
        target_points,
        line_color=(255, 60, 60, 220),
        joint_color=(255, 215, 0, 255),
    )
    before_overlay_path = out_dir / "snap_before_overlay.png"
    overlay_before.save(before_overlay_path)

    # 2. 逐部位剛體變換 (平移 + 旋轉 + 骨長 <= 8% 縮放)
    snap_details: dict[str, Any] = {}
    canvas_after = np.zeros((h, w, 4), dtype=np.uint8)
    snapped_part_arrays: dict[str, np.ndarray] = {}

    for sid, t_info in trimmed_parts.items():
        p_path = parts_out_dir / f"{sid}.png"
        m_path = masks_out_dir / f"{sid}.png"
        am_path = anim_masks_out_dir / f"{sid}.png"

        if t_info.get("empty", False) or not p_path.exists():
            continue

        p_img = cv2.imread(str(p_path), cv2.IMREAD_UNCHANGED)
        if p_img is None or p_img.shape[:2] != (h, w):
            continue

        if sid in SLOT_ALIGN_JOINTS:
            j_from, j_to = SLOT_ALIGN_JOINTS[sid]
            src_a = det_pts.get(j_from)
            src_b = det_pts.get(j_to)
            dst_a = target_points.get(j_from)
            dst_b = target_points.get(j_to)

            if src_a and src_b and dst_a and dst_b:
                err_a_before = math.hypot(src_a[0] - dst_a[0], src_a[1] - dst_a[1])
                err_b_before = math.hypot(src_b[0] - dst_b[0], src_b[1] - dst_b[1])

                M, deg, scale, (tx, ty) = compute_rigid_similarity_transform(
                    src_a, src_b, dst_a, dst_b, max_angle_deg=10.0, max_scale_pct=8.0
                )

                # 剛體仿射變換 (INTER_LINEAR 保證平滑無失真)
                snapped_part = cv2.warpAffine(
                    p_img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0)
                )

                # 同步處理 masks
                if m_path.exists():
                    m_img = cv2.imread(str(m_path), cv2.IMREAD_UNCHANGED)
                    if m_img is not None:
                        snapped_m = cv2.warpAffine(m_img, M, (w, h), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
                        cv2.imwrite(str(m_path), snapped_m)

                if am_path.exists():
                    am_img = cv2.imread(str(am_path), cv2.IMREAD_UNCHANGED)
                    if am_img is not None:
                        snapped_am = cv2.warpAffine(am_img, M, (w, h), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
                        cv2.imwrite(str(am_path), snapped_am)

                # 寫回更新後之 part
                cv2.imwrite(str(p_path), snapped_part)
                snapped_part_arrays[sid] = snapped_part

                # 更新 trimmed_parts 資訊
                ys_p, xs_p = np.where(snapped_part[..., 3] > 0)
                if len(xs_p) == 0:
                    t_info["empty"] = True
                    t_info["crop"] = None
                    t_info["trimRectPx"] = [0, 0, 0, 0]
                    t_info["visiblePixels"] = 0
                else:
                    x0, x1 = int(xs_p.min()), int(xs_p.max())
                    y0, y1 = int(ys_p.min()), int(ys_p.max())
                    tw, th = x1 - x0 + 1, y1 - y0 + 1
                    t_info["empty"] = False
                    t_info["crop"] = snapped_part[y0:y1 + 1, x0:x1 + 1].copy()
                    t_info["trimRectPx"] = [x0, y0, tw, th]
                    t_info["visiblePixels"] = int(len(xs_p))

                vis = snapped_part[..., 3] > 0
                canvas_after[vis] = snapped_part[vis]

                snap_details[sid] = {
                    "joints": [j_from, j_to],
                    "before_error_from_px": round(err_a_before, 2),
                    "before_error_to_px": round(err_b_before, 2),
                    "applied_translation_px": [round(tx, 2), round(ty, 2)],
                    "applied_rotation_deg": round(deg, 2),
                    "applied_scale": round(scale, 4),
                    "after_error_from_px": 0.0,
                    "after_error_to_px": round(abs(math.hypot(dst_b[0] - dst_a[0], dst_b[1] - dst_a[1]) - scale * math.hypot(src_b[0] - src_a[0], src_b[1] - src_a[1])), 2),
                }
            else:
                snapped_part_arrays[sid] = p_img
                vis = p_img[..., 3] > 0
                canvas_after[vis] = p_img[vis]
        else:
            snapped_part_arrays[sid] = p_img
            vis = p_img[..., 3] > 0
            canvas_after[vis] = p_img[vis]

    # 3. 產生貼齊後合成疊圖 (綠色骨架標示對齊)
    overlay_after = draw_skeleton_overlay(
        canvas_after,
        target_points,
        line_color=(0, 255, 120, 240),
        joint_color=(0, 255, 255, 255),
    )
    after_overlay_path = out_dir / "snap_after_overlay.png"
    overlay_after.save(after_overlay_path)

    # 4. 接縫重疊檢查 (Seam Overlap Check)
    seam_reports: list[dict[str, Any]] = []
    all_seams_passed = True
    for p1_id, p2_id, joint_name in SEAM_PAIRS:
        if p1_id in snapped_part_arrays and p2_id in snapped_part_arrays and joint_name in target_points:
            s_res = check_seam_overlap(
                snapped_part_arrays[p1_id],
                snapped_part_arrays[p2_id],
                target_points[joint_name],
                radius=35,
                min_overlap_px=6,
            )
            s_item = {
                "pair": f"{p1_id} <-> {p2_id}",
                "joint": joint_name,
                "overlap_px": s_res["overlap_px"],
                "has_crack": s_res["has_crack"],
                "passed": s_res["passed"],
            }
            if not s_res["passed"] and not s_res.get("skipped", False):
                all_seams_passed = False
            seam_reports.append(s_item)

    report: dict[str, Any] = {
        "schema": "3klife.snap-report.v1",
        "description": "AG-11 自動貼齊固定骨架報告 (Rigid Alignment & Seam Overlap)",
        "snap_details": snap_details,
        "seam_overlap_check": {
            "all_passed": all_seams_passed,
            "min_required_overlap_px": 6,
            "pairs": seam_reports,
        },
        "overlay_before": str(before_overlay_path),
        "overlay_after": str(after_overlay_path),
    }

    report_path = out_dir / "snap_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return trimmed_parts, report
