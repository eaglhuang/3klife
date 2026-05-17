from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from repo_layout import resolve_npc_brain_root, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
NPC_BRAIN_ROOT = resolve_npc_brain_root(REPO_ROOT)
DEFAULT_GOVERNANCE_ROOT = NPC_BRAIN_ROOT / "data/sanguo"


class SanguoGovernanceError(ValueError):
    pass


def default_governance_root() -> Path:
    return DEFAULT_GOVERNANCE_ROOT


def resolve_governance_root(path_text: str | Path | None) -> Path:
    if path_text is None or not str(path_text).strip():
        return default_governance_root()
    path = Path(path_text)
    if path.is_absolute():
        return path.resolve()
    return (REPO_ROOT / path).resolve()


def _path(root: Path, section: str, filename: str) -> Path:
    return (root / section / filename).resolve()


def read_governance_json(path: Path, *, required_id: str | None = None) -> dict[str, Any]:
    if not path.exists():
        raise SanguoGovernanceError(f"governance JSON not found: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise SanguoGovernanceError(f"governance JSON parse failed: {path}:{exc.lineno}:{exc.colno}") from exc
    if not isinstance(payload, dict):
        raise SanguoGovernanceError(f"governance JSON must be object: {path}")
    row_id = str(payload.get("id") or "").strip()
    if required_id and row_id != required_id:
        raise SanguoGovernanceError(f"governance JSON id mismatch: {path} expected={required_id} actual={row_id}")
    return payload


def read_governance_jsonl(path: Path, *, required_fields: tuple[str, ...] = ("id",)) -> list[dict[str, Any]]:
    if not path.exists():
        raise SanguoGovernanceError(f"governance JSONL not found: {path}")
    rows: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_no, line in enumerate(handle, 1):
            text = line.strip()
            if not text:
                continue
            try:
                value = json.loads(text)
            except json.JSONDecodeError as exc:
                raise SanguoGovernanceError(f"governance JSONL parse failed: {path}:{line_no}:{exc.colno}") from exc
            if not isinstance(value, dict):
                raise SanguoGovernanceError(f"governance JSONL row must be object: {path}:{line_no}")
            row_id = str(value.get("id") or "").strip()
            if "id" in required_fields:
                if not row_id:
                    raise SanguoGovernanceError(f"governance JSONL missing id: {path}:{line_no}")
                if row_id in seen_ids:
                    raise SanguoGovernanceError(f"governance JSONL duplicate id: {path}:{line_no} id={row_id}")
                seen_ids.add(row_id)
            for field in required_fields:
                if field == "id":
                    continue
                if field not in value:
                    raise SanguoGovernanceError(f"governance JSONL missing field: {path}:{line_no} id={row_id} field={field}")
            rows.append(value)
    return rows


def rows_without_id(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{key: value for key, value in row.items() if key != "id"} for row in rows]


def load_stable_bootstrap_governance(root: str | Path | None = None) -> dict[str, Any]:
    base = resolve_governance_root(root)
    policy = read_governance_json(_path(base, "policies", "policy-stable-bootstrap.json"), required_id="Policy_StableBootstrap_P0")
    return {
        "root": base,
        "policy": policy,
        "hardRelationshipSpecs": rows_without_id(
            read_governance_jsonl(_path(base, "catalogs", "catalog-hard-relationship-specs.jsonl"), required_fields=("id", "type"))
        ),
        "factionTimelineSpecs": rows_without_id(
            read_governance_jsonl(_path(base, "catalogs", "catalog-faction-timeline-specs.jsonl"), required_fields=("id", "name", "intervals"))
        ),
        "eventLocationSeeds": rows_without_id(
            read_governance_jsonl(_path(base, "catalogs", "catalog-event-location-seeds.jsonl"), required_fields=("id", "eventTag"))
        ),
        "socialRoleSeeds": rows_without_id(
            read_governance_jsonl(_path(base, "catalogs", "catalog-social-role-seeds.jsonl"), required_fields=("id", "name"))
        ),
        "timeScopedAliasHints": rows_without_id(
            read_governance_jsonl(_path(base, "catalogs", "catalog-time-scoped-alias-hints.jsonl"), required_fields=("id", "alias"))
        ),
        "knownFemaleNames": [
            str(row["name"])
            for row in read_governance_jsonl(_path(base, "catalogs", "catalog-known-female-names.jsonl"), required_fields=("id", "name"))
        ],
        "commonRelationLabels": [
            str(row["label"])
            for row in read_governance_jsonl(_path(base, "catalogs", "catalog-common-relation-labels.jsonl"), required_fields=("id", "label"))
        ],
        "femaleProfileOverrides": {
            str(row["name"]): {key: value for key, value in row.items() if key not in {"id", "name"}}
            for row in read_governance_jsonl(_path(base, "catalogs", "catalog-female-profile-overrides.jsonl"), required_fields=("id", "name"))
        },
        "basicProfileCueRules": read_governance_json(
            _path(base, "rules", "rule-basic-profile-cues.json"), required_id="Rule_BasicProfileCues_P0"
        ),
    }


def load_full_roster_runner_governance(
    root: str | Path | None = None,
    *,
    runner_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = Path(runner_policy).resolve() if runner_policy else _path(base, "policies", "policy-full-roster-runner.json")
    return read_governance_json(path, required_id="Policy_FullRosterRunner_P0")


def load_progress_runner_governance(
    root: str | Path | None = None,
    *,
    runner_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    policy_path = Path(runner_policy).resolve() if runner_policy else _path(base, "policies", "policy-progress-advancement-runner.json")
    location_rule_path = _path(base, "rules", "rule-location-extraction.json")
    return {
        "policy": read_governance_json(policy_path, required_id="Policy_ProgressAdvancementRunner_P0"),
        "locationRule": read_governance_json(location_rule_path, required_id="Rule_LocationExtraction_P0"),
    }


def load_relationship_runtime_canon_policy(
    root: str | Path | None = None,
    *,
    relationship_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = Path(relationship_policy).resolve() if relationship_policy else _path(base, "policies", "policy-relationship-runtime-canon.json")
    return read_governance_json(path, required_id="Policy_RelationshipRuntimeCanon_P1")


def load_source_event_packet_policy(
    root: str | Path | None = None,
    *,
    source_event_packet_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = (
        Path(source_event_packet_policy).resolve()
        if source_event_packet_policy
        else _path(base, "policies", "policy-source-event-packets.json")
    )
    return read_governance_json(path, required_id="Policy_SourceEventPackets_P1")


def load_evidence_seed_extraction_policy(
    root: str | Path | None = None,
    *,
    evidence_seed_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = (
        Path(evidence_seed_policy).resolve()
        if evidence_seed_policy
        else _path(base, "policies", "policy-evidence-seed-extraction.json")
    )
    return read_governance_json(path, required_id="Policy_EvidenceSeedExtraction_P1")


def load_evidence_seed_keyword_cue_rules(
    root: str | Path | None = None,
    *,
    keyword_cue_rules: str | Path | None = None,
) -> list[dict[str, Any]]:
    base = resolve_governance_root(root)
    path = (
        Path(keyword_cue_rules).resolve()
        if keyword_cue_rules
        else _path(base, "rules", "rule-evidence-seed-keyword-cues.jsonl")
    )
    return read_governance_jsonl(path, required_fields=("id", "extractor", "constantName", "angleType", "keywords"))


def load_evidence_seed_direction_denoise_rules(
    root: str | Path | None = None,
    *,
    relationship_direction_denoise_rules: str | Path | None = None,
) -> list[dict[str, Any]]:
    base = resolve_governance_root(root)
    path = (
        Path(relationship_direction_denoise_rules).resolve()
        if relationship_direction_denoise_rules
        else _path(base, "rules", "rule-relationship-direction-denoise.jsonl")
    )
    return read_governance_jsonl(
        path,
        required_fields=("id", "extractor", "constantName", "kind", "value"),
    )


def load_evidence_seed_text_normalization_rules(
    root: str | Path | None = None,
    *,
    text_normalization_rules: str | Path | None = None,
) -> list[dict[str, Any]]:
    base = resolve_governance_root(root)
    path = (
        Path(text_normalization_rules).resolve()
        if text_normalization_rules
        else _path(base, "rules", "rule-text-normalization-replacements.jsonl")
    )
    return read_governance_jsonl(
        path,
        required_fields=("id", "extractor", "constantName", "kind", "value"),
    )


def load_evidence_seed_page_text_cleanup_rules(
    root: str | Path | None = None,
    *,
    page_text_cleanup_rules: str | Path | None = None,
) -> list[dict[str, Any]]:
    base = resolve_governance_root(root)
    path = (
        Path(page_text_cleanup_rules).resolve()
        if page_text_cleanup_rules
        else _path(base, "rules", "rule-page-text-cleanup.jsonl")
    )
    return read_governance_jsonl(
        path,
        required_fields=("id", "extractor", "constantName", "kind", "value"),
    )


def load_knowledge_completion_policy(
    root: str | Path | None = None,
    *,
    knowledge_completion_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = (
        Path(knowledge_completion_policy).resolve()
        if knowledge_completion_policy
        else _path(base, "policies", "policy-knowledge-completion-scoring.json")
    )
    return read_governance_json(path, required_id="Policy_KnowledgeCompletionScoring_P2")


def load_core_person_completion_policy(
    root: str | Path | None = None,
    *,
    core_person_completion_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = (
        Path(core_person_completion_policy).resolve()
        if core_person_completion_policy
        else _path(base, "policies", "policy-core-person-completion-scoring.json")
    )
    return read_governance_json(path, required_id="Policy_CorePersonCompletionScoring_P2")



def load_event_candidate_extraction_policy(
    root: str | Path | None = None,
    *,
    event_candidate_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = (
        Path(event_candidate_policy).resolve()
        if event_candidate_policy
        else _path(base, "policies", "policy-event-candidate-extraction.json")
    )
    return read_governance_json(path, required_id="Policy_EventCandidateExtraction_P1")


def load_event_candidate_cue_rules(
    root: str | Path | None = None,
    *,
    event_candidate_cue_rules: str | Path | None = None,
) -> list[dict[str, Any]]:
    base = resolve_governance_root(root)
    path = (
        Path(event_candidate_cue_rules).resolve()
        if event_candidate_cue_rules
        else _path(base, "rules", "rule-event-candidate-cues.jsonl")
    )
    return read_governance_jsonl(path, required_fields=("id", "extractor", "constantName", "kind"))


def load_event_question_seed_bank_policy(
    root: str | Path | None = None,
    *,
    event_question_seed_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = (
        Path(event_question_seed_policy).resolve()
        if event_question_seed_policy
        else _path(base, "policies", "policy-event-question-seed-bank.json")
    )
    return read_governance_json(path, required_id="Policy_EventQuestionSeedBank_P1")


def load_event_question_angle_cue_rules(
    root: str | Path | None = None,
    *,
    event_question_angle_cue_rules: str | Path | None = None,
) -> list[dict[str, Any]]:
    base = resolve_governance_root(root)
    path = (
        Path(event_question_angle_cue_rules).resolve()
        if event_question_angle_cue_rules
        else _path(base, "rules", "rule-event-question-angle-cues.jsonl")
    )
    return read_governance_jsonl(path, required_fields=("id", "extractor", "angleFamily", "terms"))



def load_external_source_benchmark_policy(
    root: str | Path | None = None,
    *,
    external_source_benchmark_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = (
        Path(external_source_benchmark_policy).resolve()
        if external_source_benchmark_policy
        else _path(base, "policies", "policy-external-source-benchmark.json")
    )
    return read_governance_json(path, required_id="Policy_ExternalSourceBenchmark_P1")


def load_external_source_benchmark_cue_rules(
    root: str | Path | None = None,
    *,
    external_source_benchmark_cue_rules: str | Path | None = None,
) -> list[dict[str, Any]]:
    base = resolve_governance_root(root)
    path = (
        Path(external_source_benchmark_cue_rules).resolve()
        if external_source_benchmark_cue_rules
        else _path(base, "rules", "rule-external-source-benchmark-cues.jsonl")
    )
    return read_governance_jsonl(path, required_fields=("id", "consumer", "constantName", "kind"))



def load_event_review_context_policy(
    root: str | Path | None = None,
    *,
    event_review_context_policy: str | Path | None = None,
) -> dict[str, Any]:
    base = resolve_governance_root(root)
    path = (
        Path(event_review_context_policy).resolve()
        if event_review_context_policy
        else _path(base, "policies", "policy-event-review-context.json")
    )
    return read_governance_json(path, required_id="Policy_EventReviewContext_P1")


def load_event_review_context_cue_rules(
    root: str | Path | None = None,
    *,
    event_review_context_cue_rules: str | Path | None = None,
) -> list[dict[str, Any]]:
    base = resolve_governance_root(root)
    path = (
        Path(event_review_context_cue_rules).resolve()
        if event_review_context_cue_rules
        else _path(base, "rules", "rule-event-review-context-cues.jsonl")
    )
    return read_governance_jsonl(path, required_fields=("id", "consumer", "constantName", "kind", "value"))


def expected_governance_files() -> list[dict[str, str]]:
    return [
        {"section": "catalogs", "file": "catalog-hard-relationship-specs.jsonl", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "catalogs", "file": "catalog-faction-timeline-specs.jsonl", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "catalogs", "file": "catalog-event-location-seeds.jsonl", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "catalogs", "file": "catalog-social-role-seeds.jsonl", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "catalogs", "file": "catalog-time-scoped-alias-hints.jsonl", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "catalogs", "file": "catalog-known-female-names.jsonl", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "catalogs", "file": "catalog-common-relation-labels.jsonl", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "catalogs", "file": "catalog-female-profile-overrides.jsonl", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "policies", "file": "policy-stable-bootstrap.json", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "policies", "file": "policy-full-roster-runner.json", "consumer": "run_full_roster_convergence_loop.py"},
        {"section": "policies", "file": "policy-progress-advancement-runner.json", "consumer": "run_progress_advancement_loop.py"},
        {"section": "policies", "file": "policy-relationship-runtime-canon.json", "consumer": "relationship runtime canon consumers"},
        {"section": "policies", "file": "policy-source-event-packets.json", "consumer": "build_source_event_packets.py"},
        {"section": "policies", "file": "policy-evidence-seed-extraction.json", "consumer": "extract_*_evidence_seeds.py"},
        {"section": "policies", "file": "policy-knowledge-completion-scoring.json", "consumer": "estimate_knowledge_completion.py"},
        {"section": "policies", "file": "policy-core-person-completion-scoring.json", "consumer": "estimate_core_person_completion.py"},
        {"section": "policies", "file": "policy-event-candidate-extraction.json", "consumer": "extract_event_candidates.py"},
        {"section": "policies", "file": "policy-event-question-seed-bank.json", "consumer": "build_event_question_seed_bank.py"},
        {"section": "policies", "file": "policy-external-source-benchmark.json", "consumer": "benchmark_external_source.py"},
        {"section": "policies", "file": "policy-event-review-context.json", "consumer": "enrich_event_review_context.py"},
        {"section": "rules", "file": "rule-basic-profile-cues.json", "consumer": "build_stable_knowledge_bootstrap.py"},
        {"section": "rules", "file": "rule-location-extraction.json", "consumer": "run_progress_advancement_loop.py"},
        {"section": "rules", "file": "rule-evidence-seed-keyword-cues.jsonl", "consumer": "extract_*_evidence_seeds.py"},
        {"section": "rules", "file": "rule-relationship-direction-denoise.jsonl", "consumer": "extract_generic_passage_evidence_seeds.py"},
        {"section": "rules", "file": "rule-text-normalization-replacements.jsonl", "consumer": "extract_harvested_page_evidence_seeds.py"},
        {"section": "rules", "file": "rule-page-text-cleanup.jsonl", "consumer": "extract_*_evidence_seeds.py"},
        {"section": "rules", "file": "rule-event-candidate-cues.jsonl", "consumer": "extract_event_candidates.py"},
        {"section": "rules", "file": "rule-event-question-angle-cues.jsonl", "consumer": "build_event_question_seed_bank.py"},
        {"section": "rules", "file": "rule-external-source-benchmark-cues.jsonl", "consumer": "benchmark_external_source.py"},
        {"section": "rules", "file": "rule-event-review-context-cues.jsonl", "consumer": "enrich_event_review_context.py"},
        {"section": "schemas", "file": "schema-stable-bootstrap-payload.json", "consumer": "validate_sanguo_governance.py"},
        {"section": "schemas", "file": "schema-governance-bundle.json", "consumer": "validate_sanguo_governance.py"},
    ]
