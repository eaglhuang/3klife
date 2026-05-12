from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/observed-merge")


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


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def stable_hash(*parts: Any, length: int = 20) -> str:
    text = "\n".join(str(part or "") for part in parts)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:length]


def load_mentions(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = read_json(path)
    if isinstance(payload, dict):
        rows = payload.get("data")
        if isinstance(rows, list):
            return payload, [row for row in rows if isinstance(row, dict)]
    if isinstance(payload, list):
        return {}, [row for row in payload if isinstance(row, dict)]
    return {}, []


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(row)
    normalized.setdefault("label", "")
    normalized.setdefault("normalized", str(normalized.get("label") or ""))
    normalized.setdefault("mentionType", "external-evidence")
    normalized.setdefault("matchStatus", "resolved")
    normalized.setdefault("matchedGeneralIds", [])
    normalized.setdefault("sourceRef", "")
    normalized.setdefault("chapterNo", None)
    normalized.setdefault("paragraphIndex", 1)
    normalized.setdefault("startOffset", 0)
    normalized.setdefault("endOffset", 0)
    normalized.setdefault("textSnippet", "")
    normalized.setdefault("sceneParticipants", list(normalized.get("matchedGeneralIds") or []))
    return normalized


def dedupe_key(row: dict[str, Any]) -> str:
    return stable_hash(
        row.get("sourceRef"),
        row.get("label"),
        row.get("normalized"),
        ",".join(sorted(str(item) for item in (row.get("matchedGeneralIds") or []))),
        str(row.get("textSnippet") or "")[:180],
    )


def summarize_labels(rows: list[dict[str, Any]], status: str, top: int = 20) -> list[dict[str, Any]]:
    bucket: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        if str(row.get("matchStatus") or "") != status:
            continue
        label = str(row.get("label") or "").strip()
        mention_type = str(row.get("mentionType") or "").strip()
        if not label:
            continue
        key = (label, mention_type)
        item = bucket.setdefault(
            key,
            {
                "label": label,
                "normalized": str(row.get("normalized") or label),
                "mentionType": mention_type,
                "matchStatus": status,
                "count": 0,
                "matchedGeneralIds": set(),
                "sceneParticipants": set(),
                "sourceRefs": [],
                "sampleSnippets": [],
            },
        )
        item["count"] += 1
        for general_id in row.get("matchedGeneralIds") or []:
            if general_id:
                item["matchedGeneralIds"].add(str(general_id))
        for general_id in row.get("sceneParticipants") or []:
            if general_id:
                item["sceneParticipants"].add(str(general_id))
        source_ref = str(row.get("sourceRef") or "").strip()
        if source_ref and source_ref not in item["sourceRefs"] and len(item["sourceRefs"]) < 5:
            item["sourceRefs"].append(source_ref)
        snippet = str(row.get("textSnippet") or "").strip()
        if snippet and snippet not in item["sampleSnippets"] and len(item["sampleSnippets"]) < 3:
            item["sampleSnippets"].append(snippet)

    ranked = sorted(bucket.values(), key=lambda item: (-int(item["count"]), str(item["label"])))
    output: list[dict[str, Any]] = []
    for item in ranked[: max(top, 1)]:
        output.append(
            {
                "label": item["label"],
                "normalized": item["normalized"],
                "mentionType": item["mentionType"],
                "matchStatus": item["matchStatus"],
                "count": int(item["count"]),
                "matchedGeneralIds": sorted(item["matchedGeneralIds"]),
                "sceneParticipants": sorted(item["sceneParticipants"]),
                "sourceRefs": list(item["sourceRefs"]),
                "sampleSnippets": list(item["sampleSnippets"]),
            }
        )
    return output


def summarize_chapters(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_chapter: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "chapterNo": None,
            "chapterPath": "merged-observed",
            "mentionCount": 0,
            "formalMatchCount": 0,
            "addressTitleCount": 0,
            "unknownCandidateCount": 0,
            "skippedUnknownCandidateCount": 0,
        }
    )
    for row in rows:
        chapter_no = row.get("chapterNo")
        key = str(chapter_no) if isinstance(chapter_no, int) else "unknown"
        bucket = by_chapter[key]
        bucket["chapterNo"] = chapter_no if isinstance(chapter_no, int) else None
        bucket["chapterPath"] = f"merged-observed:{key}"
        bucket["mentionCount"] += 1
        mention_type = str(row.get("mentionType") or "")
        if mention_type == "formal-match":
            bucket["formalMatchCount"] += 1
        elif mention_type == "address-title":
            bucket["addressTitleCount"] += 1
        elif mention_type == "unknown-candidate":
            bucket["unknownCandidateCount"] += 1
    rows_out = list(by_chapter.values())
    rows_out.sort(key=lambda item: (item["chapterNo"] is None, item["chapterNo"] if item["chapterNo"] is not None else 10**9))
    return rows_out


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge base observed mentions with external overlay observed mentions.")
    parser.add_argument("--base-observed-mentions", required=True)
    parser.add_argument("--base-observed-summary", default=None)
    parser.add_argument("--overlay-observed-mentions", action="append", default=[])
    parser.add_argument("--overlay-observed-summary", action="append", default=[])
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_root = resolve_path(args.output_root)
    mentions_path = output_root / "observed-mentions.json"
    summary_path = output_root / "observed-label-summary.json"
    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise FileExistsError(f"output already exists: {repo_relative(output_root)}")
    output_root.mkdir(parents=True, exist_ok=True)

    base_meta, base_rows = load_mentions(resolve_path(args.base_observed_mentions))
    overlay_rows: list[dict[str, Any]] = []
    overlay_meta_rows: list[dict[str, Any]] = []
    for path_text in args.overlay_observed_mentions:
        meta, rows = load_mentions(resolve_path(path_text))
        overlay_rows.extend(rows)
        overlay_meta_rows.append(
            {
                "path": repo_relative(resolve_path(path_text)),
                "rowCount": len(rows),
                "generatedAt": meta.get("generatedAt"),
            }
        )

    deduped: dict[str, dict[str, Any]] = {}
    for raw in base_rows + overlay_rows:
        row = normalize_row(raw)
        key = dedupe_key(row)
        if key not in deduped:
            deduped[key] = row
            continue
        # Merge participants/general ids for duplicates to avoid losing coverage.
        existing = deduped[key]
        merged_ids = sorted(set(str(item) for item in (existing.get("matchedGeneralIds") or []) + (row.get("matchedGeneralIds") or [])))
        merged_scene = sorted(set(str(item) for item in (existing.get("sceneParticipants") or []) + (row.get("sceneParticipants") or [])))
        existing["matchedGeneralIds"] = merged_ids
        existing["sceneParticipants"] = merged_scene
        if not existing.get("textSnippet") and row.get("textSnippet"):
            existing["textSnippet"] = row["textSnippet"]

    merged_rows = list(deduped.values())
    merged_rows.sort(
        key=lambda row: (
            row.get("chapterNo") is None,
            row.get("chapterNo") if row.get("chapterNo") is not None else 10**9,
            str(row.get("sourceRef") or ""),
            str(row.get("label") or ""),
            int(row.get("startOffset") or 0),
        )
    )

    bundle = {
        "version": str(base_meta.get("version") or "1.0.0"),
        "generatedAt": utc_now(),
        "chaptersRoot": str(base_meta.get("chaptersRoot") or "merged-observed"),
        "formalMapPath": str(base_meta.get("formalMapPath") or "merged-observed"),
        "triageDecisionPath": base_meta.get("triageDecisionPath"),
        "collectCjkCandidates": bool(base_meta.get("collectCjkCandidates")),
        "data": merged_rows,
    }

    overlay_summary_rows: list[dict[str, Any]] = []
    for path_text in args.overlay_observed_summary:
        summary_payload = read_json(resolve_path(path_text))
        overlay_summary_rows.append(
            {
                "path": repo_relative(resolve_path(path_text)),
                "totalMentions": summary_payload.get("totalMentions"),
                "resolvedMentionCount": summary_payload.get("resolvedMentionCount"),
                "unresolvedMentionCount": summary_payload.get("unresolvedMentionCount"),
            }
        )

    summary_bundle = {
        "version": "1.0.0",
        "generatedAt": bundle["generatedAt"],
        "totalMentions": len(merged_rows),
        "resolvedMentionCount": sum(1 for row in merged_rows if str(row.get("matchStatus") or "") == "resolved"),
        "unresolvedMentionCount": sum(1 for row in merged_rows if str(row.get("matchStatus") or "") == "unresolved"),
        "excludedMentionCount": sum(1 for row in merged_rows if str(row.get("matchStatus") or "") == "excluded"),
        "reviewPendingMentionCount": sum(1 for row in merged_rows if str(row.get("matchStatus") or "") == "review-pending"),
        "chapters": summarize_chapters(merged_rows),
        "topResolvedLabels": summarize_labels(merged_rows, "resolved"),
        "topUnresolvedLabels": summarize_labels(merged_rows, "unresolved"),
        "topExcludedLabels": summarize_labels(merged_rows, "excluded"),
        "topReviewPendingLabels": summarize_labels(merged_rows, "review-pending"),
        "inputs": {
            "baseObservedMentions": repo_relative(resolve_path(args.base_observed_mentions)),
            "baseObservedSummary": repo_relative(resolve_path(args.base_observed_summary)) if args.base_observed_summary else None,
            "overlayObservedMentions": overlay_meta_rows,
            "overlayObservedSummary": overlay_summary_rows,
        },
        "metrics": {
            "baseCount": len(base_rows),
            "overlayCount": len(overlay_rows),
            "mergedCount": len(merged_rows),
            "dedupRemovedCount": len(base_rows) + len(overlay_rows) - len(merged_rows),
            "canonicalWrites": False,
        },
    }

    write_json(mentions_path, bundle)
    write_json(summary_path, summary_bundle)
    print(f"[merge_observed_mentions_overlay] wrote {mentions_path}")
    print(f"[merge_observed_mentions_overlay] wrote {summary_path}")
    print(
        "[merge_observed_mentions_overlay] "
        f"base={len(base_rows)} overlay={len(overlay_rows)} merged={len(merged_rows)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
