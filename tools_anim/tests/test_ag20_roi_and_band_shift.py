#!/usr/bin/env python3
"""AG-20 檢查窗與分離帶動態平移與後手遮罩測試 (test_ag20_roi_and_band_shift.py)

依據工單 AG-20:
1. 把 JSON 中 shoulder_f、elbow_f、wrist_f 整體平移 +60 px，檢查窗與分離帶必須跟著移動，而且結果不變。
2. 後手 (arm_b) 同樣檢查，並輸出對應的 arm_b_* 遮罩且互不重疊。
"""
import copy
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


class TestAG20ROIAndBandShift(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_ag20_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.base_spec = check_rigpose.load_canonical_spec()

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_arm_shift_moves_roi_and_separation_band(self):
        """測試整體平移 shoulder_f, elbow_f, wrist_f +60px，檢查窗與分離帶跟著移動 +60px"""
        # 1. 基準幾何
        arm_m, torso_m, band_m, roi = check_rigpose.compute_arm_torso_geometry(
            self.base_spec, "f", 2048, 2048
        )

        # 2. 建立平移 +60px 的 spec
        shifted_spec = copy.deepcopy(self.base_spec)
        for j_name in ["shoulder_f", "elbow_f", "wrist_f"]:
            shifted_spec["joints"][j_name]["x"] += 60

        arm_s, torso_s, band_s, roi_s = check_rigpose.compute_arm_torso_geometry(
            shifted_spec, "f", 2048, 2048
        )

        # 3. 驗證檢查窗跟著移動 +60px
        self.assertEqual(roi_s["x_max"], roi["x_max"] + 60, "檢查窗 x_max 應跟著向右平移 60px")
        self.assertEqual(roi_s["y_min"], roi["y_min"], "y 範圍維持不變")
        self.assertEqual(roi_s["y_max"], roi["y_max"], "y 範圍維持不變")

        # 4. 驗證分離帶向右平移，且因解除軀幹重疊遮擋，分離帶面積正常展現
        self.assertGreaterEqual(int(band_s.sum()), int(band_m.sum()), "平移後解除部分軀幹重疊遮擋，分離帶面積應保持或增加")

        # 逐列驗證分離帶向右移動 60px
        common_ys = np.where(band_m.any(axis=1) & band_s.any(axis=1))[0]
        self.assertGreater(len(common_ys), 100, "應有足夠的交集行數進行幾何比對")
        shifted_diffs = []
        for y in common_ys[::10]:
            orig_cols = np.where(band_m[y])[0]
            shifted_cols = np.where(band_s[y])[0]
            # 比較手臂內側那一側的邊界 (arm_inner - 1)
            diff = int(shifted_cols.max()) - int(orig_cols.max())
            shifted_diffs.append(diff)
        
        # 絕大多數列之位移精確為 60px
        self.assertTrue(all(d == 60 for d in shifted_diffs), f"分離帶外沿在各列位移均應精確為 60px: {shifted_diffs}")

    def test_inspection_result_invariant_under_shift(self):
        """測試圖檔與關節同時平移 +60px 時，檢查結果完全不變"""
        # 建立一張基準圖
        canvas = np.zeros((2048, 2048, 4), dtype=np.uint8)
        canvas[300:400, 1000:1048] = [200, 200, 200, 255]
        canvas[400:1900, 1000:1048] = [200, 200, 200, 255]
        # 在原檢查區填入手臂像素 (留 20px 空隙)
        canvas[1020:1120, 1120:1210] = [180, 180, 180, 255]

        base_img_p = Path(self.tmp_dir) / "base_img.png"
        Image.fromarray(canvas).save(base_img_p)

        # 建立平移圖檔 (手臂向右平移 60px: 1180..1270)
        canvas_shifted = np.zeros((2048, 2048, 4), dtype=np.uint8)
        canvas_shifted[300:400, 1000:1048] = [200, 200, 200, 255]
        canvas_shifted[400:1900, 1000:1048] = [200, 200, 200, 255]
        canvas_shifted[1020:1120, 1180:1270] = [180, 180, 180, 255]

        shifted_img_p = Path(self.tmp_dir) / "shifted_img.png"
        Image.fromarray(canvas_shifted).save(shifted_img_p)

        # 平移 spec
        shifted_spec = copy.deepcopy(self.base_spec)
        for j_name in ["shoulder_f", "elbow_f", "wrist_f"]:
            shifted_spec["joints"][j_name]["x"] += 60

        base_spec_p = Path(self.tmp_dir) / "base_spec.json"
        base_spec_p.write_text(json.dumps(self.base_spec), encoding="utf-8")

        shifted_spec_p = Path(self.tmp_dir) / "shifted_spec.json"
        shifted_spec_p.write_text(json.dumps(shifted_spec), encoding="utf-8")

        # 執行基準檢查
        out_base = self.out_dir / "base"
        rep_base, _ = check_rigpose.run_rigpose_inspection(
            base_img_p, None, None, None, None, out_base
        )

        # 替換 spec 後執行平移檢查
        orig_load = check_rigpose.load_canonical_spec
        try:
            check_rigpose.load_canonical_spec = lambda: shifted_spec
            out_shifted = self.out_dir / "shifted"
            rep_shifted, _ = check_rigpose.run_rigpose_inspection(
                shifted_img_p, None, None, None, None, out_shifted
            )
        finally:
            check_rigpose.load_canonical_spec = orig_load

        # 驗證結果完全不變
        chk_b = rep_base["checks"]["min_gap_arm_torso"]
        chk_s = rep_shifted["checks"]["min_gap_arm_torso"]

        self.assertEqual(chk_b["tier"], chk_s["tier"])
        self.assertEqual(chk_b["pass"], chk_s["pass"])

    def test_arm_b_gap_inspection_and_masks(self):
        """測試後手 (arm_b) 間隙檢驗與遮罩輸出，確保三張遮罩互不重疊"""
        # 後手故意黏連
        canvas = np.zeros((2048, 2048, 4), dtype=np.uint8)
        canvas[300:400, 1000:1048] = [200, 200, 200, 255]
        canvas[400:1900, 1000:1048] = [200, 200, 200, 255]
        # 在後手檢查區 (y: 1020..1120, x: 800..950) 填滿實體像素以觸發後手 FAIL
        canvas[1020:1120, 800:950] = [200, 80, 80, 255]

        img_p = Path(self.tmp_dir) / "arm_b_fail.png"
        Image.fromarray(canvas).save(img_p)

        rep, _ = check_rigpose.run_rigpose_inspection(
            img_p, None, None, None, None, self.out_dir / "arm_b"
        )

        chk_b = rep["checks"].get("min_gap_arm_b_torso")
        self.assertIsNotNone(chk_b, "報告中應包含 min_gap_arm_b_torso 檢查項")
        self.assertEqual(chk_b["tier"], "FAIL")
        self.assertFalse(chk_b["pass"])

        # 驗證後手遮罩路徑
        self.assertIn("armCapsuleMask", chk_b)
        self.assertIn("armTorsoSeparationBandMask", chk_b)
        self.assertIn("armBCapsuleMask", rep)
        self.assertIn("armBTorsoSeparationBandMask", rep)

        arm_b_mask_p = Path(rep["armBCapsuleMask"])
        band_b_mask_p = Path(rep["armBTorsoSeparationBandMask"])

        self.assertTrue(arm_b_mask_p.exists())
        self.assertTrue(band_b_mask_p.exists())

        im_arm_b = Image.open(arm_b_mask_p)
        im_band_b = Image.open(band_b_mask_p)
        self.assertEqual(im_arm_b.size, (2048, 2048))
        self.assertEqual(im_band_b.size, (2048, 2048))

        arr_arm_b = np.array(im_arm_b) > 128
        arr_band_b = np.array(im_band_b) > 128

        # 幾何驗證互不重疊
        overlap_ab = int((arr_arm_b & arr_band_b).sum())
        self.assertEqual(overlap_ab, 0, "後手膠囊與後手分離帶不得重疊")


if __name__ == "__main__":
    unittest.main()
