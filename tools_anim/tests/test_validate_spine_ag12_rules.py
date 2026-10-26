import json
import os
import sys
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from validate_spine import (
    check_weapon_single_piece,
    check_weapon_edge_cleanliness,
    check_grip_and_motion,
)

class TestValidateSpineAG12Rules(unittest.TestCase):
    def test_weapon_single_piece_allows_spear_tip_helper_bone(self):
        # 測試：骨骼包含 weapon 與 spear_tip，但只有 weapon 掛載了 attachment
        skel = {
            "bones": [
                {"name": "root"},
                {"name": "weapon", "parent": "hand_f"},
                {"name": "spear_tip", "parent": "weapon"},  # 無 attachment 的輔助骨
            ],
            "slots": [
                {"name": "weapon", "bone": "weapon", "attachment": "weapon"},
            ],
            "skins": [
                {
                    "name": "default",
                    "attachments": {
                        "weapon": {
                            "weapon": {"type": "region", "path": "weapon"}
                        }
                    }
                }
            ]
        }
        res = check_weapon_single_piece(skel)
        self.assertTrue(res["pass"], f"允許無 attachment 的 spear_tip 輔助骨，應 PASS: {res.get('issues')}")

    def test_weapon_edge_cleanliness_multicore(self):
        # 建立複合色武器: 核心區域同時包含深藍色 (0, 30, 180) 與銀白色 (230, 235, 240)
        h, w = 100, 100
        crop = np.zeros((h, w, 4), dtype=np.uint8)
        # 核心區域 (y: 20..80, x: 20..80)
        crop[20:50, 20:80] = [0, 30, 180, 255]     # 藍金槍桿
        crop[50:80, 20:80] = [230, 235, 240, 255] # 銀白槍刃
        # 邊緣像素 (1~2 px): 帶有銀白或深藍微透明 (alpha: 150)
        crop[18:20, 20:80] = [0, 30, 180, 150]
        crop[80:82, 20:80] = [230, 235, 240, 150]

        atlas_info = {
            "regions": {
                "weapon": {"x": 0, "y": 0, "width": w, "height": h}
            }
        }
        res = check_weapon_edge_cleanliness(atlas_info, crop)
        self.assertTrue(res["pass"], f"複合材質武器邊緣應 PASS，實際 dirtyRatio={res.get('dirtyRatio')}")
        self.assertLess(res["dirtyRatio"], 0.01)

    def test_palm_grip_estimated_does_not_fail(self):
        # 測試：當手部接觸點是估算值 (alpha 重心) 時，只提示 WARN，不觸發硬性 FAIL
        palm_info = {
            "palmContactPoints": {
                "hand_f": {"localX": 10.0, "localY": 15.0, "isEstimatedFromAlphaCentroid": True},
                "hand_b": {"localX": 8.0, "localY": 12.0, "isEstimatedFromAlphaCentroid": True},
            }
        }
        eval_data = {
            "animations": {
                "idle": {"frames": []},
                "walk": {"frames": []},
                "thrust": {"frames": []},
            }
        }
        res = check_grip_and_motion(eval_data, palm_info, rig_data=None)
        self.assertTrue(res["palmGripIsEstimated"])
        self.assertTrue(res["palmGripLe1PxPass"], "估算值不應判定 FAIL")
        self.assertEqual(res["palmGripStatus"], "WARN_ESTIMATED")

if __name__ == "__main__":
    unittest.main()
