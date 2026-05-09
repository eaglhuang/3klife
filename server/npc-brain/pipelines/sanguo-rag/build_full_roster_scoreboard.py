from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_PILOT_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/etl-quality-pilot-report.json")
DEFAULT_EXTERNAL_CARDS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/external-evidence/external-evidence-cards.jsonl")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/full-roster-scoreboard")
TRUST_TIER_SCORES = {
    "primary-text": 95,
    "primary-text-transcription": 85,
    "transcription": 80,
    "scan-verified": 75,
    "secondary": 60,
    "folklore": 35,
    "blocked": 0,
}
STATUS_EXTRACTOR_SCORE = {
    "ready-for-dialogue-smoke": 85,
    "thin-but-testable": 65,
    "needs-etl-evidence": 40,
}
STATUS_REVIEWER_SCORE = {
    "ready-for-dialogue-smoke": 75,
    "thin-but-testable": 55,
    "needs-etl-evidence": 35,
}
REQUIRED_GENERAL_FIELDS = ("name", "gender", "faction", "rarityTier", "characterCategory")


@dataclass
class EventStats:
    event_count: int = 0
    relationship_edges: int = 0
    location_count: int = 0
    source_ref_count: int = 0


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build full-roster confidence scoreboard with historical/worldbuilding dual scores.")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="generals.json path")
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="Ready events JSONL path")
    parser.add_argument("--pilot-report", default=str(DEFAULT_PILOT_REPORT_PATH), help="ETL quality pilot report JSON path")
    parser.add_argument("--external-evidence-cards", default=str(DEFAULT_EXTERNAL_CARDS_PATH), help="External evidence cards JSONL path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output root for scoreboard artifacts")
    parser.add_argument("--pilot-only", action="store_true", help="Only include pilot cohort generals in scoreboard")
    parser.add_argument("--top-output", type=int, default=300, help="Max rows shown in markdown scoreboard")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(value, maximum))


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


def ensure_overwrite(paths: list[Path], overwrite: bool) -> None:
    existing = [path for path in paths if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def normalize_gender(raw: Any) -> str:
    text = str(raw or "").strip().lower()
    if text in {"女", "female", "f", "woman", "women", "女性"}:
        return "female"
    if text in {"男", "male", "m", "man", "男性"}:
        return "male"
    return "unknown"


def normalize_status(raw: Any) -> str:
    text = str(raw or "").strip()
    if text:
        return text
    return "needs-etl-evidence"


def index_events(events: list[dict[str, Any]]) -> dict[str, EventStats]:
    stats: dict[str, EventStats] = defaultdict(EventStats)
    for event in events:
        if event.get("reviewStatus", "ready") != "ready":
            continue
        if event.get("eventType") == "alias-smoke":
            continue
        source_refs = [str(item) for item in (event.get("sourceRefs") or []) if str(item).strip()]
        if source_refs and all(ref.startswith("fixture.") for ref in source_refs):
            continue
        location_present = bool(str(event.get("location") or "").strip())
        relation_count = len(event.get("relationshipEdges") or [])
        for general_id in event.get("generalIds") or []:
            key = str(general_id or "").strip()
            if not key:
                continue
            row = stats[key]
            row.event_count += 1
            row.relationship_edges += relation_count
            if location_present:
                row.location_count += 1
            row.source_ref_count += len(source_refs)
    return stats


def profile_completeness_score(general: dict[str, Any]) -> float:
    fields = [
        "name",
        "gender",
        "faction",
        "rarityTier",
        "characterCategory",
        "title",
        "historicalAnecdote",
        "bloodlineRumor",
    ]
    present = 0
    for field in fields:
        value = general.get(field)
        if isinstance(value, str):
            if value.strip():
                present += 1
        elif value is not None:
            present += 1
    return clamp((present / len(fields)) * 100.0)


def calc_female_priority_boost(gender: str, historical_score: float, romance_support_score: float) -> float:
    if gender != "female":
        return 0.0
    if historical_score < 60 and romance_support_score >= 40:
        return 15.0
    if historical_score < 60:
        return 12.0
    return 8.0


def determine_grade(
    historical_score: float,
    worldbuilding_score: float,
    distinct_history_families: int,
    has_internal_source_ref: bool,
    external_history_count: int,
    external_total: int,
    generic_count: int,
    event_count: int,
    romance_support_score: float,
) -> str:
    if historical_score >= 80 and (
        distinct_history_families >= 2 or (has_internal_source_ref and external_history_count >= 1)
    ):
        return "A-history"
    if worldbuilding_score >= 80 and romance_support_score >= 55:
        return "A-romance"
    if max(historical_score, worldbuilding_score) >= 50:
        return "B"
    if external_total > 0 or generic_count > 0 or event_count > 0:
        return "C"
    return "D"


def determine_next_lane(grade: str, missing_fields: list[str], historical_score: float, distinct_history_families: int, generic_count: int) -> str:
    if missing_fields:
        return "deterministic-repair"
    if grade in {"A-history", "A-romance"}:
        if historical_score < 75 or (grade == "A-history" and distinct_history_families < 2):
            return "rumination"
        return "skill-preview"
    if grade == "B":
        return "skill-preview"
    if grade == "C":
        return "human-review" if generic_count > 0 else "deterministic-repair"
    return "evidence-discovery"


def build_shadow_roster(external_cards: list[dict[str, Any]], known_general_ids: set[str]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = {}
    for card in external_cards:
        for raw_general_id in card.get("generalIds") or []:
            general_id = str(raw_general_id or "").strip()
            if not general_id or general_id in known_general_ids:
                continue
            bucket = buckets.setdefault(
                general_id,
                {
                    "candidatePersonId": general_id,
                    "mentionCount": 0,
                    "sourceFamilies": set(),
                    "sourceLayers": set(),
                    "historyCardCount": 0,
                    "romanceCardCount": 0,
                    "canonicalWrites": False,
                },
            )
            bucket["mentionCount"] += 1
            bucket["sourceFamilies"].add(str(card.get("sourceFamily") or ""))
            bucket["sourceLayers"].add(str(card.get("sourceLayer") or ""))
            if card.get("sourceLayer") == "history":
                bucket["historyCardCount"] += 1
            if card.get("sourceLayer") in {"romance", "folklore", "worldbuilding"}:
                bucket["romanceCardCount"] += 1
    rows: list[dict[str, Any]] = []
    for row in buckets.values():
        source_family_count = len(row["sourceFamilies"])
        confidence_score = (
            float(row["mentionCount"]) * 10.0
            + float(source_family_count) * 12.0
            + float(row["historyCardCount"]) * 8.0
            + (10.0 if row["romanceCardCount"] > 0 else 0.0)
        )
        rows.append(
            {
                "candidatePersonId": row["candidatePersonId"],
                "mentionCount": row["mentionCount"],
                "sourceFamilyCount": source_family_count,
                "sourceFamilies": sorted(item for item in row["sourceFamilies"] if item),
                "sourceLayers": sorted(item for item in row["sourceLayers"] if item),
                "historyCardCount": row["historyCardCount"],
                "romanceCardCount": row["romanceCardCount"],
                "candidateScore": round(confidence_score, 2),
                "canonicalWrites": False,
            }
        )
    rows.sort(key=lambda item: (item["candidateScore"], item["mentionCount"], item["candidatePersonId"]), reverse=True)
    return rows


def render_markdown(summary: dict[str, Any], max_rows: int) -> str:
    rows = list(summary.get("rows") or [])
    rows.sort(key=lambda item: (item.get("priorityScore") or 0.0, item.get("worldbuildingUsabilityScore") or 0.0), reverse=True)
    lines = [
        "# Full Roster Scoreboard",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Roster Rows: `{summary['metrics']['rowCount']}`",
        f"- Grade Counts: `{summary['metrics']['gradeCounts']}`",
        f"- Lane Counts: `{summary['metrics']['laneCounts']}`",
        f"- Avg Historical Score: `{summary['metrics']['avgHistoricalTrustScore']}`",
        f"- Avg Worldbuilding Score: `{summary['metrics']['avgWorldbuildingUsabilityScore']}`",
        f"- Female Rows: `{summary['metrics']['femaleCount']}`",
        f"- Female Avg Worldbuilding Score: `{summary['metrics']['femaleAvgWorldbuildingUsabilityScore']}`",
        f"- A-history Count: `{summary['metrics']['aHistoryCount']}`",
        f"- A-romance Count: `{summary['metrics']['aRomanceCount']}`",
        "",
        "## Top Score Rows",
        "",
        "| General | Name | Gender | Grade | H-Score | W-Score | Events | External | Lane |",
        "|---|---|---|---|---:|---:|---:|---:|---|",
    ]
    for row in rows[: max(max_rows, 0)]:
        lines.append(
            "| `{general}` | {name} | `{gender}` | `{grade}` | `{h}` | `{w}` | `{events}` | `{external}` | `{lane}` |".format(
                general=row.get("generalId"),
                name=row.get("displayName") or row.get("generalId"),
                gender=row.get("gender"),
                grade=row.get("reviewGrade"),
                h=row.get("historicalTrustScore"),
                w=row.get("worldbuildingUsabilityScore"),
                events=row.get("eventCount"),
                external=row.get("externalEvidenceCount"),
                lane=row.get("nextLane"),
            )
        )
    lines.extend(
        [
            "",
            "## Shadow Roster",
            "",
            f"- Candidate Count: `{summary['metrics']['shadowRosterCount']}`",
            f"- File: `{summary['outputs']['shadowRosterPath']}`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    generals_path = resolve_path(args.generals)
    events_path = resolve_path(args.events)
    pilot_report_path = resolve_path(args.pilot_report)
    external_cards_path = resolve_path(args.external_evidence_cards)
    output_root = resolve_path(args.output_root)
    scoreboard_json_path = output_root / "full-roster-scoreboard.json"
    scoreboard_markdown_path = output_root / "full-roster-scoreboard.zh-TW.md"
    shadow_roster_path = output_root / "shadow-roster-index.json"
    ensure_overwrite([scoreboard_json_path, scoreboard_markdown_path, shadow_roster_path], args.overwrite)

    generals_payload = read_json(generals_path)
    if not isinstance(generals_payload, list):
        raise ValueError(f"Invalid generals payload: {generals_path}")
    pilot_report = read_json(pilot_report_path)
    pilot_rows = list((pilot_report or {}).get("generals") or [])
    pilot_by_general = {str(item.get("generalId") or "").strip(): item for item in pilot_rows if str(item.get("generalId") or "").strip()}
    event_stats = index_events(read_jsonl(events_path))
    external_cards = read_jsonl(external_cards_path)

    external_by_general: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for card in external_cards:
        for raw_general_id in card.get("generalIds") or []:
            general_id = str(raw_general_id or "").strip()
            if general_id:
                external_by_general[general_id].append(card)

    target_generals = list(generals_payload)
    if args.pilot_only:
        wanted = set(pilot_by_general)
        target_generals = [item for item in generals_payload if str(item.get("id") or "").strip() in wanted]

    rows: list[dict[str, Any]] = []
    for general in target_generals:
        general_id = str(general.get("id") or "").strip()
        if not general_id:
            continue
        display_name = str(general.get("name") or general_id)
        gender = normalize_gender(general.get("gender"))
        pilot_row = pilot_by_general.get(general_id, {})
        stats = event_stats.get(general_id, EventStats())

        event_count = max(int(pilot_row.get("eventCount") or 0), int(stats.event_count or 0))
        relationship_edge_count = int(stats.relationship_edges or 0)
        location_count = int(stats.location_count or 0)
        evidence_ref_count = max(int(pilot_row.get("evidenceRefCount") or 0), int(stats.source_ref_count or 0))
        generic_count = int(pilot_row.get("genericCandidateCount") or 0)
        keyword_total = int(pilot_row.get("keywordTotal") or 0)
        readiness_status = normalize_status(pilot_row.get("status"))

        cards = list(external_by_general.get(general_id) or [])
        external_total = len(cards)
        external_history = [card for card in cards if str(card.get("sourceLayer") or "") == "history"]
        external_romance = [card for card in cards if str(card.get("sourceLayer") or "") in {"romance", "folklore", "worldbuilding"}]
        complete_cards = [
            card
            for card in cards
            if str(card.get("quote") or "").strip() and str(card.get("locator") or "").strip() and str(card.get("textHash") or "").strip()
        ]
        trust_scores = [
            float(card.get("trustStrengthScore") or TRUST_TIER_SCORES.get(str(card.get("trustTier") or ""), 50))
            for card in cards
        ]
        source_strength_score = (
            clamp(sum(trust_scores) / len(trust_scores)) if trust_scores else (55.0 if evidence_ref_count > 0 else 10.0)
        )
        distinct_families = {str(card.get("sourceFamily") or "").strip() for card in cards if str(card.get("sourceFamily") or "").strip()}
        distinct_history_families = {
            str(card.get("sourceFamily") or "").strip()
            for card in external_history
            if str(card.get("sourceFamily") or "").strip()
        }
        has_internal_source_ref = evidence_ref_count > 0

        if len(distinct_history_families) >= 2:
            cross_evidence_score = 100.0
        elif has_internal_source_ref and len(external_history) > 0:
            cross_evidence_score = 70.0
        elif len(distinct_families) >= 1:
            cross_evidence_score = 40.0
        elif has_internal_source_ref:
            cross_evidence_score = 25.0
        else:
            cross_evidence_score = 0.0

        if external_total > 0:
            quote_locator_score = clamp((len(complete_cards) / external_total) * 100.0)
        elif evidence_ref_count > 0:
            quote_locator_score = 40.0
        else:
            quote_locator_score = 0.0

        claim_specificity_score = clamp(event_count * 10.0 + relationship_edge_count * 8.0 + location_count * 5.0)
        extractor_agreement_score = float(STATUS_EXTRACTOR_SCORE.get(readiness_status, 50))
        if generic_count == 0 and event_count > 0:
            extractor_agreement_score = clamp(extractor_agreement_score + 10.0)

        reviewer_agreement_score = float(STATUS_REVIEWER_SCORE.get(readiness_status, 45))
        if readiness_status == "ready-for-dialogue-smoke" and generic_count <= 2:
            reviewer_agreement_score = clamp(reviewer_agreement_score + 5.0)
        if readiness_status == "needs-etl-evidence" and generic_count >= 3:
            reviewer_agreement_score = clamp(reviewer_agreement_score - 5.0, 0.0, 100.0)

        conflict_penalty = 12.0 if generic_count >= max(6, event_count * 2) else (8.0 if generic_count > event_count + 3 else 0.0)
        duplicate_family_penalty = 0.0
        if external_total > 0 and len(distinct_families) > 0:
            duplicate_family_penalty = clamp((1.0 - (len(distinct_families) / external_total)) * 15.0, 0.0, 15.0)
        stale_evidence_penalty = 8.0 if event_count > 0 and external_total == 0 else 0.0

        historical_score = clamp(
            source_strength_score * 0.30
            + cross_evidence_score * 0.25
            + quote_locator_score * 0.15
            + claim_specificity_score * 0.10
            + extractor_agreement_score * 0.10
            + reviewer_agreement_score * 0.10
            - conflict_penalty
            - duplicate_family_penalty
            - stale_evidence_penalty
        )

        romance_support_score = clamp(
            len(external_romance) * 22.0
            + (10.0 if len(external_romance) >= 2 else 0.0)
            + (8.0 if len(external_history) >= 1 and len(external_romance) >= 1 else 0.0)
        )
        completeness_score = profile_completeness_score(general)
        relationship_playable_score = clamp(relationship_edge_count * 18.0 + min(event_count, 4) * 8.0 + (8.0 if generic_count == 0 and relationship_edge_count > 0 else 0.0))
        activity_dialogue_seed_score = clamp(keyword_total * 8.0 + min(event_count, 4) * 10.0)
        female_priority_boost = calc_female_priority_boost(gender, historical_score, romance_support_score)
        contradiction_penalty = 12.0 if readiness_status == "needs-etl-evidence" and generic_count >= 3 and external_total == 0 else (8.0 if generic_count > event_count + 3 else 0.0)

        worldbuilding_score = clamp(
            historical_score * 0.45
            + romance_support_score * 0.20
            + completeness_score * 0.15
            + relationship_playable_score * 0.10
            + activity_dialogue_seed_score * 0.10
            + female_priority_boost
            - contradiction_penalty
        )
        worldbuilding_score = min(worldbuilding_score, 95.0)

        review_grade = determine_grade(
            historical_score=historical_score,
            worldbuilding_score=worldbuilding_score,
            distinct_history_families=len(distinct_history_families),
            has_internal_source_ref=has_internal_source_ref,
            external_history_count=len(external_history),
            external_total=external_total,
            generic_count=generic_count,
            event_count=event_count,
            romance_support_score=romance_support_score,
        )
        missing_fields = [field for field in REQUIRED_GENERAL_FIELDS if not str(general.get(field) or "").strip()]
        next_lane = determine_next_lane(
            grade=review_grade,
            missing_fields=missing_fields,
            historical_score=historical_score,
            distinct_history_families=len(distinct_history_families),
            generic_count=generic_count,
        )
        priority_score = round(clamp(worldbuilding_score * 0.6 + historical_score * 0.3 + event_count * 2.0 + external_total * 1.5), 2)

        row = {
            "generalId": general_id,
            "displayName": display_name,
            "gender": gender,
            "rosterState": "canonical",
            "readinessStatus": readiness_status,
            "reviewGrade": review_grade,
            "promotionState": "ready-eval" if review_grade.startswith("A") else ("staged" if review_grade == "B" else "blocked"),
            "nextLane": next_lane,
            "eventCount": event_count,
            "genericCandidateCount": generic_count,
            "evidenceRefCount": evidence_ref_count,
            "keywordTotal": keyword_total,
            "externalEvidenceCount": external_total,
            "externalHistoryCount": len(external_history),
            "externalRomanceCount": len(external_romance),
            "externalDistinctFamilyCount": len(distinct_families),
            "externalDistinctHistoryFamilyCount": len(distinct_history_families),
            "relationshipEdgeCount": relationship_edge_count,
            "locationCount": location_count,
            "missingFields": missing_fields,
            "historicalTrustScore": round(historical_score, 2),
            "worldbuildingUsabilityScore": round(worldbuilding_score, 2),
            "completenessScore": round(completeness_score, 2),
            "priorityScore": priority_score,
            "confidenceBreakdown": {
                "sourceStrengthScore": round(source_strength_score, 2),
                "crossEvidenceScore": round(cross_evidence_score, 2),
                "quoteLocatorScore": round(quote_locator_score, 2),
                "claimSpecificityScore": round(claim_specificity_score, 2),
                "extractorAgreementScore": round(extractor_agreement_score, 2),
                "reviewerAgreementScore": round(reviewer_agreement_score, 2),
                "romanceFolkloreSupportScore": round(romance_support_score, 2),
                "profileCompletenessScore": round(completeness_score, 2),
                "relationshipPlayableScore": round(relationship_playable_score, 2),
                "activityDialogueSeedScore": round(activity_dialogue_seed_score, 2),
                "femalePriorityBoost": round(female_priority_boost, 2),
                "conflictPenalty": round(conflict_penalty, 2),
                "duplicateFamilyPenalty": round(duplicate_family_penalty, 2),
                "staleEvidencePenalty": round(stale_evidence_penalty, 2),
                "contradictionPenalty": round(contradiction_penalty, 2),
            },
            "canonicalWrites": False,
        }
        rows.append(row)

    rows.sort(key=lambda item: (item["priorityScore"], item["worldbuildingUsabilityScore"], item["historicalTrustScore"]), reverse=True)
    known_general_ids = {str(general.get("id") or "").strip() for general in generals_payload if str(general.get("id") or "").strip()}
    shadow_roster = build_shadow_roster(external_cards, known_general_ids)

    female_rows = [row for row in rows if row.get("gender") == "female"]
    metrics = {
        "rowCount": len(rows),
        "femaleCount": len(female_rows),
        "avgHistoricalTrustScore": round(sum(row["historicalTrustScore"] for row in rows) / len(rows), 2) if rows else 0.0,
        "avgWorldbuildingUsabilityScore": round(sum(row["worldbuildingUsabilityScore"] for row in rows) / len(rows), 2) if rows else 0.0,
        "femaleAvgWorldbuildingUsabilityScore": round(sum(row["worldbuildingUsabilityScore"] for row in female_rows) / len(female_rows), 2)
        if female_rows
        else 0.0,
        "gradeCounts": dict(sorted(Counter(row["reviewGrade"] for row in rows).items())),
        "laneCounts": dict(sorted(Counter(row["nextLane"] for row in rows).items())),
        "aHistoryCount": sum(1 for row in rows if row["reviewGrade"] == "A-history"),
        "aRomanceCount": sum(1 for row in rows if row["reviewGrade"] == "A-romance"),
        "shadowRosterCount": len(shadow_roster),
    }

    scoreboard = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-scoreboard",
        "canonicalWrites": False,
        "inputs": {
            "generalsPath": repo_relative(generals_path),
            "eventsPath": repo_relative(events_path),
            "pilotReportPath": repo_relative(pilot_report_path),
            "externalEvidenceCardsPath": repo_relative(external_cards_path),
            "pilotOnly": bool(args.pilot_only),
        },
        "outputs": {
            "scoreboardJsonPath": repo_relative(scoreboard_json_path),
            "scoreboardMarkdownPath": repo_relative(scoreboard_markdown_path),
            "shadowRosterPath": repo_relative(shadow_roster_path),
        },
        "metrics": metrics,
        "rows": rows,
    }
    write_json(scoreboard_json_path, scoreboard)
    write_json(shadow_roster_path, {"version": "1.0.0", "generatedAt": utc_now(), "canonicalWrites": False, "rows": shadow_roster})
    scoreboard_markdown_path.write_text(render_markdown(scoreboard, args.top_output), encoding="utf-8")

    print(f"[build_full_roster_scoreboard] wrote {scoreboard_json_path}")
    print(f"[build_full_roster_scoreboard] wrote {scoreboard_markdown_path}")
    print(f"[build_full_roster_scoreboard] rows={len(rows)} shadowRoster={len(shadow_roster)} canonicalWrites=false")


if __name__ == "__main__":
    main()
