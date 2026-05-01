from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_BACKLOG_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/max-progress-r1-reviewed-b-edit-backlog.jsonl")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/backlog-repair-tasks")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert reviewed B backlog rows into repair task queue artifacts.")
    parser.add_argument("--edit-backlog", default=str(DEFAULT_BACKLOG_PATH))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--round-id", default="current")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


def slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower() or "unknown"


def compact_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "").strip())


def repair_actions(row: dict[str, Any]) -> list[str]:
    missing = {str(item) for item in row.get("missingFields") or []}
    actions: list[str] = []
    if "sourceRefs" in missing or not row.get("sourceRefs"):
        actions.append("verify_source_refs")
    if "generalIds" in missing or not row.get("generalIds"):
        actions.append("resolve_participants")
    if "summary" in missing or not compact_text(row.get("summary")):
        actions.append("rewrite_summary")
    if "location" in missing or not compact_text(row.get("currentLocation")):
        actions.append("fill_location")
    if "relationshipEdges" in missing or not row.get("currentRelationshipEdges"):
        actions.append("repair_relationship_edges")
    if len(row.get("generalIds") or []) >= 8:
        actions.append("narrow_event_boundary")
    if compact_text(row.get("summary")).startswith("：") or compact_text(row.get("summary")).startswith("」"):
        actions.append("sanitize_summary_boundary")
    if not actions:
        actions.append("manual_review_confirm_publishability")
    return actions


def priority_for(actions: list[str], row: dict[str, Any]) -> str:
    high_value_actions = {"verify_source_refs", "resolve_participants", "repair_relationship_edges", "narrow_event_boundary"}
    if high_value_actions.intersection(actions):
        return "high"
    if "fill_location" in actions or "rewrite_summary" in actions:
        return "medium"
    return "low"


def repair_confidence(priority: str, actions: list[str]) -> float:
    if priority == "high":
        base = 0.74
    elif priority == "medium":
        base = 0.67
    else:
        base = 0.61
    if "repair_relationship_edges" in actions:
        base += 0.02
    if "fill_location" in actions:
        base += 0.01
    return round(min(0.84, base), 2)


def task_from_row(row: dict[str, Any], index: int, round_id: str) -> dict[str, Any]:
    actions = repair_actions(row)
    source_refs = list(row.get("sourceRefs") or [])
    focus_general_id = str(row.get("focusGeneralId") or "unknown")
    event_key = str(row.get("eventKey") or row.get("candidateId") or f"row-{index}")
    task_id = f"repair.{round_id}.{focus_general_id}.{slug(event_key)}.{index:04d}"
    return {
        "taskId": task_id,
        "roundId": round_id,
        "focusGeneralId": focus_general_id,
        "priority": priority_for(actions, row),
        "repairActions": actions,
        "eventKey": row.get("eventKey"),
        "candidateId": row.get("candidateId"),
        "chapterNo": row.get("chapterNo"),
        "sourceRefs": source_refs,
        "expandedContextRefs": list(row.get("expandedContextRefs") or []),
        "generalIds": list(row.get("generalIds") or []),
        "currentSummary": row.get("summary"),
        "currentLocation": row.get("currentLocation"),
        "currentRelationshipEdges": list(row.get("currentRelationshipEdges") or []),
        "sourceQuote": row.get("sourceQuote"),
        "missingFields": list(row.get("missingFields") or []),
        "sourcePath": row.get("sourcePath"),
        "suggestedNextStep": "rerun_context_enrichment_for_repair_task",
        "reviewStatus": "repair-task-open",
        "canonicalWrites": False,
    }


def candidate_from_task(task: dict[str, Any]) -> dict[str, Any]:
    confidence = repair_confidence(str(task.get("priority") or "low"), list(task.get("repairActions") or []))
    event_key = str(task.get("taskId") or task.get("eventKey") or "repair-task")
    return {
        "eventId": f"repair-task.{event_key}",
        "eventKey": event_key,
        "candidateId": task.get("taskId"),
        "candidateType": "repair-task",
        "eventType": "repair-task-candidate",
        "chapterNo": task.get("chapterNo"),
        "sourceRefs": list(task.get("sourceRefs") or []),
        "generalIds": list(task.get("generalIds") or []),
        "summary": task.get("currentSummary"),
        "sourceQuote": task.get("sourceQuote"),
        "location": task.get("currentLocation"),
        "relationshipEdges": list(task.get("currentRelationshipEdges") or []),
        "confidence": confidence,
        "reviewStatus": "repair-task-open",
        "repairPriority": task.get("priority"),
        "repairActions": list(task.get("repairActions") or []),
        "missingFields": list(task.get("missingFields") or []),
        "sourcePath": task.get("sourcePath"),
        "focusGeneralId": task.get("focusGeneralId"),
        "suggestedAnswer": "B",
        "answer": None,
    }


def summarize(tasks: list[dict[str, Any]], inputs: dict[str, str]) -> dict[str, Any]:
    action_counts = Counter(action for task in tasks for action in task.get("repairActions") or [])
    priority_counts = Counter(str(task.get("priority")) for task in tasks)
    general_counts = Counter(str(task.get("focusGeneralId")) for task in tasks)
    candidate_count = len(tasks)
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "review-b-backlog-repair-task-queue",
        "canonicalWrites": False,
        "inputs": inputs,
        "taskCount": len(tasks),
        "candidateCount": candidate_count,
        "priorityCounts": dict(sorted(priority_counts.items())),
        "repairActionCounts": dict(sorted(action_counts.items())),
        "topFocusGenerals": dict(general_counts.most_common(24)),
    }


def render_markdown(summary: dict[str, Any], tasks: list[dict[str, Any]]) -> str:
    lines = [
        "# Review B Backlog Repair Tasks",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Canonical Writes: `{summary['canonicalWrites']}`",
        f"- Task Count: `{summary['taskCount']}`",
        f"- Candidate Count: `{summary['candidateCount']}`",
        "",
        "## Priorities",
        "",
    ]
    for priority, count in summary["priorityCounts"].items():
        lines.append(f"- `{priority}`: `{count}`")
    lines.extend(["", "## Repair Actions", ""])
    for action, count in summary["repairActionCounts"].items():
        lines.append(f"- `{action}`: `{count}`")
    lines.extend(["", "## Top Focus Generals", ""])
    for general_id, count in summary["topFocusGenerals"].items():
        lines.append(f"- `{general_id}`: `{count}`")
    lines.extend(["", "## Examples", ""])
    for task in tasks[:24]:
        lines.append(
            f"- `{task['taskId']}` priority=`{task['priority']}` actions=`{','.join(task['repairActions'])}` "
            f"refs=`{','.join(task['sourceRefs'][:3])}` summary=`{compact_text(task.get('currentSummary'))[:80]}`"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    tasks_path = output_root / f"{args.round_id}-repair-tasks.jsonl"
    candidates_path = output_root / f"{args.round_id}-repair-review-candidates.jsonl"
    summary_path = output_root / f"{args.round_id}-repair-tasks-summary.json"
    markdown_path = output_root / f"{args.round_id}-repair-tasks.md"
    candidates_summary_path = output_root / f"{args.round_id}-repair-review-candidates-summary.json"
    candidates_markdown_path = output_root / f"{args.round_id}-repair-review-candidates.md"
    outputs = [tasks_path, candidates_path, summary_path, markdown_path, candidates_summary_path, candidates_markdown_path]
    if not args.overwrite and any(path.exists() for path in outputs):
        raise FileExistsError("Repair task outputs already exist. Re-run with --overwrite.")

    backlog_rows = read_jsonl(Path(args.edit_backlog))
    tasks = [task_from_row(row, index + 1, args.round_id) for index, row in enumerate(backlog_rows)]
    priority_rank = {"high": 0, "medium": 1, "low": 2}
    tasks = sorted(tasks, key=lambda task: (priority_rank.get(str(task.get("priority")), 9), task.get("focusGeneralId") or "", task.get("chapterNo") or 0, task.get("taskId") or ""))
    summary = summarize(tasks, {"editBacklogPath": args.edit_backlog})
    write_jsonl(tasks_path, tasks)
    candidates = [candidate_from_task(task) for task in tasks]
    write_jsonl(candidates_path, candidates)
    write_json(summary_path, summary)
    markdown_path.write_text(render_markdown(summary, tasks), encoding="utf-8")
    write_json(candidates_summary_path, {
        **summary,
        "mode": "repair-review-candidate-feed",
        "candidateCount": len(candidates),
        "inputs": {
            "repairTasksPath": str(args.edit_backlog),
            "repairTaskFeedPath": str(tasks_path),
        },
    })
    candidates_markdown_path.write_text(render_markdown(summary, tasks), encoding="utf-8")
    print(f"[build_backlog_repair_tasks] wrote {tasks_path}")
    print(f"[build_backlog_repair_tasks] wrote {candidates_path}")
    print(f"[build_backlog_repair_tasks] wrote {summary_path}")
    print(f"[build_backlog_repair_tasks] wrote {markdown_path}")
    print(f"[build_backlog_repair_tasks] wrote {candidates_summary_path}")
    print(f"[build_backlog_repair_tasks] wrote {candidates_markdown_path}")
    print(f"[build_backlog_repair_tasks] tasks={summary['taskCount']} priorities={summary['priorityCounts']}")


if __name__ == "__main__":
    main()