from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
DEFAULT_RELATIONSHIP_EVIDENCE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-evidence/source-grounded-relationship-edges.jsonl")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/source-event-packets")

ANGLE_TERMS = {
    "battle": ["戰", "軍", "兵", "陣", "敵", "殺", "斬", "攻", "追", "敗", "馬", "交鋒", "廝殺", "迎戰", "直取"],
    "affect_story": ["哭", "怒", "喜", "驚", "恨", "恩", "義", "忠", "悔", "愛", "敬", "羞", "懼", "灑淚", "大怒"],
    "work_role": ["耕", "商", "販", "官", "吏", "太守", "縣令", "丞", "尉", "司馬", "將軍", "軍師", "謀士"],
    "activity_seed": ["請", "薦", "拜", "見", "議", "問", "答", "救", "守", "送", "迎", "借", "求", "降", "逃"],
    "item_equipment": ["劍", "刀", "槍", "矛", "馬", "弓", "箭", "甲", "鎧", "印", "書", "金", "銀", "糧", "船"],
    "location_context": ["城", "寨", "關", "橋", "江", "河", "山", "津", "渡", "郡", "州", "縣", "營"],
    "aptitude_talent": ["武藝", "弓馬", "善戰", "勇力", "勇猛", "智謀", "計策", "奇謀", "妙計", "謀略", "辯才", "才學", "醫術", "神醫", "方術", "占卜", "天文", "兵法", "善射", "善書"],
    "decision_weight": ["商議", "議曰", "諫", "勸", "從其言", "不從", "請降", "歸降", "投降", "拒", "不許", "計議", "定計", "獻計", "問計", "籌畫"],
    "female_interaction": ["夫人", "主母", "母親", "母病", "嫂嫂", "小姐", "妻", "妾", "嫁", "娶", "婚", "阿斗", "孩兒", "孩子", "抱", "灑淚", "侍婢", "國太"],
    "faction_timeline": ["東吳", "西蜀", "曹魏", "江東", "黃巾", "董卓", "荊州", "益州", "西涼", "南蠻", "北魏", "漢室", "朝廷", "魏王", "吳侯", "蜀兵", "魏兵", "吳兵", "漢軍", "賊軍"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build sourceRef-level review event packets from observed mentions.")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH))
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH))
    parser.add_argument("--relationship-evidence", default=str(DEFAULT_RELATIONSHIP_EVIDENCE_PATH))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--max-examples-per-packet", type=int, default=3)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "").strip())


def source_ref_key(source_ref: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", source_ref).strip("-").lower() or "unknown"


def load_observed_rows(path: Path) -> list[dict[str, Any]]:
    payload = read_json(path)
    return payload.get("data") if isinstance(payload, dict) else payload


def load_female_general_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    payload = read_json(path)
    return {
        str(profile.get("generalId") or "").strip()
        for profile in payload.get("femalePriorityProfiles") or []
        if str(profile.get("generalId") or "").strip()
    }


def row_general_ids(row: dict[str, Any]) -> list[str]:
    return sorted({
        str(general_id).strip()
        for general_id in list(row.get("matchedGeneralIds") or []) + list(row.get("sceneParticipants") or [])
        if str(general_id or "").strip() and not str(general_id).startswith("romance-person-")
    })


def row_angle_hits(text: str, general_ids: list[str], female_general_ids: set[str]) -> dict[str, list[str]]:
    hits: dict[str, list[str]] = {}
    general_id_set = set(general_ids)
    for angle_family, terms in ANGLE_TERMS.items():
        if angle_family == "female_interaction" and not general_id_set.intersection(female_general_ids):
            continue
        matched = [term for term in terms if term in text]
        if matched:
            hits[angle_family] = matched[:8]
    return hits


def packet_strength(angle_count: int, general_count: int, has_relationship_evidence: bool) -> tuple[str, float]:
    if has_relationship_evidence or (angle_count >= 3 and general_count >= 2):
        return "strong", 0.4
    if angle_count >= 2 and general_count >= 1:
        return "rich", 0.22
    if angle_count >= 1 and general_count >= 2:
        return "thin", 0.08
    return "discard", 0.0


def build_relationship_index(edges: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    index: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for edge in edges:
        evidence_refs = list(edge.get("evidenceRefs") or [])
        source_ref = str(evidence_refs[0] if evidence_refs else "").strip()
        if source_ref:
            index[source_ref].append(edge)
    return index


def build_packets(rows: list[dict[str, Any]], relationship_edges: list[dict[str, Any]], female_general_ids: set[str], max_examples: int) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "chapterNo": None,
        "generalIds": set(),
        "angleTerms": defaultdict(set),
        "examples": [],
    })
    for row in rows:
        if row.get("matchStatus") != "resolved":
            continue
        source_ref = str(row.get("sourceRef") or "").strip()
        evidence_text = clean_text(row.get("textSnippet"))
        general_ids = row_general_ids(row)
        if not source_ref or not evidence_text or not general_ids:
            continue
        hits = row_angle_hits(evidence_text, general_ids, female_general_ids)
        if not hits:
            continue
        bucket = grouped[source_ref]
        if bucket["chapterNo"] is None and isinstance(row.get("chapterNo"), int):
            bucket["chapterNo"] = row.get("chapterNo")
        bucket["generalIds"].update(general_ids)
        for angle_family, terms in hits.items():
            bucket["angleTerms"][angle_family].update(terms)
        if len(bucket["examples"]) < max_examples:
            bucket["examples"].append(evidence_text[:180])

    relationship_index = build_relationship_index(relationship_edges)
    records: list[dict[str, Any]] = []
    for source_ref, bucket in grouped.items():
        relationship_records = relationship_index.get(source_ref) or []
        if relationship_records:
            bucket["angleTerms"]["relationship"].update(str(edge.get("type") or "relationship") for edge in relationship_records)
            for edge in relationship_records:
                for general_id in [edge.get("fromId"), edge.get("toId")]:
                    if str(general_id or "").strip():
                        bucket["generalIds"].add(str(general_id).strip())
        angle_families = sorted(bucket["angleTerms"])
        general_ids = sorted(bucket["generalIds"])
        strength, unit_weight = packet_strength(len(angle_families), len(general_ids), bool(relationship_records))
        if strength == "discard":
            continue
        records.append({
            "packetId": f"source-event-packet.{source_ref_key(source_ref)}",
            "sourceRef": source_ref,
            "chapterNo": bucket["chapterNo"],
            "generalIds": general_ids,
            "angleFamilies": angle_families,
            "matchedTermsByAngle": {angle: sorted(terms, key=lambda item: (len(item), item))[:12] for angle, terms in bucket["angleTerms"].items()},
            "relationshipEdgeCount": len(relationship_records),
            "examples": bucket["examples"],
            "packetStrength": strength,
            "eventPacketUnitWeight": unit_weight,
            "reviewStatus": "source-grounded-event-packet",
            "canonicalWrites": False,
        })
    return sorted(records, key=lambda record: (record.get("chapterNo") or 0, source_ref_key(record["sourceRef"])))


def summarize(records: list[dict[str, Any]], inputs: dict[str, str]) -> dict[str, Any]:
    strength_counts = Counter(record["packetStrength"] for record in records)
    angle_counts = Counter(angle for record in records for angle in record["angleFamilies"])
    covered_generals = sorted({general_id for record in records for general_id in record["generalIds"]})
    unit_total = sum(float(record.get("eventPacketUnitWeight") or 0.0) for record in records)
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "source-grounded-event-packets",
        "canonicalWrites": False,
        "inputs": inputs,
        "packetCount": len(records),
        "coveredGeneralCount": len(covered_generals),
        "coveredGeneralIds": covered_generals,
        "eventPacketUnits": round(unit_total, 2),
        "packetStrengthCounts": dict(sorted(strength_counts.items())),
        "angleFamilyCounts": dict(sorted(angle_counts.items())),
    }


def render_markdown(summary: dict[str, Any], records: list[dict[str, Any]]) -> str:
    lines = [
        "# Source-Grounded Event Packets",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Canonical Writes: `{summary['canonicalWrites']}`",
        f"- Packet Count: `{summary['packetCount']}`",
        f"- Event Packet Units: `{summary['eventPacketUnits']}`",
        f"- Covered Generals: `{summary['coveredGeneralCount']}`",
        "",
        "## Strength",
        "",
    ]
    for strength, count in summary["packetStrengthCounts"].items():
        lines.append(f"- `{strength}`: `{count}`")
    lines.extend(["", "## Angle Families", ""])
    for angle_family, count in summary["angleFamilyCounts"].items():
        lines.append(f"- `{angle_family}`: `{count}`")
    lines.extend(["", "## Examples", ""])
    for record in records[:24]:
        example = (record.get("examples") or [""])[0]
        lines.append(
            f"- `{record['sourceRef']}` strength=`{record['packetStrength']}` "
            f"generals=`{len(record['generalIds'])}` angles=`{','.join(record['angleFamilies'][:6])}` "
            f"text=`{example[:80]}`"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    jsonl_path = output_root / "source-event-packets.jsonl"
    summary_path = output_root / "source-event-packets-summary.json"
    md_path = output_root / "source-event-packets-review.md"
    if not args.overwrite and any(path.exists() for path in (jsonl_path, summary_path, md_path)):
        raise FileExistsError("Source event packet outputs already exist. Re-run with --overwrite.")

    rows = load_observed_rows(Path(args.observed_mentions))
    female_general_ids = load_female_general_ids(Path(args.stable_knowledge))
    relationship_edges = read_jsonl(Path(args.relationship_evidence))
    records = build_packets(rows, relationship_edges, female_general_ids, args.max_examples_per_packet)
    jsonl_path.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
    summary = summarize(records, {
        "observedMentionsPath": args.observed_mentions,
        "stableKnowledgePath": args.stable_knowledge,
        "relationshipEvidencePath": args.relationship_evidence,
    })
    write_json(summary_path, summary)
    md_path.write_text(render_markdown(summary, records), encoding="utf-8")
    print(f"[build_source_event_packets] wrote {jsonl_path}")
    print(f"[build_source_event_packets] wrote {summary_path}")
    print(f"[build_source_event_packets] wrote {md_path}")
    print(
        f"[build_source_event_packets] packets={summary['packetCount']} "
        f"units={summary['eventPacketUnits']} coveredGenerals={summary['coveredGeneralCount']}"
    )


if __name__ == "__main__":
    main()