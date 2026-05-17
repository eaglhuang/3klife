from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, resolve_repo_root
from sanguo_governance_loader import (
    SanguoGovernanceError,
    default_governance_root,
    load_full_roster_scoreboard_policy,
    load_relationship_runtime_canon_policy,
)


REPO_ROOT = resolve_repo_root(__file__)

DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_GENERIC_CANDIDATES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/generic-battle-candidates.jsonl")
DEFAULT_PILOT_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/etl-quality-pilot-report.json")
DEFAULT_RELATIONSHIP_EVIDENCE_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/relationship-evidence/source-grounded-relationship-edges.jsonl"
)
DEFAULT_EVENT_QUESTION_SEEDS_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/event-question-seeds/event-question-seeds.jsonl"
)
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/full-roster-scoreboard")
DEFAULT_LANE_POLICY_CONFIG = pipeline_config_path(REPO_ROOT, "full-roster-lane-policy.json")
DEFAULT_GOVERNANCE_ROOT = default_governance_root()

FULL_ROSTER_SCOREBOARD_POLICY: dict[str, Any] = {}


def _scoreboard_policy_section(policy: dict[str, Any], key: str) -> dict[str, Any]:
    value = policy.get(key)
    return value if isinstance(value, dict) else {}


def _scoreboard_policy_path(policy: dict[str, Any], key: str, fallback: Path) -> Path:
    value = _scoreboard_policy_section(policy, "defaultPaths").get(key)
    return Path(str(value)) if value else fallback


def apply_full_roster_scoreboard_policy(
    governance_root: str | Path | None,
    full_roster_scoreboard_policy: str | Path | None = None,
) -> None:
    global FULL_ROSTER_SCOREBOARD_POLICY
    global DEFAULT_GENERALS_PATH, DEFAULT_EVENTS_PATH, DEFAULT_GENERIC_CANDIDATES_PATH, DEFAULT_PILOT_REPORT_PATH
    global DEFAULT_RELATIONSHIP_EVIDENCE_PATH, DEFAULT_EVENT_QUESTION_SEEDS_PATH, DEFAULT_OUTPUT_ROOT
    global DEFAULT_LANE_POLICY_CONFIG, DEFAULT_LANE_THRESHOLDS

    policy = load_full_roster_scoreboard_policy(
        governance_root,
        full_roster_scoreboard_policy=full_roster_scoreboard_policy,
    )
    FULL_ROSTER_SCOREBOARD_POLICY = dict(policy)
    DEFAULT_GENERALS_PATH = _scoreboard_policy_path(policy, "generals", DEFAULT_GENERALS_PATH)
    DEFAULT_EVENTS_PATH = _scoreboard_policy_path(policy, "events", DEFAULT_EVENTS_PATH)
    DEFAULT_GENERIC_CANDIDATES_PATH = _scoreboard_policy_path(policy, "genericCandidates", DEFAULT_GENERIC_CANDIDATES_PATH)
    DEFAULT_PILOT_REPORT_PATH = _scoreboard_policy_path(policy, "pilotReport", DEFAULT_PILOT_REPORT_PATH)
    DEFAULT_RELATIONSHIP_EVIDENCE_PATH = _scoreboard_policy_path(policy, "relationshipEvidence", DEFAULT_RELATIONSHIP_EVIDENCE_PATH)
    DEFAULT_EVENT_QUESTION_SEEDS_PATH = _scoreboard_policy_path(policy, "eventQuestionSeeds", DEFAULT_EVENT_QUESTION_SEEDS_PATH)
    DEFAULT_OUTPUT_ROOT = _scoreboard_policy_path(policy, "outputRoot", DEFAULT_OUTPUT_ROOT)
    DEFAULT_LANE_POLICY_CONFIG = _scoreboard_policy_path(policy, "lanePolicyConfig", DEFAULT_LANE_POLICY_CONFIG)
    lane_thresholds = policy.get("laneThresholds")
    if isinstance(lane_thresholds, dict):
        DEFAULT_LANE_THRESHOLDS = dict(lane_thresholds)


def apply_full_roster_scoreboard_arg_defaults(args: argparse.Namespace) -> None:
    if args.generals is None:
        args.generals = str(DEFAULT_GENERALS_PATH)
    if args.events is None:
        args.events = str(DEFAULT_EVENTS_PATH)
    if args.generic_candidates is None:
        args.generic_candidates = str(DEFAULT_GENERIC_CANDIDATES_PATH)
    if args.pilot_report is None:
        args.pilot_report = str(DEFAULT_PILOT_REPORT_PATH)
    if args.lane_policy_config is None:
        args.lane_policy_config = str(DEFAULT_LANE_POLICY_CONFIG)
    if args.output_root is None:
        args.output_root = str(DEFAULT_OUTPUT_ROOT)
    if args.profile is None:
        args.profile = str(FULL_ROSTER_SCOREBOARD_POLICY.get("defaultProfile") or "all")

PROFILE_CHOICES = ("all", "female-priority", "history-romance")
DEFAULT_LANE_THRESHOLDS = {
    "aRuminationHistoricalMax": 75.0,
    "cHumanReviewGenericMin": 3,
    "femalePriorityCToSkillPreview": True,
}
DEFAULT_SCOREBOARD_SCORING_POLICY: dict[str, dict[str, float | int]] = {
    "historicalTrustScoreWeights": {
        "sourceStrengthScore": 0.30,
        "crossEvidenceScore": 0.25,
        "quoteLocatorScore": 0.15,
        "claimSpecificityScore": 0.10,
        "extractorAgreementScore": 0.10,
        "reviewerAgreementScore": 0.10,
    },
    "historicalTrustPenaltyWeights": {
        "conflictPenalty": 1.0,
        "duplicateFamilyPenalty": 1.0,
        "staleEvidencePenalty": 1.0,
    },
    "worldbuildingUsabilityWeights": {
        "historicalScore": 0.45,
        "romanceFolkloreSupportScore": 0.20,
        "profileCompletenessScore": 0.15,
        "relationshipPlayableScore": 0.10,
        "activityDialogueSeedScore": 0.10,
        "femalePriorityBoost": 1.0,
        "contradictionPenalty": 1.0,
    },
    "worldbuildingUsabilityLimits": {
        "maxWithFemaleBoost": 95.0,
        "maxDefault": 100.0,
    },
    "gradeFallbackThresholds": {
        "bMinHistoricalScore": 50.0,
        "bMinWorldbuildingScore": 50.0,
    },
    "priorityScoreWeights": {
        "worldbuildingScore": 0.40,
        "historicalScore": 0.30,
        "completeness": 0.20,
        "genericCandidateUnitWeight": 2.5,
        "genericCandidateCap": 8,
        "femaleBoost": 1.0,
        "missingFieldPenaltyWeight": 2.0,
        "missingFieldPenaltyCap": 4,
    },
}
FEMALE_TOKENS = {"female", "f", "woman", "女", "女性"}
MALE_TOKENS = {"male", "m", "man", "男", "男性"}
A_HISTORY_GRADE_TYPE = "A-history"
A_ROMANCE_GRADE_TYPE = "A-romance"
READY_EVAL_GRADE_TYPES = {"A-history", "A-romance"}
A_HISTORY_MIN_HISTORICAL_SCORE = 80.0
A_ROMANCE_MIN_WORLDBUILDING_SCORE = 80.0


def apply_relationship_runtime_canon_policy(governance_root: str | Path | None, relationship_policy: str | Path | None = None) -> None:
    global A_HISTORY_GRADE_TYPE
    global A_ROMANCE_GRADE_TYPE
    global READY_EVAL_GRADE_TYPES
    global A_HISTORY_MIN_HISTORICAL_SCORE
    global A_ROMANCE_MIN_WORLDBUILDING_SCORE

    policy = load_relationship_runtime_canon_policy(governance_root, relationship_policy=relationship_policy)
    A_HISTORY_GRADE_TYPE = str(policy.get("scoreboardHistoryGradeType") or A_HISTORY_GRADE_TYPE)
    A_ROMANCE_GRADE_TYPE = str(policy.get("scoreboardRomanceGradeType") or A_ROMANCE_GRADE_TYPE)
    ready_types = policy.get("scoreboardReadyEvalGradeTypes")
    if isinstance(ready_types, list):
        READY_EVAL_GRADE_TYPES = {str(item).strip() for item in ready_types if str(item).strip()}
    A_HISTORY_MIN_HISTORICAL_SCORE = float(policy.get("scoreboardHistoryMinHistoricalScore") or A_HISTORY_MIN_HISTORICAL_SCORE)
    A_ROMANCE_MIN_WORLDBUILDING_SCORE = float(policy.get("scoreboardRomanceMinWorldbuildingScore") or A_ROMANCE_MIN_WORLDBUILDING_SCORE)




def scoreboard_scoring_section(section_name: str) -> dict[str, float | int]:
    defaults = DEFAULT_SCOREBOARD_SCORING_POLICY.get(section_name) or {}
    policy = FULL_ROSTER_SCOREBOARD_POLICY.get("scoring")
    section = policy.get(section_name) if isinstance(policy, dict) else None
    merged: dict[str, float | int] = dict(defaults)
    if isinstance(section, dict):
        for key, value in section.items():
            if isinstance(value, (int, float)):
                merged[str(key)] = value
    return merged


def scoreboard_float(section_name: str, key: str, fallback: float) -> float:
    value = scoreboard_scoring_section(section_name).get(key, fallback)
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def scoreboard_int(section_name: str, key: str, fallback: int) -> int:
    value = scoreboard_scoring_section(section_name).get(key, fallback)
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def merge_dict(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = merge_dict(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_lane_thresholds(config_path: str | Path | None, profile: str) -> dict[str, Any]:
    defaults = dict(DEFAULT_LANE_THRESHOLDS)
    if not config_path:
        return defaults
    path = resolve_path(config_path)
    if not path.exists():
        return defaults
    payload = read_json(path)
    if not isinstance(payload, dict):
        return defaults
    root_defaults = payload.get("defaults") if isinstance(payload.get("defaults"), dict) else {}
    root_lane = root_defaults.get("laneThresholds") if isinstance(root_defaults.get("laneThresholds"), dict) else {}
    merged = merge_dict(defaults, root_lane)
    profiles = payload.get("profiles") if isinstance(payload.get("profiles"), dict) else {}
    profile_payload = profiles.get(profile) if isinstance(profiles.get(profile), dict) else {}
    profile_lane = profile_payload.get("laneThresholds") if isinstance(profile_payload.get("laneThresholds"), dict) else {}
    merged = merge_dict(merged, profile_lane)
    return merged


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        text = line.strip()
        if not text:
            continue
        value = json.loads(text)
        if isinstance(value, dict):
            rows.append(value)
    return rows


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def normalize_gender(raw: Any) -> str:
    text = str(raw or "").strip().lower()
    if text in FEMALE_TOKENS:
        return "female"
    if text in MALE_TOKENS:
        return "male"
    if any(token in text for token in ("female", "women", "女")):
        return "female"
    if any(token in text for token in ("male", "men", "男")):
        return "male"
    return "unknown"


def selected_ready_event(event: dict[str, Any]) -> bool:
    if str(event.get("reviewStatus") or "ready") != "ready":
        return False
    if str(event.get("eventType") or "") == "alias-smoke":
        return False
    source_refs = [str(ref).strip() for ref in (event.get("sourceRefs") or []) if str(ref).strip()]
    if source_refs and all(ref.startswith("fixture.") for ref in source_refs):
        return False
    return True


def gather_event_stats(events: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "eventCount": 0,
            "sourceRefs": set(),
            "relationshipEdgeCount": 0,
            "locationCount": 0,
        }
    )
    for event in events:
        if not selected_ready_event(event):
            continue
        source_refs = {str(ref).strip() for ref in (event.get("sourceRefs") or []) if str(ref).strip()}
        relationship_edges = list(event.get("relationshipEdges") or [])
        location = str(event.get("location") or "").strip()
        for raw_id in event.get("generalIds") or []:
            general_id = str(raw_id or "").strip()
            if not general_id:
                continue
            row = stats[general_id]
            row["eventCount"] += 1
            row["sourceRefs"].update(source_refs)
            row["relationshipEdgeCount"] += len(relationship_edges)
            if location:
                row["locationCount"] += 1
    return stats


def gather_generic_counts(candidates: list[dict[str, Any]]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for candidate in candidates:
        for raw_id in candidate.get("generalIds") or []:
            general_id = str(raw_id or "").strip()
            if general_id:
                counter[general_id] += 1
    return counter


def gather_pilot_rows(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    rows = payload.get("generals") if isinstance(payload, dict) else []
    by_id: dict[str, dict[str, Any]] = {}
    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            general_id = str(row.get("generalId") or "").strip()
            if general_id:
                by_id[general_id] = row
    return by_id


def person_id_from_seed(seed: dict[str, Any]) -> str:
    return str(seed.get("generalId") or seed.get("candidatePersonId") or "").strip()


def gather_seed_stats(ranking_payloads: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "seedCount": 0,
            "crossFamilyClaimCount": 0,
            "sourceFamilies": set(),
            "maxSeedScore": 0.0,
        }
    )
    for payload in ranking_payloads:
        rows: list[Any] = []
        if isinstance(payload.get("rankedSeeds"), list):
            rows = payload["rankedSeeds"]
        elif isinstance(payload.get("rows"), list):
            rows = payload["rows"]
        for row in rows:
            if not isinstance(row, dict):
                continue
            person_id = person_id_from_seed(row)
            if not person_id:
                continue
            target = stats[person_id]
            target["seedCount"] += 1
            families = list(row.get("crossSiteSourceFamilies") or [])
            if len(families) >= 2:
                target["crossFamilyClaimCount"] += 1
            family = str(row.get("sourceFamily") or row.get("sourceId") or "").strip()
            if family:
                target["sourceFamilies"].add(family)
            score = float(row.get("seedConfidenceScore") or 0.0)
            target["maxSeedScore"] = max(target["maxSeedScore"], score)
    return stats


def person_ids_from_card(card: dict[str, Any]) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for raw_id in card.get("generalIds") or []:
        general_id = str(raw_id or "").strip()
        if general_id:
            rows.append(("canonical", general_id))
    for raw_id in card.get("candidatePersonIds") or []:
        candidate_id = str(raw_id or "").strip()
        if candidate_id:
            rows.append(("shadow", candidate_id))
    return rows


def gather_card_stats(card_rows: list[dict[str, Any]]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "cardCount": 0,
            "externalEvidenceCount": 0,
            "externalHistoryCount": 0,
            "externalRomanceCount": 0,
            "externalWorldbuildingCount": 0,
            "distinctSourceFamilies": set(),
            "distinctHistoryFamilies": set(),
            "quoteLocatorHashCount": 0,
            "crossFamilyClaimCountFromCards": 0,
        }
    )
    shadow_index: dict[str, dict[str, Any]] = {}

    for card in card_rows:
        source_family = str(card.get("sourceFamily") or card.get("sourcePolicyId") or "").strip()
        source_layer = str(card.get("sourceLayer") or "").strip().lower()
        has_trace = bool(card.get("quote")) and bool(card.get("locator") or card.get("textHash"))
        cross_families = list(card.get("crossSiteSourceFamilies") or [])
        for roster_state, person_id in person_ids_from_card(card):
            target = stats[person_id]
            target["cardCount"] += 1
            target["externalEvidenceCount"] += 1
            if source_layer == "history":
                target["externalHistoryCount"] += 1
            elif source_layer == "romance":
                target["externalRomanceCount"] += 1
            else:
                target["externalWorldbuildingCount"] += 1
            if source_family:
                target["distinctSourceFamilies"].add(source_family)
                if source_layer == "history":
                    target["distinctHistoryFamilies"].add(source_family)
            if has_trace:
                target["quoteLocatorHashCount"] += 1
            if len(cross_families) >= 2:
                target["crossFamilyClaimCountFromCards"] += 1

            if roster_state == "shadow":
                info = shadow_index.get(person_id) or {
                    "candidatePersonId": person_id,
                    "displayName": str(card.get("matchedName") or person_id),
                    "sourceFamilies": set(),
                    "cardCount": 0,
                }
                info["displayName"] = str(card.get("matchedName") or info["displayName"] or person_id)
                if source_family:
                    info["sourceFamilies"].add(source_family)
                info["cardCount"] += 1
                shadow_index[person_id] = info

    return stats, shadow_index


def gather_relationship_overlay_stats(edge_rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "relationshipEvidenceCount": 0,
            "relationshipEvidenceStrongCount": 0,
        }
    )
    for row in edge_rows:
        if not isinstance(row, dict):
            continue
        confidence = float(row.get("edgeConfidence") or 0.0)
        participants = {
            str(row.get("fromId") or "").strip(),
            str(row.get("toId") or "").strip(),
        }
        participants.discard("")
        for person_id in participants:
            target = stats[person_id]
            target["relationshipEvidenceCount"] += 1
            if confidence >= 0.75:
                target["relationshipEvidenceStrongCount"] += 1
    return stats


def gather_event_question_seed_stats(seed_rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "eventQuestionSeedCount": 0,
            "eventQuestionStrongSeedCount": 0,
            "eventQuestionSourceRefCount": 0,
        }
    )
    strong_tokens = {"strong", "rich"}
    for row in seed_rows:
        if not isinstance(row, dict):
            continue
        person_id = str(row.get("generalId") or "").strip()
        if not person_id:
            continue
        target = stats[person_id]
        target["eventQuestionSeedCount"] += 1
        target["eventQuestionSourceRefCount"] += int(row.get("sourceRefCount") or 0)
        slot_strength = str(row.get("slotStrength") or "").strip().lower()
        if slot_strength in strong_tokens:
            target["eventQuestionStrongSeedCount"] += 1
    return stats


def completeness_score(
    *,
    display_name: str,
    faction: str,
    event_count: int,
    evidence_ref_count: int,
    relationship_edge_count: int,
    location_count: int,
    keyword_total: int,
    external_evidence_count: int,
) -> float:
    checks = [
        bool(display_name),
        bool(faction),
        event_count > 0,
        evidence_ref_count > 0,
        relationship_edge_count > 0,
        location_count > 0,
        keyword_total > 0,
        external_evidence_count > 0,
    ]
    return round((sum(1 for check in checks if check) / len(checks)) * 100.0, 2)


def female_priority_boost(
    *,
    gender: str,
    event_count: int,
    external_romance_count: int,
    external_worldbuilding_count: int,
    profile: str,
) -> float:
    if gender != "female":
        return 0.0
    if external_romance_count > 0 or external_worldbuilding_count > 0:
        base = 15.0
    elif event_count == 0:
        base = 12.0
    else:
        base = 8.0
    if profile == "female-priority":
        base += 4.0
    return base


def confidence_breakdown(
    *,
    event_count: int,
    evidence_ref_count: int,
    relationship_edge_count: int,
    location_count: int,
    external_history_count: int,
    external_romance_count: int,
    external_worldbuilding_count: int,
    distinct_history_family_count: int,
    cross_family_claim_count: int,
    quote_locator_hash_count: int,
    generic_candidate_count: int,
    readiness_status: str,
    completeness: float,
    keyword_total: int,
    female_boost: float,
) -> dict[str, float]:
    source_strength = clamp(
        10.0
        + min(event_count * 12.0, 48.0)
        + min(external_history_count * 8.0, 24.0)
        + min(evidence_ref_count * 2.5, 18.0)
    )
    cross_evidence = clamp(min(distinct_history_family_count, 3) * 25.0 + min(cross_family_claim_count, 3) * 10.0)
    quote_locator = clamp(min(quote_locator_hash_count, 5) * 18.0 + (15.0 if evidence_ref_count >= 2 else 0.0))
    claim_specificity = clamp(
        min(event_count, 5) * 8.0
        + min(relationship_edge_count, 3) * 12.0
        + min(location_count, 3) * 10.0
        + min(external_history_count + external_romance_count + external_worldbuilding_count, 4) * 6.0
    )

    if readiness_status == "ready-for-dialogue-smoke":
        extractor_agreement = 95.0
    elif readiness_status == "thin-but-testable":
        extractor_agreement = 75.0
    elif event_count > 0:
        extractor_agreement = 60.0
    elif generic_candidate_count > 0:
        extractor_agreement = 50.0
    else:
        extractor_agreement = 35.0

    if event_count > 0:
        reviewer_agreement = 80.0
    elif generic_candidate_count > 0:
        reviewer_agreement = 55.0
    else:
        reviewer_agreement = 35.0

    romance_support = clamp(external_romance_count * 18.0 + external_worldbuilding_count * 10.0)
    relationship_playable = clamp(relationship_edge_count * 22.0)
    activity_dialogue = 100.0 if keyword_total >= 15 else 70.0 if keyword_total >= 5 else 0.0
    conflict_penalty = 12.0 if generic_candidate_count > 0 and event_count == 0 else 0.0
    duplicate_penalty = clamp((external_history_count + external_romance_count + external_worldbuilding_count) - 4.0, 0.0, 8.0)
    stale_penalty = 8.0 if event_count > 0 and external_history_count == 0 and quote_locator_hash_count == 0 else 0.0

    return {
        "sourceStrengthScore": round(source_strength, 2),
        "crossEvidenceScore": round(cross_evidence, 2),
        "quoteLocatorScore": round(quote_locator, 2),
        "claimSpecificityScore": round(claim_specificity, 2),
        "extractorAgreementScore": round(extractor_agreement, 2),
        "reviewerAgreementScore": round(reviewer_agreement, 2),
        "romanceFolkloreSupportScore": round(romance_support, 2),
        "profileCompletenessScore": round(completeness, 2),
        "relationshipPlayableScore": round(relationship_playable, 2),
        "activityDialogueSeedScore": round(activity_dialogue, 2),
        "femalePriorityBoost": round(female_boost, 2),
        "conflictPenalty": round(conflict_penalty, 2),
        "duplicateFamilyPenalty": round(duplicate_penalty, 2),
        "staleEvidencePenalty": round(stale_penalty, 2),
        "contradictionPenalty": round(conflict_penalty, 2),
    }


def historical_trust_score(breakdown: dict[str, float]) -> float:
    weights = scoreboard_scoring_section("historicalTrustScoreWeights")
    penalties = scoreboard_scoring_section("historicalTrustPenaltyWeights")
    value = (
        breakdown["sourceStrengthScore"] * float(weights.get("sourceStrengthScore", 0.30))
        + breakdown["crossEvidenceScore"] * float(weights.get("crossEvidenceScore", 0.25))
        + breakdown["quoteLocatorScore"] * float(weights.get("quoteLocatorScore", 0.15))
        + breakdown["claimSpecificityScore"] * float(weights.get("claimSpecificityScore", 0.10))
        + breakdown["extractorAgreementScore"] * float(weights.get("extractorAgreementScore", 0.10))
        + breakdown["reviewerAgreementScore"] * float(weights.get("reviewerAgreementScore", 0.10))
        - breakdown["conflictPenalty"] * float(penalties.get("conflictPenalty", 1.0))
        - breakdown["duplicateFamilyPenalty"] * float(penalties.get("duplicateFamilyPenalty", 1.0))
        - breakdown["staleEvidencePenalty"] * float(penalties.get("staleEvidencePenalty", 1.0))
    )
    return round(clamp(value), 2)


def worldbuilding_usability_score(*, historical_score: float, breakdown: dict[str, float], has_female_boost: bool) -> float:
    weights = scoreboard_scoring_section("worldbuildingUsabilityWeights")
    limits = scoreboard_scoring_section("worldbuildingUsabilityLimits")
    value = (
        historical_score * float(weights.get("historicalScore", 0.45))
        + breakdown["romanceFolkloreSupportScore"] * float(weights.get("romanceFolkloreSupportScore", 0.20))
        + breakdown["profileCompletenessScore"] * float(weights.get("profileCompletenessScore", 0.15))
        + breakdown["relationshipPlayableScore"] * float(weights.get("relationshipPlayableScore", 0.10))
        + breakdown["activityDialogueSeedScore"] * float(weights.get("activityDialogueSeedScore", 0.10))
        + breakdown["femalePriorityBoost"] * float(weights.get("femalePriorityBoost", 1.0))
        - breakdown["contradictionPenalty"] * float(weights.get("contradictionPenalty", 1.0))
    )
    max_value = float(limits.get("maxWithFemaleBoost", 95.0)) if has_female_boost else float(limits.get("maxDefault", 100.0))
    return round(clamp(value, 0.0, max_value), 2)


def review_grade(
    *,
    historical_score: float,
    worldbuilding_score: float,
    distinct_history_family_count: int,
    event_count: int,
    external_history_count: int,
    external_romance_count: int,
    external_worldbuilding_count: int,
    generic_candidate_count: int,
    missing_fields: list[str],
) -> tuple[str, str]:
    if historical_score >= A_HISTORY_MIN_HISTORICAL_SCORE and (
        distinct_history_family_count >= 2 or (event_count > 0 and external_history_count > 0)
    ):
        return "A", A_HISTORY_GRADE_TYPE
    if worldbuilding_score >= A_ROMANCE_MIN_WORLDBUILDING_SCORE and external_romance_count > 0:
        return "A", A_ROMANCE_GRADE_TYPE
    b_min_historical = scoreboard_float("gradeFallbackThresholds", "bMinHistoricalScore", 50.0)
    b_min_worldbuilding = scoreboard_float("gradeFallbackThresholds", "bMinWorldbuildingScore", 50.0)
    if historical_score >= b_min_historical or worldbuilding_score >= b_min_worldbuilding:
        return "B", "B"
    if generic_candidate_count > 0 or missing_fields:
        return "C", "C"
    return "D", "D"


def next_lane(
    *,
    grade: str,
    historical_score: float,
    missing_fields: list[str],
    generic_candidate_count: int,
    event_count: int,
    card_count: int,
    gender: str,
    profile: str,
    lane_thresholds: dict[str, Any],
) -> str:
    rumination_max = float(lane_thresholds.get("aRuminationHistoricalMax") or 75.0)
    c_human_min = int(lane_thresholds.get("cHumanReviewGenericMin") or 3)
    female_c_to_skill = bool(lane_thresholds.get("femalePriorityCToSkillPreview", True))

    if grade == "A" and historical_score < rumination_max:
        return "rumination"
    if grade == "A":
        return "runtime-readiness"
    if grade == "B" and missing_fields:
        return "deterministic-repair"
    if grade == "B":
        return "skill-preview"
    if grade == "C":
        if missing_fields:
            return "deterministic-repair"
        if generic_candidate_count >= c_human_min:
            if profile == "female-priority" and gender == "female" and female_c_to_skill:
                return "skill-preview"
            return "human-review"
        return "skill-preview"
    if event_count == 0 and card_count == 0:
        return "evidence-discovery"
    return "seed-to-card"


def promotion_state(grade: str, grade_type: str) -> str:
    if grade == "A" and grade_type in READY_EVAL_GRADE_TYPES:
        return "ready-eval"
    if grade in {"A", "B"}:
        return "staged"
    return "blocked"


def missing_angles(
    *,
    display_name: str,
    faction: str,
    event_count: int,
    relationship_edge_count: int,
    relationship_evidence_count: int,
    event_question_seed_count: int,
    location_count: int,
    keyword_total: int,
    external_history_count: int,
    external_worldbuilding_count: int,
) -> list[str]:
    angles: list[str] = []
    if not display_name:
        angles.append("identity")
    if not faction:
        angles.append("title")
    if relationship_edge_count + relationship_evidence_count <= 0:
        angles.append("relationship")
    if event_count + event_question_seed_count <= 0:
        angles.append("event")
    if event_count + event_question_seed_count > 0 and location_count <= 0:
        angles.append("location")
    if keyword_total < 3 and external_worldbuilding_count <= 0:
        angles.append("trait")
    if keyword_total < 8 and event_count <= 0 and external_history_count <= 0:
        angles.append("activity")
    return angles


def priority_score(
    *,
    historical_score: float,
    worldbuilding_score: float,
    completeness: float,
    generic_candidate_count: int,
    female_boost: float,
    missing_field_count: int,
) -> float:
    weights = scoreboard_scoring_section("priorityScoreWeights")
    value = (
        worldbuilding_score * float(weights.get("worldbuildingScore", 0.40))
        + historical_score * float(weights.get("historicalScore", 0.30))
        + completeness * float(weights.get("completeness", 0.20))
        + min(generic_candidate_count, int(weights.get("genericCandidateCap", 8)))
        * float(weights.get("genericCandidateUnitWeight", 2.5))
        + female_boost * float(weights.get("femaleBoost", 1.0))
        - min(missing_field_count, int(weights.get("missingFieldPenaltyCap", 4)))
        * float(weights.get("missingFieldPenaltyWeight", 2.0))
    )
    return round(clamp(value), 2)


def build_row(
    *,
    profile: str,
    lane_thresholds: dict[str, Any],
    general_id: str,
    display_name: str,
    gender: str,
    faction: str,
    roster_state: str,
    event_count: int,
    event_question_seed_count: int,
    event_question_strong_seed_count: int,
    event_question_source_ref_count: int,
    generic_candidate_count: int,
    evidence_ref_count: int,
    relationship_edge_count: int,
    relationship_evidence_count: int,
    relationship_evidence_strong_count: int,
    location_count: int,
    keyword_total: int,
    readiness_status: str,
    seed_count: int,
    card_count: int,
    external_evidence_count: int,
    external_history_count: int,
    external_romance_count: int,
    external_worldbuilding_count: int,
    distinct_source_family_count: int,
    distinct_history_family_count: int,
    cross_family_claim_count: int,
    quote_locator_hash_count: int,
) -> dict[str, Any]:
    effective_event_count = event_count + min(max(event_question_seed_count, 0), 3)
    effective_relationship_edge_count = relationship_edge_count + min(max(relationship_evidence_count, 0), 4)
    effective_evidence_ref_count = evidence_ref_count + (1 if event_question_source_ref_count > 0 else 0)

    missing_fields: list[str] = []
    if effective_event_count > 0 and location_count <= 0:
        missing_fields.append("location")
    if effective_event_count > 0 and effective_relationship_edge_count <= 0:
        missing_fields.append("relationshipEdges")
    if effective_event_count > 0 and effective_evidence_ref_count <= 0:
        missing_fields.append("sourceRefs")

    missing_angle_list = missing_angles(
        display_name=display_name,
        faction=faction,
        event_count=event_count,
        relationship_edge_count=relationship_edge_count,
        relationship_evidence_count=relationship_evidence_count,
        event_question_seed_count=event_question_seed_count,
        location_count=location_count,
        keyword_total=keyword_total,
        external_history_count=external_history_count,
        external_worldbuilding_count=external_worldbuilding_count,
    )

    completeness = completeness_score(
        display_name=display_name,
        faction=faction,
        event_count=effective_event_count,
        evidence_ref_count=effective_evidence_ref_count,
        relationship_edge_count=effective_relationship_edge_count,
        location_count=location_count,
        keyword_total=keyword_total,
        external_evidence_count=external_evidence_count,
    )
    female_boost = female_priority_boost(
        gender=gender,
        event_count=effective_event_count,
        external_romance_count=external_romance_count,
        external_worldbuilding_count=external_worldbuilding_count,
        profile=profile,
    )
    breakdown = confidence_breakdown(
        event_count=effective_event_count,
        evidence_ref_count=effective_evidence_ref_count,
        relationship_edge_count=effective_relationship_edge_count,
        location_count=location_count,
        external_history_count=external_history_count,
        external_romance_count=external_romance_count,
        external_worldbuilding_count=external_worldbuilding_count,
        distinct_history_family_count=distinct_history_family_count,
        cross_family_claim_count=cross_family_claim_count,
        quote_locator_hash_count=quote_locator_hash_count,
        generic_candidate_count=generic_candidate_count,
        readiness_status=readiness_status,
        completeness=completeness,
        keyword_total=keyword_total,
        female_boost=female_boost,
    )
    historical_score = historical_trust_score(breakdown)
    worldbuilding_score = worldbuilding_usability_score(
        historical_score=historical_score,
        breakdown=breakdown,
        has_female_boost=(female_boost > 0.0),
    )
    grade, grade_type = review_grade(
        historical_score=historical_score,
        worldbuilding_score=worldbuilding_score,
        distinct_history_family_count=distinct_history_family_count,
        event_count=effective_event_count,
        external_history_count=external_history_count,
        external_romance_count=external_romance_count,
        external_worldbuilding_count=external_worldbuilding_count,
        generic_candidate_count=generic_candidate_count,
        missing_fields=missing_fields,
    )
    lane = next_lane(
        grade=grade,
        historical_score=historical_score,
        missing_fields=missing_fields,
        generic_candidate_count=generic_candidate_count,
        event_count=effective_event_count,
        card_count=card_count,
        gender=gender,
        profile=profile,
        lane_thresholds=lane_thresholds,
    )
    priority = priority_score(
        historical_score=historical_score,
        worldbuilding_score=worldbuilding_score,
        completeness=completeness,
        generic_candidate_count=generic_candidate_count,
        female_boost=female_boost,
        missing_field_count=len(missing_fields),
    )
    return {
        "generalId": general_id,
        "displayName": display_name,
        "gender": gender,
        "rosterState": roster_state,
        "readinessStatus": readiness_status,
        "reviewGrade": grade,
        "gradeType": grade_type,
        "promotionState": promotion_state(grade, grade_type),
        "nextLane": lane,
        "eventCount": event_count,
        "eventSignalCount": effective_event_count,
        "eventQuestionSeedCount": event_question_seed_count,
        "eventQuestionStrongSeedCount": event_question_strong_seed_count,
        "eventQuestionSourceRefCount": event_question_source_ref_count,
        "genericCandidateCount": generic_candidate_count,
        "evidenceRefCount": evidence_ref_count,
        "evidenceSignalCount": effective_evidence_ref_count,
        "keywordTotal": keyword_total,
        "seedCount": seed_count,
        "cardCount": card_count,
        "crossFamilyClaimCount": cross_family_claim_count,
        "externalEvidenceCount": external_evidence_count,
        "externalHistoryCount": external_history_count,
        "externalRomanceCount": external_romance_count,
        "externalWorldbuildingCount": external_worldbuilding_count,
        "externalDistinctFamilyCount": distinct_source_family_count,
        "externalDistinctHistoryFamilyCount": distinct_history_family_count,
        "relationshipEdgeCount": relationship_edge_count,
        "relationshipSignalCount": effective_relationship_edge_count,
        "relationshipEvidenceCount": relationship_evidence_count,
        "relationshipEvidenceStrongCount": relationship_evidence_strong_count,
        "locationCount": location_count,
        "missingFields": missing_fields,
        "missingAngles": missing_angle_list,
        "historicalTrustScore": historical_score,
        "worldbuildingUsabilityScore": worldbuilding_score,
        "completenessScore": completeness,
        "priorityScore": priority,
        "confidenceBreakdown": breakdown,
        "canonicalWrites": False,
    }


def render_markdown(payload: dict[str, Any]) -> str:
    rows = list(payload.get("rows") or [])
    metrics = payload.get("metrics") or {}
    lines = [
        "# Full Roster Scorecard",
        "",
        f"- Generated At: `{payload.get('generatedAt')}`",
        f"- Profile: `{payload.get('profile')}`",
        f"- canonicalWrites: `{payload.get('canonicalWrites')}`",
        f"- Row Count: `{metrics.get('rowCount')}`",
        f"- Grade Counts: `{metrics.get('gradeCounts')}`",
        f"- Lane Counts: `{metrics.get('laneCounts')}`",
        f"- Avg Historical Trust: `{metrics.get('avgHistoricalTrustScore')}`",
        f"- Avg Worldbuilding Usability: `{metrics.get('avgWorldbuildingUsabilityScore')}`",
        f"- Female Count: `{metrics.get('femaleCount')}`",
        f"- Female Avg Worldbuilding: `{metrics.get('femaleAvgWorldbuildingUsabilityScore')}`",
        "",
        "## Top Rows",
        "",
        "| General | Name | Gender | Grade | H-Score | W-Score | Seeds | Cards | Missing Angles | Lane |",
        "|---|---|---|---|---:|---:|---:|---:|---|---|",
    ]
    for row in rows[:80]:
        lines.append(
            "| `{gid}` | {name} | `{gender}` | `{grade}` | `{h}` | `{w}` | `{seed}` | `{card}` | `{angles}` | `{lane}` |".format(
                gid=row.get("generalId"),
                name=str(row.get("displayName") or "").replace("|", "\\|"),
                gender=row.get("gender"),
                grade=row.get("gradeType") or row.get("reviewGrade"),
                h=row.get("historicalTrustScore"),
                w=row.get("worldbuildingUsabilityScore"),
                seed=row.get("seedCount"),
                card=row.get("cardCount"),
                angles=",".join(row.get("missingAngles") or []) or "-",
                lane=row.get("nextLane"),
            )
        )
    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- `historicalTrustScore` 與 `worldbuildingUsabilityScore` 每輪重算，僅用於 routing，不直接 canonical write。",
            "- 女性加權只影響 `worldbuildingUsabilityScore` 與優先序，不提升 `historicalTrustScore`。",
            "- `A-history` 與 `A-romance` 分開標記，避免把世界觀資料誤報為正史。",
            "",
        ]
    )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build full roster scorecard from pilot/events/external evidence artifacts.")
    parser.add_argument("--generals", default=None)
    parser.add_argument("--events", default=None)
    parser.add_argument("--generic-candidates", default=None)
    parser.add_argument("--pilot-report", default=None)
    parser.add_argument("--relationship-evidence", action="append", default=[])
    parser.add_argument("--event-question-seeds", action="append", default=[])
    parser.add_argument("--candidate-evidence-cards", action="append", default=[])
    parser.add_argument("--seed-ranking-json", action="append", default=[])
    parser.add_argument("--lane-policy-config", default=None)
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT))
    parser.add_argument("--relationship-policy", default=None)
    parser.add_argument("--scoreboard-policy", default=None)
    parser.add_argument("--output-root", default=None)
    parser.add_argument("--profile", choices=PROFILE_CHOICES, default=None)
    parser.add_argument("--pilot-only", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        apply_full_roster_scoreboard_policy(args.governance_root, args.scoreboard_policy)
        apply_full_roster_scoreboard_arg_defaults(args)
        apply_relationship_runtime_canon_policy(args.governance_root, args.relationship_policy)
    except SanguoGovernanceError as exc:
        print(f"[build_full_roster_scoreboard] governance error: {exc}")
        return 2
    output_root = resolve_path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    scoreboard_json = output_root / "full-roster-scoreboard.json"
    scoreboard_md = output_root / "full-roster-scoreboard.zh-TW.md"
    scorecard_json = output_root / "full-roster-scorecard.json"
    scorecard_md = output_root / "full-roster-scorecard.zh-TW.md"
    shadow_json = output_root / "shadow-roster-index.json"
    outputs = [scoreboard_json, scoreboard_md, scorecard_json, scorecard_md, shadow_json]
    if any(path.exists() for path in outputs) and not args.overwrite:
        raise FileExistsError("Scoreboard outputs already exist. Re-run with --overwrite.")

    generals = read_json(resolve_path(args.generals))
    if not isinstance(generals, list):
        raise ValueError("generals.json must be a list.")
    general_by_id = {
        str(row.get("id") or "").strip(): row
        for row in generals
        if isinstance(row, dict) and str(row.get("id") or "").strip()
    }

    events = read_jsonl(resolve_path(args.events))
    event_stats = gather_event_stats(events)
    generic_candidates = read_jsonl(resolve_path(args.generic_candidates))
    generic_counts = gather_generic_counts(generic_candidates)

    pilot_payload = read_json(resolve_path(args.pilot_report))
    pilot_rows = gather_pilot_rows(pilot_payload if isinstance(pilot_payload, dict) else {})

    ranking_payloads: list[dict[str, Any]] = []
    for path_text in args.seed_ranking_json:
        payload = read_json(resolve_path(path_text))
        if isinstance(payload, dict):
            ranking_payloads.append(payload)
    seed_stats = gather_seed_stats(ranking_payloads)

    card_rows: list[dict[str, Any]] = []
    for path_text in args.candidate_evidence_cards:
        card_rows.extend(read_jsonl(resolve_path(path_text)))
    card_stats, shadow_index = gather_card_stats(card_rows)

    relationship_rows: list[dict[str, Any]] = []
    relationship_paths = args.relationship_evidence or [str(DEFAULT_RELATIONSHIP_EVIDENCE_PATH)]
    for path_text in relationship_paths:
        relationship_rows.extend(read_jsonl(resolve_path(path_text)))
    relationship_stats = gather_relationship_overlay_stats(relationship_rows)

    event_seed_rows: list[dict[str, Any]] = []
    event_seed_paths = args.event_question_seeds or [str(DEFAULT_EVENT_QUESTION_SEEDS_PATH)]
    for path_text in event_seed_paths:
        event_seed_rows.extend(read_jsonl(resolve_path(path_text)))
    event_seed_stats = gather_event_question_seed_stats(event_seed_rows)

    lane_thresholds = load_lane_thresholds(args.lane_policy_config, args.profile)

    if args.pilot_only and pilot_rows:
        selected_ids = list(pilot_rows.keys())
    else:
        selected_ids = list(general_by_id.keys())

    canonical_rows: list[dict[str, Any]] = []
    for general_id in selected_ids:
        general = general_by_id.get(general_id) or {}
        display_name = str(general.get("name") or general_id)
        faction = str(general.get("faction") or "")
        gender = normalize_gender(general.get("gender"))
        event_row = event_stats.get(general_id) or {}
        pilot_row = pilot_rows.get(general_id) or {}
        seed_row = seed_stats.get(general_id) or {}
        card_row = card_stats.get(general_id) or {}
        relationship_row = relationship_stats.get(general_id) or {}
        event_seed_row = event_seed_stats.get(general_id) or {}

        readiness_status = str(pilot_row.get("status") or "").strip()
        if not readiness_status:
            if int(event_row.get("eventCount") or 0) > 0 and len(event_row.get("sourceRefs") or set()) >= 2:
                readiness_status = "ready-for-dialogue-smoke"
            elif int(event_row.get("eventCount") or 0) > 0 or int(generic_counts.get(general_id) or 0) > 0:
                readiness_status = "thin-but-testable"
            else:
                readiness_status = "needs-etl-evidence"

        canonical_rows.append(
            build_row(
                profile=args.profile,
                lane_thresholds=lane_thresholds,
                general_id=general_id,
                display_name=display_name,
                gender=gender,
                faction=faction,
                roster_state="canonical",
                event_count=int(event_row.get("eventCount") or 0),
                event_question_seed_count=int(event_seed_row.get("eventQuestionSeedCount") or 0),
                event_question_strong_seed_count=int(event_seed_row.get("eventQuestionStrongSeedCount") or 0),
                event_question_source_ref_count=int(event_seed_row.get("eventQuestionSourceRefCount") or 0),
                generic_candidate_count=int(generic_counts.get(general_id) or 0),
                evidence_ref_count=len(event_row.get("sourceRefs") or set()),
                relationship_edge_count=int(event_row.get("relationshipEdgeCount") or 0),
                relationship_evidence_count=int(relationship_row.get("relationshipEvidenceCount") or 0),
                relationship_evidence_strong_count=int(relationship_row.get("relationshipEvidenceStrongCount") or 0),
                location_count=int(event_row.get("locationCount") or 0),
                keyword_total=int(pilot_row.get("keywordTotal") or 0),
                readiness_status=readiness_status,
                seed_count=int(seed_row.get("seedCount") or 0),
                card_count=int(card_row.get("cardCount") or 0),
                external_evidence_count=int(card_row.get("externalEvidenceCount") or 0),
                external_history_count=int(card_row.get("externalHistoryCount") or 0),
                external_romance_count=int(card_row.get("externalRomanceCount") or 0),
                external_worldbuilding_count=int(card_row.get("externalWorldbuildingCount") or 0),
                distinct_source_family_count=len(card_row.get("distinctSourceFamilies") or set()),
                distinct_history_family_count=len(card_row.get("distinctHistoryFamilies") or set()),
                cross_family_claim_count=int(seed_row.get("crossFamilyClaimCount") or 0) + int(card_row.get("crossFamilyClaimCountFromCards") or 0),
                quote_locator_hash_count=int(card_row.get("quoteLocatorHashCount") or 0),
            )
        )

    shadow_rows: list[dict[str, Any]] = []
    for candidate_person_id, info in shadow_index.items():
        seed_row = seed_stats.get(candidate_person_id) or {}
        card_row = card_stats.get(candidate_person_id) or {}
        relationship_row = relationship_stats.get(candidate_person_id) or {}
        event_seed_row = event_seed_stats.get(candidate_person_id) or {}
        shadow_rows.append(
            build_row(
                profile=args.profile,
                lane_thresholds=lane_thresholds,
                general_id=candidate_person_id,
                display_name=str(info.get("displayName") or candidate_person_id),
                gender="unknown",
                faction="",
                roster_state="shadow",
                event_count=0,
                event_question_seed_count=int(event_seed_row.get("eventQuestionSeedCount") or 0),
                event_question_strong_seed_count=int(event_seed_row.get("eventQuestionStrongSeedCount") or 0),
                event_question_source_ref_count=int(event_seed_row.get("eventQuestionSourceRefCount") or 0),
                generic_candidate_count=0,
                evidence_ref_count=0,
                relationship_edge_count=0,
                relationship_evidence_count=int(relationship_row.get("relationshipEvidenceCount") or 0),
                relationship_evidence_strong_count=int(relationship_row.get("relationshipEvidenceStrongCount") or 0),
                location_count=0,
                keyword_total=0,
                readiness_status="needs-etl-evidence",
                seed_count=int(seed_row.get("seedCount") or 0),
                card_count=int(card_row.get("cardCount") or 0),
                external_evidence_count=int(card_row.get("externalEvidenceCount") or 0),
                external_history_count=int(card_row.get("externalHistoryCount") or 0),
                external_romance_count=int(card_row.get("externalRomanceCount") or 0),
                external_worldbuilding_count=int(card_row.get("externalWorldbuildingCount") or 0),
                distinct_source_family_count=len(card_row.get("distinctSourceFamilies") or set()),
                distinct_history_family_count=len(card_row.get("distinctHistoryFamilies") or set()),
                cross_family_claim_count=int(seed_row.get("crossFamilyClaimCount") or 0) + int(card_row.get("crossFamilyClaimCountFromCards") or 0),
                quote_locator_hash_count=int(card_row.get("quoteLocatorHashCount") or 0),
            )
        )

    rows = canonical_rows + shadow_rows
    rows.sort(
        key=lambda row: (
            -float(row.get("priorityScore") or 0.0),
            -float(row.get("worldbuildingUsabilityScore") or 0.0),
            -float(row.get("historicalTrustScore") or 0.0),
            str(row.get("generalId") or ""),
        )
    )

    grade_counts = Counter(str(row.get("reviewGrade") or "D") for row in rows)
    lane_counts = Counter(str(row.get("nextLane") or "evidence-discovery") for row in rows)
    female_rows = [row for row in rows if row.get("gender") == "female"]
    historical_scores = [float(row.get("historicalTrustScore") or 0.0) for row in rows]
    world_scores = [float(row.get("worldbuildingUsabilityScore") or 0.0) for row in rows]

    payload = {
        "version": "2.2.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-scoreboard",
        "profile": args.profile,
        "canonicalWrites": False,
        "inputs": {
            "generalsPath": repo_relative(resolve_path(args.generals)),
            "eventsPath": repo_relative(resolve_path(args.events)),
            "genericCandidatesPath": repo_relative(resolve_path(args.generic_candidates)),
            "pilotReportPath": repo_relative(resolve_path(args.pilot_report)),
            "relationshipEvidencePaths": [repo_relative(resolve_path(path_text)) for path_text in relationship_paths],
            "eventQuestionSeedPaths": [repo_relative(resolve_path(path_text)) for path_text in event_seed_paths],
            "candidateEvidenceCardsPaths": [repo_relative(resolve_path(path_text)) for path_text in args.candidate_evidence_cards],
            "seedRankingJsonPaths": [repo_relative(resolve_path(path_text)) for path_text in args.seed_ranking_json],
            "lanePolicyConfigPath": repo_relative(resolve_path(args.lane_policy_config)),
            "pilotOnly": bool(args.pilot_only),
        },
        "outputs": {
            "scoreboardJsonPath": repo_relative(scoreboard_json),
            "scoreboardMarkdownPath": repo_relative(scoreboard_md),
            "scorecardJsonPath": repo_relative(scorecard_json),
            "scorecardMarkdownPath": repo_relative(scorecard_md),
            "shadowRosterPath": repo_relative(shadow_json),
        },
        "metrics": {
            "rowCount": len(rows),
            "canonicalCount": len(canonical_rows),
            "shadowCount": len(shadow_rows),
            "femaleCount": len(female_rows),
            "avgHistoricalTrustScore": round(sum(historical_scores) / max(len(historical_scores), 1), 2),
            "avgWorldbuildingUsabilityScore": round(sum(world_scores) / max(len(world_scores), 1), 2),
            "femaleAvgWorldbuildingUsabilityScore": round(
                sum(float(row.get("worldbuildingUsabilityScore") or 0.0) for row in female_rows) / max(len(female_rows), 1),
                2,
            ),
            "gradeCounts": dict(sorted(grade_counts.items())),
            "laneCounts": dict(sorted(lane_counts.items())),
            "aHistoryCount": sum(1 for row in rows if row.get("gradeType") == A_HISTORY_GRADE_TYPE),
            "aRomanceCount": sum(1 for row in rows if row.get("gradeType") == A_ROMANCE_GRADE_TYPE),
            "seedCount": sum(int(row.get("seedCount") or 0) for row in rows),
            "candidateCardCount": sum(int(row.get("cardCount") or 0) for row in rows),
            "relationshipEvidenceCount": sum(int(row.get("relationshipEvidenceCount") or 0) for row in rows),
            "eventQuestionSeedCount": sum(int(row.get("eventQuestionSeedCount") or 0) for row in rows),
            "laneThresholds": lane_thresholds,
        },
        "rows": rows,
    }

    shadow_payload = {
        "version": "1.0.0",
        "generatedAt": payload["generatedAt"],
        "canonicalWrites": False,
        "rows": [
            {
                "candidatePersonId": row.get("generalId"),
                "displayName": row.get("displayName"),
                "seedCount": row.get("seedCount"),
                "cardCount": row.get("cardCount"),
                "externalDistinctFamilyCount": row.get("externalDistinctFamilyCount"),
                "nextLane": row.get("nextLane"),
                "worldbuildingUsabilityScore": row.get("worldbuildingUsabilityScore"),
            }
            for row in shadow_rows
        ],
    }

    write_json(scoreboard_json, payload)
    scoreboard_md.write_text(render_markdown(payload), encoding="utf-8")
    write_json(scorecard_json, payload)
    scorecard_md.write_text(render_markdown(payload), encoding="utf-8")
    write_json(shadow_json, shadow_payload)

    print(f"[build_full_roster_scoreboard] wrote {scoreboard_json}")
    print(f"[build_full_roster_scoreboard] wrote {scoreboard_md}")
    print(f"[build_full_roster_scoreboard] wrote {scorecard_json}")
    print(f"[build_full_roster_scoreboard] wrote {scorecard_md}")
    print(f"[build_full_roster_scoreboard] rows={len(rows)} shadowRoster={len(shadow_rows)} canonicalWrites=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
