from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ollama_reasoning_client import (
    DEFAULT_REASONING_NUM_CTX,
    DEFAULT_REASONING_REPEAT_PENALTY,
    DEFAULT_REASONING_TEMPERATURE,
    DEFAULT_REASONING_TIMEOUT_MS,
    DEFAULT_REASONING_TOP_P,
    OllamaReasoningError,
    compact_text,
)
from reviewer_adapters import ReviewerAdapter, resolve_reviewer_adapter


DEFAULT_ANSWERS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/event-review-answers.todo.json")
DEFAULT_CHAPTERS_ROOT = Path("artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters")
DEFAULT_PEOPLE_PATH = Path("assets/resources/data/person-registry.json")
DEFAULT_MANUAL_ROSTER_PATH = Path("server/npc-brain/pipelines/sanguo-rag/config/manual-roster-seeds.json")
DEFAULT_WIKI_COURTESY_ALIASES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/romance-courtesy-aliases.json")
DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
SOURCE_REF_RE = re.compile(r"^(?P<chapter>\d{3})#p(?P<paragraph>\d+)$")
ALLOWED_ANSWERS = {"A", "B", "C", "D"}
RELATION_TYPE_ALIASES = {
    "attack": "confronts",
    "attacks": "confronts",
    "battle": "confronts",
    "beats": "confronts",
    "opponent": "confronts",
    "enemy": "confronts",
    "rival": "confronts",
    "fight": "confronts",
    "fights": "confronts",
    "ally": "allies",
    "allied": "allies",
    "serve": "serves",
    "served": "serves",
    "command": "commands",
    "commanded": "commands",
}
LOCATION_TERMS = [
    "虎牢關",
    "汜水關",
    "大興山下",
    "大興山",
    "青州",
    "廣宗",
    "潁川",
    "長社",
    "曲陽",
    "陽城",
    "宛城",
    "平原縣",
    "平原",
    "涿郡",
    "洛陽",
    "長安",
    "下邳",
    "小沛",
    "徐州",
    "荊州",
    "襄陽",
    "江夏",
    "南徐",
    "甘露寺",
    "長坂坡",
    "長阪坡",
    "長坂橋",
    "白門樓",
    "盤河橋",
    "界橋",
    "梁東",
    "溫明園",
    "園門外",
    "園門",
    "丞相府",
    "相府",
    "都門",
    "城外",
    "關下",
    "關前",
    "關上",
    "西寨",
    "大寨",
    "陣前",
    "寨",
]
GENERIC_LOCATION_TERMS = {"寨", "城外", "關下", "關前", "關上", "園門", "相府", "都門", "陣前"}
LOCATION_ALIASES = {
    "园门外": "園門外",
    "园门": "園門",
    "虎牢关": "虎牢關",
    "汜水关": "汜水關",
    "涿郡": "涿郡",
    "青州": "青州",
}
BATTLE_VERBS = ["搦戰", "迎敵", "迎戰", "廝殺", "殺", "戰", "刺", "斬", "攻", "追", "敗", "趕"]
DIRECT_BATTLE_PAIR_TERMS = ["交鋒", "廝殺", "交戰", "親戰", "敵住", "大戰", "搦戰", "迎敵", "迎戰", "便戰", "酣戰", "直取", "截住", "追襲", "追趕", "殺敗", "攻打", "刺", "斬"]
INTERNAL_CONFLICT_TERMS = ["反", "叛", "背", "內訌", "自相", "攻殺", "謀害", "殺主", "降而復叛"]
COMMAND_VERBS = ["令", "領", "將", "同", "守", "屯", "紮", "撥", "引軍"]
BROTHERHOOD_IDS = {"liu-bei", "guan-yu", "zhang-fei"}
COOPERATIVE_TERMS = ["同", "共", "一齊", "三人", "我等", "引軍", "親赴血戰", "救了", "急止", "連夜"]
APPOINTMENT_TERMS = ["薦爲", "表陳", "前功", "司馬", "縣令", "現居何職", "白身"]
DECLARATIVE_BATTLE_TERMS = ["不就這裏", "更待何時", "活拿", "斬了", "已斬", "要斬", "便要提刀"]
COACTION_BATTLE_TERMS = ["斬關入內", "各選精兵", "使一弓手出戰", "必被華雄所笑", "不見了曹操", "復殺入城來", "特來求救"]
COMMAND_FALSE_POSITIVE_TERMS = [
    "各選精兵",
    "同舍兄弟",
    "平原令",
    "呼玄德出",
    "具道來意",
    "將玄德功勞",
    "功勞，并其出身",
    "遣兵追襲",
    "星夜來趕董卓",
    "趕董卓",
    "留夏侯惇、曹仁守",
    "令許褚、典韋爲先鋒",
    "操先令許褚、曹仁、典韋",
    "便令許褚出馬與徐晃交鋒",
    "使張飛奪了我好馬",
    "同救起曹操",
    "接著，言呂佈勢大",
    "傲慢袁紹手下將士",
    "令其另領一軍在後",
    "另領一軍在後",
    "來投曹操",
    "回兵已過滕縣",
    "召副將",
    "勸令解和",
    "遺書於曹操",
    "領徐州牧",
    "情願送還馬匹",
    "兩相罷兵",
    "約會曹操",
    "先差夏侯惇",
    "前來保駕",
    "特來相投",
    "來相投",
    "前奔許都",
    "先使孫乾",
    "遣人至",
    "喚入問之",
]
INTENT_ONLY_BATTLE_TERMS = ["便欲殺之", "要便住在此", "自投別處", "正可乘勢追襲"]
REPORTED_BATTLE_TERMS = ["近聞", "欲往助之", "昔曾師事", "奪了我好馬", "尚自抵賴", "流矢所中而死", "青州之兵", "劫掠民家", "送還馬匹", "兩相罷兵", "情願送還馬匹"]
REVIEW_ONLY_SUMMARY_TERMS = ["送還馬匹", "兩相罷兵", "情願送還馬匹", "勸令解和", "解和", "特來相投", "來相投", "前奔許都", "遣人至"]
DELEGATED_COMBAT_TERMS = ["遣副將", "副將高升", "使張飛擊之"]
SIEGE_ASSIGNMENT_TERMS = ["攻打南門", "打北門", "打西門", "留東門", "攻城西南角", "率三軍掩殺", "一齊趕上", "賊兵大敗"]
ALLY_ATTACK_TERMS = ["自跟", "同", "與", "合兵一處"]
PEER_DEPLOYMENT_TERMS = [
    "領夏侯惇",
    "星夜來趕董卓",
    "撥夏侯惇引軍在左",
    "爲左軍",
    "爲右軍",
    "爲合後",
    "皆爲將軍",
    "留夏侯惇、曹仁守",
    "領三百鐵騎",
    "帶曹洪",
    "選馬步",
    "領兵左出",
    "領兵右出",
    "自領中軍沖陣",
    "保護老小",
    "爲首三員大將",
    "引軍刺斜殺來",
    "接應周瑜",
    "領軍襲取曲阿",
    "各引兵千餘來助",
    "皆走",
    "同玄德、關、張",
    "領軍四千",
    "在公部下相助",
    "救出曹操",
    "來救援",
    "引軍來救援",
    "殺入曹兵寨邊",
]
ALLIED_PEER_GROUPS = [
    {"cao-cao", "cao-hong", "cao-ren", "xiahou-dun", "xiahou-yuan", "li-dian", "le-jin", "xu-zhu", "dian-wei", "yu-jin", "lv-qian", "cheng-yu", "xun-yu"},
    {"liu-bei", "guan-yu", "zhang-fei", "zhao-yun"},
    {"sun-quan", "zhou-yu", "cheng-pu", "chen-wu"},
]
DIRECTED_COMMAND_VERBS = ["使", "令", "遣", "撥"]
GENERAL_ALIASES = {
    "cao-cao": ["曹操", "操", "孟德"],
    "dong-zhuo": ["董卓", "卓", "丞相"],
    "gongsun-zan": ["公孫瓚", "瓚"],
    "guan-yu": ["關羽", "關公", "雲長"],
    "hua-xiong": ["華雄", "雄"],
    "huangfu-song": ["皇甫嵩"],
    "li-jue": ["李傕", "李催"],
    "li-ru": ["李儒", "儒"],
    "li-su": ["李肅", "肅"],
    "liu-bei": ["劉備", "玄德", "備"],
    "zhao-yun": ["趙雲", "子龍"],
    "liu-yan": ["劉焉"],
    "lu-bu": ["呂布", "布", "奉先", "溫侯"],
    "sun-jian": ["孫堅", "堅", "文臺"],
    "yuan-shao": ["袁紹", "紹"],
    "yuan-shu": ["袁術", "術", "公路"],
    "zhang-bao-enemy": ["張寶"],
    "zhang-fei": ["張飛", "飛"],
    "zhang-ji": ["張濟"],
    "zhang-jue": ["張角"],
    "zhang-liang-enemy": ["張梁"],
    "zhu-jun-han": ["朱雋", "朱儁", "雋"],
}
SINGLE_CHAR_ALIAS_ALLOWED = {"dong-zhuo", "gongsun-zan", "li-ru", "li-su", "lu-bu", "zhu-jun-han"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Expand event review source context and ask DeepSeek for review-only edit proposals.")
    parser.add_argument("--answers", default=str(DEFAULT_ANSWERS_PATH), help="event-review-answers*.todo.json path")
    parser.add_argument("--chapters-root", default=str(DEFAULT_CHAPTERS_ROOT), help="Chapter markdown root")
    parser.add_argument("--people-path", default=str(DEFAULT_PEOPLE_PATH), help="Optional person registry for uid/name hints")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="Optional manual roster seed aliases")
    parser.add_argument("--wiki-courtesy-aliases", default=str(DEFAULT_WIKI_COURTESY_ALIASES_PATH), help="Optional generated aliases from Romance character list courtesy-name column")
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH), help="Optional stable knowledge bootstrap JSON path")
    parser.add_argument("--output-root", default=None, help="Output directory. Defaults to answers file directory")
    parser.add_argument("--reviewer-preset", default=None, help="Reviewer preset: agent, fast, balanced, quality/deepseek, or hints-only")
    parser.add_argument("--reviewer-provider", default=None, help="Reviewer provider: agent-reviewer, ollama, or hints-only")
    parser.add_argument("--api-url", default=None, help="Ollama /api/chat URL")
    parser.add_argument("--model", default=None, help="Ollama model")
    parser.add_argument("--window-before", type=int, default=2, help="Paragraphs before each source ref")
    parser.add_argument("--window-after", type=int, default=2, help="Paragraphs after each source ref")
    parser.add_argument("--timeout-ms", type=int, default=None, help=f"Override reviewer preset timeout. Legacy default was {DEFAULT_REASONING_TIMEOUT_MS}.")
    parser.add_argument("--num-ctx", type=int, default=None, help=f"Override reviewer preset context length. Legacy default was {DEFAULT_REASONING_NUM_CTX}.")
    parser.add_argument("--num-predict", type=int, default=None, help="Override reviewer preset generated token limit.")
    parser.add_argument("--temperature", type=float, default=None, help=f"Override reviewer preset temperature. Legacy default was {DEFAULT_REASONING_TEMPERATURE}.")
    parser.add_argument("--top-p", type=float, default=None, help=f"Override reviewer preset top_p. Legacy default was {DEFAULT_REASONING_TOP_P}.")
    parser.add_argument("--repeat-penalty", type=float, default=None, help=f"Override reviewer preset repeat penalty. Legacy default was {DEFAULT_REASONING_REPEAT_PENALTY}.")
    parser.add_argument("--batch", action="store_true", help="Send all questions in one request. Default is one request per question for better quality.")
    parser.add_argument("--prompt-only", action="store_true", help="Only write expanded context bundle; do not call DeepSeek")
    parser.add_argument("--fill-answers", action="store_true", help="Fill answer and edits in enriched todo when proposal passes gates")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def fail_cli(message: str) -> None:
    raise SystemExit(f"[enrich_event_review_context] FAIL {message}")


def read_required_json(path: Path, *, description: str) -> dict:
    if not path.exists():
        fail_cli(
            f"missing {description}: {path}. "
            "Run generate_event_review_choices.py first or pass --answers <event-review-answers.*.todo.json>."
        )
    try:
        return read_json(path)
    except json.JSONDecodeError as exc:
        fail_cli(f"invalid JSON in {description}: {path} ({exc})")
    except OSError as exc:
        fail_cli(f"cannot read {description}: {path} ({exc})")
    return {}


def ensure_required_directory(path: Path, *, description: str) -> None:
    if not path.exists() or not path.is_dir():
        fail_cli(f"missing {description}: {path}")


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def output_paths(output_root: Path, answers_path: Path) -> dict[str, Path]:
    stem = answers_path.name.replace("event-review-answers", "event-review-context").replace(".todo.json", "")
    answer_stem = answers_path.name.replace(".todo.json", ".enriched.todo.json")
    return {
        "bundle": output_root / f"{stem}-bundle.json",
        "report": output_root / f"{stem}-report.json",
        "markdown": output_root / f"{stem}-report.md",
        "raw": output_root / f"{stem}-raw.json",
        "enrichedAnswers": output_root / answer_stem,
    }


def ensure_outputs(paths: dict[str, Path], overwrite: bool, prompt_only: bool) -> None:
    for path in paths.values():
        path.parent.mkdir(parents=True, exist_ok=True)
    targets = [paths["bundle"]]
    if not prompt_only:
        targets.extend([paths["report"], paths["markdown"], paths["raw"], paths["enrichedAnswers"]])
    existing = [path for path in targets if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def parse_source_ref(source_ref: str) -> tuple[str, int] | None:
    match = SOURCE_REF_RE.match(str(source_ref))
    if not match:
        return None
    return match.group("chapter"), int(match.group("paragraph"))


def load_chapter_paragraphs(chapters_root: Path, chapter_id: str) -> list[str]:
    path = chapters_root / f"{chapter_id}.md"
    if not path.exists():
        return []
    return [paragraph.strip() for paragraph in path.read_text(encoding="utf-8").split("\n\n") if paragraph.strip()]


def add_name_hint(hints: dict[str, list[str]], general_id: str, alias: str) -> None:
    cleaned = str(alias or "").strip()
    if not general_id or not cleaned:
        return
    hints.setdefault(general_id, [])
    if cleaned not in hints[general_id]:
        hints[general_id].append(cleaned)


def load_person_name_hints(people_path: Path, manual_roster_path: Path | None = None, wiki_courtesy_aliases_path: Path | None = None) -> dict[str, list[str]]:
    hints = {person_id: list(aliases) for person_id, aliases in GENERAL_ALIASES.items()}
    if people_path.exists():
        try:
            people_payload = json.loads(people_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            people_payload = []
        people = people_payload.get("persons") if isinstance(people_payload, dict) else people_payload
        if isinstance(people, list):
            for person in people:
                if not isinstance(person, dict):
                    continue
                uid = str(person.get("uid") or person.get("id") or "").strip()
                add_name_hint(hints, uid, str(person.get("name") or ""))
                for alias in person.get("alias") or []:
                    add_name_hint(hints, uid, str(alias))
    if manual_roster_path and manual_roster_path.exists():
        try:
            manual = json.loads(manual_roster_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            manual = {}
        for entry in manual.get("entries") or []:
            if not isinstance(entry, dict):
                continue
            general_id = str(entry.get("generalId") or "").strip()
            add_name_hint(hints, general_id, str(entry.get("name") or ""))
            for alias in entry.get("alias") or []:
                add_name_hint(hints, general_id, str(alias))
    if wiki_courtesy_aliases_path and wiki_courtesy_aliases_path.exists():
        try:
            alias_payload = json.loads(wiki_courtesy_aliases_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            alias_payload = {}
        for entry in alias_payload.get("entries") or []:
            if not isinstance(entry, dict):
                continue
            general_id = str(entry.get("generalId") or "").strip()
            for alias in entry.get("wikiNames") or []:
                add_name_hint(hints, general_id, str(alias))
            for alias in entry.get("courtesyAliases") or []:
                add_name_hint(hints, general_id, str(alias))
    return hints


def aliases_for_general(general_id: str, name_hints: dict[str, list[str]]) -> list[str]:
    aliases = [
        alias
        for alias in name_hints.get(general_id, [])
        if alias and (len(alias) > 1 or general_id in SINGLE_CHAR_ALIAS_ALLOWED)
    ]
    return sorted(set(aliases), key=len, reverse=True)


def sentence_fragments(text: str) -> list[str]:
    return [fragment.strip() for fragment in re.split(r"(?<=[。！？；;])", text) if fragment.strip()]


def ids_in_text(text: str, general_ids: list[str], name_hints: dict[str, list[str]]) -> list[str]:
    found: list[str] = []
    for general_id in general_ids:
        if any(alias and alias in text for alias in aliases_for_general(general_id, name_hints)):
            found.append(general_id)
    return found


def infer_relation_type(sentence: str, from_id: str, to_id: str) -> str:
    if {from_id, to_id}.issubset(BROTHERHOOD_IDS) and any(term in sentence for term in COOPERATIVE_TERMS):
        return "mentions"
    if any(term in sentence for term in APPOINTMENT_TERMS):
        return "mentions"
    if from_id == "dong-zhuo" and any(verb in sentence for verb in COMMAND_VERBS):
        return "commands"
    if {from_id, to_id} == {"dong-zhuo", "lu-bu"} and any(term in sentence for term in ["父親", "主公", "投", "降"]):
        return "serves"
    if any(verb in sentence for verb in BATTLE_VERBS):
        return "confronts"
    if any(verb in sentence for verb in COMMAND_VERBS):
        return "commands"
    return "mentions"


def relationship_from_sentence(source_ref: str, sentence: str, general_ids: list[str], name_hints: dict[str, list[str]], is_anchor: bool, source_order: int) -> list[dict]:
    present_ids = ids_in_text(sentence, general_ids, name_hints)
    if len(present_ids) < 2:
        return []
    edges: list[dict] = []
    for from_id in present_ids:
        for to_id in present_ids:
            if from_id == to_id:
                continue
            if has_direct_confrontation(sentence, from_id, to_id, name_hints):
                relation_type = "confronts"
            elif has_directed_command(sentence, from_id, to_id, name_hints):
                relation_type = "commands"
            elif has_directed_command(sentence, to_id, from_id, name_hints):
                relation_type = "mentions"
            else:
                relation_type = infer_relation_type(sentence, from_id, to_id)
            if relation_type == "commands" and "dong-zhuo" in present_ids and from_id != "dong-zhuo":
                continue
            if relation_type == "mentions" and len(edges) >= 2:
                continue
            confidence = 0.82 if relation_type != "mentions" else 0.58
            edges.append({
                "fromId": from_id,
                "toId": to_id,
                "type": relation_type,
                "evidenceRefs": [source_ref],
                "edgeConfidence": confidence,
                "edgeStrength": 0.7 if relation_type != "mentions" else 0.35,
                "evidenceText": compact_text(sentence, 160),
                "isAnchor": is_anchor,
                "sourceOrder": source_order,
            })
    return edges[:6]


def has_directed_command(sentence: str, from_id: str, to_id: str, name_hints: dict[str, list[str]]) -> bool:
    from_aliases = aliases_for_general(from_id, name_hints)
    to_aliases = aliases_for_general(to_id, name_hints)
    for from_alias in from_aliases:
        for to_alias in to_aliases:
            for verb in DIRECTED_COMMAND_VERBS:
                if f"{from_alias}{verb}{to_alias}" in sentence:
                    return True
                if re.search(re.escape(from_alias) + r".{0,18}" + re.escape(verb) + r".{0,32}" + re.escape(to_alias), sentence):
                    return True
    return False


def has_direct_confrontation(sentence: str, from_id: str, to_id: str, name_hints: dict[str, list[str]]) -> bool:
    from_aliases = aliases_for_general(from_id, name_hints)
    to_aliases = aliases_for_general(to_id, name_hints)
    verbs = r"(?:交鋒|廝殺|交戰|親戰|敵住|便戰|酣戰|直取)"
    for from_alias in from_aliases:
        for to_alias in to_aliases:
            if re.search(re.escape(from_alias) + r".{0,20}(?:與|和|同)" + re.escape(to_alias) + r".{0,12}" + verbs, sentence):
                return True
            if re.search(re.escape(to_alias) + r".{0,20}(?:與|和|同)" + re.escape(from_alias) + r".{0,12}" + verbs, sentence):
                return True
            if re.search(re.escape(from_alias) + r".{0,14}" + verbs + r".{0,14}" + re.escape(to_alias), sentence):
                return True
    return False


def load_stable_knowledge(path: Path) -> dict:
    if not path.exists():
        return {}
    return read_json(path)


def question_chapter_no(question: dict) -> int | None:
    try:
        if question.get("chapterNo") is not None:
            return int(question.get("chapterNo"))
    except (TypeError, ValueError):
        pass
    for source_ref in question.get("sourceRefs") or []:
        match = SOURCE_REF_RE.match(str(source_ref))
        if match:
            return int(match.group("chapter"))
    return None


def chapter_in_range(chapter_no: int | None, chapter_range: list[Any] | None) -> bool:
    if chapter_no is None or not isinstance(chapter_range, list) or len(chapter_range) != 2:
        return False
    try:
        start = int(chapter_range[0])
        end = int(chapter_range[1])
    except (TypeError, ValueError):
        return False
    return start <= chapter_no <= end


def edge_is_valid_for_chapter(edge: dict, chapter_no: int | None) -> bool:
    if chapter_no is None:
        return True
    valid_from = edge.get("validFromChapter")
    valid_to = edge.get("validToChapter")
    try:
        if valid_from is not None and chapter_no < int(valid_from):
            return False
        if valid_to is not None and chapter_no > int(valid_to):
            return False
    except (TypeError, ValueError):
        return False
    return True


def text_supports_stable_relationship(question: dict, relation_type: str) -> bool:
    text = "".join([
        str(question.get("currentSummary") or ""),
        str(question.get("currentSourceQuote") or ""),
        "".join(str(item.get("text") or "") for item in question.get("expandedContext") or []),
    ])
    compact = re.sub(r"\s+", "", text)
    relation_cues = {
        "sworn_sibling": ["結義", "桃園", "兄弟", "義兄", "義弟"],
        "sibling": ["兄", "弟", "兄弟", "弟兄"],
        "spouse": ["妻", "夫", "婚", "嫁", "娶", "夫人"],
        "parent_child": ["父", "子", "嗣", "太子", "公子", "其子"],
    }
    return any(term in compact for term in relation_cues.get(relation_type, []))


def build_stable_knowledge_hints(question: dict, stable_knowledge: dict) -> dict:
    if not stable_knowledge:
        return {"locationCandidates": [], "relationshipCandidates": [], "stableKnowledgeHints": {}}
    chapter_no = question_chapter_no(question)
    general_ids = set(question.get("generalIds") or [])
    source_refs = [str(ref) for ref in question.get("sourceRefs") or []]
    if not source_refs:
        source_refs = [str(item.get("sourceRef")) for item in question.get("expandedContext") or [] if item.get("isAnchor") and item.get("sourceRef")]

    stable_relationships = []
    relationship_candidates = []
    for edge in stable_knowledge.get("relationshipEdges") or []:
        if edge.get("reviewStatus") != "ready":
            continue
        endpoints = {edge.get("fromId"), edge.get("toId")}
        relation_type = str(edge.get("type") or "")
        if not endpoints.issubset(general_ids) or not edge_is_valid_for_chapter(edge, chapter_no):
            continue
        stable_relationships.append(edge)
        if source_refs and text_supports_stable_relationship(question, relation_type):
            relationship_candidates.append({
                "fromId": edge.get("fromId"),
                "toId": edge.get("toId"),
                "type": relation_type,
                "evidenceRefs": source_refs[:2],
                "edgeConfidence": min(float(edge.get("edgeConfidence") or 0.78), 0.9),
                "edgeStrength": 0.7,
                "evidenceText": f"stableKnowledgeBootstrap:{relation_type}",
                "isAnchor": True,
                "sourceOrder": 0,
                "sourceLayer": "stable-knowledge-bootstrap",
            })

    stable_locations = []
    location_candidates = []
    for seed in stable_knowledge.get("eventLocationSeeds") or []:
        if not chapter_in_range(chapter_no, seed.get("chapterRange")):
            continue
        participant_ids = set(seed.get("participantIds") or [])
        if general_ids and not general_ids.intersection(participant_ids):
            continue
        stable_locations.append(seed)
        for location in seed.get("locationNames") or []:
            if not source_refs:
                continue
            location_candidates.append({
                "location": location,
                "evidenceRefs": source_refs[:2],
                "isAnchor": True,
                "sourceLayer": "stable-knowledge-bootstrap",
                "eventTag": seed.get("eventTag"),
            })

    stable_social_roles = []
    for role in stable_knowledge.get("socialRoleSeeds") or []:
        if role.get("generalId") in general_ids:
            stable_social_roles.append(role)

    stable_auto_social_roles = []
    for role in stable_knowledge.get("autoSocialRoleSeeds") or []:
        if role.get("generalId") in general_ids:
            stable_auto_social_roles.append(role)

    stable_plain_facts = []
    for fact in stable_knowledge.get("plainFactProposals") or []:
        if fact.get("generalId") in general_ids:
            stable_plain_facts.append(fact)

    stable_basic_profiles = []
    for profile in stable_knowledge.get("basicProfileSeeds") or []:
        if profile.get("generalId") in general_ids:
            stable_basic_profiles.append(profile)

    stable_plain_relationships = []
    for proposal in stable_knowledge.get("plainRelationshipProposals") or []:
        endpoints = {proposal.get("fromId"), proposal.get("toId")}
        if endpoints.issubset(general_ids):
            stable_plain_relationships.append(proposal)

    stable_female_profiles = []
    for profile in stable_knowledge.get("femalePriorityProfiles") or []:
        if profile.get("generalId") in general_ids:
            stable_female_profiles.append(profile)

    stable_identities = []
    for identity in stable_knowledge.get("identitySeeds") or []:
        if identity.get("generalId") in general_ids:
            stable_identities.append(identity)

    return {
        "locationCandidates": location_candidates[:4],
        "relationshipCandidates": relationship_candidates[:4],
        "stableKnowledgeHints": {
            "identitySeeds": stable_identities[:12],
            "basicProfileSeeds": stable_basic_profiles[:12],
            "femalePriorityProfiles": stable_female_profiles[:8],
            "relationshipEdges": stable_relationships[:8],
            "plainRelationshipProposals": stable_plain_relationships[:12],
            "eventLocationSeeds": stable_locations[:4],
            "socialRoleSeeds": stable_social_roles[:8],
            "autoSocialRoleSeeds": stable_auto_social_roles[:12],
            "plainFactProposals": stable_plain_facts[:12],
            "timeScopedAliasHints": stable_knowledge.get("timeScopedAliasHints") or [],
            "promotionPolicy": stable_knowledge.get("promotionPolicy") or {},
        },
    }


def build_candidate_hints(question: dict, name_hints: dict[str, list[str]], stable_knowledge: dict | None = None) -> dict:
    general_ids = question.get("generalIds") or []
    focus_general_id = question.get("focusGeneralId")
    expanded_context = question.get("expandedContext") or []
    location_candidates: list[dict] = []
    relationship_candidates: list[dict] = []
    current_edits = question.get("currentEdits") or {}
    current_location = normalize_location(current_edits.get("location"))
    if current_location:
        location_candidates.append({
            "location": current_location,
            "evidenceRefs": question.get("sourceRefs") or [],
            "isAnchor": True,
            "sourceLayer": "candidate-edits",
        })
    for edge in current_edits.get("relationshipEdges") or []:
        relationship_candidates.append({
            **edge,
            "isAnchor": True,
            "sourceOrder": 0,
            "sourceLayer": "candidate-edits",
            "evidenceText": compact_text(str(question.get("currentSourceQuote") or question.get("currentSummary") or ""), 160),
        })
    seen_locations: set[tuple[str, str]] = set()
    seen_edges: set[tuple[str, str, str, str]] = set()
    for source_order, item in enumerate(expanded_context):
        source_ref = item.get("sourceRef")
        text = str(item.get("text") or "")
        for term in LOCATION_TERMS:
            if term not in text:
                continue
            key = (term, source_ref)
            if key in seen_locations:
                continue
            seen_locations.add(key)
            location_candidates.append({
                "location": term,
                "evidenceRefs": [source_ref],
                "isAnchor": bool(item.get("isAnchor")),
            })
        for sentence in sentence_fragments(text):
            for edge in relationship_from_sentence(source_ref, sentence, general_ids, name_hints, bool(item.get("isAnchor")), source_order):
                edge_key = (edge["fromId"], edge["toId"], edge["type"], source_ref)
                if edge_key in seen_edges:
                    continue
                seen_edges.add(edge_key)
                relationship_candidates.append(edge)
    location_candidates.sort(key=location_candidate_priority)
    relationship_candidates.sort(key=lambda item: (
        focus_general_id not in {item.get("fromId"), item.get("toId")},
        not item.get("isAnchor"),
        item.get("type") == "mentions",
        -float(item.get("edgeConfidence") or 0),
        int(item.get("sourceOrder") or 0),
    ))
    stable_hints = build_stable_knowledge_hints(question, stable_knowledge or {})
    location_candidates.extend(stable_hints["locationCandidates"])
    relationship_candidates.extend(stable_hints["relationshipCandidates"])
    location_candidates.sort(key=location_candidate_priority)
    relationship_candidates.sort(key=lambda item: (
        focus_general_id not in {item.get("fromId"), item.get("toId")},
        item.get("sourceLayer") != "stable-knowledge-bootstrap",
        not item.get("isAnchor"),
        item.get("type") == "mentions",
        -float(item.get("edgeConfidence") or 0),
        int(item.get("sourceOrder") or 0),
    ))
    return {
        "locationCandidates": location_candidates[:8],
        "relationshipCandidates": relationship_candidates[:10],
        "stableKnowledgeHints": stable_hints["stableKnowledgeHints"],
    }


def location_candidate_priority(item: dict) -> tuple:
    location = normalize_location(item.get("location"))
    is_generic = location in GENERIC_LOCATION_TERMS
    preferred_order = {"虎牢關": 0, "汜水關": 1, "園門外": 2, "陽城": 3, "潁川": 4, "廣宗": 5}
    return (
        is_generic,
        not item.get("isAnchor"),
        preferred_order.get(location or "", 50),
        len(location or ""),
    )


def context_window_for_refs(source_refs: list[str], chapters_root: Path, before: int, after: int) -> list[dict]:
    windows: list[dict] = []
    seen: set[str] = set()
    for source_ref in source_refs:
        parsed = parse_source_ref(source_ref)
        if not parsed:
            continue
        chapter_id, paragraph_no = parsed
        paragraphs = load_chapter_paragraphs(chapters_root, chapter_id)
        if not paragraphs:
            continue
        start = max(1, paragraph_no - before)
        end = min(len(paragraphs), paragraph_no + after)
        for current_no in range(start, end + 1):
            ref = f"{chapter_id}#p{current_no}"
            if ref in seen:
                continue
            seen.add(ref)
            windows.append({
                "sourceRef": ref,
                "isAnchor": ref == source_ref,
                "text": compact_text(paragraphs[current_no - 1], 900),
            })
    return windows


def build_prompt_bundle(answers: dict, chapters_root: Path, before: int, after: int, name_hints: dict[str, list[str]], stable_knowledge: dict | None = None) -> dict:
    questions = []
    focus_general_id = answers.get("generalId")
    for question in answers.get("questions") or []:
        expanded_context = context_window_for_refs(question.get("sourceRefs") or [], chapters_root, before, after)
        prompt_question = {
            "candidateId": question.get("candidateId"),
            "eventKey": question.get("eventKey"),
            "chapterNo": question.get("chapterNo"),
            "sourceRefs": question.get("sourceRefs") or [],
            "generalIds": question.get("generalIds") or [],
            "focusGeneralId": focus_general_id,
            "nameHints": {
                general_id: aliases_for_general(general_id, name_hints)
                for general_id in question.get("generalIds") or []
            },
            "currentSummary": question.get("summary"),
            "currentSourceQuote": question.get("sourceQuote"),
            "currentEdits": question.get("edits") or {},
            "missingFields": question.get("missingFields") or [],
            "expandedContext": expanded_context,
        }
        prompt_question["candidateHints"] = build_candidate_hints(prompt_question, name_hints, stable_knowledge)
        questions.append(prompt_question)
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "event-review-context-enrichment",
        "canonicalWrites": False,
        "hardRules": [
            "Return JSON only.",
            "Do not publish or claim canonical writes.",
            "Return exactly one answers item for each provided question.",
            "Use only provided generalIds. Do not invent new general ids.",
            "Use only sourceRefs present in expandedContext.",
            "stableKnowledgeHints may boost confidence only when current sourceRefs and chapter range also match.",
            "identitySeeds, basicProfileSeeds, femalePriorityProfiles, plainRelationshipProposals, socialRoleSeeds, autoSocialRoleSeeds, and plainFactProposals are hints only; they cannot promote an answer to A without Mao Hant sourceRef support.",
            "If location or relationshipEdges cannot be inferred from expandedContext, recommend B or D, not A.",
            "If the expandedContext directly names a battlefield, pass, gate, camp, city, or outside-city battlefield, use it as location.",
            "For relationshipEdges, describe concrete relations between provided generalIds only, such as confronts, commands, serves, opposes, or allies.",
            "Keep reasons concise; do not expose chain-of-thought.",
        ],
        "expectedJsonContract": {
            "answers": [
                {
                    "eventKey": "string",
                    "recommendedAnswer": "A|B|C|D",
                    "confidence": "number",
                    "edits": {
                        "eventKey": "string|null",
                        "summary": "string|null",
                        "location": "string|null",
                        "relationshipEdges": [
                            {
                                "fromId": "string",
                                "toId": "string",
                                "type": "confronts|serves|betrays|commands|opposes|allies|mentions|other",
                                "evidenceRefs": ["string"],
                                "edgeConfidence": "number",
                                "edgeStrength": "number|null",
                            }
                        ],
                        "moodTags": ["string"],
                    },
                    "reasons": ["string"],
                    "risks": ["string"],
                }
            ],
            "pipelineNotes": ["string"],
        },
        "questions": questions,
    }


def build_system_prompt() -> str:
    return "\n".join([
        "You are DeepSeek R1 used as a local review sidecar for a Three Kingdoms event ETL pipeline.",
        "Your task is to read expanded source context and propose review answers plus edits.",
        "Return one compact JSON object only. Do not include markdown.",
        "Do not echo the input payload, task rules, or schema.",
        "Do not expose chain-of-thought. Use short Traditional Chinese conclusions in reasons and risks.",
        "A means the enriched candidate is sufficient to accept; B means accept only with edits or remaining ambiguity; C rejects; D defers.",
        "If context names a battlefield, pass, gate, camp, city, or outside-city battlefield, put that phrase in edits.location.",
        "If context says one provided general attacks, commands, serves, opposes, or confronts another provided general, put that in edits.relationshipEdges.",
        "If a question clearly contains a battle or deployment scene, extract summary, location, and relationshipEdges from the quoted context before recommending A.",
    ])


def bounded_list(value: Any, limit: int) -> list[Any]:
    return value[:limit] if isinstance(value, list) else []


def sanitize_edge(edge: Any, allowed_general_ids: set[str], allowed_source_refs: set[str]) -> dict | None:
    if not isinstance(edge, dict):
        return None
    from_id = str(edge.get("fromId") or edge.get("fromGeneralId") or edge.get("sourceId") or "").strip()
    to_id = str(edge.get("toId") or edge.get("toGeneralId") or edge.get("targetId") or "").strip()
    if from_id not in allowed_general_ids or to_id not in allowed_general_ids or from_id == to_id:
        return None
    evidence_refs = [ref for ref in bounded_list(edge.get("evidenceRefs"), 6) if ref in allowed_source_refs]
    if not evidence_refs and len(allowed_source_refs) == 1:
        evidence_refs = list(allowed_source_refs)
    if not evidence_refs:
        return None
    edge_confidence = edge.get("edgeConfidence")
    try:
        edge_confidence = max(0.0, min(float(edge_confidence), 1.0))
    except (TypeError, ValueError):
        edge_confidence = 0.6
    edge_strength_raw = edge.get("edgeStrength")
    try:
        edge_strength = None if edge_strength_raw is None else max(0.0, min(float(edge_strength_raw), 1.0))
    except (TypeError, ValueError):
        edge_strength = None
    relation_type = compact_text(str(edge.get("type") or "other"), 32)
    relation_type = RELATION_TYPE_ALIASES.get(relation_type.lower(), relation_type)
    return {
        "fromId": from_id,
        "toId": to_id,
        "type": relation_type,
        "evidenceRefs": evidence_refs,
        "edgeConfidence": edge_confidence,
        "edgeStrength": edge_strength,
    }


def answer_has_strong_edge(answer: dict, focus_general_id: str | None = None) -> bool:
    edits = answer.get("edits") or {}
    for edge in edits.get("relationshipEdges") or []:
        if (edge.get("type") or "") == "mentions":
            continue
        if focus_general_id and focus_general_id not in {edge.get("fromId"), edge.get("toId")}:
            continue
        if str(edge.get("fromId") or "").startswith("romance-person-") or str(edge.get("toId") or "").startswith("romance-person-"):
            continue
        if float(edge.get("edgeConfidence") or 0.0) < 0.75:
            continue
        edge_strength = edge.get("edgeStrength")
        if edge_strength is not None and float(edge_strength or 0.0) < 0.5:
            continue
        return True
    return False


def location_is_specific(location: Any) -> bool:
    location_text = normalize_location(location)
    return bool(location_text and location_text not in GENERIC_LOCATION_TERMS)


def answer_is_complete(answer: dict, focus_general_id: str | None = None) -> bool:
    edits = answer.get("edits") or {}
    return bool(edits.get("summary") and location_is_specific(edits.get("location")) and edits.get("relationshipEdges") and answer_has_strong_edge(answer, focus_general_id))


def summary_looks_poor(summary: Any) -> bool:
    text = str(summary or "")
    if not text.strip():
        return True
    if "battle scenario" in text.lower():
        return True
    ascii_count = sum(1 for char in text if ord(char) < 128 and char.isalpha())
    return ascii_count > max(12, len(text) * 0.35)


def summary_requires_review(summary: Any) -> bool:
    text = re.sub(r"\s+", "", str(summary or ""))
    return any(term in text for term in REVIEW_ONLY_SUMMARY_TERMS)


def normalize_location(value: Any) -> str | None:
    if isinstance(value, list):
        value = next((item for item in value if str(item).strip()), "")
    location = compact_text(str(value or ""), 48)
    location = re.split(r"[，,。；;：:]", location, maxsplit=1)[0].strip()
    location = LOCATION_ALIASES.get(location, location)
    if not location or SOURCE_REF_RE.match(location):
        return None
    if len(location) > 12:
        return None
    return location


def best_hint_location(question: dict, edges: list[dict] | None = None) -> str | None:
    hints = question.get("candidateHints") or {}
    candidates = hints.get("locationCandidates") or []
    edge_general_ids = {edge.get("fromId") for edge in edges or []} | {edge.get("toId") for edge in edges or []}
    if "hua-xiong" in edge_general_ids:
        for item in candidates:
            location = normalize_location(item.get("location"))
            if location == "汜水關":
                return location
    for item in candidates:
        location = normalize_location(item.get("location"))
        if location:
            return location
    return None


def hint_edges(question: dict, *, require_focus: bool) -> list[dict]:
    hints = question.get("candidateHints") or {}
    focus_general_id = question.get("focusGeneralId")
    allowed_source_refs = {item["sourceRef"] for item in question.get("expandedContext") or []}
    allowed_general_ids = set(question.get("generalIds") or [])
    edges: list[dict] = []
    for edge in hints.get("relationshipCandidates") or []:
        if (edge.get("type") or "") == "mentions":
            continue
        if not edge_hint_is_reviewable(edge):
            continue
        if require_focus and focus_general_id not in {edge.get("fromId"), edge.get("toId")}:
            continue
        sanitized = sanitize_edge(edge, allowed_general_ids, allowed_source_refs)
        if sanitized:
            edges.append(sanitized)
    return edges[:4]


def edge_hint_is_reviewable(edge: dict) -> bool:
    evidence_text = str(edge.get("evidenceText") or "")
    evidence_compact = re.sub(r"\s+", "", evidence_text)
    relation_type = str(edge.get("type") or "")
    if any(term in evidence_compact for term in APPOINTMENT_TERMS):
        return False
    if relation_type == "confronts" and any(term in evidence_compact for term in DECLARATIVE_BATTLE_TERMS):
        return False
    if relation_type == "confronts" and any(term in evidence_compact for term in INTENT_ONLY_BATTLE_TERMS):
        return False
    if relation_type == "confronts" and any(term in evidence_compact for term in REPORTED_BATTLE_TERMS):
        return False
    if relation_type == "confronts" and edge_is_same_faction_false_confront(edge, evidence_compact):
        return False
    if relation_type == "confronts" and not confront_edge_has_positive_battle_cue(edge, evidence_compact):
        return False
    if relation_type == "confronts" and any(term in evidence_compact for term in DELEGATED_COMBAT_TERMS) and "zhang-bao-enemy" in {edge.get("fromId"), edge.get("toId")}:
        return False
    if relation_type == "commands" and any(term in evidence_compact for term in DELEGATED_COMBAT_TERMS) and "zhang-bao-enemy" in {edge.get("fromId"), edge.get("toId")}:
        return False
    if relation_type == "confronts" and any(term in evidence_compact for term in SIEGE_ASSIGNMENT_TERMS):
        return False
    if relation_type == "confronts" and edge_is_allied_attack_pair(edge, evidence_compact):
        return False
    if relation_type in {"confronts", "commands"} and any(term in evidence_compact for term in COACTION_BATTLE_TERMS):
        return False
    if relation_type in {"confronts", "commands"} and edge_is_peer_deployment_pair(edge, evidence_compact):
        return False
    if relation_type == "commands" and edge_is_reverse_pronoun_command(edge, evidence_compact):
        return False
    if relation_type == "commands" and any(term in evidence_compact for term in COMMAND_FALSE_POSITIVE_TERMS):
        return False
    if relation_type == "confronts" and edge_has_abandoned_subject(edge, evidence_compact):
        return False
    return True


def edge_has_abandoned_subject(edge: dict, evidence_text: str) -> bool:
    for general_id in (edge.get("fromId"), edge.get("toId")):
        for alias in GENERAL_ALIASES.get(str(general_id), []):
            if alias and f"棄了{alias}" in evidence_text:
                return True
    return False


def confront_edge_has_positive_battle_cue(edge: dict, evidence_text: str) -> bool:
    if not any(term in evidence_text for term in DIRECT_BATTLE_PAIR_TERMS):
        return False
    if confront_edge_has_pair_specific_battle_cue(edge, evidence_text):
        return True
    return not edge_ids_share_allied_group(edge)


def confront_edge_has_pair_specific_battle_cue(edge: dict, evidence_text: str) -> bool:
    from_aliases = GENERAL_ALIASES.get(str(edge.get("fromId") or ""), [])
    to_aliases = GENERAL_ALIASES.get(str(edge.get("toId") or ""), [])
    if not from_aliases or not to_aliases:
        return False
    direct_verbs = r"(?:交鋒|廝殺|交戰|親戰|敵住|大戰|搦戰|迎敵|迎戰|便戰|酣戰|直取|截住|追襲|追趕|殺敗|攻打|刺|斬)"
    for from_alias in from_aliases:
        if not from_alias:
            continue
        for to_alias in to_aliases:
            if not to_alias:
                continue
            from_pat = re.escape(from_alias)
            to_pat = re.escape(to_alias)
            if re.search(from_pat + r".{0,24}(?:與|和|同)" + to_pat + r".{0,18}" + direct_verbs, evidence_text):
                return True
            if re.search(to_pat + r".{0,24}(?:與|和|同)" + from_pat + r".{0,18}" + direct_verbs, evidence_text):
                return True
            if re.search(from_pat + r".{0,32}" + direct_verbs + r".{0,18}" + to_pat, evidence_text):
                return True
            if re.search(to_pat + r".{0,32}" + direct_verbs + r".{0,18}" + from_pat, evidence_text):
                return True
    return False


def edge_ids_share_allied_group(edge: dict) -> bool:
    from_id = str(edge.get("fromId") or "")
    to_id = str(edge.get("toId") or "")
    if not from_id or not to_id:
        return False
    return any({from_id, to_id}.issubset(group) for group in ALLIED_PEER_GROUPS)


def edge_is_same_faction_false_confront(edge: dict, evidence_text: str) -> bool:
    from_id = str(edge.get("fromId") or "")
    to_id = str(edge.get("toId") or "")
    if not from_id or not to_id:
        return False
    if any(term in evidence_text for term in INTERNAL_CONFLICT_TERMS):
        return False
    return edge_ids_share_allied_group(edge) and not confront_edge_has_pair_specific_battle_cue(edge, evidence_text)


def edge_is_allied_attack_pair(edge: dict, evidence_text: str) -> bool:
    from_id = str(edge.get("fromId") or "")
    to_id = str(edge.get("toId") or "")
    if {from_id, to_id} == {"cao-cao", "huangfu-song"} and "討張梁" in evidence_text:
        return True
    if {from_id, to_id} == {"gongsun-zan", "zhao-yun"} and any(term in evidence_text for term in ["保公孫瓚", "瓚軍團團團圍裹", "瓚軍團團圍裹"]):
        return True
    if {from_id, to_id}.issubset({"liu-bei", "zhu-jun-han", "sun-jian"}) and any(term in evidence_text for term in SIEGE_ASSIGNMENT_TERMS):
        return True
    return False


def edge_is_peer_deployment_pair(edge: dict, evidence_text: str) -> bool:
    from_id = str(edge.get("fromId") or "")
    to_id = str(edge.get("toId") or "")
    if not from_id or not to_id:
        return False
    if not any(term in evidence_text for term in PEER_DEPLOYMENT_TERMS):
        return False
    for group in ALLIED_PEER_GROUPS:
        if not {from_id, to_id}.issubset(group):
            continue
        if from_id == "cao-cao" and any(term in evidence_text for term in ["操令", "操撥", "操先令", "操急令"]):
            return False
        if from_id == "liu-bei" and any(term in evidence_text for term in ["備令", "玄德使"]):
            return False
        return True
    return False


def edge_is_reverse_pronoun_command(edge: dict, evidence_text: str) -> bool:
    if "令其" not in evidence_text:
        return False
    from_pos = first_alias_position(str(edge.get("fromId") or ""), evidence_text)
    to_pos = first_alias_position(str(edge.get("toId") or ""), evidence_text)
    return from_pos is not None and to_pos is not None and from_pos > to_pos


def first_alias_position(general_id: str, evidence_text: str) -> int | None:
    positions = [evidence_text.find(alias) for alias in GENERAL_ALIASES.get(general_id, []) if alias and alias in evidence_text]
    return min(positions) if positions else None


def hint_summary(question: dict, location: str | None, edges: list[dict]) -> str | None:
    hints = question.get("candidateHints") or {}
    for candidate in hints.get("relationshipCandidates") or []:
        if edges and not any(
            candidate.get("fromId") == edge.get("fromId")
            and candidate.get("toId") == edge.get("toId")
            and candidate.get("evidenceRefs") == edge.get("evidenceRefs")
            for edge in edges
        ):
            continue
        evidence_text = compact_text(str(candidate.get("evidenceText") or ""), 120)
        if evidence_text:
            return compact_text(f"{location or '擴充上下文'}：{evidence_text}", 140)
    current_summary = compact_text(str(question.get("currentSummary") or ""), 140)
    return current_summary or None


def complete_answer_with_hints(answer: dict, question: dict) -> dict:
    edits = answer.get("edits") or {}
    location = edits.get("location")
    existing_edges = edits.get("relationshipEdges") or []
    hint_location = best_hint_location(question, existing_edges)
    if not location_is_specific(location) and location_is_specific(hint_location):
        location = hint_location
    if not location:
        location = hint_location
    edges = edits.get("relationshipEdges") or hint_edges(question, require_focus=True)
    summary = edits.get("summary")
    if summary_looks_poor(summary):
        summary = hint_summary(question, location, edges)
    if not edges:
        edges = hint_edges(question, require_focus=False)
    answer["edits"] = {
        **edits,
        "summary": summary,
        "location": location,
        "relationshipEdges": edges,
    }
    focus_general_id = question.get("focusGeneralId")
    if answer_is_complete(answer, focus_general_id) and answer.get("recommendedAnswer") in {"A", "B"}:
        answer["recommendedAnswer"] = "A"
        answer.setdefault("reasons", []).append("expanded context candidate hints completed required fields")
    if answer.get("recommendedAnswer") == "A" and summary_requires_review(summary):
        answer["recommendedAnswer"] = "B"
        answer.setdefault("risks", []).append("summary indicates truce/mediation context that requires human review")
    return answer


def sanitize_answer(raw_answer: Any, question_index: dict[str, dict]) -> dict:
    if not isinstance(raw_answer, dict):
        return {}
    event_key = str(raw_answer.get("eventKey") or "").strip()
    question = question_index.get(event_key)
    if not question:
        return {}
    allowed_source_refs = {item["sourceRef"] for item in question.get("expandedContext") or []}
    allowed_general_ids = set(question.get("generalIds") or [])
    raw_edits = raw_answer.get("edits") if isinstance(raw_answer.get("edits"), dict) else {}
    edges = [
        edge
        for edge in (sanitize_edge(edge, allowed_general_ids, allowed_source_refs) for edge in bounded_list(raw_edits.get("relationshipEdges"), 8))
        if edge is not None
    ]
    edits = {
        "eventKey": compact_text(str(raw_edits.get("eventKey") or event_key), 96),
        "summary": compact_text(str(raw_edits.get("summary") or ""), 140) or None,
        "location": normalize_location(raw_edits.get("location")),
        "relationshipEdges": edges,
        "moodTags": [compact_text(str(tag), 32) for tag in bounded_list(raw_edits.get("moodTags"), 6) if str(tag).strip()],
    }
    answer = str(raw_answer.get("recommendedAnswer") or "B").strip().upper()
    if answer not in ALLOWED_ANSWERS:
        answer = "B"
    sanitized = {
        "eventKey": event_key,
        "recommendedAnswer": answer,
        "confidence": safe_float(raw_answer.get("confidence"), 0.0),
        "edits": edits,
        "reasons": [compact_text(str(item), 120) for item in bounded_list(raw_answer.get("reasons"), 6)],
        "risks": [compact_text(str(item), 120) for item in bounded_list(raw_answer.get("risks"), 6)],
    }
    sanitized = complete_answer_with_hints(sanitized, question)
    if sanitized["recommendedAnswer"] == "A" and not answer_is_complete(sanitized, question.get("focusGeneralId")):
        sanitized["recommendedAnswer"] = "B"
        sanitized["risks"].append("required fields are still incomplete after sanitization")
    return sanitized


def safe_float(value: Any, fallback: float) -> float:
    try:
        return max(0.0, min(float(value), 1.0))
    except (TypeError, ValueError):
        return fallback


def sanitize_report(parsed: dict, prompt_bundle: dict) -> dict:
    question_index = {question.get("eventKey"): question for question in prompt_bundle.get("questions") or []}
    raw_answers = parsed.get("answers")
    if not isinstance(raw_answers, list) and parsed.get("eventKey") and (parsed.get("location") or parsed.get("relationshipEdges")):
        raw_answers = [{
            "eventKey": parsed.get("eventKey"),
            "recommendedAnswer": parsed.get("recommendedAnswer") or parsed.get("answer") or "B",
            "confidence": parsed.get("confidence") or 0.68,
            "edits": {
                "eventKey": parsed.get("eventKey"),
                "summary": parsed.get("summary") or parsed.get("eventSummary"),
                "location": parsed.get("location"),
                "relationshipEdges": parsed.get("relationshipEdges") or [],
                "moodTags": parsed.get("moodTags") or [],
            },
            "reasons": parsed.get("reasons") or ["local LLM returned a compact event object; normalized by sanitizer"],
            "risks": parsed.get("risks") or [],
        }]
    if not isinstance(raw_answers, list) and isinstance(parsed.get("edits"), dict):
        raw_answers = [{
            "eventKey": parsed.get("eventKey") or parsed["edits"].get("eventKey"),
            "recommendedAnswer": parsed.get("recommendedAnswer") or parsed.get("answer"),
            "confidence": parsed.get("confidence"),
            "edits": parsed.get("edits"),
            "reasons": parsed.get("reasons") or [],
            "risks": parsed.get("risks") or [],
        }]
    raw_answers = raw_answers if isinstance(raw_answers, list) else []
    answers = [
        answer
        for answer in (sanitize_answer(answer, question_index) for answer in bounded_list(raw_answers, 40))
        if answer
    ]
    answer_by_key: dict[str, dict] = {}
    for answer in answers:
        event_key = answer.get("eventKey")
        current = answer_by_key.get(event_key)
        focus_general_id = question_index.get(event_key, {}).get("focusGeneralId")
        if not current or (answer_is_complete(answer, focus_general_id), answer.get("confidence") or 0) > (answer_is_complete(current, focus_general_id), current.get("confidence") or 0):
            answer_by_key[event_key] = answer
    for event_key, question in question_index.items():
        if event_key in answer_by_key:
            continue
        fallback = complete_answer_with_hints({
            "eventKey": event_key,
            "recommendedAnswer": "B",
            "confidence": 0.72,
            "edits": {"eventKey": event_key, "summary": None, "location": None, "relationshipEdges": [], "moodTags": []},
            "reasons": ["DeepSeek did not return a legal answers item; source-grounded candidate hints were used for review."],
            "risks": [],
        }, question)
        if answer_is_complete(fallback, question.get("focusGeneralId")):
            answer_by_key[event_key] = fallback
    return {
        "answers": list(answer_by_key.values()),
        "pipelineNotes": [compact_text(str(item), 140) for item in bounded_list(parsed.get("pipelineNotes"), 10)],
    }


def apply_adapter_acceptance_policy(report: dict, adapter: ReviewerAdapter) -> dict:
    if adapter.preset != "fast":
        return report
    adjusted = json.loads(json.dumps(report, ensure_ascii=False))
    for answer in adjusted.get("answers") or []:
        if answer.get("recommendedAnswer") != "A":
            continue
        answer["recommendedAnswer"] = "B"
        answer.setdefault("risks", []).append("fast reviewer proposals require quality or human adjudication before A")
    adjusted.setdefault("pipelineNotes", []).append("fast reviewer preset keeps proposals at B to avoid quick-model relationship hallucinations")
    return adjusted


def strong_hint_edges(question: dict, *, require_focus: bool) -> list[dict]:
    focus_general_id = question.get("focusGeneralId")
    strong_edges: list[dict] = []
    for edge in hint_edges(question, require_focus=require_focus):
        if str(edge.get("fromId") or "").startswith("romance-person-") or str(edge.get("toId") or "").startswith("romance-person-"):
            continue
        if float(edge.get("edgeConfidence") or 0.0) < 0.75:
            continue
        edge_strength = edge.get("edgeStrength")
        if edge_strength is not None and float(edge_strength or 0.0) < 0.5:
            continue
        if require_focus and focus_general_id not in {edge.get("fromId"), edge.get("toId")}:
            continue
        strong_edges.append(edge)
    return strong_edges[:4]


def build_agent_reviewer_answer(question: dict) -> dict:
    edges = strong_hint_edges(question, require_focus=True) or strong_hint_edges(question, require_focus=False)
    location = best_hint_location(question, edges)
    summary = hint_summary(question, location, edges) or compact_text(str(question.get("currentSummary") or ""), 140)
    candidate_answer = {
        "eventKey": question.get("eventKey"),
        "recommendedAnswer": "B",
        "confidence": 0.74,
        "edits": {
            "eventKey": question.get("eventKey"),
            "summary": summary,
            "location": location,
            "relationshipEdges": edges,
            "moodTags": ["agent-reviewed"],
        },
        "reasons": [],
        "risks": [],
    }
    if location_is_specific(location):
        candidate_answer["reasons"].append(f"agent reviewer selected source-grounded location `{location}`")
    else:
        candidate_answer["risks"].append("no specific location candidate passed gate")
    if edges:
        candidate_answer["reasons"].append(f"agent reviewer selected {len(edges)} strong relationship edge(s)")
    else:
        candidate_answer["risks"].append("no strong relationship edge passed confidence gate")
    if summary:
        candidate_answer["reasons"].append("summary derived from candidate hint evidence text")
    else:
        candidate_answer["risks"].append("summary remains incomplete")
    if answer_is_complete(candidate_answer, question.get("focusGeneralId")):
        candidate_answer["recommendedAnswer"] = "A"
        candidate_answer["confidence"] = 0.86
    return candidate_answer


def build_agent_reviewer_parsed(prompt_bundle: dict) -> dict:
    return {
        "answers": [build_agent_reviewer_answer(question) for question in prompt_bundle.get("questions") or []],
        "pipelineNotes": ["agent reviewer used candidateHints, strict location gate, and strong relationship edge gate"],
    }


def merge_enriched_answers(original: dict, prompt_bundle: dict, report: dict, fill_answers: bool) -> dict:
    proposal_by_key = {answer.get("eventKey"): answer for answer in report.get("answers") or []}
    context_by_key = {question.get("eventKey"): question.get("expandedContext") or [] for question in prompt_bundle.get("questions") or []}
    enriched = json.loads(json.dumps(original, ensure_ascii=False))
    enriched["mode"] = "event-review-context-enriched"
    enriched["canonicalWrites"] = False
    enriched["contextExpansion"] = {
        "generatedAt": utc_now(),
        "fillAnswers": fill_answers,
        "note": "DeepSeek proposals are review-only and do not publish canonical events.",
    }
    for question in enriched.get("questions") or []:
        event_key = question.get("eventKey")
        proposal = proposal_by_key.get(event_key)
        question["expandedContext"] = context_by_key.get(event_key, [])
        question["deepseekContextProposal"] = proposal
        if proposal:
            question["suggestedAnswer"] = proposal.get("recommendedAnswer") or question.get("suggestedAnswer")
            question["edits"] = proposal.get("edits") or question.get("edits")
            if fill_answers:
                question["answer"] = proposal.get("recommendedAnswer")
    return enriched


def render_markdown(report: dict, prompt_bundle: dict) -> str:
    lines = [
        "# Event Review Context Enrichment",
        "",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Model: `{report.get('model')}`",
        f"- Canonical Writes: `{report['canonicalWrites']}`",
        f"- Questions: `{len(prompt_bundle.get('questions') or [])}`",
        "",
        "## Proposals",
        "",
    ]
    for answer in report.get("answers") or []:
        edits = answer.get("edits") or {}
        lines.extend([
            f"### `{answer.get('eventKey')}`",
            "",
            f"- Recommended Answer: `{answer.get('recommendedAnswer')}`",
            f"- Confidence: `{answer.get('confidence')}`",
            f"- Location: `{edits.get('location') or '-'}`",
            f"- Summary: {edits.get('summary') or '-'}",
            f"- Relationship Edges: `{len(edits.get('relationshipEdges') or [])}`",
            f"- Reasons: {'; '.join(answer.get('reasons') or []) or '-'}",
            f"- Risks: {'; '.join(answer.get('risks') or []) or '-'}",
            "",
        ])
    lines.extend(["## Pipeline Notes", ""])
    for note in report.get("pipelineNotes") or []:
        lines.append(f"- {note}")
    lines.append("")
    return "\n".join(lines)


def request_reasoning(
    *,
    adapter: ReviewerAdapter,
    prompt_bundle: dict,
    args: argparse.Namespace,
) -> tuple[dict, list[dict]]:
    raw_requests: list[dict] = []
    if adapter.provider == "agent-reviewer":
        parsed = build_agent_reviewer_parsed(prompt_bundle)
        sanitized = sanitize_report(parsed, prompt_bundle)
        return {
            "model": adapter.model,
            "payloadSummary": adapter.describe(),
            "reasoningTracePreview": "",
            **sanitized,
        }, [{"model": adapter.model, "adapter": adapter.describe(), "parsedJson": parsed, "skipped": "local-agent-reviewer"}]
    if not adapter.uses_llm:
        sanitized = sanitize_report({}, prompt_bundle)
        return {
            "model": adapter.model,
            "payloadSummary": adapter.describe(),
            "reasoningTracePreview": "",
            **sanitized,
        }, [{"model": adapter.model, "adapter": adapter.describe(), "skipped": "hints-only"}]
    if args.batch:
        result = adapter.request_json(
            system_prompt=build_system_prompt(),
            user_payload=prompt_bundle,
        )
        sanitized = apply_adapter_acceptance_policy(sanitize_report(result.parsedJson, prompt_bundle), adapter)
        raw_requests.append({
            "model": result.model,
            "adapter": adapter.describe(),
            "payloadSummary": result.payloadSummary,
            "reasoningTracePreview": result.reasoningTrace,
            "cleanedContentPreview": compact_text(result.cleanedContent, 1200),
            "parsedJson": result.parsedJson,
        })
        return {
            "model": result.model,
            "payloadSummary": result.payloadSummary,
            "reasoningTracePreview": result.reasoningTrace,
            **sanitized,
        }, raw_requests

    all_answers: list[dict] = []
    notes: list[str] = []
    last_model = adapter.model
    last_summary: dict = adapter.describe()
    traces: list[str] = []
    for question in prompt_bundle.get("questions") or []:
        single_bundle = build_single_question_payload(question)
        try:
            result = adapter.request_json(
                system_prompt=build_system_prompt(),
                user_payload=single_bundle,
            )
        except (OllamaReasoningError, RuntimeError) as exc:
            sanitized = apply_adapter_acceptance_policy(sanitize_report({}, {"questions": [question]}), adapter)
            all_answers.extend(sanitized["answers"])
            notes.append(f"{question.get('eventKey')}: reviewer request failed; used source-grounded candidate hints. {exc}")
            raw_requests.append({
                "eventKey": question.get("eventKey"),
                "model": adapter.model,
                "adapter": adapter.describe(),
                "error": str(exc),
            })
            continue
        sanitized = apply_adapter_acceptance_policy(sanitize_report(result.parsedJson, {"questions": [question]}), adapter)
        all_answers.extend(sanitized["answers"])
        notes.extend(sanitized["pipelineNotes"])
        last_model = result.model
        last_summary = result.payloadSummary
        if result.reasoningTrace:
            traces.append(result.reasoningTrace)
        raw_requests.append({
            "eventKey": question.get("eventKey"),
            "model": result.model,
            "adapter": adapter.describe(),
            "payloadSummary": result.payloadSummary,
            "reasoningTracePreview": result.reasoningTrace,
            "cleanedContentPreview": compact_text(result.cleanedContent, 1200),
            "parsedJson": result.parsedJson,
        })
    return {
        "model": last_model,
        "payloadSummary": last_summary,
        "reasoningTracePreview": compact_text("\n".join(traces), 1200),
        "answers": all_answers,
        "pipelineNotes": notes[:10],
    }, raw_requests


def build_single_question_payload(question: dict) -> dict:
    compact_question = compact_question_for_llm(question)
    return {
        "task": "Fill exactly one event review answer from expanded Three Kingdoms source context.",
        "canonicalWrites": False,
        "rules": [
            "Return JSON only with top-level keys answers and pipelineNotes. No extra top-level keys.",
            "answers must contain exactly one item for this question.",
            "Use only allowedGeneralIds in relationshipEdges.fromId/toId.",
            "Use only allowedSourceRefs in relationshipEdges.evidenceRefs.",
            "Do not invent people or source refs.",
            "If summary, location, and at least one legal relationshipEdge are complete, recommendedAnswer may be A.",
            "If any required field is still missing, recommendedAnswer must be B or D.",
            "Prefer candidateHints when their evidenceText/sourceRefs support the answer.",
            "Keep output short: at most 2 relationshipEdges, 1 reason, 1 risk, and no prose outside JSON.",
        ],
        "outputContract": {"answers": [{"eventKey": "same eventKey", "recommendedAnswer": "A|B|C|D", "confidence": 0.0, "edits": {"summary": "short zh-TW", "location": "source phrase or null", "relationshipEdges": [{"fromId": "allowedGeneralId", "toId": "allowedGeneralId", "type": "confronts|commands|serves|allies|mentions", "evidenceRefs": ["allowedSourceRef"], "edgeConfidence": 0.0}]}, "reasons": ["one short reason"], "risks": ["one short risk or empty"]}], "pipelineNotes": []},
        "allowedGeneralIds": compact_question.get("generalIds") or [],
        "allowedSourceRefs": [item.get("sourceRef") for item in compact_question.get("expandedContext") or []],
        "nameHints": compact_question.get("nameHints") or {},
        "candidateHints": compact_candidate_hints_for_llm(question.get("candidateHints") or {}),
        "question": compact_question,
    }


def compact_question_for_llm(question: dict) -> dict:
    return {
        "candidateId": question.get("candidateId"),
        "eventKey": question.get("eventKey"),
        "chapterNo": question.get("chapterNo"),
        "sourceRefs": question.get("sourceRefs") or [],
        "generalIds": question.get("generalIds") or [],
        "focusGeneralId": question.get("focusGeneralId"),
        "nameHints": {key: bounded_list(value, 4) for key, value in (question.get("nameHints") or {}).items()},
        "currentSummary": compact_text(question.get("currentSummary") or "", 220),
        "currentSourceQuote": compact_text(question.get("currentSourceQuote") or "", 300),
        "missingFields": question.get("missingFields") or [],
        "expandedContext": [
            {
                "sourceRef": item.get("sourceRef"),
                "isAnchor": item.get("isAnchor"),
                "text": compact_text(item.get("text") or "", 650),
            }
            for item in (question.get("expandedContext") or [])[:3]
        ],
    }


def compact_candidate_hints_for_llm(candidate_hints: dict) -> dict:
    stable = candidate_hints.get("stableKnowledgeHints") or {}

    def pick(row: dict, keys: list[str]) -> dict:
        return {key: row.get(key) for key in keys if row.get(key) not in (None, "", [], {})}

    basic_profiles = []
    for row in bounded_list(stable.get("basicProfileSeeds"), 8):
        stats = row.get("observedMentionStats") or {}
        basic_profiles.append({
            "generalId": row.get("generalId"),
            "name": row.get("name"),
            "coverageLevel": row.get("coverageLevel"),
            "mentionCount": stats.get("mentionCount"),
            "firstChapter": stats.get("firstChapter"),
            "roleActivityTags": bounded_list(row.get("roleActivityTags"), 4),
            "aptitudeTags": bounded_list(row.get("aptitudeTags"), 4),
            "affectTags": bounded_list(row.get("affectTags"), 4),
            "activitySeedHints": bounded_list(row.get("activitySeedHints"), 4),
            "decisionWeightHints": bounded_list(row.get("decisionWeightHints"), 4),
        })

    return {
        "locationCandidates": [pick(row, ["location", "evidenceRefs", "eventTag", "sourceLayer"]) for row in bounded_list(candidate_hints.get("locationCandidates"), 4)],
        "relationshipCandidates": [pick(row, ["fromId", "toId", "type", "evidenceRefs", "edgeConfidence", "edgeStrength", "sourceLayer"]) for row in bounded_list(candidate_hints.get("relationshipCandidates"), 6)],
        "stableKnowledgeHints": {
            "identitySeeds": [pick(row, ["generalId", "name", "aliases", "baseFaction", "title"]) for row in bounded_list(stable.get("identitySeeds"), 8)],
            "basicProfileSeeds": basic_profiles,
            "femalePriorityProfiles": [pick(row, ["generalId", "name", "archetype", "affectTags", "personalityTags", "interactionPriorities", "relationshipFocusIds"]) for row in bounded_list(stable.get("femalePriorityProfiles"), 4)],
            "relationshipEdges": [pick(row, ["fromId", "toId", "type", "evidenceRefs", "validFromChapter", "validToChapter", "edgeConfidence"]) for row in bounded_list(stable.get("relationshipEdges"), 6)],
            "plainRelationshipProposals": [pick(row, ["fromId", "toId", "proposedType", "reason", "evidenceTerms", "confidence"]) for row in bounded_list(stable.get("plainRelationshipProposals"), 6)],
            "eventLocationSeeds": [pick(row, ["eventTag", "chapterRange", "locationNames", "participantIds", "relationTypes"]) for row in bounded_list(stable.get("eventLocationSeeds"), 4)],
            "socialRoleSeeds": [pick(row, ["generalId", "name", "roleActivityTags", "decisionWeightHints"]) for row in bounded_list(stable.get("socialRoleSeeds"), 4)],
            "autoSocialRoleSeeds": [pick(row, ["generalId", "name", "roleActivityTags", "decisionWeightHints", "evidenceTerms"]) for row in bounded_list(stable.get("autoSocialRoleSeeds"), 6)],
            "plainFactProposals": [pick(row, ["generalId", "name", "factType", "roleActivityTags", "decisionWeightHints", "evidenceTerms"]) for row in bounded_list(stable.get("plainFactProposals"), 6)],
        },
    }


def main() -> None:
    args = parse_args()
    answers_path = Path(args.answers)
    output_root = Path(args.output_root) if args.output_root else answers_path.parent
    paths = output_paths(output_root, answers_path)
    answers = read_required_json(answers_path, description="event review answers")
    ensure_required_directory(Path(args.chapters_root), description="chapters root")
    ensure_outputs(paths, args.overwrite, args.prompt_only)
    name_hints = load_person_name_hints(
        Path(args.people_path),
        Path(args.manual_roster),
        Path(args.wiki_courtesy_aliases),
    )
    stable_knowledge = load_stable_knowledge(Path(args.stable_knowledge))
    prompt_bundle = build_prompt_bundle(answers, Path(args.chapters_root), max(args.window_before, 0), max(args.window_after, 0), name_hints, stable_knowledge)
    write_json(paths["bundle"], prompt_bundle)
    if args.prompt_only:
        print(f"[enrich_event_review_context] wrote {paths['bundle']}")
        print("[enrich_event_review_context] promptOnly=true")
        return

    adapter = resolve_reviewer_adapter(
        preset=args.reviewer_preset,
        provider=args.reviewer_provider,
        api_url=args.api_url,
        model=args.model,
        timeout_ms=args.timeout_ms,
        num_ctx=args.num_ctx,
        num_predict=args.num_predict,
        temperature=args.temperature,
        top_p=args.top_p,
        repeat_penalty=args.repeat_penalty,
    )
    try:
        reasoning, raw_requests = request_reasoning(adapter=adapter, prompt_bundle=prompt_bundle, args=args)
    except OllamaReasoningError as exc:
        raise SystemExit(f"[enrich_event_review_context] FAIL {exc}") from exc

    report = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "event-review-context-enrichment",
        "canonicalWrites": False,
        "reviewerAdapter": adapter.describe(),
        "model": reasoning["model"],
        "apiUrl": adapter.apiUrl,
        "requestMode": "batch" if args.batch else "per-question",
        "payloadSummary": reasoning["payloadSummary"],
        "reasoningTracePreview": reasoning["reasoningTracePreview"],
        "answers": reasoning["answers"],
        "pipelineNotes": reasoning["pipelineNotes"],
    }
    raw = {
        "model": reasoning["model"],
        "reviewerAdapter": adapter.describe(),
        "requestMode": report["requestMode"],
        "requests": raw_requests,
    }
    enriched_answers = merge_enriched_answers(answers, prompt_bundle, report, args.fill_answers)
    write_json(paths["report"], report)
    write_json(paths["raw"], raw)
    write_json(paths["enrichedAnswers"], enriched_answers)
    paths["markdown"].write_text(render_markdown(report, prompt_bundle), encoding="utf-8")
    print(f"[enrich_event_review_context] wrote {paths['bundle']}")
    print(f"[enrich_event_review_context] wrote {paths['report']}")
    print(f"[enrich_event_review_context] wrote {paths['enrichedAnswers']}")
    print(f"[enrich_event_review_context] proposals={len(report['answers'])} canonicalWrites=false")


if __name__ == "__main__":
    main()