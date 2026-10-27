#!/usr/bin/env python3
"""從 v3 標準骨架 JSON 生成 Spine 4.2 骨架與分槽 Skin (build_spine_from_v3.py)

工單：AG-24
功能：
1. 輸入：
   - 骨架規範 JSON（預設 mailbox/specs/綁骨標準骨架v3.json 或 tools_anim/specs/canonical_skeleton_v3.json）
   - 分槽資料夾，每槽一張 2048x2048 原位 PNG（檔名為 <slot_name>.png）
2. 輸出：
   - Spine 4.2 JSON (<name>.json)
   - Spine .atlas 檔 (<name>.atlas) 與圖集 PNG (<name>.png)
   - 離線驗證報告 (<name>_build_report.json)
3. 嚴格遵循小組規範：
   - 骨骼座標與階層完全由 JSON 換算，y 軸翻轉精確對應。不得有任何武將名特例或寫死座標。
   - layeredSlots 21 槽位，槽名即骨名。
   - drawOrder 優先讀取 JSON；若無則使用建議順序並在報告中提示提報核定。
   - attachment 位移由「原位 bbox 中心 - 骨骼世界座標」算出，確保 setup pose 完美重疊。
   - 缺槽輸出空 slot，報告標註 MISSING，嚴禁用舊圖補。
   - 支援套用 jointOverrides（如 foot 父骨改為 shin、weapon 剛性接 hand_f）。
   - 報告明確標註：離線檢查，未經 Cocos 驗證。
"""
from __future__ import annotations

import argparse
import copy
import json
import math
import os
import sys
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image

# drawOrder 完全依據規範 JSON 中的 layeredSlots.drawOrder，程式內無任何寫死或預設順序



def load_v3_spec(spec_path: str | Path) -> dict[str, Any]:
    """載入 v3 骨架規範 JSON。"""
    p = Path(spec_path)
    if not p.exists():
        raise FileNotFoundError(f"找不到骨架規範 JSON: {spec_path}")
    return json.loads(p.read_text(encoding="utf-8"))


def compute_spine_bones(
    spec: dict[str, Any],
    apply_joint_overrides: bool = True,
) -> tuple[list[dict[str, Any]], dict[str, tuple[float, float]], tuple[float, float]]:
    """依據 v3 JSON 的 bones 與 layeredSlots.jointOverrides 計算 Spine 骨骼階層與局部座標。

    回傳：
    - bones_spine: 符合 Spine 4.2 的骨骼列表 [{"name": ..., "parent": ..., "x": ..., "y": ...}]
    - world_coords: 每個骨骼相對於 root 的世界座標 (world_x, world_y)（y 向上）
    - root_pivot: 畫布上的 root 樞紐點 (root_canvas_x, root_canvas_y)
    """
    raw_bones = spec.get("bones", [])
    if not raw_bones:
        raise ValueError("規範 JSON 中缺少 'bones' 列表")

    # 尋找頂層骨骼樞紐點 (無 parent 者)
    root_bone = next((b for b in raw_bones if not b.get("parent")), None)
    if root_bone and "pivotCanvasPx" in root_bone:
        root_px = float(root_bone["pivotCanvasPx"][0])
        root_py = float(root_bone["pivotCanvasPx"][1])
    else:
        canvas_info = spec.get("canvas", {})
        cw = float(canvas_info.get("w", 2048))
        ch = float(canvas_info.get("h", 2048))
        root_px = cw * 0.5
        root_py = float(spec.get("groundY", ch * 0.9277))

    root_pivot = (root_px, root_py)

    # 處理 jointOverrides
    overrides = {}
    if apply_joint_overrides:
        overrides = spec.get("layeredSlots", {}).get("jointOverrides", {})

    # 建立骨骼設定映射表
    bone_defs: dict[str, dict[str, Any]] = {}
    for b in raw_bones:
        b_name = b["name"]
        parent = b.get("parent")
        if apply_joint_overrides and b_name in overrides:
            ov = overrides[b_name]
            if isinstance(ov, dict) and "parent" in ov:
                parent = ov["parent"]
        piv = [float(b["pivotCanvasPx"][0]), float(b["pivotCanvasPx"][1])]
        bone_defs[b_name] = {
            "name": b_name,
            "parent": parent,
            "pivotCanvasPx": piv,
        }

    # 計算世界座標：Wx = Px - root_px, Wy = root_py - Py (y 翻轉)
    world_coords: dict[str, tuple[float, float]] = {}
    for b_name, b_data in bone_defs.items():
        px, py = b_data["pivotCanvasPx"]
        wx = px - root_px
        wy = root_py - py
        world_coords[b_name] = (wx, wy)

    # 計算 Spine 局部座標 (local_x, local_y)
    bones_spine: list[dict[str, Any]] = []
    for b in raw_bones:
        b_name = b["name"]
        b_info = bone_defs[b_name]
        parent = b_info["parent"]
        wx, wy = world_coords[b_name]

        bone_entry: dict[str, Any] = {"name": b_name}
        if parent is not None:
            bone_entry["parent"] = parent
            p_wx, p_wy = world_coords[parent]
            lx = wx - p_wx
            ly = wy - p_wy
            bone_entry["x"] = round(lx, 2)
            bone_entry["y"] = round(ly, 2)
        else:
            # root 骨骼
            bone_entry["x"] = 0.0
            bone_entry["y"] = 0.0

        bones_spine.append(bone_entry)

    return bones_spine, world_coords, root_pivot


def pack_atlas_shelf(
    crops: dict[str, np.ndarray],
    padding: int = 2,
    max_width: int = 2048,
) -> tuple[np.ndarray, dict[str, dict[str, int]]]:
    """使用 Shelf Packing 演算法將裁切後的部件貼圖打包至單張圖集 PNG。

    回傳：
    - atlas_img: RGBA 圖集 numpy array
    - atlas_regions: 每個部件在圖集中的位置與原始尺寸資訊
      { slot_name: { "x": ..., "y": ..., "w": ..., "h": ... } }
    """
    sorted_slots = sorted(crops.keys(), key=lambda s: crops[s].shape[0], reverse=True)

    # 簡易 shelf packing
    shelf_x = padding
    shelf_y = padding
    shelf_h = 0
    placements: dict[str, tuple[int, int, int, int]] = {}

    for s_name in sorted_slots:
        img = crops[s_name]
        ih, iw = img.shape[:2]

        if shelf_x + iw + padding > max_width:
            # 換下一行
            shelf_x = padding
            shelf_y += shelf_h + padding
            shelf_h = 0

        placements[s_name] = (shelf_x, shelf_y, iw, ih)
        shelf_x += iw + padding
        if ih > shelf_h:
            shelf_h = ih

    atlas_h = shelf_y + shelf_h + padding
    # 向上對齊至 2 的冪或適當高度
    final_h = max(256, int(math.pow(2, math.ceil(math.log2(max(1, atlas_h))))))
    final_w = max_width

    atlas_img = np.zeros((final_h, final_w, 4), dtype=np.uint8)
    atlas_regions: dict[str, dict[str, int]] = {}

    for s_name, (rx, ry, rw, rh) in placements.items():
        atlas_img[ry : ry + rh, rx : rx + rw] = crops[s_name]
        atlas_regions[s_name] = {
            "x": rx,
            "y": ry,
            "w": rw,
            "h": rh,
        }

    return atlas_img, atlas_regions


def generate_spine_atlas_text(
    atlas_filename: str,
    atlas_w: int,
    atlas_h: int,
    regions: dict[str, dict[str, int]],
) -> str:
    """生成 Spine legacy .atlas 格式字串。"""
    lines = [
        atlas_filename,
        f"size: {atlas_w},{atlas_h}",
        "format: RGBA8888",
        "filter: Linear,Linear",
        "repeat: none",
    ]
    for r_name, r_info in regions.items():
        lines.append(r_name)
        lines.append("  rotate: false")
        lines.append(f"  xy: {r_info['x']}, {r_info['y']}")
        lines.append(f"  size: {r_info['w']}, {r_info['h']}")
        lines.append(f"  orig: {r_info['w']}, {r_info['h']}")
        lines.append("  offset: 0, 0")
        lines.append("  index: -1")
    return "\n".join(lines) + "\n"


def build_spine_from_v3(
    spec: dict[str, Any],
    parts_dir: str | Path,
    output_dir: str | Path,
    skeleton_name: str = "character",
    apply_joint_overrides: bool = True,
    padding: int = 2,
) -> dict[str, Any]:
    """主流程：從 v3 規範與分槽原位圖建立 Spine 4.2 骨架、圖集與驗收報告。"""
    p_dir = Path(parts_dir)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    layered_slots_spec = spec.get("layeredSlots", {})
    slot_names = layered_slots_spec.get("names", [])
    if not slot_names:
        raise ValueError("規範 JSON 中缺少 layeredSlots.names")

    # 決定 drawOrder（強制由 JSON 讀取，若缺直接報錯，維護 JSON 為唯一來源）
    draw_order = layered_slots_spec.get("drawOrder")
    if not draw_order or not isinstance(draw_order, list):
        raise ValueError("規範 JSON 中缺少 'layeredSlots.drawOrder'，無法確定繪製順序；請先於 JSON 定義核定順序")

    # 驗證 drawOrder 必須剛好是 names 的重新排列，不多不少
    if len(draw_order) != len(slot_names) or set(draw_order) != set(slot_names):
        missing_in_draw = set(slot_names) - set(draw_order)
        extra_in_draw = set(draw_order) - set(slot_names)
        raise ValueError(
            f"layeredSlots.drawOrder 與 names 不一致！"
            f"缺少: {list(missing_in_draw)}, 多餘: {list(extra_in_draw)}"
        )
    draw_order_source = "json"

    # 1. 計算骨骼
    bones_spine, world_coords, root_pivot = compute_spine_bones(
        spec, apply_joint_overrides=apply_joint_overrides
    )

    # 2. 讀取分槽圖檔並計算 bbox 與 attachment 偏移
    crops: dict[str, np.ndarray] = {}
    crop_bboxes: dict[str, tuple[int, int, int, int]] = {}
    missing_slots: list[str] = []
    active_attachments: dict[str, dict[str, Any]] = {}
    raw_images: dict[str, np.ndarray] = {}

    canvas_w = int(spec.get("canvas", {}).get("w", 2048))
    canvas_h = int(spec.get("canvas", {}).get("h", 2048))

    for s_name in slot_names:
        img_path = p_dir / f"{s_name}.png"
        if not img_path.exists():
            missing_slots.append(s_name)
            continue

        img_bgr = cv2.imread(str(img_path), cv2.IMREAD_UNCHANGED)
        if img_bgr is None or img_bgr.ndim != 3 or img_bgr.shape[2] != 4:
            missing_slots.append(s_name)
            continue

        raw_images[s_name] = img_bgr
        alpha = img_bgr[..., 3]
        ys, xs = np.where(alpha > 0)
        if len(xs) == 0 or len(ys) == 0:
            missing_slots.append(s_name)
            continue

        min_x, max_x = int(xs.min()), int(xs.max())
        min_y, max_y = int(ys.min()), int(ys.max())

        crop = img_bgr[min_y : max_y + 1, min_x : max_x + 1].copy()
        crops[s_name] = crop
        crop_bboxes[s_name] = (min_x, min_y, max_x, max_y)

        # 計算原位 bbox 中心
        w = max_x - min_x + 1
        h = max_y - min_y + 1
        cx_canvas = min_x + w / 2.0
        cy_canvas = min_y + h / 2.0

        # 換算為 Spine 世界座標 (Wx = cx - root_px, Wy = root_py - cy)
        cx_world = cx_canvas - root_pivot[0]
        cy_world = root_pivot[1] - cy_canvas

        # 骨骼世界座標
        if s_name not in world_coords:
            raise KeyError(f"槽位 '{s_name}' 在骨骼階層中找不到對應骨骼")

        bone_wx, bone_wy = world_coords[s_name]

        # attachment 局部偏移 = 原位 bbox 中心 - 骨骼世界座標
        att_x = cx_world - bone_wx
        att_y = cy_world - bone_wy

        active_attachments[s_name] = {
            "x": round(att_x, 2),
            "y": round(att_y, 2),
            "width": int(w),
            "height": int(h),
            "canvasBbox": [min_x, min_y, max_x, max_y],
            "canvasCenter": [cx_canvas, cy_canvas],
        }

    # 3. 圖集打包
    atlas_png_name = f"{skeleton_name}.png"
    atlas_file_name = f"{skeleton_name}.atlas"
    atlas_img, atlas_regions = pack_atlas_shelf(crops, padding=padding, max_width=canvas_w)

    cv2.imwrite(str(out_dir / atlas_png_name), atlas_img)
    atlas_text = generate_spine_atlas_text(
        atlas_png_name, atlas_img.shape[1], atlas_img.shape[0], atlas_regions
    )
    (out_dir / atlas_file_name).write_text(atlas_text, encoding="utf-8")

    # 4. 組裝 Spine 4.2 JSON
    spine_slots: list[dict[str, Any]] = []
    skin_attachments: dict[str, dict[str, Any]] = {}

    for s_name in draw_order:
        slot_def: dict[str, Any] = {
            "name": s_name,
            "bone": s_name,
        }
        if s_name in active_attachments:
            slot_def["attachment"] = s_name
            att_info = active_attachments[s_name]
            skin_attachments[s_name] = {
                s_name: {
                    "x": att_info["x"],
                    "y": att_info["y"],
                    "width": att_info["width"],
                    "height": att_info["height"],
                }
            }
        spine_slots.append(slot_def)

    # 計算整體包圍邊界 (skeleton bounds)
    all_min_x, all_min_y = 0.0, 0.0
    all_max_x, all_max_y = 0.0, 0.0
    first_b = True
    for s_name, att_info in active_attachments.items():
        b_wx, b_wy = world_coords[s_name]
        cx = b_wx + att_info["x"]
        cy = b_wy + att_info["y"]
        hw = att_info["width"] * 0.5
        hh = att_info["height"] * 0.5
        bx1, bx2 = cx - hw, cx + hw
        by1, by2 = cy - hh, cy + hh
        if first_b:
            all_min_x, all_max_x = bx1, bx2
            all_min_y, all_max_y = by1, by2
            first_b = False
        else:
            all_min_x = min(all_min_x, bx1)
            all_max_x = max(all_max_x, bx2)
            all_min_y = min(all_min_y, by1)
            all_max_y = max(all_max_y, by2)

    skel_w = round(all_max_x - all_min_x, 2) if not first_b else float(canvas_w)
    skel_h = round(all_max_y - all_min_y, 2) if not first_b else float(canvas_h)

    spine_json_data = {
        "skeleton": {
            "spine": "4.2.00",
            "x": round(all_min_x, 2),
            "y": round(all_min_y, 2),
            "width": skel_w,
            "height": skel_h,
            "fps": 30,
            "images": "./",
            "audio": "",
        },
        "bones": bones_spine,
        "slots": spine_slots,
        "skins": [
            {
                "name": "default",
                "attachments": skin_attachments,
            }
        ],
        "animations": {
            "idle": {}
        },
    }

    json_file_name = f"{skeleton_name}.json"
    (out_dir / json_file_name).write_text(
        json.dumps(spine_json_data, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # 5. 離線 Setup Pose 軟體渲染與原位疊圖比對
    reassembled_canvas = np.zeros((canvas_h, canvas_w, 4), dtype=np.uint8)
    direct_overlay_canvas = np.zeros((canvas_h, canvas_w, 4), dtype=np.uint8)

    for s_name in draw_order:
        if s_name not in crops:
            continue
        # 直接疊合
        raw_img = raw_images[s_name]
        raw_a = raw_img[..., 3:4].astype(np.float32) / 255.0
        direct_overlay_canvas[..., :3] = np.clip(
            direct_overlay_canvas[..., :3] * (1.0 - raw_a) + raw_img[..., :3] * raw_a, 0, 255
        ).astype(np.uint8)
        direct_overlay_canvas[..., 3:4] = np.clip(
            direct_overlay_canvas[..., 3:4] * (1.0 - raw_a) + raw_img[..., 3:4], 0, 255
        ).astype(np.uint8)

        # 透過 Spine 骨骼座標重組
        b_wx, b_wy = world_coords[s_name]
        att = active_attachments[s_name]
        c_world_x = b_wx + att["x"]
        c_world_y = b_wy + att["y"]
        c_can_x = c_world_x + root_pivot[0]
        c_can_y = root_pivot[1] - c_world_y

        cw = att["width"]
        ch = att["height"]
        # 左上角
        put_x = int(round(c_can_x - cw / 2.0))
        put_y = int(round(c_can_y - ch / 2.0))

        crop = crops[s_name]
        # 貼至重組畫布
        alpha_crop = crop[..., 3:4].astype(np.float32) / 255.0
        roi = reassembled_canvas[put_y : put_y + ch, put_x : put_x + cw]
        roi[..., :3] = np.clip(roi[..., :3] * (1.0 - alpha_crop) + crop[..., :3] * alpha_crop, 0, 255).astype(np.uint8)
        roi[..., 3:4] = np.clip(roi[..., 3:4] * (1.0 - alpha_crop) + crop[..., 3:4], 0, 255).astype(np.uint8)

    # 比對兩者最大色差
    diff = np.abs(reassembled_canvas.astype(np.int16) - direct_overlay_canvas.astype(np.int16))
    max_pixel_diff = int(diff.max())
    reassembly_pass = max_pixel_diff <= 1

    # 輸出驗收報告
    report = {
        "schema": "3klife.spine-build-report.v1",
        "verificationScope": "offline-spine-build-check-only (NOT Cocos runtime verified)",
        "overallPass": reassembly_pass,
        "skeleton": {
            "name": skeleton_name,
            "bonesCount": len(bones_spine),
            "slotsCount": len(spine_slots),
            "activeAttachmentsCount": len(active_attachments),
            "missingSlots": missing_slots,
            "missingSlotsCount": len(missing_slots),
        },
        "drawOrderSource": draw_order_source,
        "drawOrder": draw_order,
        "jointOverridesApplied": apply_joint_overrides,
        "rootPivotCanvasPx": list(root_pivot),
        "reassemblyDiff": {
            "maxPixelDiff": max_pixel_diff,
            "pass": reassembly_pass,
            "tolerancePx": 1,
            "detail": f"Setup pose 重組與各槽原位疊合逐像素差異最大為 {max_pixel_diff} px (容差 <= 1 px)",
        },
        "outputs": {
            "json": str(out_dir / json_file_name),
            "atlas": str(out_dir / atlas_file_name),
            "png": str(out_dir / atlas_png_name),
        },
    }

    report_file_name = f"{skeleton_name}_build_report.json"
    (out_dir / report_file_name).write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    return report


def main() -> int:
    parser = argparse.ArgumentParser(
        description="從 v3 標準骨架 JSON 生成 Spine 4.2 骨架與分槽 skin (AG-24)"
    )
    parser.add_argument(
        "--spec",
        default="mailbox/specs/綁骨標準骨架v3.json",
        help="v3 標準骨架規範 JSON 路徑",
    )
    parser.add_argument(
        "--parts-dir",
        required=True,
        help="分槽圖檔資料夾（每槽一張 2048x2048 原位 PNG）",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="輸出資料夾",
    )
    parser.add_argument(
        "--name",
        default="character",
        help="骨架名稱（預設 character）",
    )
    parser.add_argument(
        "--no-joint-overrides",
        action="store_true",
        help="不套用 layeredSlots.jointOverrides",
    )
    parser.add_argument(
        "--padding",
        type=int,
        default=2,
        help="圖集切片間隔 (預設 2 px)",
    )

    args = parser.parse_args()

    # 檢查規範檔案
    spec_path = Path(args.spec)
    if not spec_path.exists():
        # 嘗試從 tools_anim/specs/ 讀取 fallback
        fallback = Path(__file__).resolve().parent / "specs" / "canonical_skeleton_v3.json"
        if fallback.exists():
            spec_path = fallback
        else:
            print(f"錯誤：找不到規範 JSON: {args.spec}", file=sys.stderr)
            return 1

    spec = load_v3_spec(spec_path)

    try:
        rep = build_spine_from_v3(
            spec=spec,
            parts_dir=args.parts_dir,
            output_dir=args.output_dir,
            skeleton_name=args.name,
            apply_joint_overrides=not args.no_joint_overrides,
            padding=args.padding,
        )
    except Exception as e:
        print(f"生成失敗: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

    print("=== Spine 4.2 骨架建置完成 ===")
    print(f"骨骼數: {rep['skeleton']['bonesCount']}")
    print(f"槽位數: {rep['skeleton']['slotsCount']}")
    print(f"有效附件數: {rep['skeleton']['activeAttachmentsCount']}")
    print(f"缺失槽位數: {rep['skeleton']['missingSlotsCount']}")
    print(f"drawOrder 來源: {rep['drawOrderSource']}")
    print(f"Setup pose 重組驗證: {'PASS' if rep['reassemblyDiff']['pass'] else 'FAIL'} (最大差 {rep['reassemblyDiff']['maxPixelDiff']} px)")
    print(f"報告儲存於: {rep['outputs']['json']}")

    return 0 if rep["overallPass"] else 2


if __name__ == "__main__":
    sys.exit(main())
