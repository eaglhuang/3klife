"""
單元測試：AG-37 建議級檢查 weaponGripOnShaft (test_ag37_weapon_grip_on_shaft.py)

依據工單 AG-37 規範與 2026-10-28 補充裁決 (規格 v3.17)：
1. 頂層 weaponRules.gripSampleHalfWidthPx 定義採樣半寬 (預設 32.0 px，即 0.02H)。
2. 在設定姿勢下，以每個握點 (hand_f, hand_b) 為中心、半寬 32 px (水平直徑 64 px) 範圍內，
   weapon 每一欄的 alpha 垂直厚度都必須落在木桿厚度帶內。
   木桿厚度自 weapon 自身量測：取所有欄厚度中位數 (20.0 px)，容許 +/-30% ([14.0, 26.0] px)。
3. 回歸測試：
   - R299 原版 (dx=0)：前手握點 (x=1365) 落在槍頭/套環 (厚度 27~59 px)，判定 FAIL (ADVISORY)；後手握點 (x=680) 落在木桿 (厚度 20 px)，判定 PASS。
   - R299 平移 +180 px (真實原圖平移)：前手握點 (x=1365) 離紅纓邊界 33 px，在半寬 32 px 窗口內完全落在純木桿段 (厚度 20 px)，後手握點 (x=680) 亦在木桿段 (厚度 20~21 px)，前後手皆判定 PASS！
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

import numpy as np
from PIL import Image

from tools_anim.check_layered_parts import (
    DEFAULT_SPEC_PATH,
    run_layered_parts_inspection,
)


class TestAG37WeaponGripOnShaft(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_ag37_"))
        self.spec = json.loads(Path(DEFAULT_SPEC_PATH).read_text(encoding="utf-8"))
        self.canvas_w = int(self.spec.get("canvas", {}).get("w", 2048))
        self.canvas_h = int(self.spec.get("canvas", {}).get("h", 2048))

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_ag37_r299_weapon_hand_f_fails_hand_b_passes(self) -> None:
        """
        測試 1: R299 原版 (dx=0) 在前手握點 (x=1365 +/- 32) 落在槍頭/套環 (厚度 27~59 px)，
        判定為 FAIL (ADVISORY)；後手握點 (x=680 +/- 32) 落在純木桿 (厚度 20 px)，判定為 PASS。
        """
        candidate_dirs = [
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r299-ankle-f-round\parts",
            r"C:\Users\User\3KLife\scratch\r299-ankle-f-round\parts",
        ]
        r299_dir: Path | None = None
        for cd in candidate_dirs:
            if Path(cd).exists() and (Path(cd) / "weapon.png").exists():
                r299_dir = Path(cd)
                break

        if not r299_dir:
            self.skipTest("無 R299 候選零件目錄，跳過回歸測試")

        rep, _ = run_layered_parts_inspection(
            parts_dir=r299_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["weapon"],
        )

        checks = rep["slotReports"]["weapon"]["checks"]
        self.assertIn("weaponGripOnShaft", checks, "slotReports.weapon 應包含 weaponGripOnShaft 檢查")
        w_shaft = checks["weaponGripOnShaft"]

        self.assertFalse(w_shaft["pass"], "R299 原版 weapon 前手握在槍頭，pass 應為 False")
        self.assertEqual(w_shaft["tier"], "ADVISORY", "建議級檢查未通過時 tier 應為 ADVISORY")
        self.assertTrue(w_shaft.get("advisory", False), "advisory 標記應為 True")
        self.assertEqual(w_shaft["medianShaftThicknessPx"], 20.0, "木桿中位厚度應為 20.0 px")
        self.assertEqual(w_shaft["allowedThicknessRangePx"], [14.0, 26.0], "容許帶應為 [14.0, 26.0] px")
        self.assertEqual(w_shaft.get("gripSampleHalfWidthPx", 32.0), 32.0, "採樣半寬應為 32.0 px")

        grips = w_shaft["grips"]
        # hand_f 落在槍頭/套環
        self.assertFalse(grips["hand_f"]["pass"], "hand_f 握點應判 FAIL")
        self.assertGreater(grips["hand_f"]["measuredThicknessRangePx"][1], 26.0, "hand_f 最大厚度應 > 26 px")

        # hand_b 落在木桿
        self.assertTrue(grips["hand_b"]["pass"], "hand_b 握點應判 PASS")
        self.assertEqual(grips["hand_b"]["measuredThicknessRangePx"], [20, 20], "hand_b 厚度應為純 20 px")

    def test_ag37_shifted_180_raw_weapon_both_grips_pass(self) -> None:
        """
        測試 2: 真實 R299 weapon.png 直接平移 +180 px (不經人工修改木桿)，
        在半寬 32 px 窗口下：
        - 前手握點 x=1365 +/- 32 [1333, 1397]: 離紅纓左邊界 (x=1398) 1 px，全落在純木桿段 (厚度均勻 20 px) -> PASS！
        - 後手握點 x=680 +/- 32 [648, 712]: 厚度 20~21 px -> PASS！
        整體 weaponGripOnShaft 判定為 PASS！
        """
        candidate_dirs = [
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r299-ankle-f-round\parts",
            r"C:\Users\User\3KLife\scratch\r299-ankle-f-round\parts",
        ]
        r299_dir: Path | None = None
        for cd in candidate_dirs:
            if Path(cd).exists() and (Path(cd) / "weapon.png").exists():
                r299_dir = Path(cd)
                break

        if not r299_dir:
            self.skipTest("無 R299 候選零件目錄，跳過回歸測試")

        parts_dir = self.tmp_dir / "parts_shifted180"
        parts_dir.mkdir(parents=True, exist_ok=True)

        # 讀取 R299 原圖並真實平移 +180 px
        orig_w = Image.open(r299_dir / "weapon.png").convert("RGBA")
        w_arr = np.array(orig_w)
        shifted_arr = np.zeros_like(w_arr)
        dx = 180
        shifted_arr[:, dx:, :] = w_arr[:, :-dx, :]
        Image.fromarray(shifted_arr).save(parts_dir / "weapon.png")

        rep, _ = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["weapon"],
        )

        checks = rep["slotReports"]["weapon"]["checks"]
        self.assertIn("weaponGripOnShaft", checks)
        w_shaft = checks["weaponGripOnShaft"]

        self.assertTrue(w_shaft["pass"], "R299 平移 +180 在半寬 32 px 窗口下雙手皆握在木桿上，應判 PASS")
        self.assertEqual(w_shaft["tier"], "PASS")
        self.assertEqual(w_shaft.get("gripSampleHalfWidthPx", 32.0), 32.0)
        self.assertTrue(w_shaft["grips"]["hand_f"]["pass"], "平移 +180 後 hand_f 應 PASS")
        self.assertEqual(w_shaft["grips"]["hand_f"]["measuredThicknessRangePx"], [20, 20])
        self.assertTrue(w_shaft["grips"]["hand_b"]["pass"], "平移 +180 後 hand_b 應 PASS")
        self.assertEqual(w_shaft["grips"]["hand_b"]["measuredThicknessRangePx"], [20, 21])


if __name__ == "__main__":
    unittest.main()
