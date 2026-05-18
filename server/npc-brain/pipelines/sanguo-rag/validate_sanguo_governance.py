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
    load_alias_mention_intake_cue_rules,
    load_alias_mention_intake_policy,
    load_convergence_loop_state_policy,
    load_core_person_completion_policy,
    load_external_evidence_scoring_policy,
    load_dialogue_mention_resolution_cue_rules,
    load_dialogue_mention_resolution_policy,
    load_resolution_loop_recommendation_cue_rules,
    load_resolution_loop_runner_policy,
    load_three_lane_progress_scheduler_policy,
    load_three_kweb_check_cue_rules,
    load_three_kweb_check_runner_policy,
    load_deepseek_reasoning_trial_policy,
    load_repair_review_campaign_policy,
    load_knowledge_growth_round_runner_policy,
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
    load_governance_drift_detection_policy,
    load_governance_operator_summary_policy,
    load_governance_failure_triage_policy,
    load_governance_completion_ledger_policy,
    load_governance_run_profiles_policy,
    load_governance_report_bundle_policy,
    load_governance_schema_registry,
    load_governance_harness_snapshot_policy,
    load_governance_ci_entrypoint_policy,
    load_governance_plan_encoding_repair_policy,
    load_governance_release_readiness_policy,
    load_governance_regression_harness_policy,
    load_governance_runbook_policy,
    load_governance_validation_stabilization_policy,
    load_full_roster_scoreboard_policy,
    load_knowledge_completion_policy,
    load_npc_dialogue_llm_model_presets,
    load_npc_dialogue_runtime_cue_rules,
    load_npc_dialogue_runtime_service_policy,
    load_progress_runner_governance,
    load_postgres_state_migration_plan_policy,
    load_postgres_state_store_evaluation_policy,
    load_relationship_evidence_extraction_rules,
    load_relationship_runtime_canon_policy,
    load_relationship_type_refinement_rules,
    load_residual_hardcode_freeze_audit_policy,
    load_runtime_general_profile_export_policy,
    load_runtime_profile_item_cue_rules,
    load_runtime_profile_label_catalog,
    load_runtime_readiness_matrix_policy,
    load_runtime_relationship_refinement_rules,
    load_runtime_voice_presets,
    load_runtime_batch_keyword_readiness_policy,
    load_source_browser_vector_readiness_policy,
    load_source_event_packet_policy,
    load_stable_bootstrap_governance,
    load_vector_ingestion_hardening_policy,
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
    full_roster_scoreboard = load_full_roster_scoreboard_policy(root)
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
    runtime_readiness_policy = load_runtime_readiness_matrix_policy(root)
    dialogue_mention_policy = load_dialogue_mention_resolution_policy(root)
    dialogue_mention_cues = load_dialogue_mention_resolution_cue_rules(root)
    resolution_loop_policy = load_resolution_loop_runner_policy(root)
    resolution_loop_cues = load_resolution_loop_recommendation_cue_rules(root)
    three_lane_scheduler_policy = load_three_lane_progress_scheduler_policy(root)
    repair_review_campaign_policy = load_repair_review_campaign_policy(root)
    knowledge_growth_round_policy = load_knowledge_growth_round_runner_policy(root)
    three_kweb_check_policy = load_three_kweb_check_runner_policy(root)
    three_kweb_check_cues = load_three_kweb_check_cue_rules(root)
    deepseek_reasoning_policy = load_deepseek_reasoning_trial_policy(root)
    alias_mention_policy = load_alias_mention_intake_policy(root)
    alias_mention_cues = load_alias_mention_intake_cue_rules(root)
    external_evidence_scoring_policy = load_external_evidence_scoring_policy(root)
    source_browser_vector_policy = load_source_browser_vector_readiness_policy(root)
    runtime_batch_keyword_policy = load_runtime_batch_keyword_readiness_policy(root)
    convergence_loop_state_policy = load_convergence_loop_state_policy(root)
    governance_regression_harness_policy = load_governance_regression_harness_policy(root)
    governance_validation_policy = load_governance_validation_stabilization_policy(root)
    governance_release_policy = load_governance_release_readiness_policy(root)
    governance_drift_policy = load_governance_drift_detection_policy(root)
    governance_operator_policy = load_governance_operator_summary_policy(root)
    governance_failure_triage_policy = load_governance_failure_triage_policy(root)
    governance_completion_ledger_policy = load_governance_completion_ledger_policy(root)
    governance_run_profiles_policy = load_governance_run_profiles_policy(root)
    governance_report_bundle_policy = load_governance_report_bundle_policy(root)
    governance_plan_encoding_policy = load_governance_plan_encoding_repair_policy(root)
    governance_schema_registry = load_governance_schema_registry(root)
    governance_snapshot_policy = load_governance_harness_snapshot_policy(root)
    governance_ci_policy = load_governance_ci_entrypoint_policy(root)
    governance_runbook_policy = load_governance_runbook_policy(root)
    residual_hardcode_policy = load_residual_hardcode_freeze_audit_policy(root)
    postgres_migration_policy = load_postgres_state_migration_plan_policy(root)
    postgres_state_policy = load_postgres_state_store_evaluation_policy(root)
    vector_ingestion_hardening_policy = load_vector_ingestion_hardening_policy(root)
    relationship_type_refinement_rules = load_relationship_type_refinement_rules(root)
    relationship_evidence_extraction_rules = load_relationship_evidence_extraction_rules(root)
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



    readiness_general_ids = [str(item).strip() for item in runtime_readiness_policy.get("defaultGeneralIds") or []]
    if not readiness_general_ids or any(not item for item in readiness_general_ids):
        raise SanguoGovernanceError("policy-runtime-readiness-matrix defaultGeneralIds must be non-empty strings")
    if len(set(readiness_general_ids)) != len(readiness_general_ids):
        raise SanguoGovernanceError("policy-runtime-readiness-matrix defaultGeneralIds cannot contain duplicates")
    readiness_dialogue_defaults = runtime_readiness_policy.get("dialogueSmokeDefaults") if isinstance(runtime_readiness_policy.get("dialogueSmokeDefaults"), dict) else {}
    for key in ("providerOrderEnv", "locale", "speechContextMode", "llmModelPreset"):
        if not str(readiness_dialogue_defaults.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-runtime-readiness-matrix dialogueSmokeDefaults.{key} cannot be blank")
    if int(readiness_dialogue_defaults.get("limitKeywords") or 0) <= 0 or int(readiness_dialogue_defaults.get("maxChars") or 0) <= 0:
        raise SanguoGovernanceError("policy-runtime-readiness-matrix dialogueSmokeDefaults limits must be positive")
    readiness_status_policy = runtime_readiness_policy.get("statusPolicy") if isinstance(runtime_readiness_policy.get("statusPolicy"), dict) else {}
    for key in ("failStatus", "warnStatus", "passStatus"):
        if not str(readiness_status_policy.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-runtime-readiness-matrix statusPolicy.{key} cannot be blank")
    allowed_fail_gates = {"missingPersona", "noContext", "noKeywordCategory", "noUsedEvidenceRef"}
    allowed_warn_gates = {"fallbackUsed", "qualityWarnings"}
    fail_gates = {str(item).strip() for item in readiness_status_policy.get("failIf") or []}
    warn_gates = {str(item).strip() for item in readiness_status_policy.get("warnIf") or []}
    if not fail_gates or fail_gates - allowed_fail_gates:
        raise SanguoGovernanceError(f"policy-runtime-readiness-matrix invalid fail gates: {sorted(fail_gates - allowed_fail_gates)}")
    if not warn_gates or warn_gates - allowed_warn_gates:
        raise SanguoGovernanceError(f"policy-runtime-readiness-matrix invalid warn gates: {sorted(warn_gates - allowed_warn_gates)}")



    dialogue_confidence_defaults = dialogue_mention_policy.get("confidenceDefaults") if isinstance(dialogue_mention_policy.get("confidenceDefaults"), dict) else {}
    required_dialogue_confidences = {
        "speakerSceneParticipant",
        "speakerHint",
        "speakerUnresolved",
        "addressSceneTitle",
        "addressSingleOtherParticipant",
        "addressUnresolvedTitle",
        "itemLexicalHint",
        "entityFallback",
    }
    missing_dialogue_confidences = sorted(required_dialogue_confidences - set(dialogue_confidence_defaults.keys()))
    if missing_dialogue_confidences:
        raise SanguoGovernanceError(f"policy-dialogue-mention-resolution missing confidence defaults: {missing_dialogue_confidences}")
    for key in required_dialogue_confidences:
        value = float(dialogue_confidence_defaults.get(key))
        if value < 0.0 or value > 1.0:
            raise SanguoGovernanceError(f"policy-dialogue-mention-resolution confidence {key} must be between 0 and 1")
    dialogue_modes = dialogue_mention_policy.get("resolutionModes") if isinstance(dialogue_mention_policy.get("resolutionModes"), dict) else {}
    for key in ("dialogue", "addressSceneTitle", "addressSingleOtherParticipant", "addressUnresolvedTitle", "itemLexicalHint"):
        if not str(dialogue_modes.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-dialogue-mention-resolution resolutionModes.{key} cannot be blank")
    if int(dialogue_mention_policy.get("defaultChapter") or 0) <= 0:
        raise SanguoGovernanceError("policy-dialogue-mention-resolution defaultChapter must be positive")
    dialogue_required_cues = {"ADDRESS_TITLE_HINTS", "ITEM_HINTS", "SPEAKER_HINTS", "ADDRESS_TARGET_HINTS"}
    dialogue_cue_by_name: dict[str, dict[str, Any]] = {}
    dialogue_cue_entry_count = 0
    for row in dialogue_mention_cues:
        if str(row.get("consumer") or "") != "resolve_dialogue_mentions.py":
            raise SanguoGovernanceError("rule-dialogue-mention-resolution-cues invalid consumer")
        constant_name = str(row.get("constantName") or "").strip()
        if constant_name in dialogue_cue_by_name:
            raise SanguoGovernanceError(f"rule-dialogue-mention-resolution-cues duplicate constantName: {constant_name}")
        dialogue_cue_by_name[constant_name] = row
        if str(row.get("kind") or "") != "mapping":
            raise SanguoGovernanceError(f"rule-dialogue-mention-resolution-cues {constant_name} unsupported kind")
        value = row.get("value")
        if not isinstance(value, dict) or not value:
            raise SanguoGovernanceError(f"rule-dialogue-mention-resolution-cues {constant_name} value must be non-empty object")
        for key, target in value.items():
            if not str(key).strip() or not str(target).strip():
                raise SanguoGovernanceError(f"rule-dialogue-mention-resolution-cues {constant_name} has blank mapping")
        dialogue_cue_entry_count += len(value)
    missing_dialogue_cues = sorted(dialogue_required_cues - dialogue_cue_by_name.keys())
    if missing_dialogue_cues:
        raise SanguoGovernanceError(f"rule-dialogue-mention-resolution-cues missing rules: {', '.join(missing_dialogue_cues)}")


    resolution_option_rank = resolution_loop_policy.get("optionRankOrder")
    if not isinstance(resolution_option_rank, dict) or set(resolution_option_rank.keys()) != {"A", "B", "C", "D"}:
        raise SanguoGovernanceError("policy-resolution-loop-runner optionRankOrder must define A/B/C/D")
    resolution_confidence_rank = resolution_loop_policy.get("confidenceRank")
    if not isinstance(resolution_confidence_rank, dict) or set(resolution_confidence_rank.keys()) != {"low", "medium", "high"}:
        raise SanguoGovernanceError("policy-resolution-loop-runner confidenceRank must define low/medium/high")
    for key in ("defaultTop", "defaultMaxIterations"):
        if int(resolution_loop_policy.get(key) or 0) <= 0:
            raise SanguoGovernanceError(f"policy-resolution-loop-runner {key} must be positive")
    resolution_scoring = resolution_loop_policy.get("recommendationScoring")
    if not isinstance(resolution_scoring, dict) or not resolution_scoring:
        raise SanguoGovernanceError("policy-resolution-loop-runner recommendationScoring cannot be empty")
    for key, value in resolution_scoring.items():
        if int(value) < 0:
            raise SanguoGovernanceError(f"policy-resolution-loop-runner recommendationScoring.{key} cannot be negative")
    required_resolution_loop_cues = {
        "DECORATIVE_WRAPPER_CHARS",
        "COMPOUND_NOISE_SUFFIXES",
        "COMPOUND_TITLE_OR_PLACE_SUFFIXES",
    }
    seen_resolution_loop_cues: set[str] = set()
    resolution_loop_cue_value_count = 0
    for row in resolution_loop_cues:
        consumer = str(row.get("consumer") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        kind = str(row.get("kind") or "").strip()
        if consumer != "run_resolution_loop.py":
            raise SanguoGovernanceError("rule-resolution-loop-recommendation-cues invalid consumer")
        if constant_name in seen_resolution_loop_cues:
            raise SanguoGovernanceError(f"rule-resolution-loop-recommendation-cues duplicate constantName: {constant_name}")
        seen_resolution_loop_cues.add(constant_name)
        if kind == "characterSet":
            value = str(row.get("value") or "")
            if not value:
                raise SanguoGovernanceError(f"rule-resolution-loop-recommendation-cues {constant_name} value cannot be blank")
            resolution_loop_cue_value_count += len(value)
        elif kind == "termSet":
            terms = [str(term).strip() for term in row.get("terms") or []]
            if not terms or any(not term for term in terms):
                raise SanguoGovernanceError(f"rule-resolution-loop-recommendation-cues {constant_name} terms cannot be blank")
            if len(set(terms)) != len(terms):
                raise SanguoGovernanceError(f"rule-resolution-loop-recommendation-cues {constant_name} terms cannot contain duplicates")
            resolution_loop_cue_value_count += len(terms)
        else:
            raise SanguoGovernanceError(f"rule-resolution-loop-recommendation-cues {constant_name} unsupported kind: {kind}")
    missing_resolution_loop_cues = sorted(required_resolution_loop_cues - seen_resolution_loop_cues)
    if missing_resolution_loop_cues:
        raise SanguoGovernanceError(f"rule-resolution-loop-recommendation-cues missing rules: {', '.join(missing_resolution_loop_cues)}")


    three_lane_limits = three_lane_scheduler_policy.get("defaultLimits") if isinstance(three_lane_scheduler_policy.get("defaultLimits"), dict) else {}
    for key in ("pendingReviewLimit", "stepTimeoutSeconds"):
        if int(three_lane_limits.get(key) or 0) <= 0:
            raise SanguoGovernanceError(f"policy-three-lane-progress-scheduler defaultLimits.{key} must be positive")
    three_lane_reviewer = three_lane_scheduler_policy.get("defaultReviewer") if isinstance(three_lane_scheduler_policy.get("defaultReviewer"), dict) else {}
    for key in ("preset", "provider"):
        if not str(three_lane_reviewer.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-three-lane-progress-scheduler defaultReviewer.{key} cannot be blank")
    three_lane_lanes = three_lane_scheduler_policy.get("laneOrder")
    if not isinstance(three_lane_lanes, list) or not three_lane_lanes:
        raise SanguoGovernanceError("policy-three-lane-progress-scheduler laneOrder cannot be empty")
    lane_ids: set[str] = set()
    profile_count = 0
    for row in three_lane_lanes:
        if not isinstance(row, dict):
            raise SanguoGovernanceError("policy-three-lane-progress-scheduler laneOrder row must be object")
        lane_id = str(row.get("laneId") or "").strip()
        profile = str(row.get("profile") or "").strip()
        lane_name = str(row.get("laneName") or "").strip()
        if not lane_id or not profile or not lane_name:
            raise SanguoGovernanceError("policy-three-lane-progress-scheduler lane row has blank field")
        if lane_id in lane_ids:
            raise SanguoGovernanceError(f"policy-three-lane-progress-scheduler duplicate laneId: {lane_id}")
        lane_ids.add(lane_id)
        profile_count += 1
        for key in ("maxRounds", "maxAbCycles"):
            if int(row.get(key) or 0) <= 0:
                raise SanguoGovernanceError(f"policy-three-lane-progress-scheduler {lane_id}.{key} must be positive")
    three_lane_stop_policy = three_lane_scheduler_policy.get("stopReasonPolicy") if isinstance(three_lane_scheduler_policy.get("stopReasonPolicy"), dict) else {}
    stop_reason_count = 0
    for key in ("humanStopReasons", "fatalStopReasons"):
        values = [str(item).strip() for item in three_lane_stop_policy.get(key) or []]
        if not values or any(not item for item in values):
            raise SanguoGovernanceError(f"policy-three-lane-progress-scheduler stopReasonPolicy.{key} cannot be blank")
        if len(set(values)) != len(values):
            raise SanguoGovernanceError(f"policy-three-lane-progress-scheduler stopReasonPolicy.{key} cannot contain duplicates")
        stop_reason_count += len(values)
    for key in ("completedStopReason", "completedNextAction", "humanGateNextAction", "fatalStopNextAction"):
        if not str(three_lane_stop_policy.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-three-lane-progress-scheduler stopReasonPolicy.{key} cannot be blank")


    repair_paths = repair_review_campaign_policy.get("defaultPaths") if isinstance(repair_review_campaign_policy.get("defaultPaths"), dict) else {}
    required_repair_paths = {
        "editBacklog",
        "baseEvents",
        "baseRelationshipEvidence",
        "baseProgress",
        "repairOutputRoot",
        "roundsRoot",
        "eventSeedRoot",
        "packetRoot",
        "progressRoot",
    }
    if required_repair_paths - set(repair_paths.keys()):
        missing_repair_paths = sorted(required_repair_paths - set(repair_paths.keys()))
        raise SanguoGovernanceError(f"policy-repair-review-campaign missing defaultPaths: {', '.join(missing_repair_paths)}")
    if any(not str(value or "").strip() for value in repair_paths.values()):
        raise SanguoGovernanceError("policy-repair-review-campaign defaultPaths cannot contain blank value")
    repair_inputs = repair_review_campaign_policy.get("fallbackInputs") if isinstance(repair_review_campaign_policy.get("fallbackInputs"), dict) else {}
    if not repair_inputs or any(not str(value or "").strip() for value in repair_inputs.values()):
        raise SanguoGovernanceError("policy-repair-review-campaign fallbackInputs cannot contain blank value")
    repair_selection = repair_review_campaign_policy.get("selectionDefaults") if isinstance(repair_review_campaign_policy.get("selectionDefaults"), dict) else {}
    for key in ("topGenerals", "topPerGeneral"):
        if int(repair_selection.get(key) or 0) <= 0:
            raise SanguoGovernanceError(f"policy-repair-review-campaign selectionDefaults.{key} must be positive")
    repair_reviewer = repair_review_campaign_policy.get("reviewerDefaults") if isinstance(repair_review_campaign_policy.get("reviewerDefaults"), dict) else {}
    for key in ("preset", "provider"):
        if not str(repair_reviewer.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-repair-review-campaign reviewerDefaults.{key} cannot be blank")
    repair_gates = repair_review_campaign_policy.get("gateDefaults") if isinstance(repair_review_campaign_policy.get("gateDefaults"), dict) else {}
    for key in ("humanQuestionThreshold", "stepTimeoutSeconds"):
        if int(repair_gates.get(key) or 0) <= 0:
            raise SanguoGovernanceError(f"policy-repair-review-campaign gateDefaults.{key} must be positive")
    repair_patterns = repair_review_campaign_policy.get("roundSelectionPatterns") if isinstance(repair_review_campaign_policy.get("roundSelectionPatterns"), dict) else {}
    for key in ("pass", "rerun"):
        pattern = str(repair_patterns.get(key) or "")
        if not pattern:
            raise SanguoGovernanceError(f"policy-repair-review-campaign roundSelectionPatterns.{key} cannot be blank")
        try:
            __import__("re").compile(pattern)
        except Exception as exc:
            raise SanguoGovernanceError(f"policy-repair-review-campaign invalid roundSelectionPatterns.{key}: {exc}") from exc


    knowledge_growth_paths = knowledge_growth_round_policy.get("defaultPaths") if isinstance(knowledge_growth_round_policy.get("defaultPaths"), dict) else {}
    required_growth_paths = {"pilotReport", "candidates", "outputRoot", "reviewRoot", "chaptersRoot"}
    missing_growth_paths = sorted(required_growth_paths - set(knowledge_growth_paths.keys()))
    if missing_growth_paths:
        raise SanguoGovernanceError(f"policy-knowledge-growth-round-runner missing defaultPaths: {', '.join(missing_growth_paths)}")
    if any(not str(value or "").strip() for value in knowledge_growth_paths.values()):
        raise SanguoGovernanceError("policy-knowledge-growth-round-runner defaultPaths cannot contain blank value")
    knowledge_growth_cohort = knowledge_growth_round_policy.get("cohortDefaults") if isinstance(knowledge_growth_round_policy.get("cohortDefaults"), dict) else {}
    for key in ("maxGenerals", "topPerGeneral"):
        if int(knowledge_growth_cohort.get(key) or 0) <= 0:
            raise SanguoGovernanceError(f"policy-knowledge-growth-round-runner cohortDefaults.{key} must be positive")
    if int(knowledge_growth_cohort.get("cohortOffset") or 0) < 0:
        raise SanguoGovernanceError("policy-knowledge-growth-round-runner cohortDefaults.cohortOffset cannot be negative")
    knowledge_growth_reviewer = knowledge_growth_round_policy.get("reviewerDefaults") if isinstance(knowledge_growth_round_policy.get("reviewerDefaults"), dict) else {}
    for key in ("preset", "apiUrl"):
        if not str(knowledge_growth_reviewer.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-knowledge-growth-round-runner reviewerDefaults.{key} cannot be blank")
    knowledge_growth_context = knowledge_growth_round_policy.get("contextWindowDefaults") if isinstance(knowledge_growth_round_policy.get("contextWindowDefaults"), dict) else {}
    for key in ("windowBefore", "windowAfter"):
        if int(knowledge_growth_context.get(key) or -1) < 0:
            raise SanguoGovernanceError(f"policy-knowledge-growth-round-runner contextWindowDefaults.{key} cannot be negative")
    knowledge_growth_gates = knowledge_growth_round_policy.get("gateDefaults") if isinstance(knowledge_growth_round_policy.get("gateDefaults"), dict) else {}
    for key in ("humanQuestionThreshold", "stepTimeoutSeconds"):
        if int(knowledge_growth_gates.get(key) or 0) <= 0:
            raise SanguoGovernanceError(f"policy-knowledge-growth-round-runner gateDefaults.{key} must be positive")


    three_kweb_paths = three_kweb_check_policy.get("defaultPaths") if isinstance(three_kweb_check_policy.get("defaultPaths"), dict) else {}
    for key in ("outputRoot", "sourcesConfig", "scoreboardJson", "sourceHealthCli"):
        if not str(three_kweb_paths.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-3kweb-check-runner defaultPaths.{key} cannot be empty")
    three_kweb_precheck = three_kweb_check_policy.get("precheckDefaults") if isinstance(three_kweb_check_policy.get("precheckDefaults"), dict) else {}
    likely_threshold = int(three_kweb_precheck.get("likelyThreshold") or 0)
    possible_threshold = int(three_kweb_precheck.get("possibleThreshold") or 0)
    if likely_threshold <= 0 or possible_threshold <= 0 or likely_threshold < possible_threshold:
        raise SanguoGovernanceError("policy-3kweb-check-runner precheck thresholds must be positive and likely >= possible")
    if int(three_kweb_precheck.get("minimumTermHitCount") or -1) < 0:
        raise SanguoGovernanceError("policy-3kweb-check-runner minimumTermHitCount cannot be negative")
    hint_keywords = [str(item).strip() for item in three_kweb_precheck.get("hintKeywords") or []]
    if not hint_keywords or any(not item for item in hint_keywords) or len(set(hint_keywords)) != len(hint_keywords):
        raise SanguoGovernanceError("policy-3kweb-check-runner hintKeywords must be non-empty and unique")
    three_kweb_fetch = three_kweb_check_policy.get("fetchDefaults") if isinstance(three_kweb_check_policy.get("fetchDefaults"), dict) else {}
    if str(three_kweb_fetch.get("fetchBackend") or "") not in {"auto", "node-cli", "python"}:
        raise SanguoGovernanceError("policy-3kweb-check-runner fetchDefaults.fetchBackend is invalid")
    if float(three_kweb_fetch.get("timeoutSeconds") or 0.0) <= 0.0:
        raise SanguoGovernanceError("policy-3kweb-check-runner timeoutSeconds must be positive")
    if int(three_kweb_fetch.get("maxGapGenerals") or 0) <= 0:
        raise SanguoGovernanceError("policy-3kweb-check-runner maxGapGenerals must be positive")
    if len(three_kweb_check_cues) != 1:
        raise SanguoGovernanceError("rule-3kweb-check-cues must contain exactly one row")
    three_kweb_keywords = [str(item).strip() for item in three_kweb_check_cues[0].get("value") or []]
    if not three_kweb_keywords or any(not item for item in three_kweb_keywords) or len(set(three_kweb_keywords)) != len(three_kweb_keywords):
        raise SanguoGovernanceError("rule-3kweb-check-cues keyword value must be non-empty and unique")


    deepseek_paths = deepseek_reasoning_policy.get("defaultPaths") if isinstance(deepseek_reasoning_policy.get("defaultPaths"), dict) else {}
    for key in ("events", "genericCandidates", "keywordRoot", "outputRoot"):
        if not str(deepseek_paths.get(key) or "").strip():
            raise SanguoGovernanceError(f"policy-deepseek-reasoning-trial defaultPaths.{key} cannot be empty")
    if not str(deepseek_reasoning_policy.get("defaultGeneralId") or "").strip():
        raise SanguoGovernanceError("policy-deepseek-reasoning-trial defaultGeneralId cannot be empty")
    deepseek_limits = deepseek_reasoning_policy.get("promptLimits") if isinstance(deepseek_reasoning_policy.get("promptLimits"), dict) else {}
    for key in ("topEvents", "topGeneric", "topKeywordsPerCategory"):
        if int(deepseek_limits.get(key) or 0) < 0:
            raise SanguoGovernanceError(f"policy-deepseek-reasoning-trial promptLimits.{key} cannot be negative")
    deepseek_reasoning = deepseek_reasoning_policy.get("reasoningDefaults") if isinstance(deepseek_reasoning_policy.get("reasoningDefaults"), dict) else {}
    for key in ("timeoutMs", "numCtx", "numPredict"):
        if int(deepseek_reasoning.get(key) or 0) <= 0:
            raise SanguoGovernanceError(f"policy-deepseek-reasoning-trial reasoningDefaults.{key} must be positive")
    if float(deepseek_reasoning.get("temperature") or -1.0) < 0.0:
        raise SanguoGovernanceError("policy-deepseek-reasoning-trial reasoningDefaults.temperature cannot be negative")
    top_p = float(deepseek_reasoning.get("topP") or 0.0)
    if top_p <= 0.0 or top_p > 1.0:
        raise SanguoGovernanceError("policy-deepseek-reasoning-trial reasoningDefaults.topP must be within (0, 1]")
    if float(deepseek_reasoning.get("repeatPenalty") or 0.0) <= 0.0:
        raise SanguoGovernanceError("policy-deepseek-reasoning-trial reasoningDefaults.repeatPenalty must be positive")


    relationship_type_required = {
        "COARSE_RELATIONSHIP_TYPES",
        "STABLE_RELATIONSHIP_TYPES",
        "KINSHIP_RELATIONSHIP_TYPES",
        "RELATIONSHIP_TYPE_FAMILIES",
        "TYPE_LABELS",
        "BETRAYAL_TERMS",
        "MENTOR_TERMS",
        "PATRON_TERMS",
        "ALLIANCE_TERMS",
        "ENEMY_TERMS",
        "COMMAND_TERMS",
        "SPOUSE_TERMS",
        "PARENT_CHILD_TERMS",
        "SIBLING_TERMS",
        "SWORN_SIBLING_TERMS",
    }
    relationship_evidence_required = {
        "DIRECT_PAIR_CONFRONT_TERMS",
        "DIRECTED_CONFRONT_TERMS",
        "COMMAND_TERMS",
        "PROTECT_TERMS",
        "ALLY_TERMS",
        "FALSE_POSITIVE_TERMS",
        "SINGLE_CHAR_ALIAS_ALLOWLIST",
    }

    def validate_governance_value_row(row: dict[str, Any], *, expected_consumer: str, source_name: str) -> int:
        consumer = str(row.get("consumer") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        kind = str(row.get("kind") or "").strip()
        if consumer != expected_consumer:
            raise SanguoGovernanceError(f"{source_name} {constant_name} invalid consumer: {consumer}")
        if not constant_name:
            raise SanguoGovernanceError(f"{source_name} has blank constantName")
        value = row.get("value")
        if kind == "mapping":
            if not isinstance(value, dict) or not value:
                raise SanguoGovernanceError(f"{source_name} {constant_name} mapping value cannot be empty")
            for key, item in value.items():
                if not str(key).strip() or not str(item).strip():
                    raise SanguoGovernanceError(f"{source_name} {constant_name} mapping has blank key/value")
            return len(value)
        if kind == "aliasAllowlist":
            if not isinstance(value, dict) or not value:
                raise SanguoGovernanceError(f"{source_name} {constant_name} aliasAllowlist value cannot be empty")
            count = 0
            for key, aliases in value.items():
                if not str(key).strip() or not isinstance(aliases, list) or not aliases:
                    raise SanguoGovernanceError(f"{source_name} {constant_name} aliasAllowlist has invalid entry")
                normalized_aliases = [str(alias).strip() for alias in aliases]
                if any(not alias for alias in normalized_aliases):
                    raise SanguoGovernanceError(f"{source_name} {constant_name} aliasAllowlist has blank alias")
                if len(set(normalized_aliases)) != len(normalized_aliases):
                    raise SanguoGovernanceError(f"{source_name} {constant_name} aliasAllowlist has duplicate alias")
                count += len(normalized_aliases)
            return count
        if kind in {"set", "terms"}:
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"{source_name} {constant_name} list value cannot be empty")
            normalized_terms = [str(term).strip() for term in value]
            if any(not term for term in normalized_terms):
                raise SanguoGovernanceError(f"{source_name} {constant_name} has blank cue")
            if len(set(normalized_terms)) != len(normalized_terms):
                raise SanguoGovernanceError(f"{source_name} {constant_name} has duplicate cue")
            return len(normalized_terms)
        raise SanguoGovernanceError(f"{source_name} {constant_name} unsupported kind: {kind}")

    relationship_type_by_name: dict[str, dict[str, Any]] = {}
    relationship_type_refinement_term_count = 0
    for row in relationship_type_refinement_rules:
        constant_name = str(row.get("constantName") or "")
        if constant_name in relationship_type_by_name:
            raise SanguoGovernanceError(f"rule-relationship-type-refinement duplicate constantName: {constant_name}")
        relationship_type_by_name[constant_name] = row
        relationship_type_refinement_term_count += validate_governance_value_row(
            row,
            expected_consumer="relationship_type_refinement.py",
            source_name="rule-relationship-type-refinement",
        )
    missing_relationship_type = sorted(relationship_type_required - relationship_type_by_name.keys())
    if missing_relationship_type:
        raise SanguoGovernanceError(f"rule-relationship-type-refinement missing rules: {', '.join(missing_relationship_type)}")

    relationship_evidence_by_name: dict[str, dict[str, Any]] = {}
    relationship_evidence_extraction_cue_count = 0
    for row in relationship_evidence_extraction_rules:
        constant_name = str(row.get("constantName") or "")
        if constant_name in relationship_evidence_by_name:
            raise SanguoGovernanceError(f"rule-relationship-evidence-extraction-cues duplicate constantName: {constant_name}")
        relationship_evidence_by_name[constant_name] = row
        relationship_evidence_extraction_cue_count += validate_governance_value_row(
            row,
            expected_consumer="extract_relationship_evidence.py",
            source_name="rule-relationship-evidence-extraction-cues",
        )
    missing_relationship_evidence = sorted(relationship_evidence_required - relationship_evidence_by_name.keys())
    if missing_relationship_evidence:
        raise SanguoGovernanceError(f"rule-relationship-evidence-extraction-cues missing rules: {', '.join(missing_relationship_evidence)}")



    alias_policy_priority = alias_mention_policy.get("aliasSourcePriority") if isinstance(alias_mention_policy.get("aliasSourcePriority"), dict) else {}
    alias_policy_labels = alias_mention_policy.get("aliasSourceLabels") if isinstance(alias_mention_policy.get("aliasSourceLabels"), dict) else {}
    if not alias_policy_priority or not alias_policy_labels:
        raise SanguoGovernanceError("policy-alias-mention-intake aliasSourcePriority/aliasSourceLabels cannot be empty")
    alias_required = {
        ("build_alias_dict.py", "DECORATIVE_WRAPPER_CHARS"),
        ("collect_observed_mentions.py", "DECORATIVE_WRAPPER_CHARS"),
        ("collect_observed_mentions.py", "ADDRESS_TITLES"),
        ("collect_observed_mentions.py", "COMPOUND_SURNAMES"),
        ("collect_observed_mentions.py", "COMMON_SINGLE_SURNAMES"),
        ("collect_observed_mentions.py", "NOISE_LABELS"),
        ("collect_observed_mentions.py", "NOISE_SUBSTRINGS"),
        ("collect_observed_mentions.py", "NOISE_CHARS"),
        ("collect_observed_mentions.py", "NON_NAME_SECOND_CHARS"),
        ("collect_observed_mentions.py", "NON_NAME_THIRD_CHARS"),
        ("collect_observed_mentions.py", "LOCATION_SUFFIXES"),
        ("collect_observed_mentions.py", "PERSON_PREFIXES"),
    }
    alias_seen: set[tuple[str, str]] = set()
    alias_cue_value_count = 0
    for row in alias_mention_cues:
        consumer = str(row.get("consumer") or "").strip()
        constant_name = str(row.get("constantName") or "").strip()
        key = (consumer, constant_name)
        if key in alias_seen:
            raise SanguoGovernanceError(f"rule-alias-mention-intake-cues duplicate row: {consumer}.{constant_name}")
        alias_seen.add(key)
        value = row.get("value")
        kind = str(row.get("kind") or "").strip()
        if kind == "string":
            if not isinstance(value, str) or not value:
                raise SanguoGovernanceError(f"rule-alias-mention-intake-cues {consumer}.{constant_name} string cannot be empty")
            alias_cue_value_count += len(value)
        elif kind in {"sequence", "set"}:
            if not isinstance(value, list) or not value:
                raise SanguoGovernanceError(f"rule-alias-mention-intake-cues {consumer}.{constant_name} list cannot be empty")
            normalized = [str(item).strip() for item in value]
            if any(not item for item in normalized):
                raise SanguoGovernanceError(f"rule-alias-mention-intake-cues {consumer}.{constant_name} has blank cue")
            alias_cue_value_count += len(normalized)
        else:
            raise SanguoGovernanceError(f"rule-alias-mention-intake-cues {consumer}.{constant_name} unsupported kind: {kind}")
    missing_alias_cues = sorted(alias_required - alias_seen)
    if missing_alias_cues:
        raise SanguoGovernanceError(f"rule-alias-mention-intake-cues missing rows: {missing_alias_cues}")

    external_score_tables = [
        external_evidence_scoring_policy.get("sourceLayerScore"),
        external_evidence_scoring_policy.get("angleSpecificityScore"),
        external_evidence_scoring_policy.get("extractionReliabilityScore"),
    ]
    if any(not isinstance(table, dict) or not table for table in external_score_tables):
        raise SanguoGovernanceError("policy-external-evidence-scoring score tables cannot be empty")
    external_score_value_count = 0
    for table in external_score_tables:
        for key, value in table.items():
            if not str(key).strip() or not isinstance(value, (int, float)) or float(value) < 0:
                raise SanguoGovernanceError("policy-external-evidence-scoring score table contains invalid value")
            external_score_value_count += 1
    external_raw_weights = external_evidence_scoring_policy.get("rawSeedScoreWeights") if isinstance(external_evidence_scoring_policy.get("rawSeedScoreWeights"), dict) else {}
    if abs(sum(float(value) for value in external_raw_weights.values()) - 1.0) > 0.000001:
        raise SanguoGovernanceError("policy-external-evidence-scoring rawSeedScoreWeights must sum to 1.0")

    crawler_policy = source_browser_vector_policy.get("crawler") if isinstance(source_browser_vector_policy.get("crawler"), dict) else {}
    crawlable_classes = [str(item).strip() for item in crawler_policy.get("crawlableSourceClasses") or []]
    if not crawlable_classes or any(not item for item in crawlable_classes):
        raise SanguoGovernanceError("policy-source-browser-vector-readiness crawler.crawlableSourceClasses cannot be empty")
    class_sample_size = crawler_policy.get("classSampleSize") if isinstance(crawler_policy.get("classSampleSize"), dict) else {}
    if not class_sample_size or any(int(value) <= 0 for value in class_sample_size.values()):
        raise SanguoGovernanceError("policy-source-browser-vector-readiness crawler.classSampleSize values must be positive")
    browser_policy = source_browser_vector_policy.get("browserGate") if isinstance(source_browser_vector_policy.get("browserGate"), dict) else {}
    fail_statuses = {str(item).strip() for item in browser_policy.get("failStatuses") or []}
    pass_statuses = {str(item).strip() for item in browser_policy.get("passStatuses") or []}
    if not fail_statuses or not pass_statuses or fail_statuses & pass_statuses:
        raise SanguoGovernanceError("policy-source-browser-vector-readiness browserGate pass/fail statuses must be non-empty and disjoint")
    fallback_rules = browser_policy.get("builtin403FallbackRules") if isinstance(browser_policy.get("builtin403FallbackRules"), dict) else {}
    if not fallback_rules:
        raise SanguoGovernanceError("policy-source-browser-vector-readiness browserGate.builtin403FallbackRules cannot be empty")

    keyword_policy = runtime_batch_keyword_policy.get("keywordOptions") if isinstance(runtime_batch_keyword_policy.get("keywordOptions"), dict) else {}
    if not str(keyword_policy.get("defaultGeneralId") or "").strip():
        raise SanguoGovernanceError("policy-runtime-batch-keyword-readiness keywordOptions.defaultGeneralId cannot be empty")
    if int(keyword_policy.get("defaultUiLabelMaxChars") or 0) <= 0:
        raise SanguoGovernanceError("policy-runtime-batch-keyword-readiness keywordOptions.defaultUiLabelMaxChars must be positive")
    category_limits = keyword_policy.get("categoryLabelLimits") if isinstance(keyword_policy.get("categoryLabelLimits"), dict) else {}
    if not category_limits or any(int(value) <= 0 for value in category_limits.values()):
        raise SanguoGovernanceError("policy-runtime-batch-keyword-readiness keywordOptions.categoryLabelLimits values must be positive")
    item_keywords = keyword_policy.get("knownItemKeywords") if isinstance(keyword_policy.get("knownItemKeywords"), dict) else {}
    creature_keywords = keyword_policy.get("knownCreatureKeywords") if isinstance(keyword_policy.get("knownCreatureKeywords"), dict) else {}
    if not item_keywords or not creature_keywords:
        raise SanguoGovernanceError("policy-runtime-batch-keyword-readiness keywordOptions known keyword maps cannot be empty")
    api_policy = runtime_batch_keyword_policy.get("apiReadiness") if isinstance(runtime_batch_keyword_policy.get("apiReadiness"), dict) else {}
    if not str(api_policy.get("defaultGeneralId") or "").strip() or not str(api_policy.get("personaNamespace") or "").strip():
        raise SanguoGovernanceError("policy-runtime-batch-keyword-readiness apiReadiness fields cannot be empty")

    convergence_resume = convergence_loop_state_policy.get("resumePolicy") if isinstance(convergence_loop_state_policy.get("resumePolicy"), dict) else {}
    manifest_keys = [str(item).strip() for item in convergence_resume.get("manifestPathKeys") or []]
    progress_keys = [str(item).strip() for item in convergence_resume.get("progressPathKeys") or []]
    if not manifest_keys or any(not item for item in manifest_keys):
        raise SanguoGovernanceError("policy-convergence-loop-state resumePolicy.manifestPathKeys cannot be empty")
    if not progress_keys or any(not item for item in progress_keys):
        raise SanguoGovernanceError("policy-convergence-loop-state resumePolicy.progressPathKeys cannot be empty")
    stop_policy = convergence_loop_state_policy.get("stopReasonPolicy") if isinstance(convergence_loop_state_policy.get("stopReasonPolicy"), dict) else {}
    allowed_stop_reasons = [str(item).strip() for item in stop_policy.get("allowedStopReasons") or []]
    if not allowed_stop_reasons or any(not item for item in allowed_stop_reasons):
        raise SanguoGovernanceError("policy-convergence-loop-state stopReasonPolicy.allowedStopReasons cannot be empty")
    roi_policy = convergence_loop_state_policy.get("roiStatePolicy") if isinstance(convergence_loop_state_policy.get("roiStatePolicy"), dict) else {}
    roi_actions = [str(item).strip() for item in roi_policy.get("actions") or []]
    if not roi_actions or "keep" not in roi_actions:
        raise SanguoGovernanceError("policy-convergence-loop-state roiStatePolicy.actions must include keep")

    harness_phases = governance_regression_harness_policy.get("phaseMatrix") if isinstance(governance_regression_harness_policy.get("phaseMatrix"), list) else []
    if not harness_phases:
        raise SanguoGovernanceError("policy-governance-regression-harness phaseMatrix cannot be empty")
    phase_numbers = [int(row.get("phase")) for row in harness_phases if isinstance(row, dict) and row.get("phase") is not None]
    if sorted(set(phase_numbers)) != phase_numbers:
        raise SanguoGovernanceError("policy-governance-regression-harness phaseMatrix phases must be unique and sorted")
    harness_sensors = [str(item).strip() for item in governance_regression_harness_policy.get("requiredSensorNames") or []]
    if not harness_sensors or any(not item for item in harness_sensors):
        raise SanguoGovernanceError("policy-governance-regression-harness requiredSensorNames cannot be empty")
    fixture_manifests = governance_regression_harness_policy.get("fixtureManifests")
    if not isinstance(fixture_manifests, list) or not fixture_manifests:
        raise SanguoGovernanceError("policy-governance-regression-harness fixtureManifests cannot be empty")
    for row in fixture_manifests:
        if not isinstance(row, dict):
            raise SanguoGovernanceError("policy-governance-regression-harness fixtureManifests rows must be objects")
        if not str(row.get("id") or "").strip() or not str(row.get("path") or "").strip():
            raise SanguoGovernanceError("policy-governance-regression-harness fixtureManifests rows require id/path")
    validation_summary_keys = [str(item).strip() for item in governance_validation_policy.get("requiredMinimumShapeSummaryKeys") or []]
    if not validation_summary_keys or any(not item for item in validation_summary_keys):
        raise SanguoGovernanceError("policy-governance-validation-stabilization requiredMinimumShapeSummaryKeys cannot be empty")
    if len(set(validation_summary_keys)) != len(validation_summary_keys):
        raise SanguoGovernanceError("policy-governance-validation-stabilization requiredMinimumShapeSummaryKeys must be unique")
    release_required_keys = [str(item).strip() for item in governance_release_policy.get("requiredHarnessSummaryKeys") or []]
    if not release_required_keys or any(not item for item in release_required_keys):
        raise SanguoGovernanceError("policy-governance-release-readiness requiredHarnessSummaryKeys cannot be empty")
    if len(set(release_required_keys)) != len(release_required_keys):
        raise SanguoGovernanceError("policy-governance-release-readiness requiredHarnessSummaryKeys must be unique")
    max_allowed = governance_release_policy.get("maxAllowed")
    if not isinstance(max_allowed, dict) or set(release_required_keys) - set(max_allowed.keys()):
        raise SanguoGovernanceError("policy-governance-release-readiness maxAllowed must cover requiredHarnessSummaryKeys")
    if any(float(value) < 0 for value in max_allowed.values()):
        raise SanguoGovernanceError("policy-governance-release-readiness maxAllowed cannot contain negative values")
    release_sections = [str(item).strip() for item in governance_release_policy.get("requiredHandoffSections") or []]
    if sorted(set(release_sections)) != ["catalogs", "policies", "rules", "schemas"]:
        raise SanguoGovernanceError("policy-governance-release-readiness requiredHandoffSections must cover catalogs/policies/rules/schemas")
    drift_tracked_keys = [str(item).strip() for item in governance_drift_policy.get("trackedHarnessSummaryKeys") or []]
    if not drift_tracked_keys or any(not item for item in drift_tracked_keys):
        raise SanguoGovernanceError("policy-governance-drift-detection trackedHarnessSummaryKeys cannot be empty")
    drift_baseline_minimums = governance_drift_policy.get("baselineMinimums")
    if not isinstance(drift_baseline_minimums, dict) or not drift_baseline_minimums:
        raise SanguoGovernanceError("policy-governance-drift-detection baselineMinimums cannot be empty")
    if any(float(value) < 0 for value in drift_baseline_minimums.values()):
        raise SanguoGovernanceError("policy-governance-drift-detection baselineMinimums cannot contain negative values")
    drift_max_allowed = governance_drift_policy.get("maxAllowed")
    if not isinstance(drift_max_allowed, dict) or not drift_max_allowed:
        raise SanguoGovernanceError("policy-governance-drift-detection maxAllowed cannot be empty")
    if any(float(value) < 0 for value in drift_max_allowed.values()):
        raise SanguoGovernanceError("policy-governance-drift-detection maxAllowed cannot contain negative values")
    operator_audiences = [str(item).strip() for item in governance_operator_policy.get("audiences") or []]
    if not operator_audiences or any(not item for item in operator_audiences):
        raise SanguoGovernanceError("policy-governance-operator-summary audiences cannot be empty")
    operator_sections = governance_operator_policy.get("summarySections")
    if not isinstance(operator_sections, list) or not operator_sections:
        raise SanguoGovernanceError("policy-governance-operator-summary summarySections cannot be empty")
    for row in operator_sections:
        if not isinstance(row, dict) or not str(row.get("key") or "").strip() or not str(row.get("label") or "").strip():
            raise SanguoGovernanceError("policy-governance-operator-summary summarySections require key/label")

    triage_severity_order = [str(item).strip() for item in governance_failure_triage_policy.get("severityOrder") or []]
    if not triage_severity_order or any(not item for item in triage_severity_order):
        raise SanguoGovernanceError("policy-governance-failure-triage severityOrder cannot be empty")
    triage_required = [str(item).strip() for item in governance_failure_triage_policy.get("requiredCategories") or []]
    triage_categories = governance_failure_triage_policy.get("categories")
    if not isinstance(triage_categories, list) or not triage_categories:
        raise SanguoGovernanceError("policy-governance-failure-triage categories cannot be empty")
    triage_keys: set[str] = set()
    for row in triage_categories:
        if not isinstance(row, dict):
            raise SanguoGovernanceError("policy-governance-failure-triage category rows must be objects")
        key = str(row.get("key") or "").strip()
        severity = str(row.get("severity") or "").strip()
        owner = str(row.get("owner") or "").strip()
        action = str(row.get("action") or "").strip()
        source_metric = str(row.get("sourceMetric") or "").strip()
        if not key or not severity or not owner or not action or not source_metric:
            raise SanguoGovernanceError("policy-governance-failure-triage categories require key/sourceMetric/severity/owner/action")
        if severity not in triage_severity_order:
            raise SanguoGovernanceError(f"policy-governance-failure-triage unsupported severity: {severity}")
        if key in triage_keys:
            raise SanguoGovernanceError(f"policy-governance-failure-triage duplicate category: {key}")
        triage_keys.add(key)
    missing_triage = sorted(set(triage_required) - triage_keys)
    if missing_triage:
        raise SanguoGovernanceError(f"policy-governance-failure-triage missing required categories: {', '.join(missing_triage)}")
    ledger_phase_range = governance_completion_ledger_policy.get("phaseRange") if isinstance(governance_completion_ledger_policy.get("phaseRange"), dict) else {}
    ledger_min_phase = int(ledger_phase_range.get("min") or 0)
    ledger_max_phase = int(ledger_phase_range.get("max") or 0)
    if ledger_min_phase <= 0 or ledger_max_phase < ledger_min_phase:
        raise SanguoGovernanceError("policy-governance-completion-ledger phaseRange must be positive and ordered")
    ledger_status_labels = governance_completion_ledger_policy.get("statusLabels") if isinstance(governance_completion_ledger_policy.get("statusLabels"), dict) else {}
    if not str(ledger_status_labels.get("completed") or "").strip() or not str(ledger_status_labels.get("missingPlan") or "").strip():
        raise SanguoGovernanceError("policy-governance-completion-ledger statusLabels must include completed/missingPlan")
    ledger_fields = [str(item).strip() for item in governance_completion_ledger_policy.get("requiredLedgerFields") or []]
    if not ledger_fields or any(not item for item in ledger_fields):
        raise SanguoGovernanceError("policy-governance-completion-ledger requiredLedgerFields cannot be empty")

    run_profile_flag_names = [str(item).strip() for item in governance_run_profiles_policy.get("flagNames") or []]
    if not run_profile_flag_names or any(not item for item in run_profile_flag_names):
        raise SanguoGovernanceError("policy-governance-run-profiles flagNames cannot be empty")
    run_profiles = governance_run_profiles_policy.get("profiles")
    if not isinstance(run_profiles, list) or not run_profiles:
        raise SanguoGovernanceError("policy-governance-run-profiles profiles cannot be empty")
    profile_names: set[str] = set()
    for row in run_profiles:
        if not isinstance(row, dict):
            raise SanguoGovernanceError("policy-governance-run-profiles profile rows must be objects")
        name = str(row.get("name") or "").strip()
        if not name:
            raise SanguoGovernanceError("policy-governance-run-profiles profile name cannot be blank")
        if name in profile_names:
            raise SanguoGovernanceError(f"policy-governance-run-profiles duplicate profile: {name}")
        profile_names.add(name)
        strict_flags = row.get("strictFlags") if isinstance(row.get("strictFlags"), dict) else {}
        if set(strict_flags.keys()) != set(run_profile_flag_names):
            raise SanguoGovernanceError(f"policy-governance-run-profiles strictFlags mismatch: {name}")
        if any(not isinstance(value, bool) for value in strict_flags.values()):
            raise SanguoGovernanceError(f"policy-governance-run-profiles strictFlags must be boolean: {name}")
    default_profile = str(governance_run_profiles_policy.get("defaultProfile") or "").strip()
    if default_profile not in profile_names:
        raise SanguoGovernanceError("policy-governance-run-profiles defaultProfile must exist in profiles")
    report_files = governance_report_bundle_policy.get("defaultFiles")
    if not isinstance(report_files, list) or not report_files:
        raise SanguoGovernanceError("policy-governance-report-bundle defaultFiles cannot be empty")
    report_keys: set[str] = set()
    allowed_formats = {"json", "markdown"}
    for row in report_files:
        if not isinstance(row, dict):
            raise SanguoGovernanceError("policy-governance-report-bundle file rows must be objects")
        key = str(row.get("key") or "").strip()
        path_text = str(row.get("path") or "").strip()
        format_text = str(row.get("format") or "").strip()
        if not key or not path_text or not format_text:
            raise SanguoGovernanceError("policy-governance-report-bundle files require key/path/format")
        if key in report_keys:
            raise SanguoGovernanceError(f"policy-governance-report-bundle duplicate file key: {key}")
        if format_text not in allowed_formats:
            raise SanguoGovernanceError(f"policy-governance-report-bundle unsupported format: {format_text}")
        report_keys.add(key)
    required_payload_keys = [str(item).strip() for item in governance_report_bundle_policy.get("requiredPayloadKeys") or []]
    if not required_payload_keys or any(not item for item in required_payload_keys):
        raise SanguoGovernanceError("policy-governance-report-bundle requiredPayloadKeys cannot be empty")


    plan_targets = [str(item).strip() for item in governance_plan_encoding_policy.get("targetPlanFiles") or []]
    forbidden_fragments = ["\ufffd" if str(item).upper() == "U+FFFD" else str(item) for item in governance_plan_encoding_policy.get("forbiddenFragments") or []]
    required_title_prefix = str(governance_plan_encoding_policy.get("requiredTitlePrefix") or "").strip()
    if not plan_targets or any(not item for item in plan_targets):
        raise SanguoGovernanceError("policy-governance-plan-encoding-repair targetPlanFiles cannot be empty")
    if not forbidden_fragments:
        raise SanguoGovernanceError("policy-governance-plan-encoding-repair forbiddenFragments cannot be empty")
    plan_root = Path(__file__).resolve().parent
    for relative_name in plan_targets:
        if Path(relative_name).name != relative_name:
            raise SanguoGovernanceError(f"policy-governance-plan-encoding-repair target must be filename only: {relative_name}")
        plan_path = plan_root / relative_name
        if not plan_path.exists():
            raise SanguoGovernanceError(f"phase plan missing: {plan_path}")
        data = plan_path.read_bytes()
        if data.startswith(b"\xef\xbb\xbf"):
            raise SanguoGovernanceError(f"phase plan must not contain UTF-8 BOM: {plan_path}")
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise SanguoGovernanceError(f"phase plan is not UTF-8 readable: {plan_path}:{exc.start}") from exc
        for fragment in forbidden_fragments:
            if fragment and fragment in text:
                raise SanguoGovernanceError(f"phase plan contains forbidden fragment {fragment!r}: {plan_path}")
        title = next((line.strip() for line in text.splitlines() if line.startswith("# ")), "")
        if not title:
            raise SanguoGovernanceError(f"phase plan title missing: {plan_path}")
        if required_title_prefix and not title.startswith(f"# {required_title_prefix}"):
            raise SanguoGovernanceError(f"phase plan title prefix mismatch: {plan_path} title={title}")


    schema_registry_entries = governance_schema_registry.get("schemaEntries")
    if not isinstance(schema_registry_entries, list) or not schema_registry_entries:
        raise SanguoGovernanceError("schema-governance-registry schemaEntries cannot be empty")
    registry_ids: set[str] = set()
    registry_sections: set[str] = set()
    allowed_registry_formats = {"json", "jsonl"}
    for entry in schema_registry_entries:
        if not isinstance(entry, dict):
            raise SanguoGovernanceError("schema-governance-registry entries must be objects")
        entry_id = str(entry.get("id") or "").strip()
        section = str(entry.get("section") or "").strip()
        formats = [str(item).strip() for item in entry.get("formats") or []]
        required_fields = [str(item).strip() for item in entry.get("requiredTopLevelFields") or []]
        id_prefixes = [str(item).strip() for item in entry.get("idPrefixes") or []]
        if not entry_id or entry_id in registry_ids:
            raise SanguoGovernanceError(f"schema-governance-registry duplicate or blank entry id: {entry_id}")
        registry_ids.add(entry_id)
        if section not in {"policies", "rules", "catalogs", "schemas"}:
            raise SanguoGovernanceError(f"schema-governance-registry unsupported section: {section}")
        registry_sections.add(section)
        if not formats or any(item not in allowed_registry_formats for item in formats):
            raise SanguoGovernanceError(f"schema-governance-registry invalid formats for {entry_id}: {formats}")
        if not required_fields or any(not item for item in required_fields):
            raise SanguoGovernanceError(f"schema-governance-registry required fields cannot be empty: {entry_id}")
        if "id" not in required_fields:
            raise SanguoGovernanceError(f"schema-governance-registry required fields must include id: {entry_id}")
        if not id_prefixes or any(not item for item in id_prefixes):
            raise SanguoGovernanceError(f"schema-governance-registry id prefixes cannot be empty: {entry_id}")
    missing_registry_sections = sorted({"policies", "rules", "catalogs", "schemas"} - registry_sections)
    if missing_registry_sections:
        raise SanguoGovernanceError(f"schema-governance-registry missing sections: {', '.join(missing_registry_sections)}")

    harness_snapshots = governance_snapshot_policy.get("snapshots")
    if not isinstance(harness_snapshots, list) or not harness_snapshots:
        raise SanguoGovernanceError("policy-governance-harness-snapshots snapshots cannot be empty")
    snapshot_ids: set[str] = set()
    snapshot_compared_key_count = 0
    required_snapshot_keys = {"summary", "sensors", "phaseMatrix", "reportBundle"}
    for row in harness_snapshots:
        if not isinstance(row, dict):
            raise SanguoGovernanceError("policy-governance-harness-snapshots snapshot rows must be objects")
        snapshot_id = str(row.get("id") or "").strip()
        path_text = str(row.get("path") or "").strip()
        compared_keys = [str(item).strip() for item in row.get("comparedPayloadKeys") or []]
        if not snapshot_id or snapshot_id in snapshot_ids:
            raise SanguoGovernanceError(f"policy-governance-harness-snapshots duplicate or blank id: {snapshot_id}")
        snapshot_ids.add(snapshot_id)
        if not path_text.endswith(".json") or not path_text.startswith("fixtures/governance-regression/"):
            raise SanguoGovernanceError(f"policy-governance-harness-snapshots invalid path: {path_text}")
        if set(compared_keys) != required_snapshot_keys:
            raise SanguoGovernanceError(f"policy-governance-harness-snapshots comparedPayloadKeys mismatch: {snapshot_id}")
        snapshot_compared_key_count += len(compared_keys)

    ci_command = str(governance_ci_policy.get("command") or "").strip()
    ci_required_checks = [str(item).strip() for item in governance_ci_policy.get("requiredChecks") or [] if str(item).strip()]
    if not ci_command.endswith("run_sanguo_governance_ci.py"):
        raise SanguoGovernanceError("policy-governance-ci-entrypoint command must end with run_sanguo_governance_ci.py")
    if not str(governance_ci_policy.get("defaultRunProfile") or "").strip():
        raise SanguoGovernanceError("policy-governance-ci-entrypoint defaultRunProfile cannot be empty")
    if not isinstance(governance_ci_policy.get("defaultNoWrite"), bool):
        raise SanguoGovernanceError("policy-governance-ci-entrypoint defaultNoWrite must be boolean")
    if int(governance_ci_policy.get("timeoutSeconds") or 0) <= 0:
        raise SanguoGovernanceError("policy-governance-ci-entrypoint timeoutSeconds must be positive")
    if set(ci_required_checks) != {"validate", "harness", "snapshot"}:
        raise SanguoGovernanceError("policy-governance-ci-entrypoint requiredChecks must be validate/harness/snapshot")

    runbook_path_text = str(governance_runbook_policy.get("runbookPath") or "").strip()
    runbook_required_sections = [
        str(item).strip() for item in governance_runbook_policy.get("requiredSections") or [] if str(item).strip()
    ]
    if not runbook_path_text.endswith(".md"):
        raise SanguoGovernanceError("policy-governance-runbook runbookPath must point to markdown")
    runbook_path = Path(__file__).resolve().parent / runbook_path_text
    if not runbook_path.exists():
        raise SanguoGovernanceError(f"policy-governance-runbook file missing: {runbook_path}")
    runbook_text = runbook_path.read_text(encoding="utf-8-sig")
    for section in runbook_required_sections:
        if f"## {section}" not in runbook_text:
            raise SanguoGovernanceError(f"policy-governance-runbook missing section: {section}")
    if str(governance_runbook_policy.get("consumerIndexSource") or "") != "expected_governance_files":
        raise SanguoGovernanceError("policy-governance-runbook consumerIndexSource must be expected_governance_files")
    runbook_consumer_count = len({row["consumer"] for row in expected_governance_files()})

    residual_allowed_statuses = {
        str(item).strip() for item in residual_hardcode_policy.get("allowedStatuses") or [] if str(item).strip()
    }
    if residual_allowed_statuses != {"done-governed", "intentional-fallback", "postponed"}:
        raise SanguoGovernanceError("policy-residual-hardcode-freeze-audit allowedStatuses mismatch")
    if str(residual_hardcode_policy.get("freezeDecision") or "") != "stop-unbounded-governance-extraction":
        raise SanguoGovernanceError("policy-residual-hardcode-freeze-audit freezeDecision mismatch")
    residual_report_path = Path(__file__).resolve().parent / str(residual_hardcode_policy.get("auditReportPath") or "")
    if not residual_report_path.exists():
        raise SanguoGovernanceError(f"policy-residual-hardcode-freeze-audit report missing: {residual_report_path}")
    residual_items = residual_hardcode_policy.get("auditItems")
    if not isinstance(residual_items, list) or not residual_items:
        raise SanguoGovernanceError("policy-residual-hardcode-freeze-audit auditItems cannot be empty")
    residual_ids: set[str] = set()
    residual_postponed_count = 0
    repo_root = Path(__file__).resolve().parents[4]
    for row in residual_items:
        if not isinstance(row, dict):
            raise SanguoGovernanceError("policy-residual-hardcode-freeze-audit auditItems must be objects")
        row_id = str(row.get("id") or "").strip()
        status = str(row.get("status") or "").strip()
        target_path = str(row.get("targetPath") or "").strip()
        decision = str(row.get("decision") or "").strip()
        if not row_id or row_id in residual_ids:
            raise SanguoGovernanceError(f"policy-residual-hardcode-freeze-audit duplicate or blank id: {row_id}")
        residual_ids.add(row_id)
        if status not in residual_allowed_statuses:
            raise SanguoGovernanceError(f"policy-residual-hardcode-freeze-audit invalid status: {row_id}={status}")
        if status == "postponed":
            residual_postponed_count += 1
        if not target_path or not (repo_root / target_path).exists():
            raise SanguoGovernanceError(f"policy-residual-hardcode-freeze-audit target missing: {row_id} {target_path}")
        if not decision:
            raise SanguoGovernanceError(f"policy-residual-hardcode-freeze-audit decision cannot be empty: {row_id}")

    postgres_migration_steps = postgres_migration_policy.get("migrationSteps")
    if str(postgres_migration_policy.get("decisionMode") or "") != "plan-only":
        raise SanguoGovernanceError("policy-postgres-state-migration-plan decisionMode must be plan-only")
    if postgres_migration_policy.get("enabledByDefault") is not False:
        raise SanguoGovernanceError("policy-postgres-state-migration-plan enabledByDefault must be false")
    trigger_recommendations = [
        str(item).strip() for item in postgres_migration_policy.get("triggerRecommendations") or [] if str(item).strip()
    ]
    allowed_recommendations = {str(item).strip() for item in postgres_state_policy.get("allowedRecommendations") or []}
    if not trigger_recommendations or any(item not in allowed_recommendations for item in trigger_recommendations):
        raise SanguoGovernanceError("policy-postgres-state-migration-plan triggerRecommendations must be allowed evaluation recommendations")
    adapter_layers = [str(item).strip() for item in postgres_migration_policy.get("requiredAdapterLayers") or [] if str(item).strip()]
    if sorted(adapter_layers) != sorted({"stateRepository", "jsonlExportMirror", "migrationBackfill", "rollbackPlan"}):
        raise SanguoGovernanceError("policy-postgres-state-migration-plan requiredAdapterLayers mismatch")
    if not isinstance(postgres_migration_steps, list) or len(postgres_migration_steps) < 4:
        raise SanguoGovernanceError("policy-postgres-state-migration-plan migrationSteps must include at least 4 steps")
    step_ids: set[str] = set()
    for row in postgres_migration_steps:
        if not isinstance(row, dict):
            raise SanguoGovernanceError("policy-postgres-state-migration-plan migrationSteps must be objects")
        step_id = str(row.get("id") or "").strip()
        if not step_id or step_id in step_ids:
            raise SanguoGovernanceError(f"policy-postgres-state-migration-plan duplicate or blank step id: {step_id}")
        step_ids.add(step_id)
        if not str(row.get("name") or "").strip() or not str(row.get("checkpoint") or "").strip():
            raise SanguoGovernanceError(f"policy-postgres-state-migration-plan step name/checkpoint cannot be empty: {step_id}")

    postgres_thresholds = postgres_state_policy.get("recommendationThresholds") if isinstance(postgres_state_policy.get("recommendationThresholds"), dict) else {}
    if not postgres_thresholds or any(float(value) <= 0 for value in postgres_thresholds.values()):
        raise SanguoGovernanceError("policy-postgres-state-store-evaluation recommendationThresholds must be positive")
    postgres_domains = postgres_state_policy.get("stateDomains") if isinstance(postgres_state_policy.get("stateDomains"), list) else []
    if not postgres_domains:
        raise SanguoGovernanceError("policy-postgres-state-store-evaluation stateDomains cannot be empty")
    postgres_recommendations = [str(item).strip() for item in postgres_state_policy.get("allowedRecommendations") or []]
    if sorted(postgres_recommendations) != sorted({"stay-jsonl-manifest", "prepare-postgres-adapter", "migrate-state-store"}):
        raise SanguoGovernanceError("policy-postgres-state-store-evaluation allowedRecommendations must include all decision states")
    vector_provider_policy = vector_ingestion_hardening_policy.get("providerPolicy") if isinstance(vector_ingestion_hardening_policy.get("providerPolicy"), dict) else {}
    allowed_vector_providers = [str(item).strip() for item in vector_provider_policy.get("allowedProviders") or []]
    if not allowed_vector_providers or any(not item for item in allowed_vector_providers):
        raise SanguoGovernanceError("policy-vector-ingestion-hardening providerPolicy.allowedProviders cannot be empty")
    vector_upsert_policy = vector_ingestion_hardening_policy.get("upsertPolicy") if isinstance(vector_ingestion_hardening_policy.get("upsertPolicy"), dict) else {}
    if int(vector_upsert_policy.get("retryCount") or 0) < 0 or float(vector_upsert_policy.get("retryBackoffSeconds") or 0.0) < 0:
        raise SanguoGovernanceError("policy-vector-ingestion-hardening retry settings cannot be negative")
    vector_resume_policy = vector_ingestion_hardening_policy.get("resumePolicy") if isinstance(vector_ingestion_hardening_policy.get("resumePolicy"), dict) else {}
    vector_state_keys = [str(item).strip() for item in vector_resume_policy.get("stateFileRequiredKeys") or []]
    if not vector_state_keys or any(not item for item in vector_state_keys):
        raise SanguoGovernanceError("policy-vector-ingestion-hardening resumePolicy.stateFileRequiredKeys cannot be empty")
    vector_probe_policy = vector_ingestion_hardening_policy.get("probePolicy") if isinstance(vector_ingestion_hardening_policy.get("probePolicy"), dict) else {}
    if int(vector_probe_policy.get("defaultTopK") or 0) <= 0:
        raise SanguoGovernanceError("policy-vector-ingestion-hardening probePolicy.defaultTopK must be positive")

    if "summary" not in (schema.get("requiredTopLevelKeys") or []):
        raise SanguoGovernanceError("schema-stable-bootstrap-payload must require summary")


    scoreboard_default_paths = full_roster_scoreboard.get("defaultPaths")
    if not isinstance(scoreboard_default_paths, dict) or not scoreboard_default_paths:
        raise SanguoGovernanceError("policy-full-roster-scoreboard defaultPaths cannot be empty")
    required_scoreboard_paths = {
        "generals",
        "events",
        "genericCandidates",
        "pilotReport",
        "relationshipEvidence",
        "eventQuestionSeeds",
        "outputRoot",
        "lanePolicyConfig",
    }
    missing_scoreboard_paths = sorted(required_scoreboard_paths - set(scoreboard_default_paths.keys()))
    if missing_scoreboard_paths:
        raise SanguoGovernanceError(f"policy-full-roster-scoreboard missing defaultPaths: {', '.join(missing_scoreboard_paths)}")
    if any(not str(scoreboard_default_paths.get(key) or "").strip() for key in required_scoreboard_paths):
        raise SanguoGovernanceError("policy-full-roster-scoreboard defaultPaths values cannot be blank")
    scoreboard_lane_thresholds = full_roster_scoreboard.get("laneThresholds")
    if not isinstance(scoreboard_lane_thresholds, dict) or not scoreboard_lane_thresholds:
        raise SanguoGovernanceError("policy-full-roster-scoreboard laneThresholds cannot be empty")
    if float(scoreboard_lane_thresholds.get("aRuminationHistoricalMax") or 0.0) <= 0.0:
        raise SanguoGovernanceError("policy-full-roster-scoreboard aRuminationHistoricalMax must be positive")
    if int(scoreboard_lane_thresholds.get("cHumanReviewGenericMin") or 0) <= 0:
        raise SanguoGovernanceError("policy-full-roster-scoreboard cHumanReviewGenericMin must be positive")
    if not isinstance(scoreboard_lane_thresholds.get("femalePriorityCToSkillPreview"), bool):
        raise SanguoGovernanceError("policy-full-roster-scoreboard femalePriorityCToSkillPreview must be boolean")

    scoreboard_scoring = full_roster_scoreboard.get("scoring")
    if not isinstance(scoreboard_scoring, dict) or not scoreboard_scoring:
        raise SanguoGovernanceError("policy-full-roster-scoreboard scoring cannot be empty")
    required_scoreboard_scoring_sections = {
        "historicalTrustScoreWeights",
        "historicalTrustPenaltyWeights",
        "worldbuildingUsabilityWeights",
        "worldbuildingUsabilityLimits",
        "gradeFallbackThresholds",
        "priorityScoreWeights",
    }
    missing_scoreboard_scoring = sorted(required_scoreboard_scoring_sections - set(scoreboard_scoring.keys()))
    if missing_scoreboard_scoring:
        raise SanguoGovernanceError(
            f"policy-full-roster-scoreboard missing scoring sections: {', '.join(missing_scoreboard_scoring)}"
        )
    scoreboard_scoring_weight_count = 0
    for section_name in sorted(required_scoreboard_scoring_sections):
        section = scoreboard_scoring.get(section_name)
        if not isinstance(section, dict) or not section:
            raise SanguoGovernanceError(f"policy-full-roster-scoreboard scoring.{section_name} cannot be empty")
        for key, value in section.items():
            if not isinstance(value, (int, float)):
                raise SanguoGovernanceError(
                    f"policy-full-roster-scoreboard scoring.{section_name}.{key} must be numeric"
                )
            if value < 0:
                raise SanguoGovernanceError(
                    f"policy-full-roster-scoreboard scoring.{section_name}.{key} cannot be negative"
                )
        scoreboard_scoring_weight_count += len(section)
    if float(scoreboard_scoring["gradeFallbackThresholds"].get("bMinHistoricalScore") or 0.0) <= 0.0:
        raise SanguoGovernanceError("policy-full-roster-scoreboard bMinHistoricalScore must be positive")
    if float(scoreboard_scoring["gradeFallbackThresholds"].get("bMinWorldbuildingScore") or 0.0) <= 0.0:
        raise SanguoGovernanceError("policy-full-roster-scoreboard bMinWorldbuildingScore must be positive")
    limits = scoreboard_scoring["worldbuildingUsabilityLimits"]
    if float(limits.get("maxDefault") or 0.0) < float(limits.get("maxWithFemaleBoost") or 0.0):
        raise SanguoGovernanceError("policy-full-roster-scoreboard maxDefault must be >= maxWithFemaleBoost")

    return {
        "fullRosterScoreboardPathDefaultCount": len(scoreboard_default_paths),
        "fullRosterScoreboardLaneThresholdCount": len(scoreboard_lane_thresholds),
        "fullRosterScoreboardScoringSectionCount": len(required_scoreboard_scoring_sections),
        "fullRosterScoreboardScoringWeightCount": scoreboard_scoring_weight_count,
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
        "runtimeReadinessDefaultGeneralCount": len(readiness_general_ids),
        "runtimeReadinessStatusGateCount": len(fail_gates) + len(warn_gates),
        "dialogueMentionCueRuleCount": len(dialogue_mention_cues),
        "dialogueMentionCueEntryCount": dialogue_cue_entry_count,
        "resolutionLoopCueRuleCount": len(resolution_loop_cues),
        "resolutionLoopCueValueCount": resolution_loop_cue_value_count,
        "resolutionLoopRecommendationScoreCount": len(resolution_scoring),
        "threeLaneSchedulerLaneCount": len(three_lane_lanes),
        "threeLaneSchedulerProfileCount": profile_count,
        "threeLaneSchedulerStopReasonCount": stop_reason_count,
        "repairReviewCampaignPathDefaultCount": len(repair_paths),
        "repairReviewCampaignFallbackInputCount": len(repair_inputs),
        "repairReviewCampaignRoundPatternCount": len(repair_patterns),
        "knowledgeGrowthRoundPathDefaultCount": len(knowledge_growth_paths),
        "knowledgeGrowthRoundCohortDefaultCount": len(knowledge_growth_cohort),
        "knowledgeGrowthRoundGateDefaultCount": len(knowledge_growth_gates),
        "threeKwebCheckCueRuleCount": len(three_kweb_check_cues),
        "threeKwebCheckTermKeywordCount": len(three_kweb_keywords),
        "deepseekReasoningPathDefaultCount": len(deepseek_paths),
        "deepseekReasoningPromptLimitCount": len(deepseek_limits),
        "deepseekReasoningSamplingParamCount": len(deepseek_reasoning),
        "relationshipTypeRefinementRuleCount": len(relationship_type_refinement_rules),
        "relationshipTypeRefinementTermCount": relationship_type_refinement_term_count,
        "relationshipEvidenceExtractionRuleCount": len(relationship_evidence_extraction_rules),
        "relationshipEvidenceExtractionCueCount": relationship_evidence_extraction_cue_count,
        "aliasMentionCueRuleCount": len(alias_mention_cues),
        "aliasMentionCueValueCount": alias_cue_value_count,
        "aliasMentionSourceLabelCount": len(alias_policy_labels),
        "externalEvidenceScoreTableValueCount": external_score_value_count,
        "externalEvidenceRawWeightCount": len(external_raw_weights),
        "sourceBrowserCrawlerClassCount": len(crawlable_classes),
        "sourceBrowserFallbackRuleCount": len(fallback_rules),
        "runtimeKeywordCategoryLimitCount": len(category_limits),
        "runtimeKeywordKnownItemCount": len(item_keywords),
        "convergenceResumeManifestKeyCount": len(manifest_keys),
        "convergenceStopReasonCount": len(allowed_stop_reasons),
        "governanceRegressionPhaseCount": len(harness_phases),
        "governanceRegressionSensorCount": len(harness_sensors),
        "governanceRegressionFixtureManifestCount": len(fixture_manifests),
        "governanceValidationRequiredSummaryKeyCount": len(validation_summary_keys),
        "governanceReleaseReadinessRequiredKeyCount": len(release_required_keys),
        "governanceReleaseReadinessSectionCount": len(release_sections),
        "governanceDriftTrackedMetricCount": len(drift_tracked_keys),
        "governanceDriftBaselineMinimumCount": len(drift_baseline_minimums),
        "governanceOperatorSummaryAudienceCount": len(operator_audiences),
        "governanceOperatorSummarySectionCount": len(operator_sections),
        "governanceFailureTriageCategoryCount": len(triage_categories),
        "governanceCompletionLedgerRequiredPhaseCount": ledger_max_phase - ledger_min_phase + 1,
        "governanceCompletionLedgerFieldCount": len(ledger_fields),
        "governanceRunProfileCount": len(run_profiles),
        "governanceRunProfileFlagCount": len(run_profile_flag_names),
        "governanceReportBundleFileCount": len(report_files),
        "governanceReportBundleRequiredPayloadKeyCount": len(required_payload_keys),
        "governancePlanEncodingTargetCount": len(plan_targets),
        "governanceSchemaRegistryEntryCount": len(schema_registry_entries),
        "governanceSchemaRegistryRequiredSectionCount": len(registry_sections),
        "governanceHarnessSnapshotCount": len(harness_snapshots),
        "governanceHarnessSnapshotComparedKeyCount": snapshot_compared_key_count,
        "governanceCiEntrypointRequiredCheckCount": len(ci_required_checks),
        "governanceRunbookSectionCount": len(runbook_required_sections),
        "governanceRunbookConsumerCount": runbook_consumer_count,
        "residualHardcodeAuditItemCount": len(residual_items),
        "residualHardcodePostponedCount": residual_postponed_count,
        "postgresMigrationPlanStepCount": len(postgres_migration_steps),
        "postgresMigrationAdapterLayerCount": len(adapter_layers),
        "postgresStateThresholdCount": len(postgres_thresholds),
        "postgresStateDomainCount": len(postgres_domains),
        "vectorIngestionProviderCount": len(allowed_vector_providers),
        "vectorIngestionStateKeyCount": len(vector_state_keys),
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
