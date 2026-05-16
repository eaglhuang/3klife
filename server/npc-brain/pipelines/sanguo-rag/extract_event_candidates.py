from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from gold_seed_registry import GOLD_SEED_BATTLE_SPECS as RAW_GOLD_SEED_BATTLE_SPECS
from sanguo_governance_loader import (
    SanguoGovernanceError,
    load_event_candidate_cue_rules,
    load_event_candidate_extraction_policy,
)


DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_DIALOGUE_RESOLUTION_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/dialogue-resolution/dialogue-resolution.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/events")
DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
DEFAULT_PILOT_GENERAL = ""
DEFAULT_ALIAS_SMOKE_TARGETS: dict[str, str] = {}
DECORATIVE_WRAPPER_CHARS = "【】[]()（）「」『』《》〈〉"
LOCATION_PATTERN = re.compile(r"([一-龥]{1,8}(?:津口|橋|口|坡|寨|城|津|渡|關|山|江|河))")
LOCATION_FALSE_POSITIVE_TERMS: list[str] = []
BATTLE_SIGNAL_TERMS: list[str] = []
DIRECT_BATTLE_SIGNAL_TERMS: list[str] = []
GENERIC_BATTLE_EXCLUDE_TERMS: list[str] = []
FEMALE_INTERACTION_SIGNAL_TERMS: list[str] = []
FEMALE_INTERACTION_LOCATION_TERMS: list[str] = []
FEMALE_RELATIONSHIP_TYPE_OVERRIDES: dict[tuple[str, str], str] = {}
FEMALE_CONTEXT_GENERAL_INJECTIONS: list[dict[str, object]] = []


class RelationshipEdge(BaseModel):
    fromId: str = Field(description="Source entity id or keyword key")
    toId: str = Field(description="Target entity id or keyword key")
    type: str = Field(description="Relationship type")
    evidenceRefs: list[str] = Field(default_factory=list, description="Source refs supporting this edge")
    edgeConfidence: float = Field(default=0.0, description="Confidence that this relationship edge was correctly extracted")
    edgeStrength: float | None = Field(default=None, description="Optional semantic strength estimate for this relationship edge")


class EventCandidate(BaseModel):
    eventId: str = Field(description="Stable event id")
    chapterNo: int | None = Field(default=None, description="Chapter number")
    eventKey: str = Field(description="Stable event key")
    eventType: str = Field(description="battle, alias-smoke, dialogue, or mention-cluster")
    subtype: str | None = Field(default=None, description="Stable taxonomy subtype when available")
    generalIds: list[str] = Field(default_factory=list, description="Resolved participant ids")
    location: str | None = Field(default=None, description="Main location label")
    summary: str = Field(description="Short deterministic event summary")
    sourceQuote: str = Field(description="Representative source quote/snippet")
    relationshipEdges: list[RelationshipEdge] = Field(default_factory=list, description="Deterministic relationship edges")
    moodTags: list[str] = Field(default_factory=list, description="Mood tags for persona/dialogue projection")
    affectTags: list[str] = Field(default_factory=list, description="Affect story tags such as family_affection or friendship_loyalty")
    aptitudeTags: list[str] = Field(default_factory=list, description="Talent tags such as martial_weapon, governance, or literary_art")
    roleActivityTags: list[str] = Field(default_factory=list, description="Work, livelihood, or social role tags")
    activitySeedHints: list[str] = Field(default_factory=list, description="Quest/activity seed hints projected from evidence")
    itemRefs: list[str] = Field(default_factory=list, description="Equipment, object, or gift references")
    decisionWeightHints: list[str] = Field(default_factory=list, description="AI decision weight hints projected from this event")
    choiceWeightHints: list[str] = Field(default_factory=list, description="Moral-neutral activity choice weight hints")
    confidence: float = Field(default=0.0, description="Overall deterministic confidence")
    sourceRefs: list[str] = Field(default_factory=list, description="Source refs supporting this event")
    extractionMode: str = Field(default="deterministic-pilot", description="Extraction mode")
    reviewStatus: str = Field(default="ready", description="ready or needs-review")
    unresolvedParticipants: list[str] = Field(default_factory=list, description="Labels that stayed unresolved")


class GoldSeedBattleSpec(BaseModel):
    eventId: str
    chapterNo: int
    eventKey: str
    summary: str
    sourceRefs: list[str] = Field(default_factory=list)
    requiredParticipants: list[str] = Field(default_factory=list)
    preferredQuoteTerms: list[str] = Field(default_factory=list)
    fallbackLocation: str | None = None
    relationshipEdges: list[RelationshipEdge] = Field(default_factory=list)
    moodTags: list[str] = Field(default_factory=list)


GOLD_SEED_BATTLE_SPECS = [GoldSeedBattleSpec.model_validate(spec) for spec in RAW_GOLD_SEED_BATTLE_SPECS]



EVENT_CANDIDATE_POLICY: dict[str, Any] = {}
EVENT_CANDIDATE_CUE_RULES: list[dict[str, Any]] = []


def _coerce_terms(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def _event_candidate_rule_by_name(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(row.get("constantName") or ""): row for row in rows}


def _alias_smoke_targets_from_policy(policy: dict[str, Any]) -> dict[str, str]:
    targets: dict[str, str] = {}
    for row in policy.get("aliasSmokeTargets") or []:
        if not isinstance(row, dict):
            continue
        label = str(row.get("label") or "").strip()
        general_id = str(row.get("generalId") or "").strip()
        if label and general_id:
            targets[label] = general_id
    return targets


def apply_event_candidate_governance(policy: dict[str, Any], cue_rules: list[dict[str, Any]]) -> None:
    global EVENT_CANDIDATE_POLICY, EVENT_CANDIDATE_CUE_RULES
    global DEFAULT_PILOT_GENERAL, DEFAULT_ALIAS_SMOKE_TARGETS
    global LOCATION_FALSE_POSITIVE_TERMS, BATTLE_SIGNAL_TERMS, DIRECT_BATTLE_SIGNAL_TERMS, GENERIC_BATTLE_EXCLUDE_TERMS
    global FEMALE_INTERACTION_SIGNAL_TERMS, FEMALE_INTERACTION_LOCATION_TERMS
    global FEMALE_RELATIONSHIP_TYPE_OVERRIDES, FEMALE_CONTEXT_GENERAL_INJECTIONS

    EVENT_CANDIDATE_POLICY = dict(policy)
    EVENT_CANDIDATE_CUE_RULES = list(cue_rules)
    DEFAULT_PILOT_GENERAL = str(policy.get("pilotGeneral") or "")
    DEFAULT_ALIAS_SMOKE_TARGETS = _alias_smoke_targets_from_policy(policy)
    by_name = _event_candidate_rule_by_name(cue_rules)
    LOCATION_FALSE_POSITIVE_TERMS = _coerce_terms(by_name.get("LOCATION_FALSE_POSITIVE_TERMS", {}).get("terms"))
    BATTLE_SIGNAL_TERMS = _coerce_terms(by_name.get("BATTLE_SIGNAL_TERMS", {}).get("terms"))
    DIRECT_BATTLE_SIGNAL_TERMS = _coerce_terms(by_name.get("DIRECT_BATTLE_SIGNAL_TERMS", {}).get("terms"))
    GENERIC_BATTLE_EXCLUDE_TERMS = _coerce_terms(by_name.get("GENERIC_BATTLE_EXCLUDE_TERMS", {}).get("terms"))
    FEMALE_INTERACTION_SIGNAL_TERMS = _coerce_terms(by_name.get("FEMALE_INTERACTION_SIGNAL_TERMS", {}).get("terms"))
    FEMALE_INTERACTION_LOCATION_TERMS = _coerce_terms(by_name.get("FEMALE_INTERACTION_LOCATION_TERMS", {}).get("terms"))
    context_row = by_name.get("FEMALE_CONTEXT_GENERAL_INJECTIONS", {})
    FEMALE_CONTEXT_GENERAL_INJECTIONS = [entry for entry in context_row.get("entries") or [] if isinstance(entry, dict)]
    FEMALE_RELATIONSHIP_TYPE_OVERRIDES = {
        (str(row.get("fromId") or ""), str(row.get("toId") or "")): str(row.get("type") or "")
        for row in policy.get("femaleRelationshipTypeOverrides") or []
        if isinstance(row, dict) and row.get("fromId") and row.get("toId") and row.get("type")
    }


def effective_candidate_cap(cli_value: int | None, policy_key: str, fallback: int) -> int:
    if cli_value is not None:
        return cli_value
    caps = EVENT_CANDIDATE_POLICY.get("candidateCaps") if isinstance(EVENT_CANDIDATE_POLICY.get("candidateCaps"), dict) else {}
    try:
        return int(caps.get(policy_key, fallback))
    except (TypeError, ValueError):
        return fallback


def generic_battle_candidate_policy() -> dict[str, Any]:
    policy = EVENT_CANDIDATE_POLICY.get("genericBattleCandidate")
    if isinstance(policy, dict):
        return policy
    return {"minGeneralIds": 3, "minSignalScore": 2, "confidenceCap": 0.78, "confidenceBase": 0.45, "generalIdWeight": 0.025, "signalScoreWeight": 0.025}


def generic_battle_confidence(general_count: int, signal_score: int) -> float:
    policy = generic_battle_candidate_policy()
    return min(
        float(policy.get("confidenceCap", 0.78)),
        float(policy.get("confidenceBase", 0.45))
        + general_count * float(policy.get("generalIdWeight", 0.025))
        + signal_score * float(policy.get("signalScoreWeight", 0.025)),
    )


def female_interaction_candidate_policy() -> dict[str, Any]:
    policy = EVENT_CANDIDATE_POLICY.get("femaleInteractionCandidate")
    if isinstance(policy, dict):
        return policy
    return {"minSignalScore": 1, "confidenceCap": 0.82, "confidenceBase": 0.5, "femaleIdWeight": 0.04, "generalIdWeight": 0.015, "signalScoreWeight": 0.035}


def female_interaction_confidence(female_count: int, general_count: int, signal_score: int) -> float:
    policy = female_interaction_candidate_policy()
    return min(
        float(policy.get("confidenceCap", 0.82)),
        float(policy.get("confidenceBase", 0.5))
        + female_count * float(policy.get("femaleIdWeight", 0.04))
        + general_count * float(policy.get("generalIdWeight", 0.015))
        + signal_score * float(policy.get("signalScoreWeight", 0.035)),
    )


def female_interaction_subtype_rules() -> list[dict[str, Any]]:
    by_name = _event_candidate_rule_by_name(EVENT_CANDIDATE_CUE_RULES)
    subtype_row = by_name.get("FEMALE_INTERACTION_SUBTYPE_RULES", {})
    return [entry for entry in subtype_row.get("entries") or [] if isinstance(entry, dict)]


def female_relationship_edge_policy() -> dict[str, Any]:
    policy = EVENT_CANDIDATE_POLICY.get("femaleRelationshipEdge")
    return policy if isinstance(policy, dict) else {}


def female_relation_type_for_subtype(subtype: str) -> str:
    relation_by_subtype = female_relationship_edge_policy().get("relationTypeBySubtype")
    if not isinstance(relation_by_subtype, dict):
        return "spouse" if subtype == "marriage_alliance" else "mentions"
    return str(relation_by_subtype.get(subtype) or relation_by_subtype.get("default") or "mentions")


def female_edge_scores(edge_type: str) -> tuple[float, float]:
    defaults = female_relationship_edge_policy().get("edgeDefaults")
    if not isinstance(defaults, dict):
        return (0.62, 0.35) if edge_type == "mentions" else (0.82, 0.65)
    key = "mentions" if edge_type == "mentions" else "specificRelation"
    values = defaults.get(key) if isinstance(defaults.get(key), dict) else {}
    return float(values.get("edgeConfidence", 0.62 if edge_type == "mentions" else 0.82)), float(values.get("edgeStrength", 0.35 if edge_type == "mentions" else 0.65))


def female_edge_limit() -> int:
    try:
        return int(female_relationship_edge_policy().get("maxEdges", 4))
    except (TypeError, ValueError):
        return 4


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build deterministic pilot event candidates from observed mentions.")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH), help="observed-mentions.json path")
    parser.add_argument("--dialogue-resolution", default=str(DEFAULT_DIALOGUE_RESOLUTION_PATH), help="dialogue-resolution.json path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory for event candidates")
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH), help="stable-knowledge-bootstrap.json path for female priority profiles")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--event-candidate-policy", default=None, help="Override policy-event-candidate-extraction.json path")
    parser.add_argument("--event-candidate-cue-rules", default=None, help="Override rule-event-candidate-cues.jsonl path")
    parser.add_argument("--pilot-general", default=None, help="Primary generalId for the pilot event. Defaults to governance policy.")
    parser.add_argument(
        "--alias-smoke-target",
        action="append",
        default=[],
        help="Alias smoke target in label=generalId form. Defaults to governance policy alias smoke targets.",
    )
    parser.add_argument("--max-snippets", type=int, default=None, help="Maximum snippets per event review section")
    parser.add_argument("--max-generic-battle-candidates", type=int, default=None, help="Maximum generic battle candidates to write into review queue")
    parser.add_argument("--max-female-interaction-candidates", type=int, default=None, help="Maximum female interaction candidates to write into review queue")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting output files")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_label(value: str) -> str:
    cleaned = value.strip().strip(DECORATIVE_WRAPPER_CHARS)
    cleaned = re.sub(r"[\s　]+", "", cleaned)
    cleaned = re.sub(r"[·•‧・]", "", cleaned)
    return cleaned.strip().lower()


def parse_alias_smoke_targets(raw_targets: list[str], default_targets: dict[str, str] | None = None) -> dict[str, str]:
    if not raw_targets:
        return dict(default_targets or DEFAULT_ALIAS_SMOKE_TARGETS)
    targets: dict[str, str] = {}
    for raw_target in raw_targets:
        if "=" not in raw_target:
            raise ValueError(f"Invalid --alias-smoke-target, expected label=generalId: {raw_target}")
        label, general_id = raw_target.split("=", 1)
        label = label.strip()
        general_id = general_id.strip()
        if not label or not general_id:
            raise ValueError(f"Invalid --alias-smoke-target, expected label=generalId: {raw_target}")
        targets[label] = general_id
    return targets


def ensure_output_root(output_root: Path, overwrite: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [
        output_root / "events.jsonl",
        output_root / "events-review.md",
        output_root / "events-summary.json",
        output_root / "generic-battle-candidates.jsonl",
        output_root / "generic-battle-candidates-review.md",
        output_root / "female-interaction-candidates.jsonl",
        output_root / "female-interaction-candidates-review.md",
    ]
    existing = [path for path in outputs if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def load_observed_mentions(path: Path) -> list[dict]:
    payload = read_json(path)
    return payload.get("data") or []


def load_dialogue_resolution(path: Path) -> list[dict]:
    if not path.exists():
        return []
    payload = read_json(path)
    return payload.get("data") or []


def unique_sorted(values: list[str]) -> list[str]:
    return sorted({value for value in values if value})


def representative_quote(rows: list[dict], preferred_terms: list[str] | None = None) -> str:
    snippets = [str(row.get("textSnippet") or "").strip() for row in rows if str(row.get("textSnippet") or "").strip()]
    if not snippets:
        return ""
    if preferred_terms:
        preferred = [snippet for snippet in snippets if any(term in snippet for term in preferred_terms)]
        if preferred:
            return max(preferred, key=len)[:180]
    return max(snippets, key=len)[:180]


def source_refs(rows: list[dict]) -> list[str]:
    refs: list[str] = []
    seen = set()
    for row in rows:
        source_ref = str(row.get("sourceRef") or "")
        if source_ref and source_ref not in seen:
            seen.add(source_ref)
            refs.append(source_ref)
    return refs


def collect_general_ids(rows: list[dict]) -> list[str]:
    ids: list[str] = []
    for row in rows:
        ids.extend(row.get("matchedGeneralIds") or [])
        ids.extend(row.get("sceneParticipants") or [])
    return unique_sorted(ids)


def source_ref_key(source_ref: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", source_ref).strip("-").lower() or "unknown"


def battle_signal_score(rows: list[dict]) -> int:
    text = "".join(str(row.get("textSnippet") or "") for row in rows)
    return sum(1 for term in BATTLE_SIGNAL_TERMS if term in text)


def looks_like_non_battle_biography(rows: list[dict]) -> bool:
    text = "".join(str(row.get("textSnippet") or "") for row in rows)
    if not any(term in text for term in GENERIC_BATTLE_EXCLUDE_TERMS):
        return False
    return not any(term in text for term in DIRECT_BATTLE_SIGNAL_TERMS)


def derive_battle_location(rows: list[dict], fallback_location: str | None) -> str | None:
    if fallback_location:
        return fallback_location
    candidates: list[str] = []
    for row in rows:
        snippet = str(row.get("textSnippet") or "")
        candidates.extend(
            match.group(1)
            for match in LOCATION_PATTERN.finditer(snippet)
            if not any(term in match.group(1) for term in LOCATION_FALSE_POSITIVE_TERMS)
        )
    if not candidates:
        return fallback_location
    return sorted(Counter(candidates).items(), key=lambda item: (-item[1], len(item[0]), item[0]))[0][0]


def extract_battle_cluster(rows: list[dict], spec: GoldSeedBattleSpec) -> tuple[list[dict], list[str], list[str], str | None, str]:
    selected = [
        row
        for row in rows
        if row.get("chapterNo") == spec.chapterNo
        and str(row.get("sourceRef") or "") in set(spec.sourceRefs)
        and (set(spec.requiredParticipants) & set((row.get("matchedGeneralIds") or []) + (row.get("sceneParticipants") or [])))
    ]
    refs = source_refs(selected)
    general_ids = collect_general_ids(selected)
    for general_id in spec.requiredParticipants:
        if general_id not in general_ids:
            general_ids.append(general_id)
    general_ids = unique_sorted(general_ids)
    location = derive_battle_location(selected, spec.fallbackLocation)
    source_quote = representative_quote(selected, preferred_terms=spec.preferredQuoteTerms)
    return selected, refs, general_ids, location, source_quote


def build_gold_seed_battle_event(rows: list[dict], spec: GoldSeedBattleSpec) -> EventCandidate:
    selected, refs, general_ids, location, source_quote = extract_battle_cluster(rows, spec)
    relationship_edges = [
        RelationshipEdge(
            fromId=edge.fromId,
            toId=edge.toId,
            type=edge.type,
            evidenceRefs=refs[:4] if refs else list(edge.evidenceRefs),
            edgeConfidence=edge.edgeConfidence,
            edgeStrength=edge.edgeStrength,
        )
        for edge in spec.relationshipEdges
    ]
    return EventCandidate(
        eventId=spec.eventId,
        chapterNo=spec.chapterNo,
        eventKey=spec.eventKey,
        eventType="battle",
        subtype="battle_duel",
        generalIds=general_ids,
        location=location,
        summary=spec.summary,
        sourceQuote=source_quote,
        relationshipEdges=relationship_edges,
        moodTags=spec.moodTags,
        confidence=0.9 if selected else 0.0,
        sourceRefs=refs,
        extractionMode="deterministic-gold-seed",
        reviewStatus="ready" if selected else "needs-review",
    )


def build_gold_seed_battle_events(rows: list[dict]) -> list[EventCandidate]:
    return [build_gold_seed_battle_event(rows, spec) for spec in GOLD_SEED_BATTLE_SPECS]


def gold_seed_source_refs() -> set[str]:
    return {source_ref for spec in GOLD_SEED_BATTLE_SPECS for source_ref in spec.sourceRefs}


def build_generic_battle_candidates(rows: list[dict], max_candidates: int) -> list[EventCandidate]:
    grouped: dict[tuple[int, str], list[dict]] = defaultdict(list)
    excluded_source_refs = gold_seed_source_refs()
    for row in rows:
        if row.get("matchStatus") != "resolved":
            continue
        chapter_no = row.get("chapterNo")
        source_ref = str(row.get("sourceRef") or "")
        if not isinstance(chapter_no, int) or not source_ref or source_ref in excluded_source_refs:
            continue
        grouped[(chapter_no, source_ref)].append(row)

    candidates: list[EventCandidate] = []
    for (chapter_no, source_ref), source_rows in grouped.items():
        general_ids = collect_general_ids(source_rows)
        signal_score = battle_signal_score(source_rows)
        generic_policy = generic_battle_candidate_policy()
        if len(general_ids) < int(generic_policy.get("minGeneralIds", 3)) or signal_score < int(generic_policy.get("minSignalScore", 2)):
            continue
        if looks_like_non_battle_biography(source_rows):
            continue
        source_quote = representative_quote(source_rows, preferred_terms=BATTLE_SIGNAL_TERMS)
        if not source_quote:
            continue
        event_key = f"generic-battle-{source_ref_key(source_ref)}"
        confidence = generic_battle_confidence(len(general_ids), signal_score)
        candidates.append(
            EventCandidate(
                eventId=f"romance.generic-battle.{source_ref_key(source_ref)}",
                chapterNo=chapter_no,
                eventKey=event_key,
                eventType="battle-candidate",
                subtype="battle_candidate",
                generalIds=general_ids,
                location=None,
                summary=f"第 {chapter_no} 回 {source_ref} 偵測到戰事候選段落，需人工確認事件邊界與關係 edge。",
                sourceQuote=source_quote,
                relationshipEdges=[],
                moodTags=["battle-candidate"],
                confidence=round(confidence, 2),
                sourceRefs=[source_ref],
                extractionMode="generic-battle-candidate-v1",
                reviewStatus="needs-review",
            )
        )
    return sorted(candidates, key=lambda event: (-event.confidence, event.chapterNo or 0, event.eventKey))[: max(max_candidates, 0)]


def load_female_priority_profiles(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    payload = read_json(path)
    profiles = {}
    for profile in payload.get("femalePriorityProfiles") or []:
        general_id = str(profile.get("generalId") or "").strip()
        if general_id:
            profiles[general_id] = profile
    return profiles


def female_interaction_signal_score(rows: list[dict]) -> int:
    text = "".join(str(row.get("textSnippet") or "") for row in rows)
    return sum(1 for term in FEMALE_INTERACTION_SIGNAL_TERMS if term in text)


def derive_female_interaction_location(rows: list[dict]) -> str | None:
    text = "".join(str(row.get("textSnippet") or "") for row in rows)
    for term in FEMALE_INTERACTION_LOCATION_TERMS:
        if term in text:
            return term
    return derive_battle_location(rows, None)


def infer_female_interaction_subtype(rows: list[dict]) -> tuple[str, list[str], list[str], list[str]]:
    text = "".join(str(row.get("textSnippet") or "") for row in rows)
    for rule in female_interaction_subtype_rules():
        terms = [str(term) for term in rule.get("terms") or []]
        if any(term in text for term in terms):
            return (
                str(rule.get("subtype") or "female_interaction"),
                [str(item) for item in rule.get("affectTags") or []],
                [str(item) for item in rule.get("interactionTags") or []],
                [str(item) for item in rule.get("activitySeedHints") or []],
            )
    default_rule = female_interaction_candidate_policy().get("subtypeDefault")
    if not isinstance(default_rule, dict):
        default_rule = {"subtype": "female_interaction", "affectTags": ["family_affection"], "interactionTags": ["relationship_discovery"], "activitySeedHints": ["daily_dialogue"]}
    return (
        str(default_rule.get("subtype") or "female_interaction"),
        [str(item) for item in default_rule.get("affectTags") or []],
        [str(item) for item in default_rule.get("interactionTags") or []],
        [str(item) for item in default_rule.get("activitySeedHints") or []],
    )


def build_female_relationship_edges(general_ids: list[str], female_ids: list[str], profiles: dict[str, dict], source_ref: str, subtype: str) -> list[RelationshipEdge]:
    edges: list[RelationshipEdge] = []
    seen: set[tuple[str, str, str]] = set()
    relation_type = female_relation_type_for_subtype(subtype)
    for female_id in female_ids:
        focus_ids = list(profiles.get(female_id, {}).get("relationshipFocusIds") or [])
        focus_ids.extend(target_id for source_id, target_id in FEMALE_RELATIONSHIP_TYPE_OVERRIDES if source_id == female_id and target_id in general_ids)
        for target_id in general_ids:
            if target_id == female_id or target_id not in focus_ids:
                continue
            edge_type = FEMALE_RELATIONSHIP_TYPE_OVERRIDES.get((female_id, target_id), relation_type)
            key = (female_id, target_id, edge_type)
            if key in seen:
                continue
            seen.add(key)
            edges.append(
                RelationshipEdge(
                    fromId=female_id,
                    toId=target_id,
                    type=edge_type,
                    evidenceRefs=[source_ref],
                    edgeConfidence=female_edge_scores(edge_type)[0],
                    edgeStrength=female_edge_scores(edge_type)[1],
                )
            )
    return edges[: max(female_edge_limit(), 0)]


def apply_female_context_general_injections(general_ids: list[str], female_ids: list[str], rows: list[dict]) -> list[str]:
    text = "".join(str(row.get("textSnippet") or "") for row in rows)
    enriched = list(general_ids)
    for injection in FEMALE_CONTEXT_GENERAL_INJECTIONS:
        if injection["femaleId"] not in female_ids:
            continue
        if not any(term in text for term in injection["cueTerms"]):
            continue
        general_id = injection["generalId"]
        if general_id not in enriched:
            enriched.append(general_id)
    return unique_sorted(enriched)


def build_female_interaction_candidates(rows: list[dict], profiles: dict[str, dict], max_candidates: int) -> list[EventCandidate]:
    if not profiles:
        return []
    female_general_ids = set(profiles)
    grouped: dict[tuple[int, str], list[dict]] = defaultdict(list)
    for row in rows:
        if row.get("matchStatus") != "resolved":
            continue
        chapter_no = row.get("chapterNo")
        source_ref = str(row.get("sourceRef") or "")
        if not isinstance(chapter_no, int) or not source_ref:
            continue
        row_general_ids = set((row.get("matchedGeneralIds") or []) + (row.get("sceneParticipants") or []))
        if row_general_ids.intersection(female_general_ids):
            grouped[(chapter_no, source_ref)].append(row)

    candidates: list[EventCandidate] = []
    for (chapter_no, source_ref), source_rows in grouped.items():
        general_ids = collect_general_ids(source_rows)
        female_ids = sorted(set(general_ids).intersection(female_general_ids))
        signal_score = female_interaction_signal_score(source_rows)
        female_policy = female_interaction_candidate_policy()
        if not female_ids or signal_score < int(female_policy.get("minSignalScore", 1)):
            continue
        general_ids = apply_female_context_general_injections(general_ids, female_ids, source_rows)
        source_quote = representative_quote(source_rows, preferred_terms=FEMALE_INTERACTION_SIGNAL_TERMS)
        if not source_quote:
            continue
        subtype, affect_tags, interaction_tags, activity_hints = infer_female_interaction_subtype(source_rows)
        profile_tags = unique_sorted(tag for female_id in female_ids for tag in profiles.get(female_id, {}).get("interactionPriorities") or [])
        location = derive_female_interaction_location(source_rows)
        confidence = female_interaction_confidence(len(female_ids), len(general_ids), signal_score)
        display_names = "、".join(profiles.get(female_id, {}).get("name") or female_id for female_id in female_ids)
        event_key = f"female-interaction-{source_ref_key(source_ref)}"
        candidates.append(
            EventCandidate(
                eventId=f"romance.female-interaction.{source_ref_key(source_ref)}",
                chapterNo=chapter_no,
                eventKey=event_key,
                eventType="female-interaction-candidate",
                subtype=subtype,
                generalIds=general_ids,
                location=location,
                summary=f"第 {chapter_no} 回 {source_ref} 偵測到女性高互動候選段落（{display_names}），需人工確認情緒、關係與互動事件。",
                sourceQuote=source_quote,
                relationshipEdges=build_female_relationship_edges(general_ids, female_ids, profiles, source_ref, subtype),
                moodTags=["female-priority", subtype],
                affectTags=affect_tags,
                activitySeedHints=activity_hints,
                decisionWeightHints=interaction_tags + profile_tags[:4],
                confidence=round(confidence, 2),
                sourceRefs=[source_ref],
                extractionMode="female-interaction-candidate-v1",
                reviewStatus="needs-review",
            )
        )
    return sorted(candidates, key=lambda event: (-event.confidence, event.chapterNo or 0, event.eventKey))[: max(max_candidates, 0)]


def build_alias_smoke_event(label: str, expected_general_id: str, rows: list[dict]) -> EventCandidate:
    normalized = normalize_label(label)
    selected = [
        row
        for row in rows
        if normalize_label(str(row.get("normalized") or row.get("label") or "")) == normalized
        and expected_general_id in (row.get("matchedGeneralIds") or [])
        and row.get("matchStatus") == "resolved"
    ]
    chapter_no = selected[0].get("chapterNo") if selected else None
    event_key = f"alias-hit-{expected_general_id}-{normalized}"
    refs = source_refs(selected)
    return EventCandidate(
        eventId=f"romance.alias.{expected_general_id}.{normalized}",
        chapterNo=chapter_no,
        eventKey=event_key,
        eventType="alias-smoke",
        subtype="alias_resolution",
        generalIds=unique_sorted([expected_general_id] + collect_general_ids(selected)),
        location=None,
        summary=f"稱呼「{label}」已由正式對照表召回為 {expected_general_id}，可供事件抽取使用。",
        sourceQuote=representative_quote(selected),
        relationshipEdges=[
            RelationshipEdge(fromId=normalized, toId=expected_general_id, type="alias_of", evidenceRefs=refs[:5], edgeConfidence=0.95)
        ],
        moodTags=["alias-recall"],
        confidence=0.95 if selected else 0.0,
        sourceRefs=refs,
        reviewStatus="ready" if selected else "needs-review",
    )


def build_dialogue_resolution_events(dialogue_data: list[dict]) -> list[EventCandidate]:
    events: list[EventCandidate] = []
    for paragraph in dialogue_data:
        source_ref = str(paragraph.get("sourceRef") or "")
        for utterance in paragraph.get("utterances") or []:
            entities = utterance.get("entityMentions") or []
            address_entities = [entity for entity in entities if entity.get("entityType") == "address-title"]
            item_entities = [entity for entity in entities if entity.get("entityType") == "item"]
            if not address_entities or not item_entities:
                continue
            addressee_id = utterance.get("addresseeGeneralId") or address_entities[0].get("resolvedGeneralId")
            if not addressee_id:
                continue
            item_key = item_entities[0].get("resolvedItemKey") or normalize_label(item_entities[0].get("label") or "item")
            event_key = f"dialogue-{addressee_id}-{item_key}-offer"
            events.append(
                EventCandidate(
                    eventId=f"romance.dialogue.{addressee_id}.{item_key}.offer",
                    chapterNo=paragraph.get("chapterNo"),
                    eventKey=event_key,
                    eventType="dialogue",
                    subtype="gift_offer",
                    generalIds=unique_sorted([addressee_id] + ([utterance.get("speakerGeneralId")] if utterance.get("speakerGeneralId") else [])),
                    location=None,
                    summary=f"對話解析將「{item_entities[0].get('label')}」辨識為可互動物件，並以「{address_entities[0].get('label')}」指向 {addressee_id}。",
                    sourceQuote=utterance.get("text") or "",
                    relationshipEdges=[
                        RelationshipEdge(
                            fromId=item_key,
                            toId=addressee_id,
                            type="offered_to",
                            evidenceRefs=[source_ref],
                            edgeConfidence=min(float(utterance.get("confidence") or 0.0), 0.86),
                        )
                    ],
                    moodTags=["dialogue", "gift"],
                    itemRefs=[item_key],
                    activitySeedHints=["host_banquet"],
                    decisionWeightHints=["likes_gifts"],
                    confidence=min(float(utterance.get("confidence") or 0.0), 0.86),
                    sourceRefs=[source_ref],
                    extractionMode="dialogue-resolution-pilot",
                    reviewStatus="ready",
                )
            )
    return events


def render_review(events: list[EventCandidate], observed_mentions_path: Path) -> str:
    lines = [
        "# Event Candidates Review",
        "",
        f"- Generated At: `{utc_now()}`",
        f"- Observed Mentions: `{observed_mentions_path}`",
        f"- Event Count: `{len(events)}`",
        "",
        "| Event | Type | Confidence | Generals | Source Refs |",
        "|---|---|---:|---|---|",
    ]
    for event in events:
        lines.append(
            f"| `{event.eventKey}` | `{event.eventType}` | {event.confidence:.2f} | "
            f"`{', '.join(event.generalIds)}` | `{', '.join(event.sourceRefs[:8])}` |"
        )
    lines.append("")
    for event in events:
        lines.extend(
            [
                f"## {event.eventKey}",
                "",
                f"- Event ID: `{event.eventId}`",
                f"- Summary: {event.summary}",
                f"- Location: `{event.location or '-'}`",
                f"- Review Status: `{event.reviewStatus}`",
                f"- Source Quote: {event.sourceQuote}",
                "",
            ]
        )
        if event.relationshipEdges:
            lines.extend(["Relationship edges:", ""])
            for edge in event.relationshipEdges:
                strength_text = f" / strength `{edge.edgeStrength:.2f}`" if edge.edgeStrength is not None else ""
                lines.append(
                    f"- `{edge.fromId}` -> `{edge.toId}` / `{edge.type}` / edgeConfidence `{edge.edgeConfidence:.2f}`{strength_text}"
                )
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_generic_battle_review(candidates: list[EventCandidate], observed_mentions_path: Path) -> str:
    lines = [
        "# Generic Battle Candidates Review",
        "",
        f"- Generated At: `{utc_now()}`",
        f"- Observed Mentions: `{observed_mentions_path}`",
        f"- Candidate Count: `{len(candidates)}`",
        "- Status: all candidates are `needs-review`; do not publish to keyword/persona/API until accepted.",
        "",
        "| Candidate | Confidence | Generals | Source Refs | Location |",
        "|---|---:|---|---|---|",
    ]
    for candidate in candidates:
        lines.append(
            f"| `{candidate.eventKey}` | {candidate.confidence:.2f} | `"
            f"{', '.join(candidate.generalIds[:12])}` | `{', '.join(candidate.sourceRefs)}` | `{candidate.location or '-'}` |"
        )
    lines.append("")
    for candidate in candidates:
        lines.extend(
            [
                f"## {candidate.eventKey}",
                "",
                f"- Event ID: `{candidate.eventId}`",
                f"- Summary: {candidate.summary}",
                f"- Source Quote: {candidate.sourceQuote}",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def render_female_interaction_review(candidates: list[EventCandidate], observed_mentions_path: Path) -> str:
    lines = [
        "# Female Interaction Candidates Review",
        "",
        f"- Generated At: `{utc_now()}`",
        f"- Observed Mentions: `{observed_mentions_path}`",
        f"- Candidate Count: `{len(candidates)}`",
        "- Status: all candidates are `needs-review`; female priority profiles are prompt grounding, not canonical evidence.",
        "",
        "| Candidate | Subtype | Confidence | Generals | Source Refs | Location | Affect |",
        "|---|---|---:|---|---|---|---|",
    ]
    for candidate in candidates:
        lines.append(
            f"| `{candidate.eventKey}` | `{candidate.subtype or '-'}` | {candidate.confidence:.2f} | `"
            f"{', '.join(candidate.generalIds[:12])}` | `{', '.join(candidate.sourceRefs)}` | `{candidate.location or '-'}` | "
            f"`{', '.join(candidate.affectTags)}` |"
        )
    lines.append("")
    for candidate in candidates:
        lines.extend(
            [
                f"## {candidate.eventKey}",
                "",
                f"- Event ID: `{candidate.eventId}`",
                f"- Summary: {candidate.summary}",
                f"- Source Quote: {candidate.sourceQuote}",
                f"- Activity Hints: `{', '.join(candidate.activitySeedHints) or '-'}`",
                f"- Decision Hints: `{', '.join(candidate.decisionWeightHints[:8]) or '-'}`",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def write_outputs(
    output_root: Path,
    events: list[EventCandidate],
    generic_battle_candidates: list[EventCandidate],
    female_interaction_candidates: list[EventCandidate],
    observed_mentions_path: Path,
) -> None:
    events_jsonl = output_root / "events.jsonl"
    events_review = output_root / "events-review.md"
    events_summary = output_root / "events-summary.json"
    generic_candidates_jsonl = output_root / "generic-battle-candidates.jsonl"
    generic_candidates_review = output_root / "generic-battle-candidates-review.md"
    female_candidates_jsonl = output_root / "female-interaction-candidates.jsonl"
    female_candidates_review = output_root / "female-interaction-candidates-review.md"
    events_jsonl.write_text(
        "".join(json.dumps(event.model_dump(), ensure_ascii=False) + "\n" for event in events),
        encoding="utf-8",
    )
    events_review.write_text(render_review(events, observed_mentions_path), encoding="utf-8")
    generic_candidates_jsonl.write_text(
        "".join(json.dumps(candidate.model_dump(), ensure_ascii=False) + "\n" for candidate in generic_battle_candidates),
        encoding="utf-8",
    )
    generic_candidates_review.write_text(render_generic_battle_review(generic_battle_candidates, observed_mentions_path), encoding="utf-8")
    female_candidates_jsonl.write_text(
        "".join(json.dumps(candidate.model_dump(), ensure_ascii=False) + "\n" for candidate in female_interaction_candidates),
        encoding="utf-8",
    )
    female_candidates_review.write_text(render_female_interaction_review(female_interaction_candidates, observed_mentions_path), encoding="utf-8")
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "observedMentionsPath": str(observed_mentions_path),
        "eventCount": len(events),
        "readyEventCount": sum(1 for event in events if event.reviewStatus == "ready"),
        "genericBattleCandidateCount": len(generic_battle_candidates),
        "femaleInteractionCandidateCount": len(female_interaction_candidates),
        "eventKeys": [event.eventKey for event in events],
    }
    events_summary.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[extract_event_candidates] wrote {events_jsonl}")
    print(f"[extract_event_candidates] wrote {events_review}")
    print(f"[extract_event_candidates] wrote {generic_candidates_jsonl}")
    print(f"[extract_event_candidates] wrote {generic_candidates_review}")
    print(f"[extract_event_candidates] wrote {female_candidates_jsonl}")
    print(f"[extract_event_candidates] wrote {female_candidates_review}")
    print(f"[extract_event_candidates] wrote {events_summary}")
    print(
        f"[extract_event_candidates] events={len(events)} ready={summary['readyEventCount']} "
        f"genericBattleCandidates={len(generic_battle_candidates)} "
        f"femaleInteractionCandidates={len(female_interaction_candidates)}"
    )


def main() -> None:
    args = parse_args()
    event_candidate_policy = load_event_candidate_extraction_policy(
        args.governance_root,
        event_candidate_policy=args.event_candidate_policy,
    )
    event_candidate_cue_rules = load_event_candidate_cue_rules(
        args.governance_root,
        event_candidate_cue_rules=args.event_candidate_cue_rules,
    )
    apply_event_candidate_governance(event_candidate_policy, event_candidate_cue_rules)

    observed_mentions_path = Path(args.observed_mentions)
    dialogue_resolution_path = Path(args.dialogue_resolution)
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)
    observed_mentions = load_observed_mentions(observed_mentions_path)
    dialogue_data = load_dialogue_resolution(dialogue_resolution_path)
    female_priority_profiles = load_female_priority_profiles(Path(args.stable_knowledge))
    targets = parse_alias_smoke_targets(args.alias_smoke_target, DEFAULT_ALIAS_SMOKE_TARGETS)
    events = build_gold_seed_battle_events(observed_mentions)
    events.extend(build_alias_smoke_event(label, general_id, observed_mentions) for label, general_id in targets.items())
    events.extend(build_dialogue_resolution_events(dialogue_data))
    generic_battle_candidates = build_generic_battle_candidates(
        observed_mentions,
        effective_candidate_cap(args.max_generic_battle_candidates, "maxGenericBattleCandidates", 12),
    )
    female_interaction_candidates = build_female_interaction_candidates(
        observed_mentions,
        female_priority_profiles,
        effective_candidate_cap(args.max_female_interaction_candidates, "maxFemaleInteractionCandidates", 40),
    )
    write_outputs(output_root, events, generic_battle_candidates, female_interaction_candidates, observed_mentions_path)
    if any(event.reviewStatus != "ready" for event in events):
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except SanguoGovernanceError as exc:
        raise SystemExit(f"[extract_event_candidates] {exc}") from None
