from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

from .llm_dialogue_renderer import log_debug_event


CURRENT_MEMORY_SCHEMA_VERSION = 1
DEFAULT_MEMORY_EVENTS_ROOT = Path("server/npc-brain/local/interaction-events")
DEFAULT_MEMORY_STORE_ROOT = Path("server/npc-brain/local/general-memory")
DEFAULT_MEMORY_COMPRESS_INTERVAL = 50
DEFAULT_MEMORY_RECENT_WINDOW = 15


def _normalize_text(value: str | None, limit: int | None = None) -> str:
    cleaned = " ".join(str(value or "").split()).strip()
    if limit is not None:
        cleaned = cleaned[:limit]
    return cleaned


def _normalize_keywords(keywords: list[str] | None) -> list[str]:
    return list(dict.fromkeys(keyword for keyword in (keywords or []) if keyword))


def _resolve_root(repo_root: Path, configured_root: str | Path | None, default_root: Path) -> Path:
    candidate = Path(configured_root) if configured_root is not None else default_root
    return candidate if candidate.is_absolute() else repo_root / candidate


def _atomic_tmp_path(path: Path) -> Path:
    if path.suffix:
        return path.with_suffix(f"{path.suffix}.tmp")
    return path.with_suffix(".tmp")


class InteractionEventCreateRequest(BaseModel):
    saveId: str
    generalId: str
    eventType: str
    summary: str
    keywords: list[str] = Field(default_factory=list)
    playerAction: str | None = None
    generalReaction: str | None = None
    isMilestone: bool = False

    @model_validator(mode="after")
    def normalize_fields(self):
        self.saveId = _normalize_text(self.saveId)
        self.generalId = _normalize_text(self.generalId)
        self.eventType = _normalize_text(self.eventType)
        self.summary = _normalize_text(self.summary, limit=200)
        self.keywords = _normalize_keywords(self.keywords)
        self.playerAction = _normalize_text(self.playerAction) or None
        self.generalReaction = _normalize_text(self.generalReaction) or None
        return self


class InteractionEvent(BaseModel):
    eventId: str
    saveId: str
    generalId: str
    eventType: str
    summary: str
    keywords: list[str] = Field(default_factory=list)
    playerAction: str | None = None
    generalReaction: str | None = None
    isMilestone: bool = False
    createdAt: str

    @model_validator(mode="after")
    def normalize_fields(self):
        self.eventId = _normalize_text(self.eventId)
        self.saveId = _normalize_text(self.saveId)
        self.generalId = _normalize_text(self.generalId)
        self.eventType = _normalize_text(self.eventType)
        self.summary = _normalize_text(self.summary, limit=200)
        self.keywords = _normalize_keywords(self.keywords)
        self.playerAction = _normalize_text(self.playerAction) or None
        self.generalReaction = _normalize_text(self.generalReaction) or None
        self.createdAt = _normalize_text(self.createdAt)
        return self


class GeneralMemoryData(BaseModel):
    saveId: str = ""
    generalId: str = ""
    schemaVersion: int = CURRENT_MEMORY_SCHEMA_VERSION
    shortTerm: str = ""
    longTerm: str = ""
    playerProfile: str = ""
    promises: str = ""
    lastCompressedIdx: int = 0
    uncompressedCount: int = 0
    lastCompressedAt: str | None = None

    @model_validator(mode="after")
    def normalize_fields(self):
        self.saveId = _normalize_text(self.saveId)
        self.generalId = _normalize_text(self.generalId)
        self.schemaVersion = max(int(self.schemaVersion or CURRENT_MEMORY_SCHEMA_VERSION), 1)
        self.shortTerm = _normalize_text(self.shortTerm)
        self.longTerm = _normalize_text(self.longTerm)
        self.playerProfile = _normalize_text(self.playerProfile)
        self.promises = _normalize_text(self.promises)
        self.lastCompressedIdx = max(int(self.lastCompressedIdx or 0), 0)
        self.uncompressedCount = max(int(self.uncompressedCount or 0), 0)
        if self.lastCompressedIdx > self.uncompressedCount:
            self.lastCompressedIdx = self.uncompressedCount
        self.lastCompressedAt = _normalize_text(self.lastCompressedAt) or None
        return self


class GeneralMemoryContext(BaseModel):
    saveId: str
    shortTerm: str = ""
    longTerm: str = ""
    playerProfile: str = ""
    promises: str = ""

    @model_validator(mode="after")
    def normalize_fields(self):
        self.saveId = _normalize_text(self.saveId)
        self.shortTerm = _normalize_text(self.shortTerm)
        self.longTerm = _normalize_text(self.longTerm)
        self.playerProfile = _normalize_text(self.playerProfile)
        self.promises = _normalize_text(self.promises)
        return self


class MemoryCompressRequest(BaseModel):
    saveId: str
    generalId: str
    force: bool = False

    @model_validator(mode="after")
    def normalize_fields(self):
        self.saveId = _normalize_text(self.saveId)
        self.generalId = _normalize_text(self.generalId)
        return self


class InteractionEventWriteResponse(BaseModel):
    ok: bool = True
    eventId: str


class MemoryWriteResponse(BaseModel):
    ok: bool = True


def memory_key(save_id: str, general_id: str) -> str:
    return f"{_normalize_text(save_id)}__{_normalize_text(general_id)}"


def resolve_memory_roots(repo_root: Path) -> tuple[Path, Path]:
    events_root = _resolve_root(repo_root, os.environ.get("NPC_MEMORY_EVENTS_ROOT"), DEFAULT_MEMORY_EVENTS_ROOT)
    store_root = _resolve_root(repo_root, os.environ.get("NPC_MEMORY_STORE_ROOT"), DEFAULT_MEMORY_STORE_ROOT)
    return events_root, store_root


def get_memory_runtime_config(repo_root: Path) -> dict[str, Any]:
    events_root, store_root = resolve_memory_roots(repo_root)
    return {
        "eventsRoot": str(events_root),
        "storeRoot": str(store_root),
        "compressInterval": int(os.environ.get("NPC_MEMORY_COMPRESS_INTERVAL") or DEFAULT_MEMORY_COMPRESS_INTERVAL),
        "recentWindow": int(os.environ.get("NPC_MEMORY_RECENT_WINDOW") or DEFAULT_MEMORY_RECENT_WINDOW),
        "schemaVersion": CURRENT_MEMORY_SCHEMA_VERSION,
    }


def build_interaction_event(payload: InteractionEventCreateRequest) -> InteractionEvent:
    return InteractionEvent(
        eventId=str(uuid4()),
        saveId=payload.saveId,
        generalId=payload.generalId,
        eventType=payload.eventType,
        summary=payload.summary,
        keywords=list(payload.keywords),
        playerAction=payload.playerAction,
        generalReaction=payload.generalReaction,
        isMilestone=payload.isMilestone,
        createdAt=datetime.now(UTC).isoformat(),
    )


def memory_context_from_data(memory: GeneralMemoryData) -> GeneralMemoryContext | None:
    if not any([memory.shortTerm, memory.longTerm, memory.playerProfile, memory.promises]):
        return None
    return GeneralMemoryContext(
        saveId=memory.saveId,
        shortTerm=memory.shortTerm,
        longTerm=memory.longTerm,
        playerProfile=memory.playerProfile,
        promises=memory.promises,
    )


def has_memory_context_content(memory_context: GeneralMemoryContext | None) -> bool:
    if memory_context is None:
        return False
    return any([
        bool(memory_context.shortTerm),
        bool(memory_context.longTerm),
        bool(memory_context.playerProfile),
        bool(memory_context.promises),
    ])


def _interaction_events_path(repo_root: Path, save_id: str, general_id: str) -> Path:
    events_root, _ = resolve_memory_roots(repo_root)
    return events_root / f"{memory_key(save_id, general_id)}.jsonl"


def _general_memory_path(repo_root: Path, save_id: str, general_id: str) -> Path:
    _, store_root = resolve_memory_roots(repo_root)
    return store_root / f"{memory_key(save_id, general_id)}.json"


def append_interaction_event(repo_root: Path, event: InteractionEvent) -> bool:
    path = _interaction_events_path(repo_root, event.saveId, event.generalId)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event.model_dump(), ensure_ascii=False) + "\n")
        return True
    except OSError as exc:
        log_debug_event("memory.interaction-event.append-failed", path=str(path), error=str(exc))
        return False


def load_interaction_events(repo_root: Path, save_id: str, general_id: str) -> list[InteractionEvent]:
    path = _interaction_events_path(repo_root, save_id, general_id)
    if not path.exists():
        return []
    events: list[InteractionEvent] = []
    try:
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            try:
                events.append(InteractionEvent.model_validate(json.loads(line)))
            except (json.JSONDecodeError, ValueError) as exc:
                log_debug_event("memory.interaction-event.parse-skipped", path=str(path), error=str(exc))
    except OSError as exc:
        log_debug_event("memory.interaction-event.read-failed", path=str(path), error=str(exc))
    return events


def load_general_memory(repo_root: Path, save_id: str, general_id: str) -> GeneralMemoryData:
    path = _general_memory_path(repo_root, save_id, general_id)
    if not path.exists():
        return GeneralMemoryData(saveId=save_id, generalId=general_id)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return GeneralMemoryData.model_validate(payload)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        log_debug_event("memory.general-memory.read-failed", path=str(path), error=str(exc))
        return GeneralMemoryData(saveId=save_id, generalId=general_id)


def save_general_memory(repo_root: Path, memory: GeneralMemoryData) -> Path:
    path = _general_memory_path(repo_root, memory.saveId, memory.generalId)
    tmp_path = _atomic_tmp_path(path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path.write_text(memory.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")
        tmp_path.replace(path)
        return path
    except OSError as exc:
        log_debug_event("memory.general-memory.write-failed", path=str(path), error=str(exc))
        raise RuntimeError(f"failed to save general memory: {path}") from exc


def increment_uncompressed_count(repo_root: Path, save_id: str, general_id: str) -> GeneralMemoryData:
    memory = load_general_memory(repo_root, save_id, general_id)
    memory.uncompressedCount += 1
    save_general_memory(repo_root, memory)
    return memory


def compress_general_memory_stub(repo_root: Path, request: MemoryCompressRequest) -> GeneralMemoryData:
    memory = load_general_memory(repo_root, request.saveId, request.generalId)
    log_debug_event(
        "memory.compress.stub",
        saveId=request.saveId,
        generalId=request.generalId,
        force=request.force,
        schemaVersion=memory.schemaVersion,
        lastCompressedIdx=memory.lastCompressedIdx,
        uncompressedCount=memory.uncompressedCount,
    )
    return memory