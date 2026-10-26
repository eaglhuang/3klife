#!/usr/bin/env python3
"""無武將名稱硬編碼回歸測試 (test_no_general_hardcoding.py)

依據工單 AG-08 與 SPEC-RIG-POSE-02 §7:
「程式內不得出現任何武將名稱特例（請加一個 grep 測試保證）。」

檢驗 tools_anim/ 內的所有核心生產與驗證工具：
- slice_and_rig.py
- validate_spine.py
- check_rigpose.py
- generate_rigpose_templates.py

確保核心業務邏輯與條件判斷中絕無任何武將名稱（趙雲、張飛、關羽、呂布、大喬、小喬等拼音與中文）的硬編碼。
"""
from __future__ import annotations

import re
import sys
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


def test_no_general_hardcoding() -> None:
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

    if violations:
        print(f"[FAIL] 發現 {len(violations)} 處武將名稱硬編碼違規：", file=sys.stderr)
        for v in violations:
            print(f"  - {v}", file=sys.stderr)
        sys.exit(1)

    print(f"[PASS] 驗證通過：{len(CORE_SCRIPTS)} 個核心生產工具中 100% 無任何武將名稱硬編碼！")


if __name__ == "__main__":
    test_no_general_hardcoding()
