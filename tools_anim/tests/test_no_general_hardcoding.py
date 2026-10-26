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
    """AG-20: 掃描 check_rigpose.py 和 validate_spine.py 中數值 >= 200 的像素切片或 range 常數"""
    target_scripts = [
        TOOLS_DIR / "check_rigpose.py",
        TOOLS_DIR / "validate_spine.py",
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


class TestNoHardcoding(unittest.TestCase):
    def test_no_general_names(self):
        v = check_general_hardcoding()
        self.assertEqual(len(v), 0, f"發現武將名稱硬編碼違規:\n" + "\n".join(v))

    def test_no_slice_or_range_constants_ge_200(self):
        v = check_slice_and_range_hardcoding()
        self.assertEqual(len(v), 0, f"發現切片或 range >= 200 常數硬編碼違規 (AG-20):\n" + "\n".join(v))


def main():
    v1 = check_general_hardcoding()
    v2 = check_slice_and_range_hardcoding()
    all_v = v1 + v2
    if all_v:
        print(f"[FAIL] 發現 {len(all_v)} 處硬編碼違規：", file=sys.stderr)
        for v in all_v:
            print(f"  - {v}", file=sys.stderr)
        sys.exit(1)

    print(f"[PASS] 驗證通過：100% 無任何武將名稱或數值 >= 200 的像素切片/range 硬編碼！")


if __name__ == "__main__":
    main()
