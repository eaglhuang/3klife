from __future__ import annotations

import json
import os
import re
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Any

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
    get_memory_runtime_config,
    has_memory_context_content,
    increment_uncompressed_count,
    load_general_memory,
    memory_context_from_data,
    save_general_memory,
)
from .evidence_resolver import EvidenceResolver, ResolvedEvidencePack
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
    DialogueGenerationResult,
    DialoguePromptPackage,
    DialogueProviderRouter,
    SPEECH_CONTEXT_INSTRUCTIONS,
    load_local_env,
    log_debug_event,
)
from .memory_compressor import compress_general_memory
from .runtime_profile_store import RuntimeProfileStore
from .scene_image_renderer import GeminiSceneImageRenderer
from .vector_config import load_vector_runtime_config


DEFAULT_ARTIFACT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/api-readiness")
DEFAULT_EVENT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/events")
DEFAULT_PERSONA_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/persona-cards")
DEFAULT_RUNTIME_PROFILE_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/runtime-general-profiles")
DEFAULT_CHAPTER_ROOT = Path("artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters")
PERSONA_VERSION = "general_persona_v2"
LLM_HISTORY_PROVIDERS = {"gemini", "gemini_flash", "gemini_flash_lite", "local_llama"}
SUPPORTED_LOCALES = set(LOCALE_INSTRUCTIONS.keys())
SUPPORTED_SPEECH_CONTEXT_MODES = set(SPEECH_CONTEXT_INSTRUCTIONS.keys())
DEFAULT_LLM_MODEL_PRESET = "fallback_chain"
HARD_RELATIONSHIP_PAIR_TYPES: dict[frozenset[str], str] = {
    frozenset({"liu-bei", "guan-yu"}): "sworn_sibling",
    frozenset({"liu-bei", "zhang-fei"}): "sworn_sibling",
    frozenset({"guan-yu", "zhang-fei"}): "sworn_sibling",
}
TARGET_ID_NAME_COLLISIONS: dict[str, dict[str, str]] = {
    "zhang-bao": {
        "張寶": "zhang-bao-enemy",
        "张宝": "zhang-bao-enemy",
        "地公將軍": "zhang-bao-enemy",
        "地公将军": "zhang-bao-enemy",
    },
}
YELLOW_TURBAN_TARGET_IDS = {"zhang-bao-enemy", "zhang-jiao", "zhang-liang"}
YELLOW_TURBAN_CONTEXT_TERMS = (
    "黃巾",
    "黄巾",
    "張角",
    "张角",
    "張梁",
    "张梁",
    "張寶",
    "张宝",
    "地公將軍",
    "地公将军",
    "賊",
    "贼",
    "對壘",
    "对垒",
    "追襲",
    "追袭",
    "死戰",
    "死战",
)
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
    "scene_director_fast": {
        "label": "Scene Director Fast",
        "description": "Fast service-side scene director chain for demo rendering.",
        "providerOrder": ["gemini_flash_lite", "deterministic"],
        "modelOverrides": {"__timeoutMs": "1800", "__retryCount": "1"},
        "allowDeterministicFallback": True,
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

    @model_validator(mode="after")
    def enforce_ui_label_limit(self):
        if self.uiLabelMaxChars and self.uiLabelMaxChars > 0 and len(self.label) > self.uiLabelMaxChars:
            self.fullLabel = self.fullLabel or self.label
            self.label = self.label[: self.uiLabelMaxChars]
        return self


class KeywordOptionsResponse(BaseModel):
    generalId: str
    keywordVersion: str
    categories: dict[str, list[KeywordOption]] = Field(default_factory=dict)


class NarrativeInteractionTarget(BaseModel):
    targetId: str
    label: str
    role: str
    gender: str | None = None
    sourceType: str
    relationshipType: str | None = None
    confidence: float = Field(default=0.68, ge=0.0, le=1.0)
    evidenceRefs: list[str] = Field(default_factory=list)
    femaleFocus: bool = False


class NarrativeEvidenceCard(BaseModel):
    evidenceId: str
    contextKey: str | None = None
    angle: str
    title: str
    summary: str
    quote: str | None = None
    location: str | None = None
    chapterNo: int | None = None
    sourceType: str
    sourceRefs: list[str] = Field(default_factory=list)
    relatedTargetIds: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.72, ge=0.0, le=1.0)


class NarrativeActivitySeed(BaseModel):
    keywordKey: str
    label: str
    confidence: float = Field(default=0.72, ge=0.0, le=1.0)
    sourceRefs: list[str] = Field(default_factory=list)
    rawTag: str | None = None


class NarrativeProfileResponse(BaseModel):
    generalId: str
    displayName: str
    sourceMode: str
    canonicalWrites: bool = False
    persona: dict[str, Any] = Field(default_factory=dict)
    keywords: dict[str, list[dict[str, Any]]] = Field(default_factory=dict)
    relationshipEdges: list[dict[str, Any]] = Field(default_factory=list)
    evidenceCards: list[NarrativeEvidenceCard] = Field(default_factory=list)
    itemRelations: list[dict[str, Any]] = Field(default_factory=list)
    activitySeeds: list[NarrativeActivitySeed] = Field(default_factory=list)
    interactionTargets: list[NarrativeInteractionTarget] = Field(default_factory=list)
    illustrationPromptBase: str = ""


class DialogueRequest(BaseModel):
    generalId: str
    contextKey: str | None = None
    selectedKeywordKeys: list[str] = Field(default_factory=list)
    toneMode: str = "in-character"
    locale: str = DEFAULT_LOCALE
    speechContextMode: str = DEFAULT_SPEECH_CONTEXT_MODE
    llmModelPreset: str = DEFAULT_LLM_MODEL_PRESET
    maxChars: int = Field(default=80, ge=12, le=650)
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
    unresolvedEvidenceRefs: list[str] = Field(default_factory=list)
    resolutionTrace: list[str] = Field(default_factory=list)
    usedKeywords: list[UsedKeyword] = Field(default_factory=list)
    rejectedKeywordKeys: list[str] = Field(default_factory=list)
    fallbackUsed: bool
    generationMode: str
    provider: str | None = None
    model: str | None = None
    providerTrace: list[str] = Field(default_factory=list)
    qualityWarnings: list[str] = Field(default_factory=list)
    repairUsed: bool = False


class SceneIllustrationRequest(BaseModel):
    generalId: str
    prompt: str | None = None
    aspectRatio: str = "4:5"
    imageSize: str = "1K"


class SceneIllustrationResponse(BaseModel):
    generalId: str
    canonicalWrites: bool = False
    provider: str
    model: str
    cacheHit: bool = False
    promptUsed: str
    mimeType: str
    imageBase64: str
    caption: str | None = None


class SceneDirectorRequest(BaseModel):
    generalId: str
    angle: str | None = None
    targetId: str | None = None
    evidenceId: str | None = None
    renderMode: str = "data_first"
    chorusTargetIds: list[str] = Field(default_factory=list)
    locale: str = DEFAULT_LOCALE
    llmModelPreset: str = DEFAULT_LLM_MODEL_PRESET
    maxStoryChars: int = Field(default=560, ge=160, le=650)
    maxChorusChars: int = Field(default=110, ge=24, le=180)

    @model_validator(mode="after")
    def normalize_scene_director_fields(self):
        self.chorusTargetIds = list(dict.fromkeys(target_id for target_id in self.chorusTargetIds if target_id))
        if self.renderMode not in {"data_first", "llm_polish"}:
            self.renderMode = "data_first"
        if self.locale not in SUPPORTED_LOCALES:
            self.locale = DEFAULT_LOCALE
        if self.llmModelPreset not in SUPPORTED_LLM_MODEL_PRESETS:
            self.llmModelPreset = DEFAULT_LLM_MODEL_PRESET
        return self


class ScenePresenceDecision(BaseModel):
    status: str
    reason: str
    sourceText: str | None = None


class SceneDirectorBeats(BaseModel):
    sceneText: str
    memoryText: str
    emotionText: str
    dialogueText: str
    intentText: str
    presence: ScenePresenceDecision
    sceneFacts: dict[str, Any] = Field(default_factory=dict)
    sceneSeeds: dict[str, Any] = Field(default_factory=dict)
    sourceRefs: list[str] = Field(default_factory=list)
    evidenceId: str | None = None


class SceneChorusLine(BaseModel):
    targetId: str
    label: str
    role: str
    text: str
    provider: str | None = None
    model: str | None = None
    fallbackUsed: bool = False
    evidenceRefs: list[str] = Field(default_factory=list)


class SceneEvidenceResolution(BaseModel):
    usedEvidenceRefs: list[str] = Field(default_factory=list)
    unresolvedEvidenceRefs: list[str] = Field(default_factory=list)
    resolutionTrace: list[str] = Field(default_factory=list)


class SceneDirectorResponse(BaseModel):
    generalId: str
    displayName: str
    canonicalWrites: bool = False
    angle: str | None = None
    requestedAngle: str | None = None
    resolvedAngle: str | None = None
    targetId: str | None = None
    targetLabel: str | None = None
    dataStatus: str = "empty"
    isEmpty: bool = False
    fallbackReason: str | None = None
    emptyReason: str | None = None
    evidenceResolution: SceneEvidenceResolution = Field(default_factory=SceneEvidenceResolution)
    beats: SceneDirectorBeats
    storyText: str
    storyProvider: str | None = None
    storyModel: str | None = None
    storyFallbackUsed: bool = False
    chorusLines: list[SceneChorusLine] = Field(default_factory=list)
    providerTrace: list[str] = Field(default_factory=list)


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
        artifact_root_path = artifact_root or Path(os.environ.get("NPC_ARTIFACT_ROOT") or DEFAULT_ARTIFACT_ROOT)
        persona_root_path = persona_root or Path(os.environ.get("NPC_PERSONA_ROOT") or DEFAULT_PERSONA_ROOT)
        runtime_profile_root_path = runtime_profile_root or Path(
            os.environ.get("NPC_RUNTIME_PROFILE_ROOT") or DEFAULT_RUNTIME_PROFILE_ROOT
        )
        event_root_path = event_root or Path(os.environ.get("NPC_EVENT_ROOT") or DEFAULT_EVENT_ROOT)
        self.store = RuntimeProfileStore(
            repo_root=self.repo_root,
            artifact_root=artifact_root_path,
            persona_root=persona_root_path,
            runtime_profile_root=runtime_profile_root_path,
            event_root=event_root_path,
        )
        self.artifact_root = self.store.artifact_root
        self.persona_root = self.store.persona_root
        self.runtime_profile_root = self.store.runtime_profile_root
        self.event_root = self.store.event_root
        self.history_cache_path = self._resolve_path(Path(os.environ.get("NPC_LLM_HISTORY_CACHE_PATH") or DEFAULT_HISTORY_CACHE_PATH))
        self.provider_router = provider_router or DialogueProviderRouter()
        self.evidence_resolver = EvidenceResolver(self.store)
        self.scene_image_renderer = GeminiSceneImageRenderer(cache_root=self.repo_root / "local/npc-scene-image-cache")
        self._roster_index_cache: dict[str, dict[str, Any]] | None = None
        self._chapter_paragraph_cache: dict[str, list[str]] = {}
        self._scene_chorus_cache: dict[str, SceneChorusLine] = {}
        self._scene_chorus_cache_lock = Lock()

    def get_health(self) -> dict:
        provider_order = self.provider_router.provider_order
        vector_config = load_vector_runtime_config()
        memory_config = get_memory_runtime_config(self.repo_root)
        vector_health = vector_config.as_health()
        vector_health["runtimeMode"] = "artifact-first-vector-second"
        vector_health["offlineDegradeReady"] = False
        vector_second_plan = self.evidence_resolver.vector_second.describe()
        vector_health["vectorSecond"] = {
            **vector_second_plan,
            "enabled": True,
            "strategies": [
                "exact-ref-completion",
                "pinecone/qdrant backend query",
            ],
        }
        vector_health["notes"] = [
            "runtime profiles and ready events are the source of truth",
            "remote vector providers supplement recall only",
            "server currently runs exact-ref completion and a Pinecone/Qdrant backend second pass over vector-ready facts",
            "sqlite_vec remains stub and is not a production offline fallback",
        ]
        sqlite_health = dict(vector_health.get("sqliteVec") or {})
        sqlite_health["status"] = "stub"
        sqlite_health["productionReady"] = False
        vector_health["sqliteVec"] = sqlite_health
        return {
            "ok": True,
            "service": "npc-brain",
            "llm": {
                "providerOrder": provider_order,
                "geminiConfigured": bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")),
                "geminiModel": os.environ.get("NPC_LLM_MODEL_GEMINI") or os.environ.get("NPC_LLM_MODEL") or "gemini-2.5-pro",
                "geminiFlashModel": os.environ.get("NPC_LLM_MODEL_GEMINI_FLASH") or "gemini-2.5-flash",
                "geminiFlashLiteModel": os.environ.get("NPC_LLM_MODEL_GEMINI_FLASH_LITE") or "gemini-2.5-flash-lite",
                "geminiImageConfigured": bool(self.scene_image_renderer.api_key),
                "geminiImageModel": self.scene_image_renderer.model,
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
            "vector": vector_health,
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
        persona = self.get_persona_card(request.generalId)
        return compress_general_memory(self.repo_root, request, self._persona_subset(persona))

    def get_context_options(self, general_id: str, limit: int | None = None) -> ContextOptionsResponse:
        runtime_persona = self.store.read_runtime_persona(general_id)
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
            if not options:
                options = [
                    ContextOption(
                        contextKey=f"highlight:{highlight.get('sourceRef') or index}",
                        label=str(highlight.get("example") or highlight.get("sourceRef") or f"source-{index}"),
                        sourceType="runtime-source-highlight",
                        confidence=0.68,
                        evidenceRefs=[str(highlight.get("sourceRef"))] if highlight.get("sourceRef") else [],
                    )
                    for index, highlight in enumerate(runtime_persona.get("sourceHighlights") or [])
                    if highlight.get("sourceRef")
                ]
            if limit is not None:
                options = options[: max(limit, 0)]
            return ContextOptionsResponse(generalId=general_id, options=options)
        payload = self.store.read_api_fixture("context-options.response.json")
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
        runtime_keywords = self.store.read_runtime_keywords(general_id)
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
        payload = self.store.read_api_fixture("keyword-options.response.json")
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

    def get_narrative_profile(self, general_id: str) -> NarrativeProfileResponse:
        runtime_persona = self.store.read_runtime_persona(general_id) or {}
        runtime_keywords = self.store.read_runtime_keywords(general_id) or {}
        runtime_relationships = self.store.read_runtime_relationships(general_id) or {}
        persona_card = self.get_persona_card(general_id)
        roster_index = self._load_roster_index()
        display_name = (
            str(runtime_persona.get("displayName") or "").strip()
            or (persona_card.displayName if persona_card else "")
            or self._roster_name_for(general_id, roster_index)
            or general_id
        )
        interaction_targets = self._build_interaction_targets(
            general_id=general_id,
            runtime_persona=runtime_persona,
            runtime_keywords=runtime_keywords,
            runtime_relationships=runtime_relationships,
            roster_index=roster_index,
        )
        evidence_cards = self._build_narrative_evidence_cards(
            runtime_persona=runtime_persona,
            runtime_relationships=runtime_relationships,
            interaction_targets=interaction_targets,
        )
        activity_seeds = self._build_activity_seeds(runtime_persona=runtime_persona, runtime_keywords=runtime_keywords)
        persona_payload = {
            **runtime_persona,
            "displayName": display_name,
            "voiceStyle": (runtime_persona.get("voiceAndPrompt") or {}).get("voiceStyle")
            or (persona_card.voiceStyle if persona_card else []),
            "personalityTraits": (runtime_persona.get("profile") or {}).get("personalityTags")
            or (persona_card.personalityTraits if persona_card else []),
            "safeFallbackLine": (runtime_persona.get("voiceAndPrompt") or {}).get("safeFallbackLine")
            or (persona_card.safeFallbackLine if persona_card else ""),
            "taboos": (runtime_persona.get("voiceAndPrompt") or {}).get("taboos")
            or (persona_card.taboos if persona_card else []),
        }
        return NarrativeProfileResponse(
            generalId=general_id,
            displayName=display_name,
            sourceMode="runtime-general-profiles" if runtime_persona else "persona-card-fallback",
            canonicalWrites=False,
            persona=persona_payload,
            keywords=runtime_keywords.get("categories") or {},
            relationshipEdges=list(runtime_relationships.get("anchors") or []),
            evidenceCards=evidence_cards,
            itemRelations=[],
            activitySeeds=activity_seeds,
            interactionTargets=interaction_targets,
            illustrationPromptBase=self._build_illustration_prompt(display_name, runtime_persona, interaction_targets),
        )

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
            request.generalId,
            selected_context,
            used_keywords,
            persona_card,
            request.maxChars,
            request.locale,
            request.speechContextMode,
        )
        evidence_pack = self._resolve_evidence(request.generalId, selected_context, used_keywords, evidence_refs)
        resolved_evidence = evidence_pack.resolvedEvidence
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
            unresolvedEvidenceRefs=evidence_pack.unresolvedEvidenceRefs,
            resolutionTrace=evidence_pack.resolutionTrace,
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
            unresolvedEvidenceRefs=evidence_pack.unresolvedEvidenceRefs,
            resolutionTrace=evidence_pack.resolutionTrace,
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

    def render_scene_illustration(self, request: SceneIllustrationRequest) -> SceneIllustrationResponse:
        runtime_persona = self.store.read_runtime_persona(request.generalId) or {}
        roster_index = self._load_roster_index()
        display_name = (
            str(runtime_persona.get("displayName") or "").strip()
            or self._roster_name_for(request.generalId, roster_index)
            or request.generalId
        )
        prompt = str(request.prompt or "").strip() or self._build_illustration_prompt(display_name, runtime_persona, [])
        result = self.scene_image_renderer.render(
            prompt,
            aspect_ratio=request.aspectRatio,
            image_size=request.imageSize,
        )
        return SceneIllustrationResponse(
            generalId=request.generalId,
            canonicalWrites=False,
            provider=result.provider,
            model=result.model,
            cacheHit=result.cache_hit,
            promptUsed=result.prompt_used,
            mimeType=result.mime_type,
            imageBase64=result.image_base64,
            caption=result.caption,
        )

    def build_scene_director(self, request: SceneDirectorRequest) -> SceneDirectorResponse:
        profile = self.get_narrative_profile(request.generalId)
        target = self._select_narrative_target(profile.interactionTargets, request.targetId)
        target_invalid = bool(request.targetId and target is None)
        card = self._select_narrative_card(
            profile.evidenceCards,
            request.evidenceId,
            request.angle,
            target,
            actor_aliases=self._actor_label_aliases(profile),
        )
        evidence_invalid = bool(request.evidenceId and not any(card_item.evidenceId == request.evidenceId for card_item in profile.evidenceCards))
        semantic_empty_reason = self._scene_pair_empty_reason(request.angle, card, target)
        has_scene_data = card is not None and not target_invalid and not evidence_invalid and not semantic_empty_reason
        data_status, fallback_reason = self._scene_data_status(
            requested_angle=request.angle,
            requested_target_id=request.targetId,
            requested_evidence_id=request.evidenceId,
            target_invalid=target_invalid,
            evidence_invalid=evidence_invalid,
            semantic_empty_reason=semantic_empty_reason,
            card=card,
            target=target,
        )
        beats = self._build_scene_director_beats(profile, card, target, request.angle) if has_scene_data else self._build_empty_scene_director_beats()
        evidence_refs = sorted(set(beats.sourceRefs))
        evidence_resolution = SceneEvidenceResolution(
            usedEvidenceRefs=evidence_refs[:12],
            unresolvedEvidenceRefs=[],
            resolutionTrace=[
                "scene-director:data-first",
                f"renderMode:{request.renderMode}",
                f"dataStatus:{data_status}",
            ],
        )
        if has_scene_data and request.renderMode == "llm_polish":
            story_fallback = self._render_scene_director_story(profile, target, beats)
            story_generation = self._generate_scene_director_text(
                general_id=request.generalId,
                persona_card=self.get_persona_card(request.generalId),
                memory_context=self._build_scene_director_story_context(profile, target, card, beats),
                selected_context=self._build_scene_director_selected_context(profile, target, card, beats),
                evidence_refs=evidence_refs,
                deterministic_text=story_fallback,
                max_chars=request.maxStoryChars,
                locale=request.locale,
                llm_model_preset=request.llmModelPreset,
                tone_mode="narrative_fusion",
            )
            story_generation = self._repair_complete_generation(
                story_generation,
                fallback_text=story_fallback,
                max_chars=request.maxStoryChars,
                warning_code="scene_story_trimmed_to_complete_sentence",
            )
            chorus_targets = self._select_chorus_targets(profile.interactionTargets, request.chorusTargetIds, target.targetId if target else None)
            chorus_lines = self._build_scene_chorus_lines(
                request=request,
                profile=profile,
                targets=chorus_targets,
                main_target=target,
                card=card,
                beats=beats,
                story_text=story_generation.text,
            )
        elif has_scene_data:
            story_text = self._render_scene_director_story(profile, target, beats)
            story_generation = DialogueGenerationResult(
                text=story_text,
                provider="data_first",
                model=None,
                generationMode="data_first",
                fallbackUsed=False,
                providerTrace=evidence_resolution.resolutionTrace,
                qualityWarnings=[],
                repairUsed=False,
            )
            chorus_targets = self._select_chorus_targets(profile.interactionTargets, request.chorusTargetIds, target.targetId if target else None)
            chorus_lines = [
                self._build_data_first_chorus_line(
                    profile=profile,
                    target=chorus_target,
                    main_target=target,
                    card=card,
                    beats=beats,
                    story_text=story_text,
                )
                for chorus_target in chorus_targets
            ]
        else:
            empty_reason = "invalid_request" if data_status == "invalid_request" else "目前沒有可用資料"
            story_generation = DialogueGenerationResult(
                text="",
                provider="data_first",
                model=None,
                generationMode="data_first-empty",
                fallbackUsed=False,
                providerTrace=[*evidence_resolution.resolutionTrace, f"empty:{empty_reason}"],
                qualityWarnings=[],
                repairUsed=False,
            )
            chorus_lines = []
        is_empty = not has_scene_data or not any(
            [
                beats.sceneText,
                beats.memoryText,
                beats.emotionText,
                beats.dialogueText,
                beats.intentText,
                story_generation.text,
            ]
        )
        return SceneDirectorResponse(
            generalId=request.generalId,
            displayName=profile.displayName,
            canonicalWrites=False,
            angle=card.angle if card else request.angle,
            requestedAngle=request.angle,
            resolvedAngle=card.angle if card else None,
            targetId=target.targetId if target else request.targetId,
            targetLabel=target.label if target else None,
            dataStatus=data_status,
            isEmpty=is_empty,
            fallbackReason=fallback_reason,
            emptyReason=("invalid_request" if data_status == "invalid_request" else "目前沒有可用資料") if is_empty else None,
            evidenceResolution=evidence_resolution,
            beats=beats,
            storyText=story_generation.text,
            storyProvider=story_generation.provider,
            storyModel=story_generation.model,
            storyFallbackUsed=story_generation.fallbackUsed,
            chorusLines=chorus_lines,
            providerTrace=story_generation.providerTrace,
        )

    def _scene_data_status(
        self,
        *,
        requested_angle: str | None,
        requested_target_id: str | None,
        requested_evidence_id: str | None,
        target_invalid: bool,
        evidence_invalid: bool,
        semantic_empty_reason: str | None,
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
    ) -> tuple[str, str | None]:
        if target_invalid or evidence_invalid:
            reason = "targetId 不存在" if target_invalid else "evidenceId 不存在"
            return "invalid_request", reason
        if semantic_empty_reason:
            return "empty", semantic_empty_reason
        if card is None:
            return "empty", "目前沒有可用資料"
        angle_matches = not requested_angle or card.angle == requested_angle
        target_matches = target is None or target.targetId in set(card.relatedTargetIds or [])
        evidence_matches = not requested_evidence_id or card.evidenceId == requested_evidence_id
        if angle_matches and target_matches and evidence_matches:
            return "direct", None
        if requested_angle and not angle_matches:
            return "angle_empty_filled", f"requestedAngle={requested_angle}; resolvedAngle={card.angle}"
        if requested_target_id and not target_matches:
            return "target_empty_filled", f"requestedTarget={requested_target_id}; resolvedTarget={target.targetId if target else '-'}"
        return "direct", None

    def _scene_pair_empty_reason(
        self,
        requested_angle: str | None,
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
    ) -> str | None:
        if not card or not target:
            return None
        relationship_type = str(target.relationshipType or "")
        role = str(target.role or "")
        if requested_angle in {"people", "resource", "bond"} and (
            relationship_type in {"enemy_rival", "battlefield_opponent", "betrayal_surrender"}
            or "敵對" in role
            or "戰場對手" in role
        ):
            label = {"people": "眾生", "resource": "恩義", "bond": "情義"}.get(requested_angle, requested_angle)
            return f"{label}角度不使用敵對競爭目標；請改用宿敵、戰場或關係角度"
        return None

    def _select_narrative_card(
        self,
        cards: list[NarrativeEvidenceCard],
        evidence_id: str | None,
        angle: str | None,
        target: NarrativeInteractionTarget | None = None,
        actor_aliases: list[str] | None = None,
    ) -> NarrativeEvidenceCard | None:
        if evidence_id:
            for card in cards:
                if card.evidenceId == evidence_id:
                    return card if self._card_matches_target(card, target) and self._card_source_matches_scene(card, target, actor_aliases) else None
            return None
        if angle:
            for card in cards:
                if (
                    card.angle == angle
                    and self._card_matches_target(card, target)
                    and self._card_source_matches_scene(card, target, actor_aliases)
                ):
                    return card
        if target is not None:
            return None
        return cards[0] if cards else None

    def _card_matches_target(
        self,
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
    ) -> bool:
        if card is None or target is None:
            return card is not None
        return target.targetId in set(card.relatedTargetIds or []) and self._card_source_mentions_target(card, target)

    def _card_source_mentions_target(
        self,
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
    ) -> bool:
        if not card or not target:
            return False
        return self._card_source_mentions_any(card, self._target_aliases_for_interaction(target))

    def _card_source_mentions_actor(
        self,
        card: NarrativeEvidenceCard | None,
        actor_aliases: list[str] | None,
    ) -> bool:
        return self._card_source_mentions_any(card, actor_aliases or [])

    def _card_source_matches_scene(
        self,
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
        actor_aliases: list[str] | None,
    ) -> bool:
        if not card:
            return False
        target_aliases = self._target_aliases_for_interaction(target) if target else []
        actor_aliases = actor_aliases or []
        units = self._card_match_text_units(card)
        if target_aliases and actor_aliases:
            return any(
                any(alias and alias in unit for alias in target_aliases)
                and any(alias and alias in unit for alias in actor_aliases)
                for unit in units
            )
        if target_aliases:
            return any(any(alias and alias in unit for alias in target_aliases) for unit in units)
        if actor_aliases:
            return any(any(alias and alias in unit for alias in actor_aliases) for unit in units)
        return True

    def _card_source_mentions_any(
        self,
        card: NarrativeEvidenceCard | None,
        aliases: list[str],
    ) -> bool:
        if not card or not aliases:
            return True
        return any(any(alias and alias in unit for alias in aliases) for unit in self._card_match_text_units(card))

    def _card_match_text_units(self, card: NarrativeEvidenceCard | None) -> list[str]:
        if not card:
            return []
        raw_units = [
            str(card.summary or "").strip(),
            str(card.quote or "").strip(),
            str(card.title or "").strip(),
            str(card.location or "").strip() if card.location else "",
        ]
        raw_units.extend(self._source_ref_paragraph(ref) for ref in card.sourceRefs if ref)
        units: list[str] = []
        for raw_unit in raw_units:
            if not raw_unit:
                continue
            sentences = self._split_source_sentences(raw_unit)
            units.extend(sentences or [raw_unit])
        return [unit for unit in units if unit]

    def _select_narrative_target(
        self,
        targets: list[NarrativeInteractionTarget],
        target_id: str | None,
    ) -> NarrativeInteractionTarget | None:
        if target_id:
            for target in targets:
                if target.targetId == target_id:
                    return target
            return None
        return targets[0] if targets else None

    def _select_chorus_targets(
        self,
        targets: list[NarrativeInteractionTarget],
        requested_ids: list[str],
        active_target_id: str | None,
    ) -> list[NarrativeInteractionTarget]:
        by_id = {target.targetId: target for target in targets}
        selected = [by_id[target_id] for target_id in requested_ids if target_id in by_id and target_id != active_target_id]
        if selected:
            return selected[:4]
        return [target for target in targets if target.targetId != active_target_id][:4]

    def _build_empty_scene_director_beats(self) -> SceneDirectorBeats:
        return SceneDirectorBeats(
            sceneText="",
            memoryText="",
            emotionText="",
            dialogueText="",
            intentText="",
            presence=ScenePresenceDecision(status="unknown", reason="", sourceText=None),
            sceneFacts={},
            sceneSeeds={},
            sourceRefs=[],
            evidenceId=None,
        )

    def _build_scene_director_beats(
        self,
        profile: NarrativeProfileResponse,
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
        angle: str | None,
    ) -> SceneDirectorBeats:
        target_label = target.label if target else "互動對象"
        card_angle = card.angle if card else angle
        actor_aliases = self._actor_label_aliases(profile)
        candidate_cards = self._scene_seed_candidate_cards(profile, card, target, angle)
        source_refs = self._scene_seed_source_refs(candidate_cards, target)
        source_text_parts = [self._card_source_text(candidate) for candidate in candidate_cards]
        source_text = " ".join(part for part in source_text_parts if part)
        primary_source_text = self._card_source_text(card) or source_text
        presence = self._infer_scene_presence(target_label, [primary_source_text] if primary_source_text else source_text_parts)
        scene_text = self._first_clean_scene_seed(candidate_cards, target, actor_aliases)
        contextual_scene_text = self._source_derived_scene_text(card_angle, target, primary_source_text)
        if contextual_scene_text:
            scene_text = contextual_scene_text
        memory_text = self._sentence_or_default(
            self._source_derived_memory_text(card_angle, target, primary_source_text, scene_text),
            "",
            max_chars=120,
        )
        if not memory_text:
            memory_text = scene_text
        emotion_text = self._sentence_or_default(
            self._source_derived_emotion_text(card_angle, target, presence, primary_source_text),
            "",
            max_chars=96,
        )
        dialogue_seed = self._first_actor_dialogue_seed(
            candidate_cards,
            actor_aliases=actor_aliases,
            target=target,
            allow_secondary=not self._should_keep_dialogue_on_primary(primary_source_text, target),
        )
        dialogue_text = self._sentence_or_default(
            dialogue_seed,
            "",
            max_chars=80,
        )
        intent_text = self._sentence_or_default(
            self._source_derived_intent_text(card_angle, target, primary_source_text),
            "",
            max_chars=88,
        )
        scene_facts = self._build_scene_facts(
            profile=profile,
            card=card,
            target=target,
            candidate_cards=candidate_cards,
            angle=card_angle,
            source_text=primary_source_text,
            scene_text=scene_text,
            dialogue_text=dialogue_text,
            source_refs=source_refs,
        )
        scene_seeds = self._build_scene_six_seeds(
            profile=profile,
            target=target,
            scene_facts=scene_facts,
            memory_text=memory_text,
            emotion_text=emotion_text,
            dialogue_text=dialogue_text,
            intent_text=intent_text,
        )
        return SceneDirectorBeats(
            sceneText=scene_text,
            memoryText=memory_text,
            emotionText=emotion_text,
            dialogueText=dialogue_text,
            intentText=intent_text,
            presence=presence,
            sceneFacts=scene_facts,
            sceneSeeds=scene_seeds,
            sourceRefs=source_refs[:12],
            evidenceId=card.evidenceId if card else None,
        )

    def _scene_seed_candidate_cards(
        self,
        profile: NarrativeProfileResponse,
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
        angle: str | None,
    ) -> list[NarrativeEvidenceCard]:
        if not target:
            return [card] if card else []
        target_refs = set(target.evidenceRefs)
        target_aliases = self._target_aliases_for_interaction(target)
        requested_angle = angle or (card.angle if card else None)
        primary_refs = set(card.sourceRefs or []) if card else set()

        def score(candidate: NarrativeEvidenceCard) -> tuple[float, str]:
            candidate_refs = set(candidate.sourceRefs)
            source_text = self._card_source_text(candidate)
            value = float(candidate.confidence)
            if card and candidate.evidenceId == card.evidenceId:
                value += 1000.0
            if candidate.angle == requested_angle:
                value += 70.0
            if target.targetId in candidate.relatedTargetIds:
                value += 60.0
            if candidate_refs & target_refs:
                value += 35.0 + min(len(candidate_refs & target_refs), 6)
            if any(alias and alias in source_text for alias in target_aliases):
                value += 28.0
            if self._extract_quoted_dialogue(source_text):
                value += 14.0
            if candidate.angle == "emotion" or target.femaleFocus:
                if re.search(r"夫人|垂淚|煩惱|追兵|家|阿斗|嫂", source_text):
                    value += 10.0
            return (-value, candidate.evidenceId)

        candidates: list[NarrativeEvidenceCard] = []
        seen: set[str] = set()
        for candidate in [card, *profile.evidenceCards]:
            if candidate is None or candidate.evidenceId in seen:
                continue
            candidate_refs = set(candidate.sourceRefs)
            source_text = self._card_source_text(candidate)
            mentions_target = any(alias and alias in source_text for alias in target_aliases)
            if (
                primary_refs
                and candidate.evidenceId != (card.evidenceId if card else None)
                and not (candidate_refs & primary_refs)
            ):
                continue
            is_related = (
                candidate.evidenceId == (card.evidenceId if card else None)
                or (target.targetId in candidate.relatedTargetIds and mentions_target)
                or (bool(candidate_refs & target_refs) and mentions_target)
                or mentions_target
            )
            if not is_related:
                continue
            seen.add(candidate.evidenceId)
            candidates.append(candidate)
        return sorted(candidates, key=score)[:10]

    def _scene_seed_source_refs(
        self,
        candidate_cards: list[NarrativeEvidenceCard],
        target: NarrativeInteractionTarget | None,
    ) -> list[str]:
        refs: list[str] = []
        for candidate in candidate_cards:
            refs.extend(candidate.sourceRefs)
        if not refs and target:
            refs.extend(target.evidenceRefs)
        return list(dict.fromkeys(ref for ref in refs if ref))[:12]

    def _card_source_text(self, card: NarrativeEvidenceCard | None) -> str:
        if not card:
            return ""
        source_context = self._source_context_for_refs(card.sourceRefs, max_refs=1)
        return " ".join(
            part
            for part in [
                str(card.summary or "").strip(),
                str(card.quote or "").strip(),
                str(card.title or "").strip(),
                str(card.location or "").strip() if card.location else "",
                source_context,
            ]
            if part
        )

    def _source_context_for_refs(self, source_refs: list[str], max_refs: int = 2) -> str:
        paragraphs: list[str] = []
        for source_ref in source_refs:
            for paragraph in self._source_ref_context_window(source_ref):
                if paragraph and paragraph not in paragraphs:
                    paragraphs.append(paragraph)
            if len(paragraphs) >= max_refs:
                break
        return " ".join(paragraphs)

    def _source_ref_context_window(self, source_ref: str, radius: int = 1) -> list[str]:
        match = re.match(r"^(\d{3})#p(\d+)$", str(source_ref or "").strip())
        if not match:
            return []
        chapter_id, paragraph_index_text = match.groups()
        try:
            paragraph_index = int(paragraph_index_text)
        except ValueError:
            return []
        paragraphs = self._chapter_paragraphs(chapter_id)
        if paragraph_index < 0 or paragraph_index >= len(paragraphs):
            return []
        indexes = [paragraph_index]
        for offset in range(1, radius + 1):
            indexes.extend([paragraph_index - offset, paragraph_index + offset])
        result: list[str] = []
        for index in indexes:
            if index < 0 or index >= len(paragraphs):
                continue
            paragraph = paragraphs[index]
            if paragraph.startswith("#"):
                continue
            result.append(paragraph)
        return result

    def _source_ref_paragraph(self, source_ref: str) -> str:
        match = re.match(r"^(\d{3})#p(\d+)$", str(source_ref or "").strip())
        if not match:
            return ""
        chapter_id, paragraph_index_text = match.groups()
        try:
            paragraph_index = int(paragraph_index_text)
        except ValueError:
            return ""
        paragraphs = self._chapter_paragraphs(chapter_id)
        if paragraph_index < 0 or paragraph_index >= len(paragraphs):
            return ""
        paragraph = paragraphs[paragraph_index]
        if paragraph.startswith("#"):
            return ""
        return paragraph

    def _chapter_paragraphs(self, chapter_id: str) -> list[str]:
        cached = self._chapter_paragraph_cache.get(chapter_id)
        if cached is not None:
            return cached
        path = self.repo_root / DEFAULT_CHAPTER_ROOT / f"{chapter_id}.md"
        if not path.exists():
            self._chapter_paragraph_cache[chapter_id] = []
            return []
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            self._chapter_paragraph_cache[chapter_id] = []
            return []
        paragraphs = [" ".join(line.split()) for line in text.splitlines() if line.strip()]
        self._chapter_paragraph_cache[chapter_id] = paragraphs
        return paragraphs

    def _first_clean_scene_seed(
        self,
        candidate_cards: list[NarrativeEvidenceCard],
        target: NarrativeInteractionTarget | None,
        actor_aliases: list[str],
    ) -> str:
        options: list[tuple[float, str]] = []
        primary_options: list[tuple[float, str]] = []
        target_aliases = self._target_aliases_for_interaction(target) if target else []
        for index, candidate in enumerate(candidate_cards):
            for value in [candidate.summary, candidate.quote, self._source_context_for_refs(candidate.sourceRefs), candidate.title]:
                cleaned = self._clean_source_fragment(str(value or ""), target, actor_aliases, max_chars=120)
                if cleaned:
                    source_text = self._card_source_text(candidate)
                    score = float(candidate.confidence) + max(0, 120 - index * 18)
                    if self._extract_quoted_dialogue(source_text):
                        score += 45.0
                    if any(alias and alias in cleaned for alias in target_aliases):
                        score += 30.0
                    if re.search(r"追兵|喊聲|垂淚|煩惱|心腹之言|如之奈何", cleaned):
                        score += 24.0
                    if re.match(r"^[雲肅瑜亮操權備飛羽]故意", cleaned):
                        score -= 18.0
                    option = (score, cleaned)
                    if index == 0:
                        primary_options.append(option)
                    options.append(option)
        if primary_options:
            return sorted(primary_options, key=lambda item: (-item[0], item[1]))[0][1]
        if not options:
            return ""
        return sorted(options, key=lambda item: (-item[0], item[1]))[0][1]

    def _first_dialogue_seed(
        self,
        candidate_cards: list[NarrativeEvidenceCard],
        allow_secondary: bool = True,
    ) -> str:
        for index, candidate in enumerate(candidate_cards):
            if index > 0 and not allow_secondary:
                break
            for value in [candidate.quote, candidate.summary]:
                dialogue = self._extract_quoted_dialogue(str(value or ""))
                if dialogue:
                    return dialogue
        return ""

    def _first_actor_dialogue_seed(
        self,
        candidate_cards: list[NarrativeEvidenceCard],
        actor_aliases: list[str],
        target: NarrativeInteractionTarget | None,
        allow_secondary: bool = True,
    ) -> str:
        target_aliases = self._target_aliases_for_interaction(target) if target else []
        scored: list[tuple[float, str]] = []
        for index, candidate in enumerate(candidate_cards):
            if index > 0 and not allow_secondary:
                break
            for text in [self._source_context_for_refs(candidate.sourceRefs, max_refs=1), candidate.quote, candidate.summary]:
                scored.extend(
                    self._extract_actor_dialogue_candidates(
                        text=str(text or ""),
                        actor_aliases=actor_aliases,
                        target_aliases=target_aliases,
                        source_index=index,
                    )
                )
        if not scored:
            return ""
        return sorted(scored, key=lambda item: (-item[0], item[1]))[0][1]

    def _extract_actor_dialogue_candidates(
        self,
        text: str,
        actor_aliases: list[str],
        target_aliases: list[str],
        source_index: int,
    ) -> list[tuple[float, str]]:
        source = str(text or "")
        if not source or not actor_aliases:
            return []
        speaker_pattern = "|".join(re.escape(alias) for alias in actor_aliases if alias)
        if not speaker_pattern:
            return []
        candidates: list[tuple[float, str]] = []
        target_bridge_pattern = "|".join(re.escape(alias.replace(" ", "")) for alias in target_aliases if alias)
        for match in re.finditer(rf"({speaker_pattern})([^。！？「」]{{0,12}})(?:曰|道|告|泣告)[:：]?[「『]([^」』]{{2,140}})[」』]", source):
            bridge = str(match.group(2) or "")
            if "之" in bridge or re.search(r"其人|聞.*答|小童|童子|水鏡|先生", bridge):
                continue
            bridge_compact = re.sub(r"[，,、：:\s]", "", bridge)
            bridge_is_plain = bool(re.fullmatch(r"(?:又|復)?(?:問|答|告|謂|笑|泣|大叫|低聲)?", bridge_compact))
            bridge_addresses_target = bool(
                target_bridge_pattern
                and re.fullmatch(rf"(?:又|復)?(?:告|謂|問)(?:{target_bridge_pattern})", bridge_compact)
            )
            if not (bridge_is_plain or bridge_addresses_target):
                continue
            line = " ".join(match.group(3).split()).strip()
            if not line:
                continue
            sentence_start = max(0, source.rfind("。", 0, match.start()) + 1)
            sentence_end_candidates = [
                index
                for index in [
                    source.find("。", match.end()),
                    source.find("！", match.end()),
                    source.find("？", match.end()),
                ]
                if index != -1
            ]
            sentence_end = min(sentence_end_candidates) + 1 if sentence_end_candidates else min(len(source), match.end() + 80)
            near_sentence = source[sentence_start:sentence_end]
            if target_aliases and not any(alias and alias in near_sentence for alias in target_aliases):
                continue
            score = 100.0 - source_index * 18
            if target_aliases and any(alias and alias in near_sentence for alias in target_aliases):
                score += 35.0
            if re.search(r"夫人既知|備安敢相瞞|備欲不去|欲去，又捨不得夫人|荊州有失", line):
                score += 48.0
            if re.search(r"夫人|荊州|欲去|捨不得|煩惱|心腹之言|如之奈何|生死難忘", line):
                score += 22.0
            if re.search(r"切勿漏泄|若如此", line):
                score -= 42.0
            if re.search(r"有甚事|你且暫退|必須與夫人商議", line):
                score -= 30.0
            candidates.append((score, line))
        return candidates

    def _build_scene_facts(
        self,
        profile: NarrativeProfileResponse,
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
        candidate_cards: list[NarrativeEvidenceCard],
        angle: str | None,
        source_text: str,
        scene_text: str,
        dialogue_text: str,
        source_refs: list[str],
    ) -> dict[str, Any]:
        target_by_id = {item.targetId: item for item in profile.interactionTargets}
        people: list[dict[str, str | None]] = [
            {"id": profile.generalId, "label": profile.displayName, "role": "主角"}
        ]
        seen_people = {profile.generalId}
        if target:
            people.append({"id": target.targetId, "label": target.label, "role": target.role})
            seen_people.add(target.targetId)
        for candidate in candidate_cards:
            for related_id in candidate.relatedTargetIds:
                if related_id in seen_people:
                    continue
                related_target = target_by_id.get(related_id)
                related_label = related_target.label if related_target else self._roster_name_for(related_id, self._load_roster_index())
                if not any(alias and alias in source_text for alias in self._target_label_aliases(related_label)):
                    continue
                people.append(
                    {
                        "id": related_id,
                        "label": related_label,
                        "role": related_target.role if related_target else "相關人物",
                    }
                )
                seen_people.add(related_id)
                if len(people) >= 8:
                    break
            if len(people) >= 8:
                break

        primary_locations = [card.location] if card and card.location else []
        related_locations = [
            candidate.location
            for candidate in candidate_cards
            if candidate.location and (not card or candidate.evidenceId != card.evidenceId)
        ]
        locations = self._unique_nonempty(
            [
                *primary_locations,
                *self._extract_location_markers(source_text),
                *related_locations,
            ],
            limit=6,
        )
        time_markers = self._unique_nonempty(self._extract_time_markers(source_text), limit=5)
        objects = self._unique_nonempty(self._extract_scene_objects(source_text), limit=8)
        event_text = self._ensure_sentence(
            scene_text or self._clean_source_fragment(source_text, target, self._actor_label_aliases(profile), max_chars=96)
        )
        return {
            "people": people,
            "event": event_text,
            "time": time_markers,
            "locations": locations,
            "objects": objects,
            "dialogue": dialogue_text,
            "angle": angle,
            "evidenceIds": [candidate.evidenceId for candidate in candidate_cards[:6]],
            "sourceRefs": source_refs[:10],
        }

    def _unique_nonempty(self, values: list[str], limit: int) -> list[str]:
        result: list[str] = []
        for value in values:
            normalized = " ".join(str(value or "").split()).strip()
            if normalized and normalized not in result:
                result.append(normalized)
            if len(result) >= limit:
                break
        return result

    def _extract_time_markers(self, text: str) -> list[str]:
        return re.findall(
            r"(正談論間|正行間|正行之間|當夜|是夜|次日|是日|當日|五更|黎明|黃昏|既而|少頃|片刻|月餘|數月前|年終|歲旦|正旦|元旦)",
            str(text or ""),
        )

    def _extract_location_markers(self, text: str) -> list[str]:
        source = str(text or "")
        markers: list[str] = []
        for literal in ["南徐", "東吳", "荊州", "新野", "古城", "芒碭山", "南漳", "莊外", "莊院", "草堂", "大溪", "江邊", "官道", "北門", "南門"]:
            if literal in source:
                markers.append(literal)
        if re.search(r"正行間|正行之間|行間|行路", source):
            markers.append("行路途中")
        if re.search(r"追兵|喊聲大起|背後喊聲", source):
            markers.append("退路附近")
        if re.search(r"船中|船隻|船邊|渡口|津", source):
            markers.append("水路渡口")
        for match in re.findall(r"([\u4e00-\u9fff]{1,4}(?:江|津|城|寨|營|山|橋|關|郡|州|縣|渡|船中))", source):
            if (
                len(match) <= 6
                and not re.match(r"(只去|不想|殺奔|回|望|在|到|過|抹過|前面|使|龍|某夜來|可作速|恐有人|可乘|曹兵下|統眾將至|布上|倘|遂引兵攻)", match)
                and not re.search(r"報說|說荊州|使荊州", match)
            ):
                markers.append(match)
        return markers

    def _extract_scene_objects(self, text: str) -> list[str]:
        source = str(text or "")
        rules = [
            ("荊州危急", r"荊州危急"),
            ("追兵", r"追兵"),
            ("喊聲", r"喊聲"),
            ("古城", r"古城"),
            ("錦囊", r"錦囊"),
            ("府堂", r"府堂"),
            ("官道", r"官道"),
            ("二嫂", r"二嫂|嫂嫂|二夫人"),
            ("縣印", r"縣印"),
            ("蛇矛", r"蛇矛|丈八蛇矛"),
            ("蔡瑁設謀", r"蔡瑁設謀|蔡瑁"),
            ("躍馬檀溪", r"躍馬|檀溪|過溪"),
            ("車駕", r"車|推車"),
            ("船隻", r"船|船隻"),
            ("兵馬", r"兵|軍|人馬"),
            ("劍", r"劍"),
            ("馬", r"馬"),
            ("家眷", r"夫人|家眷|阿斗|嫂"),
        ]
        return [label for label, pattern in rules if re.search(pattern, source)]

    def _infer_scene_presence(self, target_label: str, text_parts: list[str]) -> ScenePresenceDecision:
        joined = " ".join(part for part in text_parts if part).strip()
        if not target_label or target_label not in joined:
            return ScenePresenceDecision(status="unknown", reason="原文沒有直接寫出同場動作", sourceText=joined[:120] or None)
        index = joined.find(target_label)
        near_target = joined[max(0, index - 36) : index + len(target_label) + 54]
        present_signals = re.compile(r"(見|謂|問|曰|坐|同|迎|至|入|引|救|護|追|戰|拜|會)")
        offstage_signals = re.compile(r"(聞|使|遣|報|書|召|念|思|失散|不見)")
        if present_signals.search(near_target):
            return ScenePresenceDecision(status="present", reason="原文附近有同場動作", sourceText=near_target)
        if offstage_signals.search(near_target):
            return ScenePresenceDecision(status="offstage", reason="原文附近偏向傳聞或不在場線索", sourceText=near_target)
        return ScenePresenceDecision(status="unknown", reason="原文提到對象，但同場狀態不明", sourceText=near_target)

    def _deterministic_emotion_text(
        self,
        angle: str | None,
        target: NarrativeInteractionTarget | None,
        presence: ScenePresenceDecision,
    ) -> str:
        if not target:
            return ""
        if target.femaleFocus or angle == "emotion":
            if presence.status == "present":
                return "情緒會先落在去留、家室與眼前安危。"
            return "情緒會先收住，避免把未確認的情分當成判斷。"
        if angle == "bond":
            return "判斷會先偏向信義與彼此能否互相托付。"
        if angle == "rival":
            return "警戒會升高，先看對方是否會反制或趁勢逼迫。"
        if angle == "battlefield":
            return "注意力會轉向兵勢、退路與眼前風險。"
        if angle == "resource":
            return "重點會落在可用物資與局勢代價。"
        if angle == "habit":
            return "會先從平日做事方式判斷下一步。"
        return ""

    def _deterministic_intent_text(self, angle: str | None, target: NarrativeInteractionTarget | None) -> str:
        if not target:
            return ""
        if angle == "emotion" or target.femaleFocus:
            return "先確認人是否安穩，再決定去留與軍務。"
        if angle == "bond":
            return "先守住信義與承諾，再安排後續行動。"
        if angle == "rival":
            return "先防對方變招，再尋找可反制的空隙。"
        if angle == "battlefield":
            return "先判斷退路與兵勢，再決定是否推進。"
        if angle == "resource":
            return "先核對可用資源，再避免局勢失衡。"
        if angle == "habit":
            return "先照既有做事節奏整理眼前線索。"
        return "先核對這條線索，再決定下一步。"

    def _extract_quoted_dialogue(self, quote: str) -> str:
        text = str(quote or "").strip()
        if not text:
            return ""
        matches = re.findall(r"[「『]([^」』]{2,80})[」』]", text)
        return matches[0].strip() if matches else ""

    def _actor_label_aliases(self, profile: NarrativeProfileResponse) -> list[str]:
        seeds = [profile.displayName]
        persona = profile.persona if isinstance(profile.persona, dict) else {}
        for key in ("aliases", "nameAliases"):
            value = persona.get(key)
            if isinstance(value, list):
                seeds.extend(str(item) for item in value if str(item).strip())
            elif value:
                seeds.append(str(value))
        aliases: list[str] = []
        for seed in seeds:
            for alias in self._target_label_aliases(seed):
                if alias and alias not in aliases:
                    aliases.append(alias)
        return sorted(aliases, key=len, reverse=True)

    def _clean_source_fragment(
        self,
        text: str,
        target: NarrativeInteractionTarget | None,
        actor_aliases: list[str],
        max_chars: int,
    ) -> str:
        sentences = [
            self._normalize_source_sentence(sentence, target, actor_aliases)
            for sentence in self._split_source_sentences(text)
        ]
        readable = [(index, sentence) for index, sentence in enumerate(sentences) if self._is_readable_source_sentence(sentence)]
        if not readable:
            return ""
        target_aliases = self._target_aliases_for_interaction(target) if target else []
        target_indexes = [
            index
            for index, sentence in readable
            if target_aliases and any(alias and alias in sentence for alias in target_aliases)
        ]
        actor_indexes = [
            index
            for index, sentence in readable
            if actor_aliases and any(alias and alias in sentence for alias in actor_aliases)
        ]
        joint_indexes = [index for index in target_indexes if index in set(actor_indexes)]
        selected: list[str] = []
        if joint_indexes:
            target_index = joint_indexes[0]
            previous = next((sentence for index, sentence in reversed(readable) if index < target_index), "")
            if previous and len(previous) <= 42 and not re.match(r"^[雲肅瑜亮操權備飛羽].{0,8}(故意|催|逼|曰|問|謂)", previous):
                selected.append(previous)
            selected.append(next(sentence for index, sentence in readable if index == target_index))
        elif actor_indexes:
            actor_index = actor_indexes[0]
            selected.append(next(sentence for index, sentence in readable if index == actor_index))
        elif target_indexes:
            target_index = target_indexes[0]
            selected.append(next(sentence for index, sentence in readable if index == target_index))
        else:
            selected.append(readable[0][1])
        return self._sentence_or_default("".join(selected), "", max_chars=max_chars)

    def _split_source_sentences(self, text: str) -> list[str]:
        normalized = re.sub(r"\s+", "", str(text or ""))
        normalized = re.sub(r"^(原文|線索|摘要)[:：]", "", normalized)
        if not normalized:
            return []
        return [match.group(0).strip() for match in re.finditer(r"[^。！？!?]+[。！？!?][」』]?", normalized)]

    def _normalize_source_sentence(
        self,
        sentence: str,
        target: NarrativeInteractionTarget | None,
        actor_aliases: list[str],
    ) -> str:
        normalized = str(sentence or "").strip()
        if not normalized:
            return ""
        for alias in actor_aliases:
            if alias:
                normalized = re.sub(rf"^{re.escape(alias)}", "", normalized)
        normalized = re.sub(r"^[又復]?(告|謂|問)([^曰：]{1,12})曰[:：]?", r"向\2說：", normalized)
        normalized = re.sub(r"^曰[:：]?", "", normalized)
        normalized = re.sub(r"^[，,、；：\s]+", "", normalized)
        if target:
            for alias in self._target_aliases_for_interaction(target):
                if alias and normalized.startswith(f"{alias}曰"):
                    normalized = normalized.replace(f"{alias}曰", f"{alias}說", 1)
                    break
        return normalized

    def _is_readable_source_sentence(self, sentence: str) -> bool:
        normalized = str(sentence or "").strip()
        if not normalized:
            return False
        if re.search(r"stableKnowledgeBootstrap|targetId|evidenceId|contextKey|angle=", normalized, re.I):
            return False
        if normalized.count("「") != normalized.count("」") or normalized.count("『") != normalized.count("』"):
            return False
        core = re.sub(r"[。！？!?，「」『』：；、\s]", "", normalized)
        if len(core) < 6:
            return False
        if re.fullmatch(r"[\u4e00-\u9fff]{1,4}(夫人|氏)?[。！？!?]?", normalized):
            return False
        return True

    def _source_derived_scene_text(
        self,
        angle: str | None,
        target: NarrativeInteractionTarget | None,
        source_text: str,
    ) -> str:
        text = str(source_text or "")
        if not text or not target or not (target.femaleFocus or angle == "emotion"):
            return ""
        if not self._source_mentions_target(text, target):
            return ""
        target_label = self._source_target_label(text, target)
        if re.search(r"躍馬過溪|水鏡|趙雲|雲長|翼德", text) and re.search(r"相見大喜|投新野|蔡瑁設謀", text):
            return f"脫險後重會{target_label}與舊部，眾人同回新野商議後路。"
        if re.search(r"芒碭山|占住城池|古城", text) and re.search(r"雲長|關公|二嫂|嫂嫂", text):
            return f"{target_label}據住古城，見雲長護送二嫂前來，怒疑他背義投曹。"
        if re.search(r"趙子龍|荊州危急|錦囊", text) and re.search(r"暗暗垂淚|垂淚", text):
            return f"聽趙雲報稱荊州危急後，入見{target_label}，以憂色試探去留。"
        if re.search(r"心腹之言|泣告", text):
            return f"車前泣告{target_label}，以心腹之言求她出面解危。"
        if re.search(r"暗暗垂淚|垂淚", text):
            return f"入見{target_label}，以垂淚引出去留難處。"
        return ""

    def _source_derived_memory_text(
        self,
        angle: str | None,
        target: NarrativeInteractionTarget | None,
        source_text: str,
        scene_text: str,
    ) -> str:
        text = str(source_text or "")
        if not text:
            return ""
        if target and self._source_mentions_target(text, target):
            target_label = self._source_target_label(text, target)
            if re.search(r"躍馬過溪|水鏡|趙雲|雲長|翼德", text) and re.search(r"相見大喜|投新野|蔡瑁設謀", text):
                return f"躍馬檀溪脫險後，趙雲尋到莊外，{target_label}也趕來相會。"
            if re.search(r"芒碭山|占住城池|古城", text) and re.search(r"雲長|關公|二嫂|嫂嫂", text):
                return f"{target_label}在古城安身，聽聞雲長護送二嫂前來，疑心他已背義投曹。"
        if target and (target.femaleFocus or angle == "emotion") and self._source_mentions_target(text, target):
            if re.search(r"趙子龍|荊州危急|錦囊", text) and re.search(r"暗暗垂淚|垂淚", text):
                return "趙雲帶來荊州危急的消息，他必須借思親祭祖向孫夫人開口。"
            if re.search(r"前後無路|追兵|心腹之言|泣告", text):
                return "前後受阻與追兵逼近，讓他想起必須請孫夫人出面解危。"
            if re.search(r"暗暗垂淚|垂淚", text):
                return "去留之事壓到眼前，只能先把藏住的難處帶到孫夫人面前。"
        if scene_text and scene_text not in text:
            return scene_text
        return ""

    def _should_keep_dialogue_on_primary(
        self,
        source_text: str,
        target: NarrativeInteractionTarget | None,
    ) -> bool:
        text = str(source_text or "")
        return bool(
            target
            and target.femaleFocus
            and self._source_mentions_target(text, target)
            and re.search(r"暗暗垂淚|垂淚|泣告|心腹之言", text)
        )

    def _source_mentions_target(self, source_text: str, target: NarrativeInteractionTarget) -> bool:
        text = str(source_text or "")
        return any(alias and alias in text for alias in self._target_aliases_for_interaction(target))

    def _source_target_label(self, source_text: str, target: NarrativeInteractionTarget) -> str:
        text = str(source_text or "")
        aliases = self._target_aliases_for_interaction(target)
        for alias in aliases:
            if alias and alias in text:
                return alias
        return target.label

    def _source_derived_emotion_text(
        self,
        angle: str | None,
        target: NarrativeInteractionTarget | None,
        presence: ScenePresenceDecision,
        source_text: str,
    ) -> str:
        text = str(source_text or "")
        if not text or not target:
            return ""
        if self._source_mentions_target(text, target):
            if re.search(r"躍馬過溪|水鏡|趙雲|雲長|翼德", text) and re.search(r"相見大喜|投新野|蔡瑁設謀", text):
                return "脫險後見舊部追至，驚疑才轉成安定與喜悅。"
            if re.search(r"芒碭山|占住城池|古城", text) and re.search(r"雲長|關公|二嫂|嫂嫂", text):
                return "久別後先起疑怒，重逢的喜意被背義之疑壓住。"
        if (angle == "emotion" or target.femaleFocus) and self._source_mentions_target(text, target):
            if re.search(r"欲去，又捨不得夫人|荊州有失|被天下人恥笑", text):
                return "想救荊州，又捨不得夫人，心緒在責任與情分之間拉扯。"
            if re.search(r"念備一身飄蕩異鄉|悒怏不已", text):
                return "他以思親祭祖開口，實則把回荊州的急迫壓在心裡。"
            if re.search(r"心腹之言|泣告", text):
                return "危局逼到眼前，情緒收束成求援與決斷。"
            if re.search(r"暗暗垂淚|垂淚", text):
                return "去留難處壓在心裡，先以憂色試探對方態度。"
        if target.femaleFocus and re.search(r"垂淚|煩惱|憂|驚|懼|泣", text):
            return "心緒落在憂懼與牽掛。"
        if angle == "emotion" and not target.femaleFocus:
            return ""
        if re.search(r"追兵|喊聲大起|逼近|趕來|趕至", text):
            return "追兵逼近，心緒先轉為急迫。"
        if target.femaleFocus and re.search(r"垂淚|煩惱|憂|驚|懼|泣", text):
            return "心緒落在憂懼與牽掛。"
        if presence.status == "present" and target.femaleFocus and re.search(r"夫人|妻|妹|家|阿斗|嫂", text):
            return "情緒落在家室與眼前安危。"
        return ""

    def _source_derived_intent_text(
        self,
        angle: str | None,
        target: NarrativeInteractionTarget | None,
        source_text: str,
    ) -> str:
        text = str(source_text or "")
        if not text or not target:
            return ""
        if self._source_mentions_target(text, target):
            if re.search(r"躍馬過溪|水鏡|趙雲|雲長|翼德", text) and re.search(r"投新野|蔡瑁設謀|致書於景升", text):
                return "先回新野，再由孫乾赴荊州說明蔡瑁設謀。"
            if re.search(r"芒碭山|占住城池|古城", text) and re.search(r"雲長|關公|二嫂|嫂嫂", text):
                return "先問明雲長去向與二嫂所證，再決定是否迎入古城。"
        if (angle == "emotion" or target.femaleFocus) and self._source_mentions_target(text, target):
            if re.search(r"兩個商議已定|正旦日|官道等候", text):
                return "與孫夫人定下正旦祭祖離開，並讓趙雲先到官道接應。"
            if re.search(r"夫人既知|備欲不去|欲去，又捨不得夫人", text):
                return "把荊州危急與不忍分離一併說明，請她共同決定去留。"
            if re.search(r"心腹之言|泣告", text):
                return "先把心腹之言說明，請她出面解危。"
            if re.search(r"暗暗垂淚|垂淚", text):
                return "先把去留難處說開，再尋求同行支持。"
        if target.femaleFocus and re.search(r"垂淚|煩惱|憂|驚|懼|泣", text):
            return "先把眼前的憂慮說清楚。"
        if angle == "emotion" and not target.femaleFocus:
            return ""
        if re.search(r"追兵|喊聲大起|逼近|趕來|趕至", text):
            return "先避開追兵，保住同行的人。"
        if target.femaleFocus and re.search(r"垂淚|煩惱|憂|驚|懼|泣", text):
            return "先把眼前的憂慮說清楚。"
        if target.femaleFocus and re.search(r"夫人|妻|妹|家|阿斗|嫂", text):
            return "先顧住同行家眷的安危。"
        return ""

    def _build_scene_six_seeds(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget | None,
        scene_facts: dict[str, Any],
        memory_text: str,
        emotion_text: str,
        dialogue_text: str,
        intent_text: str,
    ) -> dict[str, Any]:
        facts = scene_facts or {}
        people = self._scene_seed_people(profile, target, facts, extra_text=f"{memory_text} {intent_text}")
        objects = self._scene_seed_objects(facts)
        time_seed = self._scene_seed_time(facts)
        place_seed = self._scene_seed_place(facts, objects)
        event_seed = self._scene_seed_event(
            target=target,
            facts=facts,
            people=people,
            objects=objects,
            memory_text=memory_text,
            dialogue_text=dialogue_text,
            intent_text=intent_text,
        )
        return {
            "people": people,
            "event": event_seed,
            "time": time_seed,
            "place": place_seed,
            "objects": objects,
            "emotion": self._clean_seed_text(emotion_text, max_chars=90),
        }

    def _scene_seed_people(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget | None,
        facts: dict[str, Any],
        extra_text: str = "",
    ) -> list[dict[str, str | None]]:
        result: list[dict[str, str | None]] = []
        seen: set[str] = set()

        def add(person_id: str | None, label: str | None, role: str | None) -> None:
            clean_label = str(label or "").strip()
            if not clean_label or clean_label in seen:
                return
            result.append({"id": person_id, "label": clean_label, "role": role})
            seen.add(clean_label)

        add(profile.generalId, profile.displayName, "主角")
        if target:
            add(target.targetId, target.label, target.role)
        fact_text = " ".join(str(value or "") for value in [facts.get("event"), facts.get("dialogue"), extra_text])
        for item in facts.get("people") or []:
            if not isinstance(item, dict):
                continue
            label = str(item.get("label") or "")
            if label and label not in {profile.displayName, target.label if target else ""} and label not in fact_text:
                continue
            add(
                str(item.get("id") or "") or None,
                label,
                str(item.get("role") or "") or None,
            )
            if len(result) >= 6:
                break
        return result[:6]

    def _scene_seed_objects(self, facts: dict[str, Any]) -> list[str]:
        raw_objects = [str(item).strip() for item in facts.get("objects") or [] if str(item).strip()]
        priority = [
            "荊州危急",
            "躍馬檀溪",
            "蔡瑁設謀",
            "古城",
            "二嫂",
            "蛇矛",
            "追兵",
            "喊聲",
            "錦囊",
            "官道",
            "船隻",
            "車駕",
            "家眷",
            "府堂",
            "劍",
        ]
        ordered = [item for item in priority if item in raw_objects]
        for item in raw_objects:
            if item in {"馬", "兵馬"} and not any(flag in raw_objects for flag in ["追兵", "喊聲"]):
                continue
            if item not in ordered:
                ordered.append(item)
        return ordered[:5]

    def _scene_seed_time(self, facts: dict[str, Any]) -> str:
        time_markers = [str(item).strip() for item in facts.get("time") or [] if str(item).strip()]
        if "正談論間" in time_markers:
            return "正談論間"
        if "月餘" in time_markers:
            return "據城月餘後"
        if "當日" in time_markers:
            return "當日"
        if "年終" in time_markers:
            return "年終前後"
        if "正旦" in time_markers:
            return "正旦前後"
        if "歲旦" in time_markers:
            return "歲旦前後"
        return time_markers[0] if time_markers else ""

    def _scene_seed_place(self, facts: dict[str, Any], objects: list[str]) -> str:
        locations = []
        for item in facts.get("locations") or []:
            location = str(item or "").strip()
            if not location:
                continue
            if re.search(r"報說|使荊州|龍報|不想|只去", location):
                continue
            if location == "入城":
                continue
            if "荊州危急" in objects and location == "荊州":
                continue
            locations.append(location)
        if "古城" in locations:
            return "古城"
        if "躍馬檀溪" in objects:
            if "南漳" in locations and "莊外" in locations:
                return "南漳莊外"
            if "莊外" in locations:
                return "莊外"
        if "新野" in locations:
            return "新野"
        return locations[0] if locations else ""

    def _scene_seed_event(
        self,
        target: NarrativeInteractionTarget | None,
        facts: dict[str, Any],
        people: list[dict[str, str | None]],
        objects: list[str],
        memory_text: str,
        dialogue_text: str,
        intent_text: str,
    ) -> str:
        labels = [str(item.get("label") or "") for item in people if isinstance(item, dict)]
        target_label = target.label if target else ""
        has_zhao_yun = any(label == "趙雲" for label in labels)
        if "躍馬檀溪" in objects and target_label:
            messenger = "趙雲先尋來，" if has_zhao_yun else ""
            return f"躍馬檀溪脫險後，{messenger}{target_label}與舊部隨後趕來重會"
        if "古城" in objects and target_label:
            return f"{target_label}據住古城，見雲長護送二嫂前來，怒疑他背義投曹"
        if "荊州危急" in objects and target_label:
            messenger = "趙雲報來荊州危急" if has_zhao_yun else "荊州危急傳來"
            if re.search(r"正旦|官道|接應", intent_text):
                return f"{messenger}，去留已經不能再拖"
            return f"{messenger}，必須向{target_label}說明去留難處"
        if "追兵" in objects and target_label:
            return f"追兵逼近，眼前先要護住{target_label}與同行的人"
        for value in [facts.get("event"), memory_text]:
            seed = self._clean_seed_text(str(value or ""), max_chars=90)
            if seed:
                return seed
        if dialogue_text:
            return self._clean_seed_text(f"話題轉到「{dialogue_text}」", max_chars=90)
        return ""

    def _clean_seed_text(self, text: str, max_chars: int = 96) -> str:
        value = " ".join(str(text or "").split()).strip()
        value = value.strip("。；，、 ")
        if len(value) <= max_chars:
            return value
        trimmed = value[:max_chars].rstrip("，、；： ")
        return trimmed

    def _render_scene_director_story(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget | None,
        beats: SceneDirectorBeats,
    ) -> str:
        seeds = beats.sceneSeeds or self._build_scene_six_seeds(
            profile=profile,
            target=target,
            scene_facts=beats.sceneFacts,
            memory_text=beats.memoryText,
            emotion_text=beats.emotionText,
            dialogue_text=beats.dialogueText,
            intent_text=beats.intentText,
        )
        place = str(seeds.get("place") or "").strip()
        time_text = str(seeds.get("time") or "").strip()
        event = str(seeds.get("event") or "").strip()
        emotion = str(seeds.get("emotion") or "").strip()
        fact_text = " ".join(
            str(value or "")
            for value in [beats.sceneFacts.get("event"), beats.sceneFacts.get("dialogue")]
            if isinstance(beats.sceneFacts, dict)
        )
        target_label = self._source_target_label(fact_text, target) if target else ""
        actor = "他" if profile.displayName else "此人"

        parts: list[str] = []
        setting = self._scene_seed_setting_sentence(time_text, place)
        if event:
            parts.append(self._ensure_sentence(f"{setting}，{event}" if setting else event))
        elif setting:
            parts.append(self._ensure_sentence(setting))
        emotion_sentence = self._scene_story_emotion_sentence(actor, emotion)
        if emotion_sentence:
            parts.append(emotion_sentence)
        if beats.dialogueText:
            speaker_target = target_label or "眼前的人"
            parts.append(self._ensure_sentence(f"{actor}轉向{speaker_target}，低聲說：「{beats.dialogueText}」"))
        intent_sentence = self._scene_story_intent_sentence(beats.intentText, target_label, had_dialogue=bool(beats.dialogueText))
        if intent_sentence:
            parts.append(intent_sentence)
        return "".join(self._dedupe_scene_story_sentences(parts))

    def _scene_seed_setting_sentence(self, time_text: str, place: str) -> str:
        if time_text and place:
            if time_text.endswith("前後"):
                return f"{time_text}的{place}"
            return f"{place}，{time_text}"
        return place or time_text

    def _scene_story_emotion_sentence(self, actor: str, emotion: str) -> str:
        clean = self._clean_seed_text(emotion, max_chars=88)
        if not clean:
            return ""
        if "責任與情分" in clean:
            return self._ensure_sentence(f"責任與情分同時壓上來，{actor}先把急迫藏進停頓裡")
        if clean.startswith("想") or clean.startswith("心緒") or clean.startswith("情緒"):
            return self._ensure_sentence(clean)
        return self._ensure_sentence(f"{actor}{clean}")

    def _scene_story_intent_sentence(self, intent_text: str, target_label: str, had_dialogue: bool) -> str:
        intent = self._clean_seed_text(intent_text, max_chars=100)
        if not intent:
            return ""
        if target_label and intent.startswith(f"與{target_label}"):
            intent = "兩人" + intent[len(f"與{target_label}") :]
        prefix = "話說開後" if had_dialogue else "局勢明朗後"
        return self._ensure_sentence(f"{prefix}，{intent}")

    def _dedupe_scene_story_sentences(self, sentences: list[str]) -> list[str]:
        result: list[str] = []
        seen_keywords: set[str] = set()
        for sentence in sentences:
            clean = self._ensure_sentence(sentence)
            if not clean:
                continue
            normalized = re.sub(r"[，。；：「」『』、\s]", "", clean)
            keywords = {
                keyword
                for keyword in ["荊州危急", "趙雲", "孫夫人", "去留", "責任", "情分", "正旦", "官道", "追兵"]
                if keyword in clean
            }
            if any(normalized in existing or existing in normalized for existing in [re.sub(r"[，。；：「」『』、\s]", "", item) for item in result]):
                continue
            if keywords and keywords == seen_keywords and result:
                continue
            seen_keywords |= keywords
            result.append(clean)
        return result

    def _scene_fact_opening(
        self,
        display_name: str,
        target: NarrativeInteractionTarget | None,
        scene_facts: dict[str, Any] | None,
    ) -> str:
        facts = scene_facts or {}
        locations = [str(item).strip() for item in facts.get("locations") or [] if str(item).strip()]
        time_markers = [str(item).strip() for item in facts.get("time") or [] if str(item).strip()]
        objects = [str(item).strip() for item in facts.get("objects") or [] if str(item).strip()]
        people = [
            str(item.get("label") or "").strip()
            for item in facts.get("people") or []
            if isinstance(item, dict) and str(item.get("label") or "").strip()
        ]
        fact_text = " ".join(
            str(value or "")
            for value in [facts.get("event"), facts.get("dialogue")]
        )
        target_label = self._source_target_label(fact_text, target) if target else ""
        companion_labels = [
            label
            for label in people
            if label and label not in {display_name, target_label}
        ][:2]
        setting_locations = list(locations)
        if "荊州危急" in objects and len(setting_locations) > 1:
            setting_locations = [item for item in setting_locations if item != "荊州"] or setting_locations
        setting_limit = 1 if "荊州危急" in objects else 2
        setting = "、".join(setting_locations[:setting_limit])
        time_text = time_markers[0] if time_markers else ""
        pressure = self._join_zh(self._scene_pressure_terms(objects)[:2])
        stakes = self._join_zh(self._scene_stake_terms(objects)[:2])
        if target_label:
            people_text = f"{target_label}也被牽入去留之事"
        elif companion_labels:
            people_text = f"{self._join_zh(companion_labels)}也被牽入局勢"
        else:
            people_text = "同行的人都被牽住"

        def format_place_time() -> str:
            if setting and time_text and time_text not in setting:
                if time_text in {"年終", "歲旦", "正旦", "元旦"}:
                    return f"{time_text}前後的{setting}"
                return f"{setting}，{time_text}"
            return setting or time_text

        place_time = format_place_time()
        if not place_time and not pressure and not stakes:
            return ""
        if "荊州危急" in objects:
            messenger = "趙雲報來" if "趙雲" in people else ""
            if place_time:
                return self._ensure_sentence(f"{place_time}，{messenger}荊州危急，{people_text}")
            return self._ensure_sentence(f"{messenger}荊州危急，{people_text}")
        if pressure:
            if place_time:
                return self._ensure_sentence(f"{place_time}，{pressure}壓近，{people_text}")
            return self._ensure_sentence(f"{pressure}壓近，{people_text}")
        if stakes:
            if place_time:
                return self._ensure_sentence(f"{place_time}，{stakes}牽動局面，{people_text}")
            return self._ensure_sentence(f"{stakes}牽動局面，{people_text}")
        return self._ensure_sentence(f"{place_time}，{people_text}")

    def _scene_pressure_terms(self, objects: list[str]) -> list[str]:
        pressure_labels = {"追兵", "喊聲", "兵馬"}
        if "追兵" not in objects and "喊聲" not in objects:
            pressure_labels = pressure_labels - {"兵馬"}
        return [item for item in objects if item in pressure_labels]

    def _scene_stake_terms(self, objects: list[str]) -> list[str]:
        mapping = {
            "家眷": "家眷安危",
            "車駕": "車前去留",
            "船隻": "水路去留",
            "劍": "兵器威脅",
            "馬": "行路去留",
        }
        return [mapping[item] for item in objects if item in mapping]

    def _join_zh(self, values: list[str]) -> str:
        cleaned = [value for value in values if value]
        if not cleaned:
            return ""
        if len(cleaned) == 1:
            return cleaned[0]
        return "、".join(cleaned[:-1]) + "與" + cleaned[-1]

    def _build_data_first_chorus_line(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
        story_text: str,
    ) -> SceneChorusLine:
        persona_card = self.get_persona_card(target.targetId)
        text = self._render_persona_chorus_fallback(
            profile=profile,
            target=target,
            main_target=main_target,
            card=card,
            beats=beats,
            story_text=story_text,
            persona_card=persona_card,
        )
        evidence_refs = sorted(set((card.sourceRefs if card else []) + target.evidenceRefs))
        return SceneChorusLine(
            targetId=target.targetId,
            label=target.label,
            role=target.role,
            text=text,
            provider="data_first",
            model=None,
            fallbackUsed=False,
            evidenceRefs=evidence_refs[:12],
        )

    def _scene_seed_text(self, beats: SceneDirectorBeats) -> str:
        pairs = [
            ("想起什麼", beats.memoryText),
            ("心裡怎麼變", beats.emotionText),
            ("對此人的一句話", beats.dialogueText),
            ("接下來想做什麼", beats.intentText),
        ]
        return "\n".join(f"{label}：{value}" for label, value in pairs if str(value or "").strip())

    def _build_scene_director_story_context(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
    ) -> dict[str, Any]:
        return {
            "saveId": f"demo-scene-director-{profile.generalId}",
            "shortTerm": f"導演六種子：{json.dumps(beats.sceneSeeds, ensure_ascii=False)}",
            "longTerm": (
                f"主角：{profile.displayName}。"
                f"互動對象：{target.label if target else '未指定'}。"
                f"關係：{target.role if target else '未指定'}。"
                f"角度：{card.angle if card else '未指定'}。"
                f"在場判斷：{beats.presence.status}。"
            ),
            "playerProfile": (
                f"場景事實：{json.dumps(beats.sceneFacts, ensure_ascii=False)}。"
                f"原始四格只作為溯源，不得逐句拼貼：{self._scene_seed_text(beats)}。"
                f"可用證據：{'、'.join(beats.sourceRefs[:6]) if beats.sourceRefs else '無'}。"
            ),
            "promises": (
                "請當場景導演，只用六種子的人、事、時、地、物、感情編成一齣短劇本。"
                "四格原文只能協助理解，不得逐句拼接或重複同一事實；"
                "不要出現資料欄位名、英文變數、模板語氣或無根據的新事件。"
            ),
        }

    def _build_scene_director_selected_context(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
    ) -> dict[str, Any]:
        return {
            "task": "scene-director-script",
            "mainActor": {"generalId": profile.generalId, "displayName": profile.displayName},
            "activeTarget": {
                "targetId": target.targetId if target else None,
                "label": target.label if target else None,
                "role": target.role if target else None,
            },
            "angle": card.angle if card else None,
            "sceneFacts": beats.sceneFacts,
            "sceneSeeds": beats.sceneSeeds,
            "sourceBeats": {
                "memoryText": beats.memoryText,
                "emotionText": beats.emotionText,
                "dialogueText": beats.dialogueText,
                "intentText": beats.intentText,
            },
            "sourceRefs": beats.sourceRefs,
        }

    def _build_scene_chorus_line(
        self,
        request: SceneDirectorRequest,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
        story_text: str,
    ) -> SceneChorusLine:
        cache_key = self._scene_chorus_cache_key(request, profile, target, main_target, card, beats)
        with self._scene_chorus_cache_lock:
            cached = self._scene_chorus_cache.get(cache_key)
        if cached is not None:
            return cached.model_copy(deep=True)

        persona_card = self.get_persona_card(target.targetId)
        speaker_context = self._speaker_persona_context(target, persona_card)
        fallback = self._render_persona_chorus_fallback(
            profile=profile,
            target=target,
            main_target=main_target,
            card=card,
            beats=beats,
            story_text=story_text,
            persona_card=persona_card,
            speaker_context=speaker_context,
        )
        evidence_refs = sorted(set((card.sourceRefs if card else []) + target.evidenceRefs))
        generation = self._generate_scene_director_text(
            general_id=target.targetId,
            persona_card=persona_card,
            memory_context={
                "saveId": f"demo-chorus-{request.generalId}",
                "shortTerm": f"本幕短劇本：{story_text}",
                "longTerm": self._scene_seed_text(beats),
                "playerProfile": (
                    f"發話者與主角{profile.displayName}的關係：{target.role}。"
                    f"本幕互動對象：{main_target.label if main_target else '未指定'}。"
                    f"發話者人格資料：{self._speaker_persona_summary(speaker_context)}。"
                ),
                "promises": (
                    "請以發話者視角說一句自然短對白；要讓 persona、關係與本幕短劇本共同決定語氣。"
                    "不要提到自己的名字；不要用旁白解釋資料；"
                    "不要回『先看證據、先說清楚、再談判斷、安住人心』這種可套到任何人的泛句。"
                ),
            },
            selected_context={
                "task": "chorus-line",
                "speaker": {"generalId": target.targetId, "displayName": target.label, "relationshipToMain": target.role},
                "speakerPersona": speaker_context,
                "mainActor": {"generalId": request.generalId, "displayName": profile.displayName},
                "activeTarget": {
                    "targetId": main_target.targetId if main_target else None,
                    "label": main_target.label if main_target else None,
                    "role": main_target.role if main_target else None,
                },
                "sceneScript": story_text,
                "sceneFacts": beats.sceneFacts,
                "sceneSeed": beats.model_dump(),
            },
            evidence_refs=evidence_refs,
            deterministic_text=fallback,
            max_chars=request.maxChorusChars,
            locale=request.locale,
            llm_model_preset=request.llmModelPreset,
            speech_context_mode="inner_monologue",
            tone_mode="in-character",
            selected_keywords=self._scene_chorus_keywords(profile, target, main_target, beats, speaker_context),
        )
        generation = self._repair_complete_generation(
            generation,
            fallback_text=fallback,
            max_chars=request.maxChorusChars,
            warning_code="scene_chorus_trimmed_to_complete_sentence",
        )
        generation = self._repair_chorus_generation(
            generation=generation,
            fallback_text=fallback,
            max_chars=request.maxChorusChars,
            target=target,
            speaker_context=speaker_context,
        )
        line = SceneChorusLine(
            targetId=target.targetId,
            label=target.label,
            role=target.role,
            text=generation.text,
            provider=generation.provider,
            model=generation.model,
            fallbackUsed=generation.fallbackUsed,
            evidenceRefs=evidence_refs[:12],
        )
        with self._scene_chorus_cache_lock:
            self._scene_chorus_cache[cache_key] = line.model_copy(deep=True)
        return line

    def _build_scene_chorus_lines(
        self,
        request: SceneDirectorRequest,
        profile: NarrativeProfileResponse,
        targets: list[NarrativeInteractionTarget],
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
        story_text: str,
    ) -> list[SceneChorusLine]:
        if not targets:
            return []
        results: list[SceneChorusLine | None] = [None] * len(targets)
        max_workers = min(4, len(targets))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map = {
                executor.submit(
                    self._build_scene_chorus_line,
                    request,
                    profile,
                    target,
                    main_target,
                    card,
                    beats,
                    story_text,
                ): index
                for index, target in enumerate(targets)
            }
            for future in as_completed(future_map):
                index = future_map[future]
                target = targets[index]
                try:
                    results[index] = future.result()
                except Exception as exc:  # pragma: no cover - defensive fallback for provider failures
                    log_debug_event(
                        "scene_director.chorus.error",
                        targetId=target.targetId,
                        error=str(exc)[:240],
                    )
                    evidence_refs = sorted(set((card.sourceRefs if card else []) + target.evidenceRefs))
                    results[index] = SceneChorusLine(
                        targetId=target.targetId,
                        label=target.label,
                        role=target.role,
                        text=self._render_persona_chorus_fallback(
                            profile=profile,
                            target=target,
                            main_target=main_target,
                            card=card,
                            beats=beats,
                            story_text=story_text,
                            persona_card=self.get_persona_card(target.targetId),
                        ),
                        provider="data_first",
                        model=None,
                        fallbackUsed=True,
                        evidenceRefs=evidence_refs[:12],
                    )
        return [line for line in results if line is not None]

    def _scene_chorus_cache_key(
        self,
        request: SceneDirectorRequest,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
    ) -> str:
        payload = {
            "version": 3,
            "generalId": request.generalId,
            "speakerId": target.targetId,
            "speakerRole": target.role,
            "activeTargetId": main_target.targetId if main_target else None,
            "activeTargetRole": main_target.role if main_target else None,
            "evidenceId": card.evidenceId if card else None,
            "angle": card.angle if card else request.angle,
            "locale": request.locale,
            "maxChars": request.maxChorusChars,
            "seed": {
                "memoryText": beats.memoryText,
                "emotionText": beats.emotionText,
                "dialogueText": beats.dialogueText,
                "intentText": beats.intentText,
            },
            "sourceRefs": beats.sourceRefs,
        }
        raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()

    def _scene_chorus_keywords(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        beats: SceneDirectorBeats,
        speaker_context: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        keywords: list[dict[str, Any]] = [
            {
                "keywordKey": f"relationship.{target.targetId}.{profile.generalId}",
                "category": "relationship",
                "label": target.role,
                "sourceRefs": target.evidenceRefs[:4],
            }
        ]
        for label in self._speaker_persona_anchor_terms(speaker_context or {})[:2]:
            keywords.append(
                {
                    "keywordKey": f"speaker_persona.{target.targetId}.{label}",
                    "category": "speaker_persona",
                    "label": label,
                    "sourceRefs": target.evidenceRefs[:4],
                }
            )
        if main_target:
            keywords.append(
                {
                    "keywordKey": f"active_target.{main_target.targetId}",
                    "category": "target",
                    "label": main_target.role or main_target.label,
                    "sourceRefs": main_target.evidenceRefs[:4],
                }
            )
        seed_text = " ".join([beats.memoryText, beats.emotionText, beats.dialogueText, beats.intentText])
        for key, pattern, label in [
            ("chase", r"追兵|喊聲|逼近|急迫", "追兵逼近"),
            ("worry", r"垂淚|憂懼|牽掛|煩惱", "憂懼牽掛"),
            ("family", r"夫人|家眷|家室|同行的人", "家室安危"),
            ("decision", r"去留|下一步|說清楚|避開", "下一步抉擇"),
        ]:
            if re.search(pattern, seed_text):
                keywords.append(
                    {
                        "keywordKey": f"scene_seed.{key}",
                        "category": "scene_seed",
                        "label": label,
                        "sourceRefs": beats.sourceRefs[:4],
                    }
                )
        return keywords[:6]

    def _speaker_persona_context(
        self,
        target: NarrativeInteractionTarget,
        persona_card: PersonaCard | None,
    ) -> dict[str, Any]:
        roster_row = self._load_roster_index().get(target.targetId) or {}
        voice_style = list(persona_card.voiceStyle if persona_card else [])
        personality_traits = list(persona_card.personalityTraits if persona_card else [])
        lore_values = [
            roster_row.get("historicalAnecdote"),
            roster_row.get("bloodlineRumor"),
            roster_row.get("parentsSummary"),
            roster_row.get("description"),
            roster_row.get("story"),
            roster_row.get("personality"),
        ]
        lore_text = " ".join(str(value or "").strip() for value in lore_values if str(value or "").strip())
        role_text = " ".join(
            str(value or "")
            for value in [
                target.role,
                target.relationshipType,
                target.sourceType,
                target.gender,
                lore_text,
                " ".join(voice_style),
                " ".join(personality_traits),
            ]
        )
        return {
            "generalId": target.targetId,
            "displayName": persona_card.displayName if persona_card else target.label,
            "relationshipToMain": target.role,
            "relationshipType": target.relationshipType,
            "voiceStyle": voice_style,
            "personalityTraits": personality_traits,
            "safeFallbackLine": persona_card.safeFallbackLine if persona_card else "",
            "gender": target.gender,
            "femaleFocus": target.femaleFocus,
            "lore": self._compact_persona_lore(lore_text),
            "anchors": self._extract_persona_anchor_terms(role_text),
            "archetype": self._speaker_archetype(role_text, target),
            "personaSource": "persona-card" if persona_card else "relationship-only",
        }

    def _compact_persona_lore(self, lore_text: str, max_chars: int = 170) -> str:
        compact = " ".join(str(lore_text or "").split())
        if len(compact) <= max_chars:
            return compact
        sentence_ends = [index + 1 for index, char in enumerate(compact[:max_chars]) if char in "。！？"]
        if sentence_ends:
            return compact[: sentence_ends[-1]]
        return compact[: max_chars - 1] + "…"

    def _extract_persona_anchor_terms(self, text: str) -> list[str]:
        raw = str(text or "")
        candidates = [
            "江東",
            "主君",
            "形勢",
            "人心",
            "務實",
            "審勢",
            "婚盟",
            "宗室",
            "內母",
            "面子",
            "家線",
            "家室",
            "家眷",
            "阿斗",
            "孩子",
            "生路",
            "犧牲",
            "長坂坡",
            "自主",
            "鋒性",
            "帶兵",
            "騎射",
            "重義",
            "豪烈",
            "直率",
            "沉穩",
            "威嚴",
            "少言",
            "軍師",
            "謀定",
            "謹慎應對",
        ]
        mapped_traits = self._humanize_tag_list(re.split(r"[\s,、]+", raw))
        values: list[str] = []
        for candidate in candidates:
            if candidate and candidate in raw and candidate not in values:
                values.append(candidate)
        for item in re.split(r"[、,\s]+", mapped_traits):
            if item and item not in {"符合三國語境", "謹慎應對"} and item not in values:
                values.append(item)
        return values[:8]

    def _speaker_persona_anchor_terms(self, speaker_context: dict[str, Any]) -> list[str]:
        anchors = [str(item).strip() for item in (speaker_context.get("anchors") or []) if str(item).strip()]
        if anchors:
            return anchors
        fallback_values = [
            speaker_context.get("relationshipToMain"),
            speaker_context.get("relationshipType"),
            speaker_context.get("gender"),
        ]
        return [str(item).strip() for item in fallback_values if str(item).strip()][:3]

    def _speaker_archetype(self, text: str, target: NarrativeInteractionTarget) -> str:
        raw = str(text or "")
        if any(token in raw for token in ["婚盟", "宗室", "內母", "面子"]):
            return "marriage_mediator"
        if any(token in raw for token in ["長坂坡", "犧牲感", "犧牲", "生路讓給", "井底"]):
            return "family_sacrifice"
        if any(token in raw for token in ["家線", "不成額外的負擔", "顛沛", "阿斗"]):
            return "family_line"
        if any(token in raw for token in ["生路", "犧牲", "嬰孩", "孩子", "長坂坡"]):
            return "family_sacrifice"
        if any(token in raw for token in ["江東", "主君", "審勢", "務實", "形勢", "governance-minded", "strategic"]):
            return "jiangdong_ruler"
        if any(token in raw for token in ["豪烈", "直率", "戰場威壓", "direct_force", "martial"]):
            return "martial_direct"
        if any(token in raw for token in ["沉穩", "威嚴", "少言", "重義", "sworn_sibling", "loyal_oath"]):
            return "oath_guardian"
        if target.femaleFocus:
            return "family_witness"
        if target.relationshipType in {"enemy_rival", "battlefield_opponent"}:
            return "rival_observer"
        return "measured_observer"

    def _speaker_persona_summary(self, speaker_context: dict[str, Any]) -> str:
        anchors = "、".join(self._speaker_persona_anchor_terms(speaker_context)[:5])
        source = str(speaker_context.get("personaSource") or "")
        lore = str(speaker_context.get("lore") or "").strip()
        parts = [
            f"來源={source}" if source else "",
            f"人格錨點={anchors}" if anchors else "",
            f"角色弧光={speaker_context.get('archetype') or ''}",
            f"人物小傳={lore}" if lore else "",
        ]
        return "；".join(part for part in parts if part)

    def _render_persona_chorus_fallback(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
        story_text: str,
        persona_card: PersonaCard | None,
        speaker_context: dict[str, Any] | None = None,
    ) -> str:
        context = speaker_context or self._speaker_persona_context(target, persona_card)
        seed_text = " ".join(
            part
            for part in [beats.memoryText, beats.emotionText, beats.dialogueText, beats.intentText, story_text]
            if part
        )
        archetype = str(context.get("archetype") or "measured_observer")
        pressure_scene = bool(re.search(r"追兵|喊聲|逼近|急迫|兵馬", seed_text))
        worry_scene = bool(re.search(r"垂淚|憂懼|牽掛|煩惱|心事|去留", seed_text))
        active_is_family = bool(main_target and (main_target.femaleFocus or re.search(r"夫人|家室|家眷|姻親|家", main_target.role)))
        variants_by_archetype: dict[str, list[str]] = {
            "jiangdong_ruler": [
                "江東若被拖進這場家事，就得先分清情面與兵勢。",
                "人心若亂，後頭再好的兵勢也壓不住。",
                "婚事牽到兵事，不能只讓一時心軟作主。",
            ],
            "marriage_mediator": [
                "婚盟走到這一步，先把家人的臉面與安危擺平。",
                "刀還沒出鞘，家裡的話要先有人接住。",
                "別讓兩家的情面先碎在門內。",
            ],
            "family_line": [
                "越亂的時候，越不能讓家室再成他的牽累。",
                "人能穩住，這一路顛沛才不會把心也磨散。",
                "顛沛已經夠重，家裡這條線不能再被扯斷。",
            ],
            "family_sacrifice": [
                "生路若只剩一線，就先把孩子與家統護住。",
                "亂軍最會吞人，家裡那條線不能再斷。",
                "該讓路時，先讓能活下去的人走。",
            ],
            "martial_direct": [
                "追兵近了就先擋，心裡的話等人站穩再說。",
                "要護住人，就別讓追兵碰到車前。",
                "情勢已經逼到背後，話再急也得先把路打開。",
            ],
            "oath_guardian": [
                "只要他要護人，我就替他把退路撐住。",
                "義字到了眼前，不必多言，先把人護穩。",
                "他心裡有難處，身邊的人更不能散。",
            ],
            "rival_observer": [
                "這一退若亂了章法，破綻就會自己露出來。",
                "人情壓到軍務上，正是最容易失手的時候。",
                "越想兩邊都保住，越要防有人趁縫下手。",
            ],
            "family_witness": [
                "話若牽到家室，就不能只靠沉默撐過去。",
                "人已在局中，去留與安危都得當面說明。",
                "這不是一句煩惱能帶過的事，先把同行的人護住。",
            ],
            "measured_observer": [
                "此刻若只看眼前一口氣，後面的路反而會亂。",
                "人心已被牽動，下一步就不能只照兵勢走。",
                "話可以慢些說，但退路與安危不能慢。",
            ],
        }
        variants = list(variants_by_archetype.get(archetype) or variants_by_archetype["measured_observer"])
        if pressure_scene and archetype == "measured_observer":
            variants.append("追兵既近，先讓人離開險處，其他話才說得下去。")
        if worry_scene and active_is_family and archetype == "measured_observer":
            variants.append("家室已被牽進局裡，這話不能只按軍務處置。")
        key = json.dumps(
            {
                "speaker": target.targetId,
                "archetype": archetype,
                "mainTarget": main_target.targetId if main_target else None,
                "angle": card.angle if card else None,
                "seed": self._scene_seed_text(beats),
                "story": story_text[:120],
            },
            ensure_ascii=False,
            sort_keys=True,
        )
        return self._strip_speaker_self_mentions(
            self._ensure_sentence(self._pick_chorus_fallback_variant(key, variants)),
            target,
            persona_card,
        )

    def _repair_chorus_generation(
        self,
        generation: DialogueGenerationResult,
        fallback_text: str,
        max_chars: int,
        target: NarrativeInteractionTarget,
        speaker_context: dict[str, Any],
    ) -> DialogueGenerationResult:
        persona_card = self.get_persona_card(target.targetId)
        cleaned = self._strip_speaker_self_mentions(generation.text, target, persona_card)
        repaired = self._complete_generated_text(cleaned, fallback_text, max_chars)
        warnings = list(generation.qualityWarnings)
        repair_used = generation.repairUsed
        if repaired != generation.text:
            warnings.append("scene_chorus_self_name_or_sentence_repaired")
            repair_used = True
        if self._is_generic_chorus_line(repaired, speaker_context):
            warnings.append("scene_chorus_generic_replaced_by_persona_fallback")
            return replace(
                generation,
                text=fallback_text,
                fallbackUsed=True,
                qualityWarnings=warnings,
                repairUsed=True,
            )
        return replace(
            generation,
            text=repaired,
            qualityWarnings=warnings,
            repairUsed=repair_used,
        )

    def _strip_speaker_self_mentions(
        self,
        text: str,
        target: NarrativeInteractionTarget,
        persona_card: PersonaCard | None,
    ) -> str:
        cleaned = str(text or "").strip()
        names = [target.label]
        if persona_card:
            names.append(persona_card.displayName)
        names = [name for name in dict.fromkeys(name.strip() for name in names if name and len(name.strip()) >= 2)]
        for name in names:
            cleaned = re.sub(rf"^{re.escape(name)}[：:，,、\s]*(認為|覺得|看來|說|道)?[：:，,、\s]*", "", cleaned)
            cleaned = cleaned.replace(f"{name}認為", "")
            cleaned = cleaned.replace(f"{name}覺得", "")
            cleaned = cleaned.replace(f"{name}看來", "")
        return self._ensure_sentence(cleaned)

    def _is_generic_chorus_line(self, text: str, speaker_context: dict[str, Any]) -> bool:
        cleaned = str(text or "").strip()
        if not cleaned:
            return True
        generic_patterns = [
            r"先看證據",
            r"再說判斷",
            r"先說清楚",
            r"先聽完",
            r"別的判斷",
            r"安得住人",
            r"安住人心",
            r"這份憂色",
            r"這份憂慮",
            r"話還沒說透",
            r"局勢如何轉圜",
            r"局勢才不會",
            r"這一步不能只看",
            r"先看後路",
        ]
        has_generic_phrase = any(re.search(pattern, cleaned) for pattern in generic_patterns)
        anchors = self._speaker_persona_anchor_terms(speaker_context)
        has_persona_anchor = any(anchor and anchor in cleaned for anchor in anchors)
        return has_generic_phrase and not has_persona_anchor

    def _render_seeded_chorus_fallback(
        self,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        beats: SceneDirectorBeats,
    ) -> str:
        seed_text = " ".join([beats.memoryText, beats.emotionText, beats.dialogueText, beats.intentText])
        if re.search(r"追兵|喊聲|逼近", seed_text):
            if main_target and main_target.femaleFocus:
                return self._pick_chorus_fallback_variant(
                    target.targetId,
                    [
                        "這不是單純進退，家室與去留都被追兵逼到眼前了。",
                        "若連同行的人都未安，這一步就不能只按兵勢來算。",
                        "追兵壓上來時，最怕情分與軍務一起亂成一團。",
                    ],
                )
            if target.femaleFocus:
                return self._pick_chorus_fallback_variant(
                    target.targetId,
                    [
                        "先讓人離開險處，情分與話語都可稍後再理。",
                        "這時候先保住同行的人，比急著分說更要緊。",
                        "路若還不穩，心裡的話就先放輕一些。",
                    ],
                )
            if target.relationshipType in {"sworn_sibling", "battle_ally", "loyal_oath"}:
                return self._pick_chorus_fallback_variant(
                    target.targetId,
                    [
                        "若他要護住同行的人，我便替他把後路守穩。",
                        "先把追兵擋遠，才輪得到心裡那些難處。",
                        "他要顧全身邊的人，我先替他看住亂局。",
                    ],
                )
            if target.relationshipType in {"enemy_rival", "battlefield_opponent"}:
                return self._pick_chorus_fallback_variant(
                    target.targetId,
                    [
                        "這一退若露出破綻，後面的局勢便會被人咬住。",
                        "越是倉促，越容易讓旁人看出可趁之處。",
                    ],
                )
            return self._pick_chorus_fallback_variant(
                target.targetId,
                [
                    "追兵一近，話裡的分寸比刀兵還容易失手。",
                    "這一刻若只看退路，反而會漏掉人的去留。",
                ],
            )
        if re.search(r"垂淚|憂懼|牽掛|煩惱", seed_text):
            if main_target and main_target.femaleFocus:
                return self._pick_chorus_fallback_variant(
                    target.targetId,
                    [
                        "這份憂色牽著家室，也牽著兩邊日後的去路。",
                        "話還沒說透，人的心已經先被這場局勢牽住了。",
                        "此刻最難的不是開口，而是開口後仍能把人安住。",
                    ],
                )
            if target.femaleFocus:
                return self._pick_chorus_fallback_variant(
                    target.targetId,
                    [
                        "這話若壓在心裡，只會讓人更難安定。",
                        "心事牽著家室，就不能只藏在心裡。",
                        "心事已到眼前，別再只用沉默撐著。",
                    ],
                )
            if target.relationshipType in {"sworn_sibling", "battle_ally", "loyal_oath"}:
                return self._pick_chorus_fallback_variant(
                    target.targetId,
                    [
                        "他若心中有事，我先替他把局面撐住。",
                        "先讓他把難處說出口，我再看該往哪裡補位。",
                        "人心不穩時，身邊總得有人先站住。",
                    ],
                )
            return self._pick_chorus_fallback_variant(target.targetId, ["先聽完這份憂慮，再看局勢如何轉圜。", "話說開之前，局勢還不能急著下斷。"])
        if main_target and target.relationshipType in {"sworn_sibling", "battle_ally", "loyal_oath"}:
            return "他若一時難決，我先替他穩住身邊的人。"
        if target.relationshipType in {"enemy_rival", "battlefield_opponent"}:
            return "這一步若慢了，便會露出可趁之機。"
        return "先把話說清，局勢才不會繼續散開。"

    def _pick_chorus_fallback_variant(self, key: str, variants: list[str]) -> str:
        if not variants:
            return ""
        digest = hashlib.sha1(str(key or "").encode("utf-8")).hexdigest()
        return variants[int(digest[:4], 16) % len(variants)]

    def _render_chorus_fallback(
        self,
        display_name: str,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
    ) -> str:
        source_text = " ".join(
            part
            for part in [
                card.summary if card else "",
                card.quote if card else "",
                beats.sceneText,
                beats.dialogueText,
            ]
            if part
        )
        shared_refs = set(card.sourceRefs if card else []) & set(target.evidenceRefs)
        if not shared_refs and (not main_target or target.targetId != main_target.targetId):
            return ""
        if re.search(r"追兵|喊聲|大起|速退", source_text):
            if target.femaleFocus:
                return "先脫離追兵，人的安危最要緊。"
            if target.relationshipType in {"sworn_sibling", "battle_ally", "loyal_oath"}:
                return "我先看住後路，別讓追兵逼近。"
            return ""
        if re.search(r"垂淚|煩惱|憂|驚|懼|泣", source_text):
            if target.femaleFocus:
                if main_target and main_target.femaleFocus:
                    return "這話牽著家室與去留，先說清楚才安得住人。"
                return "心事若牽著家室，就不能只藏在心裡。"
            return ""
        if target.relationshipType in {"enemy_rival", "battlefield_opponent"} and card and card.angle == "rival":
            return "越是急處，越要防對方借勢。"
        if target.relationshipType in {"sworn_sibling", "battle_ally", "loyal_oath"} and card and card.angle in {"bond", "battlefield"}:
            return "我先補住後路，再聽他怎麼定奪。"
        return ""

    def _generate_scene_director_text(
        self,
        general_id: str,
        persona_card: PersonaCard | None,
        memory_context: dict[str, Any],
        selected_context: dict[str, Any] | None,
        evidence_refs: list[str],
        deterministic_text: str,
        max_chars: int,
        locale: str,
        llm_model_preset: str,
        speech_context_mode: str = "inner_monologue",
        tone_mode: str = "narrative_fusion",
        selected_keywords: list[dict[str, Any]] | None = None,
    ):
        evidence_pack = self._resolve_evidence(general_id, None, [], evidence_refs)
        preset_config = LLM_MODEL_PRESETS.get(llm_model_preset, LLM_MODEL_PRESETS[DEFAULT_LLM_MODEL_PRESET])
        return self.provider_router.generate(
            DialoguePromptPackage(
                generalId=general_id,
                personaCardSubset=self._persona_subset(persona_card),
                memoryContext=memory_context,
                selectedContext=selected_context,
                selectedKeywords=selected_keywords or [],
                resolvedEvidence=evidence_pack.resolvedEvidence,
                evidenceRefs=evidence_refs,
                deterministicText=deterministic_text[:max_chars],
                maxChars=max_chars,
                toneMode=tone_mode,
                locale=locale,
                speechContextMode=speech_context_mode,
            ),
            provider_order=preset_config["providerOrder"],
            model_overrides=preset_config["modelOverrides"],
            allow_deterministic_fallback=preset_config["allowDeterministicFallback"],
        )

    def _repair_complete_generation(
        self,
        generation: DialogueGenerationResult,
        fallback_text: str,
        max_chars: int,
        warning_code: str,
    ) -> DialogueGenerationResult:
        repaired = self._complete_generated_text(generation.text, fallback_text, max_chars)
        if repaired == generation.text:
            return generation
        return replace(
            generation,
            text=repaired,
            qualityWarnings=[*generation.qualityWarnings, warning_code],
            repairUsed=True,
        )

    def _complete_generated_text(self, text: str, fallback_text: str, max_chars: int) -> str:
        cleaned = " ".join(str(text or "").split()).strip()
        fallback = str(fallback_text or "").strip()
        if not cleaned:
            return fallback
        if len(cleaned) > max_chars:
            cleaned = cleaned[:max_chars]
        if self._has_balanced_quotes(cleaned) and cleaned.endswith(("。", "！", "？", "。」", "！」", "？」", "。』", "！』", "？』")):
            return cleaned
        candidates = [
            index + 1
            for index, char in enumerate(cleaned)
            if char in "。！？!?"
        ]
        minimum = max(16, int(len(cleaned) * 0.45))
        candidates = [index for index in candidates if index >= minimum]
        for index in reversed(candidates):
            candidate = cleaned[:index].strip()
            if self._has_balanced_quotes(candidate):
                return candidate
        return fallback

    def _has_balanced_quotes(self, text: str) -> bool:
        return str(text or "").count("「") == str(text or "").count("」") and str(text or "").count("『") == str(text or "").count("』")

    def _sentence_or_default(self, text: str, default: str, max_chars: int) -> str:
        normalized = " ".join(str(text or "").split()).strip() or default
        if len(normalized) > max_chars:
            normalized = normalized[: max_chars - 1] + "…"
        return self._ensure_sentence(normalized)

    def _ensure_sentence(self, text: str) -> str:
        stripped = str(text or "").strip()
        if not stripped:
            return ""
        return stripped if stripped.endswith(("。", "！", "？", "。」", "！」", "？」", "。』", "！』", "？』")) else f"{stripped}。"

    def _angle_focus(self, angle: str | None) -> str:
        return {
            "people": "先安人心與秩序",
            "bond": "先確保同伴與承諾",
            "battlefield": "先整隊與看退路",
            "rival": "先衡量人心代價",
            "resource": "先盤點糧草與恩義",
            "habit": "先巡營與問細事",
            "emotion": "先想家室與心事",
            "identity": "先對齊人物定位與責任",
            "relationship": "先判斷人際網與信任邊界",
            "location": "先抓地利與路線節奏",
            "activity": "先排可執行的小行動",
            "decision": "先選策略方向與代價",
            "personality": "先用性格校正決策語氣",
            "role": "先站回角色責任",
        }.get(str(angle or ""), "先讓局面站穩")

    def _resolve_memory_context(self, request: DialogueRequest) -> GeneralMemoryContext | None:
        if request.memoryContext is not None:
            return request.memoryContext if has_memory_context_content(request.memoryContext) else None
        if not request.saveId:
            return None
        memory = load_general_memory(self.repo_root, request.saveId, request.generalId)
        return memory_context_from_data(memory)

    def get_persona_card(self, general_id: str) -> PersonaCard | None:
        runtime_persona = self.store.read_runtime_persona(general_id)
        if runtime_persona:
            voice = runtime_persona.get("voiceAndPrompt") or {}
            profile = runtime_persona.get("profile") or {}
            safe_fallback_line = voice.get("safeFallbackLine") or f"{runtime_persona.get('displayName') or general_id}仍須有憑有據，不可妄言。"
            if general_id != "guan-yu" and "關某" in safe_fallback_line:
                safe_fallback_line = f"{runtime_persona.get('displayName') or general_id}仍須有憑有據，不可妄言。"
            return PersonaCard.model_validate({
                "generalId": general_id,
                "personaVersion": runtime_persona.get("personaVersion") or "general_runtime_persona_v1",
                "displayName": runtime_persona.get("displayName") or general_id,
                "voiceStyle": voice.get("voiceStyle") or [],
                "personalityTraits": profile.get("personalityTags") or [],
                "safeFallbackLine": safe_fallback_line,
                "taboos": voice.get("taboos") or [],
                "evidenceRefs": runtime_persona.get("evidenceRefs") or [],
            })
        payload = self.store.read_persona_card(general_id)
        if payload is None:
            return None
        return PersonaCard.model_validate(payload)

    def _read_json(self, filename: str):
        return self.store.read_api_fixture(filename)

    def _read_optional_json(self, filename: str):
        return self.store.read_optional_api_fixture(filename)

    def _read_runtime_persona(self, general_id: str):
        return self.store.read_runtime_persona(general_id)

    def _read_runtime_keywords(self, general_id: str):
        return self.store.read_runtime_keywords(general_id)

    def _read_runtime_relationships(self, general_id: str):
        return self.store.read_runtime_relationships(general_id)

    def _load_roster_index(self) -> dict[str, dict[str, Any]]:
        if self._roster_index_cache is not None:
            return self._roster_index_cache
        path = self.repo_root / "assets/resources/data/generals.json"
        if not path.exists():
            self._roster_index_cache = {}
            return self._roster_index_cache
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self._roster_index_cache = {}
            return self._roster_index_cache
        if not isinstance(payload, list):
            self._roster_index_cache = {}
            return self._roster_index_cache
        self._roster_index_cache = {
            str(row.get("id")): row
            for row in payload
            if isinstance(row, dict) and str(row.get("id") or "").strip()
        }
        return self._roster_index_cache

    def _roster_name_for(self, general_id: str, roster_index: dict[str, dict[str, Any]]) -> str:
        row = roster_index.get(general_id) or {}
        return str(row.get("name") or general_id)

    def _roster_gender_for(self, general_id: str, roster_index: dict[str, dict[str, Any]]) -> str | None:
        row = roster_index.get(general_id) or {}
        value = str(row.get("gender") or "").strip()
        return value or None

    def _is_female_gender(self, gender: str | None) -> bool:
        return str(gender or "").strip().lower() in {"female", "f", "woman", "女", "女性"}

    def _build_activity_seeds(
        self,
        runtime_persona: dict[str, Any],
        runtime_keywords: dict[str, Any],
    ) -> list[NarrativeActivitySeed]:
        seeds: list[NarrativeActivitySeed] = []
        seen: set[str] = set()
        for option in ((runtime_keywords.get("categories") or {}).get("activity") or []):
            keyword_key = str(option.get("keywordKey") or "").strip()
            if not keyword_key or keyword_key in seen:
                continue
            seen.add(keyword_key)
            seeds.append(
                NarrativeActivitySeed(
                    keywordKey=keyword_key,
                    label=str(option.get("label") or option.get("rawTag") or keyword_key),
                    confidence=self._coerce_float(option.get("confidence"), default=0.78),
                    sourceRefs=[str(ref) for ref in (option.get("sourceRefs") or []) if str(ref).strip()],
                    rawTag=str(option.get("rawTag") or "") or None,
                )
            )
        for raw_tag in ((runtime_persona.get("profile") or {}).get("activitySeedHints") or []):
            keyword_key = f"activity.{raw_tag}"
            if keyword_key in seen:
                continue
            seen.add(keyword_key)
            seeds.append(
                NarrativeActivitySeed(
                    keywordKey=keyword_key,
                    label=str(raw_tag),
                    confidence=0.72,
                    sourceRefs=[],
                    rawTag=str(raw_tag),
                )
            )
        return seeds[:12]

    def _relationship_display_priority(self, relationship_type: str | None, original_types: set[str]) -> int:
        if "spouse" in original_types or relationship_type == "spouse":
            return 95
        priority = {
            "sworn_sibling": 92,
            "protects_family": 88,
            "spouse": 95,
            "parent_child": 86,
            "mentor": 82,
            "battle_ally": 76,
            "loyal_oath": 74,
            "enemy_rival": 72,
            "battlefield_opponent": 68,
            "resource_support": 62,
            "ruler_subject": 50,
            "battlefield_contact": 42,
            "political_contact": 40,
        }
        return priority.get(str(relationship_type or ""), 35)

    def _runtime_edge_source_text(self, edge: dict[str, Any]) -> str:
        return " ".join(
            str(value)
            for value in [
                *(edge.get("sourceQuotes") or []),
                edge.get("sourceQuote"),
                edge.get("evidenceText"),
                edge.get("summary"),
            ]
            if value
        )

    def _runtime_actor_aliases(self, runtime_persona: dict[str, Any]) -> list[str]:
        display_name = str(runtime_persona.get("displayName") or "").strip()
        aliases = [display_name, *(runtime_persona.get("aliases") or [])]
        if len(display_name) == 2:
            aliases.append(display_name[1:])
        return [alias for alias in aliases if alias]

    def _text_mentions_runtime_actor(self, runtime_persona: dict[str, Any], text: str) -> bool:
        source = str(text or "")
        return any(alias and alias in source for alias in self._runtime_actor_aliases(runtime_persona))

    def _runtime_edge_refs(self, edge: dict[str, Any]) -> set[str]:
        return {str(ref).strip() for ref in (edge.get("evidenceRefs") or []) if str(ref).strip()}

    def _normalize_runtime_target_id(
        self,
        target_id: str | None,
        target_label: str | None = None,
        source_text: str | None = None,
    ) -> str:
        normalized_id = str(target_id or "").strip()
        if not normalized_id:
            return ""
        collision_map = TARGET_ID_NAME_COLLISIONS.get(normalized_id)
        if not collision_map:
            return normalized_id
        evidence = f"{target_label or ''} {source_text or ''}"
        for marker, replacement_id in collision_map.items():
            if marker and marker in evidence:
                return replacement_id
        return normalized_id

    def _edge_points_to_yellow_turban_enemy(self, edge: dict[str, Any]) -> bool:
        target_id = str(edge.get("targetId") or "").strip()
        if target_id in YELLOW_TURBAN_TARGET_IDS:
            return True
        text = self._runtime_edge_source_text(edge)
        label = str(edge.get("targetName") or "")
        return any(term in f"{label} {text}" for term in YELLOW_TURBAN_CONTEXT_TERMS)

    def _hard_relationship_override(
        self,
        edge: dict[str, Any],
        runtime_persona: dict[str, Any],
    ) -> str | None:
        source_id = str(runtime_persona.get("generalId") or "").strip()
        target_id = str(edge.get("targetId") or "").strip()
        if not source_id or not target_id:
            return None
        return HARD_RELATIONSHIP_PAIR_TYPES.get(frozenset({source_id, target_id}))

    def _relationship_type_label(self, relationship_type: str | None, fallback: str | None = None) -> str:
        labels = {
            "sworn_sibling": "結義兄弟",
            "protects_family": "護衛家室",
            "spouse": "姻親 / 家室",
            "parent_child": "親子",
            "mentor": "師友",
            "mentor_student": "師友",
            "battle_ally": "戰場同袍",
            "loyal_oath": "忠義相托",
            "alliance_oath": "盟友",
            "enemy_rival": "敵對競爭",
            "battlefield_opponent": "戰場對手",
            "betrayal_surrender": "背叛 / 降服",
            "resource_support": "資源支援",
            "ruler_subject": "君臣主從",
            "battlefield_contact": "戰場接觸",
            "political_contact": "政治接觸",
        }
        normalized = str(relationship_type or "").strip()
        return labels.get(normalized) or str(fallback or normalized or "互動關係")

    def _preferred_non_conflict_relationships(
        self,
        runtime_relationships: dict[str, Any],
    ) -> dict[str, dict[str, Any]]:
        conflict_types = {"enemy_rival", "battlefield_opponent", "betrayal_surrender"}
        preferred: dict[str, dict[str, Any]] = {}
        for edge in runtime_relationships.get("anchors") or []:
            target_id = str(edge.get("targetId") or "").strip()
            edge_type = str(edge.get("type") or "").strip()
            if not target_id or not edge_type or edge_type in conflict_types:
                continue
            priority = self._relationship_display_priority(edge_type, set(edge.get("originalTypes") or []))
            current = preferred.get(target_id)
            if current and int(current.get("priority") or 0) >= priority:
                current["refs"].update(self._runtime_edge_refs(edge))
                continue
            preferred[target_id] = {
                "type": edge_type,
                "label": self._relationship_type_label(edge_type, edge.get("typeLabel")),
                "priority": priority,
                "refs": set(self._runtime_edge_refs(edge)),
            }
        return preferred

    def _edge_has_command_or_ally_signal(self, edge: dict[str, Any], runtime_persona: dict[str, Any]) -> bool:
        text = self._runtime_edge_source_text(edge)
        if not text:
            return False
        has_actor = self._text_mentions_runtime_actor(runtime_persona, text)
        command_terms = ("令", "命", "遣", "撥", "使", "差", "引軍", "為先鋒", "爲先鋒")
        ally_terms = ("助戰", "救起", "同救", "來投", "投降", "歸順", "歸降")
        return (has_actor and any(term in text for term in command_terms)) or any(term in text for term in ally_terms)

    def _edge_has_authority_signal(self, edge: dict[str, Any], runtime_persona: dict[str, Any]) -> bool:
        text = self._runtime_edge_source_text(edge)
        if not self._text_mentions_runtime_actor(runtime_persona, text):
            return False
        target_name = str(edge.get("targetName") or "").strip()
        target_aliases = self._target_label_aliases(target_name)
        has_target = any(alias and alias in text for alias in target_aliases)
        authority_terms = ("令", "命", "遣", "撥", "使", "差", "引軍", "為先鋒", "爲先鋒", "部將", "主公")
        return has_target and any(term in text for term in authority_terms)

    def _edge_has_patron_signal(self, edge: dict[str, Any], runtime_persona: dict[str, Any]) -> bool:
        text = self._runtime_edge_source_text(edge)
        if not self._text_mentions_runtime_actor(runtime_persona, text):
            return False
        target_name = str(edge.get("targetName") or "").strip()
        target_aliases = self._target_label_aliases(target_name)
        has_target = any(alias and alias in text for alias in target_aliases)
        patron_terms = ("來投", "投降", "歸順", "厚待", "收留", "薦", "請", "降", "授", "拜")
        return has_target and any(term in text for term in patron_terms)

    def _edge_has_direct_conflict_signal(self, edge: dict[str, Any], runtime_persona: dict[str, Any]) -> bool:
        text = self._runtime_edge_source_text(edge)
        if not text:
            return False
        actor_aliases = self._runtime_actor_aliases(runtime_persona)
        target_name = str(edge.get("targetName") or "").strip()
        target_aliases = [target_name]
        if len(target_name) == 2:
            target_aliases.append(target_name[1:])
        has_actor = any(alias and alias in text for alias in actor_aliases)
        has_target = any(alias and alias in text for alias in target_aliases)
        conflict_terms = ("戰", "攻", "討", "殺", "追", "圍", "敗", "斬", "拒", "敵", "廝殺", "搦戰")
        return has_actor and has_target and any(term in text for term in conflict_terms)

    def _resolve_runtime_relationship_type(
        self,
        edge: dict[str, Any],
        runtime_persona: dict[str, Any],
        preferred_non_conflict: dict[str, dict[str, Any]],
    ) -> str | None:
        edge_type = str(edge.get("type") or "").strip() or None
        hard_override = self._hard_relationship_override(edge, runtime_persona)
        if hard_override:
            return hard_override
        if self._edge_points_to_yellow_turban_enemy(edge):
            if edge_type in {"ruler_subject", "patron_client", "mentor_student", "political_contact", "battlefield_contact"}:
                return "enemy_rival"
        if edge_type not in {"enemy_rival", "battlefield_opponent", "betrayal_surrender"}:
            if edge_type == "ruler_subject" and not self._edge_has_authority_signal(edge, runtime_persona):
                return "political_contact"
            if edge_type == "patron_client" and not self._edge_has_patron_signal(edge, runtime_persona):
                if self._edge_has_direct_conflict_signal(edge, runtime_persona):
                    return "enemy_rival"
                return "battlefield_contact" if self._text_has_battle_signal(self._runtime_edge_source_text(edge)) else "political_contact"
            return edge_type

        target_id = str(edge.get("targetId") or "").strip()
        refs = self._runtime_edge_refs(edge)
        preferred = preferred_non_conflict.get(target_id)
        if preferred and refs and refs.intersection(preferred.get("refs") or set()):
            return str(preferred.get("type") or edge_type)

        if self._edge_has_command_or_ally_signal(edge, runtime_persona):
            return "ruler_subject"

        target_name = str(edge.get("targetName") or "")
        looks_like_indirect_family_or_woman = any(term in target_name for term in ("氏", "夫人", "后", "妃"))
        if looks_like_indirect_family_or_woman and not self._edge_has_direct_conflict_signal(edge, runtime_persona):
            return "political_contact"

        return edge_type

    def _build_interaction_targets(
        self,
        general_id: str,
        runtime_persona: dict[str, Any],
        runtime_keywords: dict[str, Any],
        runtime_relationships: dict[str, Any],
        roster_index: dict[str, dict[str, Any]],
    ) -> list[NarrativeInteractionTarget]:
        buckets: dict[str, dict[str, Any]] = {}
        category_weight = {
            "person": 2.4,
            "event": 1.4,
            "relationship": 2.0,
            "location": 0.8,
            "affect": 0.6,
        }
        preferred_non_conflict = self._preferred_non_conflict_relationships(runtime_relationships)

        def ensure_bucket(target_id: str) -> dict[str, Any]:
            bucket = buckets.get(target_id)
            if bucket is not None:
                return bucket
            gender = self._roster_gender_for(target_id, roster_index)
            bucket = {
                "targetId": target_id,
                "label": self._roster_name_for(target_id, roster_index),
                "role": "人物線索",
                "gender": gender,
                "sourceType": "keyword-cooccurrence",
                "relationshipType": None,
                "relationshipPriority": 0,
                "confidence": 0.58,
                "score": 0.0,
                "evidenceRefs": [],
                "femaleFocus": self._is_female_gender(gender),
            }
            buckets[target_id] = bucket
            return bucket

        for edge in (runtime_relationships.get("anchors") or []):
            target_id = self._normalize_runtime_target_id(
                edge.get("targetId"),
                edge.get("targetName"),
                self._runtime_edge_source_text(edge),
            )
            if not target_id or target_id == general_id:
                continue
            if target_id != str(edge.get("targetId") or "").strip():
                edge = {**edge, "targetId": target_id}
            bucket = ensure_bucket(target_id)
            original_types = {str(item).strip() for item in (edge.get("originalTypes") or []) if str(item).strip()}
            edge_type = self._resolve_runtime_relationship_type(edge, runtime_persona, preferred_non_conflict)
            edge_label = self._relationship_type_label(edge_type, edge.get("typeLabel") or bucket["role"])
            if "spouse" in original_types:
                edge_type = "spouse"
                edge_label = "姻親 / 家室"
            edge_priority = self._relationship_display_priority(edge_type, original_types)
            bucket["label"] = self._roster_name_for(target_id, roster_index) or str(edge.get("targetName") or bucket["label"] or target_id)
            if edge_priority >= int(bucket.get("relationshipPriority") or 0):
                bucket["role"] = edge_label
                bucket["relationshipType"] = edge_type
                bucket["sourceType"] = "relationship-edge"
                bucket["relationshipPriority"] = edge_priority
            bucket["confidence"] = max(bucket["confidence"], self._coerce_float(edge.get("edgeConfidence"), default=0.72))
            bucket["score"] += 4.0 + bucket["confidence"]
            bucket["evidenceRefs"].extend(str(ref) for ref in (edge.get("evidenceRefs") or []) if str(ref).strip())

        for category, options in (runtime_keywords.get("categories") or {}).items():
            for option in options or []:
                refs = [str(ref) for ref in (option.get("sourceRefs") or []) if str(ref).strip()]
                for target_id in (option.get("generalIds") or []):
                    target_key = self._normalize_runtime_target_id(
                        str(target_id or "").strip(),
                        option.get("label") or option.get("fullLabel"),
                        " ".join(str(ref) for ref in refs),
                    )
                    if not target_key or target_key == general_id:
                        continue
                    bucket = ensure_bucket(target_key)
                    bucket["score"] += category_weight.get(category, 0.45)
                    bucket["confidence"] = max(bucket["confidence"], self._coerce_float(option.get("confidence"), default=0.62))
                    if bucket["sourceType"] != "relationship-edge":
                        bucket["role"] = (
                            "人物線索"
                            if category == "person"
                            else "事件共振"
                            if category == "event"
                            else "場景牽動"
                            if category == "location"
                            else "情緒關聯"
                            if category == "affect"
                            else "互動線索"
                        )
                    bucket["evidenceRefs"].extend(refs)

        for source in [*(runtime_persona.get("storyBeats") or []), *(runtime_persona.get("sourceHighlights") or [])]:
            refs = [str(ref) for ref in (source.get("sourceRefs") or []) if str(ref).strip()]
            if source.get("sourceRef"):
                refs.append(str(source.get("sourceRef")))
            families = {str(family).strip() for family in (source.get("angleFamilies") or []) if str(family).strip()}
            for target_id in source.get("relatedGeneralIds") or []:
                target_key = self._normalize_runtime_target_id(
                    str(target_id or "").strip(),
                    None,
                    " ".join(str(value) for value in [source.get("summary"), source.get("sourceQuote"), source.get("quote")] if value),
                )
                if not target_key or target_key == general_id:
                    continue
                bucket = ensure_bucket(target_key)
                is_female = bucket["femaleFocus"] or self._is_female_gender(self._roster_gender_for(target_key, roster_index))
                bucket["femaleFocus"] = bool(is_female)
                if bucket["sourceType"] != "relationship-edge":
                    bucket["sourceType"] = "pipeline-angle-target-link"
                    if bucket["role"] == "人物線索":
                        bucket["role"] = "女性互動線索" if is_female and "female_interaction" in families else "原文關聯"
                bucket["confidence"] = max(bucket["confidence"], 0.74 if families else 0.68)
                bucket["score"] += 2.0 if families else 1.2
                bucket["evidenceRefs"].extend(refs)

        for text, refs, has_emotion_angle in self._iter_runtime_target_mention_sources(runtime_persona):
            if not text:
                continue
            for target_id, row in roster_index.items():
                target_key = str(target_id or "").strip()
                if not target_key or target_key == general_id:
                    continue
                label = str(row.get("name") or target_key).strip()
                if not label:
                    continue
                if not any(alias and alias in text for alias in self._target_label_aliases(label)):
                    continue
                bucket = ensure_bucket(target_key)
                is_female = bucket["femaleFocus"] or self._is_female_gender(self._roster_gender_for(target_key, roster_index))
                bucket["femaleFocus"] = bool(is_female)
                if bucket["sourceType"] != "relationship-edge":
                    bucket["sourceType"] = "source-text-mention"
                    if bucket["role"] == "人物線索":
                        bucket["role"] = "女性互動線索" if is_female else "原文提及"
                bucket["confidence"] = max(bucket["confidence"], 0.7 if is_female and has_emotion_angle else 0.64)
                bucket["score"] += 1.8 if is_female and has_emotion_angle else 1.0
                bucket["evidenceRefs"].extend(refs)

        def sort_key(item: dict[str, Any]) -> tuple[int, int, float, float, str]:
            return (
                0 if item["sourceType"] == "relationship-edge" else 1,
                0 if item["femaleFocus"] else 1,
                -float(item["confidence"]),
                -float(item["score"]),
                str(item["label"]),
            )

        targets = [
            NarrativeInteractionTarget(
                targetId=item["targetId"],
                label=str(item["label"] or item["targetId"]),
                role=str(item["role"] or "人物線索"),
                gender=item["gender"],
                sourceType=str(item["sourceType"]),
                relationshipType=item["relationshipType"],
                confidence=self._coerce_float(item["confidence"], default=0.68),
                evidenceRefs=sorted(set(item["evidenceRefs"]))[:12],
                femaleFocus=bool(item["femaleFocus"]),
            )
            for item in sorted(buckets.values(), key=sort_key)[:12]
        ]
        return targets

    def _iter_runtime_target_mention_sources(self, runtime_persona: dict[str, Any]) -> list[tuple[str, list[str], bool]]:
        sources: list[tuple[str, list[str], bool]] = []
        for beat in (runtime_persona.get("storyBeats") or [])[:18]:
            refs = [str(ref) for ref in (beat.get("sourceRefs") or []) if str(ref).strip()]
            text = " ".join(
                str(value)
                for value in [
                    beat.get("summary"),
                    beat.get("sourceQuote"),
                    beat.get("location"),
                ]
                if value
            )
            if text.strip():
                sources.append((text, refs, False))
        for highlight in (runtime_persona.get("sourceHighlights") or [])[:24]:
            source_ref = str(highlight.get("sourceRef") or "").strip()
            families = {str(family).strip() for family in (highlight.get("angleFamilies") or []) if str(family).strip()}
            text = " ".join(
                str(value)
                for value in [
                    highlight.get("example"),
                    highlight.get("summary"),
                    source_ref,
                ]
                if value
            )
            if text.strip():
                sources.append((text, [source_ref] if source_ref else [], "female_interaction" in families))
        return sources

    def _build_narrative_evidence_cards(
        self,
        runtime_persona: dict[str, Any],
        runtime_relationships: dict[str, Any],
        interaction_targets: list[NarrativeInteractionTarget],
    ) -> list[NarrativeEvidenceCard]:
        cards: list[NarrativeEvidenceCard] = []
        seen: set[str] = set()
        target_labels = {target.targetId: target.label for target in interaction_targets}
        target_by_id = {target.targetId: target for target in interaction_targets}
        female_target_ids = [target.targetId for target in interaction_targets if target.femaleFocus]
        preferred_non_conflict = self._preferred_non_conflict_relationships(runtime_relationships)

        def normalize_related_ids(raw_ids: list[Any] | None, source_text: str = "") -> list[str]:
            related_ids: list[str] = []
            for raw_id in raw_ids or []:
                target_id = self._normalize_runtime_target_id(str(raw_id), None, source_text)
                if target_id in target_labels and target_id not in related_ids:
                    related_ids.append(target_id)
            return related_ids

        def normalize_relationship_edge(edge: dict[str, Any]) -> dict[str, Any]:
            target_id = self._normalize_runtime_target_id(
                edge.get("targetId"),
                edge.get("targetName"),
                self._runtime_edge_source_text(edge),
            )
            if target_id and target_id != str(edge.get("targetId") or "").strip():
                return {**edge, "targetId": target_id}
            return edge

        highlight_by_ref = {
            str(item.get("sourceRef") or "").strip(): item
            for item in (runtime_persona.get("sourceHighlights") or [])
            if str(item.get("sourceRef") or "").strip()
        }

        for beat in (runtime_persona.get("storyBeats") or [])[:14]:
            refs = [str(ref) for ref in (beat.get("sourceRefs") or []) if str(ref).strip()]
            primary_ref = refs[0] if refs else ""
            families = list((highlight_by_ref.get(primary_ref) or {}).get("angleFamilies") or [])
            beat_text = " ".join(
                str(value)
                for value in [
                    beat.get("summary"),
                    beat.get("sourceQuote"),
                    beat.get("location"),
                ]
                if value
            )
            related_target_ids = normalize_related_ids(beat.get("relatedGeneralIds"), beat_text)
            if not related_target_ids:
                related_target_ids = self._detect_related_target_ids(
                    beat_text,
                    target_labels,
                    female_target_ids=female_target_ids,
                )
            evidence_id = str(beat.get("eventId") or beat.get("eventKey") or primary_ref or f"story-beat-{len(cards)}").strip()
            if not evidence_id or evidence_id in seen:
                continue
            seen.add(evidence_id)
            chapter_no = beat.get("chapterNo")
            classification_text = beat_text
            card_angle = self._classify_narrative_angle(
                families=families,
                relationship_type=None,
                related_target_ids=related_target_ids,
                source_text=classification_text,
            )
            related_target_ids = self._filter_related_target_ids_for_angle(
                card_angle,
                related_target_ids,
                target_by_id,
                source_text=classification_text,
                runtime_persona=runtime_persona,
            )
            if card_angle == "emotion" and not related_target_ids:
                continue
            cards.append(
                NarrativeEvidenceCard(
                    evidenceId=evidence_id,
                    contextKey=str(beat.get("eventKey") or "").strip() or None,
                    angle=card_angle,
                    title=str(beat.get("location") or beat.get("eventKey") or "舊事浮現"),
                    summary=str(beat.get("summary") or beat.get("sourceQuote") or "一段舊事正在浮上心頭。"),
                    quote=str(beat.get("sourceQuote") or "") or None,
                    location=str(beat.get("location") or "") or None,
                    chapterNo=int(chapter_no) if isinstance(chapter_no, int) else None,
                    sourceType="runtime-story-beat",
                    sourceRefs=refs,
                    relatedTargetIds=related_target_ids,
                    confidence=self._coerce_float(beat.get("confidence"), default=0.72),
                )
            )

        for highlight in (runtime_persona.get("sourceHighlights") or []):
            if len(cards) >= 30:
                break
            evidence_id = f"highlight:{highlight.get('sourceRef') or len(cards)}"
            if evidence_id in seen:
                continue
            seen.add(evidence_id)
            families = list(highlight.get("angleFamilies") or [])
            example = str(highlight.get("example") or "").strip()
            source_ref = str(highlight.get("sourceRef") or "").strip()
            related_target_ids = normalize_related_ids(highlight.get("relatedGeneralIds"), example)
            if not related_target_ids:
                related_target_ids = self._detect_related_target_ids(
                    example,
                    target_labels,
                    female_target_ids=female_target_ids,
                )
            card_angle = self._classify_narrative_angle(
                families=families,
                relationship_type=None,
                related_target_ids=related_target_ids,
                source_text=example,
            )
            related_target_ids = self._filter_related_target_ids_for_angle(
                card_angle,
                related_target_ids,
                target_by_id,
                source_text=example,
                runtime_persona=runtime_persona,
            )
            if card_angle == "emotion" and not related_target_ids:
                continue
            cards.append(
                NarrativeEvidenceCard(
                    evidenceId=evidence_id,
                    contextKey=None,
                    angle=card_angle,
                    title=source_ref or "線索片段",
                    summary=example or "一條來自來源封包的片段線索。",
                    quote=example or None,
                    location=None,
                    chapterNo=None,
                    sourceType="runtime-source-highlight",
                    sourceRefs=[source_ref] if source_ref else [],
                    relatedTargetIds=related_target_ids,
                    confidence=0.7 if families else 0.64,
                )
            )

        target_order = {target.targetId: index for index, target in enumerate(interaction_targets)}

        def relationship_edge_sort_key(edge: dict[str, Any]) -> tuple[int, int, int, str]:
            edge = normalize_relationship_edge(edge)
            target_id = str(edge.get("targetId") or "").strip()
            target = target_by_id.get(target_id)
            resolved_type = self._resolve_runtime_relationship_type(edge, runtime_persona, preferred_non_conflict)
            return (
                0 if target else 1,
                target_order.get(target_id, 999),
                0 if target and target.relationshipType == resolved_type else 1,
                str(edge.get("type") or ""),
            )

        for edge in sorted(runtime_relationships.get("anchors") or [], key=relationship_edge_sort_key):
            if len(cards) >= 36:
                break
            edge = normalize_relationship_edge(edge)
            target_id = str(edge.get("targetId") or "").strip()
            if not target_id or target_id not in target_by_id:
                continue
            relationship_type = self._resolve_runtime_relationship_type(edge, runtime_persona, preferred_non_conflict)
            target = target_by_id.get(target_id)
            if target and target.relationshipType and relationship_type != target.relationshipType:
                relationship_type = target.relationshipType
            evidence_id = f"relationship:{target_id}:{relationship_type or edge.get('type') or len(cards)}"
            if evidence_id in seen:
                continue
            seen.add(evidence_id)
            quote = next((str(line) for line in (edge.get("sourceQuotes") or []) if str(line).strip()), None)
            target_name = str(edge.get("targetName") or target_labels.get(target_id) or target_id)
            relationship_label = self._relationship_type_label(relationship_type, edge.get("typeLabel"))
            cards.append(
                NarrativeEvidenceCard(
                    evidenceId=evidence_id,
                    contextKey=None,
                    angle=self._classify_narrative_angle(
                        families=[],
                        relationship_type=relationship_type,
                        related_target_ids=[target_id],
                        source_text=" ".join(value for value in [quote or "", target_name] if value),
                    ),
                    title=f"想到{target_name}",
                    summary=quote or f"{runtime_persona.get('displayName') or '此人'}與{target_name}之間有{edge.get('typeLabel') or relationship_type or '一段互動'}。",
                    quote=quote,
                    location=None,
                    chapterNo=None,
                    sourceType="runtime-relationship-edge",
                    sourceRefs=[str(ref) for ref in (edge.get("evidenceRefs") or []) if str(ref).strip()],
                    relatedTargetIds=[target_id],
                    confidence=self._coerce_float(edge.get("edgeConfidence"), default=0.7),
                )
            )

        return cards

    def _filter_related_target_ids_for_angle(
        self,
        angle: str,
        related_target_ids: list[str],
        target_by_id: dict[str, NarrativeInteractionTarget],
        source_text: str = "",
        runtime_persona: dict[str, Any] | None = None,
    ) -> list[str]:
        if angle == "emotion":
            return [
                target_id
                for target_id in related_target_ids
                if self._is_valid_emotion_target(
                    target_by_id.get(target_id),
                    source_text=source_text,
                    runtime_persona=runtime_persona or {},
                )
            ]
        if angle == "bond":
            bond_types = {
                "sworn_sibling",
                "battle_ally",
                "loyal_oath",
                "protects_family",
                "spouse",
                "parent_child",
                "sibling",
                "alliance_oath",
            }
            return [
                target_id
                for target_id in related_target_ids
                if str((target_by_id.get(target_id).relationshipType if target_by_id.get(target_id) else "") or "") in bond_types
            ]
        if angle not in {"people", "resource", "bond"}:
            return related_target_ids
        filtered: list[str] = []
        for target_id in related_target_ids:
            target = target_by_id.get(target_id)
            relationship_type = str(target.relationshipType or "") if target else ""
            role = str(target.role or "") if target else ""
            if relationship_type in {"enemy_rival", "battlefield_opponent", "betrayal_surrender"}:
                continue
            if "敵對" in role or "戰場對手" in role:
                continue
            filtered.append(target_id)
        return filtered

    def _is_valid_emotion_target(
        self,
        target: NarrativeInteractionTarget | None,
        source_text: str,
        runtime_persona: dict[str, Any],
    ) -> bool:
        if not target or not target.femaleFocus:
            return False
        relationship_type = str(target.relationshipType or "")
        if relationship_type in {"spouse", "parent_child", "sibling", "protects_family", "lover"}:
            return True
        text = str(source_text or "")
        if not self._text_mentions_runtime_actor(runtime_persona, text):
            return False
        if not any(alias and alias in text for alias in self._target_label_aliases(target.label)):
            return False
        emotion_terms = ("夫人", "家眷", "妻", "母", "女", "嫁", "婚", "去留", "煩惱", "垂淚", "思親", "情")
        return any(term in text for term in emotion_terms)

    def _text_has_resource_signal(self, text: str) -> bool:
        return bool(
            re.search(
                r"糧草|糧食|錢糧|軍資|輜重|補給|俸祿|金銀|金帛|府庫|倉廩|"
                r"資財|家業|牌印|印綬|器皿|輜車|軍械|兵器",
                str(text or ""),
            )
        )

    def _text_has_battle_signal(self, text: str) -> bool:
        return any(term in str(text or "") for term in ("戰", "兵", "軍", "殺", "攻", "追", "退", "圍", "敗", "斬", "陣", "馬"))

    def _classify_narrative_angle(
        self,
        families: list[str],
        relationship_type: str | None,
        related_target_ids: list[str],
        source_text: str = "",
    ) -> str:
        relation = relationship_type or ""
        family_set = {str(family).strip() for family in families if str(family).strip()}
        text = str(source_text or "")
        bond_markers = r"stableKnowledgeBootstrap:sworn_sibling|結義|盟誓|桃園|兄弟|付託|託付|二夫人|嫂|三罪|故人舊日之情"
        if relation in {"sworn_sibling", "alliance_oath", "battle_ally", "protects_family"}:
            return "bond"
        if relation in {"enemy_rival", "battlefield_opponent", "betrayal_surrender"}:
            return "rival"
        if relation in {"battlefield_contact", "political_contact"}:
            return "people"
        if relation in {"ruler_subject", "patron_client", "mentor_student"}:
            return "relationship"
        if "female_interaction" in family_set:
            return "emotion"
        if "relationship" in family_set:
            if re.search(bond_markers, text):
                return "bond"
            return "relationship"
        if re.search(bond_markers, text):
            return "bond"
        if "decision_weight" in family_set or "faction_timeline" in family_set:
            return "decision"
        if "battle" in family_set or "location_context" in family_set:
            return "battlefield"
        if "item_equipment" in family_set and self._text_has_resource_signal(text):
            return "resource"
        if "activity_seed" in family_set or "work_role" in family_set:
            return "habit"
        if "item_equipment" in family_set:
            return "battlefield"
        if related_target_ids:
            return "people"
        return "people"

    def _target_label_aliases(self, label: str) -> list[str]:
        normalized = str(label or "").strip()
        if not normalized:
            return []
        aliases: list[str] = [normalized]
        compact = normalized.replace(" ", "")
        if compact and compact not in aliases:
            aliases.append(compact)
        surname = compact[:1]
        if surname:
            spouse_form = f"{surname}夫人"
            if spouse_form not in aliases:
                aliases.append(spouse_form)
            clan_form = f"{surname}氏"
            if clan_form not in aliases:
                aliases.append(clan_form)
        if compact.endswith("氏"):
            bare = compact[:-1]
            if bare:
                bare_spouse = f"{bare}夫人"
                if bare_spouse not in aliases:
                    aliases.append(bare_spouse)
        return aliases

    def _target_aliases_for_interaction(self, target: NarrativeInteractionTarget) -> list[str]:
        seeds = [target.label]
        try:
            runtime_persona = self.store.read_runtime_persona(target.targetId)
        except Exception:
            runtime_persona = None
        if isinstance(runtime_persona, dict):
            for key in ("aliases", "nameAliases"):
                value = runtime_persona.get(key)
                if isinstance(value, list):
                    seeds.extend(str(item) for item in value if str(item).strip())
                elif value:
                    seeds.append(str(value))
        if "益德" in seeds and "翼德" not in seeds:
            seeds.append("翼德")
        if "翼德" in seeds and "益德" not in seeds:
            seeds.append("益德")
        aliases: list[str] = []
        for seed in seeds:
            for alias in self._target_label_aliases(seed):
                if alias and alias not in aliases:
                    aliases.append(alias)
        return sorted(aliases, key=len, reverse=True)

    def _detect_related_target_ids(
        self,
        text: str,
        target_labels: dict[str, str],
        female_target_ids: list[str] | None = None,
    ) -> list[str]:
        if not text:
            return []
        female_ids = list(dict.fromkeys(female_target_ids or []))
        hits: list[str] = []
        for target_id, label in target_labels.items():
            aliases = self._target_label_aliases(label)
            if any(alias and alias in text for alias in aliases):
                hits.append(target_id)
        if female_ids and any(token in text for token in ("夫人", "二夫人", "二嫂嫂", "家眷", "嫂嫂", "妻")):
            for target_id in female_ids:
                if target_id not in hits:
                    hits.append(target_id)
        return hits[:4]

    def _build_illustration_prompt(
        self,
        display_name: str,
        runtime_persona: dict[str, Any],
        interaction_targets: list[NarrativeInteractionTarget],
    ) -> str:
        voice_style = ", ".join((runtime_persona.get("voiceAndPrompt") or {}).get("voiceStyle") or [])
        personality_tags = self._humanize_tag_list((runtime_persona.get("profile") or {}).get("personalityTags") or [])
        affect_tags = self._humanize_tag_list((runtime_persona.get("profile") or {}).get("affectTags") or [])
        key_targets = "、".join(target.label for target in interaction_targets[:3])
        return (
            f"以清爽、輕鬆、易讀的劇情角色插畫描繪{display_name}，"
            "乾淨線條、柔和色彩、自然表情、溫暖電影光感，不要水墨山水、卷軸感或厚重筆刷；"
            f"保留角色氣質：{voice_style or personality_tags or '仁德與沉著'}；"
            f"情緒核心：{affect_tags or '情義與憂民'}；"
            f"可加入互動對象：{key_targets or '張飛、關羽、百姓'}；"
            "讓人物像剛從回憶中走出來，正準備做出下一個決定。畫面中不要出現任何文字、中文字、字幕或招牌字。"
        )

    def _coerce_float(self, value: Any, default: float) -> float:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return default
        return max(0.0, min(1.0, numeric))

    def _humanize_tag_list(self, values: Any, fallback: str = "") -> str:
        if not values:
            return fallback
        if isinstance(values, str):
            raw_items = [part.strip() for part in re.split(r"[、,，·\s]+", values) if part.strip()]
        elif isinstance(values, (list, tuple, set)):
            raw_items = [str(part).strip() for part in values if str(part).strip()]
        else:
            raw_items = [str(values).strip()] if str(values).strip() else []
        tag_map = {
            "governance-minded": "重治理",
            "literary": "文雅",
            "family-bound": "重家室與結義",
            "direct_force": "行動果斷",
            "commanding": "統率威嚴",
            "analytical": "審勢而行",
            "administrative": "善理政務",
            "persuasive": "善於勸說",
            "opportunistic": "臨機應變",
            "family_affection": "家族牽掛",
            "mercy_compassion": "仁心與憐憫",
            "grief_regret": "悲痛與遺憾",
            "ambition_pride": "志氣與自尊",
            "host_banquet": "設宴安撫",
            "family_duty": "家室安置",
            "suppress_unrest": "平亂整軍",
        }
        humanized: list[str] = []
        for item in raw_items:
            mapped = tag_map.get(item, item)
            if mapped and mapped not in humanized:
                humanized.append(mapped)
        return "、".join(humanized) or fallback

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
        general_id: str,
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
                "inner_monologue": "心裡想起",
                "meeting_statement": "帳中議到",
            }.get(speech_context_mode, "說起")
            self_name = {
                "cao-cao": "孤",
                "guan-yu": "關某",
                "liu-bei": "備",
                "lu-bu": "奉先",
                "sun-quan": "權",
                "wei-yan": "魏延",
                "yuan-shao": "本初",
                "zhang-fei": "俺",
                "zhao-yun": "雲",
                "zhuge-liang": "亮",
            }.get(general_id, display_name)
            text = f"{prefix}{context_label}與{keyword_text}，{self_name}只按眼前證據作答，不敢亂編史事。"
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
    ) -> ResolvedEvidencePack:
        return self.evidence_resolver.resolve(general_id, context, keywords, evidence_refs)


def find_repo_root(start: Path) -> Path:
    override = (os.environ.get("NPC_REPO_ROOT") or "").strip()
    if override:
        return Path(override).resolve()

    current = start.resolve()
    monorepo_candidates = [candidate for candidate in [current, *current.parents] if (candidate / "AGENTS.md").exists() and (candidate / "server/npc-brain").exists()]
    if monorepo_candidates:
        return monorepo_candidates[0]

    for candidate in [current, *current.parents]:
        if (candidate / "app").exists() and (candidate / "pipelines/sanguo-rag").exists():
            return candidate
    raise FileNotFoundError("Could not locate repo root from current working directory.")
