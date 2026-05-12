from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_SOURCE_EVENT_PACKETS = Path("artifacts/data-pipeline/sanguo-rag/extracted/source-event-packets/source-event-packets.jsonl")
DEFAULT_SOURCE_CONFIG = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/item-relationship-overlay")
PRIMARY_TEXT_SOURCE_CLASSES = {"primary-text-site"}
PRIMARY_TEXT_TRUST_TIERS = {"primary-text", "primary-text-transcription"}
LAYER_PRIMARY_TEXT_CAP_MULTIPLIER = {
    "history": 1.6,
    "romance": 1.35,
}
LAYER_BASE_CONFIDENCE = {
    "history": 0.72,
    "romance": 0.68,
    "encyclopedia": 0.62,
    "worldbuilding": 0.58,
    "folklore": 0.56,
}
LAYER_MAX_CONFIDENCE = {
    "history": 0.80,
    "romance": 0.76,
    "encyclopedia": 0.70,
    "worldbuilding": 0.66,
    "folklore": 0.64,
}
LAYER_SOURCE_EDGE_CAP = {
    "history": 240,
    "romance": 220,
    "encyclopedia": 140,
    "worldbuilding": 100,
    "folklore": 80,
}

ITEM_SPECS = [
    {
        "itemId": "item:red-hare-horse",
        "label": "赤兔馬",
        "category": "mount",
        "relationType": "item_mount",
        "terms": ["赤兔馬", "赤兔"],
        "confidenceBoost": 0.06,
    },
    {
        "itemId": "item:war-horse",
        "label": "戰馬",
        "category": "mount",
        "relationType": "item_mount",
        "terms": ["戰馬", "馬"],
        "confidenceBoost": 0.02,
    },
    {
        "itemId": "item:sword",
        "label": "劍",
        "category": "weapon",
        "relationType": "item_weapon",
        "terms": ["雙股劍", "青釭劍", "倚天劍", "劍"],
        "confidenceBoost": 0.03,
    },
    {
        "itemId": "item:blade",
        "label": "刀",
        "category": "weapon",
        "relationType": "item_weapon",
        "terms": ["青龍偃月刀", "刀"],
        "confidenceBoost": 0.03,
    },
    {
        "itemId": "item:spear",
        "label": "槍",
        "category": "weapon",
        "relationType": "item_weapon",
        "terms": ["丈八蛇矛", "長槍", "槍", "矛", "戟", "弓", "箭"],
        "confidenceBoost": 0.03,
    },
    {
        "itemId": "item:armor",
        "label": "甲胄",
        "category": "armor",
        "relationType": "item_armor",
        "terms": ["甲", "鎧", "盔", "甲胄"],
        "confidenceBoost": 0.03,
    },
    {
        "itemId": "item:seal",
        "label": "印信",
        "category": "insignia",
        "relationType": "item_insignia",
        "terms": ["印", "印信", "玉璽", "玉玺"],
        "confidenceBoost": 0.03,
    },
    {
        "itemId": "item:book",
        "label": "書籍兵書",
        "category": "document",
        "relationType": "item_document",
        "terms": ["兵書", "兵书", "書", "书"],
        "confidenceBoost": 0.02,
    },
    {
        "itemId": "item:supplies",
        "label": "補給糧草",
        "category": "supply",
        "relationType": "item_supply",
        "terms": ["糧", "粮", "糧草", "军粮", "軍糧", "補給", "补给"],
        "confidenceBoost": 0.03,
    },
    {
        "itemId": "item:war-ship",
        "label": "船艦",
        "category": "vehicle",
        "relationType": "item_vehicle",
        "terms": ["船", "舟", "艦", "舰"],
        "confidenceBoost": 0.03,
    },
    {
        "itemId": "item:treasure",
        "label": "金銀財貨",
        "category": "treasure",
        "relationType": "item_treasure",
        "terms": ["金", "銀", "银", "珠", "寶", "宝"],
        "confidenceBoost": 0.01,
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build person-item relationship overlay from source-event packets.")
    parser.add_argument("--source-event-packets", default=str(DEFAULT_SOURCE_EVENT_PACKETS))
    parser.add_argument("--source-config", default=str(DEFAULT_SOURCE_CONFIG))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        text = line.strip()
        if not text:
            continue
        value = json.loads(text)
        if isinstance(value, dict):
            rows.append(value)
    return rows


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    return len(rows)


def stable_hash(*parts: Any, length: int = 12) -> str:
    digest = hashlib.sha1()
    for part in parts:
        digest.update(str(part).encode("utf-8", errors="ignore"))
        digest.update(b"|")
    return digest.hexdigest()[: max(length, 6)]


def compact_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "").strip())


def parse_source_id(source_ref: str) -> str:
    value = str(source_ref or "").strip()
    if not value:
        return "unknown-source"
    parts = value.split(":")
    if len(parts) >= 2 and parts[0] in {"ext-card", "ext-seed"}:
        return parts[1].strip() or "unknown-source"
    return "unknown-source"


def load_source_policy_index(path: Path) -> dict[str, dict[str, Any]]:
    payload = read_json(path)
    rows = payload.get("sources") if isinstance(payload, dict) else []
    index: dict[str, dict[str, Any]] = {}
    if not isinstance(rows, list):
        return index
    for row in rows:
        if not isinstance(row, dict):
            continue
        source_id = str(row.get("sourceId") or "").strip()
        if source_id:
            index[source_id] = row
    return index


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def base_confidence_for_layer(source_layer: str) -> float:
    return float(LAYER_BASE_CONFIDENCE.get(source_layer.lower().strip(), 0.58))


def max_confidence_for_layer(source_layer: str) -> float:
    return float(LAYER_MAX_CONFIDENCE.get(source_layer.lower().strip(), 0.66))


def source_edge_cap_for_layer(source_layer: str) -> int:
    return int(LAYER_SOURCE_EDGE_CAP.get(source_layer.lower().strip(), 100))


def source_edge_cap_for_profile(*, source_layer: str, source_class: str, trust_tier: str) -> int:
    layer = source_layer.lower().strip()
    base_cap = max(source_edge_cap_for_layer(layer), 1)
    normalized_class = source_class.lower().strip()
    normalized_tier = trust_tier.lower().strip()
    is_primary_text = normalized_class in PRIMARY_TEXT_SOURCE_CLASSES or normalized_tier in PRIMARY_TEXT_TRUST_TIERS
    multiplier = LAYER_PRIMARY_TEXT_CAP_MULTIPLIER.get(layer, 1.0)
    if is_primary_text and multiplier > 1.0:
        base_cap = int(round(base_cap * multiplier))
    return max(base_cap, 1)


def packet_terms(packet: dict[str, Any]) -> list[str]:
    matched = packet.get("matchedTermsByAngle") if isinstance(packet.get("matchedTermsByAngle"), dict) else {}
    raw_terms = matched.get("item_equipment") if isinstance(matched, dict) else []
    terms = [str(term or "").strip() for term in (raw_terms or []) if str(term or "").strip()]
    text = " ".join(str(item or "") for item in (packet.get("examples") or []))
    for spec in ITEM_SPECS:
        for term in spec["terms"]:
            if term and term in text and term not in terms:
                terms.append(term)
    return list(dict.fromkeys(terms))


def resolve_items(terms: list[str]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    matched_terms: set[str] = set()
    joined = "".join(terms)
    for spec in ITEM_SPECS:
        found = [term for term in spec["terms"] if term and term in joined]
        if not found:
            continue
        matched_terms.update(found)
        items.append(
            {
                "itemId": spec["itemId"],
                "itemLabel": spec["label"],
                "itemCategory": spec["category"],
                "relationType": spec["relationType"],
                "matchedTerms": found,
                "confidenceBoost": float(spec["confidenceBoost"]),
            }
        )
    for term in terms:
        if term in matched_terms:
            continue
        token = compact_text(term)
        if not token:
            continue
        items.append(
            {
                "itemId": f"item:token-{stable_hash(token, length=8)}",
                "itemLabel": token[:24],
                "itemCategory": "unknown",
                "relationType": "item_reference",
                "matchedTerms": [token],
                "confidenceBoost": 0.0,
            }
        )
    deduped: dict[tuple[str, str], dict[str, Any]] = {}
    for item in items:
        key = (item["itemId"], item["relationType"])
        existing = deduped.get(key)
        if existing is None:
            deduped[key] = item
            continue
        merged_terms = list(dict.fromkeys(existing["matchedTerms"] + item["matchedTerms"]))
        existing["matchedTerms"] = merged_terms
        existing["confidenceBoost"] = max(float(existing["confidenceBoost"]), float(item["confidenceBoost"]))
    return list(deduped.values())


def confidence_for_packet(packet: dict[str, Any], source_layer: str, item_conf_boost: float, item_term_count: int) -> float:
    base = base_confidence_for_layer(source_layer)
    strength = str(packet.get("packetStrength") or "").strip().lower()
    if strength == "strong":
        base += 0.05
    elif strength == "rich":
        base += 0.02
    elif strength == "thin":
        base -= 0.04
    if int(packet.get("relationshipEdgeCount") or 0) > 0:
        base += 0.02
    if item_term_count >= 2:
        base += 0.01
    base += float(item_conf_boost or 0.0)
    return round(clamp(base, 0.45, max_confidence_for_layer(source_layer)), 2)


def edges_from_packets(
    packets: list[dict[str, Any]],
    source_policy_index: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], Counter[str], Counter[str], Counter[str], Counter[str]]:
    rows: list[dict[str, Any]] = []
    reject_counts: Counter[str] = Counter()
    source_counts: Counter[str] = Counter()
    type_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    layer_counts: Counter[str] = Counter()
    for packet in packets:
        angle_families = {str(item or "").strip() for item in (packet.get("angleFamilies") or [])}
        if "item_equipment" not in angle_families:
            reject_counts["packet-missing-item-equipment"] += 1
            continue
        source_ref = str(packet.get("sourceRef") or "").strip()
        if not source_ref:
            reject_counts["packet-missing-source-ref"] += 1
            continue
        general_ids = [
            str(item or "").strip()
            for item in (packet.get("generalIds") or [])
            if str(item or "").strip() and not str(item or "").strip().startswith("shadow:")
        ]
        general_ids = list(dict.fromkeys(general_ids))
        if not general_ids:
            reject_counts["packet-missing-general-ids"] += 1
            continue

        terms = packet_terms(packet)
        if not terms:
            reject_counts["packet-missing-item-terms"] += 1
            continue
        items = resolve_items(terms)
        if not items:
            reject_counts["packet-missing-item-resolve"] += 1
            continue

        source_id = parse_source_id(source_ref)
        source_policy = source_policy_index.get(source_id, {})
        source_layer = str(source_policy.get("sourceLayer") or "worldbuilding").strip().lower()
        source_class = str(source_policy.get("sourceClass") or "unknown").strip().lower()
        trust_tier = str(source_policy.get("trustTier") or "unknown").strip().lower()
        source_counts[source_id] += 1
        chapter_no = packet.get("chapterNo") if isinstance(packet.get("chapterNo"), int) else None
        example = str(((packet.get("examples") or [""])[0]) or "").strip()
        packet_id = str(packet.get("packetId") or stable_hash(source_ref, example))
        source_evidence_id = source_ref.split(":")[-1] if ":" in source_ref else packet_id
        for general_id in general_ids:
            for item in items:
                relation_type = str(item["relationType"])
                confidence = confidence_for_packet(packet, source_layer, float(item["confidenceBoost"]), len(item.get("matchedTerms") or []))
                row = {
                    "edgeId": f"rel.item.{source_id}.{stable_hash(packet_id, general_id, item['itemId'], relation_type)}",
                    "chapterNo": chapter_no,
                    "fromId": general_id,
                    "toId": item["itemId"],
                    "type": relation_type,
                    "originalType": relation_type,
                    "itemLabel": item["itemLabel"],
                    "itemCategory": item["itemCategory"],
                    "itemMatchedTerms": list(item.get("matchedTerms") or []),
                    "evidenceRefs": [source_ref],
                    "sourceQuote": example[:220],
                    "evidenceText": example[:220],
                    "pattern": "item-equipment-packet-overlay",
                    "edgeConfidence": confidence,
                    "edgeStrength": round(clamp(confidence - 0.12, 0.35, 0.90), 2),
                    "reviewStatus": "source-grounded-review" if confidence < 0.76 else "source-grounded-strong",
                    "sourceLayer": f"external-{source_layer or 'unknown'}",
                    "sourceLayerRaw": source_layer or "unknown",
                    "sourceClass": source_class or "unknown",
                    "trustTier": trust_tier or "unknown",
                    "sourcePolicyId": source_id,
                    "sourceEvidenceId": source_evidence_id,
                    "crossSiteMatchCount": 0,
                    "crossSiteSourceFamilies": [],
                    "textHash": None,
                    "canonicalWrites": False,
                }
                rows.append(row)
                type_counts[relation_type] += 1
                category_counts[str(item["itemCategory"])] += 1
                layer_counts[source_layer or "unknown"] += 1
    return rows, reject_counts, source_counts, type_counts, category_counts, layer_counts


def dedupe_edges(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for row in rows:
        refs = row.get("evidenceRefs") or []
        ref0 = str(refs[0] if refs else "")
        key = (str(row.get("fromId") or ""), str(row.get("toId") or ""), str(row.get("type") or ""), ref0)
        existing = by_key.get(key)
        if existing is None:
            by_key[key] = row
            continue
        if float(row.get("edgeConfidence") or 0.0) > float(existing.get("edgeConfidence") or 0.0):
            by_key[key] = row
    deduped = list(by_key.values())
    deduped.sort(
        key=lambda row: (
            row.get("chapterNo") is None,
            row.get("chapterNo") or 10**9,
            str((row.get("evidenceRefs") or [""])[0]),
            str(row.get("fromId") or ""),
            str(row.get("type") or ""),
            str(row.get("toId") or ""),
        )
    )
    return deduped


def apply_source_caps(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int], dict[str, int]]:
    by_source: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        source_id = str(row.get("sourcePolicyId") or "unknown-source").strip()
        by_source.setdefault(source_id, []).append(row)

    kept: list[dict[str, Any]] = []
    trimmed_counts: dict[str, int] = {}
    cap_by_source: dict[str, int] = {}
    for source_id, source_rows in by_source.items():
        source_rows.sort(
            key=lambda row: (
                -float(row.get("edgeConfidence") or 0.0),
                str(row.get("itemCategory") or ""),
                str(row.get("fromId") or ""),
                str(row.get("toId") or ""),
            )
        )
        source_layer = str(source_rows[0].get("sourceLayerRaw") or source_rows[0].get("sourceLayer") or "")
        if source_layer.startswith("external-"):
            source_layer = source_layer[len("external-") :]
        source_class = str(source_rows[0].get("sourceClass") or "").strip()
        trust_tier = str(source_rows[0].get("trustTier") or "").strip()
        cap = source_edge_cap_for_profile(source_layer=source_layer, source_class=source_class, trust_tier=trust_tier)
        cap_by_source[source_id] = cap
        selected = source_rows[:cap]
        kept.extend(selected)
        trimmed = max(len(source_rows) - len(selected), 0)
        if trimmed > 0:
            trimmed_counts[source_id] = trimmed
    kept.sort(
        key=lambda row: (
            str(row.get("sourcePolicyId") or ""),
            -float(row.get("edgeConfidence") or 0.0),
            str(row.get("fromId") or ""),
            str(row.get("toId") or ""),
            str(row.get("type") or ""),
        )
    )
    return kept, dict(sorted(trimmed_counts.items())), dict(sorted(cap_by_source.items()))


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        "# Item Relationship Overlay Summary",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Packet Input: `{summary['metrics']['packetInputCount']}`",
        f"- Item Packets: `{summary['metrics']['itemPacketCount']}`",
        f"- Raw Edges: `{summary['metrics']['edgeRawCount']}`",
        f"- Before Source Cap: `{summary['metrics']['edgeCountBeforeSourceCap']}`",
        f"- Final Edges: `{summary['metrics']['edgeCount']}`",
        f"- Source-Cap Trimmed: `{summary['metrics']['sourceCapTrimmedCount']}`",
        "",
        "## Reject Reasons",
        "",
    ]
    for key, value in summary["metrics"]["rejectCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Item Categories", ""])
    for key, value in summary["metrics"]["itemCategoryCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Relationship Types", ""])
    for key, value in summary["metrics"]["relationshipTypeCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Source Layers", ""])
    for key, value in summary["metrics"]["sourceLayerCounts"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Source Caps", ""])
    for key, value in summary["metrics"]["sourceCapBySource"].items():
        trimmed = summary["metrics"]["sourceCapTrimmedBySource"].get(key, 0)
        lines.append(f"- `{key}`: cap=`{value}` trimmed=`{trimmed}`")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    output_root = resolve_path(args.output_root)
    jsonl_path = output_root / "person-item-relationship-edges.external.jsonl"
    summary_path = output_root / "item-relationship-overlay-summary.json"
    md_path = output_root / "item-relationship-overlay-summary.zh-TW.md"
    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise FileExistsError(f"output already exists: {repo_relative(output_root)}")
    output_root.mkdir(parents=True, exist_ok=True)

    packets = read_jsonl(resolve_path(args.source_event_packets))
    source_policy_index = load_source_policy_index(resolve_path(args.source_config))
    raw_rows, reject_counts, source_counts, type_counts, category_counts, layer_counts = edges_from_packets(
        packets,
        source_policy_index,
    )
    deduped_rows = dedupe_edges(raw_rows)
    capped_rows, capped_trimmed_counts, source_caps = apply_source_caps(deduped_rows)
    write_jsonl(jsonl_path, capped_rows)
    final_type_counts = Counter(str(row.get("type") or "") for row in capped_rows)
    final_category_counts = Counter(str(row.get("itemCategory") or "") for row in capped_rows)
    final_layer_counts = Counter(str(row.get("sourceLayerRaw") or "") for row in capped_rows)

    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "external-item-relationship-overlay",
        "canonicalWrites": False,
        "inputs": {
            "sourceEventPacketsPath": repo_relative(resolve_path(args.source_event_packets)),
            "sourceConfigPath": repo_relative(resolve_path(args.source_config)),
        },
        "outputs": {
            "itemRelationshipEdgesJsonlPath": repo_relative(jsonl_path),
            "summaryJsonPath": repo_relative(summary_path),
            "summaryMarkdownPath": repo_relative(md_path),
        },
        "metrics": {
            "packetInputCount": len(packets),
            "itemPacketCount": sum(1 for row in packets if "item_equipment" in {str(item or "").strip() for item in (row.get("angleFamilies") or [])}),
            "edgeRawCount": len(raw_rows),
            "edgeCountBeforeSourceCap": len(deduped_rows),
            "edgeCount": len(capped_rows),
            "sourceCapTrimmedCount": max(len(deduped_rows) - len(capped_rows), 0),
            "sourceCapTrimmedBySource": capped_trimmed_counts,
            "sourceCapBySource": source_caps,
            "rejectCounts": dict(sorted(reject_counts.items())),
            "sourcePolicyPacketCounts": dict(sorted(source_counts.items())),
            "rawRelationshipTypeCounts": dict(sorted(type_counts.items())),
            "rawItemCategoryCounts": dict(sorted(category_counts.items())),
            "rawSourceLayerCounts": dict(sorted(layer_counts.items())),
            "relationshipTypeCounts": dict(sorted(final_type_counts.items())),
            "itemCategoryCounts": dict(sorted(final_category_counts.items())),
            "sourceLayerCounts": dict(sorted(final_layer_counts.items())),
        },
    }
    write_json(summary_path, summary)
    md_path.write_text(render_markdown(summary), encoding="utf-8")
    print(f"[build_item_relationship_overlay] wrote {jsonl_path}")
    print(f"[build_item_relationship_overlay] wrote {summary_path}")
    print(f"[build_item_relationship_overlay] wrote {md_path}")
    print(
        "[build_item_relationship_overlay] "
        f"packets={summary['metrics']['packetInputCount']} "
        f"itemPackets={summary['metrics']['itemPacketCount']} "
        f"edges={summary['metrics']['edgeCount']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
