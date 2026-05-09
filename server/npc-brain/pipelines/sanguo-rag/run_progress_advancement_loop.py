from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
PIPELINE_ROOT = Path("server/npc-brain/pipelines/sanguo-rag")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/progress-advancement")
DEFAULT_REVIEW_QUEUE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/review-queue.todo.json")
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

ROOT_CAUSE_GROUPS = [
    "identity ambiguity",
    "location gap",
    "relationship edge/type",
    "event boundary",
    "missing source evidence",
    "schema/tool gap",
    "external source needed",
]

EVENT_REVIEW_SYNONYMS = {
    "A": "A",
    "ACCEPT": "A",
    "B": "B",
    "ACCEPT-WITH-EDITS": "B",
    "ACCEPT_WITH_EDITS": "B",
    "C": "C",
    "REJECT": "C",
    "D": "D",
    "DEFER": "D",
}


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path | None) -> Path:
    if path_text is None:
        raise ValueError("path_text cannot be None")
    raw_path = Path(path_text)
    if raw_path.is_absolute():
        return raw_path.resolve()
    return (REPO_ROOT / raw_path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rows.append(json.loads(line))
    return rows


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def command_text(command: list[str]) -> str:
    return " ".join(command)


def script_command(script_name: str, args: list[str]) -> list[str]:
    return [sys.executable, str((REPO_ROOT / PIPELINE_ROOT / script_name).resolve()), *args]


def run_command(command: list[str], dry_run: bool) -> dict[str, Any]:
    if dry_run:
        return {
            "command": command_text(command),
            "returnCode": 0,
            "dryRun": True,
            "stdout": "",
            "stderr": "",
        }

    result = subprocess.run(command, cwd=REPO_ROOT, text=True, capture_output=True)
    return {
        "command": command_text(command),
        "returnCode": result.returncode,
        "dryRun": False,
        "stdout": result.stdout.strip()[-8000:],
        "stderr": result.stderr.strip()[-8000:],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run an outer ABAB-style Sanguo RAG progress advancement loop over repair-review campaign rounds."
    )
    parser.add_argument("--run-id", default=None, help="Progress advancement run id. Defaults to progress-advancement-<UTC>.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Progress advancement output root.")
    parser.add_argument("--baseline-manifest", default=None, help="Optional baseline manifest JSON to resume from the current best paths.")
    parser.add_argument("--profile", choices=["sweep", "precision", "promotion-eval"], default="precision", help="Execution profile for coverage, precision, or promotion evaluation.")
    parser.add_argument("--optimization-target", default="safe-local-readiness", help="Human-readable target recorded in summary and baseline manifest.")
    parser.add_argument("--max-rounds", type=int, default=3, help="Maximum automatic A rounds to run before stopping.")
    parser.add_argument("--max-ab-cycles", type=int, default=3, help="Maximum A->B->A cycle count.")
    parser.add_argument("--edit-backlog", default=str(DEFAULT_EDIT_BACKLOG_PATH), help="Initial reviewed B edit backlog JSONL path.")
    parser.add_argument("--base-events", default=str(DEFAULT_BASE_EVENTS_PATH), help="Initial merged ready-events JSONL path.")
    parser.add_argument(
        "--base-relationship-evidence",
        default=str(DEFAULT_BASE_RELATIONSHIP_EVIDENCE_PATH),
        help="Initial merged relationship-evidence JSONL path.",
    )
    parser.add_argument("--base-progress", default=str(DEFAULT_BASE_PROGRESS_PATH), help="Initial merged progress JSON path.")
    parser.add_argument("--top-generals", type=int, default=5, help="Top repair backlog generals per A round.")
    parser.add_argument("--top-per-general", type=int, default=5, help="Maximum questions per general.")
    parser.add_argument("--general-id", action="append", default=[], help="Explicit general id to include; can be repeated.")
    parser.add_argument("--reviewer-preset", default="agent", help="Reviewer preset passed to run_repair_review_campaign.py.")
    parser.add_argument("--reviewer-provider", default="agent-reviewer", help="Reviewer provider passed to run_repair_review_campaign.py.")
    parser.add_argument("--step-timeout-seconds", type=int, default=30, help="Step timeout passed to repair campaign.")
    parser.add_argument("--no-improvement-threshold", type=float, default=0.05, help="Delta overall below this is weak improvement.")
    parser.add_argument("--no-improvement-patience", type=int, default=2, help="Stop after this many weak-improvement rounds.")
    parser.add_argument("--pending-review-limit", type=int, default=15, help="Route to B when event-review pending count exceeds this.")
    parser.add_argument("--same-residual-repeat-limit", type=int, default=2, help="Route to C when the same residual repeats this many A rounds.")
    parser.add_argument("--review-batch-size", type=int, default=10, help="Maximum event-review items to emit into one B review batch artifact.")
    parser.add_argument("--review-decisions", default=None, help="Optional JSON file with B review decisions to apply to the latest batch.")
    parser.add_argument("--failure-rate-limit", type=float, default=0.2, help="Stop when command failure rate exceeds this.")
    parser.add_argument("--review-queue", default=str(DEFAULT_REVIEW_QUEUE_PATH), help="ETL pilot review queue JSON path.")
    parser.add_argument("--emit-ready-eval", action="store_true", help="Emit pilot-readable evaluation-only ready events for accepted review candidates.")
    parser.add_argument("--runtime-readiness", choices=["touched", "final", "off"], default="off", help="Run runtime readiness matrix after ABAB, scoped to touched generals or final cohort.")
    parser.add_argument("--max-wall-time-minutes", type=float, default=None, help="Stop before starting a new A round when this wall-clock limit is exceeded.")
    parser.add_argument("--overwrite", action="store_true", help="Pass --overwrite to inner campaign and B merge steps.")
    parser.add_argument("--dry-run", action="store_true", help="Write plan/summary artifacts without executing campaign rounds.")
    return parser.parse_args()


def pending_review_count(path: Path) -> int:
    payload = read_json(path)
    questions = list((payload or {}).get("questions") or [])
    if not questions:
        return 0
    return sum(1 for question in questions if not question.get("answer"))


def jsonl_record_count(path_text: str | Path) -> int | None:
    path = resolve_path(path_text)
    if not path.exists():
        return None
    count = 0
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                count += 1
    return count


def existing_round_json_paths(base_progress_path: str | Path) -> list[str]:
    payload = read_json(resolve_path(base_progress_path))
    rows = list((((payload or {}).get("inputs") or {}).get("roundJsonPaths") or []))
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


def resolve_baseline_paths(base_paths: dict[str, str | Path]) -> dict[str, str]:
    return {key: repo_relative(resolve_path(value)) for key, value in base_paths.items()}


def maybe_append_overwrite(command_args: list[str], overwrite: bool) -> list[str]:
    if overwrite:
        command_args.append("--overwrite")
    return command_args


def apply_profile_defaults(args: argparse.Namespace) -> None:
    if args.profile == "sweep":
        if args.max_rounds == 3:
            args.max_rounds = 2
        if args.max_ab_cycles == 3:
            args.max_ab_cycles = 1
        if args.top_generals == 5:
            args.top_generals = 12
        if args.top_per_general == 5:
            args.top_per_general = 3
        if args.review_batch_size == 10:
            args.review_batch_size = 20
    elif args.profile == "promotion-eval":
        if args.max_rounds == 3:
            args.max_rounds = 1
        if args.max_ab_cycles == 3:
            args.max_ab_cycles = 1
        if args.top_per_general == 5:
            args.top_per_general = 3
        args.emit_ready_eval = True
        if args.runtime_readiness == "off":
            args.runtime_readiness = "final"


def load_baseline_manifest(path_text: str | None) -> dict[str, Any]:
    if not path_text:
        return {}
    path = resolve_path(path_text)
    if not path.exists():
        raise FileNotFoundError(f"Baseline manifest not found: {path}")
    payload = read_json(path)
    if not isinstance(payload, dict):
        raise ValueError(f"Baseline manifest must be a JSON object: {path}")
    return payload


def _manifest_path_value(paths: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = paths.get(key)
        if value:
            return str(value)
    return None


def baseline_paths_from_manifest(manifest: dict[str, Any]) -> dict[str, str]:
    paths = manifest.get("paths") if isinstance(manifest.get("paths"), dict) else manifest
    if not isinstance(paths, dict):
        return {}
    mapping = {
        "editBacklog": _manifest_path_value(paths, "editBacklog", "editBacklogPath", "reviewedBEditBacklog"),
        "baseEvents": _manifest_path_value(paths, "baseEvents", "readyEvents", "readyEventsPath", "baseEventsPath"),
        "baseRelationshipEvidence": _manifest_path_value(
            paths,
            "baseRelationshipEvidence",
            "relationshipEvidence",
            "relationshipEvidencePath",
            "baseRelationshipEvidencePath",
        ),
        "baseProgress": _manifest_path_value(paths, "baseProgress", "progress", "progressPath", "baseProgressPath"),
        "readyEvalEvents": _manifest_path_value(paths, "readyEvalEvents", "readyEvalEventsPath"),
        "pilotReport": _manifest_path_value(paths, "pilotReport", "pilotReportPath"),
        "runtimeReadiness": _manifest_path_value(paths, "runtimeReadiness", "runtimeReadinessPath", "runtimeReadinessMatrix"),
    }
    return {key: value for key, value in mapping.items() if value}


def wall_time_exceeded(started_at: float, max_minutes: float | None) -> bool:
    if max_minutes is None or max_minutes <= 0:
        return False
    return (time.monotonic() - started_at) >= (max_minutes * 60.0)


def round_output_paths(run_root: Path, round_id: str) -> dict[str, Path]:
    repair_root = run_root / "repair-review"
    progress_root = repair_root / "knowledge-growth-progress"
    merged_round_id = f"{round_id}-merged"
    core_progress_root = REPO_ROOT / "artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress"
    return {
        "repairRoot": repair_root,
        "progressRoot": progress_root,
        "campaignSummary": progress_root / f"{round_id}-campaign-summary.json",
        "baseProgress": progress_root / f"{merged_round_id}.json",
        "baseEvents": core_progress_root / f"{merged_round_id}-staged-ready-events.jsonl",
        "baseRelationshipEvidence": core_progress_root / f"{merged_round_id}-staged-relationship-evidence.jsonl",
        "readyEvalEvents": core_progress_root / f"{merged_round_id}-ready-eval-events.jsonl",
        "editBacklog": core_progress_root / f"{merged_round_id}-reviewed-b-edit-backlog.jsonl",
        "roundBatch": repair_root / "knowledge-growth-rounds" / f"{round_id}.batch.json",
        "reviewSnapshotRoot": repair_root / "knowledge-growth-rounds" / f"{round_id}.snapshots",
    }


def b_review_output_paths(run_root: Path, source_round_id: str, review_index: int) -> dict[str, Path]:
    b_round_id = f"{source_round_id}-b{review_index}"
    b_root = run_root / "b-review"
    stage_root = b_root / "core-person-progress"
    progress_root = b_root / "knowledge-growth-progress"
    return {
        "bRoot": b_root,
        "bRoundId": Path(b_round_id),
        "stageRoot": stage_root,
        "progressRoot": progress_root,
        "summaryJson": b_root / f"{b_round_id}-summary.json",
        "summaryMd": b_root / f"{b_round_id}-summary.md",
        "baseEvents": stage_root / f"{b_round_id}-staged-ready-events.jsonl",
        "baseRelationshipEvidence": stage_root / f"{b_round_id}-staged-relationship-evidence.jsonl",
        "readyEvalEvents": stage_root / f"{b_round_id}-ready-eval-events.jsonl",
        "editBacklog": stage_root / f"{b_round_id}-reviewed-b-edit-backlog.jsonl",
        "baseProgress": progress_root / f"{b_round_id}.json",
        "eventSeedRoot": b_root / "event-question-seeds" / b_round_id,
        "packetRoot": b_root / "source-event-packets" / b_round_id,
    }


def build_campaign_command(
    args: argparse.Namespace,
    run_root: Path,
    round_index: int,
    base_paths: dict[str, str | Path],
) -> tuple[str, list[str], Path, dict[str, Path]]:
    round_id = f"{args.run_id}-a{round_index}"
    outputs = round_output_paths(run_root, round_id)
    resolved_base_paths = resolve_baseline_paths(base_paths)
    command = [
        sys.executable,
        str((REPO_ROOT / PIPELINE_ROOT / "run_repair_review_campaign.py").resolve()),
        "--round-id",
        round_id,
        "--edit-backlog",
        resolved_base_paths["editBacklog"],
        "--base-events",
        resolved_base_paths["baseEvents"],
        "--base-relationship-evidence",
        resolved_base_paths["baseRelationshipEvidence"],
        "--base-progress",
        resolved_base_paths["baseProgress"],
        "--repair-output-root",
        repo_relative(outputs["repairRoot"] / "backlog-repair-tasks"),
        "--rounds-root",
        repo_relative(outputs["repairRoot"] / "knowledge-growth-rounds"),
        "--event-seed-root",
        repo_relative(outputs["repairRoot"] / "event-question-seeds"),
        "--packet-root",
        repo_relative(outputs["repairRoot"] / "source-event-packets"),
        "--progress-root",
        repo_relative(outputs["progressRoot"]),
        "--top-generals",
        str(max(args.top_generals, 0)),
        "--top-per-general",
        str(max(args.top_per_general, 1)),
        "--reviewer-preset",
        args.reviewer_preset,
        "--reviewer-provider",
        args.reviewer_provider,
        "--step-timeout-seconds",
        str(max(args.step_timeout_seconds, 1)),
    ]
    for general_id in args.general_id:
        command.extend(["--general-id", str(general_id)])
    if args.emit_ready_eval:
        command.append("--emit-ready-eval")
    if args.overwrite:
        command.append("--overwrite")
    return round_id, command, outputs["campaignSummary"], outputs


def normalize_allowed_answers(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return {str(code).strip().upper(): label for code, label in raw.items() if str(code).strip()}
    if isinstance(raw, list):
        normalized: dict[str, Any] = {}
        for item in raw:
            text = str(item or "").strip()
            if text:
                normalized[text.upper()] = text
        return normalized
    return {}


def normalize_review_answer(raw_answer: Any, allowed_answers: dict[str, Any]) -> str | None:
    text = str(raw_answer or "").strip()
    if not text:
        return None
    upper = text.upper()
    synonym = EVENT_REVIEW_SYNONYMS.get(upper)
    if synonym is not None:
        return synonym
    if upper in allowed_answers:
        return upper
    lowered = text.lower()
    for code, label in allowed_answers.items():
        if lowered == str(label or "").strip().lower():
            return code
    return None


def normalize_review_decisions(response: Any) -> list[dict[str, Any]]:
    if response is None:
        return []
    if isinstance(response, dict):
        if isinstance(response.get("decisions"), list):
            return [item for item in response["decisions"] if isinstance(item, dict)]
        if response.get("candidateId") or response.get("eventKey"):
            return [response]
        return []
    if isinstance(response, list):
        return [item for item in response if isinstance(item, dict)]
    return []


def apply_review_decisions_to_questions(questions: list[dict[str, Any]], decisions: list[dict[str, Any]]) -> int:
    decision_map: dict[str, dict[str, Any]] = {}
    for decision in decisions:
        for key in (decision.get("candidateId"), decision.get("eventKey")):
            text = str(key or "").strip()
            if text:
                decision_map[text] = decision

    updated_count = 0
    for question in questions:
        matched_decision = None
        for key in (question.get("candidateId"), question.get("eventKey")):
            text = str(key or "").strip()
            if text and text in decision_map:
                matched_decision = decision_map[text]
                break
        if matched_decision is None:
            continue

        answer = normalize_review_answer(
            matched_decision.get("answer") or matched_decision.get("decision"),
            normalize_allowed_answers(question.get("allowedAnswers")),
        )
        if answer is None:
            continue

        question["answer"] = answer
        question["reviewedAt"] = utc_now()
        notes = matched_decision.get("notes") or matched_decision.get("reason")
        if notes:
            question["humanReviewNotes"] = str(notes)
        edits = matched_decision.get("edits")
        if isinstance(edits, dict):
            merged_edits = dict(question.get("edits") or {})
            merged_edits.update(edits)
            question["edits"] = merged_edits
        updated_count += 1
    return updated_count


def review_answer_code(question: dict[str, Any]) -> str | None:
    return normalize_review_answer(
        question.get("answer") or question.get("suggestedAnswer"),
        normalize_allowed_answers(question.get("allowedAnswers")),
    )


def collect_round_review_files(review_root: Path) -> list[Path]:
    if not review_root.exists():
        return []
    enriched = sorted(review_root.glob("**/event-review-answers*.enriched.todo.json"))
    if enriched:
        return enriched
    return sorted(path for path in review_root.glob("**/event-review-answers*.todo.json") if ".enriched." not in path.name)


def classify_root_cause(item: dict[str, Any]) -> str:
    if item.get("answerCode") == "D":
        return "external source needed"
    if not item.get("candidateId") and not item.get("eventKey"):
        return "schema/tool gap"

    missing_fields = {str(value or "").strip() for value in item.get("missingFields") or []}
    source_refs = list(item.get("sourceRefs") or [])
    general_ids = [str(value or "").strip() for value in item.get("generalIds") or [] if str(value or "").strip()]
    unresolved_general_ids = [value for value in general_ids if value.startswith("romance-person-")]
    edits = dict(item.get("edits") or {})
    location = str(edits.get("location") or "").strip()
    relationship_edges = list(edits.get("relationshipEdges") or [])

    if "sourceRefs" in missing_fields or not source_refs:
        return "missing source evidence"
    if "generalIds" in missing_fields or unresolved_general_ids:
        return "identity ambiguity"
    if len(general_ids) >= 8:
        return "event boundary"
    if "location" in missing_fields or not location:
        return "location gap"
    if "relationshipEdges" in missing_fields or not relationship_edges:
        return "relationship edge/type"
    return "schema/tool gap"


def summarize_root_causes(items: list[dict[str, Any]]) -> dict[str, int]:
    counts = {group: 0 for group in ROOT_CAUSE_GROUPS}
    for item in items:
        counts[classify_root_cause(item)] += 1
    return {group: count for group, count in counts.items() if count > 0}


def residual_fingerprint(item: dict[str, Any]) -> str:
    for key in (item.get("candidateId"), item.get("eventKey")):
        text = str(key or "").strip()
        if text:
            return text
    source_refs = list(item.get("sourceRefs") or [])
    suffix = source_refs[0] if source_refs else "unknown-ref"
    return f"{item.get('generalId') or 'unknown-general'}:{suffix}"


def normalized_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def b_review_cluster_key(item: dict[str, Any]) -> str:
    edits = dict(item.get("edits") or {})
    source_refs = "|".join(sorted(str(ref or "").strip() for ref in item.get("sourceRefs") or [] if str(ref or "").strip()))
    location = normalized_text(edits.get("location") or item.get("currentLocation"))
    participants = "|".join(sorted(str(general_id or "").strip() for general_id in item.get("generalIds") or [] if str(general_id or "").strip()))
    summary_hash = hashlib.sha1(normalized_text(edits.get("summary") or item.get("summary")).encode("utf-8")).hexdigest()[:12]
    return f"src={source_refs};loc={location};people={participants};summary={summary_hash}"


def cluster_review_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    clusters: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for item in items:
        key = b_review_cluster_key(item)
        row = clusters.get(key)
        if row is None:
            row = dict(item)
            row["cluster"] = {
                "key": key,
                "duplicateCount": 0,
                "duplicateCandidateIds": [],
                "duplicateEventKeys": [],
            }
            clusters[key] = row
            order.append(key)
            continue

        cluster = row.setdefault("cluster", {})
        cluster["duplicateCount"] = int(cluster.get("duplicateCount") or 0) + 1
        candidate_id = str(item.get("candidateId") or "").strip()
        event_key = str(item.get("eventKey") or "").strip()
        if candidate_id:
            cluster.setdefault("duplicateCandidateIds", []).append(candidate_id)
        if event_key:
            cluster.setdefault("duplicateEventKeys", []).append(event_key)
    return [clusters[key] for key in order]


def collect_round_review_items(review_root: Path) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for path in collect_round_review_files(review_root):
        payload = read_json(path)
        general_id = str((payload or {}).get("generalId") or "").strip()
        for question in list((payload or {}).get("questions") or []):
            answer_code = review_answer_code(question)
            if answer_code in {"A", "C"}:
                continue
            edits = dict(question.get("edits") or {})
            item = {
                "generalId": general_id or str((question.get("generalIds") or ["unknown-general"])[0]),
                "reviewFilePath": repo_relative(path),
                "candidateId": question.get("candidateId"),
                "eventKey": question.get("eventKey"),
                "chapterNo": question.get("chapterNo"),
                "summary": question.get("summary"),
                "sourceQuote": question.get("sourceQuote"),
                "sourceRefs": list(question.get("sourceRefs") or []),
                "generalIds": list(question.get("generalIds") or []),
                "missingFields": list(question.get("missingFields") or []),
                "suggestedAnswer": question.get("suggestedAnswer"),
                "answerCode": answer_code or "UNANSWERED",
                "allowedAnswers": question.get("allowedAnswers") or {},
                "edits": edits,
            }
            item["rootCause"] = classify_root_cause(item)
            items.append(item)

    def sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
        return (
            ROOT_CAUSE_GROUPS.index(item["rootCause"]) if item["rootCause"] in ROOT_CAUSE_GROUPS else len(ROOT_CAUSE_GROUPS),
            str(item.get("generalId") or ""),
            int(item.get("chapterNo") or 0),
            residual_fingerprint(item),
        )

    return sorted(items, key=sort_key)


def record_residual_history(history: dict[str, dict[str, Any]], items: list[dict[str, Any]]) -> None:
    seen: set[str] = set()
    for item in items:
        fingerprint = residual_fingerprint(item)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        row = history.get(fingerprint)
        if row is None:
            history[fingerprint] = {
                "fingerprint": fingerprint,
                "generalId": item.get("generalId"),
                "eventKey": item.get("eventKey"),
                "candidateId": item.get("candidateId"),
                "repeatCount": 1,
                "rootCause": item.get("rootCause"),
                "suggestedAction": f"Review {item.get('rootCause')} and resolve before another A round.",
            }
            continue
        row["repeatCount"] = int(row.get("repeatCount") or 0) + 1
        row["rootCause"] = item.get("rootCause") or row.get("rootCause")


def repeated_residuals_from_history(
    history: dict[str, dict[str, Any]],
    items: list[dict[str, Any]],
    repeat_limit: int,
) -> list[dict[str, Any]]:
    repeated: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        fingerprint = residual_fingerprint(item)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        row = history.get(fingerprint)
        if row is None or int(row.get("repeatCount") or 0) < repeat_limit:
            continue
        repeated.append(dict(row))
    return sorted(repeated, key=lambda row: (-int(row.get("repeatCount") or 0), str(row.get("generalId") or ""), str(row.get("eventKey") or row.get("candidateId") or "")))


def build_review_batch_payload(
    *,
    run_id: str,
    source_round_id: str,
    items: list[dict[str, Any]],
    pilot_pending_count: int,
    batch_size: int,
) -> dict[str, Any]:
    clustered_items = cluster_review_items(items)
    selected_items = clustered_items[: max(batch_size, 1)]
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "progress-advancement-b-review-batch",
        "canonicalWrites": False,
        "runId": run_id,
        "sourceRoundId": source_round_id,
        "rawItemCount": len(items),
        "itemCount": len(clustered_items),
        "selectedItemCount": len(selected_items),
        "remainingItemCount": max(len(clustered_items) - len(selected_items), 0),
        "pilotPendingReviewCount": pilot_pending_count,
        "rootCauseCounts": summarize_root_causes(clustered_items),
        "rawRootCauseCounts": summarize_root_causes(items),
        "clusterPolicy": "sourceRefs + location + participant set + summary hash",
        "items": selected_items,
        "decisionTemplate": {
            "decisions": [
                {
                    "candidateId": "candidate-id",
                    "answer": "B",
                    "notes": "accept with edits: add location or relationshipEdges.",
                    "edits": {
                        "location": "source phrase",
                        "relationshipEdges": [],
                    },
                }
            ]
        },
    }


def render_review_batch_markdown(payload: dict[str, Any]) -> str:
    lines = [
        "# Progress Advancement B Review Batch",
        "",
        f"- Run ID: `{payload['runId']}`",
        f"- Source Round ID: `{payload['sourceRoundId']}`",
        f"- Raw Items: `{payload.get('rawItemCount', payload['itemCount'])}`",
        f"- Clustered Items: `{payload['itemCount']}`",
        f"- Selected Items: `{payload['selectedItemCount']}` / `{payload['itemCount']}`",
        f"- Remaining Items After Batch: `{payload['remainingItemCount']}`",
        f"- Pilot Pending Review Count: `{payload['pilotPendingReviewCount']}`",
        f"- Cluster Policy: `{payload.get('clusterPolicy')}`",
        "",
        "## Root Cause Counts",
        "",
    ]
    for root_cause, count in (payload.get("rootCauseCounts") or {}).items():
        lines.append(f"- `{root_cause}`: `{count}`")
    lines.extend([
        "",
        "## Decision Contract",
        "",
        "Create a JSON file with top-level `decisions`; match each decision by `candidateId` or `eventKey`.",
        "",
        "```json",
        json.dumps(payload["decisionTemplate"], ensure_ascii=False, indent=2),
        "```",
        "",
        "## Review Items",
        "",
        "| General | Event Key | Candidate ID | Answer | Root Cause | Cluster Duplicates | Missing Fields | Source Refs |",
        "|---|---|---|---|---|---:|---|---|",
    ])
    for item in payload.get("items") or []:
        cluster = item.get("cluster") or {}
        lines.append(
            "| {general} | `{event_key}` | `{candidate_id}` | `{answer}` | `{root_cause}` | {duplicates} | `{missing}` | `{refs}` |".format(
                general=item.get("generalId") or "-",
                event_key=item.get("eventKey") or "-",
                candidate_id=item.get("candidateId") or "-",
                answer=item.get("answerCode") or "UNANSWERED",
                root_cause=item.get("rootCause") or "-",
                duplicates=cluster.get("duplicateCount") or 0,
                missing=", ".join(item.get("missingFields") or []) or "-",
                refs=", ".join(item.get("sourceRefs") or []) or "-",
            )
        )
    lines.append("")
    return "\n".join(lines)


def write_review_batch(
    *,
    run_root: Path,
    run_id: str,
    source_round_id: str,
    items: list[dict[str, Any]],
    pilot_pending_count: int,
    batch_size: int,
) -> dict[str, Any]:
    batch_root = run_root / "b-review-batches"
    json_path = batch_root / f"{source_round_id}-review-batch.json"
    markdown_path = batch_root / f"{source_round_id}-review-batch.md"
    payload = build_review_batch_payload(
        run_id=run_id,
        source_round_id=source_round_id,
        items=items,
        pilot_pending_count=pilot_pending_count,
        batch_size=batch_size,
    )
    write_json(json_path, payload)
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.write_text(render_review_batch_markdown(payload), encoding="utf-8")
    return {
        "sourceRoundId": source_round_id,
        "jsonPath": repo_relative(json_path),
        "markdownPath": repo_relative(markdown_path),
        "rawItemCount": payload.get("rawItemCount", payload["itemCount"]),
        "itemCount": payload["itemCount"],
        "selectedItemCount": payload["selectedItemCount"],
        "remainingItemCount": payload["remainingItemCount"],
        "rootCauseCounts": payload.get("rootCauseCounts") or {},
    }


def apply_review_decisions_to_root(review_root: Path, decision_path: Path, dry_run: bool) -> dict[str, Any]:
    decisions = normalize_review_decisions(read_json(decision_path))
    if not decisions:
        return {
            "decisionPath": repo_relative(decision_path),
            "reviewRoot": repo_relative(review_root),
            "decisionsProvided": 0,
            "updatedQuestionCount": 0,
            "updatedFileCount": 0,
        }

    updated_question_count = 0
    updated_file_count = 0
    for path in collect_round_review_files(review_root):
        review_payload = read_json(path)
        questions = list((review_payload or {}).get("questions") or [])
        updated = apply_review_decisions_to_questions(questions, decisions)
        if not updated:
            continue
        updated_question_count += updated
        updated_file_count += 1
        review_payload["questions"] = questions
        review_payload["lastHumanReviewAt"] = utc_now()
        if not dry_run:
            write_json(path, review_payload)

    return {
        "decisionPath": repo_relative(decision_path),
        "reviewRoot": repo_relative(review_root),
        "decisionsProvided": len(decisions),
        "updatedQuestionCount": updated_question_count,
        "updatedFileCount": updated_file_count,
    }


def progress_overall_percent(path_text: str | Path) -> float | None:
    payload = read_json(resolve_path(path_text))
    completion = (payload or {}).get("completion") or {}
    value = completion.get("overallPercent")
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def render_b_review_merge_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# Progress Advancement B Review Merge",
        "",
        f"- Source Round ID: `{summary['sourceRoundId']}`",
        f"- Review Round ID: `{summary['reviewRoundId']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Baseline Overall: `{summary.get('baselineOverallPercent')}`",
        f"- Result Overall: `{summary.get('resultOverallPercent')}`",
        f"- Delta Overall: `{summary.get('deltaOverallPercent')}`",
        f"- Success: `{summary.get('success')}`",
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
            f"- `{command.get('name')}` rc=`{command.get('returnCode')}`",
            f"  - `{command.get('command')}`",
        ])
    lines.append("")
    return "\n".join(lines)


def run_b_review_merge(
    *,
    run_root: Path,
    source_round_id: str,
    review_root: Path,
    base_paths: dict[str, str | Path],
    review_index: int,
    overwrite: bool,
    emit_ready_eval: bool,
    dry_run: bool,
) -> tuple[dict[str, Any], dict[str, Path]]:
    outputs = b_review_output_paths(run_root, source_round_id, review_index)
    b_round_id = outputs["bRoundId"].name
    resolved_base_paths = resolve_baseline_paths(base_paths)
    commands: list[dict[str, Any]] = []

    stage_args = [
        "--review-root",
        repo_relative(review_root),
        "--base-events",
        resolved_base_paths["baseEvents"],
        "--base-relationship-evidence",
        resolved_base_paths["baseRelationshipEvidence"],
        "--output-root",
        repo_relative(outputs["stageRoot"]),
        "--round-id",
        b_round_id,
    ]
    if emit_ready_eval:
        stage_args.append("--emit-ready-eval")
    maybe_append_overwrite(stage_args, overwrite)
    stage_command = script_command("stage_reviewed_a_ready_events.py", stage_args)
    commands.append({"name": "stage_reviewed_a_ready_events", **run_command(stage_command, dry_run)})

    seed_command = script_command(
        "build_event_question_seed_bank.py",
        maybe_append_overwrite([
            "--relationship-evidence",
            repo_relative(outputs["baseRelationshipEvidence"]),
            "--output-root",
            repo_relative(outputs["eventSeedRoot"]),
        ], overwrite),
    )
    commands.append({"name": "build_event_question_seed_bank", **run_command(seed_command, dry_run)})

    packet_command = script_command(
        "build_source_event_packets.py",
        maybe_append_overwrite([
            "--relationship-evidence",
            repo_relative(outputs["baseRelationshipEvidence"]),
            "--output-root",
            repo_relative(outputs["packetRoot"]),
        ], overwrite),
    )
    commands.append({"name": "build_source_event_packets", **run_command(packet_command, dry_run)})

    estimate_args = [
        "--round-id",
        b_round_id,
        "--ready-events",
        repo_relative(outputs["baseEvents"]),
        "--relationship-evidence",
        repo_relative(outputs["baseRelationshipEvidence"]),
        "--event-question-seeds",
        repo_relative(outputs["eventSeedRoot"] / "event-question-seeds.jsonl"),
        "--source-event-packets",
        repo_relative(outputs["packetRoot"] / "source-event-packets.jsonl"),
        "--rounds-root",
        repo_relative(run_root / "repair-review" / "knowledge-growth-rounds"),
        "--output-root",
        repo_relative(outputs["progressRoot"]),
    ]
    maybe_append_overwrite(estimate_args, overwrite)
    for batch_path in existing_round_json_paths(base_paths["baseProgress"]):
        estimate_args.extend(["--round-json", batch_path])
    for batch_path in sorted((run_root / "repair-review" / "knowledge-growth-rounds").glob("*.batch.json")):
        estimate_args.extend(["--round-json", repo_relative(batch_path)])
    estimate_command = script_command("estimate_knowledge_completion.py", estimate_args)
    commands.append({"name": "estimate_knowledge_completion", **run_command(estimate_command, dry_run)})

    success = all(int(command.get("returnCode") or 0) == 0 for command in commands)
    baseline_overall = progress_overall_percent(base_paths["baseProgress"])
    result_overall = progress_overall_percent(outputs["baseProgress"])
    delta_overall = None
    if baseline_overall is not None and result_overall is not None:
        delta_overall = round(result_overall - baseline_overall, 2)

    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "progress-advancement-b-review-merge",
        "canonicalWrites": False,
        "sourceRoundId": source_round_id,
        "reviewRoundId": b_round_id,
        "reviewRoot": repo_relative(review_root),
        "success": success,
        "baselineOverallPercent": baseline_overall,
        "resultOverallPercent": result_overall,
        "deltaOverallPercent": delta_overall,
        "commands": commands,
        "outputs": {
            "editBacklog": repo_relative(outputs["editBacklog"]),
            "baseEvents": repo_relative(outputs["baseEvents"]),
            "baseRelationshipEvidence": repo_relative(outputs["baseRelationshipEvidence"]),
            "readyEvalEvents": repo_relative(outputs["readyEvalEvents"]) if emit_ready_eval else None,
            "baseProgress": repo_relative(outputs["baseProgress"]),
        },
    }
    write_json(outputs["summaryJson"], summary)
    outputs["summaryMd"].parent.mkdir(parents=True, exist_ok=True)
    outputs["summaryMd"].write_text(render_b_review_merge_markdown(summary), encoding="utf-8")
    summary["summaryJsonPath"] = repo_relative(outputs["summaryJson"])
    summary["summaryMarkdownPath"] = repo_relative(outputs["summaryMd"])
    next_base_paths = {
        "editBacklog": outputs["editBacklog"],
        "baseEvents": outputs["baseEvents"],
        "baseRelationshipEvidence": outputs["baseRelationshipEvidence"],
        "baseProgress": outputs["baseProgress"],
    }
    if emit_ready_eval:
        next_base_paths["readyEvalEvents"] = outputs["readyEvalEvents"]
    return summary, next_base_paths


def collect_touched_generals(rounds: list[dict[str, Any]], explicit_generals: list[str]) -> list[str]:
    seen: set[str] = set()
    rows: list[str] = []
    for general_id in explicit_generals:
        value = str(general_id or "").strip()
        if value and value not in seen:
            seen.add(value)
            rows.append(value)
    for round_record in rounds:
        for general_id in ((round_record.get("campaignSummary") or {}).get("selectedGenerals") or []):
            value = str(general_id or "").strip()
            if value and value not in seen:
                seen.add(value)
                rows.append(value)
    return rows


def run_runtime_readiness_matrix(
    *,
    run_root: Path,
    mode: str,
    generals: list[str],
    overwrite: bool,
    dry_run: bool,
) -> dict[str, Any]:
    if mode == "off":
        return {"mode": "off", "skipped": True}
    if mode == "touched" and not generals:
        return {"mode": mode, "skipped": True, "reason": "no-touched-generals"}

    output_root = run_root / "runtime-readiness"
    command_args = ["--output-root", repo_relative(output_root)]
    if mode == "touched":
        for general_id in generals:
            command_args.extend(["--general-id", general_id])
    maybe_append_overwrite(command_args, overwrite)
    command = script_command("build_runtime_readiness_matrix.py", command_args)
    result = run_command(command, dry_run)
    output_json = output_root / "multi-general-readiness.json"
    payload = read_json(output_json) if output_json.exists() else {}
    fail_count = payload.get("failCount")
    if fail_count is None and not dry_run and int(result.get("returnCode") or 0) != 0:
        fail_count = 1
    return {
        "mode": mode,
        "generalIds": generals if mode == "touched" else generals,
        "command": result,
        "outputRoot": repo_relative(output_root),
        "matrixPath": repo_relative(output_json),
        "failCount": fail_count,
        "statusCounts": payload.get("statusCounts") or {},
        "skipped": False,
    }


def build_baseline_manifest(
    *,
    args: argparse.Namespace,
    run_root: Path,
    final_paths: dict[str, str],
    summary_path: Path,
    residual_path: Path,
    runtime_readiness: dict[str, Any],
) -> dict[str, Any]:
    paths: dict[str, Any] = {
        "editBacklog": final_paths.get("editBacklog"),
        "readyEvents": final_paths.get("baseEvents"),
        "relationshipEvidence": final_paths.get("baseRelationshipEvidence"),
        "progress": final_paths.get("baseProgress"),
        "progressAdvancementSummary": repo_relative(summary_path),
        "residualDossier": repo_relative(residual_path),
    }
    if final_paths.get("readyEvalEvents"):
        paths["readyEvalEvents"] = final_paths["readyEvalEvents"]
    if runtime_readiness and not runtime_readiness.get("skipped"):
        paths["runtimeReadiness"] = runtime_readiness.get("matrixPath")

    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "sanguo-progress-baseline-manifest",
        "canonicalWrites": False,
        "runId": args.run_id,
        "profile": args.profile,
        "optimizationTarget": args.optimization_target,
        "baselineManifestPath": repo_relative(run_root / "baseline-manifest.json"),
        "paths": {key: value for key, value in paths.items() if value},
    }


def classify_stop_reason(
    *,
    round_index: int,
    max_rounds: int,
    pending_count: int,
    pending_limit: int,
    weak_improvement_count: int,
    no_improvement_patience: int,
    same_residual_repeat_count: int,
    same_residual_repeat_limit: int,
    ab_cycles_executed: int,
    max_ab_cycles: int,
    failure_rate: float,
    failure_rate_limit: float,
) -> str | None:
    if failure_rate > failure_rate_limit:
        return "failure-rate-limit"
    if same_residual_repeat_count >= same_residual_repeat_limit:
        return "same-residual-repeat-limit"
    if pending_count > pending_limit:
        return "pending-review-limit"
    if weak_improvement_count >= no_improvement_patience:
        return "no-improvement-patience"
    if ab_cycles_executed >= max_ab_cycles and pending_count > 0:
        return "max-ab-cycles"
    if round_index >= max_rounds:
        return "max-rounds"
    return None


def render_summary_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# Sanguo Progress Advancement Summary",
        "",
        f"- Run ID: `{summary['runId']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Mode: `{summary['mode']}`",
        f"- Profile: `{summary.get('profile')}`",
        f"- Optimization Target: `{summary.get('optimizationTarget')}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Dry Run: `{summary['dryRun']}`",
        f"- Stop Reason: `{summary.get('stopReason') or '-'}`",
        f"- Next Route: `{summary.get('nextRoute') or '-'}`",
        f"- A Rounds Executed: `{summary['roundsExecuted']}`",
        f"- AB Cycles Executed: `{summary['abCyclesExecuted']}`",
        f"- B Reviews Applied: `{summary['bReviewCount']}`",
        f"- Event Review Pending Count: `{summary['pendingReviewCount']}`",
        f"- Pilot Pending Review Count: `{summary['pilotPendingReviewCount']}`",
        f"- Total Delta Overall: `{summary.get('totalDeltaOverallPercent')}`",
        f"- Baseline Manifest: `{summary.get('baselineManifestOutputPath') or '-'}`",
        "",
        "## Round Summaries",
        "",
        "| Round | Selected Generals | Baseline | Result | Delta | Event Pending | Repeated | B Review | Success |",
        "|---:|---|---:|---:|---:|---:|---:|---|---|",
    ]
    for item in summary.get("rounds") or []:
        campaign = item.get("campaignSummary") or {}
        lines.append(
            "| {round} | `{generals}` | `{base}` | `{result}` | `{delta}` | `{pending}` | `{repeated}` | `{b_review}` | `{success}` |".format(
                round=item.get("roundIndex"),
                generals=", ".join(campaign.get("selectedGenerals") or []) or "-",
                base=campaign.get("baselineOverallPercent"),
                result=campaign.get("resultOverallPercent"),
                delta=campaign.get("deltaOverallPercent"),
                pending=item.get("eventReviewPendingCountAfterReview") or item.get("eventReviewPendingCountAfterRound") or 0,
                repeated=item.get("repeatedResidualCountAfterReview") or item.get("repeatedResidualCountAfterRound") or 0,
                b_review="yes" if item.get("bReviewSummary") else "-",
                success=item.get("success"),
            )
        )
    if summary.get("reviewBatches"):
        lines.extend(["", "## B Review Batches", ""])
        for batch in summary.get("reviewBatches") or []:
            lines.append(
                f"- `{batch.get('sourceRoundId')}` items=`{batch.get('selectedItemCount')}/{batch.get('itemCount')}` md=`{batch.get('markdownPath')}`"
            )
    if summary.get("bReviews"):
        lines.extend(["", "## Applied B Reviews", ""])
        for review in summary.get("bReviews") or []:
            lines.append(
                f"- `{review.get('reviewRoundId')}` delta=`{review.get('deltaOverallPercent')}` summary=`{review.get('summaryMarkdownPath')}`"
            )
    runtime_readiness = summary.get("runtimeReadiness") or {}
    if runtime_readiness:
        lines.extend(["", "## Runtime Readiness", ""])
        lines.append(
            f"- mode=`{runtime_readiness.get('mode')}` failCount=`{runtime_readiness.get('failCount')}` matrix=`{runtime_readiness.get('matrixPath')}`"
        )
    lines.extend(["", "## Next Recommended Action", "", str(summary.get("nextRecommendedAction") or "-"), ""])
    return "\n".join(lines)


def build_rule_repair_proposals(root_cause_counts: dict[str, int]) -> list[dict[str, Any]]:
    templates = {
        "identity ambiguity": "Propose alias resolution additions for repeated unresolved person mentions.",
        "location gap": "Propose location phrase extractor additions for repeated source-location patterns.",
        "relationship edge/type": "Propose relationship edge/type refinement rules backed by source quotes.",
        "event boundary": "Propose event-boundary split/merge heuristics for over-broad participant sets.",
        "missing source evidence": "Propose sourceRef propagation checks before event review emission.",
        "schema/tool gap": "Propose schema normalization or deterministic extractor guardrails.",
        "external source needed": "Keep as human research backlog; do not auto-promote extractor behavior.",
    }
    proposals: list[dict[str, Any]] = []
    for group, count in sorted(root_cause_counts.items(), key=lambda item: (-int(item[1] or 0), item[0])):
        if count <= 0:
            continue
        proposals.append(
            {
                "rootCause": group,
                "count": count,
                "proposal": templates.get(group, "Propose a sandbox-only rule repair."),
                "gate": "sandbox/regression first; human approval required before extractor changes",
            }
        )
    return proposals


def render_residual_dossier(summary: dict[str, Any]) -> str:
    repeated_items = list(summary.get("repeatedResiduals") or [])
    root_cause_counts = dict((summary.get("residualSummary") or {}).get("rootCauseCounts") or {})
    lines = [
        "# Sanguo RAG Residual Review Dossier",
        "",
        f"- Run ID: `{summary['runId']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- A Rounds: `{summary['roundsExecuted']}`",
        f"- AB Cycles Executed: `{summary['abCyclesExecuted']}`",
        f"- Pending Review Count: `{summary['pendingReviewCount']}`",
        f"- Pilot Pending Review Count: `{summary['pilotPendingReviewCount']}`",
        f"- Total Delta Overall: `{summary.get('totalDeltaOverallPercent')}`",
        f"- Stop Reason: `{summary.get('stopReason') or '-'}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        "",
        "## Executive Summary",
        "",
        "本 dossier 由 progress advancement controller 產生，用於整理 ABAB 輪巡後仍需 B/C 階段處理的問題。",
        "",
        "## Root Cause Counts",
        "",
    ]
    for group in ROOT_CAUSE_GROUPS:
        lines.append(f"- `{group}`: `{root_cause_counts.get(group, 0)}`")
    lines.extend([
        "",
        "## Rule Repair Proposals",
        "",
        "Self-improvement output is limited to proposals. Extractor changes still require sandbox/regression plus human approval.",
        "",
    ])
    proposals = build_rule_repair_proposals(root_cause_counts)
    if proposals:
        for proposal in proposals:
            lines.append(
                f"- `{proposal['rootCause']}` count=`{proposal['count']}`: {proposal['proposal']} Gate: {proposal['gate']}."
            )
    else:
        lines.append("- No rule repair proposal emitted for this run.")
    lines.extend([
        "",
        "## Repeated Residuals",
        "",
        "| General | Event Key | Candidate ID | Repeat Count | Root Cause | Suggested Action |",
        "|---|---|---|---:|---|---|",
    ])
    if repeated_items:
        for item in repeated_items:
            lines.append(
                "| {general} | `{event_key}` | `{candidate_id}` | {repeat_count} | `{root_cause}` | {action} |".format(
                    general=item.get("generalId") or "-",
                    event_key=item.get("eventKey") or "-",
                    candidate_id=item.get("candidateId") or "-",
                    repeat_count=item.get("repeatCount") or 0,
                    root_cause=item.get("rootCause") or "-",
                    action=item.get("suggestedAction") or "Review before next A round.",
                )
            )
    else:
        lines.append("| - | - | - | 0 | - | No repeated residual reached the configured repeat limit. |")
    lines.append("")
    for group in ROOT_CAUSE_GROUPS:
        group_items = [item for item in repeated_items if item.get("rootCause") == group]
        lines.extend([f"## {group}", ""])
        if not group_items:
            lines.append(f"- Count in current repeated residual set: `{root_cause_counts.get(group, 0)}`")
            lines.append("- No repeated residual item reached the emit threshold for this group.")
            lines.append("")
            continue
        lines.append("| General | Event Key | Candidate ID | Repeat Count | Suggested Action |")
        lines.append("|---|---|---|---:|---|")
        for item in group_items:
            lines.append(
                "| {general} | `{event_key}` | `{candidate_id}` | {repeat_count} | {action} |".format(
                    general=item.get("generalId") or "-",
                    event_key=item.get("eventKey") or "-",
                    candidate_id=item.get("candidateId") or "-",
                    repeat_count=item.get("repeatCount") or 0,
                    action=item.get("suggestedAction") or "Review before next A round.",
                )
            )
        lines.append("")
    lines.extend(["## Commands", ""])
    for item in summary.get("rounds") or []:
        command = ((item.get("command") or {}).get("command")) or ""
        if command:
            lines.append(f"- Round {item.get('roundIndex')}: `{command}`")
    for review in summary.get("bReviews") or []:
        for command in review.get("commands") or []:
            lines.append(f"- B review `{review.get('reviewRoundId')}` / `{command.get('name')}`: `{command.get('command')}`")
    lines.extend(
        [
            "",
            "## Recommended Next Actions",
            "",
            "- [ ] 若 pending review 仍高，先處理最新的 B review batch，再繼續 A。",
            "- [ ] 若 repeated residual 已命中上限，先調 extractor/rule 或人工收斂，不要直接多跑一輪 A。",
            "- [ ] 若 missing source evidence 或 external source needed 佔比高，改開查證/規則修補任務。",
            "- [ ] canonical promotion 仍需獨立人工 gate，不與本 controller 自動綁定。",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    apply_profile_defaults(args)
    args.run_id = args.run_id or f"progress-advancement-{utc_stamp()}"
    started_monotonic = time.monotonic()
    run_root = (REPO_ROOT / Path(args.output_root) / args.run_id).resolve()
    run_root.mkdir(parents=True, exist_ok=True)

    baseline_manifest = load_baseline_manifest(args.baseline_manifest)
    manifest_paths = baseline_paths_from_manifest(baseline_manifest)
    initial_base_paths: dict[str, str | Path] = {
        "editBacklog": args.edit_backlog,
        "baseEvents": args.base_events,
        "baseRelationshipEvidence": args.base_relationship_evidence,
        "baseProgress": args.base_progress,
    }
    for key in ("editBacklog", "baseEvents", "baseRelationshipEvidence", "baseProgress"):
        if manifest_paths.get(key):
            initial_base_paths[key] = manifest_paths[key]
    latest_ready_eval_events: str | Path | None = manifest_paths.get("readyEvalEvents")
    base_paths = dict(initial_base_paths)

    rounds: list[dict[str, Any]] = []
    review_batches: list[dict[str, Any]] = []
    b_reviews: list[dict[str, Any]] = []
    residual_history: dict[str, dict[str, Any]] = {}

    weak_improvement_count = 0
    failure_count = 0
    b_review_count = 0
    stop_reason: str | None = None
    review_decisions_consumed = False
    last_round_pending_items: list[dict[str, Any]] = []
    last_repeated_items: list[dict[str, Any]] = []
    last_pilot_pending_count = pending_review_count(resolve_path(args.review_queue))
    last_pending_count = last_pilot_pending_count

    for round_index in range(1, max(args.max_rounds, 1) + 1):
        if wall_time_exceeded(started_monotonic, args.max_wall_time_minutes):
            stop_reason = "max-wall-time-minutes"
            break
        edit_backlog_count = jsonl_record_count(base_paths["editBacklog"])
        if edit_backlog_count == 0:
            stop_reason = "repair-backlog-exhausted"
            break

        round_id, command, summary_path, output_paths = build_campaign_command(args, run_root, round_index, base_paths)
        command_result = run_command(command, args.dry_run)
        success = int(command_result["returnCode"] or 0) == 0
        if not success:
            failure_count += 1

        campaign_summary = read_json(summary_path)
        if args.dry_run and not campaign_summary:
            campaign_summary = {
                "mode": "repair-review-campaign",
                "canonicalWrites": False,
                "roundId": round_id,
                "selectedGenerals": list(args.general_id),
                "deltaOverallPercent": None,
            }

        repair_task_summary = {}
        repair_task_summary_path = (campaign_summary or {}).get("repairTaskSummaryPath")
        if repair_task_summary_path:
            repair_task_summary = read_json(resolve_path(repair_task_summary_path))

        delta = (campaign_summary or {}).get("deltaOverallPercent")
        try:
            delta_value = float(delta)
        except (TypeError, ValueError):
            delta_value = args.no_improvement_threshold if args.dry_run else 0.0

        if delta_value < args.no_improvement_threshold:
            weak_improvement_count += 1
        else:
            weak_improvement_count = 0

        last_pilot_pending_count = pending_review_count(resolve_path(args.review_queue))
        round_pending_items = collect_round_review_items(output_paths["reviewSnapshotRoot"])
        record_residual_history(residual_history, round_pending_items)
        repeated_items = repeated_residuals_from_history(residual_history, round_pending_items, max(args.same_residual_repeat_limit, 1))
        last_round_pending_items = round_pending_items
        last_repeated_items = repeated_items
        last_pending_count = len(round_pending_items) if round_pending_items else last_pilot_pending_count

        failure_rate = failure_count / max(round_index, 1)
        round_record = {
            "roundIndex": round_index,
            "roundId": round_id,
            "success": success,
            "summaryPath": repo_relative(summary_path),
            "baselineInputs": {key: resolve_baseline_paths(base_paths)[key] for key in sorted(base_paths)},
            "nextBaselineCandidates": {
                key: repo_relative(path)
                for key, path in output_paths.items()
                if key in {"editBacklog", "baseEvents", "baseRelationshipEvidence", "baseProgress", "readyEvalEvents"}
            },
            "command": command_result,
            "campaignSummary": campaign_summary,
            "repairTaskSummary": {
                "priorityCounts": (repair_task_summary or {}).get("priorityCounts") or {},
                "repairActionCounts": (repair_task_summary or {}).get("repairActionCounts") or {},
                "topFocusGenerals": (repair_task_summary or {}).get("topFocusGenerals") or {},
            },
            "pilotPendingReviewCountAfterRound": last_pilot_pending_count,
            "eventReviewPendingCountAfterRound": len(round_pending_items),
            "repeatedResidualCountAfterRound": len(repeated_items),
            "repeatedResidualsPreview": repeated_items[:5],
            "weakImprovementCount": weak_improvement_count,
            "failureRate": round(failure_rate, 4),
        }

        if round_pending_items:
            batch_info = write_review_batch(
                run_root=run_root,
                run_id=args.run_id,
                source_round_id=round_id,
                items=round_pending_items,
                pilot_pending_count=last_pilot_pending_count,
                batch_size=max(args.review_batch_size, 1),
            )
            review_batches.append(batch_info)
            round_record["reviewBatch"] = batch_info

        rounds.append(round_record)

        if success:
            base_paths = {
                "editBacklog": output_paths["editBacklog"],
                "baseEvents": output_paths["baseEvents"],
                "baseRelationshipEvidence": output_paths["baseRelationshipEvidence"],
                "baseProgress": output_paths["baseProgress"],
            }
            if args.emit_ready_eval:
                latest_ready_eval_events = output_paths["readyEvalEvents"]
                base_paths["readyEvalEvents"] = output_paths["readyEvalEvents"]

        if args.review_decisions and round_pending_items and not review_decisions_consumed:
            decision_summary = apply_review_decisions_to_root(output_paths["reviewSnapshotRoot"], resolve_path(args.review_decisions), args.dry_run)
            round_record["reviewDecisionApplication"] = decision_summary
            if int(decision_summary.get("updatedQuestionCount") or 0) > 0:
                review_decisions_consumed = True
                b_review_count += 1
                b_review_summary, base_paths = run_b_review_merge(
                    run_root=run_root,
                    source_round_id=round_id,
                    review_root=output_paths["reviewSnapshotRoot"],
                    base_paths=round_record["baselineInputs"],
                    review_index=b_review_count,
                    overwrite=args.overwrite,
                    emit_ready_eval=args.emit_ready_eval,
                    dry_run=args.dry_run,
                )
                if args.emit_ready_eval and base_paths.get("readyEvalEvents"):
                    latest_ready_eval_events = base_paths["readyEvalEvents"]
                b_reviews.append(b_review_summary)
                round_record["bReviewSummary"] = b_review_summary
                if not b_review_summary.get("success"):
                    failure_count += 1
                    stop_reason = "failure-rate-limit"
                    break

                round_pending_items = collect_round_review_items(output_paths["reviewSnapshotRoot"])
                repeated_items = repeated_residuals_from_history(residual_history, round_pending_items, max(args.same_residual_repeat_limit, 1))
                last_round_pending_items = round_pending_items
                last_repeated_items = repeated_items
                last_pending_count = len(round_pending_items) if round_pending_items else last_pilot_pending_count
                round_record["eventReviewPendingCountAfterReview"] = len(round_pending_items)
                round_record["repeatedResidualCountAfterReview"] = len(repeated_items)

                if round_index < max(args.max_rounds, 1) and b_review_count < max(args.max_ab_cycles, 1):
                    continue

        if round_pending_items and not review_decisions_consumed:
            round_record["failureRate"] = round(failure_rate, 4)
            stop_reason = "review-batch-ready"
            break

        failure_rate = failure_count / max(round_index, 1)
        stop_reason = classify_stop_reason(
            round_index=round_index,
            max_rounds=max(args.max_rounds, 1),
            pending_count=last_pending_count,
            pending_limit=max(args.pending_review_limit, 1),
            weak_improvement_count=weak_improvement_count,
            no_improvement_patience=max(args.no_improvement_patience, 1),
            same_residual_repeat_count=len(last_repeated_items),
            same_residual_repeat_limit=max(args.same_residual_repeat_limit, 1),
            ab_cycles_executed=max(b_review_count + 1, 1),
            max_ab_cycles=max(args.max_ab_cycles, 1),
            failure_rate=failure_rate,
            failure_rate_limit=args.failure_rate_limit,
        )
        round_record["failureRate"] = round(failure_rate, 4)
        if stop_reason:
            break

    baseline = progress_overall_percent(initial_base_paths["baseProgress"])
    result = progress_overall_percent(base_paths["baseProgress"])
    if baseline is None and rounds:
        baseline = (rounds[0].get("campaignSummary") or {}).get("baselineOverallPercent")
    if result is None and rounds:
        result = (rounds[-1].get("campaignSummary") or {}).get("resultOverallPercent")

    total_delta = None
    if baseline is not None and result is not None:
        try:
            total_delta = round(float(result) - float(baseline), 2)
        except (TypeError, ValueError):
            total_delta = None

    touched_generals = collect_touched_generals(rounds, args.general_id)
    runtime_readiness = run_runtime_readiness_matrix(
        run_root=run_root,
        mode=args.runtime_readiness,
        generals=touched_generals,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
    )
    try:
        runtime_fail_count = int(runtime_readiness.get("failCount") or 0)
    except (TypeError, ValueError):
        runtime_fail_count = 0
    if runtime_fail_count > 0:
        stop_reason = stop_reason or "runtime-readiness-fail"

    next_route = "A-or-B-next"
    if stop_reason in {"pending-review-limit", "review-batch-ready"}:
        next_route = "B-review"
    elif stop_reason == "repair-backlog-exhausted":
        next_route = "complete"
    elif stop_reason in {"same-residual-repeat-limit", "no-improvement-patience", "failure-rate-limit", "max-rounds", "max-ab-cycles", "max-wall-time-minutes", "runtime-readiness-fail"}:
        next_route = "C-residual-dossier"

    latest_batch_path = review_batches[-1].get("markdownPath") if review_batches else None
    next_action = {
        "review-batch-ready": f"請先開啟最新的 B review batch `{latest_batch_path or '-'}`，套用 decisions 後再開始下一輪 A。",
        "pending-review-limit": f"目前待審項目過多，請先處理最新的 B review batch `{latest_batch_path or '-'}`。",
        "same-residual-repeat-limit": "同一批 residual 已重複出現，請先檢查 dossier 並修補主要規則或 extractor 缺口，再決定是否續跑。",
        "no-improvement-patience": "最近幾輪改善幅度太弱，請先檢查 residual dossier 與最新 repair backlog summary，不建議直接盲跑下一輪 A。",
        "failure-rate-limit": "請先檢查 summary 裡失敗 command 的 stderr，再決定是否續跑。",
        "repair-backlog-exhausted": "這輪套用審核後已沒有剩餘 repair backlog 可供下一輪 A 使用；若還要推進，可改檢查 pilot review queue 或改開新的 focus cohort。",
        "max-rounds": "已達到本次 outer loop 的 round 上限；若仍有 pending items，請先做 B review，再決定是否重開新一輪。",
        "max-ab-cycles": "已達到 AB cycle 上限；請先把剩餘 residual 轉成人工審核或規則修補任務，再繼續。",
        "max-wall-time-minutes": "已達到本次 wall-time 上限；請先檢查 summary 與 baseline manifest，再決定是否續跑。",
        "runtime-readiness-fail": "runtime readiness matrix 仍有 fail；不可進 Promotion Lane，請先修正 fail rows 後重跑 smoke gate。",
    }.get(stop_reason or "", "請先檢查 summary，再決定要繼續 A、進入 B 審核，或整理 C dossier。")

    final_base_paths_for_summary = dict(base_paths)
    if latest_ready_eval_events:
        final_base_paths_for_summary["readyEvalEvents"] = latest_ready_eval_events
    baseline_manifest_path = run_root / "baseline-manifest.json"
    summary_json_path = run_root / "progress-advancement-summary.json"
    summary_md_path = run_root / "progress-advancement-summary.md"
    residual_md_path = run_root / "residual-review.md"

    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "sanguo-progress-advancement-loop",
        "canonicalWrites": False,
        "dryRun": bool(args.dry_run),
        "runId": args.run_id,
        "profile": args.profile,
        "optimizationTarget": args.optimization_target,
        "runRoot": repo_relative(run_root),
        "baselineManifestInputPath": repo_relative(resolve_path(args.baseline_manifest)) if args.baseline_manifest else None,
        "baselineManifestOutputPath": repo_relative(baseline_manifest_path),
        "initialBaselinePaths": {key: resolve_baseline_paths(initial_base_paths)[key] for key in sorted(initial_base_paths)},
        "finalBaselinePaths": {key: resolve_baseline_paths(final_base_paths_for_summary)[key] for key in sorted(final_base_paths_for_summary)},
        "policy": {
            "profile": args.profile,
            "optimizationTarget": args.optimization_target,
            "maxRounds": args.max_rounds,
            "maxABCycles": args.max_ab_cycles,
            "topGenerals": args.top_generals,
            "topPerGeneral": args.top_per_general,
            "noImprovementThreshold": args.no_improvement_threshold,
            "noImprovementPatience": args.no_improvement_patience,
            "pendingReviewLimit": args.pending_review_limit,
            "sameResidualRepeatLimit": args.same_residual_repeat_limit,
            "reviewBatchSize": args.review_batch_size,
            "failureRateLimit": args.failure_rate_limit,
            "reviewerPreset": args.reviewer_preset,
            "reviewerProvider": args.reviewer_provider,
            "stepTimeoutSeconds": args.step_timeout_seconds,
            "emitReadyEval": args.emit_ready_eval,
            "runtimeReadiness": args.runtime_readiness,
            "maxWallTimeMinutes": args.max_wall_time_minutes,
        },
        "roundsExecuted": len(rounds),
        "abCyclesExecuted": max(b_review_count + 1, 1 if rounds else 0),
        "bReviewCount": b_review_count,
        "pilotPendingReviewCount": last_pilot_pending_count,
        "pendingReviewCount": last_pending_count,
        "stopReason": stop_reason,
        "nextRoute": next_route,
        "nextRecommendedAction": next_action,
        "baselineOverallPercent": baseline,
        "finalOverallPercent": result,
        "totalDeltaOverallPercent": total_delta,
        "touchedGenerals": touched_generals,
        "runtimeReadiness": runtime_readiness,
        "reviewBatches": review_batches,
        "bReviews": b_reviews,
        "residualSummary": {
            "rootCauseCounts": summarize_root_causes(last_round_pending_items),
            "repeatedResidualCount": len(last_repeated_items),
        },
        "repeatedResiduals": last_repeated_items[:50],
        "rounds": rounds,
    }

    write_json(summary_json_path, summary)
    summary_md_path.write_text(render_summary_markdown(summary), encoding="utf-8")
    residual_md_path.write_text(render_residual_dossier(summary), encoding="utf-8")
    final_manifest = build_baseline_manifest(
        args=args,
        run_root=run_root,
        final_paths=summary["finalBaselinePaths"],
        summary_path=summary_json_path,
        residual_path=residual_md_path,
        runtime_readiness=runtime_readiness,
    )
    write_json(baseline_manifest_path, final_manifest)

    print(f"[run_progress_advancement_loop] wrote {summary_json_path}")
    print(f"[run_progress_advancement_loop] wrote {summary_md_path}")
    print(f"[run_progress_advancement_loop] wrote {residual_md_path}")
    print(f"[run_progress_advancement_loop] wrote {baseline_manifest_path}")
    print(
        "[run_progress_advancement_loop] "
        f"runId={args.run_id} rounds={len(rounds)} stopReason={stop_reason} "
        f"nextRoute={next_route} totalDelta={total_delta}"
    )


if __name__ == "__main__":
    main()
