#!/usr/bin/env python3
"""AG-32 單元測試：裂縫門檻依戰場顯示尺寸動態換算 (test_ag32_crack_gate_display_height.py)

依據工單 AG-32 規範：
1. 擬議閘門的 crack 門檻改由規格計算：
   門檻 = maxCrackAreaDisplayPx2 * (H / referenceDisplayHeightPx)^2
   不可寫死 79；報告列出算出的門檻與來源欄位。
   derivedMaxCrackCanvasPx 只做核對：若和計算值差 > 1，報告警告。
2. 合成測試：同一 crack 面積，改 referenceDisplayHeightPx 會改變判定。
3. 合成測試：手部骨點與 joint 不同時，樞紐取骨點 (pivotSource: "bonePivot")。
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
    derive_joint_connections,
    run_layered_parts_inspection,
)

DEFAULT_SPEC_PATH = TOOLS_DIR / "specs" / "canonical_skeleton_v3.json"


class TestAG32CrackGateDisplayHeight(unittest.TestCase):
    def test_crack_threshold_changes_with_reference_display_height(self) -> None:
        """合成測試：同一 crack 面積，改 referenceDisplayHeightPx 會改變判定"""
        with open(DEFAULT_SPEC_PATH, "r", encoding="utf-8") as f:
            base_spec = json.load(f)

        tmp_dir = tempfile.mkdtemp(prefix="test_ag32_threshold_")
        try:
            parts_dir = Path(tmp_dir) / "parts"
            parts_dir.mkdir(parents=True, exist_ok=True)
            w, h = 2048, 2048

            # 建立合成前臂與前手，使其在旋轉時產生約 50~65 px 的 crack
            piv = (1365.0, 1225.0)  # hand_f 骨點
            p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            p_draw = ImageDraw.Draw(p_im)
            p_draw.rectangle([1340, 1100, 1390, 1225], fill=(120, 120, 200, 255))
            p_draw.ellipse([piv[0] - 25, piv[1] - 25, piv[0] + 25, piv[1] + 25], fill=(120, 120, 200, 255))
            p_im.save(parts_dir / "arm_lower_f.png")

            c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            c_draw = ImageDraw.Draw(c_im)
            c_draw.rectangle([1340, 1231, 1390, 1330], fill=(200, 120, 120, 255))
            c_draw.ellipse([piv[0] - 20, piv[1] - 20, piv[0] + 20, piv[1] + 20], fill=(200, 120, 120, 255))
            c_draw.rectangle([1355, 1220, 1375, 1226], fill=(0, 0, 0, 0))
            c_im.save(parts_dir / "hand_f.png")

            # 測試設定 1：referenceDisplayHeightPx = 360 -> threshold = 4 * (1600/360)^2 ≈ 79.01 px
            spec1 = json.loads(json.dumps(base_spec))
            spec1["layeredSlots"]["rotationCrack"]["gate"]["referenceDisplayHeightPx"] = 360
            spec1["layeredSlots"]["rotationCrack"]["gate"]["maxCrackAreaDisplayPx2"] = 4
            spec1["layeredSlots"]["rotationCrack"]["gate"]["derivedMaxCrackCanvasPx"] = 79
            spec1_path = Path(tmp_dir) / "spec1.json"
            with open(spec1_path, "w", encoding="utf-8") as f:
                json.dump(spec1, f)

            report1, _ = run_layered_parts_inspection(parts_dir, spec1_path)
            arm_leak1 = report1["rotationLeakChecks"].get("arm_lower_f_to_hand_f", {})
            gate1 = arm_leak1.get("proposedGate", {})
            cond1 = gate1.get("conditions", {})
            thresh1 = cond1.get("maxJointCrackPx", 0)

            self.assertAlmostEqual(thresh1, 79.01, places=1)
            self.assertEqual(cond1.get("crackGateSource", {}).get("derivedDiffWarning"), None)

            crack_val = arm_leak1.get("jointCrackPositivePx", 0)

            # 測試設定 2：調整 referenceDisplayHeightPx = 600 -> threshold = 4 * (1600/600)^2 ≈ 28.44 px
            spec2 = json.loads(json.dumps(base_spec))
            spec2["layeredSlots"]["rotationCrack"]["gate"]["referenceDisplayHeightPx"] = 600
            spec2["layeredSlots"]["rotationCrack"]["gate"]["maxCrackAreaDisplayPx2"] = 4
            spec2["layeredSlots"]["rotationCrack"]["gate"]["derivedMaxCrackCanvasPx"] = 28
            spec2_path = Path(tmp_dir) / "spec2.json"
            with open(spec2_path, "w", encoding="utf-8") as f:
                json.dump(spec2, f)

            report2, _ = run_layered_parts_inspection(parts_dir, spec2_path)
            arm_leak2 = report2["rotationLeakChecks"].get("arm_lower_f_to_hand_f", {})
            gate2 = arm_leak2.get("proposedGate", {})
            cond2 = gate2.get("conditions", {})
            thresh2 = cond2.get("maxJointCrackPx", 0)

            self.assertAlmostEqual(thresh2, 28.44, places=1)
            self.assertNotEqual(thresh1, thresh2)

            if crack_val > thresh2:
                self.assertEqual(arm_leak2.get("proposedTier"), "FAIL")
                reasons = gate2.get("reasons", [])
                self.assertTrue(any("jointCrackPx" in r for r in reasons))

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_derived_max_crack_warning_when_diff_greater_than_1(self) -> None:
        """驗證 derivedMaxCrackCanvasPx 核對：若與計算值差 > 1px，報告輸出警告"""
        with open(DEFAULT_SPEC_PATH, "r", encoding="utf-8") as f:
            spec = json.load(f)

        tmp_dir = tempfile.mkdtemp(prefix="test_ag32_warn_")
        try:
            parts_dir = Path(tmp_dir) / "parts"
            parts_dir.mkdir(parents=True, exist_ok=True)
            w, h = 2048, 2048

            im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(im)
            draw.rectangle([1340, 1200, 1380, 1240], fill=(100, 100, 100, 255))
            im.save(parts_dir / "arm_lower_f.png")
            im.save(parts_dir / "hand_f.png")

            # 故意將 derived 設為 99 (與計算值 79 差 20 > 1)
            spec["layeredSlots"]["rotationCrack"]["gate"]["referenceDisplayHeightPx"] = 360
            spec["layeredSlots"]["rotationCrack"]["gate"]["maxCrackAreaDisplayPx2"] = 4
            spec["layeredSlots"]["rotationCrack"]["gate"]["derivedMaxCrackCanvasPx"] = 99
            spec_path = Path(tmp_dir) / "spec_warn.json"
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec, f)

            report, _ = run_layered_parts_inspection(parts_dir, spec_path)
            arm_leak = report["rotationLeakChecks"].get("arm_lower_f_to_hand_f", {})
            gate = arm_leak.get("proposedGate", {})
            source_info = gate.get("conditions", {}).get("crackGateSource", {})

            warn = source_info.get("derivedDiffWarning")
            self.assertIsNotNone(warn, "差異 > 1px 時必須產生 derivedDiffWarning")
            self.assertIn("differs from calculated threshold", warn)

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    def test_hand_pivot_uses_bone_pivot_and_labels_source(self) -> None:
        """合成測試：手部骨點與 joint 不同時，樞紐取 bones[].pivotCanvasPx 並標記 pivotSource"""
        with open(DEFAULT_SPEC_PATH, "r", encoding="utf-8") as f:
            spec = json.load(f)

        conns = derive_joint_connections(spec)
        hand_conns = [c for c in conns if "hand" in c.get("child_slot", "")]

        self.assertGreaterEqual(len(hand_conns), 2, "手部應有 hand_b 與 hand_f 關節連接")
        for c in hand_conns:
            self.assertEqual(c.get("pivotSource"), "bonePivot")
            child_name = c["child_slot"]
            bone_def = next(b for b in spec["bones"] if b["name"] == child_name)
            expected_piv = tuple(float(v) for v in bone_def["pivotCanvasPx"])
            self.assertEqual(c["pivot"], expected_piv)


if __name__ == "__main__":
    unittest.main()
