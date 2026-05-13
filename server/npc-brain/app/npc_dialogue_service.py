from __future__ import annotations

import json
import os
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
        default_female_target_ids = ("mi-shi", "gan-shi", "sun-shang-xiang")
        female_hint_map = {
            "liu-bei": default_female_target_ids,
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
                "femaleFocus": gender == "female",
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

        for target_id in default_female_target_ids:
            bucket = buckets.get(target_id)
            if bucket is None:
                continue
            bucket["femaleFocus"] = True
            bucket["score"] += 1.25
            if bucket["role"] == "人物線索":
                bucket["role"] = "女性互動線索"

        has_female_signal = any(
            "female_interaction" in {str(family).strip() for family in (highlight.get("angleFamilies") or [])}
            for highlight in (runtime_persona.get("sourceHighlights") or [])
        )
        if has_female_signal:
            for target_id in female_hint_map.get(general_id, ()):
                if target_id not in roster_index:
                    continue
                bucket = ensure_bucket(target_id)
                bucket["femaleFocus"] = True
                bucket["confidence"] = max(bucket["confidence"], 0.68)
                bucket["score"] += 1.8
                if bucket["role"] == "人物線索":
                    bucket["role"] = "女性互動線索"

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

    def _build_narrative_evidence_cards(
        self,
        runtime_persona: dict[str, Any],
        runtime_relationships: dict[str, Any],
        interaction_targets: list[NarrativeInteractionTarget],
    ) -> list[NarrativeEvidenceCard]:
        cards: list[NarrativeEvidenceCard] = []
        seen: set[str] = set()
        target_labels = {target.targetId: target.label for target in interaction_targets}
        highlight_by_ref = {
            str(item.get("sourceRef") or "").strip(): item
            for item in (runtime_persona.get("sourceHighlights") or [])
            if str(item.get("sourceRef") or "").strip()
        }

        for beat in (runtime_persona.get("storyBeats") or [])[:14]:
            refs = [str(ref) for ref in (beat.get("sourceRefs") or []) if str(ref).strip()]
            primary_ref = refs[0] if refs else ""
            families = list((highlight_by_ref.get(primary_ref) or {}).get("angleFamilies") or [])
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
            )
            evidence_id = str(beat.get("eventId") or beat.get("eventKey") or primary_ref or f"story-beat-{len(cards)}").strip()
            if not evidence_id or evidence_id in seen:
                continue
            seen.add(evidence_id)
            chapter_no = beat.get("chapterNo")
            cards.append(
                NarrativeEvidenceCard(
                    evidenceId=evidence_id,
                    contextKey=str(beat.get("eventKey") or "").strip() or None,
                    angle=self._classify_narrative_angle(families=families, relationship_type=None, related_target_ids=related_target_ids),
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

        for edge in (runtime_relationships.get("anchors") or [])[:12]:
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

        for highlight in (runtime_persona.get("sourceHighlights") or [])[:12]:
            if len(cards) >= 24:
                break
            evidence_id = f"highlight:{highlight.get('sourceRef') or len(cards)}"
            if evidence_id in seen:
                continue
            seen.add(evidence_id)
            families = list(highlight.get("angleFamilies") or [])
            example = str(highlight.get("example") or "").strip()
            source_ref = str(highlight.get("sourceRef") or "").strip()
            related_target_ids = self._detect_related_target_ids(example, target_labels)
            cards.append(
                NarrativeEvidenceCard(
                    evidenceId=evidence_id,
                    contextKey=None,
                    angle=self._classify_narrative_angle(families=families, relationship_type=None, related_target_ids=related_target_ids),
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

    def _detect_related_target_ids(self, text: str, target_labels: dict[str, str]) -> list[str]:
        if not text:
            return []
        hits: list[str] = []
        for target_id, label in target_labels.items():
            if label and label in text:
                hits.append(target_id)
        return hits[:4]

    def _build_illustration_prompt(
        self,
        display_name: str,
        runtime_persona: dict[str, Any],
        interaction_targets: list[NarrativeInteractionTarget],
    ) -> str:
        voice_style = ", ".join((runtime_persona.get("voiceAndPrompt") or {}).get("voiceStyle") or [])
        personality_tags = ", ".join((runtime_persona.get("profile") or {}).get("personalityTags") or [])
        affect_tags = ", ".join((runtime_persona.get("profile") or {}).get("affectTags") or [])
        key_targets = "、".join(target.label for target in interaction_targets[:3])
        return (
            f"以三國敘事插畫描繪{display_name}，畫面偏古典寫實與水墨戲劇感，"
            f"保留角色氣質：{voice_style or personality_tags or '仁德與沉著'}；"
            f"情緒核心：{affect_tags or '情義與憂民'}；"
            f"可加入互動對象：{key_targets or '張飛、關羽、百姓'}；"
            "讓人物像剛從回憶中走出來，正準備做出下一個決定。"
        )

    def _coerce_float(self, value: Any, default: float) -> float:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return default
        return max(0.0, min(1.0, numeric))

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
