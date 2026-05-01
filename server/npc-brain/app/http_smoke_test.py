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
    supported_presets = health.json()["llm"]["supportedModelPresets"]
    supported_by_key = {preset["preset"]: preset for preset in supported_presets}
    assert "qwen2_5_7b" in supported_by_key, supported_presets
    assert supported_by_key["qwen2_5_7b"]["providerOrder"] == ["local_llama"], supported_by_key["qwen2_5_7b"]
    assert "deepseek_r1_7b" in supported_by_key, supported_presets
    assert supported_by_key["deepseek_r1_7b"]["providerOrder"] == ["deepseek_reasoner"], supported_by_key["deepseek_r1_7b"]

    contexts = client.get("/v1/npc/context-options", params={"generalId": "zhang-fei"})
    assert contexts.status_code == 200, contexts.text
    assert contexts.json()["options"], "context options should not be empty"

    keywords = client.get("/v1/npc/keyword-options", params={"generalId": "zhang-fei"})
    assert keywords.status_code == 200, keywords.text
    keyword_payload = keywords.json()
    assert keyword_payload["categories"].get("event"), "event keyword options should not be empty"
    selected_keyword_keys = [
        item["keywordKey"]
        for items in keyword_payload["categories"].values()
        for item in items[:1]
    ][:3]
    assert selected_keyword_keys, "runtime keyword options should contain selectable keys"

    dialogue = client.post(
        "/v1/npc/dialogue",
        json={
            "generalId": "zhang-fei",
            "contextKey": "changban-bridge",
            "selectedKeywordKeys": selected_keyword_keys + ["unknown-key"],
            "maxChars": 90,
        },
    )
    assert dialogue.status_code == 200, dialogue.text
    payload = dialogue.json()
    assert payload["evidenceRefs"], "dialogue response should include evidence refs"
    assert payload["llmModelPreset"] == "fallback_chain", "dialogue response should echo default model preset"
    assert payload["rejectedKeywordKeys"] == ["unknown-key"], "unknown keyword should be rejected explicitly"

    print("[npc-brain-http-smoke] PASS")
    print(f"[npc-brain-http-smoke] contexts={len(contexts.json()['options'])} categories={len(keywords.json()['categories'])} evidenceRefs={len(payload['evidenceRefs'])} presets={len(supported_presets)}")


if __name__ == "__main__":
    main()