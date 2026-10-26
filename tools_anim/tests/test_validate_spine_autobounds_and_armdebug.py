import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from validate_spine import render_animations_and_check_head_occlusion

class TestValidateSpineAutoBoundsAndArmDebug(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="test_autobounds_")
        self.out_dir = Path(self.tmp_dir)

    def tearDown(self):
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_autobounds_and_debug_mask_generation(self):
        # 1. 建立一個 200x200 atlas
        atlas_img = np.zeros((200, 200, 4), dtype=np.uint8)
        atlas_img[:] = [200, 200, 200, 255]

        # 2. 建立包含長槍大橫向位移 (X: -600 到 +2200) 的 eval_data
        # setup frame: 手臂有較多像素
        setup_draw = {
            "drawables": [
                {
                    "slot": "arm_lower_f",
                    "vertices": [-100.0, 500.0, -50.0, 500.0, -100.0, 600.0],
                    "uvs": [0.1, 0.1, 0.2, 0.1, 0.1, 0.2],
                    "triangles": [0, 1, 2],
                }
            ]
        }

        # thrust frame: 手臂頂點縮小到只有一點點，長槍向前延伸至 X=2000
        thrust_draw = [
            {
                "slot": "arm_lower_f",
                "vertices": [-100.0, 500.0, -98.0, 500.0, -100.0, 502.0],  # 面積大幅縮小 (< 60%)
                "uvs": [0.1, 0.1, 0.2, 0.1, 0.1, 0.2],
                "triangles": [0, 1, 2],
            },
            {
                "slot": "weapon",
                "vertices": [0.0, 500.0, 2000.0, 500.0, 0.0, 520.0],  # 長槍刺出到 X=2000
                "uvs": [0.1, 0.1, 0.9, 0.1, 0.1, 0.2],
                "triangles": [0, 1, 2],
            }
        ]

        eval_data = {
            "setupDraw": setup_draw,
            "animations": {
                "thrust": {
                    "frames": [
                        {
                            "frameIndex": 40,
                            "time": 1.67,
                            "drawables": thrust_draw,
                        }
                    ]
                }
            }
        }

        rep = render_animations_and_check_head_occlusion(
            eval_data=eval_data,
            atlas_img=atlas_img,
            out_dir=self.out_dir,
            canvas_h=360,
        )

        # 檢查 1: frame_040.png 的寬度是否自適應動態擴展 (> 350 px，不再死鎖於 298 px)
        frame_40_path = self.out_dir / "thrust_frames" / "frame_040.png"
        self.assertTrue(frame_40_path.exists(), "frame_040.png 應存在")
        im40 = Image.open(frame_40_path)
        self.assertGreater(im40.width, 350, f"Auto-Bounds 應將長槍動態展開寬度，實測寬度: {im40.width}")

        # 檢查 2: arm_continuity 除錯圖是否成功輸出 (無論在 out_dir 頂層或 frames_dir)
        debug_in_frames = list((self.out_dir / "thrust_frames").glob("*arm_lower_f_debug.png"))
        debug_in_root = list(self.out_dir.glob("*arm_lower_f_debug.png"))
        self.assertTrue(len(debug_in_frames) > 0, "frames_dir 內應輸出 arm_debug.png")
        self.assertTrue(len(debug_in_root) > 0, "out_dir 根目錄下應輸出 arm_debug.png")

if __name__ == "__main__":
    unittest.main()
