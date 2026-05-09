from __future__ import annotations

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
    NpcDialogueService,
)
from .llm_dialogue_renderer import ProviderUnavailableError


DEV_CORS_ORIGINS = [
    "http://localhost:7456",
    "http://127.0.0.1:7456",
    "https://smith.langchain.com",
]


def create_app() -> FastAPI:
    app = FastAPI(title="3KLife NPC Brain", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=DEV_CORS_ORIGINS,
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

    @app.post("/v1/npc/dialogue", response_model=DialogueResponse)
    def dialogue(request: DialogueRequest):
        try:
            return service.build_dialogue(request)
        except ProviderUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return app


app = create_app()


def parse_categories(categories: str | None) -> list[str] | None:
    if not categories:
        return None
    return [category.strip() for category in categories.split(",") if category.strip()]