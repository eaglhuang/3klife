from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

from .interaction_memory import (
    CURRENT_MEMORY_SCHEMA_VERSION,
    GeneralMemoryContext,
    GeneralMemoryData,
    InteractionEventCreateRequest,
    InteractionEventWriteResponse,
    MemoryCompressRequest,
    MemoryWriteResponse,
    append_interaction_event,
    build_interaction_event,
    compress_general_memory_stub,
    get_memory_runtime_config,
    has_memory_context_content,
    increment_uncompressed_count,
    load_general_memory,
    memory_context_from_data,
    save_general_memory,
)
from .llm_dialogue_renderer import (
    DEFAULT_DEEPSEEK_REASONER_MODEL,
    DEFAULT_GEMINI_FLASH_LITE_MODEL,
    DEFAULT_GEMINI_FLASH_MODEL,
    DEFAULT_GEMINI_MODEL,
    DEFAULT_HISTORY_CACHE_PATH,
    DEFAULT_LOCALE,
    DEFAULT_LOCAL_LLAMA_MODEL,
    DEFAULT_LOCAL_LLAMA_NUM_CTX,
    DEFAULT_LOCAL_LLAMA_REPEAT_PENALTY,
    DEFAULT_LOCAL_LLAMA_REPAIR_RETRY_COUNT,
    DEFAULT_LOCAL_LLAMA_TEMPERATURE,
    DEFAULT_LOCAL_LLAMA_TOP_P,
    DEFAULT_SPEECH_CONTEXT_MODE,
    LOCALE_INSTRUCTIONS,
    DialoguePromptPackage,
    DialogueProviderRouter,
    ResolvedEvidence,
    SPEECH_CONTEXT_INSTRUCTIONS,
    load_local_env,
    log_debug_event,
)
from .vector_config import load_vector_runtime_config


DEFAULT_ARTIFACT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/api-readiness")
DEFAULT_EVENT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/events")
DEFAULT_PERSONA_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/persona-cards")
DEFAULT_RUNTIME_PROFILE_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/runtime-general-profiles")
PERSONA_VERSION = "general_persona_v2"
LLM_HISTORY_PROVIDERS = {"gemini", "gemini_flash", "gemini_flash_lite", "local_llama"}
SUPPORTED_LOCALES = set(LOCALE_INSTRUCTIONS.keys())
SUPPORTED_SPEECH_CONTEXT_MODES = set(SPEECH_CONTEXT_INSTRUCTIONS.keys())
DEFAULT_LLM_MODEL_PRESET = "fallback_chain"
LLM_MODEL_PRESETS = {
    "fallback_chain": {
        "label": "Fallback Chain",
        "description": "Use NPC_LLM_PROVIDER_ORDER exactly as configured in the server environment.",
        "providerOrder": None,
        "modelOverrides": {},
        "allowDeterministicFallback": True,
    },
    "gemini_pro": {
        "label": "Gemini 2.5 Pro",
        "description": "Test Gemini Pro only; fail loudly if it is unavailable.",
        "providerOrder": ["gemini"],
        "modelOverrides": {"gemini": DEFAULT_GEMINI_MODEL},
        "allowDeterministicFallback": False,
    },
    "gemini_flash": {
        "label": "Gemini 2.5 Flash",
        "description": "Test Gemini Flash only; fail loudly if it is unavailable.",
        "providerOrder": ["gemini_flash"],
        "modelOverrides": {"gemini_flash": DEFAULT_GEMINI_FLASH_MODEL},
        "allowDeterministicFallback": False,
    },
    "gemini_flash_lite": {
        "label": "Gemini 2.5 Flash Lite",
        "description": "Test Gemini Flash Lite only; fail loudly if it is unavailable.",
        "providerOrder": ["gemini_flash_lite"],
        "modelOverrides": {"gemini_flash_lite": DEFAULT_GEMINI_FLASH_LITE_MODEL},
        "allowDeterministicFallback": False,
    },
    "qwen2_5_7b": {
        "label": "Qwen2.5 7B Local",
        "description": "Test local Ollama qwen2.5:7b only; fail loudly if Ollama or the model is unavailable.",
        "providerOrder": ["local_llama"],
        "modelOverrides": {"local_llama": "qwen2.5:7b"},
        "allowDeterministicFallback": False,
    },
    "qwen2_5_3b": {
        "label": "Qwen2.5 3B Local",
        "description": "Test local Ollama qwen2.5:3b only; fail loudly if Ollama or the model is unavailable.",
        "providerOrder": ["local_llama"],
        "modelOverrides": {"local_llama": "qwen2.5:3b"},
        "allowDeterministicFallback": False,
    },
        "deepseek_r1_7b": {
            "label": "DeepSeek R1 7B Reasoning",
            "description": "Reasoning test model for ETL/review experiments; fail loudly if Ollama or the model is unavailable.",
            "providerOrder": ["deepseek_reasoner"],
            "modelOverrides": {"deepseek_reasoner": DEFAULT_DEEPSEEK_REASONER_MODEL},
            "allowDeterministicFallback": False,
        },
    "local_llama_env": {
        "label": "Local Llama Env",
        "description": "Test local_llama only, using NPC_LLM_MODEL_LOCAL_LLAMA from .env; fail loudly if unavailable.",
        "providerOrder": ["local_llama"],
        "modelOverrides": {},
        "allowDeterministicFallback": False,
    },
}
SUPPORTED_LLM_MODEL_PRESETS = set(LLM_MODEL_PRESETS.keys())


class ContextOption(BaseModel):
    contextKey: str
    label: str
    sourceType: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidenceRefs: list[str] = Field(default_factory=list)


class ContextOptionsResponse(BaseModel):
    generalId: str
    options: list[ContextOption] = Field(default_factory=list)


class KeywordOption(BaseModel):
    keywordKey: str
    label: str
    fullLabel: str | None = None
    uiLabelMaxChars: int | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    sourceRefs: list[str] = Field(default_factory=list)


class KeywordOptionsResponse(BaseModel):
    generalId: str
    keywordVersion: str
    categories: dict[str, list[KeywordOption]] = Field(default_factory=dict)


class DialogueRequest(BaseModel):
    generalId: str
    contextKey: str | None = None
    selectedKeywordKeys: list[str] = Field(default_factory=list)
    toneMode: str = "in-character"
    locale: str = DEFAULT_LOCALE
    speechContextMode: str = DEFAULT_SPEECH_CONTEXT_MODE
    llmModelPreset: str = DEFAULT_LLM_MODEL_PRESET
    maxChars: int = Field(default=80, ge=12, le=240)
    saveId: str | None = None
    memoryContext: GeneralMemoryContext | None = None

    @model_validator(mode="after")
    def normalize_request_fields(self):
        self.selectedKeywordKeys = list(dict.fromkeys(key for key in self.selectedKeywordKeys if key))
        if self.saveId is None and self.memoryContext is not None:
            self.saveId = self.memoryContext.saveId
        if self.memoryContext is not None and self.saveId is not None and self.memoryContext.saveId != self.saveId:
            self.memoryContext = self.memoryContext.model_copy(update={"saveId": self.saveId})
        if self.locale not in SUPPORTED_LOCALES:
            self.locale = DEFAULT_LOCALE
        if self.speechContextMode not in SUPPORTED_SPEECH_CONTEXT_MODES:
            self.speechContextMode = DEFAULT_SPEECH_CONTEXT_MODE
        if self.llmModelPreset not in SUPPORTED_LLM_MODEL_PRESETS:
            self.llmModelPreset = DEFAULT_LLM_MODEL_PRESET
        return self


class UsedKeyword(BaseModel):
    keywordKey: str
    category: str
    label: str
    sourceRefs: list[str] = Field(default_factory=list)


class PersonaCard(BaseModel):
    generalId: str
    personaVersion: str = PERSONA_VERSION
    displayName: str
    voiceStyle: list[str] = Field(default_factory=list)
    personalityTraits: list[str] = Field(default_factory=list)
    safeFallbackLine: str
    taboos: list[str] = Field(default_factory=list)
    evidenceRefs: list[str] = Field(default_factory=list)


class DialogueResponse(BaseModel):
    generalId: str
    contextKey: str | None
    locale: str = DEFAULT_LOCALE
    speechContextMode: str = DEFAULT_SPEECH_CONTEXT_MODE
    llmModelPreset: str = DEFAULT_LLM_MODEL_PRESET
    text: str
    evidenceRefs: list[str]
    usedEvidenceRefs: list[str] = Field(default_factory=list)
    usedKeywords: list[UsedKeyword] = Field(default_factory=list)
    rejectedKeywordKeys: list[str] = Field(default_factory=list)
    fallbackUsed: bool
    generationMode: str
    provider: str | None = None
    model: str | None = None
    providerTrace: list[str] = Field(default_factory=list)
    qualityWarnings: list[str] = Field(default_factory=list)
    repairUsed: bool = False


class NpcDialogueService:
    def __init__(
        self,
        repo_root: Path | None = None,
        artifact_root: Path | None = None,
        persona_root: Path | None = None,
        runtime_profile_root: Path | None = None,
        event_root: Path | None = None,
        provider_router: DialogueProviderRouter | None = None,
    ) -> None:
        self.repo_root = repo_root or find_repo_root(Path.cwd())
        load_local_env(self.repo_root)
        self.artifact_root = self._resolve_path(artifact_root or DEFAULT_ARTIFACT_ROOT)
        self.persona_root = self._resolve_path(persona_root or DEFAULT_PERSONA_ROOT)
        self.runtime_profile_root = self._resolve_path(runtime_profile_root or Path(os.environ.get("NPC_RUNTIME_PROFILE_ROOT") or DEFAULT_RUNTIME_PROFILE_ROOT))
        self.event_root = self._resolve_path(event_root or DEFAULT_EVENT_ROOT)
        self.history_cache_path = self._resolve_path(Path(os.environ.get("NPC_LLM_HISTORY_CACHE_PATH") or DEFAULT_HISTORY_CACHE_PATH))
        self.provider_router = provider_router or DialogueProviderRouter()
        self._ready_events_cache: list[dict] | None = None

    def get_health(self) -> dict:
        provider_order = self.provider_router.provider_order
        vector_config = load_vector_runtime_config()
        memory_config = get_memory_runtime_config(self.repo_root)
        return {
            "ok": True,
            "service": "npc-brain",
            "llm": {
                "providerOrder": provider_order,
                "geminiConfigured": bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")),
                "geminiModel": os.environ.get("NPC_LLM_MODEL_GEMINI") or os.environ.get("NPC_LLM_MODEL") or "gemini-2.5-pro",
                "geminiFlashModel": os.environ.get("NPC_LLM_MODEL_GEMINI_FLASH") or "gemini-2.5-flash",
                "geminiFlashLiteModel": os.environ.get("NPC_LLM_MODEL_GEMINI_FLASH_LITE") or "gemini-2.5-flash-lite",
                "localLlamaEnabled": "local_llama" in provider_order,
                "localLlamaModel": os.environ.get("NPC_LLM_MODEL_LOCAL_LLAMA") or DEFAULT_LOCAL_LLAMA_MODEL,
                "localLlamaOptions": {
                    "temperature": float(os.environ.get("NPC_LLM_LOCAL_LLAMA_TEMPERATURE") or DEFAULT_LOCAL_LLAMA_TEMPERATURE),
                    "topP": float(os.environ.get("NPC_LLM_LOCAL_LLAMA_TOP_P") or DEFAULT_LOCAL_LLAMA_TOP_P),
                    "repeatPenalty": float(os.environ.get("NPC_LLM_LOCAL_LLAMA_REPEAT_PENALTY") or DEFAULT_LOCAL_LLAMA_REPEAT_PENALTY),
                    "numCtx": int(os.environ.get("NPC_LLM_LOCAL_LLAMA_NUM_CTX") or DEFAULT_LOCAL_LLAMA_NUM_CTX),
                    "repairRetryCount": int(os.environ.get("NPC_LLM_LOCAL_LLAMA_REPAIR_RETRY_COUNT") or DEFAULT_LOCAL_LLAMA_REPAIR_RETRY_COUNT),
                },
                "historyCacheEnabled": "history_cache" in provider_order,
                "historyCachePath": str(self.history_cache_path),
                "supportedLocales": sorted(SUPPORTED_LOCALES),
                "supportedSpeechContextModes": sorted(SUPPORTED_SPEECH_CONTEXT_MODES),
                "supportedModelPresets": [
                    {
                        "preset": preset,
                        "label": config["label"],
                        "description": config["description"],
                        "providerOrder": config["providerOrder"],
                        "modelOverrides": config["modelOverrides"],
                    }
                    for preset, config in LLM_MODEL_PRESETS.items()
                ],
            },
            "vector": vector_config.as_health(),
            "memory": memory_config,
        }

    def record_interaction_event(self, request: InteractionEventCreateRequest) -> InteractionEventWriteResponse:
        event = build_interaction_event(request)
        append_success = append_interaction_event(self.repo_root, event)
        if not append_success:
            raise RuntimeError(f"failed to append interaction event: {request.saveId}/{request.generalId}")
        memory = increment_uncompressed_count(self.repo_root, request.saveId, request.generalId)
        memory_config = get_memory_runtime_config(self.repo_root)
        delta = memory.uncompressedCount - memory.lastCompressedIdx
        if delta >= int(memory_config["compressInterval"]):
            log_debug_event(
                "memory.compress.pending",
                saveId=request.saveId,
                generalId=request.generalId,
                delta=delta,
                compressInterval=memory_config["compressInterval"],
            )
        return InteractionEventWriteResponse(eventId=event.eventId)

    def get_general_memory(self, save_id: str, general_id: str) -> GeneralMemoryData:
        return load_general_memory(self.repo_root, save_id, general_id)

    def save_general_memory(self, memory: GeneralMemoryData) -> MemoryWriteResponse:
        save_general_memory(self.repo_root, memory)
        return MemoryWriteResponse(ok=True)

    def compress_general_memory(self, request: MemoryCompressRequest) -> GeneralMemoryData:
        return compress_general_memory_stub(self.repo_root, request)

    def get_context_options(self, general_id: str, limit: int | None = None) -> ContextOptionsResponse:
        runtime_persona = self._read_runtime_persona(general_id)
        if runtime_persona:
            options = [
                ContextOption(
                    contextKey=str(beat.get("eventKey") or beat.get("eventId") or f"story-{index}"),
                    label=str(beat.get("location") or beat.get("summary") or beat.get("eventKey") or beat.get("eventId")),
                    sourceType="romance-runtime-profile",
                    confidence=float(beat.get("confidence") or 0.72),
                    evidenceRefs=beat.get("sourceRefs") or [],
                )
                for index, beat in enumerate(runtime_persona.get("storyBeats") or [])
                if beat.get("sourceRefs")
            ]
            if limit is not None:
                options = options[: max(limit, 0)]
            return ContextOptionsResponse(generalId=general_id, options=options)
        payload = self._read_json("context-options.response.json")
        response = ContextOptionsResponse.model_validate(payload)
        if response.generalId != general_id:
            return ContextOptionsResponse(generalId=general_id, options=[])
        if limit is not None:
            response.options = response.options[: max(limit, 0)]
        return response

    def get_keyword_options(
        self,
        general_id: str,
        categories: list[str] | None = None,
        limit_per_category: int | None = None,
    ) -> KeywordOptionsResponse:
        runtime_keywords = self._read_runtime_keywords(general_id)
        if runtime_keywords:
            response = KeywordOptionsResponse.model_validate({
                "generalId": runtime_keywords.get("generalId") or general_id,
                "keywordVersion": runtime_keywords.get("keywordVersion") or "general_runtime_keywords_v1",
                "categories": runtime_keywords.get("categories") or {},
            })
            if categories:
                response.categories = {category: response.categories[category] for category in categories if category in response.categories}
            if limit_per_category is not None:
                response.categories = {
                    category: options[: max(limit_per_category, 0)]
                    for category, options in response.categories.items()
                }
            return response
        payload = self._read_json("keyword-options.response.json")
        response = KeywordOptionsResponse.model_validate(payload)
        if response.generalId != general_id:
            return KeywordOptionsResponse(generalId=general_id, keywordVersion=response.keywordVersion, categories={})
        if categories:
            response.categories = {category: response.categories[category] for category in categories if category in response.categories}
        if limit_per_category is not None:
            response.categories = {
                category: options[: max(limit_per_category, 0)]
                for category, options in response.categories.items()
            }
        return response

    def build_dialogue(self, request: DialogueRequest) -> DialogueResponse:
        log_debug_event(
            "dialogue.build.start",
            generalId=request.generalId,
            contextKey=request.contextKey,
            selectedKeywordKeys=request.selectedKeywordKeys,
            toneMode=request.toneMode,
            locale=request.locale,
            speechContextMode=request.speechContextMode,
            llmModelPreset=request.llmModelPreset,
            maxChars=request.maxChars,
            saveId=request.saveId,
            hasMemoryContext=has_memory_context_content(request.memoryContext),
        )
        context_response = self.get_context_options(request.generalId)
        keyword_response = self.get_keyword_options(request.generalId)
        persona_card = self.get_persona_card(request.generalId)
        memory_context = self._resolve_memory_context(request)
        selected_context = self._select_context(context_response, request.contextKey)
        keyword_index = self._index_keywords(keyword_response)

        used_keywords: list[UsedKeyword] = []
        rejected_keyword_keys: list[str] = []
        for keyword_key in request.selectedKeywordKeys:
            keyword_entry = keyword_index.get(keyword_key)
            if keyword_entry is None:
                rejected_keyword_keys.append(keyword_key)
                continue
            category, keyword = keyword_entry
            used_keywords.append(
                UsedKeyword(
                    keywordKey=keyword.keywordKey,
                    category=category,
                    label=keyword.label,
                    sourceRefs=keyword.sourceRefs,
                )
            )

        evidence_refs = sorted(
            {
                ref
                for ref in ((selected_context.evidenceRefs if selected_context else []) + [ref for keyword in used_keywords for ref in keyword.sourceRefs])
            }
        )
        deterministic_text = self._render_deterministic_dialogue(
            selected_context,
            used_keywords,
            persona_card,
            request.maxChars,
            request.locale,
            request.speechContextMode,
        )
        resolved_evidence = self._resolve_evidence(request.generalId, selected_context, used_keywords, evidence_refs)
        log_debug_event(
            "dialogue.build.resolved",
            generalId=request.generalId,
            locale=request.locale,
            speechContextMode=request.speechContextMode,
            selectedContext=self._context_subset(selected_context),
            usedKeywords=[keyword.model_dump() for keyword in used_keywords],
            rejectedKeywordKeys=rejected_keyword_keys,
            evidenceRefs=evidence_refs,
            resolvedEvidenceRefs=[evidence.evidenceRef for evidence in resolved_evidence],
            deterministicPreview=deterministic_text,
        )
        preset_config = LLM_MODEL_PRESETS.get(request.llmModelPreset, LLM_MODEL_PRESETS[DEFAULT_LLM_MODEL_PRESET])
        generation = self.provider_router.generate(
            DialoguePromptPackage(
                generalId=request.generalId,
                personaCardSubset=self._persona_subset(persona_card),
                memoryContext=memory_context.model_dump(exclude_none=True) if memory_context else None,
                selectedContext=self._context_subset(selected_context),
                selectedKeywords=[keyword.model_dump() for keyword in used_keywords],
                resolvedEvidence=resolved_evidence,
                evidenceRefs=evidence_refs,
                deterministicText=deterministic_text,
                maxChars=request.maxChars,
                toneMode=request.toneMode,
                locale=request.locale,
                speechContextMode=request.speechContextMode,
            ),
            provider_order=preset_config["providerOrder"],
            model_overrides=preset_config["modelOverrides"],
            allow_deterministic_fallback=preset_config["allowDeterministicFallback"],
        )
        self._record_llm_dialogue_history(request, selected_context, used_keywords, evidence_refs, generation)
        log_debug_event(
            "dialogue.build.result",
            generalId=request.generalId,
            locale=request.locale,
            speechContextMode=request.speechContextMode,
            llmModelPreset=request.llmModelPreset,
            provider=generation.provider,
            model=generation.model,
            providerTrace=generation.providerTrace,
            qualityWarnings=generation.qualityWarnings,
            repairUsed=generation.repairUsed,
            usedEvidenceRefs=generation.usedEvidenceRefs,
            text=generation.text,
        )
        return DialogueResponse(
            generalId=request.generalId,
            contextKey=selected_context.contextKey if selected_context else request.contextKey,
            locale=request.locale,
            speechContextMode=request.speechContextMode,
            llmModelPreset=request.llmModelPreset,
            text=generation.text,
            evidenceRefs=evidence_refs,
            usedEvidenceRefs=generation.usedEvidenceRefs,
            usedKeywords=used_keywords,
            rejectedKeywordKeys=rejected_keyword_keys,
            fallbackUsed=generation.fallbackUsed,
            generationMode=generation.generationMode,
            provider=generation.provider,
            model=generation.model,
            providerTrace=generation.providerTrace,
            qualityWarnings=generation.qualityWarnings,
            repairUsed=generation.repairUsed,
        )

    def _resolve_memory_context(self, request: DialogueRequest) -> GeneralMemoryContext | None:
        if request.memoryContext is not None:
            return request.memoryContext if has_memory_context_content(request.memoryContext) else None
        if not request.saveId:
            return None
        memory = load_general_memory(self.repo_root, request.saveId, request.generalId)
        return memory_context_from_data(memory)

    def get_persona_card(self, general_id: str) -> PersonaCard | None:
        runtime_persona = self._read_runtime_persona(general_id)
        if runtime_persona:
            voice = runtime_persona.get("voiceAndPrompt") or {}
            profile = runtime_persona.get("profile") or {}
            return PersonaCard.model_validate({
                "generalId": general_id,
                "personaVersion": runtime_persona.get("personaVersion") or "general_runtime_persona_v1",
                "displayName": runtime_persona.get("displayName") or general_id,
                "voiceStyle": voice.get("voiceStyle") or [],
                "personalityTraits": profile.get("personalityTags") or [],
                "safeFallbackLine": voice.get("safeFallbackLine") or f"{runtime_persona.get('displayName') or general_id}仍須有憑有據，不可妄言。",
                "taboos": voice.get("taboos") or [],
                "evidenceRefs": runtime_persona.get("evidenceRefs") or [],
            })
        path = self.persona_root / f"{general_id}.persona.json"
        if not path.exists():
            payload = self._read_optional_json("persona-card.response.json")
            if not payload or payload.get("generalId") != general_id:
                return None
            return PersonaCard.model_validate(payload)
        return PersonaCard.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def _read_json(self, filename: str):
        path = self.artifact_root / filename
        return json.loads(path.read_text(encoding="utf-8"))

    def _read_optional_json(self, filename: str):
        path = self.artifact_root / filename
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def _read_runtime_persona(self, general_id: str):
        path = self.runtime_profile_root / general_id / f"{general_id}.persona.json"
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def _read_runtime_keywords(self, general_id: str):
        path = self.runtime_profile_root / general_id / f"{general_id}.keywords.json"
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def _resolve_path(self, path: Path) -> Path:
        return path if path.is_absolute() else self.repo_root / path

    def _select_context(self, response: ContextOptionsResponse, context_key: str | None) -> ContextOption | None:
        if not response.options:
            return None
        if context_key:
            for option in response.options:
                if option.contextKey == context_key:
                    return option
            return None
        return response.options[0]

    def _index_keywords(self, response: KeywordOptionsResponse) -> dict[str, tuple[str, KeywordOption]]:
        return {
            option.keywordKey: (category, option)
            for category, options in response.categories.items()
            for option in options
        }

    def _render_deterministic_dialogue(
        self,
        context: ContextOption | None,
        keywords: list[UsedKeyword],
        persona: PersonaCard | None,
        max_chars: int,
        locale: str,
        speech_context_mode: str,
    ) -> str:
        context_label = context.label if context else "舊事"
        keyword_labels = [keyword.label for keyword in keywords[:2]]
        display_name = persona.displayName if persona else "張飛"
        keyword_text = "、".join(keyword_labels) if keyword_labels else context_label
        if locale == "en":
            text = f"About {keyword_text}, I am {display_name}; I will guard my lord first and settle victory after."
        elif locale == "ja":
            text = f"{keyword_text}のことなら、俺はまず主君を守り、それから勝負を語る。"
        elif keyword_labels:
            prefix = {
                "life_chat": "閒聊說起",
                "encounter_speech": "當面撞見",
                "inner_monologue": "俺心裡想起",
                "meeting_statement": "帳中議到",
            }.get(speech_context_mode, "說起")
            text = f"{prefix}{context_label}與{keyword_text}，俺只記得當日一聲斷喝，先護住主公再論勝負。"
        elif persona:
            text = persona.safeFallbackLine
        else:
            text = f"說起{context_label}，俺{display_name}只認一個理：臨陣不可退，先護住主公。"
        return text[:max_chars]

    def _record_llm_dialogue_history(
        self,
        request: DialogueRequest,
        selected_context: ContextOption | None,
        used_keywords: list[UsedKeyword],
        evidence_refs: list[str],
        generation,
    ) -> None:
        if generation.provider not in LLM_HISTORY_PROVIDERS:
            return
        text = str(generation.text or "").strip()
        if not text:
            return
        entry = {
            "createdAt": datetime.now(UTC).isoformat(),
            "generalId": request.generalId,
            "contextKey": selected_context.contextKey if selected_context else request.contextKey,
            "locale": request.locale,
            "speechContextMode": request.speechContextMode,
            "llmModelPreset": request.llmModelPreset,
            "keywordKeys": [keyword.keywordKey for keyword in used_keywords],
            "keywordLabels": [keyword.label for keyword in used_keywords],
            "evidenceRefs": evidence_refs,
            "usedEvidenceRefs": generation.usedEvidenceRefs,
            "provider": generation.provider,
            "model": generation.model,
            "generationMode": generation.generationMode,
            "qualityWarnings": generation.qualityWarnings,
            "repairUsed": generation.repairUsed,
            "text": text,
        }
        try:
            self.history_cache_path.parent.mkdir(parents=True, exist_ok=True)
            with self.history_cache_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except OSError as exc:
            log_debug_event("dialogue.history.write-failed", path=str(self.history_cache_path), error=str(exc))

    def _persona_subset(self, persona: PersonaCard | None) -> dict:
        if persona is None:
            return {}
        return {
            "generalId": persona.generalId,
            "personaVersion": persona.personaVersion,
            "displayName": persona.displayName,
            "voiceStyle": persona.voiceStyle,
            "personalityTraits": persona.personalityTraits,
            "taboos": persona.taboos,
            "safeFallbackLine": persona.safeFallbackLine,
            "evidenceRefs": persona.evidenceRefs,
        }

    def _context_subset(self, context: ContextOption | None) -> dict | None:
        if context is None:
            return None
        return {
            "contextKey": context.contextKey,
            "label": context.label,
            "sourceType": context.sourceType,
            "confidence": context.confidence,
            "evidenceRefs": context.evidenceRefs,
        }

    def _resolve_evidence(
        self,
        general_id: str,
        context: ContextOption | None,
        keywords: list[UsedKeyword],
        evidence_refs: list[str],
    ) -> list[ResolvedEvidence]:
        if not evidence_refs:
            return []
        runtime_persona = self._read_runtime_persona(general_id)
        if runtime_persona:
            event_key_candidates = {context.contextKey for context in [context] if context is not None}
            evidence_ref_set = set(evidence_refs)
            resolved: list[ResolvedEvidence] = []
            seen_refs: set[str] = set()
            for beat in runtime_persona.get("storyBeats") or []:
                beat_refs = [str(ref) for ref in beat.get("sourceRefs") or []]
                has_context_match = (beat.get("eventKey") in event_key_candidates) or (beat.get("eventId") in event_key_candidates)
                has_ref_match = bool(evidence_ref_set.intersection(beat_refs))
                if not has_context_match and not has_ref_match:
                    continue
                evidence_ref = next((ref for ref in beat_refs if ref in evidence_ref_set), beat_refs[0] if beat_refs else beat.get("eventId", "event"))
                if evidence_ref in seen_refs:
                    continue
                seen_refs.add(evidence_ref)
                resolved.append(
                    ResolvedEvidence(
                        evidenceRef=evidence_ref,
                        sourceType="romance-runtime-profile",
                        sourceQuote=beat.get("sourceQuote"),
                        factSummary=beat.get("summary"),
                        confidence=float(beat.get("confidence") or 0.72),
                    )
                )
                if len(resolved) >= 5:
                    break
            return resolved
        event_key_candidates = {context.contextKey for context in [context] if context is not None}
        event_key_candidates.update(keyword.keywordKey for keyword in keywords if keyword.category == "event")
        evidence_ref_set = set(evidence_refs)
        resolved: list[ResolvedEvidence] = []
        seen_refs: set[str] = set()
        for event in self._load_ready_events():
            if general_id not in event.get("generalIds", []):
                continue
            event_refs = [str(ref) for ref in event.get("sourceRefs", [])]
            has_context_match = event.get("eventKey") in event_key_candidates
            has_ref_match = bool(evidence_ref_set.intersection(event_refs))
            if not has_context_match and not has_ref_match:
                continue
            evidence_ref = next((ref for ref in event_refs if ref in evidence_ref_set), event_refs[0] if event_refs else event.get("eventId", "event"))
            if evidence_ref in seen_refs:
                continue
            seen_refs.add(evidence_ref)
            resolved.append(
                ResolvedEvidence(
                    evidenceRef=evidence_ref,
                    sourceType="romance",
                    sourceQuote=event.get("sourceQuote"),
                    factSummary=event.get("summary"),
                    confidence=float(event.get("confidence") or 0.0),
                )
            )
            if len(resolved) >= 5:
                break
        return resolved

    def _load_ready_events(self) -> list[dict]:
        if self._ready_events_cache is not None:
            return self._ready_events_cache
        path = self.event_root / "events.jsonl"
        if not path.exists():
            self._ready_events_cache = []
            return self._ready_events_cache
        events: list[dict] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            payload = json.loads(line)
            if payload.get("reviewStatus") == "ready":
                events.append(payload)
        self._ready_events_cache = events
        return events


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "AGENTS.md").exists() and (candidate / "server/npc-brain").exists():
            return candidate
    raise FileNotFoundError("Could not locate repo root from current working directory.")