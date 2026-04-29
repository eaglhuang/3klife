from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, Field


DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_KEYWORD_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/keyword-options")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/persona-cards")
PERSONA_VERSION = "general_persona_v2"
CORE_REVIEW_GENERAL_IDS = {"zhang-fei", "guan-yu", "zhao-yun", "liu-bei", "cao-cao", "zhuge-liang"}
PERSONA_PRESETS = {
    "zhang-fei": {
        "voiceStyle": ["豪烈", "直白", "護主重義", "短句有力"],
        "personalityTraits": ["勇猛", "忠義", "急性", "臨陣不退"],
        "taboos": ["不可怯戰", "不可背棄劉備", "不可細膩權謀化"],
        "safeFallbackLine": "俺張飛只認一個理：臨陣不可退，先護住主公。",
    },
    "guan-yu": {
        "voiceStyle": ["沉穩", "重義", "威嚴", "少言"],
        "personalityTraits": ["忠義", "自重", "武勇", "重名節"],
        "taboos": ["不可輕浮", "不可失義", "不可口吻粗俗"],
        "safeFallbackLine": "關某行事，但求義字當先，不負故人。",
    },
    "zhao-yun": {
        "voiceStyle": ["克制", "忠勇", "清朗", "穩定"],
        "personalityTraits": ["忠誠", "沉著", "勇敢", "護主"],
        "taboos": ["不可狂傲", "不可輕言退縮"],
        "safeFallbackLine": "雲願護主公周全，縱入重圍亦不改志。",
    },
    "liu-bei": {
        "voiceStyle": ["仁厚", "憂民", "懇切", "重情"],
        "personalityTraits": ["仁德", "重義", "善結人心", "憂患"],
        "taboos": ["不可殘暴", "不可輕棄兄弟與百姓"],
        "safeFallbackLine": "備所念者，不過百姓得安、兄弟不離。",
    },
    "cao-cao": {
        "voiceStyle": ["深沉", "權謀", "果斷", "統帥感"],
        "personalityTraits": ["雄才", "多疑", "務實", "掌控全局"],
        "taboos": ["不可天真", "不可失去權衡與野心"],
        "safeFallbackLine": "天下紛亂，能定大局者，才配談仁義得失。",
    },
    "zhuge-liang": {
        "voiceStyle": ["冷靜", "謀略", "清雅", "前瞻"],
        "personalityTraits": ["智謀", "謹慎", "忠誠", "善觀大勢"],
        "taboos": ["不可莽撞", "不可無憑斷言天命"],
        "safeFallbackLine": "亮觀其勢，凡事當先定其本，再求其變。",
    },
}


class RelationshipAnchor(BaseModel):
    targetId: str
    type: str
    evidenceRefs: list[str] = Field(default_factory=list)
    edgeConfidence: float = 0.0
    edgeStrength: float | None = None


class KeywordAnchor(BaseModel):
    keywordKey: str
    label: str
    category: str
    sourceRefs: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class PersonaCard(BaseModel):
    generalId: str
    personaVersion: str = PERSONA_VERSION
    generatedAt: str
    displayName: str
    title: str | None = None
    faction: str | None = None
    sourceProfile: dict = Field(default_factory=dict)
    voiceStyle: list[str] = Field(default_factory=list)
    personalityTraits: list[str] = Field(default_factory=list)
    relationshipAnchors: list[RelationshipAnchor] = Field(default_factory=list)
    keywordAnchors: list[KeywordAnchor] = Field(default_factory=list)
    moodAnchors: list[str] = Field(default_factory=list)
    evidenceRefs: list[str] = Field(default_factory=list)
    safeFallbackLine: str
    taboos: list[str] = Field(default_factory=list)
    llmPromptRules: list[str] = Field(default_factory=list)
    manualReviewRequired: bool = False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build deterministic persona cards before LLM dialogue generation.")
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="events.jsonl path")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="generals.json path")
    parser.add_argument("--keyword-root", default=str(DEFAULT_KEYWORD_ROOT), help="Keyword pack directory")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--general-id", default="all", help="General id to build, or all")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_events(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def normalize_title(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"^[【\[]|[】\]]$", "", value.strip())
    return cleaned or None


def ensure_output_root(output_root: Path, overwrite: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    if overwrite:
        return
    existing = list(output_root.glob("*.persona.json")) + [output_root / "persona-cards.index.json", output_root / "persona-cards-summary.md"]
    existing = [path for path in existing if path.exists()]
    if existing:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing[:5]}")


def select_generals(generals: list[dict], general_id: str) -> list[dict]:
    if general_id == "all":
        return [general for general in generals if general.get("id")]
    selected = [general for general in generals if general.get("id") == general_id]
    if not selected:
        raise ValueError(f"Unknown general id: {general_id}")
    return selected


def index_events(events: list[dict]) -> dict[str, list[dict]]:
    indexed: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        if event.get("reviewStatus", "ready") != "ready":
            continue
        if event.get("eventType") == "alias-smoke":
            continue
        if all(str(ref).startswith("fixture.") for ref in (event.get("sourceRefs") or [])):
            continue
        for general_id in event.get("generalIds") or []:
            indexed[general_id].append(event)
    return indexed


def load_keyword_anchors(keyword_root: Path, general_id: str) -> list[KeywordAnchor]:
    path = keyword_root / f"{general_id}.keywords.json"
    if not path.exists():
        return []
    payload = read_json(path)
    anchors: list[KeywordAnchor] = []
    for category, items in (payload.get("categories") or {}).items():
        for item in items:
            if item.get("retired"):
                continue
            anchors.append(
                KeywordAnchor(
                    keywordKey=item.get("keywordKey") or "",
                    label=item.get("label") or item.get("keywordKey") or "",
                    category=category,
                    sourceRefs=item.get("sourceRefs") or [],
                    confidence=float(item.get("confidence") or 0.0),
                )
            )
    return sorted(anchors, key=lambda item: (-item.confidence, item.category, item.keywordKey))[:12]


def build_relationship_anchors(general_id: str, events: list[dict]) -> list[RelationshipAnchor]:
    bucket: dict[tuple[str, str], RelationshipAnchor] = {}
    for event in events:
        for edge in event.get("relationshipEdges") or []:
            from_id = edge.get("fromId")
            to_id = edge.get("toId")
            if from_id == general_id:
                target_id = to_id
                relation_type = edge.get("type") or "relates_to"
            elif to_id == general_id:
                target_id = from_id
                relation_type = f"reverse:{edge.get('type') or 'relates_to'}"
            else:
                continue
            if not target_id:
                continue
            key = (target_id, relation_type)
            existing = bucket.get(key)
            refs = sorted(set(edge.get("evidenceRefs") or []) | set(event.get("sourceRefs") or []))
            edge_confidence = float(edge.get("edgeConfidence") or 0.0)
            edge_strength_raw = edge.get("edgeStrength")
            edge_strength = float(edge_strength_raw) if edge_strength_raw is not None else None
            if existing is None:
                bucket[key] = RelationshipAnchor(
                    targetId=target_id,
                    type=relation_type,
                    evidenceRefs=refs,
                    edgeConfidence=edge_confidence,
                    edgeStrength=edge_strength,
                )
            else:
                existing.evidenceRefs = sorted(set(existing.evidenceRefs) | set(refs))
                existing.edgeConfidence = max(existing.edgeConfidence, edge_confidence)
                if edge_strength is not None:
                    existing.edgeStrength = max(existing.edgeStrength or edge_strength, edge_strength)
    return sorted(bucket.values(), key=lambda item: (-item.edgeConfidence, item.targetId, item.type))[:12]


def derive_generic_traits(general: dict, events: list[dict]) -> tuple[list[str], list[str], list[str]]:
    traits: list[str] = []
    voice: list[str] = []
    taboos: list[str] = ["不得自稱 AI", "不得新增未提供 evidence 的重大史實", "不得使用現代網路語"]
    stats = general.get("stats") or {}
    if int(stats.get("str") or general.get("str") or 0) >= 80:
        traits.append("勇武")
        voice.append("有武將氣勢")
    if int(stats.get("int") or general.get("int") or 0) >= 85:
        traits.append("多謀")
        voice.append("善於權衡")
    if int(stats.get("pol") or general.get("pol") or 0) >= 85:
        traits.append("重政略")
    if int(stats.get("cha") or general.get("cha") or 0) >= 85:
        traits.append("有號召力")
    mood_counter = Counter(tag for event in events for tag in (event.get("moodTags") or []))
    traits.extend(tag for tag, _count in mood_counter.most_common(3))
    if not traits:
        traits.append("謹慎應對")
    if not voice:
        voice.append("符合三國語境")
    return unique(traits), unique(voice), taboos


def unique(values: list[str]) -> list[str]:
    result: list[str] = []
    seen = set()
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def build_persona_card(general: dict, events: list[dict], keyword_root: Path) -> PersonaCard:
    general_id = general.get("id")
    preset = PERSONA_PRESETS.get(general_id, {})
    traits, voice, generic_taboos = derive_generic_traits(general, events)
    evidence_refs = sorted({ref for event in events for ref in (event.get("sourceRefs") or [])})
    display_name = general.get("name") or general_id
    fallback = preset.get("safeFallbackLine") or f"{display_name}記得舊事仍須有憑有據，不可妄言。"

    return PersonaCard(
        generalId=general_id,
        generatedAt=utc_now(),
        displayName=display_name,
        title=normalize_title(general.get("title") or general.get("awakeningTitle")),
        faction=general.get("faction"),
        sourceProfile={
            "rarityTier": general.get("rarityTier"),
            "characterCategory": general.get("characterCategory"),
            "awakeningTitle": general.get("awakeningTitle"),
            "notes": general.get("notes"),
        },
        voiceStyle=unique(list(preset.get("voiceStyle") or []) + voice),
        personalityTraits=unique(list(preset.get("personalityTraits") or []) + traits),
        relationshipAnchors=build_relationship_anchors(general_id, events),
        keywordAnchors=load_keyword_anchors(keyword_root, general_id),
        moodAnchors=unique([tag for event in events for tag in (event.get("moodTags") or [])]),
        evidenceRefs=evidence_refs,
        safeFallbackLine=fallback,
        taboos=unique(list(preset.get("taboos") or []) + generic_taboos),
        llmPromptRules=[
            "只使用本 persona card、selected keyword 與 retrieved evidence 生成台詞。",
            "若 evidence 不足，使用 safeFallbackLine 或弱聯想，不得補寫重大史實。",
            "輸出繁體中文，預設一句 20 到 60 字。",
        ],
        manualReviewRequired=general_id in CORE_REVIEW_GENERAL_IDS,
    )


def render_summary(cards: list[PersonaCard]) -> str:
    lines = [
        "# Persona Cards Summary",
        "",
        f"- Generated At: `{utc_now()}`",
        f"- Card Count: `{len(cards)}`",
        "",
        "| General | Name | Evidence Refs | Keywords | Manual Review |",
        "|---|---|---:|---:|---|",
    ]
    for card in cards:
        lines.append(
            f"| `{card.generalId}` | {card.displayName} | {len(card.evidenceRefs)} | "
            f"{len(card.keywordAnchors)} | `{str(card.manualReviewRequired).lower()}` |"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)
    generals = select_generals(read_json(Path(args.generals)), args.general_id)
    events_by_general = index_events(load_events(Path(args.events)))
    keyword_root = Path(args.keyword_root)
    cards = [build_persona_card(general, events_by_general.get(general.get("id"), []), keyword_root) for general in generals]

    for card in cards:
        path = output_root / f"{card.generalId}.persona.json"
        path.write_text(json.dumps(card.model_dump(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    index = {
        "version": PERSONA_VERSION,
        "generatedAt": utc_now(),
        "count": len(cards),
        "cards": [
            {
                "generalId": card.generalId,
                "path": f"{card.generalId}.persona.json",
                "manualReviewRequired": card.manualReviewRequired,
                "evidenceRefCount": len(card.evidenceRefs),
                "keywordAnchorCount": len(card.keywordAnchors),
            }
            for card in cards
        ],
    }
    (output_root / "persona-cards.index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "persona-cards-summary.md").write_text(render_summary(cards), encoding="utf-8")
    print(f"[build_persona_cards] wrote {output_root}")
    print(f"[build_persona_cards] cards={len(cards)} manualReview={sum(1 for card in cards if card.manualReviewRequired)}")


if __name__ == "__main__":
    main()