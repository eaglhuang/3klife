from __future__ import annotations

import re
from typing import Any


COARSE_RELATIONSHIP_TYPES = {"commands", "allies", "confronts", "killing"}
STABLE_RELATIONSHIP_TYPES = {"spouse", "parent_child", "sibling", "sworn_sibling", "protects"}

TYPE_LABELS = {
    "ruler_subject": "君臣主從",
    "patron_client": "提攜投靠",
    "mentor_student": "師友教導",
    "betrayal_surrender": "背叛投降",
    "enemy_rival": "敵對競爭",
    "alliance_oath": "盟約同盟",
}

BETRAYAL_TERMS = ["請降", "歸降", "投降", "降", "叛", "反", "背", "縛", "擒", "獻城", "謀害", "相害"]
MENTOR_TERMS = ["指教", "問計", "獻計", "授", "教", "師", "先生", "門生", "弟子", "學"]
PATRON_TERMS = ["薦", "舉", "拜", "封", "賜", "收留", "投", "依", "歸", "納", "聘", "請"]
ALLIANCE_TERMS = ["結盟", "同盟", "會盟", "歃血", "盟", "誓", "合兵", "共破", "同救", "共守", "同往", "同入"]
ENEMY_TERMS = ["交鋒", "廝殺", "交戰", "大戰", "直取", "截住", "追趕", "追襲", "殺敗", "攻打", "迎敵", "敵", "攻", "戰", "殺", "斬", "追", "敗", "仇", "害"]
COMMAND_TERMS = ["令", "命", "使", "遣", "差", "教", "撥"]


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