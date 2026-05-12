from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from repo_layout import resolve_npc_brain_root, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
SERVER_ROOT = resolve_npc_brain_root(REPO_ROOT)
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.llm_dialogue_renderer import load_local_env  # noqa: E402
from app.vector_config import load_vector_runtime_config  # noqa: E402
from app.vector_store import load_vector_store  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or validate the Pinecone index used by NPC brain vector retrieval.")
    parser.add_argument("--recreate", action="store_true", help="delete and recreate the Pinecone index if it already exists")
    parser.add_argument("--dry-run", action="store_true", help="print the intended Pinecone config without creating anything")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_local_env(REPO_ROOT)
    config = load_vector_runtime_config()

    payload = {
        "provider": "pinecone",
        "index": config.pinecone_index,
        "dimension": config.dimension,
        "metric": config.pinecone_metric,
        "cloud": config.pinecone_cloud,
        "region": config.pinecone_region,
        "logicalNamespaces": {
            "facts": config.namespace_facts,
            "keywords": config.namespace_keywords,
            "persona": config.namespace_persona,
        },
        "configured": config.pinecone_api_key_configured,
        "recreate": bool(args.recreate),
    }

    if args.dry_run:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    adapter = load_vector_store("pinecone", config=config)
    result = adapter.ensure_backend(recreate=args.recreate)
    print(json.dumps({"config": payload, "result": result}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
