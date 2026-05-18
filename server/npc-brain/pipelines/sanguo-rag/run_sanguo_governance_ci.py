from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from sanguo_governance_loader import SanguoGovernanceError, load_governance_ci_entrypoint_policy


PIPELINE_ROOT = Path(__file__).resolve().parent
HARNESS_PATH = PIPELINE_ROOT / "run_sanguo_governance_regression_harness.py"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Sanguo governance strict-local CI entrypoint.")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--governance-ci-policy", default=None, help="Override policy-governance-ci-entrypoint.json path")
    parser.add_argument("--run-profile", default=None, help="Governance harness run profile. Defaults to policy defaultRunProfile.")
    parser.add_argument("--allow-write", action="store_true", help="Allow harness report writes. Default is no-write.")
    parser.add_argument("--output-json", action="store_true", help="Print the full harness payload instead of a compact summary.")
    parser.add_argument("--timeout-seconds", type=int, default=None, help="Subprocess timeout in seconds.")
    return parser.parse_args()


def compact_summary(payload: dict[str, Any], *, harness_exit_code: int) -> dict[str, Any]:
    summary = payload.get("summary") if isinstance(payload.get("summary"), dict) else {}
    golden_snapshot = payload.get("goldenSnapshot") if isinstance(payload.get("goldenSnapshot"), dict) else {}
    return {
        "status": payload.get("status"),
        "harnessExitCode": harness_exit_code,
        "runProfile": summary.get("governanceRunProfileName"),
        "expectedFileCount": summary.get("expectedFileCount"),
        "phasePlanCount": summary.get("phasePlanCount"),
        "missingValidationSummaryKeyCount": summary.get("missingValidationSummaryKeyCount"),
        "governanceDriftFailureCount": summary.get("governanceDriftFailureCount"),
        "snapshotStatus": golden_snapshot.get("status"),
        "snapshotMismatchCount": summary.get("governanceHarnessSnapshotMismatchCount"),
    }


def run_harness(args: argparse.Namespace, policy: dict[str, Any]) -> tuple[int, dict[str, Any] | None, str]:
    run_profile = args.run_profile or str(policy.get("defaultRunProfile") or "strict-local")
    timeout_seconds = args.timeout_seconds or int(policy.get("timeoutSeconds") or 120)
    command = [sys.executable, str(HARNESS_PATH), "--run-profile", run_profile]
    if args.governance_root:
        command.extend(["--governance-root", args.governance_root])
    if not args.allow_write and bool(policy.get("defaultNoWrite", True)):
        command.append("--no-write")
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return 124, None, f"governance harness timed out after {timeout_seconds}s"
    if result.returncode not in {0, 1}:
        message = result.stderr.strip() or result.stdout.strip() or "governance harness failed before JSON payload"
        return result.returncode, None, message
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        message = result.stderr.strip() or f"governance harness emitted invalid JSON at {exc.lineno}:{exc.colno}"
        return 2, None, message
    return result.returncode, payload, ""


def main() -> int:
    args = parse_args()
    try:
        policy = load_governance_ci_entrypoint_policy(
            args.governance_root,
            governance_ci_entrypoint_policy=args.governance_ci_policy,
        )
    except SanguoGovernanceError as exc:
        print(f"[run_sanguo_governance_ci] {exc}", file=sys.stderr)
        return 2
    exit_code, payload, error_message = run_harness(args, policy)
    if payload is None:
        print(f"[run_sanguo_governance_ci] {error_message}", file=sys.stderr)
        return exit_code if exit_code else 1
    if args.output_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(compact_summary(payload, harness_exit_code=exit_code), ensure_ascii=False, indent=2))
    return 0 if payload.get("status") == str(policy.get("successStatus") or "ok") and exit_code == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
