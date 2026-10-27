#!/usr/bin/env python3
"""AG-28 單元測試：旋轉檢查支援握點遮蔽 (rotationOccluders) 與 PASS/漏縫數一致性 (test_ag28_rotation_occluders.py)

依據工單 AG-28 規範：
1. 任務 A：支援 rotationOccluders 遮蔽聯集 (跟隨 child 剛性旋轉)
   - 測試：一組合成資料，拳孔被 weapon 蓋住 -> PASS；同一組拿掉 rotationOccluders -> FAIL。
   - 報告分開列出：未加遮蔽漏縫數、加遮蔽後漏縫數、各遮蔽槽各蓋掉多少像素。
2. 任務 B：PASS/FAIL 與漏縫數一致
   - 報告明確輸出 leakTolerancePx、coreTotalPixels、minRequiredOverlapPixels 與重疊率。
   - 關節旋轉檢查輸出包含「漏縫數 / 容許值 / 結果」，清晰一致。
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
    check_rotation_gap_leak,
    derive_joint_connections,
    run_layered_parts_inspection,
)

HERE = Path(__file__).resolve().parent
TOOLS_DIR = HERE.parent
DEFAULT_SPEC_PATH = TOOLS_DIR / "specs" / "canonical_skeleton_v3.json"


class TestAG28RotationOccluders(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_ag28_occluders_"))
        self.parts_dir = self.tmp_dir / "parts"
        self.parts_dir.mkdir(parents=True, exist_ok=True)
        self.spec = json.loads(DEFAULT_SPEC_PATH.read_text(encoding="utf-8"))

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_synthetic_hand_weapon_occluder_pass_and_fail(self) -> None:
        """任務 A 核心測試：合成資料拳孔被 weapon 蓋住 -> PASS；拿掉 rotationOccluders -> FAIL"""
        w, h = 512, 512
        piv = (256.0, 256.0)

        # 1. parent 部件 (前臂)：覆蓋關節樞紐下半部 (y: 256..350)
        p_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_im)
        p_draw.rectangle([200, 256, 312, 350], fill=(100, 100, 200, 255))
        p_arr = np.array(p_im)

        # 2. child 部件 (手掌)：上半部具手腕肉質 (y: 200..260)，在旋轉交界處具空心拳孔 (250..262, 250..260)
        c_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(c_im)
        c_draw.rectangle([200, 200, 312, 260], fill=(200, 100, 100, 255))
        c_draw.rectangle([250, 250, 262, 260], fill=(0, 0, 0, 0))
        c_arr = np.array(c_im)

        # 3. weapon 部件 (武器)：垂直長條穿過拳孔中心 (x: 248..264, y: 150..350)
        w_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        w_draw = ImageDraw.Draw(w_im)
        w_draw.rectangle([248, 150, 264, 350], fill=(200, 200, 50, 255))
        w_arr = np.array(w_im)

        # (A) 情況 1：無 weapon 遮蔽 -> 拳孔處無咬合重疊，預期 FAIL
        pass_no_occ, _, met_no_occ = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=30.0,
            check_radius_px=40.0,
            w=w,
            h=h,
            occluder_arrs=None,
        )
        self.assertFalse(pass_no_occ, "無 weapon 遮蔽時，空心拳孔應導致旋轉露縫檢查判定 FAIL")
        self.assertLess(
            met_no_occ["overlapPixelsWithOccluders"],
            met_no_occ["minRequiredOverlapPixels"],
            "無遮蔽時重疊應未達門檻 (20%)",
        )
        self.assertGreater(met_no_occ["nonOverlapPixelsWithOccluders"], met_no_occ["leakTolerancePx"])

        # (B) 情況 2：加入 weapon 遮蔽 -> 武器蓋住拳孔並提供充足咬合重疊，預期 PASS
        pass_with_occ, _, met_with_occ = check_rotation_gap_leak(
            parent_arr=p_arr,
            child_arr=c_arr,
            pivot_pt=piv,
            angle_deg=30.0,
            check_radius_px=40.0,
            w=w,
            h=h,
            occluder_arrs={"weapon": w_arr},
        )
        self.assertTrue(pass_with_occ, "加入 weapon 遮蔽後，拳孔被覆蓋，咬合充足應判定 PASS")
        self.assertGreaterEqual(
            met_with_occ["overlapPixelsWithOccluders"],
            met_with_occ["minRequiredOverlapPixels"],
            "重疊像素應達到門檻 (20%)",
        )
        self.assertLessEqual(
            met_with_occ["nonOverlapPixelsWithOccluders"],
            met_with_occ["leakTolerancePx"],
            "非重疊像素應在容許上限 leakTolerancePx 內",
        )
        self.assertIn("weapon", met_with_occ["occludedBySlotPx"])
        self.assertGreater(met_with_occ["occludedBySlotPx"]["weapon"], 500)

    def test_inspection_pipeline_with_and_without_rotation_occluders(self) -> None:
        """端到端測試：透過規格驅動 rotationOccluders 影響 run_layered_parts_inspection 判定"""
        # 繪製各槽 1x1 透明底圖
        all_slots = self.spec["layeredSlots"]["names"]
        for sid in all_slots:
            img = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
            img.save(self.parts_dir / f"{sid}.png")

        # 為 arm_lower_b, hand_b, weapon 繪製測試圖 (動態對齊 hand_b 當前規格樞紐)
        conns = {c["id"]: c for c in derive_joint_connections(self.spec)}
        piv = conns["arm_lower_b_to_hand_b"]["pivot"]
        px, py = int(piv[0]), int(piv[1])

        # arm_lower_b: 覆蓋樞紐周圍下半部
        p_im = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
        ImageDraw.Draw(p_im).rectangle([px - 65, py, px + 65, py + 120], fill=(100, 100, 200, 255))
        p_im.save(self.parts_dir / "arm_lower_b.png")

        # hand_b: 上半部具手腕肉質，在交界處具空心拳孔
        c_im = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(c_im)
        c_draw.rectangle([px - 65, py - 85, px + 65, py + 5], fill=(200, 100, 100, 255))
        c_draw.rectangle([px - 10, py - 10, px + 10, py + 5], fill=(0, 0, 0, 0))
        c_im.save(self.parts_dir / "hand_b.png")

        # weapon: 垂直長條貫穿手腕拳孔
        w_im = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
        ImageDraw.Draw(w_im).rectangle([px - 10, py - 85, px + 10, py + 120], fill=(220, 200, 50, 255))
        w_im.save(self.parts_dir / "weapon.png")

        # (A) 使用 v3.9 規格 (hand_b 含有 rotationOccluders: ["weapon"])
        rep_with_occ, _ = run_layered_parts_inspection(
            parts_dir=self.parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            body_type="standard",
            filter_slots=["arm_lower_b", "hand_b", "weapon"],
        )
        rot_reports = rep_with_occ["rotationLeakChecks"]
        self.assertIn("arm_lower_b_to_hand_b", rot_reports)
        res_with = rot_reports["arm_lower_b_to_hand_b"]
        self.assertTrue(res_with["pass"], "規格含有 rotationOccluders 時應判定 PASS")
        self.assertIn("leakTolerancePx", res_with)
        self.assertIn("rotationOccluders", res_with)
        self.assertEqual(res_with["rotationOccluders"], ["weapon"])
        pos_m = res_with["positiveAngleMetrics"]
        self.assertIn("leakWithoutOccludersPx", pos_m)
        self.assertIn("leakWithOccludersPx", pos_m)
        self.assertIn("occludedBySlotPx", pos_m)
        self.assertIn("weapon", pos_m["occludedBySlotPx"])
        self.assertGreater(pos_m["occludedBySlotPx"]["weapon"], 0)

        # (B) 拿掉 rotationOccluders 的規格
        spec_no_occ = copy.deepcopy(self.spec)
        spec_no_occ["layeredSlots"]["jointOverrides"]["hand_b"]["rotationOccluders"] = []
        no_occ_spec_path = self.tmp_dir / "spec_no_occ.json"
        no_occ_spec_path.write_text(json.dumps(spec_no_occ, indent=2, ensure_ascii=False), encoding="utf-8")

        rep_no_occ, _ = run_layered_parts_inspection(
            parts_dir=self.parts_dir,
            spec_path=no_occ_spec_path,
            body_type="standard",
            filter_slots=["arm_lower_b", "hand_b", "weapon"],
        )
        res_no = rep_no_occ["rotationLeakChecks"]["arm_lower_b_to_hand_b"]
        self.assertFalse(res_no["pass"], "拿掉 rotationOccluders 後空心拳孔應判定 FAIL")

    def test_report_consistency_metrics_present_for_all_joints(self) -> None:
        """任務 B 報告一致性測試：確認關節旋轉檢查輸出包含 leakTolerancePx、overlap 與詳細指標"""
        all_slots = self.spec["layeredSlots"]["names"]
        for sid in all_slots:
            img = Image.new("RGBA", (2048, 2048), (100, 100, 100, 255))
            img.save(self.parts_dir / f"{sid}.png")

        rep, _ = run_layered_parts_inspection(
            parts_dir=self.parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            body_type="standard",
            filter_slots=["thigh_f", "shin_f"],
        )
        rot_reports = rep["rotationLeakChecks"]
        self.assertIn("thigh_f_to_shin_f", rot_reports)
        j_rep = rot_reports["thigh_f_to_shin_f"]

        self.assertIn("coreTotalPixels", j_rep)
        self.assertIn("minRequiredOverlapPixels", j_rep)
        self.assertIn("leakTolerancePx", j_rep)
        self.assertEqual(
            j_rep["leakTolerancePx"] + j_rep["minRequiredOverlapPixels"],
            j_rep["coreTotalPixels"],
            "容許非重疊上限 leakTolerancePx 加上重疊需求應等於核心總像素",
        )

    def test_codex_r292_dataset_hand_and_legs_metrics(self) -> None:
        """驗收資料測試：若存在 Codex R292 趙雲資料，驗證後手與腿部旋轉檢查結果與指標一致性"""
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
            self.skipTest(f"跳過 R292 資料測試: 嘗試搜尋以下路徑均不存在:\n" + "\n".join(str(d) for d in candidate_dirs if d))

        parts_dir = found_dir / "parts"
        anchors_dir = found_dir / "anchors"

        rep, _ = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            body_type="standard",
            anchors_path=anchors_dir,
            filter_slots=["arm_lower_b", "hand_b", "weapon", "thigh_f", "shin_f", "foot_f", "thigh_b", "shin_b", "foot_b"],
        )
        rot_reports = rep["rotationLeakChecks"]

        # 1. 後手 arm_lower_b_to_hand_b：受 weapon 遮蔽保護，確認配置與指標
        self.assertIn("arm_lower_b_to_hand_b", rot_reports)
        hand_res = rot_reports["arm_lower_b_to_hand_b"]
        self.assertEqual(hand_res["rotationOccluders"], ["weapon"])
        if hand_res.get("pivotSource") == "joint":
            self.assertTrue(hand_res["pass"], "R292 後手在舊腕關節樞紐與 weapon 遮蔽下判定 PASS")
        else:
            self.assertEqual(hand_res.get("pivotSource"), "bonePivot")

        # 2. 雙腿各關節：咬合充足 (<= 676px leakTolerancePx)，判定 PASS
        for joint_id, expected_leak in [
            ("thigh_f_to_shin_f", 285),
            ("shin_f_to_foot_f", 490),
            ("shin_b_to_foot_b", 495),
        ]:
            self.assertIn(joint_id, rot_reports)
            j_res = rot_reports[joint_id]
            self.assertTrue(j_res["pass"], f"雙腿關節 {joint_id} 應判定 PASS")
            self.assertEqual(j_res["leakTolerancePx"], 676)
            self.assertEqual(j_res["positiveAngleMetrics"]["leakWithOccludersPx"], expected_leak)
            self.assertLessEqual(j_res["positiveAngleMetrics"]["leakWithOccludersPx"], j_res["leakTolerancePx"])


if __name__ == "__main__":
    unittest.main()
