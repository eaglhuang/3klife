import json
import math
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from snap_rigid_align import (
    compute_rigid_similarity_transform,
    check_seam_overlap,
    apply_snap_pipeline,
)

class TestSnapRigidAlign(unittest.TestCase):
    def test_similarity_transform_translation_only(self):
        src_a = (100.0, 100.0)
        src_b = (100.0, 200.0)
        dst_a = (115.0, 125.0)
        dst_b = (115.0, 225.0)

        M, deg, scale, (tx, ty) = compute_rigid_similarity_transform(src_a, src_b, dst_a, dst_b)
        self.assertAlmostEqual(deg, 0.0, places=4)
        self.assertAlmostEqual(scale, 1.0, places=4)
        self.assertAlmostEqual(tx, 15.0, places=4)
        self.assertAlmostEqual(ty, 25.0, places=4)

        # 驗證變換後點座標
        pt_a_res = M @ np.array([100.0, 100.0, 1.0])
        pt_b_res = M @ np.array([100.0, 200.0, 1.0])
        self.assertAlmostEqual(pt_a_res[0], 115.0, places=4)
        self.assertAlmostEqual(pt_a_res[1], 125.0, places=4)
        self.assertAlmostEqual(pt_b_res[0], 115.0, places=4)
        self.assertAlmostEqual(pt_b_res[1], 225.0, places=4)

    def test_similarity_transform_rotation_and_scale_clamp(self):
        # 測試大旋轉 (30°) 與大縮放 (1.5) 是否被安全鉗制在 10° 與 ±8% 內
        src_a = (100.0, 100.0)
        src_b = (200.0, 100.0) # 0度, 長度 100
        # 目標 30度, 長度 150
        dst_a = (100.0, 100.0)
        dst_b = (100.0 + 150.0 * math.cos(math.radians(30)), 100.0 + 150.0 * math.sin(math.radians(30)))

        M, deg, scale, _ = compute_rigid_similarity_transform(src_a, src_b, dst_a, dst_b, max_angle_deg=10.0, max_scale_pct=8.0)
        self.assertAlmostEqual(deg, 10.0, places=4, msg="角度應被限制在 10.0°")
        self.assertAlmostEqual(scale, 1.08, places=4, msg="骨長縮放應被限制在 +8% (1.08)")

    def test_seam_overlap_check(self):
        # 建立兩個 100x100 圖層
        p1 = np.zeros((100, 100, 4), dtype=np.uint8)
        p2 = np.zeros((100, 100, 4), dtype=np.uint8)

        # 在關節 (50, 50) 附近，p1 在 y: 30..55, p2 在 y: 45..70 (重疊 y: 45..55, 寬度 10px)
        p1[30:56, 40:60] = [200, 200, 200, 255]
        p2[45:71, 40:60] = [200, 200, 200, 255]

        res = check_seam_overlap(p1, p2, joint_xy=(50.0, 50.0), radius=20, min_overlap_px=6)
        self.assertTrue(res["passed"], "重疊 11px 應 PASS")
        self.assertFalse(res["has_crack"], "不應有裂縫")
        self.assertGreaterEqual(res["overlap_px"], 6)

        # 測試裂縫 (p1: 30..45, p2: 55..70，中間空缺 10px)
        p1_crack = np.zeros((100, 100, 4), dtype=np.uint8)
        p2_crack = np.zeros((100, 100, 4), dtype=np.uint8)
        p1_crack[30:45, 40:60] = [200, 200, 200, 255]
        p2_crack[55:70, 40:60] = [200, 200, 200, 255]

        res_crack = check_seam_overlap(p1_crack, p2_crack, joint_xy=(50.0, 50.0), radius=20, min_overlap_px=6)
        self.assertFalse(res_crack["passed"])
        self.assertTrue(res_crack["has_crack"])

    def test_apply_snap_pipeline_integration(self):
        tmp_dir = tempfile.mkdtemp(prefix="test_snap_pipeline_")
        try:
            out_dir = Path(tmp_dir)
            parts_dir = out_dir / "parts"
            masks_dir = out_dir / "masks"
            anim_masks_dir = out_dir / "anim_masks"
            parts_dir.mkdir()
            masks_dir.mkdir()
            anim_masks_dir.mkdir()

            spec_path = Path(__file__).resolve().parent.parent / "specs" / "canonical_skeleton_v3.json"
            spec = json.loads(spec_path.read_text(encoding="utf-8"))

            # 建立一個測試部位 arm_upper_f (肩膀到手肘)
            sh_x, sh_y = spec["joints"]["shoulder_f"]["x"], spec["joints"]["shoulder_f"]["y"]
            el_x, el_y = spec["joints"]["elbow_f"]["x"], spec["joints"]["elbow_f"]["y"]

            # 模擬偵測到有微小偏差 (肩偏 +15px, 肘偏 -10px)
            det_points = {
                "shoulder_f": [sh_x + 15.0, sh_y + 10.0],
                "elbow_f": [el_x - 10.0, el_y + 15.0],
            }

            p_arr = np.zeros((2048, 2048, 4), dtype=np.uint8)
            # 畫一條手臂
            p_arr[int(sh_y):int(el_y), int(sh_x):int(el_x)] = [220, 200, 180, 255]
            Image.fromarray(p_arr).save(parts_dir / "arm_upper_f.png")

            trimmed_parts = {
                "arm_upper_f": {
                    "empty": False,
                    "crop": p_arr[int(sh_y):int(el_y), int(sh_x):int(el_x)].copy(),
                    "trimRectPx": [int(sh_x), int(sh_y), int(el_x - sh_x), int(el_y - sh_y)],
                    "visiblePixels": int((p_arr[..., 3] > 0).sum()),
                }
            }

            res_parts, rep = apply_snap_pipeline(
                trimmed_parts=trimmed_parts,
                parts_out_dir=parts_dir,
                masks_out_dir=masks_dir,
                anim_masks_out_dir=anim_masks_dir,
                detected_points=det_points,
                canonical_spec=spec,
                out_dir=out_dir,
                canvas_size=(2048, 2048),
            )

            # 驗證產出疊圖與報告
            self.assertTrue((out_dir / "snap_before_overlay.png").exists())
            self.assertTrue((out_dir / "snap_after_overlay.png").exists())
            self.assertTrue((out_dir / "snap_report.json").exists())

            # 驗證 report 欄位
            self.assertIn("arm_upper_f", rep["snap_details"])
            detail = rep["snap_details"]["arm_upper_f"]
            self.assertEqual(detail["after_error_from_px"], 0.0)
            self.assertLess(detail["after_error_to_px"], 5.0)

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

if __name__ == "__main__":
    unittest.main()
