from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from sanguo_governance_loader import (
    SanguoGovernanceError,
    load_core_person_completion_policy,
    expected_governance_files,
    load_evidence_seed_extraction_policy,
    load_evidence_seed_direction_denoise_rules,
    load_evidence_seed_keyword_cue_rules,
    load_evidence_seed_page_text_cleanup_rules,
    load_event_candidate_cue_rules,
    load_event_candidate_extraction_policy,
    load_event_question_angle_cue_rules,
    load_event_question_seed_bank_policy,
    load_event_review_context_cue_rules,
    load_event_review_context_policy,
    load_external_source_benchmark_cue_rules,
    load_external_source_benchmark_policy,
    load_evidence_seed_text_normalization_rules,
    load_full_roster_runner_governance,
    load_knowledge_completion_policy,
    load_npc_dialogue_llm_model_presets,
    load_npc_dialogue_runtime_cue_rules,
    load_npc_dialogue_runtime_service_policy,
    load_progress_runner_governance,
    load_relationship_runtime_canon_policy,
    load_runtime_general_profile_export_policy,
    load_runtime_profile_item_cue_rules,
    load_runtime_profile_label_catalog,
    load_runtime_relationship_refinement_rules,
    load_runtime_voice_presets,
    load_source_event_packet_policy,
    load_stable_bootstrap_governance,
    read_governance_json,
    read_governance_jsonl,
    resolve_governance_root,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Sanguo governance Rule/Policy/Schema/Catalog data.")
    parser.add_argument("--governance-root", default=None, help="Sanguo governance root. Defaults to server/npc-brain/data/sanguo.")
    parser.add_argument("--dry-run-report", action="store_true", help="Print file-to-consumer mapping without writing files.")
    return parser.parse_args()


def validate_expected_files(root: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in expected_governance_files():
        path = root / item["section"] / item["file"]
        if not path.exists():
            raise SanguoGovernanceError(f"governance file missing: {path}")
        if path.suffix == ".jsonl":
            payload = read_governance_jsonl(path)
            row_count = len(payload)
        else:
            payload = read_governance_json(path)
            row_count = 1
        rows.append({**item, "path": str(path), "rowCount": row_count})
    return rows


def require_weight_sum(policy: dict[str, Any], field: str, expected_keys: set[str], label: str) -> dict[str, float]:
    weights = policy.get(field)
    if not isinstance(weights, dict):
        raise SanguoGovernanceError(f"{label}.{field} must be object")
    actual_keys = set(str(key) for key in weights)
    if actual_keys != expected_keys:
        missing = sorted(expected_keys - actual_keys)
        extra = sorted(actual_keys - expected_keys)
        raise SanguoGovernanceError(f"{label}.{field} key mismatch missing={missing} extra={extra}")
    normalized = {str(key): float(value) for key, value in weights.items()}
    total = round(sum(normalized.values()), 6)
    if total != 100.0:
        raise SanguoGovernanceError(f"{label}.{field} must sum to 100.0, actual={total}")
    if any(value < 0 for value in normalized.values()):
        raise SanguoGovernanceError(f"{label}.{field} cannot contain negative weight")
    return normalized


def require_ratio_weights(policy: dict[str, Any], field: str, expected_keys: set[str], label: str) -> dict[str, float]:
    weights = policy.get(field)
    if not isinstance(weights, dict):
        raise SanguoGovernanceError(f"{label}.{field} must be object")
    actual_keys = set(str(key) for key in weights)
    if actual_keys != expected_keys:
        missing = sorted(expected_keys - actual_keys)
        extra = sorted(actual_keys - expected_keys)
        raise SanguoGovernanceError(f"{label}.{field} key mismatch missing={missing} extra={extra}")
    normalized = {str(key): float(value) for key, value in weights.items()}
    if any(value < 0 for value in normalized.values()):
        raise SanguoGovernanceError(f"{label}.{field} cannot contain negative weight")
    return normalized


def require_confidence_tiers(policy: dict[str, Any], field: str, label: str) -> list[dict[str, float]]:
    tiers = policy.get(field)
    if not isinstance(tiers, list) or not tiers:
        raise SanguoGovernanceError(f"{label}.{field} must be non-empty list")
    previous = 2.0
    normalized: list[dict[str, float]] = []
    for index, tier in enumerate(tiers):
        if not isinstance(tier, dict):
            raise SanguoGovernanceError(f"{label}.{field}[{index}] must be object")
        min_confidence = float(tier.get("minConfidence"))
        unit_weight = float(tier.get("unitWeight"))
        if min_confidence <= 0 or min_confidence > 1:
            raise SanguoGovernanceError(f"{label}.{field}[{index}].minConfidence must be within (0, 1]")
        if unit_weight < 0:
            raise SanguoGovernanceError(f"{label}.{field}[{index}].unitWeight cannot be negative")
        if min_confidence >= previous:
            raise SanguoGovernanceError(f"{label}.{field} must be sorted from high confidence to low confidence")
        previous = min_confidence
        normalized.append({"minConfidence": min_confidence, "unitWeight": unit_weight})
    return normalized


def validate_minimum_shapes(root: Path) -> dict[str, Any]:
    stable = load_stable_bootstrap_governance(root)
    full = load_full_roster_runner_governance(root)
    progress = load_progress_runner_governance(root)
    relationship = load_relationship_runtime_canon_policy(root)
    source_event_packets = load_source_event_packet_policy(root)
    evidence_seed_extraction = load_evidence_seed_extraction_policy(root)
    evidence_keyword_cues = load_evidence_seed_keyword_cue_rules(root)
    relationship_direction_denoise_rules = load_evidence_seed_direction_denoise_rules(root)
    page_text_cleanup_rules = load_evidence_seed_page_text_cleanup_rules(root)
    text_normalization_rules = load_evidence_seed_text_normalization_rules(root)
    knowledge_completion = load_knowledge_completion_policy(root)
    core_person_completion = load_core_person_completion_policy(root)
    event_candidate_policy = load_event_candidate_extraction_policy(root)
    event_candidate_cues = load_event_candidate_cue_rules(root)
    event_question_policy = load_event_question_seed_bank_policy(root)
    event_question_angle_cues = load_event_question_angle_cue_rules(root)
    external_source_benchmark_policy = load_external_source_benchmark_policy(root)
    external_source_benchmark_cues = load_external_source_benchmark_cue_rules(root)
    event_review_context_policy = load_event_review_context_policy(root)
    event_review_context_cues = load_event_review_context_cue_rules(root)
    runtime_label_catalog = load_runtime_profile_label_catalog(root)
    runtime_voice_presets = load_runtime_voice_presets(root)
    runtime_profile_policy = load_runtime_general_profile_export_policy(root)
    runtime_profile_item_cues = load_runtime_profile_item_cue_rules(root)
    runtime_relationship_refinement_rules = load_runtime_relationship_refinement_rules(root)
    npc_dialogue_policy = load_npc_dialogue_runtime_service_policy(root)
    npc_dialogue_presets = load_npc_dialogue_llm_model_presets(root)
    npc_dialogue_cues = load_npc_dialogue_runtime_cue_rules(root)
    schema = read_governance_json(root / "schemas/schema-stable-bootstrap-payload.json")

    if not stable["hardRelationshipSpecs"]:
        raise SanguoGovernanceError("hardRelationshipSpecs cannot be empty")
    if not stable["knownFemaleNames"]:
        raise SanguoGovernanceError("knownFemaleNames cannot be empty")
    if not full.get("transientHttpStatus"):
        raise SanguoGovernanceError("policy-full-roster-runner transientHttpStatus cannot be empty")
    if not progress["locationRule"].get("fromCuePattern"):
        raise SanguoGovernanceError("rule-location-extraction fromCuePattern cannot be empty")
    if "A-romance" not in (relationship.get("aCanonGrades") or []):
        raise SanguoGovernanceError("policy-relationship-runtime-canon aCanonGrades must include A-romance")
    if "claim-graph-a-romance" not in (relationship.get("stableRuntimeSourceLayers") or []):
        raise SanguoGovernanceError("policy-relationship-runtime-canon stableRuntimeSourceLayers must include claim-graph-a-romance")
    outputs = relationship.get("relationshipClaimGraphOutputs") if isinstance(relationship.get("relationshipClaimGraphOutputs"), dict) else {}
    if not outputs.get("aCanon"):
        raise SanguoGovernanceError("policy-relationship-runtime-canon relationshipClaimGraphOutputs.aCanon cannot be empty")
    if "A-romance" not in (relationship.get("scoreboardReadyEvalGradeTypes") or []):
        raise SanguoGovernanceError("policy-relationship-runtime-canon scoreboardReadyEvalGradeTypes must include A-romance")
    trust_gate = source_event_packets.get("externalTrustGate") if isinstance(source_event_packets.get("externalTrustGate"), dict) else {}
    if float(trust_gate.get("externalSeedMinScore") or 0.0) <= 0.0:
        raise SanguoGovernanceError("policy-source-event-packets externalTrustGate.externalSeedMinScore must be positive")
    if not source_event_packets.get("claimToAngleFamily"):
        raise SanguoGovernanceError("policy-source-event-packets claimToAngleFamily cannot be empty")
    if not source_event_packets.get("packetStrengthRules"):
        raise SanguoGovernanceError("policy-source-event-packets packetStrengthRules cannot be empty")
    required_source_fields = evidence_seed_extraction.get("requiredSourcePolicyFields")
    if not isinstance(required_source_fields, list) or "sourceId" not in required_source_fields:
        raise SanguoGovernanceError("policy-evidence-seed-extraction requiredSourcePolicyFields must include sourceId")
    harvested = evidence_seed_extraction.get("harvestedPage") if isinstance(evidence_seed_extraction.get("harvestedPage"), dict) else {}
    generic = evidence_seed_extraction.get("genericPassage") if isinstance(evidence_seed_extraction.get("genericPassage"), dict) else {}
    if "high-yield-character-site" not in (harvested.get("sourceClasses") or []):
        raise SanguoGovernanceError("policy-evidence-seed-extraction harvestedPage.sourceClasses must include high-yield-character-site")
    if "primary-text-site" not in (generic.get("sourceClasses") or []):
        raise SanguoGovernanceError("policy-evidence-seed-extraction genericPassage.sourceClasses must include primary-text-site")
    for section_name, section in (("harvestedPage", harvested), ("genericPassage", generic)):
        defaults = section.get("seedRowDefaults") if isinstance(section.get("seedRowDefaults"), dict) else {}
        if defaults.get("canonicalWrites") is not False:
            raise SanguoGovernanceError(f"policy-evidence-seed-extraction {section_name}.seedRowDefaults.canonicalWrites must be false")
    cue_keys: set[tuple[str, str]] = set()
    for row in evidence_keyword_cues:
        extractor = str(row.get("extractor") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        keywords = row.get("keywords")
        if extractor not in {"harvestedPage", "genericPassage"}:
            raise SanguoGovernanceError(f"rule-evidence-seed-keyword-cues invalid extractor: {extractor}")
        if not constant_name.endswith("_KEYWORDS"):
            raise SanguoGovernanceError(f"rule-evidence-seed-keyword-cues invalid constantName: {constant_name}")
        if (extractor, constant_name) in cue_keys:
            raise SanguoGovernanceError(f"rule-evidence-seed-keyword-cues duplicate cue constant: {extractor}.{constant_name}")
        cue_keys.add((extractor, constant_name))
        if not isinstance(keywords, list) or not keywords:
            raise SanguoGovernanceError(f"rule-evidence-seed-keyword-cues empty keywords: {extractor}.{constant_name}")
        normalized = [str(value).strip() for value in keywords]
        if any(not value for value in normalized):
            raise SanguoGovernanceError(f"rule-evidence-seed-keyword-cues blank keyword: {extractor}.{constant_name}")
        if len(set(normalized)) != len(normalized):
            raise SanguoGovernanceError(f"rule-evidence-seed-keyword-cues duplicate keyword: {extractor}.{constant_name}")
    required_denoise_rules = {
        "RELATIONSHIP_DIRECTION_HINTS",
        "AMBIGUOUS_RELATION_ANCHORS",
        "RELATION_DENSE_WINDOW_LIMIT",
        "STRICT_KINSHIP_RELATION_LABELS",
        "STRICT_KINSHIP_RELATION_RAW",
    }
    direction_by_name: dict[str, dict[str, Any]] = {}
    for row in relationship_direction_denoise_rules:
        row_id = str(row.get("id") or "").strip()
        extractor = str(row.get("extractor") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        if extractor and extractor != "genericPassage":
            raise SanguoGovernanceError(f"rule-relationship-direction-denoise invalid extractor: {row_id or '<missing-id>'}")
        if not constant_name:
            raise SanguoGovernanceError("rule-relationship-direction-denoise requires constantName")
        if constant_name in direction_by_name:
            raise SanguoGovernanceError(
                f"rule-relationship-direction-denoise duplicate constantName: {constant_name} ({row_id})"
            )
        direction_by_name[constant_name] = row
    missing = sorted(required_denoise_rules - direction_by_name.keys())
    if missing:
        raise SanguoGovernanceError(
            f"rule-relationship-direction-denoise missing constants: {', '.join(missing)}"
        )
    for constant_name in required_denoise_rules:
        row = direction_by_name[constant_name]
        kind = str(row.get("kind") or "").strip()
        value = row.get("value")
        row_id = str(row.get("id") or constant_name)
        if kind == "pair":
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-relationship-direction-denoise {row_id} pair value must be non-empty list")
            for pair in value:
                if not isinstance(pair, list) or len(pair) != 2:
                    raise SanguoGovernanceError(f"rule-relationship-direction-denoise {row_id} invalid pair entry: {pair}")
                if not all(str(item).strip() for item in pair):
                    raise SanguoGovernanceError(f"rule-relationship-direction-denoise {row_id} pair entry has blank item")
        elif kind == "set":
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-relationship-direction-denoise {row_id} set value must be non-empty list")
            if any(not str(item).strip() for item in value):
                raise SanguoGovernanceError(f"rule-relationship-direction-denoise {row_id} set value has blank item")
        elif kind == "int":
            if not isinstance(value, int) or value <= 0:
                raise SanguoGovernanceError(f"rule-relationship-direction-denoise {row_id} int value must be positive")
        else:
            raise SanguoGovernanceError(f"rule-relationship-direction-denoise {row_id} unsupported kind: {kind}")
    required_text_normalization_rules = {
        "SIMPLIFIED_TO_TRADITIONAL",
        "ENGLISH_TEMPLATE_PATTERNS",
        "ENGLISH_PHRASE_REPLACEMENTS",
        "ENGLISH_NAME_REPLACEMENTS",
        "ENGLISH_TOKEN_REPLACEMENTS",
    }
    text_by_name: dict[str, dict[str, Any]] = {}
    for row in text_normalization_rules:
        row_id = str(row.get("id") or "").strip()
        extractor = str(row.get("extractor") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        if extractor != "harvestedPage":
            raise SanguoGovernanceError(f"rule-text-normalization-replacements invalid extractor: {row_id or '<missing-id>'}")
        if not constant_name:
            raise SanguoGovernanceError("rule-text-normalization-replacements requires constantName")
        if constant_name in text_by_name:
            raise SanguoGovernanceError(
                f"rule-text-normalization-replacements duplicate constantName: {constant_name} ({row_id})"
            )
        text_by_name[constant_name] = row
    missing = sorted(required_text_normalization_rules - text_by_name.keys())
    if missing:
        raise SanguoGovernanceError(
            f"rule-text-normalization-replacements missing constants: {', '.join(missing)}"
        )
    for constant_name in required_text_normalization_rules:
        row = text_by_name[constant_name]
        kind = str(row.get("kind") or "").strip()
        value = row.get("value")
        row_id = str(row.get("id") or constant_name)
        if kind == "charMap":
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} charMap value must be non-empty list")
            for pair in value:
                if not isinstance(pair, list) or len(pair) != 2:
                    raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} invalid charMap entry: {pair}")
                if not all(isinstance(item, str) and item for item in pair):
                    raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} charMap entry has blank item")
        elif kind == "pair":
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} pair value must be non-empty list")
            seen_sources: set[str] = set()
            for pair in value:
                if not isinstance(pair, list) or len(pair) != 2:
                    raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} invalid pair entry: {pair}")
                source, target = str(pair[0]), str(pair[1])
                if not source.strip() or not target.strip():
                    raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} pair entry has blank item")
                if source.lower() in seen_sources:
                    raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} duplicate source: {source}")
                seen_sources.add(source.lower())
        elif kind == "regexTemplate":
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} regexTemplate value must be non-empty list")
            for entry in value:
                if not isinstance(entry, dict):
                    raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} regexTemplate entry must be object")
                pattern = str(entry.get("pattern") or "")
                template = str(entry.get("template") or "")
                if not pattern.strip() or not template.strip():
                    raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} regexTemplate entry has blank field")
                try:
                    re.compile(pattern)
                except re.error as exc:
                    raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} invalid regex: {exc}") from exc
        else:
            raise SanguoGovernanceError(f"rule-text-normalization-replacements {row_id} unsupported kind: {kind}")
    required_page_cleanup_rules = {
        ("harvestedPage", "BODY_NOISE_MARKERS"),
        ("harvestedPage", "BODY_TAIL_MARKERS"),
        ("genericPassage", "TAIL_TRIM_MARKERS"),
        ("genericPassage", "NOISE_MARKERS"),
    }
    cleanup_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for row in page_text_cleanup_rules:
        row_id = str(row.get("id") or "").strip()
        extractor = str(row.get("extractor") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        kind = str(row.get("kind") or "").strip()
        value = row.get("value")
        key = (extractor, constant_name)
        if key not in required_page_cleanup_rules:
            raise SanguoGovernanceError(
                f"rule-page-text-cleanup unexpected rule: {extractor}.{constant_name} ({row_id or '<missing-id>'})"
            )
        if key in cleanup_by_key:
            raise SanguoGovernanceError(f"rule-page-text-cleanup duplicate rule: {extractor}.{constant_name}")
        if kind != "markerList":
            raise SanguoGovernanceError(f"rule-page-text-cleanup {row_id or key} unsupported kind: {kind}")
        if not isinstance(value, list) or not value:
            raise SanguoGovernanceError(f"rule-page-text-cleanup {row_id or key} value must be non-empty list")
        normalized = [str(item).strip() for item in value]
        if any(not item for item in normalized):
            raise SanguoGovernanceError(f"rule-page-text-cleanup {row_id or key} has blank marker")
        if len(set(normalized)) != len(normalized):
            raise SanguoGovernanceError(f"rule-page-text-cleanup {row_id or key} has duplicate marker")
        cleanup_by_key[key] = row
    missing_cleanup = sorted(required_page_cleanup_rules - cleanup_by_key.keys())
    if missing_cleanup:
        missing_text = ", ".join(f"{extractor}.{name}" for extractor, name in missing_cleanup)
        raise SanguoGovernanceError(f"rule-page-text-cleanup missing rules: {missing_text}")
    knowledge_component_keys = {
        "sourceResolution",
        "personFoundation",
        "relationshipGraph",
        "eventQuestionCoverage",
        "taxonomyAngles",
        "reviewValidation",
        "femalePriority",
        "pipelineReliability",
    }
    core_component_keys = {
        "sourcePresence",
        "profileFoundation",
        "angleSeedCoverage",
        "sourceEventPackets",
        "relationshipEvidence",
        "previewValidation",
        "readyEvents",
    }
    knowledge_weights = require_weight_sum(
        knowledge_completion,
        "componentWeights",
        knowledge_component_keys,
        "policy-knowledge-completion-scoring",
    )
    core_weights = require_weight_sum(
        core_person_completion,
        "componentWeights",
        core_component_keys,
        "policy-core-person-completion-scoring",
    )
    angle_families = knowledge_completion.get("angleFamilies")
    if not isinstance(angle_families, list) or not angle_families:
        raise SanguoGovernanceError("policy-knowledge-completion-scoring angleFamilies must be non-empty list")
    normalized_angle_families = [str(value).strip() for value in angle_families]
    if any(not value for value in normalized_angle_families):
        raise SanguoGovernanceError("policy-knowledge-completion-scoring angleFamilies cannot contain blank value")
    if len(set(normalized_angle_families)) != len(normalized_angle_families):
        raise SanguoGovernanceError("policy-knowledge-completion-scoring angleFamilies cannot contain duplicate value")
    if int(knowledge_completion.get("relationshipTypeTarget") or 0) <= 0:
        raise SanguoGovernanceError("policy-knowledge-completion-scoring relationshipTypeTarget must be positive")
    require_confidence_tiers(knowledge_completion, "relationshipEvidenceTiers", "policy-knowledge-completion-scoring")
    require_confidence_tiers(core_person_completion, "relationshipEvidenceTiers", "policy-core-person-completion-scoring")
    require_ratio_weights(
        knowledge_completion,
        "personFoundationWeights",
        {"identityCoverage", "basicProfileDepth", "roleCoverage", "missingCoverageScore"},
        "policy-knowledge-completion-scoring",
    )
    require_ratio_weights(
        knowledge_completion,
        "relationshipGraphWeights",
        {"volume", "breadth", "plainProposalWeight"},
        "policy-knowledge-completion-scoring",
    )
    event_weights = require_ratio_weights(
        knowledge_completion,
        "eventQuestionCoverageWeights",
        {"previewA", "previewB", "candidate", "seedUnitCap", "packetUnitCap"},
        "policy-knowledge-completion-scoring",
    )
    if event_weights["seedUnitCap"] <= 0 or event_weights["packetUnitCap"] <= 0:
        raise SanguoGovernanceError("policy-knowledge-completion-scoring event caps must be positive")
    if int(core_person_completion.get("angleFamilyTarget") or 0) <= 0:
        raise SanguoGovernanceError("policy-core-person-completion-scoring angleFamilyTarget must be positive")
    denominators = core_person_completion.get("componentDenominators")
    if not isinstance(denominators, dict) or any(float(value) <= 0 for value in denominators.values()):
        raise SanguoGovernanceError("policy-core-person-completion-scoring componentDenominators must be positive")
    profile_depth = core_person_completion.get("profileDepth")
    if not isinstance(profile_depth, dict) or not profile_depth.get("fields") or float(profile_depth.get("perFieldIncrement") or 0) <= 0:
        raise SanguoGovernanceError("policy-core-person-completion-scoring profileDepth must define fields and positive increment")
    if set((core_person_completion.get("recommendedActionByComponent") or {}).keys()) != core_component_keys:
        raise SanguoGovernanceError("policy-core-person-completion-scoring recommendedActionByComponent key mismatch")

    event_candidate_caps = event_candidate_policy.get("candidateCaps") if isinstance(event_candidate_policy.get("candidateCaps"), dict) else {}
    if any(int(event_candidate_caps.get(key) or 0) <= 0 for key in ("maxSnippets", "maxGenericBattleCandidates", "maxFemaleInteractionCandidates")):
        raise SanguoGovernanceError("policy-event-candidate-extraction candidateCaps must be positive")
    if not event_candidate_policy.get("aliasSmokeTargets"):
        raise SanguoGovernanceError("policy-event-candidate-extraction aliasSmokeTargets cannot be empty")
    event_candidate_required = {
        "LOCATION_FALSE_POSITIVE_TERMS",
        "BATTLE_SIGNAL_TERMS",
        "DIRECT_BATTLE_SIGNAL_TERMS",
        "GENERIC_BATTLE_EXCLUDE_TERMS",
        "FEMALE_INTERACTION_SIGNAL_TERMS",
        "FEMALE_INTERACTION_LOCATION_TERMS",
        "FEMALE_CONTEXT_GENERAL_INJECTIONS",
        "FEMALE_INTERACTION_SUBTYPE_RULES",
    }
    event_candidate_by_name: dict[str, dict[str, Any]] = {}
    for row in event_candidate_cues:
        extractor = str(row.get("extractor") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        if extractor != "extractEventCandidates":
            raise SanguoGovernanceError(f"rule-event-candidate-cues invalid extractor: {extractor}")
        if constant_name in event_candidate_by_name:
            raise SanguoGovernanceError(f"rule-event-candidate-cues duplicate constantName: {constant_name}")
        event_candidate_by_name[constant_name] = row
        kind = str(row.get("kind") or "").strip()
        if kind == "termList":
            terms = row.get("terms")
            if not isinstance(terms, list) or not terms:
                raise SanguoGovernanceError(f"rule-event-candidate-cues {constant_name} terms must be non-empty list")
            normalized = [str(term).strip() for term in terms]
            if any(not term for term in normalized):
                raise SanguoGovernanceError(f"rule-event-candidate-cues {constant_name} has blank term")
            if len(set(normalized)) != len(normalized):
                raise SanguoGovernanceError(f"rule-event-candidate-cues {constant_name} has duplicate term")
        elif kind in {"contextGeneralInjections", "femaleInteractionSubtypeRules"}:
            entries = row.get("entries")
            if not isinstance(entries, list) or not entries:
                raise SanguoGovernanceError(f"rule-event-candidate-cues {constant_name} entries must be non-empty list")
        else:
            raise SanguoGovernanceError(f"rule-event-candidate-cues {constant_name} unsupported kind: {kind}")
    missing_event_candidate = sorted(event_candidate_required - event_candidate_by_name.keys())
    if missing_event_candidate:
        raise SanguoGovernanceError(f"rule-event-candidate-cues missing rules: {', '.join(missing_event_candidate)}")

    question_angle_families: set[str] = set()
    for row in event_question_angle_cues:
        extractor = str(row.get("extractor") or "").strip()
        angle_family = str(row.get("angleFamily") or "").strip()
        if extractor != "buildEventQuestionSeedBank":
            raise SanguoGovernanceError(f"rule-event-question-angle-cues invalid extractor: {extractor}")
        if not angle_family:
            raise SanguoGovernanceError("rule-event-question-angle-cues angleFamily cannot be blank")
        if angle_family in question_angle_families:
            raise SanguoGovernanceError(f"rule-event-question-angle-cues duplicate angleFamily: {angle_family}")
        question_angle_families.add(angle_family)
        terms = row.get("terms")
        if not isinstance(terms, list) or not terms:
            raise SanguoGovernanceError(f"rule-event-question-angle-cues {angle_family} terms must be non-empty list")
        normalized_terms = [str(term).strip() for term in terms]
        if any(not term for term in normalized_terms):
            raise SanguoGovernanceError(f"rule-event-question-angle-cues {angle_family} has blank term")
        if len(set(normalized_terms)) != len(normalized_terms):
            raise SanguoGovernanceError(f"rule-event-question-angle-cues {angle_family} has duplicate term")
    claim_to_angle = event_question_policy.get("claimToAngleFamily")
    if not isinstance(claim_to_angle, dict) or not claim_to_angle:
        raise SanguoGovernanceError("policy-event-question-seed-bank claimToAngleFamily cannot be empty")
    allowed_question_angles = set(question_angle_families) | {"relationship"}
    invalid_angles = sorted({str(value) for value in claim_to_angle.values()} - allowed_question_angles)
    if invalid_angles:
        raise SanguoGovernanceError(f"policy-event-question-seed-bank claimToAngleFamily has invalid angle families: {invalid_angles}")
    event_question_gate = event_question_policy.get("externalTrustGate") if isinstance(event_question_policy.get("externalTrustGate"), dict) else {}
    if float(event_question_gate.get("externalSeedMinScore") or 0.0) <= 0.0:
        raise SanguoGovernanceError("policy-event-question-seed-bank externalTrustGate.externalSeedMinScore must be positive")
    if int(event_question_gate.get("historyCrossFamilyThreshold") or 0) <= 0 or int(event_question_gate.get("nonHistoryCrossFamilyThreshold") or 0) <= 0:
        raise SanguoGovernanceError("policy-event-question-seed-bank cross-family thresholds must be positive")
    slot_rules = event_question_policy.get("slotStrengthRules")
    if not isinstance(slot_rules, list) or not slot_rules:
        raise SanguoGovernanceError("policy-event-question-seed-bank slotStrengthRules cannot be empty")
    if not any(isinstance(rule, dict) and rule.get("default") is True for rule in slot_rules):
        raise SanguoGovernanceError("policy-event-question-seed-bank slotStrengthRules must include default rule")


    external_source_classes = external_source_benchmark_policy.get("sourceClasses")
    if not isinstance(external_source_classes, list) or not external_source_classes:
        raise SanguoGovernanceError("policy-external-source-benchmark sourceClasses must be non-empty list")
    normalized_source_classes = [str(item).strip() for item in external_source_classes]
    if any(not item for item in normalized_source_classes):
        raise SanguoGovernanceError("policy-external-source-benchmark sourceClasses cannot contain blank value")
    if len(set(normalized_source_classes)) != len(normalized_source_classes):
        raise SanguoGovernanceError("policy-external-source-benchmark sourceClasses cannot contain duplicate value")
    precheck_defaults = external_source_benchmark_policy.get("precheckDefaults") if isinstance(external_source_benchmark_policy.get("precheckDefaults"), dict) else {}
    for key in ("likelyThreshold", "possibleThreshold", "minimumTermHitCount", "loginGatedMaxBytesRead"):
        if int(precheck_defaults.get(key) or 0) <= 0:
            raise SanguoGovernanceError(f"policy-external-source-benchmark precheckDefaults.{key} must be positive")
    for key in ("hintKeywords", "loginPatterns", "javascriptShellContentTypePrefixes"):
        values = precheck_defaults.get(key)
        if not isinstance(values, list) or not values:
            raise SanguoGovernanceError(f"policy-external-source-benchmark precheckDefaults.{key} must be non-empty list")
        normalized = [str(item).strip() for item in values]
        if any(not item for item in normalized) or len(set(normalized)) != len(normalized):
            raise SanguoGovernanceError(f"policy-external-source-benchmark precheckDefaults.{key} has blank or duplicate value")
    stage2_defaults = external_source_benchmark_policy.get("stage2GateDefaults") if isinstance(external_source_benchmark_policy.get("stage2GateDefaults"), dict) else {}
    for key in ("fetchSuccessRateMin", "relevantPageRateMin", "errorRateMax", "duplicateLinkRateMax"):
        value = float(stage2_defaults.get(key, -1.0))
        if value < 0.0 or value > 1.0:
            raise SanguoGovernanceError(f"policy-external-source-benchmark stage2GateDefaults.{key} must be between 0 and 1")
    stage3_defaults = external_source_benchmark_policy.get("stage3ClassGateDefaults")
    if not isinstance(stage3_defaults, dict) or not stage3_defaults:
        raise SanguoGovernanceError("policy-external-source-benchmark stage3ClassGateDefaults cannot be empty")
    invalid_stage3_classes = sorted(set(str(key) for key in stage3_defaults.keys()) - set(normalized_source_classes))
    if invalid_stage3_classes:
        raise SanguoGovernanceError(f"policy-external-source-benchmark has invalid stage3 class defaults: {invalid_stage3_classes}")
    external_source_by_name: dict[str, dict[str, Any]] = {}
    for row in external_source_benchmark_cues:
        consumer = str(row.get("consumer") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        kind = str(row.get("kind") or "").strip()
        if consumer != "benchmark_external_source.py":
            raise SanguoGovernanceError(f"rule-external-source-benchmark-cues invalid consumer: {consumer}")
        if constant_name in external_source_by_name:
            raise SanguoGovernanceError(f"rule-external-source-benchmark-cues duplicate constantName: {constant_name}")
        external_source_by_name[constant_name] = row
        if kind != "termList":
            raise SanguoGovernanceError(f"rule-external-source-benchmark-cues {constant_name} unsupported kind: {kind}")
        terms = row.get("terms")
        if not isinstance(terms, list) or not terms:
            raise SanguoGovernanceError(f"rule-external-source-benchmark-cues {constant_name} terms must be non-empty list")
        normalized_terms = [str(term).strip() for term in terms]
        if any(not term for term in normalized_terms) or len(set(normalized_terms)) != len(normalized_terms):
            raise SanguoGovernanceError(f"rule-external-source-benchmark-cues {constant_name} has blank or duplicate term")
    if "DEFAULT_TERM_HIT_KEYWORDS" not in external_source_by_name:
        raise SanguoGovernanceError("rule-external-source-benchmark-cues missing DEFAULT_TERM_HIT_KEYWORDS")


    allowed_answers = [str(item).strip() for item in event_review_context_policy.get("allowedAnswers") or []]
    if sorted(allowed_answers) != ["A", "B", "C", "D"]:
        raise SanguoGovernanceError("policy-event-review-context allowedAnswers must be A/B/C/D")
    for key in ("brotherhoodIds", "singleCharAliasAllowed"):
        values = [str(item).strip() for item in event_review_context_policy.get(key) or []]
        if any(not item for item in values):
            raise SanguoGovernanceError(f"policy-event-review-context {key} has blank value")
        if len(set(values)) != len(values):
            raise SanguoGovernanceError(f"policy-event-review-context {key} has duplicate value")
    review_required = {
        "RELATION_TYPE_ALIASES",
        "LOCATION_TERMS",
        "GENERIC_LOCATION_TERMS",
        "LOCATION_ALIASES",
        "BATTLE_VERBS",
        "DIRECT_BATTLE_PAIR_TERMS",
        "INTERNAL_CONFLICT_TERMS",
        "COMMAND_VERBS",
        "COOPERATIVE_TERMS",
        "APPOINTMENT_TERMS",
        "DECLARATIVE_BATTLE_TERMS",
        "COACTION_BATTLE_TERMS",
        "COMMAND_FALSE_POSITIVE_TERMS",
        "INTENT_ONLY_BATTLE_TERMS",
        "REPORTED_BATTLE_TERMS",
        "REVIEW_ONLY_SUMMARY_TERMS",
        "DELEGATED_COMBAT_TERMS",
        "SIEGE_ASSIGNMENT_TERMS",
        "ALLY_ATTACK_TERMS",
        "PEER_DEPLOYMENT_TERMS",
        "ALLIED_PEER_GROUPS",
        "DIRECTED_COMMAND_VERBS",
        "GENERAL_ALIASES",
    }
    review_by_name: dict[str, dict[str, Any]] = {}
    alias_count = 0
    for row in event_review_context_cues:
        consumer = str(row.get("consumer") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        if consumer != "enrich_event_review_context.py":
            raise SanguoGovernanceError(f"rule-event-review-context-cues invalid consumer: {consumer}")
        if constant_name in review_by_name:
            raise SanguoGovernanceError(f"rule-event-review-context-cues duplicate constantName: {constant_name}")
        review_by_name[constant_name] = row
        value = row.get("value")
        kind = str(row.get("kind") or "").strip()
        if kind in {"termList", "termSet"}:
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} value must be non-empty list")
            normalized = [str(item).strip() for item in value]
            if any(not item for item in normalized):
                raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} has blank cue")
            if len(set(normalized)) != len(normalized):
                raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} has duplicate cue")
        elif kind == "mapping":
            if not isinstance(value, dict) or not value:
                raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} value must be non-empty mapping")
            alias_count += len(value)
            if any(not str(key).strip() or not str(val).strip() for key, val in value.items()):
                raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} has blank mapping entry")
        elif kind == "mappingList":
            if not isinstance(value, dict) or not value:
                raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} value must be non-empty mapping list")
            for key, vals in value.items():
                if not str(key).strip() or not isinstance(vals, list) or not vals:
                    raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} invalid alias row")
                alias_count += len(vals)
        elif kind == "listOfSets":
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} value must be non-empty list")
            for group in value:
                if not isinstance(group, list) or not group:
                    raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} invalid set row")
        else:
            raise SanguoGovernanceError(f"rule-event-review-context-cues {constant_name} unsupported kind: {kind}")
    missing_review_context = sorted(review_required - review_by_name.keys())
    if missing_review_context:
        raise SanguoGovernanceError(f"rule-event-review-context-cues missing rules: {', '.join(missing_review_context)}")


    runtime_label_maps = [
        runtime_label_catalog.get("relationshipTypeLabels"),
        runtime_label_catalog.get("bootstrapEventLabels"),
        runtime_label_catalog.get("tagLabels"),
    ]
    if any(not isinstance(label_map, dict) or not label_map for label_map in runtime_label_maps):
        raise SanguoGovernanceError("catalog-runtime-profile-labels must include non-empty relationship/bootstrap/tag label maps")
    runtime_label_count = sum(len(label_map) for label_map in runtime_label_maps if isinstance(label_map, dict))
    for label_map in runtime_label_maps:
        for key, value in label_map.items():
            if not str(key).strip() or not str(value).strip():
                raise SanguoGovernanceError("catalog-runtime-profile-labels has blank key or label")
    voice_general_ids: set[str] = set()
    for row in runtime_voice_presets:
        general_id = str(row.get("generalId") or "").strip()
        if not general_id:
            raise SanguoGovernanceError("catalog-runtime-voice-presets generalId cannot be blank")
        if general_id in voice_general_ids:
            raise SanguoGovernanceError(f"catalog-runtime-voice-presets duplicate generalId: {general_id}")
        voice_general_ids.add(general_id)
        if not str(row.get("safeFallbackLine") or "").strip():
            raise SanguoGovernanceError(f"catalog-runtime-voice-presets {general_id} missing safeFallbackLine")
        for key in ("voiceStyle", "taboos"):
            values = row.get(key)
            if not isinstance(values, list) or not values or any(not str(item).strip() for item in values):
                raise SanguoGovernanceError(f"catalog-runtime-voice-presets {general_id} {key} must be non-empty strings")


    graph_types = [str(item).strip() for item in runtime_profile_policy.get("graphRelationshipTypes") or []]
    semantic_types = [str(item).strip() for item in runtime_profile_policy.get("semanticRelationshipTypes") or []]
    if not graph_types or not semantic_types:
        raise SanguoGovernanceError("policy-runtime-general-profile-export graph/semantic relationship types cannot be empty")
    if any(not item for item in [*graph_types, *semantic_types]):
        raise SanguoGovernanceError("policy-runtime-general-profile-export has blank relationship type")
    if len(set(graph_types)) != len(graph_types) or len(set(semantic_types)) != len(semantic_types):
        raise SanguoGovernanceError("policy-runtime-general-profile-export has duplicate relationship type")
    missing_semantic_graph_types = sorted(set(graph_types) - set(semantic_types))
    if missing_semantic_graph_types:
        raise SanguoGovernanceError(f"policy-runtime-general-profile-export graph types missing from semantic set: {missing_semantic_graph_types}")
    taxonomy_policy = runtime_profile_policy.get("relationshipTaxonomyPolicy")
    if not isinstance(taxonomy_policy, dict) or any(not str(value).strip() for value in taxonomy_policy.values()):
        raise SanguoGovernanceError("policy-runtime-general-profile-export relationshipTaxonomyPolicy must be non-empty strings")
    item_terms: set[str] = set()
    for row in runtime_profile_item_cues:
        if str(row.get("consumer") or "") != "export_general_runtime_profile.py":
            raise SanguoGovernanceError("rule-runtime-profile-item-cues invalid consumer")
        values = [str(row.get(key) or "").strip() for key in ("term", "keywordKey", "displayLabel")]
        if any(not value for value in values):
            raise SanguoGovernanceError("rule-runtime-profile-item-cues has blank field")
        if values[0] in item_terms:
            raise SanguoGovernanceError(f"rule-runtime-profile-item-cues duplicate term: {values[0]}")
        item_terms.add(values[0])
    if not item_terms:
        raise SanguoGovernanceError("rule-runtime-profile-item-cues cannot be empty")
    refinement_by_name: dict[str, dict[str, Any]] = {}
    for row in runtime_relationship_refinement_rules:
        if str(row.get("consumer") or "") != "export_general_runtime_profile.py":
            raise SanguoGovernanceError("rule-runtime-relationship-refinement invalid consumer")
        constant_name = str(row.get("constantName") or "").strip()
        if constant_name in refinement_by_name:
            raise SanguoGovernanceError(f"rule-runtime-relationship-refinement duplicate constantName: {constant_name}")
        refinement_by_name[constant_name] = row
        terms = [str(term).strip() for term in row.get("terms") or []]
        if str(row.get("kind") or "") != "termList" or not terms or any(not term for term in terms):
            raise SanguoGovernanceError(f"rule-runtime-relationship-refinement {constant_name} terms must be non-empty strings")
        if len(set(terms)) != len(terms):
            raise SanguoGovernanceError(f"rule-runtime-relationship-refinement {constant_name} has duplicate terms")
    if "RULER_SUBJECT_AUTHORITY_TERMS" not in refinement_by_name:
        raise SanguoGovernanceError("rule-runtime-relationship-refinement missing RULER_SUBJECT_AUTHORITY_TERMS")



    npc_default_preset = str(npc_dialogue_policy.get("defaultLlmModelPreset") or "").strip()
    npc_history_providers = [str(item).strip() for item in npc_dialogue_policy.get("llmHistoryProviders") or []]
    npc_source_layers = [str(item).strip() for item in npc_dialogue_policy.get("stableRelationshipSourceLayers") or []]
    npc_a_canon_grades = [str(item).strip() for item in npc_dialogue_policy.get("aCanonRelationshipGrades") or []]
    for label, values in (("llmHistoryProviders", npc_history_providers), ("stableRelationshipSourceLayers", npc_source_layers), ("aCanonRelationshipGrades", npc_a_canon_grades)):
        if not values or any(not value for value in values):
            raise SanguoGovernanceError(f"policy-npc-dialogue-runtime-service {label} must be non-empty strings")
        if len(set(values)) != len(values):
            raise SanguoGovernanceError(f"policy-npc-dialogue-runtime-service {label} cannot contain duplicates")
    npc_preset_names: set[str] = set()
    for row in npc_dialogue_presets:
        if str(row.get("consumer") or "") != "npc_dialogue_service.py":
            raise SanguoGovernanceError("catalog-npc-dialogue-llm-model-presets invalid consumer")
        preset = str(row.get("preset") or "").strip()
        if not preset:
            raise SanguoGovernanceError("catalog-npc-dialogue-llm-model-presets preset cannot be blank")
        if preset in npc_preset_names:
            raise SanguoGovernanceError(f"catalog-npc-dialogue-llm-model-presets duplicate preset: {preset}")
        npc_preset_names.add(preset)
        if not str(row.get("label") or "").strip():
            raise SanguoGovernanceError(f"catalog-npc-dialogue-llm-model-presets {preset} missing label")
        provider_order = row.get("providerOrder")
        if provider_order is not None and (not isinstance(provider_order, list) or any(not str(item).strip() for item in provider_order)):
            raise SanguoGovernanceError(f"catalog-npc-dialogue-llm-model-presets {preset} providerOrder must be null or non-empty strings")
        if not isinstance(row.get("modelOverrides"), dict):
            raise SanguoGovernanceError(f"catalog-npc-dialogue-llm-model-presets {preset} modelOverrides must be object")
        if not isinstance(row.get("allowDeterministicFallback"), bool):
            raise SanguoGovernanceError(f"catalog-npc-dialogue-llm-model-presets {preset} allowDeterministicFallback must be bool")
    if npc_default_preset not in npc_preset_names:
        raise SanguoGovernanceError("policy-npc-dialogue-runtime-service defaultLlmModelPreset must exist in catalog-npc-dialogue-llm-model-presets")
    npc_required_cues = {"HARD_RELATIONSHIP_PAIR_TYPES", "TARGET_ID_NAME_COLLISIONS", "YELLOW_TURBAN_TARGET_IDS", "YELLOW_TURBAN_CONTEXT_TERMS"}
    npc_cue_by_name: dict[str, dict[str, Any]] = {}
    npc_dialogue_term_count = 0
    for row in npc_dialogue_cues:
        if str(row.get("consumer") or "") != "npc_dialogue_service.py":
            raise SanguoGovernanceError("rule-npc-dialogue-runtime-cues invalid consumer")
        constant_name = str(row.get("constantName") or "").strip()
        if constant_name in npc_cue_by_name:
            raise SanguoGovernanceError(f"rule-npc-dialogue-runtime-cues duplicate constantName: {constant_name}")
        npc_cue_by_name[constant_name] = row
        kind = str(row.get("kind") or "").strip()
        value = row.get("value")
        if kind == "relationshipPairTypes":
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError("rule-npc-dialogue-runtime-cues relationshipPairTypes must be non-empty list")
            seen_pairs: set[tuple[str, ...]] = set()
            for entry in value:
                ids = tuple(sorted(str(item).strip() for item in (entry.get("generalIds") if isinstance(entry, dict) else []) or [] if str(item).strip()))
                if not isinstance(entry, dict) or len(ids) < 2 or not str(entry.get("relationshipType") or "").strip():
                    raise SanguoGovernanceError("rule-npc-dialogue-runtime-cues relationshipPairTypes entry missing ids/type")
                if ids in seen_pairs:
                    raise SanguoGovernanceError(f"rule-npc-dialogue-runtime-cues duplicate relationship pair: {ids}")
                seen_pairs.add(ids)
        elif kind == "nestedMapping":
            if not isinstance(value, dict) or not value:
                raise SanguoGovernanceError("rule-npc-dialogue-runtime-cues nestedMapping value must be object")
            for key, mapping in value.items():
                if not str(key).strip() or not isinstance(mapping, dict) or not mapping:
                    raise SanguoGovernanceError("rule-npc-dialogue-runtime-cues nestedMapping has invalid row")
                for source, target in mapping.items():
                    if not str(source).strip() or not str(target).strip():
                        raise SanguoGovernanceError("rule-npc-dialogue-runtime-cues nestedMapping has blank mapping")
        elif kind in {"idSet", "termList"}:
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-npc-dialogue-runtime-cues {constant_name} value must be non-empty list")
            normalized = [str(item).strip() for item in value]
            if any(not item for item in normalized):
                raise SanguoGovernanceError(f"rule-npc-dialogue-runtime-cues {constant_name} has blank value")
            if len(set(normalized)) != len(normalized):
                raise SanguoGovernanceError(f"rule-npc-dialogue-runtime-cues {constant_name} has duplicate value")
            npc_dialogue_term_count += len(normalized)
        else:
            raise SanguoGovernanceError(f"rule-npc-dialogue-runtime-cues {constant_name} unsupported kind: {kind}")
    missing_npc_cues = sorted(npc_required_cues - npc_cue_by_name.keys())
    if missing_npc_cues:
        raise SanguoGovernanceError(f"rule-npc-dialogue-runtime-cues missing rules: {', '.join(missing_npc_cues)}")

    if "summary" not in (schema.get("requiredTopLevelKeys") or []):
        raise SanguoGovernanceError("schema-stable-bootstrap-payload must require summary")

    return {
        "hardRelationshipSpecCount": len(stable["hardRelationshipSpecs"]),
        "factionTimelineSpecCount": len(stable["factionTimelineSpecs"]),
        "eventLocationSeedCount": len(stable["eventLocationSeeds"]),
        "socialRoleSeedCount": len(stable["socialRoleSeeds"]),
        "knownFemaleNameCount": len(stable["knownFemaleNames"]),
        "commonRelationLabelCount": len(stable["commonRelationLabels"]),
        "femaleProfileOverrideCount": len(stable["femaleProfileOverrides"]),
        "transientHttpStatusCount": len(full.get("transientHttpStatus") or []),
        "rootCauseGroupCount": len(progress["policy"].get("rootCauseGroups") or []),
        "aCanonGradeCount": len(relationship.get("aCanonGrades") or []),
        "stableRuntimeSourceLayerCount": len(relationship.get("stableRuntimeSourceLayers") or []),
        "sourceEventPacketStrengthRuleCount": len(source_event_packets.get("packetStrengthRules") or []),
        "evidenceSeedRequiredSourceFieldCount": len(required_source_fields or []),
        "evidenceSeedGenericSourceClassCount": len(generic.get("sourceClasses") or []),
        "evidenceSeedKeywordCueRuleCount": len(evidence_keyword_cues),
        "relationshipDirectionDenoiseRuleCount": len(relationship_direction_denoise_rules),
        "textNormalizationReplacementRuleCount": len(text_normalization_rules),
        "pageTextCleanupRuleCount": len(page_text_cleanup_rules),
        "knowledgeCompletionComponentWeightCount": len(knowledge_weights),
        "knowledgeCompletionAngleFamilyCount": len(normalized_angle_families),
        "corePersonCompletionComponentWeightCount": len(core_weights),
        "corePersonCompletionActionCount": len(core_person_completion.get("recommendedActionByComponent") or {}),
        "eventCandidateCueRuleCount": len(event_candidate_cues),
        "eventQuestionAngleCueRuleCount": len(event_question_angle_cues),
        "eventQuestionClaimMappingCount": len(claim_to_angle),
        "externalSourceBenchmarkCueRuleCount": len(external_source_benchmark_cues),
        "externalSourceBenchmarkSourceClassCount": len(external_source_classes),
        "eventReviewContextCueRuleCount": len(event_review_context_cues),
        "eventReviewContextAliasCount": alias_count,
        "runtimeProfileLabelCount": runtime_label_count,
        "runtimeVoicePresetCount": len(runtime_voice_presets),
        "runtimeProfileItemCueRuleCount": len(runtime_profile_item_cues),
        "runtimeRelationshipRefinementRuleCount": len(runtime_relationship_refinement_rules),
        "npcDialogueLlmModelPresetCount": len(npc_dialogue_presets),
        "npcDialogueRuntimeCueRuleCount": len(npc_dialogue_cues),
        "npcDialogueRuntimeCueValueCount": npc_dialogue_term_count,
    }


def render_report(rows: list[dict[str, Any]], summary: dict[str, Any]) -> str:
    consumers = Counter(row["consumer"] for row in rows)
    payload = {
        "status": "ok",
        "summary": summary,
        "consumerCounts": dict(sorted(consumers.items())),
        "files": rows,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def main() -> int:
    args = parse_args()
    root = resolve_governance_root(args.governance_root)
    rows = validate_expected_files(root)
    summary = validate_minimum_shapes(root)
    print(render_report(rows, summary))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SanguoGovernanceError as exc:
        print(f"[validate_sanguo_governance] {exc}", file=sys.stderr)
        raise SystemExit(1)
