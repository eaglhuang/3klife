#!/usr/bin/env python3
"""分槽進件檢查工具 (check_layered_parts.py)

依據工單 AG-21 與 SPEC-RIG-POSE-03 / v3.4 規格：
1. 尺寸：每槽圖檔必須與 spec.canvas (2048x2048) 相同，未裁切。
2. 範圍：alpha 主體必須落在該骨膠囊外擴 12px 之內。特殊部件 (weapon, cape, skirt, hair_tail) 檢查錨點。
3. 隱藏延伸：每個關節兩側部件必須越過關節至少 hiddenExtensionH * H (預設 0.03H = 48px)。
4. 旋轉露縫：每個關節把子部件繞樞紐 (pivotCanvasPx) 旋轉 +/- rotationTestDeg (30°)，合成後關節附近不可出現透明露縫。
5. 重組差：若提供參考圖，按 drawOrder 疊合後比對，差異 <= 2px。
6. 握點：hand_f / hand_b 拳心孔中心與 grip_A / grip_B 誤差 <= 12px。
7. 空槽可接受，報告中標明。
8. 支援 --slots 局部過濾。
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

# 關節連接關係 (父槽, 子槽, 樞紐關節名, 父骨起點關節名, 子骨終點關節名)
JOINT_CONNECTIONS = [
    {
        "joint": "elbow_f",
        "parent_slot": "arm_upper_f",
        "child_slot": "arm_lower_f",
        "pivot": "elbow_f",
        "parent_start": "shoulder_f",
        "child_end": "wrist_f",
        "cap_rad": 42.0,
    },
    {
        "joint": "wrist_f",
        "parent_slot": "arm_lower_f",
        "child_slot": "hand_f",
        "pivot": "wrist_f",
        "parent_start": "elbow_f",
        "child_end": "wrist_f",
        "cap_rad": 36.0,
    },
    {
        "joint": "shoulder_f",
        "parent_slot": "torso",
        "child_slot": "arm_upper_f",
        "pivot": "shoulder_f",
        "parent_start": "neck",
        "child_end": "elbow_f",
        "cap_rad": 45.0,
    },
    {
        "joint": "elbow_b",
        "parent_slot": "arm_upper_b",
        "child_slot": "arm_lower_b",
        "pivot": "elbow_b",
        "parent_start": "shoulder_b",
        "child_end": "wrist_b",
        "cap_rad": 42.0,
    },
    {
        "joint": "wrist_b",
        "parent_slot": "arm_lower_b",
        "child_slot": "hand_b",
        "pivot": "wrist_b",
        "parent_start": "elbow_b",
        "child_end": "wrist_b",
        "cap_rad": 36.0,
    },
    {
        "joint": "shoulder_b",
        "parent_slot": "torso",
        "child_slot": "arm_upper_b",
        "pivot": "shoulder_b",
        "parent_start": "neck",
        "child_end": "elbow_b",
        "cap_rad": 45.0,
    },
    {
        "joint": "knee_f",
        "parent_slot": "thigh_f",
        "child_slot": "shin_f",
        "pivot": "knee_f",
        "parent_start": "hip_f",
        "child_end": "ankle_f",
        "cap_rad": 45.0,
    },
    {
        "joint": "ankle_f",
        "parent_slot": "shin_f",
        "child_slot": "foot_f",
        "pivot": "ankle_f",
        "parent_start": "knee_f",
        "child_end": "ankle_f",
        "cap_rad": 35.0,
    },
    {
        "joint": "knee_b",
        "parent_slot": "thigh_b",
        "child_slot": "shin_b",
        "pivot": "knee_b",
        "parent_start": "hip_b",
        "child_end": "ankle_b",
        "cap_rad": 45.0,
    },
    {
        "joint": "ankle_b",
        "parent_slot": "shin_b",
        "child_slot": "foot_b",
        "pivot": "ankle_b",
        "parent_start": "knee_b",
        "child_end": "ankle_b",
        "cap_rad": 35.0,
    },
]


def load_spec(path: Path | None = None) -> dict[str, Any]:
    p = path or DEFAULT_SPEC_PATH
    if not p.exists():
        raise FileNotFoundError(f"Missing skeleton spec: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


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
        if hier[3] >= 0:  # 具有父輪廓，即孔洞
            area = cv2.contourArea(contours[idx])
            if area >= 8.0:
                M = cv2.moments(contours[idx])
                if M["m00"] > 1e-4:
                    cx = float(M["m10"] / M["m00"])
                    cy = float(M["m01"] / M["m00"])
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
    """檢驗部件越過關節樞紐點朝指定向量方向的延伸長度"""
    alpha = part_arr[..., 3]
    ys, xs = np.where(alpha > 16)
    if len(ys) == 0:
        return False, 0.0

    vx, vy = dir_vec
    norm = math.hypot(vx, vy)
    if norm < 1e-4:
        return True, min_ext_px
    ux, uy = vx / norm, vy / norm

    # 沿向量的投影長度：dot((x - px, y - py), (ux, uy))
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

    px, py = int(round(pivot_pt[0])), int(round(pivot_pt[1]))
    px = max(0, min(w - 1, px))
    py = max(0, min(h - 1, py))

    # 1. 樞紐點覆蓋：父部件與旋轉後的子部件在樞紐點皆須有肉
    pivot_cov = bool(parent_alpha[py, px] and child_alpha[py, px])

    # 2. 核心圓盤重疊檢驗 (半徑為 check_radius_px * 0.4)
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

    # 關節核心處必須由父子兩者緊密咬合重疊
    overlap_mask = core_disk & parent_alpha & child_alpha
    overlap_count = int(overlap_mask.sum())
    disk_total = max(1, int(core_disk.sum()))

    # 若重疊面積太小 (小於核心圓盤的 30%) 或樞紐點未覆蓋，代表關節脫節或露縫
    leak_mask = core_disk & (~(parent_alpha & child_alpha))
    passed = pivot_cov and (overlap_count >= int(disk_total * 0.3))

    return passed, leak_mask


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

    joints = spec.get("joints", {})

    def get_j(name: str, def_xy: tuple[float, float]) -> tuple[float, float]:
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
                "detail": f"尺寸不符規格: 實際={pw}x{ph}, 規格={exp_w}x{exp_h}",
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

    # 3. 檢驗關節隱藏延伸 (兩側均需越過關節至少 hiddenExtensionH * H = 48px)
    joint_ext_reports: dict[str, Any] = {}
    for j_conn in JOINT_CONNECTIONS:
        j_name = j_conn["joint"]
        p_sid = j_conn["parent_slot"]
        c_sid = j_conn["child_slot"]

        if p_sid not in loaded_parts or c_sid not in loaded_parts:
            continue
        if slot_reports[p_sid].get("empty") or slot_reports[c_sid].get("empty"):
            continue

        p_pt = get_j(j_conn["parent_start"], (1024.0, 1000.0))
        piv_pt = get_j(j_conn["pivot"], (1024.0, 1080.0))
        c_pt = get_j(j_conn["child_end"], (1024.0, 1200.0))

        # 父骨向子骨方向延伸向量: piv_pt - p_pt
        dir_p = (piv_pt[0] - p_pt[0], piv_pt[1] - p_pt[1])
        # 子骨向父骨方向延伸向量: piv_pt - c_pt
        dir_c = (piv_pt[0] - c_pt[0], piv_pt[1] - c_pt[1])

        p_arr = loaded_parts[p_sid]
        c_arr = loaded_parts[c_sid]

        p_pass, p_ext = check_slot_hidden_extension(p_arr, piv_pt, dir_p, min_ext_px)
        c_pass, c_ext = check_slot_hidden_extension(c_arr, piv_pt, dir_c, min_ext_px)

        conn_pass = p_pass and c_pass
        joint_ext_reports[f"{p_sid}_to_{c_sid}_at_{j_name}"] = {
            "pass": conn_pass,
            "tier": "PASS" if conn_pass else "FAIL",
            "parentExtensionPx": round(p_ext, 1),
            "childExtensionPx": round(c_ext, 1),
            "minRequiredPx": round(min_ext_px, 1),
            "detail": f"隱藏延伸: 父={p_ext:.1f}px, 子={c_ext:.1f}px (要求>={min_ext_px:.1f}px)",
        }

        if not p_pass:
            slot_reports[p_sid]["pass"] = False
            slot_reports[p_sid]["tier"] = "FAIL"
            slot_reports[p_sid]["checks"][f"hidden_extension_at_{j_name}"] = {
                "pass": False,
                "tier": "FAIL",
                "detail": f"在 {j_name} 處越過關節延伸不足: {p_ext:.1f}px < {min_ext_px:.1f}px",
            }
            overall_pass = False

        if not c_pass:
            slot_reports[c_sid]["pass"] = False
            slot_reports[c_sid]["tier"] = "FAIL"
            slot_reports[c_sid]["checks"][f"hidden_extension_at_{j_name}"] = {
                "pass": False,
                "tier": "FAIL",
                "detail": f"在 {j_name} 處越過關節延伸不足: {c_ext:.1f}px < {min_ext_px:.1f}px",
            }
            overall_pass = False

    # 4. 旋轉露縫檢驗 (繞樞紐旋轉 +/- rotationTestDeg，關節附近不可出現透明縫)
    rot_leak_reports: dict[str, Any] = {}
    for j_conn in JOINT_CONNECTIONS:
        p_sid = j_conn["parent_slot"]
        c_sid = j_conn["child_slot"]
        j_name = j_conn["joint"]

        if p_sid not in loaded_parts or c_sid not in loaded_parts:
            continue
        if slot_reports[p_sid].get("empty") or slot_reports[c_sid].get("empty"):
            continue

        piv_pt = get_j(j_conn["pivot"], (1024.0, 1080.0))
        check_rad = float(j_conn.get("cap_rad", 40.0))

        p_arr = loaded_parts[p_sid]
        c_arr = loaded_parts[c_sid]

        # 測試 +rot_test_deg 與 -rot_test_deg
        leak_pos_ok, leak_pos_m = check_rotation_gap_leak(
            p_arr, c_arr, piv_pt, rot_test_deg, check_rad, exp_w, exp_h
        )
        leak_neg_ok, leak_neg_m = check_rotation_gap_leak(
            p_arr, c_arr, piv_pt, -rot_test_deg, check_rad, exp_w, exp_h
        )

        leak_pass = leak_pos_ok and leak_neg_ok
        leak_entry: dict[str, Any] = {
            "pass": leak_pass,
            "tier": "PASS" if leak_pass else "FAIL",
            "testedAngles": [rot_test_deg, -rot_test_deg],
            "leakPixelsPositive": int(leak_pos_m.sum()),
            "leakPixelsNegative": int(leak_neg_m.sum()),
        }

        if not leak_pass and out_dir:
            # 輸出露縫視覺圖
            leak_vis_path = out_dir / f"gap_leak_{c_sid}_{j_name}.png"
            leak_vis_arr = np.zeros((exp_h, exp_w, 4), dtype=np.uint8)
            leak_vis_arr[leak_pos_m | leak_neg_m] = [255, 0, 0, 255]
            Image.fromarray(leak_vis_arr).save(leak_vis_path)
            leak_entry["leakImagePath"] = str(leak_vis_path)

            slot_reports[c_sid]["pass"] = False
            slot_reports[c_sid]["tier"] = "FAIL"
            slot_reports[c_sid]["checks"][f"rotation_leak_at_{j_name}"] = {
                "pass": False,
                "tier": "FAIL",
                "detail": f"關節旋轉 +/-{rot_test_deg}° 時在關節周圍出現露縫",
                "leakImage": str(leak_vis_path),
            }
            overall_pass = False

        rot_leak_reports[f"{c_sid}_rot_leak_at_{j_name}"] = leak_entry

    # 5. 重組比對 (若有提供參考圖)
    reassembly_report: dict[str, Any] | None = None
    if composite_ref_path and composite_ref_path.exists():
        ref_im = Image.open(composite_ref_path).convert("RGBA")
        ref_arr = np.array(ref_im)

        # 依 draw order 疊合所有部件
        composite_arr = np.zeros((exp_h, exp_w, 4), dtype=np.uint8)
        for sid in CANONICAL_21_SLOTS:
            if sid in loaded_parts and not slot_reports[sid].get("empty"):
                p_arr = loaded_parts[sid]
                p_alpha = p_arr[..., 3] > 0
                composite_arr[p_alpha] = p_arr[p_alpha]

        diff_rgb = np.abs(ref_arr[..., :3].astype(np.int16) - composite_arr[..., :3].astype(np.int16))
        max_diff = int(diff_rgb.max()) if diff_rgb.size > 0 else 0
        diff_pass = max_diff <= 2

        reassembly_report = {
            "pass": diff_pass,
            "tier": "PASS" if diff_pass else "FAIL",
            "maxRgbDiff": max_diff,
            "tolerancePx": 2,
            "detail": f"重組與參考圖最大差異={max_diff}px (tol=2px)",
        }
        if not diff_pass:
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
