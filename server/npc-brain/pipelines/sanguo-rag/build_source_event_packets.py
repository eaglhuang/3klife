from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sanguo_governance_loader import default_governance_root, load_source_event_packet_policy

DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_STABLE_KNOWLEDGE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json")
DEFAULT_RELATIONSHIP_EVIDENCE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-evidence/source-grounded-relationship-edges.jsonl")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/source-event-packets")
DEFAULT_GOVERNANCE_ROOT = default_governance_root()

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

CLAIM_TO_ANGLE_FAMILY = {
    "identity": "faction_timeline",
    "relationship": "relationship",
    "event": "activity_seed",
    "location": "location_context",
    "title": "work_role",
    "trait": "aptitude_talent",
    "habit": "activity_seed",
    "activity": "activity_seed",
    "role": "work_role",
    "dialogue_seed": "affect_story",
    "worldbuilding_note": "faction_timeline",
    "source_conflict": "decision_weight",
}
EXTERNAL_SEED_MIN_SCORE = 72.0
HISTORY_CROSS_FAMILY_THRESHOLD = 2
NON_HISTORY_CROSS_FAMILY_THRESHOLD = 3
PACKET_STRENGTH_RULES = [
    {
        "strength": "strong",
        "unitWeight": 0.4,
        "relationshipEvidencePass": True,
        "minAngleCount": 3,
        "minGeneralCount": 2,
    },
    {
        "strength": "rich",
        "unitWeight": 0.22,
        "minAngleCount": 2,
        "minGeneralCount": 1,
    },
    {
        "strength": "thin",
        "unitWeight": 0.08,
        "minAngleCount": 1,
        "minGeneralCount": 2,
    },
]
DISCARD_STRENGTH = {"strength": "discard", "unitWeight": 0.0}
OUTPUT_FILES = {
    "packets": "source-event-packets.jsonl",
    "summary": "source-event-packets-summary.json",
    "review": "source-event-packets-review.md",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build sourceRef-level review event packets from observed mentions.")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH))
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH))
    parser.add_argument("--relationship-evidence", default=str(DEFAULT_RELATIONSHIP_EVIDENCE_PATH))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--max-examples-per-packet", type=int, default=3)
    parser.add_argument("--external-seed-min-score", type=float, default=None)
    parser.add_argument("--history-cross-family-threshold", type=int, default=None)
    parser.add_argument("--non-history-cross-family-threshold", type=int, default=None)
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT))
    parser.add_argument("--source-event-packet-policy", default=None)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def apply_source_event_packet_policy(governance_root: str | Path | None, source_event_packet_policy: str | Path | None = None) -> None:
    global CLAIM_TO_ANGLE_FAMILY
    global EXTERNAL_SEED_MIN_SCORE
    global HISTORY_CROSS_FAMILY_THRESHOLD
    global NON_HISTORY_CROSS_FAMILY_THRESHOLD
    global PACKET_STRENGTH_RULES
    global DISCARD_STRENGTH
    global OUTPUT_FILES

    policy = load_source_event_packet_policy(governance_root, source_event_packet_policy=source_event_packet_policy)
    mapping = policy.get("claimToAngleFamily")
    if isinstance(mapping, dict):
        CLAIM_TO_ANGLE_FAMILY = {str(key): str(value) for key, value in mapping.items()}
    trust_gate = policy.get("externalTrustGate") if isinstance(policy.get("externalTrustGate"), dict) else {}
    EXTERNAL_SEED_MIN_SCORE = float(trust_gate.get("externalSeedMinScore") or EXTERNAL_SEED_MIN_SCORE)
    HISTORY_CROSS_FAMILY_THRESHOLD = int(trust_gate.get("historyCrossFamilyThreshold") or HISTORY_CROSS_FAMILY_THRESHOLD)
    NON_HISTORY_CROSS_FAMILY_THRESHOLD = int(trust_gate.get("nonHistoryCrossFamilyThreshold") or NON_HISTORY_CROSS_FAMILY_THRESHOLD)
    rules = policy.get("packetStrengthRules")
    if isinstance(rules, list):
        PACKET_STRENGTH_RULES = [row for row in rules if isinstance(row, dict)]
    discard = policy.get("discardStrength")
    if isinstance(discard, dict):
        DISCARD_STRENGTH = dict(discard)
    output_files = policy.get("outputFiles")
    if isinstance(output_files, dict):
        OUTPUT_FILES = {**OUTPUT_FILES, **{str(key): str(value) for key, value in output_files.items()}}


def cli_or_policy_number(value: float | int | None, fallback: float | int) -> float | int:
    return fallback if value is None else value


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


def is_external_overlay_row(source_ref: str) -> bool:
    return source_ref.startswith("ext-card:") or source_ref.startswith("ext-seed:")


def row_source_layer(row: dict[str, Any]) -> str:
    return str(row.get("sourceLayer") or "").strip().lower()


def row_cross_family_count(row: dict[str, Any]) -> int:
    try:
        return int(row.get("crossSiteSourceFamilyCount") or 0)
    except (TypeError, ValueError):
        return 0


def row_external_trust_passed(
    row: dict[str, Any],
    *,
    external_seed_min_score: float,
    history_cross_family_threshold: int,
    non_history_cross_family_threshold: int,
) -> bool:
    if bool(row.get("overlayTrustPassed")):
        return True
    if bool(row.get("hasQuoteLocatorHash")):
        return True
    signals = row.get("trustSignals")
    if isinstance(signals, list) and any(str(item or "").strip() for item in signals):
        return True
    threshold = history_cross_family_threshold if row_source_layer(row) == "history" else non_history_cross_family_threshold
    if row_cross_family_count(row) >= max(threshold, 1):
        return True
    if str(row.get("mentionType") or "").strip() == "external-evidence-seed":
        try:
            score = float(row.get("seedConfidenceScore") or 0.0)
        except (TypeError, ValueError):
            score = 0.0
        if score >= max(external_seed_min_score, 0.0):
            return True
    return False


def claim_angle_hits(row: dict[str, Any], general_ids: list[str], female_general_ids: set[str]) -> dict[str, list[str]]:
    mapped: dict[str, list[str]] = {}
    general_id_set = set(general_ids)
    claim_type = str(row.get("claimType") or "").strip().lower()
    angle_type = str(row.get("angleType") or "").strip().lower()
    for key in [claim_type, angle_type]:
        angle_family = CLAIM_TO_ANGLE_FAMILY.get(key)
        if not angle_family:
            continue
        if angle_family == "female_interaction" and not general_id_set.intersection(female_general_ids):
            continue
        if angle_family not in mapped:
            mapped[angle_family] = [f"claim:{key or 'external'}"]
    return mapped


def packet_strength(angle_count: int, general_count: int, has_relationship_evidence: bool) -> tuple[str, float]:
    for rule in PACKET_STRENGTH_RULES:
        strength = str(rule.get("strength") or "").strip()
        if not strength:
            continue
        if bool(rule.get("relationshipEvidencePass")) and has_relationship_evidence:
            return strength, float(rule.get("unitWeight") or 0.0)
        min_angle = int(rule.get("minAngleCount") or 0)
        min_general = int(rule.get("minGeneralCount") or 0)
        if angle_count >= min_angle and general_count >= min_general:
            return strength, float(rule.get("unitWeight") or 0.0)
    return str(DISCARD_STRENGTH.get("strength") or "discard"), float(DISCARD_STRENGTH.get("unitWeight") or 0.0)


def build_relationship_index(edges: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    index: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for edge in edges:
        evidence_refs = list(edge.get("evidenceRefs") or [])
        source_ref = str(evidence_refs[0] if evidence_refs else "").strip()
        if source_ref:
            index[source_ref].append(edge)
    return index


def build_packets(
    rows: list[dict[str, Any]],
    relationship_edges: list[dict[str, Any]],
    female_general_ids: set[str],
    max_examples: int,
    *,
    external_seed_min_score: float,
    history_cross_family_threshold: int,
    non_history_cross_family_threshold: int,
) -> list[dict[str, Any]]:
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
        external_overlay = is_external_overlay_row(source_ref)
        if external_overlay and not row_external_trust_passed(
            row,
            external_seed_min_score=external_seed_min_score,
            history_cross_family_threshold=history_cross_family_threshold,
            non_history_cross_family_threshold=non_history_cross_family_threshold,
        ):
            continue
        hits = row_angle_hits(evidence_text, general_ids, female_general_ids)
        if external_overlay:
            for angle_family, terms in claim_angle_hits(row, general_ids, female_general_ids).items():
                hits.setdefault(angle_family, [])
                for term in terms:
                    if term not in hits[angle_family]:
                        hits[angle_family].append(term)
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
    apply_source_event_packet_policy(args.governance_root, args.source_event_packet_policy)
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    jsonl_path = output_root / OUTPUT_FILES["packets"]
    summary_path = output_root / OUTPUT_FILES["summary"]
    md_path = output_root / OUTPUT_FILES["review"]
    if not args.overwrite and any(path.exists() for path in (jsonl_path, summary_path, md_path)):
        raise FileExistsError("Source event packet outputs already exist. Re-run with --overwrite.")

    rows = load_observed_rows(Path(args.observed_mentions))
    female_general_ids = load_female_general_ids(Path(args.stable_knowledge))
    relationship_edges = read_jsonl(Path(args.relationship_evidence))
    records = build_packets(
        rows,
        relationship_edges,
        female_general_ids,
        args.max_examples_per_packet,
        external_seed_min_score=float(cli_or_policy_number(args.external_seed_min_score, EXTERNAL_SEED_MIN_SCORE)),
        history_cross_family_threshold=max(int(cli_or_policy_number(args.history_cross_family_threshold, HISTORY_CROSS_FAMILY_THRESHOLD)), 1),
        non_history_cross_family_threshold=max(
            int(cli_or_policy_number(args.non_history_cross_family_threshold, NON_HISTORY_CROSS_FAMILY_THRESHOLD)),
            max(int(cli_or_policy_number(args.history_cross_family_threshold, HISTORY_CROSS_FAMILY_THRESHOLD)), 1),
        ),
    )
    jsonl_path.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
    summary = summarize(records, {
        "observedMentionsPath": args.observed_mentions,
        "stableKnowledgePath": args.stable_knowledge,
        "relationshipEvidencePath": args.relationship_evidence,
        "governanceRoot": args.governance_root,
        "sourceEventPacketPolicy": args.source_event_packet_policy or "policy-source-event-packets.json",
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
