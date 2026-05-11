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
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/event-question-seeds")

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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build source-grounded event question seed bank from observed mentions.")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH))
    parser.add_argument("--stable-knowledge", default=str(DEFAULT_STABLE_KNOWLEDGE_PATH))
    parser.add_argument("--relationship-evidence", default=str(DEFAULT_RELATIONSHIP_EVIDENCE_PATH))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--max-evidence-refs-per-slot", type=int, default=8)
    parser.add_argument("--max-examples-per-slot", type=int, default=3)
    parser.add_argument("--external-seed-min-score", type=float, default=72.0)
    parser.add_argument("--history-cross-family-threshold", type=int, default=2)
    parser.add_argument("--non-history-cross-family-threshold", type=int, default=3)
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


def source_ref_key(source_ref: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", source_ref).strip("-").lower() or "unknown"


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "").strip())


def row_general_ids(row: dict[str, Any]) -> list[str]:
    return sorted({
        str(general_id).strip()
        for general_id in list(row.get("matchedGeneralIds") or []) + list(row.get("sceneParticipants") or [])
        if str(general_id or "").strip() and not str(general_id).startswith("romance-person-")
    })


def matched_terms(text: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term in text]


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


def mapped_claim_angle_families(row: dict[str, Any], female_general_ids: set[str], general_ids: list[str]) -> list[str]:
    mapped: list[str] = []
    claim_type = str(row.get("claimType") or "").strip().lower()
    angle_type = str(row.get("angleType") or "").strip().lower()
    for key in [claim_type, angle_type]:
        if key in CLAIM_TO_ANGLE_FAMILY:
            angle_family = CLAIM_TO_ANGLE_FAMILY[key]
            if angle_family == "female_interaction" and not set(general_ids).intersection(female_general_ids):
                continue
            if angle_family not in mapped:
                mapped.append(angle_family)
    return mapped


def add_slot_evidence(
    slots: dict[tuple[str, str], dict[str, Any]],
    *,
    general_id: str,
    angle_family: str,
    source_ref: str,
    chapter_no: int | None,
    evidence_text: str,
    terms: list[str],
    source_layer: str,
    max_examples: int,
) -> None:
    key = (general_id, angle_family)
    slot = slots.setdefault(key, {
        "generalId": general_id,
        "angleFamily": angle_family,
        "sourceRefs": [],
        "chapterNos": [],
        "matchedTerms": [],
        "examples": [],
        "sourceLayers": [],
    })
    if source_ref and source_ref not in slot["sourceRefs"]:
        slot["sourceRefs"].append(source_ref)
    if isinstance(chapter_no, int) and chapter_no not in slot["chapterNos"]:
        slot["chapterNos"].append(chapter_no)
    for term in terms:
        if term not in slot["matchedTerms"]:
            slot["matchedTerms"].append(term)
    if source_layer not in slot["sourceLayers"]:
        slot["sourceLayers"].append(source_layer)
    if evidence_text and len(slot["examples"]) < max_examples:
        slot["examples"].append({
            "sourceRef": source_ref,
            "text": evidence_text[:180],
        })


def build_observed_slots(
    rows: list[dict[str, Any]],
    female_general_ids: set[str],
    max_examples: int,
    *,
    external_seed_min_score: float,
    history_cross_family_threshold: int,
    non_history_cross_family_threshold: int,
) -> dict[tuple[str, str], dict[str, Any]]:
    slots: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        if row.get("matchStatus") != "resolved":
            continue
        source_ref = str(row.get("sourceRef") or "").strip()
        evidence_text = clean_text(row.get("textSnippet"))
        if not source_ref or not evidence_text:
            continue
        external_overlay = is_external_overlay_row(source_ref)
        if external_overlay and not row_external_trust_passed(
            row,
            external_seed_min_score=external_seed_min_score,
            history_cross_family_threshold=history_cross_family_threshold,
            non_history_cross_family_threshold=non_history_cross_family_threshold,
        ):
            continue
        general_ids = row_general_ids(row)
        if not general_ids:
            continue
        for angle_family, terms in ANGLE_TERMS.items():
            if angle_family == "female_interaction" and not set(general_ids).intersection(female_general_ids):
                continue
            hits = matched_terms(evidence_text, terms)
            if not hits:
                continue
            for general_id in general_ids:
                add_slot_evidence(
                    slots,
                    general_id=general_id,
                    angle_family=angle_family,
                    source_ref=source_ref,
                    chapter_no=row.get("chapterNo") if isinstance(row.get("chapterNo"), int) else None,
                    evidence_text=evidence_text,
                    terms=hits[:6],
                    source_layer="observed-mentions",
                    max_examples=max_examples,
                )
        if external_overlay:
            claim_angles = mapped_claim_angle_families(row, female_general_ids, general_ids)
            for angle_family in claim_angles:
                claim_type = str(row.get("claimType") or row.get("angleType") or "external").strip().lower()
                for general_id in general_ids:
                    add_slot_evidence(
                        slots,
                        general_id=general_id,
                        angle_family=angle_family,
                        source_ref=source_ref,
                        chapter_no=row.get("chapterNo") if isinstance(row.get("chapterNo"), int) else None,
                        evidence_text=evidence_text,
                        terms=[f"claim:{claim_type}"],
                        source_layer="external-claim-incremental",
                        max_examples=max_examples,
                    )
    return slots


def merge_relationship_slots(slots: dict[tuple[str, str], dict[str, Any]], edges: list[dict[str, Any]], max_examples: int) -> None:
    for edge in edges:
        evidence_refs = list(edge.get("evidenceRefs") or [])
        source_ref = str(evidence_refs[0] if evidence_refs else "").strip()
        evidence_text = clean_text(edge.get("evidenceText"))
        relation_type = str(edge.get("type") or "relationship").strip()
        for general_id in [edge.get("fromId"), edge.get("toId")]:
            general_id = str(general_id or "").strip()
            if not general_id:
                continue
            add_slot_evidence(
                slots,
                general_id=general_id,
                angle_family="relationship",
                source_ref=source_ref,
                chapter_no=edge.get("chapterNo") if isinstance(edge.get("chapterNo"), int) else None,
                evidence_text=evidence_text,
                terms=[relation_type],
                source_layer="relationship-evidence",
                max_examples=max_examples,
            )


def slot_confidence(evidence_ref_count: int, source_layers: list[str]) -> tuple[str, float]:
    has_relationship_evidence = "relationship-evidence" in source_layers
    if has_relationship_evidence or evidence_ref_count >= 5:
        return "strong", 0.35
    if evidence_ref_count >= 3:
        return "rich", 0.25
    return "thin", 0.1


def finalize_slots(slots: dict[tuple[str, str], dict[str, Any]], max_refs: int) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for (general_id, angle_family), slot in slots.items():
        source_refs = sorted(slot["sourceRefs"], key=source_ref_key)
        strength, unit_weight = slot_confidence(len(source_refs), slot["sourceLayers"])
        records.append({
            "seedId": f"event-question-slot.{general_id}.{angle_family}",
            "generalId": general_id,
            "angleFamily": angle_family,
            "sourceRefs": source_refs[:max_refs],
            "sourceRefCount": len(source_refs),
            "chapterNos": sorted(slot["chapterNos"]),
            "matchedTerms": sorted(slot["matchedTerms"], key=lambda item: (len(item), item))[:16],
            "examples": slot["examples"],
            "sourceLayers": sorted(slot["sourceLayers"]),
            "slotStrength": strength,
            "eventQuestionUnitWeight": unit_weight,
            "reviewStatus": "source-grounded-seed",
            "canonicalWrites": False,
        })
    return sorted(records, key=lambda record: (record["generalId"], record["angleFamily"]))


def summarize(records: list[dict[str, Any]], inputs: dict[str, str]) -> dict[str, Any]:
    family_counts = Counter(record["angleFamily"] for record in records)
    strength_counts = Counter(record["slotStrength"] for record in records)
    covered_generals = sorted({record["generalId"] for record in records})
    unit_total = sum(float(record.get("eventQuestionUnitWeight") or 0.0) for record in records)
    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "source-grounded-event-question-seed-bank",
        "canonicalWrites": False,
        "inputs": inputs,
        "slotCount": len(records),
        "coveredGeneralCount": len(covered_generals),
        "coveredGeneralIds": covered_generals,
        "eventQuestionSeedUnits": round(unit_total, 2),
        "angleFamilyCounts": dict(sorted(family_counts.items())),
        "slotStrengthCounts": dict(sorted(strength_counts.items())),
    }


def render_markdown(summary: dict[str, Any], records: list[dict[str, Any]]) -> str:
    lines = [
        "# Source-Grounded Event Question Seeds",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Canonical Writes: `{summary['canonicalWrites']}`",
        f"- Slot Count: `{summary['slotCount']}`",
        f"- Event Question Seed Units: `{summary['eventQuestionSeedUnits']}`",
        f"- Covered Generals: `{summary['coveredGeneralCount']}`",
        "",
        "## Angle Families",
        "",
    ]
    for angle_family, count in summary["angleFamilyCounts"].items():
        lines.append(f"- `{angle_family}`: `{count}`")
    lines.extend(["", "## Strength", ""])
    for strength, count in summary["slotStrengthCounts"].items():
        lines.append(f"- `{strength}`: `{count}`")
    lines.extend(["", "## Examples", ""])
    for record in records[:24]:
        example = (record.get("examples") or [{}])[0]
        lines.append(
            f"- `{record['generalId']}` `{record['angleFamily']}` strength=`{record['slotStrength']}` "
            f"refs=`{record['sourceRefCount']}` terms=`{','.join(record['matchedTerms'][:5])}` "
            f"text=`{str(example.get('text') or '')[:80]}`"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    jsonl_path = output_root / "event-question-seeds.jsonl"
    summary_path = output_root / "event-question-seeds-summary.json"
    md_path = output_root / "event-question-seeds-review.md"
    if not args.overwrite and any(path.exists() for path in (jsonl_path, summary_path, md_path)):
        raise FileExistsError("Event question seed outputs already exist. Re-run with --overwrite.")

    rows = load_observed_rows(Path(args.observed_mentions))
    female_general_ids = load_female_general_ids(Path(args.stable_knowledge))
    relationship_edges = read_jsonl(Path(args.relationship_evidence))
    slots = build_observed_slots(
        rows,
        female_general_ids,
        args.max_examples_per_slot,
        external_seed_min_score=args.external_seed_min_score,
        history_cross_family_threshold=max(args.history_cross_family_threshold, 1),
        non_history_cross_family_threshold=max(args.non_history_cross_family_threshold, max(args.history_cross_family_threshold, 1)),
    )
    merge_relationship_slots(slots, relationship_edges, args.max_examples_per_slot)
    records = finalize_slots(slots, args.max_evidence_refs_per_slot)
    jsonl_path.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
    summary = summarize(records, {
        "observedMentionsPath": args.observed_mentions,
        "stableKnowledgePath": args.stable_knowledge,
        "relationshipEvidencePath": args.relationship_evidence,
    })
    write_json(summary_path, summary)
    md_path.write_text(render_markdown(summary, records), encoding="utf-8")
    print(f"[build_event_question_seed_bank] wrote {jsonl_path}")
    print(f"[build_event_question_seed_bank] wrote {summary_path}")
    print(f"[build_event_question_seed_bank] wrote {md_path}")
    print(
        f"[build_event_question_seed_bank] slots={summary['slotCount']} "
        f"units={summary['eventQuestionSeedUnits']} coveredGenerals={summary['coveredGeneralCount']}"
    )


if __name__ == "__main__":
    main()
