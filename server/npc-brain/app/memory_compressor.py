from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .interaction_memory import (
    GeneralMemoryData,
    InteractionEvent,
    MemoryCompressRequest,
    load_general_memory,
    load_interaction_events,
    save_general_memory,
)
from .llm_dialogue_renderer import DEFAULT_GEMINI_FLASH_MODEL, log_debug_event


DEFAULT_MEMORY_COMPRESS_PROVIDER = "deterministic"
DEFAULT_MEMORY_COMPRESS_MODEL = DEFAULT_GEMINI_FLASH_MODEL
DEFAULT_MEMORY_COMPRESS_TIMEOUT_MS = 6000
MAX_EVENT_SUMMARY_CHARS = 1200


class MemoryCompressionError(RuntimeError):
    pass


def build_compress_short_term_prompt(events: list[InteractionEvent], current_memory: GeneralMemoryData, persona_subset: dict) -> str:
    return _prompt(
        "shortTerm",
        "摘要最近互動的話題、情緒與未完結狀態，100 到 200 字，保留繁體中文。",
        events,
        current_memory,
        persona_subset,
    )


def build_compress_long_term_prompt(events: list[InteractionEvent], current_memory: GeneralMemoryData, persona_subset: dict) -> str:
    return _prompt(
        "longTerm",
        "只保留真正會長期影響玩家與武將關係的里程碑，略過日常寒暄。",
        events,
        current_memory,
        persona_subset,
    )


def build_compress_player_profile_prompt(events: list[InteractionEvent], current_memory: GeneralMemoryData, persona_subset: dict) -> str:
    return _prompt(
        "playerProfile",
        "從互動中推斷武將對玩家的認知、立場與行為模式；無證據就留空。",
        events,
        current_memory,
        persona_subset,
    )


def build_compress_promises_prompt(events: list[InteractionEvent], current_memory: GeneralMemoryData, persona_subset: dict) -> str:
    return _prompt(
        "promises",
        "列出尚未兌現的承諾、約定或待辦；沒有就輸出空字串。",
        events,
        current_memory,
        persona_subset,
    )


def compress_general_memory(repo_root: Path, request: MemoryCompressRequest, persona_subset: dict | None = None) -> GeneralMemoryData:
    memory = load_general_memory(repo_root, request.saveId, request.generalId)
    events = load_interaction_events(repo_root, request.saveId, request.generalId)
    pending_events = events[memory.lastCompressedIdx :]
    if not pending_events and not request.force:
        return memory
    persona_subset = persona_subset or {}
    provider = (os.environ.get("NPC_MEMORY_COMPRESS_PROVIDER") or DEFAULT_MEMORY_COMPRESS_PROVIDER).strip().lower()
    try:
        if provider == "gemini":
            sections = _compress_with_gemini(pending_events or events, memory, persona_subset)
            mode = "gemini"
        else:
            sections = _compress_deterministically(pending_events or events, memory, persona_subset)
            mode = "deterministic"
    except Exception as exc:
        log_debug_event("memory.compress.failed", saveId=request.saveId, generalId=request.generalId, error=str(exc))
        raise MemoryCompressionError(f"memory compression failed for {request.saveId}/{request.generalId}") from exc

    next_memory = memory.model_copy(
        update={
            **sections,
            "lastCompressedIdx": len(events),
            "uncompressedCount": max(memory.uncompressedCount, len(events)),
            "lastCompressedAt": datetime.now(UTC).isoformat(),
        }
    )
    save_general_memory(repo_root, next_memory)
    log_debug_event(
        "memory.compress.completed",
        saveId=request.saveId,
        generalId=request.generalId,
        mode=mode,
        compressedEvents=len(pending_events or events),
        lastCompressedIdx=next_memory.lastCompressedIdx,
    )
    return next_memory


def _compress_deterministically(events: list[InteractionEvent], current_memory: GeneralMemoryData, persona_subset: dict) -> dict[str, str]:
    summaries = [event.summary for event in events if event.summary]
    milestone_summaries = [event.summary for event in events if event.isMilestone and event.summary]
    player_actions = [event.playerAction for event in events if event.playerAction]
    promise_events = [
        event.summary
        for event in events
        if event.summary and any(token in event.eventType.lower() for token in ["promise", "quest", "gift"])
    ]
    short_term = _join_unique([current_memory.shortTerm, *summaries[-6:]], limit=360)
    long_term = _join_unique([current_memory.longTerm, *milestone_summaries[-8:]], limit=520)
    player_profile = _join_unique([current_memory.playerProfile, *player_actions[-6:]], limit=360)
    promises = _join_unique([current_memory.promises, *promise_events[-8:]], limit=360)
    return {
        "shortTerm": short_term,
        "longTerm": long_term,
        "playerProfile": player_profile,
        "promises": promises,
    }


def _compress_with_gemini(events: list[InteractionEvent], current_memory: GeneralMemoryData, persona_subset: dict) -> dict[str, str]:
    prompts = {
        "shortTerm": build_compress_short_term_prompt(events, current_memory, persona_subset),
        "longTerm": build_compress_long_term_prompt(events, current_memory, persona_subset),
        "playerProfile": build_compress_player_profile_prompt(events, current_memory, persona_subset),
        "promises": build_compress_promises_prompt(events, current_memory, persona_subset),
    }
    return {key: _request_gemini(prompt).strip() for key, prompt in prompts.items()}


def _request_gemini(prompt: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise MemoryCompressionError("GEMINI_API_KEY or GOOGLE_API_KEY is required for gemini memory compression")
    model = os.environ.get("NPC_MEMORY_COMPRESS_MODEL") or DEFAULT_MEMORY_COMPRESS_MODEL
    timeout = int(os.environ.get("NPC_MEMORY_COMPRESS_TIMEOUT_MS") or DEFAULT_MEMORY_COMPRESS_TIMEOUT_MS) / 1000
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 256,
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise MemoryCompressionError(str(exc)) from exc
    candidates = payload.get("candidates") or []
    parts = ((candidates[0].get("content") or {}).get("parts") or []) if candidates else []
    text = "".join(str(part.get("text") or "") for part in parts).strip()
    if not text:
        raise MemoryCompressionError("gemini returned empty memory section")
    return text


def _prompt(section: str, instruction: str, events: list[InteractionEvent], current_memory: GeneralMemoryData, persona_subset: dict) -> str:
    payload = {
        "task": "Compress player-general interaction memory for a Three Kingdoms NPC.",
        "section": section,
        "instruction": instruction,
        "persona": persona_subset,
        "currentMemory": current_memory.model_dump(),
        "events": [event.model_dump() for event in events],
        "output": "Return plain Traditional Chinese text only. No JSON, markdown, or invented facts.",
    }
    text = json.dumps(payload, ensure_ascii=False)
    return text[:MAX_EVENT_SUMMARY_CHARS]


def _join_unique(values: list[str | None], limit: int) -> str:
    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        item = " ".join(str(value or "").split()).strip()
        if not item or item in seen:
            continue
        seen.add(item)
        cleaned.append(item)
    return "；".join(cleaned)[-limit:]
