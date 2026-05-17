from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from sanguo_governance_loader import SanguoGovernanceError, default_governance_root, load_runtime_batch_keyword_readiness_policy


DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_KEYWORD_PACK_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/keyword-options/zhang-fei.keywords.json")
DEFAULT_PERSONA_CARD_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/persona-cards/zhang-fei.persona.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/api-readiness")
DEFAULT_GOVERNANCE_ROOT = default_governance_root()
DEFAULT_GENERAL_ID = ""
PERSONA_NAMESPACE = ""


def apply_api_readiness_governance(
    governance_root: str | Path | None = None,
    runtime_batch_keyword_policy: str | Path | None = None,
) -> None:
    global DEFAULT_GENERAL_ID, PERSONA_NAMESPACE
    policy = load_runtime_batch_keyword_readiness_policy(
        governance_root,
        runtime_batch_keyword_policy=runtime_batch_keyword_policy,
    )
    api_policy = policy.get("apiReadiness") if isinstance(policy.get("apiReadiness"), dict) else {}
    DEFAULT_GENERAL_ID = str(api_policy.get("defaultGeneralId") or "")
    PERSONA_NAMESPACE = str(api_policy.get("personaNamespace") or "")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build static API readiness fixtures from events and keyword options.")
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="events.jsonl path")
    parser.add_argument("--keyword-pack", default=str(DEFAULT_KEYWORD_PACK_PATH), help="general keyword pack path")
    parser.add_argument("--persona-card", default=str(DEFAULT_PERSONA_CARD_PATH), help="general persona card path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--general-id", default=DEFAULT_GENERAL_ID, help="General id for fixture responses")
    parser.add_argument("--vector-check-report", default="", help="optional vector backend check JSON report path")
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT), help="Sanguo governance root")
    parser.add_argument("--runtime-batch-keyword-policy", default=None, help="Override policy-runtime-batch-keyword-readiness.json path")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_events(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def ensure_output_root(output_root: Path, overwrite: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [
        output_root / "context-options.response.json",
        output_root / "keyword-options.response.json",
        output_root / "dialogue-evidence-probe.json",
        output_root / "persona-card.response.json",
        output_root / "pinecone-metadata-manifest.json",
        output_root / "vector-backend-check.json",
        output_root / "api-readiness-report.md",
    ]
    existing = [path for path in outputs if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def build_context_options(events: list[dict], general_id: str) -> dict:
    options = []
    for event in events:
        if general_id not in (event.get("generalIds") or []):
            continue
        if event.get("eventType") == "alias-smoke":
            continue
        if all(str(ref).startswith("fixture.") for ref in (event.get("sourceRefs") or [])):
            continue
        options.append(
            {
                "contextKey": event.get("eventKey"),
                "label": event.get("location") or event.get("summary") or event.get("eventKey"),
                "sourceType": "romance",
                "confidence": event.get("confidence") or 0,
                "evidenceRefs": event.get("sourceRefs") or [],
            }
        )
    return {"generalId": general_id, "options": options}


def build_keyword_options(keyword_pack: dict) -> dict:
    categories = {}
    for category, items in (keyword_pack.get("categories") or {}).items():
        categories[category] = [
            {
                "keywordKey": item.get("keywordKey"),
                "label": item.get("label"),
                "fullLabel": item.get("fullLabel"),
                "uiLabelMaxChars": item.get("uiLabelMaxChars"),
                "confidence": item.get("confidence"),
                "sourceRefs": item.get("sourceRefs") or [],
            }
            for item in items
            if not item.get("retired")
        ]
    return {"generalId": keyword_pack.get("generalId"), "keywordVersion": keyword_pack.get("keywordVersion"), "categories": categories}


def build_dialogue_probe(context_options: dict, keyword_options: dict) -> dict:
    selected_context = (context_options.get("options") or [{}])[0]
    selected_keywords = []
    for category in ("person", "item", "event"):
        items = ((keyword_options.get("categories") or {}).get(category) or [])[:1]
        selected_keywords.extend(items)
    evidence_refs = sorted(
        {
            ref
            for item in [selected_context] + selected_keywords
            for ref in (item.get("evidenceRefs") or item.get("sourceRefs") or [])
        }
    )
    return {
        "request": {
            "generalId": context_options.get("generalId"),
            "contextKey": selected_context.get("contextKey"),
            "selectedKeywordKeys": [item.get("keywordKey") for item in selected_keywords if item.get("keywordKey")],
            "toneMode": "in-character",
            "locale": "zh-TW",
            "speechContextMode": "life_chat",
            "maxChars": 60,
        },
        "evidenceRefs": evidence_refs,
        "fallbackUsed": False,
        "readiness": "pass" if evidence_refs else "fail",
    }


def build_pinecone_manifest(events: list[dict], keyword_pack: dict, persona_card: dict, general_id: str) -> dict:
    event_records = [event for event in events if general_id in (event.get("generalIds") or [])]
    keyword_records = [item for items in (keyword_pack.get("categories") or {}).values() for item in items]
    return {
        "namespacePlan": {
            "romance_facts_v1": {"records": len(event_records), "requiredMetadata": ["generalIds", "eventKey", "chapterNo", "sourceType", "confidence", "sourceRef"]},
            "general_keywords_v1": {"records": len(keyword_records), "requiredMetadata": ["generalIds", "keywordKey", "category", "confidence", "sourceRef"]},
            PERSONA_NAMESPACE: {
                "records": 1 if persona_card else 0,
                "requiredMetadata": [
                    "generalId",
                    "personaVersion",
                    "faction",
                    "manualReviewRequired",
                    "relationshipAnchors.targetId",
                    "relationshipAnchors.type",
                    "relationshipAnchors.edgeConfidence",
                    "relationshipAnchors.edgeStrength",
                ],
            },
        },
        "filterExamples": [
            {"generalIds": {"$in": [general_id]}, "eventKey": "changban-bridge"},
            {"generalIds": {"$in": [general_id]}, "category": "person"},
        ],
    }


def render_report(context_options: dict, keyword_options: dict, persona_card: dict, dialogue_probe: dict, manifest: dict, vector_check: dict) -> str:
    vector_status = "skipped"
    if vector_check:
        vector_status = str(vector_check.get("status") or "unknown")
    lines = [
        "# API Readiness Report",
        "",
        f"- Generated At: `{utc_now()}`",
        f"- General ID: `{context_options.get('generalId')}`",
        f"- Context Options: `{len(context_options.get('options') or [])}`",
        f"- Persona Card: `{'pass' if persona_card else 'missing'}`",
        f"- Dialogue Evidence Probe: `{dialogue_probe.get('readiness')}`",
        f"- Vector Backend Check: `{vector_status}`",
        "",
        "## Keyword Counts",
        "",
    ]
    for category, items in (keyword_options.get("categories") or {}).items():
        lines.append(f"- `{category}`: `{len(items)}`")
    lines.extend(["", "## Pinecone Namespaces", ""])
    for namespace, info in manifest["namespacePlan"].items():
        lines.append(f"- `{namespace}` records=`{info['records']}` metadata=`{', '.join(info['requiredMetadata'])}`")
    if vector_check:
        lines.extend(["", "## Vector Backend Probe", ""])
        expected_id = vector_check.get("expectedRecordId")
        namespace = vector_check.get("namespace")
        if expected_id:
            lines.append(f"- Expected Record ID: `{expected_id}`")
        if namespace:
            lines.append(f"- Namespace: `{namespace}`")
        providers = vector_check.get("providers") or {}
        for provider_name in sorted(providers.keys()):
            provider = providers.get(provider_name) or {}
            contains = bool(provider.get("containsExpected"))
            match_count = provider.get("matchCount")
            top_ids = provider.get("topIds") or []
            lines.append(
                f"- `{provider_name}` containsExpected=`{contains}` matchCount=`{match_count}` topIds=`{', '.join(str(item) for item in top_ids[:3])}`"
            )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    try:
        apply_api_readiness_governance(args.governance_root, args.runtime_batch_keyword_policy)
    except SanguoGovernanceError as exc:
        print(f"[build_api_readiness_index] governance error: {exc}")
        raise SystemExit(2) from None
    if not args.general_id:
        args.general_id = DEFAULT_GENERAL_ID
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)
    events = load_events(Path(args.events))
    keyword_pack = read_json(Path(args.keyword_pack))
    persona_card = read_json(Path(args.persona_card)) if Path(args.persona_card).exists() else {}
    context_options = build_context_options(events, args.general_id)
    keyword_options = build_keyword_options(keyword_pack)
    dialogue_probe = build_dialogue_probe(context_options, keyword_options)
    manifest = build_pinecone_manifest(events, keyword_pack, persona_card, args.general_id)
    vector_check = {}
    if args.vector_check_report:
        vector_path = Path(args.vector_check_report)
        if vector_path.exists():
            vector_check = read_json(vector_path)

    (output_root / "context-options.response.json").write_text(json.dumps(context_options, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "keyword-options.response.json").write_text(json.dumps(keyword_options, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "dialogue-evidence-probe.json").write_text(json.dumps(dialogue_probe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "persona-card.response.json").write_text(json.dumps(persona_card, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "pinecone-metadata-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if vector_check:
        (output_root / "vector-backend-check.json").write_text(json.dumps(vector_check, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_root / "api-readiness-report.md").write_text(
        render_report(context_options, keyword_options, persona_card, dialogue_probe, manifest, vector_check),
        encoding="utf-8",
    )
    print(f"[build_api_readiness_index] wrote {output_root}")
    print(f"[build_api_readiness_index] contexts={len(context_options['options'])} dialogueProbe={dialogue_probe['readiness']}")
    if dialogue_probe["readiness"] != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
