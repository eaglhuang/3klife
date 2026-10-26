import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import check_rigpose
import validate_spine


class TestAG16NoHardcoding(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_ag16_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_hair_root_tolerance_reads_from_json(self):
        # 規格中 joints.hair_root.tol = 40
        # 建立一個髮尾圖，根部偏差 35 px (大於舊寫死值 25，但小於規格值 40)
        spec = check_rigpose.load_canonical_spec()
        hair_spec = spec.get("joints", {}).get("hair_root", {})
        tx = float(hair_spec.get("x", 960.0))
        ty = float(hair_spec.get("y", 420.0))
        tol = float(hair_spec.get("tol", 40.0))
        self.assertEqual(tol, 40.0)

        # 偏差 32 px
        actual_x = tx + 32.0
        actual_y = ty

        hair_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        hair_arr[int(actual_y):int(actual_y) + 50, int(actual_x) - 10:int(actual_x) + 10] = [200, 100, 50, 255]
        hair_p = Path(self.tmp_dir) / "hairtail.png"
        Image.fromarray(hair_arr).save(hair_p)

        # 建立一個合規的主圖
        rig_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        rig_arr[300:1900, 1000:1048] = [200, 200, 200, 255]
        rig_p = Path(self.tmp_dir) / "rigpose.png"
        Image.fromarray(rig_arr).save(rig_p)

        report, _ = check_rigpose.run_rigpose_inspection(rig_p, None, hair_p, None, None, self.out_dir)
        hair_chk = report["checks"]["hairtail_root_alignment"]

        # 偏差 32px 應小於 40px，判定 PASS (而非舊制的 SNAP/FAIL)
        self.assertEqual(hair_chk["tier"], "PASS")
        self.assertTrue(hair_chk["pass"])
        self.assertIn("tol=±40", hair_chk["detail"])

    def test_standing_center_reads_from_json(self):
        # 測試 standingCenter 與 standingCenterTol 動態讀取
        orig_load = check_rigpose.load_canonical_spec
        custom_spec = orig_load()
        custom_spec["standingCenter"] = 1000.0
        custom_spec["standingCenterTol"] = 15.0
        check_rigpose.load_canonical_spec = lambda: custom_spec

        try:
            # 建立腳部在 x=1000 偏差 12px (actual=1012, diff=12 <= 15 -> PASS)
            rig_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
            rig_arr[300:1900, 1010:1014] = [200, 200, 200, 255]
            rig_p = Path(self.tmp_dir) / "rigpose_center.png"
            Image.fromarray(rig_arr).save(rig_p)

            report, _ = check_rigpose.run_rigpose_inspection(rig_p, None, None, None, None, self.out_dir)
            center_chk = report["checks"]["standing_center"]
            self.assertEqual(center_chk["tier"], "PASS")
            self.assertIn("x=1000", center_chk["detail"])
            self.assertIn("tol=±15px", center_chk["detail"])
        finally:
            check_rigpose.load_canonical_spec = orig_load

    def test_spear_butt_tolerance_h_ratio(self):
        # 測試 0.01H 的槍尾離地容差
        # 在執行期 H = 480 px 時，0.01H = 4.8 px
        eval_data_480 = {
            "setupBones": {
                "root": {"worldY": 0.0},
                "head": {"worldY": 480.0},
            },
            "animations": {
                "thrust": {
                    "frames": [
                        # 槍尾低於地面 12.0 px (在舊制 -35px 下會誤判 PASS，在新制 0.01H = 4.8px 下必須判 FAIL)
                        {
                            "time": 0.5,
                            "frameIndex": 15,
                            "bones": {
                                "weapon_grip_rear": {"worldY": -12.0}
                            }
                        }
                    ]
                }
            }
        }

        res = validate_spine.check_spear_butt_above_ground(eval_data_480, None)
        self.assertFalse(res["pass"], "minButtY=-12.0 在 H=480 時超過 0.01H (4.8px)，必須為 FAIL")
        self.assertEqual(res["buttGroundToleranceH"], 0.01)
        self.assertAlmostEqual(res["effectiveBodyHeight"], 480.0, places=1)
        self.assertAlmostEqual(res["groundTolerancePx"], 4.8, places=1)

        # 槍尾在 -3.0 px (小於 4.8 px)，應為 PASS
        eval_data_pass = {
            "setupBones": {
                "root": {"worldY": 0.0},
                "head": {"worldY": 480.0},
            },
            "animations": {
                "thrust": {
                    "frames": [
                        {
                            "time": 0.5,
                            "frameIndex": 15,
                            "bones": {
                                "weapon_grip_rear": {"worldY": -3.0}
                            }
                        }
                    ]
                }
            }
        }
        res_pass = validate_spine.check_spear_butt_above_ground(eval_data_pass, None)
        self.assertTrue(res_pass["pass"], "minButtY=-3.0 在 H=480 時在 0.01H (4.8px) 容許內，必須為 PASS")


if __name__ == "__main__":
    unittest.main()
