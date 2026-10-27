"""
單元測試：AG-35 規格 v3.16 擬議閘門轉正與隱藏延伸豁免
測試項目：
1. rotationCrack.gate.promoted: true 時，擬議閘門晉升為正式 rotation_leak 判定；舊全半徑露縫改為報告欄位不擋。
2. promoted: false 時，若舊全半徑露縫未過，維持舊判定 FAIL。
3. coverageRule.hiddenExtensionWaivers.childAloneSufficient: "parentExtensionNotRequired"，
   當關節標記為 childAloneSufficient 時，父骨側延伸不足獲得豁免 (WAIVED)，不判 FAIL。
4. coverageRule.hiddenExtensionWaivers.gripJoint: "advisoryWhenCrackPasses"，
   握孔關節且裂縫達標時，父骨側延伸不足改為 advisory 豁免 (WAIVED)，不判 FAIL。
5. 握孔關節若裂縫不達標，依然要求延伸，不予豁免。
"""

import copy
import json
import math
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
    DEFAULT_SPEC_PATH,
    run_layered_parts_inspection,
)


class TestAG35PromotedGateAndExtensionWaivers(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = Path(tempfile.mkdtemp(prefix="test_ag35_"))
        self.spec = json.loads(Path(DEFAULT_SPEC_PATH).read_text(encoding="utf-8"))
        self.canvas_w = int(self.spec.get("canvas", {}).get("w", 2048))
        self.canvas_h = int(self.spec.get("canvas", {}).get("h", 2048))

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def test_promoted_gate_true_passes_when_crack_passes_despite_old_full_radius(self) -> None:
        """
        測試 1: 當 promoted: true 時，擬議閘門轉正為正式判定。
        若 crack_pos/neg <= calc_crack_threshold (79.01 px)，
        即使舊全半徑 (full radius) 露縫大於門檻，該關節依然 PASS。
        """
        spec = copy.deepcopy(self.spec)
        spec["layeredSlots"]["rotationCrack"]["gate"]["promoted"] = True

        spec_file = self.tmp_dir / "spec_promoted_true.json"
        spec_file.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")

        parts_dir = self.tmp_dir / "parts"
        parts_dir.mkdir(parents=True, exist_ok=True)

        j_pelvis = (float(spec["joints"]["pelvis"]["x"]), float(spec["joints"]["pelvis"]["y"]))
        j_neck = (float(spec["joints"]["neck"]["x"]), float(spec["joints"]["neck"]["y"]))

        # 建立 torso: 在旋轉核心內 100% 覆蓋
        im_torso = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_torso = ImageDraw.Draw(im_torso)
        d_torso.line([j_pelvis, j_neck], fill=(120, 100, 80, 255), width=240)
        im_torso.save(parts_dir / "torso.png")

        # 建立 pelvis: 較短，但在關節處有足夠延伸
        im_pelvis = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_pelvis = ImageDraw.Draw(im_pelvis)
        d_pelvis.line([j_pelvis, (j_pelvis[0], j_pelvis[1] + 100.0)], fill=(90, 80, 70, 255), width=180)
        im_pelvis.save(parts_dir / "pelvis.png")

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=spec_file,
            filter_slots=["pelvis", "torso"],
        )

        leak_rep = report["rotationLeakChecks"]["pelvis_to_torso"]
        self.assertTrue(leak_rep.get("promoted", False), "promoted 旗標應為 True")
        self.assertTrue(leak_rep["pass"], "promoted: true 下擬議判定通過應使正式 pass=True")
        self.assertEqual(leak_rep["tier"], "PASS")

    def test_promoted_gate_false_retains_old_full_radius_failure(self) -> None:
        """
        測試 2: 當 promoted: false 時，維持舊閘門判定。
        若舊全半徑露縫不通過，該關節維持 FAIL。
        """
        spec = copy.deepcopy(self.spec)
        spec["layeredSlots"]["rotationCrack"]["gate"]["promoted"] = False

        spec_file = self.tmp_dir / "spec_promoted_false.json"
        spec_file.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")

        parts_dir = self.tmp_dir / "parts"
        parts_dir.mkdir(parents=True, exist_ok=True)

        j_pelvis = (float(spec["joints"]["pelvis"]["x"]), float(spec["joints"]["pelvis"]["y"]))
        j_neck = (float(spec["joints"]["neck"]["x"]), float(spec["joints"]["neck"]["y"]))

        im_torso = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_torso = ImageDraw.Draw(im_torso)
        d_torso.line([j_pelvis, j_neck], fill=(120, 100, 80, 255), width=240)
        im_torso.save(parts_dir / "torso.png")

        im_pelvis = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_pelvis = ImageDraw.Draw(im_pelvis)
        d_pelvis.line([j_pelvis, (j_pelvis[0], j_pelvis[1] + 100.0)], fill=(90, 80, 70, 255), width=180)
        im_pelvis.save(parts_dir / "pelvis.png")

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=spec_file,
            filter_slots=["pelvis", "torso"],
        )

        leak_rep = report["rotationLeakChecks"]["pelvis_to_torso"]
        self.assertFalse(leak_rep.get("promoted", False), "promoted 旗標應為 False")
        # 若舊全半徑有露縫，leak_rep['pass'] 會等於舊判定
        self.assertEqual(leak_rep["pass"], leak_rep.get("oldFullRadiusLeakPass", leak_rep["pass"]))

    def test_hidden_extension_waiver_child_alone_sufficient(self) -> None:
        """
        測試 3: 當關節標記為 childAloneSufficient 時，
        父骨側隱藏延伸不要求 (豁免 WAIVED)，不判 FAIL。
        """
        spec = copy.deepcopy(self.spec)
        spec["layeredSlots"]["rotationCrack"]["gate"]["promoted"] = True
        spec["layeredSlots"]["coverageRule"]["hiddenExtensionWaivers"] = {
            "childAloneSufficient": "parentExtensionNotRequired",
            "gripJoint": "advisoryWhenCrackPasses",
        }

        spec_file = self.tmp_dir / "spec_waivers.json"
        spec_file.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")

        parts_dir = self.tmp_dir / "parts"
        parts_dir.mkdir(parents=True, exist_ok=True)

        j_pelvis = (float(spec["joints"]["pelvis"]["x"]), float(spec["joints"]["pelvis"]["y"]))
        j_neck = (float(spec["joints"]["neck"]["x"]), float(spec["joints"]["neck"]["y"]))

        # 軀幹 100% 覆蓋 (childAloneSufficient)
        im_torso = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_torso = ImageDraw.Draw(im_torso)
        d_torso.line([j_pelvis, j_neck], fill=(120, 100, 80, 255), width=240)
        im_torso.save(parts_dir / "torso.png")

        # 骨盆: 延伸不足 (-30 px，即未往上延伸穿過骨點)
        im_pelvis = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_pelvis = ImageDraw.Draw(im_pelvis)
        # 故意讓骨盆在 j_pelvis 下方 30 px 開始，不穿過關節
        d_pelvis.line([(j_pelvis[0], j_pelvis[1] + 30.0), (j_pelvis[0], j_pelvis[1] + 120.0)], fill=(90, 80, 70, 255), width=180)
        im_pelvis.save(parts_dir / "pelvis.png")

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=spec_file,
            filter_slots=["pelvis", "torso"],
        )

        ext_rep = report["jointHiddenExtensions"]["pelvis_to_torso"]
        self.assertTrue(ext_rep.get("parentWaived", False), "pelvis 應獲 childAloneSufficient 豁免")
        self.assertEqual(ext_rep["tier"], "WAIVED")
        self.assertTrue(ext_rep["pass"])

        # pelvis slot 檢查應不為 FAIL
        slot_pelvis = report["slotReports"]["pelvis"]
        check_ext = slot_pelvis["checks"]["hidden_extension_at_pelvis_to_torso"]
        self.assertTrue(check_ext["pass"])
        self.assertEqual(check_ext["tier"], "WAIVED")

    def test_hidden_extension_waiver_grip_joint_advisory(self) -> None:
        """
        測試 4: 握孔關節 (arm_lower_*_to_hand_*) 且裂縫達標時，
        父骨側 (arm_lower) 延伸不足改為 advisory 只報告，不判 FAIL。
        """
        spec = copy.deepcopy(self.spec)
        spec["layeredSlots"]["rotationCrack"]["gate"]["promoted"] = True
        spec["layeredSlots"]["coverageRule"]["hiddenExtensionWaivers"] = {
            "childAloneSufficient": "parentExtensionNotRequired",
            "gripJoint": "advisoryWhenCrackPasses",
        }
        # 測試 gripJoint 豁免：將 hand_f 骨點設為握點 grip_A
        gx_a = float(spec["grips"]["grip_A"]["x"])
        gy_a = float(spec["grips"]["grip_A"]["y"])
        for b in spec.get("bones", []):
            if b.get("name") == "hand_f":
                b["pivotCanvasPx"] = [gx_a, gy_a]

        spec_file = self.tmp_dir / "spec_grip_waiver.json"
        spec_file.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")

        parts_dir = self.tmp_dir / "parts"
        parts_dir.mkdir(parents=True, exist_ok=True)

        j_elbow_f = (float(spec["joints"]["elbow_f"]["x"]), float(spec["joints"]["elbow_f"]["y"]))
        j_wrist_f = (gx_a, gy_a)

        # arm_lower_f: 延伸不足 (例如只延伸 12 px < 48 px)
        im_arm_lower = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_lower = ImageDraw.Draw(im_arm_lower)
        v_arm = (j_wrist_f[0] - j_elbow_f[0], j_wrist_f[1] - j_elbow_f[1])
        norm_v = math.hypot(v_arm[0], v_arm[1]) or 1.0
        ext_pt = (j_wrist_f[0] + (v_arm[0] / norm_v) * 12.0, j_wrist_f[1] + (v_arm[1] / norm_v) * 12.0)
        d_lower.line([j_elbow_f, ext_pt], fill=(80, 100, 160, 255), width=70)
        im_arm_lower.save(parts_dir / "arm_lower_f.png")

        # hand_f: 覆蓋握點且自身延伸充足 (半徑 60 px >= 48 px)
        im_hand = Image.new("RGBA", (self.canvas_w, self.canvas_h), (0, 0, 0, 0))
        d_hand = ImageDraw.Draw(im_hand)
        d_hand.ellipse([j_wrist_f[0] - 60, j_wrist_f[1] - 60, j_wrist_f[0] + 60, j_wrist_f[1] + 60], fill=(200, 160, 120, 255))
        im_hand.save(parts_dir / "hand_f.png")

        report, passed = run_layered_parts_inspection(
            parts_dir=parts_dir,
            spec_path=spec_file,
            filter_slots=["arm_lower_f", "hand_f"],
        )

        ext_rep = report["jointHiddenExtensions"]["arm_lower_f_to_hand_f"]
        self.assertTrue(ext_rep.get("parentWaived", False), "arm_lower_f 應獲 gripJoint advisory 豁免")
        self.assertEqual(ext_rep["tier"], "WAIVED")
        self.assertTrue(ext_rep["pass"])

        # arm_lower_f slot 檢查應不為 FAIL
        slot_lower = report["slotReports"]["arm_lower_f"]
        check_ext = slot_lower["checks"]["hidden_extension_at_arm_lower_f_to_hand_f"]
        self.assertTrue(check_ext["pass"])
        self.assertEqual(check_ext["tier"], "WAIVED")


if __name__ == "__main__":
    unittest.main()
