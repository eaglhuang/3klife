from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
TOOL_TO_SCRIPT = {
    "capture": REPO_ROOT / "tools_node" / "capture-ui-screens.js",
    "vfx": REPO_ROOT / "tools_node" / "run-vfx-browser-qa.js",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Two-layer UI/browser QA launcher: precheck first, screenshot second."
    )
    parser.add_argument("--tool", choices=sorted(TOOL_TO_SCRIPT.keys()), default="capture")
    parser.add_argument(
        "tool_args",
        nargs=argparse.REMAINDER,
        help="Arguments passed through to the target QA command. Put them after '--'.",
    )
    return parser.parse_args()


def resolve_node() -> str:
    node_bin = shutil.which("node")
    if not node_bin:
        raise RuntimeError("node executable not found in PATH.")
    return node_bin


def parse_json_from_output(text: str) -> dict[str, Any] | None:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    for line in reversed(lines):
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            return payload
    return None


def ensure_flag(args: list[str], flag: str, value: str | None = None) -> list[str]:
    if flag in args:
        return args[:]
    updated = args[:]
    updated.append(flag)
    if value is not None:
        updated.append(value)
    return updated


def strip_flag(args: list[str], flag: str, takes_value: bool = False) -> list[str]:
    result: list[str] = []
    index = 0
    while index < len(args):
        if args[index] != flag:
            result.append(args[index])
            index += 1
            continue
        index += 2 if takes_value else 1
    return result


def normalize_tool_args(raw_args: list[str]) -> list[str]:
    args = raw_args[:]
    if args and args[0] == "--":
        args = args[1:]
    return args


def run_capture(node_bin: str, script_path: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [node_bin, str(script_path), *args],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )


def run_inherit(node_bin: str, script_path: Path, args: list[str]) -> int:
    completed = subprocess.run(
        [node_bin, str(script_path), *args],
        cwd=str(REPO_ROOT),
        check=False,
    )
    return int(completed.returncode)


def main() -> None:
    parsed = parse_args()
    script_path = TOOL_TO_SCRIPT[parsed.tool]
    if not script_path.exists():
        raise FileNotFoundError(f"script not found for tool={parsed.tool}: {script_path}")

    node_bin = resolve_node()
    forwarded_args = normalize_tool_args(parsed.tool_args)
    precheck_args = ensure_flag(ensure_flag(forwarded_args, "--json"), "--precheck-only")

    precheck = run_capture(node_bin, script_path, precheck_args)
    payload = parse_json_from_output(precheck.stdout)
    if not payload or not isinstance(payload.get("ok"), bool):
        print("[run_two_layer_ui_browser_qa] failed to parse precheck JSON payload", file=sys.stderr)
        if precheck.stdout:
            print(precheck.stdout.rstrip(), file=sys.stderr)
        if precheck.stderr:
            print(precheck.stderr.rstrip(), file=sys.stderr)
        sys.exit(2)

    ok = bool(payload.get("ok"))
    print(f"[run_two_layer_ui_browser_qa] precheck ok={str(ok).lower()}")
    if not ok:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        sys.exit(2)

    execute_args = forwarded_args[:]
    execute_args = strip_flag(execute_args, "--precheck-only")
    execute_args = strip_flag(execute_args, "--precheck", takes_value=True)
    execute_args = strip_flag(execute_args, "--json")
    execute_args = strip_flag(execute_args, "--precheckTimeout", takes_value=True)
    exit_code = run_inherit(node_bin, script_path, execute_args)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
