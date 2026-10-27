#!/usr/bin/env python3
"""AG-31b 單元測試：旋轉樞紐一律改用骨點 (jointGeometry.rotationPivot) 與肢段膠囊軸 (test_ag31b_joint_geometry_bone_pivot.py)

依據工單 AG-31b 規範：
1. rotationPivot: "childBonePivot"
   - 旋轉露縫、jointCrackPx 樞紐用 child 的 bones[].pivotCanvasPx，來源標記為 "bonePivot"。
   - 缺鍵時維持舊行為 (手部取 joints 腕部)，來源標記為 "joint"。
2. scopeCapsuleAxis: "boneToChildBonePivot"
   - 肢段膠囊軸 = 自身骨點 -> 子骨點。
3. 實資料多路徑尋找與 R292 手部關節新舊並列測試。
"""
from __future__ import annotations

import copy
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
    build_slot_scope_mask,
    derive_joint_connections,
    run_layered_parts_inspection,
)

DEFAULT_SPEC_PATH = TOOLS_DIR / "specs" / "canonical_skeleton_v3.json"


class TestAG31bJointGeometryBonePivot(unittest.TestCase):
    def setUp(self) -> None:
        self.spec = json.loads(DEFAULT_SPEC_PATH.read_text(encoding="utf-8"))

    def test_synthetic_hand_uses_bone_pivot_when_specified(self) -> None:
        """合成測試：規格指定 rotationPivot == 'childBonePivot' 時，手部樞紐取骨點而非 wrist joint"""
        conns = {c["id"]: c for c in derive_joint_connections(self.spec)}
        self.assertIn("arm_lower_b_to_hand_b", conns)
        conn_b = conns["arm_lower_b_to_hand_b"]

        # v3.12 規格有 jointGeometry.rotationPivot == 'childBonePivot'
        # hand_b 骨點為 (680.0, 1225.0)，而 wrist_b joint 為 (715.0, 1180.0)
        self.assertEqual(conn_b["pivot"], (680.0, 1225.0))
        self.assertEqual(conn_b["pivotSource"], "bonePivot")

    def test_fallback_to_joint_when_joint_geometry_missing(self) -> None:
        """合成測試：若缺少 jointGeometry 鍵，維持舊行為 (手部取 wrist joint)"""
        spec_legacy = copy.deepcopy(self.spec)
        if "jointGeometry" in spec_legacy.get("layeredSlots", {}):
            del spec_legacy["layeredSlots"]["jointGeometry"]

        conns_legacy = {c["id"]: c for c in derive_joint_connections(spec_legacy)}
        self.assertIn("arm_lower_b_to_hand_b", conns_legacy)
        conn_b = conns_legacy["arm_lower_b_to_hand_b"]

        # 缺少鍵時 fallback 到 wrist_b joint (715.0, 1180.0)
        self.assertEqual(conn_b["pivot"], (715.0, 1180.0))
        self.assertEqual(conn_b["pivotSource"], "joint")

    def test_scope_capsule_axis_mode(self) -> None:
        """合成測試：驗證 scopeCapsuleAxis == 'boneToChildBonePivot' 成功產出前臂膠囊遮罩"""
        mask, kind = build_slot_scope_mask("arm_lower_b", self.spec, "standard", 2048, 2048, 0.0)
        self.assertIsNotNone(mask)
        self.assertEqual(kind, "bone_capsule")

    def test_r292_hand_joints_bone_pivot_inspection(self) -> None:
        """實資料驗證：R292 報告包含 pivot 與 pivotSource 欄位"""
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
        hb = rot_reports["arm_lower_b_to_hand_b"]
        self.assertEqual(hb["pivot"], [680.0, 1225.0])
        self.assertEqual(hb["pivotSource"], "bonePivot")


if __name__ == "__main__":
    unittest.main()
