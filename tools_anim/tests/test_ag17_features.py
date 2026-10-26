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


class TestAG17Features(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_ag17_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_hairtail_excluded_from_gap_check(self):
        # 1. 建立一張底圖，在兩腿間隙區 (y: 1480..1620, x: 980..1060，在手臂與軀幹膠囊外) 塗滿實心像素模擬長髮垂落
        rig_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        rig_arr[300:1900, 1000:1048] = [200, 200, 200, 255] # 中軸
        rig_arr[1480:1620, 980:1060] = [150, 100, 50, 255] # 模擬長髮尾垂入腿間隙

        rig_p = Path(self.tmp_dir) / "rig_with_hair_overlap.png"
        Image.fromarray(rig_arr).save(rig_p)

        # 若未傳入 hairtail_path，legs gap 應為 0 (FAIL)
        report_no_hair, _ = check_rigpose.run_rigpose_inspection(rig_p, None, None, None, None, self.out_dir / "no_hair")
        self.assertEqual(report_no_hair["checks"]["min_gap_legs"]["tier"], "FAIL")
        self.assertFalse(report_no_hair["checks"]["min_gap_legs"]["pass"])

        # 2. 建立獨立 hairtail.png，將該覆蓋區域註記為獨立髮尾
        hair_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        hair_arr[1480:1620, 980:1060] = [150, 100, 50, 255]
        # 髮尾根部放在 (960, 420)
        hair_arr[420:450, 950:970] = [150, 100, 50, 255]
        hair_p = Path(self.tmp_dir) / "hairtail.png"
        Image.fromarray(hair_arr).save(hair_p)

        # 傳入 hairtail_path，髮尾像素被自 gap 檢查排除，legs gap 應轉為 PASS
        report_with_hair, _ = check_rigpose.run_rigpose_inspection(rig_p, None, hair_p, None, None, self.out_dir / "with_hair")
        self.assertEqual(report_with_hair["checks"]["min_gap_legs"]["tier"], "PASS")
        self.assertTrue(report_with_hair["checks"]["min_gap_legs"]["pass"])

    def test_scale_and_translate_correction_calculation(self):
        # 測試地面線 1918、身高 1617 (如趙雲目前底圖) 的縮放評估
        # 建立底圖：top = 301, bot = 1918 -> actual_h = 1617
        rig_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        rig_arr[301:1919, 1020:1028] = [200, 200, 200, 255]
        rig_p = Path(self.tmp_dir) / "rig_zhaoyun_size.png"
        Image.fromarray(rig_arr).save(rig_p)

        report, _ = check_rigpose.run_rigpose_inspection(rig_p, None, None, None, None, self.out_dir / "scale_eval")
        corr = report.get("scaleAndTranslateCorrection", {})

        self.assertTrue(corr.get("feasible"))
        # 1600 / 1617 = 0.9895
        self.assertAlmostEqual(corr.get("scaleFactor"), 0.9895, places=3)
        self.assertAlmostEqual(corr.get("scaleDeviationPercent"), -1.05, places=1)
        self.assertIn("等比縮放", corr.get("detail", ""))

    def test_scale_correction_unfeasible_when_exceeding_8_percent(self):
        # 身高 1400 (太矮，需放大 1600/1400 = 1.1428，偏差 +14.28% > 8%)
        rig_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        rig_arr[500:1900, 1020:1028] = [200, 200, 200, 255]
        rig_p = Path(self.tmp_dir) / "rig_too_short.png"
        Image.fromarray(rig_arr).save(rig_p)

        report, _ = check_rigpose.run_rigpose_inspection(rig_p, None, None, None, None, self.out_dir / "scale_unfeasible")
        corr = report.get("scaleAndTranslateCorrection", {})
        self.assertFalse(corr.get("feasible"))
        self.assertIn("超出 ±8%", corr.get("detail", ""))


if __name__ == "__main__":
    unittest.main()
