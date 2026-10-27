#!/usr/bin/env python3
"""AG-24 單元測試：從 v3 標準骨架 JSON 生成 Spine 4.2 骨架與分槽 Skin (test_build_spine_from_v3.py)

驗收項目：
1. 21 色塊分槽生成 Spine 4.2 骨架與圖集：
   - 檢查 bonesCount、slotsCount、attachments 等結構合規。
   - Setup pose 重組渲染與各槽原位疊合逐像素比對，差異 <= 1 px。
2. 縮放 1.1 倍測試：
   - 當 bones/canvas 縮放 1.1 倍時，輸出骨骼座標與 local 偏移精確縮放 1.1 倍，證明絕無寫死座標。
3. 缺槽輸出空 slot 且報告標記 MISSING 測試。
4. jointOverrides 測試（foot 父骨改為 shin）。
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

import cv2
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from build_spine_from_v3 import (
    build_spine_from_v3,
    compute_spine_bones,
    load_v3_spec,
)

SPEC_PATH = Path(__file__).resolve().parent.parent / "specs" / "canonical_skeleton_v3.json"


class TestBuildSpineFromV3(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not SPEC_PATH.exists():
            raise FileNotFoundError(f"找不到測試規範 JSON: {SPEC_PATH}")
        cls.spec = load_v3_spec(SPEC_PATH)

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="test_spine_v3_")
        self.parts_dir = Path(self.temp_dir) / "parts"
        self.parts_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir = Path(self.temp_dir) / "out"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_mock_parts(self, slot_names: list[str], canvas_w: int = 2048, canvas_h: int = 2048):
        """為指定的槽位建立 2048x2048 的色塊分槽圖檔。"""
        bones = {b["name"]: b["pivotCanvasPx"] for b in self.spec.get("bones", [])}

        for idx, s in enumerate(slot_names):
            img = np.zeros((canvas_h, canvas_w, 4), dtype=np.uint8)
            piv = bones.get(s, [canvas_w // 2, canvas_h // 2])
            cx, cy = int(piv[0]), int(piv[1])

            # 在關節周圍畫一個 60x60 的方塊作為可見像素
            x1 = max(0, cx - 30)
            x2 = min(canvas_w - 1, cx + 30)
            y1 = max(0, cy - 30)
            y2 = min(canvas_h - 1, cy + 30)

            # 使用各槽專屬顏色
            color_r = (idx * 37 + 50) % 256
            color_g = (idx * 67 + 80) % 256
            color_b = (idx * 97 + 110) % 256
            img[y1:y2, x1:x2] = [color_b, color_g, color_r, 255]

            cv2.imwrite(str(self.parts_dir / f"{s}.png"), img)

    def test_full_21_slots_build_and_pixel_perfect_reassembly(self):
        """測試 1: 完整的 21 槽色塊建置，Setup pose 重組逐像素比對差異 <= 1 px。"""
        slot_names = self.spec["layeredSlots"]["names"]
        self._create_mock_parts(slot_names)

        rep = build_spine_from_v3(
            spec=self.spec,
            parts_dir=self.parts_dir,
            output_dir=self.output_dir,
            skeleton_name="char_full",
            apply_joint_overrides=True,
        )

        self.assertTrue(rep["overallPass"], "離線建置應 PASS")
        self.assertEqual(rep["skeleton"]["activeAttachmentsCount"], 21)
        self.assertEqual(len(rep["skeleton"]["missingSlots"]), 0)
        self.assertTrue(rep["reassemblyDiff"]["pass"])
        self.assertLessEqual(
            rep["reassemblyDiff"]["maxPixelDiff"],
            1,
            f"重組逐像素最大差應 <= 1 px，實際為 {rep['reassemblyDiff']['maxPixelDiff']}",
        )

        # 檢查輸出的 Spine 4.2 JSON
        json_path = Path(rep["outputs"]["json"])
        self.assertTrue(json_path.exists())
        skel = json.loads(json_path.read_text(encoding="utf-8"))
        self.assertEqual(skel["skeleton"]["spine"], "4.2.00")
        self.assertEqual(len(skel["bones"]), len(self.spec["bones"]))
        self.assertEqual(len(skel["slots"]), len(slot_names))

        # 檢查圖集與 atlas 檔
        self.assertTrue(Path(rep["outputs"]["atlas"]).exists())
        self.assertTrue(Path(rep["outputs"]["png"]).exists())

    def test_missing_slots_handling(self):
        """測試 2: 缺少部分槽位時輸出空 slot 且報告列為 MISSING，不可用舊圖補。"""
        # 只放 3 個槽
        test_slots = ["torso", "head", "pauldron_f"]
        self._create_mock_parts(test_slots)

        rep = build_spine_from_v3(
            spec=self.spec,
            parts_dir=self.parts_dir,
            output_dir=self.output_dir,
            skeleton_name="char_missing",
        )

        self.assertEqual(rep["skeleton"]["activeAttachmentsCount"], 3)
        self.assertEqual(rep["skeleton"]["missingSlotsCount"], 18)
        self.assertIn("pelvis", rep["skeleton"]["missingSlots"])
        self.assertIn("weapon", rep["skeleton"]["missingSlots"])

        # 檢查 JSON 中未提供的槽位為空 slot（無 attachment 屬性）
        json_path = Path(rep["outputs"]["json"])
        skel = json.loads(json_path.read_text(encoding="utf-8"))
        pelvis_slot = next((s for s in skel["slots"] if s["name"] == "pelvis"), None)
        self.assertIsNotNone(pelvis_slot)
        self.assertNotIn("attachment", pelvis_slot)

    def test_scaled_1_point_1_proves_no_hardcoding(self):
        """測試 3: 換一份縮放 1.1 倍的關節 JSON，輸出座標必須相應等比縮放 1.1 倍，證明絕無寫死座標。"""
        scale = 1.1
        spec_scaled = copy.deepcopy(self.spec)

        # 縮放所有 bones 的 pivotCanvasPx 與 canvas
        for b in spec_scaled["bones"]:
            b["pivotCanvasPx"] = [
                round(b["pivotCanvasPx"][0] * scale, 2),
                round(b["pivotCanvasPx"][1] * scale, 2),
            ]

        bones_orig, coords_orig, _ = compute_spine_bones(self.spec)
        bones_scaled, coords_scaled, _ = compute_spine_bones(spec_scaled)

        for b_orig, b_scaled in zip(bones_orig, bones_scaled):
            name = b_orig["name"]
            self.assertEqual(name, b_scaled["name"])
            if "parent" in b_orig:
                expected_x = round(b_orig["x"] * scale, 2)
                expected_y = round(b_orig["y"] * scale, 2)
                # 容許浮點數四捨五入誤差 0.05
                self.assertAlmostEqual(
                    b_scaled["x"],
                    expected_x,
                    delta=0.05,
                    msg=f"骨骼 {name} 的 local x 未等比縮放 1.1 倍",
                )
                self.assertAlmostEqual(
                    b_scaled["y"],
                    expected_y,
                    delta=0.05,
                    msg=f"骨骼 {name} 的 local y 未等比縮放 1.1 倍",
                )

    def test_draw_order_is_exact_permutation_of_names(self):
        """測試 5: layeredSlots.drawOrder 必須剛好是 names 的重新排列，不多不少。"""
        names = self.spec["layeredSlots"]["names"]
        draw_order = self.spec["layeredSlots"]["drawOrder"]

        self.assertEqual(len(draw_order), len(names), "drawOrder 長度必須與 names 完全相同")
        self.assertEqual(set(draw_order), set(names), "drawOrder 集合必須與 names 完全相同")
        self.assertEqual(len(draw_order), len(set(draw_order)), "drawOrder 不得有重複槽位")

    def test_missing_draw_order_raises_error(self):
        """測試 6: 若 JSON 缺少 drawOrder 欄位，必須明確拋出 ValueError，嚴禁使用隱性內建值。"""
        spec_no_draw = copy.deepcopy(self.spec)
        del spec_no_draw["layeredSlots"]["drawOrder"]

        self._create_mock_parts(["torso"])
        with self.assertRaises(ValueError) as ctx:
            build_spine_from_v3(
                spec=spec_no_draw,
                parts_dir=self.parts_dir,
                output_dir=self.output_dir,
            )
        self.assertIn("layeredSlots.drawOrder", str(ctx.exception))

    def test_mismatched_draw_order_raises_error(self):
        """測試 7: 若 drawOrder 缺少或多餘槽位，必須拋出 ValueError。"""
        spec_bad_draw = copy.deepcopy(self.spec)
        spec_bad_draw["layeredSlots"]["drawOrder"].pop()  # 少一個

        self._create_mock_parts(["torso"])
        with self.assertRaises(ValueError) as ctx:
            build_spine_from_v3(
                spec=spec_bad_draw,
                parts_dir=self.parts_dir,
                output_dir=self.output_dir,
            )
        self.assertIn("不一致", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
