"""
單元測試：AG-36 握拳握點建議級檢查 gripRegistration (test_ag36_grip_registration.py)

依據工單 AG-36 規範：
1. 新增建議級檢查 gripRegistration：
   在設定姿勢下，hand_f 不透明像素的形心到 hand_f 骨的握點距離必須 <= 0.02H (32 px)。
   量測握點周圍 24 px 半徑內 hand_f 的覆蓋率，並輸出到報告。
2. 先設為 advisory，不直接拉低 slot 或整體判定。
3. 用 R299 現有的 hand_f 跑一次這項檢查，它應該要 FAIL (advisory)，形心距離約 140 px (實測 143.6 px)，覆蓋率 0.0%。
"""
from __future__ import annotations

import json
import math
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

import numpy as np
from PIL import Image, ImageDraw

from tools_anim.check_layered_parts import (
    DEFAULT_SPEC_PATH,
    run_layered_parts_inspection,
)


class TestAG36GripRegistration(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_ag36_"))
        self.spec = json.loads(Path(DEFAULT_SPEC_PATH).read_text(encoding="utf-8"))
        self.canvas_w = int(self.spec.get("canvas", {}).get("w", 2048))
        self.canvas_h = int(self.spec.get("canvas", {}).get("h", 2048))

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_ag36_grip_registration_r299_hand_f_fails_advisory(self) -> None:
        """
        測試 1: 用 R299 現有的 hand_f 跑 gripRegistration，
        它形心距離約 143.6 px (遠大於 32 px 門檻)，覆蓋率 0.0%，判定應為 FAIL (ADVISORY)。
        """
        candidate_dirs = [
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r299-ankle-f-round\parts",
            r"C:\Users\User\3KLife\scratch\r299-ankle-f-round\parts",
        ]
        r299_dir: Path | None = None
        for cd in candidate_dirs:
            if Path(cd).exists() and (Path(cd) / "hand_f.png").exists():
                r299_dir = Path(cd)
                break

        if not r299_dir:
            self.skipTest("無 R299 候選零件目錄，跳過回歸測試")

        rep, _ = run_layered_parts_inspection(
            parts_dir=r299_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["hand_f"],
        )

        checks = rep["slotReports"]["hand_f"]["checks"]
        self.assertIn("gripRegistration", checks, "slotReports.hand_f 應包含 gripRegistration 檢查")
        g_reg = checks["gripRegistration"]

        self.assertFalse(g_reg["pass"], "R299 hand_f 形心偏離過遠，pass 應為 False")
        self.assertEqual(g_reg["tier"], "ADVISORY", "建議級檢查未通過時 tier 應為 ADVISORY")
        self.assertTrue(g_reg.get("advisory", False), "advisory 標記應為 True")
        self.assertAlmostEqual(g_reg["distancePx"], 143.6, delta=1.0, msg="形心到握點距離應約 143.6 px")
        self.assertEqual(g_reg["maxDistancePx"], 32.0, "門檻應為 0.02 * 1600 = 32.0 px")
        self.assertEqual(g_reg["radiusPx"], 24.0, "握點周圍半徑應為 24 px")
        self.assertEqual(g_reg["coveredPixels"], 0, "手部下緣未覆蓋握點，覆蓋像素應為 0")
        self.assertEqual(g_reg["coveragePct"], 0.0, "覆蓋率應為 0.0%")

    def test_ag36_grip_registration_synthetic_pass(self) -> None:
        """
        測試 2: 當 hand_f 正確放置在握點 (1365, 1225) 周圍時，
        形心距離 <= 32 px 且覆蓋率充足，gripRegistration 應判定為 PASS。
        """
        parts_dir = self.tmp_dir / "parts"
        parts_dir.mkdir(parents=True, exist_ok=True)

        gx = float(self.spec["grips"]["grip_A"]["x"])
        gy = float(self.spec["grips"]["grip_A"]["y"])

        # 建立合成 hand_f: 以握點為中心，半徑 28 px 的圓，形心正好在握點上
        im_hand = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_hand = ImageDraw.Draw(im_hand)
        d_hand.ellipse([gx - 28, gy - 28, gx + 28, gy + 28], fill=(210, 160, 120, 255))
        # 挖一個微小的握拳孔 (半徑 4 px)
        d_hand.ellipse([gx - 4, gy - 4, gx + 4, gy + 4], fill=(0, 0, 0, 0))
        im_hand.save(parts_dir / "hand_f.png")

        rep, _ = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["hand_f"],
        )

        checks = rep["slotReports"]["hand_f"]["checks"]
        self.assertIn("gripRegistration", checks)
        g_reg = checks["gripRegistration"]

        self.assertTrue(g_reg["pass"], "合成 hand_f 形心對齊握點，應判定為 PASS")
        self.assertEqual(g_reg["tier"], "PASS")
        self.assertLessEqual(g_reg["distancePx"], 5.0, "形心應非常接近握點")
        self.assertGreater(g_reg["coveragePct"], 50.0, "24px 內覆蓋率應 > 50%")

    def test_ag36_grip_registration_hand_b(self) -> None:
        """
        測試 3: R299 的 hand_b 形心距離 23.0 px <= 32.0 px，
        gripRegistration 應判定 PASS。
        """
        candidate_dirs = [
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r299-ankle-f-round\parts",
            r"C:\Users\User\3KLife\scratch\r299-ankle-f-round\parts",
        ]
        r299_dir: Path | None = None
        for cd in candidate_dirs:
            if Path(cd).exists() and (Path(cd) / "hand_b.png").exists():
                r299_dir = Path(cd)
                break

        if not r299_dir:
            self.skipTest("無 R299 候選零件目錄，跳過回歸測試")

        rep, _ = run_layered_parts_inspection(
            parts_dir=r299_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["hand_b"],
        )

        checks = rep["slotReports"]["hand_b"]["checks"]
        self.assertIn("gripRegistration", checks)
        g_reg = checks["gripRegistration"]

        self.assertTrue(g_reg["pass"], "R299 hand_b 形心距離 23.0 px <= 32 px，應 PASS")
        self.assertEqual(g_reg["tier"], "PASS")
        self.assertAlmostEqual(g_reg["distancePx"], 23.0, delta=1.0)


if __name__ == "__main__":
    unittest.main()
