from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[4]
SERVER_ROOT = Path(__file__).resolve().parents[2]
PIPELINE_ROOT = Path(__file__).resolve().parent
for path in (SERVER_ROOT, PIPELINE_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from app.llm_dialogue_renderer import load_local_env  # noqa: E402
from app.vector_config import load_vector_runtime_config  # noqa: E402
from app.vector_store import VectorRecord, load_vector_store  # noqa: E402
from vector_embedding import load_text_embedder  # noqa: E402


DEFAULT_RECORDS_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/vector-ready")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Embed vector-ready records and upsert them into Pinecone namespaces.")
    parser.add_argument("--records-root", default=str(DEFAULT_RECORDS_ROOT), help="root containing vector-records.*.jsonl")
    parser.add_argument(
        "--namespace",
        action="append",
        default=[],
        help="logical namespace selector: facts / keywords / persona; repeatable. Omit to upsert all.",
    )
    parser.add_argument("--embedding-provider", default=None, help="override NPC_EMBEDDING_PROVIDER (e.g. sentence_transformers or mock)")
    parser.add_argument("--embedding-model", default=None, help="override NPC_EMBEDDING_MODEL")
    parser.add_argument("--batch-size", type=int, default=32, help="embedding/upsert batch size")
    parser.add_argument("--limit", type=int, default=0, help="optional max record count per selected namespace for smoke tests")
    parser.add_argument("--dry-run", action="store_true", help="read and embed records but do not call Pinecone upsert")
    return parser.parse_args()


def resolve_path(path_text: str | Path) -> Path:
    raw = Path(path_text)
    if raw.is_absolute():
        return raw.resolve()
    return (REPO_ROOT / raw).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def selected_files(records_root: Path, selectors: list[str]) -> dict[str, Path]:
    mapping = {
        "facts": records_root / "vector-records.facts.jsonl",
        "keywords": records_root / "vector-records.keywords.jsonl",
        "persona": records_root / "vector-records.persona.jsonl",
    }
    if not selectors:
        return mapping
    normalized = {selector.strip().lower() for selector in selectors if selector.strip()}
    return {key: path for key, path in mapping.items() if key in normalized}


def read_records(path: Path) -> list[VectorRecord]:
    rows: list[VectorRecord] = []
    if not path.exists():
        return rows
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rows.append(VectorRecord.from_payload(json.loads(line)))
    return rows


def main() -> None:
    args = parse_args()
    load_local_env(REPO_ROOT)
    config = load_vector_runtime_config()

    records_root = resolve_path(args.records_root)
    file_map = selected_files(records_root, args.namespace)
    if not file_map:
        raise SystemExit("No namespace files selected. Use --namespace facts/keywords/persona or omit it.")

    embedding_provider = args.embedding_provider or config.embedding_provider
    embedding_model = args.embedding_model or config.embedding_model
    embedder = load_text_embedder(embedding_provider, embedding_model, config.dimension)

    grouped_records: dict[str, list[VectorRecord]] = defaultdict(list)
    input_counts: dict[str, int] = {}
    for label, path in file_map.items():
        rows = read_records(path)
        if args.limit > 0:
            rows = rows[: args.limit]
        input_counts[label] = len(rows)
        for row in rows:
            grouped_records[row.namespace].append(row)

    summary = {
        "recordsRoot": repo_relative(records_root),
        "embeddingProvider": embedding_provider,
        "embeddingModel": embedding_model,
        "batchSize": args.batch_size,
        "selectedNamespaces": list(file_map.keys()),
        "inputCounts": input_counts,
        "dryRun": bool(args.dry_run),
    }

    upsert_results = []
    adapter = None if args.dry_run else load_vector_store("pinecone", config=config)
    if adapter is not None:
        adapter.ensure_backend(recreate=False)

    for namespace, records in grouped_records.items():
        for start in range(0, len(records), max(args.batch_size, 1)):
            batch = records[start : start + max(args.batch_size, 1)]
            embeddings = embedder.embed_texts([record.text for record in batch])
            for record, values in zip(batch, embeddings, strict=True):
                record.values = values
        if args.dry_run:
            upsert_results.append({
                "namespace": namespace,
                "recordCount": len(records),
                "status": "embedded-only",
            })
            continue
        upsert_results.append(adapter.upsert(namespace, records, batch_size=args.batch_size))

    print(json.dumps({"summary": summary, "results": upsert_results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()