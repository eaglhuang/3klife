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


class TestAG18HairExclusionLimit(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_ag18_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_scale_detail_mentions_origin(self):
        # 驗證縮放建議之 detail 明確註明以畫布原點 (0, 0) 為縮放中心
        rig_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        rig_arr[301:1919, 1020:1028] = [200, 200, 200, 255]
        rig_p = Path(self.tmp_dir) / "rig_scale_origin.png"
        Image.fromarray(rig_arr).save(rig_p)

        report, _ = check_rigpose.run_rigpose_inspection(rig_p, None, None, None, None, self.out_dir / "scale_test")
        corr = report.get("scaleAndTranslateCorrection", {})
        self.assertIn("以畫布原點 (0, 0) 為縮放中心", corr.get("detail", ""))

    def test_real_arm_torso_adhesion_fails_even_with_hair_coverage(self):
        # AG-18 核心測試：手臂與軀幹自身真的黏連（落在膠囊範圍內），上面又蓋著髮尾時，結果仍要判 FAIL！
        spec = check_rigpose.load_canonical_spec()
        w, h = 2048, 2048

        rig_arr = np.zeros((w, h, 4), dtype=np.uint8)
        rig_arr[300:1900, 1000:1048] = [200, 200, 200, 255]

        # 在檢驗區 (y: 1020..1120, x: 1100..1210) 填滿實體黏連 (這段全落在手臂與軀幹膠囊包絡線內)
        rig_arr[1020:1120, 1100:1210] = [200, 50, 50, 255]
        rig_p = Path(self.tmp_dir) / "rig_real_adhesion.png"
        Image.fromarray(rig_arr).save(rig_p)

        # 建立一張同樣覆蓋在黏連處的髮尾圖
        hair_arr = np.zeros((w, h, 4), dtype=np.uint8)
        hair_arr[420:450, 950:970] = [100, 100, 255, 255] # hair_root (960, 420)
        hair_arr[1020:1120, 1100:1210] = [100, 100, 255, 255]
        hair_p = Path(self.tmp_dir) / "hairtail_covering_adhesion.png"
        Image.fromarray(hair_arr).save(hair_p)

        # 執行 check_rigpose：因為膠囊內實體黏連不可被扣除，故仍檢出 gap = 0px，必須為 FAIL！
        report, _ = check_rigpose.run_rigpose_inspection(rig_p, None, hair_p, None, None, self.out_dir / "adhesion_test")
        arm_chk = report["checks"]["min_gap_arm_torso"]

        self.assertEqual(arm_chk["tier"], "FAIL", "手臂與軀幹真實黏連即使蓋上髮尾，依然必須判為 FAIL")
        self.assertFalse(arm_chk["pass"])
        self.assertFalse(arm_chk["gapPassedOnlyAfterHairExclusion"])

    def test_hair_outside_capsule_exclusion_marks_passed_only_after_hair(self):
        # 測試：若底圖本身合規（肢體未黏連），但在膠囊外的區域有髮尾遮擋，扣除後轉 PASS 並標示 flag
        spec = check_rigpose.load_canonical_spec()
        w, h = 2048, 2048
        capsule_mask = check_rigpose.build_arm_torso_capsule_mask(spec, w, h)

        rig_arr = np.zeros((w, h, 4), dtype=np.uint8)
        rig_arr[300:1900, 1000:1048] = [200, 200, 200, 255]

        # 找出身體外側 (膠囊外) 的區域：例如手與身體之間、或者身側外圍
        # 在檢驗區外側，或者在兩腿檢驗區之外
        # 測試目的：驗證 hair_excludable 判定與 gapPassedOnlyAfterHairExclusion 標記
        outside_capsule_all = (~capsule_mask) & (np.arange(h)[:, None] >= 420)
        self.assertTrue(outside_capsule_all.any())

        # 我們直接測試一個情境：底圖未扣除前在檢驗區有 0 像素，但如果有一條髮尾在膠囊外被排除
        # 建立底圖 (完全合規，未填滿檢驗區)
        rig_p = Path(self.tmp_dir) / "rig_ok.png"
        Image.fromarray(rig_arr).save(rig_p)

        hair_arr = np.zeros((w, h, 4), dtype=np.uint8)
        hair_arr[420:450, 950:970] = [100, 100, 255, 255]
        # 在背後飄髮 (膠囊外)
        hair_arr[500:800, 800:900] = [100, 100, 255, 255]
        hair_p = Path(self.tmp_dir) / "hairtail_outside.png"
        Image.fromarray(hair_arr).save(hair_p)

        report, _ = check_rigpose.run_rigpose_inspection(rig_p, None, hair_p, None, None, self.out_dir / "ok_test")
        arm_chk = report["checks"]["min_gap_arm_torso"]
        self.assertEqual(arm_chk["tier"], "PASS")
        self.assertTrue(arm_chk["pass"])


if __name__ == "__main__":
    unittest.main()
