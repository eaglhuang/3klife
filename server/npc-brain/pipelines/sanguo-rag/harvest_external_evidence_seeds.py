from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from repo_layout import resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/external-evidence-seeds-v3-r1")
DEFAULT_EXTERNAL_EVIDENCE_CARDS = [
    Path(
        "local/codex-smoke/knowledge-growth/full-roster-highway-wang-yi-female-fix-r1/"
        "full-roster-highway-wang-yi-female-fix-r1-r1/external-evidence/external-evidence-cards.jsonl"
    ),
    Path(
        "local/codex-smoke/knowledge-growth/full-roster-highway-female-targets-r1/"
        "full-roster-highway-female-targets-r1-r1/external-evidence/external-evidence-cards.jsonl"
    ),
]
DEFAULT_SCOREBOARD_JSON = Path(
    "local/codex-smoke/knowledge-growth/full-roster-highway-wang-yi-female-fix-r1/"
    "full-roster-highway-wang-yi-female-fix-r1-r1/scoreboard/full-roster-scoreboard.json"
)
DEFAULT_SOURCE_HEALTH_SUMMARY = Path("local/codex-smoke/knowledge-growth/3kweb-check-live-r4/3kweb-check-summary.json")

ANGLE_TYPES = {
    "identity",
    "relationship",
    "event",
    "trait",
    "habit",
    "activity",
    "role",
    "dialogue_seed",
    "worldbuilding_note",
    "source_conflict",
    "location",
    "title",
}


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


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def iter_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    if not path.exists():
        return
    for line_number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        text = line.strip()
        if not text:
            continue
        try:
            value = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSONL at {repo_relative(path)}:{line_number}: {exc}") from exc
        if isinstance(value, dict):
            yield value


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
            count += 1
    return count


def stable_hash(*parts: Any, length: int = 20) -> str:
    joined = "\n".join(str(part or "") for part in parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:length]


def normalize_angle(claim_type: str | None, claim_scopes: Any = None) -> str:
    value = str(claim_type or "").strip().lower()
    if value in ANGLE_TYPES:
        return value
    if value == "location":
        return "location"
    if value == "title":
        return "title"
    scopes = claim_scopes if isinstance(claim_scopes, list) else []
    for scope in scopes:
        scope_text = str(scope or "").strip().lower()
        if scope_text in ANGLE_TYPES:
            return scope_text
    return "worldbuilding_note"


def has_year_like_text(text: str) -> bool:
    return any(token in text for token in ("年", "歲", "元年", "建安", "黃初", "赤壁", "西元"))


def known_generals_from_scoreboard(path: Path) -> set[str]:
    payload = read_json(path)
    rows = payload.get("rows") if isinstance(payload, dict) else []
    known: set[str] = set()
    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            general_id = str(row.get("generalId") or "").strip()
            if general_id:
                known.add(general_id)
    return known


def source_health_by_id(path: Path) -> dict[str, dict[str, Any]]:
    payload = read_json(path)
    rows = payload.get("sourceChecks") if isinstance(payload, dict) else []
    by_id: dict[str, dict[str, Any]] = {}
    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            source_id = str(row.get("sourceId") or "").strip()
            if source_id:
                by_id[source_id] = row
    return by_id


def seed_from_card(
    card: dict[str, Any],
    *,
    known_general_ids: set[str],
    source_health: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    source_id = str(card.get("sourcePolicyId") or card.get("sourceId") or "unknown-source").strip()
    source_url = str(card.get("url") or "").strip()
    source_family = str(card.get("sourceFamily") or source_id).strip()
    source_layer = str(card.get("sourceLayer") or "worldbuilding").strip()
    angle_type = normalize_angle(card.get("claimType"), card.get("claimScopes"))
    quote = str(card.get("quote") or "").strip()
    locator = str(card.get("locator") or "").strip()
    seed_text = quote or str(card.get("summary") or card.get("claimText") or "").strip()
    if not seed_text:
        return []

    source_row = source_health.get(source_id) or {}
    title = str(source_row.get("title") or card.get("pageTitle") or source_id).strip()
    live_status = str(source_row.get("liveStatus") or "").strip()
    matched_ids = card.get("generalIds")
    if not isinstance(matched_ids, list):
        matched_ids = []
    rows: list[dict[str, Any]] = []
    for raw_general_id in matched_ids:
        person_id = str(raw_general_id or "").strip()
        if not person_id:
            continue
        is_known = person_id in known_general_ids if known_general_ids else True
        person_fields = {"generalId": person_id} if is_known else {"candidatePersonId": person_id}
        seed_id = "seed:{source}:{person}:{angle}:{digest}".format(
            source=source_id,
            person=person_id,
            angle=angle_type,
            digest=stable_hash(card.get("evidenceId"), source_url, locator, seed_text),
        )
        rows.append(
            {
                "version": "3.0.0",
                "seedId": seed_id,
                "sourceEvidenceId": card.get("evidenceId"),
                "sourceId": source_id,
                "sourceFamily": source_family,
                "sourceLayer": source_layer,
                "trustTier": card.get("trustTier"),
                "sourceUrl": source_url,
                "pageTitle": title,
                **person_fields,
                "matchedName": card.get("matchedName") or person_id,
                "angleType": angle_type,
                "seedText": seed_text,
                "quote": quote,
                "locator": locator,
                "textHash": card.get("textHash"),
                "hasQuote": bool(quote),
                "hasLocator": bool(locator),
                "hasTime": has_year_like_text(seed_text),
                "hasLocation": bool(card.get("location") or angle_type == "location"),
                "extractionMethod": "manual" if source_id.startswith("manual-") else "deterministic",
                "sourceLiveStatus": live_status or None,
                "seedConfidenceScore": 0.0,
                "siteReliabilityMultiplier": 1.0,
                "crossSiteMatchCount": 0,
                "promotionTarget": "seed-only",
                "canonicalWrites": False,
            }
        )
    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Harvest low-threshold EvidenceSeed rows from strict cards and optional manual seed JSONL."
    )
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory for seed artifacts.")
    parser.add_argument(
        "--external-evidence-cards",
        action="append",
        default=[],
        help="Input strict evidence cards JSONL. Repeatable. Defaults to latest local highway runs.",
    )
    parser.add_argument(
        "--no-default-external-evidence-cards",
        action="store_true",
        help="Do not fall back to built-in strict evidence card paths when none are provided.",
    )
    parser.add_argument("--manual-seeds-jsonl", action="append", default=[], help="Optional hand-written EvidenceSeed JSONL.")
    parser.add_argument("--scoreboard-json", default=str(DEFAULT_SCOREBOARD_JSON), help="Scoreboard JSON for canonical/shadow split.")
    parser.add_argument(
        "--source-health-summary",
        default=str(DEFAULT_SOURCE_HEALTH_SUMMARY),
        help="3kweb-check summary JSON used for source status and page titles.",
    )
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting existing outputs.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_root = resolve_path(args.output_root)
    seeds_path = output_root / "external-evidence-seeds.jsonl"
    summary_path = output_root / "external-evidence-seeds-summary.json"
    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise SystemExit(f"Output root already exists and is not empty: {repo_relative(output_root)}")

    known_general_ids = known_generals_from_scoreboard(resolve_path(args.scoreboard_json))
    source_health = source_health_by_id(resolve_path(args.source_health_summary))
    card_paths = [resolve_path(path_text) for path_text in args.external_evidence_cards]
    if not card_paths and not args.no_default_external_evidence_cards:
        card_paths = [resolve_path(path) for path in DEFAULT_EXTERNAL_EVIDENCE_CARDS if resolve_path(path).exists()]

    seeds: dict[str, dict[str, Any]] = {}
    card_count = 0
    for card_path in card_paths:
        for card in iter_jsonl(card_path):
            card_count += 1
            for seed in seed_from_card(card, known_general_ids=known_general_ids, source_health=source_health):
                seeds[seed["seedId"]] = seed

    manual_count = 0
    for manual_path_text in args.manual_seeds_jsonl:
        manual_path = resolve_path(manual_path_text)
        for row in iter_jsonl(manual_path):
            seed_id = str(row.get("seedId") or "").strip()
            if not seed_id:
                seed_id = "seed:manual:{digest}".format(
                    digest=stable_hash(row.get("sourceId"), row.get("generalId"), row.get("candidatePersonId"), row.get("seedText"))
                )
            normalized = dict(row)
            normalized["seedId"] = seed_id
            normalized.setdefault("version", "3.0.0")
            normalized.setdefault("seedConfidenceScore", 0.0)
            normalized.setdefault("siteReliabilityMultiplier", 1.0)
            normalized.setdefault("crossSiteMatchCount", 0)
            normalized.setdefault("promotionTarget", "seed-only")
            normalized["canonicalWrites"] = False
            seeds[seed_id] = normalized
            manual_count += 1

    ordered_seeds = sorted(seeds.values(), key=lambda row: (str(row.get("sourceId")), str(row.get("generalId") or row.get("candidatePersonId")), str(row.get("angleType"))))
    written_count = write_jsonl(seeds_path, ordered_seeds)
    summary = {
        "version": "3.0.0",
        "generatedAt": utc_now(),
        "mode": "external-evidence-seed-harvest",
        "canonicalWrites": False,
        "inputs": {
            "externalEvidenceCards": [repo_relative(path) for path in card_paths],
            "noDefaultExternalEvidenceCards": bool(args.no_default_external_evidence_cards),
            "manualSeedsJsonl": [repo_relative(resolve_path(path)) for path in args.manual_seeds_jsonl],
            "scoreboardJson": repo_relative(resolve_path(args.scoreboard_json)),
            "sourceHealthSummary": repo_relative(resolve_path(args.source_health_summary)),
        },
        "outputs": {
            "seedsJsonl": repo_relative(seeds_path),
            "summaryJson": repo_relative(summary_path),
        },
        "metrics": {
            "strictCardInputCount": card_count,
            "manualSeedInputCount": manual_count,
            "seedCount": written_count,
            "canonicalGeneralSeedCount": sum(1 for row in ordered_seeds if row.get("generalId")),
            "shadowCandidateSeedCount": sum(1 for row in ordered_seeds if row.get("candidatePersonId")),
            "sourceCount": len({str(row.get("sourceId")) for row in ordered_seeds}),
            "angleCounts": {
                angle: sum(1 for row in ordered_seeds if row.get("angleType") == angle)
                for angle in sorted({str(row.get("angleType")) for row in ordered_seeds})
            },
        },
        "notes": [
            "EvidenceSeed is a low-threshold harvesting artifact; it cannot promote canonical data by itself.",
            "Strict EvidenceCard inputs are converted back into seeds so scoring and GraphRAG pairing can reuse them.",
        ],
    }
    write_json(summary_path, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
