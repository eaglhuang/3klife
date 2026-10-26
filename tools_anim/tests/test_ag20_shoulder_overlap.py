#!/usr/bin/env python3
"""AG-20 補充：肩部重疊區 (規格 v3.3) 驗證測試 (test_ag20_shoulder_overlap.py)

依據工單 AG-20 補充：
1. 肩部圈內肩甲與軀幹黏連 → gap 判 PASS；
2. 圈外一像素黏連 → 判 FAIL；
3. 把 radiusH 改成 0.03 → 原本 PASS 的案例要轉為 FAIL。
4. 半徑一律用 radiusH × H 計算，不可寫死 96。
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


class TestAG20ShoulderOverlap(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_shoulder_overlap_")
        self.out_dir = Path(self.tmp_dir) / "out"
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.base_spec = check_rigpose.load_canonical_spec()

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _create_base_canvas(self) -> np.ndarray:
        """建立符合尺寸且其他部位全 PASS 的基準底圖"""
        arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
        # 頭部與軀幹
        arr[300:400, 1000:1048] = [200, 200, 200, 255]
        arr[400:1900, 1000:1048] = [200, 200, 200, 255]
        # 肘腕部正常保留 20px 透明通道 (1100..1120 透明，1120..1210 填實)
        arr[1020:1120, 1120:1210] = [200, 200, 200, 255]
        return arr

    def test_shoulder_overlap_inside_passes(self):
        """測試 1: 肩部圈內肩甲與軀幹黏連 -> gap 判 PASS"""
        arr = self._create_base_canvas()
        # shoulder_f = (1120, 925), 半徑 0.06 * 1600 = 96px (涵蓋到 y=1021)
        # 在圈內 y: 940..980, x: 1048..1150 實體黏連
        arr[940:980, 1048:1150] = [220, 100, 100, 255]

        img_p = Path(self.tmp_dir) / "overlap_inside.png"
        Image.fromarray(arr).save(img_p)

        rep, passed = check_rigpose.run_rigpose_inspection(
            img_p, None, None, None, None, self.out_dir / "inside"
        )

        chk = rep["checks"]["min_gap_arm_torso"]
        self.assertTrue(chk["pass"], "肩部重疊圈內肩甲蓋住軀幹應判定 PASS")
        self.assertEqual(chk["tier"], "PASS")

    def test_outside_one_pixel_adhesion_fails(self):
        """測試 2: 圈外一像素黏連 -> 判 FAIL"""
        arr = self._create_base_canvas()
        # 在圈外 y=1025 列黏連一個像素至軀幹邊界 (即 x=1115..1120 侵入間隙)
        arr[1025, 1115:1120] = [220, 100, 100, 255]

        img_p = Path(self.tmp_dir) / "outside_1px.png"
        Image.fromarray(arr).save(img_p)

        rep, passed = check_rigpose.run_rigpose_inspection(
            img_p, None, None, None, None, self.out_dir / "outside_1px"
        )

        chk = rep["checks"]["min_gap_arm_torso"]
        self.assertFalse(chk["pass"], "圈外一像素黏連必須判定 FAIL")
        self.assertEqual(chk["tier"], "FAIL")

    def test_radius_h_003_turns_pass_to_fail(self):
        """測試 3: 把 radiusH 改成 0.03 -> 原本 PASS 的案例轉為 FAIL"""
        arr = self._create_base_canvas()
        # 在距離 shoulder_f 70px (y=995) 處黏連 (在 0.06H=96px 圈內，但在 0.03H=48px 圈外)
        arr[990:1000, 1100:1120] = [220, 100, 100, 255]

        img_p = Path(self.tmp_dir) / "radius_test.png"
        Image.fromarray(arr).save(img_p)

        # 1. 在 radiusH=0.06 下應為 PASS
        orig_load = check_rigpose.load_canonical_spec
        try:
            rep_006, _ = check_rigpose.run_rigpose_inspection(
                img_p, None, None, None, None, self.out_dir / "rad_006"
            )
            self.assertTrue(rep_006["checks"]["min_gap_arm_torso"]["pass"])

            # 2. 修改 spec radiusH=0.03
            spec_003 = copy.deepcopy(self.base_spec)
            spec_003["shoulderOverlapZone"]["radiusH"] = 0.03
            check_rigpose.load_canonical_spec = lambda: spec_003

            rep_003, _ = check_rigpose.run_rigpose_inspection(
                img_p, None, None, None, None, self.out_dir / "rad_003"
            )
            self.assertFalse(
                rep_003["checks"]["min_gap_arm_torso"]["pass"],
                "radiusH 縮小為 0.03 後，70px 處黏連落入圈外，應轉為 FAIL",
            )
            self.assertEqual(rep_003["checks"]["min_gap_arm_torso"]["tier"], "FAIL")
        finally:
            check_rigpose.load_canonical_spec = orig_load


if __name__ == "__main__":
    unittest.main()
