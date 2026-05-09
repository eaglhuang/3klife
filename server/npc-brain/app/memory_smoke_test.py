from __future__ import annotations

import os
from pathlib import Path

from fastapi.testclient import TestClient

from .main import create_app


def main() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "deterministic"
    os.environ["NPC_MEMORY_COMPRESS_PROVIDER"] = "deterministic"
    root = Path(os.environ.get("NPC_MEMORY_SMOKE_TMP") or (Path(__file__).resolve().parents[1] / "local/memory-smoke-runtime"))
    root.mkdir(parents=True, exist_ok=True)
    os.environ["NPC_MEMORY_EVENTS_ROOT"] = str(root / "events")
    os.environ["NPC_MEMORY_STORE_ROOT"] = str(root / "memory")
    save_id = f"memory-smoke-save-{os.getpid()}"
    general_id = "zhang-fei"
    try:
        client = TestClient(create_app())

        health = client.get("/healthz")
        assert health.status_code == 200, health.text
        assert health.json()["memory"]["schemaVersion"] == 1

        event_response = client.post(
            "/v1/npc/interaction-events",
            json={
                "saveId": save_id,
                "generalId": general_id,
                "eventType": "dialogue",
                "summary": "玩家向張飛問起長坂橋斷後。",
                "keywords": ["event.changban-bridge"],
                "playerAction": "life_chat",
                "generalReaction": "俺只記得先護主公。",
            },
        )
        assert event_response.status_code == 200, event_response.text
        assert event_response.json()["eventId"], event_response.text

        memory = client.get("/v1/npc/general-memory", params={"saveId": save_id, "generalId": general_id})
        assert memory.status_code == 200, memory.text
        assert memory.json()["uncompressedCount"] == 1

        compressed = client.post(
            "/v1/npc/memory/compress",
            json={"saveId": save_id, "generalId": general_id, "force": True},
        )
        assert compressed.status_code == 200, compressed.text
        compressed_payload = compressed.json()
        assert compressed_payload["lastCompressedIdx"] == compressed_payload["uncompressedCount"] == 1
        assert compressed_payload["shortTerm"], "deterministic compression should write shortTerm"

        dialogue = client.post(
            "/v1/npc/dialogue",
            json={
                "generalId": general_id,
                "saveId": save_id,
                "selectedKeywordKeys": ["event.changban-bridge"],
                "locale": "zh-TW",
                "speechContextMode": "life_chat",
                "maxChars": 90,
            },
        )
        assert dialogue.status_code == 200, dialogue.text
        assert dialogue.json()["providerTrace"], "dialogue should expose providerTrace"
    finally:
        os.environ.pop("NPC_MEMORY_EVENTS_ROOT", None)
        os.environ.pop("NPC_MEMORY_STORE_ROOT", None)

    print("[npc-brain-memory-smoke] PASS")


if __name__ == "__main__":
    main()
