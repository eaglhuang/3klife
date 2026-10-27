#!/usr/bin/env python3
"""分槽進件檢查工具測試 (test_check_layered_parts.py)

依據工單 AG-21 / AG-22 與 SPEC-RIG-POSE-03 / v3.4 規格：
1. 合格分槽圖檔 -> PASS
2. arm_lower_f 隱藏延伸裁短 -> FAIL
3. 繞關節旋轉 30° 露縫 -> FAIL，產出 gap_leak_*.png
4. 關節整體平移後判定不變（無座標硬編碼）
5. 尺寸不合 (非 2048x2048) -> FAIL
6. 空心拳孔偏離 grip_A > 12px -> FAIL
7. AG-22: 缺槽時涉及關節標示 SKIPPED，不判 FAIL
8. AG-22: 新增骨頭 (weapon_tassel) 自動納入檢查，免改程式碼
9. AG-22: 重組比對以輪廓位置誤差 (Chamfer p95 <= 2.0px) 判定
"""
from __future__ import annotations

import copy
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
    DEFAULT_SPEC_PATH,
    compute_contour_chamfer_p95,
    derive_joint_connections,
    load_spec,
    run_layered_parts_inspection,
)


class TestCheckLayeredParts(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_layered_parts_"))
        self.spec = load_spec(DEFAULT_SPEC_PATH)
        self.canvas_w = int(self.spec.get("canvas", {}).get("w", 2048))
        self.canvas_h = int(self.spec.get("canvas", {}).get("h", 2048))
        self.bones_map = {b["name"]: b for b in self.spec.get("bones", []) if isinstance(b, dict)}

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _build_valid_arm_slots(
        self,
        parts_dir: Path,
        offset: tuple[float, float] = (0.0, 0.0),
        shorten_lower_ext: bool = False,
        leak_on_rotate: bool = False,
        misalign_fist_hole: bool = False,
        custom_spec: dict | None = None,
    ) -> None:
        """建立 arm_upper_f, arm_lower_f, hand_f 槽位測試圖檔"""
        spec = custom_spec or self.spec
        bones = {b["name"]: b for b in spec.get("bones", []) if isinstance(b, dict)}
        ox, oy = offset

        # 動態取自關節與骨骼座標
        sh = (float(self.spec["joints"]["shoulder_f"]["x"]) + ox, float(self.spec["joints"]["shoulder_f"]["y"]) + oy)
        el = (float(self.spec["joints"]["elbow_f"]["x"]) + ox, float(self.spec["joints"]["elbow_f"]["y"]) + oy)
        wr = (float(self.spec["joints"]["wrist_f"]["x"]) + ox, float(self.spec["joints"]["wrist_f"]["y"]) + oy)

        grips_cfg = spec.get("grips", {})
        grip_def = [1365.0, 1225.0]
        if "grip_A" in grips_cfg:
            grip_def = [float(grips_cfg["grip_A"].get("x", 1365.0)), float(grips_cfg["grip_A"].get("y", 1225.0))]
        grip = (grip_def[0] + ox, grip_def[1] + oy)

        # 1. arm_upper_f: shoulder 到 elbow，越過 elbow 延伸 48px (>= 48px)
        im_upper = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_upper = ImageDraw.Draw(im_upper)
        d_upper.line([sh, el], fill=(120, 140, 200, 255), width=50)
        d_upper.ellipse([sh[0] - 35, sh[1] - 35, sh[0] + 35, sh[1] + 35], fill=(120, 140, 200, 255))
        d_upper.ellipse([el[0] - 35, el[1] - 35, el[0] + 35, el[1] + 35], fill=(120, 140, 200, 255))

        v_ue = (el[0] - sh[0], el[1] - sh[1])
        mag_ue = math.hypot(v_ue[0], v_ue[1]) or 1.0
        u_ue = (v_ue[0] / mag_ue, v_ue[1] / mag_ue)
        ext_el_upper = (el[0] + u_ue[0] * 48, el[1] + u_ue[1] * 48)
        d_upper.line([el, ext_el_upper], fill=(120, 140, 200, 255), width=45)
        d_upper.ellipse([ext_el_upper[0] - 15, ext_el_upper[1] - 15, ext_el_upper[0] + 15, ext_el_upper[1] + 15], fill=(120, 140, 200, 255))
        im_upper.save(parts_dir / "arm_upper_f.png")

        # 2. arm_lower_f: elbow 到 wrist 與 hand 骨點 (grip)
        im_lower = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_lower = ImageDraw.Draw(im_lower)
        d_lower.line([el, wr], fill=(130, 150, 210, 255), width=48)
        d_lower.line([wr, grip], fill=(130, 150, 210, 255), width=48)

        # 肘部向上延伸 (朝 shoulder 方向)
        v_le = (sh[0] - el[0], sh[1] - el[1])
        mag_le = math.hypot(v_le[0], v_le[1]) or 1.0
        u_le = (v_le[0] / mag_le, v_le[1] / mag_le)

        if shorten_lower_ext:
            # 刻意只延伸 15px (< 48px)
            ext_len = 15.0
            cap_r = 15.0
            ext_el_lower = (el[0] + u_le[0] * ext_len, el[1] + u_le[1] * ext_len)
            d_lower.line([el, ext_el_lower], fill=(130, 150, 210, 255), width=48)
            d_lower.ellipse([ext_el_lower[0] - cap_r, ext_el_lower[1] - cap_r, ext_el_lower[0] + cap_r, ext_el_lower[1] + cap_r], fill=(130, 150, 210, 255))
        elif leak_on_rotate:
            # 旋轉露縫情境：前臂端蓋未覆蓋手肘樞紐，樞紐處存在 25px 脫節孔洞
            pass
        else:
            # 正常延伸 48px (>= 48px)
            ext_len = 48.0
            ext_el_lower = (el[0] + u_le[0] * ext_len, el[1] + u_le[1] * ext_len)
            d_lower.line([el, ext_el_lower], fill=(130, 150, 210, 255), width=48)
            d_lower.ellipse([ext_el_lower[0] - 15, ext_el_lower[1] - 15, ext_el_lower[0] + 15, ext_el_lower[1] + 15], fill=(130, 150, 210, 255))
            d_lower.ellipse([el[0] - 35, el[1] - 35, el[0] + 35, el[1] + 35], fill=(130, 150, 210, 255))

        # 腕部/手部向下延伸 (朝 hand 方向越過骨點延伸 48px)
        v_lw = (grip[0] - el[0], grip[1] - el[1])
        mag_lw = math.hypot(v_lw[0], v_lw[1]) or 1.0
        u_lw = (v_lw[0] / mag_lw, v_lw[1] / mag_lw)
        ext_wr_lower = (grip[0] + u_lw[0] * 48, grip[1] + u_lw[1] * 48)
        d_lower.line([wr, grip], fill=(130, 150, 210, 255), width=48)
        d_lower.line([grip, ext_wr_lower], fill=(130, 150, 210, 255), width=48)
        d_lower.ellipse([wr[0] - 35, wr[1] - 35, wr[0] + 35, wr[1] + 35], fill=(130, 150, 210, 255))
        d_lower.ellipse([grip[0] - 35, grip[1] - 35, grip[0] + 35, grip[1] + 35], fill=(130, 150, 210, 255))
        d_lower.ellipse([ext_wr_lower[0] - 15, ext_wr_lower[1] - 15, ext_wr_lower[0] + 15, ext_wr_lower[1] + 15], fill=(130, 150, 210, 255))

        if leak_on_rotate:
            # 將手肘樞紐處挖成透明，旋轉時必然露縫穿透
            d_lower.ellipse([el[0] - 25, el[1] - 25, el[0] + 25, el[1] + 25], fill=(0, 0, 0, 0))

        im_lower.save(parts_dir / "arm_lower_f.png")

        # 3. hand_f: 覆蓋腕部與握點，並向腕部反向延伸 48px
        im_hand = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_hand = ImageDraw.Draw(im_hand)
        # 連接腕部並越過腕部延伸 48px
        v_hw = (el[0] - wr[0], el[1] - wr[1])
        mag_hw = math.hypot(v_hw[0], v_hw[1]) or 1.0
        u_hw = (v_hw[0] / mag_hw, v_hw[1] / mag_hw)
        ext_wr_hand = (wr[0] + u_hw[0] * 48, wr[1] + u_hw[1] * 48)
        d_hand.line([grip, wr], fill=(180, 130, 100, 255), width=40)
        d_hand.line([wr, ext_wr_hand], fill=(180, 130, 100, 255), width=35)
        d_hand.ellipse([wr[0] - 25, wr[1] - 25, wr[0] + 25, wr[1] + 25], fill=(180, 130, 100, 255))
        d_hand.ellipse([ext_wr_hand[0] - 15, ext_wr_hand[1] - 15, ext_wr_hand[0] + 15, ext_wr_hand[1] + 15], fill=(180, 130, 100, 255))

        # 拳頭主體 (以 grip 為中心)
        d_hand.ellipse([grip[0] - 45, grip[1] - 45, grip[0] + 45, grip[1] + 45], fill=(180, 130, 100, 255))
        # 空心拳孔
        hole_c = (grip[0] + (25.0 if misalign_fist_hole else 0.0), grip[1])
        d_hand.ellipse([hole_c[0] - 12, hole_c[1] - 12, hole_c[0] + 12, hole_c[1] + 12], fill=(0, 0, 0, 0))
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
        ext_entry = report["jointHiddenExtensions"]["arm_upper_f_to_arm_lower_f"]
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
        leak_entry = report["rotationLeakChecks"]["arm_upper_f_to_arm_lower_f"]
        self.assertFalse(leak_entry["pass"])
        self.assertIn("leakImagePath", leak_entry)
        leak_img_path = Path(leak_entry["leakImagePath"])
        self.assertTrue(leak_img_path.exists(), "露縫可視化 PNG 必須存在")

    def test_joint_shift_invariance(self) -> None:
        """測試 4: 關節整體平移後判定不變（證明無像素座標硬編碼）"""
        shifted_spec = copy.deepcopy(self.spec)
        ox, oy = 60.0, 40.0
        for b in shifted_spec.get("bones", []):
            if isinstance(b, dict) and "pivotCanvasPx" in b:
                p = b["pivotCanvasPx"]
                b["pivotCanvasPx"] = [p[0] + ox, p[1] + oy]

        for j_name, j_data in shifted_spec.get("joints", {}).items():
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

    def test_skipped_on_missing_slot(self) -> None:
        """測試 7 (AG-22): 少一槽時，涉及該槽的關節標記 SKIPPED，不判 FAIL"""
        parts_dir = self.tmp_dir / "missing_hand_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        # 只建立 arm_upper_f 與 arm_lower_f，故意不放 hand_f
        self._build_valid_arm_slots(parts_dir)
        (parts_dir / "hand_f.png").unlink(missing_ok=True)

        out_dir = self.tmp_dir / "out_missing_slot"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["arm_upper_f", "arm_lower_f", "hand_f"],
            out_dir=out_dir,
        )

        # 涉及 hand_f 的關節應標記為 SKIPPED，且 overallPass 維持 True
        self.assertTrue(passed, f"缺槽不應判 FAIL: {report}")
        self.assertEqual(report["overallTier"], "PASS")

        ext_check = report["jointHiddenExtensions"]["arm_lower_f_to_hand_f"]
        self.assertTrue(ext_check["skipped"])
        self.assertEqual(ext_check["tier"], "SKIPPED")

        rot_check = report["rotationLeakChecks"]["arm_lower_f_to_hand_f"]
        self.assertTrue(rot_check["skipped"])
        self.assertEqual(rot_check["tier"], "SKIPPED")

    def test_auto_include_new_bone(self) -> None:
        """測試 8 (AG-22): 新增一根骨頭 (例如 weapon_tassel) 時，工具自動把它納入檢查，免改程式碼"""
        new_spec = copy.deepcopy(self.spec)
        new_bone = {
            "name": "weapon_tassel",
            "parent": "weapon",
            "pivotCanvasPx": [1365, 1400],
        }
        new_spec.setdefault("bones", []).append(new_bone)
        new_spec.setdefault("layeredSlots", {}).setdefault("names", []).append("weapon_tassel")

        spec_file = self.tmp_dir / "new_bone_spec.json"
        spec_file.write_text(json.dumps(new_spec, indent=2, ensure_ascii=False), encoding="utf-8")

        # 驗證 derive_joint_connections 自動推導出 weapon_to_weapon_tassel
        conns = derive_joint_connections(new_spec)
        conn_ids = [c["id"] for c in conns]
        self.assertIn("weapon_to_weapon_tassel", conn_ids)

        # 建立 weapon 與 weapon_tassel 圖檔
        parts_dir = self.tmp_dir / "new_bone_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        im_w = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_w = ImageDraw.Draw(im_w)
        d_w.line([(1365, 1200), (1365, 1400)], fill=(200, 180, 50, 255), width=20)
        d_w.ellipse([1365 - 35, 1400 - 35, 1365 + 35, 1400 + 35], fill=(200, 180, 50, 255))
        # 延伸 55px
        d_w.line([(1365, 1400), (1365, 1455)], fill=(200, 180, 50, 255), width=20)
        im_w.save(parts_dir / "weapon.png")

        im_t = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_t = ImageDraw.Draw(im_t)
        d_t.line([(1365, 1400), (1365, 1550)], fill=(220, 50, 50, 255), width=25)
        d_t.ellipse([1365 - 35, 1400 - 35, 1365 + 35, 1400 + 35], fill=(220, 50, 50, 255))
        # 延伸 55px
        d_t.line([(1365, 1400), (1365, 1345)], fill=(220, 50, 50, 255), width=25)
        im_t.save(parts_dir / "weapon_tassel.png")

        out_dir = self.tmp_dir / "out_new_bone"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=spec_file,
            filter_slots=["weapon", "weapon_tassel"],
            out_dir=out_dir,
        )

        self.assertTrue(passed, f"新增骨骼自動檢查應 PASS: {report}")
        self.assertIn("weapon_to_weapon_tassel", report["jointHiddenExtensions"])
        self.assertTrue(report["jointHiddenExtensions"]["weapon_to_weapon_tassel"]["pass"])

    def test_composite_reassembly_chamfer_p95(self) -> None:
        """測試 9 (AG-22): 疊合與參考合成圖以輪廓位移 (Chamfer p95 <= 2.0px) 判定"""
        parts_dir = self.tmp_dir / "reassembly_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._build_valid_arm_slots(parts_dir)

        # 建立與部件完美疊合的參考圖
        im_ref = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        for sid in ["arm_upper_f", "arm_lower_f", "hand_f"]:
            p_im = Image.open(parts_dir / f"{sid}.png").convert("RGBA")
            im_ref.paste(p_im, (0, 0), p_im)
        ref_path = self.tmp_dir / "ref_perfect.png"
        im_ref.save(ref_path)

        out_dir = self.tmp_dir / "out_reassembly_pass"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            composite_ref_path=ref_path,
            filter_slots=["arm_upper_f", "arm_lower_f", "hand_f"],
            out_dir=out_dir,
        )

        self.assertTrue(passed)
        reassembly = report["reassemblyReport"]
        self.assertTrue(reassembly["pass"])
        self.assertLessEqual(reassembly["contourOffsetP95Px"], 2.0)

        # 測試輪廓位移過大 (> 2px) 應判 FAIL
        shifted_ref = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        # 偏移 10px
        shifted_ref.paste(im_ref, (10, 10), im_ref)
        bad_ref_path = self.tmp_dir / "ref_bad_shift.png"
        shifted_ref.save(bad_ref_path)

        report_bad, passed_bad = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            composite_ref_path=bad_ref_path,
            filter_slots=["arm_upper_f", "arm_lower_f", "hand_f"],
            out_dir=self.tmp_dir / "out_reassembly_fail",
        )

        self.assertFalse(passed_bad, "輪廓位移過大應判定 FAIL")
        self.assertFalse(report_bad["reassemblyReport"]["pass"])
        self.assertGreater(report_bad["reassemblyReport"]["contourOffsetP95Px"], 2.0)

    def test_torso_with_pauldrons_fail_and_outside_image(self) -> None:
        """測試 10 (AG-23): torso 加上兩片肩甲應判定 FAIL，且 outside 圖標出超出位置"""
        parts_dir = self.tmp_dir / "torso_with_pauldrons_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        im = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        p_pelvis = (float(self.spec["joints"]["pelvis"]["x"]), float(self.spec["joints"]["pelvis"]["y"]))
        p_neck = (float(self.spec["joints"]["neck"]["x"]), float(self.spec["joints"]["neck"]["y"]))
        # 繪製正常軀幹
        d.line([p_pelvis, p_neck], fill=(120, 100, 80, 255), width=200)
        # 繪製超出軀幹膠囊的左右兩側肩甲
        d.ellipse([1200, 860, 1360, 980], fill=(200, 180, 50, 255))
        d.ellipse([700, 860, 860, 980], fill=(200, 180, 50, 255))
        im.save(parts_dir / "torso.png")

        out_dir = self.tmp_dir / "out_torso_fail"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["torso"],
            out_dir=out_dir,
        )

        self.assertFalse(passed, "併入肩甲的 torso 應判定 FAIL")
        torso_rep = report["slotReports"]["torso"]
        self.assertFalse(torso_rep["pass"])
        bounds_check = torso_rep["checks"]["scope_capsule_bounds"]
        self.assertFalse(bounds_check["pass"])
        self.assertGreater(bounds_check["outsideRatio"], 0.01)
        self.assertIn("outsideImagePath", bounds_check)
        self.assertTrue(Path(bounds_check["outsideImagePath"]).exists())

    def test_pure_torso_pass(self) -> None:
        """測試 11 (AG-23): 純 torso 應獲得 PASS"""
        parts_dir = self.tmp_dir / "pure_torso_parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        im = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        p_pelvis = (float(self.spec["joints"]["pelvis"]["x"]), float(self.spec["joints"]["pelvis"]["y"]))
        p_neck = (float(self.spec["joints"]["neck"]["x"]), float(self.spec["joints"]["neck"]["y"]))
        d.line([p_pelvis, p_neck], fill=(120, 100, 80, 255), width=200)
        im.save(parts_dir / "torso.png")

        out_dir = self.tmp_dir / "out_pure_torso"
        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["torso"],
            out_dir=out_dir,
        )

        self.assertTrue(passed, f"純 torso 應獲得 PASS: {report}")
        torso_rep = report["slotReports"]["torso"]
        self.assertTrue(torso_rep["pass"])
        bounds_check = torso_rep["checks"]["scope_capsule_bounds"]
        self.assertTrue(bounds_check["pass"])
        self.assertLessEqual(bounds_check["outsideRatio"], 0.01)

    def test_torso_shift_invariance(self) -> None:
        """測試 12 (AG-23): 關節整體平移後判定不變（無座標硬編碼）"""
        shifted_spec = copy.deepcopy(self.spec)
        ox, oy = 60.0, 40.0
        for j_name, j_data in shifted_spec.get("joints", {}).items():
            j_data["x"] = float(j_data["x"]) + ox
            j_data["y"] = float(j_data["y"]) + oy

        for b in shifted_spec.get("bones", []):
            if "pivotCanvasPx" in b:
                b["pivotCanvasPx"] = [b["pivotCanvasPx"][0] + ox, b["pivotCanvasPx"][1] + oy]

        spec_file = self.tmp_dir / "shifted_torso_spec.json"
        spec_file.write_text(json.dumps(shifted_spec, indent=2, ensure_ascii=False), encoding="utf-8")

        # 1. 產生同步平移的純 torso
        parts_dir_pure = self.tmp_dir / "shifted_pure_torso"
        parts_dir_pure.mkdir(parents=True, exist_ok=True)
        im_pure = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_pure = ImageDraw.Draw(im_pure)
        p_pelvis = (float(shifted_spec["joints"]["pelvis"]["x"]), float(shifted_spec["joints"]["pelvis"]["y"]))
        p_neck = (float(shifted_spec["joints"]["neck"]["x"]), float(shifted_spec["joints"]["neck"]["y"]))
        d_pure.line([p_pelvis, p_neck], fill=(120, 100, 80, 255), width=200)
        im_pure.save(parts_dir_pure / "torso.png")

        report_pure, passed_pure = run_layered_parts_inspection(
            parts_dir=parts_dir_pure,
            spec_path=spec_file,
            filter_slots=["torso"],
        )
        self.assertTrue(passed_pure, "平移後的純 torso 應維持 PASS")

        # 2. 產生同步平移的帶肩甲 torso
        parts_dir_paul = self.tmp_dir / "shifted_paul_torso"
        parts_dir_paul.mkdir(parents=True, exist_ok=True)
        im_paul = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_paul = ImageDraw.Draw(im_paul)
        d_paul.line([p_pelvis, p_neck], fill=(120, 100, 80, 255), width=200)
        d_paul.ellipse([1200 + ox, 860 + oy, 1360 + ox, 980 + oy], fill=(200, 180, 50, 255))
        d_paul.ellipse([700 + ox, 860 + oy, 860 + ox, 980 + oy], fill=(200, 180, 50, 255))
        im_paul.save(parts_dir_paul / "torso.png")

        report_paul, passed_paul = run_layered_parts_inspection(
            parts_dir=parts_dir_paul,
            spec_path=spec_file,
            filter_slots=["torso"],
        )
        self.assertFalse(passed_paul, "平移後的帶肩甲 torso 應維持 FAIL")


    def test_shoulder_parent_side_extension_waived_when_pauldron_present(self) -> None:
        """測試 13 (AG-25): 肩關節處同側 pauldron 覆蓋時，torso 父側延伸不足改標 WAIVED，整體判定 PASS"""
        parts_dir = self.tmp_dir / "pauldron_waived"
        parts_dir.mkdir(parents=True, exist_ok=True)

        j_shoulder_f = (float(self.spec["joints"]["shoulder_f"]["x"]), float(self.spec["joints"]["shoulder_f"]["y"]))
        j_elbow_f = (float(self.spec["joints"]["elbow_f"]["x"]), float(self.spec["joints"]["elbow_f"]["y"]))
        j_pelvis = (float(self.spec["joints"]["pelvis"]["x"]), float(self.spec["joints"]["pelvis"]["y"]))
        j_neck = (float(self.spec["joints"]["neck"]["x"]), float(self.spec["joints"]["neck"]["y"]))

        # 1. 建立 torso：身軀主體，但在 shoulder_f 延伸僅 35px (< 48px)
        im_torso = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_torso = ImageDraw.Draw(im_torso)
        d_torso.line([j_pelvis, j_neck], fill=(120, 100, 80, 255), width=200)
        # 往 shoulder_f 輕微延伸 35px (方向由 waist/pelvis 到 shoulder_f)
        v_dir = (j_shoulder_f[0] - j_neck[0], j_shoulder_f[1] - j_neck[1])
        norm_v = math.hypot(v_dir[0], v_dir[1]) or 1.0
        ext_pt = (j_shoulder_f[0] + (v_dir[0] / norm_v) * 35.0, j_shoulder_f[1] + (v_dir[1] / norm_v) * 35.0)
        d_torso.line([j_neck, ext_pt], fill=(120, 100, 80, 255), width=80)
        im_torso.save(parts_dir / "torso.png")

        # 2. 建立 arm_upper_f：子側延伸充分 (>= 48px)
        im_arm = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_arm = ImageDraw.Draw(im_arm)
        # 往 shoulder 延伸 55px
        v_arm = (j_shoulder_f[0] - j_elbow_f[0], j_shoulder_f[1] - j_elbow_f[1])
        norm_arm = math.hypot(v_arm[0], v_arm[1]) or 1.0
        ext_arm_pt = (j_shoulder_f[0] + (v_arm[0] / norm_arm) * 55.0, j_shoulder_f[1] + (v_arm[1] / norm_arm) * 55.0)
        d_arm.line([j_elbow_f, ext_arm_pt], fill=(80, 120, 200, 255), width=60)
        im_arm.save(parts_dir / "arm_upper_f.png")

        # 3. 建立 pauldron_f：覆蓋 shoulder_f 關節 (距離 <= 20px)
        im_paul = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_paul = ImageDraw.Draw(im_paul)
        d_paul.ellipse(
            [j_shoulder_f[0] - 40, j_shoulder_f[1] - 40, j_shoulder_f[0] + 40, j_shoulder_f[1] + 40],
            fill=(220, 190, 50, 255),
        )
        im_paul.save(parts_dir / "pauldron_f.png")

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["torso", "arm_upper_f", "pauldron_f"],
        )

        joint_rep = report["jointHiddenExtensions"]["torso_to_arm_upper_f"]
        self.assertTrue(joint_rep.get("parentWaived"), "同側 pauldron 存在時父側應標記為 parentWaived")
        self.assertTrue(joint_rep["pass"], "關節延伸檢查整體應 PASS")
        self.assertEqual(report["slotReports"]["torso"]["checks"]["hidden_extension_at_torso_to_arm_upper_f"]["tier"], "WAIVED")
        self.assertTrue(passed, "有 pauldron 豁免時整體應判定 PASS")

    def test_shoulder_parent_side_extension_fails_when_pauldron_absent(self) -> None:
        """測試 14 (AG-25): 肩關節處若無同側 pauldron，torso 父側延伸不足維持判定 FAIL"""
        parts_dir = self.tmp_dir / "pauldron_absent"
        parts_dir.mkdir(parents=True, exist_ok=True)

        j_shoulder_f = (float(self.spec["joints"]["shoulder_f"]["x"]), float(self.spec["joints"]["shoulder_f"]["y"]))
        j_elbow_f = (float(self.spec["joints"]["elbow_f"]["x"]), float(self.spec["joints"]["elbow_f"]["y"]))
        j_pelvis = (float(self.spec["joints"]["pelvis"]["x"]), float(self.spec["joints"]["pelvis"]["y"]))
        j_neck = (float(self.spec["joints"]["neck"]["x"]), float(self.spec["joints"]["neck"]["y"]))

        # 1. 建立 torso：身軀主體，但在 shoulder_f 延伸僅 35px (< 48px)
        im_torso = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_torso = ImageDraw.Draw(im_torso)
        d_torso.line([j_pelvis, j_neck], fill=(120, 100, 80, 255), width=200)
        v_dir = (j_shoulder_f[0] - j_neck[0], j_shoulder_f[1] - j_neck[1])
        norm_v = math.hypot(v_dir[0], v_dir[1]) or 1.0
        ext_pt = (j_shoulder_f[0] + (v_dir[0] / norm_v) * 35.0, j_shoulder_f[1] + (v_dir[1] / norm_v) * 35.0)
        d_torso.line([j_neck, ext_pt], fill=(120, 100, 80, 255), width=80)
        im_torso.save(parts_dir / "torso.png")

        # 2. 建立 arm_upper_f：子側延伸充分 (>= 48px)
        im_arm = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_arm = ImageDraw.Draw(im_arm)
        v_arm = (j_shoulder_f[0] - j_elbow_f[0], j_shoulder_f[1] - j_elbow_f[1])
        norm_arm = math.hypot(v_arm[0], v_arm[1]) or 1.0
        ext_arm_pt = (j_shoulder_f[0] + (v_arm[0] / norm_arm) * 55.0, j_shoulder_f[1] + (v_arm[1] / norm_arm) * 55.0)
        d_arm.line([j_elbow_f, ext_arm_pt], fill=(80, 120, 200, 255), width=60)
        im_arm.save(parts_dir / "arm_upper_f.png")

        # 不提供 pauldron_f.png

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["torso", "arm_upper_f"],
        )

        joint_rep = report["jointHiddenExtensions"]["torso_to_arm_upper_f"]
        self.assertFalse(joint_rep.get("parentWaived", False), "無 pauldron 時不得標記為 parentWaived")
        self.assertFalse(joint_rep["pass"], "無 pauldron 時延伸不足應判定 FAIL")
        self.assertEqual(report["slotReports"]["torso"]["checks"]["hidden_extension_at_torso_to_arm_upper_f"]["tier"], "FAIL")
        self.assertFalse(passed, "無 pauldron 豁免時整體應判定 FAIL")

    def test_missing_names_raises_error(self) -> None:
        """測試 15: 若 JSON 缺少 layeredSlots.names，必須明確拋出 ValueError"""
        spec_no_names = copy.deepcopy(self.spec)
        del spec_no_names["layeredSlots"]["names"]

        spec_file = self.tmp_dir / "no_names_spec.json"
        spec_file.write_text(json.dumps(spec_no_names, indent=2, ensure_ascii=False), encoding="utf-8")

        with self.assertRaises(ValueError) as ctx:
            run_layered_parts_inspection(
                parts_dir=self.tmp_dir,
                spec_path=spec_file,
            )
        self.assertIn("layeredSlots.names", str(ctx.exception))

    def _create_mock_head_part(
        self,
        parts_dir: Path,
        core_box: tuple[int, int, int, int] = (800, 300, 1300, 880),
        ext_below: float = 52.0,
        ext_half_width: float = 40.0,
        with_anchors: bool = True,
    ) -> None:
        im = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        # 繪製 core (y <= 880)
        d.rectangle(core_box, fill=(210, 180, 150, 255))
        # 繪製 neck extension (y > 880)
        jx, jy = 1030.0, 880.0
        if ext_below > 0:
            d.rectangle(
                [jx - ext_half_width, jy, jx + ext_half_width, jy + ext_below],
                fill=(210, 180, 150, 255),
            )
        im.save(parts_dir / "head.png")

        if with_anchors:
            anchors_data = {
                "anchors": {
                    "neck": {"registeredPx": [1030.0, 880.0]},
                    "head_center": {"registeredPx": [1040.0, 580.0]},
                    "nose": {"registeredPx": [1150.0, 640.0]},
                }
            }
            (parts_dir / "head.anchors.json").write_text(json.dumps(anchors_data, indent=2), encoding="utf-8")

    def test_partitioned_head_all_pass(self) -> None:
        """測試 16 (AG-26): 合成資料 - core 在 zone 內且 neck extension 尺寸符合規範 -> 全過 PASS"""
        parts_dir = self.tmp_dir / "head_all_pass"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._create_mock_head_part(parts_dir, ext_below=52.0, ext_half_width=40.0)

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["head"],
        )
        self.assertTrue(passed, "合規合成頭部應 PASS")
        pi = report["slotReports"]["head"]["checks"]["scope_capsule_bounds"]["partitionedInspection"]
        self.assertTrue(pi["pass"])
        self.assertTrue(pi["core"]["pass"])
        self.assertTrue(pi["extension"]["pass"])

    def test_partitioned_head_core_out_of_bounds_fails(self) -> None:
        """測試 17 (AG-26): 合成資料 - core 區域大幅出界超出 zone -> FAIL"""
        parts_dir = self.tmp_dir / "head_core_out"
        parts_dir.mkdir(parents=True, exist_ok=True)
        # zone[2] = 1340, scopeMargin = 12, 最大 1352; 此處畫到 1500
        self._create_mock_head_part(parts_dir, core_box=(800, 300, 1500, 880))

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["head"],
        )
        self.assertFalse(passed, "Core 出界應判 FAIL")
        pi = report["slotReports"]["head"]["checks"]["scope_capsule_bounds"]["partitionedInspection"]
        self.assertFalse(pi["core"]["pass"])

    def test_partitioned_head_extension_too_short_fails(self) -> None:
        """測試 18 (AG-26): 合成資料 - extension 向下長度不足 (例如 30px < 48px) -> FAIL"""
        parts_dir = self.tmp_dir / "head_ext_short"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._create_mock_head_part(parts_dir, ext_below=30.0)

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["head"],
        )
        self.assertFalse(passed, "Extension 太短應判 FAIL")
        pi = report["slotReports"]["head"]["checks"]["scope_capsule_bounds"]["partitionedInspection"]
        self.assertFalse(pi["extension"]["pass"])
        self.assertFalse(pi["extension"]["lengthPass"])

    def test_partitioned_head_extension_too_wide_fails(self) -> None:
        """測試 19 (AG-26): 合成資料 - extension 左右半寬超出 (例如 80px > 64px) -> FAIL"""
        parts_dir = self.tmp_dir / "head_ext_wide"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._create_mock_head_part(parts_dir, ext_half_width=80.0)

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["head"],
        )
        self.assertFalse(passed, "Extension 太寬應判 FAIL")
        pi = report["slotReports"]["head"]["checks"]["scope_capsule_bounds"]["partitionedInspection"]
        self.assertFalse(pi["extension"]["pass"])
        self.assertFalse(pi["extension"]["widthPass"])

    def test_partitioned_head_extension_too_long_fails(self) -> None:
        """測試 20 (AG-26): 合成資料 - extension 向下過長 (例如 80px > 64px) -> FAIL"""
        parts_dir = self.tmp_dir / "head_ext_long"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._create_mock_head_part(parts_dir, ext_below=80.0)

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["head"],
        )
        self.assertFalse(passed, "Extension 過長應判 FAIL")
        pi = report["slotReports"]["head"]["checks"]["scope_capsule_bounds"]["partitionedInspection"]
        self.assertFalse(pi["extension"]["pass"])
        self.assertFalse(pi["extension"]["lengthPass"])

    def test_codex_r2_head_regression(self) -> None:
        """測試 21 (AG-26): Codex R2 頭部回歸實測 (需待 Codex 提供 head.anchors.json 後執行)"""
        r2_dir = Path(__file__).resolve().parent.parent.parent / "scratch" / "r274-head-r2-eval"
        if not (r2_dir / "head.png").exists():
            self.skipTest(f"跳過 R2 頭部回歸: 找不到 {r2_dir / 'head.png'}")
        if not (r2_dir / "head.anchors.json").exists() and not (r2_dir / "anchors.json").exists():
            self.skipTest("跳過 R2 頭部回歸: 等 Codex 補檔 head.anchors.json")

        report, passed = run_layered_parts_inspection(
            parts_dir=r2_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["head"],
        )
        self.assertTrue(passed, "Codex R2 頭部應通過 AG-26 分區驗收")
        pi = report["slotReports"]["head"]["checks"]["scope_capsule_bounds"]["partitionedInspection"]
        self.assertTrue(pi["core"]["pass"], "Core 應 PASS (0.00% 出界)")
        self.assertTrue(pi["extension"]["pass"], "Extension 應 PASS (48px <= 48~64px 且在左右範圍內)")
        self.assertTrue(pi["registration"]["pass"], "Registration gated 點應 PASS")

    def test_registration_anchor_missing_gated_fails(self) -> None:
        """測試 22 (AG-26b): 缺 anchors 檔時，gated 點判定 FAIL (tier ANCHOR_MISSING)，recorded 記 NOT_MEASURED"""
        parts_dir = self.tmp_dir / "head_no_anchors"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._create_mock_head_part(parts_dir, with_anchors=False)

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["head"],
        )
        self.assertFalse(passed, "缺 anchors 時 gated 點失敗，整體應判 FAIL")
        pi = report["slotReports"]["head"]["checks"]["scope_capsule_bounds"]["partitionedInspection"]
        reg = pi["registration"]
        self.assertFalse(reg["pass"], "Registration 應為 FAIL")
        self.assertEqual(reg["tier"], "FAIL")

        # 驗證 gated 點為 ANCHOR_MISSING
        for pt in ["neck", "head_center"]:
            self.assertIn(pt, reg["points"])
            pt_check = reg["points"][pt]
            self.assertTrue(pt_check["isGated"])
            self.assertFalse(pt_check["pass"])
            self.assertEqual(pt_check["tier"], "ANCHOR_MISSING")
            self.assertIsNone(pt_check["registeredPx"])
            self.assertIsNone(pt_check["distancePx"])

        # 驗證 recorded 點 (nose) 為 NOT_MEASURED
        self.assertIn("nose", reg["points"])
        nose_check = reg["points"]["nose"]
        self.assertFalse(nose_check["isGated"])
        self.assertTrue(nose_check["pass"])
        self.assertEqual(nose_check["tier"], "NOT_MEASURED")
        self.assertIsNone(nose_check["registeredPx"])
        self.assertIsNone(nose_check["distancePx"])

    def test_registration_wrong_key_recorded_as_not_measured(self) -> None:
        """測試 23 (AG-26b): 錨點鍵名不符 (如 nose_tip 而非 nose) 時，recorded 點標記為 NOT_MEASURED (非 0)"""
        parts_dir = self.tmp_dir / "head_wrong_key"
        parts_dir.mkdir(parents=True, exist_ok=True)
        self._create_mock_head_part(parts_dir, with_anchors=False)

        # 寫入包含 nose_tip (非規格名) 的 anchors.json
        anchors_data = {
            "anchors": {
                "neck": {"registeredPx": [1030.0, 880.0]},
                "head_center": {"registeredPx": [1040.0, 580.0]},
                "nose_tip": {"registeredPx": [1150.0, 640.0]},
            }
        }
        (parts_dir / "head.anchors.json").write_text(json.dumps(anchors_data, indent=2), encoding="utf-8")

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["head"],
        )
        self.assertTrue(passed, "gated 點合格，recorded 點缺值不應導致整體 FAIL")
        pi = report["slotReports"]["head"]["checks"]["scope_capsule_bounds"]["partitionedInspection"]
        reg = pi["registration"]
        self.assertTrue(reg["pass"])

        # 驗證 nose (規格名) 被記為 NOT_MEASURED，且 distancePx 不為 0
        nose_check = reg["points"]["nose"]
        self.assertEqual(nose_check["tier"], "NOT_MEASURED")
        self.assertTrue(nose_check["pass"])
        self.assertIsNone(nose_check["registeredPx"])
        self.assertIsNone(nose_check["distancePx"])

    def test_neck_extension_replaces_generic_hidden_extension_true(self) -> None:
        """測試 24 (AG-27): 當 replacesGenericHiddenExtension 為 True 時，torso 側延伸不足仍通過 (WAIVED)"""
        parts_dir = self.tmp_dir / "neck_waived_true"
        parts_dir.mkdir(parents=True, exist_ok=True)

        # 建立 head (52px 延伸，在 zone 內，附合規 anchors)
        self._create_mock_head_part(parts_dir, ext_below=52.0, ext_half_width=40.0, with_anchors=True)

        # 建立 torso (向上延伸僅 35px < 48px)
        im_torso = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_torso = ImageDraw.Draw(im_torso)
        j_neck = (float(self.spec["joints"]["neck"]["x"]), float(self.spec["joints"]["neck"]["y"]))
        j_pelvis = (float(self.spec["joints"]["pelvis"]["x"]), float(self.spec["joints"]["pelvis"]["y"]))
        d_torso.line([j_pelvis, j_neck], fill=(120, 100, 80, 255), width=200)
        # 向上僅延伸 35px (朝 y 負方向)
        d_torso.rectangle([j_neck[0] - 80, j_neck[1] - 35, j_neck[0] + 80, j_neck[1]], fill=(120, 100, 80, 255))
        im_torso.save(parts_dir / "torso.png")

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=DEFAULT_SPEC_PATH,
            filter_slots=["torso", "head"],
        )
        self.assertTrue(passed, "replacesGenericHiddenExtension 為 true 時整體應判定 PASS")
        joint_rep = report["jointHiddenExtensions"]["torso_to_head"]
        self.assertTrue(joint_rep["pass"])
        self.assertEqual(joint_rep["tier"], "WAIVED")
        self.assertTrue(joint_rep["replacesGenericHiddenExtension"])
        self.assertEqual(report["slotReports"]["torso"]["checks"]["hidden_extension_at_torso_to_head"]["tier"], "WAIVED")

    def test_neck_extension_replaces_generic_hidden_extension_false(self) -> None:
        """測試 25 (AG-27): 當 replacesGenericHiddenExtension 為 False 時，維持舊行為 (torso 側不足判 FAIL)"""
        parts_dir = self.tmp_dir / "neck_waived_false"
        parts_dir.mkdir(parents=True, exist_ok=True)

        self._create_mock_head_part(parts_dir, ext_below=52.0, ext_half_width=40.0, with_anchors=True)

        im_torso = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_torso = ImageDraw.Draw(im_torso)
        j_neck = (float(self.spec["joints"]["neck"]["x"]), float(self.spec["joints"]["neck"]["y"]))
        j_pelvis = (float(self.spec["joints"]["pelvis"]["x"]), float(self.spec["joints"]["pelvis"]["y"]))
        d_torso.line([j_pelvis, j_neck], fill=(120, 100, 80, 255), width=200)
        d_torso.rectangle([j_neck[0] - 80, j_neck[1] - 35, j_neck[0] + 80, j_neck[1]], fill=(120, 100, 80, 255))
        im_torso.save(parts_dir / "torso.png")

        spec_false = copy.deepcopy(load_spec(DEFAULT_SPEC_PATH))
        spec_false["segments"]["head"]["neckExtension"]["replacesGenericHiddenExtension"] = False
        spec_file = self.tmp_dir / "spec_false.json"
        spec_file.write_text(json.dumps(spec_false, indent=2, ensure_ascii=False), encoding="utf-8")

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=spec_file,
            filter_slots=["torso", "head"],
        )
        self.assertFalse(passed, "replacesGenericHiddenExtension 為 false 時 torso 延伸不足應判 FAIL")
        joint_rep = report["jointHiddenExtensions"]["torso_to_head"]
        self.assertFalse(joint_rep["pass"])
        self.assertEqual(joint_rep["tier"], "FAIL")
        self.assertEqual(report["slotReports"]["torso"]["checks"]["hidden_extension_at_torso_to_head"]["tier"], "FAIL")


if __name__ == "__main__":
    unittest.main()
