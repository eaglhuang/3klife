import unittest
import numpy as np
import cv2
import json
import tempfile
from pathlib import Path
from PIL import Image

from tools_anim.check_layered_parts import (
    derive_joint_connections,
    check_slot_hidden_extension,
    extract_main_component_128,
    run_layered_parts_inspection,
)


class TestAG42ExtensionMeasureOnMainComponent(unittest.TestCase):
    """
    AG-42 驗收測試：隱藏延伸只量主連通區 (規格 v3.22)
    1. 規格欄位 coverageRule.extensionMeasureOn = "mainComponent" 動態讀取
    2. r40 三項大腿延伸改判 FAIL (數值與 R320 v1 相同量級 31~40 px，不再被游離方條假通過為 68 px)
    3. R317 preserve-grip 等原本靠主體通過的延伸不受影響
    4. 人造測試：游離雜片在 measure_on="all" 造成假通過，在 "mainComponent" 被正確阻擋判 FAIL
    """

    @classmethod
    def setUpClass(cls):
        cls.spec_path = Path(__file__).resolve().parent.parent / "specs" / "canonical_skeleton_v3.json"
        with open(cls.spec_path, encoding="utf-8") as f:
            cls.spec_data = json.load(f)
        cls.r305_base = Path(r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r305-final-candidate")

    def test_spec_field_configured(self):
        """驗證規格 v3.22 包含 extensionMeasureOn = 'mainComponent'"""
        cov_rule = self.spec_data.get("layeredSlots", {}).get("coverageRule", {})
        self.assertEqual(cov_rule.get("extensionMeasureOn"), "mainComponent")

    def test_r40_thigh_extensions_fail(self):
        """r40 三項大腿延伸在 mainComponent 規則下改判 FAIL"""
        cand_dir = self.r305_base / "parts-r318-hand-fist-v5_2_r324_cap_r40"
        if not cand_dir.exists():
            self.skipTest("無 r40 目錄，跳過")

        conns = derive_joint_connections(self.spec_data)
        conns_map = {c["id"]: c for c in conns}

        # 1. pelvis_to_thigh_f (child thigh_f)
        jc = conns_map["pelvis_to_thigh_f"]
        c_arr = np.array(Image.open(cand_dir / "thigh_f.png").convert("RGBA"))
        dir_c = (jc["parent_pivot"][0] - jc["pivot"][0], jc["parent_pivot"][1] - jc["pivot"][1])
        # raw 會量到 68.0 px (游離方條)
        p_raw, ext_raw = check_slot_hidden_extension(c_arr, jc["pivot"], dir_c, 48.0, 1.0, measure_on="all")
        self.assertTrue(p_raw)
        self.assertAlmostEqual(ext_raw, 68.0, delta=1.0)
        # mainComponent 改判 FAIL (約 33.6 px)
        p_main, ext_main = check_slot_hidden_extension(c_arr, jc["pivot"], dir_c, 48.0, 1.0, measure_on="mainComponent")
        self.assertFalse(p_main)
        self.assertLess(ext_main, 47.0)
        self.assertAlmostEqual(ext_main, 33.6, delta=1.0)

        # 2. thigh_f_to_shin_f (parent thigh_f)
        jc2 = conns_map["thigh_f_to_shin_f"]
        dir_p = (jc2["pivot"][0] - jc2["parent_pivot"][0], jc2["pivot"][1] - jc2["parent_pivot"][1])
        p_raw2, ext_raw2 = check_slot_hidden_extension(c_arr, jc2["pivot"], dir_p, 48.0, 1.0, measure_on="all")
        self.assertTrue(p_raw2)
        self.assertAlmostEqual(ext_raw2, 68.0, delta=1.0)
        p_main2, ext_main2 = check_slot_hidden_extension(c_arr, jc2["pivot"], dir_p, 48.0, 1.0, measure_on="mainComponent")
        self.assertFalse(p_main2)
        self.assertLess(ext_main2, 47.0)

        # 3. pelvis_to_thigh_b (child thigh_b)
        jc3 = conns_map["pelvis_to_thigh_b"]
        tb_arr = np.array(Image.open(cand_dir / "thigh_b.png").convert("RGBA"))
        dir_cb = (jc3["parent_pivot"][0] - jc3["pivot"][0], jc3["parent_pivot"][1] - jc3["pivot"][1])
        p_raw3, ext_raw3 = check_slot_hidden_extension(tb_arr, jc3["pivot"], dir_cb, 48.0, 1.0, measure_on="all")
        self.assertTrue(p_raw3)
        self.assertAlmostEqual(ext_raw3, 68.0, delta=1.0)
        p_main3, ext_main3 = check_slot_hidden_extension(tb_arr, jc3["pivot"], dir_cb, 48.0, 1.0, measure_on="mainComponent")
        self.assertFalse(p_main3)
        self.assertLess(ext_main3, 47.0)
        self.assertAlmostEqual(ext_main3, 39.7, delta=1.0)

    def test_r320_v1_thigh_extensions(self):
        """R320 v1 (接合大腿、刪除方條) 的大腿延伸值為 ~33.6 / 31.2 px，皆判定為 FAIL"""
        cand_p = self.r305_base / "parts-r320-from-r324-r40" / "thigh_f.png"
        if not cand_p.exists():
            self.skipTest("無 R320 thigh_f.png，跳過")

        arr = np.array(Image.open(cand_p).convert("RGBA"))
        conns = derive_joint_connections(self.spec_data)
        conns_map = {c["id"]: c for c in conns}

        # 骨盆接點 (向上延伸)
        jc_hip = conns_map["pelvis_to_thigh_f"]
        dir_c = (jc_hip["parent_pivot"][0] - jc_hip["pivot"][0], jc_hip["parent_pivot"][1] - jc_hip["pivot"][1])
        p_pass, ext_val = check_slot_hidden_extension(arr, jc_hip["pivot"], dir_c, 48.0, 1.0, measure_on="mainComponent")
        self.assertFalse(p_pass)
        self.assertLess(ext_val, 47.0)
        self.assertAlmostEqual(ext_val, 33.6, delta=1.5)

        # 膝接點 (向下延伸)
        jc_knee = conns_map["thigh_f_to_shin_f"]
        dir_p = (jc_knee["pivot"][0] - jc_knee["parent_pivot"][0], jc_knee["pivot"][1] - jc_knee["parent_pivot"][1])
        p_pass2, ext_val2 = check_slot_hidden_extension(arr, jc_knee["pivot"], dir_p, 48.0, 1.0, measure_on="mainComponent")
        self.assertFalse(p_pass2)
        self.assertLess(ext_val2, 47.0)
        self.assertAlmostEqual(ext_val2, 31.2, delta=1.5)

    def test_r317_preserve_grip_arm_lower_f_unaffected(self):
        """R317 preserve-grip 的 arm_lower_f 靠主體延伸 47.4 px 在 1 px 容差下依然 PASS"""
        r317_p = self.r305_base / "parts-r317-preserve-grip-v1" / "arm_lower_f.png"
        if not r317_p.exists():
            self.skipTest("無 R317 arm_lower_f.png，跳過")

        arr = np.array(Image.open(r317_p).convert("RGBA"))
        conns = derive_joint_connections(self.spec_data)
        jc = [c for c in conns if c["id"] == "arm_lower_f_to_hand_f"][0]
        dir_p = (jc["pivot"][0] - jc["parent_pivot"][0], jc["pivot"][1] - jc["parent_pivot"][1])

        p_pass, ext_val = check_slot_hidden_extension(arr, jc["pivot"], dir_p, 48.0, 1.0, measure_on="mainComponent")
        self.assertTrue(p_pass)
        self.assertAlmostEqual(ext_val, 47.4, delta=0.2)

    def test_synthetic_detached_island_rejected(self):
        """人造測試：游離雜片在 measure_on='all' 造成假通過，在 'mainComponent' 被阻擋判 FAIL"""
        h, w = 512, 512
        piv_pt = (256.0, 256.0)
        dir_vec = (1.0, 0.0)  # 向右延伸
        min_ext_px = 48.0
        tol_px = 1.0  # 門檻 47.0 px

        arr = np.zeros((h, w, 4), dtype=np.uint8)
        # 1. 主體在左側，越過樞紐向右延伸只有 20 px (x=276)
        cv2.rectangle(arr, (200, 230), (276, 280), [200, 150, 100, 255], thickness=-1)

        # 2. 獨立游離方條在 x=324 (越過樞紐 68 px)，面積 300 px
        cv2.rectangle(arr, (320, 250), (324, 270), [200, 150, 100, 255], thickness=-1)

        # measure_on="all": 量到游離方條 68 px -> 假通過 PASS
        p_all, ext_all = check_slot_hidden_extension(arr, piv_pt, dir_vec, min_ext_px, tol_px, measure_on="all")
        self.assertTrue(p_all)
        self.assertAlmostEqual(ext_all, 68.0, delta=1.0)

        # measure_on="mainComponent": 只量主體 20 px -> 正確判 FAIL
        p_main, ext_main = check_slot_hidden_extension(arr, piv_pt, dir_vec, min_ext_px, tol_px, measure_on="mainComponent")
        self.assertFalse(p_main)
        self.assertAlmostEqual(ext_main, 20.0, delta=1.0)


if __name__ == "__main__":
    unittest.main()
