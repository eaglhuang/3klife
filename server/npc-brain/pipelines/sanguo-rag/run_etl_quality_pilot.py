from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from build_keyword_options import build_keyword_pack, load_roster_names
from build_persona_cards import build_persona_card, index_events
from repo_layout import pipeline_config_path, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_GENERIC_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_MANUAL_ROSTER_PATH = pipeline_config_path(REPO_ROOT, "manual-roster-seeds.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot")
CORE_PILOT_GENERAL_IDS = ["zhang-fei", "guan-yu", "zhao-yun", "liu-bei", "cao-cao", "zhuge-liang"]
SPEECH_CONTEXT_MODES = ["life_chat", "encounter_line", "inner_monologue", "meeting_statement"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a review-only pilot coverage report for Sanguo NPC dialogue ETL quality.")
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="Ready events JSONL path")
    parser.add_argument("--generic-candidates", default=str(DEFAULT_GENERIC_CANDIDATES_PATH), help="Review-only generic candidates JSONL path")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="generals.json path")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="manual-roster-seeds.json path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory for pilot artifacts")
    parser.add_argument("--general-id", action="append", default=[], help="Explicit general id to include; repeatable")
    parser.add_argument("--top", type=int, default=24, help="Total pilot general count when --general-id is not provided")
    parser.add_argument("--include-cold", type=int, default=4, help="Number of no-event generals to include as cold-start controls")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting pilot outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def ensure_output_root(output_root: Path, overwrite: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [
        output_root / "etl-quality-pilot-report.json",
        output_root / "etl-quality-pilot-report.md",
        output_root / "review-queue.todo.json",
    ]
    existing = [path for path in outputs if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def general_map(generals: list[dict]) -> dict[str, dict]:
    return {general.get("id"): general for general in generals if general.get("id")}


def event_counts_by_general(events: list[dict]) -> Counter:
    counter: Counter = Counter()
    for event in events:
        if event.get("reviewStatus", "ready") != "ready":
            continue
        if event.get("eventType") == "alias-smoke":
            continue
        if all(str(ref).startswith("fixture.") for ref in (event.get("sourceRefs") or [])):
            continue
        for general_id in event.get("generalIds") or []:
            counter[general_id] += 1
    return counter


def generic_counts_by_general(generic_candidates: list[dict]) -> Counter:
    counter: Counter = Counter()
    for candidate in generic_candidates:
        for general_id in candidate.get("generalIds") or []:
            counter[general_id] += 1
    return counter


def select_pilot_general_ids(generals: list[dict], events: list[dict], explicit_ids: list[str], top: int, include_cold: int) -> list[str]:
    known = general_map(generals)
    if explicit_ids:
        missing = [general_id for general_id in explicit_ids if general_id not in known]
        if missing:
            raise ValueError(f"Unknown general ids: {missing}")
        return list(dict.fromkeys(explicit_ids))

    event_counts = event_counts_by_general(events)
    selected: list[str] = []
    for general_id in CORE_PILOT_GENERAL_IDS:
        if general_id in known and general_id not in selected:
            selected.append(general_id)

    ranked_event_generals = [general_id for general_id, _count in event_counts.most_common() if general_id in known]
    for general_id in ranked_event_generals:
        if len(selected) >= max(top - include_cold, 0):
            break
        if general_id not in selected:
            selected.append(general_id)

    cold_slots = max(min(include_cold, top - len(selected)), 0)
    for general in generals:
        general_id = general.get("id")
        if cold_slots <= 0:
            break
        if general_id and general_id not in selected and event_counts[general_id] == 0:
            selected.append(general_id)
            cold_slots -= 1
    return selected[:top]


def keyword_counts(pack: dict) -> dict[str, int]:
    return {category: len(items or []) for category, items in (pack.get("categories") or {}).items()}


def context_options_for_general(events: list[dict], general_id: str) -> list[dict]:
    options = []
    for event in events:
        if general_id not in (event.get("generalIds") or []):
            continue
        if event.get("reviewStatus", "ready") != "ready" or event.get("eventType") == "alias-smoke":
            continue
        if all(str(ref).startswith("fixture.") for ref in (event.get("sourceRefs") or [])):
            continue
        options.append({
            "contextKey": event.get("eventKey"),
            "label": event.get("location") or event.get("summary") or event.get("eventKey"),
            "evidenceRefs": event.get("sourceRefs") or [],
            "confidence": event.get("confidence") or 0,
        })
    return options


def readiness_status(context_count: int, keyword_total: int, evidence_ref_count: int) -> str:
    if context_count >= 1 and keyword_total >= 3 and evidence_ref_count >= 2:
        return "ready-for-dialogue-smoke"
    if context_count >= 1 and evidence_ref_count >= 1:
        return "thin-but-testable"
    return "needs-etl-evidence"


def recommended_actions(status: str, generic_count: int) -> list[str]:
    actions: list[str] = []
    if status == "needs-etl-evidence":
        actions.append("extract or accept at least one sourced event before runtime dialogue QA")
    if status == "thin-but-testable":
        actions.append("add more keyword categories before judging NPC voice quality")
    if generic_count:
        actions.append("review generic battle candidates before projecting more keywords")
    if not actions:
        actions.append("run multi-provider dialogue probes across all speechContextMode values")
    return actions


def build_review_queue(rows: list[dict]) -> dict:
    questions = []
    for row in rows:
        if row["status"] == "ready-for-dialogue-smoke":
            continue
        questions.append({
            "generalId": row["generalId"],
            "displayName": row["displayName"],
            "status": row["status"],
            "suggestedDecision": "extract-events" if row["eventCount"] == 0 else "expand-keywords",
            "answer": None,
            "allowedAnswers": ["extract-events", "expand-keywords", "defer", "skip"],
            "reasons": row["recommendedActions"],
        })
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "canonicalWrites": False,
        "questions": questions,
    }


def render_markdown(report: dict) -> str:
    lines = [
        "# Sanguo ETL Quality Pilot",
        "",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        f"- Pilot Generals: `{len(report['generals'])}`",
        f"- Ready Events: `{report['inputCounts']['readyEvents']}`",
        f"- Generic Candidates: `{report['inputCounts']['genericBattleCandidates']}`",
        "",
        "## Coverage Table",
        "",
        "| General | Name | Status | Events | Generic | Evidence | Keywords | Next Action |",
        "|---|---|---|---:|---:|---:|---:|---|",
    ]
    for row in report["generals"]:
        lines.append(
            f"| `{row['generalId']}` | {row['displayName']} | `{row['status']}` | "
            f"{row['eventCount']} | {row['genericCandidateCount']} | {row['evidenceRefCount']} | "
            f"{row['keywordTotal']} | {row['recommendedActions'][0]} |"
        )
    lines.extend([
        "",
        "## Speech Context Gate",
        "",
        "每位武將必須先有可追溯 event / keyword evidence，才進入四種 speechContextMode 的台詞品質測試：",
        "",
    ])
    for mode in SPEECH_CONTEXT_MODES:
        lines.append(f"- `{mode}`")
    lines.extend([
        "",
        "## Review Queue",
        "",
        f"- Questions: `{len(report['reviewQueue']['questions'])}`",
        "- File: `review-queue.todo.json`",
        "",
    ])
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    events_path = Path(args.events)
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)

    events = read_jsonl(events_path)
    generic_candidates = read_jsonl(Path(args.generic_candidates))
    generals = read_json(Path(args.generals))
    known_generals = general_map(generals)
    selected_ids = select_pilot_general_ids(generals, events, args.general_id, max(args.top, 1), max(args.include_cold, 0))
    roster = load_roster_names(Path(args.generals), Path(args.manual_roster))
    events_by_general = index_events(events)
    generic_counts = generic_counts_by_general(generic_candidates)
    keyword_root = output_root / "keyword-options"
    persona_root = output_root / "persona-cards"
    keyword_root.mkdir(parents=True, exist_ok=True)
    persona_root.mkdir(parents=True, exist_ok=True)

    rows = []
    event_count_bucket: dict[str, int] = defaultdict(int)
    for event in events:
        if event.get("reviewStatus", "ready") != "ready" or event.get("eventType") == "alias-smoke":
            continue
        for general_id in event.get("generalIds") or []:
            event_count_bucket[general_id] += 1

    for general_id in selected_ids:
        general = known_generals[general_id]
        pack = build_keyword_pack(events, roster, general_id, events_path)
        pack_payload = pack.model_dump()
        keyword_path = keyword_root / f"{general_id}.keywords.json"
        keyword_path.write_text(json.dumps(pack_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        persona = build_persona_card(general, events_by_general.get(general_id, []), keyword_root)
        persona_path = persona_root / f"{general_id}.persona.json"
        persona_path.write_text(json.dumps(persona.model_dump(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        contexts = context_options_for_general(events, general_id)
        keyword_count_map = keyword_counts(pack_payload)
        keyword_total = sum(keyword_count_map.values())
        evidence_refs = sorted({ref for context in contexts for ref in context.get("evidenceRefs", [])})
        status = readiness_status(len(contexts), keyword_total, len(evidence_refs))
        rows.append({
            "generalId": general_id,
            "displayName": general.get("name") or general_id,
            "faction": general.get("faction"),
            "rarityTier": general.get("rarityTier"),
            "characterCategory": general.get("characterCategory"),
            "status": status,
            "eventCount": event_count_bucket[general_id],
            "contextCount": len(contexts),
            "genericCandidateCount": generic_counts[general_id],
            "evidenceRefCount": len(evidence_refs),
            "keywordCounts": keyword_count_map,
            "keywordTotal": keyword_total,
            "personaEvidenceRefCount": len(persona.evidenceRefs),
            "personaKeywordAnchorCount": len(persona.keywordAnchors),
            "keywordPackPath": str(keyword_path),
            "personaCardPath": str(persona_path),
            "speechContextModesToProbe": SPEECH_CONTEXT_MODES,
            "recommendedActions": recommended_actions(status, generic_counts[general_id]),
        })

    review_queue = build_review_queue(rows)
    report = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "etl-quality-pilot",
        "canonicalWrites": False,
        "inputs": {
            "eventsPath": str(events_path),
            "genericCandidatesPath": str(Path(args.generic_candidates)),
            "generalsPath": str(Path(args.generals)),
        },
        "outputs": {
            "keywordRoot": str(keyword_root),
            "personaRoot": str(persona_root),
            "reviewQueuePath": str(output_root / "review-queue.todo.json"),
        },
        "inputCounts": {
            "readyEvents": sum(1 for event in events if event.get("reviewStatus", "ready") == "ready"),
            "genericBattleCandidates": len(generic_candidates),
            "availableGenerals": len(generals),
        },
        "statusCounts": dict(Counter(row["status"] for row in rows)),
        "generals": rows,
        "reviewQueue": review_queue,
    }

    (output_root / "etl-quality-pilot-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "review-queue.todo.json").write_text(json.dumps(review_queue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "etl-quality-pilot-report.md").write_text(render_markdown(report), encoding="utf-8")
    print(f"[run_etl_quality_pilot] wrote {output_root}")
    print(f"[run_etl_quality_pilot] generals={len(rows)} statusCounts={report['statusCounts']} canonicalWrites=false")


if __name__ == "__main__":
    main()
