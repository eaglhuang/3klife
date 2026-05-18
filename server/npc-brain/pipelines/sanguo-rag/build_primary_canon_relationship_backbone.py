from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_POLICY_PATH = Path("server/npc-brain/data/sanguo/policies/policy-primary-canon-relationship-backbone.json")
DEFAULT_CLAIMS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-claim-graph/relationship-claims.jsonl")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/primary-canon-relationship-backbone")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a primary-canon relationship backbone and classify lower-grade/external claims against it."
    )
    parser.add_argument("--policy", default=str(DEFAULT_POLICY_PATH))
    parser.add_argument("--relationship-claims", default=str(DEFAULT_CLAIMS_PATH))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line in handle:
            text = line.strip()
            if text:
                rows.append(json.loads(text))
    return rows


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


def relationship_key(row: dict[str, Any]) -> tuple[str, str, str]:
    return (
        str(row.get("fromId") or "").strip(),
        str(row.get("toId") or "").strip(),
        str(row.get("type") or "").strip(),
    )


def unordered_pair(row: dict[str, Any]) -> tuple[str, str]:
    from_id = str(row.get("fromId") or "").strip()
    to_id = str(row.get("toId") or "").strip()
    return tuple(sorted((from_id, to_id)))


def is_primary_backbone_claim(
    row: dict[str, Any],
    *,
    primary_families: set[str],
    primary_grades: set[str],
) -> bool:
    return (
        str(row.get("claimGrade") or "").strip() in primary_grades
        and str(row.get("sourceFamily") or "").strip() in primary_families
        and bool(str(row.get("fromId") or "").strip())
        and bool(str(row.get("toId") or "").strip())
        and bool(str(row.get("type") or "").strip())
    )


def align_claims(
    claims: list[dict[str, Any]],
    backbone: list[dict[str, Any]],
    *,
    primary_grades: set[str],
) -> list[dict[str, Any]]:
    by_exact: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    by_pair: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in backbone:
        by_exact[relationship_key(row)].append(row)
        by_pair[unordered_pair(row)].append(row)

    alignment: list[dict[str, Any]] = []
    for row in claims:
        grade = str(row.get("claimGrade") or "").strip()
        if grade in primary_grades:
            continue
        key = relationship_key(row)
        pair = unordered_pair(row)
        exact_matches = by_exact.get(key) or []
        pair_matches = by_pair.get(pair) or []
        if exact_matches:
            status = "exact-support"
            matched = exact_matches
        elif pair_matches:
            status = "pair-type-conflict"
            matched = pair_matches
        else:
            status = "no-primary-canon-match"
            matched = []
        alignment.append(
            {
                "claimId": row.get("claimId"),
                "fromId": row.get("fromId"),
                "toId": row.get("toId"),
                "type": row.get("type"),
                "claimGrade": grade,
                "sourceFamily": row.get("sourceFamily"),
                "sourceLayer": row.get("sourceLayer"),
                "sourcePolicyId": row.get("sourcePolicyId"),
                "alignmentStatus": status,
                "matchedPrimaryCanonClaimIds": [match.get("claimId") for match in matched[:12] if match.get("claimId")],
                "matchedPrimaryCanonTypes": sorted({str(match.get("type") or "") for match in matched if match.get("type")}),
            }
        )
    return alignment


def build_gap_queue(
    claims: list[dict[str, Any]],
    backbone: list[dict[str, Any]],
    alignment: list[dict[str, Any]],
    *,
    policy: dict[str, Any],
) -> list[dict[str, Any]]:
    gap_policy = policy.get("gapQueue") if isinstance(policy.get("gapQueue"), dict) else {}
    target = int(gap_policy.get("targetPrimaryCanonClaimsPerGeneral") or 3)
    max_rows = int(gap_policy.get("maxRows") or 250)
    missing_weight = float(gap_policy.get("missingCanonWeight") or 3.0)
    conflict_weight = float(gap_policy.get("conflictWeight") or 2.0)
    unmatched_weight = float(gap_policy.get("unmatchedExternalWeight") or 1.0)

    all_counts: Counter[str] = Counter()
    primary_counts: Counter[str] = Counter()
    conflict_counts: Counter[str] = Counter()
    unmatched_counts: Counter[str] = Counter()
    family_counts: dict[str, Counter[str]] = defaultdict(Counter)

    for row in claims:
        for key in ("fromId", "toId"):
            general_id = str(row.get(key) or "").strip()
            if general_id:
                all_counts[general_id] += 1
                family = str(row.get("sourceFamily") or "").strip() or "unknown"
                family_counts[general_id][family] += 1

    for row in backbone:
        for key in ("fromId", "toId"):
            general_id = str(row.get(key) or "").strip()
            if general_id:
                primary_counts[general_id] += 1

    for row in alignment:
        status = str(row.get("alignmentStatus") or "")
        for key in ("fromId", "toId"):
            general_id = str(row.get(key) or "").strip()
            if not general_id:
                continue
            if status == "pair-type-conflict":
                conflict_counts[general_id] += 1
            elif status == "no-primary-canon-match":
                unmatched_counts[general_id] += 1

    queue: list[dict[str, Any]] = []
    for general_id, total_count in all_counts.items():
        primary_count = primary_counts[general_id]
        missing = max(target - primary_count, 0)
        conflict = conflict_counts[general_id]
        unmatched = unmatched_counts[general_id]
        priority = missing * missing_weight + conflict * conflict_weight + unmatched * unmatched_weight
        if priority <= 0:
            continue
        queue.append(
            {
                "generalId": general_id,
                "priorityScore": round(priority, 3),
                "primaryCanonClaimCount": primary_count,
                "allRelationshipClaimCount": total_count,
                "missingPrimaryCanonClaimTarget": missing,
                "pairTypeConflictCount": conflict,
                "noPrimaryCanonMatchCount": unmatched,
                "topSourceFamilies": dict(family_counts[general_id].most_common(8)),
                "recommendedAction": "run-primary-corpus-relationship-extraction",
            }
        )
    queue.sort(
        key=lambda row: (
            -float(row["priorityScore"]),
            -int(row["pairTypeConflictCount"]),
            -int(row["noPrimaryCanonMatchCount"]),
            str(row["generalId"]),
        )
    )
    return queue[:max_rows]


def render_report(summary: dict[str, Any], gap_queue: list[dict[str, Any]]) -> str:
    metrics = summary["metrics"]
    lines = [
        "# Primary Canon Relationship Backbone Report",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- Claim Count: `{metrics['claimCount']}`",
        f"- Primary Backbone Count: `{metrics['primaryBackboneCount']}`",
        f"- Alignment Row Count: `{metrics['alignmentRowCount']}`",
        "",
        "## Backbone Counts",
        "",
        f"- By Grade: `{json.dumps(metrics['primaryBackboneByGrade'], ensure_ascii=False, sort_keys=True)}`",
        f"- By Source Family: `{json.dumps(metrics['primaryBackboneBySourceFamily'], ensure_ascii=False, sort_keys=True)}`",
        f"- Covered General Count: `{metrics['primaryCoveredGeneralCount']}`",
        "",
        "## Alignment Counts",
        "",
        f"- `{json.dumps(metrics['alignmentStatusCounts'], ensure_ascii=False, sort_keys=True)}`",
        "",
        "## Top Gap Queue",
        "",
    ]
    for row in gap_queue[:25]:
        lines.append(
            f"- `{row['generalId']}` priority={row['priorityScore']} "
            f"primary={row['primaryCanonClaimCount']} conflict={row['pairTypeConflictCount']} "
            f"unmatched={row['noPrimaryCanonMatchCount']}"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    policy_path = Path(args.policy)
    claims_path = Path(args.relationship_claims)
    output_root = Path(args.output_root)
    policy = read_json(policy_path)
    output_files = policy.get("outputFiles") if isinstance(policy.get("outputFiles"), dict) else {}
    primary_families = {str(item).strip() for item in policy.get("primarySourceFamilies") or [] if str(item).strip()}
    primary_grades = {str(item).strip() for item in policy.get("primaryCanonGrades") or [] if str(item).strip()}
    if not primary_families:
        raise ValueError("primarySourceFamilies cannot be empty")
    if not primary_grades:
        raise ValueError("primaryCanonGrades cannot be empty")

    output_root.mkdir(parents=True, exist_ok=True)
    output_paths = {
        "backbone": output_root / str(output_files.get("backbone") or "primary-canon-relationship-backbone.jsonl"),
        "alignment": output_root / str(output_files.get("alignment") or "primary-canon-external-alignment.jsonl"),
        "gapQueue": output_root / str(output_files.get("gapQueue") or "primary-canon-gap-queue.jsonl"),
        "summary": output_root / str(output_files.get("summary") or "primary-canon-relationship-backbone-summary.json"),
        "report": output_root / str(output_files.get("report") or "primary-canon-relationship-backbone-report.md"),
    }
    if not args.overwrite:
        existing = [path for path in output_paths.values() if path.exists()]
        if existing:
            raise FileExistsError(f"outputs already exist; re-run with --overwrite: {existing[0]}")

    claims = read_jsonl(claims_path)
    backbone = [row for row in claims if is_primary_backbone_claim(row, primary_families=primary_families, primary_grades=primary_grades)]
    alignment = align_claims(claims, backbone, primary_grades=primary_grades)
    gap_queue = build_gap_queue(claims, backbone, alignment, policy=policy)

    primary_general_ids = {
        str(row.get(key) or "").strip()
        for row in backbone
        for key in ("fromId", "toId")
        if str(row.get(key) or "").strip()
    }
    summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "primary-canon-relationship-backbone",
        "canonicalWrites": False,
        "inputs": {
            "policyPath": str(policy_path),
            "relationshipClaimsPath": str(claims_path),
        },
        "outputs": {key: str(path) for key, path in output_paths.items()},
        "policy": {
            "primarySourceFamilies": sorted(primary_families),
            "primaryCanonGrades": sorted(primary_grades),
            "policyText": policy.get("policyText") or {},
        },
        "metrics": {
            "claimCount": len(claims),
            "primaryBackboneCount": len(backbone),
            "alignmentRowCount": len(alignment),
            "gapQueueCount": len(gap_queue),
            "primaryCoveredGeneralCount": len(primary_general_ids),
            "primaryBackboneByGrade": dict(sorted(Counter(str(row.get("claimGrade") or "unknown") for row in backbone).items())),
            "primaryBackboneBySourceFamily": dict(sorted(Counter(str(row.get("sourceFamily") or "unknown") for row in backbone).items())),
            "primaryBackboneByType": dict(sorted(Counter(str(row.get("type") or "unknown") for row in backbone).items())),
            "alignmentStatusCounts": dict(sorted(Counter(str(row.get("alignmentStatus") or "unknown") for row in alignment).items())),
        },
    }

    write_jsonl(output_paths["backbone"], backbone)
    write_jsonl(output_paths["alignment"], alignment)
    write_jsonl(output_paths["gapQueue"], gap_queue)
    write_json(output_paths["summary"], summary)
    output_paths["report"].write_text(render_report(summary, gap_queue), encoding="utf-8")
    print(f"[build_primary_canon_relationship_backbone] wrote {output_paths['summary']}")
    print(f"[build_primary_canon_relationship_backbone] primaryBackboneCount={len(backbone)} gapQueueCount={len(gap_queue)}")


if __name__ == "__main__":
    main()
