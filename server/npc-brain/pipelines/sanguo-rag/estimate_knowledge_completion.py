from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
DEFAULT_OBSERVED_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-label-summary.json")
DEFAULT_EVENTS_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events-summary.json")
DEFAULT_READY_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_GENERIC_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_FEMALE_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/female-interaction-candidates.jsonl")
DEFAULT_RELATIONSHIP_EVIDENCE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-evidence/source-grounded-relationship-edges.jsonl")
DEFAULT_EVENT_QUESTION_SEEDS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/event-question-seeds/event-question-seeds.jsonl")
DEFAULT_SOURCE_EVENT_PACKETS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/source-event-packets/source-event-packets.jsonl")
DEFAULT_ROUNDS_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-rounds")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-progress")

ANGLE_FAMILIES = [
    "battle",
    "relationship",
    "female_interaction",
    "affect_story",
    "aptitude_talent",
    "work_role",
    "activity_seed",
    "item_equipment",
    "decision_weight",
    "location_context",
    "faction_timeline",
]

RELATIONSHIP_TYPE_TARGET = 11
DEFAULT_WEIGHTS = {
    "sourceResolution": 6.0,
    "personFoundation": 12.0,
    "relationshipGraph": 22.0,
    "eventQuestionCoverage": 32.0,
    "taxonomyAngles": 13.0,
    "reviewValidation": 6.0,
    "femalePriority": 5.0,
    "pipelineReliability": 4.0,
}

ROUND_PASS_PATTERN = re.compile(r"^(?P<prefix>.+)-a(?P<pass>\d+)$")
ROUND_RERUN_PATTERN = re.compile(r"^(?P<base>.+)-rerun(?P<rerun>\d+)$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Estimate Sanguo knowledge-growth completion against full graph goals.")
    parser.add_argument("--round-id", default=None, help="Progress report id. Defaults to completion-<UTC timestamp>.")
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH))
    parser.add_argument("--observed-summary", default=str(DEFAULT_OBSERVED_SUMMARY_PATH))
    parser.add_argument("--events-summary", default=str(DEFAULT_EVENTS_SUMMARY_PATH))
    parser.add_argument("--ready-events", default=str(DEFAULT_READY_EVENTS_PATH))
    parser.add_argument("--generic-candidates", default=str(DEFAULT_GENERIC_CANDIDATES_PATH))
    parser.add_argument("--female-candidates", default=str(DEFAULT_FEMALE_CANDIDATES_PATH))
    parser.add_argument("--relationship-evidence", default=str(DEFAULT_RELATIONSHIP_EVIDENCE_PATH))
    parser.add_argument("--event-question-seeds", default=str(DEFAULT_EVENT_QUESTION_SEEDS_PATH))
    parser.add_argument("--source-event-packets", default=str(DEFAULT_SOURCE_EVENT_PACKETS_PATH))
    parser.add_argument("--rounds-root", default=str(DEFAULT_ROUNDS_ROOT))
    parser.add_argument("--round-json", action="append", default=[], help="Batch JSON to include. Defaults to latest generic + latest female round.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--target-event-slots", type=int, default=None, help="Full target event/question slots. Defaults to people * angle families.")
    parser.add_argument("--target-relationship-edges", type=int, default=None, help="Full target source-grounded relationship edges. Defaults to people * 3.")
    parser.add_argument("--target-female-profiles", type=int, default=None, help="High-priority female target. Defaults to current female profile count.")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def default_round_id() -> str:
    return "completion-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(value, maximum))


def safe_ratio(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return clamp(numerator / denominator)


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def latest_rounds(rounds_root: Path) -> list[Path]:
    candidates: dict[str, tuple[str, Path]] = {}
    for path in sorted(rounds_root.glob("*.batch.json")):
        payload = read_json(path)
        candidate_path = str(payload.get("candidatesPath") or "")
        if "female-interaction" in candidate_path:
            bucket = "female"
        elif "generic-battle" in candidate_path:
            bucket = "generic"
        else:
            continue
        generated_at = str(payload.get("generatedAt") or "")
        current = candidates.get(bucket)
        if current is None or generated_at > current[0]:
            candidates[bucket] = (generated_at, path)
    return [item[1] for item in candidates.values()]


def round_selection_key(payload: dict[str, Any], path: Path) -> tuple[str, int, int, str, str]:
    round_id = str(payload.get("roundId") or path.stem).strip()
    generated_at = str(payload.get("generatedAt") or "").strip()

    rerun_index = 0
    base_round_id = round_id
    rerun_match = ROUND_RERUN_PATTERN.match(base_round_id)
    if rerun_match:
        base_round_id = str(rerun_match.group("base") or "").strip() or base_round_id
        rerun_index = int(rerun_match.group("rerun") or 0)

    pass_index = 0
    bucket = base_round_id
    pass_match = ROUND_PASS_PATTERN.match(base_round_id)
    if pass_match:
        bucket = str(pass_match.group("prefix") or "").strip() or bucket
        pass_index = int(pass_match.group("pass") or 0)

    return bucket, pass_index, rerun_index, generated_at, str(path)


def select_effective_round_paths(paths: list[Path]) -> list[Path]:
    unique_paths: list[Path] = []
    seen_paths: set[str] = set()
    for path in paths:
        resolved = path.resolve()
        key = str(resolved)
        if key in seen_paths:
            continue
        seen_paths.add(key)
        unique_paths.append(resolved)

    selected: dict[str, tuple[tuple[int, int, str, str], Path]] = {}
    for path in unique_paths:
        payload = read_json(path)
        bucket, pass_index, rerun_index, generated_at, path_text = round_selection_key(payload, path)
        rank = (pass_index, rerun_index, generated_at, path_text)
        current = selected.get(bucket)
        if current is None or rank > current[0]:
            selected[bucket] = (rank, path)

    resolved = [item[1] for item in selected.values()]
    resolved.sort(key=lambda value: str(value))
    return resolved


def summarize_rounds(paths: list[Path]) -> dict[str, Any]:
    selected_paths = select_effective_round_paths(paths)
    answer_counts: Counter[str] = Counter()
    non_review_answer_counts: Counter[str] = Counter()
    unique_generals: set[str] = set()
    female_generals: set[str] = set()
    timed_out = 0
    raw_errors = 0
    parsed = 0
    total_results = 0
    included = []
    for path in selected_paths:
        payload = read_json(path)
        candidate_path = str(payload.get("candidatesPath") or "")
        is_female = "female-interaction" in candidate_path
        local_counts: Counter[str] = Counter()
        local_non_review_counts: Counter[str] = Counter()
        for result in payload.get("results") or []:
            total_results += 1
            general_id = str(result.get("generalId") or "").strip()
            if general_id:
                unique_generals.add(general_id)
                if is_female:
                    female_generals.add(general_id)
            counts = result.get("reportAnswerCounts") or result.get("enrichedAnswerCounts") or {}
            for answer, count in counts.items():
                answer_key = str(answer).upper()
                value = int(count or 0)
                if answer_key in {"A", "B", "C", "D"}:
                    answer_counts[answer_key] += value
                    local_counts[answer_key] += value
                else:
                    non_review_answer_counts[answer_key] += value
                    local_non_review_counts[answer_key] += value
            raw_errors += int(result.get("rawErrorCount") or 0)
            parsed += int(result.get("rawParsedCount") or 0)
            generate = result.get("generate") or {}
            enrich = result.get("enrich") or {}
            if generate.get("timedOut") or enrich.get("timedOut"):
                timed_out += 1
        included.append({
            "path": str(path),
            "roundId": payload.get("roundId"),
            "candidatesPath": candidate_path,
            "answerCounts": dict(sorted(local_counts.items())),
            "nonReviewAnswerCounts": dict(sorted(local_non_review_counts.items())),
            "cohortSize": len(payload.get("cohort") or []),
        })
    total_answers = sum(answer_counts.values())
    total_answer_attempts = total_answers + raw_errors
    return {
        "inputRoundPathCount": len(paths),
        "selectedRoundPathCount": len(selected_paths),
        "includedRounds": included,
        "answerCounts": dict(sorted(answer_counts.items())),
        "nonReviewAnswerCounts": dict(sorted(non_review_answer_counts.items())),
        "acceptedA": int(answer_counts.get("A", 0)),
        "reviewB": int(answer_counts.get("B", 0)),
        "totalAnswers": int(total_answers),
        "totalAnswerAttempts": int(total_answer_attempts),
        "aRate": safe_ratio(answer_counts.get("A", 0), total_answers),
        "sampledGeneralCount": len(unique_generals),
        "sampledFemaleGeneralCount": len(female_generals),
        "rawErrorCount": raw_errors,
        "rawParsedCount": parsed,
        "timedOutStepCount": timed_out,
        "resultCount": total_results,
    }


def event_angle_families(records: list[dict[str, Any]]) -> set[str]:
    families: set[str] = set()
    for record in records:
        angle_family = str(record.get("angleFamily") or "")
        if angle_family:
            families.add(angle_family)
        for item in record.get("angleFamilies") or []:
            if str(item or "").strip():
                families.add(str(item).strip())
        event_type = str(record.get("eventType") or "")
        subtype = str(record.get("subtype") or "")
        if "battle" in event_type or "battle" in subtype:
            families.add("battle")
        if "female" in event_type or "female" in subtype:
            families.add("female_interaction")
        if record.get("relationshipEdges"):
            families.add("relationship")
        if record.get("moodTags") or record.get("affectTags"):
            families.add("affect_story")
        if record.get("aptitudeTags"):
            families.add("aptitude_talent")
        if record.get("roleActivityTags"):
            families.add("work_role")
        if record.get("activitySeedHints") or record.get("choiceWeightHints"):
            families.add("activity_seed")
        if record.get("itemRefs"):
            families.add("item_equipment")
        if record.get("decisionWeightHints"):
            families.add("decision_weight")
        if record.get("location"):
            families.add("location_context")
    return families


def sidecar_angle_families(stable_summary: dict[str, Any]) -> set[str]:
    families: set[str] = set()
    if int(stable_summary.get("relationshipEdgeCount") or 0) or int(stable_summary.get("plainRelationshipProposalCount") or 0):
        families.add("relationship")
    if int(stable_summary.get("femalePriorityProfileCount") or 0):
        families.add("female_interaction")
    if int(stable_summary.get("eventLocationSeedCount") or 0):
        families.add("location_context")
    if int(stable_summary.get("factionTimelineCount") or 0):
        families.add("faction_timeline")
    role_counts = stable_summary.get("roleTagCounts") or {}
    auto_role_counts = stable_summary.get("autoRoleTagCounts") or {}
    if role_counts or auto_role_counts:
        families.add("work_role")
    if int(stable_summary.get("plainFactProposalCount") or 0):
        families.update({"affect_story", "activity_seed", "decision_weight", "aptitude_talent"})
    return families


def relationship_evidence_units(records: list[dict[str, Any]]) -> float:
    units = 0.0
    for record in records:
        confidence = float(record.get("edgeConfidence") or 0.0)
        if confidence >= 0.8:
            units += 0.7
        elif confidence >= 0.7:
            units += 0.45
        elif confidence >= 0.6:
            units += 0.2
    return units


def relationship_evidence_type_counts(records: list[dict[str, Any]]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for record in records:
        relation_type = str(record.get("type") or "").strip()
        if relation_type:
            counts[relation_type] += 1
    return counts


def event_question_seed_units(records: list[dict[str, Any]]) -> float:
    units = 0.0
    seen_slots: set[tuple[str, str]] = set()
    for record in records:
        general_id = str(record.get("generalId") or "").strip()
        angle_family = str(record.get("angleFamily") or "").strip()
        if not general_id or not angle_family:
            continue
        slot_key = (general_id, angle_family)
        if slot_key in seen_slots:
            continue
        seen_slots.add(slot_key)
        weight = float(record.get("eventQuestionUnitWeight") or 0.0)
        units += min(0.35, max(0.0, weight))
    return units


def source_event_packet_units(records: list[dict[str, Any]]) -> float:
    units = 0.0
    seen_packets: set[str] = set()
    for record in records:
        packet_id = str(record.get("packetId") or record.get("sourceRef") or "").strip()
        if not packet_id or packet_id in seen_packets:
            continue
        seen_packets.add(packet_id)
        weight = float(record.get("eventPacketUnitWeight") or 0.0)
        units += min(0.4, max(0.0, weight))
    return units


def score_components(args: argparse.Namespace, round_paths: list[Path]) -> dict[str, Any]:
    stable = read_json(Path(args.stable_knowledge))
    stable_summary = stable.get("summary") or {}
    observed = read_json(Path(args.observed_summary))
    events_summary = read_json(Path(args.events_summary))
    ready_events = read_jsonl(Path(args.ready_events))
    generic_candidates = read_jsonl(Path(args.generic_candidates))
    female_candidates = read_jsonl(Path(args.female_candidates))
    relationship_evidence = read_jsonl(Path(args.relationship_evidence))
    event_question_seeds = read_jsonl(Path(args.event_question_seeds))
    source_event_packets = read_jsonl(Path(args.source_event_packets))
    round_summary = summarize_rounds(round_paths)

    people_count = int(stable_summary.get("identitySeedCount") or len(stable.get("identitySeeds") or []) or 0)
    target_event_slots = int(args.target_event_slots or max(1, people_count * len(ANGLE_FAMILIES)))
    target_relationship_edges = int(args.target_relationship_edges or max(1, people_count * 3))
    target_female_profiles = int(args.target_female_profiles or max(1, int(stable_summary.get("femalePriorityProfileCount") or 0)))

    resolved = float(observed.get("resolvedMentionCount") or 0)
    unresolved = float(observed.get("unresolvedMentionCount") or 0)
    pending = float(observed.get("reviewPendingMentionCount") or 0)
    source_resolution = safe_ratio(resolved, resolved + unresolved + pending)

    coverage_counts = stable_summary.get("basicProfileCoverageCounts") or {}
    plain_rich = float(coverage_counts.get("plain-rich") or 0)
    observed_only = float(coverage_counts.get("observed-only") or 0)
    identity_only = float(coverage_counts.get("identity-only") or 0)
    identity_coverage = safe_ratio(stable_summary.get("identitySeedCount") or 0, people_count)
    basic_depth = safe_ratio(plain_rich + observed_only * 0.55 + identity_only * 0.20, people_count)
    role_seed_count = float(stable_summary.get("socialRoleSeedCount") or 0) + float(stable_summary.get("autoSocialRoleSeedCount") or 0)
    role_coverage = safe_ratio(role_seed_count, people_count)
    missing_score = 1.0 - safe_ratio(stable_summary.get("missingCoverageCount") or 0, people_count)
    person_foundation = clamp(identity_coverage * 0.25 + basic_depth * 0.45 + role_coverage * 0.20 + missing_score * 0.10)

    ready_relationships = float(stable_summary.get("relationshipEdgeCount") or 0)
    plain_relationships = float(stable_summary.get("plainRelationshipProposalCount") or 0)
    evidence_units = relationship_evidence_units(relationship_evidence)
    evidence_type_counts = relationship_evidence_type_counts(relationship_evidence)
    stable_relationship_types = set((stable_summary.get("relationshipTypeCounts") or {}).keys())
    relationship_types = stable_relationship_types | set(evidence_type_counts.keys())
    relationship_volume = safe_ratio(ready_relationships + evidence_units + plain_relationships * 0.25, target_relationship_edges)
    relationship_type_count = len(relationship_types)
    relationship_breadth = safe_ratio(relationship_type_count, RELATIONSHIP_TYPE_TARGET)
    relationship_graph = clamp(relationship_volume * 0.75 + relationship_breadth * 0.25)

    candidate_count = len(generic_candidates) + len(female_candidates)
    accepted_a = float(round_summary.get("acceptedA") or 0)
    review_b = float(round_summary.get("reviewB") or 0)
    ready_event_count = float(max(int(events_summary.get("readyEventCount") or 0), len(ready_events)))
    seed_units = event_question_seed_units(event_question_seeds)
    packet_units = source_event_packet_units(source_event_packets)
    event_question_units = ready_event_count + accepted_a * 0.75 + review_b * 0.25 + candidate_count * 0.15 + seed_units + packet_units
    event_question_coverage = safe_ratio(event_question_units, target_event_slots)

    ready_families = event_angle_families(ready_events)
    candidate_families = event_angle_families(generic_candidates + female_candidates)
    seed_families = event_angle_families(event_question_seeds)
    packet_families = event_angle_families(source_event_packets)
    sidecar_families = sidecar_angle_families(stable_summary)
    source_grounded_families = ready_families | candidate_families | seed_families | packet_families
    all_observed_families = source_grounded_families | sidecar_families
    taxonomy_angles = clamp(
        safe_ratio(len(all_observed_families), len(ANGLE_FAMILIES)) * 0.20
        + safe_ratio(len(source_grounded_families), len(ANGLE_FAMILIES)) * 0.35
        + event_question_coverage * 0.45
    )

    total_answers = float(round_summary.get("totalAnswers") or 0)
    a_rate = float(round_summary.get("aRate") or 0.0)
    sample_coverage = safe_ratio(round_summary.get("sampledGeneralCount") or 0, people_count)
    total_answer_attempts = float(round_summary.get("totalAnswerAttempts") or total_answers)
    reliability_in_review = 1.0 - safe_ratio(
        (round_summary.get("rawErrorCount") or 0) + (round_summary.get("timedOutStepCount") or 0),
        max(1.0, total_answer_attempts),
    )
    review_validation = clamp(a_rate * 0.65 + sample_coverage * 0.25 + reliability_in_review * 0.10)

    female_profile_count = float(stable_summary.get("femalePriorityProfileCount") or 0)
    female_profile_coverage = safe_ratio(female_profile_count, target_female_profiles)
    female_validated_coverage = safe_ratio(round_summary.get("sampledFemaleGeneralCount") or 0, target_female_profiles)
    female_rounds = [item for item in round_summary.get("includedRounds") or [] if "female-interaction" in str(item.get("candidatesPath") or "")]
    female_counts = Counter()
    for item in female_rounds:
        female_counts.update(item.get("answerCounts") or {})
    female_total = sum(female_counts.values())
    female_a_rate = safe_ratio(float(female_counts.get("A") or 0), float(female_total))
    female_priority = clamp(female_profile_coverage * 0.35 + female_validated_coverage * 0.35 + female_a_rate * 0.30)

    pipeline_reliability = clamp(
        (1.0 if Path(args.stable_knowledge).exists() else 0.0) * 0.20
        + (1.0 if Path(args.events_summary).exists() else 0.0) * 0.20
        + reliability_in_review * 0.40
        + (1.0 if round_paths else 0.0) * 0.20
    )

    raw_scores = {
        "sourceResolution": source_resolution,
        "personFoundation": person_foundation,
        "relationshipGraph": relationship_graph,
        "eventQuestionCoverage": event_question_coverage,
        "taxonomyAngles": taxonomy_angles,
        "reviewValidation": review_validation,
        "femalePriority": female_priority,
        "pipelineReliability": pipeline_reliability,
    }
    weighted = {key: raw_scores[key] * DEFAULT_WEIGHTS[key] for key in DEFAULT_WEIGHTS}
    overall = sum(weighted.values())
    return {
        "overallPercent": round(overall, 2),
        "rawScores": {key: round(value, 4) for key, value in raw_scores.items()},
        "weightedPoints": {key: round(value, 2) for key, value in weighted.items()},
        "weights": DEFAULT_WEIGHTS,
        "targets": {
            "people": people_count,
            "angleFamilies": len(ANGLE_FAMILIES),
            "eventQuestionSlots": target_event_slots,
            "relationshipEdges": target_relationship_edges,
            "femaleProfiles": target_female_profiles,
        },
        "observedCounts": {
            "resolvedMentionCount": int(resolved),
            "unresolvedMentionCount": int(unresolved),
            "reviewPendingMentionCount": int(pending),
            "identitySeedCount": int(stable_summary.get("identitySeedCount") or 0),
            "basicProfileCoverageCounts": coverage_counts,
            "relationshipEdgeCount": int(ready_relationships),
            "sourceGroundedRelationshipEvidenceCount": len(relationship_evidence),
            "sourceGroundedRelationshipEvidenceUnits": round(evidence_units, 2),
            "sourceGroundedRelationshipTypeCounts": dict(sorted(evidence_type_counts.items())),
            "plainRelationshipProposalCount": int(plain_relationships),
            "readyEventCount": int(ready_event_count),
            "sourceGroundedEventQuestionSeedCount": len(event_question_seeds),
            "sourceGroundedEventQuestionSeedUnits": round(seed_units, 2),
            "sourceGroundedEventPacketCount": len(source_event_packets),
            "sourceGroundedEventPacketUnits": round(packet_units, 2),
            "genericBattleCandidateCount": len(generic_candidates),
            "femaleInteractionCandidateCount": len(female_candidates),
            "previewAcceptedA": int(accepted_a),
            "previewReviewB": int(review_b),
            "previewTotalAnswers": int(total_answers),
            "sampledGeneralCount": int(round_summary.get("sampledGeneralCount") or 0),
            "sampledFemaleGeneralCount": int(round_summary.get("sampledFemaleGeneralCount") or 0),
            "sourceGroundedAngleFamilies": sorted(source_grounded_families),
            "sidecarAngleFamilies": sorted(sidecar_families),
        },
        "roundSummary": round_summary,
        "formula": {
            "overall": "sum(componentScore * componentWeight), weights sum to 100",
            "sourceResolution": "resolvedMentions / (resolvedMentions + unresolvedMentions + reviewPendingMentions)",
            "personFoundation": "0.25*identityCoverage + 0.45*basicProfileDepth + 0.20*roleCoverage + 0.10*missingCoverageScore",
            "relationshipGraph": "0.75*((readyRelationshipEdges + weightedSourceGroundedRelationshipEvidence + 0.25*plainRelationshipProposals) / targetRelationshipEdges) + 0.25*(relationshipTypeCount / 11); evidence weights: confidence>=0.8 => 0.70, >=0.7 => 0.45, >=0.6 => 0.20",
            "eventQuestionCoverage": "(readyEvents + 0.75*previewA + 0.25*previewB + 0.15*candidates + weightedSourceGroundedQuestionSeeds + weightedSourceEventPackets) / targetEventQuestionSlots; seed slots are capped at 0.35 units each; source event packets are capped at 0.40 units each",
            "taxonomyAngles": "0.20*allObservedAngleBreadth + 0.35*sourceGroundedAngleBreadth + 0.45*eventQuestionCoverage",
            "reviewValidation": "0.65*previewARate + 0.25*sampledGeneralCoverage + 0.10*reviewReliability",
            "femalePriority": "0.35*femaleProfileCoverage + 0.35*femaleValidatedCoverage + 0.30*femalePreviewARate",
            "pipelineReliability": "stable/events artifacts present plus latest preview no-error/no-timeout reliability",
        },
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Sanguo Knowledge Completion Estimate",
        "",
        f"- Round ID: `{report['roundId']}`",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Overall Estimate: `{report['completion']['overallPercent']:.2f}%`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        "",
        "## Formula",
        "",
        "Overall = sum(componentScore * componentWeight), weights sum to 100.",
        "",
        "| Component | Weight | Raw Score | Weighted Points |",
        "|---|---:|---:|---:|",
    ]
    completion = report["completion"]
    for key, weight in completion["weights"].items():
        lines.append(
            f"| `{key}` | {weight:.1f} | {completion['rawScores'][key]:.4f} | {completion['weightedPoints'][key]:.2f} |"
        )
    lines.extend([
        "",
        "## Targets",
        "",
    ])
    for key, value in completion["targets"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Observed Counts", ""])
    for key, value in completion["observedCounts"].items():
        if isinstance(value, (list, dict)):
            lines.append(f"- `{key}`: `{json.dumps(value, ensure_ascii=False)}`")
        else:
            lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Included Preview Rounds", ""])
    for item in completion["roundSummary"].get("includedRounds") or []:
        lines.append(f"- `{item.get('roundId')}`: `{item.get('answerCounts')}` from `{item.get('candidatesPath')}`")
    lines.extend(["", "## Component Formulae", ""])
    for key, formula in completion["formula"].items():
        lines.append(f"- `{key}`: {formula}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    round_id = args.round_id or default_round_id()
    round_paths = [Path(path) for path in args.round_json] if args.round_json else latest_rounds(Path(args.rounds_root))
    completion = score_components(args, round_paths)
    report = {
        "version": "1.0.0",
        "roundId": round_id,
        "generatedAt": utc_now(),
        "mode": "sanguo-knowledge-completion-estimate",
        "canonicalWrites": False,
        "inputs": {
            "stableKnowledgePath": args.stable_knowledge,
            "observedSummaryPath": args.observed_summary,
            "eventsSummaryPath": args.events_summary,
            "readyEventsPath": args.ready_events,
            "genericCandidatesPath": args.generic_candidates,
            "femaleCandidatesPath": args.female_candidates,
            "relationshipEvidencePath": args.relationship_evidence,
            "eventQuestionSeedsPath": args.event_question_seeds,
            "sourceEventPacketsPath": args.source_event_packets,
            "roundJsonPaths": [str(path) for path in round_paths],
        },
        "completion": completion,
    }
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    json_path = output_root / f"{round_id}.json"
    md_path = output_root / f"{round_id}.md"
    if not args.overwrite and (json_path.exists() or md_path.exists()):
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {json_path}, {md_path}")
    write_json(json_path, report)
    md_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"[estimate_knowledge_completion] wrote {json_path}")
    print(f"[estimate_knowledge_completion] wrote {md_path}")
    print(f"[estimate_knowledge_completion] overall={completion['overallPercent']:.2f}% canonicalWrites=false")


if __name__ == "__main__":
    main()
