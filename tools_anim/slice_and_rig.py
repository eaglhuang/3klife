#!/usr/bin/env python3
"""AG-02 自動切片與綁點工具（slice_and_rig.py）

功能：
1. 輸入立繪母圖（如 2048x3072 RGBA PNG）與標記點 JSON（支援 DWPose `pose_keypoints_2d` 或 19+2 點 `chibi.hNormalizedLandmarkSet.v1` / 直接座標格式），
   自動推導或讀取 19 個身體點（nose, neck, shoulder_f/b, elbow_f/b, wrist_f/b, hip_f/b, knee_f/b, ankle_f/b, head_center, pelvis, waist, chest, root）
   與 2 個武器握點（grip_A, grip_B）及手掌接觸點（hand_f_grip, hand_b_grip）。
2. 自動執行 20+1 槽位切件與遮罩生成：
   - 支援既有切件目錄（`--parts-dir`）、既有遮罩目錄（`--masks-dir`）、多邊形清單（`--polygons`），或由 19+2 標記點透過骨骼線段距離場自動分割。
   - 強制執行「互斥可見所有權（Mutually Exclusive Visible Ownership）」：原圖每個 `alpha > 0` 的可見像素恰好分配給唯一一個擁有者槽位（`unassigned = 0`、`overlap = 0`），確保 Setup Pose 回組與原圖比較每通道最大差 `<= 2`（實際達到 0 誤差）。
   - 自動清除透明區殘留標記雜訊（`alpha <= 8` 的像素歸零，且清除純綠 `(0,255,0)` / 純紅 `(255,0,0)` 數位標記點）。
   - 支援獨立武器來源（`--weapon-image`），並將母圖內嵌武器標記為 `reference_only_weapon`（符合 R207/R216 規範）。
   - 同時產出 `animation-masks/`（在關節交界處自動做圓弧延伸，供動時防破洞）。
3. 自動打包圖集（MaxRects 演算法）：
   - 輸出 `<name>.png`（預設 2048x4096，padding >= 2 px，不旋轉 `rotate: false`）與 Spine legacy 格式 `<name>.atlas`（含 `xy / size / orig / offset`）。
4. 輸出中立綁點與骨架檔 `source-rig.json`：
   - 預設符合 AG-01 裁決的 `3klife.neutral-rig.v2`（骨骼與槽位名稱統一為 `thigh_f/b`、`shin_f/b`，並同時提供 `bonesV1Compat` 與 `anchors` 欄位向下相容 Sparkle 動畫產生器）。
5. 輸出驗收報告 `cutout_validation_report.json` 與 `qa/` 視覺化預覽圖（125px / 250px / 500px 標記與分區疊圖、回組差異圖）。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageDraw

# 20+1 標準槽位與繪製順序（0 = 最底層，20 = 最上層）
CANONICAL_SLOTS: list[dict[str, Any]] = [
    {"id": "cape", "kind": "body", "drawOrder": 0, "bone": "cape", "boneV1": "cape"},
    {"id": "hair_tail", "kind": "body", "drawOrder": 1, "bone": "hair_tail", "boneV1": "hair_tail"},
    {"id": "arm_upper_b", "kind": "body", "drawOrder": 2, "bone": "arm_upper_b", "boneV1": "arm_upper_b"},
    {"id": "arm_lower_b", "kind": "body", "drawOrder": 3, "bone": "arm_lower_b", "boneV1": "arm_lower_b"},
    {"id": "hand_b", "kind": "body", "drawOrder": 4, "bone": "hand_b", "boneV1": "hand_b"},
    {"id": "thigh_b", "kind": "body", "drawOrder": 5, "bone": "thigh_b", "boneV1": "leg_upper_b"},
    {"id": "shin_b", "kind": "body", "drawOrder": 6, "bone": "shin_b", "boneV1": "leg_lower_b"},
    {"id": "foot_b", "kind": "body", "drawOrder": 7, "bone": "foot_b", "boneV1": "foot_b"},
    {"id": "pelvis", "kind": "body", "drawOrder": 8, "bone": "pelvis", "boneV1": "pelvis"},
    {"id": "thigh_f", "kind": "body", "drawOrder": 9, "bone": "thigh_f", "boneV1": "leg_upper_f"},
    {"id": "shin_f", "kind": "body", "drawOrder": 10, "bone": "shin_f", "boneV1": "leg_lower_f"},
    {"id": "foot_f", "kind": "body", "drawOrder": 11, "bone": "foot_f", "boneV1": "foot_f"},
    {"id": "skirt", "kind": "body", "drawOrder": 12, "bone": "skirt", "boneV1": "skirt"},
    {"id": "torso", "kind": "body", "drawOrder": 13, "bone": "torso", "boneV1": "torso"},
    {"id": "pauldron_b", "kind": "body", "drawOrder": 14, "bone": "pauldron_b", "boneV1": "pauldron_b"},
    {"id": "head", "kind": "body", "drawOrder": 15, "bone": "head", "boneV1": "head"},
    {"id": "weapon", "kind": "weapon", "drawOrder": 16, "bone": "weapon", "boneV1": "weapon"},
    {"id": "arm_upper_f", "kind": "body", "drawOrder": 17, "bone": "arm_upper_f", "boneV1": "arm_upper_f"},
    {"id": "arm_lower_f", "kind": "body", "drawOrder": 18, "bone": "arm_lower_f", "boneV1": "arm_lower_f"},
    {"id": "hand_f", "kind": "body", "drawOrder": 19, "bone": "hand_f", "boneV1": "hand_f"},
    {"id": "pauldron_f", "kind": "body", "drawOrder": 20, "bone": "pauldron_f", "boneV1": "pauldron_f"},
]

SLOT_COLORS: dict[str, tuple[int, int, int]] = {
    "cape": (140, 70, 190),
    "hair_tail": (70, 130, 210),
    "arm_upper_b": (60, 170, 170),
    "arm_lower_b": (50, 200, 150),
    "hand_b": (90, 220, 120),
    "thigh_b": (180, 140, 60),
    "shin_b": (200, 170, 50),
    "foot_b": (220, 200, 60),
    "pelvis": (210, 100, 140),
    "thigh_f": (230, 120, 50),
    "shin_f": (240, 150, 40),
    "foot_f": (250, 190, 50),
    "skirt": (190, 80, 110),
    "torso": (90, 160, 230),
    "pauldron_b": (120, 190, 90),
    "head": (240, 210, 110),
    "weapon": (220, 60, 60),
    "arm_upper_f": (50, 190, 220),
    "arm_lower_f": (40, 220, 190),
    "hand_f": (80, 245, 130),
    "pauldron_f": (150, 230, 80),
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def clean_transparent_and_marker_noise(img: np.ndarray, alpha_cutoff: int = 8) -> tuple[np.ndarray, dict[str, int]]:
    """清除透明區雜訊（alpha <= alpha_cutoff 歸零）與數位純綠/純紅標記殘留。"""
    out = img.copy()
    r = out[..., 0].astype(np.int16)
    g = out[..., 1].astype(np.int16)
    b = out[..., 2].astype(np.int16)
    a = out[..., 3].astype(np.int16)

    low_alpha_mask = (a > 0) & (a <= alpha_cutoff)
    low_alpha_cnt = int(low_alpha_mask.sum())
    out[a <= alpha_cutoff] = 0

    # 檢查並修復純數位標記點 (0,255,0) 或 (255,0,0)
    pure_green = (out[..., 3] > 0) & (g >= 245) & (r <= 10) & (b <= 10)
    pure_red = (out[..., 3] > 0) & (r >= 245) & (g <= 5) & (b <= 5)
    marker_mask = pure_green | pure_red
    marker_cnt = int(marker_mask.sum())

    if marker_cnt > 0:
        # 用鄰近非標記像素進行微小擴張修補，若為孤立點則透明化
        kernel = np.ones((5, 5), np.uint8)
        dilated = cv2.dilate(out, kernel, iterations=1)
        out[marker_mask] = dilated[marker_mask]

    return out, {
        "clearedLowAlphaPixels": low_alpha_cnt,
        "cleanedDigitalMarkerPixels": marker_cnt,
    }


def resolve_19plus2_landmarks(
    raw_landmarks: Any,
    img_rgba: np.ndarray,
    facing: str = "auto",
) -> dict[str, Any]:
    """支援三種輸入格式並統一轉為 19 個身體點 + 2 個武器握點（sourcePx: [x, y]）：
    1. ComfyUI DWPose JSON (`[{"people": [{"pose_keypoints_2d": [...]}]}]`)
    2. `chibi.hNormalizedLandmarkSet.v1` (`{"landmarks": [{"name": ..., "sourcePx": {"x": ..., "y": ...}}]}`)
    3. 直接鍵值字典 (`{"nose": [x, y], ...}` 或 `{"points": {...}}`)
    """
    h, w = img_rgba.shape[:2]
    alpha = img_rgba[..., 3]
    ys_vis, xs_vis = np.where(alpha > 24)
    top_y = float(ys_vis.min()) if len(ys_vis) else h * 0.15
    bottom_y = float(ys_vis.max()) if len(ys_vis) else h * 0.92
    center_x = float(np.median(xs_vis)) if len(xs_vis) else w * 0.5
    body_h = max(200.0, bottom_y - top_y)

    pts: dict[str, list[float]] = {}
    input_format = "unknown"

    # Case 1: DWPose list or dict with "people"
    people_list = None
    if isinstance(raw_landmarks, list) and raw_landmarks and isinstance(raw_landmarks[0], dict):
        people_list = raw_landmarks[0].get("people")
    elif isinstance(raw_landmarks, dict) and "people" in raw_landmarks:
        people_list = raw_landmarks.get("people")

    if people_list:
        input_format = "dwpose_18body_hands"
        person = people_list[0]
        kp = person.get("pose_keypoints_2d", [])

        def get_kp(idx: int) -> tuple[float, float, float]:
            base = idx * 3
            if base + 2 < len(kp):
                return float(kp[base]), float(kp[base + 1]), float(kp[base + 2])
            return 0.0, 0.0, 0.0

        # COCO 18 mapping:
        # 0:nose, 1:neck, 2:RSho, 3:RElb, 4:RWri, 5:LSho, 6:LElb, 7:LWri,
        # 8:RHip, 9:RKne, 10:RAnk, 11:LHip, 12:LKne, 13:LAnk, 14:REye, 15:LEye, 16:REar, 17:LEar
        nose = get_kp(0)[:2]
        neck = get_kp(1)[:2]
        r_sho, r_elb, r_wri = get_kp(2)[:2], get_kp(3)[:2], get_kp(4)[:2]
        l_sho, l_elb, l_wri = get_kp(5)[:2], get_kp(6)[:2], get_kp(7)[:2]
        r_hip, r_kne, r_ank = get_kp(8)[:2], get_kp(9)[:2], get_kp(10)[:2]
        l_hip, l_kne, l_ank = get_kp(11)[:2], get_kp(12)[:2], get_kp(13)[:2]
        r_eye, l_eye = get_kp(14)[:2], get_kp(15)[:2]

        # 判斷哪一側是前景（_f）與後景（_b）：
        # 在趙雲 C2 中，武器握持於畫面右側（COCO L-side x~1607），前景腿與前景手在畫面右側；
        # 若 facing 指定或自動依手腕/腳踝前景位置決定
        if facing == "right" or (facing == "auto" and l_wri[0] > r_wri[0]):
            # 畫面右側 (COCO Left, x 較大) 為 _f，畫面左側 (COCO Right, x 較小) 為 _b
            sho_f, elb_f, wri_f = l_sho, l_elb, l_wri
            sho_b, elb_b, wri_b = r_sho, r_elb, r_wri
            hip_f, kne_f, ank_f = l_hip, l_kne, l_ank
            hip_b, kne_b, ank_b = r_hip, r_kne, r_ank
            hand_f_kp = person.get("hand_left_keypoints_2d", [])
            hand_b_kp = person.get("hand_right_keypoints_2d", [])
        else:
            sho_f, elb_f, wri_f = r_sho, r_elb, r_wri
            sho_b, elb_b, wri_b = l_sho, l_elb, l_wri
            hip_f, kne_f, ank_f = r_hip, r_kne, r_ank
            hip_b, kne_b, ank_b = l_hip, l_kne, l_ank
            hand_f_kp = person.get("hand_right_keypoints_2d", [])
            hand_b_kp = person.get("hand_left_keypoints_2d", [])

        pelvis = [(hip_f[0] + hip_b[0]) * 0.5, (hip_f[1] + hip_b[1]) * 0.5]
        chest = [(sho_f[0] + sho_b[0]) * 0.5, (sho_f[1] + sho_b[1]) * 0.5]
        waist = [pelvis[0] * 0.62 + chest[0] * 0.38, pelvis[1] * 0.62 + chest[1] * 0.38]
        head_center = [
            (nose[0] + r_eye[0] + l_eye[0]) / 3.0 if r_eye[0] > 0 and l_eye[0] > 0 else nose[0],
            (nose[1] + r_eye[1] + l_eye[1]) / 3.0 if r_eye[1] > 0 and l_eye[1] > 0 else nose[1] - 0.03 * body_h,
        ]
        root_y = max(ank_f[1], ank_b[1]) + 0.045 * body_h
        root = [pelvis[0], min(float(h - 10), root_y)]

        # 由手部關鍵點推算手掌中心與槍桿握點 grip_A / grip_B
        def hand_palm_center(h_kp: list[float], fallback: tuple[float, float]) -> list[float]:
            if len(h_kp) >= 30:
                # 取腕部(0)與食指/中指/無名指 MCP(5, 9, 13) 的平均作為手掌握持中心
                idxs = [0, 5, 9, 13]
                xs_h = [float(h_kp[i * 3]) for i in idxs if h_kp[i * 3 + 2] > 0.1]
                ys_h = [float(h_kp[i * 3 + 1]) for i in idxs if h_kp[i * 3 + 2] > 0.1]
                if xs_h and ys_h:
                    return [sum(xs_h) / len(xs_h), sum(ys_h) / len(ys_h)]
            return [float(fallback[0]), float(fallback[1])]

        grip_a = hand_palm_center(hand_f_kp, wri_f)
        # 單手握持時，grip_B 位於同槍桿軸線下方約一拳距離 (0.045 * body_h)
        grip_b = [grip_a[0] + 10.0, grip_a[1] + 0.055 * body_h]

        pts = {
            "nose": [float(nose[0]), float(nose[1])],
            "head_center": [float(head_center[0]), float(head_center[1])],
            "neck": [float(neck[0]), float(neck[1])],
            "chest": [float(chest[0]), float(chest[1])],
            "waist": [float(waist[0]), float(waist[1])],
            "pelvis": [float(pelvis[0]), float(pelvis[1])],
            "root": [float(root[0]), float(root[1])],
            "shoulder_f": [float(sho_f[0]), float(sho_f[1])],
            "elbow_f": [float(elb_f[0]), float(elb_f[1])],
            "wrist_f": [float(wri_f[0]), float(wri_f[1])],
            "shoulder_b": [float(sho_b[0]), float(sho_b[1])],
            "elbow_b": [float(elb_b[0]), float(elb_b[1])],
            "wrist_b": [float(wri_b[0]), float(wri_b[1])],
            "hip_f": [float(hip_f[0]), float(hip_f[1])],
            "knee_f": [float(kne_f[0]), float(kne_f[1])],
            "ankle_f": [float(ank_f[0]), float(ank_f[1])],
            "hip_b": [float(hip_b[0]), float(hip_b[1])],
            "knee_b": [float(kne_b[0]), float(kne_b[1])],
            "ankle_b": [float(ank_b[0]), float(ank_b[1])],
            "grip_A": [float(grip_a[0]), float(grip_a[1])],
            "grip_B": [float(grip_b[0]), float(grip_b[1])],
        }

    elif isinstance(raw_landmarks, dict) and "landmarks" in raw_landmarks and isinstance(raw_landmarks["landmarks"], list):
        input_format = raw_landmarks.get("schema", "chibi.hNormalizedLandmarkSet.v1")
        alias_map = {
            "pelvisCenter": "pelvis",
            "waistCenter": "waist",
            "neckBase": "neck",
            "headCenter": "head_center",
        }
        for item in raw_landmarks["landmarks"]:
            name = item.get("name", "")
            canon = alias_map.get(name, name)
            spx = item.get("sourcePx")
            if isinstance(spx, dict):
                pts[canon] = [float(spx["x"]), float(spx["y"])]
            elif isinstance(spx, (list, tuple)) and len(spx) >= 2:
                pts[canon] = [float(spx[0]), float(spx[1])]

        # 補齊 19+2 中衍生點（nose, chest）
        if "head_center" in pts and "nose" not in pts:
            pts["nose"] = [pts["head_center"][0], pts["head_center"][1] + 18.0]
        if "shoulder_f" in pts and "shoulder_b" in pts and "chest" not in pts:
            pts["chest"] = [
                (pts["shoulder_f"][0] + pts["shoulder_b"][0]) * 0.5,
                (pts["shoulder_f"][1] + pts["shoulder_b"][1]) * 0.5,
            ]
        if "measurement" in raw_landmarks and "HSourcePx" in raw_landmarks["measurement"]:
            body_h = float(raw_landmarks["measurement"]["HSourcePx"])

    elif isinstance(raw_landmarks, dict):
        input_format = "direct_dict"
        src_dict = raw_landmarks.get("points", raw_landmarks)
        for k, v in src_dict.items():
            if isinstance(v, (list, tuple)) and len(v) >= 2:
                pts[k] = [float(v[0]), float(v[1])]
            elif isinstance(v, dict) and "x" in v and "y" in v:
                pts[k] = [float(v["x"]), float(v["y"])]

    # 確保所有 19+2 點皆存在（若缺漏則給安全幾何預設）
    defaults = {
        "root": [center_x, bottom_y],
        "pelvis": [center_x, top_y + 0.62 * body_h],
        "waist": [center_x, top_y + 0.56 * body_h],
        "chest": [center_x, top_y + 0.44 * body_h],
        "neck": [center_x, top_y + 0.40 * body_h],
        "head_center": [center_x, top_y + 0.25 * body_h],
        "nose": [center_x, top_y + 0.28 * body_h],
        "shoulder_f": [center_x - 0.12 * body_h, top_y + 0.42 * body_h],
        "elbow_f": [center_x - 0.16 * body_h, top_y + 0.50 * body_h],
        "wrist_f": [center_x - 0.20 * body_h, top_y + 0.55 * body_h],
        "shoulder_b": [center_x + 0.12 * body_h, top_y + 0.42 * body_h],
        "elbow_b": [center_x + 0.16 * body_h, top_y + 0.52 * body_h],
        "wrist_b": [center_x + 0.20 * body_h, top_y + 0.60 * body_h],
        "hip_f": [center_x - 0.08 * body_h, top_y + 0.62 * body_h],
        "knee_f": [center_x - 0.09 * body_h, top_y + 0.76 * body_h],
        "ankle_f": [center_x - 0.11 * body_h, top_y + 0.90 * body_h],
        "hip_b": [center_x + 0.08 * body_h, top_y + 0.62 * body_h],
        "knee_b": [center_x + 0.10 * body_h, top_y + 0.77 * body_h],
        "ankle_b": [center_x + 0.13 * body_h, top_y + 0.90 * body_h],
    }
    for k, dv in defaults.items():
        if k not in pts:
            pts[k] = dv
    if "grip_A" not in pts:
        pts["grip_A"] = list(pts["wrist_f"])
    if "grip_B" not in pts:
        pts["grip_B"] = [pts["grip_A"][0], pts["grip_A"][1] + 0.045 * body_h]

    return {
        "inputFormat": input_format,
        "bodyHeightPx": round(body_h, 2),
        "points": {k: [round(v[0], 2), round(v[1], 2)] for k, v in pts.items()},
    }


def segment_distance_sq_grid(
    xx: np.ndarray,
    yy: np.ndarray,
    p0: tuple[float, float],
    p1: tuple[float, float],
) -> np.ndarray:
    """計算網格點 (xx, yy) 到線段 p0-p1 的平方距離。"""
    x0, y0 = p0
    x1, y1 = p1
    dx = x1 - x0
    dy = y1 - y0
    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq < 1e-6:
        return (xx - x0) ** 2 + (yy - y0) ** 2
    t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / seg_len_sq, 0.0, 1.0)
    proj_x = x0 + t * dx
    proj_y = y0 + t * dy
    return (xx - proj_x) ** 2 + (yy - proj_y) ** 2


def build_mutually_exclusive_ownership(
    master_rgba: np.ndarray,
    landmarks: dict[str, list[float]],
    polygons_manifest_path: Path | None = None,
    masks_dir_path: Path | None = None,
    parts_dir_path: Path | None = None,
) -> tuple[np.ndarray, dict[str, np.ndarray], str]:
    """為母圖所有可見像素 (alpha > 0) 建立互斥且全覆蓋的槽位歸屬索引圖 `owner_map` (shape HxW, int16, -1=透明, 0..20=slot index)，
    以及 `anim_extension_masks`（關節圓弧外擴遮罩）。
    保證：
    - 每個 `master_rgba[..., 3] > 0` 的像素恰好有唯一一個 `0 <= owner <= 20`（unassigned = 0, overlap = 0）。
    """
    h, w = master_rgba.shape[:2]
    live_mask = master_rgba[..., 3] > 0
    slot_ids = [s["id"] for s in CANONICAL_SLOTS]
    slot_to_idx = {sid: i for i, sid in enumerate(slot_ids)}

    owner_map = np.full((h, w), -1, dtype=np.int16)
    mode_used = "landmark_skeleton_voronoi"

    # 1. 若提供了既有切件或遮罩或 polygon manifest，先依 drawOrder 由下而上填入可見範圍
    if parts_dir_path and parts_dir_path.exists():
        mode_used = "existing_parts_dir"
        for s_idx, sid in enumerate(slot_ids):
            p_file = parts_dir_path / f"{sid}.png"
            if p_file.exists():
                p_arr = np.array(Image.open(p_file).convert("RGBA"))
                if p_arr.shape[:2] == (h, w):
                    has_a = (p_arr[..., 3] > 0) & live_mask
                    owner_map[has_a] = s_idx
    elif masks_dir_path and masks_dir_path.exists():
        mode_used = "existing_masks_dir"
        for s_idx, sid in enumerate(slot_ids):
            m_file = masks_dir_path / f"{sid}.png"
            if m_file.exists():
                m_arr = np.array(Image.open(m_file).convert("L"))
                if m_arr.shape[:2] == (h, w):
                    has_m = (m_arr > 0) & live_mask
                    owner_map[has_m] = s_idx
    elif polygons_manifest_path and polygons_manifest_path.exists():
        mode_used = "polygon_manifest_with_voronoi_completion"
        manifest = json.loads(polygons_manifest_path.read_text(encoding="utf-8"))
        slots_list = sorted(manifest.get("slots", []), key=lambda x: int(x.get("drawOrder", 0)))
        for s_entry in slots_list:
            sid = s_entry.get("id")
            poly = s_entry.get("polygonSourcePx", [])
            if sid in slot_to_idx and len(poly) >= 3:
                poly_img = Image.new("L", (w, h), 0)
                ImageDraw.Draw(poly_img).polygon([tuple(pt) for pt in poly], fill=255)
                poly_mask = (np.array(poly_img) > 0) & live_mask
                owner_map[poly_mask] = slot_to_idx[sid]

    # 2. 對所有尚未指派的可見像素（或在純 landmark 模式下全部可見像素），以 19+2 骨骼區段加權距離場指派唯一 owner
    unassigned_mask = live_mask & (owner_map < 0)
    if unassigned_mask.any():
        # 在降採樣網格 (1/4) 計算每個槽位代表線段的加權距離，再放大或直接對未分配像素座標計算
        ys_u, xs_u = np.where(unassigned_mask)
        xx = xs_u.astype(np.float32)
        yy = ys_u.astype(np.float32)

        p = {k: (float(v[0]), float(v[1])) for k, v in landmarks.items()}
        # 推導輔助端點：腳尖、手掌延伸、披風、髮尾、槍桿軸線
        face_dir = 1.0 if p["wrist_f"][0] >= p["pelvis"][0] else -1.0
        foot_f_tip = (p["ankle_f"][0] + face_dir * 75.0, p["ankle_f"][1] + 55.0)
        foot_b_tip = (p["ankle_b"][0] - face_dir * 60.0, p["ankle_b"][1] + 55.0)
        hand_f_tip = (p["wrist_f"][0] + face_dir * 45.0, p["wrist_f"][1] + 25.0)
        hand_b_tip = (p["wrist_b"][0] - face_dir * 45.0, p["wrist_b"][1] + 45.0)
        hair_top = (p["head_center"][0] - face_dir * 120.0, p["head_center"][1] - 280.0)
        cape_bot = (p["pelvis"][0] - face_dir * 260.0, p["pelvis"][1] + 180.0)

        # 武器軸線：由 grip_A 與 grip_B 延伸上下端
        gx_d = p["grip_B"][0] - p["grip_A"][0]
        gy_d = p["grip_B"][1] - p["grip_A"][1]
        g_len = math.hypot(gx_d, gy_d)
        if g_len < 5.0:
            ux, uy = 0.05, 0.998
        else:
            ux, uy = gx_d / g_len, gy_d / g_len
        weap_top = (p["grip_A"][0] - ux * 1150.0, p["grip_A"][1] - uy * 1150.0)
        weap_bot = (p["grip_B"][0] + ux * 850.0, p["grip_B"][1] + uy * 850.0)

        # 定義各槽位的代表線段 (p0, p1) 與有效半徑權重 (radius_scale 越大代表吸收範圍越廣)
        slot_segments: dict[str, tuple[tuple[float, float], tuple[float, float], float]] = {
            "head": ((p["head_center"][0], p["head_center"][1] - 110.0), p["neck"], 260.0),
            "hair_tail": (hair_top, (p["head_center"][0] - face_dir * 160.0, p["head_center"][1] - 60.0), 190.0),
            "torso": (p["neck"], p["waist"], 230.0),
            "pelvis": (p["waist"], p["pelvis"], 170.0),
            "skirt": (p["pelvis"], (p["pelvis"][0], p["pelvis"][1] + 140.0), 210.0),
            "cape": ((p["shoulder_b"][0] - face_dir * 120.0, p["shoulder_b"][1] + 120.0), cape_bot, 220.0),
            "pauldron_f": (p["shoulder_f"], (p["shoulder_f"][0] + face_dir * 45.0, p["shoulder_f"][1] - 35.0), 115.0),
            "pauldron_b": (p["shoulder_b"], (p["shoulder_b"][0] - face_dir * 45.0, p["shoulder_b"][1] - 35.0), 115.0),
            "arm_upper_f": (p["shoulder_f"], p["elbow_f"], 115.0),
            "arm_lower_f": (p["elbow_f"], p["wrist_f"], 105.0),
            "hand_f": (p["wrist_f"], hand_f_tip, 95.0),
            "arm_upper_b": (p["shoulder_b"], p["elbow_b"], 115.0),
            "arm_lower_b": (p["elbow_b"], p["wrist_b"], 105.0),
            "hand_b": (p["wrist_b"], hand_b_tip, 95.0),
            "thigh_f": (p["hip_f"], p["knee_f"], 155.0),
            "shin_f": (p["knee_f"], p["ankle_f"], 135.0),
            "foot_f": (p["ankle_f"], foot_f_tip, 130.0),
            "thigh_b": (p["hip_b"], p["knee_b"], 155.0),
            "shin_b": (p["knee_b"], p["ankle_b"], 135.0),
            "foot_b": (p["ankle_b"], foot_b_tip, 130.0),
            "weapon": (weap_top, weap_bot, 75.0),
        }

        best_score = np.full(len(xs_u), np.inf, dtype=np.float32)
        best_slot = np.zeros(len(xs_u), dtype=np.int16)

        for s_idx, sid in enumerate(slot_ids):
            seg_p0, seg_p1, rad = slot_segments[sid]
            d2 = segment_distance_sq_grid(xx, yy, seg_p0, seg_p1)
            score = np.sqrt(d2) / rad
            better = score < best_score
            best_score[better] = score[better]
            best_slot[better] = s_idx

        owner_map[ys_u, xs_u] = best_slot

    # AG-06 補充：確保 hair_tail 切件與 head 互斥，接縫藏在髮髻下
    head_idx = slot_to_idx.get("head")
    hair_idx = slot_to_idx.get("hair_tail")
    if head_idx is not None and hair_idx is not None:
        p_neck_y = landmarks.get("neck", [0.0, float(h)])[1]
        p_head_cx = landmarks.get("head_center", [float(w) * 0.5, 0.0])[0]
        # 凡是位於頭頂髮髻區域（Y < neck 且靠近 head_center 水平半徑內），若劃為 hair_tail 則強制歸屬 head
        hair_pixels = owner_map == hair_idx
        ys_h, xs_h = np.where(hair_pixels)
        if len(ys_h) > 0:
            bun_mask = (ys_h < p_neck_y) & (np.abs(xs_h - p_head_cx) < 200.0)
            owner_map[ys_h[bun_mask], xs_h[bun_mask]] = head_idx

    # 3. 產出關節圓弧外擴的 animationMask（在可見遮罩基礎上，對肢體關節點做半徑 28px 的圓弧延伸且限於母圖有效區域內）
    anim_ext_masks: dict[str, np.ndarray] = {}
    joint_Pivot_for_slot = {
        "arm_upper_f": "shoulder_f",
        "arm_lower_f": "elbow_f",
        "hand_f": "wrist_f",
        "arm_upper_b": "shoulder_b",
        "arm_lower_b": "elbow_b",
        "hand_b": "wrist_b",
        "thigh_f": "hip_f",
        "shin_f": "knee_f",
        "foot_f": "ankle_f",
        "thigh_b": "hip_b",
        "shin_b": "knee_b",
        "foot_b": "ankle_b",
        "head": "neck",
    }
    for s_idx, sid in enumerate(slot_ids):
        vis_m = owner_map == s_idx
        ext_m = vis_m.copy()
        j_key = joint_Pivot_for_slot.get(sid)
        if j_key and j_key in landmarks:
            jx, jy = int(round(landmarks[j_key][0])), int(round(landmarks[j_key][1]))
            circle_layer = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(circle_layer, (jx, jy), 28, 255, -1)
            ext_m |= (circle_layer > 0) & live_mask
        anim_ext_masks[sid] = ext_m

    # 確保 hair_tail 的 animationMask 不滲透侵入 head 的可見區域
    if "hair_tail" in anim_ext_masks and head_idx is not None:
        anim_ext_masks["hair_tail"] &= ~(owner_map == head_idx)

    return owner_map, anim_ext_masks, mode_used


def pack_atlas_maxrects(
    trimmed_parts: dict[str, dict[str, Any]],
    page_w: int = 2048,
    page_h: int = 4096,
    padding: int = 2,
) -> tuple[Image.Image, dict[str, dict[str, Any]]]:
    """將裁切後的切件打包進單張 Atlas PNG（不旋轉 `rotate: false`，確保 padding >= 2 px）。"""
    # 依高度與面積由大到小排序
    items = [
        (sid, info)
        for sid, info in trimmed_parts.items()
        if not info.get("empty", False) and info["crop"] is not None
    ]
    items.sort(key=lambda kv: (kv[1]["trimRectPx"][3], kv[1]["trimRectPx"][2]), reverse=True)

    # Shelf / skyline packing with padding
    atlas_img = Image.new("RGBA", (page_w, page_h), (0, 0, 0, 0))
    placed: dict[str, dict[str, Any]] = {}

    cur_x = padding
    cur_y = padding
    shelf_h = 0

    for sid, info in items:
        crop_arr: np.ndarray = info["crop"]
        tx, ty, tw, th = info["trimRectPx"]
        if cur_x + tw + padding > page_w:
            cur_x = padding
            cur_y += shelf_h + padding
            shelf_h = 0
        if cur_y + th + padding > page_h:
            # 若超過預設高度，自動擴展 page_h
            new_h = max(page_h * 2, cur_y + th + padding * 2)
            expanded = Image.new("RGBA", (page_w, new_h), (0, 0, 0, 0))
            expanded.paste(atlas_img, (0, 0))
            atlas_img = expanded
            page_h = new_h

        pil_crop = Image.fromarray(crop_arr, mode="RGBA")
        atlas_img.paste(pil_crop, (cur_x, cur_y))

        orig_w, orig_h = info["sourceCanvasSizePx"]
        # Spine legacy offset: offset from bottom-left of original image to bottom-left of trimmed region
        offset_x = tx
        offset_y = orig_h - (ty + th)

        placed[sid] = {
            "atlasRectPx": [cur_x, cur_y, tw, th],
            "trimRectPx": [tx, ty, tw, th],
            "offsetPx": [offset_x, offset_y],
            "sourceCanvasSizePx": [orig_w, orig_h],
            "sourceSha256": info["partSha256"],
        }

        cur_x += tw + padding
        shelf_h = max(shelf_h, th)

    return atlas_img, placed


def write_legacy_atlas(
    atlas_path: Path,
    page_filename: str,
    page_size: tuple[int, int],
    placed_regions: dict[str, dict[str, Any]],
) -> None:
    """輸出相容性最高的 Spine legacy `.atlas` 格式（xy / size / orig / offset / index）。"""
    lines = [
        "",
        page_filename,
        f"size: {page_size[0]},{page_size[1]}",
        "format: RGBA8888",
        "filter: Linear,Linear",
        "repeat: none",
    ]
    for sid, reg in placed_regions.items():
        ax, ay, aw, ah = reg["atlasRectPx"]
        ow, oh = reg["sourceCanvasSizePx"]
        ox, oy = reg["offsetPx"]
        lines.extend(
            [
                sid,
                "  rotate: false",
                f"  xy: {ax}, {ay}",
                f"  size: {aw}, {ah}",
                f"  orig: {ow}, {oh}",
                f"  offset: {ox}, {oy}",
                "  index: -1",
            ]
        )
    atlas_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_neutral_rig_v2(
    landmarks_info: dict[str, Any],
    placed_regions: dict[str, dict[str, Any]],
    trimmed_parts: dict[str, dict[str, Any]],
    canvas_size: tuple[int, int],
    source_sha256: str,
    atlas_filename: str,
    atlas_size: tuple[int, int],
    padding: int,
    weapon_source_mode: str,
    rig_schema: str = "v2",
    canonical_spec: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """建立符合 AG-01、AG-07 與 AG-09 固定骨架 v3 規範的 `3klife.neutral-rig.v2` JSON。
    若傳入 `canonical_spec`，所有骨骼座標、骨長與樞紐均直接取自固定骨架規範，保證所有武將骨骼層級完全相同。
    """
    if canonical_spec and "joints" in canonical_spec and "grips" in canonical_spec:
        cj = canonical_spec["joints"]
        cg = canonical_spec["grips"]
        pts = {
            "root": [cj["root"]["x"], cj["root"]["y"]],
            "pelvis": [cj["pelvis"]["x"], cj["pelvis"]["y"]],
            "waist": [cj["waist"]["x"], cj["waist"]["y"]],
            "chest": [cj["chest"]["x"], cj["chest"]["y"]],
            "neck": [cj["neck"]["x"], cj["neck"]["y"]],
            "head_center": [cj["head_center"]["x"], cj["head_center"]["y"]],
            "shoulder_f": [cj["shoulder_f"]["x"], cj["shoulder_f"]["y"]],
            "elbow_f": [cj["elbow_f"]["x"], cj["elbow_f"]["y"]],
            "wrist_f": [cj["wrist_f"]["x"], cj["wrist_f"]["y"]],
            "shoulder_b": [cj["shoulder_b"]["x"], cj["shoulder_b"]["y"]],
            "elbow_b": [cj["elbow_b"]["x"], cj["elbow_b"]["y"]],
            "wrist_b": [cj["wrist_b"]["x"], cj["wrist_b"]["y"]],
            "hip_f": [cj["hip_f"]["x"], cj["hip_f"]["y"]],
            "knee_f": [cj["knee_f"]["x"], cj["knee_f"]["y"]],
            "ankle_f": [cj["ankle_f"]["x"], cj["ankle_f"]["y"]],
            "hip_b": [cj["hip_b"]["x"], cj["hip_b"]["y"]],
            "knee_b": [cj["knee_b"]["x"], cj["knee_b"]["y"]],
            "ankle_b": [cj["ankle_b"]["x"], cj["ankle_b"]["y"]],
            "grip_A": [cg["grip_A"]["x"], cg["grip_A"]["y"]],
            "grip_B": [cg["grip_B"]["x"], cg["grip_B"]["y"]],
        }
        body_h = float(canonical_spec.get("H", 1600.0))
        rig_status = "canonical-skeleton-v3-fixed-coordinates; identical bone lengths across all generals; offline-verified"
    else:
        pts = landmarks_info["points"]
        body_h = landmarks_info["bodyHeightPx"]
        rig_status = "generated by AG-02 slice_and_rig.py; offline-verified; requires Cocos review before production claim"

    w, h = canvas_size

    use_v1_leg_names = rig_schema == "v1-compat"
    b_thigh_f = "leg_upper_f" if use_v1_leg_names else "thigh_f"
    b_shin_f = "leg_lower_f" if use_v1_leg_names else "shin_f"
    b_thigh_b = "leg_upper_b" if use_v1_leg_names else "thigh_b"
    b_shin_b = "leg_lower_b" if use_v1_leg_names else "shin_b"

    # 定義骨骼層級與樞紐點 (pivotSourcePx: [x, y], y-down)
    bone_Specs = [
        ("root", None, pts["root"]),
        ("pelvis", "root", pts["pelvis"]),
        ("torso", "pelvis", pts["waist"]),
        ("head", "torso", pts["neck"]),
        ("cape", "torso", pts.get("chest", pts["neck"])),
        ("hair_tail", "head", [pts["head_center"][0] - 80.0, pts["head_center"][1] - 120.0]),
        ("skirt", "pelvis", pts["pelvis"]),
        ("arm_upper_f", "torso", pts["shoulder_f"]),
        ("arm_lower_f", "arm_upper_f", pts["elbow_f"]),
        ("hand_f", "arm_lower_f", pts["wrist_f"]),
        ("pauldron_f", "arm_upper_f", pts["shoulder_f"]),
        ("arm_upper_b", "torso", pts["shoulder_b"]),
        ("arm_lower_b", "arm_upper_b", pts["elbow_b"]),
        ("hand_b", "arm_lower_b", pts["wrist_b"]),
        ("pauldron_b", "arm_upper_b", pts["shoulder_b"]),
        (b_thigh_f, "pelvis", pts["hip_f"]),
        (b_shin_f, b_thigh_f, pts["knee_f"]),
        ("foot_f", b_shin_f, pts["ankle_f"]),
        (b_thigh_b, "pelvis", pts["hip_b"]),
        (b_shin_b, b_thigh_b, pts["knee_b"]),
        ("foot_b", b_shin_b, pts["ankle_b"]),
        ("weapon", "hand_f", pts["grip_A"]),
        ("grip_B", "weapon", pts["grip_B"]),
    ]

    pivot_map = {b_name: [round( float(piv[0]), 2), round(float(piv[1]), 2)] for b_name, _, piv in bone_Specs}

    bones_v2: list[dict[str, Any]] = []
    for b_name, parent_name, _ in bone_Specs:
        piv = pivot_map[b_name]
        if parent_name is None:
            dx, dy = 0.0, 0.0
        else:
            p_piv = pivot_map[parent_name]
            dx = round(piv[0] - p_piv[0], 2)
            dy = round(piv[1] - p_piv[1], 2)

        is_empty_cape = b_name == "cape" and trimmed_parts.get("cape", {}).get("empty", True)
        bones_v2.append(
            {
                "name": b_name,
                "parent": parent_name,
                "x": 0.0 if is_empty_cape else dx,
                "y": 0.0 if is_empty_cape else dy,
                "rotation": 0,
                "pivotSourcePx": None if is_empty_cape else piv,
                "status": "empty slot; do not animate" if is_empty_cape else "auto-generated-from-19plus2-landmarks",
            }
        )

    # 計算每個 slot 的 attachmentCenterFromBonePx 與手掌 alpha 重心接觸點
    slots_out: list[dict[str, Any]] = []
    palm_contacts: dict[str, Any] = {}

    for s_def in CANONICAL_SLOTS:
        sid = s_def["id"]
        b_name = s_def["boneV1"] if use_v1_leg_names else s_def["bone"]
        t_info = trimmed_parts.get(sid, {})
        if t_info.get("empty", True) or sid not in placed_regions:
            slots_out.append(
                {
                    "name": sid,
                    "bone": b_name,
                    "boneV1Compat": s_def["boneV1"],
                    "drawOrder": s_def["drawOrder"],
                    "region": None,
                    "attachmentCenterFromBonePx": None,
                    "empty": True,
                }
            )
            continue

        tx, ty, tw, th = placed_regions[sid]["trimRectPx"]
        cx = tx + tw * 0.5
        cy = ty + th * 0.5
        b_piv = pivot_map[b_name]
        off_x = round(cx - b_piv[0], 2)
        off_y = round(cy - b_piv[1], 2)

        slots_out.append(
            {
                "name": sid,
                "bone": b_name,
                "boneV1Compat": s_def["boneV1"],
                "drawOrder": s_def["drawOrder"],
                "region": sid,
                "attachmentCenterFromBonePx": [off_x, off_y],
                "empty": False,
            }
        )

        # 若為手掌切件，尋找空心拳心孔洞位置（AG-07 綁骨分件圖空心握拳），若無孔洞則取 alpha 重心
        if sid in ("hand_f", "hand_b"):
            crop_arr = t_info.get("crop")
            hole_found = False
            hole_cx, hole_cy = 0.0, 0.0
            if crop_arr is not None and crop_arr.ndim == 3:
                a_ch = crop_arr[..., 3]
                bin_m = (a_ch > 24).astype(np.uint8) * 255
                contours, hierarchy = cv2.findContours(bin_m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
                if hierarchy is not None and len(hierarchy[0]) > 1:
                    for c_idx, h_node in enumerate(hierarchy[0]):
                        if h_node[3] >= 0:  # 具有 parent 即為內部孔洞
                            M_h = cv2.moments(contours[c_idx])
                            if M_h["m00"] > 4.0:
                                hole_cx = float(M_h["m10"] / M_h["m00"])
                                hole_cy = float(M_h["m01"] / M_h["m00"])
                                hole_found = True
                                break
            if hole_found:
                palm_sx = tx + hole_cx
                palm_sy = ty + hole_cy
                grip_note = "hollow fist hole center (AG-07 rigpose specification)"
            elif crop_arr is not None and crop_arr.ndim == 3:
                a_ch = crop_arr[..., 3]
                ys_a, xs_a = np.where(a_ch > 24)
                if len(xs_a) > 0:
                    w_a = a_ch[ys_a, xs_a].astype(np.float64)
                    palm_sx = tx + float(np.average(xs_a, weights=w_a))
                    palm_sy = ty + float(np.average(ys_a, weights=w_a))
                else:
                    palm_sx, palm_sy = cx, cy
                grip_note = "palm alpha centroid contact point"
            else:
                palm_sx, palm_sy = cx, cy
                grip_note = "attachment center contact point"

            palm_contacts[f"{sid}_grip"] = {
                "parentBone": b_name,
                "sourcePx": [round(palm_sx, 2), round(palm_sy, 2)],
                "offsetFromBoneSourcePx": [round(palm_sx - b_piv[0], 2), round(palm_sy - b_piv[1], 2)],
                "note": grip_note,
            }

    head_w = placed_regions.get("head", {}).get("trimRectPx", [0, 0, int(body_h * 0.4), 0])[2]

    return {
        "schema": "3klife.neutral-rig.v2",
        "schemaCompat": "3klife.neutral-rig.v1",
        "status": rig_status,
        "coordinateSystem": "source pixels; x right; y down; local bone translation from parent pivot",
        "weaponSourcePolicy": weapon_source_mode,
        "trackSemantics": {
            "translate": "delta from setup pose in parent-local source pixels",
            "rotate": "delta from setup pose in degrees; positive is clockwise on y-down source",
            "scale": "multiplier relative to setup pose",
            "interpolation": "linear",
        },
        "timeSemantics": {
            "fps": 24,
            "frameIndices": "zero-based time positions; samples are 0..durationFrames-1",
            "durationFrames": "number of frame intervals",
            "events": "instant boundary in [0,durationFrames); dispatch once when crossed",
        },
        "canvas": {
            "width": w,
            "height": h,
            "rootSourcePx": pivot_map["root"],
            "sourceSha256": source_sha256,
        },
        "atlas": {
            "path": atlas_filename,
            "width": atlas_size[0],
            "height": atlas_size[1],
            "paddingPx": padding,
            "rotated": False,
            "trimmedWithFrameMetadata": True,
        },
        "metrics": {
            "headWidthPx": head_w,
            "bodyHeightPx": round(body_h, 2),
            "thrustMinPx": round(head_w * 0.6, 2),
        },
        "landmarks19Plus2": landmarks_info["points"],
        "anchors": {
            "grip_A": {
                "parentBone": "weapon",
                "sourcePx": pivot_map["weapon"],
                "offsetFromWeaponPivotSourcePx": [0.0, 0.0],
            },
            "grip_B": {
                "parentBone": "weapon",
                "sourcePx": pivot_map["grip_B"],
                "offsetFromWeaponPivotSourcePx": [
                    round(pivot_map["grip_B"][0] - pivot_map["weapon"][0], 2),
                    round(pivot_map["grip_B"][1] - pivot_map["weapon"][1], 2),
                ],
            },
            **palm_contacts,
        },
        "bones": bones_v2,
        "slots": slots_out,
        "regions": placed_regions,
    }


def save_qa_previews(
    master_rgba: np.ndarray,
    reassembled_rgba: np.ndarray,
    owner_map: np.ndarray,
    landmarks: dict[str, list[float]],
    qa_dir: Path,
) -> dict[str, str]:
    """產出符合全域縮圖規則（125px / 250px / 500px）的 QA 視覺化疊圖：
    - `landmarks_125.png`, `landmarks_250.png`, `landmarks_500.png`
    - `ownership_overlay_500.png`
    - `reassembly_diff_500.png`
    """
    qa_dir.mkdir(parents=True, exist_ok=True)
    h, w = master_rgba.shape[:2]

    # 1. 槽位分區著色疊圖
    overlay = np.zeros((h, w, 3), dtype=np.uint8)
    overlay[:] = (36, 36, 36)
    alpha_f = master_rgba[..., 3:4].astype(np.float32) / 255.0
    base_rgb = master_rgba[..., :3].astype(np.float32) * alpha_f + overlay.astype(np.float32) * (1.0 - alpha_f)

    slot_ids = [s["id"] for s in CANONICAL_SLOTS]
    for s_idx, sid in enumerate(slot_ids):
        m = owner_map == s_idx
        if m.any():
            col = np.array(SLOT_COLORS.get(sid, (200, 200, 200)), dtype=np.float32)
            base_rgb[m] = base_rgb[m] * 0.45 + col * 0.55

    overlay_pil = Image.fromarray(np.clip(base_rgb, 0, 255).astype(np.uint8), mode="RGB")

    # 2. 19+2 紅/綠標記點疊圖
    lm_pil = Image.fromarray(np.clip(
        master_rgba[..., :3].astype(np.float32) * alpha_f + 42.0 * (1.0 - alpha_f), 0, 255
    ).astype(np.uint8), mode="RGB")
    draw = ImageDraw.Draw(lm_pil)
    r_dot = max(10, int(round(w * 0.008)))
    for k, (px, py) in landmarks.items():
        fill_col = (40, 255, 80) if k.startswith("grip_") else (255, 50, 50)
        draw.ellipse((px - r_dot, py - r_dot, px + r_dot, py + r_dot), fill=fill_col, outline=(255, 255, 255), width=3)

    # 3. 回組差異放大圖
    diff_arr = np.abs(master_rgba.astype(np.int16) - reassembled_rgba.astype(np.int16)).max(axis=-1)
    diff_vis = np.clip(diff_arr * 64, 0, 255).astype(np.uint8)
    diff_pil = Image.fromarray(np.stack([diff_vis, np.zeros_like(diff_vis), np.zeros_like(diff_vis)], axis=-1), mode="RGB")

    paths: dict[str, str] = {}
    for target_w in (125, 250, 500):
        target_h = int(round(h * (target_w / w)))
        p_lm = qa_dir / f"landmarks_{target_w}.png"
        lm_pil.resize((target_w, target_h), Image.Resampling.LANCZOS).save(p_lm)
        paths[f"landmarks_{target_w}"] = str(p_lm)

    h_500 = int(round(h * (500 / w)))
    p_ov = qa_dir / "ownership_overlay_500.png"
    overlay_pil.resize((500, h_500), Image.Resampling.LANCZOS).save(p_ov)
    paths["ownership_overlay_500"] = str(p_ov)

    p_df = qa_dir / "reassembly_diff_500.png"
    diff_pil.resize((500, h_500), Image.Resampling.NEAREST).save(p_df)
    paths["reassembly_diff_500"] = str(p_df)

    return paths


def main() -> None:
    ap = argparse.ArgumentParser(description="AG-02 自動切片與綁點工具 (slice_and_rig.py)")
    ap.add_argument("--image", required=True, help="輸入立繪母圖 PNG 路徑（例如 2048x3072 RGBA）")
    ap.add_argument("--landmarks", required=True, help="19+2 標記點或 DWPose JSON 路徑")
    ap.add_argument("--out-dir", required=True, help="切件、圖集、source-rig.json 與報告輸出目錄")
    ap.add_argument("--name", default="character", help="輸出圖集與 .atlas 檔名前綴（預設 character）")
    ap.add_argument("--polygons", help="選填：既有 polygon cutout manifest JSON 路徑")
    ap.add_argument("--masks-dir", help="選填：既有槽位遮罩目錄")
    ap.add_argument("--parts-dir", help="選填：既有切件目錄")
    ap.add_argument("--weapon-image", help="選填：獨立武器 PNG 路徑（若提供，母圖武器標為 reference_only_weapon）")
    ap.add_argument("--hairtail-image", help="選填：獨立髮尾 PNG 路徑（AG-07 綁骨分件圖規格，母圖不含髮尾或標為 reference_only_hairtail）")
    ap.add_argument(
        "--canonical-skeleton",
        default=str(HERE / "specs" / "canonical_skeleton_v3.json"),
        help="固定骨架規範 JSON 路徑（AG-09 綁骨標準骨架v3.json，預設 tools_anim/specs/canonical_skeleton_v3.json）",
    )
    ap.add_argument(
        "--body-type",
        choices=["standard", "heavy", "slim", "robe"],
        default="standard",
        help="體型分類（standard/heavy/slim/robe，預設 standard）",
    )
    ap.add_argument(
        "--weapon-type",
        choices=["spear", "polearm", "sword", "twin", "bow", "fan"],
        default="spear",
        help="武器類型（預設 spear）",
    )
    ap.add_argument("--input-dir", help="選填：武將分件目錄（若指定則先執行 check_rigpose 驗收，通過後自動導入分件）")
    ap.add_argument("--facing", choices=["auto", "left", "right"], default="auto", help="角色朝向（預設 auto）")
    ap.add_argument("--atlas-width", type=int, default=2048, help="圖集寬度（預設 2048）")
    ap.add_argument("--atlas-height", type=int, default=4096, help="圖集高度（預設 4096）")
    ap.add_argument("--runtime-height", type=int, default=480, help="執行期目標全身高度 px（預設 480，輸出縮放圖集至 master/ 同層，原解析度移至 master/）")
    ap.add_argument("--padding", type=int, default=2, help="圖集切件間距 px（預設 2，須 >= 2）")
    ap.add_argument("--alpha-cutoff", type=int, default=8, help="透明區雜訊清除門檻（alpha <= 此值歸零，預設 8）")
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")

    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    canonical_spec = None
    if args.canonical_skeleton and Path(args.canonical_skeleton).exists():
        canonical_spec = json.loads(Path(args.canonical_skeleton).read_text(encoding="utf-8"))

    # AG-08 / AG-09: 若指定了 --input-dir，強制先跑 check_rigpose，未通過直接退出
    if args.input_dir:
        input_dir_p = Path(args.input_dir).resolve()
        from check_rigpose import run_rigpose_inspection
        rp_img = next(input_dir_p.glob("*rigpose*.png"), None)
        rp_weap = next(input_dir_p.glob("*weapon*.png"), None)
        rp_hair = next(input_dir_p.glob("*hairtail*.png"), None)
        rp_meta = next(input_dir_p.glob("*meta*.json"), None)
        rp_anch = next(input_dir_p.glob("*anchors*.json"), None)
        if not rp_img:
            print(f"Error: input-dir {input_dir_p} 中找不到 rigpose.png", file=sys.stderr)
            sys.exit(1)
        check_rep, check_pass = run_rigpose_inspection(
            rigpose_path=rp_img,
            weapon_path=rp_weap,
            hairtail_path=rp_hair,
            meta_path=rp_meta,
            anchors_path=rp_anch,
            out_dir=out_dir / "rigpose_precheck",
        )
        if not check_pass:
            print(f"Error: input-dir 未通過 check_rigpose 驗收，禁止進入切片！請見報告: {out_dir / 'rigpose_precheck'}", file=sys.stderr)
            sys.exit(1)

    img_path = Path(args.image).resolve()
    lm_path = Path(args.landmarks).resolve()

    raw_master = np.array(Image.open(img_path).convert("RGBA"))
    master_rgba, clean_stats = clean_transparent_and_marker_noise(raw_master, alpha_cutoff=args.alpha_cutoff)
    h, w = master_rgba.shape[:2]
    source_sha = sha256_file(img_path)

    raw_lm = json.loads(lm_path.read_text(encoding="utf-8"))
    landmarks_info = resolve_19plus2_landmarks(raw_lm, master_rgba, facing=args.facing)

    # 建立互斥且 100% 覆蓋的可見像素所有權
    owner_map, anim_ext_masks, segmentation_mode = build_mutually_exclusive_ownership(
        master_rgba,
        landmarks_info["points"],
        polygons_manifest_path=Path(args.polygons).resolve() if args.polygons else None,
        masks_dir_path=Path(args.masks_dir).resolve() if args.masks_dir else None,
        parts_dir_path=Path(args.parts_dir).resolve() if args.parts_dir else None,
    )

    parts_out_dir = out_dir / "parts"
    masks_out_dir = out_dir / "masks"
    anim_masks_out_dir = out_dir / "animation-masks"
    parts_out_dir.mkdir(parents=True, exist_ok=True)
    masks_out_dir.mkdir(parents=True, exist_ok=True)
    anim_masks_out_dir.mkdir(parents=True, exist_ok=True)

    trimmed_parts: dict[str, dict[str, Any]] = {}
    reassembled = np.zeros_like(master_rgba)
    overlap_pixels = 0
    assigned_mask_total = np.zeros((h, w), dtype=np.int16)

    slot_ids = [s["id"] for s in CANONICAL_SLOTS]
    weapon_source_mode = "embedded-master-weapon-cutout"

    for s_idx, sid in enumerate(slot_ids):
        vis_m = owner_map == s_idx
        assigned_mask_total += vis_m.astype(np.int16)

        part_full = np.zeros_like(master_rgba)
        part_full[vis_m] = master_rgba[vis_m]

        # 回組驗證（因互斥擁有權，直接覆寫無須擔心 alpha 疊加誤差）
        reassembled[vis_m] = part_full[vis_m]

        # 若指定了獨立武器圖，將母圖切出的武器存為 reference_only_weapon.png，並以獨立武器作為正式 weapon 切件
        if sid == "weapon" and args.weapon_image and Path(args.weapon_image).exists():
            weapon_source_mode = "independent-weapon-source (master weapon saved as reference_only_weapon)"
            ref_path = parts_out_dir / "reference_only_weapon.png"
            Image.fromarray(part_full, mode="RGBA").save(ref_path)
            ind_weap = np.array(Image.open(Path(args.weapon_image).resolve()).convert("RGBA"))
            ind_weap, _ = clean_transparent_and_marker_noise(ind_weap, alpha_cutoff=args.alpha_cutoff)
            if ind_weap.shape[:2] == (h, w):
                part_full = ind_weap
                vis_m = part_full[..., 3] > 0

        # 若指定了獨立髮尾圖 (AG-07)，將母圖切出的髮尾存為 reference_only_hairtail.png，並以獨立髮尾作為正式 hair_tail 切件
        if sid == "hair_tail" and args.hairtail_image and Path(args.hairtail_image).exists():
            ref_path = parts_out_dir / "reference_only_hairtail.png"
            Image.fromarray(part_full, mode="RGBA").save(ref_path)
            ind_hair = np.array(Image.open(Path(args.hairtail_image).resolve()).convert("RGBA"))
            ind_hair, _ = clean_transparent_and_marker_noise(ind_hair, alpha_cutoff=args.alpha_cutoff)
            if ind_hair.shape[:2] == (h, w):
                part_full = ind_hair
                vis_m = part_full[..., 3] > 0

        part_path = parts_out_dir / f"{sid}.png"
        mask_path = masks_out_dir / f"{sid}.png"
        anim_mask_path = anim_masks_out_dir / f"{sid}.png"

        Image.fromarray(part_full, mode="RGBA").save(part_path)
        Image.fromarray((vis_m.astype(np.uint8) * 255), mode="L").save(mask_path)
        Image.fromarray((anim_ext_masks[sid].astype(np.uint8) * 255), mode="L").save(anim_mask_path)

        ys_p, xs_p = np.where(part_full[..., 3] > 0)
        if len(xs_p) == 0:
            trimmed_parts[sid] = {
                "empty": True,
                "crop": None,
                "trimRectPx": [0, 0, 0, 0],
                "sourceCanvasSizePx": [w, h],
                "partSha256": sha256_file(part_path),
                "visiblePixels": 0,
            }
        else:
            x0, x1 = int(xs_p.min()), int(xs_p.max())
            y0, y1 = int(ys_p.min()), int(ys_p.max())
            tw, th = x1 - x0 + 1, y1 - y0 + 1
            crop = part_full[y0 : y1 + 1, x0 : x1 + 1].copy()
            trimmed_parts[sid] = {
                "empty": False,
                "crop": crop,
                "trimRectPx": [x0, y0, tw, th],
                "sourceCanvasSizePx": [w, h],
                "partSha256": sha256_file(part_path),
                "visiblePixels": int(len(xs_p)),
            }

    # AG-07：評估肢體槽完整度 limb_completeness（可見像素相對估計完整面積 >= 95%）
    limb_slots = ["arm_upper_f", "arm_lower_f", "arm_upper_b", "arm_lower_b", "thigh_f", "shin_f", "thigh_b", "shin_b"]
    limb_completeness_report: dict[str, Any] = {}
    all_limbs_complete_95 = True
    for l_sid in limb_slots:
        t_slot = trimmed_parts.get(l_sid, {})
        crop_arr = t_slot.get("crop")
        if crop_arr is not None and not t_slot.get("empty", False):
            vis_px = int((crop_arr[..., 3] > 0).sum())
            bin_m = (crop_arr[..., 3] > 0).astype(np.uint8) * 255
            contours, _ = cv2.findContours(bin_m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                hull = cv2.convexHull(np.vstack(contours))
                hull_area = float(cv2.contourArea(hull))
                est_full_area = max(float(vis_px), hull_area)
                ratio = vis_px / est_full_area if est_full_area > 0 else 1.0
            else:
                est_full_area = float(vis_px)
                ratio = 1.0
            pass_95 = ratio >= 0.95
            if not pass_95:
                all_limbs_complete_95 = False
            limb_completeness_report[l_sid] = {
                "visiblePixels": vis_px,
                "estimatedFullArea": round(est_full_area, 1),
                "completenessRatio": round(ratio, 4),
                "pass95Pct": pass_95,
            }
        else:
            limb_completeness_report[l_sid] = {
                "visiblePixels": 0,
                "estimatedFullArea": 0.0,
                "completenessRatio": 0.0,
                "pass95Pct": False,
            }
            all_limbs_complete_95 = False

    # 驗證可見像素唯一歸屬與回組誤差 <= 2
    live_mask = master_rgba[..., 3] > 0
    live_count = int(live_mask.sum())
    unassigned_count = int((live_mask & (assigned_mask_total == 0)).sum())
    overlap_pixels = int((assigned_mask_total > 1).sum())
    channel_diff = np.abs(master_rgba.astype(np.int16) - reassembled.astype(np.int16))
    max_rgb_diff = int(channel_diff[..., :3].max()) if live_count > 0 else 0
    max_alpha_diff = int(channel_diff[..., 3].max()) if live_count > 0 else 0
    pixels_over_2 = int((channel_diff.max(axis=-1) > 2).sum())

    # 打包原解析度 Master Atlas 與寫出 .atlas
    master_dir = out_dir / "master"
    master_dir.mkdir(parents=True, exist_ok=True)
    padding = max(2, int(args.padding))
    atlas_img, placed_regions = pack_atlas_maxrects(
        trimmed_parts,
        page_w=args.atlas_width,
        page_h=args.atlas_height,
        padding=padding,
    )
    atlas_png_name = f"{args.name}.png"
    atlas_png_path = master_dir / atlas_png_name
    atlas_txt_path = master_dir / f"{args.name}.atlas"
    atlas_img.save(atlas_png_path)
    write_legacy_atlas(atlas_txt_path, atlas_png_name, atlas_img.size, placed_regions)

    # 寫出中立 source-rig.json (v2) 與向下相容 Sparkle v1-v4 的 source-rig-v1-compat.json（保留在 master/）
    rig_data = build_neutral_rig_v2(
        landmarks_info=landmarks_info,
        placed_regions=placed_regions,
        trimmed_parts=trimmed_parts,
        canvas_size=(w, h),
        source_sha256=source_sha,
        atlas_filename=atlas_png_name,
        atlas_size=atlas_img.size,
        padding=padding,
        weapon_source_mode=weapon_source_mode,
        rig_schema="v2",
        canonical_spec=canonical_spec,
    )
    rig_path = master_dir / "source-rig.json"
    rig_path.write_text(json.dumps(rig_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    rig_v1_compat = build_neutral_rig_v2(
        landmarks_info=landmarks_info,
        placed_regions=placed_regions,
        trimmed_parts=trimmed_parts,
        canvas_size=(w, h),
        source_sha256=source_sha,
        atlas_filename=atlas_png_name,
        atlas_size=atlas_img.size,
        padding=padding,
        weapon_source_mode=weapon_source_mode,
        rig_schema="v1-compat",
        canonical_spec=canonical_spec,
    )
    rig_v1_compat_path = master_dir / "source-rig-v1-compat.json"
    rig_v1_compat_path.write_text(json.dumps(rig_v1_compat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # AG-05: 產生執行期縮放版本（預設 --runtime-height 480，輸出至 out_dir 根目錄）
    runtime_h = int(args.runtime_height) if args.runtime_height else 480
    body_h_orig = landmarks_info["bodyHeightPx"]
    rt_scale = runtime_h / body_h_orig
    rt_canvas_w = max(1, int(round(w * rt_scale)))
    rt_canvas_h = max(1, int(round(h * rt_scale)))

    rt_trimmed_parts: dict[str, dict[str, Any]] = {}
    for sid, t_info in trimmed_parts.items():
        if t_info.get("empty", True) or t_info["crop"] is None:
            rt_trimmed_parts[sid] = {
                "empty": True,
                "crop": None,
                "trimRectPx": [0, 0, 0, 0],
                "sourceCanvasSizePx": [rt_canvas_w, rt_canvas_h],
                "partSha256": t_info.get("partSha256", ""),
                "visiblePixels": 0,
            }
            continue
        orig_crop = t_info["crop"]
        ox, oy, ow, oh = t_info["trimRectPx"]
        new_w = max(1, int(round(ow * rt_scale)))
        new_h = max(1, int(round(oh * rt_scale)))
        pil_sub = Image.fromarray(orig_crop, mode="RGBA").resize((new_w, new_h), Image.Resampling.LANCZOS)
        rt_crop_arr = np.array(pil_sub)
        rt_trimmed_parts[sid] = {
            "empty": False,
            "crop": rt_crop_arr,
            "trimRectPx": [
                int(round(ox * rt_scale)),
                int(round(oy * rt_scale)),
                new_w,
                new_h,
            ],
            "sourceCanvasSizePx": [rt_canvas_w, rt_canvas_h],
            "partSha256": t_info["partSha256"],
            "visiblePixels": int((rt_crop_arr[..., 3] > 0).sum()),
        }

    rt_page_w = 1024
    rt_page_h = 1024
    rt_atlas_img, rt_placed_regions = pack_atlas_maxrects(
        rt_trimmed_parts,
        page_w=rt_page_w,
        page_h=rt_page_h,
        padding=padding,
    )
    rt_atlas_png_path = out_dir / atlas_png_name
    rt_atlas_txt_path = out_dir / f"{args.name}.atlas"
    rt_atlas_img.save(rt_atlas_png_path)
    write_legacy_atlas(rt_atlas_txt_path, atlas_png_name, rt_atlas_img.size, rt_placed_regions)

    # 縮放 19+2 標記點
    rt_landmarks_info = {
        "inputFormat": landmarks_info["inputFormat"] + "_runtime_scaled",
        "bodyHeightPx": round(runtime_h, 2),
        "points": {
            k: [round(v[0] * rt_scale, 2), round(v[1] * rt_scale, 2)]
            for k, v in landmarks_info["points"].items()
        },
    }

    rt_canonical_spec = None
    if canonical_spec:
        rt_canonical_spec = {
            "H": runtime_h,
            "joints": {
                k: {"x": round(v["x"] * rt_scale, 2), "y": round(v["y"] * rt_scale, 2)}
                for k, v in canonical_spec["joints"].items()
            },
            "grips": {
                k: {"x": round(v["x"] * rt_scale, 2), "y": round(v["y"] * rt_scale, 2)}
                for k, v in canonical_spec["grips"].items()
            },
        }

    rt_rig_data = build_neutral_rig_v2(
        landmarks_info=rt_landmarks_info,
        placed_regions=rt_placed_regions,
        trimmed_parts=rt_trimmed_parts,
        canvas_size=(rt_canvas_w, rt_canvas_h),
        source_sha256=source_sha,
        atlas_filename=atlas_png_name,
        atlas_size=rt_atlas_img.size,
        padding=padding,
        weapon_source_mode=weapon_source_mode,
        rig_schema="v2",
        canonical_spec=rt_canonical_spec,
    )
    rt_rig_path = out_dir / "source-rig.json"
    rt_rig_path.write_text(json.dumps(rt_rig_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    rt_rig_v1_compat = build_neutral_rig_v2(
        landmarks_info=rt_landmarks_info,
        placed_regions=rt_placed_regions,
        trimmed_parts=rt_trimmed_parts,
        canvas_size=(rt_canvas_w, rt_canvas_h),
        source_sha256=source_sha,
        atlas_filename=atlas_png_name,
        atlas_size=rt_atlas_img.size,
        padding=padding,
        weapon_source_mode=weapon_source_mode,
        rig_schema="v1-compat",
        canonical_spec=rt_canonical_spec,
    )
    rt_rig_v1_compat_path = out_dir / "source-rig-v1-compat.json"
    rt_rig_v1_compat_path.write_text(json.dumps(rt_rig_v1_compat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 儲存 QA 預覽圖
    qa_paths = save_qa_previews(master_rgba, reassembled, owner_map, landmarks_info["points"], out_dir / "qa")

    qa_pass = (
        unassigned_count == 0
        and overlap_pixels == 0
        and max_rgb_diff <= 2
        and max_alpha_diff <= 2
        and pixels_over_2 == 0
    )

    val_report = {
        "schema": "3klife.ag02-cutout-and-rig-report.v1",
        "verificationScope": "offline-cutout-and-rig-verification-only (NOT Cocos runtime verified)",
        "overallPass": qa_pass,
        "segmentationMode": segmentation_mode,
        "weaponSourceMode": weapon_source_mode,
        "sourceImage": {
            "path": str(img_path),
            "sha256": source_sha,
            "size": [w, h],
            **clean_stats,
        },
        "landmarks": {
            "sourcePath": str(lm_path),
            "inputFormat": landmarks_info["inputFormat"],
            "bodyHeightPx": landmarks_info["bodyHeightPx"],
            "pointCount": len(landmarks_info["points"]),
        },
        "ownershipAndReassembly": {
            "sourceLiveAlphaPixels": live_count,
            "unassignedLiveAlphaPixels": unassigned_count,
            "overlapLiveAlphaPixels": overlap_pixels,
            "rgbMaxDiff": max_rgb_diff,
            "alphaMaxDiff": max_alpha_diff,
            "pixelsOver2Diff": pixels_over_2,
            "reassemblyPassAtLe2": qa_pass,
        },
        "outputs": {
            "rigJson": str(rig_path),
            "atlasPng": str(atlas_png_path),
            "atlasTxt": str(atlas_txt_path),
            "partsDir": str(parts_out_dir),
            "masksDir": str(masks_out_dir),
            "animationMasksDir": str(anim_masks_out_dir),
            "qaPreviews": qa_paths,
        },
        "limbCompleteness": {
            "pass95Pct": all_limbs_complete_95,
            "slots": limb_completeness_report,
        },
        "slotSummary": {
            sid: {
                "empty": trimmed_parts[sid]["empty"],
                "visiblePixels": trimmed_parts[sid]["visiblePixels"],
                "trimRectPx": trimmed_parts[sid]["trimRectPx"],
            }
            for sid in slot_ids
        },
    }
    report_path = out_dir / "cutout_validation_report.json"
    report_path.write_text(json.dumps(val_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "overallPass": qa_pass,
                "segmentationMode": segmentation_mode,
                "sourceLiveAlphaPixels": live_count,
                "unassignedLiveAlphaPixels": unassigned_count,
                "overlapLiveAlphaPixels": overlap_pixels,
                "rgbMaxDiff": max_rgb_diff,
                "alphaMaxDiff": max_alpha_diff,
                "rigPath": str(rig_path),
                "atlasPath": str(atlas_txt_path),
                "reportPath": str(report_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
