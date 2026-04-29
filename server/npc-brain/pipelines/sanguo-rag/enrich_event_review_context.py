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
    request_ollama_reasoning_json,
    resolve_deepseek_model,
    resolve_ollama_api_url,
)


DEFAULT_ANSWERS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/event-review-answers.todo.json")
DEFAULT_CHAPTERS_ROOT = Path("artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters")
DEFAULT_PEOPLE_PATH = Path("assets/resources/data/person-registry.json")
SOURCE_REF_RE = re.compile(r"^(?P<chapter>\d{3})#p(?P<paragraph>\d+)$")
ALLOWED_ANSWERS = {"A", "B", "C", "D"}
RELATION_TYPE_ALIASES = {
    "attack": "confronts",
    "attacks": "confronts",
    "battle": "confronts",
    "beats": "confronts",
    "fight": "confronts",
    "fights": "confronts",
    "serve": "serves",
    "served": "serves",
    "command": "commands",
    "commanded": "commands",
}
LOCATION_TERMS = [
    "虎牢關",
    "汜水關",
    "洛陽",
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
    "大寨",
    "陣前",
    "寨",
]
BATTLE_VERBS = ["搦戰", "迎敵", "迎戰", "廝殺", "殺", "戰", "刺", "斬", "攻", "追", "敗", "趕"]
COMMAND_VERBS = ["令", "領", "將", "同", "守", "屯", "紮", "撥", "引軍"]
GENERAL_ALIASES = {
    "cao-cao": ["曹操", "操", "孟德"],
    "dong-zhuo": ["董卓", "卓", "丞相"],
    "gongsun-zan": ["公孫瓚", "瓚"],
    "guan-yu": ["關羽", "關公", "雲長"],
    "hua-xiong": ["華雄", "雄"],
    "li-jue": ["李傕", "李催"],
    "li-ru": ["李儒", "儒"],
    "li-su": ["李肅", "肅"],
    "liu-bei": ["劉備", "玄德", "備"],
    "lu-bu": ["呂布", "布", "奉先", "溫侯"],
    "sun-jian": ["孫堅", "堅", "文臺"],
    "yuan-shao": ["袁紹", "紹"],
    "yuan-shu": ["袁術", "術", "公路"],
    "zhang-fei": ["張飛", "飛"],
    "zhang-ji": ["張濟"],
}
SINGLE_CHAR_ALIAS_ALLOWED = {"dong-zhuo", "gongsun-zan", "li-ru", "li-su", "lu-bu"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Expand event review source context and ask DeepSeek for review-only edit proposals.")
    parser.add_argument("--answers", default=str(DEFAULT_ANSWERS_PATH), help="event-review-answers*.todo.json path")
    parser.add_argument("--chapters-root", default=str(DEFAULT_CHAPTERS_ROOT), help="Chapter markdown root")
    parser.add_argument("--people-path", default=str(DEFAULT_PEOPLE_PATH), help="Optional person registry for uid/name hints")
    parser.add_argument("--output-root", default=None, help="Output directory. Defaults to answers file directory")
    parser.add_argument("--api-url", default=None, help="Ollama /api/chat URL")
    parser.add_argument("--model", default=None, help="Ollama model")
    parser.add_argument("--window-before", type=int, default=2, help="Paragraphs before each source ref")
    parser.add_argument("--window-after", type=int, default=2, help="Paragraphs after each source ref")
    parser.add_argument("--timeout-ms", type=int, default=DEFAULT_REASONING_TIMEOUT_MS)
    parser.add_argument("--num-ctx", type=int, default=DEFAULT_REASONING_NUM_CTX)
    parser.add_argument("--num-predict", type=int, default=1200)
    parser.add_argument("--temperature", type=float, default=DEFAULT_REASONING_TEMPERATURE)
    parser.add_argument("--top-p", type=float, default=DEFAULT_REASONING_TOP_P)
    parser.add_argument("--repeat-penalty", type=float, default=DEFAULT_REASONING_REPEAT_PENALTY)
    parser.add_argument("--batch", action="store_true", help="Send all questions in one request. Default is one request per question for better quality.")
    parser.add_argument("--prompt-only", action="store_true", help="Only write expanded context bundle; do not call DeepSeek")
    parser.add_argument("--fill-answers", action="store_true", help="Fill answer and edits in enriched todo when proposal passes gates")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


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


def load_person_name_hints(people_path: Path) -> dict[str, list[str]]:
    hints = {person_id: list(aliases) for person_id, aliases in GENERAL_ALIASES.items()}
    if not people_path.exists():
        return hints
    try:
        people = json.loads(people_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return hints
    if not isinstance(people, list):
        return hints
    for person in people:
        if not isinstance(person, dict):
            continue
        uid = str(person.get("uid") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not uid or not name:
            continue
        hints.setdefault(uid, [])
        if name not in hints[uid]:
            hints[uid].append(name)
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


def build_candidate_hints(question: dict, name_hints: dict[str, list[str]]) -> dict:
    general_ids = question.get("generalIds") or []
    focus_general_id = question.get("focusGeneralId")
    expanded_context = question.get("expandedContext") or []
    location_candidates: list[dict] = []
    relationship_candidates: list[dict] = []
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
    location_candidates.sort(key=lambda item: (not item.get("isAnchor"), item.get("location") not in {"虎牢關", "汜水關", "城外", "關下", "園門外"}))
    relationship_candidates.sort(key=lambda item: (
        focus_general_id not in {item.get("fromId"), item.get("toId")},
        not item.get("isAnchor"),
        item.get("type") == "mentions",
        -float(item.get("edgeConfidence") or 0),
        int(item.get("sourceOrder") or 0),
    ))
    return {
        "locationCandidates": location_candidates[:8],
        "relationshipCandidates": relationship_candidates[:10],
    }


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


def build_prompt_bundle(answers: dict, chapters_root: Path, before: int, after: int, name_hints: dict[str, list[str]]) -> dict:
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
            "missingFields": question.get("missingFields") or [],
            "expandedContext": expanded_context,
        }
        prompt_question["candidateHints"] = build_candidate_hints(prompt_question, name_hints)
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
    from_id = str(edge.get("fromId") or "").strip()
    to_id = str(edge.get("toId") or "").strip()
    if from_id not in allowed_general_ids or to_id not in allowed_general_ids or from_id == to_id:
        return None
    evidence_refs = [ref for ref in bounded_list(edge.get("evidenceRefs"), 6) if ref in allowed_source_refs]
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
        return True
    return False


def answer_is_complete(answer: dict, focus_general_id: str | None = None) -> bool:
    edits = answer.get("edits") or {}
    return bool(edits.get("summary") and edits.get("location") and edits.get("relationshipEdges") and answer_has_strong_edge(answer, focus_general_id))


def summary_looks_poor(summary: Any) -> bool:
    text = str(summary or "")
    if not text.strip():
        return True
    if "battle scenario" in text.lower():
        return True
    ascii_count = sum(1 for char in text if ord(char) < 128 and char.isalpha())
    return ascii_count > max(12, len(text) * 0.35)


def normalize_location(value: Any) -> str | None:
    if isinstance(value, list):
        value = next((item for item in value if str(item).strip()), "")
    location = compact_text(str(value or ""), 24)
    if not location or SOURCE_REF_RE.match(location):
        return None
    return location


def best_hint_location(question: dict) -> str | None:
    hints = question.get("candidateHints") or {}
    for item in hints.get("locationCandidates") or []:
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
        if require_focus and focus_general_id not in {edge.get("fromId"), edge.get("toId")}:
            continue
        sanitized = sanitize_edge(edge, allowed_general_ids, allowed_source_refs)
        if sanitized:
            edges.append(sanitized)
    return edges[:4]


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
    location = edits.get("location") or best_hint_location(question)
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
    api_url: str,
    model: str,
    prompt_bundle: dict,
    args: argparse.Namespace,
) -> tuple[dict, list[dict]]:
    raw_requests: list[dict] = []
    if args.batch:
        result = request_ollama_reasoning_json(
            api_url=api_url,
            model=model,
            system_prompt=build_system_prompt(),
            user_payload=prompt_bundle,
            timeout_ms=args.timeout_ms,
            num_ctx=args.num_ctx,
            num_predict=args.num_predict,
            temperature=args.temperature,
            top_p=args.top_p,
            repeat_penalty=args.repeat_penalty,
        )
        sanitized = sanitize_report(result.parsedJson, prompt_bundle)
        raw_requests.append({
            "model": result.model,
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
    last_model = model
    last_summary: dict = {}
    traces: list[str] = []
    for question in prompt_bundle.get("questions") or []:
        single_bundle = build_single_question_payload(question)
        try:
            result = request_ollama_reasoning_json(
                api_url=api_url,
                model=model,
                system_prompt=build_system_prompt(),
                user_payload=single_bundle,
                timeout_ms=args.timeout_ms,
                num_ctx=args.num_ctx,
                num_predict=args.num_predict,
                temperature=args.temperature,
                top_p=args.top_p,
                repeat_penalty=args.repeat_penalty,
            )
        except OllamaReasoningError as exc:
            sanitized = sanitize_report({}, {"questions": [question]})
            all_answers.extend(sanitized["answers"])
            notes.append(f"{question.get('eventKey')}: DeepSeek request failed; used source-grounded candidate hints. {exc}")
            raw_requests.append({
                "eventKey": question.get("eventKey"),
                "model": model,
                "error": str(exc),
            })
            continue
        sanitized = sanitize_report(result.parsedJson, {"questions": [question]})
        all_answers.extend(sanitized["answers"])
        notes.extend(sanitized["pipelineNotes"])
        last_model = result.model
        last_summary = result.payloadSummary
        if result.reasoningTrace:
            traces.append(result.reasoningTrace)
        raw_requests.append({
            "eventKey": question.get("eventKey"),
            "model": result.model,
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
    return {
        "task": "Fill exactly one event review answer from expanded Three Kingdoms source context.",
        "canonicalWrites": False,
        "rules": [
            "Return JSON only with top-level keys answers and pipelineNotes.",
            "answers must contain exactly one item for this question.",
            "Use only allowedGeneralIds in relationshipEdges.fromId/toId.",
            "Use only allowedSourceRefs in relationshipEdges.evidenceRefs.",
            "Do not invent people or source refs.",
            "If summary, location, and at least one legal relationshipEdge are complete, recommendedAnswer may be A.",
            "If any required field is still missing, recommendedAnswer must be B or D.",
            "Prefer candidateHints when their evidenceText/sourceRefs support the answer.",
        ],
        "outputContract": "Return {\"answers\":[{\"eventKey\":string,\"recommendedAnswer\":\"A|B|C|D\",\"confidence\":number,\"edits\":{\"eventKey\":string,\"summary\":string,\"location\":string,\"relationshipEdges\":[{\"fromId\":allowedGeneralId,\"toId\":allowedGeneralId,\"type\":string,\"evidenceRefs\":[allowedSourceRef],\"edgeConfidence\":number,\"edgeStrength\":number|null}],\"moodTags\":[string]},\"reasons\":[string],\"risks\":[string]}],\"pipelineNotes\":[string]}",
        "allowedGeneralIds": question.get("generalIds") or [],
        "allowedSourceRefs": [item.get("sourceRef") for item in question.get("expandedContext") or []],
        "nameHints": question.get("nameHints") or {},
        "candidateHints": question.get("candidateHints") or {},
        "question": question,
    }


def main() -> None:
    args = parse_args()
    answers_path = Path(args.answers)
    output_root = Path(args.output_root) if args.output_root else answers_path.parent
    paths = output_paths(output_root, answers_path)
    ensure_outputs(paths, args.overwrite, args.prompt_only)
    answers = read_json(answers_path)
    name_hints = load_person_name_hints(Path(args.people_path))
    prompt_bundle = build_prompt_bundle(answers, Path(args.chapters_root), max(args.window_before, 0), max(args.window_after, 0), name_hints)
    write_json(paths["bundle"], prompt_bundle)
    if args.prompt_only:
        print(f"[enrich_event_review_context] wrote {paths['bundle']}")
        print("[enrich_event_review_context] promptOnly=true")
        return

    api_url = resolve_ollama_api_url(args.api_url)
    model = resolve_deepseek_model(args.model)
    try:
        reasoning, raw_requests = request_reasoning(api_url=api_url, model=model, prompt_bundle=prompt_bundle, args=args)
    except OllamaReasoningError as exc:
        raise SystemExit(f"[enrich_event_review_context] FAIL {exc}") from exc

    report = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "event-review-context-enrichment",
        "canonicalWrites": False,
        "model": reasoning["model"],
        "apiUrl": api_url,
        "requestMode": "batch" if args.batch else "per-question",
        "payloadSummary": reasoning["payloadSummary"],
        "reasoningTracePreview": reasoning["reasoningTracePreview"],
        "answers": reasoning["answers"],
        "pipelineNotes": reasoning["pipelineNotes"],
    }
    raw = {
        "model": reasoning["model"],
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