from __future__ import annotations

import os

from .npc_dialogue_service import DialogueRequest, NpcDialogueService


def main() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "deterministic"
    service = NpcDialogueService()
    keywords = service.get_keyword_options("cao-cao", categories=["person"], limit_per_category=3)
    keyword_keys = [option.keywordKey for option in keywords.categories.get("person", [])[:3]]
    contexts = service.get_context_options("cao-cao", limit=1)
    context_key = contexts.options[0].contextKey if contexts.options else None

    response = service.build_dialogue(
        DialogueRequest(
            generalId="cao-cao",
            contextKey=context_key,
            selectedKeywordKeys=keyword_keys,
            locale="zh-TW",
            speechContextMode="life_chat",
            llmModelPreset="fallback_chain",
            maxChars=90,
        )
    )

    joined_trace = " > ".join(response.resolutionTrace)
    assert response.usedEvidenceRefs, "vector second smoke should resolve at least one evidence ref"
    assert "exact-ref-fill:" in joined_trace or "vector-second:" in joined_trace, joined_trace
    assert len(response.usedEvidenceRefs) >= 3, response.usedEvidenceRefs

    print("[npc-brain-vector-second-smoke] PASS")
    print(
        "[npc-brain-vector-second-smoke] "
        f"usedEvidenceRefs={len(response.usedEvidenceRefs)} "
        f"unresolvedEvidenceRefs={len(response.unresolvedEvidenceRefs)} "
        f"trace={joined_trace}"
    )


if __name__ == "__main__":
    main()
