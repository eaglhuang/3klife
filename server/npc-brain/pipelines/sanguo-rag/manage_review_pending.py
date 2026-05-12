from __future__ import annotations

import argparse
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

from repo_layout import pipeline_config_path, pipeline_root, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-label-summary.json")
DEFAULT_DECISION_PATH = pipeline_config_path(REPO_ROOT, "unresolved-triage-decisions.json")
DEFAULT_MANUAL_ROSTER_PATH = pipeline_config_path(REPO_ROOT, "manual-roster-seeds.json")
DEFAULT_ALIAS_OVERRIDE_PATH = pipeline_config_path(REPO_ROOT, "general-alias-overrides.json")
DEFAULT_CACHE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/romance-character-list-cache.json")
DEFAULT_BUCKETS_JSON = Path("artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/review-pending-buckets.json")
DEFAULT_BUCKETS_MD = Path("artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/review-pending-buckets.md")
DEFAULT_LOOP_MODULE = pipeline_root(REPO_ROOT) / "run_resolution_loop.py"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bucket review-pending labels and optionally promote likely-person entries.")
    parser.add_argument("--summary", default=str(DEFAULT_SUMMARY_PATH), help="Path to observed-label-summary.json")
    parser.add_argument("--decisions", default=str(DEFAULT_DECISION_PATH), help="Path to unresolved-triage-decisions.json")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="Path to manual-roster-seeds.json")
    parser.add_argument("--alias-overrides", default=str(DEFAULT_ALIAS_OVERRIDE_PATH), help="Path to general-alias-overrides.json")
    parser.add_argument("--cache-path", default=str(DEFAULT_CACHE_PATH), help="Path to romance character cache JSON")
    parser.add_argument("--buckets-json", default=str(DEFAULT_BUCKETS_JSON), help="Output JSON path for bucket results")
    parser.add_argument("--buckets-md", default=str(DEFAULT_BUCKETS_MD), help="Output Markdown path for bucket results")
    parser.add_argument(
        "--promote-romance-hit-likely-persons",
        action="store_true",
        help="Append likely-person labels with romance-character-list hits into manual-roster-seeds.json",
    )
    parser.add_argument(
        "--top-manual-review",
        type=int,
        default=100,
        help="How many manual review candidates to render in Markdown",
    )
    parser.add_argument(
        "--top-keep-ambiguous",
        type=int,
        default=50,
        help="How many keep-ambiguous entries to render with snippets",
    )
    parser.add_argument("--dry-run", action="store_true", help="Compute changes without writing files")
    return parser.parse_args()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_loop_module(path: Path):
    spec = importlib.util.spec_from_file_location("resolution_loop", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load resolution loop module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_ascii_general_id(normalized_label: str) -> str:
    # Keep ids ASCII-only even when no pinyin transliterator is available in the ETL environment.
    codepoints = [format(ord(char), "x") for char in normalized_label if char.strip()]
    return "romance-person-" + "-".join(codepoints)


def ensure_unique_general_id(base_id: str, existing_ids: set[str]) -> str:
    if base_id not in existing_ids:
        return base_id
    suffix = 2
    while f"{base_id}-{suffix}" in existing_ids:
        suffix += 1
    return f"{base_id}-{suffix}"


def build_bucket_result(
    loop_module,
    summary: dict,
    decisions: dict,
    manual_roster_path: Path,
    alias_override_path: Path,
    cache_path: Path,
    top_manual_review: int,
    top_keep_ambiguous: int,
    summary_path: Path,
    decision_path: Path,
) -> dict:
    person_set = {
        loop_module.normalize_label(value)
        for value in decisions.get("personLabels") or []
        if loop_module.normalize_label(value)
    }
    ambiguous_set = {
        loop_module.normalize_label(value)
        for value in decisions.get("ambiguousLabels") or []
        if loop_module.normalize_label(value)
    }
    romance_index = loop_module.load_romance_character_index(cache_path)
    curated_index = loop_module.load_curated_person_index(manual_roster_path, alias_override_path)

    bucketed = {"likely-person": [], "likely-noise": [], "keep-ambiguous": []}
    for index, entry in enumerate(summary.get("topReviewPendingLabels") or [], start=1):
        question = loop_module.make_question(index, entry)
        recommendation = loop_module.build_recommendation(question, romance_index, curated_index)
        normalized = str(question.get("normalized") or loop_module.normalize_label(question.get("label") or ""))
        answer = str(recommendation.get("recommendedAnswer") or "")
        confidence = str(recommendation.get("confidence") or "low")
        evidence_types = [str(item.get("type") or "") for item in recommendation.get("evidence") or []]
        romance_hits = [str(hit).strip() for hit in recommendation.get("romanceCharacterHits") or [] if str(hit).strip()]

        if normalized in person_set or (answer == "A" and confidence in {"high", "medium"}):
            bucket = "likely-person"
        elif answer == "B" and confidence in {"high", "medium"}:
            bucket = "likely-noise"
        elif normalized in ambiguous_set and any(
            evidence_type in {"compound-noise", "compound-title-or-place"} for evidence_type in evidence_types
        ) and confidence in {"high", "medium"}:
            bucket = "likely-noise"
        else:
            bucket = "keep-ambiguous"

        bucketed[bucket].append(
            {
                "label": str(question.get("label") or ""),
                "normalized": normalized,
                "count": int(question.get("count") or 0),
                "mentionType": str(question.get("mentionType") or "unknown"),
                "bucket": bucket,
                "recommendedAnswer": answer,
                "confidence": confidence,
                "reasons": list(recommendation.get("reasons") or []),
                "romanceCharacterHits": romance_hits,
                "sampleSnippets": list(question.get("sampleSnippets") or []),
                "sourceRefs": list(question.get("sourceRefs") or []),
                "sceneParticipants": list(question.get("sceneParticipants") or []),
                "currentDecision": (
                    "person" if normalized in person_set else ("ambiguous" if normalized in ambiguous_set else "unknown")
                ),
            }
        )

    bucket_counts = {key: len(values) for key, values in bucketed.items()}
    mention_counts = {key: sum(item["count"] for item in values) for key, values in bucketed.items()}
    bucket_priority = {"likely-person": 0, "likely-noise": 1, "keep-ambiguous": 2}
    confidence_rank = {"high": 0, "medium": 1, "low": 2}
    manual_candidates = sorted(
        [item for values in bucketed.values() for item in values],
        key=lambda item: (
            bucket_priority[item["bucket"]],
            confidence_rank.get(item["confidence"], 9),
            -item["count"],
            item["label"],
        ),
    )
    top_keep_ambiguous_entries = sorted(
        bucketed["keep-ambiguous"], key=lambda item: (-item["count"], item["label"])
    )[:top_keep_ambiguous]

    return {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "summaryPath": str(summary_path),
        "decisionPath": str(decision_path),
        "uniqueReviewPendingLabels": len(summary.get("topReviewPendingLabels") or []),
        "reviewPendingMentionCount": int(summary.get("reviewPendingMentionCount") or 0),
        "bucketCounts": bucket_counts,
        "bucketMentionCounts": mention_counts,
        "manualReviewTop": manual_candidates[:top_manual_review],
        "topKeepAmbiguous": top_keep_ambiguous_entries,
        "buckets": bucketed,
    }


def promote_likely_persons(result: dict, manual_roster_path: Path) -> tuple[int, list[dict], dict]:
    payload = read_json(manual_roster_path) if manual_roster_path.exists() else {"version": "1.0.0", "entries": []}
    entries = list(payload.get("entries") or [])
    existing_ids = {str(entry.get("generalId") or "").strip() for entry in entries if str(entry.get("generalId") or "").strip()}
    existing_labels = set()
    for entry in entries:
        name = str(entry.get("name") or "").strip()
        if name:
            existing_labels.add(name)
        for alias in entry.get("alias") or []:
            cleaned_alias = str(alias).strip()
            if cleaned_alias:
                existing_labels.add(cleaned_alias)

    added_entries: list[dict] = []
    for item in result.get("buckets", {}).get("likely-person", []):
        label = str(item.get("label") or "").strip()
        if not label:
            continue
        if not any("命中《三國演義角色列表》" in reason for reason in item.get("reasons") or []):
            continue
        if label in existing_labels:
            continue
        normalized = str(item.get("normalized") or "")
        general_id = ensure_unique_general_id(build_ascii_general_id(normalized), existing_ids)
        added_entry = {
            "generalId": general_id,
            "name": label,
            "faction": "neutral",
            "title": f"【{label}】",
            "alias": [],
        }
        entries.append(added_entry)
        existing_ids.add(general_id)
        existing_labels.add(label)
        added_entries.append(added_entry)

    payload["version"] = str(payload.get("version") or "1.0.0")
    payload["entries"] = entries
    return len(added_entries), added_entries, payload


def render_markdown(result: dict) -> str:
    lines = [
        "# Review Pending Buckets",
        "",
        f"Generated at: {result['generatedAt']}",
        f"Summary path: `{result['summaryPath']}`",
        f"Decision path: `{result['decisionPath']}`",
        "",
        f"- Unique review-pending labels: {result['uniqueReviewPendingLabels']}",
        f"- Review-pending mentions: {result['reviewPendingMentionCount']}",
        f"- likely-person: {result['bucketCounts']['likely-person']} labels / {result['bucketMentionCounts']['likely-person']} mentions",
        f"- likely-noise: {result['bucketCounts']['likely-noise']} labels / {result['bucketMentionCounts']['likely-noise']} mentions",
        f"- keep-ambiguous: {result['bucketCounts']['keep-ambiguous']} labels / {result['bucketMentionCounts']['keep-ambiguous']} mentions",
        "",
    ]

    promotion = result.get("promotion") or {}
    if promotion:
        lines.extend(
            [
                "## Promotion Summary",
                "",
                f"- Added to manual-roster-seeds.json: {promotion.get('addedCount', 0)}",
                f"- Criteria: {promotion.get('criteria', '')}",
                "",
            ]
        )

    lines.extend(
        [
            "## Top Manual Review Candidates",
            "",
            "排序規則：`likely-person -> likely-noise -> keep-ambiguous`，同 bucket 內依 `confidence -> count` 排序。",
            "",
        ]
    )
    for index, item in enumerate(result.get("manualReviewTop") or [], start=1):
        lines.append(
            f"### {index}. {item['label']} [{item['bucket']}] ({item['count']} 次, {item['confidence']}, rec={item['recommendedAnswer']}, current={item['currentDecision']})"
        )
        for reason in list(item.get("reasons") or [])[:2]:
            lines.append(f"- Reason: {reason}")
        if item.get("romanceCharacterHits"):
            lines.append(f"- Romance hits: {', '.join(item['romanceCharacterHits'][:3])}")
        if item.get("sourceRefs"):
            lines.append(f"- Source refs: {', '.join(item['sourceRefs'][:5])}")
        for snippet in list(item.get("sampleSnippets") or [])[:2]:
            lines.append(f"> {snippet}")
        lines.append("")

    lines.extend(["## Top Keep-Ambiguous", ""])
    for index, item in enumerate(result.get("topKeepAmbiguous") or [], start=1):
        lines.append(
            f"### {index}. {item['label']} ({item['count']} 次, {item['confidence']}, rec={item['recommendedAnswer']}, current={item['currentDecision']})"
        )
        for reason in list(item.get("reasons") or [])[:2]:
            lines.append(f"- Reason: {reason}")
        if item.get("sourceRefs"):
            lines.append(f"- Source refs: {', '.join(item['sourceRefs'][:5])}")
        for snippet in list(item.get("sampleSnippets") or [])[:3]:
            lines.append(f"> {snippet}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    args = parse_args()
    summary_path = Path(args.summary)
    decision_path = Path(args.decisions)
    manual_roster_path = Path(args.manual_roster)
    alias_override_path = Path(args.alias_overrides)
    cache_path = Path(args.cache_path)
    buckets_json_path = Path(args.buckets_json)
    buckets_md_path = Path(args.buckets_md)

    loop_module = load_loop_module(DEFAULT_LOOP_MODULE)
    summary = read_json(summary_path)
    decisions = read_json(decision_path)

    result = build_bucket_result(
        loop_module,
        summary,
        decisions,
        manual_roster_path,
        alias_override_path,
        cache_path,
        args.top_manual_review,
        args.top_keep_ambiguous,
        summary_path,
        decision_path,
    )

    if args.promote_romance_hit_likely_persons:
        added_count, added_entries, manual_roster_payload = promote_likely_persons(result, manual_roster_path)
        result["promotion"] = {
            "addedCount": added_count,
            "criteria": "bucket=likely-person and reason contains romance-character-list hit",
            "addedEntries": added_entries,
        }
        if not args.dry_run:
            write_json(manual_roster_path, manual_roster_payload)

    if not args.dry_run:
        write_json(buckets_json_path, result)
        buckets_md_path.parent.mkdir(parents=True, exist_ok=True)
        buckets_md_path.write_text(render_markdown(result), encoding="utf-8")

    promotion = result.get("promotion") or {}
    print(
        "[manage_review_pending] "
        f"unique={result['uniqueReviewPendingLabels']} "
        f"likelyPerson={result['bucketCounts']['likely-person']} "
        f"likelyNoise={result['bucketCounts']['likely-noise']} "
        f"keepAmbiguous={result['bucketCounts']['keep-ambiguous']} "
        f"added={promotion.get('addedCount', 0)} "
        f"dryRun={bool(args.dry_run)}"
    )


if __name__ == "__main__":
    main()
