#!/usr/bin/env python3
"""無武將名稱與像素數值硬編碼回歸測試 (test_no_general_hardcoding.py)

依據工單 AG-08、AG-20 與 SPEC-RIG-POSE-02 §7:
1. 程式內不得出現任何武將名稱特例（grep 測試保證）。
2. AG-20 擴充：掃描 check_rigpose.py 和 validate_spine.py 中，數值 >= 200 的像素切片或 range 常數（get_j 的預設值除外），出現即判 FAIL。
"""
from __future__ import annotations

import ast
import re
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOOLS_DIR = HERE.parent

CORE_SCRIPTS = [
    TOOLS_DIR / "slice_and_rig.py",
    TOOLS_DIR / "validate_spine.py",
    TOOLS_DIR / "check_rigpose.py",
    TOOLS_DIR / "generate_rigpose_templates.py",
    TOOLS_DIR / "check_layered_parts.py",
    TOOLS_DIR / "build_spine_from_v3.py",
    TOOLS_DIR / "merge_motion_library.py",
]

# 任何武將拼音或中文作為變數、字串判斷均為違規
FORBIDDEN_NAMES = [
    "zhaoyun", "zhao_yun", "趙雲",
    "zhangfei", "zhang_fei", "張飛",
    "guanyu", "guan_yu", "關羽",
    "lvbu", "lv_bu", "呂布",
    "caocao", "cao_cao", "曹操",
    "liubei", "liu_bei", "劉備",
    "daqiao", "da_qiao", "大喬",
    "xiaoqiao", "xiao_qiao", "小喬",
    "diaochan", "diao_chan", "貂蟬",
]


def check_general_hardcoding() -> list[str]:
    violations: list[str] = []

    for script in CORE_SCRIPTS:
        if not script.exists():
            continue
        text = script.read_text(encoding="utf-8")
        lines = text.splitlines()

        for line_no, line in enumerate(lines, start=1):
            stripped = line.strip()
            # 略過單純註解文字
            if stripped.startswith("#") or stripped.startswith('"""') or stripped.startswith("*"):
                continue

            for name in FORBIDDEN_NAMES:
                pattern = rf"(?i)\b{name}\b"
                if re.search(pattern, line) or (name in line and not line.strip().startswith("#")):
                    violations.append(f"{script.name}:{line_no}: 含有武將名稱 '{name}' -> {stripped}")

    return violations


def check_slice_and_range_hardcoding() -> list[str]:
    """AG-20 / AG-21: 掃描 check_rigpose.py, validate_spine.py, check_layered_parts.py 中數值 >= 200 的像素切片或 range 常數"""
    target_scripts = [
        TOOLS_DIR / "check_rigpose.py",
        TOOLS_DIR / "validate_spine.py",
        TOOLS_DIR / "check_layered_parts.py",
    ]
    violations: list[str] = []

    for script in target_scripts:
        if not script.exists():
            continue
        text = script.read_text(encoding="utf-8")
        try:
            tree = ast.parse(text, filename=str(script))
        except Exception as e:
            violations.append(f"{script.name}: AST 解析失敗: {e}")
            continue

        class Visitor(ast.NodeVisitor):
            def visit_Subscript(self, node):
                self._check_slice(node.slice, node.lineno)
                self.generic_visit(node)

            def _check_slice(self, s, lineno):
                if isinstance(s, ast.Slice):
                    for part in (s.lower, s.upper, s.step):
                        if isinstance(part, ast.Constant) and isinstance(part.value, (int, float)):
                            if part.value >= 200:
                                violations.append(
                                    f"{script.name}:{lineno}: 像素切片含有數值 >= 200 常數: {part.value}"
                                )
                elif isinstance(s, ast.Tuple):
                    for elt in s.elts:
                        self._check_slice(elt, lineno)

            def visit_Call(self, node):
                if isinstance(node.func, ast.Name) and node.func.id == "range":
                    for arg in node.args:
                        if isinstance(arg, ast.Constant) and isinstance(arg.value, (int, float)):
                            if arg.value >= 200:
                                violations.append(
                                    f"{script.name}:{node.lineno}: range 常數含有數值 >= 200: {arg.value}"
                                )
                self.generic_visit(node)

        Visitor().visit(tree)

    return violations


def check_no_canonical_slots_literal_list() -> list[str]:
    """AG-25 小修: 檢查 check_layered_parts.py、build_spine_from_v3.py 與 merge_motion_library.py 中不得出現 21 槽名的字面清單"""
    target_scripts = [
        TOOLS_DIR / "check_layered_parts.py",
        TOOLS_DIR / "build_spine_from_v3.py",
        TOOLS_DIR / "merge_motion_library.py",
    ]
    violations: list[str] = []
    known_slots = {
        "pelvis", "torso", "head", "cape", "hair_tail", "skirt",
        "arm_upper_f", "arm_lower_f", "hand_f", "pauldron_f", "weapon",
        "arm_upper_b", "arm_lower_b", "hand_b", "pauldron_b",
        "thigh_f", "shin_f", "foot_f", "thigh_b", "shin_b", "foot_b",
    }

    for script in target_scripts:
        if not script.exists():
            continue
        text = script.read_text(encoding="utf-8")
        try:
            tree = ast.parse(text, filename=str(script))
        except Exception as e:
            violations.append(f"{script.name}: AST 解析失敗: {e}")
            continue

        class SlotListVisitor(ast.NodeVisitor):
            def visit_List(self, node):
                self._check_seq(node.elts, node.lineno, "List")
                self.generic_visit(node)

            def visit_Tuple(self, node):
                self._check_seq(node.elts, node.lineno, "Tuple")
                self.generic_visit(node)

            def visit_Set(self, node):
                self._check_seq(node.elts, node.lineno, "Set")
                self.generic_visit(node)

            def _check_seq(self, elts, lineno, kind):
                str_constants = [
                    elt.value for elt in elts
                    if isinstance(elt, ast.Constant) and isinstance(elt.value, str)
                ]
                match_count = sum(1 for s in str_constants if s in known_slots)
                if match_count >= 10:
                    violations.append(
                        f"{script.name}:{lineno}: 出現 {kind} 字面槽名清單 ({match_count} 個槽名)，應改由 JSON layeredSlots 讀取"
                    )

        SlotListVisitor().visit(tree)

    return violations


def check_no_joint_names_in_core_scripts() -> list[str]:
    """AG-26b: 檢查核心工具 (check_layered_parts.py, build_spine_from_v3.py, merge_motion_library.py) 不得出現 joints 裡任何關節名的字串字面值"""
    import json
    target_scripts = [
        TOOLS_DIR / "check_layered_parts.py",
        TOOLS_DIR / "build_spine_from_v3.py",
        TOOLS_DIR / "merge_motion_library.py",
    ]
    spec_path = TOOLS_DIR / "specs" / "canonical_skeleton_v3.json"
    if not spec_path.exists():
        return [f"找不到規範 JSON: {spec_path}"]

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    joint_names = set(spec.get("joints", {}).keys())
    if not joint_names:
        return ["規範 JSON 中無關節定義"]

    violations: list[str] = []
    for script in target_scripts:
        if not script.exists():
            continue
        text = script.read_text(encoding="utf-8")
        try:
            tree = ast.parse(text, filename=str(script))
        except Exception as e:
            violations.append(f"{script.name}: AST 解析失敗: {e}")
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                if node.value in joint_names:
                    violations.append(
                        f"{script.name}:{node.lineno}: 出現 joints 關節名字串字面值 '{node.value}'，應由 JSON 規格動態推導"
                    )

    return violations


def check_no_partial_bone_names_in_motion_tool() -> list[str]:
    """AG-27b: 檢查動作庫合併工具 (merge_motion_library.py) 代碼邏輯中不得出現部分骨名字串字面值進行過濾比對"""
    script = TOOLS_DIR / "merge_motion_library.py"
    if not script.exists():
        return []

    violations: list[str] = []
    text = script.read_text(encoding="utf-8")
    try:
        tree = ast.parse(text, filename=str(script))
    except Exception as e:
        return [f"{script.name}: AST 解析失敗: {e}"]

    forbidden_bone_patterns = {"arm_upper", "upperarm", "arm_", "weapon", "hand_"}

    # 搜集所有 docstring 節點
    docstring_nodes = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if (
                node.body
                and isinstance(node.body[0], ast.Expr)
                and isinstance(node.body[0].value, ast.Constant)
                and isinstance(node.body[0].value.value, str)
            ):
                docstring_nodes.add(id(node.body[0].value))

    for node in ast.walk(tree):
        if id(node) in docstring_nodes:
            continue
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            val = node.value
            if val.endswith("_limit_16px") or val.endswith("_report.v1"):
                continue
            if val in forbidden_bone_patterns:
                violations.append(
                    f"{script.name}:{node.lineno}: 出現部分骨名字串字面值 '{val}'，骨骼群組應由 JSON 規格動態推導或由 CLI 參數傳入"
                )
            elif any(fb in val for fb in ["upperarm", "arm_upper"]):
                violations.append(
                    f"{script.name}:{node.lineno}: 出現包含 upperarm/arm_upper 字串 '{val}'，應由 JSON 規格動態推導"
                )

    return violations


class TestNoHardcoding(unittest.TestCase):
    def test_no_general_names(self):
        v = check_general_hardcoding()
        self.assertEqual(len(v), 0, f"發現武將名稱硬編碼違規:\n" + "\n".join(v))

    def test_no_slice_or_range_constants_ge_200(self):
        v = check_slice_and_range_hardcoding()
        self.assertEqual(len(v), 0, f"發現切片或 range >= 200 常數硬編碼違規 (AG-20):\n" + "\n".join(v))

    def test_no_canonical_slots_literal_list(self):
        v = check_no_canonical_slots_literal_list()
        self.assertEqual(len(v), 0, f"發現槽名清單硬編碼違規 (AG-25):\n" + "\n".join(v))

    def test_no_joint_names_in_core_scripts(self):
        v = check_no_joint_names_in_core_scripts()
        self.assertEqual(len(v), 0, f"發現關節名稱硬編碼違規 (AG-26b):\n" + "\n".join(v))

    def test_no_partial_bone_names_in_motion_tool(self):
        v = check_no_partial_bone_names_in_motion_tool()
        self.assertEqual(len(v), 0, f"發現部分骨名字串硬編碼違規 (AG-27b):\n" + "\n".join(v))


def main():
    v1 = check_general_hardcoding()
    v2 = check_slice_and_range_hardcoding()
    v3 = check_no_canonical_slots_literal_list()
    v4 = check_no_joint_names_in_core_scripts()
    v5 = check_no_partial_bone_names_in_motion_tool()
    all_v = v1 + v2 + v3 + v4 + v5
    if all_v:
        print(f"[FAIL] 發現 {len(all_v)} 處硬編碼違規：", file=sys.stderr)
        for v in all_v:
            print(f"  - {v}", file=sys.stderr)
        sys.exit(1)

    print(f"[PASS] 驗證通過：100% 無任何武將名稱、數值 >= 200 像素切片，無 21 槽名字面清單，無 joints 關節名硬編碼，且無部分骨名字面值比對！")


if __name__ == "__main__":
    main()
