from __future__ import annotations

import os
import json

from .npc_dialogue_service import DialogueRequest, NpcDialogueService


def main() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "deterministic"
    service = NpcDialogueService()
    contexts = service.get_context_options("zhang-fei")
    keywords = service.get_keyword_options("zhang-fei")
    persona = service.get_persona_card("zhang-fei")
    selected_keyword_keys = [
        option.keywordKey
        for category in ["person", "item", "event"]
        for option in (keywords.categories.get(category) or [])[:1]
    ]
    response = service.build_dialogue(
        DialogueRequest(
            generalId="zhang-fei",
            contextKey=contexts.options[0].contextKey if contexts.options else None,
            selectedKeywordKeys=selected_keyword_keys + ["unknown-key"],
            locale="zh-TW",
            speechContextMode="inner_monologue",
            llmModelPreset="fallback_chain",
            maxChars=90,
        )
    )

    assert contexts.options, "context options should not be empty"
    assert keywords.categories.get("person"), "person keyword options should not be empty"
    assert persona is not None, "zhang-fei persona card should be available before LLM integration"
    assert response.evidenceRefs, "dialogue response should include evidence refs"
    assert response.usedEvidenceRefs, "dialogue response should resolve evidence refs"
    assert response.generationMode.endswith("persona-card"), "dialogue response should report persona-card mode"
    assert response.locale == "zh-TW", "dialogue response should echo locale"
    assert response.speechContextMode == "inner_monologue", "dialogue response should echo speech context mode"
    assert response.llmModelPreset == "fallback_chain", "dialogue response should echo model preset"
    assert response.rejectedKeywordKeys == ["unknown-key"], "unknown keyword should be rejected explicitly"
    assert "關某" not in persona.safeFallbackLine, "zhang-fei fallback line must not use guan-yu self-name"
    print("[npc-brain-smoke] PASS")
    print(f"[npc-brain-smoke] contexts={len(contexts.options)} categories={len(keywords.categories)} evidenceRefs={len(response.evidenceRefs)}")
    print("[npc-brain-smoke] text=" + json.dumps(response.text, ensure_ascii=True))


if __name__ == "__main__":
    main()
