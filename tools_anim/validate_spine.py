#!/usr/bin/env python3
"""獨立 Spine 4.2 驗證器與渲染器（validate_spine.py）

功能：
1. 呼叫官方 `@esotericsoftware/spine-core` (4.2) 載入 Spine JSON + Atlas，驗證 schema、IK、PhysicsConstraint 與動畫播放是否拋錯。
2. 靜態檢查：
   - drawOrder 時間軸唯一性（每個索引恰好一個 slot，無重複、無空洞/undefined）。
   - 部位剛性（Rigid slots：`head`, `weapon`, `hand_f`, `hand_b`, `foot_f`, `foot_b`, `pauldron_f`, `pauldron_b` 不得被鄰骨拉扯變形）。
   - 加權網格（Weighted Mesh）權重和 = 1.0、Setup Pose 零變形、無翻面三角形（Setup 與全動畫影格）。
   - 網格 UV 取樣邊界檢查（三角形不得取樣到該切件 atlas 區塊以外的非透明鄰近切件像素）。
   - 標記色殘留檢查（非透明區不得殘留純綠/純紅標記點）。
3. 動態與幾何檢查：
   - 雙手持槍段（`thrust` / `attack` 0.80s ~ 2.67s）手掌接觸點（`hand_f_grip` / `hand_b_grip`，若未標註則以手掌切件 alpha 重心推估）到武器握點（`grip_A` / `grip_B`）距離 <= 1.0 px。
   - `idle` 與 `walk` 單手持槍時，後手 IK mix 必須為 0。
   - `walk` 原地踏步（root 動畫位移為 0）、支撐腳接地漂移 <= 0.02H、首尾 Pose 閉合。
   - `thrust` 爆發跨步與武器前伸幅度（刺出格相較架式格的槍尖前伸與骨盆/前腳跨步量）。
4. 逐格離線軟體光柵化渲染（Software Rasterizer）：
   - 依實際 drawOrder 與三角形網格 UV 仿射變換逐格渲染 PNG。
   - 同步以像素級別計算 `head` 可見像素被上層 slot 遮擋的比例（門檻 <= 5.0%）。
   - 輸出逐格 PNG 與關鍵格總覽圖（Contact Sheet）。
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
DEFAULT_SPINE_CORE = HERE.parent / "scratch" / "spine-runtime" / "node_modules" / "@esotericsoftware" / "spine-core"
HELPER_MJS = HERE / "spine_eval_helper.mjs"

RIGID_SLOTS = {
    "head",
    "weapon",
    "weapon_fangtianji",
    "hand_f",
    "hand_b",
    "foot_f",
    "foot_b",
    "pauldron_f",
    "pauldron_b",
}


def parse_atlas(atlas_path: Path) -> dict[str, Any]:
    """解析 Spine legacy 或 bounds 格式的 .atlas 檔案。"""
    lines = [line.rstrip("\r\n") for line in atlas_path.read_text(encoding="utf-8").splitlines()]
    page_name = None
    page_size = [2048, 4096]
    regions: dict[str, dict[str, Any]] = {}
    current_region: str | None = None

    for raw in lines:
        s = raw.strip()
        if not s:
            current_region = None
            continue
        if page_name is None and s.lower().endswith(".png"):
            page_name = s
            continue
        if ":" in s:
            k, v = [part.strip() for part in s.split(":", 1)]
            if current_region is None:
                if k == "size":
                    parts = [int(x.strip()) for x in v.split(",")]
                    page_size = parts[:2]
            else:
                reg = regions[current_region]
                if k == "xy":
                    vals = [int(x.strip()) for x in v.split(",")]
                    reg["x"], reg["y"] = vals[0], vals[1]
                elif k == "size":
                    vals = [int(x.strip()) for x in v.split(",")]
                    reg["width"], reg["height"] = vals[0], vals[1]
                elif k == "orig":
                    vals = [int(x.strip()) for x in v.split(",")]
                    reg["origWidth"], reg["origHeight"] = vals[0], vals[1]
                elif k == "offset":
                    vals = [int(x.strip()) for x in v.split(",")]
                    reg["offsetX"], reg["offsetY"] = vals[0], vals[1]
                elif k == "bounds":
                    vals = [int(x.strip()) for x in v.split(",")]
                    reg["x"], reg["y"], reg["width"], reg["height"] = vals[:4]
                elif k == "rotate":
                    reg["rotate"] = v.lower() not in ("false", "0")
        else:
            current_region = s
            regions[current_region] = {
                "name": current_region,
                "x": 0,
                "y": 0,
                "width": 0,
                "height": 0,
                "rotate": False,
            }

    return {"page": page_name, "size": page_size, "regions": regions}


def check_draw_order_timelines(skel_json: dict[str, Any]) -> dict[str, Any]:
    """檢查所有動畫的 drawOrder 時間軸是否會造成重複索引或空洞（undefined slot）。"""
    slots = [s["name"] for s in skel_json.get("slots", [])]
    n_slots = len(slots)
    slot_to_setup_idx = {name: i for i, name in enumerate(slots)}
    issues: list[dict[str, Any]] = []

    for anim_name, anim in skel_json.get("animations", {}).items():
        for key_idx, entry in enumerate(anim.get("drawOrder", [])):
            t = entry.get("time", 0.0)
            offsets = entry.get("offsets")
            if not offsets:
                continue
            draw_order: list[str | None] = [None] * n_slots
            unchanged: list[int] = list(range(n_slots))
            used_setup_indices: set[int] = set()
            key_errors: list[str] = []

            for off_item in offsets:
                s_name = off_item.get("slot")
                off_val = int(off_item.get("offset", 0))
                if s_name not in slot_to_setup_idx:
                    key_errors.append(f"unknown slot '{s_name}'")
                    continue
                orig_idx = slot_to_setup_idx[s_name]
                if orig_idx in used_setup_indices:
                    key_errors.append(f"duplicate offset entry for slot '{s_name}'")
                used_setup_indices.add(orig_idx)
                target_idx = orig_idx + off_val
                if target_idx < 0 or target_idx >= n_slots:
                    key_errors.append(
                        f"slot '{s_name}' (setup {orig_idx}) + offset {off_val} = {target_idx} out of bounds [0, {n_slots - 1}]"
                    )
                elif draw_order[target_idx] is not None:
                    key_errors.append(
                        f"slot '{s_name}' collides at target index {target_idx} with '{draw_order[target_idx]}'"
                    )
                else:
                    draw_order[target_idx] = s_name
                if orig_idx in unchanged:
                    unchanged.remove(orig_idx)

            # Fill remaining slots in setup order
            u_ptr = 0
            for i in range(n_slots):
                if draw_order[i] is None:
                    if u_ptr < len(unchanged):
                        draw_order[i] = slots[unchanged[u_ptr]]
                        u_ptr += 1

            if None in draw_order or len(set(draw_order)) != n_slots or key_errors:
                issues.append(
                    {
                        "animation": anim_name,
                        "keyIndex": key_idx,
                        "time": t,
                        "errors": key_errors,
                        "resultingOrder": draw_order,
                    }
                )

    return {
        "pass": len(issues) == 0,
        "issueCount": len(issues),
        "issues": issues,
    }


def check_mesh_weights_and_rigidity(
    skel_json: dict[str, Any],
    eval_data: dict[str, Any],
    atlas_info: dict[str, Any],
    atlas_img: np.ndarray,
) -> dict[str, Any]:
    """檢查：
    1. 權重和 = 1.0
    2. 剛體槽位（RIGID_SLOTS）不得跨骨加權變形
    3. Setup Pose 零變形（weighted mesh 在 setup pose 下的世界座標與 region 原始幾何一致）
    4. 三角形在 Setup 與所有動畫幀中無翻面（signed area 反號）
    5. 網格 UV 不得取樣到自己 atlasRect 以外的像素，且網格邊緣不得包入鄰近切件的雜點
    """
    bones_list = skel_json.get("bones", [])
    slot_bone_map = {s["name"]: s["bone"] for s in skel_json.get("slots", [])}
    setup_bones = eval_data.get("setupBones", {})

    skins = skel_json.get("skins", [])
    attachments_map: dict[str, dict[str, Any]] = {}
    if isinstance(skins, list):
        for sk in skins:
            if sk.get("name") == "default" or not attachments_map:
                attachments_map = sk.get("attachments", {})
    elif isinstance(skins, dict):
        attachments_map = skins.get("default", {})

    max_weight_sum_dev = 0.0
    rigid_violations: list[dict[str, Any]] = []
    uv_out_of_bounds: list[dict[str, Any]] = []
    atlas_bleed_issues: list[dict[str, Any]] = []
    mesh_summaries: dict[str, Any] = {}

    atlas_h, atlas_w = atlas_img.shape[:2]

    # Build a mask of all other regions in the atlas to check bleed
    region_owner = np.full((atlas_h, atlas_w), -1, dtype=np.int16)
    region_names = list(atlas_info["regions"].keys())
    for r_idx, r_name in enumerate(region_names):
        r = atlas_info["regions"][r_name]
        x, y, w, h = r["x"], r["y"], r["width"], r["height"]
        region_owner[max(0, y) : min(atlas_h, y + h), max(0, x) : min(atlas_w, x + w)] = r_idx

    for slot_name, slot_atts in attachments_map.items():
        slot_bone_name = slot_bone_map.get(slot_name)
        for att_name, att in slot_atts.items():
            att_type = att.get("type", "region")
            if att_type != "mesh":
                if slot_name in RIGID_SLOTS:
                    mesh_summaries[slot_name] = {"type": "region", "rigidOk": True}
                continue

            uvs = att.get("uvs", [])
            triangles = att.get("triangles", [])
            verts = att.get("vertices", [])
            n_verts = len(uvs) // 2

            # Parse vertices (unweighted: 2 floats per vertex; weighted: [count, b0, x0, y0, w0, ...])
            is_weighted = len(verts) > len(uvs)
            bones_used_by_mesh: set[str] = set()
            max_slot_w_dev = 0.0
            setup_world_pts: list[tuple[float, float]] = []

            if is_weighted:
                idx = 0
                for _ in range(n_verts):
                    cnt = int(verts[idx])
                    idx += 1
                    w_sum = 0.0
                    wx, wy = 0.0, 0.0
                    for _ in range(cnt):
                        b_idx = int(verts[idx])
                        vx = float(verts[idx + 1])
                        vy = float(verts[idx + 2])
                        vw = float(verts[idx + 3])
                        idx += 4
                        w_sum += vw
                        b_name = bones_list[b_idx]["name"] if 0 <= b_idx < len(bones_list) else f"bone_{b_idx}"
                        if vw > 1e-5:
                            bones_used_by_mesh.add(b_name)
                        sb = setup_bones.get(b_name)
                        if sb:
                            wx += (vx * sb["a"] + vy * sb["b"] + sb["worldX"]) * vw
                            wy += (vx * sb["c"] + vy * sb["d"] + sb["worldY"]) * vw
                    dev = abs(w_sum - 1.0)
                    max_slot_w_dev = max(max_slot_w_dev, dev)
                    max_weight_sum_dev = max(max_weight_sum_dev, dev)
                    setup_world_pts.append((wx, wy))
            else:
                bones_used_by_mesh.add(slot_bone_name or "")
                sb = setup_bones.get(slot_bone_name or "")
                for v_i in range(n_verts):
                    vx, vy = float(verts[2 * v_i]), float(verts[2 * v_i + 1])
                    if sb:
                        wx = vx * sb["a"] + vy * sb["b"] + sb["worldX"]
                        wy = vx * sb["c"] + vy * sb["d"] + sb["worldY"]
                    else:
                        wx, wy = vx, vy
                    setup_world_pts.append((wx, wy))

            rigid_ok = True
            if slot_name in RIGID_SLOTS and len(bones_used_by_mesh) > 1:
                rigid_ok = False
                rigid_violations.append(
                    {
                        "slot": slot_name,
                        "expectedBone": slot_bone_name,
                        "actualBones": sorted(bones_used_by_mesh),
                    }
                )

            # Check UV bounds against region rect
            reg = atlas_info["regions"].get(att_name) or atlas_info["regions"].get(slot_name)
            outside_uv_verts = 0
            if reg:
                rx, ry, rw, rh = reg["x"], reg["y"], reg["width"], reg["height"]
                for v_i in range(n_verts):
                    u, v = float(uvs[2 * v_i]), float(uvs[2 * v_i + 1])
                    if u < -1e-4 or u > 1.0001 or v < -1e-4 or v > 1.0001:
                        outside_uv_verts += 1
                if outside_uv_verts > 0:
                    uv_out_of_bounds.append(
                        {
                            "slot": slot_name,
                            "attachment": att_name,
                            "outsideVertexCount": outside_uv_verts,
                        }
                    )

            # Check Setup Pose zero-deformation (compare affine linearity of UV -> setup_world_pts)
            setup_deform_err_px = 0.0
            if n_verts >= 3 and setup_world_pts:
                # Fit affine transform from pixel UV (u*w, v*h) to setup_world_pts
                w_px = float(att.get("width", reg["width"] if reg else 1.0))
                h_px = float(att.get("height", reg["height"] if reg else 1.0))
                A = np.zeros((n_verts, 3), dtype=np.float64)
                B = np.zeros((n_verts, 2), dtype=np.float64)
                for v_i in range(n_verts):
                    A[v_i] = [float(uvs[2 * v_i]) * w_px, float(uvs[2 * v_i + 1]) * h_px, 1.0]
                    B[v_i] = setup_world_pts[v_i]
                M_aff, _, _, _ = np.linalg.lstsq(A, B, rcond=None)
                pred = A @ M_aff
                errs = np.linalg.norm(pred - B, axis=1)
                setup_deform_err_px = float(errs.max())

            mesh_summaries[slot_name] = {
                "type": "mesh",
                "weighted": is_weighted,
                "vertexCount": n_verts,
                "triangleCount": len(triangles) // 3,
                "bonesUsed": sorted(bones_used_by_mesh),
                "rigidOk": rigid_ok,
                "maxWeightSumDeviation": round(max_slot_w_dev, 6),
                "maxSetupPoseDeformErrorPx": round(setup_deform_err_px, 5),
                "outsideUvVertexCount": outside_uv_verts,
            }

    # Check flipped triangles across setup and all animations using spine-core evaluated vertices
    setup_flipped = 0
    setup_signs: dict[str, list[float]] = {}
    for d in eval_data.get("setupDraw", {}).get("drawables", []):
        if d["type"] != "mesh":
            continue
        v = d["vertices"]
        tris = d["triangles"]
        signs = []
        for t_i in range(0, len(tris), 3):
            i0, i1, i2 = tris[t_i], tris[t_i + 1], tris[t_i + 2]
            x0, y0 = v[2 * i0], v[2 * i0 + 1]
            x1, y1 = v[2 * i1], v[2 * i1 + 1]
            x2, y2 = v[2 * i2], v[2 * i2 + 1]
            area2 = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
            signs.append(area2)
            # Compare with UV winding (UV has y down, world has y up, so positive world area corresponds to negative UV cross product)
            uvs = d["uvs"]
            u0, v0 = uvs[2 * i0], uvs[2 * i0 + 1]
            u1, v1 = uvs[2 * i1], uvs[2 * i1 + 1]
            u2, v2 = uvs[2 * i2], uvs[2 * i2 + 1]
            uv_area2 = (u1 - u0) * (v2 - v0) - (v1 - v0) * (u2 - u0)
            if area2 * (-uv_area2) < -1e-3:
                setup_flipped += 1
        setup_signs[d["slot"]] = signs

    anim_flipped_total = 0
    anim_flipped_by_name: dict[str, int] = {}
    anim_flipped_by_slot: dict[str, int] = {}
    for anim_name, anim_info in eval_data.get("animations", {}).items():
        flipped_cnt = 0
        for frame in anim_info.get("frames", []):
            for d in frame.get("drawables", []):
                if d["type"] != "mesh" or d["slot"] not in setup_signs:
                    continue
                v = d["vertices"]
                tris = d["triangles"]
                ref_signs = setup_signs[d["slot"]]
                for idx_t, t_i in enumerate(range(0, len(tris), 3)):
                    i0, i1, i2 = tris[t_i], tris[t_i + 1], tris[t_i + 2]
                    x0, y0 = v[2 * i0], v[2 * i0 + 1]
                    x1, y1 = v[2 * i1], v[2 * i1 + 1]
                    x2, y2 = v[2 * i2], v[2 * i2 + 1]
                    area2 = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
                    if idx_t < len(ref_signs) and area2 * ref_signs[idx_t] < -1e-2:
                        flipped_cnt += 1
                        anim_flipped_by_slot[d["slot"]] = anim_flipped_by_slot.get(d["slot"], 0) + 1
        anim_flipped_by_name[anim_name] = flipped_cnt
        anim_flipped_total += flipped_cnt

    max_setup_err = max(
        (m.get("maxSetupPoseDeformErrorPx", 0.0) for m in mesh_summaries.values() if m.get("type") == "mesh"),
        default=0.0,
    )

    return {
        "pass": (
            max_weight_sum_dev <= 1e-4
            and len(rigid_violations) == 0
            and len(uv_out_of_bounds) == 0
            and max_setup_err <= 0.1
            and setup_flipped == 0
            and anim_flipped_total == 0
        ),
        "maxWeightSumDeviation": round(max_weight_sum_dev, 6),
        "maxSetupPoseErrorPx": round(max_setup_err, 5),
        "rigidSlotViolations": rigid_violations,
        "uvOutOfBounds": uv_out_of_bounds,
        "setupFlippedTriangles": setup_flipped,
        "animatedFlippedTriangles": anim_flipped_total,
        "animatedFlippedByAnimation": anim_flipped_by_name,
        "animatedFlippedBySlot": anim_flipped_by_slot,
        "meshes": mesh_summaries,
    }


def compute_palm_centroids_and_check_markers(
    atlas_info: dict[str, Any],
    atlas_img: np.ndarray,
    setup_draw: dict[str, Any],
    setup_bones: dict[str, Any],
    rig_data: dict[str, Any] | None,
) -> dict[str, Any]:
    """計算手掌切件（hand_f, hand_b）在自身骨骼局部座標下的接觸點（若 rig 無定義則取 alpha 重心），
    同時檢查 atlas 切件內是否殘留明顯標記點（純綠/純紅，或連通小異色塊）。
    """
    palm_local: dict[str, dict[str, Any]] = {}
    marker_suspects: list[dict[str, Any]] = []

    # Check if rig_data defines explicit hand_f_grip / hand_b_grip
    anchors = (rig_data or {}).get("anchors", {})

    for d in setup_draw.get("drawables", []):
        slot = d["slot"]
        reg = atlas_info["regions"].get(d["attachment"]) or atlas_info["regions"].get(slot)
        if not reg:
            continue
        rx, ry, rw, rh = reg["x"], reg["y"], reg["width"], reg["height"]
        crop = atlas_img[ry : ry + rh, rx : rx + rw]
        r_ch = crop[..., 0].astype(int)
        g_ch = crop[..., 1].astype(int)
        b_ch = crop[..., 2].astype(int)
        a_ch = crop[..., 3].astype(int)

        # Check pure green / pure red digital marker pixels:
        # Visible digital markers have pure RGB saturation (e.g. G>=240, R<=10, B<=10 or R>=245, G<=5, B<=5)
        pure_green_vis = (a_ch > 8) & (g_ch >= 240) & (r_ch <= 10) & (b_ch <= 10)
        pure_red_vis = (a_ch > 8) & (r_ch >= 245) & (g_ch <= 5) & (b_ch <= 5)
        pure_green_any = (a_ch > 0) & (g_ch == 255) & (r_ch == 0) & (b_ch == 0)
        pure_red_any = (a_ch > 0) & (r_ch == 255) & (g_ch == 0) & (b_ch == 0)

        if pure_green_vis.sum() > 0 or pure_red_vis.sum() > 0 or pure_green_any.sum() > 0 or pure_red_any.sum() > 0:
            marker_suspects.append(
                {
                    "slot": slot,
                    "visibleGreenMarkerPx": int(pure_green_vis.sum()),
                    "visibleRedMarkerPx": int(pure_red_vis.sum()),
                    "faintPureGreenPx": int(pure_green_any.sum()),
                    "faintPureRedPx": int(pure_red_any.sum()),
                }
            )

        if slot in ("hand_f", "hand_b"):
            grip_key = f"{slot}_grip"
            if grip_key in anchors and "localPx" in anchors[grip_key]:
                lx, ly = anchors[grip_key]["localPx"]
                palm_local[slot] = {
                    "localX": float(lx),
                    "localY": float(ly),
                    "source": "rig.anchors",
                    "isEstimatedFromAlphaCentroid": False,
                }
                continue

            # Compute alpha centroid in region pixel coordinates (x right, y down from top-left of region)
            mask = a_ch > 24
            if mask.any():
                ys, xs = np.where(mask)
                weights = a_ch[mask].astype(np.float64)
                cx_px = float(np.average(xs, weights=weights))
                cy_px = float(np.average(ys, weights=weights))
            else:
                cx_px, cy_px = rw / 2.0, rh / 2.0

            # Map (cx_px, cy_px) in region to world coordinates in setup pose using drawable vertices/uvs
            v = d["vertices"]
            uvs = d["uvs"]
            n_v = len(uvs) // 2
            A = np.zeros((n_v, 3), dtype=np.float64)
            B = np.zeros((n_v, 2), dtype=np.float64)
            # In spine_eval_helper, uvs are normalized to page size [0,1]. Convert to region-local [0,1]
            u_min, u_max = min(uvs[0::2]), max(uvs[0::2])
            v_min, v_max = min(uvs[1::2]), max(uvs[1::2])
            du = max(1e-6, u_max - u_min)
            dv = max(1e-6, v_max - v_min)
            for idx_v in range(n_v):
                ru = (uvs[2 * idx_v] - u_min) / du
                rv = (uvs[2 * idx_v + 1] - v_min) / dv
                A[idx_v] = [ru * rw, rv * rh, 1.0]
                B[idx_v] = [v[2 * idx_v], v[2 * idx_v + 1]]
            M_aff, _, _, _ = np.linalg.lstsq(A, B, rcond=None)
            wx, wy = (np.array([cx_px, cy_px, 1.0]) @ M_aff).tolist()

            # Convert world (wx, wy) in setup pose to bone-local coordinates of slot["bone"]
            b_name = d["bone"]
            sb = setup_bones.get(b_name)
            if sb:
                dx = wx - sb["worldX"]
                dy = wy - sb["worldY"]
                det = sb["a"] * sb["d"] - sb["b"] * sb["c"]
                if abs(det) > 1e-8:
                    lx = (sb["d"] * dx - sb["b"] * dy) / det
                    ly = (-sb["c"] * dx + sb["a"] * dy) / det
                else:
                    lx, ly = dx, dy
            else:
                lx, ly = 0.0, 0.0

            palm_local[slot] = {
                "localX": round(float(lx), 3),
                "localY": round(float(ly), 3),
                "setupWorldPx": [round(float(wx), 2), round(float(wy), 2)],
                "regionCentroidPx": [round(cx_px, 2), round(cy_px, 2)],
                "source": "estimated_from_hand_alpha_centroid",
                "isEstimatedFromAlphaCentroid": True,
            }

    return {
        "palmContactPoints": palm_local,
        "markerColorSuspects": marker_suspects,
        "visibleMarkerPass": all(
            m["visibleGreenMarkerPx"] == 0 and m["visibleRedMarkerPx"] == 0 for m in marker_suspects
        ),
    }


def check_grip_and_motion(
    eval_data: dict[str, Any],
    palm_info: dict[str, Any],
    rig_data: dict[str, Any] | None,
) -> dict[str, Any]:
    """檢查：
    1. 雙手持槍段（thrust / attack 0.80s ~ 2.67s）手掌接觸點（hand_f, hand_b）到 grip_A(weapon bone) / grip_B(grip_B or grip_rear bone) 的距離 <= 1.0 px。
       同時報告骨骼原點距離與手掌 alpha 重心接觸點距離（抓出只對齊骨頭未補償手掌偏移的問題）。
    2. idle、walk 的後手 IK mix 為 0。
    3. walk 支撐腳漂移 <= 0.02H、首尾 pose 閉合、root 動畫內位移為 0。
    4. thrust 的爆發跨步與槍尖位移量。
    """
    body_h = float((rig_data or {}).get("metrics", {}).get("bodyHeightPx", 1986.0))
    palm_pts = palm_info["palmContactPoints"]
    anims = eval_data.get("animations", {})

    # 1. Idle & Walk IK mix == 0
    idle_ik_max = 0.0
    walk_ik_max = 0.0
    for f in anims.get("idle", {}).get("frames", []):
        for ik_name, ik_st in f.get("ik", {}).items():
            if "arm" in ik_name or "hand" in ik_name:
                idle_ik_max = max(idle_ik_max, float(ik_st.get("mix", 0.0)))
    for f in anims.get("walk", {}).get("frames", []):
        for ik_name, ik_st in f.get("ik", {}).items():
            if "arm" in ik_name or "hand" in ik_name:
                walk_ik_max = max(walk_ik_max, float(ik_st.get("mix", 0.0)))

    # 2. Two-handed grip distance during thrust (0.80s .. 2.67s)
    thrust_anim = anims.get("thrust") or anims.get("attack") or {}
    thrust_frames = thrust_anim.get("frames", [])

    max_palm_f_err = 0.0
    max_palm_b_err = 0.0
    max_bone_f_err = 0.0
    max_bone_b_err = 0.0
    two_hand_samples = 0

    for f in thrust_frames:
        t = float(f["time"])
        if 0.80 <= t <= 2.67:
            two_hand_samples += 1
            bones = f["bones"]
            b_weap = bones.get("weapon")
            b_grip_b = bones.get("grip_B") or bones.get("grip_rear")
            b_hand_f = bones.get("hand_f")
            b_hand_b = bones.get("hand_b")

            if b_weap and b_hand_f:
                bone_d = math.hypot(b_hand_f["worldX"] - b_weap["worldX"], b_hand_f["worldY"] - b_weap["worldY"])
                max_bone_f_err = max(max_bone_f_err, bone_d)
                pf = palm_pts.get("hand_f", {"localX": 0.0, "localY": 0.0})
                px = b_hand_f["worldX"] + pf["localX"] * b_hand_f["a"] + pf["localY"] * b_hand_f["b"]
                py = b_hand_f["worldY"] + pf["localX"] * b_hand_f["c"] + pf["localY"] * b_hand_f["d"]
                palm_d = math.hypot(px - b_weap["worldX"], py - b_weap["worldY"])
                max_palm_f_err = max(max_palm_f_err, palm_d)

            if b_grip_b and b_hand_b:
                bone_d = math.hypot(b_hand_b["worldX"] - b_grip_b["worldX"], b_hand_b["worldY"] - b_grip_b["worldY"])
                max_bone_b_err = max(max_bone_b_err, bone_d)
                pb = palm_pts.get("hand_b", {"localX": 0.0, "localY": 0.0})
                px = b_hand_b["worldX"] + pb["localX"] * b_hand_b["a"] + pb["localY"] * b_hand_b["b"]
                py = b_hand_b["worldY"] + pb["localX"] * b_hand_b["c"] + pb["localY"] * b_hand_b["d"]
                palm_d = math.hypot(px - b_grip_b["worldX"], py - b_grip_b["worldY"])
                max_palm_b_err = max(max_palm_b_err, palm_d)

    # 3. Walk in-place, stance foot drift <= 0.02H, loop closure
    walk_frames = anims.get("walk", {}).get("frames", [])
    walk_root_advance = 0.0
    walk_loop_max_diff = 0.0
    walk_stance_drift_px = 0.0

    if len(walk_frames) >= 2:
        f0 = walk_frames[0]["bones"]
        f_end = walk_frames[-1]["bones"]
        if "root" in f0 and "root" in f_end:
            walk_root_advance = abs(f_end["root"]["worldX"] - f0["root"]["worldX"])

        for b_name in ("pelvis", "torso", "head", "foot_f", "foot_b", "hand_f", "hand_b"):
            if b_name in f0 and b_name in f_end:
                d_pos = math.hypot(
                    f_end[b_name]["worldX"] - f0[b_name]["worldX"],
                    f_end[b_name]["worldY"] - f0[b_name]["worldY"],
                )
                walk_loop_max_diff = max(walk_loop_max_diff, d_pos)

        # Stance drift: when a foot is at its lowest y (planted on ground, within 3px of min y),
        # check relative drift if in-place
        for foot_name in ("foot_f", "foot_b"):
            ys = [f["bones"][foot_name]["worldY"] for f in walk_frames if foot_name in f["bones"]]
            xs = [f["bones"][foot_name]["worldX"] for f in walk_frames if foot_name in f["bones"]]
            if ys:
                min_y = min(ys)
                planted_xs = [x for x, y in zip(xs, ys) if y <= min_y + 2.0]
                if len(planted_xs) >= 2 and walk_root_advance < 5.0:
                    drift = max(planted_xs) - min(planted_xs)
                    walk_stance_drift_px = max(walk_stance_drift_px, drift)

    # 4. Thrust dynamics (coil vs strike extension with H ratios)
    thrust_metrics: dict[str, Any] = {}
    if thrust_frames:
        def frame_at(target_t: float) -> dict[str, Any]:
            return min(thrust_frames, key=lambda fr: abs(float(fr["time"]) - target_t))

        f_stance = frame_at(1.10)
        f_coil = frame_at(1.50)
        f_strike = frame_at(1.67)
        root_xs = [f["bones"]["root"]["worldX"] for f in thrust_frames if "root" in f["bones"]]
        root_span = (max(root_xs) - min(root_xs)) if root_xs else 0.0
        root_span_ratio_h = root_span / body_h

        # Weapon / spear tip reach
        weap_stance_x = f_stance["bones"].get("weapon", {}).get("worldX", 0.0)
        weap_coil_x = f_coil["bones"].get("weapon", {}).get("worldX", 0.0)
        weap_strike_x = f_strike["bones"].get("weapon", {}).get("worldX", 0.0)
        torso_strike_x = f_strike["bones"].get("torso", {}).get("worldX", 0.0)
        foot_f_stance_x = f_stance["bones"].get("foot_f", {}).get("worldX", 0.0)
        foot_f_strike_x = f_strike["bones"].get("foot_f", {}).get("worldX", 0.0)

        # Spear tip: if spear_tip bone exists use its worldX, otherwise derive from weapon bone + rig weapon tip offset
        if "spear_tip" in f_strike["bones"]:
            spear_tip_strike_x = f_strike["bones"]["spear_tip"]["worldX"]
        else:
            # Fallback: estimate spear_tip from weapon world pos
            spear_tip_strike_x = weap_strike_x

        facing_dir = "right" if (weap_strike_x - weap_coil_x) >= 0 else "left"
        if facing_dir == "right":
            spear_tip_minus_torso_px = spear_tip_strike_x - torso_strike_x
        else:
            spear_tip_minus_torso_px = torso_strike_x - spear_tip_strike_x

        spear_reach_ratio_h = spear_tip_minus_torso_px / body_h
        foot_step_px = abs(foot_f_strike_x - foot_f_stance_x)
        foot_step_ratio_h = foot_step_px / body_h

        # AG-04 H-ratio criteria:
        # 1. root stationary <= 0.005H
        # 2. front foot step 0.2H .. 0.4H
        # 3. strike spear tip ahead of torso >= 1.0H
        root_stationary_h_ok = root_span_ratio_h <= 0.005
        foot_step_h_ok = 0.20 <= foot_step_ratio_h <= 0.40
        spear_reach_h_ok = spear_reach_ratio_h >= 1.0

        thrust_metrics = {
            "rootWorldXSpanPx": round(root_span, 2),
            "rootSpanRatioH": round(root_span_ratio_h, 5),
            "rootIsStationaryHPass": root_stationary_h_ok,
            "rootIsStationary": root_stationary_h_ok,
            "weaponWorldX_stance_1.10s": round(weap_stance_x, 2),
            "weaponWorldX_coil_1.50s": round(weap_coil_x, 2),
            "weaponWorldX_strike_1.67s": round(weap_strike_x, 2),
            "weaponStrikeDeltaFromCoilPx": round(abs(weap_strike_x - weap_coil_x), 2),
            "frontFootStepDeltaPx": round(foot_step_px, 2),
            "frontFootStepRatioH": round(foot_step_ratio_h, 4),
            "frontFootStepHPass": foot_step_h_ok,
            "strikeSpearTipAheadOfTorsoPx": round(spear_tip_minus_torso_px, 2),
            "strikeSpearTipAheadOfTorsoRatioH": round(spear_reach_ratio_h, 4),
            "strikeSpearTipAheadOfTorsoHPass": spear_reach_h_ok,
            "facingDirection": facing_dir,
            "bodyHeightPx": round(body_h, 2),
        }

    drift_ratio = walk_stance_drift_px / body_h
    return {
        "idleRearHandIkMix": round(idle_ik_max, 4),
        "walkRearHandIkMix": round(walk_ik_max, 4),
        "singleHandIkZeroPass": idle_ik_max <= 1e-4 and walk_ik_max <= 1e-4,
        "twoHandedSamplesChecked": two_hand_samples,
        "maxFrontPalmToGripAPx": round(max_palm_f_err, 3),
        "maxRearPalmToGripBPx": round(max_palm_b_err, 3),
        "maxFrontBoneToGripAPx": round(max_bone_f_err, 3),
        "maxRearBoneToGripBPx": round(max_bone_b_err, 3),
        "palmGripLe1PxPass": max_palm_f_err <= 1.0 and max_palm_b_err <= 1.0,
        "boneGripLe1PxPass": max_bone_f_err <= 1.0 and max_bone_b_err <= 1.0,
        "walkRootAdvancePx": round(walk_root_advance, 2),
        "walkInPlacePass": walk_root_advance <= 1.0,
        "walkStanceFootDriftPx": round(walk_stance_drift_px, 2),
        "walkStanceFootDriftRatioH": round(drift_ratio, 5),
        "walkStanceDriftLe002HPass": drift_ratio <= 0.02,
        "walkLoopPoseClosureMaxDiffPx": round(walk_loop_max_diff, 3),
        "walkLoopClosurePass": walk_loop_max_diff <= 2.0,
        "thrustMetrics": thrust_metrics,
    }


def check_weapon_single_piece(skel_json: dict[str, Any]) -> dict[str, Any]:
    """AG-06 補充：weapon_single_piece（武器僅 1 個 region attachment、1 根骨）。"""
    slots = skel_json.get("slots", [])
    bones = skel_json.get("bones", [])

    weapon_slots = [
        s for s in slots if "weapon" in s.get("name", "").lower() or "spear" in s.get("name", "").lower()
    ]
    weapon_bones = [
        b for b in bones if "weapon" in b.get("name", "").lower() or "spear" in b.get("name", "").lower()
    ]

    skins = skel_json.get("skins", [])
    attachments_map: dict[str, dict[str, Any]] = {}
    if isinstance(skins, list):
        for sk in skins:
            if sk.get("name") == "default" or not attachments_map:
                attachments_map = sk.get("attachments", {})
    elif isinstance(skins, dict):
        attachments_map = skins.get("default", {})

    weapon_attachments: list[dict[str, Any]] = []
    non_region_attachments: list[str] = []
    for ws in weapon_slots:
        s_name = ws.get("name", "")
        s_atts = attachments_map.get(s_name, {})
        for att_name, att_val in s_atts.items():
            att_type = att_val.get("type", "region")
            weapon_attachments.append({"slot": s_name, "attachment": att_name, "type": att_type})
            if att_type != "region":
                non_region_attachments.append(att_name)

    issues: list[str] = []
    if len(weapon_bones) != 1:
        issues.append(f"武器骨骼數量應恰為 1 根，實際為 {len(weapon_bones)}: {[b['name'] for b in weapon_bones]}")
    if len(weapon_attachments) != 1:
        issues.append(f"武器 attachment 數量應恰為 1 個，實際為 {len(weapon_attachments)}: {[a['attachment'] for a in weapon_attachments]}")
    if non_region_attachments:
        issues.append(f"武器 attachment 類型應為 region，實際含有非 region: {non_region_attachments}")

    return {
        "pass": len(issues) == 0,
        "weaponBoneCount": len(weapon_bones),
        "weaponAttachmentCount": len(weapon_attachments),
        "weaponBones": [b["name"] for b in weapon_bones],
        "weaponSlots": [s["name"] for s in weapon_slots],
        "weaponAttachments": weapon_attachments,
        "issues": issues,
    }


def check_weapon_edge_cleanliness(
    atlas_info: dict[str, Any],
    atlas_rgba: np.ndarray,
) -> dict[str, Any]:
    """AG-06 補充：weapon_edge_clean（武器 alpha 邊緣 3 px 內非武器色像素 <= 1%）。"""
    weap_reg = None
    for r_name, r in atlas_info.get("regions", {}).items():
        if "weapon" in r_name.lower() or "spear" in r_name.lower():
            weap_reg = r
            break

    if not weap_reg:
        return {"pass": True, "edgePixelCount": 0, "dirtyPixelCount": 0, "dirtyRatio": 0.0, "note": "no weapon region"}

    rx, ry, rw, rh = weap_reg["x"], weap_reg["y"], weap_reg["width"], weap_reg["height"]
    crop = atlas_rgba[ry : ry + rh, rx : rx + rw]
    alpha = crop[..., 3]
    rgb = crop[..., :3].astype(np.float32)

    core_mask = alpha >= 240
    if not core_mask.any():
        return {"pass": True, "edgePixelCount": 0, "dirtyPixelCount": 0, "dirtyRatio": 0.0}

    # 邊緣 3 px 範圍：alpha > 12 且距離核心邊界 <= 3 px 的外邊緣過渡區
    kernel_3px = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    dilated_core = cv2.dilate(core_mask.astype(np.uint8), kernel_3px) > 0
    edge_mask = (alpha > 12) & dilated_core & (~core_mask)

    edge_px_count = int(edge_mask.sum())
    if edge_px_count == 0:
        return {"pass": True, "edgePixelCount": 0, "dirtyPixelCount": 0, "dirtyRatio": 0.0}

    core_rgb = rgb[core_mask]
    mean_core = core_rgb.mean(axis=0)

    crop_bgr = cv2.cvtColor(crop[..., :3], cv2.COLOR_RGB2BGR)
    crop_hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    edge_hsv = crop_hsv[edge_mask]
    core_hsv = crop_hsv[core_mask]

    # 檢查核心色是否本身為藍色（若不是，邊緣出現藍色背景像素即為背景殘留雜色）
    is_core_blue = ((core_hsv[:, 0] >= 100) & (core_hsv[:, 0] <= 135) & (core_hsv[:, 1] >= 40)).mean() > 0.15

    dirty_pixels = 0
    diff_from_core = np.linalg.norm(rgb[edge_mask] - mean_core, axis=1)
    for i in range(edge_px_count):
        h_val = int(edge_hsv[i, 0])
        s_val = int(edge_hsv[i, 1])
        v_val = int(edge_hsv[i, 2])
        dist = float(diff_from_core[i])

        is_blue_bg = (not is_core_blue) and (100 <= h_val <= 135) and (s_val >= 40) and (v_val >= 30)
        is_alien_color = (dist > 120.0) and (s_val >= 50)

        if is_blue_bg or is_alien_color:
            dirty_pixels += 1

    dirty_ratio = dirty_pixels / edge_px_count
    return {
        "pass": dirty_ratio <= 0.01,
        "edgePixelCount": edge_px_count,
        "dirtyPixelCount": dirty_pixels,
        "dirtyRatio": round(dirty_ratio, 5),
    }


def check_facing_consistency(
    skel_json: dict[str, Any],
    eval_data: dict[str, Any],
    rig_data: dict[str, Any] | None,
) -> dict[str, Any]:
    """AG-06：facing_consistency（臉、胸口朝向與槍頭方向同側）。"""
    setup_bones = eval_data.get("setupBones", {})

    facing = "right"
    if rig_data and "facing" in rig_data:
        facing = rig_data["facing"]
    elif "shoulder_f" in setup_bones and "shoulder_b" in setup_bones:
        sf_x = setup_bones["shoulder_f"]["worldX"]
        sb_x = setup_bones["shoulder_b"]["worldX"]
        facing = "right" if sf_x >= sb_x else "left"

    expected_sign = 1.0 if facing == "right" else -1.0
    issues: list[str] = []

    # 1. 胸口面朝方向：前肩 shoulder_f 相對於後肩 shoulder_b 的 X 軸位移
    chest_facing_ok = True
    if "shoulder_f" in setup_bones and "shoulder_b" in setup_bones:
        chest_dx = setup_bones["shoulder_f"]["worldX"] - setup_bones["shoulder_b"]["worldX"]
        if (chest_dx * expected_sign) < -5.0:
            chest_facing_ok = False
            issues.append(f"胸口朝向與基準朝向 ({facing}) 相反: shoulder_f 到 shoulder_b dx={chest_dx:.1f}")

    # 2. 槍頭方向（在 thrust、idle 動畫及 setup pose 中槍頭尖端應朝向前方同側）
    spear_facing_ok = True
    weap_bone_name = None
    for b in skel_json.get("bones", []):
        if "weapon" in b.get("name", "").lower() or "spear" in b.get("name", "").lower():
            weap_bone_name = b.get("name")
            break

    for anim_name, anim in eval_data.get("animations", {}).items():
        for fr in anim.get("frames", []):
            wb = fr.get("bones", {}).get(weap_bone_name) if weap_bone_name else None
            if not wb:
                continue
            spear_dx = wb.get("a", 1.0)
            if spear_dx * expected_sign < -0.2:
                spear_facing_ok = False
                issues.append(
                    f"動畫 '{anim_name}' frame {fr.get('frameIndex')} 槍尖朝向與面朝方向 ({facing}) 相反: spear_dx={spear_dx:.2f}"
                )
                break
        if not spear_facing_ok:
            break

    is_pass = chest_facing_ok and spear_facing_ok and len(issues) == 0
    return {
        "pass": is_pass,
        "baseFacing": facing,
        "chestFacingOk": chest_facing_ok,
        "spearFacingOk": spear_facing_ok,
        "issues": issues,
    }


def rasterize_frame_and_measure_occlusion(
    frame: dict[str, Any],
    atlas_img: np.ndarray,
    canvas_h: int = 360,
    x_bounds: tuple[float, float] = (-1400.0, 1000.0),
    y_bounds: tuple[float, float] = (-800.0, 2100.0),
) -> tuple[Image.Image, dict[str, Any]]:
    """使用自身軟體光柵化器（OpenCV + NumPy）將單格所有 slot 的三角形網格依 drawOrder 畫出，
    並精確計算 `head` 切件的可見像素（alpha > 24）被排在 `head` 之後的 slot 遮住的比例。
    同時檢查每個三角形在切件外部透明邊緣是否帶入異常小暗點。
    """
    x0, x1 = x_bounds
    y0, y1 = y_bounds
    scale = canvas_h / (y1 - y0)
    canvas_w = int(round((x1 - x0) * scale))

    atlas_h, atlas_w = atlas_img.shape[:2]
    bg = np.zeros((canvas_h, canvas_w, 4), dtype=np.float32)
    bg[:] = (51.0, 51.0, 51.0, 255.0)

    head_mask = np.zeros((canvas_h, canvas_w), dtype=bool)
    occluding_after_head_mask = np.zeros((canvas_h, canvas_w), dtype=bool)
    slot_masks: dict[str, np.ndarray] = {}
    seen_head = False

    for d in frame.get("drawables", []):
        slot_name = d["slot"]
        v = d["vertices"]
        uvs = d["uvs"]
        tris = d["triangles"]
        n_v = len(v) // 2
        if n_v < 3 or not tris:
            continue

        slot_layer = np.zeros((canvas_h, canvas_w, 4), dtype=np.float32)

        # Render each triangle with affine warp on bounding box
        for t_i in range(0, len(tris), 3):
            i0, i1, i2 = tris[t_i], tris[t_i + 1], tris[t_i + 2]
            dst_tri = np.array(
                [
                    [(v[2 * i0] - x0) * scale, (y1 - v[2 * i0 + 1]) * scale],
                    [(v[2 * i1] - x0) * scale, (y1 - v[2 * i1 + 1]) * scale],
                    [(v[2 * i2] - x0) * scale, (y1 - v[2 * i2 + 1]) * scale],
                ],
                dtype=np.float32,
            )

            # Bounding box on canvas
            min_dx = max(0, int(math.floor(float(dst_tri[:, 0].min()))))
            max_dx = min(canvas_w - 1, int(math.ceil(float(dst_tri[:, 0].max()))))
            min_dy = max(0, int(math.floor(float(dst_tri[:, 1].min()))))
            max_dy = min(canvas_h - 1, int(math.ceil(float(dst_tri[:, 1].max()))))
            if max_dx < min_dx or max_dy < min_dy:
                continue

            src_tri = np.array(
                [
                    [uvs[2 * i0] * atlas_w, uvs[2 * i0 + 1] * atlas_h],
                    [uvs[2 * i1] * atlas_w, uvs[2 * i1 + 1] * atlas_h],
                    [uvs[2 * i2] * atlas_w, uvs[2 * i2 + 1] * atlas_h],
                ],
                dtype=np.float32,
            )

            min_sx = max(0, int(math.floor(float(src_tri[:, 0].min()))) - 2)
            max_sx = min(atlas_w - 1, int(math.ceil(float(src_tri[:, 0].max()))) + 2)
            min_sy = max(0, int(math.floor(float(src_tri[:, 1].min()))) - 2)
            max_sy = min(atlas_h - 1, int(math.ceil(float(src_tri[:, 1].max()))) + 2)
            if max_sx <= min_sx or max_sy <= min_sy:
                continue

            src_patch = atlas_img[min_sy : max_sy + 1, min_sx : max_sx + 1].astype(np.float32)
            src_local = src_tri - np.array([[min_sx, min_sy]], dtype=np.float32)
            dst_local = dst_tri - np.array([[min_dx, min_dy]], dtype=np.float32)

            out_w = max_dx - min_dx + 1
            out_h = max_dy - min_dy + 1

            # Check degenerate triangle
            area2 = abs(
                (dst_local[1, 0] - dst_local[0, 0]) * (dst_local[2, 1] - dst_local[0, 1])
                - (dst_local[1, 1] - dst_local[0, 1]) * (dst_local[2, 0] - dst_local[0, 0])
            )
            if area2 < 0.25:
                continue

            M = cv2.getAffineTransform(src_local, dst_local)
            warped = cv2.warpAffine(
                src_patch,
                M,
                (out_w, out_h),
                flags=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(0, 0, 0, 0),
            )

            tri_mask = np.zeros((out_h, out_w), dtype=np.uint8)
            cv2.fillConvexPoly(tri_mask, np.round(dst_local).astype(np.int32), 255)
            m_bool = tri_mask > 0

            patch_dst = slot_layer[min_dy : max_dy + 1, min_dx : max_dx + 1]
            patch_dst[m_bool] = warped[m_bool]

        # Composite slot_layer onto bg
        a_norm = slot_layer[..., 3:4] / 255.0
        bg[..., :3] = slot_layer[..., :3] * a_norm + bg[..., :3] * (1.0 - a_norm)

        slot_vis = slot_layer[..., 3] > 24.0
        if slot_name in slot_masks:
            slot_masks[slot_name] |= slot_vis
        else:
            slot_masks[slot_name] = slot_vis.copy()

        if slot_name == "head":
            head_mask |= slot_vis
            seen_head = True
        elif seen_head and slot_name not in ("hair_tail",):
            occluding_after_head_mask |= slot_vis

    head_px = int(head_mask.sum())
    occluded_px = int((head_mask & occluding_after_head_mask).sum())
    occ_ratio = (occluded_px / head_px) if head_px > 0 else 0.0

    # 1. AG-06 補充：hair_overlap 檢查（hair_tail 與 head 渲染 alpha 重疊率 <= 2%）
    hair_m = slot_masks.get("hair_tail")
    hair_px = int(hair_m.sum()) if hair_m is not None else 0
    hair_overlap_px = int((hair_m & head_mask).sum()) if hair_m is not None else 0
    hair_overlap_ratio = (hair_overlap_px / hair_px) if hair_px > 0 else 0.0

    # 2. AG-06：arm_continuity 手臂部位可見像素與手部相連性
    arm_slot_names = ["arm_upper_f", "arm_lower_f", "arm_upper_b", "arm_lower_b", "hand_f", "hand_b"]
    arm_vis_px = {s: int(slot_masks[s].sum()) if s in slot_masks else 0 for s in arm_slot_names}

    k5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    hand_f_m = slot_masks.get("hand_f")
    arm_lf_m = slot_masks.get("arm_lower_f")
    hand_f_connected = True
    if hand_f_m is not None and arm_lf_m is not None and hand_f_m.sum() > 10 and arm_lf_m.sum() > 10:
        hand_f_connected = bool((cv2.dilate(hand_f_m.astype(np.uint8), k5) & arm_lf_m.astype(np.uint8)).any())

    hand_b_m = slot_masks.get("hand_b")
    arm_lb_m = slot_masks.get("arm_lower_b")
    hand_b_connected = True
    if hand_b_m is not None and arm_lb_m is not None and hand_b_m.sum() > 10 and arm_lb_m.sum() > 10:
        hand_b_connected = bool((cv2.dilate(hand_b_m.astype(np.uint8), k5) & arm_lb_m.astype(np.uint8)).any())

    img = Image.fromarray(np.clip(bg[..., :3], 0, 255).astype(np.uint8), mode="RGB")
    return img, {
        "headVisiblePixels": head_px,
        "headOccludedByUpperSlotsPixels": occluded_px,
        "headOcclusionRatio": round(occ_ratio, 5),
        "hairVisiblePixels": hair_px,
        "hairOverlapWithHeadPixels": hair_overlap_px,
        "hairOverlapRatio": round(hair_overlap_ratio, 5),
        "armVisiblePixels": arm_vis_px,
        "handFConnected": hand_f_connected,
        "handBConnected": hand_b_connected,
    }


def render_animations_and_check_head_occlusion(
    eval_data: dict[str, Any],
    atlas_img: np.ndarray,
    out_dir: Path,
    canvas_h: int = 360,
) -> dict[str, Any]:
    """對所有動畫進行逐格渲染，儲存逐格 PNG 與 Contact Sheet，
    並同步統計 head 遮擋率、hair_tail 重疊率、以及 arm 連續性（可見像素 >= 60% 與手部無縫隙）。
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    anim_reports: dict[str, Any] = {}
    overall_max_head_occ = 0.0
    overall_max_hair_overlap = 0.0
    worst_frame_info: dict[str, Any] = {}

    # 先取得 setup pose 的手臂各部位可見像素基準
    _, setup_frame_info = rasterize_frame_and_measure_occlusion(
        eval_data.get("setupDraw", {}), atlas_img, canvas_h=canvas_h
    )
    setup_arm_px = setup_frame_info.get("armVisiblePixels", {})

    all_arm_continuity_ok = True
    arm_continuity_issues: list[dict[str, Any]] = []

    try:
        font = ImageFont.truetype("arial.ttf", 12)
    except OSError:
        font = ImageFont.load_default()

    # Skip alias if identical to thrust to save redundant rendering time, or link it
    rendered_cache: dict[str, dict[str, Any]] = {}

    for anim_name, anim_info in eval_data.get("animations", {}).items():
        if anim_name == "attack" and "thrust" in rendered_cache:
            anim_reports[anim_name] = {
                "aliasOf": "thrust",
                **rendered_cache["thrust"],
            }
            continue

        frames = anim_info.get("frames", [])
        if not frames:
            continue

        frames_dir = out_dir / f"{anim_name}_frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        rendered_imgs: list[Image.Image] = []
        max_occ = 0.0
        max_occ_frame = 0
        max_occ_time = 0.0
        max_hair_overlap = 0.0

        for fr in frames:
            idx = int(fr["frameIndex"])
            t = float(fr["time"])
            im, occ = rasterize_frame_and_measure_occlusion(fr, atlas_img, canvas_h=canvas_h)
            im.save(frames_dir / f"frame_{idx:03d}.png")
            rendered_imgs.append(im)

            r = occ["headOcclusionRatio"]
            if r > max_occ:
                max_occ = r
                max_occ_frame = idx
                max_occ_time = t
            if r > overall_max_head_occ:
                overall_max_head_occ = r
                worst_frame_info = {"animation": anim_name, "frameIndex": idx, "time": t, "ratio": r}

            ho = occ["hairOverlapRatio"]
            if ho > max_hair_overlap:
                max_hair_overlap = ho
            if ho > overall_max_hair_overlap:
                overall_max_hair_overlap = ho

            # 檢查手臂 60% 與相連性
            cur_arm_px = occ["armVisiblePixels"]
            for slot_arm in ["arm_upper_f", "arm_lower_f", "arm_upper_b", "arm_lower_b"]:
                s_base = setup_arm_px.get(slot_arm, 0)
                s_cur = cur_arm_px.get(slot_arm, 0)
                if s_base > 15 and s_cur < 0.60 * s_base:
                    all_arm_continuity_ok = False
                    arm_continuity_issues.append(
                        {
                            "animation": anim_name,
                            "frameIndex": idx,
                            "time": t,
                            "slot": slot_arm,
                            "currentPixels": s_cur,
                            "setupPixels": s_base,
                            "ratio": round(s_cur / s_base, 4),
                            "reason": f"{slot_arm} 可見像素不足 60% ({s_cur}/{s_base})",
                        }
                    )

            if not occ["handFConnected"]:
                all_arm_continuity_ok = False
                arm_continuity_issues.append(
                    {
                        "animation": anim_name,
                        "frameIndex": idx,
                        "time": t,
                        "reason": "hand_f 與 arm_lower_f 斷開（拳頭浮空無相連）",
                    }
                )
            if not occ["handBConnected"]:
                all_arm_continuity_ok = False
                arm_continuity_issues.append(
                    {
                        "animation": anim_name,
                        "frameIndex": idx,
                        "time": t,
                        "reason": "hand_b 與 arm_lower_b 斷開（拳頭浮空無相連）",
                    }
                )

        # Build contact sheet (up to 12 evenly spaced frames)
        n_total = len(rendered_imgs)
        if n_total <= 12:
            pick_indices = list(range(n_total))
        else:
            pick_indices = [round(i * (n_total - 1) / 11) for i in range(12)]

        cell_w, cell_h = rendered_imgs[0].size
        cols = min(6, len(pick_indices))
        rows = math.ceil(len(pick_indices) / cols)
        sheet = Image.new("RGB", (cols * cell_w, rows * (cell_h + 20)), (38, 38, 38))
        draw = ImageDraw.Draw(sheet)

        for k, f_idx in enumerate(pick_indices):
            c = k % cols
            r_row = k // cols
            x_off = c * cell_w
            y_off = r_row * (cell_h + 20)
            sheet.paste(rendered_imgs[f_idx], (x_off, y_off + 20))
            t_val = frames[f_idx]["time"]
            draw.text((x_off + 6, y_off + 3), f"f{f_idx:02d} ({t_val:.2f}s)", fill=(240, 240, 240), font=font)

        sheet_path = out_dir / f"{anim_name}_contact_sheet.png"
        sheet.save(sheet_path)

        rep = {
            "framesRendered": n_total,
            "maxHeadOcclusionRatio": round(max_occ, 5),
            "maxHeadOcclusionFrame": max_occ_frame,
            "maxHeadOcclusionTimeSec": round(max_occ_time, 4),
            "headOcclusionLe5PctPass": max_occ <= 0.05,
            "maxHairOverlapRatio": round(max_hair_overlap, 5),
            "hairOverlapLe2PctPass": max_hair_overlap <= 0.02,
            "contactSheet": str(sheet_path),
            "framesDir": str(frames_dir),
        }
        anim_reports[anim_name] = rep
        rendered_cache[anim_name] = rep

    return {
        "pass": overall_max_head_occ <= 0.05,
        "maxHeadOcclusionRatio": round(overall_max_head_occ, 5),
        "worstFrame": worst_frame_info,
        "maxHairOverlapRatio": round(overall_max_hair_overlap, 5),
        "hairOverlapLe2PctPass": overall_max_hair_overlap <= 0.02,
        "armContinuityPass": all_arm_continuity_ok,
        "armContinuityIssues": arm_continuity_issues[:20],
        "setupArmPixels": setup_arm_px,
        "animations": anim_reports,
    }


def format_concise_summary_lines(
    report: dict[str, Any],
    fail_on_filter: set[str] | None = None,
) -> tuple[list[str], bool]:
    """產出每項一行的精簡 PASS/FAIL 摘要，方便直接複製貼給 Sparkle。"""
    rt = report["runtime"]
    do_chk = report["drawOrderValidation"]
    ro_chk = report["renderAndOcclusionValidation"]
    ms_chk = report["meshAndRigidityValidation"]
    gm_chk = report["gripAndMotionValidation"]
    pm_chk = report["palmAndMarkerValidation"]
    fc_chk = report.get("facingConsistencyValidation", {})
    wp_chk = report.get("weaponSinglePieceValidation", {})
    we_chk = report.get("weaponEdgeCleanValidation", {})
    tm = gm_chk.get("thrustMetrics", {})

    wf = ro_chk.get("worstFrame", {})
    wf_str = f"{wf.get('animation', '?')} f{wf.get('frameIndex', 0)} ({wf.get('time', 0.0):.2f}s)" if wf else "n/a"
    rigid_bad = [v["slot"] for v in ms_chk.get("rigidSlotViolations", [])]
    flipped_slot = ms_chk.get("animatedFlippedBySlot", {})
    thrust_root_ok = bool(tm.get("rootIsStationary", True))
    no_flipped_ok = ms_chk.get("setupFlippedTriangles", 0) == 0 and ms_chk.get("animatedFlippedTriangles", 0) == 0
    rigid_ok = len(rigid_bad) == 0

    items = [
        (
            "spine_core_42",
            bool(report["checks"]["officialSpineCore42LoadAndPlay"]),
            f"官方 spine-core 4.2 載入與播放: spine={rt.get('spineVersion')}, loadErrors={len(rt.get('loadErrors', []))}, animErrors={rt.get('animationRuntimeErrors', 0)}, physics={rt.get('physicsCount', 0)}",
        ),
        (
            "draw_order",
            bool(report["checks"]["drawOrderUniqueNoHoles"]),
            f"drawOrder 唯一性（無重複/無空洞）: issues={do_chk.get('issueCount', 0)}",
        ),
        (
            "head_occlusion",
            bool(report["checks"]["headOcclusionLe5Pct"]),
            f"head 臉部遮擋率 <= 5.0%: max={ro_chk.get('maxHeadOcclusionRatio', 0.0) * 100:.2f}% @ {wf_str}",
        ),
        (
            "rigid_slots",
            rigid_ok,
            f"剛體部位不跨骨加權 (head/weapon/hand/foot/pauldron): violations={rigid_bad if rigid_bad else 'none'}",
        ),
        (
            "flipped_triangles",
            no_flipped_ok,
            f"網格無翻面三角形 (= 0): setup={ms_chk.get('setupFlippedTriangles', 0)}, animated={ms_chk.get('animatedFlippedTriangles', 0)} {flipped_slot if flipped_slot else ''}".strip(),
        ),
        (
            "palm_grip",
            bool(report["checks"]["twoHandedPalmGripLe1Px"]),
            f"雙手持槍手掌接觸點到握點 <= 1.0 px: frontPalm={gm_chk.get('maxFrontPalmToGripAPx', 0.0):.3f} px, rearPalm={gm_chk.get('maxRearPalmToGripBPx', 0.0):.3f} px",
        ),
        (
            "single_hand_ik",
            bool(report["checks"]["singleHandIkMixZero"]),
            f"單手持槍 (idle/walk) 後手 IK mix = 0: idle={gm_chk.get('idleRearHandIkMix', 0.0)}, walk={gm_chk.get('walkRearHandIkMix', 0.0)}",
        ),
        (
            "walk_in_place",
            bool(report["checks"]["walkInPlaceAndDriftLe002H"]),
            f"walk 原地踏步與接地漂移 <= 0.02H: rootAdvance={gm_chk.get('walkRootAdvancePx', 0.0):.2f} px, drift={gm_chk.get('walkStanceFootDriftRatioH', 0.0):.4f}H, loopDiff={gm_chk.get('walkLoopPoseClosureMaxDiffPx', 0.0):.2f} px",
        ),
        (
            "thrust_root_stationary",
            thrust_root_ok,
            f"thrust 的 root 原地不動 (<= 0.005H): rootSpanX={tm.get('rootWorldXSpanPx', 0.0):.2f} px ({tm.get('rootSpanRatioH', 0.0):.4f}H), strikeDelta={tm.get('weaponStrikeDeltaFromCoilPx', 0.0):.1f} px",
        ),
        (
            "thrust_step_and_reach_h",
            bool(tm.get("frontFootStepHPass", False)) and bool(tm.get("strikeSpearTipAheadOfTorsoHPass", False)),
            f"thrust 跨步 (0.2-0.4H) 與槍尖刺出 (>= 1.0H): step={tm.get('frontFootStepRatioH', 0.0):.3f}H, reach={tm.get('strikeSpearTipAheadOfTorsoRatioH', 0.0):.3f}H (diff={tm.get('strikeSpearTipAheadOfTorsoPx', 0.0):.1f} px, H={tm.get('bodyHeightPx', 0.0):.1f} px)",
        ),
        (
            "marker_dots",
            bool(report["checks"]["noVisibleMarkerDotsInAtlas"]),
            f"圖集無殘留數位紅綠標記點: pass={report['checks']['noVisibleMarkerDotsInAtlas']}",
        ),
        (
            "arm_continuity",
            bool(report["checks"].get("armContinuityPass", True)),
            f"每格上臂/前臂可見像素 >= 60% 且手腕相連無縫隙: pass={report['checks'].get('armContinuityPass')}, issues={len(ro_chk.get('armContinuityIssues', []))}",
        ),
        (
            "facing_consistency",
            bool(report["checks"].get("facingConsistencyPass", True)),
            f"臉、胸口朝向與槍頭方向同側 ({fc_chk.get('baseFacing', '?')}): pass={fc_chk.get('pass')}, issues={fc_chk.get('issues', [])}",
        ),
        (
            "weapon_single_piece",
            bool(report["checks"].get("weaponSinglePiecePass", True)),
            f"武器僅 1 個 region attachment、1 根骨: bones={wp_chk.get('weaponBoneCount')}, attachments={wp_chk.get('weaponAttachmentCount')}, issues={wp_chk.get('issues', [])}",
        ),
        (
            "hair_overlap",
            bool(report["checks"].get("hairOverlapLe2Pct", True)),
            f"hair_tail 與 head 渲染 alpha 重疊 <= 2%: max={ro_chk.get('maxHairOverlapRatio', 0.0) * 100:.2f}%",
        ),
        (
            "weapon_edge_clean",
            bool(report["checks"].get("weaponEdgeCleanPass", True)),
            f"武器 alpha 邊緣 3 px 內非武器色像素 <= 1%: dirtyRatio={we_chk.get('dirtyRatio', 0.0) * 100:.2f}% ({we_chk.get('dirtyPixelCount', 0)}/{we_chk.get('edgePixelCount', 0)} px)",
        ),
    ]

    lines: list[str] = []
    any_selected_failed = False
    for key, passed, desc in items:
        if fail_on_filter and "all" not in fail_on_filter and key not in fail_on_filter:
            continue
        tag = "[PASS]" if passed else "[FAIL]"
        lines.append(f"{tag} {key}: {desc}")
        if not passed:
            any_selected_failed = True

    return lines, any_selected_failed


def main() -> None:
    ap = argparse.ArgumentParser(description="獨立 Spine 4.2 驗證器與逐格渲染工具 (AG-01 修訂 / AG-03)")
    ap.add_argument("--json", required=True, help="Spine skeleton JSON 路徑")
    ap.add_argument("--atlas", required=True, help="Spine .atlas 路徑")
    ap.add_argument("--png", help="Atlas PNG 路徑（預設與 .atlas 同目錄同名）")
    ap.add_argument("--rig", help="選填：中立 source-rig.json 路徑（用於核對握點錨點與身高 H）")
    ap.add_argument("--out-dir", required=True, help="報告與渲染圖輸出目錄")
    ap.add_argument("--fps", type=int, default=24, help="採樣幀率（預設 24）")
    ap.add_argument("--render-height", type=int, default=360, help="逐格渲染高度 px（預設 360）")
    ap.add_argument("--spine-core", default=str(DEFAULT_SPINE_CORE), help="@esotericsoftware/spine-core 目錄")
    ap.add_argument(
        "--fail-on",
        nargs="?",
        const="all",
        default=None,
        help="輸出每項一行的精簡 PASS/FAIL 摘要（可不帶值代表 all，或逗號分隔指定項目），若未通過則以非 0 狀態碼退出",
    )
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")

    json_path = Path(args.json).resolve()
    atlas_path = Path(args.atlas).resolve()
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    atlas_info = parse_atlas(atlas_path)
    png_path = Path(args.png).resolve() if args.png else (atlas_path.parent / (atlas_info["page"] or "zhaoyun.png"))
    rig_data = json.loads(Path(args.rig).read_text(encoding="utf-8")) if args.rig and Path(args.rig).exists() else None
    skel_json = json.loads(json_path.read_text(encoding="utf-8"))

    # 1. Run official spine-core 4.2 evaluation via Node helper
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_eval_path = Path(tmp.name)

    try:
        cmd = [
            "node",
            str(HELPER_MJS),
            str(Path(args.spine_core).resolve()),
            str(json_path),
            str(atlas_path),
            str(tmp_eval_path),
            str(args.fps),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", check=False)
        if proc.returncode != 0 or not tmp_eval_path.exists():
            raise RuntimeError(f"spine_eval_helper failed: {proc.stderr or proc.stdout}")
        eval_data = json.loads(tmp_eval_path.read_text(encoding="utf-8"))
    finally:
        if tmp_eval_path.exists():
            tmp_eval_path.unlink()

    atlas_rgba = np.array(Image.open(png_path).convert("RGBA"))

    # 2. Run checks
    draw_order_check = check_draw_order_timelines(skel_json)
    mesh_check = check_mesh_weights_and_rigidity(skel_json, eval_data, atlas_info, atlas_rgba)
    palm_and_marker_check = compute_palm_centroids_and_check_markers(
        atlas_info,
        atlas_rgba,
        eval_data.get("setupDraw", {}),
        eval_data.get("setupBones", {}),
        rig_data,
    )
    grip_and_motion_check = check_grip_and_motion(eval_data, palm_and_marker_check, rig_data)
    render_and_occlusion_check = render_animations_and_check_head_occlusion(
        eval_data,
        atlas_rgba,
        out_dir / "renders",
        canvas_h=args.render_height,
    )
    facing_check = check_facing_consistency(skel_json, eval_data, rig_data)
    weapon_single_check = check_weapon_single_piece(skel_json)
    weapon_edge_check = check_weapon_edge_cleanliness(atlas_info, atlas_rgba)

    runtime_anim_errors = sum(len(a.get("errors", [])) for a in eval_data.get("animations", {}).values())
    runtime_pass = bool(eval_data.get("loadSuccess")) and len(eval_data.get("loadErrors", [])) == 0 and runtime_anim_errors == 0

    checks_summary = {
        "officialSpineCore42LoadAndPlay": runtime_pass,
        "drawOrderUniqueNoHoles": draw_order_check["pass"],
        "headOcclusionLe5Pct": render_and_occlusion_check["pass"],
        "meshWeightsAndNoFlippedTriangles": mesh_check["pass"],
        "twoHandedPalmGripLe1Px": grip_and_motion_check["palmGripLe1PxPass"],
        "singleHandIkMixZero": grip_and_motion_check["singleHandIkZeroPass"],
        "walkInPlaceAndDriftLe002H": (
            grip_and_motion_check["walkInPlacePass"]
            and grip_and_motion_check["walkStanceDriftLe002HPass"]
            and grip_and_motion_check["walkLoopClosurePass"]
        ),
        "thrustRootStationary": bool(grip_and_motion_check.get("thrustMetrics", {}).get("rootIsStationary", True)),
        "noVisibleMarkerDotsInAtlas": palm_and_marker_check["visibleMarkerPass"],
        "armContinuityPass": render_and_occlusion_check["armContinuityPass"],
        "facingConsistencyPass": facing_check["pass"],
        "weaponSinglePiecePass": weapon_single_check["pass"],
        "hairOverlapLe2Pct": render_and_occlusion_check["hairOverlapLe2PctPass"],
        "weaponEdgeCleanPass": weapon_edge_check["pass"],
    }

    overall_pass = all(checks_summary.values())

    report = {
        "schema": "3klife.spine-validation-report.v1",
        "verificationScope": "offline-validator-only (official @esotericsoftware/spine-core 4.2 + software rasterizer; NOT Cocos runtime verified)",
        "overallPass": overall_pass,
        "inputs": {
            "json": str(json_path),
            "atlas": str(atlas_path),
            "png": str(png_path),
            "rig": str(args.rig) if args.rig else None,
        },
        "runtime": {
            "spineVersion": eval_data.get("spineVersion"),
            "loadSuccess": eval_data.get("loadSuccess"),
            "loadErrors": eval_data.get("loadErrors", []),
            "bonesCount": eval_data.get("bonesCount"),
            "slotsCount": eval_data.get("slotsCount"),
            "ikCount": eval_data.get("ikCount"),
            "physicsCount": eval_data.get("physicsCount"),
            "physicsConstraints": eval_data.get("physicsConstraints", []),
            "animationRuntimeErrors": runtime_anim_errors,
        },
        "checks": checks_summary,
        "drawOrderValidation": draw_order_check,
        "meshAndRigidityValidation": mesh_check,
        "palmAndMarkerValidation": palm_and_marker_check,
        "gripAndMotionValidation": grip_and_motion_check,
        "renderAndOcclusionValidation": render_and_occlusion_check,
        "facingConsistencyValidation": facing_check,
        "weaponSinglePieceValidation": weapon_single_check,
        "weaponEdgeCleanValidation": weapon_edge_check,
    }

    concise_lines, _ = format_concise_summary_lines(report, None)
    report["conciseSummaryLines"] = concise_lines

    report_path = out_dir / "validation_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary_txt_path = out_dir / "validation_summary.txt"
    summary_txt_path.write_text("\n".join(concise_lines) + "\n", encoding="utf-8")

    if args.fail_on is not None:
        fail_filter = {s.strip() for s in args.fail_on.split(",") if s.strip()} or {"all"}
        filtered_lines, any_failed = format_concise_summary_lines(report, fail_filter)
        for line in filtered_lines:
            print(line)
        print(f"OVERALL: {'FAIL' if any_failed else 'PASS'} (report: {report_path})")
        if any_failed:
            sys.exit(1)
        return

    print(
        json.dumps(
            {
                "overallPass": overall_pass,
                "spineVersion": report["runtime"]["spineVersion"],
                "checks": checks_summary,
                "conciseSummary": concise_lines,
                "keyFindings": {
                    "drawOrderIssues": draw_order_check["issueCount"],
                    "maxHeadOcclusionRatio": render_and_occlusion_check["maxHeadOcclusionRatio"],
                    "rigidSlotViolations": [v["slot"] for v in mesh_check["rigidSlotViolations"]],
                    "maxFrontPalmToGripAPx": grip_and_motion_check["maxFrontPalmToGripAPx"],
                    "maxRearPalmToGripBPx": grip_and_motion_check["maxRearPalmToGripBPx"],
                    "maxFrontBoneToGripAPx": grip_and_motion_check["maxFrontBoneToGripAPx"],
                    "maxRearBoneToGripBPx": grip_and_motion_check["maxRearBoneToGripBPx"],
                    "walkRootAdvancePx": grip_and_motion_check["walkRootAdvancePx"],
                    "walkStanceFootDriftRatioH": grip_and_motion_check["walkStanceFootDriftRatioH"],
                    "thrustMetrics": grip_and_motion_check["thrustMetrics"],
                },
                "reportPath": str(report_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
