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
from check_rigpose import run_rigpose_inspection

class TestCheckRigposeThreeTiers(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_rigpose_tiers_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _save_dummy_image(self, top_y: int, bot_y: int, center_x: int = 1024) -> Path:
        arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        # 頭部
        arr[top_y:top_y+100, center_x-50:center_x+50] = [180, 180, 180, 255]
        # 身體
        arr[top_y+100:bot_y-50, center_x-40:center_x+40] = [180, 180, 180, 255]
        # 腳部
        arr[bot_y-50:bot_y+1, center_x-30:center_x+30] = [180, 180, 180, 255]
        img = Image.fromarray(arr)
        img_path = Path(self.tmp_dir) / f"rig_{top_y}_{bot_y}_{center_x}.png"
        img.save(img_path)
        return img_path

    def test_tier_pass(self):
        # 剛好在標準容差內 (top=300 diff=0 <= 20, bot=1900 diff=0 <= 10)
        img_p = self._save_dummy_image(top_y=300, bot_y=1900)
        report, _ = run_rigpose_inspection(img_p, None, None, None, None, self.out_dir)
        self.assertEqual(report["checks"]["head_top"]["tier"], "PASS")
        self.assertEqual(report["checks"]["ground_line"]["tier"], "PASS")

    def test_tier_snap(self):
        # 偏差在 tol 外，但 <= 60px: 例如 top=340 (diff=40, 在 20~60 之間)
        img_p = self._save_dummy_image(top_y=340, bot_y=1900)
        report, _ = run_rigpose_inspection(img_p, None, None, None, None, self.out_dir)
        self.assertEqual(report["checks"]["head_top"]["tier"], "SNAP")
        self.assertEqual(report["checks"]["body_height_H"]["tier"], "SNAP")

    def test_tier_fail(self):
        # 偏差 > 60px: 例如 top=400 (diff=100 > 60)
        img_p = self._save_dummy_image(top_y=400, bot_y=1900)
        report, _ = run_rigpose_inspection(img_p, None, None, None, None, self.out_dir)
        self.assertEqual(report["checks"]["head_top"]["tier"], "FAIL")
        self.assertEqual(report["checks"]["body_height_H"]["tier"], "FAIL")

if __name__ == "__main__":
    unittest.main()
