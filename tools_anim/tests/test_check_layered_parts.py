#!/usr/bin/env python3
"""分槽進件檢查工具測試 (test_check_layered_parts.py)

依據工單 AG-21 與 SPEC-RIG-POSE-03 / v3.4 規格：
1. 合格分槽圖檔 -> PASS
2. arm_lower_f 隱藏延伸裁短 -> FAIL
3. 繞關節旋轉 30° 露縫 -> FAIL，產出 gap_leak_*.png
4. 關節整體平移後判定不變（無座標硬編碼）
5. 尺寸不合 (非 2048x2048) -> FAIL
6. 空心拳孔偏離 grip_A > 12px -> FAIL
"""
from __future__ import annotations

import json
import math
import shutil
import tempfile
import unittest
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import cv2
import numpy as np
from PIL import Image, ImageDraw

from tools_anim.check_layered_parts import (
    CANONICAL_21_SLOTS,
    DEFAULT_SPEC_PATH,
    load_spec,
    run_layered_parts_inspection,
)


class TestCheckLayeredParts(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_layered_parts_"))
        self.spec = load_spec(DEFAULT_SPEC_PATH)
        self.joints = self.spec["joints"]
        self.canvas_w = int(self.spec.get("canvas", {}).get("width", 2048))
        self.canvas_h = int(self.spec.get("canvas", {}).get("height", 2048))

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _create_slot_image(
        self,
        slot_name: str,
        drawer_fn,
        offset: tuple[float, float] = (0.0, 0.0),
    ) -> Path:
        im = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(im)
        drawer_fn(draw, offset)
        p = self.tmp_dir / f"{slot_name}.png"
        im.save(p)
        return p

    def _build_valid_arm_slots(
        self,
        parts_dir: Path,
        offset: tuple[float, float] = (0.0, 0.0),
        shorten_lower_ext: bool = False,
        leak_on_rotate: bool = False,
        misalign_fist_hole: bool = False,
    ) -> None:
        """建立 arm_upper_f, arm_lower_f, hand_f 槽位測試圖檔"""
        ox, oy = offset
        sh = (float(self.joints["shoulder_f"]["x"]) + ox, float(self.joints["shoulder_f"]["y"]) + oy)
        el = (float(self.joints["elbow_f"]["x"]) + ox, float(self.joints["elbow_f"]["y"]) + oy)
        wr = (float(self.joints["wrist_f"]["x"]) + ox, float(self.joints["wrist_f"]["y"]) + oy)
        grip_def = self.spec.get("weaponRules", {}).get("grip_point_A", [1365.0, 1225.0])
        grip = (float(grip_def[0]) + ox, float(grip_def[1]) + oy)

        # 1. arm_upper_f: 從 shoulder 畫到 elbow，並往 elbow 延伸 50px (>= 48px)
        im_upper = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_upper = ImageDraw.Draw(im_upper)
        # 上臂主幹粗度 50px
        d_upper.line([sh, el], fill=(120, 140, 200, 255), width=50)
        # 肘部圓形端蓋，半徑 35px
        d_upper.ellipse(
            [el[0] - 35, el[1] - 35, el[0] + 35, el[1] + 35],
            fill=(120, 140, 200, 255)
        )
        # 向下適度延伸 50px
        v_ue = (wr[0] - el[0], wr[1] - el[1])
        mag_ue = math.hypot(v_ue[0], v_ue[1]) or 1.0
        u_ue = (v_ue[0] / mag_ue, v_ue[1] / mag_ue)
        ext_el_upper = (el[0] + u_ue[0] * 50, el[1] + u_ue[1] * 50)
        d_upper.line([el, ext_el_upper], fill=(120, 140, 200, 255), width=45)
        d_upper.ellipse(
            [ext_el_upper[0] - 22, ext_el_upper[1] - 22, ext_el_upper[0] + 22, ext_el_upper[1] + 22],
            fill=(120, 140, 200, 255)
        )
        im_upper.save(parts_dir / "arm_upper_f.png")

        # 2. arm_lower_f: 從 elbow 畫到 wrist
        im_lower = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_lower = ImageDraw.Draw(im_lower)
        d_lower.line([el, wr], fill=(130, 150, 210, 255), width=50)

        # 肘部向上延伸 (往 shoulder 方向)
        v_le = (sh[0] - el[0], sh[1] - el[1])
        mag_le = math.hypot(v_le[0], v_le[1]) or 1.0
        u_le = (v_le[0] / mag_le, v_le[1] / mag_le)

        if shorten_lower_ext:
            # 刻意只延伸 15px (< 48px)
            ext_len = 15.0
            cap_r = 20.0
            ext_el_lower = (el[0] + u_le[0] * ext_len, el[1] + u_le[1] * ext_len)
            d_lower.line([el, ext_el_lower], fill=(130, 150, 210, 255), width=50)
            d_lower.ellipse(
                [ext_el_lower[0] - cap_r, ext_el_lower[1] - cap_r, ext_el_lower[0] + cap_r, ext_el_lower[1] + cap_r],
                fill=(130, 150, 210, 255)
            )
        elif leak_on_rotate:
            # 旋轉露縫情境：前臂端蓋未覆蓋手肘樞紐，留有 18px 間隙
            v_lw_tmp = (wr[0] - el[0], wr[1] - el[1])
            mag_lw_tmp = math.hypot(v_lw_tmp[0], v_lw_tmp[1]) or 1.0
            u_lw_tmp = (v_lw_tmp[0] / mag_lw_tmp, v_lw_tmp[1] / mag_lw_tmp)
            start_el = (el[0] + u_lw_tmp[0] * 18, el[1] + u_lw_tmp[1] * 18)
            d_lower.line([start_el, wr], fill=(130, 150, 210, 255), width=50)
        else:
            # 正常飽滿延伸 60px (>= 48px)，並有半徑 40px 關節蓋
            ext_len = 60.0
            cap_r = 40.0
            ext_el_lower = (el[0] + u_le[0] * ext_len, el[1] + u_le[1] * ext_len)
            d_lower.line([el, ext_el_lower], fill=(130, 150, 210, 255), width=50)
            d_lower.ellipse(
                [ext_el_lower[0] - cap_r, ext_el_lower[1] - cap_r, ext_el_lower[0] + cap_r, ext_el_lower[1] + cap_r],
                fill=(130, 150, 210, 255)
            )
            d_lower.ellipse(
                [el[0] - cap_r, el[1] - cap_r, el[0] + cap_r, el[1] + cap_r],
                fill=(130, 150, 210, 255)
            )

        # 腕部延伸 (往 hand 方向) 至少 55px (>= 48px)
        v_lw = (wr[0] - el[0], wr[1] - el[1])
        mag_lw = math.hypot(v_lw[0], v_lw[1]) or 1.0
        u_lw = (v_lw[0] / mag_lw, v_lw[1] / mag_lw)
        ext_wr_lower = (wr[0] + u_lw[0] * 55, wr[1] + u_lw[1] * 55)
        d_lower.line([wr, ext_wr_lower], fill=(130, 150, 210, 255), width=50)
        d_lower.ellipse(
            [wr[0] - 40, wr[1] - 40, wr[0] + 40, wr[1] + 40],
            fill=(130, 150, 210, 255)
        )
        d_lower.ellipse(
            [ext_wr_lower[0] - 30, ext_wr_lower[1] - 30, ext_wr_lower[0] + 30, ext_wr_lower[1] + 30],
            fill=(130, 150, 210, 255)
        )
        im_lower.save(parts_dir / "arm_lower_f.png")

        # 3. hand_f: 覆蓋腕部與握點，並向腕部延伸至少 55px
        im_hand = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_hand = ImageDraw.Draw(im_hand)
        # 腕部端蓋 (越過 wrist 往 elbow 延伸)
        v_hw = (el[0] - wr[0], el[1] - wr[1])
        mag_hw = math.hypot(v_hw[0], v_hw[1]) or 1.0
        u_hw = (v_hw[0] / mag_hw, v_hw[1] / mag_hw)
        ext_wr_hand = (wr[0] + u_hw[0] * 55, wr[1] + u_hw[1] * 55)
        d_hand.line([wr, ext_wr_hand], fill=(180, 130, 100, 255), width=45)
        d_hand.ellipse(
            [wr[0] - 38, wr[1] - 38, wr[0] + 38, wr[1] + 38],
            fill=(180, 130, 100, 255)
        )
        d_hand.ellipse(
            [ext_wr_hand[0] - 25, ext_wr_hand[1] - 25, ext_wr_hand[0] + 25, ext_wr_hand[1] + 25],
            fill=(180, 130, 100, 255)
        )

        # 拳頭主體 (以 grip 為中心)
        d_hand.line([wr, grip], fill=(180, 130, 100, 255), width=50)
        d_hand.ellipse(
            [grip[0] - 45, grip[1] - 45, grip[0] + 45, grip[1] + 45],
            fill=(180, 130, 100, 255)
        )
        # 空心拳孔
        hole_c = (grip[0] + (25.0 if misalign_fist_hole else 0.0), grip[1])
        d_hand.ellipse(
            [hole_c[0] - 12, hole_c[1] - 12, hole_c[0] + 12, hole_c[1] + 12],
            fill=(0, 0, 0, 0)
        )
        im_hand.save(parts_dir / "hand_f.png")

    def test_pass_on_valid_layered_slots(self) -> None:
        """測試 1: 規格完全合格的分槽圖檔應獲得 PASS"""
        parts_dir = self.tmp_dir / "valid_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._build_valid_arm_slots(parts_dir)

        out_dir = self.tmp_dir / "out_valid"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["arm_upper_f", "arm_lower_f", "hand_f"],
            out_dir=out_dir,
        )

        self.assertTrue(passed, f"正常分槽應 PASS，但判定失敗: {report}")
        self.assertEqual(report["overallTier"], "PASS")
        self.assertTrue(report["slotReports"]["arm_upper_f"]["pass"])
        self.assertTrue(report["slotReports"]["arm_lower_f"]["pass"])
        self.assertTrue(report["slotReports"]["hand_f"]["pass"])
        # 確認握點檢查通過
        fist_check = report["slotReports"]["hand_f"]["checks"]["grip_point_accuracy"]
        self.assertTrue(fist_check["pass"])
        self.assertLessEqual(fist_check["distancePx"], 12.0)

    def test_fail_on_hidden_extension_too_short(self) -> None:
        """測試 2: 把 arm_lower_f 隱藏延伸裁短 (< 48px) 應判 FAIL"""
        parts_dir = self.tmp_dir / "short_ext_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._build_valid_arm_slots(parts_dir, shorten_lower_ext=True)

        out_dir = self.tmp_dir / "out_short_ext"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["arm_upper_f", "arm_lower_f"],
            out_dir=out_dir,
        )

        self.assertFalse(passed, "延伸過短應判定 FAIL")
        self.assertEqual(report["overallTier"], "FAIL")
        # 檢查 arm_lower_f 是否在肘部標記為失敗
        ext_entry = report["jointHiddenExtensions"]["arm_upper_f_to_arm_lower_f_at_elbow_f"]
        self.assertFalse(ext_entry["pass"])
        self.assertLess(ext_entry["childExtensionPx"], ext_entry["minRequiredPx"])

    def test_fail_on_rotation_gap_leak(self) -> None:
        """測試 3: 繞關節旋轉 30° 產生露縫應判 FAIL，並輸出 gap_leak_*.png"""
        parts_dir = self.tmp_dir / "leak_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._build_valid_arm_slots(parts_dir, leak_on_rotate=True)

        out_dir = self.tmp_dir / "out_leak"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["arm_upper_f", "arm_lower_f"],
            out_dir=out_dir,
        )

        self.assertFalse(passed, "旋轉露縫應判定 FAIL")
        self.assertEqual(report["overallTier"], "FAIL")
        leak_entry = report["rotationLeakChecks"]["arm_lower_f_rot_leak_at_elbow_f"]
        self.assertFalse(leak_entry["pass"])
        self.assertIn("leakImagePath", leak_entry)
        leak_img_path = Path(leak_entry["leakImagePath"])
        self.assertTrue(leak_img_path.exists(), "露縫可視化 PNG 必須存在")

    def test_joint_shift_invariance(self) -> None:
        """測試 4: 關節整體平移後判定不變（證明無像素座標硬編碼）"""
        # 建立整體平移 +60px, +40px 的自訂 spec
        import copy
        shifted_spec = copy.deepcopy(self.spec)
        ox, oy = 60.0, 40.0
        for j_name, j_data in shifted_spec["joints"].items():
            j_data["x"] = float(j_data["x"]) + ox
            j_data["y"] = float(j_data["y"]) + oy

        if "grips" in shifted_spec:
            for g_name, g_data in shifted_spec["grips"].items():
                g_data["x"] = float(g_data["x"]) + ox
                g_data["y"] = float(g_data["y"]) + oy

        spec_file = self.tmp_dir / "shifted_spec.json"
        spec_file.write_text(json.dumps(shifted_spec, indent=2, ensure_ascii=False), encoding="utf-8")

        parts_dir = self.tmp_dir / "shifted_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        # 產生同步平移的合格部件
        self._build_valid_arm_slots(parts_dir, offset=(ox, oy))

        out_dir = self.tmp_dir / "out_shifted"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=spec_file,
            filter_slots=["arm_upper_f", "arm_lower_f", "hand_f"],
            out_dir=out_dir,
        )

        self.assertTrue(passed, f"平移後的合格槽位應維持 PASS: {report}")
        self.assertEqual(report["overallTier"], "PASS")

    def test_dimension_mismatch_fail(self) -> None:
        """測試 5: 圖檔尺寸不是 2048x2048 應判 FAIL"""
        parts_dir = self.tmp_dir / "wrong_dim_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        # 建立一張 1024x1024 的 arm_upper_f
        im = Image.new("RGBA", (1024, 1024), (100, 100, 100, 255))
        im.save(parts_dir / "arm_upper_f.png")

        out_dir = self.tmp_dir / "out_wrong_dim"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["arm_upper_f"],
            out_dir=out_dir,
        )

        self.assertFalse(passed, "尺寸不合應判定 FAIL")
        self.assertFalse(report["slotReports"]["arm_upper_f"]["pass"])
        self.assertIn("尺寸", report["slotReports"]["arm_upper_f"]["detail"])

    def test_fist_hole_misalignment_fail(self) -> None:
        """測試 6: 空心拳孔偏離 grip_A > 12px 應判 FAIL"""
        parts_dir = self.tmp_dir / "misaligned_fist_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._build_valid_arm_slots(parts_dir, misalign_fist_hole=True)

        out_dir = self.tmp_dir / "out_fist_fail"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["hand_f"],
            out_dir=out_dir,
        )

        self.assertFalse(passed, "握孔偏離過大應判定 FAIL")
        fist_check = report["slotReports"]["hand_f"]["checks"]["grip_point_accuracy"]
        self.assertFalse(fist_check["pass"])
        self.assertGreater(fist_check["distancePx"], 12.0)


if __name__ == "__main__":
    unittest.main()
