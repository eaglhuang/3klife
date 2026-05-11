from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/external-observed-overlay")
HISTORY_CROSS_FAMILY_THRESHOLD = 2
NON_HISTORY_CROSS_FAMILY_THRESHOLD = 3


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


def stable_hash(*parts: Any, length: int = 16) -> str:
    raw = "\n".join(str(part or "") for part in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:length]


def parse_chapter_no(*candidates: Any) -> int | None:
    for candidate in candidates:
        text = str(candidate or "").strip()
        if not text:
            continue
        match = re.search(r"(?P<chap>\d{1,3})#p\d+", text)
        if match:
            return int(match.group("chap"))
        match = re.search(r"(?:第)?(?P<chap>\d{1,3})(?:回|章)", text)
        if match:
            return int(match.group("chap"))
    return None


def normalize_label(value: str) -> str:
    return re.sub(r"\s+", "", value or "")


def sanitize_general_ids(raw_ids: Any) -> list[str]:
    ids: list[str] = []
    for raw in raw_ids or []:
        general_id = str(raw or "").strip()
        if not general_id or general_id.startswith("shadow:"):
            continue
        if general_id not in ids:
            ids.append(general_id)
    return ids


def source_layer(value: Any) -> str:
    return str(value or "").strip().lower()


def has_quote_locator_hash(payload: dict[str, Any]) -> bool:
    quote = str(payload.get("quote") or payload.get("translatedTraditionalText") or payload.get("seedText") or "").strip()
    return len(quote) >= 8 and bool(payload.get("locator")) and bool(payload.get("textHash"))


def cross_family_count(payload: dict[str, Any]) -> int:
    families = {str(item or "").strip() for item in (payload.get("crossSiteSourceFamilies") or [])}
    families.discard("")
    return len(families)


def cross_family_threshold(layer: str) -> int:
    return HISTORY_CROSS_FAMILY_THRESHOLD if source_layer(layer) == "history" else NON_HISTORY_CROSS_FAMILY_THRESHOLD


def trust_signals_from_card(card: dict[str, Any]) -> list[str]:
    signals: list[str] = []
    layer = source_layer(card.get("sourceLayer"))
    family_count = cross_family_count(card)
    if family_count >= cross_family_threshold(layer):
        signals.append("cross-source")
    if has_quote_locator_hash(card):
        signals.append("quote+locator+hash")
    if str(card.get("reviewGrade") or "").strip().upper() == "A":
        signals.append("review-grade-a")
    return signals


def trust_signals_from_seed(seed: dict[str, Any], min_score: float) -> list[str]:
    signals: list[str] = []
    try:
        score = float(seed.get("seedConfidenceScore") or 0.0)
    except (TypeError, ValueError):
        score = 0.0
    if score >= min_score:
        signals.append("seed-confidence")
    if int(seed.get("crossSiteMatchCount") or 0) >= 2:
        signals.append("cross-site-match")
    if has_quote_locator_hash(seed):
        signals.append("quote+locator+hash")
    return signals


def card_to_observed_rows(card: dict[str, Any]) -> list[dict[str, Any]]:
    general_ids = sanitize_general_ids(card.get("generalIds"))
    if not general_ids:
        return []
    source_id = str(card.get("sourcePolicyId") or card.get("sourceId") or "unknown-source").strip()
    evidence_id = str(card.get("evidenceId") or stable_hash(card))
    matched_name = str(card.get("matchedName") or "").strip()
    label = matched_name or general_ids[0]
    normalized = normalize_label(label)
    text_snippet = str(card.get("quote") or card.get("summary") or card.get("claimText") or "").strip()
    if not text_snippet:
        return []
    locator = str(card.get("locator") or "").strip()
    source_refs = list(card.get("sourceRefs") or [])
    chapter_no = parse_chapter_no(locator, source_refs[0] if source_refs else None, card.get("sourceRef"))
    source_ref = f"ext-card:{source_id}:{evidence_id}"
    trust_signals = trust_signals_from_card(card)
    family_count = cross_family_count(card)
    has_qlh = has_quote_locator_hash(card)
    return [
        {
            "label": label,
            "normalized": normalized,
            "mentionType": "external-evidence-card",
            "matchStatus": "resolved",
            "matchedGeneralIds": list(general_ids),
            "sourceRef": source_ref,
            "chapterNo": chapter_no,
            "paragraphIndex": 1,
            "startOffset": 0,
            "endOffset": len(text_snippet),
            "textSnippet": text_snippet[:260],
            "sceneParticipants": list(general_ids),
            "sourceLayer": str(card.get("sourceLayer") or ""),
            "sourceFamily": str(card.get("sourceFamily") or ""),
            "sourceId": source_id,
            "claimType": str(card.get("claimType") or ""),
            "locator": locator,
            "crossSiteSourceFamilyCount": family_count,
            "crossSiteMatchCount": int(card.get("crossSiteMatchCount") or 0),
            "hasQuoteLocatorHash": has_qlh,
            "trustSignals": list(trust_signals),
            "trustSignalCount": len(trust_signals),
            "overlayTrustPassed": bool(trust_signals),
            "canonicalWrites": False,
        }
    ]


def seed_to_observed_rows(seed: dict[str, Any], min_score: float) -> list[dict[str, Any]]:
    score = float(seed.get("seedConfidenceScore") or 0.0)
    if score < min_score:
        return []
    if str(seed.get("promotionTarget") or "") not in {"preview", "human-review"}:
        return []
    general_id = str(seed.get("generalId") or "").strip()
    if not general_id or general_id.startswith("shadow:"):
        return []
    source_id = str(seed.get("sourceId") or seed.get("sourceFamily") or "unknown-source").strip()
    seed_id = str(seed.get("seedId") or stable_hash(seed))
    label = str(seed.get("matchedName") or general_id).strip()
    text_snippet = str(seed.get("translatedTraditionalText") or seed.get("seedText") or seed.get("quote") or "").strip()
    if not text_snippet:
        return []
    locator = str(seed.get("locator") or "").strip()
    chapter_no = parse_chapter_no(locator, seed.get("sourceRef"))
    source_ref = f"ext-seed:{source_id}:{seed_id}"
    trust_signals = trust_signals_from_seed(seed, min_score=min_score)
    family_count = cross_family_count(seed)
    has_qlh = has_quote_locator_hash(seed)
    return [
        {
            "label": label,
            "normalized": normalize_label(label),
            "mentionType": "external-evidence-seed",
            "matchStatus": "resolved",
            "matchedGeneralIds": [general_id],
            "sourceRef": source_ref,
            "chapterNo": chapter_no,
            "paragraphIndex": 1,
            "startOffset": 0,
            "endOffset": len(text_snippet),
            "textSnippet": text_snippet[:260],
            "sceneParticipants": [general_id],
            "sourceLayer": str(seed.get("sourceLayer") or ""),
            "sourceFamily": str(seed.get("sourceFamily") or ""),
            "sourceId": source_id,
            "angleType": str(seed.get("angleType") or ""),
            "seedConfidenceScore": round(score, 2),
            "crossSiteSourceFamilyCount": family_count,
            "crossSiteMatchCount": int(seed.get("crossSiteMatchCount") or 0),
            "hasQuoteLocatorHash": has_qlh,
            "trustSignals": list(trust_signals),
            "trustSignalCount": len(trust_signals),
            "overlayTrustPassed": bool(trust_signals),
            "canonicalWrites": False,
        }
    ]


def summarize_labels(rows: list[dict[str, Any]], status: str, top: int = 20) -> list[dict[str, Any]]:
    bucket: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        if str(row.get("matchStatus") or "") != status:
            continue
        label = str(row.get("label") or "").strip()
        normalized = str(row.get("normalized") or label).strip()
        mention_type = str(row.get("mentionType") or "").strip()
        if not label:
            continue
        key = (label, mention_type)
        item = bucket.setdefault(
            key,
            {
                "label": label,
                "normalized": normalized,
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
            "chapterPath": "external-overlay",
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
        bucket["chapterPath"] = f"external-overlay:{key}"
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
    parser = argparse.ArgumentParser(description="Build external-evidence overlay in observed-mentions format.")
    parser.add_argument("--candidate-evidence-cards", action="append", default=[])
    parser.add_argument("--seed-ranking-json", action="append", default=[])
    parser.add_argument("--seed-min-score", type=float, default=72.0)
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

    rows_by_key: dict[str, dict[str, Any]] = {}
    card_count = 0
    seed_count = 0
    for path_text in args.candidate_evidence_cards:
        card_path = resolve_path(path_text)
        for card in read_jsonl(card_path):
            card_count += 1
            for row in card_to_observed_rows(card):
                key = stable_hash(row.get("sourceRef"), row.get("label"), row.get("matchedGeneralIds"), row.get("textSnippet"))
                rows_by_key[key] = row

    for path_text in args.seed_ranking_json:
        ranking_path = resolve_path(path_text)
        ranking_payload = read_json(ranking_path)
        ranked_rows = ranking_payload.get("rankedSeeds") if isinstance(ranking_payload, dict) else []
        if not isinstance(ranked_rows, list):
            continue
        for seed in ranked_rows:
            if not isinstance(seed, dict):
                continue
            seed_count += 1
            for row in seed_to_observed_rows(seed, args.seed_min_score):
                key = stable_hash(row.get("sourceRef"), row.get("label"), row.get("matchedGeneralIds"), row.get("textSnippet"))
                rows_by_key[key] = row

    rows = list(rows_by_key.values())
    rows.sort(
        key=lambda row: (
            row.get("chapterNo") is None,
            row.get("chapterNo") if row.get("chapterNo") is not None else 10**9,
            str(row.get("sourceRef") or ""),
            str(row.get("label") or ""),
        )
    )

    bundle = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "chaptersRoot": "external-evidence-overlay",
        "formalMapPath": "external-evidence-overlay",
        "triageDecisionPath": None,
        "collectCjkCandidates": False,
        "data": rows,
    }
    summary_bundle = {
        "version": "1.0.0",
        "generatedAt": bundle["generatedAt"],
        "totalMentions": len(rows),
        "resolvedMentionCount": sum(1 for row in rows if str(row.get("matchStatus") or "") == "resolved"),
        "unresolvedMentionCount": sum(1 for row in rows if str(row.get("matchStatus") or "") == "unresolved"),
        "excludedMentionCount": sum(1 for row in rows if str(row.get("matchStatus") or "") == "excluded"),
        "reviewPendingMentionCount": sum(1 for row in rows if str(row.get("matchStatus") or "") == "review-pending"),
        "chapters": summarize_chapters(rows),
        "topResolvedLabels": summarize_labels(rows, "resolved"),
        "topUnresolvedLabels": summarize_labels(rows, "unresolved"),
        "topExcludedLabels": summarize_labels(rows, "excluded"),
        "topReviewPendingLabels": summarize_labels(rows, "review-pending"),
        "inputs": {
            "candidateEvidenceCards": [repo_relative(resolve_path(path)) for path in args.candidate_evidence_cards],
            "seedRankingJson": [repo_relative(resolve_path(path)) for path in args.seed_ranking_json],
            "seedMinScore": float(args.seed_min_score),
        },
        "metrics": {
            "candidateCardInputCount": card_count,
            "seedRankingInputCount": seed_count,
            "overlayMentionCount": len(rows),
            "trustPassedOverlayMentionCount": sum(1 for row in rows if bool(row.get("overlayTrustPassed"))),
            "canonicalWrites": False,
            "sourceIdCounts": dict(sorted(Counter(str(row.get("sourceId") or "") for row in rows).items())),
            "claimTypeCounts": dict(sorted(Counter(str(row.get("claimType") or "") for row in rows if row.get("claimType")).items())),
            "angleTypeCounts": dict(sorted(Counter(str(row.get("angleType") or "") for row in rows if row.get("angleType")).items())),
        },
    }

    write_json(mentions_path, bundle)
    write_json(summary_path, summary_bundle)
    print(f"[build_external_observed_overlay] wrote {mentions_path}")
    print(f"[build_external_observed_overlay] wrote {summary_path}")
    print(
        "[build_external_observed_overlay] "
        f"rows={len(rows)} cardsIn={card_count} seedsIn={seed_count} resolved={summary_bundle['resolvedMentionCount']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
