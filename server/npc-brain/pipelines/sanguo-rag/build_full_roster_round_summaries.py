from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from relationship_type_refinement import KINSHIP_RELATIONSHIP_TYPES, relationship_type_family
from repo_layout import resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/full-roster-round-summaries")
LANE_PRIORITY = ("runtime-readiness", "deterministic-repair", "seed-to-card", "rumination", "evidence-discovery")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build full roster scoreboard, bottleneck delta, and next-lane summaries.")
    parser.add_argument("--round-id", default=None)
    parser.add_argument("--scoreboard-json", required=True)
    parser.add_argument("--progress-json", default=None)
    parser.add_argument("--baseline-scoreboard-json", default=None)
    parser.add_argument("--baseline-progress-json", default=None)
    parser.add_argument("--relationship-evidence-jsonl", default=None)
    parser.add_argument("--baseline-relationship-evidence-jsonl", default=None)
    parser.add_argument("--item-relationship-overlay-summary", default=None)
    parser.add_argument("--runtime-readiness-summary", default=None)
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path | None) -> Path | None:
    if not path_text:
        return None
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path | None) -> dict[str, Any]:
    if not path or not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    return payload if isinstance(payload, dict) else {}


def read_jsonl(path: Path | None) -> list[dict[str, Any]]:
    if not path or not path.exists():
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


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as fp:
        for row in rows:
            fp.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def write_text(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")


def jsonl_mirror_rows(row_type: str, rows: list[Any], generated_at: str) -> list[dict[str, Any]]:
    mirror_rows: list[dict[str, Any]] = []
    for row_index, row in enumerate(rows):
        payload = row if isinstance(row, dict) else {"value": row}
        mirror_row = dict(payload)
        mirror_row["rowType"] = row_type
        mirror_row["rowIndex"] = row_index
        mirror_row["generatedAt"] = generated_at
        mirror_rows.append(mirror_row)
    return mirror_rows


def bottleneck_metric_rows(
    *,
    row_type: str,
    metric_group: str,
    values: Any,
    generated_at: str,
    start_index: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if isinstance(values, dict):
        iterable = list(values.items())
    elif isinstance(values, list):
        iterable = list(enumerate(values))
    else:
        iterable = []
    for offset, (name, value) in enumerate(iterable):
        payload = value if isinstance(value, dict) else {"value": value}
        metric_name = (
            payload.get("metricName")
            or payload.get("component")
            or payload.get("name")
            or payload.get("lane")
            or payload.get("relationshipType")
            or payload.get("relationshipFamily")
            or str(name)
        )
        rows.append(
            {
                "rowType": row_type,
                "rowIndex": start_index + offset,
                "generatedAt": generated_at,
                "metricGroup": metric_group,
                "metricName": metric_name,
                "baseline": payload.get("baseline"),
                "current": payload.get("current"),
                "delta": payload.get("delta"),
                "value": payload.get("value", value if not isinstance(value, dict) else payload.get("delta")),
                "payload": payload,
            }
        )
    return rows


def bottleneck_delta_jsonl_rows(bottleneck_delta: dict[str, Any]) -> list[dict[str, Any]]:
    generated_at = str(bottleneck_delta.get("generatedAt", ""))
    metrics = bottleneck_delta.get("metrics", {})
    rows: list[dict[str, Any]] = []
    for row_type, metric_group in [
        ("progressComponent", "progressComponentDeltas"),
        ("laneCount", "laneCountDeltas"),
        ("relationshipType", "relationshipTypeDeltas"),
        ("relationshipFamily", "relationshipFamilyDeltas"),
    ]:
        rows.extend(
            bottleneck_metric_rows(
                row_type=row_type,
                metric_group=metric_group,
                values=metrics.get(metric_group, {}),
                generated_at=generated_at,
                start_index=len(rows),
            )
        )
    for point in metrics.get("pressurePoints", []):
        payload = point if isinstance(point, dict) else {"value": point}
        metric_name = payload.get("metricName") or payload.get("type") or payload.get("name") or payload.get("reason") or f"pressurePoint:{len(rows)}"
        rows.append(
            {
                "rowType": "pressurePoint",
                "rowIndex": len(rows),
                "generatedAt": generated_at,
                "metricGroup": "pressurePoints",
                "metricName": metric_name,
                "baseline": None,
                "current": None,
                "delta": None,
                "value": None,
                "payload": payload,
            }
        )
    return rows


def to_float(value: Any, default: float | None = None) -> float | None:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def to_int(value: Any, default: int | None = None) -> int | None:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def format_delta(value: Any) -> str:
    numeric = to_float(value, None)
    if numeric is None:
        return "-"
    return f"{numeric:+.2f}"


def extract_progress_summary(payload: dict[str, Any]) -> dict[str, Any]:
    completion = payload.get("completion") if isinstance(payload.get("completion"), dict) else {}
    raw_scores = completion.get("rawScores") if isinstance(completion.get("rawScores"), dict) else {}
    weighted_points = completion.get("weightedPoints") if isinstance(completion.get("weightedPoints"), dict) else {}
    weights = completion.get("weights") if isinstance(completion.get("weights"), dict) else {}
    observed_counts = completion.get("observedCounts") if isinstance(completion.get("observedCounts"), dict) else {}
    targets = completion.get("targets") if isinstance(completion.get("targets"), dict) else {}
    return {
        "overallPercent": to_float(completion.get("overallPercent"), to_float(payload.get("overallPercent"), 0.0) or 0.0) or 0.0,
        "rawScores": {str(key): to_float(value, 0.0) or 0.0 for key, value in raw_scores.items()},
        "weightedPoints": {str(key): to_float(value, 0.0) or 0.0 for key, value in weighted_points.items()},
        "weights": {str(key): to_float(value, 0.0) or 0.0 for key, value in weights.items()},
        "observedCounts": observed_counts,
        "targets": targets,
    }


def extract_scoreboard_views(payload: dict[str, Any]) -> dict[str, Any]:
    rows = payload.get("rows") if isinstance(payload.get("rows"), list) else []
    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    canonical_rows = [row for row in rows if isinstance(row, dict) and str(row.get("rosterState") or "") == "canonical"]
    shadow_rows = [row for row in rows if isinstance(row, dict) and str(row.get("rosterState") or "") == "shadow"]

    def sort_key(row: dict[str, Any]) -> tuple[Any, ...]:
        return (
            -to_float(row.get("priorityScore"), 0.0),
            -to_float(row.get("worldbuildingUsabilityScore"), 0.0),
            -to_float(row.get("historicalTrustScore"), 0.0),
            str(row.get("generalId") or ""),
        )

    lane_counts = Counter(str(row.get("nextLane") or "unknown") for row in rows if isinstance(row, dict))
    canonical_lane_counts = Counter(str(row.get("nextLane") or "unknown") for row in canonical_rows)
    shadow_lane_counts = Counter(str(row.get("nextLane") or "unknown") for row in shadow_rows)
    return {
        "rows": rows,
        "metrics": metrics,
        "canonicalRows": sorted(canonical_rows, key=sort_key),
        "shadowRows": sorted(shadow_rows, key=sort_key),
        "laneCounts": dict(sorted(lane_counts.items())),
        "canonicalLaneCounts": dict(sorted(canonical_lane_counts.items())),
        "shadowLaneCounts": dict(sorted(shadow_lane_counts.items())),
    }


def simplify_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "generalId": row.get("generalId"),
        "displayName": row.get("displayName"),
        "rosterState": row.get("rosterState"),
        "reviewGrade": row.get("reviewGrade"),
        "gradeType": row.get("gradeType"),
        "nextLane": row.get("nextLane"),
        "priorityScore": row.get("priorityScore"),
        "historicalTrustScore": row.get("historicalTrustScore"),
        "worldbuildingUsabilityScore": row.get("worldbuildingUsabilityScore"),
        "missingFields": list(row.get("missingFields") or []),
    }


def summarize_relationship_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    relationship_type_counts: Counter[str] = Counter()
    relationship_family_counts: Counter[str] = Counter()
    kinship_type_counts: Counter[str] = Counter()
    item_type_counts: Counter[str] = Counter()
    covered_general_ids: set[str] = set()

    for row in rows:
        if not isinstance(row, dict):
            continue
        relation_type = str(row.get("type") or "").strip()
        if not relation_type:
            continue
        for key in ("fromId", "toId"):
            general_id = str(row.get(key) or "").strip()
            if general_id:
                covered_general_ids.add(general_id)
        if relation_type.startswith("item_"):
            item_type_counts[relation_type] += 1
            continue
        relationship_type_counts[relation_type] += 1
        family = relationship_type_family(relation_type)
        relationship_family_counts[family] += 1
        if relation_type in KINSHIP_RELATIONSHIP_TYPES:
            kinship_type_counts[relation_type] += 1

    return {
        "rowCount": len(rows),
        "coveredGeneralCount": len(covered_general_ids),
        "coveredGeneralIds": sorted(covered_general_ids),
        "relationshipTypeCounts": dict(sorted(relationship_type_counts.items())),
        "relationshipFamilyCounts": dict(sorted(relationship_family_counts.items())),
        "kinshipRelationshipTypeCounts": dict(sorted(kinship_type_counts.items())),
        "itemRelationshipTypeCounts": dict(sorted(item_type_counts.items())),
    }


def summarize_item_overlay(payload: dict[str, Any]) -> dict[str, Any]:
    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    return {
        "sourceCapTrimmedCount": to_int(metrics.get("sourceCapTrimmedCount"), 0) or 0,
        "sourceCapTrimmedBySource": metrics.get("sourceCapTrimmedBySource") if isinstance(metrics.get("sourceCapTrimmedBySource"), dict) else {},
        "sourceCapBySource": metrics.get("sourceCapBySource") if isinstance(metrics.get("sourceCapBySource"), dict) else {},
        "sourceClassCounts": metrics.get("sourceClassCounts") if isinstance(metrics.get("sourceClassCounts"), dict) else {},
        "trustTierCounts": metrics.get("trustTierCounts") if isinstance(metrics.get("trustTierCounts"), dict) else {},
        "primaryTextSourceCount": to_int(metrics.get("primaryTextSourceCount"), 0) or 0,
        "primaryTextPacketCount": to_int(metrics.get("primaryTextPacketCount"), 0) or 0,
        "primaryTextEdgeCountBeforeCap": to_int(metrics.get("primaryTextEdgeCountBeforeCap"), 0) or 0,
        "primaryTextEdgeCount": to_int(metrics.get("primaryTextEdgeCount"), 0) or 0,
        "primaryTextTrimmedCount": to_int(metrics.get("primaryTextTrimmedCount"), 0) or 0,
        "primaryTextSources": list(metrics.get("primaryTextSources") or []),
        "packetInputCount": to_int(metrics.get("packetInputCount"), 0) or 0,
        "itemPacketCount": to_int(metrics.get("itemPacketCount"), 0) or 0,
        "edgeCount": to_int(metrics.get("edgeCount"), 0) or 0,
    }


def summarize_runtime(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "summaryPath": payload.get("summaryPath"),
        "primarySummaryPath": payload.get("primarySummaryPath"),
        "mode": payload.get("mode"),
        "enabled": bool(payload.get("enabled")) if "enabled" in payload else None,
        "runtimeMode": payload.get("runtimeMode") or payload.get("mode"),
        "returnCode": to_int(payload.get("returnCode"), 0) or 0,
        "statusCounts": payload.get("statusCounts") if isinstance(payload.get("statusCounts"), dict) else {},
        "failCount": to_int(payload.get("failCount"), 0) or 0,
        "warnCount": to_int(payload.get("warnCount"), 0) or 0,
        "primaryFailCount": to_int(payload.get("primaryFailCount"), 0) or 0,
        "refBlitzApplied": bool(payload.get("refBlitzApplied")),
        "refBlitzReason": str(payload.get("refBlitzReason") or ""),
        "refBlitzFailGeneralCount": to_int(payload.get("refBlitzFailGeneralCount"), 0) or 0,
        "refBlitzResolvedCount": to_int(payload.get("refBlitzResolvedCount"), 0) or 0,
        "refBlitzUnresolvedCount": to_int(payload.get("refBlitzUnresolvedCount"), 0) or 0,
        "refBlitzSyntheticEventCount": to_int(payload.get("refBlitzSyntheticEventCount"), 0) or 0,
        "refBlitzRuntimeProfileRoot": payload.get("refBlitzRuntimeProfileRoot"),
        "refBlitzRerunSummaryPath": payload.get("refBlitzRerunSummaryPath"),
        "refBlitzSyntheticEventsPath": payload.get("refBlitzSyntheticEventsPath"),
        "refBlitzNoPacketGenerals": list(payload.get("refBlitzNoPacketGenerals") or []),
        "refBlitzCreatedPerGeneral": payload.get("refBlitzCreatedPerGeneral") if isinstance(payload.get("refBlitzCreatedPerGeneral"), dict) else {},
    }


def merged_counter_delta(current: dict[str, int], baseline: dict[str, int]) -> dict[str, int]:
    keys = sorted(set(current) | set(baseline))
    return {key: int(current.get(key, 0)) - int(baseline.get(key, 0)) for key in keys}


def build_pressure_points(
    *,
    progress_current: dict[str, Any],
    progress_baseline: dict[str, Any],
    scoreboard_current: dict[str, Any],
    scoreboard_baseline: dict[str, Any],
    runtime_current: dict[str, Any],
    item_overlay_current: dict[str, Any],
) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []

    current_raw_scores = progress_current.get("rawScores") if isinstance(progress_current.get("rawScores"), dict) else {}
    baseline_raw_scores = progress_baseline.get("rawScores") if isinstance(progress_baseline.get("rawScores"), dict) else {}
    current_weights = progress_current.get("weights") if isinstance(progress_current.get("weights"), dict) else {}
    for name in sorted(set(current_raw_scores) | set(baseline_raw_scores)):
        current_value = to_float(current_raw_scores.get(name), None)
        baseline_value = to_float(baseline_raw_scores.get(name), None)
        points.append(
            {
                "kind": "progress-component",
                "name": name,
                "baseline": baseline_value,
                "current": current_value,
                "delta": None if current_value is None or baseline_value is None else round(current_value - baseline_value, 4),
                "weight": to_float(current_weights.get(name), None),
            }
        )

    current_lane_counts = scoreboard_current.get("canonicalLaneCounts") if isinstance(scoreboard_current.get("canonicalLaneCounts"), dict) else {}
    baseline_lane_counts = scoreboard_baseline.get("canonicalLaneCounts") if isinstance(scoreboard_baseline.get("canonicalLaneCounts"), dict) else {}
    for lane in sorted(set(current_lane_counts) | set(baseline_lane_counts)):
        current_value = to_int(current_lane_counts.get(lane), 0) or 0
        baseline_value = to_int(baseline_lane_counts.get(lane), 0) or 0
        points.append(
            {
                "kind": "lane-pressure",
                "name": lane,
                "baseline": baseline_value,
                "current": current_value,
                "delta": current_value - baseline_value,
            }
        )

    points.append(
        {
            "kind": "runtime-blocker",
            "name": "runtime-readiness",
            "baseline": None,
            "current": runtime_current.get("failCount"),
            "delta": runtime_current.get("failCount"),
            "reason": runtime_current.get("refBlitzReason"),
            "applied": runtime_current.get("refBlitzApplied"),
            "resolved": runtime_current.get("refBlitzResolvedCount"),
            "unresolved": runtime_current.get("refBlitzUnresolvedCount"),
        }
    )
    points.append(
        {
            "kind": "source-cap",
            "name": "primary-text-cap",
            "baseline": None,
            "current": item_overlay_current.get("primaryTextTrimmedCount"),
            "delta": None,
            "sources": item_overlay_current.get("primaryTextSourceCount"),
        }
    )
    return sorted(
        points,
        key=lambda item: (
            0 if item.get("kind") == "runtime-blocker" else 1 if item.get("kind") == "progress-component" else 2 if item.get("kind") == "lane-pressure" else 3,
            to_float(item.get("current"), 0.0) if item.get("kind") == "progress-component" else -to_float(item.get("current"), 0.0),
            str(item.get("name") or ""),
        ),
    )


def choose_next_route(runtime_current: dict[str, Any], canonical_lane_counts: dict[str, int], lane_counts: dict[str, int]) -> str:
    if int(runtime_current.get("failCount") or 0) > 0:
        return "runtime-readiness"
    if canonical_lane_counts:
        return max(
            canonical_lane_counts.items(),
            key=lambda item: (
                int(item[1]),
                -LANE_PRIORITY.index(item[0]) if item[0] in LANE_PRIORITY else -len(LANE_PRIORITY),
            ),
        )[0]
    if lane_counts:
        return max(
            lane_counts.items(),
            key=lambda item: (
                int(item[1]),
                -LANE_PRIORITY.index(item[0]) if item[0] in LANE_PRIORITY else -len(LANE_PRIORITY),
            ),
        )[0]
    return "evidence-discovery"


def top_lane_rows(rows: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    sorted_rows = sorted(
        rows,
        key=lambda row: (
            -to_float(row.get("priorityScore"), 0.0),
            -to_float(row.get("worldbuildingUsabilityScore"), 0.0),
            -to_float(row.get("historicalTrustScore"), 0.0),
            str(row.get("generalId") or ""),
        ),
    )
    return [simplify_row(row) for row in sorted_rows[:limit]]


def build_bottleneck_delta(
    *,
    round_id: str | None,
    scoreboard_current: dict[str, Any],
    scoreboard_baseline: dict[str, Any],
    progress_current: dict[str, Any],
    progress_baseline: dict[str, Any],
    relationship_current: dict[str, Any],
    relationship_baseline: dict[str, Any],
    runtime_current: dict[str, Any],
    item_overlay_current: dict[str, Any],
) -> dict[str, Any]:
    current_raw_scores = progress_current.get("rawScores") if isinstance(progress_current.get("rawScores"), dict) else {}
    baseline_raw_scores = progress_baseline.get("rawScores") if isinstance(progress_baseline.get("rawScores"), dict) else {}
    current_lane_counts = scoreboard_current.get("canonicalLaneCounts") if isinstance(scoreboard_current.get("canonicalLaneCounts"), dict) else {}
    baseline_lane_counts = scoreboard_baseline.get("canonicalLaneCounts") if isinstance(scoreboard_baseline.get("canonicalLaneCounts"), dict) else {}

    progress_deltas: dict[str, dict[str, Any]] = {}
    for name in sorted(set(current_raw_scores) | set(baseline_raw_scores)):
        current_value = to_float(current_raw_scores.get(name), None)
        baseline_value = to_float(baseline_raw_scores.get(name), None)
        progress_deltas[name] = {
            "baseline": baseline_value,
            "current": current_value,
            "delta": None if current_value is None or baseline_value is None else round(current_value - baseline_value, 4),
            "weight": (progress_current.get("weights") or {}).get(name),
        }

    lane_deltas = merged_counter_delta(
        {key: int(value) for key, value in current_lane_counts.items()},
        {key: int(value) for key, value in baseline_lane_counts.items()},
    )

    relationship_type_deltas = merged_counter_delta(
        {key: int(value) for key, value in (relationship_current.get("relationshipTypeCounts") or {}).items()},
        {key: int(value) for key, value in (relationship_baseline.get("relationshipTypeCounts") or {}).items()},
    )
    relationship_family_deltas = merged_counter_delta(
        {key: int(value) for key, value in (relationship_current.get("relationshipFamilyCounts") or {}).items()},
        {key: int(value) for key, value in (relationship_baseline.get("relationshipFamilyCounts") or {}).items()},
    )

    pressure_points = build_pressure_points(
        progress_current=progress_current,
        progress_baseline=progress_baseline,
        scoreboard_current=scoreboard_current,
        scoreboard_baseline=scoreboard_baseline,
        runtime_current=runtime_current,
        item_overlay_current=item_overlay_current,
    )

    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-bottleneck-delta",
        "canonicalWrites": False,
        "roundId": round_id,
        "metrics": {
            "overallPercentBaseline": progress_baseline.get("overallPercent"),
            "overallPercentCurrent": progress_current.get("overallPercent"),
            "overallPercentDelta": None
            if progress_baseline.get("overallPercent") is None
            or progress_current.get("overallPercent") is None
            else round(float(progress_current.get("overallPercent") or 0.0) - float(progress_baseline.get("overallPercent") or 0.0), 2),
            "progressComponentDeltas": progress_deltas,
            "laneCountDeltas": lane_deltas,
            "relationshipTypeDeltas": relationship_type_deltas,
            "relationshipFamilyDeltas": relationship_family_deltas,
            "runtimeReadiness": runtime_current,
            "primaryTextCap": item_overlay_current,
            "pressurePoints": pressure_points[:12],
        },
    }


def build_next_lane_summary(
    *,
    round_id: str | None,
    scoreboard_current: dict[str, Any],
    runtime_current: dict[str, Any],
) -> dict[str, Any]:
    rows = list(scoreboard_current.get("rows") or [])
    canonical_rows = list(scoreboard_current.get("canonicalRows") or [])
    shadow_rows = list(scoreboard_current.get("shadowRows") or [])
    lane_counts = dict(scoreboard_current.get("laneCounts") or {})
    canonical_lane_counts = dict(scoreboard_current.get("canonicalLaneCounts") or {})
    shadow_lane_counts = dict(scoreboard_current.get("shadowLaneCounts") or {})
    next_route = choose_next_route(runtime_current, canonical_lane_counts, lane_counts)

    lane_groups: list[dict[str, Any]] = []
    lane_order = sorted(
        set(lane_counts) | set(canonical_lane_counts) | set(shadow_lane_counts),
        key=lambda lane: (
            -int(canonical_lane_counts.get(lane, 0)),
            -int(lane_counts.get(lane, 0)),
            LANE_PRIORITY.index(lane) if lane in LANE_PRIORITY else len(LANE_PRIORITY),
            lane,
        ),
    )
    for lane in lane_order:
        lane_rows = [row for row in rows if str(row.get("nextLane") or "") == lane]
        lane_groups.append(
            {
                "lane": lane,
                "overallCount": int(lane_counts.get(lane, 0)),
                "canonicalCount": int(canonical_lane_counts.get(lane, 0)),
                "shadowCount": int(shadow_lane_counts.get(lane, 0)),
                "topGenerals": top_lane_rows(lane_rows, limit=5),
            }
        )

    runtime_fail_count = int(runtime_current.get("failCount") or 0)
    if runtime_fail_count > 0:
        runtime_reason = str(runtime_current.get("refBlitzReason") or "runtime-blocker")
        if runtime_current.get("refBlitzApplied"):
            next_action = (
                f"Resolve the remaining {runtime_current.get('refBlitzUnresolvedCount') or runtime_fail_count} runtime fail generals "
                f"after ref-blitz resolved {runtime_current.get('refBlitzResolvedCount') or 0}."
            )
        else:
            next_action = f"Fix runtime readiness fail rows first; ref-blitz state is {runtime_reason}."
    elif next_route == "deterministic-repair":
        next_action = "Drain the deterministic-repair lane and keep missing location / relationshipEdges in check."
    elif next_route == "seed-to-card":
        next_action = "Push seed-to-card coverage for shadow roster entries with high evidence value."
    elif next_route == "rumination":
        next_action = "Clear rumination backlog and keep the residual signature moving."
    else:
        next_action = "Continue the evidence-discovery lane and widen source coverage."

    dominant_lane = (
        max(
            lane_counts.items(),
            key=lambda item: (
                int(item[1]),
                -LANE_PRIORITY.index(item[0]) if item[0] in LANE_PRIORITY else -len(LANE_PRIORITY),
                item[0],
            ),
        )[0]
        if lane_counts
        else "evidence-discovery"
    )
    dominant_canonical_lane = (
        max(
            canonical_lane_counts.items(),
            key=lambda item: (
                int(item[1]),
                -LANE_PRIORITY.index(item[0]) if item[0] in LANE_PRIORITY else -len(LANE_PRIORITY),
                item[0],
            ),
        )[0]
        if canonical_lane_counts
        else None
    )

    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-next-lane-summary",
        "canonicalWrites": False,
        "roundId": round_id,
        "metrics": {
            "nextRoute": next_route,
            "nextRecommendedAction": next_action,
            "dominantLane": dominant_lane,
            "dominantCanonicalLane": dominant_canonical_lane,
            "runtimeReadiness": runtime_current,
            "laneCounts": lane_counts,
            "canonicalLaneCounts": canonical_lane_counts,
            "shadowLaneCounts": shadow_lane_counts,
            "laneGroups": lane_groups,
        },
    }


def render_scoreboard_md(summary: dict[str, Any]) -> str:
    metrics = summary.get("metrics") or {}
    lines = [
        "# Full Roster Scoreboard Summary",
        "",
        f"- Run ID: `{summary.get('roundId') or '-'}`",
        f"- Generated At: `{summary.get('generatedAt')}`",
        f"- Scoreboard JSON: `{summary.get('inputs', {}).get('scoreboardJsonPath')}`",
        f"- Progress JSON: `{summary.get('inputs', {}).get('progressJsonPath') or '-'}`",
        f"- Runtime Readiness: `{summary.get('inputs', {}).get('runtimeReadinessSummaryPath') or '-'}`",
        f"- Item Overlay Summary: `{summary.get('inputs', {}).get('itemRelationshipOverlaySummaryPath') or '-'}`",
        f"- Row Count: `{metrics.get('rowCount')}`",
        f"- Grade Counts: `{metrics.get('gradeCounts')}`",
        f"- Lane Counts: `{metrics.get('laneCounts')}`",
        f"- Avg Historical Trust: `{metrics.get('avgHistoricalTrustScore')}`",
        f"- Avg Worldbuilding Usability: `{metrics.get('avgWorldbuildingUsabilityScore')}`",
        f"- Runtime Fail Count: `{metrics.get('runtimeReadinessFailCount')}`",
        f"- Runtime Ref-Blitz: `{metrics.get('runtimeRefBlitzApplied')}` / `{metrics.get('runtimeRefBlitzReason')}`",
        f"- Primary Text Trimmed: `{metrics.get('primaryTextTrimmedCount')}`",
        "",
        "## Relationship Breakdown",
        "",
    ]
    for key, value in (metrics.get("relationshipTypeCounts") or {}).items():
        lines.append(f"- `{key}`: `{value}`")
    if metrics.get("itemRelationshipTypeCounts"):
        lines.extend(["", "## Item Relationship Types", ""])
        for key, value in (metrics.get("itemRelationshipTypeCounts") or {}).items():
            lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Relationship Families", ""])
    for key, value in (metrics.get("relationshipFamilyCounts") or {}).items():
        lines.append(f"- `{key}`: `{value}`")
    lines.extend(["", "## Primary Text Cap", ""])
    lines.append(f"- Source Count: `{metrics.get('primaryTextSourceCount')}`")
    lines.append(f"- Packet Count: `{metrics.get('primaryTextPacketCount')}`")
    lines.append(f"- Edges Before Cap: `{metrics.get('primaryTextEdgeCountBeforeCap')}`")
    lines.append(f"- Final Edges: `{metrics.get('primaryTextEdgeCount')}`")
    lines.append(f"- Trimmed: `{metrics.get('primaryTextTrimmedCount')}`")
    lines.extend(["", "## Top Canonical Rows", "", "| General | Name | Grade | Lane | Priority | H-Score | W-Score | Missing Fields |", "|---|---|---|---|---:|---:|---:|---|"])
    for row in summary.get("topCanonicalRows") or []:
        lines.append(
            "| `{gid}` | {name} | `{grade}` | `{lane}` | `{priority}` | `{h}` | `{w}` | `{missing}` |".format(
                gid=row.get("generalId"),
                name=str(row.get("displayName") or "").replace("|", "\\|"),
                grade=row.get("gradeType") or row.get("reviewGrade") or "-",
                lane=row.get("nextLane") or "-",
                priority=row.get("priorityScore") or 0,
                h=row.get("historicalTrustScore") or 0,
                w=row.get("worldbuildingUsabilityScore") or 0,
                missing=",".join(row.get("missingFields") or []) or "-",
            )
        )
    lines.append("")
    return "\n".join(lines)


def render_bottleneck_md(summary: dict[str, Any]) -> str:
    metrics = summary.get("metrics") or {}
    lines = [
        "# Full Roster Bottleneck Delta",
        "",
        f"- Run ID: `{summary.get('roundId') or '-'}`",
        f"- Generated At: `{summary.get('generatedAt')}`",
        f"- Baseline Overall: `{metrics.get('overallPercentBaseline')}`",
        f"- Current Overall: `{metrics.get('overallPercentCurrent')}`",
        f"- Overall Delta: `{format_delta(metrics.get('overallPercentDelta'))}`",
        "",
        "## Progress Components",
        "",
        "| Component | Baseline | Current | Delta | Weight |",
        "|---|---:|---:|---:|---:|",
    ]
    for name, payload in (metrics.get("progressComponentDeltas") or {}).items():
        lines.append(
            "| `{name}` | `{baseline}` | `{current}` | `{delta}` | `{weight}` |".format(
                name=name,
                baseline=payload.get("baseline"),
                current=payload.get("current"),
                delta=format_delta(payload.get("delta")),
                weight=payload.get("weight"),
            )
        )
    lines.extend(["", "## Lane Deltas", "", "| Lane | Delta |", "|---|---:|"])
    for lane, delta in (metrics.get("laneCountDeltas") or {}).items():
        lines.append(f"| `{lane}` | `{delta}` |")
    lines.extend(["", "## Relationship Delta", "", "| Type | Delta |", "|---|---:|"])
    for relation_type, delta in (metrics.get("relationshipTypeDeltas") or {}).items():
        lines.append(f"| `{relation_type}` | `{delta}` |")
    lines.extend(["", "## Family Delta", "", "| Family | Delta |", "|---|---:|"])
    for family, delta in (metrics.get("relationshipFamilyDeltas") or {}).items():
        lines.append(f"| `{family}` | `{delta}` |")
    lines.extend(["", "## Runtime and Source Pressure", ""])
    runtime = metrics.get("runtimeReadiness") or {}
    lines.append(f"- Runtime Fail Count: `{runtime.get('failCount')}`")
    lines.append(f"- Runtime Ref-Blitz Applied: `{runtime.get('refBlitzApplied')}`")
    lines.append(f"- Runtime Ref-Blitz Reason: `{runtime.get('refBlitzReason')}`")
    lines.append(f"- Runtime Ref-Blitz Resolved: `{runtime.get('refBlitzResolvedCount')}`")
    lines.append(f"- Runtime Ref-Blitz Unresolved: `{runtime.get('refBlitzUnresolvedCount')}`")
    source_cap = metrics.get("primaryTextCap") or {}
    lines.append(f"- Primary Text Sources: `{source_cap.get('primaryTextSourceCount')}`")
    lines.append(f"- Primary Text Trimmed: `{source_cap.get('primaryTextTrimmedCount')}`")
    lines.extend(["", "## Pressure Points", "", "| Kind | Name | Baseline | Current | Delta |", "|---|---|---:|---:|---:|"])
    for item in metrics.get("pressurePoints") or []:
        lines.append(
            "| `{kind}` | `{name}` | `{baseline}` | `{current}` | `{delta}` |".format(
                kind=item.get("kind"),
                name=item.get("name"),
                baseline=item.get("baseline") if item.get("baseline") is not None else "-",
                current=item.get("current") if item.get("current") is not None else "-",
                delta=format_delta(item.get("delta")) if item.get("delta") is not None else "-",
            )
        )
    lines.append("")
    return "\n".join(lines)


def render_next_lane_md(summary: dict[str, Any]) -> str:
    metrics = summary.get("metrics") or {}
    runtime = metrics.get("runtimeReadiness") or {}
    lines = [
        "# Full Roster Next Lane Summary",
        "",
        f"- Run ID: `{summary.get('roundId') or '-'}`",
        f"- Generated At: `{summary.get('generatedAt')}`",
        f"- Next Route: `{metrics.get('nextRoute')}`",
        f"- Next Recommended Action: {metrics.get('nextRecommendedAction')}",
        f"- Dominant Lane: `{metrics.get('dominantLane')}`",
        f"- Dominant Canonical Lane: `{metrics.get('dominantCanonicalLane') or '-'}`",
        f"- Runtime Fail Count: `{runtime.get('failCount')}`",
        f"- Runtime Ref-Blitz: `{runtime.get('refBlitzApplied')}` / `{runtime.get('refBlitzReason')}`",
        "",
        "## Lane Groups",
        "",
        "| Lane | Overall | Canonical | Shadow | Top Generals |",
        "|---|---:|---:|---:|---|",
    ]
    for group in metrics.get("laneGroups") or []:
        top_generals = ", ".join(
            str(row.get("generalId") or "")
            for row in (group.get("topGenerals") or [])
            if str(row.get("generalId") or "")
        )
        lines.append(
            "| `{lane}` | `{overall}` | `{canonical}` | `{shadow}` | {top} |".format(
                lane=group.get("lane"),
                overall=group.get("overallCount"),
                canonical=group.get("canonicalCount"),
                shadow=group.get("shadowCount"),
                top=top_generals or "-",
            )
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    output_root = resolve_path(args.output_root)
    if output_root is None:
        raise ValueError("output-root is required")
    output_root.mkdir(parents=True, exist_ok=True)

    scoreboard_json = resolve_path(args.scoreboard_json)
    progress_json = resolve_path(args.progress_json)
    baseline_scoreboard_json = resolve_path(args.baseline_scoreboard_json)
    baseline_progress_json = resolve_path(args.baseline_progress_json)
    relationship_json = resolve_path(args.relationship_evidence_jsonl)
    baseline_relationship_json = resolve_path(args.baseline_relationship_evidence_jsonl)
    item_overlay_json = resolve_path(args.item_relationship_overlay_summary)
    runtime_json = resolve_path(args.runtime_readiness_summary)

    scoreboard_summary_json = output_root / "full-roster-scoreboard-summary.json"
    scoreboard_summary_md = output_root / "full-roster-scoreboard-summary.zh-TW.md"
    bottleneck_delta_json = output_root / "full-roster-bottleneck-delta.json"
    bottleneck_delta_md = output_root / "full-roster-bottleneck-delta.zh-TW.md"
    next_lane_json = output_root / "full-roster-next-lane-summary.json"
    next_lane_md = output_root / "full-roster-next-lane-summary.zh-TW.md"
    scoreboard_top_canonical_jsonl = output_root / "full-roster-scoreboard-top-canonical-rows.jsonl"
    bottleneck_deltas_jsonl = output_root / "full-roster-bottleneck-deltas.jsonl"
    next_lane_groups_jsonl = output_root / "full-roster-next-lane-groups.jsonl"
    outputs = [
        scoreboard_summary_json,
        scoreboard_summary_md,
        bottleneck_delta_json,
        bottleneck_delta_md,
        next_lane_json,
        next_lane_md,
        scoreboard_top_canonical_jsonl,
        bottleneck_deltas_jsonl,
        next_lane_groups_jsonl,
    ]
    if any(path.exists() for path in outputs) and not args.overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {output_root}")

    scoreboard_payload = read_json(scoreboard_json)
    scoreboard_views = extract_scoreboard_views(scoreboard_payload)
    progress_current = extract_progress_summary(read_json(progress_json))
    progress_baseline = extract_progress_summary(read_json(baseline_progress_json))
    relationship_current = summarize_relationship_rows(read_jsonl(relationship_json))
    relationship_baseline = summarize_relationship_rows(read_jsonl(baseline_relationship_json))
    runtime_current = summarize_runtime(read_json(runtime_json))
    item_overlay_current = summarize_item_overlay(read_json(item_overlay_json))

    scoreboard_summary = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "mode": "full-roster-scoreboard-summary",
        "canonicalWrites": False,
        "roundId": args.round_id,
        "inputs": {
            "scoreboardJsonPath": repo_relative(scoreboard_json),
            "progressJsonPath": repo_relative(progress_json),
            "baselineScoreboardJsonPath": repo_relative(baseline_scoreboard_json),
            "baselineProgressJsonPath": repo_relative(baseline_progress_json),
            "relationshipEvidencePath": repo_relative(relationship_json),
            "baselineRelationshipEvidencePath": repo_relative(baseline_relationship_json),
            "runtimeReadinessSummaryPath": repo_relative(runtime_json),
            "itemRelationshipOverlaySummaryPath": repo_relative(item_overlay_json),
        },
        "outputs": {
            "scoreboardSummaryJsonPath": repo_relative(scoreboard_summary_json),
            "scoreboardSummaryMarkdownPath": repo_relative(scoreboard_summary_md),
            "bottleneckDeltaJsonPath": repo_relative(bottleneck_delta_json),
            "bottleneckDeltaMarkdownPath": repo_relative(bottleneck_delta_md),
            "nextLaneSummaryJsonPath": repo_relative(next_lane_json),
            "nextLaneSummaryMarkdownPath": repo_relative(next_lane_md),
        },
        "metrics": {
            "rowCount": len(scoreboard_views["rows"]),
            "canonicalCount": len(scoreboard_views["canonicalRows"]),
            "shadowCount": len(scoreboard_views["shadowRows"]),
            "gradeCounts": dict(sorted((scoreboard_views["metrics"].get("gradeCounts") or {}).items())),
            "laneCounts": scoreboard_views["laneCounts"],
            "canonicalLaneCounts": scoreboard_views["canonicalLaneCounts"],
            "shadowLaneCounts": scoreboard_views["shadowLaneCounts"],
            "avgHistoricalTrustScore": scoreboard_views["metrics"].get("avgHistoricalTrustScore"),
            "avgWorldbuildingUsabilityScore": scoreboard_views["metrics"].get("avgWorldbuildingUsabilityScore"),
            "femaleCount": scoreboard_views["metrics"].get("femaleCount"),
            "femaleAvgWorldbuildingUsabilityScore": scoreboard_views["metrics"].get("femaleAvgWorldbuildingUsabilityScore"),
            "progressOverallPercent": progress_current.get("overallPercent"),
            "relationshipTypeCounts": relationship_current["relationshipTypeCounts"],
            "relationshipFamilyCounts": relationship_current["relationshipFamilyCounts"],
            "kinshipRelationshipTypeCounts": relationship_current["kinshipRelationshipTypeCounts"],
            "itemRelationshipTypeCounts": relationship_current["itemRelationshipTypeCounts"],
            "runtimeReadinessFailCount": runtime_current.get("failCount"),
            "runtimeRefBlitzApplied": runtime_current.get("refBlitzApplied"),
            "runtimeRefBlitzReason": runtime_current.get("refBlitzReason"),
            "runtimeRefBlitzResolvedCount": runtime_current.get("refBlitzResolvedCount"),
            "runtimeRefBlitzUnresolvedCount": runtime_current.get("refBlitzUnresolvedCount"),
            "primaryTextSourceCount": item_overlay_current.get("primaryTextSourceCount"),
            "primaryTextPacketCount": item_overlay_current.get("primaryTextPacketCount"),
            "primaryTextEdgeCountBeforeCap": item_overlay_current.get("primaryTextEdgeCountBeforeCap"),
            "primaryTextEdgeCount": item_overlay_current.get("primaryTextEdgeCount"),
            "primaryTextTrimmedCount": item_overlay_current.get("primaryTextTrimmedCount"),
            "sourceClassCounts": item_overlay_current.get("sourceClassCounts"),
            "trustTierCounts": item_overlay_current.get("trustTierCounts"),
        },
        "topCanonicalRows": top_lane_rows(scoreboard_views["canonicalRows"], limit=12),
    }

    bottleneck_delta = build_bottleneck_delta(
        round_id=args.round_id,
        scoreboard_current=scoreboard_views,
        scoreboard_baseline=extract_scoreboard_views(read_json(baseline_scoreboard_json)),
        progress_current=progress_current,
        progress_baseline=progress_baseline,
        relationship_current=relationship_current,
        relationship_baseline=relationship_baseline,
        runtime_current=runtime_current,
        item_overlay_current=item_overlay_current,
    )

    next_lane_summary = build_next_lane_summary(
        round_id=args.round_id,
        scoreboard_current=scoreboard_views,
        runtime_current=runtime_current,
    )

    write_json(scoreboard_summary_json, scoreboard_summary)
    write_text(scoreboard_summary_md, render_scoreboard_md(scoreboard_summary))
    write_json(bottleneck_delta_json, bottleneck_delta)
    write_text(bottleneck_delta_md, render_bottleneck_md(bottleneck_delta))
    write_json(next_lane_json, next_lane_summary)
    write_text(next_lane_md, render_next_lane_md(next_lane_summary))
    write_jsonl(
        scoreboard_top_canonical_jsonl,
        jsonl_mirror_rows("topCanonicalRow", scoreboard_summary.get("topCanonicalRows", []), scoreboard_summary["generatedAt"]),
    )
    write_jsonl(bottleneck_deltas_jsonl, bottleneck_delta_jsonl_rows(bottleneck_delta))
    write_jsonl(
        next_lane_groups_jsonl,
        jsonl_mirror_rows("nextLaneGroup", next_lane_summary.get("metrics", {}).get("laneGroups", []), next_lane_summary["generatedAt"]),
    )

    print(f"[build_full_roster_round_summaries] wrote {scoreboard_summary_json}")
    print(f"[build_full_roster_round_summaries] wrote {scoreboard_summary_md}")
    print(f"[build_full_roster_round_summaries] wrote {scoreboard_top_canonical_jsonl}")
    print(f"[build_full_roster_round_summaries] wrote {bottleneck_delta_json}")
    print(f"[build_full_roster_round_summaries] wrote {bottleneck_delta_md}")
    print(f"[build_full_roster_round_summaries] wrote {bottleneck_deltas_jsonl}")
    print(f"[build_full_roster_round_summaries] wrote {next_lane_json}")
    print(f"[build_full_roster_round_summaries] wrote {next_lane_md}")
    print(f"[build_full_roster_round_summaries] wrote {next_lane_groups_jsonl}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
