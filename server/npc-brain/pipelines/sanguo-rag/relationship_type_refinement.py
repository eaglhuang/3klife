from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from sanguo_governance_loader import SanguoGovernanceError, load_relationship_type_refinement_rules


COARSE_RELATIONSHIP_TYPES: set[str] = set()
STABLE_RELATIONSHIP_TYPES: set[str] = set()
KINSHIP_RELATIONSHIP_TYPES: set[str] = set()

RELATIONSHIP_TYPE_FAMILIES: dict[str, str] = {}

TYPE_LABELS: dict[str, str] = {}

BETRAYAL_TERMS: list[str] = []
MENTOR_TERMS: list[str] = []
PATRON_TERMS: list[str] = []
ALLIANCE_TERMS: list[str] = []
ENEMY_TERMS: list[str] = []
COMMAND_TERMS: list[str] = []
SPOUSE_TERMS: list[str] = []
PARENT_CHILD_TERMS: list[str] = []
SIBLING_TERMS: list[str] = []
SWORN_SIBLING_TERMS: list[str] = []


_RELATIONSHIP_TYPE_REFINEMENT_RULES_LOADED = False


def _required_rule_value(by_name: dict[str, dict[str, Any]], constant_name: str) -> Any:
    row = by_name.get(constant_name)
    if row is None:
        raise SanguoGovernanceError(f"rule-relationship-type-refinement missing constantName: {constant_name}")
    return row.get("value")


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item)]


def _string_set(value: Any) -> set[str]:
    return set(_string_list(value))


def _string_mapping(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    return {str(key): str(item) for key, item in value.items() if str(key) and str(item)}


def apply_relationship_type_refinement_rules(
    governance_root: str | Path | None = None,
    relationship_type_refinement_rules: str | Path | None = None,
) -> None:
    global _RELATIONSHIP_TYPE_REFINEMENT_RULES_LOADED
    global COARSE_RELATIONSHIP_TYPES, STABLE_RELATIONSHIP_TYPES, KINSHIP_RELATIONSHIP_TYPES
    global RELATIONSHIP_TYPE_FAMILIES, TYPE_LABELS
    global BETRAYAL_TERMS, MENTOR_TERMS, PATRON_TERMS, ALLIANCE_TERMS, ENEMY_TERMS, COMMAND_TERMS
    global SPOUSE_TERMS, PARENT_CHILD_TERMS, SIBLING_TERMS, SWORN_SIBLING_TERMS

    rows = load_relationship_type_refinement_rules(
        governance_root,
        relationship_type_refinement_rules=relationship_type_refinement_rules,
    )
    by_name = {str(row.get("constantName") or ""): row for row in rows}
    COARSE_RELATIONSHIP_TYPES = _string_set(_required_rule_value(by_name, "COARSE_RELATIONSHIP_TYPES"))
    STABLE_RELATIONSHIP_TYPES = _string_set(_required_rule_value(by_name, "STABLE_RELATIONSHIP_TYPES"))
    KINSHIP_RELATIONSHIP_TYPES = _string_set(_required_rule_value(by_name, "KINSHIP_RELATIONSHIP_TYPES"))
    RELATIONSHIP_TYPE_FAMILIES = _string_mapping(_required_rule_value(by_name, "RELATIONSHIP_TYPE_FAMILIES"))
    TYPE_LABELS = _string_mapping(_required_rule_value(by_name, "TYPE_LABELS"))
    BETRAYAL_TERMS = _string_list(_required_rule_value(by_name, "BETRAYAL_TERMS"))
    MENTOR_TERMS = _string_list(_required_rule_value(by_name, "MENTOR_TERMS"))
    PATRON_TERMS = _string_list(_required_rule_value(by_name, "PATRON_TERMS"))
    ALLIANCE_TERMS = _string_list(_required_rule_value(by_name, "ALLIANCE_TERMS"))
    ENEMY_TERMS = _string_list(_required_rule_value(by_name, "ENEMY_TERMS"))
    COMMAND_TERMS = _string_list(_required_rule_value(by_name, "COMMAND_TERMS"))
    SPOUSE_TERMS = _string_list(_required_rule_value(by_name, "SPOUSE_TERMS"))
    PARENT_CHILD_TERMS = _string_list(_required_rule_value(by_name, "PARENT_CHILD_TERMS"))
    SIBLING_TERMS = _string_list(_required_rule_value(by_name, "SIBLING_TERMS"))
    SWORN_SIBLING_TERMS = _string_list(_required_rule_value(by_name, "SWORN_SIBLING_TERMS"))
    _RELATIONSHIP_TYPE_REFINEMENT_RULES_LOADED = True


def ensure_relationship_type_refinement_rules_loaded() -> None:
    if not _RELATIONSHIP_TYPE_REFINEMENT_RULES_LOADED:
        apply_relationship_type_refinement_rules()


def compact_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "").strip())


def edge_text(edge: dict[str, Any], fallback_text: str = "") -> str:
    parts = [
        edge.get("sourceQuote"),
        edge.get("evidenceText"),
        edge.get("summary"),
        fallback_text,
    ]
    return compact_text("".join(str(part or "") for part in parts))


def contains_any(text: str, terms: list[str]) -> bool:
    return any(term in text for term in terms)


def relationship_type_family(relation_type: str) -> str:
    normalized = str(relation_type or "").strip()
    return RELATIONSHIP_TYPE_FAMILIES.get(normalized, "relationship")


def refine_relationship_type(edge: dict[str, Any], fallback_text: str = "") -> tuple[str, list[str]]:
    original_type = str(edge.get("type") or "").strip()
    text = edge_text(edge, fallback_text)
    reasons: list[str] = []

    if original_type in STABLE_RELATIONSHIP_TYPES:
        return original_type, ["stable_relationship_type"]
    if original_type == "allies":
        return "alliance_oath", ["original_allies"]
    if original_type in {"confronts", "killing"}:
        return "enemy_rival", [f"original_{original_type}"]

    if contains_any(text, SWORN_SIBLING_TERMS):
        reasons.append("sworn_sibling_terms")
        return "sworn_sibling", reasons
    if contains_any(text, SPOUSE_TERMS):
        reasons.append("spouse_terms")
        return "spouse", reasons
    if contains_any(text, PARENT_CHILD_TERMS):
        reasons.append("parent_child_terms")
        return "parent_child", reasons
    if contains_any(text, SIBLING_TERMS):
        reasons.append("sibling_terms")
        return "sibling", reasons

    if contains_any(text, BETRAYAL_TERMS):
        reasons.append("betrayal_or_surrender_terms")
        return "betrayal_surrender", reasons
    if contains_any(text, MENTOR_TERMS):
        reasons.append("mentor_or_instruction_terms")
        return "mentor_student", reasons
    if contains_any(text, PATRON_TERMS):
        reasons.append("patronage_or_client_terms")
        return "patron_client", reasons
    if contains_any(text, ALLIANCE_TERMS):
        reasons.append("alliance_or_oath_terms")
        return "alliance_oath", reasons

    if original_type == "commands" or contains_any(text, COMMAND_TERMS):
        reasons.append("command_hierarchy_terms")
        return "ruler_subject", reasons
    if contains_any(text, ENEMY_TERMS):
        reasons.append("enemy_or_rival_terms")
        return "enemy_rival", reasons

    if original_type in COARSE_RELATIONSHIP_TYPES:
        reasons.append("coarse_type_defaulted_to_ruler_subject")
        return "ruler_subject", reasons
    return original_type or "relationship", ["unchanged_relationship_type"]
