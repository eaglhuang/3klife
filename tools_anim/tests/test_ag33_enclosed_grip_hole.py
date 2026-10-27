#!/usr/bin/env python3
"""AG-33 單元測試：握孔封閉孔檢測與核心分母扣除 (test_ag33_enclosed_grip_hole.py)

依據工單 AG-33 規範：
1. 封閉環形手、骨點在孔內：
   - 握孔判定為 enclosedHole，握孔從 jointCrackPx 扣除 -> 裂縫 0
   - 核心扣掉握孔後 < 30px -> 覆蓋條件標記為 notApplicable，只看裂縫 -> proposedTier PASS
2. 開口手：
   - 找不到封閉孔，退回 15px 圓盤 -> gripHoleSource: "radiusFallback"
3. 一般肢段 (膝、肘)：
   - 不受影響 -> gripHoleSource: "none"
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOOLS_DIR = HERE.parent
REPO_ROOT = TOOLS_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import cv2
import numpy as np
from PIL import Image, ImageDraw

from tools_anim.check_layered_parts import (
    check_rotation_gap_leak,
    run_layered_parts_inspection,
)

DEFAULT_SPEC_PATH = TOOLS_DIR / "specs" / "canonical_skeleton_v3.json"


class TestAG33EnclosedGripHole(unittest.TestCase):
    def test_enclosed_grip_hole_zero_crack_and_not_applicable_coverage(self) -> None:
        """合成測試 1：封閉環形手、骨點在孔內 -> gripHoleSource: enclosedHole, crack 0, notApplicable"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        # Parent (手臂): 朝下包覆樞紐並向上延伸
        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_im)
        p_draw.rectangle([216, 150, 296, 256], fill=(100, 100, 200, 255))
        p_draw.ellipse([piv[0] - 40, piv[1] - 40, piv[0] + 40, piv[1] + 40], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        # Child (環形手): 實心外圓半徑 35px，中間挖一個直徑 46px (半徑 23px) 的封閉洞 (骨點在孔心)
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(c_im)
        c_draw.ellipse([piv[0] - 35, piv[1] - 35, piv[0] + 35, piv[1] + 35], fill=(200, 100, 100, 255))
        c_draw.ellipse([piv[0] - 23, piv[1] - 23, piv[0] + 23, piv[1] + 23], fill=(0, 0, 0, 0))
        c_arr = np.array(c_im)

        # 握點在 pivot
        grip_pts = [piv]

        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=30.0,
            check_radius_px=40.0,
            w=w,
            h=h,
            occluder_arrs={},
            grip_points=grip_pts,
            parent_side_occluder_arrs={},
            max_crack_width_px=12,
        )

        self.assertEqual(met["gripHoleSource"], "enclosedHole")
        self.assertGreater(met["gripHoleAreaPx"], 1000)
        self.assertEqual(met["jointCrackPx"], 0)
        self.assertTrue(met["childCoreCoverageNA"], "核心扣除封閉孔後應 < 30px 並標記 NA")

    def test_open_hand_falls_back_to_radius_15(self) -> None:
        """合成測試 2：開口手 (C 形拳、缺口連通外界) -> 退回 15px 圓盤"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_im)
        p_draw.rectangle([236, 150, 276, 256], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        # Child: 開口手，右側有缺口連通外界
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(c_im)
        c_draw.ellipse([piv[0] - 35, piv[1] - 35, piv[0] + 35, piv[1] + 35], fill=(200, 100, 100, 255))
        c_draw.ellipse([piv[0] - 20, piv[1] - 20, piv[0] + 20, piv[1] + 20], fill=(0, 0, 0, 0))
        # 缺口開向右邊
        c_draw.rectangle([piv[0], piv[1] - 8, piv[0] + 40, piv[1] + 8], fill=(0, 0, 0, 0))
        c_arr = np.array(c_im)

        grip_pts = [piv]

        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=30.0,
            check_radius_px=40.0,
            w=w,
            h=h,
            occluder_arrs={},
            grip_points=grip_pts,
            parent_side_occluder_arrs={},
            max_crack_width_px=12,
        )

        self.assertEqual(met["gripHoleSource"], "radiusFallback")
        self.assertAlmostEqual(met["gripHoleAreaPx"], int(np.pi * 15**2), delta=30)

    def test_ordinary_limb_unaffected(self) -> None:
        """合成測試 3：一般肢段 (膝、肘，無 grip_points) -> gripHoleSource 為 none，不受影響"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_im)
        p_draw.rectangle([236, 150, 276, 256], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(c_im)
        c_draw.rectangle([236, 256, 276, 380], fill=(200, 100, 100, 255))
        c_arr = np.array(c_im)

        # 一般關節無 grip_points
        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=30.0,
            check_radius_px=40.0,
            w=w,
            h=h,
            occluder_arrs={},
            grip_points=[],
            parent_side_occluder_arrs={},
            max_crack_width_px=12,
        )

        self.assertEqual(met["gripHoleSource"], "none")
        self.assertEqual(met["gripHoleAreaPx"], 0)
        self.assertFalse(met["childCoreCoverageNA"])
        self.assertFalse(met["parentCoreCoverageNA"])


if __name__ == "__main__":
    unittest.main()
