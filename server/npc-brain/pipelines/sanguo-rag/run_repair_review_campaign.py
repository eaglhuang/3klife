from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
PIPELINE_ROOT = Path("server/npc-brain/pipelines/sanguo-rag")

DEFAULT_EDIT_BACKLOG_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/repair-refine-r1-reviewed-b-edit-backlog.jsonl"
)
DEFAULT_BASE_EVENTS_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/repair-review-r1-merged-staged-ready-events.jsonl"
)
DEFAULT_BASE_RELATIONSHIP_EVIDENCE_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/repair-review-r1-merged-staged-relationship-evidence.jsonl"
)
DEFAULT_BASE_PROGRESS_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-progress/repair-review-r1-merged.json"
)
DEFAULT_REPAIR_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/backlog-repair-tasks")
DEFAULT_ROUNDS_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-rounds")
DEFAULT_EVENT_SEED_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/event-question-seeds")
DEFAULT_PACKET_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/source-event-packets")
DEFAULT_PROGRESS_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-progress")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a high-yield repair-review campaign over top backlog generals and merge the result into the current baseline."
    )
    parser.add_argument("--round-id", default="repair-review-r2", help="Repair campaign round id")
    parser.add_argument("--edit-backlog", default=str(DEFAULT_EDIT_BACKLOG_PATH), help="Reviewed B backlog JSONL path")
    parser.add_argument("--base-events", default=str(DEFAULT_BASE_EVENTS_PATH), help="Baseline ready-events JSONL path")
    parser.add_argument(
        "--base-relationship-evidence",
        default=str(DEFAULT_BASE_RELATIONSHIP_EVIDENCE_PATH),
        help="Baseline relationship-evidence JSONL path",
    )
    parser.add_argument("--base-progress", default=str(DEFAULT_BASE_PROGRESS_PATH), help="Baseline progress JSON path")
    parser.add_argument("--repair-output-root", default=str(DEFAULT_REPAIR_OUTPUT_ROOT), help="Repair task output root")
    parser.add_argument("--rounds-root", default=str(DEFAULT_ROUNDS_ROOT), help="Knowledge growth rounds root")
    parser.add_argument("--event-seed-root", default=str(DEFAULT_EVENT_SEED_ROOT), help="Event question seed output root")
    parser.add_argument("--packet-root", default=str(DEFAULT_PACKET_ROOT), help="Source packet output root")
    parser.add_argument("--progress-root", default=str(DEFAULT_PROGRESS_ROOT), help="Knowledge progress output root")
    parser.add_argument("--general-id", action="append", default=[], help="Explicit general id to include; can be repeated")
    parser.add_argument("--top-generals", type=int, default=10, help="Top repair backlog generals to include when --general-id is omitted")
    parser.add_argument("--top-per-general", type=int, default=5, help="Maximum questions per general")
    parser.add_argument("--reviewer-preset", default="agent", help="Reviewer preset passed to run_knowledge_growth_round.py")
    parser.add_argument("--reviewer-provider", default="agent-reviewer", help="Reviewer provider passed to run_knowledge_growth_round.py")
    parser.add_argument(
        "--human-question-threshold",
        type=int,
        default=20,
        help="Surface human MCQ only when the manual review count reaches this threshold.",
    )
    parser.add_argument("--step-timeout-seconds", type=int, default=30, help="Step timeout passed to run_knowledge_growth_round.py")
    parser.add_argument(
        "--emit-ready-eval",
        action="store_true",
        help="Ask staging to emit an evaluation-only ready event stream without canonical writes.",
    )
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def script_command(script_name: str, args: list[str]) -> list[str]:
    return [sys.executable, str(REPO_ROOT / PIPELINE_ROOT / script_name), *args]


def command_summary(command: list[str]) -> str:
    return " ".join(command)


def run_command(command: list[str]) -> dict[str, Any]:
    result = subprocess.run(command, cwd=REPO_ROOT, text=True, capture_output=True)
    payload = {
        "command": command_summary(command),
        "returnCode": result.returncode,
        "stdout": result.stdout.strip()[-8000:],
        "stderr": result.stderr.strip()[-8000:],
    }
    if result.returncode != 0:
        raise RuntimeError(json.dumps(payload, ensure_ascii=False, indent=2))
    return payload


def maybe_append_overwrite(command_args: list[str], overwrite: bool) -> list[str]:
    if overwrite:
        command_args.append("--overwrite")
    return command_args


def selected_generals(summary: dict[str, Any], requested_generals: list[str], top_generals: int) -> list[str]:
    if requested_generals:
        seen: set[str] = set()
        rows: list[str] = []
        for general_id in requested_generals:
            value = str(general_id or "").strip()
            if value and value not in seen:
                seen.add(value)
                rows.append(value)
        return rows
    pairs = list((summary.get("topFocusGenerals") or {}).items())
    pairs.sort(key=lambda item: (-int(item[1] or 0), str(item[0] or "")))
    return [str(general_id) for general_id, _count in pairs[: max(top_generals, 0)] if str(general_id or "").strip()]


def existing_round_json_paths(base_progress_path: str) -> list[str]:
    payload = read_json(Path(base_progress_path))
    rows = list(((payload.get("inputs") or {}).get("roundJsonPaths") or []))
    resolved_rows: list[str] = []
    seen: set[str] = set()
    for row in rows:
        raw = Path(str(row))
        resolved = raw if raw.is_absolute() else (REPO_ROOT / raw)
        if not resolved.exists():
            continue
        key = str(resolved.resolve())
        if key in seen:
            continue
        seen.add(key)
        resolved_rows.append(str(raw))
    return resolved_rows


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# Repair Review Campaign",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Round ID: `{summary['roundId']}`",
        f"- Merged Round ID: `{summary['mergedRoundId']}`",
        f"- Selected Generals: `{', '.join(summary['selectedGenerals']) or '-'}`",
        f"- Baseline Overall: `{summary.get('baselineOverallPercent')}`",
        f"- Result Overall: `{summary.get('resultOverallPercent')}`",
        f"- Delta Overall: `{summary.get('deltaOverallPercent')}`",
        f"- Result Relationship Graph: `{summary.get('resultRelationshipGraph')}`",
        f"- Result Event Question Coverage: `{summary.get('resultEventQuestionCoverage')}`",
        f"- Result Review Validation: `{summary.get('resultReviewValidation')}`",
        "",
        "## Outputs",
        "",
    ]
    for key, value in (summary.get("outputs") or {}).items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend([
        "",
        "## Commands",
        "",
    ])
    for command in summary.get("commands") or []:
        lines.extend([
            f"- `{command['name']}` rc=`{command['returnCode']}`",
            f"  - `{command['command']}`",
        ])
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    round_id = args.round_id
    merged_round_id = f"{round_id}-merged"
    repair_output_root = Path(args.repair_output_root)
    rounds_root = Path(args.rounds_root)
    event_seed_root = Path(args.event_seed_root) / merged_round_id
    packet_root = Path(args.packet_root) / merged_round_id
    progress_root = Path(args.progress_root)
    summary_json_path = progress_root / f"{round_id}-campaign-summary.json"
    summary_md_path = progress_root / f"{round_id}-campaign-summary.md"
    if not args.overwrite and (summary_json_path.exists() or summary_md_path.exists()):
        raise FileExistsError("Campaign summary outputs already exist. Re-run with --overwrite.")

    commands: list[dict[str, Any]] = []

    commands.append(
        {
            "name": "build_backlog_repair_tasks",
            **run_command(
                script_command(
                    "build_backlog_repair_tasks.py",
                    maybe_append_overwrite([
                        "--edit-backlog",
                        args.edit_backlog,
                        "--output-root",
                        str(repair_output_root),
                        "--round-id",
                        round_id,
                    ], args.overwrite),
                )
            ),
        }
    )

    repair_summary_path = repair_output_root / f"{round_id}-repair-tasks-summary.json"
    repair_candidates_path = repair_output_root / f"{round_id}-repair-review-candidates.jsonl"
    repair_summary = read_json(repair_summary_path)
    generals = selected_generals(repair_summary, args.general_id, args.top_generals)
    no_repair_generals = not generals

    if no_repair_generals:
        commands.append(
            {
                "name": "run_knowledge_growth_round",
                "command": "skipped: no repair generals selected from backlog summary",
                "returnCode": 0,
                "stdout": "",
                "stderr": "",
            }
        )
    else:
        review_command = [
            "--round-id",
            round_id,
            "--candidates",
            str(repair_candidates_path),
            "--output-root",
            str(rounds_root),
            "--max-generals",
            str(len(generals)),
            "--top-per-general",
            str(args.top_per_general),
            "--reviewer-preset",
            args.reviewer_preset,
            "--reviewer-provider",
            args.reviewer_provider,
            "--human-question-threshold",
            str(args.human_question_threshold),
            "--step-timeout-seconds",
            str(args.step_timeout_seconds),
        ]
        maybe_append_overwrite(review_command, args.overwrite)
        for general_id in generals:
            review_command.extend(["--general-id", general_id])
        commands.append({"name": "run_knowledge_growth_round", **run_command(script_command("run_knowledge_growth_round.py", review_command))})

    review_snapshots_root = rounds_root / f"{round_id}.snapshots"
    stage_args = [
        "--review-root",
        str(review_snapshots_root),
        "--round-id",
        merged_round_id,
        "--base-events",
        args.base_events,
        "--base-relationship-evidence",
        args.base_relationship_evidence,
    ]
    if args.emit_ready_eval:
        stage_args.append("--emit-ready-eval")
    maybe_append_overwrite(stage_args, args.overwrite)
    commands.append(
        {
            "name": "stage_reviewed_a_ready_events",
            **run_command(
                script_command(
                    "stage_reviewed_a_ready_events.py",
                    stage_args,
                )
            ),
        }
    )

    merged_ready_events_path = REPO_ROOT / f"artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/{merged_round_id}-staged-ready-events.jsonl"
    merged_relationships_path = REPO_ROOT / f"artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/{merged_round_id}-staged-relationship-evidence.jsonl"
    ready_eval_events_path = REPO_ROOT / f"artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/{merged_round_id}-ready-eval-events.jsonl"

    commands.append(
        {
            "name": "build_event_question_seed_bank",
            **run_command(
                script_command(
                    "build_event_question_seed_bank.py",
                    maybe_append_overwrite([
                        "--relationship-evidence",
                        str(merged_relationships_path),
                        "--output-root",
                        str(event_seed_root),
                    ], args.overwrite),
                )
            ),
        }
    )
    commands.append(
        {
            "name": "build_source_event_packets",
            **run_command(
                script_command(
                    "build_source_event_packets.py",
                    maybe_append_overwrite([
                        "--relationship-evidence",
                        str(merged_relationships_path),
                        "--output-root",
                        str(packet_root),
                    ], args.overwrite),
                )
            ),
        }
    )

    estimate_args = [
        "--round-id",
        merged_round_id,
        "--ready-events",
        str(merged_ready_events_path),
        "--relationship-evidence",
        str(merged_relationships_path),
        "--event-question-seeds",
        str(event_seed_root / "event-question-seeds.jsonl"),
        "--source-event-packets",
        str(packet_root / "source-event-packets.jsonl"),
        "--rounds-root",
        str(rounds_root),
        "--output-root",
        str(progress_root),
    ]
    maybe_append_overwrite(estimate_args, args.overwrite)
    for batch_path in existing_round_json_paths(args.base_progress):
        estimate_args.extend(["--round-json", batch_path])
    for batch_path in sorted(rounds_root.glob("*.batch.json")):
        estimate_args.extend(["--round-json", str(batch_path)])
    commands.append({"name": "estimate_knowledge_completion", **run_command(script_command("estimate_knowledge_completion.py", estimate_args))})

    baseline_progress = read_json(Path(args.base_progress)).get("completion") or {}
    result_progress_path = progress_root / f"{merged_round_id}.json"
    result_progress = (read_json(result_progress_path).get("completion") or {}) if result_progress_path.exists() else {}
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "repair-review-campaign",
        "canonicalWrites": False,
        "roundId": round_id,
        "mergedRoundId": merged_round_id,
        "selectedGenerals": generals,
        "noRepairGenerals": no_repair_generals,
        "repairTaskSummaryPath": str(repair_summary_path),
        "repairCandidatesPath": str(repair_candidates_path),
        "baselineOverallPercent": baseline_progress.get("overallPercent"),
        "resultOverallPercent": result_progress.get("overallPercent"),
        "deltaOverallPercent": round(float(result_progress.get("overallPercent") or 0.0) - float(baseline_progress.get("overallPercent") or 0.0), 2),
        "resultRelationshipGraph": (result_progress.get("rawScores") or {}).get("relationshipGraph"),
        "resultEventQuestionCoverage": (result_progress.get("rawScores") or {}).get("eventQuestionCoverage"),
        "resultReviewValidation": (result_progress.get("rawScores") or {}).get("reviewValidation"),
        "outputs": {
            "mergedReadyEventsPath": str(merged_ready_events_path),
            "mergedRelationshipEvidencePath": str(merged_relationships_path),
            "readyEvalEventsPath": str(ready_eval_events_path) if args.emit_ready_eval else None,
            "resultProgressPath": str(result_progress_path),
        },
        "commands": commands,
    }
    write_json(summary_json_path, summary)
    summary_md_path.write_text(render_markdown(summary), encoding="utf-8")

    print(f"[run_repair_review_campaign] wrote {summary_json_path}")
    print(f"[run_repair_review_campaign] wrote {summary_md_path}")
    print(
        f"[run_repair_review_campaign] round={round_id} mergedRound={merged_round_id} "
        f"selectedGenerals={len(generals)} deltaOverall={summary['deltaOverallPercent']}"
    )


if __name__ == "__main__":
    main()
