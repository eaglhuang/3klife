import unittest
import numpy as np
import cv2
import json
import tempfile
from pathlib import Path
from PIL import Image

from tools_anim.check_layered_parts import (
    find_fist_hole_center,
    check_grip_enclosure_rays,
    run_layered_parts_inspection,
)


class TestAG40MainComponentAndDetachedIslands(unittest.TestCase):
    """
    AG-40: 握孔須由主體圍成，新增游離碎片檢查
    1. gripRegistration / grip_point_accuracy 僅以主連通區 (alpha >= 128) 判定
    2. detachedIslands (alpha > 16, 面積 >= 200px) 檢查，先當 ADVISORY
    3. 規格允許多連通區時豁免
    """

    def test_detached_islands_detected_advisory(self):
        """測試偵測到游離碎片時標為 ADVISORY 且不拉低整體 PASS"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            parts_p = tmp_p / "parts"
            parts_p.mkdir()

            spec_p = tmp_p / "spec.json"
            spec_data = {
                "schema": "test_v3",
                "canvas": {"w": 512, "h": 512},
                "H": 500,
                "joints": {"root": {"x": 256, "y": 256}},
                "layeredSlots": {
                    "names": ["cape"],
                    "canvas": [512, 512],
                    "hiddenExtensionH": 0.03,
                    "rotationTestDeg": 15,
                },
            }
            spec_p.write_text(json.dumps(spec_data), encoding="utf-8")

            # cape 為 anchor_only 部件，不檢驗膠囊邊界，只專注檢驗 detachedIslands
            arr = np.zeros((512, 512, 4), dtype=np.uint8)
            # 主體: 100x100 = 10,000 px
            arr[200:300, 200:300] = [200, 100, 100, 255]
            # 游離島: 25x20 = 500 px (>= 200 px)
            arr[400:425, 400:420] = [200, 100, 100, 255]

            Image.fromarray(arr).save(parts_p / "cape.png")

            rep, ok = run_layered_parts_inspection(parts_p, spec_p)
            cape_rep = rep["slotReports"]["cape"]
            di = cape_rep["checks"]["detachedIslands"]

            self.assertEqual(di["islandsCount"], 1)
            self.assertEqual(di["tier"], "ADVISORY")
            self.assertTrue(di["advisory"])
            self.assertEqual(di["islands"][0]["areaPx"], 500)
            self.assertEqual(di["islands"][0]["bbox"], [400, 400, 420, 425])
            # ADVISORY 不拉低 slot 的 pass
            self.assertTrue(cape_rep["pass"])
            self.assertEqual(cape_rep["tier"], "PASS")

    def test_detached_islands_spec_waiver(self):
        """測試規格欄位 allowDetachedIslands 豁免游離碎片"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            parts_p = tmp_p / "parts"
            parts_p.mkdir()

            spec_p = tmp_p / "spec.json"
            spec_data = {
                "schema": "test_v3",
                "canvas": {"w": 512, "h": 512},
                "H": 500,
                "joints": {"root": {"x": 256, "y": 256}},
                "segments": {
                    "cape": {
                        "allowDetachedIslands": True,
                    }
                },
                "layeredSlots": {
                    "names": ["cape"],
                    "canvas": [512, 512],
                    "hiddenExtensionH": 0.03,
                    "rotationTestDeg": 15,
                },
            }
            spec_p.write_text(json.dumps(spec_data), encoding="utf-8")

            arr = np.zeros((512, 512, 4), dtype=np.uint8)
            arr[200:300, 200:300] = [200, 100, 100, 255]
            arr[400:425, 400:420] = [200, 100, 100, 255]
            Image.fromarray(arr).save(parts_p / "cape.png")

            rep, ok = run_layered_parts_inspection(parts_p, spec_p)
            cape_rep = rep["slotReports"]["cape"]
            di = cape_rep["checks"]["detachedIslands"]

            self.assertTrue(di["allowedBySpec"])
            self.assertEqual(di["tier"], "PASS")
            self.assertTrue(di["pass"])

    def test_grip_uses_main_component_only_rejects_detached_arc(self):
        """測試握點檢查僅使用主連通區，阻擋由游離碎片偽造的拳孔"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            parts_p = tmp_p / "parts"
            parts_p.mkdir()

            spec_p = tmp_p / "spec.json"
            spec_data = {
                "schema": "test_v3",
                "canvas": {"w": 512, "h": 512},
                "H": 500,
                "joints": {"wrist": {"x": 200, "y": 200}},
                "grips": {"grip_A": {"x": 256, "y": 256}},
                "segments": {
                    "hand_f": {
                        "center": "grip_A",
                        "radius": 40.0,
                    }
                },
                "layeredSlots": {
                    "names": ["hand_f"],
                    "canvas": [512, 512],
                    "hiddenExtensionH": 0.03,
                    "rotationTestDeg": 15,
                    "gripTolerancePx": 12.0,
                },
            }
            spec_p.write_text(json.dumps(spec_data), encoding="utf-8")

            # 建立 hand_f:
            # 1. 拳頭主體在上方 (y 100~180)，面積 ~6400 px，根本沒有在 (256, 256) 握住
            arr = np.zeros((512, 512, 4), dtype=np.uint8)
            arr[100:180, 200:280] = [180, 150, 120, 255]

            # 2. 獨立游離弧片在 (256, 256) 附近形成一個中空環 (外徑 30, 內徑 10)，面積 ~1200 px
            cv2.circle(arr, (256, 256), 30, [120, 120, 120, 255], thickness=-1)
            cv2.circle(arr, (256, 256), 10, [0, 0, 0, 0], thickness=-1)

            Image.fromarray(arr).save(parts_p / "hand_f.png")

            rep, ok = run_layered_parts_inspection(parts_p, spec_p)
            hand_rep = rep["slotReports"]["hand_f"]
            gp = hand_rep["checks"]["grip_point_accuracy"]
            gr = hand_rep["checks"]["gripRegistration"]

            # 主連通區是上方的拳頭主體 (面積 6400 px)，環是獨立連通區 (面積 ~1200 px)
            self.assertEqual(gp["mainComponentAreaPx"], 6400)
            self.assertFalse(gp["holeFound"])
            self.assertEqual(gp["tier"], "FAIL")
            self.assertFalse(gp["pass"])

            # 射線包覆也只測主連通區 (上方拳頭主體無法 8 方向包覆 (256, 256))
            self.assertEqual(gr["mainComponentAreaPx"], 6400)
            self.assertFalse(gr["pass"])

            # hand_f 總結必須為 FAIL
            self.assertEqual(hand_rep["tier"], "FAIL")
            self.assertFalse(hand_rep["pass"])

    def test_grip_normal_hand_passes(self):
        """測試正常握拳手 (拳孔在主連通區本體內) 能順利通過"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            parts_p = tmp_p / "parts"
            parts_p.mkdir()

            spec_p = tmp_p / "spec.json"
            spec_data = {
                "schema": "test_v3",
                "canvas": {"w": 512, "h": 512},
                "H": 500,
                "joints": {"wrist": {"x": 200, "y": 200}},
                "grips": {"grip_A": {"x": 256, "y": 256}},
                "segments": {
                    "hand_f": {
                        "center": "grip_A",
                        "radius": 40.0,
                    }
                },
                "layeredSlots": {
                    "names": ["hand_f"],
                    "canvas": [512, 512],
                    "hiddenExtensionH": 0.03,
                    "rotationTestDeg": 15,
                    "gripTolerancePx": 12.0,
                },
            }
            spec_p.write_text(json.dumps(spec_data), encoding="utf-8")

            # 拳頭主體在 (256, 256)，外半徑 35，內孔半徑 8
            arr = np.zeros((512, 512, 4), dtype=np.uint8)
            cv2.circle(arr, (256, 256), 35, [180, 150, 120, 255], thickness=-1)
            cv2.circle(arr, (256, 256), 8, [0, 0, 0, 0], thickness=-1)

            Image.fromarray(arr).save(parts_p / "hand_f.png")

            rep, ok = run_layered_parts_inspection(parts_p, spec_p)
            hand_rep = rep["slotReports"]["hand_f"]
            gp = hand_rep["checks"]["grip_point_accuracy"]
            gr = hand_rep["checks"]["gripRegistration"]

            self.assertTrue(gp["holeFound"])
            self.assertLessEqual(gp["distancePx"], 12.0)
            self.assertEqual(gp["tier"], "PASS")
            self.assertTrue(gp["pass"])

            self.assertTrue(gr["pass"])
            self.assertEqual(gr["raysHit"], 8)


    def test_extension_quantization_tolerance_r317_arm_lower_f_passes(self):
        """AG-40 補充：R317 preserve-grip-v1 的 arm_lower_f 實測 47.4 px 在 1 px 容差內應判 PASS"""
        from tools_anim.check_layered_parts import derive_joint_connections, check_slot_hidden_extension

        spec_path = Path("tools_anim/specs/canonical_skeleton_v3.json")
        with open(spec_path, encoding="utf-8") as sf:
            spec = json.load(sf)

        conns = derive_joint_connections(spec)
        target_conn = [c for c in conns if c["id"] == "arm_lower_f_to_hand_f"][0]

        piv_pt = target_conn["pivot"]
        p_start_pt = target_conn["parent_pivot"]
        dir_p = (piv_pt[0] - p_start_pt[0], piv_pt[1] - p_start_pt[1])

        r317_arm_path = Path(r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r305-final-candidate\parts-r317-preserve-grip-v1\arm_lower_f.png")
        if not r317_arm_path.exists():
            self.skipTest("無 R317 候選部件目錄，跳過此項測試")

        im = Image.open(r317_arm_path).convert("RGBA")
        arr = np.array(im)

        # 規格要求 48.0 px，未帶容差時判定為 FAIL (47.376 px < 48.0 px)
        passed_raw, ext_val = check_slot_hidden_extension(arr, piv_pt, dir_p, min_ext_px=48.0, quantization_tol_px=0.0)
        self.assertFalse(passed_raw)
        self.assertAlmostEqual(ext_val, 47.376, delta=0.1)

        # 套用 v3.20 容差 1.0 px (實質門檻 47.0 px) 後，應順利判定為 PASS
        passed_tol, ext_val = check_slot_hidden_extension(arr, piv_pt, dir_p, min_ext_px=48.0, quantization_tol_px=1.0)
        self.assertTrue(passed_tol)

    def test_extension_quantization_tolerance_boundary_fail(self):
        """AG-40 補充：人造案例 46.9 px (超出 1 px 容差) 必須判定為 FAIL，47.1 px 判定為 PASS"""
        from tools_anim.check_layered_parts import check_slot_hidden_extension

        piv_pt = (100.0, 100.0)
        dir_p = (1.0, 0.0)  # 向右延伸
        min_ext_px = 48.0
        tol_px = 1.0  # 門檻 47.0 px

        # 建立人造圖 1: 延伸 46.9 px (x 最大為 146.9)
        arr_fail = np.zeros((200, 200, 4), dtype=np.uint8)
        arr_fail[100, int(100 + 46.9)] = [255, 255, 255, 255]
        p_fail, ext_fail = check_slot_hidden_extension(arr_fail, piv_pt, dir_p, min_ext_px, tol_px)
        self.assertFalse(p_fail)
        self.assertAlmostEqual(ext_fail, 46.0, delta=1.0)

        # 建立人造圖 2: 延伸 47.2 px (x 最大為 147.2)
        arr_pass = np.zeros((200, 200, 4), dtype=np.uint8)
        arr_pass[100, int(100 + 47.2)] = [255, 255, 255, 255]
        p_pass, ext_pass = check_slot_hidden_extension(arr_pass, piv_pt, dir_p, min_ext_px, tol_px)
        self.assertTrue(p_pass)
        self.assertAlmostEqual(ext_pass, 47.0, delta=1.0)


if __name__ == "__main__":
    unittest.main()
