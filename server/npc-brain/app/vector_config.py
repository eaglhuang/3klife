from __future__ import annotations

import os
from dataclasses import dataclass


DEFAULT_PROVIDER_ORDER = ["pinecone", "qdrant", "sqlite_vec"]
DEFAULT_DEFAULT_PROVIDER = "pinecone"
DEFAULT_DIMENSION = 1024
DEFAULT_EMBEDDING_PROVIDER = "sentence_transformers"
DEFAULT_EMBEDDING_MODEL = "BAAI/bge-m3"
DEFAULT_NAMESPACE_FACTS = "romance_facts_v1"
DEFAULT_NAMESPACE_KEYWORDS = "general_keywords_v1"
DEFAULT_NAMESPACE_PERSONA = "general_persona_v2"
DEFAULT_PINECONE_INDEX = "sanguo-npc-brain-dev"
DEFAULT_PINECONE_CLOUD = "aws"
DEFAULT_PINECONE_REGION = "us-east-1"
DEFAULT_PINECONE_METRIC = "cosine"
DEFAULT_QDRANT_URL = "http://127.0.0.1:6333"
DEFAULT_SQLITE_VEC_DB_PATH = "save/npc_memory.db"


def _csv_env(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name)
    if not raw:
        return list(default)
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values or list(default)


@dataclass(slots=True)
class VectorRuntimeConfig:
    provider_order: list[str]
    default_provider: str
    dimension: int
    embedding_provider: str
    embedding_model: str
    namespace_facts: str
    namespace_keywords: str
    namespace_persona: str
    pinecone_index: str
    pinecone_cloud: str
    pinecone_region: str
    pinecone_metric: str
    pinecone_api_key_configured: bool
    qdrant_url: str
    qdrant_api_key_configured: bool
    qdrant_collection_facts: str
    qdrant_collection_keywords: str
    qdrant_collection_persona: str
    sqlite_vec_db_path: str

    def as_health(self) -> dict:
        return {
            "providerOrder": self.provider_order,
            "defaultProvider": self.default_provider,
            "dimension": self.dimension,
            "embedding": {
                "provider": self.embedding_provider,
                "model": self.embedding_model,
            },
            "logicalNamespaces": {
                "facts": self.namespace_facts,
                "keywords": self.namespace_keywords,
                "persona": self.namespace_persona,
            },
            "pinecone": {
                "enabled": "pinecone" in self.provider_order,
                "configured": self.pinecone_api_key_configured,
                "index": self.pinecone_index,
                "cloud": self.pinecone_cloud,
                "region": self.pinecone_region,
                "metric": self.pinecone_metric,
            },
            "qdrant": {
                "enabled": "qdrant" in self.provider_order,
                "configured": bool(self.qdrant_url),
                "apiKeyConfigured": self.qdrant_api_key_configured,
                "url": self.qdrant_url,
                "collections": {
                    "facts": self.qdrant_collection_facts,
                    "keywords": self.qdrant_collection_keywords,
                    "persona": self.qdrant_collection_persona,
                },
            },
            "sqliteVec": {
                "enabled": "sqlite_vec" in self.provider_order,
                "dbPath": self.sqlite_vec_db_path,
            },
        }


def load_vector_runtime_config() -> VectorRuntimeConfig:
    provider_order = _csv_env("NPC_VECTOR_PROVIDER_ORDER", DEFAULT_PROVIDER_ORDER)
    default_provider = os.environ.get("NPC_VECTOR_DEFAULT_PROVIDER") or (provider_order[0] if provider_order else DEFAULT_DEFAULT_PROVIDER)
    return VectorRuntimeConfig(
        provider_order=provider_order,
        default_provider=default_provider,
        dimension=int(os.environ.get("NPC_VECTOR_DIMENSION") or DEFAULT_DIMENSION),
        embedding_provider=os.environ.get("NPC_EMBEDDING_PROVIDER") or DEFAULT_EMBEDDING_PROVIDER,
        embedding_model=os.environ.get("NPC_EMBEDDING_MODEL") or DEFAULT_EMBEDDING_MODEL,
        namespace_facts=os.environ.get("NPC_VECTOR_NAMESPACE_FACTS") or DEFAULT_NAMESPACE_FACTS,
        namespace_keywords=os.environ.get("NPC_VECTOR_NAMESPACE_KEYWORDS") or DEFAULT_NAMESPACE_KEYWORDS,
        namespace_persona=os.environ.get("NPC_VECTOR_NAMESPACE_PERSONA") or DEFAULT_NAMESPACE_PERSONA,
        pinecone_index=os.environ.get("NPC_PINECONE_INDEX") or DEFAULT_PINECONE_INDEX,
        pinecone_cloud=os.environ.get("NPC_PINECONE_CLOUD") or DEFAULT_PINECONE_CLOUD,
        pinecone_region=os.environ.get("NPC_PINECONE_REGION") or DEFAULT_PINECONE_REGION,
        pinecone_metric=os.environ.get("NPC_PINECONE_METRIC") or DEFAULT_PINECONE_METRIC,
        pinecone_api_key_configured=bool(os.environ.get("PINECONE_API_KEY")),
        qdrant_url=os.environ.get("NPC_QDRANT_URL") or DEFAULT_QDRANT_URL,
        qdrant_api_key_configured=bool(os.environ.get("NPC_QDRANT_API_KEY")),
        qdrant_collection_facts=os.environ.get("NPC_QDRANT_COLLECTION_FACTS") or DEFAULT_NAMESPACE_FACTS,
        qdrant_collection_keywords=os.environ.get("NPC_QDRANT_COLLECTION_KEYWORDS") or DEFAULT_NAMESPACE_KEYWORDS,
        qdrant_collection_persona=os.environ.get("NPC_QDRANT_COLLECTION_PERSONA") or DEFAULT_NAMESPACE_PERSONA,
        sqlite_vec_db_path=os.environ.get("NPC_SQLITE_VEC_DB_PATH") or DEFAULT_SQLITE_VEC_DB_PATH,
    )