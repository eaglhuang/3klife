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


class TestCheckRigposeGapThresholds(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_gap_thresholds_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _create_canvas_with_gaps(self, arm_gap: int, leg_gap: int, hand_gap: int) -> Path:
        arr = np.zeros((2048, 2048, 4), dtype=np.uint8)

        # 基礎身形 (合規尺寸)
        arr[300:400, 1000:1048] = [200, 200, 200, 255]  # 頭
        arr[400:1900, 1000:1048] = [200, 200, 200, 255] # 軀幹中軸

        # 7.1 手臂與軀幹 (y: 1020..1120, x: 1100..1210)
        # 寬度 110px。若要保留連續透明 run = arm_gap，則在其餘區域填上像素
        # 例如從 1100 + arm_gap 到 1210 填實
        if arm_gap < 110:
            arr[1020:1120, 1100 + arm_gap:1210] = [200, 200, 200, 255]

        # 7.2 兩腿 (y: 1480..1620, x: 980..1060)
        # 寬度 80px。若要連續透明 run = leg_gap
        if leg_gap < 80:
            arr[1480:1620, 980 + leg_gap:1060] = [200, 200, 200, 255]

        # 7.3 手部與非相連部位 (y: 1160..1290, hand_f 在 1150..1285, hand_b 在 760..950)
        if hand_gap < 135:
            arr[1160:1290, 1150 + hand_gap:1285] = [200, 200, 200, 255]
            arr[1160:1290, 760 + hand_gap:950] = [200, 200, 200, 255]

        img = Image.fromarray(arr)
        img_p = Path(self.tmp_dir) / f"gaps_{arm_gap}_{leg_gap}_{hand_gap}.png"
        img.save(img_p)
        return img_p

    def test_gaps_reach_spec_pass(self):
        # 達到規格門檻 (arm >= 20, leg >= 16, hand >= 16)
        img_p = self._create_canvas_with_gaps(arm_gap=20, leg_gap=16, hand_gap=16)
        report, _ = check_rigpose.run_rigpose_inspection(img_p, None, None, None, None, self.out_dir)

        checks = report["checks"]
        self.assertEqual(checks["min_gap_arm_torso"]["tier"], "PASS")
        self.assertTrue(checks["min_gap_arm_torso"]["pass"])

        self.assertEqual(checks["min_gap_legs"]["tier"], "PASS")
        self.assertTrue(checks["min_gap_legs"]["pass"])

        self.assertEqual(checks["min_gap_hand_to_any"]["tier"], "PASS")
        self.assertTrue(checks["min_gap_hand_to_any"]["pass"])

    def test_gaps_below_spec_fail_no_snap(self):
        # 低於規格門檻 (例如 arm=19, leg=15, hand=15)，必須為 FAIL 且不得為 SNAP
        img_p = self._create_canvas_with_gaps(arm_gap=19, leg_gap=15, hand_gap=15)
        report, _ = check_rigpose.run_rigpose_inspection(img_p, None, None, None, None, self.out_dir)

        checks = report["checks"]
        self.assertEqual(checks["min_gap_arm_torso"]["tier"], "FAIL")
        self.assertFalse(checks["min_gap_arm_torso"]["pass"])
        self.assertNotEqual(checks["min_gap_arm_torso"]["tier"], "SNAP")

        self.assertEqual(checks["min_gap_legs"]["tier"], "FAIL")
        self.assertFalse(checks["min_gap_legs"]["pass"])
        self.assertNotEqual(checks["min_gap_legs"]["tier"], "SNAP")

        self.assertEqual(checks["min_gap_hand_to_any"]["tier"], "FAIL")
        self.assertFalse(checks["min_gap_hand_to_any"]["pass"])
        self.assertNotEqual(checks["min_gap_hand_to_any"]["tier"], "SNAP")

    def test_gaps_read_from_spec_json_dynamically(self):
        # 測試門檻非寫死，而是讀取 spec["minGapPx"]
        orig_load = check_rigpose.load_canonical_spec
        custom_spec = orig_load()
        custom_spec["minGapPx"] = {
            "arm_to_torso": 35,
            "leg_to_leg": 25,
            "hand_to_any": 30,
        }
        check_rigpose.load_canonical_spec = lambda: custom_spec
        try:
            # 在 arm=25 (<35), leg=20 (<25), hand=25 (<30) 下原本 PASS，在客製化 spec 下應 FAIL
            img_p = self._create_canvas_with_gaps(arm_gap=25, leg_gap=20, hand_gap=25)
            report, _ = check_rigpose.run_rigpose_inspection(img_p, None, None, None, None, self.out_dir)
            checks = report["checks"]
            self.assertEqual(checks["min_gap_arm_torso"]["tier"], "FAIL")
            self.assertEqual(checks["min_gap_legs"]["tier"], "FAIL")
            self.assertEqual(checks["min_gap_hand_to_any"]["tier"], "FAIL")
            self.assertIn(">=35px", checks["min_gap_arm_torso"]["detail"])
            self.assertIn(">=25px", checks["min_gap_legs"]["detail"])
            self.assertIn(">=30px", checks["min_gap_hand_to_any"]["detail"])
        finally:
            check_rigpose.load_canonical_spec = orig_load


if __name__ == "__main__":
    unittest.main()
