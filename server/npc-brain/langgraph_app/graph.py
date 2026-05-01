from __future__ import annotations

from pathlib import Path
from typing import Any, Literal, TypedDict

from langgraph.graph import END, START, StateGraph

from app.npc_dialogue_service import DialogueRequest, NpcDialogueService


REPO_ROOT = Path(__file__).resolve().parents[3]
SERVICE = NpcDialogueService(repo_root=REPO_ROOT)

LocaleValue = Literal["zh-TW", "en", "ja"]
SpeechContextModeValue = Literal["life_chat", "encounter_speech", "inner_monologue", "meeting_statement"]
LLMModelPresetValue = Literal[
    "fallback_chain",
    "gemini_pro",
    "gemini_flash",
    "gemini_flash_lite",
    "qwen2_5_7b",
    "qwen2_5_3b",
    "deepseek_r1_7b",
    "local_llama_env",
]
KeywordCategoryValue = Literal["person", "item", "event", "location", "creature"]
PopularGeneralIdValue = Literal[
    "zhang-fei",
    "guan-yu",
    "zhao-yun",
    "liu-bei",
    "cao-cao",
    "zhuge-liang",
    "cao-ren",
    "le-jin",
    "li-dian",
    "xiahou-dun",
    "xiahou-yuan",
    "xu-zhu",
    "lu-bu",
    "sun-quan",
    "zhou-yu",
    "sima-yi",
]

POPULAR_TEST_GENERALS: list[dict[str, str]] = [
    {"generalId": "zhang-fei", "displayName": "張飛", "reason": "長坂橋 smoke 與 dialogue probe 最成熟"},
    {"generalId": "guan-yu", "displayName": "關羽", "reason": "核心人物，keyword/persona 已穩定"},
    {"generalId": "zhao-yun", "displayName": "趙雲", "reason": "高人氣救援場景，適合對話 smoke"},
    {"generalId": "liu-bei", "displayName": "劉備", "reason": "主公視角，generic candidates 豐富"},
    {"generalId": "cao-cao", "displayName": "曹操", "reason": "高 keyword 密度，適合 provider 比較"},
    {"generalId": "zhuge-liang", "displayName": "諸葛亮", "reason": "ready-for-dialogue-smoke，適合多 speech mode"},
    {"generalId": "cao-ren", "displayName": "曹仁", "reason": "repair-review cohort 成員"},
    {"generalId": "le-jin", "displayName": "樂進", "reason": "repair-review cohort 成員"},
    {"generalId": "li-dian", "displayName": "李典", "reason": "repair-review cohort 成員"},
    {"generalId": "xiahou-dun", "displayName": "夏侯惇", "reason": "repair-review cohort 成員"},
    {"generalId": "xiahou-yuan", "displayName": "夏侯淵", "reason": "repair-review cohort 成員"},
    {"generalId": "xu-zhu", "displayName": "許褚", "reason": "repair-review cohort 成員"},
    {"generalId": "lu-bu", "displayName": "呂布", "reason": "needs-etl-evidence 代表案例"},
    {"generalId": "sun-quan", "displayName": "孫權", "reason": "needs-etl-evidence 代表案例"},
    {"generalId": "zhou-yu", "displayName": "周瑜", "reason": "needs-etl-evidence 代表案例"},
    {"generalId": "sima-yi", "displayName": "司馬懿", "reason": "needs-etl-evidence 代表案例"},
]


class NpcBrainStudioState(TypedDict, total=False):
    generalId: PopularGeneralIdValue
    customGeneralId: str | None
    contextKey: str | None
    selectedKeywordKeys: list[str]
    locale: LocaleValue
    speechContextMode: SpeechContextModeValue
    llmModelPreset: LLMModelPresetValue
    maxChars: int
    contextLimit: int | None
    keywordCategories: list[KeywordCategoryValue] | None
    keywordLimitPerCategory: int | None
    contextOptions: list[dict[str, Any]]
    keywordOptions: dict[str, list[dict[str, Any]]]
    contextCandidates: list[dict[str, Any]]
    contextCandidateKeys: list[str]
    keywordCandidates: dict[str, list[dict[str, Any]]]
    keywordCandidateKeys: dict[str, list[str]]
    popularGeneralCandidates: list[dict[str, str]]
    resolvedGeneralId: str
    recommendedContextKey: str | None
    recommendedKeywordKeys: list[str]
    recommendedRequestPayload: dict[str, Any]
    requestPayload: dict[str, Any]
    dialogue: dict[str, Any]
    dialogueText: str | None
    dialogueProvider: str | None
    dialogueModel: str | None
    generationMode: str | None
    fallbackUsed: bool | None
    providerTrace: list[str]


def _resolve_general_id(state: NpcBrainStudioState) -> str:
    custom_general_id = (state.get("customGeneralId") or "").strip()
    if custom_general_id:
        return custom_general_id
    preset_general_id = state.get("generalId")
    if preset_general_id:
        return str(preset_general_id)
    return "zhang-fei"


def _ordered_keyword_categories(
    state: NpcBrainStudioState,
    keyword_options: dict[str, list[dict[str, Any]]],
) -> list[str]:
    preferred_categories = [str(category) for category in state.get("keywordCategories") or []]
    ordered_categories: list[str] = []
    seen_categories: set[str] = set()
    for category in preferred_categories + list(keyword_options.keys()):
        if category in keyword_options and category not in seen_categories:
            ordered_categories.append(category)
            seen_categories.add(category)
    return ordered_categories


def _pick_context_key(context_key: str | None, context_options: list[dict[str, Any]]) -> str | None:
    if context_key:
        return str(context_key)
    for option in context_options:
        candidate_key = option.get("contextKey")
        if candidate_key:
            return str(candidate_key)
    return None


def _pick_keyword_keys(
    selected_keyword_keys: list[str] | None,
    keyword_options: dict[str, list[dict[str, Any]]],
    ordered_categories: list[str],
    max_keywords: int = 3,
) -> list[str]:
    resolved_keys: list[str] = []
    for keyword_key in selected_keyword_keys or []:
        if keyword_key and keyword_key not in resolved_keys:
            resolved_keys.append(str(keyword_key))
    if resolved_keys:
        return resolved_keys

    for category in ordered_categories:
        options = keyword_options.get(category) or []
        for option in options:
            keyword_key = option.get("keywordKey")
            if keyword_key and keyword_key not in resolved_keys:
                resolved_keys.append(str(keyword_key))
                break
        if len(resolved_keys) >= max_keywords:
            break
    return resolved_keys


def load_context_options(state: NpcBrainStudioState) -> dict[str, Any]:
    resolved_general_id = _resolve_general_id(state)
    response = SERVICE.get_context_options(
        resolved_general_id,
        limit=state.get("contextLimit"),
    )
    return {
        "contextOptions": [option.model_dump() for option in response.options],
    }


def load_keyword_options(state: NpcBrainStudioState) -> dict[str, Any]:
    resolved_general_id = _resolve_general_id(state)
    response = SERVICE.get_keyword_options(
        resolved_general_id,
        categories=state.get("keywordCategories"),
        limit_per_category=state.get("keywordLimitPerCategory"),
    )
    return {
        "keywordOptions": {
            category: [option.model_dump() for option in options]
            for category, options in response.categories.items()
        },
    }


def prepare_studio_candidates(state: NpcBrainStudioState) -> dict[str, Any]:
    resolved_general_id = _resolve_general_id(state)
    context_options = list(state.get("contextOptions") or [])
    keyword_options = dict(state.get("keywordOptions") or {})
    ordered_categories = _ordered_keyword_categories(state, keyword_options)
    recommended_context_key = _pick_context_key(state.get("contextKey"), context_options)
    recommended_keyword_keys = _pick_keyword_keys(
        state.get("selectedKeywordKeys"),
        keyword_options,
        ordered_categories,
    )

    context_candidates = [
        {
            "contextKey": option.get("contextKey"),
            "label": option.get("label"),
            "sourceType": option.get("sourceType"),
            "confidence": option.get("confidence"),
            "evidenceRefs": list(option.get("evidenceRefs") or []),
        }
        for option in context_options
    ]
    keyword_candidates = {
        category: [
            {
                "keywordKey": option.get("keywordKey"),
                "label": option.get("label"),
                "fullLabel": option.get("fullLabel"),
                "confidence": option.get("confidence"),
                "sourceRefs": list(option.get("sourceRefs") or []),
            }
            for option in keyword_options.get(category) or []
        ]
        for category in ordered_categories
    }
    recommended_request_payload = {
        "generalId": resolved_general_id,
        "contextKey": recommended_context_key,
        "selectedKeywordKeys": recommended_keyword_keys,
        "locale": state.get("locale") or "zh-TW",
        "speechContextMode": state.get("speechContextMode") or "life_chat",
        "llmModelPreset": state.get("llmModelPreset") or "fallback_chain",
        "maxChars": int(state.get("maxChars") or 90),
    }
    return {
        "contextCandidates": context_candidates,
        "contextCandidateKeys": [str(option.get("contextKey")) for option in context_options if option.get("contextKey")],
        "keywordCandidates": keyword_candidates,
        "keywordCandidateKeys": {
            category: [
                str(option.get("keywordKey"))
                for option in keyword_options.get(category) or []
                if option.get("keywordKey")
            ]
            for category in ordered_categories
        },
        "popularGeneralCandidates": [dict(candidate) for candidate in POPULAR_TEST_GENERALS],
        "resolvedGeneralId": resolved_general_id,
        "recommendedContextKey": recommended_context_key,
        "recommendedKeywordKeys": recommended_keyword_keys,
        "recommendedRequestPayload": recommended_request_payload,
    }


def prepare_dialogue_request(state: NpcBrainStudioState) -> dict[str, Any]:
    resolved_general_id = str(state.get("resolvedGeneralId") or _resolve_general_id(state))
    context_options = state.get("contextOptions") or []
    keyword_options = state.get("keywordOptions") or {}
    ordered_categories = _ordered_keyword_categories(state, keyword_options)
    auto_context_key = state.get("recommendedContextKey")
    if auto_context_key is None:
        auto_context_key = _pick_context_key(state.get("contextKey"), context_options)

    selected_keyword_keys = list(state.get("recommendedKeywordKeys") or [])
    if not selected_keyword_keys:
        selected_keyword_keys = _pick_keyword_keys(
            state.get("selectedKeywordKeys"),
            keyword_options,
            ordered_categories,
        )

    request_payload = {
        "generalId": resolved_general_id,
        "contextKey": auto_context_key,
        "selectedKeywordKeys": selected_keyword_keys,
        "locale": state.get("locale") or "zh-TW",
        "speechContextMode": state.get("speechContextMode") or "life_chat",
        "llmModelPreset": state.get("llmModelPreset") or "fallback_chain",
        "maxChars": int(state.get("maxChars") or 90),
    }
    return {"requestPayload": request_payload}


def generate_dialogue(state: NpcBrainStudioState) -> dict[str, Any]:
    request = DialogueRequest.model_validate(state["requestPayload"])
    response = SERVICE.build_dialogue(request)
    dialogue = response.model_dump()
    return {
        "dialogue": dialogue,
        "dialogueText": dialogue.get("text"),
        "dialogueProvider": dialogue.get("provider"),
        "dialogueModel": dialogue.get("model"),
        "generationMode": dialogue.get("generationMode"),
        "fallbackUsed": dialogue.get("fallbackUsed"),
        "providerTrace": list(dialogue.get("providerTrace") or []),
    }


def make_graph(_config: Any | None = None):
    builder = StateGraph(NpcBrainStudioState)
    builder.add_node("load_context_options", load_context_options)
    builder.add_node("load_keyword_options", load_keyword_options)
    builder.add_node("prepare_studio_candidates", prepare_studio_candidates)
    builder.add_node("prepare_dialogue_request", prepare_dialogue_request)
    builder.add_node("generate_dialogue", generate_dialogue)

    builder.add_edge(START, "load_context_options")
    builder.add_edge("load_context_options", "load_keyword_options")
    builder.add_edge("load_keyword_options", "prepare_studio_candidates")
    builder.add_edge("prepare_studio_candidates", "prepare_dialogue_request")
    builder.add_edge("prepare_dialogue_request", "generate_dialogue")
    builder.add_edge("generate_dialogue", END)
    return builder.compile()


graph = make_graph()