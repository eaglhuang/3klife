import unittest
import numpy as np
import cv2
import json
import tempfile
import math
from pathlib import Path
from PIL import Image

from tools_anim.check_layered_parts import (
    extract_main_component_128,
    check_occluding_fist_grip,
    run_layered_parts_inspection,
)


class TestAG41OccludingFistGrip(unittest.TestCase):
    """
    AG-41 驗收測試：前手握點新增 occludingFist 判定 (規格 v3.21)
    1. 數值全由規格讀取 (modes, occludingFist 參數, drawOrder)
    2. R318 v4 (有孔) 以 hole 模式通過 PASS
    3. R318 v5_1 (無孔、拳頭蓋桿) 以 occludingFist 模式通過 PASS
    4. hand_b 依 drawOrder 不適用 occludingFist，維持嚴格 hole 模式
    5. 拳頭浮在槍桿上方 (R315 v3) 兩種模式皆 FAIL
    6. 槍桿軸向依 grip_A 與 grip_B 動態導出 (旋轉角度武器測試)
    7. occludingFist 模式下若 40px 內有透明孔，列 ADVISORY 可見孔但不擋 PASS
    """

    @classmethod
    def setUpClass(cls):
        cls.spec_path = Path(__file__).resolve().parent.parent / "specs" / "canonical_skeleton_v3.json"
        with open(cls.spec_path, encoding="utf-8") as f:
            cls.spec_data = json.load(f)
        cls.r305_base = Path(r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r305-final-candidate")

    def test_r318_v4_passes_as_hole_mode(self):
        """R318 v4 (有拳孔) 以 hole 模式通過 PASS"""
        cand_dir = self.r305_base / "parts-r318-hand-fist-v4"
        if not cand_dir.exists():
            self.skipTest("無 R318 v4 目錄，跳過")

        rep, ok = run_layered_parts_inspection(cand_dir, self.spec_path)
        hand_rep = rep["slotReports"]["hand_f"]
        chk = hand_rep["checks"]["grip_point_accuracy"]

        self.assertTrue(chk["pass"])
        self.assertEqual(chk["tier"], "PASS")
        self.assertEqual(chk["mode"], "hole")
        self.assertTrue(chk["holeFound"])
        self.assertLessEqual(chk["distancePx"], 12.0)

    def test_r318_v5_1_passes_as_occluding_fist_mode(self):
        """R318 v5_1 (無孔蓋桿) 以 occludingFist 模式通過 PASS"""
        cand_dir = self.r305_base / "parts-r318-hand-fist-v5_1"
        if not cand_dir.exists():
            self.skipTest("無 R318 v5_1 目錄，跳過")

        rep, ok = run_layered_parts_inspection(cand_dir, self.spec_path)
        hand_rep = rep["slotReports"]["hand_f"]
        chk = hand_rep["checks"]["grip_point_accuracy"]

        self.assertTrue(chk["pass"])
        self.assertEqual(chk["tier"], "PASS")
        self.assertEqual(chk["mode"], "occludingFist")
        self.assertIn("occludingFist", chk)

        occ = chk["occludingFist"]
        self.assertTrue(occ["pass"])
        self.assertTrue(occ["gripInsideMainComponent"])
        self.assertTrue(occ["minInset8DirectionsPass"])
        self.assertTrue(occ["shaftExitPass"])
        self.assertIsNotNone(occ["forwardExitDistPx"])
        self.assertIsNotNone(occ["backwardExitDistPx"])
        # 槍桿穿出應在 160 px 內 (實測約 50~60 px)
        self.assertLessEqual(occ["forwardExitDistPx"], 160.0)
        self.assertLessEqual(occ["backwardExitDistPx"], 160.0)

    def test_hand_b_rejects_occluding_fist(self):
        """hand_b 因 drawOrder 在 weapon 之前，不適用 occludingFist，蓋桿無孔拳頭在 hand_b 必 FAIL"""
        cand_dir = self.r305_base / "parts-r318-hand-fist-v5_1"
        if not (cand_dir / "hand_f.png").exists():
            self.skipTest("無 R318 v5_1 hand_f.png，跳過")

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            parts_p = tmp_p / "parts"
            parts_p.mkdir()

            # 將 v5_1 的無孔蓋桿手放成 hand_b (平移至 grip_B 位置: 680, 1225)
            # 原本握點在 grip_A (1365, 1225)，平移 dx = 680 - 1365 = -685
            im_f = Image.open(cand_dir / "hand_f.png").convert("RGBA")
            arr_f = np.array(im_f)
            M = np.float32([[1, 0, -685], [0, 1, 0]])
            arr_b = cv2.warpAffine(arr_f, M, (arr_f.shape[1], arr_f.shape[0]), flags=cv2.INTER_NEAREST)
            Image.fromarray(arr_b).save(parts_p / "hand_b.png")

            # 同時放 weapon
            if (cand_dir / "weapon.png").exists():
                Image.open(cand_dir / "weapon.png").save(parts_p / "weapon.png")

            rep, ok = run_layered_parts_inspection(parts_p, self.spec_path)
            hand_b_rep = rep["slotReports"]["hand_b"]
            chk = hand_b_rep["checks"]["grip_point_accuracy"]

            # hand_b 只能走 hole，找不到孔必 FAIL
            self.assertFalse(chk["pass"])
            self.assertEqual(chk["tier"], "FAIL")
            self.assertEqual(chk["mode"], "hole")
            self.assertFalse(chk["holeFound"])

    def test_r315_v3_fails_both_modes(self):
        """拳頭浮在槍桿上方 (R315 v3) 兩種模式皆 FAIL"""
        cand_dir = self.r305_base / "parts-r315-wrist-v3"
        if not cand_dir.exists():
            self.skipTest("無 R315 v3 目錄，跳過")

        rep, ok = run_layered_parts_inspection(cand_dir, self.spec_path)
        hand_rep = rep["slotReports"]["hand_f"]
        chk = hand_rep["checks"]["grip_point_accuracy"]

        self.assertFalse(chk["pass"])
        self.assertEqual(chk["tier"], "FAIL")
        self.assertIn("occludingFist", chk)
        self.assertFalse(chk["occludingFist"]["pass"])
        # 握點不在主連通區內
        self.assertFalse(chk["occludingFist"]["gripInsideMainComponent"])

    def test_occluding_fist_rotated_weapon_shaft_axis(self):
        """測試動態旋轉武器軸向 (45° 傾斜) 下 occludingFist 判定正確計算兩側穿出"""
        h, w = 512, 512
        grip_pt = (256.0, 256.0)
        deg = 45.0
        rad = math.radians(deg)
        shaft_u = (math.cos(rad), math.sin(rad))

        # 1. 建立 45° 傾斜的槍桿 (長度 400，寬度 12)
        weapon_arr = np.zeros((h, w, 4), dtype=np.uint8)
        pt1 = (int(round(grip_pt[0] - 150 * shaft_u[0])), int(round(grip_pt[1] - 150 * shaft_u[1])))
        pt2 = (int(round(grip_pt[0] + 150 * shaft_u[0])), int(round(grip_pt[1] + 150 * shaft_u[1])))
        cv2.line(weapon_arr, pt1, pt2, [180, 150, 100, 255], thickness=12)

        # 2. 建立蓋在握點上無孔手掌 (半徑 25 的實心圓)
        hand_arr = np.zeros((h, w, 4), dtype=np.uint8)
        cv2.circle(hand_arr, (int(grip_pt[0]), int(grip_pt[1])), 25, [220, 180, 140, 255], thickness=-1)

        res = check_occluding_fist_grip(
            hand_arr_main=hand_arr,
            hand_arr_raw=hand_arr,
            weapon_arr=weapon_arr,
            exp_pt=grip_pt,
            shaft_u=shaft_u,
            min_inset_px=12.0,
            shaft_exit_search_px=160.0,
        )

        self.assertTrue(res["pass"])
        self.assertTrue(res["gripInsideMainComponent"])
        self.assertTrue(res["minInset8DirectionsPass"])
        self.assertTrue(res["shaftExitPass"])
        # 手掌半徑 25，因此約在 26 px 處穿出
        self.assertAlmostEqual(res["forwardExitDistPx"], 26.0, delta=2.0)
        self.assertAlmostEqual(res["backwardExitDistPx"], 26.0, delta=2.0)

    def test_occluding_fist_visible_hole_advisory(self):
        """測試 occludingFist 模式下，若握點周圍 40px 內有被包圍之孔，列為 ADVISORY 且不擋 PASS"""
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
                "grips": {
                    "grip_A": {"x": 256, "y": 256},
                    "grip_B": {"x": 100, "y": 256},
                },
                "segments": {
                    "hand_f": {"center": "grip_A", "radius": 40.0},
                    "weapon": {"center": "grip_A", "radius": 40.0},
                },
                "layeredSlots": {
                    "names": ["hand_f", "weapon"],
                    "canvas": [512, 512],
                    "drawOrder": ["weapon", "hand_f"],
                    "gripRule": {
                        "modes": ["hole", "occludingFist"],
                        "occludingFistAppliesTo": "slotsDrawnAboveWeapon",
                        "occludingFist": {
                            "minInsetPx": 12,
                            "shaftExitSearchPx": 160,
                            "visibleHoleNearGrip": "advisory",
                        },
                    },
                    "gripTolerancePx": 12.0,
                },
            }
            spec_p.write_text(json.dumps(spec_data), encoding="utf-8")

            # 建立 weapon: 水平槍桿
            w_arr = np.zeros((512, 512, 4), dtype=np.uint8)
            w_arr[250:262, 50:450] = [180, 150, 100, 255]
            Image.fromarray(w_arr).save(parts_p / "weapon.png")

            # 建立 hand_f: 握點在 (256, 256)，半徑 35 的手掌實心覆蓋握點
            # 握點 8 方向 12px 都在掌內；但在 (256 + 25, 256) 處（距握點 25px <= 40px）有一個直徑 8px 的拳孔！
            # 由於孔距握點 25px > 12px，故 hole 模式 FAIL (dist=25 > 12px)
            # 但 occludingFist 模式條件 1,2,3 全過，應判 PASS，且因 25px <= 40px 列 visibleHoleNearGrip ADVISORY
            h_arr = np.zeros((512, 512, 4), dtype=np.uint8)
            cv2.circle(h_arr, (256, 256), 35, [220, 180, 140, 255], thickness=-1)
            cv2.circle(h_arr, (256 + 25, 256), 4, [0, 0, 0, 0], thickness=-1)
            Image.fromarray(h_arr).save(parts_p / "hand_f.png")

            rep, ok = run_layered_parts_inspection(parts_p, spec_p)
            hand_rep = rep["slotReports"]["hand_f"]
            chk = hand_rep["checks"]["grip_point_accuracy"]

            self.assertTrue(chk["pass"])
            self.assertEqual(chk["tier"], "PASS")
            self.assertEqual(chk["mode"], "occludingFist")
            self.assertTrue(chk.get("visibleHoleNearGrip", False))
            self.assertEqual(chk.get("visibleHoleTier"), "ADVISORY")


if __name__ == "__main__":
    unittest.main()
