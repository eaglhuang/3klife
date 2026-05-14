from __future__ import annotations

import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
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
        card = self._select_narrative_card(profile.evidenceCards, request.evidenceId, request.angle, target)
        evidence_invalid = bool(request.evidenceId and not any(card_item.evidenceId == request.evidenceId for card_item in profile.evidenceCards))
        has_scene_data = card is not None and not target_invalid and not evidence_invalid
        data_status, fallback_reason = self._scene_data_status(
            requested_angle=request.angle,
            requested_target_id=request.targetId,
            requested_evidence_id=request.evidenceId,
            target_invalid=target_invalid,
            evidence_invalid=evidence_invalid,
            card=card,
            target=target,
        )
        beats = self._build_scene_director_beats(profile, card, target, request.angle) if has_scene_data else self._build_empty_scene_director_beats()
        evidence_refs = sorted(set(beats.sourceRefs + (target.evidenceRefs if target else [])))
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
            story_fallback = self._render_scene_director_story(profile.displayName, target, beats)
            story_generation = self._generate_scene_director_text(
                general_id=request.generalId,
                persona_card=self.get_persona_card(request.generalId),
                memory_context={
                    "saveId": f"demo-scene-director-{request.generalId}",
                    "shortTerm": beats.sceneText,
                    "longTerm": f"{beats.memoryText} {beats.emotionText}",
                    "playerProfile": (
                        f"{profile.displayName}正在面對與{target.label if target else '互動對象'}相關的局勢。"
                        f"在場判斷：{beats.presence.status}；依據：{beats.presence.reason}"
                    ),
                    "promises": (
                        "請把 sceneText/memoryText/emotionText/dialogueText/intentText 當作導演 beats，"
                        "寫成 350-550 字繁體中文連續舞台敘事；保留原文證據，不要模板拼貼。"
                    ),
                },
                evidence_refs=evidence_refs,
                deterministic_text=story_fallback,
                max_chars=request.maxStoryChars,
                locale=request.locale,
                llm_model_preset=request.llmModelPreset,
            )
            chorus_targets = self._select_chorus_targets(profile.interactionTargets, request.chorusTargetIds, target.targetId if target else None)
            chorus_lines = [
                self._build_scene_chorus_line(
                    request=request,
                    profile=profile,
                    target=chorus_target,
                    main_target=target,
                    card=card,
                    beats=beats,
                )
                for chorus_target in chorus_targets
            ]
        elif has_scene_data:
            story_text = self._render_scene_director_story(profile.displayName, target, beats)
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
                    target=chorus_target,
                    main_target=target,
                    card=card,
                    beats=beats,
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
        card: NarrativeEvidenceCard | None,
        target: NarrativeInteractionTarget | None,
    ) -> tuple[str, str | None]:
        if target_invalid or evidence_invalid:
            reason = "targetId 不存在" if target_invalid else "evidenceId 不存在"
            return "invalid_request", reason
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

    def _select_narrative_card(
        self,
        cards: list[NarrativeEvidenceCard],
        evidence_id: str | None,
        angle: str | None,
        target: NarrativeInteractionTarget | None = None,
    ) -> NarrativeEvidenceCard | None:
        if evidence_id:
            for card in cards:
                if card.evidenceId == evidence_id and self._card_matches_target(card, target):
                    return card
        if angle:
            for card in cards:
                if card.angle == angle and self._card_matches_target(card, target):
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
        return target.targetId in set(card.relatedTargetIds or [])

    def _select_narrative_target(
        self,
        targets: list[NarrativeInteractionTarget],
        target_id: str | None,
    ) -> NarrativeInteractionTarget | None:
        if target_id:
            for target in targets:
                if target.targetId == target_id:
                    return target
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
        source_refs = list(dict.fromkeys((card.sourceRefs if card else []) + (target.evidenceRefs if target else [])))
        quote = str(card.quote or "").strip() if card else ""
        summary = str(card.summary or "").strip() if card else ""
        title = str(card.title or "").strip() if card else ""
        location = str(card.location or "").strip() if card and card.location else ""
        presence = self._infer_scene_presence(target_label, [quote, summary, title, location])
        scene_text = self._sentence_or_default("；".join(part for part in [location, summary] if part), "", max_chars=120)
        memory_text = self._sentence_or_default(quote or summary or title, "", max_chars=120)
        emotion_text = self._sentence_or_default(self._deterministic_emotion_text(card_angle, target, presence), "", max_chars=96)
        dialogue_text = self._sentence_or_default(self._extract_quoted_dialogue(quote), "", max_chars=80)
        intent_text = self._sentence_or_default(self._deterministic_intent_text(card_angle, target), "", max_chars=88)
        return SceneDirectorBeats(
            sceneText=scene_text,
            memoryText=memory_text,
            emotionText=emotion_text,
            dialogueText=dialogue_text,
            intentText=intent_text,
            presence=presence,
            sourceRefs=source_refs[:12],
            evidenceId=card.evidenceId if card else None,
        )

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

    def _render_scene_director_story(
        self,
        display_name: str,
        target: NarrativeInteractionTarget | None,
        beats: SceneDirectorBeats,
    ) -> str:
        parts = [
            beats.sceneText,
            beats.memoryText if beats.memoryText and beats.memoryText != beats.sceneText else "",
            beats.emotionText,
            f"他低聲說：「{beats.dialogueText}」" if beats.dialogueText else "",
            beats.intentText,
        ]
        return "".join(self._ensure_sentence(part) for part in parts if part)

    def _build_data_first_chorus_line(
        self,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
    ) -> SceneChorusLine:
        text = self._render_chorus_fallback("", target, main_target, card, beats)
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

    def _build_scene_chorus_line(
        self,
        request: SceneDirectorRequest,
        profile: NarrativeProfileResponse,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
    ) -> SceneChorusLine:
        fallback = self._render_chorus_fallback(profile.displayName, target, main_target, card, beats)
        evidence_refs = sorted(set((card.sourceRefs if card else []) + target.evidenceRefs))
        generation = self._generate_scene_director_text(
            general_id=target.targetId,
            persona_card=self.get_persona_card(target.targetId),
            memory_context={
                "saveId": f"demo-chorus-{request.generalId}",
                "shortTerm": beats.sceneText,
                "longTerm": f"{beats.memoryText} {beats.emotionText}",
                "playerProfile": f"{target.label} 以 {target.role} 的關係旁觀這一幕。",
                "promises": "請輸出一句短評，不要提到自己的名字，不要使用資料欄位名。",
            },
            evidence_refs=evidence_refs,
            deterministic_text=fallback,
            max_chars=request.maxChorusChars,
            locale=request.locale,
            llm_model_preset=request.llmModelPreset,
            speech_context_mode="inner_monologue",
        )
        return SceneChorusLine(
            targetId=target.targetId,
            label=target.label,
            role=target.role,
            text=generation.text,
            provider=generation.provider,
            model=generation.model,
            fallbackUsed=generation.fallbackUsed,
            evidenceRefs=evidence_refs[:12],
        )

    def _render_chorus_fallback(
        self,
        display_name: str,
        target: NarrativeInteractionTarget,
        main_target: NarrativeInteractionTarget | None,
        card: NarrativeEvidenceCard | None,
        beats: SceneDirectorBeats,
    ) -> str:
        if target.femaleFocus:
            return "這一步不能只看勝負，也要先顧到人的安危。"
        if target.relationshipType in {"enemy_rival", "battlefield_opponent"}:
            return "若此刻躁進，局勢很容易反咬回來。"
        if target.relationshipType in {"sworn_sibling", "battle_ally", "loyal_oath"}:
            return "先把同伴站穩，再談下一步。"
        if card and card.angle == "battlefield":
            return "眼前最要緊的是退路與兵勢。"
        if card and card.angle == "resource":
            return "先把可用的東西算清楚，才不會失衡。"
        return "先看證據，再說判斷。"

    def _generate_scene_director_text(
        self,
        general_id: str,
        persona_card: PersonaCard | None,
        memory_context: dict[str, Any],
        evidence_refs: list[str],
        deterministic_text: str,
        max_chars: int,
        locale: str,
        llm_model_preset: str,
        speech_context_mode: str = "inner_monologue",
    ):
        evidence_pack = self._resolve_evidence(general_id, None, [], evidence_refs)
        preset_config = LLM_MODEL_PRESETS.get(llm_model_preset, LLM_MODEL_PRESETS[DEFAULT_LLM_MODEL_PRESET])
        return self.provider_router.generate(
            DialoguePromptPackage(
                generalId=general_id,
                personaCardSubset=self._persona_subset(persona_card),
                memoryContext=memory_context,
                selectedContext=None,
                selectedKeywords=[],
                resolvedEvidence=evidence_pack.resolvedEvidence,
                evidenceRefs=evidence_refs,
                deterministicText=deterministic_text[:max_chars],
                maxChars=max_chars,
                toneMode="narrative_fusion",
                locale=locale,
                speechContextMode=speech_context_mode,
            ),
            provider_order=preset_config["providerOrder"],
            model_overrides=preset_config["modelOverrides"],
            allow_deterministic_fallback=preset_config["allowDeterministicFallback"],
        )

    def _sentence_or_default(self, text: str, default: str, max_chars: int) -> str:
        normalized = " ".join(str(text or "").split()).strip() or default
        if len(normalized) > max_chars:
            normalized = normalized[: max_chars - 1] + "…"
        return self._ensure_sentence(normalized)

    def _ensure_sentence(self, text: str) -> str:
        stripped = str(text or "").strip()
        if not stripped:
            return ""
        return stripped if stripped.endswith(("。", "！", "？")) else f"{stripped}。"

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
                "confidence": 0.58,
                "score": 0.0,
                "evidenceRefs": [],
                "femaleFocus": self._is_female_gender(gender),
            }
            buckets[target_id] = bucket
            return bucket

        for edge in (runtime_relationships.get("anchors") or []):
            target_id = str(edge.get("targetId") or "").strip()
            if not target_id or target_id == general_id:
                continue
            bucket = ensure_bucket(target_id)
            bucket["label"] = str(edge.get("targetName") or bucket["label"] or target_id)
            bucket["role"] = str(edge.get("typeLabel") or edge.get("type") or bucket["role"])
            bucket["relationshipType"] = str(edge.get("type") or "") or None
            bucket["sourceType"] = "relationship-edge"
            bucket["confidence"] = max(bucket["confidence"], self._coerce_float(edge.get("edgeConfidence"), default=0.72))
            bucket["score"] += 4.0 + bucket["confidence"]
            bucket["evidenceRefs"].extend(str(ref) for ref in (edge.get("evidenceRefs") or []) if str(ref).strip())

        for category, options in (runtime_keywords.get("categories") or {}).items():
            for option in options or []:
                refs = [str(ref) for ref in (option.get("sourceRefs") or []) if str(ref).strip()]
                for target_id in (option.get("generalIds") or []):
                    target_key = str(target_id or "").strip()
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
                target_key = str(target_id or "").strip()
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
        female_target_ids = [target.targetId for target in interaction_targets if target.femaleFocus]
        highlight_by_ref = {
            str(item.get("sourceRef") or "").strip(): item
            for item in (runtime_persona.get("sourceHighlights") or [])
            if str(item.get("sourceRef") or "").strip()
        }

        for beat in (runtime_persona.get("storyBeats") or [])[:14]:
            refs = [str(ref) for ref in (beat.get("sourceRefs") or []) if str(ref).strip()]
            primary_ref = refs[0] if refs else ""
            families = list((highlight_by_ref.get(primary_ref) or {}).get("angleFamilies") or [])
            related_target_ids = [
                str(target_id)
                for target_id in (beat.get("relatedGeneralIds") or [])
                if str(target_id) in target_labels
            ]
            if not related_target_ids:
                related_target_ids = self._detect_related_target_ids(
                    " ".join(
                        str(value)
                        for value in [
                            beat.get("summary"),
                            beat.get("sourceQuote"),
                            beat.get("location"),
                        ]
                        if value
                    ),
                    target_labels,
                    female_target_ids=female_target_ids,
                )
            evidence_id = str(beat.get("eventId") or beat.get("eventKey") or primary_ref or f"story-beat-{len(cards)}").strip()
            if not evidence_id or evidence_id in seen:
                continue
            seen.add(evidence_id)
            chapter_no = beat.get("chapterNo")
            card_angle = self._classify_narrative_angle(
                families=families,
                relationship_type=None,
                related_target_ids=related_target_ids,
            )
            if card_angle == "emotion" and not related_target_ids and female_target_ids:
                related_target_ids = female_target_ids[:4]
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

        for highlight in (runtime_persona.get("sourceHighlights") or [])[:12]:
            if len(cards) >= 30:
                break
            evidence_id = f"highlight:{highlight.get('sourceRef') or len(cards)}"
            if evidence_id in seen:
                continue
            seen.add(evidence_id)
            families = list(highlight.get("angleFamilies") or [])
            example = str(highlight.get("example") or "").strip()
            source_ref = str(highlight.get("sourceRef") or "").strip()
            related_target_ids = [
                str(target_id)
                for target_id in (highlight.get("relatedGeneralIds") or [])
                if str(target_id) in target_labels
            ]
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
            )
            if card_angle == "emotion" and not related_target_ids and female_target_ids:
                related_target_ids = female_target_ids[:4]
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

        for edge in (runtime_relationships.get("anchors") or [])[:12]:
            if len(cards) >= 36:
                break
            target_id = str(edge.get("targetId") or "").strip()
            evidence_id = f"relationship:{target_id}:{edge.get('type') or len(cards)}"
            if not target_id or evidence_id in seen:
                continue
            seen.add(evidence_id)
            relationship_type = str(edge.get("type") or "").strip() or None
            quote = next((str(line) for line in (edge.get("sourceQuotes") or []) if str(line).strip()), None)
            target_name = str(edge.get("targetName") or target_labels.get(target_id) or target_id)
            cards.append(
                NarrativeEvidenceCard(
                    evidenceId=evidence_id,
                    contextKey=None,
                    angle=self._classify_narrative_angle(families=[], relationship_type=relationship_type, related_target_ids=[target_id]),
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

    def _classify_narrative_angle(
        self,
        families: list[str],
        relationship_type: str | None,
        related_target_ids: list[str],
    ) -> str:
        relation = relationship_type or ""
        family_set = {str(family).strip() for family in families if str(family).strip()}
        if relation in {"sworn_sibling", "alliance_oath", "battle_ally", "protects_family"}:
            return "bond"
        if relation in {"enemy_rival", "battlefield_opponent", "betrayal_surrender"}:
            return "rival"
        if "female_interaction" in family_set:
            return "emotion"
        if "item_equipment" in family_set:
            return "resource"
        if "battle" in family_set or "location_context" in family_set:
            return "battlefield"
        if "activity_seed" in family_set or "work_role" in family_set:
            return "habit"
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
