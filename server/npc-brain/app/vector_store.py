from __future__ import annotations

import math
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Sequence

from .vector_config import VectorRuntimeConfig, load_vector_runtime_config


@dataclass(slots=True)
class VectorRecord:
    id: str
    namespace: str
    text: str
    metadata: dict[str, Any]
    values: list[float] | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "VectorRecord":
        return cls(
            id=str(payload.get("id") or ""),
            namespace=str(payload.get("namespace") or ""),
            text=str(payload.get("text") or ""),
            metadata=dict(payload.get("metadata") or {}),
            values=list(payload.get("values") or []) or None,
        )

    def to_payload(self) -> dict[str, Any]:
        payload = {
            "id": self.id,
            "namespace": self.namespace,
            "text": self.text,
            "metadata": _clean_metadata(self.metadata),
        }
        if self.values is not None:
            payload["values"] = self.values
        return payload


@dataclass(slots=True)
class VectorMatch:
    id: str
    score: float | None
    metadata: dict[str, Any]
    text: str | None = None


def _clean_metadata(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            cleaned_item = _clean_metadata(item)
            if cleaned_item is not None:
                cleaned[str(key)] = cleaned_item
        return cleaned
    if isinstance(value, list):
        cleaned_list = []
        for item in value:
            cleaned_item = _clean_metadata(item)
            if cleaned_item is not None:
                cleaned_list.append(cleaned_item)
        return cleaned_list
    if isinstance(value, tuple):
        cleaned_list = []
        for item in value:
            cleaned_item = _clean_metadata(item)
            if cleaned_item is not None:
                cleaned_list.append(cleaned_item)
        return cleaned_list
    return value


class VectorStoreAdapter(ABC):
    provider_name: str

    def __init__(self, config: VectorRuntimeConfig) -> None:
        self.config = config

    @abstractmethod
    def ensure_backend(self, recreate: bool = False) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def ensure_namespace(self, namespace: str, recreate: bool = False) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def upsert(self, namespace: str, records: Sequence[VectorRecord], batch_size: int = 100) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def query(
        self,
        namespace: str,
        vector: Sequence[float],
        top_k: int = 10,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[VectorMatch]:
        raise NotImplementedError

    @abstractmethod
    def describe(self) -> dict[str, Any]:
        raise NotImplementedError


class SQLiteVecStubAdapter(VectorStoreAdapter):
    provider_name = "sqlite_vec"

    def ensure_backend(self, recreate: bool = False) -> dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": "stub",
            "dbPath": self.config.sqlite_vec_db_path,
            "recreate": recreate,
        }

    def ensure_namespace(self, namespace: str, recreate: bool = False) -> dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": "stub",
            "namespace": namespace,
            "recreate": recreate,
        }

    def upsert(self, namespace: str, records: Sequence[VectorRecord], batch_size: int = 100) -> dict[str, Any]:
        raise NotImplementedError("sqlite_vec adapter is reserved for local degrade cache and is not implemented yet")

    def query(
        self,
        namespace: str,
        vector: Sequence[float],
        top_k: int = 10,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[VectorMatch]:
        raise NotImplementedError("sqlite_vec adapter is reserved for local degrade cache and is not implemented yet")

    def describe(self) -> dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": "stub",
            "dbPath": self.config.sqlite_vec_db_path,
        }


class PineconeVectorStore(VectorStoreAdapter):
    provider_name = "pinecone"

    def __init__(self, config: VectorRuntimeConfig) -> None:
        super().__init__(config)
        try:
            from pinecone import Pinecone, ServerlessSpec
        except ModuleNotFoundError as exc:  # pragma: no cover - import guard
            raise RuntimeError("pinecone package is not installed. Install it via requirements.txt first.") from exc

        if not config.pinecone_api_key_configured:
            raise RuntimeError("PINECONE_API_KEY is not configured.")

        self._ServerlessSpec = ServerlessSpec
        self.client = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
        self.index_name = self.config.pinecone_index

    def _list_index_names(self) -> list[str]:
        raw = self.client.list_indexes()
        if hasattr(raw, "names"):
            try:
                return list(raw.names())
            except TypeError:
                pass
        if hasattr(raw, "indexes"):
            indexes = getattr(raw, "indexes") or []
            names: list[str] = []
            for item in indexes:
                names.append(getattr(item, "name", None) or item.get("name"))
            return [name for name in names if name]
        names = []
        for item in raw if isinstance(raw, list) else []:
            names.append(getattr(item, "name", None) or item.get("name"))
        return [name for name in names if name]

    def _index(self):
        return self.client.Index(self.index_name)

    def ensure_backend(self, recreate: bool = False) -> dict[str, Any]:
        existing = set(self._list_index_names())
        if recreate and self.index_name in existing:
            self.client.delete_index(self.index_name)
            existing.remove(self.index_name)
        created = False
        if self.index_name not in existing:
            self.client.create_index(
                name=self.index_name,
                dimension=self.config.dimension,
                metric=self.config.pinecone_metric,
                spec=self._ServerlessSpec(cloud=self.config.pinecone_cloud, region=self.config.pinecone_region),
            )
            created = True
        return {
            "provider": self.provider_name,
            "index": self.index_name,
            "created": created,
            "dimension": self.config.dimension,
            "metric": self.config.pinecone_metric,
        }

    def ensure_namespace(self, namespace: str, recreate: bool = False) -> dict[str, Any]:
        self.ensure_backend(recreate=recreate)
        return {
            "provider": self.provider_name,
            "index": self.index_name,
            "namespace": namespace,
            "ready": True,
        }

    def upsert(self, namespace: str, records: Sequence[VectorRecord], batch_size: int = 100) -> dict[str, Any]:
        index = self._index()
        total = 0
        for start in range(0, len(records), max(batch_size, 1)):
            batch = records[start : start + max(batch_size, 1)]
            vectors = []
            for record in batch:
                if record.values is None:
                    raise ValueError(f"record {record.id} is missing values for upsert")
                metadata = dict(_clean_metadata(record.metadata) or {})
                metadata.setdefault("text", record.text)
                metadata.setdefault("namespace", record.namespace)
                vectors.append({"id": record.id, "values": record.values, "metadata": metadata})
            index.upsert(vectors=vectors, namespace=namespace)
            total += len(vectors)
        return {
            "provider": self.provider_name,
            "index": self.index_name,
            "namespace": namespace,
            "upserted": total,
        }

    def query(
        self,
        namespace: str,
        vector: Sequence[float],
        top_k: int = 10,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[VectorMatch]:
        index = self._index()
        response = index.query(
            vector=list(vector),
            top_k=top_k,
            namespace=namespace,
            filter=metadata_filter,
            include_metadata=True,
        )
        matches = []
        for item in getattr(response, "matches", None) or response.get("matches") or []:
            metadata = getattr(item, "metadata", None) or item.get("metadata") or {}
            matches.append(
                VectorMatch(
                    id=getattr(item, "id", None) or item.get("id"),
                    score=getattr(item, "score", None) or item.get("score"),
                    metadata=metadata,
                    text=metadata.get("text"),
                )
            )
        return matches

    def describe(self) -> dict[str, Any]:
        existing = set(self._list_index_names())
        return {
            "provider": self.provider_name,
            "index": self.index_name,
            "exists": self.index_name in existing,
        }


class QdrantVectorStore(VectorStoreAdapter):
    provider_name = "qdrant"

    def __init__(self, config: VectorRuntimeConfig) -> None:
        super().__init__(config)
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import Distance, FieldCondition, Filter, MatchAny, MatchValue, PointStruct, VectorParams
        except ModuleNotFoundError as exc:  # pragma: no cover - import guard
            raise RuntimeError("qdrant-client package is not installed. Install it via requirements.txt first.") from exc

        self._Distance = Distance
        self._FieldCondition = FieldCondition
        self._Filter = Filter
        self._MatchAny = MatchAny
        self._MatchValue = MatchValue
        self._PointStruct = PointStruct
        self._VectorParams = VectorParams
        self.client = QdrantClient(url=self.config.qdrant_url, api_key=(os.environ.get("NPC_QDRANT_API_KEY") or None))

    def _collection_name(self, namespace: str) -> str:
        mapping = {
            self.config.namespace_facts: self.config.qdrant_collection_facts,
            self.config.namespace_keywords: self.config.qdrant_collection_keywords,
            self.config.namespace_persona: self.config.qdrant_collection_persona,
        }
        return mapping.get(namespace) or namespace.replace("/", "_")

    def _distance(self):
        metric = (self.config.pinecone_metric or "cosine").lower()
        if metric == "dotproduct":
            return self._Distance.DOT
        if metric == "euclidean":
            return self._Distance.EUCLID
        return self._Distance.COSINE

    def _build_filter(self, metadata_filter: dict[str, Any] | None):
        if not metadata_filter:
            return None
        conditions = []
        for key, value in metadata_filter.items():
            if isinstance(value, dict) and "$in" in value:
                conditions.append(self._FieldCondition(key=key, match=self._MatchAny(any=list(value.get("$in") or []))))
            else:
                conditions.append(self._FieldCondition(key=key, match=self._MatchValue(value=value)))
        return self._Filter(must=conditions)

    def _coerce_point_id(self, raw_id: str) -> int | str:
        text = str(raw_id or "").strip()
        if text.isdigit():
            return int(text)
        try:
            uuid.UUID(text)
            return text
        except ValueError:
            return str(uuid.uuid5(uuid.NAMESPACE_URL, f"3klife-vector:{text}"))

    def ensure_backend(self, recreate: bool = False) -> dict[str, Any]:
        results = []
        for namespace in [self.config.namespace_facts, self.config.namespace_keywords, self.config.namespace_persona]:
            results.append(self.ensure_namespace(namespace, recreate=recreate))
        return {
            "provider": self.provider_name,
            "collections": results,
        }

    def ensure_namespace(self, namespace: str, recreate: bool = False) -> dict[str, Any]:
        collection_name = self._collection_name(namespace)
        exists = self.client.collection_exists(collection_name)
        if recreate and exists:
            self.client.delete_collection(collection_name)
            exists = False
        created = False
        if not exists:
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=self._VectorParams(size=self.config.dimension, distance=self._distance()),
            )
            created = True
        return {
            "provider": self.provider_name,
            "namespace": namespace,
            "collection": collection_name,
            "created": created,
        }

    def upsert(self, namespace: str, records: Sequence[VectorRecord], batch_size: int = 100) -> dict[str, Any]:
        collection_name = self._collection_name(namespace)
        self.ensure_namespace(namespace)
        total = 0
        for start in range(0, len(records), max(batch_size, 1)):
            batch = records[start : start + max(batch_size, 1)]
            points = []
            for record in batch:
                if record.values is None:
                    raise ValueError(f"record {record.id} is missing values for upsert")
                payload = dict(_clean_metadata(record.metadata) or {})
                payload.setdefault("text", record.text)
                payload.setdefault("namespace", record.namespace)
                payload.setdefault("recordId", record.id)
                points.append(self._PointStruct(id=self._coerce_point_id(record.id), vector=record.values, payload=payload))
            self.client.upsert(collection_name=collection_name, points=points)
            total += len(points)
        return {
            "provider": self.provider_name,
            "collection": collection_name,
            "namespace": namespace,
            "upserted": total,
        }

    def query(
        self,
        namespace: str,
        vector: Sequence[float],
        top_k: int = 10,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[VectorMatch]:
        collection_name = self._collection_name(namespace)
        query_filter = self._build_filter(metadata_filter)
        if hasattr(self.client, "search"):
            hits = self.client.search(
                collection_name=collection_name,
                query_vector=list(vector),
                limit=top_k,
                query_filter=query_filter,
                with_payload=True,
            )
        elif hasattr(self.client, "query_points"):
            response = self.client.query_points(
                collection_name=collection_name,
                query=list(vector),
                limit=top_k,
                query_filter=query_filter,
                with_payload=True,
            )
            hits = list(getattr(response, "points", []) or [])
        else:
            raise RuntimeError("Qdrant client does not expose search/query_points API.")
        return [
            VectorMatch(
                id=str((hit.payload or {}).get("recordId") or hit.id),
                score=float(hit.score) if hit.score is not None else None,
                metadata=dict(hit.payload or {}),
                text=(hit.payload or {}).get("text"),
            )
            for hit in hits
        ]

    def describe(self) -> dict[str, Any]:
        collections = []
        for namespace in [self.config.namespace_facts, self.config.namespace_keywords, self.config.namespace_persona]:
            collection = self._collection_name(namespace)
            collections.append(
                {
                    "namespace": namespace,
                    "collection": collection,
                    "exists": self.client.collection_exists(collection),
                }
            )
        return {
            "provider": self.provider_name,
            "url": self.config.qdrant_url,
            "collections": collections,
        }


def normalize_vector(values: Sequence[float]) -> list[float]:
    norm = math.sqrt(sum(float(v) * float(v) for v in values))
    if norm <= 0:
        return [0.0 for _ in values]
    return [float(v) / norm for v in values]


def load_vector_store(provider_name: str | None = None, config: VectorRuntimeConfig | None = None) -> VectorStoreAdapter:
    active_config = config or load_vector_runtime_config()
    provider = provider_name or active_config.default_provider
    if provider == "pinecone":
        return PineconeVectorStore(active_config)
    if provider == "qdrant":
        return QdrantVectorStore(active_config)
    if provider == "sqlite_vec":
        return SQLiteVecStubAdapter(active_config)
    raise ValueError(f"Unsupported vector provider: {provider}")
