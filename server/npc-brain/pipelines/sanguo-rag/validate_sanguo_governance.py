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
    expected_governance_files,
    load_evidence_seed_extraction_policy,
    load_evidence_seed_direction_denoise_rules,
    load_evidence_seed_keyword_cue_rules,
    load_evidence_seed_page_text_cleanup_rules,
    load_evidence_seed_text_normalization_rules,
    load_full_roster_runner_governance,
    load_progress_runner_governance,
    load_relationship_runtime_canon_policy,
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
