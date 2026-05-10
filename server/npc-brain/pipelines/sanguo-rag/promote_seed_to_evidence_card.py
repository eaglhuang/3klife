from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/external-evidence-seeds-v3-r1")
DEFAULT_RANKING_JSON = DEFAULT_OUTPUT_ROOT / "external-evidence-seed-ranking.json"


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


def person_id(seed: dict[str, Any]) -> str:
    return str(seed.get("generalId") or seed.get("candidatePersonId") or "").strip()


def can_promote(seed: dict[str, Any], min_score: float) -> tuple[bool, str]:
    if seed.get("promotionTarget") != "candidate-card":
        return False, "promotionTarget is not candidate-card"
    if float(seed.get("seedConfidenceScore") or 0.0) < min_score:
        return False, "seedConfidenceScore below threshold"
    if not person_id(seed):
        return False, "missing generalId/candidatePersonId"
    if not (seed.get("quote") or seed.get("seedText")):
        return False, "missing quote/seedText"
    if not (seed.get("locator") or seed.get("textHash")):
        return False, "missing locator/textHash"
    return True, "ok"


def claim_scopes_for_angle(angle: str) -> list[str]:
    if angle in {"identity", "relationship", "event", "location", "title", "trait", "activity", "role"}:
        return [angle]
    if angle in {"habit", "dialogue_seed", "worldbuilding_note"}:
        return ["trait", "activity"]
    return ["identity", "relationship", "event", "location", "title", "trait", "activity"]


def card_from_seed(seed: dict[str, Any]) -> dict[str, Any]:
    angle = str(seed.get("angleType") or "worldbuilding_note").strip()
    seed_id = str(seed.get("seedId") or "")
    evidence_id = "candidate-card:{digest}".format(
        digest=stable_hash(seed_id, seed.get("sourceUrl"), seed.get("locator"), seed.get("quote") or seed.get("seedText"))
    )
    person = person_id(seed)
    card: dict[str, Any] = {
        "version": "3.0.0",
        "evidenceId": evidence_id,
        "sourceSeedId": seed_id,
        "sourceEvidenceId": seed.get("sourceEvidenceId"),
        "sourcePolicyId": seed.get("sourceId"),
        "sourceFamily": seed.get("sourceFamily"),
        "sourceLayer": seed.get("sourceLayer"),
        "trustTier": seed.get("trustTier"),
        "singleSourceMaxGrade": "B",
        "url": seed.get("sourceUrl"),
        "pageTitle": seed.get("pageTitle"),
        "locator": seed.get("locator"),
        "quote": seed.get("quote") or seed.get("seedText"),
        "textHash": seed.get("textHash"),
        "claimType": angle,
        "claimScopes": claim_scopes_for_angle(angle),
        "seedConfidenceScore": seed.get("seedConfidenceScore"),
        "siteReliabilityMultiplier": seed.get("siteReliabilityMultiplier"),
        "crossSiteMatchCount": seed.get("crossSiteMatchCount"),
        "crossSiteSourceFamilies": seed.get("crossSiteSourceFamilies") or [],
        "reviewGrade": "B",
        "promotionState": "staged-candidate",
        "canonicalWrites": False,
    }
    if seed.get("generalId"):
        card["generalIds"] = [person]
    else:
        card["candidatePersonIds"] = [person]
    return card


def render_markdown(summary: dict[str, Any], rejected: list[dict[str, Any]]) -> str:
    lines = [
        "# Seed -> Candidate Evidence Card Promotion",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Promoted Candidate Cards: `{summary['metrics']['candidateCardCount']}`",
        f"- Rejected Seeds: `{summary['metrics']['rejectedSeedCount']}`",
        "",
        "這一步只產生 `staged-candidate`，單一網站或單一 seed 不會自動升 A，也不會寫入正式 canonical。",
        "",
        "## Rejection Reasons",
        "",
        "| Reason | Count |",
        "| --- | ---: |",
    ]
    reason_counts: dict[str, int] = {}
    for row in rejected:
        reason = str(row.get("reason") or "unknown")
        reason_counts[reason] = reason_counts.get(reason, 0) + 1
    for reason, count in sorted(reason_counts.items(), key=lambda item: (-item[1], item[0])):
        lines.append(f"| {reason} | {count} |")
    lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Promote high-quality EvidenceSeed rows into candidate EvidenceCard JSONL.")
    parser.add_argument("--ranking-json", default=str(DEFAULT_RANKING_JSON), help="Input external-evidence-seed-ranking.json.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory.")
    parser.add_argument("--min-score", type=float, default=70.0, help="Minimum seedConfidenceScore for candidate card promotion.")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ranking_path = resolve_path(args.ranking_json)
    output_root = resolve_path(args.output_root)
    cards_path = output_root / "candidate-evidence-cards.jsonl"
    summary_path = output_root / "candidate-evidence-card-summary.json"
    markdown_path = output_root / "candidate-evidence-card-summary.zh-TW.md"
    if (cards_path.exists() or summary_path.exists() or markdown_path.exists()) and not args.overwrite:
        raise SystemExit(f"Promotion outputs already exist under {repo_relative(output_root)}")

    ranking = read_json(ranking_path)
    seeds = ranking.get("rankedSeeds") if isinstance(ranking, dict) else []
    if not isinstance(seeds, list):
        seeds = []

    cards: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    for seed in seeds:
        if not isinstance(seed, dict):
            continue
        ok, reason = can_promote(seed, args.min_score)
        if ok:
            cards.append(card_from_seed(seed))
        else:
            rejected.append({"seedId": seed.get("seedId"), "personId": person_id(seed), "reason": reason})

    written = write_jsonl(cards_path, cards)
    summary = {
        "version": "3.0.0",
        "generatedAt": utc_now(),
        "mode": "seed-to-candidate-evidence-card-promotion",
        "canonicalWrites": False,
        "inputs": {"rankingJson": repo_relative(ranking_path), "minScore": args.min_score},
        "outputs": {
            "candidateEvidenceCardsJsonl": repo_relative(cards_path),
            "summaryJson": repo_relative(summary_path),
            "summaryMarkdown": repo_relative(markdown_path),
        },
        "metrics": {
            "inputSeedCount": len(seeds),
            "candidateCardCount": written,
            "rejectedSeedCount": len(rejected),
        },
        "notes": [
            "Candidate evidence cards are still review artifacts. They are not A-grade and do not write canonical data.",
            "Single-source evidence remains capped by singleSourceMaxGrade=B.",
        ],
    }
    write_json(summary_path, summary)
    markdown_path.write_text(render_markdown(summary, rejected), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
