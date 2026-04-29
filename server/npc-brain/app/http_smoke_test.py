from __future__ import annotations

import os

from fastapi.testclient import TestClient

from .main import create_app


def main() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "deterministic"
    client = TestClient(create_app())

    health = client.get("/healthz")
    assert health.status_code == 200, health.text
    assert health.json()["ok"] is True

    contexts = client.get("/v1/npc/context-options", params={"generalId": "zhang-fei"})
    assert contexts.status_code == 200, contexts.text
    assert contexts.json()["options"], "context options should not be empty"

    keywords = client.get("/v1/npc/keyword-options", params={"generalId": "zhang-fei"})
    assert keywords.status_code == 200, keywords.text
    assert keywords.json()["categories"].get("person"), "person keyword options should not be empty"

    dialogue = client.post(
        "/v1/npc/dialogue",
        json={
            "generalId": "zhang-fei",
            "contextKey": "changban-bridge",
            "selectedKeywordKeys": ["cao-cao", "serpent-spear", "changban-bridge", "unknown-key"],
            "maxChars": 90,
        },
    )
    assert dialogue.status_code == 200, dialogue.text
    payload = dialogue.json()
    assert payload["evidenceRefs"], "dialogue response should include evidence refs"
    assert payload["rejectedKeywordKeys"] == ["unknown-key"], "unknown keyword should be rejected explicitly"

    print("[npc-brain-http-smoke] PASS")
    print(f"[npc-brain-http-smoke] contexts={len(contexts.json()['options'])} categories={len(keywords.json()['categories'])} evidenceRefs={len(payload['evidenceRefs'])}")


if __name__ == "__main__":
    main()