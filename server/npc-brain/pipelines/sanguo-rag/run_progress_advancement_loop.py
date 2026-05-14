from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_root, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
PIPELINE_ROOT = pipeline_root(REPO_ROOT)
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
DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_OBSERVED_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-label-summary.json")
DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
DEFAULT_EVENTS_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events-summary.json")
DEFAULT_GENERIC_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_FEMALE_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/female-interaction-candidates.jsonl")

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

LOCATION_FROM_CUE_PATTERN = re.compile(
    r"(?:於|在|至|攻打|圍攻|駐守|屯於|赴|入|到)([一-龥]{1,4}(?:州|郡|縣|城|關|渡|津|寨|山|江|河|口))"
)
LOCATION_STRONG_PATTERN = re.compile(r"([一-龥]{1,4}(?:州|郡|縣|城|關|渡|津|寨))")
LOCATION_BAD_PREFIX = {"上", "下", "出", "入", "攻", "守", "聞", "戰", "至", "在", "於"}


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


def resolve_existing_path(path_text: str | Path) -> Path:
    raw_path = Path(path_text)
    if raw_path.is_absolute():
        return raw_path.resolve()

    variants = [raw_path]
    parts = list(raw_path.parts)
    if len(parts) >= 2 and [part.lower() for part in parts[:2]] == ["server", "npc-brain"]:
        stripped = Path(*parts[2:])
        if str(stripped):
            variants.append(stripped)

    search_roots = [REPO_ROOT, REPO_ROOT.parent, REPO_ROOT.parent.parent]
    for root in search_roots:
        for relative_path in variants:
            candidate = (root / relative_path).resolve()
            if candidate.exists():
                return candidate
    return (REPO_ROOT / variants[0]).resolve()


def path_from_progress_inputs(inputs: dict[str, Any], *keys: str, default: str | Path) -> Path:
    for key in keys:
        value = str(inputs.get(key) or "").strip()
        if not value:
            continue
        candidate = resolve_existing_path(value)
        if candidate.exists():
            return candidate
    return resolve_existing_path(default)


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


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


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
    parser.add_argument(
        "--pending-review-limit",
        type=int,
        default=20,
        help="Route to B only when event-review pending count reaches this threshold after preview.",
    )
    parser.add_argument("--same-residual-repeat-limit", type=int, default=2, help="Route to C when the same residual repeats this many A rounds.")
    parser.add_argument("--review-batch-size", type=int, default=10, help="Maximum event-review items to emit into one B review batch artifact.")
    parser.add_argument("--review-decisions", default=None, help="Optional JSON file with B review decisions to apply to the latest batch.")
    parser.add_argument(
        "--auto-review-root-cause",
        action="append",
        default=[],
        help="Auto-generate B decisions for pending items that match these root causes (repeatable).",
    )
    parser.add_argument(
        "--auto-review-location-gap",
        action="store_true",
        help="Shortcut for --auto-review-root-cause 'location gap'.",
    )
    parser.add_argument(
        "--auto-review-answer",
        default="B",
        help="Answer code used by auto-generated review decisions (default: B).",
    )
    parser.add_argument(
        "--auto-review-max-items",
        type=int,
        default=0,
        help="Cap auto-generated decisions per round (0 means all matched pending items).",
    )
    parser.add_argument("--failure-rate-limit", type=float, default=0.2, help="Stop when command failure rate exceeds this.")
    parser.add_argument("--review-queue", default=str(DEFAULT_REVIEW_QUEUE_PATH), help="ETL pilot review queue JSON path.")
    parser.add_argument("--emit-ready-eval", action="store_true", help="Emit pilot-readable evaluation-only ready events for accepted review candidates.")
    parser.add_argument(
        "--same-round-rerun",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Enable same-round rerun: after deterministic repair fills key fields, rerun preview immediately within the same A round.",
    )
    parser.add_argument(
        "--same-round-rerun-max-passes",
        type=int,
        default=1,
        help="Maximum additional same-round rerun passes per A round.",
    )
    parser.add_argument(
        "--same-round-rerun-min-repair-actions",
        type=int,
        default=1,
        help="Minimum location/relationship/boundary repair actions required to trigger a same-round rerun.",
    )
    parser.add_argument(
        "--scoreboard-repair-bridge",
        action="store_true",
        help="Augment edit backlog with scoreboard-driven missing-field repair candidates before each A round.",
    )
    parser.add_argument(
        "--scoreboard-json",
        default=None,
        help="Optional full-roster scoreboard JSON path. If omitted, infer from base-progress ancestors.",
    )
    parser.add_argument(
        "--bridge-fields",
        default="location,relationshipEdges",
        help="Comma-separated missing fields to bridge from scoreboard into repair feed.",
    )
    parser.add_argument(
        "--bridge-max-generals",
        type=int,
        default=200,
        help="Maximum scoreboard target generals injected into bridged edit backlog per A round.",
    )
    parser.add_argument(
        "--bridge-max-per-general",
        type=int,
        default=2,
        help="Maximum candidate rows injected per bridged general.",
    )
    parser.add_argument(
        "--bridge-include-shadow",
        action="store_true",
        help="Include shadow roster rows in scoreboard bridge (default canonical-only).",
    )
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


def parse_bridge_fields(raw_fields: str) -> set[str]:
    allowed = {"location", "relationshipEdges"}
    rows = [token.strip() for token in str(raw_fields or "").split(",")]
    parsed = {token for token in rows if token in allowed}
    return parsed or {"location", "relationshipEdges"}


def infer_scoreboard_path_from_progress(base_progress_path: str | Path) -> Path | None:
    progress_path = resolve_path(base_progress_path)
    for parent in progress_path.parents:
        candidate = parent / "scoreboard" / "full-roster-scoreboard.json"
        if candidate.exists():
            return candidate
    return None


def load_scoreboard_rows(scoreboard_path: Path) -> list[dict[str, Any]]:
    payload = read_json(scoreboard_path)
    if isinstance(payload, dict) and isinstance(payload.get("rows"), list):
        return [row for row in payload.get("rows") or [] if isinstance(row, dict)]
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    return []


def candidate_paths_from_progress(base_progress_path: str | Path) -> list[Path]:
    payload = read_json(resolve_path(base_progress_path))
    inputs = (payload or {}).get("inputs") or {}
    path_texts = [
        str(inputs.get("genericCandidatesPath") or "").strip(),
        str(inputs.get("femaleCandidatesPath") or "").strip(),
        str(inputs.get("sourceEventPacketsPath") or "").strip(),
        str(inputs.get("eventQuestionSeedsPath") or "").strip(),
    ]
    rows: list[Path] = []
    seen: set[str] = set()
    for path_text in path_texts:
        if not path_text:
            continue
        resolved = resolve_path(path_text)
        key = str(resolved)
        if not resolved.exists() or key in seen:
            continue
        seen.add(key)
        rows.append(resolved)
    return rows


def candidate_sort_key(candidate: dict[str, Any]) -> tuple[Any, ...]:
    source_refs = list(candidate.get("sourceRefs") or [])
    try:
        confidence = float(candidate.get("confidence") or 0.0)
    except (TypeError, ValueError):
        confidence = 0.0
    chapter_no = candidate.get("chapterNo")
    try:
        chapter_sort = int(chapter_no)
    except (TypeError, ValueError):
        chapter_sort = 10**9
    return (
        -int(bool(source_refs)),
        -len(source_refs),
        -confidence,
        chapter_sort,
        str(candidate.get("eventKey") or candidate.get("eventId") or ""),
    )


def build_candidate_index(candidate_paths: list[Path]) -> dict[str, list[dict[str, Any]]]:
    index: dict[str, list[dict[str, Any]]] = {}
    for path in candidate_paths:
        for row in read_jsonl(path):
            if str(row.get("reviewStatus") or "").strip().lower() == "ready":
                continue
            raw_general_ids = list(row.get("generalIds") or [])
            if not raw_general_ids and row.get("generalId"):
                raw_general_ids = [row.get("generalId")]
            general_ids = [str(value or "").strip() for value in raw_general_ids if str(value or "").strip()]
            if not general_ids:
                continue
            event_key = str(row.get("eventKey") or row.get("packetId") or row.get("seedId") or row.get("eventId") or "").strip()
            if not event_key:
                continue
            source_refs = list(row.get("sourceRefs") or [])
            source_ref = str(row.get("sourceRef") or "").strip()
            if source_ref and source_ref not in source_refs:
                source_refs.append(source_ref)
            examples = list(row.get("examples") or [])
            summary = row.get("summary") or row.get("claimText") or row.get("seedText")
            source_quote = row.get("sourceQuote") or row.get("quote")
            if not summary and examples:
                summary = str(examples[0])
            if not source_quote and examples:
                source_quote = str(examples[0])
            candidate = {
                "eventKey": event_key,
                "eventId": row.get("eventId"),
                "chapterNo": row.get("chapterNo"),
                "generalIds": general_ids,
                "sourceRefs": source_refs,
                "summary": summary,
                "sourceQuote": source_quote,
                "location": row.get("location"),
                "relationshipEdges": list(row.get("relationshipEdges") or []),
                "moodTags": list(row.get("moodTags") or []),
                "confidence": row.get("confidence") or row.get("seedConfidenceScore") or row.get("edgeConfidence"),
            }
            for general_id in general_ids:
                index.setdefault(general_id, []).append(candidate)
    for general_id, rows in index.items():
        dedup: dict[str, dict[str, Any]] = {}
        for row in rows:
            key = str(row.get("eventKey") or "")
            if not key or key in dedup:
                continue
            dedup[key] = row
        sorted_rows = sorted(dedup.values(), key=candidate_sort_key)
        index[general_id] = sorted_rows
    return index


def bridge_target_rows(
    *,
    scoreboard_rows: list[dict[str, Any]],
    requested_generals: list[str],
    bridge_fields: set[str],
    canonical_only: bool,
    max_generals: int,
) -> list[dict[str, Any]]:
    requested = {str(general_id or "").strip() for general_id in requested_generals if str(general_id or "").strip()}
    rows: list[dict[str, Any]] = []
    for row in scoreboard_rows:
        general_id = str(row.get("generalId") or "").strip()
        if not general_id:
            continue
        if canonical_only and str(row.get("rosterState") or "").strip() != "canonical":
            continue
        if requested and general_id not in requested:
            continue
        if str(row.get("nextLane") or "").strip() != "deterministic-repair":
            continue
        missing_fields = {str(field or "").strip() for field in row.get("missingFields") or []}
        bridged_missing = sorted(missing_fields.intersection(bridge_fields))
        if not bridged_missing:
            continue
        rows.append({
            "generalId": general_id,
            "missingFields": bridged_missing,
            "priorityScore": float(row.get("priorityScore") or 0.0),
            "genericCandidateCount": int(row.get("genericCandidateCount") or 0),
        })
    rows.sort(
        key=lambda row: (
            -len(row["missingFields"]),
            -float(row.get("priorityScore") or 0.0),
            -int(row.get("genericCandidateCount") or 0),
            str(row.get("generalId") or ""),
        )
    )
    if max_generals > 0:
        return rows[:max_generals]
    return rows


def make_bridge_backlog_row(
    *,
    run_id: str,
    round_id: str,
    focus_general_id: str,
    candidate: dict[str, Any],
    missing_fields: list[str],
    scoreboard_path: Path,
) -> dict[str, Any]:
    event_key = str(candidate.get("eventKey") or "").strip()
    candidate_id = f"bridge.{run_id}.{round_id}.{focus_general_id}.{event_key}"
    return {
        "candidateId": candidate_id,
        "focusGeneralId": focus_general_id,
        "answer": "B",
        "eventKey": event_key,
        "chapterNo": candidate.get("chapterNo"),
        "generalIds": list(candidate.get("generalIds") or [focus_general_id]),
        "sourceRefs": list(candidate.get("sourceRefs") or []),
        "summary": candidate.get("summary"),
        "sourceQuote": candidate.get("sourceQuote"),
        "currentLocation": candidate.get("location"),
        "currentRelationshipEdges": list(candidate.get("relationshipEdges") or []),
        "currentMoodTags": list(candidate.get("moodTags") or []),
        "expandedContextRefs": list(candidate.get("sourceRefs") or []),
        "missingFields": list(missing_fields),
        "sourcePath": f"scoreboard-bridge:{repo_relative(scoreboard_path)}",
    }


def build_scoreboard_repair_bridge(
    *,
    args: argparse.Namespace,
    run_root: Path,
    round_id: str,
    base_paths: dict[str, str | Path],
) -> dict[str, Any]:
    if not (args.scoreboard_repair_bridge or args.scoreboard_json):
        return {"enabled": False, "reason": "disabled"}

    bridge_fields = parse_bridge_fields(args.bridge_fields)
    scoreboard_path = resolve_path(args.scoreboard_json) if args.scoreboard_json else infer_scoreboard_path_from_progress(base_paths["baseProgress"])
    if scoreboard_path is None or not scoreboard_path.exists():
        return {"enabled": True, "reason": "scoreboard-not-found", "bridgeFields": sorted(bridge_fields)}

    scoreboard_rows = load_scoreboard_rows(scoreboard_path)
    if not scoreboard_rows:
        return {
            "enabled": True,
            "reason": "scoreboard-empty",
            "bridgeFields": sorted(bridge_fields),
            "scoreboardPath": repo_relative(scoreboard_path),
        }

    candidate_paths = candidate_paths_from_progress(base_paths["baseProgress"])
    if not candidate_paths:
        return {
            "enabled": True,
            "reason": "candidate-paths-missing",
            "bridgeFields": sorted(bridge_fields),
            "scoreboardPath": repo_relative(scoreboard_path),
        }

    candidate_index = build_candidate_index(candidate_paths)
    target_rows = bridge_target_rows(
        scoreboard_rows=scoreboard_rows,
        requested_generals=list(args.general_id),
        bridge_fields=bridge_fields,
        canonical_only=not args.bridge_include_shadow,
        max_generals=max(args.bridge_max_generals, 0),
    )

    source_backlog_path = resolve_path(base_paths["editBacklog"])
    source_backlog_rows = read_jsonl(source_backlog_path)
    existing_keys: set[tuple[str, str]] = set()
    for row in source_backlog_rows:
        key = (
            str(row.get("focusGeneralId") or "").strip(),
            str(row.get("eventKey") or row.get("candidateId") or "").strip(),
        )
        if key[0] and key[1]:
            existing_keys.add(key)

    bridged_rows = list(source_backlog_rows)
    added_rows = 0
    matched_generals: set[str] = set()
    missing_candidate_generals: list[str] = []
    for target in target_rows:
        general_id = str(target.get("generalId") or "").strip()
        if not general_id:
            continue
        candidates = list(candidate_index.get(general_id) or [])
        if not candidates:
            missing_candidate_generals.append(general_id)
            continue
        per_general_count = 0
        for candidate in candidates:
            if per_general_count >= max(args.bridge_max_per_general, 1):
                break
            event_key = str(candidate.get("eventKey") or "").strip()
            key = (general_id, event_key)
            if not event_key or key in existing_keys:
                continue
            bridged_rows.append(
                make_bridge_backlog_row(
                    run_id=args.run_id,
                    round_id=round_id,
                    focus_general_id=general_id,
                    candidate=candidate,
                    missing_fields=list(target.get("missingFields") or []),
                    scoreboard_path=scoreboard_path,
                )
            )
            existing_keys.add(key)
            per_general_count += 1
            added_rows += 1
        if per_general_count > 0:
            matched_generals.add(general_id)

    if added_rows <= 0:
        return {
            "enabled": True,
            "reason": "no-bridge-rows-added",
            "bridgeFields": sorted(bridge_fields),
            "scoreboardPath": repo_relative(scoreboard_path),
            "sourceBacklogPath": repo_relative(source_backlog_path),
            "sourceBacklogCount": len(source_backlog_rows),
            "targetGeneralCount": len(target_rows),
            "targetGeneralMatchedCount": len(matched_generals),
            "targetGeneralMissingCandidateCount": len(missing_candidate_generals),
            "candidatePathCount": len(candidate_paths),
        }

    bridge_root = run_root / "repair-feed-bridge"
    bridged_path = bridge_root / f"{round_id}-bridged-edit-backlog.jsonl"
    write_jsonl(bridged_path, bridged_rows)
    return {
        "enabled": True,
        "reason": "bridged",
        "bridgeFields": sorted(bridge_fields),
        "scoreboardPath": repo_relative(scoreboard_path),
        "candidatePaths": [repo_relative(path) for path in candidate_paths],
        "sourceBacklogPath": repo_relative(source_backlog_path),
        "sourceBacklogCount": len(source_backlog_rows),
        "targetGeneralCount": len(target_rows),
        "targetGeneralMatchedCount": len(matched_generals),
        "targetGeneralMissingCandidateCount": len(missing_candidate_generals),
        "targetGeneralMissingCandidateSample": missing_candidate_generals[:20],
        "addedRowCount": added_rows,
        "bridgedBacklogCount": len(bridged_rows),
        "bridgedEditBacklogPath": repo_relative(bridged_path),
    }


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
    return build_campaign_command_for_round_id(args=args, run_root=run_root, round_id=round_id, base_paths=base_paths)


def build_campaign_command_for_round_id(
    *,
    args: argparse.Namespace,
    run_root: Path,
    round_id: str,
    base_paths: dict[str, str | Path],
) -> tuple[str, list[str], Path, dict[str, Path]]:
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
        "--human-question-threshold",
        str(max(args.pending_review_limit, 1)),
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


def _coerce_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def repair_signal_count_from_summary(repair_task_summary: dict[str, Any]) -> int:
    counts = (repair_task_summary or {}).get("repairActionCounts")
    if not isinstance(counts, dict):
        return 0
    score = 0
    for raw_key, raw_value in counts.items():
        key = str(raw_key or "").strip().lower()
        if "location" in key or "relationship" in key or "boundary" in key:
            score += max(_coerce_int(raw_value), 0)
    return score


def should_trigger_same_round_rerun(
    *,
    args: argparse.Namespace,
    rerun_count_so_far: int,
    success: bool,
    pending_count: int,
    repair_signal_count: int,
) -> bool:
    if not bool(args.same_round_rerun):
        return False
    if not success:
        return False
    if rerun_count_so_far >= max(args.same_round_rerun_max_passes, 0):
        return False
    if pending_count <= 0:
        return False
    if pending_count >= max(args.pending_review_limit, 1):
        return False
    if repair_signal_count < max(args.same_round_rerun_min_repair_actions, 1):
        return False
    return True


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

            # Keep missingFields in sync when human/auto decisions provide concrete edits.
            current_missing = [str(field or "").strip() for field in question.get("missingFields") or [] if str(field or "").strip()]
            remaining_missing: list[str] = []
            for field in current_missing:
                if field == "location":
                    if str(merged_edits.get("location") or "").strip():
                        continue
                elif field == "relationshipEdges":
                    if list(merged_edits.get("relationshipEdges") or []):
                        continue
                elif field == "sourceRefs":
                    if list(question.get("sourceRefs") or []):
                        continue
                elif field == "generalIds":
                    if list(question.get("generalIds") or []):
                        continue
                remaining_missing.append(field)
            question["missingFields"] = remaining_missing
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


def normalize_root_cause_values(values: list[str], *, include_location_gap: bool) -> set[str]:
    normalized = {str(value or "").strip().lower() for value in values if str(value or "").strip()}
    if include_location_gap:
        normalized.add("location gap")
    return normalized


def extract_location_candidate(text: Any) -> str | None:
    raw_text = str(text or "").strip()
    if not raw_text:
        return None
    compact = " ".join(raw_text.split())
    for pattern in (LOCATION_FROM_CUE_PATTERN, LOCATION_STRONG_PATTERN):
        for match in pattern.finditer(compact):
            value = str(match.group(1) or "").strip(" ，。、《》「」『』()（）[]")
            if not value:
                continue
            if len(value) < 2 or len(value) > 5:
                continue
            if value[0] in LOCATION_BAD_PREFIX:
                continue
            return value
    return None


def infer_location_from_item(item: dict[str, Any], edits: dict[str, Any]) -> str | None:
    existing = str(edits.get("location") or "").strip()
    if existing:
        return existing
    texts = [
        edits.get("summary"),
        item.get("summary"),
        item.get("sourceQuote"),
    ]
    for text in texts:
        candidate = extract_location_candidate(text)
        if candidate:
            return candidate
    return None


def has_required_auto_review_edits(root_cause_key: str, edits: dict[str, Any]) -> bool:
    if root_cause_key == "location gap":
        return bool(str(edits.get("location") or "").strip())
    if root_cause_key == "relationship edge/type":
        return bool(list(edits.get("relationshipEdges") or []))
    return True


def build_auto_review_decisions(
    *,
    items: list[dict[str, Any]],
    root_causes: set[str],
    answer: str,
    max_items: int,
) -> tuple[list[dict[str, Any]], dict[str, int], dict[str, int]]:
    decisions: list[dict[str, Any]] = []
    root_cause_counts: dict[str, int] = {}
    skipped_missing_edits: dict[str, int] = {}
    seen_keys: set[str] = set()
    normalized_answer = str(answer or "B").strip().upper() or "B"
    max_count = max(int(max_items), 0)

    for item in items:
        root_cause = str(item.get("rootCause") or "").strip()
        root_cause_key = root_cause.lower()
        if root_causes and root_cause_key not in root_causes:
            continue
        edits = dict(item.get("edits") or {})
        inferred_location = infer_location_from_item(item, edits)
        if root_cause_key == "location gap" and inferred_location and not str(edits.get("location") or "").strip():
            edits["location"] = inferred_location
        if not has_required_auto_review_edits(root_cause_key, edits):
            bucket = root_cause or "unknown"
            skipped_missing_edits[bucket] = int(skipped_missing_edits.get(bucket) or 0) + 1
            continue

        candidate_id = str(item.get("candidateId") or "").strip()
        event_key = str(item.get("eventKey") or "").strip()
        dedup_key = candidate_id or event_key
        if not dedup_key or dedup_key in seen_keys:
            continue

        seen_keys.add(dedup_key)
        decision: dict[str, Any] = {
            "answer": normalized_answer,
            "notes": f"auto-review {root_cause or 'pending'}",
        }
        if candidate_id:
            decision["candidateId"] = candidate_id
        if event_key:
            decision["eventKey"] = event_key
        if edits:
            decision["edits"] = edits
        decisions.append(decision)
        root_cause_counts[root_cause or "unknown"] = int(root_cause_counts.get(root_cause or "unknown") or 0) + 1
        if max_count > 0 and len(decisions) >= max_count:
            break
    return decisions, root_cause_counts, skipped_missing_edits


def write_auto_review_decisions_file(
    *,
    run_root: Path,
    source_round_id: str,
    decisions: list[dict[str, Any]],
    root_causes: set[str],
    answer: str,
    root_cause_counts: dict[str, int],
) -> Path:
    auto_root = run_root / "auto-review-decisions"
    decision_path = auto_root / f"{source_round_id}-auto-review-decisions.json"
    payload = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "progress-advancement-auto-review-decisions",
        "canonicalWrites": False,
        "sourceRoundId": source_round_id,
        "rootCauseFilter": sorted(root_causes),
        "answer": str(answer or "B").strip().upper() or "B",
        "decisionCount": len(decisions),
        "rootCauseCounts": root_cause_counts,
        "decisions": decisions,
    }
    write_json(decision_path, payload)
    return decision_path


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
    base_progress_payload = read_json(resolve_existing_path(base_paths["baseProgress"]))
    base_progress_inputs = base_progress_payload.get("inputs") if isinstance(base_progress_payload.get("inputs"), dict) else {}
    observed_mentions_path = path_from_progress_inputs(
        base_progress_inputs,
        "observedMentionsPath",
        "mergedObservedMentionsPath",
        default=DEFAULT_OBSERVED_MENTIONS_PATH,
    )
    observed_summary_path = path_from_progress_inputs(
        base_progress_inputs,
        "observedSummaryPath",
        "mergedObservedSummaryPath",
        default=DEFAULT_OBSERVED_SUMMARY_PATH,
    )
    stable_knowledge_path = path_from_progress_inputs(
        base_progress_inputs,
        "stableKnowledgePath",
        default=DEFAULT_STABLE_KNOWLEDGE_PATH,
    )
    events_summary_path = path_from_progress_inputs(
        base_progress_inputs,
        "eventsSummaryPath",
        default=DEFAULT_EVENTS_SUMMARY_PATH,
    )
    generic_candidates_path = path_from_progress_inputs(
        base_progress_inputs,
        "genericCandidatesPath",
        default=DEFAULT_GENERIC_CANDIDATES_PATH,
    )
    female_candidates_path = path_from_progress_inputs(
        base_progress_inputs,
        "femaleCandidatesPath",
        default=DEFAULT_FEMALE_CANDIDATES_PATH,
    )
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
            "--observed-mentions",
            str(observed_mentions_path),
            "--stable-knowledge",
            str(stable_knowledge_path),
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
            "--observed-mentions",
            str(observed_mentions_path),
            "--stable-knowledge",
            str(stable_knowledge_path),
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
        "--stable-knowledge",
        str(stable_knowledge_path),
        "--observed-summary",
        str(observed_summary_path),
        "--events-summary",
        str(events_summary_path),
        "--ready-events",
        repo_relative(outputs["baseEvents"]),
        "--generic-candidates",
        str(generic_candidates_path),
        "--female-candidates",
        str(female_candidates_path),
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
    if pending_count >= pending_limit:
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
        f"- Human Question Threshold: `{summary['policy'].get('pendingReviewLimit')}`",
        "- Preview Policy: `deterministic -> agent -> human`",
        f"- Total Delta Overall: `{summary.get('totalDeltaOverallPercent')}`",
        f"- Baseline Manifest: `{summary.get('baselineManifestOutputPath') or '-'}`",
        "",
        "## Round Summaries",
        "",
        "| Round | Campaign Round ID | Selected Generals | Baseline | Result | Delta | Event Pending | Repeated | Same-Round Reruns | B Review | Success |",
        "|---:|---|---|---:|---:|---:|---:|---:|---:|---|---|",
    ]
    for item in summary.get("rounds") or []:
        campaign = item.get("campaignSummary") or {}
        lines.append(
            "| {round} | `{campaign_round}` | `{generals}` | `{base}` | `{result}` | `{delta}` | `{pending}` | `{repeated}` | `{reruns}` | `{b_review}` | `{success}` |".format(
                round=item.get("roundIndex"),
                campaign_round=item.get("campaignRoundId") or item.get("roundId"),
                generals=", ".join(campaign.get("selectedGenerals") or []) or "-",
                base=campaign.get("baselineOverallPercent"),
                result=campaign.get("resultOverallPercent"),
                delta=campaign.get("deltaOverallPercent"),
                pending=item.get("eventReviewPendingCountAfterReview") or item.get("eventReviewPendingCountAfterRound") or 0,
                repeated=item.get("repeatedResidualCountAfterReview") or item.get("repeatedResidualCountAfterRound") or 0,
                reruns=item.get("sameRoundRerunPassCount") or 0,
                b_review="yes" if item.get("bReviewSummary") else "-",
                success=item.get("success"),
            )
        )
    if any((item.get("sameRoundPasses") or []) for item in (summary.get("rounds") or [])):
        lines.extend(["", "## Same-Round Rerun Passes", ""])
        for item in summary.get("rounds") or []:
            passes = list(item.get("sameRoundPasses") or [])
            if not passes:
                continue
            lines.append(f"- round `{item.get('roundIndex')}`")
            for rerun in passes:
                lines.append(
                    "  - pass=`{pass_index}` roundId=`{round_id}` delta=`{delta}` pending=`{pending}` repairSignals=`{signals}` rerunTriggered=`{triggered}`".format(
                        pass_index=rerun.get("passIndex"),
                        round_id=rerun.get("roundId"),
                        delta=rerun.get("deltaOverallPercent"),
                        pending=rerun.get("eventReviewPendingCount"),
                        signals=rerun.get("repairSignalCount"),
                        triggered=rerun.get("rerunTriggered"),
                    )
                )
    if summary.get("reviewBatches"):
        lines.extend(["", "## B Review Batches", ""])
        for batch in summary.get("reviewBatches") or []:
            lines.append(
                f"- `{batch.get('sourceRoundId')}` items=`{batch.get('selectedItemCount')}/{batch.get('itemCount')}` md=`{batch.get('markdownPath')}`"
            )
    if summary.get("scoreboardBridgeRounds"):
        lines.extend(["", "## Scoreboard Repair Bridge", ""])
        for item in summary.get("scoreboardBridgeRounds") or []:
            lines.append(
                "- round=`{round}` reason=`{reason}` addedRows=`{added}` backlog=`{backlog}` matchedGenerals=`{matched}/{target}`".format(
                    round=item.get("roundIndex"),
                    reason=item.get("reason"),
                    added=item.get("addedRowCount") or 0,
                    backlog=item.get("bridgedBacklogCount") or item.get("sourceBacklogCount") or 0,
                    matched=item.get("targetGeneralMatchedCount") or 0,
                    target=item.get("targetGeneralCount") or 0,
                )
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
    scoreboard_bridge_history: list[dict[str, Any]] = []

    weak_improvement_count = 0
    failure_count = 0
    b_review_count = 0
    stop_reason: str | None = None
    review_decisions_consumed = False
    last_round_pending_items: list[dict[str, Any]] = []
    last_repeated_items: list[dict[str, Any]] = []
    last_pilot_pending_count = pending_review_count(resolve_path(args.review_queue))
    last_pending_count = last_pilot_pending_count
    configured_auto_review_root_causes = normalize_root_cause_values(
        list(args.auto_review_root_cause or []),
        include_location_gap=bool(args.auto_review_location_gap),
    )

    for round_index in range(1, max(args.max_rounds, 1) + 1):
        if wall_time_exceeded(started_monotonic, args.max_wall_time_minutes):
            stop_reason = "max-wall-time-minutes"
            break
        round_base_paths = dict(base_paths)
        bridge_summary = build_scoreboard_repair_bridge(
            args=args,
            run_root=run_root,
            round_id=f"{args.run_id}-a{round_index}",
            base_paths=round_base_paths,
        )
        if bridge_summary.get("bridgedEditBacklogPath"):
            round_base_paths["editBacklog"] = str(bridge_summary["bridgedEditBacklogPath"])
        scoreboard_bridge_history.append({
            "roundIndex": round_index,
            **bridge_summary,
        })

        edit_backlog_count = jsonl_record_count(round_base_paths["editBacklog"])
        if edit_backlog_count == 0:
            stop_reason = "repair-backlog-exhausted"
            break

        round_id_base = f"{args.run_id}-a{round_index}"
        pass_base_paths = dict(round_base_paths)
        round_passes: list[dict[str, Any]] = []
        rerun_count = 0
        final_round_id = round_id_base
        final_summary_path = round_output_paths(run_root, round_id_base)["campaignSummary"]
        final_output_paths = round_output_paths(run_root, round_id_base)
        final_command_result: dict[str, Any] = {}
        final_campaign_summary: dict[str, Any] = {}
        final_repair_task_summary: dict[str, Any] = {}
        round_pending_items: list[dict[str, Any]] = []
        success = False

        while True:
            pass_round_id = round_id_base if rerun_count <= 0 else f"{round_id_base}-rerun{rerun_count}"
            _, command, summary_path, output_paths = build_campaign_command_for_round_id(
                args=args,
                run_root=run_root,
                round_id=pass_round_id,
                base_paths=pass_base_paths,
            )
            command_result = run_command(command, args.dry_run)
            pass_success = int(command_result["returnCode"] or 0) == 0
            if not pass_success:
                failure_count += 1

            campaign_summary = read_json(summary_path)
            if args.dry_run and not campaign_summary:
                campaign_summary = {
                    "mode": "repair-review-campaign",
                    "canonicalWrites": False,
                    "roundId": pass_round_id,
                    "selectedGenerals": list(args.general_id),
                    "deltaOverallPercent": None,
                }

            repair_task_summary = {}
            repair_task_summary_path = (campaign_summary or {}).get("repairTaskSummaryPath")
            if repair_task_summary_path:
                repair_task_summary = read_json(resolve_path(repair_task_summary_path))

            pass_pending_items = collect_round_review_items(output_paths["reviewSnapshotRoot"])
            repair_signal_count = repair_signal_count_from_summary(repair_task_summary)
            rerun_triggered = should_trigger_same_round_rerun(
                args=args,
                rerun_count_so_far=rerun_count,
                success=pass_success,
                pending_count=len(pass_pending_items),
                repair_signal_count=repair_signal_count,
            )
            round_passes.append(
                {
                    "passIndex": rerun_count + 1,
                    "roundId": pass_round_id,
                    "success": pass_success,
                    "summaryPath": repo_relative(summary_path),
                    "command": command_result,
                    "deltaOverallPercent": (campaign_summary or {}).get("deltaOverallPercent"),
                    "eventReviewPendingCount": len(pass_pending_items),
                    "rootCauseCounts": summarize_root_causes(pass_pending_items),
                    "repairSignalCount": repair_signal_count,
                    "rerunTriggered": bool(rerun_triggered),
                }
            )

            final_round_id = pass_round_id
            final_summary_path = summary_path
            final_output_paths = output_paths
            final_command_result = command_result
            final_campaign_summary = campaign_summary
            final_repair_task_summary = repair_task_summary
            round_pending_items = pass_pending_items
            success = pass_success

            if pass_success:
                pass_base_paths = {
                    "editBacklog": output_paths["editBacklog"],
                    "baseEvents": output_paths["baseEvents"],
                    "baseRelationshipEvidence": output_paths["baseRelationshipEvidence"],
                    "baseProgress": output_paths["baseProgress"],
                }
                if args.emit_ready_eval:
                    pass_base_paths["readyEvalEvents"] = output_paths["readyEvalEvents"]

            if rerun_triggered:
                rerun_count += 1
                continue
            break

        delta = (final_campaign_summary or {}).get("deltaOverallPercent")
        try:
            delta_value = float(delta)
        except (TypeError, ValueError):
            delta_value = args.no_improvement_threshold if args.dry_run else 0.0

        if delta_value < args.no_improvement_threshold:
            weak_improvement_count += 1
        else:
            weak_improvement_count = 0

        last_pilot_pending_count = pending_review_count(resolve_path(args.review_queue))
        record_residual_history(residual_history, round_pending_items)
        repeated_items = repeated_residuals_from_history(residual_history, round_pending_items, max(args.same_residual_repeat_limit, 1))
        last_round_pending_items = round_pending_items
        last_repeated_items = repeated_items
        last_pending_count = len(round_pending_items) if round_pending_items else last_pilot_pending_count

        failure_rate = failure_count / max(round_index, 1)
        round_record = {
            "roundIndex": round_index,
            "roundId": round_id_base,
            "campaignRoundId": final_round_id,
            "success": success,
            "summaryPath": repo_relative(final_summary_path),
            "baselineInputs": {key: resolve_baseline_paths(round_base_paths)[key] for key in sorted(round_base_paths)},
            "nextBaselineCandidates": {
                key: repo_relative(path)
                for key, path in final_output_paths.items()
                if key in {"editBacklog", "baseEvents", "baseRelationshipEvidence", "baseProgress", "readyEvalEvents"}
            },
            "command": final_command_result,
            "sameRoundPasses": round_passes,
            "sameRoundRerunPassCount": max(len(round_passes) - 1, 0),
            "campaignSummary": final_campaign_summary,
            "repairTaskSummary": {
                "priorityCounts": (final_repair_task_summary or {}).get("priorityCounts") or {},
                "repairActionCounts": (final_repair_task_summary or {}).get("repairActionCounts") or {},
                "topFocusGenerals": (final_repair_task_summary or {}).get("topFocusGenerals") or {},
            },
            "pilotPendingReviewCountAfterRound": last_pilot_pending_count,
            "eventReviewPendingCountAfterRound": len(round_pending_items),
            "rootCauseCountsAfterRound": summarize_root_causes(round_pending_items),
            "repeatedResidualCountAfterRound": len(repeated_items),
            "repeatedResidualsPreview": repeated_items[:5],
            "weakImprovementCount": weak_improvement_count,
            "failureRate": round(failure_rate, 4),
        }
        if bridge_summary:
            round_record["scoreboardBridge"] = bridge_summary

        if round_pending_items:
            round_record["previewOnlyPendingCount"] = len(round_pending_items)

        rounds.append(round_record)

        if success:
            base_paths = {
                "editBacklog": final_output_paths["editBacklog"],
                "baseEvents": final_output_paths["baseEvents"],
                "baseRelationshipEvidence": final_output_paths["baseRelationshipEvidence"],
                "baseProgress": final_output_paths["baseProgress"],
            }
            if args.emit_ready_eval:
                latest_ready_eval_events = final_output_paths["readyEvalEvents"]
                base_paths["readyEvalEvents"] = final_output_paths["readyEvalEvents"]

        decision_path_for_round: Path | None = resolve_path(args.review_decisions) if args.review_decisions else None
        if (
            decision_path_for_round is None
            and round_pending_items
            and not review_decisions_consumed
            and configured_auto_review_root_causes
        ):
            auto_decisions, auto_root_cause_counts, auto_skipped_missing_edits = build_auto_review_decisions(
                items=round_pending_items,
                root_causes=configured_auto_review_root_causes,
                answer=args.auto_review_answer,
                max_items=max(args.auto_review_max_items, 0),
            )
            if auto_decisions:
                auto_decision_path = write_auto_review_decisions_file(
                    run_root=run_root,
                    source_round_id=final_round_id,
                    decisions=auto_decisions,
                    root_causes=configured_auto_review_root_causes,
                    answer=args.auto_review_answer,
                    root_cause_counts=auto_root_cause_counts,
                )
                decision_path_for_round = auto_decision_path
                round_record["autoReviewDecision"] = {
                    "decisionPath": repo_relative(auto_decision_path),
                    "decisionCount": len(auto_decisions),
                    "answer": str(args.auto_review_answer or "B").strip().upper() or "B",
                    "rootCauseCounts": auto_root_cause_counts,
                    "rootCauseFilter": sorted(configured_auto_review_root_causes),
                    "skippedMissingEditCounts": auto_skipped_missing_edits,
                }
            elif auto_skipped_missing_edits:
                round_record["autoReviewDecision"] = {
                    "decisionPath": None,
                    "decisionCount": 0,
                    "answer": str(args.auto_review_answer or "B").strip().upper() or "B",
                    "rootCauseCounts": {},
                    "rootCauseFilter": sorted(configured_auto_review_root_causes),
                    "skippedMissingEditCounts": auto_skipped_missing_edits,
                }

        if decision_path_for_round and round_pending_items and not review_decisions_consumed:
            decision_summary = apply_review_decisions_to_root(final_output_paths["reviewSnapshotRoot"], decision_path_for_round, args.dry_run)
            round_record["reviewDecisionApplication"] = decision_summary
            if int(decision_summary.get("updatedQuestionCount") or 0) > 0:
                review_decisions_consumed = True
                b_review_count += 1
                b_review_summary, base_paths = run_b_review_merge(
                    run_root=run_root,
                    source_round_id=final_round_id,
                    review_root=final_output_paths["reviewSnapshotRoot"],
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

                round_pending_items = collect_round_review_items(final_output_paths["reviewSnapshotRoot"])
                repeated_items = repeated_residuals_from_history(residual_history, round_pending_items, max(args.same_residual_repeat_limit, 1))
                last_round_pending_items = round_pending_items
                last_repeated_items = repeated_items
                last_pending_count = len(round_pending_items) if round_pending_items else last_pilot_pending_count
                round_record["eventReviewPendingCountAfterReview"] = len(round_pending_items)
                round_record["rootCauseCountsAfterReview"] = summarize_root_causes(round_pending_items)
                round_record["repeatedResidualCountAfterReview"] = len(repeated_items)

                if round_index < max(args.max_rounds, 1) and b_review_count < max(args.max_ab_cycles, 1):
                    continue

        pending_threshold = max(args.pending_review_limit, 1)
        should_surface_human_mcq = len(round_pending_items) >= pending_threshold
        round_record["surfaceHumanMcq"] = should_surface_human_mcq
        round_record["pendingReviewThreshold"] = pending_threshold
        if should_surface_human_mcq and not review_decisions_consumed:
            batch_info = write_review_batch(
                run_root=run_root,
                run_id=args.run_id,
                source_round_id=final_round_id,
                items=round_pending_items,
                pilot_pending_count=last_pilot_pending_count,
                batch_size=max(args.review_batch_size, 1),
            )
            review_batches.append(batch_info)
            round_record["reviewBatch"] = batch_info
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

    location_gap_first: int | None = None
    location_gap_last: int | None = None
    if rounds:
        first_counts = dict((rounds[0].get("rootCauseCountsAfterRound") or {}))
        last_round = rounds[-1]
        last_counts = dict(
            (last_round.get("rootCauseCountsAfterReview") or {})
            or (last_round.get("rootCauseCountsAfterRound") or {})
        )
        location_gap_first = int(first_counts.get("location gap") or 0)
        location_gap_last = int(last_counts.get("location gap") or 0)

    location_gap_delta: int | None = None
    if location_gap_first is not None and location_gap_last is not None:
        location_gap_delta = int(location_gap_last - location_gap_first)

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
            "humanQuestionThreshold": args.pending_review_limit,
            "sameResidualRepeatLimit": args.same_residual_repeat_limit,
            "reviewBatchSize": args.review_batch_size,
            "failureRateLimit": args.failure_rate_limit,
            "reviewerPreset": args.reviewer_preset,
            "reviewerProvider": args.reviewer_provider,
            "stepTimeoutSeconds": args.step_timeout_seconds,
            "previewPolicy": "deterministic -> agent -> human",
            "emitReadyEval": args.emit_ready_eval,
            "sameRoundRerun": bool(args.same_round_rerun),
            "sameRoundRerunMaxPasses": args.same_round_rerun_max_passes,
            "sameRoundRerunMinRepairActions": args.same_round_rerun_min_repair_actions,
            "scoreboardRepairBridge": bool(args.scoreboard_repair_bridge or args.scoreboard_json),
            "scoreboardJson": args.scoreboard_json,
            "bridgeFields": sorted(parse_bridge_fields(args.bridge_fields)),
            "bridgeMaxGenerals": args.bridge_max_generals,
            "bridgeMaxPerGeneral": args.bridge_max_per_general,
            "bridgeIncludeShadow": bool(args.bridge_include_shadow),
            "autoReviewRootCauses": sorted(configured_auto_review_root_causes),
            "autoReviewAnswer": str(args.auto_review_answer or "B").strip().upper() or "B",
            "autoReviewMaxItems": int(args.auto_review_max_items),
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
        "locationGapStats": {
            "firstRoundAfterA": location_gap_first,
            "lastRoundAfterAorB": location_gap_last,
            "delta": location_gap_delta,
            "improved": bool(location_gap_delta is not None and location_gap_delta < 0),
        },
        "touchedGenerals": touched_generals,
        "runtimeReadiness": runtime_readiness,
        "scoreboardBridgeRounds": scoreboard_bridge_history,
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
