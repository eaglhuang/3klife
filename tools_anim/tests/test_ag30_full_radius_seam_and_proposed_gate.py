#!/usr/bin/env python3
"""AG-30 單元測試：全半徑輪廓內縫 (seamInsideContourFullRadiusPx) 與擬議閘門 (proposedGate) 並列 (test_ag30_full_radius_seam_and_proposed_gate.py)

依據工單 AG-30 規範：
1. 全半徑輪廓內透光縫：
   - 核心圓盤 (半徑 check_radius_px * 0.4) 與全半徑圓盤 (半徑 check_radius_px) 並列。
   - 合成測試：透光縫落在核心圓盤外、全半徑內 -> 核心縫 = 0 px，全半徑縫 > 0 px。
2. 擬議閘門 (proposedGate) 只並列、不取代現行 tier：
   - 條件：parent 與 child (不含遮蔽槽) 核心覆蓋率各 >= 15%，且全半徑輪廓內縫正負角度各 <= 8 px。
   - 舊 tier 保持不變，輸出 proposedTier 與詳細未通過原因。
3. 實資料多重路徑尋找與 v3.10 遮蔽驗證。
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


class TestAG30FullRadiusSeamAndProposedGate(unittest.TestCase):
    def test_seam_outside_core_but_inside_full_radius(self) -> None:
        """任務 B 合成測試：縫在核心外 (r > 16px)、全半徑內 (r <= 40px) -> 核心 0 px、全半徑 > 0 px"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        # 核心半徑 16px (40 * 0.4)，全半徑 40px
        # 設計：parent 與 child 在核心圓盤內完整重疊 (半徑 18px 內填滿，所以核心縫為 0)
        # 但在半徑 25px..35px 的肢體輪廓處，切出一個鏤空小缺口
        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_im)
        p_draw.rectangle([200, 200, 312, 256], fill=(100, 100, 200, 255))
        # 延伸覆蓋核心
        p_draw.ellipse([piv[0] - 20, piv[1] - 20, piv[0] + 20, piv[1] + 20], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        # child 覆蓋下半部，但在半徑 28px 處旋轉後產生透光隙縫
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(c_im)
        c_draw.rectangle([200, 256, 312, 350], fill=(200, 100, 100, 255))
        c_draw.ellipse([piv[0] - 20, piv[1] - 20, piv[0] + 20, piv[1] + 20], fill=(200, 100, 100, 255))
        # 在 (256, 285) 處挖一個孔 (距離樞紐 29px，落在核心 16px 之外、全半徑 40px 之內)
        c_draw.ellipse([250, 280, 262, 292], fill=(0, 0, 0, 0))
        c_arr = np.array(c_im)

        passed, _, met = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=0.0,
            check_radius_px=40.0,
            w=w,
            h=h,
        )

        # 斷言：核心透光縫為 0，但全半徑透光縫大於 0
        self.assertEqual(met["seamInsideContourPx"], 0, "核心圓盤內應無透光縫")
        self.assertGreater(met["seamInsideContourFullRadiusPx"], 0, "全半徑圓盤應成功檢出核心外的透光縫")

    def test_proposed_gate_parallel_evaluation(self) -> None:
        """任務 C 合成測試：驗證 proposedGate 只並列、不覆蓋現行 tier，且門檻條件判斷精確"""
        tmp_dir = Path(tempfile.mkdtemp(prefix="test_ag30_gate_"))
        try:
            parts_dir = tmp_dir / "parts"
            parts_dir.mkdir(parents=True, exist_ok=True)
            spec = json.loads(DEFAULT_SPEC_PATH.read_text(encoding="utf-8"))

            # 建立兩個測試槽位部件 (thigh_f, shin_f)
            w, h = 2048, 2048
            p_im = Image.new("RGBA", (w, h), (100, 100, 200, 255))
            c_im = Image.new("RGBA", (w, h), (200, 100, 100, 255))
            p_im.save(parts_dir / "thigh_f.png")
            c_im.save(parts_dir / "shin_f.png")

            rep, _ = run_layered_parts_inspection(
                parts_dir=parts_dir,
                spec_path=DEFAULT_SPEC_PATH,
                body_type="standard",
                filter_slots=["thigh_f", "shin_f"],
            )

            j_res = rep["rotationLeakChecks"]["thigh_f_to_shin_f"]
            self.assertIn("proposedGate", j_res)
            self.assertIn("proposedTier", j_res)
            self.assertEqual(j_res["tier"], "PASS")
            self.assertEqual(j_res["proposedTier"], "PASS")
            self.assertTrue(j_res["proposedGate"]["pass"])
            self.assertEqual(j_res["proposedGate"]["reasons"], [])

            # 在 positive / negative angle metrics 內亦有全半徑縫數值
            self.assertIn("seamInsideContourFullRadiusPx", j_res["positiveAngleMetrics"])
            self.assertIn("seamInsideContourFullRadiusPx", j_res["negativeAngleMetrics"])
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_v310_pauldron_occluders_and_r292_full_joints(self) -> None:
        """實資料驗證：v3.10 前肩遮蔽效果與 20 關節 proposedTier 評估"""
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
            self.skipTest(f"跳過 R292 實資料測試：候選路徑均不存在")

        rep, _ = run_layered_parts_inspection(
            parts_dir=found_dir / "parts",
            spec_path=DEFAULT_SPEC_PATH,
            body_type="standard",
            anchors_path=found_dir / "anchors",
        )
        rot_reports = rep["rotationLeakChecks"]

        # 1. 驗證前肩 torso_to_arm_upper_f 在 v3.10 下遮蔽效果
        self.assertIn("torso_to_arm_upper_f", rot_reports)
        shoulder_f = rot_reports["torso_to_arm_upper_f"]
        self.assertEqual(shoulder_f["rotationOccluders"], ["pauldron_f"])
        self.assertEqual(shoulder_f["seamInsideContourPositivePx"], 0)
        self.assertEqual(shoulder_f["seamInsideContourNegativePx"], 0)
        self.assertEqual(shoulder_f["tier"], "PASS")

        # 2. 驗證 20 個旋轉檢查項皆具備完整欄位
        self.assertEqual(len(rot_reports), 20)
        for j_id, entry in rot_reports.items():
            if entry.get("skipped"):
                continue
            self.assertIn("proposedTier", entry)
            self.assertIn("proposedGate", entry)
            self.assertIn("seamInsideContourFullRadiusPositivePx", entry)
            self.assertIn("seamInsideContourFullRadiusNegativePx", entry)


if __name__ == "__main__":
    unittest.main()
