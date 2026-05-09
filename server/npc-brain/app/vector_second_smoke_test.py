from __future__ import annotations

import os
from typing import Any

from .evidence_resolver import EvidenceResolver
from .npc_dialogue_service import NpcDialogueService
from .vector_second_retriever import VectorSecondRetriever
from .vector_store import VectorMatch


class RecordingEmbedder:
    provider_name = "mock"

    def __init__(self) -> None:
        self.calls: list[str] = []

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        self.calls.extend(texts)
        return [[0.25, 0.5, 0.75] for _ in texts]


class RecordingVectorStore:
    provider_name = "qdrant"

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def query(
        self,
        namespace: str,
        vector: list[float],
        top_k: int = 10,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[VectorMatch]:
        self.calls.append(
            {
                "namespace": namespace,
                "vector": list(vector),
                "top_k": top_k,
                "metadata_filter": metadata_filter,
            }
        )
        return [
            VectorMatch(
                id="event::mock-1",
                score=0.91,
                text="mock event one",
                metadata={
                    "recordType": "event",
                    "generalIds": ["zhang-fei"],
                    "sourceRef": "mock.ref.1",
                    "sourceRefs": ["mock.ref.1", "mock.ref.2"],
                    "sourceType": "romance",
                    "summary": "mock summary one",
                    "sourceQuote": "mock quote one",
                },
            ),
            VectorMatch(
                id="event::mock-2",
                score=0.84,
                text="mock event two",
                metadata={
                    "recordType": "event",
                    "generalIds": ["zhang-fei"],
                    "sourceRef": "mock.ref.3",
                    "sourceRefs": ["mock.ref.3"],
                    "sourceType": "romance",
                    "summary": "mock summary two",
                    "sourceQuote": "mock quote two",
                },
            ),
        ]


def main() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "deterministic"
    service = NpcDialogueService()
    contexts = service.get_context_options("zhang-fei")
    keywords = service.get_keyword_options("zhang-fei", categories=["person", "item", "event"], limit_per_category=1)
    assert contexts.options, "zhang-fei context options should not be empty"
    assert keywords.categories, "zhang-fei keyword options should not be empty"

    selected_context = contexts.options[0]
    selected_keywords = [
        option
        for category in keywords.categories.values()
        for option in category[:1]
    ]
    assert selected_keywords, "vector-second smoke needs at least one keyword"

    fake_store = RecordingVectorStore()
    fake_embedder = RecordingEmbedder()
    retriever = VectorSecondRetriever(
        service.store,
        vector_store=fake_store,
        text_embedder=fake_embedder,
    )
    resolver = EvidenceResolver(service.store)
    resolver.vector_second = retriever

    pack = resolver.resolve(
        general_id="zhang-fei",
        context=selected_context,
        keywords=selected_keywords,
        evidence_refs=["mock.ref.1", "mock.ref.2", "mock.ref.3"],
    )

    assert pack.resolvedEvidence, "backend query should resolve evidence"
    assert not pack.unresolvedEvidenceRefs, pack.unresolvedEvidenceRefs
    assert fake_embedder.calls, "embedder should be called"
    assert "zhang-fei" in fake_embedder.calls[0], fake_embedder.calls[0]
    assert fake_store.calls, "vector backend should be queried"
    assert fake_store.calls[0]["namespace"] == retriever.config.namespace_facts, fake_store.calls[0]
    assert fake_store.calls[0]["metadata_filter"]["recordType"] == "event", fake_store.calls[0]
    assert fake_store.calls[0]["metadata_filter"]["generalIds"]["$in"] == ["zhang-fei"], fake_store.calls[0]
    assert any(trace.startswith("vector-second:qdrant:") for trace in pack.resolutionTrace), pack.resolutionTrace

    print("[npc-brain-vector-second-backend-smoke] PASS")
    print(
        "[npc-brain-vector-second-backend-smoke] "
        f"resolvedEvidence={len(pack.resolvedEvidence)} "
        f"unresolvedEvidenceRefs={len(pack.unresolvedEvidenceRefs)} "
        f"trace={' > '.join(pack.resolutionTrace)}"
    )


if __name__ == "__main__":
    main()
