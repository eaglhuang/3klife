from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from repo_layout import resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/external-evidence-seeds-v3-r1")
DEFAULT_SEEDS_JSONL = DEFAULT_OUTPUT_ROOT / "external-evidence-seeds.jsonl"

SOURCE_LAYER_SCORE = {
    "romance": 85.0,
    "history": 80.0,
    "research": 70.0,
    "folklore": 55.0,
    "worldbuilding": 45.0,
    "game": 45.0,
    "fiction": 35.0,
    "manual": 35.0,
    "blocked": 15.0,
}

ANGLE_SPECIFICITY_SCORE = {
    "identity": 92.0,
    "relationship": 90.0,
    "event": 88.0,
    "location": 84.0,
    "title": 84.0,
    "trait": 82.0,
    "role": 80.0,
    "activity": 76.0,
    "habit": 72.0,
    "dialogue_seed": 70.0,
    "worldbuilding_note": 68.0,
    "source_conflict": 62.0,
}

EXTRACTION_RELIABILITY_SCORE = {
    "deterministic": 90.0,
    "manual": 85.0,
    "hybrid": 75.0,
    "llm": 60.0,
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


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def person_key(seed: dict[str, Any]) -> str:
    return str(seed.get("generalId") or seed.get("candidatePersonId") or "").strip()


def source_family(seed: dict[str, Any]) -> str:
    return str(seed.get("sourceFamily") or seed.get("sourceId") or "").strip()


def source_id(seed: dict[str, Any]) -> str:
    return str(seed.get("sourceId") or seed.get("sourceFamily") or "unknown-source").strip()


def angle_type(seed: dict[str, Any]) -> str:
    return str(seed.get("angleType") or "worldbuilding_note").strip()


def source_layer_score(seed: dict[str, Any]) -> float:
    layer = str(seed.get("sourceLayer") or "").strip().lower()
    family = source_family(seed).lower()
    trust_tier = str(seed.get("trustTier") or "").strip().lower()
    if "sanguoyanyi" in family or "romance" in family:
        return SOURCE_LAYER_SCORE["romance"]
    if any(token in family for token in ("sanguozhi", "houhanshu", "zizhitongjian")):
        return SOURCE_LAYER_SCORE["history"]
    if "primary" in trust_tier:
        return SOURCE_LAYER_SCORE["history"]
    if layer in SOURCE_LAYER_SCORE:
        return SOURCE_LAYER_SCORE[layer]
    if "secondary" in trust_tier or "research" in trust_tier:
        return SOURCE_LAYER_SCORE["research"]
    if "game" in family or "koei" in family or "musou" in family:
        return SOURCE_LAYER_SCORE["game"]
    return SOURCE_LAYER_SCORE["worldbuilding"]


def person_match_score(seed: dict[str, Any]) -> float:
    if seed.get("generalId"):
        return 100.0
    if seed.get("candidatePersonId"):
        return 75.0
    return 0.0


def text_support_score(seed: dict[str, Any]) -> float:
    has_quote = bool(seed.get("hasQuote") or seed.get("quote"))
    has_locator = bool(seed.get("hasLocator") or seed.get("locator"))
    has_hash = bool(seed.get("textHash"))
    has_text = bool(str(seed.get("seedText") or "").strip())
    if has_quote and has_locator and has_hash:
        return 100.0
    if has_quote and has_hash:
        return 82.0
    if has_quote and has_locator:
        return 78.0
    if has_text:
        return 64.0
    return 25.0


def freshness_score(seed: dict[str, Any]) -> float:
    status = str(seed.get("sourceLiveStatus") or "").strip()
    if status in {"ok", "manual-only"}:
        return 100.0
    if status in {"http-error", "timeout", "fetch-error", "url-error"}:
        return 55.0
    return 80.0


def cross_site_groups(seeds: list[dict[str, Any]]) -> dict[tuple[str, str], set[str]]:
    groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    for seed in seeds:
        person = person_key(seed)
        angle = angle_type(seed)
        family = source_family(seed)
        if person and angle and family:
            groups[(person, angle)].add(family)
    return groups


def apply_cross_site_counts(seeds: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups = cross_site_groups(seeds)
    scored: list[dict[str, Any]] = []
    for seed in seeds:
        person = person_key(seed)
        angle = angle_type(seed)
        families = groups.get((person, angle), set())
        row = dict(seed)
        row["crossSiteMatchCount"] = max(0, len(families) - 1)
        row["crossSiteSourceFamilies"] = sorted(families)
        scored.append(row)
    return scored


def raw_seed_score(seed: dict[str, Any]) -> tuple[float, dict[str, float]]:
    cross_count = int(seed.get("crossSiteMatchCount") or 0)
    breakdown = {
        "personMatchScore": person_match_score(seed),
        "angleSpecificityScore": ANGLE_SPECIFICITY_SCORE.get(angle_type(seed), 68.0),
        "sourceLayerScore": source_layer_score(seed),
        "textSupportScore": text_support_score(seed),
        "extractionReliabilityScore": EXTRACTION_RELIABILITY_SCORE.get(str(seed.get("extractionMethod") or "").strip(), 65.0),
        "crossSiteSignalScore": clamp(cross_count * 45.0),
        "freshnessAndReachabilityScore": freshness_score(seed),
    }
    score = (
        breakdown["personMatchScore"] * 0.25
        + breakdown["angleSpecificityScore"] * 0.20
        + breakdown["sourceLayerScore"] * 0.15
        + breakdown["textSupportScore"] * 0.15
        + breakdown["extractionReliabilityScore"] * 0.10
        + breakdown["crossSiteSignalScore"] * 0.10
        + breakdown["freshnessAndReachabilityScore"] * 0.05
    )
    return clamp(score), breakdown


def promotion_target(seed: dict[str, Any], score: float) -> str:
    has_quote = bool(seed.get("hasQuote") or seed.get("quote"))
    has_locator_or_hash = bool(seed.get("hasLocator") or seed.get("locator") or seed.get("textHash"))
    cross_count = int(seed.get("crossSiteMatchCount") or 0)
    if score >= 70.0 and has_quote and has_locator_or_hash:
        return "candidate-card"
    if angle_type(seed) == "source_conflict" or (score >= 80.0 and not has_locator_or_hash):
        return "human-review"
    if score >= 55.0 or cross_count > 0:
        return "preview"
    return "seed-only"


def site_multiplier(source_rows: list[dict[str, Any]]) -> tuple[float, dict[str, float]]:
    total = max(len(source_rows), 1)
    accepted_seed_rate = sum(1 for row in source_rows if row.get("_rawSeedScore", 0.0) >= 60.0) / total
    card_promotion_rate = sum(1 for row in source_rows if row.get("_candidateCardReady")) / total
    cross_site_agreement_rate = sum(1 for row in source_rows if int(row.get("crossSiteMatchCount") or 0) > 0) / total
    conflict_rate = sum(1 for row in source_rows if angle_type(row) == "source_conflict") / total
    stale_or_broken_rate = sum(
        1 for row in source_rows if str(row.get("sourceLiveStatus") or "") in {"http-error", "timeout", "fetch-error", "url-error"}
    ) / total
    multiplier = (
        0.70
        + accepted_seed_rate * 0.15
        + card_promotion_rate * 0.10
        + cross_site_agreement_rate * 0.10
        - conflict_rate * 0.15
        - stale_or_broken_rate * 0.05
    )
    metrics = {
        "acceptedSeedRate": round(accepted_seed_rate, 4),
        "cardPromotionRate": round(card_promotion_rate, 4),
        "crossSiteAgreementRate": round(cross_site_agreement_rate, 4),
        "conflictRate": round(conflict_rate, 4),
        "staleOrBrokenRate": round(stale_or_broken_rate, 4),
    }
    return round(clamp(multiplier, 0.70, 1.20), 4), metrics


def score_seeds(seeds: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    with_cross = apply_cross_site_counts(seeds)
    pre_scored: list[dict[str, Any]] = []
    for seed in with_cross:
        raw_score, breakdown = raw_seed_score(seed)
        row = dict(seed)
        row["_rawSeedScore"] = raw_score
        row["_candidateCardReady"] = bool((seed.get("hasQuote") or seed.get("quote")) and (seed.get("hasLocator") or seed.get("locator") or seed.get("textHash")))
        row["seedConfidenceBreakdown"] = {key: round(value, 2) for key, value in breakdown.items()}
        pre_scored.append(row)

    by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in pre_scored:
        by_source[source_id(row)].append(row)

    site_rows: list[dict[str, Any]] = []
    multipliers: dict[str, float] = {}
    for sid, rows in sorted(by_source.items()):
        multiplier, metrics = site_multiplier(rows)
        multipliers[sid] = multiplier
        site_rows.append(
            {
                "sourceId": sid,
                "sourceFamily": source_family(rows[0]) if rows else sid,
                "seedCount": len(rows),
                "siteReliabilityMultiplier": multiplier,
                **metrics,
            }
        )

    final_rows: list[dict[str, Any]] = []
    for row in pre_scored:
        multiplier = multipliers.get(source_id(row), 1.0)
        score = clamp(float(row["_rawSeedScore"]) * multiplier)
        clean = {key: value for key, value in row.items() if not key.startswith("_")}
        clean["siteReliabilityMultiplier"] = multiplier
        clean["seedConfidenceScore"] = round(score, 2)
        clean["promotionTarget"] = promotion_target(clean, score)
        clean["canonicalWrites"] = False
        final_rows.append(clean)

    final_rows.sort(key=lambda row: (-float(row.get("seedConfidenceScore") or 0.0), person_key(row), angle_type(row), source_id(row)))
    return final_rows, site_rows


def person_ranking(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        person = person_key(row)
        if person:
            grouped[person].append(row)
    ranking: list[dict[str, Any]] = []
    for person, person_rows in grouped.items():
        scores = [float(row.get("seedConfidenceScore") or 0.0) for row in person_rows]
        families = {source_family(row) for row in person_rows if source_family(row)}
        ranking.append(
            {
                "personId": person,
                "seedCount": len(person_rows),
                "avgSeedConfidenceScore": round(sum(scores) / len(scores), 2),
                "maxSeedConfidenceScore": round(max(scores), 2),
                "distinctSourceFamilyCount": len(families),
                "candidateCardCount": sum(1 for row in person_rows if row.get("promotionTarget") == "candidate-card"),
                "previewCount": sum(1 for row in person_rows if row.get("promotionTarget") == "preview"),
            }
        )
    ranking.sort(key=lambda row: (-row["candidateCardCount"], -row["avgSeedConfidenceScore"], row["personId"]))
    return ranking


def cross_site_report(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        groups[(person_key(row), angle_type(row))].append(row)
    report: list[dict[str, Any]] = []
    for (person, angle), group_rows in groups.items():
        families = sorted({source_family(row) for row in group_rows if source_family(row)})
        if len(families) < 2:
            continue
        report.append(
            {
                "personId": person,
                "angleType": angle,
                "sourceFamilies": families,
                "seedCount": len(group_rows),
                "maxSeedConfidenceScore": round(max(float(row.get("seedConfidenceScore") or 0.0) for row in group_rows), 2),
            }
        )
    report.sort(key=lambda row: (-row["seedCount"], -row["maxSeedConfidenceScore"], row["personId"], row["angleType"]))
    return report


def render_markdown(summary: dict[str, Any]) -> str:
    metrics = summary["metrics"]
    lines = [
        "# 外部證據 Seed 排行榜 v3",
        "",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Seed Count: `{metrics['seedCount']}`",
        f"- Candidate Card Ready: `{metrics['candidateCardCount']}`",
        f"- Preview Queue: `{metrics['previewCount']}`",
        f"- Human Review Queue: `{metrics['humanReviewCount']}`",
        f"- Cross-site Groups: `{metrics['crossSiteGroupCount']}`",
        "",
        "## 怎麼讀",
        "",
        "`EvidenceSeed` 是低門檻線索，不等於正式證據。分數高代表它值得被 preview skill 補證或升成 candidate card；只有 candidate card 也仍然只是 B/A gate 的輸入，不會自動寫 canonical。",
        "",
        "## Top Seeds",
        "",
        "| Rank | Person | Angle | Source | Score | Cross-site | Next | Seed Text |",
        "| --- | --- | --- | --- | ---: | ---: | --- | --- |",
    ]
    for index, row in enumerate(summary["rankedSeeds"][:30], 1):
        text = str(row.get("translatedTraditionalText") or row.get("seedText") or row.get("quote") or "").replace("\n", " ").replace("|", "\\|")
        if len(text) > 80:
            text = text[:77] + "..."
        lines.append(
            "| {rank} | `{person}` | `{angle}` | `{source}` | {score:.2f} | {cross} | `{target}` | {text} |".format(
                rank=index,
                person=person_key(row),
                angle=angle_type(row),
                source=source_id(row),
                score=float(row.get("seedConfidenceScore") or 0.0),
                cross=int(row.get("crossSiteMatchCount") or 0),
                target=row.get("promotionTarget"),
                text=text,
            )
        )

    lines.extend(["", "## 人物排行", "", "| Person | Seeds | Avg Score | Max Score | Families | Candidate Cards | Preview |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"])
    for row in summary["personRanking"][:30]:
        lines.append(
            f"| `{row['personId']}` | {row['seedCount']} | {row['avgSeedConfidenceScore']:.2f} | {row['maxSeedConfidenceScore']:.2f} | {row['distinctSourceFamilyCount']} | {row['candidateCardCount']} | {row['previewCount']} |"
        )

    lines.extend(["", "## 網站 ROI / Multiplier", "", "| Source | Seeds | Multiplier | Accepted Rate | Card Rate | Cross-site Rate | Broken Rate |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"])
    for row in summary["siteReliability"]:
        lines.append(
            f"| `{row['sourceId']}` | {row['seedCount']} | {row['siteReliabilityMultiplier']:.2f} | {row['acceptedSeedRate']:.2f} | {row['cardPromotionRate']:.2f} | {row['crossSiteAgreementRate']:.2f} | {row['staleOrBrokenRate']:.2f} |"
        )

    lines.extend(["", "## 跨站互證群", "", "| Person | Angle | Families | Seeds | Max Score |", "| --- | --- | --- | ---: | ---: |"])
    for row in summary["crossSiteGroups"][:30]:
        lines.append(
            f"| `{row['personId']}` | `{row['angleType']}` | {', '.join(row['sourceFamilies'])} | {row['seedCount']} | {row['maxSeedConfidenceScore']:.2f} |"
        )
    if not summary["crossSiteGroups"]:
        lines.append("| _none_ | _none_ | _none_ | 0 | 0.00 |")
    lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Score EvidenceSeed rows and produce ranking/report artifacts.")
    parser.add_argument("--seeds-jsonl", default=str(DEFAULT_SEEDS_JSONL), help="Input external-evidence-seeds.jsonl.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory.")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting existing outputs.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    seeds_path = resolve_path(args.seeds_jsonl)
    output_root = resolve_path(args.output_root)
    ranking_path = output_root / "external-evidence-seed-ranking.json"
    scored_jsonl_path = output_root / "external-evidence-seeds.scored.jsonl"
    markdown_path = output_root / "external-evidence-seed-ranking.zh-TW.md"
    if (ranking_path.exists() or scored_jsonl_path.exists() or markdown_path.exists()) and not args.overwrite:
        raise SystemExit(f"Ranking outputs already exist under {repo_relative(output_root)}")

    seeds = list(iter_jsonl(seeds_path))
    scored_rows, site_rows = score_seeds(seeds)
    person_rows = person_ranking(scored_rows)
    cross_rows = cross_site_report(scored_rows)
    target_counts = Counter(str(row.get("promotionTarget") or "seed-only") for row in scored_rows)
    summary = {
        "version": "3.0.0",
        "generatedAt": utc_now(),
        "mode": "external-evidence-seed-scoring",
        "canonicalWrites": False,
        "inputs": {"seedsJsonl": repo_relative(seeds_path)},
        "outputs": {
            "rankingJson": repo_relative(ranking_path),
            "scoredSeedsJsonl": repo_relative(scored_jsonl_path),
            "rankingMarkdown": repo_relative(markdown_path),
        },
        "metrics": {
            "seedCount": len(scored_rows),
            "candidateCardCount": target_counts.get("candidate-card", 0),
            "previewCount": target_counts.get("preview", 0),
            "humanReviewCount": target_counts.get("human-review", 0),
            "seedOnlyCount": target_counts.get("seed-only", 0),
            "crossSiteGroupCount": len(cross_rows),
            "sourceCount": len(site_rows),
        },
        "siteReliability": site_rows,
        "personRanking": person_rows,
        "crossSiteGroups": cross_rows,
        "rankedSeeds": scored_rows,
    }
    write_json(ranking_path, summary)
    write_jsonl(scored_jsonl_path, scored_rows)
    markdown_path.write_text(render_markdown(summary), encoding="utf-8")
    print(json.dumps({key: summary[key] for key in ("version", "generatedAt", "mode", "canonicalWrites", "metrics", "outputs")}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
