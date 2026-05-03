from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from typing import Sequence


class TextEmbedder(ABC):
    provider_name: str

    def __init__(self, model_name: str, dimension: int) -> None:
        self.model_name = model_name
        self.dimension = max(int(dimension), 1)

    @abstractmethod
    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        raise NotImplementedError


class MockHashTextEmbedder(TextEmbedder):
    provider_name = "mock"

    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        return [_hash_vector(text, self.dimension) for text in texts]


class SentenceTransformersTextEmbedder(TextEmbedder):
    provider_name = "sentence_transformers"

    def __init__(self, model_name: str, dimension: int) -> None:
        super().__init__(model_name=model_name, dimension=dimension)
        try:
            from sentence_transformers import SentenceTransformer
        except ModuleNotFoundError as exc:  # pragma: no cover - import guard
            raise RuntimeError(
                "sentence-transformers is not installed. Install `sentence-transformers` and a compatible `torch` build, or switch NPC_EMBEDDING_PROVIDER=mock for smoke testing."
            ) from exc
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        embeddings = self.model.encode(list(texts), normalize_embeddings=True)
        rows = embeddings.tolist() if hasattr(embeddings, "tolist") else [list(row) for row in embeddings]
        return [_fit_dimension([float(value) for value in row], self.dimension) for row in rows]


def _fit_dimension(values: Sequence[float], target_dim: int) -> list[float]:
    raw = list(values)
    if len(raw) == target_dim:
        return raw
    if len(raw) > target_dim:
        return raw[:target_dim]
    return raw + [0.0] * (target_dim - len(raw))


def _hash_vector(text: str, dimension: int) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values = []
    cursor = digest
    while len(values) < dimension:
        for byte in cursor:
            centered = (byte / 255.0) * 2.0 - 1.0
            values.append(centered)
            if len(values) >= dimension:
                break
        cursor = hashlib.sha256(cursor + text.encode("utf-8")).digest()
    norm = sum(value * value for value in values) ** 0.5
    if norm <= 0:
        return [0.0 for _ in values]
    return [value / norm for value in values]


def load_text_embedder(provider_name: str, model_name: str, dimension: int) -> TextEmbedder:
    provider = (provider_name or "sentence_transformers").strip().lower()
    if provider == "mock":
        return MockHashTextEmbedder(model_name=model_name or "mock-hash-v1", dimension=dimension)
    if provider == "sentence_transformers":
        return SentenceTransformersTextEmbedder(model_name=model_name, dimension=dimension)
    raise ValueError(f"Unsupported embedding provider: {provider_name}")