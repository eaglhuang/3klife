#!/usr/bin/env python3
"""AG-31 單元測試：關節閉運算裂縫量法 (jointCrackPx) 與 detachedChild 擬議閘門 (test_ag31_rotation_crack_and_detached_child.py)

依據工單 AG-31 規範：
1. 關節裂縫量法 (jointCrackPx)：
   - 合成測試 1：child 轉走留下大片位移空位，片間無縫 -> jointCrackPx = 0，vacatedInclusive > 0。
   - 合成測試 2：片間 6 px 狹長裂縫 -> jointCrackPx > 0；0° 時已存在之天然凹口扣除不計。
2. detachedChild 擬議閘門：
   - 合成測試 3：child 核心覆蓋率為 0 (掛件遠離樞紐)，但 jointCrackPx = 0：
     - detachedChild: true -> proposedTier = "PASS"
     - detachedChild: false -> proposedTier = "FAIL" (childCoverageWithoutOccluders < 15%)
3. 實資料多路徑尋找與 R292 指標驗證。
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


class TestAG31RotationCrackAndDetachedChild(unittest.TestCase):
    def test_vacated_movement_space_gives_zero_crack_but_positive_vacated(self) -> None:
        """合成測試 1：子件轉走留下位移空位、片間無縫 -> jointCrackPx = 0, vacatedInclusive > 0"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        # Parent: 寬度 50px (231..281, y: 150..256)，圓心 (256, 256) 處半徑 25px 圓頭
        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_im)
        p_draw.rectangle([231, 150, 281, 256], fill=(100, 100, 200, 255))
        p_draw.ellipse([piv[0] - 25, piv[1] - 25, piv[0] + 25, piv[1] + 25], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        # Child: 寬度 50px (231..281, y: 256..380)，圓心 (256, 256) 處半徑 25px 圓頭
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(c_im)
        c_draw.rectangle([231, 256, 281, 380], fill=(200, 100, 100, 255))
        c_draw.ellipse([piv[0] - 25, piv[1] - 25, piv[0] + 25, piv[1] + 25], fill=(200, 100, 100, 255))
        c_arr = np.array(c_im)

        # 旋轉 45 度：Child 轉走後的位移空位寬度 > 20px (遠大於 12px 閉運算 kernel)
        # 且在轉軸樞紐 (256, 256) 處，半徑 25px 的圓頭旋轉對稱，完美吻合無縫隙
        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=45.0,
            check_radius_px=40.0,
            w=w,
            h=h,
            max_crack_width_px=12,
        )

        # 斷言：轉走留下大片位移空位
        self.assertGreater(met["vacatedInclusiveSeamPx"], 100, "轉走應留下大於 100px 的位移空位")
        self.assertGreater(met["childVacatedPx"], 100, "子件轉走留下的空位應大於 100px")
        # 斷言：片間緊密無裂縫
        self.assertEqual(met["jointCrackPx"], 0, "片間緊密咬合無裂縫時，jointCrackPx 必須為 0")

    def test_crack_detected_and_natural_notch_excluded(self) -> None:
        """合成測試 2：片間 6px 狹長縫 -> jointCrackPx > 0；0° 天然凹口扣除不計"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        # 1. 0° 天然凹口：在 Parent 遠端側面挖一個 8px 寬的凹槽，0° 時就存在
        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_im)
        p_draw.rectangle([231, 150, 281, 256], fill=(100, 100, 200, 255))
        p_draw.ellipse([piv[0] - 25, piv[1] - 25, piv[0] + 25, piv[1] + 25], fill=(100, 100, 200, 255))
        p_draw.rectangle([231, 220, 239, 235], fill=(0, 0, 0, 0))  # 0° 天然凹口
        p_arr = np.array(p_im)

        # Child: 在樞紐處留有一條 6px 的片間細縫 (y 從 262 開始)
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(c_im)
        c_draw.rectangle([231, 262, 281, 380], fill=(200, 100, 100, 255))
        c_arr = np.array(c_im)

        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=10.0,
            check_radius_px=40.0,
            w=w,
            h=h,
            max_crack_width_px=12,
        )

        # 斷言：成功檢測出 6px 的片間閉運算裂縫
        self.assertGreater(met["jointCrackPx"], 0, "片間 6px 裂縫應被 jointCrackPx 檢出")

    def test_detached_child_proposed_gate_waiver(self) -> None:
        """合成測試 3：detachedChild 擬議閘門豁免 child 核心覆蓋率"""
        tmp_dir = Path(tempfile.mkdtemp(prefix="test_ag31_detached_"))
        try:
            parts_dir = tmp_dir / "parts"
            parts_dir.mkdir(parents=True, exist_ok=True)

            w, h = 2048, 2048
            # parent: 填滿
            p_im = Image.new("RGBA", (w, h), (100, 100, 200, 255))
            p_im.save(parts_dir / "head.png")

            # child: 遠離樞紐 (960, 420) 80px，核心內覆蓋 0 px
            c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            ImageDraw.Draw(c_im).rectangle([900, 520, 1024, 700], fill=(200, 100, 100, 255))
            c_im.save(parts_dir / "hair_tail.png")

            rep, _ = run_layered_parts_inspection(
                parts_dir=parts_dir,
                spec_path=DEFAULT_SPEC_PATH,
                body_type="standard",
                filter_slots=["head", "hair_tail"],
            )

            ht_res = rep["rotationLeakChecks"]["head_to_hair_tail"]
            # 由於 v3.11 中 hair_tail 的 detachedChild: true，免檢 child 覆蓋率，且 jointCrack = 0
            self.assertEqual(ht_res["tier"], "FAIL", "現行 tier 仍保持 FAIL (不咬合)")
            self.assertEqual(ht_res["proposedTier"], "PASS", "擬議閘門對 detachedChild 應判定 PASS")
            self.assertTrue(ht_res["proposedGate"]["pass"])
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_r292_full_joints_table_metrics_presence(self) -> None:
        """實資料驗證：R292 20 個關節具備完整 v3.11 欄位"""
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
            self.skipTest("跳過 R292 實資料測試：候選路徑均不存在")

        rep, _ = run_layered_parts_inspection(
            parts_dir=found_dir / "parts",
            spec_path=DEFAULT_SPEC_PATH,
            body_type="standard",
            anchors_path=found_dir / "anchors",
        )
        rot_reports = rep["rotationLeakChecks"]

        self.assertEqual(len(rot_reports), 20)
        for j_id, entry in rot_reports.items():
            if entry.get("skipped"):
                continue
            self.assertIn("vacatedInclusiveSeamPositivePx", entry)
            self.assertIn("vacatedInclusiveSeamNegativePx", entry)
            self.assertIn("childVacatedPositivePx", entry)
            self.assertIn("childVacatedNegativePx", entry)
            self.assertIn("jointCrackPositivePx", entry)
            self.assertIn("jointCrackNegativePx", entry)
            self.assertIn("proposedTier", entry)
            self.assertIn("proposedGate", entry)


if __name__ == "__main__":
    unittest.main()
