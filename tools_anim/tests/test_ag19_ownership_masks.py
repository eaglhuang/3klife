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


class TestAG19OwnershipMasks(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_ag19_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_masks_generated_on_gap_fail(self):
        # 1. 建立一張 arm_torso gap = 0 (FAIL) 的全身底圖
        rig_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        rig_arr[300:1900, 1000:1048] = [200, 200, 200, 255]
        # 在檢驗區 (y: 1020..1120, x: 1100..1210) 填滿實體像素
        rig_arr[1020:1120, 1100:1210] = [200, 50, 50, 255]

        rig_p = Path(self.tmp_dir) / "rig_fail.png"
        Image.fromarray(rig_arr).save(rig_p)

        report, _ = check_rigpose.run_rigpose_inspection(rig_p, None, None, None, None, self.out_dir)

        # 驗證檢查項與報告頂層欄位
        arm_chk = report["checks"]["min_gap_arm_torso"]
        self.assertEqual(arm_chk["tier"], "FAIL")
        self.assertFalse(arm_chk["pass"])

        # 驗證三個檔案路徑存在於 checks 與 report
        self.assertIn("armCapsuleMask", arm_chk)
        self.assertIn("torsoCapsuleMask", arm_chk)
        self.assertIn("armTorsoSeparationBandMask", arm_chk)
        self.assertIn("separationBandOpaquePixels", arm_chk)

        self.assertIn("armCapsuleMask", report)
        self.assertIn("torsoCapsuleMask", report)
        self.assertIn("armTorsoSeparationBandMask", report)
        self.assertIn("separationBandOpaquePixels", report)

        arm_mask_p = Path(report["armCapsuleMask"])
        torso_mask_p = Path(report["torsoCapsuleMask"])
        band_mask_p = Path(report["armTorsoSeparationBandMask"])

        self.assertTrue(arm_mask_p.exists())
        self.assertTrue(torso_mask_p.exists())
        self.assertTrue(band_mask_p.exists())

        # 2. 驗證三張遮罩互不重疊且尺寸均為 2048x2048
        im_arm = Image.open(arm_mask_p)
        im_torso = Image.open(torso_mask_p)
        im_band = Image.open(band_mask_p)

        self.assertEqual(im_arm.size, (2048, 2048))
        self.assertEqual(im_torso.size, (2048, 2048))
        self.assertEqual(im_band.size, (2048, 2048))

        arr_arm = np.array(im_arm) > 128
        arr_torso = np.array(im_torso) > 128
        arr_band = np.array(im_band) > 128

        overlap_ta = int((arr_torso & arr_arm).sum())
        overlap_tb = int((arr_torso & arr_band).sum())
        overlap_ab = int((arr_arm & arr_band).sum())

        self.assertEqual(overlap_ta, 0, "手臂遮罩與軀幹遮罩不得重疊")
        self.assertEqual(overlap_tb, 0, "軀幹遮罩與分離帶不得重疊")
        self.assertEqual(overlap_ab, 0, "手臂遮罩與分離帶不得重疊")

        # 3. 驗證三張遮罩的像素總數與各自幾何定義一致
        band_px_count = int(arr_band.sum())
        # AG-20: 分離帶涵蓋整段 y 交集 (非固定 100 行)，每行寬度為 minGapPx (20px)
        self.assertGreater(band_px_count, 2000, "分離帶應涵蓋整段交集，面積應大於 2000 px")
        self.assertEqual(band_px_count, 3936, "分離帶在預設骨架下面積精確為 3936 px")

        arm_px_count = int(arr_arm.sum())
        torso_px_count = int(arr_torso.sum())
        self.assertGreater(arm_px_count, 10000, "手臂膠囊應有實質面積")
        self.assertGreater(torso_px_count, 50000, "軀幹膠囊應有實質面積")

        # 4. 驗證分離帶中不透明像素數量
        opaque_in_band = report["separationBandOpaquePixels"]
        # AG-20: 分離帶沿手臂膠囊內側走，在檢驗區內有 1894 個不透明像素
        self.assertEqual(opaque_in_band, 1894)


if __name__ == "__main__":
    unittest.main()
