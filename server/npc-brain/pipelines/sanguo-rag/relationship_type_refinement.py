from __future__ import annotations

import re
from typing import Any


COARSE_RELATIONSHIP_TYPES = {"commands", "allies", "confronts", "killing"}
STABLE_RELATIONSHIP_TYPES = {"spouse", "parent_child", "sibling", "sworn_sibling", "protects"}
KINSHIP_RELATIONSHIP_TYPES = {"spouse", "parent_child", "sibling", "sworn_sibling"}

RELATIONSHIP_TYPE_FAMILIES = {
    "spouse": "kinship",
    "parent_child": "kinship",
    "sibling": "kinship",
    "sworn_sibling": "kinship",
    "protects": "support",
    "ruler_subject": "authority",
    "patron_client": "authority",
    "mentor_student": "instruction",
    "betrayal_surrender": "conflict",
    "enemy_rival": "conflict",
    "alliance_oath": "oath",
}

TYPE_LABELS = {
    "spouse": "夫妻婚配",
    "parent_child": "親子關係",
    "sibling": "手足關係",
    "sworn_sibling": "結義兄弟",
    "ruler_subject": "君臣關係",
    "patron_client": "庇護依附",
    "mentor_student": "師徒傳授",
    "betrayal_surrender": "背叛投降",
    "enemy_rival": "敵對競爭",
    "alliance_oath": "盟約結盟",
}

BETRAYAL_TERMS = [
    "背叛",
    "反叛",
    "叛",
    "降",
    "投降",
    "歸降",
    "歸附",
    "叛離",
    "離去",
    "棄",
    "賣",
]
MENTOR_TERMS = [
    "師",
    "授",
    "教",
    "傳授",
    "受業",
    "學藝",
    "求教",
    "門生",
    "弟子",
    "拜師",
]
PATRON_TERMS = [
    "庇護",
    "依附",
    "投靠",
    "歸附",
    "門客",
    "賓客",
    "屬下",
    "部曲",
    "附屬",
    "收留",
    "部屬",
]
ALLIANCE_TERMS = [
    "結盟",
    "盟約",
    "同盟",
    "盟誓",
    "會盟",
    "盟友",
    "盟",
    "聯盟",
    "誓盟",
]
ENEMY_TERMS = [
    "仇",
    "敵",
    "怨",
    "冤家",
    "對立",
    "對峙",
    "相攻",
    "交戰",
    "攻伐",
    "征討",
    "討伐",
    "相鬥",
]
COMMAND_TERMS = [
    "命",
    "令",
    "統領",
    "率",
    "領",
    "奉命",
    "受命",
]
SPOUSE_TERMS = [
    "婚配",
    "夫妻",
    "夫婦",
    "配偶",
    "成婚",
    "結婚",
    "聯姻",
    "妻子",
    "丈夫",
    "夫人",
    "嫁娶",
]
PARENT_CHILD_TERMS = [
    "親子",
    "父子",
    "母子",
    "父女",
    "母女",
    "子女",
    "兒子",
    "女兒",
    "養子",
    "養女",
    "繼子",
    "繼女",
    "嗣子",
    "嫡子",
    "庶子",
]
SIBLING_TERMS = [
    "兄弟",
    "姐妹",
    "兄妹",
    "姊妹",
    "手足",
    "兄長",
    "弟弟",
    "姊姊",
    "姐姐",
    "妹妹",
]
SWORN_SIBLING_TERMS = [
    "結義",
    "結拜",
    "桃園",
    "義兄",
    "義弟",
    "義姐",
    "義妹",
    "義兄弟",
    "義姐妹",
]


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
