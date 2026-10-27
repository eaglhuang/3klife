"""
單元測試：AG-36 / AG-38 握拳握點建議級檢查 gripRegistration (test_ag36_grip_registration.py)

依據工單 AG-38 規範：
1. gripRegistration 的判定改為「拳頭是否包住握點」：
   - 從握點往 8 個方向 (每 45°) 射線，在 40 px 內碰到 hand alpha >= 128 的方向數，至少 6/8 才算 PASS。
   - 拳頭會被槍桿穿過，所以沿槍桿方向允許碰不到。
   - 同時量握點 +/-12 px 內 hand 的覆蓋率，只輸出，不判定。
2. 形心距離保留在報告中當參考，不再作為判定條件。
3. 回歸測試：
   - R299 原版 hand_f：應 FAIL (ADVISORY)，拳頭浮在槍桿上方，射線命中 0/8。
   - 平移 (-65, +54) 的 hand_f：應 PASS，拳孔對準握點，射線命中 8/8。
   - R299 hand_b：應 PASS，射線命中 8/8。
4. 維持建議級 (advisory)。
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
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_ag38_"))
        self.spec = json.loads(Path(DEFAULT_SPEC_PATH).read_text(encoding="utf-8"))
        self.canvas_w = int(self.spec.get("canvas", {}).get("w", 2048))
        self.canvas_h = int(self.spec.get("canvas", {}).get("h", 2048))

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_ag38_grip_registration_r299_raw_hand_f_fails(self) -> None:
        """
        測試 1: R299 原版 hand_f 拳頭浮在槍桿上方，握點在空白區，
        8 方向射線命中 0/8 (< 6/8)，判定應為 FAIL (ADVISORY)。
        形心距離約 143.6 px，保留當參考。
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

        self.assertFalse(g_reg["pass"], "R299 原版 hand_f 未包覆握點，pass 應為 False")
        self.assertEqual(g_reg["tier"], "ADVISORY", "建議級檢查未通過時 tier 應為 ADVISORY")
        self.assertTrue(g_reg.get("advisory", False), "advisory 標記應為 True")
        self.assertEqual(g_reg["raysHit"], 0, "8 方向命中應為 0/8")
        self.assertEqual(g_reg["coverage12pxPct"], 0.0, "+/-12px 覆蓋率應為 0.0%")
        self.assertAlmostEqual(g_reg["distancePx"], 143.6, delta=1.0, msg="形心距離保留參考約 143.6 px")

    def test_ag38_grip_registration_shifted_hand_f_passes(self) -> None:
        """
        測試 2: 平移 (-65, +54) 的 hand_f，拳孔對準握點，
        8 方向射線在 40 px 內命中 8/8 (>= 6/8)，判定應為 PASS！
        形心距離約 117.3 px，不再阻擋判定。
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

        parts_dir = self.tmp_dir / "parts_shifted_hf"
        parts_dir.mkdir(parents=True, exist_ok=True)

        orig_hf = Image.open(r299_dir / "hand_f.png").convert("RGBA")
        hf_arr = np.array(orig_hf)
        shifted_arr = np.zeros_like(hf_arr)
        dx, dy = -65, 54
        for y in range(hf_arr.shape[0]):
            for x in range(hf_arr.shape[1]):
                if hf_arr[y, x, 3] > 0:
                    nx = x + dx
                    ny = y + dy
                    if 0 <= nx < hf_arr.shape[1] and 0 <= ny < hf_arr.shape[0]:
                        shifted_arr[ny, nx] = hf_arr[y, x]
        Image.fromarray(shifted_arr).save(parts_dir / "hand_f.png")

        rep, _ = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["hand_f"],
        )

        checks = rep["slotReports"]["hand_f"]["checks"]
        self.assertIn("gripRegistration", checks)
        g_reg = checks["gripRegistration"]

        self.assertTrue(g_reg["pass"], "平移 (-65,+54) 後 hand_f 拳孔包覆握點，應判定為 PASS")
        self.assertEqual(g_reg["tier"], "PASS")
        self.assertGreaterEqual(g_reg["raysHit"], 6, "命中方向數應 >= 6/8")
        self.assertEqual(g_reg["raysHit"], 8, "實測 8 方向全數命中")
        self.assertGreater(g_reg["coverage12pxPct"], 30.0, "+/-12px 覆蓋率應大於 30%")
        self.assertAlmostEqual(g_reg["distancePx"], 117.3, delta=1.0, msg="形心距離約 117.3 px 作為參考")

    def test_ag38_grip_registration_hand_b_passes(self) -> None:
        """
        測試 3: R299 原版 hand_b，握點在拳孔內，
        8 方向射線命中 8/8 (>= 6/8)，判定應為 PASS！
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

        self.assertTrue(g_reg["pass"], "R299 hand_b 拳孔包覆握點，應判定 PASS")
        self.assertEqual(g_reg["tier"], "PASS")
        self.assertGreaterEqual(g_reg["raysHit"], 6, "命中方向數應 >= 6/8")
        self.assertEqual(g_reg["raysHit"], 8, "實測 8 方向全數命中")


if __name__ == "__main__":
    unittest.main()
