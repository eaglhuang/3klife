import json
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from slice_and_rig import build_neutral_rig_v2

class TestV31BonesAlignment(unittest.TestCase):
    def test_bones_29_exact_match_with_canonical_spec_v31(self):
        spec_path = Path(__file__).resolve().parent.parent / "specs" / "canonical_skeleton_v3.json"
        spec = json.loads(spec_path.read_text(encoding="utf-8"))

        expected_bones = spec.get("bones", [])
        self.assertEqual(len(expected_bones), 29, "v3.1 canonical_skeleton 必須包含 29 根骨骼")

        # 模擬 dummy landmarks_info 與 placed_regions
        landmarks_info = {
            "points": {
                "root": [1024, 1900],
                "pelvis": [1024, 1260],
                "waist": [1024, 1130],
                "chest": [1024, 980],
                "neck": [1030, 880],
                "head_center": [1040, 580],
                "shoulder_f": [1120, 925],
                "elbow_f": [1230, 1080],
                "wrist_f": [1330, 1180],
                "shoulder_b": [930, 925],
                "elbow_b": [820, 1080],
                "wrist_b": [715, 1180],
                "hip_f": [1085, 1290],
                "knee_f": [1120, 1580],
                "ankle_f": [1135, 1850],
                "hip_b": [963, 1290],
                "knee_b": [930, 1580],
                "ankle_b": [915, 1850],
                "grip_A": [1365, 1225],
                "grip_B": [680, 1225],
            },
            "bodyHeightPx": 1600.0,
        }

        trimmed_parts = {
            "cape": {"empty": False, "visiblePixels": 100},
        }
        placed_regions = {}

        # 執行 build_neutral_rig_v2
        rig = build_neutral_rig_v2(
            landmarks_info=landmarks_info,
            placed_regions=placed_regions,
            trimmed_parts=trimmed_parts,
            canvas_size=(2048, 2048),
            source_sha256="dummy",
            atlas_filename="dummy.png",
            atlas_size=(2048, 2048),
            padding=2,
            weapon_source_mode="dummy",
            rig_schema="v2",
            canonical_spec=spec,
        )

        actual_bones = rig["bones"]
        self.assertEqual(len(actual_bones), 29, "build_neutral_rig_v2 輸出的骨骼數量須為 29 根")

        # 逐根嚴格比對 (名稱、父子關係、世界樞紐 ±1 px)
        for i in range(29):
            exp_b = expected_bones[i]
            act_b = actual_bones[i]

            self.assertEqual(act_b["name"], exp_b["name"], f"第 {i+1} 根骨骼名稱不相符")
            self.assertEqual(act_b["parent"], exp_b["parent"], f"骨骼 {act_b['name']} 的 parent 不相符")

            exp_piv = exp_b["pivotCanvasPx"]
            act_piv = act_b["pivotSourcePx"]
            self.assertIsNotNone(act_piv, f"骨骼 {act_b['name']} 的 pivot 不應為 None")

            err_x = abs(act_piv[0] - exp_piv[0])
            err_y = abs(act_piv[1] - exp_piv[1])
            self.assertLessEqual(err_x, 1.0, f"骨骼 {act_b['name']} X 樞紐誤差超標: exp={exp_piv[0]}, act={act_piv[0]}")
            self.assertLessEqual(err_y, 1.0, f"骨骼 {act_b['name']} Y 樞紐誤差超標: exp={exp_piv[1]}, act={act_piv[1]}")

        # 特別驗證關鍵新增骨骼與樞紐轉移 (AG-14 細項)
        bone_map = {b["name"]: b for b in actual_bones}
        # 1. hand_f / hand_b 樞紐在拳心孔 (grip_A / grip_B)
        self.assertEqual(bone_map["hand_f"]["pivotSourcePx"], [1365, 1225])
        self.assertEqual(bone_map["hand_b"]["pivotSourcePx"], [680, 1225])

        # 2. weapon_grip_rear 父骨為 weapon，在握點後方 448 px
        self.assertEqual(bone_map["weapon_grip_rear"]["parent"], "weapon")
        self.assertEqual(bone_map["weapon_grip_rear"]["pivotSourcePx"], [917, 1225])

        # 3. foot_f / foot_b 父骨為 ik_foot_f / ik_foot_b
        self.assertEqual(bone_map["foot_f"]["parent"], "ik_foot_f")
        self.assertEqual(bone_map["foot_b"]["parent"], "ik_foot_b")

        # 4. hair_tail 鏈與 skirt 鏈
        self.assertEqual(bone_map["hair_tail_mid"]["parent"], "hair_tail")
        self.assertEqual(bone_map["hair_tail_tip"]["parent"], "hair_tail_mid")
        self.assertEqual(bone_map["skirt_mid"]["parent"], "skirt")
        self.assertEqual(bone_map["skirt_tip"]["parent"], "skirt_mid")

if __name__ == "__main__":
    unittest.main()
