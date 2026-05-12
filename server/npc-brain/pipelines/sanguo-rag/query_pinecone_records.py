from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from repo_layout import resolve_npc_brain_root, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
SERVER_ROOT = resolve_npc_brain_root(REPO_ROOT)
PIPELINE_ROOT = Path(__file__).resolve().parent
for path in (SERVER_ROOT, PIPELINE_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from app.llm_dialogue_renderer import load_local_env  # noqa: E402
from app.vector_config import load_vector_runtime_config  # noqa: E402
from app.vector_store import load_vector_store  # noqa: E402
from vector_embedding import load_text_embedder  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query Pinecone/Qdrant with an embedded text and print top matches.")
    parser.add_argument("--namespace", default="facts", help="logical namespace selector: facts / keywords / persona; or an explicit namespace")
    parser.add_argument("--query-text", required=True, help="text to embed and search with")
    parser.add_argument("--embedding-provider", default=None, help="override NPC_EMBEDDING_PROVIDER (e.g. sentence_transformers or mock)")
    parser.add_argument("--embedding-model", default=None, help="override NPC_EMBEDDING_MODEL")
    parser.add_argument("--provider", default="pinecone", help="vector backend to query (pinecone / qdrant)")
    parser.add_argument("--top-k", type=int, default=5, help="number of matches to return")
    parser.add_argument("--metadata-filter", default=None, help="optional JSON object filter passed to the vector backend")
    parser.add_argument("--expected-id", default=None, help="optional record id that must appear in the returned matches")
    return parser.parse_args()


def resolve_namespace(selector: str, config) -> str:
    raw = (selector or "").strip()
    normalized = raw.lower()
    if normalized == "facts":
        return config.namespace_facts
    if normalized == "keywords":
        return config.namespace_keywords
    if normalized == "persona":
        return config.namespace_persona
    return raw


def main() -> None:
    args = parse_args()
    load_local_env(REPO_ROOT)
    config = load_vector_runtime_config()

    namespace = resolve_namespace(args.namespace, config)
    embedding_provider = args.embedding_provider or config.embedding_provider
    embedding_model = args.embedding_model or config.embedding_model
    embedder = load_text_embedder(embedding_provider, embedding_model, config.dimension)
    vector = embedder.embed_texts([args.query_text])[0]

    metadata_filter = json.loads(args.metadata_filter) if args.metadata_filter else None
    adapter = load_vector_store(args.provider, config=config)
    matches = adapter.query(namespace, vector, top_k=args.top_k, metadata_filter=metadata_filter)

    if args.expected_id and not any(match.id == args.expected_id for match in matches):
        raise SystemExit(f"Expected id {args.expected_id!r} not found in top-{args.top_k} matches.")

    payload = {
        "query": {
            "provider": args.provider,
            "namespace": namespace,
            "embeddingProvider": embedding_provider,
            "embeddingModel": embedding_model,
            "topK": args.top_k,
            "queryText": args.query_text,
        },
        "matches": [
            {
                "id": match.id,
                "score": match.score,
                "text": match.text,
                "metadata": match.metadata,
            }
            for match in matches
        ],
    }
    print(json.dumps(payload, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
