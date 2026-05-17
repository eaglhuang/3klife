from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_root, resolve_repo_root
from sanguo_governance_loader import SanguoGovernanceError, load_three_lane_progress_scheduler_policy

REPO_ROOT = resolve_repo_root(__file__)
PIPELINE_ROOT = pipeline_root(REPO_ROOT)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/progress-advancement")
HUMAN_STOP_REASONS: set[str] = set()
FATAL_STOP_REASONS: set[str] = set()
THREE_LANE_SCHEDULER_POLICY: dict[str, Any] = {}


@dataclass(frozen=True)
class LaneConfig:
    lane_id: str
    lane_name: str
    profile: str
    max_rounds: int
    max_ab_cycles: int


def apply_three_lane_scheduler_governance(policy: dict[str, Any]) -> None:
    global THREE_LANE_SCHEDULER_POLICY, HUMAN_STOP_REASONS, FATAL_STOP_REASONS
    THREE_LANE_SCHEDULER_POLICY = dict(policy)
    stop_policy = policy.get("stopReasonPolicy") if isinstance(policy.get("stopReasonPolicy"), dict) else {}
    HUMAN_STOP_REASONS = {
        str(item)
        for item in stop_policy.get("humanStopReasons") or []
        if str(item).strip()
    }
    FATAL_STOP_REASONS = {
        str(item)
        for item in stop_policy.get("fatalStopReasons") or []
        if str(item).strip()
    }


def scheduler_default_limits() -> dict[str, Any]:
    value = THREE_LANE_SCHEDULER_POLICY.get("defaultLimits")
    return value if isinstance(value, dict) else {}


def scheduler_default_reviewer() -> dict[str, Any]:
    value = THREE_LANE_SCHEDULER_POLICY.get("defaultReviewer")
    return value if isinstance(value, dict) else {}


def scheduler_stop_policy() -> dict[str, Any]:
    value = THREE_LANE_SCHEDULER_POLICY.get("stopReasonPolicy")
    return value if isinstance(value, dict) else {}


def scheduler_int(cli_value: int | None, key: str, fallback: int) -> int:
    if cli_value is not None:
        return cli_value
    try:
        return int(scheduler_default_limits().get(key, fallback))
    except (TypeError, ValueError):
        return fallback


def scheduler_text(cli_value: str | None, section: dict[str, Any], key: str, fallback: str) -> str:
    if cli_value is not None and str(cli_value).strip():
        return str(cli_value)
    value = str(section.get(key) or "").strip()
    return value or fallback


def scheduler_next_action(key: str, fallback: str) -> str:
    value = str(scheduler_stop_policy().get(key) or "").strip()
    return value or fallback


def scheduler_completed_stop_reason() -> str:
    value = str(scheduler_stop_policy().get("completedStopReason") or "").strip()
    return value or "completed-three-lanes"


def apply_scheduler_arg_defaults(args: argparse.Namespace) -> None:
    args.output_root = str(args.output_root or THREE_LANE_SCHEDULER_POLICY.get("defaultOutputRoot") or DEFAULT_OUTPUT_ROOT)
    args.pending_review_limit = scheduler_int(args.pending_review_limit, "pendingReviewLimit", 20)
    args.step_timeout_seconds = scheduler_int(args.step_timeout_seconds, "stepTimeoutSeconds", 30)
    args.reviewer_preset = scheduler_text(args.reviewer_preset, scheduler_default_reviewer(), "preset", "agent")
    args.reviewer_provider = scheduler_text(args.reviewer_provider, scheduler_default_reviewer(), "provider", "agent-reviewer")


def scheduler_lane_rows() -> list[dict[str, Any]]:
    rows = THREE_LANE_SCHEDULER_POLICY.get("laneOrder")
    if isinstance(rows, list) and rows:
        return [row for row in rows if isinstance(row, dict)]
    return [
        {"laneId": "bulk", "laneName": "Bulk Coverage Lane", "profile": "sweep", "maxRounds": 2, "maxAbCycles": 1},
        {"laneId": "precision", "laneName": "ABAB Precision Lane", "profile": "precision", "maxRounds": 2, "maxAbCycles": 2},
        {"laneId": "promotion", "laneName": "Promotion Lane", "profile": "promotion-eval", "maxRounds": 1, "maxAbCycles": 1},
    ]


def lane_cli_override(args: argparse.Namespace, lane_id: str, field: str) -> int | None:
    key = f"{lane_id}_{field}"
    value = getattr(args, key, None)
    return value if value is not None else None


def lane_int(row: dict[str, Any], args: argparse.Namespace, field: str, fallback: int) -> int:
    cli_value = lane_cli_override(args, str(row.get("laneId") or ""), "max_rounds" if field == "maxRounds" else "max_ab_cycles")
    if cli_value is not None:
        return max(int(cli_value), 1)
    try:
        return max(int(row.get(field, fallback)), 1)
    except (TypeError, ValueError):
        return fallback


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run Sanguo progress advancement with fixed lane order: "
            "Bulk Coverage (sweep) -> ABAB Precision (precision) -> Promotion (promotion-eval)."
        )
    )
    parser.add_argument("--run-id", default=None, help="Scheduler run id. Defaults to three-lane-<UTC>.")
    parser.add_argument("--output-root", default=None, help="Output root shared by all lane runs. Defaults to governance policy.")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--three-lane-scheduler-policy", default=None, help="Override policy-three-lane-progress-scheduler.json path")
    parser.add_argument("--baseline-manifest", default=None, help="Initial baseline manifest path.")
    parser.add_argument("--pending-review-limit", type=int, default=None, help="Human gate threshold for pending review. Defaults to governance policy.")
    parser.add_argument("--reviewer-preset", default=None, help="Reviewer preset passed to lane runs. Defaults to governance policy.")
    parser.add_argument("--reviewer-provider", default=None, help="Reviewer provider passed to lane runs. Defaults to governance policy.")
    parser.add_argument("--step-timeout-seconds", type=int, default=None, help="Step timeout passed to lane runs. Defaults to governance policy.")
    parser.add_argument("--top-generals", type=int, default=None, help="Optional override passed to lane runs.")
    parser.add_argument("--top-per-general", type=int, default=None, help="Optional override passed to lane runs.")
    parser.add_argument("--max-wall-time-minutes", type=float, default=None, help="Optional per-lane wall-time limit.")
    parser.add_argument("--general-id", action="append", default=[], help="Optional focus general id; repeatable.")
    parser.add_argument("--bulk-max-rounds", type=int, default=None, help="Bulk lane max rounds. Defaults to governance policy.")
    parser.add_argument("--bulk-max-ab-cycles", type=int, default=None, help="Bulk lane max AB cycles. Defaults to governance policy.")
    parser.add_argument("--precision-max-rounds", type=int, default=None, help="Precision lane max rounds. Defaults to governance policy.")
    parser.add_argument("--precision-max-ab-cycles", type=int, default=None, help="Precision lane max AB cycles. Defaults to governance policy.")
    parser.add_argument("--promotion-max-rounds", type=int, default=None, help="Promotion lane max rounds. Defaults to governance policy.")
    parser.add_argument("--promotion-max-ab-cycles", type=int, default=None, help="Promotion lane max AB cycles. Defaults to governance policy.")
    parser.add_argument("--continue-on-failure", action="store_true", help="Continue to next lane even if current lane fails.")
    parser.add_argument("--overwrite", action="store_true", help="Pass --overwrite to lane runs.")
    parser.add_argument("--dry-run", action="store_true", help="Pass --dry-run to lane runs.")
    return parser.parse_args()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve()))
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def lane_configs(args: argparse.Namespace) -> list[LaneConfig]:
    lanes: list[LaneConfig] = []
    for row in scheduler_lane_rows():
        lane_id = str(row.get("laneId") or "").strip()
        lane_name = str(row.get("laneName") or lane_id).strip()
        profile = str(row.get("profile") or "").strip()
        if not lane_id or not profile:
            continue
        lanes.append(
            LaneConfig(
                lane_id=lane_id,
                lane_name=lane_name or lane_id,
                profile=profile,
                max_rounds=lane_int(row, args, "maxRounds", 1),
                max_ab_cycles=lane_int(row, args, "maxAbCycles", 1),
            )
        )
    return lanes


def lane_command(args: argparse.Namespace, lane: LaneConfig, lane_run_id: str, baseline_manifest: str | None) -> list[str]:
    command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "run_progress_advancement_loop.py").resolve()),
        "--run-id",
        lane_run_id,
        "--output-root",
        args.output_root,
        "--profile",
        lane.profile,
        "--max-rounds",
        str(lane.max_rounds),
        "--max-ab-cycles",
        str(lane.max_ab_cycles),
        "--pending-review-limit",
        str(max(args.pending_review_limit, 1)),
        "--reviewer-preset",
        args.reviewer_preset,
        "--reviewer-provider",
        args.reviewer_provider,
        "--step-timeout-seconds",
        str(max(args.step_timeout_seconds, 1)),
    ]
    if baseline_manifest:
        command.extend(["--baseline-manifest", baseline_manifest])
    if args.max_wall_time_minutes is not None:
        command.extend(["--max-wall-time-minutes", str(args.max_wall_time_minutes)])
    if args.top_generals is not None:
        command.extend(["--top-generals", str(args.top_generals)])
    if args.top_per_general is not None:
        command.extend(["--top-per-general", str(args.top_per_general)])
    for general_id in args.general_id:
        value = str(general_id or "").strip()
        if value:
            command.extend(["--general-id", value])
    if args.overwrite:
        command.append("--overwrite")
    if args.dry_run:
        command.append("--dry-run")
    return command


def command_summary(command: list[str]) -> str:
    return " ".join(command)


def run_lane(args: argparse.Namespace, lane: LaneConfig, baseline_manifest: str | None) -> dict[str, Any]:
    lane_run_id = f"{args.run_id}-{lane.lane_id}"
    command = lane_command(args, lane, lane_run_id, baseline_manifest)
    result = subprocess.run(command, cwd=REPO_ROOT, text=True, capture_output=True)

    lane_run_root = (REPO_ROOT / Path(args.output_root) / lane_run_id).resolve()
    summary_path = lane_run_root / "progress-advancement-summary.json"
    summary = read_json(summary_path)

    return {
        "laneId": lane.lane_id,
        "laneName": lane.lane_name,
        "profile": lane.profile,
        "runId": lane_run_id,
        "runRoot": repo_relative(lane_run_root),
        "baselineManifestInput": baseline_manifest,
        "command": command_summary(command),
        "returnCode": result.returncode,
        "stdout": result.stdout.strip()[-8000:],
        "stderr": result.stderr.strip()[-8000:],
        "summaryPath": repo_relative(summary_path),
        "summaryExists": summary_path.exists(),
        "summary": summary,
    }


def summary_baseline_manifest(summary: dict[str, Any]) -> str | None:
    value = summary.get("baselineManifestOutputPath")
    if not value:
        return None
    path = resolve_path(value)
    if not path.exists():
        return None
    return repo_relative(path)


def should_stop_for_human_gate(lane_result: dict[str, Any], pending_limit: int) -> bool:
    summary = lane_result.get("summary") or {}
    stop_reason = str(summary.get("stopReason") or "").strip()
    if stop_reason in HUMAN_STOP_REASONS:
        return True
    pending_count = summary.get("pendingReviewCount")
    try:
        return int(pending_count) >= max(pending_limit, 1)
    except (TypeError, ValueError):
        return False


def should_stop_for_fatal(lane_result: dict[str, Any]) -> bool:
    if int(lane_result.get("returnCode") or 0) != 0:
        return True
    summary = lane_result.get("summary") or {}
    stop_reason = str(summary.get("stopReason") or "").strip()
    return stop_reason in FATAL_STOP_REASONS


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Three-Lane Progress Scheduler",
        "",
        f"- Run ID: `{report['runId']}`",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        f"- Stop Reason: `{report.get('stopReason') or '-'}`",
        f"- Next Action: {report.get('nextAction') or '-'}",
        f"- Final Baseline Manifest: `{report.get('finalBaselineManifest') or '-'}`",
        "",
        "## Lanes",
        "",
        "| Lane | Profile | Return | Stop Reason | Pending | Pilot Pending | Next Route |",
        "|---|---|---:|---|---:|---:|---|",
    ]
    for lane in report.get("lanes") or []:
        summary = lane.get("summary") or {}
        lines.append(
            "| {lane} | `{profile}` | `{rc}` | `{stop}` | `{pending}` | `{pilot}` | `{route}` |".format(
                lane=lane.get("laneName"),
                profile=lane.get("profile"),
                rc=lane.get("returnCode"),
                stop=summary.get("stopReason") or "-",
                pending=summary.get("pendingReviewCount") if summary.get("pendingReviewCount") is not None else "-",
                pilot=summary.get("pilotPendingReviewCount") if summary.get("pilotPendingReviewCount") is not None else "-",
                route=summary.get("nextRoute") or "-",
            )
        )
    lines.extend(["", "## Lane Summaries", ""])
    for lane in report.get("lanes") or []:
        lines.extend(
            [
                f"### `{lane.get('runId')}`",
                f"- Lane: `{lane.get('laneName')}` / profile=`{lane.get('profile')}`",
                f"- Summary: `{lane.get('summaryPath')}`",
                f"- Command: `{lane.get('command')}`",
                f"- Return Code: `{lane.get('returnCode')}`",
                "",
            ]
        )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    scheduler_policy = load_three_lane_progress_scheduler_policy(
        args.governance_root,
        three_lane_scheduler_policy=args.three_lane_scheduler_policy,
    )
    apply_three_lane_scheduler_governance(scheduler_policy)
    apply_scheduler_arg_defaults(args)
    args.run_id = args.run_id or f"three-lane-{utc_stamp()}"
    output_root = Path(args.output_root)
    scheduler_root = (REPO_ROOT / output_root / args.run_id).resolve()
    scheduler_root.mkdir(parents=True, exist_ok=True)

    current_baseline_manifest = args.baseline_manifest
    lanes_report: list[dict[str, Any]] = []
    stop_reason: str | None = None
    next_action = scheduler_next_action("completedNextAction", "completed all lanes")

    for lane in lane_configs(args):
        lane_result = run_lane(args, lane, current_baseline_manifest)
        lanes_report.append(lane_result)
        summary = lane_result.get("summary") or {}
        next_manifest = summary_baseline_manifest(summary)
        if next_manifest:
            current_baseline_manifest = next_manifest

        if should_stop_for_human_gate(lane_result, args.pending_review_limit):
            stop_reason = f"{lane.lane_id}-human-gate"
            next_action = scheduler_next_action("humanGateNextAction", "pending review reached threshold; switch to human MCQ batch first")
            break

        if should_stop_for_fatal(lane_result):
            stop_reason = f"{lane.lane_id}-fatal-stop"
            next_action = scheduler_next_action("fatalStopNextAction", "lane failed or fatal stop reason detected; inspect lane summary stderr before continuing")
            if not args.continue_on_failure:
                break

    if stop_reason is None:
        stop_reason = scheduler_completed_stop_reason()

    payload = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "three-lane-progress-scheduler",
        "canonicalWrites": False,
        "runId": args.run_id,
        "outputRoot": args.output_root,
        "initialBaselineManifest": args.baseline_manifest,
        "finalBaselineManifest": current_baseline_manifest,
        "pendingReviewLimit": max(args.pending_review_limit, 1),
        "stopReason": stop_reason,
        "nextAction": next_action,
        "lanes": lanes_report,
    }

    json_path = scheduler_root / "three-lane-progress-summary.json"
    md_path = scheduler_root / "three-lane-progress-summary.md"
    write_json(json_path, payload)
    md_path.write_text(render_markdown(payload), encoding="utf-8")

    print(f"[run_three_lane_progress_scheduler] wrote {json_path}")
    print(f"[run_three_lane_progress_scheduler] wrote {md_path}")
    print(
        "[run_three_lane_progress_scheduler] "
        f"runId={args.run_id} lanes={len(lanes_report)} stopReason={stop_reason} "
        f"finalBaselineManifest={current_baseline_manifest or '-'}"
    )


if __name__ == "__main__":
    try:
        main()
    except SanguoGovernanceError as exc:
        print(f"[run_three_lane_progress_scheduler] governance error: {exc}", file=sys.stderr)
        raise SystemExit(2) from None
