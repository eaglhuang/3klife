from __future__ import annotations

import os

try:
    from fastapi import FastAPI, HTTPException, Query
except ModuleNotFoundError as exc:
    raise RuntimeError(
        "FastAPI is not installed. Activate the server venv, or set PYTHON_BIN / "
        "SANGUO_RAG_PYTHON, then install API dependencies with: python -m pip install fastapi uvicorn"
    ) from exc

from fastapi.middleware.cors import CORSMiddleware

from .interaction_memory import (
    GeneralMemoryData,
    InteractionEventCreateRequest,
    InteractionEventWriteResponse,
    MemoryCompressRequest,
    MemoryWriteResponse,
)
from .npc_dialogue_service import (
    ContextOptionsResponse,
    DialogueRequest,
    DialogueResponse,
    KeywordOptionsResponse,
    NarrativeProfileResponse,
    NpcDialogueService,
    SceneDirectorRequest,
    SceneDirectorResponse,
    SceneIllustrationRequest,
    SceneIllustrationResponse,
)
from .llm_dialogue_renderer import ProviderOutputError, ProviderUnavailableError


DEV_CORS_ORIGINS = [
    "null",
    "http://localhost:7456",
    "http://127.0.0.1:7456",
    "http://localhost:8787",
    "http://127.0.0.1:8787",
    "https://smith.langchain.com",
]
DEV_CORS_ORIGIN_REGEX = (
    r"^(null|file://.*|app://.*|"
    r"http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?|"
    r"https://smith\.langchain\.com)$"
)


def resolve_dev_cors_origins() -> list[str]:
    extra_origins_raw = str(os.environ.get("NPC_CORS_EXTRA_ORIGINS") or "").strip()
    extras = [origin.strip() for origin in extra_origins_raw.split(",") if origin.strip()]
    return list(dict.fromkeys([*DEV_CORS_ORIGINS, *extras]))


def create_app() -> FastAPI:
    app = FastAPI(title="3KLife NPC Brain", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolve_dev_cors_origins(),
        allow_origin_regex=DEV_CORS_ORIGIN_REGEX,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    service = NpcDialogueService()

    @app.get("/healthz")
    def healthz():
        return service.get_health()

    @app.post("/v1/npc/interaction-events", response_model=InteractionEventWriteResponse)
    def interaction_events(request: InteractionEventCreateRequest):
        return service.record_interaction_event(request)

    @app.get("/v1/npc/general-memory", response_model=GeneralMemoryData)
    def general_memory(saveId: str, generalId: str):
        return service.get_general_memory(saveId, generalId)

    @app.post("/v1/npc/general-memory", response_model=MemoryWriteResponse)
    def save_general_memory(memory: GeneralMemoryData):
        return service.save_general_memory(memory)

    @app.post("/v1/npc/memory/compress", response_model=GeneralMemoryData)
    def compress_memory(request: MemoryCompressRequest):
        return service.compress_general_memory(request)

    @app.get("/v1/npc/context-options", response_model=ContextOptionsResponse)
    def context_options(generalId: str, limit: int | None = Query(default=None, ge=0)):
        return service.get_context_options(generalId, limit=limit)

    @app.get("/v1/npc/keyword-options", response_model=KeywordOptionsResponse)
    def keyword_options(
        generalId: str,
        categories: str | None = None,
        limitPerCategory: int | None = Query(default=None, ge=0),
    ):
        category_list = parse_categories(categories)
        return service.get_keyword_options(generalId, categories=category_list, limit_per_category=limitPerCategory)

    @app.get("/v1/npc/narrative-profile", response_model=NarrativeProfileResponse)
    def narrative_profile(generalId: str):
        return service.get_narrative_profile(generalId)

    @app.post("/v1/npc/dialogue", response_model=DialogueResponse)
    def dialogue(request: DialogueRequest):
        try:
            return service.build_dialogue(request)
        except ProviderUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @app.post("/v1/npc/scene-director", response_model=SceneDirectorResponse)
    def scene_director(request: SceneDirectorRequest):
        try:
            return service.build_scene_director(request)
        except ProviderUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @app.post("/v1/npc/scene-illustration", response_model=SceneIllustrationResponse)
    def scene_illustration(request: SceneIllustrationRequest):
        try:
            return service.render_scene_illustration(request)
        except ProviderUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ProviderOutputError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    return app


app = create_app()


def parse_categories(categories: str | None) -> list[str] | None:
    if not categories:
        return None
    return [category.strip() for category in categories.split(",") if category.strip()]
