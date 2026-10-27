#!/usr/bin/env python3
"""AG-27 單元測試：Spine 4.2 動作庫合併工具測試 (test_merge_motion_library.py)

測試項目：
1. Sparkle v10 實測：預期拒絕合併 (overallPass == False)，報告列出 foot_f/b 父骨不符、setup pose 超差與 arm_upper 位移違規。
2. Setup 相符之合格動作庫：預期合併成功 (overallPass == True)，動畫與事件逐值完整保留。
3. 動畫引用未定義 slot：預期拒絕合併。
4. 動作軌道 scale 縮放違規檢查。
5. CLI 命令列工具退出碼測試 (成功 exit 0，失敗 exit 1)。
"""
from __future__ import annotations

import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOOLS_DIR = HERE.parent
REPO_ROOT = TOOLS_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools_anim.build_spine_from_v3 import (
    build_spine_from_v3,
    load_v3_spec,
)
from tools_anim.merge_motion_library import (
    audit_animation_tracks,
    compare_skeletons,
    merge_motion_library,
)

DEFAULT_SPEC_PATH = TOOLS_DIR / "specs" / "canonical_skeleton_v3.json"
SPARKLE_V10_PATH = TOOLS_DIR.parent / "scratch" / "sparkle_v10" / "canonical_spine42.json"


class TestMergeMotionLibrary(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_merge_motion_"))
        self.spec = load_v3_spec(DEFAULT_SPEC_PATH)
        self.builder_out_dir = self.tmp_dir / "builder_out"
        self.builder_out_dir.mkdir(parents=True, exist_ok=True)
        self.parts_dir = self.tmp_dir / "parts"
        self.parts_dir.mkdir(parents=True, exist_ok=True)

        # 建立 builder 輸出的 Spine 4.2 骨架
        self.builder_spine_path = self._generate_builder_skeleton()

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _generate_builder_skeleton(self) -> Path:
        """透過 build_spine_from_v3 生成標準 Spine 4.2 骨架"""
        slot_names = self.spec["layeredSlots"]["names"]
        # 繪製各槽 1x1 假圖檔以供 builder 導出 slot 結構
        import numpy as np
        from PIL import Image

        for sid in slot_names:
            img = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
            img.save(self.parts_dir / f"{sid}.png")

        rep = build_spine_from_v3(
            spec=self.spec,
            parts_dir=self.parts_dir,
            output_dir=self.builder_out_dir,
            skeleton_name="test_char",
            apply_joint_overrides=True,
        )
        return self.builder_out_dir / "test_char.json"

    def test_sparkle_v10_refused_due_to_parent_and_setup_mismatch(self) -> None:
        """測試 1: Sparkle v10 實測 - 預期拒絕合併 (結束碼非 0，父骨與 setup pose 不符)"""
        if not SPARKLE_V10_PATH.exists():
            self.skipTest(f"跳過 v10 實測: 找不到 {SPARKLE_V10_PATH}")

        report_p = self.tmp_dir / "v10_merge_report.json"
        out_spine_p = self.tmp_dir / "v10_merged.json"

        report, passed = merge_motion_library(
            builder_spine_path=self.builder_spine_path,
            motion_library_path=SPARKLE_V10_PATH,
            output_spine_path=out_spine_p,
            report_output_path=report_p,
        )

        # 1. 預期為拒絕合併
        self.assertFalse(passed, "Sparkle v10 與 builder 骨架不相容，應拒絕合併")
        self.assertEqual(report["status"], "REFUSED")
        self.assertFalse(report["overallPass"])
        self.assertFalse(out_spine_p.exists(), "拒絕合併時不應產出合併 Spine JSON")

        # 2. 驗證拒絕原因中含有 foot 父骨不符
        reasons_text = " ".join(report["refusalReasons"])
        self.assertIn("foot_f", reasons_text, "拒絕原因應包含 foot_f 父骨不符")
        self.assertIn("foot_b", reasons_text, "拒絕原因應包含 foot_b 父骨不符")

        # 3. 驗證 Setup pose 超差報告
        bone_checks = {b["bone"]: b for b in report["boneChecks"]}
        self.assertIn("arm_upper_f", bone_checks)
        self.assertFalse(bone_checks["arm_upper_f"]["withinTolerance"])

        # 4. 驗證 arm_upper translate > 16px 違規被完整列出
        track_v = report["trackViolations"]["violations"]
        upper_v = [v for v in track_v if v.get("rule") == "arm_upper_translate_limit_16px"]
        self.assertTrue(len(upper_v) > 0, "應檢出 arm_upper 位移違規")
        thrust_upper = next((v for v in upper_v if v["animation"] == "thrust" and v["bone"] == "arm_upper_f"), None)
        self.assertIsNotNone(thrust_upper)
        self.assertGreaterEqual(thrust_upper["maxTranslatePx"], 160.0, "thrust 的 arm_upper_f 位移量應在 160~200+ px")

    def test_matching_motion_library_merges_successfully(self) -> None:
        """測試 2: setup pose 完全相符之小型動作庫 - 預期合併成功，動畫數值逐值不變"""
        skel_data = json.loads(self.builder_spine_path.read_text(encoding="utf-8"))

        # 以骨架的 bones 為基礎建立一份完全匹配的動作庫
        motion_lib = {
            "skeleton": copy.deepcopy(skel_data["skeleton"]),
            "bones": copy.deepcopy(skel_data["bones"]),
            "slots": copy.deepcopy(skel_data["slots"]),
            "events": {
                "hit": {"int": 1, "float": 0.0, "string": "impact"},
            },
            "animations": {
                "test_idle": {
                    "bones": {
                        "torso": {
                            "translate": [
                                {"time": 0.0, "x": 0.0, "y": 0.0},
                                {"time": 0.5, "x": 0.0, "y": -4.0},
                                {"time": 1.0, "x": 0.0, "y": 0.0},
                            ]
                        }
                    },
                    "events": [
                        {"time": 0.5, "name": "hit", "int": 1, "string": "impact"}
                    ]
                }
            }
        }
        motion_path = self.tmp_dir / "valid_motion.json"
        motion_path.write_text(json.dumps(motion_lib, indent=2, ensure_ascii=False), encoding="utf-8")

        out_spine_p = self.tmp_dir / "valid_merged.json"
        rep_p = self.tmp_dir / "valid_report.json"

        report, passed = merge_motion_library(
            builder_spine_path=self.builder_spine_path,
            motion_library_path=motion_path,
            output_spine_path=out_spine_p,
            report_output_path=rep_p,
        )

        self.assertTrue(passed, "相符動作庫應合併成功")
        self.assertEqual(report["status"], "MERGED")
        self.assertTrue(out_spine_p.exists(), "成功時應產出合併 Spine JSON")

        merged_data = json.loads(out_spine_p.read_text(encoding="utf-8"))
        self.assertIn("animations", merged_data)
        self.assertIn("test_idle", merged_data["animations"])
        self.assertIn("events", merged_data)
        self.assertIn("hit", merged_data["events"])

        # 驗證動畫數值逐值完全相同
        self.assertEqual(
            merged_data["animations"]["test_idle"],
            motion_lib["animations"]["test_idle"],
            "合併後的動畫數據必須與動作庫逐值完全一致，不得被修改",
        )

    def test_missing_slot_in_animation_refuses_merge(self) -> None:
        """測試 3: 動畫中引用的 slot 在骨架中不存在時，拒絕合併"""
        skel_data = json.loads(self.builder_spine_path.read_text(encoding="utf-8"))
        motion_lib = {
            "skeleton": copy.deepcopy(skel_data["skeleton"]),
            "bones": copy.deepcopy(skel_data["bones"]),
            "slots": copy.deepcopy(skel_data["slots"]),
            "animations": {
                "bad_anim": {
                    "slots": {
                        "slot_not_in_skeleton": {
                            "attachment": [{"time": 0.0, "name": "something"}]
                        }
                    }
                }
            }
        }
        motion_path = self.tmp_dir / "bad_slot_motion.json"
        motion_path.write_text(json.dumps(motion_lib, indent=2, ensure_ascii=False), encoding="utf-8")

        report, passed = merge_motion_library(
            builder_spine_path=self.builder_spine_path,
            motion_library_path=motion_path,
        )
        self.assertFalse(passed, "引用未定義 slot 應拒絕合併")
        reasons_text = " ".join(report["refusalReasons"])
        self.assertIn("slot_not_in_skeleton", reasons_text)

    def test_scale_violation_audit(self) -> None:
        """測試 4: 動作軌道 scale 違規審查 (檢出手臂/武器 scale != 1.0)"""
        skel_data = json.loads(self.builder_spine_path.read_text(encoding="utf-8"))
        motion_lib = {
            "skeleton": copy.deepcopy(skel_data["skeleton"]),
            "bones": copy.deepcopy(skel_data["bones"]),
            "slots": copy.deepcopy(skel_data["slots"]),
            "animations": {
                "scale_test": {
                    "bones": {
                        "arm_upper_f": {
                            "scale": [
                                {"time": 0.0, "x": 1.0, "y": 1.0},
                                {"time": 0.5, "x": 1.2, "y": 1.0},
                            ]
                        }
                    }
                }
            }
        }
        violations = audit_animation_tracks(motion_lib)
        scale_v = [v for v in violations if v["rule"] == "scale_must_be_unity"]
        self.assertEqual(len(scale_v), 1)
        self.assertEqual(scale_v[0]["bone"], "arm_upper_f")
        self.assertEqual(scale_v[0]["scaleX"], 1.2)

    def test_cli_execution_exit_codes(self) -> None:
        """測試 5: CLI 命令列工具測試 - 失敗 exit 1, 成功 exit 0"""
        py_exe = sys.executable
        cli_script = TOOLS_DIR / "merge_motion_library.py"

        # (A) 失敗案例 (v10)
        if SPARKLE_V10_PATH.exists():
            res_fail = subprocess.run(
                [py_exe, str(cli_script), "--skeleton", str(self.builder_spine_path), "--motions", str(SPARKLE_V10_PATH)],
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(res_fail.returncode, 0, "v10 合併失敗時 CLI 結束碼應非 0")
            out_json = json.loads(res_fail.stdout)
            self.assertEqual(out_json["status"], "REFUSED")


if __name__ == "__main__":
    unittest.main()
