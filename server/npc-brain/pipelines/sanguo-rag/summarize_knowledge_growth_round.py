from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_GENERIC_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_PILOT_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/etl-quality-pilot-report.json")
DEFAULT_REVIEW_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-rounds")
INFO_FIELDS = [
    "sourceRefs",
    "generalIds",
    "location",
    "relationshipEdges",
    "moodTags",
    "affectTags",
    "aptitudeTags",
    "roleActivityTags",
    "activitySeedHints",
    "itemRefs",
    "decisionWeightHints",
    "choiceWeightHints",
]
REVIEW_ANSWERS = {"A", "B", "C", "D"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summarize one Sanguo knowledge growth round into JSON and Markdown reports.")
    parser.add_argument("--round-id", default=None, help="Stable round id. Defaults to knowledge-growth-<UTC timestamp>.")
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="Ready events JSONL path")
    parser.add_argument("--generic-candidates", default=str(DEFAULT_GENERIC_CANDIDATES_PATH), help="Generic candidates JSONL path")
    parser.add_argument("--pilot-report", default=str(DEFAULT_PILOT_REPORT_PATH), help="ETL quality pilot report JSON path")
    parser.add_argument("--review-root", default=str(DEFAULT_REVIEW_ROOT), help="Root to scan for event-review-answers*.json")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--notes", default="", help="Optional round notes")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def default_round_id() -> str:
    return "knowledge-growth-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def ensure_outputs(output_root: Path, round_id: str, overwrite: bool) -> tuple[Path, Path]:
    output_root.mkdir(parents=True, exist_ok=True)
    json_path = output_root / f"{round_id}.summary.json"
    md_path = output_root / f"{round_id}.summary.md"
    existing = [path for path in (json_path, md_path) if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")
    return json_path, md_path


def count_field(record: dict, field: str) -> bool:
    value = record.get(field)
    if isinstance(value, list):
        return bool(value)
    return value not in (None, "", {}, [])


def info_field_counts(records: list[dict]) -> dict[str, int]:
    return {field: sum(1 for record in records if count_field(record, field)) for field in INFO_FIELDS}


def info_grade(record: dict) -> str:
    if not count_field(record, "sourceRefs") or not count_field(record, "generalIds"):
        return "D"
    has_identity = bool(record.get("summary") or record.get("sourceQuote"))
    has_location = count_field(record, "location")
    has_edges = count_field(record, "relationshipEdges")
    has_relationship = has_location and has_edges
    event_type = str(record.get("eventType") or "")
    subtype = str(record.get("subtype") or "")
    has_affect = count_field(record, "affectTags") or count_field(record, "moodTags")
    has_talent = count_field(record, "aptitudeTags")
    has_work = count_field(record, "roleActivityTags") or count_field(record, "activitySeedHints") or count_field(record, "choiceWeightHints")
    has_item = count_field(record, "itemRefs")
    has_decision = count_field(record, "decisionWeightHints")
    has_any_semantic = has_location or has_edges or has_affect or has_talent or has_work or has_item or has_decision
    if event_type in {"battle", "battle-candidate", "military"} or subtype in {"battle_duel", "deployment", "scouting_intel", "ambush_raid", "siege_defense", "retreat_pursuit"}:
        if has_identity and has_relationship:
            return "A"
        if has_identity and has_any_semantic:
            return "B"
        return "C"
    if event_type == "relationship" and has_identity and has_edges:
        return "A"
    if event_type in {"work", "activity"} and has_identity and has_work:
        return "A"
    if event_type == "talent" and has_identity and (has_talent or has_work or has_decision):
        return "A"
    if event_type == "item" and has_identity and has_item:
        return "A"
    if event_type in {"diplomacy", "governance"} and has_identity and has_decision:
        return "A"
    if event_type in {"affect", "life"} and has_identity and has_affect:
        return "A"
    if has_identity or has_any_semantic:
        return "B"
    return "C"


def summarize_events(records: list[dict]) -> dict:
    by_type = Counter(str(record.get("eventType") or "unknown") for record in records)
    by_subtype = Counter(str(record.get("subtype") or "unknown") for record in records)
    grades = Counter(info_grade(record) for record in records)
    general_ids = sorted({general_id for record in records for general_id in record.get("generalIds") or []})
    return {
        "recordCount": len(records),
        "coveredGeneralCount": len(general_ids),
        "coveredGeneralIds": general_ids,
        "eventTypeCounts": dict(sorted(by_type.items())),
        "eventSubtypeCounts": dict(sorted(by_subtype.items())),
        "infoFieldCounts": info_field_counts(records),
        "infoGradeCounts": complete_abcd(grades),
    }


def complete_abcd(counter: Counter) -> dict[str, int]:
    return {answer: int(counter.get(answer, 0)) for answer in ("A", "B", "C", "D")}


def review_answer_for_question(question: dict) -> str:
    answer = str(question.get("answer") or question.get("suggestedAnswer") or "").strip().upper()
    if answer in REVIEW_ANSWERS:
        return answer
    proposal = question.get("deepseekContextProposal") or {}
    answer = str(proposal.get("recommendedAnswer") or "").strip().upper()
    return answer if answer in REVIEW_ANSWERS else "unanswered"


def review_quality_for_question(question: dict) -> str:
    answer = review_answer_for_question(question)
    if answer in REVIEW_ANSWERS:
        return answer
    return info_grade({
        "sourceRefs": question.get("sourceRefs"),
        "generalIds": question.get("generalIds"),
        "summary": question.get("summary"),
        "sourceQuote": question.get("sourceQuote"),
        **(question.get("edits") or {}),
    })


def scan_review_files(review_root: Path) -> dict:
    files = sorted(review_root.glob("**/event-review-answers*.json"))
    file_summaries = []
    answer_counts: Counter = Counter()
    grade_counts: Counter = Counter()
    general_counts: Counter = Counter()
    enriched_files = 0
    total_questions = 0
    for path in files:
        payload = read_json(path)
        questions = payload.get("questions") or []
        if not isinstance(questions, list):
            continue
        is_enriched = "enriched" in path.name or payload.get("mode") == "event-review-context-enriched"
        enriched_files += 1 if is_enriched else 0
        local_answers = Counter(review_answer_for_question(question) for question in questions)
        local_grades = Counter(review_quality_for_question(question) for question in questions)
        answer_counts.update(local_answers)
        grade_counts.update(local_grades)
        total_questions += len(questions)
        general_id = payload.get("generalId") or "unknown"
        general_counts[general_id] += len(questions)
        file_summaries.append({
            "path": str(path),
            "generalId": general_id,
            "questionCount": len(questions),
            "isEnriched": is_enriched,
            "answerCounts": dict(sorted(local_answers.items())),
            "infoGradeCounts": complete_abcd(local_grades),
        })
    return {
        "fileCount": len(file_summaries),
        "enrichedFileCount": enriched_files,
        "questionCount": total_questions,
        "answerCounts": {key: int(value) for key, value in sorted(answer_counts.items())},
        "infoGradeCounts": complete_abcd(grade_counts),
        "questionsByGeneral": dict(sorted(general_counts.items())),
        "files": file_summaries,
    }


def summarize_pilot(pilot: dict) -> dict:
    rows = pilot.get("generals") or []
    status_counts = Counter(row.get("status") or "unknown" for row in rows)
    totals = defaultdict(int)
    for row in rows:
        for field in ("eventCount", "contextCount", "genericCandidateCount", "evidenceRefCount", "keywordTotal", "personaEvidenceRefCount", "personaKeywordAnchorCount"):
            totals[field] += int(row.get(field) or 0)
    top_generals = sorted(
        [
            {
                "generalId": row.get("generalId"),
                "displayName": row.get("displayName"),
                "status": row.get("status"),
                "eventCount": row.get("eventCount") or 0,
                "genericCandidateCount": row.get("genericCandidateCount") or 0,
                "keywordTotal": row.get("keywordTotal") or 0,
                "personaEvidenceRefCount": row.get("personaEvidenceRefCount") or 0,
            }
            for row in rows
        ],
        key=lambda row: (row["status"] == "ready-for-dialogue-smoke", -(row["genericCandidateCount"] or 0), row["keywordTotal"] or 0),
    )[:12]
    return {
        "pilotGeneralCount": len(rows),
        "availableGeneralCount": (pilot.get("inputCounts") or {}).get("availableGenerals"),
        "statusCounts": dict(sorted(status_counts.items())),
        "totals": dict(sorted(totals.items())),
        "topReviewTargets": top_generals,
    }


def optimization_notes(ready_summary: dict, generic_summary: dict, review_summary: dict, pilot_summary: dict) -> list[str]:
    notes: list[str] = []
    generic_b = generic_summary["infoGradeCounts"].get("B", 0) + generic_summary["infoGradeCounts"].get("C", 0)
    if generic_b:
        notes.append("generic candidates 仍有大量 B/C，下一輪優先補 location 與 relationshipEdges 的 deterministic hints。")
    review_b = review_summary["answerCounts"].get("B", 0) + review_summary["answerCounts"].get("unanswered", 0)
    if review_b:
        notes.append("review queue 仍有 B/unanswered，下一輪應批次跑 context enrichment，而不是只處理單一武將。")
    if ready_summary["recordCount"] < generic_summary["recordCount"]:
        notes.append("ready events 少於 generic candidates，下一輪應把高信心 enriched A 題套用成 accepted events 後重建 keyword/persona。")
    status_counts = pilot_summary.get("statusCounts") or {}
    if status_counts.get("needs-etl-evidence"):
        notes.append("仍有 needs-etl-evidence 武將，下一輪 cohort 應混合高 genericCandidateCount 與 zero-ready cold generals。")
    if not ready_summary["infoFieldCounts"].get("choiceWeightHints"):
        notes.append("目前 choiceWeightHints 尚未進入 ready events，下一輪可從 work/activity taxonomy 開始新增 extractor。")
    return notes or ["本輪資料已可作為 baseline；下一輪可選一個 taxonomy family 小步擴充並比較 delta。"]


def build_report(args: argparse.Namespace, round_id: str) -> dict:
    ready_events = read_jsonl(Path(args.events))
    generic_candidates = read_jsonl(Path(args.generic_candidates))
    pilot = read_json(Path(args.pilot_report))
    ready_summary = summarize_events(ready_events)
    generic_summary = summarize_events(generic_candidates)
    review_summary = scan_review_files(Path(args.review_root))
    pilot_summary = summarize_pilot(pilot)
    notes = optimization_notes(ready_summary, generic_summary, review_summary, pilot_summary)
    return {
        "version": "1.0.0",
        "roundId": round_id,
        "generatedAt": utc_now(),
        "mode": "sanguo-knowledge-growth-round-summary",
        "canonicalWrites": False,
        "roundNotes": args.notes,
        "inputs": {
            "eventsPath": str(Path(args.events)),
            "genericCandidatesPath": str(Path(args.generic_candidates)),
            "pilotReportPath": str(Path(args.pilot_report)),
            "reviewRoot": str(Path(args.review_root)),
        },
        "peopleResults": pilot_summary,
        "readyEvents": ready_summary,
        "genericCandidates": generic_summary,
        "reviewQueue": review_summary,
        "optimizationNotes": notes,
    }


def render_markdown(report: dict) -> str:
    people = report["peopleResults"]
    ready = report["readyEvents"]
    generic = report["genericCandidates"]
    review = report["reviewQueue"]
    lines = [
        "# Sanguo Knowledge Growth Round Summary",
        "",
        f"- Round ID: `{report['roundId']}`",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        f"- Pilot Generals: `{people['pilotGeneralCount']}` / Available: `{people.get('availableGeneralCount')}`",
        f"- Ready Events: `{ready['recordCount']}` covering `{ready['coveredGeneralCount']}` generals",
        f"- Generic Candidates: `{generic['recordCount']}` covering `{generic['coveredGeneralCount']}` generals",
        f"- Review Questions: `{review['questionCount']}` from `{review['fileCount']}` file(s), enriched `{review['enrichedFileCount']}`",
        "",
        "## People Results",
        "",
    ]
    for key, value in people["statusCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Event Type Counts", "", "### Ready Events", ""])
    for key, value in ready["eventTypeCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "### Generic Candidates", ""])
    for key, value in generic["eventTypeCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Info Grade ABCD", "", "| Source | A | B | C | D |", "|---|---:|---:|---:|---:|"])
    for label, counts in (("readyEvents", ready["infoGradeCounts"]), ("genericCandidates", generic["infoGradeCounts"]), ("reviewQueue", review["infoGradeCounts"])):
        lines.append(f"| `{label}` | {counts['A']} | {counts['B']} | {counts['C']} | {counts['D']} |")
    lines.extend(["", "## Review ABCD", ""])
    for key, value in review["answerCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Effective Info Fields", "", "### Ready Events", ""])
    for key, value in ready["infoFieldCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "### Generic Candidates", ""])
    for key, value in generic["infoFieldCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Top Review Targets", ""])
    for row in people["topReviewTargets"]:
        lines.append(
            f"- `{row['generalId']}` {row.get('displayName') or ''}: status=`{row['status']}`, "
            f"events=`{row['eventCount']}`, generic=`{row['genericCandidateCount']}`, keywords=`{row['keywordTotal']}`"
        )
    lines.extend(["", "## Next-Round Optimization Notes", ""])
    for note in report["optimizationNotes"]:
        lines.append(f"- {note}")
    if report.get("roundNotes"):
        lines.extend(["", "## Round Notes", "", report["roundNotes"]])
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    round_id = args.round_id or default_round_id()
    json_path, md_path = ensure_outputs(Path(args.output_root), round_id, args.overwrite)
    report = build_report(args, round_id)
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"[summarize_knowledge_growth_round] wrote {json_path}")
    print(f"[summarize_knowledge_growth_round] wrote {md_path}")
    print(
        "[summarize_knowledge_growth_round] "
        f"pilotGenerals={report['peopleResults']['pilotGeneralCount']} "
        f"readyEvents={report['readyEvents']['recordCount']} "
        f"genericCandidates={report['genericCandidates']['recordCount']} "
        f"reviewQuestions={report['reviewQueue']['questionCount']} canonicalWrites=false"
    )


if __name__ == "__main__":
    main()