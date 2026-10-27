"""
單元測試：AG-39 剛性掛點免隱藏延伸與規格 v3.19 (test_ag39_rigid_hidden_extension.py)

依據工單 AG-39 規範：
1. rigid=true 的連接：隱藏延伸與旋轉裂縫皆標記為 NOT_APPLICABLE，不計入 FAIL，報告寫出套用的豁免名稱 (rigidAttachment)。
2. 判斷 rigid 依據規格資料 (j_conn["rigid"] 與 hiddenExtensionWaivers.rigidAttachment == "notApplicable")，不寫死名稱。
3. 非 rigid 連接 (如 arm_lower_f_to_hand_f) 行為不變。
4. 規格 v3.19 中 segments.head.zone 左緣由 760 改為 670，R314 neck-v1 head 核心超界歸零 (0 px, 0.00%)。
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
    derive_joint_connections,
    run_layered_parts_inspection,
)


class TestAG39RigidHiddenExtension(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_ag39_"))
        self.spec = json.loads(Path(DEFAULT_SPEC_PATH).read_text(encoding="utf-8"))

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_ag39_spec_v319_fields(self) -> None:
        """驗證規格 v3.19 新增欄位完整性"""
        cov_waivers = self.spec.get("layeredSlots", {}).get("coverageRule", {}).get("hiddenExtensionWaivers", {})
        self.assertEqual(cov_waivers.get("rigidAttachment"), "notApplicable")
        self.assertIn("rigidNote", cov_waivers)

        head_zone = self.spec.get("segments", {}).get("head", {}).get("zone", [])
        self.assertEqual(head_zone[0], 670, "head zone 左緣應為 670")

    def test_ag39_rigid_joint_marked_not_applicable(self) -> None:
        """
        測試 1: rigid=true 的連接 (如 hand_f_to_weapon)
        隱藏延伸與旋轉裂縫都應標記 NOT_APPLICABLE，appliedWaiver 標記 rigidAttachment。
        父槽與子槽 checks 標記 NOT_APPLICABLE 且 pass=True，不因延伸不足判 FAIL。
        """
        candidate_dirs = [
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r305-final-candidate\parts-r315-wrist-v3",
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r299-ankle-f-round\parts",
        ]
        test_dir: Path | None = None
        for cd in candidate_dirs:
            if Path(cd).exists() and (Path(cd) / "weapon.png").exists():
                test_dir = Path(cd)
                break

        if not test_dir:
            self.skipTest("無候選零件目錄，跳過回歸測試")

        rep, _ = run_layered_parts_inspection(
            parts_dir=test_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["hand_f", "weapon"],
        )

        conn_id = "hand_f_to_weapon"
        # 1. 旋轉裂縫應為 NOT_APPLICABLE
        rot_rep = rep["rotationLeakChecks"][conn_id]
        self.assertEqual(rot_rep["tier"], "NOT_APPLICABLE")
        self.assertTrue(rot_rep.get("notApplicable", False))
        self.assertEqual(rot_rep.get("appliedWaiver"), "rigidAttachment")

        # 2. 隱藏延伸應為 NOT_APPLICABLE
        ext_rep = rep["jointHiddenExtensions"][conn_id]
        self.assertEqual(ext_rep["tier"], "NOT_APPLICABLE")
        self.assertTrue(ext_rep.get("notApplicable", False))
        self.assertEqual(ext_rep.get("appliedWaiver"), "rigidAttachment")

        # 3. hand_f 槽 checks 中的 hidden_extension 應為 NOT_APPLICABLE，不拉低判定
        hf_checks = rep["slotReports"]["hand_f"]["checks"]
        self.assertIn(f"hidden_extension_at_{conn_id}", hf_checks)
        self.assertEqual(hf_checks[f"hidden_extension_at_{conn_id}"]["tier"], "NOT_APPLICABLE")
        self.assertTrue(hf_checks[f"hidden_extension_at_{conn_id}"]["pass"])

    def test_ag39_non_rigid_joint_behavior_unchanged(self) -> None:
        """
        測試 2: 非 rigid 的連接 (如 arm_lower_f_to_hand_f)
        行為維持不變，不被標記為 NOT_APPLICABLE。
        """
        candidate_dirs = [
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r305-final-candidate\parts-r315-wrist-v3",
            r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r299-ankle-f-round\parts",
        ]
        test_dir: Path | None = None
        for cd in candidate_dirs:
            if Path(cd).exists() and (Path(cd) / "hand_f.png").exists():
                test_dir = Path(cd)
                break

        if not test_dir:
            self.skipTest("無候選零件目錄，跳過回歸測試")

        rep, _ = run_layered_parts_inspection(
            parts_dir=test_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["arm_lower_f", "hand_f"],
        )

        conn_id = "arm_lower_f_to_hand_f"
        ext_rep = rep["jointHiddenExtensions"][conn_id]
        self.assertNotEqual(ext_rep["tier"], "NOT_APPLICABLE", "非 rigid 連接不應為 NOT_APPLICABLE")

    def test_ag39_head_zone_v319_core_out_of_bounds_zero(self) -> None:
        """
        測試 3: 規格 v3.19 head zone 左緣由 760 擴至 670 後，
        R314 neck-v1 的 head 核心超界由 12,266 px (4.40%) 歸零至 0 px (0.00%)。
        """
        head_path = Path(r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r305-final-candidate\parts-r314-neck-v1\head.png")
        if not head_path.exists():
            head_path = Path(r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r299-ankle-f-round\parts\head.png")

        if not head_path.exists():
            self.skipTest("無 head.png 候選，跳過回歸測試")

        im = Image.open(head_path).convert("RGBA")
        arr = np.array(im)
        alpha = arr[:, :, 3] > 0
        core = np.zeros_like(alpha)
        core[:881, :] = alpha[:881, :]
        tot_core = int(core.sum())
        margin = 12

        y_grid, x_grid = np.ogrid[:2048, :2048]

        # 舊 zone (x1=760)
        rect_old = [760 - margin, 260 - margin, 1340 + margin, 900 + margin]
        in_old = (x_grid >= rect_old[0]) & (x_grid <= rect_old[2]) & (y_grid >= rect_old[1]) & (y_grid <= rect_old[3])
        out_old = int((core & (~in_old)).sum())
        self.assertGreater(out_old, 10000, "舊 zone 下應有約 1.2 萬 px 鬢髮超界")

        # 新 zone (x1=670)
        rect_new = [670 - margin, 260 - margin, 1340 + margin, 900 + margin]
        in_new = (x_grid >= rect_new[0]) & (x_grid <= rect_new[2]) & (y_grid >= rect_new[1]) & (y_grid <= rect_new[3])
        out_new = int((core & (~in_new)).sum())
        self.assertEqual(out_new, 0, "v3.19 新 zone (x1=670) 下 head 核心超界應歸零")


if __name__ == "__main__":
    unittest.main()
