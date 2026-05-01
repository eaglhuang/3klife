from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from relationship_type_refinement import refine_relationship_type


DEFAULT_BASE_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_RELATIONSHIP_EVIDENCE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-evidence/source-grounded-relationship-edges.jsonl")
DEFAULT_REVIEW_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stage enriched A review answers as ready event candidates without canonical writes.")
    parser.add_argument("--review-root", action="append", default=[], help="Review root to scan. Can be repeated.")
    parser.add_argument("--base-events", default=str(DEFAULT_BASE_EVENTS_PATH), help="Canonical ready events JSONL used as merge base.")
    parser.add_argument("--base-relationship-evidence", default=str(DEFAULT_RELATIONSHIP_EVIDENCE_PATH), help="Source-grounded relationship evidence JSONL used as merge base.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--round-id", default="current")
    parser.add_argument("--core-general-id", action="append", default=[], help="Optional filter to these focus generalIds.")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


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


def review_files(roots: list[Path]) -> list[Path]:
    files: list[Path] = []
    for root in roots:
        if root.is_file():
            files.append(root)
        elif root.exists():
            files.extend(root.glob("**/event-review-answers*.enriched.todo.json"))
    return sorted(set(files))


def question_answer(question: dict[str, Any]) -> str:
    return str(question.get("answer") or question.get("suggestedAnswer") or "").strip().upper()[:1]


def question_focus_general(payload: dict[str, Any], question: dict[str, Any]) -> str:
    focus = str(payload.get("generalId") or "").strip()
    if focus:
        return focus
    for general_id in question.get("generalIds") or []:
        value = str(general_id or "").strip()
        if value:
            return value
    return "unknown"


def has_ready_shape(question: dict[str, Any]) -> bool:
    edits = question.get("edits") or {}
    return bool(
        question.get("sourceRefs")
        and question.get("generalIds")
        and (edits.get("summary") or question.get("summary"))
        and edits.get("location")
        and edits.get("relationshipEdges")
    )


def ready_event_from_question(payload: dict[str, Any], question: dict[str, Any], source_path: Path) -> dict[str, Any]:
    edits = question.get("edits") or {}
    focus_general_id = question_focus_general(payload, question)
    event_key = str(edits.get("eventKey") or question.get("eventKey") or question.get("candidateId") or "reviewed-a")
    source_refs = list(question.get("sourceRefs") or [])
    event_id_seed = f"{focus_general_id}.{event_key}.{'.'.join(source_refs)}"
    return {
        "eventId": f"romance.reviewed-a.{slug(event_id_seed)}",
        "chapterNo": question.get("chapterNo"),
        "eventKey": event_key,
        "eventType": "reviewed_source_event",
        "subtype": "core_person_reviewed_a",
        "generalIds": list(question.get("generalIds") or []),
        "location": edits.get("location"),
        "summary": edits.get("summary") or question.get("summary"),
        "sourceQuote": question.get("sourceQuote"),
        "relationshipEdges": list(edits.get("relationshipEdges") or []),
        "moodTags": list(edits.get("moodTags") or []) + ["reviewed-a-stage"],
        "affectTags": list(edits.get("affectTags") or []),
        "aptitudeTags": list(edits.get("aptitudeTags") or []),
        "roleActivityTags": list(edits.get("roleActivityTags") or []),
        "activitySeedHints": list(edits.get("activitySeedHints") or []),
        "choiceWeightHints": list(edits.get("choiceWeightHints") or []),
        "decisionWeightHints": list(edits.get("decisionWeightHints") or []),
        "itemRefs": list(edits.get("itemRefs") or []),
        "confidence": question.get("confidence") or 0.72,
        "sourceRefs": source_refs,
        "unresolvedParticipants": [],
        "extractionMode": "reviewed-a-stage-v1",
        "reviewStatus": "accepted-review-candidate",
        "canonicalWrites": False,
        "reviewSourcePath": str(source_path),
    }


def collect_candidates(paths: list[Path], core_general_ids: set[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    ready_candidates: list[dict[str, Any]] = []
    edit_backlog: list[dict[str, Any]] = []
    answer_counts: Counter[str] = Counter()
    ready_counts: Counter[str] = Counter()
    skipped_counts: Counter[str] = Counter()
    for path in paths:
        payload = read_json(path)
        for question in payload.get("questions") or []:
            focus_general_id = question_focus_general(payload, question)
            if core_general_ids and focus_general_id not in core_general_ids:
                continue
            answer = question_answer(question)
            answer_counts[(focus_general_id, answer)] += 1
            if answer == "A" and has_ready_shape(question):
                ready_candidates.append(ready_event_from_question(payload, question, path))
                ready_counts[focus_general_id] += 1
            elif answer == "A":
                skipped_counts[focus_general_id] += 1
            elif answer == "B":
                edits = question.get("edits") or {}
                edit_backlog.append({
                    "candidateId": question.get("candidateId"),
                    "focusGeneralId": focus_general_id,
                    "answer": answer,
                    "eventKey": question.get("eventKey"),
                    "chapterNo": question.get("chapterNo"),
                    "generalIds": question.get("generalIds") or [],
                    "sourceRefs": question.get("sourceRefs") or [],
                    "summary": edits.get("summary") or question.get("summary"),
                    "sourceQuote": question.get("sourceQuote"),
                    "currentLocation": edits.get("location"),
                    "currentRelationshipEdges": list(edits.get("relationshipEdges") or []),
                    "currentMoodTags": list(edits.get("moodTags") or []),
                    "expandedContextRefs": [item.get("sourceRef") for item in question.get("expandedContext") or [] if item.get("sourceRef")],
                    "missingFields": question.get("missingFields") or [],
                    "sourcePath": str(path),
                })
    return ready_candidates, edit_backlog, {
        "answerCountsByGeneral": {f"{general_id}:{answer}": count for (general_id, answer), count in sorted(answer_counts.items())},
        "readyCandidateCountsByGeneral": dict(sorted(ready_counts.items())),
        "skippedACountsByGeneral": dict(sorted(skipped_counts.items())),
    }


def merge_events(base_events: list[dict[str, Any]], staged_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for event in base_events + staged_events:
        event_id = str(event.get("eventId") or "").strip()
        if not event_id or event_id in seen:
            continue
        seen.add(event_id)
        merged.append(event)
    return merged


def relationship_key(edge: dict[str, Any]) -> tuple[str, str, str, str]:
    refs = edge.get("evidenceRefs") or []
    return (
        str(edge.get("fromId") or ""),
        str(edge.get("toId") or ""),
        str(edge.get("type") or ""),
        str(refs[0] if refs else ""),
    )


def relationship_evidence_from_events(staged_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for event in staged_events:
        for edge in event.get("relationshipEdges") or []:
            from_id = str(edge.get("fromId") or "").strip()
            to_id = str(edge.get("toId") or "").strip()
            if not from_id or not to_id:
                continue
            row = {
                "fromId": from_id,
                "toId": to_id,
                "type": edge.get("type") or "reviewed_relationship",
                "originalType": edge.get("type") or "reviewed_relationship",
                "evidenceRefs": list(edge.get("evidenceRefs") or event.get("sourceRefs") or []),
                "edgeConfidence": edge.get("edgeConfidence") or event.get("confidence") or 0.72,
                "edgeStrength": edge.get("edgeStrength") or 0.7,
                "sourceQuote": event.get("sourceQuote"),
                "chapterNo": event.get("chapterNo"),
                "eventId": event.get("eventId"),
                "extractionMode": "reviewed-a-relationship-stage-v1",
                "reviewStatus": "accepted-review-candidate",
                "canonicalWrites": False,
            }
            refined_type, reasons = refine_relationship_type(row, event.get("sourceQuote") or "")
            row["type"] = refined_type
            row["refinementReasons"] = reasons
            rows.append(row)
    return rows


def merge_relationship_evidence(base_rows: list[dict[str, Any]], staged_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for edge in base_rows + staged_rows:
        key = relationship_key(edge)
        if key in seen:
            continue
        seen.add(key)
        merged.append(edge)
    return merged


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Reviewed A Ready Event Staging",
        "",
        f"- Round ID: `{report['roundId']}`",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        f"- Review Files: `{report['reviewFileCount']}`",
        f"- Base Events: `{report['baseEventCount']}`",
        f"- Staged Ready Candidates: `{report['stagedReadyCandidateCount']}`",
        f"- Staged Relationship Evidence: `{report['stagedRelationshipEvidenceCount']}`",
        f"- B Edit Backlog: `{report['editBacklogCount']}`",
        f"- Merged Ready Events: `{report['mergedReadyEventCount']}`",
        f"- Merged Relationship Evidence: `{report['mergedRelationshipEvidenceCount']}`",
        "",
        "## Ready Candidates By General",
        "",
    ]
    for general_id, count in report["summary"]["readyCandidateCountsByGeneral"].items():
        lines.append(f"- `{general_id}`: `{count}`")
    lines.extend(["", "## Outputs", ""])
    for key, value in report["outputs"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    roots = [Path(path) for path in (args.review_root or [str(DEFAULT_REVIEW_ROOT)])]
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    candidates_path = output_root / f"{args.round_id}-reviewed-a-ready-candidates.jsonl"
    edit_backlog_path = output_root / f"{args.round_id}-reviewed-b-edit-backlog.jsonl"
    merged_path = output_root / f"{args.round_id}-staged-ready-events.jsonl"
    relationships_path = output_root / f"{args.round_id}-staged-relationship-evidence.jsonl"
    report_path = output_root / f"{args.round_id}-ready-staging.json"
    markdown_path = output_root / f"{args.round_id}-ready-staging.md"
    outputs = [candidates_path, edit_backlog_path, merged_path, relationships_path, report_path, markdown_path]
    if not args.overwrite and any(path.exists() for path in outputs):
        raise FileExistsError("Staging outputs already exist. Re-run with --overwrite.")

    paths = review_files(roots)
    ready_candidates, edit_backlog, summary = collect_candidates(paths, set(args.core_general_id or []))
    base_events = read_jsonl(Path(args.base_events))
    base_relationships = read_jsonl(Path(args.base_relationship_evidence))
    merged_events = merge_events(base_events, ready_candidates)
    staged_relationships = relationship_evidence_from_events(ready_candidates)
    merged_relationships = merge_relationship_evidence(base_relationships, staged_relationships)
    report = {
        "version": "1.0.0",
        "roundId": args.round_id,
        "generatedAt": utc_now(),
        "mode": "reviewed-a-ready-event-staging",
        "canonicalWrites": False,
        "inputs": {
            "reviewRoots": [str(root) for root in roots],
            "baseEvents": args.base_events,
            "baseRelationshipEvidence": args.base_relationship_evidence,
            "coreGeneralIds": args.core_general_id,
        },
        "reviewFileCount": len(paths),
        "baseEventCount": len(base_events),
        "baseRelationshipEvidenceCount": len(base_relationships),
        "stagedReadyCandidateCount": len(ready_candidates),
        "stagedRelationshipEvidenceCount": len(staged_relationships),
        "editBacklogCount": len(edit_backlog),
        "mergedReadyEventCount": len(merged_events),
        "mergedRelationshipEvidenceCount": len(merged_relationships),
        "summary": summary,
        "outputs": {
            "readyCandidatesPath": str(candidates_path),
            "editBacklogPath": str(edit_backlog_path),
            "mergedReadyEventsPath": str(merged_path),
            "mergedRelationshipEvidencePath": str(relationships_path),
            "reportPath": str(report_path),
            "markdownPath": str(markdown_path),
        },
    }
    write_jsonl(candidates_path, ready_candidates)
    write_jsonl(edit_backlog_path, edit_backlog)
    write_jsonl(merged_path, merged_events)
    write_jsonl(relationships_path, merged_relationships)
    write_json(report_path, report)
    markdown_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"[stage_reviewed_a_ready_events] wrote {candidates_path}")
    print(f"[stage_reviewed_a_ready_events] wrote {edit_backlog_path}")
    print(f"[stage_reviewed_a_ready_events] wrote {merged_path}")
    print(f"[stage_reviewed_a_ready_events] wrote {relationships_path}")
    print(f"[stage_reviewed_a_ready_events] stagedReady={len(ready_candidates)} stagedRelationships={len(staged_relationships)} editBacklog={len(edit_backlog)} canonicalWrites=false")


if __name__ == "__main__":
    main()