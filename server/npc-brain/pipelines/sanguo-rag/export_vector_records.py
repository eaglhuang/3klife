from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[4]
SERVER_ROOT = Path(__file__).resolve().parents[2]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.llm_dialogue_renderer import load_local_env  # noqa: E402
from app.vector_config import load_vector_runtime_config  # noqa: E402
from app.vector_store import VectorRecord  # noqa: E402


DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_KEYWORD_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/keyword-options")
DEFAULT_PERSONA_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/persona-cards")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/vector-ready")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export vector-ready records for Pinecone/Qdrant from events, keyword packs, and persona cards.")
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="events JSONL path")
    parser.add_argument("--keyword-root", default=str(DEFAULT_KEYWORD_ROOT), help="keyword pack root containing *.keywords.json")
    parser.add_argument("--persona-root", default=str(DEFAULT_PERSONA_ROOT), help="persona root containing *.persona.json")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="output root for vector-ready JSONL files")
    parser.add_argument("--general-id", action="append", default=[], help="explicit general id to include; repeatable")
    parser.add_argument("--include-nonready", action="store_true", help="include events whose reviewStatus is not ready")
    parser.add_argument("--overwrite", action="store_true", help="allow overwriting existing outputs")
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


def ensure_output_root(output_root: Path, overwrite: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [
        output_root / "vector-records.facts.jsonl",
        output_root / "vector-records.keywords.jsonl",
        output_root / "vector-records.persona.jsonl",
        output_root / "vector-records.all.jsonl",
        output_root / "vector-records.index.json",
    ]
    existing = [path for path in outputs if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def iter_files(root: Path, suffix: str) -> Iterable[Path]:
    if not root.exists():
        return []
    return sorted(path for path in root.glob(f"*{suffix}") if path.is_file())


def truncate(text: str | None, max_chars: int = 240) -> str:
    raw = str(text or "").strip()
    if len(raw) <= max_chars:
        return raw
    return raw[: max_chars - 1].rstrip() + "…"


def allowed_general(record_general_ids: list[str], filter_ids: set[str]) -> bool:
    if not filter_ids:
        return True
    return bool(filter_ids.intersection(set(record_general_ids)))


def should_include_event(event: dict[str, Any], include_nonready: bool) -> bool:
    if event.get("eventType") == "alias-smoke":
        return False
    source_refs = [str(ref) for ref in (event.get("sourceRefs") or [])]
    if source_refs and all(ref.startswith("fixture.") for ref in source_refs):
        return False
    if include_nonready:
        return True
    return str(event.get("reviewStatus") or "ready") == "ready"


def build_event_text(event: dict[str, Any]) -> str:
    relationship_labels = []
    for edge in event.get("relationshipEdges") or []:
        relationship_labels.append(f"{edge.get('fromId')} {edge.get('type')} {edge.get('toId')}")
    parts = [
        f"事件鍵：{event.get('eventKey')}",
        f"章回：{event.get('chapterNo')}" if event.get("chapterNo") is not None else None,
        f"地點：{event.get('location')}" if event.get("location") else None,
        f"摘要：{truncate(event.get('summary'), 180)}" if event.get("summary") else None,
        f"人物：{'、'.join(event.get('generalIds') or [])}" if event.get("generalIds") else None,
        f"關係：{'；'.join(relationship_labels[:6])}" if relationship_labels else None,
        f"原文：{truncate(event.get('sourceQuote'), 180)}" if event.get("sourceQuote") else None,
    ]
    return "\n".join(part for part in parts if part)


def build_keyword_text(payload: dict[str, Any], category: str, item: dict[str, Any]) -> str:
    parts = [
        f"武將：{payload.get('generalId')}",
        f"關鍵字分類：{category}",
        f"關鍵字：{item.get('label')}",
        f"完整標籤：{truncate(item.get('fullLabel'), 180)}" if item.get("fullLabel") else None,
        f"關聯人物：{'、'.join(item.get('generalIds') or [])}" if item.get("generalIds") else None,
    ]
    return "\n".join(part for part in parts if part)


def build_persona_text(persona: dict[str, Any]) -> str:
    relationships = []
    for anchor in persona.get("relationshipAnchors") or []:
        relationships.append(f"{anchor.get('type')}:{anchor.get('targetId')}")
    keywords = [str(anchor.get("label") or anchor.get("keywordKey")) for anchor in (persona.get("keywordAnchors") or [])[:10]]
    parts = [
        f"武將：{persona.get('displayName') or persona.get('generalId')}",
        f"陣營：{persona.get('faction')}" if persona.get("faction") else None,
        f"語氣：{'、'.join(persona.get('voiceStyle') or [])}" if persona.get("voiceStyle") else None,
        f"人格：{'、'.join(persona.get('personalityTraits') or [])}" if persona.get("personalityTraits") else None,
        f"關係錨點：{'；'.join(relationships[:12])}" if relationships else None,
        f"關鍵字錨點：{'、'.join(keywords)}" if keywords else None,
        f"安全回退：{truncate(persona.get('safeFallbackLine'), 120)}" if persona.get("safeFallbackLine") else None,
    ]
    return "\n".join(part for part in parts if part)


def export_event_records(events: list[dict[str, Any]], filter_ids: set[str], include_nonready: bool, namespace: str) -> list[VectorRecord]:
    records: list[VectorRecord] = []
    for event in events:
        general_ids = [str(gid) for gid in (event.get("generalIds") or []) if str(gid).strip()]
        if not general_ids or not allowed_general(general_ids, filter_ids):
            continue
        if not should_include_event(event, include_nonready=include_nonready):
            continue
        source_refs = [str(ref) for ref in (event.get("sourceRefs") or [])]
        records.append(
            VectorRecord(
                id=f"event::{event.get('eventId') or event.get('eventKey')}",
                namespace=namespace,
                text=build_event_text(event),
                metadata={
                    "recordType": "event",
                    "generalIds": general_ids,
                    "eventId": event.get("eventId"),
                    "eventKey": event.get("eventKey"),
                    "chapterNo": event.get("chapterNo"),
                    "sourceType": "romance",
                    "confidence": event.get("confidence"),
                    "reviewStatus": event.get("reviewStatus"),
                    "canonicalWrites": bool(event.get("canonicalWrites")),
                    "sourceRef": source_refs[0] if source_refs else None,
                    "sourceRefs": source_refs,
                    "location": event.get("location"),
                    "eventType": event.get("eventType"),
                    "subtype": event.get("subtype"),
                },
            )
        )
    return records


def export_keyword_records(keyword_root: Path, filter_ids: set[str], namespace: str) -> list[VectorRecord]:
    records: list[VectorRecord] = []
    for path in iter_files(keyword_root, ".keywords.json"):
        payload = read_json(path)
        general_id = str(payload.get("generalId") or "").strip()
        if not general_id or (filter_ids and general_id not in filter_ids):
            continue
        for category, items in (payload.get("categories") or {}).items():
            for item in items or []:
                if item.get("retired"):
                    continue
                source_refs = [str(ref) for ref in (item.get("sourceRefs") or [])]
                record_id = f"keyword::{general_id}::{item.get('keywordKey')}"
                records.append(
                    VectorRecord(
                        id=record_id,
                        namespace=namespace,
                        text=build_keyword_text(payload, str(category), item),
                        metadata={
                            "recordType": "keyword",
                            "generalId": general_id,
                            "generalIds": item.get("generalIds") or [general_id],
                            "keywordKey": item.get("keywordKey"),
                            "category": category,
                            "confidence": item.get("confidence"),
                            "faction": item.get("faction"),
                            "sourceRef": source_refs[0] if source_refs else None,
                            "sourceRefs": source_refs,
                            "keywordVersion": payload.get("keywordVersion"),
                        },
                    )
                )
    return records


def export_persona_records(persona_root: Path, filter_ids: set[str], namespace: str) -> list[VectorRecord]:
    records: list[VectorRecord] = []
    for path in iter_files(persona_root, ".persona.json"):
        payload = read_json(path)
        general_id = str(payload.get("generalId") or "").strip()
        if not general_id or (filter_ids and general_id not in filter_ids):
            continue
        evidence_refs = [str(ref) for ref in (payload.get("evidenceRefs") or [])]
        relationship_targets = [str(anchor.get("targetId")) for anchor in (payload.get("relationshipAnchors") or []) if anchor.get("targetId")]
        relationship_types = [str(anchor.get("type")) for anchor in (payload.get("relationshipAnchors") or []) if anchor.get("type")]
        keyword_anchor_keys = [str(anchor.get("keywordKey")) for anchor in (payload.get("keywordAnchors") or []) if anchor.get("keywordKey")]
        records.append(
            VectorRecord(
                id=f"persona::{general_id}",
                namespace=namespace,
                text=build_persona_text(payload),
                metadata={
                    "recordType": "persona",
                    "generalId": general_id,
                    "displayName": payload.get("displayName") or payload.get("title") or general_id,
                    "personaVersion": payload.get("personaVersion"),
                    "faction": payload.get("faction"),
                    "manualReviewRequired": bool(payload.get("manualReviewRequired")),
                    "relationshipTargetIds": relationship_targets,
                    "relationshipTypes": relationship_types,
                    "keywordAnchorKeys": keyword_anchor_keys,
                    "sourceRef": evidence_refs[0] if evidence_refs else None,
                    "sourceRefs": evidence_refs,
                },
            )
        )
    return records


def write_jsonl(path: Path, records: list[VectorRecord]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record.to_payload(), ensure_ascii=False) + "\n")


def main() -> None:
    args = parse_args()
    load_local_env(REPO_ROOT)
    config = load_vector_runtime_config()
    events_path = resolve_path(args.events)
    keyword_root = resolve_path(args.keyword_root)
    persona_root = resolve_path(args.persona_root)
    output_root = resolve_path(args.output_root)
    ensure_output_root(output_root, overwrite=args.overwrite)

    filter_ids = {str(gid).strip() for gid in args.general_id if str(gid).strip()}
    events = read_jsonl(events_path)

    facts_records = export_event_records(events, filter_ids, include_nonready=args.include_nonready, namespace=config.namespace_facts)
    keyword_records = export_keyword_records(keyword_root, filter_ids, namespace=config.namespace_keywords)
    persona_records = export_persona_records(persona_root, filter_ids, namespace=config.namespace_persona)
    all_records = [*facts_records, *keyword_records, *persona_records]

    facts_path = output_root / "vector-records.facts.jsonl"
    keywords_path = output_root / "vector-records.keywords.jsonl"
    persona_path = output_root / "vector-records.persona.jsonl"
    all_path = output_root / "vector-records.all.jsonl"
    index_path = output_root / "vector-records.index.json"

    write_jsonl(facts_path, facts_records)
    write_jsonl(keywords_path, keyword_records)
    write_jsonl(persona_path, persona_records)
    write_jsonl(all_path, all_records)

    by_namespace = Counter(record.namespace for record in all_records)
    payload = {
        "version": "1.0.0",
        "generatedAt": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "inputs": {
            "eventsPath": repo_relative(events_path),
            "keywordRoot": repo_relative(keyword_root),
            "personaRoot": repo_relative(persona_root),
            "generalIds": sorted(filter_ids),
            "includeNonready": bool(args.include_nonready),
        },
        "outputs": {
            "factsPath": repo_relative(facts_path),
            "keywordsPath": repo_relative(keywords_path),
            "personaPath": repo_relative(persona_path),
            "allPath": repo_relative(all_path),
        },
        "counts": {
            "facts": len(facts_records),
            "keywords": len(keyword_records),
            "persona": len(persona_records),
            "all": len(all_records),
            "byNamespace": dict(by_namespace),
        },
        "logicalNamespaces": {
            "facts": config.namespace_facts,
            "keywords": config.namespace_keywords,
            "persona": config.namespace_persona,
        },
    }
    index_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"[export_vector_records] wrote {output_root}")
    print(
        f"[export_vector_records] facts={len(facts_records)} keywords={len(keyword_records)} "
        f"persona={len(persona_records)} all={len(all_records)}"
    )


if __name__ == "__main__":
    main()