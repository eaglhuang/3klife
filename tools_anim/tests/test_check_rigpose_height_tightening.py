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

class TestCheckRigposeHeightTightening(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_rigpose_h_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _save_dummy_image(self, top_y: int, bot_y: int) -> Path:
        # 建立 2048x2048 圖像，在指定 top_y 和 bot_y 範圍繪製像素
        arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        # 頭部像素 (x: 950..1050, y: top_y..top_y+100)
        arr[top_y:top_y+100, 950:1050] = [180, 180, 180, 255]
        # 身體像素 (x: 980..1068, y: top_y+100..bot_y-50)
        arr[top_y+100:bot_y-50, 980:1068] = [180, 180, 180, 255]
        # 雙腳像素 (x: 1000..1048, y: bot_y-50..bot_y)
        arr[bot_y-50:bot_y+1, 1000:1048] = [180, 180, 180, 255]
        img = Image.fromarray(arr)
        img_path = Path(self.tmp_dir) / f"rigpose_{top_y}_{bot_y}.png"
        img.save(img_path)
        return img_path

    def test_height_pass_at_canonical_v3(self):
        # 標準: 頭頂 y=300 (diff=0 <= 20), 腳底 y=1900 (diff=0 <= 10)
        img_path = self._save_dummy_image(top_y=300, bot_y=1900)
        report, _ = run_rigpose_inspection(img_path, None, None, None, None, self.out_dir)
        checks = report["checks"]
        self.assertTrue(checks["head_top"]["pass"], "頭頂 y=300 應 PASS")
        self.assertTrue(checks["ground_line"]["pass"], "腳底 y=1900 應 PASS")
        self.assertTrue(checks["body_height_H"]["pass"], "身高校驗應 PASS")

    def test_head_too_high_fail(self):
        # 頭頂 y=250 (超出 300±20 容差)
        img_path = self._save_dummy_image(top_y=250, bot_y=1900)
        report, _ = run_rigpose_inspection(img_path, None, None, None, None, self.out_dir)
        checks = report["checks"]
        self.assertFalse(checks["head_top"]["pass"], "頭頂 y=250 應 FAIL")
        self.assertFalse(checks["body_height_H"]["pass"], "身高校驗應 FAIL")

    def test_head_too_low_fail(self):
        # 頭頂 y=350 (超出 300±20 容差)
        img_path = self._save_dummy_image(top_y=350, bot_y=1900)
        report, _ = run_rigpose_inspection(img_path, None, None, None, None, self.out_dir)
        checks = report["checks"]
        self.assertFalse(checks["head_top"]["pass"], "頭頂 y=350 應 FAIL")
        self.assertFalse(checks["body_height_H"]["pass"], "身高校驗應 FAIL")

    def test_ground_line_mismatch_fail(self):
        # 腳底 y=1870 (超出 1900±10 容差)
        img_path = self._save_dummy_image(top_y=300, bot_y=1870)
        report, _ = run_rigpose_inspection(img_path, None, None, None, None, self.out_dir)
        checks = report["checks"]
        self.assertFalse(checks["ground_line"]["pass"], "腳底 y=1870 應 FAIL")
        self.assertFalse(checks["body_height_H"]["pass"], "身高校驗應 FAIL")

if __name__ == "__main__":
    unittest.main()
