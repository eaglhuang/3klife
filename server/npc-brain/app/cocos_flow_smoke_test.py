from __future__ import annotations

import os

from fastapi.testclient import TestClient

from .main import create_app


def main() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "deterministic"
    client = TestClient(create_app())

    selected_general_id = "zhang-fei"

    contexts = client.get("/v1/npc/context-options", params={"generalId": selected_general_id, "limit": 1})
    assert contexts.status_code == 200, contexts.text
    context_payload = contexts.json()
    assert len(context_payload["options"]) == 1, "Cocos test flow expects one default context"

    keywords = client.get(
        "/v1/npc/keyword-options",
        params={
            "generalId": selected_general_id,
            "categories": "person,item,event",
            "limitPerCategory": 2,
        },
    )
    assert keywords.status_code == 200, keywords.text
    keyword_payload = keywords.json()
    assert set(keyword_payload["categories"]).issubset({"person", "item", "event"})
    assert list(keyword_payload["categories"].keys())[:3] == ["person", "item", "event"], "keyword categories should follow Cocos request order"
    assert all(len(options) <= 2 for options in keyword_payload["categories"].values())
    event_options = keyword_payload["categories"].get("event") or []
    if event_options:
        assert len(event_options[0]["label"]) <= int(event_options[0].get("uiLabelMaxChars") or 10), "event label should be UI-short"
        assert event_options[0].get("fullLabel"), "event keyword should preserve fullLabel for detail/LLM usage"

    selected_keyword_keys = [
        keyword_payload["categories"]["person"][0]["keywordKey"],
        keyword_payload["categories"]["item"][0]["keywordKey"],
    ]
    dialogue = client.post(
        "/v1/npc/dialogue",
        json={
            "generalId": selected_general_id,
            "contextKey": context_payload["options"][0]["contextKey"],
            "selectedKeywordKeys": selected_keyword_keys,
            "toneMode": "in-character",
            "locale": "zh-TW",
            "speechContextMode": "meeting_statement",
            "maxChars": 90,
        },
    )
    assert dialogue.status_code == 200, dialogue.text
    dialogue_payload = dialogue.json()
    assert dialogue_payload["usedKeywords"], "dialogue should use selected keyword options"
    assert dialogue_payload["evidenceRefs"], "dialogue should preserve source evidence refs"
    assert dialogue_payload["locale"] == "zh-TW", "dialogue should echo selected locale"
    assert dialogue_payload["speechContextMode"] == "meeting_statement", "dialogue should echo selected speech context mode"

    unsupported = client.get("/v1/npc/keyword-options", params={"generalId": "guan-yu"})
    assert unsupported.status_code == 200, unsupported.text
    assert unsupported.json()["categories"] == {}, "unsupported pilot general should return empty keyword categories"

    print("[npc-brain-cocos-flow-smoke] PASS")
    print(
        f"[npc-brain-cocos-flow-smoke] general={selected_general_id} "
        f"context={context_payload['options'][0]['contextKey']} "
        f"selectedKeywords={','.join(selected_keyword_keys)} "
        f"evidenceRefs={len(dialogue_payload['evidenceRefs'])}"
    )


if __name__ == "__main__":
    main()