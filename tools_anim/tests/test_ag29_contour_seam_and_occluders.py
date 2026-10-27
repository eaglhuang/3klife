#!/usr/bin/env python3
"""AG-29 單元測試：輪廓內透光縫 (seamInsideContourPx) 與覆蓋率嚴格檢驗 (test_ag29_contour_seam_and_occluders.py)

依據工單 AG-29 規範：
1. 輪廓內透光縫 (seamInsideContourPx)：
   - 合成測試 1：腳踝窄部件、核心圓盤超出身體外框 -> trueSeam > 0 但 seamInsideContourPx = 0。
   - 合成測試 2：真的關節縫 (外框內部旋轉後露洞) -> seamInsideContourPx > 0。
2. 覆蓋率不可借遮蔽槽：
   - 合成測試 3：child 在核心內 0 px，weapon 蓋滿核心圓盤 -> FAIL (因 child_cov_raw < 15%)。
3. 實資料多重路徑尋找與可重現斷言：
   - 支援環境變數 R292_DATASET_DIR 與候選路徑，找不到時印出明確路徑清單。
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


class TestAG29ContourSeamAndOccluders(unittest.TestCase):
    def test_narrow_limb_disk_exceeds_contour_gives_zero_contour_seam(self) -> None:
        """合成測試 1：腳踝窄部件、圓盤超出身體外框 -> trueSeam > 0 但 seamInsideContourPx = 0"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        # 窄部件：寬度僅 20px (x: 246..266)
        # parent (小腿)：上半部 y: 150..272 (具備隱藏延伸往下越過樞紐 16px)
        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(p_im).rectangle([246, 150, 266, 272], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        # child (腳踝/腳掌)：下半部 y: 240..350 (具備隱藏延伸往上越過樞紐 16px)
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(c_im).rectangle([246, 240, 266, 350], fill=(200, 100, 100, 255))
        c_arr = np.array(c_im)

        # 核心圓盤半徑 16px (直徑 32px > 部件寬度 20px)
        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=30.0,
            check_radius_px=40.0,
            w=w,
            h=h,
        )

        # 1. 舊 trueSeamLeakPixels > 0 (因圓盤左右兩側直徑 32px 超出 20px 部件落入空氣背景)
        self.assertGreater(met["trueSeamLeakPixelsWithOccluders"], 100)
        # 2. 新 seamInsideContourPx 應為 0 (肢體外輪廓內部旋轉後並無任何透光洞)
        self.assertEqual(met["seamInsideContourPx"], 0)

    def test_real_joint_seam_inside_contour_detected(self) -> None:
        """合成測試 2：真的關節縫 (外框內部旋轉後露洞) -> seamInsideContourPx > 0"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        # 寬部件：寬度 80px (x: 216..296)
        # parent: y: 150..250 (留有 6px 縫隙至樞紐)
        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(p_im).rectangle([216, 150, 296, 250], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        # child: y: 260..350 (留有 4px 縫隙至樞紐)
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(c_im).rectangle([216, 260, 296, 350], fill=(200, 100, 100, 255))
        c_arr = np.array(c_im)

        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=30.0,
            check_radius_px=40.0,
            w=w,
            h=h,
        )

        # 外框填實後包含此接合區，旋轉後露洞，seamInsideContourPx 必須 > 0
        self.assertGreater(met["seamInsideContourPx"], 0)

    def test_child_coverage_zero_fails_even_if_weapon_covers_completely(self) -> None:
        """合成測試 3：child 在核心內 0 px，weapon 蓋滿核心圓盤 -> FAIL (因覆蓋率不可借遮蔽槽)"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        # parent: 覆蓋下半部
        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(p_im).rectangle([200, 256, 312, 350], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        # child: 完全畫在遠處，核心圓盤內覆蓋率為 0 px
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(c_im).rectangle([200, 100, 312, 200], fill=(200, 100, 100, 255))
        c_arr = np.array(c_im)

        # weapon: 巨大武器直接蓋滿整個關節周圍 (覆蓋率 100%)
        w_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(w_im).rectangle([100, 100, 400, 400], fill=(200, 200, 50, 255))
        w_arr = np.array(w_im)

        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=30.0,
            check_radius_px=40.0,
            w=w,
            h=h,
            occluder_arrs={"weapon": w_arr},
        )

        # child 在核心內覆蓋 0 px，即使 weapon 蓋滿亦不得借用，必須判定 FAIL
        self.assertEqual(met["childCoverageWithoutOccluders"], 0)
        self.assertFalse(passed, "child 核心覆蓋率為 0 時，即使 weapon 蓋滿亦必須判定 FAIL")

    def test_r292_dataset_multi_path_search_and_metrics(self) -> None:
        """R292 實資料測試：多路徑尋找，找到時斷言各關節精確數據；找不到時印出明確路徑"""
        candidate_dirs = [
            os.environ.get("R292_DATASET_DIR"),
            str(TOOLS_DIR.parent / "scratch" / "r292-v38-hidden-extension"),
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r292-v38-hidden-extension",
            r"C:\Users\User\worktrees\antigravity-anim\scratch\r292-v38-hidden-extension",
        ]

        found_dir: Path | None = None
        for cd in candidate_dirs:
            if cd and Path(cd).exists() and (Path(cd) / "parts").exists():
                found_dir = Path(cd)
                break

        if not found_dir:
            self.skipTest(f"跳過 R292 實資料測試：嘗試搜尋以下路徑均不存在:\n" + "\n".join(str(d) for d in candidate_dirs if d))

        rep, _ = run_layered_parts_inspection(
            parts_dir=found_dir / "parts",
            spec_path=DEFAULT_SPEC_PATH,
            body_type="standard",
            anchors_path=found_dir / "anchors",
        )
        rot_reports = rep["rotationLeakChecks"]

        # 斷言 Claude 獨立驗證的實資料基準數字
        # arm_lower_b_to_hand_b
        hb_res = rot_reports["arm_lower_b_to_hand_b"]
        if hb_res.get("pivotSource") == "joint":
            self.assertTrue(hb_res["pass"])
            self.assertEqual(hb_res["positiveAngleMetrics"]["leakWithOccludersPx"], 1)
            self.assertEqual(hb_res["positiveAngleMetrics"]["seamInsideContourPx"], 0)
        else:
            self.assertEqual(hb_res.get("pivotSource"), "bonePivot")

        # 雙腿關節
        # thigh_f_to_shin_f
        t_f = rot_reports["thigh_f_to_shin_f"]
        self.assertTrue(t_f["pass"])
        self.assertEqual(t_f["positiveAngleMetrics"]["leakWithOccludersPx"], 285)
        self.assertEqual(t_f["positiveAngleMetrics"]["trueSeamLeakPx"], 0)
        self.assertEqual(t_f["positiveAngleMetrics"]["seamInsideContourPx"], 0)

        # shin_f_to_foot_f (trueSeam=329, seamInsideContour=0)
        s_f = rot_reports["shin_f_to_foot_f"]
        self.assertTrue(s_f["pass"])
        self.assertEqual(s_f["positiveAngleMetrics"]["leakWithOccludersPx"], 490)
        self.assertEqual(s_f["positiveAngleMetrics"]["trueSeamLeakPx"], 329)
        self.assertEqual(s_f["positiveAngleMetrics"]["seamInsideContourPx"], 0)

        # shin_b_to_foot_b (trueSeam=340, seamInsideContour=4)
        s_b = rot_reports["shin_b_to_foot_b"]
        self.assertTrue(s_b["pass"])
        self.assertEqual(s_b["positiveAngleMetrics"]["leakWithOccludersPx"], 495)
        self.assertEqual(s_b["positiveAngleMetrics"]["trueSeamLeakPx"], 340)
        self.assertEqual(s_b["positiveAngleMetrics"]["seamInsideContourPx"], 4)


if __name__ == "__main__":
    unittest.main()
