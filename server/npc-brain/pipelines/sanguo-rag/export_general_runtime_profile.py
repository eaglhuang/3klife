from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
DEFAULT_EVENT_QUESTION_SEEDS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/event-question-seeds/event-question-seeds.jsonl")
DEFAULT_SOURCE_EVENT_PACKETS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/source-event-packets/source-event-packets.jsonl")
DEFAULT_STAGED_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/core-guanyu-boost-r1-staged-ready-events.jsonl")
DEFAULT_STAGED_RELATIONSHIPS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/core-guanyu-boost-r1-staged-relationship-evidence.jsonl")
DEFAULT_CORE_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/core-guanyu-boost-r1-after.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/runtime-general-profiles")
DEFAULT_GENERAL_ID = "guan-yu"

TYPE_LABELS = {
    "sworn_sibling": "結義兄弟",
    "protects_family": "守護家眷",
    "intimidates_enemy": "戰場威懾",
    "battlefield_opponent": "戰場對手",
    "battle_ally": "戰場同袍",
    "strategy_pressure": "策略牽制",
    "loyal_oath": "忠義盟約",
    "battlefield_contact": "戰場接觸",
    "ruler_subject": "君臣主從",
    "patron_client": "提攜投靠",
    "mentor_student": "師友教導",
    "betrayal_surrender": "背叛投降",
    "enemy_rival": "敵對競爭",
    "alliance_oath": "盟約同盟",
}
BOOTSTRAP_EVENT_LABELS = {
    "sworn_sibling": "結義兄弟",
    "spouse": "夫妻",
    "parent_child": "親子",
    "battle_ally": "戰場同袍",
    "battlefield_opponent": "戰場對手",
    "enemy_rival": "敵對競爭",
    "patron_client": "提攜投靠",
    "mentor_student": "師友教導",
    "ruler_subject": "君臣主從",
    "betrayal_surrender": "背叛投降",
    "alliance_oath": "盟約同盟",
}
TAG_LABELS = {
    "martial": "武勇",
    "family-bound": "重家族與結義",
    "direct_force": "直接用武",
    "commanding": "統率威嚴",
    "persuasive": "能言勸說",
    "opportunistic": "臨機應變",
    "friendship_loyalty": "忠義友情",
    "family_affection": "家族情感",
    "mercy_compassion": "仁義憐憫",
    "martial_weapon": "武器戰鬥",
    "command_strategy": "軍事統率",
    "diplomacy_speech": "外交言辭",
    "opportunistic_survival": "危局求生",
    "appoint_office": "任官受封",
    "host_banquet": "宴飲社交",
    "family_duty": "家族責任",
    "recruitment_visit": "拜訪招攬",
    "prefers_battle": "偏好戰鬥",
    "prefers_diplomacy": "偏好外交",
    "prefers_risk": "願承風險",
    "chooses_frontline_action": "親赴前線",
    "chooses_deployment_or_drill": "部署操練",
    "chooses_negotiation_or_recruitment": "談判招募",
    "chooses_gamble_or_escape": "冒險突圍",
}
ITEM_TERMS = {
    "寶刀": ("treasured-saber", "寶刀"),
    "青龍寶刀": ("green-dragon-blade", "青龍刀"),
    "青龍刀": ("green-dragon-blade", "青龍刀"),
    "青龍偃月刀": ("green-dragon-blade", "青龍刀"),
    "赤兔": ("red-hare", "赤兔馬"),
    "赤兔馬": ("red-hare", "赤兔馬"),
    "鸚鵡戰袍": ("parrot-battle-robe", "鸚鵡戰袍"),
    "戰袍": ("battle-robe", "戰袍"),
}
GRAPH_RELATIONSHIP_TYPES = {
    "ruler_subject",
    "patron_client",
    "mentor_student",
    "betrayal_surrender",
    "enemy_rival",
    "alliance_oath",
}
SEMANTIC_RELATIONSHIP_TYPES = GRAPH_RELATIONSHIP_TYPES | {
    "battlefield_contact",
    "political_contact",
    "battlefield_opponent",
    "intimidates_enemy",
    "protects_family",
    "strategy_pressure",
    "battle_ally",
    "loyal_oath",
}
STABLE_RELATIONSHIP_SOURCE_LAYER = "stable-bootstrap-seed"
STABLE_RELATIONSHIP_SOURCE_LAYERS = {
    STABLE_RELATIONSHIP_SOURCE_LAYER,
    "generals-parent-summary",
    "claim-graph-a-history",
}
A_HISTORY_RELATIONSHIP_GRADES = {"A-history", "A-history-cross-source"}
RULER_SUBJECT_AUTHORITY_TERMS = (
    "麾下",
    "效忠",
    "親信",
    "亲信",
    "侍衛",
    "侍卫",
    "部下",
    "部將",
    "部将",
    "主公",
    "臣",
    "君",
)
VOICE_PRESETS = {
    "cao-cao": {
        "voiceStyle": ["雄猜", "果決", "權謀", "冷靜", "帶詩性"],
        "safeFallbackLine": "孤用人用兵，皆要看真憑實據；無證之事，不可妄斷。",
        "taboos": ["不可自稱關某", "不可寫成莽撞武夫", "不可新增無 evidence 的重大史實"],
    },
    "guan-yu": {
        "voiceStyle": ["沉穩", "重義", "威嚴", "少言", "不輕浮"],
        "safeFallbackLine": "關某行事，但求義字當先，不負故人。",
        "taboos": ["不可輕浮", "不可失義", "不可口吻粗俗", "不可新增無 evidence 的重大史實"],
    },
    "liu-bei": {
        "voiceStyle": ["仁厚", "克制", "重情義", "憂民", "善納諫"],
        "safeFallbackLine": "備不敢妄言功過，只願先守住人心與故義。",
        "taboos": ["不可自稱關某", "不可冷酷殘暴", "不可新增無 evidence 的重大史實"],
    },
    "lu-bu": {
        "voiceStyle": ["驍勇", "自負", "直接", "好勝", "不受拘束"],
        "safeFallbackLine": "奉先一身武勇，不憑空說大話；要論勝負，且看實證。",
        "taboos": ["不可自稱關某", "不可過度謙卑", "不可新增無 evidence 的重大史實"],
    },
    "sun-quan": {
        "voiceStyle": ["審勢", "江東氣度", "年少主君", "務實", "穩住人心"],
        "safeFallbackLine": "權守江東，凡事須看形勢與人心，不可憑空決斷。",
        "taboos": ["不可自稱關某", "不可莽撞求戰", "不可新增無 evidence 的重大史實"],
    },
    "wei-yan": {
        "voiceStyle": ["桀驁", "勇悍", "求戰", "不甘居後", "直言"],
        "safeFallbackLine": "魏延願當前鋒，但無憑之事，俺也不拿來亂說。",
        "taboos": ["不可自稱關某", "不可寫成軟弱畏戰", "不可新增無 evidence 的重大史實"],
    },
    "yuan-shao": {
        "voiceStyle": ["名門自重", "審慎", "重聲望", "好議事", "帶矜持"],
        "safeFallbackLine": "本初出言須合名分與證據，不可因一時傳聞失了分寸。",
        "taboos": ["不可自稱關某", "不可粗鄙莽撞", "不可新增無 evidence 的重大史實"],
    },
    "zhang-fei": {
        "voiceStyle": ["豪烈", "直率", "重義", "戰場威壓", "不拖泥帶水"],
        "safeFallbackLine": "俺張飛說話直，沒憑沒據的事不亂講；要緊的是先護住自家兄弟。",
        "taboos": ["不可自稱關某", "不可文弱迂緩", "不可新增無 evidence 的重大史實"],
    },
    "zhao-yun": {
        "voiceStyle": ["忠勇", "沉穩", "克己", "護主", "清正"],
        "safeFallbackLine": "雲只願守住本分與主命；無憑的話，不該輕出口。",
        "taboos": ["不可自稱關某", "不可輕浮自誇", "不可新增無 evidence 的重大史實"],
    },
    "zhuge-liang": {
        "voiceStyle": ["清雅", "謹慎", "謀略", "冷靜", "善觀大勢"],
        "safeFallbackLine": "亮觀事須憑脈絡與證據；若資料不足，寧可暫緩其論。",
        "taboos": ["不可自稱關某", "不可莽撞斷言", "不可新增無 evidence 的重大史實"],
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export runtime persona, keyword, and relationship JSON for a Sanguo general.")
    parser.add_argument("--general-id", default=DEFAULT_GENERAL_ID)
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH))
    parser.add_argument("--event-question-seeds", default=str(DEFAULT_EVENT_QUESTION_SEEDS_PATH))
    parser.add_argument("--source-event-packets", default=str(DEFAULT_SOURCE_EVENT_PACKETS_PATH))
    parser.add_argument("--events", default=str(DEFAULT_STAGED_EVENTS_PATH))
    parser.add_argument("--relationship-evidence", default=str(DEFAULT_STAGED_RELATIONSHIPS_PATH))
    parser.add_argument("--core-report", default=str(DEFAULT_CORE_REPORT_PATH))
    parser.add_argument("--review-answers", action="append", default=[])
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def voice_preset(general_id: str, display_name: str) -> dict[str, Any]:
    preset = VOICE_PRESETS.get(general_id)
    if preset:
        return preset
    return {
        "voiceStyle": ["克制", "重證據", "符合身份", "不妄言"],
        "safeFallbackLine": f"{display_name}仍須有憑有據，不可妄言。",
        "taboos": ["不可借用他人自稱", "不可新增無 evidence 的重大史實"],
    }


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def unique(values: list[Any]) -> list[Any]:
    result = []
    seen = set()
    for value in values:
        if value is None:
            continue
        key = json.dumps(value, ensure_ascii=False, sort_keys=True) if isinstance(value, (dict, list)) else str(value)
        if key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def slug(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    if cleaned:
        return cleaned
    return "u" + "-".join(f"{ord(char):x}" for char in value)[:80]


def short_label(value: str, limit: int = 12) -> str:
    cleaned = re.sub(r"\s+", "", str(value or "").strip())
    return cleaned if len(cleaned) <= limit else cleaned[: max(1, limit - 1)] + "..."


def event_label(summary: str) -> tuple[str, str]:
    cleaned_summary = str(summary or "event").strip()
    if "stableKnowledgeBootstrap:" in cleaned_summary:
        bootstrap_code = cleaned_summary.split("stableKnowledgeBootstrap:", 1)[1].split(":", 1)[0].strip()
        return BOOTSTRAP_EVENT_LABELS.get(bootstrap_code, bootstrap_code or "事件"), cleaned_summary
    label_source = cleaned_summary.split("：")[-1] if "：" in cleaned_summary else cleaned_summary
    return short_label(label_source, 10), cleaned_summary


def stable_indexes(stable: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    identities = {str(row.get("generalId")): row for row in stable.get("identitySeeds") or []}
    profiles = {str(row.get("generalId")): row for row in stable.get("basicProfileSeeds") or []}
    return identities, profiles


def name_for(general_id: str, identities: dict[str, dict[str, Any]]) -> str:
    return str((identities.get(general_id) or {}).get("name") or general_id)


def identity_aliases(general_id: str, identity: dict[str, Any]) -> list[str]:
    values = [identity.get("name"), *(identity.get("aliases") or [])]
    aliases: list[str] = []
    is_female = str(identity.get("gender") or "").strip().lower() in {"female", "f", "woman", "女", "女性"}
    for value in values:
        cleaned = re.sub(r"\s+", "", str(value or "").strip())
        if len(cleaned) < 2:
            continue
        aliases.append(cleaned)
        if cleaned.endswith("氏") and len(cleaned) >= 2:
            aliases.append(f"{cleaned[:-1]}夫人")
        if cleaned.endswith("夫人") and len(cleaned) >= 3:
            aliases.append(f"{cleaned[:-2]}氏")
        if is_female:
            surname = cleaned[:1]
            if surname:
                aliases.extend([f"{surname}夫人", f"{surname}氏"])
    return unique(aliases)


def build_alias_index(identities: dict[str, dict[str, Any]]) -> dict[str, list[str]]:
    return {general_id: identity_aliases(general_id, identity) for general_id, identity in identities.items()}


def text_mentioned_general_ids(text: str, alias_index: dict[str, list[str]], general_id: str) -> list[str]:
    compact = re.sub(r"\s+", "", str(text or ""))
    if not compact:
        return []
    hits: list[str] = []
    for target_id, aliases in alias_index.items():
        if target_id == general_id:
            continue
        if any(alias and alias in compact for alias in aliases):
            hits.append(target_id)
    return sorted(set(hits))


def text_mentions_general(text: str, general_id: str, alias_index: dict[str, list[str]]) -> bool:
    compact = re.sub(r"\s+", "", str(text or ""))
    if not compact:
        return False
    return any(alias and alias in compact for alias in alias_index.get(general_id, []))


def edge_compact_text(edge: dict[str, Any]) -> str:
    return re.sub(
        r"\s+",
        "",
        " ".join(
            str(value)
            for value in [
                edge.get("sourceQuote"),
                edge.get("evidenceText"),
                edge.get("summary"),
                *list(edge.get("sourceQuotes") or []),
            ]
            if value
        ),
    )


def is_stable_relationship_edge(edge: dict[str, Any]) -> bool:
    source_layer = str(edge.get("sourceLayer") or "").strip()
    return source_layer in STABLE_RELATIONSHIP_SOURCE_LAYERS or str(edge.get("claimGrade") or "") in A_HISTORY_RELATIONSHIP_GRADES


def edge_has_authority_baseline_terms(edge: dict[str, Any]) -> bool:
    text = edge_compact_text(edge)
    return any(term in text for term in RULER_SUBJECT_AUTHORITY_TERMS)


def edge_has_direct_pair_signal(
    edge: dict[str, Any],
    general_id: str,
    target_id: str,
    alias_index: dict[str, list[str]],
) -> bool:
    text = edge_compact_text(edge)
    return text_mentions_general(text, general_id, alias_index) and text_mentions_general(text, target_id, alias_index)


def stable_relationship_edges_for_general(stable: dict[str, Any], general_id: str) -> list[dict[str, Any]]:
    edges: list[dict[str, Any]] = []
    for edge in stable.get("relationshipEdges") or []:
        from_id = str(edge.get("fromId") or "").strip()
        to_id = str(edge.get("toId") or "").strip()
        if general_id not in {from_id, to_id}:
            continue
        if not is_stable_relationship_edge(edge):
            continue
        edges.append(
            {
                "fromId": from_id,
                "toId": to_id,
                "type": edge.get("type"),
                "evidenceRefs": list(edge.get("evidenceRefs") or []),
                "edgeConfidence": edge.get("edgeConfidence") or edge.get("confidence") or 0.9,
                "edgeStrength": edge.get("edgeStrength") or 0.85,
                "sourceQuote": edge.get("sourceQuote"),
                "sourceLayer": edge.get("sourceLayer") or STABLE_RELATIONSHIP_SOURCE_LAYER,
                "claimLayer": edge.get("claimLayer"),
                "claimGrade": edge.get("claimGrade"),
                "reviewStatus": edge.get("reviewStatus") or "ready",
                "eventTags": list(edge.get("eventTags") or []),
                "validFromChapter": edge.get("validFromChapter"),
                "validToChapter": edge.get("validToChapter"),
            }
        )
    return edges


def stable_type_index(stable_edges: list[dict[str, Any]], general_id: str) -> dict[str, set[str]]:
    index: dict[str, set[str]] = defaultdict(set)
    for edge in stable_edges:
        target = relationship_target(edge, general_id)
        rel_type = str(edge.get("type") or "").strip()
        if target and rel_type:
            index[target].add(rel_type)
    return index


def index_relationship_targets_by_ref(relationships: dict[str, Any]) -> dict[str, set[str]]:
    by_ref: dict[str, set[str]] = defaultdict(set)
    for anchor in relationships.get("anchors") or []:
        target_id = str(anchor.get("targetId") or "").strip()
        if not target_id:
            continue
        for ref in anchor.get("evidenceRefs") or []:
            ref_key = str(ref or "").strip()
            if ref_key:
                by_ref[ref_key].add(target_id)
    return by_ref


def relationship_edge_general_ids(edges: list[dict[str, Any]], general_id: str) -> list[str]:
    hits: set[str] = set()
    for edge in edges or []:
        from_id = str(edge.get("fromId") or "").strip()
        to_id = str(edge.get("toId") or "").strip()
        if from_id == general_id and to_id:
            hits.add(to_id)
        if to_id == general_id and from_id:
            hits.add(from_id)
    return sorted(hits)


def source_ref_related_ids(refs: list[str], relationship_targets_by_ref: dict[str, set[str]]) -> list[str]:
    hits: set[str] = set()
    for ref in refs:
        hits.update(relationship_targets_by_ref.get(str(ref or "").strip(), set()))
    return sorted(hits)


def linked_general_ids(
    *,
    general_id: str,
    declared_ids: list[str],
    text: str,
    refs: list[str],
    relationship_edges: list[dict[str, Any]] | None,
    relationship_targets_by_ref: dict[str, set[str]],
    alias_index: dict[str, list[str]],
) -> tuple[list[str], list[dict[str, Any]]]:
    trace: list[dict[str, Any]] = []
    buckets: dict[str, set[str]] = defaultdict(set)
    for target_id in relationship_edge_general_ids(relationship_edges or [], general_id):
        buckets[target_id].add("relationshipEdges")
    for target_id in source_ref_related_ids(refs, relationship_targets_by_ref):
        if target_id != general_id:
            buckets[target_id].add("relationshipRefs")
    for target_id in text_mentioned_general_ids(text, alias_index, general_id):
        buckets[target_id].add("aliasMatch")
    for target_id, reasons in sorted(buckets.items()):
        trace.append({"targetId": target_id, "sources": sorted(reasons)})
    return sorted(buckets), trace


def build_angle_target_links(story_beats: list[dict[str, Any]], source_highlights: list[dict[str, Any]]) -> list[dict[str, Any]]:
    links: dict[tuple[str, str, str], dict[str, Any]] = {}
    for beat in story_beats:
        angles = beat.get("angleFamilies") or ["story_event"]
        for angle in angles:
            for target_id in beat.get("relatedGeneralIds") or []:
                key = (str(angle), str(target_id), str(beat.get("eventId") or beat.get("eventKey") or ""))
                links[key] = {
                    "angleFamily": str(angle),
                    "targetId": str(target_id),
                    "sourceRef": (beat.get("sourceRefs") or [None])[0],
                    "sourceId": beat.get("eventId") or beat.get("eventKey"),
                    "sourceType": "storyBeat",
                }
    for highlight in source_highlights:
        angles = highlight.get("angleFamilies") or ["source_highlight"]
        for angle in angles:
            for target_id in highlight.get("relatedGeneralIds") or []:
                key = (str(angle), str(target_id), str(highlight.get("sourceRef") or ""))
                links[key] = {
                    "angleFamily": str(angle),
                    "targetId": str(target_id),
                    "sourceRef": highlight.get("sourceRef"),
                    "sourceId": highlight.get("sourceRef"),
                    "sourceType": "sourceHighlight",
                }
    return list(links.values())


def load_review_backlog(paths: list[Path], general_id: str) -> list[dict[str, Any]]:
    backlog: list[dict[str, Any]] = []
    for path in paths:
        payload = read_json(path)
        if payload.get("generalId") and payload.get("generalId") != general_id:
            continue
        for question in payload.get("questions") or []:
            answer = str(question.get("answer") or question.get("suggestedAnswer") or "").upper()[:1]
            if answer != "B":
                continue
            edits = question.get("edits") or {}
            backlog.append({
                "eventKey": question.get("eventKey"),
                "chapterNo": question.get("chapterNo"),
                "sourceRefs": question.get("sourceRefs") or [],
                "currentLocation": edits.get("location"),
                "currentSummary": edits.get("summary") or question.get("summary"),
                "neededFixes": ["confirm_event_boundary", "refine_relationship_type", "verify_specific_location"],
                "sourceQuote": question.get("sourceQuote"),
                "reviewStatus": "accept-with-edits",
            })
    return backlog


def source_grounded_event(event: dict[str, Any]) -> bool:
    source_refs = [str(ref) for ref in event.get("sourceRefs") or []]
    if not source_refs:
        return False
    if event.get("eventType") == "alias-smoke":
        return False
    if all(ref.startswith("fixture.") for ref in source_refs):
        return False
    return True


def related_events(events: list[dict[str, Any]], general_id: str) -> list[dict[str, Any]]:
    return [event for event in events if general_id in (event.get("generalIds") or []) and source_grounded_event(event)]


def related_packets(packets: list[dict[str, Any]], general_id: str) -> list[dict[str, Any]]:
    strength_rank = {"strong": 3, "rich": 2, "thin": 1}
    rows = [packet for packet in packets if general_id in (packet.get("generalIds") or [])]
    return sorted(rows, key=lambda item: (strength_rank.get(str(item.get("packetStrength")), 0), len(item.get("angleFamilies") or [])), reverse=True)


def relationship_target(edge: dict[str, Any], general_id: str) -> str | None:
    if edge.get("fromId") == general_id:
        return str(edge.get("toId") or "") or None
    if edge.get("toId") == general_id:
        return str(edge.get("fromId") or "") or None
    return None


def refine_relationship_type(edge: dict[str, Any], general_id: str) -> tuple[str, list[str]]:
    original = str(edge.get("type") or "")
    target = relationship_target(edge, general_id) or ""
    quote = str(edge.get("sourceQuote") or "")
    refs = " ".join(str(ref) for ref in edge.get("evidenceRefs") or [])
    reasons: list[str] = []
    if is_stable_relationship_edge(edge):
        reasons.append("stable_relationship_baseline")
        return original or "relationship", reasons
    if original in GRAPH_RELATIONSHIP_TYPES:
        if original == "ruler_subject" and not edge_has_authority_baseline_terms(edge):
            reasons.append("source_graph_ruler_subject_without_authority_baseline_terms")
            return "battlefield_contact", reasons
        reasons.append("source_graph_refined_type")
        return original, reasons
    if target == "cao-cao" and any(term in quote for term in ["勒住馬", "速退", "又中諸葛亮之計"]):
        reasons.append("enemy_retreat_or_intimidation_terms")
        return "intimidates_enemy", reasons
    if target == "zhuge-liang" and "計" in quote:
        reasons.append("strategy_context_terms")
        return "strategy_pressure", reasons
    if original == "confronts" or target in {"xiahou-dun", "cao-ren", "pang-de", "wen-chou", "yan-liang", "lu-bu"}:
        reasons.append("battlefield_opponent_target")
        return "battlefield_opponent", reasons
    if original == "sworn_sibling" or (target in {"liu-bei", "zhang-fei"} and any(term in quote for term in ["結義", "誓同生死", "盟誓"])):
        reasons.append("oath_or_sworn_sibling_terms")
        return "sworn_sibling", reasons
    if target in {"liu-bei", "mi-shi", "gan-shi", "liu-shan"} and any(term in quote for term in ["二嫂嫂", "甘夫人", "阿斗", "家眷", "付託"]):
        reasons.append("family_guardian_terms")
        return "protects_family", reasons
    if target == "liu-bei" and any(term in quote for term in ["結義", "盟誓", "桃園", "誓同生死"]):
        reasons.append("liu_bei_core_oath_relation")
        return "loyal_oath", reasons
    if target == "liu-bei" and ("025#" in refs or "073#" in refs or "007#" in refs):
        reasons.append("liu_bei_oath_context")
        return "loyal_oath", reasons
    if target == "zhang-fei":
        reasons.append("zhang_fei_battle_ally_context")
        return "battle_ally", reasons
    reasons.append("coarse_edge_fallback")
    return "battlefield_contact", reasons


def build_relationships(
    general_id: str,
    edges: list[dict[str, Any]],
    identities: dict[str, dict[str, Any]],
    stable_edges: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    grouped: dict[tuple[str, str], dict[str, Any]] = {}
    counts = Counter()
    rejected: list[dict[str, Any]] = []
    alias_index = build_alias_index(identities)
    stable_edges = stable_edges or []
    stable_types_by_target = stable_type_index(stable_edges, general_id)
    for edge in [*stable_edges, *edges]:
        target = relationship_target(edge, general_id)
        if not target:
            continue
        refined_type, reasons = refine_relationship_type(edge, general_id)
        is_stable = is_stable_relationship_edge(edge)
        direct_pair_signal = edge_has_direct_pair_signal(edge, general_id, target, alias_index)
        stable_types = stable_types_by_target.get(target) or set()
        reject_reasons: list[str] = []
        if not is_stable and stable_types and refined_type not in stable_types and not direct_pair_signal:
            reject_reasons.append("conflicts_with_stable_relationship_without_direct_pair_evidence")
        if not is_stable and refined_type in SEMANTIC_RELATIONSHIP_TYPES and not direct_pair_signal:
            reject_reasons.append("semantic_relationship_without_direct_pair_evidence")
        if reject_reasons:
            rejected.append(
                {
                    "targetId": target,
                    "targetName": name_for(target, identities),
                    "type": refined_type,
                    "originalType": edge.get("type"),
                    "evidenceRefs": list(edge.get("evidenceRefs") or []),
                    "sourceQuote": edge.get("sourceQuote"),
                    "rejectionReasons": unique(reject_reasons),
                    "refinementReasons": reasons,
                    "reviewStatus": "rejected-runtime-export",
                }
            )
            continue
        direction = "outgoing" if edge.get("fromId") == general_id else "incoming"
        key = (target, refined_type)
        current = grouped.get(key)
        if current is None:
            grouped[key] = {
                "targetId": target,
                "targetName": name_for(target, identities),
                "type": refined_type,
                "typeLabel": TYPE_LABELS.get(refined_type, refined_type),
                "originalTypes": [edge.get("type")],
                "directions": [direction],
                "evidenceRefs": list(edge.get("evidenceRefs") or []),
                "edgeConfidence": edge.get("edgeConfidence") or 0.0,
                "edgeStrength": edge.get("edgeStrength"),
                "sourceQuotes": [edge.get("sourceQuote")] if edge.get("sourceQuote") else [],
                "refinementReasons": reasons,
                "reviewStatus": edge.get("reviewStatus") or "reviewed",
                "sourceLayer": edge.get("sourceLayer"),
            }
            continue
        current["originalTypes"] = unique(list(current.get("originalTypes") or []) + [edge.get("type")])
        current["directions"] = unique(list(current.get("directions") or []) + [direction])
        current["evidenceRefs"] = sorted(set(current.get("evidenceRefs") or []) | set(edge.get("evidenceRefs") or []))
        current["edgeConfidence"] = max(float(current.get("edgeConfidence") or 0.0), float(edge.get("edgeConfidence") or 0.0))
        if edge.get("edgeStrength") is not None:
            current["edgeStrength"] = max(float(current.get("edgeStrength") or 0.0), float(edge.get("edgeStrength") or 0.0))
        if edge.get("sourceQuote"):
            current["sourceQuotes"] = unique(list(current.get("sourceQuotes") or []) + [edge.get("sourceQuote")])[:3]
        current["refinementReasons"] = unique(list(current.get("refinementReasons") or []) + reasons)
    anchors = list(grouped.values())
    for anchor in anchors:
        counts[anchor["type"]] += 1
    anchors = sorted(anchors, key=lambda item: (-float(item.get("edgeConfidence") or 0), item["targetId"], item["type"]))
    return {
        "relationshipVersion": "general_relationships_v1",
        "generalId": general_id,
        "displayName": name_for(general_id, identities),
        "generatedAt": utc_now(),
        "relationshipCount": len(anchors),
        "typeCounts": dict(sorted(counts.items())),
        "anchors": anchors,
        "rejectedRelationshipEdges": rejected,
        "taxonomyPolicy": {
            "commands": "not exported as final type; refined into semantic runtime labels when possible",
            "fallbackType": "battlefield_contact",
            "directPairGate": "semantic relationship edges must mention both endpoints unless they come from stable bootstrap",
            "stableConflictPolicy": "stable relationship baseline types cannot be overwritten by indirect short evidence",
            "commandPolicy": "command or dispatch evidence is battlefield contact unless a stable authority baseline or explicit lordship terms exist",
        },
    }


def make_keyword(key: str, label: str, category: str, source_refs: list[str], confidence: float, **extra: Any) -> dict[str, Any]:
    payload = {
        "keywordKey": key,
        "label": label,
        "category": category,
        "sourceRefs": sorted(set(source_refs)),
        "confidence": round(float(confidence), 3),
        "uiLabelMaxChars": 12,
        "retired": False,
    }
    payload.update(extra)
    return payload


def add_keyword(bucket: dict[str, dict[str, Any]], item: dict[str, Any]) -> None:
    existing = bucket.get(item["keywordKey"])
    if not existing:
        bucket[item["keywordKey"]] = item
        return
    existing["sourceRefs"] = sorted(set(existing.get("sourceRefs") or []) | set(item.get("sourceRefs") or []))
    existing["confidence"] = max(float(existing.get("confidence") or 0), float(item.get("confidence") or 0))


def build_keywords(general_id: str, identity: dict[str, Any], profile: dict[str, Any], events: list[dict[str, Any]], packets: list[dict[str, Any]], relationships: dict[str, Any]) -> dict[str, Any]:
    categories: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    name = str(identity.get("name") or general_id)
    for label in [name] + list(identity.get("aliases") or []):
        add_keyword(categories["identity"], make_keyword(f"identity.{slug(label)}", label, "identity", [], 0.95, sourceLayer="identity"))
    if identity.get("title"):
        add_keyword(categories["identity"], make_keyword(f"title.{slug(str(identity['title']))}", str(identity["title"]), "identity", [], 0.9, sourceLayer="identity"))

    tag_fields = {
        "personality": "personalityTags",
        "affect": "affectTags",
        "aptitude": "aptitudeTags",
        "activity": "activitySeedHints",
        "decision": "decisionWeightHints",
        "choice": "choiceWeightHints",
    }
    for category, field in tag_fields.items():
        for tag in profile.get(field) or []:
            add_keyword(categories[category], make_keyword(f"{category}.{tag}", TAG_LABELS.get(tag, tag), category, [], 0.78, sourceLayer="stable-profile", rawTag=tag))

    for event in events:
        refs = event.get("sourceRefs") or []
        summary = str(event.get("summary") or event.get("eventKey") or "event")
        label, full_label = event_label(summary)
        if full_label == label:
            full_label = summary
        add_keyword(categories["event"], make_keyword(f"event.{event.get('eventKey') or slug(summary)}", label, "event", refs, float(event.get("confidence") or 0.72), fullLabel=full_label, eventId=event.get("eventId")))
        location = event.get("location")
        if location:
            add_keyword(categories["location"], make_keyword(f"location.{slug(str(location))}", str(location), "location", refs, 0.86))
        for term, (key, display_label) in ITEM_TERMS.items():
            if term in summary:
                add_keyword(categories["item"], make_keyword(f"item.{key}", display_label, "item", refs, 0.8))

    for rel in relationships.get("anchors") or []:
        target_id = rel.get("targetId")
        target_name = rel.get("targetName") or target_id
        rel_type = rel.get("type")
        refs = rel.get("evidenceRefs") or []
        add_keyword(categories["person"], make_keyword(f"person.{target_id}", str(target_name), "person", refs, float(rel.get("edgeConfidence") or 0.7), relatedGeneralId=target_id))
        add_keyword(categories["relationship"], make_keyword(f"relationship.{target_id}.{rel_type}", f"{target_name}-{rel.get('typeLabel')}", "relationship", refs, float(rel.get("edgeConfidence") or 0.7), relatedGeneralId=target_id, relationshipType=rel_type))

    return {
        "keywordVersion": "general_runtime_keywords_v1",
        "generalId": general_id,
        "displayName": name,
        "generatedAt": utc_now(),
        "categories": {category: sorted(values.values(), key=lambda item: item["keywordKey"]) for category, values in sorted(categories.items())},
        "categoryCounts": {category: len(values) for category, values in sorted(categories.items())},
    }


def build_persona(
    general_id: str,
    identity: dict[str, Any],
    profile: dict[str, Any],
    events: list[dict[str, Any]],
    packets: list[dict[str, Any]],
    relationships: dict[str, Any],
    core_report: dict[str, Any],
    review_backlog: list[dict[str, Any]],
    keywords: dict[str, Any],
    identities: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    core_people = {person.get("generalId"): person for person in core_report.get("people") or []}
    core = core_people.get(general_id) or {}
    display_name = identity.get("name") or general_id
    voice = voice_preset(general_id, display_name)
    source_refs = sorted({ref for event in events for ref in (event.get("sourceRefs") or [])})
    alias_index = build_alias_index(identities)
    relationship_targets_by_ref = index_relationship_targets_by_ref(relationships)
    highlight_by_ref = {str(packet.get("sourceRef") or "").strip(): packet for packet in packets if str(packet.get("sourceRef") or "").strip()}
    story_beats: list[dict[str, Any]] = []
    for event in events[:18]:
        refs = [str(ref) for ref in (event.get("sourceRefs") or []) if str(ref).strip()]
        primary_packet = next((highlight_by_ref.get(ref) for ref in refs if highlight_by_ref.get(ref)), None) or {}
        text = " ".join(
            str(value)
            for value in [
                event.get("summary"),
                event.get("sourceQuote"),
                event.get("location"),
            ]
            if value
        )
        related_ids, link_trace = linked_general_ids(
            general_id=general_id,
            declared_ids=[str(item) for item in (event.get("generalIds") or [])],
            text=text,
            refs=refs,
            relationship_edges=event.get("relationshipEdges") or [],
            relationship_targets_by_ref=relationship_targets_by_ref,
            alias_index=alias_index,
        )
        story_beats.append(
            {
            "eventId": event.get("eventId"),
            "eventKey": event.get("eventKey"),
            "chapterNo": event.get("chapterNo"),
            "location": event.get("location"),
            "summary": event.get("summary"),
            "sourceQuote": event.get("sourceQuote"),
            "sourceRefs": refs,
            "angleFamilies": primary_packet.get("angleFamilies") or [],
            "relatedGeneralIds": related_ids,
            "targetLinkTrace": link_trace,
            "confidence": event.get("confidence"),
            }
        )
    source_highlights: list[dict[str, Any]] = []
    for packet in packets[:16]:
        source_ref = str(packet.get("sourceRef") or "").strip()
        example = (packet.get("examples") or [None])[0]
        related_ids, link_trace = linked_general_ids(
            general_id=general_id,
            declared_ids=[str(item) for item in (packet.get("generalIds") or [])],
            text=str(example or ""),
            refs=[source_ref] if source_ref else [],
            relationship_edges=[],
            relationship_targets_by_ref=relationship_targets_by_ref,
            alias_index=alias_index,
        )
        source_highlights.append(
            {
            "sourceRef": packet.get("sourceRef"),
            "packetStrength": packet.get("packetStrength"),
            "angleFamilies": packet.get("angleFamilies") or [],
            "example": example,
            "relatedGeneralIds": related_ids,
            "targetLinkTrace": link_trace,
            }
        )
    angle_target_links = build_angle_target_links(story_beats, source_highlights)
    return {
        "personaVersion": "general_runtime_persona_v1",
        "generalId": general_id,
        "displayName": display_name,
        "aliases": identity.get("aliases") or [],
        "title": identity.get("title"),
        "gender": identity.get("gender"),
        "baseFaction": identity.get("baseFaction"),
        "generatedAt": utc_now(),
        "runtimeReadiness": {
            "status": "ready-for-dialogue-smoke" if events and relationships.get("anchors") else "thin-but-testable",
            "canonicalWrites": False,
            "completionPercent": core.get("completionPercent"),
            "readyEventCount": len(events),
            "relationshipCount": len(relationships.get("anchors") or []),
            "rejectedRelationshipEdgeCount": len(relationships.get("rejectedRelationshipEdges") or []),
            "keywordCategoryCounts": keywords.get("categoryCounts") or {},
            "reviewBacklogCount": len(review_backlog),
        },
        "profile": {
            "role": profile.get("role"),
            "coverageLevel": profile.get("coverageLevel"),
            "roleActivityTags": profile.get("roleActivityTags") or [],
            "aptitudeTags": profile.get("aptitudeTags") or [],
            "affectTags": profile.get("affectTags") or [],
            "personalityTags": profile.get("personalityTags") or [],
            "activitySeedHints": profile.get("activitySeedHints") or [],
            "decisionWeightHints": profile.get("decisionWeightHints") or [],
            "choiceWeightHints": profile.get("choiceWeightHints") or [],
        },
        "voiceAndPrompt": {
            "voiceStyle": voice["voiceStyle"],
            "safeFallbackLine": voice["safeFallbackLine"],
            "taboos": voice["taboos"],
            "promptRules": [
                "只使用 persona、keywords、relationships 與 retrieved evidence 生成台詞。",
                "若 evidence 不足，使用 safeFallbackLine 或保守回應。",
                "輸出繁體中文，避免現代網路語。",
            ],
        },
        "storyBeats": story_beats,
        "sourceHighlights": source_highlights,
        "angleTargetLinks": angle_target_links,
        "targetLinking": {
            "version": "deterministic_source_link_v1",
            "policy": "source generalIds + relationship evidenceRefs + exact alias match; no LLM inference",
            "linkCount": len(angle_target_links),
        },
        "relationshipSummary": {
            "typeCounts": relationships.get("typeCounts") or {},
            "topAnchors": (relationships.get("anchors") or [])[:12],
        },
        "reviewBacklog": review_backlog,
        "evidenceRefs": source_refs,
        "observedMentionStats": profile.get("observedMentionStats") or {},
    }


def render_summary(general_id: str, persona: dict[str, Any], keywords: dict[str, Any], relationships: dict[str, Any], output_dir: Path) -> str:
    lines = [
        "# General Runtime Profile Export",
        "",
        f"- General ID: `{general_id}`",
        f"- Display Name: `{persona.get('displayName')}`",
        f"- Generated At: `{persona.get('generatedAt')}`",
        f"- Runtime Status: `{persona['runtimeReadiness']['status']}`",
        f"- Completion: `{persona['runtimeReadiness'].get('completionPercent')}`",
        f"- Ready Events: `{persona['runtimeReadiness']['readyEventCount']}`",
        f"- Relationships: `{persona['runtimeReadiness']['relationshipCount']}`",
        f"- Rejected Relationship Edges: `{persona['runtimeReadiness'].get('rejectedRelationshipEdgeCount', 0)}`",
        f"- Review Backlog: `{persona['runtimeReadiness']['reviewBacklogCount']}`",
        "",
        "## Keyword Categories",
        "",
    ]
    for category, count in keywords.get("categoryCounts", {}).items():
        lines.append(f"- `{category}`: `{count}`")
    lines.extend(["", "## Relationship Types", ""])
    for rel_type, count in relationships.get("typeCounts", {}).items():
        lines.append(f"- `{rel_type}`: `{count}`")
    lines.extend(["", "## Outputs", ""])
    for suffix in ["persona", "keywords", "relationships"]:
        lines.append(f"- `{suffix}`: `{output_dir / f'{general_id}.{suffix}.json'}`")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    general_id = args.general_id
    output_dir = Path(args.output_root) / general_id
    outputs = [output_dir / f"{general_id}.{suffix}.json" for suffix in ["persona", "keywords", "relationships"]]
    outputs.append(output_dir / f"{general_id}.runtime-summary.md")
    if not args.overwrite and any(path.exists() for path in outputs):
        raise FileExistsError("Runtime profile outputs already exist. Re-run with --overwrite.")

    stable = read_json(Path(args.stable_knowledge))
    identities, profiles = stable_indexes(stable)
    identity = identities.get(general_id)
    profile = profiles.get(general_id)
    if not identity or not profile:
        raise ValueError(f"Missing stable identity/profile for {general_id}")
    events = related_events(read_jsonl(Path(args.events)), general_id)
    edges = read_jsonl(Path(args.relationship_evidence))
    packets = related_packets(read_jsonl(Path(args.source_event_packets)), general_id)
    core_report = read_json(Path(args.core_report))
    review_paths = [Path(path) for path in args.review_answers]
    review_backlog = load_review_backlog(review_paths, general_id)
    stable_edges = stable_relationship_edges_for_general(stable, general_id)
    relationships = build_relationships(general_id, edges, identities, stable_edges=stable_edges)
    keywords = build_keywords(general_id, identity, profile, events, packets, relationships)
    persona = build_persona(general_id, identity, profile, events, packets, relationships, core_report, review_backlog, keywords, identities)

    write_json(outputs[0], persona)
    write_json(outputs[1], keywords)
    write_json(outputs[2], relationships)
    outputs[3].write_text(render_summary(general_id, persona, keywords, relationships, output_dir), encoding="utf-8")
    print(f"[export_general_runtime_profile] wrote {output_dir}")
    print(
        f"[export_general_runtime_profile] general={general_id} events={len(events)} "
        f"relationships={len(relationships.get('anchors') or [])} keywordCategories={len(keywords.get('categories') or {})} "
        f"reviewBacklog={len(review_backlog)}"
    )


if __name__ == "__main__":
    main()
