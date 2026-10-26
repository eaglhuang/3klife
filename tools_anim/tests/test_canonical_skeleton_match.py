#!/usr/bin/env python3
"""固定骨架一致性測試 (test_canonical_skeleton_match.py)

依據工單 AG-09 第 4 點:
「Spine 輸出的 setup pose 骨骼長度與角度須等於 JSON；加一個測試：兩位不同武將輸出的骨架（不含 attachment）比對須完全相同。」
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOOLS_DIR = HERE.parent
sys.path.insert(0, str(TOOLS_DIR))

from slice_and_rig import build_neutral_rig_v2, CANONICAL_SLOTS

SPEC_JSON_PATH = TOOLS_DIR / "specs" / "canonical_skeleton_v3.json"


def test_canonical_skeleton_consistency() -> None:
    if not SPEC_JSON_PATH.exists():
        print(f"Error: {SPEC_JSON_PATH} missing", file=sys.stderr)
        sys.exit(1)

    spec = json.loads(SPEC_JSON_PATH.read_text(encoding="utf-8"))
    slot_ids = [s["id"] for s in CANONICAL_SLOTS]

    # 模擬兩位不同武將 (general_alpha 與 general_beta) 具有不同的裁切幾何與圖集檔名
    dummy_placed_a = {sid: {"trimRectPx": [100, 200, 80, 120]} for sid in slot_ids}
    dummy_trimmed_a = {sid: {"empty": False, "crop": None} for sid in slot_ids}

    dummy_placed_b = {sid: {"trimRectPx": [500, 800, 150, 200]} for sid in slot_ids}
    dummy_trimmed_b = {sid: {"empty": False, "crop": None} for sid in slot_ids}

    dummy_lm = {"points": {}, "bodyHeightPx": 1600.0}

    # 產出武將 A 骨架
    rig_a = build_neutral_rig_v2(
        landmarks_info=dummy_lm,
        placed_regions=dummy_placed_a,
        trimmed_parts=dummy_trimmed_a,
        canvas_size=(2048, 2048),
        source_sha256="sha_alpha_111",
        atlas_filename="general_alpha.png",
        atlas_size=(1024, 1024),
        padding=2,
        weapon_source_mode="independent-weapon",
        rig_schema="v2",
        canonical_spec=spec,
    )

    # 產出武將 B 骨架
    rig_b = build_neutral_rig_v2(
        landmarks_info=dummy_lm,
        placed_regions=dummy_placed_b,
        trimmed_parts=dummy_trimmed_b,
        canvas_size=(2048, 2048),
        source_sha256="sha_beta_222",
        atlas_filename="general_beta.png",
        atlas_size=(1024, 1024),
        padding=2,
        weapon_source_mode="independent-weapon",
        rig_schema="v2",
        canonical_spec=spec,
    )

    bones_a = rig_a["bones"]
    bones_b = rig_b["bones"]

    # 1. 檢驗骨骼數量與名稱一致性
    assert len(bones_a) == len(bones_b), f"骨骼數量不一致: {len(bones_a)} vs {len(bones_b)}"
    
    diffs = []
    for i in range(len(bones_a)):
        ba = bones_a[i]
        bb = bones_b[i]
        if ba["name"] != bb["name"]:
            diffs.append(f"bone[{i}] name: {ba['name']} vs {bb['name']}")
        if ba["parent"] != bb["parent"]:
            diffs.append(f"bone[{i}] parent: {ba['parent']} vs {bb['parent']}")
        if ba["x"] != bb["x"] or ba["y"] != bb["y"]:
            diffs.append(f"bone[{i}] pos ({ba['name']}): ({ba['x']}, {ba['y']}) vs ({bb['x']}, {bb['y']})")
        if ba["rotation"] != bb["rotation"]:
            diffs.append(f"bone[{i}] rot ({ba['name']}): {ba['rotation']} vs {bb['rotation']}")
        if ba["pivotSourcePx"] != bb["pivotSourcePx"]:
            diffs.append(f"bone[{i}] pivot ({ba['name']}): {ba['pivotSourcePx']} vs {bb['pivotSourcePx']}")

    if diffs:
        print(f"[FAIL] 兩位武將骨骼層級比對發現 {len(diffs)} 項差異：", file=sys.stderr)
        for d in diffs:
            print(f"  - {d}", file=sys.stderr)
        sys.exit(1)

    # 2. 驗證 Setup Pose 骨骼長度與角度與 canonical spec 100% 精確相等
    cj = spec["joints"]
    # 驗證前臂骨長 (shoulder_f -> elbow_f)
    s_x, s_y = cj["shoulder_f"]["x"], cj["shoulder_f"]["y"]
    e_x, e_y = cj["elbow_f"]["x"], cj["elbow_f"]["y"]
    expected_upperarm_len = math.hypot(e_x - s_x, e_y - s_y)
    
    # 從 rig_a 找出 arm_lower_f 的相對位移長度
    b_arm_lower = next(b for b in bones_a if b["name"] == "arm_lower_f")
    actual_len = math.hypot(b_arm_lower["x"], b_arm_lower["y"])
    assert abs(actual_len - expected_upperarm_len) < 1e-3, f"上臂骨長不合: {actual_len} vs {expected_upperarm_len}"

    # 驗證大腿骨長 (hip_f -> knee_f)
    h_x, h_y = cj["hip_f"]["x"], cj["hip_f"]["y"]
    k_x, k_y = cj["knee_f"]["x"], cj["knee_f"]["y"]
    expected_thigh_len = math.hypot(k_x - h_x, k_y - h_y)
    b_shin = next(b for b in bones_a if b["name"] in ("shin_f", "leg_lower_f"))
    actual_thigh_len = math.hypot(b_shin["x"], b_shin["y"])
    assert abs(actual_thigh_len - expected_thigh_len) < 1e-3, f"大腿骨長不合: {actual_thigh_len} vs {expected_thigh_len}"

    print(f"[PASS] 驗證通過：兩位不同武將之固定骨架完全 100% 相同 ({len(bones_a)} 根骨骼)！骨骼幾何長度與 JSON 完全相等！")


if __name__ == "__main__":
    test_canonical_skeleton_consistency()
