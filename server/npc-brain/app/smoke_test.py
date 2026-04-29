from __future__ import annotations

import os

from .npc_dialogue_service import DialogueRequest, NpcDialogueService


def main() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "deterministic"
    service = NpcDialogueService()
    contexts = service.get_context_options("zhang-fei")
    keywords = service.get_keyword_options("zhang-fei")
    persona = service.get_persona_card("zhang-fei")
    response = service.build_dialogue(
        DialogueRequest(
            generalId="zhang-fei",
            contextKey="changban-bridge",
            selectedKeywordKeys=["cao-cao", "serpent-spear", "changban-bridge", "unknown-key"],
            locale="zh-TW",
            speechContextMode="inner_monologue",
            maxChars=90,
        )
    )

    assert contexts.options, "context options should not be empty"
    assert keywords.categories.get("person"), "person keyword options should not be empty"
    assert persona is not None, "zhang-fei persona card should be available before LLM integration"
    assert response.evidenceRefs, "dialogue response should include evidence refs"
    assert response.generationMode.endswith("persona-card"), "dialogue response should report persona-card mode"
    assert response.locale == "zh-TW", "dialogue response should echo locale"
    assert response.speechContextMode == "inner_monologue", "dialogue response should echo speech context mode"
    assert response.rejectedKeywordKeys == ["unknown-key"], "unknown keyword should be rejected explicitly"
    print("[npc-brain-smoke] PASS")
    print(f"[npc-brain-smoke] contexts={len(contexts.options)} categories={len(keywords.categories)} evidenceRefs={len(response.evidenceRefs)}")
    print(f"[npc-brain-smoke] text={response.text}")


if __name__ == "__main__":
    main()