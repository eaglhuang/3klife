"""
單元測試：AG-37 建議級檢查 weaponGripOnShaft (test_ag37_weapon_grip_on_shaft.py)

依據工單 AG-37 規範：
1. 新增建議級 weaponGripOnShaft：
   在設定姿勢下，以每個握點 (hand_f, hand_b) 為中心、拳頭半徑 50 px 的水平範圍內，
   weapon 每一欄的 alpha 厚度都必須落在木桿厚度帶內。
   木桿厚度從 weapon 自身量測：取所有欄的厚度中位數，容許 +/-30%。
2. 輸出每個握點的實測厚度範圍與是否通過。
3. 回歸測試：
   - R299 現有的 weapon 在前手握點應該 FAIL、後手握點應該 PASS。
   - 平移 +170 px 的合成版本，兩個握點都應該 PASS。
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
from PIL import Image, ImageDraw

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
        測試 1: R299 現有的 weapon.png 在前手握點 (x=1365) 落在槍頭/套環 (厚度 27~62 px)，
        判定為 FAIL (ADVISORY)；後手握點 (x=680) 落在純木桿 (厚度 20 px)，判定為 PASS。
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

        self.assertFalse(w_shaft["pass"], "R299 weapon 前手握在槍頭，pass 應為 False")
        self.assertEqual(w_shaft["tier"], "ADVISORY", "建議級檢查未通過時 tier 應為 ADVISORY")
        self.assertTrue(w_shaft.get("advisory", False), "advisory 標記應為 True")
        self.assertEqual(w_shaft["medianShaftThicknessPx"], 20.0, "木桿中位厚度應為 20.0 px")
        self.assertEqual(w_shaft["allowedThicknessRangePx"], [14.0, 26.0], "容許帶應為 [14.0, 26.0] px")

        grips = w_shaft["grips"]
        # hand_f 落在槍頭
        self.assertFalse(grips["hand_f"]["pass"], "hand_f 握點應判 FAIL")
        self.assertGreater(grips["hand_f"]["measuredThicknessRangePx"][1], 26.0, "hand_f 最大厚度應 > 26 px")

        # hand_b 落在木桿
        self.assertTrue(grips["hand_b"]["pass"], "hand_b 握點應判 PASS")
        self.assertEqual(grips["hand_b"]["measuredThicknessRangePx"], [20, 20], "hand_b 厚度應為純 20 px")

    def test_ag37_shifted_weapon_both_grips_pass(self) -> None:
        """
        測試 2: 水平平移 +180 px 後的合成版本 (雙手皆握在純木桿段)，
        前手握點與後手握點都應該 PASS，整體 weaponGripOnShaft 應為 PASS。
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

        parts_dir = self.tmp_dir / "parts"
        parts_dir.mkdir(parents=True, exist_ok=True)

        # 讀取原圖並平移武器:
        # 建立純木桿貫穿雙手握點 [680, 1365] 的合成 weapon (厚度 20 px)
        orig_w = Image.open(r299_dir / "weapon.png").convert("RGBA")
        w_arr = np.array(orig_w)
        shifted_arr = np.zeros_like(w_arr)

        # 水平平移 +180 px (依總監 R308 裁決與 2347 工單)
        dx = 180
        shifted_arr[:, dx:, :] = w_arr[:, :-dx, :]
        
        # 確保雙手握點周圍 50 px 內皆為標準木桿 (y=1216..1235)
        gx_a = 1365
        gx_b = 680
        for gx in (gx_a, gx_b):
            for x in range(gx - 50, gx + 51):
                # 清除可能延伸出的飄帶/套環，保持木桿主體 20 px
                shifted_arr[:1216, x, :] = 0
                shifted_arr[1236:, x, :] = 0
                shifted_arr[1216:1236, x, :] = [180, 140, 80, 255]

        Image.fromarray(shifted_arr).save(parts_dir / "weapon.png")

        rep, _ = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["weapon"],
        )

        checks = rep["slotReports"]["weapon"]["checks"]
        self.assertIn("weaponGripOnShaft", checks)
        w_shaft = checks["weaponGripOnShaft"]

        self.assertTrue(w_shaft["pass"], "平移後雙手握在木桿上，weaponGripOnShaft 應判 PASS")
        self.assertEqual(w_shaft["tier"], "PASS")
        self.assertTrue(w_shaft["grips"]["hand_f"]["pass"], "平移後 hand_f 應 PASS")
        self.assertTrue(w_shaft["grips"]["hand_b"]["pass"], "平移後 hand_b 應 PASS")

    def test_ag37_r299_shifted_180_raw_tassel_overlap_report(self) -> None:
        """
        測試 3: 真實 R299 weapon.png 直接平移 +180 px（不修整紅纓）的實測狀況：
        - 後手 hand_b (x=680 +/- 50): 厚度 20~22 px -> PASS
        - 前手 hand_f (x=1365 +/- 50): x=1398~1415 共 18 欄掃到紅纓 (厚度 54~98 px) -> FAIL (ADVISORY)
        驗證檢查器在未修整紅纓時能正確捕獲超標欄位並記錄於報告中。
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

        parts_dir = self.tmp_dir / "parts_raw180"
        parts_dir.mkdir(parents=True, exist_ok=True)

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

        w_shaft = rep["slotReports"]["weapon"]["checks"]["weaponGripOnShaft"]
        grips = w_shaft["grips"]
        # hand_b 握在木桿
        self.assertTrue(grips["hand_b"]["pass"])
        self.assertEqual(grips["hand_b"]["measuredThicknessRangePx"], [20, 22])
        # hand_f 掃到紅纓 18 欄
        self.assertFalse(grips["hand_f"]["pass"])
        self.assertEqual(grips["hand_f"]["measuredThicknessRangePx"], [20, 98])
        self.assertFalse(w_shaft["pass"])
        self.assertEqual(w_shaft["tier"], "ADVISORY")


if __name__ == "__main__":
    unittest.main()
