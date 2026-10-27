#!/usr/bin/env python3
"""AG-34 / v3.15 單元測試：scopeGate 小島三級劃分與 coverageRule 覆蓋規則 (test_ag34_scope_gate_and_coverage_rule.py)

依據工單 AG-34 與 v3.15 規範：
1. scopeGate.mode == "advisory"：
   - 膠囊超界但無游離雜片 -> PASS (advisory 只報告百分比)
   - 外部 20 px 游離小島 (16 <= area < 400 且在 scope 外) -> FAIL
   - 外部 5 px 微小雜點 (< 16 px) -> 只列清單不擋 (PASS)
   - 外部 500 px 分離塊 (area >= 400) -> 設計分塊不擋 (PASS)
2. coverageRule.gripJointCoverage == "notApplicable"：
   - 開口手 (radiusFallback) -> 覆蓋條件標 notApplicable，只看裂縫
3. coverageRule.childAloneSufficientPct == 90：
   - child >= 90% 且 crack <= 門檻 -> parent 不足標記 childAloneSufficient (PASS)
   - child < 90% -> 照實 FAIL
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
    load_spec,
    run_layered_parts_inspection,
)

DEFAULT_SPEC_PATH = TOOLS_DIR / "specs" / "canonical_skeleton_v3.json"


class TestAG34ScopeGateAndCoverageRule(unittest.TestCase):
    def test_scope_exceed_connected_passes_under_advisory_mode(self) -> None:
        """合成測試 1：膠囊超界但與主體連通 (無游離雜片) -> advisory 模式下不擋 (PASS)"""
        with open(DEFAULT_SPEC_PATH, "r", encoding="utf-8") as f:
            spec = json.load(f)

        tmp_dir = tempfile.mkdtemp(prefix="test_ag34_connected_")
        try:
            parts_dir = Path(tmp_dir) / "parts"
            parts_dir.mkdir(parents=True, exist_ok=True)
            w, h = 2048, 2048

            # 建立 arm_lower_f: 主體超寬突出膠囊 (超出 50% 範圍)，但為單一連通塊
            im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(im)
            draw.rectangle([1100, 1080, 1500, 1225], fill=(120, 120, 200, 255))
            im.save(parts_dir / "arm_lower_f.png")

            spec_path = Path(tmp_dir) / "spec.json"
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec, f)

            report, _ = run_layered_parts_inspection(parts_dir, spec_path)
            rep = report["slotReports"]["arm_lower_f"]["checks"]["scope_capsule_bounds"]

            self.assertEqual(rep["scopeMode"], "advisory")
            self.assertGreater(rep["outsideRatio"], 0.1)
            self.assertEqual(rep["looseOutsideIslandsCount"], 0)
            self.assertTrue(rep["pass"], "膠囊超界但連通，advisory 模式下必須為 PASS")

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_islands_three_tiers_classification(self) -> None:
        """合成測試 2：外部小島三級劃分 (5px 列清單, 20px FAIL, 500px 設計塊不擋)"""
        with open(DEFAULT_SPEC_PATH, "r", encoding="utf-8") as f:
            spec = json.load(f)

        tmp_dir = tempfile.mkdtemp(prefix="test_ag34_tiers_")
        try:
            parts_dir = Path(tmp_dir) / "parts"
            parts_dir.mkdir(parents=True, exist_ok=True)
            w, h = 2048, 2048

            # Case A: 主體 + 5px 外部小島 -> PASS
            im_a = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            draw_a = ImageDraw.Draw(im_a)
            draw_a.rectangle([1200, 1100, 1260, 1200], fill=(120, 120, 200, 255))
            draw_a.rectangle([100, 100, 104, 100], fill=(120, 120, 200, 255))  # 5px 小島
            im_a.save(parts_dir / "arm_lower_f.png")

            spec_path = Path(tmp_dir) / "spec.json"
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec, f)

            report_a, _ = run_layered_parts_inspection(parts_dir, spec_path)
            rep_a = report_a["slotReports"]["arm_lower_f"]["checks"]["scope_capsule_bounds"]
            self.assertTrue(rep_a["pass"], "5px 外部小島 (<16px) 只列清單，必須 PASS")
            self.assertGreaterEqual(rep_a["tinyIslandsCount"], 1)

            # Case B: 主體 + 20px 外部小島 (16 <= area < 400) -> FAIL
            im_b = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            draw_b = ImageDraw.Draw(im_b)
            draw_b.rectangle([1200, 1100, 1260, 1200], fill=(120, 120, 200, 255))
            draw_b.rectangle([100, 100, 104, 103], fill=(120, 120, 200, 255))  # 5*4 = 20px 小島
            im_b.save(parts_dir / "arm_lower_f.png")

            report_b, _ = run_layered_parts_inspection(parts_dir, spec_path)
            rep_b = report_b["slotReports"]["arm_lower_f"]["checks"]["scope_capsule_bounds"]
            self.assertFalse(rep_b["pass"], "20px 外部游離小島必須 FAIL")
            self.assertEqual(rep_b["looseOutsideIslandsCount"], 1)

            # Case C: 主體 + 500px 外部塊 (area >= 400) -> 設計分塊，PASS
            im_c = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            draw_c = ImageDraw.Draw(im_c)
            draw_c.rectangle([1200, 1100, 1260, 1200], fill=(120, 120, 200, 255))
            draw_c.rectangle([100, 100, 124, 119], fill=(120, 120, 200, 255))  # 25*20 = 500px
            im_c.save(parts_dir / "arm_lower_f.png")

            report_c, _ = run_layered_parts_inspection(parts_dir, spec_path)
            rep_c = report_c["slotReports"]["arm_lower_f"]["checks"]["scope_capsule_bounds"]
            self.assertTrue(rep_c["pass"], "500px 外部塊 (>=400px) 視為設計分塊，必須 PASS")
            self.assertEqual(rep_c["designedPiecesCount"], 1)

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_open_hand_coverage_not_applicable(self) -> None:
        """合成測試 3：開口手 (radiusFallback) 覆蓋條件標記 notApplicable，裂縫達標時 PASS"""
        with open(DEFAULT_SPEC_PATH, "r", encoding="utf-8") as f:
            spec = json.load(f)

        tmp_dir = tempfile.mkdtemp(prefix="test_ag34_open_hand_")
        try:
            parts_dir = Path(tmp_dir) / "parts"
            parts_dir.mkdir(parents=True, exist_ok=True)
            w, h = 2048, 2048
            piv = (1365.0, 1225.0)  # hand_f 骨點

            # arm_lower_f 與 hand_f: 緊密咬合無裂縫，但開口手拳心留空
            p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            p_draw = ImageDraw.Draw(p_im)
            p_draw.rectangle([1340, 1100, 1390, 1225], fill=(120, 120, 200, 255))
            p_draw.ellipse([piv[0] - 25, piv[1] - 25, piv[0] + 25, piv[1] + 25], fill=(120, 120, 200, 255))
            p_im.save(parts_dir / "arm_lower_f.png")

            c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            c_draw = ImageDraw.Draw(c_im)
            c_draw.ellipse([piv[0] - 35, piv[1] - 35, piv[0] + 35, piv[1] + 35], fill=(200, 120, 120, 255))
            # 開口拳：骨點處中空且右側開口
            c_draw.ellipse([piv[0] - 20, piv[1] - 20, piv[0] + 20, piv[1] + 20], fill=(0, 0, 0, 0))
            c_draw.rectangle([piv[0], piv[1] - 8, piv[0] + 40, piv[1] + 8], fill=(0, 0, 0, 0))
            c_im.save(parts_dir / "hand_f.png")

            # 在此測試中將 hand_f 骨點對齊自訂合成圖之握點 piv
            for b in spec.get("bones", []):
                if b.get("name") == "hand_f":
                    b["pivotCanvasPx"] = [piv[0], piv[1]]

            spec_path = Path(tmp_dir) / "spec.json"
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec, f)

            report, _ = run_layered_parts_inspection(parts_dir, spec_path)
            hand_gate = report["rotationLeakChecks"]["arm_lower_f_to_hand_f"]["proposedGate"]

            self.assertEqual(hand_gate["conditions"]["childCoreCoverageWithoutOccludersMinRatio"], "notApplicable")
            self.assertEqual(hand_gate["conditions"]["parentCoreCoverageMinRatio"], "notApplicable")
            self.assertEqual(hand_gate["proposedTier"], "PASS")

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_child_alone_sufficient_boundary(self) -> None:
        """合成測試 4：childAloneSufficient 90% 分界兩側驗證"""
        with open(DEFAULT_SPEC_PATH, "r", encoding="utf-8") as f:
            spec = json.load(f)

        tmp_dir = tempfile.mkdtemp(prefix="test_ag34_alone_")
        try:
            parts_dir = Path(tmp_dir) / "parts"
            parts_dir.mkdir(parents=True, exist_ok=True)
            w, h = 2048, 2048
            piv = (1024.0, 1130.0)  # pelvis_to_torso 骨點

            # Parent (pelvis): 完全遠離樞紐 (parent 覆蓋 = 0%)
            p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            p_draw = ImageDraw.Draw(p_im)
            p_draw.rectangle([980, 1200, 1060, 1300], fill=(100, 100, 200, 255))
            p_im.save(parts_dir / "pelvis.png")

            # Case A: Child (torso) 蓋滿核心圓盤 100% (>= 90%) 且無裂縫
            c_im_a = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            c_draw_a = ImageDraw.Draw(c_im_a)
            c_draw_a.ellipse([piv[0] - 30, piv[1] - 30, piv[0] + 30, piv[1] + 30], fill=(200, 100, 100, 255))
            c_im_a.save(parts_dir / "torso.png")

            spec_path = Path(tmp_dir) / "spec.json"
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec, f)

            report_a, _ = run_layered_parts_inspection(parts_dir, spec_path)
            gate_a = report_a["rotationLeakChecks"]["pelvis_to_torso"]["proposedGate"]
            self.assertEqual(gate_a["proposedTier"], "PASS")
            self.assertEqual(gate_a["conditions"]["parentCoreCoverageMinRatio"], "childAloneSufficient")
            self.assertGreaterEqual(gate_a["conditions"]["childCoreCoveragePct"], 90.0)

            # Case B: Child (torso) 覆蓋核心僅 60% (< 90%)
            c_im_b = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            c_draw_b = ImageDraw.Draw(c_im_b)
            # 只畫半邊圓形 (約 50~60%)
            c_draw_b.rectangle([piv[0] - 25, piv[1] - 25, piv[0] + 5, piv[1] + 25], fill=(200, 100, 100, 255))
            c_im_b.save(parts_dir / "torso.png")

            report_b, _ = run_layered_parts_inspection(parts_dir, spec_path)
            gate_b = report_b["rotationLeakChecks"]["pelvis_to_torso"]["proposedGate"]
            self.assertEqual(gate_b["proposedTier"], "FAIL")
            self.assertLess(gate_b["conditions"]["childCoreCoveragePct"], 90.0)
            self.assertTrue(any("parentCoverageInCore" in r for r in gate_b["reasons"]))

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
